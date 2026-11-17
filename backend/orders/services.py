"""Placing an order: re-price on the server, reserve, charge, confirm.

The order row is written *before* the payment is attempted, inside one transaction:

1. Insert a `pending` order whose `idempotency_key` is unique. A second request with
   the same key blocks on that unique index until the first transaction finishes,
   so two identical requests can never both reach the payment step.
2. Charge the customer (the key is passed to the gateway too, so the provider can
   de-duplicate on its side as well).
3. Mark the order `paid` and commit. A declined payment raises, which rolls the
   reservation back, so the customer can retry with the same key.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from django.db import IntegrityError, transaction

from orders import payments
from orders.models import Order, OrderItem
from pricing.engine import Cart, PricingError, build_quote
from pricing.loader import load_catalog

BILLING_FIELDS = ("full_name", "phone", "country", "address", "city", "postal_code", "company", "tax_id")


@dataclass
class OrderError(Exception):
    """A request that can't become an order. Views turn it into an HTTP error response."""

    detail: str
    status_code: int = 400
    field: str | None = None


def place_order(*, idempotency_key: str, user, cart: dict[str, Any], billing: dict[str, Any], payment: dict[str, Any]):
    """Returns `(order, created)`. `created` is False when the key was already used for a paid order."""
    if existing := Order.objects.filter(idempotency_key=idempotency_key, status=Order.Status.PAID).first():
        return existing, False

    quote = _price(cart)
    try:
        with transaction.atomic():
            order = _reserve(idempotency_key, user, quote, billing, payment["method"])
            charge = payments.charge(payment["method"], payment, quote["total"], quote["currency"], idempotency_key)
            order.status = Order.Status.PAID
            order.payment_label = charge.label
            order.payment_reference = charge.reference
            order.save(update_fields=["status", "payment_label", "payment_reference"])
    except payments.PaymentDeclinedError as exc:
        raise OrderError(str(exc), status_code=402, field="payment") from exc
    except IntegrityError:
        # Another request with this key finished first: return its order instead of charging again.
        if existing := Order.objects.filter(idempotency_key=idempotency_key).first():
            return existing, False
        raise
    return order, True


def _price(cart: dict[str, Any]) -> dict[str, Any]:
    """The client's total is never trusted: price the cart again from the catalog."""
    try:
        quote = build_quote(load_catalog(), Cart.from_dict(cart))
    except PricingError as exc:
        raise OrderError(exc.message, field=f"cart.{exc.field}") from exc
    if cart.get("promo_code") and quote["promo_error"]:
        raise OrderError(quote["promo_error"], field="cart.promo_code")
    return quote


def _reserve(idempotency_key: str, user, quote: dict[str, Any], billing: dict[str, Any], method: str) -> Order:
    promo = quote["promo"]
    order = Order.objects.create(
        idempotency_key=idempotency_key,
        user=user,
        email=user.email if user else billing["email"],
        status=Order.Status.PENDING,
        currency=quote["currency"],
        cycle_months=quote["cycle"],
        subtotal=quote["subtotal"],
        discount=promo["amount"] if promo else 0,
        promo_code=promo["code"] if promo else "",
        tax=quote["tax"],
        tax_label=quote["tax_label"],
        total=quote["total"],
        payment_method=method,
        **{name: billing[name] for name in BILLING_FIELDS},
    )
    OrderItem.objects.bulk_create([_item(order, line) for line in quote["lines"]])
    return order


def _item(order: Order, line: dict[str, Any]) -> OrderItem:
    renewal = line["renewal"]
    return OrderItem(
        order=order,
        line_id=line["id"],
        kind=line["kind"],
        title=line["title"],
        details=line["details"],
        term_label=line["term_label"],
        due_today=line["due_today"],
        regular_price=line["regular_price"],
        renewal_amount=renewal["amount"] if renewal else None,
        renewal_label=renewal["label"] if renewal else "",
        auto_renew=line["auto_renew"],
    )
