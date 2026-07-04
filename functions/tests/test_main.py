"""Tests for the Cloud Functions in main.py.

The `@https_fn.on_call` / `@firestore_fn.*` decorators wrap the original
function (on_call adds two layers). `inspect.unwrap` walks the `__wrapped__`
chain to the innermost user function, which we invoke directly with fake
request/event objects and a mocked Firestore client. No emulator required.
"""

import inspect
from unittest.mock import MagicMock, patch

import pytest

import main


def raw(fn):
    """The undecorated Cloud Function body."""
    return inspect.unwrap(fn)


# ---------- fakes ----------


class FakeReq:
    def __init__(self, uid=None, data=None):
        self.auth = None if uid is None else MagicMock(uid=uid)
        self.data = data


class Snap:
    """Minimal DocumentSnapshot stand-in."""

    def __init__(self, data, exists=True):
        self._d = data or {}
        self.exists = exists

    def get(self, k):
        return self._d.get(k)

    def to_dict(self):
        return self._d


class Event:
    def __init__(self, data, params=None):
        self.data = data
        self.params = params or {}


def routed_db(users=None, notif=None, posts=None, follows=None):
    """A MagicMock db whose .collection() is routed by collection name."""
    db = MagicMock()
    table = {
        "users": users or MagicMock(),
        "notifications": notif or MagicMock(),
        "communityPosts": posts or MagicMock(),
        "follows": follows or MagicMock(),
    }
    db.collection.side_effect = lambda name: table[name]
    return db, table


# ---------- pure helpers ----------


def test_exercises_per_day_buckets():
    assert main._exercises_per_day(20) == 5
    assert main._exercises_per_day(30) == 5
    assert main._exercises_per_day(45) == 6
    assert main._exercises_per_day(60) == 7


def test_default_sets_and_reps_by_goal_level():
    assert main._default_sets("beginner") == 3
    assert main._default_sets("advanced") == 4
    assert main._default_reps("build_muscle", "beginner") == 10
    assert main._default_reps("build_muscle", "advanced") == 12
    assert main._default_reps("increase_endurance", "beginner") == 20
    assert main._default_reps("lose_weight", "beginner") == 15
    assert main._default_reps("anything_else", "beginner") == 12


def test_filter_pool_respects_level_and_equipment():
    pool = main._filter_pool("beginner", "body")
    assert pool, "expected some bodyweight beginner exercises in the dataset"
    for ex in pool:
        assert (ex.get("level") or "unknown").lower() in ("beginner", "unknown")


def test_filter_pool_full_gym_is_widest():
    assert len(main._filter_pool("beginner", "full-gym")) >= len(
        main._filter_pool("beginner", "dumbbells")
    )


# ---------- _delete_collection ----------


def test_delete_collection_batches_until_empty():
    class FakeColl:
        def __init__(self, n):
            self._remaining = [MagicMock() for _ in range(n)]

        def limit(self, n):
            self._n = n
            return self

        def stream(self):
            batch = self._remaining[: self._n]
            self._remaining = self._remaining[self._n :]
            return iter(batch)

    coll = FakeColl(5)
    all_docs = list(coll._remaining)
    deleted = main._delete_collection(coll, batch_size=2)
    assert deleted == 5
    for d in all_docs:
        d.reference.delete.assert_called_once()


def test_delete_collection_empty_returns_zero():
    coll = MagicMock()
    coll.limit.return_value.stream.return_value = iter([])
    assert main._delete_collection(coll) == 0


# ---------- _create_notification ----------


def _notif_db(actor_profile=None):
    users = MagicMock()
    users.document.return_value.get.return_value.to_dict.return_value = (
        actor_profile or {"displayName": "Bob", "avatarUri": "a.png"}
    )
    notif = MagicMock()
    db, _ = routed_db(users=users, notif=notif)
    return db, notif


def test_create_notification_skips_self():
    db, notif = _notif_db()
    main._create_notification(db, "u1", "u1", "like", post_id="p1")
    notif.add.assert_not_called()


def test_create_notification_skips_bad_input():
    db, notif = _notif_db()
    main._create_notification(db, None, "u2", "like")
    main._create_notification(db, "u1", "", "like")
    notif.add.assert_not_called()


def test_create_notification_writes_denormalized_actor():
    db, notif = _notif_db()
    main._create_notification(db, "owner", "actor", "comment", post_id="p1",
                              comment_text="x" * 300)
    notif.add.assert_called_once()
    payload = notif.add.call_args[0][0]
    assert payload["recipientId"] == "owner"
    assert payload["actorId"] == "actor"
    assert payload["type"] == "comment"
    assert payload["actorName"] == "Bob"
    assert payload["postId"] == "p1"
    assert len(payload["commentText"]) == 140  # truncated


# ---------- generate_plan ----------


def test_generate_plan_requires_auth():
    with pytest.raises(main.https_fn.HttpsError):
        raw(main.generate_plan)(FakeReq(uid=None))


def test_generate_plan_rejects_missing_fields():
    with pytest.raises(main.https_fn.HttpsError):
        raw(main.generate_plan)(FakeReq(uid="u1", data={"goal": "x"}))


def test_generate_plan_rejects_out_of_range_days():
    req = FakeReq(uid="u1", data={
        "goal": "build_muscle", "level": "beginner",
        "equipment": "body", "daysPerWeek": 9, "sessionMinutes": 30,
    })
    with pytest.raises(main.https_fn.HttpsError):
        raw(main.generate_plan)(req)


def test_generate_plan_happy_path_writes_plan_and_pointer():
    req = FakeReq(uid="u1", data={
        "goal": "build_muscle", "level": "beginner",
        "equipment": "body", "daysPerWeek": 3, "sessionMinutes": 30,
    })
    db = MagicMock()
    plan_ref = MagicMock()
    plan_ref.id = "plan-123"
    user_doc = db.collection.return_value.document.return_value
    user_doc.collection.return_value.document.return_value = plan_ref

    with patch.object(main.firestore, "client", return_value=db):
        out = raw(main.generate_plan)(req)

    assert out == {"planId": "plan-123"}
    written = plan_ref.set.call_args[0][0]
    assert len(written["days"]) == 3
    assert len(written["days"][0]["exercises"]) == 5  # 30 min bucket
    # currentPlanId pointer updated on the user doc.
    user_doc.set.assert_called_once()
    assert user_doc.set.call_args[0][0]["currentPlanId"] == "plan-123"


def test_generate_plan_is_deterministic_per_user_inputs():
    data = {"goal": "lose_weight", "level": "beginner",
            "equipment": "body", "daysPerWeek": 2, "sessionMinutes": 45}

    def run():
        db = MagicMock()
        ref = MagicMock()
        ref.id = "p"
        db.collection.return_value.document.return_value.collection.return_value.document.return_value = ref
        with patch.object(main.firestore, "client", return_value=db):
            raw(main.generate_plan)(FakeReq(uid="u1", data=data))
        return ref.set.call_args[0][0]["days"]

    first = run()
    second = run()
    names = lambda days: [[e["name"] for e in d["exercises"]] for d in days]
    assert names(first) == names(second)


# ---------- delete_account ----------


def test_delete_account_requires_auth():
    with pytest.raises(main.https_fn.HttpsError):
        raw(main.delete_account)(FakeReq(uid=None))


def test_delete_account_clears_subtree_and_user_doc():
    db = MagicMock()
    user_ref = db.collection.return_value.document.return_value
    user_ref.collection.return_value.limit.return_value.stream.return_value = iter([])

    with patch.object(main.firestore, "client", return_value=db):
        out = raw(main.delete_account)(FakeReq(uid="u1"))

    assert out["deleted"] == 1  # 0 sub-docs + the user doc itself
    user_ref.delete.assert_called_once()


# ---------- community triggers ----------


def test_on_like_created_increments_and_notifies():
    posts = MagicMock()
    users = MagicMock()
    users.document.return_value.get.return_value.to_dict.return_value = {
        "displayName": "Liker"
    }
    notif = MagicMock()
    db, _ = routed_db(users=users, notif=notif, posts=posts)
    ev = Event(Snap({"postId": "p1", "postOwnerId": "owner", "userId": "liker"}))

    with patch.object(main.firestore, "client", return_value=db):
        raw(main.on_like_created)(ev)

    posts.document.assert_called_with("p1")
    update_arg = posts.document.return_value.update.call_args[0][0]
    assert "likeCount" in update_arg
    notif.add.assert_called_once()


def test_on_like_created_ignores_missing_snapshot():
    with patch.object(main.firestore, "client") as c:
        raw(main.on_like_created)(Event(None))
    c.assert_not_called()


def test_on_comment_deleted_decrements_count():
    posts = MagicMock()
    db, _ = routed_db(posts=posts)
    ev = Event(Snap({"postId": "p9"}))
    with patch.object(main.firestore, "client", return_value=db):
        raw(main.on_comment_deleted)(ev)
    assert "commentCount" in posts.document.return_value.update.call_args[0][0]


def test_on_follow_created_skips_self_follow():
    db = MagicMock()
    ev = Event(Snap({"followerId": "u1", "followingId": "u1"}))
    with patch.object(main.firestore, "client", return_value=db):
        raw(main.on_follow_created)(ev)
    db.collection.assert_not_called()  # bailed before any write


def test_on_follow_created_bumps_both_counters_and_notifies():
    users = MagicMock()
    users.document.return_value.get.return_value.to_dict.return_value = {
        "displayName": "F"
    }
    notif = MagicMock()
    db, _ = routed_db(users=users, notif=notif)
    ev = Event(Snap({"followerId": "a", "followingId": "b"}))
    with patch.object(main.firestore, "client", return_value=db):
        raw(main.on_follow_created)(ev)
    # followerCount on b, followingCount on a, plus a follow notification.
    assert users.document.return_value.set.call_count == 2
    notif.add.assert_called_once()


# ---------- counter reconciliation ----------


def test_count_where_falls_back_to_stream_when_count_unsupported():
    db = MagicMock()
    coll = db.collection.return_value.where.return_value
    coll.count.side_effect = AttributeError("no count() here")
    coll.stream.return_value = iter([MagicMock(), MagicMock(), MagicMock()])
    assert main._count_where(db, "likes", "postId", "p1") == 3


def test_reconcile_post_counters_writes_actual_values():
    """Drifted counter values are recomputed from source collections."""

    class FakeRef:
        def __init__(self):
            self.set_calls = []

        def set(self, data, merge=False):
            self.set_calls.append((data, merge))

    class FakePost:
        def __init__(self, id_, data):
            self.id = id_
            self._data = data
            self.reference = FakeRef()

        def to_dict(self):
            return self._data

    post = FakePost("p1", {"likeCount": 10, "commentCount": 0})  # drifted
    db = MagicMock()

    def collection(name):
        if name == "communityPosts":
            return MagicMock(stream=lambda: iter([post]))
        m = MagicMock()
        # likes -> 2 actual, comments -> 1 actual.
        m.where.return_value.count.return_value.get.return_value = [
            [MagicMock(value=2 if name == "likes" else 1)]
        ]
        return m

    db.collection.side_effect = collection
    out = main._reconcile_post_counters(db)
    assert out["posts_likeCount_fixed"] == 1  # 10 -> 2 changed
    written = post.reference.set_calls[0][0]
    assert written == {"likeCount": 2, "commentCount": 1}
