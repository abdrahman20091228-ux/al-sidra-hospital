import * as THREE from 'three';
import { GeometryBatcher } from '../core/geometry.js';
import { FLOOR2_Y, WALL_H } from '../core/config.js';
import { HOSPITAL_BOUNDS } from './layout.js';
import { createRng, randRange } from '../utils/math.js';

/**
 * COMPLETELY REDESIGNED ABANDONED SILENT-HILL HOSPITAL EXTERIOR:
 * - NO AMBULANCE! NO WORKING LIGHTS!
 * - Dramatic U-shaped asymmetric abandoned sanatorium silhouette with projecting East/West wings
 * - Crumbling stone & rusted wrought-iron perimeter fence with collapsed gap & crooked sagging double gates
 * - Boarded-up & shattered dark windows, creeping overgrown ivy vines, crooked hanging rusted sign
 * - Concrete rubble piles, rusted barrels, overturned wheelchair, collapsed hospital gurney outside entrance
 */
export function buildHospitalExterior(engine, mats, physics) {
  const group = engine.zones.exterior;
  const batch = new GeometryBatcher();
  const rng = createRng(199401);

  // ===== 1. CRACKED OVERGROWN ASPHALT FORECOURT & BROKEN CURBS =====
  batch.addBox(mats.asphalt, 56, 0.14, 20, 0, -0.07, 0, 0, 3.8, false, true);
  // Broken concrete entry sidewalk slabs (slightly uneven/cracked)
  batch.addBox(mats.facadeTrim, 22, 0.14, 2.8, -12.5, 0.02, -4.6, 0, 2.2, false, true);
  batch.addBox(mats.facadeTrim, 22, 0.14, 2.8, 12.5, 0.02, -4.6, 0, 2.2, false, true);
  batch.addBox(mats.facadeConcrete, 5.2, 0.14, 2.9, 0, 0.02, -4.6, 0.02, 2.2, false, true);

  // ===== 2. CRUMBLING STONE & RUSTED WROUGHT-IRON PERIMETER FENCE (z = 8.6) =====
  const fenceZ = 8.6;
  // West wall intact with creeping ivy; East wall has a collapsed crumbled breach!
  batch.addBox(mats.facadeConcrete, 21.5, 0.96, 0.48, -14.15, 0.48, fenceZ, 0, 2.2);
  batch.addBox(mats.facadeTrim, 21.6, 0.14, 0.58, -14.15, 1.0, fenceZ, 0, 2.2);

  batch.addBox(mats.facadeConcrete, 8.2, 0.96, 0.48, 7.6, 0.48, fenceZ, 0, 2.2);
  batch.addBox(mats.facadeTrim, 8.3, 0.14, 0.58, 7.6, 1.0, fenceZ, 0, 2.2);
  // Crumbled lower section on far east
  batch.addBox(mats.facadeConcrete, 9.6, 0.45, 0.5, 19.6, 0.22, fenceZ, 0, 2.2);

  // Side perimeter stone walls
  batch.addBox(mats.facadeConcrete, 0.48, 2.4, 15.0, -25.2, 1.2, 1.1, 0, 2.2);
  batch.addBox(mats.facadeConcrete, 0.48, 2.4, 15.0, 25.2, 1.2, 1.1, 0, 2.2);

  physics.addBox(-25.6, 0, fenceZ - 0.35, -3.5, 3.0, fenceZ + 0.35);
  physics.addBox(3.5, 0, fenceZ - 0.35, 25.6, 3.0, fenceZ + 0.35);
  physics.addBox(-25.6, 0, -6.5, -24.8, 3.0, fenceZ + 0.4);
  physics.addBox(24.8, 0, -6.5, 25.6, 3.0, fenceZ + 0.4);

  // Rusted iron fence pickets (some bent/missing!)
  for (const side of [-1, 1]) {
    const startX = side * 3.8;
    const endX = side * 24.4;
    const midX = (startX + endX) * 0.5;
    const span = Math.abs(endX - startX);
    batch.addBox(mats.ironFence, span, 0.06, 0.06, midX, 2.36, fenceZ, 0, 2, false, false);
    batch.addBox(mats.ironFence, span, 0.06, 0.06, midX, 1.24, fenceZ, 0, 2, false, false);
    for (let x = Math.min(startX, endX); x <= Math.max(startX, endX); x += 0.56) {
      if (x > 12.2 && x < 16.5) continue; // broken missing pickets at breach
      const bend = rng() < 0.2 ? randRange(rng, -0.14, 0.14) : 0;
      batch.addBox(mats.ironFence, 0.042, 1.5, 0.042, x, 1.74, fenceZ, 0, 1, false, false, bend, bend * 0.7);
    }
    for (let px = 3.5; px <= 24.5; px += 7.0) {
      const gx = side * px;
      batch.addBox(mats.facadeConcrete, 0.78, 2.78, 0.78, gx, 1.39, fenceZ, 0, 1.9);
      batch.addBox(mats.facadeTrim, 0.92, 0.16, 0.92, gx, 2.84, fenceZ, 0, 1.9);
      // Dead shattered lamp pedestal on gate pillars (NO GLOW!)
      if (px === 3.5) {
        batch.addCylinder(mats.rustedMetal, 0.14, 0.18, 0.18, 8, gx, 3.0, fenceZ);
        batch.addBox(mats.darkMetal, 0.24, 0.3, 0.24, gx, 3.22, fenceZ, 0.15, 1);
      }
    }
  }

  // Crooked, rusted wrought-iron barred double gates hanging slightly off-hinge!
  function addGateLeaf(pivotX, angle, sag = 0) {
    const w = 3.1;
    const cs = Math.cos(angle);
    const sn = Math.sin(angle);
    const localToW = (d) => [pivotX + sn * d, fenceZ - cs * d];
    const [mx, mz] = localToW(w * 0.5);
    batch.addBox(mats.ironFence, 0.08, 0.09, w, mx, 2.18 + sag, mz, angle, 2, true, true, sag * 0.3, 0);
    batch.addBox(mats.ironFence, 0.07, 0.07, w, mx, 1.2 + sag * 0.6, mz, angle, 2);
    batch.addBox(mats.ironFence, 0.08, 0.09, w, mx, 0.24, mz, angle, 2);
    for (let p = 0; p <= 8; p++) {
      const [px, pz] = localToW((p / 8) * w);
      batch.addBox(mats.ironFence, p === 0 || p === 8 ? 0.09 : 0.042, 2.04, 0.045, px, 1.22 + sag * (p / 8), pz, angle, 1, false, false);
    }
  }
  addGateLeaf(-3.3, 0.34, -0.08);
  addGateLeaf(3.3, -0.46, -0.14);

  // ===== 3. DRAMATIC U-SHAPED ABANDONED SANATORIUM ARCHITECTURE (PROJECTING SIDE WINGS + DECAYING PORTICO!) =====
  // Projecting architectural side pilasters/buttresses along front facade so it NEVER looks like a flat box!
  for (const bx of [-23.6, -15.6, -8.8, 8.8, 15.6, 23.6]) {
    batch.addBox(mats.facadeConcrete, 1.15, FLOOR2_Y + WALL_H + 0.6, 1.15, bx, (FLOOR2_Y + WALL_H + 0.6) * 0.5, -5.65, 0, 2.4);
  }
  // Projecting weathered corner wing extensions framing the entrance courtyard (X: -24..-17 and +17..+24, Z: -6..-2.8)
  for (const side of [-1, 1]) {
    const wx = side * 20.4;
    batch.addBox(mats.facadeConcrete, 7.2, FLOOR2_Y + WALL_H + 0.3, 3.2, wx, (FLOOR2_Y + WALL_H + 0.3) * 0.5, -4.4, 0, 2.6);
    batch.addBox(mats.facadeTrim, 7.5, 0.32, 3.5, wx, FLOOR2_Y - 0.08, -4.4, 0, 2.6);
    batch.addBox(mats.facadeTrim, 7.6, 0.36, 3.6, wx, FLOOR2_Y + WALL_H + 0.35, -4.4, 0, 2.6);
    physics.addBox(wx - 3.6, 0, -6.0, wx + 3.6, 4.0, -2.8);
    // Boarded-up dark ground & 2nd floor windows on the projecting wings
    for (const wy of [1.75, FLOOR2_Y + 1.75]) {
      batch.addBox(mats.darkMetal, 2.6, 1.5, 0.14, wx, wy, -2.75, 0, 1);
      batch.addBox(mats.glassFrosted, 2.4, 1.3, 0.05, wx, wy, -2.72, 0, 1, false, false);
      // Nailed crooked wooden boarding planks across abandoned windows!
      batch.addBox(mats.boardWood, 2.9, 0.24, 0.06, wx, wy + 0.28, -2.65, 0, 1.4, true, true, 0, 0.08 * side);
      batch.addBox(mats.boardWood, 2.9, 0.24, 0.06, wx, wy - 0.26, -2.64, 0, 1.4, true, true, 0, -0.06 * side);
    }
  }

  // Cracked & sagging concrete entrance portico canopy
  batch.addBox(mats.facadeConcrete, 10.6, 0.52, 5.2, 0, 3.72, -3.4, 0, 2.5);
  batch.addBox(mats.facadeTrim, 10.9, 0.2, 5.5, 0, 4.04, -3.4, 0, 2.5);
  // Dead rusted dark canopy light fixture (OFF!)
  batch.addBox(mats.rustedMetal, 1.9, 0.12, 0.42, 0, 3.42, -3.3, 0, 1, true, true, 0.14, 0.08);

  // 4 Heavy Concrete Portico Columns with cracked plinth bases
  for (const [cx, cz] of [[-4.7, -1.1], [4.7, -1.1], [-4.7, -4.8], [4.7, -4.8]]) {
    batch.addBox(mats.facadeConcrete, 0.64, 3.55, 0.64, cx, 1.775, cz, 0, 2.0);
    batch.addBox(mats.facadeTrim, 0.84, 0.28, 0.84, cx, 0.14, cz, 0, 1.8);
    physics.addBoxCenter(cx, 1.8, cz, 0.74, 3.6, 0.74);
  }

  // CROOKED HANGING RUSTED HOSPITAL SIGN (snapped right bracket — tilted eerily at -9 deg!)
  const facadeSign = new THREE.Mesh(new THREE.BoxGeometry(9.2, 2.15, 0.16), mats.makeHospitalFacadeSign());
  facadeSign.position.set(0.2, 5.45, -5.55);
  facadeSign.rotation.z = -0.14;
  facadeSign.rotation.y = 0.03;
  facadeSign.castShadow = true;
  group.add(facadeSign);
  // Snapped steel mounting chains/brackets above sign
  batch.addBox(mats.rustedMetal, 0.08, 0.9, 0.08, -3.5, 6.65, -5.6, 0, 1);
  batch.addBox(mats.rustedMetal, 0.08, 0.5, 0.08, 3.6, 6.2, -5.6, 0, 1, true, true, 0, 0.35);

  // ===== 4. SECOND-STORY SHELL, BOARDED WINDOWS, ROOFTOP DECAY & OVERGROWN IVY =====
  const { xMin, xMax, zFront, zBack } = HOSPITAL_BOUNDS;
  const bw = xMax - xMin;
  const bd = zFront - zBack;
  const cx = (xMin + xMax) * 0.5;
  const cz = (zFront + zBack) * 0.5;
  const upperY = FLOOR2_Y + WALL_H * 0.5;
  const upperH = WALL_H + 0.55;

  batch.addBox(mats.facadeTrim, bw + 0.7, 0.34, bd + 0.7, cx, FLOOR2_Y - 0.1, cz, 0, 3.0);
  batch.addBox(mats.facadeConcrete, bw, upperH, 0.45, cx, upperY, zFront, 0, 2.8);
  batch.addBox(mats.facadeConcrete, bw, upperH, 0.45, cx, upperY, zBack, 0, 2.8);
  batch.addBox(mats.facadeConcrete, 0.45, upperH, bd, xMin, upperY, cz, 0, 2.8);
  batch.addBox(mats.facadeConcrete, 0.45, upperH, bd, xMax, upperY, cz, 0, 2.8);
  const roofY = FLOOR2_Y + WALL_H + 0.45;
  batch.addBox(mats.facadeTrim, bw + 0.9, 0.46, bd + 0.9, cx, roofY, cz, 0, 3.2);

  // Upper Floor Recessed Boarded/Shattered Windows
  [-12.2, -6.4, 6.4, 12.2].forEach((wx, idx) => {
    const wy = FLOOR2_Y + 1.75;
    batch.addBox(mats.darkMetal, 2.7, 1.55, 0.14, wx, wy, zFront + 0.24, 0, 1);
    batch.addBox(mats.glassFrosted, 2.45, 1.32, 0.06, wx, wy, zFront + 0.28, 0, 1, false, false);
    batch.addBox(mats.facadeTrim, 2.95, 0.16, 0.28, wx, wy - 0.84, zFront + 0.28, 0, 1.5);
    if (idx % 2 === 0) {
      batch.addBox(mats.boardWood, 2.9, 0.22, 0.06, wx, wy + 0.2, zFront + 0.34, 0, 1.4, true, true, 0, 0.1);
      batch.addBox(mats.boardWood, 2.9, 0.22, 0.06, wx, wy - 0.24, zFront + 0.35, 0, 1.4, true, true, 0, -0.08);
    }
  });
  // Boarded ground floor windows flanking main doors
  for (const wx of [-12.2, -5.8, 5.8, 12.2]) {
    batch.addBox(mats.boardWood, 3.1, 0.22, 0.06, wx, 1.55, zFront + 0.28, 0, 1.4, true, true, 0, wx < 0 ? 0.07 : -0.09);
    batch.addBox(mats.boardWood, 3.1, 0.22, 0.06, wx, 2.02, zFront + 0.29, 0, 1.4, true, true, 0, wx < 0 ? -0.06 : 0.08);
  }

  // Overgrown dark creeping ivy cascading down facade, columns & perimeter wall
  const ivySpots = [
    { x: -16.8, y: 4.5, z: -2.7, w: 3.4, h: 4.4 },
    { x: 17.5, y: 3.8, z: -2.7, w: 3.2, h: 4.2 },
    { x: -9.5, y: 4.9, z: -5.65, w: 3.0, h: 3.8 },
    { x: 9.8, y: 5.2, z: -5.65, w: 3.2, h: 4.0 },
    { x: -10.5, y: 1.4, z: 8.9, w: 3.8, h: 2.2 },
    { x: 7.4, y: 1.3, z: 8.9, w: 3.2, h: 2.0 },
  ];
  ivySpots.forEach((iv) => {
    batch.addPlane(mats.decalIvy, iv.w, iv.h, iv.x, iv.y, iv.z, 0, 0, 0, 0, false, true);
  });

  // Rusted vertical rainwater drainpipes down facade pilasters
  for (const px of [-16.2, -9.4, 9.4, 16.2]) {
    batch.addCylinder(mats.rustedMetal, 0.08, 0.08, FLOOR2_Y + WALL_H, 8, px, (FLOOR2_Y + WALL_H) * 0.5, -5.05);
  }

  // Rooftop mechanical shack, rusted water tank on steel stilts, & bent communications tower
  batch.addBox(mats.facadeConcrete, 8.2, 2.5, 5.8, -11.5, roofY + 1.25, -16, 0, 2.6, false, false);
  batch.addCylinder(mats.rustedMetal, 1.55, 1.55, 2.5, 12, 11.2, roofY + 2.4, -14, 0, 0, 0, false, false);
  for (const [lx, lz] of [[-1.0, -1.0], [1.0, -1.0], [-1.0, 1.0], [1.0, 1.0]]) {
    batch.addBox(mats.rustedMetal, 0.14, 1.4, 0.14, 11.2 + lx, roofY + 0.7, -14 + lz, 0, 1, false, false);
  }
  batch.addCylinder(mats.darkMetal, 0.05, 0.09, 6.2, 6, -11.5, roofY + 5.2, -16, 0.12, 0, -0.08, false, false);

  // ===== 5. COURTYARD ABANDONMENT CLUTTER (NO AMBULANCE — PURE SILENT HILL DECAY!) =====
  // Collapsed concrete rubble & fallen masonry chunks
  const rubbleCoords = [
    [-6.2, 2.4, 0.65], [-5.5, 2.8, 0.42], [14.2, 7.6, 0.72], [15.1, 7.1, 0.5],
    [13.4, 8.2, 0.46], [5.8, -1.6, 0.48], [-5.2, -2.2, 0.38], [8.8, 4.4, 0.52],
  ];
  rubbleCoords.forEach(([rx, rz, rs]) => {
    batch.addBox(mats.facadeConcrete, rs, rs * 0.52, rs * 0.85, rx, rs * 0.25, rz, randRange(rng, 0, 3), 1.4, true, true, randRange(rng, -0.2, 0.2), randRange(rng, -0.2, 0.2));
  });

  // Rusted metal biohazard/oil drums clustered near West wing wall
  [[-15.2, 1.4], [-14.3, 1.9], [-14.8, 0.6]].forEach(([dx, dz], i) => {
    if (i === 2) {
      batch.addCylinder(mats.redRustMetal, 0.32, 0.32, 0.94, 10, dx, 0.32, dz, Math.PI / 2, 0.7, 0);
    } else {
      batch.addCylinder(mats.rustedMetal, 0.32, 0.32, 0.94, 10, dx, 0.47, dz);
    }
    physics.addCircle(dx, dz, 0.42, 0, 1.2);
  });

  // Abandoned rusted gurney tilted outside the portico entrance!
  batch.addBox(mats.rustedMetal, 0.72, 0.06, 1.85, -7.8, 0.54, 0.8, 0.48, 1.4, true, true, 0.08, 0.12);
  batch.addBox(mats.fabricSheet, 0.64, 0.12, 1.72, -7.8, 0.63, 0.8, 0.48, 1.4, true, true, 0.08, 0.12);
  batch.addBox(mats.darkMetal, 0.06, 0.54, 0.06, -8.2, 0.26, 0.2, 0, 1);
  batch.addBox(mats.darkMetal, 0.06, 0.54, 0.06, -7.4, 0.26, 1.4, 0, 1);
  physics.addCircle(-7.8, 0.8, 0.85, 0, 1.2);

  // Overturned rusted wheelchair lying on its side near East gate pillar
  batch.addBox(mats.leatherDark, 0.48, 0.06, 0.46, 6.2, 0.26, 4.2, 0.6, 1, true, true, 0, 1.42);
  batch.addCylinder(mats.rubberTire, 0.3, 0.3, 0.05, 10, 6.25, 0.32, 4.2, 0, 0.6, 0.15);
  physics.addCircle(6.2, 4.2, 0.5, 0, 0.8);

  batch.flush(group);

  // ===== 6. DESOLATE NIGHT SKY & FAINT VEILED MOON (FOLLOWS CAMERA) =====
  const skyGroup = new THREE.Group();
  const skyGeo = new THREE.SphereGeometry(210, 20, 14);
  const skyMat = new THREE.MeshBasicMaterial({ color: 0x04070d, side: THREE.BackSide, fog: false });
  skyGroup.add(new THREE.Mesh(skyGeo, skyMat));

  const moonSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: mats.makeMoonTexture(), transparent: true, opacity: 0.78, fog: false })
  );
  moonSprite.scale.set(14, 14, 1);
  moonSprite.position.set(-46, 64, -148);
  skyGroup.add(moonSprite);

  const moonHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: mats.makeGlowTexture(),
      color: 0x5c76a0,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    })
  );
  moonHalo.scale.set(40, 40, 1);
  moonHalo.position.copy(moonSprite.position);
  skyGroup.add(moonHalo);

  const starCount = 180;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const a = (i * 2.39996) % (Math.PI * 2);
    const el = 0.18 + (((i * 17) % 100) / 100) * 1.12;
    const r = 185;
    starPos[i * 3] = Math.cos(a) * Math.cos(el) * r;
    starPos[i * 3 + 1] = Math.sin(el) * r;
    starPos[i * 3 + 2] = Math.sin(a) * Math.cos(el) * r;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  skyGroup.add(
    new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0x8ea2c0, size: 1.0, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.45 })
    )
  );
  group.add(skyGroup);
  engine.skyDome = skyGroup;
}
