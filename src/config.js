// Default sandbox config + yacht/dock tables

export const DEFAULT_CONFIG = {
  length: 40,         // feet
  rudder: 'single',   // 'single' | 'twin'
  keel:   'fin',      // 'full' | 'fin' | 'bulb' | 'lift'
  thruster: 'yes',    // 'yes' | 'no'
  dock:   'alongside',// 'alongside' | 'stern-med' | 'stern-anchor' | 'bow-to' | 'piles' | 'mooring-ball'
  wind:   5,         // knots (0..30)
  winddir:180,        // degrees (wind FROM direction; 180 = from south)
  gusts:  'yes',       // 'yes' | 'no' — random gusts up to 2× base
  obs:    'normal',   // 'empty' | 'normal' | 'crowded'
  musicvol:     75,       // percent 25/50/75/100
  sfxvol:       100,      // percent 25/50/75/100
  throttlemode: 'smooth',  // 'click' | 'smooth'
};

// Physical profile by length (ft -> params)
// Values are pragmatic for gameplay, not bolted to real specs
export function yachtProfile(lengthFt) {
  const lm = lengthFt * 0.3048;             // length overall (m)
  const beam = lm * 0.32;                   // beam (m)
  // Displacement calibrated to realistic: 40' ~= 9600 kg, 50' ~= 18 750 kg (see research)
  const displacement = Math.pow(lengthFt / 10, 3) * 150;
  // Windage: side area ~ length * 1.8 m, front area ~ length * 0.7 m (rig + cabin)
  const windageFront = lm * 0.7;
  const windageSide  = lm * 1.8;
  return {
    lm, beam, displacement, windageFront, windageSide,
    maxThrustN: 250 * lengthFt,             // ~10 kN at 40ft
    maxReverseN: 160 * lengthFt,            // reverse ~60% of forward
    maxThrusterN: 1400,                     // realistic 40-45' bow thruster (120-160 kgf)
    maxSpeedKn: 7,                          // at full ahead in no wind
    inertia: displacement * lm * lm / 12,   // moment of inertia (rod)
  };
}

// Keel effect on water drag (sideway grip)
export const KEEL_FACTOR = {
  full: { side: 3.5, fwd: 1.2, turn: 0.7 },
  fin:  { side: 2.4, fwd: 1.0, turn: 1.0 },
  bulb: { side: 2.1, fwd: 1.05, turn: 1.05 },
  lift: { side: 1.4, fwd: 0.9, turn: 1.2 },
};

// Rudder config — single screw in both cases, only rudder geometry differs.
// propWashFactor: fraction of propeller slipstream that flows over the rudder blade(s).
//   Single rudder sits directly behind the prop → full slipstream (1.0).
//   Twin rudders sit outboard → slipstream passes between them (~0.05, negligible).
// eff: rudder lift coefficient multiplier when water IS flowing (boat speed > ~1 kn).
//   Twin blades are slightly more efficient at speed (outboard angle, never stalls).
// propWalk: single-screw sideways kick in reverse — identical for both (propeller property).
export const RUDDER_FACTOR = {
  single: { eff: 1.0,  propWashFactor: 1.00, propWalk: 0.025 },
  twin:   { eff: 1.2,  propWashFactor: 0.05, propWalk: 0.025 },
};

// Docking type metadata for world generation + scoring
export const DOCK_META = {
  'alongside':    { label: 'ALONGSIDE',    hint: 'PUT PORT SIDE TO DOCK' },
  'stern-med':    { label: 'STERN · MED',  hint: 'DROP LINES ON PONTOON, STERN IN' },
  'stern-anchor': { label: 'STERN · ANCHOR',hint: 'DROP HOOK, BACK DOWN SLOWLY' },
  'bow-to':       { label: 'BOW TO',       hint: 'GO IN BOW FIRST, LINES ON BOW' },
  'piles':        { label: 'PILES BOX',    hint: 'THREAD BETWEEN PILES, BACK TO DOCK' },
  'mooring-ball': { label: 'MOORING BALL', hint: 'APPROACH BALL INTO THE WIND' },
};
