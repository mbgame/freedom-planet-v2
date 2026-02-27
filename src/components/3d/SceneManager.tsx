'use client';

import { useGameStore } from '@/store/gameStore';
import { CameraRig } from './CameraRig';
import { StarField } from './SurfaceScene';
import { Planet } from './Planet';
import { Nodes } from './Nodes';
import { SurfaceScene } from './SurfaceScene';
import { TransitionVFX } from './TransitionVFX';
import { PostEffects } from './PostEffects';
import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useControls } from 'leva';
import * as THREE from 'three';
import { useGLTF, useTexture } from '@react-three/drei';

const SHOW_CONTROLS = process.env.NEXT_PUBLIC_SHOW_CONTROLS === 'true';

const DEFAULT_LIGHT_VALUES = {
  ambientIntensity: 0.1,
  ambientColor: '#ffffff',
  directIntensity: 5.0,
  directColor: '#ffffff',
  directPosition: { x: 10, y: 10, z: 5 },
};

// Preload 3D models and textures
const preloadAssets = () => {
  // Models
  useGLTF.preload('/models/robotic building.glb');
  useGLTF.preload('/models/farming lab.glb');
  useGLTF.preload('/models/polymer.glb');
  useGLTF.preload('/models/barracks.glb');

  // Textures - Hero Sprite
  useTexture.preload('/images/heroes/heroes.png');

  // Textures - Planet
  useTexture.preload('/textures/planet/398/planet_diffuseMap_Gaia_seed620.png');
  useTexture.preload('/textures/planet/398/planet_normalMap_Gaia_seed620.png');
  useTexture.preload('/textures/planet/398/planet_specularMap_Gaia_seed620.png');
  useTexture.preload('/textures/planet/clouds.jpg');

  // Textures - Moons
  const moonFolders = ['Moon_001_Textures', 'Moon_002_Textures', 'Moon_003_Textures'];
  const moonPrefixes = ['Moon_001_', 'Moon_002_', 'Moon_003_'];
  const moonSuffix = '_2048x1024';

  moonFolders.forEach((folder, i) => {
    const prefix = moonPrefixes[i];
    useTexture.preload(`/textures/moons/${folder}/${prefix}Albedo${moonSuffix}.png`);
    useTexture.preload(`/textures/moons/${folder}/${prefix}Normal${moonSuffix}.jpg`);
    useTexture.preload(`/textures/moons/${folder}/${prefix}Displacement${moonSuffix}.png`);
  });
};

const NodesRotationWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<THREE.Group>(null);
  const view = useGameStore(state => state.view);

  useFrame((_, delta) => {
    if (ref.current) {
      const rotationSpeed = (view === 'ORBIT' || view === 'TRANSITION') ? 0.09 : 0.01;
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
    preloadAssets();
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
          // castShadow
          // shadow-mapSize-width={512}
          // shadow-mapSize-height={512}
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
