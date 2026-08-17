# Prediction Baseline

The current predictive layer is a deployable baseline forecast, not a trained ML model.

## Method

- Pull GA4 daily trends for active users, new users, sessions, and screen views.
- Fit a simple linear trend over the selected date window.
- Project the next equal-length period.
- Assign confidence from history length and volatility.
- Mark risk when projected change is materially negative or unusually high.

## Why This Is Production-Safe

- It does not invent predictions without data.
- It exposes confidence and limitations with every response.
- It works today with the existing Render backend and Appsmith dashboard.
- It can be replaced later by a trained model after stable history accumulates.

## Endpoint

`GET /api/v1/predictions/summary`

## Manager Interpretation

Use predictions as an early warning input. Final decisions should also check retention, onboarding, acquisition, and gameplay alerts.
