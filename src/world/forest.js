import * as THREE from 'three';
import {
  createRng,
  randRange,
  roadCenterX,
  roadHalfWidth,
  distFromRoad,
  distFromClearingTrail,
  terrainHeight,
} from '../utils/math.js';
import { GeometryBatcher, buildInstancedMesh } from '../core/geometry.js';

/**
 * Builds Act 1 (Misty Pine Forest Clearing) and Act 2 (Winding Muddy Forest Road)
 * with realistic multi-tiered instanced pine trees, boulders, ferns, puddles,
 * wooden fences, warning signs, utility poles, and a flickering amber streetlamp.
 */
export function buildForestAndRoad(engine, mats, physics) {
  const group = engine.zones.forest;
  const rng = createRng(19941012);
  const batch = new GeometryBatcher();

  // ===== 1. ROLLING FOREST FLOOR TERRAIN =====
  const terrW = 116;
  const terrD = 88;
  const segX = 72;
  const segZ = 60;
  const terrGeo = new THREE.PlaneGeometry(terrW, terrD, segX, segZ);
  terrGeo.rotateX(-Math.PI / 2);
  const pos = terrGeo.attributes.position;
  const uv = terrGeo.attributes.uv;
  const zCenter = 48; // spans z from 4 to 92
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i) + zCenter;
    const y = terrainHeight(x, z);
    pos.setXYZ(i, x, y, z);
    uv.setXY(i, x / 4.2, z / 4.2);
  }
  terrGeo.computeVertexNormals();
  const terrMesh = new THREE.Mesh(terrGeo, mats.forestGround);
  terrMesh.receiveShadow = true;
  terrMesh.castShadow = false;
  group.add(terrMesh);

  // ===== 2. WINDING MUDDY FOREST ROAD RIBBON =====
  const roadSteps = 68;
  const zStart = 64;
  const zEnd = 8.4;
  const rPos = [];
  const rUv = [];
  const rIdx = [];
  const cols = 6; // cross-section vertices for sculpted crown + rut profile
  for (let i = 0; i <= roadSteps; i++) {
    const t = i / roadSteps;
    const z = zStart + (zEnd - zStart) * t;
    const cx = roadCenterX(z);
    const hw = roadHalfWidth(z);
    for (let c = 0; c <= cols; c++) {
      const u = c / cols; // 0..1 across road width
      const edgeT = (u - 0.5) * 2; // -1..+1
      const x = cx + edgeT * (hw + 0.55);
      // Taper outer shoulder edges cleanly down into forest floor so there are zero floating edges
      const edgeDrop = Math.abs(edgeT) > 0.78 ? -0.14 * ((Math.abs(edgeT) - 0.78) / 0.22) : 0.035;
      const y = terrainHeight(x, z) + edgeDrop;
      rPos.push(x, y, z);
      rUv.push(u * 2.2, (zStart - z) / 3.4);
    }
  }
  const stride = cols + 1;
  for (let i = 0; i < roadSteps; i++) {
    for (let c = 0; c < cols; c++) {
      const a = i * stride + c;
      const b = a + 1;
      const d = (i + 1) * stride + c;
      const e = d + 1;
      rIdx.push(a, d, b, b, d, e);
    }
  }
  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(rPos, 3));
  roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(rUv, 2));
  roadGeo.setIndex(rIdx);
  roadGeo.computeVertexNormals();
  const roadMesh = new THREE.Mesh(roadGeo, mats.mudRoad);
  roadMesh.receiveShadow = true;
  group.add(roadMesh);

  // Forest Clearing Spur Trail connecting spawn (-10.5, 71) to muddy road (-2.2, 62)
  const spurSteps = 18;
  const spPos = [];
  const spUv = [];
  const spIdx = [];
  for (let i = 0; i <= spurSteps; i++) {
    const t = i / spurSteps;
    const z = 72.5 - t * 11.5;
    const cx = -10.5 + (1 - Math.cos(t * Math.PI)) * 0.5 * 8.4;
    const hw = 1.65;
    for (let c = 0; c <= 4; c++) {
      const u = c / 4;
      const e = (u - 0.5) * 2;
      const x = cx + e * (hw + 0.35);
      const drop = Math.abs(e) > 0.75 ? -0.1 : 0.032;
      spPos.push(x, terrainHeight(x, z) + drop, z);
      spUv.push(u * 1.4, t * 4.5);
    }
  }
  for (let i = 0; i < spurSteps; i++) {
    for (let c = 0; c < 4; c++) {
      const a = i * 5 + c;
      const b = a + 1;
      const d = (i + 1) * 5 + c;
      const e = d + 1;
      spIdx.push(a, d, b, b, d, e);
    }
  }
  const spurGeo = new THREE.BufferGeometry();
  spurGeo.setAttribute('position', new THREE.Float32BufferAttribute(spPos, 3));
  spurGeo.setAttribute('uv', new THREE.Float32BufferAttribute(spUv, 2));
  spurGeo.setIndex(spIdx);
  spurGeo.computeVertexNormals();
  const spurMesh = new THREE.Mesh(spurGeo, mats.mudRoad);
  spurMesh.receiveShadow = true;
  group.add(spurMesh);

  // ===== 3. GLOSSY WET MUD PUDDLES ALONG THE ROAD =====
  const puddleZs = [57, 48, 41, 33, 25, 17, 12.5];
  const puddleGeo = new THREE.CircleGeometry(1, 14);
  puddleGeo.rotateX(-Math.PI / 2);
  puddleZs.forEach((pz, idx) => {
    const px = roadCenterX(pz) + (idx % 2 === 0 ? -0.95 : 0.92);
    const py = terrainHeight(px, pz) + 0.048;
    const m = new THREE.Mesh(puddleGeo, mats.mudPuddle);
    m.position.set(px, py, pz);
    m.scale.set(randRange(rng, 0.75, 1.3), 1, randRange(rng, 1.4, 2.5));
    m.rotation.y = randRange(rng, -0.35, 0.35);
    m.receiveShadow = true;
    group.add(m);
  });

  // ===== 4. MULTI-TIERED HANDCRAFTED 3D PINE & CYPRESS TREES (INSTANCED!) =====
  // Build rich custom geometries for trunks, root flares, and jagged overlapping pine bough tiers
  const trunkGeo = new THREE.CylinderGeometry(0.11, 0.34, 7.6, 7, 3);
  trunkGeo.translate(0, 3.8, 0);
  // Subtle organic curvature & bark taper
  const tPos = trunkGeo.attributes.position;
  for (let i = 0; i < tPos.count; i++) {
    const y = tPos.getY(i);
    const flare = y < 0.8 ? (1 + (0.8 - y) * 0.45) : 1;
    const bend = Math.sin(y * 0.42) * 0.14;
    tPos.setX(i, tPos.getX(i) * flare + bend);
  }
  trunkGeo.computeVertexNormals();

  // Build layered organic pine canopy geometry (7 staggered irregular conifer bough clusters merged into 1 geometry!)
  const tierDefs = [
    { y: 2.35, r: 2.15, h: 1.55, segs: 11, droop: 0.42, amp: 0.28 },
    { y: 3.35, r: 2.35, h: 1.7, segs: 11, droop: 0.44, amp: 0.30 },
    { y: 4.45, r: 1.98, h: 1.65, segs: 10, droop: 0.36, amp: 0.28 },
    { y: 5.55, r: 1.68, h: 1.6, segs: 10, droop: 0.32, amp: 0.26 },
    { y: 6.6, r: 1.35, h: 1.55, segs: 9, droop: 0.25, amp: 0.24 },
    { y: 7.55, r: 0.96, h: 1.5, segs: 8, droop: 0.18, amp: 0.22 },
    { y: 8.45, r: 0.56, h: 1.45, segs: 7, droop: 0.10, amp: 0.18 },
  ];
  const cPos = [];
  const cNor = [];
  const cUv = [];
  const cIdx = [];
  let vc = 0;
  tierDefs.forEach((td, ti) => {
    const cone = new THREE.ConeGeometry(td.r, td.h, td.segs, 3, false);
    const cp = cone.attributes.position;
    const cu = cone.attributes.uv;
    const offX = Math.sin(ti * 2.1) * 0.12;
    const offZ = Math.cos(ti * 1.9) * 0.12;
    for (let i = 0; i < cp.count; i++) {
      let vx = cp.getX(i);
      let vy = cp.getY(i);
      let vz = cp.getZ(i);
      const ang = Math.atan2(vz, vx);
      const rad = Math.hypot(vx, vz);
      if (rad > 0.08) {
        // Organic serrated evergreen boughs with irregular lobes & drooping tips
        const lobe =
          1 +
          td.amp * Math.sin(ang * 6 + ti * 1.9) +
          (td.amp * 0.55) * Math.cos(ang * 4 - ti * 1.3) +
          0.1 * Math.sin(ang * 9 + ti);
        vx = vx * lobe + offX;
        vz = vz * lobe + offZ;
        const tipRatio = Math.min(1, rad / td.r);
        vy -= td.droop * tipRatio * tipRatio * (0.65 + 0.35 * Math.sin(ang * 5 + ti));
      }
      cp.setXYZ(i, vx, vy + td.y, vz);
      cu.setXY(i, cu.getX(i) * 2.6, cu.getY(i) * 2.2);
    }
    cone.computeVertexNormals();
    const cn = cone.attributes.normal;
    const idx = cone.index;
    for (let i = 0; i < cp.count; i++) {
      cPos.push(cp.getX(i), cp.getY(i), cp.getZ(i));
      cNor.push(cn.getX(i), cn.getY(i), cn.getZ(i));
      cUv.push(cu.getX(i), cu.getY(i));
    }
    for (let i = 0; i < idx.count; i++) {
      cIdx.push(idx.getX(i) + vc);
    }
    vc += cp.count;
    cone.dispose();
  });
  const pineCanopyGeo = new THREE.BufferGeometry();
  pineCanopyGeo.setAttribute('position', new THREE.Float32BufferAttribute(cPos, 3));
  pineCanopyGeo.setAttribute('normal', new THREE.Float32BufferAttribute(cNor, 3));
  pineCanopyGeo.setAttribute('uv', new THREE.Float32BufferAttribute(cUv, 2));
  pineCanopyGeo.setIndex(cIdx);
  pineCanopyGeo.computeBoundingSphere();

  // Place 175 rich forest trees framing the clearing, lining the winding muddy road, and flanking the hospital!
  const treeTrunks = [];
  const treeCanopies = [];
  const treeShades = [0x829c80, 0x6f8a70, 0x90a888, 0x647d68, 0x7b9478];

  function tryPlaceTree(x, z, scaleMin = 0.85, scaleMax = 1.48) {
    if (distFromRoad(x, z) < 3.5) return false;
    if (distFromClearingTrail(x, z) < 2.5) return false;
    if (Math.hypot(x + 10.5, z - 71.0) < 5.2) return false; // Spawn clearing open
    if (z < 19.5 && Math.abs(x) < 14.5) return false; // Keep Title Camera & Main Gate panorama completely clear!
    if (z < 13.0 && Math.abs(x) < 29.0) return false; // Keep hospital courtyard & building clear
    for (let i = 0; i < treeTrunks.length; i++) {
      const t = treeTrunks[i];
      if ((t.x - x) * (t.x - x) + (t.z - z) * (t.z - z) < 9.5) return false;
    }
    const y = terrainHeight(x, z) - 0.12;
    const s = randRange(rng, scaleMin, scaleMax);
    const ry = randRange(rng, 0, Math.PI * 2);
    const tiltX = randRange(rng, -0.04, 0.04);
    const tiltZ = randRange(rng, -0.04, 0.04);
    treeTrunks.push({ x, y, z, rx: tiltX, ry, rz: tiltZ, sx: s, sy: s * randRange(rng, 0.92, 1.18), sz: s });
    treeCanopies.push({
      x,
      y,
      z,
      rx: tiltX,
      ry,
      rz: tiltZ,
      sx: s * randRange(rng, 0.94, 1.15),
      sy: s * randRange(rng, 0.95, 1.22),
      sz: s * randRange(rng, 0.94, 1.15),
      color: treeShades[(rng() * treeShades.length) | 0],
    });
    // Add collision only for trees within walkable forest perimeter
    if (Math.abs(x) < 46 && z > 8 && z < 79) {
      physics.addCircle(x, z, 0.38 * s, y - 0.5, y + 4.5);
    }
    return true;
  }

  // Hero framing trees along both edges of the winding muddy road
  for (let z = 18; z <= 64; z += 4.5) {
    const cx = roadCenterX(z);
    const hw = roadHalfWidth(z);
    tryPlaceTree(cx - hw - randRange(rng, 3.6, 6.2), z + randRange(rng, -1.2, 1.2), 1.0, 1.52);
    tryPlaceTree(cx + hw + randRange(rng, 3.6, 6.2), z + randRange(rng, -1.2, 1.2), 1.0, 1.52);
  }
  // Dense forest surround + flanking behind/beside hospital
  let attempts = 0;
  while (treeTrunks.length < 185 && attempts < 1400) {
    attempts++;
    const x = randRange(rng, -52, 52);
    const z = randRange(rng, -26, 84);
    tryPlaceTree(x, z, 0.85, 1.62);
  }

  const trunkInst = buildInstancedMesh(trunkGeo, mats.treeBark, treeTrunks, true, true);
  const canopyInst = buildInstancedMesh(pineCanopyGeo, mats.pineFoliage, treeCanopies, false, true);
  if (trunkInst) group.add(trunkInst);
  if (canopyInst) group.add(canopyInst);

  // ===== 5. INSTANCED MOSSY BOULDERS, FALLEN LOGS & FOREST FERNS =====
  const rockGeo = new THREE.DodecahedronGeometry(0.65, 1);
  const rP = rockGeo.attributes.position;
  for (let i = 0; i < rP.count; i++) {
    const vx = rP.getX(i), vy = rP.getY(i), vz = rP.getZ(i);
    const n = 0.85 + 0.28 * Math.sin(vx * 5 + vy * 3) * Math.cos(vz * 4);
    rP.setXYZ(i, vx * n, vy * n * 0.68, vz * n);
  }
  rockGeo.computeVertexNormals();
  const rockList = [];
  for (let i = 0; i < 65; i++) {
    const x = randRange(rng, -36, 36);
    const z = randRange(rng, 11, 78);
    if (distFromRoad(x, z) < 0.9 || distFromClearingTrail(x, z) < 0.8) continue;
    const s = randRange(rng, 0.55, 1.65);
    const y = terrainHeight(x, z) + 0.14 * s;
    rockList.push({
      x, y, z,
      rx: randRange(rng, 0, 1),
      ry: randRange(rng, 0, 6.28),
      rz: randRange(rng, 0, 1),
      sx: s * randRange(rng, 0.8, 1.4),
      sy: s * randRange(rng, 0.6, 1.1),
      sz: s * randRange(rng, 0.8, 1.4),
    });
    if (s > 1.0) physics.addCircle(x, z, 0.55 * s, y - 0.5, y + 2);
  }
  const rockInst = buildInstancedMesh(rockGeo, mats.mossRock, rockList, false, true);
  if (rockInst) group.add(rockInst);

  // Crossed fern / undergrowth shrub clusters along road edges & clearing
  const fernGeo = new THREE.BufferGeometry();
  const fPos = [], fNor = [], fUv = [], fIdx = [];
  let fvc = 0;
  for (let k = 0; k < 3; k++) {
    const ang = (k / 3) * Math.PI;
    const pl = new THREE.PlaneGeometry(1.15, 0.72);
    pl.rotateY(ang);
    pl.translate(0, 0.32, 0);
    const pp = pl.attributes.position, pn = pl.attributes.normal, pu = pl.attributes.uv;
    for (let i = 0; i < pp.count; i++) {
      fPos.push(pp.getX(i), pp.getY(i), pp.getZ(i));
      fNor.push(pn.getX(i), pn.getY(i), pn.getZ(i));
      fUv.push(pu.getX(i), pu.getY(i));
    }
    for (let i = 0; i < pl.index.count; i++) fIdx.push(pl.index.getX(i) + fvc);
    fvc += pp.count;
    pl.dispose();
  }
  fernGeo.setAttribute('position', new THREE.Float32BufferAttribute(fPos, 3));
  fernGeo.setAttribute('normal', new THREE.Float32BufferAttribute(fNor, 3));
  fernGeo.setAttribute('uv', new THREE.Float32BufferAttribute(fUv, 2));
  fernGeo.setIndex(fIdx);
  const fernList = [];
  for (let i = 0; i < 140; i++) {
    const z = randRange(rng, 11, 78);
    const side = rng() < 0.5 ? -1 : 1;
    const cx = roadCenterX(z);
    const x = i < 70
      ? cx + side * (roadHalfWidth(z) + randRange(rng, 0.4, 4.2))
      : randRange(rng, -28, 28);
    if (distFromRoad(x, z) < 0.35 || distFromClearingTrail(x, z) < 0.45) continue;
    const s = randRange(rng, 0.65, 1.45);
    fernList.push({
      x,
      y: terrainHeight(x, z) - 0.04,
      z,
      ry: randRange(rng, 0, 6.28),
      sx: s, sy: s * randRange(rng, 0.7, 1.25), sz: s,
    });
  }
  const fernInst = buildInstancedMesh(fernGeo, mats.fernLeaf, fernList, false, true);
  if (fernInst) group.add(fernInst);

  // Roadside guide bollards with subtle amber reflectors outlining the winding muddy road at night
  for (let z = 14; z <= 58; z += 7.5) {
    for (const side of [-1, 1]) {
      const bx = roadCenterX(z) + side * (roadHalfWidth(z) + 0.48);
      const by = terrainHeight(bx, z);
      batch.addBox(mats.facadeTrim, 0.14, 0.72, 0.14, bx, by + 0.34, z, 0, 1);
      batch.addBox(mats.lampWarmEmissive, 0.15, 0.09, 0.15, bx, by + 0.58, z, 0, 1, false, false);
    }
  }

  // Fallen mossy logs near spawn & muddy road shoulders
  const fallenLogs = [
    { x: -13.8, z: 68.2, ry: 0.65, len: 4.4 },
    { x: 5.5, z: 53.5, ry: -0.4, len: 3.8 },
    { x: -6.2, z: 29.0, ry: 1.15, len: 4.1 },
  ];
  fallenLogs.forEach((lg) => {
    const y = terrainHeight(lg.x, lg.z) + 0.2;
    batch.addCylinder(mats.treeBark, 0.2, 0.26, lg.len, 8, lg.x, y, lg.z, Math.PI / 2, lg.ry, 0);
  });

  // ===== 6. SPAWN TRAILHEAD POST, WOODEN ROAD FENCES & WARNING SIGNS =====
  // Trailhead Lantern Post at spawn clearing (guides player visually onto the muddy road!)
  const lanX = -7.6;
  const lanZ = 66.2;
  const lanY = terrainHeight(lanX, lanZ);
  batch.addBox(mats.agedWood, 0.18, 2.55, 0.18, lanX, lanY + 1.25, lanZ, 0.1, 1.5);
  batch.addBox(mats.agedWood, 0.85, 0.12, 0.12, lanX + 0.34, lanY + 2.38, lanZ, 0.1, 1.5);
  batch.addBox(mats.darkMetal, 0.24, 0.32, 0.24, lanX + 0.68, lanY + 2.15, lanZ, 0, 1);
  const lanternBulb = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16), mats.lampWarmEmissive);
  lanternBulb.position.set(lanX + 0.68, lanY + 2.14, lanZ);
  group.add(lanternBulb);
  const trailLight = new THREE.PointLight(0xffb45c, 5.2, 16, 1.5);
  trailLight.position.set(lanX + 0.68, lanY + 2.05, lanZ);
  group.add(trailLight);
  engine.registerAccentLight(trailLight, { flicker: true, outdoorOnly: true, maxDist: 28 });
  physics.addCircle(lanX, lanZ, 0.25, lanY, lanY + 3);

  // Wooden split-rail fence posts lining sections of the muddy road
  for (let z = 14; z <= 56; z += 4.5) {
    const side = z > 32 ? -1 : 1;
    const cx = roadCenterX(z);
    const fx = cx + side * (roadHalfWidth(z) + 0.85);
    const fy = terrainHeight(fx, z);
    batch.addBox(mats.agedWood, 0.14, 1.15, 0.14, fx, fy + 0.55, z, randRange(rng, -0.1, 0.1), 1.4);
    if (z + 4.5 <= 56 && ((z > 32) === (z + 4.5 > 32))) {
      const nx = roadCenterX(z + 4.5) + side * (roadHalfWidth(z + 4.5) + 0.85);
      const ny = terrainHeight(nx, z + 4.5);
      const midX = (fx + nx) * 0.5;
      const midZ = z + 2.25;
      const midY = (fy + ny) * 0.5;
      const len = Math.hypot(nx - fx, 4.5);
      const ang = Math.atan2(nx - fx, 4.5);
      batch.addBox(mats.agedWood, 0.08, 0.1, len, midX, midY + 0.82, midZ, ang, 1.8);
      batch.addBox(mats.agedWood, 0.08, 0.1, len, midX, midY + 0.42, midZ, ang, 1.8);
    }
  }

  // Rusted Road Warning Signs
  function addRoadSign(z, side, titleAr, subEn) {
    const sx = roadCenterX(z) + side * (roadHalfWidth(z) + 1.15);
    const sy = terrainHeight(sx, z);
    const ry = side > 0 ? -0.32 : 0.32;
    batch.addCylinder(mats.darkMetal, 0.045, 0.05, 2.35, 6, sx, sy + 1.15, z);
    const plateMat = mats.makeRoadSign(titleAr, subEn);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.72, 0.04), plateMat);
    plate.position.set(sx, sy + 2.02, z);
    plate.rotation.y = ry;
    plate.rotation.z = side > 0 ? -0.05 : 0.06;
    plate.castShadow = true;
    group.add(plate);
    physics.addCircle(sx, z, 0.18, sy, sy + 2.5);
  }
  addRoadSign(59.5, 1, 'طريق مستشفى السدرة', 'AL-SIDRA HOSPITAL ->');
  addRoadSign(27.5, -1, 'منطقة معزولة · ١٩٩٤', 'RESTRICTED ZONE');

  // ===== 7. UTILITY POLES & FLICKERING AMBER SODIUM STREETLAMP ON MUDDY ROAD =====
  const poleZs = [49, 32, 15.5];
  const poleTops = [];
  poleZs.forEach((pz, idx) => {
    const px = roadCenterX(pz) + (roadHalfWidth(pz) + 1.45);
    const py = terrainHeight(px, pz);
    batch.addCylinder(mats.agedWood, 0.11, 0.16, 6.8, 7, px, py + 3.4, pz, 0, 0, idx === 1 ? 0.04 : -0.02);
    batch.addBox(mats.agedWood, 1.7, 0.12, 0.12, px, py + 6.35, pz, 0.12, 1.5);
    poleTops.push(new THREE.Vector3(px, py + 6.35, pz));
    physics.addCircle(px, pz, 0.22, py, py + 6);

    // Middle & approach poles carry working flickering sodium streetlamps!
    if (idx >= 1) {
      batch.addBox(mats.darkMetal, 1.35, 0.08, 0.08, px - 0.65, py + 6.05, pz, 0, 1);
      batch.addBox(mats.darkMetal, 0.42, 0.12, 0.24, px - 1.25, py + 5.98, pz, 0, 1);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.16), mats.lampWarmEmissive);
      lamp.position.set(px - 1.25, py + 5.91, pz);
      group.add(lamp);

      const sLight = new THREE.PointLight(0xffb156, idx === 1 ? 9.5 : 8.5, 22, 1.45);
      sLight.position.set(px - 1.25, py + 5.4, pz);
      group.add(sLight);
      engine.registerAccentLight(sLight, { flicker: idx === 1, outdoorOnly: true, maxDist: 34 });
    }
  });

  // Sagging utility wires between poles
  for (let i = 0; i < poleTops.length - 1; i++) {
    const a = poleTops[i];
    const b = poleTops[i + 1];
    const curve = new THREE.QuadraticBezierCurve3(
      a,
      new THREE.Vector3((a.x + b.x) * 0.5, (a.y + b.y) * 0.5 - 0.85, (a.z + b.z) * 0.5),
      b
    );
    const wireGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(10));
    const wire = new THREE.Line(wireGeo, new THREE.LineBasicMaterial({ color: 0x1e242c }));
    group.add(wire);
  }

  batch.flush(group);

  // Subtle floating forest fireflies / mist motes (tiny 90-point buffer — practically zero GPU cost!)
  const moteN = 90;
  const mPos = new Float32Array(moteN * 3);
  for (let i = 0; i < moteN; i++) {
    const mz = randRange(rng, 10, 74);
    const mx = roadCenterX(mz) + randRange(rng, -16, 16);
    mPos[i * 3] = mx;
    mPos[i * 3 + 1] = terrainHeight(mx, mz) + randRange(rng, 0.6, 4.2);
    mPos[i * 3 + 2] = mz;
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(mPos, 3));
  const motes = new THREE.Points(
    moteGeo,
    new THREE.PointsMaterial({
      color: 0xaec8dc,
      size: 0.08,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  group.add(motes);

  return { motes };
}
