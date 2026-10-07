import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Turns any GLB into a particle target cloud: triangles are sampled in
// proportion to their area (so detail isn't biased toward dense meshes),
// the cloud is centered and fitted to radius 1, and the tint ramps from
// the model's feet (0) to its top (1).
// opts.height  scale so the model is this tall (instead of fitting radius 1)
// opts.tintFn   (x, y, z, u, v) => tint, with u, v the 0..1 position inside the
//               model's front view (v grows downward, like an image)
export async function sampleGLB(url, N, rng, { rotate = [0, 0, 0], height, tintFn } = {}) {
  const gltf = await new GLTFLoader().loadAsync(url);
  gltf.scene.updateMatrixWorld(true);

  const tris = [];
  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  gltf.scene.traverse((node) => {
    if (!node.isMesh) return;
    const pos = node.geometry.attributes.position;
    const index = node.geometry.index;
    const triCount = (index ? index.count : pos.count) / 3;
    for (let t = 0; t < triCount; t++) {
      for (let k = 0; k < 3; k++) {
        const i = index ? index.getX(t * 3 + k) : t * 3 + k;
        v[k].fromBufferAttribute(pos, i).applyMatrix4(node.matrixWorld);
      }
      tris.push(v[0].x, v[0].y, v[0].z, v[1].x, v[1].y, v[1].z, v[2].x, v[2].y, v[2].z);
    }
  });

  const triCount = tris.length / 9;
  if (!triCount) throw new Error(`GLB sin mallas: ${url}`);

  const cumulative = new Float64Array(triCount);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  let total = 0;
  for (let t = 0; t < triCount; t++) {
    const o = t * 9;
    a.set(tris[o + 3] - tris[o], tris[o + 4] - tris[o + 1], tris[o + 5] - tris[o + 2]);
    b.set(tris[o + 6] - tris[o], tris[o + 7] - tris[o + 1], tris[o + 8] - tris[o + 2]);
    total += a.cross(b).length() / 2;
    cumulative[t] = total;
  }

  const euler = new THREE.Euler(...rotate);
  const out = new Float32Array(N * 4);
  const p = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    const pick = rng() * total;
    let lo = 0;
    let hi = triCount - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumulative[mid] < pick) lo = mid + 1;
      else hi = mid;
    }
    const o = lo * 9;
    let r1 = rng();
    let r2 = rng();
    if (r1 + r2 > 1) {
      r1 = 1 - r1;
      r2 = 1 - r2;
    }
    p.set(
      tris[o] + (tris[o + 3] - tris[o]) * r1 + (tris[o + 6] - tris[o]) * r2,
      tris[o + 1] + (tris[o + 4] - tris[o + 1]) * r1 + (tris[o + 7] - tris[o + 1]) * r2,
      tris[o + 2] + (tris[o + 5] - tris[o + 2]) * r1 + (tris[o + 8] - tris[o + 2]) * r2
    ).applyEuler(euler);
    out[i * 4] = p.x;
    out[i * 4 + 1] = p.y;
    out[i * 4 + 2] = p.z;
  }

  // Center, fit to radius 1, and tint by height.
  let minY = Infinity;
  let maxY = -Infinity;
  const c = [0, 0, 0];
  const lo3 = [Infinity, Infinity, Infinity];
  const hi3 = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < 3; k++) {
      lo3[k] = Math.min(lo3[k], out[i * 4 + k]);
      hi3[k] = Math.max(hi3[k], out[i * 4 + k]);
    }
  }
  for (let k = 0; k < 3; k++) c[k] = (lo3[k] + hi3[k]) / 2;
  let radius = 0;
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < 3; k++) out[i * 4 + k] -= c[k];
    radius = Math.max(radius, Math.hypot(out[i * 4], out[i * 4 + 1], out[i * 4 + 2]));
    minY = Math.min(minY, out[i * 4 + 1]);
    maxY = Math.max(maxY, out[i * 4 + 1]);
  }
  const scale = height ? height / (hi3[1] - lo3[1] || 1) : 1 / (radius || 1);
  const width = hi3[0] - lo3[0] || 1;
  const tall = hi3[1] - lo3[1] || 1;
  for (let i = 0; i < N; i++) {
    const rx = out[i * 4];
    const ry = out[i * 4 + 1];
    for (let k = 0; k < 3; k++) out[i * 4 + k] *= scale;
    out[i * 4 + 3] = tintFn
      ? tintFn(out[i * 4], out[i * 4 + 1], out[i * 4 + 2], (rx + width / 2) / width, 0.5 - ry / tall)
      : (ry - (minY - 0)) / (maxY - minY || 1);
  }
  return out;
}
