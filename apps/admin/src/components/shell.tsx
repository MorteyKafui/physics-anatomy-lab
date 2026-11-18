"use client";

// The sidebar and the command palette (D30): collapsible navigation groups, search on / and ⌘K.
import { Dialog } from "@base-ui/react/dialog";
import { Logo } from "@pa/ui";
import {
  Book,
  ChartColumn,
  ChevronDown,
  FlaskConical,
  Globe,
  House,
  LifeBuoy,
  List,
  ScrollText,
  Search,
  Server,
  Shield,
  Sparkle,
  Users,
  type LucideIcon,
} from "@pa/ui/icons";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { classesForSearch } from "@/app/actions";

import { Ring } from "./bits";

export interface NavItem {
  readonly href: string;
  readonly name: string;
  readonly icon: LucideIcon;
  readonly kids?: readonly { readonly name: string; readonly href: string }[];
}

export const NAV: readonly NavItem[] = [
  { href: "/", name: "Overview", icon: House },
  {
    href: "/usage",
    name: "Usage",
    icon: Users,
    kids: [
      { name: "Experiments", href: "/usage#experiments" },
      { name: "Time per step", href: "/usage#steps" },
      { name: "Devices", href: "/usage#devices" },
    ],
  },
  {
    href: "/learning",
    name: "Learning",
    icon: ChartColumn,
    kids: [
      { name: "Where students stop", href: "/learning#stages" },
      { name: "Mistakes", href: "/learning#mistakes" },
      { name: "Skills", href: "/learning#skills" },
    ],
  },
  { href: "/content", name: "Content", icon: FlaskConical },
  { href: "/question-bank", name: "Question bank", icon: List },
  { href: "/ai", name: "AI", icon: Sparkle },
  { href: "/support", name: "Support", icon: LifeBuoy },
  { href: "/people", name: "People and access", icon: Shield },
  { href: "/research", name: "Research", icon: Book },
  { href: "/translation", name: "Translation", icon: Globe },
  { href: "/system", name: "System", icon: Server },
  { href: "/audit", name: "Audit log", icon: ScrollText },
];

export interface Completion {
  readonly id: string;
  readonly title: string;
  readonly colour: string;
  readonly attempts: number;
  readonly reports: number;
}

export interface ShellProps {
  readonly staff: { readonly email: string; readonly via: string; readonly initials: string } | null;
  readonly completion: readonly Completion[];
  readonly badges: Readonly<Record<string, number>>;
  readonly experiments: readonly { readonly id: string; readonly title: string }[];
  readonly children: ReactNode;
}

export function Shell({ staff, completion, badges, experiments, children }: ShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState<Record<string, boolean>>({ "/learning": true });
  const [pal, setPal] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? "";
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (e.key === "/" && !typing) {
        e.preventDefault();
        setPal(true);
      }
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPal(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const current = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="ad-page">
      <nav aria-label="Admin" className="ad-side">
        <div style={{ display: "flex", alignItems: "center", padding: "0 6px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600, fontSize: 16 }}>
            <span
              style={{
                width: 28,
                height: 28,
                background: "var(--pa-text)",
                color: "var(--pa-ink-950)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Logo size={20} />
            </span>
            Admin
          </span>
        </div>
        <button className="ad-f ad-btn ad-search" type="button" onClick={() => setPal(true)}>
          <Search size={15} aria-hidden="true" />
          <span style={{ flex: 1 }}>Search…</span>
          <span className="ad-kbd">/</span>
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <span className="ad-side-label">Platform</span>
          {NAV.map((item) => {
            const Icon = item.icon;
            const expanded = !!item.kids && !!open[item.href];
            const badge = badges[item.href] ?? 0;
            return (
              <div key={item.href} style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ display: "flex" }}>
                  <Link
                    className="ad-f ad-nav ad-navitem"
                    href={item.href}
                    aria-current={current(item.href) ? "page" : undefined}
                  >
                    <Icon size={16} aria-hidden="true" />
                    <span style={{ flex: 1 }}>{item.name}</span>
                    {badge > 0 && (
                      <span
                        className="ad-mono"
                        style={{ fontSize: 12, color: "var(--pa-warn-text)" }}
                        aria-label={`${String(badge)} need attention`}
                      >
                        {badge}
                      </span>
                    )}
                  </Link>
                  {item.kids && (
                    <button
                      className="ad-f ad-nav"
                      type="button"
                      aria-expanded={expanded}
                      aria-label={`${expanded ? "Hide" : "Show"} ${item.name} pages`}
                      onClick={() => setOpen({ ...open, [item.href]: !open[item.href] })}
                      style={{
                        width: 30,
                        border: 0,
                        background: "transparent",
                        color: "var(--pa-text-faint)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ChevronDown
                        size={14}
                        aria-hidden="true"
                        style={{
                          transition: "transform var(--pa-duration)",
                          transform: `rotate(${expanded ? 0 : -90}deg)`,
                        }}
                      />
                    </button>
                  )}
                </span>
                {expanded && (
                  <div style={{ display: "flex", flexDirection: "column", padding: "2px 0 4px 34px" }}>
                    {item.kids!.map((k) => (
                      <Link key={k.href} className="ad-f ad-nav ad-subnav" href={k.href}>
                        {k.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span className="ad-side-label">Flagship experiments, completion</span>
          {completion.map((f) => (
            <Link
              key={f.id}
              className="ad-f ad-nav"
              href={`/learning?experiment=${f.id}`}
              title={`${String(f.reports)} of ${String(f.attempts)} attempts started in the last 30 days reached the report`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "6px 8px",
                color: "var(--pa-text-soft)",
                textDecoration: "none",
                fontSize: 13,
              }}
            >
              <Ring share={f.attempts ? f.reports / f.attempts : null} colour={f.colour} />
              <span style={{ flex: 1 }}>{f.title}</span>
              <span className="ad-mono" style={{ fontSize: 12, color: "var(--pa-text-faint)" }}>
                {f.attempts ? `${String(Math.round((f.reports / f.attempts) * 100))}%` : "–"}
              </span>
            </Link>
          ))}
        </div>

        <span style={{ flex: 1 }} />
        <div
          style={{
            border: "1px solid var(--pa-line)",
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            background: "var(--pa-ink-950)",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--pa-warn-text)" }}>
            Running cost, projected
          </span>
          <span style={{ fontSize: 12, color: "var(--pa-text-muted)" }}>
            Not worked out yet. It appears here once the running-cost model in the plan is written.
          </span>
        </div>
        {staff && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px" }}>
            <span
              aria-hidden="true"
              style={{
                width: 30,
                height: 30,
                background: "var(--pa-line)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {staff.initials}
            </span>
            <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
              <span
                style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis" }}
              >
                {staff.email}
              </span>
              <span style={{ fontSize: 12, color: "var(--pa-text-faint)" }}>
                {staff.via === "access" ? "Staff, via Cloudflare Access" : "Dev bypass, local only"}
              </span>
            </span>
          </div>
        )}
      </nav>

      <main className="ad-main">{children}</main>

      <Palette open={pal} onClose={() => setPal(false)} experiments={experiments} />
    </div>
  );
}

interface Hit {
  label: string;
  hint: string;
  href: string;
}

function Palette({
  open,
  onClose,
  experiments,
}: {
  open: boolean;
  onClose: () => void;
  experiments: ShellProps["experiments"];
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [classes, setClasses] = useState<Hit[]>([]);

  useEffect(() => {
    if (!open) return;
    let live = true;
    void classesForSearch().then((r) => {
      if (live && r.ok)
        setClasses(
          r.data.map((c) => ({ label: c.code, hint: c.name, href: `/people?class=${c.id}` })),
        );
    });
    return () => {
      live = false;
    };
  }, [open]);

  const groups = useMemo(() => {
    const all: { name: string; items: Hit[] }[] = [
      {
        name: "Pages",
        items: NAV.flatMap((n) => [
          { label: n.name, hint: "Page", href: n.href },
          ...(n.kids ?? []).map((k) => ({ label: k.name, hint: n.name, href: k.href })),
        ]),
      },
      { name: "Classes", items: classes },
      {
        name: "Experiments",
        items: experiments.map((e) => ({
          label: e.title,
          hint: "Experiment",
          href: `/learning?experiment=${e.id}`,
        })),
      },
      {
        name: "Actions",
        items: [
          { label: "Turn AI off for a class", hint: "People and access", href: "/people" },
          { label: "Read the audit log", hint: "Audit log", href: "/audit" },
        ],
      },
    ];
    const needle = q.trim().toLowerCase();
    return all
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (i) => !needle || `${i.label} ${i.hint}`.toLowerCase().includes(needle),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [q, classes, experiments]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setQ("");
          onClose();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="ad-scrim" style={{ zIndex: 30 }} />
        <Dialog.Popup className="ad-pal" initialFocus={input} aria-label="Search">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "0 14px",
              borderBottom: "1px solid var(--pa-ink-800)",
            }}
          >
            <Search size={16} color="var(--pa-text-muted)" aria-hidden="true" />
            <input
              ref={input}
              className="ad-f"
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search pages, classes and actions"
              aria-label="Search pages, classes and actions"
              style={{
                flex: 1,
                height: 48,
                background: "transparent",
                border: 0,
                outline: "none",
                color: "var(--pa-text)",
                font: "15px var(--font-geist), sans-serif",
              }}
            />
            <span className="ad-kbd">Esc</span>
          </div>
          <div style={{ maxHeight: 340, overflow: "auto", padding: 6 }}>
            {groups.map((g) => (
              <div key={g.name} style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 12, color: "var(--pa-text-faint)", padding: "8px 10px 4px" }}>
                  {g.name}
                </span>
                {g.items.map((it) => (
                  <button
                    key={`${g.name}-${it.href}-${it.label}`}
                    className="ad-f ad-row"
                    type="button"
                    onClick={() => {
                      setQ("");
                      onClose();
                      router.push(it.href);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 10px",
                      background: "transparent",
                      border: 0,
                      color: "var(--pa-text)",
                      font: "14px var(--font-geist), sans-serif",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ flex: 1 }}>{it.label}</span>
                    <span style={{ fontSize: 12, color: "var(--pa-text-faint)" }}>{it.hint}</span>
                  </button>
                ))}
              </div>
            ))}
            {groups.length === 0 && (
              <span
                style={{ display: "block", padding: "18px 10px", color: "var(--pa-text-muted)", fontSize: 14 }}
              >
                Nothing matches &ldquo;{q}&rdquo;. Try a class code, an experiment or a page name.
              </span>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
