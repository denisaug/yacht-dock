# YACHT DOCK — Initial Spec (HITL Decisions, 2026-04-04)

Four design forks were locked in via a test interview at the start of the project. This document is the source of truth for the MVP.

## Decision Table

| # | Decision | Choice | Rejected alternatives |
|---|----------|--------|-----------------------|
| 1 | Deployment target |  (GitHub Pages) | Subdomain, separate domain |
| 2 | Physics model | Semi-realistic | Arcade, hardcore sim, dual-mode |
| 3 | Mobile controls | PORT / STBD / throttle / reverse + BOW thruster buttons (NES style) | Two sliders, joystick, tap-to-course |
| 4 | Progression | Sandbox only (free play) | Campaign, daily challenge, three modes |

## Rationale

**Semi-realistic physics:** the educational value requires feeling the difference between keel types, single vs twin rudder, and prop walk in reverse. Arcade mode would lose that. A hardcore simulator would take weeks to implement.

**NES-style buttons:** fits the Contra/Nintendo aesthetic perfectly; more tactile than two thin sliders on a phone screen; allows separate muscle-memory training for rudder and throttle. Trade-off: slightly coarser than analogue input, compensated by realistic control inertia.

**Sandbox only:** sandbox lets the player instantly set any scenario (wind, boat, dock type). A star-rated campaign is a solid engagement mechanic but requires level design and balance tuning — that is +40 % work for uncertain payoff given the stated goal (training for Denis).

## Mandatory Vibe Features (outside the decision table)

These were set by Tim in the original brief without discussion. They are not up for debate.

- **Seagull** crossing the screen every ~15 s with a comic-strip callout
- **8-bit "beeping" OST** playing in the background (old-website MIDI spirit)
- **Attention-training mechanic** via "poop on the monitor": tapping empty space leaves a white splat that drips and fades
- **Contra / NES aesthetic**: pixel art, thermonuclear palette, scanline dithering on water

## Deliverables

- Works in a mobile browser as the primary device
- Works on desktop as a secondary device
- Deployed on a public URL for handoff to Denis (`@dgovorunov`) via Telegram
- Repository available for handoff (this document included)
