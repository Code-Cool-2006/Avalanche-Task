import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { CinemaEnvironment } from './CinemaEnvironment';
import { CinemaLighting } from './CinemaLighting';
import { CameraRig } from './CameraRig';
import { Seat } from './Seat';
import * as THREE from 'three';

export function TheatreRenderer({ activeSeats, selected, booked, locked, toggleSeat, viewFromSeat }) {
  const [hoveredSeat, setHoveredSeat] = useState(null);

  return (
    <Canvas
      shadows
      gl={{ 
        antialias: true, 
        toneMapping: THREE.ACESFilmicToneMapping, 
        toneMappingExposure: 1.0,
        outputColorSpace: THREE.SRGBColorSpace
      }}
      camera={{ position: [0, 10, 12], fov: 45 }}
      style={{ touchAction: 'none' }}
    >
      <fogExp2 attach="fog" args={[0x020202, 0.025]} />
      <color attach="background" args={[0x020202]} />
      
      <CinemaLighting />
      <CinemaEnvironment />
      
      <group>
        {activeSeats.map(seat => {
          let status = 'AVAILABLE';
          if (booked.has(seat.id)) status = 'BOOKED';
          else if (locked.has(seat.id)) status = 'LOCKED';
          
          return (
            <Seat
              key={seat.id}
              seat={seat}
              status={status}
              isSelected={selected.has(seat.id)}
              isHovered={hoveredSeat === seat.id}
              onClick={(id) => toggleSeat(id)}
              onPointerEnter={(id) => setHoveredSeat(id)}
              onPointerLeave={(id) => setHoveredSeat(null)}
            />
          );
        })}
      </group>

      <CameraRig viewFromSeat={viewFromSeat ? selected : null} activeSeats={activeSeats} />
    </Canvas>
  );
}
