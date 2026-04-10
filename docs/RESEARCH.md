# YACHT DOCK — Research Report

Compiled during MVP development (2026-04-04). Source of truth for future calibration and feature work. When in doubt about a number or the physics behind a behaviour, check here first.

---

## 1. Existing Simulators (Top 10)

| # | Product | Platform | Model | Key strength | Weakness |
|---|---------|----------|-------|--------------|----------|
| 1 | Dock Your Boat 3D | iOS/Android, 3D | freemium | Yacht-under-engine physics, 30+ scenarios | Not browser-based, cluttered UI |
| 2 | Boat Master | iOS/Android | paid | 6 vessels × 16 levels, gamepad, single/twin screw | Mobile only, expensive, generic 3D |
| 3 | Hafenskipper 2 | Win/Mac/mobile | paid | Realistic ship physics, harbour manoeuvres | Not browser, German focus |
| 4 | Ship Simulator Realistic | Steam | paid | Dynamic waves, 12-point mooring | Heavy build, overkill |
| 5 | Docking Ships | Steam | paid | Puzzle "guide ship on a grid" | Tile-based puzzle, not a simulator |
| 6 | Universal Docking Sim | itch.io (Win) | free | Rudder + throttle, realistic boat model | Windows only |
| 7 | eSail Sailing Simulator | PC/Mac (Steam) | paid | Best-reviewed for instruction | Not browser, focuses on passage sailing |
| 8 | Sailaway III | PC + web companion | paid | Real-time weather, global map | Docking and anchoring absent (!!) |
| 9 | Virtual Sailor NG | Steam | paid | Open world, accurate physics | 2005 graphics, not browser |
| 10 | NauticEd Catamaran Maneuvering | Web (Unity) | free | Free, twin-engine differential | Catamaran only, single scenario |

**Conclusion:** the niche of "browser-based, NES aesthetic, 5-minute scenario, pixel art, yacht focus" is unoccupied. None of the above products fills it.

Professional simulators (Transas NTPro, Kongsberg K-Sim, Wärtsilä NTPRO) cost $300K–$2M and use full-motion bridges. They are not competition but are useful as references for wind modelling and hydrodynamics.

---

## 2. Physical Model

### Wind Force

```
F = 0.5 · ρ_air · Cd · A · V²
```

- `ρ_air = 1.23 kg/m³`
- `Cd = 1.1–1.2` (beam-on), `0.7` (head-on / stern-on)
- `A` = windage area (40 ft yacht: ~20–30 m² side, 6–10 m² bow)

**Example:** 15 kn (7.7 m/s) beam-on on a 40 ft yacht:  
`F = 0.5 · 1.23 · 1.1 · 25 · 59.3 ≈ 1 000 N ≈ 100 kgf`

This is the real reason a beam wind "pushes you onto the neighbouring boat."

### Current Force

```
F = 0.5 · ρ_water · Cd · A_wet · V²
```

- `ρ_water = 1 025 kg/m³`
- `A_wet` = underwater lateral area (≈ 6 m² for 40 ft)
- 1 kn (0.51 m/s) beam-on → `F ≈ 880 N`

Current is not implemented in v1.0 (see backlog).

### Prop Walk — Single Screw

When going astern, the stern moves in the direction opposite to propeller rotation. For a right-hand propeller, the stern goes to port.

- Effect is strongest at low RPM, disappears at high RPM.
- Vector: `F_propwalk = k · RPM · sign(reverse) · perp`, `k ≈ 0.05–0.15` of forward thrust
- Pivot point approximately 1/3 of LOA from the bow.

In-game value: `propWalk = 0.025` (conservative, matches real ~12 % effect with some exaggeration for teaching value).

### Twin Rudder / Twin Engine

- Differential thrust creates a moment: `M = (F_left − F_right) · beam / 2`
- A catamaran (7 m beam, 50 ft) can spin in place without a thruster
- **Single-screw boat in reverse: rudder barely works** — the prop jet bypasses the blade

### Keel Types — Effect on Handling

| Type | Turning circle | Wind drift | Notes |
|------|---------------|------------|-------|
| Full keel | 3–5× LOA | Minimal | Slow to turn, nearly impossible to turn in reverse |
| Fin keel | 1.5–2× LOA | Moderate | Twitchy in reverse, fast turns |
| Bulb/Wing | 1.5–2× LOA | Moderate | More stable than plain fin |
| Lifting/Swing | 1.5–2× LOA | High | Poor tracking when raised |

### Bow Thruster

- **120–160 kgf** (1.2–1.6 kN) for 40–45 ft yachts
- 24 V, 5–10 kW peak draw
- **Duty cycle is critical:** Vetus BOW160 = 4.5 min continuous / 4.5 min per hour; Side-Power SE40 = 2–3 min
- In reality an overheat timer protects the motor. Not implemented in v1.0 (see backlog).

### Leeway (Lateral Drift Under Wind)

- Racing cruiser: 3–5°
- Average cruiser: 7°
- Fin keel 40 ft at 20 kn: up to 15°
- Formula: `leeway_deg ≈ 0.6 % · V_wind_kn + hull_factor`
- At marina speeds leeway is replaced by direct lateral drift of the hull.

### Turning Circle — 40 ft

- At idle throttle: 3–4 × LOA (36–48 m)
- At 4 kn: ~8 × LOA

---

## 3. Docking Types

### Alongside (Parallel to Pontoon)

Approach at 20–30° to the dock, go to neutral one hull-length away, short reverse when half a hull away — the stern comes parallel. **Common mistakes:** too fast, not accounting for an on-dock or off-dock wind. **Risk:** bow striking the dock at an angle.

### Med Stern-to with Anchor

Classic Mediterranean / Adriatic mooring. Four hull-lengths from the dock, drop the anchor, pay out chain at 4:1 scope (depth × 4), reverse to the dock. Windward line first, leeward second. **Mistakes:** chain too short, anchor laid across neighbours' chains. **Risk:** picking up a neighbour's chain.

### Med Stern-to with Lazy Line

Reverse to the wall. The dock hand passes up a lazy line from under the pontoon — take it at the stern, lead it to the bow, secure. **Main disaster:** letting the lazy line enter the propeller.

### Box Berth / Piles (Swedish / Finnish Style)

Enter at 1–2 kn, align midship with the pile, drop a bowline loop (windward pile first). Second pile gets a lasso. Then bow and stern lines to the dock. **Mistake:** jumping on deck to reach a pile; lines must go from amidships. **Risk:** ribs against the pile, ending up beam-on.

### Bow-to with Mooring Line

Mirror image of Med stern-to. For boats without a clean stern or when cockpit privacy is preferred. **Risk:** windlass fouling on the mooring line.

### Additional Types (Second Wave)

- Raft-up (alongside another moored boat)
- Mooring ball (approach head-to-wind)
- Open anchorage (reverse to kill way, scope 5:1 in wind)

---

## 4. Visual Reference — NES Aesthetic

### Primary Reference

**Cobra Triangle** (Rare / Nintendo, 1989, NES) — speedboat top-down, 25 levels, dithered water, 16×16 sprites. Main reference for water rendering and the boat sprite.

### Additional NES References

- The Little Mermaid (Capcom, 1991) — underwater palette, bubble effects
- 1942 / 1943 (Capcom) — marine top-down combat
- Skull & Crossbones (Tengen), P.O.W., SWIV — top-down naval action

### NES Technical Constants

- 54 colours in the PPU master palette; simultaneous on-screen: 13 for sprites + 13 for backgrounds
- Sprites: 8×8 or 8×16 px, maximum 64 on screen
- 4 palettes of 4 colours for sprites
- **No anti-aliasing** — dithering via checkerboard pattern

### NES-style Water Palette

| Role | Colour |
|------|--------|
| Deep (horizon) | `#0000A8` |
| Mid water | `#0078F8` |
| Highlight | `#58A8F8` |
| Foam | `#FCFCFC` |
| Sand / dock | `#B84800`, `#F8B800`, `#FCE0A8` |
| Hull white | `#FCFCFC` |
| Hull red stripe | `#F83800` |
| Hull shadow | `#787878` |

---

## 5. 8-bit Audio in the Browser

### ZzFX

1 KB, single JS file, 20 parameters per sound, generates SFX at runtime. [github.com/KilledByAPixel/ZzFX](https://github.com/KilledByAPixel/ZzFX). Perfect for beeps, bump sounds, seagull cry.

### jsfxr

[sfxr.me](https://sfxr.me) — online preset editor (pickupCoin, explosion, hitHurt, etc.), exports to JSON. Useful for hand-tuned sounds.

### Tone.js

Overkill for NES aesthetics (52 KB minified), but provides `PulseOscillator` (NES square) and full ADSR. Worth it only for complex melodic work.

### Pure Web Audio API — Our Approach

2 square oscillators (12.5 / 25 / 50 % pulse) + 1 triangle (bass) + 1 noise channel = matches NES APU (5 channels). 5 tracks, each 32 eighth-notes (4 bars of 4/4), looped. Music plays via VHF channel metaphor: SEL button cycles through CH 16 (shanty) → CH 01 (funk) → CH 05 (jazz) → CH 08 (rock) → CH 72 (electronic).

Annoyance = < 16 notes per phrase, pattern repeats every 8 seconds.

### SFX in the Game

| Sound | Implementation |
|-------|----------------|
| Diesel engine | Sawtooth OSC + lowpass, frequency scales with throttle |
| Bow thruster | Square + triangle OSC pair + bandpass, near-instant response |
| Gear click | Short descending square + noise burst |
| Collision bump | Noise burst + descending square sweep |
| Seagull cry | Three sequential square sweeps 1800 → 700 Hz |
| Moored chime | C major arpeggio (MIDI 72, 76, 79, 84) |
| Pff (no thruster) | Lowpass noise burst, 0.25 s |
| Wind ambient | Bandpass-filtered looped white noise, volume scales with gust multiplier |

---

## 6. Docking Fail Culture — Vibe Inspiration

**YouTube genre "Boats Docking Fails"** — millions of views. Common patterns: line released too early, crew jumps short of the dock, bow-on into a neighbour's hull, bowsprit into a cockpit.

Recommended channels for vibe and learning:

- **Sailing La Vagabonde** — Riley and Elayna, harbour swap episodes, the famous lazy line into the prop
- **Sailing Uma (Dan & Kika)** — budget repairs, trying to dock without an engine
- **Sailing Doodles** — regular docking fails in 25 kn of wind

### Ideas for Future Versions

- Angry German neighbour in a pink cockpit yelling "ACHTUNG!" when you get too close
- British skipper raising a beer if you park cleanly
- Marina radio chatter in the background, 3–4 random samples
- Dog on the dock barking at sudden engine bursts
- Dirt on screen when colliding, washed off by the next wave after a few seconds

---

## Key Sources

- passagemaker.com/technical/how-to-use-prop-walk/
- sailmagazine.com/cruising/walking-the-prop/
- sailingbritican.com/stern-to-med-mooring/
- yachtingmonthly.com/sailing-skills/expert-guide-box-berthing-62853
- sail-in-finland.info/2015/04/guide-to-tying-up-to-docks-piers-and-jetties/
- shiphandlingpro.com/calculating-wind-force
- thenavalarch.com/the-four-important-factors-for-windage-area-calculations/
- l-36.com/leeway.php
- improvesailing.com/guides/sailboat-keel-types
- boatsgeek.com/fin-keel-vs-full-keel-pros-and-cons/
- yachtaidmarine.com/which-bow-thruster-kit-is-best-for-a-40-45-ft-yacht/
- boatsgeek.com/how-to-drive-and-dock-a-catamaran/
- nesdev.org/wiki/PPU_palettes
- bitbeamcannon.com/nes-graphical-specs/
- en.wikipedia.org/wiki/Cobra_Triangle
- sfxr.me/ — 8-bit SFX generator
- tonejs.github.io — Tone.js
- en.wikipedia.org/wiki/Beaufort_scale
- esailyachtsimulator.com
- hafenskipper2.com
- dock-your-boat.sfinx-it.com
- apps.apple.com/us/app/boat-master/id1349495816
- grimfoxgames.itch.io/universal-docking-simulator
- sailaway.world/home
- store.steampowered.com/app/1544890/Ship_Simulator_Realistic/
