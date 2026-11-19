// The small pieces of the dashboard pattern (D30), from design/mockups/Admin.dc.html.
import Link from "next/link";
import type { ReactNode } from "react";

export type ChipKind = "red" | "amber" | "violet" | "green" | "grey";

export function Chip({ kind, children }: { kind: ChipKind; children: ReactNode }) {
  return (
    <span className="ad-chip" data-kind={kind}>
      {children}
    </span>
  );
}

const C = 2 * Math.PI * 6;

/** A small progress ring. `share` is 0 to 1, or null when there is nothing to measure. */
export function Ring({ share, colour }: { share: number | null; colour: string }) {
  const dash = `${(C * Math.max(0, Math.min(1, share ?? 0))).toFixed(2)} ${C.toFixed(2)}`;
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6" fill="none" stroke="var(--pa-line)" strokeWidth="2.2" />
      {share !== null && share > 0 && (
        <circle
          cx="8"
          cy="8"
          r="6"
          fill="none"
          stroke={colour}
          strokeWidth="2.2"
          strokeDasharray={dash}
          transform="rotate(-90 8 8)"
        />
      )}
    </svg>
  );
}

/** What is not measured yet, said plainly (D29), and what would measure it. */
export function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="ad-empty">
      <b>{title}</b>
      <span>{children}</span>
    </div>
  );
}

export function Panel({
  label,
  title,
  sub,
  action,
  children,
  className = "",
}: {
  label?: string;
  title: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={label ?? (typeof title === "string" ? title : undefined)}
      className={`ad-panel ${className}`}
    >
      <div className="ad-panel-head">
        <span style={{ display: "flex", flexDirection: "column" }}>
          <span className="ad-panel-title">{title}</span>
          {sub !== undefined && <span className="ad-sub">{sub}</span>}
        </span>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Tile({
  title,
  when,
  children,
  href,
  link,
}: {
  title: string;
  when: string;
  children: ReactNode;
  href: string;
  link: string;
}) {
  return (
    <div className="ad-panel">
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
          <span style={{ fontWeight: 500 }}>{title}</span>
          <span style={{ color: "var(--pa-text-faint)", fontSize: 13 }}>{when}</span>
        </span>
        {children}
      </div>
      <Link className="ad-f ad-row ad-tile-link" href={href}>
        {link}
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}

/** A two-part bar with its legend: e.g. classes with AI on and off. */
export function SegBar({
  parts,
}: {
  parts: readonly { label: string; value: number; colour: string }[];
}) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  return (
    <>
      <span style={{ display: "flex", height: 6, gap: 3 }} aria-hidden="true">
        {total === 0 ? (
          <span style={{ flex: 1, background: "var(--pa-line-strong)" }} />
        ) : (
          parts.map((p) => <span key={p.label} style={{ flex: p.value, background: p.colour }} />)
        )}
      </span>
      <span
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4px 10px",
          fontSize: 12,
          color: "var(--pa-text-soft)",
        }}
      >
        {parts.map((p) => (
          <span key={p.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="ad-dot" style={{ background: p.colour }} />
            {p.label}
            <b className="ad-mono" style={{ marginLeft: "auto", fontWeight: 500 }}>
              {p.value.toLocaleString("en-GB")}
            </b>
          </span>
        ))}
      </span>
    </>
  );
}

/** A sparkline with a soft fill, over equal-width buckets. */
export function Spark({ values }: { values: readonly number[] }) {
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? 200 / (values.length - 1) : 200;
  const pts = values.map((v, i) => [i * step, 44 - (v / max) * 40] as const);
  const line = `M${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L")}`;
  return (
    <svg
      viewBox="0 0 200 44"
      preserveAspectRatio="none"
      style={{ width: "100%", height: 44, display: "block" }}
      aria-hidden="true"
    >
      <path d={`${line} L200 44 L0 44 Z`} fill="var(--pa-ok)" fillOpacity={0.16} />
      <path d={line} fill="none" stroke="var(--pa-ok)" strokeWidth="1.6" />
    </svg>
  );
}

/** Small hatched bars, one per day: quiet when zero. */
export function MiniBars({
  values,
  tone = "ok",
}: {
  values: readonly number[];
  tone?: "ok" | "danger";
}) {
  const max = Math.max(1, ...values);
  return (
    <div aria-hidden="true" style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 44 }}>
      {values.map((v, i) => (
        <span
          key={i}
          className={v ? `ad-hatch-${tone}` : undefined}
          style={{
            flex: 1,
            height: v ? 8 + (v / max) * 36 : 44,
            background: v ? undefined : "var(--pa-ink-800)",
            opacity: v ? 1 : 0.7,
            borderTop: v ? undefined : 0,
          }}
        />
      ))}
    </div>
  );
}

export function ApiProblem({ status, detail }: { status: number; detail: string }) {
  const title =
    status === 401 || status === 403
      ? "You are not signed in as staff"
      : status === 503
        ? "The admin API is not set up"
        : "The admin API did not answer";
  return (
    <div className="ad-body">
      <Empty title={title}>
        {detail} {status === 0 ? "Check ADMIN_API_URL and that the API is running." : null}
      </Empty>
    </div>
  );
}
