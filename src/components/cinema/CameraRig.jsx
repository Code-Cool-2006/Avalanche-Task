import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

export function CameraRig({ viewFromSeat, activeSeats }) {
  const controls = useRef();
  const { camera } = useThree();
  
  const targetPos = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());
  const isAnimating = useRef(false);

  useEffect(() => {
    if (viewFromSeat && activeSeats.length > 0) {
      const seatId = Array.from(viewFromSeat)[0];
      const seat = activeSeats.find(s => s.id === seatId);
      if (seat) {
        targetPos.current.set(seat.position.x, seat.position.y + 1.4, seat.position.z + 0.1);
        targetLookAt.current.set(0, 7, -16); // Look at screen
        isAnimating.current = true;
        if (controls.current) controls.current.enabled = false;
      }
    } else {
      const width = window.innerWidth;
      if (width < 768) {
        targetPos.current.set(0, 16, 25);
        targetLookAt.current.set(0, 4, 2);
      } else {
        targetPos.current.set(0, 14, 20);
        targetLookAt.current.set(0, 3, 4);
      }
      isAnimating.current = true;
      if (controls.current) controls.current.enabled = true;
    }
  }, [viewFromSeat, activeSeats]);

  useFrame(() => {
    if (isAnimating.current) {
      camera.position.lerp(targetPos.current, 0.05);
      
      if (controls.current && !viewFromSeat) {
        controls.current.target.lerp(targetLookAt.current, 0.05);
        controls.current.update();
      } else {
        camera.lookAt(targetLookAt.current);
      }

      if (camera.position.distanceTo(targetPos.current) < 0.1) {
        isAnimating.current = false;
      }
    }
  });

  return (
    <OrbitControls 
      ref={controls}
      enableDamping
      dampingFactor={0.05}
      minDistance={6}
      maxDistance={40}
      maxPolarAngle={Math.PI / 2 - 0.1}
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN
      }}
    />
  );
}
