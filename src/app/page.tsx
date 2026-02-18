'use client';

import dynamic from 'next/dynamic';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { UIOverlay } from '@/components/ui/UIOverlay';
import { Suspense } from 'react';

// Dynamically import 3D scene to avoid SSR issues
const SceneManager = dynamic(
  () => import('@/components/3d/SceneManager').then(mod => ({ default: mod.SceneManager })),
  { ssr: false }
);

export default function Home() {
  return (
    <main className="w-full h-screen bg-[#020617] relative overflow-hidden font-sans select-none">
      <LoadingScreen />
      <UIOverlay />
      
      <Canvas
        dpr={[1, 2]} // Adaptive pixel ratio for performance
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        camera={{
          position: [0, 0, 8],
          fov: 45,
          near: 0.1,
          far: 1000,
        }}
        shadows
        // Performance mode - only render when necessary
        frameloop="always"
      >
        <Suspense fallback={null}>
          <SceneManager />
        </Suspense>
      </Canvas>
    </main>
  );
}
