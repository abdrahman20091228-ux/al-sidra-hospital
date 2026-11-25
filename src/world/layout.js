import { FLOOR2_Y } from '../core/config.js';

/**
 * 100% HANDCRAFTED REAL-WORLD RURAL HOSPITAL ARCHITECTURAL BLUEPRINT
 * Based on real micro-hospital zoning principles:
 *   Entry -> Reception & Waiting -> Clinical Spine Corridor
 *   West Wing: Emergency/Triage -> Radiology (X-Ray) -> Pathology Lab
 *   East Wing: Pharmacy -> Central Nursing Station -> Inpatient Ward -> Isolation Room 204
 *   North Wing: Scrub & Prep -> Operating Theatre (NW), Morgue & Cold Storage (NE), Director's Office/Archive (Far NE)
 *   Stairwell -> 2nd Floor Observation Mezzanine + Pediatric Ward + Room 312 (Final Archive)
 *
 * Coordinate System:
 *   Hospital Exterior Footprint: X in [-24, +24], Z in [-42, -6]
 *   Main Front Entrance Door: X in [-2.2, +2.2], Z = -6
 *   Floor 1: Y = 0..3.2m | Slab: 3.2..3.6m | Floor 2: Y = 3.6..6.8m
 */

export const HOSPITAL_BOUNDS = {
  xMin: -24,
  xMax: 24,
  zFront: -6,
  zBack: -42,
};

export const ROOMS = [
  // ===== FLOOR 1 =====
  {
    id: 'lobby',
    floor: 1,
    name: 'بهو الاستقبال والانتظار',
    code: 'RECEPTION & LOBBY',
    x0: -9, x1: 9, z0: -16, z1: -6,
    wallStyle: 'corridor',
    floorStyle: 'terrazzo',
    accent: '#2e6b62',
    mapColor: 'rgba(62, 108, 96, 0.25)',
    labelPos: { x: 0, z: -11 },
  },
  {
    id: 'emergency',
    floor: 1,
    name: 'قسم الطوارئ والفرز',
    code: 'EMERGENCY · TRIAGE',
    x0: -24, x1: -9, z0: -16, z1: -6,
    wallStyle: 'corridor',
    floorStyle: 'terrazzo',
    accent: '#8f2e26',
    mapColor: 'rgba(148, 52, 42, 0.24)',
    labelPos: { x: -16.5, z: -11 },
  },
  {
    id: 'pharmacy',
    floor: 1,
    name: 'الصيدلية المركزية',
    code: 'PHARMACY · RX',
    x0: 9, x1: 16.5, z0: -16, z1: -6,
    wallStyle: 'corridor',
    floorStyle: 'terrazzo',
    accent: '#2b6a7a',
    mapColor: 'rgba(46, 104, 120, 0.24)',
    labelPos: { x: 12.75, z: -11 },
  },
  {
    id: 'nursing',
    floor: 1,
    name: 'محطة التمريض المركزية',
    code: 'NURSING STATION',
    x0: 16.5, x1: 24, z0: -16, z1: -6,
    wallStyle: 'corridor',
    floorStyle: 'terrazzo',
    accent: '#2e6b62',
    mapColor: 'rgba(54, 114, 98, 0.24)',
    labelPos: { x: 20.25, z: -11 },
  },
  {
    id: 'corridor_ew',
    floor: 1,
    name: 'الممر الرئيسي (شرق - غرب)',
    code: 'MAIN CONCOURSE',
    x0: -24, x1: 24, z0: -19.6, z1: -16,
    wallStyle: 'corridor',
    floorStyle: 'terrazzo',
    accent: '#3e5456',
    mapColor: 'rgba(92, 104, 108, 0.16)',
    labelPos: { x: 0, z: -17.8 },
    isCorridor: true,
  },
  {
    id: 'corridor_ns',
    floor: 1,
    name: 'الممر الإكلينيكي الشمالي',
    code: 'CLINICAL SPINE',
    x0: -2.2, x1: 2.2, z0: -42, z1: -19.6,
    wallStyle: 'corridor',
    floorStyle: 'terrazzo',
    accent: '#3e5456',
    mapColor: 'rgba(92, 104, 108, 0.16)',
    labelPos: { x: 0, z: -30 },
    isCorridor: true,
  },
  {
    id: 'radiology',
    floor: 1,
    name: 'قسم الأشعة السينية',
    code: 'RADIOLOGY · X-RAY',
    x0: -24, x1: -12.5, z0: -29.5, z1: -19.6,
    wallStyle: 'sterile',
    floorStyle: 'sterile',
    accent: '#2c5a7a',
    mapColor: 'rgba(46, 92, 126, 0.26)',
    labelPos: { x: -18.2, z: -24.5 },
  },
  {
    id: 'lab',
    floor: 1,
    name: 'المختبر الطبي',
    code: 'PATHOLOGY LAB',
    x0: -12.5, x1: -2.2, z0: -29.5, z1: -19.6,
    wallStyle: 'sterile',
    floorStyle: 'sterile',
    accent: '#3b6a64',
    mapColor: 'rgba(58, 108, 102, 0.24)',
    labelPos: { x: -7.4, z: -24.5 },
  },
  {
    id: 'ward',
    floor: 1,
    name: 'جناح التنويم والمرضى',
    code: 'INPATIENT WARD A',
    x0: 2.2, x1: 15, z0: -29.5, z1: -19.6,
    wallStyle: 'ward',
    floorStyle: 'terrazzo',
    accent: '#3d6e52',
    mapColor: 'rgba(66, 118, 86, 0.24)',
    labelPos: { x: 8.6, z: -24.5 },
  },
  {
    id: 'isolation',
    floor: 1,
    name: 'غرفة العزل ٢٠٤',
    code: 'ISOLATION ROOM 204',
    x0: 15, x1: 24, z0: -29.5, z1: -19.6,
    wallStyle: 'ward',
    floorStyle: 'sterile',
    accent: '#8a5a26',
    mapColor: 'rgba(146, 98, 42, 0.26)',
    labelPos: { x: 19.5, z: -24.5 },
  },
  {
    id: 'surgery',
    floor: 1,
    name: 'غرفة العمليات الجراحية',
    code: 'OPERATING THEATRE',
    x0: -24, x1: -10.5, z0: -42, z1: -29.5,
    wallStyle: 'sterile',
    floorStyle: 'sterile',
    accent: '#287a6a',
    mapColor: 'rgba(42, 128, 110, 0.28)',
    labelPos: { x: -17.2, z: -35.8 },
  },
  {
    id: 'scrub',
    floor: 1,
    name: 'غرفة التعقيم والدرج',
    code: 'STERILE PREP & STAIRS',
    x0: -10.5, x1: -2.2, z0: -42, z1: -29.5,
    wallStyle: 'sterile',
    floorStyle: 'sterile',
    accent: '#4a6468',
    mapColor: 'rgba(78, 102, 108, 0.22)',
    labelPos: { x: -6.3, z: -34.0 },
  },
  {
    id: 'morgue',
    floor: 1,
    name: 'المشرحة وثلاجة الموتى',
    code: 'MORGUE & COLD STORAGE',
    x0: 2.2, x1: 14.5, z0: -42, z1: -29.5,
    wallStyle: 'morgue',
    floorStyle: 'morgue',
    accent: '#3e5a74',
    mapColor: 'rgba(54, 80, 108, 0.30)',
    labelPos: { x: 8.35, z: -35.8 },
  },
  {
    id: 'director',
    floor: 1,
    name: 'مكتب المدير والأرشيف',
    code: 'DIRECTOR & ARCHIVE',
    x0: 14.5, x1: 24, z0: -42, z1: -29.5,
    wallStyle: 'admin',
    floorStyle: 'terrazzo',
    accent: '#6b4e2e',
    mapColor: 'rgba(116, 86, 48, 0.26)',
    labelPos: { x: 19.25, z: -35.8 },
  },

  // ===== FLOOR 2 (Accessed via North-West Stairwell) =====
  {
    id: 'f2_hall',
    floor: 2,
    name: 'ممر الطابق الثاني',
    code: 'UPPER CORRIDOR',
    x0: -10.5, x1: 14.5, z0: -34.5, z1: -29.5,
    wallStyle: 'corridor',
    floorStyle: 'terrazzo',
    accent: '#4a5a60',
    mapColor: 'rgba(92, 104, 108, 0.20)',
    labelPos: { x: 2, z: -32 },
    isCorridor: true,
  },
  {
    id: 'pediatrics',
    floor: 2,
    name: 'جناح الأطفال القديم',
    code: 'PEDIATRIC WARD',
    x0: -10.5, x1: 2.2, z0: -29.5, z1: -19.6,
    wallStyle: 'ward',
    floorStyle: 'terrazzo',
    accent: '#6e6238',
    mapColor: 'rgba(126, 112, 62, 0.26)',
    labelPos: { x: -4.2, z: -24.5 },
  },
  {
    id: 'room312',
    floor: 2,
    name: 'الغرفة ٣١٢ — ملف ندى',
    code: 'ROOM 312 · RESTRICTED',
    x0: 2.2, x1: 14.5, z0: -29.5, z1: -19.6,
    wallStyle: 'admin',
    floorStyle: 'terrazzo',
    accent: '#8a2c24',
    mapColor: 'rgba(148, 48, 38, 0.30)',
    labelPos: { x: 8.35, z: -24.5 },
  },
];

/**
 * Architectural wall definitions:
 * Each wall segment: { floor, x1, z1, x2, z2, mat, doors: [{ pos (0..1 or world coord), width, height, leafOpen }], windows: [{ pos, width, sillY, height }] }
 * Defined explicitly along exact architectural axes so every corner meets seamlessly with zero gaps!
 */
export const WALLS_F1 = [
  // --- PERIMETER EXTERIOR WALLS (Ground Floor) ---
  // Front facade wall (z = -6): Left wing, Center main sliding doors, Right wing
  { x1: -24, z1: -6, x2: 24, z2: -6, mat: 'facade', thickness: 0.42,
    doors: [{ coord: 0, width: 3.8, height: 2.65 }],
    windows: [
      { coord: -19.5, width: 3.2, sillY: 1.0, height: 1.55 },
      { coord: -13.5, width: 3.2, sillY: 1.0, height: 1.55 },
      { coord: -5.8, width: 2.8, sillY: 0.9, height: 1.65 },
      { coord: 5.8, width: 2.8, sillY: 0.9, height: 1.65 },
      { coord: 12.8, width: 3.0, sillY: 1.0, height: 1.55 },
      { coord: 20.0, width: 3.0, sillY: 1.0, height: 1.55 },
    ] },
  // Back exterior wall (z = -42)
  { x1: -24, z1: -42, x2: 24, z2: -42, mat: 'facade', thickness: 0.42,
    windows: [
      { coord: -17.2, width: 3.4, sillY: 1.15, height: 1.4 },
      { coord: 8.4, width: 2.6, sillY: 1.6, height: 0.95 },
      { coord: 19.2, width: 3.2, sillY: 1.0, height: 1.55 },
    ] },
  // West exterior wall (x = -24)
  { x1: -24, z1: -6, x2: -24, z2: -42, mat: 'facade', thickness: 0.42,
    windows: [
      { coord: -11, width: 3.2, sillY: 1.0, height: 1.55 },
      { coord: -24.5, width: 3.0, sillY: 1.2, height: 1.35 },
      { coord: -35.8, width: 3.2, sillY: 1.1, height: 1.4 },
    ] },
  // East exterior wall (x = +24)
  { x1: 24, z1: -6, x2: 24, z2: -42, mat: 'facade', thickness: 0.42,
    windows: [
      { coord: -11, width: 3.2, sillY: 1.0, height: 1.55 },
      { coord: -24.5, width: 3.2, sillY: 1.0, height: 1.55 },
      { coord: -35.8, width: 3.2, sillY: 1.0, height: 1.55 },
    ] },

  // --- INTERIOR PARTITIONS: FRONT WING (z = -6 to -16) ---
  // Emergency | Lobby wall (x = -9)
  { x1: -9, z1: -6, x2: -9, z2: -16, mat: 'corridor',
    doors: [{ coord: -11, width: 2.2, height: 2.45 }] },
  // Lobby | Pharmacy wall (x = +9)
  { x1: 9, z1: -6, x2: 9, z2: -16, mat: 'corridor',
    windows: [{ coord: -10.2, width: 3.4, sillY: 1.05, height: 1.25 }], // Dispensing counter window
    doors: [{ coord: -14.2, width: 1.4, height: 2.35 }] },
  // Pharmacy | Nursing Station (x = +16.5)
  { x1: 16.5, z1: -6, x2: 16.5, z2: -16, mat: 'corridor',
    doors: [{ coord: -13.5, width: 1.5, height: 2.35 }] },

  // --- MAIN EAST-WEST CONCOURSE WALLS (z = -16 and z = -19.6) ---
  // South side of Main Concourse (z = -16)
  { x1: -24, z1: -16, x2: -9, z2: -16, mat: 'corridor',
    doors: [{ coord: -16.5, width: 2.4, height: 2.5 }] }, // ER double doors
  // Lobby opens wide into Main Concourse (pillars frame x = -9..+9, only short returns)
  { x1: -9, z1: -16, x2: -5.2, z2: -16, mat: 'corridor' },
  { x1: 5.2, z1: -16, x2: 9, z2: -16, mat: 'corridor' },
  // Pharmacy & Nursing north wall along concourse (z = -16)
  { x1: 9, z1: -16, x2: 24, z2: -16, mat: 'corridor',
    doors: [{ coord: 20.2, width: 2.6, height: 2.5 }] }, // Open Nursing Station arch

  // North side of Main Concourse (z = -19.6) — open at center Clinical Spine x in [-2.2, +2.2]
  { x1: -24, z1: -19.6, x2: -2.2, z2: -19.6, mat: 'corridor',
    doors: [
      { coord: -18.2, width: 1.8, height: 2.4 }, // Radiology door
      { coord: -7.4, width: 1.8, height: 2.4 },  // Pathology Lab door
    ],
    windows: [{ coord: -10.4, width: 2.0, sillY: 1.1, height: 1.2 }] },
  { x1: 2.2, z1: -19.6, x2: 24, z2: -19.6, mat: 'corridor',
    doors: [
      { coord: 8.6, width: 2.2, height: 2.45 },  // Inpatient Ward double doors
      { coord: 19.5, width: 1.6, height: 2.4 },  // Isolation 204 door
    ],
    windows: [{ coord: 16.8, width: 1.8, sillY: 1.15, height: 1.1 }] }, // Observation window into Isolation 204

  // --- CENTRAL CLINICAL SPINE WALLS (x = -2.2 and x = +2.2, z = -19.6 to -42) ---
  { x1: -2.2, z1: -19.6, x2: -2.2, z2: -42, mat: 'corridor',
    doors: [
      { coord: -24.5, width: 1.6, height: 2.4 }, // Lab side door
      { coord: -32.2, width: 2.2, height: 2.45 }, // Scrub & Stairwell entry
    ] },
  { x1: 2.2, z1: -19.6, x2: 2.2, z2: -42, mat: 'corridor',
    doors: [
      { coord: -24.5, width: 1.8, height: 2.4 }, // Ward side door
      { coord: -34.2, width: 2.2, height: 2.45 }, // Morgue heavy doors
    ] },

  // --- MIDDLE WING DIVIDERS (z = -19.6 to -29.5) ---
  // Radiology | Lab (x = -12.5)
  { x1: -12.5, z1: -19.6, x2: -12.5, z2: -29.5, mat: 'sterile',
    doors: [{ coord: -27.2, width: 1.5, height: 2.35 }] },
  // Ward | Isolation 204 (x = +15)
  { x1: 15, z1: -19.6, x2: 15, z2: -29.5, mat: 'ward',
    windows: [{ coord: -24.5, width: 2.4, sillY: 1.15, height: 1.15 }] },

  // --- NORTH WING LINE (z = -29.5) ---
  { x1: -24, z1: -29.5, x2: -2.2, z2: -29.5, mat: 'sterile' },
  { x1: 2.2, z1: -29.5, x2: 24, z2: -29.5, mat: 'corridor',
    doors: [{ coord: 19.2, width: 1.6, height: 2.4 }] }, // Director's Office entry from Isolation/Ward side

  // --- NORTH WING DIVIDERS (z = -29.5 to -42) ---
  // Operating Theatre | Scrub & Stairwell (x = -10.5)
  { x1: -10.5, z1: -29.5, x2: -10.5, z2: -42, mat: 'sterile',
    doors: [{ coord: -33.2, width: 2.2, height: 2.45 }], // Wide sterile doors into OR
    windows: [{ coord: -37.5, width: 2.6, sillY: 1.15, height: 1.2 }] }, // Sterile observation glass
  // Morgue | Director's Office (x = +14.5)
  { x1: 14.5, z1: -29.5, x2: 14.5, z2: -42, mat: 'morgue',
    doors: [{ coord: -31.8, width: 1.5, height: 2.35 }] }, // Rear service door between Morgue & Archive
];

/**
 * FLOOR 2 WALLS (compact atmospheric upper wing above the central/north clinical core)
 * X in [-10.5, +14.5], Z in [-34.5, -19.6] + Stairwell landing shaft at X in [-10.5, -6.2], Z in [-42, -34.5]
 */
export const WALLS_F2 = [
  // Outer perimeter of 2nd Floor playable wing
  { x1: -10.5, z1: -19.6, x2: 14.5, z2: -19.6, mat: 'corridor',
    windows: [
      { coord: -4.2, width: 3.2, sillY: 1.0, height: 1.5 },
      { coord: 8.3, width: 3.2, sillY: 1.0, height: 1.5 },
    ] },
  { x1: -10.5, z1: -34.5, x2: -10.5, z2: -19.6, mat: 'corridor' },
  { x1: 14.5, z1: -34.5, x2: 14.5, z2: -19.6, mat: 'corridor',
    windows: [{ coord: -24.5, width: 2.8, sillY: 1.0, height: 1.5 }] },
  // North wall of Upper Corridor (open at stairwell landing x in [-10.5, -6.5])
  { x1: -6.5, z1: -34.5, x2: 14.5, z2: -34.5, mat: 'corridor',
    windows: [{ coord: 4.0, width: 3.6, sillY: 1.1, height: 1.4 }] },
  // Stairwell upper enclosure (x = -10.5..-6.5, z = -42..-34.5)
  { x1: -10.5, z1: -42, x2: -6.5, z2: -42, mat: 'corridor' },
  { x1: -10.5, z1: -42, x2: -10.5, z2: -34.5, mat: 'corridor' },
  { x1: -6.5, z1: -42, x2: -6.5, z2: -34.5, mat: 'corridor' },

  // Interior walls separating Upper Corridor (z = -29.5) from Pediatrics & Room 312
  { x1: -10.5, z1: -29.5, x2: 14.5, z2: -29.5, mat: 'corridor',
    doors: [
      { coord: -4.2, width: 1.8, height: 2.4 }, // Pediatrics door
      { coord: 8.3, width: 1.8, height: 2.4 },  // Room 312 door
    ],
    windows: [{ coord: 4.8, width: 1.8, sillY: 1.15, height: 1.15 }] },
  // Divider between Pediatrics and Room 312 (x = 2.2)
  { x1: 2.2, z1: -29.5, x2: 2.2, z2: -19.6, mat: 'ward' },
];

/**
 * Architectural Stairwell specification connecting Floor 1 Scrub/Stairwell room (Y=0) to Floor 2 Upper Corridor (Y=3.6)
 * Located in x ∈ [-9.9, -6.8], rising south -> north? No, rising from z = -34.8 (bottom, Y=0) to z = -41.2 (top landing) or reverse:
 * Even cleaner: Straight grand concrete hospital flight with handrails!
 * Bottom entry on Floor 1 at z = -40.8 (Y = 0), rising southward to Floor 2 landing at z = -34.6 (Y = 3.6)!
 * Wait: let's check Floor 2 corridor: Floor 2 corridor is z ∈ [-34.5, -29.5]!
 * So if the bottom is at z = -41.0 (Y=0, reachable from Scrub room z=-32..-41, x=-6..-10) and stairs climb SOUTH from z = -40.6 (Y=0) up to z = -34.6 (Y=3.6),
 * you walk right out onto the 2nd Floor Upper Corridor at z = -34.5! Zero collision overlap!
 */
export const STAIRWELL_SPEC = {
  x0: -10.1,
  x1: -6.7,
  zBottom: -40.6, // Y = 0
  zTop: -34.6,    // Y = FLOOR2_Y (3.6m)
  yStart: 0,
  yEnd: FLOOR2_Y,
  steps: 18,
};

/**
 * Room signage plaques placed automatically beside key doorways.
 */
export const ROOM_PLAQUES = [
  { x: -16.5, y: 2.75, z: -15.82, ry: 0, title: 'قسم الطوارئ والفرز', code: 'EMERGENCY · ER', accent: '#8f2e26' },
  { x: 12.75, y: 2.75, z: -15.82, ry: 0, title: 'الصيدلية المركزية', code: 'PHARMACY · RX', accent: '#2b6a7a' },
  { x: 20.2, y: 2.75, z: -15.82, ry: 0, title: 'محطة التمريض', code: 'NURSING STATION', accent: '#2e6b62' },
  { x: -18.2, y: 2.75, z: -19.42, ry: 0, title: 'الأشعة السينية', code: 'RADIOLOGY', accent: '#2c5a7a' },
  { x: -7.4, y: 2.75, z: -19.42, ry: 0, title: 'المختبر الطبي', code: 'PATHOLOGY LAB', accent: '#3b6a64' },
  { x: 8.6, y: 2.75, z: -19.42, ry: 0, title: 'جناح التنويم أ', code: 'INPATIENT WARD A', accent: '#3d6e52' },
  { x: 19.5, y: 2.75, z: -19.42, ry: 0, title: 'غرفة العزل ٢٠٤', code: 'ISOLATION 204', accent: '#8a5a26' },
  { x: -10.32, y: 2.75, z: -33.2, ry: Math.PI / 2, title: 'غرفة العمليات', code: 'OPERATING THEATRE', accent: '#287a6a' },
  { x: -2.02, y: 2.75, z: -32.2, ry: Math.PI / 2, title: 'التعقيم والدرج ▲', code: 'PREP & FLOOR 2', accent: '#4a6468' },
  { x: 2.02, y: 2.75, z: -34.2, ry: -Math.PI / 2, title: 'المشرحة', code: 'MORGUE', accent: '#3e5a74' },
  { x: 19.2, y: 2.75, z: -29.32, ry: 0, title: 'مكتب المدير والأرشيف', code: 'DIRECTOR ARCHIVE', accent: '#6b4e2e' },
  // Floor 2 plaques
  { x: -4.2, y: FLOOR2_Y + 2.75, z: -29.68, ry: Math.PI, title: 'جناح الأطفال', code: 'PEDIATRIC WARD', accent: '#6e6238' },
  { x: 8.3, y: FLOOR2_Y + 2.75, z: -29.68, ry: Math.PI, title: 'الغرفة ٣١٢', code: 'ROOM 312', accent: '#8a2c24' },
];

export function findRoomAt(x, y, z) {
  if (z > 9.5) return null;
  if (z > -6.0) return { id: 'courtyard', name: 'ساحة الإسعاف والمدخل', floor: 1 };
  const floor = y > FLOOR2_Y * 0.55 ? 2 : 1;
  for (let i = 0; i < ROOMS.length; i++) {
    const r = ROOMS[i];
    if (r.floor !== floor) continue;
    if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) {
      return r;
    }
  }
  return { id: 'hospital', name: 'مستشفى السدرة', floor };
}
