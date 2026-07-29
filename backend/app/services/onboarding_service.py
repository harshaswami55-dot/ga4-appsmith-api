from app.schemas.filters import DashboardFilters
from app.services.ga4_service import GA4Service, _exact_filter, in_list_filter
from app.utils.numbers import percent


class OnboardingService:
    def __init__(self, ga4: GA4Service):
        self.ga4 = ga4

    def dashboard(self, filters: DashboardFilters) -> dict:
        settings = self.ga4.settings
        events = [
            settings.event_install,
            settings.event_tutorial_start,
            "tutorial_match_made",
            settings.event_tutorial_complete,
            settings.event_tutorial_fail,
            settings.event_tutorial_skip_attempt,
            settings.event_tutorial_skip,
            settings.event_level_start,
        ]
        event_rows = self.ga4.run_report(
            filters=filters,
            dimensions=["eventName"],
            metrics=["eventCount", "totalUsers"],
            extra_filter=in_list_filter("eventName", events),
        )
        event_map = {row["eventName"]: row for row in event_rows}

        started_row = event_map.get(settings.event_tutorial_start, {})
        completed_row = event_map.get(settings.event_tutorial_complete, {})
        failed_row = event_map.get(settings.event_tutorial_fail, {})
        skipped_row = event_map.get(settings.event_tutorial_skip, {})
        installed_row = event_map.get(settings.event_install, {})
        level_started_row = event_map.get(settings.event_level_start, {})
        started = started_row.get("totalUsers", 0)
        completed = completed_row.get("totalUsers", 0)
        failed = failed_row.get("totalUsers", 0)
        skipped = skipped_row.get("totalUsers", 0)
        daily_frustration_trend = self._daily_frustration_trend(filters, settings.event_tutorial_start, settings.event_tutorial_fail)
        skip_attempt_trend = self._daily_event_trend(filters, settings.event_tutorial_skip_attempt, "skip_attempts")

        step_rows: list[dict] = []
        if settings.tutorial_step_dimension:
            step_rows = self.ga4.run_report(
                filters=filters,
                dimensions=[settings.tutorial_step_dimension, "eventName"],
                metrics=["eventCount", "totalUsers"],
                extra_filter=in_list_filter("eventName", events),
                limit=500,
            )
        step_analysis = self._step_analysis(step_rows)
        daily_step_completion = self._daily_step_completion(
            filters,
            settings.tutorial_step_dimension,
            settings.event_tutorial_start,
            "tutorial_match_made",
            settings.event_tutorial_fail,
            settings.event_tutorial_skip,
        )
        detailed_funnel = self._detailed_funnel(
            installed=installed_row,
            step_analysis=step_analysis,
            completed=completed_row,
            level_started=level_started_row,
        )
        worst_step = self._worst_tutorial_step(step_analysis)

        average_time = None
        average_time_by_step: list[dict] = []
        if settings.tutorial_time_metric:
            duration_rows = self.ga4.run_report(
                filters=filters,
                metrics=[settings.tutorial_time_metric],
                extra_filter=_exact_filter("eventName", settings.event_tutorial_complete),
            )
            average_time = round(float(duration_rows[0].get(settings.tutorial_time_metric, 0)), 2) if duration_rows else 0
            if settings.tutorial_step_dimension:
                average_time_by_step = self.ga4.run_report(
                    filters=filters,
                    dimensions=[settings.tutorial_step_dimension],
                    metrics=[settings.tutorial_time_metric],
                    extra_filter=_exact_filter("eventName", settings.event_tutorial_start),
                    limit=100,
                )
                average_time_by_step = [
                    {
                        **row,
                        "step": row.get(settings.tutorial_step_dimension, "Unknown"),
                        "average_time_sec": round(float(row.get(settings.tutorial_time_metric, 0) or 0), 2),
                    }
                    for row in average_time_by_step
                ]

        installed = self._event_users(filters, settings.event_install)
        played = self._event_users(filters, settings.event_level_start)
        never_played_proxy = max(installed - played, 0)

        return {
            "kpis": {
                "tutorial_started": started,
                "tutorial_completed": completed,
                "frustrated_users": failed,
                "user_frustration_rate_pct": percent(failed, started),
                "completion_pct": percent(completed, started),
                "failure_pct": percent(failed, started),
                "skip_pct": percent(skipped, started),
                "average_tutorial_time": average_time,
                "installed_but_never_played_proxy": never_played_proxy,
                "launch_to_first_step_pct": (
                    detailed_funnel[1]["conversion_from_previous_pct"]
                    if len(detailed_funnel) > 1 and detailed_funnel[1]["conversion_from_previous_pct"] <= 100
                    else None
                ),
                "first_step_drop_off_users": step_analysis[0]["drop_off_users"] if step_analysis else 0,
                "worst_tutorial_step": worst_step,
            },
            "funnel": [
                {"stage": "started", "users": started, "events": started_row.get("eventCount", 0)},
                {"stage": "completed", "users": completed, "events": completed_row.get("eventCount", 0)},
                {"stage": "failed", "users": failed, "events": failed_row.get("eventCount", 0)},
                {"stage": "skipped", "users": skipped, "events": skipped_row.get("eventCount", 0)},
            ],
            "detailed_funnel": detailed_funnel,
            "step_analysis": step_analysis,
            "daily_step_completion": daily_step_completion,
            "daily_frustration_trend": daily_frustration_trend,
            "skip_attempt_trend": skip_attempt_trend,
            "average_time_by_step": average_time_by_step,
            "steps": step_rows,
            "notes": {
                "tutorial_rates": "Distinct users at each outcome divided by distinct users who emitted tutorial_step",
                "frustrated_users": f"Proxy: distinct users firing {settings.event_tutorial_fail}",
                "user_frustration_rate_pct": f"{settings.event_tutorial_fail} users divided by {settings.event_tutorial_start} users",
                "skip_attempt_trend": f"Daily event count for {settings.event_tutorial_skip_attempt}",
                "average_time_by_step": f"{settings.tutorial_time_metric} by {settings.tutorial_step_dimension}",
                "installed_but_never_played_proxy": "Installing users minus level-starting users; exact user-level exclusion requires BigQuery export",
                "average_tutorial_time": "Set TUTORIAL_TIME_METRIC to a registered GA4 custom metric to populate this value",
                "detailed_funnel": "GA4 event-user funnel: first_open -> tutorial_step_1 -> tutorial_completed -> level_start",
                "step_analysis": "Per tutorial step: users reaching step, successful match users, failed users, skipped users, and calculated drop-off",
                "daily_step_completion": "Daily per-step users for tutorial_step, tutorial_match_made, tutorial_failed, and tutorial_skipped",
            },
        }

    @staticmethod
    def _step_sort_key(step: str) -> tuple[int, int | str]:
        try:
            return 0, int(step.replace("tutorial_step_", ""))
        except ValueError:
            return 1, step

    def _step_analysis(self, step_rows: list[dict]) -> list[dict]:
        settings = self.ga4.settings
        by_step: dict[str, dict] = {}
        for row in step_rows:
            step = str(row.get(settings.tutorial_step_dimension, "") or "")
            if not step or step in {"(not set)", "Unknown", ""}:
                continue
            item = by_step.setdefault(
                step,
                {
                    "step": step,
                    "reached_users": 0,
                    "match_made_users": 0,
                    "failed_users": 0,
                    "skip_attempt_users": 0,
                    "skipped_users": 0,
                    "events": 0,
                },
            )
            event = row.get("eventName")
            users = row.get("totalUsers", 0)
            item["events"] += row.get("eventCount", 0)
            if event == settings.event_tutorial_start:
                item["reached_users"] = users
            elif event == "tutorial_match_made":
                item["match_made_users"] = users
            elif event == settings.event_tutorial_fail:
                item["failed_users"] = users
            elif event == settings.event_tutorial_skip_attempt:
                item["skip_attempt_users"] = users
            elif event == settings.event_tutorial_skip:
                item["skipped_users"] = users

        ordered = [by_step[step] for step in sorted(by_step, key=self._step_sort_key)]
        for index, item in enumerate(ordered):
            reached = item["reached_users"]
            next_reached = ordered[index + 1]["reached_users"] if index + 1 < len(ordered) else item["match_made_users"]
            item["completion_pct"] = percent(item["match_made_users"], reached)
            item["failure_pct"] = percent(item["failed_users"], reached)
            item["skip_pct"] = percent(item["skipped_users"], reached)
            item["next_step_users"] = next_reached
            item["drop_off_users"] = max(reached - next_reached, 0)
            item["drop_off_pct"] = percent(item["drop_off_users"], reached)
        return ordered

    def _detailed_funnel(self, *, installed: dict, step_analysis: list[dict], completed: dict, level_started: dict) -> list[dict]:
        stages = [
            {"stage": "Install / first open", "users": installed.get("totalUsers", 0), "event": self.ga4.settings.event_install},
            {
                "stage": "Tutorial step 1",
                "users": step_analysis[0]["reached_users"] if step_analysis else 0,
                "event": self.ga4.settings.event_tutorial_start,
            },
            {"stage": "Tutorial completed", "users": completed.get("totalUsers", 0), "event": self.ga4.settings.event_tutorial_complete},
            {"stage": "First level started", "users": level_started.get("totalUsers", 0), "event": self.ga4.settings.event_level_start},
        ]
        previous = None
        for item in stages:
            users = item["users"]
            item["conversion_from_previous_pct"] = 100 if previous in {None, 0} else percent(users, previous)
            item["drop_off_from_previous_users"] = 0 if previous is None else max(previous - users, 0)
            item["drop_off_from_previous_pct"] = 0 if previous in {None, 0} else percent(max(previous - users, 0), previous)
            previous = users
        return stages

    @staticmethod
    def _worst_tutorial_step(step_analysis: list[dict]) -> str:
        actionable = [
            row
            for row in step_analysis
            if not (row.get("next_step_users", 0) == 0 and row.get("match_made_users", 0) == 0 and row.get("failed_users", 0) == 0)
        ]
        if not actionable:
            return "N/A"
        worst = max(
            actionable,
            key=lambda row: row.get("failed_users", 0) + row.get("skipped_users", 0) + row.get("drop_off_users", 0),
        )
        return worst.get("step", "N/A")

    def _event_users(self, filters: DashboardFilters, event_name: str) -> int | float:
        rows = self.ga4.run_report(
            filters=filters,
            metrics=["totalUsers"],
            extra_filter=_exact_filter("eventName", event_name),
        )
        return rows[0].get("totalUsers", 0) if rows else 0

    def _daily_event_trend(self, filters: DashboardFilters, event_name: str, value_key: str) -> list[dict]:
        rows = self.ga4.run_report(
            filters=filters,
            dimensions=["date"],
            metrics=["eventCount", "totalUsers"],
            extra_filter=_exact_filter("eventName", event_name),
            limit=500,
        )
        return [
            {
                "date": row.get("date", ""),
                value_key: row.get("eventCount", 0),
                "users": row.get("totalUsers", 0),
            }
            for row in rows
        ]

    def _daily_frustration_trend(self, filters: DashboardFilters, start_event: str, fail_event: str) -> list[dict]:
        rows = self.ga4.run_report(
            filters=filters,
            dimensions=["date", "eventName"],
            metrics=["totalUsers"],
            extra_filter=in_list_filter("eventName", [start_event, fail_event]),
            limit=1000,
        )
        by_date: dict[str, dict] = {}
        for row in rows:
            date = str(row.get("date", ""))
            by_date.setdefault(date, {"date": date, "tutorial_started": 0, "frustrated_users": 0, "frustration_rate_pct": 0})
            if row.get("eventName") == start_event:
                by_date[date]["tutorial_started"] = row.get("totalUsers", 0)
            elif row.get("eventName") == fail_event:
                by_date[date]["frustrated_users"] = row.get("totalUsers", 0)
        for item in by_date.values():
            item["frustration_rate_pct"] = percent(item["frustrated_users"], item["tutorial_started"])
        return [by_date[date] for date in sorted(by_date)]

    def _daily_step_completion(
        self,
        filters: DashboardFilters,
        step_dimension: str | None,
        start_event: str,
        match_event: str,
        fail_event: str,
        skip_event: str,
    ) -> list[dict]:
        if not step_dimension:
            return []
        rows = self.ga4.run_report(
            filters=filters,
            dimensions=["date", step_dimension, "eventName"],
            metrics=["totalUsers", "eventCount"],
            extra_filter=in_list_filter("eventName", [start_event, match_event, fail_event, skip_event]),
            limit=5000,
        )
        by_key: dict[tuple[str, str], dict] = {}
        for row in rows:
            date = str(row.get("date", ""))
            step = str(row.get(step_dimension, "") or "")
            if not step or step in {"(not set)", "Unknown", ""}:
                continue
            item = by_key.setdefault(
                (date, step),
                {
                    "date": date,
                    "step": step,
                    "reached_users": 0,
                    "match_made_users": 0,
                    "failed_users": 0,
                    "skipped_users": 0,
                    "events": 0,
                    "completion_pct": 0,
                    "failure_pct": 0,
                    "skip_pct": 0,
                },
            )
            event = row.get("eventName")
            users = row.get("totalUsers", 0)
            item["events"] += row.get("eventCount", 0)
            if event == start_event:
                item["reached_users"] = users
            elif event == match_event:
                item["match_made_users"] = users
            elif event == fail_event:
                item["failed_users"] = users
            elif event == skip_event:
                item["skipped_users"] = users

        output = []
        for item in by_key.values():
            reached = item["reached_users"]
            item["completion_pct"] = percent(item["match_made_users"], reached)
            item["failure_pct"] = percent(item["failed_users"], reached)
            item["skip_pct"] = percent(item["skipped_users"], reached)
            output.append(item)
        return sorted(output, key=lambda item: (item["date"], self._step_sort_key(item["step"])))
