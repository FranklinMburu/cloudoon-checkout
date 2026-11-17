"""API tests. Run against PostgreSQL in CI (see .github/workflows/ci.yml)."""

import uuid

import pytest
from django.core.cache import cache
from django.core.management import call_command
from rest_framework.test import APIClient

from orders.models import Order

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def seeded(db):
    cache.clear()  # throttle counters live in the cache; start every test fresh
    call_command("seed")


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def cart(api):
    return api.get("/api/v1/catalog/").json()["default_cart"]


def order_payload(cart, **payment):
    return {
        "cart": cart,
        "billing": {
            "full_name": "Amina Wanjiru",
            "email": "amina@example.com",
            "phone": "+254 712 345 678",
            "country": "KE",
            "address": "Westlands Road",
            "city": "Nairobi",
            "postal_code": "00800",
        },
        "payment": payment or {"method": "card", "token": "tok_visa", "brand": "Visa", "last4": "4242"},
        "accept_terms": True,
    }


def post_order(api, payload, key=None):
    return api.post("/api/v1/orders/", payload, format="json", HTTP_IDEMPOTENCY_KEY=key or uuid.uuid4().hex)


# --- Catalog & pricing --------------------------------------------------------


def test_health(api):
    assert api.get("/api/v1/health/").json() == {"status": "ok"}


def test_catalog_is_priced_in_requested_currency(api):
    usd = api.get("/api/v1/catalog/?currency=USD&cycle=12").json()
    wp = next(p for p in usd["shared_plans"] if p["slug"] == "wordpress")
    assert (wp["monthly"], wp["regular_monthly"]) == ("7.19", "8.99")  # money is a string, never a float
    kes = api.get("/api/v1/catalog/?currency=KES&cycle=12").json()
    assert kes["currency"]["decimals"] == 0
    assert next(p for p in kes["shared_plans"] if p["slug"] == "wordpress")["regular_monthly"] == "1160"


@pytest.mark.parametrize("query", ["currency=XYZ", "cycle=7", "cycle=abc"])
def test_catalog_rejects_bad_params(api, query):
    assert api.get(f"/api/v1/catalog/?{query}").status_code == 400


def test_quote_default_cart(api, cart):
    q = api.post("/api/v1/quote/", cart, format="json").json()
    assert (q["subtotal"], q["tax"], q["total"]) == ("86.28", "13.80", "100.08")
    assert [o["months"] for o in q["cycle_options"]] == [1, 12, 24, 36]


def test_quote_reports_the_offending_field(api, cart):
    cart["category"] = "dedicated"
    cart["dedicated"] = {"server": "epyc-9354p", "location": "nbo", "bandwidth": "bw-10"}
    r = api.post("/api/v1/quote/", cart, format="json")
    assert r.status_code == 400 and r.json()["field"] == "dedicated.server"


def test_quote_requires_selected_category_config(api, cart):
    cart["category"] = "vps"
    cart.pop("vps")
    assert api.post("/api/v1/quote/", cart, format="json").status_code == 400


@pytest.mark.parametrize(
    "code,status,text",
    [
        ("welcome10", 200, "10% off"),
        ("SUMMER24", 400, "expired"),
        ("NOPE", 400, "isn’t a valid code"),
    ],
)
def test_promo_validation(api, code, status, text):
    r = api.post("/api/v1/promos/validate/", {"code": code}, format="json")
    assert r.status_code == status and text in str(r.json())


def test_domain_check(api):
    r = api.get("/api/v1/domains/check/?q=google").json()
    assert r["exact"] == {"name": "google.com", "tld": ".com", "available": False}
    assert len(r["suggestions"]) == 7 and r["simulated"] is True
    assert api.get("/api/v1/domains/check/?q=-bad-").status_code == 400


def test_address_lookup(api):
    results = api.get("/api/v1/addresses/?q=westlands").json()["results"]
    assert results[0]["city"] == "Nairobi"


# --- Authentication & authorization ------------------------------------------


def test_register_login_me_logout(api):
    weak = api.post("/api/v1/auth/register/", {"email": "new@example.com", "password": "12345678"}, format="json")
    assert weak.status_code == 400

    r = api.post(
        "/api/v1/auth/register/",
        {"email": "New@Example.com", "password": "Sunrise-Nairobi-26", "full_name": "Joy Otieno"},
        format="json",
    )
    assert r.status_code == 201 and r.json()["user"]["email"] == "new@example.com"
    dup = api.post(
        "/api/v1/auth/register/", {"email": "new@example.com", "password": "Sunrise-Nairobi-26"}, format="json"
    )
    assert dup.status_code == 400

    token = api.post(
        "/api/v1/auth/login/", {"email": "new@example.com", "password": "Sunrise-Nairobi-26"}, format="json"
    ).json()["token"]
    api.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    assert api.get("/api/v1/auth/me/").json()["user"]["name"] == "Joy Otieno"
    assert api.post("/api/v1/auth/logout/").status_code == 204
    assert api.get("/api/v1/auth/me/").status_code == 401


def test_login_does_not_reveal_which_part_was_wrong(api):
    unknown = api.post("/api/v1/auth/login/", {"email": "nobody@example.com", "password": "x"}, format="json").json()
    wrong_pw = api.post("/api/v1/auth/login/", {"email": "demo@cloudoon.com", "password": "x"}, format="json").json()
    assert unknown == wrong_pw


def test_demo_login_and_simulated_oauth(api):
    assert (
        api.post(
            "/api/v1/auth/login/", {"email": "demo@cloudoon.com", "password": "Demo1234!"}, format="json"
        ).status_code
        == 200
    )
    r = api.post("/api/v1/auth/oauth/google/", {}, format="json").json()
    assert r["simulated"] is True and r["user"]["provider"] == "google"
    assert api.post("/api/v1/auth/oauth/sso/", {}, format="json").status_code == 400
    assert api.post("/api/v1/auth/oauth/facebook/", {}, format="json").status_code == 404


def test_password_reset_never_reveals_accounts(api):
    a = api.post("/api/v1/auth/password-reset/", {"email": "demo@cloudoon.com"}, format="json")
    b = api.post("/api/v1/auth/password-reset/", {"email": "nobody@example.com"}, format="json")
    assert a.status_code == b.status_code == 202 and a.json() == b.json()


# --- Orders -------------------------------------------------------------------


def test_order_is_repriced_on_the_server(api, cart):
    payload = order_payload(cart)
    payload["cart"]["total"] = "0.01"  # unknown fields are ignored; the server prices the cart itself
    r = post_order(api, payload)
    assert r.status_code == 201
    body = r.json()
    assert body["total"] == "100.08" and body["number"].startswith("CL-")
    assert [i["line_id"] for i in body["items"]] == ["hosting"]


def test_same_idempotency_key_never_charges_twice(api, cart):
    key = uuid.uuid4().hex
    first = post_order(api, order_payload(cart), key)
    again = post_order(api, order_payload(cart), key)
    assert (first.status_code, again.status_code) == (201, 200)
    assert first.json()["reference"] == again.json()["reference"]
    assert Order.objects.count() == 1
    assert first.json()["status"] == "paid"


def test_order_requires_idempotency_key(api, cart):
    assert api.post("/api/v1/orders/", order_payload(cart), format="json").status_code == 400


def test_declined_card_creates_no_order(api, cart):
    r = post_order(api, order_payload(cart, method="card", token="tok_chargeDeclined"))
    assert r.status_code == 402 and "declined" in r.json()["detail"]
    assert Order.objects.count() == 0


def test_terms_must_be_accepted(api, cart):
    payload = order_payload(cart)
    payload["accept_terms"] = False
    assert post_order(api, payload).status_code == 400


def test_order_belongs_to_signed_in_user_and_others_cannot_read_it(api, cart):
    token = api.post(
        "/api/v1/auth/login/", {"email": "demo@cloudoon.com", "password": "Demo1234!"}, format="json"
    ).json()["token"]
    api.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    ref = post_order(api, order_payload(cart, method="mpesa", phone="0712345678")).json()["reference"]
    assert Order.objects.get(reference=ref).user.email == "demo@cloudoon.com"
    assert api.get(f"/api/v1/orders/{ref}/").status_code == 200

    other = APIClient()
    other_token = other.post("/api/v1/auth/oauth/sso/", {"email": "someone@acme.com"}, format="json").json()["token"]
    other.credentials(HTTP_AUTHORIZATION=f"Token {other_token}")
    assert other.get(f"/api/v1/orders/{ref}/").status_code == 404  # authorization: not your order
    assert APIClient().get(f"/api/v1/orders/{ref}/").status_code == 401  # authentication: not signed in


def test_declined_payment_can_be_retried_with_the_same_key(api, cart):
    key = uuid.uuid4().hex
    declined = post_order(api, order_payload(cart, method="card", token="tok_chargeDeclined"), key)
    retried = post_order(api, order_payload(cart), key)
    assert (declined.status_code, retried.status_code) == (402, 201)
    assert Order.objects.get().status == Order.Status.PAID
