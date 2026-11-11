// All coordinates are in floor units (the original 1400 x 800 drawing).
export const FLOOR_WIDTH = 1400;
export const FLOOR_HEIGHT = 800;

// The part of the drawing that holds the room, used to crop and scale the plan.
export const FLOOR_CROP = { x: 80, y: 40, width: 1180, height: 730 };

export const ZONES = {
  L: 'Left pod',
  C: 'Centre pod',
  R: 'Right pod'
};

export function getDeskZone(deskId) {
  return ZONES[String(deskId ?? '').charAt(0)] ?? '';
}

export const DESKS = [
  // Left pod
  { id: 'L1', name: 'Desk L1', x: 100, y: 205, width: 120, height: 90, chairPosition: 'top' },
  { id: 'L2', name: 'Desk L2', x: 240, y: 205, width: 120, height: 90, chairPosition: 'top' },
  { id: 'L3', name: 'Desk L3', x: 380, y: 205, width: 120, height: 90, chairPosition: 'top' },
  { id: 'L4', name: 'Desk L4', x: 100, y: 325, width: 120, height: 90, chairPosition: 'bottom' },
  { id: 'L5', name: 'Desk L5', x: 240, y: 325, width: 120, height: 90, chairPosition: 'bottom' },
  { id: 'L6', name: 'Desk L6', x: 380, y: 325, width: 120, height: 90, chairPosition: 'bottom' },

  // Centre pod
  { id: 'C1', name: 'Desk C1', x: 605, y: 60, width: 90, height: 120, chairPosition: 'left' },
  { id: 'C2', name: 'Desk C2', x: 715, y: 60, width: 90, height: 120, chairPosition: 'right' },
  { id: 'C3', name: 'Desk C3', x: 605, y: 200, width: 90, height: 120, chairPosition: 'left' },
  { id: 'C4', name: 'Desk C4', x: 715, y: 200, width: 90, height: 120, chairPosition: 'right' },
  { id: 'C5', name: 'Desk C5', x: 605, y: 340, width: 90, height: 120, chairPosition: 'left' },
  { id: 'C6', name: 'Desk C6', x: 715, y: 340, width: 90, height: 120, chairPosition: 'right' },

  // Right pod
  { id: 'R1', name: 'Desk R1', x: 970, y: 250, width: 90, height: 120, chairPosition: 'left' },
  { id: 'R2', name: 'Desk R2', x: 1080, y: 210, width: 120, height: 90, chairPosition: 'top' },
  { id: 'R3', name: 'Desk R3', x: 1080, y: 320, width: 120, height: 90, chairPosition: 'bottom' }
];

// Room floor (closed shape).
export const ROOM_OUTLINE = [
  [100, 60],
  [1200, 60],
  [1200, 750],
  [900, 750],
  [900, 560],
  [100, 560]
];

// Walls, drawn as one open line that leaves a gap for the entrance on the right wall.
export const ROOM_WALLS = [
  [1200, 80],
  [1200, 60],
  [100, 60],
  [100, 560],
  [900, 560],
  [900, 750],
  [1200, 750],
  [1200, 160]
];

export const ENTRANCE = {
  jambs: [
    [
      [1200, 80],
      [1232, 80]
    ],
    [
      [1200, 160],
      [1232, 160]
    ]
  ],
  arc: { from: [1232, 80], control: [1246, 120], to: [1232, 160] }
};

// Lounge, left to right: rug, teal sofa (back against the left) with cushions,
// coffee table, and a TV stand on the wall. Two plants in the corners.
// Colours come from the Silverfin palette (navy, Ice and the teal wave shades).
export const LOUNGE = [
  { id: 'rug', x: 928, y: 522, width: 177, height: 176, rx: 22, fill: '#E8F8FC', stroke: '#9FE3F0', dashed: true },
  { id: 'sofa', x: 950, y: 525, width: 58, height: 170, rx: 18, fill: '#1AA0B8', stroke: '#0A7791' },
  { id: 'sofa-back', x: 936, y: 536, width: 22, height: 148, rx: 10, fill: '#0A7791', stroke: 'none' },
  { id: 'cushion-1', x: 964, y: 535, width: 36, height: 46, rx: 9, fill: '#57C0CA', stroke: 'none' },
  { id: 'cushion-2', x: 964, y: 587, width: 36, height: 46, rx: 9, fill: '#57C0CA', stroke: 'none' },
  { id: 'cushion-3', x: 964, y: 639, width: 36, height: 46, rx: 9, fill: '#57C0CA', stroke: 'none' },
  { id: 'coffee-table', x: 1040, y: 565, width: 50, height: 90, rx: 8, fill: '#FFFFFF', stroke: '#012E44' },
  { id: 'coffee-book', x: 1053, y: 584, width: 24, height: 17, rx: 3, fill: '#13C5E2', stroke: 'none' },
  { id: 'coffee-mug', shape: 'circle', cx: 1065, cy: 630, r: 7, fill: '#04588C', stroke: 'none' },
  { id: 'tv-stand', x: 1150, y: 545, width: 30, height: 130, rx: 5, fill: '#012E44', stroke: 'none' },
  { id: 'tv', x: 1184, y: 556, width: 8, height: 108, rx: 2, fill: '#13C5E2', stroke: 'none' },
  { id: 'plant-top', shape: 'circle', cx: 1178, cy: 490, r: 15, fill: '#57C0CA', stroke: '#0A7791' },
  { id: 'plant-top-leaf', shape: 'circle', cx: 1178, cy: 490, r: 7, fill: '#0A7791', stroke: 'none' },
  { id: 'plant-bottom', shape: 'circle', cx: 1176, cy: 720, r: 15, fill: '#57C0CA', stroke: '#0A7791' },
  { id: 'plant-bottom-leaf', shape: 'circle', cx: 1176, cy: 720, r: 7, fill: '#0A7791', stroke: 'none' }
];
