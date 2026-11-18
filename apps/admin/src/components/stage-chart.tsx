"use client";

// Where students stop (D30): hatched bars, the biggest drop in red, numbers on point or focus.
import type { StageCount } from "@pa/api-client";
import { useState } from "react";

import { stepName } from "@/lib/steps";

import { Panel } from "./bits";

export function StageChart({
  stages,
  title,
  rangeLong,
}: {
  stages: readonly StageCount[];
  title: string;
  rangeLong: string;
}) {
  const [byStudents, setByStudents] = useState(false);
  const [bar, setBar] = useState<number | null>(null);
  const vals = stages.map((s) => [stepName(s.step), byStudents ? s.students : s.attempts] as const);
  const max = Math.max(0, ...vals.map((v) => v[1]));
  let worst = -1;
  let worstDrop = 0;
  vals.forEach((v, i) => {
    if (i > 0) {
      const d = vals[i - 1]![1] - v[1];
      if (d > worstDrop) {
        worstDrop = d;
        worst = i;
      }
    }
  });
  const fmt = (x: number) => x.toLocaleString("en-GB");
  const ticks = [max, Math.round((max * 2) / 3), Math.round(max / 3), 0].map(fmt);
  const noun = byStudents ? "Students" : "Attempts";

  return (
    <Panel
      label="Where students stop"
      className="ad-wide"
      title={`Where students stop: ${title}`}
      sub={`${noun} that reached each stage, of those started in the ${rangeLong.toLowerCase()}. Point at a bar for the numbers.`}
      action={
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 12,
            color: "var(--pa-text-soft)",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="ad-dot" style={{ width: 8, height: 8, background: "var(--pa-ok)" }} />
            Reached
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              className="ad-dot"
              style={{ width: 8, height: 8, background: "var(--pa-danger)" }}
            />
            Biggest drop
          </span>
          <span role="group" aria-label="Count" className="ad-seg">
            <button
              className="ad-f"
              type="button"
              aria-pressed={!byStudents}
              onClick={() => setByStudents(false)}
            >
              Attempts
            </button>
            <button
              className="ad-f"
              type="button"
              aria-pressed={byStudents}
              onClick={() => setByStudents(true)}
            >
              Students
            </button>
          </span>
        </span>
      }
    >
      <div
        style={{
          position: "relative",
          padding: "16px 16px 10px 54px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div
          aria-hidden="true"
          className="ad-mono"
          style={{
            position: "absolute",
            left: 12,
            top: 16,
            bottom: 34,
            width: 36,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            fontSize: 11,
            color: "var(--pa-dash-axis)",
            textAlign: "right",
          }}
        >
          {ticks.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
        <div
          style={{
            height: 250,
            display: "flex",
            alignItems: "stretch",
            gap: 8,
            position: "relative",
          }}
        >
          {vals.map(([name, n], i) => {
            const pct = max ? (n / max) * 100 : 0;
            const prev = i ? vals[i - 1]! : null;
            const drop = prev ? prev[1] - n : 0;
            const dropText = prev
              ? `−${fmt(drop)} from ${prev[0]} (${prev[1] ? ((drop / prev[1]) * 100).toFixed(0) : "0"}%)`
              : "Everyone starts here";
            return (
              <button
                key={name}
                type="button"
                className="ad-f ad-track"
                aria-label={`${name}: ${fmt(n)} reached. ${dropText}.`}
                onMouseEnter={() => setBar(i)}
                onMouseLeave={() => setBar(null)}
                onFocus={() => setBar(i)}
                onBlur={() => setBar(null)}
                style={{
                  position: "relative",
                  flex: 1,
                  minWidth: 0,
                  border: 0,
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  cursor: "pointer",
                }}
              >
                <span
                  className={i === worst ? "ad-hatch-danger" : "ad-hatch-ok"}
                  style={{
                    display: "block",
                    height: `${pct.toFixed(1)}%`,
                    transition: "height 350ms ease",
                    opacity: bar === null || bar === i ? 1 : 0.55,
                    borderTopWidth: n ? 2 : 0,
                  }}
                />
                {bar === i && (
                  <span
                    role="tooltip"
                    className="ad-tip"
                    style={{ bottom: `calc(${pct.toFixed(1)}% + 8px)` }}
                  >
                    <b style={{ fontWeight: 600 }}>{name}</b>
                    <span className="ad-mono">{fmt(n)} reached</span>
                    <span className="ad-mono" style={{ color: "var(--pa-on-paper-muted)" }}>
                      {dropText}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
          {max === 0 && (
            <span
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--pa-text-muted)",
                fontSize: 13,
                pointerEvents: "none",
              }}
            >
              No attempts of this experiment were started in this range.
            </span>
          )}
        </div>
        <div
          aria-hidden="true"
          style={{ display: "flex", gap: 8, fontSize: 11, color: "var(--pa-text-faint)" }}
        >
          {vals.map(([name]) => (
            <span
              key={name}
              style={{
                flex: 1,
                minWidth: 0,
                textAlign: "center",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </Panel>
  );
}
