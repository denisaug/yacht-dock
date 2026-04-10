# YACHT DOCK — Handoff Guide

Read this document and you will understand the project in 10 minutes.

## What Is It

A browser-based 8-bit yacht docking simulator. Single HTML page, pure ES modules, no framework.  
Fork and deploy immediately — no build step required.

- **Live:** https://govorunov.pro/yacht-dock/
- **Repo:** https://github.com/denisaug/yacht-dock
- **Stack:** vanilla JavaScript ES modules, Canvas 2D, Web Audio API, GitHub Pages

## Local Development

```bash
git clone https://github.com/denisaug/yacht-dock.git
cd yacht-dock
python3 -m http.server 8765
# open http://127.0.0.1:8765/
```

No `npm install`, no bundler. The absence of a build step is intentional.

### Dev Shortcuts

| URL hash | Effect |
|----------|--------|
| `#config` | Skip boot screen → go straight to config |
| `#game` | Skip boot + config → start game with defaults |

### Keyboard Controls

| Key | Action |
|-----|--------|
| `W` / `↑` | Throttle ahead |
| `S` / `↓` | Throttle astern |
| `A` / `←` | Rudder to port |
| `D` / `→` | Rudder to starboard |
| `Q` | Bow thruster to port |
| `E` | Bow thruster to starboard |
| `Space` | Drop anchor (stern-anchor mode only) |
| `M` | Toggle mute |

---

## Architecture

```
yacht-dock/
├── index.html           # HTML skeleton — boot / config / game screens + HUD
├── style.css            # NES palette, adaptive layout, confetti, toast
├── src/
│   ├── main.js          # State machine (boot → config → game), fixed-timestep game loop
│   ├── boat.js          # Boat class: physics forces, integrator, collision response
│   ├── world.js         # buildWorld() for each dock type, OBB collision detection
│   ├── render.js        # Canvas 2D renderer: water, dock, boats, anchor, HUD
│   ├── input.js         # Touch buttons + keyboard: click-mode and smooth-mode throttle
│   ├── audio.js         # 5-track 8-bit OST (VHF channels) + SFX engine
│   ├── seagull.js       # Seagull flyby every ~15 s + poop overlay
│   ├── captain.js       # CaptainWalker — dock character with nautical phrases
│   ├── tim.js           # TimWalker — dock character with AI/startup phrases
│   ├── config.js        # DEFAULT_CONFIG, yachtProfile(), KEEL_FACTOR, RUDDER_FACTOR, DOCK_META
│   └── palette.js       # NES colour constants + Beaufort wind colour ramp
├── assets/              # Hero image + screenshots
└── docs/
    ├── HANDOFF.md       # ← this file
    ├── PHYSICS.md       # Physics model, formulas, calibration constants
    ├── RESEARCH.md      # Research report: simulators, physics sources, NES references
    ├── SPEC.md          # Original MVP spec locked in via HITL (2026-04-04)
    └── CHANGELOG.md     # Version history
```

### Data Flow — Single Game Tick

```
requestAnimationFrame
  → CaptainWalker/TimWalker.update(dt)     # dock character position + speech
  → Input.update(dt)                        # rudder / throttle / thruster targets
  → Boat.setControls({...})                 # copy targets to boat
  → updateGusts(dt)                         # gust multiplier update
  → [fixed-step loop at 1/60 s]:
      → Boat.step(fixedDt, wind)            # integrate forces, update x/y/heading
      → checkCollisions(boat, world)        # OBB vs boats; circle vs piles; AABB vs dock
      → checkAnchorChain(boat, anchor)      # spring force on bow (stern-anchor mode)
  → checkDocked(boat, world)                # position + angle + speed tolerance
  → Renderer.draw(world, boat, wind, dt)    # water → dock → obstacles → boat → HUD
  → audio.engine() / audio.thruster()       # live SFX levels
```

Physics uses a **fixed timestep (1/60 s)** decoupled from render. The accumulator pattern in `loop()` ensures consistent simulation regardless of frame rate.

---

## How to Add a New Dock Type

1. Add a button in `index.html` inside `data-group="dock"`:
   ```html
   <button class="opt-btn" data-value="raft-up">RAFT UP</button>
   ```

2. Add an entry to `DOCK_META` in `src/config.js`:
   ```js
   'raft-up': { label: 'RAFT UP', hint: 'COME ALONGSIDE ANOTHER BOAT' },
   ```

3. Add a `case` in `buildWorld(cfg)` in `src/world.js`:
   - Set `w.target` (position, angle, tolerance)
   - Set `w.spawn` (starting position and heading)
   - Populate `w.obstacles` as needed

4. Test manually. If the dock type has a target wall, add it to `w.walls`.

---

## How to Add a New Yacht / Keel Type

Edit the tables in `src/config.js`:
- `KEEL_FACTOR` — `{side, fwd, turn}` drag multipliers
- `RUDDER_FACTOR` — `{eff, propWashFactor, propWalk}`
- `yachtProfile()` — `maxThrustN`, `maxReverseN`, `maxSpeedKn`, etc.

Physical constants are calibrated against real numbers; see `docs/PHYSICS.md` before changing.

---

## How to Change Physics

All physics is in `src/boat.js`, method `Boat.step()`. Forces are computed in the body frame (forward/lateral) and converted to world frame at the end. See `docs/PHYSICS.md` for all formulas and calibration targets.

**Key invariants to preserve:**
- 40 ft fin-keel yacht at full throttle → terminal speed ≈ 7 kn
- Prop walk at full reverse (40 ft) → ~2.7 °/s yaw rate
- Bow thruster cut-off at ~4 kn forward speed
- Crash threshold: ≥ 1.03 m/s (2 kn) impact speed

---

## How to Change the Visual

`src/render.js` draws everything procedurally via Canvas 2D. No PNG sprites for game objects — all pixel art is code. Colour palette is in `src/palette.js`.

The renderer has four zoom levels (0.55× → 1.0× → 1.9× → 3.4×) that activate based on distance to the docking target. Camera always keeps both the boat and the berth on screen.

---

## How to Change the Music

`src/audio.js` — class `ChipAudio`, method `_playTrack(n)`.

Five tracks are defined in the `TRACKS` array; each is an object with:
- `lead[]` / `bass[]` — 32 MIDI note numbers (0 = rest)
- `bpm`, `oscType`, `bassOscType`, `leadGain`, `bassGain`, `noteMult`
- Optional flags: `swing`, `hihat`, `kick`, `chirp`

Tracks are mapped to VHF marine channel numbers in the `CHANNELS` array. Players cycle channels with the SEL button (or by changing `_chIdx` directly).

---

## Deploy

```bash
git push origin main
# GitHub Pages rebuilds automatically in ~1–2 minutes
```

Custom domain configured via CNAME at `govorunov.pro`. When forking to your own account the URL becomes `{username}.github.io/yacht-dock/` unless you configure a custom domain.

---

## Danger Zone — What Not to Do

- **Do not switch to a bundler** (webpack, vite, esbuild) without a very good reason. Deployment is trivially simple as-is.
- **Do not add npm dependencies.** Everything runs on browser APIs. Every dependency risks breaking the zero-install pipeline.
- **Do not change ES modules to CommonJS.** GitHub Pages serves `.js` files with `application/javascript` MIME type; the browser loads them natively.
- **Do not commit `/tmp/*`.** Temporary files (screenshots, test scripts) belong in `.gitignore`.
- **Physical constants in `src/boat.js`** are calibrated against `displacement` from `config.js`. If you change one, recalculate the others (terminal velocity, turning rate).

---

## Backlog — v0.2 Ideas

- Bow thruster overheat timer (real duty cycle: ~4.5 min continuous / 4.5 min per hour)
- Scoring with stars: position ±50 cm, angle ±5°, contact speed < 0.3 m/s, elapsed time
- Marina current (0–2 kn)
- On-screen mute toggle (currently keyboard `M` only)
- Coach hints ("short burst astern now", "wind pushing you onto the neighbour")
- Catamaran with twin-engine differential thrust
- Night mode with marina lights
- Approaching-collision warning sound
- Mooring line simulation (spring lines, stern lines)

---

## Contacts

- Created by: Denis Govorunov
- Vibe & coffe support: Tim Zinin ([@timzinin](https://t.me/timzinin))
- Built double-shot in Claude Code, 2026-04-04
