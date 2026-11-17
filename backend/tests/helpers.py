import uuid

VISA = {"method": "card", "payment_method": "pm_card_visa", "brand": "visa", "last4": "4242"}
DECLINED_CARD = {"method": "card", "payment_method": "pm_card_chargeDeclined", "brand": "visa", "last4": "0002"}


def order_payload(cart, payment=None):
    return {
        "cart": cart,
        "billing": {
            "full_name": "Amina Wanjiru",
            "email": "amina@example.com",
            "phone": "+254 712 345 678",
            "country": "KE",
            "address": "Westlands Road",
            "city": "Nairobi",
            "postal_code": "00800",
        },
        "payment": payment or VISA,
        "accept_terms": True,
    }


def post_order(api, payload, key=None):
    return api.post("/api/v1/orders/", payload, format="json", HTTP_IDEMPOTENCY_KEY=key or uuid.uuid4().hex)


def sign_in(api, email="demo@cloudoon.com", password="Demo1234!"):
    token = api.post("/api/v1/auth/login/", {"email": email, "password": password}, format="json").json()["token"]
    api.credentials(HTTP_AUTHORIZATION=f"Token {token}")
