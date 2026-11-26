"""A bench frame carries only mistakes the lab words (ASVS review, finding H)."""

import json

from app.live.policy import MAX_MISTAKES, MAX_NOTIFY_BYTES
from app.live.schemas import FINDING_KEYS, BenchFrame

KEY = "findings.pendulum.countFromOne"


def frame(mistakes: list[dict[str, str]]) -> BenchFrame:
    return BenchFrame.model_validate(
        {
            "type": "bench",
            "experiment_id": "simple-pendulum",
            "step": "measure",
            "mistakes": mistakes,
        }
    )


def test_made_up_mistakes_are_left_out_and_the_frame_still_counts() -> None:
    got = frame(
        [
            {"rule": "counts-from-one", "key": KEY, "skill": "measurement"},
            {"rule": "counts-from-one", "key": "Anything at all", "skill": "measurement"},
            {"rule": "Ama is at home", "key": KEY, "skill": "measurement"},
            {"rule": "x" * 70, "key": KEY, "skill": "measurement"},
            "not even an object",  # pyright: ignore[reportArgumentType]
        ]
    )
    assert [(m.rule, m.key) for m in got.mistakes] == [("counts-from-one", KEY)]


def test_one_rule_is_one_mistake() -> None:
    same = {"rule": "counts-from-one", "key": KEY, "skill": "measurement"}
    assert len(frame([same, same, same]).mistakes) == 1


def test_the_largest_bench_stays_far_under_the_notify_limit() -> None:
    # Before, ten mistakes of 200 four-byte characters each passed NOTIFY's limit, so every
    # bench frame made every teacher's board fetch the whole class again.
    longest_key = max(FINDING_KEYS, key=len)
    mistakes = [
        {"rule": f"r{i}" + "x" * 61, "key": longest_key, "skill": "measurement"}
        for i in range(MAX_MISTAKES)
    ]
    got = frame(mistakes)
    assert len(got.mistakes) == MAX_MISTAKES
    size = len(json.dumps(got.model_dump(mode="json"), ensure_ascii=False).encode())
    assert size < MAX_NOTIFY_BYTES / 2
