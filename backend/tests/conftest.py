"""Shared fixtures for the API tests. Outside services are replaced at their boundary,
so tests never use the network. (The pure engine tests need none of this.)"""

from types import SimpleNamespace

import pytest
from django.core.cache import cache, caches
from django.core.management import call_command
from rest_framework.test import APIClient

TAKEN_DOMAINS = {"google.com", "google.io", "taken.co.ke"}


@pytest.fixture
def seeded(db):
    cache.clear()  # throttle counters live in the cache; start every test fresh
    caches["lookups"].clear()
    call_command("seed")


@pytest.fixture
def integrations(settings, monkeypatch):
    """Every provider 'configured' with test keys; the registry and Stripe answer from memory."""
    import stripe

    settings.STRIPE_PUBLISHABLE_KEY, settings.STRIPE_SECRET_KEY = "pk_test_x", "sk_test_x"
    settings.MPESA_CONSUMER_KEY, settings.MPESA_CONSUMER_SECRET = "key", "secret"
    settings.PAYPAL_CLIENT_ID, settings.PAYPAL_CLIENT_SECRET = "paypal-id", "paypal-secret"
    settings.GOOGLE_CLIENT_ID, settings.GOOGLE_CLIENT_SECRET = "google-id", "google-secret"
    settings.GITHUB_CLIENT_ID, settings.GITHUB_CLIENT_SECRET = "github-id", "github-secret"

    monkeypatch.setattr("domains.registry.is_registered", lambda name: name in TAKEN_DOMAINS)

    def create_payment_intent(**kwargs):
        if kwargs["payment_method"] == "pm_card_chargeDeclined":
            raise stripe.CardError("Your card was declined.", None, "card_declined")
        stripe_calls.append(kwargs)
        return SimpleNamespace(id=f"pi_test_{len(stripe_calls)}", status="succeeded")

    stripe_calls: list[dict] = []
    monkeypatch.setattr(stripe.PaymentIntent, "create", create_payment_intent)
    return SimpleNamespace(stripe_calls=stripe_calls)


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def cart(api):
    return api.get("/api/v1/catalog/").json()["default_cart"]
