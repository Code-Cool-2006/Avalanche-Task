export function generateTheatreLayout(config) {
  const layout = {
    screen: config.screen || { width: 24, height: 10, distance: 12, radius: 40 },
    rows: []
  };

  const stepY = config.stepY || 0.4;
  const spacingZ = config.spacingZ || 1.6;

  config.rows.forEach((rowConfig, rowIndex) => {
    const rowSeats = [];
    const count = rowConfig.seats;
    const spacingX = rowConfig.spacing || 0.85;
    const curve = rowConfig.curve || 0;
    
    // Allow custom gaps like an aisle
    const aisleIndexes = rowConfig.aisles || []; // array of indexes after which an aisle gap exists

    let currentXOffset = -(count * spacingX + aisleIndexes.length * spacingX) / 2 + spacingX / 2;

    for (let i = 1; i <= count; i++) {
      const zCurve = Math.abs(currentXOffset) * curve;
      
      rowSeats.push({
        id: `seat-${rowConfig.id}-${i}`,
        row_label: rowConfig.id,
        seat_number: i,
        x: currentXOffset,
        y: rowIndex * stepY,
        z: rowIndex * spacingZ - zCurve // starts at z = 0
      });

      currentXOffset += spacingX;
      if (aisleIndexes.includes(i)) {
        currentXOffset += spacingX * 1.5; // Width of aisle
      }
    }
    
    layout.rows.push({
      id: rowConfig.id,
      seats: rowSeats
    });
  });

  return layout;
}
