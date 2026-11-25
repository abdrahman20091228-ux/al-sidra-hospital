import { clamp, terrainHeight } from '../utils/math.js';
import { FLOOR2_Y } from './config.js';

/**
 * Spatial collision & elevation solver.
 * Handles AABB wall/furniture boxes, cylindrical colliders (trees/pillars/gurneys),
 * exterior forest terrain, courtyard steps, and the architectural hospital stairwell.
 */
export class PhysicsWorld {
  constructor() {
    this.boxes = [];   // { x0, x1, y0, y1, z0, z1 }
    this.circles = []; // { x, z, r, y0, y1 }
    this.stairs = [];  // { x0, x1, z0, z1, zStart, zEnd, yStart, yEnd }
    this.ramps = [];   // { x0, x1, z0, z1, yAt(x, z) }
    this.bounds = { xMin: -54, xMax: 54, zMin: -42.5, zMax: 80 };
  }

  clear() {
    this.boxes.length = 0;
    this.circles.length = 0;
    this.stairs.length = 0;
    this.ramps.length = 0;
  }

  addBox(x0, y0, z0, x1, y1, z1) {
    this.boxes.push({
      x0: Math.min(x0, x1),
      x1: Math.max(x0, x1),
      y0: Math.min(y0, y1),
      y1: Math.max(y0, y1),
      z0: Math.min(z0, z1),
      z1: Math.max(z0, z1),
    });
  }

  addBoxCenter(cx, cy, cz, w, h, d) {
    this.addBox(cx - w / 2, cy - h / 2, cz - d / 2, cx + w / 2, cy + h / 2, cz + d / 2);
  }

  addCircle(x, z, r, y0 = -2, y1 = 6) {
    this.circles.push({ x, z, r, y0, y1 });
  }

  addStair(spec) {
    this.stairs.push(spec);
  }

  isFree(x, y, z, r) {
    if (x < this.bounds.xMin || x > this.bounds.xMax || z < this.bounds.zMin || z > this.bounds.zMax) {
      return false;
    }
    const footY = y + 0.35;
    const headY = y + 1.62;

    for (let i = 0; i < this.boxes.length; i++) {
      const b = this.boxes[i];
      if (headY > b.y0 && footY < b.y1) {
        if (x + r > b.x0 && x - r < b.x1 && z + r > b.z0 && z - r < b.z1) {
          return false;
        }
      }
    }

    for (let i = 0; i < this.circles.length; i++) {
      const c = this.circles[i];
      if (headY > c.y0 && footY < c.y1) {
        const dx = x - c.x;
        const dz = z - c.z;
        const rr = r + c.r;
        if (dx * dx + dz * dz < rr * rr) {
          return false;
        }
      }
    }
    return true;
  }

  moveAndSlide(x, y, z, dx, dz, r) {
    let nx = x + dx;
    if (!this.isFree(nx, y, z, r)) {
      nx = x;
    }
    let nz = z + dz;
    if (!this.isFree(nx, y, nz, r)) {
      nz = z;
    }
    const ny = this.resolveElevation(nx, y, nz);
    return { x: nx, y: ny, z: nz };
  }

  resolveElevation(x, currentY, z) {
    // 1. Check architectural stairs (smooth continuous interpolation)
    for (let i = 0; i < this.stairs.length; i++) {
      const st = this.stairs[i];
      if (x >= st.x0 && x <= st.x1 && z >= st.z0 && z <= st.z1) {
        const t = st.axis === 'x'
          ? clamp((x - st.start) / (st.end - st.start), 0, 1)
          : clamp((z - st.start) / (st.end - st.start), 0, 1);
        return st.yStart + (st.yEnd - st.yStart) * t;
      }
    }

    // 2. Inside hospital building footprint (z <= -5.6)
    if (z <= -5.6) {
      return currentY > FLOOR2_Y * 0.55 ? FLOOR2_Y : 0;
    }

    // 3. Exterior entrance porch steps / ramp (x in [-4.5, 4.5], z in [-5.6, -3.4])
    if (z <= -3.4 && Math.abs(x) <= 4.6) {
      return 0;
    }

    // 4. Outdoor forest & muddy road terrain
    if (z > 9.0) {
      return terrainHeight(x, z);
    }
    return 0;
  }

  /**
   * Line-of-sight raymarch against horizontal boxes (for mission filming lock).
   */
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
      for (let i = 0; i < this.boxes.length; i++) {
        const b = this.boxes[i];
        if (px > b.x0 && px < b.x1 && py > b.y0 && py < b.y1 && pz > b.z0 && pz < b.z1) {
          return false;
        }
      }
    }
    return true;
  }
}
