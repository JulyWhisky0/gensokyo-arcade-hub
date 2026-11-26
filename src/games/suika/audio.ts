// Pure procedural Web Audio API sound synthesizer for Gensokyo Suika Merge

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

    const baseFreq = Math.max(200, 390 - tier * 32);
    osc.frequency.setValueAtTime(baseFreq * 1.32, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.68, now + 0.095);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.012);
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

    const vol = Math.min(0.06, Math.max(0.012, intensity * 0.045));
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(175 + Math.random() * 45, now);
    osc.frequency.exponentialRampToValueAtTime(92, now + 0.055);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.065);
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

    // Primary sparkle bell
    this.playBellNote(ac, freq, now, 0.14, 0.26, 'triangle');
    // Upper fifth / sparkle harmonic
    this.playBellNote(ac, freq * 1.5, now + 0.025, 0.065, 0.22, 'sine');

    if (combo >= 2) {
      const bonusFreq = PENTATONIC_HZ[Math.min(PENTATONIC_HZ.length - 1, scaleIndex + 2)];
      this.playBellNote(ac, bonusFreq, now + 0.055, 0.08, 0.25, 'sine');
    }

    // Festive shrine arpeggio on high tiers (Marisa 7, Reimu 8, Yukari 9, Suika 10)
    if (newTier >= 7) {
      const chord =
        newTier >= 10
          ? [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98]
          : [freq * 0.5, freq, freq * 1.25, freq * 1.5];
      chord.forEach((f, idx) => {
        this.playBellNote(ac, f, now + idx * 0.045, 0.075, 0.42, 'sine');
      });
    }
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

    // Gentle shrine gong + descending pentatonic koto notes
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
