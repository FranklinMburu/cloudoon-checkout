"""Placing an order: re-price on the server, reserve, charge, confirm.

The order row is written *before* the payment is attempted, inside one transaction:

1. Insert a `pending` order whose `idempotency_key` is unique. A second request with
   the same key blocks on that unique index until the first transaction finishes,
   so two identical requests can never both reach the payment step.
2. Charge the customer (the key is passed to the provider too, so it can
   de-duplicate on its side as well).
3. Mark the order `paid` and commit. A declined payment raises, which rolls the
   reservation back, so the customer can retry with the same key.

M-Pesa is the exception to step 3: the customer approves on their phone, so the
order is committed as `pending` and settled later by Safaricom's callback, or by
`refresh_payment()` when the checkout polls with the same key.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from django.core.cache import cache
from django.db import IntegrityError, transaction

from domains import registry
from orders import payments
from orders.models import Order, OrderItem
from orders.payments import mpesa, paypal
from pricing.engine import Cart, PricingError, build_quote
from pricing.loader import load_catalog

BILLING_FIELDS = ("full_name", "phone", "country", "address", "city", "postal_code", "company", "tax_id")
MPESA_CHECK_INTERVAL_SECONDS = 10  # Daraja rate-limits status queries


@dataclass
class OrderError(Exception):
    """A request that can't become an order. Views turn it into an HTTP error response."""

    detail: str
    status_code: int = 400
    field: str | None = None


def place_order(*, idempotency_key: str, user, cart: dict[str, Any], billing: dict[str, Any], payment: dict[str, Any]):
    """Returns `(order, created)`. `created` is False when this key was used before."""
    if existing := Order.objects.filter(idempotency_key=idempotency_key).first():
        refresh_payment(existing)
        existing.refresh_from_db()
        return existing, False

    quote = _price(cart)
    _confirm_domains_still_free(cart)
    try:
        with transaction.atomic():
            order = _reserve(idempotency_key, user, quote, billing, payment["method"])
            charge = payments.charge(
                payment["method"],
                payment,
                quote["total"],
                quote["currency"],
                order_number=order.number,
                key=idempotency_key,
            )
            order.payment_label = charge.label
            order.payment_reference = charge.reference
            if not charge.pending:
                order.status = Order.Status.PAID
            order.save(update_fields=["status", "payment_label", "payment_reference"])
    except payments.PaymentDeclinedError as exc:
        raise OrderError(str(exc), status_code=402, field="payment") from exc
    except payments.ProviderUnavailableError as exc:
        raise OrderError(
            f"{exc} You haven’t been charged. Try again in a moment.", status_code=503, field="payment"
        ) from exc
    except IntegrityError:
        # Another request with this key finished first: return its order instead of charging again.
        if existing := Order.objects.filter(idempotency_key=idempotency_key).first():
            return existing, False
        raise
    return order, True


def start_paypal_payment(cart: dict[str, Any]) -> str:
    """Create the PayPal order the customer approves, for the server-priced total."""
    quote = _price(cart)
    try:
        return paypal.create_order(quote["total"], quote["currency"], "Cloudoon hosting order")
    except payments.PaymentDeclinedError as exc:
        raise OrderError(str(exc), status_code=400, field="payment") from exc
    except payments.ProviderUnavailableError as exc:
        raise OrderError(str(exc), status_code=503, field="payment") from exc


def refresh_payment(order: Order) -> None:
    """Ask Safaricom about an M-Pesa payment we haven't heard back about yet."""
    if order.status != Order.Status.PENDING or order.payment_method != "mpesa" or not order.payment_reference:
        return
    if not cache.add(f"mpesa-check:{order.pk}", True, MPESA_CHECK_INTERVAL_SECONDS):
        return
    result, message = mpesa.check(order.payment_reference)
    settle_mpesa(order.payment_reference, result, message)


def settle_mpesa(checkout_request_id: str, result: str, message: str = "", receipt: str = "") -> None:
    """Record how an M-Pesa request ended. Safe to call twice (callback and polling can race)."""
    if result == "pending":
        return
    with transaction.atomic():
        order = (
            Order.objects.select_for_update()
            .filter(payment_method="mpesa", payment_reference=checkout_request_id, status=Order.Status.PENDING)
            .first()
        )
        if order is None:
            return
        if result == "paid":
            order.status = Order.Status.PAID
            if receipt:
                order.payment_label = f"{order.payment_label} · receipt {receipt}"[:80]
        else:
            order.status = Order.Status.FAILED
            order.payment_error = message[:200]
        order.save(update_fields=["status", "payment_label", "payment_error"])


def _confirm_domains_still_free(cart: dict[str, Any]) -> None:
    """Someone may have registered a name since the customer searched for it."""
    for domain in cart.get("domains", []):
        if domain.get("mode") != "register":
            continue
        try:
            taken = registry.is_registered(domain["name"])
        except registry.RegistryUnavailableError:
            continue  # the registrar has the final word at registration time
        if taken:
            raise OrderError(
                f"{domain['name']} was just registered by someone else. Remove it or choose another name.",
                status_code=409,
                field="cart.domains",
            )


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
