"""M-Pesa Express (STK push) through Safaricom's Daraja API.

1. `charge()` asks Safaricom to show a payment prompt on the customer's phone and
   returns at once; the order stays `pending`.
2. The customer enters their M-Pesa PIN. Safaricom then calls our callback URL with
   the result, and we mark the order paid or failed (`orders.services.settle_mpesa`).
3. If that callback is late or lost, the checkout's polling makes us ask Safaricom
   directly (`check()`).
"""

import base64
import re
from decimal import Decimal

import requests
from django.conf import settings
from django.core.cache import cache
from django.urls import reverse
from django.utils import timezone
from django.utils.crypto import salted_hmac

from orders.payments.base import Charge, PaymentDeclinedError, ProviderUnavailableError

TIMEOUT_SECONDS = 10
# Daraja reports "still waiting for the customer" on the status query as this error.
STILL_PROCESSING = "500.001.1001"
RESULT_MESSAGES = {
    "1": "Your M-Pesa balance is too low for this payment.",
    "1032": "You cancelled the M-Pesa request.",
    "1037": "We didn’t get a response from your phone in time.",
    "2001": "The M-Pesa PIN was wrong.",
}


def is_configured() -> bool:
    return all(
        (settings.MPESA_CONSUMER_KEY, settings.MPESA_CONSUMER_SECRET, settings.MPESA_SHORTCODE, settings.MPESA_PASSKEY)
    )


def charge(details: dict, amount: Decimal, currency: str, *, order_number: str, key: str) -> Charge:
    if currency != "KES":
        raise PaymentDeclinedError("M-Pesa payments are in Kenyan shillings. Switch the currency to KES to use M-Pesa.")
    phone = normalize_phone(str(details.get("phone", "")))
    if not phone:
        raise PaymentDeclinedError("Enter a Safaricom number like 0712 345 678.")

    response = _post(
        "/mpesa/stkpush/v1/processrequest",
        {
            **_password_fields(),
            "TransactionType": "CustomerPayBillOnline",
            "Amount": int(amount.to_integral_value()),
            "PartyA": phone,
            "PartyB": settings.MPESA_SHORTCODE,
            "PhoneNumber": phone,
            "CallBackURL": callback_url(),
            "AccountReference": order_number,
            "TransactionDesc": f"Cloudoon {order_number}",
        },
    )
    if response.get("ResponseCode") != "0":
        raise PaymentDeclinedError(response.get("errorMessage") or "M-Pesa couldn’t send the request to your phone.")
    return Charge(reference=response["CheckoutRequestID"], label=f"M-Pesa {_masked(phone)}", pending=True)


def check(checkout_request_id: str) -> tuple[str, str]:
    """Ask Safaricom how a pending request ended: ("paid" | "failed" | "pending", message)."""
    try:
        response = _post(
            "/mpesa/stkpushquery/v1/query", {**_password_fields(), "CheckoutRequestID": checkout_request_id}
        )
    except ProviderUnavailableError:
        return "pending", ""
    if response.get("errorCode") == STILL_PROCESSING or "ResultCode" not in response:
        return "pending", ""
    return outcome(str(response["ResultCode"]), response.get("ResultDesc", ""))


def outcome(result_code: str, description: str) -> tuple[str, str]:
    if result_code == "0":
        return "paid", ""
    return "failed", RESULT_MESSAGES.get(result_code, description or "The M-Pesa payment didn’t go through.")


def normalize_phone(raw: str) -> str:
    """'0712 345 678', '+254712345678' → '254712345678'; anything else → ''."""
    digits = re.sub(r"\D", "", raw)
    match = re.fullmatch(r"(?:254|0)?([71]\d{8})", digits)
    return f"254{match.group(1)}" if match else ""


def callback_token() -> str:
    """Secret path segment for the callback URL; Daraja doesn't sign its callbacks."""
    return salted_hmac("mpesa-callback", "v1").hexdigest()[:32]


def callback_url() -> str:
    path = reverse("mpesa-callback", args=[callback_token()])
    return settings.PUBLIC_API_URL.rstrip("/") + path


def _password_fields() -> dict:
    timestamp = timezone.localtime().strftime("%Y%m%d%H%M%S")  # Daraja expects Nairobi time
    password = base64.b64encode(f"{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}".encode()).decode()
    return {"BusinessShortCode": settings.MPESA_SHORTCODE, "Password": password, "Timestamp": timestamp}


def _post(path: str, payload: dict) -> dict:
    try:
        response = requests.post(
            settings.MPESA_BASE_URL + path,
            json=payload,
            headers={"Authorization": f"Bearer {_access_token()}"},
            timeout=TIMEOUT_SECONDS,
        )
        return response.json()
    except (requests.RequestException, ValueError) as exc:
        raise ProviderUnavailableError("M-Pesa is unavailable right now.") from exc


def _access_token() -> str:
    if token := cache.get("mpesa:access-token"):
        return token
    try:
        response = requests.get(
            settings.MPESA_BASE_URL + "/oauth/v1/generate",
            params={"grant_type": "client_credentials"},
            auth=(settings.MPESA_CONSUMER_KEY, settings.MPESA_CONSUMER_SECRET),
            timeout=TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        data = response.json()
    except (requests.RequestException, ValueError) as exc:
        raise ProviderUnavailableError("M-Pesa is unavailable right now.") from exc
    cache.set("mpesa:access-token", data["access_token"], int(data.get("expires_in", 3599)) - 60)
    return data["access_token"]


def _masked(phone: str) -> str:
    return f"0{phone[3:6]}•••{phone[-3:]}"
