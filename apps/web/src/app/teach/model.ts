// The live board's model (design/mockups/Teacher.dc.html): everything the board shows, worked
// out from the API's snapshot and the socket's frames. Pure, so the example class and a real
// class go through the same code, and the tests check it without a browser.
import type {
  BenchOut,
  LiveMessageOut,
  LiveSnapshot,
  Mistake,
  StepName,
  TeacherFrame,
} from "@pa/api-client";
import { STEPS } from "@pa/engine";
import { countFromOneErrorPercent, simplePendulum } from "@pa/experiments";
import { hasMessage, t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/teach";
import { DEFAULT_ENVIRONMENT } from "@pa/instruments";

export type Filter = "all" | "help" | "on-track";
export type Tone = "red" | "amber" | "green" | "violet" | "grey";

const key = (k: string) => k as MessageKey;

// Snapshot and frames

/** The snapshot after one socket frame, or "resync" when the board must read it again. */
export function applyFrame(
  s: LiveSnapshot,
  frame: TeacherFrame,
  now: Date = new Date(),
): LiveSnapshot | "resync" {
  switch (frame.type) {
    case "bench": {
      const others = s.benches.filter((b) => b.member_id !== frame.bench.member_id);
      return { ...s, benches: byName([...others, frame.bench]) };
    }
    case "presence":
      return {
        ...s,
        benches: s.benches.map((b) =>
          b.member_id === frame.member_id
            ? { ...b, here: frame.here, ...(frame.here ? { last_seen_at: now.toISOString() } : {}) }
            : b,
        ),
      };
    case "message":
      return s.messages.some((m) => m.id === frame.message.id)
        ? s
        : { ...s, messages: [...s.messages, frame.message] };
    case "undone":
      return {
        ...s,
        messages: s.messages.map((m) =>
          m.id === frame.id && m.undone_at === null ? { ...m, undone_at: now.toISOString() } : m,
        ),
      };
    case "lock":
      return s.session ? { ...s, session: { ...s.session, steps_locked: frame.locked } } : s;
    case "started":
      return { ...s, session: frame.session, benches: [], messages: [] };
    case "ended":
      return { ...s, session: null, benches: [], messages: [] };
    case "resync":
      return "resync";
    case "pong":
      return s;
  }
}

const byName = (benches: BenchOut[]) =>
  [...benches].sort((a, b) => a.display_name.localeCompare(b.display_name, "en-GB"));

// Words for mistakes

/** Numbers the pendulum's teacher wording needs, all from the experiment and the physics. */
function mistakeParams(): Record<string, number> {
  const swings = simplePendulum.swings;
  return { swings, timed: swings - 1, percent: countFromOneErrorPercent(DEFAULT_ENVIRONMENT.g) };
}

/** How the teacher reads a mistake: their own wording, else the coach's title, else its rule. */
export function mistakeName(m: Pick<Mistake, "rule" | "key">): string {
  const own = `teach.mistake.${m.rule}`;
  if (hasMessage(own)) return t(key(own), mistakeParams());
  if (hasMessage(`${m.key}.title`)) return t(key(`${m.key}.title`), mistakeParams());
  return m.rule;
}

export function mistakeChip(m: Pick<Mistake, "rule" | "key">): string {
  const own = `teach.mistake.${m.rule}.chip`;
  return hasMessage(own) ? t(key(own)) : mistakeName(m);
}

export function mistakeDetail(m: Pick<Mistake, "rule" | "key">): string {
  const own = `teach.mistake.${m.rule}.detail`;
  if (hasMessage(own)) return t(key(own), mistakeParams());
  if (hasMessage(`${m.key}.detail`)) return t(key(`${m.key}.detail`), mistakeParams());
  return mistakeName(m);
}

export const stepName = (step: StepName) => t(key(`lab.steps.${step}`));

// Hints

/** The hints still standing (not undone), by the mistake's rule, oldest first. A rule can have
 * several: pushing it again reaches the students the earlier hints did not. */
export function standingHints(s: LiveSnapshot): Map<string, LiveMessageOut[]> {
  const out = new Map<string, LiveMessageOut[]>();
  for (const m of s.messages) {
    const rule = m.data.rule;
    if (m.kind === "hint" && m.undone_at === null && typeof rule === "string")
      out.set(rule, [...(out.get(rule) ?? []), m]);
  }
  return out;
}

type Hints = Map<string, LiveMessageOut[]>;
const reached = (hints: Hints, rule: string, memberId: string) =>
  (hints.get(rule) ?? []).some(
    (h) => h.to_member_ids === null || h.to_member_ids.includes(memberId),
  );

// The board

export interface BenchCard {
  readonly memberId: string;
  readonly name: string;
  readonly stepIndex: number;
  readonly stage: string;
  /** The mistake they need help with: one no standing hint has reached them for. */
  readonly needs: Mistake | null;
  readonly help: boolean;
  readonly status: string;
  readonly tone: Tone;
  readonly bench: BenchOut;
}

export interface MistakeRow {
  readonly rule: string;
  readonly key: string;
  readonly name: string;
  readonly students: number;
  readonly sent: LiveMessageOut | null;
  readonly chip: string;
  readonly tone: Tone;
}

export interface Board {
  readonly here: number;
  readonly joined: number;
  readonly offline: number;
  readonly helpCount: number;
  /** Up to three groups for the help tile's bar: the commonest mistakes needing help. */
  readonly helpGroups: readonly { rule: string; count: number }[];
  readonly helpCaption: string;
  readonly measured: number;
  readonly measuredBars: readonly number[];
  readonly minutesLive: number;
  readonly secondsLeft: number;
  readonly lessonSeconds: number;
  readonly paceCaption: string;
  readonly benches: readonly BenchCard[];
  readonly mistakes: readonly MistakeRow[];
  readonly stages: readonly { step: StepName; name: string; count: number; share: number }[];
}

const ms = (iso: string) => new Date(iso).getTime();

function card(b: BenchOut, hints: Hints): BenchCard {
  const needs = b.mistakes.find((m) => !reached(hints, m.rule, b.member_id)) ?? null;
  const hinted = b.mistakes.some((m) => reached(hints, m.rule, b.member_id));
  const stepIndex = STEPS.indexOf(b.step);
  const help = b.here && needs !== null;
  const [status, tone]: [string, Tone] = !b.here
    ? [t(key("teach.bench.offline")), "grey"]
    : needs
      ? [mistakeChip(needs), "amber"]
      : hinted
        ? [t(key("teach.bench.hintSent")), "violet"]
        : [t(key("teach.bench.onTrack")), "green"];
  return {
    memberId: b.member_id,
    name: b.display_name,
    stepIndex,
    stage: stepName(b.step),
    needs,
    help,
    status,
    tone,
    bench: b,
  };
}

/** The steps the board always lists (Build to Analyse), plus any other step someone is on. */
const LISTED: readonly StepName[] = ["build", "check", "measure", "tabulate", "plot", "analyse"];
const BARS = 12;
const PLOT = STEPS.indexOf("plot");

export function board(s: LiveSnapshot, now: number): Board {
  const hints = standingHints(s);
  const cards = s.benches.map((b) => card(b, hints));
  const here = cards.filter((c) => c.bench.here).length;
  const helpCards = cards.filter((c) => c.help);

  // Help groups: how many need help with each mistake, commonest first.
  const groups = new Map<string, { m: Mistake; count: number }>();
  for (const c of helpCards) {
    const g = groups.get(c.needs!.rule) ?? { m: c.needs!, count: 0 };
    g.count += 1;
    groups.set(c.needs!.rule, g);
  }
  const ranked = [...groups.values()].sort((a, b) => b.count - a.count);
  const helpCaption = ranked[0]
    ? t(key("teach.tile.help.most"), { mistake: mistakeName(ranked[0].m).toLowerCase() })
    : t(key("teach.tile.help.none"));

  // Mistakes happening now: every current mistake on a bench that is here.
  // A row counts as sent once every student with the mistake has been reached; a student who
  // makes it later turns it back into "Push hint", for them alone.
  const rows = new Map<string, { m: Mistake; students: number; waiting: number }>();
  for (const c of cards) {
    if (!c.bench.here) continue;
    for (const m of c.bench.mistakes) {
      const row = rows.get(m.rule) ?? { m, students: 0, waiting: 0 };
      row.students += 1;
      if (!reached(hints, m.rule, c.memberId)) row.waiting += 1;
      rows.set(m.rule, row);
    }
  }
  const mistakes: MistakeRow[] = [...rows.values()]
    .sort((a, b) => b.students - a.students || a.m.rule.localeCompare(b.m.rule))
    .map(({ m, students: all, waiting }) => {
      const sent = waiting === 0 ? (hints.get(m.rule)?.at(-1) ?? null) : null;
      const students = sent ? all : waiting;
      return {
        rule: m.rule,
        key: m.key,
        name: mistakeName(m),
        students,
        sent,
        chip: sent
          ? t(key("teach.mistakes.sentTo"), { count: all })
          : students === 1
            ? t(key("teach.mistakes.student"))
            : t(key("teach.mistakes.students"), { count: students }),
        tone: sent ? "violet" : "amber",
      };
    });

  // Where the class is.
  const counts = new Map<StepName, number>();
  for (const c of cards) counts.set(c.bench.step, (counts.get(c.bench.step) ?? 0) + 1);
  const shown = STEPS.filter((st) => LISTED.includes(st) || (counts.get(st) ?? 0) > 0);
  const most = Math.max(1, ...counts.values());
  const stages = shown.map((step) => {
    const count = counts.get(step) ?? 0;
    return { step, name: stepName(step), count, share: count / most };
  });

  // Finished measuring, and when.
  const started = s.session ? ms(s.session.started_at) : now;
  const span = Math.max(1, now - started);
  const measuredBars = Array.from({ length: BARS }, () => 0);
  let measured = 0;
  for (const c of cards) {
    if (!c.bench.completed.includes("measure")) continue;
    measured += 1;
    const at = c.bench.measured_at ? ms(c.bench.measured_at) : now;
    const i = Math.min(BARS - 1, Math.max(0, Math.floor(((at - started) / span) * BARS)));
    measuredBars[i] = (measuredBars[i] ?? 0) + 1;
  }

  // Time left, and the pace: each bench's steps per minute so far, carried to the end.
  const lessonSeconds = (s.session?.lesson_minutes ?? 0) * 60;
  const elapsed = (now - started) / 1000;
  const secondsLeft = Math.max(0, Math.round(lessonSeconds - elapsed));
  let paceCaption: string;
  if (secondsLeft === 0 && s.session) paceCaption = t(key("teach.tile.left.over"));
  else if (elapsed < 180 || cards.length === 0) paceCaption = t(key("teach.tile.left.early"));
  else {
    const reach = cards.filter((c) => {
      const minutes = Math.max(1, (now - ms(c.bench.joined_at)) / 60_000);
      const done = c.bench.completed.length;
      return done + (done / minutes) * (secondsLeft / 60) >= PLOT;
    }).length;
    paceCaption = t(key("teach.tile.left.pace"), { count: reach, of: cards.length });
  }

  const ordered = [...cards].sort(
    (a, b) => Number(b.help) - Number(a.help) || a.name.localeCompare(b.name, "en-GB"),
  );

  return {
    here,
    joined: cards.length,
    offline: cards.length - here,
    helpCount: helpCards.length,
    helpGroups: ranked.slice(0, 3).map((g) => ({ rule: g.m.rule, count: g.count })),
    helpCaption,
    measured,
    measuredBars,
    minutesLive: Math.max(0, Math.floor(elapsed / 60)),
    secondsLeft,
    lessonSeconds,
    paceCaption,
    benches: ordered,
    mistakes,
    stages,
  };
}

export function shown(benches: readonly BenchCard[], filter: Filter): readonly BenchCard[] {
  if (filter === "all") return benches;
  return benches.filter((b) => (filter === "help" ? b.help : !b.help));
}

export const clock = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
