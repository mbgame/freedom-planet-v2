import { useRef, useMemo } from 'react';
import { Text, Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { StructureStat } from '@/store/gameStore';

interface DataLabelProps {
  position: THREE.Vector3;
  stats: StructureStat[];
  structureName: string;
  isFocused?: boolean;
  isSelected?: boolean;
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'good':
      return '#00ff41'; // Matrix green
    case 'warning':
      return '#ffeb3b'; // Bright yellow
    case 'critical':
      return '#ff1744'; // Bright red
    default:
      return '#00ff41';
  }
};

export const DataLabel: React.FC<DataLabelProps> = ({ position, stats, structureName, isFocused = false, isSelected = false }) => {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const scanlineRef = useRef<THREE.Mesh>(null);
  const scaleRef = useRef(0);

  // Billboard effect and animation
  useFrame(({ camera, clock }) => {
    if (groupRef.current) {
      groupRef.current.quaternion.copy(camera.quaternion);

      // Animation pop-up effect
      const targetScale = isSelected ? 1 : 0;
      scaleRef.current = THREE.MathUtils.lerp(scaleRef.current, targetScale, 0.15);
      groupRef.current.scale.setScalar(scaleRef.current);

      // Floating animation when visible
      if (scaleRef.current > 0.01) {
        groupRef.current.position.y = position.y + 2 + Math.sin(clock.elapsedTime * 1.5) * 0.05;
      }
    }

    // Pulsing glow effect
    if (glowRef.current) {
      const pulse = Math.sin(clock.elapsedTime * 2) * 0.5 + 0.5;
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.1 + pulse * 0.15;
    }

    // Animated scanline
    if (scanlineRef.current) {
      scanlineRef.current.position.y = (clock.elapsedTime * 0.3) % 1.2 - 0.6;
    }
  });

  const panelWidth = 1.6;
  const panelHeight = 0.3 + stats.length * 0.16;

  // Holographic connection line points
  const linePoints = useMemo(() => [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 1.8, 0)
  ], []);

  return (
    <>
      {/* Holographic connection line - Only show when selected/animating */}
      {isSelected && (
        <>
          <Line
            points={linePoints}
            color="#00ff41"
            transparent
            opacity={0.6}
            lineWidth={2}
            position={position}
          />

          {/* Glowing particles along line */}
          <mesh position={[position.x, position.y + 0.9, position.z]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial color="#00ff41" transparent opacity={0.8} />
          </mesh>
        </>
      )}

      {/* Main Label Group */}
      <group ref={groupRef} position={[position.x, position.y + 2, position.z]} scale={0}>

        {/* Outer glow aura */}
        <mesh ref={glowRef} position={[0, 0, -0.03]}>
          <planeGeometry args={[panelWidth + 0.3, panelHeight + 0.3]} />
          <meshBasicMaterial
            color="#00ff41"
            transparent
            opacity={0.15}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Glassy main panel - Optimized: removed meshPhysicalMaterial */}
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[panelWidth, panelHeight]} />
          <meshBasicMaterial
            color="#001a0d"
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Frosted glass effect overlay */}
        <mesh position={[0, 0, -0.015]}>
          <planeGeometry args={[panelWidth, panelHeight]} />
          <meshBasicMaterial
            color="#003d1a"
            transparent
            opacity={0.2}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Glowing border frame */}
        <lineSegments position={[0, 0, -0.01]}>
          <edgesGeometry args={[new THREE.PlaneGeometry(panelWidth, panelHeight)]} />
          <lineBasicMaterial color="#00ff41" transparent opacity={0.8} linewidth={2} />
        </lineSegments>

        {/* Corner decorations */}
        {[
          [-panelWidth / 2, panelHeight / 2],
          [panelWidth / 2, panelHeight / 2],
          [-panelWidth / 2, -panelHeight / 2],
          [panelWidth / 2, -panelHeight / 2]
        ].map((pos, i) => (
          <group key={i} position={[pos[0], pos[1], 0]}>
            <mesh>
              <boxGeometry args={[0.08, 0.01, 0.01]} />
              <meshBasicMaterial color="#00ff41" />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <boxGeometry args={[0.08, 0.01, 0.01]} />
              <meshBasicMaterial color="#00ff41" />
            </mesh>
          </group>
        ))}

        {/* Animated scanline */}
        <mesh ref={scanlineRef} position={[0, 0, 0.005]}>
          <planeGeometry args={[panelWidth, 0.02]} />
          <meshBasicMaterial color="#00ff41" transparent opacity={0.2} />
        </mesh>

        {/* Header with structure name */}
        <group position={[0, panelHeight / 2 - 0.12, 0.01]}>
          {/* Header glow */}
          <mesh position={[0, 0, -0.005]}>
            <planeGeometry args={[panelWidth - 0.1, 0.15]} />
            <meshBasicMaterial color="#00ff41" transparent opacity={0.1} />
          </mesh>

          <Text
            fontSize={0.09}
            color="#00ff41"
            anchorX="center"
            anchorY="middle"
            fontWeight={700}
            letterSpacing={0.08}
            outlineWidth={0.01}
            outlineColor="#003d1a"
          >
            {structureName.toUpperCase()}
          </Text>

          {/* Decorative underline */}
          <mesh position={[0, -0.06, 0]}>
            <planeGeometry args={[panelWidth - 0.3, 0.01]} />
            <meshBasicMaterial color="#00ff41" transparent opacity={0.6} />
          </mesh>
        </group>

        {/* Stats Display - Visible when selected */}
        <group
          position={[0, panelHeight / 2 - 0.28, 0.01]}
          visible={isSelected}
        >
          {stats.map((stat, index) => {
            const yPos = -index * 0.16;
            const statusColor = getStatusColor(stat.status);

            return (
              <group key={index} position={[0, yPos, 0]}>
                {/* Stat background glow */}
                <mesh position={[0, 0, -0.005]}>
                  <planeGeometry args={[panelWidth - 0.2, 0.12]} />
                  <meshBasicMaterial
                    color={statusColor}
                    transparent
                    opacity={0.05}
                  />
                </mesh>

                {/* Status indicator dot */}
                <mesh position={[-panelWidth / 2 + 0.15, 0, 0]}>
                  <circleGeometry args={[0.025, 16]} />
                  <meshBasicMaterial color={statusColor} />
                </mesh>

                {/* Status glow */}
                <mesh position={[-panelWidth / 2 + 0.15, 0, -0.005]}>
                  <circleGeometry args={[0.04, 16]} />
                  <meshBasicMaterial
                    color={statusColor}
                    transparent
                    opacity={0.3}
                  />
                </mesh>

                {/* Label text */}
                <Text
                  position={[-panelWidth / 2 + 0.25, 0, 0]}
                  fontSize={0.065}
                  color="#00ff41"
                  anchorX="left"
                  anchorY="middle"
                  fontWeight={500}
                  letterSpacing={0.02}
                >
                  {stat.label}
                </Text>

                {/* Value text with glow */}
                <Text
                  position={[panelWidth / 2 - 0.15, 0, 0]}
                  fontSize={0.075}
                  color={statusColor}
                  anchorX="right"
                  anchorY="middle"
                  fontWeight={700}
                  letterSpacing={0.05}
                  outlineWidth={0.015}
                  outlineColor="#000000"
                >
                  {stat.value}
                </Text>

                {/* Separator line */}
                {index < stats.length - 1 && (
                  <mesh position={[0, -0.08, 0]}>
                    <planeGeometry args={[panelWidth - 0.4, 0.005]} />
                    <meshBasicMaterial
                      color="#00ff41"
                      transparent
                      opacity={0.2}
                    />
                  </mesh>
                )}
              </group>
            );
          })}
        </group>

        {/* Holographic flicker effect - random noise texture */}
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[panelWidth, panelHeight]} />
          <meshBasicMaterial
            color="#00ff41"
            transparent
            opacity={0.03}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </>
  );
};
