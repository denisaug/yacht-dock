# YACHT DOCK — Physics Model

Units: **metres · seconds · kilograms · newtons**.  
World frame: X right, Y down. `heading` in radians, 0 = east (+X).  
Body frame: forward = +X (bow direction), lateral = +Y (port side).

All physics runs at a **fixed timestep of 1/60 s**, decoupled from render FPS.

---

## Coordinate System

```
World X ──────────────► right
World Y
│
│
▼ down

heading = 0   → boat faces right (east)
heading = π/2 → boat faces down (south, towards screen bottom)
```

The marina is an 80 × 120 m water area. The dock runs along the top edge (small Y values); the player spawns near the bottom (large Y).

---

## Yacht Profiles (`src/config.js → yachtProfile()`)

Physical parameters scale with `lengthFt` (boat length in feet).

| Parameter | Formula | Example — 40 ft |
|-----------|---------|-----------------|
| Length overall `lm` | `lengthFt × 0.3048` | 12.19 m |
| Beam `beam` | `lm × 0.32` | 3.90 m |
| Displacement `m` | `(lengthFt/10)³ × 150` | 9 600 kg |
| Max thrust | `250 × lengthFt` N | 10 000 N |
| Max reverse | `160 × lengthFt` N | 6 400 N |
| Max bow thruster | 1 400 N (constant) | 1 400 N |
| Max speed | 7 kn (cap) | — |
| Moment of inertia `I` | `m × lm² / 12` | 1 190 000 kg·m² |
| Windage front | `lm × 0.7` m² | 8.5 m² |
| Windage side | `lm × 1.8` m² | 21.9 m² |

**Displacement calibration:** `(40/10)³ × 150 = 64 × 150 = 9 600 kg`.  
Real Bavaria 40 displacement ≈ 9 500 kg. Match is within 1 %.

---

## Control Lag (`src/boat.js → step()`)

Raw control inputs are smoothed toward target values using a first-order lag filter:

```
smoothed += (target − smoothed) × min(1, rate × dt)
```

| Control | Rate (1/s) | Time constant ≈ | Feel |
|---------|-----------|-----------------|------|
| Throttle `sThrottle` | 2.0 | 0.50 s | Engine response lag |
| Rudder `sRudder` | 5.0 | 0.20 s | Helm follows quickly |
| Bow thruster `sThruster` | 4.0 | 0.25 s | Near-instant electric response |

---

## Engine & Throttle

Single fixed-pitch propeller. Throttle range −1 (full astern) … +1 (full ahead).

```
Forward:  fFwd += sThrottle × maxThrustN
Astern:   fFwd += sThrottle × maxReverseN   (sThrottle negative)
```

Reverse thrust is ~64 % of forward (`maxReverseN = 160 × lengthFt` vs `250 × lengthFt`).

---

## Prop Walk — Single Screw Effect

When reversing, a right-hand propeller kicks the **stern to port → bow to starboard** (positive torque in our convention). This is one of the most important single-screw handling characteristics.

```
walk   = |sThrottle| × propWalk × maxReverseN
torque = +walk × lm × 0.30
```

`propWalk = 0.025` for all configurations (the propeller is the same on both rudder types).

**At full reverse on a 40 ft boat:**
- walk force ≈ 160 N
- torque ≈ 583 N·m → ~2.7 °/s equilibrium yaw rate
- Countered by ~60 % rudder at 1.5+ kn sternway

Note: earlier versions used `propWalk = 0.15` which produced a physically unrealistic 7 °/s yaw — impossible to correct in practice. The current value of 0.025 matches real performance.

---

## Rudder

### Key Concept: Flow Over the Blade

The rudder generates lateral force proportional to **water flow past the blade** squared. Flow has two sources:
1. **Boat forward speed** (`vFwd`) — always present when moving
2. **Prop wash** — slipstream from the propeller, only when `sThrottle > 0`

```
propWash    = sThrottle × 1.8 × propWashFactor   (only when sThrottle > 0)
flow        = vFwd + propWash
rudderForce = −sRudder × flow × |flow| × 280 × rudderEff × keel.turn × revDebuff
torque      = −rudderForce × lm × 0.45            (force applied at stern)
```

The `flow × |flow|` term keeps the correct sign while preserving the quadratic speed relationship.

### Single Rudder

The blade sits **directly behind the propeller** in its slipstream.  
`propWashFactor = 1.0` — full slipstream reaches the blade.

Even at zero boat speed, running the engine forward creates flow:

| Throttle detent | `sThrottle` | Prop wash (m/s) | Rudder authority |
|-----------------|-------------|-----------------|------------------|
| SLOW AHD | 0.05 | ~0.09 | Small but present |
| HALF AHD | 0.50 | ~0.90 | Meaningful |
| FULL AHD | 1.00 | ~1.80 | Strong |

**Implication:** a single-rudder boat can turn its bow without any forward motion — key for tight dock manoeuvres.

### Twin Rudder

Two blades positioned **outboard**. With a single centreline propeller the slipstream passes between the rudders — neither blade receives direct prop wash.

`propWashFactor = 0.05` — 5 % bleed, negligible in practice.

At docking speeds (< 1.5 kn) the helm has almost no authority regardless of throttle. The boat **must be moving** before the rudder works.

At speed > 4 kn the outboard blades are slightly more efficient:  
`rudderEff = 1.2` (vs 1.0 for single rudder)

This advantage disappears at docking speed but improves offshore handling slightly.

### Steering in Reverse

#### Reduced Effectiveness (`revDebuff`)

Going astern, water hits the rudder blade from the pressure side, reducing lift. Under reverse engine power the propeller jet is directed toward the bow — partially starving the rudder.

```
revDebuff = clamp(0.55 + sThrottle × 0.15,  0.40,  0.55)   when vFwd < 0
revDebuff = 1.0                                               when vFwd ≥ 0
```

| Condition | revDebuff | Effective authority |
|-----------|-----------|---------------------|
| Coasting astern | 0.55 | 55 % of forward |
| Half reverse throttle | 0.475 | Prop jet reduces flow further |
| Full reverse throttle | 0.40 | Minimum — 40 % of forward |

Prop wash is **zero** in reverse (jet goes toward bow, away from rudder).

#### Reversed Steering Sense

With `vFwd < 0`, `flow` is negative. The formula automatically produces the opposite force sign:

**Right wheel going astern → bow swings to PORT** ✓

This matches real single-screw yacht seamanship and is correct.

#### Directional Instability Astern

Going astern, the hull behaves like an arrow flying tail-first: the Centre of Lateral Resistance (CLR) shifts toward the bow; any yaw perturbation is **self-amplifying** rather than self-correcting.

```
instability_torque = omega × |vFwd| × displacement × 0.18   (only when vFwd < 0)
```

| Speed astern | omega | Instability torque | Full-lock rudder torque | Result |
|-------------|-------|--------------------|------------------------|--------|
| 2 kn | 0.10 r/s | 179 N·m | 894 N·m | Correctable |
| 4 kn | 0.30 r/s | 1 069 N·m | 3 572 N·m | Needs active helm |
| 4 kn | 0.60 r/s | 2 137 N·m | 3 572 N·m | Hard work |

At typical docking speeds (≤ 2 kn astern) the instability is **noticeable but manageable**. At high astern speed, continuous rudder corrections are required.

### Single vs Twin Summary

| Situation | Single rudder | Twin rudder |
|-----------|---------------|-------------|
| 0 kn + engine ahead | Good (prop wash) | Near zero |
| 1 kn forward | Good | Weak |
| 3 kn forward | Good | Moderate |
| 5+ kn forward | Good | Slightly better (×1.2 eff) |
| Coasting astern 2 kn | Moderate (55 %) | Moderate (55 %) |
| Full reverse 2 kn | Reduced (40 %) | Reduced (40 %) |
| Steering sense astern | Right → bow port | Right → bow port |
| Prop walk in reverse | Yes (bow stbd) | Yes — same propeller |
| Docking without thruster | Manageable | Very difficult |

Real-world note: twin-rudder yachts commonly fit bow thrusters specifically to compensate for the loss of low-speed helm authority.

---

## Keel

The keel type modifies drag and rudder torque multiplier via three factors:

```js
dragFwd = −vFwd × |vFwd| × 770 × keel.fwd
dragLat = −vLat × |vLat| × 1500 × keel.side
torque  = rudderForce × lm × 0.45 × keel.turn   (turn factor applied inside rudder calc)
```

| Keel | `fwd` drag mult | `side` drag mult | `turn` mult | Character |
|------|-----------------|------------------|-------------|-----------|
| `full` | ×1.2 | ×3.5 | ×0.7 | Slow turns, excellent lateral grip |
| `fin` | ×1.0 | ×2.4 | ×1.0 | Balanced baseline |
| `bulb` | ×1.05 | ×2.1 | ×1.05 | Slightly looser laterally |
| `lift` | ×0.9 | ×1.4 | ×1.2 | Nimble, drifts easily |

**Forward drag calibration:** at full throttle (40 ft, fin keel):  
`maxThrustN / (770 × 1.0) = 10 000 / 770 ≈ 13 → terminal speed √13 ≈ 3.6 m/s ≈ 7 kn` ✓

**Lateral drag:** ~2× stronger than forward — the keel grips crossways far better than fore-and-aft.

---

## Bow Thruster

```
thEff  = max(0, 1 − |vFwd| / 2.0)   // drops off above ~4 kn forward speed
fLat   = sThruster × maxThrusterN × thEff × 0.4
torque = sThruster × maxThrusterN × thEff × lm × 0.48
```

`maxThrusterN = 1 400 N` (~140 kgf, realistic range for a 40–45 ft installation).

The force splits 40 % lateral force + 60 % yaw torque (torque arm = 48 % of LOA from CoM toward bow). In practice the yaw effect dominates at close range; lateral translation is a secondary effect.

**Speed cut-off:** at 4 kn (`|vFwd| = 2.06 m/s`), `thEff ≈ 0` — the thruster produces no useful force above hull speed. This matches real bow thruster duty: useless at sea, essential in the marina.

**Duty cycle:** real thrusters (Vetus BOW160, Side-Power SE40) overheat after 4–5 min continuous use. Not simulated in the current version (see backlog).

---

## Anchor Chain (`src/main.js → dropAnchor() + game loop`)

The anchor is a **spring-restrained point** at the bow:

```
ext = max(0, dist − chainLen)          // chain extension beyond rest length
F   = 4 500 × ext                      // spring force (N), stiffness = 4 500 N/m
```

Force and resulting torque are applied to the bow:

```
ax = F × nx / displacement             // linear acceleration
ay = F × ny / displacement
torque = (bowArmX × F×ny) − (bowArmY × F×nx)
omega += torque / inertia × dt
```

The chain also renders as a quadratic Bézier curve whose control point sags proportionally to slack (`chainLen − dist`), giving a realistic catenary appearance.

---

## Wind Force

Physically correct aerodynamic drag formula:

```
F_wind = 0.5 × ρ_air × Cd × A_eff × V_rel²
```

Where:
- `ρ_air = 1.23 kg/m³`
- `Cd` blends from `0.7` (bow-on) to `1.1` (beam-on): `Cd = 0.7 + 0.4 × |uLat|`
- `A_eff = |uFwd| × windageFront + |uLat| × windageSide`  
  (effective projected area based on angle of incidence)
- `V_rel` = wind velocity relative to hull (true wind minus boat velocity)

**Example — 15 kn (7.7 m/s) beam-on on a 40 ft yacht:**

```
A_eff  = windageSide = 21.9 m²
Cd     = 1.1
F_wind = 0.5 × 1.23 × 1.1 × 21.9 × 7.7² ≈ 870 N ≈ 89 kgf
```

This is why a beam wind at Beaufort 4 drifts the boat toward neighbouring vessels in a crowded marina.

**Yaw moment:** beam wind applies a torque at `lm × 0.12` from CoM, tending to push the bow downwind (weather helm effect).

### Gust System (`src/main.js → updateGusts()`)

When gusts are enabled, wind speed multiplies by `gustMult` which transitions between calm (1.0×) and gust (1.25–2.0×) states using exponential approach:

```
tau  = diff > 0 ? 2.0 : 5.0    // rise 2 s, fall 5 s (slow build, lingering fade)
gustMult += diff × (1 − exp(−dt / tau))
```

Gust durations: 6–14 s active, 8–20 s calm between gusts.

---

## Water Drag

Both forward and lateral drag use the quadratic (turbulent) drag law:

```
dragFwd = −vFwd × |vFwd| × 770 × keel.fwd
dragLat = −vLat × |vLat| × 1500 × keel.side
```

The quadratic form (`v × |v|`) preserves sign while scaling drag with speed squared — correct for turbulent hull resistance at yacht speeds.

**Angular drag:**

```
angularDrag = −omega × |omega| × I × 2.2
```

---

## Collision Response (`src/boat.js → collide()`)

| Impact speed | Regime | Behaviour |
|---|---|---|
| < 0.3 m/s | Glancing | Ignored (no bump sound, no count) |
| 0.3 – 1.03 m/s | Fender bounce | Elastic reflection, velocity damped to 62 % |
| ≥ 1.03 m/s (≈ 2 kn) | Crash | Hard stop, GAME OVER |

2 kn is the widely accepted safe berthing speed in real marinas.

Collision response:

```
// Only applied if boat is moving INTO the surface (vDotN < 0)
vx −= 1.6 × vDotN × nx
vy −= 1.6 × vDotN × ny
damp = bounce ? 0.62 : 0.40     // fender vs hard surface
vx  *= damp;  vy *= damp
omega *= bounce ? 0.75 : 0.60
```

---

## Docking Detection (`src/world.js → checkDocked()`)

The boat is considered docked when **all three** conditions hold simultaneously for 1.2 s:

```
pos  < t.tolerance.pos + lm × 0.20     // ~80% hull overlap with berth zone
|angDiff| < t.tolerance.angle × 1.8 + 0.17   // ≈ base tolerance + ~10°
speedMs  < 0.52 m/s                     // ≈ 1 kn maximum approach speed
```

The generous position and angle tolerances (80 % hull overlap rather than pixel-perfect) keep the game playable while still requiring deliberate, controlled positioning.

---

## Velocity Cap

To prevent physics blow-ups, velocity and angular rate are hard-capped each tick:

```
maxV  = maxSpeedKn × 0.5144 × 1.2     // 20% over rated speed
omega = clamp(omega, −1.6, 1.6) rad/s  // ~92°/s max rotation
```
