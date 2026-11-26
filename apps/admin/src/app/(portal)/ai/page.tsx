// AI (docs/content/ai-quotas-brief.md, decision 5; design/mockups/AiAdmin.dc.html): today's
// requests and spend against the budget, the cache, held replies, use by feature, and the switches.
// Counts come from the AI request log, which keeps no prompt, no reply and no name.
import type { AiFeatureUse, AiOverview } from "@pa/api-client";
import Link from "next/link";

import { AccountsOff } from "@/components/accounts-off";
import { Evaluations } from "@/components/ai-evals";
import { AiFlags } from "@/components/ai-flags";
import { AiSwitches } from "@/components/ai-switches";
import { ApiProblem, Chip, type ChipKind, Panel, Tile } from "@/components/bits";
import { TopBar } from "@/components/topbar";
import { FEATURE_NAMES, dollars } from "@/lib/ai";
import { adminGet, staffMe } from "@/lib/api";
import { n, percent } from "@/lib/format";
import { rangeOf } from "@/lib/range";

// A feature's held replies need a look when today's share is well above its usual share.
const HELD_MIN_REQUESTS = 20;
const HELD_MIN_SHARE = 0.02;
const NEAR_BUDGET = 0.9;

interface Item {
  readonly kind: ChipKind;
  readonly chip: string;
  readonly title: string;
  readonly meta: string;
  readonly href: string;
}

const sum = (rows: readonly AiFeatureUse[], pick: (r: AiFeatureUse) => number) =>
  rows.reduce((s, r) => s + pick(r), 0);

function attention(a: AiOverview, spentShare: number | null, rangeLong: string): Item[] {
  const items: Item[] = [];
  if (a.budget_reached_at !== null)
    items.push({
      kind: "red",
      chip: "Budget",
      title: "Today's budget is reached: AI is off until midnight",
      meta: "Raise the monthly ceiling to raise the daily budget",
      href: "#switches",
    });
  else if (spentShare !== null && spentShare >= NEAR_BUDGET)
    items.push({
      kind: "amber",
      chip: "Budget",
      title: `Spend is at ${String(Math.round(spentShare * 100))}% of today's budget`,
      meta: "AI switches itself off when it reaches 100%",
      href: "#switches",
    });
  for (const today of a.today) {
    const usual = a.by_feature.find((f) => f.feature === today.feature);
    if (!usual || today.requests < HELD_MIN_REQUESTS) continue;
    const share = today.held / today.requests;
    const usualShare = usual.requests ? usual.held / usual.requests : 0;
    if (share >= HELD_MIN_SHARE && share > 2 * usualShare)
      items.push({
        kind: "amber",
        chip: "Held",
        title: `Held ${FEATURE_NAMES[today.feature].toLowerCase()} replies rose to ${percent(today.held, today.requests)} today`,
        meta: `${rangeLong}: ${percent(usual.held, usual.requests)}`,
        href: "#features",
      });
  }
  for (const e of a.evaluations)
    if (e.passed === false)
      items.push({
        kind: "red",
        chip: "Evaluation",
        title: `${FEATURE_NAMES[e.feature]} is below the evaluation bar`,
        meta: `${String(e.failing.length)} failing cases in the latest results`,
        href: "#evaluations",
      });
  if (a.flags_open > 0)
    items.push({
      kind: "amber",
      chip: "Flagged",
      title:
        a.flags_open === 1
          ? "A student or teacher reported an answer"
          : `${String(a.flags_open)} answers reported`,
      meta: "Check each one; turn real problems into evaluation cases",
      href: "#flags",
    });
  return items;
}

const clock = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

export default async function AiPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const range = rangeOf((await searchParams).range);
  const [me, r] = await Promise.all([
    staffMe(),
    adminGet<AiOverview>(`/admin/ai?range=${range.id}`),
  ]);
  const top = (
    <TopBar
      page="AI"
      range={range.id}
      rangeHref={(id) => `/ai?range=${id}`}
      environment={me.ok ? me.data.environment : null}
    />
  );
  if (!r.ok)
    return (
      <>
        {top}
        <ApiProblem status={r.status} detail={r.detail} />
      </>
    );
  const a = r.data;
  const requests = sum(a.today, (f) => f.requests);
  const spent = sum(a.today, (f) => f.cost_microdollars);
  const cached = sum(a.today, (f) => f.cached);
  const held = sum(a.today, (f) => f.held);
  const busiest = [...a.today].sort((x, y) => y.requests - x.requests)[0];
  const budget = a.budget_microdollars;
  const share = budget ? spent / budget : null;
  const reached = a.budget_reached_at !== null;
  const meter = reached
    ? "var(--pa-danger-fg)"
    : share !== null && share >= NEAR_BUDGET
      ? "var(--pa-warn-fg)"
      : "var(--pa-text)";
  const items = attention(a, share, range.long);
  const most = Math.max(1, ...a.by_feature.map((f) => f.requests));
  const cols = "150px minmax(80px, 1fr) 90px 90px";

  return (
    <>
      {top}
      <div className="ad-body">
        <AccountsOff about="AI help is off for everyone, whatever the switches below say." />
        {reached && a.budget_reached_at !== null && (
          <div
            role="status"
            className="ad-panel"
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              borderColor: "var(--pa-danger-fg)",
            }}
          >
            <Chip kind="red">Budget reached</Chip>
            <span style={{ flex: 1 }}>
              AI switched itself off at {clock.format(new Date(a.budget_reached_at))} UTC: today’s
              spend passed the daily budget. It comes back at midnight. Students see “AI help has
              reached today’s limit. The coach still works.”
            </span>
          </div>
        )}

        <div className="ad-tiles">
          <Tile title="Requests today" when="Since midnight UTC" href="#features" link="By feature">
            <span className="ad-big">{n(requests)}</span>
            <span className="ad-sub">
              {busiest && busiest.requests > 0
                ? `${FEATURE_NAMES[busiest.feature]} most: ${percent(busiest.requests, requests)}`
                : "No AI requests yet today"}
            </span>
          </Tile>
          <Tile title="Spend today" when="Since midnight UTC" href="#switches" link="Switches">
            <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span className="ad-big">{dollars(spent)}</span>
              <span className="ad-sub">
                {budget === null ? "No daily budget set" : `of ${dollars(budget)}`}
              </span>
            </span>
            {budget !== null && share !== null && (
              <span
                className="ad-track"
                role="img"
                aria-label={`${String(Math.round(share * 100))}% of the daily budget`}
                style={{ display: "block", height: 6, position: "relative" }}
              >
                <span
                  style={{
                    position: "absolute",
                    inset: "0 auto 0 0",
                    width: `${String(Math.min(100, Math.round(share * 100)))}%`,
                    background: meter,
                  }}
                />
              </span>
            )}
            <span className="ad-sub">Daily budget: the monthly ceiling ÷ 30</span>
          </Tile>
          <Tile title="Cache hit rate" when="Today" href="#features" link="By feature">
            <span className="ad-big">{percent(cached, requests)}</span>
            <span className="ad-sub">Served from the cache, at no cost</span>
          </Tile>
          <Tile title="Held replies" when="Today" href="#attention" link="Needs attention">
            <span className="ad-big">{n(held)}</span>
            <span className="ad-sub">A number not from the bench, or not runnable</span>
          </Tile>
        </div>

        <div className="ad-split">
          <div id="features" className="ad-wide">
            <Panel title={`By feature, ${range.long.toLowerCase()}`} sub="Requests · cost">
              <div role="table" aria-label="AI use by feature" className="ad-table">
                {a.by_feature.map((f) => (
                  <div
                    key={f.feature}
                    role="row"
                    className="ad-tr"
                    style={{ gridTemplateColumns: cols, gap: 12 }}
                  >
                    <span role="cell">{FEATURE_NAMES[f.feature]}</span>
                    <span role="cell">
                      <span
                        className="ad-hatch-ok"
                        role="img"
                        aria-label={`${FEATURE_NAMES[f.feature]}: ${n(f.requests)} requests`}
                        style={{
                          display: "block",
                          height: 14,
                          width: `${String(Math.max(f.requests ? 2 : 0, Math.round((f.requests / most) * 100)))}%`,
                        }}
                      />
                    </span>
                    <span role="cell" className="ad-mono" style={{ textAlign: "right" }}>
                      {n(f.requests)}
                    </span>
                    <span role="cell" className="ad-mono" style={{ textAlign: "right" }}>
                      {dollars(f.cost_microdollars)}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div id="switches" className="ad-narrow">
            <Panel title="Switches" sub="Audited, with undo">
              <AiSwitches switches={a.switches} budgetReached={reached} />
              <span
                className="ad-sub"
                style={{ padding: "10px 16px", borderTop: "1px solid var(--pa-ink-800)" }}
              >
                {!a.server_enabled
                  ? "AI_ENABLED is off on this server, so AI is off whatever these say."
                  : !a.configured
                    ? "The Anthropic key is not set on this server, so AI is off."
                    : "Off takes effect within 10 seconds. AI_ENABLED on the server stays the master switch."}
              </span>
            </Panel>
          </div>
        </div>

        <div id="attention">
          <Panel
            title="Needs attention"
            action={
              <Chip
                kind={items.some((i) => i.kind === "red") ? "red" : items.length ? "amber" : "grey"}
              >
                {String(items.length)}
              </Chip>
            }
          >
            {items.length === 0 && (
              <p
                style={{
                  margin: 0,
                  padding: "12px 16px",
                  fontSize: 13,
                  color: "var(--pa-text-muted)",
                }}
              >
                Nothing needs attention.
              </p>
            )}
            {items.map((i) => (
              <div
                key={i.title}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  padding: "12px 16px",
                  borderTop: "1px solid var(--pa-ink-800)",
                }}
              >
                <Chip kind={i.kind}>{i.chip}</Chip>
                <span style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <span>{i.title}</span>
                  <span className="ad-sub">{i.meta}</span>
                </span>
                <Link className="ad-f ad-btn ad-button" href={i.href} style={{ height: 30 }}>
                  View
                </Link>
              </div>
            ))}
          </Panel>
        </div>

        <div className="ad-split">
          <div id="evaluations" className="ad-wide">
            <Panel
              title="Evaluations"
              sub={
                a.evaluations.some((e) => e.run_at !== null)
                  ? "The latest results in this deployment"
                  : "Not run yet"
              }
            >
              <Evaluations evaluations={a.evaluations} />
            </Panel>
          </div>
          <div id="flags" className="ad-narrow">
            <Panel
              title="Flagged replies"
              action={<Chip kind={a.flags_open ? "amber" : "grey"}>{String(a.flags_open)}</Chip>}
            >
              <AiFlags flags={a.flags} open={a.flags_open} />
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}
