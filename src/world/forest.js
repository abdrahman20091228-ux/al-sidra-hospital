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
 * V3 REALISTIC MIDNIGHT PINE FOREST & SCULPTED 3D MUDDY ROAD:
 * - ZERO Z-fighting at hospital gate (terrain starts cleanly at z = 8.6 meeting courtyard asphalt flush!)
 * - ZERO floating objects (every tree, stump, boulder, log, post, plank embedded deep into soil!)
 * - Photorealistic branching gnarled pine trees with alpha-masked pine needle boughs (NO low-poly geometric cones!)
 * - Dark muted wild midnight bracken/grass undergrowth (NO bright cartoon paper ferns!)
 * - Smooth anti-aliased 3D muddy road ribbon with sunken culvert bridge & stone abutments flush with ground!
 */
export function buildForestAndRoad(engine, mats, physics) {
  const group = engine.zones.forest;
  const rng = createRng(19941012);
  const batch = new GeometryBatcher();

  // ===== 1. RUGGED 3D FOREST TERRAIN (Starts cleanly at z = 8.6 -> ZERO overlap with courtyard asphalt!) =====
  const terrW = 116;
  const zMinTerr = 8.6;
  const zMaxTerr = 88.0;
  const terrD = zMaxTerr - zMinTerr;
  const terrGeo = new THREE.PlaneGeometry(terrW, terrD, 90, 74);
  terrGeo.rotateX(-Math.PI / 2);
  const pos = terrGeo.attributes.position;
  const uv = terrGeo.attributes.uv;
  const zCenter = (zMinTerr + zMaxTerr) * 0.5;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i) + zCenter;
    let y = terrainHeight(x, z);
    // Sink coarse forest turf under the sculpted muddy road so grass never pokes through mud ruts
    const rd = distFromRoad(x, z);
    if (rd < 0.7 && z >= 8.7 && z <= 64.8) {
      y -= (0.7 - rd) * 0.34;
    }
    pos.setXYZ(i, x, y, z);
    uv.setXY(i, x / 4.2, z / 4.2);
  }
  terrGeo.computeVertexNormals();
  const terrMesh = new THREE.Mesh(terrGeo, mats.forestGround);
  terrMesh.receiveShadow = true;
  group.add(terrMesh);

  // ===== 2. SCULPTED 3D MUDDY ROAD RIBBON (Clean edge at z = 8.6 flush with asphalt — ZERO Z-fighting!) =====
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
    const gateBlend = Math.min(1, Math.max(0, (z - 8.6) / 3.8));
    for (let c = 0; c <= cols; c++) {
      const u = c / cols;
      const edgeT = (u - 0.5) * 2;
      const x = cx + edgeT * (hw + 0.95);
      const baseH = terrainHeight(x, z);
      const skirt = Math.abs(edgeT) > 0.84 ? -0.18 * ((Math.abs(edgeT) - 0.84) / 0.16) : 0.004 + 0.022 * gateBlend;
      rPos.push(x, baseH + skirt, z);
      rUv.push(u * 1.1, (zStart - z) / 3.8);
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

  // Muddy Clearing Spur Trail from spawn (-10.5, 71) curving smoothly into the main muddy road
  const spurSteps = 24;
  const spPos = [];
  const spUv = [];
  const spIdx = [];
  for (let i = 0; i <= spurSteps; i++) {
    const t = i / spurSteps;
    const z = 72.8 - t * 11.8;
    const cx = -10.5 + (1 - Math.cos(t * Math.PI)) * 0.5 * 8.6;
    const hw = 1.65;
    for (let c = 0; c <= 6; c++) {
      const u = c / 6;
      const e = (u - 0.5) * 2;
      const x = cx + e * (hw + 0.45);
      const drop = Math.abs(e) > 0.78 ? -0.14 : 0.032 - Math.exp(-Math.pow((Math.abs(e) - 0.42) / 0.25, 2)) * 0.05;
      spPos.push(x, terrainHeight(x, z) + drop, z);
      spUv.push(u * 1.15, t * 4.4);
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

  // ===== 3. RECESSED WET PUDDLES NESTLED FLUSH INSIDE THE MUD RUTS =====
  const puddleZs = [59.5, 52.5, 45.5, 39.0, 32.5, 26.0, 20.5];
  const puddleGeo = new THREE.PlaneGeometry(2.0, 2.0);
  puddleGeo.rotateX(-Math.PI / 2);
  puddleZs.forEach((pz, idx) => {
    const side = idx % 2 === 0 ? -1.05 : 1.05;
    const px = roadCenterX(pz) + side;
    const py = terrainHeight(px, pz) + 0.042;
    const m = new THREE.Mesh(puddleGeo, mats.mudPuddle);
    m.position.set(px, py, pz);
    m.scale.set(randRange(rng, 0.55, 0.85), 1, randRange(rng, 1.35, 2.3));
    m.rotation.y = randRange(rng, -0.16, 0.16);
    m.receiveShadow = true;
    group.add(m);
  });

  // ===== 4. GROUNDED WOODEN CULVERT CROSSING FLUSH WITH MUDDY APPROACH (ZERO FLOATING!) =====
  // Dark mud-stained timber sleeper beams tucked completely beneath the planks (zero protruding grey blocks!)
  for (const sx of [-2.15, 0.0, 2.15]) {
    batch.addBox(mats.agedWood, 0.28, 0.34, 2.75, sx, -0.26, 12.6, 0, 1.5);
  }
  for (let p = 0; p < 7; p++) {
    const pz = 11.25 + p * 0.44;
    const groundY = Math.min(terrainHeight(-1.5, pz), terrainHeight(0, pz), terrainHeight(1.5, pz));
    batch.addBox(
      mats.agedWood,
      5.15 + randRange(rng, -0.12, 0.12),
      0.13,
      0.39,
      randRange(rng, -0.04, 0.04),
      groundY - 0.032, // Embedded cleanly flush into mud so you NEVER walk on air or see a step lip!
      pz,
      randRange(rng, -0.018, 0.018),
      1.6
    );
  }
  // Rusted wooden quarantine barricade sawhorse sunk cleanly into soil beside approach
  const barX = -2.6;
  const barZ = 15.2;
  const barY = terrainHeight(barX, barZ) - 0.08;
  batch.addBox(mats.agedWood, 2.1, 0.22, 0.07, barX, barY + 0.82, barZ, 0.42, 1.5);
  batch.addBox(mats.redRustMetal, 2.12, 0.14, 0.08, barX, barY + 0.54, barZ, 0.42, 1.5);
  batch.addBox(mats.agedWood, 0.1, 1.15, 0.1, barX - 0.82, barY + 0.44, barZ - 0.3, 0.42, 1);
  batch.addBox(mats.agedWood, 0.1, 1.15, 0.1, barX + 0.82, barY + 0.44, barZ + 0.3, 0.42, 1);
  physics.addCircle(barX, barZ, 0.65, barY, barY + 1.2);

  // ===== 5. PHOTOREALISTIC BRANCHING GNARLED PINE TREES (ZERO LOW-POLY GEOMETRIC CONES!) =====
  // Trunk with organic root flare & slight natural bend + natural dark limbs tucked inside pine boughs
  const trunkParts = [];
  const mainTrunk = new THREE.CylinderGeometry(0.08, 0.34, 9.2, 8, 4);
  mainTrunk.translate(0, 4.4, 0);
  const tp = mainTrunk.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    const y = tp.getY(i);
    const flare = y < 1.1 ? 1 + (1.1 - y) * 0.48 : 1;
    const bend = Math.sin(y * 0.42) * 0.14;
    tp.setX(i, tp.getX(i) * flare + bend);
  }
  mainTrunk.computeVertexNormals();
  trunkParts.push(mainTrunk);

  // Organic woody limbs tucked naturally downward inside the pine bough canopy
  for (let b = 0; b < 6; b++) {
    const by = 3.0 + b * 0.78;
    const ang = b * 2.15;
    const limb = new THREE.CylinderGeometry(0.02, 0.055, 0.88 - b * 0.05, 5);
    limb.rotateZ(Math.PI * 0.36);
    limb.rotateY(ang);
    limb.translate(Math.cos(ang) * 0.34, by, -Math.sin(ang) * 0.34);
    trunkParts.push(limb);
  }
  // Merge trunk + limbs cleanly into one InstancedMesh geometry
  const mPos = [], mNor = [], mUv = [], mIdx = [];
  let mOff = 0;
  trunkParts.forEach((g) => {
    const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      mPos.push(p.getX(i), p.getY(i), p.getZ(i));
      mNor.push(n.getX(i), n.getY(i), n.getZ(i));
      mUv.push(u.getX(i), u.getY(i));
    }
    for (let i = 0; i < g.index.count; i++) mIdx.push(g.index.getX(i) + mOff);
    mOff += p.count;
    g.dispose();
  });
  const trunkGeo = new THREE.BufferGeometry();
  trunkGeo.setAttribute('position', new THREE.Float32BufferAttribute(mPos, 3));
  trunkGeo.setAttribute('normal', new THREE.Float32BufferAttribute(mNor, 3));
  trunkGeo.setAttribute('uv', new THREE.Float32BufferAttribute(mUv, 2));
  trunkGeo.setIndex(mIdx);

  // Layered organic drooping pine-bough cards (alpha-masked pine_bough.png — zero giant geometric triangles!)
  const bPos = [], bNor = [], bUv = [], bIdx = [];
  let bOff = 0;
  const boughTiers = [
    { y: 2.8, count: 6, r: 1.65, w: 2.35, h: 2.1, droop: 0.42 },
    { y: 4.1, count: 6, r: 1.48, w: 2.15, h: 1.95, droop: 0.36 },
    { y: 5.4, count: 5, r: 1.24, w: 1.9, h: 1.8, droop: 0.30 },
    { y: 6.6, count: 5, r: 0.96, w: 1.65, h: 1.6, droop: 0.22 },
    { y: 7.7, count: 4, r: 0.65, w: 1.35, h: 1.45, droop: 0.14 },
    { y: 8.6, count: 3, r: 0.32, w: 1.05, h: 1.25, droop: 0.05 },
  ];
  boughTiers.forEach((tier, ti) => {
    for (let k = 0; k < tier.count; k++) {
      const ang = (k / tier.count) * Math.PI * 2 + ti * 0.72;
      // Two crossed drooping bough cards per whorl branch for lush 3D volume from EVERY viewing angle!
      const card = new THREE.PlaneGeometry(tier.w, tier.h);
      card.translate(0, tier.h * 0.42, 0);
      card.rotateX(-Math.PI * 0.34 - tier.droop * 0.4);
      card.rotateY(ang);
      card.translate(Math.sin(ang) * (tier.r * 0.25), tier.y, Math.cos(ang) * (tier.r * 0.25));
      const p = card.attributes.position, n = card.attributes.normal, u = card.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        bPos.push(p.getX(i), p.getY(i), p.getZ(i));
        bNor.push(n.getX(i), n.getY(i), n.getZ(i));
        bUv.push(u.getX(i), u.getY(i));
      }
      for (let i = 0; i < card.index.count; i++) bIdx.push(card.index.getX(i) + bOff);
      bOff += p.count;
      card.dispose();
    }
  });
  const pineCanopyGeo = new THREE.BufferGeometry();
  pineCanopyGeo.setAttribute('position', new THREE.Float32BufferAttribute(bPos, 3));
  pineCanopyGeo.setAttribute('normal', new THREE.Float32BufferAttribute(bNor, 3));
  pineCanopyGeo.setAttribute('uv', new THREE.Float32BufferAttribute(bUv, 2));
  pineCanopyGeo.setIndex(bIdx);
  pineCanopyGeo.computeBoundingSphere();

  const treeTrunks = [];
  const treeCanopies = [];
  const treeShades = [0x6e7e6c, 0x5c6d5a, 0x768470, 0x566454, 0x667462];

  function tryPlaceTree(x, z, scaleMin = 0.88, scaleMax = 1.48) {
    if (distFromRoad(x, z) < 3.8) return false;
    if (distFromClearingTrail(x, z) < 2.6) return false;
    if (Math.hypot(x + 10.5, z - 71.0) < 5.2) return false;
    if (z < 19.5 && Math.abs(x) < 15.5) return false;
    if (z < 13.5 && Math.abs(x) < 29.0) return false;
    for (let i = 0; i < treeTrunks.length; i++) {
      const t = treeTrunks[i];
      if ((t.x - x) * (t.x - x) + (t.z - z) * (t.z - z) < 10.2) return false;
    }
    const y = terrainHeight(x, z) - 0.35; // Sunk deeply into soil -> ZERO floating roots!
    const s = randRange(rng, scaleMin, scaleMax);
    const ry = randRange(rng, 0, Math.PI * 2);
    const tiltX = randRange(rng, -0.04, 0.04);
    const tiltZ = randRange(rng, -0.04, 0.04);
    treeTrunks.push({ x, y, z, rx: tiltX, ry, rz: tiltZ, sx: s, sy: s * randRange(rng, 0.94, 1.18), sz: s });
    treeCanopies.push({
      x, y, z, rx: tiltX, ry, rz: tiltZ,
      sx: s * randRange(rng, 0.94, 1.14),
      sy: s * randRange(rng, 0.95, 1.2),
      sz: s * randRange(rng, 0.94, 1.14),
      color: treeShades[(rng() * treeShades.length) | 0],
    });
    if (Math.abs(x) < 46 && z > 8.6 && z < 79) {
      physics.addCircle(x, z, 0.38 * s, y - 0.5, y + 4.5, true);
    }
    return true;
  }

  for (let z = 19; z <= 64; z += 4.8) {
    const cx = roadCenterX(z);
    const hw = roadHalfWidth(z);
    tryPlaceTree(cx - hw - randRange(rng, 4.0, 6.8), z + randRange(rng, -1.2, 1.2), 0.95, 1.48);
    tryPlaceTree(cx + hw + randRange(rng, 4.0, 6.8), z + randRange(rng, -1.2, 1.2), 0.95, 1.48);
  }
  let attempts = 0;
  while (treeTrunks.length < 165 && attempts < 1400) {
    attempts++;
    tryPlaceTree(randRange(rng, -52, 52), randRange(rng, 10, 84), 0.85, 1.55);
  }

  const trunkInst = buildInstancedMesh(trunkGeo, mats.treeBark, treeTrunks, true, true);
  const canopyInst = buildInstancedMesh(pineCanopyGeo, mats.pineBough, treeCanopies, false, true);
  if (trunkInst) group.add(trunkInst);
  if (canopyInst) group.add(canopyInst);

  // ===== 6. EMBEDDED MOSSY BOULDERS, DARK WILD SHRUBS, FALLEN LOGS & STUMPS (ZERO FLOATING!) =====
  const rockGeo = new THREE.DodecahedronGeometry(0.62, 1);
  const rP = rockGeo.attributes.position;
  for (let i = 0; i < rP.count; i++) {
    const vx = rP.getX(i), vy = rP.getY(i), vz = rP.getZ(i);
    const n = 0.82 + 0.32 * Math.sin(vx * 5 + vy * 3) * Math.cos(vz * 4);
    rP.setXYZ(i, vx * n, vy * n * 0.65, vz * n);
  }
  rockGeo.computeVertexNormals();
  const rockList = [];
  for (let i = 0; i < 85; i++) {
    const x = i < 22 ? -10.5 + randRange(rng, -8, 8) : randRange(rng, -36, 36);
    const z = i < 22 ? randRange(rng, 62, 76) : randRange(rng, 12, 78);
    if (distFromRoad(x, z) < 0.85 || distFromClearingTrail(x, z) < 0.65) continue;
    const s = randRange(rng, 0.35, 1.35);
    // Sink rock center below ground so bottom NEVER floats on slopes!
    const y = terrainHeight(x, z) - 0.14 * s;
    rockList.push({
      x, y, z,
      rx: randRange(rng, 0, 1.5),
      ry: randRange(rng, 0, 6.28),
      rz: randRange(rng, 0, 1.5),
      sx: s * randRange(rng, 0.85, 1.45),
      sy: s * randRange(rng, 0.55, 0.95),
      sz: s * randRange(rng, 0.85, 1.45),
    });
    if (s > 1.05) physics.addCircle(x, z, 0.48 * s, y - 0.5, y + 2);
  }
  const rockInst = buildInstancedMesh(rockGeo, mats.mossRock, rockList, true, true);
  if (rockInst) group.add(rockInst);

  // Dark wispy wild forest bracken / dead grass tufts (replaces cartoon bright paper ferns!)
  const shrubGeo = new THREE.BufferGeometry();
  const fPos = [], fNor = [], fUv = [], fIdx = [];
  let fvc = 0;
  for (let k = 0; k < 3; k++) {
    const ang = (k / 3) * Math.PI;
    const pl = new THREE.PlaneGeometry(0.95, 0.68);
    pl.rotateY(ang);
    pl.translate(0, 0.28, 0);
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
  shrubGeo.setAttribute('position', new THREE.Float32BufferAttribute(fPos, 3));
  shrubGeo.setAttribute('normal', new THREE.Float32BufferAttribute(fNor, 3));
  shrubGeo.setAttribute('uv', new THREE.Float32BufferAttribute(fUv, 2));
  shrubGeo.setIndex(fIdx);
  const shrubList = [];
  for (let i = 0; i < 160; i++) {
    const z = i < 30 ? randRange(rng, 61, 76) : randRange(rng, 12, 78);
    const side = rng() < 0.5 ? -1 : 1;
    const cx = roadCenterX(z);
    const x = i < 30
      ? -10.5 + randRange(rng, -9, 9)
      : i < 105
        ? cx + side * (roadHalfWidth(z) + randRange(rng, 0.55, 4.4))
        : randRange(rng, -28, 28);
    if (distFromRoad(x, z) < 0.45 || distFromClearingTrail(x, z) < 0.55) continue;
    const s = randRange(rng, 0.65, 1.35);
    // Sink base -0.10m into soil so shrubs NEVER hover on hillsides!
    shrubList.push({
      x, y: terrainHeight(x, z) - 0.1, z,
      ry: randRange(rng, 0, 6.28),
      sx: s, sy: s * randRange(rng, 0.65, 1.1), sz: s,
    });
  }
  const shrubInst = buildInstancedMesh(shrubGeo, mats.forestShrub, shrubList, false, true);
  if (shrubInst) group.add(shrubInst);

  // Fallen mossy logs (sample both ends so logs rest snugly on ground, never floating!)
  const logs = [
    { x: -12.8, z: 68.4, ry: 0.72, len: 3.8, r: 0.24 },
    { x: -7.2, z: 69.0, ry: -0.5, len: 2.8, r: 0.18 },
    { x: 5.8, z: 53.5, ry: -0.4, len: 3.6, r: 0.24 },
    { x: -5.8, z: 31.0, ry: 1.05, len: 3.8, r: 0.25 },
    { x: 4.8, z: 22.0, ry: -0.82, len: 3.2, r: 0.22 },
  ];
  logs.forEach((lg) => {
    const dx = Math.sin(lg.ry) * (lg.len * 0.45);
    const dz = Math.cos(lg.ry) * (lg.len * 0.45);
    const yMin = Math.min(terrainHeight(lg.x - dx, lg.z - dz), terrainHeight(lg.x, lg.z), terrainHeight(lg.x + dx, lg.z + dz));
    batch.addCylinder(mats.treeBark, lg.r * 0.85, lg.r, lg.len, 8, lg.x, yMin + lg.r * 0.48, lg.z, Math.PI / 2, lg.ry, 0);
  });

  // Gnarled dead tree stumps deeply rooted into soil (-0.22m base)
  [[-12.2, 72.4], [-6.8, 66.8], [-5.2, 57.5]].forEach(([sx, sz]) => {
    const sy = terrainHeight(sx, sz);
    batch.addCylinder(mats.treeBark, 0.34, 0.48, 0.96, 8, sx, sy + 0.22, sz, 0.05, 0, -0.04);
    physics.addCircle(sx, sz, 0.44, sy - 0.3, sy + 1.2);
  });

  // ===== 7. BROKEN LEANING WOODEN TRAIL FENCES, DEAD UTILITY POLES & RUSTED WARNING SIGNS =====
  for (let z = 17; z <= 58; z += 4.5) {
    const side = z > 35 ? -1 : 1;
    const cx = roadCenterX(z);
    const fx = cx + side * (roadHalfWidth(z) + 0.95);
    const fy = terrainHeight(fx, z);
    const lean = randRange(rng, -0.12, 0.12);
    // Embed post 0.28m deep into ground so it never floats on slopes
    batch.addBox(mats.agedWood, 0.14, 1.38, 0.14, fx, fy + 0.42, z, randRange(rng, -0.12, 0.12), 1.4, true, true, lean, lean * 0.6);
    if (z + 4.5 <= 58 && ((z > 35) === (z + 4.5 > 35)) && rng() > 0.22) {
      const nx = roadCenterX(z + 4.5) + side * (roadHalfWidth(z + 4.5) + 0.95);
      const ny = terrainHeight(nx, z + 4.5);
      const midX = (fx + nx) * 0.5;
      const midZ = z + 2.25;
      const midY = (fy + ny) * 0.5;
      const len = Math.hypot(nx - fx, 4.5);
      const ang = Math.atan2(nx - fx, 4.5);
      batch.addBox(mats.agedWood, 0.08, 0.1, len, midX, midY + 0.76, midZ, ang, 1.8);
      if (rng() > 0.35) batch.addBox(mats.agedWood, 0.08, 0.1, len, midX, midY + 0.38, midZ, ang, 1.8);
    }
  }

  function addRoadSign(z, side, titleAr, subEn) {
    const sx = roadCenterX(z) + side * (roadHalfWidth(z) + 1.15);
    const sy = terrainHeight(sx, z);
    const ry = side > 0 ? -0.35 : 0.35;
    batch.addCylinder(mats.rustedMetal, 0.045, 0.052, 2.65, 6, sx, sy + 1.0, z, 0, 0, side * 0.07);
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

  const poleZs = [49, 32, 16.5];
  const poleTops = [];
  poleZs.forEach((pz, idx) => {
    const px = roadCenterX(pz) + (roadHalfWidth(pz) + 1.65);
    const py = terrainHeight(px, pz);
    batch.addCylinder(mats.agedWood, 0.11, 0.16, 7.2, 7, px, py + 3.15, pz, 0.04, 0, idx === 1 ? 0.08 : -0.05);
    batch.addBox(mats.agedWood, 1.75, 0.12, 0.12, px, py + 6.3, pz, 0.14, 1.5);
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
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(10)), new THREE.LineBasicMaterial({ color: 0x101318 })));
  }

  batch.flush(group);
  return {};
}
