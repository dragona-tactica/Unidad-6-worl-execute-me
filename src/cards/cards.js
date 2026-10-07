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
  },
  {
    id: 'deep',
    short: 'submarino y calamar',
    key: 'KeyU',
    label: 'U · El submarino ante el calamar abisal (modelo 3D)',
    verse: 'So deeply, so deeply',
    stages: [{ figure: 'abyss' }],
    motion: { sway: 0.95 }
  },
  {
        id: 'simulations',
    short: 'pantallas',
    key: 'KeyA',
    label: 'A · Pantallas y simulaciones saliendo de ellas',
    verse: 'Give you all the simulations',
    stages: [{ figure: 'computer' }],
    motion: { sway: 0.4 }
  },
  {
    id: 'vr',
    short: 'cabeza VR',
    key: 'KeyY',
    label: 'Y · Una cabeza con gafas de realidad virtual',
    verse: 'Be your only satisfaction',
    stages: [{ figure: 'vr_head' }],
    motion: { sway: 0.5 }
  },
  {
    id: 'fox',
    short: 'zorro',
    key: 'KeyZ',
    label: 'Z · Un zorro feliz con gafas de sol',
    verse: 'If I can make you happy',
    stages: [{ figure: 'fox' }],
    motion: { sway: 0.3 }
  },
  {
    id: 'trap',
    short: 'trampa',
    key: 'KeyJ',
    label: 'J · Trampa para osos y el pie de uno',
    verse: 'Though we are trapped',
    stages: [{ figure: 'beartrap' }],
    motion: { sway: 0.25 }
  },
  {
    id: 'eggplant',
    short: 'berenjena→pastillas',
    key: 'KeyB',
    label: 'B · Berenjena → pastillas',
    verse: "If I'm an eggplant",
    stages: [{ figure: 'eggplant' }, { figure: 'pills', at: 0.9 }],
    sweep: 0.7,
    motion: { sway: 0.3 }
  },
  {
    id: 'tomato',
    short: 'tomate→proteínas',
    key: 'KeyT',
    label: 'T · Tomate → cadena de proteínas',
    verse: "If I'm a tomato",
    stages: [{ figure: 'tomato' }, { figure: 'molecule', at: 0.9 }],
    sweep: 0.7,
    motion: { sway: 0.3 }
  },
  {
    id: 'cat',
    short: 'gato 3D',
    key: 'KeyF',
    label: 'F · Un gato de circo (modelo 3D)',
    verse: "If I'm a tabby cat",
    stages: [{ figure: 'cat' }],
    motion: { sway: 0.95 }
  },
  {
    id: 'lamb',
    short: 'cordero',
    key: 'KeyK',
    verse: "If I'm the only God",
    stages: [{ figure: 'lamb' }],
    label: 'K · El cordero (modelo 3D)',
    motion: { sway: 0.95 }
  },
  {
    id: 'gender',
    short: 'chico↔chica',
    key: 'KeyX',
    label: 'X · El chico se cambia por la chica y viceversa',
    verse: 'Switch my gender',
    stages: [{ figure: 'boy' }, { figure: 'girl', at: 0.7 }, { figure: 'boy', at: 1.45 }],
    sweep: 0.4,
    motion: { sway: 0.2 }
  },
  {
    id: 'radio',
    short: 'radio',
    key: 'KeyQ',
    label: 'Q · La perilla del radio cambia de frecuencia',
    verse: 'From AM to PM',
    stages: [{ figure: 'radio_am' }, { figure: 'radio_pm', at: 0.9 }],
    sweep: 0.6,
    motion: { sway: 0.18 }
  },
  {
    id: 'mouse',
    short: 'ratón→elefante',
    key: 'Digit1',
    label: '1 · El ratón se transforma en elefante',
    verse: 'To S, to M',
    stages: [{ figure: 'mouse' }, { figure: 'elephant', at: 0.9 }],
    sweep: 0.7,
    motion: { sway: 0.3 }
  },
  {
    id: 'hole',
    short: 'agujero',
    key: 'Digit2',
    label: '2 · El hombre cae en el agujero',
    verse: 'The trance, the trance',
    stages: [{ figure: 'fall' }],
    motion: { sway: 0.3 }
  },
  {
    id: 'vibrations',
    short: 'vibraciones',
    key: 'Digit3',
    label: '3 · Las placas vibran, una a una',
    verse: 'Feel your vibrations',
    blendTime: 0.26,
    sweep: 0.16,
    stages: [
      { figure: 'chladni_0' },
      { figure: 'chladni_1', at: 0.3 },
      { figure: 'chladni_2', at: 0.66 },
      { figure: 'chladni_3', at: 1.02 },
      { figure: 'chladni_4', at: 1.38 },
      { figure: 'chladni_5', at: 1.74 },
      { figure: 'chladni_6', at: 2.1 }
    ],
    motion: { sway: 0.15 }
  },
  {
    id: 'puzzle',
    short: 'rompecabezas',
    key: 'Digit4',
    label: '4 · Se completa el rompecabezas',
    verse: 'Finally be completion',
    stages: [{ figure: 'puzzle_apart' }, { figure: 'puzzle_done', at: 0.9 }],
    sweep: 0.7,
    motion: { sway: 0.25 }
  },
  {
    id: 'leave',
    short: 'gato y tren',
    key: 'Digit5',
    label: '5 · El gato y el tren que avanza',
    verse: 'You have left',
    stages: [{ figure: 'cat_train_far' }, { figure: 'cat_train_near', at: 0.8 }],
    sweep: 0.9,
    motion: { sway: 0.2 }
  },
  {
    id: 'isolation',
    short: 'tren en el desierto',
    key: 'Digit6',
    label: '6 · El tren solo en el desierto',
    verse: 'You have left me in isolation',
    stages: [{ figure: 'desert' }],
    motion: { sway: 0.25 }
  },
  {
    id: 'fragments',
    short: 'gato roto',
    key: 'Digit7',
    label: '7 · La silueta del gato se fragmenta',
    verse: 'Erase all the pointless fragments',
    stages: [{ figure: 'cat_whole' }, { figure: 'cat_shattered', at: 0.8 }],
    sweep: 0.5,
    motion: { sway: 0.3 }
  },
  {
    id: 'heart',
    short: 'corazón',
    key: 'Digit8',
    label: '8 · El corazón sangrando',
    verse: "You won't leave me so disheartened",
    stages: [{ figure: 'heart_a' }, { figure: 'heart_b', at: 0.8 }],
    sweep: 0.7,
    motion: { sway: 0.25 }
  },
  {
    id: 'warden',
    short: 'guerrero',
    key: 'Digit9',
    label: '9 · El guerrero desafía a tu dios',
    verse: 'Challenging your God',
    stages: [{ figure: 'warden' }],
    motion: { sway: 0.3 }
  },
  {
    id: 'gavel',
    short: 'mazo',
    key: 'Digit0',
    label: '0 · El mazo de las leyes',
    verse: 'Illegal arguments',
    stages: [{ figure: 'gavel' }],
    motion: { sway: 0.3 }
  },
  {
    id: 'guillotine',
    short: 'guillotina',
    key: 'Minus',
    label: '− · La guillotina y el filo que cae',
    verse: 'Execution, execution',
    stages: [{ figure: 'guillotine_up' }, { figure: 'guillotine_down', at: 1.0 }],
    sweep: 0.3,
    motion: { sway: 0.3 }
  },
  {
    id: 'count',
    short: 'cuenta 1-6',
    key: 'Equal',
    label: '= · La cuenta del uno al seis',
    verse: 'Ein, dos, trios, ne, fem, liu',
    blendTime: 0.22,
    sweep: 0.12,
    stages: [
      { figure: 'count_1' },
      { figure: 'count_2', at: 0.4 },
      { figure: 'count_3', at: 0.8 },
      { figure: 'count_4', at: 1.2 },
      { figure: 'count_5', at: 1.6 },
      { figure: 'count_6', at: 2.0 }
    ],
    motion: { sway: 0.2 }
  }
];
