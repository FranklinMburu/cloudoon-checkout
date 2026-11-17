from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0001_initial"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="vpspricing",
            constraint=models.CheckConstraint(condition=models.Q(("id", 1)), name="vps_pricing_single_row"),
        ),
    ]
