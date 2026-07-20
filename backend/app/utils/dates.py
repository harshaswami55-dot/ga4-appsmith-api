import re
from datetime import date, timedelta


RELATIVE_DATE_PATTERN = re.compile(r"^(today|yesterday|\d+daysAgo)$")


def validate_ga4_date(value: str) -> str:
    value = value.strip()
    if RELATIVE_DATE_PATTERN.fullmatch(value):
        return value
    try:
        date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError("Use YYYY-MM-DD, today, yesterday, or NdaysAgo") from exc
    return value


def resolve_ga4_date(value: str, *, today: date | None = None) -> date:
    anchor = today or date.today()
    if value == "today":
        return anchor
    if value == "yesterday":
        return anchor - timedelta(days=1)
    match = re.fullmatch(r"(\d+)daysAgo", value)
    if match:
        return anchor - timedelta(days=int(match.group(1)))
    return date.fromisoformat(value)


def thirty_day_window_ending(end_date: str) -> tuple[str, str]:
    end = resolve_ga4_date(end_date)
    return (end - timedelta(days=29)).isoformat(), end.isoformat()

