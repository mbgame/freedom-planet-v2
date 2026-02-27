'use client';

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { useControls } from 'leva';
import * as THREE from 'three';
import { useGameStore, MoonData } from '@/store/gameStore';

const SHOW_CONTROLS = process.env.NEXT_PUBLIC_SHOW_CONTROLS === 'true';

const DEFAULT_PLANET_VALUES = {
    bumpScale: 0.05,
    displacementScale: 0.0,
    displacementBias: 0.0,
    roughness: 0.6,
    metalness: 0.2,
    emissiveIntensity: 0.01,
    emissiveColor: '#001a33',
    normalScale: 0.1,
};

// Realistic atmosphere shaders — thin Fresnel rim with sun-side brightening
const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewDirection;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vViewDirection = normalize(worldPosition.xyz - cameraPosition);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmosphereFragmentShader = `
  uniform vec3 glowColor;
  uniform vec3 sunDirection;
  uniform float atmosphereIntensity;
  uniform float rayleighCoefficient;
  uniform float mieCoefficient;
  uniform float scatteringPower;
  uniform float hazeOpacity;
  
  varying vec3 vNormal;
  varying vec3 vViewDirection;
  
  void main() {
    // 1. Core vectors
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewDirection);
    vec3 lightDir = normalize(sunDirection);
    
    // 2. Fresnel / Rim effect
    float dotNV = dot(normal, -viewDir);
    float fresnel = pow(1.0 - max(0.0, dotNV), scatteringPower);
    
    // 3. Rayleigh Scattering Approximation (Blue sky effect)
    // Strongest at the edges and in the direction of the light
    float cosTheta = dot(-viewDir, lightDir);
    float rayleighPhase = 0.75 * (1.0 + cosTheta * cosTheta);
    vec3 rayleighColor = glowColor * rayleighCoefficient * rayleighPhase;
    
    // 4. Mie Scattering Approximation (Sunset/Haze effect)
    // Forward scattering towards the sun
    float g = 0.85; // Anisotropy
    float miePhase = 1.5 * ((1.0 - g * g) / (2.0 + g * g)) * pow(1.0 + g * g - 2.0 * g * cosTheta, -1.5);
    vec3 mieColor = vec3(1.0, 0.9, 0.8) * mieCoefficient * miePhase;
    
    // 5. Sun side weighting
    float sunFactor = max(0.0, dot(normal, lightDir));
    
    // 6. Final Composition
    vec3 atmosphereColor = (rayleighColor + mieColor) * (0.5 + 0.5 * sunFactor);
    atmosphereColor += glowColor * 0.05; // Ambient atmospheric glow
    
    // Alpha falloff
    float alpha = fresnel * atmosphereIntensity * hazeOpacity;
    
    // Enhance brightness on sun-side rim
    alpha *= (0.2 + 0.8 * sunFactor);
    
    gl_FragColor = vec4(atmosphereColor, alpha);
  }
`;

export const Atmosphere: React.FC<{ color: string; intensity: number }> = ({ color, intensity }) => {
    const meshRef = useRef<THREE.Mesh>(null);

    const { directPosition } = useControls('Scene Lighting', {
        directPosition: { x: 10, y: 10, z: 5 },
    }, { collapsed: true });

    const atmosphereControls = useControls('Atmosphere', {
        rayleighCoefficient: { value: 0.8, min: 0, max: 2, step: 0.01 },
        mieCoefficient: { value: 0.14, min: 0, max: 0.5, step: 0.01 },
        scatteringPower: { value: 8.0, min: 1, max: 20, step: 0.1 },
        hazeOpacity: { value: 0.17, min: 0, max: 1, step: 0.01 },
    }, { collapsed: true });

    const uniforms = useMemo(() => ({
        glowColor: { value: new THREE.Color(color) },
        sunDirection: { value: new THREE.Vector3() },
        atmosphereIntensity: { value: intensity },
        rayleighCoefficient: { value: atmosphereControls.rayleighCoefficient },
        mieCoefficient: { value: atmosphereControls.mieCoefficient },
        scatteringPower: { value: atmosphereControls.scatteringPower },
        hazeOpacity: { value: atmosphereControls.hazeOpacity },
    }), []);

    useFrame(() => {
        if (meshRef.current) {
            uniforms.sunDirection.value.set(directPosition.x, directPosition.y, directPosition.z).normalize();
            uniforms.glowColor.value.set(color);
            uniforms.atmosphereIntensity.value = intensity;
            uniforms.rayleighCoefficient.value = atmosphereControls.rayleighCoefficient;
            uniforms.mieCoefficient.value = atmosphereControls.mieCoefficient;
            uniforms.scatteringPower.value = atmosphereControls.scatteringPower;
            uniforms.hazeOpacity.value = atmosphereControls.hazeOpacity;
        }
    });

    return (
        <mesh ref={meshRef} scale={2.15}>
            <sphereGeometry args={[1, 64, 64]} />
            <shaderMaterial
                uniforms={uniforms}
                vertexShader={atmosphereVertexShader}
                fragmentShader={atmosphereFragmentShader}
                side={THREE.BackSide}
                blending={THREE.AdditiveBlending}
                transparent
                depthWrite={false}
            />
        </mesh>
    );
};

// Cloud layer component
export const CloudLayer: React.FC = () => {
    const meshRef = useRef<THREE.Mesh>(null);
    const cloudMap = useTexture('/textures/planet/clouds.jpg');

    useFrame((_, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += delta * 0.05; // Slower, more majestic rotation
        }
    });

    return (
        <mesh ref={meshRef} scale={2.02}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshStandardMaterial
                map={cloudMap}
                transparent
                opacity={0.35}
                blending={THREE.AdditiveBlending}
                side={THREE.FrontSide}
                depthWrite={false}
            />
        </mesh>
    );
};


const Moon: React.FC<{ data: MoonData; index: number; controls: any }> = ({ data, index, controls }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const focusMoon = useGameStore(state => state.focusMoon);
    const view = useGameStore(state => state.view);

    // Determine texture paths based on moon index
    const moonFolder = index === 0 ? 'Moon_001_Textures' : index === 1 ? 'Moon_002_Textures' : 'Moon_003_Textures';
    const moonPrefix = index === 0 ? 'Moon_001_' : index === 1 ? 'Moon_002_' : 'Moon_003_';
    const moonSuffix = '_2048x1024';

    const albedoName = `${moonPrefix}Albedo${moonSuffix}.png`;
    const normalName = `${moonPrefix}Normal${moonSuffix}.jpg`;
    const displacementName = `${moonPrefix}Displacement${moonSuffix}.png`;

    const [colorMap, normalMap, displacementMap] = useTexture([
        `/textures/moons/${moonFolder}/${albedoName}`,
        `/textures/moons/${moonFolder}/${normalName}`,
        `/textures/moons/${moonFolder}/${displacementName}`
    ]);

    useFrame(({ clock }) => {
        if (meshRef.current) {
            // Simple orbit animation
            const t = clock.getElapsedTime() * data.speed + data.angle;
            meshRef.current.position.x = Math.cos(t) * data.distance;
            meshRef.current.position.z = Math.sin(t) * data.distance;

            // Self rotation
            meshRef.current.rotation.y += 0.005;
        }
    });

    return (
        <mesh
            ref={meshRef}
            scale={data.size}
            onClick={(e) => {
                if (view === 'ORBIT') {
                    e.stopPropagation();
                    focusMoon(data);
                }
            }}
            onPointerOver={() => {
                if (view === 'ORBIT') document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => document.body.style.cursor = 'auto'}
        >
            <sphereGeometry args={[1, 64, 64]} />
            <meshStandardMaterial
                map={colorMap}
                normalMap={normalMap}
                normalScale={new THREE.Vector2(1.0, 1.0)}
                displacementMap={displacementMap}
                displacementScale={controls.displacementScale * 0.5}
                displacementBias={controls.displacementBias * 0.5}
                roughness={0.9}
                metalness={0.05}
            />
        </mesh>
    );
};

export const Planet: React.FC = () => {
    const meshRef = useRef<THREE.Mesh>(null);
    const view = useGameStore(state => state.view);
    const moons = useGameStore(state => state.moons);

    const planetControls = useControls('Planet Material', {
        bumpScale: { value: DEFAULT_PLANET_VALUES.bumpScale, min: 0, max: 0.5, step: 0.01 },
        displacementScale: { value: DEFAULT_PLANET_VALUES.displacementScale, min: -1, max: 1, step: 0.01 },
        displacementBias: { value: DEFAULT_PLANET_VALUES.displacementBias, min: -1, max: 1, step: 0.01 },
        roughness: { value: DEFAULT_PLANET_VALUES.roughness, min: 0, max: 1, step: 0.01 },
        metalness: { value: DEFAULT_PLANET_VALUES.metalness, min: 0, max: 1, step: 0.01 },
        emissiveIntensity: { value: DEFAULT_PLANET_VALUES.emissiveIntensity, min: 0, max: 2, step: 0.1 },
        emissiveColor: DEFAULT_PLANET_VALUES.emissiveColor,
        normalScale: { value: DEFAULT_PLANET_VALUES.normalScale, min: 0, max: 5, step: 0.1 },
        atmosphereColor: '#4bbfff',
        showAtmosphere: { value: true, label: 'Show Atmosphere' },
        atmosphereIntensity: { value: 0.35, min: 0, max: 2, step: 0.01 },
    }, { collapsed: true });

    // Load textures
    const [colorMap, normalMap, specularMap] = useTexture([
        '/textures/planet/398/planet_diffuseMap_Gaia_seed620.png',
        '/textures/planet/398/planet_normalMap_Gaia_seed620.png',
        '/textures/planet/398/planet_specularMap_Gaia_seed620.png'
    ]);

    useFrame((_, delta) => {
        if (meshRef.current) {
            // Rotation logic
            const rotationSpeed = (view === 'ORBIT' || view === 'TRANSITION') ? 0.09 : 0.01;
            meshRef.current.rotation.y += delta * rotationSpeed;
        }
    });

    return (
        <group>
            {/* Main planet */}
            <mesh ref={meshRef}>
                <sphereGeometry args={[2, 256, 256]} />
                <meshStandardMaterial
                    map={colorMap}
                    normalMap={normalMap}
                    normalScale={new THREE.Vector2(planetControls.normalScale, planetControls.normalScale)}
                    roughnessMap={specularMap}
                    bumpMap={normalMap} // Using normal as bump since displacement is missing for planet
                    bumpScale={planetControls.bumpScale}
                    roughness={planetControls.roughness}
                    metalness={planetControls.metalness}
                    emissive={planetControls.emissiveColor}
                    emissiveIntensity={planetControls.emissiveIntensity}
                    envMapIntensity={1.5}
                />
            </mesh>

            {/* Wireframe overlay */}
            {/* <mesh rotation={meshRef.current?.rotation}>
                <sphereGeometry args={[2.01, 32, 32]} />
                <meshBasicMaterial
                    color="#0044ff"
                    wireframe
                    transparent
                    opacity={0.04}
                />
            </mesh> */}

            {/* Moons */}
            {moons.map((moon, index) => (
                <Moon key={moon.id} data={moon} index={index} controls={planetControls} />
            ))}

            {/* Cloud layer */}
            <CloudLayer />

            {/* Atmosphere glow */}
            {planetControls.showAtmosphere && (
                <Atmosphere
                    color={planetControls.atmosphereColor}
                    intensity={planetControls.atmosphereIntensity}
                />
            )}
        </group>
    );
};
