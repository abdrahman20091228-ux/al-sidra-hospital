import * as THREE from 'three';
import { GeometryBatcher } from '../core/geometry.js';
import { FLOOR2_Y, WALL_H } from '../core/config.js';
import { createRng, randRange } from '../utils/math.js';
import {
  ROOMS,
  WALLS_F1,
  WALLS_F2,
  STAIRWELL_SPEC,
  ROOM_PLAQUES,
} from './layout.js';

/**
 * Abandoned Silent Hill 2-Story Hospital Architecture:
 * - ZERO working interior lights! Dead dark fluorescent troffers (some dangling crookedly by a wire!)
 * - Clean non-repetitive two-tone institutional dado walls (fitV=true so dado sits at waist height cleanly)
 * - Asymmetric grime/water-damage decals, broken ceiling tiles & fallen rubble, rusted overhead pipes
 */
export function buildHospitalArchitecture(engine, mats, physics) {
  const group = engine.zones.hospital;
  const batch = new GeometryBatcher();
  const rng = createRng(199499);

  function pickWallMat(style) {
    if (style === 'facade') return mats.facadeConcrete;
    if (style === 'sterile') return mats.sterileTile;
    if (style === 'morgue') return mats.morgueTile;
    if (style === 'ward') return mats.wardWall;
    if (style === 'admin') return mats.adminWall;
    return mats.corridorWall;
  }

  function isDadoStyle(style) {
    return style === 'corridor' || style === 'ward' || style === 'admin';
  }

  function pickFloorMat(style) {
    if (style === 'sterile') return mats.sterileFloor;
    if (style === 'morgue') return mats.morgueFloor;
    return mats.hospitalFloor;
  }

  // ===== 1. ROOM FLOORS & DAMAGED ACOUSTIC CEILINGS =====
  ROOMS.forEach((room) => {
    const w = room.x1 - room.x0;
    const d = room.z1 - room.z0;
    const cx = (room.x0 + room.x1) * 0.5;
    const cz = (room.z0 + room.z1) * 0.5;
    const baseY = room.floor === 2 ? FLOOR2_Y : 0;

    batch.addBox(pickFloorMat(room.floorStyle), w, 0.08, d, cx, baseY - 0.04, cz, 0, 2.4, false, true);

    if (room.id === 'scrub') {
      // Leave stairwell shaft (x: -10.5..-6.5, z: -42..-32.8) open vertically to Floor 2 ceiling!
      const ew = -2.2 - -6.5;
      batch.addBox(mats.ceilingTile, ew, 0.14, d, -6.5 + ew * 0.5, baseY + WALL_H + 0.07, cz, 0, 2.4, false, true);
      const sd = -29.5 - -32.8;
      batch.addBox(mats.ceilingTile, 4.0, 0.14, sd, -8.5, baseY + WALL_H + 0.07, -32.8 + sd * 0.5, 0, 2.4, false, true);
    } else {
      batch.addBox(mats.ceilingTile, w, 0.14, d, cx, baseY + WALL_H + 0.07, cz, 0, 2.4, false, true);
    }
  });
  // Floor 2 top stairwell landing floor slab (x: -10.5..-6.5, z: -42.0..-39.15) & high shaft ceiling
  batch.addBox(mats.hospitalFloor, 4.0, 0.12, 2.85, -8.5, FLOOR2_Y - 0.06, -40.575, 0, 2.4, false, true);
  batch.addBox(mats.ceilingTile, 4.0, 0.14, 9.2, -8.5, FLOOR2_Y + WALL_H + 0.07, -37.4, 0, 2.4, false, true);

  // ===== 2. ARCHITECTURAL WALL BUILDER (USES addWallBox WITH SAFE BUFFER -> ZERO WALL CLIPPING!) =====
  function buildWallSegment(spec, baseY) {
    const isHoriz = Math.abs(spec.z1 - spec.z2) < 0.01;
    const thick = spec.thickness || 0.24;
    const wallMat = pickWallMat(spec.mat);
    const dadoFit = isDadoStyle(spec.mat);
    const tileS = dadoFit ? 3.8 : 2.5;
    const start = isHoriz ? Math.min(spec.x1, spec.x2) : Math.min(spec.z1, spec.z2);
    const end = isHoriz ? Math.max(spec.x1, spec.x2) : Math.max(spec.z1, spec.z2);
    const fixed = isHoriz ? spec.z1 : spec.x1;

    const openings = [];
    (spec.doors || []).forEach((d) => {
      openings.push({ type: 'door', a: d.coord - d.width * 0.5, b: d.coord + d.width * 0.5, sillY: 0, topY: d.height || 2.45, width: d.width });
    });
    (spec.windows || []).forEach((w) => {
      openings.push({ type: 'window', a: w.coord - w.width * 0.5, b: w.coord + w.width * 0.5, sillY: w.sillY ?? 1.0, topY: (w.sillY ?? 1.0) + (w.height ?? 1.4), width: w.width });
    });
    openings.sort((u, v) => u.a - v.a);

    function addSolidSpan(a, b, y0, y1, addCollider = true, addTrim = false) {
      const len = b - a;
      const h = y1 - y0;
      if (len < 0.04 || h < 0.04) return;
      const mid = (a + b) * 0.5;
      const cy = baseY + y0 + h * 0.5;
      const fullH = y0 === 0 && h > 2.8;
      // Extra +0.06m collider half-thickness ensures inner linings & edges NEVER clip into camera near-plane!
      const colHalf = thick * 0.5 + 0.06;
      if (isHoriz) {
        batch.addBox(wallMat, len, h, thick, mid, cy, fixed, 0, tileS, true, true, 0, 0, dadoFit && fullH);
        if (addTrim && y0 === 0 && h > 1.2) {
          batch.addBox(mats.bumperRail, len, 0.11, thick + 0.04, mid, baseY + 1.36, fixed, 0, 2.2, false, true);
          batch.addBox(mats.bumperRail, len, 0.14, thick + 0.03, mid, baseY + 0.07, fixed, 0, 2.2, false, true);
        }
        if (addCollider) physics.addWallBox(a, baseY + y0, fixed - colHalf, b, baseY + y1, fixed + colHalf);
      } else {
        batch.addBox(wallMat, thick, h, len, fixed, cy, mid, 0, tileS, true, true, 0, 0, dadoFit && fullH);
        if (addTrim && y0 === 0 && h > 1.2) {
          batch.addBox(mats.bumperRail, thick + 0.04, 0.11, len, fixed, baseY + 1.36, mid, 0, 2.2, false, true);
          batch.addBox(mats.bumperRail, thick + 0.03, 0.14, len, fixed, baseY + 0.07, mid, 0, 2.2, false, true);
        }
        if (addCollider) physics.addWallBox(fixed - colHalf, baseY + y0, a, fixed + colHalf, baseY + y1, b);
      }
    }

    const wantTrim = spec.mat !== 'facade';
    let cursor = start;
    openings.forEach((op) => {
      const a = Math.max(start, op.a);
      const b = Math.min(end, op.b);
      if (a > cursor) addSolidSpan(cursor, a, 0, WALL_H, true, wantTrim);
      if (op.topY < WALL_H) addSolidSpan(a, b, op.topY, WALL_H, false, false);
      if (op.sillY > 0) addSolidSpan(a, b, 0, op.sillY, true, wantTrim);

      const mid = (a + b) * 0.5;
      const opH = op.topY - op.sillY;
      const frameT = thick + 0.06;

      if (op.type === 'door') {
        if (isHoriz) {
          batch.addBox(mats.darkMetal, 0.09, opH, frameT, a + 0.04, baseY + opH * 0.5, fixed, 0, 1);
          batch.addBox(mats.darkMetal, 0.09, opH, frameT, b - 0.04, baseY + opH * 0.5, fixed, 0, 1);
          batch.addBox(mats.darkMetal, op.width, 0.1, frameT, mid, baseY + op.topY - 0.04, fixed, 0, 1);
          if (op.width < 3.0) {
            const leafW = Math.min(0.95, op.width * 0.46);
            batch.addBox(mats.paintedMetal, leafW, opH - 0.08, 0.06, a + 0.12, baseY + (opH - 0.08) * 0.5, fixed - leafW * 0.45, 1.18, 1.5);
          } else {
            batch.addBox(mats.darkMetal, 0.95, opH - 0.08, 0.07, a + 0.52, baseY + (opH - 0.08) * 0.5, fixed - 0.16, 0, 1);
            batch.addBox(mats.glassClear, 0.78, opH - 0.36, 0.03, a + 0.52, baseY + opH * 0.5, fixed - 0.16, 0, 1, false, false);
            batch.addBox(mats.darkMetal, 0.95, opH - 0.08, 0.07, b - 0.52, baseY + (opH - 0.08) * 0.5, fixed - 0.16, 0.08, 1);
          }
        } else {
          batch.addBox(mats.darkMetal, frameT, opH, 0.09, fixed, baseY + opH * 0.5, a + 0.04, 0, 1);
          batch.addBox(mats.darkMetal, frameT, opH, 0.09, fixed, baseY + opH * 0.5, b - 0.04, 0, 1);
          batch.addBox(mats.darkMetal, frameT, 0.1, op.width, fixed, baseY + op.topY - 0.04, mid, 0, 1);
          if (op.width < 3.0) {
            const leafW = Math.min(0.95, op.width * 0.46);
            batch.addBox(mats.paintedMetal, 0.06, opH - 0.08, leafW, fixed + leafW * 0.45, baseY + (opH - 0.08) * 0.5, a + 0.12, -1.18, 1.5);
          }
        }
      } else {
        const wy = baseY + op.sillY + opH * 0.5;
        if (isHoriz) {
          batch.addBox(mats.facadeTrim, op.width + 0.16, 0.1, frameT + 0.08, mid, baseY + op.sillY + 0.02, fixed, 0, 1.5);
          batch.addBox(mats.darkMetal, op.width, 0.08, frameT, mid, baseY + op.topY - 0.03, fixed, 0, 1);
          batch.addBox(mats.darkMetal, 0.08, opH, frameT, a + 0.04, wy, fixed, 0, 1);
          batch.addBox(mats.darkMetal, 0.08, opH, frameT, b - 0.04, wy, fixed, 0, 1);
          batch.addBox(mats.darkMetal, 0.06, opH, 0.09, mid, wy, fixed, 0, 1);
          batch.addBox(mats.glassClear, op.width - 0.12, opH - 0.12, 0.04, mid, wy, fixed, 0, 1, false, false);
          physics.addWallBox(a, baseY + op.sillY, fixed - thick * 0.55, b, baseY + op.topY, fixed + thick * 0.55);
        } else {
          batch.addBox(mats.facadeTrim, frameT + 0.08, 0.1, op.width + 0.16, fixed, baseY + op.sillY + 0.02, mid, 0, 1.5);
          batch.addBox(mats.darkMetal, frameT, 0.08, op.width, fixed, baseY + op.topY - 0.03, mid, 0, 1);
          batch.addBox(mats.darkMetal, frameT, opH, 0.08, fixed, wy, a + 0.04, 0, 1);
          batch.addBox(mats.darkMetal, frameT, opH, 0.08, fixed, wy, b - 0.04, 0, 1);
          batch.addBox(mats.darkMetal, 0.09, opH, 0.06, fixed, wy, mid, 0, 1);
          batch.addBox(mats.glassClear, 0.04, opH - 0.12, op.width - 0.12, fixed, wy, mid, 0, 1, false, false);
          physics.addWallBox(fixed - thick * 0.55, baseY + op.sillY, a, fixed + thick * 0.55, baseY + op.topY, b);
        }
      }
      cursor = Math.max(cursor, b);
    });
    if (cursor < end) addSolidSpan(cursor, end, 0, WALL_H, true, wantTrim);
  }

  WALLS_F1.forEach((w) => buildWallSegment(w, 0));
  WALLS_F2.forEach((w) => buildWallSegment(w, FLOOR2_Y));

  // ===== 2B. FLUSH INTERIOR CLADDING ON PERIMETER WALLS (TIGHTLY BACKED BY WALL COLLIDERS -> ZERO CLIPPING!) =====
  const innerLinings = [
    { x: -23.76, z0: -16, z1: -6, axis: 'z', mat: mats.corridorWall, dado: true, win: [-11] },
    { x: -23.76, z0: -29.5, z1: -19.6, axis: 'z', mat: mats.sterileTile, dado: false, win: [-24.5] },
    { x: -23.76, z0: -42, z1: -29.5, axis: 'z', mat: mats.sterileTile, dado: false, win: [-35.8] },
    { z: -41.76, x0: -24, x1: -10.5, axis: 'x', mat: mats.sterileTile, dado: false, win: [-17.2] },
    { z: -41.76, x0: -10.5, x1: -2.2, axis: 'x', mat: mats.sterileTile, dado: false, win: [] },
    { z: -41.76, x0: 2.2, x1: 14.5, axis: 'x', mat: mats.morgueTile, dado: false, win: [8.4] },
    { z: -41.76, x0: 14.5, x1: 24, axis: 'x', mat: mats.adminWall, dado: true, win: [19.2] },
    { x: 23.76, z0: -16, z1: -6, axis: 'z', mat: mats.corridorWall, dado: true, win: [-11] },
    { x: 23.76, z0: -29.5, z1: -19.6, axis: 'z', mat: mats.wardWall, dado: true, win: [-24.5] },
    { x: 23.76, z0: -42, z1: -29.5, axis: 'z', mat: mats.adminWall, dado: true, win: [-35.8] },
    // Morgue west interior wall flush cladding
    { x: 2.34, z0: -33.0, z1: -29.6, axis: 'z', mat: mats.morgueTile, dado: false, win: [] },
    { x: 2.34, z0: -41.7, z1: -35.4, axis: 'z', mat: mats.morgueTile, dado: false, win: [] },
  ];
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
      const fullH = y0 === 0 && h > 2.8;
      if (ln.axis === 'x') {
        batch.addBox(ln.mat, len, h, 0.03, mid, cy, ln.z, 0, ln.dado ? 3.8 : 2.4, false, true, 0, 0, ln.dado && fullH);
        if (y0 === 0 && h > 1.2) batch.addBox(mats.bumperRail, len, 0.11, 0.05, mid, 1.36, ln.z + 0.015, 0, 2, false, true);
      } else {
        batch.addBox(ln.mat, 0.03, h, len, ln.x, cy, mid, 0, ln.dado ? 3.8 : 2.4, false, true, 0, 0, ln.dado && fullH);
        if (y0 === 0 && h > 1.2) {
          const sx = ln.x < 0 ? ln.x + 0.015 : ln.x - 0.015;
          batch.addBox(mats.bumperRail, 0.05, 0.11, len, sx, 1.36, mid, 0, 2, false, true);
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

  // ===== 2C. ASYMMETRIC SILENT HILL WALL GRIME & WATER-DAMAGE DECALS =====
  const wallDecals = [
    { x: -6.8, y: 1.65, z: -15.84, ry: 0, w: 2.6, h: 2.8 },
    { x: 6.4, y: 1.55, z: -15.84, ry: 0, w: 2.4, h: 2.6 },
    { x: -12.5, y: 1.7, z: -19.44, ry: 0, w: 3.1, h: 2.8 },
    { x: 5.2, y: 1.6, z: -19.44, ry: 0, w: 2.8, h: 2.7 },
    { x: 13.8, y: 1.5, z: -16.16, ry: Math.PI, w: 2.9, h: 2.6 },
    { x: -2.04, y: 1.65, z: -22.0, ry: Math.PI / 2, w: 2.6, h: 2.8 },
    { x: 2.04, y: 1.6, z: -28.0, ry: -Math.PI / 2, w: 2.9, h: 2.7 },
    { x: -2.04, y: 1.55, z: -36.5, ry: Math.PI / 2, w: 3.0, h: 2.8 },
    { x: 8.4, y: 1.65, z: -29.66, ry: 0, w: 3.4, h: 2.8 },
    { x: -16.5, y: 1.65, z: -29.66, ry: 0, w: 3.2, h: 2.8 },
    { x: 11.2, y: 1.6, z: -29.34, ry: Math.PI, w: 3.1, h: 2.7 },
    { x: 4.5, y: FLOOR2_Y + 1.6, z: -34.34, ry: 0, w: 3.2, h: 2.7 },
  ];
  wallDecals.forEach((d) => {
    batch.addPlane(mats.decalGrime, d.w, d.h, d.x, d.y, d.z, 0, d.ry, 0, 0, false, true);
  });

  // ===== 3. CLEAN FORWARD-CLIMBING CONCRETE HOSPITAL STAIRWELL (ZERO INVISIBLE WALLS!) =====
  // Bottom step at zBottom = -33.2 (Y=0) climbing NORTH to zTop = -39.2 (Y=3.6), then turning EAST!
  const st = STAIRWELL_SPEC;
  const stW = st.x1 - st.x0;
  const stCx = (st.x0 + st.x1) * 0.5;
  const stLen = Math.abs(st.zTop - st.zBottom); // 6.0m
  const dirZ = st.zTop < st.zBottom ? -1 : 1;   // -1 (northward)
  const stepD = stLen / st.steps;
  const stepH = FLOOR2_Y / st.steps;
  for (let i = 0; i < st.steps; i++) {
    const topY = (i + 1) * stepH;
    const zCenter = st.zBottom + dirZ * (i + 0.5) * stepD;
    batch.addBox(mats.facadeTrim, stW - 0.1, topY, stepD + 0.03, stCx, topY * 0.5, zCenter, 0, 2.0);
    batch.addBox(mats.bumperRail, stW - 0.14, 0.025, 0.05, stCx, topY + 0.01, zCenter - dirZ * stepD * 0.45, 0, 1, false, false);
  }
  // Under-landing concrete enclosure on Floor 1 (z = -42..-39.2, y = 0..3.4) so you don't walk under the top landing
  batch.addBox(mats.corridorWall, stW + 0.2, 3.45, 2.8, stCx, 1.725, -40.6, 0, 3.2);
  physics.addWallBox(st.x0 - 0.1, 0, -42.0, st.x1 + 0.15, 3.4, -39.25);

  // Side stair balustrade wall ONLY along the flight (x = st.x1 + 0.1, z = -39.1..-33.2) — OPEN east at top landing (-42..-39.2)!
  batch.addBox(mats.corridorWall, 0.2, FLOOR2_Y + 0.85, stLen, st.x1 + 0.12, (FLOOR2_Y + 0.85) * 0.5, (st.zBottom + st.zTop) * 0.5, 0, 3.6);
  physics.addWallBox(st.x1 - 0.02, 0, st.zTop + 0.1, st.x1 + 0.24, FLOOR2_Y + 1.2, st.zBottom);

  // Rusted tubular handrails on both sides of the stair flight
  const slopeAng = Math.atan2(FLOOR2_Y, stLen);
  const railLen = Math.hypot(FLOOR2_Y, stLen);
  for (const rx of [st.x0 + 0.14, st.x1 - 0.14]) {
    batch.addCylinder(
      mats.rustedMetal,
      0.032,
      0.032,
      railLen,
      8,
      rx,
      FLOOR2_Y * 0.5 + 0.92,
      (st.zBottom + st.zTop) * 0.5,
      -(Math.PI / 2 - slopeAng),
      0,
      0,
      false,
      false
    );
  }
  physics.addStair({
    x0: st.x0 - 0.15,
    x1: st.x1 + 0.15,
    z0: Math.min(st.zBottom, st.zTop) - 0.35,
    z1: Math.max(st.zBottom, st.zTop) + 0.35,
    axis: 'z',
    start: st.zBottom,
    end: st.zTop,
    yStart: 0,
    yEnd: FLOOR2_Y,
  });

  // ===== 4. LOBBY COLUMNS, RUSTED OVERHEAD HVAC DUCTS & DEAD/BROKEN FLUORESCENT FIXTURES (ZERO LIGHT!) =====
  for (const [cx, cz] of [[-4.8, -15.6], [4.8, -15.6], [-4.8, -9.2], [4.8, -9.2]]) {
    batch.addBox(mats.corridorWall, 0.52, WALL_H, 0.52, cx, WALL_H * 0.5, cz, 0, 3.6, true, true, 0, 0, true);
    batch.addBox(mats.bumperRail, 0.58, 0.12, 0.58, cx, 1.36, cz, 0, 1);
    batch.addBox(mats.bumperRail, 0.58, 0.14, 0.58, cx, 0.07, cz, 0, 1);
    physics.addBoxCenter(cx, 1.5, cz, 0.58, 3.0, 0.58);
  }

  // Rusted overhead HVAC ducts & ceiling pipes
  batch.addBox(mats.rustedMetal, 44, 0.26, 0.44, 0, WALL_H - 0.18, -17.0, 0, 2.2, false, false);
  batch.addBox(mats.rustedMetal, 0.42, 0.24, 21.5, 0.95, WALL_H - 0.18, -30.5, 0, 2.2, false, false);
  batch.addCylinder(mats.rustedMetal, 0.045, 0.045, 44, 6, 0, WALL_H - 0.12, -18.55, 0, 0, Math.PI / 2, false, false);
  batch.addCylinder(mats.rustedMetal, 0.045, 0.045, 21.5, 6, -1.15, WALL_H - 0.12, -30.5, Math.PI / 2, 0, 0, false, false);

  // Dead unpowered ceiling fluorescent housings — several dangling crookedly from a snapped ceiling bracket!
  const deadFixtures = [
    { x: 0, y: WALL_H, z: -10.5, broken: false },
    { x: -14, y: WALL_H, z: -17.8, broken: true },
    { x: 0, y: WALL_H, z: -17.8, broken: false },
    { x: 14, y: WALL_H, z: -17.8, broken: true },
    { x: 0, y: WALL_H, z: -26.5, broken: true },
    { x: 0, y: WALL_H, z: -36.0, broken: false },
    { x: -16.5, y: WALL_H, z: -11.0, broken: false },
    { x: 12.8, y: WALL_H, z: -11.0, broken: false },
    { x: 20.2, y: WALL_H, z: -11.0, broken: true },
    { x: -18.2, y: WALL_H, z: -24.5, broken: false },
    { x: -7.4, y: WALL_H, z: -24.5, broken: true },
    { x: 8.6, y: WALL_H, z: -24.5, broken: true },
    { x: 19.5, y: WALL_H, z: -24.5, broken: false },
    { x: -17.2, y: WALL_H, z: -35.8, broken: false },
    { x: 8.35, y: WALL_H, z: -35.8, broken: true },
    { x: 19.2, y: WALL_H, z: -35.8, broken: false },
    { x: 2.0, y: FLOOR2_Y + WALL_H, z: -32.0, broken: true },
    { x: -4.2, y: FLOOR2_Y + WALL_H, z: -24.5, broken: false },
    { x: 8.35, y: FLOOR2_Y + WALL_H, z: -24.5, broken: false },
  ];
  deadFixtures.forEach((fx) => {
    if (fx.broken) {
      // Dangling crooked fixture hanging down by a wire!
      batch.addCylinder(mats.darkMetal, 0.012, 0.012, 0.45, 4, fx.x - 0.55, fx.y - 0.22, fx.z);
      batch.addBox(mats.darkMetal, 1.35, 0.08, 0.42, fx.x, fx.y - 0.34, fx.z, 0.12, 1, true, false, 0.08, -0.34);
      batch.addBox(mats.lampOff, 1.18, 0.04, 0.28, fx.x, fx.y - 0.39, fx.z, 0.12, 1, false, false, 0.08, -0.34);
    } else {
      batch.addBox(mats.darkMetal, 1.35, 0.08, 0.42, fx.x, fx.y - 0.04, fx.z, 0, 1, false, false);
      batch.addBox(mats.lampOff, 1.18, 0.04, 0.28, fx.x, fx.y - 0.09, fx.z, 0, 1, false, false);
    }
  });

  // Dead unlit weathered EXIT signs + rusted wall fire extinguishers
  const exitSigns = [
    { x: 0, y: 2.86, z: -6.35, ry: 0 },
    { x: 0, y: 2.86, z: -16.1, ry: 0 },
    { x: -2.05, y: 2.86, z: -32.2, ry: Math.PI / 2 },
    { x: -8.4, y: FLOOR2_Y + 2.86, z: -34.3, ry: 0 },
  ];
  exitSigns.forEach((es) => {
    batch.addBox(mats.darkMetal, 0.56, 0.24, 0.08, es.x, es.y, es.z, es.ry, 1, false, false);
    batch.addBox(mats.exitDead, 0.46, 0.16, 0.09, es.x, es.y, es.z, es.ry, 1, false, false);
  });

  for (const [fx, fz] of [[-5.6, -15.8], [5.6, -15.8], [-2.0, -22.2], [2.0, -27.5]]) {
    batch.addCylinder(mats.redRustMetal, 0.085, 0.085, 0.56, 8, fx, 1.15, fz);
    batch.addCylinder(mats.darkMetal, 0.03, 0.04, 0.1, 6, fx, 1.48, fz);
  }

  // Fallen broken ceiling tiles & concrete rubble chunks scattered inside corridors
  const debrisSpots = [
    [-10.5, -17.4], [-3.2, -18.2], [7.8, -17.1], [1.1, -23.4], [-1.2, -31.8],
    [1.1, -38.0], [-14.2, -33.2], [5.5, -36.5], [10.4, -22.2], [3.5, -31.5],
  ];
  debrisSpots.forEach(([dx, dz], idx) => {
    const by = idx === 9 ? FLOOR2_Y : 0;
    batch.addBox(mats.ceilingTile, 0.62, 0.035, 0.58, dx, by + 0.02, dz, randRange(rng, 0, 3), 1.0, false, true);
    batch.addBox(mats.facadeConcrete, 0.24, 0.14, 0.22, dx + 0.35, by + 0.07, dz - 0.18, randRange(rng, 0, 3), 1.0);
    batch.addBox(mats.facadeConcrete, 0.16, 0.1, 0.18, dx - 0.28, by + 0.05, dz + 0.26, randRange(rng, 0, 3), 1.0);
  });

  batch.flush(group);

  // Room signage plaques (weathered & dusty)
  const plaqueGeo = new THREE.BoxGeometry(1.42, 0.42, 0.05);
  ROOM_PLAQUES.forEach((p) => {
    const m = new THREE.Mesh(plaqueGeo, mats.makeRoomPlaque(p.title, p.code, p.accent));
    m.position.set(p.x, p.y, p.z);
    m.rotation.y = p.ry;
    group.add(m);
  });

  const dirBoard = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.95, 0.08), mats.makeDirectoryBoard());
  dirBoard.position.set(-7.6, 1.72, -15.78);
  dirBoard.rotation.z = 0.04; // slightly crooked on wall
  group.add(dirBoard);
}
