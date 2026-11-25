import { Logo } from "@pa/ui";
import Link from "next/link";
import type { ReactNode } from "react";

/** The sign-in and join boards' shared frame: one narrow column on warm paper. */
export function AccessScreen({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--pa-paper)] text-[var(--pa-on-paper)]">
      <header className="mx-auto flex max-w-[420px] items-center px-5 pt-6">
        <Link
          prefetch={false}
          href="/"
          className={`flex items-center gap-2 text-[var(--pa-on-paper)] no-underline ${FOCUS}`}
        >
          <Logo size={24} />
          <span className="font-display text-base font-bold">Physics Anatomy</span>
        </Link>
      </header>
      <main className="mx-auto flex max-w-[420px] flex-col gap-5 px-5 pb-12 pt-7 text-[15px] leading-normal">
        {children}
      </main>
    </div>
  );
}

export const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pa-danger-text)]";
export const TITLE = "m-0 font-display text-[26px] font-bold leading-[1.1]";
export const LEDE = "m-0 text-[var(--pa-on-paper-muted)]";
export const INPUT = `box-border h-12 w-full border border-[var(--pa-on-paper)] bg-white px-3 text-base font-medium text-[var(--pa-on-paper)] ${FOCUS}`;
export const PRIMARY = `flex h-[50px] w-full items-center justify-center border-0 bg-[var(--pa-on-paper)] text-[15px] font-semibold text-[var(--pa-paper)] no-underline disabled:opacity-60 ${FOCUS}`;
export const SECONDARY = `flex h-[50px] w-full items-center justify-center gap-2.5 border border-[var(--pa-on-paper)] bg-white text-[15px] font-semibold text-[var(--pa-on-paper)] no-underline ${FOCUS}`;
export const QUIET = `self-center bg-transparent text-[15px] font-medium text-[var(--pa-on-paper)] underline ${FOCUS}`;

/** A form's error, read out when it appears. */
export function Problem({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="m-0 border-l-4 border-[var(--pa-danger)] bg-white px-3 py-2 text-[var(--pa-on-paper)]"
    >
      {children}
    </p>
  );
}
