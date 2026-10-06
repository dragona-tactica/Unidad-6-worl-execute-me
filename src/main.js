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

const FIGURE_AGENTS = 160000;
const BACKGROUND_AGENTS = 70000;

async function main() {
  const mount = document.querySelector('#app');
  if (!WebGPU.isAvailable()) {
    mount.appendChild(WebGPU.getErrorMessage());
    throw new Error('Este proyecto requiere WebGPU para ejecutar compute shaders.');
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#030204');

  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0.3, 9.5);

  const renderer = new THREE.WebGPURenderer({ antialias: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  mount.appendChild(renderer.domElement);
  await renderer.init();

  // Keep the "glass" illusion: you can lean around a little, not walk behind the TV.
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true;
  orbit.enablePan = false;
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
    <div id="keys">${CARDS.map((c) => `<span><b>${c.key.replace('Digit', '')}</b> ${c.label.split(' · ')[1]}</span>`).join('')}</div>
    <div id="hints"><b>espacio</b> disolver en señal · <b>← →</b> giro · <b>Q / E</b> torcer el campo · <b>W</b> turbulencia · <b>H</b> vertical hold · <b>F</b> pantalla completa</div>`;
  document.body.append(hud);
  const status = hud.querySelector('#status');
  const player = createCardPlayer({
    swarm,
    params,
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
    if (event.code === 'KeyF') {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen?.();
    }
  });
  addEventListener('keyup', (event) => held.delete(event.code));

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // LOOP --------------------------------------------------------------------
  let spin = 0.55; // rad/s, nudged live with the arrow keys
  let twist = 0;
  let roll = 0;
  let last = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    // Performer gestures — all of them only act while a key is held.
    if (held.has('ArrowRight')) spin += dt * 1.6;
    if (held.has('ArrowLeft')) spin -= dt * 1.6;
    if (held.has('KeyQ')) twist += dt * 1.4;
    if (held.has('KeyE')) twist -= dt * 1.4;
    params.flowTwist.value = twist;
    params.flowSpeed.value = held.has('KeyW') ? 0.9 : 0.25;
    roll += ((held.has('KeyH') ? 1 : 0) - roll) * (1 - Math.exp(-dt * 6));
    crt.roll.value = roll;

    params.rotY.value += spin * dt;
    player.update(dt);
    swarm.update(dt);
    background.update();
    orbit.update();
    screen.render();
  });
}

main().catch((error) => {
  console.error(error);
  const pre = document.createElement('pre');
  pre.style.cssText = 'position:fixed;inset:16px;white-space:pre-wrap;color:#fff;z-index:50';
  pre.textContent = String(error?.stack || error);
  document.body.append(pre);
});
