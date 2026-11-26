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

  public playSpellReady(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = [783.99, 1046.5, 1567.98];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + i * 0.055;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.08, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  public playReimuSpell(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Sacred shrine bell shimmer + purifying sweeping chord
    const freqs = [587.33, 880, 1174.66, 1479.98, 1760];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i % 2 === 0 ? 'triangle' : 'sine';
      const t = now + i * 0.045;
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 1.03, t + 0.42);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.11 / (1 + i * 0.16), t + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.52);
    });
  }

  public playMarisaSpell(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Master Spark: rapid Hakkero charge whine -> roaring rainbow laser pillar!
    const charge = ctx.createOscillator();
    const cGain = ctx.createGain();
    charge.type = 'sine';
    charge.frequency.setValueAtTime(320, now);
    charge.frequency.exponentialRampToValueAtTime(1480, now + 0.16);
    cGain.gain.setValueAtTime(0.02, now);
    cGain.gain.linearRampToValueAtTime(0.11, now + 0.14);
    cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    charge.connect(cGain);
    cGain.connect(ctx.destination);
    charge.start(now);
    charge.stop(now + 0.22);

    // Laser beam body chord (detuned sawtooth + triangle bass)
    const beamStart = now + 0.13;
    const beamFreqs = [130.81, 261.63, 392.0, 523.25];
    beamFreqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = i < 2 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(f * 1.08, beamStart);
      osc.frequency.exponentialRampToValueAtTime(f * 0.96, beamStart + 0.48);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2600, beamStart);
      filter.frequency.exponentialRampToValueAtTime(620, beamStart + 0.48);
      gain.gain.setValueAtTime(0.001, beamStart);
      gain.gain.linearRampToValueAtTime(i === 0 ? 0.1 : 0.065, beamStart + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, beamStart + 0.52);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(beamStart);
      osc.stop(beamStart + 0.55);
    });
  }

  public playPatchouliSpell(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Seven-element arcane transmutation crystalline prism cascade
    const notes = [440, 554.37, 659.25, 830.61, 987.77, 1108.73, 1318.51];
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + i * 0.038;
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 1.02, t + 0.34);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.085, t + 0.014);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  }

  public playBossHit(heavy = false): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = heavy ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(heavy ? 760 : 940, now);
    osc.frequency.exponentialRampToValueAtTime(heavy ? 240 : 380, now + 0.065);
    gain.gain.setValueAtTime(heavy ? 0.085 : 0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.072);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playBossAttack(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Crisp Touhou warning pulse
    [0, 0.09].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + offset;
      osc.frequency.setValueAtTime(idx === 0 ? 480 : 360, t);
      osc.frequency.exponentialRampToValueAtTime(idx === 0 ? 340 : 220, t + 0.085);
      gain.gain.setValueAtTime(0.085, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.095);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    });
  }

  public playOjamaDrop(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.11);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playOjamaShatter(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = [1180, 1520, 1980];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.022;
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.72, t + 0.09);
      gain.gain.setValueAtTime(0.065, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.11);
    });
  }

  public playBossDefeat(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Triumphant Touhou Spell Card Bonus fanfare!
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i < 3 ? 'triangle' : 'sine';
      const t = now + i * 0.055;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.11, t + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.52);
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
