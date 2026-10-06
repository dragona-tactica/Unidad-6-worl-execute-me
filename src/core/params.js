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
    bgColorA: color('#14202a'),
    bgColorB: color('#8fd0e8'),
    bgBrightness: uniform(0.65),

    // FIGURE SWARM (steering)
    hasTarget: uniform(0.0), // 0 = drift on the flow field, 1 = chase the figure
    maxSpeed: uniform(7.0),
    maxForce: uniform(34.0),
    slowRadius: uniform(1.4),
    idleSpeed: uniform(1.1),
    swirl: uniform(0.9), // how much far-away agents still ride the flow while travelling
    shimmer: uniform(0.025), // tiny life added to the figure so it never freezes
    bounds: uniform(7.0),
    particleSize: uniform(0.018),
    figureScale: uniform(2.3),
    rotY: uniform(0.0),
    tiltX: uniform(0.28),

    // Transformation A -> B, driven by one keypress (see cards/cardPlayer.js)
    transformT: uniform(-1.0), // seconds since the sweep began, -1 = not started
    sweep: uniform(2.2), // seconds it takes the sweep to cross the whole figure
    blendReset: uniform(0.0),

    // Per-figure color ramps (dark -> mid -> highlight), A and B stage
    colA0: color('#1a2a33'),
    colA1: color('#6fa8bd'),
    colA2: color('#e6f4ff'),
    colB0: color('#1a2a33'),
    colB1: color('#6fa8bd'),
    colB2: color('#e6f4ff'),
    hot: color('#ffffff')
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
