import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, MoonData } from '@/store/gameStore';

// Fixed atmosphere shader
const atmosphereVertexShader = `
  uniform vec3 viewVector;
  varying float intensity;
  
  void main() {
    vec3 vNormal = normalize(normalMatrix * normal);
    vec3 vNormel = normalize(normalMatrix * viewVector);
    intensity = pow(0.7 - dot(vNormal, vNormel), 3.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmosphereFragmentShader = `
  uniform vec3 glowColor;
  varying float intensity;
  
  void main() {
    vec3 glow = glowColor * intensity;
    gl_FragColor = vec4(glow, intensity * 0.8);
  }
`;

export const Atmosphere: React.FC = () => {
    const meshRef = useRef<THREE.Mesh>(null);
    const { camera } = useThree();

    const uniforms = useMemo(() => ({
        glowColor: { value: new THREE.Color('#00bfff') },
        viewVector: { value: new THREE.Vector3() },
    }), []);

    useFrame(() => {
        if (meshRef.current) {
            uniforms.viewVector.value.subVectors(camera.position, meshRef.current.position);
        }
    });

    return (
        <mesh ref={meshRef} scale={2.2}>
            <sphereGeometry args={[1, 64, 64]} />
            <shaderMaterial
                uniforms={uniforms}
                vertexShader={atmosphereVertexShader}
                fragmentShader={atmosphereFragmentShader}
                side={THREE.BackSide}
                blending={THREE.AdditiveBlending}
                transparent
            />
        </mesh>
    );
};

// Cloud layer component
export const CloudLayer: React.FC = () => {
    const meshRef = useRef<THREE.Mesh>(null);
    const cloudMap = useTexture('/textures/clouds.jpg');

    useFrame((_, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += delta * 0.035; // Slower than planet
        }
    });

    return (
        <mesh ref={meshRef} scale={2.025}>
            <sphereGeometry args={[1, 64, 64]} />
            <meshStandardMaterial
                map={cloudMap}
                transparent
                opacity={0.4}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
                depthWrite={false}
            />
        </mesh>
    );
};


const Moon: React.FC<{ data: MoonData }> = ({ data }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const focusMoon = useGameStore(state => state.focusMoon);
    const view = useGameStore(state => state.view);

    const [colorMap, normalMap, displacementMap] = useTexture([
        '/textures/Moon_002_basecolor.png',
        '/textures/Moon_002_normal.png',
        '/textures/Moon_002_height.png'
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
                displacementMap={displacementMap}
                displacementScale={0.05}
                color={data.color}
                roughness={0.8}
                metalness={0.1}
            />
        </mesh>
    );
};

export const Planet: React.FC = () => {
    const meshRef = useRef<THREE.Mesh>(null);
    const view = useGameStore(state => state.view);
    const moons = useGameStore(state => state.moons);

    // Load textures
    const [colorMap, normalMap, specularMap] = useTexture([
        '/textures/daymap.jpg',
        '/textures/normal.jpg',
        '/textures/specular.jpg'
    ]);

    useFrame((_, delta) => {
        if (meshRef.current) {
            // Rotation logic
            const rotationSpeed = view === 'ORBIT' ? 0.05 : 0.01;
            meshRef.current.rotation.y += delta * rotationSpeed;
        }
    });

    return (
        <group>
            {/* Main planet */}
            <mesh ref={meshRef}>
                <sphereGeometry args={[2, 128, 128]} />
                <meshStandardMaterial
                    map={colorMap}
                    normalMap={normalMap}
                    roughnessMap={specularMap}
                    roughness={0.8}
                    metalness={0.2}
                    emissive="#1a1a2e"
                    emissiveIntensity={0.1}
                />
            </mesh>

            {/* Wireframe overlay */}
            <mesh rotation={meshRef.current?.rotation}>
                <sphereGeometry args={[2.01, 32, 32]} />
                <meshBasicMaterial
                    color="#0044ff"
                    wireframe
                    transparent
                    opacity={0.04}
                />
            </mesh>

            {/* Moons */}
            {moons.map(moon => (
                <Moon key={moon.id} data={moon} />
            ))}

            {/* Cloud layer */}
            <CloudLayer />

            {/* Atmosphere glow */}
            <Atmosphere />
        </group>
    );
};
