'use client';import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';

export const CameraRig: React.FC = () => {
  const { camera, gl, size } = useThree();
  const view = useGameStore(state => state.view);
  const selectedNode = useGameStore(state => state.selectedNode);
  const selectedMoon = useGameStore(state => state.selectedMoon);
  const enterSurface = useGameStore(state => state.enterSurface);
  const nextMoon = useGameStore(state => state.nextMoon);
  const prevMoon = useGameStore(state => state.prevMoon);

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

      // Check if transition is complete
      if (camera.position.distanceTo(targetPos) < 0.3) {
        enterSurface();
      }
    } else if (view === 'SURFACE' && selectedNode) {
      const state = useGameStore.getState();
      const focusedIndex = state.focusedStructureIndex;
      const navOffset = state.navigationOffset;
      const currentStructure = selectedNode.structures[focusedIndex] || selectedNode.structures[0];

      const time = clock.getElapsedTime();

      // Calculate the specific ideal camera position for this structure
      // We use a fixed offset relative to the structure's ground position
      const xOffset = 6 + Math.sin(time * 0.4) * 0.8 + navOffset;
      const yOffset = 1.8 + Math.sin(time * 0.2) * 0.1;
      const zOffset = 6 + Math.cos(time * 0.3) * 0.2;

      targetPosition.current.set(
        currentStructure.position[0] + xOffset,
        currentStructure.position[1] + yOffset,
        currentStructure.position[2] + zOffset
      );

      // Calculate the focus point (slightly above the structure)
      targetLookAt.current.set(
        currentStructure.position[0],
        currentStructure.position[1] + 0.6,
        currentStructure.position[2]
      );

      // Smoothly move camera towards target plane
      camera.position.lerp(targetPosition.current, lerpSpeed);

      // Smoothly rotate camera towards structure
      // We maintain a persistent look-at property to bridge structure changes
      if (!camera.userData.currentLookAt) {
        camera.userData.currentLookAt = targetLookAt.current.clone();
      }
      camera.userData.currentLookAt.lerp(targetLookAt.current, lerpSpeed);
      camera.lookAt(camera.userData.currentLookAt);
    }
    else if (view === 'MOON' && selectedMoon) {
      const time = clock.getElapsedTime();
      const t = time * selectedMoon.speed + selectedMoon.angle;

      const moonX = Math.cos(t) * selectedMoon.distance;
      const moonZ = Math.sin(t) * selectedMoon.distance;
      const moonPos = new THREE.Vector3(moonX, 0, moonZ);

      // Camera distance from moon surface
      const distance = selectedMoon.size * 5;

      // Base orientation (looking from "outside" towards the planet)
      // We calculate a vector that points away from the planet through the moon
      const radialDir = new THREE.Vector3(moonX, 0, moonZ).normalize();

      // Right vector (tangent to orbit)
      const tangentDir = new THREE.Vector3(-Math.sin(t), 0, Math.cos(t));

      // Calculation of rotated camera position relative to moon
      // Using moonOrbitAngle as local spherical coordinates relative to the radial line
      const theta = moonOrbitAngle.current.theta;
      const phi = moonOrbitAngle.current.phi;

      // Position offset: radial + tangent + vertical
      const offset = radialDir.clone().multiplyScalar(Math.cos(phi) * Math.cos(theta) * distance)
        .add(tangentDir.clone().multiplyScalar(Math.cos(phi) * Math.sin(theta) * distance))
        .add(new THREE.Vector3(0, Math.sin(phi) * distance, 0));

      const targetPos = moonPos.clone().add(offset);

      camera.position.lerp(targetPos, lerpSpeed);
      camera.lookAt(moonPos);
    }
    else if (view === 'ORBIT') {
      // Orbital view with subtle camera drift
      const time = clock.elapsedTime;

      // Add subtle drift when not dragging
      if (!isDragging.current) {
        driftOffset.current.theta = Math.sin(time * 0.1) * 0.05;
        driftOffset.current.phi = Math.sin(time * 0.07) * 0.02;
      }

      // Adjust camera distance for mobile (portrait mode) to fit moons in screen
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
