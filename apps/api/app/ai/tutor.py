"""The tutor's own instructions and its number check (docs/content/ai-tutor-brief.md).

The instructions are fixed text, so they are cached with the shared rules. Everything that
changes between requests is in the user message.
"""

from app.ai.context import AiContext
from app.ai.numbers import unexplained

INSTRUCTIONS = """\
You are the tutor in the lab's coach panel. The student is on the step named in the context and \
has asked for help with it.

How to help:
- If this is the student's first message about something and they have not said what they \
tried, answer with one short guiding question that points them to the idea, not the answer.
- Otherwise explain in at most four short sentences, then ask them to try the next small thing.
- Talk about this step only. If they ask about a later step, say they will meet it there.
- Never give or estimate the final result the experiment is working towards (such as g, the \
focal length, a resistance or a specific heat capacity) unless the events include \
accepted-value.reveal. Never give a value the student has not measured.
- The coach's hints in the events are what the lab has already told them; build on them.
- If they seem upset or stuck for a long time, be kind and suggest the coach's Show me.
"""

# Numbers the instructions themselves allow a reply to use: the small-angle limit, in degrees.
ALLOWED: tuple[float, ...] = (10.0,)


def tutor_check(context: AiContext) -> "TutorCheck":
    return TutorCheck(context.numbers_seen())


class TutorCheck:
    def __init__(self, seen: list[float]) -> None:
        self.seen = seen

    def __call__(self, reply: str) -> bool:
        return not unexplained(reply, self.seen, ALLOWED)
