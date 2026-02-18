import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';

const transitionVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // Standard full-screen quad position logic isn't needed here 
    // because we'll place this plane right in front of the camera
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
    
    // Smooth progress curve
    float p = smoothstep(0.0, 0.5, uProgress) * smoothstep(1.0, 0.5, uProgress);
    
    // Radial speed lines with jitter
    float lineCount = 80.0;
    float lineAngle = floor(angle * lineCount / 6.2831) * (6.2831 / lineCount);
    float noise = hash(vec2(lineAngle, 1.0));
    
    // Chromatic aberration for lines
    float linesR = sin(angle * lineCount + noise * 5.0 + uTime * 25.0);
    float linesG = sin(angle * lineCount + noise * 5.0 + uTime * 26.0);
    float linesB = sin(angle * lineCount + noise * 5.0 + uTime * 24.0);
    
    linesR = smoothstep(0.8 - p * 0.2, 1.0, linesR);
    linesG = smoothstep(0.8 - p * 0.2, 1.0, linesG);
    linesB = smoothstep(0.8 - p * 0.2, 1.0, linesB);
    
    // Distance masking
    float mask = smoothstep(0.0, 0.5, dist) * (1.0 - smoothstep(0.4, 0.6, dist * (1.0 - p * 0.5)));
    
    vec3 color = vec3(linesR * 0.2, linesG * 0.6, linesB * 1.0);
    float alpha = max(linesR, max(linesG, linesB)) * mask * p * 1.5;
    
    // Core burst
    float burst = (1.0 - smoothstep(0.0, 0.2 + p * 0.3, dist)) * p;
    color += burst * vec3(0.5, 0.8, 1.0);
    alpha += burst * 0.4;
    
    // Particles/Energy sparks
    float sparkAngle = angle + uTime * 2.0;
    float sparks = sin(sparkAngle * 10.0 + dist * 20.0 - uTime * 15.0);
    sparks = pow(max(0.0, sparks), 20.0) * p * step(0.2, dist);
    color += sparks * vec3(1.0, 1.0, 1.0);
    alpha += sparks;

    gl_FragColor = vec4(color, alpha);
  }
`;

export const TransitionVFX: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { camera, viewport } = useThree();
  const isTransitioning = useGameStore(state => state.isTransitioning);
  const view = useGameStore(state => state.view);
  const startTime = useRef<number | null>(null);

  // Reset start time whenever transition triggers
  useEffect(() => {
    if (isTransitioning) {
      startTime.current = null;
    }
  }, [isTransitioning, view]);

  // Calculate dynamic scale based on viewport to cover screen at 0.2 distance
  const scale = useMemo(() => {
    const height = 0.2 * Math.tan((camera as THREE.PerspectiveCamera).fov * 0.5 * Math.PI / 180) * 2;
    const width = height * viewport.aspect;
    return [width * 1.5, height * 1.5, 1] as [number, number, number];
  }, [camera, viewport.aspect]);

  useFrame(({ clock }) => {
    if (!materialRef.current || !meshRef.current) return;

    // Only show VFX when transitioning TO a node (TRANSITION view)
    // Don't show it when returning to orbit (where view is already set to ORBIT)
    if (isTransitioning && view === 'TRANSITION') {
      if (startTime.current === null) {
        startTime.current = clock.elapsedTime;
      }

      const elapsed = clock.elapsedTime - startTime.current;
      const duration = 1.2; // Slightly faster than the store timeout for snappier feel
      const progress = Math.min(elapsed / duration, 1.0);

      materialRef.current.uniforms.uProgress.value = progress;
      materialRef.current.uniforms.uTime.value = clock.elapsedTime;

      // Keep in front of camera
      const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      meshRef.current.position.copy(camera.position).addScaledVector(direction, 0.1); // Closer to camera
      meshRef.current.quaternion.copy(camera.quaternion);

      meshRef.current.visible = true;
    } else {
      startTime.current = null;
      meshRef.current.visible = false;
    }
  });

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uProgress: { value: 0 },
  }), []);

  return (
    <mesh ref={meshRef} frustumCulled={false} scale={scale}>
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
