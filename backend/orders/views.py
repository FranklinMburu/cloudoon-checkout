from rest_framework import status
from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from orders.models import Order
from orders.serializers import OrderCreateSerializer, OrderSerializer
from orders.services import OrderError, place_order


class OrderCreateView(APIView):
    """POST /orders/ with an `Idempotency-Key` header.

    201: order created and paid · 200: this key was already used, here is that order ·
    400: invalid input · 402: payment declined (nothing is saved, retry with the same key).
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
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class OrderDetailView(RetrieveAPIView):
    """A signed-in customer's own order. Guest receipts are returned once, at checkout, and emailed."""

    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "reference"

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related("items")
