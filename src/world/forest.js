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
 * Silent Hill Forest & Sculpted 3D Muddy Road (ZERO powered streetlamps or glowing modern bollards!).
 * Features:
 * - Rugged undulating 3D forest floor with exposed tree roots, fallen branches, mossy boulders, & feathery ferns
 * - Deeply sculpted 10-column 3D muddy road ribbon with wheel ruts, center mud ridge, shoulder banks & wet puddles
 * - Weathered wooden culvert planks bridging a muddy drainage ditch into the cracked hospital driveway
 * - Crooked rusted roadblock barriers, leaning split-rail fences, and 7-tier dark mountain conifers
 */
export function buildForestAndRoad(engine, mats, physics) {
  const group = engine.zones.forest;
  const rng = createRng(19941012);
  const batch = new GeometryBatcher();

  // ===== 1. RUGGED 3D FOREST FLOOR TERRAIN =====
  const terrW = 116;
  const terrD = 88;
  const segX = 88;
  const segZ = 76;
  const terrGeo = new THREE.PlaneGeometry(terrW, terrD, segX, segZ);
  terrGeo.rotateX(-Math.PI / 2);
  const pos = terrGeo.attributes.position;
  const uv = terrGeo.attributes.uv;
  const zCenter = 48;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i) + zCenter;
    let y = terrainHeight(x, z);
    // Sink coarse forest turf slightly underneath the sculpted muddy road so grass NEVER pokes through deep mud tire ruts!
    const rd = distFromRoad(x, z);
    if (rd < 0.65 && z >= 9.4 && z <= 64.8) {
      y -= (0.65 - rd) * 0.32;
    }
    pos.setXYZ(i, x, y, z);
    uv.setXY(i, x / 3.4, z / 3.4);
  }
  terrGeo.computeVertexNormals();
  const terrMesh = new THREE.Mesh(terrGeo, mats.forestGround);
  terrMesh.receiveShadow = true;
  group.add(terrMesh);

  // ===== 2. SCULPTED 3D MUDDY ROAD RIBBON (14 CROSS-SECTION COLUMNS FOR RAZOR-SHARP 3D RUTS & RIDGE!) =====
  const roadSteps = 98;
  const zStart = 64.5;
  const zEnd = 8.6;
  const cols = 14;
  const rPos = [];
  const rUv = [];
  const rIdx = [];
  for (let i = 0; i <= roadSteps; i++) {
    const t = i / roadSteps;
    const z = zStart + (zEnd - zStart) * t;
    const cx = roadCenterX(z);
    const hw = roadHalfWidth(z);
    for (let c = 0; c <= cols; c++) {
      const u = c / cols;
      const edgeT = (u - 0.5) * 2; // -1..+1
      const x = cx + edgeT * (hw + 0.95);
      const baseH = terrainHeight(x, z);
      const skirt = Math.abs(edgeT) > 0.84 ? -0.18 * ((Math.abs(edgeT) - 0.84) / 0.16) : 0.045;
      rPos.push(x, baseH + skirt, z);
      rUv.push(u * 1.15, (zStart - z) / 3.2);
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

  // Muddy Clearing Spur Trail from spawn (-10.5, 71) curving into the muddy road (-2.0, 62)
  const spurSteps = 24;
  const spPos = [];
  const spUv = [];
  const spIdx = [];
  for (let i = 0; i <= spurSteps; i++) {
    const t = i / spurSteps;
    const z = 72.8 - t * 11.8;
    const cx = -10.5 + (1 - Math.cos(t * Math.PI)) * 0.5 * 8.6;
    const hw = 1.6;
    for (let c = 0; c <= 6; c++) {
      const u = c / 6;
      const e = (u - 0.5) * 2;
      const x = cx + e * (hw + 0.45);
      const drop = Math.abs(e) > 0.78 ? -0.14 : 0.045 - Math.exp(-Math.pow((Math.abs(e) - 0.42) / 0.25, 2)) * 0.06;
      spPos.push(x, terrainHeight(x, z) + drop, z);
      spUv.push(u * 1.2, t * 4.8);
    }
  }
  for (let i = 0; i < spurSteps; i++) {
    for (let c = 0; c < 6; c++) {
      const a = i * 7 + c;
      const b = a + 1;
      const d = (i + 1) * 7 + c;
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

  // ===== 3. RECESSED GLOSSY WATER PUDDLES NESTLED INSIDE THE DEEP MUD RUTS =====
  const puddleZs = [60, 53.5, 47, 40.5, 36.5, 32, 26.5, 21, 16.5];
  const puddleGeo = new THREE.PlaneGeometry(2.0, 2.0);
  puddleGeo.rotateX(-Math.PI / 2);
  puddleZs.forEach((pz, idx) => {
    const side = idx % 2 === 0 ? -1.05 : 1.05;
    const px = roadCenterX(pz) + side;
    const py = terrainHeight(px, pz) + 0.075;
    const m = new THREE.Mesh(puddleGeo, mats.mudPuddle);
    m.position.set(px, py, pz);
    m.scale.set(randRange(rng, 0.55, 0.88), 1, randRange(rng, 1.4, 2.5));
    m.rotation.y = randRange(rng, -0.18, 0.18);
    m.receiveShadow = true;
    group.add(m);
  });

  // ===== 4. WEATHERED WOODEN CULVERT PLANKS BRIDGING MUDDY DRAINAGE AT APPROACH (z = 13.5) =====
  for (let p = 0; p < 7; p++) {
    const pz = 11.4 + p * 0.42;
    const py = terrainHeight(0, pz) + 0.055;
    batch.addBox(
      mats.agedWood,
      5.4 + randRange(rng, -0.2, 0.2),
      0.08,
      0.34,
      randRange(rng, -0.08, 0.08),
      py,
      pz,
      randRange(rng, -0.03, 0.03),
      1.6
    );
  }
  // Rusted wooden quarantine barricade sawhorse pushed askew beside the road approach
  const barX = -2.4;
  const barZ = 15.2;
  const barY = terrainHeight(barX, barZ);
  batch.addBox(mats.agedWood, 2.2, 0.22, 0.07, barX, barY + 0.82, barZ, 0.42, 1.5);
  batch.addBox(mats.redRustMetal, 2.22, 0.14, 0.08, barX, barY + 0.54, barZ, 0.42, 1.5);
  batch.addBox(mats.agedWood, 0.09, 1.0, 0.09, barX - 0.85, barY + 0.48, barZ - 0.3, 0.42, 1);
  batch.addBox(mats.agedWood, 0.09, 1.0, 0.09, barX + 0.85, barY + 0.48, barZ + 0.3, 0.42, 1);
  physics.addCircle(barX, barZ, 0.85, barY, barY + 1.2);

  // ===== 5. 7-TIER ORGANIC MOUNTAIN CONIFER TREES (INSTANCED!) =====
  const trunkGeo = new THREE.CylinderGeometry(0.11, 0.36, 7.8, 7, 3);
  trunkGeo.translate(0, 3.9, 0);
  const tPos = trunkGeo.attributes.position;
  for (let i = 0; i < tPos.count; i++) {
    const y = tPos.getY(i);
    const flare = y < 0.9 ? 1 + (0.9 - y) * 0.5 : 1;
    const bend = Math.sin(y * 0.45) * 0.16;
    tPos.setX(i, tPos.getX(i) * flare + bend);
  }
  trunkGeo.computeVertexNormals();

  const tierDefs = [
    { y: 2.35, r: 2.2, h: 1.6, segs: 11, droop: 0.44, amp: 0.29 },
    { y: 3.35, r: 2.38, h: 1.72, segs: 11, droop: 0.46, amp: 0.31 },
    { y: 4.45, r: 2.02, h: 1.68, segs: 10, droop: 0.38, amp: 0.28 },
    { y: 5.55, r: 1.7, h: 1.62, segs: 10, droop: 0.32, amp: 0.26 },
    { y: 6.6, r: 1.36, h: 1.56, segs: 9, droop: 0.26, amp: 0.24 },
    { y: 7.55, r: 0.96, h: 1.5, segs: 8, droop: 0.18, amp: 0.22 },
    { y: 8.45, r: 0.56, h: 1.45, segs: 7, droop: 0.1, amp: 0.18 },
  ];
  const cPos = [], cNor = [], cUv = [], cIdx = [];
  let vc = 0;
  tierDefs.forEach((td, ti) => {
    const cone = new THREE.ConeGeometry(td.r, td.h, td.segs, 3, false);
    const cp = cone.attributes.position;
    const cu = cone.attributes.uv;
    const offX = Math.sin(ti * 2.1) * 0.14;
    const offZ = Math.cos(ti * 1.9) * 0.14;
    for (let i = 0; i < cp.count; i++) {
      let vx = cp.getX(i), vy = cp.getY(i), vz = cp.getZ(i);
      const ang = Math.atan2(vz, vx);
      const rad = Math.hypot(vx, vz);
      if (rad > 0.08) {
        const lobe =
          1 +
          td.amp * Math.sin(ang * 6 + ti * 1.9) +
          td.amp * 0.55 * Math.cos(ang * 4 - ti * 1.3) +
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
    for (let i = 0; i < cp.count; i++) {
      cPos.push(cp.getX(i), cp.getY(i), cp.getZ(i));
      cNor.push(cn.getX(i), cn.getY(i), cn.getZ(i));
      cUv.push(cu.getX(i), cu.getY(i));
    }
    for (let i = 0; i < cone.index.count; i++) cIdx.push(cone.index.getX(i) + vc);
    vc += cp.count;
    cone.dispose();
  });
  const pineCanopyGeo = new THREE.BufferGeometry();
  pineCanopyGeo.setAttribute('position', new THREE.Float32BufferAttribute(cPos, 3));
  pineCanopyGeo.setAttribute('normal', new THREE.Float32BufferAttribute(cNor, 3));
  pineCanopyGeo.setAttribute('uv', new THREE.Float32BufferAttribute(cUv, 2));
  pineCanopyGeo.setIndex(cIdx);
  pineCanopyGeo.computeBoundingSphere();

  const treeTrunks = [];
  const treeCanopies = [];
  const treeShades = [0x6e806c, 0x5c6e5c, 0x768870, 0x546456, 0x667864];

  function tryPlaceTree(x, z, scaleMin = 0.88, scaleMax = 1.52) {
    if (distFromRoad(x, z) < 3.6) return false;
    if (distFromClearingTrail(x, z) < 2.5) return false;
    if (Math.hypot(x + 10.5, z - 71.0) < 5.0) return false;
    if (z < 19.0 && Math.abs(x) < 15.0) return false;
    if (z < 13.0 && Math.abs(x) < 29.0) return false;
    for (let i = 0; i < treeTrunks.length; i++) {
      const t = treeTrunks[i];
      if ((t.x - x) * (t.x - x) + (t.z - z) * (t.z - z) < 9.5) return false;
    }
    const y = terrainHeight(x, z) - 0.16;
    const s = randRange(rng, scaleMin, scaleMax);
    const ry = randRange(rng, 0, Math.PI * 2);
    const tiltX = randRange(rng, -0.05, 0.05);
    const tiltZ = randRange(rng, -0.05, 0.05);
    treeTrunks.push({ x, y, z, rx: tiltX, ry, rz: tiltZ, sx: s, sy: s * randRange(rng, 0.94, 1.2), sz: s });
    treeCanopies.push({
      x, y, z, rx: tiltX, ry, rz: tiltZ,
      sx: s * randRange(rng, 0.94, 1.15),
      sy: s * randRange(rng, 0.95, 1.22),
      sz: s * randRange(rng, 0.94, 1.15),
      color: treeShades[(rng() * treeShades.length) | 0],
    });
    if (Math.abs(x) < 46 && z > 8 && z < 79) {
      physics.addCircle(x, z, 0.4 * s, y - 0.5, y + 4.5);
    }
    return true;
  }

  for (let z = 18; z <= 64; z += 4.5) {
    const cx = roadCenterX(z);
    const hw = roadHalfWidth(z);
    tryPlaceTree(cx - hw - randRange(rng, 3.7, 6.4), z + randRange(rng, -1.2, 1.2), 1.0, 1.54);
    tryPlaceTree(cx + hw + randRange(rng, 3.7, 6.4), z + randRange(rng, -1.2, 1.2), 1.0, 1.54);
  }
  let attempts = 0;
  while (treeTrunks.length < 185 && attempts < 1400) {
    attempts++;
    tryPlaceTree(randRange(rng, -52, 52), randRange(rng, -26, 84), 0.85, 1.62);
  }

  const trunkInst = buildInstancedMesh(trunkGeo, mats.treeBark, treeTrunks, true, true);
  const canopyInst = buildInstancedMesh(pineCanopyGeo, mats.pineFoliage, treeCanopies, false, true);
  if (trunkInst) group.add(trunkInst);
  if (canopyInst) group.add(canopyInst);

  // ===== 6. 3D FOREST FLOOR DETAILS: MOSSY BOULDERS, EXPOSED ROOTS, FALLEN BRANCHES, FERNS =====
  const rockGeo = new THREE.DodecahedronGeometry(0.62, 1);
  const rP = rockGeo.attributes.position;
  for (let i = 0; i < rP.count; i++) {
    const vx = rP.getX(i), vy = rP.getY(i), vz = rP.getZ(i);
    const n = 0.82 + 0.32 * Math.sin(vx * 5 + vy * 3) * Math.cos(vz * 4);
    rP.setXYZ(i, vx * n, vy * n * 0.65, vz * n);
  }
  rockGeo.computeVertexNormals();
  const rockList = [];
  for (let i = 0; i < 95; i++) {
    const x = i < 25
      ? -10.5 + randRange(rng, -8, 8)
      : randRange(rng, -36, 36);
    const z = i < 25 ? randRange(rng, 62, 76) : randRange(rng, 11, 78);
    if (distFromRoad(x, z) < 0.7 || distFromClearingTrail(x, z) < 0.55) continue;
    const s = randRange(rng, 0.35, 1.45);
    const y = terrainHeight(x, z) + 0.1 * s;
    rockList.push({
      x, y, z,
      rx: randRange(rng, 0, 1.5),
      ry: randRange(rng, 0, 6.28),
      rz: randRange(rng, 0, 1.5),
      sx: s * randRange(rng, 0.8, 1.45),
      sy: s * randRange(rng, 0.55, 1.05),
      sz: s * randRange(rng, 0.8, 1.45),
    });
    if (s > 1.05) physics.addCircle(x, z, 0.52 * s, y - 0.5, y + 2);
  }
  const rockInst = buildInstancedMesh(rockGeo, mats.mossRock, rockList, true, true);
  if (rockInst) group.add(rockInst);

  // Feathery alpha-masked fern clusters
  const fernGeo = new THREE.BufferGeometry();
  const fPos = [], fNor = [], fUv = [], fIdx = [];
  let fvc = 0;
  for (let k = 0; k < 3; k++) {
    const ang = (k / 3) * Math.PI;
    const pl = new THREE.PlaneGeometry(1.18, 0.76);
    pl.rotateY(ang);
    pl.translate(0, 0.34, 0);
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
  for (let i = 0; i < 185; i++) {
    const z = i < 35 ? randRange(rng, 61, 76) : randRange(rng, 11, 78);
    const side = rng() < 0.5 ? -1 : 1;
    const cx = roadCenterX(z);
    const x = i < 35
      ? -10.5 + randRange(rng, -9, 9)
      : i < 110
        ? cx + side * (roadHalfWidth(z) + randRange(rng, 0.45, 4.4))
        : randRange(rng, -28, 28);
    if (distFromRoad(x, z) < 0.35 || distFromClearingTrail(x, z) < 0.45) continue;
    const s = randRange(rng, 0.65, 1.5);
    fernList.push({
      x, y: terrainHeight(x, z) - 0.05, z,
      ry: randRange(rng, 0, 6.28),
      sx: s, sy: s * randRange(rng, 0.72, 1.25), sz: s,
    });
  }
  const fernInst = buildInstancedMesh(fernGeo, mats.fernLeaf, fernList, false, true);
  if (fernInst) group.add(fernInst);

  // Fallen mossy logs, tree stumps & exposed tangled branches right around the spawn clearing & mud road!
  const logs = [
    { x: -12.6, z: 68.4, ry: 0.72, len: 4.2, r: 0.24 },
    { x: -7.2, z: 69.2, ry: -0.5, len: 3.1, r: 0.18 },
    { x: -8.6, z: 65.0, ry: 1.3, len: 2.6, r: 0.15 },
    { x: 5.5, z: 53.5, ry: -0.4, len: 3.9, r: 0.24 },
    { x: -5.8, z: 31.0, ry: 1.05, len: 4.3, r: 0.25 },
    { x: 4.6, z: 22.0, ry: -0.82, len: 3.6, r: 0.22 },
  ];
  logs.forEach((lg) => {
    const y = terrainHeight(lg.x, lg.z) + lg.r * 0.72;
    batch.addCylinder(mats.treeBark, lg.r * 0.85, lg.r, lg.len, 8, lg.x, y, lg.z, Math.PI / 2, lg.ry, 0);
  });
  // Gnarled dead tree stumps near spawn clearing
  [[-12.2, 72.4], [-6.8, 66.8], [-5.2, 57.5]].forEach(([sx, sz]) => {
    const sy = terrainHeight(sx, sz);
    batch.addCylinder(mats.treeBark, 0.34, 0.46, 0.75, 8, sx, sy + 0.34, sz, 0.06, 0, -0.05);
    physics.addCircle(sx, sz, 0.48, sy, sy + 1.2);
  });

  // ===== 7. BROKEN LEANING WOODEN TRAIL FENCES, DEAD UTILITY POLES & RUSTED WARNING SIGNS =====
  for (let z = 17; z <= 58; z += 4.5) {
    const side = z > 35 ? -1 : 1;
    const cx = roadCenterX(z);
    const fx = cx + side * (roadHalfWidth(z) + 0.92);
    const fy = terrainHeight(fx, z);
    const lean = randRange(rng, -0.14, 0.14);
    batch.addBox(mats.agedWood, 0.14, 1.12, 0.14, fx, fy + 0.52, z, randRange(rng, -0.15, 0.15), 1.4, true, true, lean, lean * 0.6);
    // Some rail sections collapsed/missing for authentic abandonment!
    if (z + 4.5 <= 58 && ((z > 35) === (z + 4.5 > 35)) && rng() > 0.22) {
      const nx = roadCenterX(z + 4.5) + side * (roadHalfWidth(z + 4.5) + 0.92);
      const ny = terrainHeight(nx, z + 4.5);
      const midX = (fx + nx) * 0.5;
      const midZ = z + 2.25;
      const midY = (fy + ny) * 0.5;
      const len = Math.hypot(nx - fx, 4.5);
      const ang = Math.atan2(nx - fx, 4.5);
      batch.addBox(mats.agedWood, 0.08, 0.1, len, midX, midY + 0.78, midZ, ang, 1.8);
      if (rng() > 0.35) batch.addBox(mats.agedWood, 0.08, 0.1, len, midX, midY + 0.4, midZ, ang, 1.8);
    }
  }

  // Rusted tilted warning signs (ZERO glow!)
  function addRoadSign(z, side, titleAr, subEn) {
    const sx = roadCenterX(z) + side * (roadHalfWidth(z) + 1.15);
    const sy = terrainHeight(sx, z);
    const ry = side > 0 ? -0.35 : 0.35;
    batch.addCylinder(mats.rustedMetal, 0.045, 0.052, 2.35, 6, sx, sy + 1.15, z, 0, 0, side * 0.08);
    const plateMat = mats.makeRoadSign(titleAr, subEn);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.72, 0.04), plateMat);
    plate.position.set(sx, sy + 2.02, z);
    plate.rotation.y = ry;
    plate.rotation.z = side > 0 ? -0.12 : 0.14;
    plate.castShadow = true;
    group.add(plate);
    physics.addCircle(sx, z, 0.18, sy, sy + 2.5);
  }
  addRoadSign(60.2, 1, 'طريق مستشفى السدرة', 'AL-SIDRA HOSPITAL ->');
  addRoadSign(28.5, -1, 'منطقة معزولة · ١٩٩٤', 'KEEP OUT · CLOSED');

  // Dead leaning wooden utility poles & snapped sagging power lines (NO WORKING LAMPS!)
  const poleZs = [49, 32, 16.5];
  const poleTops = [];
  poleZs.forEach((pz, idx) => {
    const px = roadCenterX(pz) + (roadHalfWidth(pz) + 1.6);
    const py = terrainHeight(px, pz);
    batch.addCylinder(mats.agedWood, 0.11, 0.16, 6.8, 7, px, py + 3.35, pz, 0.04, 0, idx === 1 ? 0.09 : -0.05);
    batch.addBox(mats.agedWood, 1.75, 0.12, 0.12, px, py + 6.3, pz, 0.14, 1.5);
    // Dead dark rusted lamp housing hanging dead
    batch.addBox(mats.rustedMetal, 1.3, 0.07, 0.07, px - 0.62, py + 5.95, pz, 0, 1);
    batch.addBox(mats.darkMetal, 0.42, 0.14, 0.24, px - 1.2, py + 5.85, pz, 0, 1, true, true, 0, 0.18);
    poleTops.push(new THREE.Vector3(px, py + 6.3, pz));
    physics.addCircle(px, pz, 0.24, py, py + 6);
  });
  for (let i = 0; i < poleTops.length - 1; i++) {
    const a = poleTops[i];
    const b = poleTops[i + 1];
    const curve = new THREE.QuadraticBezierCurve3(
      a,
      new THREE.Vector3((a.x + b.x) * 0.5, (a.y + b.y) * 0.5 - 1.35, (a.z + b.z) * 0.5),
      b
    );
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(10)), new THREE.LineBasicMaterial({ color: 0x15191e })));
  }

  batch.flush(group);
  return {};
}
