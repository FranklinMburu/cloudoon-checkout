"""Turns the catalog into what the configurator displays, already priced in the visitor's currency."""

from django.conf import settings

from pricing.catalog import Catalog, Currency
from pricing.engine import CYCLES, default_cart


def priced_catalog(catalog: Catalog, currency: Currency, cycle: int) -> dict:
    usd = currency.convert
    vps = catalog.vps
    return {
        "currency": {
            "code": currency.code,
            "name": currency.name,
            "symbol": currency.symbol,
            "decimals": currency.decimals,
        },
        "currencies": [{"code": c.code, "name": c.name, "symbol": c.symbol} for c in catalog.currencies.values()],
        "countries": [
            {"code": c.code, "name": c.name, "tax_name": c.tax_name, "tax_rate": c.tax_rate, "currency": c.currency}
            for c in catalog.countries.values()
        ],
        "cycles": list(CYCLES),
        "categories": [{"slug": k, "name": v["name"], "tagline": v["tagline"]} for k, v in catalog.categories.items()],
        "shared_plans": [
            {
                "slug": k,
                "name": p["name"],
                "description": p["description"],
                "features": p["features"],
                "is_popular": p["is_popular"],
                "discount": catalog.discount("shared", cycle),
                "regular_monthly": usd(p["monthly_usd"]),
                "monthly": currency.round(usd(p["monthly_usd"]) * (1 - catalog.discount("shared", cycle))),
            }
            for k, p in catalog.shared_plans.items()
        ],
        "vps": {
            "managed_fee": usd(vps["managed_fee"]),
            "per_cpu": usd(vps["per_cpu"]),
            "per_ram_gb": usd(vps["per_ram_gb"]),
            "per_100gb_storage": usd(vps["per_storage_gb"] * 100),
            "cpu": {"min": vps["cpu_min"], "max": vps["cpu_max"]},
            "ram_steps": vps["ram_steps"],
            "storage": {"min": vps["storage_min"], "max": vps["storage_max"], "step": vps["storage_step"]},
            "managed_features": vps["managed_features"],
            "unmanaged_features": vps["unmanaged_features"],
            "operating_systems": [
                {
                    "slug": k,
                    "name": o["name"],
                    "version": o["version"],
                    "monthly": usd(o["monthly_usd"]),
                    "min_cpu": o["min_cpu"],
                    "min_ram_gb": o["min_ram_gb"],
                }
                for k, o in catalog.operating_systems.items()
            ],
        },
        "dedicated": {
            "datacenters": [
                {"slug": k, "city": d["city"], "country": d["country"]} for k, d in catalog.datacenters.items()
            ],
            "servers": [
                {
                    "slug": k,
                    "name": s["name"],
                    "cpu": s["cpu"],
                    "ram": s["ram"],
                    "storage": s["storage"],
                    "monthly": usd(s["monthly_usd"]),
                    "out_of_stock_at": s["out_of_stock_at"],
                }
                for k, s in catalog.servers.items()
            ],
            "bandwidth": [
                {"slug": k, "name": b["name"], "monthly": usd(b["monthly_usd"]), "is_default": b["is_default"]}
                for k, b in catalog.bandwidth.items()
            ],
        },
        "cloud": {
            "sizes": [
                {
                    "slug": k,
                    "name": s["name"],
                    "cpu": s["cpu"],
                    "ram_gb": s["ram_gb"],
                    "storage_gb": s["storage_gb"],
                    "monthly": usd(s["monthly_usd"]),
                }
                for k, s in catalog.cloud_sizes.items()
            ],
            "scaling_presets": [
                {
                    "slug": k,
                    "name": p["name"],
                    "min": p["min_instances"],
                    "max": p["max_instances"],
                    "description": p["description"],
                }
                for k, p in catalog.scaling_presets.items()
            ],
        },
        "addons": [
            {"slug": k, "name": a["name"], "description": a["description"], "monthly": usd(a["monthly_usd"])}
            for k, a in catalog.addons.items()
        ],
        "ssl_options": [
            {"slug": k, "name": s["name"], "description": s["description"], "monthly": usd(s["monthly_usd"])}
            for k, s in catalog.ssl_options.items()
        ],
        "tlds": [
            {
                "tld": k,
                "register": usd(t["register_usd"]),
                "renew": usd(t["renew_usd"]),
                "transfer": usd(t["transfer_usd"]),
                "privacy_supported": t["privacy_supported"],
                "free_with_hosting": t["free_with_hosting"],
            }
            for k, t in catalog.tlds.items()
        ],
        "limits": {"max_domains": 10, "max_mailboxes": 50},
        "nameservers": settings.NAMESERVERS,
        "default_cart": default_cart(catalog),
    }
