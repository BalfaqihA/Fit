"""Cloud Function: generate a personalized workout plan for a FitLife user.

Reads `data/exercises.json` (deployed alongside this function), filters by the
user's onboarding answers, and writes the resulting plan to Firestore at:

  users/{uid}/plans/{planId}

Then sets `users/{uid}.currentPlanId` to point at the new plan.

Returns: { "planId": str }
"""

from __future__ import annotations

import json
import pathlib
import random
from typing import Any, Dict, List

from firebase_admin import firestore, initialize_app
from firebase_functions import https_fn, options

initialize_app()

_DATA: List[Dict[str, Any]] = json.loads(
    (pathlib.Path(__file__).parent / "data" / "exercises.json").read_text("utf-8")
)


# Mappings between the app's onboarding enums and the dataset's labels.
EQUIPMENT_MAP: Dict[str, List[str]] = {
    "body": ["bodyweight", "none"],
    "dumbbells": ["dumbbell", "dumbbells"],
    "barbell": ["barbell", "e z curl bar"],
    "bands": ["bands", "band"],
    "kettlebell": ["kettlebell"],
    # Full gym goers can use anything reasonable.
    "full-gym": [
        "machine",
        "cable",
        "barbell",
        "dumbbell",
        "kettlebell",
        "bodyweight",
        "other",
        "e z curl bar",
        "medicine_ball",
        "foam roll",
        "bands",
    ],
}


def _exercises_per_day(session_minutes: int) -> int:
    if session_minutes <= 30:
        return 5
    if session_minutes <= 45:
        return 6
    return 7


def _filter_pool(level: str, equipment: str) -> List[Dict[str, Any]]:
    eq_aliases = set(EQUIPMENT_MAP.get(equipment, [equipment]))
    pool: List[Dict[str, Any]] = []
    for ex in _DATA:
        ex_level = (ex.get("level") or "unknown").lower()
        ex_eq = (ex.get("equipment") or "unknown").lower()

        level_ok = ex_level in (level, "unknown")
        eq_ok = ex_eq in eq_aliases or equipment == "full-gym"

        if level_ok and eq_ok:
            pool.append(ex)
    return pool


def _default_sets(level: str) -> int:
    return 3 if level == "beginner" else 4


def _default_reps(goal: str, level: str) -> int:
    if goal == "build_muscle":
        return 12 if level != "beginner" else 10
    if goal == "increase_endurance":
        return 20
    if goal == "improve_flexibility":
        return 10
    if goal == "lose_weight":
        return 15
    return 12


@https_fn.on_call(
    region="us-central1",
    cors=options.CorsOptions(cors_origins="*", cors_methods=["POST"]),
)
def generate_plan(req: https_fn.CallableRequest) -> Dict[str, Any]:
    if req.auth is None:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.UNAUTHENTICATED, "Sign in required."
        )

    uid = req.auth.uid
    p = req.data or {}

    try:
        goal = str(p["goal"])
        level = str(p["level"]).lower()
        equipment = str(p["equipment"])
        days = int(p["daysPerWeek"])
        minutes = int(p["sessionMinutes"])
    except (KeyError, TypeError, ValueError) as exc:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            f"Missing or invalid field: {exc}",
        )

    if not (1 <= days <= 7) or not (5 <= minutes <= 240):
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            "daysPerWeek must be 1..7 and sessionMinutes 5..240.",
        )

    pool = _filter_pool(level, equipment)
    if len(pool) < days * _exercises_per_day(minutes):
        # Fall back to all exercises if the filter is too narrow.
        pool = list(_DATA)

    rng = random.Random(f"{uid}-{goal}-{level}-{equipment}-{days}-{minutes}")
    rng.shuffle(pool)

    n_per_day = _exercises_per_day(minutes)
    plan_days: List[Dict[str, Any]] = []
    cursor = 0

    for d in range(1, days + 1):
        day_exercises: List[Dict[str, Any]] = []
        attempts = 0
        while len(day_exercises) < n_per_day and attempts < len(pool) * 2:
            ex = pool[cursor % len(pool)]
            cursor += 1
            attempts += 1
            day_exercises.append(
                {
                    "exerciseId": ex["id"],
                    "name": ex["name"],
                    "sets": _default_sets(level),
                    "reps": _default_reps(goal, level),
                    "primaryMuscles": ex.get("primaryMuscles", []),
                    "secondaryMuscles": ex.get("secondaryMuscles", []),
                    "equipment": ex.get("equipment", ""),
                    "category": ex.get("category", ""),
                    "instructions": ex.get("instructions", []),
                    "images": ex.get("images", []),
                }
            )

        plan_days.append(
            {
                "day": d,
                "title": f"Day {d}",
                "estimatedMinutes": minutes,
                "exercises": day_exercises,
            }
        )

    db = firestore.client()
    plan_doc = {
        "userId": uid,
        "createdAt": firestore.SERVER_TIMESTAMP,
        "profile": {
            "goal": goal,
            "level": level,
            "equipment": equipment,
            "daysPerWeek": days,
            "sessionMinutes": minutes,
        },
        "days": plan_days,
    }

    plan_ref = db.collection("users").document(uid).collection("plans").document()
    plan_ref.set(plan_doc)

    db.collection("users").document(uid).set(
        {
            "currentPlanId": plan_ref.id,
            "updatedAt": firestore.SERVER_TIMESTAMP,
        },
        merge=True,
    )

    return {"planId": plan_ref.id}
