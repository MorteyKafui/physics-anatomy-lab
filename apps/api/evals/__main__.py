"""`python -m evals check` (every pull request, no key) and `python -m evals run` (with the key).

check: every case is well formed and builds the request the server would send; its bench is in
the physics fixture; and any committed results were made with today's prompts and models and
meet the bar. Features never run yet are listed, not failed: the live job has no key until
Mortey adds one.

run: runs the features whose results are missing or stale (or every feature, with --all) against
the real model, writes their results, and fails if one is below the bar. Without
ANTHROPIC_EVAL_KEY it says so and does nothing.
"""

import argparse
import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path

from app.ai.claude import AnthropicClaude, Claude, ClaudeError
from app.ai.features import FeatureName
from app.config import Settings
from evals.cases import Case, CaseError, load
from evals.suite import (
    FeatureResult,
    feature_fingerprint,
    prepared,
    read_results,
    results_path,
    run_feature,
    write_results,
)

STALE = "A prompt changed: the evaluations must run again"


def _settings() -> Settings:
    # The models and prompts in the code, never a server's own overrides.
    return Settings(_env_file=None)  # pyright: ignore[reportCallIssue]


def check() -> list[str]:
    """Everything wrong, as lines to show; empty when the pull request may merge."""
    try:
        cases = load()
    except CaseError as error:
        return [str(error)]
    settings = _settings()
    problems: list[str] = []
    for case in cases:
        try:
            prepared(case, settings)
        except Exception as error:  # a context the API would refuse
            problems.append(f"{case.key}: the server would refuse it: {error}")
    if problems:
        return problems
    for feature in FeatureName:
        mine = [c for c in cases if c.feature is feature]
        if not mine:
            problems.append(f"{feature.value}: no cases")
            continue
        committed = read_results(feature)
        if committed is None:
            print(f"{feature.value}: {len(mine)} cases, not run yet (no results committed)")
            continue
        if committed.fingerprint != feature_fingerprint(mine, settings):
            problems.append(f"{feature.value}: {STALE} (python -m evals run, with the key)")
            continue
        below = committed.problems()
        if below:
            problems.append(f"{feature.value}: below the bar: {'; '.join(below)}")
        else:
            print(f"{feature.value}: {len(mine)} cases, {committed.rate:.0%} of rubric lines pass")
    return problems


def _baseline(feature: FeatureName) -> float | None:
    """The rate in main's committed results, if there are any."""
    path = results_path(feature).relative_to(Path(__file__).parents[3]).as_posix()
    try:
        shown = subprocess.run(  # noqa: S603
            ["git", "show", f"origin/main:{path}"],  # noqa: S607
            capture_output=True,
            text=True,
            check=True,
        ).stdout
    except (OSError, subprocess.CalledProcessError):
        return None
    return FeatureResult.from_json(json.loads(shown)).rate


def _summary(lines: list[str]) -> None:
    out = os.environ.get("GITHUB_STEP_SUMMARY")
    if out:
        with Path(out).open("a", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")


async def run(every: bool, claude: Claude | None = None) -> int:
    cases: list[Case] = load()
    settings = _settings()
    due = [
        f
        for f in FeatureName
        if every
        or (r := read_results(f)) is None
        or r.fingerprint != feature_fingerprint([c for c in cases if c.feature is f], settings)
    ]
    if not due:
        print("Every feature's results are current: nothing to run.")
        return 0
    key = os.environ.get("ANTHROPIC_EVAL_KEY")
    if claude is None and not key:
        line = (
            "The live evaluations did not run: ANTHROPIC_EVAL_KEY is not set "
            f"(due: {', '.join(f.value for f in due)})."
        )
        print(line)
        _summary([f"> {line}"])
        return 0
    model: Claude = claude if claude is not None else AnthropicClaude(key or "")
    report = ["| Feature | Rubric lines | Result |", "| --- | --- | --- |"]
    failed = False
    for feature in due:
        try:
            result = await run_feature(feature, cases, settings, model, model, print)
        except ClaudeError as error:
            print(f"{feature.value}: the run stopped: {error.reason}", file=sys.stderr)
            return 2
        write_results(result)
        below = result.problems(_baseline(feature))
        failed = failed or bool(below)
        report.append(
            f"| {feature.value} | {result.rate:.0%} | "
            f"{'Below the bar: ' + '; '.join(below) if below else 'Passing'} |"
        )
        for c in result.cases:
            if not c.passed:
                why = [k for k, ok in c.rules.items() if not ok] + [
                    v["reason"] for v in c.lines if not v["pass"]
                ]
                report.append(f"| | `{c.id}` | {'; '.join(why)} |")
    print("\n".join(report))
    _summary(["## AI evaluations", "", *report])
    return 1 if failed else 0


def main() -> int:
    parser = argparse.ArgumentParser(prog="python -m evals")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("check", help="no key: check the cases and the committed results")
    live = sub.add_parser("run", help="run the cases against the real model")
    live.add_argument("--all", action="store_true", help="every feature, not only stale ones")
    args = parser.parse_args()
    if args.command == "check":
        problems = check()
        for line in problems:
            print(line, file=sys.stderr)
        return 1 if problems else 0
    return asyncio.run(run(args.all))


if __name__ == "__main__":
    sys.exit(main())
