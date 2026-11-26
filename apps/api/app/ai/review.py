"""Report review (ai-tutor-brief.md, decision 7): comments on a few sections, each on the
student's own words and the rule it relies on. Claude never rewrites the report.

Only the sections that need judgement are sent: the conclusion, precautions, sources of error and
(university format) the discussion. Never the date and title, the aim, the table or anything else.
Claude answers with JSON (structured outputs); every comment is checked here before it is sent:
its words must be quoted exactly from that section, its rule must be one of REPORT_RULES, and its
numbers must be the student's own. A comment that fails is dropped, not shown.
"""

import json
import re
from typing import Annotated, Any, Literal, cast

from pydantic import Field

from app.ai.context import STUDENT_TAG, Slug, as_data
from app.ai.numbers import numbers_in, unexplained
from app.schemas import Body

SectionId = Literal["conclusion", "precautions", "sources", "discussion"]
MAX_SECTION_TEXT = 4000
MAX_COMMENTS = 8

# The rules a comment may rely on: what WASSCE and university practical reports ask of these
# sections. Content, approved by the physics reviewer.
REPORT_RULES: dict[str, str] = {
    "precaution-first-person": "A precaution says what you did, in the first person: I kept…",
    "precaution-not-error": "A precaution is something you did to avoid an error, not an error.",
    "precaution-specific": "A precaution names the part and the action: not just 'I was careful'.",
    "source-not-mistake": "A source of error is a limit of the apparatus or the method, "
    "not a mistake you made.",
    "source-effect": "A source of error says which reading it affects, and how.",
    "conclusion-answers-aim": "The conclusion answers the aim, with the result and its unit.",
    "conclusion-compares": "The conclusion compares the result with the accepted value.",
    "discussion-dominant-error": "The discussion says which source of error mattered most, "
    "and why.",
    "units": "Every quantity has its unit.",
}


class ReviewSection(Body):
    id: SectionId
    text: Annotated[str, Field(min_length=1, max_length=MAX_SECTION_TEXT)]


class ReviewRequest(Body):
    experiment_id: Slug
    experiment_version: Annotated[int, Field(ge=1)]
    format: Literal["wassce", "university"]
    sections: Annotated[list[ReviewSection], Field(min_length=1, max_length=4)]


INSTRUCTIONS = f"""\
You review sections of a student's practical report: the conclusion, precautions, sources of \
error and discussion. You comment; you never rewrite.

Answer with JSON only. For each problem you find (at most {MAX_COMMENTS}, the most useful first):
- section: the section's id;
- quote: the student's words the comment is about, copied exactly from that section, a phrase or \
one sentence;
- comment: one or two plain sentences saying what to change and why, addressed to the student;
- rule: the id of the rule it relies on, from this list only:
{chr(10).join(f"  {rule_id}: {text}" for rule_id, text in REPORT_RULES.items())}
If a section is fine, say nothing about it. Use no number in a comment that the student did not \
write. Do not give the result, the accepted value or a better value.
"""


def output_schema(sections: list[str]) -> dict[str, Any]:
    comment = {
        "type": "object",
        "properties": {
            "section": {"type": "string", "enum": sections},
            "quote": {"type": "string"},
            "comment": {"type": "string"},
            "rule": {"type": "string", "enum": list(REPORT_RULES)},
        },
        "required": ["section", "quote", "comment", "rule"],
        "additionalProperties": False,
    }
    return {
        "type": "object",
        "properties": {"comments": {"type": "array", "items": comment}},
        "required": ["comments"],
        "additionalProperties": False,
    }


def user_message(request: ReviewRequest) -> str:
    """The report's sections, each in its own data block; nothing else about the student."""
    head = (
        f"Experiment: {request.experiment_id} (version {request.experiment_version})\n"
        f"Report format: {request.format}"
    )
    blocks = [
        f'<{STUDENT_TAG} section="{s.id}">\n{as_data(s.text)}\n</{STUDENT_TAG}>'
        for s in request.sections
    ]
    return "\n\n".join([head, *blocks])


def _squash(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


class ReviewCheck:
    """Keeps only the comments that quote the student exactly and rely on a listed rule."""

    def __init__(self, request: ReviewRequest) -> None:
        self.texts = {s.id: _squash(s.text) for s in request.sections}
        self.seen = [n for s in request.sections for n in numbers_in(s.text)]

    def _keep(self, raw: Any) -> dict[str, str] | None:
        if not isinstance(raw, dict):
            return None
        c = cast(dict[str, Any], raw)
        section, quote, comment, rule = (c.get(k) for k in ("section", "quote", "comment", "rule"))
        if not all(isinstance(v, str) for v in (section, quote, comment, rule)):
            return None
        section, quote, comment, rule = (
            cast(str, section),
            _squash(cast(str, quote)),
            cast(str, comment).strip(),
            cast(str, rule),
        )
        if section not in self.texts or rule not in REPORT_RULES:
            return None
        if not (0 < len(quote) <= 300 and quote in self.texts[section]):
            return None
        if not 0 < len(comment) <= 400 or unexplained(comment, self.seen):
            return None
        return {"section": section, "quote": quote, "comment": comment, "rule": rule}

    def __call__(self, reply: str) -> dict[str, Any] | None:
        try:
            parsed: Any = json.loads(reply)
        except ValueError:
            return None
        if not isinstance(parsed, dict):
            return None
        raw = cast(dict[str, Any], parsed).get("comments")
        if not isinstance(raw, list):
            return None
        items = cast(list[Any], raw)[:MAX_COMMENTS]
        kept = [k for k in (self._keep(c) for c in items) if k is not None]
        return {
            "comments": [{**k, "rule_text": REPORT_RULES[k["rule"]]} for k in kept],
            "dropped": len(items) - len(kept),
        }
