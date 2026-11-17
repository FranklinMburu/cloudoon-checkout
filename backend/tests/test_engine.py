"""Unit tests for the pure pricing engine (no database needed)."""

import itertools
import json
from datetime import date
from decimal import Decimal as D
from pathlib import Path

import pytest

from pricing.engine import Cart, Catalog, PricingError, build_quote, default_cart

FIXTURE = Path(__file__).resolve().parent.parent / "catalog" / "fixtures" / "catalog.json"


@pytest.fixture(scope="module")
def catalog():
    return Catalog.from_records(json.loads(FIXTURE.read_text(encoding="utf-8")))


def cart(catalog, **overrides):
    data = default_cart(catalog)
    for key, value in overrides.items():
        if isinstance(value, dict) and isinstance(data.get(key), dict):
            data[key] = {**data[key], **value}
        else:
            data[key] = value
    return Cart.from_dict(data)


def test_default_cart_matches_known_total(catalog):
    q = build_quote(catalog, cart(catalog))
    # WordPress $8.99/mo, 20% off for 12 months = $7.19 × 12 = $86.28; Kenya VAT 16% = $13.80
    assert q["lines"][0]["due_today"] == D("86.28")
    assert q["lines"][0]["renewal"]["amount"] == D("107.88")
    assert q["tax"] == D("13.80")
    assert q["total"] == D("100.08")


@pytest.mark.parametrize("currency,category,cycle,promo,country", list(itertools.product(
    ["USD", "EUR", "GBP", "KES"],
    ["shared", "vps", "dedicated", "cloud"],
    [1, 12, 24, 36],
    [None, "WELCOME10", "HOSTING25"],
    ["KE", "US", "GB", "DE"],
)))
def test_totals_always_reconcile(catalog, currency, category, cycle, promo, country):
    c = cart(
        catalog,
        category=category, currency=currency, cycle=cycle, promo_code=promo, country=country,
        cloud={"kubernetes": True, "k8s_registry": True},
        dedicated={"bandwidth": "bw-50"},
        domains=[
            {"name": "brand.com", "mode": "register"},
            {"name": "brand.io", "mode": "transfer"},
            {"name": "mine.org", "mode": "existing"},
        ],
        addons={"backups": True, "ssl": "wildcard", "email_boxes": 3, "ddos_advanced": True, "cdn": True},
    )
    q = build_quote(catalog, c)
    places = catalog.currencies[currency].decimals
    assert sum(l["due_today"] for l in q["lines"]) == q["subtotal"]
    discount = q["promo"]["amount"] if q["promo"] else 0
    assert q["subtotal"] - discount + q["tax"] == q["total"]
    for amount in [q["subtotal"], q["tax"], q["total"], *(l["due_today"] for l in q["lines"])]:
        assert -amount.as_tuple().exponent == places
    # The selected cycle option always agrees with the hosting line.
    selected = next(o for o in q["cycle_options"] if o["months"] == cycle)
    assert selected["total"] == q["lines"][0]["due_today"]


def test_half_cent_rounds_up_not_down(catalog):
    """Float maths turns 201.555 into 201.55; Decimal must give 201.56."""
    from pricing.engine import Currency, quantize

    assert quantize(D("1119.75") * D("0.18"), 2) == D("201.56")
    assert Currency("USD", "US Dollar", "$", D(1), 2).round(D("158.355")) == D("158.36")


def test_free_domain_only_first_eligible_registration(catalog):
    q = build_quote(catalog, cart(catalog, domains=[
        {"name": "one.io", "mode": "register"},      # .io is not free-eligible
        {"name": "two.com", "mode": "register"},     # first eligible → free
        {"name": "three.net", "mode": "register"},   # second eligible → paid
    ]))
    by_id = {l["id"]: l for l in q["lines"]}
    assert by_id["domain:two.com"]["due_today"] == 0
    assert by_id["domain:three.net"]["due_today"] > 0
    assert by_id["domain:one.io"]["due_today"] > 0
    assert q["free_domain"] == {"eligible": True, "applied_to": "two.com"}


def test_no_free_domain_on_monthly_billing(catalog):
    q = build_quote(catalog, cart(catalog, cycle=1, domains=[{"name": "two.com", "mode": "register"}]))
    assert q["lines"][1]["due_today"] > 0
    assert q["free_domain"]["eligible"] is False


def test_promo_expired_and_invalid(catalog):
    q = build_quote(catalog, cart(catalog, promo_code="SUMMER24"), today=date(2026, 1, 1))
    assert q["promo"] is None and "expired on 31 Aug 2024" in q["promo_error"]
    q = build_quote(catalog, cart(catalog, promo_code="NOPE"))
    assert q["promo"] is None and "isn’t a valid code" in q["promo_error"]


def test_hosting_promo_only_discounts_hosting(catalog):
    q = build_quote(catalog, cart(catalog, promo_code="HOSTING25", addons={"backups": True}))
    assert q["promo"]["amount"] == (q["lines"][0]["due_today"] * D("0.25")).quantize(D("0.01"))


def test_kes_has_no_decimals(catalog):
    q = build_quote(catalog, cart(catalog, currency="KES"))
    assert q["total"] == q["total"].to_integral_value()


def test_windows_licence_is_its_own_line(catalog):
    q = build_quote(catalog, cart(catalog, category="vps", vps={"os": "windows", "cpu": 2, "ram": 4}))
    assert any(l["id"] == "addon:os-licence" and not l["removable"] for l in q["lines"])


@pytest.mark.parametrize("overrides,field", [
    ({"category": "vps", "vps": {"os": "windows", "cpu": 1, "ram": 4}}, "vps.os"),
    ({"category": "vps", "vps": {"ram": 3}}, "vps.ram"),
    ({"category": "vps", "vps": {"storage": 30}}, "vps.storage"),
    ({"category": "dedicated", "dedicated": {"server": "epyc-9354p", "location": "nbo"}}, "dedicated.server"),
    ({"category": "spaceship"}, "category"),
    ({"cycle": 6}, "cycle"),
    ({"currency": "XYZ"}, "currency"),
    ({"domains": [{"name": "not a domain", "mode": "register"}]}, "domains.0.name"),
    ({"domains": [{"name": "a.com", "mode": "register"}, {"name": "a.com", "mode": "transfer"}]}, "domains.1.name"),
    ({"domains": [{"name": "brand.xyz", "mode": "register"}]}, "domains.0.name"),
    ({"addons": {"email_boxes": 51}}, "addons.email_boxes"),
])
def test_invalid_carts_are_rejected_with_a_field(catalog, overrides, field):
    with pytest.raises(PricingError) as err:
        build_quote(catalog, cart(catalog, **overrides))
    assert err.value.field == field


def test_existing_domain_with_unknown_tld_is_free(catalog):
    q = build_quote(catalog, cart(catalog, domains=[{"name": "brand.xyz", "mode": "existing"}]))
    assert q["lines"][1]["due_today"] == 0 and q["lines"][1]["renewal"] is None
