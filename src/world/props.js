import * as THREE from 'three';
import { GeometryBatcher } from '../core/geometry.js';
import { FLOOR2_Y } from '../core/config.js';

/**
 * Handcrafted 3D Medical Furniture & Interior Props for all 15 hospital departments.
 * Every prop is composed from multi-part architectural primitives wrapped in seamless PBR textures
 * and merged into minimal batched draw calls for ultra-cool mobile GPU performance!
 */
export function buildHospitalProps(engine, mats, physics) {
  const group = engine.zones.props;
  const batch = new GeometryBatcher();

  // ===== REUSABLE HANDCRAFTED 3D MEDICAL FURNITURE HELPERS =====

  function addHospitalBed(x, y, z, ry = 0, scale = 1) {
    const s = scale;
    const cs = Math.cos(ry);
    const sn = Math.sin(ry);
    const toW = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
    const box = (mat, w, h, d, lx, ly, lz, lry = 0) => {
      const [wx, wz] = toW(lx * s, lz * s);
      batch.addBox(mat, w * s, h * s, d * s, wx, y + ly * s, wz, ry + lry, 1.4);
    };

    // Tubular steel frame + wheeled legs
    for (const [lx, lz] of [[-0.44, -0.92], [0.44, -0.92], [-0.44, 0.92], [0.44, 0.92]]) {
      box(mats.stainlessSteel, 0.055, 0.48, 0.055, lx, 0.24, lz);
      box(mats.rubberTire, 0.09, 0.09, 0.09, lx, 0.045, lz);
    }
    box(mats.paintedMetal, 0.98, 0.08, 1.98, 0, 0.50, 0);
    // Headboard & Footboard with vertical steel bars
    box(mats.stainlessSteel, 0.98, 0.05, 0.05, 0, 1.06, -0.96);
    box(mats.stainlessSteel, 0.98, 0.05, 0.05, 0, 0.86, 0.96);
    for (let i = -2; i <= 2; i++) {
      box(mats.stainlessSteel, 0.03, 0.55, 0.03, i * 0.21, 0.78, -0.96);
      box(mats.stainlessSteel, 0.03, 0.36, 0.03, i * 0.21, 0.68, 0.96);
    }
    // Side safety rails
    for (const sx of [-0.49, 0.49]) {
      box(mats.stainlessSteel, 0.03, 0.03, 1.25, sx, 0.84, -0.15);
      box(mats.stainlessSteel, 0.03, 0.32, 0.03, sx, 0.68, -0.68);
      box(mats.stainlessSteel, 0.03, 0.32, 0.03, sx, 0.68, 0.38);
    }
    // Mattress, pillow & folded green institutional blanket
    box(mats.fabricSheet, 0.90, 0.16, 1.84, 0, 0.62, 0);
    box(mats.fabricSheet, 0.58, 0.11, 0.36, 0, 0.75, -0.64);
    box(mats.blanketGreen, 0.93, 0.07, 1.08, 0, 0.73, 0.34);
    box(mats.blanketGreen, 0.93, 0.26, 0.05, 0, 0.60, 0.90);

    physics.addCircle(x, z, 0.78 * s, y, y + 1.4);
  }

  function addIVStand(x, y, z) {
    batch.addCylinder(mats.stainlessSteel, 0.22, 0.25, 0.04, 8, x, y + 0.02, z);
    batch.addCylinder(mats.stainlessSteel, 0.018, 0.022, 1.95, 6, x, y + 0.98, z);
    batch.addBox(mats.stainlessSteel, 0.34, 0.02, 0.02, x, y + 1.94, z, 0.4, 1);
    batch.addBox(mats.glassClear, 0.12, 0.22, 0.05, x + 0.14, y + 1.76, z, 0, 1, false, false);
    physics.addCircle(x, z, 0.24, y, y + 2.0);
  }

  function addPrivacyCurtain(x, y, z, len, ry = 0) {
    // Ceiling steel curtain track + hanging pleated teal medical curtain
    batch.addBox(mats.stainlessSteel, len, 0.03, 0.03, x, y + 2.55, z, ry, 1, false, false);
    batch.addBox(mats.curtainTeal, len * 0.85, 2.05, 0.035, x, y + 1.5, z, ry, 2.8, false, true);
  }

  function addDeskWithMonitor(x, y, z, ry = 0, withCrt = true) {
    const cs = Math.cos(ry);
    const sn = Math.sin(ry);
    const toW = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
    const box = (mat, w, h, d, lx, ly, lz, lry = 0) => {
      const [wx, wz] = toW(lx, lz);
      batch.addBox(mat, w, h, d, wx, y + ly, wz, ry + lry, 1.5);
    };
    box(mats.agedWood, 1.65, 0.06, 0.82, 0, 0.76, 0);
    box(mats.darkWood, 0.44, 0.72, 0.74, -0.58, 0.36, 0);
    box(mats.darkWood, 0.44, 0.72, 0.74, 0.58, 0.36, 0);
    box(mats.agedWood, 1.56, 0.58, 0.05, 0, 0.44, -0.34);
    for (let i = 0; i < 3; i++) {
      box(mats.stainlessSteel, 0.14, 0.025, 0.03, 0.58, 0.22 + i * 0.2, 0.38);
    }
    if (withCrt) {
      box(mats.plasticBeige, 0.42, 0.36, 0.38, -0.25, 0.98, -0.14, 0.18);
      box(mats.crtGlow, 0.32, 0.24, 0.03, -0.22, 1.0, 0.05, 0.18);
      box(mats.plasticBeige, 0.44, 0.03, 0.16, -0.2, 0.805, 0.2, 0.08);
    }
    // Scattered patient folders
    box(mats.paperWhite, 0.26, 0.025, 0.32, 0.35, 0.805, 0.06, -0.22);
    box(mats.paperWhite, 0.24, 0.02, 0.3, 0.44, 0.825, -0.04, 0.35);
    physics.addBoxCenter(x, y + 0.6, z, 1.65, 1.2, 0.9);
  }

  function addChair(x, y, z, ry = 0, matSeat = mats.leatherDark) {
    const cs = Math.cos(ry);
    const sn = Math.sin(ry);
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

  function addWheelchair(x, y, z, ry = 0) {
    const cs = Math.cos(ry);
    const sn = Math.sin(ry);
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
      batch.addCylinder(mats.stainlessSteel, 0.24, 0.24, 0.06, 10, wx, y + 0.31, wz, 0, ry, Math.PI / 2);
      box(mats.stainlessSteel, 0.035, 0.035, 0.48, sx * 0.9, 0.68, 0);
    }
    physics.addCircle(x, z, 0.45, y, y + 1.1);
  }

  function addFilingCabinet(x, y, z, ry = 0) {
    batch.addBox(mats.paintedMetal, 0.54, 1.48, 0.62, x, y + 0.74, z, ry, 1.4);
    const cs = Math.cos(ry);
    const sn = Math.sin(ry);
    for (let i = 0; i < 4; i++) {
      const wx = x + 0.32 * sn;
      const wz = z + 0.32 * cs;
      batch.addBox(mats.stainlessSteel, 0.16, 0.03, 0.04, wx, y + 0.24 + i * 0.34, wz, ry, 1);
    }
    physics.addBoxCenter(x, y + 0.74, z, 0.6, 1.5, 0.66);
  }

  function addMedicineShelf(x, y, z, ry = 0, w = 2.0) {
    const cs = Math.cos(ry);
    const sn = Math.sin(ry);
    const toW = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
    for (const sx of [-w * 0.48, w * 0.48]) {
      for (const sz of [-0.22, 0.22]) {
        const [wx, wz] = toW(sx, sz);
        batch.addBox(mats.stainlessSteel, 0.045, 2.05, 0.045, wx, y + 1.025, wz, ry, 1);
      }
    }
    for (let s = 0; s < 5; s++) {
      const sy = y + 0.22 + s * 0.42;
      batch.addBox(mats.paintedMetal, w, 0.04, 0.48, x, sy, z, ry, 1.5);
      if (s > 0 && s < 4) {
        // Medicine bottles & boxes stocked on shelves
        for (let b = 0; b < 5; b++) {
          const lx = -w * 0.36 + b * (w * 0.18);
          const [wx, wz] = toW(lx, (b % 2 === 0 ? 0.06 : -0.06));
          const bMat = b % 3 === 0 ? mats.medicineAmber : b % 3 === 1 ? mats.medicineBlue : mats.paperWhite;
          batch.addBox(bMat, 0.12, 0.18 + (b % 2) * 0.06, 0.12, wx, sy + 0.12, wz, ry + b * 0.2, 1, false, true);
        }
      }
    }
    physics.addBoxCenter(x, y + 1.0, z, Math.abs(cs) > 0.5 ? w : 0.55, 2.0, Math.abs(cs) > 0.5 ? 0.55 : w);
  }

  // ===== 1. GRAND LOBBY & RECEPTION HALL (x: -9..+9, z: -16..-6) =====
  // L-shaped Reception Counter facing the main entrance
  batch.addBox(mats.agedWood, 4.6, 1.12, 0.78, 2.4, 0.56, -12.2, 0, 1.6);
  batch.addBox(mats.facadeTrim, 4.72, 0.08, 0.92, 2.4, 1.14, -12.2, 0, 1.6); // stone counter top
  batch.addBox(mats.agedWood, 0.78, 1.12, 2.6, 4.4, 0.56, -13.6, 0, 1.6);
  batch.addBox(mats.glassClear, 4.3, 0.72, 0.04, 2.4, 1.54, -11.84, 0, 1, false, false); // reception sneeze-guard glass
  batch.addBox(mats.plasticBeige, 0.42, 0.36, 0.36, 1.4, 1.36, -12.2, 0.15, 1);
  batch.addBox(mats.crtGlow, 0.32, 0.24, 0.03, 1.44, 1.38, -12.01, 0.15, 1);
  batch.addBox(mats.paperWhite, 0.36, 0.04, 0.28, 3.2, 1.2, -12.1, -0.1, 1); // open visitor registry
  // Warm vintage reception banker's desk lamp
  batch.addCylinder(mats.darkMetal, 0.08, 0.1, 0.04, 8, 3.85, 1.2, -12.25);
  batch.addCylinder(mats.darkMetal, 0.015, 0.015, 0.34, 6, 3.85, 1.38, -12.25);
  batch.addBox(mats.lampWarmEmissive, 0.24, 0.1, 0.14, 3.85, 1.56, -12.22, -0.15, 1, false, false);
  const recLamp = new THREE.PointLight(0xffcb82, 3.4, 7.5, 1.7);
  recLamp.position.set(3.8, 1.48, -12.05);
  group.add(recLamp);
  engine.registerAccentLight(recLamp, { indoorOnly: true, maxDist: 16 });
  physics.addBox(0.0, 0, -12.7, 4.9, 1.8, -11.7);
  physics.addBox(3.9, 0, -15.0, 4.9, 1.8, -12.2);

  // Linked Hospital Waiting Room Bench Seating + Coffee Table & Water Cooler (West side of Lobby)
  for (let row = 0; row < 2; row++) {
    const wz = -9.4 - row * 2.5;
    batch.addBox(mats.darkMetal, 3.2, 0.06, 0.08, -6.2, 0.42, wz, 0, 1);
    for (let c = 0; c < 4; c++) {
      addChair(-7.4 + c * 0.8, 0, wz, 0, mats.paintedMetal);
    }
    physics.addBox(-7.9, 0, wz - 0.35, -4.5, 1.0, wz + 0.35);
  }
  // Low magazine table between waiting rows
  batch.addBox(mats.agedWood, 1.15, 0.05, 0.62, -6.2, 0.44, -10.65, 0, 1.2);
  batch.addBox(mats.paperWhite, 0.24, 0.02, 0.3, -6.35, 0.48, -10.6, 0.22, 1);
  batch.addBox(mats.medicineBlue, 0.24, 0.02, 0.3, -6.0, 0.48, -10.7, -0.35, 1);
  // Hospital water dispenser beside lobby column
  batch.addBox(mats.paintedMetal, 0.42, 0.98, 0.42, -8.4, 0.49, -7.2, 0, 1.2);
  batch.addCylinder(mats.glassClear, 0.16, 0.16, 0.48, 10, -8.4, 1.22, -7.2, 0, 0, 0, false, false);
  addWheelchair(-7.8, 0, -13.8, 0.55);

  // ===== 2. EMERGENCY / TRIAGE BAY (x: -24..-9, z: -16..-6) =====
  addHospitalBed(-20.8, 0, -9.2, Math.PI / 2, 1.0);
  addIVStand(-21.2, 0, -10.5);
  addPrivacyCurtain(-18.6, 0, -9.2, 2.6, Math.PI / 2);

  addHospitalBed(-14.2, 0, -9.2, Math.PI / 2, 1.0);
  addIVStand(-13.8, 0, -10.5);
  addPrivacyCurtain(-12.0, 0, -9.2, 2.6, Math.PI / 2);

  // Red Emergency Crash Cart with Defibrillator
  batch.addBox(mats.ambulanceRed, 0.88, 0.94, 0.56, -16.8, 0.52, -13.6, 0.15, 1.2);
  batch.addBox(mats.stainlessSteel, 0.92, 0.04, 0.6, -16.8, 1.0, -13.6, 0.15, 1);
  batch.addBox(mats.darkMetal, 0.32, 0.26, 0.22, -16.75, 1.15, -13.6, 0.15, 1);
  batch.addBox(mats.crtGlow, 0.18, 0.12, 0.03, -16.73, 1.17, -13.48, 0.15, 1);
  physics.addCircle(-16.8, -13.6, 0.58, 0, 1.4);

  addDeskWithMonitor(-21.6, 0, -14.2, 0.25, true);

  // ===== 3. CENTRAL PHARMACY (x: 9..16.5, z: -16..-6) =====
  // Dispensing counter along Lobby window
  batch.addBox(mats.agedWood, 0.72, 1.02, 4.2, 9.55, 0.51, -10.4, 0, 1.4);
  physics.addBox(9.1, 0, -12.6, 10.0, 1.2, -8.2);
  addMedicineShelf(12.6, 0, -7.2, 0, 3.2);
  addMedicineShelf(15.6, 0, -10.2, Math.PI / 2, 3.0);
  addMedicineShelf(12.6, 0, -13.0, 0, 2.4);
  // Vaccine refrigerator
  batch.addBox(mats.paintedMetal, 0.85, 1.85, 0.76, 15.6, 0.925, -7.0, 0, 1.4);
  batch.addBox(mats.glassClear, 0.66, 1.15, 0.05, 15.6, 1.15, -6.6, 0, 1, false, false);
  physics.addBoxCenter(15.6, 0.9, -7.0, 0.92, 1.9, 0.82);

  // ===== 4. CENTRAL NURSING STATION (x: 16.5..24, z: -16..-6) =====
  batch.addBox(mats.agedWood, 3.8, 1.08, 0.74, 20.2, 0.54, -12.8, 0, 1.6);
  batch.addBox(mats.facadeTrim, 3.9, 0.07, 0.86, 20.2, 1.1, -12.8, 0, 1.6);
  physics.addBox(18.2, 0, -13.3, 22.2, 1.3, -12.3);
  addDeskWithMonitor(20.4, 0, -8.4, Math.PI, true);
  addFilingCabinet(23.1, 0, -8.4, -Math.PI / 2);
  addFilingCabinet(23.1, 0, -9.2, -Math.PI / 2);
  addChair(20.4, 0, -9.6, 0);

  // ===== 5. RADIOLOGY / X-RAY SUITE (x: -24..-12.5, z: -29.5..-19.6) =====
  // Heavy X-Ray Examination Table slightly west so north wall lightboxes are 100% unobstructed!
  batch.addBox(mats.paintedMetal, 0.85, 0.78, 1.2, -19.8, 0.39, -24.8, 0, 1.4);
  batch.addBox(mats.darkMetal, 0.94, 0.1, 2.35, -19.8, 0.84, -24.8, 0, 1.4);
  batch.addBox(mats.leatherDark, 0.84, 0.06, 2.2, -19.8, 0.92, -24.8, 0, 1.2);
  physics.addBoxCenter(-19.8, 0.6, -24.8, 1.1, 1.2, 2.45);

  // Overhead Ceiling-Mounted X-Ray Tube Arm & Collimator aligned over examination table
  batch.addBox(mats.stainlessSteel, 3.6, 0.1, 0.14, -19.8, 3.05, -24.8, 0, 1.5);
  batch.addCylinder(mats.stainlessSteel, 0.09, 0.09, 1.0, 8, -19.8, 2.55, -24.8);
  batch.addCylinder(mats.paintedMetal, 0.22, 0.22, 0.56, 10, -19.8, 2.02, -24.8, 0, 0, Math.PI / 2);
  batch.addBox(mats.darkMetal, 0.26, 0.22, 0.26, -19.8, 1.8, -24.8, 0, 1);

  // Lead-glass Technician Booth corner (NE corner of Radiology)
  batch.addBox(mats.paintedMetal, 2.2, 1.12, 0.14, -14.0, 0.56, -22.2, 0, 1.5);
  batch.addBox(mats.glassFrosted, 2.1, 1.25, 0.06, -14.0, 1.75, -22.2, 0, 1, false, false);
  batch.addBox(mats.darkMetal, 1.4, 0.82, 0.58, -14.0, 0.41, -21.6, 0, 1.2);
  batch.addBox(mats.crtGlow, 0.34, 0.24, 0.04, -14.1, 1.0, -21.65, 0, 1);
  physics.addBox(-15.2, 0, -22.4, -12.8, 2.4, -21.2);

  // GLOWING DOUBLE CHEST X-RAY LIGHTBOX VIEWER ON UNOBSTRUCTED NORTH WALL!
  batch.addBox(mats.darkMetal, 2.95, 1.52, 0.12, -16.4, 1.75, -29.28, 0, 1);
  const xrayPlane1 = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 1.32), mats.xrayLightbox);
  xrayPlane1.position.set(-17.12, 1.75, -29.21);
  group.add(xrayPlane1);
  const xrayPlane2 = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 1.32), mats.xrayLightbox);
  xrayPlane2.position.set(-15.68, 1.75, -29.21);
  group.add(xrayPlane2);
  const xrayGlow = new THREE.PointLight(0x96d4ec, 3.8, 8.5, 1.6);
  xrayGlow.position.set(-16.4, 1.8, -28.2);
  group.add(xrayGlow);
  engine.registerAccentLight(xrayGlow, { indoorOnly: true, maxDist: 18 });

  // ===== 6. PATHOLOGY LABORATORY (x: -12.5..-2.2, z: -29.5..-19.6) =====
  // U-shaped stainless lab benches
  batch.addBox(mats.stainlessSteel, 5.4, 0.08, 0.82, -7.4, 0.9, -28.8, 0, 1.8);
  batch.addBox(mats.paintedMetal, 5.2, 0.86, 0.72, -7.4, 0.43, -28.8, 0, 1.8);
  physics.addBox(-10.2, 0, -29.3, -4.6, 1.2, -28.3);

  // Center island lab bench
  batch.addBox(mats.stainlessSteel, 3.8, 0.08, 1.15, -7.4, 0.9, -24.4, 0, 1.8);
  batch.addBox(mats.paintedMetal, 3.6, 0.86, 1.0, -7.4, 0.43, -24.4, 0, 1.8);
  physics.addBox(-9.4, 0, -25.1, -5.4, 1.2, -23.7);

  // Detailed 3D Optical Microscopes & Specimen Jars on lab island
  for (const mx of [-8.6, -6.4]) {
    batch.addBox(mats.darkMetal, 0.24, 0.05, 0.28, mx, 0.96, -24.4, 0.2, 1);
    batch.addBox(mats.darkMetal, 0.06, 0.34, 0.06, mx, 1.15, -24.5, 0.2, 1);
    batch.addCylinder(mats.stainlessSteel, 0.03, 0.035, 0.24, 8, mx, 1.26, -24.36, -0.35, 0, 0);
  }
  for (let j = 0; j < 6; j++) {
    const jx = -9.4 + j * 0.75;
    batch.addCylinder(mats.glassClear, 0.075, 0.075, 0.22, 8, jx, 1.06, -28.75, 0, 0, 0, false, false);
    batch.addCylinder(mats.darkMetal, 0.08, 0.08, 0.04, 8, jx, 1.18, -28.75);
  }
  addMedicineShelf(-11.8, 0, -24.4, Math.PI / 2, 2.8);

  // ===== 7. INPATIENT WARD A (x: 2.2..15, z: -29.5..-19.6) =====
  // 4 Authentic Patient Beds facing into the ward with bedside tables, headwall gas panels, IV poles, and privacy curtains
  const wardBedXs = [4.6, 7.6, 10.6, 13.4];
  wardBedXs.forEach((bx, idx) => {
    addHospitalBed(bx, 0, -27.8, 0, 1.0);
    // Wall-mounted Hospital Headwall Unit (oxygen/vacuum outlets + reading lamp bar)
    batch.addBox(mats.paintedMetal, 1.15, 0.28, 0.09, bx, 1.52, -29.32, 0, 1.2);
    batch.addBox(mats.crtGlow, 0.24, 0.16, 0.05, bx - 0.34, 1.54, -29.26, 0, 1);
    batch.addCylinder(mats.blanketGreen, 0.025, 0.025, 0.06, 6, bx + 0.15, 1.52, -29.25, Math.PI / 2, 0, 0);
    batch.addCylinder(mats.medicineBlue, 0.025, 0.025, 0.06, 6, bx + 0.32, 1.52, -29.25, Math.PI / 2, 0, 0);
    // Bedside cabinet
    batch.addBox(mats.paintedMetal, 0.46, 0.72, 0.44, bx + 0.82, 0.36, -28.5, 0, 1.2);
    if (idx % 2 === 0) addIVStand(bx - 0.72, 0, -28.3);
    if (idx < 3) addPrivacyCurtain(bx + 1.5, 0, -27.4, 2.4, Math.PI / 2);
  });
  addWheelchair(4.2, 0, -21.6, -0.8);

  // ===== 8. ISOLATION ROOM 204 — NURSE NADA'S DUTY STATION (x: 15..24, z: -29.5..-19.6) =====
  addHospitalBed(21.4, 0, -26.8, -Math.PI / 2, 1.0);
  addIVStand(21.8, 0, -25.4);
  addDeskWithMonitor(17.4, 0, -26.4, Math.PI / 2, true);
  addChair(18.5, 0, -26.4, -Math.PI / 2);
  addFilingCabinet(22.8, 0, -21.2, Math.PI);

  // ===== 9. SCRUB & STERILE PREP ROOM (x: -10.5..-2.2, z: -42..-29.5) =====
  // 3 Stainless Surgical Scrub Basins along north wall of Scrub bay (east of stairwell)
  for (let i = 0; i < 3; i++) {
    const sx = -5.6 + i * 1.15;
    batch.addBox(mats.stainlessSteel, 0.88, 0.32, 0.56, sx, 0.86, -30.05, 0, 1.2);
    batch.addCylinder(mats.stainlessSteel, 0.02, 0.02, 0.32, 6, sx, 1.14, -29.88);
    batch.addBox(mats.glassFrosted, 0.72, 0.88, 0.04, sx, 1.68, -29.68, 0, 1, false, false);
  }
  physics.addBox(-6.2, 0, -30.5, -2.6, 1.2, -29.6);
  // Sterile gown lockers along east wall
  batch.addBox(mats.paintedMetal, 0.58, 2.0, 2.2, -2.7, 1.0, -38.0, 0, 1.6);
  physics.addBox(-3.1, 0, -39.2, -2.3, 2.0, -36.8);

  // ===== 10. OPERATING THEATRE (x: -24..-10.5, z: -42..-29.5) =====
  // Centerpiece Hydraulic Articulated Surgical Operating Table + Sterile Surgical Green Drape
  const ox = -17.2;
  const oz = -35.8;
  batch.addBox(mats.stainlessSteel, 0.95, 0.14, 1.1, ox, 0.07, oz, 0, 1.2);
  batch.addCylinder(mats.stainlessSteel, 0.22, 0.26, 0.72, 10, ox, 0.46, oz);
  batch.addBox(mats.darkMetal, 0.76, 0.1, 2.15, ox, 0.88, oz, 0, 1.4);
  batch.addBox(mats.leatherDark, 0.70, 0.08, 2.04, ox, 0.97, oz, 0, 1.2);
  batch.addBox(mats.blanketGreen, 0.74, 0.03, 1.25, ox, 1.02, oz + 0.22, 0, 1.2);
  // Side armboards
  batch.addBox(mats.leatherDark, 0.65, 0.05, 0.22, ox - 0.62, 0.95, oz - 0.25, 0.15, 1);
  batch.addBox(mats.leatherDark, 0.65, 0.05, 0.22, ox + 0.62, 0.95, oz - 0.25, -0.15, 1);
  physics.addBoxCenter(ox, 0.6, oz, 1.4, 1.2, 2.3);

  // Overhead Articulated Multi-Reflector Shadowless Surgical Boom Lamp + Focused Clinical Light
  batch.addCylinder(mats.stainlessSteel, 0.12, 0.12, 0.65, 10, ox, 2.86, oz);
  batch.addBox(mats.stainlessSteel, 1.35, 0.09, 0.09, ox + 0.52, 2.58, oz, 0.2, 1);
  batch.addCylinder(mats.paintedMetal, 0.54, 0.62, 0.18, 14, ox, 2.24, oz);
  const surgLens = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.48, 0.05, 14), mats.lampColdEmissive);
  surgLens.position.set(ox, 2.14, oz);
  group.add(surgLens);
  const surgTableLight = new THREE.PointLight(0xdaf6f0, 5.4, 9.5, 1.55);
  surgTableLight.position.set(ox, 2.0, oz);
  group.add(surgTableLight);
  engine.registerAccentLight(surgTableLight, { indoorOnly: true, maxDist: 18 });

  // Anesthesia Ventilator Machine & Dual Oxygen Cylinders
  batch.addBox(mats.paintedMetal, 0.92, 1.38, 0.66, ox - 2.2, 0.69, oz - 1.4, 0.32, 1.4);
  batch.addBox(mats.crtGlow, 0.42, 0.3, 0.04, ox - 2.02, 1.56, oz - 1.22, 0.32, 1);
  batch.addCylinder(mats.blanketGreen, 0.11, 0.11, 1.18, 10, ox - 2.85, 0.59, oz - 1.55);
  batch.addCylinder(mats.medicineBlue, 0.11, 0.11, 1.18, 10, ox - 2.6, 0.59, oz - 1.72);
  addIVStand(ox + 1.35, 0, oz - 1.3);
  physics.addCircle(ox - 2.3, oz - 1.4, 0.72, 0, 1.8);

  // Stainless Mayo Surgical Instrument Tray & Sterile Supply Cabinets
  batch.addBox(mats.stainlessSteel, 0.78, 0.04, 0.54, ox + 1.55, 0.94, oz + 0.5, -0.25, 1);
  batch.addCylinder(mats.stainlessSteel, 0.025, 0.025, 0.94, 6, ox + 1.55, 0.47, oz + 0.5);
  batch.addBox(mats.stainlessSteel, 0.52, 0.03, 0.36, ox + 1.55, 0.98, oz + 0.5, -0.25, 1);
  physics.addCircle(ox + 1.55, oz + 0.5, 0.42, 0, 1.2);
  addMedicineShelf(-23.0, 0, -35.8, Math.PI / 2, 3.6);

  // ===== 11. MORGUE & COLD STORAGE (x: 2.2..14.5, z: -42..-29.5) =====
  // 6-Compartment Stainless Steel Body Cold-Storage Refrigerator Bank along North Wall (z = -41.1)
  batch.addBox(mats.stainlessSteel, 6.2, 2.55, 1.35, 8.4, 1.275, -40.9, 0, 1.8);
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const dx = 6.35 + col * 2.05;
      const dy = 0.68 + row * 1.12;
      const isPulled = row === 0 && col === 1;
      if (isPulled) {
        // Open dark compartment + pulled-out stainless steel gurney tray!
        batch.addBox(mats.darkMetal, 1.65, 0.88, 0.15, dx, dy, -40.28, 0, 1);
        batch.addBox(mats.stainlessSteel, 0.92, 0.07, 2.05, dx, dy - 0.22, -39.25, 0, 1.4);
        batch.addBox(mats.fabricSheet, 0.82, 0.14, 1.72, dx, dy - 0.11, -39.25, 0, 1.4);
        physics.addBoxCenter(dx, 0.5, -39.25, 1.0, 1.0, 2.1);
      } else {
        batch.addBox(mats.rustedMetal, 1.72, 0.92, 0.12, dx, dy, -40.18, 0, 1.4);
        batch.addBox(mats.stainlessSteel, 0.36, 0.06, 0.09, dx + 0.58, dy, -40.1, 0, 1); // chrome latch handle
        batch.addBox(mats.paperWhite, 0.24, 0.12, 0.02, dx - 0.45, dy + 0.22, -40.11, 0, 1); // compartment tag
      }
    }
  }
  physics.addBox(5.1, 0, -41.7, 11.7, 2.6, -40.05);

  // Central Stainless Autopsy Table with Drain Trough & Overhead Chrome Water Hose Arm
  const mx = 8.4;
  const mz = -34.6;
  batch.addBox(mats.stainlessSteel, 0.72, 0.86, 1.1, mx, 0.43, mz, 0, 1.4);
  batch.addBox(mats.stainlessSteel, 0.98, 0.1, 2.38, mx, 0.91, mz, 0, 1.4);
  batch.addBox(mats.stainlessSteel, 0.98, 0.04, 0.05, mx, 0.98, mz - 1.16, 0, 1); // raised surgical rim
  batch.addBox(mats.stainlessSteel, 0.98, 0.04, 0.05, mx, 0.98, mz + 1.16, 0, 1);
  batch.addCylinder(mats.stainlessSteel, 0.03, 0.03, 1.45, 8, mx, 2.48, mz - 0.95); // overhead water supply pipe
  batch.addCylinder(mats.stainlessSteel, 0.025, 0.025, 0.45, 8, mx, 1.78, mz - 0.72, Math.PI / 2, 0, 0);
  batch.addBox(mats.darkMetal, 0.42, 0.02, 0.42, mx, 0.015, mz + 1.45, 0, 1, false, true); // floor drain grate
  physics.addBoxCenter(mx, 0.6, mz, 1.05, 1.2, 2.45);
  // Cold steel accent glow illuminating the autopsy table & morgue fridge chrome
  const morgueGlow = new THREE.PointLight(0x98c4dc, 3.8, 10.5, 1.55);
  morgueGlow.position.set(mx, 2.35, mz - 2.4);
  group.add(morgueGlow);
  engine.registerAccentLight(morgueGlow, { indoorOnly: true, maxDist: 18 });
  // Instrument trolley beside autopsy table
  batch.addBox(mats.stainlessSteel, 0.76, 0.04, 0.52, mx + 1.8, 0.86, mz, 0.12, 1);
  batch.addBox(mats.stainlessSteel, 0.76, 0.04, 0.52, mx + 1.8, 0.32, mz, 0.12, 1);
  for (const [lx, lz] of [[-0.34, -0.22], [0.34, -0.22], [-0.34, 0.22], [0.34, 0.22]]) {
    batch.addBox(mats.stainlessSteel, 0.04, 0.88, 0.04, mx + 1.8 + lx, 0.44, mz + lz, 0, 1);
  }
  physics.addCircle(mx + 1.8, mz, 0.52, 0, 1.1);

  // ===== 12. DIRECTOR'S OFFICE & ARCHIVE (x: 14.5..24, z: -42..-29.5) =====
  addDeskWithMonitor(19.2, 0, -37.2, 0, true);
  addChair(19.2, 0, -38.4, 0, mats.leatherDark);
  addChair(18.4, 0, -35.6, Math.PI, mats.leatherDark);
  addChair(20.0, 0, -35.6, Math.PI, mats.leatherDark);
  for (let i = 0; i < 4; i++) {
    addFilingCabinet(23.1, 0, -33.2 - i * 1.1, -Math.PI / 2);
  }
  addMedicineShelf(15.3, 0, -37.5, Math.PI / 2, 3.6);

  // ===== 13. FLOOR 2 — PEDIATRIC WARD (x: -10.5..2.2, z: -29.5..-19.6) =====
  addHospitalBed(-7.8, FLOOR2_Y, -22.2, Math.PI, 0.82);
  addHospitalBed(-4.2, FLOOR2_Y, -22.2, Math.PI, 0.82);
  addHospitalBed(-0.6, FLOOR2_Y, -22.2, Math.PI, 0.82);
  // Vintage wooden child crib
  batch.addBox(mats.agedWood, 1.25, 0.08, 0.72, -7.8, FLOOR2_Y + 0.48, -26.8, 0.12, 1.2);
  batch.addBox(mats.fabricSheet, 1.16, 0.1, 0.64, -7.8, FLOOR2_Y + 0.57, -26.8, 0.12, 1.2);
  for (let b = -3; b <= 3; b++) {
    batch.addBox(mats.agedWood, 0.035, 0.62, 0.035, -7.8 + b * 0.18, FLOOR2_Y + 0.82, -26.46, 0, 1);
    batch.addBox(mats.agedWood, 0.035, 0.62, 0.035, -7.8 + b * 0.18, FLOOR2_Y + 0.82, -27.14, 0, 1);
  }
  physics.addBoxCenter(-7.8, FLOOR2_Y + 0.6, -26.8, 1.35, 1.2, 0.85);

  // ===== 14. FLOOR 2 — ROOM 312 (NURSE NADA'S FINAL ARCHIVE) (x: 2.2..14.5, z: -29.5..-19.6) =====
  addHospitalBed(12.2, FLOOR2_Y, -22.2, -Math.PI / 2, 1.0);
  addDeskWithMonitor(7.4, FLOOR2_Y, -22.2, Math.PI, true);
  addChair(7.4, FLOOR2_Y, -23.4, 0, mats.leatherDark);
  addFilingCabinet(3.1, FLOOR2_Y, -22.5, Math.PI / 2);
  addFilingCabinet(3.1, FLOOR2_Y, -23.5, Math.PI / 2);
  addMedicineShelf(13.6, FLOOR2_Y, -26.2, -Math.PI / 2, 2.6);

  // Flush all batched furniture geometry into minimal draw calls!
  batch.flush(group);

  // ===== 15. INTERACTIVE GOLDEN STORY CLUES (CASSETTES & ARCHIVE DOSSIERS) =====
  const clueObjects = [];
  const clueDefs = [
    {
      id: 'clue_road',
      x: 1.8, y: 1.15, z: 27.5,
      title: 'بطاقة دخول ممرضة (١٩٩٤)',
      subtitle: 'بطاقة ندى ملقاة قرب لافتة العزل...',
    },
    {
      id: 'clue_reception',
      x: 3.1, y: 1.25, z: -12.1,
      title: 'سجل المناوبة الليلية — ١٢ أكتوبر ١٩٩٤',
      subtitle: 'سجل الاستقبال ما زال مفتوحًا على ليلة الإخلاء.',
    },
    {
      id: 'clue_radiology',
      x: -14.2, y: 0.92, z: -21.5,
      title: 'تقرير الأشعة — الحالة رقم ١٧',
      subtitle: 'ملاحظات الطبيب المناوب بجوار شاشة الأشعة.',
    },
    {
      id: 'clue_isolation',
      x: 17.5, y: 0.86, z: -26.4,
      title: 'شريط كاسيت #١ — صوت ندى',
      subtitle: 'شريط تسجيل تركته ندى في غرفة العزل ٢٠٤.',
    },
    {
      id: 'clue_morgue',
      x: 10.2, y: 0.95, z: -34.6,
      title: 'بلاغ المشرحة المختوم',
      subtitle: 'ورقة جرد رسمية فوق طاولة الأدوات في المشرحة.',
    },
    {
      id: 'clue_room312',
      x: 7.5, y: FLOOR2_Y + 0.86, z: -22.2,
      title: 'الشريط الأخير — حقيقة مستشفى السدرة',
      subtitle: 'الملف الكامل لحادثة ١٩٩٤ في الغرفة ٣١٢.',
    },
  ];

  const clueGeo = new THREE.BoxGeometry(0.28, 0.08, 0.2);
  clueDefs.forEach((cd) => {
    const m = new THREE.Mesh(clueGeo, mats.clueGold);
    m.position.set(cd.x, cd.y, cd.z);
    m.rotation.y = 0.35;
    group.add(m);
    clueObjects.push({ ...cd, mesh: m });
  });

  return { clueObjects };
}
