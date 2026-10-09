import { sampleParts } from './sampling.js';
import { sampleModel } from './sampleModel.js';
import { sampleBaked } from './sampleBaked.js';
import { sampleGLB } from './sampleGLB.js';
import { drop } from './scenes.js';
import { sampleAnimated } from './sampleAnimated.js';
import { rocketBackdrop, sineFrame, sineWaveParts } from './math.js';
import { imageTint, loadSilhouette, silhouettePart } from './silhouette.js';
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
const CAT_ONLY = /(^|\/)Cat_Lowpoly|LowPoly_Cat_Large/;
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

// Marks parts as MOVING (see core/swarm.js): +2 rides the rigid motion, +4
// slides along x and wraps. Their agents keep chasing the moving target.
const flag = (list, offset) =>
  list.flat(Infinity).map((part) => ({
    weight: part.weight,
    sample: (rng) => {
      const q = part.sample(rng);
      q[3] += offset;
      return q;
    }
  }));

// 15 · the rocket flies along 1/x. The model is built ONCE, nose along +x, and
// the card moves it (rocketPath) — it is never re-formed.
const rocketScene = async ({ N, rng }) => ({
  points: await compose(
    [
      { share: 0.4, build: async (n, r) => sampleParts(rocketBackdrop(), n, r) },
      {
        share: 0.6,
        build: async (n, r) => {
          const pts = await sampleModel(url('rocket.glb'), n, r, { fit: 0.8, rotate: [0, 0, -Math.PI / 2], skip: /PISO/, lo: 0.15 });
          for (let i = 0; i < n; i++) pts[i * 4 + 3] += 2;
          return pts;
        }
      }
    ],
    N,
    rng
  ),
  source: 'modelo:cohete + curva 1/x'
});

// 13 · the sine wave travels along its frame (nothing is re-formed).
const sineScene = (withFrame) => async ({ N, rng }) => ({
  points: sampleParts([...flag(sineWaveParts(), 4), ...(withFrame ? sineFrame() : [])], N, rng),
  source: 'procedural'
});

// 57 · the mouse warrior in a fighting stance. The model is static (no
// skeleton), so the pose is built by leaning the whole body into the fight
// and swinging the spear forward around the hand that holds it.
const warrior = model('mouse_warrior.glb', {
  fit: 2.1,
  lo: 0.12,
  poses: [
    { match: /spear/, rotate: [1.0, 0, -0.18], pivot: [0.75, -0.2, 0.4] },
    { match: /./, rotate: [0.16, 0, 0], pivot: [0, -1.0, 0] }
  ]
});

// 53 · three camels walking in the desert, with the animation the model carries.
const CAMELS = [
  { pos: [-0.8, -0.05, 0.4], scale: 0.92, phase: 0 },
  { pos: [0.05, -0.05, -0.15], scale: 1.0, phase: 0.34 },
  { pos: [0.85, -0.05, 0.5], scale: 0.86, phase: 0.67 }
];
const camelsInDesert = async ({ N, rng }) => {
  const scenery = Math.round(N * 0.22);
  const per = Math.floor((N - scenery) / CAMELS.length);
  const walk = await sampleAnimated(url('camel.glb'), per, rng, { frames: 60, fit: 0.78, rotate: [0, 0, 0], lo: 0.12 });
  const dunes = await silhouettePart(await loadSilhouette('desert'), { fit: 2.8, lo: 0.3, hi: 0.8, pos: [0, 0.35, -0.9], depth: 0.06 });
  const ground = [
    place(parts.triangle([-1.6, -0.5, -1.1], [1.6, -0.5, -1.1], [0.4, 0.75, -1.1], 0.72), { boost: 0.3 }),
    place(parts.box({ size: [2.8, 0.03, 1.6], tint: 0.85 }), { pos: [0, -0.47, 0.1], boost: 0.8 })
  ];
  const total = per * CAMELS.length;
  const points = new Float32Array(N * 4);
  const still = sampleParts([dunes, ...ground], N - total, rng);
  points.set(still, total * 4);
  CAMELS.forEach((camel, c) => {
    for (let n = 0; n < per; n++) points[(c * per + n) * 4 + 3] = walk.tint[n];
  });
  const K = walk.frames.length;
  const fill = (frame, array) => {
    CAMELS.forEach((camel, c) => {
      const src = walk.frames[(frame + Math.round(camel.phase * K)) % K];
      for (let n = 0; n < per; n++) {
        const o = (c * per + n) * 4;
        array[o] = src[n * 3] * walk.scale * camel.scale + camel.pos[0];
        array[o + 1] = src[n * 3 + 1] * walk.scale * camel.scale + camel.pos[1] - 0.05;
        array[o + 2] = src[n * 3 + 2] * walk.scale * camel.scale + camel.pos[2];
      }
    });
  };
  fill(0, points);
  return { points, animation: { fill, fps: K / walk.duration }, source: 'modelo:camello animado ×3' };
};

// 28 · the FDTD bumblebee simulation (tools/bake_bee.py): the heat map of the
// field becomes the swarm's colors, hot parts bright.
const bee = async ({ N, rng }) => ({
  points: await sampleBaked(url('bee.bin'), N, rng, { fit: 2.2, rotate: 0, tintFn: (heat) => 0.06 + 0.94 * (heat / 255) }),
  source: 'modelo:abeja FDTD'
});

// 26 · the screens (supplied model, no colors of its own: a height gradient)
// with fish swimming out of them, as in the reference picture.
const fish = (x, y, z, turn, s = 1) => [
  place(parts.ellipsoid({ radii: [0.11, 0.04, 0.025], tint: 0.8 }), { pos: [x, y, z], rot: [0, 0, turn], scale: s, boost: 2.5 }),
  place(parts.cone({ radius: 0.045, height: 0.09, tint: 0.62 }), {
    pos: [x - Math.cos(turn) * 0.13 * s, y - Math.sin(turn) * 0.13 * s, z],
    rot: [0, 0, turn + Math.PI / 2],
    scale: s,
    boost: 2.5
  })
];
const FISH = [
  [-0.75, 0.75, 0.2, 0.5, 1.15], [0.78, 0.82, 0.1, -0.3, 1.0], [-0.85, 0.15, 0.3, 3.3, 1.0],
  [0.85, 0.3, 0.25, 0.2, 1.1], [-0.6, -0.4, 0.2, 2.7, 0.9], [0.7, -0.35, 0.3, 5.9, 1.0],
  [-0.2, -0.9, 0.15, 4.4, 0.85], [0.35, -0.85, 0.2, 0.9, 0.95]
];
const screens = async ({ N, rng }) => ({
  points: await compose(
    [
      { share: 0.78, build: (n, r) => sampleGLB(url('pantallas.glb'), n, r, { height: 1.75 }), pos: [0, 0, 0] },
      { share: 0.22, build: async (n, r) => sampleParts(FISH.flatMap(([x, y, z, t, k]) => fish(x, y, z, t, k)), n, r) }
    ],
    N,
    rng
  ),
  source: 'modelo:pantallas + peces'
});

// 56 · the heart (textured model) and the blood it lets fall.
const heartModel = (lo = 0.1) => (n, r) => sampleModel(url('heart.glb'), n, r, { fit: 1.2, lo, hi: 1 });
const bloodFigure = (drops, puddle) => async ({ N, rng }) => ({
  points: await compose(
    [
      { share: 0.8, build: heartModel(), pos: [0.05, 0.22, 0] },
      {
        share: 0.2,
        build: async (n, r) => sampleParts([...drops.flatMap(([x, y, k]) => drop(x, y, k)), ...(puddle ? [puddle] : [])], n, r)
      }
    ],
    N,
    rng
  ),
  source: 'modelo:corazón'
});
const heartA = bloodFigure([[0.1, -0.2, 1]]);
const heartB = bloodFigure(
  [[0.1, -0.5, 1.15], [0.26, -0.38, 0.9], [-0.06, -0.6, 0.8]],
  place(parts.disc({ radius: 0.34, tint: 0.5 }), { pos: [0.1, -0.7, 0], scale: [1, 0.18, 1], boost: 1.2 })
);

// 59 · the gavel: no colors in the file, so they come from the reference
// picture, projected onto the model like the cat.
const gavel = async ({ N, rng }) => {
  const sil = await loadSilhouette('gavel');
  return {
    points: await sampleGLB(url('mazo.glb'), N, rng, { height: 1.2, tintFn: imageTint(sil, { lo: 0.12, hi: 1 }) }),
    source: 'modelo:mazo + imagen'
  };
};

// "From AM to PM" · the sun melts into the moon. The sun is a flat decoration
// (one orange material): hot peach in the middle, orange toward the rays. The
// moon is a 50 MB sculpt (a crescent with a face and a star) baked to points
// with tools/bake_points.py.
const sun = async ({ N, rng }) => ({
  points: await sampleGLB(url('sun_decoration.glb'), N, rng, {
    height: 1.9,
    tintFn: (_x, _y, _z, u, v) => {
      const r = Math.min(1, Math.hypot(u - 0.5, v - 0.5) * 2);
      return Math.min(1, 1.0 - 0.38 * r * r + (rng() - 0.5) * 0.06);
    }
  }),
  source: 'modelo:sol'
});
const moon = async ({ N, rng }) => {
  const points = await sampleBaked(url('moon.bin'), N, rng, { fit: 1.9, rotate: 0, tintFn: (_part, _x, _y, _z, hy) => hy });
  // the front of the relief (face, nose, star) catches the light, the back stays violet
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < N; i++) {
    lo = Math.min(lo, points[i * 4 + 2]);
    hi = Math.max(hi, points[i * 4 + 2]);
  }
  for (let i = 0; i < N; i++) {
    const front = (points[i * 4 + 2] - lo) / (hi - lo || 1);
    points[i * 4 + 3] = 0.2 + 0.5 * front * front + 0.12 * points[i * 4 + 3];
  }
  return { points, source: 'modelo:luna (baked)' };
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
  bird,
  rocket_scene: rocketScene,
  sine_wave_moving: sineScene(false),
  sine_scene_moving: sineScene(true),
  warrior_model: warrior,
  camels_desert: camelsInDesert,
  bee_model: bee,
  screens_model: screens,
  heart_model_a: heartA,
  heart_model_b: heartB,
  gavel_model: gavel,
  sun_model: sun,
  moon_model: moon
};
