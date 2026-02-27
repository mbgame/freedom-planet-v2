'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';

const transitionVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const transitionFragmentShader = `
  uniform float uTime;
  uniform float uProgress;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec2 uv = vUv - 0.5;
    float dist = length(uv);
    float angle = atan(uv.y, uv.x);
    
    // Smooth progress curve: 0.0 -> 0.5 (Fade in), 0.5 -> 1.0 (Fade out)
    float p = smoothstep(0.0, 0.45, uProgress) * smoothstep(1.0, 0.55, uProgress);
    
    // Radial speed lines with jitter
    float lineCount = 120.0;
    float lineAngle = floor(angle * lineCount / 6.2831) * (6.2831 / lineCount);
    float noise = hash(vec2(lineAngle, 1.0));
    
    // Chromatic aberration for lines
    float linesR = sin(angle * lineCount + noise * 5.0 + uTime * 35.0);
    float linesG = sin(angle * lineCount + noise * 5.0 + uTime * 36.0);
    float linesB = sin(angle * lineCount + noise * 5.0 + uTime * 34.0);
    
    linesR = smoothstep(0.8 - p * 0.3, 1.0, linesR);
    linesG = smoothstep(0.8 - p * 0.3, 1.0, linesG);
    linesB = smoothstep(0.8 - p * 0.3, 1.0, linesB);
    
    // Distance masking
    float mask = smoothstep(0.0, 0.4, dist) * (1.0 - smoothstep(0.4, 0.6, dist * (1.0 - p * 0.6)));
    
    vec3 color = vec3(linesR * 0.3, linesG * 0.7, linesB * 1.0);
    float alpha = max(linesR, max(linesG, linesB)) * mask * p * 2.0;
    
    // Core burst
    float burst = (1.0 - smoothstep(0.0, 0.15 + p * 0.4, dist)) * p;
    color += burst * vec3(0.6, 0.9, 1.0);
    alpha += burst * 0.6;
    
    // Center point flash
    float center = (1.0 - smoothstep(0.0, 0.05, dist)) * p;
    color += center * 2.0;
    alpha += center;

    gl_FragColor = vec4(color, alpha);
  }
`;

export const TransitionVFX: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { camera, viewport } = useThree();
  const isTransitioning = useGameStore(state => state.isTransitioning);
  const view = useGameStore(state => state.view);

  // ─── Use REFS only for animation state – no useState inside useFrame ─────
  const progressRef = useRef(0);
  const phase = useRef<'IN' | 'HOLD' | 'OUT' | 'IDLE'>('IDLE');

  // Calculate dynamic scale to cover screen
  const scale = useMemo(() => {
    const height = 0.2 * Math.tan((camera as THREE.PerspectiveCamera).fov * 0.5 * Math.PI / 180) * 2;
    const width = height * viewport.aspect;
    return [width * 2, height * 2, 1] as [number, number, number];
  }, [camera, viewport.aspect]);

  // Drive phase transitions based on view/isTransitioning changes
  useEffect(() => {
    if (view === 'TRANSITION') {
      phase.current = 'IN';
      progressRef.current = 0;
    } else if (view === 'SURFACE' && isTransitioning) {
      phase.current = 'OUT';
    } else if (!isTransitioning) {
      progressRef.current = 0;
      phase.current = 'IDLE';
    }
  }, [view, isTransitioning]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uProgress: { value: 0 },
  }), []);

  useFrame((state, delta) => {
    if (!materialRef.current || !meshRef.current) return;

    if (!isTransitioning || phase.current === 'IDLE') {
      meshRef.current.visible = false;
      return;
    }

    // ─── Pure ref-based phase animation (no setState, no re-renders) ───────
    if (phase.current === 'IN') {
      progressRef.current = Math.min(progressRef.current + delta * 0.8, 0.5);
      if (progressRef.current >= 0.5) {
        phase.current = 'HOLD';
      }
    } else if (phase.current === 'HOLD') {
      progressRef.current = 0.5; // pinned
    } else if (phase.current === 'OUT') {
      progressRef.current = Math.min(progressRef.current + delta * 0.7, 1.0);
    }

    const p = progressRef.current;

    // Update shader uniforms directly (no React state involved)
    materialRef.current.uniforms.uProgress.value = p;
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;

    // Position in front of camera
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    meshRef.current.position.copy(camera.position).addScaledVector(direction, 0.1);
    meshRef.current.quaternion.copy(camera.quaternion);
    meshRef.current.visible = p > 0 && p < 1;
  });

  return (
    <mesh ref={meshRef} frustumCulled={false} scale={scale} renderOrder={999}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={transitionVertexShader}
        fragmentShader={transitionFragmentShader}
        transparent
        depthTest={false}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
      />
    </mesh>
  );
};
