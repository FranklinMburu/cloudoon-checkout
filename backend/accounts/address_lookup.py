"""Address autocomplete.

SIMULATED provider: production would proxy Google Places Autocomplete or Mapbox
through this endpoint, so the API key never reaches the browser.
"""

ADDRESSES = [
    {"line": "Westlands Road, The Mirage Tower 2", "city": "Nairobi", "postal_code": "00800", "country": "KE"},
    {"line": "Waiyaki Way, ABC Place", "city": "Nairobi", "postal_code": "00800", "country": "KE"},
    {"line": "Kenyatta Avenue, Kimathi House", "city": "Nairobi", "postal_code": "00100", "country": "KE"},
    {"line": "Ngong Road, Prestige Plaza", "city": "Nairobi", "postal_code": "00505", "country": "KE"},
    {"line": "Mombasa Road, Panari Centre", "city": "Nairobi", "postal_code": "00200", "country": "KE"},
    {"line": "Kimathi Street, Hilton Arcade", "city": "Nairobi", "postal_code": "00100", "country": "KE"},
    {"line": "Moi Avenue, Nkrumah Road Junction", "city": "Mombasa", "postal_code": "80100", "country": "KE"},
    {"line": "Oginga Odinga Street, Mega Plaza", "city": "Kisumu", "postal_code": "40100", "country": "KE"},
    {"line": "Kenyatta Avenue, Nakuru Business Centre", "city": "Nakuru", "postal_code": "20100", "country": "KE"},
    {"line": "Kampala Road, Workers House", "city": "Kampala", "postal_code": "00256", "country": "UG"},
    {"line": "Samora Avenue, PPF Tower", "city": "Dar es Salaam", "postal_code": "11101", "country": "TZ"},
    {"line": "Admiralty Way, Lekki Phase 1", "city": "Lagos", "postal_code": "106104", "country": "NG"},
    {"line": "Long Street 120", "city": "Cape Town", "postal_code": "8001", "country": "ZA"},
    {"line": "221B Baker Street", "city": "London", "postal_code": "NW1 6XE", "country": "GB"},
    {"line": "10 Downing Street", "city": "London", "postal_code": "SW1A 2AA", "country": "GB"},
    {"line": "350 Fifth Avenue", "city": "New York", "postal_code": "10118", "country": "US"},
    {"line": "1600 Amphitheatre Parkway", "city": "Mountain View", "postal_code": "94043", "country": "US"},
    {"line": "Friedrichstraße 43", "city": "Berlin", "postal_code": "10117", "country": "DE"},
    {"line": "Rue de Rivoli 99", "city": "Paris", "postal_code": "75001", "country": "FR"},
    {"line": "Damrak 1", "city": "Amsterdam", "postal_code": "1012 LG", "country": "NL"},
]


def search(query: str, limit: int = 5) -> list[dict]:
    words = query.lower().split()
    if len("".join(words)) < 3:
        return []
    matches = [a for a in ADDRESSES if all(w in f"{a['line']} {a['city']} {a['postal_code']}".lower() for w in words)]
    return matches[:limit]
