import { parts, place, tube, curve, textPoints } from './sampling.js';

// 09 · If I'm a set of point — first the point, then the plane with its
// axes and curve, then the letters (reference: a cubic curve with its
// "point of inflection" marked). Each stage keeps the previous one, so the
// point stays put while the rest appears around it.

const dot = () => [place(parts.sphere(0.07, 1), { boost: 18 })];

function plane() {
  const list = [
    ...dot(),
    // the sheet, with a faint grid
    place(parts.plane({ w: 1.9, h: 1.5, tint: 0.1 }), { pos: [0, 0, -0.03], boost: 0.22 }),
    // red-hot axes of the reference
    tube([-0.95, 0, 0], [0.95, 0, 0], 0.012, 0.62, 4),
    tube([0, -0.75, 0], [0, 0.75, 0], 0.012, 0.62, 4),
    // the halo around the inflection point
    place(parts.disc({ radius: 0.21, tint: 0.88 }), { pos: [0, 0, -0.01], boost: 0.9 }),
    // the cubic itself
    ...curve((t) => {
      const x = -0.74 + 1.48 * t;
      return [x, 1.6 * Math.pow(x, 3) * 1.0, 0];
    }, 60, 0.02, 0.25, 3.2)
  ];
  for (let k = -3; k <= 3; k++) {
    const v = k * 0.25;
    list.push(tube([-0.95, v * 0.8, -0.02], [0.95, v * 0.8, -0.02], 0.004, 0.1, 2));
    list.push(tube([v * 1.25, -0.75, -0.02], [v * 1.25, 0.75, -0.02], 0.004, 0.1, 2));
  }
  return list;
}

export const pointOnly = dot;
export const pointPlane = plane;

export function pointLabel() {
  const { points } = textPoints('POINT OF', { height: 0.09 });
  const second = textPoints('INFLECTION', { height: 0.09 });
  const place2 = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy, 0.01]);
  return [
    ...plane(),
    place(parts.cloud(place2(points, 0.55, -0.42), 0.8, 0.5), {}),
    place(parts.cloud(place2(second.points, 0.55, -0.55), 0.8, 0.6), {}),
    tube([0.28, -0.32, 0], [0.06, -0.06, 0], 0.012, 0.8, 3),
    place(parts.cone({ radius: 0.035, height: 0.09, tint: 0.8 }), { pos: [0.06, -0.06, 0], rot: [0, 0, 2.4], boost: 4 })
  ];
}

