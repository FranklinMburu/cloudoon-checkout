"""Pricing engine: the single source of truth for every amount the customer sees.

Pure Python (no Django imports) so it can be unit-tested in isolation and reused
by any view. All money is `Decimal`. Each line is converted and rounded in the
target currency *before* totals are summed, so the displayed lines always add
up exactly to the displayed total.

Usage:
    catalog = Catalog.from_records(records)   # fixture or DB rows (Django "python" serializer format)
    quote = build_quote(catalog, Cart.from_dict(payload))
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

CYCLES = (1, 12, 24, 36)
HOURS_PER_MONTH = Decimal(730)
MAX_DOMAINS = 10
MAX_MAILBOXES = 50
DOMAIN_MODES = ("register", "transfer", "existing")
D = Decimal


class PricingError(ValueError):
    """Raised for a cart that cannot be priced. `field` points at the offending input."""

    def __init__(self, field: str, message: str):
        super().__init__(message)
        self.field = field
        self.message = message


def quantize(value: Decimal, decimals: int) -> Decimal:
    return value.quantize(D(1).scaleb(-decimals), rounding=ROUND_HALF_UP)


# --------------------------------------------------------------------------- #
# Catalog snapshot                                                             #
# --------------------------------------------------------------------------- #


@dataclass(frozen=True)
class Currency:
    code: str
    name: str
    symbol: str
    rate: Decimal
    decimals: int

    def convert(self, usd: Decimal) -> Decimal:
        """USD → this currency, rounded to its precision."""
        return quantize(usd * self.rate, self.decimals)

    def round(self, amount: Decimal) -> Decimal:
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
    """An immutable-in-practice snapshot of the catalog, keyed by slug."""

    currencies: dict[str, Currency]
    countries: dict[str, Country]
    categories: dict[str, dict]
    cycle_discounts: dict[tuple[str, int], Decimal]
    shared_plans: dict[str, dict]
    vps: dict
    operating_systems: dict[str, dict]
    datacenters: dict[str, dict]
    servers: dict[str, dict]
    bandwidth: dict[str, dict]
    cloud_sizes: dict[str, dict]
    scaling_presets: dict[str, dict]
    addons: dict[str, dict]
    ssl_options: dict[str, dict]
    tlds: dict[str, dict]
    promos: dict[str, dict]

    @classmethod
    def from_records(cls, records: list[dict[str, Any]]) -> Catalog:
        """Build from Django-serialized rows: [{"model": "catalog.x", "pk": ..., "fields": {...}}]."""
        by_model: dict[str, list[dict]] = {}
        for r in records:
            name = r["model"].split(".")[-1].lower()
            by_model.setdefault(name, []).append({"pk": r["pk"], **r["fields"]})

        def rows(model: str) -> list[dict]:
            return sorted(by_model.get(model, []), key=lambda x: x.get("sort_order", 0))

        def money(row: dict, *keys: str) -> dict:
            return {**row, **{k: D(str(row[k])) for k in keys}}

        return cls(
            currencies={
                r["pk"]: Currency(r["pk"], r["name"], r["symbol"], D(str(r["rate_per_usd"])), int(r["decimals"]))
                for r in rows("currency")
            },
            countries={
                r["pk"]: Country(r["pk"], r["name"], r["tax_name"], D(str(r["tax_rate"])), r["currency"])
                for r in rows("country")
            },
            categories={r["pk"]: r for r in rows("productcategory")},
            cycle_discounts={(r["category"], int(r["months"])): D(str(r["percent"])) for r in rows("cyclediscount")},
            shared_plans={r["pk"]: money(r, "monthly_usd") for r in rows("sharedplan")},
            vps=money(rows("vpspricing")[0], "per_cpu", "per_ram_gb", "per_storage_gb", "managed_fee"),
            operating_systems={r["pk"]: money(r, "monthly_usd") for r in rows("operatingsystem")},
            datacenters={r["pk"]: r for r in rows("datacenter")},
            servers={
                r["pk"]: {**money(r, "monthly_usd"), "out_of_stock_at": frozenset(r.get("out_of_stock_at", []))}
                for r in rows("dedicatedserver")
            },
            bandwidth={r["pk"]: money(r, "monthly_usd") for r in rows("bandwidthpackage")},
            cloud_sizes={r["pk"]: money(r, "monthly_usd") for r in rows("cloudsize")},
            scaling_presets={r["pk"]: r for r in rows("scalingpreset")},
            addons={r["pk"]: money(r, "monthly_usd") for r in rows("addon")},
            ssl_options={r["pk"]: money(r, "monthly_usd") for r in rows("ssloption")},
            tlds={r["pk"]: money(r, "register_usd", "renew_usd", "transfer_usd") for r in rows("tld")},
            promos={r["pk"]: {**r, "percent": D(str(r["percent"]))} for r in by_model.get("promo", [])},
        )

    def discount(self, category: str, months: int) -> Decimal:
        return self.cycle_discounts.get((category, months), D(0))

    def default_bandwidth(self) -> str:
        return next((k for k, v in self.bandwidth.items() if v.get("is_default")), next(iter(self.bandwidth)))


# --------------------------------------------------------------------------- #
# Cart (input)                                                                 #
# --------------------------------------------------------------------------- #


@dataclass
class DomainInput:
    name: str
    mode: str
    auto_renew: bool = True
    privacy: bool = True


@dataclass
class Cart:
    category: str
    shared: dict = field(default_factory=dict)
    vps: dict = field(default_factory=dict)
    dedicated: dict = field(default_factory=dict)
    cloud: dict = field(default_factory=dict)
    cycle: int = 12
    currency: str = "USD"
    country: str = "KE"
    promo_code: str | None = None
    domains: list[DomainInput] = field(default_factory=list)
    addons: dict = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: dict) -> Cart:
        return cls(
            category=data.get("category", "shared"),
            shared=data.get("shared") or {},
            vps=data.get("vps") or {},
            dedicated=data.get("dedicated") or {},
            cloud=data.get("cloud") or {},
            cycle=int(data.get("cycle", 12)),
            currency=data.get("currency", "USD"),
            country=data.get("country", "KE"),
            promo_code=(data.get("promo_code") or None),
            domains=[DomainInput(**d) for d in data.get("domains", [])],
            addons=data.get("addons") or {},
        )


def default_cart(catalog: Catalog) -> dict:
    """The pre-selected configuration a new visitor starts with (Krug: intuitive defaults)."""
    popular = next((k for k, v in catalog.shared_plans.items() if v.get("is_popular")), next(iter(catalog.shared_plans)))
    return {
        "category": "shared",
        "shared": {"plan": popular},
        "vps": {"managed": True, "os": "ubuntu", "cpu": 2, "ram": 4, "storage": 100},
        "dedicated": {"server": "epyc-4344p", "location": "nbo", "bandwidth": catalog.default_bandwidth()},
        "cloud": {"size": "c2", "scaling": "balanced", "kubernetes": False, "k8s_load_balancer": True, "k8s_registry": False},
        "cycle": 12,
        "currency": "USD",
        "country": "KE",
        "promo_code": None,
        "domains": [],
        "addons": {"backups": False, "ssl": "free", "email_boxes": 0, "ddos_advanced": False, "cdn": False},
    }


# --------------------------------------------------------------------------- #
# Validation helpers                                                           #
# --------------------------------------------------------------------------- #

_DOMAIN_RE = re.compile(r"^([a-z0-9-]+\.)+[a-z]{2,}$")


def _get(table: dict, key: Any, field_name: str, label: str):
    if key not in table:
        raise PricingError(field_name, f"Unknown {label}: {key!r}.")
    return table[key]


def split_domain(name: str, catalog: Catalog) -> tuple[str, str | None]:
    """'shop.co.ke' → ('shop', '.co.ke'). Longest known TLD wins; unknown TLD → (label, None)."""
    for tld in sorted(catalog.tlds, key=len, reverse=True):
        if name.endswith(tld):
            return name[: -len(tld)], tld
    return name.split(".")[0], None


def check_promo(catalog: Catalog, raw: str, today: date | None = None) -> tuple[dict | None, str | None]:
    code = (raw or "").strip().upper()
    if not code:
        return None, "Enter a promo code."
    promo = catalog.promos.get(code)
    if not promo:
        return None, f"“{code}” isn’t a valid code. Check the spelling and try again."
    valid_until = promo.get("valid_until")
    if valid_until:
        until = date.fromisoformat(str(valid_until))
        if until < (today or date.today()):
            return None, f"“{code}” expired on {until.day} {until:%b %Y}."
    return promo, None


# --------------------------------------------------------------------------- #
# Hosting                                                                      #
# --------------------------------------------------------------------------- #


@dataclass
class HostingBase:
    title: str
    details: list[str]
    monthly_usd: Decimal


def hosting_base(catalog: Catalog, cart: Cart) -> HostingBase:
    cat = cart.category
    if cat == "shared":
        plan = _get(catalog.shared_plans, cart.shared.get("plan"), "shared.plan", "plan")
        return HostingBase(f"{plan['name']} Hosting", [" · ".join(plan["features"][:2])], plan["monthly_usd"])

    if cat == "vps":
        v, p = cart.vps, catalog.vps
        os_ = _get(catalog.operating_systems, v.get("os"), "vps.os", "operating system")
        cpu, ram, storage = int(v.get("cpu", 0)), int(v.get("ram", 0)), int(v.get("storage", 0))
        if not p["cpu_min"] <= cpu <= p["cpu_max"]:
            raise PricingError("vps.cpu", f"vCPU must be between {p['cpu_min']} and {p['cpu_max']}.")
        if ram not in p["ram_steps"]:
            raise PricingError("vps.ram", f"RAM must be one of {p['ram_steps']} GB.")
        if not p["storage_min"] <= storage <= p["storage_max"] or (storage - p["storage_min"]) % p["storage_step"]:
            raise PricingError("vps.storage", f"Storage must be {p['storage_min']}–{p['storage_max']} GB in steps of {p['storage_step']}.")
        if cpu < os_["min_cpu"] or ram < os_["min_ram_gb"]:
            raise PricingError("vps.os", f"{os_['name']} needs at least {os_['min_cpu']} vCPU and {os_['min_ram_gb']} GB RAM.")
        managed = bool(v.get("managed"))
        monthly = cpu * p["per_cpu"] + ram * p["per_ram_gb"] + storage * p["per_storage_gb"] + (p["managed_fee"] if managed else 0)
        return HostingBase(
            f"{'Managed' if managed else 'Unmanaged'} VPS",
            [f"{cpu} vCPU · {ram} GB RAM · {storage} GB NVMe", f"{os_['name']} {os_['version']}"],
            monthly,
        )

    if cat == "dedicated":
        d = cart.dedicated
        server = _get(catalog.servers, d.get("server"), "dedicated.server", "server")
        loc = _get(catalog.datacenters, d.get("location"), "dedicated.location", "data center")
        _get(catalog.bandwidth, d.get("bandwidth"), "dedicated.bandwidth", "bandwidth package")
        if loc["pk"] in server["out_of_stock_at"]:
            raise PricingError("dedicated.server", f"{server['name']} is out of stock in {loc['city']}.")
        return HostingBase(
            f"Dedicated · {server['name']}",
            [f"{server['ram']} · {server['storage']}", f"{loc['city']}, {loc['country']} · Setup free"],
            server["monthly_usd"],
        )

    if cat == "cloud":
        c = cart.cloud
        size = _get(catalog.cloud_sizes, c.get("size"), "cloud.size", "instance size")
        preset = _get(catalog.scaling_presets, c.get("scaling"), "cloud.scaling", "autoscaling preset")
        lo, hi = preset["min_instances"], preset["max_instances"]
        span = f"{lo} instance" if lo == hi else f"{lo}–{hi} instances"
        return HostingBase(
            f"Cloud · {size['name']}",
            [f"{lo} × {size['cpu']} vCPU / {size['ram_gb']} GB RAM", f"Autoscaling: {preset['name']} ({span})"],
            size["monthly_usd"] * lo,
        )

    raise PricingError("category", f"Unknown hosting type: {cat!r}.")


def cycle_option(catalog: Catalog, cart: Cart, currency: Currency, months: int) -> dict:
    """Effective monthly price, upfront total and regular rate of the hosting product for one cycle."""
    base = hosting_base(catalog, cart)
    discount = catalog.discount(cart.category, months)
    regular_monthly = currency.convert(base.monthly_usd)
    monthly = currency.round(regular_monthly * (1 - discount))
    return {
        "months": months,
        "discount": discount,
        "monthly": monthly,
        "regular_monthly": regular_monthly,
        "total": currency.round(monthly * months),
    }


# --------------------------------------------------------------------------- #
# Quote                                                                        #
# --------------------------------------------------------------------------- #


def term_label(months: int) -> str:
    return "1 month" if months == 1 else f"{months} months"


def every_label(months: int) -> str:
    return "every month" if months == 1 else f"every {months} months"


def free_domain_eligible(cart: Cart) -> bool:
    """One free registration (first year) with Shared Hosting billed 12+ months."""
    return cart.category == "shared" and cart.cycle >= 12


def build_quote(catalog: Catalog, cart: Cart, today: date | None = None) -> dict:
    if cart.cycle not in CYCLES:
        raise PricingError("cycle", f"Billing cycle must be one of {CYCLES} months.")
    currency = _get(catalog.currencies, cart.currency, "currency", "currency")
    country = _get(catalog.countries, cart.country, "country", "country")
    months = cart.cycle
    lines: list[dict] = []

    # 1. Hosting
    base = hosting_base(catalog, cart)
    current = cycle_option(catalog, cart, currency, months)
    renewal = currency.round(current["regular_monthly"] * months)
    lines.append({
        "id": "hosting",
        "kind": "hosting",
        "title": base.title,
        "details": base.details,
        "term_label": term_label(months),
        "due_today": current["total"],
        "regular_price": renewal,
        "renewal": {"amount": renewal, "label": every_label(months)},
        "badge": f"Save {int(current['discount'] * 100)}%" if current["discount"] > 0 else None,
        "removable": False,
        "auto_renew": True,
    })

    def monthly_line(line_id: str, title: str, monthly_usd: Decimal, details: list[str], removable: bool = True):
        amount = currency.round(currency.convert(monthly_usd) * months)
        lines.append({
            "id": line_id,
            "kind": "addon",
            "title": title,
            "details": details,
            "term_label": term_label(months),
            "due_today": amount,
            "regular_price": amount,
            "renewal": {"amount": amount, "label": every_label(months)},
            "badge": None,
            "removable": removable,
            "auto_renew": True,
        })

    # 2. Product-specific extras, each its own line so nothing is hidden
    if cart.category == "vps":
        os_ = catalog.operating_systems[cart.vps["os"]]
        if os_["monthly_usd"] > 0:
            monthly_line("addon:os-licence", f"{os_['name']} licence", os_["monthly_usd"], [f"{os_['name']} {os_['version']} · change OS to remove"], False)
    if cart.category == "dedicated":
        bw = catalog.bandwidth[cart.dedicated["bandwidth"]]
        if bw["monthly_usd"] > 0:
            monthly_line("addon:bandwidth", f"Bandwidth: {bw['name']}", bw["monthly_usd"], ["Replaces the included package"])
    if cart.category == "cloud" and cart.cloud.get("kubernetes"):
        for flag, slug, line_id in (
            (True, "k8s-control-plane", "addon:k8s"),
            (cart.cloud.get("k8s_load_balancer"), "k8s-load-balancer", "addon:k8s-lb"),
            (cart.cloud.get("k8s_registry"), "k8s-registry", "addon:k8s-registry"),
        ):
            if flag:
                a = catalog.addons[slug]
                monthly_line(line_id, a["name"], a["monthly_usd"], [a["description"]])

    # 3. Domains — billed yearly at registry prices
    if len(cart.domains) > MAX_DOMAINS:
        raise PricingError("domains", f"You can add up to {MAX_DOMAINS} domains per order.")
    seen: set[str] = set()
    free_applied: str | None = None
    for i, d in enumerate(cart.domains):
        name = d.name.strip().lower()
        if not _DOMAIN_RE.match(name):
            raise PricingError(f"domains.{i}.name", f"{d.name!r} isn’t a valid domain.")
        if name in seen:
            raise PricingError(f"domains.{i}.name", f"{name} is in the order twice.")
        seen.add(name)
        if d.mode not in DOMAIN_MODES:
            raise PricingError(f"domains.{i}.mode", f"Unknown domain option: {d.mode!r}.")
        _, tld_key = split_domain(name, catalog)

        if d.mode == "existing":
            lines.append({
                "id": f"domain:{name}",
                "kind": "domain",
                "title": name,
                "details": ["Your existing domain — no charge", "Point it to our nameservers"],
                "term_label": "—",
                "due_today": currency.round(D(0)),
                "regular_price": currency.round(D(0)),
                "renewal": None,
                "badge": "No charge",
                "removable": True,
                "auto_renew": None,
            })
            continue

        if tld_key is None:
            raise PricingError(f"domains.{i}.name", f"We can’t {d.mode} {name}: that extension isn’t supported.")
        tld = catalog.tlds[tld_key]
        is_free = (
            d.mode == "register" and free_applied is None and free_domain_eligible(cart) and tld["free_with_hosting"]
        )
        if is_free:
            free_applied = name
        price = currency.convert(tld["transfer_usd"] if d.mode == "transfer" else tld["register_usd"])
        privacy = (
            f"WHOIS privacy not offered for {tld_key}" if not tld["privacy_supported"]
            else "WHOIS privacy: on (free)" if d.privacy else "WHOIS privacy: off"
        )
        lines.append({
            "id": f"domain:{name}",
            "kind": "domain",
            "title": name,
            "details": ["Domain transfer · includes 1-year extension" if d.mode == "transfer" else "Domain registration", privacy],
            "term_label": "1 year",
            "due_today": currency.round(D(0)) if is_free else price,
            "regular_price": price,
            "renewal": {"amount": currency.convert(tld["renew_usd"]), "label": "every year"},
            "badge": "Free 1st year" if is_free else None,
            "removable": True,
            "auto_renew": bool(d.auto_renew),
        })

    # 4. Value-added services
    a = cart.addons
    if a.get("backups"):
        x = catalog.addons["backups"]
        monthly_line("addon:backups", x["name"], x["monthly_usd"], [x["description"]])
    ssl_slug = a.get("ssl", "free")
    ssl = _get(catalog.ssl_options, ssl_slug, "addons.ssl", "SSL option")
    if ssl["monthly_usd"] > 0:
        monthly_line("addon:ssl", ssl["name"], ssl["monthly_usd"], ["Replaces the included Standard SSL"])
    boxes = int(a.get("email_boxes", 0))
    if not 0 <= boxes <= MAX_MAILBOXES:
        raise PricingError("addons.email_boxes", f"Mailboxes must be between 0 and {MAX_MAILBOXES}.")
    if boxes:
        x = catalog.addons["email-mailbox"]
        monthly_line("addon:email", f"{x['name']} × {boxes}", x["monthly_usd"] * boxes, [x["description"]])
    if a.get("ddos_advanced"):
        x = catalog.addons["ddos-advanced"]
        monthly_line("addon:ddos", x["name"], x["monthly_usd"], ["Layer 7 filtering, up to 1 Tbps"])
    if a.get("cdn"):
        x = catalog.addons["cdn"]
        monthly_line("addon:cdn", x["name"], x["monthly_usd"], ["Global edge caching"])

    # 5. Totals: promo on the first term, then tax on what is actually paid
    subtotal = currency.round(sum((l["due_today"] for l in lines), D(0)))
    savings = currency.round(sum((l["regular_price"] - l["due_today"] for l in lines), D(0)))

    promo, promo_error = None, None
    if cart.promo_code:
        found, promo_error = check_promo(catalog, cart.promo_code, today)
        if found:
            base_amount = lines[0]["due_today"] if found["applies_to"] == "hosting" else subtotal
            promo = {"code": found["pk"], "label": found["label"], "amount": currency.round(base_amount * found["percent"])}

    taxable = subtotal - (promo["amount"] if promo else 0)
    tax = currency.round(taxable * country.tax_rate)
    pct = f"{(country.tax_rate * 100).normalize():f}"
    tax_label = (
        f"{country.tax_name} {pct}% · {country.name}" if country.tax_rate > 0
        else f"{country.tax_name} · {country.name} (not charged)"
    )

    burst = None
    if cart.category == "cloud":
        size = catalog.cloud_sizes[cart.cloud["size"]]
        burst = quantize(size["monthly_usd"] / HOURS_PER_MONTH * currency.rate, 3)

    return {
        "currency": currency.code,
        "cycle": months,
        "lines": lines,
        "subtotal": subtotal,
        "savings": savings,
        "promo": promo,
        "promo_error": promo_error,
        "tax_rate": country.tax_rate,
        "tax_label": tax_label,
        "tax": tax,
        "total": currency.round(taxable + tax),
        "cycle_options": [cycle_option(catalog, cart, currency, m) for m in CYCLES],
        "free_domain": {"eligible": free_domain_eligible(cart), "applied_to": free_applied},
        "cloud_burst_hourly": burst,
    }
