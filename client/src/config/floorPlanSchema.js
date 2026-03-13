export const FLOOR_WIDTH = 1400;
export const FLOOR_HEIGHT = 800;

export const DESKS = [
  // Left pod
  { id: 'L1', name: 'Desk L1', x: 100, y: 205, width: 120, height: 90, chairPosition: 'top' },
  { id: 'L2', name: 'Desk L2', x: 240, y: 205, width: 120, height: 90, chairPosition: 'top' },
  { id: 'L3', name: 'Desk L3', x: 380, y: 205, width: 120, height: 90, chairPosition: 'top' },
  { id: 'L4', name: 'Desk L4', x: 100, y: 325, width: 120, height: 90, chairPosition: 'bottom' },
  { id: 'L5', name: 'Desk L5', x: 240, y: 325, width: 120, height: 90, chairPosition: 'bottom' },
  { id: 'L6', name: 'Desk L6', x: 380, y: 325, width: 120, height: 90, chairPosition: 'bottom' },

  // Center pod
  { id: 'C1', name: 'Desk C1', x: 605, y: 60, width: 90, height: 120, chairPosition: 'left' },
  { id: 'C2', name: 'Desk C2', x: 715, y: 60, width: 90, height: 120, chairPosition: 'right' },
  { id: 'C3', name: 'Desk C3', x: 605, y: 200, width: 90, height: 120, chairPosition: 'left' },
  { id: 'C4', name: 'Desk C4', x: 715, y: 200, width: 90, height: 120, chairPosition: 'right' },
  { id: 'C5', name: 'Desk C5', x: 605, y: 340, width: 90, height: 120, chairPosition: 'left' },
  { id: 'C6', name: 'Desk C6', x: 715, y: 340, width: 90, height: 120, chairPosition: 'right' },

  // Right pod
  { id: 'R1', name: 'Desk R1', x: 970, y: 250, width: 90, height: 120, chairPosition: 'left' },
  { id: 'R2', name: 'Desk R2', x: 1080, y: 210, width: 120, height: 90, chairPosition: 'top' },
  { id: 'R3', name: 'Desk R3', x: 1080, y: 320, width: 120, height: 90, chairPosition: 'bottom' },

  // Bottom-right pod
  { id: 'B1', name: 'Desk B1', x: 1080, y: 485, width: 120, height: 90, chairPosition: 'top' },
  { id: 'B2', name: 'Desk B2', x: 1080, y: 595, width: 120, height: 90, chairPosition: 'bottom' }
];

export const CHAIRS = [
  { x: 160, y: 185, rotation: 0 },
  { x: 300, y: 185, rotation: 0 },
  { x: 440, y: 185, rotation: 0 },
  { x: 160, y: 435, rotation: 180 },
  { x: 300, y: 435, rotation: 180 },
  { x: 440, y: 435, rotation: 180 },
  { x: 585, y: 120, rotation: 270 },
  { x: 825, y: 120, rotation: 90 },
  { x: 585, y: 260, rotation: 270 },
  { x: 825, y: 260, rotation: 90 },
  { x: 585, y: 400, rotation: 270 },
  { x: 825, y: 400, rotation: 90 },
  { x: 950, y: 310, rotation: 270 },
  { x: 1140, y: 190, rotation: 0 },
  { x: 1140, y: 430, rotation: 180 },
  { x: 1140, y: 465, rotation: 0 },
  { x: 1140, y: 705, rotation: 180 }
];
