# World.execute(me)

Instrumento visual en tiempo real para interpretar una canción con agentes autónomos
(Unidad 6): **flow fields** y **steering behaviors**, con flocking y Physarum previstos
para las siguientes cartas. Un televisor CRT viejo (scanlines, curvatura, dithering,
persistencia del fósforo) muestra un enjambre de 160 000 partículas que forman, en 3D y
girando, cada metáfora de la letra. **Nada ocurre solo**: cada metáfora se dispara con una
tecla y no hay análisis de audio ni secuencias automáticas.

## Cartas: todos los fragmentos con referencia

Cada carta sigue la referencia (imagen + indicación) de su carpeta, dura unos 2 s y se
dispara con **una sola tecla**. Todas usan la paleta de `Paleta de colores.jpg`
(violeta profundo → violeta eléctrico → magenta → naranja → durazno).

| Tecla | Fragmento | Qué pasa |
|---|---|---|
| `E` | 01 Switch on the power line | enchufe ya conectado, con chispas (sin animación) |
| `G` | 02 Protection | gafas de laboratorio (una sola pieza) |
| `S` | 03 Lay down your pieces | sándwich en vista explotada → armado |
| `H` | 04 Object creation | la galaxia espiral (sin animación) |
| `M` | 05 Data parameters | las mariposas sobre la espiral (sin animación) |
| `I` | 06 Initialization | televisor con la mano afuera |
| `W` | 07 New world | el planeta |
| `C` | 08 The simulation | las líneas de campo con su garganta (sin animación) |
| `P` | 09 Set of point | punto → plano con curva → "POINT OF INFLECTION" |
| `O` | 11 Circle | rodaja de naranja con triángulo punteado y `C = 2πr` |
| `N` | 13 Sine wave | la onda ya formada se desliza por la cuadrícula (los mismos agentes, sin regenerarse) |
| `R` | 15 Infinity | el cohete (modelo 3D) vuela ya formado por la curva 1/x |
| `L` | 17 Switch my current | rayo → AC / DC |
| `V` | 19 Blind my vision | la mitad superior de la pantalla se desenfoca (confusión / claridad) |
| `D` | 21 Oh, we can travel | dinosaurio (entra rápido, grande, y se queda ~1.5 s) → robot: modelos 3D con sus propios colores |
| `U` | 24 So deeply | modelo 3D del calamar abisal con el submarino (`public/models/abyssal_encounter.glb`), coloreado con la imagen |
| `A` | 26 All the simulations | pantallas (modelo 3D) con peces saliendo de ellas |
| `Y` | 28 Only satisfaction | la abeja de la simulación FDTD (mapa de calor como color; `tools/bake_bee.py`) |
| `Z` | 29 Make you happy | pájaro feliz: modelo 3D (esculpido de 40 MB convertido a nube de puntos con `tools/bake_points.py`) |
| `J` | 31 Though we are trapped | trampa para osos: modelo 3D |
| `B` | 33 Eggplant | berenjena → pastillas: modelos 3D con sus propios colores |
| `T` | 35 Tomato | tomate → cadena de proteínas: modelos 3D (el tomate con su textura) |
| `F` | 37 Tabby cat | gato de circo con banjo: modelo 3D (`public/models/banjo_cat.glb`) coloreado con la imagen de referencia |
| `K` | 39 The only God | el cordero: modelo 3D (`public/models/sacred_lamb.glb`) coloreado con la imagen, de perfil como la referencia |
| `X` | 41 Switch my gender | el chico → la chica: modelos 3D (un solo archivo con los dos personajes) |
| `Q` | 44 From AM to PM | radio de época: modelo 3D |
| `1` | 46 To S, to M | ratón → elefante: modelos 3D |
| `2` | 48 The trance | el hombre cae en el agujero |
| `3` | 49 Feel your vibrations | seis placas vibran, una a una |
| `4` | 50 Finally be completion | se completa el rompecabezas |
| `5` | 52 You have left | el gato con el tren que pasa detrás: modelos 3D |
| `6` | 53 In isolation | tres camellos caminando por el desierto, con la animación del modelo |
| `7` | 54 Pointless fragments | el espejo roto: modelo 3D |
| `8` | 56 Disheartened | el corazón (modelo 3D con textura) y la sangre que cae |
| `9` | 57 Challenging your God | el ratón guerrero en pose de combate: modelo 3D |
| `0` | 59 Illegal arguments | el mazo: modelo 3D coloreado con la imagen de referencia |
| `−` | 60 Execution | la guillotina: modelo 3D; el filo cae |
| `=` | 61 Ein, dos | la cuenta del uno al seis en varios idiomas |

Los fragmentos 64-76 no tienen referencia todavía. Los tiempos de cada etapa (`at`, `sweep`)
están en `src/cards/cards.js`. El movimiento entre figuras no es una animación: son los
agentes persiguiendo sus nuevos puntos (steering).

## Cómo salen las figuras de las imágenes

`tools/make_silhouettes.py` recorta cada imagen de referencia en una máscara (receta en
`tools/silhouettes.json`) y escribe `public/silhouettes/<id>.png`. La página convierte esa
máscara en un volumen de partículas: el contorno es la silueta y la distancia al borde la
infla, así que gira como un cuerpo y no como un cartón. Para rehacerlas:

```bash
SILHOUETTE_SRC="$HOME/Downloads/execute me" python3 tools/make_silhouettes.py
```

### Otros controles
- `espacio`: disolver la figura y volver a la señal (el flow field).
- `← →`: velocidad de giro/balanceo de la figura.
- `↑ ↓`: torcer el flow field (todo el "clima" de la pantalla).
- `shift` (mantener): turbulencia. `` ` `` (mantener): vertical hold del televisor.
- `enter`: pantalla completa. Ratón: inclinarse un poco alrededor de la pantalla.

## Cómo piensa cada agente (para la rúbrica)

- **Percibe**: (1) el punto objetivo que tiene asignado en la figura actual y (2) la
  dirección del flow field en su propia posición. No ve a sus vecinos.
- **Calcula**: una *velocidad deseada* — sin figura, la dirección del campo; con figura,
  *arrive* hacia su punto (llega frenando, sin pasarse) más un poco de campo mientras
  aún está lejos.
- **Actúa**: se corrige con una fuerza limitada, `steer = clamp(deseada − velocidad)`.
- **El flow field** está separado en dos partes: la *construcción* del campo
  (`src/core/flowField.js`, ruido que cambia en el tiempo y se puede torcer) y la
  *consulta* que cada agente hace de él (`swarm.js`, `background.js`).

## Diagnóstico
Abre la página con `?debug` al final de la dirección para ver arriba a la derecha el estado de
WebGPU, el tamaño del canvas, los cuadros y los fps. Cualquier error del navegador aparece ahí
siempre, aunque no pongas `?debug`.

## Cómo se ven las transiciones
Cada etapa se empareja con la anterior (`src/figures/match.js`, orden de Morton): lo que las
dos figuras comparten se queda quieto y el resto viaja como un solo cuerpo. Mientras el
enjambre se mueve las partículas se agrandan, se calientan y dejan estela (la persistencia
del fósforo sube); al reposar la imagen vuelve a ser nítida.

## Ver un modelo antes de usarlo
Abre la página con `?preview=<archivo en public/models>` (y, si hace falta, `&opts={json}` con
`fit`, `height`, `rotate`, `only`, `skip`…) y pulsa `\`: muestra ese modelo como figura, girando.
Así se decide la rotación y el tamaño de un modelo nuevo sin tocar el código.

## Cómo reemplazar una figura por tu propio modelo 3D

1. Pon un `.glb` en `public/models/`.
2. Añádelo a `public/models/manifest.json`:

```json
{
  "figures": {
    "planet": { "file": "mi-planeta.glb", "rotate": [0, 0, 0] }
  }
}
```

Las llaves son los ids de `src/figures/registry.js` (`plug_apart`, `plug_joined`, `goggles`,
`rosary`, `human`, `skeleton`, `galaxy`, `planet`, `tv_hand`, `wormhole`, `orange_ring`…). El
GLB tiene prioridad sobre la versión procedural, se centra y se ajusta solo a radio 1, y se
colorea de abajo a arriba con la paleta global. Quita la entrada para volver a la procedural.
Al disparar una carta, el estado muestra de dónde salió cada figura (`procedural`, `glb:…`).

## Desarrollo

```bash
npm install
npm run dev     # http://localhost:5173
npm run build
```

Requiere un navegador con WebGPU (Chrome/Edge recientes). El despliegue a GitHub Pages
corre con `.github/workflows/deploy.yml` al hacer push a `main`.

## Estructura

```
src/core/      params, flowField, swarm (steering), background (señal), crt (post-proceso)
src/figures/   sampling (primitivas → puntos), un archivo por grupo de metáforas, silhouette (imágenes → volumen), shatter, match, sampleGLB, registry
tools/         make_silhouettes.py + silhouettes.json (imágenes de referencia → máscaras)
src/cards/     cards.js (la lista de metáforas, sus teclas y tiempos), cardPlayer.js
```
