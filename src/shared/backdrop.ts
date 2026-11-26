interface Petal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  depth: number;
  yaw: number;
  yawSpeed: number;
  pitch: number;
  pitchSpeed: number;
  roll: number;
  rollSpeed: number;
  swayPhase: number;
  swaySpeed: number;
  alpha: number;
  hue: 'pink' | 'blush' | 'crimson' | 'gold';
}

interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  depth: number;
  phase: number;
  pulseSpeed: number;
  wanderPhase: number;
  wanderSpeed: number;
  kind: 'gold' | 'crimson';
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

const PETAL_PALETTE: Record<Petal['hue'], { front: string; back: string }> = {
  pink: { front: '#ffc6d7', back: '#de8aa6' },
  blush: { front: '#ffe0ea', back: '#e8a2b9' },
  crimson: { front: '#eb566e', back: '#b52842' },
  gold: { front: '#f9dc8c', back: '#cf9e42' },
};

function createGlowSprite(innerColor: string, midColor: string, outerColor: string): HTMLCanvasElement {
  const sprite = document.createElement('canvas');
  sprite.width = 64;
  sprite.height = 64;
  const sctx = sprite.getContext('2d');
  if (sctx) {
    const grad = sctx.createRadialGradient(32, 32, 1, 32, 32, 32);
    grad.addColorStop(0, innerColor);
    grad.addColorStop(0.28, midColor);
    grad.addColorStop(1, outerColor);
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 64, 64);
  }
  return sprite;
}

export class GensokyoBackdrop {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rafId: number | null = null;
  private externallyPaused = false;
  private reducedMotion = false;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private petals: Petal[] = [];
  private fireflies: Firefly[] = [];
  private stars: Star[] = [];
  private lastTime = 0;
  private targetParallaxX = 0;
  private targetParallaxY = 0;
  private parallaxX = 0;
  private parallaxY = 0;
  private moonGrad: CanvasGradient | null = null;
  private lanternGrad: CanvasGradient | null = null;
  private goldFireflySprite: HTMLCanvasElement;
  private crimsonFireflySprite: HTMLCanvasElement;
  private resizeHandler: () => void;
  private pointerMoveHandler: (event: PointerEvent) => void;
  private pointerResetHandler: () => void;
  private visibilityHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('2D context unavailable for backdrop');
    }
    this.ctx = ctx;
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.goldFireflySprite = createGlowSprite(
      'rgba(255, 246, 204, 1)',
      'rgba(240, 194, 89, 0.55)',
      'rgba(240, 194, 89, 0)',
    );
    this.crimsonFireflySprite = createGlowSprite(
      'rgba(255, 224, 214, 0.95)',
      'rgba(232, 78, 96, 0.45)',
      'rgba(224, 62, 82, 0)',
    );

    this.resizeHandler = () => this.resize();
    this.pointerMoveHandler = (event: PointerEvent) => {
      if (this.reducedMotion || this.externallyPaused || this.width <= 0 || this.height <= 0) return;
      this.targetParallaxX = (event.clientX / this.width - 0.5) * 2;
      this.targetParallaxY = (event.clientY / this.height - 0.5) * 2;
    };
    this.pointerResetHandler = () => {
      this.targetParallaxX = 0;
      this.targetParallaxY = 0;
    };
    this.visibilityHandler = () => {
      if (document.hidden) {
        this.stopLoop();
      } else if (!this.externallyPaused) {
        this.startLoop();
      }
    };

    window.addEventListener('resize', this.resizeHandler, { passive: true });
    window.addEventListener('pointermove', this.pointerMoveHandler, { passive: true });
    window.addEventListener('blur', this.pointerResetHandler, { passive: true });
    document.addEventListener('mouseleave', this.pointerResetHandler, { passive: true });
    document.addEventListener('visibilitychange', this.visibilityHandler);

    this.resize();
    this.seedEntities();
    this.drawFrame(0);
    if (!this.reducedMotion) {
      this.startLoop();
    }
  }

  private resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.rebuildGradients();
    if (this.stars.length > 0) {
      this.seedStars();
    }
    if (this.reducedMotion || this.externallyPaused) {
      this.drawFrame(performance.now() / 1000);
    }
  }

  private rebuildGradients(): void {
    const ctx = this.ctx;
    const maxDim = Math.max(this.width, this.height, 640);
    const moonGrad = ctx.createRadialGradient(
      this.width * 0.84,
      this.height * 0.14,
      10,
      this.width * 0.84,
      this.height * 0.14,
      maxDim * 0.36,
    );
    moonGrad.addColorStop(0, 'rgba(224, 62, 82, 0.15)');
    moonGrad.addColorStop(0.45, 'rgba(240, 194, 89, 0.06)');
    moonGrad.addColorStop(1, 'rgba(18, 15, 36, 0)');
    this.moonGrad = moonGrad;

    const lanternGrad = ctx.createRadialGradient(
      this.width * 0.16,
      this.height * 0.24,
      8,
      this.width * 0.16,
      this.height * 0.24,
      maxDim * 0.28,
    );
    lanternGrad.addColorStop(0, 'rgba(240, 194, 89, 0.09)');
    lanternGrad.addColorStop(0.5, 'rgba(200, 35, 51, 0.04)');
    lanternGrad.addColorStop(1, 'rgba(18, 15, 36, 0)');
    this.lanternGrad = lanternGrad;
  }

  private seedStars(): void {
    const count = Math.max(30, Math.min(68, Math.floor((this.width * this.height) / 24000)));
    const tints = ['#fff3d6', '#ffd2df', '#c6d2ff', '#f0c259'];
    this.stars = Array.from({ length: count }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      r: 0.85 + Math.random() * 1.85,
      phase: Math.random() * Math.PI * 2,
      speed: 0.55 + Math.random() * 1.4,
      isCross: Math.random() < 0.3,
      tint: tints[Math.floor(Math.random() * tints.length)],
    }));
  }

  private seedEntities(): void {
    this.seedStars();
    const petalCount = Math.max(18, Math.min(34, Math.floor(this.width / 44)));
    this.petals = Array.from({ length: petalCount }, () => this.createPetal(true));
    const fireflyCount = Math.max(12, Math.min(22, Math.floor(this.width / 68)));
    this.fireflies = Array.from({ length: fireflyCount }, () => this.createFirefly(true));
  }

  private createPetal(randomY: boolean): Petal {
    const roll = Math.random();
    const hue: Petal['hue'] =
      roll < 0.48 ? 'pink' : roll < 0.78 ? 'blush' : roll < 0.92 ? 'crimson' : 'gold';
    const depth = 0.55 + Math.random() * 0.65;
    return {
      x: Math.random() * (this.width + 160) - 60,
      y: randomY ? Math.random() * this.height : -26 - Math.random() * 70,
      vx: (-11 - Math.random() * 17) * depth,
      vy: (15 + Math.random() * 21) * depth,
      size: (4.8 + Math.random() * 5.2) * depth,
      depth,
      yaw: Math.random() * Math.PI * 2,
      yawSpeed: (Math.random() - 0.5) * 1.9,
      pitch: Math.random() * Math.PI * 2,
      pitchSpeed: 1.4 + Math.random() * 2.1,
      roll: Math.random() * Math.PI * 2,
      rollSpeed: 1.0 + Math.random() * 1.7,
      swayPhase: Math.random() * Math.PI * 2,
      swaySpeed: 0.8 + Math.random() * 1.05,
      alpha: 0.24 + Math.random() * 0.42 * depth,
      hue,
    };
  }

  private createFirefly(randomY: boolean): Firefly {
    const depth = 0.55 + Math.random() * 0.6;
    return {
      x: Math.random() * this.width,
      y: randomY ? Math.random() * this.height : this.height + 24 + Math.random() * 60,
      vx: (Math.random() - 0.5) * 10,
      vy: -(6 + Math.random() * 12) * depth,
      radius: (10 + Math.random() * 13) * depth,
      depth,
      phase: Math.random() * Math.PI * 2,
      pulseSpeed: 1.1 + Math.random() * 1.6,
      wanderPhase: Math.random() * Math.PI * 2,
      wanderSpeed: 0.5 + Math.random() * 0.85,
      kind: Math.random() < 0.78 ? 'gold' : 'crimson',
    };
  }

  setPaused(paused: boolean): void {
    this.externallyPaused = paused;
    if (paused) {
      this.stopLoop();
    } else if (!document.hidden) {
      this.startLoop();
    }
  }

  start(): void {
    this.setPaused(false);
  }

  pause(): void {
    this.setPaused(true);
  }

  private startLoop(): void {
    if (this.reducedMotion) {
      this.drawFrame(0);
      return;
    }
    if (this.rafId !== null) return;
    this.lastTime = performance.now();
    const loop = (now: number) => {
      if (this.externallyPaused || document.hidden) {
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

  private stopLoop(): void {
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private update(dt: number): void {
    // Critically smooth mouse parallax interpolation
    const damp = 1 - Math.exp(-3.6 * dt);
    this.parallaxX += (this.targetParallaxX - this.parallaxX) * damp;
    this.parallaxY += (this.targetParallaxY - this.parallaxY) * damp;

    for (let i = 0; i < this.petals.length; i++) {
      const p = this.petals[i];
      p.swayPhase += p.swaySpeed * dt;
      p.x += (p.vx + Math.sin(p.swayPhase) * 18 * p.depth) * dt;
      p.y += (p.vy + Math.cos(p.swayPhase * 0.7) * 4) * dt;
      p.yaw += p.yawSpeed * dt;
      p.pitch += p.pitchSpeed * dt;
      p.roll += p.rollSpeed * dt;
      if (p.y > this.height + 36 || p.x < -90) {
        const next = this.createPetal(false);
        next.x = Math.random() * (this.width + 200);
        this.petals[i] = next;
      }
    }

    for (let i = 0; i < this.fireflies.length; i++) {
      const f = this.fireflies[i];
      f.wanderPhase += f.wanderSpeed * dt;
      f.x += (f.vx + Math.sin(f.wanderPhase) * 14) * dt;
      f.y += (f.vy + Math.cos(f.wanderPhase * 0.8) * 5) * dt;
      if (f.y < -40 || f.x < -60 || f.x > this.width + 60) {
        this.fireflies[i] = this.createFirefly(false);
      }
    }
  }

  private drawFrame(timeSec: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Subtle crimson moon & shrine lantern glows
    if (this.moonGrad) {
      ctx.fillStyle = this.moonGrad;
      ctx.fillRect(0, 0, this.width, this.height);
    }
    if (this.lanternGrad) {
      ctx.fillStyle = this.lanternGrad;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    const px = this.parallaxX * 16;
    const py = this.parallaxY * 11;

    // 1. Danmaku starlight motes (distant parallax layer)
    const starOx = -px * 0.32;
    const starOy = -py * 0.32;
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      const twinkle = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(s.phase + timeSec * s.speed));
      const sx = s.x + starOx;
      const sy = s.y + starOy;
      ctx.save();
      ctx.globalAlpha = twinkle * 0.72;
      ctx.fillStyle = s.tint;
      if (s.isCross) {
        const arm = s.r * 2.65;
        ctx.translate(sx, sy);
        ctx.beginPath();
        ctx.moveTo(0, -arm);
        ctx.quadraticCurveTo(0, 0, arm, 0);
        ctx.quadraticCurveTo(0, 0, 0, arm);
        ctx.quadraticCurveTo(0, 0, -arm, 0);
        ctx.quadraticCurveTo(0, 0, 0, -arm);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 2. Soft drifting golden shrine fireflies (灵火)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.fireflies.length; i++) {
      const f = this.fireflies[i];
      const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(f.phase + timeSec * f.pulseSpeed));
      const fx = f.x - px * 0.72 * f.depth;
      const fy = f.y - py * 0.72 * f.depth;
      const drawR = f.radius * (0.82 + 0.28 * pulse);
      const sprite = f.kind === 'gold' ? this.goldFireflySprite : this.crimsonFireflySprite;
      ctx.globalAlpha = pulse * 0.76;
      ctx.drawImage(sprite, fx - drawR, fy - drawR, drawR * 2, drawR * 2);
    }
    ctx.restore();

    // 3. 3D-fluttering sakura petals with front/back shading & tip notch
    for (let i = 0; i < this.petals.length; i++) {
      const p = this.petals[i];
      const cosPitch = Math.cos(p.pitch);
      const cosRoll = Math.cos(p.roll);
      const scaleX = Math.max(0.24, Math.abs(cosRoll));
      const scaleY = Math.max(0.22, Math.abs(cosPitch));
      const facingFront = cosPitch * cosRoll >= 0;
      const palette = PETAL_PALETTE[p.hue];

      ctx.save();
      ctx.translate(p.x - px * p.depth, p.y - py * p.depth);
      ctx.rotate(p.yaw);
      ctx.scale(scaleX, scaleY);
      ctx.globalAlpha = p.alpha * (0.68 + 0.32 * scaleY);
      ctx.fillStyle = facingFront ? palette.front : palette.back;

      const s = p.size;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.95);
      ctx.bezierCurveTo(s * 0.9, s * 0.45, s * 0.85, -s * 0.62, s * 0.24, -s * 0.96);
      ctx.lineTo(0, -s * 0.66);
      ctx.lineTo(-s * 0.24, -s * 0.96);
      ctx.bezierCurveTo(-s * 0.85, -s * 0.62, -s * 0.9, s * 0.45, 0, s * 0.95);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  destroy(): void {
    this.stopLoop();
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('pointermove', this.pointerMoveHandler);
    window.removeEventListener('blur', this.pointerResetHandler);
    document.removeEventListener('mouseleave', this.pointerResetHandler);
    document.removeEventListener('visibilitychange', this.visibilityHandler);
  }
}
