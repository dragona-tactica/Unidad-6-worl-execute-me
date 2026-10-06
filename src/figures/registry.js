import { mulberry32, sampleParts, parts, tube } from './sampling.js';
import { sampleGLB } from './sampleGLB.js';
import * as F from './procedural.js';

// FIGURE REGISTRY
// A figure is a cloud of N points (x, y, z, tint) plus three ramp colors
// (tint 0 -> colors[0], 0.5 -> colors[1], 1 -> colors[2]).
//
// HOW TO REPLACE A FIGURE WITH YOUR OWN 3D MODEL
//   1. Drop a .glb into public/models/
//   2. Add it to public/models/manifest.json:
//        { "figures": { "planet": { "file": "mi-planeta.glb", "rotate": [0, 0, 0] } } }
//      (optional: "colors": ["#hex", "#hex", "#hex"] to recolor it)
//   The GLB wins over the procedural version; delete the entry to go back.
//   GLB figures are centered and fitted to radius 1 automatically.
const FIGURES = {
  // 1 · Enciende el interruptor / enchufa un cable
  plug: { colors: ['#4a1600', '#ff7a1a', '#ffe9a0'], build: F.plug },
  // 2 · Gafas de laboratorio y una cruz
  goggles_cross: { colors: ['#1d3f52', '#86dcec', '#ff2d3d'], build: F.gogglesCross },
  // 3 · Columnas de partículas que cargan
  columns_base: { colors: ['#2a0a5e', '#7a2cff', '#ff8a1f'], build: F.columnsBase },
  columns: { colors: ['#2a0a5e', '#7a2cff', '#ff8a1f'], build: F.columnsFull },
  // 4 · Algo se materializa
  box_wire: { colors: ['#06323b', '#22c9d9', '#eaffff'], build: F.boxWire },
  box_solid: { colors: ['#06323b', '#22c9d9', '#eaffff'], build: F.boxSolid },
  // 5 · Parámetros ajustándose, como al editar una foto
  sliders_a: { colors: ['#3a1060', '#c23bd1', '#ffd27a'], build: F.slidersA },
  sliders_b: { colors: ['#3a1060', '#c23bd1', '#ffd27a'], build: F.slidersB },
  // 6 · Se crea un planeta
  planet: { colors: ['#10306e', '#4fbf6a', '#f2d79b'], build: F.planet },
  // 7 · La pantalla comienza la simulación
  monitor_off: { colors: ['#262a33', '#6e7585', '#2a3a33'], build: F.monitorOff },
  monitor_on: { colors: ['#262a33', '#f1f4ff', '#7dffc2'], build: F.monitorOn },
  // 8 · Un punto y sus dimensiones
  point: { colors: ['#ffd08a', '#ff5a3c', '#5ad7ff'], build: F.pointDot },
  point_axes: { colors: ['#ffd08a', '#ff5a3c', '#5ad7ff'], build: F.pointAxes },
  // 9 · Un anillo y su circunferencia
  ring: { colors: ['#ff9a3c', '#ff4fa3', '#8a5cff'], build: F.ringPlain },
  ring_ticks: { colors: ['#ff9a3c', '#ff4fa3', '#8a5cff'], build: F.ringTicks },
  // 10 · Una onda seno y sus tangentes
  sine: { colors: ['#20ff9c', '#18b8ff', '#ff4f9a'], build: F.sinePlain },
  sine_tangents: { colors: ['#20ff9c', '#18b8ff', '#ff4f9a'], build: F.sineTangents }
};

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

// -> { points: Float32Array(N * 4), colors: [hex, hex, hex], source }
export function loadFigure(id, N) {
  const key = `${id}:${N}`;
  if (!cache.has(key)) cache.set(key, build(id, N));
  return cache.get(key);
}

async function build(id, N) {
  const def = FIGURES[id];
  const manifest = await loadManifest();
  const override = manifest.figures?.[id];
  const rng = mulberry32(hashString(id));
  const colors = override?.colors ?? def?.colors ?? ['#222222', '#aaaaaa', '#ffffff'];

  if (override) {
    try {
      const url = `${import.meta.env.BASE_URL}models/${override.file}`;
      const points = await sampleGLB(url, N, rng, { rotate: override.rotate });
      return { points, colors, source: `glb:${override.file}` };
    } catch (error) {
      console.warn(`[figuras] No pude cargar el GLB de "${id}", uso la versión procedural.`, error);
    }
  }

  if (def?.build) return { points: sampleParts(def.build(), N, rng), colors, source: 'procedural' };

  console.warn(`[figuras] "${id}" no existe: muestro el cubo marcador.`);
  return { points: sampleParts(placeholder(), N, rng), colors, source: 'placeholder' };
}

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
