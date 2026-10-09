import * as THREE from 'three/webgpu';
import { loadModel } from './loadModel.js';

// Turns any model (.glb/.fbx) into a target cloud WITH its own colors:
//   · triangles are sampled in proportion to their area,
//   · each point's color = material color × texture(uv) × vertex color,
//   · the color's brightness is stretched over the palette ramp (tint 0..1).
//
// opts:
//   fit        longest side of the result (default 2); or `height` for the Y size
//   rotate     [x, y, z] Euler turn applied before centering, to face the viewer
//   lo, hi     tint range the brightness is stretched over
//   invert     dark becomes bright
//   tintFn     (r, g, b, luma, x, y, z) => tint, overrides the brightness mapping
//   flat       ignore every color and tint by height instead (untextured models)
//   only, skip RegExps tested against each mesh's name to keep / drop parts
//   offsets    [{ match: RegExp, by: [x, y, z] }] moves matching meshes (raw model
//              units, before centering) — e.g. to drop a guillotine blade
//   normalize  false keeps the raw size/position (used when composing models)
const toLinear = new Float32Array(256).map((_, i) => {
  const c = i / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
});
const toSRGB = (c) => 255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

const textures = new Map();
function textureData(texture) {
  if (!textures.has(texture)) {
    const image = texture.image;
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    textures.set(texture, { data: ctx.getImageData(0, 0, canvas.width, canvas.height).data, w: canvas.width, h: canvas.height, flipY: texture.flipY });
  }
  return textures.get(texture);
}

function collect(root, { only, skip, offsets = [] } = {}) {
  const tris = []; // { mesh data per triangle chunk }
  root.traverse((node) => {
    if (!node.isMesh) return;
    if (only && !only.test(node.name)) return;
    if (skip && skip.test(node.name)) return;
    const shift = offsets.filter((o) => o.match.test(node.name)).reduce((acc, o) => [acc[0] + o.by[0], acc[1] + o.by[1], acc[2] + o.by[2]], [0, 0, 0]);
    const geometry = node.geometry;
    const pos = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    const col = geometry.attributes.color;
    const index = geometry.index;
    const mats = Array.isArray(node.material) ? node.material : [node.material];
    const groups = geometry.groups.length ? geometry.groups : [{ start: 0, count: index ? index.count : pos.count, materialIndex: 0 }];
    for (const g of groups) {
      const mat = mats[g.materialIndex] ?? mats[0];
      const tex = mat.map?.image ? textureData(mat.map) : null;
      const base = mat.color ? mat.color.clone() : new THREE.Color(1, 1, 1);
      const count = Math.min(g.count, (index ? index.count : pos.count) - g.start) / 3;
      const chunk = { n: count, p: new Float32Array(count * 9), uv: uv && tex ? new Float32Array(count * 6) : null, c: col ? new Float32Array(count * 9) : null, tex, base: [base.r, base.g, base.b], vcAlpha: col?.itemSize };
      const v = new THREE.Vector3();
      for (let t = 0; t < count; t++) {
        for (let k = 0; k < 3; k++) {
          const i = index ? index.getX(g.start + t * 3 + k) : g.start + t * 3 + k;
          v.fromBufferAttribute(pos, i).applyMatrix4(node.matrixWorld);
          chunk.p[t * 9 + k * 3] = v.x + shift[0];
          chunk.p[t * 9 + k * 3 + 1] = v.y + shift[1];
          chunk.p[t * 9 + k * 3 + 2] = v.z + shift[2];
          if (chunk.uv) {
            chunk.uv[t * 6 + k * 2] = uv.getX(i);
            chunk.uv[t * 6 + k * 2 + 1] = uv.getY(i);
          }
          if (chunk.c) {
            chunk.c[t * 9 + k * 3] = col.getX(i);
            chunk.c[t * 9 + k * 3 + 1] = col.getY(i);
            chunk.c[t * 9 + k * 3 + 2] = col.getZ(i);
          }
        }
      }
      tris.push(chunk);
    }
  });
  return tris;
}

export async function sampleModel(url, N, rng, opts = {}) {
  const { fit = 2, height, rotate = [0, 0, 0], lo = 0.18, hi = 1, invert = false, tintFn, flat = false } = opts;
  const root = await loadModel(url);
  const chunks = collect(root, opts);
  if (!chunks.length) throw new Error(`Modelo sin mallas: ${url}`);

  // area-weighted triangle picking across all chunks
  const areas = [];
  const owner = [];
  let total = 0;
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  chunks.forEach((chunk, ci) => {
    for (let t = 0; t < chunk.n; t++) {
      const o = t * 9;
      ab.set(chunk.p[o + 3] - chunk.p[o], chunk.p[o + 4] - chunk.p[o + 1], chunk.p[o + 5] - chunk.p[o + 2]);
      ac.set(chunk.p[o + 6] - chunk.p[o], chunk.p[o + 7] - chunk.p[o + 1], chunk.p[o + 8] - chunk.p[o + 2]);
      total += ab.cross(ac).length() / 2;
      areas.push(total);
      owner.push(ci, t);
    }
  });

  const euler = new THREE.Euler(...rotate);
  const out = new Float32Array(N * 4);
  const rgb = new Float32Array(N * 3);
  const p = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    const pick = rng() * total;
    let lo2 = 0;
    let hi2 = areas.length - 1;
    while (lo2 < hi2) {
      const mid = (lo2 + hi2) >> 1;
      if (areas[mid] < pick) lo2 = mid + 1;
      else hi2 = mid;
    }
    const chunk = chunks[owner[lo2 * 2]];
    const t = owner[lo2 * 2 + 1];
    let r1 = rng();
    let r2 = rng();
    if (r1 + r2 > 1) {
      r1 = 1 - r1;
      r2 = 1 - r2;
    }
    const w0 = 1 - r1 - r2;
    const o = t * 9;
    p.set(
      chunk.p[o] * w0 + chunk.p[o + 3] * r1 + chunk.p[o + 6] * r2,
      chunk.p[o + 1] * w0 + chunk.p[o + 4] * r1 + chunk.p[o + 7] * r2,
      chunk.p[o + 2] * w0 + chunk.p[o + 5] * r1 + chunk.p[o + 8] * r2
    ).applyEuler(euler);
    out[i * 4] = p.x;
    out[i * 4 + 1] = p.y;
    out[i * 4 + 2] = p.z;

    let r = chunk.base[0];
    let g = chunk.base[1];
    let b = chunk.base[2];
    if (chunk.c) {
      const q = t * 9;
      r *= chunk.c[q] * w0 + chunk.c[q + 3] * r1 + chunk.c[q + 6] * r2;
      g *= chunk.c[q + 1] * w0 + chunk.c[q + 4] * r1 + chunk.c[q + 7] * r2;
      b *= chunk.c[q + 2] * w0 + chunk.c[q + 5] * r1 + chunk.c[q + 8] * r2;
    }
    if (chunk.uv) {
      const q = t * 6;
      const u = chunk.uv[q] * w0 + chunk.uv[q + 2] * r1 + chunk.uv[q + 4] * r2;
      let v = chunk.uv[q + 1] * w0 + chunk.uv[q + 3] * r1 + chunk.uv[q + 5] * r2;
      const tex = chunk.tex;
      const fu = u - Math.floor(u);
      let fv = v - Math.floor(v);
      if (tex.flipY) fv = 1 - fv;
      const px = Math.min(tex.w - 1, Math.floor(fu * tex.w));
      const py = Math.min(tex.h - 1, Math.floor(fv * tex.h));
      const k = (py * tex.w + px) * 4;
      r *= toLinear[tex.data[k]];
      g *= toLinear[tex.data[k + 1]];
      b *= toLinear[tex.data[k + 2]];
    }
    rgb[i * 3] = toSRGB(Math.min(1, r));
    rgb[i * 3 + 1] = toSRGB(Math.min(1, g));
    rgb[i * 3 + 2] = toSRGB(Math.min(1, b));
  }

  // center, then scale to `height` or to a longest side of `fit`
  const lo3 = [Infinity, Infinity, Infinity];
  const hi3 = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < 3; k++) {
      lo3[k] = Math.min(lo3[k], out[i * 4 + k]);
      hi3[k] = Math.max(hi3[k], out[i * 4 + k]);
    }
  }
  const size = hi3.map((h2, k) => h2 - lo3[k]);
  const scale = height ? height / (size[1] || 1) : fit / Math.max(...size, 1e-6);
  const luma = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < 3; k++) out[i * 4 + k] = (out[i * 4 + k] - (lo3[k] + hi3[k]) / 2) * scale;
    luma[i] = rgb[i * 3] * 0.299 + rgb[i * 3 + 1] * 0.587 + rgb[i * 3 + 2] * 0.114;
  }

  // brightness -> tint, stretched between the 4th and 96th percentile
  const sorted = Float32Array.from(luma).sort();
  const low = sorted[Math.floor(N * 0.04)];
  const high = sorted[Math.floor(N * 0.96)];
  const range = Math.max(1, high - low);
  for (let i = 0; i < N; i++) {
    let tint;
    if (flat) tint = (out[i * 4 + 1] / (size[1] * scale || 1)) + 0.5;
    else if (tintFn) tint = tintFn(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2], luma[i], out[i * 4], out[i * 4 + 1], out[i * 4 + 2]);
    else {
      let t = Math.min(1, Math.max(0, (luma[i] - low) / range));
      if (invert) t = 1 - t;
      tint = lo + (hi - lo) * t;
    }
    out[i * 4 + 3] = Math.min(1, Math.max(0, tint));
  }
  textures.clear(); // big textures would otherwise stay in memory
  return out;
}
