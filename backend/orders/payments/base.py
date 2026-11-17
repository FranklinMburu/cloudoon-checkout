from dataclasses import dataclass


class PaymentDeclinedError(Exception):
    """The provider refused the payment; no money was taken. The message is shown to the customer."""


class ProviderUnavailableError(Exception):
    """We couldn't get an answer from the provider. The customer can safely retry."""


@dataclass(frozen=True)
class Charge:
    reference: str  # the provider's id for this payment, e.g. a Stripe PaymentIntent id
    label: str  # how the receipt describes it, e.g. "Visa ending 4242"
    pending: bool = False  # True while we wait for the customer to approve (M-Pesa)
