from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from domains.service import DomainLookupUnavailableError, InvalidDomainQueryError, check
from pricing.loader import load_catalog


class DomainCheckView(APIView):
    """GET /domains/check/?q=mybrand.co.ke → availability from the registries for that name and the other extensions."""

    throttle_scope = "lookup"

    def get(self, request):
        try:
            return Response(check(load_catalog(), request.query_params.get("q", "")))
        except InvalidDomainQueryError as exc:
            return Response({"detail": str(exc), "field": "q"}, status=status.HTTP_400_BAD_REQUEST)
        except DomainLookupUnavailableError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
