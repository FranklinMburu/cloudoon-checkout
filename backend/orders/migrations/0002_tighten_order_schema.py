from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("orders", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="order",
            name="status",
            field=models.CharField(choices=[("paid", "Paid"), ("pending", "Pending payment")], default="pending", max_length=10),
        ),
        migrations.AlterField(
            model_name="orderitem",
            name="kind",
            field=models.CharField(choices=[("hosting", "Hosting"), ("domain", "Domain"), ("addon", "Add-on")], max_length=10),
        ),
        migrations.AddConstraint(
            model_name="order",
            constraint=models.CheckConstraint(
                condition=models.Q(("total", models.F("subtotal") - models.F("discount") + models.F("tax"))),
                name="order_totals_reconcile",
            ),
        ),
    ]
