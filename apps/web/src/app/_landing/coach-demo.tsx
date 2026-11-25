import { meanDecimals, parseTable, type TableColumn } from "@pa/analysis";
import { benchPeriod, simplePendulum } from "@pa/experiments";
import { t } from "@pa/i18n";
import "@pa/i18n/landing";
import { figureTone } from "@pa/ui";

const G = 9.81;
const { swings, stopwatch } = simplePendulum;
/** Decimal places the stopwatch reads to (0.01 s: 2). */
const PLACES = Math.round(-Math.log10(stopwatch.resolution));

const COLUMNS: TableColumn[] = [
  { id: "l", symbol: "l", kind: "length", unit: "m", source: "given" },
  ...(["t1", "t2"] as const).map((id): TableColumn => ({
    id,
    symbol: id === "t1" ? "t₁" : "t₂",
    kind: "time",
    unit: "s",
    source: "measured",
    leastCount: { value: stopwatch.resolution, unit: "s", digital: true },
  })),
  { id: "t", symbol: "t", kind: "time", unit: "s", source: "derived", meanOf: ["t1", "t2"] },
];

/** One row as a student would time it: the stopwatch's reading of 20 swings, twice. */
function timed(length: number) {
  const reading = (swings * benchPeriod(G, length)).toFixed(PLACES);
  return { length, reading, mean: Number(reading).toFixed(PLACES + 1) };
}

/**
 * The coach demo's table and the coach's words (landing page brief, decision 4). The times come
 * from the pendulum's exact period; the student writes the 0.800 m row's mean with as many places
 * as the readings, and the lab's own tabulation rule (packages/analysis) finds it, so the toast
 * says what the lab says.
 */
export function coachDemo() {
  const rows = [timed(0.9), timed(0.8)];
  const slip = rows[1]!.reading;
  const table = parseTable({
    columns: COLUMNS,
    rows: rows.map((r, i) => ({
      id: `r${i + 1}`,
      cells: {
        l: r.length.toFixed(3),
        t1: r.reading,
        t2: r.reading,
        t: i === 1 ? slip : r.mean,
      },
    })),
  });
  const [finding] = meanDecimals.check({ table });
  if (!finding) throw new Error("The coach demo's slip must be one the lab catches");
  const params = { ...finding.params, row: 2 };
  return {
    rows: rows.map((r) => ({
      l: r.length.toFixed(3),
      t: r.mean,
      T: (Number(r.mean) / swings).toFixed(PLACES + 1),
    })),
    slip,
    fixed: rows[1]!.mean,
    title: t("table.meanDecimals.title", params),
    detail: t("table.meanDecimals.detail"),
  };
}

/**
 * "Caught the moment it happens" (Main.dc.html): a ten-second loop of a student writing a mean
 * with too few places, the coach's note, and the corrected mean. Pure CSS animation, no script;
 * with reduced motion it shows the corrected table and the note.
 */
export function CoachDemo() {
  const demo = coachDemo();
  const cols = "grid grid-cols-3 gap-2";
  return (
    <div
      className="relative min-w-0 flex-[1_1_600px] overflow-hidden bg-[var(--pa-ink-850)] text-[var(--pa-text)] shadow-[0_30px_60px_-30px_color-mix(in_srgb,var(--pa-on-paper)_50%,transparent)]"
      role="img"
      aria-label={t("landing.coach.figure", { slip: demo.slip, fixed: demo.fixed })}
    >
      <div
        className="flex items-center gap-1.5 border-b border-[var(--pa-line)] px-3.5 py-3"
        aria-hidden="true"
      >
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-2.5 rounded-full bg-[var(--pa-line-strong)]" />
        ))}
        <span className="ml-3 text-xs text-[var(--pa-text-muted)]">
          {t("landing.coach.window")}
        </span>
      </div>
      <div className="relative flex h-[340px]" aria-hidden="true">
        <div className="flex flex-[0_0_38%] items-center justify-center border-r border-[var(--pa-line)] max-sm:hidden">
          <svg width="150" height="200" viewBox="0 0 150 200">
            <rect x="30" y="10" width="6" height="180" fill={figureTone.rod} />
            <line
              x1="36"
              y1="24"
              x2="100"
              y2="24"
              stroke={figureTone.clampEdge}
              strokeWidth="5"
              strokeLinecap="round"
            />
            <rect x="96" y="18" width="10" height="12" fill={figureTone.cork} />
            <line x1="101" y1="30" x2="112" y2="150" stroke={figureTone.thread} strokeWidth="1.4" />
            <circle cx="113" cy="158" r="10" fill={figureTone.mark} />
          </svg>
        </div>
        <div className="flex flex-1 flex-col gap-2.5 p-5 font-mono text-sm">
          <div className={`${cols} text-[var(--pa-text-muted)]`}>
            <span>l/m</span>
            <span>t/s</span>
            <span>T/s</span>
          </div>
          <div className={cols}>
            <span>{demo.rows[0]!.l}</span>
            <span>{demo.rows[0]!.t}</span>
            <span>{demo.rows[0]!.T}</span>
          </div>
          <div className={cols}>
            <span>{demo.rows[1]!.l}</span>
            <span className="relative">
              <span className="pa-wrong absolute -left-1.5 -top-1 bg-[var(--pa-dash-chip-red-bg)] px-1.5 py-[3px] outline outline-[1.5px] outline-[var(--pa-accent)]">
                {demo.slip}
              </span>
              <span className="pa-right absolute -left-1.5 -top-1 whitespace-nowrap bg-[var(--pa-dash-chip-green-bg)] px-1.5 py-[3px] outline outline-[1.5px] outline-[var(--pa-topic-measurement)]">
                {demo.fixed} ✓
              </span>
            </span>
            <span>{demo.rows[1]!.T}</span>
          </div>
          <div className={`${cols} text-[var(--pa-text-faint)]`}>
            <span>0.700</span>
            <span>…</span>
            <span>…</span>
          </div>
          <span className="mt-[18px] self-start bg-[var(--pa-accent)] px-3.5 py-2 font-sans font-semibold text-[var(--pa-ink-950)]">
            {t("landing.coach.record")}
          </span>
        </div>
        <div className="pa-toast absolute bottom-[18px] left-5 right-5 flex items-start gap-2.5 bg-[var(--pa-text)] px-3.5 py-3 text-sm text-[var(--pa-on-paper)]">
          <span className="mt-[7px] size-2 flex-none rounded-full bg-[var(--pa-accent)]" />
          <span>
            <b>{demo.title}.</b> {demo.detail}
          </span>
        </div>
        <svg className="pa-cursor absolute left-0 top-0" width="22" height="26" viewBox="0 0 22 26">
          <path
            d="M2 2 L2 21 L7 16 L10.5 24 L14 22.5 L10.5 15 L18 15 Z"
            fill="var(--pa-text)"
            stroke="var(--pa-ink-950)"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
