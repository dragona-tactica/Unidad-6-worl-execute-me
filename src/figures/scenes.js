import { parts, place, tube, group, textPoints, TAU } from './sampling.js';
import { canvasSilhouette, loadSilhouette, silhouettePart } from './silhouette.js';

// Procedural scenes for the middle of the song. Tints: 0 deep violet ·
// .25 violet · .5 magenta · .75 orange · 1 peach.

// ------------------------------------------------ 24 · submarine and squid
export function submarine(x, y, s = 1) {
  return group(
    [
      place(parts.ellipsoid({ radii: [0.3, 0.085, 0.085], tint: 0.85 }), { boost: 1.8 }),
      place(parts.box({ size: [0.11, 0.09, 0.07], tint: 0.55 }), { pos: [0.03, 0.1, 0], boost: 1.5 }),
      tube([0.03, 0.14, 0], [0.03, 0.22, 0], 0.014, 0.55, 3),
      tube([0.03, 0.22, 0], [0.09, 0.22, 0], 0.014, 0.55, 3),
      place(parts.box({ size: [0.07, 0.14, 0.025], tint: 0.55 }), { pos: [-0.29, 0.05, 0], boost: 2 }),
      place(parts.torus({ R: 0.055, r: 0.011, tint: 0.9 }), { pos: [-0.33, 0, 0], rot: [0, Math.PI / 2, 0], boost: 3 }),
      ...[-0.15, -0.05, 0.05, 0.15].map((px) => place(parts.sphere(0.017, 1), { pos: [px, 0.012, 0.085], boost: 9 }))
    ],
    { pos: [x, y, 0.12], scale: s }
  );
}

// A cone of light from (x0, y0) widening toward (x1, y1).
export function beam(x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  return {
    weight: 0.7,
    sample: (rng) => {
      const t = rng();
      const r = (0.02 + 0.3 * t) * Math.sqrt(rng());
      const a = rng() * TAU;
      return [x0 + dx * t + (-dy / len) * r * Math.cos(a), y0 + dy * t + (dx / len) * r * Math.cos(a), r * Math.sin(a), 1];
    }
  };
}

const squidTint = (r, g, b, l) => (l > 190 ? 1 : r > g + 25 && r > b + 20 ? 0.68 : 0.3 + (l / 255) * 0.6);
const squid = async () => silhouettePart(await loadSilhouette('squid'), { fit: 1.85, pos: [0.4, 0, 0], tintFn: squidTint });

export const squidDeep = async () => [await squid(), ...submarine(-0.72, 0.7)];
export async function squidLit() {
  return [await squid(), ...submarine(-0.72, 0.0), beam(-0.42, 0.0, 0.5, 0.1)];
}

// ------------------------------------------------------ 28 · VR headset
export function vrHead() {
  const skin = 0.88;
  return [
    place(parts.ellipsoid({ radii: [0.5, 0.58, 0.46], tint: skin }), { pos: [-0.05, 0.15, 0], boost: 1.1 }),
    place(parts.ellipsoid({ radii: [0.52, 0.28, 0.47], tint: 0.4 }), { pos: [-0.07, 0.5, 0], boost: 1.1 }),
    place(parts.ellipsoid({ radii: [0.34, 0.34, 0.3], tint: skin }), { pos: [0.12, -0.3, 0] }),
    place(parts.cone({ radius: 0.08, height: 0.24, tint: skin }), { pos: [0.52, -0.02, 0], rot: [0, 0, -Math.PI / 2] }),
    place(parts.cylinder({ radius: 0.2, height: 0.5, tint: 0.8 }), { pos: [-0.08, -0.78, 0] }),
    // headset: visor, glowing lens, strap and an ear piece
    place(parts.box({ size: [0.5, 0.36, 1.04], tint: 0.45 }), { pos: [0.45, 0.14, 0], boost: 1.8 }),
    place(parts.box({ size: [0.03, 0.28, 0.9], tint: 1 }), { pos: [0.71, 0.14, 0], boost: 3.4 }),
    tube([0.3, 0.22, 0.5], [-0.4, 0.22, 0.47], 0.04, 0.25, 3),
    tube([0.3, 0.22, -0.5], [-0.4, 0.22, -0.47], 0.04, 0.25, 3),
    place(parts.box({ size: [0.28, 0.32, 0.1], tint: 0.3 }), { pos: [-0.12, 0.08, 0.5], boost: 2 }),
    place(parts.box({ size: [0.28, 0.32, 0.1], tint: 0.3 }), { pos: [-0.12, 0.08, -0.5], boost: 2 })
  ];
}

// ------------------------------------------------------- 50 · the puzzle
const PIECE = 150;
function pieceCanvas(edges, shade) {
  const pad = 46;
  const tmp = document.createElement('canvas');
  tmp.width = tmp.height = PIECE + pad * 2;
  const t = tmp.getContext('2d');
  t.fillStyle = `rgb(${shade},${shade},${shade})`;
  t.fillRect(pad, pad, PIECE, PIECE);
  const knob = PIECE * 0.19;
  const c = PIECE / 2;
  const sides = [
    [pad + c, pad, 0, -1],
    [pad + PIECE, pad + c, 1, 0],
    [pad + c, pad + PIECE, 0, 1],
    [pad, pad + c, -1, 0]
  ];
  edges.forEach((e, i) => {
    if (!e) return;
    const [sx, sy, dx, dy] = sides[i];
    t.globalCompositeOperation = e > 0 ? 'source-over' : 'destination-out';
    t.beginPath();
    t.arc(sx + dx * knob * 0.8 * e, sy + dy * knob * 0.8 * e, knob, 0, TAU);
    t.fill();
  });
  return { tmp, pad };
}

function puzzle(layout) {
  return canvasSilhouette(560, 560, (ctx, w, h) => {
    const center = w / 2;
    const pieces = [
      { edges: [0, 1, -1, 0], shade: 255, gx: 0, gy: 0 },
      { edges: [0, 0, 1, -1], shade: 215, gx: 1, gy: 0 },
      { edges: [1, 1, 0, 0], shade: 180, gx: 0, gy: 1 },
      { edges: [-1, 0, 0, -1], shade: 140, gx: 1, gy: 1 }
    ];
    pieces.forEach((p, i) => {
      const { tmp, pad } = pieceCanvas(p.edges, p.shade);
      const spec = layout[i];
      ctx.save();
      ctx.translate(center + (p.gx - 1) * PIECE + PIECE / 2 + spec.x, h / 2 + (p.gy - 1) * PIECE + PIECE / 2 + spec.y);
      ctx.rotate(spec.rot);
      ctx.drawImage(tmp, -PIECE / 2 - pad, -PIECE / 2 - pad);
      ctx.restore();
    });
  });
}

const puzzlePart = (sil) => silhouettePart(sil, { fit: 2.0, depth: 0.07, tintFn: (_r, _g, _b, l) => 0.3 + (l / 255) * 0.65 });
export const puzzleApart = () => [
  puzzlePart(
    puzzle([
      { x: -34, y: -34, rot: -0.06 },
      { x: 34, y: -34, rot: 0.05 },
      { x: -34, y: 38, rot: 0.04 },
      { x: 150, y: 140, rot: 0.55 }
    ])
  )
];
export const puzzleDone = () => [
  puzzlePart(
    puzzle([
      { x: 0, y: 0, rot: 0 },
      { x: 0, y: 0, rot: 0 },
      { x: 0, y: 0, rot: 0 },
      { x: 0, y: 0, rot: 0 }
    ])
  )
];

// -------------------------------------------------------- 60 · guillotine
function frame() {
  return [
    place(parts.box({ size: [1.5, 0.12, 0.8], tint: 0.4 }), { pos: [0, -0.94, 0], boost: 1.2 }),
    place(parts.box({ size: [0.12, 1.7, 0.12], tint: 0.6 }), { pos: [-0.4, -0.05, 0], boost: 1.4 }),
    place(parts.box({ size: [0.12, 1.7, 0.12], tint: 0.6 }), { pos: [0.4, -0.05, 0], boost: 1.4 }),
    place(parts.box({ size: [1.0, 0.13, 0.16], tint: 0.6 }), { pos: [0, 0.86, 0], boost: 1.4 }),
    // the neck board
    place(parts.box({ size: [0.28, 0.1, 0.12], tint: 0.5 }), { pos: [-0.2, -0.56, 0.06], boost: 1.6 }),
    place(parts.box({ size: [0.28, 0.1, 0.12], tint: 0.5 }), { pos: [0.2, -0.56, 0.06], boost: 1.6 }),
    // basket
    place(parts.box({ size: [0.5, 0.22, 0.3], tint: 0.3 }), { pos: [0, -0.8, 0.38], boost: 1.1 })
  ];
}

function blade(y) {
  // a heavy slanted blade riding between the posts
  return [
    place(parts.triangle([-0.3, y + 0.17, 0], [0.3, y + 0.17, 0], [0.3, y - 0.17, 0], 1), { boost: 2.6 }),
    place(parts.triangle([-0.3, y + 0.17, 0], [-0.3, y + 0.0, 0], [0.3, y - 0.17, 0], 1), { boost: 2.6 }),
    tube([-0.3, y + 0.17, 0], [0.3, y - 0.17, 0], 0.016, 0.85, 4),
    place(parts.box({ size: [0.64, 0.08, 0.1], tint: 0.6 }), { pos: [0, y + 0.2, 0], boost: 2 })
  ];
}
export const guillotineUp = () => [...frame(), ...blade(0.42)];
export const guillotineDown = () => [...frame(), ...blade(-0.5)];

// ----------------------------------------------------- 49 · vibrations
// Six Chladni plates (sand gathered on the nodal lines of a vibrating
// plate). Stage k changes plate k to its next mode: the grains slide to the
// new pattern, one plate at a time.
const BASE_MODES = [[2, 3], [3, 5], [4, 5], [3, 4], [2, 5], [5, 6]];
const NEXT_MODES = [[3, 4], [5, 7], [2, 7], [4, 6], [3, 6], [6, 7]];
const TILES = [
  [-0.37, 0.7],
  [0.37, 0.7],
  [-0.37, 0],
  [0.37, 0],
  [-0.37, -0.7],
  [0.37, -0.7]
];
const HALF = 0.33;

function chladni(cx, cy, [n, m]) {
  return {
    weight: 0.55,
    sample: (rng) => {
      for (;;) {
        const u = rng();
        const v = rng();
        const f = Math.cos(n * Math.PI * u) * Math.cos(m * Math.PI * v) - Math.cos(m * Math.PI * u) * Math.cos(n * Math.PI * v);
        if (rng() < Math.exp(-Math.pow(f / 0.16, 2))) {
          return [cx + (u * 2 - 1) * HALF, cy + (v * 2 - 1) * HALF, (rng() - 0.5) * 0.03, 0.55 + 0.4 * Math.abs(f)];
        }
      }
    }
  };
}

export function chladniStage(changed) {
  return group(chladniTiles(changed), { scale: 0.8 });
}

function chladniTiles(changed) {
  const list = [];
  TILES.forEach(([cx, cy], i) => {
    list.push(chladni(cx, cy, i < changed ? NEXT_MODES[i] : BASE_MODES[i]));
    const s = HALF + 0.015;
    list.push(
      tube([cx - s, cy - s, 0], [cx + s, cy - s, 0], 0.008, 0.25, 3),
      tube([cx + s, cy - s, 0], [cx + s, cy + s, 0], 0.008, 0.25, 3),
      tube([cx + s, cy + s, 0], [cx - s, cy + s, 0], 0.008, 0.25, 3),
      tube([cx - s, cy + s, 0], [cx - s, cy - s, 0], 0.008, 0.25, 3),
      place(parts.sphere(0.018, 1), { pos: [cx, cy, 0], boost: 6 })
    );
  });
  return list;
}

// ------------------------------------------------- 61 · the count, 1 to 6
const WORDS = ['EIN', 'DOS', 'TROIS', 'NE', 'FEM', 'LIU'];
const TILE_W = 150;
const TILE_H = 190;

function clockTiles(count, digitsOnly) {
  return canvasSilhouette(620, 470, (ctx, w, h) => {
    const font = `900 130px "Arial Black", Impact, sans-serif`;
    for (let i = 0; i < count; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 30 + col * (TILE_W + 22);
      const y = 20 + row * (TILE_H + 50);
      const tile = document.createElement('canvas');
      tile.width = w;
      tile.height = h;
      const t = tile.getContext('2d');
      t.fillStyle = '#fff';
      if (!digitsOnly) {
        t.beginPath();
        t.roundRect(x, y, TILE_W, TILE_H, 16);
        t.fill();
        t.globalCompositeOperation = 'destination-out';
      }
      t.font = font;
      t.textAlign = 'center';
      t.textBaseline = 'middle';
      t.fillText(String(i + 1), x + TILE_W / 2, y + TILE_H / 2 + 6);
      if (!digitsOnly) {
        // the hinge line of a flip clock
        t.fillRect(x, y + TILE_H / 2 - 2, TILE_W, 4);
      }
      ctx.drawImage(tile, 0, 0);
    }
  });
}

export function countStage(count) {
  const list = [
    silhouettePart(clockTiles(count, false), { fit: 2.0, depth: 0.05, tintFn: () => 0.32 }),
    silhouettePart(clockTiles(count, true), { fit: 2.0, depth: 0.05, pos: [0, 0, 0.02], tintFn: () => 1 })
  ];
  // words under the tiles; same layout math as the canvas (620 x 470 -> fit 2.0)
  const unit = 2.0 / 620;
  for (let i = 0; i < count; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cx = (30 + col * (TILE_W + 22) + TILE_W / 2 - 310) * unit;
    const cy = (235 - (20 + row * (TILE_H + 50) + TILE_H + 24)) * unit;
    const { points } = textPoints(WORDS[i], { height: 0.12 });
    list.push(place(parts.cloud(points.map(([x, y]) => [x + cx, y + cy, 0.02]), 0.78, 0.22), {}));
  }
  return list;
}

// ------------------------------------------------------ 56 · heart drops
export function drop(x, y, s = 1) {
  return group(
    [
      place(parts.sphere(0.055, 0.5), { boost: 4 }),
      place(parts.cone({ radius: 0.05, height: 0.12, tint: 0.5 }), { pos: [0, 0.09, 0], boost: 4 })
    ],
    { pos: [x, y, 0.05], scale: s }
  );
}

// ------------------------------------------------------ 44 · radio needle
export function needle(x) {
  return [
    tube([x, 0.04, 0.1], [x, 0.3, 0.1], 0.02, 1, 5),
    place(parts.sphere(0.04, 1), { pos: [x, 0.17, 0.12], boost: 8 })
  ];
}

