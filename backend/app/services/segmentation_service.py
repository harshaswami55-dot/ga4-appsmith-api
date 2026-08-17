from __future__ import annotations

from typing import Any

from app.schemas.filters import DashboardFilters
from app.services.ga4_service import GA4Service


SEGMENT_DIMENSIONS = {
    "country": "country",
    "app_version": "appVersion",
    "os_version": "operatingSystemVersion",
    "device_model": "mobileDeviceModel",
    "channel": "firstUserDefaultChannelGroup",
    "source": "firstUserSource",
    "medium": "firstUserMedium",
    "user_type": "newVsReturning",
}


class SegmentationService:
    def __init__(self, ga4: GA4Service):
        self.ga4 = ga4

    def dashboard(self, filters: DashboardFilters, *, limit: int = 10) -> dict[str, Any]:
        segments: dict[str, list[dict[str, Any]]] = {}
        for key, dimension in SEGMENT_DIMENSIONS.items():
            rows = self.ga4.run_report(
                filters=filters,
                dimensions=[dimension],
                metrics=["activeUsers", "newUsers", "sessions", "screenPageViews", "engagementRate"],
                limit=limit,
            )
            segments[key] = [self._row(dimension, row) for row in rows[:limit]]

        level_segment: list[dict[str, Any]] = []
        if self.ga4.settings.level_dimension:
            rows = self.ga4.run_report(
                filters=filters,
                dimensions=[self.ga4.settings.level_dimension],
                metrics=["eventCount", "activeUsers"],
                limit=limit,
            )
            level_segment = [
                {
                    "level": row.get(self.ga4.settings.level_dimension, "Unknown"),
                    "event_count": row.get("eventCount", 0),
                    "active_users": row.get("activeUsers", 0),
                }
                for row in rows[:limit]
            ]

        return {
            "segments": segments,
            "level_difficulty": level_segment,
            "definitions": {
                "country": "Users grouped by GA4 country dimension.",
                "app_version": "Users grouped by installed app version.",
                "os_version": "Users grouped by operating system version.",
                "device_model": "Users grouped by mobile device model.",
                "channel": "Users grouped by first-user default channel group.",
                "source": "Users grouped by first-user source.",
                "medium": "Users grouped by first-user medium.",
                "user_type": "Users grouped by new versus returning classification.",
                "level_difficulty": "Level activity using the configured GA4 level custom dimension.",
            },
        }

    @staticmethod
    def _row(dimension: str, row: dict[str, Any]) -> dict[str, Any]:
        return {
            "name": row.get(dimension, "Unknown"),
            "active_users": row.get("activeUsers", 0),
            "new_users": row.get("newUsers", 0),
            "sessions": row.get("sessions", 0),
            "screen_views": row.get("screenPageViews", 0),
            "engagement_rate_pct": round(float(row.get("engagementRate", 0)) * 100, 2),
        }
