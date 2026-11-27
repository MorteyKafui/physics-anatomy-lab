// Live sonometer. The model (packages/physics/src/sonometer.ts) is inlined above this script.
const D = __DATA__;
const P = D.P;
const stage = document.querySelector(".sn-stage");
const svgEl = stage.querySelector("svg");
const spanG = svgEl.querySelector('[data-part="span"]');
const leadEl = svgEl.querySelector('[data-part="lead"]');
const movers = [...svgEl.querySelectorAll("[data-mover]")];
const tines = [...svgEl.querySelectorAll("[data-tine]")];
const riderG = svgEl.querySelector('[data-part="rider"]');
const forkLabel = svgEl.querySelector('[data-part="fork-label"] text');
const readoutEl = document.querySelector("[data-readout]");
const statusEl = stage.querySelector("[data-status]");
const reads = Object.fromEntries(
  [...document.querySelectorAll("[data-read]")].map((el) => [el.dataset.read, el]),
);
const picks = [...document.querySelectorAll("[data-pick]")];
const still = matchMedia("(prefers-reduced-motion: reduce)");

const TENSION = tensionFromLoad(D.load, D.g, D.loss);
const SPEED = waveSpeed(TENSION, D.mu);
const N = 96;
const toUnits = D.perM * D.exag; // metres of real displacement to drawn units
const STATIC = 2e-6; // drive: metres of static displacement per mode for a fresh strike
const at3 = (p) => iso(p, P);
const fixed1 = (v) => v.toFixed(1);
const bridgeAt = (l) => D.fixedX + l * D.perM;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

let fork = D.fork0;
let l = (D.restX - D.fixedX) / D.perM;
let target = l;
let clock = 0; // display seconds
let struck = -1e9; // wall-clock seconds of the last strike
let wall = 0;
let shown = 0; // eased drive strength actually drawn
let rider = {
  mode: "seated",
  x: D.fixedX + l * D.perM * 0.5,
  z: D.wc,
  y: 0,
  vz: 0,
  vy: 0,
  turn: 0,
  spin: 0,
};
let touring = !still.matches;
let tourStep = -1;
let tourWait = 0;
let idle = 0;
let visible = false;
let frame = 0;
let last = 0;
let pick = null;

const driven = (length) => ({ length, speed: SPEED, frequency: D.forks[fork], q: D.q, modes: 4 });
const strength = () => forkAmplitude(wall - struck, D.tau) ?? 0;

// ---------- drawing ----------
const RIDER = { half: 2.4, leg: 3.4, drop: 4.4 };
function riderLegs(cx, cz, turn, cy = 0) {
  // A strip of paper folded over the wire: two legs from the fold, rotated by `turn` about the x axis.
  const c = Math.cos(turn);
  const s = Math.sin(turn);
  const rot = ([y, z]) => [y * c - z * s, y * s + z * c];
  const fold = D.wireR;
  const leg = (side) => {
    const a = rot([0, fold]);
    const b = rot([side * RIDER.leg, fold - RIDER.drop]);
    return [
      [cx - RIDER.half, cy + a[0], cz + a[1]],
      [cx + RIDER.half, cy + a[0], cz + a[1]],
      [cx + RIDER.half, cy + b[0], cz + b[1]],
      [cx - RIDER.half, cy + b[0], cz + b[1]],
    ];
  };
  const draw = (pts) => `<path class="sn-paper" d="${pathOf(pts.map(at3), true)}"/>`;
  const near = rot([1, 0])[0] >= 0 ? 1 : -1;
  return {
    back: draw(leg(-near)),
    front:
      draw(leg(near)) +
      `<path class="iso-line" data-tone="hi" d="${pathOf(leg(near).map(at3), true)}${pathOf(leg(-near).map(at3), true)}"/>`,
  };
}

function drawWire(bx, length, drive) {
  const d = driven(length);
  const tReal = clock / D.slow;
  const quarter = 1 / (4 * D.forks[fork]);
  const pts = [];
  const up = [];
  const down = [];
  let peak = 0;
  for (let i = 0; i <= N; i++) {
    const x = D.fixedX + ((bx - D.fixedX) * i) / N;
    const xm = (x - D.fixedX) / D.perM;
    const y0 = drivenDisplacement(d, xm, tReal, STATIC) ?? 0;
    const y1 = drivenDisplacement(d, xm, tReal + quarter, STATIC) ?? 0;
    const amp = Math.hypot(y0, y1) * drive * toUnits;
    peak = Math.max(peak, amp);
    pts.push([x, 0, D.wc + y0 * drive * toUnits]);
    up.push([x, 0, D.wc + amp]);
    down.push([x, 0, D.wc - amp]);
  }
  const wireZ = (x) => {
    const xm = (x - D.fixedX) / D.perM;
    return D.wc + (drivenDisplacement(d, xm, tReal, STATIC) ?? 0) * drive * toUnits;
  };
  const env =
    peak > 0.35
      ? `<path class="iso-line" data-tone="lo" d="${pathOf(up.map(at3))}${pathOf(down.map(at3))}"/>`
      : "";
  const wire = `<path class="iso-line sn-wire" data-tone="lit" d="${pathOf(pts.map(at3))}"/>`;
  return { env, wire, wireZ, peak };
}

function render() {
  const bx = bridgeAt(l);
  const drive = shown;
  const { env, wire, wireZ } = drawWire(bx, l, drive);
  let back = "";
  let front = "";
  if (rider.mode === "seated") {
    const legs = riderLegs(rider.x, wireZ(rider.x), 0);
    back = legs.back;
    front = legs.front;
    riderG.innerHTML = "";
  } else {
    const legs = riderLegs(rider.x, rider.z, rider.turn, rider.y);
    riderG.innerHTML = legs.back + legs.front;
  }
  spanG.innerHTML = back + env + wire + front;
  leadEl.setAttribute("d", pathOf([[bx, 0, D.wc], D.leadEnd].map(at3)));
  const shift = translateAlong(P, [bx - D.restX, 0, 0]);
  for (const el of movers) el.setAttribute("transform", shift);
  const f = D.forks[fork];
  const wobble = 0.55 * drive * Math.cos(2 * Math.PI * f * (clock / D.slow));
  tines.forEach((el, i) =>
    el.setAttribute("transform", translateAlong(P, [(i ? 1 : -1) * wobble, 0, 0])),
  );
  writeReadings();
}

let lastText = "";
function writeReadings() {
  const f = D.forks[fork];
  const f1 = harmonicFrequency(1, l, SPEED);
  const n = Math.max(1, Math.round(f / f1));
  const fn = harmonicFrequency(n, l, SPEED);
  const lam = harmonicWavelength(n, l);
  const values = {
    length: `${fixed1(l * 100)} cm`,
    fork: `${f} Hz`,
    harmonic: `${n}`,
    fn: `${fixed1(fn)} Hz`,
    lambda: `${fixed1(lam * 100)} cm`,
  };
  for (const [key, text] of Object.entries(values))
    if (reads[key] && reads[key].textContent !== text) reads[key].textContent = text;
  const band = resonanceBand(f, SPEED, D.q, 1, n);
  const inside = band && l >= band[0] && l <= band[1];
  const text = `l ${fixed1(l * 100)} cm · ${inside ? `resonance, n = ${n}` : `fork ${f} Hz`}`;
  if (text !== lastText) {
    readoutEl.textContent = text;
    lastText = text;
  }
  if (forkLabel && forkLabel.textContent !== `${f} Hz`) forkLabel.textContent = `${f} Hz`;
}

// ---------- the rider ----------
function reseat() {
  rider = {
    mode: "seated",
    x: D.fixedX + l * D.perM * 0.5,
    z: D.wc,
    y: 0,
    vz: 0,
    vy: 0,
    turn: 0,
    spin: 0,
  };
}
function throwRider(z) {
  rider = { mode: "flying", x: rider.x, z, y: 0, vz: 34, vy: 9, turn: 0, spin: 6.5 };
  say(
    `The rider is thrown off: resonance at l = ${fixed1(l * 100)} cm with the ${D.forks[fork]} Hz fork.`,
  );
}
const LAND_TURN = Math.atan2(RIDER.drop, RIDER.leg);
function stepRider(dt, wireZ) {
  if (rider.mode === "seated") {
    const s = (rider.x - D.fixedX) / (l * D.perM);
    if (s <= 0.02 || s >= 0.98) return throwRider(D.wc);
    const thrown = riderThrown(driven(l), s, shown);
    if (thrown) throwRider(wireZ(rider.x));
    return;
  }
  if (rider.mode !== "flying") return;
  const g = 140;
  rider.vz -= g * dt;
  rider.z += rider.vz * dt;
  rider.y += rider.vy * dt;
  rider.turn += rider.spin * dt;
  const floor = D.lid + RIDER.half * 0 + 0.3 + Math.max(0, RIDER.drop - D.wireR) * 0.55;
  if (rider.vz < 0 && rider.z <= floor) {
    rider.z = floor;
    rider.turn = LAND_TURN + Math.round((rider.turn - LAND_TURN) / (2 * Math.PI)) * 2 * Math.PI;
    rider.y = Math.min(rider.y, D.scaleY - 5);
    rider.mode = "landed";
  }
}

// ---------- strike, steer, tour ----------
function strike({ fresh = true } = {}) {
  if (fresh) reseat();
  struck = wall;
}
function say(text) {
  statusEl.textContent = text;
}
const TOUR = () => [
  { l: 0.3, strike: true, hold: 2.6 },
  { l: resonantLength(D.forks[fork], SPEED, 1), strike: true, hold: 3.6, slow: true },
  { l: resonantLength(D.forks[fork], SPEED, 2), strike: true, hold: 4.2, slow: true },
  { l: 0.55, strike: true, hold: 2.4 },
];
function stepTour(dt) {
  const steps = TOUR().filter((s) => s.l >= D.reach[0] && s.l <= D.reach[1]);
  if (tourStep < 0 || tourStep >= steps.length) {
    tourStep = 0;
    target = steps[0].l;
    tourWait = -1;
  }
  const step = steps[tourStep];
  target = step.l;
  if (tourWait < 0) {
    if (Math.abs(l - target) < 0.0002) {
      if (step.strike) strike();
      tourWait = step.hold;
    }
    return;
  }
  tourWait -= dt;
  if (tourWait <= 0) {
    tourStep = (tourStep + 1) % steps.length;
    tourWait = -1;
  }
}
function steer(next) {
  touring = false;
  idle = 7;
  target = clamp(next, D.reach[0], D.reach[1]);
  run();
}

// ---------- loop ----------
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  wall += dt;
  const calm = still.matches;
  if (!touring && !calm && idle > 0) {
    idle -= dt;
    if (idle <= 0) {
      touring = true;
      tourStep = -1;
    }
  }
  if (touring && !calm) stepTour(dt);
  const ease = touring && TOUR()[tourStep]?.slow ? 0.9 : 0.28;
  l = calm ? target : l + (target - l) * (1 - Math.exp(-dt / ease));
  if (Math.abs(target - l) < 1e-5) l = target;
  clock += calm ? 0 : dt;
  const want = strength();
  shown = calm ? want : shown + (want - shown) * (1 - Math.exp(-dt / 0.22));
  const { wireZ } = drawWire(bridgeAt(l), l, shown);
  stepRider(dt, wireZ);
  render();
  const quiet = !touring && l === target && want < 0.002 && rider.mode !== "flying";
  frame = visible && !quiet ? requestAnimationFrame(tick) : 0;
}
function run() {
  if (still.matches) return render();
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
}

new IntersectionObserver(
  (entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run();
  },
  { rootMargin: "120px 0px" },
).observe(stage);

// The bridge follows the pointer across the screen.
const sx = (len) => at3([bridgeAt(len), 0, D.wc])[0];
stage.addEventListener("pointermove", (event) => {
  const box = svgEl.getBoundingClientRect();
  const vb = svgEl.viewBox.baseVal;
  const px = vb.x + ((event.clientX - box.left) / box.width) * vb.width;
  const [a, b] = D.reach;
  steer(a + ((px - sx(a)) / (sx(b) - sx(a))) * (b - a));
});
stage.addEventListener("click", () => {
  touring = false;
  idle = 7;
  strike();
  run();
});
stage.addEventListener("keydown", (event) => {
  const step = event.shiftKey ? 0.01 : 0.001;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") steer(target + step);
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") steer(target - step);
  else if (event.key === " " || event.key === "Enter") {
    touring = false;
    idle = 7;
    strike();
    run();
  } else if (event.key === "f" || event.key === "F") {
    fork = (fork + 1) % D.forks.length;
    say(`Fork ${D.forks[fork]} Hz.`);
    steer(target);
  } else if (event.key === "r" || event.key === "R") {
    reseat();
    steer(target);
  } else return;
  event.preventDefault();
});

// Choosing a legend entry picks its part out.
for (const button of picks) {
  button.addEventListener("click", () => {
    pick = pick === button.dataset.pick ? null : button.dataset.pick;
    for (const b of picks) b.setAttribute("aria-pressed", String(b.dataset.pick === pick));
    if (pick) svgEl.dataset.pick = pick;
    else delete svgEl.dataset.pick;
    for (const el of svgEl.querySelectorAll(".sn-rig .it"))
      el.toggleAttribute("data-on", el.dataset.g === pick);
  });
}

if (still.matches) {
  // One still frame: the bridge at resonance, the standing wave's envelope, the rider already off.
  target = l = resonantLength(D.forks[fork], SPEED, 1);
  struck = 0;
  shown = 1;
  rider = {
    mode: "landed",
    x: D.fixedX + l * D.perM * 0.5,
    z: D.lid + 0.3 + (RIDER.drop - D.wireR) * 0.55,
    y: 6,
    vz: 0,
    vy: 0,
    turn: LAND_TURN,
    spin: 0,
  };
}
render();
