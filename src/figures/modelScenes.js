import { sampleParts } from './sampling.js';
import { sampleModel } from './sampleModel.js';
import { sampleBaked } from './sampleBaked.js';
import { loadSilhouette, silhouettePart } from './silhouette.js';
import { parts, place } from './sampling.js';

const url = (file) => `${import.meta.env.BASE_URL}models/${file}`;

// Figures built from the 3D models the performer supplied (public/models).
// Each entry is `async ({ N, rng }) => ({ points, source })`.

// Name filters for the two characters inside boy_girl.glb: it holds both in
// the same place, one set of meshes each.
const BOY = /Boy|Dagger|Rapier|Brow\.002|Sclera\.002|Iris\.002|Highlight\.002|Shirt|Pants|Shoes\.002|Coat|Belt|Knot|Clock|Head\.001/;
const GIRL = /Girl|Brow\.003|Sclera\.003|Iris\.003|Highlight\.003|Shoes\.003|Sock|Dress|Hat/;

const model = (file, opts) => async ({ N, rng }) => ({ points: await sampleModel(url(file), N, rng, opts), source: `modelo:${file}` });

// Several models (or parts) in one figure: each gets a share of the agents and
// an offset; `build(n, rng)` returns Float32Array(n * 4) of x, y, z, tint.
async function compose(items, N, rng) {
  const out = new Float32Array(N * 4);
  let used = 0;
  for (let k = 0; k < items.length; k++) {
    const item = items[k];
    const n = k === items.length - 1 ? N - used : Math.round(N * item.share);
    const pts = await item.build(n, rng);
    const [dx, dy, dz] = item.pos ?? [0, 0, 0];
    for (let i = 0; i < n; i++) {
      out[(used + i) * 4] = pts[i * 4] + dx;
      out[(used + i) * 4 + 1] = pts[i * 4 + 1] + dy;
      out[(used + i) * 4 + 2] = pts[i * 4 + 2] + dz;
      out[(used + i) * 4 + 3] = pts[i * 4 + 3];
    }
    used += n;
  }
  return out;
}

// train_cat.glb is a whole sheet of props (lantern, skull, ropes...) spread far
// apart; only the cat itself is kept.
const CAT_ONLY = /^Cat_Lowpoly|LowPoly_Cat_Large/;
const catModel = (opts = {}) => (n, rng) => sampleModel(url('train_cat.glb'), n, rng, { fit: 1.9, only: CAT_ONLY, lo: 0.12, hi: 1, ...opts });
const trainModel = (opts = {}) => (n, rng) => sampleModel(url('tren.glb'), n, rng, { fit: 1.9, lo: 0.2, hi: 1, ...opts });

// 52 · the cat in front, the train rolls past behind it, side to side.
const catAndTrain = (trainX) => async ({ N, rng }) => ({
  points: await compose(
    [
      { share: 0.38, build: catModel({ fit: 1.55 }), pos: [-0.15, -0.2, 0.7] },
      { share: 0.62, build: trainModel({ fit: 2.0 }), pos: [trainX, 0.1, -1.0] }
    ],
    N,
    rng
  ),
  source: 'modelos:gato + tren'
});

const trainAlone = async ({ N, rng }) => {
  const dunes = await silhouettePart(await loadSilhouette('desert'), { fit: 2.4, lo: 0.3, hi: 0.8, pos: [0, -0.1, -0.35], depth: 0.06 });
  const ground = [
    place(parts.triangle([-1.5, -0.55, -0.9], [1.5, -0.55, -0.9], [0.5, 0.6, -0.9], 0.72), { boost: 0.3 }),
    place(parts.box({ size: [3.2, 0.03, 1.7], tint: 0.85 }), { pos: [0, -0.58, -0.1], boost: 0.8 })
  ];
  return {
    points: await compose(
      [
        { share: 0.62, build: trainModel({ fit: 2.0 }), pos: [-0.1, 0.05, 0] },
        { share: 0.38, build: async (n, r) => sampleParts([dunes, ...ground], n, r) }
      ],
      N,
      rng
    ),
    source: 'modelo:tren + desierto'
  };
};

// The bird (tools/bake_points.py turned its 40 MB sculpt into a point cloud).
// Parts: 0 body · 1, 2, 6 mouth bits · 3 beak · 4, 5 eyes.
const bird = async ({ N, rng }) => ({
  points: await sampleBaked(url('birbo.bin'), N, rng, {
    fit: 2.3,
    tintFn: (part, _x, _y, _z, hy) => {
      if (part === 4 || part === 5) return 1; // eyes
      if (part === 3) return 0.78; // beak
      if (part > 0) return 0.9; // mouth details
      return 0.18 + 0.4 * hy; // body: violet at the feet, magenta on top
    }
  }),
  source: 'modelo:birbo (baked)'
});

// 60 · the guillotine. The model is one solid piece, so the blade is found by
// what it is: the bright steel between the posts, in the upper half. Dropping
// it is just moving those points down.
const guillotine = (drop) => async ({ N, rng }) => {
  const points = await sampleModel(url('guillotine.glb'), N, rng, { height: 2.0, lo: 0.15 });
  if (drop) {
    for (let i = 0; i < N; i++) {
      const y = points[i * 4 + 1];
      if (points[i * 4 + 3] > 0.6 && y > 0.12 && y < 0.85) points[i * 4 + 1] = y - drop;
    }
  }
  return { points, source: 'modelo:guillotine.glb' };
};

export const modelScenes = {
  radio_model: model('vintage_radio.glb', { fit: 2.1, lo: 0.15 }),
  boy_model: model('boy_girl.glb', { height: 1.9, only: BOY, lo: 0.12 }),
  girl_model: model('boy_girl.glb', { height: 1.9, only: GIRL, lo: 0.12 }),
  mirror_model: model('broken_mirror.glb', { height: 2.0, lo: 0.15 }),
  mouse_model: model('raton.glb', { fit: 2.0, rotate: [0, Math.PI / 2, 0], lo: 0.15 }),
  elephant_model: model('elephant.glb', { fit: 1.9, rotate: [0, Math.PI / 2, 0], lo: 0.15 }),
  trap_model: model('bear_trap.glb', { fit: 2.0, lo: 0.15 }),
  guillotine_up: guillotine(0),
  guillotine_down: guillotine(0.62),
  cat_train_a: catAndTrain(-0.75),
  cat_train_b: catAndTrain(0.75),
  train_desert: trainAlone,
  bird
};
