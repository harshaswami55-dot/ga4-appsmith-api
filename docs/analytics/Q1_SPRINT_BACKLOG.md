# Q1 Analytics Sprint Backlog

Q1 focus: stabilize the analytics foundation, make KPI definitions consistent, and create reliable validation before adding advanced analytics.

## Sprint Plan

| Sprint | Focus | Deliverables | Acceptance Criteria | Status |
| --- | --- | --- | --- | --- |
| Sprint 1 | Analytics baseline audit | Confirm GA4 events, Render endpoints, Appsmith pages, filters, and KPI formulas | KPI dictionary approved; backend tests pass; dashboard loads from production API | Ready |
| Sprint 2 | Data quality validation | GA4 vs BigQuery checks for executive, onboarding, gameplay, and retention data | Differences documented; rolling retention source confirmed | Planned |
| Sprint 3 | KPI card design cleanup | Standard KPI card layout, smooth sparklines, readable labels, no overlap | All tabs visually consistent on desktop; no broken text or chart labels | Planned |
| Sprint 4 | Acquisition improvements | Channel/source/campaign quality checks and churn views | Acquisition metrics explain install quality and churn signals | Planned |
| Sprint 5 | Onboarding funnel diagnostics | Tutorial funnel, drop-off, frustration, skipped users, worst step analysis | Manager can identify biggest onboarding friction point | Planned |
| Sprint 6 | Gameplay balancing dashboard | Level completion, level drop-off, hints, session/gameplay behavior | Manager can identify difficult levels and engagement issues | Planned |

## Sprint 1 Implementation Tasks

| Task | Output |
| --- | --- |
| Freeze KPI formulas | `docs/analytics/KPI_DICTIONARY.md` |
| Confirm production API endpoints | Render `/health`, `/ready`, and module APIs |
| Validate Appsmith filters | Date, app version, OS, device, country, level, channel |
| Confirm import/export workflow | One working Appsmith JSON kept in `appsmith/Sumlink Dashboard.json` |
| Validate retention methodology | BigQuery exact rolling retention documented |
| Remove duplicated reports | Keep only final manager report and roadmap docs |

## Weekly Sprint Operating Model

| Day | Activity |
| --- | --- |
| Monday | Confirm weekly analytics question, data scope, and owner |
| Tuesday | Implement dashboard/query/backend changes |
| Wednesday | Validate GA4 and BigQuery data |
| Thursday | Fix UI, labels, chart formatting, and edge cases |
| Friday | Publish summary, evidence, and next actions |

## Success Metrics

| Area | Target |
| --- | --- |
| Dashboard availability | Manager can open deployed dashboard without local laptop |
| KPI trust | Core KPIs validated against GA4 or BigQuery |
| Retention accuracy | Rolling retention uses BigQuery user-level data when enabled |
| Reporting cadence | Weekly sprint summary and monthly manager report |
| UI quality | KPI cards and charts are readable, aligned, and consistent |

## Immediate Next Sprint

1. Run full backend test suite.
2. Capture current production KPI values.
3. Validate rolling retention against BigQuery.
4. Fix remaining Appsmith chart label and sparkline issues.
5. Deploy and export the final working Appsmith JSON.
