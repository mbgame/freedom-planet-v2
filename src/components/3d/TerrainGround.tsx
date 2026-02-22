'use client';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { getTerrainWorldHeight } from '@/utils/terrain';

// ─── Poly Haven 1K texture URLs (CC0 license) ─────────────────────────────────
//
//  Layer 0 → gravelly_sand      : coarse dusty sand/grit   → low/flat areas
//  Layer 1 → rocky_terrain_02   : rocks + grass patches    → mid elevations
//  Layer 2 → aerial_grass_rock  : moss/grass over cliff    → steep slopes
//  Layer 3 → snow_04            : rough field snow         → peaks
//
//  Maps used: diff (albedo), nor_gl (OpenGL normal), arm (AO+Rough+Metal)
// ─────────────────────────────────────────────────────────────────────────────

const PH = 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k';

const LAYERS = [
    { // 0 – sand
        diff: `${PH}/gravelly_sand/gravelly_sand_diff_1k.jpg`,
        nor: `${PH}/gravelly_sand/gravelly_sand_nor_gl_1k.jpg`,
        arm: `${PH}/gravelly_sand/gravelly_sand_arm_1k.jpg`,
        scale: 7,
    },
    { // 1 – ground / rocky terrain
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

// ─── Blend helpers ────────────────────────────────────────────────────────────

function smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

/** Returns [sand, ground, rock, snow] blend weights. */
function blendWeights(h: number, slope: number): [number, number, number, number] {
    const sandW = 1 - smoothstep(-0.5, 0.4, h);
    const groundW = smoothstep(-0.3, 0.5, h) * (1 - smoothstep(1.4, 2.2, h));
    const snowW = smoothstep(1.6, 2.5, h);
    // Steep slope → aerial_grass_rock overrides elevation layers
    const rockBlend = smoothstep(0.38, 0.62, slope);

    let ws = sandW * (1 - rockBlend);
    let wg = groundW * (1 - rockBlend);
    let wr = rockBlend;
    let wn = snowW * (1 - rockBlend * 0.4);

    const total = ws + wg + wr + wn + 1e-6;
    return [ws / total, wg / total, wr / total, wn / total];
}

// ─── GLSL ─────────────────────────────────────────────────────────────────────

const vert = /* glsl */`
  attribute vec4 blendW;
  varying   vec2 vWXZ;
  varying   vec3 vNorm;
  varying   vec3 vViewDir;
  varying   vec4 vBlend;

  void main() {
    vec4 wp  = modelMatrix * vec4(position, 1.0);
    vWXZ     = wp.xz;
    vNorm    = normalize(normalMatrix * normal);
    vBlend   = blendW;
    vec4 mvp = modelViewMatrix * vec4(position, 1.0);
    vViewDir = -mvp.xyz;
    gl_Position = projectionMatrix * mvp;
  }
`;

const frag = /* glsl */`
  uniform sampler2D uD0, uD1, uD2, uD3; // diffuse
  uniform sampler2D uN0, uN1, uN2, uN3; // normals
  uniform sampler2D uA0, uA1, uA2, uA3; // ARM
  uniform float     uS0, uS1, uS2, uS3; // tiling scale (world units per repeat)
  uniform vec3      uLight;
  uniform float     uAmbient;

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

    // Blend diffuse
    vec4 diff =
      texture2D(uD0, uv0) * vBlend.x +
      texture2D(uD1, uv1) * vBlend.y +
      texture2D(uD2, uv2) * vBlend.z +
      texture2D(uD3, uv3) * vBlend.w;

    // Blend ARM (R=AO, G=rough, B=metal)
    vec4 arm =
      texture2D(uA0, uv0) * vBlend.x +
      texture2D(uA1, uv1) * vBlend.y +
      texture2D(uA2, uv2) * vBlend.z +
      texture2D(uA3, uv3) * vBlend.w;
    float ao   = arm.r;
    float rough = arm.g;

    // Blend normal maps then lean them into vertex normal
    vec3 bn =
      unpackNor(texture2D(uN0, uv0)) * vBlend.x +
      unpackNor(texture2D(uN1, uv1)) * vBlend.y +
      unpackNor(texture2D(uN2, uv2)) * vBlend.z +
      unpackNor(texture2D(uN3, uv3)) * vBlend.w;
    // Perturb vertex normal (XZ = tangent, Y = up on flat terrain)
    vec3 N = normalize(vNorm + vec3(bn.x, 0.0, bn.y) * 0.55);

    // Lighting
    vec3  L     = normalize(uLight);
    float NdotL = max(dot(N, L), 0.0);
    vec3  H     = normalize(L + normalize(vViewDir));
    float spec  = pow(max(dot(N, H), 0.0), max((1.0 - rough) * 48.0, 1.0))
                  * (1.0 - rough) * 0.25;

    vec3 color = diff.rgb * (uAmbient * ao + NdotL) + spec;
    // Gamma
    color = pow(clamp(color, 0.0, 1.0), vec3(1.0 / 2.2));
    gl_FragColor = vec4(color, 1.0);
  }
`;

// ─── Component ────────────────────────────────────────────────────────────────

export const TerrainGround: React.FC = () => {
    const meshRef = useRef<THREE.Mesh>(null);

    // Load all 12 maps in one call (suspense-compatible)
    const maps = useLoader(THREE.TextureLoader, LAYERS.flatMap(l => [l.diff, l.nor, l.arm]));
    const [d0, n0, a0, d1, n1, a1, d2, n2, a2, d3, n3, a3] = maps;

    useMemo(() => {
        maps.forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; });
    }, [maps]);

    const geometry = useMemo(() => {
        const geo = new THREE.PlaneGeometry(60, 60, 64, 64);
        geo.rotateX(-Math.PI / 2);
        const pos = geo.attributes.position;
        const n = pos.count;

        for (let i = 0; i < n; i++) pos.setY(i, getTerrainWorldHeight(pos.getX(i), pos.getZ(i)));
        pos.needsUpdate = true;
        geo.computeVertexNormals();

        const normals = geo.attributes.normal;
        const bw = new Float32Array(n * 4);
        for (let i = 0; i < n; i++) {
            const slope = 1 - Math.abs(normals.getY(i));
            const [ws, wg, wr, wn] = blendWeights(pos.getY(i), slope);
            bw[i * 4] = ws; bw[i * 4 + 1] = wg; bw[i * 4 + 2] = wr; bw[i * 4 + 3] = wn;
        }
        geo.setAttribute('blendW', new THREE.BufferAttribute(bw, 4));
        return geo;
    }, []);

    const material = useMemo(() => new THREE.ShaderMaterial({
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
    }), [d0, n0, a0, d1, n1, a1, d2, n2, a2, d3, n3, a3]);

    return <mesh ref={meshRef} geometry={geometry} material={material} receiveShadow />;
};
