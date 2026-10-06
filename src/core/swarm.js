import * as THREE from 'three/webgpu';
import {
  Fn,
  cos,
  hash,
  instanceIndex,
  instancedArray,
  max,
  min,
  mix,
  oneMinus,
  select,
  sin,
  smoothstep,
  storage,
  uint,
  uv,
  vec3,
  vec4
} from 'three/tsl';

// THE SWARM — the agents that become the figures.
//
// Every agent has a position and a velocity and nothing else it can "see":
//   · its own assigned target point (A or B stage) in the current figure
//   · the flow field at its own position
// From those two it computes a *desired velocity* and steers toward it with
// a limited force (Reynolds): steer = clamp(desired - velocity, maxForce).
//   · no figure          -> desired = flow direction      (it drifts like TV snow)
//   · figure             -> desired = "arrive" at target   (eases in, no overshoot)
//                           + a little flow while still far away (a swarm, not a laser)
export async function createSwarm({ renderer, scene, params, flow, count }) {
  const positions = instancedArray(count, 'vec3');
  const velocities = instancedArray(count, 'vec3');
  const colors = instancedArray(count, 'vec3');
  const blends = instancedArray(count, 'float'); // 0 = stage A, 1 = stage B

  // Target clouds (x, y, z, tint) for stage A and B, refilled from the CPU
  // whenever a card changes — see setCard().
  const targetAData = new THREE.StorageBufferAttribute(new Float32Array(count * 4), 4);
  const targetBData = new THREE.StorageBufferAttribute(new Float32Array(count * 4), 4);
  const targetA = storage(targetAData, 'vec4', count);
  const targetB = storage(targetBData, 'vec4', count);

  const rotY = (v, a) => vec3(v.x.mul(cos(a)).add(v.z.mul(sin(a))), v.y, v.z.mul(cos(a)).sub(v.x.mul(sin(a))));
  const rotX = (v, a) => vec3(v.x, v.y.mul(cos(a)).sub(v.z.mul(sin(a))), v.y.mul(sin(a)).add(v.z.mul(cos(a))));
  const ramp = (c0, c1, c2, t) =>
    mix(mix(c0, c1, smoothstep(0.0, 0.5, t)), c2, smoothstep(0.5, 1.0, t));

  const init = Fn(() => {
    const i = instanceIndex;
    const a = hash(i.add(uint(11))).mul(2.0).sub(1.0);
    const b = hash(i.add(uint(23))).mul(2.0).sub(1.0);
    const c = hash(i.add(uint(37))).mul(2.0).sub(1.0);
    positions.element(i).assign(vec3(a, b, c).mul(4.5));
    velocities.element(i).assign(vec3(0.0));
    blends.element(i).assign(0.0);
    colors.element(i).assign(ramp(params.colA0, params.colA1, params.colA2, hash(i.add(uint(5)))));
  })().compute(count).setName('Swarm init');

  const update = Fn(() => {
    const i = instanceIndex;
    const p0 = positions.element(i);
    const v0 = velocities.element(i);
    const b0 = blends.element(i);
    const tA = targetA.element(i);
    const tB = targetB.element(i);
    const dt = params.dt;

    // Per-agent personality: no two arrive at exactly the same speed.
    const rndDelay = hash(i.add(uint(7)));
    const rndSpeed = hash(i.add(uint(19)));

    // STAGE A -> B. The sweep starts at the top of the figure and crosses
    // downward (with noise), so the figure visibly *melts* into the next one.
    const height = tA.y.mul(0.5).add(0.5).clamp(0.0, 1.0);
    const delay = oneMinus(height).mul(0.7).add(rndDelay.mul(0.3));
    const started = params.transformT.greaterThanEqual(0.0);
    const wantsB = select(started.and(params.transformT.greaterThanEqual(delay.mul(params.sweep))), 1.0, 0.0);
    const rate = dt.div(0.8);
    const moved = b0.add(wantsB.sub(b0).clamp(rate.negate(), rate));
    const blend = select(params.blendReset.greaterThan(0.5), 0.0, moved);
    const eased = smoothstep(0.0, 1.0, blend);

    // The assigned target, spun in 3D by the performer's rotation.
    const local = mix(tA.xyz, tB.xyz, eased).mul(params.figureScale);
    const world = rotX(rotY(local, params.rotY), params.tiltX);
    const alive = flow.direction(world.mul(1.7)).mul(params.shimmer);
    const target = world.add(alive);

    // PERCEPTION: flow under my feet, and the vector to my target.
    const f = flow.direction(p0);
    const toTarget = target.sub(p0);
    const dist = toTarget.length();

    // ACTION: "arrive" — full speed far away, easing to zero at the target.
    const slow = min(dist.div(params.slowRadius), 1.0);
    const arrive = toTarget.div(max(dist, 0.0001)).mul(params.maxSpeed).mul(slow).mul(rndSpeed.mul(0.5).add(0.8));
    const swirlAmount = min(dist.div(2.0), 1.0).mul(params.swirl);
    const chase = arrive.add(f.mul(swirlAmount));
    const drift = f.mul(params.idleSpeed);
    const desired = mix(drift, chase, params.hasTarget);

    // STEERING: limited force toward the desired velocity.
    const steer = desired.sub(v0);
    const steerLen = steer.length();
    const limited = steer.mul(min(params.maxForce.div(max(steerLen, 0.0001)), 1.0));
    const v1 = v0.add(limited.mul(dt));

    // Soft container so idle drift never wanders off-screen.
    const r = p0.length();
    const over = max(r.sub(params.bounds), 0.0);
    const v2 = v1.sub(p0.div(max(r, 0.001)).mul(over).mul(3.0).mul(dt));

    positions.element(i).assign(p0.add(v2.mul(dt)));
    velocities.element(i).assign(v2);
    blends.element(i).assign(blend);

    const colorA = ramp(params.colA0, params.colA1, params.colA2, tA.w);
    const colorB = ramp(params.colB0, params.colB1, params.colB2, tB.w);
    colors.element(i).assign(mix(colorA, colorB, eased));
  })().compute(count).setName('Swarm update');

  // RENDER ------------------------------------------------------------
  const material = new THREE.SpriteNodeMaterial({
    depthWrite: true,
    depthTest: true,
    transparent: false,
    alphaTest: 0.5
  });
  material.positionNode = positions.toAttribute();
  material.scaleNode = params.particleSize;
  material.colorNode = Fn(() => {
    const speed = velocities.toAttribute().length();
    const glow = speed.div(params.maxSpeed).clamp(0.0, 1.0).mul(0.45);
    return vec4(mix(colors.toAttribute().xyz, params.hot, glow), 1.0);
  })();
  material.opacityNode = oneMinus(smoothstep(0.4, 0.5, uv().xy.sub(0.5).length()));

  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, count);
  mesh.frustumCulled = false;
  scene.add(mesh);

  let hasTargetGoal = 0;
  let resetFrames = 0;

  renderer.compute(init);

  return {
    count,
    // Point the whole swarm at a card: stage A (and optionally B).
    setCard(figureA, figureB) {
      const second = figureB ?? figureA;
      targetAData.array.set(figureA.points);
      targetAData.needsUpdate = true;
      targetBData.array.set(second.points);
      targetBData.needsUpdate = true;
      params.colA0.value.set(figureA.colors[0]);
      params.colA1.value.set(figureA.colors[1]);
      params.colA2.value.set(figureA.colors[2]);
      params.colB0.value.set(second.colors[0]);
      params.colB1.value.set(second.colors[1]);
      params.colB2.value.set(second.colors[2]);
      params.transformT.value = -1;
      resetFrames = 1; // one frame where every agent snaps back to stage A
      hasTargetGoal = 1;
    },
    // Let go of the figure: agents go back to drifting on the flow field.
    release() {
      params.transformT.value = -1;
      hasTargetGoal = 0;
    },
    update(dt) {
      params.dt.value = dt;
      params.hasTarget.value += (hasTargetGoal - params.hasTarget.value) * (1 - Math.exp(-dt * 3.0));
      params.blendReset.value = resetFrames > 0 ? 1 : 0;
      if (resetFrames > 0) resetFrames--;
      renderer.compute(update);
    }
  };
}
