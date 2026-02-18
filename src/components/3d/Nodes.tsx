import { useState, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';

// ─── SHADERS ──────────────────────────────────────────────────────────────────

// Core energy sphere — Fresnel rim + inner scanline pulse
const coreVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vNormal   = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const coreFragmentShader = `
  uniform float uTime;
  uniform vec3  uColor;
  uniform float uHover;
  varying vec3  vNormal;
  varying vec3  vPosition;

  void main() {
    float fresnel   = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.5);
    float scanline  = sin(vPosition.y * 30.0 - uTime * 4.0) * 0.5 + 0.5;
    scanline        = pow(scanline, 6.0) * 0.35;
    float breathe   = sin(uTime * 2.0) * 0.5 + 0.5;
    vec3 hoverColor = vec3(1.0, 0.55, 0.0);
    vec3 baseColor  = mix(uColor, hoverColor, uHover);
    vec3 color      = baseColor * (0.6 + breathe * 0.4 + fresnel * 1.5 + scanline);
    float alpha     = 0.75 + fresnel * 0.25 + breathe * 0.1;
    gl_FragColor    = vec4(color, alpha);
  }
`;

const auraVertexShader = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const auraFragmentShader = `
  uniform float uTime;
  uniform vec3  uColor;
  uniform float uHover;
  uniform float uRadius;
  varying vec3  vNormal;

  void main() {
    float rim       = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 1.8);
    float pulse     = sin(uTime * 1.5 + uRadius * 3.14159) * 0.5 + 0.5;
    float hoverBoost= 1.0 + uHover * 1.2;
    vec3 hoverColor = vec3(1.0, 0.6, 0.05);
    vec3 col        = mix(uColor, hoverColor, uHover);
    float alpha     = rim * (0.15 + pulse * 0.12) * hoverBoost;
    gl_FragColor    = vec4(col, alpha);
  }
`;

const ringVertexShader = `
  attribute float aAngle;
  varying float vAngle;
  void main() {
    vAngle = aAngle;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ringFragmentShader = `
  uniform float uTime;
  uniform float uSpeed;
  uniform vec3  uColor;
  uniform float uHover;
  varying float vAngle;

  void main() {
    float sweep     = mod(uTime * uSpeed, 6.28318);
    float diff      = mod(vAngle - sweep + 6.28318, 6.28318);
    float trail     = pow(1.0 - smoothstep(0.0, 2.5, diff), 1.5);
    float hoverBoost= 1.0 + uHover * 0.8;
    vec3 hoverColor = vec3(1.0, 0.62, 0.0);
    vec3 col        = mix(uColor, hoverColor, uHover);
    gl_FragColor    = vec4(col, trail * 0.85 * hoverBoost);
  }
`;

const pingVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const pingFragmentShader = `
  uniform float uTime;
  uniform vec3  uColor;
  varying vec2  vUv;

  void main() {
    float r     = length(vUv - 0.5) * 2.0;
    float wave  = mod(uTime * 0.8, 1.0);
    float ring  = max(1.0 - abs(r - wave) * 8.0, 0.0);
    float alpha = ring * (1.0 - wave) * 0.7;
    gl_FragColor= vec4(uColor, alpha);
  }
`;

// ─── BUILD ORBITAL RING GEOMETRY ─────────────────────────────────────────────
function buildRingGeometry(radius: number, segments: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const angles: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    positions.push(Math.cos(a) * radius, Math.sin(a) * radius, 0);
    angles.push(a);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('aAngle', new THREE.Float32BufferAttribute(angles, 1));
  return geo;
}

// ─── NODES CONTAINER ─────────────────────────────────────────────────────────
export const Nodes: React.FC = () => {
  const nodes = useGameStore(s => s.nodes);
  const view = useGameStore(s => s.view);
  const selectNode = useGameStore(s => s.selectNode);

  if (view !== 'ORBIT') return null;

  return (
    <group>
      {nodes.map((node, i) => (
        <NodeMarker
          key={node.id}
          position={node.position}
          seedOffset={i * 1.37}
          onClick={() => selectNode(node)}
        />
      ))}
    </group>
  );
};

// ─── SINGLE NODE MARKER ──────────────────────────────────────────────────────
interface NodeMarkerProps {
  position: THREE.Vector3;
  seedOffset: number;
  onClick: () => void;
}

const NodeMarker: React.FC<NodeMarkerProps> = ({
  position, seedOffset, onClick,
}) => {
  const coreMatRef = useRef<THREE.ShaderMaterial>(null);
  const aura1Ref = useRef<THREE.ShaderMaterial>(null);
  const aura2Ref = useRef<THREE.ShaderMaterial>(null);
  const aura3Ref = useRef<THREE.ShaderMaterial>(null);
  const ring1MatRef = useRef<THREE.ShaderMaterial>(null);
  const ring2MatRef = useRef<THREE.ShaderMaterial>(null);
  const pingMatRef = useRef<THREE.ShaderMaterial>(null);
  const ring1Ref = useRef<THREE.Line>(null);
  const ring2Ref = useRef<THREE.Line>(null);
  const groupRef = useRef<THREE.Group>(null);

  const outward = useMemo(() => position.clone().normalize(), [position]);
  const ringGeo1 = useMemo(() => buildRingGeometry(0.22, 80), []);
  const ringGeo2 = useMemo(() => buildRingGeometry(0.32, 80), []);

  const beamGeo = useMemo(() => {
    const pts = [new THREE.Vector3(0, 0, 0), outward.clone().multiplyScalar(-0.5)];
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [outward]);

  const ring1 = useMemo(() => new THREE.Line(ringGeo1), [ringGeo1]);
  const ring2 = useMemo(() => new THREE.Line(ringGeo2), [ringGeo2]);
  const beamLine = useMemo(() => new THREE.Line(beamGeo), [beamGeo]);

  const pingGeo = useMemo(() => new THREE.PlaneGeometry(1.4, 1.4), []);
  const BASE_COL = useMemo(() => new THREE.Color('#00d4ff'), []);

  const ringQuat = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), outward);
    return q;
  }, [outward]);

  const ring2Quat = useMemo(() => {
    const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI * 0.35);
    return new THREE.Quaternion().multiplyQuaternions(ringQuat, tilt);
  }, [ringQuat]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seedOffset;
    const h = 0; // Hover disabled for mobile

    if (coreMatRef.current) {
      coreMatRef.current.uniforms['uTime'].value = t;
      coreMatRef.current.uniforms['uHover'].value = h;
    }
    [aura1Ref, aura2Ref, aura3Ref].forEach(r => {
      if (r.current) {
        r.current.uniforms['uTime'].value = t;
        r.current.uniforms['uHover'].value = h;
      }
    });
    if (ring1MatRef.current) {
      ring1MatRef.current.uniforms['uTime'].value = t;
      ring1MatRef.current.uniforms['uHover'].value = h;
    }
    if (ring2MatRef.current) {
      ring2MatRef.current.uniforms['uTime'].value = t;
      ring2MatRef.current.uniforms['uHover'].value = h;
    }
    if (ring1Ref.current) ring1Ref.current.rotation.z = t * 0.9;
    if (ring2Ref.current) ring2Ref.current.rotation.z = -t * 0.55;
    if (pingMatRef.current) pingMatRef.current.uniforms['uTime'].value = t;

    if (groupRef.current) {
      groupRef.current.position.copy(position);
      groupRef.current.position.addScaledVector(outward, Math.sin(t * 1.1) * 0.012);
    }
  });

  return (
    <group ref={groupRef} position={position}>

      {/* Invisible hit target — larger for easier mobile tapping */}
      <mesh
        onClick={e => { e.stopPropagation(); onClick(); }}
      >
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Anchor beam into planet */}
      <primitive object={beamLine}>
        <lineBasicMaterial
          color={'#00aaff'}
          transparent
          opacity={0.2}
        />
      </primitive>

      {/* Radar ping ripple */}
      <mesh geometry={pingGeo} quaternion={ringQuat}>
        <shaderMaterial
          ref={pingMatRef}
          vertexShader={pingVertexShader}
          fragmentShader={pingFragmentShader}
          transparent depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          uniforms={{
            uTime: { value: 0 },
            uColor: { value: new THREE.Color('#00ccff') },
          }}
        />
      </mesh>

      {/* Outermost aura */}
      {/* <mesh scale={2.9}>
        <sphereGeometry args={[0.08, 20, 20]} />
        <shaderMaterial
          ref={aura3Ref}
          vertexShader={auraVertexShader}
          fragmentShader={auraFragmentShader}
          transparent depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          uniforms={{ uTime: { value: 0 }, uColor: { value: BASE_COL.clone() }, uHover: { value: 0 }, uRadius: { value: 0.9 } }}
        />
      </mesh> */}

      {/* Middle aura */}
      {/* <mesh scale={1.95}>
        <sphereGeometry args={[0.08, 24, 24]} />
        <shaderMaterial
          ref={aura2Ref}
          vertexShader={auraVertexShader}
          fragmentShader={auraFragmentShader}
          transparent depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          uniforms={{ uTime: { value: 0 }, uColor: { value: BASE_COL.clone() }, uHover: { value: 0 }, uRadius: { value: 0.5 } }}
        />
      </mesh> */}

      {/* Inner aura */}
      {/* <mesh scale={1.38}>
        <sphereGeometry args={[0.08, 28, 28]} />
        <shaderMaterial
          ref={aura1Ref}
          vertexShader={auraVertexShader}
          fragmentShader={auraFragmentShader}
          transparent depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          uniforms={{ uTime: { value: 0 }, uColor: { value: BASE_COL.clone() }, uHover: { value: 0 }, uRadius: { value: 0.2 } }}
        />
      </mesh> */}

      {/* Orbital ring 1 — tight + fast */}
      {/* <primitive object={ring1} ref={ring1Ref} quaternion={ringQuat}>
        <shaderMaterial
          ref={ring1MatRef}
          vertexShader={ringVertexShader}
          fragmentShader={ringFragmentShader}
          transparent depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={{ uTime: { value: 0 }, uSpeed: { value: 2.6 }, uColor: { value: new THREE.Color('#00ffff') }, uHover: { value: 0 } }}
        />
      </primitive> */}

      {/* Orbital ring 2 — wide, tilted, opposite direction */}
      <primitive object={ring2} ref={ring2Ref} quaternion={ring2Quat}>
        <shaderMaterial
          ref={ring2MatRef}
          vertexShader={ringVertexShader}
          fragmentShader={ringFragmentShader}
          transparent depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={{ uTime: { value: 0 }, uSpeed: { value: -1.7 }, uColor: { value: new THREE.Color('#44ccff') }, uHover: { value: 0 } }}
        />
      </primitive>

      {/* Core energy sphere (shader) */}
      <mesh>
        <sphereGeometry args={[0.07, 32, 32]} />
        <shaderMaterial
          ref={coreMatRef}
          vertexShader={coreVertexShader}
          fragmentShader={coreFragmentShader}
          transparent depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={{ uTime: { value: 0 }, uColor: { value: BASE_COL.clone() }, uHover: { value: 0 } }}
        />
      </mesh>

      {/* Solid bright centre dot */}
      <mesh scale={0.38}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshBasicMaterial color={'#e8f8ff'} toneMapped={false} />
      </mesh>

    </group>
  );
};
