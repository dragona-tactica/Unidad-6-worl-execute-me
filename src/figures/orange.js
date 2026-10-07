import { parts, place, tube, textPoints, TAU } from './sampling.js';

// 11 · If I'm a circle — the circumference "comes out" of an orange, only
// visually (reference: an orange cut open, with its radius, wedges and the
// circumference formula).
//   1 · the orange, a flat cut face with its wedges
//   2 · a ring is DRAWN around its rim, turn by turn, and the radius appears
//   3 · the ring is UNROLLED into a straight line: 2πr
export const ORANGE_CENTER = [0, 0.45];
const CY = ORANGE_CENTER[1];
const R = 0.38;
const RING = R + 0.07;
const WEDGES = 8;

const wedgeTint = (x, y) => {
  const a = (Math.atan2(y - CY, x) + TAU) % TAU;
  return Math.floor((a / TAU) * WEDGES) % 2 ? 0.86 : 0.74;
};

function orange() {
  const list = [
    // peel
    place(parts.torus({ R, r: 0.055, tint: 0.6 }), { pos: [0, CY, 0], boost: 2.4 }),
    // flesh, in alternating wedges
    place(parts.disc({ radius: R - 0.03, tint: 0.8 }), { pos: [0, CY, 0], tintWorld: wedgeTint, boost: 1.7 }),
    // the body of the orange behind the cut
    place(parts.sphere(R, 0.6), { pos: [0, CY, -0.02], boost: 0.5 })
  ].map((part, i) =>
    i < 2
      ? part
      : {
          weight: part.weight / 2,
          sample: (rng) => {
            const q = part.sample(rng);
            q[2] = -Math.abs(q[2] + 0.02) - 0.02;
            return q;
          }
        }
  );
  for (let k = 0; k < WEDGES; k++) {
    const a = (k / WEDGES) * TAU;
    list.push(tube([0, CY, 0.012], [Math.cos(a) * (R - 0.03), CY + Math.sin(a) * (R - 0.03), 0.012], 0.012, 1, 3));
  }
  list.push(place(parts.sphere(0.04, 1), { pos: [0, CY, 0.02], boost: 6 }));
  return list;
}

const ring = () => [place(parts.torus({ R: RING, r: 0.03, tint: 1 }), { pos: [0, CY, 0.02], boost: 3.6 })];

const radius = () => {
  const a = 0.75;
  return [tube([0, CY, 0.03], [Math.cos(a) * RING, CY + Math.sin(a) * RING, 0.03], 0.02, 1, 4)];
};

export const orangeFlat = () => orange();
export const orangeCircle = () => [...orange(), ...ring(), ...radius()];

export function orangeLine() {
  const half = Math.PI * RING; // half of 2πr: the unrolled ring, laid flat
  const y = -0.42;
  const formula = textPoints('C = 2πr', { height: 0.13 });
  return [
    ...orange(),
    ...radius(),
    tube([-half, y, 0], [half, y, 0], 0.026, 1, 3),
    tube([-half, y - 0.08, 0], [-half, y + 0.08, 0], 0.02, 1, 3),
    tube([half, y - 0.08, 0], [half, y + 0.08, 0], 0.02, 1, 3),
    place(parts.cloud(formula.points.map(([x, py]) => [x, py - 0.64, 0.02]), 0.9, 0.7), {})
  ];
}
