import { parts, place, tube, curve, textPoints, TAU } from './sampling.js';

// 11 · If I'm a circle — taking the circumference out of an orange, only
// visually (reference: an orange cut open with radius, angle and
// circumference annotations). Whole orange -> cut open with its wedges ->
// the rim pulled out as a ring, with the radius and the formula.

const R = 0.78;
const WEDGES = 10;

const shell = () => [
  place(parts.sphere(R, (q) => 0.74 + 0.05 * Math.sin(q[0] * 19) * Math.sin(q[1] * 17) * Math.sin(q[2] * 21)), { boost: 1.7 }),
  place(parts.cylinder({ radius: 0.025, height: 0.1, tint: 0.2 }), { pos: [0, R + 0.03, 0], boost: 3 }),
  place(parts.ellipsoid({ radii: [0.17, 0.008, 0.075], tint: 0.25 }), { pos: [0.15, R + 0.07, 0], rot: [0, 0, 0.35], boost: 3 })
];

const wedgeTint = (x, y) => {
  const a = (Math.atan2(y, x) + TAU) % TAU;
  return Math.floor((a / TAU) * WEDGES) % 2 ? 0.8 : 0.7;
};

function cutOrange(ringZ, extras = []) {
  const list = [
    // back half of the orange, so it keeps its volume
    place(parts.sphere(R, 0.62), {
      tintWorld: () => 0.6,
      boost: 0.9
    }),
    // the cut face with its wedges and the separating membranes
    place(parts.disc({ radius: R * 0.96, tint: 0.7 }), { tintWorld: wedgeTint, pos: [0, 0, 0.002], boost: 1.9 }),
    place(parts.sphere(0.05, 1), { pos: [0, 0, 0.01], boost: 6 }),
    place(parts.torus({ R: R, r: 0.04, tint: 0.55 }), { pos: [0, 0, ringZ], boost: ringZ ? 2.4 : 1.6 })
  ];
  for (let k = 0; k < WEDGES; k++) {
    const a = (k / WEDGES) * TAU;
    list.push(tube([0, 0, 0.012], [Math.cos(a) * R * 0.95, Math.sin(a) * R * 0.95, 0.012], 0.007, 1, 3));
  }
  return [...list, ...extras];
}

// The back half sphere would hide the cut face, so keep only z <= 0.
const backHalf = (list) =>
  list.map((part, i) =>
    i === 0
      ? {
          weight: part.weight / 2,
          sample: (rng) => {
            const q = part.sample(rng);
            q[2] = -Math.abs(q[2]);
            return q;
          }
        }
      : part
  );

export const orangeWhole = () => shell();
export const orangeCut = () => backHalf(cutOrange(0));

export function orangeRing() {
  const formula = textPoints('C = 2πr', { height: 0.1 });
  const a = 0.9;
  return backHalf(
    cutOrange(0.5, [
      // radius + angle marks of the reference
      tube([0, 0, 0.02], [Math.cos(a) * R, Math.sin(a) * R, 0.02], 0.014, 1, 4),
      ...curve((t) => [Math.cos(a * t) * 0.3, Math.sin(a * t) * 0.3, 0.02], 16, 0.01, 1, 4),
      place(parts.cloud(formula.points.map(([x, y]) => [x + 0.15, y - 1.0, 0.02]), 1, 0.9), {})
    ])
  );
}
