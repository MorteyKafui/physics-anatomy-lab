// Live behaviour for the resonance tube. Inlined after the kit, the kit's lathe and tube modules
// (as G and TUBE_KIT) and the physics model (as MODEL); build.mjs fills in the data.
const D = __DATA__;
const P = D.P;
const k = { slabOf, cylinder, solidSvg, lineSvg, ring, segment, iso, pathOf };
/*__FORK__*/
/*__HOSE__*/
/*__ROD__*/

const root = document.querySelector(".rt");
const stage = root.querySelector(".rt-stage");
const svg = stage.querySelector("svg");
const said = stage.querySelector(".rt-said");
const readout = root.querySelector("[data-readout]");
const caption = root.querySelector("[data-caption]");
const waterG = svg.querySelector('[data-live="water"]');
const waveG = svg.querySelector('[data-live="wave"]');
const soundG = svg.querySelector('[data-live="sound"]');
const forkG = svg.querySelector('[data-live="fork"]');
const hoseG = svg.querySelector('[data-live="hose"]');
const movers = [...svg.querySelectorAll('[data-move="reservoir"]')];
const rodLo = svg.querySelector('[data-live="rod-lo"]');
const rodHi = svg.querySelector('[data-live="rod-hi"]');
const keys = [...root.querySelectorAll(".rt-key")];
const still = matchMedia("(prefers-reduced-motion: reduce)");

const TUBE_M = D.tube;
const v = MODEL.speedOfSound(TUBE_M.temperatureC);
const e = MODEL.endCorrection(TUBE_M);
const cm = (m) => (m * 100).toFixed(1);
const levelOf = (L) => D.Z_MOUTH - L * 100 * D.U;
const tipOf = (L) => levelOf(L) - D.RES_WATER;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

// Screen-right across the tube, in the vertical plane through its axis that faces the viewer.
const ACROSS = (() => {
  const n = Math.hypot(D.V[0], D.V[1]);
  return [D.V[1] / n, -D.V[0] / n, 0];
})();
const inPlane = (w, z) => iso([D.TUBE[0] + ACROSS[0] * w, D.TUBE[1] + ACROSS[1] * w, z], P);

let fi = D.forkStart;
let L = D.L;
let target = D.L;
let clock = 0;
let struck = 0;
// The tour waits at the first resonance for a few seconds, so the first thing seen is the loud one.
let touring = false;
let tourClock = 0; // set from the water's level when the tour starts
let idleTimer = 0;
let last = 0;
let frame = 0;
let visible = false;
let drawnTip = NaN;
let drawnFork = -1;
let dragging = null;

const f = () => D.forks[fi];

function drawWater() {
  const z = levelOf(L);
  const body = cylinder(D.TUBE[0], D.TUBE[1], D.R_IN - 0.05, D.Z_BOTTOM, z - D.Z_BOTTOM, P, 64);
  waterG.innerHTML = `<path class="rt-water" d="${body.fill}"/><path class="rt-water-top" d="${body.top}"/><path class="iso-line rt-meniscus" data-tone="hi" d="${ring(D.TUBE[0], D.TUBE[1], D.R_IN - 0.05, z, P, 64)}"/>`;
}

function drawReservoir() {
  const tip = tipOf(L);
  const dz = tip - D.resTip0;
  const t = translateAlong(P, [0, 0, dz]);
  for (const node of movers) node.setAttribute("transform", t);
  if (Math.abs(tip - drawnTip) > 0.04) {
    hoseG.innerHTML = hoseSvg(tip);
    // The second rod, in its pieces below and above the moving boss head.
    const [x, y] = D.ROD2;
    const boss = D.resBossZ + dz;
    rodLo.innerHTML = rodSvg(x, y, 6, boss - 6, false);
    rodHi.innerHTML = rodSvg(x, y, boss + 6, D.ROD2_TOP, true);
    drawnTip = tip;
  }
}

function drawFork() {
  if (drawnFork === fi) return;
  forkG.innerHTML = forkSvg(f(), 0);
  drawnFork = fi;
  // Group the two prongs so they can swing without a rebuild.
  const prongs = [...forkG.querySelectorAll(".iso-solid[data-lit]")];
  prongs.forEach((node, index) => node.setAttribute("data-prong", index === 0 ? "1" : "-1"));
}

// How loud the column sounds now: the steady loudness times the struck fork's amplitude.
const level = () => MODEL.loudness(TUBE_M, L, f()) * (MODEL.forkAmplitude(clock - struck) ?? 0);

function drawWave(phase, sound) {
  const wave = MODEL.standingWave(TUBE_M, L, f());
  if (!wave) return (waveG.innerHTML = "");
  const zWater = levelOf(L);
  const half = D.R_IN - 1.1;
  const amp = clamp(sound, 0, 1.0001);
  // Envelope: the air's largest displacement, |sin kx|, from the water up to the antinode e
  // above the mouth, mirrored about the axis.
  const kx = (2 * Math.PI) / wave.wavelength;
  const top = -e;
  const steps = Math.max(24, Math.round((L - top) * 400));
  const left = [];
  const right = [];
  for (let i = 0; i <= steps; i++) {
    const depth = L - ((L - top) * i) / steps;
    const s = Math.abs(Math.sin(kx * (L - depth)));
    const z = D.Z_MOUTH - depth * 100 * D.U;
    left.push(inPlane(-half * s * amp, z));
    right.push(inPlane(half * s * amp, z));
  }
  const env =
    amp > 0.02
      ? `<path class="iso-line rt-env" data-tone="lit" data-free="" d="${pathOf(left)}${pathOf(right)}"/>`
      : "";
  // Air particles: columns across the bore, each moved up and down by the standing wave.
  const dots = [];
  const swing = 2.6 * amp;
  const rows = Math.floor((zWater < D.Z_MOUTH ? D.Z_MOUTH - zWater : 0) / 5.2);
  for (let r = 0; r < rows; r++) {
    const z0 = zWater + 2.6 + r * 5.2;
    const depth = (D.Z_MOUTH - z0) / (100 * D.U);
    const air = MODEL.airAt(TUBE_M, L, f(), depth, phase);
    if (!air) continue;
    const z = z0 + ((air.displacement * swing) / Math.max(amp, 1e-6)) * amp;
    for (const w of [-3.9, -1.95, 0, 1.95, 3.9])
      dots.push(inPlane(w, clamp(z, zWater + 0.6, D.Z_MOUTH - 0.4)));
  }
  const nodes = wave.nodes.map((d) => inPlane(0, D.Z_MOUTH - d * 100 * D.U));
  const antinodes = wave.antinodes.map((d) => inPlane(0, D.Z_MOUTH - d * 100 * D.U));
  waveG.innerHTML =
    env +
    `<g class="rt-air">${dotsSvg(dots, { size: 0.55, tone: "hi" })}</g>` +
    (amp > 0.02
      ? `<g class="rt-marks">${dotsSvg(nodes, { size: 1.3, tone: "lit" })}${antinodes.map(([x, y]) => `<circle class="rt-antinode" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.2"/>`).join("")}</g>`
      : "");
}

// Sound leaving the mouth: rings that spread and fade, as bright as the column is loud.
function drawSound(time, sound) {
  if (sound < 0.01) return (soundG.innerHTML = "");
  const [cx, cy] = iso([D.TUBE[0], D.TUBE[1], D.Z_MOUTH + e * 100 * D.U], P);
  const out = [];
  const span = 60;
  for (let i = 0; i < 4; i++) {
    const r = ((time * 18 + i * (span / 4)) % span) + 8;
    const fade = sound * Math.pow(1 - (r - 8) / span, 1.4);
    if (fade < 0.01) continue;
    const a0 = Math.PI * 1.12;
    const a1 = Math.PI * 1.88;
    const p = [];
    for (let j = 0; j <= 24; j++) {
      const a = a0 + ((a1 - a0) * j) / 24;
      p.push([cx + r * Math.cos(a), cy + r * Math.sin(a) * 0.86]);
    }
    out.push(
      `<path class="iso-line rt-ring" data-tone="hi" data-free="" style="opacity:${fade.toFixed(3)}" d="${pathOf(p)}"/>`,
    );
  }
  soundG.innerHTML = out.join("");
}

function captionFor() {
  const fits = MODEL.resonanceLengths(TUBE_M, f());
  return `A ${f()} Hz fork over a tube of ${cm(TUBE_M.radius)} cm inside radius at ${TUBE_M.temperatureC} °C, where sound travels at ${v.toFixed(1)} m/s. The air column, closed by the water and open at the mouth, is loudest when L + e is an odd number of quarter wavelengths, with the end correction e = 0.6r = ${cm(e)} cm: here at L = ${fits.map(cm).join(" cm and ")} cm. The water surface is always a displacement node, and the antinode sits ${cm(e)} cm above the mouth.`;
}

let lastText = "";
function drawText() {
  const db = MODEL.loudnessDb(TUBE_M, L, f());
  const text = `f ${f()} Hz · L ${cm(L)} cm · v ${v.toFixed(1)} m/s · e ${cm(e)} cm · ${db > -0.5 ? "0" : db.toFixed(0)} dB`;
  if (text === lastText) return;
  lastText = text;
  readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(L * 100)));
  stage.setAttribute("aria-valuetext", text);
}

function draw(phase, time) {
  drawFork();
  drawWater();
  drawReservoir();
  const sound = still.matches ? MODEL.loudness(TUBE_M, L, f()) : level();
  drawWave(phase, sound);
  drawSound(time, still.matches ? 0 : sound);
  const swing = still.matches
    ? 0
    : 0.7 * (MODEL.forkAmplitude(clock - struck) ?? 0) * Math.sin(phase * 1.0);
  for (const node of forkG.querySelectorAll("[data-prong]"))
    node.setAttribute("transform", translateAlong(P, [0, 0, Number(node.dataset.prong) * swing]));
  drawText();
}

const resonances = () =>
  MODEL.resonanceLengths(TUBE_M, f()).filter((l) => l >= D.range[0] && l <= D.range[1]);

// The idle tour: sweep the water slowly through every resonance, striking the fork as it goes.
const TOUR = 26;
const [TOUR_LO, TOUR_HI] = [D.range[0] + 0.04, D.range[1] - 0.04];
const tourAt = (t) =>
  TOUR_LO + (TOUR_HI - TOUR_LO) * (0.5 - 0.5 * Math.cos((t / TOUR) * Math.PI * 2));
// The tour starts from wherever the water is now.
const tourFrom = (l) =>
  (TOUR * Math.acos(clamp(1 - (2 * (l - TOUR_LO)) / (TOUR_HI - TOUR_LO), -1, 1))) / (Math.PI * 2);

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  clock += dt;
  if (touring) {
    tourClock += dt;
    target = tourAt(tourClock);
    if (clock - struck > 4.5) struck = clock;
  }
  L += (target - L) * (1 - Math.exp(-dt / 0.3));
  if (Math.abs(target - L) < 1e-5) L = target;
  draw(clock * Math.PI * 2 * 0.9, clock);
  const sounding = (MODEL.forkAmplitude(clock - struck) ?? 0) > 0.004;
  frame =
    visible && (touring || sounding || L !== target || dragging) ? requestAnimationFrame(tick) : 0;
}

const run = () => {
  if (!frame && visible && !still.matches) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
};

function hold() {
  touring = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (still.matches) return;
    touring = true;
    tourClock = tourFrom(L);
    run();
  }, 8000);
}

function steer(next) {
  hold();
  target = clamp(next, D.range[0], D.range[1]);
  if (still.matches) {
    L = target;
    draw(0, 0);
  }
  run();
}

function strike() {
  hold();
  struck = clock;
  said.textContent = `The ${f()} Hz fork is struck.`;
  run();
}

function setFork(next) {
  hold();
  fi = (next + D.forks.length) % D.forks.length;
  caption.textContent = captionFor();
  struck = clock;
  said.textContent = `${f()} Hz fork. It resonates at ${resonances()
    .map((l) => cm(l) + " cm")
    .join(" and ")}.`;
  if (still.matches) draw(0, 0);
  run();
}

stage.addEventListener("pointerdown", (event) => {
  dragging = { y: event.clientY, L: target };
  stage.setPointerCapture(event.pointerId);
  hold();
});
stage.addEventListener("pointermove", (event) => {
  if (!dragging) return;
  const box = svg.getBoundingClientRect();
  const perUnit = (box.height / D.H) * D.screenRise;
  const dz = (dragging.y - event.clientY) / perUnit;
  steer(dragging.L - dz / (100 * D.U));
});
const release = () => {
  dragging = null;
};
stage.addEventListener("pointerup", release);
stage.addEventListener("pointercancel", release);
stage.addEventListener("keydown", (event) => {
  const step = event.shiftKey ? 0.05 : 0.005;
  if (event.key === "ArrowUp") steer(target - step);
  else if (event.key === "ArrowDown") steer(target + step);
  else if (event.key === "PageUp") steer(target - 0.05);
  else if (event.key === "PageDown") steer(target + 0.05);
  else if (event.key === "Home") steer(D.range[0]);
  else if (event.key === "End") steer(D.range[1]);
  else if (event.key === "ArrowLeft") setFork(fi - 1);
  else if (event.key === "ArrowRight") setFork(fi + 1);
  else if (event.key === " " || event.key === "Enter") strike();
  else return;
  event.preventDefault();
});

// Legend: choosing an entry picks its part out.
const SELECT = {
  tube: '.it[data-piece="tube"]',
  wave: '[data-live="wave"]',
  water: '[data-live="water"]',
  reservoir: '.it[data-piece="reservoir"]',
  fork: '.it[data-piece="fork"], .it[data-piece="pad"]',
  rule: '.it[data-piece="rule"]',
  thermometer: '.it[data-piece="thermometer"]',
  stand: '.it[data-piece="stand"]',
};
let picked = null;
function pick(id) {
  picked = picked === id ? null : id;
  for (const node of svg.querySelectorAll("[data-on]")) node.removeAttribute("data-on");
  if (picked)
    for (const node of svg.querySelectorAll(SELECT[picked])) node.setAttribute("data-on", "");
  stage.toggleAttribute("data-focus", Boolean(picked));
  for (const key of keys) key.setAttribute("aria-pressed", String(key.dataset.key === picked));
}
for (const key of keys) key.addEventListener("click", () => pick(key.dataset.key));

new IntersectionObserver(
  (entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run();
  },
  { rootMargin: "120px 0px" },
).observe(stage);

tourClock = tourFrom(L);
if (!still.matches)
  idleTimer = setTimeout(() => {
    touring = true;
    tourClock = tourFrom(L);
    run();
  }, 5000);
drawFork();
draw(0, 0);
window.__rt = { steer, setFork, strike, pick, state: () => ({ L, target, f: f(), touring }) };
