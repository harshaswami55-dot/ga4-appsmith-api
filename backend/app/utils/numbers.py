from typing import Any


def number(value: Any) -> int | float:
    if value in (None, ""):
        return 0
    text = str(value)
    try:
        parsed = float(text)
    except (TypeError, ValueError):
        return 0
    return int(parsed) if parsed.is_integer() else parsed


def percent(numerator: float, denominator: float) -> float:
    if not denominator:
        return 0.0
    return round((numerator / denominator) * 100, 2)

