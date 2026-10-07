# World.execute(me)

Instrumento visual en tiempo real para interpretar una canción con agentes autónomos
(Unidad 6): **flow fields** y **steering behaviors**, con flocking y Physarum previstos
para las siguientes cartas. Un televisor CRT viejo (scanlines, curvatura, dithering,
persistencia del fósforo) muestra un enjambre de 160 000 partículas que forman, en 3D y
girando, cada metáfora de la letra. **Nada ocurre solo**: cada metáfora se dispara con una
tecla y no hay análisis de audio ni secuencias automáticas.

## Cartas actuales: los primeros 10 fragmentos

Cada carta sigue la referencia (imagen + indicación) de su carpeta, dura unos 2 s y se
dispara con **una sola tecla**. Todas usan la paleta de `Paleta de colores.jpg`
(violeta profundo → violeta eléctrico → magenta → naranja → durazno).

| Tecla | Fragmento | Qué pasa (figura A → B → C) |
|---|---|---|
| `E` | 01 · Switch on the power line | dos mitades de enchufe con sus cables se acercan y se conectan con chispas |
| `G` | 02 · Remember to put on protection | gafas de laboratorio, una sola pieza sólida (silueta) |
| `S` | 03 · Lay down your pieces | capas de un sándwich en vista explotada → sándwich armado |
| `H` | 04 · And let's begin object creation | cuerpo humano → esqueleto → galaxia espiral |
| `M` | 05 · Fill in my data parameters | líneas de construcción y espiral → mariposas que la recorren |
| `I` | 06 · Initialization | televisor → una mano sale de la pantalla a invitarte |
| `W` | 07 · Set up our new world | el planeta con anillo (el de la primera prueba) |
| `C` | 08 · And let's begin the simulation | rejilla plana → líneas de campo con garganta (agujero de gusano) |
| `P` | 09 · If I'm a set of point | punto → plano con ejes y curva → "POINT OF INFLECTION" |
| `O` | 11 · If I'm a circle | rodaja de naranja con su triángulo punteado y, a un lado, la ecuación "C = 2πr" (sin animación) |

Los tiempos de cada etapa (`at`, `sweep`) están en `src/cards/cards.js`; ninguna carta pasa
de ~2.4 s. El movimiento entre figuras no es una animación: son los agentes persiguiendo
sus nuevos puntos (steering).

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
src/figures/   sampling (primitivas → puntos), una carpeta-archivo por metáfora (plug.js, body.js…), sampleGLB, registry
src/cards/     cards.js (la lista de metáforas, sus teclas y tiempos), cardPlayer.js
```
