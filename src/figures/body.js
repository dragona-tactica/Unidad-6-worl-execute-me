import { parts, place, tube, capsule, group, TAU } from './sampling.js';

// 04 · And let's begin object creation — a body that becomes a skeleton and
// then dissolves into a galaxy (reference: the silhouette -> skeleton ->
// spiral sequence). The body lies along X, head toward -X.

const HEAD_X = -0.86;

export function human() {
  const side = [-1, 1];
  const list = [
    place(parts.sphere(0.125, 0.4), { pos: [HEAD_X, 0.02, 0], boost: 1.4 }),
    ...capsule([-0.75, 0.01, 0], [-0.66, 0, 0], 0.05, 0.4),
    place(parts.ellipsoid({ radii: [0.34, 0.12, 0.2], tint: 0.45 }), { pos: [-0.42, 0, 0], boost: 1.3 }),
    place(parts.ellipsoid({ radii: [0.17, 0.1, 0.16], tint: 0.4 }), { pos: [-0.03, -0.01, 0], boost: 1.3 })
  ];
  side.forEach((s) => {
    list.push(...capsule([-0.58, 0.02, 0.2 * s], [-0.3, -0.05, 0.31 * s], 0.052, 0.45, 1.2));
    list.push(...capsule([-0.3, -0.05, 0.31 * s], [0.04, -0.08, 0.36 * s], 0.042, 0.45, 1.2));
    list.push(place(parts.box({ size: [0.11, 0.025, 0.08], tint: 0.5 }), { pos: [0.1, -0.08, 0.37 * s], boost: 1.5 }));
    list.push(...capsule([0.04, -0.03, 0.09 * s], [0.5, -0.07, 0.1 * s], 0.078, 0.4, 1.2));
    list.push(...capsule([0.5, -0.07, 0.1 * s], [0.88, -0.1, 0.11 * s], 0.055, 0.4, 1.2));
    list.push(place(parts.box({ size: [0.14, 0.04, 0.09], tint: 0.5 }), { pos: [0.94, -0.12, 0.11 * s], boost: 1.5 }));
  });
  return list;
}

export function skeleton() {
  const bone = 0.95;
  const list = [
    place(parts.sphere(0.115, bone), { pos: [HEAD_X, 0.02, 0], boost: 1.3 }),
    place(parts.ellipsoid({ radii: [0.06, 0.04, 0.08], tint: bone }), { pos: [HEAD_X + 0.12, -0.05, 0], boost: 1.6 }),
    place(parts.sphere(0.022, 0), { pos: [HEAD_X - 0.02, 0.05, 0.05], boost: 8 }),
    place(parts.sphere(0.022, 0), { pos: [HEAD_X - 0.02, 0.05, -0.05], boost: 8 })
  ];
  // spine
  for (let x = -0.74; x <= 0.0; x += 0.062) list.push(place(parts.sphere(0.03, bone), { pos: [x, 0, 0], boost: 2.2 }));
  list.push(tube([-0.74, 0, 0], [0, 0, 0], 0.012, bone, 3));
  // rib cage: rings around the spine, narrowing toward the pelvis
  for (let k = 0; k < 6; k++) {
    const x = -0.64 + k * 0.075;
    const R = 0.21 - k * 0.012;
    list.push(place(parts.torus({ R, r: 0.009, tint: bone }), { pos: [x, 0, 0], rot: [0, Math.PI / 2, 0], scale: [1, 0.66, 1], boost: 2.4 }));
  }
  list.push(tube([-0.66, 0.1, 0], [-0.3, 0.1, 0], 0.016, bone, 3));
  // pelvis
  list.push(place(parts.torus({ R: 0.12, r: 0.02, tint: bone }), { pos: [-0.01, 0, 0], rot: [0, Math.PI / 2, 0], scale: [1, 0.8, 1], boost: 2.6 }));
  [-1, 1].forEach((s) => {
    list.push(place(parts.ellipsoid({ radii: [0.09, 0.03, 0.1], tint: bone }), { pos: [-0.05, 0, 0.12 * s], boost: 2 }));
    // arms
    list.push(...capsule([-0.58, 0.02, 0.2 * s], [-0.3, -0.05, 0.31 * s], 0.022, bone, 3));
    list.push(...capsule([-0.3, -0.05, 0.31 * s], [0.04, -0.08, 0.36 * s], 0.017, bone, 3));
    for (let f = -2; f <= 2; f++) list.push(tube([0.05, -0.08, 0.36 * s + f * 0.014], [0.14, -0.09, 0.36 * s + f * 0.022], 0.006, bone, 4));
    // legs
    list.push(...capsule([0.04, -0.03, 0.09 * s], [0.5, -0.07, 0.1 * s], 0.027, bone, 3));
    list.push(...capsule([0.5, -0.07, 0.1 * s], [0.88, -0.1, 0.11 * s], 0.021, bone, 3));
    list.push(place(parts.sphere(0.03, bone), { pos: [0.5, -0.07, 0.1 * s], boost: 2 }));
    list.push(place(parts.box({ size: [0.12, 0.02, 0.06], tint: bone }), { pos: [0.94, -0.12, 0.11 * s], boost: 2 }));
  });
  return list;
}

// Spiral galaxy: dense bulge + three arms, thin disc, tilted like the
// reference. Distances are measured in the disc plane before tilting.
export function galaxy() {
  const gauss = (rng) => (rng() + rng() + rng() + rng() - 2) / 2;
  const bulge = {
    weight: 0.55,
    sample: (rng) => {
      const r = Math.abs(gauss(rng)) * 0.34;
      const a = rng() * TAU;
      return [Math.cos(a) * r, gauss(rng) * 0.05, Math.sin(a) * r * 0.85, 0.92];
    }
  };
  const arms = {
    weight: 2.6,
    sample: (rng) => {
      const arm = Math.floor(rng() * 3);
      const u = Math.pow(rng(), 0.7);
      const theta = u * 4.2 * Math.PI;
      const r = 0.1 + 0.92 * u;
      const a = theta + (arm * TAU) / 3 + gauss(rng) * 0.22;
      const rr = r + gauss(rng) * 0.05;
      return [Math.cos(a) * rr, gauss(rng) * 0.03 * (1 - u * 0.6), Math.sin(a) * rr * 0.85, 0.85 - 0.65 * u];
    }
  };
  return group([bulge, arms], { rot: [0.5, 0, 0.35] });
}
