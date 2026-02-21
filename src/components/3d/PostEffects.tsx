'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { EffectComposer, DepthOfField, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import { useGameStore } from '@/store/gameStore';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * PostEffects handles screen-space visual enhancements.
 * 
 * Optimized for mobile and stable Focus tracking.
 */
export const PostEffects = () => {
    const view = useGameStore(state => state.view);
    const selectedMoon = useGameStore(state => state.selectedMoon);
    const { size } = useThree();
    const dofRef = useRef<any>(null);
    const [mounted, setMounted] = useState(false);

    // Using a reactive target vector for Depth of Field
    const focusTarget = useMemo(() => new THREE.Vector3(0, 0, 0), []);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isMobile = useMemo(() => size.width < 768, [size.width]);

    useFrame((state) => {
        if (!mounted || view !== 'MOON' || !selectedMoon) return;

        // Update the DOF target to follow the moon orbit exactly
        const t = state.clock.getElapsedTime() * selectedMoon.speed + selectedMoon.angle;
        const moonX = Math.cos(t) * selectedMoon.distance;
        const moonZ = Math.sin(t) * selectedMoon.distance;

        focusTarget.set(moonX, 0, moonZ);
    });

    if (!mounted || view === 'SURFACE') return null;

    const children = [
        <Bloom
            key="bloom"
            intensity={0.25} // Very conservative to prevent flickering
            luminanceThreshold={1.0}
            luminanceSmoothing={0.9}
            height={256}
        />,
        view === 'MOON' ? (
            <DepthOfField
                key="dof"
                ref={dofRef}
                target={focusTarget}
                focalLength={0.02} // Wide focus area to ensure moon is sharp
                bokehScale={isMobile ? 1.5 : 3.0} // Subtle blur for background
                height={isMobile ? 240 : 480}
            />
        ) : null,
        <Vignette key="vignette" offset={0.05} darkness={0.4} />,
        <Noise key="noise" opacity={0.01} />
    ].filter(Boolean) as React.ReactElement[];

    return (
        <EffectComposer
            key="post-effects-composer"
            multisampling={isMobile ? 0 : 2}
        >
            {children}
        </EffectComposer>
    );
};
