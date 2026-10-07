import { parts, place, tube, capsule, group } from './sampling.js';

// 06 · Initialization — a hand reaches out of the screen to invite you in
// (reference: a hand coming out of an old TV). The TV stays put; only the
// arm and hand appear, so the swarm pushes them out through the glass.

function tv() {
  const list = [
    place(parts.box({ size: [1.5, 1.2, 0.9], tint: 0.2 }), { pos: [0, 0.1, 0] }),
    place(parts.box({ size: [1.0, 0.8, 0.6], tint: 0.12 }), { pos: [0, 0.1, -0.72] }),
    place(parts.cylinder({ radius: 0.38, height: 0.1, tint: 0.2 }), { pos: [0, -0.58, -0.1] }),
    place(parts.sphere(0.035, 1), { pos: [0.55, -0.4, 0.46], boost: 8 }),
    tube([-0.62, 0.62, 0.46], [0.62, 0.62, 0.46], 0.025, 0.45, 2),
    tube([-0.62, -0.42, 0.46], [0.62, -0.42, 0.46], 0.025, 0.45, 2),
    tube([-0.62, -0.42, 0.46], [-0.62, 0.62, 0.46], 0.025, 0.45, 2),
    tube([0.62, -0.42, 0.46], [0.62, 0.62, 0.46], 0.025, 0.45, 2),
    // glowing glass, with the silhouette of a head and shoulders inside
    place(parts.plane({ w: 1.22, h: 1.0, tint: 0.92 }), { pos: [0, 0.1, 0.455], boost: 1.7 }),
    place(parts.sphere(0.14, 0), { pos: [0, 0.22, 0.43], boost: 3.2 }),
    place(parts.ellipsoid({ radii: [0.28, 0.12, 0.04], tint: 0 }), { pos: [0, -0.08, 0.43], boost: 3.2 })
  ];
  return list;
}

export function tvOnly() {
  return group(tv(), { pos: [0, 0, -0.35], scale: 0.78 });
}

export function tvHand() {
  const skin = 0.58;
  // Built at the origin: forearm and palm along +Z, palm facing up (+Y).
  const hand = [
    ...capsule([0, 0, -0.15], [0, 0.0, 0.3], 0.07, skin, 1.4),
    place(parts.box({ size: [0.3, 0.07, 0.3], tint: skin }), { pos: [0, 0, 0.45], boost: 1.8 })
  ];
  [
    [-0.115, 0.32],
    [-0.04, 0.38],
    [0.04, 0.36],
    [0.115, 0.28]
  ].forEach(([x, len], i) => {
    const sx = x * 1.8; // fingers fan out
    const a = [x, 0, 0.6];
    const b = [sx, 0.02, 0.6 + len * 0.62];
    const c = [sx * 1.12, 0.09 + i * 0.004, 0.6 + len];
    hand.push(...capsule(a, b, 0.035, skin, 2));
    hand.push(...capsule(b, c, 0.03, skin, 2));
  });
  hand.push(...capsule([0.15, 0.0, 0.5], [0.3, 0.03, 0.62], 0.04, skin, 2));
  hand.push(...capsule([0.3, 0.03, 0.62], [0.38, 0.07, 0.75], 0.034, skin, 2));
  // The arm leaves the glass at an angle with the palm turned toward the viewer.
  return [
    ...group(tv(), { pos: [-0.2, 0, -0.35], scale: 0.78 }),
    ...group(hand, { pos: [0.1, -0.12, 0.05], rot: [-0.55, -0.45, 0.25], scale: 1.35 })
  ];
}
