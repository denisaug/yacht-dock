// Chaos layer: seagull flyby (every ~15s), poop on monitor (on non-game tap/click)
// Self-contained — attaches to #seagull-layer and #poop-layer divs.

const PHRASES = [
  'КАР-Р!',
  'ВАХТА!',
  'ШВАРТУЙСЯ!',
  'ГАЛЬЮН!',
  'СВИСТАТЬ ВСЕХ НАВЕРХ!',
  'ШКОТ ТРАВИ!',
  'АВРАЛ!',
  'ЛЕВО РУЛЯ!',
  'ПОЛУНДРА!',
  'АКУЛА!!!',
  'СВАЛИ С ФАРВАТЕРА!',
  'САЛАГА!',
  'ПЕЧЕНЬЕ!',
  'РОМ КОНЧИЛСЯ!',
  'ВИНТ НА ЧИСТОЙ ВОДЕ?',
  'ПРИНЕСИ СЕЛЁДКУ!',
  'ТЫ КТО ВООБЩЕ?!',
  'БЛИН, ОПЯТЬ ЭТОТ!',
  'ДА НУ НА ФИГ!',
  'ЙО-ХО-ХО!',
  'ТАК ДЕРЖАТЬ!',
  'ЭЙ, ТИХО ТАМ!',
  'ГДЕ МОЯ РЫБА?!',
  'ОПА, ПРИЧАЛИЛ!',
  'ШТИЛЬ, БРАТАН!',
];

// SVG sprite for seagull (tiny, pixel art)
const SEAGULL_SVG = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 12' shape-rendering='crispEdges'>
  <rect width='16' height='12' fill='none'/>
  <!-- body -->
  <rect x='6' y='5' width='4' height='3' fill='#f8f8f8'/>
  <rect x='7' y='4' width='2' height='1' fill='#f8f8f8'/>
  <!-- head -->
  <rect x='9' y='4' width='2' height='2' fill='#f8f8f8'/>
  <rect x='11' y='5' width='1' height='1' fill='#ffd23f'/>
  <rect x='10' y='5' width='1' height='1' fill='#050814'/>
  <!-- wings (frame 1) -->
  <rect x='3' y='3' width='3' height='1' fill='#f8f8f8'/>
  <rect x='10' y='3' width='3' height='1' fill='#f8f8f8'/>
  <rect x='5' y='4' width='1' height='1' fill='#e0e0e0'/>
  <rect x='10' y='4' width='1' height='1' fill='#e0e0e0'/>
</svg>`;

const SEAGULL_URL = 'data:image/svg+xml;utf8,' + encodeURIComponent(SEAGULL_SVG);

export class SeagullLayer {
  constructor(layerEl, poopEl, audio) {
    this.layer = layerEl;
    this.poopLayer = poopEl;
    this.audio = audio;
    this.nextAt = performance.now() + 3000; // first one soon
    this.running = true;
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  _loop(t) {
    if (!this.running) return;
    if (t >= this.nextAt) {
      this.spawn();
      this.nextAt = t + 15000 + Math.random() * 4000;
    }
    requestAnimationFrame(this._loop);
  }

  spawn() {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const top = 40 + Math.random() * (window.innerHeight - 220);
    const el = document.createElement('div');
    el.className = 'seagull';
    el.style.top = top + 'px';
    el.style.left = dir > 0 ? '-160px' : (window.innerWidth + 40) + 'px';

    const img = document.createElement('img');
    img.src = SEAGULL_URL;
    img.className = 'seagull-sprite';
    img.style.transform = dir < 0 ? 'scaleX(-1)' : '';
    el.appendChild(img);

    const callout = document.createElement('div');
    callout.className = 'seagull-callout';
    const phrase = PHRASES[Math.floor(Math.random() * PHRASES.length)];
    callout.textContent = phrase;
    if (dir < 0) {
      // Mirror callout to the other side so it doesn't fly offscreen
      callout.style.order = '-1';
      callout.style.boxShadow = '-3px 3px 0 #ff3b3b';
    }
    el.appendChild(callout);

    this.layer.appendChild(el);
    if (this.audio) this.audio.seagull();

    const duration = 10000 + Math.random() * 4000;  // 10–14 s (slower than earlier 5–7 s)
    const start = performance.now();
    const startX = dir > 0 ? -160 : window.innerWidth + 40;
    const endX   = dir > 0 ? window.innerWidth + 40 : -220;

    // Fade-in callout
    callout.style.opacity = '0';
    callout.style.transition = 'opacity 0.5s';
    setTimeout(() => { callout.style.opacity = '1'; }, 300);

    // Track current position so poop drops exactly from the bird's location
    let _curX = startX, _curDy = 0;

    const animate = (now) => {
      const k = Math.min(1, (now - start) / duration);
      _curX = startX + (endX - startX) * k;
      _curDy = Math.sin(k * Math.PI * 6) * 8;
      el.style.left = _curX + 'px';
      el.style.transform = `translateY(${_curDy}px)`;
      if (k < 1) requestAnimationFrame(animate);
      else el.remove();
    };
    requestAnimationFrame(animate);

    // Seagull drops 1–2 poops, precisely from its current position
    const poopCount = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < poopCount; i++) {
      const t = duration * (0.25 + Math.random() * 0.5);
      setTimeout(() => {
        this.poop(_curX + 16, top + _curDy + 24);
      }, t);
    }
  }

  poop(x, y) {
    const el = document.createElement('div');
    el.className = 'poop';
    el.style.left = x + 'px';
    el.style.top  = y + 'px';
    this.poopLayer.appendChild(el);
    setTimeout(() => el.remove(), 9000);
  }
}
