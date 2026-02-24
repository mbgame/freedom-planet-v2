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
import { useGLTF } from '@react-three/drei';

const SHOW_CONTROLS = process.env.NEXT_PUBLIC_SHOW_CONTROLS === 'true';

const DEFAULT_LIGHT_VALUES = {
  ambientIntensity: 0.1,
  ambientColor: '#ffffff',
  directIntensity: 10.0,
  directColor: '#ffffff',
  directPosition: { x: 10, y: 10, z: 5 },
};

// Preload structure models
const preloadModels = () => {
  useGLTF.preload('/models/robotic building.glb');
  useGLTF.preload('/models/farming lab.glb');
  useGLTF.preload('/models/polymer.glb');
  useGLTF.preload('/models/barracks.glb');
};

const NodesRotationWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<THREE.Group>(null);
  const view = useGameStore(state => state.view);

  useFrame((_, delta) => {
    if (ref.current) {
      const rotationSpeed = (view === 'ORBIT' || view === 'TRANSITION') ? 0.05 : 0.01;
      ref.current.rotation.y += delta * rotationSpeed;
    }
  });

  return <group ref={ref}>{children}</group>;
};

export const SceneManager: React.FC = () => {
  const view = useGameStore(state => state.view);
  const selectedNode = useGameStore(state => state.selectedNode);

  // Trigger preloading immediately on mount
  useEffect(() => {
    preloadModels();
  }, []);

  const { ambientIntensity, ambientColor, directIntensity, directColor, directPosition } = useControls('Scene Lighting', {
    ambientIntensity: { value: DEFAULT_LIGHT_VALUES.ambientIntensity, min: 0, max: 2, step: 0.1 },
    ambientColor: DEFAULT_LIGHT_VALUES.ambientColor,
    directIntensity: { value: DEFAULT_LIGHT_VALUES.directIntensity, min: 0, max: 20, step: 0.1 },
    directColor: DEFAULT_LIGHT_VALUES.directColor,
    directPosition: DEFAULT_LIGHT_VALUES.directPosition,
  }, { collapsed: true });

  return (
    <>
      <CameraRig />

      {/* Lighting setup - Only for Orbit/Moon/Transition views */}
      {view !== 'SURFACE' && (
        <>
          <ambientLight intensity={ambientIntensity} color={ambientColor} />
          <directionalLight
            position={[directPosition.x, directPosition.y, directPosition.z]}
            intensity={directIntensity}
            color={directColor}
            castShadow
            shadow-mapSize-width={512}
            shadow-mapSize-height={512}
          />
        </>
      )}

      {/* Render based on view state */}
      {view !== 'SURFACE' ? (
        <>
          <StarField />
          <Planet />
          <NodesRotationWrapper>
            <Nodes />
          </NodesRotationWrapper>

          {/* 
            Always mount SurfaceScene invisibly from the very beginning.
            This ensures that during the initial Loading Screen, 
            Three.js/Drei will catch all surface models and terrain textures
            and include them in the initial progress percentage.
          */}
          <group visible={false} position={[5000, 5000, 5000]}>
            <SurfaceScene isPreloading={true} />
          </group>

          {/* Special case for actual transition: mount precisely what we need */}
          {view === 'TRANSITION' && selectedNode && (
            <group visible={false}>
              <SurfaceScene />
            </group>
          )}
        </>
      ) : (
        <SurfaceScene />
      )}

      <TransitionVFX />
      <PostEffects />
    </>
  );
};
