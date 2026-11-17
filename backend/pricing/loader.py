"""Builds the engine's Catalog snapshot from the database, with a short in-process cache."""

import time

from django.core import serializers

from catalog import models
from pricing.catalog import Catalog

CATALOG_MODELS = [
    models.Currency,
    models.Country,
    models.ProductCategory,
    models.CycleDiscount,
    models.SharedPlan,
    models.VpsPricing,
    models.OperatingSystem,
    models.DataCenter,
    models.DedicatedServer,
    models.BandwidthPackage,
    models.CloudSize,
    models.ScalingPreset,
    models.AddOn,
    models.SslOption,
    models.Tld,
    models.Promo,
]

# Every quote needs the whole catalog (~16 small queries), and quotes are requested on every
# cart change. The catalog rarely changes, so keep it for a minute; saving any catalog row in
# this process clears it immediately (see CatalogConfig.ready), other workers catch up within the TTL.
CACHE_SECONDS = 60
_cache: tuple[float, Catalog] | None = None


def load_catalog() -> Catalog:
    global _cache
    now = time.monotonic()
    if _cache and now - _cache[0] < CACHE_SECONDS:
        return _cache[1]
    records = []
    for model in CATALOG_MODELS:
        # Same row format as the fixture, so tests and production share one code path.
        records.extend(serializers.serialize("python", model.objects.all()))
    _cache = (now, Catalog.from_records(records))
    return _cache[1]


def clear_catalog_cache(**_signal_kwargs) -> None:
    global _cache
    _cache = None
