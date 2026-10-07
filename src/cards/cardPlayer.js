import { loadFigure } from '../figures/registry.js';

// Runs the card the performer just triggered. The only clock here starts at
// the keypress; nothing ever starts a card on its own.
export function createCardPlayer({ swarm, count, onStatus }) {
  let active = null;
  let elapsed = 0;
  let nextStage = 1;
  let figures = [];
  let token = 0;

  return {
    get active() {
      return active;
    },

    async trigger(card) {
      const mine = ++token;
      const loaded = await Promise.all(card.stages.map((s) => loadFigure(s.figure, count)));
      if (mine !== token) return; // a newer key was pressed while this loaded

      figures = loaded;
      active = card;
      elapsed = 0;
      nextStage = 1;
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
        swarm.morphTo(figures[nextStage], active.sweep ?? 0.6);
        nextStage++;
      }
    }
  };
}
