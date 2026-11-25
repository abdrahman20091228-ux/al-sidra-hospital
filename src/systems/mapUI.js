import { FLOOR2_Y, PLAYER, STATE } from '../core/config.js';
import { roadCenterX, roadHalfWidth } from '../utils/math.js';
import { HOSPITAL_BOUNDS, ROOMS, STAIRWELL_SPEC, WALLS_F1, WALLS_F2 } from '../world/layout.js';
import { MISSIONS } from './story.js';

/**
 * Interactive Architectural Blueprint & Forest Trail Map.
 * Supports 3 crisp tabs:
 *   - 'forest': Pine forest clearing -> Winding muddy road -> Hospital courtyard
 *   - 'f1': Complete Ground Floor architectural floorplan (14 rooms & corridors)
 *   - 'f2': Second Floor architectural floorplan (Stairwell, Pediatrics, Room 312)
 */
export class MapRenderer {
  constructor(canvasEl, clueObjects) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.clueObjects = clueObjects;
    this.activeTab = 'forest';
    this.bgCache = new Map();
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

  _getBlueprintBg(w, h) {
    const key = `${w}x${h}`;
    if (this.bgCache.has(key)) return this.bgCache.get(key);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');

    // Deep slate architectural blueprint paper
    const rad = g.createRadialGradient(w * 0.5, h * 0.45, 40, w * 0.5, h * 0.5, w * 0.72);
    rad.addColorStop(0, '#13222b');
    rad.addColorStop(1, '#091117');
    g.fillStyle = rad;
    g.fillRect(0, 0, w, h);

    // Subtle millimeter grid
    g.strokeStyle = 'rgba(110, 175, 195, 0.08)';
    g.lineWidth = 1;
    const step = 32;
    for (let x = 0; x <= w; x += step) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h);
      g.stroke();
    }
    for (let y = 0; y <= h; y += step) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }

    // Outer technical border frame
    g.strokeStyle = 'rgba(130, 195, 205, 0.35)';
    g.lineWidth = 2;
    g.strokeRect(14, 14, w - 28, h - 28);
    g.strokeStyle = 'rgba(130, 195, 205, 0.14)';
    g.strokeRect(20, 20, w - 40, h - 40);

    // Compass Rose (top-left)
    g.save();
    g.translate(58, 58);
    g.strokeStyle = 'rgba(160, 215, 220, 0.55)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(0, 0, 18, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#e6b85c';
    g.beginPath();
    g.moveTo(0, -24);
    g.lineTo(5, -6);
    g.lineTo(-5, -6);
    g.closePath();
    g.fill();
    g.font = '700 12px "Share Tech Mono", monospace';
    g.fillStyle = '#c8e4e8';
    g.textAlign = 'center';
    g.fillText('N', 0, -27);
    g.restore();

    this.bgCache.set(key, c);
    return c;
  }

  _drawWalls(ctx, walls, toX, toY) {
    ctx.strokeStyle = '#cfe4e8';
    ctx.lineCap = 'square';
    walls.forEach((w) => {
      const isHoriz = Math.abs(w.z1 - w.z2) < 0.01;
      const start = isHoriz ? Math.min(w.x1, w.x2) : Math.min(w.z1, w.z2);
      const end = isHoriz ? Math.max(w.x1, w.x2) : Math.max(w.z1, w.z2);
      const fixed = isHoriz ? w.z1 : w.x1;
      const doors = (w.doors || [])
        .map((d) => ({ a: d.coord - d.width * 0.5, b: d.coord + d.width * 0.5 }))
        .sort((u, v) => u.a - v.a);

      ctx.lineWidth = w.mat === 'facade' ? 4.5 : 2.6;
      let cur = start;
      doors.forEach((d) => {
        if (d.a > cur) {
          ctx.beginPath();
          if (isHoriz) {
            ctx.moveTo(toX(cur), toY(fixed));
            ctx.lineTo(toX(d.a), toY(fixed));
          } else {
            ctx.moveTo(toX(fixed), toY(cur));
            ctx.lineTo(toX(fixed), toY(d.a));
          }
          ctx.stroke();
        }
        // Subtle dashed cyan doorway arc line
        ctx.save();
        ctx.strokeStyle = 'rgba(110, 220, 195, 0.55)';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        if (isHoriz) {
          ctx.moveTo(toX(d.a), toY(fixed));
          ctx.lineTo(toX(d.b), toY(fixed));
        } else {
          ctx.moveTo(toX(fixed), toY(d.a));
          ctx.lineTo(toX(fixed), toY(d.b));
        }
        ctx.stroke();
        ctx.restore();
        cur = Math.max(cur, d.b);
      });
      if (cur < end) {
        ctx.beginPath();
        if (isHoriz) {
          ctx.moveTo(toX(cur), toY(fixed));
          ctx.lineTo(toX(end), toY(fixed));
        } else {
          ctx.moveTo(toX(fixed), toY(cur));
          ctx.lineTo(toX(fixed), toY(end));
        }
        ctx.stroke();
      }
    });
  }

  _drawPlayerMarker(ctx, px, py) {
    const t = Date.now() / 1000;
    const pulse = 0.5 + 0.5 * Math.sin(t * 4.5);
    const fx = -Math.sin(PLAYER.yaw);
    const fz = -Math.cos(PLAYER.yaw);
    const ang = Math.atan2(fz, fx);

    // View cone
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(ang);
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 46);
    grad.addColorStop(0, 'rgba(255, 220, 130, 0.45)');
    grad.addColorStop(1, 'rgba(255, 220, 130, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 46, -0.48, 0.48);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Pulsing ring
    ctx.strokeStyle = `rgba(255, 92, 74, ${(0.35 + pulse * 0.5).toFixed(2)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, 10 + pulse * 6, 0, Math.PI * 2);
    ctx.stroke();

    // Core dot
    ctx.fillStyle = '#ff5442';
    ctx.beginPath();
    ctx.arc(px, py, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  _drawTargetMarker(ctx, tx, ty, label = 'الهدف') {
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 240);
    ctx.strokeStyle = '#f2c15a';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(tx, ty, 9 + pulse * 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#f2c15a';
    ctx.font = '700 13px Cairo, Tahoma';
    ctx.textAlign = 'center';
    ctx.fillText(label, tx, ty - 16);
  }

  draw() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(this._getBlueprintBg(W, H), 0, 0);

    const activeMission = MISSIONS[STATE.missionIdx];

    if (this.activeTab === 'forest') {
      // World bounds for Forest + Muddy Road + Hospital Footprint: X in [-32, +32], Z in [-44, +78]
      const toX = (wx) => W * 0.5 + (wx / 34) * (W * 0.43);
      const toY = (wz) => 56 + ((wz + 44) / 124) * (H - 110);

      // Forest zone tint
      ctx.fillStyle = 'rgba(42, 82, 58, 0.25)';
      ctx.fillRect(34, toY(9), W - 68, toY(78) - toY(9));

      // Draw Winding Muddy Forest Road
      ctx.beginPath();
      for (let z = 64; z >= 8.5; z -= 1.2) {
        const cx = roadCenterX(z);
        const hw = roadHalfWidth(z);
        if (z === 64) ctx.moveTo(toX(cx - hw), toY(z));
        else ctx.lineTo(toX(cx - hw), toY(z));
      }
      for (let z = 8.5; z <= 64; z += 1.2) {
        const cx = roadCenterX(z);
        const hw = roadHalfWidth(z);
        ctx.lineTo(toX(cx + hw), toY(z));
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(138, 102, 68, 0.55)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(210, 175, 130, 0.65)';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Clearing spur trail
      ctx.strokeStyle = 'rgba(190, 160, 118, 0.6)';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(toX(-10.5), toY(71));
      ctx.quadraticCurveTo(toX(-7.5), toY(65), toX(-2.2), toY(62));
      ctx.stroke();

      // Hospital Courtyard + Building Silhouette
      ctx.fillStyle = 'rgba(95, 105, 118, 0.32)';
      ctx.fillRect(toX(-25), toY(-6), toX(25) - toX(-25), toY(8.6) - toY(-6));
      ctx.fillStyle = 'rgba(48, 92, 98, 0.45)';
      ctx.strokeStyle = '#cfe4e8';
      ctx.lineWidth = 2.6;
      const hx0 = toX(HOSPITAL_BOUNDS.xMin);
      const hy0 = toY(HOSPITAL_BOUNDS.zBack);
      ctx.fillRect(hx0, hy0, toX(HOSPITAL_BOUNDS.xMax) - hx0, toY(HOSPITAL_BOUNDS.zFront) - hy0);
      ctx.strokeRect(hx0, hy0, toX(HOSPITAL_BOUNDS.xMax) - hx0, toY(HOSPITAL_BOUNDS.zFront) - hy0);

      // Labels
      ctx.fillStyle = '#e5e0d0';
      ctx.textAlign = 'center';
      ctx.font = '700 18px Cairo, Tahoma';
      ctx.fillText('مستشفى السدرة الريفي (طابقان)', toX(0), toY(-24));
      ctx.font = '700 14px Cairo, Tahoma';
      ctx.fillStyle = '#a8d4ce';
      ctx.fillText('ساحة الإسعاف والمدخل الرئيسي', toX(0), toY(2));
      ctx.fillStyle = '#e2be84';
      ctx.fillText('الطريق الطيني في الغابة', toX(roadCenterX(36) + 8), toY(36));
      ctx.fillStyle = '#8fd4a4';
      ctx.fillText('نقطة البداية (غابة الصنوبر)', toX(-10.5), toY(75));

      if (activeMission && activeMission.target.floor === 0) {
        this._drawTargetMarker(ctx, toX(activeMission.target.x), toY(activeMission.target.z));
      }
      this._drawPlayerMarker(ctx, toX(PLAYER.x), toY(PLAYER.z));
      return;
    }

    // ===== HOSPITAL FLOOR 1 OR FLOOR 2 ARCHITECTURAL BLUEPRINT =====
    const isF2 = this.activeTab === 'f2';
    const xMin = isF2 ? -13 : -26;
    const xMax = isF2 ? 17 : 26;
    const zMin = isF2 ? -43.5 : -44;
    const zMax = isF2 ? -17.5 : -3.5;

    const pad = 46;
    const scaleX = (W - pad * 2) / (xMax - xMin);
    const scaleY = (H - pad * 2) / (zMax - zMin);
    const scale = Math.min(scaleX, scaleY);
    const ox = (W - (xMax - xMin) * scale) * 0.5;
    const oy = (H - (zMax - zMin) * scale) * 0.5;
    const toX = (wx) => ox + (wx - xMin) * scale;
    const toY = (wz) => oy + (wz - zMin) * scale;

    // Room fills & labels
    ROOMS.filter((r) => r.floor === (isF2 ? 2 : 1)).forEach((r) => {
      const rx = toX(r.x0);
      const ry = toY(r.z0);
      const rw = toX(r.x1) - rx;
      const rh = toY(r.z1) - ry;
      ctx.fillStyle = STATE.discoveredRooms.has(r.id) ? r.mapColor.replace(/0\.\d+\)/, '0.42)') : r.mapColor;
      ctx.fillRect(rx, ry, rw, rh);

      if (!r.isCorridor) {
        ctx.fillStyle = '#e8eee8';
        const fontSize = isF2 ? 15 : rw < 115 ? 11.5 : 13;
        ctx.font = `700 ${fontSize}px Cairo, Tahoma`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const lx = toX(r.labelPos.x);
        const ly = toY(r.labelPos.z);
        const words = r.name.split(' ');
        if (words.length >= 2 && ctx.measureText(r.name).width > rw - 12) {
          const mid = Math.ceil(words.length / 2);
          ctx.fillText(words.slice(0, mid).join(' '), lx, ly - fontSize * 0.65);
          ctx.fillText(words.slice(mid).join(' '), lx, ly + fontSize * 0.65);
        } else {
          ctx.fillText(r.name, lx, ly);
        }
      }
    });

    // Draw Stairwell steps hatch symbol
    const st = STAIRWELL_SPEC;
    ctx.strokeStyle = 'rgba(230, 190, 110, 0.8)';
    ctx.lineWidth = 1.4;
    const sx0 = toX(st.x0);
    const sx1 = toX(st.x1);
    for (let i = 0; i <= 8; i++) {
      const sz = st.zBottom + ((st.zTop - st.zBottom) * i) / 8;
      ctx.beginPath();
      ctx.moveTo(sx0, toY(sz));
      ctx.lineTo(sx1, toY(sz));
      ctx.stroke();
    }
    ctx.fillStyle = '#f2c868';
    ctx.font = '700 12px Cairo, Tahoma';
    ctx.textAlign = 'center';
    ctx.fillText('درج ▲▼', (sx0 + sx1) * 0.5, toY((st.zBottom + st.zTop) * 0.5));

    // Architectural walls + doorways
    this._drawWalls(ctx, isF2 ? WALLS_F2 : WALLS_F1, toX, toY);

    // Main Entrance marker on Floor 1
    if (!isF2) {
      ctx.fillStyle = '#7be0a2';
      ctx.font = '700 13px Cairo, Tahoma';
      ctx.textAlign = 'center';
      ctx.fillText('▲ المدخل الرئيسي (مظلة الإسعاف)', toX(0), toY(-4.6));
    }

    // Golden clue markers
    this.clueObjects.forEach((c) => {
      const cFloor = c.y > FLOOR2_Y * 0.55 ? 2 : 1;
      if (c.z > -6 || cFloor !== (isF2 ? 2 : 1)) return;
      const cx = toX(c.x);
      const cy = toY(c.z);
      ctx.fillStyle = c.collected ? '#64b882' : '#f2c15a';
      ctx.beginPath();
      ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Active Mission marker if on this floor
    if (activeMission && activeMission.target.floor === (isF2 ? 2 : 1)) {
      this._drawTargetMarker(ctx, toX(activeMission.target.x), toY(activeMission.target.z));
    }

    // Player live marker if on this floor
    const playerFloor = PLAYER.y > FLOOR2_Y * 0.55 ? 2 : 1;
    if (PLAYER.z <= -3 && playerFloor === (isF2 ? 2 : 1)) {
      this._drawPlayerMarker(ctx, toX(PLAYER.x), toY(PLAYER.z));
    } else {
      ctx.fillStyle = 'rgba(180, 210, 215, 0.72)';
      ctx.font = '700 13px Cairo, Tahoma';
      ctx.textAlign = 'center';
      ctx.fillText(
        PLAYER.z > -3 ? 'أنت حاليًا خارج المستشفى (اختر تبويب الغابة والطريق)' : 'أنت حاليًا في الطابق الآخر',
        W * 0.5,
        H - 28
      );
    }
  }
}
