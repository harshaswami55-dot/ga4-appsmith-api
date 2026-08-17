from __future__ import annotations

from dataclasses import dataclass
from statistics import mean
from typing import Any

from app.schemas.filters import DashboardFilters
from app.services.ga4_service import GA4Service


PREDICTION_METRICS = {
    "activeUsers": "active_users",
    "newUsers": "new_users",
    "sessions": "sessions",
    "screenPageViews": "screen_views",
}


@dataclass(frozen=True)
class Forecast:
    metric: str
    current: float
    forecast_next_period: float
    trend_per_day: float
    change_pct: float
    confidence: str
    risk: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "metric": self.metric,
            "current": round(self.current, 2),
            "forecast_next_period": round(max(self.forecast_next_period, 0), 2),
            "trend_per_day": round(self.trend_per_day, 2),
            "change_pct": round(self.change_pct, 2),
            "confidence": self.confidence,
            "risk": self.risk,
        }


class PredictionService:
    def __init__(self, ga4: GA4Service):
        self.ga4 = ga4

    def dashboard(self, filters: DashboardFilters) -> dict[str, Any]:
        rows = self.ga4.run_report(
            filters=filters,
            dimensions=["date"],
            metrics=list(PREDICTION_METRICS),
            order_bys=[{"dimension": {"dimension_name": "date"}}],
        )
        forecasts = [
            self._forecast(label, rows, metric).to_dict()
            for metric, label in PREDICTION_METRICS.items()
        ]
        return {
            "methodology": (
                "Short-term baseline forecast using the selected GA4 daily trend. "
                "Confidence is based on available history length and day-to-day volatility."
            ),
            "history_days": len(rows),
            "forecast_horizon_days": max(len(rows), 1),
            "forecasts": forecasts,
            "limitations": [
                "This is baseline trend forecasting, not a trained ML model.",
                "Confidence improves after several stable weeks of production history.",
                "Forecasts should be reviewed with alerts and retention movement before action.",
            ],
        }

    @staticmethod
    def _forecast(label: str, rows: list[dict[str, Any]], metric: str) -> Forecast:
        values = [_number(row.get(metric)) for row in rows]
        if not values:
            return Forecast(label, 0, 0, 0, 0, "low", "unknown")

        current = values[-1]
        horizon = len(values)
        trend = _linear_trend(values)
        forecast = current + (trend * horizon)
        change_pct = _relative_change(forecast, current)
        confidence = _confidence(values)
        risk = _risk(label, change_pct, confidence)
        return Forecast(label, current, forecast, trend, change_pct, confidence, risk)


def _number(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _linear_trend(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    x_mean = (len(values) - 1) / 2
    y_mean = mean(values)
    numerator = sum((index - x_mean) * (value - y_mean) for index, value in enumerate(values))
    denominator = sum((index - x_mean) ** 2 for index in range(len(values)))
    return numerator / denominator if denominator else 0.0


def _relative_change(current: float, previous: float) -> float:
    if previous == 0:
        return 0.0 if current == 0 else 100.0
    return ((current - previous) / abs(previous)) * 100


def _confidence(values: list[float]) -> str:
    if len(values) < 14:
        return "low"
    avg = mean(values)
    if avg == 0:
        return "low"
    volatility = mean(abs(value - avg) for value in values) / avg
    if len(values) >= 30 and volatility <= 0.25:
        return "high"
    if volatility <= 0.45:
        return "medium"
    return "low"


def _risk(label: str, change_pct: float, confidence: str) -> str:
    if confidence == "low":
        return "watch"
    if change_pct <= -20:
        return "high"
    if change_pct <= -10:
        return "medium"
    if label in {"sessions", "screen_views"} and change_pct >= 40:
        return "review-spike"
    return "normal"
