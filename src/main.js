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
import { createCodeLayer } from './ui/codeLayer.js';
import { loadLyrics, lyricLines } from './cards/lyrics.js';
import { createErrorLayer } from './ui/errorLayer.js';

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
  // The set list: the cards in the order of the song. Space walks through it.
  const SET = CARDS.filter((c) => c.id !== 'preview');
  const KEYNAME = (key) => key.replace('Key', '').replace('Digit', '').replace('Minus', '−').replace('Equal', '=').replace('Period', '.');
  const hud = document.createElement('div');
  hud.className = 'hud';
  hud.innerHTML = `
    <div id="status">señal</div>
    <div id="keys">${SET.map((c, i) => `<span><b>${i + 1}</b> ${c.short ?? c.label}${c.key ? ` <i>${KEYNAME(c.key)}</i>` : ''}</span>`).join('')}</div>
    <div id="hints"><b>espacio</b> siguiente (la primera vez oculta estas indicaciones) · <b>⌫</b> anterior · <b>supr</b> disolver en señal · <b>W</b> reiniciar todo · <b>/</b> mostrar u ocultar indicaciones · <b>A</b> aberración cromática · <b>E</b> + error · <b>R</b> − error · <b>T</b> barrido que borra los errores · <b>← →</b> giro · <b>↑ ↓</b> torcer el campo · <b>shift</b> turbulencia · <b>&#96;</b> vertical hold · <b>enter</b> pantalla completa</div>`;
  document.body.append(hud);
  const status = hud.querySelector('#status');

  // Two layers above everything else, independent of the swarm: the verses
  // typed as code, and error windows that pile up (`e`), go away (`r`) or are
  // wiped by a scan bar (`t`).
  const code = createCodeLayer(document.body);
  const errors = createErrorLayer(document.body);
  const player = createCardPlayer({
    swarm,
    count: FIGURE_AGENTS,
    onStatus: (text) => (status.textContent = text)
  });

  // INPUT -------------------------------------------------------------------
  const held = new Set();
  let step = -1; // where we are in the set list
  let lyrics = null;
  loadLyrics().then((blocks) => (lyrics = blocks));
  let aberrationOn = false;
  const fire = (card) => {
    step = SET.indexOf(card);
    player.trigger(card);
    code.type(lyricLines(lyrics, card));
  };
  const letGo = () => {
    player.dissolve();
    code.release();
  };
  addEventListener('keydown', (event) => {
    if (event.repeat) return;
    held.add(event.code);
    const card = CARDS.find((c) => c.key === event.code);
    if (card) fire(card);
    if (event.code === 'Space') {
      event.preventDefault();
      hud.style.display = 'none'; // the indications leave the screen
      if (step + 1 < SET.length) fire(SET[step + 1]);
      else letGo();
    }
    if (event.code === 'Backspace') {
      event.preventDefault();
      if (step > 0) fire(SET[step - 1]);
    }
    if (event.code === 'Delete') letGo();
    if (event.code === 'KeyW' || event.code === 'Home') {
      // restart the whole show: first card next, everything cleared
      player.dissolve();
      step = -1;
      aberrationOn = false;
      errors.clear();
      code.clear();
      hud.style.display = '';
    }
    if (event.code === 'Slash') hud.style.display = hud.style.display === 'none' ? '' : 'none';
    if (event.code === 'KeyA') aberrationOn = !aberrationOn;
    if (event.code === 'KeyE') errors.add();
    if (event.code === 'KeyR') errors.removeLast();
    if (event.code === 'KeyT') errors.sweep();
    if (event.code === 'Enter') {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen?.();
    }
  });
  addEventListener('keyup', (event) => held.delete(event.code));

  // Build every card (figures + the pairing between their stages) in the
  // background, so a keypress never waits.
  (async () => {
    // with ?preview only the previewed model is prepared, so it shows up fast
    const previewing = new URLSearchParams(location.search).get('preview');
    for (const card of previewing ? CARDS.filter((c) => c.id === 'preview') : CARDS) {
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
  let fxAberration = 0; // card effects ease in and out
  let fxShimmer = 0;
  let fxTurbulence = 0;
  let fxRoll = 0;
  let floodFor = null;
  let floodSpawned = 0;
  let floodAt = 0;
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
    const fx = player.active?.effects ?? {};
    const ease = 1 - Math.exp(-dt * 3);
    fxAberration += ((fx.aberration ?? 0) - fxAberration) * ease;
    fxShimmer += ((fx.shimmer ?? 0) - fxShimmer) * ease;
    fxTurbulence += ((fx.turbulence ?? 0) - fxTurbulence) * ease;
    fxRoll += ((fx.roll ?? 0) - fxRoll) * ease;
    params.flowTwist.value = twist + fxTurbulence * Math.sin(clock * 0.9) * 1.4;
    const stirred = held.has('ShiftLeft') || held.has('ShiftRight') ? 0.9 : 0.25;
    params.flowSpeed.value = stirred + (0.95 - stirred) * fxTurbulence;
    params.shimmer.value = 0.025 + fxShimmer;
    roll += ((held.has('Backquote') ? 1 : 0) - roll) * (1 - Math.exp(-dt * 6));
    crt.roll.value = Math.max(roll, fxRoll * (0.5 + 0.5 * Math.sin(clock * 5.0)));
    crt.aberration.value = 0.0016 + (aberrationOn ? 0.0065 : 0) + fxAberration;

    // A card whose effect is "errors pile up" opens its windows after the key
    // press: the card's own clock decides how many are due.
    if (player.active !== floodFor || player.elapsed < floodAt) {
      floodFor = player.active;
      floodSpawned = 0;
    }
    floodAt = player.elapsed;
    if (fx.errors) {
      const due = Math.min(fx.errors.count, Math.floor(player.elapsed / fx.errors.every) + 1);
      while (floodSpawned < due) {
        errors.add();
        floodSpawned++;
      }
    }

    // How the current figure turns: keep spinning, or rock like a stage prop.
    const motion = player.active?.motion ?? { spin: 0.5 };
    // A rocking figure starts facing the viewer (angle 0 at the keypress) and
    // swings a little to each side; it never turns all the way around.
    if (motion.sway) params.rotY.value = Math.sin(player.elapsed * 1.1) * motion.sway * spin;
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
