"""Domain availability.

SIMULATED registry: a real deployment would call the registrar's API (e.g. an EPP
`check` command, or RDAP for a quick lookup). This stand-in is deterministic, so
demos and tests behave the same every time: well-known brands and roughly one in
four other names are "taken".
"""

import re

from pricing.engine import Catalog, split_domain

TAKEN = {"google", "facebook", "amazon", "cloudoon", "safaricom", "microsoft", "apple", "test", "shop"}
LABEL_RE = re.compile(r"^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$")


class InvalidDomainQuery(ValueError):
    pass


def _hash(text: str) -> int:
    h = 0
    for ch in text:
        h = (h * 31 + ord(ch)) % 2**32
    return h


def is_available(label: str, tld: str) -> bool:
    if label in TAKEN:
        return tld in {".africa", ".store"}
    return _hash(label + tld) % 4 != 0


def normalize(query: str) -> str:
    q = query.strip().lower()
    q = re.sub(r"^https?://", "", q)
    q = re.sub(r"^www\.", "", q)
    return q.split("/")[0]


def check(catalog: Catalog, query: str) -> dict:
    q = normalize(query)
    label, tld = split_domain(q, catalog)
    if tld is None:
        label, tld = q.split(".")[0], ".com"
    if len(label) < 2:
        raise InvalidDomainQuery("Use at least 2 characters.")
    if not LABEL_RE.match(label):
        raise InvalidDomainQuery("Use letters, numbers and hyphens only, and don’t start or end with a hyphen.")

    def result(t: str) -> dict:
        return {"name": label + t, "tld": t, "available": is_available(label, t)}

    return {"exact": result(tld), "suggestions": [result(t) for t in catalog.tlds if t != tld], "simulated": True}
