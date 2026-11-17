"""An in-memory snapshot of the product catalog, used by the pricing engine.

It is built from rows in Django's "python" serializer format
(`[{"model": "catalog.x", "pk": ..., "fields": {...}}]`), which is what both the
fixture file and `django.core.serializers.serialize("python", queryset)` produce.
Sharing that format means tests (fixture) and production (database) go through
exactly the same code path.

This module has no Django imports, so the engine can be unit-tested in isolation.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

Row = dict[str, Any]


def quantize(value: Decimal, decimals: int) -> Decimal:
    """Round half-up to `decimals` places (0.005 → 0.01), the convention for money."""
    return value.quantize(Decimal(1).scaleb(-decimals), rounding=ROUND_HALF_UP)


@dataclass(frozen=True)
class Currency:
    code: str
    name: str
    symbol: str
    rate: Decimal  # units of this currency per 1 USD
    decimals: int

    def convert(self, usd: Decimal) -> Decimal:
        """Convert a USD amount into this currency, rounded to its precision."""
        return quantize(usd * self.rate, self.decimals)

    def round(self, amount: Decimal) -> Decimal:
        """Round an amount that is already in this currency."""
        return quantize(amount, self.decimals)


@dataclass(frozen=True)
class Country:
    code: str
    name: str
    tax_name: str
    tax_rate: Decimal
    currency: str


@dataclass
class Catalog:
    """Every catalog table, keyed by primary key (slug/code). Prices are USD `Decimal`s."""

    currencies: dict[str, Currency]
    countries: dict[str, Country]
    categories: dict[str, Row]
    cycle_discounts: dict[tuple[str, int], Decimal]
    shared_plans: dict[str, Row]
    vps: Row
    operating_systems: dict[str, Row]
    datacenters: dict[str, Row]
    servers: dict[str, Row]
    bandwidth: dict[str, Row]
    cloud_sizes: dict[str, Row]
    scaling_presets: dict[str, Row]
    addons: dict[str, Row]
    ssl_options: dict[str, Row]
    tlds: dict[str, Row]
    promos: dict[str, Row]

    @classmethod
    def from_records(cls, records: list[Row]) -> Catalog:
        tables = _group_by_model(records)

        def rows(model: str) -> list[Row]:
            return sorted(tables.get(model, []), key=lambda row: row.get("sort_order", 0))

        def keyed(model: str, *money_fields: str) -> dict[str, Row]:
            return {row["pk"]: _with_decimals(row, money_fields) for row in rows(model)}

        return cls(
            currencies={
                row["pk"]: Currency(
                    code=row["pk"],
                    name=row["name"],
                    symbol=row["symbol"],
                    rate=Decimal(str(row["rate_per_usd"])),
                    decimals=int(row["decimals"]),
                )
                for row in rows("currency")
            },
            countries={
                row["pk"]: Country(
                    code=row["pk"],
                    name=row["name"],
                    tax_name=row["tax_name"],
                    tax_rate=Decimal(str(row["tax_rate"])),
                    currency=row["currency"],
                )
                for row in rows("country")
            },
            categories=keyed("productcategory"),
            cycle_discounts={
                (row["category"], int(row["months"])): Decimal(str(row["percent"])) for row in rows("cyclediscount")
            },
            shared_plans=keyed("sharedplan", "monthly_usd"),
            vps=_with_decimals(rows("vpspricing")[0], ("per_cpu", "per_ram_gb", "per_storage_gb", "managed_fee")),
            operating_systems=keyed("operatingsystem", "monthly_usd"),
            datacenters=keyed("datacenter"),
            servers={
                pk: {**row, "out_of_stock_at": frozenset(row.get("out_of_stock_at", []))}
                for pk, row in keyed("dedicatedserver", "monthly_usd").items()
            },
            bandwidth=keyed("bandwidthpackage", "monthly_usd"),
            cloud_sizes=keyed("cloudsize", "monthly_usd"),
            scaling_presets=keyed("scalingpreset"),
            addons=keyed("addon", "monthly_usd"),
            ssl_options=keyed("ssloption", "monthly_usd"),
            tlds=keyed("tld", "register_usd", "renew_usd", "transfer_usd"),
            promos=keyed("promo", "percent"),
        )

    def discount(self, category: str, months: int) -> Decimal:
        """Intro discount on hosting for a billing cycle (0 when none is configured)."""
        return self.cycle_discounts.get((category, months), Decimal(0))

    def default_bandwidth(self) -> str:
        return next((slug for slug, row in self.bandwidth.items() if row.get("is_default")), next(iter(self.bandwidth)))

    def popular_plan(self) -> str:
        return next(
            (slug for slug, row in self.shared_plans.items() if row.get("is_popular")), next(iter(self.shared_plans))
        )

    def tld_of(self, domain: str) -> str | None:
        """The longest known extension the domain ends with ('shop.co.ke' → '.co.ke'), or None."""
        return next((tld for tld in sorted(self.tlds, key=len, reverse=True) if domain.endswith(tld)), None)


def _group_by_model(records: list[Row]) -> dict[str, list[Row]]:
    tables: dict[str, list[Row]] = {}
    for record in records:
        model = record["model"].split(".")[-1].lower()
        tables.setdefault(model, []).append({"pk": record["pk"], **record["fields"]})
    return tables


def _with_decimals(row: Row, fields: tuple[str, ...]) -> Row:
    return {**row, **{field: Decimal(str(row[field])) for field in fields}}
