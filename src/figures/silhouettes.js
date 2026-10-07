import { loadSilhouette, silhouettePart } from './silhouette.js';

// Every figure that comes from a reference image. `file` defaults to the id;
// the rest are silhouettePart() options (see silhouette.js).
const FROM_IMAGE = {
  trex: { height: 2.0, lo: 0.3, hi: 1.0 },
  robot: { height: 2.1, lo: 0.25, hi: 1.0 }
};

export const silhouetteFigures = Object.fromEntries(
  Object.entries(FROM_IMAGE).map(([id, opts]) => [
    id,
    async () => [silhouettePart(await loadSilhouette(opts.file ?? id), opts)]
  ])
);
