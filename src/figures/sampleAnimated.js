import * as THREE from 'three/webgpu';
import { loadModel } from './loadModel.js';

// Samples a SKINNED, ANIMATED model once and records where every sampled point
// is in each frame of its animation: the swarm then chases a target cloud that
// walks, instead of a frozen pose.
//
//   N          points per copy
//   frames     how many animation frames to record (the loop is split evenly)
//   fit/height scale of one copy (the first frame's pose fixes the scale)
//   rotate     turns the model before centering (see sampleModel)
//
// -> { frames: Int16Array[], scale, tint: Float32Array, N, fps }
//    positions are int16 (x, y, z per point) times `scale`, to keep many
//    frames in memory.
export async function sampleAnimated(url, N, rng, { frames = 48, fit = 2, rotate = [0, 0, 0], lo = 0.15, hi = 1, clip = 0 } = {}) {
  const gltfRoot = await loadModel(url, { keepAnimations: true });
  const root = gltfRoot.scene;
  const clipObj = gltfRoot.animations[clip];
  if (!clipObj) throw new Error(`El modelo ${url} no trae animación`);

  const meshes = [];
  root.traverse((node) => node.isMesh && meshes.push(node));
  const skinned = meshes.filter((m) => m.isSkinnedMesh);
  if (!skinned.length) throw new Error(`El modelo ${url} no está animado por huesos`);

  // pick triangles by area across all meshes, once
  const picks = [];
  let total = 0;
  const cumulative = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (const mesh of meshes) {
    const pos = mesh.geometry.attributes.position;
    const index = mesh.geometry.index;
    const count = (index ? index.count : pos.count) / 3;
    for (let t = 0; t < count; t++) {
      const i0 = index ? index.getX(t * 3) : t * 3;
      const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1;
      const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;
      a.fromBufferAttribute(pos, i0);
      b.fromBufferAttribute(pos, i1).sub(a);
      c.fromBufferAttribute(pos, i2).sub(a);
      total += b.cross(c).length() / 2;
      cumulative.push(total);
      picks.push([mesh, i0, i1, i2]);
    }
  }

  const sample = [];
  const tint = new Float32Array(N);
  const lumas = new Float32Array(N);
  for (let n = 0; n < N; n++) {
    const target = rng() * total;
    let l = 0;
    let h = cumulative.length - 1;
    while (l < h) {
      const m = (l + h) >> 1;
      if (cumulative[m] < target) l = m + 1;
      else h = m;
    }
    let r1 = rng();
    let r2 = rng();
    if (r1 + r2 > 1) {
      r1 = 1 - r1;
      r2 = 1 - r2;
    }
    sample.push({ tri: picks[l], r1, r2 });
  }

  // color: material color x texture at the point's uv (brightness only)
  const textureCache = new Map();
  const texel = (mesh, ia, ib, ic, r1, r2) => {
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    let lum = (mat.color ? mat.color.r * 0.3 + mat.color.g * 0.59 + mat.color.b * 0.11 : 1) * 255;
    const uv = mesh.geometry.attributes.uv;
    if (mat.map?.image && uv) {
      if (!textureCache.has(mat.map)) {
        const cv = document.createElement('canvas');
        cv.width = mat.map.image.width;
        cv.height = mat.map.image.height;
        const ctx = cv.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(mat.map.image, 0, 0);
        textureCache.set(mat.map, { d: ctx.getImageData(0, 0, cv.width, cv.height).data, w: cv.width, h: cv.height, flip: mat.map.flipY });
      }
      const tx = textureCache.get(mat.map);
      const w0 = 1 - r1 - r2;
      let u = uv.getX(ia) * w0 + uv.getX(ib) * r1 + uv.getX(ic) * r2;
      let v = uv.getY(ia) * w0 + uv.getY(ib) * r1 + uv.getY(ic) * r2;
      u -= Math.floor(u);
      v -= Math.floor(v);
      if (tx.flip) v = 1 - v;
      const px = Math.min(tx.w - 1, Math.floor(u * tx.w));
      const py = Math.min(tx.h - 1, Math.floor(v * tx.h));
      const k = (py * tx.w + px) * 4;
      lum *= (tx.d[k] * 0.299 + tx.d[k + 1] * 0.587 + tx.d[k + 2] * 0.114) / 255;
    }
    return lum;
  };
  sample.forEach((s, n) => {
    const [mesh, i0, i1, i2] = s.tri;
    lumas[n] = texel(mesh, i0, i1, i2, s.r1, s.r2);
  });
  const sorted = Float32Array.from(lumas).sort();
  const low = sorted[Math.floor(N * 0.04)];
  const high = sorted[Math.floor(N * 0.96)];
  for (let n = 0; n < N; n++) tint[n] = lo + (hi - lo) * Math.min(1, Math.max(0, (lumas[n] - low) / Math.max(1e-3, high - low)));

  // pose the skeleton at each frame and read the skinned points
  const mixer = new THREE.AnimationMixer(root);
  mixer.clipAction(clipObj).play();
  const euler = new THREE.Euler(...rotate);
  const out = [];
  const va = new THREE.Vector3();
  const vb = new THREE.Vector3();
  const vc = new THREE.Vector3();
  const p = new THREE.Vector3();
  const raw = [];
  for (let f = 0; f < frames; f++) {
    mixer.setTime((f / frames) * clipObj.duration);
    root.updateMatrixWorld(true);
    skinned.forEach((m) => m.skeleton.update());
    const cache = new Map(); // skinned vertex positions, computed once per frame
    const vertex = (mesh, i, target) => {
      const key = `${mesh.id}:${i}`;
      if (!cache.has(key)) {
        if (mesh.isSkinnedMesh) mesh.getVertexPosition(i, target);
        else target.fromBufferAttribute(mesh.geometry.attributes.position, i);
        target.applyMatrix4(mesh.matrixWorld).applyEuler(euler);
        cache.set(key, target.clone());
      }
      return target.copy(cache.get(key));
    };
    const frame = new Float32Array(N * 3);
    for (let n = 0; n < N; n++) {
      const { tri, r1, r2 } = sample[n];
      const [mesh, i0, i1, i2] = tri;
      vertex(mesh, i0, va);
      vertex(mesh, i1, vb);
      vertex(mesh, i2, vc);
      p.set(0, 0, 0).addScaledVector(va, 1 - r1 - r2).addScaledVector(vb, r1).addScaledVector(vc, r2);
      frame[n * 3] = p.x;
      frame[n * 3 + 1] = p.y;
      frame[n * 3 + 2] = p.z;
    }
    raw.push(frame);
  }

  // one scale and one center for the WHOLE loop, feet on the floor, so the
  // animal does not jump when the loop restarts
  const lo3 = [Infinity, Infinity, Infinity];
  const hi3 = [-Infinity, -Infinity, -Infinity];
  for (const frame of raw) {
    for (let n = 0; n < N; n++) {
      for (let k = 0; k < 3; k++) {
        lo3[k] = Math.min(lo3[k], frame[n * 3 + k]);
        hi3[k] = Math.max(hi3[k], frame[n * 3 + k]);
      }
    }
  }
  const size = hi3.map((v, k) => v - lo3[k]);
  const scale = fit / Math.max(...size, 1e-6);
  const cx = (lo3[0] + hi3[0]) / 2;
  const cz = (lo3[2] + hi3[2]) / 2;
  const half = 4; // int16 range covers +-half world units of one copy
  for (const frame of raw) {
    const q = new Int16Array(N * 3);
    for (let n = 0; n < N; n++) {
      q[n * 3] = Math.round((((frame[n * 3] - cx) * scale) / half) * 32767);
      q[n * 3 + 1] = Math.round((((frame[n * 3 + 1] - lo3[1]) * scale - (size[1] * scale) / 2) / half) * 32767);
      q[n * 3 + 2] = Math.round((((frame[n * 3 + 2] - cz) * scale) / half) * 32767);
    }
    out.push(q);
  }
  return { frames: out, scale: half / 32767, tint, N, duration: clipObj.duration, height: size[1] * scale };
}
