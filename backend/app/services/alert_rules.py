from __future__ import annotations

from dataclasses import dataclass
from typing import Any


DEFAULT_THRESHOLDS = {
    "dau_relative_drop": 20.0,
    "retention_relative_drop": 25.0,
    "retention_point_drop": 10.0,
    "onboarding_point_drop": 10.0,
    "level_dropoff_point_increase": 15.0,
    "churn_relative_increase": 100.0,
}


@dataclass(frozen=True)
class Alert:
    code: str
    metric: str
    severity: str
    message: str
    current: float
    previous: float
    change: float
    change_type: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "code": self.code,
            "metric": self.metric,
            "severity": self.severity,
            "message": self.message,
            "current": self.current,
            "previous": self.previous,
            "change": self.change,
            "change_type": self.change_type,
        }


def relative_change(current: float, previous: float) -> float:
    if previous == 0:
        return 0.0 if current == 0 else 100.0
    return ((current - previous) / abs(previous)) * 100


def point_change(current: float, previous: float) -> float:
    return current - previous


def evaluate_core_alerts(
    current: dict[str, float],
    previous: dict[str, float],
    thresholds: dict[str, float] | None = None,
) -> list[dict[str, Any]]:
    limits = {**DEFAULT_THRESHOLDS, **(thresholds or {})}
    alerts: list[Alert] = []

    dau_now = current.get("dau")
    dau_prev = previous.get("dau")
    if dau_now is not None and dau_prev is not None:
        change = relative_change(dau_now, dau_prev)
        if change <= -limits["dau_relative_drop"]:
            alerts.append(
                Alert(
                    code="DAU_DROP",
                    metric="dau",
                    severity="warning",
                    message="DAU dropped materially compared with the previous comparable period.",
                    current=dau_now,
                    previous=dau_prev,
                    change=round(change, 2),
                    change_type="relative_percent",
                )
            )

    for metric in ("day1_retention", "day7_retention", "rolling_day7_retention"):
        now = current.get(metric)
        prev = previous.get(metric)
        if now is None or prev is None:
            continue
        rel = relative_change(now, prev)
        pts = point_change(now, prev)
        if rel <= -limits["retention_relative_drop"] or pts <= -limits["retention_point_drop"]:
            alerts.append(
                Alert(
                    code="RETENTION_DROP",
                    metric=metric,
                    severity="critical",
                    message=f"{metric} dropped beyond the configured retention threshold.",
                    current=now,
                    previous=prev,
                    change=round(pts, 2),
                    change_type="percentage_points",
                )
            )

    now = current.get("onboarding_completion_rate")
    prev = previous.get("onboarding_completion_rate")
    if now is not None and prev is not None:
        pts = point_change(now, prev)
        if pts <= -limits["onboarding_point_drop"]:
            alerts.append(
                Alert(
                    code="ONBOARDING_COMPLETION_DROP",
                    metric="onboarding_completion_rate",
                    severity="warning",
                    message="Onboarding completion rate dropped beyond the configured threshold.",
                    current=now,
                    previous=prev,
                    change=round(pts, 2),
                    change_type="percentage_points",
                )
            )

    now = current.get("level_dropoff_rate")
    prev = previous.get("level_dropoff_rate")
    if now is not None and prev is not None:
        pts = point_change(now, prev)
        if pts >= limits["level_dropoff_point_increase"]:
            alerts.append(
                Alert(
                    code="LEVEL_DROPOFF_SPIKE",
                    metric="level_dropoff_rate",
                    severity="warning",
                    message="Level drop-off increased beyond the configured threshold.",
                    current=now,
                    previous=prev,
                    change=round(pts, 2),
                    change_type="percentage_points",
                )
            )

    for metric in ("uninstalls", "churn_proxy"):
        now = current.get(metric)
        prev = previous.get(metric)
        if now is None or prev is None:
            continue
        change = relative_change(now, prev)
        if change >= limits["churn_relative_increase"]:
            alerts.append(
                Alert(
                    code="CHURN_SPIKE",
                    metric=metric,
                    severity="critical",
                    message=f"{metric} increased sharply compared with baseline.",
                    current=now,
                    previous=prev,
                    change=round(change, 2),
                    change_type="relative_percent",
                )
            )

    return [alert.to_dict() for alert in alerts]
