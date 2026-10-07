import { parts, place, tube, curve, group, TAU } from './sampling.js';

// 05 · Fill in my data parameters — construction lines first, then the
// butterflies travel along them (reference: monarchs over a geometric
// spiral drawing). Two butterfly figures with the swarm advanced along the
// spiral, so retargeting makes them fly from one stop to the next.

const R = 0.72;
const TURNS = 2.4;
const Y0 = -0.82;
const Y1 = 0.82;
const spiral = (s) => {
  const a = s * TURNS * TAU;
  return [Math.cos(a) * R, Y0 + (Y1 - Y0) * s, Math.sin(a) * R];
};

export function guideLines() {
  const list = [];
  // rings of the cylindrical frame
  for (let k = 0; k <= 6; k++) {
    const y = Y0 + (k * (Y1 - Y0)) / 6;
    list.push(place(parts.torus({ R, r: 0.012, tint: 0.25 }), { pos: [0, y, 0], rot: [Math.PI / 2, 0, 0], boost: 3.2 }));
  }
  // verticals
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * TAU;
    list.push(tube([Math.cos(a) * R, Y0 - 0.08, Math.sin(a) * R], [Math.cos(a) * R, Y1 + 0.08, Math.sin(a) * R], 0.011, 0.25, 3));
  }
  // construction diagonals
  [
    [[-0.7, -0.8, 0.2], [0.7, 0.75, -0.25]],
    [[0.6, -0.8, 0.4], [-0.65, 0.8, -0.3]],
    [[-0.3, -0.85, -0.7], [0.35, 0.85, 0.65]]
  ].forEach(([a, b]) => list.push(tube(a, b, 0.011, 0.5, 3)));
  // the path the butterflies will follow
  list.push(...curve(spiral, 120, 0.02, 0.75, 3));
  return list;
}

function butterfly(wingLift) {
  const wing = (side, front) => {
    const scale = front ? 1 : 0.78;
    return place(
      parts.ellipsoid({
        radii: [0.095 * scale, 0.004, 0.07 * scale],
        tint: (q) => (Math.pow(q[0] / (0.095 * scale), 2) + Math.pow(q[2] / (0.07 * scale), 2) > 0.72 ? 0.02 : 0.78)
      }),
      { pos: [side * 0.095 * scale, 0, front ? -0.02 : 0.07], rot: [0, 0, side * wingLift], boost: 2.2 }
    );
  };
  return [
    wing(-1, true),
    wing(1, true),
    wing(-1, false),
    wing(1, false),
    place(parts.ellipsoid({ radii: [0.014, 0.014, 0.085], tint: 0.02 }), { boost: 4 })
  ];
}

function swarm(offset, wingLift) {
  const list = [];
  const N = 10;
  for (let k = 0; k < N; k++) {
    const s = (k + 0.5 + offset) / (N + 0.5);
    if (s > 1) continue;
    const [x, y, z] = spiral(s);
    const heading = Math.atan2(-Math.sin(s * TURNS * TAU), Math.cos(s * TURNS * TAU));
    list.push(...group(butterfly(wingLift), { pos: [x, y + 0.04, z], rot: [0, -heading + Math.PI / 2, 0], scale: 1.6 }));
  }
  list.push(...curve(spiral, 120, 0.01, 0.25, 2));
  return list;
}

export const butterfliesA = () => swarm(0, 0.5);
export const butterfliesB = () => swarm(0.55, -0.15);
