import * as THREE from 'three/webgpu';
import {
  Fn,
  hash,
  instanceIndex,
  instancedArray,
  max,
  min,
  mix,
  mod,
  uint,
  vec3,
  vec4
} from 'three/tsl';

// THE TV SIGNAL — a layer of agents behind the figures that does nothing
// but follow the flow field. Same steering rule as the swarm (desired
// velocity from the field, force-limited), but with no targets at all, so
// what you see is the field itself: the weather of the screen.
const HALF_W = 14;
const HALF_H = 8;

export async function createBackground({ renderer, scene, params, flow, count }) {
  const positions = instancedArray(count, 'vec3');
  const velocities = instancedArray(count, 'vec3');

  const init = Fn(() => {
    const i = instanceIndex;
    const x = hash(i.add(uint(101))).mul(2.0).sub(1.0).mul(HALF_W);
    const y = hash(i.add(uint(102))).mul(2.0).sub(1.0).mul(HALF_H);
    const z = hash(i.add(uint(103))).mul(-3.0).sub(3.0);
    positions.element(i).assign(vec3(x, y, z));
    velocities.element(i).assign(vec3(0.0));
  })().compute(count).setName('Background init');

  const update = Fn(() => {
    const i = instanceIndex;
    const p0 = positions.element(i);
    const v0 = velocities.element(i);
    const dt = params.dt;

    const desired = flow.direction2D(p0).mul(params.bgSpeed);
    const steer = desired.sub(v0);
    const limited = steer.mul(min(params.bgForce.div(max(steer.length(), 0.0001)), 1.0));
    const v1 = v0.add(limited.mul(dt));
    const moved = p0.add(v1.mul(dt));

    // Wrap around the screen edges.
    const wrapped = vec3(
      mod(moved.x.add(HALF_W), HALF_W * 2).sub(HALF_W),
      mod(moved.y.add(HALF_H), HALF_H * 2).sub(HALF_H),
      moved.z
    );
    positions.element(i).assign(wrapped);
    velocities.element(i).assign(v1);
  })().compute(count).setName('Background update');

  const material = new THREE.SpriteNodeMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  material.positionNode = positions.toAttribute();
  material.scaleNode = params.bgSize;
  material.colorNode = Fn(() => {
    const speed = velocities.toAttribute().length().div(params.bgSpeed).clamp(0.0, 1.0);
    return vec4(mix(params.bgColorA, params.bgColorB, speed).mul(params.bgBrightness), 1.0);
  })();
  material.opacityNode = params.bgBrightness.mul(0.8);

  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, count);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  scene.add(mesh);

  renderer.compute(init);

  return {
    update() {
      renderer.compute(update);
    }
  };
}
