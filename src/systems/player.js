import { FLOOR2_Y, INPUT, PLAYER, SETTINGS, STATE } from '../core/config.js';
import { clamp, getSurfaceType, terrainHeight } from '../utils/math.js';

const WALK_SPEED = 3.1;
const SPRINT_SPEED = 4.9;
const JOY_MAX = 50;

/**
 * First-person movement & dual-control system:
 * - Mobile: dynamic left-half floating thumb joystick (+ push up to sprint) & right-half drag camera
 * - Desktop: WASD / Arrow keys + Shift sprint + Mouse drag or click-to-look
 */
export class PlayerController {
  constructor(containerEl, joyEls, physics, audio) {
    this.container = containerEl;
    this.joyEls = joyEls;
    this.physics = physics;
    this.audio = audio;

    this.joyId = null;
    this.lookId = null;
    this.joyOrigin = { x: 0, y: 0 };
    this.lookLast = { x: 0, y: 0 };
    this.isRotated = false;

    this._bindEvents();
  }

  setRotated(rot) {
    this.isRotated = rot;
  }

  resetSpawn() {
    PLAYER.x = -10.5;
    PLAYER.z = 71.0;
    PLAYER.y = terrainHeight(PLAYER.x, PLAYER.z);
    PLAYER.vx = 0;
    PLAYER.vz = 0;
    PLAYER.yaw = -0.34;
    PLAYER.pitch = -0.02;
    PLAYER.bob = 0;
    PLAYER.stepTimer = 0.2;
    PLAYER.exhausted = false;
    STATE.stamina = 100;
    this._endJoy();
  }

  teleport(x, y, z, yaw = 0, pitch = -0.03) {
    PLAYER.x = x;
    PLAYER.y = y;
    PLAYER.z = z;
    PLAYER.vx = 0;
    PLAYER.vz = 0;
    PLAYER.yaw = yaw;
    PLAYER.pitch = pitch;
    PLAYER.onFloor2 = y > FLOOR2_Y * 0.55;
  }

  _mapXY(cx, cy) {
    return this.isRotated ? { x: cy, y: window.innerWidth - cx } : { x: cx, y: cy };
  }

  _startJoy(x, y) {
    this.joyOrigin.x = x;
    this.joyOrigin.y = y;
    this.joyEls.root.style.left = `${x}px`;
    this.joyEls.root.style.top = `${y}px`;
    this.joyEls.root.style.opacity = '1';
    this._moveJoy(x, y);
  }

  _moveJoy(x, y) {
    const dx = x - this.joyOrigin.x;
    const dy = y - this.joyOrigin.y;
    const d = Math.hypot(dx, dy);
    const nx = d > JOY_MAX ? (dx / d) * JOY_MAX : dx;
    const ny = d > JOY_MAX ? (dy / d) * JOY_MAX : dy;
    this.joyEls.nub.style.transform = `translate(${nx}px, ${ny}px)`;
    INPUT.joyX = nx / JOY_MAX;
    INPUT.joyY = -ny / JOY_MAX;
    INPUT.joySprint = dy < -(JOY_MAX + 12);
    this.joyEls.sprint.classList.toggle('on', INPUT.joySprint);
  }

  _endJoy() {
    INPUT.joyX = 0;
    INPUT.joyY = 0;
    INPUT.joySprint = false;
    this.joyId = null;
    this.joyEls.root.style.opacity = '0';
    this.joyEls.nub.style.transform = 'translate(0, 0)';
    this.joyEls.sprint.classList.remove('on');
  }

  _canControl() {
    return (
      STATE.booted &&
      STATE.phase === 'play' &&
      !STATE.paused &&
      !STATE.inSettings &&
      !STATE.inMap &&
      !STATE.inDossier &&
      !STATE.inNote
    );
  }

  _bindEvents() {
    const splitRatio = 0.45;

    this.container.addEventListener(
      'touchstart',
      (e) => {
        if (!this._canControl()) return;
        if (e.target.closest('button')) return;
        e.preventDefault();
        const w = this.container.clientWidth || window.innerWidth;
        for (const t of e.changedTouches) {
          const p = this._mapXY(t.clientX, t.clientY);
          if (p.x < w * splitRatio && this.joyId === null) {
            this.joyId = t.identifier;
            this._startJoy(p.x, p.y);
          } else if (p.x >= w * splitRatio && this.lookId === null) {
            this.lookId = t.identifier;
            this.lookLast.x = p.x;
            this.lookLast.y = p.y;
          }
        }
      },
      { passive: false }
    );

    this.container.addEventListener(
      'touchmove',
      (e) => {
        if (!this._canControl()) return;
        if (e.target.closest('button')) return;
        e.preventDefault();
        for (const t of e.changedTouches) {
          const p = this._mapXY(t.clientX, t.clientY);
          if (t.identifier === this.joyId) {
            this._moveJoy(p.x, p.y);
          } else if (t.identifier === this.lookId) {
            const dx = p.x - this.lookLast.x;
            const dy = p.y - this.lookLast.y;
            this.lookLast.x = p.x;
            this.lookLast.y = p.y;
            PLAYER.yaw -= dx * 0.0042 * SETTINGS.sens;
            PLAYER.pitch = clamp(PLAYER.pitch - dy * 0.0034 * SETTINGS.sens, -1.2, 1.2);
          }
        }
      },
      { passive: false }
    );

    const endTouch = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.joyId) this._endJoy();
        if (t.identifier === this.lookId) this.lookId = null;
      }
    };
    this.container.addEventListener('touchend', endTouch, { passive: true });
    this.container.addEventListener('touchcancel', endTouch, { passive: true });

    // Desktop drag-look + left-drag virtual joystick support
    this.container.addEventListener('mousedown', (e) => {
      if (!this._canControl() || e.target.closest('button')) return;
      const p = this._mapXY(e.clientX, e.clientY);
      this.lookId = 'mouse';
      this.lookLast.x = p.x;
      this.lookLast.y = p.y;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.lookId === 'mouse' && this._canControl()) {
        const p = this._mapXY(e.clientX, e.clientY);
        const dx = p.x - this.lookLast.x;
        const dy = p.y - this.lookLast.y;
        this.lookLast.x = p.x;
        this.lookLast.y = p.y;
        PLAYER.yaw -= dx * 0.0035 * SETTINGS.sens;
        PLAYER.pitch = clamp(PLAYER.pitch - dy * 0.0028 * SETTINGS.sens, -1.2, 1.2);
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.lookId === 'mouse') this.lookId = null;
    });
  }

  update(dt, camera) {
    let ix = INPUT.joyX;
    let iz = INPUT.joyY;
    if (INPUT.keys.KeyW || INPUT.keys.ArrowUp) iz += 1;
    if (INPUT.keys.KeyS || INPUT.keys.ArrowDown) iz -= 1;
    if (INPUT.keys.KeyD || INPUT.keys.ArrowRight) ix += 1;
    if (INPUT.keys.KeyA || INPUT.keys.ArrowLeft) ix -= 1;

    const mag = Math.hypot(ix, iz);
    if (mag > 1) {
      ix /= mag;
      iz /= mag;
    }

    const wantSprint = (INPUT.joySprint || INPUT.keys.ShiftLeft || INPUT.keys.ShiftRight) && iz > 0.15;
    if (PLAYER.exhausted && STATE.stamina > 28) PLAYER.exhausted = false;
    const sprinting = wantSprint && !PLAYER.exhausted && STATE.stamina > 1;
    if (sprinting) {
      STATE.stamina = Math.max(0, STATE.stamina - 16 * dt);
      if (STATE.stamina <= 1) PLAYER.exhausted = true;
    } else {
      STATE.stamina = Math.min(100, STATE.stamina + 20 * dt);
    }

    const speed = sprinting ? SPRINT_SPEED : WALK_SPEED;
    const sy = Math.sin(PLAYER.yaw);
    const cy = Math.cos(PLAYER.yaw);
    const tvx = (-sy * iz + cy * ix) * speed;
    const tvz = (-cy * iz - sy * ix) * speed;
    const smooth = 1 - Math.exp(-dt * 12);
    PLAYER.vx += (tvx - PLAYER.vx) * smooth;
    PLAYER.vz += (tvz - PLAYER.vz) * smooth;

    const next = this.physics.moveAndSlide(
      PLAYER.x,
      PLAYER.y,
      PLAYER.z,
      PLAYER.vx * dt,
      PLAYER.vz * dt,
      PLAYER.radius
    );
    PLAYER.x = next.x;
    PLAYER.y = next.y;
    PLAYER.z = next.z;
    PLAYER.onFloor2 = PLAYER.y > FLOOR2_Y * 0.55;

    // Head bob & surface-aware footsteps
    const horizSpeed = Math.hypot(PLAYER.vx, PLAYER.vz);
    const moveFactor = Math.min(1, horizSpeed / WALK_SPEED);
    PLAYER.bob += dt * (sprinting ? 11.2 : 8.0) * moveFactor;

    if (horizSpeed > 0.45) {
      PLAYER.stepTimer -= dt;
      if (PLAYER.stepTimer <= 0) {
        const surf = getSurfaceType(PLAYER.x, PLAYER.y, PLAYER.z);
        this.audio.footstep(surf, sprinting);
        PLAYER.stepAlt *= -1;
        PLAYER.stepTimer = sprinting ? 0.34 : 0.47;
      }
    } else {
      PLAYER.stepTimer = Math.min(PLAYER.stepTimer, 0.14);
    }

    // Subtle organic breathing sway + walking bob
    const bobY = Math.sin(PLAYER.bob * 2) * 0.032 * moveFactor;
    const rollZ = Math.sin(PLAYER.bob) * 0.0045 * moveFactor + Math.sin(STATE.rt * 0.85) * 0.0012;
    camera.position.set(PLAYER.x, PLAYER.y + PLAYER.eyeY + bobY, PLAYER.z);
    camera.rotation.set(
      PLAYER.pitch + Math.sin(STATE.rt * 1.25) * 0.0012,
      PLAYER.yaw + Math.cos(STATE.rt * 0.95) * 0.001,
      rollZ
    );
  }
}
