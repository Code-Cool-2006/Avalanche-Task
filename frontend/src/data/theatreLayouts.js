import { generateTheatreLayout } from '../services/generateSeatPositions';

export const IMAX_01 = generateTheatreLayout({
  screen: { width: 32, height: 14, distance: 20, radius: 50 },
  stepY: 0.5,
  spacingZ: 1.8,
  rows: [
    { id: 'A', seats: 10, spacing: 1.2, curve: 0, aisles: [3, 7] },
    { id: 'B', seats: 12, spacing: 1.2, curve: 0.05, aisles: [4, 8] },
    { id: 'C', seats: 14, spacing: 1.2, curve: 0.1, aisles: [4, 10] },
    { id: 'D', seats: 16, spacing: 1.2, curve: 0.15, aisles: [5, 11] },
    { id: 'E', seats: 16, spacing: 1.2, curve: 0.2, aisles: [5, 11] }, // Premium
    { id: 'F', seats: 16, spacing: 1.2, curve: 0.25, aisles: [5, 11] }, // Premium
  ]
});
