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
# Bumped independently of SCHEMA_VERSION — the weight-update insight lives in a
# separate doc (users/{uid}/insights/latestWeightUpdate).
WEIGHT_UPDATE_SCHEMA_VERSION = 1

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


def _week_start(dt: datetime) -> datetime:
    """Monday 00:00 UTC of the week containing `dt` (weekday(): Mon=0..Sun=6)."""
    d = dt.astimezone(timezone.utc)
    monday = d.date() - timedelta(days=d.weekday())
    return datetime(monday.year, monday.month, monday.day, tzinfo=timezone.utc)


def _week_end(week_start_dt: datetime) -> datetime:
    """Sunday of the week (the Monday `week_start_dt` belongs to)."""
    return week_start_dt + timedelta(days=6)


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


# ---------- Weight-update insight (pure) ----------


def _exercise_calorie_split(
    workout: Dict[str, Any],
) -> List[tuple]:
    """Attribute a session's calories to its exercises.

    Returns a list of (exercise_dict, calories_float, source) where source is
    'tracked' (per-exercise calories present on every row) or 'estimated'
    (effort-proportional split, falling back to an equal split). Never raises
    or divides by zero — robust to all-missing data.
    """
    exs = workout.get("exercises") or []
    n = len(exs)
    if n == 0:
        return []
    try:
        session_cal = float(workout.get("caloriesKcal") or 0)
    except (TypeError, ValueError):
        session_cal = 0.0

    if all(ex.get("caloriesKcal") is not None for ex in exs):
        out = []
        for ex in exs:
            try:
                out.append((ex, float(ex.get("caloriesKcal") or 0), "tracked"))
            except (TypeError, ValueError):
                out.append((ex, 0.0, "tracked"))
        return out

    efforts = [
        max(1, int(ex.get("actualSets") or 0) * int(ex.get("plannedReps") or 0))
        for ex in exs
    ]
    total = sum(efforts)
    if session_cal > 0 and total > 0:
        return [
            (ex, session_cal * (e / total), "estimated")
            for ex, e in zip(exs, efforts)
        ]
    per = (session_cal / n) if n else 0.0
    return [(ex, per, "estimated") for ex in exs]


def _empty_week(week_start_dt: datetime, days_per_week: int = 0) -> Dict[str, Any]:
    week = {
        "weekStartIso": _iso_date(week_start_dt),
        "weekEndIso": _iso_date(_week_end(week_start_dt)),
        "workouts": 0,
        "activeDays": 0,
        "minutes": 0,
        "caloriesKcal": 0,
        "xp": 0,
        "topDay": None,
    }
    if days_per_week:
        week["plannedWorkouts"] = days_per_week
        week["adherencePercent"] = 0
    return week


def compute_weekly_activity(
    workouts: List[Dict[str, Any]], days_per_week: int = 0
) -> Dict[str, Any]:
    """Group workouts into Monday-anchored weeks.

    Returns {currentWeek, mostActiveWeek, weeklyHistory}. `currentWeek` always
    exists (zeroed over the live Mon-Sun range if there were no workouts this
    week). `mostActiveWeek` is None only when there are no workouts at all.
    """
    now = datetime.now(timezone.utc)
    live_ws = _week_start(now)
    live_key = _iso_date(live_ws)

    weeks: Dict[str, Dict[str, Any]] = {}
    for w in workouts:
        dt = _to_dt(w.get("completedAt"))
        if dt is None:
            continue
        ws = _week_start(dt)
        key = _iso_date(ws)
        day_key = _iso_date(dt)
        minutes = int(w.get("durationMin") or 0)
        calories = int(w.get("caloriesKcal") or 0)
        xp = int(w.get("xp") or 0)

        bucket = weeks.get(key)
        if bucket is None:
            bucket = {
                "weekStartIso": key,
                "weekEndIso": _iso_date(_week_end(ws)),
                "workouts": 0,
                "_activeDays": set(),
                "minutes": 0,
                "caloriesKcal": 0,
                "xp": 0,
                "_days": {},
            }
            weeks[key] = bucket

        bucket["workouts"] += 1
        bucket["_activeDays"].add(day_key)
        bucket["minutes"] += minutes
        bucket["caloriesKcal"] += calories
        bucket["xp"] += xp

        day = bucket["_days"].get(day_key)
        if day is None:
            day = {"dateIso": day_key, "minutes": 0, "caloriesKcal": 0, "workouts": 0}
            bucket["_days"][day_key] = day
        day["minutes"] += minutes
        day["caloriesKcal"] += calories
        day["workouts"] += 1

    def _finalize(bucket: Dict[str, Any]) -> Dict[str, Any]:
        days = list(bucket["_days"].values())
        top_day = None
        if days:
            top_day = sorted(
                days,
                key=lambda d: (d["caloriesKcal"], d["minutes"], d["dateIso"]),
                reverse=True,
            )[0]
        return {
            "weekStartIso": bucket["weekStartIso"],
            "weekEndIso": bucket["weekEndIso"],
            "workouts": bucket["workouts"],
            "activeDays": len(bucket["_activeDays"]),
            "minutes": bucket["minutes"],
            "caloriesKcal": bucket["caloriesKcal"],
            "xp": bucket["xp"],
            "topDay": top_day,
        }

    finalized = {k: _finalize(v) for k, v in weeks.items()}

    # Current week.
    if live_key in finalized:
        current_week = dict(finalized[live_key])
    else:
        current_week = _empty_week(live_ws)
    if days_per_week:
        current_week["plannedWorkouts"] = days_per_week
        current_week["adherencePercent"] = round(
            100 * min(1.0, current_week["workouts"] / days_per_week)
        )

    # Most active week: calories, then minutes, then workouts, then recency.
    most_active = None
    if finalized:
        ordered = sorted(
            finalized.values(),
            key=lambda wk: (
                wk["caloriesKcal"],
                wk["minutes"],
                wk["workouts"],
                wk["weekStartIso"],
            ),
            reverse=True,
        )
        most_active = dict(ordered[0])
        count = len(finalized)
        avg_minutes = sum(wk["minutes"] for wk in finalized.values()) / count
        avg_active = sum(wk["activeDays"] for wk in finalized.values()) / count
        bits = []
        if most_active["minutes"] >= avg_minutes:
            bits.append("workout duration")
        if most_active["activeDays"] >= avg_active:
            bits.append("active days")
        if bits and count > 1:
            most_active["reason"] = (
                "This was your strongest week because your "
                + " and ".join(bits)
                + " were higher than your average."
            )
        else:
            most_active["reason"] = "This was your highest calorie-burning week."

    weekly_history = sorted(
        finalized.values(), key=lambda wk: wk["weekStartIso"], reverse=True
    )[:12]

    return {
        "currentWeek": current_week,
        "mostActiveWeek": most_active,
        "weeklyHistory": weekly_history,
    }


def compute_exercise_leaderboard(
    workouts: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Top 10 exercises by total (tracked or estimated) calories burned."""
    agg: Dict[str, Dict[str, Any]] = {}
    for w in workouts:
        completed_at = _iso_date(_to_dt(w.get("completedAt")))
        for ex, cal, source in _exercise_calorie_split(w):
            name = str(ex.get("name") or "").strip()
            ex_id = ex.get("exerciseId")
            key = ex_id or name.lower()
            if not key:
                continue
            row = agg.get(key)
            if row is None:
                row = {
                    "exerciseId": ex_id,
                    "name": name or key,
                    "primaryMuscle": ex.get("primaryMuscle"),
                    "category": ex.get("category"),
                    "equipment": ex.get("equipment"),
                    "timesCompleted": 0,
                    "totalSets": 0,
                    "totalReps": 0,
                    "totalDurationMin": 0.0,
                    "totalCaloriesKcal": 0.0,
                    "totalXp": 0,
                    "_rpe": [],
                    "bestWeightKg": None,
                    "lastPerformedAt": None,
                    "_allTracked": True,
                }
                agg[key] = row

            sets = int(ex.get("actualSets") or 0)
            reps_each = int(ex.get("actualReps") or ex.get("plannedReps") or 0)
            row["timesCompleted"] += 1
            row["totalSets"] += sets
            row["totalReps"] += sets * reps_each
            try:
                dur = float(
                    ex.get("durationMin")
                    if ex.get("durationMin") is not None
                    else (int(ex.get("durationSec") or 0) / 60)
                )
            except (TypeError, ValueError):
                dur = 0.0
            row["totalDurationMin"] += dur
            row["totalCaloriesKcal"] += cal
            row["totalXp"] += int(ex.get("xp") or 0)
            if source != "tracked":
                row["_allTracked"] = False
            rpe = ex.get("rpe")
            if rpe is not None:
                try:
                    row["_rpe"].append(float(rpe))
                except (TypeError, ValueError):
                    pass
            weight = ex.get("weightKg")
            if weight is not None:
                try:
                    wf = float(weight)
                    if row["bestWeightKg"] is None or wf > row["bestWeightKg"]:
                        row["bestWeightKg"] = wf
                except (TypeError, ValueError):
                    pass
            if completed_at and (
                row["lastPerformedAt"] is None
                or completed_at > row["lastPerformedAt"]
            ):
                row["lastPerformedAt"] = completed_at

    grand_total = sum(r["totalCaloriesKcal"] for r in agg.values()) or 0.0
    out: List[Dict[str, Any]] = []
    for r in agg.values():
        rpe_list = r.pop("_rpe")
        all_tracked = r.pop("_allTracked")
        out.append(
            {
                "exerciseId": r["exerciseId"],
                "name": r["name"],
                "primaryMuscle": r["primaryMuscle"],
                "category": r["category"],
                "equipment": r["equipment"],
                "timesCompleted": r["timesCompleted"],
                "totalSets": r["totalSets"],
                "totalReps": r["totalReps"],
                "totalDurationMin": round(r["totalDurationMin"], 1),
                "totalCaloriesKcal": round(r["totalCaloriesKcal"]),
                "totalXp": r["totalXp"],
                "avgRpe": round(sum(rpe_list) / len(rpe_list), 1)
                if rpe_list
                else None,
                "bestWeightKg": r["bestWeightKg"],
                "lastPerformedAt": r["lastPerformedAt"],
                "contributionPercent": round(
                    (r["totalCaloriesKcal"] / grand_total * 100), 1
                )
                if grand_total > 0
                else 0.0,
                "calorieSource": "tracked" if all_tracked else "estimated",
            }
        )

    return sorted(
        out,
        key=lambda r: (r["totalCaloriesKcal"], r["timesCompleted"], r["totalXp"]),
        reverse=True,
    )[:10]


def compute_muscle_leaderboard(
    workouts: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Top 8 trained muscle groups by total calories burned."""
    agg: Dict[str, Dict[str, Any]] = {}
    for w in workouts:
        seen_in_session: set = set()
        for ex, cal, _src in _exercise_calorie_split(w):
            muscle = str(ex.get("primaryMuscle") or "").strip().lower()
            if not muscle:
                continue
            row = agg.get(muscle)
            if row is None:
                row = {
                    "muscle": muscle,
                    "sessions": 0,
                    "exercises": 0,
                    "totalCaloriesKcal": 0.0,
                    "totalSets": 0,
                    "totalReps": 0,
                }
                agg[muscle] = row
            sets = int(ex.get("actualSets") or 0)
            reps_each = int(ex.get("actualReps") or ex.get("plannedReps") or 0)
            row["exercises"] += 1
            row["totalCaloriesKcal"] += cal
            row["totalSets"] += sets
            row["totalReps"] += sets * reps_each
            if muscle not in seen_in_session:
                row["sessions"] += 1
                seen_in_session.add(muscle)

    out = [
        {**r, "totalCaloriesKcal": round(r["totalCaloriesKcal"])}
        for r in agg.values()
    ]
    return sorted(
        out, key=lambda r: r["totalCaloriesKcal"], reverse=True
    )[:8]


def _goal_alignment(goal: Optional[str], direction: str, delta_since: float) -> str:
    if goal == "lose_weight":
        if direction == "down":
            return "good"
        if direction == "flat":
            return "neutral"
        return "needs_attention"
    if goal == "build_muscle":
        if delta_since <= -1.0:
            return "needs_attention"
        return "good" if direction == "up" else "neutral"
    if goal == "stay_fit":
        if direction == "flat":
            return "good"
        return "neutral" if abs(delta_since) < 1.0 else "needs_attention"
    return "neutral"


def _weight_message(
    current_kg: Optional[float],
    delta_since: float,
    current_week: Dict[str, Any],
    most_active: Optional[Dict[str, Any]],
    top_exercise: Optional[Dict[str, Any]],
) -> str:
    parts: List[str] = []
    if current_kg is not None:
        if abs(delta_since) < 0.05:
            parts.append(
                f"Your weight is now {round(current_kg, 1)} kg, unchanged "
                "from your last weigh-in."
            )
        else:
            word = "down" if delta_since < 0 else "up"
            parts.append(
                f"Your weight is now {round(current_kg, 1)} kg, {word} "
                f"{abs(round(delta_since, 1))} kg from your last weigh-in."
            )
    cw_workouts = current_week.get("workouts", 0)
    if cw_workouts:
        msg = (
            f"This week you completed {cw_workouts} "
            f"workout{'s' if cw_workouts != 1 else ''}, burned "
            f"{current_week.get('caloriesKcal', 0)} kcal"
        )
        if top_exercise:
            msg += (
                f", and your most active exercise was {top_exercise['name']} "
                f"with {top_exercise['totalCaloriesKcal']} kcal"
            )
        parts.append(msg + ".")
    else:
        parts.append("You have no workouts logged this week yet.")
    if most_active:
        parts.append(
            "Your strongest calorie-burning week was "
            f"{most_active['weekStartIso']} - {most_active['weekEndIso']} "
            f"with {most_active['caloriesKcal']} kcal."
        )
    return " ".join(parts)


def _weight_suggestions(goal: Optional[str], alignment: str) -> List[str]:
    if goal == "lose_weight":
        if alignment == "good":
            return [
                "You're trending toward your weight-loss goal — keep your "
                "weekly calories burned close to your best active week.",
                "Avoid increasing training volume too quickly to prevent fatigue.",
            ]
        return [
            "Your weight isn't moving toward your loss goal yet — keep "
            "sessions consistent and review your nutrition.",
        ]
    if goal == "build_muscle":
        return [
            "Keep progressive overload steady and ensure enough protein and "
            "recovery between sessions.",
        ]
    if goal == "stay_fit":
        return [
            "Your weight is stable — maintain your current routine and "
            "consistency.",
        ]
    return ["Keep logging workouts and weigh-ins so your insights stay accurate."]


def build_weight_update_insight(
    profile: Dict[str, Any],
    measurements: List[Dict[str, Any]],
    workouts: List[Dict[str, Any]],
    measurement_id: Optional[str],
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Build the users/{uid}/insights/latestWeightUpdate payload (pure).

    `generatedAt` is intentionally NOT set here — the trigger stamps it with
    SERVER_TIMESTAMP.
    """
    trend = compute_weight_trend(measurements)

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
    entries.sort(key=lambda e: e["dt"])

    current_kg = trend["current"]
    previous_kg = None
    delta_since = 0.0
    if len(entries) >= 2:
        previous_kg = round(entries[-2]["weight"], 2)
        delta_since = round(entries[-1]["weight"] - entries[-2]["weight"], 2)

    direction = trend["direction"]
    goal = profile.get("primaryGoal")
    alignment = _goal_alignment(goal, direction, delta_since)

    days_per_week = int(profile.get("daysPerWeek") or 0)
    weekly = compute_weekly_activity(workouts, days_per_week)
    current_week = weekly["currentWeek"]
    most_active = weekly["mostActiveWeek"]
    top_exercises = compute_exercise_leaderboard(workouts)[:5]
    top_muscles = compute_muscle_leaderboard(workouts)[:5]
    top_exercise = top_exercises[0] if top_exercises else None

    message = _weight_message(
        current_kg, delta_since, current_week, most_active, top_exercise
    )

    return {
        "userId": user_id,
        "measurementId": measurement_id,
        "schemaVersion": WEIGHT_UPDATE_SCHEMA_VERSION,
        "weight": {
            "currentKg": current_kg,
            "previousKg": previous_kg,
            "deltaSinceLastKg": delta_since,
            "delta30dKg": trend["deltaKg"],
            "delta30dPercent": trend["deltaPercent"],
            "direction": direction,
            "goalAlignment": alignment,
            "message": message,
        },
        "currentWeek": current_week,
        "mostActiveWeek": most_active,
        "topExercises": top_exercises,
        "topMuscles": top_muscles,
        "suggestions": _weight_suggestions(goal, alignment),
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
    "WEIGHT_UPDATE_SCHEMA_VERSION",
    "GOAL_LABELS",
    "build_full_snapshot",
    "build_weight_update_insight",
    "compute_weekly_activity",
    "compute_exercise_leaderboard",
    "compute_muscle_leaderboard",
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
