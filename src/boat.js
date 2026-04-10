// Boat state + semi-realistic physics
// Units: metres, seconds, kilograms, newtons
// Frame: world X right, Y down. heading = radians, 0 = +X (east).
import { yachtProfile, KEEL_FACTOR, RUDDER_FACTOR } from './config.js';

const KNOT_TO_MS = 0.5144;

export class Boat {
  constructor(cfg) {
    this.cfg = cfg;
    const p = yachtProfile(cfg.length);
    Object.assign(this, p);
    this.keel = KEEL_FACTOR[cfg.keel];
    this.rudderK = RUDDER_FACTOR[cfg.rudder];
    this.hasThruster = cfg.thruster === 'yes';

    // Kinematics
    this.x = 0;
    this.y = 0;
    this.heading = 0;
    this.vx = 0;
    this.vy = 0;
    this.omega = 0;

    // Controls (target state, driven by input)
    this.throttle = 0;     // -1..1  (stick position)
    this.rudder   = 0;     // -1..1  (port negative, stbd positive)
    this.thruster = 0;     // -1..1  (bow thruster)

    // Smoothed control (engines/rudder have lag)
    this.sThrottle = 0;
    this.sRudder   = 0;
    this.sThruster = 0;

    // Status
    this.alive = true;
    this.collisionImpulse = 0;
    this.moored = false;
  }

  get speedMs() { return Math.hypot(this.vx, this.vy); }
  get speedKn() { return this.speedMs / KNOT_TO_MS; }
  get forwardSpeed() {
    return this.vx * Math.cos(this.heading) + this.vy * Math.sin(this.heading);
  }

  setControls({throttle, rudder, thruster}) {
    if (throttle !== undefined) this.throttle = Math.max(-1, Math.min(1, throttle));
    if (rudder   !== undefined) this.rudder   = Math.max(-1, Math.min(1, rudder));
    if (thruster !== undefined) this.thruster = Math.max(-1, Math.min(1, thruster));
  }

  // Integrate one timestep
  step(dt, wind) {
    // Smooth control lag
    const lag = (cur, tgt, rate) => cur + (tgt - cur) * Math.min(1, rate * dt);
    this.sThrottle = lag(this.sThrottle, this.throttle, 2.0);
    this.sRudder   = lag(this.sRudder,   this.rudder,   5.0);
    this.sThruster = lag(this.sThruster, this.thruster, 4.0);

    const ch = Math.cos(this.heading);
    const sh = Math.sin(this.heading);

    // Decompose velocity into body frame (forward/lateral)
    const vFwd = this.vx * ch + this.vy * sh;
    const vLat = -this.vx * sh + this.vy * ch;

    // --- Forces in body frame ---
    let fFwd = 0, fLat = 0, torque = 0;

    // Engine thrust along body X
    const tEng = this.sThrottle >= 0
      ? this.sThrottle * this.maxThrustN
      : this.sThrottle * this.maxReverseN;
    fFwd += tEng;

    // Prop walk: RH prop in reverse → stern to port, bow to starboard (positive torque)
    if (this.sThrottle < 0) {
      const walk = -this.sThrottle * this.rudderK.propWalk * this.maxReverseN;
      torque += walk * this.lm * 0.30;
    }

    // Rudder: creates lateral force at stern proportional to water flow past rudder blade(s).
    // Flow = boat forward speed + prop wash.
    // Prop wash only reaches the rudder on single-rudder boats (rudder sits in slipstream).
    // Twin rudders are outboard — slipstream passes between them, propWashFactor ≈ 0.05.
    // This makes single rudder effective at low/zero boat speed when engine is running;
    // twin rudder needs actual sternway/headway to generate steering force.
    const propWash = this.sThrottle > 0
      ? this.sThrottle * 1.8 * this.rudderK.propWashFactor
      : 0;
    const flow = vFwd + propWash;
    // Reverse debuff: going astern, flow hits blade from tuck side → ~45-55 % less lift.
    // Under reverse power the prop jet goes toward bow, partially starving the rudder.
    const revDebuff = vFwd < 0
      ? Math.max(0.40, 0.55 + this.sThrottle * 0.15)
      : 1.0;
    // Rudder lift ∝ flow² × sign(flow). Calibrated for 6-9°/s at 4 kn forward.
    // Negative flow (astern) automatically reverses steering sense:
    // right wheel astern → bow to port (correct single-screw behaviour).
    const rudderForce = -this.sRudder * flow * Math.abs(flow) * 280 * this.rudderK.eff * this.keel.turn * revDebuff;
    fLat += rudderForce;
    torque -= rudderForce * this.lm * 0.45; // applied at stern

    // Bow thruster (only effective at low speed)
    if (this.hasThruster) {
      const absSpeed = Math.abs(vFwd);
      const thEff = Math.max(0, 1 - absSpeed / 2.0); // drops off above ~4 kn
      const tF = this.sThruster * this.maxThrusterN * thEff;
      fLat += tF * 0.4;
      torque += tF * this.lm * 0.48;
    }

    // --- Water drag (body frame) ---
    // Forward drag coefficient is calibrated so that max throttle gives ~7 kn terminal speed
    // for a 40ft yacht (10 kN thrust / 770 ~= 13, sqrt ~= 3.6 m/s = 7 kn).
    // Lateral drag dominates forward by ~2x (keel holds water vs free flow).
    const dragFwd = -vFwd * Math.abs(vFwd) * 770 * this.keel.fwd;
    const dragLat = -vLat * Math.abs(vLat) * 1500 * this.keel.side;
    fFwd += dragFwd;
    fLat += dragLat;

    // Angular drag
    torque -= this.omega * Math.abs(this.omega) * this.inertia * 2.2;

    // Reverse directional instability: hull moving stern-first behaves like an arrow flying
    // tail-first — CLR shifts toward bow, any yaw perturbation is self-amplifying.
    if (vFwd < 0) {
      torque += this.omega * Math.abs(vFwd) * this.displacement * 0.18;
    }

    // --- Wind force (world frame) ---
    // Physically correct: F = 0.5 * rho * Cd * A_eff * V_rel^2
    // where V_rel is air velocity relative to hull, A_eff is hull area projected
    // perpendicular to the wind direction. Cd ~ 1.1 (beam), 0.7 (nose-on).
    if (wind && wind.speed > 0.01) {
      // Wind blows FROM wind.angle, so its velocity vector points to (angle + pi)
      const wvx = Math.cos(wind.angle + Math.PI) * wind.speed;
      const wvy = Math.sin(wind.angle + Math.PI) * wind.speed;
      const rvx = wvx - this.vx;
      const rvy = wvy - this.vy;
      const rmag = Math.hypot(rvx, rvy);
      if (rmag > 0.01) {
        // Unit direction of relative wind (world frame)
        const ux = rvx / rmag;
        const uy = rvy / rmag;
        // Project into body frame to know what area is facing
        const uFwd = ux * ch + uy * sh;
        const uLat = -ux * sh + uy * ch;
        // Effective area depends on angle of incidence
        const Aeff = Math.abs(uFwd) * this.windageFront + Math.abs(uLat) * this.windageSide;
        // Cd blends from 0.7 (bow-on) to 1.1 (beam-on)
        const Cd = 0.7 + 0.4 * Math.abs(uLat);
        const Fwind = 0.5 * 1.23 * Cd * Aeff * rmag * rmag;
        // Force along relative wind direction, decomposed into body frame
        fFwd += uFwd * Fwind;
        fLat += uLat * Fwind;
        // Yaw moment: center of effort is above mid-hull, offset toward the rig.
        // Beam-on wind tends to push the bow off the wind.
        torque += uLat * Fwind * this.lm * 0.12;
      }
    }

    // Convert body frame forces to world
    const fx = fFwd * ch - fLat * sh;
    const fy = fFwd * sh + fLat * ch;

    // Integrate
    const invM = 1 / this.displacement;
    const invI = 1 / this.inertia;
    this.vx += fx * invM * dt;
    this.vy += fy * invM * dt;
    this.omega += torque * invI * dt;

    // Cap absurdities
    const maxV = this.maxSpeedKn * KNOT_TO_MS * 1.2;
    const vm = Math.hypot(this.vx, this.vy);
    if (vm > maxV) { this.vx *= maxV/vm; this.vy *= maxV/vm; }
    if (this.omega > 1.6) this.omega = 1.6;
    if (this.omega < -1.6) this.omega = -1.6;

    // Apply motion
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.heading += this.omega * dt;
    if (this.heading > Math.PI) this.heading -= Math.PI * 2;
    if (this.heading < -Math.PI) this.heading += Math.PI * 2;

    if (this.collisionImpulse > 0) this.collisionImpulse *= 0.92;
  }

  // Hard bump: resolves collision by pushing back and damping velocity
  // bounce=true → elastic fender bounce (< 2 kn); bounce=false → hard thud
  collide(normalX, normalY, strength = 1, bounce = false) {
    const vDotN = this.vx * normalX + this.vy * normalY;
    if (vDotN < 0) {
      this.vx -= 1.6 * vDotN * normalX;
      this.vy -= 1.6 * vDotN * normalY;
      const damp = bounce ? 0.62 : 0.4;
      this.vx *= damp;
      this.vy *= damp;
      this.omega *= bounce ? 0.75 : 0.6;
    }
    this.collisionImpulse = Math.max(this.collisionImpulse, strength);
  }
}
