import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import WebGPU from 'three/addons/capabilities/WebGPU.js';
import './styles.css';

import { createParams, createCrtParams } from './core/params.js';
import { createFlowField } from './core/flowField.js';
import { createBackground } from './core/background.js';
import { createSwarm } from './core/swarm.js';
import { createCRT } from './core/crt.js';
import { CARDS } from './cards/cards.js';
import { createCardPlayer } from './cards/cardPlayer.js';
import { createDiagnostics } from './ui/diagnostics.js';

const FIGURE_AGENTS = 160000;
const BACKGROUND_AGENTS = 70000;

async function main() {
  const mount = document.querySelector('#app');
  const diagnostics = createDiagnostics({ count: FIGURE_AGENTS });
  if (!WebGPU.isAvailable()) {
    mount.appendChild(WebGPU.getErrorMessage());
    throw new Error('Este proyecto requiere WebGPU para ejecutar compute shaders.');
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0a0118');

  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, -0.15, 9.5);

  const renderer = new THREE.WebGPURenderer({ antialias: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  mount.appendChild(renderer.domElement);
  await renderer.init();
  diagnostics.attach(renderer);

  // Keep the "glass" illusion: you can lean around a little, not walk behind the TV.
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true;
  orbit.enablePan = false;
  orbit.target.set(0, -0.55, 0); // figures sit a little above center, clear of the HUD
  orbit.minDistance = 4;
  orbit.maxDistance = 16;
  orbit.minAzimuthAngle = -0.7;
  orbit.maxAzimuthAngle = 0.7;
  orbit.minPolarAngle = 1.0;
  orbit.maxPolarAngle = 2.1;

  const params = createParams();
  const crt = createCrtParams();
  const flow = createFlowField(params);
  const background = await createBackground({ renderer, scene, params, flow, count: BACKGROUND_AGENTS });
  const swarm = await createSwarm({ renderer, scene, params, flow, count: FIGURE_AGENTS });
  const screen = createCRT({ renderer, scene, camera, crt });

  // HUD ---------------------------------------------------------------------
  const hud = document.createElement('div');
  hud.className = 'hud';
  hud.innerHTML = `
    <div id="status">señal</div>
    <div id="keys">${CARDS.map((c) => `<span><b>${c.key.replace('Key', '').replace('Digit', '').replace('Minus', '−').replace('Equal', '=')}</b> ${c.short ?? c.label}</span>`).join('')}</div>
    <div id="hints"><b>espacio</b> disolver en señal · <b>← →</b> giro · <b>↑ ↓</b> torcer el campo · <b>shift</b> turbulencia · <b>&#96;</b> vertical hold · <b>enter</b> pantalla completa</div>`;
  document.body.append(hud);
  const status = hud.querySelector('#status');
  const player = createCardPlayer({
    swarm,
    count: FIGURE_AGENTS,
    onStatus: (text) => (status.textContent = text)
  });

  // INPUT -------------------------------------------------------------------
  const held = new Set();
  addEventListener('keydown', (event) => {
    if (event.repeat) return;
    held.add(event.code);
    const card = CARDS.find((c) => c.key === event.code);
    if (card) player.trigger(card);
    if (event.code === 'Space') {
      event.preventDefault();
      player.dissolve();
    }
    if (event.code === 'Enter') {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen?.();
    }
  });
  addEventListener('keyup', (event) => held.delete(event.code));

  // Build every card (figures + the pairing between their stages) in the
  // background, so a keypress never waits.
  (async () => {
    for (const card of CARDS) {
      await player.prepare(card);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  })();

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // LOOP --------------------------------------------------------------------
  let spin = 1; // multiplier on the card's own turning, nudged with the arrow keys
  let twist = 0;
  let roll = 0;
  let blur = 0;
  let angle = 0;
  let clock = 0;
  let last = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    clock += dt;

    // Performer gestures — all of them only act while a key is held.
    if (held.has('ArrowRight')) spin += dt * 1.6;
    if (held.has('ArrowLeft')) spin -= dt * 1.6;
    if (held.has('ArrowUp')) twist += dt * 1.4;
    if (held.has('ArrowDown')) twist -= dt * 1.4;
    params.flowTwist.value = twist;
    params.flowSpeed.value = held.has('ShiftLeft') || held.has('ShiftRight') ? 0.9 : 0.25;
    roll += ((held.has('Backquote') ? 1 : 0) - roll) * (1 - Math.exp(-dt * 6));
    crt.roll.value = roll;

    // How the current figure turns: keep spinning, or rock like a stage prop.
    const motion = player.active?.motion ?? { spin: 0.5 };
    if (motion.sway) params.rotY.value = Math.sin(clock * 0.9) * motion.sway * spin;
    else {
      angle += (motion.spin ?? 0.5) * spin * dt;
      params.rotY.value = angle;
    }

    player.update(dt);
    swarm.update(dt);
    // While the swarm is travelling the screen holds on to the glow, so you
    // see trails of particles forming the figure; at rest it stays sharp.
    // Card effects (the screen going out of focus, ...) ease in and out.
    const wantBlur = player.active?.effects?.blur ?? 0;
    blur += (wantBlur - blur) * (1 - Math.exp(-dt * 4));
    crt.blur.value = blur;
    crt.persistence.value = 0.5 + 0.18 * swarm.agitation;
    background.update();
    orbit.update();
    screen.render();
    diagnostics.tick();
  });
}

main().catch((error) => {
  console.error(error);
  const pre = document.createElement('pre');
  pre.style.cssText = 'position:fixed;inset:16px;white-space:pre-wrap;color:#fff;z-index:50';
  pre.textContent = String(error?.stack || error);
  document.body.append(pre);
});
