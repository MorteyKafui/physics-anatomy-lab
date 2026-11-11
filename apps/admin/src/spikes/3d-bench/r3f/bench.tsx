"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useState, useSyncExternalStore } from "react";
import type { Group } from "three";
import { prefersStill, swingDegrees, TURN_PER_KEY, TURN_PER_PX } from "../swing";

// The same bench as the Anatomy scene, in centimetres. three's up is y, so the kit's
// (x, y, z) is (x, z, −y) here.
const LENGTH = 80;
const PIVOT_Y = 90;
const DEG = Math.PI / 180;

// What the browser offers, read once on the client: nothing on the server, so the first client
// render matches it and the bench appears after hydration.
const never = () => () => {};
let tonesRead: Record<string, string> | undefined;
let webglRead: boolean | undefined;

/** The figure tokens from packages/ui, read from the page so no colour is typed in. */
function readTones() {
  if (!tonesRead) {
    const css = getComputedStyle(document.documentElement);
    const read = (name: string) => css.getPropertyValue(`--pa-figure-${name}`).trim();
    tonesRead = {
      floor: read("floor"),
      top: read("base-top"),
      side: read("base-side"),
      rod: read("rod"),
      clamp: read("clamp"),
      cork: read("cork"),
      thread: read("thread"),
      bob: css.getPropertyValue("--pa-accent").trim(),
    };
  }
  return tonesRead;
}

/** three throws when it cannot get a WebGL context, and fiber's own fallback never shows, so ask first. */
function readWebgl() {
  if (webglRead === undefined) {
    const probe = document.createElement("canvas");
    webglRead = !!(probe.getContext("webgl2") ?? probe.getContext("webgl"));
  }
  return webglRead;
}

function Pendulum({ turn, tones }: { turn: { current: number }; tones: Record<string, string> }) {
  const bench = useRef<Group>(null);
  const swing = useRef<Group>(null);
  const still = useRef(prefersStill());
  useFrame(({ clock }) => {
    if (bench.current) bench.current.rotation.y = -turn.current * DEG;
    if (swing.current)
      swing.current.rotation.z = still.current ? 0 : swingDegrees(clock.elapsedTime) * DEG;
  });
  return (
    <group ref={bench}>
      <mesh position={[0, -1.5, 0]}>
        <cylinderGeometry args={[42, 42, 3, 64]} />
        <meshLambertMaterial color={tones.top} />
      </mesh>
      <mesh position={[-20, 1.25, 0]}>
        <boxGeometry args={[20, 2.5, 18]} />
        <meshLambertMaterial color={tones.side} />
      </mesh>
      <mesh position={[-20, 51.25, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 97.5, 16]} />
        <meshLambertMaterial color={tones.rod} />
      </mesh>
      <mesh position={[-20, 94, 0]}>
        <boxGeometry args={[3.6, 4, 3.6]} />
        <meshLambertMaterial color={tones.clamp} />
      </mesh>
      <mesh position={[-9.6, 94, 0]}>
        <boxGeometry args={[17.2, 1.2, 1.2]} />
        <meshLambertMaterial color={tones.clamp} />
      </mesh>
      <mesh position={[0, 92.6, 0]}>
        <boxGeometry args={[2, 4, 2]} />
        <meshLambertMaterial color={tones.cork} />
      </mesh>
      <group ref={swing} position={[0, PIVOT_Y, 0]}>
        <mesh position={[0, -LENGTH / 2, 0]}>
          <cylinderGeometry args={[0.12, 0.12, LENGTH, 8]} />
          <meshBasicMaterial color={tones.thread} />
        </mesh>
        <mesh position={[0, -LENGTH, 0]}>
          <sphereGeometry args={[2.4, 32, 16]} />
          <meshLambertMaterial color={tones.bob} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * The React Three Fiber bench: real 3D meshes, lit by one light, seen through an orthographic
 * camera at the Anatomy figure's angle (40° round, 28° up), so the two compare like for like.
 */
export function R3fBench() {
  const tones = useSyncExternalStore(never, readTones, () => undefined);
  const webgl = useSyncExternalStore(never, readWebgl, () => undefined);
  const turn = useRef(0);
  const [shown, setShown] = useState(0);
  const turnBy = (deg: number) => {
    turn.current = (((turn.current + deg) % 360) + 360) % 360;
    setShown(Math.round(turn.current));
  };
  const az = 40 * DEG;
  const el = 28 * DEG;
  const far = 300;
  return (
    <div
      className="h-full w-full touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-ring"
      tabIndex={0}
      role="slider"
      aria-label="Turn the bench"
      aria-valuemin={0}
      aria-valuemax={359}
      aria-valuenow={shown}
      aria-valuetext={`Bench turned ${shown}°`}
      data-turn={shown}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") turnBy(-TURN_PER_KEY);
        else if (e.key === "ArrowRight") turnBy(TURN_PER_KEY);
        else return;
        e.preventDefault();
      }}
      onPointerDown={(e) => {
        const target = e.currentTarget;
        target.setPointerCapture(e.pointerId);
        let x = e.clientX;
        const move = (m: PointerEvent) => {
          turnBy((m.clientX - x) * TURN_PER_PX);
          x = m.clientX;
        };
        const up = () => {
          target.removeEventListener("pointermove", move);
          target.removeEventListener("pointerup", up);
        };
        target.addEventListener("pointermove", move);
        target.addEventListener("pointerup", up);
      }}
    >
      {webgl === false && (
        <p className="p-4 text-muted-foreground">
          This bench needs WebGL, which this browser has turned off.
        </p>
      )}
      {tones && webgl && (
        <Canvas
          orthographic
          dpr={[1, 1.5]}
          camera={{
            position: [
              far * Math.cos(el) * Math.cos(az),
              50 + far * Math.sin(el),
              far * Math.cos(el) * Math.sin(az),
            ],
            zoom: 3.2,
            near: 1,
            far: 1000,
          }}
          onCreated={({ camera }) => camera.lookAt(0, 50, 0)}
        >
          <color attach="background" args={[tones.floor!]} />
          <ambientLight intensity={0.9} />
          <directionalLight position={[-80, 200, 120]} intensity={2} />
          <Pendulum turn={turn} tones={tones} />
        </Canvas>
      )}
    </div>
  );
}
