// SILHOUETTES — a reference image cut into a mask (tools/make_silhouettes.py)
// becomes a puffed-up 3D shape of particles: the mask is the outline, and the
// distance to the edge rounds it into a thick slab, so it still reads as a
// volume when it turns.

const cache = new Map();

export function loadSilhouette(id) {
  if (!cache.has(id)) {
    cache.set(
      id,
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0);
          resolve(prepare(ctx.getImageData(0, 0, img.width, img.height)));
        };
        img.onerror = () => reject(new Error(`No encuentro la silueta "${id}"`));
        img.src = `${import.meta.env.BASE_URL}silhouettes/${id}.png`;
      })
    );
  }
  return cache.get(id);
}

// Distance (in pixels) from every inside pixel to the nearest edge.
function distanceToEdge(inside, w, h) {
  const d = new Float32Array(w * h);
  const big = 1e6;
  for (let i = 0; i < d.length; i++) d[i] = inside[i] ? big : 0;
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!d[i]) continue;
      d[i] = Math.min(d[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.414, at(x + 1, y - 1) + 1.414);
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (!d[i]) continue;
      d[i] = Math.min(d[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.414, at(x - 1, y + 1) + 1.414);
    }
  }
  return d;
}

// A silhouette drawn on a canvas instead of loaded from an image (puzzle
// pieces, flip-clock tiles...). Everything is white; color it with `tint`
// or `lo`/`hi` in silhouettePart.
export function canvasSilhouette(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff';
  draw(ctx, width, height);
  return prepare(ctx.getImageData(0, 0, width, height));
}

// For every pixel, the index of the closest pixel inside the shape (two-pass
// chamfer sweep). Lets a point that lands just outside the outline borrow the
// color of the nearest inside pixel instead of a flat fallback.
function nearestInside(inside, w, h) {
  const near = new Int32Array(w * h).fill(-1);
  const dist = new Float32Array(w * h).fill(1e9);
  for (let i = 0; i < inside.length; i++) {
    if (inside[i]) {
      near[i] = i;
      dist[i] = 0;
    }
  }
  const relax = (i, x, y, nx, ny, cost) => {
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
    const j = ny * w + nx;
    if (near[j] < 0) return;
    const sx = near[j] % w;
    const sy = (near[j] / w) | 0;
    const d = Math.hypot(sx - x, sy - y);
    if (d < dist[i]) {
      dist[i] = d;
      near[i] = near[j];
    }
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    relax(i, x, y, x - 1, y, 1); relax(i, x, y, x, y - 1, 1); relax(i, x, y, x - 1, y - 1, 1.4); relax(i, x, y, x + 1, y - 1, 1.4);
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x;
    relax(i, x, y, x + 1, y, 1); relax(i, x, y, x, y + 1, 1); relax(i, x, y, x + 1, y + 1, 1.4); relax(i, x, y, x - 1, y + 1, 1.4);
  }
  return near;
}

// Tint function for a 3D model that has no colors of its own: each point takes
// the brightness of the picture pixel at its (u, v) position in the model's
// front view, borrowing from the nearest pixel when it falls outside the outline.
export function imageTint(sil, { lo = 0.12, hi = 1 } = {}) {
  const { w, h, data, lumaLow, lumaHigh } = sil;
  const range = Math.max(1, lumaHigh - lumaLow);
  const near = sil.near;
  return (_x, _y, _z, u, v) => {
    const ix = Math.min(w - 1, Math.max(0, Math.round(u * (w - 1))));
    const iy = Math.min(h - 1, Math.max(0, Math.round(v * (h - 1))));
    let i = iy * w + ix;
    if (data[i * 4 + 3] < 128 && near[i] >= 0) i = near[i];
    const luma = data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114;
    return lo + (hi - lo) * Math.min(1, Math.max(0, (luma - lumaLow) / range));
  };
}

function prepare(image) {
  const { width: w, height: h, data } = image;
  const inside = new Uint8Array(w * h);
  const pixels = [];
  const lumas = [];
  for (let i = 0; i < w * h; i++) {
    if (data[i * 4 + 3] > 127) {
      inside[i] = 1;
      pixels.push(i);
      lumas.push(data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114);
    }
  }
  const sorted = Float32Array.from(lumas).sort();
  const pick = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0;
  return {
    w,
    h,
    data,
    pixels,
    dist: distanceToEdge(inside, w, h),
    near: nearestInside(inside, w, h),
    lumaLow: pick(0.04),
    lumaHigh: pick(0.96)
  };
}

// opts:
//   height  world height of the image (the figure fits ~[-1, 1])
//   depth   half thickness of the slab
//   lo, hi  tint range the brightness is stretched over (0 violet .. 1 peach)
//   invert  dark areas become the bright ones
//   tintFn  (r, g, b, luma) => tint, overrides the brightness mapping
//   pos     [x, y, z] of the image center
//   boost   particle share
//   flat    true for a thin sheet instead of a slab
export function silhouettePart(sil, opts = {}) {
  const { w, h, data, pixels, dist, lumaLow, lumaHigh } = sil;
  // `fit` sets the size of the longest side; `height` sets the height directly.
  const { height = opts.fit ? (opts.fit * h) / Math.max(w, h) : 2, depth = 0.12, lo = 0.3, hi = 1, invert = false, tintFn, pos = [0, 0, 0], boost = 1, flat = false, mirror = false, scale = 1 } = opts;
  const px = (height * scale) / h;
  const width = w * px;
  const range = Math.max(1, lumaHigh - lumaLow);

  return {
    weight: pixels.length * px * px * 2 * boost,
    sample: (rng) => {
      const i = pixels[(rng() * pixels.length) | 0];
      const ix = i % w;
      const iy = (i / w) | 0;
      let x = ((ix + rng()) / w - 0.5) * width;
      if (mirror) x = -x;
      const y = (0.5 - (iy + rng()) / h) * height * scale;
      const edge = dist[i] * px; // world distance to the outline
      const round = depth * Math.sqrt(1 - Math.pow(1 - Math.min(edge / depth, 1), 2));
      const z = flat ? 0 : (rng() < 0.5 ? -round : round);
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      const luma = r * 0.299 + g * 0.587 + b * 0.114;
      let tint;
      if (tintFn) tint = tintFn(r, g, b, luma);
      else {
        let t = Math.min(1, Math.max(0, (luma - lumaLow) / range));
        if (invert) t = 1 - t;
        tint = lo + (hi - lo) * t;
      }
      return [x + pos[0], y + pos[1], z * scale + pos[2], tint];
    }
  };
}
