"""Domain search: turn what the customer typed into a name, then ask the registries."""

import re
from concurrent.futures import ThreadPoolExecutor

from domains import registry
from pricing.catalog import Catalog

DEFAULT_TLD = ".com"
LABEL_RE = re.compile(r"^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$")


class InvalidDomainQueryError(ValueError):
    """The search text can't be turned into a domain name."""


class DomainLookupUnavailableError(Exception):
    """The registry for the searched name couldn't be reached."""


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

    names = [label + tld] + [label + extension for extension in catalog.tlds if extension != tld]
    with ThreadPoolExecutor(max_workers=len(names)) as pool:
        answers = dict(zip(names, pool.map(_registered_or_none, names), strict=True))

    exact = label + tld
    if answers[exact] is None:
        raise DomainLookupUnavailableError(f"We couldn’t reach the registry for {tld} just now. Try again in a moment.")

    def result(name: str) -> dict:
        return {"name": name, "tld": name[len(label) :], "available": not answers[name]}

    # A suggestion whose registry didn't answer is left out rather than guessed.
    return {"exact": result(exact), "suggestions": [result(n) for n in names[1:] if answers[n] is not None]}


def _registered_or_none(name: str) -> bool | None:
    try:
        return registry.is_registered(name)
    except registry.RegistryUnavailableError:
        return None
