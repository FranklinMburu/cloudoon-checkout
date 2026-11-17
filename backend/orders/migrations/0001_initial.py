import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Order",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("reference", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ("idempotency_key", models.CharField(max_length=64, unique=True)),
                ("email", models.EmailField(max_length=254)),
                (
                    "status",
                    models.CharField(choices=[("paid", "Paid"), ("pending", "Pending payment")], default="paid", max_length=10),
                ),
                ("currency", models.CharField(max_length=3)),
                ("cycle_months", models.PositiveSmallIntegerField()),
                ("subtotal", models.DecimalField(decimal_places=2, max_digits=12)),
                ("discount", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("promo_code", models.CharField(blank=True, max_length=30)),
                ("tax", models.DecimalField(decimal_places=2, max_digits=12)),
                ("tax_label", models.CharField(max_length=80)),
                ("total", models.DecimalField(decimal_places=2, max_digits=12)),
                ("payment_method", models.CharField(max_length=10)),
                ("payment_label", models.CharField(max_length=80)),
                ("payment_reference", models.CharField(max_length=40)),
                ("full_name", models.CharField(max_length=150)),
                ("phone", models.CharField(max_length=30)),
                ("country", models.CharField(max_length=2)),
                ("address", models.CharField(max_length=200)),
                ("city", models.CharField(max_length=100)),
                ("postal_code", models.CharField(max_length=20)),
                ("company", models.CharField(blank=True, max_length=150)),
                ("tax_id", models.CharField(blank=True, max_length=40)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="orders",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "constraints": [models.CheckConstraint(condition=models.Q(("total__gte", 0)), name="order_total_not_negative")],
            },
        ),
        migrations.CreateModel(
            name="OrderItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("line_id", models.CharField(max_length=80)),
                ("kind", models.CharField(max_length=10)),
                ("title", models.CharField(max_length=200)),
                ("details", models.JSONField(default=list)),
                ("term_label", models.CharField(max_length=20)),
                ("due_today", models.DecimalField(decimal_places=2, max_digits=12)),
                ("regular_price", models.DecimalField(decimal_places=2, max_digits=12)),
                ("renewal_amount", models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ("renewal_label", models.CharField(blank=True, max_length=30)),
                ("auto_renew", models.BooleanField(null=True)),
                (
                    "order",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="items", to="orders.order"),
                ),
            ],
            options={"ordering": ["id"]},
        ),
    ]
