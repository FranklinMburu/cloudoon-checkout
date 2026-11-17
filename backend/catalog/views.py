from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.presenter import priced_catalog
from pricing.engine import CYCLES
from pricing.json import to_json
from pricing.loader import load_catalog


class CatalogView(APIView):
    """GET /catalog/?currency=KES&cycle=12 → everything the configurator needs, priced for display."""

    def get(self, request):
        catalog = load_catalog()
        code = request.query_params.get("currency", "USD").upper()
        try:
            cycle = int(request.query_params.get("cycle", 12))
        except ValueError:
            cycle = 0
        if code not in catalog.currencies:
            return Response({"detail": f"Unsupported currency {code!r}."}, status=status.HTTP_400_BAD_REQUEST)
        if cycle not in CYCLES:
            return Response({"detail": f"cycle must be one of {list(CYCLES)}."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(to_json(priced_catalog(catalog, catalog.currencies[code], cycle)))
