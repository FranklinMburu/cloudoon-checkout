"""Card payments with Stripe.

The browser collects the card with Stripe Elements and sends us only a PaymentMethod
id (`pm_...`). We create and confirm a PaymentIntent for the server-calculated total.
Cards that need 3-D Secure are declined with a clear message rather than left
half-finished (`error_on_requires_action`).
"""

from decimal import Decimal

import stripe
from django.conf import settings

from orders.payments.base import Charge, PaymentDeclinedError, ProviderUnavailableError

DECLINE_MESSAGES = {
    "insufficient_funds": "This card doesn’t have enough funds. No money was taken. Try another card.",
    "expired_card": "This card has expired. Try another card.",
    "incorrect_cvc": "The security code (CVC) is wrong. Check it and try again.",
    "authentication_required": "This card needs a 3-D Secure check, which we can’t do yet. Try another card.",
}
DEFAULT_DECLINE = "Your bank declined this card. No money was taken. Try another card or pay another way."


def is_configured() -> bool:
    return bool(settings.STRIPE_SECRET_KEY and settings.STRIPE_PUBLISHABLE_KEY)


def charge(details: dict, amount: Decimal, currency: str, *, order_number: str, key: str) -> Charge:
    payment_method = str(details.get("payment_method", ""))
    if not payment_method.startswith("pm_"):
        raise PaymentDeclinedError("We couldn’t read this card. Check the details and try again.")

    try:
        intent = stripe.PaymentIntent.create(
            api_key=settings.STRIPE_SECRET_KEY,
            amount=int(amount * 100),  # Stripe counts in cents; all our currencies have two decimals there
            currency=currency.lower(),
            payment_method=payment_method,
            payment_method_types=["card"],
            confirm=True,
            error_on_requires_action=True,
            description=f"Cloudoon order {order_number}",
            metadata={"order": order_number},
            # Stripe remembers the outcome per key, so a new card must get a new key.
            idempotency_key=f"{key}:{payment_method}",
        )
    except stripe.CardError as exc:
        raise PaymentDeclinedError(DECLINE_MESSAGES.get(exc.code or "", DEFAULT_DECLINE)) from exc
    except stripe.StripeError as exc:
        raise ProviderUnavailableError("Card payments are unavailable right now.") from exc

    if intent.status != "succeeded":
        raise PaymentDeclinedError(DEFAULT_DECLINE)
    return Charge(reference=intent.id, label=_label(details))


def _label(details: dict) -> str:
    """Brand and last 4 come from Stripe.js in the browser; they're for the receipt only."""
    brand = str(details.get("brand") or "Card").title()
    last4 = "".join(ch for ch in str(details.get("last4") or "") if ch.isdigit())[-4:]
    return f"{brand} ending {last4}" if last4 else brand
