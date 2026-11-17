from django.db import IntegrityError, transaction
from rest_framework import status
from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from orders import payments
from orders.models import Order, OrderItem
from orders.serializers import OrderCreateSerializer, OrderSerializer
from pricing.engine import Cart, PricingError, build_quote
from pricing.loader import load_catalog


class OrderCreateView(APIView):
    """POST /orders/ with an `Idempotency-Key` header.

    The client's total is never trusted: the cart is re-priced here, then charged.
    Repeating the same key returns the original order (200) instead of charging twice.
    """

    throttle_scope = "orders"

    def post(self, request):
        key = request.headers.get("Idempotency-Key", "").strip()
        if not 8 <= len(key) <= 64:
            return Response({"detail": "An Idempotency-Key header (8–64 characters) is required."}, status=status.HTTP_400_BAD_REQUEST)
        if existing := Order.objects.filter(idempotency_key=key).first():
            return Response(OrderSerializer(existing).data, status=status.HTTP_200_OK)

        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            quote = build_quote(load_catalog(), Cart.from_dict(data["cart"]))
        except PricingError as exc:
            return Response({"detail": exc.message, "field": f"cart.{exc.field}"}, status=status.HTTP_400_BAD_REQUEST)
        if data["cart"].get("promo_code") and quote["promo_error"]:
            return Response({"detail": quote["promo_error"], "field": "cart.promo_code"}, status=status.HTTP_400_BAD_REQUEST)

        payment = data["payment"]
        try:
            charge = payments.charge(payment["method"], payment, quote["total"], quote["currency"])
        except payments.PaymentDeclined as exc:
            return Response({"detail": str(exc), "field": "payment"}, status=status.HTTP_402_PAYMENT_REQUIRED)

        billing = data["billing"]
        user = request.user if request.user.is_authenticated else None
        try:
            with transaction.atomic():
                order = Order.objects.create(
                    idempotency_key=key,
                    user=user,
                    email=user.email if user else billing["email"],
                    currency=quote["currency"],
                    cycle_months=quote["cycle"],
                    subtotal=quote["subtotal"],
                    discount=quote["promo"]["amount"] if quote["promo"] else 0,
                    promo_code=quote["promo"]["code"] if quote["promo"] else "",
                    tax=quote["tax"],
                    tax_label=quote["tax_label"],
                    total=quote["total"],
                    payment_method=payment["method"],
                    payment_label=charge.label,
                    payment_reference=charge.reference,
                    **{k: billing[k] for k in ("full_name", "phone", "country", "address", "city", "postal_code", "company", "tax_id")},
                )
                OrderItem.objects.bulk_create([
                    OrderItem(
                        order=order,
                        line_id=line["id"],
                        kind=line["kind"],
                        title=line["title"],
                        details=line["details"],
                        term_label=line["term_label"],
                        due_today=line["due_today"],
                        regular_price=line["regular_price"],
                        renewal_amount=line["renewal"]["amount"] if line["renewal"] else None,
                        renewal_label=line["renewal"]["label"] if line["renewal"] else "",
                        auto_renew=line["auto_renew"],
                    )
                    for line in quote["lines"]
                ])
        except IntegrityError:
            # Two identical requests raced: the other one won, so return its order.
            order = Order.objects.get(idempotency_key=key)
            return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderDetailView(RetrieveAPIView):
    """Receipt by reference. Signed-in owners only; guest orders are reachable only via their unguessable reference."""

    serializer_class = OrderSerializer
    lookup_field = "reference"

    def get_queryset(self):
        qs = Order.objects.prefetch_related("items")
        if self.request.user.is_authenticated:
            return qs.filter(user=self.request.user) | qs.filter(user__isnull=True)
        return qs.filter(user__isnull=True)
