"""Pricing engine: the single source of truth for every amount the customer sees.

Pure Python (no Django imports) so it can be unit-tested in isolation.

Rules:
- All money is `Decimal`; catalog prices are USD and converted per line.
- Each line is rounded in the target currency *before* totals are summed, so the
  displayed lines always add up exactly to the displayed total.
- Hosting gets an intro discount for longer billing cycles and renews at the
  regular rate. Add-ons cost the same at renewal. Domains are billed yearly.
- A promo applies to the first term only; tax is charged on what is actually paid.

Usage:
    quote = build_quote(catalog, Cart.from_dict(payload))
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Any

from pricing.catalog import Catalog, Country, Currency, quantize

CYCLES = (1, 12, 24, 36)
HOURS_PER_MONTH = Decimal(730)
MAX_DOMAINS = 10
MAX_MAILBOXES = 50
DOMAIN_MODES = ("register", "transfer", "existing")
FREE_DOMAIN_MIN_CYCLE = 12

_DOMAIN_RE = re.compile(r"^([a-z0-9-]+\.)+[a-z]{2,}$")


class PricingError(ValueError):
    """A cart that cannot be priced. `field` points at the offending input, e.g. "vps.os"."""

    def __init__(self, field: str, message: str):
        super().__init__(message)
        self.field = field
        self.message = message


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
    """What the customer picked. Only the config for `category` is required."""

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
    def from_dict(cls, data: dict[str, Any]) -> Cart:
        return cls(
            category=data.get("category", "shared"),
            shared=data.get("shared") or {},
            vps=data.get("vps") or {},
            dedicated=data.get("dedicated") or {},
            cloud=data.get("cloud") or {},
            cycle=int(data.get("cycle", 12)),
            currency=data.get("currency", "USD"),
            country=data.get("country", "KE"),
            promo_code=data.get("promo_code") or None,
            domains=[DomainInput(**domain) for domain in data.get("domains", [])],
            addons=data.get("addons") or {},
        )


def default_cart(catalog: Catalog) -> dict[str, Any]:
    """The pre-selected configuration a new visitor starts with (Krug: intuitive defaults).

    Preferred defaults fall back to the first catalog entry if a product is ever removed.
    """

    def prefer(table: dict, slug: str) -> str:
        return slug if slug in table else next(iter(table))

    return {
        "category": "shared",
        "shared": {"plan": catalog.popular_plan()},
        "vps": {"managed": True, "os": prefer(catalog.operating_systems, "ubuntu"), "cpu": 2, "ram": 4, "storage": 100},
        "dedicated": {
            "server": prefer(catalog.servers, "epyc-4344p"),
            "location": prefer(catalog.datacenters, "nbo"),
            "bandwidth": catalog.default_bandwidth(),
        },
        "cloud": {
            "size": prefer(catalog.cloud_sizes, "c2"),
            "scaling": prefer(catalog.scaling_presets, "balanced"),
            "kubernetes": False,
            "k8s_load_balancer": True,
            "k8s_registry": False,
        },
        "cycle": 12,
        "currency": "USD",
        "country": "KE",
        "promo_code": None,
        "domains": [],
        "addons": {"backups": False, "ssl": "free", "email_boxes": 0, "ddos_advanced": False, "cdn": False},
    }


# --------------------------------------------------------------------------- #
# Small helpers                                                                #
# --------------------------------------------------------------------------- #


def lookup(table: dict, key: Any, field_name: str, label: str) -> Any:
    """`table[key]`, or a PricingError naming the field when the key is unknown."""
    if key not in table:
        raise PricingError(field_name, f"Unknown {label}: {key!r}.")
    return table[key]


def term_label(months: int) -> str:
    return "1 month" if months == 1 else f"{months} months"


def every_label(months: int) -> str:
    return "every month" if months == 1 else f"every {months} months"


def free_domain_eligible(cart: Cart) -> bool:
    """One free registration (first year) with Shared Hosting billed 12+ months."""
    return cart.category == "shared" and cart.cycle >= FREE_DOMAIN_MIN_CYCLE


def check_promo(catalog: Catalog, raw: str, today: date | None = None) -> tuple[dict | None, str | None]:
    """Return (promo, None) for a valid code, or (None, reason) — invalid or expired."""
    code = (raw or "").strip().upper()
    if not code:
        return None, "Enter a promo code."
    promo = catalog.promos.get(code)
    if not promo:
        return None, f"“{code}” isn’t a valid code. Check the spelling and try again."
    if valid_until := promo.get("valid_until"):
        until = date.fromisoformat(str(valid_until))
        if until < (today or date.today()):
            return None, f"“{code}” expired on {until.day} {until:%b %Y}."
    return promo, None


# --------------------------------------------------------------------------- #
# Hosting product                                                              #
# --------------------------------------------------------------------------- #


@dataclass
class HostingBase:
    title: str
    details: list[str]
    monthly_usd: Decimal  # regular (non-discounted) monthly price


def hosting_base(catalog: Catalog, cart: Cart) -> HostingBase:
    """Title, details and regular monthly price of the selected hosting product."""
    builders = {"shared": _shared, "vps": _vps, "dedicated": _dedicated, "cloud": _cloud}
    builder = lookup(builders, cart.category, "category", "hosting type")
    return builder(catalog, cart)


def _shared(catalog: Catalog, cart: Cart) -> HostingBase:
    plan = lookup(catalog.shared_plans, cart.shared.get("plan"), "shared.plan", "plan")
    return HostingBase(f"{plan['name']} Hosting", [" · ".join(plan["features"][:2])], plan["monthly_usd"])


def _vps(catalog: Catalog, cart: Cart) -> HostingBase:
    config, limits = cart.vps, catalog.vps
    os_ = lookup(catalog.operating_systems, config.get("os"), "vps.os", "operating system")
    cpu, ram, storage = int(config.get("cpu", 0)), int(config.get("ram", 0)), int(config.get("storage", 0))

    if not limits["cpu_min"] <= cpu <= limits["cpu_max"]:
        raise PricingError("vps.cpu", f"vCPU must be between {limits['cpu_min']} and {limits['cpu_max']}.")
    if ram not in limits["ram_steps"]:
        raise PricingError("vps.ram", f"RAM must be one of {limits['ram_steps']} GB.")
    off_step = (storage - limits["storage_min"]) % limits["storage_step"]
    if not limits["storage_min"] <= storage <= limits["storage_max"] or off_step:
        raise PricingError(
            "vps.storage",
            f"Storage must be {limits['storage_min']}–{limits['storage_max']} GB in steps of {limits['storage_step']}.",
        )
    if cpu < os_["min_cpu"] or ram < os_["min_ram_gb"]:
        raise PricingError(
            "vps.os", f"{os_['name']} needs at least {os_['min_cpu']} vCPU and {os_['min_ram_gb']} GB RAM."
        )

    managed = bool(config.get("managed"))
    monthly = (
        cpu * limits["per_cpu"]
        + ram * limits["per_ram_gb"]
        + storage * limits["per_storage_gb"]
        + (limits["managed_fee"] if managed else 0)
    )
    return HostingBase(
        f"{'Managed' if managed else 'Unmanaged'} VPS",
        [f"{cpu} vCPU · {ram} GB RAM · {storage} GB NVMe", f"{os_['name']} {os_['version']}"],
        monthly,
    )


def _dedicated(catalog: Catalog, cart: Cart) -> HostingBase:
    config = cart.dedicated
    server = lookup(catalog.servers, config.get("server"), "dedicated.server", "server")
    location = lookup(catalog.datacenters, config.get("location"), "dedicated.location", "data center")
    lookup(catalog.bandwidth, config.get("bandwidth"), "dedicated.bandwidth", "bandwidth package")
    if location["pk"] in server["out_of_stock_at"]:
        raise PricingError("dedicated.server", f"{server['name']} is out of stock in {location['city']}.")
    return HostingBase(
        f"Dedicated · {server['name']}",
        [f"{server['ram']} · {server['storage']}", f"{location['city']}, {location['country']} · Setup free"],
        server["monthly_usd"],
    )


def _cloud(catalog: Catalog, cart: Cart) -> HostingBase:
    config = cart.cloud
    size = lookup(catalog.cloud_sizes, config.get("size"), "cloud.size", "instance size")
    preset = lookup(catalog.scaling_presets, config.get("scaling"), "cloud.scaling", "autoscaling preset")
    low, high = preset["min_instances"], preset["max_instances"]
    span = f"{low} instance" if low == high else f"{low}–{high} instances"
    return HostingBase(
        f"Cloud · {size['name']}",
        [f"{low} × {size['cpu']} vCPU / {size['ram_gb']} GB RAM", f"Autoscaling: {preset['name']} ({span})"],
        size["monthly_usd"] * low,  # the price covers the minimum instance count
    )


def cycle_option(catalog: Catalog, cart: Cart, currency: Currency, months: int) -> dict[str, Any]:
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


def build_quote(catalog: Catalog, cart: Cart, today: date | None = None) -> dict[str, Any]:
    """Price a cart: every line item, renewal, discount, tax and the total due today."""
    return QuoteBuilder(catalog, cart, today).build()


class QuoteBuilder:
    """Builds a quote section by section. Each `_add_*` method appends line items."""

    def __init__(self, catalog: Catalog, cart: Cart, today: date | None = None):
        if cart.cycle not in CYCLES:
            raise PricingError("cycle", f"Billing cycle must be one of {CYCLES} months.")
        self.catalog = catalog
        self.cart = cart
        self.today = today
        self.months = cart.cycle
        self.currency: Currency = lookup(catalog.currencies, cart.currency, "currency", "currency")
        self.country: Country = lookup(catalog.countries, cart.country, "country", "country")
        self.lines: list[dict[str, Any]] = []
        self.free_domain: str | None = None

    def build(self) -> dict[str, Any]:
        self._add_hosting()
        self._add_product_extras()
        self._add_domains()
        self._add_value_added_services()
        return self._totals()

    # --- Line items ---------------------------------------------------------

    def _add_hosting(self) -> None:
        base = hosting_base(self.catalog, self.cart)
        current = cycle_option(self.catalog, self.cart, self.currency, self.months)
        regular = self.currency.round(current["regular_monthly"] * self.months)
        self.lines.append(
            {
                "id": "hosting",
                "kind": "hosting",
                "title": base.title,
                "details": base.details,
                "term_label": term_label(self.months),
                "due_today": current["total"],
                "regular_price": regular,
                "renewal": {"amount": regular, "label": every_label(self.months)},
                "badge": f"Save {int(current['discount'] * 100)}%" if current["discount"] > 0 else None,
                "removable": False,
                "auto_renew": True,
            }
        )

    def _add_monthly_line(
        self, line_id: str, title: str, monthly_usd: Decimal, details: list[str], removable: bool = True
    ) -> None:
        """A recurring extra: flat monthly price × months, same price at renewal."""
        amount = self.currency.round(self.currency.convert(monthly_usd) * self.months)
        self.lines.append(
            {
                "id": line_id,
                "kind": "addon",
                "title": title,
                "details": details,
                "term_label": term_label(self.months),
                "due_today": amount,
                "regular_price": amount,
                "renewal": {"amount": amount, "label": every_label(self.months)},
                "badge": None,
                "removable": removable,
                "auto_renew": True,
            }
        )

    def _add_product_extras(self) -> None:
        """Licences and upgrades tied to the hosting product, each on its own line so nothing is hidden."""
        cart, catalog = self.cart, self.catalog
        if cart.category == "vps":
            os_ = catalog.operating_systems[cart.vps["os"]]
            if os_["monthly_usd"] > 0:
                self._add_monthly_line(
                    "addon:os-licence",
                    f"{os_['name']} licence",
                    os_["monthly_usd"],
                    [f"{os_['name']} {os_['version']} · change OS to remove"],
                    removable=False,
                )
        if cart.category == "dedicated":
            bandwidth = catalog.bandwidth[cart.dedicated["bandwidth"]]
            if bandwidth["monthly_usd"] > 0:
                self._add_monthly_line(
                    "addon:bandwidth",
                    f"Bandwidth: {bandwidth['name']}",
                    bandwidth["monthly_usd"],
                    ["Replaces the included package"],
                )
        if cart.category == "cloud" and cart.cloud.get("kubernetes"):
            kubernetes_lines = (
                (True, "k8s-control-plane", "addon:k8s"),
                (cart.cloud.get("k8s_load_balancer"), "k8s-load-balancer", "addon:k8s-lb"),
                (cart.cloud.get("k8s_registry"), "k8s-registry", "addon:k8s-registry"),
            )
            for selected, slug, line_id in kubernetes_lines:
                if selected:
                    addon = catalog.addons[slug]
                    self._add_monthly_line(line_id, addon["name"], addon["monthly_usd"], [addon["description"]])

    def _add_domains(self) -> None:
        if len(self.cart.domains) > MAX_DOMAINS:
            raise PricingError("domains", f"You can add up to {MAX_DOMAINS} domains per order.")
        seen: set[str] = set()
        for index, domain in enumerate(self.cart.domains):
            name = domain.name.strip().lower()
            if not _DOMAIN_RE.match(name):
                raise PricingError(f"domains.{index}.name", f"{domain.name!r} isn’t a valid domain.")
            if name in seen:
                raise PricingError(f"domains.{index}.name", f"{name} is in the order twice.")
            seen.add(name)
            if domain.mode not in DOMAIN_MODES:
                raise PricingError(f"domains.{index}.mode", f"Unknown domain option: {domain.mode!r}.")

            if domain.mode == "existing":
                self._add_existing_domain(name)
            else:
                tld = self.catalog.tld_of(name)
                if tld is None:
                    raise PricingError(
                        f"domains.{index}.name", f"We can’t {domain.mode} {name}: that extension isn’t supported."
                    )
                self._add_registered_domain(name, tld, domain)

    def _add_existing_domain(self, name: str) -> None:
        zero = self.currency.round(Decimal(0))
        self.lines.append(
            {
                "id": f"domain:{name}",
                "kind": "domain",
                "title": name,
                "details": ["Your existing domain — no charge", "Point it to our nameservers"],
                "term_label": "—",
                "due_today": zero,
                "regular_price": zero,
                "renewal": None,
                "badge": "No charge",
                "removable": True,
                "auto_renew": None,
            }
        )

    def _add_registered_domain(self, name: str, tld_key: str, domain: DomainInput) -> None:
        tld = self.catalog.tlds[tld_key]
        is_free = (
            domain.mode == "register"
            and self.free_domain is None
            and free_domain_eligible(self.cart)
            and tld["free_with_hosting"]
        )
        if is_free:
            self.free_domain = name
        price = self.currency.convert(tld["transfer_usd"] if domain.mode == "transfer" else tld["register_usd"])
        if not tld["privacy_supported"]:
            privacy = f"WHOIS privacy not offered for {tld_key}"
        else:
            privacy = "WHOIS privacy: on (free)" if domain.privacy else "WHOIS privacy: off"
        kind = "Domain transfer · includes 1-year extension" if domain.mode == "transfer" else "Domain registration"
        self.lines.append(
            {
                "id": f"domain:{name}",
                "kind": "domain",
                "title": name,
                "details": [kind, privacy],
                "term_label": "1 year",
                "due_today": self.currency.round(Decimal(0)) if is_free else price,
                "regular_price": price,
                "renewal": {"amount": self.currency.convert(tld["renew_usd"]), "label": "every year"},
                "badge": "Free 1st year" if is_free else None,
                "removable": True,
                "auto_renew": bool(domain.auto_renew),
            }
        )

    def _add_value_added_services(self) -> None:
        addons, catalog = self.cart.addons, self.catalog
        if addons.get("backups"):
            backups = catalog.addons["backups"]
            self._add_monthly_line("addon:backups", backups["name"], backups["monthly_usd"], [backups["description"]])

        ssl = lookup(catalog.ssl_options, addons.get("ssl", "free"), "addons.ssl", "SSL option")
        if ssl["monthly_usd"] > 0:
            self._add_monthly_line("addon:ssl", ssl["name"], ssl["monthly_usd"], ["Replaces the included Standard SSL"])

        mailboxes = int(addons.get("email_boxes", 0))
        if not 0 <= mailboxes <= MAX_MAILBOXES:
            raise PricingError("addons.email_boxes", f"Mailboxes must be between 0 and {MAX_MAILBOXES}.")
        if mailboxes:
            email = catalog.addons["email-mailbox"]
            self._add_monthly_line(
                "addon:email",
                f"{email['name']} × {mailboxes}",
                email["monthly_usd"] * mailboxes,
                [email["description"]],
            )

        if addons.get("ddos_advanced"):
            ddos = catalog.addons["ddos-advanced"]
            self._add_monthly_line("addon:ddos", ddos["name"], ddos["monthly_usd"], ["Layer 7 filtering, up to 1 Tbps"])
        if addons.get("cdn"):
            cdn = catalog.addons["cdn"]
            self._add_monthly_line("addon:cdn", cdn["name"], cdn["monthly_usd"], ["Global edge caching"])

    # --- Totals -------------------------------------------------------------

    def _promo(self, subtotal: Decimal) -> tuple[dict | None, str | None]:
        if not self.cart.promo_code:
            return None, None
        promo, error = check_promo(self.catalog, self.cart.promo_code, self.today)
        if not promo:
            return None, error
        base = self.lines[0]["due_today"] if promo["applies_to"] == "hosting" else subtotal
        return {
            "code": promo["pk"],
            "label": promo["label"],
            "amount": self.currency.round(base * promo["percent"]),
        }, None

    def _tax_label(self) -> str:
        country = self.country
        if country.tax_rate == 0:
            return f"{country.tax_name} · {country.name} (not charged)"
        percent = f"{(country.tax_rate * 100).normalize():f}"
        return f"{country.tax_name} {percent}% · {country.name}"

    def _cloud_burst_hourly(self) -> Decimal | None:
        """Price per extra autoscaled instance per hour, shown so usage charges are never a surprise."""
        if self.cart.category != "cloud":
            return None
        size = self.catalog.cloud_sizes[self.cart.cloud["size"]]
        return quantize(size["monthly_usd"] / HOURS_PER_MONTH * self.currency.rate, 3)

    def _totals(self) -> dict[str, Any]:
        currency = self.currency
        subtotal = currency.round(sum((line["due_today"] for line in self.lines), Decimal(0)))
        savings = currency.round(sum((line["regular_price"] - line["due_today"] for line in self.lines), Decimal(0)))
        promo, promo_error = self._promo(subtotal)
        taxable = subtotal - (promo["amount"] if promo else 0)
        tax = currency.round(taxable * self.country.tax_rate)
        return {
            "currency": currency.code,
            "cycle": self.months,
            "lines": self.lines,
            "subtotal": subtotal,
            "savings": savings,
            "promo": promo,
            "promo_error": promo_error,
            "tax_rate": self.country.tax_rate,
            "tax_label": self._tax_label(),
            "tax": tax,
            "total": currency.round(taxable + tax),
            "cycle_options": [cycle_option(self.catalog, self.cart, currency, months) for months in CYCLES],
            "free_domain": {"eligible": free_domain_eligible(self.cart), "applied_to": self.free_domain},
            "cloud_burst_hourly": self._cloud_burst_hourly(),
        }
