'use client'; import { useRef, useMemo } from 'react';
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
      return '#00d4ff'; // Tech Cyan
    case 'warning':
      return '#ffcc00'; // Amber
    case 'critical':
      return '#ff3366'; // Plasma Red
    default:
      return '#00d4ff';
  }
};

export const DataLabel: React.FC<DataLabelProps> = ({ position, stats, structureName, isFocused = false, isSelected = false }) => {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const scanlineRef = useRef<THREE.Mesh>(null);
  const lineRef = useRef<any>(null);
  const particleRef = useRef<THREE.Mesh>(null);
  const scaleRef = useRef(0);

  // Billboard effect and dynamic positioning
  useFrame(({ camera, clock }) => {
    if (groupRef.current) {
      if (groupRef.current.parent) {
        const parentQuat = new THREE.Quaternion();
        groupRef.current.parent.getWorldQuaternion(parentQuat);
        groupRef.current.quaternion.copy(camera.quaternion).premultiply(parentQuat.invert());
      } else {
        groupRef.current.quaternion.copy(camera.quaternion);
      }

      const targetScale = isSelected ? 1 : 0;
      scaleRef.current = THREE.MathUtils.lerp(scaleRef.current, targetScale, 0.15);
      groupRef.current.scale.setScalar(scaleRef.current);

      const cameraDir = new THREE.Vector3();
      camera.getWorldDirection(cameraDir).negate();

      const worldOffset = cameraDir.clone();
      worldOffset.y = 0;
      worldOffset.normalize().multiplyScalar(1.8);

      const localOffset = worldOffset.clone();
      if (groupRef.current.parent) {
        const parentQuat = new THREE.Quaternion();
        groupRef.current.parent.getWorldQuaternion(parentQuat);
        localOffset.applyQuaternion(parentQuat.invert());
      }

      const hoverY = position.y + 3.0 + Math.sin(clock.elapsedTime * 2.0) * 0.1;

      const targetPos = new THREE.Vector3(
        position.x + localOffset.x,
        hoverY,
        position.z + localOffset.z
      );

      groupRef.current.position.copy(targetPos);

      if (lineRef.current && lineRef.current.geometry) {
        lineRef.current.geometry.setPositions([
          position.x, position.y, position.z,
          targetPos.x, targetPos.y, targetPos.z
        ]);
        lineRef.current.computeLineDistances();
      }

      if (particleRef.current) {
        const t = (clock.elapsedTime * 0.6) % 1.0;
        particleRef.current.position.lerpVectors(position, targetPos, t);
      }
    }

    if (glowRef.current) {
      const pulse = Math.sin(clock.elapsedTime * 3) * 0.5 + 0.5;
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.05 + pulse * 0.1;
    }

    if (scanlineRef.current) {
      scanlineRef.current.position.y = (clock.elapsedTime * 0.4) % 1.0 - 0.5;
    }
  });

  const panelWidth = 2.0;
  const panelHeight = 0.4 + stats.length * 0.2;

  return (
    <>
      {isSelected && (
        <>
          <Line
            ref={lineRef}
            points={[position, position]}
            color="#00d4ff"
            transparent
            opacity={0.3}
            lineWidth={1.5}
          />
          <mesh ref={particleRef}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshBasicMaterial color="#00d4ff" transparent opacity={0.6} toneMapped={false} />
          </mesh>
        </>
      )}

      <group ref={groupRef} scale={0}>
        {/* Modern Sci-Fi Glass Panel */}
        <mesh position={[0, 0, -0.05]}>
          <planeGeometry args={[panelWidth, panelHeight]} />
          <meshBasicMaterial
            color="#0a1e32"
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* HUD Blueprint Grid */}
        <mesh position={[0, 0, -0.04]}>
          <planeGeometry args={[panelWidth, panelHeight]} />
          <meshBasicMaterial
            color="#00d4ff"
            transparent
            opacity={0.05}
            side={THREE.DoubleSide}
            wireframe
          />
        </mesh>

        {/* Technical Border with Inset Corners */}
        <group position={[0, 0, -0.01]}>
          {/* Top Line */}
          <mesh position={[0, panelHeight / 2, 0]}>
            <planeGeometry args={[panelWidth - 0.2, 0.01]} />
            <meshBasicMaterial color="#00d4ff" transparent opacity={0.6} />
          </mesh>
          {/* Bottom Line */}
          <mesh position={[0, -panelHeight / 2, 0]}>
            <planeGeometry args={[panelWidth - 0.2, 0.01]} />
            <meshBasicMaterial color="#00d4ff" transparent opacity={0.6} />
          </mesh>
          {/* Right/Left Vertical Bits */}
          <mesh position={[panelWidth / 2, 0, 0]}>
            <planeGeometry args={[0.01, panelHeight - 0.2]} />
            <meshBasicMaterial color="#00d4ff" transparent opacity={0.6} />
          </mesh>
          <mesh position={[-panelWidth / 2, 0, 0]}>
            <planeGeometry args={[0.01, panelHeight - 0.2]} />
            <meshBasicMaterial color="#00d4ff" transparent opacity={0.6} />
          </mesh>
        </group>

        {/* Fancy HUD Header */}
        <group position={[0, panelHeight / 2 - 0.15, 0.01]}>
          <mesh position={[0, 0, -0.005]}>
            <planeGeometry args={[panelWidth - 0.3, 0.18]} />
            <meshBasicMaterial color="#00d4ff" transparent opacity={0.15} />
          </mesh>
          <Text
            fontSize={0.12}
            color="#00d4ff"
            fontWeight={900}
            letterSpacing={0.15}
            anchorX="center"
          >
            {structureName.toUpperCase()}
          </Text>
          <mesh position={[0, -0.08, 0]}>
            <planeGeometry args={[panelWidth - 0.6, 0.01]} />
            <meshBasicMaterial color="#00d4ff" transparent opacity={0.8} />
          </mesh>
        </group>

        {/* Dynamic Scanline HUD effect */}
        <mesh ref={scanlineRef} position={[0, 0, 0.02]}>
          <planeGeometry args={[panelWidth, 0.03]} />
          <meshBasicMaterial color="#00d4ff" transparent opacity={0.25} />
        </mesh>

        {/* Stats Content */}
        <group position={[0, panelHeight / 2 - 0.45, 0.02]}>
          {stats.map((stat, i) => {
            const y = -i * 0.22;
            const statusColor = getStatusColor(stat.status);
            return (
              <group key={i} position={[0, y, 0]}>
                {/* Horizontal Stat Bar Background */}
                <mesh position={[0, 0.04, -0.01]}>
                  <planeGeometry args={[panelWidth - 0.4, 0.005]} />
                  <meshBasicMaterial color="#00d4ff" transparent opacity={0.1} />
                </mesh>

                {/* Status indicator Pill */}
                <mesh position={[-panelWidth / 2 + 0.25, 0, 0]}>
                  <capsuleGeometry args={[0.015, 0.06, 4, 8]} />
                  <meshBasicMaterial color={statusColor} />
                </mesh>

                <Text
                  position={[-panelWidth / 2 + 0.38, 0, 0]}
                  fontSize={0.08}
                  color="#ffffff"
                  anchorX="left"
                  fontWeight={400}
                  letterSpacing={0.05}
                >
                  {stat.label}
                </Text>

                <Text
                  position={[panelWidth / 2 - 0.25, 0, 0]}
                  fontSize={0.1}
                  color={statusColor}
                  anchorX="right"
                  fontWeight={900}
                  letterSpacing={0.08}
                  outlineWidth={0.01}
                  outlineColor="#000000"
                >
                  {stat.value}
                </Text>
              </group>
            );
          })}
        </group>

        {/* OS Designation Footer */}
        <group position={[0, -panelHeight / 2 + 0.08, 0.01]}>
          <Text
            fontSize={0.05}
            color="#00d4ff"
            fillOpacity={0.4}
            letterSpacing={0.4}
          >
            0xAA.77.B8.02_SYSTEM_LIVE
          </Text>
        </group>

        {/* Ambient Bloom Plane */}
        <mesh position={[0, 0, -0.06]}>
          <planeGeometry args={[panelWidth * 1.2, panelHeight * 1.2]} />
          <meshBasicMaterial color="#00d4ff" transparent opacity={0.05} />
        </mesh>
      </group>
    </>
  );
};
