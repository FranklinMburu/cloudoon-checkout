from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from pricing.engine import Cart, PricingError, build_quote, check_promo
from pricing.json import to_json
from pricing.loader import load_catalog
from pricing.serializers import CartSerializer


def quote_or_error(cart_data: dict):
    """Validate the cart's shape, then price it. Returns (quote, None) or (None, error Response)."""
    serializer = CartSerializer(data=cart_data)
    if not serializer.is_valid():
        return None, Response({"detail": "Invalid cart.", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
    try:
        return build_quote(load_catalog(), Cart.from_dict(serializer.validated_data)), None
    except PricingError as exc:
        return None, Response({"detail": exc.message, "field": exc.field}, status=status.HTTP_400_BAD_REQUEST)


class QuoteView(APIView):
    """POST a cart → every line item, renewal price, discount, tax and total. The server is the source of truth."""

    def post(self, request):
        quote, error = quote_or_error(request.data)
        return error or Response(to_json(quote))


class PromoValidateView(APIView):
    def post(self, request):
        promo, error = check_promo(load_catalog(), str(request.data.get("code", "")))
        if error:
            return Response({"detail": error}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"code": promo["pk"], "label": promo["label"], "applies_to": promo["applies_to"]})
