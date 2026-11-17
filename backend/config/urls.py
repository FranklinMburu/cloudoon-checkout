from django.conf import settings
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path

from accounts import oauth
from orders import payments


def health(_request):
    return JsonResponse({"status": "ok"})


def checkout_config(_request):
    """Which sign-in and payment options are switched on, and the public keys the browser needs."""
    methods = payments.enabled_methods()
    return JsonResponse(
        {
            "sign_in": oauth.enabled_methods(),
            "payments": {
                "methods": methods,
                "stripe_publishable_key": settings.STRIPE_PUBLISHABLE_KEY if "card" in methods else "",
                "paypal_client_id": settings.PAYPAL_CLIENT_ID if "paypal" in methods else "",
                "paypal_currencies": sorted(payments.paypal.SUPPORTED_CURRENCIES),
            },
        }
    )


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/health/", health, name="health"),
    path("api/v1/config/", checkout_config, name="config"),
    path("api/v1/", include("catalog.urls")),
    path("api/v1/", include("pricing.urls")),
    path("api/v1/", include("domains.urls")),
    path("api/v1/", include("accounts.urls")),
    path("api/v1/", include("orders.urls")),
]
