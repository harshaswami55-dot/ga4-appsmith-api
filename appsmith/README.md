# Build the Sumlink Appsmith dashboard

This is the supported step-by-step deliverable for Appsmith. It avoids embedding environment-specific datasource IDs that make handwritten export JSON unreliable.

## 1. Datasource

Create a REST datasource named `SumlinkAPI`:

- Development base URL: `http://host.docker.internal:8000/api`
- Render base URL: `https://<your-render-host>/api`
- Header: `X-API-Key: <the Render API_KEYS value>`

Never add the GA4 JSON to Appsmith.

## 2. Header filter bar

Create these widgets with exactly these names:

| Widget | Type | Value |
|---|---|---|
| `StartDatePicker` | DatePicker | Start of range |
| `EndDatePicker` | DatePicker | End of range |
| `AppVersionSelect` | Select | Empty means all |
| `NewReturningSelect` | Select | Empty, `new`, `returning` |
| `OSVersionSelect` | Select | Empty means all |
| `DeviceModelSelect` | Select | Empty means all |

Import/copy `JSObjects/GlobalFilters.js`, `ApiRunner.js`, and `DashboardFormatters.js` into Appsmith JS Objects. Bind every REST query parameter to:

```javascript
{{ GlobalFilters.params().startDate }}
{{ GlobalFilters.params().endDate }}
{{ GlobalFilters.params().appVersion }}
{{ GlobalFilters.params().newReturning }}
{{ GlobalFilters.params().osVersion }}
{{ GlobalFilters.params().deviceModel }}
```

On each Select widget's `onOptionChange` and DatePicker's `onDateSelected`, call the page query through `ApiRunner.run(QueryName)`. For a single scrolling dashboard, call `GlobalFilters.refreshAll()`.

## 3. Queries

Create the following GET queries. The names are used by the supplied JS Objects.

| Query name | Path |
|---|---|
| `getExecutiveHealth` | `/executive-health` |
| `getAcquisitionChurn` | `/acquisition-churn` |
| `getOnboardingFunnel` | `/onboarding-funnel` |
| `getTutorialFrustration` | `/tutorial-frustration` |
| `getGameplayBalancing` | `/gameplay-balancing` |
| `getLevelDifficulty` | `/level-difficulty` |
| `getRetention` | `/retention` |
| `getDauMau` | `/dau-mau` |
| `getTutorialSkip` | `/tutorial-skip` |
| `getNeverPlayed` | `/never-played` |

Disable automatic page-load execution and use `{{ ApiRunner.run(getExecutiveHealth) }}` (substitute the page query) as the page-load action. The helper retries during a Render Free cold start.

For `getLevelDifficulty`, add `page={{LevelTable.pageNo}}` and `pageSize={{LevelTable.pageSize}}`. Enable server-side pagination on the Table and run the query on page change.

## 4. Sections and bindings

### Executive Health

Create five grey KPI cards with a large bold value and small grey label:

- Active users: `{{getExecutiveHealth.data.kpis.activeUsers}}`
- New users: `{{getExecutiveHealth.data.kpis.newUsers}}`
- Avg Daily Stickiness: `{{DashboardFormatters.percent(getExecutiveHealth.data.kpis.avgDailyStickinessPct)}}`
- Engagement Rate: `{{DashboardFormatters.percent(getExecutiveHealth.data.kpis.engagementRatePct)}}`
- Observed Churn: `{{DashboardFormatters.percent(getExecutiveHealth.data.kpis.observedChurnPct)}}`

### Acquisition & Churn

- Line chart: `getAcquisitionChurn.data.installsVsUninstalls`, X=`date`, Y=`installs` and `uninstalls`.
- Table: `{{getAcquisitionChurn.data.trafficSourceQuality}}` with channel, engagement rate, sessions, engaged sessions.

### Onboarding Health

- Funnel/bar chart: `{{getOnboardingFunnel.data.funnel}}`, category=`eventName`, value=`eventCount`.
- Frustration trend: `{{getTutorialFrustration.data.frustrationTrend}}`.
- Cards: `frustratedUsers`, `frustrationRatePct`, `tutorialStarted` from `getTutorialFrustration.data.kpis`.

### Core Gameplay & Balancing

- New vs Returning chart: `{{getGameplayBalancing.data.newVsReturningByLevel}}`.
- Hint multi-line chart: `{{getGameplayBalancing.data.hintUsageByLevel}}`, lines=`highlighted`, `clicked`, `used`.

### Level Difficulty

- Table `LevelTable`: `{{getLevelDifficulty.data.table}}`.
- Total records: `{{getLevelDifficulty.data.pagination.totalRows}}`.
- Columns: levelNumber, started, completed, completionPct, dropOffUsers, dropOffPct.
- Difficulty combo and drop-off charts: `{{getLevelDifficulty.data.difficultyCurve}}`.

### Retention Dashboard

- Four cards from `getRetention.data.kpis`: newUsers, engagedSessions, activeUsers, sessions.
- New/returning trend: `{{getRetention.data.newVsReturningTrend}}`.
- Engagement chart: `{{getRetention.data.engagementOverTime}}`.
- Sessions chart: `{{getRetention.data.sessionsOverTime}}`.

### DAU/MAU

Use `{{getDauMau.data.trend}}` for three line charts:

- DAU: `dau`
- 28-day active users: `mau28`
- Stickiness: `stickinessPct`

### Tutorial diagnostics

- Match failure and completion visuals: combine `getTutorialFrustration` with onboarding funnel values.
- Skip/attempt combo: `{{getTutorialSkip.data.skipTrend}}`.
- Average time per step: `{{getTutorialSkip.data.averageTimePerStep}}`.
- Installed-never-played area chart: `{{getNeverPlayed.data.trend}}`, Y=`neverPlayedProxy`.

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

