from collections import defaultdict

from app.schemas.filters import DashboardFilters
from app.services.ga4_service import GA4QueryError, GA4Service, _exact_filter, and_filters, in_list_filter
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
            hints = float(level["hints"] or 0)
            level["drop_off_users"] = max(started - completed, 0)
            level["drop_off_pct"] = percent(level["drop_off_users"], started)
            level["completion_pct"] = percent(completed, started)
            level["hints_per_completed_user"] = round(hints / completed, 2) if completed else 0
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
        notes = {
            "average_time": "Set LEVEL_TIME_METRIC to a registered GA4 custom metric to populate this value",
            "drop_off_pct": "(level starts - level completions) / level starts; event-count based",
            "hint_events": {
                "highlighted": settings.event_hint_highlighted,
                "clicked": settings.event_hint_clicked,
                "used_successfully": settings.event_hint_used,
            },
            "add_row_event": f"{settings.event_game_action} where {settings.action_type_dimension}={settings.action_add_row_value}",
        }
        add_row_trend, add_row_note = self._add_row_trend(filters)
        if add_row_note:
            notes["add_row_trend"] = add_row_note
        return {
            "kpis": totals,
            "difficulty_curve": difficulty_curve,
            "level_performance": difficulty_curve,
            "new_returning_by_level": self._new_returning_by_level(filters),
            "hint_trend": self._hint_trend(filters),
            "add_row_trend": add_row_trend,
            "notes": notes,
        }

    @staticmethod
    def _level_sort_key(level: str) -> tuple[int, int | str]:
        try:
            normalized = level.replace("level_", "")
            return 0, int(normalized)
        except ValueError:
            return 1, level

    def _new_returning_by_level(self, filters: DashboardFilters) -> list[dict]:
        settings = self.ga4.settings
        if not settings.level_dimension:
            return []
        rows = self.ga4.run_report(
            filters=filters,
            dimensions=[settings.level_dimension, "newVsReturning"],
            metrics=["activeUsers"],
            extra_filter=_exact_filter("eventName", settings.event_level_start),
            limit=1000,
        )
        by_level: dict[str, dict] = {}
        for row in rows:
            level = str(row.get(settings.level_dimension, ""))
            user_type = str(row.get("newVsReturning", "unknown")).lower().replace(" ", "_")
            by_level.setdefault(level, {"level": level, "new": 0, "returning": 0, "unknown": 0})
            if user_type in {"new", "returning"}:
                by_level[level][user_type] = row.get("activeUsers", 0)
            else:
                by_level[level]["unknown"] += row.get("activeUsers", 0)
        return [by_level[level] for level in sorted(by_level, key=self._level_sort_key)]

    def _hint_trend(self, filters: DashboardFilters) -> list[dict]:
        settings = self.ga4.settings
        hint_events = [settings.event_hint_highlighted, settings.event_hint_clicked, settings.event_hint_used]
        rows = self.ga4.run_report(
            filters=filters,
            dimensions=["date", "eventName"],
            metrics=["eventCount"],
            extra_filter=in_list_filter("eventName", hint_events),
            limit=1000,
        )
        by_date: dict[str, dict] = {}
        keys = {
            settings.event_hint_highlighted: "highlighted",
            settings.event_hint_clicked: "clicked",
            settings.event_hint_used: "used_successfully",
        }
        for row in rows:
            date = str(row.get("date", ""))
            by_date.setdefault(date, {"date": date, "highlighted": 0, "clicked": 0, "used_successfully": 0})
            by_date[date][keys.get(str(row.get("eventName")), "used_successfully")] = row.get("eventCount", 0)
        return [by_date[date] for date in sorted(by_date)]

    def _add_row_trend(self, filters: DashboardFilters) -> tuple[list[dict], str | None]:
        settings = self.ga4.settings
        if not settings.action_type_dimension:
            return [], "ACTION_TYPE_DIMENSION is not configured"
        try:
            return self.ga4.run_report(
                filters=filters,
                dimensions=["date"],
                metrics=["activeUsers"],
                extra_filter=and_filters(
                    _exact_filter(settings.action_type_dimension, settings.action_add_row_value),
                    _exact_filter("eventName", settings.event_game_action),
                ),
                order_bys=[{"dimension": {"dimension_name": "date"}}],
                limit=500,
            ), None
        except GA4QueryError as exc:
            return [], str(exc)
