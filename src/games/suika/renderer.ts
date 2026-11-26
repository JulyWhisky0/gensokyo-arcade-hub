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

interface AmbientPetal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  vAngle: number;
  alpha: number;
  isStar: boolean;
}

export interface RenderStageParams {
  orbs: readonly OrbBody[];
  heldTier: number;
  dropX: number;
  canDrop: boolean;
  showGuide: boolean;
  predictedLandingY: number;
  dangerTimer: number;
  comboCount: number;
  time: number;
}

export class SuikaRenderer {
  private particles: Particle[] = [];
  private shockwaves: Shockwave[] = [];
  private floatingTexts: FloatingText[] = [];
  private ambient: AmbientPetal[] = [];
  private shakeMag = 0;

  constructor() {
    this.initAmbient();
  }

  private initAmbient(): void {
    this.ambient = [];
    for (let i = 0; i < 18; i++) {
      const isStar = i % 3 === 0;
      this.ambient.push({
        x: INNER_LEFT + Math.random() * INNER_WIDTH,
        y: JAR_TOP_Y + Math.random() * (FLOOR_Y - JAR_TOP_Y),
        vx: isStar ? 0 : -6 - Math.random() * 10,
        vy: isStar ? -3 - Math.random() * 4 : 10 + Math.random() * 14,
        size: isStar ? 2.2 + Math.random() * 2.2 : 3.2 + Math.random() * 3.2,
        angle: Math.random() * TAU,
        vAngle: (Math.random() - 0.5) * 1.4,
        alpha: 0.16 + Math.random() * 0.24,
        isStar,
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
      // Massive celebratory fireworks!
      this.shakeMag = Math.min(14, this.shakeMag + 12);
      const colors = ['#3be382', '#ffe169', '#ff5e78', '#7ce2ff', '#ffffff'];
      for (let w = 0; w < 3; w++) {
        this.shockwaves.push({
          x: ev.x,
          y: ev.y,
          radius: 20 + w * 18,
          maxRadius: 210 + w * 45,
          color: colors[w],
          alpha: 0.95,
          lineWidth: 6 - w * 1.2,
        });
      }
      for (let i = 0; i < 64; i++) {
        const ang = (TAU * i) / 64 + (Math.random() - 0.5) * 0.2;
        const speed = 110 + Math.random() * 280;
        this.particles.push({
          x: ev.x,
          y: ev.y,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed - 60,
          size: 4 + Math.random() * 5,
          color: colors[i % colors.length],
          alpha: 1,
          life: 0,
          maxLife: 0.85 + Math.random() * 0.55,
          rotation: Math.random() * TAU,
          vRot: (Math.random() - 0.5) * 9,
          shape: i % 3 === 0 ? 'star' : i % 3 === 1 ? 'petal' : 'diamond',
        });
      }
      this.floatingTexts.push({
        x: clamp(ev.x, 110, BOARD_WIDTH - 110),
        y: Math.max(150, ev.y - 20),
        vy: -42,
        text: `+${ev.points}`,
        subText: '🍉 双萃香大爆发!!',
        color: '#ffe169',
        scale: 1.45,
        life: 0,
        maxLife: 1.85,
      });
      return;
    }

    const def = ORB_TIERS[ev.newTier];
    const isBig = ev.newTier >= 7;
    const isSuika = ev.newTier === 10;

    // Subtle screen shake on medium-to-large merges
    if (ev.newTier >= 5) {
      this.shakeMag = Math.min(11, this.shakeMag + (ev.newTier - 4) * 1.45);
    }

    // Expanding glowing shockwave
    this.shockwaves.push({
      x: ev.x,
      y: ev.y,
      radius: def.radius * 0.55,
      maxRadius: def.radius * (isSuika ? 2.4 : 1.85),
      color: def.rim,
      alpha: isBig ? 0.92 : 0.72,
      lineWidth: isBig ? 4.2 : 2.6,
    });
    if (isSuika) {
      this.shockwaves.push({
        x: ev.x,
        y: ev.y,
        radius: def.radius * 0.35,
        maxRadius: def.radius * 2.9,
        color: '#3be382',
        alpha: 0.9,
        lineWidth: 5,
      });
    }

    // Themed burst particles
    const pCount = isSuika ? 46 : isBig ? 26 : 12 + ev.newTier * 2;
    for (let i = 0; i < pCount; i++) {
      const ang = (TAU * i) / pCount + (Math.random() - 0.5) * 0.35;
      const speed = (65 + Math.random() * 145) * (isSuika ? 1.55 : isBig ? 1.2 : 1);
      const shape: Particle['shape'] =
        ev.newTier === 1
          ? 'diamond'
          : ev.newTier === 7 || ev.newTier === 3 || isSuika
          ? i % 2 === 0
            ? 'star'
            : 'petal'
          : i % 3 === 0
          ? 'star'
          : i % 3 === 1
          ? 'petal'
          : 'dot';
      this.particles.push({
        x: ev.x + Math.cos(ang) * def.radius * 0.3,
        y: ev.y + Math.sin(ang) * def.radius * 0.3,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed - 35,
        size: (isBig ? 4.2 : 3.2) + Math.random() * 3.2,
        color: def.particleColors[i % def.particleColors.length],
        alpha: 1,
        life: 0,
        maxLife: (isSuika ? 0.85 : 0.52) + Math.random() * 0.32,
        rotation: Math.random() * TAU,
        vRot: (Math.random() - 0.5) * 8,
        shape,
      });
    }

    // Floating score + combo / milestone banner
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
      vy: -48,
      text: `+${ev.points}`,
      subText,
      color: isSuika ? '#5ee69c' : ev.combo >= 2 ? '#ffe169' : '#ffffff',
      scale: isSuika ? 1.35 : ev.combo >= 2 ? 1.15 : isBig ? 1.12 : 0.96,
      life: 0,
      maxLife: isSuika ? 1.65 : ev.combo >= 2 ? 1.15 : 0.9,
    });
  }

  updateEffects(dt: number): void {
    const cdt = Math.min(0.05, Math.max(0, dt));

    // Shake decay
    if (this.shakeMag > 0.05) {
      this.shakeMag *= Math.pow(0.0015, cdt);
    } else {
      this.shakeMag = 0;
    }

    // Ambient sakura & starlight drift
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
      if (a.x < INNER_LEFT - 8) a.x = INNER_RIGHT + 6;
      else if (a.x > INNER_RIGHT + 8) a.x = INNER_LEFT - 6;
    }

    // Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.radius += (s.maxRadius - s.radius) * Math.min(1, cdt * 9.5) + 45 * cdt;
      s.alpha -= cdt * 2.1;
      if (s.alpha <= 0.01 || s.radius >= s.maxRadius) {
        this.shockwaves.splice(i, 1);
      }
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += cdt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += 320 * cdt;
      p.vx *= Math.pow(0.28, cdt);
      p.x += p.vx * cdt;
      p.y += p.vy * cdt;
      p.rotation += p.vRot * cdt;
      p.alpha = 1 - p.life / p.maxLife;
    }

    // Floating score popups
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
      showGuide,
      predictedLandingY,
      dangerTimer,
      time,
    } = params;

    ctx.save();

    // Subtle screen shake
    if (this.shakeMag > 0.1) {
      const sx = (Math.random() - 0.5) * 2 * this.shakeMag;
      const sy = (Math.random() - 0.5) * 2 * this.shakeMag;
      ctx.translate(sx, sy);
    }

    // 1. Background canvas fill (Gensokyo twilight shrine indigo)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, BOARD_HEIGHT);
    bgGrad.addColorStop(0, '#171130');
    bgGrad.addColorStop(0.55, '#211845');
    bgGrad.addColorStop(1, '#141e2e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

    // Subtle moonlit halo at top of drop zone
    const topGlow = ctx.createRadialGradient(
      BOARD_WIDTH * 0.5,
      48,
      10,
      BOARD_WIDTH * 0.5,
      58,
      210
    );
    topGlow.addColorStop(0, 'rgba(240, 194, 89, 0.14)');
    topGlow.addColorStop(0.6, 'rgba(200, 35, 51, 0.06)');
    topGlow.addColorStop(1, 'rgba(23, 17, 48, 0)');
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, 0, BOARD_WIDTH, 220);

    // 2. Jar interior backing
    ctx.save();
    roundRectPath(
      ctx,
      INNER_LEFT,
      JAR_TOP_Y,
      INNER_WIDTH,
      FLOOR_Y - JAR_TOP_Y,
      12
    );
    const jarGrad = ctx.createLinearGradient(0, JAR_TOP_Y, 0, FLOOR_Y);
    jarGrad.addColorStop(0, 'rgba(14, 10, 32, 0.62)');
    jarGrad.addColorStop(0.65, 'rgba(22, 16, 48, 0.72)');
    jarGrad.addColorStop(1, 'rgba(16, 26, 40, 0.85)');
    ctx.fillStyle = jarGrad;
    ctx.fill();
    ctx.clip();

    // Subtle traditional Japanese circular crest watermark in jar center
    this.drawShrineWatermark(ctx);

    // Ambient floating sakura petals & starlight
    this.drawAmbient(ctx, time);

    // Danger red warning vignette when dangerTimer > 0
    if (dangerTimer > 0) {
      const ratio = clamp(dangerTimer / DANGER_GRACE_SECONDS, 0, 1);
      const pulse = 0.55 + 0.45 * Math.sin(time * (6 + ratio * 10));
      const warnGrad = ctx.createLinearGradient(0, JAR_TOP_Y, 0, DANGER_Y + 90);
      warnGrad.addColorStop(0, `rgba(235, 45, 72, ${(0.14 + ratio * 0.32) * pulse})`);
      warnGrad.addColorStop(1, 'rgba(235, 45, 72, 0)');
      ctx.fillStyle = warnGrad;
      ctx.fillRect(INNER_LEFT, JAR_TOP_Y, INNER_WIDTH, DANGER_Y + 90 - JAR_TOP_Y);
    }

    ctx.restore();

    // 3. Danger line & countdown bar
    this.drawDangerLine(ctx, dangerTimer, time);

    // 4. Vertical dotted aim guide + held orb preview
    if (showGuide) {
      this.drawAimGuideAndHeldOrb(ctx, dropX, heldTier, canDrop, predictedLandingY, time);
    }

    // 5. All physics orbs (sorted subtly by id for stable overlap draw order)
    for (let i = 0; i < orbs.length; i++) {
      const o = orbs[i];
      let scaleX = 1;
      let scaleY = 1;
      if (o.spawnAnim > 0) {
        // Juicy damped squash-and-stretch pop on birth/merge
        const p = o.spawnAnim;
        const bounce = Math.sin(p * Math.PI * 1.5) * p * 0.22;
        scaleX = 1 + bounce;
        scaleY = 1 - bounce * 0.85;
      }

      // Red pulsing ring behind an orb currently violating danger line
      if (o.inDanger && dangerTimer > 0.05) {
        const pulse = 0.5 + 0.5 * Math.sin(time * 12);
        ctx.save();
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.radius + 5 + pulse * 3, 0, TAU);
        ctx.strokeStyle = `rgba(255, 72, 96, ${0.45 + pulse * 0.45})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }

      drawTouhouOrb(ctx, o.x, o.y, o.radius, o.tier, o.angle, {
        scaleX,
        scaleY,
        flash: o.flashTimer,
        time,
      });
    }

    // 6. Shockwaves & Burst Particles
    this.drawShockwaves(ctx);
    this.drawParticles(ctx);

    // 7. Ornate Shrine Jar Walls & Corner Gold Brackets (drawn cleanly over edges)
    this.drawJarFrame(ctx, dangerTimer, time);

    // 8. Floating score & combo popups
    this.drawFloatingTexts(ctx);

    ctx.restore();
  }

  private drawShrineWatermark(ctx: CanvasRenderingContext2D): void {
    const cx = BOARD_WIDTH * 0.5;
    const cy = (JAR_TOP_Y + FLOOR_Y) * 0.5 + 14;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = 'rgba(240, 194, 89, 0.055)';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.arc(0, 0, 118, 0, TAU);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 96, 0, TAU);
    ctx.stroke();

    // Subtle Yin-Yang curve
    ctx.beginPath();
    ctx.arc(0, -48, 48, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.arc(0, 48, 48, -Math.PI * 0.5, Math.PI * 0.5, true);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -48, 12, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 48, 12, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  private drawAmbient(ctx: CanvasRenderingContext2D, time: number): void {
    for (let i = 0; i < this.ambient.length; i++) {
      const a = this.ambient[i];
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.angle);
      if (a.isStar) {
        const twinkle = 0.65 + 0.35 * Math.sin(time * 2.5 + i);
        ctx.fillStyle = `rgba(255, 232, 148, ${a.alpha * twinkle})`;
        drawStarPath(ctx, 0, 0, 4, a.size, a.size * 0.38);
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(255, 178, 206, ${a.alpha})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, a.size, a.size * 0.52, 0, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawDangerLine(ctx: CanvasRenderingContext2D, dangerTimer: number, time: number): void {
    const active = dangerTimer > 0.02;
    const ratio = clamp(dangerTimer / DANGER_GRACE_SECONDS, 0, 1);
    const pulse = active ? 0.55 + 0.45 * Math.sin(time * (7 + ratio * 10)) : 0.34;

    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([8, 6]);
    ctx.moveTo(INNER_LEFT + 6, DANGER_Y);
    ctx.lineTo(INNER_RIGHT - 6, DANGER_Y);
    ctx.strokeStyle = active
      ? `rgba(255, 76, 98, ${0.55 + pulse * 0.45})`
      : 'rgba(240, 194, 89, 0.30)';
    ctx.lineWidth = active ? 2.4 : 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    // Small shrine warning tag or countdown pill on right side of danger line
    if (active) {
      const remain = Math.max(0, DANGER_GRACE_SECONDS - dangerTimer);
      const pillW = 112;
      const pillH = 22;
      const px = BOARD_WIDTH * 0.5 - pillW * 0.5;
      const py = DANGER_Y - pillH * 0.5;

      roundRectPath(ctx, px, py, pillW, pillH, 11);
      ctx.fillStyle = 'rgba(42, 10, 22, 0.92)';
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 92, 112, ${0.65 + pulse * 0.35})`;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Progress bar fill inside pill
      ctx.save();
      roundRectPath(ctx, px + 2, py + 2, pillW - 4, pillH - 4, 9);
      ctx.clip();
      ctx.fillStyle = 'rgba(235, 52, 76, 0.48)';
      ctx.fillRect(px + 2, py + 2, (pillW - 4) * ratio, pillH - 4);
      ctx.restore();

      ctx.fillStyle = '#fff5f7';
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`警戒 ${remain.toFixed(1)}s`, BOARD_WIDTH * 0.5, DANGER_Y + 0.5);
    } else {
      ctx.fillStyle = 'rgba(240, 194, 89, 0.42)';
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
    guideGrad.addColorStop(0, canDrop ? 'rgba(255, 232, 148, 0.62)' : 'rgba(255, 255, 255, 0.16)');
    guideGrad.addColorStop(1, canDrop ? 'rgba(255, 232, 148, 0.16)' : 'rgba(255, 255, 255, 0.04)');

    ctx.beginPath();
    ctx.setLineDash([4, 6]);
    ctx.moveTo(dropX, guideStartY);
    ctx.lineTo(dropX, guideEndY);
    ctx.strokeStyle = guideGrad;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    // Soft landing ring ghost at predicted impact spot
    if (canDrop && landingY > SPAWN_Y + r) {
      ctx.beginPath();
      ctx.arc(dropX, landingY, r, 0, TAU);
      ctx.strokeStyle = 'rgba(255, 232, 148, 0.18)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Subtle dropper shrine talisman rail
    ctx.beginPath();
    ctx.moveTo(INNER_LEFT + 14, 16);
    ctx.lineTo(INNER_RIGHT - 14, 16);
    ctx.strokeStyle = 'rgba(240, 194, 89, 0.22)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pointer triangle notch on rail
    ctx.beginPath();
    ctx.moveTo(dropX - 6, 12);
    ctx.lineTo(dropX + 6, 12);
    ctx.lineTo(dropX, 20);
    ctx.closePath();
    ctx.fillStyle = canDrop ? '#f0c259' : 'rgba(240, 194, 89, 0.35)';
    ctx.fill();

    // Held orb preview (gentle bob while ready, dimmed/shrunk during cooldown)
    const bob = canDrop ? Math.sin(time * 4.2) * 1.8 : 0;
    const scale = canDrop ? 1 : 0.72;
    ctx.globalAlpha = canDrop ? 1 : 0.42;
    drawTouhouOrb(ctx, dropX, SPAWN_Y + bob, r, heldTier, 0, {
      scaleX: scale,
      scaleY: scale,
      time,
    });
    ctx.restore();
  }

  private drawJarFrame(ctx: CanvasRenderingContext2D, dangerTimer: number, time: number): void {
    ctx.save();
    const isDanger = dangerTimer > 0.05;
    const dangerPulse = isDanger ? 0.5 + 0.5 * Math.sin(time * 9) : 0;

    // U-shaped shrine jar wall (open top for drops!)
    const leftX = INNER_LEFT - 5;
    const rightX = INNER_RIGHT + 5;
    const botY = FLOOR_Y + 5;
    const topY = JAR_TOP_Y;
    const rad = 16;

    // Outer crimson lacquer backing line
    ctx.beginPath();
    ctx.moveTo(leftX, topY);
    ctx.lineTo(leftX, botY - rad);
    ctx.quadraticCurveTo(leftX, botY, leftX + rad, botY);
    ctx.lineTo(rightX - rad, botY);
    ctx.quadraticCurveTo(rightX, botY, rightX, botY - rad);
    ctx.lineTo(rightX, topY);
    ctx.strokeStyle = isDanger
      ? `rgba(255, 76, 98, ${0.7 + dangerPulse * 0.3})`
      : '#c82333';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Inner gold leaf inlay border
    ctx.beginPath();
    ctx.moveTo(leftX, topY);
    ctx.lineTo(leftX, botY - rad);
    ctx.quadraticCurveTo(leftX, botY, leftX + rad, botY);
    ctx.lineTo(rightX - rad, botY);
    ctx.quadraticCurveTo(rightX, botY, rightX, botY - rad);
    ctx.lineTo(rightX, topY);
    ctx.strokeStyle = isDanger ? '#ff9eb0' : '#f0c259';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Golden top pillar caps (Torii-inspired finials)
    for (const capX of [leftX, rightX]) {
      ctx.fillStyle = '#f0c259';
      roundRectPath(ctx, capX - 7, topY - 4, 14, 7, 3);
      ctx.fill();
      ctx.strokeStyle = '#6e1120';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // Subtle glass reflection sheen along left inner wall
    const glassGrad = ctx.createLinearGradient(INNER_LEFT, 0, INNER_LEFT + 18, 0);
    glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = glassGrad;
    ctx.fillRect(INNER_LEFT + 1, JAR_TOP_Y + 6, 16, FLOOR_Y - JAR_TOP_Y - 18);

    ctx.restore();
  }

  private drawShockwaves(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.shockwaves.length; i++) {
      const s = this.shockwaves[i];
      ctx.save();
      ctx.globalAlpha = clamp(s.alpha, 0, 1);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, TAU);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.lineWidth;
      ctx.stroke();
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
        drawStarPath(ctx, 0, 0, 4, p.size, p.size * 0.4);
        ctx.fill();
      } else if (p.shape === 'petal') {
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.52, 0, 0, TAU);
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
      const alpha = t < 0.15 ? t / 0.15 : Math.max(0, 1 - (t - 0.3) / 0.7);
      const pop = t < 0.18 ? 0.75 + (t / 0.18) * 0.35 : 1.0;

      ctx.save();
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.translate(f.x, f.y);
      ctx.scale(f.scale * pop, f.scale * pop);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.font = '900 18px system-ui, sans-serif';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(14, 10, 30, 0.85)';
      ctx.strokeText(f.text, 0, 0);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, 0, 0);

      if (f.subText) {
        ctx.font = '800 12.5px system-ui, sans-serif';
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = 'rgba(14, 10, 30, 0.9)';
        ctx.strokeText(f.subText, 0, -18);
        ctx.fillStyle = '#ffe680';
        ctx.fillText(f.subText, 0, -18);
      }
      ctx.restore();
    }
  }
}

export interface OrbDrawOptions {
  scaleX?: number;
  scaleY?: number;
  flash?: number;
  time?: number;
  iconMode?: boolean;
}

/**
 * Draws one of the 11 distinctive Touhou chibi character orbs cleanly on Canvas 2D.
 */
export function drawTouhouOrb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  tier: number,
  angle: number,
  options: OrbDrawOptions = {}
): void {
  const def = ORB_TIERS[tier] ?? ORB_TIERS[0];
  const scaleX = options.scaleX ?? 1;
  const scaleY = options.scaleY ?? 1;
  const flash = options.flash ?? 0;
  const time = options.time ?? 0;
  const iconMode = options.iconMode ?? false;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (scaleX !== 1 || scaleY !== 1) {
    ctx.scale(scaleX, scaleY);
  }

  // Soft outer aura for big tiers or icons
  if (!iconMode && tier >= 7) {
    const auraR = r * (tier === 10 ? 1.18 + Math.sin(time * 4) * 0.03 : 1.11);
    const aura = ctx.createRadialGradient(0, 0, r * 0.78, 0, 0, auraR);
    aura.addColorStop(0, def.glow);
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, auraR, 0, TAU);
    ctx.fill();
  }

  // 1. Back accessories (wings, horns, back bow tails, phantom wisp)
  drawBackAccessories(ctx, r, tier, time, iconMode);

  // 2. Main 3D glossy sphere body
  const sphereGrad = ctx.createRadialGradient(-r * 0.34, -r * 0.36, r * 0.08, 0, 0, r * 1.05);
  sphereGrad.addColorStop(0, lightenHighlight(tier));
  sphereGrad.addColorStop(0.52, def.primary);
  sphereGrad.addColorStop(1, def.secondary);

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fillStyle = sphereGrad;
  ctx.fill();

  // 3. Clipped inner character motifs (stripes, stars, clock dial, gap eye, etc.)
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.clip();
  drawInnerMotifs(ctx, r, tier, time);

  // Glossy candy-glass specular highlight
  ctx.save();
  ctx.translate(-r * 0.34, -r * 0.38);
  ctx.rotate(-0.52);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.34)';
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.34, r * 0.17, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Secondary tiny upper highlight dot
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.beginPath();
  ctx.arc(-r * 0.52, -r * 0.14, r * 0.06, 0, TAU);
  ctx.fill();

  // Soft bottom bounce light rim
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.92, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = Math.max(1.2, r * 0.06);
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.restore(); // end sphere clip

  // 4. Outer crisp rim highlight stroke
  ctx.beginPath();
  ctx.arc(0, 0, r - 0.5, 0, TAU);
  ctx.strokeStyle = def.rim;
  ctx.lineWidth = Math.max(1.2, Math.min(3.0, r * 0.045));
  ctx.stroke();

  // 5. Chibi Anime Face (eyes, blush, mouth)
  drawChibiFace(ctx, r, tier);

  // 6. Front signature Touhou headgear/ribbons
  drawFrontAccessories(ctx, r, tier);

  // 7. Merge birth bright flash overlay
  if (flash > 0.01) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fillStyle = `rgba(255, 252, 232, ${flash * 0.58})`;
    ctx.fill();
  }

  ctx.restore();
}

function lightenHighlight(tier: number): string {
  switch (tier) {
    case 0: return '#ffffff';
    case 1: return '#d6f9ff';
    case 2: return '#7563a3';
    case 3: return '#fff1a8';
    case 4: return '#ff788e';
    case 5: return '#f5f8ff';
    case 6: return '#b5ffe3';
    case 7: return '#574b87';
    case 8: return '#ff7c8c';
    case 9: return '#ba8cff';
    case 10: return '#6df2a6';
    default: return '#ffffff';
  }
}

function drawBackAccessories(
  ctx: CanvasRenderingContext2D,
  r: number,
  tier: number,
  time: number,
  iconMode: boolean
): void {
  const ext = iconMode ? 0.82 : 1.0; // slightly tighter overhang in small square icons

  switch (tier) {
    case 0: {
      // Kedama: soft fluffy cloud tufts around rim
      ctx.fillStyle = '#fffdf9';
      ctx.strokeStyle = '#d3c9eb';
      ctx.lineWidth = Math.max(1, r * 0.07);
      for (let i = 0; i < 8; i++) {
        const a = (TAU * i) / 8 + 0.2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86, r * 0.25, 0, TAU);
        ctx.fill();
      }
      break;
    }
    case 1: {
      // Cirno: 6 translucent cyan ice-crystal diamond wing shards
      ctx.save();
      ctx.fillStyle = 'rgba(130, 238, 255, 0.85)';
      ctx.strokeStyle = '#e8fbff';
      ctx.lineWidth = Math.max(0.9, r * 0.05);
      const wingAngles = [-0.55, -0.1, 0.35];
      for (const side of [-1, 1]) {
        for (let k = 0; k < wingAngles.length; k++) {
          ctx.save();
          ctx.scale(side, 1);
          ctx.rotate(wingAngles[k]);
          const len = r * (0.48 - k * 0.04) * ext;
          ctx.beginPath();
          ctx.moveTo(r * 0.84, 0);
          ctx.lineTo(r * 0.84 + len * 0.55, -r * 0.14);
          ctx.lineTo(r * 0.84 + len, 0);
          ctx.lineTo(r * 0.84 + len * 0.55, r * 0.14);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }
      ctx.restore();
      break;
    }
    case 3: {
      // Flandre: iconic rainbow crystal wing gems arching symmetrically
      const rainbow = ['#ff4d6d', '#ff9f1c', '#ffe169', '#2ec4b6', '#4cc9f0', '#7209b7'];
      ctx.save();
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        // Dark metallic wing branch
        ctx.beginPath();
        ctx.moveTo(r * 0.72, -r * 0.08);
        ctx.quadraticCurveTo(r * 1.15 * ext, -r * 0.52 * ext, r * 1.24 * ext, -r * 0.12);
        ctx.strokeStyle = '#3b2638';
        ctx.lineWidth = Math.max(1.4, r * 0.065);
        ctx.lineCap = 'round';
        ctx.stroke();

        // 3 shimmering rainbow crystal gems per side
        const gems = [
          { x: r * 0.95 * ext, y: -r * 0.42 * ext, c: rainbow[side < 0 ? 0 : 3] },
          { x: r * 1.12 * ext, y: -r * 0.32 * ext, c: rainbow[side < 0 ? 1 : 4] },
          { x: r * 1.2 * ext, y: -r * 0.08 * ext, c: rainbow[side < 0 ? 2 : 5] },
        ];
        for (const g of gems) {
          ctx.fillStyle = g.c;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = Math.max(0.8, r * 0.03);
          ctx.beginPath();
          ctx.moveTo(g.x, g.y - r * 0.14);
          ctx.lineTo(g.x + r * 0.1, g.y);
          ctx.lineTo(g.x, g.y + r * 0.14);
          ctx.lineTo(g.x - r * 0.1, g.y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();
      break;
    }
    case 4: {
      // Remilia: sleek dark scarlet bat wings
      ctx.save();
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.beginPath();
        ctx.moveTo(r * 0.78, -r * 0.05);
        ctx.quadraticCurveTo(r * 1.08 * ext, -r * 0.54 * ext, r * 1.26 * ext, -r * 0.25 * ext);
        ctx.quadraticCurveTo(r * 1.14 * ext, -r * 0.02, r * 1.18 * ext, r * 0.16 * ext);
        ctx.quadraticCurveTo(r * 1.0 * ext, r * 0.08, r * 0.82, r * 0.22);
        ctx.closePath();
        ctx.fillStyle = '#38091b';
        ctx.fill();
        ctx.strokeStyle = '#d93654';
        ctx.lineWidth = Math.max(1, r * 0.04);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      break;
    }
    case 6: {
      // Youmu: glowing cute translucent half-phantom wisp (半灵)
      const wobble = iconMode ? 0 : Math.sin(time * 3.2) * r * 0.05;
      const wx = r * 0.94 * ext;
      const wy = -r * 0.42 * ext + wobble;
      const wr = r * 0.22;
      ctx.save();
      ctx.fillStyle = 'rgba(235, 255, 248, 0.9)';
      ctx.strokeStyle = 'rgba(130, 240, 200, 0.85)';
      ctx.lineWidth = Math.max(1, r * 0.035);
      ctx.beginPath();
      ctx.arc(wx, wy, wr, 0, TAU);
      ctx.fill();
      ctx.stroke();
      // Tapered ghostly tail
      ctx.beginPath();
      ctx.moveTo(wx - wr * 0.3, wy + wr * 0.7);
      ctx.quadraticCurveTo(wx + wr * 0.6, wy + wr * 1.8, wx + wr * 1.25, wy + wr * 1.1);
      ctx.quadraticCurveTo(wx + wr * 0.7, wy + wr * 0.5, wx + wr * 0.6, wy);
      ctx.fill();
      ctx.restore();
      break;
    }
    case 8: {
      // Reimu: big sweeping crimson shrine maiden ribbon tails fanning out from crown
      ctx.save();
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.82);
        ctx.quadraticCurveTo(r * 0.55 * ext, -r * 1.24 * ext, r * 0.98 * ext, -r * 0.88 * ext);
        ctx.lineTo(r * 0.78 * ext, -r * 0.48 * ext);
        ctx.quadraticCurveTo(r * 0.38 * ext, -r * 0.66 * ext, 0, -r * 0.72);
        ctx.closePath();
        ctx.fillStyle = '#e02840';
        ctx.fill();
        ctx.strokeStyle = '#fff5e6';
        ctx.lineWidth = Math.max(1.2, r * 0.035);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      break;
    }
    case 10: {
      // Ibuki Suika: curved golden-orange twin oni horns!
      ctx.save();
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        const hornGrad = ctx.createLinearGradient(r * 0.35, -r * 0.75, r * 0.62, -r * 1.32);
        hornGrad.addColorStop(0, '#c96f18');
        hornGrad.addColorStop(0.55, '#f7b733');
        hornGrad.addColorStop(1, '#fff2a6');
        ctx.beginPath();
        ctx.moveTo(r * 0.24, -r * 0.82);
        ctx.quadraticCurveTo(r * 0.68 * ext, -r * 1.06 * ext, r * 0.58 * ext, -r * 1.28 * ext);
        ctx.quadraticCurveTo(r * 0.36 * ext, -r * 1.12 * ext, r * 0.48, -r * 0.74);
        ctx.closePath();
        ctx.fillStyle = hornGrad;
        ctx.fill();
        ctx.strokeStyle = '#fff5c2';
        ctx.lineWidth = Math.max(1.2, r * 0.028);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      break;
    }
  }
}

function drawInnerMotifs(
  ctx: CanvasRenderingContext2D,
  r: number,
  tier: number,
  time: number
): void {
  switch (tier) {
    case 1: {
      // Cirno: icy crystal facets & tiny ⑨ sheen
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = Math.max(1, r * 0.05);
      ctx.beginPath();
      ctx.moveTo(-r * 0.75, r * 0.35);
      ctx.lineTo(-r * 0.3, r * 0.62);
      ctx.lineTo(r * 0.3, r * 0.62);
      ctx.lineTo(r * 0.75, r * 0.35);
      ctx.stroke();

      if (r >= 16) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
        ctx.font = `800 ${Math.round(r * 0.42)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⑨', r * 0.46, -r * 0.38);
      }
      break;
    }
    case 2: {
      // Rumia: twilight crescent shadow & dark crimson ribbon collar
      ctx.fillStyle = 'rgba(12, 8, 28, 0.38)';
      ctx.beginPath();
      ctx.arc(r * 0.25, r * 0.35, r * 0.9, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#e0485e';
      ctx.lineWidth = Math.max(1.5, r * 0.09);
      ctx.beginPath();
      ctx.arc(0, r * 0.92, r * 0.62, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      break;
    }
    case 3: {
      // Flandre: golden upper hair glow & crimson hem
      const dress = ctx.createLinearGradient(0, r * 0.2, 0, r);
      dress.addColorStop(0, 'rgba(224, 62, 82, 0)');
      dress.addColorStop(1, 'rgba(180, 20, 48, 0.75)');
      ctx.fillStyle = dress;
      ctx.fillRect(-r, r * 0.2, r * 2, r * 0.85);
      break;
    }
    case 4: {
      // Remilia: delicate pale-lilac moonlit cap sheen & deep velvet collar
      ctx.fillStyle = 'rgba(222, 208, 255, 0.24)';
      ctx.beginPath();
      ctx.arc(0, -r * 0.55, r * 0.76, 0, TAU);
      ctx.fill();
      break;
    }
    case 5: {
      // Sakuya: faint golden pocket-watch clockwork dial motif
      ctx.save();
      ctx.strokeStyle = 'rgba(240, 194, 89, 0.35)';
      ctx.lineWidth = Math.max(1, r * 0.032);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.76, 0, TAU);
      ctx.stroke();
      for (let h = 0; h < 12; h++) {
        const a = (TAU * h) / 12;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.66, Math.sin(a) * r * 0.66);
        ctx.lineTo(Math.cos(a) * r * 0.76, Math.sin(a) * r * 0.76);
        ctx.stroke();
      }
      // Subtle clock hands
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -r * 0.48);
      ctx.moveTo(0, 0);
      ctx.lineTo(r * 0.32, r * 0.16);
      ctx.strokeStyle = 'rgba(240, 194, 89, 0.28)';
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 6: {
      // Youmu: crisp dark-teal tunic hem & white V-collar accent
      ctx.fillStyle = 'rgba(14, 72, 58, 0.55)';
      ctx.beginPath();
      ctx.arc(0, r * 0.98, r * 0.66, Math.PI * 1.1, Math.PI * 1.9);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = Math.max(1.5, r * 0.055);
      ctx.beginPath();
      ctx.moveTo(-r * 0.34, r * 0.58);
      ctx.lineTo(0, r * 0.78);
      ctx.lineTo(r * 0.34, r * 0.58);
      ctx.stroke();
      break;
    }
    case 7: {
      // Marisa: golden side curls + twinkling starry night sparkles
      ctx.fillStyle = 'rgba(255, 214, 89, 0.25)';
      ctx.beginPath();
      ctx.arc(-r * 0.72, r * 0.12, r * 0.38, 0, TAU);
      ctx.arc(r * 0.72, r * 0.12, r * 0.38, 0, TAU);
      ctx.fill();

      const stars = [
        { x: -r * 0.56, y: -r * 0.22, s: r * 0.11 },
        { x: r * 0.55, y: -r * 0.3, s: r * 0.13 },
        { x: -r * 0.48, y: r * 0.52, s: r * 0.09 },
        { x: r * 0.5, y: r * 0.48, s: r * 0.1 },
      ];
      ctx.fillStyle = '#ffe169';
      for (const st of stars) {
        drawStarPath(ctx, st.x, st.y, 4, st.s, st.s * 0.38);
        ctx.fill();
      }
      break;
    }
    case 8: {
      // Reimu: shrine white sash lower band & mini Yin-Yang crest
      ctx.fillStyle = 'rgba(255, 248, 240, 0.9)';
      ctx.beginPath();
      ctx.arc(0, r * 1.05, r * 0.72, Math.PI * 1.08, Math.PI * 1.92);
      ctx.fill();

      // Small Yin-Yang orb accent on lower-right
      const yx = r * 0.48;
      const yy = r * 0.44;
      const yr = r * 0.19;
      ctx.save();
      ctx.translate(yx, yy);
      ctx.beginPath();
      ctx.arc(0, 0, yr, 0, TAU);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, yr, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.fillStyle = '#d92338';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -yr * 0.5, yr * 0.5, 0, TAU);
      ctx.fillStyle = '#d92338';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, yr * 0.5, yr * 0.5, 0, TAU);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -yr * 0.5, yr * 0.18, 0, TAU);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, yr * 0.5, yr * 0.18, 0, TAU);
      ctx.fillStyle = '#d92338';
      ctx.fill();
      ctx.strokeStyle = '#9e1328';
      ctx.lineWidth = Math.max(0.8, r * 0.018);
      ctx.beginPath();
      ctx.arc(0, 0, yr, 0, TAU);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 9: {
      // Yukari: twilight gap (スキマ) with eerie-cute golden eye along lower rim
      const gy = r * 0.58;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-r * 0.52, gy);
      ctx.quadraticCurveTo(0, gy - r * 0.24, r * 0.52, gy);
      ctx.quadraticCurveTo(0, gy + r * 0.24, -r * 0.52, gy);
      ctx.closePath();
      ctx.fillStyle = '#18092b';
      ctx.fill();
      ctx.strokeStyle = '#e0365c';
      ctx.lineWidth = Math.max(1.2, r * 0.03);
      ctx.stroke();

      // Golden gap eye inside
      const blink = Math.abs(Math.sin(time * 0.9)) < 0.08 ? 0.18 : 1;
      ctx.fillStyle = '#fff5cc';
      ctx.beginPath();
      ctx.ellipse(0, gy, r * 0.16, r * 0.11 * blink, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#d92b4c';
      ctx.beginPath();
      ctx.ellipse(0, gy, r * 0.075, r * 0.08 * blink, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#1b0824';
      ctx.beginPath();
      ctx.ellipse(0, gy, r * 0.032, r * 0.055 * blink, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
      break;
    }
    case 10: {
      // Ibuki Suika: iconic jagged/wavy dark-jade watermelon stripes!
      ctx.save();
      ctx.strokeStyle = 'rgba(11, 74, 38, 0.72)';
      ctx.lineWidth = Math.max(2.5, r * 0.155);
      ctx.lineCap = 'round';
      const cols = [-0.62, -0.22, 0.22, 0.62];
      for (const cx of cols) {
        ctx.beginPath();
        const x0 = cx * r;
        ctx.moveTo(x0, -r * 1.05);
        ctx.bezierCurveTo(
          x0 - r * 0.16,
          -r * 0.45,
          x0 + r * 0.16,
          -r * 0.1,
          x0 - r * 0.06,
          r * 0.3
        );
        ctx.bezierCurveTo(
          x0 - r * 0.18,
          r * 0.62,
          x0 + r * 0.12,
          r * 0.84,
          x0,
          r * 1.08
        );
        ctx.stroke();
      }
      // Festive warm golden sparkles inside the watermelon
      ctx.fillStyle = 'rgba(255, 232, 132, 0.55)';
      drawStarPath(ctx, -r * 0.64, -r * 0.18, 4, r * 0.1, r * 0.04);
      ctx.fill();
      drawStarPath(ctx, r * 0.66, -r * 0.14, 4, r * 0.11, r * 0.045);
      ctx.fill();
      ctx.restore();
      break;
    }
  }
}

function drawChibiFace(ctx: CanvasRenderingContext2D, r: number, tier: number): void {
  const eyeX = r * (tier === 0 ? 0.26 : 0.31);
  const eyeY = r * (tier === 9 ? -0.06 : tier === 10 ? -0.04 : -0.02);
  const eyeR = Math.max(1.5, r * (tier === 0 ? 0.11 : 0.125));

  // Soft rosy cheeks
  ctx.fillStyle = tier === 1 ? 'rgba(255, 130, 175, 0.55)' : 'rgba(255, 128, 160, 0.62)';
  ctx.beginPath();
  ctx.ellipse(-eyeX * 1.42, eyeY + r * 0.19, r * 0.14, r * 0.078, 0, 0, TAU);
  ctx.ellipse(eyeX * 1.42, eyeY + r * 0.19, r * 0.14, r * 0.078, 0, 0, TAU);
  ctx.fill();

  // Character-themed eye color
  const eyeColors: Record<number, string> = {
    0: '#3c2e59',
    1: '#113a7a',
    2: '#d92b4c',
    3: '#c9183c',
    4: '#b81434',
    5: '#2d3b66',
    6: '#124d3f',
    7: '#ffd659',
    8: '#3b0e1a',
    9: '#f5c75c',
    10: '#3b180e',
  };
  const irisColor = eyeColors[tier] ?? '#2b1b3d';

  // Eyes
  for (const side of [-1, 1]) {
    const ex = side * eyeX;
    if (tier === 7 && side === 1) {
      // Marisa's iconic cheerful wink!
      ctx.strokeStyle = '#ffe169';
      ctx.lineWidth = Math.max(1.6, r * 0.065);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ex - eyeR * 0.9, eyeY - eyeR * 0.45);
      ctx.lineTo(ex + eyeR * 0.65, eyeY);
      ctx.lineTo(ex - eyeR * 0.9, eyeY + eyeR * 0.55);
      ctx.stroke();
      continue;
    }

    ctx.fillStyle = irisColor;
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, eyeR * 0.92, eyeR * (tier === 9 ? 0.72 : 1.06), 0, 0, TAU);
    ctx.fill();

    // Main bright anime eye highlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex - eyeR * 0.28, eyeY - eyeR * 0.3, Math.max(0.8, eyeR * 0.36), 0, TAU);
    ctx.fill();

    // Tiny lower-right eye sparkle for larger orbs
    if (r >= 26) {
      ctx.fillStyle = tier === 3 || tier === 10 ? '#ffe169' : 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.arc(ex + eyeR * 0.25, eyeY + eyeR * 0.3, Math.max(0.7, eyeR * 0.18), 0, TAU);
      ctx.fill();
    }

    // Half-lidded elegant lash for Yukari & Remilia
    if (tier === 9 || tier === 4) {
      ctx.strokeStyle = tier === 9 ? '#240f40' : '#4a0c1e';
      ctx.lineWidth = Math.max(1.2, r * 0.045);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ex - eyeR * 1.05, eyeY - eyeR * 0.58);
      ctx.lineTo(ex + eyeR * 1.05, eyeY - eyeR * 0.42);
      ctx.stroke();
    }
  }

  // Mouth
  const my = eyeY + r * 0.23;
  const mouthStroke = tier === 7 || tier === 2 ? '#ffe680' : '#3a1a22';
  ctx.strokeStyle = mouthStroke;
  ctx.lineWidth = Math.max(1.3, r * 0.048);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (tier === 10) {
    // Giant triumphant happy open watermelon oni grin!
    ctx.fillStyle = '#ff6b81';
    ctx.beginPath();
    ctx.moveTo(-r * 0.19, my - r * 0.02);
    ctx.quadraticCurveTo(0, my + r * 0.26, r * 0.19, my - r * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (tier === 2 || tier === 3 || tier === 4) {
    // Cheeky Touhou vampire / youkai fang smile
    ctx.beginPath();
    ctx.moveTo(-r * 0.16, my);
    ctx.quadraticCurveTo(0, my + r * 0.15, r * 0.16, my);
    ctx.stroke();
    // Tiny cute white fang
    if (r >= 20) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(r * 0.04, my + r * 0.04);
      ctx.lineTo(r * 0.1, my + r * 0.03);
      ctx.lineTo(r * 0.075, my + r * 0.13);
      ctx.closePath();
      ctx.fill();
    }
  } else if (tier === 7 || tier === 1) {
    // Exuberant grin
    ctx.fillStyle = '#ff7b93';
    ctx.beginPath();
    ctx.moveTo(-r * 0.16, my - r * 0.01);
    ctx.quadraticCurveTo(0, my + r * 0.2, r * 0.16, my - r * 0.01);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (tier === 0) {
    // Cute cat-like 'w' smile
    ctx.beginPath();
    ctx.moveTo(-r * 0.14, my);
    ctx.quadraticCurveTo(-r * 0.07, my + r * 0.1, 0, my);
    ctx.quadraticCurveTo(r * 0.07, my + r * 0.1, r * 0.14, my);
    ctx.stroke();
  } else {
    // Gentle serene anime smile
    ctx.beginPath();
    ctx.moveTo(-r * 0.13, my);
    ctx.quadraticCurveTo(0, my + r * 0.12, r * 0.13, my);
    ctx.stroke();
  }
}

function drawFrontAccessories(ctx: CanvasRenderingContext2D, r: number, tier: number): void {
  switch (tier) {
    case 1: {
      // Cirno: royal blue bow on top
      drawRibbonBow(ctx, 0, -r * 0.88, r * 0.34, '#2466d4', '#a8e6ff');
      break;
    }
    case 2: {
      // Rumia: bright crimson ribbon on upper-left
      ctx.save();
      ctx.translate(-r * 0.42, -r * 0.78);
      ctx.rotate(-0.45);
      drawRibbonBow(ctx, 0, 0, r * 0.36, '#e62e4b', '#ffccd5');
      ctx.restore();
      break;
    }
    case 3: {
      // Flandre: white mob-cap frill band & side red ribbon
      drawFrillBand(ctx, r, '#fff5f7', '#e03e52');
      ctx.save();
      ctx.translate(r * 0.56, -r * 0.66);
      ctx.rotate(0.55);
      drawRibbonBow(ctx, 0, 0, r * 0.28, '#e02840', '#ffd166');
      ctx.restore();
      break;
    }
    case 4: {
      // Remilia: ruffled white Victorian mob-cap headband + scarlet bow
      drawFrillBand(ctx, r, '#ffffff', '#d62844');
      drawRibbonBow(ctx, 0, -r * 0.88, r * 0.32, '#d62844', '#ffd6e0');
      break;
    }
    case 5: {
      // Sakuya: crisp pleated white maid headband + emerald side bows
      drawFrillBand(ctx, r, '#ffffff', '#7e93c9');
      drawRibbonBow(ctx, -r * 0.52, -r * 0.72, r * 0.18, '#289e68', '#ffffff');
      drawRibbonBow(ctx, r * 0.52, -r * 0.72, r * 0.18, '#289e68', '#ffffff');
      break;
    }
    case 6: {
      // Youmu: iconic black ribbon bow centered neatly on crown
      drawRibbonBow(ctx, 0, -r * 0.88, r * 0.4, '#1b1d26', '#7ff5c8');
      break;
    }
    case 7: {
      // Marisa: jaunty black witch hat with white pleated ribbon & golden star!
      ctx.save();
      ctx.translate(0, -r * 0.72);
      ctx.rotate(-0.12);
      // Wide brim
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.78, r * 0.19, 0, 0, TAU);
      ctx.fillStyle = '#1b1533';
      ctx.fill();
      ctx.strokeStyle = '#ffd659';
      ctx.lineWidth = Math.max(1.1, r * 0.03);
      ctx.stroke();

      // Pointed hat cone
      ctx.beginPath();
      ctx.moveTo(-r * 0.42, -r * 0.02);
      ctx.quadraticCurveTo(-r * 0.05, -r * 0.62, r * 0.4, -r * 0.46);
      ctx.quadraticCurveTo(r * 0.2, -r * 0.22, r * 0.42, -r * 0.02);
      ctx.closePath();
      ctx.fillStyle = '#241c45';
      ctx.fill();
      ctx.stroke();

      // White hat band
      ctx.beginPath();
      ctx.moveTo(-r * 0.38, -r * 0.04);
      ctx.quadraticCurveTo(0, r * 0.05, r * 0.38, -r * 0.04);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, r * 0.085);
      ctx.lineCap = 'round';
      ctx.stroke();

      // Golden star emblem on hat
      ctx.fillStyle = '#ffe169';
      drawStarPath(ctx, -r * 0.14, -r * 0.18, 5, r * 0.13, r * 0.058);
      ctx.fill();
      ctx.restore();
      break;
    }
    case 8: {
      // Reimu: bright red-white shrine bow knot & twin white hair-tubes
      ctx.fillStyle = '#fff8f0';
      ctx.strokeStyle = '#d92338';
      ctx.lineWidth = Math.max(1, r * 0.028);
      ctx.beginPath();
      ctx.arc(0, -r * 0.84, r * 0.15, 0, TAU);
      ctx.fill();
      ctx.stroke();

      // Twin white side talisman tubes
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(side * r * 0.72, -r * 0.12);
        ctx.rotate(side * 0.15);
        roundRectPath(ctx, -r * 0.07, -r * 0.2, r * 0.14, r * 0.38, r * 0.05);
        ctx.fillStyle = '#fffaf2';
        ctx.fill();
        ctx.strokeStyle = '#e02840';
        ctx.lineWidth = Math.max(1, r * 0.022);
        ctx.stroke();
        ctx.restore();
      }
      break;
    }
    case 9: {
      // Yukari: ornate gold-trimmed frilled bonnet & magenta ribbon bow
      drawFrillBand(ctx, r, '#fff7e6', '#d9a441');
      drawRibbonBow(ctx, 0, -r * 0.88, r * 0.34, '#c4275b', '#f5d26b');
      break;
    }
    case 10: {
      // Ibuki Suika: red & purple horn bows + iconic geometric bead charms (● ▲ ■)
      drawRibbonBow(ctx, -r * 0.38, -r * 0.78, r * 0.18, '#e0364c', '#ffe169');
      drawRibbonBow(ctx, r * 0.38, -r * 0.78, r * 0.18, '#8d4de8', '#ffe169');

      // Subtle brow charm band with circle (red), triangle (gold), square (blue)
      const by = -r * 0.62;
      ctx.strokeStyle = 'rgba(255, 225, 105, 0.75)';
      ctx.lineWidth = Math.max(1.2, r * 0.022);
      ctx.beginPath();
      ctx.moveTo(-r * 0.34, by);
      ctx.quadraticCurveTo(0, by + r * 0.08, r * 0.34, by);
      ctx.stroke();

      // Circle bead (left)
      ctx.fillStyle = '#ff5978';
      ctx.beginPath();
      ctx.arc(-r * 0.22, by + r * 0.03, r * 0.065, 0, TAU);
      ctx.fill();
      // Triangle bead (center)
      ctx.fillStyle = '#ffe169';
      ctx.beginPath();
      ctx.moveTo(0, by - r * 0.03);
      ctx.lineTo(r * 0.07, by + r * 0.09);
      ctx.lineTo(-r * 0.07, by + r * 0.09);
      ctx.closePath();
      ctx.fill();
      // Square bead (right)
      ctx.fillStyle = '#5cd6ff';
      ctx.fillRect(r * 0.16, by - r * 0.03, r * 0.12, r * 0.12);
      break;
    }
  }
}

function drawRibbonBow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  fill: string,
  stroke: string
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(0.9, size * 0.1);
  ctx.lineJoin = 'round';

  // Left wing
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size, -size * 0.45);
  ctx.lineTo(-size * 0.85, size * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Right wing
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(size, -size * 0.45);
  ctx.lineTo(size * 0.85, size * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Center knot
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.26, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawFrillBand(
  ctx: CanvasRenderingContext2D,
  r: number,
  fill: string,
  trim: string
): void {
  ctx.save();
  const scallops = 7;
  ctx.fillStyle = fill;
  ctx.strokeStyle = trim;
  ctx.lineWidth = Math.max(0.9, r * 0.028);
  for (let i = 0; i < scallops; i++) {
    const t = i / (scallops - 1);
    const a = -Math.PI * 0.82 + t * Math.PI * 0.64;
    const fx = Math.cos(a) * r * 0.86;
    const fy = Math.sin(a) * r * 0.86;
    ctx.beginPath();
    ctx.arc(fx, fy, r * 0.145, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawStarPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerR: number,
  innerR: number
): void {
  let rot = -Math.PI / 2;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
    rot += step;
  }
  ctx.closePath();
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
): void {
  const r = Math.min(radius, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Renders a crisp high-DPI miniature icon of any Touhou orb tier onto a small canvas.
 */
export function renderOrbIcon(canvas: HTMLCanvasElement, tier: number, cssSize: number): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(cssSize * dpr);
  canvas.height = Math.round(cssSize * dpr);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssSize, cssSize);

  // Leave slight padding for hats, horns, wings, and shrine bows
  const r = cssSize * 0.34;
  drawTouhouOrb(ctx, cssSize * 0.5, cssSize * 0.56, r, tier, 0, {
    iconMode: true,
    time: 0,
  });
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}
