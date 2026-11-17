import django.core.validators
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="AddOn",
            fields=[
                ("slug", models.SlugField(primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=60)),
                ("description", models.CharField(max_length=160)),
                ("monthly_usd", models.DecimalField(decimal_places=2, max_digits=10)),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
            ],
            options={"ordering": ["sort_order"]},
        ),
        migrations.CreateModel(
            name="BandwidthPackage",
            fields=[
                ("slug", models.SlugField(primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=60)),
                ("monthly_usd", models.DecimalField(decimal_places=2, max_digits=10)),
                ("is_default", models.BooleanField(default=False)),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
            ],
            options={"ordering": ["sort_order"]},
        ),
        migrations.CreateModel(
            name="CloudSize",
            fields=[
                ("slug", models.SlugField(primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=30)),
                ("cpu", models.PositiveSmallIntegerField()),
                ("ram_gb", models.PositiveSmallIntegerField()),
                ("storage_gb", models.PositiveSmallIntegerField()),
                ("monthly_usd", models.DecimalField(decimal_places=2, max_digits=10)),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
            ],
            options={"ordering": ["sort_order"]},
        ),
        migrations.CreateModel(
            name="Currency",
            fields=[
                ("code", models.CharField(max_length=3, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=50)),
                ("symbol", models.CharField(max_length=5)),
                (
                    "rate_per_usd",
                    models.DecimalField(decimal_places=4, max_digits=12, validators=[django.core.validators.MinValueValidator(0)]),
                ),
                (
                    "decimals",
                    models.PositiveSmallIntegerField(default=2, validators=[django.core.validators.MaxValueValidator(3)]),
                ),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
            ],
            options={"verbose_name_plural": "currencies", "ordering": ["sort_order"]},
        ),
        migrations.CreateModel(
            name="DataCenter",
            fields=[
                ("slug", models.SlugField(primary_key=True, serialize=False)),
                ("city", models.CharField(max_length=50)),
                ("country", models.CharField(max_length=50)),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
            ],
            options={"ordering": ["sort_order"]},
        ),
        migrations.CreateModel(
            name="OperatingSystem",
            fields=[
                ("slug", models.SlugField(primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=50)),
                ("version", models.CharField(max_length=30)),
                ("monthly_usd", models.DecimalField(decimal_places=2, max_digits=10)),
                ("min_cpu", models.PositiveSmallIntegerField(default=1)),
                ("min_ram_gb", models.PositiveSmallIntegerField(default=1)),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
            ],
            options={"ordering": ["sort_order"]},
        ),
        migrations.CreateModel(
            name="ProductCategory",
            fields=[
                ("slug", models.SlugField(primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=50)),
                ("tagline", models.CharField(max_length=100)),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
            ],
            options={"verbose_name_plural": "product categories", "ordering": ["sort_order"]},
        ),
        migrations.CreateModel(
            name="Promo",
            fields=[
                ("code", models.CharField(max_length=30, primary_key=True, serialize=False)),
                ("label", models.CharField(max_length=80)),
                (
                    "percent",
                    models.DecimalField(
                        decimal_places=2,
                        max_digits=4,
                        validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(1)],
                    ),
                ),
                (
                    "applies_to",
                    models.CharField(choices=[("all", "Whole order"), ("hosting", "Hosting only")], default="all", max_length=10),
                ),
                ("valid_until", models.DateField(blank=True, null=True)),
            ],
        ),
        migrations.CreateModel(
            name="ScalingPreset",
            fields=[
                ("slug", models.SlugField(primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=30)),
                ("min_instances", models.PositiveSmallIntegerField()),
                ("max_instances", models.PositiveSmallIntegerField()),
                ("description", models.CharField(max_length=120)),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
            ],
            options={"ordering": ["sort_order"]},
        ),
        migrations.CreateModel(
            name="SharedPlan",
            fields=[
                ("slug", models.SlugField(primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=50)),
                ("description", models.CharField(max_length=120)),
                ("monthly_usd", models.DecimalField(decimal_places=2, max_digits=10)),
                ("features", models.JSONField(default=list)),
                ("is_popular", models.BooleanField(default=False)),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
            ],
            options={"ordering": ["sort_order"]},
        ),
        migrations.CreateModel(
            name="SslOption",
            fields=[
                ("slug", models.SlugField(primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=60)),
                ("description", models.CharField(max_length=120)),
                ("monthly_usd", models.DecimalField(decimal_places=2, max_digits=10)),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
            ],
            options={"ordering": ["sort_order"]},
        ),
        migrations.CreateModel(
            name="Tld",
            fields=[
                ("tld", models.CharField(max_length=20, primary_key=True, serialize=False)),
                ("register_usd", models.DecimalField(decimal_places=2, max_digits=10)),
                ("renew_usd", models.DecimalField(decimal_places=2, max_digits=10)),
                ("transfer_usd", models.DecimalField(decimal_places=2, max_digits=10)),
                ("privacy_supported", models.BooleanField(default=True)),
                ("free_with_hosting", models.BooleanField(default=False)),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
            ],
            options={"verbose_name": "TLD", "ordering": ["sort_order"]},
        ),
        migrations.CreateModel(
            name="VpsPricing",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("per_cpu", models.DecimalField(decimal_places=2, max_digits=10)),
                ("per_ram_gb", models.DecimalField(decimal_places=2, max_digits=10)),
                ("per_storage_gb", models.DecimalField(decimal_places=4, max_digits=10)),
                ("managed_fee", models.DecimalField(decimal_places=2, max_digits=10)),
                ("cpu_min", models.PositiveSmallIntegerField()),
                ("cpu_max", models.PositiveSmallIntegerField()),
                ("ram_steps", models.JSONField(default=list)),
                ("storage_min", models.PositiveSmallIntegerField()),
                ("storage_max", models.PositiveSmallIntegerField()),
                ("storage_step", models.PositiveSmallIntegerField()),
                ("managed_features", models.JSONField(default=list)),
                ("unmanaged_features", models.JSONField(default=list)),
            ],
            options={"verbose_name_plural": "VPS pricing"},
        ),
        migrations.CreateModel(
            name="Country",
            fields=[
                ("code", models.CharField(max_length=2, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=80)),
                ("tax_name", models.CharField(default="VAT", max_length=30)),
                (
                    "tax_rate",
                    models.DecimalField(
                        decimal_places=4,
                        max_digits=5,
                        validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(1)],
                    ),
                ),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
                ("currency", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to="catalog.currency")),
            ],
            options={"verbose_name_plural": "countries", "ordering": ["sort_order"]},
        ),
        migrations.CreateModel(
            name="DedicatedServer",
            fields=[
                ("slug", models.SlugField(primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=60)),
                ("cpu", models.CharField(max_length=80)),
                ("ram", models.CharField(max_length=60)),
                ("storage", models.CharField(max_length=80)),
                ("monthly_usd", models.DecimalField(decimal_places=2, max_digits=10)),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
                (
                    "out_of_stock_at",
                    models.ManyToManyField(blank=True, related_name="out_of_stock_servers", to="catalog.datacenter"),
                ),
            ],
            options={"ordering": ["sort_order"]},
        ),
        migrations.CreateModel(
            name="CycleDiscount",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "months",
                    models.PositiveSmallIntegerField(choices=[(1, "1 month"), (12, "12 months"), (24, "24 months"), (36, "36 months")]),
                ),
                (
                    "percent",
                    models.DecimalField(
                        decimal_places=2,
                        max_digits=4,
                        validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(1)],
                    ),
                ),
                (
                    "category",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, related_name="cycle_discounts", to="catalog.productcategory"
                    ),
                ),
            ],
            options={
                "ordering": ["category", "months"],
                "constraints": [models.UniqueConstraint(fields=("category", "months"), name="unique_cycle_discount")],
            },
        ),
    ]
