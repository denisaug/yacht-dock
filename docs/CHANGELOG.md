# YACHT DOCK — Changelog

All changes by version. Newest entries at the top.

---

## v1.1.0 — 2026-04-10 — Code clean-up & docs overhaul

**Code:**
- All Russian-language comments in `src/` translated to English
- Game content (character phrases, UI text) intentionally preserved in Russian

**Docs:**
- `docs/PHYSICS.md` — full rewrite: all formulas, calibration tables, worked examples
- `docs/HANDOFF.md` — full rewrite in English: data flow diagram, keyboard table, danger zone
- `docs/SPEC.md` — translated to English
- `docs/RESEARCH.md` — translated to English; audio SFX table added

---

## v1.0.0 — 2026-04-05 — Handoff ready

- `docs/`: HANDOFF, PHYSICS, RESEARCH, SPEC, CHANGELOG added
- `assets/screen-*.png` — boot, config, game screenshots
- README expanded with architecture overview and doc links

---

## v0.1.1 — 2026-04-04 — Physics calibration

Corrections based on research report (`docs/RESEARCH.md`):

- **Displacement formula:** `lengthFt² · ⁷ · 2.5` → `(lengthFt/10)³ · 150`
  - Was: 40 ft = ~55 t (5× too heavy)
  - Now: 40 ft = 9 600 kg ✓
- **Prop walk coefficient:** `0.22` → `0.015` (real ~12 %, with pedagogical exaggeration)
- **Bow thruster max force:** `900 N` → `1 400 N` (real 40–45 ft range: 120–160 kgf)
- **Wind force:** rewritten to use correct formula `F = 0.5 · ρ · Cd · A_eff · V²`, projected into body frame; Cd blends 0.7 (bow-on) → 1.1 (beam-on)
- **Forward drag coef:** `110` → `770` (terminal speed 7 kn at full throttle)
- **Lateral drag coef:** `520` → `1 500` (keel lateral grip ≈ 2× forward)
- **Rudder coef:** `160` → `220` (~5–8 °/s turn rate at 4 kn)
- **Reverse thrust:** `150 · L` → `160 · L` (60 % of forward)
- **Front windage:** `lm · 1.2` → `lm · 0.7` (realistic bow projection)

---

## v0.1.0 — 2026-04-04 — MVP

First working version, built in one session in Claude Code.

**Gameplay:**
- 6 dock types: alongside, stern-med, stern-anchor, bow-to, piles, mooring-ball
- Yacht selection: 30–55 ft, single/twin rudder, 4 keel shapes, bow thruster on/off
- Wind: Beaufort 0–6 × 4 directions, optional gusts up to 2×
- Obstacle density: empty / normal / crowded
- Sandbox mode — no progression system

**Physics (first version, calibrated in v0.1.1):**
- Semi-realistic: wind, inertia, prop walk, leeway, bow thruster, keel type
- Fixed timestep integration at 1/60 s
- Collision detection: AABB vs dock; OBB vs boats; circle vs piles

**Visuals:**
- Canvas 2D, procedural pixel art — no PNG sprites for game objects
- NES palette (navy, cyan, yellow, red, lime, bone, wood)
- 60 FPS on most devices
- Stepped auto-zoom (4 levels) + camera tracking both boat and target berth

**Audio:**
- Web Audio API 8-bit OST: 5 tracks on VHF channels, 2 square + triangle + noise
- SFX: engine, bow thruster, gear click, bump, seagull, moored chime, pff, wind ambient
- Loop: 4 bars, E minor base key

**Vibe features:**
- Seagull flies across screen every ~15 s with a Russian comic-strip callout (25 phrases)
- Tapping empty space leaves a dripping poop mark
- Boot / config / game scenes with NES-style transitions
- Dock character: Captain Walker or Tim Walker — randomly chosen each session

**Controls:**
- Mobile: PORT / STBD / throttle ahead / throttle astern + BOW << >> (NES style)
- Desktop: WASD / arrows + Q/E thruster + M mute + Space anchor
- Two throttle modes: click (three detents) and smooth (fully analogue)

**Infrastructure:**
- Pure ES modules, ~2 300 lines of JavaScript across 9 modules
- esbuild bundle (`bundle.js`) for deploy without a local server
- GitHub Pages deploy: timzinin.com/yacht-sim/
- SVG favicon with nautical flag
- Repo: TimmyZinin/yacht-sim (public)
