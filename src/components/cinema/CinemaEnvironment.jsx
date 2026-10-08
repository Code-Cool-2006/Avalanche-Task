import React from 'react';
import * as THREE from 'three';
import { IMAX_01 } from '../../config/theatreLayouts';

export function CinemaEnvironment() {
  const { screen, stepY, spacingZ, rows } = IMAX_01;
  
  const roomWidth = 40; // Increased width
  const numRows = rows.length + 2; 

  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x050505,
    roughness: 0.9,
    metalness: 0.1
  });

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x070707,
    roughness: 0.95
  });

  const ceilingMaterial = new THREE.MeshStandardMaterial({
    color: 0x030303,
    roughness: 1.0
  });

  const screenAngle = screen.width / screen.radius;

  return (
    <group>
      {/* Floor Steps */}
      {Array.from({ length: numRows }).map((_, i) => {
        // Steps start from z=0 and go positive
        const zPos = i * spacingZ; 
        return (
          <group key={`step-${i}`}>
            <mesh position={[0, i * stepY - stepY / 2, zPos + spacingZ / 2 - 0.5]} receiveShadow material={floorMaterial}>
              <boxGeometry args={[roomWidth, stepY, spacingZ]} />
            </mesh>
            {/* LED strip on step edge */}
            <mesh position={[0, i * stepY + 0.01, zPos - 0.5]}>
              <boxGeometry args={[roomWidth, 0.02, 0.02]} />
              <meshBasicMaterial color={0x881111} />
            </mesh>
          </group>
        );
      })}

      {/* Stage in front of screen */}
      <mesh position={[0, -0.75, -screen.distance / 2]} receiveShadow material={floorMaterial}>
        <boxGeometry args={[roomWidth, 1.5, screen.distance]} />
      </mesh>

      {/* Walls */}
      {Array.from({ length: 12 }).map((_, i) => {
        const z = -screen.distance + i * 4;
        return (
          <group key={`wall-${i}`}>
            <mesh position={[-roomWidth / 2, 10, z]} receiveShadow material={wallMaterial}>
              <boxGeometry args={[0.4, 16, 3.8]} />
            </mesh>
            <mesh position={[roomWidth / 2, 10, z]} receiveShadow material={wallMaterial}>
              <boxGeometry args={[0.4, 16, 3.8]} />
            </mesh>
            
            {i % 2 === 0 && (
              <>
                <mesh position={[-roomWidth / 2 + 0.2, 8, z]}>
                  <boxGeometry args={[0.2, 0.6, 0.2]} />
                  <meshBasicMaterial color={0xffccaa} />
                </mesh>
                <pointLight position={[-roomWidth / 2 + 0.5, 8, z]} color={0xffccaa} intensity={15} distance={6} />

                <mesh position={[roomWidth / 2 - 0.2, 8, z]}>
                  <boxGeometry args={[0.2, 0.6, 0.2]} />
                  <meshBasicMaterial color={0xffccaa} />
                </mesh>
                <pointLight position={[roomWidth / 2 - 0.5, 8, z]} color={0xffccaa} intensity={15} distance={6} />
              </>
            )}
          </group>
        );
      })}

      {/* Ceiling */}
      <mesh position={[0, 20, 0]} rotation={[Math.PI / 2, 0, 0]} material={ceilingMaterial}>
        <planeGeometry args={[roomWidth, 60]} />
      </mesh>

      {/* Screen */}
      <mesh position={[0, 7, -screen.distance]}>
        <cylinderGeometry args={[screen.radius, screen.radius, screen.height, 48, 1, true, -screenAngle / 2 + Math.PI / 2, screenAngle]} />
        <meshStandardMaterial color={0xffffff} emissive={0xcceeff} emissiveIntensity={0.8} roughness={0.2} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
