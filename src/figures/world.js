import { parts, place } from './sampling.js';

// 07 · Set up our new world — the planet from the first test, kept as is
// (only recolored by the global palette).
export function planet() {
  const land = (x, y, z) => {
    const n = Math.sin(x * 4 + 1.3) + Math.sin(y * 5 - 0.7) + Math.sin(z * 3.5 + 2.1) + 0.6 * Math.sin((x + z) * 7);
    if (Math.abs(y) > 0.54) return 1; // polar caps share the ring color
    return n > 0.7 ? 0.75 : 0.18;
  };
  return [
    place(parts.sphere(0.62), { tintWorld: land, boost: 1.6 }),
    place(parts.annulus({ rIn: 0.86, rOut: 1.02, tint: 1 }), { rot: [0.45, 0, 0.3], boost: 1.1 }),
    place(parts.annulus({ rIn: 0.78, rOut: 0.83, tint: 0.5 }), { rot: [0.45, 0, 0.3], boost: 1.5 })
  ];
}
