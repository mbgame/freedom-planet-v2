'use client'; import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { useProgress } from '@react-three/drei';

export const CameraRig: React.FC = () => {
  const { camera, gl, size } = useThree();
  const view = useGameStore(state => state.view);
  const selectedNode = useGameStore(state => state.selectedNode);
  const selectedMoon = useGameStore(state => state.selectedMoon);
  const enterSurface = useGameStore(state => state.enterSurface);
  const nextMoon = useGameStore(state => state.nextMoon);
  const prevMoon = useGameStore(state => state.prevMoon);
  const { active: assetsLoading } = useProgress();

  const isDragging = useRef(false);
  const startTouchX = useRef(0);
  const previousMouse = useRef({ x: 0, y: 0 });
  const orbitAngle = useRef({ theta: 0, phi: Math.PI / 2.5 });
  const moonOrbitAngle = useRef({ theta: 0, phi: 0 });
  const driftOffset = useRef({ theta: 0, phi: 0 });

  // Mouse/touch controls for orbit view
  useEffect(() => {
    const canvas = gl.domElement;

    const onDown = (e: PointerEvent) => {
      isDragging.current = true;
      startTouchX.current = e.clientX;
      previousMouse.current = { x: e.clientX, y: e.clientY };
    };

    const onUp = (e: PointerEvent) => {
      if (isDragging.current && view === 'MOON') {
        const diff = startTouchX.current - e.clientX;
        if (Math.abs(diff) > 50) {
          if (diff > 0) nextMoon();
          else prevMoon();
        }
      }
      isDragging.current = false;
    };

    const onMove = (e: PointerEvent) => {
      if (!isDragging.current) return;

      const deltaX = e.clientX - previousMouse.current.x;
      const deltaY = e.clientY - previousMouse.current.y;

      if (view === 'ORBIT') {
        orbitAngle.current.theta -= deltaX * 0.005;
        orbitAngle.current.phi -= deltaY * 0.005;
        // Clamp phi to prevent flipping
        orbitAngle.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, orbitAngle.current.phi));
      } else if (view === 'MOON') {
        moonOrbitAngle.current.theta -= deltaX * 0.005;
        moonOrbitAngle.current.phi -= deltaY * 0.005;

        // Limitation: Horizontal rotation ±60 degrees, Vertical ±30 degrees
        moonOrbitAngle.current.theta = Math.max(-1.1, Math.min(1.1, moonOrbitAngle.current.theta));
        moonOrbitAngle.current.phi = Math.max(-0.6, Math.min(0.6, moonOrbitAngle.current.phi));
      }

      previousMouse.current = { x: e.clientX, y: e.clientY };
    };

    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointermove', onMove);

    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointermove', onMove);
    };
  }, [gl, view, nextMoon, prevMoon]);

  // Reset moon rotation when switching moons
  useEffect(() => {
    moonOrbitAngle.current = { theta: 0, phi: 0 };
  }, [selectedMoon?.id]);

  const targetPosition = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());

  useFrame(({ clock }, delta) => {
    // Standard lerp speed for camera movement
    const lerpSpeed = 6.0 * delta;

    if (view === 'TRANSITION' && selectedNode) {
      // Zoom to selected node from orbit
      const targetPos = selectedNode.position.clone().multiplyScalar(1.3);
      camera.position.lerp(targetPos, lerpSpeed);
      camera.lookAt(selectedNode.position);

      // Check if transition is complete: Camera is close AND assets are not loading
      // This ensures we stay in Transition VFX until models are ready
      if (camera.position.distanceTo(targetPos) < 0.4 && !assetsLoading) {
        enterSurface();
      }
    } else if (view === 'SURFACE' && selectedNode) {
      const state = useGameStore.getState();
      const focusedIndex = state.focusedStructureIndex;
      const navOffset = state.navigationOffset;
      const currentStructure = selectedNode.structures[focusedIndex] || selectedNode.structures[0];

      const time = clock.getElapsedTime();

      // Base camera distance and height
      const baseDistance = 8.5;
      const baseHeight = 1.8;

      // Add "breathing" and navigation offsets to the distance and angles
      const angleOffset = navOffset * 0.1; // Sweep side-to-side with swipe
      const driftX = Math.sin(time * 0.4) * 0.5;
      const driftY = Math.sin(time * 0.2) * 0.1;
      const driftZ = Math.cos(time * 0.3) * 0.2;

      const viewAngle = currentStructure.rotationY + angleOffset;

      const relX = Math.sin(viewAngle) * (baseDistance + driftZ) + driftX;
      const relZ = Math.cos(viewAngle) * (baseDistance + driftZ);

      targetPosition.current.set(
        currentStructure.position[0] + relX,
        currentStructure.position[1] + baseHeight + driftY,
        currentStructure.position[2] + relZ
      );

      // Calculate the focus point (slightly above the structure)
      targetLookAt.current.set(
        currentStructure.position[0],
        currentStructure.position[1] + 1.2,
        currentStructure.position[2]
      );

      // Smoothly rotate camera towards structure
      if (!camera.userData.currentLookAt) {
        camera.userData.currentLookAt = targetLookAt.current.clone();
      }

      if (state.isFocusingHeroes) {
        // Find the barracks that owns these heroes
        const targetStructure = state.focusedHeroesStructureId
          ? state.nodes.flatMap(n => n.structures).find(s => s.id === state.focusedHeroesStructureId)
          : currentStructure;

        if (targetStructure) {
          const spawnedHeroes = state.spawnedHeroes.filter(h => h.structureId === targetStructure.id);
          const focusedHero = spawnedHeroes[state.focusedHeroIndex];

          let focusPoint = new THREE.Vector3();
          if (focusedHero) {
            focusPoint.set(...focusedHero.position);
          } else if (spawnedHeroes.length > 0) {
            // Fallback to first hero if index is invalid
            focusPoint.set(...spawnedHeroes[0].position);
          } else {
            // Fallback to the spawn point in front of barracks
            const offset = 4;
            const angle = targetStructure.rotationY;
            const x = targetStructure.position[0] + Math.sin(angle) * offset;
            const z = targetStructure.position[2] + Math.cos(angle) * offset;
            focusPoint.set(x, targetStructure.position[1] + 1, z);
          }

          // Camera position: Close to individual hero
          const camOffset = 3.5;
          const camAngle = targetStructure.rotationY;
          const camX = focusPoint.x + Math.sin(camAngle) * camOffset;
          const camZ = focusPoint.z + Math.cos(camAngle) * camOffset;

          targetPosition.current.set(camX, focusPoint.y + 1.2, camZ);
          targetLookAt.current.copy(focusPoint).add(new THREE.Vector3(0, 0.6, 0));
        }
      }

      camera.position.lerp(targetPosition.current, lerpSpeed);
      camera.userData.currentLookAt.lerp(targetLookAt.current, lerpSpeed);
      camera.lookAt(camera.userData.currentLookAt);
    }
    else if (view === 'MOON' && selectedMoon) {
      const time = clock.getElapsedTime();
      const t = time * selectedMoon.speed + selectedMoon.angle;

      const moonX = Math.cos(t) * selectedMoon.distance;
      const moonZ = Math.sin(t) * selectedMoon.distance;
      const moonPos = new THREE.Vector3(moonX, 0, moonZ);

      const distance = selectedMoon.size * 5;
      const radialDir = new THREE.Vector3(moonX, 0, moonZ).normalize();
      const tangentDir = new THREE.Vector3(-Math.sin(t), 0, Math.cos(t));

      const theta = moonOrbitAngle.current.theta;
      const phi = moonOrbitAngle.current.phi;

      const offset = radialDir.clone().multiplyScalar(Math.cos(phi) * Math.cos(theta) * distance)
        .add(tangentDir.clone().multiplyScalar(Math.cos(phi) * Math.sin(theta) * distance))
        .add(new THREE.Vector3(0, Math.sin(phi) * distance, 0));

      const targetPos = moonPos.clone().add(offset);

      camera.position.lerp(targetPos, lerpSpeed);
      camera.lookAt(moonPos);
    }
    else if (view === 'ORBIT') {
      const time = clock.elapsedTime;

      if (!isDragging.current) {
        driftOffset.current.theta = Math.sin(time * 0.1) * 0.05;
        driftOffset.current.phi = Math.sin(time * 0.07) * 0.02;
      }

      const isPortrait = size.width < size.height;
      const radius = isPortrait ? 13 : 10;

      const finalTheta = orbitAngle.current.theta + driftOffset.current.theta;
      const finalPhi = orbitAngle.current.phi + driftOffset.current.phi;

      const x = radius * Math.sin(finalPhi) * Math.sin(finalTheta);
      const y = radius * Math.cos(finalPhi);
      const z = radius * Math.sin(finalPhi) * Math.cos(finalTheta);

      camera.position.lerp(new THREE.Vector3(x, y, z), delta * 3);
      camera.lookAt(0, 0, 0);
    }
  });

  return null;
};
