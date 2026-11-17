from rest_framework import serializers

from orders.models import Order, OrderItem
from pricing.serializers import CartSerializer


class BillingSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone = serializers.RegexField(
        r"^[+\d][\d\s-]{8,20}$", error_messages={"invalid": "Enter a valid phone number, including country code."}
    )
    country = serializers.CharField(max_length=2)
    address = serializers.CharField(max_length=200)
    city = serializers.CharField(max_length=100)
    postal_code = serializers.CharField(max_length=20)
    company = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    tax_id = serializers.CharField(max_length=40, required=False, allow_blank=True, default="")

    def validate_full_name(self, value):
        if len(value.split()) < 2:
            raise serializers.ValidationError("Enter your first and last name.")
        return value


class PaymentSerializer(serializers.Serializer):
    method = serializers.ChoiceField(choices=["card", "mpesa", "paypal"])
    # card: the Stripe PaymentMethod made by Stripe.js in the browser, plus brand/last4 for the receipt
    payment_method = serializers.CharField(max_length=100, required=False, allow_blank=True)
    brand = serializers.CharField(max_length=30, required=False, allow_blank=True)
    last4 = serializers.CharField(max_length=4, required=False, allow_blank=True)
    # mpesa: the phone that receives the prompt
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    # paypal: the order the customer approved in PayPal's window
    paypal_order_id = serializers.CharField(max_length=40, required=False, allow_blank=True)


class OrderCreateSerializer(serializers.Serializer):
    cart = CartSerializer()
    billing = BillingSerializer()
    payment = PaymentSerializer()
    accept_terms = serializers.BooleanField()

    def validate_accept_terms(self, value):
        if not value:
            raise serializers.ValidationError("Please accept the terms to continue.")
        return value

    def validate(self, attrs):
        if attrs["billing"]["country"] != attrs["cart"]["country"]:
            raise serializers.ValidationError(
                {"billing": {"country": "Billing country must match the country used for tax."}}
            )
        return attrs


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            "line_id",
            "kind",
            "title",
            "details",
            "term_label",
            "due_today",
            "regular_price",
            "renewal_amount",
            "renewal_label",
            "auto_renew",
        ]


class OrderSerializer(serializers.ModelSerializer):
    number = serializers.CharField(read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "reference",
            "number",
            "status",
            "email",
            "currency",
            "cycle_months",
            "subtotal",
            "discount",
            "promo_code",
            "tax",
            "tax_label",
            "total",
            "payment_label",
            "payment_error",
            "created_at",
            "items",
        ]
