import { clamp, terrainHeight } from '../utils/math.js';
import { FLOOR2_Y, PLAYER } from './config.js';

/**
 * Spatial collision & elevation solver:
 * - Separate wallBoxes (wider wallRadius = 0.42 so camera NEVER clips wall faces!)
 * - Tighter propBoxes & circles (smaller propRadius = 0.23 so moving around hospital furniture is super smooth!)
 * - Vertical continuity guard on stairs so you NEVER snap onto the wrong end or hit an invisible ceiling wall!
 */
export class PhysicsWorld {
  constructor() {
    this.wallBoxes = []; // { x0, x1, y0, y1, z0, z1 }
    this.propBoxes = []; // { x0, x1, y0, y1, z0, z1 }
    this.circles = [];   // { x, z, r, y0, y1, isWall }
    this.stairs = [];    // { x0, x1, z0, z1, axis, start, end, yStart, yEnd }
    this.bounds = { xMin: -54, xMax: 54, zMin: -42.5, zMax: 80 };
  }

  clear() {
    this.wallBoxes.length = 0;
    this.propBoxes.length = 0;
    this.circles.length = 0;
    this.stairs.length = 0;
  }

  addWallBox(x0, y0, z0, x1, y1, z1) {
    this.wallBoxes.push({
      x0: Math.min(x0, x1),
      x1: Math.max(x0, x1),
      y0: Math.min(y0, y1),
      y1: Math.max(y0, y1),
      z0: Math.min(z0, z1),
      z1: Math.max(z0, z1),
    });
  }

  addBox(x0, y0, z0, x1, y1, z1, isWall = false) {
    const entry = {
      x0: Math.min(x0, x1),
      x1: Math.max(x0, x1),
      y0: Math.min(y0, y1),
      y1: Math.max(y0, y1),
      z0: Math.min(z0, z1),
      z1: Math.max(z0, z1),
    };
    if (isWall) this.wallBoxes.push(entry);
    else this.propBoxes.push(entry);
  }

  addBoxCenter(cx, cy, cz, w, h, d, isWall = false) {
    this.addBox(cx - w / 2, cy - h / 2, cz - d / 2, cx + w / 2, cy + h / 2, cz + d / 2, isWall);
  }

  addCircle(x, z, r, y0 = -2, y1 = 6, isWall = false) {
    // Shrink non-wall prop collision radii slightly so navigating cluttered hospital rooms feels effortless
    const effR = isWall ? r : Math.max(0.14, r * 0.72);
    this.circles.push({ x, z, r: effR, y0, y1, isWall });
  }

  addStair(spec) {
    this.stairs.push(spec);
  }

  isFree(x, y, z, rWall = PLAYER.wallRadius, rProp = PLAYER.propRadius) {
    if (x < this.bounds.xMin || x > this.bounds.xMax || z < this.bounds.zMin || z > this.bounds.zMax) {
      return false;
    }
    const footY = y + 0.35;
    const headY = y + 1.62;

    for (let i = 0; i < this.wallBoxes.length; i++) {
      const b = this.wallBoxes[i];
      if (headY > b.y0 && footY < b.y1) {
        if (x + rWall > b.x0 && x - rWall < b.x1 && z + rWall > b.z0 && z - rWall < b.z1) {
          return false;
        }
      }
    }

    for (let i = 0; i < this.propBoxes.length; i++) {
      const b = this.propBoxes[i];
      if (headY > b.y0 && footY < b.y1) {
        if (x + rProp > b.x0 && x - rProp < b.x1 && z + rProp > b.z0 && z - rProp < b.z1) {
          return false;
        }
      }
    }

    for (let i = 0; i < this.circles.length; i++) {
      const c = this.circles[i];
      if (headY > c.y0 && footY < c.y1) {
        const dx = x - c.x;
        const dz = z - c.z;
        const rr = (c.isWall ? rWall : rProp) + c.r;
        if (dx * dx + dz * dz < rr * rr) {
          return false;
        }
      }
    }
    return true;
  }

  moveAndSlide(x, y, z, dx, dz) {
    const rWall = PLAYER.wallRadius;
    const rProp = PLAYER.propRadius;

    let nx = x + dx;
    const nyX = this.resolveElevation(nx, y, z);
    if (!this.isFree(nx, nyX, z, rWall, rProp)) {
      nx = x;
    }

    let nz = z + dz;
    const nyZ = this.resolveElevation(nx, y, nz);
    if (!this.isFree(nx, nyZ, nz, rWall, rProp)) {
      nz = z;
    }

    const ny = this.resolveElevation(nx, y, nz);
    return { x: nx, y: ny, z: nz };
  }

  resolveElevation(x, currentY, z) {
    // 1. Check architectural stairs with vertical continuity guard (prevents snapping to upper landing from underneath!)
    for (let i = 0; i < this.stairs.length; i++) {
      const st = this.stairs[i];
      if (x >= st.x0 && x <= st.x1 && z >= st.z0 && z <= st.z1) {
        const t = st.axis === 'x'
          ? clamp((x - st.start) / (st.end - st.start), 0, 1)
          : clamp((z - st.start) / (st.end - st.start), 0, 1);
        const stairY = st.yStart + (st.yEnd - st.yStart) * t;
        if (Math.abs(stairY - currentY) <= 1.25) {
          return stairY;
        }
      }
    }

    // 2. Inside hospital building footprint (z <= -5.6)
    if (z <= -5.6) {
      return currentY > FLOOR2_Y * 0.55 ? FLOOR2_Y : 0;
    }

    // 3. Courtyard & porch (z in [-5.6, 8.6])
    if (z <= 8.6) {
      return 0;
    }

    // 4. Outdoor forest & sculpted muddy road terrain (z > 8.6)
    return terrainHeight(x, z);
  }

  hasLineOfSight(ax, ay, az, bx, by, bz) {
    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;
    const dist = Math.hypot(dx, dy, dz);
    const steps = Math.max(4, Math.ceil(dist / 0.45));
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const px = ax + dx * t;
      const py = ay + dy * t;
      const pz = az + dz * t;
      for (let i = 0; i < this.wallBoxes.length; i++) {
        const b = this.wallBoxes[i];
        if (px > b.x0 && px < b.x1 && py > b.y0 && py < b.y1 && pz > b.z0 && pz < b.z1) {
          return false;
        }
      }
    }
    return true;
  }
}
