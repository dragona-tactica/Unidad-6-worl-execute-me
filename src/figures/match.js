// MATCHING — which agent goes where when a figure turns into the next one.
//
// Two figures are independent random samples, so pairing point k of one with
// point k of the other would send every agent across the screen to a random
// spot (a mess, not a transformation). Instead both clouds are sorted along
// a Morton (Z-order) curve and paired by rank: each agent goes to a nearby
// point of the next figure, shared geometry stays where it is, and the swarm
// flows as one body.
const RANGE = 1.9; // figures live inside [-RANGE, RANGE]
const BITS = 10;

const spread = (v) => {
  v &= 0x3ff;
  v = (v | (v << 16)) & 0x030000ff;
  v = (v | (v << 8)) & 0x0300f00f;
  v = (v | (v << 4)) & 0x030c30c3;
  v = (v | (v << 2)) & 0x09249249;
  return v;
};

const order = (points, count) => {
  const levels = 1 << BITS;
  const keys = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    const q = (v) => Math.min(levels - 1, Math.max(0, Math.floor(((v + RANGE) / (2 * RANGE)) * levels)));
    const code = spread(q(points[i * 4])) | (spread(q(points[i * 4 + 1])) << 1) | (spread(q(points[i * 4 + 2])) << 2);
    keys[i] = code * 262144 + i; // rank by code, remember the index in the low bits
  }
  keys.sort();
  const out = new Uint32Array(count);
  for (let k = 0; k < count; k++) out[k] = keys[k] % 262144;
  return out;
};

// Returns `next` rearranged so that point k sits near point k of `prev`.
export function matchOrder(prev, next) {
  const count = prev.length / 4;
  const fromPrev = order(prev, count);
  const fromNext = order(next, count);
  const out = new Float32Array(next.length);
  for (let k = 0; k < count; k++) {
    const dst = fromPrev[k] * 4;
    const src = fromNext[k] * 4;
    out[dst] = next[src];
    out[dst + 1] = next[src + 1];
    out[dst + 2] = next[src + 2];
    out[dst + 3] = next[src + 3];
  }
  return out;
}
