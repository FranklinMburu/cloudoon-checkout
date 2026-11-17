"""Product catalog. Every price is stored in USD per month (domains: USD per year).

Conversion to the customer's currency happens in the pricing engine, never here.
Catalog rows use their slug/code as primary key so the API and fixtures stay readable.
"""

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

MONEY = {"max_digits": 10, "decimal_places": 2}


class Currency(models.Model):
    code = models.CharField(max_length=3, primary_key=True)
    name = models.CharField(max_length=50)
    symbol = models.CharField(max_length=5)
    rate_per_usd = models.DecimalField(max_digits=12, decimal_places=4, validators=[MinValueValidator(0)])
    decimals = models.PositiveSmallIntegerField(default=2, validators=[MaxValueValidator(3)])
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order"]
        verbose_name_plural = "currencies"

    def __str__(self):
        return self.code


class Country(models.Model):
    code = models.CharField(max_length=2, primary_key=True)
    name = models.CharField(max_length=80)
    tax_name = models.CharField(max_length=30, default="VAT")
    tax_rate = models.DecimalField(max_digits=5, decimal_places=4, validators=[MinValueValidator(0), MaxValueValidator(1)])
    currency = models.ForeignKey(Currency, on_delete=models.PROTECT)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order"]
        verbose_name_plural = "countries"

    def __str__(self):
        return self.name


class ProductCategory(models.Model):
    slug = models.SlugField(primary_key=True)
    name = models.CharField(max_length=50)
    tagline = models.CharField(max_length=100)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order"]
        verbose_name_plural = "product categories"

    def __str__(self):
        return self.name


class CycleDiscount(models.Model):
    """Intro discount on the hosting product for a billing cycle (e.g. 36 months → 40%)."""

    MONTHS = [(1, "1 month"), (12, "12 months"), (24, "24 months"), (36, "36 months")]

    category = models.ForeignKey(ProductCategory, on_delete=models.CASCADE, related_name="cycle_discounts")
    months = models.PositiveSmallIntegerField(choices=MONTHS)
    percent = models.DecimalField(max_digits=4, decimal_places=2, validators=[MinValueValidator(0), MaxValueValidator(1)])

    class Meta:
        ordering = ["category", "months"]
        constraints = [models.UniqueConstraint(fields=["category", "months"], name="unique_cycle_discount")]

    def __str__(self):
        return f"{self.category_id} · {self.months} mo · {self.percent:.0%}"


class SharedPlan(models.Model):
    slug = models.SlugField(primary_key=True)
    name = models.CharField(max_length=50)
    description = models.CharField(max_length=120)
    monthly_usd = models.DecimalField(**MONEY)
    features = models.JSONField(default=list)
    is_popular = models.BooleanField(default=False)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order"]

    def __str__(self):
        return self.name


class VpsPricing(models.Model):
    """Single row: per-resource VPS prices and slider limits."""

    per_cpu = models.DecimalField(**MONEY)
    per_ram_gb = models.DecimalField(**MONEY)
    per_storage_gb = models.DecimalField(max_digits=10, decimal_places=4)
    managed_fee = models.DecimalField(**MONEY)
    cpu_min = models.PositiveSmallIntegerField()
    cpu_max = models.PositiveSmallIntegerField()
    ram_steps = models.JSONField(default=list)
    storage_min = models.PositiveSmallIntegerField()
    storage_max = models.PositiveSmallIntegerField()
    storage_step = models.PositiveSmallIntegerField()
    managed_features = models.JSONField(default=list)
    unmanaged_features = models.JSONField(default=list)

    class Meta:
        verbose_name_plural = "VPS pricing"

    def __str__(self):
        return "VPS pricing"


class OperatingSystem(models.Model):
    slug = models.SlugField(primary_key=True)
    name = models.CharField(max_length=50)
    version = models.CharField(max_length=30)
    monthly_usd = models.DecimalField(**MONEY)
    min_cpu = models.PositiveSmallIntegerField(default=1)
    min_ram_gb = models.PositiveSmallIntegerField(default=1)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order"]

    def __str__(self):
        return f"{self.name} {self.version}"


class DataCenter(models.Model):
    slug = models.SlugField(primary_key=True)
    city = models.CharField(max_length=50)
    country = models.CharField(max_length=50)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order"]

    def __str__(self):
        return self.city


class DedicatedServer(models.Model):
    slug = models.SlugField(primary_key=True)
    name = models.CharField(max_length=60)
    cpu = models.CharField(max_length=80)
    ram = models.CharField(max_length=60)
    storage = models.CharField(max_length=80)
    monthly_usd = models.DecimalField(**MONEY)
    out_of_stock_at = models.ManyToManyField(DataCenter, blank=True, related_name="out_of_stock_servers")
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order"]

    def __str__(self):
        return self.name


class BandwidthPackage(models.Model):
    slug = models.SlugField(primary_key=True)
    name = models.CharField(max_length=60)
    monthly_usd = models.DecimalField(**MONEY)
    is_default = models.BooleanField(default=False)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order"]

    def __str__(self):
        return self.name


class CloudSize(models.Model):
    slug = models.SlugField(primary_key=True)
    name = models.CharField(max_length=30)
    cpu = models.PositiveSmallIntegerField()
    ram_gb = models.PositiveSmallIntegerField()
    storage_gb = models.PositiveSmallIntegerField()
    monthly_usd = models.DecimalField(**MONEY)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order"]

    def __str__(self):
        return self.name


class ScalingPreset(models.Model):
    slug = models.SlugField(primary_key=True)
    name = models.CharField(max_length=30)
    min_instances = models.PositiveSmallIntegerField()
    max_instances = models.PositiveSmallIntegerField()
    description = models.CharField(max_length=120)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order"]

    def __str__(self):
        return self.name


class AddOn(models.Model):
    """Recurring extras priced per month (email is per mailbox)."""

    slug = models.SlugField(primary_key=True)
    name = models.CharField(max_length=60)
    description = models.CharField(max_length=160)
    monthly_usd = models.DecimalField(**MONEY)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order"]

    def __str__(self):
        return self.name


class SslOption(models.Model):
    slug = models.SlugField(primary_key=True)
    name = models.CharField(max_length=60)
    description = models.CharField(max_length=120)
    monthly_usd = models.DecimalField(**MONEY)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order"]

    def __str__(self):
        return self.name


class Tld(models.Model):
    """Domain extension. Prices are USD per year."""

    tld = models.CharField(max_length=20, primary_key=True)
    register_usd = models.DecimalField(**MONEY)
    renew_usd = models.DecimalField(**MONEY)
    transfer_usd = models.DecimalField(**MONEY)
    privacy_supported = models.BooleanField(default=True)
    free_with_hosting = models.BooleanField(default=False)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order"]
        verbose_name = "TLD"

    def __str__(self):
        return self.tld


class Promo(models.Model):
    APPLIES_TO = [("all", "Whole order"), ("hosting", "Hosting only")]

    code = models.CharField(max_length=30, primary_key=True)
    label = models.CharField(max_length=80)
    percent = models.DecimalField(max_digits=4, decimal_places=2, validators=[MinValueValidator(0), MaxValueValidator(1)])
    applies_to = models.CharField(max_length=10, choices=APPLIES_TO, default="all")
    valid_until = models.DateField(null=True, blank=True)

    def __str__(self):
        return self.code
