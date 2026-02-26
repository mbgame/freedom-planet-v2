'use client';
import React, { useState, useRef, useMemo, memo, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, NodeData, StructureData } from '../../store/gameStore';
import { Html } from '@react-three/drei';
import { useIsMobile } from '@/app/hooks/useIsMobile';
import { getTerrainWorldHeight, getFlatnessScore } from '@/utils/terrain';

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const generateMockStats = (type: string): any[] => {
  const stats: any[] = [];
  switch (type) {
    case 'Polymer Plants':
      stats.push({ label: 'Purity', value: '98.4%', status: 'good' });
      stats.push({ label: 'Flow Rate', value: '1,240 L/h', status: 'good' });
      stats.push({ label: 'Temp', value: '42°C', status: 'warning' });
      break;
    case 'Robotics Workshop':
      stats.push({ label: 'Active Bots', value: '14', status: 'good' });
      stats.push({ label: 'AI Sync', value: 'Stable', status: 'good' });
      stats.push({ label: 'Battery', value: '88%', status: 'good' });
      break;
    case 'Aeroponic Farms':
      stats.push({ label: 'Yield', value: '2.4t/wk', status: 'good' });
      stats.push({ label: 'Humidity', value: '65%', status: 'good' });
      stats.push({ label: 'Nutrients', value: 'Optimal', status: 'good' });
      break;
    case 'Barracks':
      stats.push({ label: 'Readiness', value: '100%', status: 'good' });
      stats.push({ label: 'Security', value: 'Max', status: 'good' });
      stats.push({ label: 'Garrison', value: '240', status: 'good' });
      break;
  }
  return stats;
};

const MOCK_STRUCTURES = [
  {
    structureId: 'struct-polymer',
    name: 'Polymer Plants' as const,
    currentAmount: 12,
    image: '/textures/structure_icons/Polymer_Plants.svg'
  },
  {
    structureId: 'struct-robotics',
    name: 'Robotics Workshop' as const,
    currentAmount: 8,
    image: '/textures/structure_icons/Robotics_Workshop.svg'
  },
  {
    structureId: 'struct-aeroponic',
    name: 'Aeroponic Farms' as const,
    currentAmount: 15,
    image: '/textures/structure_icons/Aeroponic_Farms.svg'
  },
  {
    structureId: 'struct-barracks',
    name: 'Barracks' as const,
    currentAmount: 5,
    image: '/textures/structure_icons/Barracks.svg'
  }
];


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
    float fresnel   = pow(clamp(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 0.0, 1.0), 2.5);
    float scanline  = sin(vPosition.y * 30.0 - uTime * 4.0) * 0.5 + 0.5;
    scanline        = pow(scanline, 6.0) * 0.35;
    float breathe   = sin(uTime * 1.0) * 0.5 + 0.5;
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
    float rim       = pow(clamp(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 0.0, 1.0), 1.8);
    float pulse     = sin(uTime * 0.8 + uRadius * 3.14159) * 0.5 + 0.5;
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
    float wave  = mod(uTime * 0.5, 1.0);
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
interface NodesProps {
  planetRadius?: number;
  planetId?: string;
}

export const Nodes: React.FC<NodesProps> = ({ planetRadius = 2.0, planetId }) => {
  const nodes = useGameStore(s => s.nodes);
  const setNodes = useGameStore(s => s.setNodes);
  const view = useGameStore(s => s.view);

  // Cryptographically Secure Pseudo-Random Number Generator to satisfy SonarQube
  const getSecureRandom = useCallback(() => {
    if (typeof window === 'undefined') return Math.random();
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] / (0xffffffff + 1);
  }, []);

  const structures = MOCK_STRUCTURES;
  const isLoading = false;
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  const isNodeClick = useRef(false);
  const pointerDownPos = useRef({ x: 0, y: 0 });
  const pointerDownTime = useRef(0);

  useEffect(() => {
    const handleDown = (e: PointerEvent) => {
      pointerDownPos.current = { x: e.clientX, y: e.clientY };
      pointerDownTime.current = Date.now();
    };

    const handleUp = (e: PointerEvent) => {
      if (!activeNodeId) {
        isNodeClick.current = false;
        return;
      }

      // If we just clicked a node marker, it handles its own selection logic
      if (isNodeClick.current) {
        isNodeClick.current = false;
        return;
      }

      // Don't close if we clicked inside the actual popup content
      const target = e.target as HTMLElement;
      if (target?.closest && target.closest('.node-popup-container')) {
        return;
      }

      const dx = e.clientX - pointerDownPos.current.x;
      const dy = e.clientY - pointerDownPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const duration = Date.now() - pointerDownTime.current;

      // Only close if it was a quick tap with minimal movement (not a swipe)
      if (distance < 10 && duration < 300) {
        setActiveNodeId(null);
      }
    };

    window.addEventListener('pointerdown', handleDown);
    window.addEventListener('pointerup', handleUp);

    return () => {
      window.removeEventListener('pointerdown', handleDown);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [activeNodeId]);

  // Clear nodes when loading starts or planet changes to prevent showing stale or mock data
  useEffect(() => {
    if (isLoading) {
      setNodes([]);
    }
  }, [isLoading, setNodes]);

  // Update global nodes in store when API data arrives
  useEffect(() => {
    if (!isLoading) {
      const maxCount = structures.length > 0
        ? Math.max(...structures.map(s => s.currentAmount), 0)
        : 0;

      if (maxCount === 0) {
        if (nodes.length > 0) setNodes([]);
        return;
      }

      const numNodes = Math.min(10, maxCount);
      const newNodes: NodeData[] = [];
      const placementRadius = planetRadius + 0.08; // Place lower, partially embedded in surface
      const seed = (planetId || 'default').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

      for (let i = 0; i < numNodes; i++) {
        const angleOffset = (seed % 100) / 100 * Math.PI * 2;
        const phi = (i / numNodes) * Math.PI * 2 + angleOffset;
        const theta = Math.PI * 0.5 + (Math.sin(i * 1.37 + seed) * 0.35);

        const x = placementRadius * Math.sin(theta) * Math.cos(phi);
        const y = placementRadius * Math.sin(theta) * Math.sin(phi);
        const z = placementRadius * Math.cos(theta);

        const nodeStructures: StructureData[] = [];
        const placedPositions: THREE.Vector2[] = [];

        for (let idx = 0; idx < structures.length; idx++) {
          const s = structures[idx];
          const amountInThisNode = Math.floor(s.currentAmount / numNodes) + (i < (s.currentAmount % numNodes) ? 1 : 0);
          if (amountInThisNode <= 0) continue;

          // Smart placement: Find a flat spot to prevent sinking into hills AND far from others
          let bestScore = Infinity;
          let bestX = 0, bestZ = 0, bestY = 0;

          // Try multiple samples in the clearing to find the flattest terrain
          for (let attempt = 0; attempt < 40; attempt++) {
            // Further spread and more attempts for cleaner layout
            const spreadRadius = 7.0 + (getSecureRandom() * 8.0);
            const sampleAngle = (idx / structures.length) * Math.PI * 2 + (i * 1.8) + (attempt * 0.4);

            const tx = Math.cos(sampleAngle) * spreadRadius;
            const tz = Math.sin(sampleAngle) * spreadRadius;

            // Collision check: Must be significantly far from previously placed structures
            let minDistanceToOthers = Infinity;
            for (const pos of placedPositions) {
              const d = Math.sqrt((tx - pos.x) ** 2 + (tz - pos.y) ** 2);
              if (d < minDistanceToOthers) minDistanceToOthers = d;
            }

            // Stricter clearance: 9.0 units for breathing room
            const distancePenalty = minDistanceToOthers < 9.0 ? (9.0 - minDistanceToOthers) * 15 : 0;

            const score = getFlatnessScore(tx, tz);
            // Weight flatness heavily, but prioritize spacing to prevent overlap
            const weightedScore = (score * 50) + (spreadRadius * 0.01) + distancePenalty;

            if (weightedScore < bestScore) {
              bestScore = weightedScore;
              bestX = tx;
              bestZ = tz;
              bestY = getTerrainWorldHeight(tx, tz);
              // Stop if we found a very flat spot with excellent clearance
              if (score < 0.02 && minDistanceToOthers > 10.0) break;
            }
          }

          placedPositions.push(new THREE.Vector2(bestX, bestZ));

          nodeStructures.push({
            id: `${s.structureId}-${i}`,
            type: s.name as StructureData['type'],
            image: s.image,
            amount: amountInThisNode,
            position: [bestX, bestY, bestZ] as [number, number, number],
            rotationY: Math.atan2(bestX, bestZ) + Math.PI,
            stats: generateMockStats(s.name)
          });
        }

        newNodes.push({
          id: `node-${i}`,
          position: new THREE.Vector3(x, y, z),
          structures: nodeStructures
        });
      }

      // Only update store if meaningful data changed
      const currentNodesData = JSON.stringify(nodes.map(n => ({ id: n.id, sCount: n.structures.length })));
      const newNodesData = JSON.stringify(newNodes.map(n => ({ id: n.id, sCount: n.structures.length })));

      if (currentNodesData !== newNodesData) {
        setNodes(newNodes);
      }
    }
  }, [structures, isLoading, planetId, setNodes, planetRadius]);

  const onNodeSelection = useCallback((id: string) => {
    isNodeClick.current = true;
    setActiveNodeId((prev) => (prev === id ? null : id));
    console.log('node selected', id);
  }, []);

  if (view !== 'ORBIT') return null;

  return (
    <group>
      {nodes.map((node, i) => (
        <NodeMarker
          key={node.id}
          id={node.id}
          index={i}
          position={node.position}
          planetRadius={planetRadius}
          seedOffset={i * 1.37}
          isActive={activeNodeId === node.id}
          onClick={onNodeSelection}
          nodeData={node}
        />
      ))}
    </group>
  );
};

// ─── SINGLE NODE MARKER ──────────────────────────────────────────────────────
interface NodeMarkerProps {
  id: string;
  index: number;
  position: THREE.Vector3;
  planetRadius: number;
  seedOffset: number;
  isActive: boolean;
  onClick: (id: string) => void;
  nodeData: NodeData;
}

const NodeMarker: React.FC<NodeMarkerProps> = memo(({
  id, index, position, planetRadius, seedOffset, onClick, isActive, nodeData
}) => {
  const coreMatRef = useRef<THREE.ShaderMaterial>(null);
  const aura1Ref = useRef<THREE.ShaderMaterial>(null);
  const aura2Ref = useRef<THREE.ShaderMaterial>(null);
  const aura3Ref = useRef<THREE.ShaderMaterial>(null);
  const ring2MatRef = useRef<THREE.ShaderMaterial>(null);
  const pingMatRef = useRef<THREE.ShaderMaterial>(null);
  const ring2Ref = useRef<THREE.Line>(null);
  const groupRef = useRef<THREE.Group>(null);

  // We use refs for internal animation state to avoid re-renders
  const stateRef = useRef({
    time: 0,
    hover: 0
  });

  const outward = useMemo(() => position.clone().normalize(), [position]);
  const scaledPosition = useMemo(() => {
    return outward.clone().multiplyScalar(planetRadius + 0.08);
  }, [outward, planetRadius]);

  const ringGeo1 = useMemo(() => buildRingGeometry(0.22, 80), []);
  const ringGeo2 = useMemo(() => buildRingGeometry(0.32, 80), []);

  const beamGeo = useMemo(() => {
    const pts = [new THREE.Vector3(0, 0, 0), outward.clone().multiplyScalar(-0.1)];
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [outward]);

  const ring2 = useMemo(() => new THREE.Line(ringGeo2), [ringGeo2]);
  const beamLine = useMemo(() => new THREE.Line(beamGeo), [beamGeo]);

  const pingGeo = useMemo(() => new THREE.PlaneGeometry(1.0, 1.0), []);
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

  const pingUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#00ccff') },
  }), []);

  const ringUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSpeed: { value: -1.7 },
    uColor: { value: new THREE.Color('#44ccff') },
    uHover: { value: 0 }
  }), []);

  const coreUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: BASE_COL.clone() },
    uHover: { value: 0 }
  }), [BASE_COL]);

  const auraUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: BASE_COL.clone() },
    uHover: { value: 0 },
    uRadius: { value: 1.0 }
  }), [BASE_COL]);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime + seedOffset;
    stateRef.current.time = t;

    // Smoothly interpolate hover value
    const targetHover = isActive ? 1.0 : 0.0;
    stateRef.current.hover = THREE.MathUtils.lerp(stateRef.current.hover, targetHover, delta * 4);
    const h = stateRef.current.hover;

    // Update Shader Uniforms directly
    if (coreMatRef.current) {
      coreUniforms.uTime.value = t;
      coreUniforms.uHover.value = h;
    }
    if (ring2MatRef.current) {
      ringUniforms.uTime.value = t;
      ringUniforms.uHover.value = h;
    }
    if (pingMatRef.current) {
      pingUniforms.uTime.value = t;
    }

    [aura1Ref, aura2Ref, aura3Ref].forEach(ref => {
      if (ref.current) {
        auraUniforms.uTime.value = t;
        auraUniforms.uHover.value = h;
      }
    });

    if (ring2Ref.current) ring2Ref.current.rotation.z = -t * 0.55;

    if (groupRef.current) {
      groupRef.current.position.copy(scaledPosition);
      groupRef.current.position.addScaledVector(outward, Math.sin(t * 1.1) * 0.008);
    }
  });

  const onNodesClick = (e: any) => {
    e.stopPropagation();
    onClick(id);
    console.log('node clicked', id);
  }

  return (
    <group ref={groupRef} position={scaledPosition}>

      {/* Invisible hit target — massive for foolproof interaction */}
      <mesh
        onClick={onNodesClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <sphereGeometry args={[0.45, 12, 12]} />
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
          uniforms={pingUniforms}
        />
      </mesh>

      {/* Orbital ring 2 — wide, tilted, opposite direction */}
      <primitive object={ring2} ref={ring2Ref} quaternion={ring2Quat}>
        <shaderMaterial
          ref={ring2MatRef}
          vertexShader={ringVertexShader}
          fragmentShader={ringFragmentShader}
          transparent depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={ringUniforms}
        />
      </primitive>

      {/* Core energy sphere (shader) */}
      <mesh>
        <sphereGeometry args={[0.085, 32, 32]} />
        <shaderMaterial
          ref={coreMatRef}
          vertexShader={coreVertexShader}
          fragmentShader={coreFragmentShader}
          transparent depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={coreUniforms}
        />
      </mesh>

      {/* Solid bright centre dot */}
      <mesh scale={0.65}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color={'#e8f8ff'} toneMapped={true} />
      </mesh>

      {/* 3D Information Popup */}
      {isActive && (
        <NodePopup
          title={`Sector ${getRomanNumeral(index + 1)}`}
          structures={nodeData.structures}
          nodeData={nodeData}
          onClose={() => onClick('')}
          outward={outward}
        />
      )}

    </group>
  );
});

// ─── INFO POPUP COMPONENT ────────────────────────────────────────────────────
interface NodePopupProps {
  title: string;
  structures: StructureData[];
  nodeData: NodeData;
  onClose: () => void;
  outward: THREE.Vector3;
}

function getRomanNumeral(num: number): string {
  const romanMap = [
    { v: 10, s: 'X' },
    { v: 9, s: 'IX' },
    { v: 5, s: 'V' },
    { v: 4, s: 'IV' },
    { v: 1, s: 'I' }
  ];
  let res = '';
  for (const { v, s } of romanMap) {
    while (num >= v) {
      res += s;
      num -= v;
    }
  }
  return res || 'I';
}

const getStructureIconPath = (name: string) => {
  // Standardize naming to match files in public/textures/structure_icons (using underscores)
  const iconName = name.trim().replace(/\s+/g, '_');
  return `/textures/structure_icons/${iconName}.svg`;
};

const NodePopup: React.FC<NodePopupProps> = ({ title, structures, nodeData, onClose, outward }) => {
  const isMobile = useIsMobile();
  const selectNode = useGameStore(s => s.selectNode);
  const setSelectedStructure = useGameStore(s => s.setSelectedStructure);

  // Calculate position offset along the outward normal
  const popupPosition = useMemo(() => {
    return outward.clone().multiplyScalar(0.25); // Offset from the node center
  }, [outward]);

  return (
    <Html
      center
      distanceFactor={isMobile ? 5 : 8} // Increased for larger appearance (distanceFactor / distance)
      position={popupPosition}
      // Removed occlude to ensure it stays visible when selected
      sprite
      style={{
        pointerEvents: 'none', // Critical: Let world clicks pass through to the canvas
        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        zIndex: 1000
      }}
    >
      <div
        className="node-popup-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="popup-scanline" />

        {/* Animated Border Glow */}
        <svg className="popup-border-svg" width="100%" height="100%">
          <rect
            x="0.5"
            y="0.5"
            width="calc(100% - 1px)"
            height="calc(100% - 1px)"
            rx="12"
            className="border-glow-path"
          />
        </svg>
        <div className="popup-header">
          <div className="header-title-group">
            <div className="status-dot" />
            <h3>{title}</h3>
          </div>
          <button className="close-button" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="3" fill="none">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="popup-content">
          {structures.map((s, idx) => (
            <div
              key={s.id || idx}
              className="structure-item"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <div className="structure-icon-wrapper">
                <img
                  src={s.image || getStructureIconPath(s.type)}
                  alt={s.type}
                  className="structure-icon"
                  onError={(e) => {
                    // Fallback if SVG doesn't exist
                    (e.target as HTMLImageElement).style.display = 'none';
                    const next = (e.target as HTMLImageElement).nextElementSibling;
                    if (next) (next as HTMLElement).style.display = 'block';
                  }}
                />
                <div className="structure-icon-placeholder" style={{ display: 'none' }} />
              </div>
              <div className="structure-details">
                <span className="structure-name">{s.type}</span>
                <span className="structure-count">Built: {s.amount || 0}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="popup-footer">
          <button
            className="footer-visit-button"
            onClick={(e) => {
              e.stopPropagation();
              selectNode(nodeData);
            }}
          >
            VISIT SECTOR
          </button>
        </div>

        <style jsx>{`
                    .node-popup-container {
                        position: relative;
                        pointer-events: auto; /* Re-enable for the actual content */
                        background: radial-gradient(circle at top left, rgba(10, 30, 50, 0.94), rgba(5, 15, 25, 0.98));
                        backdrop-filter: blur(24px) saturate(160%);
                        border: 1px solid rgba(0, 212, 255, 0.25);
                        border-top: 1px solid rgba(0, 212, 255, 0.45);
                        border-radius: 12px;
                        padding: 16px 20px 24px;
                        min-width: 250px;
                        color: white;
                        box-shadow: 
                            0 20px 50px rgba(0, 0, 0, 0.7), 
                            inset 0 0 0 1px rgba(255, 255, 255, 0.05),
                            inset 0 0 15px rgba(0, 212, 255, 0.05);
                        animation: popupReveal 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                        user-select: none;
                        font-family: 'Outfit', 'Inter', sans-serif;
                    }

                    @media (max-width: 768px) {
                        .node-popup-container {
                            padding: 8px 12px 16px;
                            min-width: 140px;
                            border-radius: 8px;
                        }
                    }

                    .popup-scanline {
                        position: absolute;
                        inset: 0;
                        background: linear-gradient(
                            to bottom,
                            transparent 50%,
                            rgba(0, 212, 255, 0.03) 50%
                        );
                        background-size: 100% 4px;
                        pointer-events: none;
                        z-index: 10;
                        opacity: 0.5;
                        border-radius: inherit;
                        overflow: hidden;
                    }

                    @keyframes popupReveal {
                        from { 
                            opacity: 0; 
                            transform: scale(0.9) translateY(15px); 
                            filter: brightness(2) blur(10px);
                        }
                        to { 
                            opacity: 1; 
                            transform: scale(1) translateY(0); 
                            filter: brightness(1) blur(0);
                        }
                    }

                    .popup-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 10px;
                        position: relative;
                        z-index: 20;
                    }

                    .header-title-group {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    }

                    .status-dot {
                        width: 5px;
                        height: 5px;
                        background: #00d4ff;
                        border-radius: 50%;
                        box-shadow: 0 0 8px #00d4ff;
                        animation: blink 2s ease-in-out infinite;
                    }

                    @keyframes blink {
                        0%, 100% { opacity: 1; transform: scale(1); }
                        50% { opacity: 0.4; transform: scale(0.8); }
                    }

                    .popup-header h3 {
                        margin: 0;
                        font-size: 14px;
                        text-transform: uppercase;
                        letter-spacing: 3.2px;
                        color: rgba(0, 212, 255, 0.9);
                        font-weight: 700;
                        text-shadow: 0 0 12px rgba(0, 212, 255, 0.3);
                    }

                    @media (max-width: 768px) {
                       .popup-header h3 {
                            font-size: 10px;
                            letter-spacing: 1.5px;
                        }
                        .popup-header {
                            margin-bottom: 12px;
                        }
                        .close-button {
                            width: 14px;
                            height: 14px;
                            border-radius: 3px;
                            font-size: 10px;
                        }
                    }

                    .close-button {
                        background: rgba(255, 255, 255, 0.05);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        color: rgba(255, 255, 255, 0.4);
                        width: 20px;
                        height: 20px;
                        border-radius: 5px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
                        padding: 0;
                    }
                    .close-button:hover { 
                        color: #ff4d6b; 
                        background: rgba(255, 77, 107, 0.1);
                        border-color: rgba(255, 77, 107, 0.3);
                        transform: rotate(90deg);
                    }

                    .popup-content {
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                        max-height: 160px;
                        overflow-y: auto;
                        padding-right: 4px;
                        position: relative;
                        z-index: 20;
                    }

                    .popup-content::-webkit-scrollbar {
                        width: 2px;
                    }
                    .popup-content::-webkit-scrollbar-thumb {
                        background: rgba(0, 212, 255, 0.2);
                        border-radius: 1px;
                    }

                    .structure-item {
                        display: flex;
                        align-items: center;
                        gap: 14px;
                        background: rgba(255, 255, 255, 0.02);
                        border: 1px solid rgba(255, 255, 255, 0.04);
                        border-radius: 10px;
                        padding: 10px 14px;
                        transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
                        animation: itemReveal 0.6s ease-out both;
                    }

                    @media (max-width: 768px) {
                        .structure-item {
                            padding: 6px 10px;
                            gap: 8px;
                            border-radius: 8px;
                        }
                    }

                    .structure-item:hover {
                        background: rgba(0, 212, 255, 0.06);
                        border-color: rgba(0, 212, 255, 0.15);
                        transform: translateX(3px);
                    }

                    @keyframes itemReveal {
                        from { opacity: 0; transform: translateX(-10px); filter: blur(4px); }
                        to { opacity: 1; transform: translateX(0); filter: blur(0); }
                    }

                    .structure-icon-wrapper {
                        width: 48px;
                        height: 48px;
                        border-radius: 10px;
                        overflow: hidden;
                        background: rgba(0, 0, 0, 0.2);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border: 1px solid rgba(0, 212, 255, 0.1);
                        flex-shrink: 0;
                        transition: all 0.3s ease;
                    }

                    @media (max-width: 768px) {
                        .structure-icon-wrapper {
                            width: 28px;
                            height: 28px;
                            border-radius: 4px;
                        }
                    }

                    .structure-item:hover .structure-icon-wrapper {
                        border-color: rgba(0, 212, 255, 0.3);
                        background: rgba(0, 0, 0, 0.4);
                        transform: scale(1.05);
                    }

                    .structure-icon {
                        width: 80%;
                        height: 80%;
                        object-fit: contain;
                        filter: drop-shadow(0 0 5px rgba(0, 212, 255, 0.2));
                    }

                    .structure-icon-placeholder {
                        width: 14px;
                        height: 14px;
                        background: #00d4ff;
                        box-shadow: 0 0 10px #00d4ff;
                        border-radius: 50%;
                    }

                    .structure-details {
                        display: flex;
                        flex-direction: column;
                        min-width: 0;
                    }

                    .structure-name {
                        font-size: 14px;
                        font-weight: 700;
                        color: rgba(255, 255, 255, 0.95);
                        letter-spacing: 0.3px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }

                    .structure-count {
                        font-size: 11px;
                        color: rgba(0, 212, 255, 0.6);
                        margin-top: 2px;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 1.1px;
                    }

                    .visit-button {
                        margin-left: auto;
                        background: rgba(0, 212, 255, 0.08);
                        border: 1px solid rgba(0, 212, 255, 0.25);
                        color: #00d4ff;
                        font-size: 10px;
                        font-weight: 900;
                        padding: 7px 16px;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                        letter-spacing: 0.15em;
                        pointer-events: auto;
                        text-transform: uppercase;
                        font-family: 'JetBrains Mono', monospace;
                        box-shadow: 0 0 0 rgba(0, 212, 255, 0);
                    }

                    .visit-button:hover {
                        background: rgba(0, 212, 255, 0.18);
                        border-color: rgba(0, 212, 255, 0.6);
                        box-shadow: 0 0 15px rgba(0, 212, 255, 0.25);
                        transform: translateY(-1px);
                        color: white;
                    }

                    .visit-button:active {
                        transform: translateY(0);
                        background: rgba(0, 212, 255, 0.3);
                    }

                    @media (max-width: 768px) {
                        .structure-name {
                            font-size: 10px;
                        }
                        .structure-count {
                            font-size: 8px;
                            letter-spacing: 0.5px;
                        }
                        .visit-button {
                            display: none;
                        }
                    }

                    .footer-visit-button {
                        width: 100%;
                        background: #00d4ff;
                        border: none;
                        color: #051525;
                        font-size: 13px;
                        font-weight: 900;
                        padding: 14px;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                        letter-spacing: 0.2em;
                        pointer-events: auto;
                        text-transform: uppercase;
                        font-family: 'JetBrains Mono', monospace;
                        margin-top: 4px;
                        margin-bottom: 8px;
                        box-shadow: 0 0 20px rgba(0, 212, 255, 0.4);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        animation: pulseGlow 2s infinite;
                    }

                    @keyframes pulseGlow {
                        0% { box-shadow: 0 0 15px rgba(0, 212, 255, 0.4); }
                        50% { box-shadow: 0 0 30px rgba(0, 212, 255, 0.7); }
                        100% { box-shadow: 0 0 15px rgba(0, 212, 255, 0.4); }
                    }

                    .footer-visit-button:hover {
                        background: #e8f8ff;
                        transform: translateY(-3px) scale(1.02);
                        box-shadow: 0 10px 30px rgba(0, 212, 255, 0.6);
                        color: #008eb3;
                    }

                    .footer-visit-button:active {
                        transform: translateY(-1px);
                    }

                    @media (max-width: 768px) {
                        .footer-visit-button {
                            padding: 10px;
                            font-size: 11px;
                            letter-spacing: 0.1em;
                        }
                    }

                    .popup-footer {
                        position: relative;
                        margin-top: 10px;
                        z-index: 20;
                    }

                    .popup-border-svg {
                        position: absolute;
                        inset: 0;
                        width: 100%;
                        height: 100%;
                        pointer-events: none;
                        fill: none;
                        z-index: 10;
                    }

                    .border-glow-path {
                        stroke: #00d4ff;
                        stroke-width: 1.5;
                        stroke-dasharray: 60, 1000;
                        stroke-linecap: round;
                        filter: drop-shadow(0 0 8px #00d4ff);
                        animation: borderFlow 4s linear infinite;
                        vector-effect: non-scaling-stroke;
                    }

                    @keyframes borderFlow {
                        from { stroke-dashoffset: 1060; }
                        to { stroke-dashoffset: 0; }
                    }
                `}</style>
      </div>
    </Html>
  );
};
