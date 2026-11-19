"use client";

// The AI switches (ai-quotas-brief.md, decision 4): all AI, and one per feature, each change
// audited, with undo (D30's toast).
import type { AiSwitchState } from "@pa/api-client";
import { useRouter } from "next/navigation";

import { setAiSwitch } from "@/app/actions";
import { modelName, switchName } from "@/lib/ai";

import { useToast } from "./toast";

export function AiSwitches({
  switches,
  budgetReached,
}: {
  switches: readonly AiSwitchState[];
  budgetReached: boolean;
}) {
  const toast = useToast();
  const router = useRouter();

  async function flip(s: AiSwitchState, enabled: boolean, undo = false) {
    const r = await setAiSwitch(s.name, enabled, undo ? "Undo" : undefined);
    if (!r.ok) {
      toast({ text: r.detail, failed: true });
      return;
    }
    router.refresh();
    const what = `${switchName(s.name)} switched ${enabled ? "on" : "off"} for everyone.`;
    toast({
      text: undo ? what : `${what} Recorded in the audit log.`,
      ...(undo ? {} : { undo: () => void flip(s, !enabled, true) }),
    });
  }

  const allOn = switches.find((s) => s.name === "all")?.enabled !== false;
  return (
    <>
      {switches.map((s) => {
        const note =
          s.name === "all"
            ? budgetReached
              ? "Off until midnight: budget reached"
              : s.enabled
                ? "On"
                : "Off for everyone"
            : `${s.model ? modelName(s.model) : ""}${s.teachers_only ? ", teachers only" : ""}`;
        // A feature's own switch can be on while all AI is off: its dot shows it is not running.
        const running = s.enabled && (s.name === "all" ? !budgetReached : allOn && !budgetReached);
        return (
          <div
            key={s.name}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "10px 16px",
              borderTop: "1px solid var(--pa-ink-800)",
            }}
          >
            <span style={{ display: "flex", flexDirection: "column" }}>
              <span>{switchName(s.name)}</span>
              <span className="ad-sub">{note}</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={s.enabled}
              aria-label={switchName(s.name)}
              className="ad-f ad-btn ad-button"
              onClick={() => void flip(s, !s.enabled)}
              style={{ height: 26, gap: 8 }}
            >
              <span
                aria-hidden="true"
                className="ad-dot"
                style={{
                  background: running ? "var(--pa-topic-light)" : "var(--pa-dash-quiet)",
                }}
              />
              {s.enabled ? "On" : "Off"}
            </button>
          </div>
        );
      })}
    </>
  );
}
