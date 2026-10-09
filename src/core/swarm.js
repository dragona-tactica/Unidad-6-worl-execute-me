import * as THREE from 'three/webgpu';
import {
  Fn,
  atan,
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
  // tint 0..1 -> the 5-stop palette ramp
  const ramp = (t) => {
    const s = t.clamp(0.0, 1.0).mul(4.0);
    const a = mix(params.pal0, params.pal1, s.clamp(0.0, 1.0));
    const b = mix(a, params.pal2, s.sub(1.0).clamp(0.0, 1.0));
    const c = mix(b, params.pal3, s.sub(2.0).clamp(0.0, 1.0));
    return mix(c, params.pal4, s.sub(3.0).clamp(0.0, 1.0));
  };

  const init = Fn(() => {
    const i = instanceIndex;
    const a = hash(i.add(uint(11))).mul(2.0).sub(1.0);
    const b = hash(i.add(uint(23))).mul(2.0).sub(1.0);
    const c = hash(i.add(uint(37))).mul(2.0).sub(1.0);
    positions.element(i).assign(vec3(a, b, c).mul(4.5));
    velocities.element(i).assign(vec3(0.0));
    blends.element(i).assign(0.0);
    colors.element(i).assign(ramp(hash(i.add(uint(5))).mul(0.65).add(0.35)));
  })().compute(count).setName('Swarm init');

  const update = Fn(() => {
    const i = instanceIndex;
    const p0r = positions.element(i);
    const v0r = velocities.element(i);
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
    const topDown = oneMinus(height).mul(0.7).add(rndDelay.mul(0.3));
    // Angular sweeps go around params.sweepCenter: a ring being drawn (by
    // where the agent is going) or unrolled (by where it comes from).
    const turn = (t) => atan(t.y.sub(params.sweepCenter.y), t.x.sub(params.sweepCenter.x)).div(6.28318).add(0.5);
    const aroundA = turn(tA).mul(0.88).add(rndDelay.mul(0.12));
    const aroundB = turn(tB).mul(0.88).add(rndDelay.mul(0.12));
    const delay = select(params.sweepMode.lessThan(0.5), topDown, select(params.sweepMode.lessThan(1.5), aroundA, aroundB));
    const started = params.transformT.greaterThanEqual(0.0);
    const wantsB = select(started.and(params.transformT.greaterThanEqual(delay.mul(params.sweep))), 1.0, 0.0);
    const rate = dt.div(params.blendTime);
    const moved = b0.add(wantsB.sub(b0).clamp(rate.negate(), rate));
    const blend = select(params.blendReset.greaterThan(0.5), 0.0, moved);
    const eased = smoothstep(0.0, 1.0, blend);

    // Parts that MOVE once formed. A target's tint carries a "kind": 0..1 is a
    // still point, 2..3 rides the rigid motion (a rocket flying along a curve),
    // 4..5 slides along x and wraps (a wave that travels). The agents simply
    // keep chasing their moving target — nothing is rebuilt.
    const kindOf = (w) => w.add(0.01).div(2.0).floor();
    const place = (t) => {
      const kind = kindOf(t.w);
      const c = cos(params.moverRot);
      const s = sin(params.moverRot);
      const rigid = vec3(t.x.mul(c).sub(t.y.mul(s)), t.x.mul(s).add(t.y.mul(c)), t.z).add(params.moverPos);
      const slid = t.x.add(params.moverShift).add(1.0);
      const wave = vec3(slid.sub(slid.div(2.0).floor().mul(2.0)).sub(1.0), t.y, t.z);
      return select(kind.equal(1.0), rigid, select(kind.equal(2.0), wave, t.xyz));
    };
    const tintA = tA.w.sub(kindOf(tA.w).mul(2.0));
    const tintB = tB.w.sub(kindOf(tB.w).mul(2.0));

    // A wave point that wraps around the edge hops over to the other side
    // instead of flying across the whole screen.
    const wrapX = (t, shift) => {
      const slid = t.x.add(shift).add(1.0);
      return slid.sub(slid.div(2.0).floor().mul(2.0)).sub(1.0);
    };
    const hopped = (t) => kindOf(t.w).equal(2.0).and(wrapX(t, params.moverShift).sub(wrapX(t, params.moverShiftPrev)).abs().greaterThan(1.0));
    const wraps = hopped(tA).or(hopped(tB));

    // The assigned target, spun in 3D by the performer's rotation.
    const local = mix(place(tA), place(tB), eased).mul(params.figureScale);
    const world = rotX(rotY(local, params.rotY), params.tiltX);
    const alive = flow.direction(world.mul(1.7)).mul(params.shimmer);
    const target = world.add(alive);
    const p0 = select(wraps, target, p0r);
    const v0 = select(wraps, vec3(0.0), v0r);

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
    const steer = desired.sub(v0).mul(params.steerGain);
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

    // With no figure the agents are bright TV snow (random walk along the
    // palette); the figure's own colors take over as hasTarget rises.
    const snow = ramp(rndSpeed.mul(0.65).add(0.35));
    colors.element(i).assign(mix(snow, mix(ramp(tintA), ramp(tintB), eased), params.hasTarget));
  })().compute(count).setName('Swarm update');

  // RENDER ------------------------------------------------------------
  const material = new THREE.SpriteNodeMaterial({
    depthWrite: true,
    depthTest: true,
    transparent: false,
    alphaTest: 0.5
  });
  material.positionNode = positions.toAttribute();
  // Moving agents are bigger and hotter, so you can *see* them travel.
  material.scaleNode = params.particleSize.mul(velocities.toAttribute().length().div(params.maxSpeed).clamp(0.0, 1.0).mul(0.6).add(1.0));
  material.colorNode = Fn(() => {
    const speed = velocities.toAttribute().length();
    const glow = speed.div(params.maxSpeed).clamp(0.0, 1.0).mul(0.28);
    return vec4(mix(colors.toAttribute().xyz, params.hot, glow), 1.0);
  })();
  material.opacityNode = oneMinus(smoothstep(0.4, 0.5, uv().xy.sub(0.5).length()));

  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, count);
  mesh.frustumCulled = false;
  scene.add(mesh);

  const baseSpeed = { maxSpeed: params.maxSpeed.value, maxForce: params.maxForce.value, steerGain: params.steerGain.value };
  let animation = null; // { fill(frame, array), fps } — targets that walk (animated models)
  let animClock = 0;
  let animFrame = -1;
  let hasTargetGoal = 0;
  let resetFrames = 0;
  let morphing = false;
  let morphElapsed = 0;
  let morphLength = 0;
  let agitation = 0; // 1 right after a card starts or morphs, then fades: drives the afterglow

  renderer.compute(init);

  // B becomes the new A (same points), so a finished morph can be followed
  // by another one without any visible jump.
  const commit = () => {
    targetAData.array.set(targetBData.array);
    targetAData.needsUpdate = true;
    params.transformT.value = -1;
    resetFrames = 1; // every agent's blend returns to 0, now pointing at the same cloud
    morphing = false;
  };

  return {
    count,
    setBlendTime(seconds) {
      params.blendTime.value = seconds;
    },
    // How briskly the agents rush toward their targets (1 = normal). Used by a
    // stage that has to appear fast.
    // Rigid motion / wave shift of the moving parts (see params.moverPos).
    setMover(pos = [0, 0, 0], rot = 0, shift = 0) {
      params.moverPos.value.set(pos[0], pos[1], pos[2]);
      params.moverRot.value = rot;
      params.moverShiftPrev.value = params.moverShift.value;
      params.moverShift.value = shift;
    },
    setSpeed(multiplier) {
      params.maxSpeed.value = baseSpeed.maxSpeed * multiplier;
      params.maxForce.value = baseSpeed.maxForce * multiplier;
      params.steerGain.value = baseSpeed.steerGain * multiplier;
    },
    // 0..1: how recently the swarm was told to move (see main.js, afterglow).
    get agitation() {
      return agitation;
    },
    // A card starts: the whole swarm flows to this figure.
    begin(figure) {
      agitation = 1;
      animation = figure.animation ?? null;
      animClock = 0;
      animFrame = -1;
      targetAData.array.set(figure.points);
      targetAData.needsUpdate = true;
      targetBData.array.set(figure.points);
      targetBData.needsUpdate = true;
      params.transformT.value = -1;
      morphing = false;
      resetFrames = 1;
      hasTargetGoal = 1;
    },
    // The next figure of the card: a sweep melts the current one into it.
    morphTo(figure, sweepSeconds, mode = 0, center = [0, 0]) {
      agitation = 1;
      if (morphing) commit();
      params.sweepMode.value = mode;
      params.sweepCenter.value.set(center[0], center[1]);
      targetBData.array.set(figure.points);
      targetBData.needsUpdate = true;
      params.sweep.value = sweepSeconds;
      params.transformT.value = 0;
      morphing = true;
      morphElapsed = 0;
      morphLength = sweepSeconds + params.blendTime.value + 0.05;
    },
    // Let go of the figure: agents go back to drifting on the flow field.
    release() {
      animation = null;
      params.transformT.value = -1;
      morphing = false;
      hasTargetGoal = 0;
    },
    update(dt) {
      params.dt.value = dt;
      if (animation) {
        animClock += dt;
        const frame = Math.floor(animClock * animation.fps);
        if (frame !== animFrame) {
          animFrame = frame;
          animation.fill(frame, targetAData.array);
          animation.fill(frame, targetBData.array);
          targetAData.needsUpdate = true;
          targetBData.needsUpdate = true;
        }
      }
      agitation = Math.max(0, agitation - dt / 1.1);
      params.hasTarget.value += (hasTargetGoal - params.hasTarget.value) * (1 - Math.exp(-dt * 6.0));
      if (morphing) {
        morphElapsed += dt;
        params.transformT.value = morphElapsed;
        if (morphElapsed >= morphLength) commit();
      }
      params.blendReset.value = resetFrames > 0 ? 1 : 0;
      if (resetFrames > 0) resetFrames--;
      renderer.compute(update);
    }
  };
}
