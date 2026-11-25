import * as THREE from 'three';
import { GeometryBatcher } from '../core/geometry.js';
import { FLOOR2_Y } from '../core/config.js';
import { createRng, randRange } from '../utils/math.js';

/**
 * Dense, Cluttered, Silent-Hill Abandoned Hospital Props & Medical Equipment.
 * - ZERO working lights or glowing CRT/X-Ray screens!
 * - EVERY single model uses rich PBR textured materials (rusted metal, chipped enamel, cracked leather, stained fabric, cardboard, yellowed papers).
 * - Heavy environmental storytelling: overturned chairs/wheelchairs, angled corridor gurneys, toppled cabinets, spilled documents, archive boxes, puddles, fallen IV stands!
 */
export function buildHospitalProps(engine, mats, physics) {
  const group = engine.zones.props;
  const batch = new GeometryBatcher();
  const rng = createRng(199477);

  // ===== HANDCRAFTED TEXTURED 3D PROP HELPERS =====

  function addScatteredPapers(cx, y, cz, count = 6, spread = 1.1) {
    for (let i = 0; i < count; i++) {
      const px = cx + randRange(rng, -spread, spread);
      const pz = cz + randRange(rng, -spread, spread);
      batch.addPlane(
        mats.paperWhite,
        0.24,
        0.32,
        px,
        y + 0.012 + i * 0.002,
        pz,
        -Math.PI / 2,
        randRange(rng, 0, Math.PI * 2),
        0,
        0,
        false,
        true
      );
    }
  }

  function addArchiveBoxes(x, y, z, ry = 0, stack = 2) {
    batch.addBox(mats.cardboardBox, 0.56, 0.42, 0.46, x, y + 0.21, z, ry, 1.0);
    if (stack >= 2) {
      batch.addBox(mats.cardboardBox, 0.52, 0.38, 0.44, x + 0.06, y + 0.61, z - 0.04, ry + 0.24, 1.0);
    }
    if (stack >= 3) {
      batch.addBox(mats.cardboardBox, 0.48, 0.36, 0.42, x + 0.62, y + 0.18, z + 0.12, ry - 0.3, 1.0);
    }
    physics.addCircle(x, z, 0.48, y, y + 1.0);
  }

  function addFloorPuddle(x, y, z, sx = 1.2, sz = 0.9) {
    batch.addPlane(
      mats.mudPuddle,
      sx * 2.1,
      sz * 2.1,
      x,
      y + 0.014,
      z,
      -Math.PI / 2,
      randRange(rng, 0, 6.28),
      0,
      0,
      false,
      true
    );
  }

  function addHospitalBed(x, y, z, ry = 0, scale = 1, messy = false) {
    const s = scale;
    const cs = Math.cos(ry);
    const sn = Math.sin(ry);
    const toW = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
    const box = (mat, w, h, d, lx, ly, lz, lry = 0, rx = 0, rz = 0) => {
      const [wx, wz] = toW(lx * s, lz * s);
      batch.addBox(mat, w * s, h * s, d * s, wx, y + ly * s, wz, ry + lry, 1.4, true, true, rx, rz);
    };

    for (const [lx, lz] of [[-0.44, -0.92], [0.44, -0.92], [-0.44, 0.92], [0.44, 0.92]]) {
      box(mats.rustedMetal, 0.055, 0.48, 0.055, lx, 0.24, lz);
      box(mats.rubberTire, 0.095, 0.095, 0.095, lx, 0.048, lz);
    }
    box(mats.paintedMetal, 0.98, 0.08, 1.98, 0, 0.5, 0);
    box(mats.rustedMetal, 0.98, 0.05, 0.05, 0, 1.06, -0.96);
    box(mats.rustedMetal, 0.98, 0.05, 0.05, 0, 0.86, 0.96);
    for (let i = -2; i <= 2; i++) {
      box(mats.rustedMetal, 0.03, 0.55, 0.03, i * 0.21, 0.78, -0.96);
      box(mats.rustedMetal, 0.03, 0.36, 0.03, i * 0.21, 0.68, 0.96);
    }
    for (const sx of [-0.49, 0.49]) {
      box(mats.rustedMetal, 0.03, 0.03, 1.25, sx, 0.84, -0.15);
      box(mats.rustedMetal, 0.03, 0.32, 0.03, sx, 0.68, -0.68);
      box(mats.rustedMetal, 0.03, 0.32, 0.03, sx, 0.68, 0.38);
    }
    // Stained abandoned mattress (askew if messy!)
    box(mats.fabricSheet, 0.9, 0.16, 1.84, messy ? 0.08 : 0, 0.62, messy ? 0.06 : 0, messy ? 0.12 : 0);
    box(mats.fabricSheet, 0.58, 0.11, 0.36, messy ? -0.12 : 0, 0.75, -0.64, messy ? -0.25 : 0);
    box(mats.blanketGreen, 0.93, 0.07, 1.08, messy ? 0.1 : 0, 0.73, 0.34, messy ? 0.18 : 0);
    box(mats.blanketGreen, 0.93, 0.28, 0.05, 0, 0.58, 0.9);
    physics.addCircle(x, z, 0.8 * s, y, y + 1.4);
  }

  function addGurney(x, y, z, ry = 0) {
    const cs = Math.cos(ry), sn = Math.sin(ry);
    const toW = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
    const box = (mat, w, h, d, lx, ly, lz, lry = 0) => {
      const [wx, wz] = toW(lx, lz);
      batch.addBox(mat, w, h, d, wx, y + ly, wz, ry + lry, 1.3);
    };
    box(mats.rustedMetal, 0.74, 0.06, 1.92, 0, 0.78, 0);
    box(mats.rustedMetal, 0.68, 0.04, 1.65, 0, 0.28, 0);
    box(mats.fabricSheet, 0.68, 0.12, 1.82, 0.02, 0.86, 0, 0.04);
    for (const [lx, lz] of [[-0.32, -0.82], [0.32, -0.82], [-0.32, 0.82], [0.32, 0.82]]) {
      box(mats.rustedMetal, 0.045, 0.74, 0.045, lx, 0.4, lz);
      box(mats.rubberTire, 0.1, 0.1, 0.08, lx, 0.05, lz);
    }
    for (const sx of [-0.38, 0.38]) box(mats.rustedMetal, 0.03, 0.03, 1.55, sx, 0.98, 0);
    physics.addCircle(x, z, 0.76, y, y + 1.2);
  }

  function addIVStand(x, y, z, fallen = false) {
    if (fallen) {
      batch.addCylinder(mats.rustedMetal, 0.22, 0.25, 0.04, 8, x, y + 0.22, z, 0, 0, Math.PI / 2);
      batch.addCylinder(mats.rustedMetal, 0.018, 0.022, 1.9, 6, x + 0.92, y + 0.12, z, 0, 0.2, Math.PI / 2 - 0.06);
      return;
    }
    batch.addCylinder(mats.rustedMetal, 0.22, 0.25, 0.04, 8, x, y + 0.02, z);
    batch.addCylinder(mats.rustedMetal, 0.018, 0.022, 1.95, 6, x, y + 0.98, z);
    batch.addBox(mats.rustedMetal, 0.34, 0.02, 0.02, x, y + 1.94, z, 0.4, 1);
    batch.addBox(mats.glassClear, 0.12, 0.22, 0.05, x + 0.14, y + 1.76, z, 0, 1, false, false);
    physics.addCircle(x, z, 0.24, y, y + 2.0);
  }

  function addPrivacyCurtain(x, y, z, len, ry = 0, crooked = false) {
    batch.addBox(mats.rustedMetal, len, 0.03, 0.03, x, y + 2.55, z, ry, 1, false, false);
    batch.addBox(
      mats.curtainTeal,
      len * 0.85,
      2.05,
      0.035,
      x,
      y + (crooked ? 1.42 : 1.5),
      z,
      ry,
      2.6,
      false,
      true,
      0,
      crooked ? 0.12 : 0
    );
  }

  function addDeskWithDeadCRT(x, y, z, ry = 0) {
    const cs = Math.cos(ry), sn = Math.sin(ry);
    const toW = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
    const box = (mat, w, h, d, lx, ly, lz, lry = 0) => {
      const [wx, wz] = toW(lx, lz);
      batch.addBox(mat, w, h, d, wx, y + ly, wz, ry + lry, 1.5);
    };
    box(mats.agedWood, 1.65, 0.06, 0.82, 0, 0.76, 0);
    box(mats.darkWood, 0.44, 0.72, 0.74, -0.58, 0.36, 0);
    box(mats.darkWood, 0.44, 0.72, 0.74, 0.58, 0.36, 0);
    box(mats.agedWood, 1.56, 0.58, 0.05, 0, 0.44, -0.34);
    // One desk drawer pulled half-open!
    box(mats.darkWood, 0.4, 0.18, 0.36, 0.58, 0.42, 0.44);
    box(mats.rustedMetal, 0.14, 0.025, 0.03, 0.58, 0.42, 0.63);
    // Dead dusty CRT monitor + keyboard
    box(mats.plasticBeige, 0.42, 0.36, 0.38, -0.25, 0.98, -0.14, 0.22);
    box(mats.crtDead, 0.32, 0.24, 0.03, -0.21, 1.0, 0.05, 0.22);
    box(mats.plasticBeige, 0.44, 0.03, 0.16, -0.18, 0.805, 0.22, -0.12);
    box(mats.paperWhite, 0.26, 0.025, 0.32, 0.35, 0.805, 0.06, -0.28);
    box(mats.paperWhite, 0.24, 0.02, 0.3, 0.44, 0.825, -0.04, 0.45);
    physics.addBoxCenter(x, y + 0.6, z, 1.65, 1.2, 0.9);
  }

  function addChair(x, y, z, ry = 0, matSeat = mats.leatherDark, knocked = false) {
    if (knocked) {
      batch.addBox(matSeat, 0.48, 0.06, 0.46, x, y + 0.24, z, ry, 1.2, true, true, 0, 1.48);
      batch.addBox(matSeat, 0.48, 0.44, 0.06, x + 0.22, y + 0.24, z - 0.18, ry, 1.2, true, true, 0, 1.48);
      batch.addBox(mats.darkMetal, 0.035, 0.46, 0.035, x - 0.2, y + 0.22, z + 0.15, ry, 1, true, true, 0, 1.48);
      batch.addBox(mats.darkMetal, 0.035, 0.46, 0.035, x - 0.2, y + 0.22, z - 0.15, ry, 1, true, true, 0, 1.48);
      return;
    }
    const cs = Math.cos(ry), sn = Math.sin(ry);
    const toW = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
    const box = (mat, w, h, d, lx, ly, lz) => {
      const [wx, wz] = toW(lx, lz);
      batch.addBox(mat, w, h, d, wx, y + ly, wz, ry, 1.2);
    };
    box(matSeat, 0.48, 0.06, 0.46, 0, 0.46, 0);
    box(matSeat, 0.48, 0.44, 0.06, 0, 0.72, -0.21);
    for (const [lx, lz] of [[-0.21, -0.2], [0.21, -0.2], [-0.21, 0.2], [0.21, 0.2]]) {
      box(mats.darkMetal, 0.035, 0.46, 0.035, lx, 0.23, lz);
    }
  }

  function addWheelchair(x, y, z, ry = 0, overturned = false) {
    if (overturned) {
      batch.addBox(mats.leatherDark, 0.5, 0.05, 0.46, x, y + 0.26, z, ry, 1, true, true, 0, 1.38);
      batch.addCylinder(mats.rubberTire, 0.31, 0.31, 0.05, 12, x, y + 0.32, z, 0, ry, 0.18);
      batch.addCylinder(mats.rustedMetal, 0.24, 0.24, 0.06, 10, x, y + 0.32, z, 0, ry, 0.18);
      physics.addCircle(x, z, 0.48, y, y + 0.8);
      return;
    }
    const cs = Math.cos(ry), sn = Math.sin(ry);
    const toW = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
    const box = (mat, w, h, d, lx, ly, lz) => {
      const [wx, wz] = toW(lx, lz);
      batch.addBox(mat, w, h, d, wx, y + ly, wz, ry, 1);
    };
    box(mats.leatherDark, 0.5, 0.05, 0.46, 0, 0.48, 0);
    box(mats.leatherDark, 0.5, 0.46, 0.05, 0, 0.74, -0.22);
    for (const sx of [-0.29, 0.29]) {
      const [wx, wz] = toW(sx, -0.05);
      batch.addCylinder(mats.rubberTire, 0.31, 0.31, 0.05, 12, wx, y + 0.31, wz, 0, ry, Math.PI / 2);
      batch.addCylinder(mats.rustedMetal, 0.24, 0.24, 0.06, 10, wx, y + 0.31, wz, 0, ry, Math.PI / 2);
      box(mats.rustedMetal, 0.035, 0.035, 0.48, sx * 0.9, 0.68, 0);
    }
    physics.addCircle(x, z, 0.45, y, y + 1.1);
  }

  function addFilingCabinet(x, y, z, ry = 0, openDrawer = false, toppled = false) {
    if (toppled) {
      batch.addBox(mats.paintedMetal, 0.54, 1.48, 0.62, x, y + 0.31, z, ry, 1.4, true, true, Math.PI / 2, 0);
      addScatteredPapers(x + Math.sin(ry) * 0.7, y, z + Math.cos(ry) * 0.7, 7, 0.85);
      physics.addCircle(x, z, 0.65, y, y + 0.8);
      return;
    }
    batch.addBox(mats.paintedMetal, 0.54, 1.48, 0.62, x, y + 0.74, z, ry, 1.4);
    const cs = Math.cos(ry), sn = Math.sin(ry);
    for (let i = 0; i < 4; i++) {
      const pull = openDrawer && i === 2 ? 0.34 : 0;
      const wx = x + (0.32 + pull) * sn;
      const wz = z + (0.32 + pull) * cs;
      if (pull > 0) batch.addBox(mats.darkMetal, 0.48, 0.26, 0.42, x + 0.38 * sn, y + 0.24 + i * 0.34, z + 0.38 * cs, ry, 1.2);
      batch.addBox(mats.rustedMetal, 0.16, 0.03, 0.04, wx, y + 0.24 + i * 0.34, wz, ry, 1);
    }
    physics.addBoxCenter(x, y + 0.74, z, 0.6, 1.5, 0.66);
  }

  function addMedicineShelf(x, y, z, ry = 0, w = 2.0) {
    const cs = Math.cos(ry), sn = Math.sin(ry);
    const toW = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
    for (const sx of [-w * 0.48, w * 0.48]) {
      for (const sz of [-0.22, 0.22]) {
        const [wx, wz] = toW(sx, sz);
        batch.addBox(mats.rustedMetal, 0.045, 2.05, 0.045, wx, y + 1.025, wz, ry, 1);
      }
    }
    for (let s = 0; s < 5; s++) {
      const sy = y + 0.22 + s * 0.42;
      batch.addBox(mats.paintedMetal, w, 0.04, 0.48, x, sy, z, ry, 1.5);
      if (s > 0 && s < 4) {
        for (let b = 0; b < 5; b++) {
          if (rng() < 0.25) continue; // missing/ransacked supplies
          const lx = -w * 0.36 + b * (w * 0.18);
          const [wx, wz] = toW(lx, b % 2 === 0 ? 0.06 : -0.06);
          const bMat = b % 3 === 0 ? mats.medicineAmber : b % 3 === 1 ? mats.medicineBlue : mats.cardboardBox;
          batch.addBox(bMat, 0.12, 0.18 + (b % 2) * 0.06, 0.12, wx, sy + 0.12, wz, ry + b * 0.25, 1, false, true);
        }
      }
    }
    physics.addBoxCenter(x, y + 1.0, z, Math.abs(cs) > 0.5 ? w : 0.55, 2.0, Math.abs(cs) > 0.5 ? 0.55 : w);
  }

  // ===== 0. CORRIDOR ABANDONMENT CLUTTER (FILLS THE HALLWAYS WITH SILENT HILL ATMOSPHERE!) =====
  // Main E-W Concourse (z: -19.6..-16) — carefully placed along edges so center lane stays freely walkable!
  addGurney(-11.8, 0, -16.85, 1.48);
  addWheelchair(-4.2, 0, -18.75, 0.72, true);
  addArchiveBoxes(5.8, 0, -16.7, 0.18, 3);
  addFilingCabinet(13.2, 0, -16.6, Math.PI, true, false);
  addChair(11.6, 0, -18.8, 0.4, mats.leatherDark, true);
  addIVStand(-7.2, 0, -18.85, true);
  addScatteredPapers(-3.0, 0, -17.6, 10, 1.6);
  addScatteredPapers(8.4, 0, -17.8, 8, 1.5);
  addFloorPuddle(-9.2, 0, -17.9, 1.35, 0.85);
  addFloorPuddle(3.6, 0, -18.1, 1.15, 0.75);

  // North-South Clinical Spine (x: -2.2..+2.2, z: -42..-19.6)
  addGurney(1.35, 0, -23.2, 0.14);
  addArchiveBoxes(-1.45, 0, -27.2, 0.22, 2);
  addWheelchair(1.35, 0, -31.0, -0.55, false);
  addScatteredPapers(0.0, 0, -26.0, 10, 1.4);
  addScatteredPapers(0.1, 0, -35.8, 8, 1.3);
  addFloorPuddle(-0.4, 0, -30.5, 1.1, 1.4);
  addChair(-1.4, 0, -37.2, 0.8, mats.paintedMetal, true);

  // ===== 1. GRAND LOBBY & RECEPTION HALL (x: -9..+9, z: -16..-6) =====
  batch.addBox(mats.agedWood, 4.6, 1.12, 0.78, 2.4, 0.56, -12.2, 0, 1.6);
  batch.addBox(mats.facadeTrim, 4.72, 0.08, 0.92, 2.4, 1.14, -12.2, 0, 1.6);
  batch.addBox(mats.agedWood, 0.78, 1.12, 2.6, 4.4, 0.56, -13.6, 0, 1.6);
  batch.addBox(mats.glassClear, 4.3, 0.72, 0.04, 2.4, 1.54, -11.84, 0, 1, false, false);
  // Dead CRT + dusty tilted desk lamp (UNPOWERED!) + strewn papers
  batch.addBox(mats.plasticBeige, 0.42, 0.36, 0.36, 1.4, 1.36, -12.2, 0.24, 1);
  batch.addBox(mats.crtDead, 0.32, 0.24, 0.03, 1.44, 1.38, -12.01, 0.24, 1);
  batch.addBox(mats.paperWhite, 0.36, 0.04, 0.28, 3.2, 1.2, -12.1, -0.15, 1);
  batch.addCylinder(mats.rustedMetal, 0.08, 0.1, 0.04, 8, 3.85, 1.2, -12.25);
  batch.addCylinder(mats.rustedMetal, 0.015, 0.015, 0.34, 6, 3.85, 1.38, -12.25, 0.12, 0, 0.15);
  batch.addBox(mats.lampOff, 0.24, 0.1, 0.14, 3.88, 1.54, -12.2, -0.15, 1, true, true, 0.18, 0.14);
  physics.addBox(0.0, 0, -12.7, 4.9, 1.8, -11.7);
  physics.addBox(3.9, 0, -15.0, 4.9, 1.8, -12.2);

  // Ransacked waiting area: crooked chairs, overturned chair, spilled magazines, stacked archive boxes, puddle
  for (let row = 0; row < 2; row++) {
    const wz = -9.4 - row * 2.5;
    batch.addBox(mats.darkMetal, 3.2, 0.06, 0.08, -6.2, 0.42, wz, 0, 1);
    for (let c = 0; c < 4; c++) {
      if (row === 1 && c === 2) continue;
      addChair(-7.4 + c * 0.8, 0, wz, randRange(rng, -0.06, 0.06), mats.paintedMetal);
    }
    physics.addBox(-7.9, 0, wz - 0.35, -4.5, 1.0, wz + 0.35);
  }
  addChair(-2.2, 0, -10.8, 0.65, mats.paintedMetal, true);
  batch.addBox(mats.agedWood, 1.15, 0.05, 0.62, -6.2, 0.44, -10.65, 0.18, 1.2);
  addScatteredPapers(-6.2, 0.46, -10.65, 4, 0.35);
  addScatteredPapers(1.2, 0, -10.4, 12, 2.2);
  addArchiveBoxes(6.6, 0, -14.6, 0.3, 3);
  addArchiveBoxes(-8.0, 0, -7.2, -0.2, 2);
  addWheelchair(-7.6, 0, -13.8, 0.55, false);
  addFloorPuddle(-1.2, 0, -9.2, 1.4, 1.1);

  // ===== 2. EMERGENCY / TRIAGE BAY (x: -24..-9, z: -16..-6) =====
  addHospitalBed(-20.8, 0, -9.2, Math.PI / 2 + 0.12, 1.0, true);
  addIVStand(-21.2, 0, -10.8, false);
  addPrivacyCurtain(-18.6, 0, -9.2, 2.6, Math.PI / 2, true);
  addHospitalBed(-14.2, 0, -9.4, Math.PI / 2 - 0.08, 1.0, false);
  addIVStand(-14.8, 0, -11.4, true);
  addPrivacyCurtain(-12.0, 0, -9.2, 2.6, Math.PI / 2, false);
  // Rusted Emergency Crash Cart with spilled trays
  batch.addBox(mats.redRustMetal, 0.88, 0.94, 0.56, -16.8, 0.52, -13.6, 0.28, 1.2);
  batch.addBox(mats.stainlessSteel, 0.92, 0.04, 0.6, -16.8, 1.0, -13.6, 0.28, 1);
  batch.addBox(mats.darkMetal, 0.32, 0.26, 0.22, -16.75, 1.15, -13.6, 0.28, 1);
  batch.addBox(mats.crtDead, 0.18, 0.12, 0.03, -16.73, 1.17, -13.48, 0.28, 1);
  physics.addCircle(-16.8, -13.6, 0.58, 0, 1.4);
  addDeskWithDeadCRT(-21.6, 0, -14.2, 0.25);
  addArchiveBoxes(-10.4, 0, -14.6, 0.12, 2);
  addScatteredPapers(-17.5, 0, -12.0, 9, 1.8);
  addFloorPuddle(-16.0, 0, -8.5, 1.3, 0.95);

  // ===== 3. CENTRAL PHARMACY (x: 9..16.5, z: -16..-6) =====
  batch.addBox(mats.agedWood, 0.72, 1.02, 4.2, 9.55, 0.51, -10.4, 0, 1.4);
  physics.addBox(9.1, 0, -12.6, 10.0, 1.2, -8.2);
  addMedicineShelf(12.6, 0, -7.2, 0, 3.2);
  addMedicineShelf(15.6, 0, -10.2, Math.PI / 2, 3.0);
  addMedicineShelf(12.6, 0, -13.0, 0, 2.4);
  batch.addBox(mats.paintedMetal, 0.85, 1.85, 0.76, 15.6, 0.925, -7.0, 0, 1.4);
  batch.addBox(mats.glassFrosted, 0.66, 1.15, 0.05, 15.6, 1.15, -6.6, 0, 1, false, false);
  physics.addBoxCenter(15.6, 0.9, -7.0, 0.92, 1.9, 0.82);
  addArchiveBoxes(11.4, 0, -10.6, 0.35, 2);
  addScatteredPapers(13.2, 0, -10.2, 8, 1.5);

  // ===== 4. CENTRAL NURSING STATION (x: 16.5..24, z: -16..-6) =====
  batch.addBox(mats.agedWood, 3.8, 1.08, 0.74, 20.2, 0.54, -12.8, 0, 1.6);
  batch.addBox(mats.facadeTrim, 3.9, 0.07, 0.86, 20.2, 1.1, -12.8, 0, 1.6);
  physics.addBox(18.2, 0, -13.3, 22.2, 1.3, -12.3);
  addDeskWithDeadCRT(20.4, 0, -8.4, Math.PI);
  addFilingCabinet(23.1, 0, -8.4, -Math.PI / 2, true, false);
  addFilingCabinet(23.1, 0, -9.3, -Math.PI / 2, false, false);
  addChair(20.2, 0, -10.2, 0.4, mats.leatherDark, true);
  addArchiveBoxes(17.8, 0, -8.2, 0.15, 3);
  addScatteredPapers(20.0, 0, -10.8, 10, 1.6);

  // ===== 5. RADIOLOGY / X-RAY SUITE (x: -24..-12.5, z: -29.5..-19.6) =====
  batch.addBox(mats.paintedMetal, 0.85, 0.78, 1.2, -19.8, 0.39, -24.8, 0, 1.4);
  batch.addBox(mats.darkMetal, 0.94, 0.1, 2.35, -19.8, 0.84, -24.8, 0, 1.4);
  batch.addBox(mats.leatherDark, 0.84, 0.06, 2.2, -19.8, 0.92, -24.8, 0, 1.2);
  physics.addBoxCenter(-19.8, 0.6, -24.8, 1.1, 1.2, 2.45);
  // Overhead ceiling-mounted rusted X-Ray tube arm
  batch.addBox(mats.rustedMetal, 3.6, 0.1, 0.14, -19.8, 3.05, -24.8, 0, 1.5);
  batch.addCylinder(mats.rustedMetal, 0.09, 0.09, 1.0, 8, -19.8, 2.55, -24.8);
  batch.addCylinder(mats.paintedMetal, 0.22, 0.22, 0.56, 10, -19.8, 2.02, -24.8, 0, 0, Math.PI / 2);
  batch.addBox(mats.darkMetal, 0.26, 0.22, 0.26, -19.8, 1.8, -24.8, 0, 1);
  // Lead-glass Technician Booth
  batch.addBox(mats.paintedMetal, 2.2, 1.12, 0.14, -14.0, 0.56, -22.2, 0, 1.5);
  batch.addBox(mats.glassFrosted, 2.1, 1.25, 0.06, -14.0, 1.75, -22.2, 0, 1, false, false);
  batch.addBox(mats.darkMetal, 1.4, 0.82, 0.58, -14.0, 0.41, -21.6, 0, 1.2);
  batch.addBox(mats.crtDead, 0.34, 0.24, 0.04, -14.1, 1.0, -21.65, 0, 1);
  physics.addBox(-15.2, 0, -22.4, -12.8, 2.4, -21.2);
  // UNLIT DEAD DOUBLE X-RAY FILM VIEWER ON NORTH WALL (only visible when your flashlight hits it!)
  batch.addBox(mats.darkMetal, 2.95, 1.52, 0.12, -16.4, 1.75, -29.28, 0, 1);
  const xrayPlane1 = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 1.32), mats.xrayDead);
  xrayPlane1.position.set(-17.12, 1.75, -29.21);
  group.add(xrayPlane1);
  const xrayPlane2 = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 1.32), mats.xrayDead);
  xrayPlane2.position.set(-15.68, 1.75, -29.21);
  xrayPlane2.rotation.z = -0.06; // slipped corner clip
  group.add(xrayPlane2);
  // Radiology clutter: overturned stool, archive film boxes, scattered film charts, puddle
  addChair(-16.2, 0, -25.4, 0.5, mats.leatherDark, true);
  addArchiveBoxes(-22.8, 0, -28.0, 0.2, 3);
  addFilingCabinet(-22.8, 0, -21.2, Math.PI / 2, true, false);
  addScatteredPapers(-16.8, 0, -27.2, 10, 1.6);
  addFloorPuddle(-17.5, 0, -24.0, 1.25, 0.9);

  // ===== 6. PATHOLOGY LABORATORY (x: -12.5..-2.2, z: -29.5..-19.6) =====
  batch.addBox(mats.stainlessSteel, 5.4, 0.08, 0.82, -7.4, 0.9, -28.8, 0, 1.8);
  batch.addBox(mats.paintedMetal, 5.2, 0.86, 0.72, -7.4, 0.43, -28.8, 0, 1.8);
  physics.addBox(-10.2, 0, -29.3, -4.6, 1.2, -28.3);
  batch.addBox(mats.stainlessSteel, 3.8, 0.08, 1.15, -7.4, 0.9, -24.4, 0, 1.8);
  batch.addBox(mats.paintedMetal, 3.6, 0.86, 1.0, -7.4, 0.43, -24.4, 0, 1.8);
  physics.addBox(-9.4, 0, -25.1, -5.4, 1.2, -23.7);
  for (const mx of [-8.6, -6.4]) {
    batch.addBox(mats.darkMetal, 0.24, 0.05, 0.28, mx, 0.96, -24.4, 0.2, 1);
    batch.addBox(mats.darkMetal, 0.06, 0.34, 0.06, mx, 1.15, -24.5, 0.2, 1);
    batch.addCylinder(mats.rustedMetal, 0.03, 0.035, 0.24, 8, mx, 1.26, -24.36, -0.35, 0, 0);
  }
  for (let j = 0; j < 6; j++) {
    const jx = -9.4 + j * 0.75;
    batch.addCylinder(mats.glassClear, 0.075, 0.075, 0.22, 8, jx, 1.06, -28.75, 0, 0, j === 3 ? 1.4 : 0, false, false);
    batch.addCylinder(mats.darkMetal, 0.08, 0.08, 0.04, 8, jx, 1.18, -28.75);
  }
  addMedicineShelf(-11.8, 0, -24.4, Math.PI / 2, 2.8);
  addChair(-7.4, 0, -22.2, 0.3, mats.leatherDark, true);
  addArchiveBoxes(-4.0, 0, -28.0, -0.25, 2);
  addScatteredPapers(-7.4, 0, -26.6, 9, 1.6);

  // ===== 7. INPATIENT WARD A (x: 2.2..15, z: -29.5..-19.6) =====
  const wardBedXs = [4.6, 7.6, 10.6, 13.4];
  wardBedXs.forEach((bx, idx) => {
    addHospitalBed(bx, 0, -27.8, idx === 2 ? 0.14 : 0, 1.0, idx % 2 === 1);
    batch.addBox(mats.paintedMetal, 1.15, 0.28, 0.09, bx, 1.52, -29.32, 0, 1.2);
    batch.addBox(mats.crtDead, 0.24, 0.16, 0.05, bx - 0.34, 1.54, -29.26, 0, 1);
    batch.addBox(mats.paintedMetal, 0.46, 0.72, 0.44, bx + 0.82, 0.36, -28.5, idx === 1 ? 0.45 : 0, 1.2);
    if (idx === 0) addIVStand(bx - 0.72, 0, -28.3, false);
    if (idx === 2) addIVStand(bx - 0.9, 0, -25.2, true);
    if (idx < 3) addPrivacyCurtain(bx + 1.5, 0, -27.4, 2.4, Math.PI / 2, idx === 1);
  });
  addWheelchair(4.2, 0, -21.8, -0.8, true);
  addArchiveBoxes(13.6, 0, -21.2, 0.3, 2);
  addChair(9.2, 0, -23.4, 0.45, mats.paintedMetal, true);
  addScatteredPapers(7.8, 0, -24.2, 12, 2.4);
  addFloorPuddle(6.2, 0, -23.6, 1.4, 0.95);

  // ===== 8. ISOLATION ROOM 204 (x: 15..24, z: -29.5..-19.6) =====
  addHospitalBed(21.4, 0, -26.8, -Math.PI / 2, 1.0, true);
  addIVStand(21.8, 0, -25.4, false);
  addDeskWithDeadCRT(17.4, 0, -26.4, Math.PI / 2);
  addChair(18.6, 0, -26.4, -Math.PI / 2, mats.leatherDark, true);
  addFilingCabinet(22.8, 0, -21.2, Math.PI, true, false);
  addArchiveBoxes(16.4, 0, -21.2, 0.22, 2);
  addScatteredPapers(19.2, 0, -24.2, 8, 1.6);

  // ===== 9. SCRUB & STERILE PREP ROOM (x: -10.5..-2.2, z: -42..-29.5) =====
  for (let i = 0; i < 3; i++) {
    const sx = -5.6 + i * 1.15;
    batch.addBox(mats.stainlessSteel, 0.88, 0.32, 0.56, sx, 0.86, -30.05, 0, 1.2);
    batch.addCylinder(mats.rustedMetal, 0.02, 0.02, 0.32, 6, sx, 1.14, -29.88);
    batch.addBox(mats.glassFrosted, 0.72, 0.88, 0.04, sx, 1.68, -29.68, 0, 1, false, false);
  }
  physics.addBox(-6.2, 0, -30.5, -2.6, 1.2, -29.6);
  batch.addBox(mats.paintedMetal, 0.58, 2.0, 2.2, -2.7, 1.0, -38.0, 0, 1.6);
  physics.addBox(-3.1, 0, -39.2, -2.3, 2.0, -36.8);
  addFloorPuddle(-4.5, 0, -31.8, 1.2, 0.85);
  addArchiveBoxes(-4.2, 0, -39.8, 0.15, 2);

  // ===== 10. OPERATING THEATRE (x: -24..-10.5, z: -42..-29.5) =====
  const ox = -17.2, oz = -35.8;
  batch.addBox(mats.rustedMetal, 0.95, 0.14, 1.1, ox, 0.07, oz, 0, 1.2);
  batch.addCylinder(mats.rustedMetal, 0.22, 0.26, 0.72, 10, ox, 0.46, oz);
  batch.addBox(mats.darkMetal, 0.76, 0.1, 2.15, ox, 0.88, oz, 0, 1.4);
  batch.addBox(mats.leatherDark, 0.7, 0.08, 2.04, ox, 0.97, oz, 0, 1.2);
  batch.addBox(mats.blanketGreen, 0.74, 0.03, 1.25, ox + 0.06, 1.02, oz + 0.22, 0.12, 1.2);
  batch.addBox(mats.leatherDark, 0.65, 0.05, 0.22, ox - 0.62, 0.95, oz - 0.25, 0.15, 1);
  batch.addBox(mats.leatherDark, 0.65, 0.05, 0.22, ox + 0.62, 0.95, oz - 0.25, -0.15, 1);
  physics.addBoxCenter(ox, 0.6, oz, 1.4, 1.2, 2.3);
  // Dead tilted overhead shadowless surgical boom lamp (ZERO GLOW!)
  batch.addCylinder(mats.rustedMetal, 0.12, 0.12, 0.68, 10, ox, 2.86, oz);
  batch.addBox(mats.rustedMetal, 1.35, 0.09, 0.09, ox + 0.52, 2.55, oz, 0.2, 1, true, true, 0, -0.14);
  batch.addCylinder(mats.paintedMetal, 0.54, 0.62, 0.18, 14, ox, 2.18, oz, 0.16, 0, -0.18);
  batch.addCylinder(mats.lampOff, 0.46, 0.48, 0.05, 14, ox, 2.08, oz, 0.16, 0, -0.18);
  // Dusty Anesthesia Machine + Oxygen Cylinders
  batch.addBox(mats.paintedMetal, 0.92, 1.38, 0.66, ox - 2.2, 0.69, oz - 1.4, 0.32, 1.4);
  batch.addBox(mats.crtDead, 0.42, 0.3, 0.04, ox - 2.02, 1.56, oz - 1.22, 0.32, 1);
  batch.addCylinder(mats.blanketGreen, 0.11, 0.11, 1.18, 10, ox - 2.85, 0.59, oz - 1.55);
  batch.addCylinder(mats.medicineBlue, 0.11, 0.11, 1.18, 10, ox - 2.6, 0.59, oz - 1.72);
  addIVStand(ox + 1.35, 0, oz - 1.3, true);
  physics.addCircle(ox - 2.3, oz - 1.4, 0.72, 0, 1.8);
  // Tilted Mayo tray + spilled steel trays + surgical clutter
  batch.addBox(mats.stainlessSteel, 0.78, 0.04, 0.54, ox + 1.55, 0.94, oz + 0.5, -0.25, 1);
  batch.addCylinder(mats.rustedMetal, 0.025, 0.025, 0.94, 6, ox + 1.55, 0.47, oz + 0.5);
  batch.addBox(mats.stainlessSteel, 0.52, 0.03, 0.36, ox + 1.1, 0.025, oz + 1.45, 0.45, 1); // dropped steel tray on floor!
  physics.addCircle(ox + 1.55, oz + 0.5, 0.42, 0, 1.2);
  addMedicineShelf(-23.0, 0, -35.8, Math.PI / 2, 3.6);
  addGurney(-13.8, 0, -39.6, 1.35);
  addArchiveBoxes(-22.2, 0, -31.2, 0.3, 2);
  addFloorPuddle(ox - 0.6, 0, oz + 1.8, 1.35, 1.0);
  addScatteredPapers(ox + 2.2, 0, oz - 1.2, 8, 1.5);

  // ===== 11. MORGUE & COLD STORAGE (x: 2.2..14.5, z: -42..-29.5) =====
  batch.addBox(mats.rustedMetal, 6.2, 2.55, 1.35, 8.4, 1.275, -40.9, 0, 1.8);
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const dx = 6.35 + col * 2.05;
      const dy = 0.68 + row * 1.12;
      const isPulled = (row === 0 && col === 1) || (row === 0 && col === 2);
      if (isPulled) {
        const outLen = col === 1 ? 2.05 : 1.15;
        batch.addBox(mats.darkMetal, 1.65, 0.88, 0.15, dx, dy, -40.28, 0, 1);
        batch.addBox(mats.stainlessSteel, 0.92, 0.07, outLen, dx, dy - 0.22, -40.28 + outLen * 0.5, 0, 1.4);
        if (col === 1) {
          batch.addBox(mats.fabricSheet, 0.82, 0.14, 1.72, dx, dy - 0.11, -39.25, 0.04, 1.4);
        }
        physics.addBoxCenter(dx, 0.5, -40.28 + outLen * 0.5, 1.0, 1.0, outLen);
      } else {
        batch.addBox(mats.stainlessSteel, 1.72, 0.92, 0.12, dx, dy, -40.18, 0, 1.4);
        batch.addBox(mats.darkMetal, 0.36, 0.06, 0.09, dx + 0.58, dy, -40.1, 0, 1);
        batch.addBox(mats.paperWhite, 0.24, 0.12, 0.02, dx - 0.45, dy + 0.22, -40.11, 0, 1);
      }
    }
  }
  physics.addBox(5.1, 0, -41.7, 11.7, 2.6, -40.05);

  const mx = 8.4, mz = -34.6;
  batch.addBox(mats.stainlessSteel, 0.72, 0.86, 1.1, mx, 0.43, mz, 0, 1.4);
  batch.addBox(mats.stainlessSteel, 0.98, 0.1, 2.38, mx, 0.91, mz, 0, 1.4);
  batch.addBox(mats.stainlessSteel, 0.98, 0.04, 0.05, mx, 0.98, mz - 1.16, 0, 1);
  batch.addBox(mats.stainlessSteel, 0.98, 0.04, 0.05, mx, 0.98, mz + 1.16, 0, 1);
  batch.addCylinder(mats.rustedMetal, 0.03, 0.03, 1.45, 8, mx, 2.48, mz - 0.95);
  batch.addCylinder(mats.rustedMetal, 0.025, 0.025, 0.45, 8, mx, 1.78, mz - 0.72, Math.PI / 2, 0, 0);
  batch.addBox(mats.darkMetal, 0.46, 0.02, 0.46, mx, 0.015, mz + 1.45, 0, 1, false, true);
  physics.addBoxCenter(mx, 0.6, mz, 1.05, 1.2, 2.45);
  // Morgue clutter: instrument cart, overturned metal bucket, gurney, wet drain puddle, scattered forms
  batch.addBox(mats.stainlessSteel, 0.76, 0.04, 0.52, mx + 1.8, 0.86, mz, 0.18, 1);
  batch.addBox(mats.stainlessSteel, 0.76, 0.04, 0.52, mx + 1.8, 0.32, mz, 0.18, 1);
  for (const [lx, lz] of [[-0.34, -0.22], [0.34, -0.22], [-0.34, 0.22], [0.34, 0.22]]) {
    batch.addBox(mats.rustedMetal, 0.04, 0.88, 0.04, mx + 1.8 + lx, 0.44, mz + lz, 0, 1);
  }
  physics.addCircle(mx + 1.8, mz, 0.52, 0, 1.1);
  batch.addCylinder(mats.rustedMetal, 0.18, 0.14, 0.34, 10, mx - 1.25, 0.16, mz + 0.6, Math.PI / 2, 0.5, 0);
  addGurney(3.8, 0, -39.2, 0.25);
  addFloorPuddle(mx - 0.4, 0, mz + 1.5, 1.55, 1.15);
  addScatteredPapers(mx + 1.6, 0, mz + 1.6, 8, 1.2);

  // ===== 12. DIRECTOR'S OFFICE & ARCHIVE (x: 14.5..24, z: -42..-29.5) =====
  addDeskWithDeadCRT(19.2, 0, -37.2, 0);
  addChair(19.2, 0, -38.4, 0.3, mats.leatherDark, false);
  addChair(18.4, 0, -35.6, Math.PI, mats.leatherDark, true);
  addChair(20.1, 0, -35.4, Math.PI - 0.3, mats.leatherDark, false);
  addFilingCabinet(23.1, 0, -33.2, -Math.PI / 2, true, false);
  addFilingCabinet(23.1, 0, -34.3, -Math.PI / 2, false, false);
  addFilingCabinet(22.2, 0, -36.5, -Math.PI / 2 + 0.3, false, true);
  addMedicineShelf(15.3, 0, -37.5, Math.PI / 2, 3.6);
  addArchiveBoxes(16.6, 0, -33.2, 0.25, 3);
  addScatteredPapers(19.2, 0, -34.5, 14, 2.2);

  // ===== 13. FLOOR 2 — UPPER CORRIDOR, PEDIATRIC WARD & ROOM 312 =====
  addWheelchair(-2.0, FLOOR2_Y, -33.2, 0.8, true);
  addArchiveBoxes(10.8, FLOOR2_Y, -33.4, 0.15, 3);
  addScatteredPapers(2.5, FLOOR2_Y, -32.0, 12, 2.4);

  addHospitalBed(-7.8, FLOOR2_Y, -22.2, Math.PI, 0.82, true);
  addHospitalBed(-4.2, FLOOR2_Y, -22.2, Math.PI + 0.1, 0.82, false);
  addHospitalBed(-0.6, FLOOR2_Y, -22.2, Math.PI, 0.82, true);
  batch.addBox(mats.agedWood, 1.25, 0.08, 0.72, -7.8, FLOOR2_Y + 0.48, -26.8, 0.12, 1.2);
  batch.addBox(mats.fabricSheet, 1.16, 0.1, 0.64, -7.8, FLOOR2_Y + 0.57, -26.8, 0.12, 1.2);
  for (let b = -3; b <= 3; b++) {
    batch.addBox(mats.agedWood, 0.035, 0.62, 0.035, -7.8 + b * 0.18, FLOOR2_Y + 0.82, -26.46, 0, 1);
    batch.addBox(mats.agedWood, 0.035, 0.62, 0.035, -7.8 + b * 0.18, FLOOR2_Y + 0.82, -27.14, 0, 1);
  }
  physics.addBoxCenter(-7.8, FLOOR2_Y + 0.6, -26.8, 1.35, 1.2, 0.85);
  addChair(-3.2, FLOOR2_Y, -25.8, 0.5, mats.agedWood, true);
  addScatteredPapers(-4.2, FLOOR2_Y, -24.8, 9, 1.8);

  // Room 312 — Nurse Nada's Secret Archive (boarded dark window + cluttered desk + archive stacks)
  addHospitalBed(12.2, FLOOR2_Y, -22.2, -Math.PI / 2, 1.0, true);
  addDeskWithDeadCRT(7.4, FLOOR2_Y, -22.2, Math.PI);
  addChair(7.4, FLOOR2_Y, -23.6, 0.25, mats.leatherDark, false);
  addFilingCabinet(3.1, FLOOR2_Y, -22.5, Math.PI / 2, true, false);
  addFilingCabinet(3.1, FLOOR2_Y, -23.6, Math.PI / 2, false, false);
  addMedicineShelf(13.6, FLOOR2_Y, -26.2, -Math.PI / 2, 2.6);
  addArchiveBoxes(5.2, FLOOR2_Y, -21.2, 0.3, 3);
  addScatteredPapers(7.8, FLOOR2_Y, -25.0, 14, 2.2);
  // Nailed weathered wooden boards across Room 312 window (z = -20.0) so it looks authentically abandoned!
  batch.addBox(mats.boardWood, 3.6, 0.22, 0.06, 8.4, FLOOR2_Y + 2.02, -20.16, 0, 1.4, true, true, 0, 0.08);
  batch.addBox(mats.boardWood, 3.6, 0.22, 0.06, 8.4, FLOOR2_Y + 1.54, -20.17, 0, 1.4, true, true, 0, -0.06);
  batch.addBox(mats.boardWood, 3.4, 0.2, 0.06, 8.4, FLOOR2_Y + 1.18, -20.15, 0, 1.4, true, true, 0, 0.04);

  batch.flush(group);

  // ===== 14. INTERACTIVE STORY FILES / CASSETTES =====
  const clueObjects = [];
  const clueDefs = [
    { id: 'clue_road', x: 1.8, y: 1.05, z: 28.5, title: 'بطاقة دخول ممرضة (١٩٩٤)' },
    { id: 'clue_reception', x: 3.1, y: 1.24, z: -12.1, title: 'سجل المناوبة الليلية — ١٢ أكتوبر ١٩٩٤' },
    { id: 'clue_radiology', x: -14.0, y: 0.9, z: -21.5, title: 'تقرير الأشعة — الحالة رقم ١٧' },
    { id: 'clue_isolation', x: 17.5, y: 0.84, z: -26.4, title: 'شريط كاسيت #١ — صوت ندى' },
    { id: 'clue_morgue', x: 10.2, y: 0.94, z: -34.6, title: 'بلاغ المشرحة المختوم' },
    { id: 'clue_room312', x: 7.5, y: FLOOR2_Y + 0.84, z: -22.2, title: 'الشريط الأخير — حقيقة مستشفى السدرة' },
  ];

  const clueGeo = new THREE.BoxGeometry(0.28, 0.05, 0.22);
  clueDefs.forEach((cd) => {
    const m = new THREE.Mesh(clueGeo, mats.clueFolder);
    m.position.set(cd.x, cd.y, cd.z);
    m.rotation.y = 0.35;
    group.add(m);
    clueObjects.push({ ...cd, mesh: m });
  });

  return { clueObjects };
}
