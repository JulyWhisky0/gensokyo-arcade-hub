import type { CharacterId } from './types';

export class FlappyAudio {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted: boolean;
  private unsubscribeMute: (() => void) | null = null;
  private destroyed = false;

  constructor(
    isMuted: () => boolean,
    onMuteChange: (cb: (muted: boolean) => void) => () => void,
  ) {
    this.muted = isMuted();
    this.unsubscribeMute = onMuteChange((m) => {
      this.muted = m;
    });
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

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const length = Math.floor(ctx.sampleRate * 0.35);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  public playFlap(character: CharacterId): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Airy wing swoosh (bandpass-filtered noise sweep)
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(1.8, now);
    const startFreq = character === 'cirno' ? 1400 : character === 'reimu' ? 950 : 720;
    const endFreq = character === 'cirno' ? 3200 : character === 'reimu' ? 2100 : 1900;
    filter.frequency.setValueAtTime(startFreq, now);
    filter.frequency.exponentialRampToValueAtTime(endFreq, now + 0.085);
    filter.frequency.exponentialRampToValueAtTime(480, now + 0.14);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.linearRampToValueAtTime(0.14, now + 0.025);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.145);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.16);

    // 2. Soft character pitch puff
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    if (character === 'cirno') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(980, now + 0.08);
      oscGain.gain.setValueAtTime(0.001, now);
      oscGain.gain.linearRampToValueAtTime(0.055, now + 0.015);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
    } else if (character === 'reimu') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.09);
      oscGain.gain.setValueAtTime(0.001, now);
      oscGain.gain.linearRampToValueAtTime(0.065, now + 0.018);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    } else {
      // Aya: crisp tengu wind lift
      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.095);
      oscGain.gain.setValueAtTime(0.001, now);
      oscGain.gain.linearRampToValueAtTime(0.075, now + 0.02);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    }

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playScore(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Crisp shrine-bell pass chime (pentatonic two-note suzu chime: E6 -> B6)
    const notes = [
      { freq: 1318.5, delay: 0, dur: 0.14, peak: 0.085 },
      { freq: 1975.5, delay: 0.055, dur: 0.22, peak: 0.075 },
    ];

    for (const n of notes) {
      const osc = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const gain = ctx.createGain();
      const overGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.freq, now + n.delay);

      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(n.freq * 2.01, now + n.delay);

      gain.gain.setValueAtTime(0.001, now + n.delay);
      gain.gain.linearRampToValueAtTime(n.peak, now + n.delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + n.delay + n.dur);

      overGain.gain.setValueAtTime(0.001, now + n.delay);
      overGain.gain.linearRampToValueAtTime(n.peak * 0.28, now + n.delay + 0.008);
      overGain.gain.exponentialRampToValueAtTime(0.0008, now + n.delay + n.dur * 0.65);

      osc.connect(gain);
      overtone.connect(overGain);
      gain.connect(ctx.destination);
      overGain.connect(ctx.destination);

      osc.start(now + n.delay);
      overtone.start(now + n.delay);
      osc.stop(now + n.delay + n.dur + 0.02);
      overtone.stop(now + n.delay + n.dur + 0.02);
    }
  }

  public playStar(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Touhou sparkle chime (bright pentatonic arpeggio)
    const freqs = [1046.5, 1318.5, 1568.0, 2093.0];
    freqs.forEach((freq, idx) => {
      const start = now + idx * 0.042;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.015, start + 0.16);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.078, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0008, start + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.22);
    });
  }

  public playCrash(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Punchy impact thud
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.type = 'triangle';
    thudOsc.frequency.setValueAtTime(175, now);
    thudOsc.frequency.exponentialRampToValueAtTime(42, now + 0.18);

    thudGain.gain.setValueAtTime(0.24, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    thudOsc.connect(thudGain);
    thudGain.connect(ctx.destination);
    thudOsc.start(now);
    thudOsc.stop(now + 0.22);

    // 2. Crisp impact smack noise burst
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(1400, now);
    lpf.frequency.exponentialRampToValueAtTime(220, now + 0.14);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.18, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noise.connect(lpf);
    lpf.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.16);

    // 3. Comical dizzy descending warble (classic Touhou pichuun-meets-arcade bonk!)
    const dizzyOsc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const dizzyGain = ctx.createGain();

    const dizzyStart = now + 0.08;
    dizzyOsc.type = 'sine';
    dizzyOsc.frequency.setValueAtTime(660, dizzyStart);
    dizzyOsc.frequency.exponentialRampToValueAtTime(210, dizzyStart + 0.42);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(18, dizzyStart);
    lfoGain.gain.setValueAtTime(48, dizzyStart);

    lfo.connect(lfoGain);
    lfoGain.connect(dizzyOsc.frequency);

    dizzyGain.gain.setValueAtTime(0.001, dizzyStart);
    dizzyGain.gain.linearRampToValueAtTime(0.085, dizzyStart + 0.03);
    dizzyGain.gain.exponentialRampToValueAtTime(0.0008, dizzyStart + 0.44);

    dizzyOsc.connect(dizzyGain);
    dizzyGain.connect(ctx.destination);

    lfo.start(dizzyStart);
    dizzyOsc.start(dizzyStart);
    lfo.stop(dizzyStart + 0.45);
    dizzyOsc.stop(dizzyStart + 0.45);
  }

  public playSelect(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(784, now);
    osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.06);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.065, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playPhaseShift(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const chord = [587.33, 880, 1174.66];
    chord.forEach((freq, i) => {
      const t = now + i * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.05, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.36);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.38);
    });
  }

  public destroy(): void {
    this.destroyed = true;
    if (this.unsubscribeMute) {
      this.unsubscribeMute();
      this.unsubscribeMute = null;
    }
    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.noiseBuffer = null;
  }
}
