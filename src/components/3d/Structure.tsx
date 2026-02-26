'use client'; import { useRef, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, type StructureData } from '@/store/gameStore';
import { DataLabel } from './DataLabel';
import { getTerrainWorldHeight } from '@/utils/terrain';

const ProgressBarMesh: React.FC<{ currentGen: any; width: number }> = ({ currentGen, width }) => {
  const barRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (barRef.current) {
      const elapsed = ((Date.now() - currentGen.startTime) / 1000) * 10;
      const progress = Math.min(1, elapsed / currentGen.duration);
      barRef.current.scale.x = progress;
      barRef.current.position.x = (progress * width) / 2;
    }
  });

  return (
    <mesh ref={barRef}>
      <planeGeometry args={[width, 0.1]} />
      <meshBasicMaterial color="#00ffff" toneMapped={false} />
    </mesh>
  );
};

interface StructureProps {
  data: StructureData;
}

// Helper to ensure a model is grounded based on its bounding box
const GroundedModel: React.FC<{ modelPath: string; scale?: number }> = ({ modelPath, scale = 3 }) => {
  const { scene } = useGLTF(modelPath);
  const clonedScene = useMemo(() => {
    const s = scene.clone();
    s.scale.setScalar(scale);
    s.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(s);
    // Align bottom of bounding box to y=0
    s.position.y = -box.min.y;
    return s;
  }, [scene, scale]);

  return <primitive object={clonedScene} />;
};

const RoboticLabModel = () => <GroundedModel modelPath="/models/robotic building.glb" scale={3} />;
const ExtractorModel = () => <GroundedModel modelPath="/models/farming lab.glb" scale={3} />;
const GeneratorModel = () => <GroundedModel modelPath="/models/polymer.glb" scale={3} />;
const BarracksModel = () => <GroundedModel modelPath="/models/barracks.glb" scale={3.5} />;

const ModelFallback = () => (
  <mesh position={[0, 0.75, 0]}>
    <boxGeometry args={[1.5, 1.5, 1.5]} />
    <meshStandardMaterial color="#3b82f6" wireframe />
  </mesh>
);

export const Structure: React.FC<StructureProps> = ({ data }) => {
  const selectedStructure = useGameStore(state => state.selectedStructure);
  const setSelectedStructure = useGameStore(state => state.setSelectedStructure);
  const focusedStructureIndex = useGameStore(state => state.focusedStructureIndex);
  const selectedNode = useGameStore(state => state.selectedNode);

  const isFocused = selectedNode?.structures[focusedStructureIndex]?.id === data.id;
  const isSelected = selectedStructure?.id === data.id;
  const ringRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const structureGroupRef = useRef<THREE.Group>(null);
  const animatedY = useRef(0);

  // Animation logic
  useFrame(({ clock }, delta) => {
    // 1. Lift Animation - Removed as per request to keep buildings grounded
    const targetLift = 0;
    animatedY.current = THREE.MathUtils.lerp(animatedY.current, targetLift, delta * 4);

    // Apply animations to structure group
    if (structureGroupRef.current) {
      structureGroupRef.current.position.y = animatedY.current;
    }
    // 3. Selection Ring & Glow Animation
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 1.5;
      const pulse = 0.4 + Math.sin(clock.elapsedTime * 6) * 0.15;
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = pulse;
    }

    if (glowRef.current) {
      const pulse = 0.15 + Math.sin(clock.elapsedTime * 6) * 0.08;
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = pulse;
      const glowScale = 1 + Math.sin(clock.elapsedTime * 6) * 0.05;
      glowRef.current.scale.set(glowScale, glowScale, 1);
    }
  });


  const terrainHeight = useMemo(() => getTerrainWorldHeight(data.position[0], data.position[2]), [data.position]);

  return (
    <group position={[data.position[0], terrainHeight, data.position[2]]}>
      {/* Selection ring - placed on ground, not floating with model */}
      {isSelected && (
        <mesh
          ref={ringRef}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.1, 0]}
        >
          <ringGeometry args={[1.4, 1.5, 64]} />
          <meshBasicMaterial
            color="#00ffff"
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Secondary ground glow for selection */}
      {isSelected && (
        <mesh
          ref={glowRef}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.1, 0]}
        >
          <circleGeometry args={[1.5, 32]} />
          <meshBasicMaterial
            color="#00ffff"
            transparent
            opacity={0.1}
          />
        </mesh>
      )}

      {/* Main structure group (Animated and Rotated) */}
      <group ref={structureGroupRef} rotation={[0, data.rotationY, 0]}>
        {/* Main structure mesh and logo */}
        <group
          position={[0, 0, 0]} // animatedY handles the lift
          onClick={(e) => {
            e.stopPropagation();
            useGameStore.getState().setFocusedStructure(data.id);
            if (isSelected) {
              setSelectedStructure(null);
            } else {
              setSelectedStructure(data);
            }
          }}
        >
          {/* 3D Structure Logo - Rotates and swings with the structure */}
          <Text
            position={[0, data.type === 'Barracks' ? 0.9 : 0.8, data.type === 'Robotics Workshop' ? 0.8 : data.type === 'Polymer Plants' ? 0.3 : data.type === 'Barracks' ? 0.2 : 0.6]} // Offset forward and slightly up
            rotation={[-Math.PI / 12, 0, 0]} // Nearly vertical but tilted for view
            fontSize={data.type === 'Barracks' ? 0.2 : 0.1}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            fontWeight={900}
            letterSpacing={0.1}
            outlineWidth={0.03}
            outlineColor="#000000"
          >
            {data.type.toUpperCase()}
            <meshBasicMaterial color="#00ffff" toneMapped={false} />
          </Text>

          {/* 3D Progress Bar for Barracks Generation */}
          {(() => {
            const activeGenerations = useGameStore.getState().activeGenerations;
            const currentGen = activeGenerations[data.id];
            if (data.type === 'Barracks' && currentGen) {
              return (
                <group position={[0, 1.3, 0.2]}>
                  {/* Background Bar */}
                  <mesh>
                    <planeGeometry args={[1.5, 0.12]} />
                    <meshBasicMaterial color="#000000" transparent opacity={0.5} />
                  </mesh>
                  {/* Progress Bar (Holographic) */}
                  <mesh position={[-0.75, 0, 0.01]}>
                    <ProgressBarMesh currentGen={currentGen} width={1.5} />
                  </mesh>
                  <Text
                    position={[0, 0.2, 0]}
                    fontSize={0.08}
                    color="#00ffff"
                    fontWeight={900}
                  >
                    UNIT SYNTHESIS IN PROGRESS
                  </Text>
                </group>
              );
            }
            return null;
          })()}

          {/* Different geometries based on type */}
          <Suspense fallback={<ModelFallback />}>
            {data.type === 'Aeroponic Farms' && <ExtractorModel />}
            {data.type === 'Polymer Plants' && <GeneratorModel />}
            {data.type === 'Robotics Workshop' && <RoboticLabModel />}
            {data.type === 'Barracks' && <BarracksModel />}
          </Suspense>
        </group>

        {/* 3D Data Label - Inside the animated group to follow movement */}
        <DataLabel
          position={new THREE.Vector3(0, 0.1, 0)} // Anchored from base
          stats={data.stats}
          structureName={data.type}
          isFocused={isFocused}
          isSelected={isSelected}
        />
      </group>

      {/* Base platform foundation - improved to handle sloped terrain */}
      <group position={[0, 0.01, 0]}>
        {/* Foundation "Plug" to handle sloped terrain gaps */}
        {/* <mesh position={[0, -0.25, 0]}>
          <cylinderGeometry args={[0.9, 0.9, 0.5, 32]} />
          <meshStandardMaterial
            color="#0f172a"
            metalness={0.6}
            roughness={0.4}
          />
        </mesh> */}

        {/* Top platform flange */}
        {/* <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[0.95, 32]} />
          <meshStandardMaterial
            color="#1e293b"
            transparent
            opacity={0.9}
            roughness={0.5}
            metalness={0.3}
          />
        </mesh> */}
      </group>

    </group>
  );
};

