interface Petal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  spin: number;
  swayPhase: number;
  swaySpeed: number;
  alpha: number;
  hue: 'pink' | 'crimson' | 'gold';
}

interface Star {
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
  isCross: boolean;
  tint: string;
}

export class GensokyoBackdrop {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rafId: number | null = null;
  private paused = false;
  private reducedMotion = false;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private petals: Petal[] = [];
  private stars: Star[] = [];
  private lastTime = 0;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('2D context unavailable for backdrop');
    }
    this.ctx = ctx;
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.resizeHandler = () => this.resize();
    window.addEventListener('resize', this.resizeHandler, { passive: true });
    this.resize();
    this.seedEntities();
    this.drawFrame(0);
    if (!this.reducedMotion) {
      this.start();
    }
  }

  private resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.stars.length > 0) {
      this.seedStars();
    }
  }

  private seedStars(): void {
    const count = Math.max(32, Math.min(72, Math.floor((this.width * this.height) / 22000)));
    const tints = ['#fff3d6', '#ffd2df', '#c6d2ff', '#f0c259'];
    this.stars = Array.from({ length: count }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      r: 0.9 + Math.random() * 1.9,
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 1.5,
      isCross: Math.random() < 0.28,
      tint: tints[Math.floor(Math.random() * tints.length)],
    }));
  }

  private seedEntities(): void {
    this.seedStars();
    const petalCount = Math.max(16, Math.min(34, Math.floor(this.width / 46)));
    this.petals = Array.from({ length: petalCount }, () => this.createPetal(true));
  }

  private createPetal(randomY: boolean): Petal {
    const roll = Math.random();
    const hue: Petal['hue'] = roll < 0.72 ? 'pink' : roll < 0.9 ? 'crimson' : 'gold';
    return {
      x: Math.random() * (this.width + 120) - 60,
      y: randomY ? Math.random() * this.height : -24 - Math.random() * 60,
      vx: -10 - Math.random() * 18,
      vy: 16 + Math.random() * 24,
      size: 5 + Math.random() * 6.5,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 1.6,
      swayPhase: Math.random() * Math.PI * 2,
      swaySpeed: 0.8 + Math.random() * 1.1,
      alpha: 0.22 + Math.random() * 0.42,
      hue,
    };
  }

  start(): void {
    if (this.reducedMotion) {
      this.drawFrame(0);
      return;
    }
    this.paused = false;
    if (this.rafId !== null) return;
    this.lastTime = performance.now();
    const loop = (now: number) => {
      if (this.paused) {
        this.rafId = null;
        return;
      }
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
      this.lastTime = now;
      this.update(dt);
      this.drawFrame(now / 1000);
      this.rafId = window.requestAnimationFrame(loop);
    };
    this.rafId = window.requestAnimationFrame(loop);
  }

  pause(): void {
    this.paused = true;
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private update(dt: number): void {
    for (let i = 0; i < this.petals.length; i++) {
      const p = this.petals[i];
      p.swayPhase += p.swaySpeed * dt;
      p.x += (p.vx + Math.sin(p.swayPhase) * 16) * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
      if (p.y > this.height + 30 || p.x < -80) {
        this.petals[i] = this.createPetal(false);
        this.petals[i].x = Math.random() * (this.width + 180);
      }
    }
  }

  private drawFrame(timeSec: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Subtle crimson moon & shrine lantern glows
    const moonGrad = ctx.createRadialGradient(
      this.width * 0.84,
      this.height * 0.14,
      10,
      this.width * 0.84,
      this.height * 0.14,
      Math.max(this.width, this.height) * 0.36,
    );
    moonGrad.addColorStop(0, 'rgba(224, 62, 82, 0.14)');
    moonGrad.addColorStop(0.45, 'rgba(240, 194, 89, 0.05)');
    moonGrad.addColorStop(1, 'rgba(18, 15, 36, 0)');
    ctx.fillStyle = moonGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Danmaku starlight motes
    for (const s of this.stars) {
      const twinkle = 0.32 + 0.68 * (0.5 + 0.5 * Math.sin(s.phase + timeSec * s.speed));
      ctx.save();
      ctx.globalAlpha = twinkle * 0.72;
      ctx.fillStyle = s.tint;
      if (s.isCross) {
        const arm = s.r * 2.6;
        ctx.translate(s.x, s.y);
        ctx.beginPath();
        ctx.moveTo(0, -arm);
        ctx.quadraticCurveTo(0, 0, arm, 0);
        ctx.quadraticCurveTo(0, 0, 0, arm);
        ctx.quadraticCurveTo(0, 0, -arm, 0);
        ctx.quadraticCurveTo(0, 0, 0, -arm);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Floating sakura petals
    for (const p of this.petals) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      const tilt = 0.55 + 0.45 * Math.sin(p.swayPhase * 1.4);
      ctx.scale(1, tilt);
      ctx.globalAlpha = p.alpha;

      if (p.hue === 'pink') {
        ctx.fillStyle = '#ffb8ca';
      } else if (p.hue === 'crimson') {
        ctx.fillStyle = '#e04f66';
      } else {
        ctx.fillStyle = '#f5d27a';
      }

      const s = p.size;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.bezierCurveTo(s * 0.85, -s * 0.55, s * 0.75, s * 0.65, 0, s);
      ctx.bezierCurveTo(-s * 0.75, s * 0.65, -s * 0.85, -s * 0.55, 0, -s);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  destroy(): void {
    this.pause();
    window.removeEventListener('resize', this.resizeHandler);
  }
}
