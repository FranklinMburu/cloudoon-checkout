from django.urls import path

from orders.views import OrderCreateView, OrderDetailView

urlpatterns = [
    path("orders/", OrderCreateView.as_view(), name="order-create"),
    path("orders/<uuid:reference>/", OrderDetailView.as_view(), name="order-detail"),
]
