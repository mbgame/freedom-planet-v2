import { useRef, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, type StructureData } from '@/store/gameStore';
import { DataLabel } from './DataLabel';

interface StructureProps {
  data: StructureData;
}

const RoboticLabModel = () => {
  const { scene } = useGLTF('/models/robotic building.glb');
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  return <primitive object={clonedScene} scale={3} />;
};

const ExtractorModel = () => {
  const { scene } = useGLTF('/models/farming lab.glb');
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  return <primitive object={clonedScene} scale={3} />;
};

const GeneratorModel = () => {
  const { scene } = useGLTF('/models/polymer.glb');
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  return <primitive object={clonedScene} scale={3} />;
};

const ModelFallback = () => (
  <mesh>
    <boxGeometry args={[0.5, 0.5, 0.5]} />
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
  const animatedY = useRef(data.position[1]);

  // Animation logic
  useFrame(({ clock }, delta) => {
    // 1. Lift Animation (Smooth transition when selected)
    const targetY = isSelected ? data.position[1] + 0.4 : data.position[1];
    animatedY.current = THREE.MathUtils.lerp(animatedY.current, targetY, delta * 4);

    // Apply animations to structure group
    if (structureGroupRef.current) {
      structureGroupRef.current.position.y = animatedY.current;
    }


    // 3. Selection Ring & Glow Animation
    if (ringRef.current) {
      // Rotation
      ringRef.current.rotation.z += delta * 1.5;
      // Pulse Opacity
      const pulse = 0.4 + Math.sin(clock.elapsedTime * 6) * 0.15;
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = pulse;
    }

    if (glowRef.current) {
      // Pulse Opacity
      const pulse = 0.15 + Math.sin(clock.elapsedTime * 6) * 0.08;
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = pulse;
      // Pulse Scale slightly
      const glowScale = 1 + Math.sin(clock.elapsedTime * 6) * 0.05;
      glowRef.current.scale.set(glowScale, glowScale, 1);
    }
  });


  return (
    <group position={[data.position[0], 0, data.position[2]]}>
      {/* Selection ring - placed on ground, not floating with model */}
      {isSelected && (
        <mesh
          ref={ringRef}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.05, 0]}
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
          position={[0, 0.04, 0]}
        >
          <circleGeometry args={[1.5, 32]} />
          <meshBasicMaterial
            color="#00ffff"
            transparent
            opacity={0.1}
          />
        </mesh>
      )}

      {/* Main structure group (Animated) */}
      <group ref={structureGroupRef}>
        {/* Main structure mesh and logo */}
        <group
          position={[0, 0, 0]} // animatedY handles the lift
          onClick={(e) => {
            e.stopPropagation();
            // Focus camera on this structure
            useGameStore.getState().setFocusedStructure(data.id);
            // Toggle selection or select new
            if (isSelected) {
              setSelectedStructure(null);
            } else {
              setSelectedStructure(data);
            }
          }}
        >
          {/* 3D Structure Logo - Now nested directly to follow model position/rotation */}
          <Text
            position={[0, -0.05, 0.75]} // Positioned above the model center
            rotation={[-Math.PI / 8, 0, 0]}
            fontSize={0.15}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            fontWeight={900}
            letterSpacing={0.15}
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {data.type}
            <meshBasicMaterial color="#00ffff" toneMapped={false} />
          </Text>

          {/* Different geometries based on type */}
          <Suspense fallback={<ModelFallback />}>
            {data.type === 'Aeroponic Farms' && <ExtractorModel />}
            {data.type === 'Polymer Plants' && <GeneratorModel />}
            {data.type === 'Robotics Workshop' && <RoboticLabModel />}
          </Suspense>
        </group>

        {/* 3D Data Label - Inside the animated group to follow movement */}
        <DataLabel
          position={new THREE.Vector3(0, 0, 0)} // Position relative to structureGroupRef center
          stats={data.stats}
          structureName={data.type}
          isFocused={isFocused}
          isSelected={isSelected}
        />
      </group>

      {/* Base platform - stays static on the ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[0.9, 32]} />
        <meshStandardMaterial
          color="#0f172a"
          transparent
          opacity={0.7}
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>

    </group>
  );
};
