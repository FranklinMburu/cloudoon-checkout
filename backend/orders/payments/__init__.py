"""Payment providers. `charge()` is the only entry point the order service needs.

Each provider is switched on by its API keys in the environment, and the checkout
offers only the methods that are configured (`enabled_methods()`).

- card:   Stripe PaymentIntents. Stripe.js turns the card into a PaymentMethod in the
          browser, so card numbers never reach our servers.
- mpesa:  Safaricom Daraja M-Pesa Express (STK push). The customer approves on their
          phone and Safaricom confirms later, so the order waits as `pending`.
- paypal: PayPal Orders v2. The customer approves in PayPal's window; we capture.
"""

from decimal import Decimal

from orders.payments import card, mpesa, paypal
from orders.payments.base import Charge, PaymentDeclinedError, ProviderUnavailableError

__all__ = ["Charge", "PaymentDeclinedError", "ProviderUnavailableError", "charge", "enabled_methods"]

PROVIDERS = {"card": card, "mpesa": mpesa, "paypal": paypal}


def enabled_methods() -> list[str]:
    return [name for name, provider in PROVIDERS.items() if provider.is_configured()]


def charge(method: str, details: dict, amount: Decimal, currency: str, *, order_number: str, key: str) -> Charge:
    """Take `amount` once. `key` is passed on so a retried request can't charge twice."""
    provider = PROVIDERS.get(method)
    if provider is None or not provider.is_configured():
        raise PaymentDeclinedError("This payment method isn’t available. Choose another one.")
    return provider.charge(details, amount, currency, order_number=order_number, key=key)
