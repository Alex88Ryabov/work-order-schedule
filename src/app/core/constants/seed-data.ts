import { WorkOrderStatus } from '../models/documents';

export const SAMPLE_CENTERS = [
  'Extrusion Line A',
  'CNC Machine 1',
  'Assembly Station',
  'Quality Control',
  'Packaging Line',
];

export interface SampleOrder {
  name: string;
  center: number;
  status: WorkOrderStatus;
  startOffset: number;
  endOffset: number;
}

export const SAMPLE_ORDERS: SampleOrder[] = [
  { name: 'Aluminum Profile Batch 42', center: 0, status: 'complete', startOffset: -150, endOffset: -95 },
  { name: 'Polymer Sheet Run', center: 0, status: 'complete', startOffset: -90, endOffset: -30 },
  { name: 'Vinyl Window Extrusion', center: 0, status: 'in-progress', startOffset: -20, endOffset: 70 },

  { name: 'Gearbox Housing Milling', center: 1, status: 'in-progress', startOffset: -60, endOffset: 40 },
  { name: 'Titanium Bracket Order', center: 1, status: 'open', startOffset: 55, endOffset: 130 },

  { name: 'Conveyor Module Assembly', center: 2, status: 'blocked', startOffset: -80, endOffset: 30 },
  { name: 'Pump Skid Assembly', center: 2, status: 'open', startOffset: 45, endOffset: 160 },

  { name: 'Incoming Steel Inspection', center: 3, status: 'complete', startOffset: -160, endOffset: -110 },
  { name: 'Hydraulic Press Audit', center: 3, status: 'in-progress', startOffset: -35, endOffset: 25 },
  { name: 'Certification Re-test', center: 3, status: 'open', startOffset: 60, endOffset: 120 },

  { name: 'Export Crating (EU)', center: 4, status: 'complete', startOffset: -200, endOffset: -120 },
  { name: 'Retail Blister Pack Run', center: 4, status: 'in-progress', startOffset: -25, endOffset: 45 },
  { name: 'Bulk Drum Filling', center: 4, status: 'open', startOffset: 60, endOffset: 175 },
];

export const BULK_CENTER_GROUPS: ReadonlyArray<readonly [string, number]> = [
  ['Injection Molding', 6],
  ['Welding Bay', 6],
  ['Paint Booth', 4],
  ['Heat Treatment', 3],
  ['Anodizing Line', 2],
  ['Powder Coating', 3],
  ['Laser Cutter', 4],
  ['Press Brake', 4],
  ['Stamping Press', 5],
  ['Grinding Cell', 4],
  ['Polishing Cell', 3],
  ['Assembly Cell', 8],
  ['Sub-Assembly Bench', 4],
  ['Kitting Station', 4],
  ['Inspection Bench', 4],
  ['Calibration Lab', 2],
  ['Tooling Shop', 3],
  ['Sandblasting Bay', 2],
  ['Wire EDM', 3],
  ['Sheet Metal Cell', 4],
  ['Palletizing Robot', 3],
  ['Shrink Wrap Line', 2],
  ['Final Assembly', 4],
  ['Machining Cell', 6],
  ['Lathe Station', 4],
  ['Deburring Bench', 3],
];

export const BULK_OPERATIONS = [
  'Cut', 'Mill', 'Drill', 'Turn', 'Weld', 'Anodize', 'Polish', 'Assemble', 'Inspect', 'Pack',
  'Calibrate', 'Stamp', 'Grind', 'Coat', 'Mold', 'Extrude', 'Deburr', 'Balance', 'Test', 'Paint',
] as const;

export const BULK_PRODUCTS = [
  'Aluminum Profiles', 'Steel Brackets', 'Gear Housings', 'Valve Bodies', 'Pump Skids',
  'Window Frames', 'Door Panels', 'Conveyor Rollers', 'Hydraulic Manifolds', 'Sensor Mounts',
  'Motor Shafts', 'Control Cabinets', 'Chassis Rails', 'Heat Exchangers', 'Bearing Plates',
  'Turbine Blades', 'Cable Harnesses', 'Compressor Heads', 'Flange Sets', 'Gasket Kits',
] as const;

// Orders are seeded this many days into the past and future from today.
export const BULK_HORIZON_DAYS = 540;

// How many times each work-center family is repeated.
export const BULK_CENTER_MULTIPLIER = 1;
