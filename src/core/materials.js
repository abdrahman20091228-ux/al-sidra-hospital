import * as THREE from 'three';

function createCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/**
 * Loads all seamless PBR textures + normal maps and provides a shared material library
 * + procedural Arabic/English architectural signage and medical displays.
 */
export function createMaterialLibrary(maxAnisotropy = 4) {
  const loader = new THREE.TextureLoader();
  const basePath = './textures/';

  function loadTex(file, isColor = true, repX = 1, repY = 1) {
    const tex = loader.load(basePath + file);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repX, repY);
    tex.anisotropy = maxAnisotropy;
    tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    return tex;
  }

  function pbr(name, opts = {}) {
    const repX = opts.repX ?? 1;
    const repY = opts.repY ?? 1;
    const map = loadTex(`${name}.jpg`, true, repX, repY);
    const matOpts = {
      map,
      color: opts.color ?? 0xffffff,
      roughness: opts.roughness ?? 0.85,
      metalness: opts.metalness ?? 0.05,
    };
    if (opts.normal !== false) {
      matOpts.normalMap = loadTex(`${name}_n.jpg`, false, repX, repY);
      const ns = opts.normalScale ?? 0.85;
      matOpts.normalScale = new THREE.Vector2(ns, ns);
    }
    if (opts.emissive !== undefined) matOpts.emissive = new THREE.Color(opts.emissive);
    if (opts.emissiveIntensity !== undefined) matOpts.emissiveIntensity = opts.emissiveIntensity;
    if (opts.side !== undefined) matOpts.side = opts.side;
    if (opts.transparent) {
      matOpts.transparent = true;
      matOpts.opacity = opts.opacity ?? 0.8;
    }
    return new THREE.MeshStandardMaterial(matOpts);
  }

  // ===== CORE SEAMLESS PBR MATERIALS =====
  const mats = {
    // Forest & Muddy Trail
    forestGround: pbr('forest_ground', { roughness: 0.94, metalness: 0.0, normalScale: 1.15, color: 0xc8cbb8 }),
    mudRoad: pbr('mud_road', { roughness: 0.36, metalness: 0.14, normalScale: 1.35, color: 0xd0b89e }),
    mudPuddle: new THREE.MeshStandardMaterial({
      color: 0x223648,
      roughness: 0.06,
      metalness: 0.78,
      transparent: true,
      opacity: 0.82,
    }),
    treeBark: pbr('tree_bark', { roughness: 0.95, metalness: 0.0, normalScale: 1.4, color: 0xc2b2a2 }),
    pineFoliage: pbr('pine_foliage', { roughness: 0.86, metalness: 0.0, normalScale: 0.95, color: 0xa4be9e }),
    fernLeaf: (() => {
      const c = createCanvas(256, 256);
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, 256, 256);
      // Draw 5 organic feathery fern fronds fanning upward from base
      const fronds = [-0.62, -0.32, 0, 0.32, 0.62];
      fronds.forEach((ang, fi) => {
        ctx.save();
        ctx.translate(128, 250);
        ctx.rotate(ang);
        const len = fi === 2 ? 225 : fi === 1 || fi === 3 ? 195 : 160;
        ctx.strokeStyle = '#334d30';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(ang * 25, -len * 0.5, ang * 45, -len);
        ctx.stroke();
        for (let t = 0.14; t < 0.96; t += 0.075) {
          const y = -len * t;
          const x = ang * 45 * t * t;
          const leafW = (1 - Math.abs(t - 0.45)) * 34;
          ctx.fillStyle = t > 0.6 ? '#4f7344' : '#3a5834';
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
        roughness: 0.85,
        metalness: 0.0,
        side: THREE.DoubleSide,
      });
    })(),
    mossRock: pbr('facade_concrete', { roughness: 0.92, metalness: 0.02, normalScale: 1.35, color: 0x768074 }),

    // Hospital Exterior
    asphalt: pbr('asphalt', { roughness: 0.78, metalness: 0.08, normalScale: 1.1, color: 0xc2c6cc }),
    facadeConcrete: pbr('facade_concrete', { roughness: 0.88, metalness: 0.04, normalScale: 1.15, color: 0xd0cec4 }),
    facadeTrim: pbr('facade_concrete', { roughness: 0.82, metalness: 0.06, normalScale: 0.85, color: 0x94989c }),
    ironFence: pbr('rusted_metal', { roughness: 0.62, metalness: 0.65, normalScale: 0.8, color: 0x454c54 }),
    ambulanceWhite: new THREE.MeshStandardMaterial({ color: 0xd2d6d0, roughness: 0.48, metalness: 0.22 }),
    ambulanceRed: new THREE.MeshStandardMaterial({ color: 0x9c2822, roughness: 0.46, metalness: 0.16 }),
    rubberTire: new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.9, metalness: 0.05 }),

    // Hospital Interior Architecture
    corridorWall: pbr('corridor_wall', { roughness: 0.88, metalness: 0.02, normalScale: 1.05, color: 0xcdd3cb }),
    wardWall: pbr('corridor_wall', { roughness: 0.88, metalness: 0.02, normalScale: 0.95, color: 0xbacbbe }),
    adminWall: pbr('corridor_wall', { roughness: 0.86, metalness: 0.02, normalScale: 0.9, color: 0xd2c4ae }),
    sterileTile: pbr('sterile_tile', { roughness: 0.34, metalness: 0.1, normalScale: 1.0, color: 0xd4e4e0 }),
    morgueTile: pbr('sterile_tile', { roughness: 0.3, metalness: 0.14, normalScale: 1.05, color: 0x9eb2bc }),
    hospitalFloor: pbr('hospital_floor', { roughness: 0.42, metalness: 0.1, normalScale: 0.8, color: 0xc2c4bc }),
    sterileFloor: pbr('sterile_tile', { roughness: 0.32, metalness: 0.12, normalScale: 0.75, color: 0xacc0be }),
    morgueFloor: pbr('sterile_tile', { roughness: 0.28, metalness: 0.16, normalScale: 0.82, color: 0x7e8e98 }),
    ceilingTile: pbr('ceiling_tile', { roughness: 0.92, metalness: 0.02, normalScale: 0.85, color: 0xc6c4ba }),
    wainscotRail: pbr('aged_wood', { roughness: 0.72, metalness: 0.08, normalScale: 0.6, color: 0x62706a }),
    bumperRail: new THREE.MeshStandardMaterial({ color: 0x2e383c, roughness: 0.58, metalness: 0.2 }),

    // Props & Furniture
    agedWood: pbr('aged_wood', { roughness: 0.72, metalness: 0.04, normalScale: 0.95, color: 0xc8b298 }),
    darkWood: pbr('aged_wood', { roughness: 0.76, metalness: 0.05, normalScale: 0.9, color: 0x866c56 }),
    rustedMetal: pbr('rusted_metal', { roughness: 0.48, metalness: 0.68, normalScale: 0.85, color: 0xc4cac8 }),
    stainlessSteel: pbr('rusted_metal', { roughness: 0.24, metalness: 0.86, normalScale: 0.4, color: 0xe2eaec }),
    paintedMetal: pbr('rusted_metal', { roughness: 0.46, metalness: 0.36, normalScale: 0.5, color: 0x98aca8 }),
    darkMetal: pbr('rusted_metal', { roughness: 0.54, metalness: 0.65, normalScale: 0.7, color: 0x4c545a }),
    fabricSheet: pbr('fabric_sheet', { roughness: 0.94, metalness: 0.0, normalScale: 0.7, color: 0xd0cdc0 }),
    blanketGreen: pbr('fabric_sheet', { roughness: 0.95, metalness: 0.0, normalScale: 0.75, color: 0x5c7666 }),
    curtainTeal: pbr('fabric_sheet', { roughness: 0.9, metalness: 0.0, normalScale: 0.65, color: 0x6c8882, side: THREE.DoubleSide }),
    leatherDark: new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.55, metalness: 0.08 }),
    plasticBeige: new THREE.MeshStandardMaterial({ color: 0xaba492, roughness: 0.6, metalness: 0.05 }),
    paperWhite: new THREE.MeshStandardMaterial({ color: 0xd8d2c0, roughness: 0.92, metalness: 0.0 }),
    medicineBlue: new THREE.MeshStandardMaterial({ color: 0x3b6884, roughness: 0.35, metalness: 0.1 }),
    medicineAmber: new THREE.MeshStandardMaterial({ color: 0x9c5a20, roughness: 0.28, metalness: 0.12 }),
    glassClear: new THREE.MeshStandardMaterial({
      color: 0x8aa8b8,
      roughness: 0.14,
      metalness: 0.25,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    }),
    glassFrosted: new THREE.MeshStandardMaterial({
      color: 0x7c96a4,
      roughness: 0.48,
      metalness: 0.12,
      transparent: true,
      opacity: 0.52,
    }),

    // Emissive Architectural Accents
    lampOff: new THREE.MeshStandardMaterial({ color: 0x545a58, roughness: 0.5, metalness: 0.1 }),
    lampWarmEmissive: new THREE.MeshStandardMaterial({
      color: 0xffd296,
      emissive: 0xffa84c,
      emissiveIntensity: 1.8,
      roughness: 0.3,
    }),
    lampColdEmissive: new THREE.MeshStandardMaterial({
      color: 0xd8f0ee,
      emissive: 0x8cc8c4,
      emissiveIntensity: 1.4,
      roughness: 0.3,
    }),
    exitGreen: new THREE.MeshStandardMaterial({
      color: 0x48e082,
      emissive: 0x28b85c,
      emissiveIntensity: 1.6,
      roughness: 0.35,
    }),
    emergencyRed: new THREE.MeshStandardMaterial({
      color: 0xff5242,
      emissive: 0xd82a1c,
      emissiveIntensity: 1.9,
      roughness: 0.3,
    }),
    crtGlow: (() => {
      const c = createCanvas(256, 192);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#071b16';
      ctx.fillRect(0, 0, 256, 192);
      ctx.strokeStyle = 'rgba(56, 168, 128, 0.18)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 256; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 192); ctx.stroke(); }
      for (let y = 0; y < 192; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke(); }
      // Crisp green ECG waveform
      ctx.strokeStyle = '#52f0a8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(10, 96);
      ctx.lineTo(64, 96); ctx.lineTo(74, 82); ctx.lineTo(84, 108); ctx.lineTo(96, 36);
      ctx.lineTo(108, 134); ctx.lineTo(118, 96); ctx.lineTo(164, 96);
      ctx.lineTo(176, 84); ctx.lineTo(188, 96); ctx.lineTo(246, 96);
      ctx.stroke();
      ctx.fillStyle = '#6cf0b8';
      ctx.font = '700 18px monospace';
      ctx.fillText('HR 00  SpO2 --%', 14, 28);
      ctx.fillText('SRH-1994 ARCHIVE', 14, 174);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: tex,
        emissive: new THREE.Color(0x52d8a0),
        emissiveIntensity: 0.95,
        roughness: 0.25,
      });
    })(),
    clueGold: new THREE.MeshStandardMaterial({
      color: 0xe6be68,
      emissive: 0x6e4e14,
      emissiveIntensity: 0.55,
      roughness: 0.4,
      metalness: 0.35,
    }),
    xrayLightbox: new THREE.MeshStandardMaterial({
      map: loadTex('xray_film.jpg', true, 1, 1),
      emissiveMap: loadTex('xray_film.jpg', true, 1, 1),
      emissive: new THREE.Color(0x98c4dc),
      emissiveIntensity: 0.95,
      roughness: 0.25,
    }),
  };

  // ===== PROCEDURAL ARCHITECTURAL SIGNAGE GENERATORS =====
  const signCache = new Map();

  mats.makeHospitalFacadeSign = () => {
    const c = createCanvas(1024, 256);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1d272c';
    ctx.fillRect(0, 0, 1024, 256);
    // Border trim
    ctx.strokeStyle = '#6c7c80';
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, 1004, 236);
    // Red medical cross/crescent accent box on right
    ctx.fillStyle = '#8b241e';
    ctx.fillRect(830, 44, 136, 168);
    ctx.fillStyle = '#e8e4d8';
    ctx.fillRect(884, 74, 28, 108);
    ctx.fillRect(844, 114, 108, 28);
    // Arabic title
    ctx.fillStyle = '#e5e0d2';
    ctx.font = '900 78px Cairo, Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';
    ctx.fillText('مستشفى السدرة الريفي', 435, 104);
    ctx.fillStyle = '#a4b4b6';
    ctx.font = '700 30px "Share Tech Mono", monospace';
    ctx.direction = 'ltr';
    ctx.fillText('AL-SIDRA RURAL HOSPITAL  ·  EST. 1971', 435, 184);
    // Subtle weathering streaks
    for (let i = 0; i < 36; i++) {
      const rx = (i * 29) % 1010;
      ctx.fillStyle = 'rgba(20,16,12,0.22)';
      ctx.fillRect(rx, 0, 4 + (i % 6), 40 + (i * 19) % 160);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65, metalness: 0.2 });
  };

  mats.makeRoadSign = (titleAr, subEn) => {
    const key = `road_${titleAr}`;
    if (signCache.has(key)) return signCache.get(key);
    const c = createCanvas(512, 256);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#d4b856';
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = '#1b1a16';
    ctx.lineWidth = 14;
    ctx.strokeRect(12, 12, 488, 232);
    // Grime
    ctx.fillStyle = 'rgba(42,30,16,0.28)';
    ctx.fillRect(0, 0, 512, 55);
    ctx.fillRect(0, 210, 512, 46);
    ctx.fillStyle = '#141310';
    ctx.font = '900 44px Cairo, Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';
    ctx.fillText(titleAr, 256, 104);
    ctx.font = '700 24px "Share Tech Mono", monospace';
    ctx.direction = 'ltr';
    ctx.fillText(subEn, 256, 178);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.72, metalness: 0.25 });
    signCache.set(key, mat);
    return mat;
  };

  mats.makeRoomPlaque = (titleAr, codeEn, accent = '#2e6b62') => {
    const key = `plaque_${titleAr}_${codeEn}`;
    if (signCache.has(key)) return signCache.get(key);
    const c = createCanvas(512, 160);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#172022';
    ctx.fillRect(0, 0, 512, 160);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 512, 24);
    ctx.strokeStyle = '#5c6c6e';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 504, 152);
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '700 46px Cairo, Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';
    ctx.fillText(titleAr, 256, 78);
    ctx.fillStyle = '#92a8a4';
    ctx.font = '700 22px "Share Tech Mono", monospace';
    ctx.direction = 'ltr';
    ctx.fillText(codeEn, 256, 130);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.2 });
    signCache.set(key, mat);
    return mat;
  };

  mats.makeDirectoryBoard = () => {
    const c = createCanvas(512, 640);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#141a1d';
    ctx.fillRect(0, 0, 512, 640);
    ctx.fillStyle = '#245852';
    ctx.fillRect(0, 0, 512, 86);
    ctx.strokeStyle = '#6c7c7e';
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, 500, 628);
    ctx.fillStyle = '#f0ece0';
    ctx.font = '900 38px Cairo, Tahoma';
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillText('دليل أقسام المستشفى', 256, 56);

    const rows = [
      ['← الطوارئ والفرز', 'WEST · ER'],
      ['← الأشعة والمختبر', 'WEST · LAB'],
      ['→ الصيدلية والتمريض', 'EAST · RX'],
      ['→ جناح المرضى والعزل', 'EAST · WARD'],
      ['↑ غرفة العمليات', 'NORTH · OR'],
      ['↑ المشرحة والأرشيف', 'NORTH · MORGUE'],
      ['▲ الطابق الثاني · ٣١٢', 'FLOOR 2'],
    ];
    ctx.textAlign = 'right';
    rows.forEach((r, idx) => {
      const y = 148 + idx * 70;
      ctx.fillStyle = idx % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'transparent';
      ctx.fillRect(20, y - 34, 472, 58);
      ctx.fillStyle = '#dfd9c8';
      ctx.font = '700 28px Cairo, Tahoma';
      ctx.direction = 'rtl';
      ctx.fillText(r[0], 474, y);
      ctx.fillStyle = '#7ba89e';
      ctx.font = '700 18px "Share Tech Mono", monospace';
      ctx.textAlign = 'left';
      ctx.direction = 'ltr';
      ctx.fillText(r[1], 34, y);
      ctx.textAlign = 'right';
    });
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45, metalness: 0.15 });
  };

  mats.makeMoonTexture = () => {
    const c = createCanvas(256, 256);
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(128, 128, 18, 128, 128, 122);
    g.addColorStop(0, '#f4f7ff');
    g.addColorStop(0.55, '#d9e3f7');
    g.addColorStop(0.8, 'rgba(155,180,225,0.45)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = 'rgba(130,145,175,0.35)';
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
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.32)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  return mats;
}
