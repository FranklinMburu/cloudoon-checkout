"""PayPal Checkout (Orders v2).

1. `create_order()`: the checkout asks us for a PayPal order for the server-priced
   total (`POST payments/paypal/orders/`), and PayPal's button opens it for approval.
2. `charge()`: after approval, the checkout places our order with the PayPal order
   id. We check the amount and currency match the order we priced, then capture it.
"""

from decimal import Decimal

import requests
from django.conf import settings
from django.core.cache import cache

from orders.payments.base import Charge, PaymentDeclinedError, ProviderUnavailableError

TIMEOUT_SECONDS = 10
SUPPORTED_CURRENCIES = {"USD", "EUR", "GBP"}  # PayPal doesn't take payments in KES


def is_configured() -> bool:
    return bool(settings.PAYPAL_CLIENT_ID and settings.PAYPAL_CLIENT_SECRET)


def create_order(amount: Decimal, currency: str, description: str) -> str:
    if currency not in SUPPORTED_CURRENCIES:
        raise PaymentDeclinedError(f"PayPal doesn’t accept {currency}. Switch to USD, EUR or GBP, or pay another way.")
    order = _request(
        "POST",
        "/v2/checkout/orders",
        json={
            "intent": "CAPTURE",
            "purchase_units": [
                {"description": description, "amount": {"currency_code": currency, "value": _format(amount)}}
            ],
        },
    )
    return order["id"]


def charge(details: dict, amount: Decimal, currency: str, *, order_number: str, key: str) -> Charge:
    paypal_order_id = str(details.get("paypal_order_id", ""))
    if not paypal_order_id:
        raise PaymentDeclinedError("Approve the payment in the PayPal window first.")

    approved = _request("GET", f"/v2/checkout/orders/{paypal_order_id}")
    expected = approved["purchase_units"][0]["amount"]
    if expected["currency_code"] != currency or Decimal(expected["value"]) != amount:
        raise PaymentDeclinedError("Your order total changed. Please approve the PayPal payment again.")

    # PayPal-Request-Id makes the capture idempotent: a retry returns the first result.
    captured = _request(
        "POST",
        f"/v2/checkout/orders/{paypal_order_id}/capture",
        headers={"PayPal-Request-Id": key},
        json={},
    )
    if captured.get("status") != "COMPLETED":
        raise PaymentDeclinedError("PayPal didn’t complete the payment. No money was taken.")
    capture_id = captured["purchase_units"][0]["payments"]["captures"][0]["id"]
    payer = captured.get("payer", {}).get("email_address", "")
    return Charge(reference=capture_id, label=f"PayPal {payer}".strip())


def _request(method: str, path: str, *, headers: dict | None = None, json: dict | None = None) -> dict:
    try:
        response = requests.request(
            method,
            settings.PAYPAL_BASE_URL + path,
            json=json,
            headers={"Authorization": f"Bearer {_access_token()}", **(headers or {})},
            timeout=TIMEOUT_SECONDS,
        )
    except requests.RequestException as exc:
        raise ProviderUnavailableError("PayPal is unavailable right now.") from exc
    if response.status_code == 422:
        raise PaymentDeclinedError("PayPal declined this payment. No money was taken. Try another way to pay.")
    if response.status_code >= 400:
        raise ProviderUnavailableError(f"PayPal returned HTTP {response.status_code}.")
    return response.json()


def _access_token() -> str:
    if token := cache.get("paypal:access-token"):
        return token
    try:
        response = requests.post(
            settings.PAYPAL_BASE_URL + "/v1/oauth2/token",
            data={"grant_type": "client_credentials"},
            auth=(settings.PAYPAL_CLIENT_ID, settings.PAYPAL_CLIENT_SECRET),
            timeout=TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        data = response.json()
    except (requests.RequestException, ValueError) as exc:
        raise ProviderUnavailableError("PayPal is unavailable right now.") from exc
    cache.set("paypal:access-token", data["access_token"], int(data.get("expires_in", 3600)) - 60)
    return data["access_token"]


def _format(amount: Decimal) -> str:
    return str(amount.quantize(Decimal("0.01")))
