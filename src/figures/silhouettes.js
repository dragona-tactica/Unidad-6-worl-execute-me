import { parts, place } from './sampling.js';
import { loadSilhouette, silhouettePart } from './silhouette.js';
import { shatter } from './shatter.js';
import { sampleGLB } from './sampleGLB.js';
import { drop, needle } from './scenes.js';

// Every figure that comes from a reference image (tools/silhouettes.json cuts
// the masks). Options are silhouettePart() options; `lo`/`hi` stretch the
// image's own brightness over the palette (0 deep violet .. 1 peach).
const FROM_IMAGE = {
  trex: { fit: 1.76 },
  robot: { fit: 1.76 },
  computer: { fit: 1.85 },
  fox: {
    fit: 1.85,
    tintFn: (r, g, b, l) => (l < 80 ? 0.05 : l > 215 ? 1 : r > g + 35 && g > b + 35 ? 0.78 : 0.88)
  },
  beartrap: { fit: 1.85 },
  eggplant: { fit: 1.76, lo: 0.08, hi: 0.8 },
  pills: { fit: 1.85 },
  tomato: { fit: 1.68, lo: 0.4, hi: 1 },
  molecule: { fit: 1.85 },
  lamb: { fit: 1.85 },
  boy: { fit: 1.85, tintFn: (r, g, b, l) => (l > 235 ? 1 : l > 215 ? 0.95 : 0.55) },
  girl: { fit: 1.85, tintFn: (r, g, b, l) => (l > 235 ? 1 : b > r + 60 ? 0.2 : 0.55) },
  mouse: { fit: 1.85, lo: 0.2, hi: 1 },
  elephant: { fit: 1.85 },
  fall: { fit: 1.76 },
  warden: { fit: 1.93, lo: 0.15, hi: 1 },
  gavel: { fit: 1.76 }
};

const image = (id, opts) => async () => [silhouettePart(await loadSilhouette(opts.file ?? id), opts)];
const figures = Object.fromEntries(Object.entries(FROM_IMAGE).map(([id, opts]) => [id, image(id, opts)]));

// 44 · the radio: same boombox, the tuning needle at two frequencies.
const radioPart = async () => silhouettePart(await loadSilhouette('radio'), { fit: 1.76, lo: 0.2, hi: 1 });
figures.radio_am = async () => [await radioPart(), ...needle(-0.4)];
figures.radio_pm = async () => [await radioPart(), ...needle(0.45)];

// 37 · the banjo cat as a real 3D model (public/models/banjo_cat.glb). The
// model has no texture, so its colors come from the reference image: every
// point takes the brightness of the picture pixel it sits in front of.
figures.cat = async ({ N, rng }) => {
  const sil = await loadSilhouette('cat');
  const { w, h, data, lumaLow, lumaHigh } = sil;
  const range = Math.max(1, lumaHigh - lumaLow);
  const tintFn = (_x, _y, _z, u, v) => {
    const ix = Math.min(w - 1, Math.max(0, Math.round(u * (w - 1))));
    const iy = Math.min(h - 1, Math.max(0, Math.round(v * (h - 1))));
    const i = (iy * w + ix) * 4;
    if (data[i + 3] < 128) return 0.12; // outside the picture's outline: dark fur
    const luma = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    return 0.12 + 0.88 * Math.min(1, Math.max(0, (luma - lumaLow) / range));
  };
  const points = await sampleGLB(`${import.meta.env.BASE_URL}models/banjo_cat.glb`, N, rng, { height: 1.85, tintFn });
  return { points, source: 'glb:banjo_cat.glb + imagen' };
};

// 52 · the cat in front, the train behind advancing toward us.
const catPart = async (extra = {}) => silhouettePart(await loadSilhouette('cat'), { fit: 1.6, lo: 0.12, hi: 1, ...extra });
const trainPart = async (extra = {}) => silhouettePart(await loadSilhouette('train'), { fit: 1.68, lo: 0.25, hi: 0.95, depth: 0.1, ...extra });
figures.cat_train_far = async () => [await catPart({ pos: [-0.5, -0.1, 0.4] }), await trainPart({ scale: 0.42, pos: [0.55, 0.15, -0.5] })];
figures.cat_train_near = async () => [await catPart({ pos: [-0.5, -0.1, 0.4] }), await trainPart({ scale: 0.95, pos: [0.3, 0.1, -0.3] })];

// 53 · the same train, alone in the desert.
figures.desert = async () => [
  await trainPart({ scale: 0.8, pos: [-0.34, 0.04, 0.05], lo: 0.35, hi: 1 }),
  silhouettePart(await loadSilhouette('desert'), { fit: 2.1, lo: 0.35, hi: 0.8, pos: [0.05, -0.3, 0.12], depth: 0.07 }),
  place(parts.triangle([-1.2, -0.45, -0.3], [1.2, -0.45, -0.3], [0.3, 0.7, -0.3], 0.72), { boost: 0.3 }),
  place(parts.box({ size: [2.4, 0.03, 0.9], tint: 0.85 }), { pos: [0, -0.47, 0], boost: 0.7 })
];

// 54 · the same cat, broken into pieces.
figures.cat_whole = async () => [await catPart({ pos: [0, 0, 0] })];
figures.cat_shattered = async () => [shatter(await catPart({ pos: [0, 0, 0] }), { bounds: [-0.7, -0.9, 0.7, 0.9], spread: 0.16, crack: 0.03, seeds: 28 })];

// 56 · the bleeding heart.
const heartPart = async () => silhouettePart(await loadSilhouette('heart'), { fit: 1.4, pos: [0, 0.42, 0] });
figures.heart_a = async () => [await heartPart(), ...drop(0.1, -0.44)];
figures.heart_b = async () => [
  await heartPart(),
  ...drop(0.1, -0.82, 1.15),
  ...drop(0.26, -0.7, 0.9),
  ...drop(-0.06, -0.92, 0.8),
  place(parts.disc({ radius: 0.34, tint: 0.5 }), { pos: [0.1, -1.0, 0], scale: [1, 0.18, 1], boost: 1.2 })
];

export const silhouetteFigures = figures;
