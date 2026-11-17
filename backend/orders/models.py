import uuid

from django.conf import settings
from django.db import models

MONEY = {"max_digits": 12, "decimal_places": 2}


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Waiting for payment"
        PAID = "paid", "Paid"
        FAILED = "failed", "Payment failed"

    reference = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    # Same key twice (refresh, double click, retry) returns the existing order instead of charging again.
    idempotency_key = models.CharField(max_length=64, unique=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="orders"
    )
    email = models.EmailField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)

    currency = models.CharField(max_length=3)
    cycle_months = models.PositiveSmallIntegerField()
    subtotal = models.DecimalField(**MONEY)
    discount = models.DecimalField(default=0, **MONEY)
    promo_code = models.CharField(max_length=30, blank=True)
    tax = models.DecimalField(**MONEY)
    tax_label = models.CharField(max_length=80)
    total = models.DecimalField(**MONEY)

    payment_method = models.CharField(max_length=10)
    payment_label = models.CharField(max_length=80)
    payment_reference = models.CharField(max_length=40, db_index=True)  # the provider's id for the payment
    payment_error = models.CharField(max_length=200, blank=True)  # why a pending payment failed

    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=30)
    country = models.CharField(max_length=2)
    address = models.CharField(max_length=200)
    city = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    company = models.CharField(max_length=150, blank=True)
    tax_id = models.CharField(max_length=40, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(condition=models.Q(total__gte=0), name="order_total_not_negative"),
            # The stored totals must always reconcile, whatever code writes them.
            models.CheckConstraint(
                condition=models.Q(total=models.F("subtotal") - models.F("discount") + models.F("tax")),
                name="order_totals_reconcile",
            ),
        ]

    def __str__(self):
        return self.number

    @property
    def number(self) -> str:
        """Customer-facing order number, e.g. CL-100042."""
        return f"CL-{100000 + self.pk}"


class OrderItem(models.Model):
    """A snapshot of a quote line at purchase time; later catalog price changes don't rewrite history."""

    class Kind(models.TextChoices):
        HOSTING = "hosting", "Hosting"
        DOMAIN = "domain", "Domain"
        ADDON = "addon", "Add-on"

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    line_id = models.CharField(max_length=80)
    kind = models.CharField(max_length=10, choices=Kind.choices)
    title = models.CharField(max_length=200)
    details = models.JSONField(default=list)
    term_label = models.CharField(max_length=20)
    due_today = models.DecimalField(**MONEY)
    regular_price = models.DecimalField(**MONEY)
    renewal_amount = models.DecimalField(null=True, blank=True, **MONEY)
    renewal_label = models.CharField(max_length=30, blank=True)
    auto_renew = models.BooleanField(null=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.title
