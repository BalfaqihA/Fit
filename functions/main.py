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

from firebase_admin import auth as admin_auth, firestore, initialize_app
from firebase_functions import firestore_fn, https_fn, options, scheduler_fn
from google.cloud.firestore_v1 import FieldFilter, Increment

import insights

initialize_app()

# Restrict CORS to first-party web origins. Native app calls go through the
# Firebase Functions client SDK and are not subject to CORS.
_ALLOWED_ORIGINS = [
    "https://fitness-874c3.web.app",
    "https://fitness-874c3.firebaseapp.com",
]

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
    cors=options.CorsOptions(cors_origins=_ALLOWED_ORIGINS, cors_methods=["POST"]),
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


_USER_SUBCOLLECTIONS = (
    "workouts",
    "measurements",
    "plans",
    "xp_events",
    "achievements",
)


def _delete_collection(coll_ref, batch_size: int = 200) -> int:
    """Delete every document in a collection in batches. Returns count deleted."""
    deleted = 0
    while True:
        docs = list(coll_ref.limit(batch_size).stream())
        if not docs:
            return deleted
        for doc in docs:
            doc.reference.delete()
            deleted += 1
        if len(docs) < batch_size:
            return deleted


@https_fn.on_call(
    region="us-central1",
    cors=options.CorsOptions(cors_origins=_ALLOWED_ORIGINS, cors_methods=["POST"]),
)
def delete_account(req: https_fn.CallableRequest) -> Dict[str, Any]:
    """Permanently delete the calling user's Firestore subtree.

    The client is expected to call `auth.currentUser.delete()` after this
    succeeds. This function only handles the Firestore-side cleanup.
    """
    if req.auth is None:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.UNAUTHENTICATED, "Sign in required."
        )

    uid = req.auth.uid
    db = firestore.client()
    user_ref = db.collection("users").document(uid)

    deleted = 0
    for sub in _USER_SUBCOLLECTIONS:
        deleted += _delete_collection(user_ref.collection(sub))

    user_ref.delete()
    deleted += 1

    return {"deleted": deleted}


# -------- Community counter maintenance --------
#
# `likeCount` and `commentCount` on `communityPosts/{postId}` are derived from
# the actual `likes/{likeId}` and `comments/{commentId}` documents. Clients no
# longer write these counters directly (the security rules forbid it), so the
# only way they can move is through these triggers. This makes the counters
# unforgeable by malicious clients.


# Cap on how many followers receive a `new_post` notification per post.
_MAX_FANOUT = 500


def _actor_public(db: Any, uid: str) -> Dict[str, Any]:
    """Denormalized actor fields so the notifications screen needs no joins."""
    data = db.collection("users").document(uid).get().to_dict() or {}
    return {
        "actorName": data.get("displayName") or "Someone",
        "actorAvatarUrl": data.get("avatarUri") or None,
    }


def _create_notification(
    db: Any,
    recipient_id: Any,
    actor_id: Any,
    n_type: str,
    *,
    post_id: Any = None,
    comment_text: Any = None,
) -> None:
    """Write one notification doc. Never notify yourself / on bad input."""
    if not isinstance(recipient_id, str) or not recipient_id:
        return
    if not isinstance(actor_id, str) or not actor_id:
        return
    if recipient_id == actor_id:
        return
    payload: Dict[str, Any] = {
        "recipientId": recipient_id,
        "actorId": actor_id,
        "type": n_type,
        "read": False,
        "createdAt": firestore.SERVER_TIMESTAMP,
        **_actor_public(db, actor_id),
    }
    if isinstance(post_id, str) and post_id:
        payload["postId"] = post_id
    if isinstance(comment_text, str) and comment_text:
        payload["commentText"] = comment_text[:140]
    db.collection("notifications").add(payload)


@firestore_fn.on_document_created(document="likes/{likeId}", region="us-central1")
def on_like_created(event: firestore_fn.Event[firestore_fn.DocumentSnapshot]) -> None:
    snap = event.data
    if snap is None:
        return
    post_id = snap.get("postId")
    if not isinstance(post_id, str) or not post_id:
        return
    db = firestore.client()
    db.collection("communityPosts").document(post_id).update(
        {"likeCount": Increment(1)}
    )
    # Notify the post owner that someone liked their post.
    _create_notification(
        db, snap.get("postOwnerId"), snap.get("userId"), "like", post_id=post_id
    )


@firestore_fn.on_document_deleted(document="likes/{likeId}", region="us-central1")
def on_like_deleted(event: firestore_fn.Event[firestore_fn.DocumentSnapshot]) -> None:
    snap = event.data
    if snap is None:
        return
    post_id = snap.get("postId")
    if not isinstance(post_id, str) or not post_id:
        return
    db = firestore.client()
    db.collection("communityPosts").document(post_id).update(
        {"likeCount": Increment(-1)}
    )


@firestore_fn.on_document_created(document="comments/{commentId}", region="us-central1")
def on_comment_created(
    event: firestore_fn.Event[firestore_fn.DocumentSnapshot],
) -> None:
    snap = event.data
    if snap is None:
        return
    post_id = snap.get("postId")
    if not isinstance(post_id, str) or not post_id:
        return
    db = firestore.client()
    db.collection("communityPosts").document(post_id).update(
        {"commentCount": Increment(1)}
    )
    # Notify the post owner that someone commented on their post.
    _create_notification(
        db,
        snap.get("postOwnerId"),
        snap.get("authorId"),
        "comment",
        post_id=post_id,
        comment_text=snap.get("text"),
    )


@firestore_fn.on_document_deleted(document="comments/{commentId}", region="us-central1")
def on_comment_deleted(
    event: firestore_fn.Event[firestore_fn.DocumentSnapshot],
) -> None:
    snap = event.data
    if snap is None:
        return
    post_id = snap.get("postId")
    if not isinstance(post_id, str) or not post_id:
        return
    db = firestore.client()
    db.collection("communityPosts").document(post_id).update(
        {"commentCount": Increment(-1)}
    )


# -------- Community social graph: follows + notifications --------
#
# Follow edges live in `follows/{followerId}_{followingId}`. These triggers
# keep `followerCount` / `followingCount` on the user docs unforgeable
# (clients cannot write those fields — see firestore.rules), notify the
# followed user, and fan out `new_post` notifications to a poster's followers.


@firestore_fn.on_document_created(
    document="follows/{followId}", region="us-central1"
)
def on_follow_created(
    event: firestore_fn.Event[firestore_fn.DocumentSnapshot],
) -> None:
    snap = event.data
    if snap is None:
        return
    follower_id = snap.get("followerId")
    following_id = snap.get("followingId")
    if not isinstance(follower_id, str) or not isinstance(following_id, str):
        return
    if not follower_id or not following_id or follower_id == following_id:
        return
    db = firestore.client()
    db.collection("users").document(following_id).set(
        {"followerCount": Increment(1)}, merge=True
    )
    db.collection("users").document(follower_id).set(
        {"followingCount": Increment(1)}, merge=True
    )
    _create_notification(db, following_id, follower_id, "follow")


@firestore_fn.on_document_deleted(
    document="follows/{followId}", region="us-central1"
)
def on_follow_deleted(
    event: firestore_fn.Event[firestore_fn.DocumentSnapshot],
) -> None:
    snap = event.data
    if snap is None:
        return
    follower_id = snap.get("followerId")
    following_id = snap.get("followingId")
    if not isinstance(follower_id, str) or not isinstance(following_id, str):
        return
    if not follower_id or not following_id:
        return
    db = firestore.client()
    db.collection("users").document(following_id).set(
        {"followerCount": Increment(-1)}, merge=True
    )
    db.collection("users").document(follower_id).set(
        {"followingCount": Increment(-1)}, merge=True
    )


@firestore_fn.on_document_created(
    document="communityPosts/{postId}", region="us-central1"
)
def on_post_created(
    event: firestore_fn.Event[firestore_fn.DocumentSnapshot],
) -> None:
    """Fan out a `new_post` notification to every follower of the author."""
    snap = event.data
    if snap is None:
        return
    author_id = snap.get("authorId")
    if not isinstance(author_id, str) or not author_id:
        return
    post_id = event.params.get("postId")
    if not post_id:
        return
    db = firestore.client()
    actor = _actor_public(db, author_id)
    followers = (
        db.collection("follows")
        .where(filter=FieldFilter("followingId", "==", author_id))
        .limit(_MAX_FANOUT)
        .stream()
    )
    batch = db.batch()
    pending = 0
    for f in followers:
        follower_id = (f.to_dict() or {}).get("followerId")
        if not isinstance(follower_id, str) or not follower_id:
            continue
        if follower_id == author_id:
            continue
        ref = db.collection("notifications").document()
        batch.set(
            ref,
            {
                "recipientId": follower_id,
                "actorId": author_id,
                "type": "new_post",
                "postId": post_id,
                "read": False,
                "createdAt": firestore.SERVER_TIMESTAMP,
                **actor,
            },
        )
        pending += 1
        if pending == 450:
            batch.commit()
            batch = db.batch()
            pending = 0
    if pending:
        batch.commit()


# -------- Per-user insights snapshot triggers --------
#
# Every workout / measurement / achievement / plan write fans out to a
# `users/{uid}/insights/snapshot` doc kept in sync with the rest of the
# user's data. Chatbot reads this single doc per chat turn for personalized
# replies — instead of joining workouts + measurements + plan on the fly.


def _insights_ref(db: Any, uid: str):
    return db.collection("users").document(uid).collection("insights").document(
        "snapshot"
    )


def _merge_insights(uid: str, payload: Dict[str, Any]) -> None:
    """Merge a partial section update into the snapshot doc.

    All triggers go through this helper so the `updatedAt` and
    `schemaVersion` fields stay consistent.
    """
    db = firestore.client()
    payload = {
        **payload,
        "userId": uid,
        "schemaVersion": insights.SCHEMA_VERSION,
        "updatedAt": firestore.SERVER_TIMESTAMP,
    }
    _insights_ref(db, uid).set(payload, merge=True)


def _latest_weight_update_ref(db: Any, uid: str):
    return db.collection("users").document(uid).collection("insights").document(
        "latestWeightUpdate"
    )


def _weight_update_summary(latest: Dict[str, Any]) -> Dict[str, Any]:
    """Small, flat digest of the latest-weight-update doc.

    Merged into the snapshot so the Node chatbot can read one cheap doc
    instead of re-deriving weekly analytics per chat turn.
    """
    weight = latest.get("weight") or {}
    cw = latest.get("currentWeek") or {}
    ma = latest.get("mostActiveWeek") or {}
    top = latest.get("topExercises") or []
    return {
        "currentKg": weight.get("currentKg"),
        "deltaSinceLastKg": weight.get("deltaSinceLastKg"),
        "delta30dKg": weight.get("delta30dKg"),
        "currentWeekCalories": cw.get("caloriesKcal"),
        "mostActiveWeekCalories": ma.get("caloriesKcal") if ma else None,
        "mostActiveWeekRange": (
            f'{ma.get("weekStartIso")} - {ma.get("weekEndIso")}' if ma else None
        ),
        "topExercise": top[0]["name"] if top else None,
        "measurementId": latest.get("measurementId"),
    }


def _write_weight_update(
    db: Any, uid: str, measurement_id: Any
) -> None:
    """Rebuild + write users/{uid}/insights/latestWeightUpdate and merge a
    compact summary into the snapshot."""
    user_ref = db.collection("users").document(uid)
    profile = user_ref.get().to_dict() or {}
    workouts = [
        w.to_dict() | {"id": w.id} for w in user_ref.collection("workouts").stream()
    ]
    measurements = [
        m.to_dict() | {"id": m.id}
        for m in user_ref.collection("measurements").stream()
    ]
    latest = insights.build_weight_update_insight(
        profile, measurements, workouts, measurement_id, uid
    )
    _latest_weight_update_ref(db, uid).set(
        {**latest, "generatedAt": firestore.SERVER_TIMESTAMP}, merge=True
    )
    _merge_insights(uid, {"latestWeightUpdateSummary": _weight_update_summary(latest)})


@firestore_fn.on_document_written(
    document="users/{uid}", region="us-central1"
)
def on_profile_write(
    event: firestore_fn.Event[firestore_fn.Change[firestore_fn.DocumentSnapshot]],
) -> None:
    """Refresh demographics/preferences/plan when the user profile changes."""
    uid = event.params.get("uid")
    if not uid:
        return
    # Skip cascading writes that originate from this trigger itself.
    after = event.data.after if event.data else None
    if after is None or not after.exists:
        return
    db = firestore.client()
    sections = insights.refresh_profile_sections(uid, db)
    _merge_insights(uid, sections)


@firestore_fn.on_document_written(
    document="users/{uid}/workouts/{workoutId}", region="us-central1"
)
def on_workout_write(
    event: firestore_fn.Event[firestore_fn.Change[firestore_fn.DocumentSnapshot]],
) -> None:
    """Refresh totals/recent/streaks/consistency/PRs/flags on workout write."""
    uid = event.params.get("uid")
    if not uid:
        return
    db = firestore.client()
    sections = insights.refresh_workout_sections(uid, db)
    _merge_insights(uid, sections)


@firestore_fn.on_document_written(
    document="users/{uid}/measurements/{measurementId}", region="us-central1"
)
def on_measurement_write(
    event: firestore_fn.Event[firestore_fn.Change[firestore_fn.DocumentSnapshot]],
) -> None:
    """Refresh weightTrend + needsWeighIn flag when a weight is logged, and
    rebuild the post-weight-update insight doc."""
    uid = event.params.get("uid")
    if not uid:
        return
    db = firestore.client()
    # Always keep weightTrend/flags fresh — this never blocks the save (the
    # client does not await this async trigger).
    sections = insights.refresh_measurement_sections(uid, db)
    _merge_insights(uid, sections)

    after = event.data.after if event.data else None
    if after is None or not after.exists:
        # Measurement deleted — leave the existing latestWeightUpdate doc as-is
        # rather than rebuilding against a removed measurement.
        return
    _write_weight_update(db, uid, event.params.get("measurementId"))


@firestore_fn.on_document_written(
    document="users/{uid}/achievements/{achievementId}", region="us-central1"
)
def on_achievement_write(
    event: firestore_fn.Event[firestore_fn.Change[firestore_fn.DocumentSnapshot]],
) -> None:
    """Refresh unlocked-achievement summary."""
    uid = event.params.get("uid")
    if not uid:
        return
    db = firestore.client()
    sections = insights.refresh_achievement_sections(uid, db)
    _merge_insights(uid, sections)


@firestore_fn.on_document_written(
    document="users/{uid}/plans/{planId}", region="us-central1"
)
def on_plan_write(
    event: firestore_fn.Event[firestore_fn.Change[firestore_fn.DocumentSnapshot]],
) -> None:
    """Refresh plan summary when the user's currentPlan changes."""
    uid = event.params.get("uid")
    plan_id = event.params.get("planId")
    if not uid or not plan_id:
        return
    db = firestore.client()
    profile = (db.collection("users").document(uid).get().to_dict() or {})
    # Only refresh if this is the user's *current* plan — historical plan
    # writes shouldn't churn the snapshot.
    if profile.get("currentPlanId") != plan_id:
        return
    sections = insights.refresh_profile_sections(uid, db)
    _merge_insights(uid, sections)


@https_fn.on_call(
    region="us-central1",
    cors=options.CorsOptions(cors_origins=_ALLOWED_ORIGINS, cors_methods=["POST"]),
)
def bootstrap_insights(req: https_fn.CallableRequest) -> Dict[str, Any]:
    """One-shot rebuild of `users/{uid}/insights/snapshot` from source data.

    Called on first launch after the feature ships, or any time the snapshot
    is suspected of being stale. Idempotent — overwrites the doc with a
    freshly-computed full snapshot.
    """
    if req.auth is None:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.UNAUTHENTICATED, "Sign in required."
        )

    uid = req.auth.uid
    db = firestore.client()
    snapshot = insights.build_full_snapshot(uid, db)
    _merge_insights(uid, snapshot)

    # Back-fill the post-weight-update insight for users who have not weighed
    # in since this feature shipped. Identify the most recent measurement.
    user_ref = db.collection("users").document(uid)
    dated = []
    for m in user_ref.collection("measurements").stream():
        data = m.to_dict() or {}
        dt = insights._to_dt(
            data.get("recordedAt") or data.get("createdAt") or data.get("date")
        )
        if dt is not None:
            dated.append((dt, m.id))
    latest_measurement_id = max(dated, key=lambda t: t[0])[1] if dated else None
    _write_weight_update(db, uid, latest_measurement_id)

    return {"ok": True, "schemaVersion": insights.SCHEMA_VERSION}


# -------- Scheduled counter reconciliation --------
#
# `likeCount` / `commentCount` on posts and `followerCount` / `followingCount`
# on users are maintained by the triggers above. If a trigger ever fails
# (transient outage, hot partition), the counters drift. This nightly job
# recomputes them from source collections and corrects any drift.
#
# Idempotent: writes the recomputed value unconditionally (Firestore won't
# bump version when the value is unchanged). Bounded by collection size, so
# safe at the project's current scale; revisit if user/post counts approach
# Firestore admin SDK practical limits (~10^6 docs).


def _count_where(db: Any, collection: str, field: str, value: str) -> int:
    """count() aggregation; falls back to streaming on older SDKs."""
    coll = db.collection(collection).where(filter=FieldFilter(field, "==", value))
    try:
        snap = coll.count().get()
        return int(snap[0][0].value)
    except Exception:
        return sum(1 for _ in coll.stream())


def _reconcile_post_counters(db: Any) -> Dict[str, int]:
    """Recompute likeCount/commentCount on every post."""
    fixed_likes = 0
    fixed_comments = 0
    for post in db.collection("communityPosts").stream():
        pid = post.id
        actual_likes = _count_where(db, "likes", "postId", pid)
        actual_comments = _count_where(db, "comments", "postId", pid)
        data = post.to_dict() or {}
        if data.get("likeCount") != actual_likes:
            fixed_likes += 1
        if data.get("commentCount") != actual_comments:
            fixed_comments += 1
        post.reference.set(
            {"likeCount": actual_likes, "commentCount": actual_comments},
            merge=True,
        )
    return {"posts_likeCount_fixed": fixed_likes,
            "posts_commentCount_fixed": fixed_comments}


def _reconcile_follow_counters(db: Any) -> Dict[str, int]:
    """Recompute followerCount/followingCount on every user."""
    fixed_followers = 0
    fixed_following = 0
    for user in db.collection("users").stream():
        uid = user.id
        actual_followers = _count_where(db, "follows", "followingId", uid)
        actual_following = _count_where(db, "follows", "followerId", uid)
        data = user.to_dict() or {}
        if data.get("followerCount") != actual_followers:
            fixed_followers += 1
        if data.get("followingCount") != actual_following:
            fixed_following += 1
        user.reference.set(
            {"followerCount": actual_followers,
             "followingCount": actual_following},
            merge=True,
        )
    return {"users_followerCount_fixed": fixed_followers,
            "users_followingCount_fixed": fixed_following}


def _reconcile_counters_impl(db: Any) -> Dict[str, int]:
    """Pure entry point — easy to call from a manual admin endpoint or tests."""
    out: Dict[str, int] = {}
    out.update(_reconcile_post_counters(db))
    out.update(_reconcile_follow_counters(db))
    return out


@scheduler_fn.on_schedule(schedule="every day 03:00", region="us-central1")
def reconcile_counters(event: scheduler_fn.ScheduledEvent) -> None:
    """Nightly drift correction for community counters."""
    del event  # unused
    db = firestore.client()
    summary = _reconcile_counters_impl(db)
    print(f"[reconcile_counters] {summary}")
