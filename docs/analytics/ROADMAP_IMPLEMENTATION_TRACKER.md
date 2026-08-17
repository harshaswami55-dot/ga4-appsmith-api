# Sumlink Analytics Roadmap Implementation Tracker

Status date: 2026-08-17

This tracker converts the 1-year analytics roadmap into implementation checkpoints. It is meant to keep manager reporting, dashboard work, validation, and future analytics improvements in one place.

## Current Production Baseline

- Backend: FastAPI on Render, connected to GA4 Data API and BigQuery.
- Dashboard: Appsmith dashboard with Executive, Acquisition, Onboarding, Gameplay, and Retention modules.
- Appsmith export retained in repo: `appsmith/Sumlink Dashboard.json`.
- Validation: backend unit tests and BigQuery retention tests are available under `backend/tests/`.
- Report artifacts: final manager DOCX/PDF and roadmap report under `reports/`.

## Q1: Foundation & Validation

Objective: make the dashboard stable, reliable, and manager-ready.

| Workstream | Status | Evidence | Acceptance Criteria |
| --- | --- | --- | --- |
| Project structure cleanup | Complete | Single retained Appsmith export and focused docs/scripts | Repo has no duplicate dashboard exports or stale report clutter |
| KPI formula dictionary | Complete | `docs/analytics/KPI_DICTIONARY.md` | Every KPI has source, formula, and validation notes |
| GA4 + BigQuery validation | Complete | `backend/tests/test_bigquery_retention.py`, final report | Retention logic is validated against GA4/BigQuery approach |
| Appsmith dashboard cleanup | Complete | `appsmith/Sumlink Dashboard.json` | Five sections import and display correctly |
| KPI card sparkline repair | Complete | `scripts/patch-appsmith-sparklines.cjs` | Broken text sparklines replaced by smooth chart widgets |
| Reporting cadence | Complete | `docs/analytics/VALIDATION_AND_REPORTING_CADENCE.md` | Weekly validation checklist exists |

## Q2: Deeper Analytics

Objective: improve segmentation and drill-down coverage.

| Workstream | Status | Evidence | Acceptance Criteria |
| --- | --- | --- | --- |
| Global filters | Complete | `backend/app/schemas/filters.py`, Appsmith filters | All dashboard queries receive consistent filter parameters |
| Country segmentation | Complete | `GET /api/v1/segments/summary` | Country-level KPI split available for analysis |
| App version segmentation | Complete | `GET /api/v1/segments/summary` | Version comparisons available for onboarding and gameplay review |
| OS/device segmentation | Complete | `GET /api/v1/segments/summary` | Device and OS problems can be isolated |
| Acquisition channel/source | Complete | Channel/source filters and segment API | Acquisition and retention can be compared by source/channel |
| Onboarding cohorts | In progress | Retention methodology and filters available | Cohorts can be expanded with onboarding completion status |
| Level difficulty segmentation | Complete | `level_difficulty` in segment API | Level activity is available using the configured level dimension |

## Q3: Predictive & Alerts

Objective: move from reporting to early warning.

| Alert | Status | Rule Owner | Acceptance Criteria |
| --- | --- | --- | --- |
| Live alert summary | Complete | Analytics backend | `GET /api/v1/alerts/summary` compares current vs previous period |
| DAU drop | Complete | Analytics backend | Alert service returns `DAU_DROP` |
| Day 1/Day 7 retention drop | Complete | Analytics backend | Alert fires for percentage-point and relative retention drops |
| Onboarding completion drop | Complete | Analytics backend | Alert fires when tutorial completion falls below threshold |
| Level drop-off spike | Complete | Analytics backend | Alert identifies level drop-off spike severity |
| Uninstall/churn spike | Complete | Analytics backend | Alert fires when uninstall/churn rises above baseline |

See `docs/analytics/ALERT_RULES.md`, `backend/app/services/alert_rules.py`, and `backend/app/api/alerts.py`.

## Q4: Automation & Manager Reporting

Objective: make reporting repeatable without manual dashboard checks.

| Workstream | Status | Evidence | Acceptance Criteria |
| --- | --- | --- | --- |
| Weekly report automation | Complete | `scripts/generate_weekly_manager_report.py` | Weekly report can be generated from live backend data |
| Monthly summary automation | Complete | `scripts/generate_monthly_manager_report.py` | Monthly manager summary includes KPIs, trends, risks, and actions |
| Governance | Complete | README and validation/reporting docs | Ownership, secrets policy, and deployment process documented |
| Next-year planning | Complete | `reports/Sumlink_Analytics_1_Year_Roadmap.md` | Next-year analytics plan based on live usage and stakeholder feedback |

## Immediate Next Steps

1. Keep `appsmith/Sumlink Dashboard.json` as the source Appsmith export.
2. Validate the current Appsmith Cloud deployment against Render API results.
3. Tune alert thresholds after two to four weeks of stable baseline data.
4. Run weekly/monthly manager report generators after each production validation cycle.
