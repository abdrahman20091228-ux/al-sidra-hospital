import { FLOOR2_Y, PLAYER, STATE } from '../core/config.js';
import { roadCenterX, roadHalfWidth } from '../utils/math.js';
import { HOSPITAL_BOUNDS, ROOMS, STAIRWELL_SPEC, WALLS_F1, WALLS_F2 } from '../world/layout.js';
import { MISSIONS } from './story.js';

/**
 * RADICALLY REDESIGNED SILENT HILL 1994 HOSPITAL EVACUATION MAP (3 Wide Switchable Maps!)
 * - Authentic crumpled, creased, torn hospital wall-evacuation blueprint on aged yellowed paper
 * - Translucent yellowed scotch-tape strips holding ripped corners, faded archival stamp & red medical emblem
 * - Double-line architectural drafting with quarter-circle door swing arcs & minimalist room icons
 * - Bold hand-drawn red felt-tip pen field markings (circles, arrows, Arabic survival notes)
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

  _getEvacuationSheet(w, h) {
    const key = `${w}x${h}`;
    if (this.paperCache.has(key)) return this.paperCache.get(key);

    let seed = 19941012;
    const rr = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    // Irregular hand-torn sheet silhouette with deep ripped notches on sides & corners
    const edge = [];
    const m = 22;
    const sx = 38, sy = 28;
    for (let i = 0; i <= sx; i++) {
      const t = i / sx;
      const notch = i === 11 || i === 27 ? 14 + rr() * 12 : 0;
      edge.push({ x: m + t * (w - m * 2), y: m + rr() * 9 + notch });
    }
    for (let i = 1; i <= sy; i++) {
      const t = i / sy;
      const notch = i === 9 || i === 20 ? 16 + rr() * 12 : 0;
      edge.push({ x: w - m - rr() * 9 - notch, y: m + t * (h - m * 2) });
    }
    for (let i = 1; i <= sx; i++) {
      const t = 1 - i / sx;
      const notch = i === 8 || i === 29 ? 14 + rr() * 12 : 0;
      edge.push({ x: m + t * (w - m * 2), y: h - m - rr() * 9 - notch });
    }
    for (let i = 1; i < sy; i++) {
      const t = 1 - i / sy;
      const notch = i === 7 || i === 19 ? 15 + rr() * 12 : 0;
      edge.push({ x: m + rr() * 9 + notch, y: m + t * (h - m * 2) });
    }

    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');

    // Deep table shadow underneath crumpled torn sheet
    g.save();
    g.shadowColor = 'rgba(0, 0, 0, 0.92)';
    g.shadowBlur = 26;
    g.shadowOffsetY = 10;
    g.beginPath();
    edge.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
    g.closePath();
    g.fillStyle = '#c8b68e';
    g.fill();
    g.restore();

    g.save();
    g.beginPath();
    edge.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
    g.closePath();
    g.clip();

    // Aged institutional cream-parchment base (evacuation brochure paper)
    const bg = g.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#d8c9a4');
    bg.addColorStop(0.48, '#cbb78d');
    bg.addColorStop(1, '#a89066');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);

    // Subtle organic paper wrinkles & aged fiber noise
    for (let i = 0; i < 3600; i++) {
      g.fillStyle = i % 3 === 0 ? 'rgba(54, 38, 18, 0.08)' : 'rgba(252, 244, 222, 0.07)';
      g.fillRect(rr() * w, rr() * h, 1.5, 1.5);
    }

    // Subtle irregular water-damage & damp mold discoloration along margins (NOT cartoon circles!)
    for (let s = 0; s < 14; s++) {
      const px = s < 8 ? (s % 2 === 0 ? rr() * 140 : w - rr() * 140) : rr() * w;
      const py = rr() * h;
      const rx = 50 + rr() * 95;
      const ry = 35 + rr() * 75;
      const sg = g.createRadialGradient(px, py, 6, px, py, rx);
      sg.addColorStop(0, `rgba(68, 46, 22, ${(0.06 + rr() * 0.08).toFixed(2)})`);
      sg.addColorStop(1, 'rgba(68, 46, 22, 0)');
      g.fillStyle = sg;
      g.beginPath();
      g.ellipse(px, py, rx, ry, rr() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }

    // Deep realistic 3x2 pocket-fold crease shadows & highlights!
    const vFolds = [w * 0.33, w * 0.67];
    const hFolds = [h * 0.5];
    vFolds.forEach((fx) => {
      const fg = g.createLinearGradient(fx - 12, 0, fx + 12, 0);
      fg.addColorStop(0, 'rgba(36,22,8,0)');
      fg.addColorStop(0.45, 'rgba(36,22,8,0.18)');
      fg.addColorStop(0.55, 'rgba(255,248,226,0.22)');
      fg.addColorStop(1, 'rgba(255,248,226,0)');
      g.fillStyle = fg;
      g.fillRect(fx - 12, 0, 24, h);
    });
    hFolds.forEach((fy) => {
      const fg = g.createLinearGradient(0, fy - 10, 0, fy + 10);
      fg.addColorStop(0, 'rgba(36,22,8,0)');
      fg.addColorStop(0.45, 'rgba(36,22,8,0.20)');
      fg.addColorStop(0.55, 'rgba(255,248,226,0.22)');
      fg.addColorStop(1, 'rgba(255,248,226,0)');
      g.fillStyle = fg;
      g.fillRect(0, fy - 10, w, 20);
    });

    // Faded 1994 Institutional Evacuation Header Strip (dark slate-brown ink border)
    g.strokeStyle = 'rgba(38, 28, 18, 0.72)';
    g.lineWidth = 2.2;
    g.strokeRect(42, 42, w - 84, h - 84);
    g.lineWidth = 0.9;
    g.strokeRect(47, 47, w - 94, h - 94);

    // Header band inside top frame
    g.fillStyle = 'rgba(42, 34, 24, 0.14)';
    g.fillRect(48, 48, w - 96, 44);
    g.beginPath();
    g.moveTo(48, 92);
    g.lineTo(w - 48, 92);
    g.stroke();

    // Faded Medical Red Cross emblem in top-left of evacuation sheet + Compass N
    g.save();
    g.translate(76, 70);
    g.fillStyle = 'rgba(138, 32, 24, 0.78)';
    g.fillRect(-11, -4, 22, 8);
    g.fillRect(-4, -11, 8, 22);
    g.restore();

    g.save();
    g.translate(120, 70);
    g.strokeStyle = 'rgba(44, 28, 14, 0.75)';
    g.lineWidth = 1.4;
    g.beginPath(); g.arc(0, 0, 12, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#8a221a';
    g.beginPath(); g.moveTo(0, -15); g.lineTo(4, -3); g.lineTo(-4, -3); g.closePath(); g.fill();
    g.font = '700 11px "Share Tech Mono", monospace';
    g.fillStyle = '#2d1c0c';
    g.textAlign = 'center';
    g.fillText('N', 0, 8);
    g.restore();

    // Burned weathered vignette along torn margins
    const vig = g.createRadialGradient(w * 0.5, h * 0.5, w * 0.3, w * 0.5, h * 0.5, w * 0.64);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(34, 20, 8, 0.44)');
    g.fillStyle = vig;
    g.fillRect(0, 0, w, h);

    g.restore();

    // Translucent yellowed scotch-tape strips holding two torn corners!
    const drawTape = (tx, ty, rot, tw, th) => {
      g.save();
      g.translate(tx, ty);
      g.rotate(rot);
      g.fillStyle = 'rgba(232, 212, 152, 0.44)';
      g.strokeStyle = 'rgba(180, 156, 98, 0.35)';
      g.lineWidth = 1;
      g.fillRect(-tw / 2, -th / 2, tw, th);
      g.strokeRect(-tw / 2, -th / 2, tw, th);
      g.restore();
    };
    drawTape(68, 44, -0.58, 76, 22);
    drawTape(w - 72, h - 46, -0.62, 82, 22);

    // Jagged frayed dark edge outline
    g.strokeStyle = 'rgba(46, 28, 12, 0.88)';
    g.lineWidth = 2.4;
    g.beginPath();
    edge.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
    g.closePath();
    g.stroke();

    const bundle = { canvas: c, edge };
    this.paperCache.set(key, bundle);
    return bundle;
  }

  _drawArchitecturalWalls(ctx, walls, toX, toY) {
    ctx.lineCap = 'square';
    walls.forEach((w) => {
      const isHoriz = Math.abs(w.z1 - w.z2) < 0.01;
      const start = isHoriz ? Math.min(w.x1, w.x2) : Math.min(w.z1, w.z2);
      const end = isHoriz ? Math.max(w.x1, w.x2) : Math.max(w.z1, w.z2);
      const fixed = isHoriz ? w.z1 : w.x1;
      const doors = (w.doors || [])
        .map((d) => ({ a: d.coord - d.width * 0.5, b: d.coord + d.width * 0.5 }))
        .sort((u, v) => u.a - v.a);

      const lw = w.mat === 'facade' ? 5.2 : 3.2;
      let cur = start;
      const strokeSeg = (p0, p1) => {
        ctx.strokeStyle = '#1f160d';
        ctx.lineWidth = lw;
        ctx.beginPath();
        if (isHoriz) { ctx.moveTo(toX(p0), toY(fixed)); ctx.lineTo(toX(p1), toY(fixed)); }
        else { ctx.moveTo(toX(fixed), toY(p0)); ctx.lineTo(toX(fixed), toY(p1)); }
        ctx.stroke();
        // Subtle lighter architectural inner core line for outer walls
        if (w.mat === 'facade') {
          ctx.strokeStyle = '#cbb78d';
          ctx.lineWidth = 1.1;
          ctx.stroke();
        }
      };

      doors.forEach((d) => {
        if (d.a > cur) strokeSeg(cur, d.a);
        // Authentic architectural quarter-circle door swing arc!
        const xA = isHoriz ? toX(d.a) : toX(fixed);
        const yA = isHoriz ? toY(fixed) : toY(d.a);
        const xB = isHoriz ? toX(d.b) : toX(fixed);
        const yB = isHoriz ? toY(fixed) : toY(d.b);
        const r = Math.min(20, Math.hypot(xB - xA, yB - yA) * 0.72);
        ctx.save();
        ctx.strokeStyle = 'rgba(116, 38, 24, 0.62)';
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        if (isHoriz) {
          ctx.moveTo(xA, yA); ctx.lineTo(xA, yA - r);
          ctx.arc(xA, yA, r, -Math.PI / 2, 0);
        } else {
          ctx.moveTo(xA, yA); ctx.lineTo(xA + r, yA);
          ctx.arc(xA, yA, r, 0, Math.PI / 2);
        }
        ctx.stroke();
        ctx.restore();
        cur = Math.max(cur, d.b);
      });
      if (cur < end) strokeSeg(cur, end);
    });
  }

  _drawHandCircle(ctx, cx, cy, rx, ry, color = 'rgba(154, 24, 18, 0.72)') {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let i = 0; i <= 28; i++) {
      const a = (i / 26) * Math.PI * 2;
      const wob = 1 + Math.sin(a * 3) * 0.05;
      const px = cx + Math.cos(a) * rx * wob;
      const py = cy + Math.sin(a) * ry * wob;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  _drawPlayerMarker(ctx, px, py) {
    const t = Date.now() / 1000;
    const pulse = 0.5 + 0.5 * Math.sin(t * 4.5);
    const fx = -Math.sin(PLAYER.yaw);
    const fz = -Math.cos(PLAYER.yaw);
    const ang = Math.atan2(fz, fx);

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(ang);
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 42);
    grad.addColorStop(0, 'rgba(178, 22, 16, 0.48)');
    grad.addColorStop(1, 'rgba(178, 22, 16, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 42, -0.36, 0.36);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = `rgba(165, 20, 14, ${(0.5 + pulse * 0.45).toFixed(2)})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(px, py, 9 + pulse * 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#a81410';
    ctx.beginPath();
    ctx.arc(px, py, 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#efe2be';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  _drawTargetInk(ctx, tx, ty) {
    this._drawHandCircle(ctx, tx, ty, 15, 13, 'rgba(156, 20, 14, 0.85)');
    ctx.strokeStyle = '#921610';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(tx - 6, ty - 6); ctx.lineTo(tx + 6, ty + 6);
    ctx.moveTo(tx + 6, ty - 6); ctx.lineTo(tx - 6, ty + 6);
    ctx.stroke();
  }

  draw() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const sheet = this._getEvacuationSheet(W, H);

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(sheet.canvas, 0, 0);

    ctx.save();
    ctx.beginPath();
    sheet.edge.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.clip();

    // Header Banner Title inside top frame
    const title =
      this.activeTab === 'forest'
        ? 'خطة الوصول والغابة — مستشفى السدرة الريفي (١٩٩٤)'
        : this.activeTab === 'f1'
          ? 'خطة الإخلاء الطارئ — الطابق الأول (١٤ قسمًا)'
          : 'خطة الإخلاء الطارئ — الطابق الثاني والقسم المعزول';
    ctx.fillStyle = '#24180d';
    ctx.font = '900 18px Cairo, Tahoma';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, W - 62, 70);
    ctx.textBaseline = 'alphabetic';

    const activeMission = MISSIONS[STATE.missionIdx];

    if (this.activeTab === 'forest') {
      const toX = (wx) => W * 0.5 + (wx / 36) * (W * 0.40);
      const toY = (wz) => 112 + ((wz + 44) / 124) * (H - 178);

      // Topographic contour lines for forest hills
      ctx.strokeStyle = 'rgba(64, 54, 34, 0.16)';
      ctx.lineWidth = 1;
      for (let c = 0; c < 5; c++) {
        ctx.beginPath();
        ctx.ellipse(toX(-16), toY(42), 68 + c * 28, 52 + c * 22, 0.3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(toX(18), toY(36), 58 + c * 26, 48 + c * 20, -0.25, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Pine tree markers
      ctx.strokeStyle = 'rgba(42, 56, 30, 0.52)';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 28; i++) {
        const tz = 15 + (i * 17) % 60;
        const side = i % 2 === 0 ? -1 : 1;
        const tx = roadCenterX(tz) + side * (7.5 + (i * 9) % 16);
        const px = toX(tx), py = toY(tz);
        ctx.beginPath();
        ctx.moveTo(px, py - 9); ctx.lineTo(px - 6, py + 4); ctx.lineTo(px + 6, py + 4); ctx.closePath();
        ctx.stroke();
      }

      // Winding muddy road shaded with cross-hatch edge
      ctx.beginPath();
      for (let z = 64; z >= 8.6; z -= 1.2) {
        const cx = roadCenterX(z), hw = roadHalfWidth(z);
        if (z === 64) ctx.moveTo(toX(cx - hw), toY(z));
        else ctx.lineTo(toX(cx - hw), toY(z));
      }
      for (let z = 8.6; z <= 64; z += 1.2) {
        const cx = roadCenterX(z), hw = roadHalfWidth(z);
        ctx.lineTo(toX(cx + hw), toY(z));
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(104, 68, 36, 0.34)';
      ctx.fill();
      ctx.strokeStyle = '#2d1c0d';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // Clearing spur path
      ctx.strokeStyle = 'rgba(84, 52, 24, 0.68)';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(toX(-10.5), toY(71));
      ctx.quadraticCurveTo(toX(-7.5), toY(65), toX(-2.0), toY(62));
      ctx.stroke();

      // U-shaped hospital building footprint & courtyard
      ctx.fillStyle = 'rgba(58, 46, 30, 0.16)';
      ctx.fillRect(toX(-25), toY(-6), toX(25) - toX(-25), toY(8.6) - toY(-6));
      ctx.fillStyle = 'rgba(48, 38, 24, 0.28)';
      ctx.strokeStyle = '#1f150c';
      ctx.lineWidth = 3;
      const hx0 = toX(HOSPITAL_BOUNDS.xMin), hy0 = toY(HOSPITAL_BOUNDS.zBack);
      ctx.fillRect(hx0, hy0, toX(HOSPITAL_BOUNDS.xMax) - hx0, toY(HOSPITAL_BOUNDS.zFront) - hy0);
      ctx.strokeRect(hx0, hy0, toX(HOSPITAL_BOUNDS.xMax) - hx0, toY(HOSPITAL_BOUNDS.zFront) - hy0);

      // Printed labels + hand-drawn red pen notes
      ctx.fillStyle = '#22140a';
      ctx.textAlign = 'center';
      ctx.font = '900 18px Cairo, Tahoma';
      ctx.fillText('مستشفى السدرة الريفي (مغلق ١٩٩٤)', toX(0), toY(-24));
      ctx.font = '700 14px Cairo, Tahoma';
      ctx.fillStyle = '#482812';
      ctx.fillText('الساحة والبوابة الحديدية', toX(0), toY(2.2));
      ctx.fillStyle = '#5a2e12';
      ctx.fillText('الطريق الطيني المتعرج', toX(roadCenterX(36) + 12), toY(36));
      ctx.fillStyle = '#263c1b';
      ctx.fillText('غابة وادي الضباب (نقطة البداية)', toX(-10.5), toY(75.5));
      // Hand-drawn red marker note
      ctx.fillStyle = '#8e1b14';
      ctx.font = '700 13px Cairo, Tahoma';
      ctx.fillText('«جسر خشبي متآكل قبل البوابة»', toX(-12.5), toY(15.5));

      if (activeMission && activeMission.target.floor === 0) {
        this._drawTargetInk(ctx, toX(activeMission.target.x), toY(activeMission.target.z));
      }
      this._drawPlayerMarker(ctx, toX(PLAYER.x), toY(PLAYER.z));
      ctx.restore();
      return;
    }

    // ===== FLOOR 1 OR FLOOR 2 ARCHITECTURAL EVACUATION PLAN =====
    const isF2 = this.activeTab === 'f2';
    const xMin = isF2 ? -12.5 : -26;
    const xMax = isF2 ? 16.5 : 26;
    const zMin = -44;
    const zMax = isF2 ? -18.0 : -3.5;

    const padX = 68;
    const padTop = 108;
    const padBot = 78;
    const scale = Math.min((W - padX * 2) / (xMax - xMin), (H - padTop - padBot) / (zMax - zMin));
    const ox = (W - (xMax - xMin) * scale) * 0.5;
    const oy = padTop + (H - padTop - padBot - (zMax - zMin) * scale) * 0.5;
    const toX = (wx) => ox + (wx - xMin) * scale;
    const toY = (wz) => oy + (wz - zMin) * scale;

    ROOMS.filter((r) => r.floor === (isF2 ? 2 : 1)).forEach((r) => {
      const rx = toX(r.x0), ry = toY(r.z0);
      const rw = toX(r.x1) - rx, rh = toY(r.z1) - ry;
      ctx.fillStyle = STATE.discoveredRooms.has(r.id) ? 'rgba(84, 58, 28, 0.20)' : 'rgba(56, 40, 22, 0.08)';
      ctx.fillRect(rx, ry, rw, rh);

      if (!r.isCorridor) {
        ctx.fillStyle = '#22150a';
        const fontSize = isF2 ? 16 : rw < 116 ? 11.2 : 13;
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

    // Architectural Stairwell treads + direction arrow
    const st = STAIRWELL_SPEC;
    const sx0 = toX(st.x0), sx1 = toX(st.x1);
    const szA = toY(st.zBottom), szB = toY(st.zTop);
    ctx.fillStyle = 'rgba(116, 40, 22, 0.12)';
    ctx.fillRect(sx0, Math.min(szA, szB), sx1 - sx0, Math.abs(szB - szA));
    ctx.strokeStyle = 'rgba(72, 26, 16, 0.78)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i <= 9; i++) {
      const sy = szA + ((szB - szA) * i) / 9;
      ctx.beginPath(); ctx.moveTo(sx0, sy); ctx.lineTo(sx1, sy); ctx.stroke();
    }
    ctx.fillStyle = '#841a12';
    ctx.font = '900 11.5px Cairo, Tahoma';
    ctx.textAlign = 'center';
    ctx.fillText('▲ الدرج', (sx0 + sx1) * 0.5, (szA + szB) * 0.5 + 4);

    // Double-line architectural walls with door swing arcs
    this._drawArchitecturalWalls(ctx, isF2 ? WALLS_F2 : WALLS_F1, toX, toY);

    // Hand-drawn Silent Hill red marker annotations!
    if (!isF2) {
      ctx.fillStyle = '#3a1e0d';
      ctx.font = '900 13px Cairo, Tahoma';
      ctx.textAlign = 'center';
      ctx.fillText('▲ المدخل الرئيسي المهجور', toX(0), toY(-4.4));
      ctx.fillStyle = 'rgba(148, 22, 16, 0.85)';
      ctx.font = '700 12px Cairo, Tahoma';
      ctx.fillText('«الكهرباء مقطوعة بالكامل!»', toX(-16.5), toY(-4.4));
      this._drawHandCircle(ctx, (sx0 + sx1) * 0.5, (szA + szB) * 0.5, 28, 34, 'rgba(154, 24, 18, 0.52)');
    } else {
      // Hand-drawn red felt-tip circle around Room 312!
      this._drawHandCircle(ctx, toX(8.35), toY(-24.5), 76, 46, 'rgba(154, 22, 16, 0.58)');
      ctx.fillStyle = 'rgba(146, 22, 16, 0.88)';
      ctx.font = '700 13px Cairo, Tahoma';
      ctx.textAlign = 'center';
      ctx.fillText('«ملف ندى السري هنا — ١٩٩٤»', toX(8.35), toY(-18.6));
    }

    // Clue markers
    this.clueObjects.forEach((c) => {
      const cFloor = c.y > FLOOR2_Y * 0.55 ? 2 : 1;
      if (c.z > -6 || cFloor !== (isF2 ? 2 : 1)) return;
      const cx = toX(c.x), cy = toY(c.z);
      ctx.fillStyle = c.collected ? '#2d683b' : '#964810';
      ctx.beginPath(); ctx.arc(cx, cy, 4.8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#efe2be';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });

    if (activeMission && activeMission.target.floor === (isF2 ? 2 : 1)) {
      this._drawTargetInk(ctx, toX(activeMission.target.x), toY(activeMission.target.z));
    }

    const playerFloor = PLAYER.y > FLOOR2_Y * 0.55 ? 2 : 1;
    if (PLAYER.z <= -3 && playerFloor === (isF2 ? 2 : 1)) {
      this._drawPlayerMarker(ctx, toX(PLAYER.x), toY(PLAYER.z));
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
