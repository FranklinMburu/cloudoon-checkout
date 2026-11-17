"""API tests. Run against PostgreSQL in CI (see .github/workflows/ci.yml)."""

import uuid

import pytest
from rest_framework.test import APIClient

from orders.models import Order
from tests.helpers import DECLINED_CARD, order_payload, post_order, sign_in

pytestmark = [pytest.mark.django_db, pytest.mark.usefixtures("seeded", "integrations")]


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


def test_checkout_config_lists_what_is_switched_on(api, settings):
    settings.PAYPAL_CLIENT_ID = ""
    config = api.get("/api/v1/config/").json()
    assert config["sign_in"] == ["google", "github", "sso"]
    assert config["payments"]["methods"] == ["card", "mpesa"]
    assert config["payments"]["stripe_publishable_key"] == "pk_test_x"


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


def test_demo_login(api):
    login = api.post("/api/v1/auth/login/", {"email": "demo@cloudoon.com", "password": "Demo1234!"}, format="json")
    assert login.status_code == 200


def test_password_reset_never_reveals_accounts(api):
    a = api.post("/api/v1/auth/password-reset/", {"email": "demo@cloudoon.com"}, format="json")
    b = api.post("/api/v1/auth/password-reset/", {"email": "nobody@example.com"}, format="json")
    assert a.status_code == b.status_code == 202 and a.json() == b.json()


# --- Orders -------------------------------------------------------------------


def test_order_is_repriced_on_the_server(api, cart, integrations):
    payload = order_payload(cart)
    payload["cart"]["total"] = "0.01"  # unknown fields are ignored; the server prices the cart itself
    r = post_order(api, payload)
    assert r.status_code == 201
    body = r.json()
    assert body["total"] == "100.08" and body["number"].startswith("CL-")
    assert [i["line_id"] for i in body["items"]] == ["hosting"]
    assert body["payment_label"] == "Visa ending 4242"
    assert integrations.stripe_calls[0]["amount"] == 10008  # Stripe is charged the server total, in cents


def test_same_idempotency_key_never_charges_twice(api, cart, integrations):
    key = uuid.uuid4().hex
    first = post_order(api, order_payload(cart), key)
    again = post_order(api, order_payload(cart), key)
    assert (first.status_code, again.status_code) == (201, 200)
    assert first.json()["reference"] == again.json()["reference"]
    assert Order.objects.count() == 1
    assert first.json()["status"] == "paid"
    assert len(integrations.stripe_calls) == 1


def test_order_requires_idempotency_key(api, cart):
    assert api.post("/api/v1/orders/", order_payload(cart), format="json").status_code == 400


def test_declined_card_creates_no_order(api, cart):
    r = post_order(api, order_payload(cart, DECLINED_CARD))
    assert r.status_code == 402 and "declined" in r.json()["detail"]
    assert Order.objects.count() == 0


def test_terms_must_be_accepted(api, cart):
    payload = order_payload(cart)
    payload["accept_terms"] = False
    assert post_order(api, payload).status_code == 400


def test_order_belongs_to_signed_in_user_and_others_cannot_read_it(api, cart):
    sign_in(api)
    ref = post_order(api, order_payload(cart)).json()["reference"]
    assert Order.objects.get(reference=ref).user.email == "demo@cloudoon.com"
    assert api.get(f"/api/v1/orders/{ref}/").status_code == 200

    other = APIClient()
    other.post("/api/v1/auth/register/", {"email": "joy@example.com", "password": "Sunrise-Nairobi-26"}, format="json")
    sign_in(other, "joy@example.com", "Sunrise-Nairobi-26")
    assert other.get(f"/api/v1/orders/{ref}/").status_code == 404  # authorization: not your order
    assert APIClient().get(f"/api/v1/orders/{ref}/").status_code == 401  # authentication: not signed in


def test_declined_payment_can_be_retried_with_the_same_key(api, cart):
    key = uuid.uuid4().hex
    declined = post_order(api, order_payload(cart, DECLINED_CARD), key)
    retried = post_order(api, order_payload(cart), key)
    assert (declined.status_code, retried.status_code) == (402, 201)
    assert Order.objects.get().status == Order.Status.PAID


def test_registering_a_domain_taken_since_the_search_is_refused(api, cart):
    cart["domains"] = [{"name": "taken.co.ke", "mode": "register"}]
    r = post_order(api, order_payload(cart))
    assert r.status_code == 409 and "taken.co.ke" in r.json()["detail"]
    assert Order.objects.count() == 0
