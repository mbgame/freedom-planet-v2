'use client';
import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { useGameStore } from '@/store/gameStore';
import { Structure } from './Structure';
import { getTerrainWorldHeight } from '@/utils/terrain';
import { TerrainGround } from './TerrainGround';
import { SkyboxHDR } from './Skyboxhdr';
import { ProceduralSky } from './ProceduralSky';
import { Environment } from '@react-three/drei';

// Optimized StarField with instancing
export const StarField: React.FC<{ count?: number }> = ({ count = 3000 }) => {
  const points = useMemo(() => {
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Spherical distribution
      const r = 40 + Math.random() * 60;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }

    return positions;
  }, [count]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={points}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color="white"
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

// Procedural terrain ground with improved variation
// const TerrainGround: React.FC = () => {
//   const meshRef = useRef<THREE.Mesh>(null);

//   const geometry = useMemo(() => {
//     const size = 60;
//     const segments = 48; // keep low for mobile
//     const geo = new THREE.PlaneGeometry(size, size, segments, segments);
//     geo.rotateX(-Math.PI / 2);

//     const pos = geo.attributes.position;
//     const colors = new Float32Array(pos.count * 3);

//     for (let i = 0; i < pos.count; i++) {
//       const x = pos.getX(i);
//       const z = pos.getZ(i);

//       // Get world height from shared utility
//       const h = getTerrainWorldHeight(x, z);
//       pos.setY(i, h);

//       // Vertex colors: Brighter rocky surface with detail noise
//       const noise = (Math.sin(x * 5.0) * Math.cos(z * 5.0)) * 0.1;
//       const brightness = 0.15 + (Math.abs(h) * 0.1) + noise;
//       colors[i * 3] = brightness * 0.6;     // R
//       colors[i * 3 + 1] = brightness * 0.7; // G
//       colors[i * 3 + 2] = brightness * 1.0; // B
//     }

//     geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
//     geo.computeVertexNormals();
//     return geo;
//   }, []);

//   return (
//     <mesh ref={meshRef} geometry={geometry} receiveShadow>
//       <meshStandardMaterial
//         vertexColors
//         roughness={0.9}
//         metalness={0.1}
//       />
//     </mesh>
//   );
// };

// Surface Lighting component that follows the focused object
const SurfaceLighting: React.FC = () => {
  const selectedNode = useGameStore(state => state.selectedNode);
  const focusedStructureIndex = useGameStore(state => state.focusedStructureIndex);
  const lightRef = useRef<THREE.PointLight>(null);
  const targetPos = useRef(new THREE.Vector3());

  useFrame((_state, delta) => {
    if (selectedNode && lightRef.current) {
      const structures = selectedNode.structures;
      const current = structures[focusedStructureIndex] || structures[0];

      if (current) {
        // Position light slightly above and in front of the focused structure
        targetPos.current.set(
          current.position[0],
          current.position[1] + 4,
          current.position[2]
        );
        lightRef.current.position.lerp(targetPos.current, delta * 3);
      }
    }
  });

  return (
    <>
      {/* Atmosphere-aware ambient fill */}
      <hemisphereLight
        intensity={0.6}
        color="#4bbfff"
        groundColor="#1e293b"
      />

      {/* Main sun source with optimized shadows for mobile */}
      <directionalLight
        position={[20, 15, 10]}
        intensity={2.2}
        color="#ffffff"
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />

      {/* rim/fill light to ensure silhouettes aren't crushed */}
      <directionalLight
        position={[-10, 5, -10]}
        intensity={0.4}
        color="#00ffff"
      />

      {/* Dynamic light that tracks the active model to ensure it's always clear */}
      <pointLight
        ref={lightRef}
        intensity={1.8}
        distance={20}
        decay={1.5}
        color="#ffffff"
      />

      {/* PBR Environmental lighting - Essential for MeshStandardMaterial sheen */}
      <Environment preset="night" />
    </>
  );
};

// Surface scene with terrain and structures
export const SurfaceScene: React.FC<{ isPreloading?: boolean }> = ({ isPreloading = false }) => {
  const nodes = useGameStore(state => state.nodes);
  const selectedNodeFromStore = useGameStore(state => state.selectedNode);

  // Use either the selected node or the first available node for preloading
  const selectedNode = selectedNodeFromStore || (isPreloading ? nodes[0] : null);

  const nextStructure = useGameStore(state => state.nextStructure);
  const prevStructure = useGameStore(state => state.prevStructure);

  const { gl } = useThree();
  const touchStart = useRef(0);


  // Handle swipe gestures - Only add listeners if NOT preloading
  useEffect(() => {
    if (isPreloading) return;

    const canvas = gl.domElement;
    const setNavigationOffset = useGameStore.getState().setNavigationOffset;

    const onDown = (e: PointerEvent) => {
      touchStart.current = e.clientX;
      canvas.setPointerCapture(e.pointerId);
    };

    const onMove = (e: PointerEvent) => {
      if (touchStart.current === 0) return;
      const diff = touchStart.current - e.clientX;
      // Map pixel diff to a normalized offset for camera movement
      setNavigationOffset(diff * 0.05);
    };

    const onUp = (e: PointerEvent) => {
      if (touchStart.current === 0) return;

      const touchEnd = e.clientX;
      const diff = touchStart.current - touchEnd;

      canvas.releasePointerCapture(e.pointerId);
      touchStart.current = 0;
      setNavigationOffset(0);

      // Swipe threshold
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          nextStructure();
        } else {
          prevStructure();
        }
      }
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [gl, nextStructure, prevStructure, isPreloading]);

  if (!selectedNode) return null;

  return (
    <group>
      {/* Procedural terrain ground */}
      <TerrainGround />
      {/* <SkyboxHDR /> */}
      <ProceduralSky />

      {/* Render structures from selected node */}
      {selectedNode.structures.map((structure) => (
        <Structure key={structure.id} data={structure} />
      ))}

      {/* Ambient particles/stars in background */}
      <StarField count={200} />

      {/* Improved Dynamic Lighting System - Only active if NOT preloading */}
      {!isPreloading && <SurfaceLighting />}
    </group>
  );
};
