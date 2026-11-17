"""Which websites may use this API from a browser (the same list CORS uses)."""

import re

from django.conf import settings


def is_allowed_origin(origin: str) -> bool:
    if origin in settings.CORS_ALLOWED_ORIGINS:
        return True
    return any(re.fullmatch(pattern, origin) for pattern in settings.CORS_ALLOWED_ORIGIN_REGEXES)
