// 8-bit chip audio: 5 tracks on VHF marine radio channels + SFX
// Channel 16 = default (distress/hailing). SEL button cycles channels.

// ─── Track definitions ──────────────────────────────────────────────────────
// Notes as MIDI numbers; 0 = rest.
// All tracks: 32 eighth-notes = 4 bars of 4/4.

const TRACKS = [

  // ── 0  SEA SHANTY "Harbour Hymn" ────────────────────────────────────────
  // Nagging nautical ditty — the original track.
  {
    bpm: 128, oscType: 'square', bassOscType: 'triangle',
    leadGain: 0.11, bassGain: 0.15, noteMult: 0.85,
    lead: [
      69, 72, 74, 76, 77, 76, 74, 72,
      69, 72, 74, 76, 77, 79, 77, 76,
      74, 72, 69, 72, 74, 76, 77, 76,
      74, 72, 74, 76, 77, 79, 81, 79,
    ],
    bass: [
      57, 57, 57, 57, 62, 62, 62, 62,
      57, 57, 57, 57, 64, 64, 64, 64,
      55, 55, 55, 55, 62, 62, 62, 62,
      57, 57, 57, 57, 64, 64, 64, 64,
    ],
    bassEvery: 2, snareGain: 0.07, chirp: true,
  },

  // ── 1  FUNK "Marina Groove" ─────────────────────────────────────────────
  // A Dorian: descending A–G–F#–E–D hook then back up. Think Superstition.
  {
    bpm: 110, oscType: 'square', bassOscType: 'triangle',
    leadGain: 0.11, bassGain: 0.15, noteMult: 0.78,
    lead: [
      69,  0, 67, 66, 64, 62, 64, 66,   // A . G F# E D E F#
      72, 71, 69, 67, 66, 64, 62, 64,   // C  B  A  G F# E D E
      69,  0, 67, 66, 64, 62, 59, 62,   // hook variant — dips to B3
      64, 66, 67, 69, 71, 72, 71, 69,   // ascending flourish to resolution
    ],
    bass: [
      57, 57, 62, 57, 57, 62, 57, 57,
      55, 55, 62, 55, 55, 62, 55, 55,
      57, 57, 62, 57, 57, 62, 57, 57,
      55, 55, 55, 57, 57, 57, 57, 57,
    ],
    bassEvery: 2, snareGain: 0.09, hihat: true,
  },

  // ── 2  JAZZ "Blue Harbour" ──────────────────────────────────────────────
  // D minor ii–V–I–VI changes. Chromatic passing tones give it bebop spice.
  {
    bpm: 120, oscType: 'triangle', bassOscType: 'triangle',
    leadGain: 0.13, bassGain: 0.13, noteMult: 0.88, swing: true,
    lead: [
      62, 65, 69, 72, 70, 69, 67, 65,   // Dm7: D F A C Bb A G F
      67, 66, 65, 64, 62, 61, 60, 62,   // G7:  G F# F E D C# C D (chromatic)
      65, 67, 69, 72, 71, 72, 69, 67,   // Cmaj7: F G A C B C A G
      64, 65, 67, 69, 68, 67, 65, 62,   // A7→Dm: E F G A G# G F D
    ],
    bass: [
      62, 64, 65, 67, 62, 64, 65, 67,   // D walking up
      55, 57, 59, 60, 62, 60, 59, 57,   // G7 walk
      60, 62, 64, 65, 64, 62, 60, 59,   // C walk
      57, 59, 60, 62, 60, 59, 57, 55,   // Am→Dm
    ],
    bassEvery: 1, snareGain: 0.045,
  },

  // ── 3  ROCK "Storm Riff" ────────────────────────────────────────────────
  // E minor power riff. Those G# (68) notes hit like a fist.
  {
    bpm: 145, oscType: 'sawtooth', bassOscType: 'square',
    leadGain: 0.09, bassGain: 0.18, noteMult: 0.70,
    lead: [
      64,  0, 67, 68, 64,  0, 66, 68,   // THE RIFF: E . G G# E . F# G#
      64,  0, 67, 68, 66, 65,  0,  0,   // variant: ends on F natural
      64,  0, 67, 68, 64,  0, 66, 68,   // repeat the riff
      71, 71, 69, 67, 66, 64, 62, 59,   // power descent: B B A G F# E D B
    ],
    bass: [
      40, 40, 40, 40, 40, 40, 47, 40,   // E2 pedal + B2 accent
      40, 40, 40, 40, 40, 40, 47, 40,
      38, 38, 38, 38, 38, 38, 40, 38,   // D2 shift
      40, 40, 40, 40, 40, 40, 40, 47,
    ],
    bassEvery: 1, snareGain: 0.13, kick: true,
  },

  // ── 4  ELECTRONIC "Chip Wave" (bonus) ───────────────────────────────────
  // A minor trance. C–D–E wavelet repeats until your brain melts. Sandstorm vibes.
  {
    bpm: 128, oscType: 'square', bassOscType: 'sawtooth',
    leadGain: 0.10, bassGain: 0.11, noteMult: 0.82,
    lead: [
      72,  0, 72, 74, 72, 71, 72,  0,   // C . C D C B C .  ← the hook
      72, 74, 76, 74, 72, 71, 69, 71,   // wave: C D E D C B A B
      72,  0, 72, 74, 76, 74, 72, 74,   // build: C . C D E D C D
      76,  0, 77,  0, 76, 74, 72, 71,   // peak: E . F . E D C B
    ],
    // Ascending arpeggio: Am → F → C → G
    bass: [
      57, 60, 64, 69, 57, 60, 64, 69,   // Am: A C E A
      53, 57, 60, 65, 53, 57, 60, 65,   // F:  F A C F
      48, 52, 55, 60, 48, 52, 55, 60,   // C:  C E G C
      43, 47, 50, 55, 43, 47, 50, 55,   // G:  G B D G
    ],
    bassEvery: 1, snareGain: 0.04, kick: true,
  },

];

// VHF marine channel → track index mapping (real channel numbers)
const CHANNELS = [
  { ch: 16, track: 0 },   // 16 = calling / distress → Sea Shanty
  { ch:  1, track: 1 },   // 01 = commercial        → Funk
  { ch:  5, track: 2 },   // 05 = port ops          → Jazz
  { ch:  8, track: 3 },   // 08 = commercial        → Rock
  { ch: 72, track: 4 },   // 72 = yacht racing/club → Electronic
];

// Fisher-Yates shuffle
function _shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── ChipAudio class ────────────────────────────────────────────────────────
export class ChipAudio {
  constructor() {
    this.ctx        = null;
    this.master     = null;
    this.musicGain  = null;
    this.sfxGain    = null;
    this.muted      = false;
    this.loopTimer  = null;
    this.musicPlaying = false;
    // Current channel index in CHANNELS array (default = CH 16)
    this._chIdx = 0;
    // Per-session gain node — disconnected on track switch to kill pre-scheduled notes
    this._sessionGain = null;
    // Continuous sound nodes
    this._engineOsc    = null;
    this._engineGain   = null;
    this._thrusterGain = null;
    this._thrusterOsc1 = null;
    this._thrusterOsc2 = null;
  }

  ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 1.0;
    this.master.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.72;   // 75% of max 0.96 ≈ default
    this.musicGain.connect(this.master);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 1.0;
    this.sfxGain.connect(this.master);
  }

  // v = 0..100 percent
  setMusicVolume(v) {
    if (this.musicGain) this.musicGain.gain.value = (v / 100) * 0.96;
  }
  setSfxVolume(v) {
    if (this.sfxGain) this.sfxGain.gain.value = v / 100;
  }

  async resume() {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch (e) {}
    }
  }

  setMuted(on) {
    this.muted = on;
    if (this.master) this.master.gain.value = on ? 0 : 1.0;
  }

  // Play the track for the current channel (CH 16 by default).
  startMusic() {
    this.ensure();
    if (!this.ctx) return;
    this._startChannel(this._chIdx);
  }

  // Advance to next channel and play it. Returns the new channel number.
  nextChannel() {
    this.ensure();
    if (!this.ctx) return CHANNELS[this._chIdx].ch;
    this._chIdx = (this._chIdx + 1) % CHANNELS.length;
    this._startChannel(this._chIdx);
    return CHANNELS[this._chIdx].ch;
  }

  // Play a specific channel index (internal).
  _startChannel(idx) {
    this.stopMusic();   // disconnects old _sessionGain, killing all pre-scheduled notes
    this.musicPlaying = true;
    // Fresh session gain node — all new notes route through this
    this._sessionGain = this.ctx.createGain();
    this._sessionGain.gain.value = 1.0;  // volume controlled by musicGain
    this._sessionGain.connect(this.musicGain);
    this._playTrack(CHANNELS[idx].track);
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.loopTimer) { clearInterval(this.loopTimer); this.loopTimer = null; }
    // Physically sever the audio graph — pre-scheduled oscillators can no longer produce sound
    if (this._sessionGain) {
      this._sessionGain.disconnect();
      this._sessionGain = null;
    }
  }

  get currentChannel() { return CHANNELS[this._chIdx].ch; }

  // ── internal: schedule one full loop of track n ──────────────────────────
  _playTrack(n) {
    const tr = TRACKS[n];
    if (!tr || !this.ctx) return;

    const beat    = 60 / tr.bpm;
    const noteDur = beat * 0.5;           // eighth-note duration
    const loopDur = noteDur * tr.lead.length;
    const bars    = tr.lead.length / 8;   // 32 notes / 8 = 4 bars

    const scheduleLoop = (t0) => {
      const { lead, bass } = tr;

      for (let i = 0; i < lead.length; i++) {
        // Swing timing for jazz: delay off-beats by ~17% of a beat
        const swOff = (tr.swing && i % 2 === 1) ? noteDur * 0.18 : 0;
        const t = t0 + i * noteDur + swOff;

        // Lead melody
        if (lead[i] > 0) {
          this._scheduleNote(tr.oscType, lead[i], t,
            noteDur * tr.noteMult, tr.leadGain);
        }

        // Bass / arpeggio
        const doBass = tr.bassEvery === 1 || i % tr.bassEvery === 0;
        if (doBass && bass[i] > 0) {
          const bDur = tr.bassEvery === 1 ? noteDur * 0.88 : noteDur * 1.5;
          this._scheduleNote(tr.bassOscType, bass[i], t, bDur, tr.bassGain);
        }

        // Funk hi-hat: tight noise tick on every eighth-note
        if (tr.hihat) {
          this._scheduleNoise(t, 0.035, 0.025);
        }
      }

      // Percussion grid
      for (let b = 0; b < bars * 4; b++) {
        const bt        = t0 + b * beat;
        const beatInBar = b % 4;

        // Snare on beats 2 & 4
        if (beatInBar === 1 || beatInBar === 3) {
          this._scheduleNoise(bt, 0.09, tr.snareGain);
        }

        // Kick drum (rock & electronic)
        if (tr.kick) {
          if (beatInBar === 0 || beatInBar === 2) {
            this._scheduleKick(bt);
          }
          // Electronic 4-on-the-floor: kick every beat
          if (n === 4 && (beatInBar === 1 || beatInBar === 3)) {
            this._scheduleKick(bt);
          }
        }
      }

      // Shanty's annoying chirp accent
      if (tr.chirp) {
        for (let b = 0; b < bars * 4; b++) {
          this._scheduleNote('square', 96,
            t0 + b * beat + beat * 0.5, 0.05, 0.05);
        }
      }
    };

    let next = this.ctx.currentTime + 0.08;
    scheduleLoop(next);
    this.loopTimer = setInterval(() => {
      if (!this.musicPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;
      while (next - now < loopDur) {
        next += loopDur;
        scheduleLoop(next);
      }
    }, 400);
  }

  // ── low-level helpers ────────────────────────────────────────────────────
  _scheduleNote(type, midi, when, dur, gain) {
    if (!this.ctx) return;
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const osc  = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(gain, when + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.connect(g).connect(this._sessionGain);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  }

  // dest — optional override; defaults to _sessionGain (music bus) for percussion
  _scheduleNoise(when, dur, gain, dest) {
    if (!this.ctx) return;
    const bufSize = Math.floor(this.ctx.sampleRate * dur);
    const buf     = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const d       = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(g).connect(dest || this._sessionGain);
    src.start(when);
  }

  // Sine-sweep kick drum: 120 Hz → 40 Hz drop
  _scheduleKick(when) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, when);
    osc.frequency.exponentialRampToValueAtTime(40, when + 0.13);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.22, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.16);
    osc.connect(g).connect(this._sessionGain);
    osc.start(when);
    osc.stop(when + 0.18);
  }

  // ── SFX ─────────────────────────────────────────────────────────────────
  engine(level) {
    this.ensure();
    if (!this.ctx) return;
    if (!this._engineOsc) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 60;
      const g  = this.ctx.createGain();
      g.gain.value = 0;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'lowpass';
      bp.frequency.value = 140;
      osc.connect(bp).connect(g).connect(this.sfxGain);
      osc.start();
      this._engineOsc  = osc;
      this._engineGain = g;
    }
    const l = Math.abs(level);
    this._engineGain.gain.setTargetAtTime(l * 0.18, this.ctx.currentTime, 0.2);
    this._engineOsc.frequency.setTargetAtTime(
      50 + l * 90 + (level > 0 ? 15 : 0), this.ctx.currentTime, 0.25);
  }

  // Mechanical lever detent click (gear engagement)
  gearClick() {
    this.ensure();
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    // Short descending tone — metal-on-metal click
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(210, t0);
    osc.frequency.exponentialRampToValueAtTime(75, t0 + 0.06);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.18, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.07);
    osc.connect(g).connect(this.sfxGain);
    osc.start(t0); osc.stop(t0 + 0.08);
    // Noise texture for the mechanical "thunk"
    this._scheduleNoise(t0, 0.05, 0.14, this.sfxGain);
  }

  bump() {
    this.ensure();
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    this._scheduleNoise(t0, 0.18, 0.45, this.sfxGain);
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(180, t0);
    osc.frequency.exponentialRampToValueAtTime(40, t0 + 0.18);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.25, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);
    osc.connect(g).connect(this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + 0.22);
  }

  seagull() {
    this.ensure();
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc   = this.ctx.createOscillator();
      osc.type    = 'square';
      const start = t0 + i * 0.09;
      osc.frequency.setValueAtTime(1800 + i * 180, start);
      osc.frequency.exponentialRampToValueAtTime(700, start + 0.1);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.16, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.11);
      osc.connect(g).connect(this.sfxGain);
      osc.start(start);
      osc.stop(start + 0.13);
    }
  }

  // Bow thruster — electric motor buzz, distinct from diesel engine
  // Real thrusters: high-pitched electric whine ~200-300Hz + harmonic, instant response
  thruster(amount) {
    this.ensure();
    if (!this.ctx) return;
    if (!this._thrusterGain) {
      // Layer 1: electric motor fundamental — square wave buzz ~240Hz
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'square';
      osc1.frequency.value = 240;
      const g1 = this.ctx.createGain();
      g1.gain.value = 0.55;

      // Layer 2: 3rd harmonic whine — triangle at 720Hz (gives that electric whirr)
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = 720;
      const g2 = this.ctx.createGain();
      g2.gain.value = 0.45;

      // Bandpass: cuts below 150Hz and above 1kHz — no bass overlap with engine
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 380;
      bp.Q.value = 0.6;

      const master = this.ctx.createGain();
      master.gain.value = 0;

      osc1.connect(g1).connect(bp);
      osc2.connect(g2).connect(bp);
      bp.connect(master).connect(this.sfxGain);

      osc1.start(); osc2.start();
      this._thrusterGain = master;
      this._thrusterOsc1 = osc1;
      this._thrusterOsc2 = osc2;
    }
    const abs = Math.abs(amount);
    // Electric motors: near-instant response (tau = 0.04s)
    this._thrusterGain.gain.setTargetAtTime(abs * 0.20, this.ctx.currentTime, 0.04);
    // Slight load pitch sag under load (opposite direction = same pitch)
    const f = 230 + abs * 30;
    this._thrusterOsc1.frequency.setTargetAtTime(f,     this.ctx.currentTime, 0.06);
    this._thrusterOsc2.frequency.setTargetAtTime(f * 3, this.ctx.currentTime, 0.06);
  }

  // Wind gust ambient — filtered white noise, fades in only during gusts.
  // gustMult = 1.0 → silent; 2.0 → full volume.
  windAmbient(speedMs, gustMult = 1.0) {
    this.ensure();
    if (!this.ctx) return;

    if (!this._windGain) {
      // 4-second white noise buffer (long enough to mask loop click after filtering)
      const sr  = this.ctx.sampleRate;
      const buf = this.ctx.createBuffer(1, sr * 4, sr);
      const d   = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

      this._windSrc = this.ctx.createBufferSource();
      this._windSrc.buffer = buf;
      this._windSrc.loop   = true;

      // Bandpass centres at ~300 Hz — "whoosh" frequency band
      this._windBp = this.ctx.createBiquadFilter();
      this._windBp.type            = 'bandpass';
      this._windBp.frequency.value = 300;
      this._windBp.Q.value         = 0.7;

      // Second highpass to remove sub-bass mud
      const hp = this.ctx.createBiquadFilter();
      hp.type            = 'highpass';
      hp.frequency.value = 120;

      this._windGain = this.ctx.createGain();
      this._windGain.gain.value = 0;

      this._windSrc.connect(hp).connect(this._windBp)
                   .connect(this._windGain).connect(this.sfxGain);
      this._windSrc.start();
    }

    const kn   = speedMs / 0.5144;
    // Volume: 0 when no gust (gustMult=1.0), rises linearly to 0.30 at gustMult=2.0
    const gustFactor = Math.max(0, gustMult - 1.0);      // 0…1
    const vol  = gustFactor * 0.30;
    // Pitch: higher in stronger wind — but only audible during gusts
    const freq = 200 + kn * 10;                           // 200 Hz base → 500 Hz at 30 kn

    const t = this.ctx.currentTime;
    // Fade-in fast (tau 0.8s), fade-out slow (tau 2.5s) — gust lingers in the ears
    const tau = gustFactor > 0 ? 0.8 : 2.5;
    this._windGain.gain.setTargetAtTime(vol, t, tau);
    this._windBp.frequency.setTargetAtTime(freq, t, 0.8);
  }

  // "Pff" — played when the player tries to fire a bow thruster that is not installed
  pff() {
    this.ensure();
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const sr  = this.ctx.sampleRate;
    // Short noise buffer (0.25 s)
    const buf = this.ctx.createBuffer(1, Math.floor(sr * 0.25), sr);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    // Lowpass at ~350 Hz — dull air puff, not a whistle
    const lp = this.ctx.createBiquadFilter();
    lp.type            = 'lowpass';
    lp.frequency.value = 350;
    lp.Q.value         = 0.8;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.45, t0);
    // Fast decay — sounds like a burst of air escaping
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.22);

    src.connect(lp).connect(g).connect(this.sfxGain);
    src.start(t0);
    src.stop(t0 + 0.25);
  }

  moored() {
    this.ensure();
    if (!this.ctx) return;
    const t0    = this.ctx.currentTime;
    const notes = [72, 76, 79, 84];
    notes.forEach((n, i) => {
      const osc = this.ctx.createOscillator();
      osc.type  = 'square';
      osc.frequency.value = 440 * Math.pow(2, (n - 69) / 12);
      const g = this.ctx.createGain();
      const t = t0 + i * 0.1;
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(g).connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }
}
