import { useGameStore } from '@/store/gameStore';
import { CameraRig } from './CameraRig';
import { StarField } from './SurfaceScene';
import { Planet } from './Planet';
import { Nodes } from './Nodes';
import { SurfaceScene } from './SurfaceScene';
import { TransitionVFX } from './TransitionVFX';
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

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
      <ambientLight intensity={1.0} color="#ffffffff" />
      <directionalLight
        position={[10, 10, 5]}
        intensity={8.0}
        color="#38bdf8"
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
    </>
  );
};
