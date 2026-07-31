# GA4 Validation Report

Generated: 2026-07-21
GA4 Property ID: 516899630
Default dashboard range: 30daysAgo to yesterday

## Result

- PASS: dashboard backend is connected to GA4.
- PASS: all five manager sections return live data through FastAPI.
- PASS: chart/table data sources are present for Executive, Acquisition, Onboarding, Gameplay, and Retention.
- PASS: calculated percentages were checked against the formulas used in the backend.
- PASS: backend test suite passed: 12 passed.

## Validated Sections

### Executive Health

- Active users: 2719
- New users: 2226
- Sessions: 8509
- Daily trend rows: 30
- Stickiness formula checked: DAU / MAU x 100 = 1.36%

Validated dashboard data:

- Daily Users: Active vs New
- DAU / MAU Stickiness Trend
- Session Activity vs Screen Views
- Executive KPI Mix
- Daily Executive Metrics table

### Acquisition

- Installs: 2226
- Uninstalls / app remove events: 2341
- Daily acquisition rows: 30
- Traffic source rows: 5
- Campaign rows: 7
- Country rows: 18
- Device model rows: 250

Validated dashboard data:

- Install vs App Remove Trend
- New Users by Campaign
- Traffic Source Quality: Sessions
- Daily New Users by Acquisition Source
- Installed but Never Played Proxy: Users and %
- Active Users by Country
- Active Users by Device Model

### Onboarding

- Tutorial started: 2168
- Tutorial completed: 1496
- Detailed funnel rows: 4
- Tutorial step diagnostic rows: 7
- Average tutorial time rows: 8
- Skip attempt trend rows: 22

Important Step 1 validation:

- Tutorial Step 1 reached users: 2161
- Tutorial Step 1 failed users: 0
- Tutorial Step 1 skipped users: 50
- Tutorial Step 1 drop-off users: 126

Validated dashboard data:

- Onboarding Funnel: First Open to First Level
- Onboarding Funnel Drop-off % by Stage
- Tutorial Frustration Trend
- Tutorial Step Reach vs Drop-off Users
- Failed vs Skipped Users by Tutorial Step
- Tutorial Step Rates: Completion, Failure, Skip
- Tutorial Skip Attempt Trend
- Average Time Taken by Tutorial Step
- Tutorial Step Diagnostics table

### Gameplay

- Level started: 15105
- Level completed: 12180
- Level performance rows: 524
- Hint trend rows: 30
- Add row trend rows: 30
- Hint usage events: 2159

Level 1 formula validation:

- Started: 3556
- Completed: 1978
- Drop-off users: 1578
- Completion rate: 55.62%

Validated dashboard data:

- Level Starts: New vs Returning Players
- Level Completion % vs Drop-off %
- Level Difficulty Curve: Started vs Completed Users
- Drop-off Users by Level
- Hint Usage by Level
- Hint Event Trend
- Hints per Completed User by Level
- Add Row Users Over Time
- Average Time Taken by Level
- Level Performance Details table

Hint event mapping used:

- Highlighted: `hint_button_highlighted`
- Clicked: `hint_button_clicked`
- Used successfully: `hint_used_successfully`

### Retention

- Daily activity rows: 30
- Retention curve rows: 31
- DAU: 37
- MAU: 2719
- Day 1 retention: 16.61% / 368 users
- Stickiness formula checked: DAU / MAU x 100 = 1.36%

Validated dashboard data:

- DAU / WAU / MAU Trend
- User Engagement Duration Trend
- DAU / MAU Stickiness Trend
- Retention Curve: Percent and Users
- Cohort Active Users by Retention Day
- Retention Milestones: D1 / D3 / D7 / D14 / D30
- Daily Activity table

## Notes

- Appsmith does not call GA4 directly.
- Flow validated: Appsmith -> FastAPI -> Google Analytics 4.
- The Appsmith import JSON includes safe fallback data from the live backend so the editor does not show blank widgets while Appsmith is loading or changing pages. The real source of truth remains the FastAPI GA4 API.
