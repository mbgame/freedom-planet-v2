'use client';import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useGameStore } from '@/store/gameStore';
import { Structure } from './Structure';

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

// Surface scene with terrain and structures
export const SurfaceScene: React.FC = () => {
  const selectedNode = useGameStore(state => state.selectedNode);
  const nextStructure = useGameStore(state => state.nextStructure);
  const prevStructure = useGameStore(state => state.prevStructure);
  const focusedStructureIndex = useGameStore(state => state.focusedStructureIndex);

  const { gl } = useThree();
  const touchStart = useRef(0);


  // Handle swipe gestures
  useEffect(() => {
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
  }, [gl, nextStructure, prevStructure]);

  if (!selectedNode) return null;

  return (
    <group>
      {/* Ground plane with subtle vertex displacement */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[50, 50, 64, 64]} />
        <meshStandardMaterial
          color="#0f172a"
          roughness={0.9}
          metalness={0.2}
        />
      </mesh>

      {/* Grid helper */}
      <gridHelper
        args={[50, 50, '#1e293b', '#0f172a']}
        position={[0, 0.02, 0]}
      />

      {/* Fog for depth */}
      {/* <fog attach="fog" args={['#020617', 8, 30]} /> */}

      {/* Render structures from selected node */}
      {selectedNode.structures.map((structure) => (
        <Structure key={structure.id} data={structure} />
      ))}

      {/* Ambient particles/stars in background */}
      <StarField count={500} />

      {/* Additional ambient lighting for surface */}
      <ambientLight intensity={2} color="#ffffff" />
      {/* <hemisphereLight
        args={['#0ea5e9', '#ffffff', 10.0]}
        position={[0, 20, 0]}
      /> */}
    </group>
  );
};
