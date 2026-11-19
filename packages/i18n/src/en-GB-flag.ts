/**
 * English (en-GB) messages for reporting an AI answer (design/mockups/AI.dc.html,
 * docs/content/ai-evals-brief.md decision 6). Registered by importing "@pa/i18n/flag" in the
 * report link, which loads only with an AI answer. Copy follows AGENTS.md rule 6.
 */
export const enGBFlag = {
  "ai.flag.link": "Report this answer",
  "ai.flag.linkNote": "Report this note",
  "ai.flag.title": "What is wrong with this answer?",
  "ai.flag.reason": "Reason",
  "ai.flag.reason.wrong-physics": "Wrong physics",
  "ai.flag.reason.confusing": "Confusing",
  "ai.flag.reason.unsuitable": "Unkind or unsuitable",
  "ai.flag.reason.other": "Something else",
  "ai.flag.kept":
    "We keep the answer and your reason so staff can check it. Not your question, and not your name.",
  "ai.flag.send": "Send report",
  "ai.flag.cancel": "Cancel",
  "ai.flag.sending": "Sending…",
  "ai.flag.thanks": "Thanks for telling us",
  "ai.flag.thanksNote":
    "Staff will check this answer. The tutor still works, and so does the coach.",
  "ai.flag.failed": "The report could not be sent. Try again when you are online.",
} as const;
