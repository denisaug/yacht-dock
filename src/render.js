// Canvas 2D rendering — top-down marina, pixel-art style
import { PAL } from './palette.js';
import { WORLD } from './world.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.pxPerM = 4;           // base scale
    this.t = 0;
    this.fit();

    // Axiometer mini-canvas in the dashboard
    this._axioCanvas = document.getElementById('axiometer');
    this._axioCtx = this._axioCanvas ? this._axioCanvas.getContext('2d') : null;
    if (this._axioCtx) this._axioCtx.imageSmoothingEnabled = false;

    // Thrust / thruster water particles
    this.particles = [];
    // Screen shake state
    this._shake = 0;
  }

  fit() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(240, Math.floor(rect.width));
    const h = Math.max(320, Math.floor(rect.height));
    this.canvas.width  = Math.floor(w * 0.5) * 2;
    this.canvas.height = Math.floor(h * 0.5) * 2;
    this.ctx.imageSmoothingEnabled = false;
    // Base scale: whole world fits on screen
    this._basePxPerM = Math.min(
      this.canvas.width  / WORLD.w,
      this.canvas.height / WORLD.h
    );
    this.pxPerM = this._basePxPerM;
    this._zoomLevel = 2;  // start at full-world view (1.0x mult)
    this._camX = WORLD.w / 2;
    this._camY = WORLD.h / 2;
    this._updateOffset();
  }

  _updateOffset() {
    const W = this.canvas.width, H = this.canvas.height;
    this.offsetX = W / 2 - this._camX * this.pxPerM;
    this.offsetY = H / 2 - this._camY * this.pxPerM;
  }

  // World -> screen
  wx(x) { return this.offsetX + x * this.pxPerM; }
  wy(y) { return this.offsetY + y * this.pxPerM; }
  ws(m) { return m * this.pxPerM; }

  shake(amount) {
    this._shake = Math.max(this._shake, amount);
  }

  draw(world, boat, wind, dt, captain = null) {
    this.t += dt;
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;

    // --- Stepped zoom based on distance to target ---
    // 4 levels: 0=very far, 1=far, 2=medium, 3=close
    // 4 levels (1=super far 0.55x, 2=full world 1.0x, 3=medium 1.9x, 4=close 3.4x)
    // Level 1 only if boat wanders well past spawn (~90m from dock)
    const ZOOM_THRESHOLDS = [100, 60, 35];
    const ZOOM_MULTS      = [0.55, 1.0, 1.9, 3.4];
    const dist = world.target
      ? Math.hypot(boat.x - world.target.x, boat.y - world.target.y)
      : 999;
    const newLevel = dist > ZOOM_THRESHOLDS[0] ? 1
                   : dist > ZOOM_THRESHOLDS[1] ? 2
                   : dist > ZOOM_THRESHOLDS[2] ? 3 : 4;
    if (newLevel !== this._zoomLevel) {
      this._zoomLevel = newLevel;
    }
    this.pxPerM = this._basePxPerM * ZOOM_MULTS[this._zoomLevel - 1];

    // Camera: always keep BOTH the boat and the target berth visible.
    // Compute the bounding box of [boat, target], centre camera on it.
    // If the box is taller/wider than the view, push camera so that target
    // stays at the near edge and boat is as centred as possible.
    const viewW = W / this.pxPerM;
    const viewH = H / this.pxPerM;
    const PAD   = 5; // metres margin around each point

    if (world.target) {
      const tx = world.target.x, ty = world.target.y;

      // X: always on the dock centre — no clamping so world centre stays on screen centre
      this._camX = tx;

      // Y: fit both dock and boat vertically; clamp only to avoid going past world edges
      const minY = Math.min(boat.y, ty) - PAD;
      const maxY = Math.max(boat.y, ty) + PAD;
      let camY = (minY + maxY) / 2;
      if (maxY - minY > viewH) camY = ty + (viewH / 2 - PAD);
      this._camY = Math.max(viewH / 2, Math.min(WORLD.h - viewH / 2, camY));
    } else {
      this._camX = boat.x;
      this._camY = Math.max(viewH / 2, Math.min(WORLD.h - viewH / 2, boat.y));
    }

    this._updateOffset();

    // Screen shake
    this._shake *= 0.78;
    const shakeX = this._shake > 0.5 ? (Math.random() - 0.5) * this._shake : 0;
    const shakeY = this._shake > 0.5 ? (Math.random() - 0.5) * this._shake : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Clear
    ctx.fillStyle = PAL.dark;
    ctx.fillRect(-8, -8, W + 16, H + 16);

    // --- Water background: horizontal bands + shimmering dots ---
    this.drawWater(ctx, W, H);

    // Dock wall (top)
    for (const wall of world.walls) {
      const wx1 = this.wx(wall.x1), wy1 = this.wy(wall.y1);
      const ww  = this.ws(wall.x2 - wall.x1);
      const wh  = this.ws(wall.y2 - wall.y1);

      // Base stone/concrete
      ctx.fillStyle = PAL.sandDark;
      ctx.fillRect(wx1, wy1, ww, wh);

      // Top lighter band
      ctx.fillStyle = PAL.sand;
      ctx.fillRect(wx1, wy1, ww, Math.max(2, this.ws(1.1)));

      // Wooden planks — vary colour slightly per plank for realism
      const step = 4;
      for (let x = wall.x1 + 1; x < wall.x2; x += step) {
        const shade = (Math.floor(x / step) % 3 === 0) ? PAL.woodLite : PAL.wood;
        ctx.fillStyle = shade;
        ctx.fillRect(this.wx(x), wy1 + this.ws(1.4), 1, wh - this.ws(1.4));
      }

      // Red-white hazard stripe at water edge
      const stripeH = 3;
      const stripeW = 8;
      const edgeY = wy1 + wh - stripeH;
      for (let sx = wx1; sx < wx1 + ww; sx += stripeW * 2) {
        ctx.fillStyle = PAL.red;
        ctx.fillRect(sx,           edgeY, stripeW, stripeH);
        ctx.fillStyle = PAL.white;
        ctx.fillRect(sx + stripeW, edgeY, stripeW, stripeH);
      }

      // Bollards every ~8m
      for (let bx = wall.x1 + 4; bx < wall.x2 - 2; bx += 8) {
        this.drawBollard(ctx, bx, wall.y2 - 0.8);
      }

      // Dock shadow on water (gradient strip below wall)
      const shadowGrad = ctx.createLinearGradient(0, wy1 + wh, 0, wy1 + wh + 14);
      shadowGrad.addColorStop(0, 'rgba(5,8,20,0.45)');
      shadowGrad.addColorStop(1, 'rgba(5,8,20,0)');
      ctx.fillStyle = shadowGrad;
      ctx.fillRect(wx1, wy1 + wh, ww, 14);
    }

    // Character on the dock (captain or tim — chosen randomly at game start)
    if (captain) {
      if (captain.type === 'tim') this.drawTim(ctx, captain);
      else this.drawCaptain(ctx, captain);
    }

    // Mooring lines / ghosts
    for (const ln of (world.lines || [])) {
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.setLineDash(ln.dash ? [3, 3] : []);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.wx(ln.x1), this.wy(ln.y1));
      ctx.lineTo(this.wx(ln.x2), this.wy(ln.y2));
      ctx.stroke();
      ctx.setLineDash([]);
    }


    // Target berth highlight (pulsing dashed rectangle)
    if (world.target) {
      const tgt = world.target;
      const tx = this.wx(tgt.x), ty = this.wy(tgt.y);
      const pulse = 0.6 + 0.4 * Math.sin(this.t * 4);
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(tgt.angle);
      ctx.strokeStyle = `rgba(184,255,59,${pulse})`;
      ctx.lineWidth = 2;
      const bL = this.ws(boat.lm * 1.1);
      const bB = this.ws(boat.beam * 1.3);
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(-bL/2, -bB/2, bL, bB);
      ctx.setLineDash([]);
      ctx.fillStyle = PAL.lime;
      ctx.beginPath();
      ctx.moveTo(bL/2 + 4, 0);
      ctx.lineTo(bL/2 - 2, -4);
      ctx.lineTo(bL/2 - 2,  4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Mooring ball
    if (world.mooringBall) {
      const m = world.mooringBall;
      const mx = this.wx(m.x), my = this.wy(m.y);
      ctx.fillStyle = PAL.red;
      ctx.beginPath();
      ctx.arc(mx, my, 4, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = PAL.white;
      ctx.fillRect(mx-1, my-1, 2, 2);
    }

    // Anchor + chain
    if (world.anchor) {
      const a   = world.anchor;
      const ax  = this.wx(a.x), ay = this.wy(a.y);
      const ch  = Math.cos(boat.heading), sh = Math.sin(boat.heading);
      const bowX = boat.x + ch * boat.lm / 2;
      const bowY = boat.y + sh * boat.lm / 2;
      const bwx  = this.wx(bowX), bwy = this.wy(bowY);

      const dist  = Math.hypot(bowX - a.x, bowY - a.y);
      const taut  = a.chainLen && dist > a.chainLen * 0.94;
      const tens  = a._tension || 0;

      // Chain line
      ctx.save();
      if (taut) {
        const glow = Math.min(1, tens / 8000);
        ctx.strokeStyle = `rgba(255,${Math.round(220 - glow*80)},${Math.round(60 - glow*60)},${0.75 + glow*0.25})`;
        ctx.lineWidth   = 1.5 + glow;
        ctx.shadowColor = tens > 3000 ? '#ff6030' : '#ffd23f';
        ctx.shadowBlur  = 4 + glow * 8;
      } else {
        ctx.strokeStyle = 'rgba(170,150,100,0.55)';
        ctx.lineWidth   = 1.5;
      }
      ctx.setLineDash([4, 3]);
      // Chain catenary: control point sags downward when there is slack
      const slack  = a.chainLen ? Math.max(0, a.chainLen - dist) : 0;
      const sagPx  = Math.min(24, slack * this.pxPerM * 0.4);
      const midX   = (ax + bwx) / 2;
      const midY   = (ay + bwy) / 2 + sagPx;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(midX, midY, bwx, bwy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Anchor icon
      ctx.save();
      const iconSize = Math.max(10, Math.min(18, this.pxPerM * 1.6));
      ctx.font = `bold ${iconSize}px monospace`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      if (taut) {
        ctx.fillStyle  = '#ffd23f';
        ctx.shadowColor = '#ffd23f';
        ctx.shadowBlur  = 6;
      } else {
        ctx.fillStyle = 'rgba(255,210,63,0.7)';
      }
      ctx.fillText('⚓', ax, ay);
      // Chain radius circle (dashed) — shown only when slack and zoom is sufficient
      if (!taut && a.chainLen && this.pxPerM >= 2.5) {
        const r = a.chainLen * this.pxPerM;
        ctx.strokeStyle = 'rgba(255,210,63,0.18)';
        ctx.lineWidth   = 1;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.arc(ax, ay, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }

    // Thrust / thruster water disturbance — drawn UNDER boat
    this.spawnThrustParticles(boat, dt);
    this.drawThrustParticles(ctx, dt);

    // Obstacles
    for (const ob of world.obstacles) {
      if (ob.type === 'boat') this.drawBoatSprite(ctx, ob.x, ob.y, ob.angle, ob.len, ob.beam, true);
      else if (ob.type === 'pile') this.drawPile(ctx, ob.x, ob.y);
    }

    // Player boat
    this.drawBoatSprite(ctx, boat.x, boat.y, boat.heading, boat.lm, boat.beam, false, boat);

    // Wake trail
    this.drawWake(ctx, boat);

    // Wind particles
    this.drawWind(ctx, wind, W, H);

    // Rudder angle indicator (axiometer on dashboard mini-canvas)
    if (this._axioCtx) this.drawAxiometer(this._axioCtx, boat.sRudder);

    // Collision flash
    if (boat.collisionImpulse > 0.05) {
      ctx.fillStyle = `rgba(255,59,59,${boat.collisionImpulse * 0.35})`;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore(); // end shake transform
  }

  drawWater(ctx, W, H) {
    const t = this.t;

    // Base fill
    ctx.fillStyle = PAL.deepSea;
    ctx.fillRect(0, 0, W, H);

    // Animated wave bands — each row offset by slow sine
    const bandH = 5;
    for (let row = 0; row < H; row += bandH) {
      const phase = (row / H) * Math.PI * 3;
      const shift = Math.sin(t * 0.9 + phase) * 6
                  + Math.sin(t * 0.4 + phase * 1.7) * 3;
      const d = row / H;
      const r = Math.round(10 + 16 * (1 - d)) | 0;
      const g = Math.round(35 + 34 * (1 - d)) | 0;
      const b = Math.round(64 + 64 * (1 - d)) | 0;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      const x0 = ((shift % W) + W) % W | 0;
      ctx.fillRect(x0, row, W - x0, bandH);
      if (x0 > 0) ctx.fillRect(0, row, x0, bandH);
    }

    // Drifting foam streaks
    const foamSpeed = 18;
    for (let i = 0; i < 22; i++) {
      const seedY = (i * 137.5) % H;
      const seedX = (i * 73.1)  % W;
      const len   = 12 + (i * 19) % 28;
      const drift = (t * foamSpeed * (0.5 + (i % 4) * 0.25) + seedX) % W;
      const y     = seedY + Math.sin(t * 0.3 + i) * 4;
      const alpha = 0.09 + 0.06 * Math.sin(t * 1.2 + i * 0.7);
      ctx.fillStyle = `rgba(124,223,255,${alpha.toFixed(2)})`;
      ctx.fillRect(drift | 0, y | 0, len, 1);
      if (i % 3 === 0) ctx.fillRect(drift | 0, (y + 1) | 0, len >> 1, 1);
    }

    // Caustic light blobs
    for (let i = 0; i < 18; i++) {
      const cx = ((i * 97.3 + t * 12 * (i % 3 === 0 ? 1 : -0.7)) % W + W) % W;
      const cy = ((i * 61.7 + t *  7 * (i % 2 === 0 ? 1 : -0.5)) % H + H) % H;
      const rx = 3 + (i % 5);
      const alpha = 0.05 + 0.04 * Math.sin(t * 2.3 + i * 1.1);
      ctx.fillStyle = `rgba(124,223,255,${alpha.toFixed(2)})`;
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, rx * 0.5, t * 0.5 + i, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Dock shadow strip (top)
    const grad = ctx.createLinearGradient(0, 0, 0, H * 0.10);
    grad.addColorStop(0, 'rgba(5,8,20,0.6)');
    grad.addColorStop(1, 'rgba(5,8,20,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H * 0.10);

    // Sparkle pixels
    const spkSeed = Math.floor(t * 3);
    ctx.fillStyle = 'rgba(248,248,248,0.55)';
    for (let i = 0; i < 30; i++) {
      const n = (i * 9301 + spkSeed * 49297) % 233280;
      const x = (n * 7.13) % W;
      const y = ((n * 2.37 + spkSeed * 17) % H);
      if ((i + spkSeed) % 6 === 0) ctx.fillRect(x | 0, y | 0, 1, 1);
    }
  }

  drawBoatSprite(ctx, wx, wy, heading, len, beam, isOther, boatRef) {
    ctx.save();
    ctx.translate(this.wx(wx), this.wy(wy));
    ctx.rotate(heading);
    const L = this.ws(len);
    const B = this.ws(beam);

    // ── Colour scheme ── modern GRP charter (Bavaria / Beneteau / Jeanneau) ──
    const hullWhite  = isOther ? '#e6e8f2' : '#f4f4f0';
    const hullLine   = isOther ? '#484e62' : '#383848';
    const bootCol    = isOther ? '#18288a' : '#101e58';   // boot stripe
    const deckTeak   = '#c2a862';
    const deckSeam   = '#a89050';
    const roofWhite  = isOther ? '#d8dce8' : '#eceae6';   // coachroof white
    const ckTeak     = '#7a5e3a';
    const wire       = 'rgba(200,205,220,0.75)';          // SS wire / stanchion

    // ─────────────────────────────────────────────────────────────────────────
    // KEY MEASUREMENTS
    // Local frame: +X = bow, −X = stern, +Y = port, −Y = stbd
    //   L = full boat length in px,  B = full beam in px
    //   mast: fractional rig at 38 % from bow
    const mastX = L/2 - L * 0.38;

    // Helper: draw hull path (inflate = extra px for outline)
    const hullPath = (inf) => {
      ctx.beginPath();
      // Sharp knife bow → opens fast → max beam at 38 % from bow
      // → long parallel midbody → wide square modern transom
      ctx.moveTo( L/2 + inf,  0);
      // Port side ─────────────────────────────────────────────
      ctx.bezierCurveTo(
        L/2 - L*0.03,  B*0.10 + inf,   // stays tight near tip
        L/2 - L*0.18,  B/2    + inf,   // then opens up fast
        L/2 - L*0.36,  B/2    + inf);  // max beam @ 36 % from bow
      ctx.lineTo(-L/2 + L*0.22,  B/2   + inf);  // parallel midbody
      ctx.bezierCurveTo(
        -L/2 + 5,       B/2    + inf,
        -L/2 - inf,     B*0.40,
        -L/2 - inf,     B*0.36);        // stern corner port
      // Flat transom ────────────────────────────────────────────
      ctx.lineTo(-L/2 - inf, -B*0.36);
      // Starboard side ─────────────────────────────────────────
      ctx.bezierCurveTo(
        -L/2 - inf,     -B*0.40,
        -L/2 + 5,       -B/2   - inf,
        -L/2 + L*0.22,  -B/2   - inf);
      ctx.lineTo( L/2 - L*0.36, -B/2   - inf);
      ctx.bezierCurveTo(
        L/2 - L*0.18, -B/2    - inf,
        L/2 - L*0.03, -B*0.10 - inf,
         L/2 + inf,    0);
      ctx.closePath();
    };

    // === Shadow ===
    ctx.fillStyle = 'rgba(5,8,20,0.22)';
    ctx.save();
    ctx.translate(4, 4);
    hullPath(0);
    ctx.fill();
    ctx.restore();

    // ── Hull outline (inflated 2px) ──
    hullPath(2);
    ctx.fillStyle = hullLine;
    ctx.fill();

    // ── Hull topsides (white GRP) ──
    hullPath(0);
    ctx.fillStyle = hullWhite;
    ctx.fill();

    // Hull sheen
    ctx.save();
    hullPath(0); ctx.clip();
    const sheen = ctx.createLinearGradient(L/2, -B*0.3, -L*0.1, B*0.3);
    sheen.addColorStop(0,   'rgba(255,255,255,0.32)');
    sheen.addColorStop(0.5, 'rgba(255,255,255,0.06)');
    sheen.addColorStop(1,   'rgba(0,0,0,0.04)');
    ctx.fillStyle = sheen;
    hullPath(0); ctx.fill();
    ctx.restore();

    // ── Boot stripe ──
    ctx.strokeStyle = bootCol;
    ctx.lineWidth = Math.max(1.2, B * 0.055);
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo( L/2-L*0.04,  B/2-1.5); ctx.lineTo(-L/2+L*0.22,  B/2-1.5); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo( L/2-L*0.04, -B/2+1.5); ctx.lineTo(-L/2+L*0.22, -B/2+1.5); ctx.stroke();

    // ── Teak deck ──
    const dW = B * 0.60;
    ctx.fillStyle = deckTeak;
    ctx.beginPath();
    ctx.moveTo( L/2-2,  0);
    ctx.bezierCurveTo(L/2-L*0.04, dW*0.10, L/2-L*0.19, dW/2, L/2-L*0.37, dW/2);
    ctx.lineTo(-L/2+L*0.22,  dW/2);
    ctx.bezierCurveTo(-L/2+5, dW/2, -L/2+1, dW*0.36, -L/2+1, dW*0.32);
    ctx.lineTo(-L/2+1, -dW*0.32);
    ctx.bezierCurveTo(-L/2+1, -dW*0.36, -L/2+5, -dW/2, -L/2+L*0.22, -dW/2);
    ctx.lineTo( L/2-L*0.37, -dW/2);
    ctx.bezierCurveTo(L/2-L*0.19, -dW/2, L/2-L*0.04, -dW*0.10, L/2-2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = deckSeam;
    ctx.lineWidth = 0.7;
    for (let xi = Math.ceil(-L/2+4); xi < L/2-3; xi += 4) {
      ctx.beginPath(); ctx.moveTo(xi,-dW*0.44); ctx.lineTo(xi, dW*0.44); ctx.stroke();
    }

    // ── Lifelines + stanchions ──
    ctx.strokeStyle = wire;
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(L/2-L*0.06,  B/2-1); ctx.lineTo(-L/2+L*0.23,  B/2-1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(L/2-L*0.06, -B/2+1); ctx.lineTo(-L/2+L*0.23, -B/2+1); ctx.stroke();
    ctx.lineWidth = 0.7;
    for (let xi = Math.floor(L/2-L*0.08); xi > -L/2+L*0.24; xi -= 7) {
      ctx.beginPath(); ctx.moveTo(xi,  dW/2); ctx.lineTo(xi,  B/2-1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xi, -dW/2); ctx.lineTo(xi, -B/2+1); ctx.stroke();
    }

    // ── Bathing platform (stern) ──
    ctx.fillStyle = deckTeak;
    const bathW = B * 0.64;
    ctx.fillRect((-L/2-3)|0, (-bathW/2)|0, 4, bathW|0);
    ctx.strokeStyle = deckSeam;
    ctx.lineWidth = 0.5;
    ctx.strokeRect((-L/2-3)|0, (-bathW/2)|0, 4, bathW|0);

    // ── Cockpit (large teak sole) ──
    const ckLen = L * 0.28;
    const ckW   = dW * 0.80;
    const ckX   = -L/2 + 2 + ckLen/2;
    ctx.fillStyle = ckTeak;
    ctx.beginPath();
    ctx.moveTo(ckX+ckLen/2,    -ckW/2);
    ctx.lineTo(ckX+ckLen/2,     ckW/2);
    ctx.lineTo(ckX-ckLen/2+2,   ckW/2);
    ctx.lineTo(ckX-ckLen/2,     ckW*0.34);
    ctx.lineTo(ckX-ckLen/2,    -ckW*0.34);
    ctx.lineTo(ckX-ckLen/2+2,  -ckW/2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(130,100,50,0.40)'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.strokeStyle = 'rgba(100,75,30,0.28)'; ctx.lineWidth = 0.6;
    for (let xi = Math.ceil(ckX-ckLen/2+2); xi < ckX+ckLen/2; xi += 3) {
      ctx.beginPath(); ctx.moveTo(xi,-ckW/2+1); ctx.lineTo(xi, ckW/2-1); ctx.stroke();
    }

    // ── Twin helms ──
    const helmX = ckX + ckLen*0.20;
    const helmR = ckW * 0.185;
    for (const hy of [-ckW*0.27, ckW*0.27]) {
      ctx.fillStyle = '#585868';
      ctx.beginPath(); ctx.arc(helmX, hy, helmR*0.42, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = 'rgba(218,196,112,0.94)'; ctx.lineWidth = 1.7;
      ctx.beginPath(); ctx.arc(helmX, hy, helmR, 0, Math.PI*2); ctx.stroke();
      ctx.lineWidth = 0.9;
      for (let a = 0; a < Math.PI*2; a += Math.PI/3) {
        ctx.beginPath(); ctx.moveTo(helmX,hy);
        ctx.lineTo(helmX+Math.cos(a)*helmR, hy+Math.sin(a)*helmR); ctx.stroke();
      }
    }

    // ── Stern arch ──
    const archX = ckX - ckLen*0.08;
    ctx.strokeStyle = wire; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(archX,-ckW/2); ctx.lineTo(archX,-B/2+1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(archX, ckW/2); ctx.lineTo(archX, B/2-1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(archX,-ckW/2); ctx.lineTo(archX, ckW/2); ctx.stroke();
    ctx.lineCap = 'butt';

    // ── Spray hood ──
    const shdX    = ckX + ckLen/2 + 1;
    const shdHalf = dW * 0.27;
    const shdLen  = L * 0.05;
    ctx.fillStyle = isOther ? 'rgba(30,55,130,0.82)' : 'rgba(14,36,88,0.90)';
    ctx.beginPath();
    ctx.moveTo(shdX,         -shdHalf);
    ctx.lineTo(shdX+shdLen,  -shdHalf);
    ctx.quadraticCurveTo(shdX+shdLen+shdHalf*0.9, 0, shdX+shdLen, shdHalf);
    ctx.lineTo(shdX,          shdHalf);
    ctx.closePath(); ctx.fill();

    // ── COACHROOF «pizza-slice» — wide aft, narrow fore ──
    const cfAft   = shdX;
    const cfFore  = mastX + L*0.04;
    const cfLen   = cfAft - cfFore;
    const cfWAft  = dW * 0.62;
    const cfWFore = dW * 0.28;
    ctx.fillStyle = roofWhite;
    ctx.beginPath();
    ctx.moveTo(cfFore,  cfWFore/2);
    ctx.lineTo(cfAft,   cfWAft/2);
    ctx.lineTo(cfAft,  -cfWAft/2);
    ctx.lineTo(cfFore, -cfWFore/2);
    ctx.closePath(); ctx.fill();
    // outline
    ctx.strokeStyle = 'rgba(150,145,130,0.38)'; ctx.lineWidth = 0.7; ctx.stroke();
    // highlight
    ctx.fillStyle = 'rgba(255,255,255,0.26)';
    ctx.beginPath();
    ctx.moveTo(cfFore, cfWFore/2); ctx.lineTo(cfAft, cfWAft/2);
    ctx.lineTo(cfAft, cfWAft/2-2); ctx.lineTo(cfFore, cfWFore/2-1);
    ctx.fill();
    // Rectangular portholes
    const portH = 1.4, portW = cfLen * 0.13;
    for (let side = -1; side <= 1; side += 2) {
      for (let p = 0; p < 3; p++) {
        const t  = 0.12 + p*0.30;
        const px = cfFore + cfLen*t;
        const wAt = cfWFore/2 + (cfWAft/2 - cfWFore/2)*t;
        const py  = side * (wAt - portH - 2);
        ctx.fillStyle = 'rgba(80,155,228,0.82)';
        ctx.fillRect(px|0, (py-portH)|0, portW|0, (portH*2)|0);
        ctx.strokeStyle = 'rgba(215,225,240,0.55)'; ctx.lineWidth = 0.4;
        ctx.strokeRect(px|0, (py-portH)|0, portW|0, (portH*2)|0);
      }
    }
    // Skylight
    const skyX = cfFore + cfLen*0.32, skyW = cfLen*0.38, skyH = dW*0.11;
    ctx.fillStyle = 'rgba(80,155,230,0.38)';
    ctx.fillRect(skyX|0, (-skyH/2)|0, skyW|0, skyH|0);

    // ── Forward hatch ──
    const hatchX = mastX + L*0.06, hatchHW = dW*0.16, hatchHL = L*0.075;
    ctx.fillStyle = 'rgba(52,96,165,0.60)';
    ctx.fillRect(hatchX|0, (-hatchHW)|0, hatchHL|0, (hatchHW*2)|0);
    ctx.strokeStyle = 'rgba(190,202,220,0.40)'; ctx.lineWidth = 0.5;
    ctx.strokeRect(hatchX|0, (-hatchHW)|0, hatchHL|0, (hatchHW*2)|0);

    // ── MAST ──
    ctx.fillStyle = '#aeafc0';
    ctx.beginPath(); ctx.arc(mastX, 0, 2.2, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.52)';
    ctx.beginPath(); ctx.arc(mastX-0.7, -0.6, 1.0, 0, Math.PI*2); ctx.fill();

    // ── SPREADERS — swept back, prominent ──
    const sprdReach = B * 0.44;
    const sprdBack  = sprdReach * 0.22;
    ctx.strokeStyle = 'rgba(190,192,210,0.94)';
    ctx.lineWidth = Math.max(1.1, B*0.038); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(mastX+1, 0); ctx.lineTo(mastX-sprdBack,  sprdReach); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mastX+1, 0); ctx.lineTo(mastX-sprdBack, -sprdReach); ctx.stroke();
    // shrouds (faint)
    ctx.strokeStyle = 'rgba(190,192,210,0.30)'; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(mastX-sprdBack, sprdReach);  ctx.lineTo(mastX-L*0.06,  B/2-2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mastX-sprdBack,-sprdReach);  ctx.lineTo(mastX-L*0.06, -B/2+2); ctx.stroke();
    ctx.lineCap = 'butt';

    // ── BOOM — thick aluminium ──
    ctx.strokeStyle = 'rgba(185,188,205,0.94)';
    ctx.lineWidth = Math.max(1.8, B*0.058); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(mastX, 0); ctx.lineTo(mastX - L*0.31, 0); ctx.stroke();
    ctx.fillStyle = 'rgba(170,172,190,0.85)';
    ctx.beginPath(); ctx.arc(mastX-L*0.31, 0, B*0.030, 0, Math.PI*2); ctx.fill();
    ctx.lineCap = 'butt';

    // Forestay + backstay
    ctx.strokeStyle = 'rgba(188,192,210,0.20)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(mastX,0); ctx.lineTo( L/2-2, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mastX,0); ctx.lineTo(-L/2+2, 0); ctx.stroke();

    // ── Bow pulpit + roller ──
    ctx.strokeStyle = wire; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.arc(L/2-2, 0, dW*0.30, Math.PI*0.47, -Math.PI*0.47); ctx.stroke();
    ctx.fillStyle = '#c0c2ce';
    ctx.beginPath(); ctx.arc(L/2-1, 0, 1.3, 0, Math.PI*2); ctx.fill();

    // ── Stern pushpit ──
    ctx.strokeStyle = wire; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.arc(-L/2+2, 0, B*0.32, -Math.PI*0.38, Math.PI*0.38); ctx.stroke();

    // ── Winches ──
    for (const [wxl, wyl] of [
      [mastX+L*0.04,  dW/2-2.5], [mastX+L*0.04, -dW/2+2.5],
      [ckX+ckLen*0.36, ckW/2-2], [ckX+ckLen*0.36,-ckW/2+2],
    ]) {
      ctx.fillStyle = '#888898';
      ctx.beginPath(); ctx.arc(wxl, wyl, 1.6, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#c2c4d0';
      ctx.beginPath(); ctx.arc(wxl-0.4, wyl-0.4, 0.70, 0, Math.PI*2); ctx.fill();
    }

    // ── FENDERS — round balls ──
    const nF = 4;
    const fR  = B * 0.115;
    const fxStart = L/2 - L*0.36;
    const fxEnd   = -L/2 + L*0.30;
    for (let i = 0; i < nF; i++) {
      const fx = fxStart - i * ((fxStart - fxEnd) / (nF-1));
      [-1,1].forEach(side => {
        const hullY   = side * B/2;
        const centerY = hullY + side * fR * 0.85;
        ctx.fillStyle = 'rgba(172,152,90,0.90)';
        ctx.beginPath(); ctx.arc(fx, hullY, Math.max(0.7,B*0.014), 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'rgba(172,152,90,0.65)';
        ctx.lineWidth = Math.max(0.5, B*0.011);
        ctx.beginPath(); ctx.moveTo(fx,hullY); ctx.lineTo(fx,centerY); ctx.stroke();
        ctx.fillStyle = 'rgba(5,8,20,0.22)';
        ctx.beginPath(); ctx.arc(fx+fR*0.20, centerY+fR*0.16, fR, 0, Math.PI*2); ctx.fill();
        const fg = ctx.createRadialGradient(fx-fR*0.30,centerY-fR*0.30,fR*0.05, fx,centerY,fR);
        fg.addColorStop(0.0, 'rgba(255,252,238,1.00)');
        fg.addColorStop(0.5, 'rgba(238,225,190,0.97)');
        fg.addColorStop(1.0, 'rgba(192,172,128,0.90)');
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.arc(fx, centerY, fR, 0, Math.PI*2); ctx.fill();
      });
    }

    // ── Rudder (player only) ──
    if (!isOther && boatRef) {
      ctx.save();
      ctx.translate(-L/2, 0);
      ctx.rotate(boatRef.sRudder * 0.6);
      ctx.fillStyle = '#9a9cac';
      ctx.fillRect(-3, -1, 3, 2);
      ctx.restore();
    }

    ctx.restore();
  }

  drawPile(ctx, x, y) {
    const px = this.wx(x), py = this.wy(y);
    // Shadow
    ctx.fillStyle = 'rgba(5,8,20,0.4)';
    ctx.fillRect(px-2, py-1, 6, 6);
    // Body
    ctx.fillStyle = PAL.dark;
    ctx.fillRect(px-3, py-3, 6, 6);
    ctx.fillStyle = PAL.wood;
    ctx.fillRect(px-2, py-2, 4, 4);
    // Ring bands (worn)
    ctx.fillStyle = PAL.sandDark;
    ctx.fillRect(px-2, py-1, 4, 1);
    ctx.fillRect(px-2, py+1, 4, 1);
    ctx.fillStyle = PAL.woodLite;
    ctx.fillRect(px-2, py-2, 1, 4);
    // Cap
    ctx.fillStyle = PAL.yellow;
    ctx.fillRect(px-1, py-3, 1, 1);
  }

  drawBollard(ctx, wx, wy) {
    const px = this.wx(wx), py = this.wy(wy);
    // Shadow
    ctx.fillStyle = 'rgba(5,8,20,0.35)';
    ctx.fillRect(px-1, py, 5, 4);
    // Base
    ctx.fillStyle = PAL.greyDark;
    ctx.fillRect(px-2, py-1, 5, 4);
    // Top knob
    ctx.fillStyle = PAL.grey;
    ctx.fillRect(px-1, py-3, 3, 3);
    ctx.fillStyle = PAL.white;
    ctx.fillRect(px,   py-3, 1, 1);
    // Rope hint
    ctx.fillStyle = 'rgba(232,217,168,0.5)';
    ctx.fillRect(px-2, py+1, 5, 1);
  }

  drawWake(ctx, boat) {
    const speed = boat.speedMs;
    if (speed < 0.15) return;
    const stern = {
      x: boat.x - Math.cos(boat.heading) * boat.lm/2,
      y: boat.y - Math.sin(boat.heading) * boat.lm/2,
    };
    ctx.fillStyle = `rgba(248,248,248,${Math.min(0.7, speed * 0.25)})`;
    const sx = this.wx(stern.x), sy = this.wy(stern.y);
    ctx.fillRect(sx - 1, sy - 1, 3, 3);
    const back = 8 + speed * 4;
    ctx.fillStyle = `rgba(248,248,248,${Math.min(0.5, speed * 0.18)})`;
    ctx.fillRect(sx - Math.cos(boat.heading) * back, sy - Math.sin(boat.heading) * back, 2, 2);
  }

  drawAxiometer(ctx, sRudder) {
    const W = this._axioCanvas.width;   // 80
    const H = this._axioCanvas.height;  // 46
    const cx = W / 2;
    const cy = H - 6;
    const r = 32;
    const arcFrom = -Math.PI * 5 / 6;
    const arcTo   = -Math.PI / 6;

    ctx.clearRect(0, 0, W, H);
    ctx.save();

    // Scale arc
    ctx.strokeStyle = PAL.greyDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, arcFrom, arcTo);
    ctx.stroke();

    // Tick marks
    const ticks = [
      { t: -1,   len: 5 },
      { t: -0.5, len: 3 },
      { t:  0,   len: 7 },
      { t:  0.5, len: 3 },
      { t:  1,   len: 5 },
    ];
    ticks.forEach(({ t, len }) => {
      const a = -Math.PI / 2 + t * Math.PI / 3;
      ctx.strokeStyle = t === 0 ? PAL.bone : PAL.grey;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - len), cy + Math.sin(a) * (r - len));
      ctx.lineTo(cx + Math.cos(a) * r,         cy + Math.sin(a) * r);
      ctx.stroke();
    });

    // Needle
    const needleAngle = -Math.PI / 2 + sRudder * Math.PI / 3;
    ctx.strokeStyle = PAL.yellow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(needleAngle) * (r - 4), cy + Math.sin(needleAngle) * (r - 4));
    ctx.stroke();

    // Center dot
    ctx.fillStyle = PAL.white;
    ctx.fillRect(cx - 1, cy - 1, 3, 3);

    // P / S labels
    ctx.font = '7px monospace';
    ctx.fillStyle = PAL.foam;
    ctx.textAlign = 'right';
    ctx.fillText('P', cx - r + 2, cy - 2);
    ctx.textAlign = 'left';
    ctx.fillText('S', cx + r - 10, cy - 2);

    ctx.restore();
  }

  spawnThrustParticles(boat, dt) {
    const ch  = Math.cos(boat.heading);
    const sh  = Math.sin(boat.heading);
    const halfL = boat.lm / 2;
    const halfB = boat.beam / 2;

    // ── Propeller wash ──────────────────────────────────────────────
    const throttle = boat.sThrottle;
    if (Math.abs(throttle) > 0.05) {
      const intensity = Math.abs(throttle);
      const isRev = throttle < 0;
      const rate  = intensity * (isRev ? 5 : 6);
      const count = Math.ceil(rate * dt * 60 * (0.4 + Math.random() * 0.6));
      // Stern centre — slightly forward of the very tip so particles clear the hull
      const sx = boat.x - ch * (halfL - 0.5);
      const sy = boat.y - sh * (halfL - 0.5);

      for (let i = 0; i < Math.min(count, 6); i++) {
        if (isRev) {
          // ── Reverse: white turbulent wash spreading forward under the hull
          const angle  = boat.heading + (Math.random() - 0.5) * 1.2;
          const speed  = (0.6 + Math.random() * 1.2) * intensity;
          const latOff = (Math.random() - 0.5) * halfB * 0.8;
          this.particles.push({
            x: sx - sh * latOff, y: sy + ch * latOff,
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            age: 0, life: 0.5 + Math.random() * 0.4,
            type: 'rev_wash', size: 0.6 + Math.random() * 1.1,
          });
        } else {
          // ── Forward: Kelvin wake arms + narrow foam trail
          // Kelvin half-angle ≈ 19.5°
          const K = 0.34;
          const arm = Math.random() < 0.5 ? -1 : 1;  // port or stbd wake arm

          if (Math.random() < 0.55) {
            // Kelvin arm — travels at heading+PI ± K, draws wave crest perpendicular to travel
            const angle = boat.heading + Math.PI + arm * K * (0.7 + Math.random() * 0.6);
            const speed = (1.2 + Math.random() * 1.8) * intensity;
            const latOff = arm * halfB * (0.2 + Math.random() * 0.4);
            this.particles.push({
              x: sx - sh * latOff, y: sy + ch * latOff,
              vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
              age: 0, life: 0.8 + Math.random() * 0.8,
              type: 'kelvin', size: 0.5 + Math.random() * 0.8,
              arm,  // store side for crest direction
            });
          } else {
            // Foam trail — narrow channel straight behind
            const angle = boat.heading + Math.PI + (Math.random() - 0.5) * 0.25;
            const speed = (0.8 + Math.random() * 1.4) * intensity;
            const latOff = (Math.random() - 0.5) * halfB * 0.35;
            this.particles.push({
              x: sx - sh * latOff, y: sy + ch * latOff,
              vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
              age: 0, life: 0.5 + Math.random() * 0.5,
              type: 'prop_foam', size: 0.3 + Math.random() * 0.6,
            });
          }
        }
      }
    }

    // ── Bow thruster ─────────────────────────────────────────────────
    const thruster = boat.sThruster;
    if (Math.abs(thruster) > 0.05) {
      const intensity = Math.abs(thruster);
      const count = Math.ceil(intensity * 7 * dt * 60 * (0.4 + Math.random() * 0.6));

      // thruster > 0 → bow goes STBD → water exits PORT (-1)
      const side   = thruster > 0 ? -1 : 1;
      // Perpendicular direction of the jet (outward from hull)
      const perpX  = -sh * side;
      const perpY  =  ch * side;
      const jetAng = Math.atan2(perpY, perpX);

      // Thruster tunnel exit point: bow area, offset to exit side
      const bx = boat.x + ch * halfL * 0.72 - sh * halfB * 0.45 * side;
      const by = boat.y + sh * halfL * 0.72 + ch * halfB * 0.45 * side;

      for (let i = 0; i < Math.min(count, 8); i++) {
        // Narrow-ish fan: ±30° for near-tunnel jets, wider for splash
        const isJet = Math.random() < 0.6;
        const spread = isJet ? 0.35 : 0.9;
        const angle  = jetAng + (Math.random() - 0.5) * spread;
        const speed  = isJet
          ? (2.0 + Math.random() * 2.5) * intensity
          : (0.8 + Math.random() * 1.5) * intensity;
        const longOff = (Math.random() - 0.5) * halfL * 0.15;  // slight fore-aft scatter
        this.particles.push({
          x: bx + ch * longOff, y: by + sh * longOff,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          age: 0, life: isJet ? 0.3 + Math.random() * 0.25 : 0.45 + Math.random() * 0.3,
          type: isJet ? 'bow_jet' : 'bow_wave',
          size: isJet ? 0.3 + Math.random() * 0.5 : 0.6 + Math.random() * 0.8,
        });
      }
    }

    if (this.particles.length > 350) this.particles.splice(0, this.particles.length - 350);
  }

  drawThrustParticles(ctx, dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt / p.life;
      if (p.age >= 1) { this.particles.splice(i, 1); continue; }

      const decay = Math.pow(0.82, dt * 60);
      p.vx *= decay; p.vy *= decay;
      p.x  += p.vx * dt;
      p.y  += p.vy * dt;

      const t   = p.age;
      const px  = this.wx(p.x);
      const py  = this.wy(p.y);
      const spd = Math.hypot(p.vx, p.vy) || 0.001;
      const nx  = p.vx / spd, ny = p.vy / spd;  // travel direction (normalised)
      const cx  = -ny, cy = nx;                   // crest direction (perpendicular)
      const alpha = Math.sin(t * Math.PI);

      // r is already pixels (ws = metres × pxPerM) — no further pxPerM multiply
      const r = Math.max(1, this.ws(p.size));

      if (p.type === 'kelvin') {
        // Kelvin wake crest: line perpendicular to travel, grows longer with age
        const crest  = r * (0.8 + t * 3.5);
        const aWhite = (alpha * 0.55).toFixed(2);
        const aDark  = (alpha * 0.25).toFixed(2);
        ctx.strokeStyle = `rgba(10,40,90,${aDark})`;
        ctx.lineWidth   = Math.max(1, r * 0.6);
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.moveTo(px - cx * crest * 0.4, py - cy * crest * 0.4);
        ctx.lineTo(px + cx * crest * 0.4, py + cy * crest * 0.4);
        ctx.stroke();
        ctx.strokeStyle = `rgba(200,225,255,${aWhite})`;
        ctx.lineWidth   = Math.max(1, r * 0.35);
        ctx.beginPath();
        ctx.moveTo(px - cx * crest * 0.35, py - cy * crest * 0.35);
        ctx.lineTo(px + cx * crest * 0.35, py + cy * crest * 0.35);
        ctx.stroke();
        ctx.lineCap = 'butt';

      } else if (p.type === 'prop_foam') {
        // Narrow foam trail in propeller wash — white dashes
        const dash = r * (1.5 + t);
        const a    = (alpha * 0.65).toFixed(2);
        ctx.strokeStyle = `rgba(220,235,255,${a})`;
        ctx.lineWidth   = Math.max(1, r * 0.6);
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.moveTo(px - nx * dash * 0.4, py - ny * dash * 0.4);
        ctx.lineTo(px + nx * dash * 0.5, py + ny * dash * 0.5);
        ctx.stroke();
        ctx.lineCap = 'butt';

      } else if (p.type === 'rev_wash') {
        // Reverse turbulence: short irregular patches spreading from stern
        const plen = r * (1 + t * 1.5);
        const aW   = (alpha * 0.5).toFixed(2);
        const aD   = (alpha * 0.3).toFixed(2);
        ctx.strokeStyle = `rgba(8,28,65,${aD})`;
        ctx.lineWidth   = Math.max(1, r * 0.8);
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.moveTo(px - cx * plen * 0.5, py - cy * plen * 0.5);
        ctx.lineTo(px + cx * plen * 0.5, py + cy * plen * 0.5);
        ctx.stroke();
        ctx.strokeStyle = `rgba(210,228,255,${aW})`;
        ctx.lineWidth   = Math.max(1, r * 0.4);
        ctx.beginPath();
        ctx.moveTo(px - cx * plen * 0.3, py - cy * plen * 0.3);
        ctx.lineTo(px + cx * plen * 0.3, py + cy * plen * 0.3);
        ctx.stroke();
        ctx.lineCap = 'butt';

      } else if (p.type === 'bow_jet') {
        // Bow thruster tunnel jet: tight directional streak
        const slen = r * (1.8 + t * 2.0);
        const a    = (alpha * 0.7).toFixed(2);
        ctx.strokeStyle = `rgba(200,228,255,${a})`;
        ctx.lineWidth   = Math.max(1, r * 0.55);
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.moveTo(px - nx * slen * 0.25, py - ny * slen * 0.25);
        ctx.lineTo(px + nx * slen * 0.75, py + ny * slen * 0.75);
        ctx.stroke();
        ctx.lineCap = 'butt';

      } else {
        // bow_wave: expanding wave crests from bow tunnel exit
        const crest = r * (0.6 + t * 2.5);
        const aW    = (alpha * 0.45).toFixed(2);
        const aD    = (alpha * 0.22).toFixed(2);
        ctx.strokeStyle = `rgba(10,40,90,${aD})`;
        ctx.lineWidth   = Math.max(1, r * 0.5);
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.moveTo(px - cx * crest * 0.4, py - cy * crest * 0.4);
        ctx.lineTo(px + cx * crest * 0.4, py + cy * crest * 0.4);
        ctx.stroke();
        ctx.strokeStyle = `rgba(195,220,255,${aW})`;
        ctx.lineWidth   = Math.max(1, r * 0.28);
        ctx.beginPath();
        ctx.moveTo(px - cx * crest * 0.35, py - cy * crest * 0.35);
        ctx.lineTo(px + cx * crest * 0.35, py + cy * crest * 0.35);
        ctx.stroke();
        ctx.lineCap = 'butt';
      }
    }
  }

  // ── Captain walking on the dock ─────────────────────────────────────
  // Deliberately oversized vs world scale so he's clearly visible as a character.
  drawCaptain(ctx, captain) {
    if (!captain || !captain.active) return;

    const px = this.pxPerM;
    const cx = Math.round(this.wx(captain.x));
    const cy = Math.round(this.wy(captain.y));

    // Zoom level 1 (0.55× — whole world): tiny white dot for the cap
    if (px < 2.0) {
      ctx.fillStyle = 'rgba(248,248,248,0.95)';
      ctx.fillRect(cx - 1, cy - 2, 3, 2);
      return;
    }

    // Figure size: intentionally ~3.5× real-world scale so he reads as a person.
    // At zoom 2 (full world, px≈3.3): figH≈18px — small but visible
    // At zoom 3 (medium,    px≈6.3): figH≈35px — clearly a person
    // At zoom 4 (close up,  px≈11):  figH≈61px — prominent character
    const figH = Math.max(10, Math.round(px * 5.6));
    const figW = Math.max(5,  Math.round(px * 2.2));
    const f    = captain.facing;   // 1 = right, -1 = left
    // Walk cycle: alternates every 0.4m of travel → stride feels natural
    const step = Math.floor(captain.x * 2.5) & 1;

    const capH  = Math.max(2, Math.round(figH * 0.13));
    const headH = Math.max(3, Math.round(figH * 0.18));
    const bodyH = Math.max(3, Math.round(figH * 0.38));
    const legsH = Math.max(3, figH - capH - headH - bodyH);
    const legW  = Math.max(2, Math.floor(figW * 0.38));
    const headW = Math.max(3, Math.round(figW * 0.70));

    let y = cy - figH;  // top of figure

    // ── Cap: white top, navy band, grey brim ─────────────────────────
    // Brim (slightly wider, grey underside)
    ctx.fillStyle = '#c8c8d0';
    ctx.fillRect(cx - Math.ceil(figW / 2) - 2, y + capH - 2, figW + 4, 2);
    // White crown
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(cx - Math.ceil(figW / 2), y, figW, capH);
    // Navy cap band
    if (capH >= 4) {
      ctx.fillStyle = '#1a3a6e';
      ctx.fillRect(cx - Math.ceil(figW / 2), y + Math.round(capH * 0.55), figW, Math.max(2, Math.round(capH * 0.42)));
    }
    // Gold cap badge / anchor icon (at medium+ zoom)
    if (figH >= 30) {
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(cx - 1, y + 1, 2, Math.max(1, Math.round(capH * 0.45)));
    }
    y += capH;

    // ── Head ─────────────────────────────────────────────────────────
    ctx.fillStyle = '#f0b87c';
    ctx.fillRect(cx - Math.floor(headW / 2), y, headW, headH);
    // Eyes
    if (figH >= 18) {
      ctx.fillStyle = '#111';
      const eyeX = f > 0
        ? cx - Math.floor(headW / 2) + Math.round(headW * 0.65)
        : cx - Math.floor(headW / 2) + Math.round(headW * 0.20);
      const eyeY = y + Math.round(headH * 0.42);
      ctx.fillRect(eyeX, eyeY, Math.max(1, Math.round(headW * 0.15)), Math.max(1, Math.round(headH * 0.22)));
    }
    // Mouth hint (big zoom only)
    if (figH >= 40) {
      ctx.fillStyle = '#c07040';
      const mY = y + Math.round(headH * 0.72);
      const mW = Math.round(headW * 0.38);
      ctx.fillRect(cx - Math.floor(mW / 2), mY, mW, Math.max(1, Math.round(headH * 0.15)));
    }
    y += headH;

    // ── White naval uniform ───────────────────────────────────────────
    ctx.fillStyle = '#e8e8ec';
    ctx.fillRect(cx - Math.floor(figW / 2), y, figW, bodyH);
    // Navy collar bar
    ctx.fillStyle = '#1a3a6e';
    ctx.fillRect(cx - Math.floor(figW / 2), y, figW, Math.max(2, Math.round(bodyH * 0.15)));
    if (figH >= 22) {
      // Gold epaulettes on shoulders
      ctx.fillStyle = '#ffd23f';
      const epW = Math.max(2, Math.round(figW * 0.20));
      const epH = Math.max(2, Math.round(bodyH * 0.28));
      ctx.fillRect(cx - Math.floor(figW / 2),          y, epW, epH);
      ctx.fillRect(cx + Math.ceil(figW / 2)  - epW,    y, epW, epH);
    }
    if (figH >= 35) {
      // Buttons on jacket
      ctx.fillStyle = '#ffd23f';
      const btnX = cx - 1;
      for (let b = 1; b <= 3; b++) {
        ctx.fillRect(btnX, y + Math.round(bodyH * b * 0.22), 2, 2);
      }
    }
    y += bodyH;

    // ── Navy trousers + walk animation ───────────────────────────────
    ctx.fillStyle = '#1a3a6e';
    const lA = step === 0 ? legsH : legsH - Math.max(1, Math.round(legsH * 0.18));
    const lB = step === 0 ? legsH - Math.max(1, Math.round(legsH * 0.18)) : legsH;
    ctx.fillRect(cx - legW - 1, y, legW, lA);
    ctx.fillRect(cx + 1,        y, legW, lB);
    // Shoes (dark, extend slightly in walking direction)
    ctx.fillStyle = '#1a1a2e';
    const shoeW = legW + 2;
    ctx.fillRect(cx - legW - 1 + (f < 0 ? -2 : 0), y + lA - 2, shoeW, 2);
    ctx.fillRect(cx + 1         + (f > 0 ?  0 : -2) - (f > 0 ? 0 : 0), y + lB - 2, shoeW, 2);

    // ── Speech bubble — positioned to the side the captain faces ──────
    // Show from zoom 2 upward (px ≥ 3.0); font scales with zoom
    if (captain.phrase && px >= 3.0) {
      const fadeIn  = Math.min(1, captain.phraseAge / 0.35);
      const fadeOut = captain.phraseAge > captain.phraseDur - 0.7
        ? Math.max(0, (captain.phraseDur - captain.phraseAge) / 0.7)
        : 1;
      const alpha = fadeIn * fadeOut;
      if (alpha > 0.02) {
        ctx.save();
        ctx.globalAlpha = alpha;

        // Font size: 9px at zoom 2, up to 13px at zoom 4
        const fsize = Math.max(9, Math.min(13, Math.round(px * 1.35)));
        ctx.font = `${fsize}px "Press Start 2P", monospace`;
        ctx.textBaseline = 'top';

        const lines = captain.phrase.split('\n');
        const lh    = fsize + 5;
        const pad   = 6;
        let maxTW   = 0;
        for (const l of lines) maxTW = Math.max(maxTW, ctx.measureText(l).width);

        const bw  = maxTW + pad * 2;
        const bh  = lines.length * lh + pad * 2;
        const CW  = this.canvas.width;
        const gap = Math.ceil(figW / 2) + 6;  // gap between captain edge and bubble

        // Try to place bubble in the direction captain faces; clamp to screen
        let bx = f > 0 ? cx + gap : cx - gap - bw;
        bx = Math.max(4, Math.min(CW - bw - 4, bx));

        // Vertical: center on upper body (around collar/head area)
        const by = cy - Math.round(figH * 0.80) - bh / 2;

        // Drop shadow
        ctx.fillStyle = 'rgba(5,8,20,0.7)';
        ctx.fillRect(bx + 3, by + 3, bw, bh);
        // White body
        ctx.fillStyle = '#f8f8f8';
        ctx.fillRect(bx, by, bw, bh);
        // Thick cyan border
        ctx.strokeStyle = '#7cdfff';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
        // Dark text
        ctx.fillStyle = '#050814';
        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i], bx + pad, by + pad + i * lh);
        }

        // Horizontal tail pointing from bubble edge toward captain
        const tailY = Math.round(by + bh / 2);
        const captainIsLeft = cx < bx;  // captain is to the left of the bubble
        ctx.fillStyle = '#f8f8f8';
        ctx.beginPath();
        if (captainIsLeft) {
          // Tail points left
          ctx.moveTo(bx, tailY - 5);
          ctx.lineTo(bx, tailY + 5);
          ctx.lineTo(bx - 9, tailY);
        } else {
          // Tail points right
          ctx.moveTo(bx + bw, tailY - 5);
          ctx.lineTo(bx + bw, tailY + 5);
          ctx.lineTo(bx + bw + 9, tailY);
        }
        ctx.closePath();
        ctx.fill();
        // Tail border
        ctx.strokeStyle = '#7cdfff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (captainIsLeft) {
          ctx.moveTo(bx, tailY - 5); ctx.lineTo(bx - 9, tailY);
          ctx.moveTo(bx, tailY + 5); ctx.lineTo(bx - 9, tailY);
        } else {
          ctx.moveTo(bx + bw, tailY - 5); ctx.lineTo(bx + bw + 9, tailY);
          ctx.moveTo(bx + bw, tailY + 5); ctx.lineTo(bx + bw + 9, tailY);
        }
        ctx.stroke();

        ctx.restore();
      }
    }
  }

  // ── Tim on the dock ─────────────────────────────────────────────────
  drawTim(ctx, tim) {
    if (!tim || !tim.active) return;

    const px = this.pxPerM;
    const cx = Math.round(this.wx(tim.x));
    const cy = Math.round(this.wy(tim.y));

    if (px < 2.0) {
      ctx.fillStyle = 'rgba(255,200,50,0.95)';
      ctx.fillRect(cx - 1, cy - 2, 3, 2);
      return;
    }

    const figH = Math.max(10, Math.round(px * 5.6));
    const figW = Math.max(5,  Math.round(px * 2.2));
    const f    = tim.facing;
    const step = Math.floor(tim.x * 2.5) & 1;

    const headH = Math.max(3, Math.round(figH * 0.20));
    const bodyH = Math.max(3, Math.round(figH * 0.36));
    const legsH = Math.max(3, figH - headH - bodyH);
    const legW  = Math.max(2, Math.floor(figW * 0.38));
    const headW = Math.max(3, Math.round(figW * 0.72));

    let y = cy - figH;

    // ── Head (bald, shiny) ─────────────────────────────────────────────
    // Base — skin colour
    ctx.fillStyle = '#f0c888';
    ctx.fillRect(cx - Math.floor(headW / 2), y, headW, headH);
    // Highlight on the bald top (lighter at the crown)
    if (figH >= 22) {
      ctx.fillStyle = 'rgba(255,255,220,0.55)';
      const blkW = Math.max(2, Math.round(headW * 0.40));
      ctx.fillRect(cx - Math.floor(blkW / 2) + Math.round(headW * 0.10),
                   y + 1, blkW, Math.max(1, Math.round(headH * 0.28)));
    }

    // HUGE sunglasses — wider than the head, height ~half the head
    if (figH >= 14) {
      // Intentionally wider than headW so they stick out past the edges
      const gH  = Math.max(3, Math.round(headH * 0.52));
      const gW  = Math.max(6, Math.round(headW * 1.30));   // 30% wider than head
      const gY  = y + Math.round(headH * 0.28);
      const gX  = cx - Math.floor(gW / 2);
      const lensW = Math.floor((gW - 2) / 2);

      // Lenses — nearly black with a slight blue tint
      ctx.fillStyle = '#0a0e1a';
      ctx.fillRect(gX,            gY, lensW, gH);
      ctx.fillRect(gX + lensW + 2, gY, lensW, gH);

      // Lens glare (small white rectangle highlight)
      if (figH >= 28) {
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        const glW = Math.max(1, Math.round(lensW * 0.28));
        const glH = Math.max(1, Math.round(gH * 0.32));
        ctx.fillRect(gX + 2, gY + 2, glW, glH);
        ctx.fillRect(gX + lensW + 4, gY + 2, glW, glH);
      }

      // Frame — thick, gold
      const bord = Math.max(1, Math.round(gH * 0.18));
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth   = bord + 1;
      ctx.strokeRect(gX + 0.5,            gY + 0.5, lensW - 1, gH - 1);
      ctx.strokeRect(gX + lensW + 2.5,    gY + 0.5, lensW - 1, gH - 1);

      // Bridge between the lenses (thick)
      ctx.fillStyle = '#ffd23f';
      const bridgeH = Math.max(2, Math.round(gH * 0.25));
      ctx.fillRect(gX + lensW, gY + Math.floor((gH - bridgeH) / 2), 2, bridgeH);

      // Arms (extend back behind the head)
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth   = Math.max(1, bord);
      ctx.beginPath();
      ctx.moveTo(gX, gY + Math.floor(gH / 2));
      ctx.lineTo(gX - Math.round(headW * 0.18), gY + Math.floor(gH / 2));
      ctx.moveTo(gX + gW, gY + Math.floor(gH / 2));
      ctx.lineTo(gX + gW + Math.round(headW * 0.18), gY + Math.floor(gH / 2));
      ctx.stroke();
    }

    // Mouth (open — he's always saying something)
    if (figH >= 38) {
      ctx.fillStyle = '#c07040';
      const mY = y + Math.round(headH * 0.76);
      const mW = Math.round(headW * 0.38);
      ctx.fillRect(cx - Math.floor(mW / 2), mY, mW, Math.max(2, Math.round(headH * 0.18)));
    }
    y += headH;

    // ── Body: hoodie (orange-yellow) ──────────────────────────────────
    ctx.fillStyle = '#e8920a';
    ctx.fillRect(cx - Math.floor(figW / 2), y, figW, bodyH);
    // Kangaroo pocket
    if (figH >= 28) {
      ctx.fillStyle = '#c07408';
      const pW = Math.round(figW * 0.50);
      const pH = Math.round(bodyH * 0.35);
      ctx.fillRect(cx - Math.floor(pW / 2), y + Math.round(bodyH * 0.55), pW, pH);
    }

    // ── Arms (normal or raised) ───────────────────────────────────────
    if (figH >= 22) {
      const armW = Math.max(2, Math.round(figW * 0.28));
      const armH = Math.max(3, Math.round(bodyH * 0.72));
      ctx.fillStyle = '#e8920a';

      if (tim.airDraw) {
        // Arms up and slightly spread — "drawing in the air" pose
        const upH = Math.round(bodyH * 0.80);
        // Left arm (up and to the left)
        ctx.fillRect(cx - Math.floor(figW / 2) - armW - 1,
                     y - upH + Math.round(bodyH * 0.10),
                     armW, upH);
        // Right arm (up and to the right)
        ctx.fillRect(cx + Math.ceil(figW / 2) + 1,
                     y - upH + Math.round(bodyH * 0.10),
                     armW, upH);
        // Hands (skin-coloured)
        ctx.fillStyle = '#f0c888';
        const handS = Math.max(2, Math.round(armW * 1.1));
        ctx.fillRect(cx - Math.floor(figW / 2) - armW - 1,
                     y - upH + Math.round(bodyH * 0.10) - handS,
                     handS, handS);
        ctx.fillRect(cx + Math.ceil(figW / 2) + 1,
                     y - upH + Math.round(bodyH * 0.10) - handS,
                     handS, handS);
        // Sparkle lines "drawing" effect (visible only at close zoom)
        if (figH >= 35) {
          ctx.strokeStyle = 'rgba(255,220,60,0.7)';
          ctx.lineWidth = 1;
          const cx2 = cx - Math.floor(figW / 2) - armW - 1;
          const cy2 = y - upH + Math.round(bodyH * 0.10) - handS - 4;
          ctx.beginPath(); ctx.moveTo(cx2 - 4, cy2); ctx.lineTo(cx2 + 4, cy2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx2, cy2 - 4); ctx.lineTo(cx2, cy2 + 4); ctx.stroke();
          const cx3 = cx + Math.ceil(figW / 2) + 1 + armW;
          ctx.beginPath(); ctx.moveTo(cx3 - 4, cy2); ctx.lineTo(cx3 + 4, cy2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx3, cy2 - 4); ctx.lineTo(cx3, cy2 + 4); ctx.stroke();
        }
      } else {
        // Arms down (normal walking)
        ctx.fillRect(cx - Math.floor(figW / 2) - armW - 1, y, armW, armH);
        ctx.fillRect(cx + Math.ceil(figW / 2) + 1,         y, armW, armH);
      }
    }
    y += bodyH;

    // ── Jeans + walking stride ────────────────────────────────────────
    ctx.fillStyle = '#2a4a8a';
    const lA = step === 0 ? legsH : legsH - Math.max(1, Math.round(legsH * 0.18));
    const lB = step === 0 ? legsH - Math.max(1, Math.round(legsH * 0.18)) : legsH;
    ctx.fillRect(cx - legW - 1, y, legW, lA);
    ctx.fillRect(cx + 1,        y, legW, lB);
    // Sneakers (white)
    ctx.fillStyle = '#f0f0f0';
    const shoeW = legW + 2;
    ctx.fillRect(cx - legW - 1 + (f < 0 ? -2 : 0), y + lA - 2, shoeW, 2);
    ctx.fillRect(cx + 1         + (f > 0 ?  0 : -2), y + lB - 2, shoeW, 2);

    // ── Speech bubble (yellow border — distinguishes Tim from the Captain) ─────
    if (tim.phrase && px >= 3.0) {
      const fadeIn  = Math.min(1, tim.phraseAge / 0.35);
      const fadeOut = tim.phraseAge > tim.phraseDur - 0.7
        ? Math.max(0, (tim.phraseDur - tim.phraseAge) / 0.7)
        : 1;
      const alpha = fadeIn * fadeOut;
      if (alpha > 0.02) {
        ctx.save();
        ctx.globalAlpha = alpha;

        const fsize = Math.max(9, Math.min(12, Math.round(px * 1.25)));
        ctx.font = `${fsize}px "Press Start 2P", monospace`;
        ctx.textBaseline = 'top';

        const lines = tim.phrase.split('\n');
        const lh    = fsize + 5;
        const pad   = 6;
        let maxTW   = 0;
        for (const l of lines) maxTW = Math.max(maxTW, ctx.measureText(l).width);

        const bw  = maxTW + pad * 2;
        const bh  = lines.length * lh + pad * 2;
        const CW  = this.canvas.width;
        const gap = Math.ceil(figW / 2) + 6;

        let bx = f > 0 ? cx + gap : cx - gap - bw;
        bx = Math.max(4, Math.min(CW - bw - 4, bx));

        const by = cy - Math.round(figH * 0.80) - bh / 2;

        // Drop shadow
        ctx.fillStyle = 'rgba(5,8,20,0.7)';
        ctx.fillRect(bx + 3, by + 3, bw, bh);
        // Bubble body (slightly warm white)
        ctx.fillStyle = '#fffbe8';
        ctx.fillRect(bx, by, bw, bh);
        // Yellow border (vs the Captain's cyan border)
        ctx.strokeStyle = '#ffd23f';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
        // Text
        ctx.fillStyle = '#1a0a00';
        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i], bx + pad, by + pad + i * lh);
        }

        // Bubble tail (pointer triangle)
        const tailY = Math.round(by + bh / 2);
        const timIsLeft = cx < bx;
        ctx.fillStyle = '#fffbe8';
        ctx.beginPath();
        if (timIsLeft) {
          ctx.moveTo(bx, tailY - 5);
          ctx.lineTo(bx, tailY + 5);
          ctx.lineTo(bx - 9, tailY);
        } else {
          ctx.moveTo(bx + bw, tailY - 5);
          ctx.lineTo(bx + bw, tailY + 5);
          ctx.lineTo(bx + bw + 9, tailY);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffd23f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (timIsLeft) {
          ctx.moveTo(bx, tailY - 5); ctx.lineTo(bx - 9, tailY);
          ctx.moveTo(bx, tailY + 5); ctx.lineTo(bx - 9, tailY);
        } else {
          ctx.moveTo(bx + bw, tailY - 5); ctx.lineTo(bx + bw + 9, tailY);
          ctx.moveTo(bx + bw, tailY + 5); ctx.lineTo(bx + bw + 9, tailY);
        }
        ctx.stroke();

        ctx.restore();
      }
    }
  }

  drawWind(ctx, wind, W, H) {
    if (!wind || wind.speed < 0.2) return;

    // Wind blows FROM wind.angle → streaks move TOWARD angle + PI
    const dir = wind.angle + Math.PI;
    const dx  = Math.cos(dir), dy = Math.sin(dir);
    const px  = -dy, py = dx;   // perpendicular
    const spd = wind.speed;
    const t   = this.t;

    ctx.save();
    ctx.lineCap = 'round';

    // Each wisp: a quadratic Bézier flowing in wind direction with gentle curl
    const count = Math.round(10 + spd * 1.5);

    for (let i = 0; i < count; i++) {
      const seed  = i * 137.508;            // golden-ratio spread
      const phase = (seed % 6.28);

      // Travel offset — each wisp scrolls independently
      const travel = (t * spd * 22 + seed * 2.8) % (W + H + 200);

      // Perpendicular starting position (spread across screen)
      const perpFrac = (seed % 100) / 100;
      const perpOff  = (perpFrac - 0.5) * (W * Math.abs(dy) + H * Math.abs(dx)) * 1.6;

      // World-space start along the "entry edge"
      let sx = -80 * dx + perpOff * px + dx * travel;
      let sy = -80 * dy + perpOff * py + dy * travel;
      // Wrap into screen area with padding
      sx = ((sx % (W + 160)) + W + 160) % (W + 160) - 80;
      sy = ((sy % (H + 160)) + H + 160) % (H + 160) - 80;

      // Wisp length varies, with gentle breathing
      const len  = 18 + (i * 23 % 22) + Math.sin(t * 0.7 + phase) * 4;

      // End point
      const ex = sx + dx * len;
      const ey = sy + dy * len;

      // Control point: slight S-curl perpendicular to flow
      const curl = Math.sin(t * 0.55 + phase) * (5 + spd * 0.8);
      const cx1  = sx + dx * len * 0.35 + px * curl;
      const cy1  = sy + dy * len * 0.35 + py * curl;

      // Alpha: very soft, breathing gently
      const baseAlpha = 0.06 + 0.07 * (spd / 15);
      const alpha = baseAlpha * (0.55 + 0.45 * Math.sin(t * 1.1 + phase));

      // Thin main wisp
      ctx.strokeStyle = `rgba(200,228,255,${alpha.toFixed(3)})`;
      ctx.lineWidth   = 0.5 + (i % 4) * 0.25;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(cx1, cy1, ex, ey);
      ctx.stroke();

      // Faint shadow wisp offset slightly — gives "layered air" feel
      if (i % 3 === 0) {
        const off = 2.5 + (i % 3);
        ctx.strokeStyle = `rgba(180,210,255,${(alpha * 0.45).toFixed(3)})`;
        ctx.lineWidth   = 0.5;
        ctx.beginPath();
        ctx.moveTo(sx + px * off, sy + py * off);
        ctx.quadraticCurveTo(cx1 + px * off, cy1 + py * off, ex + px * off, ey + py * off);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}
