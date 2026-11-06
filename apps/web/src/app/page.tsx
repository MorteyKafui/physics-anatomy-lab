import { periodExact } from "@pa/physics";

// Holding page until the landing page from the approved mockups is built (Phase 1).
// The number below is computed by the physics package, never typed in (decision D29).
const T = periodExact({ length: 0.8, g: 9.81, amplitude: (5 * Math.PI) / 180 });

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 px-6">
      <h1 className="font-display text-6xl font-extrabold tracking-tight">Physics Anatomy</h1>
      <p className="text-lg text-muted-foreground">Physics from first principles.</p>
      <p className="font-mono text-sm text-muted-foreground">
        A 0.800 m pendulum swinging through 5° has a period of {T.toFixed(3)} s.
      </p>
    </main>
  );
}
