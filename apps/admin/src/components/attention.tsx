"use client";

// Needs attention (D30): what staff should act on, most urgent first, each opening the drawer.
// Today the only source is the display-name check; support, sync and content items join it as
// those parts are built.
import type { FlaggedName } from "@pa/api-client";
import { Eye } from "@pa/ui/icons";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { replaceDisplayName } from "@/app/actions";
import { when } from "@/lib/format";

import { Chip } from "./bits";
import { Drawer, DrawerRows, DrawerRule, DrawerSection } from "./drawer";
import { useToast } from "./toast";

export function Attention({ flagged }: { flagged: readonly FlaggedName[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const item = flagged.find((f) => f.member_id === openId);

  const open = (f: FlaggedName, i: number) => {
    setOpenId(f.member_id);
    setName(`Student ${String(i + 1)}`);
    setError(null);
  };

  return (
    <section aria-label="Needs attention" className="ad-panel ad-narrow">
      <div className="ad-panel-head">
        <span style={{ display: "flex", flexDirection: "column" }}>
          <span className="ad-panel-title">Needs attention</span>
          <span className="ad-sub">
            {flagged.length ? `${String(flagged.length)} open, most recent first` : "All clear"}
          </span>
        </span>
      </div>
      {flagged.length === 0 && (
        <p style={{ margin: 0, padding: "12px 16px", fontSize: 13, color: "var(--pa-text-muted)" }}>
          Nothing needs you now. Display names that may be contact details appear here.
        </p>
      )}
      {flagged.map((f, i) => (
        <button
          key={f.member_id}
          className="ad-f ad-row"
          type="button"
          onClick={() => open(f, i)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            background: "transparent",
            border: 0,
            borderTop: "1px solid var(--pa-ink-800)",
            cursor: "pointer",
            font: "inherit",
            color: "inherit",
          }}
        >
          <span style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0, textAlign: "left" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, color: "var(--pa-text)" }}>
                Display name that may be contact details
              </span>
              <Chip kind="red">Safeguarding</Chip>
            </span>
            <span style={{ fontSize: 12, color: "var(--pa-text-faint)" }}>
              Class {f.class_code} · flagged by the name check · joined {when(f.created_at)}
            </span>
          </span>
          <span
            aria-hidden="true"
            style={{
              width: 30,
              height: 30,
              border: "1px solid var(--pa-line)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--pa-text-soft)",
              flex: "0 0 auto",
            }}
          >
            <Eye size={14} />
          </span>
        </button>
      ))}

      <Drawer
        open={!!item}
        onClose={() => setOpenId(null)}
        title="Display name that may be contact details"
        chip={{ kind: "red", text: "Safeguarding" }}
        action={
          <button
            className="ad-f ad-primary"
            type="button"
            disabled={busy || !item}
            style={{ height: 34, padding: "0 14px" }}
            onClick={async () => {
              if (!item) return;
              setBusy(true);
              const r = await replaceDisplayName(
                item.member_id,
                name,
                "Flagged by the display-name check",
              );
              setBusy(false);
              if (!r.ok) {
                setError(r.detail);
                return;
              }
              setOpenId(null);
              toast({
                text: `Name replaced with "${r.data.display_name}". Tell the teacher of ${item.class_code}.`,
              });
              router.refresh();
            }}
          >
            {busy ? "Replacing…" : "Replace the name"}
          </button>
        }
      >
        {item && (
          <>
            <DrawerRows
              rows={[
                ["Display name", <span key="n" className="ad-mono">{item.display_name}</span>],
                ["Class", item.class_name],
                ["Class code", <span key="c" className="ad-mono">{item.class_code}</span>],
                ["Flagged by", "Display-name check"],
                ["Joined", when(item.created_at)],
              ]}
            />
            <DrawerSection label="What to do">
              Replace the name with a safe one, then tell the teacher. The student keeps all their
              work; only the name changes.
            </DrawerSection>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
              <span style={{ color: "var(--pa-text-muted)" }}>New display name</span>
              <input
                className="ad-f ad-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={24}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "rename-error" : undefined}
              />
              {error && (
                <span id="rename-error" style={{ color: "var(--pa-danger-text)" }}>
                  {error}
                </span>
              )}
            </label>
            <DrawerRule>
              Children&rsquo;s data (ADR 0011): students give a display name and class code only.
              A name that looks like a phone number, an email or a social handle is replaced. The
              audit log records that it was replaced and why, never the name.
            </DrawerRule>
          </>
        )}
      </Drawer>
    </section>
  );
}
