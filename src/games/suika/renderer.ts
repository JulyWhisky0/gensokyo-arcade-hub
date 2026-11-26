import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  DANGER_GRACE_SECONDS,
  DANGER_Y,
  FLOOR_Y,
  INNER_LEFT,
  INNER_RIGHT,
  INNER_WIDTH,
  JAR_TOP_Y,
  ORB_TIERS,
  SPAWN_Y,
} from './tiers';
import type { MergeEvent, OrbBody } from './physics';
import {
  OrbSpriteCache,
  drawStarPath,
  drawTouhouOrb,
  renderOrbIcon,
  roundRectPath,
} from './sprites';

export { drawTouhouOrb, renderOrbIcon };
export type { OrbDrawOptions } from './sprites';

const TAU = Math.PI * 2;

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  rotation: number;
  vRot: number;
  shape: 'star' | 'petal' | 'diamond' | 'dot';
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  lineWidth: number;
  isMagicCircle: boolean;
  rotation: number;
  vRot: number;
  points: number;
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  subText?: string;
  color: string;
  scale: number;
  life: number;
  maxLife: number;
}

interface AmbientMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  swayAmp: number;
  swayFreq: number;
  phase: number;
  size: number;
  angle: number;
  vAngle: number;
  alpha: number;
  kind: 'petal' | 'dust' | 'star';
}

export interface RenderStageParams {
  orbs: readonly OrbBody[];
  heldTier: number;
  dropX: number;
  canDrop: boolean;
  isAiming: boolean;
  heldPopProgress: number;
  showGuide: boolean;
  predictedLandingY: number;
  dangerTimer: number;
  nearDangerFactor: number;
  comboCount: number;
  time: number;
}

export class SuikaRenderer {
  private spriteCache = new OrbSpriteCache();
  private particles: Particle[] = [];
  private shockwaves: Shockwave[] = [];
  private floatingTexts: FloatingText[] = [];
  private ambient: AmbientMote[] = [];
  private shakeMag = 0;

  constructor() {
    this.initAmbient();
  }

  /** Pre-renders or refreshes high-DPI offscreen chibi orb sprites when canvas scale/DPR changes. */
  setPixelScale(pixelScale: number): void {
    this.spriteCache.ensureScale(pixelScale);
  }

  private initAmbient(): void {
    this.ambient = [];
    for (let i = 0; i < 24; i++) {
      const mod = i % 4;
      const kind: AmbientMote['kind'] = mod === 0 ? 'star' : mod === 1 ? 'dust' : 'petal';
      this.ambient.push({
        x: INNER_LEFT + Math.random() * INNER_WIDTH,
        y: JAR_TOP_Y + Math.random() * (FLOOR_Y - JAR_TOP_Y),
        vx: kind === 'petal' ? -5 - Math.random() * 8 : (Math.random() - 0.5) * 4,
        vy: kind === 'petal' ? 9 + Math.random() * 12 : -4 - Math.random() * 6,
        swayAmp: kind === 'petal' ? 8 + Math.random() * 10 : 4 + Math.random() * 5,
        swayFreq: 0.9 + Math.random() * 1.1,
        phase: Math.random() * TAU,
        size:
          kind === 'petal'
            ? 3.6 + Math.random() * 3.0
            : kind === 'star'
            ? 2.2 + Math.random() * 2.0
            : 1.5 + Math.random() * 1.8,
        angle: Math.random() * TAU,
        vAngle: (Math.random() - 0.5) * 1.6,
        alpha: kind === 'dust' ? 0.22 + Math.random() * 0.26 : 0.16 + Math.random() * 0.24,
        kind,
      });
    }
  }

  resetEffects(): void {
    this.particles = [];
    this.shockwaves = [];
    this.floatingTexts = [];
    this.shakeMag = 0;
  }

  spawnMergeFX(ev: MergeEvent): void {
    if (ev.isDoubleSuika) {
      // Legendary Double Suika celebratory fireworks + triple Hakurei magic circles!
      this.shakeMag = Math.min(14, this.shakeMag + 12);
      const colors = ['#3be382', '#ffe169', '#ff5e78', '#7ce2ff', '#ffffff'];
      for (let w = 0; w < 3; w++) {
        this.shockwaves.push({
          x: ev.x,
          y: ev.y,
          radius: 22 + w * 20,
          maxRadius: 215 + w * 50,
          color: colors[w],
          alpha: 0.95,
          lineWidth: 5.5 - w * 1.1,
          isMagicCircle: true,
          rotation: w * 0.6,
          vRot: (w % 2 === 0 ? 1 : -1) * 1.8,
          points: 8,
        });
      }
      for (let i = 0; i < 68; i++) {
        const ang = (TAU * i) / 68 + (Math.random() - 0.5) * 0.22;
        const speed = 115 + Math.random() * 285;
        this.particles.push({
          x: ev.x,
          y: ev.y,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed - 65,
          size: 4.5 + Math.random() * 5.2,
          color: colors[i % colors.length],
          alpha: 1,
          life: 0,
          maxLife: 0.88 + Math.random() * 0.55,
          rotation: Math.random() * TAU,
          vRot: (Math.random() - 0.5) * 9,
          shape: i % 3 === 0 ? 'star' : i % 3 === 1 ? 'petal' : 'diamond',
        });
      }
      this.floatingTexts.push({
        x: clamp(ev.x, 110, BOARD_WIDTH - 110),
        y: Math.max(150, ev.y - 20),
        vy: -44,
        text: `+${ev.points}`,
        subText: '🍉 双萃香大爆发!!',
        color: '#ffe169',
        scale: 1.48,
        life: 0,
        maxLife: 1.9,
      });
      return;
    }

    const def = ORB_TIERS[ev.newTier];
    const isBig = ev.newTier >= 7;
    const isSuika = ev.newTier === 10;

    if (ev.newTier >= 5) {
      this.shakeMag = Math.min(11, this.shakeMag + (ev.newTier - 4) * 1.4);
    }

    // Expanding rotating Hakurei Magic-Circle ring on every merge!
    this.shockwaves.push({
      x: ev.x,
      y: ev.y,
      radius: def.radius * 0.52,
      maxRadius: def.radius * (isSuika ? 2.5 : isBig ? 2.05 : 1.88),
      color: def.rim,
      alpha: isBig ? 0.94 : 0.78,
      lineWidth: isBig ? 3.8 : 2.5,
      isMagicCircle: true,
      rotation: Math.random() * TAU,
      vRot: (ev.newTier % 2 === 0 ? 1 : -1) * (isBig ? 2.1 : 1.5),
      points: isBig ? 8 : 6,
    });

    // Crisp secondary luminous flash ring
    this.shockwaves.push({
      x: ev.x,
      y: ev.y,
      radius: def.radius * 0.35,
      maxRadius: def.radius * (isSuika ? 2.95 : 1.55),
      color: isSuika ? '#3be382' : '#fff5cf',
      alpha: isSuika ? 0.92 : 0.62,
      lineWidth: isSuika ? 4.6 : 2.0,
      isMagicCircle: false,
      rotation: 0,
      vRot: 0,
      points: 0,
    });

    // Radial sakura petals & glowing stars burst
    const pCount = isSuika ? 50 : isBig ? 28 : 14 + ev.newTier * 2;
    for (let i = 0; i < pCount; i++) {
      const ang = (TAU * i) / pCount + (Math.random() - 0.5) * 0.32;
      const speed = (72 + Math.random() * 148) * (isSuika ? 1.55 : isBig ? 1.2 : 1);
      const shape: Particle['shape'] =
        ev.newTier === 1 && i % 2 === 0
          ? 'diamond'
          : i % 3 === 0
          ? 'star'
          : i % 3 === 1
          ? 'petal'
          : i % 4 === 0
          ? 'diamond'
          : 'star';
      const petalTint = shape === 'petal' && i % 2 === 0 ? '#ffc2d9' : def.particleColors[i % def.particleColors.length];
      this.particles.push({
        x: ev.x + Math.cos(ang) * def.radius * 0.28,
        y: ev.y + Math.sin(ang) * def.radius * 0.28,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed - 38,
        size: (isBig ? 4.4 : 3.4) + Math.random() * 3.4,
        color: petalTint,
        alpha: 1,
        life: 0,
        maxLife: (isSuika ? 0.9 : 0.55) + Math.random() * 0.32,
        rotation: Math.random() * TAU,
        vRot: (Math.random() - 0.5) * 8.5,
        shape,
      });
    }

    let subText: string | undefined;
    if (isSuika) {
      subText = '🍉 伊吹萃香 降临!';
    } else if (ev.combo >= 2) {
      subText = `${ev.combo}x COMBO!`;
    } else if (ev.newTier >= 8) {
      subText = `${def.name}!`;
    }

    this.floatingTexts.push({
      x: clamp(ev.x, 76, BOARD_WIDTH - 76),
      y: Math.max(126, ev.y - def.radius * 0.45),
      vy: -50,
      text: `+${ev.points}`,
      subText,
      color: isSuika ? '#5ee69c' : ev.combo >= 2 ? '#ffe169' : '#ffffff',
      scale: isSuika ? 1.38 : ev.combo >= 2 ? 1.16 : isBig ? 1.12 : 0.98,
      life: 0,
      maxLife: isSuika ? 1.65 : ev.combo >= 2 ? 1.15 : 0.92,
    });
  }

  updateEffects(dt: number): void {
    const cdt = Math.min(0.05, Math.max(0, dt));

    if (this.shakeMag > 0.05) {
      this.shakeMag *= Math.pow(0.0012, cdt);
    } else {
      this.shakeMag = 0;
    }

    // Ambient floating sakura petals & golden shrine dust motes
    for (let i = 0; i < this.ambient.length; i++) {
      const a = this.ambient[i];
      a.x += a.vx * cdt;
      a.y += a.vy * cdt;
      a.angle += a.vAngle * cdt;
      if (a.y > FLOOR_Y + 8) {
        a.y = JAR_TOP_Y - 6;
        a.x = INNER_LEFT + Math.random() * INNER_WIDTH;
      } else if (a.y < JAR_TOP_Y - 10) {
        a.y = FLOOR_Y + 4;
        a.x = INNER_LEFT + Math.random() * INNER_WIDTH;
      }
      if (a.x < INNER_LEFT - 10) a.x = INNER_RIGHT + 8;
      else if (a.x > INNER_RIGHT + 10) a.x = INNER_LEFT - 8;
    }

    // Expanding shockwaves & magic circles
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.radius += (s.maxRadius - s.radius) * Math.min(1, cdt * 8.6) + 42 * cdt;
      s.rotation += s.vRot * cdt;
      s.alpha -= cdt * (s.isMagicCircle ? 1.75 : 2.35);
      if (s.alpha <= 0.01 || s.radius >= s.maxRadius) {
        this.shockwaves.splice(i, 1);
      }
    }

    // Burst particles (cap length for sustained locked framerate on mega chains)
    if (this.particles.length > 180) {
      this.particles.splice(0, this.particles.length - 180);
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += cdt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += (p.shape === 'petal' ? 190 : 310) * cdt;
      p.vx *= Math.pow(0.24, cdt);
      p.x += p.vx * cdt;
      p.y += p.vy * cdt;
      p.rotation += p.vRot * cdt;
      p.alpha = 1 - p.life / p.maxLife;
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const f = this.floatingTexts[i];
      f.life += cdt;
      if (f.life >= f.maxLife) {
        this.floatingTexts.splice(i, 1);
        continue;
      }
      f.y += f.vy * cdt;
      f.vy *= Math.pow(0.25, cdt);
    }
  }

  renderStage(ctx: CanvasRenderingContext2D, params: RenderStageParams): void {
    const {
      orbs,
      heldTier,
      dropX,
      canDrop,
      isAiming,
      heldPopProgress,
      showGuide,
      predictedLandingY,
      dangerTimer,
      nearDangerFactor,
      time,
    } = params;

    ctx.save();

    if (this.shakeMag > 0.1) {
      const sx = (Math.random() - 0.5) * 2 * this.shakeMag;
      const sy = (Math.random() - 0.5) * 2 * this.shakeMag;
      ctx.translate(sx, sy);
    }

    // 1. Background canvas fill (warm twilight Hakurei shrine indigo-plum)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, BOARD_HEIGHT);
    bgGrad.addColorStop(0, '#18102e');
    bgGrad.addColorStop(0.52, '#241744');
    bgGrad.addColorStop(1, '#141d2e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

    // Warm shrine lantern glow above drop rail
    const topGlow = ctx.createRadialGradient(
      BOARD_WIDTH * 0.5,
      44,
      8,
      BOARD_WIDTH * 0.5,
      56,
      215
    );
    topGlow.addColorStop(0, 'rgba(247, 206, 104, 0.17)');
    topGlow.addColorStop(0.55, 'rgba(212, 42, 62, 0.08)');
    topGlow.addColorStop(1, 'rgba(24, 16, 46, 0)');
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, 0, BOARD_WIDTH, 220);

    // 2. Jar interior backing & clipped shrine atmosphere
    ctx.save();
    roundRectPath(ctx, INNER_LEFT, JAR_TOP_Y, INNER_WIDTH, FLOOR_Y - JAR_TOP_Y, 14);
    const jarGrad = ctx.createLinearGradient(0, JAR_TOP_Y, 0, FLOOR_Y);
    jarGrad.addColorStop(0, 'rgba(15, 10, 32, 0.64)');
    jarGrad.addColorStop(0.62, 'rgba(24, 16, 50, 0.74)');
    jarGrad.addColorStop(1, 'rgba(15, 25, 40, 0.88)');
    ctx.fillStyle = jarGrad;
    ctx.fill();
    ctx.clip();

    // Animated gently rotating Hakurei Yin-Yang Magic Circle watermark
    this.drawHakureiMagicWatermark(ctx, time);

    // Floating sakura petals & golden shrine dust motes
    this.drawAmbient(ctx, time);

    // Glowing warning pulse near danger line (both proximity alert & active timer)
    if (nearDangerFactor > 0.05 || dangerTimer > 0) {
      const ratio = clamp(dangerTimer / DANGER_GRACE_SECONDS, 0, 1);
      const alertStrength = Math.max(nearDangerFactor * 0.42, 0.35 + ratio * 0.65);
      const pulse = 0.55 + 0.45 * Math.sin(time * (5.5 + ratio * 10));
      const warnGrad = ctx.createLinearGradient(0, JAR_TOP_Y, 0, DANGER_Y + 95);
      warnGrad.addColorStop(0, `rgba(242, 44, 74, ${0.34 * alertStrength * pulse})`);
      warnGrad.addColorStop(0.55, `rgba(242, 44, 74, ${0.14 * alertStrength * pulse})`);
      warnGrad.addColorStop(1, 'rgba(242, 44, 74, 0)');
      ctx.fillStyle = warnGrad;
      ctx.fillRect(INNER_LEFT, JAR_TOP_Y, INNER_WIDTH, DANGER_Y + 95 - JAR_TOP_Y);
    }

    ctx.restore();

    // 3. Glowing Danger Line & Countdown Pill
    this.drawDangerLine(ctx, dangerTimer, nearDangerFactor, time);

    // 4. Aim Guide & Held Orb Preview (using cached sprites + smooth pop-in spring)
    if (showGuide) {
      this.drawAimGuideAndHeldOrb(
        ctx,
        dropX,
        heldTier,
        canDrop,
        isAiming,
        heldPopProgress,
        predictedLandingY,
        time
      );
    }

    // 5. All physics orbs rendered via high-DPI cached offscreen sprites!
    for (let i = 0; i < orbs.length; i++) {
      const o = orbs[i];
      let scaleX = 1;
      let scaleY = 1;

      if (o.spawnProgress < 1 && o.isMergeBorn) {
        // Juicy elastic spring pop-in: 0.60 -> 1.16 -> 0.96 -> 1.00!
        const p = o.spawnProgress;
        const taper = 1 - p * p * p;
        const baseScale = 1 - 0.4 * Math.exp(-2.5 * p) * Math.cos(p * 8.95) * taper;
        const squash = Math.sin(p * Math.PI * 2.2) * (1 - p) * 0.11;
        scaleX = baseScale * (1 + squash);
        scaleY = baseScale * (1 - squash * 0.85);
      }

      if (o.impactSquash > 0.01) {
        const imp = Math.sin(o.impactSquash * Math.PI) * o.impactSquash * 0.14;
        scaleX *= 1 + imp;
        scaleY *= 1 - imp * 0.82;
      }

      // Pulsing danger halo behind violating orb
      if (o.inDanger && dangerTimer > 0.05) {
        const pulse = 0.5 + 0.5 * Math.sin(time * 12);
        ctx.save();
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.radius + 5 + pulse * 3.5, 0, TAU);
        ctx.strokeStyle = `rgba(255, 76, 102, ${0.48 + pulse * 0.46})`;
        ctx.lineWidth = 3.2;
        ctx.stroke();
        ctx.restore();
      }

      // Lightweight live festive aura for Tier 10 Suika (and subtle shimmer for Reimu/Yukari)
      if (o.tier === 10) {
        this.drawSuikaLiveAura(ctx, o.x, o.y, o.radius, time);
      }

      this.blitOrbSprite(ctx, o.x, o.y, o.radius, o.tier, o.angle, scaleX, scaleY, o.flashTimer);
    }

    // 6. Expanding Magic-Circle Shockwaves & Burst Petals/Stars
    this.drawShockwaves(ctx);
    this.drawParticles(ctx);

    // 7. Warm Crimson-Gold Lacquer Shrine Jar Frame with Metallic Corner Clasps
    this.drawJarFrame(ctx, dangerTimer, nearDangerFactor, time);

    // 8. Floating score & combo banners
    this.drawFloatingTexts(ctx);

    ctx.restore();
  }

  private blitOrbSprite(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    tier: number,
    angle: number,
    scaleX: number,
    scaleY: number,
    flash: number
  ): void {
    const sprite = this.spriteCache.get(tier);
    if (!sprite) {
      drawTouhouOrb(ctx, x, y, r, tier, angle, { scaleX, scaleY, flash });
      return;
    }

    ctx.save();
    ctx.translate(x, y);
    if (angle !== 0) ctx.rotate(angle);
    if (scaleX !== 1 || scaleY !== 1) ctx.scale(scaleX, scaleY);

    const h = sprite.logicalHalf;
    ctx.drawImage(sprite.canvas, -h, -h, h * 2, h * 2);

    if (flash > 0.01) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.fillStyle = `rgba(255, 252, 232, ${flash * 0.56})`;
      ctx.fill();
    }
    ctx.restore();
  }

  private drawSuikaLiveAura(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    time: number
  ): void {
    ctx.save();
    ctx.translate(x, y);
    const pulse = 1 + Math.sin(time * 3.8) * 0.035;
    const auraR = r * 1.24 * pulse;
    const g = ctx.createRadialGradient(0, 0, r * 0.85, 0, 0, auraR);
    g.addColorStop(0, 'rgba(255, 224, 102, 0.24)');
    g.addColorStop(0.55, 'rgba(62, 230, 134, 0.16)');
    g.addColorStop(1, 'rgba(62, 230, 134, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, auraR, 0, TAU);
    ctx.fill();

    // 4 softly orbiting golden festival sake sparks
    ctx.fillStyle = 'rgba(255, 236, 138, 0.72)';
    for (let i = 0; i < 4; i++) {
      const a = time * 0.85 + (TAU * i) / 4;
      const sx = Math.cos(a) * (r * 1.12);
      const sy = Math.sin(a) * (r * 1.12);
      const sz = 4.2 + Math.sin(time * 4 + i) * 1.3;
      drawStarPath(ctx, sx, sy, 4, sz, sz * 0.38);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawHakureiMagicWatermark(ctx: CanvasRenderingContext2D, time: number): void {
    const cx = BOARD_WIDTH * 0.5;
    const cy = (JAR_TOP_Y + FLOOR_Y) * 0.5 + 14;
    ctx.save();
    ctx.translate(cx, cy);

    // Outer slow clockwise talisman ring
    ctx.save();
    ctx.rotate(time * 0.11);
    ctx.strokeStyle = 'rgba(245, 202, 98, 0.085)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, 132, 0, TAU);
    ctx.stroke();

    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, 122, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);

    // 8 sacred radial cardinal ticks & miniature diamonds
    for (let i = 0; i < 8; i++) {
      const a = (TAU * i) / 8;
      const c = Math.cos(a);
      const s = Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(c * 100, s * 100);
      ctx.lineTo(c * 132, s * 132);
      ctx.stroke();

      ctx.fillStyle = i % 2 === 0 ? 'rgba(235, 64, 88, 0.11)' : 'rgba(245, 202, 98, 0.11)';
      ctx.beginPath();
      ctx.arc(c * 114, s * 114, 3.2, 0, TAU);
      ctx.fill();
    }

    // Subtle 8-point sacred star inscribed between rings
    ctx.strokeStyle = 'rgba(245, 202, 98, 0.055)';
    ctx.lineWidth = 1.1;
    for (let k = 0; k < 2; k++) {
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (TAU * i) / 4 + (k * Math.PI) / 4;
        const px = Math.cos(a) * 100;
        const py = Math.sin(a) * 100;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();

    // Inner counter-rotating Hakurei Yin-Yang emblem
    ctx.save();
    ctx.rotate(-time * 0.16);
    ctx.strokeStyle = 'rgba(245, 202, 98, 0.09)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, 74, 0, TAU);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -37, 37, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.arc(0, 37, 37, -Math.PI * 0.5, Math.PI * 0.5, true);
    ctx.stroke();

    ctx.fillStyle = 'rgba(235, 64, 88, 0.08)';
    ctx.beginPath();
    ctx.arc(0, -37, 10.5, 0, TAU);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 240, 200, 0.08)';
    ctx.beginPath();
    ctx.arc(0, 37, 10.5, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  private drawAmbient(ctx: CanvasRenderingContext2D, time: number): void {
    for (let i = 0; i < this.ambient.length; i++) {
      const a = this.ambient[i];
      const swayX = Math.sin(time * a.swayFreq + a.phase) * a.swayAmp;
      ctx.save();
      ctx.translate(a.x + swayX, a.y);

      if (a.kind === 'star') {
        const twinkle = 0.55 + 0.45 * Math.sin(time * 2.8 + i);
        ctx.rotate(a.angle);
        ctx.fillStyle = `rgba(255, 232, 148, ${a.alpha * twinkle})`;
        drawStarPath(ctx, 0, 0, 4, a.size, a.size * 0.36);
        ctx.fill();
      } else if (a.kind === 'dust') {
        const pulse = 0.5 + 0.5 * Math.sin(time * 2.1 + a.phase);
        ctx.fillStyle = `rgba(255, 218, 138, ${a.alpha * pulse})`;
        ctx.beginPath();
        ctx.arc(0, 0, a.size, 0, TAU);
        ctx.fill();
      } else {
        ctx.rotate(a.angle);
        ctx.fillStyle = `rgba(255, 184, 212, ${a.alpha})`;
        drawSakuraPetalPath(ctx, a.size);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawDangerLine(
    ctx: CanvasRenderingContext2D,
    dangerTimer: number,
    nearDangerFactor: number,
    time: number
  ): void {
    const active = dangerTimer > 0.02;
    const ratio = clamp(dangerTimer / DANGER_GRACE_SECONDS, 0, 1);
    const pulse = active
      ? 0.55 + 0.45 * Math.sin(time * (7 + ratio * 10))
      : nearDangerFactor > 0.1
      ? 0.45 + 0.55 * Math.sin(time * 5.2)
      : 0.35;

    ctx.save();
    // Soft glowing halo under the danger line when near or active
    if (active || nearDangerFactor > 0.1) {
      ctx.beginPath();
      ctx.moveTo(INNER_LEFT + 6, DANGER_Y);
      ctx.lineTo(INNER_RIGHT - 6, DANGER_Y);
      ctx.strokeStyle = active
        ? `rgba(255, 66, 94, ${0.28 + pulse * 0.3})`
        : `rgba(255, 142, 92, ${nearDangerFactor * 0.28 * pulse})`;
      ctx.lineWidth = active ? 8 : 5;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.setLineDash([8, 6]);
    ctx.moveTo(INNER_LEFT + 6, DANGER_Y);
    ctx.lineTo(INNER_RIGHT - 6, DANGER_Y);
    ctx.strokeStyle = active
      ? `rgba(255, 86, 110, ${0.65 + pulse * 0.35})`
      : nearDangerFactor > 0.1
      ? `rgba(255, 180, 102, ${0.38 + nearDangerFactor * 0.45 * pulse})`
      : 'rgba(240, 194, 89, 0.34)';
    ctx.lineWidth = active ? 2.4 : 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    if (active) {
      const remain = Math.max(0, DANGER_GRACE_SECONDS - dangerTimer);
      const pillW = 114;
      const pillH = 22;
      const px = BOARD_WIDTH * 0.5 - pillW * 0.5;
      const py = DANGER_Y - pillH * 0.5;

      roundRectPath(ctx, px, py, pillW, pillH, 11);
      ctx.fillStyle = 'rgba(42, 10, 22, 0.94)';
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 102, 122, ${0.68 + pulse * 0.32})`;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.save();
      roundRectPath(ctx, px + 2, py + 2, pillW - 4, pillH - 4, 9);
      ctx.clip();
      ctx.fillStyle = 'rgba(235, 52, 76, 0.52)';
      ctx.fillRect(px + 2, py + 2, (pillW - 4) * ratio, pillH - 4);
      ctx.restore();

      ctx.fillStyle = '#fff5f7';
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`警戒 ${remain.toFixed(1)}s`, BOARD_WIDTH * 0.5, DANGER_Y + 0.5);
    } else {
      ctx.fillStyle =
        nearDangerFactor > 0.2
          ? `rgba(255, 198, 125, ${0.55 + pulse * 0.35})`
          : 'rgba(240, 194, 89, 0.46)';
      ctx.font = '600 9.5px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('结界警戒线', INNER_RIGHT - 8, DANGER_Y - 3);
    }
    ctx.restore();
  }

  private drawAimGuideAndHeldOrb(
    ctx: CanvasRenderingContext2D,
    dropX: number,
    heldTier: number,
    canDrop: boolean,
    isAiming: boolean,
    heldPopProgress: number,
    landingY: number,
    time: number
  ): void {
    const def = ORB_TIERS[heldTier];
    const r = def.radius;

    ctx.save();
    // Vertical dotted guide line from held orb down to predicted impact
    const guideStartY = SPAWN_Y + r + 3;
    const guideEndY = Math.max(guideStartY, landingY);
    const guideGrad = ctx.createLinearGradient(0, guideStartY, 0, guideEndY);
    const activeAlpha = isAiming ? 0.85 : 0.62;
    guideGrad.addColorStop(
      0,
      canDrop ? `rgba(255, 232, 148, ${activeAlpha})` : 'rgba(255, 255, 255, 0.16)'
    );
    guideGrad.addColorStop(
      1,
      canDrop ? `rgba(255, 232, 148, ${isAiming ? 0.32 : 0.16})` : 'rgba(255, 255, 255, 0.04)'
    );

    ctx.beginPath();
    ctx.setLineDash([4, 6]);
    ctx.moveTo(dropX, guideStartY);
    ctx.lineTo(dropX, guideEndY);
    ctx.strokeStyle = guideGrad;
    ctx.lineWidth = isAiming ? 2.4 : 2;
    ctx.stroke();
    ctx.setLineDash([]);

    // Soft landing ring ghost at predicted impact spot
    if (canDrop && landingY > SPAWN_Y + r) {
      ctx.beginPath();
      ctx.arc(dropX, landingY, r, 0, TAU);
      ctx.strokeStyle = isAiming ? 'rgba(255, 232, 148, 0.34)' : 'rgba(255, 232, 148, 0.19)';
      ctx.lineWidth = isAiming ? 1.8 : 1.4;
      ctx.setLineDash([4, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Ornate golden dropper rail with end beads
    ctx.beginPath();
    ctx.moveTo(INNER_LEFT + 14, 16);
    ctx.lineTo(INNER_RIGHT - 14, 16);
    ctx.strokeStyle = 'rgba(240, 194, 89, 0.26)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pointer charm triangle notch on rail
    ctx.beginPath();
    ctx.moveTo(dropX - 6.5, 11);
    ctx.lineTo(dropX + 6.5, 11);
    ctx.lineTo(dropX, 20.5);
    ctx.closePath();
    ctx.fillStyle = canDrop ? '#ffd966' : 'rgba(240, 194, 89, 0.38)';
    ctx.fill();

    // Smooth elastic spring pop-in for the next held orb (0.38 -> 1.12 -> 1.0)
    const p = clamp(heldPopProgress, 0, 1);
    const springScale =
      p >= 1
        ? 1
        : 1 - 0.62 * Math.exp(-3.4 * p) * Math.cos(p * Math.PI * 2.35) * (1 - p * p);
    const scale = canDrop ? springScale : Math.max(0.45, springScale * 0.78);
    const bob = canDrop && p > 0.7 ? Math.sin(time * 4.2) * 1.6 : 0;

    ctx.globalAlpha = canDrop ? clamp(0.25 + p * 0.75, 0, 1) : 0.45;
    this.blitOrbSprite(ctx, dropX, SPAWN_Y + bob, r, heldTier, 0, scale, scale, 0);
    ctx.restore();
  }

  private drawJarFrame(
    ctx: CanvasRenderingContext2D,
    dangerTimer: number,
    nearDangerFactor: number,
    time: number
  ): void {
    ctx.save();
    const isDanger = dangerTimer > 0.05;
    const dangerPulse = isDanger ? 0.5 + 0.5 * Math.sin(time * 9) : 0;

    const leftX = INNER_LEFT - 5;
    const rightX = INNER_RIGHT + 5;
    const botY = FLOOR_Y + 5;
    const topY = JAR_TOP_Y;
    const rad = 16;

    const traceUFrame = (): void => {
      ctx.beginPath();
      ctx.moveTo(leftX, topY);
      ctx.lineTo(leftX, botY - rad);
      ctx.quadraticCurveTo(leftX, botY, leftX + rad, botY);
      ctx.lineTo(rightX - rad, botY);
      ctx.quadraticCurveTo(rightX, botY, rightX, botY - rad);
      ctx.lineTo(rightX, topY);
    };

    // 1. Deep outer lacquer bevel shadow
    traceUFrame();
    ctx.strokeStyle = 'rgba(20, 4, 14, 0.72)';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 2. Warm crimson-vermilion lacquer shrine frame gradient
    const lacquerGrad = ctx.createLinearGradient(leftX, topY, rightX, botY);
    if (isDanger) {
      lacquerGrad.addColorStop(0, `rgba(255, 68, 96, ${0.78 + dangerPulse * 0.22})`);
      lacquerGrad.addColorStop(0.5, '#c91c38');
      lacquerGrad.addColorStop(1, `rgba(255, 68, 96, ${0.78 + dangerPulse * 0.22})`);
    } else {
      lacquerGrad.addColorStop(0, '#cf263c');
      lacquerGrad.addColorStop(0.38, '#9c162b');
      lacquerGrad.addColorStop(0.68, '#bd2036');
      lacquerGrad.addColorStop(1, '#8a1224');
    }
    traceUFrame();
    ctx.strokeStyle = lacquerGrad;
    ctx.lineWidth = 10.5;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 3. Inner metallic antique gold-leaf inlay strip
    const goldGrad = ctx.createLinearGradient(leftX, topY, rightX, botY);
    goldGrad.addColorStop(0, isDanger ? '#ffb3c0' : '#ffe699');
    goldGrad.addColorStop(0.5, isDanger ? '#ff6e88' : '#e0a93e');
    goldGrad.addColorStop(1, isDanger ? '#ffb3c0' : '#ffe699');
    traceUFrame();
    ctx.strokeStyle = goldGrad;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 4. Metallic Gold Corner Clasps (金具) at bottom-left & bottom-right corners!
    this.drawCornerClasp(ctx, leftX, botY, rad, 1);
    this.drawCornerClasp(ctx, rightX, botY, rad, -1);

    // 5. Sculpted Torii-style Crimson & Gold Top Pillar Caps + tiny shide charms
    const sway = Math.sin(time * 2.2) * 0.08;
    for (const side of [-1, 1]) {
      const capX = side < 0 ? leftX : rightX;
      // Crimson under-collar
      ctx.fillStyle = '#871022';
      roundRectPath(ctx, capX - 7.5, topY - 1, 15, 6, 2);
      ctx.fill();
      // Flared brushed gold cap
      const capGrad = ctx.createLinearGradient(capX - 9, topY - 7, capX + 9, topY);
      capGrad.addColorStop(0, '#fff0b3');
      capGrad.addColorStop(0.5, '#e8b343');
      capGrad.addColorStop(1, '#b57b1b');
      ctx.fillStyle = capGrad;
      roundRectPath(ctx, capX - 9, topY - 6.5, 18, 6.5, 3);
      ctx.fill();
      ctx.strokeStyle = '#5c101d';
      ctx.lineWidth = 1.1;
      ctx.stroke();

      // Tiny white paper shide (纸垂) zigzag charm hanging gently from the inner cap edge
      ctx.save();
      ctx.translate(capX - side * 4.5, topY + 3.5);
      ctx.rotate(sway * side);
      ctx.fillStyle = nearDangerFactor > 0.35 ? '#ffd6de' : 'rgba(255, 252, 245, 0.82)';
      ctx.strokeStyle = 'rgba(180, 32, 52, 0.5)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-side * 3.5, 4);
      ctx.lineTo(-side * 1.2, 6);
      ctx.lineTo(-side * 4.2, 10.5);
      ctx.lineTo(-side * 0.2, 12);
      ctx.lineTo(side * 1.6, 7.5);
      ctx.lineTo(-side * 0.5, 5.5);
      ctx.lineTo(side * 2, 1.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 6. Subtle glass reflection sheen along both inner walls
    const leftGlass = ctx.createLinearGradient(INNER_LEFT, 0, INNER_LEFT + 18, 0);
    leftGlass.addColorStop(0, 'rgba(255, 255, 255, 0.11)');
    leftGlass.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = leftGlass;
    ctx.fillRect(INNER_LEFT + 1, JAR_TOP_Y + 8, 16, FLOOR_Y - JAR_TOP_Y - 22);

    const rightGlass = ctx.createLinearGradient(INNER_RIGHT, 0, INNER_RIGHT - 12, 0);
    rightGlass.addColorStop(0, 'rgba(255, 232, 175, 0.06)');
    rightGlass.addColorStop(1, 'rgba(255, 232, 175, 0)');
    ctx.fillStyle = rightGlass;
    ctx.fillRect(INNER_RIGHT - 12, JAR_TOP_Y + 8, 11, FLOOR_Y - JAR_TOP_Y - 22);

    ctx.restore();
  }

  private drawCornerClasp(
    ctx: CanvasRenderingContext2D,
    cornerX: number,
    botY: number,
    rad: number,
    dir: 1 | -1
  ): void {
    ctx.save();
    const g = ctx.createLinearGradient(cornerX, botY - 28, cornerX + dir * 28, botY);
    g.addColorStop(0, '#fff2ba');
    g.addColorStop(0.5, '#e6b145');
    g.addColorStop(1, '#a66d18');

    ctx.beginPath();
    ctx.moveTo(cornerX, botY - 30);
    ctx.lineTo(cornerX, botY - rad);
    ctx.quadraticCurveTo(cornerX, botY, cornerX + dir * rad, botY);
    ctx.lineTo(cornerX + dir * 32, botY);
    ctx.strokeStyle = '#5e121e';
    ctx.lineWidth = 11.5;
    ctx.lineCap = 'butt';
    ctx.stroke();

    ctx.strokeStyle = g;
    ctx.lineWidth = 8.2;
    ctx.stroke();

    // Embossed gold rivet dots on each clasp arm
    ctx.fillStyle = '#fff9de';
    ctx.strokeStyle = '#754409';
    ctx.lineWidth = 0.8;
    for (const [rx, ry] of [
      [cornerX, botY - 23],
      [cornerX + dir * 24, botY],
    ]) {
      ctx.beginPath();
      ctx.arc(rx, ry, 2.1, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawShockwaves(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.shockwaves.length; i++) {
      const s = this.shockwaves[i];
      ctx.save();
      ctx.globalAlpha = clamp(s.alpha, 0, 1);
      ctx.translate(s.x, s.y);

      if (s.isMagicCircle) {
        ctx.rotate(s.rotation);
        // Outer luminous ring
        ctx.beginPath();
        ctx.arc(0, 0, s.radius, 0, TAU);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.lineWidth;
        ctx.stroke();

        // Inner concentric sacred geometry ring
        const innerR = s.radius * 0.82;
        ctx.beginPath();
        ctx.arc(0, 0, innerR, 0, TAU);
        ctx.strokeStyle = '#fff5cc';
        ctx.lineWidth = Math.max(1, s.lineWidth * 0.45);
        ctx.stroke();

        // Inscribed rotating polygonal magic seal (two overlapping triangles / squares)
        const sides = s.points >= 8 ? 4 : 3;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = Math.max(1, s.lineWidth * 0.5);
        for (let k = 0; k < 2; k++) {
          ctx.beginPath();
          for (let v = 0; v < sides; v++) {
            const a = (TAU * v) / sides + (k * Math.PI) / sides;
            const px = Math.cos(a) * innerR;
            const py = Math.sin(a) * innerR;
            if (v === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        }
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, s.radius, 0, TAU);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.lineWidth;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      ctx.save();
      ctx.globalAlpha = clamp(p.alpha, 0, 1);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;

      if (p.shape === 'star') {
        drawStarPath(ctx, 0, 0, 4, p.size, p.size * 0.38);
        ctx.fill();
        // Crisp bright white star core
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.25, 0, TAU);
        ctx.fill();
      } else if (p.shape === 'petal') {
        drawSakuraPetalPath(ctx, p.size);
        ctx.fill();
      } else if (p.shape === 'diamond') {
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size * 0.65, 0);
        ctx.lineTo(0, p.size);
        ctx.lineTo(-p.size * 0.65, 0);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.55, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawFloatingTexts(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.floatingTexts.length; i++) {
      const f = this.floatingTexts[i];
      const t = f.life / f.maxLife;
      const alpha = t < 0.14 ? t / 0.14 : Math.max(0, 1 - (t - 0.3) / 0.7);
      const pop = t < 0.18 ? 0.72 + (t / 0.18) * 0.38 : 1.0;

      ctx.save();
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.translate(f.x, f.y);
      ctx.scale(f.scale * pop, f.scale * pop);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.font = '900 18px system-ui, sans-serif';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(14, 10, 30, 0.88)';
      ctx.strokeText(f.text, 0, 0);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, 0, 0);

      if (f.subText) {
        ctx.font = '800 12.5px system-ui, sans-serif';
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = 'rgba(14, 10, 30, 0.92)';
        ctx.strokeText(f.subText, 0, -18);
        ctx.fillStyle = '#ffe680';
        ctx.fillText(f.subText, 0, -18);
      }
      ctx.restore();
    }
  }
}

/** Draws an authentic notched cherry-blossom petal centered at (0, 0). */
function drawSakuraPetalPath(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.beginPath();
  ctx.moveTo(0, size * 0.75);
  ctx.bezierCurveTo(-size * 0.75, size * 0.25, -size * 0.72, -size * 0.55, -size * 0.22, -size * 0.82);
  ctx.lineTo(0, -size * 0.52);
  ctx.lineTo(size * 0.22, -size * 0.82);
  ctx.bezierCurveTo(size * 0.72, -size * 0.55, size * 0.75, size * 0.25, 0, size * 0.75);
  ctx.closePath();
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}
