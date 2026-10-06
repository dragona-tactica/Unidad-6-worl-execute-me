import { loadFigure } from '../figures/registry.js';

// Runs the card the performer just triggered. The only clock here starts at
// the keypress; nothing ever starts a card on its own.
export function createCardPlayer({ swarm, params, count, onStatus }) {
  let active = null;
  let elapsed = 0;
  let token = 0;

  return {
    get active() {
      return active;
    },

    async trigger(card) {
      const mine = ++token;
      onStatus?.(`cargando… ${card.label}`);
      const figures = await Promise.all(card.stages.map((id) => loadFigure(id, count)));
      if (mine !== token) return; // a newer key was pressed while this loaded

      swarm.setCard(figures[0], figures[1] ?? null);
      params.sweep.value = card.sweep ?? 2.0;
      active = card;
      elapsed = 0;
      const sources = [...new Set(figures.map((f) => f.source))].join(', ');
      onStatus?.(`${card.label}  [${sources}]`);
    },

    dissolve() {
      token++;
      active = null;
      swarm.release();
      onStatus?.('señal');
    },

    update(dt) {
      if (!active || active.stages.length < 2) return;
      elapsed += dt;
      const t = elapsed - (active.hold ?? 1.5);
      if (t >= 0) params.transformT.value = Math.min(t, (active.sweep ?? 2.0) + 2.0);
    }
  };
}
