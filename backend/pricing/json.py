"""Money must leave the API as exact strings ("86.28"), never as floats."""

from decimal import Decimal
from typing import Any


def to_json(value: Any) -> Any:
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, dict):
        return {k: to_json(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [to_json(v) for v in value]
    if isinstance(value, (set, frozenset)):
        return sorted(to_json(v) for v in value)
    return value
