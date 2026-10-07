import { parts, place, tube, curve, group, TAU } from './sampling.js';

// 08 · And let's begin the simulation — two sheets of field lines joined
// by a throat (reference: the wormhole / bridge diagram). Stage A is the
// flat Cartesian grid of an empty simulation; stage B bends every line
// toward the throat, so the grid visibly "switches on" into the field.

const X = 0.62; // each sheet sits at x = +-X
const H = 0.86; // half size of a sheet
const THROAT = 0.17;

const sheetBorder = (x) => [
  tube([x, -H, -H], [x, H, -H], 0.018, 0.5, 3),
  tube([x, H, -H], [x, H, H], 0.018, 0.5, 3),
  tube([x, H, H], [x, -H, H], 0.018, 0.5, 3),
  tube([x, -H, H], [x, -H, -H], 0.018, 0.5, 3)
];

function fieldFlatRaw() {
  const list = [];
  [-X, X].forEach((x) => {
    list.push(...sheetBorder(x));
    for (let k = -3; k <= 3; k++) {
      const v = (k / 3) * H;
      list.push(tube([x, v, -H], [x, v, H], 0.011, 0.25, 3));
      list.push(tube([x, -H, v], [x, H, v], 0.011, 0.25, 3));
    }
  });
  return list;
}

function wormholeRaw() {
  const list = [];
  [-X, X].forEach((x) => {
    list.push(...sheetBorder(x));
    // concentric field lines around the throat mouth
    [0.2, 0.3, 0.43, 0.58, 0.74].forEach((r) => {
      list.push(place(parts.torus({ R: r, r: 0.011, tint: 0.25 }), { pos: [x, 0, 0], rot: [0, Math.PI / 2, 0], boost: 3.2 }));
    });
    // radial lines leaving the mouth toward the border
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * TAU;
      const edge = Math.min(H / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a))), 0.98);
      list.push(tube([x, Math.cos(a) * THROAT * 1.1, Math.sin(a) * THROAT * 1.1], [x, Math.cos(a) * edge, Math.sin(a) * edge], 0.011, 0.25, 3));
    }
  });
  // the throat: flared tube between the two sheets
  const radius = (x) => THROAT + 0.2 * Math.pow(x / X, 4) + 0.04 * Math.pow(x / X, 2);
  for (let k = -5; k <= 5; k++) {
    const x = (k / 5) * X * 0.98;
    list.push(place(parts.torus({ R: radius(x), r: 0.013, tint: 0.75 }), { pos: [x, 0, 0], rot: [0, Math.PI / 2, 0], boost: 3.4 }));
  }
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU;
    list.push(
      ...curve((t) => {
        const x = (t * 2 - 1) * X;
        return [x, Math.cos(a) * radius(x), Math.sin(a) * radius(x)];
      }, 16, 0.012, 0.75, 3)
    );
  }
  return list;
}


// Turned a little, like the reference drawing, so the two sheets show
// their faces instead of standing edge-on to the viewer.
const view = (list) => group(list, { rot: [0.1, -0.62, 0] });
export const fieldFlat = () => view(fieldFlatRaw());
export const wormhole = () => view(wormholeRaw());
