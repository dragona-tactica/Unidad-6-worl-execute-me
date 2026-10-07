import { mulberry32, sampleParts, parts, tube } from './sampling.js';
import { sampleGLB } from './sampleGLB.js';
import { plugApart, plugJoined } from './plug.js';
import { goggles } from './protection.js';
import { sandwichExploded, sandwichJoined } from './sandwich.js';
import { human, skeleton, galaxy } from './body.js';
import { guideLines, butterfliesA, butterfliesB } from './butterflies.js';
import { tvHand } from './tvhand.js';
import { planet } from './world.js';
import { fieldFlat, wormhole } from './field.js';
import { pointOnly, pointPlane, pointLabel } from './point.js';
import { orangeSlice } from './orange.js';
import { silhouetteFigures } from './silhouettes.js';
import { squidDeep, squidLit, vrHead, puzzleApart, puzzleDone, guillotineUp, guillotineDown, chladniStage, countStage } from './scenes.js';
import { sineOnly, sineGrid, rocketStart, rocketMid, rocketEnd, lightning, acdc, confusion } from './math.js';

// FIGURE REGISTRY
// A figure is a cloud of N points (x, y, z, tint). `tint` (0..1) is looked
// up in the global palette ramp (violet -> magenta -> orange -> peach), so
// every figure shares the colors of the reference palette image.
//
// HOW TO REPLACE A FIGURE WITH YOUR OWN 3D MODEL
//   1. Drop a .glb into public/models/
//   2. Add it to public/models/manifest.json:
//        { "figures": { "planet": { "file": "mi-planeta.glb", "rotate": [0, 0, 0] } } }
//   The GLB wins over the procedural version; delete the entry to go back.
//   GLB figures are centered, fitted to radius 1 and tinted bottom -> top.
const FIGURES = {
  plug_apart: plugApart,
  plug_joined: plugJoined,
  goggles,
  sandwich_exploded: sandwichExploded,
  sandwich_joined: sandwichJoined,
  human,
  skeleton,
  galaxy,
  guide_lines: guideLines,
  butterflies_a: butterfliesA,
  butterflies_b: butterfliesB,
  tv_hand: tvHand,
  planet,
  field_flat: fieldFlat,
  wormhole,
  point: pointOnly,
  point_plane: pointPlane,
  point_label: pointLabel,
  orange_slice: orangeSlice,
  sine: sineOnly,
  sine_grid: sineGrid,
  rocket_start: rocketStart,
  rocket_mid: rocketMid,
  rocket_end: rocketEnd,
  lightning,
  acdc,
  confusion,
  squid_deep: squidDeep,
  squid_lit: squidLit,
  vr_head: vrHead,
  puzzle_apart: puzzleApart,
  puzzle_done: puzzleDone,
  guillotine_up: guillotineUp,
  guillotine_down: guillotineDown,
  ...Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((k) => [`chladni_${k}`, () => chladniStage(k)])),
  ...Object.fromEntries([1, 2, 3, 4, 5, 6].map((k) => [`count_${k}`, () => countStage(k)])),
  ...silhouetteFigures
};

export const FIGURE_IDS = Object.keys(FIGURES);

// Wireframe cube shown when a figure id has neither a builder nor a model,
// so a missing model is obvious on screen instead of silently empty.
const placeholder = () => {
  const list = [];
  const c = [-0.7, 0.7];
  for (const a of c) {
    for (const b of c) {
      list.push(tube([-0.7, a, b], [0.7, a, b], 0.02, 1, 3));
      list.push(tube([a, -0.7, b], [a, 0.7, b], 0.02, 1, 3));
      list.push(tube([a, b, -0.7], [a, b, 0.7], 0.02, 1, 3));
    }
  }
  list.push(parts.sphere(0.2, 0.5));
  return list;
};

let manifestPromise = null;
const loadManifest = () => {
  manifestPromise ??= fetch(`${import.meta.env.BASE_URL}models/manifest.json`)
    .then((r) => (r.ok ? r.json() : { figures: {} }))
    .catch(() => ({ figures: {} }));
  return manifestPromise;
};

const cache = new Map();

// -> { points: Float32Array(N * 4), source }
export function loadFigure(id, N) {
  const key = `${id}:${N}`;
  if (!cache.has(key)) cache.set(key, build(id, N));
  return cache.get(key);
}

async function build(id, N) {
  const make = FIGURES[id];
  const manifest = await loadManifest();
  const override = manifest.figures?.[id];
  const rng = mulberry32(hashString(id));

  if (override) {
    try {
      const url = `${import.meta.env.BASE_URL}models/${override.file}`;
      return { points: await sampleGLB(url, N, rng, { rotate: override.rotate }), source: `glb:${override.file}` };
    } catch (error) {
      console.warn(`[figuras] No pude cargar el GLB de "${id}", uso la versión procedural.`, error);
    }
  }

  if (make) return { points: sampleParts(await make(), N, rng), source: 'procedural' };

  console.warn(`[figuras] "${id}" no existe: muestro el cubo marcador.`);
  return { points: sampleParts(placeholder(), N, rng), source: 'placeholder' };
}

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
