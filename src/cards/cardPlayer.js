import { loadFigure } from '../figures/registry.js';
import { matchOrder } from '../figures/match.js';

const SWEEP_MODES = { topDown: 0, angleA: 1, angleB: 2 };
const idle = () => new Promise((resolve) => setTimeout(resolve, 0));

// Runs the card the performer just triggered. The only clock here starts at
// the keypress; nothing ever starts a card on its own.
export function createCardPlayer({ swarm, count, onStatus }) {
  let active = null;
  let elapsed = 0;
  let nextStage = 1;
  let figures = [];
  let token = 0;
  const prepared = new Map();

  // Builds every figure of a card and pairs each stage's points with the
  // previous stage's (see figures/match.js), once, ahead of time.
  const prepare = (card) => {
    if (!prepared.has(card.id)) {
      prepared.set(
        card.id,
        (async () => {
          const raw = await Promise.all(card.stages.map((s) => loadFigure(s.figure, count)));
          const chain = [raw[0]];
          for (let i = 1; i < raw.length; i++) {
            await idle();
            chain.push({ ...raw[i], points: matchOrder(chain[i - 1].points, raw[i].points) });
          }
          return chain;
        })()
      );
    }
    return prepared.get(card.id);
  };

  return {
    get active() {
      return active;
    },
    prepare,

    async trigger(card) {
      const mine = ++token;
      const loaded = await prepare(card);
      if (mine !== token) return; // a newer key was pressed while this loaded

      figures = loaded;
      active = card;
      elapsed = 0;
      nextStage = 1;
      swarm.setBlendTime(card.blendTime ?? 0.4);
      swarm.begin(figures[0]);
      const sources = [...new Set(loaded.map((f) => f.source))].join(', ');
      onStatus?.(`${card.label}  [${sources}]`);
    },

    dissolve() {
      token++;
      active = null;
      swarm.release();
      onStatus?.('señal');
    },

    update(dt) {
      if (!active) return;
      elapsed += dt;
      while (nextStage < active.stages.length && elapsed >= active.stages[nextStage].at) {
        const stage = active.stages[nextStage];
        swarm.morphTo(figures[nextStage], stage.sweep ?? active.sweep ?? 0.6, SWEEP_MODES[stage.mode] ?? 0, stage.center);
        nextStage++;
      }
    }
  };
}
