"use client";

// The teacher's live class board, rebuilt from design/mockups/Teacher.dc.html: headline tiles,
// benches with a filter, mistakes happening now with one hint push each, where the class is, a
// drawer per bench and an undo toast (the D30 dashboard pattern). The same component shows a
// real live class and the example class; only the actions differ.
import type { LiveSnapshot } from "@pa/api-client";
import { STEPS } from "@pa/engine";
import { t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/teach";
import { Logo, cn } from "@pa/ui";
import { Button } from "@pa/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@pa/ui/components/dialog";
import { Textarea } from "@pa/ui/components/textarea";
import { Check, FlaskConical, House, Lock, LockOpen, Users, X } from "@pa/ui/icons";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ReadingRow } from "./example";
import {
  board,
  clock,
  mistakeDetail,
  mistakeName,
  shown,
  type BenchCard,
  type Filter,
  type MistakeRow,
  type Tone,
} from "./model";

const k = (key: string) => key as MessageKey;

/** What the board can do. Each returns an undo, or an error to show. */
export interface BoardActions {
  pushHint(rule: string, key: string): Promise<Outcome>;
  setLock(locked: boolean): Promise<Outcome>;
  broadcast(text: string): Promise<Outcome>;
  note(memberId: string, text: string): Promise<Outcome>;
  /** A bench's readings: rows to show, a count when they cannot be shown as a table, or null. */
  readings(card: BenchCard): Promise<ReadingRow[] | number | null>;
}
export type Outcome =
  | { readonly ok: true; readonly undo?: () => Promise<unknown>; readonly count?: number }
  | { readonly ok: false; readonly detail: string };

export interface BoardProps {
  readonly className: string;
  readonly code: string;
  readonly experimentName: string;
  readonly example: boolean;
  readonly snapshot: LiveSnapshot;
  readonly now: number;
  readonly actions: BoardActions;
  readonly banner?: string | null;
  readonly endSlot?: React.ReactNode;
}

const CHIP: Record<Tone, string> = {
  red: "bg-[var(--pa-dash-chip-red-bg)] text-[var(--pa-dash-chip-red-fg)] border-[var(--pa-dash-chip-red-line)]",
  amber:
    "bg-[var(--pa-dash-chip-amber-bg)] text-[var(--pa-dash-chip-amber-fg)] border-[var(--pa-dash-chip-amber-line)]",
  green:
    "bg-[var(--pa-dash-chip-green-bg)] text-[var(--pa-dash-chip-green-fg)] border-[var(--pa-dash-chip-green-line)]",
  violet:
    "bg-[var(--pa-dash-chip-violet-bg)] text-[var(--pa-dash-chip-violet-fg)] border-[var(--pa-dash-chip-violet-line)]",
  grey: "bg-[var(--pa-dash-chip-grey-bg)] text-[var(--pa-dash-chip-grey-fg)] border-[var(--pa-dash-chip-grey-line)]",
};

function Chip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={cn("self-start border px-[7px] py-px text-xs whitespace-nowrap", CHIP[tone])}>
      {children}
    </span>
  );
}

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pa-accent)]";
const PANEL = "border border-[var(--pa-ink-800)] bg-[var(--pa-ink-950)]";

interface Toast {
  readonly text: string;
  readonly undo?: () => Promise<unknown>;
}

export function LiveBoard(props: BoardProps) {
  const { snapshot, now, actions } = props;
  const model = useMemo(() => board(snapshot, now), [snapshot, now]);
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [dialog, setDialog] = useState<
    { kind: "broadcast" } | { kind: "note"; card: BenchCard } | null
  >(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const say = useCallback((next: Toast) => {
    if (timer.current) clearTimeout(timer.current);
    setToast(next);
    timer.current = setTimeout(() => setToast(null), 6000);
  }, []);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const report = useCallback(
    (outcome: Outcome, text: string) => {
      if (outcome.ok) say({ text, ...(outcome.undo ? { undo: outcome.undo } : {}) });
      else say({ text: outcome.detail });
    },
    [say],
  );

  const locked = snapshot.session?.steps_locked ?? false;
  const toggleLock = async () => {
    const next = !locked;
    report(await actions.setLock(next), t(k(next ? "teach.toast.locked" : "teach.toast.unlocked")));
  };
  const pushHint = async (row: MistakeRow, everyone = false) => {
    const outcome = await actions.pushHint(row.rule, row.key);
    const count = outcome.ok ? (outcome.count ?? row.students) : row.students;
    const text = everyone
      ? t(k("teach.toast.hintEveryone"), { mistake: row.name })
      : count === 1
        ? t(k("teach.toast.hintOne"), { mistake: row.name })
        : t(k("teach.toast.hint"), {
            count: t(k("teach.mistakes.students"), { count }),
            mistake: row.name,
          });
    report(outcome, text);
  };

  const card = model.benches.find((c) => c.memberId === open) ?? null;
  const benches = shown(model.benches, filter);

  return (
    <div className="relative flex min-h-[960px] w-full flex-wrap items-stretch gap-[14px] bg-[var(--pa-ink-1000)] p-[14px] text-sm leading-[1.45] text-[var(--pa-text)]">
      <Rail />

      <main className="flex min-w-0 flex-[999_1_720px] flex-col border border-[var(--pa-ink-800)] bg-[var(--pa-ink-900)]">
        <div className="flex flex-wrap items-center gap-x-[14px] gap-y-[10px] border-b border-[var(--pa-ink-800)] px-4 py-3">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-sm text-[var(--pa-text-muted)]"
          >
            <Link prefetch href="/teach" className={cn("hover:text-[var(--pa-text)]", FOCUS)}>
              {t(k("teach.crumb.classes"))}
            </Link>
            <span aria-hidden>›</span>
            <span className="text-[var(--pa-text)]">{props.className}</span>
            <span aria-hidden>›</span>
            <span className="text-[var(--pa-text)]">{props.experimentName}</span>
          </nav>
          <span className="inline-flex items-center gap-1.5 border border-[var(--pa-dash-chip-green-line)] bg-[var(--pa-dash-chip-green-bg)] px-2 py-0.5 text-xs text-[var(--pa-ok-text)]">
            <span className="size-[7px] animate-pulse rounded-full bg-[var(--pa-ok)]" aria-hidden />
            {t(k("teach.live.badge"), { minutes: model.minutesLive })}
          </span>
          <span className="border border-[var(--pa-dash-chip-grey-line)] px-2 py-0.5 text-xs text-[var(--pa-text-soft)]">
            {t(k("teach.live.code"))}{" "}
            <b className="font-mono font-medium text-[var(--pa-text)]">{props.code}</b>
          </span>
          {props.example && (
            <span className="border border-[var(--pa-dash-chip-amber-line)] bg-[var(--pa-dash-chip-amber-bg)] px-2 py-0.5 text-xs text-[var(--pa-warn-text)]">
              {t(k("teach.example"))}
            </span>
          )}
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => void toggleLock()}
            aria-pressed={locked}
            className={cn(
              "flex h-8 cursor-pointer items-center gap-1.5 border px-3 text-[13px] font-medium",
              locked
                ? "border-[var(--pa-warn)] bg-[var(--pa-warn-wash)] text-[var(--pa-warn-text)]"
                : "border-[var(--pa-line)] bg-transparent text-[var(--pa-text)]",
              FOCUS,
            )}
          >
            {locked ? (
              <Lock className="size-3.5" aria-hidden />
            ) : (
              <LockOpen className="size-3.5" aria-hidden />
            )}
            {t(k(locked ? "teach.locked" : "teach.lock"))}
          </button>
          <button
            type="button"
            onClick={() => setDialog({ kind: "broadcast" })}
            className={cn(
              "h-8 cursor-pointer bg-[var(--pa-accent)] px-3 text-[13px] font-semibold text-[var(--pa-ink-950)]",
              FOCUS,
            )}
          >
            {t(k("teach.broadcast"))}
          </button>
          {props.endSlot}
        </div>

        {props.banner && (
          <p
            role="status"
            className="border-b border-[var(--pa-ink-800)] bg-[var(--pa-warn-wash)] px-4 py-2 text-[13px] text-[var(--pa-warn-text)]"
          >
            {props.banner}
          </p>
        )}

        <div className="flex flex-col gap-[14px] p-[14px]">
          <Tiles model={model} />

          <div className="flex flex-wrap items-start gap-[14px]">
            <section
              aria-label={t(k("teach.benches"))}
              className={cn("flex min-w-0 flex-[999_1_560px] flex-col", PANEL)}
            >
              <div className="flex flex-wrap items-center justify-between gap-[10px] border-b border-[var(--pa-ink-800)] px-4 py-[14px]">
                <span className="flex flex-col">
                  <span className="text-[15px] font-medium">{t(k("teach.benches"))}</span>
                  <span className="text-[13px] text-[var(--pa-text-faint)]">
                    {t(k("teach.benches.hint"))}
                  </span>
                </span>
                <div
                  role="group"
                  aria-label={t(k("teach.benches.show"))}
                  className="inline-flex border border-[var(--pa-line)]"
                >
                  {(["all", "help", "on-track"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      aria-pressed={filter === f}
                      onClick={() => setFilter(f)}
                      className={cn(
                        "h-7 cursor-pointer px-[10px] text-xs font-medium",
                        filter === f
                          ? "bg-[var(--pa-text)] text-[var(--pa-ink-950)]"
                          : "bg-transparent text-[var(--pa-text-soft)]",
                        FOCUS,
                      )}
                    >
                      {t(
                        k(
                          f === "all"
                            ? "teach.benches.all"
                            : f === "help"
                              ? "teach.benches.help"
                              : "teach.benches.onTrack",
                        ),
                      )}
                    </button>
                  ))}
                </div>
              </div>
              {benches.length === 0 ? (
                <p className="p-4 text-[13px] text-[var(--pa-text-faint)]">
                  {t(k("teach.benches.none"))}
                </p>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(176px,1fr))] gap-2 p-3">
                  {benches.map((c) => (
                    <button
                      key={c.memberId}
                      type="button"
                      onClick={() => setOpen(c.memberId)}
                      className={cn(
                        "flex cursor-pointer flex-col items-start gap-2 border bg-[var(--pa-ink-900)] p-3 text-left text-sm text-[var(--pa-text)] hover:border-[var(--pa-dash-quiet)]",
                        c.help
                          ? "border-[var(--pa-dash-chip-amber-line)]"
                          : "border-[var(--pa-ink-800)]",
                        FOCUS,
                      )}
                    >
                      <span className="flex w-full justify-between gap-2">
                        <span className="font-semibold">{c.name}</span>
                        <span className="text-xs text-[var(--pa-text-faint)]">{c.stage}</span>
                      </span>
                      <StepBar card={c} />
                      <Chip tone={c.tone}>{c.status}</Chip>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-[14px]">
              <section aria-label={t(k("teach.mistakes"))} className={cn("flex flex-col", PANEL)}>
                <div className="flex flex-col border-b border-[var(--pa-ink-800)] px-4 py-[14px]">
                  <span className="text-[15px] font-medium">{t(k("teach.mistakes"))}</span>
                  <span className="text-[13px] text-[var(--pa-text-faint)]">
                    {t(k("teach.mistakes.hint"))}
                  </span>
                </div>
                {model.mistakes.length === 0 && (
                  <p className="px-4 py-3 text-[13px] text-[var(--pa-text-faint)]">
                    {t(k("teach.mistakes.none"))}
                  </p>
                )}
                {model.mistakes.map((m) => (
                  <div
                    key={m.rule}
                    className="flex items-center gap-3 border-t border-[var(--pa-ink-800)] px-4 py-3 first:border-t-0 hover:bg-[var(--pa-dash-hover)]"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                      <span>{m.name}</span>
                      <Chip tone={m.tone}>{m.chip}</Chip>
                    </span>
                    <button
                      type="button"
                      disabled={m.sent !== null}
                      onClick={() => void pushHint(m)}
                      className={cn(
                        "h-[30px] border px-[10px] text-[13px] font-medium",
                        m.sent
                          ? "border-[var(--pa-line)] bg-transparent text-[var(--pa-text-faint)]"
                          : "cursor-pointer border-[var(--pa-text)] bg-[var(--pa-text)] text-[var(--pa-ink-950)]",
                        FOCUS,
                      )}
                    >
                      {t(k(m.sent ? "teach.mistakes.sent" : "teach.mistakes.push"))}
                    </button>
                  </div>
                ))}
              </section>

              <section aria-label={t(k("teach.where"))} className={cn("flex flex-col", PANEL)}>
                <div className="border-b border-[var(--pa-ink-800)] px-4 py-[14px]">
                  <span className="text-[15px] font-medium">{t(k("teach.where"))}</span>
                </div>
                <div className="flex flex-col gap-2 px-4 py-3">
                  {model.stages.map((st) => (
                    <div
                      key={st.step}
                      className="grid grid-cols-[76px_minmax(0,1fr)_26px] items-center gap-[10px] text-[13px]"
                    >
                      <span className="text-[var(--pa-text-soft)]">{st.name}</span>
                      <span className="block h-3 bg-[var(--pa-ink-850)]">
                        <span
                          className="block h-3 bg-[repeating-linear-gradient(135deg,var(--pa-ok)_0_3px,var(--pa-dash-hatch-ok)_3px_6px)]"
                          style={{ width: `${String(Math.round(st.share * 100))}%` }}
                        />
                      </span>
                      <span className="text-right font-mono">{st.count}</span>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </main>

      {card && (
        <Drawer
          card={card}
          actions={actions}
          onClose={() => setOpen(null)}
          onHint={() => {
            const row = model.mistakes.find((m) => m.rule === card.needs?.rule);
            setOpen(null);
            if (row) void pushHint(row, true);
          }}
          onNote={() => {
            setOpen(null);
            setDialog({ kind: "note", card });
          }}
        />
      )}

      <MessageDialog
        open={dialog !== null}
        title={
          dialog?.kind === "note"
            ? t(k("teach.dialog.note.title"), { name: dialog.card.name })
            : t(k("teach.dialog.broadcast.title"))
        }
        body={
          dialog?.kind === "note"
            ? t(k("teach.dialog.note.body"), { name: dialog.card.name })
            : t(k("teach.dialog.broadcast.body"))
        }
        onCancel={() => setDialog(null)}
        onSend={async (text) => {
          const d = dialog;
          setDialog(null);
          if (d?.kind === "note") {
            report(
              await actions.note(d.card.memberId, text),
              t(k("teach.toast.note"), { name: d.card.name }),
            );
          } else {
            report(
              await actions.broadcast(text),
              t(k("teach.toast.broadcast"), { count: model.here }),
            );
          }
        }}
      />

      {toast && (
        <div
          role="status"
          className="fixed right-7 bottom-7 z-40 flex max-w-[380px] items-start gap-3 bg-[var(--pa-text)] px-[14px] py-3 text-[var(--pa-ink-950)] animate-[pa-toast-in_.25s_ease]"
        >
          <span className="flex size-[18px] flex-none items-center justify-center rounded-full bg-[var(--pa-ok)]">
            <Check className="size-[11px]" strokeWidth={3.5} aria-hidden />
          </span>
          <span className="flex-1 text-[13px]">{toast.text}</span>
          {toast.undo && (
            <button
              type="button"
              onClick={() => {
                const undo = toast.undo;
                setToast(null);
                void undo?.();
              }}
              className={cn(
                "h-[26px] cursor-pointer bg-[var(--pa-ink-950)] px-[10px] text-xs font-semibold text-[var(--pa-text)]",
                FOCUS,
              )}
            >
              {t(k("teach.toast.undo"))}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Rail() {
  const item =
    "flex size-[42px] items-center justify-center text-[var(--pa-text-muted)] hover:bg-[var(--pa-dash-hover)] hover:text-[var(--pa-text)]";
  return (
    <nav
      aria-label={t(k("teach.nav.app"))}
      className="flex flex-[0_0_60px] flex-col items-center gap-1.5 border border-[var(--pa-ink-800)] bg-[var(--pa-ink-900)] py-3"
    >
      <span className="mb-[10px] flex size-[34px] items-center justify-center bg-[var(--pa-text)] text-[var(--pa-ink-950)]">
        <Logo size={22} />
      </span>
      <Link href="/" aria-label={t(k("teach.nav.home"))} className={cn(item, FOCUS)}>
        <House className="size-[19px]" aria-hidden />
      </Link>
      <Link
        prefetch
        href="/teach"
        aria-label={t(k("teach.nav.classes"))}
        aria-current="page"
        className={cn(
          item,
          "border-l-2 border-[var(--pa-accent)] bg-[var(--pa-ink-800)] text-[var(--pa-text)]",
          FOCUS,
        )}
      >
        <Users className="size-[19px]" aria-hidden />
      </Link>
      <Link
        prefetch
        href="/#experiments"
        aria-label={t(k("teach.nav.experiments"))}
        className={cn(item, FOCUS)}
      >
        <FlaskConical className="size-[19px]" aria-hidden />
      </Link>
    </nav>
  );
}

function Tiles({ model }: { model: ReturnType<typeof board> }) {
  const tile = cn("flex flex-col gap-[10px] px-4 py-[14px]", PANEL);
  const head = (name: string, right: string) => (
    <span className="flex justify-between">
      <span className="font-medium">{name}</span>
      <span className="text-[13px] text-[var(--pa-text-faint)]">{right}</span>
    </span>
  );
  const helpTones = [
    "bg-[var(--pa-warn)]",
    "bg-[var(--pa-warn-text)]",
    "bg-[var(--pa-text-faint)]",
  ];
  const tallest = Math.max(3, ...model.measuredBars);
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-[14px]">
      <div className={tile}>
        {head(t(k("teach.tile.here")), t(k("teach.tile.now")))}
        <span className="flex items-baseline gap-1">
          <span className="font-mono text-[28px]">{model.here}</span>
          <span className="font-mono text-[15px] text-[var(--pa-text-faint)]">/{model.joined}</span>
        </span>
        <span className="flex h-1.5 gap-[3px]" aria-hidden>
          <span className="bg-[var(--pa-ok)]" style={{ flex: model.here || 0.0001 }} />
          <span className="bg-[var(--pa-line-strong)]" style={{ flex: model.offline || 0.0001 }} />
        </span>
        <span className="text-xs text-[var(--pa-text-muted)]">
          {model.offline > 0
            ? t(k("teach.tile.here.offline"), { count: model.offline })
            : t(k("teach.tile.here.allHere"))}
        </span>
      </div>
      <div className={tile}>
        {head(t(k("teach.tile.help")), t(k("teach.tile.now")))}
        <span className="font-mono text-[28px] text-[var(--pa-warn-text)]">{model.helpCount}</span>
        <span className="flex h-1.5 gap-[3px]" aria-hidden>
          {model.helpGroups.length === 0 ? (
            <span className="flex-1 bg-[var(--pa-ink-800)]" />
          ) : (
            model.helpGroups.map((g, i) => (
              <span key={g.rule} className={helpTones[i]} style={{ flex: g.count }} />
            ))
          )}
        </span>
        <span className="text-xs text-[var(--pa-text-muted)]">{model.helpCaption}</span>
      </div>
      <div className={tile}>
        {head(t(k("teach.tile.measured")), t(k("teach.tile.measured.of"), { count: model.joined }))}
        <span className="font-mono text-[28px]">{model.measured}</span>
        <div aria-hidden className="flex h-[26px] items-end gap-[3px]">
          {model.measuredBars.map((v, i) => (
            <span
              key={i}
              className={cn("flex-1", v ? "bg-[var(--pa-ok)]" : "bg-[var(--pa-dash-press)]")}
              style={{ height: `${String(4 + Math.round((v / tallest) * 21))}px` }}
            />
          ))}
        </div>
      </div>
      <div className={tile}>
        {head(
          t(k("teach.tile.left")),
          t(k("teach.tile.left.of"), { minutes: model.lessonSeconds / 60 }),
        )}
        <span className="font-mono text-[28px]">{clock(model.secondsLeft)}</span>
        <span className="block h-1.5 bg-[var(--pa-ink-800)]" aria-hidden>
          <span
            className="block h-1.5 bg-[var(--pa-text)]"
            style={{
              width: `${(model.lessonSeconds ? (model.secondsLeft / model.lessonSeconds) * 100 : 0).toFixed(1)}%`,
            }}
          />
        </span>
        <span className="text-xs text-[var(--pa-text-muted)]">{model.paceCaption}</span>
      </div>
    </div>
  );
}

function StepBar({ card }: { card: BenchCard }) {
  return (
    <span aria-hidden className="flex w-full gap-0.5">
      {STEPS.map((step, i) => (
        <span
          key={step}
          className={cn(
            "h-1 flex-1",
            i < card.stepIndex
              ? "bg-[var(--pa-ok)]"
              : i === card.stepIndex
                ? card.help
                  ? "bg-[var(--pa-warn)]"
                  : "bg-[var(--pa-text)]"
                : "bg-[var(--pa-dash-press)]",
          )}
        />
      ))}
    </span>
  );
}

function Drawer(props: {
  card: BenchCard;
  actions: BoardActions;
  onClose: () => void;
  onHint: () => void;
  onNote: () => void;
}) {
  const { card, actions, onClose } = props;
  const [rows, setRows] = useState<ReadingRow[] | number | null | undefined>(undefined);
  const panel = useRef<HTMLElement>(null);
  // The board re-renders every second (its clock), so the card and onClose are new objects each
  // time. The effects follow them through refs and run again only when the bench itself changes.
  const latest = useRef({ card, onClose });
  useEffect(() => {
    latest.current = { card, onClose };
  });
  const memberId = card.memberId;
  const readings = card.bench.readings;
  useEffect(() => {
    let live = true;
    void actions.readings(latest.current.card).then((r) => {
      if (live) setRows(r);
    });
    return () => {
      live = false;
    };
  }, [actions, memberId, readings]);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") latest.current.onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      before?.focus();
    };
  }, [memberId]);
  const mistake = card.bench.mistakes[0];
  const fmt = (n: number, d: number) => n.toFixed(d);
  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        className="fixed inset-0 z-20 bg-[color-mix(in_srgb,var(--pa-ink-1000)_45%,transparent)]"
      />
      <aside
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={card.name}
        className="fixed top-[14px] right-[14px] bottom-[14px] z-[21] flex w-[min(420px,calc(100%-28px))] flex-col border border-[var(--pa-line)] bg-[var(--pa-ink-900)] outline-none animate-[pa-drawer-in_.25s_cubic-bezier(.2,.8,.2,1)]"
      >
        <div className="flex items-center gap-[10px] border-b border-[var(--pa-ink-800)] px-4 py-[14px]">
          <span className="flex flex-1 flex-col">
            <span className="text-[15px] font-semibold">{card.name}</span>
            <span className="text-xs text-[var(--pa-text-faint)]">
              {t(k("teach.drawer.step"), { n: card.stepIndex + 1, step: card.stage })}
            </span>
          </span>
          <Chip tone={card.tone}>{card.status}</Chip>
          <button
            type="button"
            onClick={onClose}
            aria-label={t(k("teach.drawer.close"))}
            className={cn(
              "flex size-[30px] cursor-pointer items-center justify-center text-[var(--pa-text-soft)]",
              FOCUS,
            )}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-auto p-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs text-[var(--pa-text-faint)]">
              {t(k("teach.drawer.readings"))}
            </span>
            {Array.isArray(rows) && rows.length > 0 ? (
              <div className="border border-[var(--pa-ink-800)] font-mono text-[13px]">
                <div className="grid grid-cols-3 border-b border-[var(--pa-ink-800)] px-[10px] py-2 text-[var(--pa-text-faint)]">
                  <span>l/m</span>
                  <span>t/s</span>
                  <span>T/s</span>
                </div>
                {rows.map((r, i) => (
                  <div
                    key={i}
                    className={cn(
                      "grid grid-cols-3 border-t border-[var(--pa-ink-800)] px-[10px] py-2 first:border-t-0",
                      r.off ? "text-[var(--pa-warn-text)]" : "text-[var(--pa-text)]",
                    )}
                  >
                    <span>{fmt(r.l, 3)}</span>
                    <span>{fmt(r.t, 2)}</span>
                    <span>{fmt(r.T, 3)}</span>
                  </div>
                ))}
              </div>
            ) : typeof rows === "number" && rows > 0 ? (
              <span className="text-[var(--pa-text-soft)]">
                {t(k("teach.drawer.readingsCount"), { count: rows })}
              </span>
            ) : rows !== undefined ? (
              <span className="text-[var(--pa-text-soft)]">{t(k("teach.drawer.noReadings"))}</span>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-[var(--pa-text-faint)]">
              {t(k("teach.drawer.coach"))}
            </span>
            <span className="text-[var(--pa-text-soft)]">
              {mistake
                ? `${mistakeName(mistake)}. ${mistakeDetail(mistake)}`
                : t(k("teach.drawer.coach.none"))}
            </span>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--pa-ink-800)] px-4 py-3">
          <button
            type="button"
            onClick={card.help ? props.onHint : props.onNote}
            className={cn(
              "h-[34px] cursor-pointer bg-[var(--pa-text)] px-[14px] text-[13px] font-semibold text-[var(--pa-ink-950)]",
              FOCUS,
            )}
          >
            {t(k(card.help ? "teach.drawer.sendHint" : "teach.drawer.sendNote"))}
          </button>
        </div>
      </aside>
    </>
  );
}

function MessageDialog(props: {
  open: boolean;
  title: string;
  body: string;
  onCancel: () => void;
  onSend: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const ready = text.trim().length > 0;
  return (
    <Dialog
      open={props.open}
      onOpenChange={(o) => {
        if (!o) props.onCancel();
        setText("");
      }}
    >
      <DialogContent showCloseButton={false} className="text-sm sm:max-w-[420px]">
        <DialogTitle className="text-base font-semibold">{props.title}</DialogTitle>
        <DialogDescription className="text-soft">{props.body}</DialogDescription>
        <label className="flex flex-col gap-1.5 text-xs text-[var(--pa-text-faint)]">
          {t(k("teach.dialog.text"))}
          <Textarea
            value={text}
            maxLength={280}
            onChange={(e) => setText(e.target.value)}
            rows={3}
          />
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={props.onCancel}>
            {t(k("teach.dialog.cancel"))}
          </Button>
          <Button
            className="font-semibold"
            disabled={!ready}
            onClick={() => {
              const sent = text;
              setText("");
              void props.onSend(sent);
            }}
          >
            {t(k("teach.dialog.send"))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
