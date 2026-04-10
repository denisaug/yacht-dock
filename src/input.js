// Touch + keyboard input -> control state

const SLOW_THR  = 0.05;  // throttle at SLOW detent (~1 kn terminal)
const RAMP_UP   = 0.60;  // throttle/s ramping up
const RAMP_DOWN = 1.10;  // throttle/s ramping back to SLOW (click mode)

export class Input {
  constructor() {
    this.throttle     = 0;
    this.rudder       = 0;
    this.thruster     = 0;
    this.gear         = 0;     // -1=astern · 0=neutral · +1=ahead
    this.gearThrottle = 0;     // 0..1
    this.onGearChange = null;  // callback(gear) on detent click

    // 'click'  – three detents (SLOW AST / NEUTRAL / SLOW AHD).
    //            Pressing opposite direction ramps smoothly to SLOW, stops.
    //            Another press clicks to NEUTRAL; another to SLOW opposite.
    // 'smooth' – fully analog, no clicks. Hold UP/DOWN to ramp throttle.
    this.throttleMode = 'click';

    this.held = new Set();
    this._pendingUp   = 0;
    this._pendingDown = 0;

    this._bindKeyboard();
  }

  reset() {
    this.gear = 0; this.gearThrottle = 0; this.throttle = 0;
    this._pendingUp = 0; this._pendingDown = 0;
  }

  bindTouch(container) {
    const btns = container.querySelectorAll('[data-ctrl]');
    btns.forEach(btn => {
      const ctrl = btn.dataset.ctrl;
      const press = e => {
        e.preventDefault();
        if (!this.held.has(ctrl)) {
          if (ctrl === 'throttle-up')   this._pendingUp++;
          if (ctrl === 'throttle-down') this._pendingDown++;
        }
        this.held.add(ctrl);
        btn.classList.add('active');
      };
      const rel = e => {
        e.preventDefault();
        this.held.delete(ctrl);
        btn.classList.remove('active');
      };
      btn.addEventListener('touchstart',  press, {passive:false});
      btn.addEventListener('touchend',    rel,   {passive:false});
      btn.addEventListener('touchcancel', rel,   {passive:false});
      btn.addEventListener('mousedown',   press);
      btn.addEventListener('mouseup',     rel);
      btn.addEventListener('mouseleave',  rel);
    });
  }

  _bindKeyboard() {
    const map = {
      'ArrowLeft':  'rudder-left',  'KeyA': 'rudder-left',
      'ArrowRight': 'rudder-right', 'KeyD': 'rudder-right',
      'ArrowUp':    'throttle-up',  'KeyW': 'throttle-up',
      'ArrowDown':  'throttle-down','KeyS': 'throttle-down',
      'KeyQ': 'thruster-left', 'KeyE': 'thruster-right',
    };
    window.addEventListener('keydown', e => {
      const c = map[e.code];
      if (c) {
        if (!this.held.has(c)) {
          if (c === 'throttle-up')   this._pendingUp++;
          if (c === 'throttle-down') this._pendingDown++;
        }
        this.held.add(c);
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', e => {
      const c = map[e.code];
      if (c) { this.held.delete(c); e.preventDefault(); }
    });
  }

  update(dt) {
    // ── Rudder ───────────────────────────────────────────────────────────────
    const rudderSpeed = 2.5;
    if (this.held.has('rudder-left'))       this.rudder = Math.max(-1, this.rudder - rudderSpeed * dt);
    else if (this.held.has('rudder-right')) this.rudder = Math.min(1,  this.rudder + rudderSpeed * dt);

    const upHeld   = this.held.has('throttle-up');
    const downHeld = this.held.has('throttle-down');

    // ── SMOOTH MODE: fully analog, no detents ────────────────────────────────
    if (this.throttleMode === 'smooth') {
      if (upHeld && !downHeld)        this.throttle = Math.min(1,  this.throttle + RAMP_UP * dt);
      else if (downHeld && !upHeld)   this.throttle = Math.max(-1, this.throttle - RAMP_UP * dt);
      // Neither held → holds current value

      // Derive gear/gearThrottle for HUD
      this.gear         = this.throttle > 0.001 ? 1 : this.throttle < -0.001 ? -1 : 0;
      this.gearThrottle = Math.abs(this.throttle);

      this._pendingUp = 0; this._pendingDown = 0; // unused in smooth mode
    }

    // ── CLICK MODE: ramp to SLOW, then click between detents ─────────────────
    else {
      // Detent transitions via pending (works even for sub-frame taps)
      if (this._pendingUp > 0 && !downHeld) {
        this._pendingUp--;
        if (this.gear === 0) {
          // NEUTRAL → SLOW AHEAD
          this.gear = 1; this.gearThrottle = SLOW_THR;
          this.onGearChange?.(1);
        } else if (this.gear === -1 && this.gearThrottle <= SLOW_THR + 0.001) {
          // SLOW ASTERN → NEUTRAL  (only when already at SLOW detent)
          this.gear = 0; this.gearThrottle = 0;
          this.onGearChange?.(0);
        }
        // gear=+1 or gear=-1 with high throttle: pending consumed, ramp below handles it
      }

      if (this._pendingDown > 0 && !upHeld) {
        this._pendingDown--;
        if (this.gear === 0) {
          // NEUTRAL → SLOW ASTERN
          this.gear = -1; this.gearThrottle = SLOW_THR;
          this.onGearChange?.(-1);
        } else if (this.gear === 1 && this.gearThrottle <= SLOW_THR + 0.001) {
          // SLOW AHEAD → NEUTRAL  (only when already at SLOW detent)
          this.gear = 0; this.gearThrottle = 0;
          this.onGearChange?.(0);
        }
        // gear=-1 or gear=+1 with high throttle: pending consumed, ramp below handles it
      }

      // Ramps
      if (upHeld && !downHeld) {
        if (this.gear === 1) {
          // Ramp AHEAD throttle UP
          this.gearThrottle = Math.min(1, this.gearThrottle + RAMP_UP * dt);
        } else if (this.gear === -1 && this.gearThrottle > SLOW_THR + 0.001) {
          // Ramp ASTERN throttle smoothly DOWN to SLOW, then stop
          this.gearThrottle -= RAMP_DOWN * dt;
          if (this.gearThrottle <= SLOW_THR) {
            this.gearThrottle = SLOW_THR;
            this.onGearChange?.(-1); // click at SLOW ASTERN detent
          }
        }
      }

      if (downHeld && !upHeld) {
        if (this.gear === -1) {
          // Ramp ASTERN throttle UP
          this.gearThrottle = Math.min(1, this.gearThrottle + RAMP_UP * dt);
        } else if (this.gear === 1 && this.gearThrottle > SLOW_THR + 0.001) {
          // Ramp AHEAD throttle smoothly DOWN to SLOW, then stop
          this.gearThrottle -= RAMP_DOWN * dt;
          if (this.gearThrottle <= SLOW_THR) {
            this.gearThrottle = SLOW_THR;
            this.onGearChange?.(1); // click at SLOW AHEAD detent
          }
        }
      }
      // Neither held → lever holds position

      this.throttle = this.gear * this.gearThrottle;
    }

    // ── Thruster: momentary ──────────────────────────────────────────────────
    const thrusterSpeed  = 4.0;
    const thrusterReturn = 3.0;
    if (this.held.has('thruster-left'))       this.thruster = Math.max(-1, this.thruster - thrusterSpeed * dt);
    else if (this.held.has('thruster-right')) this.thruster = Math.min(1,  this.thruster + thrusterSpeed * dt);
    else {
      if (this.thruster > 0) this.thruster = Math.max(0, this.thruster - thrusterReturn * dt);
      else if (this.thruster < 0) this.thruster = Math.min(0, this.thruster + thrusterReturn * dt);
    }
  }
}
