// Loads a point cloud baked by tools/bake_points.py and turns it into a figure
// cloud: N points picked at random from the baked ones , scaled so the widest side is `fit`.
//   tintFn(part, x, y, z, hy)  -> tint 0..1, hy is the 0..1 height of the point
export async function sampleBaked(url, N, rng, { fit = 2, rotate = 0, tintFn } = {}) {
  const buffer = await (await fetch(url)).arrayBuffer();
  const view = new DataView(buffer);
  const count = view.getUint32(0, true);
  const half = view.getFloat32(4, true);
  const pos = new Int16Array(buffer, 8, count * 3);
  const parts = new Uint8Array(buffer, 8 + count * 6, count);
  const scale = fit / 2;
  const out = new Float32Array(N * 4);
  const cos = Math.cos(rotate);
  const sin = Math.sin(rotate);
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < N; i++) {
    const src = (rng() * count) | 0;
    const x = (pos[src * 3] / 32767) * scale;
    const y = (pos[src * 3 + 1] / 32767) * scale;
    const z = (pos[src * 3 + 2] / 32767) * scale;
    out[i * 4] = x * cos + z * sin;
    out[i * 4 + 1] = y;
    out[i * 4 + 2] = -x * sin + z * cos;
    out[i * 4 + 3] = parts[src];
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  for (let i = 0; i < N; i++) {
    const part = out[i * 4 + 3];
    const hy = (out[i * 4 + 1] - minY) / (maxY - minY || 1);
    out[i * 4 + 3] = tintFn ? tintFn(part, out[i * 4], out[i * 4 + 1], out[i * 4 + 2], hy) : hy;
  }
  return out;
}
