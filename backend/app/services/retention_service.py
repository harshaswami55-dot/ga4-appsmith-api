import re

from app.schemas.filters import DashboardFilters
from app.services.bigquery_retention_service import BigQueryRetentionService
from app.services.ga4_service import GA4Service, _exact_filter
from app.utils.numbers import percent


class RetentionService:
    TARGET_DAYS = (1, 3, 7, 15)
    COHORT_TABLE_DAYS = tuple(range(0, 11))
    ROLLING_RETENTION_DAYS = (1, 3, 7, 15)
    COHORT_SUMMARY_MAX_COHORTS = 31
    COHORT_VISIBLE_ROWS = 10

    def __init__(self, ga4: GA4Service, bigquery_retention: BigQueryRetentionService | None = None):
        self.ga4 = ga4
        self.bigquery_retention = bigquery_retention or BigQueryRetentionService(ga4.settings)

    def dashboard(self, filters: DashboardFilters) -> dict:
        daily_activity = self.ga4.run_report(
            filters=filters,
            dimensions=["date"],
            metrics=["activeUsers", "active7DayUsers", "active28DayUsers", "sessions", "engagedSessions", "userEngagementDuration"],
            order_bys=[{"dimension": {"dimension_name": "date"}}],
            limit=500,
        )
        for item in daily_activity:
            item["dau"] = item.get("activeUsers", 0)
            item["wau"] = item.get("active7DayUsers", 0)
            item["mau"] = item.get("active28DayUsers", 0)
            item["stickiness_pct"] = percent(item.get("activeUsers", 0), item.get("active28DayUsers", 0))

        active_rows = self.ga4.run_report(filters=filters, metrics=["activeUsers", "sessions", "engagedSessions", "userEngagementDuration"])
        active_totals = active_rows[0] if active_rows else {}
        cohort_rows = self.ga4.run_cohort_report(filters=filters, end_offset=max(self.TARGET_DAYS))
        curve = []
        for row in cohort_rows:
            day = self._day_number(str(row.get("cohortNthDay", "")))
            active = row.get("cohortActiveUsers", 0)
            total = row.get("cohortTotalUsers", 0)
            curve.append(
                {
                    "day": day,
                    "active_users": active,
                    "cohort_users": total,
                    "retention_pct": percent(active, total),
                }
            )
        curve.sort(key=lambda item: item["day"])
        by_day = {item["day"]: item["retention_pct"] for item in curve}
        count_by_day = {item["day"]: item["active_users"] for item in curve}
        cohort_users_by_day = {item["day"]: item["cohort_users"] for item in curve}
        day_0_users = cohort_users_by_day.get(0, 0)
        cohort_grid_rows, cohort_internal_rows = self._cohort_grid(filters, include_internal=True)
        rolling_retention_rows = self._rolling_retention_table(cohort_internal_rows)
        rolling_retention_source = "GA4 lower-bound estimate"
        if self.bigquery_retention.enabled:
            try:
                bq_rolling_retention_rows = self.bigquery_retention.rolling_retention_table(filters)
                if bq_rolling_retention_rows:
                    rolling_retention_rows = bq_rolling_retention_rows
                    rolling_retention_source = "BigQuery exact user-level"
            except Exception:
                rolling_retention_source = "GA4 lower-bound estimate; BigQuery unavailable"
        retention_table = [
            {
                "cohort": "Selected Day 0 cohort",
                "day_0_users": day_0_users,
                "day_1_users": count_by_day.get(1, 0),
                "day_1_retention_pct": by_day.get(1, 0),
                "day_3_users": count_by_day.get(3, 0),
                "day_3_retention_pct": by_day.get(3, 0),
                "day_7_users": count_by_day.get(7, 0),
                "day_7_retention_pct": by_day.get(7, 0),
                "day_15_users": count_by_day.get(15, 0),
                "day_15_retention_pct": by_day.get(15, 0),
                "formula": "Day N retention = users from Day 0 cohort active exactly on Day N / Day 0 cohort users",
            }
        ]

        returning_rows = self.ga4.run_report(
            filters=filters,
            metrics=["activeUsers"],
            extra_filter=_exact_filter("newVsReturning", "returning"),
        )
        returning = returning_rows[0].get("activeUsers", 0) if returning_rows else 0

        final_day = daily_activity[-1] if daily_activity else {}
        dau = final_day.get("activeUsers", 0)
        wau = final_day.get("active7DayUsers", 0)
        mau = final_day.get("active28DayUsers", 0)

        return {
            "kpis": {
                "day_0_cohort_users": day_0_users,
                "dau": dau,
                "wau": wau,
                "mau": mau,
                "stickiness_pct": percent(dau, mau),
                "active_users_selected_range": active_totals.get("activeUsers", 0),
                "sessions": active_totals.get("sessions", 0),
                "engaged_sessions": active_totals.get("engagedSessions", 0),
                "user_engagement_duration": active_totals.get("userEngagementDuration", 0),
                "average_session_length_seconds": round(
                    float(active_totals.get("userEngagementDuration", 0)) / float(active_totals.get("sessions", 0)),
                    2,
                )
                if active_totals.get("sessions", 0)
                else 0,
                "sessions_per_user": round(float(active_totals.get("sessions", 0)) / float(active_totals.get("activeUsers", 0)), 2)
                if active_totals.get("activeUsers", 0)
                else 0,
                **{f"day_{day}_retention_pct": by_day.get(day, 0) for day in self.TARGET_DAYS},
                **{f"day_{day}_retention_users": count_by_day.get(day, 0) for day in self.TARGET_DAYS},
                "returning_users": returning,
            },
            "daily_activity": daily_activity,
            "retention_curve": curve,
            "retention_table": retention_table,
            "cohort_grid": cohort_grid_rows,
            "rolling_retention_table": rolling_retention_rows,
            "definitions": {
                "cohort": "Day 0 cohort users are users whose first gameplay/app session occurred in the selected date range. GA4 Data API cohort dimension used: firstSessionDate.",
                "retention": "Day 0 to Day 10 retention = same Day 0 cohort users active exactly on that nth day divided by Day 0 cohort users, expressed as a percentage.",
                "manager_example": "If 100 users first played on Day 0 and 40 of those exact users returned on Day 1, Day 1 retention is 40%.",
                "rolling_retention": f"Rolling retention means users from the Day 0 cohort active on Day N or any later day. Source: {rolling_retention_source}.",
                "dau": "GA4 activeUsers on the final selected day",
                "wau": "GA4 active7DayUsers on the final selected day",
                "mau": "GA4 active28DayUsers on the final selected day",
                "stickiness_pct": "Final-day DAU divided by final-day MAU (active28DayUsers)",
                "active_users_selected_range": "GA4 activeUsers across the full selected date range",
                "user_engagement_duration": "GA4 userEngagementDuration metric in seconds",
                "accuracy_note": "Exact Day-N retention uses GA4 cohort reports. Rolling retention uses BigQuery user-level export when BIGQUERY_ENABLED is true; otherwise it falls back to a GA4 lower-bound estimate.",
            },
        }

    @staticmethod
    def _day_number(value: str) -> int:
        match = re.search(r"(\d+)$", value)
        return int(match.group(1)) if match else 0

    def _cohort_grid(self, filters: DashboardFilters, include_internal: bool = False) -> list[dict] | tuple[list[dict], list[dict]]:
        max_offset = max(max(self.COHORT_TABLE_DAYS), max(self.ROLLING_RETENTION_DAYS))
        rows = self.ga4.run_daily_cohort_report(
            filters=filters,
            end_offset=max_offset,
            max_cohorts=self.COHORT_SUMMARY_MAX_COHORTS,
        )
        grouped: dict[str, dict] = {}
        for row in rows:
            cohort = str(row.get("cohort", "Unknown"))
            day = self._day_number(str(row.get("cohortNthDay", "")))
            item = grouped.setdefault(
                cohort,
                {
                    "cohort": cohort,
                    "users": 0,
                    "_active_by_day": {},
                    **{f"day_{target_day}": None for target_day in self.COHORT_TABLE_DAYS},
                },
            )
            total = int(row.get("cohortTotalUsers", 0) or 0)
            active = int(row.get("cohortActiveUsers", 0) or 0)
            if day < 0 or day > max_offset:
                continue
            if day == 0:
                item["users"] = total
                item["day_0"] = 100 if total else 0
                item["_active_by_day"][0] = total
            elif day in self.COHORT_TABLE_DAYS:
                item[f"day_{day}"] = percent(active, total)
                item["_active_by_day"][day] = active
            else:
                item["_active_by_day"][day] = active

        cohort_rows = sorted(grouped.values(), key=lambda item: item["cohort"])
        summary = self._cohort_summary_row(cohort_rows)

        visible_rows = cohort_rows[: self.COHORT_VISIBLE_ROWS]

        cleaned_rows = []
        for item in visible_rows:
            cleaned_rows.append({key: value for key, value in item.items() if key != "_active_by_day"})
        if summary:
            cleaned_rows.append(summary)
        if include_internal:
            return cleaned_rows, cohort_rows
        return cleaned_rows

    def _rolling_retention_table(self, rows: list[dict]) -> list[dict]:
        if not rows:
            return []

        max_offset = max(self.ROLLING_RETENTION_DAYS)

        def rolling_value(row: dict, target_day: int) -> int | None:
            active_by_day = row.get("_active_by_day", {})
            future_values = [
                int(active_by_day.get(day, 0) or 0)
                for day in range(target_day, max_offset + 1)
                if day in active_by_day
            ]
            if not future_values:
                return None
            return max(future_values)

        def build_row(row: dict) -> dict:
            users = int(row.get("users", 0) or 0)
            output = {
                "cohort": row.get("cohort", ""),
                "users": users,
                "method": "GA4 lower-bound estimate",
            }
            for target_day in self.ROLLING_RETENTION_DAYS:
                active = rolling_value(row, target_day)
                output[f"rolling_day_{target_day}_users"] = active
                output[f"rolling_day_{target_day}_pct"] = percent(active or 0, users) if active is not None else None
            return output

        visible_rows = [build_row(row) for row in rows[: self.COHORT_VISIBLE_ROWS]]

        summary = {
            "cohort": "All Users",
            "users": sum(int(row.get("users", 0) or 0) for row in rows),
            "method": "Weighted lower-bound estimate",
        }
        for target_day in self.ROLLING_RETENTION_DAYS:
            active_sum = 0
            total_sum = 0
            for row in rows:
                users = int(row.get("users", 0) or 0)
                active = rolling_value(row, target_day)
                if active is None:
                    continue
                active_sum += active
                total_sum += users
            summary[f"rolling_day_{target_day}_users"] = active_sum if total_sum else None
            summary[f"rolling_day_{target_day}_pct"] = percent(active_sum, total_sum) if total_sum else None

        return visible_rows + [summary]

    def _cohort_summary_row(self, rows: list[dict]) -> dict | None:
        if not rows:
            return None

        summary = {
            "cohort": "All Users",
            "users": sum(int(row.get("users", 0) or 0) for row in rows),
            **{f"day_{target_day}": None for target_day in self.COHORT_TABLE_DAYS},
        }
        if summary["users"]:
            summary["day_0"] = 100

        for target_day in self.COHORT_TABLE_DAYS:
            if target_day == 0:
                continue
            active_sum = 0
            total_sum = 0
            for row in rows:
                active_by_day = row.get("_active_by_day", {})
                if target_day not in active_by_day:
                    continue
                users = int(row.get("users", 0) or 0)
                active_sum += int(active_by_day.get(target_day, 0) or 0)
                total_sum += users
            if total_sum:
                summary[f"day_{target_day}"] = percent(active_sum, total_sum)

        return summary
