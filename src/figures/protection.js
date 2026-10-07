import { place, tube, polyline } from './sampling.js';

// 02 · Remember to put on protection — lab goggles, drawn as ONE solid piece
// (reference: wrap-around safety glasses). The silhouette matters more than
// the detail, so the visor, its side shields and the temples share one color
// and read as a single object.
export function goggles() {
  // One thick shell wrapping around the face, narrowing toward the ears,
  // with a notch for the nose.
  const visor = {
    weight: 2.1,
    sample: (rng) => {
      for (;;) {
        const a = (rng() * 2 - 1) * 1.5;
        const toward = Math.max(0, Math.abs(a) - 1.0) / 0.5;
        const half = 0.24 - 0.08 * toward;
        const y = (rng() * 2 - 1) * half;
        if (Math.abs(a) < 0.2 && y < -0.08) continue;
        const r = 0.58 + rng() * 0.08;
        return [Math.sin(a) * r, y, Math.cos(a) * r, 0.55 + y * 0.3];
      }
    }
  };
  const temple = (s) =>
    polyline(
      [
        [0.62 * s, 0.08, 0.04],
        [0.76 * s, 0.08, -0.3],
        [0.7 * s, 0.04, -0.62]
      ],
      0.055,
      0.55,
      3.2
    );
  return [place(visor, {}), ...temple(1), ...temple(-1), tube([-0.2, 0.2, 0.6], [0.2, 0.2, 0.6], 0.03, 0.55, 3)];
}
