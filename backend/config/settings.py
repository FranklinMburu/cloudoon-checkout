"""Django settings, configured from environment variables (12-factor).

Local development uses the defaults below with the PostgreSQL from docker-compose.
Production (Render) sets DEBUG=False, SECRET_KEY, DATABASE_URL and ALLOWED_HOSTS.
"""

import os
from pathlib import Path

import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent


def env_list(name: str, default: str = "") -> list[str]:
    return [item.strip() for item in os.environ.get(name, default).split(",") if item.strip()]


# Fail closed: production is the default; local development sets DEBUG=True.
DEBUG = os.environ.get("DEBUG", "False").lower() == "true"
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-insecure-key-change-me" if DEBUG else "")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY must be set when DEBUG is False")

ALLOWED_HOSTS = env_list("ALLOWED_HOSTS", "localhost,127.0.0.1")
if render_host := os.environ.get("RENDER_EXTERNAL_HOSTNAME"):
    ALLOWED_HOSTS.append(render_host)

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework.authtoken",
    "catalog",
    "pricing",
    "domains",
    "accounts",
    "orders",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

DATABASES = {
    "default": dj_database_url.config(
        default="postgres://cloudoon:cloudoon@localhost:5432/cloudoon",
        conn_max_age=600,
    )
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Nairobi"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CACHES = {
    # Throttle counters must be shared by all gunicorn workers, so production keeps them in the database.
    "default": (
        {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}
        if DEBUG
        else {"BACKEND": "django.core.cache.backends.db.DatabaseCache", "LOCATION": "django_cache"}
    ),
    # Answers from outside services (registries, address search); fine to keep per process.
    "lookups": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache", "LOCATION": "lookups"},
}

# --- API ---------------------------------------------------------------------

REST_FRAMEWORK = {
    # Token auth in the Authorization header: works across origins (the frontend is
    # hosted separately) without third-party cookies.
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.TokenAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.ScopedRateThrottle"],
    "DEFAULT_THROTTLE_RATES": {
        "auth": "20/min",
        "lookup": "60/min",
        "orders": "20/min",
        "oauth-poll": "120/min",
    },
}
if DEBUG:
    REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"].append("rest_framework.renderers.BrowsableAPIRenderer")

# CORS: the frontend runs on another origin (AI Studio, Render static site, localhost).
CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173")
CORS_ALLOWED_ORIGIN_REGEXES = env_list("CORS_ALLOWED_ORIGIN_REGEXES")
CORS_ALLOW_ALL_ORIGINS = os.environ.get("CORS_ALLOW_ALL_ORIGINS", "False").lower() == "true"
CORS_ALLOW_HEADERS = ["accept", "authorization", "content-type", "idempotency-key"]

# --- Security (production) ----------------------------------------------------

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30
    SECURE_CONTENT_TYPE_NOSNIFF = True

# --- Integrations -------------------------------------------------------------
# Each is switched on by its keys; the checkout only offers what is configured.

# Public address of this API (for callback URLs). Render sets RENDER_EXTERNAL_URL.
PUBLIC_API_URL = os.environ.get("PUBLIC_API_URL") or os.environ.get("RENDER_EXTERNAL_URL", "http://localhost:8000")

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GITHUB_CLIENT_ID = os.environ.get("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.environ.get("GITHUB_CLIENT_SECRET", "")

STRIPE_PUBLISHABLE_KEY = os.environ.get("STRIPE_PUBLISHABLE_KEY", "")
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")

# Daraja sandbox by default; the shortcode and passkey below are Safaricom's public test values.
MPESA_BASE_URL = os.environ.get("MPESA_BASE_URL", "https://sandbox.safaricom.co.ke")
MPESA_CONSUMER_KEY = os.environ.get("MPESA_CONSUMER_KEY", "")
MPESA_CONSUMER_SECRET = os.environ.get("MPESA_CONSUMER_SECRET", "")
MPESA_SHORTCODE = os.environ.get("MPESA_SHORTCODE", "174379")
MPESA_PASSKEY = os.environ.get("MPESA_PASSKEY", "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919")

PAYPAL_BASE_URL = os.environ.get("PAYPAL_BASE_URL", "https://api-m.sandbox.paypal.com")
PAYPAL_CLIENT_ID = os.environ.get("PAYPAL_CLIENT_ID", "")
PAYPAL_CLIENT_SECRET = os.environ.get("PAYPAL_CLIENT_SECRET", "")

# --- App settings -------------------------------------------------------------

NAMESERVERS = ["ns1.cloudoon.com", "ns2.cloudoon.com"]
DEMO_USER_EMAIL = "demo@cloudoon.com"
DEMO_USER_PASSWORD = os.environ.get("DEMO_USER_PASSWORD", "Demo1234!")
