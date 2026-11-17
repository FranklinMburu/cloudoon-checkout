"""Address suggestions from Photon, an OpenStreetMap geocoder built for search-as-you-type.

The browser calls our endpoint rather than Photon directly, so we can cache answers,
rate-limit per customer and swap provider (Google Places, Mapbox) in one place.
"""

import requests
from django.core.cache import caches

PHOTON_URL = "https://photon.komoot.io/api/"
USER_AGENT = "CloudoonCheckout/1.0 (+https://cloudoon-checkout.onrender.com)"
TIMEOUT_SECONDS = 4
CACHE_SECONDS = 24 * 60 * 60
MIN_QUERY_LENGTH = 3

cache = caches["lookups"]


class AddressLookupUnavailableError(Exception):
    """Photon didn't answer; the customer can still type the address by hand."""


def search(query: str, country: str = "", limit: int = 5) -> list[dict]:
    query = " ".join(query.split())
    if len(query) < MIN_QUERY_LENGTH:
        return []

    key = f"address:{country}:{query.lower()}"
    if (cached := cache.get(key)) is not None:
        return cached

    try:
        # Ask for extra results: some are places without a street, which we skip.
        response = requests.get(
            PHOTON_URL,
            params={"q": query, "limit": limit * 3, "lang": "en"},
            headers={"User-Agent": USER_AGENT},
            timeout=TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        features = response.json()["features"]
    except (requests.RequestException, ValueError, KeyError) as exc:
        raise AddressLookupUnavailableError from exc

    results = []
    for feature in features:
        address = _to_address(feature.get("properties", {}))
        if address and address not in results:
            results.append(address)
    # Addresses in the customer's billing country first.
    results = sorted(results, key=lambda address: address["country"] != country)[:limit]
    cache.set(key, results, CACHE_SECONDS)
    return results


def _to_address(place: dict) -> dict | None:
    street = " ".join(part for part in (place.get("housenumber"), place.get("street")) if part)
    name = place.get("name")
    line = ", ".join(part for part in (street, name) if part and part != street)
    city = place.get("city") or place.get("town") or place.get("village") or place.get("county")
    if not line or not city or not place.get("countrycode"):
        return None
    return {
        "line": line,
        "city": city,
        "postal_code": place.get("postcode", ""),
        "country": place["countrycode"].upper(),
    }
