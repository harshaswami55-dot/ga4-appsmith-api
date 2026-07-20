from collections import defaultdict

from app.schemas.filters import DashboardFilters
from app.services.ga4_service import GA4Service, _exact_filter, in_list_filter
from app.utils.numbers import percent


class GameplayService:
    def __init__(self, ga4: GA4Service):
        self.ga4 = ga4

    def dashboard(self, filters: DashboardFilters) -> dict:
        settings = self.ga4.settings
        events = [settings.event_level_start, settings.event_level_complete, settings.event_hint_used]
        dimensions = ["eventName"]
        if settings.level_dimension:
            dimensions.insert(0, settings.level_dimension)
        rows = self.ga4.run_report(
            filters=filters,
            dimensions=dimensions,
            metrics=["eventCount", "totalUsers"],
            extra_filter=in_list_filter("eventName", events),
            limit=1000,
        )

        levels: dict[str, dict[str, int | float | str | None]] = defaultdict(
            lambda: {"level": "all", "started": 0, "completed": 0, "hints": 0, "average_time": None}
        )
        for row in rows:
            level = str(row.get(settings.level_dimension, "all")) if settings.level_dimension else "all"
            levels[level]["level"] = level
            event = row.get("eventName")
            if event == settings.event_level_start:
                levels[level]["started"] = row.get("eventCount", 0)
            elif event == settings.event_level_complete:
                levels[level]["completed"] = row.get("eventCount", 0)
            elif event == settings.event_hint_used:
                levels[level]["hints"] = row.get("eventCount", 0)

        if settings.level_time_metric:
            time_rows = self.ga4.run_report(
                filters=filters,
                dimensions=[settings.level_dimension] if settings.level_dimension else [],
                metrics=[settings.level_time_metric],
                extra_filter=_exact_filter("eventName", settings.event_level_complete),
                limit=1000,
            )
            for row in time_rows:
                level = str(row.get(settings.level_dimension, "all")) if settings.level_dimension else "all"
                levels[level]["average_time"] = row.get(settings.level_time_metric, 0)

        difficulty_curve = []
        for level in levels.values():
            started = float(level["started"] or 0)
            completed = float(level["completed"] or 0)
            level["drop_off_pct"] = percent(max(started - completed, 0), started)
            level["completion_pct"] = percent(completed, started)
            difficulty_curve.append(dict(level))
        difficulty_curve.sort(key=lambda item: self._level_sort_key(str(item["level"])))

        totals = {
            "level_started": sum(float(level["started"] or 0) for level in difficulty_curve),
            "level_completed": sum(float(level["completed"] or 0) for level in difficulty_curve),
            "hint_usage": sum(float(level["hints"] or 0) for level in difficulty_curve),
        }
        totals["drop_off_pct"] = percent(
            max(totals["level_started"] - totals["level_completed"], 0),
            totals["level_started"],
        )
        return {
            "kpis": totals,
            "difficulty_curve": difficulty_curve,
            "notes": {
                "average_time": "Set LEVEL_TIME_METRIC to a registered GA4 custom metric to populate this value",
                "drop_off_pct": "(level starts - level completions) / level starts; event-count based",
            },
        }

    @staticmethod
    def _level_sort_key(level: str) -> tuple[int, int | str]:
        try:
            return 0, int(level)
        except ValueError:
            return 1, level

