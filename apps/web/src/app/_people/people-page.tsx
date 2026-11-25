import type { ReactNode } from "react";

import { SiteFrame } from "../experiments/site-frame";

export const BOX = "flex flex-col gap-2 border border-[var(--pa-paper-line)] bg-white p-5";
export const EMPTY =
  "flex flex-col gap-1.5 border border-dashed border-[var(--pa-on-paper-muted)] bg-white p-5";
export const H2 = "m-0 font-display text-xl font-bold";
export const MUTED = "text-[var(--pa-on-paper-muted)]";
export const BUTTON =
  "self-start border border-[var(--pa-on-paper)] px-3.5 py-2 font-medium text-[var(--pa-on-paper)] no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pa-accent)]";

/** One of the people pages (design/mockups/People.dc.html): the site's frame, one narrow column. */
export function PeoplePage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SiteFrame>
      <div className="mx-auto flex max-w-[720px] flex-col gap-5 px-4 pb-20 pt-12 sm:px-8">
        <h1 className="m-0 font-display text-[clamp(40px,6vw,64px)] font-extrabold leading-none tracking-[-0.03em]">
          {title}
        </h1>
        {children}
      </div>
    </SiteFrame>
  );
}

/** What a page shows while its data file is empty: said plainly, never a placeholder. */
export function Empty({ title, about }: { title: string; about: string }) {
  return (
    <div role="status" data-empty className={EMPTY}>
      <b>{title}</b>
      <span className={MUTED}>{about}</span>
    </div>
  );
}
