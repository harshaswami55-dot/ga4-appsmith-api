# Validation And Reporting Cadence

This checklist turns the analytics roadmap into a repeatable weekly operating process.

## Weekly Validation Checklist

| Check | Command / Location | Evidence |
| --- | --- | --- |
| Backend tests | `cd backend; .\.venv\Scripts\pytest.exe` | Test result summary |
| Render health | `https://sumlink-analytics-api.onrender.com/health` | 200 response |
| Render readiness | `https://sumlink-analytics-api.onrender.com/ready` | 200 response |
| Executive KPIs | Appsmith Executive tab + GA4 UI | Screenshot or notes |
| Acquisition KPIs | Appsmith Acquisition tab + GA4 events/acquisition | Screenshot or notes |
| Onboarding funnel | Appsmith Onboarding tab + GA4 events | Screenshot or notes |
| Gameplay metrics | Appsmith Gameplay tab + GA4 events | Screenshot or notes |
| Rolling retention | Appsmith Retention tab + BigQuery user-level query | Query result or notes |
| Appsmith deploy | Appsmith Cloud deployed view | Public/private access verified |

## Monthly Manager Report

Include these sections each month:

1. Executive health summary.
2. Acquisition quality and churn signals.
3. Onboarding friction and funnel drop-off.
4. Gameplay difficulty and balancing insights.
5. Retention trend and rolling retention cohort table.
6. Data validation notes.
7. Risks, blockers, and next month focus.

## Quarterly Review

| Quarter | Review Theme |
| --- | --- |
| Q1 | Foundation, validation, KPI consistency |
| Q2 | Deeper segmentation and experimentation |
| Q3 | Predictive insights and alerting |
| Q4 | Automation, governance, and annual planning |

## Release Gate

A dashboard update is ready to share only when:

1. Backend tests pass.
2. Render health and readiness endpoints pass.
3. Appsmith Cloud deployed view loads all tabs.
4. No KPI card text overlaps.
5. Chart labels are readable or intentionally hidden.
6. Retention source is clearly identified as BigQuery exact or GA4 fallback.
7. No API keys, credentials, or service account data are included in exported files or reports.
