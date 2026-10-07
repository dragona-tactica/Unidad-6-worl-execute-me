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
    short: 'enchufe',
    key: 'KeyE',
    label: 'E · Enciende la línea de poder (enchufe)',
    verse: 'Switch on the power line',
    stages: [{ figure: 'plug_apart' }, { figure: 'plug_joined', at: 0.9 }],
    sweep: 0.7,
    motion: { sway: 0.45 }
  },
  {
    id: 'protection',
    short: 'gafas',
    key: 'KeyG',
    label: 'G · Gafas de laboratorio (protección)',
    verse: 'Remember to put on protection',
    stages: [{ figure: 'goggles' }],
    motion: { sway: 0.6 }
  },
  {
    id: 'sandwich',
    short: 'sándwich',
    key: 'KeyS',
    label: 'S · Sándwich: las piezas se unen',
    verse: 'Lay down your pieces',
    stages: [{ figure: 'sandwich_exploded' }, { figure: 'sandwich_joined', at: 0.9 }],
    sweep: 0.75,
    motion: { spin: 0.7 }
  },
  {
    id: 'creation',
    short: 'humano→cosmos',
    key: 'KeyH',
    label: 'H · Humano → esqueleto → cosmos (creación)',
    verse: "And let's begin object creation",
    stages: [{ figure: 'human' }, { figure: 'skeleton', at: 0.6 }, { figure: 'galaxy', at: 1.4 }],
    sweep: 0.35,
    motion: { sway: 0.5 }
  },
  {
    id: 'parameters',
    short: 'mariposas',
    key: 'KeyM',
    label: 'M · Líneas y mariposas que las recorren (parámetros)',
    verse: 'Fill in my data parameters',
    stages: [{ figure: 'guide_lines' }, { figure: 'butterflies_a', at: 0.6 }, { figure: 'butterflies_b', at: 1.4 }],
    sweep: 0.35,
    motion: { spin: 0.55 }
  },
  {
    id: 'initialization',
    short: 'mano',
    key: 'KeyI',
    label: 'I · La mano te invita a entrar (inicialización)',
    verse: 'Initialization',
    stages: [{ figure: 'tv_hand' }],
    motion: { sway: 0.5 }
  },
  {
    id: 'world',
    short: 'mundo',
    key: 'KeyW',
    label: 'W · Nuevo mundo',
    verse: 'Set up our new world',
    stages: [{ figure: 'planet' }],
    motion: { spin: 0.5 }
  },
  {
    id: 'simulation',
    short: 'campo',
    key: 'KeyC',
    label: 'C · Líneas de campo: comienza la simulación',
    verse: "And let's begin the simulation",
    stages: [{ figure: 'field_flat' }, { figure: 'wormhole', at: 0.9 }],
    sweep: 0.7,
    motion: { sway: 0.4 }
  },
  {
    id: 'point',
    short: 'punto',
    key: 'KeyP',
    label: 'P · Punto → plano → letras',
    verse: "If I'm a set of point",
    stages: [{ figure: 'point' }, { figure: 'point_plane', at: 0.6 }, { figure: 'point_label', at: 1.4 }],
    sweep: 0.35,
    motion: { sway: 0.35 }
  },
  {
    id: 'circle',
    short: 'naranja',
    key: 'KeyO',
    label: 'O · Rodaja de naranja con su triángulo y la ecuación',
    verse: "If I'm a circle",
    stages: [{ figure: 'orange_slice' }],
    motion: { sway: 0.22 }
  },
  {
    id: 'sine',
    short: 'onda',
    key: 'KeyN',
    label: 'N · La onda y las líneas que la contienen',
    verse: "If I'm a sine wave",
    stages: [{ figure: 'sine' }, { figure: 'sine_grid', at: 0.8 }],
    sweep: 0.7,
    motion: { sway: 0.3 }
  },
  {
    id: 'rocket',
    short: 'cohete',
    key: 'KeyR',
    label: 'R · El cohete avanza por la curva hacia el infinito',
    verse: 'If I approach infinity',
    stages: [{ figure: 'rocket_start' }, { figure: 'rocket_mid', at: 0.7, sweep: 0.45 }, { figure: 'rocket_end', at: 1.45, sweep: 0.45 }],
    motion: { sway: 0.3 }
  },
  {
    id: 'current',
    short: 'rayo',
    key: 'KeyL',
    label: 'L · Del rayo a la corriente (AC / DC)',
    verse: 'Switch my current',
    stages: [{ figure: 'lightning' }, { figure: 'acdc', at: 0.9 }],
    sweep: 0.8,
    motion: { sway: 0.25 }
  },
  {
    id: 'blur',
    short: 'borroso',
    key: 'KeyV',
    label: 'V · Todo se vuelve borroso (confusión / claridad)',
    verse: 'And then blind my vision',
    stages: [{ figure: 'confusion' }],
    effects: { blur: 1 },
    motion: { sway: 0.2 }
  },
  {
    id: 'travel',
    short: 'dinosaurio→robot',
    key: 'KeyD',
    label: 'D · Dinosaurio → robot humanoide',
    verse: 'Oh, we can travel',
    stages: [{ figure: 'trex' }, { figure: 'robot', at: 1.0 }],
    sweep: 0.85,
    motion: { sway: 0.4 }
  }
];
