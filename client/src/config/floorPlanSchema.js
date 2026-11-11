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

// Lounge, left to right: sofa (back against the left), coffee table, TV stand on the wall.
export const LOUNGE = [
  { id: 'sofa', x: 950, y: 525, width: 58, height: 170, rx: 20, tone: 'soft' },
  { id: 'sofa-back', x: 936, y: 538, width: 20, height: 144, rx: 10, tone: 'light' },
  { id: 'coffee-table', x: 1040, y: 565, width: 50, height: 90, rx: 6, tone: 'light' },
  { id: 'tv-stand', x: 1150, y: 545, width: 30, height: 130, rx: 4, tone: 'soft' },
  { id: 'tv', x: 1184, y: 560, width: 8, height: 100, rx: 2, tone: 'dark' }
];
