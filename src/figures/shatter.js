import { mulberry32 } from './sampling.js';

// SHATTER — breaks any part into shards, like a cracked mirror. Space is cut
// into cells around random seeds; each cell is a shard that drifts outward and
// tilts a little, and a thin gap is left along every crack between cells.
export function shatter(part, { seeds = 26, bounds = [-0.8, -1.1, 0.8, 1.1], spread = 0.22, crack = 0.022, seed = 5 } = {}) {
  const random = mulberry32(seed);
  const cx = (bounds[0] + bounds[2]) / 2;
  const cy = (bounds[1] + bounds[3]) / 2;
  const shards = Array.from({ length: seeds }, () => {
    const x = bounds[0] + random() * (bounds[2] - bounds[0]);
    const y = bounds[1] + random() * (bounds[3] - bounds[1]);
    const dx = x - cx;
    const dy = y - cy;
    const len = Math.hypot(dx, dy) || 1;
    const push = spread * (0.3 + random() * 0.9);
    return { x, y, ox: (dx / len) * push, oy: (dy / len) * push, oz: (random() - 0.5) * spread * 1.6, rz: (random() - 0.5) * 0.55, ry: (random() - 0.5) * 1.0 };
  });

  return {
    weight: part.weight,
    sample: (rng) => {
      for (let tries = 0; ; tries++) {
        const q = part.sample(rng);
        let best = 1e9;
        let second = 1e9;
        let k = 0;
        for (let i = 0; i < shards.length; i++) {
          const d = Math.hypot(q[0] - shards[i].x, q[1] - shards[i].y);
          if (d < best) {
            second = best;
            best = d;
            k = i;
          } else if (d < second) second = d;
        }
        if (second - best < crack && tries < 8) continue; // leave the crack empty
        const s = shards[k];
        let x = q[0] - s.x;
        let y = q[1] - s.y;
        let z = q[2];
        const cz = Math.cos(s.rz);
        const sz = Math.sin(s.rz);
        [x, y] = [x * cz - y * sz, x * sz + y * cz];
        const cyw = Math.cos(s.ry);
        const syw = Math.sin(s.ry);
        [x, z] = [x * cyw + z * syw, -x * syw + z * cyw];
        return [x + s.x + s.ox, y + s.y + s.oy, z + s.oz, q[3]];
      }
    }
  };
}
