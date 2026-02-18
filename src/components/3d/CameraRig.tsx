import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';

export const CameraRig: React.FC = () => {
  const { camera, gl } = useThree();
  const view = useGameStore(state => state.view);
  const selectedNode = useGameStore(state => state.selectedNode);
  const enterSurface = useGameStore(state => state.enterSurface);

  const isDragging = useRef(false);
  const previousMouse = useRef({ x: 0, y: 0 });
  const orbitAngle = useRef({ theta: 0, phi: Math.PI / 2.5 });
  const driftOffset = useRef({ theta: 0, phi: 0 });

  // Mouse/touch controls for orbit view
  useEffect(() => {
    const canvas = gl.domElement;

    const onDown = (e: PointerEvent) => {
      isDragging.current = true;
      previousMouse.current = { x: e.clientX, y: e.clientY };
    };

    const onUp = () => {
      isDragging.current = false;
    };

    const onMove = (e: PointerEvent) => {
      if (!isDragging.current || view !== 'ORBIT') return;

      const deltaX = e.clientX - previousMouse.current.x;
      const deltaY = e.clientY - previousMouse.current.y;

      orbitAngle.current.theta -= deltaX * 0.005;
      orbitAngle.current.phi -= deltaY * 0.005;

      // Clamp phi to prevent flipping
      orbitAngle.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, orbitAngle.current.phi));

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
  }, [gl, view]);

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
    else if (view === 'ORBIT') {
      // Orbital view with subtle camera drift
      const time = clock.elapsedTime;

      // Add subtle drift when not dragging
      if (!isDragging.current) {
        driftOffset.current.theta = Math.sin(time * 0.1) * 0.05;
        driftOffset.current.phi = Math.sin(time * 0.07) * 0.02;
      }

      const radius = 8;
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
