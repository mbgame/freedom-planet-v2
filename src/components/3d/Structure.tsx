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
  const groupRef = useRef<THREE.Group>(null);
  const floatOffset = useRef(Math.random() * Math.PI * 2);

  // Floating animation
  // useFrame(({ clock }) => {
  //   if (groupRef.current) {
  //     const time = clock.elapsedTime * 2 + floatOffset.current;
  //     groupRef.current.position.y = data.position[1] + Math.sin(time) * 0.05;
  //     groupRef.current.rotation.x = Math.sin(time / 2) * 0.03;
  //     groupRef.current.rotation.z = Math.sin(time / 3) * 0.03;
  //   }

  //   // Rotate selection ring if it exists
  //   if (ringRef.current) {
  //     ringRef.current.rotation.z += 0.01;
  //   }
  // });

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
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <circleGeometry args={[1.5, 32]} />
          <meshBasicMaterial
            color="#00ffff"
            transparent
            opacity={0.1}
          />
        </mesh>
      )}

      <group ref={groupRef}>
        {/* Main structure mesh */}
        <group
          position={[0, data.position[1], 0]}
          onClick={(e) => {
            e.stopPropagation();
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
            position={[0, 0, 0.75]} // Positioned above the model center
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

        {/* Base platform */}
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

        {/* 3D Data Label - Always visible, but stats only show when focused */}
        <DataLabel
          position={new THREE.Vector3(0, data.position[1], 0)}
          stats={data.stats}
          structureName={data.type}
          isFocused={isFocused}
          isSelected={isSelected}
        />
      </group>
    </group>
  );
};
