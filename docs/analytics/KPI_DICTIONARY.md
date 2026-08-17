# Sumlink Analytics KPI Dictionary

This document is the working source of truth for KPI definitions used in the Sumlink Analytics Dashboard. It is written for implementation, validation, and manager reporting.

## Data Sources

| Source | Purpose | Notes |
| --- | --- | --- |
| GA4 Data API | Live dashboard KPIs, trends, funnels, acquisition, gameplay, and retention summary | Used by the Render FastAPI backend |
| BigQuery GA4 export | Exact user-level validation and rolling retention | Used when `BIGQUERY_ENABLED=true` |
| Appsmith Cloud | Dashboard UI and manager-facing analytics views | Calls Render API endpoints |
| Render FastAPI backend | Production API layer | Applies filters, formulas, cache, and API-key auth |

## Global Filters

| Filter | Applies To | Notes |
| --- | --- | --- |
| Date range | All modules | Default is recent completed period ending yesterday |
| App version | All modules | Used for release/version analysis |
| OS version | All modules | Used for platform behavior comparison |
| Device model | All modules | Used for device performance and quality analysis |
| Country | All modules | Used for geography analysis |
| Level | Onboarding and Gameplay | Used for level and tutorial analysis |
| Channel | Acquisition and selected summaries | Must not overlap other filters in Appsmith layout |

## Executive Health

| KPI | Formula / Source | Validation |
| --- | --- | --- |
| Active Users | GA4 `activeUsers` over selected range | GA4 Data API vs GA4 UI spot check |
| New Users | GA4 `newUsers` over selected range | GA4 Data API vs GA4 UI spot check |
| Sessions | GA4 `sessions` over selected range | GA4 Data API vs GA4 UI spot check |
| Screen Views | GA4 `screenPageViews` over selected range | GA4 Data API vs GA4 UI spot check |
| Engagement Rate | GA4 `engagementRate * 100` | GA4 Data API |
| DAU | Final selected day `activeUsers` from daily trend | GA4 daily report |
| MAU | 30-day `activeUsers` window ending selected end date | GA4 rolling window |
| Stickiness | `DAU / MAU * 100` | Backend calculation |

## Acquisition

| KPI | Formula / Source | Validation |
| --- | --- | --- |
| Installs | GA4 `first_open` event count | GA4 events report |
| Installing Users | GA4 `first_open` total users | GA4 events report |
| Uninstalls | GA4 `app_remove` event count | GA4 events report |
| Observed Android Churn % | `app_remove users / first_open users * 100` | GA4 event users |
| Installed But Not Played | `first_open users - level_start users` proxy | BigQuery recommended for exact user exclusion |
| Not Played Not Removed | `first_open users - level_start users - app_remove users` proxy | BigQuery recommended for exact user exclusion |
| Source / Campaign Metrics | GA4 first-user dimensions | GA4 acquisition reports |

## Onboarding

| KPI | Formula / Source | Validation |
| --- | --- | --- |
| Tutorial Started | GA4 `tutorial_step` total users | GA4 event users |
| Tutorial Completed | GA4 `tutorial_completed` total users | GA4 event users |
| Frustrated Users | GA4 `tutorial_match_failed` total users | GA4 event users |
| Frustration Rate | `frustrated users / tutorial started * 100` | Backend calculation |
| Completion % | `tutorial completed / tutorial started * 100` | Backend calculation |
| Failure % | `tutorial_match_failed users / tutorial started * 100` | Backend calculation |
| Skip % | `tutorial_skipped users / tutorial started * 100` | Backend calculation |
| Avg Tutorial Time | Configured tutorial time metric when available | GA4 custom metric |
| Launch to Step 1 % | `tutorial_step_1 users / first_open users * 100` | Funnel validation |
| Installed But Never Played | `first_open users - level_start users` proxy | BigQuery recommended for exact user exclusion |

## Gameplay

| KPI | Formula / Source | Validation |
| --- | --- | --- |
| Level Started | GA4 `level_start` event count | GA4 events report |
| Level Completed | GA4 `level_complete` event count | GA4 events report |
| Level Drop-off % | `(level_started - level_completed) / level_started * 100` | Backend calculation |
| Level Completion % | `level_completed / level_started * 100` | Backend calculation |
| Hint Usage | GA4 hint event count | GA4 events report |
| Hints Per Completed User | `hint usage / level_completed` | Backend calculation |
| Average Level Time | Configured level time metric when available | GA4 custom metric |
| Add Row Trend | GA4 action dimension filtered to row-add action | Requires custom dimension configuration |

## Retention

| KPI | Formula / Source | Validation |
| --- | --- | --- |
| DAU | GA4 `activeUsers` by date | GA4 Data API |
| WAU | GA4 `active7DayUsers` by date | GA4 Data API |
| MAU | GA4 `active28DayUsers` by date | GA4 Data API |
| Stickiness | `DAU / MAU * 100` | Backend calculation |
| Day N Retention | `cohortActiveUsers on Day N / cohortTotalUsers * 100` | GA4 cohort report |
| Rolling Day N+ Retention | Users from the same Day 0 cohort active on Day N or any later day divided by Day 0 users | BigQuery exact user-level export when enabled |

## Rolling Retention Methodology

Rolling retention is calculated at user level when BigQuery is enabled:

1. Build Day 0 cohorts by first activity date.
2. Count total unique users in each cohort.
3. For Day 1+, Day 3+, Day 7+, and Day 15+, count users from that same cohort who returned on that day or any later day.
4. Calculate `rolling retention = retained users / cohort users * 100`.
5. Mark immature cohort days as unavailable instead of treating them as zero.

If BigQuery is unavailable, the dashboard can fall back to GA4 cohort rows. That fallback is a lower-bound estimate and must be labeled clearly.

## Validation Rules

| Check | Expected Result |
| --- | --- |
| Backend tests | All tests pass before release |
| Render health | `/health` and `/ready` return success |
| GA4 spot check | Dashboard KPI values match GA4 UI within expected sampling/date-window differences |
| BigQuery retention check | Rolling retention matches cohort user-level SQL output |
| Appsmith smoke test | Each tab loads without broken cards, overlap, or invalid chart labels |
