# World.execute(me)

Instrumento visual en tiempo real para interpretar una canción con agentes autónomos
(Unidad 6): **flow fields** y **steering behaviors**, con flocking y Physarum previstos
para las siguientes cartas. Un televisor CRT viejo (scanlines, curvatura, dithering,
persistencia del fósforo) muestra un enjambre de 160 000 partículas que forman, en 3D y
girando, cada metáfora de la letra. **Nada ocurre solo**: cada metáfora se dispara con una
tecla y no hay análisis de audio ni secuencias automáticas.

## Prueba actual: las primeras 10 metáforas

| Tecla | Metáfora | Figuras (etapa A → B) |
|---|---|---|
| `1` | Enciende el interruptor, enchufa el cable | enchufe con su cable |
| `2` | Protección | gafas de laboratorio + cruz roja |
| `3` | Cargan las columnas de partículas | base plana → columnas que crecen |
| `4` | Algo se materializa | cubo de alambre → cubo sólido |
| `5` | Los parámetros se ajustan, como al editar una foto | panel de sliders → sliders movidos |
| `6` | Se crea un planeta | planeta con anillo |
| `7` | La pantalla comienza la simulación | monitor apagado → encendido con ▶ |
| `8` | Un punto y sus dimensiones | punto → punto con ejes |
| `9` | Un anillo y su circunferencia | anillo → anillo con marcas y radio |
| `0` | La onda y las tangentes | onda seno → onda con tangentes |

Cada carta se dispara con **una sola tecla**. En las de dos etapas, el enjambre forma la
figura A, espera `hold` segundos y un barrido de arriba hacia abajo la convierte en la B.
El movimiento no es una animación: son los agentes persiguiendo sus nuevos puntos.

### Otros controles
- `espacio`: disolver la figura y volver a la señal (el flow field).
- `←` `→`: velocidad de giro de la figura.
- `Q` / `E`: torcer el flow field (todo el "clima" de la pantalla).
- `W` (mantener): turbulencia. `H` (mantener): vertical hold del televisor.
- `F`: pantalla completa. Ratón: inclinarse un poco alrededor de la pantalla.

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

## Cómo reemplazar una figura por tu propio modelo 3D

1. Pon un `.glb` en `public/models/`.
2. Añádelo a `public/models/manifest.json`:

```json
{
  "figures": {
    "planet": { "file": "mi-planeta.glb", "rotate": [0, 0, 0], "colors": ["#10306e", "#4fbf6a", "#f2d79b"] }
  }
}
```

Las llaves son los ids de `src/figures/registry.js` (`plug`, `goggles_cross`, `columns`,
`box_solid`, `planet`, `monitor_on`, `sine_tangents`…). El GLB tiene prioridad sobre la
versión procedural, se centra y se ajusta solo a radio 1, y se colorea de abajo (tinta 0)
a arriba (tinta 1) con la rampa de `colors`. Quita la entrada para volver a la procedural.
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
src/figures/   sampling (primitivas → puntos), procedural (las figuras), sampleGLB, registry
src/cards/     cards.js (la lista de metáforas y sus teclas), cardPlayer.js
```
