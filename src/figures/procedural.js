import { parts, place, tube, polyline, TAU } from './sampling.js';

// Every figure is authored in a shared "unit" space (about radius 1) with
// no auto-normalizing, so the two stages of a card (A -> B) share one
// coordinate system and the shared parts line up when particles retarget.
//
// tint 0 / 0.5 / 1 pick the figure's three ramp colors (see registry.js).

const p = parts;

// ---------------------------------------------------------------- 1 · plug
export function plug() {
  const prongZ = 0.52;
  const cable = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    cable.push([0.4 * Math.sin(t * Math.PI * 1.5), 0.08 - 0.95 * t, -0.3 - 0.42 * t]);
  }
  return [
    place(p.box({ size: [0.95, 0.8, 0.55], tint: 0.5 }), { pos: [0, 0.1, 0] }),
    place(p.cylinder({ radius: 0.075, height: 0.5, tint: 1 }), { pos: [-0.22, 0.14, prongZ], rot: [Math.PI / 2, 0, 0], boost: 3 }),
    place(p.cylinder({ radius: 0.075, height: 0.5, tint: 1 }), { pos: [0.22, 0.14, prongZ], rot: [Math.PI / 2, 0, 0], boost: 3 }),
    place(p.torus({ R: 0.13, r: 0.025, tint: 1 }), { pos: [0, -0.12, 0.28], boost: 3 }),
    ...polyline(cable, 0.075, 0, 1.8)
  ];
}

// ------------------------------------------------- 2 · goggles + red cross
export function gogglesCross() {
  const lensY = -0.28;
  const strap = (s) => [
    [0.66 * s, lensY, 0],
    [0.8 * s, lensY, -0.3],
    [0.56 * s, lensY, -0.68]
  ];
  return [
    ...[-1, 1].map((s) => place(p.torus({ R: 0.31, r: 0.05, tint: 0 }), { pos: [0.37 * s, lensY, 0], boost: 2 })),
    ...[-1, 1].map((s) => place(p.ellipsoid({ radii: [0.29, 0.29, 0.05], tint: 0.5 }), { pos: [0.37 * s, lensY, 0], boost: 0.9 })),
    tube([-0.06, lensY, 0], [0.06, lensY, 0], 0.045, 0, 2),
    ...polyline(strap(1), 0.045, 0, 2),
    ...polyline(strap(-1), 0.045, 0, 2),
    place(p.box({ size: [0.7, 0.22, 0.22], tint: 1 }), { pos: [0, 0.55, 0], boost: 1.3 }),
    place(p.box({ size: [0.22, 0.7, 0.22], tint: 1 }), { pos: [0, 0.55, 0], boost: 1.3 })
  ];
}

// ------------------------------------------------- 3 · columns "loading"
const COLUMN_XS = [-0.6, -0.2, 0.2, 0.6];
const columnHeight = (i, j) => 0.35 + 0.95 * (((i * 7 + j * 3) % 5) / 4);
const heightTint = (_x, y) => Math.min(1, Math.max(0, (y + 0.72) / 1.3));

function columns(heightOf) {
  const list = [place(p.box({ size: [1.75, 0.05, 1.75], tint: 0 }), { pos: [0, -0.745, 0] })];
  COLUMN_XS.forEach((x, i) =>
    COLUMN_XS.forEach((z, j) => {
      const h = heightOf(i, j);
      list.push(
        place(p.cylinder({ radius: 0.12, height: h }), {
          pos: [x, -0.72 + h / 2, z],
          tintWorld: heightTint,
          boost: 1.2
        })
      );
    })
  );
  return list;
}
export const columnsBase = () => columns(() => 0.07);
export const columnsFull = () => columns(columnHeight);

// ------------------------------------- 4 · something materializes (cube)
const CUBE = 0.68;
function cubeEdges(tint, radius, boost) {
  const c = [-CUBE, CUBE];
  const edges = [];
  for (const a of c) {
    for (const b of c) {
      edges.push(tube([-CUBE, a, b], [CUBE, a, b], radius, tint, boost));
      edges.push(tube([a, -CUBE, b], [a, CUBE, b], radius, tint, boost));
      edges.push(tube([a, b, -CUBE], [a, b, CUBE], radius, tint, boost));
    }
  }
  return edges;
}
export const boxWire = () => cubeEdges(0.45, 0.022, 2.4);
export const boxSolid = () => [
  place(p.box({ size: [CUBE * 2, CUBE * 2, CUBE * 2], tint: 0.15 }), {
    tintWorld: (x, y) => 0.1 + 0.3 * ((y + CUBE) / (CUBE * 2))
  }),
  ...cubeEdges(1, 0.03, 3.2)
];

// -------------------------------- 5 · parameters being tweaked (sliders)
const SLIDER_YS = [0.75, 0.45, 0.15, -0.15, -0.45, -0.75];
function sliders(knobXs) {
  // The panel has a little thickness so it never vanishes edge-on while spinning.
  const list = [place(p.box({ size: [2.05, 1.95, 0.1], tint: 0 }), { pos: [0, 0, -0.08], boost: 0.3 })];
  SLIDER_YS.forEach((y, i) => {
    list.push(tube([-0.85, y, 0], [0.85, y, 0], 0.028, 0.35, 2.2));
    list.push(place(p.cylinder({ radius: 0.115, height: 0.08, tint: 1 }), { pos: [knobXs[i], y, 0.02], rot: [Math.PI / 2, 0, 0], boost: 2.4 }));
    list.push(place(p.torus({ R: 0.14, r: 0.02, tint: 0.7 }), { pos: [knobXs[i], y, 0.06], boost: 2 }));
  });
  return list;
}
export const slidersA = () => sliders([-0.5, 0.3, -0.1, 0.6, -0.6, 0.1]);
export const slidersB = () => sliders([0.6, -0.45, 0.5, -0.3, 0.4, -0.7]);

// ------------------------------------------------------ 6 · a new planet
export function planet() {
  const land = (x, y, z) => {
    const n = Math.sin(x * 4 + 1.3) + Math.sin(y * 5 - 0.7) + Math.sin(z * 3.5 + 2.1) + 0.6 * Math.sin((x + z) * 7);
    if (Math.abs(y) > 0.54) return 1; // polar caps share the ring color
    return n > 0.7 ? 0.5 : 0.04;
  };
  return [
    place(p.sphere(0.62), { tintWorld: land, boost: 1.6 }),
    place(p.annulus({ rIn: 0.86, rOut: 1.02, tint: 1 }), { rot: [0.45, 0, 0.3], boost: 1.1 }),
    place(p.annulus({ rIn: 0.78, rOut: 0.83, tint: 0.5 }), { rot: [0.45, 0, 0.3], boost: 1.5 })
  ];
}

// -------------------------- 7 · the screen starts the simulation (CRT)
function monitor(on) {
  const list = [
    place(p.box({ size: [1.5, 1.2, 0.9], tint: 0.18 }), { pos: [0, 0.1, 0] }),
    place(p.box({ size: [1.0, 0.8, 0.6], tint: 0.1 }), { pos: [0, 0.1, -0.72] }),
    place(p.cylinder({ radius: 0.38, height: 0.12, tint: 0.3 }), { pos: [0, -0.58, -0.1] }),
    place(p.sphere(0.04, 1), { pos: [0.55, -0.4, 0.46], boost: 8 }),
    // screen bezel
    tube([-0.62, 0.62, 0.46], [0.62, 0.62, 0.46], 0.025, 0.4, 2),
    tube([-0.62, -0.42, 0.46], [0.62, -0.42, 0.46], 0.025, 0.4, 2),
    tube([-0.62, -0.42, 0.46], [-0.62, 0.62, 0.46], 0.025, 0.4, 2),
    tube([0.62, -0.42, 0.46], [0.62, 0.62, 0.46], 0.025, 0.4, 2)
  ];
  const screen = place(p.plane({ w: 1.22, h: 1.0, tint: on ? 1 : 0 }), { pos: [0, 0.1, 0.455], boost: on ? 2.2 : 0.25 });
  list.push(screen);
  if (on) {
    list.push(place(p.triangle([-0.2, -0.28, 0], [-0.2, 0.28, 0], [0.3, 0, 0], 0.5), { pos: [0, 0.1, 0.47], boost: 4 }));
  }
  return list;
}
export const monitorOff = () => monitor(false);
export const monitorOn = () => monitor(true);

// ----------------------------------------- 8 · a point and its dimensions
export const pointDot = () => [place(p.sphere(0.09, 0), { boost: 16 })];
export function pointAxes() {
  const list = [place(p.sphere(0.09, 0), { boost: 16 })];
  const axes = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
  ];
  axes.forEach((d) => {
    const end = d.map((v) => v * 0.92);
    const start = d.map((v) => v * -0.92);
    list.push(tube(start, end, 0.022, 1, 3));
    const rot = d[0] ? [0, 0, -Math.PI / 2] : d[2] ? [Math.PI / 2, 0, 0] : [0, 0, 0];
    list.push(place(p.cone({ radius: 0.06, height: 0.16, tint: 1 }), { pos: d.map((v) => v * 0.98), rot, boost: 4 }));
    for (let k = -3; k <= 3; k++) {
      if (k === 0) continue;
      const c = d.map((v) => v * k * 0.27);
      const perp = d[1] ? [0.07, 0, 0] : [0, 0.07, 0];
      list.push(tube([c[0] - perp[0], c[1] - perp[1], c[2] - perp[2]], [c[0] + perp[0], c[1] + perp[1], c[2] + perp[2]], 0.016, 0.5, 4));
    }
  });
  return list;
}

// ----------------------------------------- 9 · a ring and its circumference
const RING_R = 0.72;
export const ringPlain = () => [place(p.torus({ R: RING_R, r: 0.07, tint: 0 }), { boost: 1.6 })];
export function ringTicks() {
  const list = [place(p.torus({ R: RING_R, r: 0.07, tint: 0 }), { boost: 1.6 })];
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * TAU;
    const major = k % 6 === 0;
    const r0 = RING_R + 0.13;
    const r1 = RING_R + (major ? 0.3 : 0.2);
    list.push(tube([Math.cos(a) * r0, Math.sin(a) * r0, 0], [Math.cos(a) * r1, Math.sin(a) * r1, 0], major ? 0.022 : 0.015, 0.5, 4));
  }
  const a = 0.62;
  list.push(tube([0, 0, 0], [Math.cos(a) * RING_R, Math.sin(a) * RING_R, 0], 0.022, 1, 3));
  list.push(place(p.sphere(0.06, 1), { boost: 12 }));
  list.push(place(p.sphere(0.07, 1), { pos: [Math.cos(a) * RING_R, Math.sin(a) * RING_R, 0], boost: 12 }));
  return list;
}

// ------------------------------- 10 · a sine wave and its tangent lines
const sineY = (t) => 0.48 * Math.sin(t * Math.PI * 3);
const sineDY = (t) => 0.48 * Math.PI * 3 * Math.cos(t * Math.PI * 3);
function sineWave() {
  const pts = [];
  for (let i = 0; i <= 90; i++) {
    const t = -1 + (i / 90) * 2;
    pts.push([t * 0.98, sineY(t), 0]);
  }
  return [
    ...polyline(pts, 0.035, 0.5, 1.4),
    tube([-1, 0, 0], [1, 0, 0], 0.012, 0, 3),
    tube([0, -0.7, 0], [0, 0.7, 0], 0.012, 0, 3)
  ];
}
export const sinePlain = () => sineWave();
export function sineTangents() {
  const list = sineWave();
  [-0.84, -0.56, -0.28, 0.0, 0.28, 0.56, 0.84].forEach((t) => {
    const x = t * 0.98;
    const slope = sineDY(t) / 0.98;
    const len = Math.hypot(1, slope);
    const dx = 0.3 / len;
    const dy = (slope * 0.3) / len;
    const y = sineY(t);
    list.push(tube([x - dx, y - dy, 0], [x + dx, y + dy, 0], 0.016, 1, 4));
    list.push(place(p.sphere(0.04, 0), { pos: [x, y, 0], boost: 14 }));
  });
  return list;
}
