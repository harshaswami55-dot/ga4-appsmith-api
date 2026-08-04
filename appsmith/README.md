# Build the Sumlink Appsmith dashboard

This is the supported step-by-step deliverable for Appsmith. It avoids embedding environment-specific datasource IDs that make handwritten export JSON unreliable.

## 1. Datasource

Create a REST datasource named `SumlinkAPI`:

- Development base URL: `http://host.docker.internal:8000/api/v1`
- Render base URL: `https://<your-render-host>/api/v1`
- Header: `X-API-Key: <the Render API_KEYS value>`

Never add the GA4 JSON to Appsmith.

## 2. Header filter bar

Create these widgets with exactly these names:

| Widget | Type | Value |
|---|---|---|
| `DateRangeFilter` | Select | `30daysAgo|yesterday` default |
| `CustomStartDateFilter` | DatePicker | Used when custom range is selected |
| `CustomEndDateFilter` | DatePicker | Used when custom range is selected |
| `AppVersionFilter` | Select | Empty means all |
| `OSVersionFilter` | Select | Empty means all |
| `DeviceModelFilter` | Select | Empty means all |
| `CountryFilter` | Select | Empty means all |
| `LevelNumberFilter` | Select | Empty means all |

Import/copy `JSObjects/GlobalFilters.js`, `ApiRunner.js`, and `DashboardFormatters.js` into Appsmith JS Objects. Bind every REST query parameter to:

```javascript
{{ GlobalFilters.params().start_date }}
{{ GlobalFilters.params().end_date }}
{{ GlobalFilters.params().app_version }}
{{ GlobalFilters.params().os_version }}
{{ GlobalFilters.params().device_model }}
{{ GlobalFilters.params().country }}
{{ GlobalFilters.params().level_number }}
```

On each Select widget's `onOptionChange` and DatePicker's `onDateSelected`, call the page query through `ApiRunner.run(QueryName)`. For a single scrolling dashboard, call `GlobalFilters.refreshAll()`.

## 3. Queries

Create the following GET queries. The names are used by the supplied JS Objects.

| Query name | Path |
|---|---|
| `ExecutiveSummary` | `/executive/summary` |
| `AcquisitionSummary` | `/acquisition/summary` |
| `OnboardingSummary` | `/onboarding/summary` |
| `GameplaySummary` | `/gameplay/summary` |
| `RetentionSummary` | `/retention/summary` |

Disable automatic page-load execution and use `{{ ApiRunner.run(ExecutiveSummary) }}` (substitute the page query) as the page-load action. The helper retries during a Render Free cold start.

## 4. Sections and bindings

### Executive Health

Create five grey KPI cards with a large bold value and small grey label:

- Active users: `{{ExecutiveSummary.data.data.kpis.active_users}}`
- New users: `{{ExecutiveSummary.data.data.kpis.new_users}}`
- DAU: `{{ExecutiveSummary.data.data.kpis.dau}}`
- MAU: `{{ExecutiveSummary.data.data.kpis.mau}}`
- Stickiness: `{{DashboardFormatters.percent(ExecutiveSummary.data.data.kpis.stickiness_pct)}}`

### Acquisition & Churn

- Line chart: `AcquisitionSummary.data.data.installs_trend`, X=`date`, Y=`installs`.
- Tables: `{{AcquisitionSummary.data.data.traffic_sources}}`, `{{AcquisitionSummary.data.data.campaigns}}`, and `{{AcquisitionSummary.data.data.countries}}`.

### Onboarding Health

- Funnel/bar chart: `{{OnboardingSummary.data.data.funnel}}`, category=`stage`, value=`users`.
- Step diagnostics: `{{OnboardingSummary.data.data.step_diagnostics}}`.
- Cards: `tutorial_started`, `tutorial_completed`, and `completion_rate_pct` from `OnboardingSummary.data.data.kpis`.

### Core Gameplay & Balancing

- Level table: `{{GameplaySummary.data.data.level_performance}}`.
- New vs Returning chart: `{{GameplaySummary.data.data.new_returning_by_level}}`.
- Hint trend: `{{GameplaySummary.data.data.hint_trend}}`.

### Retention Dashboard

- KPI cards from `RetentionSummary.data.data.kpis`: `dau`, `wau`, `mau`, `stickiness_pct`, and Day 1/3/7/15 retention values.
- Exact Day-N cohort table: `{{RetentionSummary.data.data.cohort_grid}}`.
- Rolling retention table: `{{RetentionSummary.data.data.rolling_retention_table}}`.
- Daily activity chart: `{{RetentionSummary.data.data.daily_activity}}`.

## 5. Styling

- Install/positive: green `#2E7D32`
- Uninstall/negative/drop-off: red `#C62828`
- Active/DAU: blue `#1565C0`
- Completion/skip bars: orange `#EF6C00`
- Match-made/failed: purple `#6A1B9A`
- KPI background: `#F3F4F6`; number 28–36 px bold; label 12–14 px grey

Place a Skeleton widget over each chart and set **Visible** to `{{QueryName.isLoading}}`. Set the chart/container Visible property to `{{!QueryName.isLoading}}`.

## 6. Important metric notes

Show a tooltip for Observed Churn explaining it is a returning-user-share proxy. Show `N/A` for direct uninstall data when `app_remove` is absent. Label never-played and drop-off users as GA4-only proxies; exact user exclusion needs BigQuery.

