'use client';
import { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

// ─── Poly Haven 1K HDRIs (CC0) ───────────────────────────────────────────────
//
//  Key fix vs previous version:
//    OLD: scene.background = pmremResult  → blurry because PMREM pre-filters
//         the cubemap for IBL, destroying high-freq detail (stars, horizon).
//    NEW: raw equirectangular texture → large inverted sphere mesh
//         PMREM result → scene.environment only (IBL/reflections)
//
//  This gives crisp, full-res sky visuals while still feeding proper
//  image-based lighting to all PBR materials.
// ─────────────────────────────────────────────────────────────────────────────

const PH = 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k';

export type SkyPreset = {
    slug: string;
    label: string;
    exposure: number;
};

export const SKY_PRESETS: SkyPreset[] = [
    { slug: 'rogland_moonlit_night', label: 'Moonlit Desert', exposure: 2.8 },
    { slug: 'rogland_clear_night', label: 'Clear Starfield', exposure: 3.2 },
    { slug: 'rogland_sunset', label: 'Alien Sunset', exposure: 1.0 },
    { slug: 'wasteland_clouds_puresky', label: 'Wasteland Dusk', exposure: 1.2 },
    { slug: 'kiara_1_dawn', label: 'Violet Dawn', exposure: 1.5 },
    { slug: 'qwantani_moon_noon_puresky', label: 'Cold Moonlight', exposure: 2.6 },
];

function pickRandom(): SkyPreset {
    return SKY_PRESETS[Math.floor(Math.random() * SKY_PRESETS.length)];
}

interface SkyboxHDRProps {
    preset?: string;  // slug override; omit for random-per-mount
    rotation?: number;  // Y-axis in radians to orient bright horizon
    radius?: number;  // sky sphere radius (default 900 — very far, never clips)
}

export const SkyboxHDR: React.FC<SkyboxHDRProps> = ({
    preset: presetOverride,
    rotation = Math.PI * 0.15,
    radius = 900,
}) => {
    const { gl, scene } = useThree();
    const meshRef = useRef<THREE.Mesh>(null);
    const [skyTex, setSkyTex] = useState<THREE.DataTexture | null>(null);

    const preset = useMemo<SkyPreset>(() => {
        if (presetOverride) return SKY_PRESETS.find(p => p.slug === presetOverride) ?? pickRandom();
        return pickRandom();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Load, split into: raw tex (sphere) + PMREM (scene.environment only) ───
    useEffect(() => {
        let cancelled = false;
        let rawTex: THREE.DataTexture | null = null;
        let envMap: THREE.Texture | null = null;

        const prevEnv = scene.environment;
        const prevBg = scene.background;
        const prevTM = gl.toneMapping;
        const prevExp = gl.toneMappingExposure;

        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = preset.exposure;
        scene.background = null; // sphere handles visuals, not scene.background

        new RGBELoader()
            .setDataType(THREE.HalfFloatType) // ~50% VRAM vs FloatType, fine for mobile
            .load(
                `${PH}/${preset.slug}_1k.hdr`,
                (hdr) => {
                    if (cancelled) { hdr.dispose(); return; }

                    // Full-res equirect → sky sphere material (sharp stars, horizon, etc.)
                    hdr.mapping = THREE.EquirectangularReflectionMapping;
                    hdr.minFilter = THREE.LinearMipmapLinearFilter;
                    hdr.magFilter = THREE.LinearFilter;
                    hdr.generateMipmaps = true;
                    rawTex = hdr;
                    setSkyTex(hdr);

                    // PMREM → only used for scene.environment (IBL/reflections on meshes)
                    const pmrem = new THREE.PMREMGenerator(gl);
                    pmrem.compileEquirectangularShader();
                    envMap = pmrem.fromEquirectangular(hdr).texture;
                    pmrem.dispose();

                    if (cancelled) { envMap!.dispose(); return; }
                    scene.environment = envMap;
                },
                undefined,
                (err) => console.warn('[SkyboxHDR] Failed:', err),
            );

        return () => {
            cancelled = true;
            scene.environment = prevEnv;
            scene.background = prevBg;
            gl.toneMapping = prevTM;
            gl.toneMappingExposure = prevExp;
            rawTex?.dispose();
            envMap?.dispose();
            setSkyTex(null);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preset]);

    // ── Geometry: large inverted sphere, 32-seg (cheap on mobile) ─────────────
    const geometry = useMemo(() => {
        const geo = new THREE.SphereGeometry(radius, 32, 32);
        geo.scale(-1, 1, 1); // invert normals → visible from inside
        return geo;
    }, [radius]);

    // ── Material ──────────────────────────────────────────────────────────────
    const material = useMemo(() => new THREE.MeshBasicMaterial({
        depthWrite: false,
        depthTest: false,
        fog: false,
    }), []);

    useEffect(() => {
        material.map = skyTex;
        material.needsUpdate = true;
    }, [skyTex, material]);

    // ── Follow camera so horizon never moves regardless of camera travel ───────
    useFrame(({ camera }) => {
        meshRef.current?.position.copy(camera.position);
    });

    return (
        <mesh
            ref={meshRef}
            geometry={geometry}
            material={material}
            rotation={[0, rotation, 0]}
            renderOrder={-1}
            frustumCulled={false}
        />
    );
};
