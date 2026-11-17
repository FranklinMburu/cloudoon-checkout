"""Domain availability.

SIMULATED registry: a real deployment would call the registrar's API (e.g. an EPP
`check` command) or RDAP. This stand-in is deterministic so demos and tests behave
the same every time: well-known brands and roughly one in four other names are taken.
"""

import re

from pricing.catalog import Catalog

DEFAULT_TLD = ".com"
TAKEN_LABELS = {"google", "facebook", "amazon", "cloudoon", "safaricom", "microsoft", "apple", "test", "shop"}
TLDS_STILL_FREE_FOR_BRANDS = {".africa", ".store"}
LABEL_RE = re.compile(r"^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$")


class InvalidDomainQueryError(ValueError):
    """The search text can't be turned into a domain name."""


def is_available(label: str, tld: str) -> bool:
    if label in TAKEN_LABELS:
        return tld in TLDS_STILL_FREE_FOR_BRANDS
    return _stable_hash(label + tld) % 4 != 0


def normalize(query: str) -> str:
    """'https://www.Brand.com/about' → 'brand.com'."""
    text = query.strip().lower()
    text = re.sub(r"^https?://", "", text)
    text = re.sub(r"^www\.", "", text)
    return text.split("/")[0]


def check(catalog: Catalog, query: str) -> dict:
    """Availability of the searched name plus the same name on every other extension we sell."""
    name = normalize(query)
    tld = catalog.tld_of(name)
    label = name[: -len(tld)] if tld else name.split(".")[0]
    tld = tld or DEFAULT_TLD

    if len(label) < 2:
        raise InvalidDomainQueryError("Use at least 2 characters.")
    if not LABEL_RE.match(label):
        raise InvalidDomainQueryError("Use letters, numbers and hyphens only, and don’t start or end with a hyphen.")

    def result(extension: str) -> dict:
        return {"name": label + extension, "tld": extension, "available": is_available(label, extension)}

    return {
        "exact": result(tld),
        "suggestions": [result(extension) for extension in catalog.tlds if extension != tld],
        "simulated": True,
    }


def _stable_hash(text: str) -> int:
    """Same result on every run and machine (unlike Python's salted `hash()`)."""
    value = 0
    for char in text:
        value = (value * 31 + ord(char)) % 2**32
    return value
