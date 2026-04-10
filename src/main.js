// YACHT DOCK — entry point
// Wires boot -> config -> game state machine, runs fixed-timestep loop.

import { DEFAULT_CONFIG, DOCK_META } from './config.js';
import { Boat } from './boat.js';
import { buildWorld, checkCollisions, checkDocked, WORLD } from './world.js';
import { Renderer } from './render.js';
import { Input } from './input.js';
import { ChipAudio } from './audio.js';
import { SeagullLayer } from './seagull.js';
import { CaptainWalker } from './captain.js';
import { TimWalker } from './tim.js';

const $ = (id) => document.getElementById(id);

const NO_THRUSTER_TOASTS = [
  'NO THRUSTER INSTALLED',
  'PFFFT... NOTHING',
  'TRY PADDLING',
  'SKILL ISSUE',
  'THRUSTER? WHAT THRUSTER?',
  'USE THE RUDDER, GENIUS',
  'THRUSTER NOT FOUND: 404',
  'MAYBE NEXT TIME',
];

// ----- State -----
const state = {
  scene: 'boot',         // 'boot' | 'config' | 'game'
  cfg: { ...DEFAULT_CONFIG },
  boat: null,
  world: null,
  wind: { speed: 0, angle: 0 },
  baseWindSpeed: 0,      // m/s from config (knots * 0.5144)
  gustMult: 1.0,         // current gust multiplier (1.0 = calm)
  gustTarget: 1.0,       // target multiplier
  gustTimer: 0,          // s until next gust transition
  renderer: null,
  input: null,
  audio: null,
  seagull: null,
  captain: null,
  droppedAnchor: null,  // { x, y, chainLen, _tension } — stern-anchor mode only
  dockedSince: null,
  lastT: 0,
  acc: 0,
  running: false,
  moored: false,
  crashed: false,
  bumpCount: 0,
  startTime: 0,
};

// ----- Boot screen -----
$('boot-start').addEventListener('click', async () => {
  if (!state.audio) {
    state.audio = new ChipAudio();
    await state.audio.resume();
    state.audio.startMusic();   // start CH 16 (shanty) on first boot
  }
  showConfig();
});

// ----- Config screen -----
function wireConfig() {
  const sections = document.querySelectorAll('.config-options');
  sections.forEach(sec => {
    const group = sec.dataset.group;
    const key   = configKey(group);

    // Visually activate the button matching the current (default) config value
    const defaultStr = String(state.cfg[key]);
    sec.querySelectorAll('.opt-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === defaultStr);
      btn.addEventListener('click', () => {
        sec.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const v = btn.dataset.value;
        state.cfg[key] = parseValue(group, v);
        if (group === 'musicvol') state.audio?.setMusicVolume(parseInt(v));
        if (group === 'sfxvol')   state.audio?.setSfxVolume(parseInt(v));
      });
    });
  });
  $('config-start').addEventListener('click', startGame);
}
function configKey(g) { return g === 'winddir' ? 'winddir' : g; }
function parseValue(group, v) {
  if (group === 'length' || group === 'wind' || group === 'winddir' || group === 'musicvol' || group === 'sfxvol') return parseInt(v, 10);
  return v;
}
function showConfig() {
  state.scene = 'config';
  $('boot').classList.add('hidden');
  $('config').classList.remove('hidden');
  $('game').classList.add('hidden');
}

// ----- Game screen -----
function startGame() {
  state.scene = 'game';
  $('config').classList.add('hidden');
  $('game').classList.remove('hidden');

  // Initialize world + boat
  state.world = buildWorld(state.cfg);
  state.boat = new Boat(state.cfg);
  const spawn = state.world.spawn;
  state.boat.x = spawn.x;
  state.boat.y = spawn.y;
  state.boat.heading = spawn.heading;

  // Wind: angle stored as radians; cfg.winddir is FROM direction in degrees
  const fromRad = state.cfg.winddir * Math.PI / 180;
  state.baseWindSpeed = state.cfg.wind * 0.5144;  // knots → m/s
  state.gustMult   = 1.0;
  state.gustTarget = 1.0;
  state.gustTimer  = 4 + Math.random() * 6;       // first gust in 4-10s
  state.wind = {
    speed: state.baseWindSpeed,
    angle: fromRad - Math.PI / 2,
  };

  state.moored = false;
  state.crashed = false;
  state.bumpCount = 0;
  state._thrusterWasHeld = false;
  state._noThrIdx = 0;
  state.droppedAnchor = null;
  state.world.anchor = null;
  state.startTime = performance.now();
  state.dockedSince = null;

  // Anchor mode: show the anchor panel and usage hint
  if (state.cfg.dock === 'stern-anchor') {
    $('anchor-panel').classList.remove('hidden');
    $('btn-anchor').textContent = '⚓ DROP ANCHOR';
    $('btn-anchor').disabled = false;
    $('btn-anchor').classList.remove('dropped');
    showToast('ВЫБЕРИТЕ МЕСТО И БРОСЬТЕ ЯКОРЬ [SPACE]', 5000);
  } else {
    $('anchor-panel').classList.add('hidden');
  }

  // Renderer
  const canvas = $('canvas');
  if (!state.renderer) state.renderer = new Renderer(canvas);
  state.renderer.fit();
  window.addEventListener('resize', () => state.renderer.fit());

  // Input
  if (!state.input) {
    state.input = new Input();
    state.input.bindTouch($('controls'));
  }
  // Reset gear to neutral on each new game (also clears edge-detection state)
  state.input.reset();
  state.input.throttleMode = state.cfg.throttlemode ?? 'click';
  // Gear click sound + HUD callback
  state.input.onGearChange = () => state.audio?.gearClick();

  // HUD
  $('hud-dock-label').textContent = DOCK_META[state.cfg.dock].label;
  updateWindHUD();
  showToast(DOCK_META[state.cfg.dock].hint, 4500);

  // Apply volume settings + start wind ambient
  if (state.audio) {
    state.audio.setMusicVolume(state.cfg.musicvol ?? 75);
    state.audio.setSfxVolume(state.cfg.sfxvol ?? 100);
  }

  // Seagull
  if (!state.seagull) {
    state.seagull = new SeagullLayer($('seagull-layer'), $('poop-layer'), state.audio);
  }

  // Dock character: Captain or Tim — chosen randomly on each game start
  const hasDock = state.world.walls.length > 0;
  state.captain = Math.random() < 0.5
    ? new CaptainWalker(hasDock)
    : new TimWalker(hasDock);

  // Menu
  $('btn-menu').onclick = () => {
    if (state.audio) { state.audio.engine(0); state.audio.thruster(0); }
    showConfig();
  };

  // Anchor: button click and Space key both trigger dropAnchor()
  $('btn-anchor').onclick = dropAnchor;

  // Kickoff loop
  state.running = true;
  state.lastT = performance.now();
  requestAnimationFrame(loop);
}

function updateWindHUD() {
  const blowingToDeg = state.cfg.winddir + 180;
  $('hud-wind-arrow').style.transform = `rotate(${blowingToDeg}deg)`;
  $('hud-wind-val').textContent = state.cfg.wind + ' KN';
}

function updateGusts(dt) {
  if (state.cfg.gusts !== 'yes' || state.baseWindSpeed === 0) {
    state.gustMult   = 1.0;
    state.gustTarget = 1.0;
    state.wind.speed = state.baseWindSpeed;
    return;
  }
  state.gustTimer -= dt;

  // True exponential approach: rise ~2s, fall ~5s → visibly slow build and lingering fade
  const diff = state.gustTarget - state.gustMult;
  const tau  = diff > 0 ? 2.0 : 5.0;
  state.gustMult += diff * (1 - Math.exp(-dt / tau));
  state.gustMult  = Math.max(1.0, Math.min(2.0, state.gustMult));

  // Transition at timer expiry
  if (state.gustTimer <= 0) {
    if (state.gustTarget > 1.05) {
      // End of gust → calm down
      state.gustTarget = 1.0;
      state.gustTimer  = 8 + Math.random() * 12;   // calm 8–20 s
    } else {
      // Trigger a gust
      state.gustTarget = 1.25 + Math.random() * 0.75;  // 1.25×–2.0×
      state.gustTimer  = 6 + Math.random() * 8;          // gust lasts 6–14 s
    }
  }

  state.wind.speed = state.baseWindSpeed * state.gustMult;
}

function dropAnchor() {
  if (state.cfg.dock !== 'stern-anchor') return;
  if (state.droppedAnchor) return;
  if (!state.running) return;

  const boat = state.boat;
  const ch = Math.cos(boat.heading), sh = Math.sin(boat.heading);
  const bowX = boat.x + ch * boat.lm / 2;
  const bowY = boat.y + sh * boat.lm / 2;

  // Chain length: from the drop point to the expected bow position when moored.
  // With stern-anchor (heading = π/2, bow faces down) the bow sits lm metres below the berth.
  const t = state.world.target;
  const dockedBowX = t.x;
  const dockedBowY = t.y + boat.lm;
  const chainLen = Math.hypot(bowX - dockedBowX, bowY - dockedBowY) + 2.5;

  state.droppedAnchor = { x: bowX, y: bowY, chainLen, _tension: 0 };
  state.world.anchor = state.droppedAnchor;   // renderer reads from here

  $('btn-anchor').textContent = '⚓ ЯКОРЬ БРОШЕН';
  $('btn-anchor').disabled = true;
  $('btn-anchor').classList.add('dropped');
  state.audio?.bump();
  showToast('ЯКОРЬ БРОШЕН — ДАВАЙ ЗАДНИМ!', 2500);
}

function showToast(txt, ms) {
  const t = $('toast');
  t.textContent = txt;
  t.classList.remove('hidden', 'toast-fade');
  clearTimeout(showToast._tid);
  showToast._tid = setTimeout(() => {
    t.classList.add('toast-fade');
    setTimeout(() => t.classList.add('hidden'), 400);
  }, ms || 3000);
}

function elapsedStr() {
  const sec = Math.round((performance.now() - state.startTime) / 1000);
  const m = Math.floor(sec / 60), s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function calcStars() {
  // 3 stars = no bumps + fast; 2 = few bumps; 1 = many bumps / slow
  if (state.bumpCount === 0) return 3;
  if (state.bumpCount <= 2) return 2;
  return 1;
}

function showWin() {
  const stars = calcStars();
  const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  const overlay = $('overlay-win');
  $('win-stars').textContent = starStr;
  $('win-time').textContent  = `TIME: ${elapsedStr()}`;
  $('win-bumps').textContent = `BUMPS: ${state.bumpCount}`;
  overlay.classList.remove('hidden');
  // Confetti burst
  startConfetti();
}

function showGameOver(speed) {
  const overlay = $('overlay-gameover');
  $('go-speed').textContent = `IMPACT: ${(speed / 0.5144).toFixed(1)} KN`;
  overlay.classList.remove('hidden');
}

function hideOverlays() {
  $('overlay-win').classList.add('hidden');
  $('overlay-gameover').classList.add('hidden');
  stopConfetti();
}

// Confetti
let _confettiId = null;
const _confettiEl = [];
function startConfetti() {
  const layer = $('confetti-layer');
  const colors = ['#ffd23f','#b8ff3b','#7cdfff','#ff3b3b','#ff8a1f'];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-bit';
    el.style.cssText = `
      left:${Math.random()*100}%;
      animation-delay:${(Math.random()*0.8).toFixed(2)}s;
      animation-duration:${(1.2+Math.random()*0.8).toFixed(2)}s;
      background:${colors[i % colors.length]};
      transform:rotate(${Math.random()*360}deg);
    `;
    layer.appendChild(el);
    _confettiEl.push(el);
  }
}
function stopConfetti() {
  _confettiEl.forEach(e => e.remove());
  _confettiEl.length = 0;
}

// ----- Game loop (fixed timestep) -----
const STEP = 1/60;

function loop(now) {
  if (!state.running) return;
  const dt = Math.min(0.1, (now - state.lastT) / 1000);
  state.lastT = now;
  state.acc += dt;

  // Captain update
  state.captain?.update(dt);

  // Input update
  state.input.update(dt);

  // Thruster not installed — play pff sound and show a toast on button press
  if (state.cfg.thruster === 'no') {
    const thrPressed = state.input.held.has('thruster-left') || state.input.held.has('thruster-right');
    if (thrPressed && !state._thrusterWasHeld) {
      state.audio?.pff();
      showToast(NO_THRUSTER_TOASTS[state._noThrIdx++ % NO_THRUSTER_TOASTS.length], 2200);
    }
    state._thrusterWasHeld = thrPressed;
  } else {
    state._thrusterWasHeld = false;
  }

  state.boat.setControls({
    throttle: state.input.throttle,
    rudder: state.input.rudder,
    thruster: state.input.thruster,
  });

  // Gust system — updates state.wind.speed each frame
  updateGusts(dt);

  // Physics steps
  while (state.acc >= STEP) {
    state.boat.step(STEP, state.wind);
    // Collisions
    const hits = checkCollisions(state.boat, state.world);
    for (const h of hits) {
      if (h.type === 'boat' || h.type === 'pile' || h.type === 'dock' || h.type === 'wall') {
        const vMag = Math.hypot(state.boat.vx, state.boat.vy);
        // 2 kn = 1.03 m/s: below that — elastic fender bounce, above — crash
        const isCrash = vMag > 1.03;
        state.boat.collide(h.nx, h.ny, Math.min(1, vMag / 2), !isCrash);
        if (vMag > 0.3) {
          state.audio?.bump();
          state.bumpCount++;
          state.renderer?.shake(Math.min(18, vMag * 5));
          if (isCrash && !state.moored && !state.crashed) {
            state.crashed = true;
            state.running = false;
            state.renderer?.shake(28);
            setTimeout(() => showGameOver(vMag), 400);
          }
        }
      }
    }
    // Anchor chain — spring force applied to bow when chain is taut
    if (state.droppedAnchor) {
      const anc = state.droppedAnchor;
      const boat = state.boat;
      const ch = Math.cos(boat.heading), sh = Math.sin(boat.heading);
      const bowX = boat.x + ch * boat.lm / 2;
      const bowY = boat.y + sh * boat.lm / 2;
      const dx = anc.x - bowX, dy = anc.y - bowY;
      const dist = Math.hypot(dx, dy);
      anc._tension = 0;
      if (dist > anc.chainLen && dist > 0.05) {
        const ext  = dist - anc.chainLen;
        const nx   = dx / dist, ny = dy / dist;
        const F    = 4500 * ext;                   // spring constant 4500 N/m
        anc._tension = F;
        const invM = 1 / boat.displacement;
        const invI = 1 / boat.inertia;
        boat.vx += F * nx * STEP * invM;
        boat.vy += F * ny * STEP * invM;
        // Torque: moment arm from CoM to bow × force
        const torque = (ch * boat.lm / 2) * (F * ny) - (sh * boat.lm / 2) * (F * nx);
        boat.omega += torque * STEP * invI;
      }
    }

    state.acc -= STEP;
  }

  if (state.crashed) { state.renderer.draw(state.world, state.boat, state.wind, 0, state.captain); return; }

  // Win check
  if (!state.moored && checkDocked(state.boat, state.world)) {
    if (state.dockedSince == null) state.dockedSince = performance.now();
    else if (performance.now() - state.dockedSince > 1200) {
      state.moored = true;
      state.running = false;
      state.audio?.moored();
      $('hud-status').textContent = 'MOORED';
      setTimeout(() => showWin(), 600);
    }
  } else {
    state.dockedSince = null;
  }

  // HUD — wind (live, reflects gusts)
  const windKn    = Math.round(state.wind.speed / 0.5144);
  const windEl    = $('hud-wind-val');
  const gustEl    = $('hud-gust-label');
  const gustFill  = $('hud-gust-fill');
  const isGusting = state.cfg.gusts === 'yes' && state.gustMult > 1.05;
  windEl.textContent = windKn + ' KN';
  windEl.style.color = isGusting ? 'var(--nes-orange)' : '';
  if (gustEl) {
    gustEl.textContent = isGusting ? 'GUST ×' + state.gustMult.toFixed(2) : '';
  }
  if (gustFill) {
    // Bar: 0% at gustMult=1.0, 100% at gustMult=2.0
    const pct = Math.max(0, (state.gustMult - 1.0) * 100);
    gustFill.style.width = pct + '%';
    gustFill.style.background = pct > 60 ? 'var(--nes-red)' : 'var(--nes-orange)';
  }
  // Wind ambient sound (scales with current gust-affected speed)
  state.audio?.windAmbient(state.wind.speed, state.gustMult);

  // HUD — speed
  $('hud-speed-val').textContent = Math.abs(state.boat.speedKn).toFixed(1) + ' KN';
  if (!state.moored) {
    const d = Math.hypot(state.boat.x - state.world.target.x, state.boat.y - state.world.target.y);
    let s = 'APPROACHING';
    if (d < 15) s = 'CLOSING IN';
    if (d < 6) s = 'FINAL APPROACH';
    if (state.boat.collisionImpulse > 0.3) s = '!!! BUMP !!!';
    $('hud-status').textContent = s;
  }
  // Throttle bar + gear label
  const fill  = $('throttle-fill');
  const glbl  = $('gear-label');
  const gear  = state.input.gear;
  const gt    = state.input.gearThrottle;
  const barPct = gt * 50;
  if (gear >= 0) {
    fill.style.left  = '50%';
    fill.style.width = barPct + '%';
    fill.classList.remove('reverse');
  } else {
    fill.style.left  = (50 - barPct) + '%';
    fill.style.width = barPct + '%';
    fill.classList.add('reverse');
  }
  if (glbl) {
    let gname, gcol;
    if (gear === 0) {
      gname = 'NEUTRAL'; gcol = 'var(--nes-grey)';
    } else {
      const dir = gear > 0 ? 'AHD' : 'AST';
      const lvl = gt <= 0.32 ? 'SLOW' : gt <= 0.66 ? 'HALF' : 'FULL';
      gname = lvl + ' ' + dir;
      gcol  = gear > 0 ? 'var(--nes-lime)' : 'var(--nes-red)';
    }
    glbl.textContent   = gname;
    glbl.style.color   = gcol;
  }

  // Engine sound
  state.audio?.engine(state.input.throttle);
  // Bow thruster electric motor
  state.audio?.thruster(state.input.thruster);

  // Render
  state.renderer.draw(state.world, state.boat, state.wind, dt, state.captain);

  requestAnimationFrame(loop);
}

// Overlay buttons
$('btn-win-again').addEventListener('click', () => { hideOverlays(); startGame(); });
$('btn-win-menu').addEventListener('click',  () => { hideOverlays(); showConfig(); });
$('btn-go-again').addEventListener('click',  () => { hideOverlays(); startGame(); });
$('btn-go-menu').addEventListener('click',   () => { hideOverlays(); showConfig(); });

// Init
wireConfig();

// Dev bypass: #config or #game in URL
if (location.hash === '#config') showConfig();
else if (location.hash === '#game') { showConfig(); startGame(); }

// Radio SEL button — cycle channels
$('btn-radio-ch').addEventListener('click', () => {
  if (!state.audio) return;
  const ch = state.audio.nextChannel();
  $('radio-ch-display').textContent = 'CH ' + String(ch).padStart(2, '0');
});

// Mute toggle via keyboard M; Space = drop anchor
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM' && state.audio) state.audio.setMuted(!state.audio.muted);
  if (e.code === 'Space') { e.preventDefault(); dropAnchor(); }
});

// Prevent scroll bounce on iOS
document.addEventListener('touchmove', e => {
  if (e.target.closest('#config')) return;
  e.preventDefault();
}, {passive: false});
