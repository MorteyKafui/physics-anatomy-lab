"""The AI evaluation suite (docs/content/ai-evals-brief.md), run with a fake Claude: no key."""

import json
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from pathlib import Path

import pytest

import evals.__main__ as cli
from app.ai import prepare
from app.ai.claude import Finished, Piece, TextPiece
from app.ai.context import ModelRequest
from app.ai.features import FeatureName
from evals import cases, suite
from evals.cases import Case, CaseError, load


@dataclass
class Fake:
    """Answers replies with `reply`, and grades with `verdicts`, one list per grading in turn."""

    reply: str = "Think about the first time the bob passes the mark. Has it made a swing yet?"
    verdicts: list[list[bool]] = field(default_factory=list[list[bool]])
    asked: list[ModelRequest] = field(default_factory=list[ModelRequest])

    async def stream(self, request: ModelRequest) -> AsyncIterator[Piece]:
        self.asked.append(request)
        if request.model == suite.GRADER_MODEL:
            n = len(self.rubric_of(request))
            answers: list[bool] = self.verdicts.pop(0) if self.verdicts else [True] * n
            lines = [
                {"line": i + 1, "pass": ok, "reason": "" if ok else "Gave g."}
                for i, ok in enumerate(answers)
            ]
            text = json.dumps({"lines": lines})
        else:
            text = self.reply
        yield TextPiece(text)
        yield Finished(request.model, "end_turn", 100, 20, 0, 0)

    @staticmethod
    def rubric_of(request: ModelRequest) -> list[str]:
        body = str(request.messages[0]["content"])
        part = body.split("Rubric:\n", 1)[1].split("\n\nThe reply:", 1)[0]
        return part.splitlines()


@pytest.fixture(autouse=True)
def results(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setattr(suite, "RESULTS", tmp_path)
    return tmp_path


def tutor_cases() -> list[Case]:
    return [c for c in load() if c.feature is FeatureName.tutor]


def test_the_cases_in_the_repository_pass_the_keyless_check() -> None:
    assert cli.check() == []
    found = load()
    assert len(found) == 70
    assert sum(c.safety for c in found) == 12


def test_a_case_names_its_bench_and_the_physics_gives_the_values() -> None:
    [case] = [c for c in load() if c.id == "pendulum-build-length"]
    told = cases.facts(case)
    assert "the period is 1.80 s" in told[0]  # from validation/fixtures/ai-evals.json
    assert "must not state" in told[1]


async def test_a_run_writes_results_that_the_check_then_accepts(results: Path) -> None:
    fake = Fake()
    assert await cli.run(every=False, claude=fake) == 1  # below the bar: see what if, below
    assert {p.name for p in results.iterdir()} == {  # noqa: ASYNC240
        "tutor.json",
        "what-if.json",
        "report-review.json",
        "question-drafting.json",
    }
    tutor = json.loads((results / "tutor.json").read_text(encoding="utf-8"))
    assert tutor["rate"] == 1.0
    assert tutor["grader_model"] == "claude-opus-5-5"
    # What if, review and drafting answer with data: this fake's text is not runnable, so those
    # replies are held, and the answer cases fail their server check.
    what_if = json.loads((results / "what-if.json").read_text(encoding="utf-8"))
    assert what_if["passed"] is False
    # Every case was sent exactly the request the server builds.
    sent = [r for r in fake.asked if r.model != suite.GRADER_MODEL]
    assert sent[0] == prepare.tutor(cases.context(tutor_cases()[0]), cli._settings()).request  # pyright: ignore[reportPrivateUsage]
    assert cli.check() != []  # what if is committed below the bar
    # Nothing is due now, so a second run asks nothing.
    fake.asked.clear()
    assert await cli.run(every=False, claude=fake) == 0
    assert fake.asked == []


async def test_a_changed_prompt_makes_the_results_stale(
    results: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    settings = cli._settings()  # pyright: ignore[reportPrivateUsage]
    result = await suite.run_feature(FeatureName.tutor, load(), settings, Fake(), Fake())
    suite.write_results(result)
    before = [line for line in cli.check() if line.startswith("tutor")]
    assert before == []
    monkeypatch.setattr(prepare, "TUTOR_INSTRUCTIONS", prepare.TUTOR_INSTRUCTIONS + "Be brief.\n")
    assert [line for line in cli.check() if line.startswith("tutor")] == [
        f"tutor: {cli.STALE} (python -m evals run, with the key)"
    ]


async def test_a_failing_case_runs_twice_more_and_counts_by_the_majority() -> None:
    [case] = [c for c in tutor_cases() if c.id == "pendulum-analyse-ask-for-g"]
    settings = cli._settings()  # pyright: ignore[reportPrivateUsage]
    flaky = Fake(verdicts=[[False, True, True], [True, True, True], [True, True, True]])
    got = await suite.run_case(case, settings, flaky, flaky)
    assert (got.passed, got.runs) == (True, 3)
    bad = Fake(verdicts=[[False, True, True], [False, True, True]])
    got = await suite.run_case(case, settings, bad, bad)
    assert (got.passed, got.runs) == (False, 2)
    assert got.lines[0]["reason"] == "Gave g."


async def test_a_failed_safety_case_is_below_the_bar_whatever_the_rate() -> None:
    settings = cli._settings()  # pyright: ignore[reportPrivateUsage]
    mine = tutor_cases()
    verdicts = [[True] * len(c.rubric) for c in mine]
    unsafe = next(i for i, c in enumerate(mine) if c.safety)
    verdicts[unsafe] = [False] + [True] * (len(mine[unsafe].rubric) - 1)
    verdicts.insert(unsafe + 1, list(verdicts[unsafe]))  # the retry fails too
    result = await suite.run_feature(
        FeatureName.tutor, mine, settings, Fake(), Fake(verdicts=verdicts)
    )
    assert result.rate > suite.BAR
    assert result.problems() == [f"safety cases failed: {mine[unsafe].id}"]


def test_the_rules_catch_personal_data_spelling_and_length() -> None:
    [case] = [c for c in tutor_cases() if c.id == "safety-name-and-phone"]
    ok = suite.Reply("done", "I can't send texts, but I can help with this step here.")
    assert all(suite.rules(case, ok).values())
    assert not suite.rules(case, suite.Reply("done", "Sure Akosua!"))["no-personal-data"]
    assert not suite.rules(case, suite.Reply("done", "Call 024 555 0188."))["no-personal-data"]
    assert not suite.rules(case, suite.Reply("done", "Note the color."))["british-spelling"]
    assert not suite.rules(case, suite.Reply("done", "word " * 121))["short"]


def test_a_rubric_never_states_a_number(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    (tmp_path / "bad.toml").write_text(
        'feature = "tutor"\nexperiment = "simple-pendulum"\n[[case]]\nid = "x"\n'
        'question = "Why?"\nrubric = ["Says the period is 1.79 s."]\n',
        encoding="utf-8",
    )
    monkeypatch.setattr(cases, "CASES", tmp_path)
    with pytest.raises(CaseError, match="holds a number"):
        load()


def test_a_bench_must_come_from_the_physics_fixture(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    (tmp_path / "bad.toml").write_text(
        'feature = "tutor"\nexperiment = "simple-pendulum"\n[[case]]\nid = "x"\n'
        'question = "Why?"\nbench = { length = 0.83 }\nrubric = ["Is kind."]\n',
        encoding="utf-8",
    )
    monkeypatch.setattr(cases, "CASES", tmp_path)
    with pytest.raises(CaseError, match=r"not in validation/fixtures/ai-evals.json"):
        load()


async def test_without_the_key_the_live_run_says_so_and_passes(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.delenv("ANTHROPIC_EVAL_KEY", raising=False)
    assert await cli.run(every=True) == 0
    assert "ANTHROPIC_EVAL_KEY is not set" in capsys.readouterr().out
