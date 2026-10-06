import * as THREE from 'three/webgpu';

export const TAU = Math.PI * 2;

// Small deterministic PRNG so a figure always samples the same cloud.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sphereDir = (rng) => {
  const z = rng() * 2 - 1;
  const a = rng() * TAU;
  const r = Math.sqrt(1 - z * z);
  return [r * Math.cos(a), z, r * Math.sin(a)];
};

const tintOf = (tint, q, rng) => (typeof tint === 'function' ? tint(q, rng) : tint);

// A PART is a piece of surface: { weight, sample(rng) -> [x, y, z, tint] }.
// weight ~ surface area, so particles spread evenly over everything in a
// figure; `boost` (see place/tube) thickens thin features like wires.
export const parts = {
  sphere(radius = 1, tint = 0.5) {
    return {
      weight: 4 * Math.PI * radius * radius,
      sample: (rng) => {
        const d = sphereDir(rng);
        const q = [d[0] * radius, d[1] * radius, d[2] * radius];
        return [...q, tintOf(tint, q, rng)];
      }
    };
  },

  ellipsoid({ radii = [1, 1, 1], tint = 0.5 } = {}) {
    const [a, b, c] = radii;
    const p = 1.6075;
    const area = 4 * Math.PI * Math.pow((Math.pow(a * b, p) + Math.pow(a * c, p) + Math.pow(b * c, p)) / 3, 1 / p);
    return {
      weight: area,
      sample: (rng) => {
        const d = sphereDir(rng);
        const q = [d[0] * a, d[1] * b, d[2] * c];
        return [...q, tintOf(tint, q, rng)];
      }
    };
  },

  box({ size = [1, 1, 1], tint = 0.5 } = {}) {
    const [w, h, d] = size;
    const faces = [h * d, h * d, w * d, w * d, w * h, w * h];
    const total = faces.reduce((s, v) => s + v, 0);
    return {
      weight: total, // = 2(wh + hd + wd), the full surface area
      sample: (rng) => {
        let pick = rng() * total;
        let f = 0;
        while (f < 5 && pick > faces[f]) pick -= faces[f++];
        const u = rng() - 0.5;
        const v = rng() - 0.5;
        const s = f % 2 === 0 ? 0.5 : -0.5;
        let q;
        if (f < 2) q = [s * w, u * h, v * d];
        else if (f < 4) q = [u * w, s * h, v * d];
        else q = [u * w, v * h, s * d];
        return [...q, tintOf(tint, q, rng)];
      }
    };
  },

  cylinder({ radius = 1, height = 1, tint = 0.5, caps = true } = {}) {
    const side = TAU * radius * height;
    const cap = caps ? 2 * Math.PI * radius * radius : 0;
    return {
      weight: side + cap,
      sample: (rng) => {
        const a = rng() * TAU;
        let q;
        if (rng() * (side + cap) < side) {
          q = [Math.cos(a) * radius, (rng() - 0.5) * height, Math.sin(a) * radius];
        } else {
          const r = Math.sqrt(rng()) * radius;
          q = [Math.cos(a) * r, rng() < 0.5 ? height / 2 : -height / 2, Math.sin(a) * r];
        }
        return [...q, tintOf(tint, q, rng)];
      }
    };
  },

  cone({ radius = 1, height = 1, tint = 0.5 } = {}) {
    const slant = Math.hypot(radius, height);
    const side = Math.PI * radius * slant;
    const base = Math.PI * radius * radius;
    return {
      weight: side + base,
      sample: (rng) => {
        const a = rng() * TAU;
        let q;
        if (rng() * (side + base) < side) {
          const s = Math.sqrt(rng());
          q = [Math.cos(a) * radius * s, height / 2 - height * s, Math.sin(a) * radius * s];
        } else {
          const r = Math.sqrt(rng()) * radius;
          q = [Math.cos(a) * r, -height / 2, Math.sin(a) * r];
        }
        return [...q, tintOf(tint, q, rng)];
      }
    };
  },

  // Ring in the XY plane (its hole looks along Z).
  torus({ R = 1, r = 0.1, tint = 0.5 } = {}) {
    return {
      weight: 4 * Math.PI * Math.PI * R * r,
      sample: (rng) => {
        let v;
        do {
          v = rng() * TAU;
        } while (rng() * (R + r) > R + r * Math.cos(v));
        const u = rng() * TAU;
        const q = [(R + r * Math.cos(v)) * Math.cos(u), (R + r * Math.cos(v)) * Math.sin(u), r * Math.sin(v)];
        return [...q, tintOf(tint, q, rng)];
      }
    };
  },

  // Rectangle in the XY plane, facing +Z.
  plane({ w = 1, h = 1, tint = 0.5 } = {}) {
    return {
      weight: w * h,
      sample: (rng) => {
        const q = [(rng() - 0.5) * w, (rng() - 0.5) * h, 0];
        return [...q, tintOf(tint, q, rng)];
      }
    };
  },

  // Flat annulus in the XZ plane (planet ring).
  annulus({ rIn = 0.5, rOut = 1, tint = 0.5 } = {}) {
    return {
      weight: Math.PI * (rOut * rOut - rIn * rIn),
      sample: (rng) => {
        const a = rng() * TAU;
        const r = Math.sqrt(rng() * (rOut * rOut - rIn * rIn) + rIn * rIn);
        const q = [Math.cos(a) * r, 0, Math.sin(a) * r];
        return [...q, tintOf(tint, q, rng)];
      }
    };
  },

  triangle(a, b, c, tint = 0.5) {
    const ab = new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
    const ac = new THREE.Vector3(...c).sub(new THREE.Vector3(...a));
    const area = ab.clone().cross(ac).length() / 2;
    return {
      weight: area,
      sample: (rng) => {
        let u = rng();
        let v = rng();
        if (u + v > 1) {
          u = 1 - u;
          v = 1 - v;
        }
        const q = [a[0] + ab.x * u + ac.x * v, a[1] + ab.y * u + ac.y * v, a[2] + ab.z * u + ac.z * v];
        return [...q, tintOf(tint, q, rng)];
      }
    };
  }
};

const _m = new THREE.Matrix4();
const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();

// Moves/rotates/scales a part. `tintWorld(x, y, z)` recolors by final
// position (e.g. a height gradient shared by every column).
export function place(part, { pos = [0, 0, 0], rot = [0, 0, 0], scale = 1, boost = 1, tint, tintWorld } = {}) {
  _e.set(rot[0], rot[1], rot[2]);
  _q.setFromEuler(_e);
  const s = Array.isArray(scale) ? scale : [scale, scale, scale];
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), _q.clone(), new THREE.Vector3(...s));
  return {
    weight: part.weight * s[0] * s[1] * boost,
    sample: (rng) => {
      const [x, y, z, t] = part.sample(rng);
      _v.set(x, y, z).applyMatrix4(m);
      const nt = tintWorld ? tintWorld(_v.x, _v.y, _v.z) : tint !== undefined ? tint : t;
      return [_v.x, _v.y, _v.z, nt];
    }
  };
}

// Cylinder (open tube) running from point a to point b.
export function tube(a, b, radius, tint = 0.5, boost = 1) {
  const av = new THREE.Vector3(...a);
  const bv = new THREE.Vector3(...b);
  const dir = bv.clone().sub(av);
  const length = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  const mid = av.clone().add(bv).multiplyScalar(0.5);
  const e = new THREE.Euler().setFromQuaternion(q);
  return place(parts.cylinder({ radius, height: length, tint, caps: false }), {
    pos: [mid.x, mid.y, mid.z],
    rot: [e.x, e.y, e.z],
    boost
  });
}

// Chain of tubes through a list of points.
export function polyline(points, radius, tint = 0.5, boost = 1) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) out.push(tube(points[i], points[i + 1], radius, tint, boost));
  return out;
}

export function sampleParts(list, N, rng) {
  const cumulative = new Float64Array(list.length);
  let total = 0;
  list.forEach((p, i) => {
    total += p.weight;
    cumulative[i] = total;
  });

  const out = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    const pick = rng() * total;
    let lo = 0;
    let hi = list.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumulative[mid] < pick) lo = mid + 1;
      else hi = mid;
    }
    const [x, y, z, t] = list[lo].sample(rng);
    out[i * 4] = x;
    out[i * 4 + 1] = y;
    out[i * 4 + 2] = z;
    out[i * 4 + 3] = t;
  }
  return out;
}
