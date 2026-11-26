export class PuyoAudio {
  private ctx: AudioContext | null = null;
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
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {
        // Ignore autoplay policy rejection until next gesture
      });
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
  }

  public playMove(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.032);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.042);
  }

  public playRotate(isQuickTurn = false): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const startFreq = isQuickTurn ? 420 : 340;
    const endFreq = isQuickTurn ? 880 : 620;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.065);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playBump(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.04);
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playHardDrop(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.095);
  }

  public playLand(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    // Cute jelly squish envelope: dip down then bounce up
    osc.frequency.setValueAtTime(270, now);
    osc.frequency.exponentialRampToValueAtTime(165, now + 0.045);
    osc.frequency.exponentialRampToValueAtTime(245, now + 0.095);
    gain.gain.setValueAtTime(0.095, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.115);
  }

  public playChain(chainStep: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Ascending Touhou pentatonic/bright scale across chains
    const semitones = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
    const idx = Math.min(Math.max(0, chainStep - 1), semitones.length - 1);
    const rootFreq = 523.25 * Math.pow(2, semitones[idx] / 12); // C5 base

    // Main crystalline bell
    const notes = chainStep >= 3 ? [1, 1.25, 1.5, 2] : [1, 1.5];
    notes.forEach((mult, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === 0 ? 'triangle' : 'sine';
      const t = now + i * 0.032;
      osc.frequency.setValueAtTime(rootFreq * mult, t);
      osc.frequency.exponentialRampToValueAtTime(rootFreq * mult * 1.015, t + 0.22);

      const peak = (0.12 / (1 + i * 0.45)) * Math.min(1.25, 0.9 + chainStep * 0.08);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(peak, t + 0.014);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.34);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.36);
    });
  }

  public playSpellCard(chainStep: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Sparkling shrine arpeggio flourish
    const base = 659.25 * Math.pow(2, Math.min(chainStep - 2, 5) * (2 / 12));
    const ratios = [1, 1.25, 1.5, 1.875, 2];
    ratios.forEach((r, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + i * 0.042;
      osc.frequency.setValueAtTime(base * r, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.075, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  public playAllClear(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.06;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.11, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.48);
    });
  }

  public playGameOver(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = [440, 392, 349.23, 293.66, 261.63];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + i * 0.11;
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.96, t + 0.24);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  public destroy(): void {
    this.destroyed = true;
    if (this.unsubscribeMute) {
      this.unsubscribeMute();
      this.unsubscribeMute = null;
    }
    if (this.ctx) {
      void this.ctx.close().catch(() => {
        // Ignore close errors
      });
      this.ctx = null;
    }
  }
}
