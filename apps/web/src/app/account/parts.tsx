"use client";

// The pieces of the consent and Your data screens (design/mockups/Privacy.dc.html, ADR 0042):
// a light page at phone width, cards, the three button styles, and the typed confirmation.
// Colours are the site theme's roles from packages/ui, never hard-coded.
import {
  collectExport,
  exportFileName,
  type ExportAttemptsPage,
  type Result,
  type StudentExport,
  type TeacherExport,
} from "@pa/api-client";
import { emphasis, t, type MessageKey, type Params } from "@pa/i18n";
import "@pa/i18n/privacy";
import { Button } from "@pa/ui/components/button";
import { Input } from "@pa/ui/components/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

export const k = (key: string) => key as MessageKey;

/** A message with its **strong** runs in bold. */
export function Rich({ id, params }: { id: string; params?: Params }) {
  return (
    <>
      {emphasis(t(k(id), params)).map((part, i) =>
        part.strong ? (
          <b key={i} className="font-semibold text-[var(--pa-fg)]">
            {part.text}
          </b>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

export function Page({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-theme="site"
      className="min-h-dvh bg-[var(--pa-bg)] text-[15px] leading-normal text-[var(--pa-fg)]"
    >
      <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-5 pt-6 pb-5">
        {children}
      </main>
    </div>
  );
}

export function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="font-[family-name:var(--font-bricolage)] text-[26px] leading-[1.1] font-bold">
      {children}
    </h1>
  );
}

export function Lead({ children }: { children: React.ReactNode }) {
  return <p className="text-[var(--pa-fg-soft)]">{children}</p>;
}

export function Small({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] text-[var(--pa-fg-muted)]">{children}</p>;
}

export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5 border border-[var(--pa-border)] bg-[var(--pa-surface)] p-3.5">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export const LINK =
  "text-sm text-[var(--pa-accent-text)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pa-ring)]";
export const DANGER_LINK =
  "text-sm text-[var(--pa-danger-fg)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pa-ring)]";

const BIG = "h-[50px] w-full text-[15px] font-semibold";
const STYLE = {
  primary: `${BIG} bg-[var(--pa-fg)] text-[var(--pa-bg)] hover:brightness-125`,
  secondary: `${BIG} border-[var(--pa-fg)] bg-[var(--pa-surface)] text-[var(--pa-fg)] hover:bg-[var(--pa-raised)]`,
  danger: `${BIG} bg-[var(--pa-danger-fg)] text-[var(--pa-surface)] hover:brightness-110`,
} as const;

export function Action(props: {
  kind: keyof typeof STYLE;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="outline"
      className={`${STYLE[props.kind]} ${props.className ?? ""}`}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.children}
    </Button>
  );
}

/** Space that pushes the actions to the foot of the screen, as on the board. */
export function Spacer() {
  return <span className="min-h-4 flex-1" />;
}

export function Actions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2 pt-4">{children}</div>;
}

export function Problem({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-sm text-[var(--pa-danger-fg)]">
      {children}
    </p>
  );
}

/** "Type your … to confirm". */
export function ConfirmField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "email" | "text";
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5 pt-4">
      <label htmlFor={id} className="text-sm font-semibold">
        {props.label}
      </label>
      <Input
        id={id}
        type={props.type ?? "text"}
        autoComplete="off"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="h-[46px] border-[var(--pa-fg)] bg-[var(--pa-surface)] text-[15px]"
      />
      {props.hint ? <Small>{props.hint}</Small> : null}
    </div>
  );
}

/** Fetch every page of an export and hand the browser one JSON file. */
export function useDownload(
  summary: () => Promise<Result<TeacherExport | StudentExport>>,
  page: (after: string | null) => Promise<Result<ExportAttemptsPage>>,
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function download() {
    setBusy(true);
    setError(null);
    const got = await collectExport(summary, page);
    setBusy(false);
    if (!got.ok) {
      setError(got.detail);
      return;
    }
    const who = got.data.kind === "student" ? got.data.display_name : "data";
    const blob = new Blob([JSON.stringify(got.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFileName(got.data.exported_at, who);
    a.click();
    URL.revokeObjectURL(url);
  }
  return { busy, error, download: () => void download() };
}

/**
 * A permanent delete: what goes, a typed confirmation, then the red button and a way back.
 * The API checks the typed text again (ADR 0042); this only asks.
 */
export function ConfirmScreen(props: {
  children: React.ReactNode;
  confirmLabel: string;
  confirmType?: "email" | "text";
  hint?: string;
  go: string;
  keep: string;
  keepHref: string;
  done: string;
  /** Where to go once it is done, and what the link says. */
  after: { href: string; label: string };
  onConfirm: (typed: string) => Promise<Result<undefined>>;
}) {
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  if (done) {
    return (
      <Page>
        <Heading>{props.done}</Heading>
        <Link className={`${LINK} pt-4`} href={props.after.href}>
          {props.after.label}
        </Link>
      </Page>
    );
  }
  async function confirm() {
    setBusy(true);
    setError(null);
    const r = await props.onConfirm(typed.trim());
    setBusy(false);
    if (r.ok) setDone(true);
    else setError(r.detail);
  }
  return (
    <Page>
      <div className="flex flex-col gap-2">{props.children}</div>
      <ConfirmField
        type={props.confirmType}
        label={props.confirmLabel}
        value={typed}
        onChange={setTyped}
        hint={props.hint}
      />
      {error ? <Problem>{error}</Problem> : null}
      <Spacer />
      <Actions>
        <Action kind="danger" disabled={busy || typed.trim() === ""} onClick={() => void confirm()}>
          {props.go}
        </Action>
        <Action kind="secondary" onClick={() => router.push(props.keepHref)}>
          {props.keep}
        </Action>
      </Actions>
    </Page>
  );
}

/** "Download … first": a link-styled button that fetches the export. */
export function DownloadFirst(props: { label: string; busy: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`${LINK} self-start disabled:opacity-50`}
      disabled={props.busy}
      onClick={props.onClick}
    >
      {props.label}
    </button>
  );
}

export function count(kind: "classes" | "students", n: number) {
  return t(k(`privacy.count.${kind}.${n === 1 ? "one" : "other"}`), { count: n });
}
