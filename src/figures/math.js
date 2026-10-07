import { parts, place, tube, polyline, curve, group, textPoints, TAU } from './sampling.js';

// 13 · sine wave and the lines that contain it · 15 · a rocket along 1/x ·
// 17 · lightning -> AC / DC · 19 · confusion / clarity.
// Tints: 0 deep violet · .25 violet · .5 magenta · .75 orange · 1 peach.

// ------------------------------------------------------------------- 13
const waveY = (x) => 0.46 * Math.sin(x * Math.PI * 3);
const wave = () => curve((t) => [-1 + 2 * t, waveY(-1 + 2 * t), 0], 120, 0.034, 0.9, 1.6);

export const sineOnly = () => wave();

// The oscilloscope graticule that holds the wave: a frame, a dotted grid
// and the two center axes with their ticks.
export function sineGrid() {
  const list = wave();
  const X = 1.02;
  const Y = 0.72;
  list.push(
    tube([-X, -Y, 0], [X, -Y, 0], 0.02, 0.3, 3),
    tube([X, -Y, 0], [X, Y, 0], 0.02, 0.3, 3),
    tube([X, Y, 0], [-X, Y, 0], 0.02, 0.3, 3),
    tube([-X, Y, 0], [-X, -Y, 0], 0.02, 0.3, 3),
    tube([-X, 0, 0], [X, 0, 0], 0.015, 0.5, 3),
    tube([0, -Y, 0], [0, Y, 0], 0.015, 0.5, 3)
  );
  for (let i = -4; i <= 4; i++) {
    if (!i) continue;
    // a dotted line is a chain of small dots
    const x = (i / 5) * X;
    for (let k = 0; k <= 14; k++) list.push(place(parts.sphere(0.012, 0.2), { pos: [x, -Y + (k / 14) * 2 * Y, -0.01], boost: 7 }));
  }
  for (let j = -2; j <= 2; j++) {
    if (!j) continue;
    const y = (j / 3) * Y;
    for (let k = 0; k <= 26; k++) list.push(place(parts.sphere(0.012, 0.2), { pos: [-X + (k / 26) * 2 * X, y, -0.01], boost: 7 }));
  }
  for (let i = -20; i <= 20; i++) list.push(tube([(i / 20) * X, -0.035, 0], [(i / 20) * X, 0.035, 0], 0.008, 0.5, 3));
  return list;
}

// ------------------------------------------------------------------- 15
const K = 0.2;
const hyperbola = (sign) =>
  curve((t) => {
    const x = sign * (0.2 + 0.8 * t);
    return [x, K / x, 0];
  }, 80, 0.026, 0.3, 2.4);

function axes() {
  const list = [tube([-1.05, 0, 0], [1.05, 0, 0], 0.014, 0.5, 3), tube([0, -1.05, 0], [0, 1.05, 0], 0.014, 0.5, 3)];
  for (let i = -4; i <= 4; i++) {
    if (!i) continue;
    list.push(tube([i * 0.25, -0.03, 0], [i * 0.25, 0.03, 0], 0.01, 0.5, 3), tube([-0.03, i * 0.25, 0], [0.03, i * 0.25, 0], 0.01, 0.5, 3));
  }
  return list;
}

function rocket() {
  return [
    place(parts.ellipsoid({ radii: [0.2, 0.07, 0.07], tint: 0.95 }), { boost: 1.8 }),
    place(parts.cone({ radius: 0.07, height: 0.13, tint: 0.75 }), { pos: [0.24, 0, 0], rot: [0, 0, -Math.PI / 2], boost: 2 }),
    place(parts.ellipsoid({ radii: [0.13, 0.04, 0.016], tint: 0.5 }), { pos: [-0.13, 0.11, 0], rot: [0, 0, 0.75], boost: 2.4 }),
    place(parts.ellipsoid({ radii: [0.13, 0.04, 0.016], tint: 0.5 }), { pos: [-0.13, -0.11, 0], rot: [0, 0, -0.75], boost: 2.4 }),
    place(parts.sphere(0.032, 0.1), { pos: [0.06, 0, 0.06], boost: 6 }),
    // exhaust
    place(parts.cone({ radius: 0.05, height: 0.2, tint: 0.85 }), { pos: [-0.3, 0, 0], rot: [0, 0, Math.PI / 2], boost: 2.4 })
  ];
}

// The rocket sits on the right branch at plotted x, nose pointing along it.
function rocketAt(x) {
  const angle = Math.atan2(K / (x * x), -1);
  return group(rocket(), { pos: [x, K / x, 0.02], rot: [0, 0, angle], scale: 1.05 });
}

const rocketScene = (x) => group([...hyperbola(1), ...hyperbola(-1), ...axes(), ...rocketAt(x)], { pos: [0, -0.12, 0], scale: 0.8 });
export const rocketStart = () => rocketScene(0.8);
export const rocketMid = () => rocketScene(0.45);
export const rocketEnd = () => rocketScene(0.27);

// ------------------------------------------------------------------- 17
export function lightning() {
  const bolt = [
    [0.28, 1.0, 0],
    [-0.12, 0.38, 0],
    [0.22, 0.32, 0],
    [-0.3, -0.35, 0],
    [0.02, -0.3, 0],
    [-0.26, -1.0, 0]
  ];
  return [
    ...polyline(bolt, 0.075, 1, 2.4),
    ...polyline(bolt, 0.14, 0.75, 0.9),
    ...polyline([[-0.12, 0.38, 0], [-0.5, 0.2, 0], [-0.62, -0.05, 0]], 0.04, 0.9, 2.4),
    ...polyline([[0.02, -0.3, 0], [0.42, -0.5, 0], [0.55, -0.82, 0]], 0.04, 0.9, 2.4)
  ];
}

export function acdc() {
  const ac = curve((t) => [-0.95 + 0.7 * t, 0.2 + 0.3 * Math.sin(t * TAU), 0], 60, 0.05, 1, 2.2);
  const dc = [tube([0.25, 0.42, 0], [0.95, 0.42, 0], 0.05, 1, 2.4)];
  for (let k = 0; k < 4; k++) dc.push(tube([0.25 + k * 0.19, 0.12, 0], [0.25 + k * 0.19 + 0.12, 0.12, 0], 0.05, 1, 2.6));
  const label = (text, cx) => {
    const { points } = textPoints(text, { height: 0.46 });
    return place(parts.cloud(points.map(([x, y]) => [x + cx, y - 0.5, 0.02]), 0.8, 1.1), {});
  };
  return [...ac, ...dc, label('AC', -0.6), label('DC', 0.6)];
}

// ------------------------------------------------------------------- 19
// Clarity: a crisp half disc. Confusion: the same shape dissolving upward
// into a fuzzy cloud (reference: "Confusion / Clarity").
export function confusion() {
  const gauss = (rng) => (rng() + rng() + rng() + rng() - 2) / 2;
  const R = 0.62;
  const clarity = {
    weight: 1.1,
    sample: (rng) => {
      const a = Math.PI + rng() * Math.PI;
      const r = Math.sqrt(rng()) * R;
      const thick = 0.12 * Math.sqrt(Math.max(0, 1 - (r / R) ** 2));
      return [Math.cos(a) * r, Math.sin(a) * r * 1.0 - 0.02, (rng() < 0.5 ? -1 : 1) * thick, 0.3];
    }
  };
  const fog = {
    weight: 1.8,
    sample: (rng) => {
      for (;;) {
        const x = gauss(rng) * 0.95;
        const y = Math.abs(gauss(rng)) * 0.95 + 0.02;
        const d = Math.hypot(x / 0.85, y / 0.75);
        if (d < 1.0 && rng() < Math.pow(1 - d, 0.9) + 0.04) return [x, y, gauss(rng) * 0.2, 0.35 + 0.55 * d];
      }
    }
  };
  const label = (text, y) => {
    const { points } = textPoints(text, { height: 0.12 });
    return place(parts.cloud(points.map(([x, py]) => [x, py + y, 0.14]), 1, 0.35), {});
  };
  return [clarity, fog, label('Confusion', 0.34), label('Clarity', -0.3)];
}
