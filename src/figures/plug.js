import { parts, place, tube, polyline, curve } from './sampling.js';

// 01 · Switch on the power line — a cable plugging in (reference: two
// wavy cables whose plug halves slide together and spark).
// Tints follow the global palette ramp: 0 deep violet · .25 violet ·
// .5 magenta · .75 orange · 1 peach.

// Wavy cable from a fixed far end into the back of a plug body.
function cable(farX, bodyX) {
  const dir = Math.sign(bodyX - farX);
  return curve(
    (s) => {
      const settle = 1 - s * s; // full waves at the far end, straight into the plug
      return [farX + (bodyX - farX) * s, 0.36 * Math.sin(s * Math.PI * 2.6) * settle * dir, 0.1 * Math.sin(s * Math.PI * 2.2)];
    },
    60,
    0.042,
    0.25,
    2.4
  );
}

function male(cx) {
  return [
    place(parts.box({ size: [0.34, 0.42, 0.34], tint: 0.75 }), { pos: [cx - 0.12, 0, 0] }),
    place(parts.box({ size: [0.09, 0.6, 0.42], tint: 1 }), { pos: [cx + 0.1, 0, 0], boost: 1.2 }),
    ...[-0.1, 0.1].map((y) =>
      place(parts.cylinder({ radius: 0.04, height: 0.24 }), { pos: [cx + 0.26, y, 0], rot: [0, 0, Math.PI / 2], tint: 1, boost: 3 })
    ),
    tube([cx - 0.28, 0, 0], [cx - 0.22, 0, 0], 0.035, 0.25, 2)
  ];
}

function female(cx) {
  return [
    place(parts.box({ size: [0.34, 0.42, 0.34], tint: 0.5 }), { pos: [cx + 0.12, 0, 0] }),
    place(parts.box({ size: [0.09, 0.6, 0.42], tint: 1 }), { pos: [cx - 0.1, 0, 0], boost: 1.2 }),
    ...[-0.1, 0.1].map((y) => place(parts.sphere(0.03, 0), { pos: [cx - 0.145, y, 0], boost: 6 })),
    tube([cx + 0.25, 0, 0], [cx + 0.3, 0, 0], 0.035, 0.25, 2)
  ];
}

export function plugApart() {
  return [...male(-0.62), ...female(0.62), ...cable(-1.7, -0.9), ...cable(1.7, 0.92)];
}

export function plugJoined() {
  const list = [...male(-0.2), ...female(0.2), ...cable(-1.7, -0.5), ...cable(1.7, 0.52)];
  // Sparks at the junction: zigzag arcs + loose embers.
  const zig = (ang, len) => {
    const pts = [];
    for (let i = 0; i <= 5; i++) {
      const r = 0.12 + (len * i) / 5;
      const wob = (i % 2 ? 1 : -1) * 0.05;
      pts.push([Math.sin(ang) * wob, Math.cos(ang) * r + 0, Math.sin(ang) * r * 0.2 + wob * 0.5]);
    }
    return pts;
  };
  [0, 0.6, -0.6, Math.PI, Math.PI + 0.6, Math.PI - 0.6].forEach((a) => {
    const pts = zig(a, 0.38);
    list.push(...polyline(pts.map(([x, y, z]) => [x, y * Math.sign(Math.cos(a) || 1), z]), 0.014, 1, 4));
  });
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    const r = 0.3 + 0.18 * ((k * 7) % 5) / 4;
    list.push(place(parts.sphere(0.022, k % 2 ? 1 : 0.75), { pos: [Math.cos(a) * 0.12, Math.sin(a) * r, Math.cos(a * 2) * 0.18], boost: 9 }));
  }
  return list;
}
