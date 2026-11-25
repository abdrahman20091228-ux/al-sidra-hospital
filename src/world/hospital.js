import * as THREE from 'three';
import { GeometryBatcher } from '../core/geometry.js';
import { FLOOR2_Y, WALL_H } from '../core/config.js';
import {
  ROOMS,
  WALLS_F1,
  WALLS_F2,
  STAIRWELL_SPEC,
  ROOM_PLAQUES,
} from './layout.js';

/**
 * Builds the entire 2-story handcrafted architectural hospital structure:
 * - Walls with precise doorway & recessed window cutouts + frames + open door leaves
 * - Room-specific floors (terrazzo / sterile tile / morgue cold tile) & suspended acoustic ceilings
 * - Hospital corridor bumper rails, baseboards, overhead HVAC ducts, ceiling troffers, EXIT signs
 * - Architectural concrete stairwell with handrails connecting Floor 1 and Floor 2
 */
export function buildHospitalArchitecture(engine, mats, physics) {
  const group = engine.zones.hospital;
  const batch = new GeometryBatcher();

  function pickWallMat(style) {
    if (style === 'facade') return mats.facadeConcrete;
    if (style === 'sterile') return mats.sterileTile;
    if (style === 'morgue') return mats.morgueTile;
    if (style === 'ward') return mats.wardWall;
    if (style === 'admin') return mats.adminWall;
    return mats.corridorWall;
  }

  function pickFloorMat(style) {
    if (style === 'sterile') return mats.sterileFloor;
    if (style === 'morgue') return mats.morgueFloor;
    return mats.hospitalFloor;
  }

  // ===== 1. ROOM FLOORS & SUSPENDED ACOUSTIC CEILINGS =====
  ROOMS.forEach((room) => {
    const w = room.x1 - room.x0;
    const d = room.z1 - room.z0;
    const cx = (room.x0 + room.x1) * 0.5;
    const cz = (room.z0 + room.z1) * 0.5;
    const baseY = room.floor === 2 ? FLOOR2_Y : 0;

    // Floor slab
    batch.addBox(pickFloorMat(room.floorStyle), w, 0.08, d, cx, baseY - 0.04, cz, 0, 2.2, false, true);

    // Ceiling slab (skip stair opening on Floor 1 scrub room where stairwell rises into Floor 2!)
    if (room.id === 'scrub') {
      // Split ceiling around stairwell opening x in [-10.5, -6.5], z in [-41.8, -34.4]
      // East half of scrub room ceiling: x in [-6.5, -2.2], full z
      const ew = -2.2 - -6.5;
      batch.addBox(mats.ceilingTile, ew, 0.14, d, -6.5 + ew * 0.5, baseY + WALL_H + 0.07, cz, 0, 2.2, false, true);
      // South-west strip ahead of stair opening: x in [-10.5, -6.5], z in [-34.4, -29.5]
      const sd = -29.5 - -34.4;
      batch.addBox(mats.ceilingTile, 4.0, 0.14, sd, -8.5, baseY + WALL_H + 0.07, -34.4 + sd * 0.5, 0, 2.2, false, true);
    } else {
      batch.addBox(mats.ceilingTile, w, 0.14, d, cx, baseY + WALL_H + 0.07, cz, 0, 2.2, false, true);
    }
  });

  // ===== 2. ARCHITECTURAL WALL BUILDER (WITH DOORWAYS, WINDOWS, FRAMES & TRIM) =====
  function buildWallSegment(spec, baseY) {
    const isHoriz = Math.abs(spec.z1 - spec.z2) < 0.01;
    const thick = spec.thickness || 0.24;
    const wallMat = pickWallMat(spec.mat);
    const start = isHoriz ? Math.min(spec.x1, spec.x2) : Math.min(spec.z1, spec.z2);
    const end = isHoriz ? Math.max(spec.x1, spec.x2) : Math.max(spec.z1, spec.z2);
    const fixed = isHoriz ? spec.z1 : spec.x1;

    // Gather openings (doors + windows) sorted along wall axis
    const openings = [];
    (spec.doors || []).forEach((d) => {
      openings.push({
        type: 'door',
        a: d.coord - d.width * 0.5,
        b: d.coord + d.width * 0.5,
        sillY: 0,
        topY: d.height || 2.45,
        width: d.width,
      });
    });
    (spec.windows || []).forEach((w) => {
      openings.push({
        type: 'window',
        a: w.coord - w.width * 0.5,
        b: w.coord + w.width * 0.5,
        sillY: w.sillY ?? 1.0,
        topY: (w.sillY ?? 1.0) + (w.height ?? 1.4),
        width: w.width,
      });
    });
    openings.sort((u, v) => u.a - v.a);

    function addSolidSpan(a, b, y0, y1, addCollider = true, addTrim = false) {
      const len = b - a;
      const h = y1 - y0;
      if (len < 0.04 || h < 0.04) return;
      const mid = (a + b) * 0.5;
      const cy = baseY + y0 + h * 0.5;
      if (isHoriz) {
        batch.addBox(wallMat, len, h, thick, mid, cy, fixed, 0, 2.5, true, true);
        if (addTrim && y0 === 0 && h > 1.2) {
          // Hospital corridor rubber stretcher bumper rail + dark baseboard!
          batch.addBox(mats.bumperRail, len, 0.12, thick + 0.05, mid, baseY + 0.92, fixed, 0, 2.0, false, true);
          batch.addBox(mats.bumperRail, len, 0.14, thick + 0.04, mid, baseY + 0.07, fixed, 0, 2.0, false, true);
        }
        if (addCollider) {
          physics.addBox(a, baseY + y0, fixed - thick * 0.55, b, baseY + y1, fixed + thick * 0.55);
        }
      } else {
        batch.addBox(wallMat, thick, h, len, fixed, cy, mid, 0, 2.5, true, true);
        if (addTrim && y0 === 0 && h > 1.2) {
          batch.addBox(mats.bumperRail, thick + 0.05, 0.12, len, fixed, baseY + 0.92, mid, 0, 2.0, false, true);
          batch.addBox(mats.bumperRail, thick + 0.04, 0.14, len, fixed, baseY + 0.07, mid, 0, 2.0, false, true);
        }
        if (addCollider) {
          physics.addBox(fixed - thick * 0.55, baseY + y0, a, fixed + thick * 0.55, baseY + y1, b);
        }
      }
    }

    const wantTrim = spec.mat !== 'facade';
    let cursor = start;
    openings.forEach((op) => {
      const a = Math.max(start, op.a);
      const b = Math.min(end, op.b);
      if (a > cursor) {
        addSolidSpan(cursor, a, 0, WALL_H, true, wantTrim);
      }
      // Header lintel above door/window
      if (op.topY < WALL_H) {
        addSolidSpan(a, b, op.topY, WALL_H, false, false);
      }
      // Sill below window (solid collider so player can't walk through windows!)
      if (op.sillY > 0) {
        addSolidSpan(a, b, 0, op.sillY, true, wantTrim);
      }

      // Architectural Door / Window Frame & Details
      const mid = (a + b) * 0.5;
      const opH = op.topY - op.sillY;
      const frameT = thick + 0.07;

      if (op.type === 'door') {
        if (isHoriz) {
          batch.addBox(mats.darkMetal, 0.09, opH, frameT, a + 0.04, baseY + opH * 0.5, fixed, 0, 1);
          batch.addBox(mats.darkMetal, 0.09, opH, frameT, b - 0.04, baseY + opH * 0.5, fixed, 0, 1);
          batch.addBox(mats.darkMetal, op.width, 0.1, frameT, mid, baseY + op.topY - 0.04, fixed, 0, 1);
          // Half-open hospital door leaf with inset vision glass window (on interior doors)
          if (op.width < 3.0) {
            const leafW = Math.min(0.95, op.width * 0.46);
            batch.addBox(mats.paintedMetal, leafW, opH - 0.08, 0.06, a + 0.12, baseY + (opH - 0.08) * 0.5, fixed - leafW * 0.45, 1.15, 1.5);
          } else {
            // Main entrance sliding glass doors parted wide open
            batch.addBox(mats.darkMetal, 0.95, opH - 0.08, 0.07, a + 0.52, baseY + (opH - 0.08) * 0.5, fixed - 0.16, 0, 1);
            batch.addBox(mats.glassClear, 0.78, opH - 0.36, 0.03, a + 0.52, baseY + opH * 0.5, fixed - 0.16, 0, 1, false, false);
            batch.addBox(mats.darkMetal, 0.95, opH - 0.08, 0.07, b - 0.52, baseY + (opH - 0.08) * 0.5, fixed - 0.16, 0, 1);
            batch.addBox(mats.glassClear, 0.78, opH - 0.36, 0.03, b - 0.52, baseY + opH * 0.5, fixed - 0.16, 0, 1, false, false);
          }
        } else {
          batch.addBox(mats.darkMetal, frameT, opH, 0.09, fixed, baseY + opH * 0.5, a + 0.04, 0, 1);
          batch.addBox(mats.darkMetal, frameT, opH, 0.09, fixed, baseY + opH * 0.5, b - 0.04, 0, 1);
          batch.addBox(mats.darkMetal, frameT, 0.1, op.width, fixed, baseY + op.topY - 0.04, mid, 0, 1);
          if (op.width < 3.0) {
            const leafW = Math.min(0.95, op.width * 0.46);
            batch.addBox(mats.paintedMetal, 0.06, opH - 0.08, leafW, fixed + leafW * 0.45, baseY + (opH - 0.08) * 0.5, a + 0.12, -1.15, 1.5);
          }
        }
      } else {
        // Window frame, sill ledge, center mullion, and glass pane (with solid collider across full window)
        const wy = baseY + op.sillY + opH * 0.5;
        if (isHoriz) {
          batch.addBox(mats.facadeTrim, op.width + 0.16, 0.1, frameT + 0.08, mid, baseY + op.sillY + 0.02, fixed, 0, 1.5);
          batch.addBox(mats.darkMetal, op.width, 0.08, frameT, mid, baseY + op.topY - 0.03, fixed, 0, 1);
          batch.addBox(mats.darkMetal, 0.08, opH, frameT, a + 0.04, wy, fixed, 0, 1);
          batch.addBox(mats.darkMetal, 0.08, opH, frameT, b - 0.04, wy, fixed, 0, 1);
          batch.addBox(mats.darkMetal, 0.06, opH, 0.09, mid, wy, fixed, 0, 1);
          batch.addBox(mats.glassClear, op.width - 0.12, opH - 0.12, 0.04, mid, wy, fixed, 0, 1, false, false);
          physics.addBox(a, baseY + op.sillY, fixed - thick * 0.5, b, baseY + op.topY, fixed + thick * 0.5);
        } else {
          batch.addBox(mats.facadeTrim, frameT + 0.08, 0.1, op.width + 0.16, fixed, baseY + op.sillY + 0.02, mid, 0, 1.5);
          batch.addBox(mats.darkMetal, frameT, 0.08, op.width, fixed, baseY + op.topY - 0.03, mid, 0, 1);
          batch.addBox(mats.darkMetal, frameT, opH, 0.08, fixed, wy, a + 0.04, 0, 1);
          batch.addBox(mats.darkMetal, frameT, opH, 0.08, fixed, wy, b - 0.04, 0, 1);
          batch.addBox(mats.darkMetal, 0.09, opH, 0.06, fixed, wy, mid, 0, 1);
          batch.addBox(mats.glassClear, 0.04, opH - 0.12, op.width - 0.12, fixed, wy, mid, 0, 1, false, false);
          physics.addBox(fixed - thick * 0.5, baseY + op.sillY, a, fixed + thick * 0.5, baseY + op.topY, b);
        }
      }
      cursor = Math.max(cursor, b);
    });
    if (cursor < end) {
      addSolidSpan(cursor, end, 0, WALL_H, true, wantTrim);
    }
  }

  WALLS_F1.forEach((w) => buildWallSegment(w, 0));
  WALLS_F2.forEach((w) => buildWallSegment(w, FLOOR2_Y));

  // ===== 2B. INTERIOR CLADDING ON PERIMETER WALLS (MATCHES EACH ROOM'S FINISH!) =====
  // Prevents exterior brutalist concrete from showing on the inside walls of sterile rooms & wards!
  const innerLinings = [
    // West exterior wall (x = -23.76): Emergency, Radiology, Operating Theatre
    { x: -23.75, z0: -16, z1: -6, axis: 'z', mat: mats.corridorWall, win: [-11] },
    { x: -23.75, z0: -29.5, z1: -19.6, axis: 'z', mat: mats.sterileTile, win: [-24.5] },
    { x: -23.75, z0: -42, z1: -29.5, axis: 'z', mat: mats.sterileTile, win: [-35.8] },
    // North exterior wall (z = -41.76): Operating Theatre, Scrub, Morgue, Director
    { z: -41.75, x0: -24, x1: -10.5, axis: 'x', mat: mats.sterileTile, win: [-17.2] },
    { z: -41.75, x0: -10.5, x1: -2.2, axis: 'x', mat: mats.sterileTile, win: [] },
    { z: -41.75, x0: 2.2, x1: 14.5, axis: 'x', mat: mats.morgueTile, win: [8.4] },
    { z: -41.75, x0: 14.5, x1: 24, axis: 'x', mat: mats.adminWall, win: [19.2] },
    // East exterior wall (x = +23.76): Nursing, Isolation 204, Director
    { x: 23.75, z0: -16, z1: -6, axis: 'z', mat: mats.corridorWall, win: [-11] },
    { x: 23.75, z0: -29.5, z1: -19.6, axis: 'z', mat: mats.wardWall, win: [-24.5] },
    { x: 23.75, z0: -42, z1: -29.5, axis: 'z', mat: mats.adminWall, win: [-35.8] },
    // Morgue interior west partition face (x = 2.34, facing east into Morgue — skips doorway at -34.2)
    { x: 2.35, z0: -33.0, z1: -29.6, axis: 'z', mat: mats.morgueTile, win: [] },
    { x: 2.35, z0: -41.7, z1: -35.4, axis: 'z', mat: mats.morgueTile, win: [] },
  ];

  // Real-world Hospital Floor Color-Coded Wayfinding Stripes along Main Concourse & Clinical Spine!
  batch.addPlane(mats.ambulanceRed, 22, 0.12, -12, 0.012, -17.35, -Math.PI / 2, 0, 0, 0, false, true); // Red line -> Emergency / OR
  batch.addPlane(mats.exitGreen, 22, 0.12, 12, 0.012, -17.35, -Math.PI / 2, 0, 0, 0, false, true);     // Green line -> Wards / Pharmacy
  batch.addPlane(mats.medicineBlue, 0.12, 20, -0.35, 0.012, -28.5, -Math.PI / 2, 0, 0, 0, false, true); // Blue line -> Radiology / Morgue

  // Wall-mounted Red Hospital Fire Extinguishers in corridors
  for (const [fx, fz] of [[-5.6, -15.8], [5.6, -15.8], [-2.0, -22.2], [2.0, -27.5]]) {
    batch.addCylinder(mats.ambulanceRed, 0.085, 0.085, 0.56, 8, fx, 1.15, fz);
    batch.addCylinder(mats.darkMetal, 0.03, 0.04, 0.1, 6, fx, 1.48, fz);
  }
  innerLinings.forEach((ln) => {
    const start = ln.axis === 'x' ? ln.x0 : ln.z0;
    const end = ln.axis === 'x' ? ln.x1 : ln.z1;
    const wins = ln.win.map((c) => [c - 1.7, c + 1.7]).sort((a, b) => a[0] - b[0]);
    const emitSpan = (a, b, y0, y1) => {
      const len = b - a;
      const h = y1 - y0;
      if (len < 0.05 || h < 0.05) return;
      const mid = (a + b) * 0.5;
      const cy = y0 + h * 0.5;
      if (ln.axis === 'x') {
        batch.addBox(ln.mat, len, h, 0.04, mid, cy, ln.z, 0, 2.4, false, true);
        if (y0 === 0 && h > 1.2) {
          batch.addBox(mats.bumperRail, len, 0.12, 0.07, mid, 0.92, ln.z + 0.02, 0, 2, false, true);
        }
      } else {
        batch.addBox(ln.mat, 0.04, h, len, ln.x, cy, mid, 0, 2.4, false, true);
        if (y0 === 0 && h > 1.2) {
          const sx = ln.x < 0 ? ln.x + 0.02 : ln.x - 0.02;
          batch.addBox(mats.bumperRail, 0.07, 0.12, len, sx, 0.92, mid, 0, 2, false, true);
        }
      }
    };
    let cur = start;
    wins.forEach(([wa, wb]) => {
      if (wa > cur) emitSpan(cur, wa, 0, WALL_H);
      emitSpan(wa, wb, 0, 1.0);
      emitSpan(wa, wb, 2.55, WALL_H);
      cur = Math.max(cur, wb);
    });
    if (cur < end) emitSpan(cur, end, 0, WALL_H);
  });

  // ===== 3. ARCHITECTURAL STAIRWELL (FLOOR 1 -> FLOOR 2) =====
  const st = STAIRWELL_SPEC;
  const stW = st.x1 - st.x0;
  const stCx = (st.x0 + st.x1) * 0.5;
  const stLen = st.zTop - st.zBottom; // 6.0m rising south (+Z)
  const stepD = stLen / st.steps;
  const stepH = FLOOR2_Y / st.steps;

  for (let i = 0; i < st.steps; i++) {
    const topY = (i + 1) * stepH;
    const zCenter = st.zBottom + (i + 0.5) * stepD;
    batch.addBox(mats.facadeTrim, stW - 0.12, topY, stepD + 0.03, stCx, topY * 0.5, zCenter, 0, 2.0);
    // Anti-slip rubber stair nosing strip on each tread
    batch.addBox(mats.bumperRail, stW - 0.16, 0.025, 0.06, stCx, topY + 0.01, zCenter - stepD * 0.45, 0, 1, false, false);
  }
  // Stairwell side wall separating stairs from scrub room east half (x = -6.62)
  batch.addBox(mats.corridorWall, 0.18, FLOOR2_Y + 0.9, stLen + 0.4, st.x1 + 0.08, (FLOOR2_Y + 0.9) * 0.5, (st.zBottom + st.zTop) * 0.5, 0, 2.4);
  physics.addBox(st.x1 - 0.02, 0, st.zBottom, st.x1 + 0.22, FLOOR2_Y + 1.2, st.zTop);

  // Sloped tubular stainless handrails on both sides of the stairwell
  const slopeAng = Math.atan2(FLOOR2_Y, stLen);
  const railLen = Math.hypot(FLOOR2_Y, stLen);
  for (const rx of [st.x0 + 0.14, st.x1 - 0.14]) {
    batch.addCylinder(
      mats.stainlessSteel,
      0.03,
      0.03,
      railLen,
      8,
      rx,
      FLOOR2_Y * 0.5 + 0.92,
      (st.zBottom + st.zTop) * 0.5,
      Math.PI / 2 - slopeAng,
      0,
      0,
      false,
      false
    );
  }
  // Register smooth walkable stair volume with physics solver
  physics.addStair({
    x0: st.x0 - 0.1,
    x1: st.x1 + 0.1,
    z0: st.zBottom - 0.25,
    z1: st.zTop + 0.25,
    axis: 'z',
    start: st.zBottom,
    end: st.zTop,
    yStart: 0,
    yEnd: FLOOR2_Y,
  });

  // ===== 4. LOBBY STRUCTURAL COLUMNS, OVERHEAD HVAC DUCTS & FLUORESCENT TROFFERS =====
  // 4 Tiled Structural Columns framing the Grand Lobby
  for (const [cx, cz] of [[-4.8, -15.6], [4.8, -15.6], [-4.8, -9.2], [4.8, -9.2]]) {
    batch.addBox(mats.corridorWall, 0.52, WALL_H, 0.52, cx, WALL_H * 0.5, cz, 0, 2.0);
    batch.addBox(mats.bumperRail, 0.58, 0.14, 0.58, cx, 0.92, cz, 0, 1);
    batch.addBox(mats.bumperRail, 0.58, 0.14, 0.58, cx, 0.07, cz, 0, 1);
    physics.addBoxCenter(cx, 1.5, cz, 0.58, 3.0, 0.58);
  }

  // Exposed galvanized overhead HVAC ducts & medical gas pipes in Main Concourse & Clinical Spine
  batch.addBox(mats.rustedMetal, 44, 0.26, 0.44, 0, WALL_H - 0.18, -17.0, 0, 2.2, false, false);
  batch.addBox(mats.rustedMetal, 0.42, 0.24, 21.5, 0.95, WALL_H - 0.18, -30.5, 0, 2.2, false, false);
  batch.addCylinder(mats.stainlessSteel, 0.04, 0.04, 44, 6, 0, WALL_H - 0.12, -18.55, 0, 0, Math.PI / 2, false, false);
  batch.addCylinder(mats.stainlessSteel, 0.04, 0.04, 21.5, 6, -1.15, WALL_H - 0.12, -30.5, Math.PI / 2, 0, 0, false, false);

  // Ceiling Fluorescent Light Troffer Housings + Strategic Atmospheric Accent Lights (mobile-budgeted!)
  const ceilingFixtures = [
    // Lobby
    { x: 0, y: WALL_H, z: -10.5, lit: 'warm', flicker: false, lightColor: 0xe6d4b2, intensity: 4.8, dist: 16 },
    // Main E-W Concourse
    { x: -14, y: WALL_H, z: -17.8, lit: 'cold', flicker: true, lightColor: 0xb6ded8, intensity: 3.6, dist: 14 },
    { x: 0, y: WALL_H, z: -17.8, lit: 'cold', flicker: false, lightColor: 0xc2e2dc, intensity: 4.0, dist: 15 },
    { x: 14, y: WALL_H, z: -17.8, lit: 'off' },
    // Clinical N-S Spine
    { x: 0, y: WALL_H, z: -26.5, lit: 'cold', flicker: true, lightColor: 0xaad4cc, intensity: 3.2, dist: 13 },
    { x: 0, y: WALL_H, z: -36.0, lit: 'red', flicker: false, lightColor: 0xe84838, intensity: 2.8, dist: 11 },
    // Key Department Ambient Fixtures
    { x: -16.5, y: WALL_H, z: -11.0, lit: 'cold', flicker: false, lightColor: 0xc4e2dc, intensity: 3.4, dist: 14 }, // Emergency
    { x: 12.8, y: WALL_H, z: -11.0, lit: 'off' }, // Pharmacy
    { x: 20.2, y: WALL_H, z: -11.0, lit: 'warm', flicker: false, lightColor: 0xead4a8, intensity: 3.2, dist: 12 }, // Nursing
    { x: -18.2, y: WALL_H, z: -24.5, lit: 'cold', flicker: false, lightColor: 0x8ec4dc, intensity: 3.5, dist: 14 }, // Radiology
    { x: -7.4, y: WALL_H, z: -24.5, lit: 'cold', flicker: false, lightColor: 0xb8ded6, intensity: 2.8, dist: 12 },  // Lab
    { x: 8.6, y: WALL_H, z: -24.5, lit: 'cold', flicker: true, lightColor: 0xbad6cc, intensity: 3.2, dist: 14 },   // Ward A
    { x: 19.5, y: WALL_H, z: -24.5, lit: 'warm', flicker: false, lightColor: 0xe6c896, intensity: 3.0, dist: 11 }, // Isolation 204
    { x: -17.2, y: WALL_H, z: -35.8, lit: 'cold', flicker: false, lightColor: 0xd0f0ea, intensity: 5.0, dist: 15 }, // Operating Theatre
    { x: -6.3, y: WALL_H, z: -33.0, lit: 'cold', flicker: false, lightColor: 0xb4d4d0, intensity: 2.6, dist: 12 },  // Scrub/Stairs
    { x: 8.35, y: WALL_H, z: -35.8, lit: 'cold', flicker: true, lightColor: 0x8ab4cc, intensity: 3.6, dist: 14 },   // Morgue
    { x: 19.2, y: WALL_H, z: -35.8, lit: 'warm', flicker: false, lightColor: 0xe8c48a, intensity: 3.2, dist: 12 }, // Director
    // Floor 2 Fixtures
    { x: -8.4, y: FLOOR2_Y + WALL_H, z: -33.0, lit: 'warm', flicker: false, lightColor: 0xe4ca9c, intensity: 3.2, dist: 12 },
    { x: 2.0, y: FLOOR2_Y + WALL_H, z: -32.0, lit: 'cold', flicker: true, lightColor: 0xb8d8d0, intensity: 3.4, dist: 14 },
    { x: -4.2, y: FLOOR2_Y + WALL_H, z: -24.5, lit: 'warm', flicker: false, lightColor: 0xdec494, intensity: 3.0, dist: 12 },
    { x: 8.35, y: FLOOR2_Y + WALL_H, z: -24.5, lit: 'red', flicker: false, lightColor: 0xe65848, intensity: 3.2, dist: 12 },
  ];

  ceilingFixtures.forEach((fx) => {
    batch.addBox(mats.darkMetal, 1.35, 0.08, 0.44, fx.x, fx.y - 0.04, fx.z, 0, 1, false, false);
    const tubeMat =
      fx.lit === 'warm'
        ? mats.lampWarmEmissive
        : fx.lit === 'cold'
          ? mats.lampColdEmissive
          : fx.lit === 'red'
            ? mats.emergencyRed
            : mats.lampOff;
    batch.addBox(tubeMat, 1.2, 0.04, 0.3, fx.x, fx.y - 0.09, fx.z, 0, 1, false, false);

    if (fx.lit !== 'off' && fx.intensity) {
      const pt = new THREE.PointLight(fx.lightColor, fx.intensity, fx.dist, 1.55);
      pt.position.set(fx.x, fx.y - 0.42, fx.z);
      group.add(pt);
      engine.registerAccentLight(pt, {
        flicker: fx.flicker,
        indoorOnly: true,
        maxDist: fx.dist + 8,
      });
    }
  });

  // ===== 5. ILLUMINATED GREEN EXIT SIGNS & DEPARTMENT PLAQUES =====
  const exitSigns = [
    { x: 0, y: 2.88, z: -6.35, ry: 0 },
    { x: 0, y: 2.88, z: -16.1, ry: 0 },
    { x: -2.05, y: 2.88, z: -32.2, ry: Math.PI / 2 },
    { x: -8.4, y: FLOOR2_Y + 2.88, z: -34.3, ry: 0 },
  ];
  exitSigns.forEach((es) => {
    batch.addBox(mats.darkMetal, 0.56, 0.24, 0.08, es.x, es.y, es.z, es.ry, 1, false, false);
    batch.addBox(mats.exitGreen, 0.46, 0.16, 0.09, es.x, es.y, es.z, es.ry, 1, false, false);
  });

  // Flush architectural batch first
  batch.flush(group);

  // Place Arabic/English room plaques over doorways
  const plaqueGeo = new THREE.BoxGeometry(1.42, 0.42, 0.05);
  ROOM_PLAQUES.forEach((p) => {
    const m = new THREE.Mesh(plaqueGeo, mats.makeRoomPlaque(p.title, p.code, p.accent));
    m.position.set(p.x, p.y, p.z);
    m.rotation.y = p.ry;
    group.add(m);
  });

  // Hospital Directory Board in Lobby (mounted beside reception column)
  const dirBoard = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.95, 0.08), mats.makeDirectoryBoard());
  dirBoard.position.set(-7.6, 1.72, -15.78);
  group.add(dirBoard);
}
