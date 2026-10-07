import { parts, place, tube, textPoints, TAU } from './sampling.js';

// 11 · If I'm a circle — a slice of orange with its triangle drawn on it in
// dots, and the circumference equation beside it (reference: an orange cut
// open, with the radius, the 60° wedge and the formula). No animation: it is
// just the slice, the dotted triangle and the equation.
const CX = -0.42; // the slice sits to the left, the equation to the right
const CY = 0.12;
const R = 0.5;
const WEDGES = 8;

const wedgeTint = (x, y) => {
  const a = (Math.atan2(y - CY, x - CX) + TAU) % TAU;
  return Math.floor((a / TAU) * WEDGES) % 2 ? 0.86 : 0.74;
};

// A line made of separate dots instead of a continuous stroke.
const dotted = (a, b, step = 0.062) => {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const count = Math.max(2, Math.round(length / step));
  const dots = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    dots.push(place(parts.sphere(0.021, 1), { pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 0.04], boost: 11 }));
  }
  return dots;
};

export function orangeSlice() {
  const slice = [
    // peel
    place(parts.torus({ R, r: 0.06, tint: 0.6 }), { pos: [CX, CY, 0], boost: 2.4 }),
    // flesh, in alternating wedges
    place(parts.disc({ radius: R - 0.035, tint: 0.8 }), { pos: [CX, CY, 0], tintWorld: wedgeTint, boost: 1.8 })
  ];
  // the thin membranes between the wedges
  for (let k = 0; k < WEDGES; k++) {
    const a = (k / WEDGES) * TAU;
    slice.push(tube([CX, CY, 0.012], [CX + Math.cos(a) * (R - 0.035), CY + Math.sin(a) * (R - 0.035), 0.012], 0.012, 0.95, 3));
  }

  // The triangle: the center and two points of the rim, 60° apart.
  const inner = R - 0.02;
  const a0 = -0.1;
  const a1 = a0 + Math.PI / 3;
  const center = [CX, CY];
  const p0 = [CX + Math.cos(a0) * inner, CY + Math.sin(a0) * inner];
  const p1 = [CX + Math.cos(a1) * inner, CY + Math.sin(a1) * inner];
  const triangle = [...dotted(center, p0), ...dotted(center, p1), ...dotted(p0, p1)];

  // The equation, as particles.
  const equation = textPoints('C = 2πr', { height: 0.2 });
  const text = place(
    parts.cloud(equation.points.map(([x, y]) => [x + 0.82, y + 0.12, 0.02]), 0.9, 1.1),
    {}
  );

  return [...slice, ...triangle, text];
}
