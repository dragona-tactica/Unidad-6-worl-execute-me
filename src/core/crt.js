import * as THREE from 'three/webgpu';
import {
  Fn,
  convertToTexture,
  dot,
  float,
  floor,
  fract,
  mix,
  mod,
  pass,
  screenCoordinate,
  screenSize,
  sin,
  smoothstep,
  time,
  vec2,
  vec3,
  vec4
} from 'three/tsl';
import { afterImage } from 'three/addons/tsl/display/AfterImageNode.js';
import { barrelUV, barrelMask, vignette } from 'three/addons/tsl/display/CRT.js';

// THE TELEVISION — a post-process over the 3D render:
//   phosphor afterglow -> chunky "pixels" -> barrel-curved glass ->
//   RGB fringing -> scanlines -> signal noise -> vertical-hold roll ->
//   vignette -> ordered (Bayer) dithering to a handful of colors.
export function createCRT({ renderer, scene, camera, crt }) {
  const scenePass = pass(scene, camera);
  const glow = afterImage(scenePass.getTextureNode(), crt.persistence);
  const tex = convertToTexture(glow);

  // 4x4 Bayer threshold built from the 2x2 one: B2 = 2x + 3y - 4xy.
  const bayer2 = (c) => c.x.mul(2.0).add(c.y.mul(3.0)).sub(c.x.mul(c.y).mul(4.0));
  const bayer4 = (cell) => {
    const fine = mod(cell, 2.0);
    const coarse = mod(floor(cell.div(2.0)), 2.0);
    return bayer2(fine).mul(4.0).add(bayer2(coarse)).add(0.5).div(16.0);
  };

  const output = Fn(() => {
    const cell = floor(screenCoordinate.xy.div(crt.cell));
    const flat = cell.add(0.5).mul(crt.cell).div(screenSize);

    const curved = barrelUV(crt.curvature, flat);
    const inside = barrelMask(curved);

    // Vertical-hold roll: a soft bright band sliding down the glass.
    const rollY = fract(curved.y.add(time.mul(0.12)));
    const band = smoothstep(0.0, 0.06, rollY).mul(float(1.0).sub(smoothstep(0.06, 0.2, rollY)));
    const tear = band.mul(crt.roll).mul(0.02);
    const sampleUV = vec2(curved.x.add(tear), curved.y);

    const shift = vec2(crt.aberration, 0.0);
    const r = tex.sample(sampleUV.add(shift)).r;
    const g = tex.sample(sampleUV).g;
    const b = tex.sample(sampleUV.sub(shift)).b;
    let color = vec3(r, g, b);

    // Scanlines: every other pixel-row darker.
    color = color.mul(float(1.0).sub(mod(cell.y, 2.0).mul(crt.scanline)));

    // Signal snow + the roll band brightening the picture.
    const snow = fract(sin(dot(cell.add(vec2(time.mul(37.0), time.mul(11.0))), vec2(12.9898, 78.233))).mul(43758.5453));
    color = color.add(snow.sub(0.5).mul(crt.noise)).add(band.mul(crt.roll).mul(0.08));

    color = vignette(color, crt.vignette, float(0.5), curved);

    // Ordered dithering: few colors, visible pattern — the pixel-art look.
    const steps = crt.levels.sub(1.0);
    color = floor(color.clamp(0.0, 1.0).mul(steps).add(bayer4(cell))).div(steps);

    return vec4(color.mul(inside), 1.0);
  })();

  const pipeline = new THREE.RenderPipeline(renderer);
  pipeline.outputNode = output;

  return {
    render() {
      pipeline.render();
    }
  };
}
