import { parts, place, tube, polyline, curve, group } from './sampling.js';

// 02 · Remember to put on protection — lab goggles that turn into a rosary
// (a necklace with a cross).

export function goggles() {
  const R = 0.62;
  const edge = (y) =>
    curve((t) => {
      const a = -1.05 + 2.1 * t;
      return [Math.sin(a) * R, y, Math.cos(a) * R];
    }, 30, 0.022, 0.75, 2.6);
  const temple = (s) =>
    polyline(
      [
        [0.54 * s, 0.12, 0.31],
        [0.8 * s, 0.12, -0.22],
        [0.78 * s, 0.1, -0.52],
        [0.66 * s, -0.04, -0.66]
      ],
      0.035,
      1,
      2.4
    );
  return [
    place(parts.arc({ radius: R, height: 0.44, a0: -1.05, a1: 1.05, tint: 0.25 }), { boost: 1.1 }),
    ...edge(0.22),
    ...edge(-0.22),
    ...[-1, 1].map((s) => tube([0.54 * s, 0.22, 0.31], [0.54 * s, -0.22, 0.31], 0.024, 0.75, 2.4)).flat(),
    // nose bridge notch
    place(parts.torus({ R: 0.11, r: 0.02, tint: 0.75 }), { pos: [0, -0.2, R - 0.01], boost: 3 }),
    ...temple(1),
    ...temple(-1)
  ];
}

export function rosary() {
  const N = 27;
  const at = (t) => [0.88 * t, 0.62 - 1.05 * (1 - t * t), 0];
  const list = [];
  let prev = null;
  for (let k = 0; k < N; k++) {
    const t = -0.96 + (1.92 * k) / (N - 1);
    const p = at(t);
    const big = k % 5 === 2;
    list.push(place(parts.sphere(big ? 0.072 : 0.05, big ? 0.75 : 0.5), { pos: p, boost: 2.4 }));
    if (prev) list.push(tube(prev, p, 0.013, 0.25, 3));
    prev = p;
  }
  // pendant: junction piece, three beads, then the cross
  const base = at(0);
  list.push(place(parts.cone({ radius: 0.07, height: 0.12, tint: 1 }), { pos: [0, base[1] - 0.1, 0], rot: [Math.PI, 0, 0], boost: 3 }));
  [0.2, 0.3, 0.4].forEach((d) =>
    list.push(place(parts.sphere(0.045, 0.5), { pos: [0, base[1] - d, 0], boost: 2.6 }))
  );
  const cy = base[1] - 0.78;
  const cross = [
    place(parts.box({ size: [0.1, 0.62, 0.07], tint: 1 }), { pos: [0, cy, 0], boost: 1.4 }),
    place(parts.box({ size: [0.38, 0.1, 0.07], tint: 1 }), { pos: [0, cy + 0.1, 0], boost: 1.4 }),
    place(parts.torus({ R: 0.065, r: 0.014, tint: 0.75 }), { pos: [0, cy + 0.1, 0.04], boost: 4 })
  ];
  // flared tips
  [[0, 0.31], [0, -0.31]].forEach(([x, y]) =>
    cross.push(place(parts.box({ size: [0.17, 0.05, 0.06], tint: 1 }), { pos: [x, cy + y, 0], boost: 1.6 }))
  );
  [[0.19, 0.1], [-0.19, 0.1]].forEach(([x, y]) =>
    cross.push(place(parts.box({ size: [0.05, 0.17, 0.06], tint: 1 }), { pos: [x, cy + y, 0], boost: 1.6 }))
  );
  // the whole necklace is scaled to fit the frame, pendant included
  // the cross is drawn a third larger than the beads, as in the reference
  return [...group(list, { pos: [0, 0.34, 0], scale: 0.74 }), ...group(cross, { pos: [0, 0.34 + (cy * 0.74 - cy * 0.74 * 1.3), 0], scale: 0.74 * 1.3 })];
}

