from app.services.alert_rules import evaluate_core_alerts, relative_change


def test_relative_change_handles_zero_baseline() -> None:
    assert relative_change(0, 0) == 0
    assert relative_change(5, 0) == 100


def test_evaluate_core_alerts_detects_core_drops() -> None:
    alerts = evaluate_core_alerts(
        current={
            "dau": 70,
            "day7_retention": 20,
            "onboarding_completion_rate": 65,
            "level_dropoff_rate": 40,
            "uninstalls": 12,
        },
        previous={
            "dau": 100,
            "day7_retention": 35,
            "onboarding_completion_rate": 80,
            "level_dropoff_rate": 20,
            "uninstalls": 5,
        },
    )

    codes = {alert["code"] for alert in alerts}
    assert {
        "DAU_DROP",
        "RETENTION_DROP",
        "ONBOARDING_COMPLETION_DROP",
        "LEVEL_DROPOFF_SPIKE",
        "CHURN_SPIKE",
    }.issubset(codes)


def test_evaluate_core_alerts_returns_empty_for_stable_metrics() -> None:
    alerts = evaluate_core_alerts(
        current={
            "dau": 98,
            "day1_retention": 42,
            "onboarding_completion_rate": 78,
            "level_dropoff_rate": 22,
        },
        previous={
            "dau": 100,
            "day1_retention": 43,
            "onboarding_completion_rate": 80,
            "level_dropoff_rate": 20,
        },
    )

    assert alerts == []
