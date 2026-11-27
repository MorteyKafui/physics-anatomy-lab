// Live code for the Helmholtz resonator figure. The kit (iso-kit), the lathe (as G) and the
// physics model (as HZ, inlined from packages/physics/src/helmholtz.ts) are in scope.
const D = __DATA__;
const root = document.querySelector(".hz");
const stage = root.querySelector(".hz-stage");
const svg = stage.querySelector("svg");
const readout = root.querySelector("[data-readout]");
const live = root.querySelector("[data-live]");
const waterEl = svg.querySelector("[data-water]");
const cylEl = svg.querySelector("[data-cylwater]");
const plugEl = svg.querySelector("[data-plug]");
const tintEl = svg.querySelector("[data-tint]");
const coneEl = svg.querySelector("[data-cone]");
const needleEl = svg.querySelector("[data-needle]");
const pointerEl = svg.querySelector("[data-pointer]");
const digitsEl = svg.querySelector("[data-digits]");
const layerButton = root.querySelector('[data-act="layer"]');
const partButtons = [...root.querySelectorAll(".hz-part")];
const items = [...svg.querySelectorAll(".it")];
const still = matchMedia("(prefers-reduced-motion: reduce)");
const FF = G.frameOf([D.fa[0], D.fa[1], 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const VISUAL_HZ = 1.1; // the air's motion is shown slowed to this rate

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const stateOf = (cm3) => ({ waterVolume: cm3 * 1e-6, temperatureC: D.roomC });
const f0Of = (cm3) => HZ.resonantFrequency(D.flask, stateOf(cm3));

const sphereR = (s) => Math.sqrt(Math.max(0, D.ri * D.ri - (s - D.zc) * (s - D.zc)));
const sphereSlope = (s) => {
  const r = sphereR(s);
  return r < 1e-6 ? 0 : -(s - D.zc) / r;
};
function cap(s0, s1, n = 28) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = (1 - Math.cos((i / n) * Math.PI)) / 2;
    const s = s0 + (s1 - s0) * t;
    out.push([s, sphereR(s), 1]);
  }
  return out;
}
function drawWater(cm3) {
  const depth = HZ.waterDepth(D.flask, cm3 * 1e-6);
  if (depth === null || depth * 1000 < 0.4) {
    waterEl.innerHTML = "";
  } else {
    const paths = G.solidOf(cap(D.zBottom + 0.02, D.zBottom + depth * 1000), FF, D.P, {
      smooth: { slope: sphereSlope, radius: sphereR },
    });
    waterEl.innerHTML = solidSvg(paths, { tone: "mid", className: "hz-water" });
  }
  const left = Math.max(0, D.supply - cm3);
  cylEl.innerHTML = solidSvg(
    cylinder(
      D.cyl.at[0],
      D.cyl.at[1],
      D.cyl.rIn - 0.2,
      D.cyl.floor,
      Math.max(0.2, left * D.cyl.ml),
      D.P,
      72,
    ),
    { tone: "mid", className: "hz-water" },
  );
}

let water = D.water0;
let waterTarget = D.water0;
let drawnWater = D.water0;
let f = D.f0 * 0.92;
let fTarget = f;
let shownLoud = 0;
let layer = true;
let clock = 0;
let touring = !still.matches;
let tourClock = 0;
let idle = 0;
let frame = 0;
let last = 0;
let visible = false;
let waterSettled = true;

function say() {
  const f0 = f0Of(water);
  const air = HZ.airVolume(D.flask, water * 1e-6);
  const inv = HZ.inverseFrequencySquared(D.flask, stateOf(water));
  const loud = HZ.loudness(D.flask, stateOf(water), f) ?? 0;
  const text = `f₀ ${f0.toFixed(0)} Hz · V ${(air * 1e6).toFixed(0)} cm³ · 1/f₀² ${(inv * 1e6).toFixed(1)} × 10⁻⁶ s²`;
  if (readout.textContent !== text) readout.textContent = text;
  const line = `Generator ${f.toFixed(1)} Hz · loudness ${(loud * 100).toFixed(0)}% of the peak · ${water.toFixed(0)} cm³ of water`;
  if (live.textContent !== line) live.textContent = line;
  stage.setAttribute("aria-valuenow", String(Math.round(f)));
  stage.setAttribute(
    "aria-valuetext",
    `${f.toFixed(0)} hertz; the flask sings at ${f0.toFixed(0)} hertz`,
  );
}

function draw(dt) {
  const st = stateOf(water);
  const f0 = f0Of(water);
  const loud = HZ.loudness(D.flask, st, f) ?? 0;
  // the model's own phase, slowed: time runs so that one drive cycle lasts 1 / VISUAL_HZ seconds
  const t = (clock * VISUAL_HZ) / f;
  const plug = HZ.plugState(D.flask, st, { frequency: f, drivePressure: D.drive, time: t });
  const peak = HZ.plugState(D.flask, st, { frequency: f0, drivePressure: D.drive, time: 0 });
  if (plug && peak) {
    const shift = -11 * (plug.displacement / peak.displacementAmplitude); // into the bulb is down
    plugEl.setAttribute(
      "transform",
      `translate(${(D.plugUp[0] * shift).toFixed(2)} ${(D.plugUp[1] * shift).toFixed(2)})`,
    );
    const p = plug.bulbPressure / peak.pressureAmplitude;
    tintEl.style.opacity = (0.62 * Math.abs(p)).toFixed(3);
    tintEl.dataset.sign = p >= 0 ? "squeezed" : "stretched";
    const cone = 1.4 * Math.cos(2 * Math.PI * VISUAL_HZ * clock) * Math.min(1, 0.25 + 0.75 * loud);
    coneEl.setAttribute(
      "transform",
      `translate(${(D.coneAxis[0] * cone).toFixed(2)} ${(D.coneAxis[1] * cone).toFixed(2)})`,
    );
  }
  // the meter needle follows the loudness in decibels, from −30 dB to the peak
  const db = clamp(20 * Math.log10(Math.max(loud, 1e-6)), -30, 0);
  const want = (db + 30) / 30;
  shownLoud =
    still.matches || dt === 0 ? want : shownLoud + (want - shownLoud) * (1 - Math.exp(-dt / 0.25));
  needleEl.setAttribute("transform", `rotate(${(-45 + 90 * shownLoud).toFixed(2)} 0 8)`);
  // the dial reads 0 to 10 over 270°, on the ×100 range
  pointerEl.setAttribute("transform", `rotate(${(-135 + 27 * (f / 100)).toFixed(2)})`);
  const digits = f.toFixed(1);
  if (digitsEl.textContent !== digits) digitsEl.textContent = digits;
  say();
}

function tour(dt) {
  tourClock += dt;
  // sweep slowly through resonance, then pour in another 50 cm³; after 350 cm³ start again
  const sweep = 9;
  const n = Math.floor(tourClock / sweep);
  const steps = [100, 150, 200, 250, 300, 350];
  waterTarget = steps[n % steps.length];
  const phase = (tourClock % sweep) / sweep;
  const f0 = f0Of(waterTarget);
  fTarget = f0 * (0.8 + 0.4 * (0.5 - 0.5 * Math.cos(phase * 2 * Math.PI)));
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (!calm) clock += dt;
  if (touring && !calm) tour(dt);
  else if (!calm && (idle += dt) > 6) {
    touring = true;
    tourClock = 0;
  }
  f = calm ? fTarget : f + (fTarget - f) * (1 - Math.exp(-dt / 0.35));
  water = calm ? waterTarget : water + (waterTarget - water) * (1 - Math.exp(-dt / 0.6));
  if (Math.abs(water - waterTarget) < 0.05) water = waterTarget;
  if (Math.abs(water - drawnWater) > 0.4 || (water === waterTarget && drawnWater !== water)) {
    drawWater(water);
    drawnWater = water;
  }
  draw(dt);
  frame = visible && !calm ? requestAnimationFrame(tick) : 0;
}
const run = () => {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
};
const steer = () => {
  touring = false;
  idle = 0;
  if (still.matches) tick(performance.now());
  run();
};

new IntersectionObserver(
  (entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run();
  },
  { rootMargin: "120px 0px" },
).observe(stage);

stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const share = clamp(((event.clientX - box.left) / box.width - 0.1) / 0.8, 0, 1);
  fTarget = D.fRange[0] + share * (D.fRange[1] - D.fRange[0]);
  steer();
});
stage.addEventListener("keydown", (event) => {
  const big = event.shiftKey ? 10 : 1;
  if (event.key === "ArrowRight") fTarget = clamp(fTarget + 2 * big, D.fRange[0], D.fRange[1]);
  else if (event.key === "ArrowLeft") fTarget = clamp(fTarget - 2 * big, D.fRange[0], D.fRange[1]);
  else if (event.key === "ArrowUp") waterTarget = clamp(waterTarget + 10 * big, 0, D.waterMax);
  else if (event.key === "ArrowDown") waterTarget = clamp(waterTarget - 10 * big, 0, D.waterMax);
  else if (event.key === "p" || event.key === "P") setLayer(!layer);
  else return;
  event.preventDefault();
  steer();
});
root.querySelector('[data-act="more"]').addEventListener("click", () => {
  waterTarget = clamp(Math.round(waterTarget / 50) * 50 + 50, 0, D.waterMax);
  steer();
});
root.querySelector('[data-act="less"]').addEventListener("click", () => {
  waterTarget = clamp(Math.round(waterTarget / 50) * 50 - 50, 0, D.waterMax);
  steer();
});
root.querySelector('[data-act="tune"]').addEventListener("click", () => {
  fTarget = f0Of(waterTarget);
  steer();
});
function setLayer(on) {
  layer = on;
  stage.toggleAttribute("data-layer-off", !on);
  layerButton.setAttribute("aria-pressed", String(on));
}
layerButton.addEventListener("click", () => setLayer(!layer));

function pick(id) {
  if (id) stage.setAttribute("data-pick", id);
  else stage.removeAttribute("data-pick");
  items.forEach((el) => el.toggleAttribute("data-on", el.dataset.piece === id));
  partButtons.forEach((b) => b.toggleAttribute("data-on", b.dataset.part === id));
}
let picked = null;
partButtons.forEach((b) => {
  b.addEventListener("mouseenter", () => pick(b.dataset.part));
  b.addEventListener("mouseleave", () => pick(picked));
  b.addEventListener("focus", () => pick(b.dataset.part));
  b.addEventListener("blur", () => pick(picked));
  b.addEventListener("click", () => {
    picked = picked === b.dataset.part ? null : b.dataset.part;
    pick(picked);
  });
});

if (still.matches) {
  f = fTarget = D.f0;
  clock = 0.15 / VISUAL_HZ; // a still frame a little after the plug's furthest push
}
drawWater(water);
draw(0);
