"""Payment gateway adapter.

SIMULATED. Production would use the provider's server SDK here:
  - card:   Stripe PaymentIntents with a token created in the browser by Stripe.js,
            so the card number never touches our servers (keeps us out of PCI scope);
  - mpesa:  Safaricom Daraja STK push, then wait for the callback;
  - paypal: PayPal Orders API (create → approve → capture).
The test tokens mirror Stripe's: `tok_visa` succeeds, `tok_chargeDeclined` is declined.
"""

import re
import uuid
from dataclasses import dataclass
from decimal import Decimal


class PaymentDeclined(Exception):
    pass


@dataclass
class Charge:
    reference: str
    label: str


def charge(method: str, details: dict, amount: Decimal, currency: str) -> Charge:
    reference = f"sim_{uuid.uuid4().hex[:16]}"
    if method == "card":
        token = details.get("token", "")
        if token == "tok_chargeDeclined":
            raise PaymentDeclined("Your bank declined this card. No money was taken. Try another card or pay with M-Pesa or PayPal.")
        if not token.startswith("tok_"):
            raise PaymentDeclined("We couldn’t read this card. Check the details and try again.")
        brand = details.get("brand") or "Card"
        last4 = re.sub(r"\D", "", str(details.get("last4", "")))[-4:]
        return Charge(reference, f"{brand} ending {last4}" if last4 else brand)
    if method == "mpesa":
        phone = re.sub(r"\D", "", str(details.get("phone", "")))
        if not re.fullmatch(r"(?:254|0)?(7|1)\d{8}", phone):
            raise PaymentDeclined("Enter a Safaricom number like 0712 345 678.")
        return Charge(reference, f"M-Pesa {details.get('phone')}")
    if method == "paypal":
        return Charge(reference, "PayPal")
    raise PaymentDeclined("Choose a payment method.")
