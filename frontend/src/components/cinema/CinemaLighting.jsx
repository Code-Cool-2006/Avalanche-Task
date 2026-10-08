import React from 'react';

export function CinemaLighting() {
  return (
    <group>
      {/* Ambient light - increased for visibility */}
      <ambientLight intensity={1.5} color={0xffffff} />

      {/* Screen bounce light */}
      <spotLight 
        position={[0, 10, -10]} 
        target-position={[0, 2, 5]}
        angle={Math.PI / 2.5} 
        penumbra={0.8} 
        intensity={300} 
        color={0xcceeff}
        castShadow
        shadow-bias={-0.001}
      />
      
      {/* Screen glow */}
      <pointLight position={[0, 9, -12]} intensity={200} distance={40} color={0xcceeff} />

      {/* Fill lights over seating */}
      <pointLight position={[-10, 15, 5]} intensity={100} distance={40} color={0xffeedd} />
      <pointLight position={[10, 15, 5]} intensity={100} distance={40} color={0xffeedd} />
      <pointLight position={[0, 15, 12]} intensity={100} distance={40} color={0xffeedd} />

      {/* Aisle ground lights */}
      <pointLight position={[-12, 1, 0]} intensity={30} distance={15} color={0xff2222} />
      <pointLight position={[12, 1, 0]} intensity={30} distance={15} color={0xff2222} />
    </group>
  );
}
