import { mx_fractal_noise_vec3, normalize, sin, cos, time, vec3 } from 'three/tsl';

// FLOW FIELD — construction only.
// Given a point in space this returns the unit direction the field points
// to there. It knows nothing about agents. How an agent *uses* the answer
// (steer toward it, follow it, ignore it) lives in the agents' own shaders.
//
// The field is fractal noise drifting through time, then every vector is
// rotated by `flowTwist` — one number that turns the whole weather.
export function createFlowField(params) {
  const direction = (p) => {
    const q = p.mul(params.flowScale).add(vec3(0.0, 0.0, time.mul(params.flowSpeed)));
    const n = mx_fractal_noise_vec3(q);
    const a = params.flowTwist;
    const rotated = vec3(
      n.x.mul(cos(a)).sub(n.y.mul(sin(a))),
      n.x.mul(sin(a)).add(n.y.mul(cos(a))),
      n.z
    );
    return normalize(rotated.add(vec3(0.0001, 0.0, 0.0)));
  };

  // Same field, flattened to the screen plane, for the background agents.
  const direction2D = (p) => {
    const d = direction(vec3(p.x, p.y, 0.0));
    return normalize(vec3(d.x, d.y, 0.0).add(vec3(0.0001, 0.0, 0.0)));
  };

  return { direction, direction2D };
}
