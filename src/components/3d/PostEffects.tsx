'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { EffectComposer, DepthOfField, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import { useGameStore } from '@/store/gameStore';
import { useFrame, useThree } from '@react-three/fiber';
import { useControls, folder } from 'leva';
import * as THREE from 'three';

/**
 * PostEffects handles screen-space visual enhancements.
 * 
 * Includes Fix for "Drifting Focus":
 * The camera and moon both move, so we must update the DOF target position 
 * every single frame via ref to ensure it remains razor-sharp.
 */
export const PostEffects = () => {
    const view = useGameStore(state => state.view);
    const selectedMoon = useGameStore(state => state.selectedMoon);
    const { size } = useThree();
    const dofRef = useRef<any>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isMobile = useMemo(() => size.width < 768, [size.width]);

    // Leva controls for Post Processing
    const {
        bloomIntensity,
        bloomThreshold,
        bloomSmoothing,
        dofFocalLength,
        dofBokehScale,
        autoFocus,
        manualFocusDistance,
        vignetteOffset,
        vignetteDarkness,
        noiseOpacity
    } = useControls('Post Processing', {
        Bloom: folder({
            bloomIntensity: { value: 0.25, min: 0, max: 2, step: 0.01, label: 'Intensity' },
            bloomThreshold: { value: 1.0, min: 0, max: 1, step: 0.01, label: 'Threshold' },
            bloomSmoothing: { value: 0.9, min: 0, max: 1, step: 0.01, label: 'Smoothing' },
        }),
        DOF: folder({
            dofFocalLength: { value: 0.05, min: 0.01, max: 0.5, step: 0.01, label: 'Focal Length' },
            dofBokehScale: { value: isMobile ? 1.5 : 4.0, min: 0, max: 20, step: 0.1, label: 'Bokeh Scale' },
            autoFocus: { value: true, label: 'Auto Focus' },
            manualFocusDistance: {
                value: 0.02,
                min: 0,
                max: 1.0,
                step: 0.001,
                label: 'Manual Dist',
                // Note: In some versions of Leva, conditional visibility is handled via 'render' or 'hidden'
            },
        }),
        Vignette: folder({
            vignetteOffset: { value: 0.05, min: 0, max: 1, step: 0.01, label: 'Offset' },
            vignetteDarkness: { value: 0.4, min: 0, max: 1, step: 0.01, label: 'Darkness' },
        }),
        Noise: folder({
            noiseOpacity: { value: 0.01, min: 0, max: 0.1, step: 0.001, label: 'Opacity' },
        })
    }, { collapsed: true });

    useFrame((state) => {
        if (!mounted || view !== 'MOON' || !selectedMoon || !dofRef.current) return;

        if (autoFocus) {
            // Update the DOF target to follow the moon orbit exactly every frame
            const t = state.clock.getElapsedTime() * selectedMoon.speed + selectedMoon.angle;
            const moonX = Math.cos(t) * selectedMoon.distance;
            const moonZ = Math.sin(t) * selectedMoon.distance;

            // Crucial: Update the actual property on the effect object
            if (dofRef.current.target) {
                dofRef.current.target.set(moonX, 0, moonZ);
            }
        } else {
            // Use manual normalized focus distance (0-1)
            if (dofRef.current.circleOfConfusionMaterial) {
                dofRef.current.circleOfConfusionMaterial.uniforms.focusDistance.value = manualFocusDistance;
            }
        }
    });

    if (!mounted || view === 'SURFACE') return null;

    const children = [
        <Bloom
            key="bloom"
            intensity={bloomIntensity}
            luminanceThreshold={bloomThreshold}
            luminanceSmoothing={bloomSmoothing}
            height={256}
        />,
        view === 'MOON' ? (
            <DepthOfField
                key="dof"
                ref={dofRef}
                // When target is used, focalLength and bokehScale are secondary to the distance calc
                focalLength={dofFocalLength}
                bokehScale={dofBokehScale}
                height={isMobile ? 240 : 480}
            />
        ) : null,
        <Vignette
            key="vignette"
            offset={vignetteOffset}
            darkness={vignetteDarkness}
        />,
        <Noise
            key="noise"
            opacity={noiseOpacity}
        />
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
