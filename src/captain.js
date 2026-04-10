// CaptainWalker — dock character (Captain).
// Walks back and forth on the dock, occasionally shouts nautical phrases.
// Rendered on canvas via Renderer.drawCaptain().

export const CAPTAIN_PHRASES = [
  'КОТИКИ НА ШКОТИКАХ!',
  'ЖИРНЫЙ БЕЙДЕВИНД!',
  'ВЯЛЫЙ ГАЛФИНД!',
  'ПОВОРОТ ОВЕРКИЛЬ!',
  'ЭТО КТО ТАМ ШВАРТУЕТСЯ?!',
  'ЛЕЧЬ В ДРЕЙФ!',
  'ПРАВО РУЛЯ!',
  'БУРЯ! ВСЕ В КУБРИК!',
  'ТРАВИТЕ ШКОТ!',
  'ЭТА ЯХТА НЕ ПОНИ!',
  'УСТРАНИ ДЕВИАЦИЮ!', 
  'ВЕТЕР ЗАШЕЛ!', 
  'Я В ДП!', 
  'АХ ТЫ, КОЛДУНЧИК!',
  'ВОТ ОТКУДА ВЕТЕР ДУЕТ!',
  'ПРОБЛЕМА В ПУЗЕ!',
  'НА ШАГ ВИНТА!',
];

export class CaptainWalker {
  constructor(hasDock) {
    this.type    = 'captain';
    this.active  = hasDock;
    this.xMin    = 5;
    this.xMax    = 75;
    this.y       = 9.8;     // dock centre (dock y1=6, y2=15)
    this.x       = this.xMin + Math.random() * (this.xMax - this.xMin);
    this.vx      = (Math.random() < 0.5 ? 1 : -1) * 1.5; // 1.5 m/s ≈ brisk walking pace
    this.facing  = this.vx > 0 ? 1 : -1;

    // Speech state
    this.phrase    = null;
    this.phraseAge = 0;
    this.phraseDur = 4.5;                      // seconds to display each phrase
    this.nextSpeech = 4 + Math.random() * 12;  // first phrase after 4–16 s
    this._lastIdx  = -1;
  }

  update(dt) {
    if (!this.active) return;

    this.x += this.vx * dt;
    if (this.x <= this.xMin) {
      this.x  = this.xMin;
      this.vx = Math.abs(this.vx);
      this.facing = 1;
    } else if (this.x >= this.xMax) {
      this.x  = this.xMax;
      this.vx = -Math.abs(this.vx);
      this.facing = -1;
    }

    if (this.phrase) {
      this.phraseAge += dt;
      if (this.phraseAge >= this.phraseDur) this.phrase = null;
    }

    this.nextSpeech -= dt;
    if (this.nextSpeech <= 0 && !this.phrase) {
      let idx;
      do { idx = Math.floor(Math.random() * CAPTAIN_PHRASES.length); }
      while (idx === this._lastIdx && CAPTAIN_PHRASES.length > 1);
      this._lastIdx  = idx;
      this.phrase    = CAPTAIN_PHRASES[idx];
      this.phraseAge = 0;
      this.nextSpeech = 10 + Math.random() * 22;
    }
  }
}
