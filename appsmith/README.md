# Appsmith setup

## 1. Create the datasource

Create an authenticated REST API datasource named `SumlinkAPI`:

- Base URL: `http://host.docker.internal:8000/api/v1` when Appsmith runs in Docker, or `https://<your-render-hostname>/api/v1` in production.
- Header when backend auth is enabled: `X-API-Key: <secret>`.

Do not put the GA4 service-account JSON in Appsmith.

## 2. Create the global widgets

Use these widget names so `JSObjects/GlobalFilters.js` works unchanged:

- `StartDatePicker`, `EndDatePicker`
- `CountrySelect`, `PlatformSelect`, `DeviceCategorySelect`, `DeviceModelSelect`
- `OSVersionSelect`, `AppVersionSelect`, `TrafficSourceSelect`, `CampaignSelect`
- `UserTypeSelect`, `LevelNumberSelect`, `TutorialStepSelect`

Use ISO `YYYY-MM-DD` values for the two date pickers. Each select should allow an empty value for “All”.

## 3. Create API queries

Create these GET queries using the matching path:

- `ExecutiveSummary` → `/executive/summary`
- `AcquisitionSummary` → `/acquisition/summary`
- `OnboardingSummary` → `/onboarding/summary`
- `GameplaySummary` → `/gameplay/summary`
- `RetentionSummary` → `/retention/summary`

For each query parameter, bind the value from `GlobalFilters.params()`. Example:

```javascript
{{ GlobalFilters.params().start_date }}
```

For Render Free, disable each query's automatic page-load execution and run `{{ ApiRunner.run(QueryName) }}` from the page-load action. This retries while a sleeping service wakes. Bind KPI cards to `QueryName.data.data.kpis`, charts to the returned arrays, and table widgets directly to returned arrays.

## 4. Suggested bindings

- Executive line chart: `{{ ExecutiveSummary.data.data.daily_trend }}`
- Acquisition campaign table: `{{ AcquisitionSummary.data.data.campaign_performance }}`
- Onboarding funnel: `{{ OnboardingSummary.data.data.funnel }}`
- Gameplay difficulty chart: `{{ GameplaySummary.data.data.difficulty_curve }}`
- Retention curve: `{{ RetentionSummary.data.data.retention_curve }}`

Use `GlobalFilters.refreshCurrentPage()` from the Apply Filters button. Update its query mapping if your Appsmith page names differ.

## 5. Export

Create a GET query such as:

`/export/executive?format=csv&start_date=...&end_date=...`

Set its response type to file, then call it from the Export button.
