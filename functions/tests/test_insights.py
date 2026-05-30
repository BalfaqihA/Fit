"""Unit tests for the pure insights helpers (spec feature_plan §10.1).

No Firestore — every helper under test takes plain dicts/lists.
Run: cd functions && python -m pytest
"""

import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import insights  # noqa: E402

UTC = timezone.utc


def _dt(y, m, d):
    return datetime(y, m, d, 12, 0, tzinfo=UTC)


# ---------- _week_start ----------


def test_week_start_is_monday_for_every_weekday():
    # 2024-05-13 is a Monday; 13..19 spans Mon..Sun.
    for day in range(13, 20):
        ws = insights._week_start(_dt(2024, 5, day))
        assert ws.weekday() == 0
        assert insights._iso_date(ws) == "2024-05-13"
    # Sunday must still map back to the same Monday (weekday() Sun == 6).
    assert insights._iso_date(insights._week_start(_dt(2024, 5, 19))) == "2024-05-13"


def test_week_end_is_sunday():
    ws = insights._week_start(_dt(2024, 5, 15))
    assert insights._iso_date(insights._week_end(ws)) == "2024-05-19"


# ---------- _exercise_calorie_split ----------


def test_calorie_split_all_tracked():
    w = {
        "caloriesKcal": 999,
        "exercises": [
            {"name": "A", "caloriesKcal": 100},
            {"name": "B", "caloriesKcal": 50},
        ],
    }
    out = insights._exercise_calorie_split(w)
    assert [(c, s) for _, c, s in out] == [(100.0, "tracked"), (50.0, "tracked")]


def test_calorie_split_effort_proportional():
    w = {
        "caloriesKcal": 300,
        "exercises": [
            {"name": "A", "actualSets": 3, "plannedReps": 10},  # effort 30
            {"name": "B", "actualSets": 1, "plannedReps": 10},  # effort 10
        ],
    }
    out = insights._exercise_calorie_split(w)
    cals = [round(c, 2) for _, c, _ in out]
    assert cals == [225.0, 75.0]
    assert all(src == "estimated" for _, _, src in out)


def test_calorie_split_equal_fallback_when_no_effort_or_calories():
    w = {"caloriesKcal": 100, "exercises": [{"name": "A"}, {"name": "B"}]}
    out = insights._exercise_calorie_split(w)
    # effort defaults to max(1,0)=1 each -> still an even split, estimated.
    assert [round(c, 2) for _, c, _ in out] == [50.0, 50.0]
    assert insights._exercise_calorie_split({"exercises": []}) == []


# ---------- compute_weekly_activity ----------


def test_weekly_activity_groups_and_picks_most_active_by_calories():
    workouts = [
        {"completedAt": _dt(2024, 5, 13), "durationMin": 30, "caloriesKcal": 300, "xp": 10},
        {"completedAt": _dt(2024, 5, 15), "durationMin": 20, "caloriesKcal": 200, "xp": 5},
        # Previous week — fewer calories.
        {"completedAt": _dt(2024, 5, 6), "durationMin": 60, "caloriesKcal": 100, "xp": 8},
    ]
    res = insights.compute_weekly_activity(workouts, days_per_week=3)
    ma = res["mostActiveWeek"]
    assert ma["weekStartIso"] == "2024-05-13"
    assert ma["caloriesKcal"] == 500
    assert ma["workouts"] == 2
    assert ma["activeDays"] == 2
    assert len(res["weeklyHistory"]) == 2


def test_weekly_activity_tiebreaks_calories_then_minutes():
    workouts = [
        {"completedAt": _dt(2024, 5, 13), "durationMin": 50, "caloriesKcal": 200},
        {"completedAt": _dt(2024, 5, 6), "durationMin": 10, "caloriesKcal": 200},
    ]
    res = insights.compute_weekly_activity(workouts)
    # Equal calories -> the week with more minutes wins.
    assert res["mostActiveWeek"]["weekStartIso"] == "2024-05-13"


def test_weekly_activity_empty_has_zeroed_live_week_and_no_most_active():
    res = insights.compute_weekly_activity([], days_per_week=4)
    cw = res["currentWeek"]
    assert cw["workouts"] == 0
    assert cw["caloriesKcal"] == 0
    assert cw["topDay"] is None
    assert cw["plannedWorkouts"] == 4
    assert res["mostActiveWeek"] is None
    assert res["weeklyHistory"] == []


def test_weekly_activity_current_week_populated_for_this_weeks_workout():
    now = datetime.now(UTC)
    monday = now - timedelta(days=now.weekday())
    workouts = [{"completedAt": monday, "durationMin": 25, "caloriesKcal": 150}]
    res = insights.compute_weekly_activity(workouts, days_per_week=5)
    cw = res["currentWeek"]
    assert cw["workouts"] == 1
    assert cw["caloriesKcal"] == 150
    assert cw["adherencePercent"] == 20  # 1/5


def test_weekly_activity_top_day_is_highest_calorie_day():
    workouts = [
        {"completedAt": _dt(2024, 5, 13), "durationMin": 10, "caloriesKcal": 100},
        {"completedAt": _dt(2024, 5, 15), "durationMin": 40, "caloriesKcal": 400},
    ]
    res = insights.compute_weekly_activity(workouts)
    top = res["mostActiveWeek"]["topDay"]
    assert top["dateIso"] == "2024-05-15"
    assert top["caloriesKcal"] == 400


# ---------- compute_exercise_leaderboard ----------


def test_exercise_leaderboard_aggregates_and_contribution():
    workouts = [
        {
            "completedAt": _dt(2024, 5, 13),
            "caloriesKcal": 300,
            "exercises": [
                {
                    "exerciseId": "Pushups",
                    "name": "Pushups",
                    "primaryMuscle": "chest",
                    "actualSets": 3,
                    "plannedReps": 10,
                    "caloriesKcal": 200,
                    "xp": 20,
                },
                {
                    "exerciseId": "Squat",
                    "name": "Squat",
                    "primaryMuscle": "legs",
                    "actualSets": 3,
                    "plannedReps": 10,
                    "caloriesKcal": 100,
                    "xp": 10,
                },
            ],
        }
    ]
    lb = insights.compute_exercise_leaderboard(workouts)
    assert lb[0]["name"] == "Pushups"
    assert lb[0]["totalCaloriesKcal"] == 200
    assert lb[0]["totalReps"] == 30  # 3 sets * 10 reps
    assert lb[0]["calorieSource"] == "tracked"
    total = sum(e["contributionPercent"] for e in lb)
    assert abs(total - 100.0) < 0.5


# ---------- compute_muscle_leaderboard ----------


def test_muscle_leaderboard_groups_by_primary_muscle():
    workouts = [
        {
            "completedAt": _dt(2024, 5, 13),
            "caloriesKcal": 200,
            "exercises": [
                {"name": "A", "primaryMuscle": "Chest", "caloriesKcal": 120,
                 "actualSets": 3, "plannedReps": 10},
                {"name": "B", "primaryMuscle": "chest", "caloriesKcal": 80,
                 "actualSets": 2, "plannedReps": 8},
            ],
        }
    ]
    ml = insights.compute_muscle_leaderboard(workouts)
    assert len(ml) == 1
    assert ml[0]["muscle"] == "chest"
    assert ml[0]["exercises"] == 2
    assert ml[0]["sessions"] == 1
    assert ml[0]["totalCaloriesKcal"] == 200


# ---------- build_weight_update_insight ----------


def test_build_insight_single_measurement_no_workouts():
    measurements = [{"recordedAt": _dt(2024, 5, 15), "weightKg": 80.0}]
    res = insights.build_weight_update_insight(
        {"primaryGoal": "lose_weight"}, measurements, [], "m1", "u1"
    )
    assert res["weight"]["previousKg"] is None
    assert res["weight"]["deltaSinceLastKg"] == 0.0
    assert res["measurementId"] == "m1"
    assert res["userId"] == "u1"
    assert res["mostActiveWeek"] is None
    assert res["topExercises"] == []
    assert isinstance(res["weight"]["message"], str) and res["weight"]["message"]


def test_build_insight_goal_alignment_lose_weight_down_is_good():
    measurements = [
        {"recordedAt": datetime.now(UTC) - timedelta(days=40), "weightKg": 82.0},
        {"recordedAt": datetime.now(UTC), "weightKg": 79.0},
    ]
    res = insights.build_weight_update_insight(
        {"primaryGoal": "lose_weight"}, measurements, [], "m2", "u1"
    )
    assert res["weight"]["direction"] == "down"
    assert res["weight"]["goalAlignment"] == "good"


def test_goal_alignment_matrix():
    assert insights._goal_alignment("lose_weight", "up", 0.5) == "needs_attention"
    assert insights._goal_alignment("lose_weight", "flat", 0.0) == "neutral"
    assert insights._goal_alignment("build_muscle", "down", -1.5) == "needs_attention"
    assert insights._goal_alignment("build_muscle", "up", 0.4) == "good"
    assert insights._goal_alignment("stay_fit", "flat", 0.0) == "good"
    assert insights._goal_alignment("stay_fit", "down", -2.0) == "needs_attention"
    assert insights._goal_alignment(None, "up", 0.0) == "neutral"
