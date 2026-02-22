'use client';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// ─── ProceduralSky ────────────────────────────────────────────────────────────
//
//  A shader-only sky dome with:
//    • Rayleigh + Mie atmospheric scattering (approximated, GPU-cheap)
//    • Procedural stars with hash noise (visible at night/dusk)
//    • Animated wispy clouds via layered FBM (fractal brownian motion)
//    • Configurable sun position, atmosphere colour, cloud density
//    • Zero textures, zero HTTP requests → instant on mobile
//
//  Mobile perf notes:
//    • Single draw call, single sphere mesh
//    • Shader arithmetic only — no texture samples except two cheap noise calls
//    • 32-segment sphere (same as SkyboxHDR)
//    • depthWrite off, renderOrder -1 → always behind scene
//    • Sphere follows camera via useFrame (no matrix recalc in shader)
// ─────────────────────────────────────────────────────────────────────────────

// ─── Preset system ────────────────────────────────────────────────────────────

export type SkyConfig = {
    label: string;
    // Sun direction (normalized in shader, just set altitude 0-1 and azimuth 0-1)
    sunAltitude: number;  // 0 = horizon, 1 = zenith
    sunAzimuth: number;  // 0..1 maps to 0..2π
    // Rayleigh scattering colour (defines "sky colour")
    rayleigh: [number, number, number];
    // Mie scattering — controls haze/glow around sun
    mieCoeff: number;
    // Overall exposure
    exposure: number;
    // Cloud params
    cloudDensity: number; // 0 = clear, 1 = overcast
    cloudSpeed: number; // cloud drift speed
    cloudColor: [number, number, number];
    // Star visibility (0 = none, 1 = full)
    starIntensity: number;
};

export const SKY_CONFIGS: Record<string, SkyConfig> = {
    alienDay: {
        label: 'Alien Day',
        sunAltitude: 0.35,
        sunAzimuth: 0.22,
        rayleigh: [0.05, 0.12, 0.55],  // deep blue-violet alien sky
        mieCoeff: 0.004,
        exposure: 1.2,
        cloudDensity: 0.35,
        cloudSpeed: 0.012,
        cloudColor: [0.85, 0.82, 0.95],
        starIntensity: 0.0,
    },
    alienDusk: {
        label: 'Alien Dusk',
        sunAltitude: 0.04,
        sunAzimuth: 0.18,
        rayleigh: [0.35, 0.08, 0.22],  // crimson/magenta horizon
        mieCoeff: 0.018,
        exposure: 1.6,
        cloudDensity: 0.5,
        cloudSpeed: 0.008,
        cloudColor: [0.9, 0.5, 0.35],
        starIntensity: 0.4,
    },
    alienNight: {
        label: 'Alien Night',
        sunAltitude: -0.12,
        sunAzimuth: 0.6,
        rayleigh: [0.02, 0.04, 0.18],  // near-black deep blue
        mieCoeff: 0.001,
        exposure: 2.4,
        cloudDensity: 0.2,
        cloudSpeed: 0.005,
        cloudColor: [0.15, 0.18, 0.3],
        starIntensity: 1.0,
    },
    stormyPlanet: {
        label: 'Stormy Planet',
        sunAltitude: 0.18,
        sunAzimuth: 0.45,
        rayleigh: [0.1, 0.15, 0.2],
        mieCoeff: 0.04,
        exposure: 0.9,
        cloudDensity: 0.85,
        cloudSpeed: 0.025,
        cloudColor: [0.4, 0.42, 0.45],
        starIntensity: 0.0,
    },
    goldenWasteland: {
        label: 'Golden Wasteland',
        sunAltitude: 0.08,
        sunAzimuth: 0.3,
        rayleigh: [0.5, 0.25, 0.04],   // warm amber / orange
        mieCoeff: 0.025,
        exposure: 1.3,
        cloudDensity: 0.3,
        cloudSpeed: 0.01,
        cloudColor: [0.95, 0.75, 0.45],
        starIntensity: 0.15,
    },
};

const CONFIG_KEYS = Object.keys(SKY_CONFIGS);
function pickRandom(): SkyConfig {
    return SKY_CONFIGS[CONFIG_KEYS[Math.floor(Math.random() * CONFIG_KEYS.length)]];
}

// ─── Shaders ─────────────────────────────────────────────────────────────────

const vert = /* glsl */`
  varying vec3 vDir;
  void main() {
    // World-space direction from centre of sphere
    vDir = normalize((modelMatrix * vec4(position, 0.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    // Force depth to far plane so sky is always behind everything
    gl_Position.z = gl_Position.w;
  }
`;

const frag = /* glsl */`
  precision mediump float;  // mediump = mobile sweet spot (no visual diff for sky)

  uniform vec3  uSunDir;
  uniform vec3  uRayleigh;
  uniform float uMie;
  uniform float uExposure;
  uniform float uCloudDensity;
  uniform float uCloudSpeed;
  uniform vec3  uCloudColor;
  uniform float uStarIntensity;
  uniform float uTime;

  varying vec3 vDir;

  // ── Hash / noise ──────────────────────────────────────────────────────────
  float hash(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);  // smoothstep
    return mix(
      mix(hash(i),             hash(i + vec2(1,0)), f.x),
      mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
      f.y
    );
  }

  // FBM — 3 octaves (cheap enough for mobile)
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 3; i++) {
      v += a * noise(p);
      p  = p * 2.1 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }

  // ── Atmospheric scattering (Preetham-inspired, simplified) ───────────────
  //  θ = angle between view ray and sun
  vec3 atmosphere(vec3 dir, vec3 sunDir) {
    float cosTheta = dot(dir, sunDir);

    // Rayleigh phase
    float rayleighPhase = 0.75 * (1.0 + cosTheta * cosTheta);

    // Mie phase (Henyey-Greenstein, g=0.76)
    float g = 0.76;
    float miePhase = (1.0 - g*g) /
                     (4.0 * 3.14159 * pow(1.0 + g*g - 2.0*g*cosTheta, 1.5));

    // Height factor: more scattering near horizon
    float h      = max(dir.y, 0.001);
    float depth  = exp(-h * 4.0);       // optical depth approx
    float depthH = exp(-h * 8.0);

    vec3 rayleigh = uRayleigh * rayleighPhase * depth;
    vec3 mie      = vec3(1.0) * uMie * miePhase * depthH;

    // Sun disc
    float sunDisc = smoothstep(0.9994, 0.9998, cosTheta);
    vec3 sun      = vec3(1.5, 1.3, 1.0) * sunDisc;

    // Horizon glow
    float horizon = pow(1.0 - abs(dir.y), 6.0) * 0.3;
    vec3 hGlow    = (uRayleigh * 2.0 + vec3(0.4, 0.2, 0.1)) * horizon;

    return (rayleigh + mie + sun + hGlow);
  }

  // ── Stars ─────────────────────────────────────────────────────────────────
  //
  //  Fix: old version used step(threshold, hash(cell)) which painted the
  //  ENTIRE grid cell white → visible rectangles.
  //
  //  New approach:
  //    1. Split UV into cell id (floor) + local position within cell (fract).
  //    2. Per-cell hash decides IF a star exists and its brightness.
  //    3. Star center is jittered slightly inside the cell (not always corner).
  //    4. Radial smoothstep from center → sharp point, zero at cell edges.
  //    5. Two-layer grid at different scales adds size variety.
  //
  float stars(vec3 dir) {
    if (uStarIntensity < 0.01) return 0.0;

    // Spherical projection to 2-D sky UV
    vec2 sky = vec2(atan(dir.x, dir.z) * 0.15915,   // / (2π)
                    asin(clamp(dir.y,-1.0,1.0)) * 0.31831); // / π

    float result = 0.0;

    // Two layers at different grid densities for size variety
    for (int layer = 0; layer < 2; layer++) {
      float scale = (layer == 0) ? 120.0 : 60.0;
      float size  = (layer == 0) ? 0.08  : 0.13; // fraction of cell radius
      float thresh= (layer == 0) ? 0.984 : 0.972; // sparseness

      vec2 uv   = sky * scale;
      vec2 cell = floor(uv);
      vec2 local = fract(uv); // 0..1 within cell

      float h = hash(cell);
      if (h > thresh) {
        // Jitter the star center inside the cell (avoids grid alignment)
        vec2 jitter = vec2(hash(cell + 17.3), hash(cell + 31.7));
        vec2 center = vec2(0.3) + jitter * 0.4; // stays in 0.3..0.7

        // Distance from this fragment to the star center
        float dist = length(local - center);

        // Radial falloff — smoothstep makes a soft circular point
        float point = 1.0 - smoothstep(0.0, size, dist);
        point = pow(point, 3.0); // sharpen to a tight dot

        // Per-star brightness from hash, twinkle over time
        float brightness = 0.6 + (h - thresh) / (1.0 - thresh) * 0.4;
        float twinkle    = sin(uTime * (2.5 + h * 6.0) + h * 100.0) * 0.12 + 0.88;

        result += point * brightness * twinkle;
      }
    }

    // Fade stars near horizon
    float horizonFade = smoothstep(0.0, 0.15, dir.y);
    return result * horizonFade * uStarIntensity;
  }

  // ── Clouds ────────────────────────────────────────────────────────────────
  float cloudLayer(vec3 dir) {
    if (uCloudDensity < 0.01 || dir.y < -0.05) return 0.0;
    // Project view ray to a flat cloud plane at y=1
    vec2 uv = dir.xz / max(dir.y, 0.05);
    uv *= 0.4;
    uv.x += uTime * uCloudSpeed;
    float f = fbm(uv * 2.5);
    // Shape: threshold + feather
    float threshold = 1.0 - uCloudDensity;
    return smoothstep(threshold, threshold + 0.35, f)
           * smoothstep(-0.05, 0.15, dir.y);  // fade at horizon
  }

  void main() {
    vec3 dir = normalize(vDir);

    // ① Sky colour from scattering
    vec3 sky = atmosphere(dir, normalize(uSunDir));

    // ② Stars (additive)
    sky += stars(dir);

    // ③ Clouds (alpha blend)
    float cMask = cloudLayer(dir);
    // Cloud shading: lit by sun, slightly darker on underside
    float cLight = max(dot(normalize(vec3(uSunDir.x, abs(uSunDir.y), uSunDir.z)), dir), 0.0);
    vec3  cColor = uCloudColor * (0.6 + cLight * 0.4);
    sky = mix(sky, cColor, cMask * 0.85);

    // ④ Tone map + exposure
    sky *= uExposure;
    sky  = sky / (sky + 1.0);                   // Reinhard
    sky  = pow(max(sky, 0.0), vec3(1.0/2.2));   // gamma

    gl_FragColor = vec4(sky, 1.0);
  }
`;

// ─── Component ────────────────────────────────────────────────────────────────

interface ProceduralSkyProps {
    config?: string;   // key from SKY_CONFIGS; omit for random-per-mount
    radius?: number;
    animated?: boolean;  // animate clouds (default true)
}

export const ProceduralSky: React.FC<ProceduralSkyProps> = ({
    config: configKey,
    radius = 900,
    animated = true,
}) => {
    const meshRef = useRef<THREE.Mesh>(null);

    // Pick config once on mount
    const config = useMemo<SkyConfig>(() => {
        if (configKey && SKY_CONFIGS[configKey]) return SKY_CONFIGS[configKey];
        return pickRandom();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Compute sun direction from altitude/azimuth
    const sunDir = useMemo(() => {
        const alt = config.sunAltitude * Math.PI * 0.5;
        const az = config.sunAzimuth * Math.PI * 2.0;
        return new THREE.Vector3(
            Math.cos(alt) * Math.sin(az),
            Math.sin(alt),
            Math.cos(alt) * Math.cos(az),
        ).normalize();
    }, [config]);

    // Geometry: inverted sphere
    const geometry = useMemo(() => {
        const geo = new THREE.SphereGeometry(radius, 32, 32);
        geo.scale(-1, 1, 1);
        return geo;
    }, [radius]);

    // Material
    const material = useMemo(() => new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms: {
            uSunDir: { value: sunDir },
            uRayleigh: { value: new THREE.Vector3(...config.rayleigh) },
            uMie: { value: config.mieCoeff },
            uExposure: { value: config.exposure },
            uCloudDensity: { value: config.cloudDensity },
            uCloudSpeed: { value: config.cloudSpeed },
            uCloudColor: { value: new THREE.Vector3(...config.cloudColor) },
            uStarIntensity: { value: config.starIntensity },
            uTime: { value: 0 },
        },
        depthWrite: false,
        depthTest: false,
        side: THREE.FrontSide,
    }), [config, sunDir]);

    useFrame(({ camera, clock }) => {
        if (meshRef.current) {
            // Follow camera
            meshRef.current.position.copy(camera.position);
            // Update time for cloud drift & star twinkle
            if (animated) {
                (material.uniforms.uTime as THREE.IUniform).value = clock.getElapsedTime();
            }
        }
    });

    return (
        <mesh
            ref={meshRef}
            geometry={geometry}
            material={material}
            renderOrder={-1}
            frustumCulled={false}
        />
    );
};
