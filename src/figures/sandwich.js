import { parts, place } from './sampling.js';

// 03 · Lay down your pieces — an exploded sandwich (reference: the
// "Philly High Rise" blueprint) whose layers then stack into the finished
// sandwich. Same layers in both figures, only their heights change, so the
// particles of each layer simply slide together.

const LAYERS = [
  // [name, exploded y, joined y]
  ['breadBottom', -0.86, -0.4],
  ['cheese', -0.58, -0.27],
  ['bacon', -0.3, -0.2],
  ['ham', -0.02, -0.12],
  ['tomato', 0.26, -0.03],
  ['lettuce', 0.54, 0.07],
  ['breadTop', 0.84, 0.2]
];

function layer(name) {
  switch (name) {
    case 'breadBottom':
      return [place(parts.ellipsoid({ radii: [0.8, 0.1, 0.33], tint: 0.78 }), { boost: 1.2 })];
    case 'cheese':
      return [
        place(parts.box({ size: [1.45, 0.025, 0.56], tint: 1 }), { boost: 1.3 }),
        place(parts.box({ size: [0.3, 0.025, 0.2], tint: 1 }), { pos: [0.5, -0.05, 0.26], boost: 1.3 })
      ];
    case 'bacon':
      return [-0.18, 0, 0.18].map((z, i) =>
        place(parts.wavy({ w: 1.45, d: 0.11, amp: 0.035, fx: 9, fz: 0, tint: i % 2 ? 0.5 : 0.62 }), { pos: [0, 0, z], boost: 1.6 })
      );
    case 'ham':
      return [-0.32, 0.32].map((x) => place(parts.ellipsoid({ radii: [0.34, 0.025, 0.24], tint: 0.38 }), { pos: [x, 0, 0], boost: 1.5 }));
    case 'tomato':
      return [-0.5, 0, 0.5].map((x) => place(parts.cylinder({ radius: 0.2, height: 0.045, tint: 0.62 }), { pos: [x, 0, 0], boost: 1.4 }));
    case 'lettuce':
      return [place(parts.wavy({ w: 1.55, d: 0.62, amp: 0.045, fx: 13, fz: 8, tint: 0.25 }), { boost: 1.5 })];
    case 'breadTop':
      return [
        place(parts.ellipsoid({ radii: [0.82, 0.3, 0.34], tint: 0.82 }), {
          tintWorld: (x, y) => 0.7 + 0.15 * Math.min(1, Math.max(0, y)),
          boost: 1.2
        })
      ].map((part) => ({
        // keep only the dome: mirror the lower half upward
        weight: part.weight,
        sample: (rng) => {
          const q = part.sample(rng);
          q[1] = Math.abs(q[1]);
          return q;
        }
      }));
    default:
      return [];
  }
}

const build = (key) =>
  LAYERS.flatMap(([name, exploded, joined]) =>
    layer(name).map((part) => place(part, { pos: [0, (key === 'exploded' ? exploded : joined) * 0.86, 0], rot: [0, 0.15, 0], scale: 0.86 }))
  );

export const sandwichExploded = () => build('exploded');
export const sandwichJoined = () => build('joined');
