from django.urls import path

from orders.views import MpesaCallbackView, OrderCreateView, OrderDetailView, PayPalOrderView

urlpatterns = [
    path("orders/", OrderCreateView.as_view(), name="order-create"),
    path("orders/<uuid:reference>/", OrderDetailView.as_view(), name="order-detail"),
    path("payments/paypal/orders/", PayPalOrderView.as_view(), name="paypal-order"),
    path("payments/mpesa/callback/<str:token>/", MpesaCallbackView.as_view(), name="mpesa-callback"),
]
