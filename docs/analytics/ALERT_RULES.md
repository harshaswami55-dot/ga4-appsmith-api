# Sumlink Analytics Alert Rules

Status date: 2026-08-17

These rules define the first Q3 alert layer. They are intentionally threshold-based first, so the team can validate behavior before adding predictive models.

## Alert Inputs

- Current period KPI values from the Render FastAPI backend.
- Previous period KPI values from the same endpoint and filter set.
- Retention cohort outputs from GA4 Data API and BigQuery.
- Gameplay and onboarding funnel metrics from GA4 events.

## Default Severity

| Severity | Meaning |
| --- | --- |
| Info | Change is visible but not urgent |
| Warning | Needs review in the next analytics check |
| Critical | Needs same-day investigation |

## Core Rules

| Alert | Default Rule | Severity | Suggested Action |
| --- | --- | --- | --- |
| DAU drop | Current DAU is 20% or more below previous comparable period | Warning | Check release, acquisition, crashes, and channel split |
| Retention drop | Day 1, Day 7, or rolling retention drops by 10 percentage points or 25% relative | Critical | Inspect cohort date, app version, onboarding, and gameplay changes |
| Onboarding completion drop | Completion rate drops by 10 percentage points | Warning | Inspect tutorial step drop-off and frustrated-user events |
| Level drop-off spike | Any level drop-off increases by 15 percentage points | Warning | Review level difficulty, retry rate, and session exit behavior |
| Uninstall/churn spike | Uninstalls or churn proxy is 2x baseline | Critical | Compare acquisition source, country, app version, and crash signals |

## Implementation Notes

- Alert calculations live in `backend/app/services/alert_rules.py`.
- Initial implementation is pure Python and testable without calling GA4.
- Production alert delivery should be added later through email, Slack, Teams, or an Appsmith alert page.
- Thresholds should be tuned after two to four weeks of stable baseline data.

## Validation Checklist

1. Compare current and previous period values using the same filters.
2. Confirm the alert is not caused by a partial GA4 data day.
3. Confirm Render response is fresh and not stale cache.
4. Validate severe retention changes against BigQuery where user-level export exists.
5. Record false positives and tune thresholds monthly.
