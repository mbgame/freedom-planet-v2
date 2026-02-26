'use client';

import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { getTerrainWorldHeight } from '@/utils/terrain';

// ─── Ultra-Smooth Terrain Configuration ──────────────────────────────────────
const TERRAIN_SIZE = 200;     // Even larger → edges pushed way beyond any normal camera view
const SEGMENTS = 160;         // 160×160 = ~25k vertices → still buttery smooth 60 FPS
const FADE_START = 68;        // Fade begins very far out (full detail in playable area)
const FADE_WIDTH = 48;        // Extremely wide & gentle slope → corners now feel 100% natural
const SEA_LEVEL = 0.05;

// Water plane (extends far beyond terrain)
const WATER_SIZE = 420;
const WATER_Y = SEA_LEVEL - 0.03;

// Poly Haven 1K CC0 textures
const PH = 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k';

const LAYERS = [
  { // 0 – gravelly sand
    diff: `${PH}/gravelly_sand/gravelly_sand_diff_1k.jpg`,
    nor: `${PH}/gravelly_sand/gravelly_sand_nor_gl_1k.jpg`,
    arm: `${PH}/gravelly_sand/gravelly_sand_arm_1k.jpg`,
    scale: 7,
  },
  { // 1 – rocky terrain
    diff: `${PH}/rocky_terrain_02/rocky_terrain_02_diff_1k.jpg`,
    nor: `${PH}/rocky_terrain_02/rocky_terrain_02_nor_gl_1k.jpg`,
    arm: `${PH}/rocky_terrain_02/rocky_terrain_02_arm_1k.jpg`,
    scale: 9,
  },
  { // 2 – aerial grass rock (steep)
    diff: `${PH}/aerial_grass_rock/aerial_grass_rock_diff_1k.jpg`,
    nor: `${PH}/aerial_grass_rock/aerial_grass_rock_nor_gl_1k.jpg`,
    arm: `${PH}/aerial_grass_rock/aerial_grass_rock_arm_1k.jpg`,
    scale: 11,
  },
  { // 3 – snow
    diff: `${PH}/snow_04/snow_04_diff_1k.jpg`,
    nor: `${PH}/snow_04/snow_04_nor_gl_1k.jpg`,
    arm: `${PH}/snow_04/snow_04_arm_1k.jpg`,
    scale: 6,
  },
] as const;

// ─── Super-smooth falloff (quintic = cinematic smoothness) ───────────────────
function quinticSmoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * t * (t * (t * 6 - 15) + 10); // ultra-gentle start + end
}

function blendWeights(h: number, slope: number): [number, number, number, number] {
  const sandW = 1 - quinticSmoothstep(-0.5, 0.4, h); // reuse same smooth function
  const groundW = quinticSmoothstep(-0.3, 0.5, h) * (1 - quinticSmoothstep(1.4, 2.2, h));
  const snowW = quinticSmoothstep(1.6, 2.5, h);

  const rockBlend = quinticSmoothstep(0.38, 0.62, slope);

  let ws = sandW * (1 - rockBlend);
  let wg = groundW * (1 - rockBlend);
  let wr = rockBlend;
  let wn = snowW * (1 - rockBlend * 0.4);

  const total = ws + wg + wr + wn + 1e-6;
  return [ws / total, wg / total, wr / total, wn / total];
}

// ─── GLSL Shaders (unchanged – already optimal) ──────────────────────────────
const vert = /* glsl */`
  attribute vec4 blendW;
  varying vec2 vWXZ;
  varying vec3 vNorm;
  varying vec3 vViewDir;
  varying vec4 vBlend;

  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWXZ = wp.xz;
    vNorm = normalize(normalMatrix * normal);
    vBlend = blendW;

    vec4 mvp = modelViewMatrix * vec4(position, 1.0);
    vViewDir = -mvp.xyz;
    gl_Position = projectionMatrix * mvp;
  }
`;

const frag = /* glsl */`
  uniform sampler2D uD0, uD1, uD2, uD3;
  uniform sampler2D uN0, uN1, uN2, uN3;
  uniform sampler2D uA0, uA1, uA2, uA3;
  uniform float uS0, uS1, uS2, uS3;
  uniform vec3 uLight;
  uniform float uAmbient;

  varying vec2 vWXZ;
  varying vec3 vNorm;
  varying vec3 vViewDir;
  varying vec4 vBlend;

  vec3 unpackNor(vec4 s) { return normalize(s.xyz * 2.0 - 1.0); }

  void main() {
    vec2 uv0 = vWXZ / uS0;
    vec2 uv1 = vWXZ / uS1;
    vec2 uv2 = vWXZ / uS2;
    vec2 uv3 = vWXZ / uS3;

    vec4 diff =
      texture2D(uD0, uv0) * vBlend.x +
      texture2D(uD1, uv1) * vBlend.y +
      texture2D(uD2, uv2) * vBlend.z +
      texture2D(uD3, uv3) * vBlend.w;

    vec4 arm =
      texture2D(uA0, uv0) * vBlend.x +
      texture2D(uA1, uv1) * vBlend.y +
      texture2D(uA2, uv2) * vBlend.z +
      texture2D(uA3, uv3) * vBlend.w;

    float ao = arm.r;
    float rough = arm.g;

    vec3 bn =
      unpackNor(texture2D(uN0, uv0)) * vBlend.x +
      unpackNor(texture2D(uN1, uv1)) * vBlend.y +
      unpackNor(texture2D(uN2, uv2)) * vBlend.z +
      unpackNor(texture2D(uN3, uv3)) * vBlend.w;

    vec3 N = normalize(vNorm + vec3(bn.x, 0.0, bn.y) * 0.55);

    vec3 L = normalize(uLight);
    float NdotL = max(dot(N, L), 0.0);
    vec3 H = normalize(L + normalize(vViewDir));
    float spec = pow(max(dot(N, H), 0.0), max((1.0 - rough) * 48.0, 1.0))
                 * (1.0 - rough) * 0.25;

    vec3 color = diff.rgb * (uAmbient * ao + NdotL) + spec;
    color = pow(clamp(color, 0.0, 1.0), vec3(1.0 / 2.2));

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ─── Component ───────────────────────────────────────────────────────────────
export const TerrainGround: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);

  const maps = useLoader(
    THREE.TextureLoader,
    LAYERS.flatMap((l) => [l.diff, l.nor, l.arm])
  );
  const [d0, n0, a0, d1, n1, a1, d2, n2, a2, d3, n3, a3] = maps;

  useEffect(() => {
    maps.forEach((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 16;
      t.needsUpdate = true;
    });
  }, [maps]);

  // Terrain with ultra-smooth corners
  const terrainGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, SEGMENTS, SEGMENTS);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position as THREE.BufferAttribute;
    const count = pos.count;

    for (let i = 0; i < count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      let h = getTerrainWorldHeight(x, z);

      const dist = Math.hypot(x, z);
      const fade = quinticSmoothstep(FADE_START, FADE_START + FADE_WIDTH, dist);
      h *= (1 - fade); // quintic already super smooth

      pos.setY(i, Math.max(h, SEA_LEVEL));
    }

    pos.needsUpdate = true;
    geo.computeVertexNormals();

    const normals = geo.attributes.normal as THREE.BufferAttribute;
    const blend = new Float32Array(count * 4);

    for (let i = 0; i < count; i++) {
      const slope = 1 - Math.abs(normals.getY(i));
      const height = pos.getY(i);
      const weights = blendWeights(height, slope);
      blend[i * 4] = weights[0];
      blend[i * 4 + 1] = weights[1];
      blend[i * 4 + 2] = weights[2];
      blend[i * 4 + 3] = weights[3];
    }

    geo.setAttribute('blendW', new THREE.BufferAttribute(blend, 4));
    return geo;
  }, []);

  const terrainMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms: {
          uD0: { value: d0 }, uN0: { value: n0 }, uA0: { value: a0 },
          uD1: { value: d1 }, uN1: { value: n1 }, uA1: { value: a1 },
          uD2: { value: d2 }, uN2: { value: n2 }, uA2: { value: a2 },
          uD3: { value: d3 }, uN3: { value: n3 }, uA3: { value: a3 },
          uS0: { value: LAYERS[0].scale },
          uS1: { value: LAYERS[1].scale },
          uS2: { value: LAYERS[2].scale },
          uS3: { value: LAYERS[3].scale },
          uLight: { value: new THREE.Vector3(0.6, 1.0, 0.4).normalize() },
          uAmbient: { value: 0.35 },
        },
      }),
    [d0, n0, a0, d1, n1, a1, d2, n2, a2, d3, n3, a3]
  );

  const waterGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(WATER_SIZE, WATER_SIZE);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  const waterMaterial = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: 0x1e88e5,
        shininess: 18,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
      }),
    []
  );

  return (
    <group ref={groupRef}>
      <mesh
        geometry={terrainGeometry}
        material={terrainMaterial}
        receiveShadow
        castShadow
      />

      <mesh
        geometry={waterGeometry}
        material={waterMaterial}
        position={[0, WATER_Y, 0]}
        receiveShadow
      />
    </group>
  );
};