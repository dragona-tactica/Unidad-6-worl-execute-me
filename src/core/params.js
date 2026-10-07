import * as THREE from 'three/webgpu';
import { uniform } from 'three/tsl';

// Every knob the performer (or a card) can touch lives here as a uniform:
// changing `.value` never rebuilds a shader, it just feeds the next frame.
export function createParams() {
  const color = (hex) => uniform(new THREE.Color(hex));

  return {
    dt: uniform(1 / 60),

    // FLOW FIELD — the *construction* parameters of the field. Agents never
    // see these directly; they only ask the field "which way here?".
    flowScale: uniform(0.35),
    flowSpeed: uniform(0.25),
    flowTwist: uniform(0.0), // rotates every direction in the field (radians)

    // BACKGROUND AGENTS (the "TV signal")
    bgSpeed: uniform(1.6),
    bgForce: uniform(5.0),
    bgSize: uniform(0.05),
    bgColorA: color('#3e0f6e'),
    bgColorB: color('#ea7525'),
    bgBrightness: uniform(0.26), // behind a figure
    bgIdleBrightness: uniform(0.95), // with no figure: the screen is alive

    // FIGURE SWARM (steering)
    hasTarget: uniform(0.0), // 0 = drift on the flow field, 1 = chase the figure
    maxSpeed: uniform(15.0),
    maxForce: uniform(150.0),
    steerGain: uniform(14.0), // how hard an agent corrects toward its desired velocity (1/s)
    slowRadius: uniform(1.0),
    idleSpeed: uniform(1.1),
    swirl: uniform(0.5), // how much far-away agents still ride the flow while travelling
    shimmer: uniform(0.025), // tiny life added to the figure so it never freezes
    bounds: uniform(7.0),
    particleSize: uniform(0.018),
    figureScale: uniform(2.7),
    rotY: uniform(0.0),
    tiltX: uniform(0.28),

    // Transformation A -> B, driven by one keypress (see cards/cardPlayer.js)
    transformT: uniform(-1.0), // seconds since the sweep began, -1 = not started
    sweep: uniform(0.7), // seconds it takes the sweep to cross the whole figure
    blendReset: uniform(0.0),

    // The palette (from "Paleta de colores.jpg"): a figure's tint 0..1 walks
    // this ramp — deep violet, electric violet, magenta, orange, peach.
    pal0: color('#2a0a4f'),
    pal1: color('#7c09db'),
    pal2: color('#ad28a0'),
    pal3: color('#ea7525'),
    pal4: color('#ffd6a3'),
    hot: color('#fff1dc')
  };
}

export function createCrtParams() {
  return {
    curvature: uniform(0.12),
    scanline: uniform(0.28),
    cell: uniform(2.0), // size of one "pixel" of the fake low-res screen
    levels: uniform(7.0), // dither color levels per channel
    aberration: uniform(0.0016),
    persistence: uniform(0.72), // phosphor afterglow
    noise: uniform(0.05),
    vignette: uniform(0.55),
    roll: uniform(0.0) // vertical-hold bar strength
  };
}
