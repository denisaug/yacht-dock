// TimWalker — second dock character (Tim).
// Walks back and forth, periodically raises hands and "draws in the air",
// delivers funny one-liners about AI and get-rich-quick urgency.

export const TIM_PHRASES = [
  // About AI and docking
  'ПОСТАВЬ КЛОД И ШВАРТУЙ!',
  'ВАНШОТ!\nВ ВАНШОТ ЗАЙДЁМ!',
  'ЧЕМ МУЧАЕШЬСЯ?!\nКОЛОД ВСЁ СДЕЛАЕТ!',
  'КЛОД ЗАШВАРТУЕТ\nЗА СЕКУНДУ!',
  'КЛОД! КЛОД!\nЗАШВАРТУЙ ЕГО!',
  'ONE SHOT КЭП!\nОДИН ПРОМПТ!',
  'РЕАЛЬНОСТЬ - ЭТО ПРОСТО ПРОМПТ!',
  'АГЕНТ!\nАГЕНТ ЗАШВАРТУЕТ!',
  'У МЕНЯ ИДЕЯ!\nМЫ БОГАТЕЕМ!',
  'НАДО СПЕШИТЬ!\nРЫНОК НЕ ЖДЁТ!',
  'ИНВЕСТОРЫ ЖДУТ!\nШВАРТУЙ БЫСТРЕЙ!',
  'НЕЙРОНКА ЗНАЕТ\nГДЕ ВЕТЕР!',
  'ЭТО АГЕНТ!\nАГЕНТ ВСЕМ РУЛИТ!',
  'ДИФФУЗИЯ!\nМОДЕЛЬ ДИФФУЗИИ\nВОЛН!',
  'ЭТО НЕ ЯКОРЬ —\nЭТО EMBEDDING!',
  'ГАЛС — ЭТО ПРОСТО\nFORWARD PASS!',
  'ШОТ ПРОМПТ!\nОДИН ШОТ — ПОРТ!',
  'ТРАНСФОРМЕР\nЧИТАЕТ КАРТУ!',
  'БЕЙДЕВИНД —\nЭТО LAG ТОКЕН!',
  'ФАЙНТЮНИМ\nАВТОПИЛОТ!!',
  'НОВЫЙ КЛОД ВЫЙДЕТ —\nСАМ ЗАШВАРТУЕТ!',
  'КУДA ТЫ РУЛИШЬ?!\nОРКЕСТРУЙ АГЕНТАМИ!',
];

export class TimWalker {
  constructor(hasDock) {
    this.type    = 'tim';
    this.active  = hasDock;
    this.xMin    = 5;
    this.xMax    = 75;
    this.y       = 9.8;
    this.x       = this.xMin + Math.random() * (this.xMax - this.xMin);
    this.vx      = (Math.random() < 0.5 ? 1 : -1) * 1.8;
    this.facing  = this.vx > 0 ? 1 : -1;

    // Speech state
    this.phrase    = null;
    this.phraseAge = 0;
    this.phraseDur = 4.0;
    this.nextSpeech = 2 + Math.random() * 8;
    this._lastIdx  = -1;

    // "Drawing in the air" animation state
    this.airDraw     = false;   // arms currently raised?
    this.airDrawAge  = 0;
    this.airDrawDur  = 2.2;     // seconds arms stay raised
    this.nextAirDraw = 5 + Math.random() * 10;
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

    // Speech tick
    if (this.phrase) {
      this.phraseAge += dt;
      if (this.phraseAge >= this.phraseDur) this.phrase = null;
    }
    this.nextSpeech -= dt;
    if (this.nextSpeech <= 0 && !this.phrase) {
      let idx;
      do { idx = Math.floor(Math.random() * TIM_PHRASES.length); }
      while (idx === this._lastIdx && TIM_PHRASES.length > 1);
      this._lastIdx  = idx;
      this.phrase    = TIM_PHRASES[idx];
      this.phraseAge = 0;
      this.nextSpeech = 8 + Math.random() * 15;
    }

    // Arms-up animation tick
    if (this.airDraw) {
      this.airDrawAge += dt;
      if (this.airDrawAge >= this.airDrawDur) this.airDraw = false;
    }
    this.nextAirDraw -= dt;
    if (this.nextAirDraw <= 0 && !this.airDraw) {
      this.airDraw    = true;
      this.airDrawAge = 0;
      this.nextAirDraw = 6 + Math.random() * 12;
    }
  }
}
