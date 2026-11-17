"""Outside services: the registry, address search, OAuth, M-Pesa and PayPal.

Each test replaces the HTTP call at the module boundary, so we check how we use a
provider's answers without depending on the provider being up.
"""

import uuid
from decimal import Decimal
from types import SimpleNamespace
from urllib.parse import parse_qs, urlparse

import pytest
from django.contrib.auth import get_user_model

from accounts import address_lookup, oauth
from domains import registry
from domains.registry import is_registered as real_is_registered  # the shared fixture stubs the module attribute
from orders.models import Order
from orders.payments import mpesa
from tests.helpers import order_payload, post_order

pytestmark = [pytest.mark.django_db, pytest.mark.usefixtures("seeded", "integrations")]

# --- Domain registry ----------------------------------------------------------


def test_domain_search_reports_each_extension(api):
    r = api.get("/api/v1/domains/check/?q=google").json()
    assert r["exact"] == {"name": "google.com", "tld": ".com", "available": False}
    suggestions = {s["name"]: s["available"] for s in r["suggestions"]}
    assert suggestions["google.io"] is False and suggestions["google.co.ke"] is True
    assert len(suggestions) == 7
    assert api.get("/api/v1/domains/check/?q=-bad-").status_code == 400


def test_domain_search_says_so_when_the_registry_is_down(api, monkeypatch):
    def unreachable(name):
        raise registry.RegistryUnavailableError(name)

    monkeypatch.setattr("domains.registry.is_registered", unreachable)
    assert api.get("/api/v1/domains/check/?q=mybrand").status_code == 503


def fake_response(status_code, payload=None):
    return SimpleNamespace(status_code=status_code, json=lambda: payload, raise_for_status=lambda: None)


def test_rdap_answers_are_read_correctly(monkeypatch):
    bootstrap = {"services": [[["com", "net"], ["http://old.example/", "https://rdap.verisign.com/com/v1/"]]]}

    def get(url, **kwargs):
        if url == registry.RDAP_BOOTSTRAP_URL:
            return fake_response(200, bootstrap)
        return fake_response(200 if url.endswith("/domain/taken.com") else 404)

    monkeypatch.setattr(registry.requests, "get", get)
    assert registry.rdap_servers()["net"] == "https://rdap.verisign.com/com/v1/"
    assert real_is_registered("taken.com") is True
    assert real_is_registered("free-name.com") is False


def test_whois_is_used_where_there_is_no_rdap(monkeypatch):
    monkeypatch.setattr(registry, "rdap_servers", lambda: {})
    replies = {
        ("whois.iana.org", "ke"): "domain: KE\nwhois:        whois.kenic.or.ke\n",
        ("whois.kenic.or.ke", "taken.co.ke"): "Domain Name: taken.co.ke\nRegistrar: ...",
        ("whois.kenic.or.ke", "free.co.ke"): "No Object Found",
    }
    monkeypatch.setattr(registry, "_whois_query", lambda server, query: replies[(server, query)])
    assert real_is_registered("taken.co.ke") is True
    assert real_is_registered("free.co.ke") is False


# --- Address search -----------------------------------------------------------


def test_address_suggestions_come_from_photon_billing_country_first(api, monkeypatch):
    features = [
        {"properties": {"name": "Westlands", "city": "Cape Town", "countrycode": "za"}},
        {"properties": {"street": "Waiyaki Way", "housenumber": "14", "city": "Nairobi", "countrycode": "ke"}},
        {"properties": {"name": "Somewhere without a town", "countrycode": "ke"}},
    ]
    monkeypatch.setattr(address_lookup.requests, "get", lambda *a, **k: fake_response(200, {"features": features}))
    results = api.get("/api/v1/addresses/?q=westlands&country=KE").json()["results"]
    assert results == [
        {"line": "14 Waiyaki Way", "city": "Nairobi", "postal_code": "", "country": "KE"},
        {"line": "Westlands", "city": "Cape Town", "postal_code": "", "country": "ZA"},
    ]


# --- OAuth ----------------------------------------------------------------------


def start(api, method, nonce=None, **params):
    return api.get(f"/api/v1/auth/oauth/{method}/start/", {"nonce": nonce or uuid.uuid4().hex, **params})


def callback(api, provider, state, code="one-time-code"):
    return api.get(f"/api/v1/auth/oauth/{provider}/callback/", {"state": state, "code": code})


def poll(api, nonce):
    return api.post("/api/v1/auth/oauth/result/", {"nonce": nonce}, format="json")


def state_from(redirect) -> str:
    return parse_qs(urlparse(redirect["Location"]).query)["state"][0]


def test_github_sign_in_end_to_end(api, monkeypatch):
    nonce = uuid.uuid4().hex
    redirect = start(api, "github", nonce)
    assert redirect.status_code == 302 and redirect["Location"].startswith("https://github.com/login/oauth/authorize")
    assert poll(api, nonce).status_code == 202  # the customer is still on GitHub

    profiles = {
        "https://api.github.com/user/emails": [{"email": "Dev@Example.com", "primary": True, "verified": True}],
        "https://api.github.com/user": {"name": "Wanjiku Kamau"},
    }
    monkeypatch.setattr(oauth, "_exchange_code", lambda provider, code, redirect_uri: "gh-access-token")
    monkeypatch.setattr(oauth, "_get_json", lambda url, token: profiles[url])
    assert callback(api, "github", state_from(redirect)).status_code == 200

    session = poll(api, nonce)
    assert session.status_code == 200 and session.json()["user"]["email"] == "dev@example.com"
    assert get_user_model().objects.get(email="dev@example.com").get_full_name() == "Wanjiku Kamau"
    assert poll(api, nonce).status_code == 202  # handed out once only


def test_sign_in_rejects_bad_nonces_and_forged_state(api):
    assert start(api, "github", nonce="short").status_code == 400
    assert callback(api, "github", "forged-state").status_code == 400


def test_company_sso_requires_a_work_domain_and_checks_it(api, monkeypatch):
    personal = uuid.uuid4().hex
    assert start(api, "sso", personal, email="me@gmail.com").status_code == 400
    assert "work email" in poll(api, personal).json()["detail"]

    nonce = uuid.uuid4().hex
    redirect = start(api, "sso", nonce, email="amina@acme.co.ke")
    params = parse_qs(urlparse(redirect["Location"]).query)
    assert params["hd"] == ["acme.co.ke"] and params["login_hint"] == ["amina@acme.co.ke"]

    monkeypatch.setattr(oauth, "_exchange_code", lambda provider, code, redirect_uri: "google-access-token")
    monkeypatch.setattr(
        oauth, "_get_json", lambda url, token: {"email": "amina@gmail.com", "email_verified": True, "hd": None}
    )
    assert callback(api, "google", state_from(redirect)).status_code == 400
    assert "acme.co.ke" in poll(api, nonce).json()["detail"]


def test_unconfigured_providers_are_not_offered(api, settings):
    settings.GITHUB_CLIENT_SECRET = ""
    assert "github" not in api.get("/api/v1/config/").json()["sign_in"]
    assert start(api, "github").status_code == 400


# --- M-Pesa ---------------------------------------------------------------------


@pytest.fixture
def kes_cart(cart):
    return {**cart, "currency": "KES"}


@pytest.fixture
def daraja(monkeypatch):
    """Daraja accepts every STK push; status queries answer from `daraja.status`."""
    sent = []
    state = SimpleNamespace(sent=sent, status={"errorCode": mpesa.STILL_PROCESSING})

    def post(path, payload):
        if path.endswith("processrequest"):
            sent.append(payload)
            return {"ResponseCode": "0", "CheckoutRequestID": f"ws_CO_{len(sent)}"}
        return state.status

    monkeypatch.setattr(mpesa, "_post", post)
    return state


def mpesa_callback(api, checkout_id, result_code, token=None):
    body = {
        "Body": {
            "stkCallback": {
                "CheckoutRequestID": checkout_id,
                "ResultCode": result_code,
                "ResultDesc": "Processed",
                "CallbackMetadata": {"Item": [{"Name": "MpesaReceiptNumber", "Value": "TKQ1ABC23D"}]},
            }
        }
    }
    url = f"/api/v1/payments/mpesa/callback/{token or mpesa.callback_token()}/"
    return api.post(url, body, format="json")


def test_mpesa_order_waits_for_the_phone_then_the_callback_confirms_it(api, kes_cart, daraja):
    key = uuid.uuid4().hex
    payload = order_payload(kes_cart, {"method": "mpesa", "phone": "0712 345 678"})
    placed = post_order(api, payload, key)
    assert placed.status_code == 202 and placed.json()["status"] == "pending"
    assert daraja.sent[0]["PhoneNumber"] == "254712345678"
    assert daraja.sent[0]["Amount"] == int(Decimal(placed.json()["total"]))

    assert mpesa_callback(api, "ws_CO_1", 0, token="wrong").status_code == 404
    assert mpesa_callback(api, "ws_CO_1", 0).json()["ResultCode"] == 0

    polled = post_order(api, payload, key)  # the checkout polls with the same key
    assert polled.status_code == 200 and polled.json()["status"] == "paid"
    assert "TKQ1ABC23D" in polled.json()["payment_label"]


def test_mpesa_status_query_settles_a_lost_callback(api, kes_cart, daraja):
    key = uuid.uuid4().hex
    payload = order_payload(kes_cart, {"method": "mpesa", "phone": "0712345678"})
    post_order(api, payload, key)

    daraja.status = {"ResponseCode": "0", "ResultCode": "1032", "ResultDesc": "Request cancelled by user"}
    polled = post_order(api, payload, key).json()
    assert polled["status"] == "failed" and polled["payment_error"] == "You cancelled the M-Pesa request."


def test_mpesa_needs_shillings_and_a_safaricom_number(api, cart, kes_cart, daraja):
    assert post_order(api, order_payload(cart, {"method": "mpesa", "phone": "0712345678"})).status_code == 402
    assert post_order(api, order_payload(kes_cart, {"method": "mpesa", "phone": "12345"})).status_code == 402
    assert Order.objects.count() == 0


# --- PayPal ---------------------------------------------------------------------


@pytest.fixture
def paypal_api(monkeypatch):
    """A tiny in-memory PayPal: orders keep the amount they were created with."""
    orders = {}

    def request(method, path, *, headers=None, json=None):
        if method == "POST" and path == "/v2/checkout/orders":
            orders["PP-1"] = json["purchase_units"][0]["amount"]
            return {"id": "PP-1"}
        order_id = path.split("/")[4]  # /v2/checkout/orders/<id>[/capture]
        if method == "GET":
            return {"purchase_units": [{"amount": orders[order_id]}]}
        return {
            "status": "COMPLETED",
            "payer": {"email_address": "buyer@example.com"},
            "purchase_units": [{"payments": {"captures": [{"id": "CAPTURE-1"}]}}],
        }

    monkeypatch.setattr("orders.payments.paypal._request", request)
    return orders


def test_paypal_order_is_created_for_the_server_total_then_captured(api, cart, paypal_api):
    created = api.post("/api/v1/payments/paypal/orders/", {"cart": cart}, format="json")
    assert created.status_code == 200 and paypal_api["PP-1"] == {"currency_code": "USD", "value": "100.08"}

    placed = post_order(api, order_payload(cart, {"method": "paypal", "paypal_order_id": "PP-1"}))
    assert placed.status_code == 201
    assert placed.json()["payment_label"] == "PayPal buyer@example.com"


def test_paypal_is_refused_if_the_total_changed_after_approval(api, cart, paypal_api):
    api.post("/api/v1/payments/paypal/orders/", {"cart": cart}, format="json")
    cart["cycle"] = 36
    placed = post_order(api, order_payload(cart, {"method": "paypal", "paypal_order_id": "PP-1"}))
    assert placed.status_code == 402 and Order.objects.count() == 0


def test_paypal_does_not_take_shillings(api, kes_cart, paypal_api):
    assert api.post("/api/v1/payments/paypal/orders/", {"cart": kes_cart}, format="json").status_code == 400
