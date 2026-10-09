import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

// Loads a .glb/.gltf/.fbx into a THREE.Group with world matrices ready.
//
// Some exporters write materials with KHR_materials_pbrSpecularGlossiness,
// which current three.js no longer understands, so their textures would be
// silently dropped. This plugin brings back just the part we need: the
// diffuse color and diffuse texture.
function specularGlossinessDiffuse(parser) {
  return {
    name: 'KHR_materials_pbrSpecularGlossiness',
    getMaterialType: (index) => (parser.json.materials[index]?.extensions?.KHR_materials_pbrSpecularGlossiness ? THREE.MeshStandardMaterial : null),
    extendMaterialParams: (index, params) => {
      const ext = parser.json.materials[index]?.extensions?.KHR_materials_pbrSpecularGlossiness;
      if (!ext) return Promise.resolve();
      params.color = new THREE.Color(1, 1, 1);
      if (ext.diffuseFactor) {
        params.color.setRGB(ext.diffuseFactor[0], ext.diffuseFactor[1], ext.diffuseFactor[2], THREE.LinearSRGBColorSpace);
      }
      return ext.diffuseTexture ? parser.assignTexture(params, 'map', ext.diffuseTexture, THREE.SRGBColorSpace) : Promise.resolve();
    }
  };
}

// With `keepAnimations` the whole glTF result is returned ({ scene, animations })
// instead of just the scene.
export async function loadModel(url, { keepAnimations = false } = {}) {
  const ext = url.split('?')[0].split('.').pop().toLowerCase();
  let root;
  if (ext === 'fbx') {
    root = await new FBXLoader().loadAsync(url);
  } else {
    const loader = new GLTFLoader();
    loader.register(specularGlossinessDiffuse);
    const gltf = await loader.loadAsync(url);
    root = gltf.scene;
    root.updateMatrixWorld(true);
    if (keepAnimations) return gltf;
  }
  root.updateMatrixWorld(true);
  return root;
}
