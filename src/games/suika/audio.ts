// Pure procedural Web Audio API sound synthesizer for Gensokyo Fumo Fruit Suika

// Japanese Yo / major pentatonic scale frequencies (C5 to C7)
const PENTATONIC_HZ = [
  523.25, // C5
  587.33, // D5
  659.25, // E5
  783.99, // G5
  880.00, // A5
  1046.50, // C6
  1174.66, // D6
  1318.51, // E6
  1567.98, // G6
  1760.00, // A6
  2093.00, // C7
];

export class SuikaAudio {
  private ctx: AudioContext | null = null;
  private muted: boolean;
  private lastBounceAt = 0;
  private destroyed = false;

  constructor(initialMuted: boolean) {
    this.muted = initialMuted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  /** Lazily initialize and resume AudioContext on first user gesture. */
  unlock(): void {
    if (this.destroyed || this.muted) return;
    const ac = this.ensureContext();
    if (ac && ac.state === 'suspended') {
      void ac.resume().catch(() => {});
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.destroyed || this.muted) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playDrop(tier: number): void {
    const ac = this.ensureContext();
    if (!ac) return;
    const now = ac.currentTime;

    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';

    const baseFreq = Math.max(210, 395 - tier * 30);
    osc.frequency.setValueAtTime(baseFreq * 1.28, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, now + 0.095);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.13, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playBounce(intensity: number): void {
    const ac = this.ensureContext();
    if (!ac) return;
    const nowMs = performance.now();
    if (nowMs - this.lastBounceAt < 65) return;
    this.lastBounceAt = nowMs;

    // Soft velvety plushie thump!
    const vol = Math.min(0.06, Math.max(0.012, intensity * 0.045));
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(160 + Math.random() * 40, now);
    osc.frequency.exponentialRampToValueAtTime(84, now + 0.055);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.062);

    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.068);
  }

  playMerge(newTier: number, combo: number): void {
    const ac = this.ensureContext();
    if (!ac) return;
    const now = ac.currentTime;

    const scaleIndex = Math.min(
      PENTATONIC_HZ.length - 1,
      Math.max(0, newTier - 1 + Math.min(3, combo - 1))
    );
    const freq = PENTATONIC_HZ[scaleIndex];

    this.playBellNote(ac, freq, now, 0.13, 0.26, 'triangle');
    this.playBellNote(ac, freq * 1.5, now + 0.025, 0.06, 0.22, 'sine');

    if (combo >= 2) {
      const bonusFreq = PENTATONIC_HZ[Math.min(PENTATONIC_HZ.length - 1, scaleIndex + 2)];
      this.playBellNote(ac, bonusFreq, now + 0.055, 0.075, 0.25, 'sine');
    }

    if (newTier >= 8) {
      const chord =
        newTier >= 10
          ? [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98]
          : [freq * 0.5, freq, freq * 1.25, freq * 1.5];
      chord.forEach((f, idx) => {
        this.playBellNote(ac, f, now + idx * 0.045, 0.072, 0.42, 'sine');
      });
    }
  }

  playSpellReady(): void {
    const ac = this.ensureContext();
    if (!ac) return;
    const now = ac.currentTime;
    this.playBellNote(ac, 880, now, 0.07, 0.18, 'sine');
    this.playBellNote(ac, 1318.51, now + 0.055, 0.085, 0.28, 'triangle');
  }

  /** Reimu: 灵符「梦想封印」 launch */
  playReimuOfuda(): void {
    const ac = this.ensureContext();
    if (!ac) return;
    const now = ac.currentTime;
    [659.25, 880, 1174.66, 1567.98].forEach((f, i) => {
      this.playBellNote(ac, f, now + i * 0.032, 0.08, 0.24, 'triangle');
    });
  }

  /** Reimu ofuda impact seal pop */
  playOfudaHit(): void {
    const ac = this.ensureContext();
    if (!ac) return;
    const now = ac.currentTime;
    this.playBellNote(ac, 1046.5, now, 0.1, 0.2, 'triangle');
    this.playBellNote(ac, 1567.98, now + 0.02, 0.065, 0.22, 'sine');
  }

  /** Sakuya: 幻世「The World」 dramatic clock-stop bass sweep & chime */
  playTimeStopStart(): void {
    const ac = this.ensureContext();
    if (!ac) return;
    const now = ac.currentTime;

    // Deep time-freeze pitch drop
    const bass = ac.createOscillator();
    const bassGain = ac.createGain();
    bass.type = 'sawtooth';
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(140, now + 0.42);

    bass.frequency.setValueAtTime(340, now);
    bass.frequency.exponentialRampToValueAtTime(52, now + 0.45);
    bassGain.gain.setValueAtTime(0.0001, now);
    bassGain.gain.linearRampToValueAtTime(0.13, now + 0.025);
    bassGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);

    bass.connect(filter);
    filter.connect(bassGain);
    bassGain.connect(ac.destination);
    bass.start(now);
    bass.stop(now + 0.5);

    // Metallic pocket-watch chime
    this.playBellNote(ac, 1567.98, now, 0.09, 0.35, 'sine');
    this.playBellNote(ac, 2093.0, now + 0.04, 0.055, 0.28, 'sine');
  }

  playTimeStopTick(): void {
    const ac = this.ensureContext();
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1680, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.03);
    gain.gain.setValueAtTime(0.048, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  playTimeStopResume(): void {
    const ac = this.ensureContext();
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.16);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.24);
    this.playBellNote(ac, 1318.51, now + 0.06, 0.08, 0.3, 'triangle');
  }

  /** Yukari: 境符「隙间穿梭」 & Gap Hold ethereal warp */
  playGapSwap(): void {
    const ac = this.ensureContext();
    if (!ac) return;
    const now = ac.currentTime;
    [440, 587.33, 880, 1174.66].forEach((f, i) => {
      this.playBellNote(ac, f, now + i * 0.035, 0.075, 0.32, 'sine');
    });
    // Ethereal pitch bend shimmer
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(740, now);
    osc.frequency.exponentialRampToValueAtTime(370, now + 0.14);
    osc.frequency.exponentialRampToValueAtTime(987.77, now + 0.28);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.34);
  }

  playGapHold(): void {
    const ac = this.ensureContext();
    if (!ac) return;
    const now = ac.currentTime;
    this.playBellNote(ac, 587.33, now, 0.07, 0.16, 'sine');
    this.playBellNote(ac, 880, now + 0.04, 0.07, 0.2, 'triangle');
  }

  /** Suika: 鬼符「密与疏」 playful sake drum + shrink bounce */
  playSuikaSpell(): void {
    const ac = this.ensureContext();
    if (!ac) return;
    const now = ac.currentTime;

    // Oni taiko thump
    const drum = ac.createOscillator();
    const drumGain = ac.createGain();
    drum.type = 'sine';
    drum.frequency.setValueAtTime(175, now);
    drum.frequency.exponentialRampToValueAtTime(58, now + 0.24);
    drumGain.gain.setValueAtTime(0.18, now);
    drumGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    drum.connect(drumGain);
    drumGain.connect(ac.destination);
    drum.start(now);
    drum.stop(now + 0.3);

    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      this.playBellNote(ac, f, now + 0.03 + i * 0.04, 0.07, 0.26, 'triangle');
    });
  }

  /** Deathbomb 「决死结界」: dramatic Touhou barrier rescue blast! */
  playDeathbomb(): void {
    const ac = this.ensureContext();
    if (!ac) return;
    const now = ac.currentTime;

    // Dramatic ascending energy surge
    const sweep = ac.createOscillator();
    const sweepGain = ac.createGain();
    sweep.type = 'sawtooth';
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 0.24);
    sweep.frequency.setValueAtTime(260, now);
    sweep.frequency.exponentialRampToValueAtTime(1046.5, now + 0.26);
    sweepGain.gain.setValueAtTime(0.0001, now);
    sweepGain.gain.linearRampToValueAtTime(0.12, now + 0.03);
    sweepGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
    sweep.connect(filter);
    filter.connect(sweepGain);
    sweepGain.connect(ac.destination);
    sweep.start(now);
    sweep.stop(now + 0.36);

    // Shrine barrier resonant chord
    [523.25, 783.99, 1046.5, 1318.51, 1567.98].forEach((f, i) => {
      this.playBellNote(ac, f, now + 0.04 + i * 0.035, 0.09, 0.48, 'triangle');
    });
  }

  /** Hyakki Yagyo Fever fanfare */
  playFeverStart(): void {
    const ac = this.ensureContext();
    if (!ac) return;
    const now = ac.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093.0];
    notes.forEach((f, i) => {
      this.playBellNote(ac, f, now + i * 0.05, 0.085, 0.45, i % 2 === 0 ? 'triangle' : 'sine');
    });
  }

  playSuikaCelebration(): void {
    const ac = this.ensureContext();
    if (!ac) return;
    const now = ac.currentTime;
    const fanfare = [523.25, 659.25, 783.99, 1046.5, 1174.66, 1318.51, 1567.98, 2093.0];
    fanfare.forEach((f, i) => {
      this.playBellNote(ac, f, now + i * 0.055, 0.095, 0.55, i % 2 === 0 ? 'triangle' : 'sine');
    });
  }

  playDangerTick(urgency: number): void {
    const ac = this.ensureContext();
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    const f = 540 + urgency * 240;
    osc.frequency.setValueAtTime(f, now);
    osc.frequency.exponentialRampToValueAtTime(f * 0.85, now + 0.07);
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playGameOver(): void {
    const ac = this.ensureContext();
    if (!ac) return;
    const now = ac.currentTime;

    const gong = ac.createOscillator();
    const gongGain = ac.createGain();
    gong.type = 'sine';
    gong.frequency.setValueAtTime(196, now);
    gong.frequency.exponentialRampToValueAtTime(164.81, now + 0.9);
    gongGain.gain.setValueAtTime(0.0001, now);
    gongGain.gain.linearRampToValueAtTime(0.16, now + 0.03);
    gongGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);
    gong.connect(gongGain);
    gongGain.connect(ac.destination);
    gong.start(now);
    gong.stop(now + 1.1);

    const descend = [659.25, 587.33, 523.25, 392.0];
    descend.forEach((f, i) => {
      this.playBellNote(ac, f, now + 0.08 + i * 0.11, 0.07, 0.45, 'triangle');
    });
  }

  private playBellNote(
    ac: AudioContext,
    freq: number,
    startTime: number,
    peakGain: number,
    duration: number,
    type: OscillatorType
  ): void {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  destroy(): void {
    this.destroyed = true;
    if (this.ctx) {
      const c = this.ctx;
      this.ctx = null;
      void c.close().catch(() => {});
    }
  }
}
