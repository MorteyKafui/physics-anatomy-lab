import Link from "next/link";

// The Phase 1 3D bench spike (master plan; ADR 0036): the same turnable pendulum built twice.
// Team only; nothing here ships to students.
export default function SpikeIndex() {
  return (
    <main
      data-theme="lab"
      className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 bg-background px-4 py-8 text-foreground"
    >
      <h1 className="font-display text-3xl font-bold">3D bench spike</h1>
      <p className="text-muted-foreground">
        The simple pendulum on a bench you can turn, built twice so the two ways can be compared on
        the same set-up. The swing comes from the physics packages in both.
      </p>
      <ul className="flex flex-col gap-2">
        <li>
          <Link href="/spikes/3d-bench/anatomy" className="underline underline-offset-4">
            Anatomy 3D
          </Link>
        </li>
        <li>
          <Link href="/spikes/3d-bench/r3f" className="underline underline-offset-4">
            React Three Fiber
          </Link>
        </li>
      </ul>
    </main>
  );
}
