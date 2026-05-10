"""Per-user insights snapshot helpers.

Pure-Python — no Firestore calls inside the compute helpers so they're easy
to unit-test. The orchestrator `build_full_snapshot()` does the I/O and calls
the helpers with plain dicts.

Snapshot layout (single doc at users/{uid}/insights/snapshot):

    demographics, preferences, plan, totals, recent, streaks,
    consistency, personalRecords, weightTrend, achievements, flags

Triggers in main.py refresh subsections of this doc; the bootstrap callable
rebuilds it from scratch.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional

SCHEMA_VERSION = 1

GOAL_LABELS: Dict[str, str] = {
    "lose_weight": "lose weight",
    "build_muscle": "build muscle",
    "stay_fit": "stay fit",
    "increase_endurance": "increase endurance",
    "improve_flexibility": "improve flexibility",
}


# ---------- Date helpers ----------


def _to_dt(value: Any) -> Optional[datetime]:
    """Coerce a Firestore timestamp / ISO string / None into a UTC datetime."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    # Firestore client returns DatetimeWithNanoseconds which is a datetime subclass,
    # so the isinstance check above usually covers it. ISO strings as fallback:
    if isinstance(value, str):
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except ValueError:
            return None
    return None


def _iso_date(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    return dt.astimezone(timezone.utc).date().isoformat()


def _days_between(later: datetime, earlier: datetime) -> int:
    return (later.date() - earlier.date()).days


# ---------- Compute helpers (pure) ----------


def compute_streaks(workouts: List[Dict[str, Any]]) -> Dict[str, int]:
    """Return {'current': int, 'longest': int} from a list of workout dicts.

    A 'streak' is consecutive calendar days with at least one logged workout.
    `workouts` may be unsorted; we tolerate missing or malformed completedAt.
    """
    days = set()
    for w in workouts:
        dt = _to_dt(w.get("completedAt"))
        if dt is not None:
            days.add(dt.astimezone(timezone.utc).date())

    if not days:
        return {"current": 0, "longest": 0}

    sorted_days = sorted(days)

    # Longest run.
    longest = 1
    run = 1
    for i in range(1, len(sorted_days)):
        if (sorted_days[i] - sorted_days[i - 1]).days == 1:
            run += 1
            longest = max(longest, run)
        else:
            run = 1

    # Current streak: ending at today or yesterday.
    today = datetime.now(timezone.utc).date()
    last = sorted_days[-1]
    if (today - last).days > 1:
        current = 0
    else:
        current = 1
        for i in range(len(sorted_days) - 2, -1, -1):
            if (sorted_days[i + 1] - sorted_days[i]).days == 1:
                current += 1
            else:
                break

    return {"current": current, "longest": longest}


def compute_consistency(
    workouts: List[Dict[str, Any]], days_per_week: int
) -> Dict[str, Any]:
    """Adherence over the last 30 days vs the user's plan target."""
    if days_per_week <= 0:
        return {"adherence30d": 0.0, "label": "behind"}

    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    recent_count = sum(
        1
        for w in workouts
        if (dt := _to_dt(w.get("completedAt"))) is not None and dt >= cutoff
    )
    expected = days_per_week * (30 / 7)
    ratio = recent_count / expected if expected > 0 else 0.0

    if ratio >= 1.0:
        label = "ahead"
    elif ratio >= 0.75:
        label = "on-track"
    else:
        label = "behind"

    return {"adherence30d": round(ratio, 2), "label": label}


def compute_recent(workouts: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Window-aggregated counts for the last 7 and 30 days."""
    now = datetime.now(timezone.utc)
    cutoff_7 = now - timedelta(days=7)
    cutoff_30 = now - timedelta(days=30)

    last7_workouts = 0
    last7_minutes = 0
    last30_workouts = 0
    last30_minutes = 0
    last_completed: Optional[datetime] = None

    for w in workouts:
        dt = _to_dt(w.get("completedAt"))
        if dt is None:
            continue
        minutes = int(w.get("durationMin") or 0)
        if dt >= cutoff_7:
            last7_workouts += 1
            last7_minutes += minutes
        if dt >= cutoff_30:
            last30_workouts += 1
            last30_minutes += minutes
        if last_completed is None or dt > last_completed:
            last_completed = dt

    return {
        "last7d": {"workouts": last7_workouts, "minutes": last7_minutes},
        "last30d": {
            "workouts": last30_workouts,
            "minutes": last30_minutes,
            # 'missedSessions' would require knowing the planned schedule per day;
            # leave as 0 here, refine later when we map the plan calendar.
            "missedSessions": 0,
        },
        "lastWorkoutAt": _iso_date(last_completed),
    }


def compute_totals(workouts: List[Dict[str, Any]]) -> Dict[str, int]:
    """Lifetime aggregates across every logged workout."""
    minutes = 0
    calories = 0
    xp = 0
    for w in workouts:
        minutes += int(w.get("durationMin") or 0)
        calories += int(w.get("caloriesKcal") or 0)
        xp += int(w.get("xp") or 0)
    return {
        "workouts": len(workouts),
        "minutesAllTime": minutes,
        "caloriesAllTime": calories,
        "xpAllTime": xp,
    }


def compute_personal_records(
    workouts: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Top weight per exercise across every logged set, capped at 10 entries."""
    best: Dict[str, Dict[str, Any]] = {}
    for w in workouts:
        completed_at = _iso_date(_to_dt(w.get("completedAt")))
        for ex in w.get("exercises") or []:
            name = ex.get("name")
            if not name:
                continue
            weight = ex.get("weightKg")
            if weight is None:
                continue
            try:
                weight_f = float(weight)
            except (TypeError, ValueError):
                continue
            if weight_f <= 0:
                continue
            existing = best.get(name)
            if existing is None or weight_f > existing["weightKg"]:
                best[name] = {
                    "exercise": name,
                    "weightKg": weight_f,
                    "reps": int(ex.get("actualSets") or ex.get("plannedReps") or 0),
                    "achievedAt": completed_at,
                }

    return sorted(best.values(), key=lambda r: r["weightKg"], reverse=True)[:10]


def compute_weight_trend(
    measurements: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Body-weight trajectory over the last 30 days."""
    entries: List[Dict[str, Any]] = []
    for m in measurements:
        dt = _to_dt(m.get("recordedAt") or m.get("createdAt") or m.get("date"))
        weight = m.get("weightKg") or m.get("value")
        if dt is None or weight is None:
            continue
        try:
            entries.append({"dt": dt, "weight": float(weight)})
        except (TypeError, ValueError):
            continue

    if not entries:
        return {
            "current": None,
            "thirtyDaysAgo": None,
            "deltaKg": 0.0,
            "deltaPercent": 0.0,
            "direction": "flat",
        }

    entries.sort(key=lambda e: e["dt"])
    current = entries[-1]["weight"]

    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    older = [e for e in entries if e["dt"] <= cutoff]
    baseline = older[-1]["weight"] if older else entries[0]["weight"]

    delta = current - baseline
    pct = (delta / baseline * 100) if baseline else 0.0
    if abs(delta) < 0.3:
        direction = "flat"
    elif delta > 0:
        direction = "up"
    else:
        direction = "down"

    return {
        "current": round(current, 2),
        "thirtyDaysAgo": round(baseline, 2),
        "deltaKg": round(delta, 2),
        "deltaPercent": round(pct, 2),
        "direction": direction,
    }


def compute_plan_summary(plan_doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Compress a plan document into a few headline numbers + muscle split."""
    if not plan_doc:
        return None
    profile = plan_doc.get("profile") or {}
    days = plan_doc.get("days") or []
    total_exercises = sum(len(d.get("exercises") or []) for d in days)
    muscle_split: Dict[str, int] = {}
    for d in days:
        for ex in d.get("exercises") or []:
            for m in ex.get("primaryMuscles") or []:
                key = str(m).lower()
                muscle_split[key] = muscle_split.get(key, 0) + 1

    return {
        "id": plan_doc.get("id"),
        "createdAt": _iso_date(_to_dt(plan_doc.get("createdAt"))),
        "daysPerWeek": int(profile.get("daysPerWeek") or len(days)),
        "level": profile.get("level"),
        "goal": profile.get("goal"),
        "totalExercises": total_exercises,
        "muscleSplit": muscle_split,
    }


def compute_demographics(profile: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "age": profile.get("age"),
        "gender": profile.get("gender"),
        "heightCm": profile.get("heightCm"),
        "weightKg": profile.get("weightKg"),
        "fitnessLevel": profile.get("fitnessLevel"),
        "primaryGoal": profile.get("primaryGoal"),
    }


def compute_preferences(profile: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "equipment": profile.get("equipment"),
        "daysPerWeek": profile.get("daysPerWeek"),
        "sessionMinutes": profile.get("sessionMinutes"),
        "weightUnit": profile.get("weightUnit") or "kg",
        "distanceUnit": profile.get("distanceUnit") or "km",
    }


def compute_achievements(unlocked: List[Dict[str, Any]]) -> Dict[str, Any]:
    sorted_unlocked = sorted(
        unlocked,
        key=lambda a: _to_dt(a.get("unlockedAt") or a.get("createdAt"))
        or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    recent_ids = [str(a.get("id") or a.get("achievementId") or "") for a in sorted_unlocked[:5]]
    recent_ids = [i for i in recent_ids if i]
    return {"unlockedCount": len(unlocked), "recent": recent_ids}


def compute_flags(
    profile: Dict[str, Any],
    workouts: List[Dict[str, Any]],
    measurements: List[Dict[str, Any]],
    personal_records: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Pre-derived booleans the chatbot can latch onto without re-deriving."""
    now = datetime.now(timezone.utc)

    plan_start = _to_dt(profile.get("planStartDate"))
    if plan_start:
        training_age = max(0, _days_between(now, plan_start))
    else:
        # No first workout yet → use account age proxy (createdAt) or 0.
        created = _to_dt(profile.get("createdAt"))
        training_age = _days_between(now, created) if created else 0

    is_new = training_age <= 7 or len(workouts) < 3

    # missedLastSession: yesterday was a planned day but no workout was logged.
    last_workout_dt = max(
        (
            dt
            for w in workouts
            if (dt := _to_dt(w.get("completedAt"))) is not None
        ),
        default=None,
    )
    if last_workout_dt is None:
        missed_last = bool(plan_start and training_age >= 2)
    else:
        missed_last = _days_between(now, last_workout_dt) >= 2

    # Weigh-in nudge: > 7 days since last weight log.
    last_weight_dt: Optional[datetime] = None
    for m in measurements:
        dt = _to_dt(m.get("recordedAt") or m.get("createdAt") or m.get("date"))
        if dt is not None and (last_weight_dt is None or dt > last_weight_dt):
            last_weight_dt = dt
    needs_weighin = last_weight_dt is None or _days_between(now, last_weight_dt) >= 7

    # hasStalled: top PR hasn't moved in 21 days.
    has_stalled = False
    if personal_records:
        top = personal_records[0]
        achieved_at = _to_dt(top.get("achievedAt"))
        if achieved_at and _days_between(now, achieved_at) >= 21:
            has_stalled = True

    return {
        "trainingAgeDays": training_age,
        "isNewUser": is_new,
        "hasStalled": has_stalled,
        "missedLastSession": missed_last,
        "needsWeighIn": needs_weighin,
    }


# ---------- Full-rebuild orchestrator ----------


def build_full_snapshot(uid: str, db: Any) -> Dict[str, Any]:
    """Read every source collection for `uid` and return the full snapshot dict.

    Used by the bootstrap callable for back-filling existing users. Triggers
    typically refresh only one section, but this is the source of truth for
    "what does a complete snapshot look like?".
    """
    user_ref = db.collection("users").document(uid)

    profile_snap = user_ref.get()
    profile: Dict[str, Any] = profile_snap.to_dict() if profile_snap.exists else {}

    workouts_query = user_ref.collection("workouts")
    workouts: List[Dict[str, Any]] = [w.to_dict() | {"id": w.id} for w in workouts_query.stream()]

    measurements_query = user_ref.collection("measurements")
    measurements: List[Dict[str, Any]] = [
        m.to_dict() | {"id": m.id} for m in measurements_query.stream()
    ]

    achievements_query = user_ref.collection("achievements")
    achievements: List[Dict[str, Any]] = [
        a.to_dict() | {"id": a.id} for a in achievements_query.stream()
    ]

    plan_id = profile.get("currentPlanId")
    plan_doc: Optional[Dict[str, Any]] = None
    if plan_id:
        plan_snap = user_ref.collection("plans").document(plan_id).get()
        if plan_snap.exists:
            plan_doc = plan_snap.to_dict() | {"id": plan_snap.id}

    days_per_week = int(profile.get("daysPerWeek") or 0)

    totals = compute_totals(workouts)
    recent = compute_recent(workouts)
    streaks = compute_streaks(workouts)
    consistency = compute_consistency(workouts, days_per_week)
    prs = compute_personal_records(workouts)
    weight_trend = compute_weight_trend(measurements)
    plan_summary = compute_plan_summary(plan_doc)
    demographics = compute_demographics(profile)
    preferences = compute_preferences(profile)
    ach_summary = compute_achievements(achievements)
    flags = compute_flags(profile, workouts, measurements, prs)

    return {
        "userId": uid,
        "schemaVersion": SCHEMA_VERSION,
        "demographics": demographics,
        "preferences": preferences,
        "plan": plan_summary,
        "totals": totals,
        "recent": recent,
        "streaks": streaks,
        "consistency": consistency,
        "personalRecords": prs,
        "weightTrend": weight_trend,
        "achievements": ach_summary,
        "flags": flags,
    }


# ---------- Section-level refresh helpers used by triggers ----------
#
# These read just enough source data to recompute a single section, keeping
# trigger latency and read counts small.


def refresh_workout_sections(uid: str, db: Any) -> Dict[str, Any]:
    user_ref = db.collection("users").document(uid)
    profile = (user_ref.get().to_dict() or {})
    workouts = [w.to_dict() | {"id": w.id} for w in user_ref.collection("workouts").stream()]
    measurements = [
        m.to_dict() | {"id": m.id} for m in user_ref.collection("measurements").stream()
    ]
    days_per_week = int(profile.get("daysPerWeek") or 0)
    prs = compute_personal_records(workouts)
    return {
        "totals": compute_totals(workouts),
        "recent": compute_recent(workouts),
        "streaks": compute_streaks(workouts),
        "consistency": compute_consistency(workouts, days_per_week),
        "personalRecords": prs,
        "flags": compute_flags(profile, workouts, measurements, prs),
    }


def refresh_measurement_sections(uid: str, db: Any) -> Dict[str, Any]:
    user_ref = db.collection("users").document(uid)
    profile = (user_ref.get().to_dict() or {})
    workouts = [w.to_dict() | {"id": w.id} for w in user_ref.collection("workouts").stream()]
    measurements = [
        m.to_dict() | {"id": m.id} for m in user_ref.collection("measurements").stream()
    ]
    prs = compute_personal_records(workouts)
    return {
        "weightTrend": compute_weight_trend(measurements),
        "flags": compute_flags(profile, workouts, measurements, prs),
    }


def refresh_profile_sections(uid: str, db: Any) -> Dict[str, Any]:
    user_ref = db.collection("users").document(uid)
    profile = user_ref.get().to_dict() or {}
    plan_id = profile.get("currentPlanId")
    plan_doc: Optional[Dict[str, Any]] = None
    if plan_id:
        plan_snap = user_ref.collection("plans").document(plan_id).get()
        if plan_snap.exists:
            plan_doc = plan_snap.to_dict() | {"id": plan_snap.id}

    return {
        "demographics": compute_demographics(profile),
        "preferences": compute_preferences(profile),
        "plan": compute_plan_summary(plan_doc),
    }


def refresh_achievement_sections(uid: str, db: Any) -> Dict[str, Any]:
    user_ref = db.collection("users").document(uid)
    achievements = [
        a.to_dict() | {"id": a.id} for a in user_ref.collection("achievements").stream()
    ]
    return {"achievements": compute_achievements(achievements)}


__all__ = [
    "SCHEMA_VERSION",
    "GOAL_LABELS",
    "build_full_snapshot",
    "compute_streaks",
    "compute_consistency",
    "compute_personal_records",
    "compute_weight_trend",
    "compute_plan_summary",
    "compute_demographics",
    "compute_preferences",
    "compute_achievements",
    "compute_flags",
    "compute_recent",
    "compute_totals",
    "refresh_workout_sections",
    "refresh_measurement_sections",
    "refresh_profile_sections",
    "refresh_achievement_sections",
]
