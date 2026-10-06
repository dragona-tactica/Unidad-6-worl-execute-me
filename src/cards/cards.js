// THE CARDS — one per visual metaphor of the song, in verse order.
//
// A card is performed with ONE keypress. `stages` lists the figures the
// swarm turns into, in order; with two stages the swarm first forms
// stages[0], waits `hold` seconds, then a sweep (`sweep` seconds long)
// melts it into stages[1]. The motion between figures is not an animation:
// it is the agents steering toward their new target points.
//
// Digits follow the order of the lyrics for this first test (cards 1-10).
// Change `key` freely; the mnemonic letters can come once the full list
// is closed.
export const CARDS = [
  { id: 'plug', key: 'Digit1', label: '1 · Enciende el interruptor, enchufa el cable', stages: ['plug'] },
  { id: 'protection', key: 'Digit2', label: '2 · Protección: gafas de laboratorio y una cruz', stages: ['goggles_cross'] },
  { id: 'columns', key: 'Digit3', label: '3 · Cargan las columnas de partículas', stages: ['columns_base', 'columns'], hold: 1.0, sweep: 2.4 },
  { id: 'creation', key: 'Digit4', label: '4 · Algo se materializa', stages: ['box_wire', 'box_solid'], hold: 1.6, sweep: 2.0 },
  { id: 'parameters', key: 'Digit5', label: '5 · Los parámetros se ajustan, como al editar una foto', stages: ['sliders_a', 'sliders_b'], hold: 1.4, sweep: 1.6 },
  { id: 'planet', key: 'Digit6', label: '6 · Se crea un planeta', stages: ['planet'] },
  { id: 'simulation', key: 'Digit7', label: '7 · La pantalla comienza la simulación', stages: ['monitor_off', 'monitor_on'], hold: 1.6, sweep: 1.2 },
  { id: 'point', key: 'Digit8', label: '8 · Un punto y sus dimensiones', stages: ['point', 'point_axes'], hold: 1.4, sweep: 1.8 },
  { id: 'ring', key: 'Digit9', label: '9 · Un anillo y su circunferencia', stages: ['ring', 'ring_ticks'], hold: 1.4, sweep: 1.8 },
  { id: 'sine', key: 'Digit0', label: '10 · La onda y las tangentes que la definen', stages: ['sine', 'sine_tangents'], hold: 1.4, sweep: 1.8 }
];
