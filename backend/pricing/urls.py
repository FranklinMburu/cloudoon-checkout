from django.urls import path

from pricing.views import PromoValidateView, QuoteView

urlpatterns = [
    path("quote/", QuoteView.as_view(), name="quote"),
    path("promos/validate/", PromoValidateView.as_view(), name="promo-validate"),
]
