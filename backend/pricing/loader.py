"""Builds the engine's Catalog snapshot from the database."""

from django.core import serializers

from catalog import models
from pricing.engine import Catalog

CATALOG_MODELS = [
    models.Currency, models.Country, models.ProductCategory, models.CycleDiscount, models.SharedPlan,
    models.VpsPricing, models.OperatingSystem, models.DataCenter, models.DedicatedServer,
    models.BandwidthPackage, models.CloudSize, models.ScalingPreset, models.AddOn, models.SslOption,
    models.Tld, models.Promo,
]


def load_catalog() -> Catalog:
    """~16 small queries. Same row format as the fixture, so tests and production share one code path."""
    records = []
    for model in CATALOG_MODELS:
        records.extend(serializers.serialize("python", model.objects.all()))
    return Catalog.from_records(records)
