// THE CARDS — one per visual metaphor of the song, in verse order.
//
// A card is performed with ONE keypress. `stages` is the list of figures the
// swarm turns into, each with `at`: the second (counted from the keypress)
// when the sweep toward it begins. The first stage forms immediately.
// The motion between figures is not an animation: it is the agents
// steering toward their new target points.
//
// Budget: a card has to fit inside its verse (~2 s), so the last stage's
// `at` + `sweep` + ~0.3 s of settling stays at or under ~2.4 s.
//
// `motion`: how the figure turns while it is shown.
//   { spin: rad/s }       keeps turning (the performer can speed it up/down)
//   { sway: radians }     rocks back and forth, for figures with a front
//                         (text, planes, a hand) that must not show their back
export const CARDS = [
  {
    id: 'plug',
    key: 'KeyE',
    label: 'E · Enciende la línea de poder (enchufe)',
    verse: 'Switch on the power line',
    stages: [{ figure: 'plug_apart' }, { figure: 'plug_joined', at: 0.9 }],
    sweep: 0.7,
    motion: { sway: 0.45 }
  },
  {
    id: 'protection',
    key: 'KeyG',
    label: 'G · Gafas de laboratorio (protección)',
    verse: 'Remember to put on protection',
    stages: [{ figure: 'goggles' }],
    motion: { sway: 0.6 }
  },
  {
    id: 'sandwich',
    key: 'KeyS',
    label: 'S · Sándwich: las piezas se unen',
    verse: 'Lay down your pieces',
    stages: [{ figure: 'sandwich_exploded' }, { figure: 'sandwich_joined', at: 0.9 }],
    sweep: 0.75,
    motion: { spin: 0.7 }
  },
  {
    id: 'creation',
    key: 'KeyH',
    label: 'H · Humano → esqueleto → cosmos (creación)',
    verse: "And let's begin object creation",
    stages: [{ figure: 'human' }, { figure: 'skeleton', at: 0.6 }, { figure: 'galaxy', at: 1.4 }],
    sweep: 0.35,
    motion: { sway: 0.5 }
  },
  {
    id: 'parameters',
    key: 'KeyM',
    label: 'M · Líneas y mariposas que las recorren (parámetros)',
    verse: 'Fill in my data parameters',
    stages: [{ figure: 'guide_lines' }, { figure: 'butterflies_a', at: 0.6 }, { figure: 'butterflies_b', at: 1.4 }],
    sweep: 0.35,
    motion: { spin: 0.55 }
  },
  {
    id: 'initialization',
    key: 'KeyI',
    label: 'I · La mano te invita a entrar (inicialización)',
    verse: 'Initialization',
    stages: [{ figure: 'tv' }, { figure: 'tv_hand', at: 0.9 }],
    sweep: 0.7,
    motion: { sway: 0.5 }
  },
  {
    id: 'world',
    key: 'KeyW',
    label: 'W · Nuevo mundo',
    verse: 'Set up our new world',
    stages: [{ figure: 'planet' }],
    motion: { spin: 0.5 }
  },
  {
    id: 'simulation',
    key: 'KeyC',
    label: 'C · Líneas de campo: comienza la simulación',
    verse: "And let's begin the simulation",
    stages: [{ figure: 'field_flat' }, { figure: 'wormhole', at: 0.9 }],
    sweep: 0.7,
    motion: { sway: 0.4 }
  },
  {
    id: 'point',
    key: 'KeyP',
    label: 'P · Punto → plano → letras',
    verse: "If I'm a set of point",
    stages: [{ figure: 'point' }, { figure: 'point_plane', at: 0.6 }, { figure: 'point_label', at: 1.4 }],
    sweep: 0.35,
    motion: { sway: 0.35 }
  },
  {
    id: 'circle',
    key: 'KeyO',
    label: 'O · Rodaja de naranja con su triángulo y la ecuación',
    verse: "If I'm a circle",
    stages: [{ figure: 'orange_slice' }],
    motion: { sway: 0.22 }
  }
];
