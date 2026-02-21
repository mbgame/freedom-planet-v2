'use client';

import { useGameStore } from '@/store/gameStore';
import { CameraRig } from './CameraRig';
import { StarField } from './SurfaceScene';
import { Planet } from './Planet';
import { Nodes } from './Nodes';
import { SurfaceScene } from './SurfaceScene';
import { TransitionVFX } from './TransitionVFX';
import { PostEffects } from './PostEffects';
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useControls } from 'leva';
import * as THREE from 'three';

const SHOW_CONTROLS = process.env.NEXT_PUBLIC_SHOW_CONTROLS === 'true';

const DEFAULT_LIGHT_VALUES = {
  ambientIntensity: 0.1,
  ambientColor: '#ffffff',
  directIntensity: 10.0,
  directColor: '#ffffff',
  directPosition: { x: 10, y: 10, z: 5 },
};

const NodesRotationWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<THREE.Group>(null);
  const view = useGameStore(state => state.view);

  useFrame((_, delta) => {
    if (ref.current) {
      const rotationSpeed = view === 'ORBIT' ? 0.05 : 0.01;
      ref.current.rotation.y += delta * rotationSpeed;
    }
  });

  return <group ref={ref}>{children}</group>;
};

export const SceneManager: React.FC = () => {
  const view = useGameStore(state => state.view);
  const setLoading = useGameStore(state => state.setLoading);

  const { ambientIntensity, ambientColor, directIntensity, directColor, directPosition } = useControls('Scene Lighting', {
    ambientIntensity: { value: DEFAULT_LIGHT_VALUES.ambientIntensity, min: 0, max: 2, step: 0.1 },
    ambientColor: DEFAULT_LIGHT_VALUES.ambientColor,
    directIntensity: { value: DEFAULT_LIGHT_VALUES.directIntensity, min: 0, max: 20, step: 0.1 },
    directColor: DEFAULT_LIGHT_VALUES.directColor,
    directPosition: DEFAULT_LIGHT_VALUES.directPosition,
  }, { collapsed: true });

  // Simulate asset loading
  useEffect(() => {
    const loadAssets = async () => {
      // Simulate loading time
      for (let i = 0; i <= 100; i += 10) {
        setLoading(true, i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      setLoading(false, 100);
    };

    loadAssets();
  }, [setLoading]);

  return (
    <>
      <CameraRig />

      {/* Lighting setup */}
      <ambientLight intensity={ambientIntensity} color={ambientColor} />
      <directionalLight
        position={[directPosition.x, directPosition.y, directPosition.z]}
        intensity={directIntensity}
        color={directColor}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
      />
      {/* Render based on view state */}
      {view !== 'SURFACE' ? (
        <>
          <StarField />
          <Planet />
          <NodesRotationWrapper>
            <Nodes />
          </NodesRotationWrapper>
        </>
      ) : (
        <SurfaceScene />
      )}

      <TransitionVFX />
      <PostEffects />
    </>
  );
};
