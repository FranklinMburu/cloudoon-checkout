from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def health(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/health/", health, name="health"),
    path("api/v1/", include("catalog.urls")),
    path("api/v1/", include("pricing.urls")),
    path("api/v1/", include("domains.urls")),
    path("api/v1/", include("accounts.urls")),
    path("api/v1/", include("orders.urls")),
]
