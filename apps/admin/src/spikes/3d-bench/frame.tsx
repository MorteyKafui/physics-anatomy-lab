import Link from "next/link";
import type { ReactNode } from "react";

/** The page around each prototype: the same width, heading and instructions for both. */
export function SpikeFrame({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <main
      data-theme="lab"
      className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 bg-background px-4 py-8 text-foreground"
    >
      <p className="text-sm">
        <Link href="/spikes/3d-bench" className="underline underline-offset-4">
          3D bench spike
        </Link>
      </p>
      <h1 className="font-display text-3xl font-bold">{title}</h1>
      <p className="text-muted-foreground">
        Drag across the bench, or use the left and right arrow keys, to turn it. {note}
      </p>
      <div className="aspect-[420/460] w-full border border-border" data-bench>
        {children}
      </div>
    </main>
  );
}
