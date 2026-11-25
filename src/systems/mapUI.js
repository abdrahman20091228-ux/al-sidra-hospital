import { FLOOR2_Y, PLAYER, STATE } from '../core/config.js';
import { roadCenterX, roadHalfWidth } from '../utils/math.js';
import { HOSPITAL_BOUNDS, ROOMS, STAIRWELL_SPEC, WALLS_F1, WALLS_F2 } from '../world/layout.js';
import { MISSIONS } from './story.js';

/**
 * SILENT HILL TORN AGED PAPER MAP SYSTEM (3 Wide Switchable Maps!)
 * - Jagged hand-torn parchment silhouette with dark burned/frayed border
 * - Folded paper creases, damp coffee/rust rings, aged fibrous grain, charcoal ink drafting
 * - Switches cleanly across 3 detailed maps:
 *     1. 'forest' — خريطة الغابة والطريق الطيني
 *     2. 'f1'     — مخطط الطابق الأول (١٤ قسم)
 *     3. 'f2'     — مخطط الطابق الثاني (جناح الأطفال والغرفة ٣١٢)
 */
export class MapRenderer {
  constructor(canvasEl, clueObjects) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.clueObjects = clueObjects;
    this.activeTab = 'forest';
    this.paperCache = new Map();
  }

  autoSelectTab() {
    if (PLAYER.z > 6) this.activeTab = 'forest';
    else if (PLAYER.y > FLOOR2_Y * 0.55) this.activeTab = 'f2';
    else this.activeTab = 'f1';
    return this.activeTab;
  }

  setTab(tab) {
    this.activeTab = tab;
    this.draw();
  }

  /**
   * Builds a deterministic jagged torn-paper parchment texture once and caches it for zero GPU/CPU overhead.
   */
  _getTornPaper(w, h) {
    const key = `${w}x${h}`;
    if (this.paperCache.has(key)) return this.paperCache.get(key);

    let seed = 19941012;
    const rr = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    // Build authentic irregular hand-torn rectangular parchment perimeter with ripped notches & corner tears!
    const edge = [];
    const margin = 24;
    const stepsX = 34;
    const stepsY = 26;
    // Top edge (left -> right)
    for (let i = 0; i <= stepsX; i++) {
      const t = i / stepsX;
      const notch = i === 9 || i === 24 ? 14 + rr() * 14 : 0;
      edge.push({ x: margin + t * (w - margin * 2), y: margin + rr() * 12 + notch });
    }
    // Right edge (top -> bottom)
    for (let i = 1; i <= stepsY; i++) {
      const t = i / stepsY;
      const notch = i === 12 ? 18 + rr() * 12 : 0;
      edge.push({ x: w - margin - rr() * 12 - notch, y: margin + t * (h - margin * 2) });
    }
    // Bottom edge (right -> left)
    for (let i = 1; i <= stepsX; i++) {
      const t = 1 - i / stepsX;
      const notch = i === 9 || i === 26 ? 15 + rr() * 12 : 0;
      edge.push({ x: margin + t * (w - margin * 2), y: h - margin - rr() * 11 - notch });
    }
    // Left edge (bottom -> top)
    for (let i = 1; i < stepsY; i++) {
      const t = 1 - i / stepsY;
      const notch = i === 8 || i === 19 ? 15 + rr() * 12 : 0;
      edge.push({ x: margin + rr() * 12 + notch, y: margin + t * (h - margin * 2) });
    }

    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');

    g.save();
    // Drop shadow behind torn paper
    g.shadowColor = 'rgba(0, 0, 0, 0.85)';
    g.shadowBlur = 22;
    g.shadowOffsetY = 8;
    g.beginPath();
    edge.forEach((p, idx) => (idx === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
    g.closePath();
    g.fillStyle = '#c4ae82';
    g.fill();
    g.restore();

    g.save();
    g.beginPath();
    edge.forEach((p, idx) => (idx === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
    g.closePath();
    g.clip();

    // Aged yellowed parchment base radial gradient
    const bg = g.createRadialGradient(w * 0.45, h * 0.42, 40, w * 0.5, h * 0.5, w * 0.72);
    bg.addColorStop(0, '#d7c398');
    bg.addColorStop(0.55, '#bea473');
    bg.addColorStop(1, '#8c7046');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);

    // Subtle vintage architectural graph lines
    g.strokeStyle = 'rgba(72, 52, 26, 0.08)';
    g.lineWidth = 1;
    for (let x = 0; x <= w; x += 28) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y <= h; y += 28) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }

    // Paper fibers & speckles
    for (let i = 0; i < 2400; i++) {
      g.fillStyle = i % 2 === 0 ? 'rgba(54,36,16,0.08)' : 'rgba(248,234,196,0.09)';
      g.fillRect(rr() * w, rr() * h, 1.6, 1.6);
    }

    // Organic coffee/water ring stains & damp blotches
    for (let s = 0; s < 8; s++) {
      const sx = 80 + rr() * (w - 160), sy = 80 + rr() * (h - 160), sr = 38 + rr() * 78;
      const sg = g.createRadialGradient(sx, sy, sr * 0.2, sx, sy, sr);
      sg.addColorStop(0, `rgba(78, 48, 22, ${(0.03 + rr() * 0.05).toFixed(2)})`);
      sg.addColorStop(0.82, `rgba(68, 38, 16, ${(0.09 + rr() * 0.06).toFixed(2)})`);
      sg.addColorStop(0.93, `rgba(54, 28, 12, ${(0.16 + rr() * 0.08).toFixed(2)})`);
      sg.addColorStop(1, 'rgba(54, 28, 12, 0)');
      g.fillStyle = sg;
      g.beginPath();
      g.ellipse(sx, sy, sr, sr * (0.82 + rr() * 0.34), rr() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }

    // Subtle faded dried rust/blood thumb smudges near corners
    for (let b = 0; b < 3; b++) {
      const bx = b === 0 ? w * 0.16 : b === 1 ? w * 0.84 : w * 0.72;
      const by = b === 0 ? h * 0.82 : b === 1 ? h * 0.2 : h * 0.78;
      const br = 28 + rr() * 44;
      const bg2 = g.createRadialGradient(bx, by, 2, bx, by, br);
      bg2.addColorStop(0, 'rgba(98, 26, 18, 0.22)');
      bg2.addColorStop(1, 'rgba(98, 26, 18, 0)');
      g.fillStyle = bg2;
      g.beginPath();
      g.arc(bx, by, br, 0, Math.PI * 2);
      g.fill();
    }

    // Folded paper crease lines (horizontal & vertical creases across the torn sheet!)
    const creases = [
      [0, h * 0.5, w, h * 0.5],
      [w * 0.5, 0, w * 0.5, h],
      [w * 0.25, 0, w * 0.25, h],
      [w * 0.75, 0, w * 0.75, h],
    ];
    creases.forEach(([x1, y1, x2, y2]) => {
      g.strokeStyle = 'rgba(34, 20, 8, 0.22)';
      g.lineWidth = 2.2;
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
      g.strokeStyle = 'rgba(255, 244, 212, 0.22)';
      g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(x1 + 2, y1 + 2); g.lineTo(x2 + 2, y2 + 2); g.stroke();
    });

    // Edge darkening & burned/weathered vignette
    const vig = g.createRadialGradient(w * 0.5, h * 0.5, w * 0.28, w * 0.5, h * 0.5, w * 0.62);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(38, 22, 8, 0.52)');
    g.fillStyle = vig;
    g.fillRect(0, 0, w, h);

    // Hand-drawn ink Compass Rose (top-left)
    g.save();
    g.translate(78, 72);
    g.strokeStyle = 'rgba(42, 26, 12, 0.75)';
    g.lineWidth = 1.6;
    g.beginPath(); g.arc(0, 0, 19, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#7e2018';
    g.beginPath(); g.moveTo(0, -25); g.lineTo(6, -5); g.lineTo(-6, -5); g.closePath(); g.fill();
    g.font = '700 13px "Share Tech Mono", monospace';
    g.fillStyle = '#2d1c0c';
    g.textAlign = 'center';
    g.fillText('N', 0, -29);
    g.restore();

    g.restore();

    // Jagged dark-brown torn paper edge outline
    g.strokeStyle = 'rgba(48, 28, 12, 0.85)';
    g.lineWidth = 2.6;
    g.beginPath();
    edge.forEach((p, idx) => (idx === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
    g.closePath();
    g.stroke();

    const bundle = { canvas: c, edge };
    this.paperCache.set(key, bundle);
    return bundle;
  }

  _drawInkWalls(ctx, walls, toX, toY) {
    ctx.strokeStyle = '#24170c';
    ctx.lineCap = 'round';
    walls.forEach((w) => {
      const isHoriz = Math.abs(w.z1 - w.z2) < 0.01;
      const start = isHoriz ? Math.min(w.x1, w.x2) : Math.min(w.z1, w.z2);
      const end = isHoriz ? Math.max(w.x1, w.x2) : Math.max(w.z1, w.z2);
      const fixed = isHoriz ? w.z1 : w.x1;
      const doors = (w.doors || [])
        .map((d) => ({ a: d.coord - d.width * 0.5, b: d.coord + d.width * 0.5 }))
        .sort((u, v) => u.a - v.a);

      ctx.lineWidth = w.mat === 'facade' ? 4.6 : 2.8;
      let cur = start;
      doors.forEach((d) => {
        if (d.a > cur) {
          ctx.beginPath();
          if (isHoriz) { ctx.moveTo(toX(cur), toY(fixed)); ctx.lineTo(toX(d.a), toY(fixed)); }
          else { ctx.moveTo(toX(fixed), toY(cur)); ctx.lineTo(toX(fixed), toY(d.a)); }
          ctx.stroke();
        }
        // Dashed red-brown ink doorway gap
        ctx.save();
        ctx.strokeStyle = 'rgba(118, 42, 24, 0.65)';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        if (isHoriz) { ctx.moveTo(toX(d.a), toY(fixed)); ctx.lineTo(toX(d.b), toY(fixed)); }
        else { ctx.moveTo(toX(fixed), toY(d.a)); ctx.lineTo(toX(fixed), toY(d.b)); }
        ctx.stroke();
        ctx.restore();
        cur = Math.max(cur, d.b);
      });
      if (cur < end) {
        ctx.beginPath();
        if (isHoriz) { ctx.moveTo(toX(cur), toY(fixed)); ctx.lineTo(toX(end), toY(fixed)); }
        else { ctx.moveTo(toX(fixed), toY(cur)); ctx.lineTo(toX(fixed), toY(end)); }
        ctx.stroke();
      }
    });
  }

  _drawPlayerRedInk(ctx, px, py) {
    const t = Date.now() / 1000;
    const pulse = 0.5 + 0.5 * Math.sin(t * 4.5);
    const fx = -Math.sin(PLAYER.yaw);
    const fz = -Math.cos(PLAYER.yaw);
    const ang = Math.atan2(fz, fx);

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(ang);
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 44);
    grad.addColorStop(0, 'rgba(165, 28, 22, 0.42)');
    grad.addColorStop(1, 'rgba(165, 28, 22, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 44, -0.46, 0.46);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = `rgba(150, 20, 16, ${(0.45 + pulse * 0.45).toFixed(2)})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(px, py, 10 + pulse * 5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#a41814';
    ctx.beginPath();
    ctx.arc(px, py, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ead8b0';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  _drawTargetInk(ctx, tx, ty, label = 'الهدف') {
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 240);
    ctx.strokeStyle = '#8e1b14';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(tx - 8, ty - 8); ctx.lineTo(tx + 8, ty + 8);
    ctx.moveTo(tx + 8, ty - 8); ctx.lineTo(tx - 8, ty + 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(tx, ty, 12 + pulse * 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#74140e';
    ctx.font = '900 13px Cairo, Tahoma';
    ctx.textAlign = 'center';
    ctx.fillText(label, tx, ty - 17);
  }

  draw() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const paper = this._getTornPaper(W, H);

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(paper.canvas, 0, 0);

    // Clip all drawn map content cleanly inside the jagged torn paper silhouette!
    ctx.save();
    ctx.beginPath();
    paper.edge.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.clip();

    // Vintage stamped archival title cleanly inside top-right paper margin (well below torn edge!)
    const stampTitle =
      this.activeTab === 'forest'
        ? 'خريطة الغابة والطريق الطيني (١٩٩٤)'
        : this.activeTab === 'f1'
          ? 'مخطط الطابق الأول — مستشفى السدرة'
          : 'مخطط الطابق الثاني — القسم المعزول';
    ctx.font = '900 16px Cairo, Tahoma';
    const boxW = 336;
    const boxX = W - 44 - boxW;
    const boxY = 50;
    ctx.fillStyle = 'rgba(218, 198, 158, 0.42)';
    ctx.fillRect(boxX, boxY, boxW, 32);
    ctx.strokeStyle = 'rgba(116, 26, 18, 0.65)';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(boxX, boxY, boxW, 32);
    ctx.fillStyle = 'rgba(42, 22, 10, 0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(stampTitle, boxX + boxW * 0.5, boxY + 17);
    ctx.textBaseline = 'alphabetic';

    const activeMission = MISSIONS[STATE.missionIdx];

    if (this.activeTab === 'forest') {
      const toX = (wx) => W * 0.5 + (wx / 36) * (W * 0.42);
      const toY = (wz) => 96 + ((wz + 44) / 124) * (H - 162);

      // Forest zone ink wash
      ctx.fillStyle = 'rgba(46, 64, 34, 0.14)';
      ctx.fillRect(46, toY(9), W - 92, toY(78) - toY(9));

      // Hand-drawn pine tree symbols scattered in forest margins
      ctx.strokeStyle = 'rgba(44, 54, 28, 0.48)';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 24; i++) {
        const tz = 14 + (i * 19) % 62;
        const side = i % 2 === 0 ? -1 : 1;
        const tx = roadCenterX(tz) + side * (8 + (i * 7) % 16);
        const px = toX(tx), py = toY(tz);
        ctx.beginPath();
        ctx.moveTo(px, py - 9); ctx.lineTo(px - 6, py + 4); ctx.lineTo(px + 6, py + 4); ctx.closePath();
        ctx.stroke();
      }

      // Muddy winding road drawn in warm sepia ink
      ctx.beginPath();
      for (let z = 64; z >= 8.5; z -= 1.2) {
        const cx = roadCenterX(z), hw = roadHalfWidth(z);
        if (z === 64) ctx.moveTo(toX(cx - hw), toY(z));
        else ctx.lineTo(toX(cx - hw), toY(z));
      }
      for (let z = 8.5; z <= 64; z += 1.2) {
        const cx = roadCenterX(z), hw = roadHalfWidth(z);
        ctx.lineTo(toX(cx + hw), toY(z));
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(104, 68, 36, 0.36)';
      ctx.fill();
      ctx.strokeStyle = '#3c2512';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Spur clearing trail
      ctx.strokeStyle = 'rgba(84, 52, 24, 0.65)';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(toX(-10.5), toY(71));
      ctx.quadraticCurveTo(toX(-7.5), toY(65), toX(-2.0), toY(62));
      ctx.stroke();

      // Hospital Courtyard + U-Shaped Building Footprint
      ctx.fillStyle = 'rgba(66, 52, 34, 0.2)';
      ctx.fillRect(toX(-25), toY(-6), toX(25) - toX(-25), toY(8.6) - toY(-6));
      ctx.fillStyle = 'rgba(56, 44, 28, 0.28)';
      ctx.strokeStyle = '#24170c';
      ctx.lineWidth = 2.8;
      const hx0 = toX(HOSPITAL_BOUNDS.xMin);
      const hy0 = toY(HOSPITAL_BOUNDS.zBack);
      ctx.fillRect(hx0, hy0, toX(HOSPITAL_BOUNDS.xMax) - hx0, toY(HOSPITAL_BOUNDS.zFront) - hy0);
      ctx.strokeRect(hx0, hy0, toX(HOSPITAL_BOUNDS.xMax) - hx0, toY(HOSPITAL_BOUNDS.zFront) - hy0);

      // Handwritten Arabic annotations & Silent Hill red-ink field notes
      ctx.fillStyle = '#241509';
      ctx.textAlign = 'center';
      ctx.font = '900 18px Cairo, Tahoma';
      ctx.fillText('مستشفى السدرة الريفي (مهجور)', toX(0), toY(-24));
      ctx.font = '700 14px Cairo, Tahoma';
      ctx.fillStyle = '#4a2b14';
      ctx.fillText('البوابة الحديدية المكسورة', toX(0), toY(2.5));
      ctx.fillStyle = '#5a2e12';
      ctx.fillText('الطريق الطيني المتعرج', toX(roadCenterX(36) + 11), toY(36));
      ctx.fillStyle = '#7e1c16';
      ctx.font = '700 13px Cairo, Tahoma';
      ctx.fillText('«أخاديد عميقة ومياه راكدة»', toX(roadCenterX(24) - 12), toY(24));
      ctx.fillStyle = '#2b401e';
      ctx.font = '700 14px Cairo, Tahoma';
      ctx.fillText('غابة وادي الضباب (البداية)', toX(-10.5), toY(75));

      if (activeMission && activeMission.target.floor === 0) {
        this._drawTargetInk(ctx, toX(activeMission.target.x), toY(activeMission.target.z));
      }
      this._drawPlayerRedInk(ctx, toX(PLAYER.x), toY(PLAYER.z));
      ctx.restore();
      return;
    }

    // ===== HOSPITAL FLOOR 1 OR FLOOR 2 TORN PAPER ARCHITECTURAL DRAWING =====
    const isF2 = this.activeTab === 'f2';
    const xMin = isF2 ? -13.5 : -26;
    const xMax = isF2 ? 17.5 : 26;
    const zMin = isF2 ? -44 : -44;
    const zMax = isF2 ? -17.5 : -3.5;

    const padX = 58;
    const padTop = 94;
    const padBot = 76;
    const scaleX = (W - padX * 2) / (xMax - xMin);
    const scaleY = (H - padTop - padBot) / (zMax - zMin);
    const scale = Math.min(scaleX, scaleY);
    const ox = (W - (xMax - xMin) * scale) * 0.5;
    const oy = padTop + (H - padTop - padBot - (zMax - zMin) * scale) * 0.5;
    const toX = (wx) => ox + (wx - xMin) * scale;
    const toY = (wz) => oy + (wz - zMin) * scale;

    ROOMS.filter((r) => r.floor === (isF2 ? 2 : 1)).forEach((r) => {
      const rx = toX(r.x0), ry = toY(r.z0);
      const rw = toX(r.x1) - rx, rh = toY(r.z1) - ry;
      ctx.fillStyle = STATE.discoveredRooms.has(r.id) ? 'rgba(84, 58, 28, 0.22)' : 'rgba(62, 42, 20, 0.1)';
      ctx.fillRect(rx, ry, rw, rh);

      if (!r.isCorridor) {
        ctx.fillStyle = '#26170a';
        const fontSize = isF2 ? 16 : rw < 118 ? 11.5 : 13.5;
        ctx.font = `700 ${fontSize}px Cairo, Tahoma`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const lx = toX(r.labelPos.x), ly = toY(r.labelPos.z);
        const words = r.name.split(' ');
        if (words.length >= 2 && ctx.measureText(r.name).width > rw - 10) {
          const mid = Math.ceil(words.length / 2);
          ctx.fillText(words.slice(0, mid).join(' '), lx, ly - fontSize * 0.65);
          ctx.fillText(words.slice(mid).join(' '), lx, ly + fontSize * 0.65);
        } else {
          ctx.fillText(r.name, lx, ly);
        }
      }
    });

    // Stairwell ink hatch lines
    const st = STAIRWELL_SPEC;
    ctx.strokeStyle = 'rgba(72, 28, 16, 0.75)';
    ctx.lineWidth = 1.5;
    const sx0 = toX(st.x0), sx1 = toX(st.x1);
    for (let i = 0; i <= 8; i++) {
      const sz = st.zBottom + ((st.zTop - st.zBottom) * i) / 8;
      ctx.beginPath(); ctx.moveTo(sx0, toY(sz)); ctx.lineTo(sx1, toY(sz)); ctx.stroke();
    }
    ctx.fillStyle = '#721810';
    ctx.font = '900 12px Cairo, Tahoma';
    ctx.textAlign = 'center';
    ctx.fillText('درج ▲▼', (sx0 + sx1) * 0.5, toY((st.zBottom + st.zTop) * 0.5));

    this._drawInkWalls(ctx, isF2 ? WALLS_F2 : WALLS_F1, toX, toY);

    if (!isF2) {
      ctx.fillStyle = '#4a2610';
      ctx.font = '900 13px Cairo, Tahoma';
      ctx.textAlign = 'center';
      ctx.fillText('▲ المدخل الرئيسي المهجور', toX(0), toY(-4.4));
      // Silent Hill handwritten red ink margin scribble
      ctx.fillStyle = 'rgba(128, 24, 18, 0.72)';
      ctx.font = '700 12px Cairo, Tahoma';
      ctx.fillText('لا توجد كهرباء!', toX(-17), toY(-4.4));
    } else {
      ctx.fillStyle = 'rgba(128, 24, 18, 0.76)';
      ctx.font = '700 13px Cairo, Tahoma';
      ctx.textAlign = 'center';
      ctx.fillText('«أرشيف ندى السري — ١٢ أكتوبر ١٩٩٤»', toX(8.0), toY(-18.6));
    }

    // Ink-circled clue markers
    this.clueObjects.forEach((c) => {
      const cFloor = c.y > FLOOR2_Y * 0.55 ? 2 : 1;
      if (c.z > -6 || cFloor !== (isF2 ? 2 : 1)) return;
      const cx = toX(c.x), cy = toY(c.z);
      ctx.fillStyle = c.collected ? '#2f6a3e' : '#8e4c14';
      ctx.beginPath(); ctx.arc(cx, cy, 4.5, 0, Math.PI * 2); ctx.fill();
    });

    if (activeMission && activeMission.target.floor === (isF2 ? 2 : 1)) {
      this._drawTargetInk(ctx, toX(activeMission.target.x), toY(activeMission.target.z));
    }

    const playerFloor = PLAYER.y > FLOOR2_Y * 0.55 ? 2 : 1;
    if (PLAYER.z <= -3 && playerFloor === (isF2 ? 2 : 1)) {
      this._drawPlayerRedInk(ctx, toX(PLAYER.x), toY(PLAYER.z));
    } else {
      ctx.fillStyle = 'rgba(72, 24, 14, 0.9)';
      ctx.font = '700 13px Cairo, Tahoma';
      ctx.textAlign = 'center';
      ctx.fillText(
        PLAYER.z > -3 ? 'أنت حاليًا خارج المستشفى (بدّل لخريطة الغابة)' : 'أنت حاليًا في الطابق الآخر',
        W * 0.5,
        H - 54
      );
    }

    ctx.restore();
  }
}
