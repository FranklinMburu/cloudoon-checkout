from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("orders", "0002_tighten_order_schema"),
    ]

    operations = [
        migrations.AlterField(
            model_name="order",
            name="status",
            field=models.CharField(
                choices=[("pending", "Waiting for payment"), ("paid", "Paid"), ("failed", "Payment failed")],
                default="pending",
                max_length=10,
            ),
        ),
        migrations.AlterField(
            model_name="order",
            name="payment_reference",
            field=models.CharField(db_index=True, max_length=40),
        ),
        migrations.AddField(
            model_name="order",
            name="payment_error",
            field=models.CharField(blank=True, max_length=200),
        ),
    ]
