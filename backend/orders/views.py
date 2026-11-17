from django.utils.crypto import constant_time_compare
from rest_framework import status
from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from orders.models import Order
from orders.payments import mpesa
from orders.serializers import OrderCreateSerializer, OrderSerializer
from orders.services import OrderError, place_order, settle_mpesa, start_paypal_payment
from pricing.serializers import CartSerializer


class OrderCreateView(APIView):
    """POST /orders/ with an `Idempotency-Key` header.

    201: order created and paid · 202: created, waiting for the customer to approve on their phone (M-Pesa) ·
    200: this key was already used, here is that order with its current status (the checkout polls this way) ·
    400: invalid input · 402: payment declined (nothing is saved, retry with the same key) ·
    409: a domain was registered by someone else · 503: the payment provider didn't answer.
    """

    throttle_scope = "orders"

    def post(self, request):
        key = request.headers.get("Idempotency-Key", "").strip()
        if not 8 <= len(key) <= 64:
            return Response(
                {"detail": "An Idempotency-Key header (8–64 characters) is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            order, created = place_order(
                idempotency_key=key,
                user=request.user if request.user.is_authenticated else None,
                cart=data["cart"],
                billing=data["billing"],
                payment=data["payment"],
            )
        except OrderError as exc:
            return Response({"detail": exc.detail, "field": exc.field}, status=exc.status_code)
        if not created:
            code = status.HTTP_200_OK
        elif order.status == Order.Status.PENDING:
            code = status.HTTP_202_ACCEPTED
        else:
            code = status.HTTP_201_CREATED
        return Response(OrderSerializer(order).data, status=code)


class PayPalOrderView(APIView):
    """POST /payments/paypal/orders/ {cart} → {id}: the PayPal order the customer approves."""

    throttle_scope = "orders"

    def post(self, request):
        serializer = CartSerializer(data=request.data.get("cart"))
        serializer.is_valid(raise_exception=True)
        try:
            return Response({"id": start_paypal_payment(serializer.validated_data)})
        except OrderError as exc:
            return Response({"detail": exc.detail, "field": exc.field}, status=exc.status_code)


class MpesaCallbackView(APIView):
    """Safaricom posts the outcome of an STK push here. The URL holds a secret token."""

    authentication_classes = []

    def post(self, request, token: str):
        if not constant_time_compare(token, mpesa.callback_token()):
            return Response(status=status.HTTP_404_NOT_FOUND)
        try:
            callback = request.data["Body"]["stkCallback"]
            items = callback.get("CallbackMetadata", {}).get("Item", [])
            receipt = next((str(i.get("Value")) for i in items if i.get("Name") == "MpesaReceiptNumber"), "")
            result, message = mpesa.outcome(str(callback["ResultCode"]), callback.get("ResultDesc", ""))
            settle_mpesa(callback["CheckoutRequestID"], result, message, receipt)
        except (KeyError, TypeError, AttributeError):
            return Response({"ResultCode": 1, "ResultDesc": "Malformed callback"}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"ResultCode": 0, "ResultDesc": "Accepted"})


class OrderDetailView(RetrieveAPIView):
    """A signed-in customer's own order. Guest receipts are returned once, at checkout, and emailed."""

    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "reference"

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related("items")
