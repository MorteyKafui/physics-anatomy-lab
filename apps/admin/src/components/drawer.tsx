"use client";

// The detail drawer (D30): details, what to do, the rule behind it, and one main action.
import { Dialog } from "@base-ui/react/dialog";
import { X } from "@pa/ui/icons";
import type { ReactNode } from "react";

import { Chip, type ChipKind } from "./bits";

export function Drawer({
  open,
  onClose,
  title,
  chip,
  children,
  action,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  chip?: { kind: ChipKind; text: string };
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="ad-scrim" />
        <Dialog.Popup className="ad-drawer">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 16px",
              borderBottom: "1px solid var(--pa-ink-800)",
            }}
          >
            <Dialog.Title style={{ fontWeight: 600, fontSize: 15, flex: 1, margin: 0 }}>
              {title}
            </Dialog.Title>
            {chip && <Chip kind={chip.kind}>{chip.text}</Chip>}
            <Dialog.Close
              className="ad-f ad-icon"
              aria-label="Close"
              style={{
                width: 30,
                height: 30,
                background: "transparent",
                border: 0,
                color: "var(--pa-text-soft)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={16} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <div
            style={{
              flex: 1,
              overflow: "auto",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            {children}
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
              padding: "12px 16px",
              borderTop: "1px solid var(--pa-ink-800)",
            }}
          >
            <Dialog.Close className="ad-f ad-btn ad-button" style={{ height: 34, padding: "0 14px" }}>
              Close
            </Dialog.Close>
            {action}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function DrawerRows({ rows }: { rows: readonly (readonly [string, ReactNode])[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontSize: 12, color: "var(--pa-text-faint)" }}>Details</span>
      {rows.map(([k, v]) => (
        <span
          key={k}
          style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 13 }}
        >
          <span style={{ color: "var(--pa-text-muted)" }}>{k}</span>
          <span style={{ textAlign: "right" }}>{v}</span>
        </span>
      ))}
    </div>
  );
}

export function DrawerSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontSize: 12, color: "var(--pa-text-faint)" }}>{label}</span>
      <div style={{ fontSize: 14, color: "var(--pa-text-soft)" }}>{children}</div>
    </div>
  );
}

export function DrawerRule({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid var(--pa-line)",
        background: "var(--pa-ink-950)",
        padding: 12,
        fontSize: 13,
        color: "var(--pa-text-soft)",
      }}
    >
      {children}
    </div>
  );
}
