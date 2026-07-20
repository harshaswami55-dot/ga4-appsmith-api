# Sumlink Analytics API — TypeScript

Production Express API between Appsmith and GA4 property `516899630`.

## Security and reliability

- GA4 credentials decoded from base64 memory only (`GOOGLE_SERVICE_ACCOUNT_JSON`)
- Constant-time `x-api-key` authentication on every `/api/*` route
- Zod validation for the shared query contract
- 100 requests/minute/IP rate limit
- Five-minute endpoint response cache using `node-cache`
- Helmet security headers and Pino HTTP logging
- Exact comma-separated CORS allowlist; wildcard origins are ignored
- Central errors shaped as `{ "error": "message" }`

## Local setup

```powershell
cd node-backend
Copy-Item .env.example .env
npm install
npm run build
npm test
npm start
```

For local development, `.env` can use the ignored `GOOGLE_APPLICATION_CREDENTIALS` file-path fallback. Render must use base64:

```powershell
$env:GOOGLE_SERVICE_ACCOUNT_JSON = [Convert]::ToBase64String(
  [IO.File]::ReadAllBytes("C:\Users\harsh\credentials\phrasal-clover-493807-m9-4019d33cb4de.json")
)
$env:GA4_PROPERTY_ID = "516899630"
$env:API_KEY = "replace-with-a-random-key"
$env:ALLOWED_ORIGINS = "https://app.appsmith.com"
npm start
```

## API

| Endpoint | Result |
|---|---|
| `/api/executive-health` | Active/new users, stickiness, engagement, churn proxy |
| `/api/acquisition-churn` | Installs/uninstalls and channel quality |
| `/api/onboarding-funnel` | first_open → tutorial_step → tutorial_match_made → level_start |
| `/api/tutorial-frustration` | Failed users and frustration trend |
| `/api/gameplay-balancing` | New/returning level starts and hint usage |
| `/api/level-difficulty` | Paginated level table and full difficulty curve |
| `/api/retention` | KPI, new/returning, engagement, and session trends |
| `/api/dau-mau` | DAU, 28-day active users, and stickiness |
| `/api/tutorial-skip` | Skip/attempt and average step time trends |
| `/api/never-played` | Installed-never-played proxy |

All accept `startDate`, `endDate`, `appVersion`, `osVersion`, `deviceModel`, and `newReturning`. Level difficulty also accepts `page` and `pageSize` (1–200).

See [docs/curl-examples.md](docs/curl-examples.md) and [postman/Sumlink-Analytics.postman_collection.json](postman/Sumlink-Analytics.postman_collection.json).

## GA4 setup

1. Enable Google Analytics Data API in the Google Cloud project.
2. Create a service account and JSON key.
3. In GA4, open **Admin → Property Access Management**.
4. Add the service-account email as **Viewer**.
5. Register `level_number` and `step_number` as event-scoped dimensions and `time_taken` as a custom metric.

This property exposes `customEvent:level_number`, `customEvent:step_number`, and `averageCustomEvent:time_taken`.

GA4 has no dependable direct churn/uninstall metric. Observed churn, never-played, and distinct-user drop-off are clearly labeled proxies; exact user exclusion requires BigQuery.

