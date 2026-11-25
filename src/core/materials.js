import * as THREE from 'three';

function createCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/**
 * Silent Hill PBR Material Library:
 * - ZERO flat untextured prop materials! Every surface & prop has real albedo + normal (+ roughness where needed).
 * - ZERO powered/glowing interior lights — everything is dead, dusty, rusted, and abandoned since 1994.
 */
export function createMaterialLibrary(maxAnisotropy = 4) {
  const loader = new THREE.TextureLoader();
  const basePath = './textures/';

  function loadTex(file, isColor = true, repX = 1, repY = 1, clampY = false) {
    const tex = loader.load(basePath + file);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = clampY ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
    tex.repeat.set(repX, repY);
    tex.anisotropy = maxAnisotropy;
    tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    return tex;
  }

  function pbr(name, opts = {}) {
    const repX = opts.repX ?? 1;
    const repY = opts.repY ?? 1;
    const clampY = opts.clampY ?? false;
    const map = loadTex(`${name}.jpg`, true, repX, repY, clampY);
    const matOpts = {
      map,
      color: opts.color ?? 0xffffff,
      roughness: opts.roughness ?? 0.88,
      metalness: opts.metalness ?? 0.04,
    };
    if (opts.normal !== false) {
      matOpts.normalMap = loadTex(`${name}_n.jpg`, false, repX, repY, clampY);
      const ns = opts.normalScale ?? 1.05;
      matOpts.normalScale = new THREE.Vector2(ns, ns);
    }
    if (opts.roughMap) {
      matOpts.roughnessMap = loadTex(`${name}_r.jpg`, false, repX, repY, clampY);
      matOpts.roughness = 1.0; // modulated by roughnessMap
    }
    if (opts.side !== undefined) matOpts.side = opts.side;
    if (opts.transparent) {
      matOpts.transparent = true;
      matOpts.opacity = opts.opacity ?? 0.8;
    }
    return new THREE.MeshStandardMaterial(matOpts);
  }

  const mats = {
    // ===== FOREST & 3D-RELIEF MUDDY ROAD =====
    forestGround: pbr('forest_ground', { roughness: 1.0, roughMap: true, metalness: 0.0, normalScale: 1.85, color: 0xa4ab94 }),
    mudRoad: pbr('mud_road', { roughness: 1.0, roughMap: true, metalness: 0.16, normalScale: 2.75, color: 0xe2c4a2 }),
    mudPuddle: new THREE.MeshStandardMaterial({
      map: loadTex('decal_puddle.png', true, 1, 1),
      color: 0x627a84,
      roughness: 0.08,
      metalness: 0.52,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
    treeBark: pbr('tree_bark', { roughness: 0.96, metalness: 0.0, normalScale: 1.55, color: 0xb0a090 }),
    pineFoliage: pbr('pine_foliage', { roughness: 0.9, metalness: 0.0, normalScale: 0.9, color: 0x869e82 }),
    fernLeaf: (() => {
      const c = createCanvas(256, 256);
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, 256, 256);
      const fronds = [-0.66, -0.34, 0, 0.34, 0.66];
      fronds.forEach((ang, fi) => {
        ctx.save();
        ctx.translate(128, 252);
        ctx.rotate(ang);
        const len = fi === 2 ? 226 : fi === 1 || fi === 3 ? 196 : 162;
        ctx.strokeStyle = '#253822';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(ang * 25, -len * 0.5, ang * 45, -len);
        ctx.stroke();
        for (let t = 0.14; t < 0.96; t += 0.075) {
          const y = -len * t;
          const x = ang * 45 * t * t;
          const leafW = (1 - Math.abs(t - 0.45)) * 34;
          ctx.fillStyle = t > 0.6 ? '#3a5434' : '#2a4026';
          ctx.beginPath();
          ctx.ellipse(x - leafW * 0.5, y, leafW * 0.55, 5.5, -0.35, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(x + leafW * 0.5, y, leafW * 0.55, 5.5, 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({
        map: tex,
        alphaTest: 0.35,
        roughness: 0.88,
        metalness: 0.0,
        side: THREE.DoubleSide,
      });
    })(),
    mossRock: pbr('facade_concrete', { roughness: 1.0, roughMap: true, metalness: 0.02, normalScale: 1.45, color: 0x626b60 }),

    // ===== ABANDONED EXTERIOR =====
    asphalt: pbr('asphalt', { roughness: 1.0, roughMap: true, metalness: 0.05, normalScale: 1.1, color: 0x9aa0a6 }),
    facadeConcrete: pbr('facade_concrete', { roughness: 1.0, roughMap: true, metalness: 0.03, normalScale: 1.05, color: 0xc2beb2 }),
    facadeTrim: pbr('facade_concrete', { roughness: 0.9, metalness: 0.04, normalScale: 0.85, color: 0x848682 }),
    ironFence: pbr('rusted_metal', { roughness: 1.0, roughMap: true, metalness: 0.55, normalScale: 0.9, color: 0x6c584c }),
    boardWood: pbr('aged_wood', { roughness: 1.0, roughMap: true, metalness: 0.02, normalScale: 1.05, color: 0xae967a }),

    // ===== SILENT HILL HOSPITAL INTERIORS (SMOOTH DECAYING BROOKHAVEN PLASTER + DADO WALLS!) =====
    corridorWall: pbr('corridor_wall', { roughness: 1.0, roughMap: true, metalness: 0.02, normalScale: 0.68, clampY: true, color: 0xd6d4c8 }),
    wardWall: pbr('ward_wall', { roughness: 1.0, roughMap: true, metalness: 0.02, normalScale: 0.68, clampY: true, color: 0xcacabe }),
    adminWall: pbr('ward_wall', { roughness: 1.0, roughMap: true, metalness: 0.02, normalScale: 0.65, clampY: true, color: 0xc2b09a }),
    sterileTile: pbr('sterile_tile', { roughness: 1.0, roughMap: true, metalness: 0.08, normalScale: 0.95, color: 0xbfc9c2 }),
    morgueTile: pbr('morgue_tile', { roughness: 1.0, roughMap: true, metalness: 0.12, normalScale: 0.95, color: 0xa0aeb6 }),
    hospitalFloor: pbr('hospital_floor', { roughness: 1.0, roughMap: true, metalness: 0.06, normalScale: 0.88, color: 0xb8b6aa }),
    sterileFloor: pbr('sterile_tile', { roughness: 1.0, roughMap: true, metalness: 0.08, normalScale: 0.85, color: 0xa2aeaa }),
    morgueFloor: pbr('morgue_tile', { roughness: 1.0, roughMap: true, metalness: 0.12, normalScale: 0.88, color: 0x86949c }),
    ceilingTile: pbr('ceiling_tile', { roughness: 0.95, metalness: 0.02, normalScale: 0.95, color: 0xaba79b }),
    bumperRail: pbr('dark_leather', { roughness: 1.0, roughMap: true, metalness: 0.12, normalScale: 0.45, color: 0x505856 }),

    // ===== RICH TEXTURED PROP MATERIALS (ZERO FLAT UNTEXTURED BOXES!) =====
    agedWood: pbr('aged_wood', { roughness: 1.0, roughMap: true, metalness: 0.03, normalScale: 0.85, color: 0xc2ac90 }),
    darkWood: pbr('aged_wood', { roughness: 1.0, roughMap: true, metalness: 0.04, normalScale: 0.8, color: 0x826850 }),
    rustedMetal: pbr('rusted_metal', { roughness: 1.0, roughMap: true, metalness: 0.56, normalScale: 0.9, color: 0xcab8a8 }),
    stainlessSteel: pbr('brushed_steel', { roughness: 1.0, roughMap: true, metalness: 0.78, normalScale: 0.42, color: 0xd0d8d8 }),
    paintedMetal: pbr('chipped_enamel', { roughness: 1.0, roughMap: true, metalness: 0.28, normalScale: 0.62, color: 0xb6c0b8 }),
    darkMetal: pbr('rusted_metal', { roughness: 1.0, roughMap: true, metalness: 0.6, normalScale: 0.75, color: 0x5c5854 }),
    redRustMetal: pbr('rusted_metal', { roughness: 1.0, roughMap: true, metalness: 0.42, normalScale: 0.85, color: 0x983e36 }),
    fabricSheet: pbr('fabric_sheet', { roughness: 0.95, metalness: 0.0, normalScale: 0.55, color: 0xc8c0ac }),
    blanketGreen: pbr('fabric_sheet', { roughness: 0.96, metalness: 0.0, normalScale: 0.6, color: 0x5a6858 }),
    curtainTeal: pbr('fabric_sheet', { roughness: 0.94, metalness: 0.0, normalScale: 0.55, color: 0x6a7c72, side: THREE.DoubleSide }),
    leatherDark: pbr('dark_leather', { roughness: 1.0, roughMap: true, metalness: 0.08, normalScale: 0.42, color: 0xa69c94 }),
    plasticBeige: pbr('chipped_enamel', { roughness: 0.78, metalness: 0.08, normalScale: 0.4, color: 0xb0a68e }),
    cardboardBox: pbr('cardboard_box', { roughness: 0.94, metalness: 0.0, normalScale: 0.65, color: 0xc6b498 }),
    paperWhite: new THREE.MeshStandardMaterial({
      map: loadTex('dirty_paper.jpg', true, 1, 1),
      roughness: 0.94,
      metalness: 0.0,
      side: THREE.DoubleSide,
    }),
    medicineBlue: pbr('chipped_enamel', { roughness: 0.42, metalness: 0.14, normalScale: 0.35, color: 0x42667a }),
    medicineAmber: pbr('rusted_metal', { roughness: 0.34, metalness: 0.12, normalScale: 0.35, color: 0x8a5224 }),
    rubberTire: pbr('dark_leather', { roughness: 0.94, metalness: 0.04, normalScale: 0.55, color: 0x444446 }),
    glassClear: new THREE.MeshStandardMaterial({
      color: 0x0b1014,
      roughness: 0.24,
      metalness: 0.35,
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
    }),
    glassFrosted: new THREE.MeshStandardMaterial({
      color: 0x161f24,
      roughness: 0.58,
      metalness: 0.16,
      transparent: true,
      opacity: 0.68,
    }),

    // ===== DEAD UNPOWERED FIXTURES (ZERO ELECTRICITY IN THE ABANDONED HOSPITAL!) =====
    lampOff: pbr('chipped_enamel', { roughness: 0.62, metalness: 0.12, normalScale: 0.4, color: 0x6a6e68 }),
    exitDead: pbr('chipped_enamel', { roughness: 0.65, metalness: 0.15, normalScale: 0.4, color: 0x3f5246 }),
    crtDead: pbr('dark_leather', { roughness: 0.22, metalness: 0.3, normalScale: 0.25, color: 0x222826 }),
    xrayDead: new THREE.MeshStandardMaterial({
      map: loadTex('xray_film.jpg', true, 1, 1),
      roughness: 0.32,
      metalness: 0.08,
    }),
    // Subtle warm-amber glint ONLY on interactive story cassette/files so player spots clues under flashlight
    clueFolder: new THREE.MeshStandardMaterial({
      map: loadTex('dirty_paper.jpg', true, 1, 1),
      color: 0xf2d692,
      emissive: new THREE.Color(0x3a280a),
      emissiveIntensity: 0.35,
      roughness: 0.75,
    }),

    // ===== WEATHERING DECALS (GRIME, WATER LEAKS, CREEPING IVY!) =====
    decalGrime: new THREE.MeshStandardMaterial({
      map: loadTex('decal_grime.png', true, 1, 1),
      transparent: true,
      depthWrite: false,
      roughness: 0.92,
      metalness: 0.0,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
    decalIvy: new THREE.MeshStandardMaterial({
      map: loadTex('decal_ivy.png', true, 1, 1),
      alphaTest: 0.3,
      roughness: 0.88,
      metalness: 0.0,
      side: THREE.DoubleSide,
    }),
  };

  // ===== WEATHERED RUSTED SIGNAGE GENERATORS =====
  const signCache = new Map();

  mats.makeHospitalFacadeSign = () => {
    const c = createCanvas(1024, 256);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#24231e';
    ctx.fillRect(0, 0, 1024, 256);
    // Heavy rust patches
    for (let i = 0; i < 42; i++) {
      const rx = (i * 73) % 1024;
      const ry = (i * 41) % 256;
      const rr = 22 + (i * 17) % 68;
      const g = ctx.createRadialGradient(rx, ry, 2, rx, ry, rr);
      g.addColorStop(0, 'rgba(92, 46, 22, 0.58)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(rx - rr, ry - rr, rr * 2, rr * 2);
    }
    ctx.strokeStyle = '#52463a';
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, 1004, 236);
    // Faded cracked medical cross
    ctx.fillStyle = '#5c201a';
    ctx.fillRect(830, 44, 136, 168);
    ctx.fillStyle = '#b4aa96';
    ctx.fillRect(884, 74, 28, 108);
    ctx.fillRect(844, 114, 108, 28);
    ctx.fillStyle = '#cfc6b0';
    ctx.font = '900 78px Cairo, Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';
    ctx.fillText('مستشفى السدرة الريفي', 435, 104);
    ctx.fillStyle = '#8b8676';
    ctx.font = '700 28px "Share Tech Mono", monospace';
    ctx.direction = 'ltr';
    ctx.fillText('AL-SIDRA RURAL HOSPITAL · CLOSED 1994', 435, 184);
    // Rain rust streaks dripping down letters
    for (let i = 0; i < 55; i++) {
      const rx = (i * 19) % 1010;
      ctx.fillStyle = 'rgba(28,16,8,0.34)';
      ctx.fillRect(rx, 0, 3 + (i % 6), 55 + (i * 23) % 180);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0.22 });
  };

  mats.makeRoadSign = (titleAr, subEn) => {
    const key = `road_${titleAr}`;
    if (signCache.has(key)) return signCache.get(key);
    const c = createCanvas(512, 256);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#9c8644';
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = '#1d1914';
    ctx.lineWidth = 14;
    ctx.strokeRect(12, 12, 488, 232);
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = 'rgba(58,32,16,0.34)';
      ctx.beginPath();
      ctx.arc((i * 53) % 512, (i * 37) % 256, 14 + (i % 24), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#181410';
    ctx.font = '900 42px Cairo, Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';
    ctx.fillText(titleAr, 256, 102);
    ctx.font = '700 22px "Share Tech Mono", monospace';
    ctx.direction = 'ltr';
    ctx.fillText(subEn, 256, 178);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0.25 });
    signCache.set(key, mat);
    return mat;
  };

  mats.makeRoomPlaque = (titleAr, codeEn, accent = '#3a4f4a') => {
    const key = `plaque_${titleAr}_${codeEn}`;
    if (signCache.has(key)) return signCache.get(key);
    const c = createCanvas(512, 160);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1c1d1a';
    ctx.fillRect(0, 0, 512, 160);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 512, 22);
    ctx.strokeStyle = '#4c4a42';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 504, 152);
    ctx.fillStyle = '#c8c2b2';
    ctx.font = '700 44px Cairo, Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';
    ctx.fillText(titleAr, 256, 78);
    ctx.fillStyle = '#7e8680';
    ctx.font = '700 20px "Share Tech Mono", monospace';
    ctx.direction = 'ltr';
    ctx.fillText(codeEn, 256, 130);
    ctx.fillStyle = 'rgba(26,18,10,0.34)';
    ctx.fillRect(0, 0, 512, 160);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.78, metalness: 0.18 });
    signCache.set(key, mat);
    return mat;
  };

  mats.makeDirectoryBoard = () => {
    const c = createCanvas(512, 640);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1a1b18';
    ctx.fillRect(0, 0, 512, 640);
    ctx.fillStyle = '#2d3f3a';
    ctx.fillRect(0, 0, 512, 86);
    ctx.strokeStyle = '#565248';
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, 500, 628);
    ctx.fillStyle = '#d0c8b4';
    ctx.font = '900 36px Cairo, Tahoma';
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillText('دليل أقسام المستشفى', 256, 56);
    const rows = [
      ['← الطوارئ والفرز', 'WEST · ER'],
      ['← الأشعة والمختبر', 'WEST · LAB'],
      ['→ الصيدلية والتمريض', 'EAST · RX'],
      ['→ جناح التنويم والعزل', 'EAST · WARD'],
      ['↑ غرفة العمليات', 'NORTH · OR'],
      ['↑ المشرحة والأرشيف', 'NORTH · MORGUE'],
      ['▲ الطابق الثاني · ٣١٢', 'FLOOR 2'],
    ];
    rows.forEach((r, idx) => {
      const y = 148 + idx * 70;
      ctx.fillStyle = '#bfb8a4';
      ctx.font = '700 27px Cairo, Tahoma';
      ctx.textAlign = 'right';
      ctx.direction = 'rtl';
      ctx.fillText(r[0], 474, y);
      ctx.fillStyle = '#73827c';
      ctx.font = '700 17px "Share Tech Mono", monospace';
      ctx.textAlign = 'left';
      ctx.direction = 'ltr';
      ctx.fillText(r[1], 34, y);
    });
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.72, metalness: 0.14 });
  };

  mats.makeMoonTexture = () => {
    const c = createCanvas(256, 256);
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(128, 128, 18, 128, 128, 122);
    g.addColorStop(0, '#c8d4e8');
    g.addColorStop(0.55, '#96a8c6');
    g.addColorStop(0.8, 'rgba(95,115,155,0.28)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = 'rgba(72,84,108,0.42)';
    [[96, 98, 18], [156, 90, 12], [136, 152, 20], [104, 158, 10]].forEach(([x, y, r]) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  mats.makeGlowTexture = () => {
    const c = createCanvas(64, 64);
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    g.addColorStop(0, 'rgba(255,255,255,0.75)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.2)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  return mats;
}
