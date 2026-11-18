// The bar along the top of every page: where you are, the time range, the environment, Export.
import Link from "next/link";
import type { ReactNode } from "react";

import { RANGES, type RangeId } from "@/lib/range";

export function TopBar({
  page,
  range,
  rangeHref,
  environment,
  children,
}: {
  page: string;
  /** The chosen range, when the page has one. */
  range?: RangeId;
  /** The page's own link for a range, keeping its other choices. */
  rangeHref?: (range: RangeId) => string;
  environment: string | null;
  children?: ReactNode;
}) {
  return (
    <div className="ad-top">
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 14,
          color: "var(--pa-text-muted)",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 10,
            height: 10,
            borderRadius: "var(--pa-round)",
            background: "var(--pa-accent)",
          }}
        />
        Physics Anatomy <span aria-hidden="true">›</span>{" "}
        <span style={{ color: "var(--pa-text)" }}>{page}</span>
      </span>
      <span style={{ flex: 1 }} />
      {range && rangeHref && (
        <div role="group" aria-label="Time range" className="ad-seg">
          {RANGES.map((r) => (
            <Link
              key={r.id}
              className="ad-f"
              href={rangeHref(r.id)}
              aria-current={r.id === range ? "true" : undefined}
              scroll={false}
            >
              {r.label}
            </Link>
          ))}
        </div>
      )}
      {environment && (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: "var(--pa-text-muted)",
          }}
        >
          Environment
          <span
            className="ad-select"
            style={{ display: "inline-flex", alignItems: "center", textTransform: "capitalize" }}
          >
            {environment}
          </span>
        </span>
      )}
      {children}
    </div>
  );
}
