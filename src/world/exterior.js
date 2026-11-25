import * as THREE from 'three';
import { GeometryBatcher } from '../core/geometry.js';
import { FLOOR2_Y, WALL_H } from '../core/config.js';
import { HOSPITAL_BOUNDS } from './layout.js';

/**
 * Builds Act 3: Hospital Courtyard, Iron Perimeter Fence & Open Gate,
 * Covered Ambulance Bay / Porte-Cochère, Detailed Abandoned 3D Ambulance,
 * 2-Story Architectural Hospital Upper Facade & Rooftop Equipment, and Night Sky.
 */
export function buildHospitalExterior(engine, mats, physics) {
  const group = engine.zones.exterior;
  const batch = new GeometryBatcher();

  // ===== 1. CRACKED ASPHALT COURTYARD & AMBULANCE DRIVEWAY =====
  batch.addBox(mats.asphalt, 56, 0.12, 20, 0, -0.06, 0, 0, 4.5, false, true);
  // Concrete sidewalk apron wrapping the hospital entrance
  batch.addBox(mats.facadeTrim, 49, 0.14, 3.2, 0, 0.02, -4.4, 0, 2.4, false, true);

  // Subtle painted yellow/white faded ambulance parking bay lines
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xb8a862, roughness: 0.85, metalness: 0.05 });
  batch.addPlane(stripeMat, 0.14, 7.2, -9.2, 0.015, 1.5, -Math.PI / 2, 0, 0, 0, false, true);
  batch.addPlane(stripeMat, 0.14, 7.2, -14.8, 0.015, 1.5, -Math.PI / 2, 0, 0, 0, false, true);
  batch.addPlane(stripeMat, 5.7, 0.14, -12.0, 0.015, -2.05, -Math.PI / 2, 0, 0, 0, false, true);

  // ===== 2. STONE & WROUGHT-IRON PERIMETER FENCE (z = +8.5) WITH OPEN DOUBLE GATE =====
  const fenceZ = 8.6;
  // Stone base wall left & right of gate opening (gate spans x in [-3.4, +3.4])
  batch.addBox(mats.facadeConcrete, 21.5, 0.95, 0.45, -14.15, 0.475, fenceZ, 0, 2.4);
  batch.addBox(mats.facadeConcrete, 21.5, 0.95, 0.45, 14.15, 0.475, fenceZ, 0, 2.4);
  // Concrete coping cap
  batch.addBox(mats.facadeTrim, 21.6, 0.12, 0.56, -14.15, 0.98, fenceZ, 0, 2.4);
  batch.addBox(mats.facadeTrim, 21.6, 0.12, 0.56, 14.15, 0.98, fenceZ, 0, 2.4);

  // Side perimeter stone walls closing courtyard at x = -25.2 and x = +25.2
  batch.addBox(mats.facadeConcrete, 0.45, 2.4, 15.0, -25.2, 1.2, 1.1, 0, 2.4);
  batch.addBox(mats.facadeConcrete, 0.45, 2.4, 15.0, 25.2, 1.2, 1.1, 0, 2.4);

  // Fence colliders
  physics.addBox(-25.6, 0, fenceZ - 0.35, -3.4, 3.0, fenceZ + 0.35);
  physics.addBox(3.4, 0, fenceZ - 0.35, 25.6, 3.0, fenceZ + 0.35);
  physics.addBox(-25.6, 0, -6.5, -24.8, 3.0, fenceZ + 0.4);
  physics.addBox(24.8, 0, -6.5, 25.6, 3.0, fenceZ + 0.4);

  // Wrought-iron railings & vertical pickets along top of front stone fence
  for (const side of [-1, 1]) {
    const startX = side * 3.8;
    const endX = side * 24.6;
    const midX = (startX + endX) * 0.5;
    const span = Math.abs(endX - startX);
    batch.addBox(mats.ironFence, span, 0.06, 0.06, midX, 2.38, fenceZ, 0, 2, false, false);
    batch.addBox(mats.ironFence, span, 0.06, 0.06, midX, 1.22, fenceZ, 0, 2, false, false);
    const step = 0.55;
    for (let x = Math.min(startX, endX); x <= Math.max(startX, endX); x += step) {
      batch.addBox(mats.ironFence, 0.04, 1.52, 0.04, x, 1.74, fenceZ, 0, 1, false, false);
    }
    // Stone fence piers every 6m
    for (let px = 3.5; px <= 25; px += 7.0) {
      const gx = side * px;
      batch.addBox(mats.facadeConcrete, 0.72, 2.75, 0.72, gx, 1.375, fenceZ, 0, 2.0);
      batch.addBox(mats.facadeTrim, 0.88, 0.16, 0.88, gx, 2.82, fenceZ, 0, 2.0);
    }
  }

  // Warm weathered gate pillar globe lamps welcoming the player from the muddy road!
  for (const gx of [-3.5, 3.5]) {
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mats.lampWarmEmissive);
    globe.position.set(gx, 3.1, fenceZ);
    group.add(globe);
  }
  const gateLight = new THREE.PointLight(0xffb868, 7.5, 19, 1.45);
  gateLight.position.set(0, 3.3, fenceZ - 0.5);
  group.add(gateLight);
  engine.registerAccentLight(gateLight, { outdoorOnly: true, maxDist: 36 });

  // Open heavy wrought-iron BARRED double gate leaves (transparent picket bars so courtyard & ambulance bay shine through!)
  function addGateLeaf(pivotX, angle) {
    const w = 3.1;
    const cs = Math.cos(angle);
    const sn = Math.sin(angle);
    const localToW = (distAlong) => [pivotX + sn * distAlong, fenceZ - cs * distAlong];
    const [mx, mz] = localToW(w * 0.5);
    // Top, middle, bottom horizontal rails
    batch.addBox(mats.ironFence, 0.08, 0.09, w, mx, 2.22, mz, angle, 2);
    batch.addBox(mats.ironFence, 0.07, 0.07, w, mx, 1.22, mz, angle, 2);
    batch.addBox(mats.ironFence, 0.08, 0.09, w, mx, 0.24, mz, angle, 2);
    // Vertical iron pickets along the gate leaf
    for (let p = 0; p <= 8; p++) {
      const d = (p / 8) * w;
      const [px, pz] = localToW(d);
      const thick = p === 0 || p === 8 ? 0.09 : 0.045;
      batch.addBox(mats.ironFence, thick, 2.08, thick, px, 1.24, pz, angle, 1, false, false);
    }
  }
  addGateLeaf(-3.3, 0.28);
  addGateLeaf(3.3, -0.38);

  // ===== 3. COVERED AMBULANCE BAY / PORTE-COCHÈRE AT MAIN ENTRANCE =====
  // Concrete canopy slab extending from facade (z = -6) out to z = -0.2
  batch.addBox(mats.facadeConcrete, 11.8, 0.58, 6.2, 0, 3.85, -3.1, 0, 2.8);
  batch.addBox(mats.facadeTrim, 12.1, 0.22, 6.5, 0, 4.22, -3.1, 0, 2.8);
  // Red architectural emergency stripe band along front fascia of canopy
  batch.addBox(mats.ambulanceRed, 12.14, 0.18, 0.08, 0, 3.92, 0.15, 0, 2);

  // 4 Structural Concrete Columns supporting the canopy
  const colPositions = [
    [-5.2, -0.6],
    [5.2, -0.6],
    [-5.2, -4.6],
    [5.2, -4.6],
  ];
  colPositions.forEach(([cx, cz]) => {
    batch.addBox(mats.facadeConcrete, 0.62, 3.65, 0.62, cx, 1.825, cz, 0, 2.2);
    batch.addBox(mats.facadeTrim, 0.8, 0.26, 0.8, cx, 0.13, cz, 0, 2.0);
    batch.addBox(mats.facadeTrim, 0.78, 0.22, 0.78, cx, 3.48, cz, 0, 2.0);
    physics.addBoxCenter(cx, 1.8, cz, 0.72, 3.6, 0.72);
  });

  // Main Hospital Facade Architectural Signboard mounted high above canopy so it's always crystal clear
  const facadeSignMat = mats.makeHospitalFacadeSign();
  const facadeSign = new THREE.Mesh(new THREE.BoxGeometry(9.6, 2.2, 0.18), facadeSignMat);
  facadeSign.position.set(0, 5.75, -5.62);
  facadeSign.castShadow = true;
  group.add(facadeSign);

  // Dedicated warm-white architectural uplight illuminating the «مستشفى السدرة الريفي» sign at night
  const signLight = new THREE.PointLight(0xdcece8, 6.8, 16, 1.4);
  signLight.position.set(0, 5.8, -3.2);
  group.add(signLight);
  engine.registerAccentLight(signLight, { outdoorOnly: true, maxDist: 42 });

  // Recessed porch ceiling fluorescent troffer + glowing red emergency sign light
  const porchLamp = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.5), mats.lampColdEmissive);
  porchLamp.position.set(0, 3.53, -3.2);
  group.add(porchLamp);
  const porchLight = new THREE.PointLight(0xd2e8e4, 7.6, 17, 1.4);
  porchLight.position.set(0, 3.25, -3.0);
  group.add(porchLight);
  engine.registerAccentLight(porchLight, { flicker: true, outdoorOnly: true, maxDist: 34 });

  // Red glowing EMERGENCY light bar mounted flush on canopy front fascia (unobstructed sign above!)
  const erBeacon = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.16, 0.1), mats.emergencyRed);
  erBeacon.position.set(0, 3.92, 0.2);
  group.add(erBeacon);
  const erRedLight = new THREE.PointLight(0xff4232, 2.8, 10, 1.6);
  erRedLight.position.set(0, 3.85, 0.85);
  group.add(erRedLight);
  engine.registerAccentLight(erRedLight, { outdoorOnly: true, maxDist: 30 });

  // Stainless steel entrance handrails flanking the wide main door
  for (const sx of [-2.4, 2.4]) {
    batch.addCylinder(mats.stainlessSteel, 0.03, 0.03, 0.95, 8, sx, 0.48, -3.3);
    batch.addCylinder(mats.stainlessSteel, 0.03, 0.03, 0.95, 8, sx, 0.48, -5.4);
    batch.addCylinder(mats.stainlessSteel, 0.032, 0.032, 2.2, 8, sx, 0.94, -4.35, Math.PI / 2, 0, 0);
  }

  // ===== 4. HANDCRAFTED 3D ABANDONED AMBULANCE IN COURTYARD =====
  const ambGroup = new THREE.Group();
  ambGroup.position.set(-10.8, 0, 1.6);
  ambGroup.rotation.y = 0.34;
  const ab = new GeometryBatcher();
  // Rear medical box compartment
  ab.addBox(mats.ambulanceWhite, 2.25, 1.95, 3.45, 0, 1.48, -0.75, 0, 2);
  // Red medical stripe band around box
  ab.addBox(mats.ambulanceRed, 2.29, 0.24, 3.48, 0, 1.45, -0.75, 0, 2);
  // Side red cross emblems
  for (const sx of [-1.14, 1.14]) {
    ab.addBox(mats.ambulanceRed, 0.04, 0.62, 0.18, sx, 1.85, -0.75, 0, 1);
    ab.addBox(mats.ambulanceRed, 0.04, 0.18, 0.62, sx, 1.85, -0.75, 0, 1);
  }
  // Cab + hood
  ab.addBox(mats.ambulanceWhite, 2.05, 1.45, 1.35, 0, 1.22, 1.62, 0, 2);
  ab.addBox(mats.ambulanceWhite, 1.98, 0.85, 1.15, 0, 0.92, 2.75, 0, 2);
  // Dark tinted windshield + side cab windows + warm headlights
  ab.addBox(mats.glassFrosted, 1.84, 0.62, 0.08, 0, 1.56, 2.31, 0, 1, false, false);
  ab.addBox(mats.lampWarmEmissive, 0.28, 0.16, 0.06, -0.7, 0.88, 3.33, 0, 1, false, false);
  ab.addBox(mats.lampWarmEmissive, 0.28, 0.16, 0.06, 0.7, 0.88, 3.33, 0, 1, false, false);
  ab.addBox(mats.darkMetal, 2.1, 0.24, 0.16, 0, 0.56, 3.35, 0, 1); // front bumper
  ab.addBox(mats.darkMetal, 2.28, 0.22, 0.18, 0, 0.56, -2.52, 0, 1); // rear step bumper
  // Roof emergency lightbar
  ab.addBox(mats.darkMetal, 1.4, 0.1, 0.26, 0, 2.52, 0.72, 0, 1);
  ab.addBox(mats.emergencyRed, 0.46, 0.16, 0.24, -0.42, 2.6, 0.72, 0, 1);
  ab.addBox(mats.ambulanceRed, 0.46, 0.16, 0.24, 0.42, 2.6, 0.72, 0, 1);
  // 4 rubber tires + steel rims
  const wheelCoords = [[-1.06, 2.25], [1.06, 2.25], [-1.06, -1.45], [1.06, -1.45]];
  wheelCoords.forEach(([wx, wz]) => {
    ab.addCylinder(mats.rubberTire, 0.42, 0.42, 0.26, 12, wx, 0.42, wz, 0, 0, Math.PI / 2);
    ab.addCylinder(mats.stainlessSteel, 0.22, 0.22, 0.28, 10, wx, 0.42, wz, 0, 0, Math.PI / 2);
  });
  ab.flush(ambGroup);
  group.add(ambGroup);
  physics.addBox(-12.6, 0, -1.4, -9.0, 2.8, 5.0);

  // Subtle amber glow from abandoned ambulance headlights
  const ambLight = new THREE.PointLight(0xffcf88, 3.2, 12, 1.6);
  ambLight.position.set(-9.4, 1.2, 5.1);
  group.add(ambLight);
  engine.registerAccentLight(ambLight, { outdoorOnly: true, maxDist: 32 });

  // ===== 5. SECOND-STORY ARCHITECTURAL HOSPITAL EXTERIOR SHELL & ROOFTOP =====
  const { xMin, xMax, zFront, zBack } = HOSPITAL_BOUNDS;
  const bw = xMax - xMin; // 48m
  const bd = zFront - zBack; // 36m
  const cx = (xMin + xMax) * 0.5;
  const cz = (zFront + zBack) * 0.5;
  const upperY = FLOOR2_Y + WALL_H * 0.5; // 5.2m
  const upperH = WALL_H + 0.55; // 3.75m

  // Architectural concrete belt course dividing Floor 1 and Floor 2
  batch.addBox(mats.facadeTrim, bw + 0.7, 0.34, bd + 0.7, cx, FLOOR2_Y - 0.1, cz, 0, 3.0);
  // 2nd Story Outer Walls (gives authentic 2-story institutional hospital silhouette!)
  batch.addBox(mats.facadeConcrete, bw, upperH, 0.45, cx, upperY, zFront, 0, 3.0);
  batch.addBox(mats.facadeConcrete, bw, upperH, 0.45, cx, upperY, zBack, 0, 3.0);
  batch.addBox(mats.facadeConcrete, 0.45, upperH, bd, xMin, upperY, cz, 0, 3.0);
  batch.addBox(mats.facadeConcrete, 0.45, upperH, bd, xMax, upperY, cz, 0, 3.0);
  // Roof parapet & main flat roof slab
  const roofY = FLOOR2_Y + WALL_H + 0.45;
  batch.addBox(mats.facadeTrim, bw + 0.9, 0.42, bd + 0.9, cx, roofY, cz, 0, 3.4);

  // Upper Floor Recessed Windows along front facade (visual architectural depth!)
  const f2WinXs = [-19.5, -13.5, -6.5, 6.5, 13.5, 19.5];
  f2WinXs.forEach((wx) => {
    const wy = FLOOR2_Y + 1.75;
    batch.addBox(mats.darkMetal, 2.8, 1.55, 0.14, wx, wy, zFront + 0.24, 0, 1);
    batch.addBox(mats.glassFrosted, 2.55, 1.32, 0.06, wx, wy, zFront + 0.28, 0, 1, false, false);
    batch.addBox(mats.darkMetal, 0.08, 1.45, 0.16, wx, wy, zFront + 0.28, 0, 1);
    batch.addBox(mats.facadeTrim, 3.05, 0.16, 0.28, wx, wy - 0.84, zFront + 0.28, 0, 1.5);
  });

  // Rooftop Mechanical Penthouse, HVAC Chiller Units & Communications Antenna
  batch.addBox(mats.facadeConcrete, 8.5, 2.4, 6.0, -11, roofY + 1.2, -16, 0, 2.6, false, false);
  batch.addBox(mats.rustedMetal, 3.2, 1.4, 2.4, 9.5, roofY + 0.7, -14, 0, 2.0, false, false);
  batch.addBox(mats.rustedMetal, 2.4, 1.2, 2.2, 14.2, roofY + 0.6, -15, 0, 2.0, false, false);
  batch.addCylinder(mats.darkMetal, 0.05, 0.09, 5.5, 6, -11, roofY + 4.8, -16, 0, 0, 0, false, false);

  batch.flush(group);

  // ===== 6. ATMOSPHERIC NIGHT SKY, FULL MOON & STARFIELD (FOLLOWS CAMERA — ZERO CLIPPING!) =====
  const skyGroup = new THREE.Group();
  const skyGeo = new THREE.SphereGeometry(210, 20, 14);
  const skyMat = new THREE.MeshBasicMaterial({
    color: 0x091322,
    side: THREE.BackSide,
    fog: false,
  });
  skyGroup.add(new THREE.Mesh(skyGeo, skyMat));

  const moonSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: mats.makeMoonTexture(), transparent: true, fog: false })
  );
  moonSprite.scale.set(17, 17, 1);
  moonSprite.position.set(-48, 62, -145);
  skyGroup.add(moonSprite);

  const moonHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: mats.makeGlowTexture(),
      color: 0x7ba0d6,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    })
  );
  moonHalo.scale.set(48, 48, 1);
  moonHalo.position.copy(moonSprite.position);
  skyGroup.add(moonHalo);

  // Lightweight 220-star sky dome (moves with skyGroup)
  const starCount = 220;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const a = (i * 2.39996) % (Math.PI * 2);
    const el = 0.14 + (((i * 17) % 100) / 100) * 1.18;
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
      new THREE.PointsMaterial({ color: 0xd0e2fa, size: 1.1, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.78 })
    )
  );
  group.add(skyGroup);
  engine.skyDome = skyGroup;
}
