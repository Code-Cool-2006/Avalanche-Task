import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { IMAX_01 } from '../../config/theatreLayouts';

export function Seat({ seat, status, isSelected, onClick, onPointerEnter, onPointerLeave, isHovered }) {
  const gltf = useGLTF('/models/cinema-seat.glb');
  
  const scene = useMemo(() => {
    const cloned = gltf.scene.clone();
    cloned.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        if (child.material.isMeshStandardMaterial || child.material.isMeshPhysicalMaterial) {
          child.material.roughness = 0.8;
          child.material.metalness = 0.2;
        }
      }
    });
    return cloned;
  }, [gltf.scene]);

  useMemo(() => {
    // Red cinema seats as requested
    let colorHex = '#991111'; // AVAILABLE (Cinema Red)
    if (status === 'BOOKED' || status === 'LOCKED') colorHex = '#1a1a1a'; // UNAVAILABLE (Dark grey)
    else if (isSelected) colorHex = '#ff3333'; // SELECTED (Bright Red)
    else if (isHovered) colorHex = '#cc2222'; // HOVER (Medium Red)

    const color = new THREE.Color(colorHex);
    
    scene.traverse((child) => {
      if (child.isMesh) {
        child.material.color.set(color);
        if (child.material.emissive) {
            if (isSelected) {
                child.material.emissive.set('#ff0000');
                child.material.emissiveIntensity = 0.4;
            } else if (isHovered && status !== 'BOOKED') {
                child.material.emissive.set('#ff0000');
                child.material.emissiveIntensity = 0.1;
            } else {
                child.material.emissive.set('#000000');
                child.material.emissiveIntensity = 0;
            }
        }
      }
    });
  }, [scene, status, isSelected, isHovered]);

  // Scaled down to prevent overlapping based on user feedback
  const scaleMultiplier = 0.75; 
  const scale = (isSelected ? 1.05 : isHovered ? 1.02 : 1) * scaleMultiplier;
  const yOffset = isSelected ? 0.1 : isHovered ? 0.05 : 0;
  
  // Face the screen which is at -screen.distance
  const lookAtX = 0;
  const lookAtZ = -IMAX_01.screen.distance;
  
  // Added Math.PI so they face the screen instead of away from it
  const angle = Math.atan2(seat.position.x - lookAtX, seat.position.z - lookAtZ) + Math.PI;

  return (
    <group 
      position={[seat.position.x, seat.position.y + yOffset, seat.position.z]}
      rotation={[0, angle, 0]}
      scale={[scale, scale, scale]}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick(seat.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (status === 'AVAILABLE' || status === 'SELECTED' || isSelected) {
            document.body.style.cursor = 'pointer';
            if (onPointerEnter) onPointerEnter(seat.id);
        }
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'default';
        if (onPointerLeave) onPointerLeave(seat.id);
      }}
    >
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload('/models/cinema-seat.glb');
