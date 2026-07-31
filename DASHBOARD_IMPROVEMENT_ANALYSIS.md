# Sumlink Analytics Dashboard — Improvement Analysis

Generated: 2026-07-21

## What Was Improved Now

- Enabled data labels on all charts so managers can see exact values on bars/lines without guessing from the axis.
- Kept chart titles business-readable instead of technical GA4 names.
- Validated that every section is pulling from FastAPI backed by GA4 property `516899630`.
- Preserved filters across all pages: date range, app version, OS version, device model, country, and level.

## Dashboard Strength

The dashboard now answers the main manager questions:

- How many users are active?
- Where are users coming from?
- Where do users drop in onboarding?
- Which tutorial step has failure/skip/drop-off?
- Which levels are hard or losing users?
- How many users return after install?
- Which devices, countries, campaigns, and versions may need attention?

## Recommended Improvements by Page

### Executive Health

Current value:

- Good for top-level KPI review.
- Shows active users, new users, DAU, MAU, stickiness, engagement, sessions, and screen views.

Improve next:

- Add a small "Insight Summary" box:
  - Example: "DAU is down compared to previous 7 days."
  - Example: "Stickiness is low because MAU is high but daily return is low."
- Add previous-period comparison arrows for each KPI.
- Add DAU / WAU / MAU together here too, not only in Retention.

### Acquisition

Current value:

- Shows installs, app remove events, campaigns, traffic sources, country, device, and never-played proxy.

Improve next:

- Add a source quality score:
  - new users
  - sessions
  - engagement rate
  - tutorial started
  - level started
- Add a "bad acquisition source" table:
  - high installs
  - low tutorial start
  - high never-played rate
- Add daily source trend as separate series per source instead of one combined axis label.

### Onboarding

Current value:

- This is the most important manager page for tutorial improvement.
- It now includes funnel, drop-off %, failure, skip, average step time, and detailed tutorial step diagnostics.

Improve next:

- Add a real funnel/sankey style visual if Appsmith plugin support allows it.
- Add a "Worst Drop-off Step" insight card:
  - step name
  - users dropped
  - drop-off %
  - recommended action
- Add separate cards for:
  - Launch to Step 1 conversion
  - Step 1 drop-off users
  - Highest failed step
  - Highest skipped step
- Add reason mapping if events exist:
  - permission denied
  - app close
  - language selection abandoned
  - tutorial skipped
  - match failed

### Gameplay

Current value:

- Shows level starts, level completions, completion %, drop-off %, hint usage, add-row behavior, and average time by level.

Improve next:

- Add a level health table with color rules:
  - green: completion healthy
  - yellow: moderate drop-off
  - red: high drop-off or high hint usage
- Add "Hardest Levels" ranking:
  - highest drop-off %
  - highest average time
  - highest hints per completed user
- Add "Hint Impact" analysis:
  - users with hints vs users without hints
  - completion rate after hint use
- Add restart / rage quit events if tracked in GA4.

### Retention

Current value:

- Shows DAU, WAU, MAU, stickiness, engagement duration, sessions/user, and retention milestones.

Improve next:

- Add cohort table by install date:
  - D1
  - D3
  - D7
  - D14
  - D30
- Add retention by source/campaign:
  - which campaigns bring users who return
- Add retention by level reached:
  - users who reached level 1 vs level 5 vs level 10
- Add "stickiness benchmark" card:
  - current DAU/MAU
  - target
  - gap

## Event Tracking Improvements Needed

To make the dashboard even more perfect, add or verify these GA4 events in the game:

- `tutorial_step_started`
- `tutorial_step_completed`
- `tutorial_step_failed`
- `tutorial_step_skipped`
- `language_selected`
- `first_game_started`
- `level_started`
- `level_completed`
- `level_failed`
- `level_restarted`
- `hint_button_highlighted`
- `hint_button_clicked`
- `hint_used_successfully`
- `game_action` with `action_type=add_row`
- `app_remove`

Recommended event parameters:

- `step_number`
- `level_number`
- `time_taken`
- `failure_reason`
- `source_screen`
- `app_version`
- `os_version`
- `device_model`
- `country`

## Priority Order

1. Improve Onboarding page first.
2. Add insight/recommendation cards.
3. Add color-coded level health table.
4. Add cohort retention by install date/source.
5. Add previous-period comparison on all KPI cards.

## Manager-Focused Goal

The dashboard should not only show numbers. It should answer:

- What is going wrong?
- Where is it going wrong?
- How many users are affected?
- What should the team improve first?
