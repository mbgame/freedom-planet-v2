'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Float, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, type SpawnedHero } from '@/store/gameStore';

interface HeroAvatarProps {
    data: SpawnedHero;
}

export const HeroAvatar: React.FC<HeroAvatarProps> = ({ data }) => {
    const heroes = useGameStore(state => state.heroes);
    const setSelectedHeroDetail = useGameStore(state => state.setSelectedHeroDetail);
    const hero = useMemo(() => heroes.find(h => h.id === data.heroId), [heroes, data.heroId]);

    const beamRef = useRef<THREE.Mesh>(null);
    const beamMatRef = useRef<THREE.MeshBasicMaterial>(null);
    const ringRef = useRef<THREE.Mesh>(null);

    useFrame(({ clock }) => {
        if (ringRef.current) {
            ringRef.current.rotation.z += 0.02;
        }

        // Spawn VFX logic
        if (beamRef.current && beamMatRef.current) {
            const age = (Date.now() - data.spawnedAt) / 1000;
            if (age < 2) {
                const progress = age / 2;
                beamMatRef.current.opacity = Math.pow(1 - progress, 2) * 0.8;
                beamRef.current.scale.y = 1 + progress * 2;
                beamRef.current.position.y = (1 + progress * 2) * 2;
            } else {
                beamRef.current.visible = false;
            }
        }
    });

    if (!hero) return null;

    const iconTexture = useMemo(() => {
        const tex = new THREE.TextureLoader().load(hero.image);
        tex.repeat.set(1 / 3, 1 / 3);
        const column = hero.iconIndex % 3;
        const row = 2 - Math.floor(hero.iconIndex / 3); // Flip Y as textures are 0 at bottom
        tex.offset.set(column / 3, row / 3);
        return tex;
    }, [hero.image, hero.iconIndex]);

    return (
        <group position={data.position}>
            {/* Spawn Beam VFX */}
            <mesh ref={beamRef} position={[0, 2, 0]}>
                <cylinderGeometry args={[0.5, 0.8, 4, 32, 1, true]} />
                <meshBasicMaterial
                    ref={beamMatRef}
                    color="#00ffff"
                    transparent
                    opacity={0.8}
                    side={THREE.DoubleSide}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>

            {/* Interaction Surface */}
            <mesh
                position={[0, 0.05, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                onClick={(e) => {
                    e.stopPropagation();
                    const state = useGameStore.getState();
                    // Don't open details on simple click if we are already in focus mode
                    // Focus mode has its own 'View Details' button
                    if (!state.isFocusingHeroes) {
                        setSelectedHeroDetail(hero);
                    }
                }}
            >
                <circleGeometry args={[0.8, 32]} />
                <meshBasicMaterial
                    color="#00ffff"
                    transparent
                    opacity={0.3}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Outer Ring */}
            {/* <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.85, 0.9, 64]} />
                <meshBasicMaterial color="#00ffff" transparent opacity={0.6} />
            </mesh> */}

            {/* Floating Indicator */}
            <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                <Billboard position={[0, 0.8, 0]}>
                    {/* Avatar Icon / Sprite */}
                    <mesh position={[0, 0, 0]}>
                        <circleGeometry args={[0.4, 32]} />
                        <meshBasicMaterial map={iconTexture} transparent />
                    </mesh>

                    {/* Hero Name Label */}
                    <Text
                        position={[0, 0.6, 0]}
                        fontSize={0.12}
                        color="white"
                        fontWeight={700}
                        anchorX="center"
                        anchorY="middle"
                        outlineWidth={0.02}
                        outlineColor="#000000"
                    >
                        {hero.name.toUpperCase()}
                    </Text>

                    <Text
                        position={[0, 0.45, 0]}
                        fontSize={0.08}
                        color="#cyan"
                        fontWeight={400}
                        anchorX="center"
                        anchorY="middle"
                    >
                        LVL {hero.level}
                    </Text>
                </Billboard>
            </Float>

            {/* Subtle Ground Glow */}
            {/* <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                <circleGeometry args={[1.2, 32]} />
                <meshBasicMaterial
                    color="#00ffff"
                    transparent
                    opacity={0.1}
                    depthWrite={false}
                />
            </mesh> */}
        </group>
    );
};
