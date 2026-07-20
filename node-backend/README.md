# Sumlink Node Analytics API

## Local setup

```powershell
cd node-backend
Copy-Item .env.example .env
npm install
npm test
npm start
```

Set `GOOGLE_APPLICATION_CREDENTIALS` in `.env` to the local JSON path. Production uses `GOOGLE_APPLICATION_CREDENTIALS_JSON` with raw or base64 JSON.

## Endpoints

| Endpoint | Dashboard data |
|---|---|
| `/api/executive-health` | Active/new users, stickiness, engagement, observed churn proxy |
| `/api/acquisition-churn` | Installs/uninstalls and channel quality |
| `/api/onboarding-funnel` | first_open → tutorial_step → tutorial_match_made → level_start |
| `/api/tutorial-frustration` | Failed users and daily frustration index |
| `/api/gameplay-balancing` | New/returning level starts and hint stages |
| `/api/level-difficulty` | Paginated levels and full difficulty curve |
| `/api/retention` | KPI and daily engagement/session trends |
| `/api/dau-mau` | DAU, active 28-day users, and stickiness |
| `/api/tutorial-skip` | Skip, attempt, and average step time trends |
| `/api/never-played` | GA4-only never-played proxy |

Every analytics endpoint accepts `startDate`, `endDate`, `appVersion`, `osVersion`, `deviceModel`, and `newReturning`. Level difficulty also accepts `page` and `pageSize` (maximum 200).

## GA4 setup

1. Create or select a Google Cloud project.
2. Enable **Google Analytics Data API**.
3. Create a service account and JSON key.
4. In GA4, open **Admin → Property Access Management**.
5. Add the service-account email as **Viewer** for property `516899630`.
6. Register `level_number` and `step_number` as event-scoped custom dimensions and `time_taken` as a custom metric. This property already exposes their API names as `customEvent:level_number`, `customEvent:step_number`, and `averageCustomEvent:time_taken`.

The API never returns credential data. In production, `AUTH_ENABLED=true` and `API_KEYS` are mandatory.

## Metric definitions and limitations

- Active/new users: `activeUsers`, `newUsers`
- Engagement: `engagementRate`, `engagedSessions`, `userEngagementDuration`
- Channel: `sessionDefaultChannelGroup`
- DAU/MAU: `activeUsers / active28DayUsers`
- Uninstalls: `app_remove`, currently unobserved; zeros are returned with a note
- Churn: returning-user-share proxy because GA4 has no direct churn metric
- Never played and per-level drop-off users: subtraction proxies; exact user exclusion requires BigQuery export

