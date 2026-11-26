import {
  GROUND_HEIGHT,
  PHYSICS,
  PLAYABLE_HEIGHT,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  type CharacterId,
  type FloatingText,
  type Particle,
  type PipeObstacle,
  type PlayerState,
  type RenderState,
  type StarCollectible,
} from './types';

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface SkyPalette {
  top: RGB;
  mid: RGB;
  bottom: RGB;
  mountainFar: RGB;
  mountainNear: RGB;
  bambooBg: RGB;
  cloud: RGB;
  mistAlpha: number;
  starAlpha: number;
}

const PALETTE_DAWN: SkyPalette = {
  top: { r: 44, g: 64, b: 122 },
  mid: { r: 122, g: 138, b: 190 },
  bottom: { r: 249, g: 196, b: 146 },
  mountainFar: { r: 74, g: 82, b: 126 },
  mountainNear: { r: 43, g: 72, b: 84 },
  bambooBg: { r: 25, g: 68, b: 56 },
  cloud: { r: 255, g: 244, b: 229 },
  mistAlpha: 0.14,
  starAlpha: 0.18,
};

const PALETTE_TWILIGHT: SkyPalette = {
  top: { r: 30, g: 22, b: 68 },
  mid: { r: 138, g: 52, b: 92 },
  bottom: { r: 242, g: 126, b: 74 },
  mountainFar: { r: 58, g: 28, b: 64 },
  mountainNear: { r: 34, g: 26, b: 48 },
  bambooBg: { r: 24, g: 38, b: 44 },
  cloud: { r: 255, g: 196, b: 162 },
  mistAlpha: 0.22,
  starAlpha: 0.55,
};

const PALETTE_SCARLET: SkyPalette = {
  top: { r: 15, g: 8, b: 28 },
  mid: { r: 74, g: 14, b: 36 },
  bottom: { r: 148, g: 26, b: 52 },
  mountainFar: { r: 44, g: 12, b: 30 },
  mountainNear: { r: 24, g: 10, b: 24 },
  bambooBg: { r: 19, g: 18, b: 30 },
  cloud: { r: 235, g: 98, b: 118 },
  mistAlpha: 0.34,
  starAlpha: 0.96,
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  return {
    r: Math.round(lerp(a.r, b.r, t)),
    g: Math.round(lerp(a.g, b.g, t)),
    b: Math.round(lerp(a.b, b.b, t)),
  };
}

function rgbStr(c: RGB, alpha = 1): string {
  return alpha >= 1 ? `rgb(${c.r}, ${c.g}, ${c.b})` : `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
}

function sampleSkyPalette(progress: number): SkyPalette {
  const p = Math.max(0, Math.min(2, progress));
  const from = p < 1 ? PALETTE_DAWN : PALETTE_TWILIGHT;
  const to = p < 1 ? PALETTE_TWILIGHT : PALETTE_SCARLET;
  const t = p < 1 ? p : p - 1;
  return {
    top: lerpRgb(from.top, to.top, t),
    mid: lerpRgb(from.mid, to.mid, t),
    bottom: lerpRgb(from.bottom, to.bottom, t),
    mountainFar: lerpRgb(from.mountainFar, to.mountainFar, t),
    mountainNear: lerpRgb(from.mountainNear, to.mountainNear, t),
    bambooBg: lerpRgb(from.bambooBg, to.bambooBg, t),
    cloud: lerpRgb(from.cloud, to.cloud, t),
    mistAlpha: lerp(from.mistAlpha, to.mistAlpha, t),
    starAlpha: lerp(from.starAlpha, to.starAlpha, t),
  };
}

interface BgStar {
  x: number;
  y: number;
  size: number;
  phase: number;
  diamond: boolean;
}

interface BgCloud {
  x: number;
  y: number;
  width: number;
  height: number;
  speedScale: number;
}

interface BgBamboo {
  offsetX: number;
  width: number;
  height: number;
  lean: number;
  alpha: number;
}

export class FlappyRenderer {
  private readonly bgStars: BgStar[];
  private readonly bgClouds: BgCloud[];
  private readonly bgBamboos: BgBamboo[];

  constructor() {
    // Deterministic decorative sky & bamboo elements for silky 60fps rendering
    this.bgStars = Array.from({ length: 34 }, (_, i) => ({
      x: ((i * 67 + 23) % (STAGE_WIDTH - 16)) + 8,
      y: ((i * 43 + 17) % 230) + 14,
      size: 1.1 + ((i * 19) % 10) * 0.16,
      phase: i * 0.85,
      diamond: i % 5 === 0,
    }));

    this.bgClouds = [
      { x: 40, y: 88, width: 96, height: 16, speedScale: 0.08 },
      { x: 210, y: 122, width: 112, height: 18, speedScale: 0.06 },
      { x: 350, y: 68, width: 84, height: 14, speedScale: 0.1 },
      { x: 120, y: 164, width: 124, height: 16, speedScale: 0.05 },
      { x: 295, y: 182, width: 92, height: 15, speedScale: 0.075 },
    ];

    this.bgBamboos = Array.from({ length: 18 }, (_, i) => ({
      offsetX: i * 36 + ((i * 13) % 16),
      width: 6 + (i % 4) * 2.2,
      height: 210 + ((i * 37) % 175),
      lean: ((i % 3) - 1) * 0.035,
      alpha: 0.28 + (i % 3) * 0.14,
    }));
  }

  public render(ctx: CanvasRenderingContext2D, state: RenderState): void {
    ctx.save();

    // Subtle screen shake on crash
    if (state.shakeTime > 0) {
      const mag = state.shakeIntensity * (state.shakeTime / 0.28);
      const sx = (Math.random() * 2 - 1) * mag;
      const sy = (Math.random() * 2 - 1) * mag;
      ctx.translate(sx, sy);
    }

    const palette = sampleSkyPalette(state.skyProgress);

    this.drawSkyAndCelestials(ctx, state, palette);
    this.drawParallaxMountains(ctx, state, palette);
    this.drawShrineHillsAndBambooGrove(ctx, state, palette);
    this.drawScarletMist(ctx, state, palette);

    // Obstacles & Collectibles
    for (const pipe of state.pipes) {
      this.drawPipePair(ctx, pipe, state.elapsed);
    }
    for (const star of state.stars) {
      if (!star.collected) {
        this.drawCollectible(ctx, star, state.elapsed);
      }
    }

    // Foreground ground + speed streaks
    this.drawGround(ctx, state);
    this.drawSpeedLines(ctx, state);

    // Particles behind / around character
    this.drawParticles(ctx, state.particles);

    // Selectable Touhou Flyer
    this.drawPlayer(ctx, state.character, state.player, state.phase, state.elapsed);

    // Floating score / star popups
    this.drawFloatingTexts(ctx, state.floatingTexts);

    // Sky phase transition banner (e.g. 黄昏降临 / 红魔异变)
    if (state.phaseBannerTimer > 0 && state.phaseBannerText) {
      this.drawPhaseBanner(ctx, state.phaseBannerText, state.phaseBannerTimer);
    }

    // Impact white flash
    if (state.flashAlpha > 0.01) {
      ctx.fillStyle = `rgba(255, 248, 242, ${Math.min(0.82, state.flashAlpha)})`;
      ctx.fillRect(-12, -12, STAGE_WIDTH + 24, STAGE_HEIGHT + 24);
    }

    ctx.restore();
  }

  private drawSkyAndCelestials(
    ctx: CanvasRenderingContext2D,
    state: RenderState,
    palette: SkyPalette,
  ): void {
    const grad = ctx.createLinearGradient(0, 0, 0, PLAYABLE_HEIGHT);
    grad.addColorStop(0, rgbStr(palette.top));
    grad.addColorStop(0.55, rgbStr(palette.mid));
    grad.addColorStop(1, rgbStr(palette.bottom));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, STAGE_WIDTH, PLAYABLE_HEIGHT + 2);

    // Twinkling stars & danmaku glints
    if (palette.starAlpha > 0.04) {
      for (const s of this.bgStars) {
        const twinkle = 0.45 + 0.55 * Math.sin(state.elapsed * 2.6 + s.phase);
        const alpha = palette.starAlpha * twinkle;
        ctx.fillStyle = state.skyProgress > 1.35 && s.diamond
          ? `rgba(255, 198, 212, ${alpha})`
          : `rgba(255, 246, 216, ${alpha})`;
        if (s.diamond) {
          ctx.beginPath();
          ctx.moveTo(s.x, s.y - s.size * 2.2);
          ctx.lineTo(s.x + s.size * 0.85, s.y - s.size * 0.85);
          ctx.lineTo(s.x + s.size * 2.2, s.y);
          ctx.lineTo(s.x + s.size * 0.85, s.y + s.size * 0.85);
          ctx.lineTo(s.x, s.y + s.size * 2.2);
          ctx.lineTo(s.x - s.size * 0.85, s.y + s.size * 0.85);
          ctx.lineTo(s.x - s.size * 2.2, s.y);
          ctx.lineTo(s.x - s.size * 0.85, s.y - s.size * 0.85);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Dawn / Twilight Sun (sinks gently as sky transitions to night)
    if (state.skyProgress < 1.55) {
      const sunFade = Math.max(0, 1 - Math.max(0, state.skyProgress - 0.85) / 0.7);
      const sunX = lerp(312, 276, Math.min(1, state.skyProgress));
      const sunY = lerp(128, 232, Math.min(1.4, state.skyProgress));
      const sunR = lerp(32, 42, Math.min(1, state.skyProgress));

      const halo = ctx.createRadialGradient(sunX, sunY, sunR * 0.4, sunX, sunY, sunR * 2.7);
      halo.addColorStop(0, `rgba(255, 236, 178, ${0.58 * sunFade})`);
      halo.addColorStop(0.5, `rgba(255, 146, 92, ${0.28 * sunFade})`);
      halo.addColorStop(1, 'rgba(255, 110, 82, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR * 2.7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 245, 214, ${0.95 * sunFade})`;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Giant Scarlet Moon during Scarlet Mist Night (红魔异变夜空)
    if (state.skyProgress > 0.75) {
      const moonT = Math.min(1, (state.skyProgress - 0.75) / 1.15);
      const moonX = 304;
      const moonY = lerp(218, 120, moonT);
      const moonR = lerp(36, 56, moonT);

      const moonHalo = ctx.createRadialGradient(moonX, moonY, moonR * 0.55, moonX, moonY, moonR * 2.35);
      moonHalo.addColorStop(0, `rgba(255, 76, 104, ${0.52 * moonT})`);
      moonHalo.addColorStop(0.55, `rgba(205, 32, 68, ${0.24 * moonT})`);
      moonHalo.addColorStop(1, 'rgba(140, 12, 42, 0)');
      ctx.fillStyle = moonHalo;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR * 2.35, 0, Math.PI * 2);
      ctx.fill();

      const moonGrad = ctx.createRadialGradient(
        moonX - moonR * 0.25,
        moonY - moonR * 0.2,
        moonR * 0.15,
        moonX,
        moonY,
        moonR,
      );
      moonGrad.addColorStop(0, `rgba(255, 224, 214, ${0.96 * moonT})`);
      moonGrad.addColorStop(0.65, `rgba(255, 118, 130, ${0.95 * moonT})`);
      moonGrad.addColorStop(1, `rgba(214, 38, 66, ${0.95 * moonT})`);
      ctx.fillStyle = moonGrad;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
      ctx.fill();

      // Subtle moon craters / scarlet silhouette texture
      ctx.fillStyle = `rgba(148, 22, 48, ${0.2 * moonT})`;
      ctx.beginPath();
      ctx.arc(moonX - 15, moonY - 10, 11, 0, Math.PI * 2);
      ctx.arc(moonX + 16, moonY + 12, 8, 0, Math.PI * 2);
      ctx.arc(moonX + 6, moonY - 18, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Stylized drifting Japanese clouds (瑞云)
    for (const c of this.bgClouds) {
      const span = STAGE_WIDTH + c.width + 60;
      const cx =
        STAGE_WIDTH + 30 - (((state.scrollDistance * c.speedScale + c.x) % span) + span) % span;
      ctx.fillStyle = rgbStr(palette.cloud, 0.22);
      this.drawRoundedRect(ctx, cx, c.y, c.width, c.height, c.height * 0.5);
      ctx.fill();
      this.drawRoundedRect(
        ctx,
        cx + c.width * 0.22,
        c.y - c.height * 0.55,
        c.width * 0.52,
        c.height * 0.85,
        c.height * 0.42,
      );
      ctx.fill();
    }
  }

  private drawParallaxMountains(
    ctx: CanvasRenderingContext2D,
    state: RenderState,
    palette: SkyPalette,
  ): void {
    // Distant Youkai Mountain ridge (妖怪之山)
    const period = 420;
    const offsetFar = (state.scrollDistance * 0.14) % period;
    ctx.fillStyle = rgbStr(palette.mountainFar, 0.88);

    for (let rep = -1; rep <= 1; rep++) {
      const bx = rep * period - offsetFar;
      ctx.beginPath();
      ctx.moveTo(bx, PLAYABLE_HEIGHT);
      ctx.lineTo(bx, PLAYABLE_HEIGHT - 115);
      ctx.lineTo(bx + 62, PLAYABLE_HEIGHT - 196);
      ctx.lineTo(bx + 126, PLAYABLE_HEIGHT - 144);
      ctx.lineTo(bx + 206, PLAYABLE_HEIGHT - 238); // Peak of Youkai Mountain
      ctx.lineTo(bx + 286, PLAYABLE_HEIGHT - 156);
      ctx.lineTo(bx + 358, PLAYABLE_HEIGHT - 190);
      ctx.lineTo(bx + period, PLAYABLE_HEIGHT - 115);
      ctx.lineTo(bx + period, PLAYABLE_HEIGHT);
      ctx.closePath();
      ctx.fill();

      // Subtle waterfall gleam on Youkai Mountain slope
      ctx.strokeStyle = `rgba(214, 240, 255, ${state.skyProgress > 1.3 ? 0.14 : 0.22})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(bx + 204, PLAYABLE_HEIGHT - 216);
      ctx.quadraticCurveTo(bx + 210, PLAYABLE_HEIGHT - 180, bx + 206, PLAYABLE_HEIGHT - 145);
      ctx.stroke();
    }
  }

  private drawShrineHillsAndBambooGrove(
    ctx: CanvasRenderingContext2D,
    state: RenderState,
    palette: SkyPalette,
  ): void {
    // Mid-ground rolling hills with Hakurei Shrine torii & roofline silhouettes
    const hillPeriod = 360;
    const hillOffset = (state.scrollDistance * 0.28) % hillPeriod;
    ctx.fillStyle = rgbStr(palette.mountainNear, 0.92);

    for (let rep = -1; rep <= 2; rep++) {
      const bx = rep * hillPeriod - hillOffset;
      ctx.beginPath();
      ctx.moveTo(bx, PLAYABLE_HEIGHT);
      ctx.lineTo(bx, PLAYABLE_HEIGHT - 78);
      ctx.quadraticCurveTo(bx + 90, PLAYABLE_HEIGHT - 144, bx + 185, PLAYABLE_HEIGHT - 96);
      ctx.quadraticCurveTo(bx + 275, PLAYABLE_HEIGHT - 138, bx + hillPeriod, PLAYABLE_HEIGHT - 78);
      ctx.lineTo(bx + hillPeriod, PLAYABLE_HEIGHT);
      ctx.closePath();
      ctx.fill();

      // Distant Hakurei Shrine Torii silhouette on hill crest
      const tx = bx + 86;
      const ty = PLAYABLE_HEIGHT - 122;
      ctx.fillStyle = rgbStr(palette.mountainNear, 0.96);
      ctx.fillRect(tx - 10, ty - 22, 3.2, 26);
      ctx.fillRect(tx + 7, ty - 22, 3.2, 26);
      ctx.fillRect(tx - 15, ty - 24, 30, 3.5);
      ctx.fillRect(tx - 12, ty - 17, 24, 2.6);

      // Distant shrine roof silhouette on second hill crest
      const sx = bx + 266;
      const sy = PLAYABLE_HEIGHT - 115;
      ctx.beginPath();
      ctx.moveTo(sx - 24, sy - 6);
      ctx.quadraticCurveTo(sx, sy - 24, sx + 24, sy - 6);
      ctx.lineTo(sx + 18, sy - 2);
      ctx.lineTo(sx + 18, sy + 10);
      ctx.lineTo(sx - 18, sy + 10);
      ctx.lineTo(sx - 18, sy - 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgbStr(palette.mountainNear, 0.92);
    }

    // Scrolling Lost Bamboo Forest stalks (迷途竹林)
    const grovePeriod = 18 * 36;
    const groveOffset = (state.scrollDistance * 0.48) % grovePeriod;

    for (const b of this.bgBamboos) {
      for (let rep = -1; rep <= 1; rep++) {
        const x = b.offsetX + rep * grovePeriod - groveOffset;
        if (x < -30 || x > STAGE_WIDTH + 30) continue;

        ctx.save();
        ctx.translate(x, PLAYABLE_HEIGHT);
        ctx.rotate(b.lean + Math.sin(state.elapsed * 1.1 + b.offsetX * 0.05) * 0.012);
        ctx.fillStyle = rgbStr(palette.bambooBg, b.alpha);
        ctx.fillRect(-b.width * 0.5, -b.height, b.width, b.height);

        // Bamboo joint notches
        ctx.fillStyle = `rgba(148, 224, 178, ${b.alpha * 0.35})`;
        for (let jy = -36; jy > -b.height + 20; jy -= 38) {
          ctx.fillRect(-b.width * 0.62, jy, b.width * 1.24, 2.2);
        }

        // Soft silhouette leaf clusters
        ctx.fillStyle = rgbStr(palette.bambooBg, b.alpha * 0.9);
        ctx.beginPath();
        ctx.ellipse(-b.width * 1.3, -b.height * 0.72, 11, 3.2, -0.42, 0, Math.PI * 2);
        ctx.ellipse(b.width * 1.4, -b.height * 0.56, 10, 3, 0.38, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  private drawScarletMist(
    ctx: CanvasRenderingContext2D,
    state: RenderState,
    palette: SkyPalette,
  ): void {
    const mistGrad = ctx.createLinearGradient(0, PLAYABLE_HEIGHT - 135, 0, PLAYABLE_HEIGHT);
    const mistColor =
      state.skyProgress > 1.2
        ? { r: 224, g: 56, b: 86 }
        : state.skyProgress > 0.5
          ? { r: 245, g: 152, b: 120 }
          : { r: 240, g: 248, b: 230 };
    mistGrad.addColorStop(0, rgbStr(mistColor, 0));
    mistGrad.addColorStop(1, rgbStr(mistColor, palette.mistAlpha));
    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, PLAYABLE_HEIGHT - 135, STAGE_WIDTH, 135);
  }

  private drawPipePair(ctx: CanvasRenderingContext2D, pipe: PipeObstacle, elapsed: number): void {
    const topHeight = Math.max(0, pipe.gapY - pipe.gapHeight * 0.5);
    const bottomY = pipe.gapY + pipe.gapHeight * 0.5;
    const bottomHeight = Math.max(0, PLAYABLE_HEIGHT - bottomY);

    if (pipe.style === 'bamboo') {
      this.drawBambooPillar(ctx, pipe.x, 0, pipe.width, topHeight, true);
      this.drawBambooPillar(ctx, pipe.x, bottomY, pipe.width, bottomHeight, false);
    } else {
      this.drawToriiPillar(ctx, pipe.x, 0, pipe.width, topHeight, true, elapsed + pipe.lanternPhase);
      this.drawToriiPillar(
        ctx,
        pipe.x,
        bottomY,
        pipe.width,
        bottomHeight,
        false,
        elapsed + pipe.lanternPhase + 1.4,
      );
    }
  }

  private drawBambooPillar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    isTop: boolean,
  ): void {
    if (h <= 0) return;
    const capH = Math.min(PHYSICS.PIPE_CAP_HEIGHT, h);
    const capOver = PHYSICS.PIPE_CAP_OVERHANG;

    // Cylindrical emerald bamboo shaft gradient
    const shaftGrad = ctx.createLinearGradient(x, 0, x + w, 0);
    shaftGrad.addColorStop(0, '#10442d');
    shaftGrad.addColorStop(0.24, '#2f9e64');
    shaftGrad.addColorStop(0.42, '#5ad08b');
    shaftGrad.addColorStop(0.7, '#21784d');
    shaftGrad.addColorStop(1, '#0c3322');

    ctx.fillStyle = shaftGrad;
    ctx.fillRect(x, y, w, h);

    // Subtle vertical specular highlight stripe
    ctx.fillStyle = 'rgba(214, 255, 224, 0.24)';
    ctx.fillRect(x + w * 0.28, y, w * 0.12, h);

    // Outline
    ctx.strokeStyle = '#0a291b';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Raised bamboo nodes / segments every 44px
    const nodeStart = isTop ? y + h - capH - 36 : y + capH + 34;
    const nodeDir = isTop ? -1 : 1;
    for (let step = 0; step < 12; step++) {
      const ny = nodeStart + step * 44 * nodeDir;
      if (isTop && ny < y + 4) break;
      if (!isTop && ny > y + h - 4) break;

      ctx.fillStyle = '#4ad182';
      this.drawRoundedRect(ctx, x - 3, ny - 3, w + 6, 6, 3);
      ctx.fill();
      ctx.strokeStyle = '#0c3020';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = 'rgba(230, 255, 236, 0.45)';
      ctx.fillRect(x + 4, ny - 2, w - 8, 1.5);
    }

    // Ornate Bamboo Cap
    const capY = isTop ? y + h - capH : y;
    const capGrad = ctx.createLinearGradient(x - capOver, 0, x + w + capOver, 0);
    capGrad.addColorStop(0, '#0f472e');
    capGrad.addColorStop(0.28, '#36b372');
    capGrad.addColorStop(0.48, '#73e49f');
    capGrad.addColorStop(0.78, '#1e764a');
    capGrad.addColorStop(1, '#0b3020');

    ctx.fillStyle = capGrad;
    this.drawRoundedRect(ctx, x - capOver, capY, w + capOver * 2, capH, 5);
    ctx.fill();
    ctx.strokeStyle = '#082417';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Red-gold sacred shimenawa cord around the cap
    const cordY = isTop ? capY + 6 : capY + capH - 8;
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(x - capOver + 2, cordY, w + capOver * 2 - 4, 3.5);
    ctx.fillStyle = '#facc15';
    for (let cx = x - capOver + 6; cx < x + w + capOver - 6; cx += 11) {
      ctx.fillRect(cx, cordY + 0.5, 4, 2.5);
    }

    // Cute sprouting bamboo leaves near the rim
    const leafY = isTop ? capY - 2 : capY + capH + 2;
    ctx.save();
    ctx.fillStyle = '#4ade80';
    ctx.strokeStyle = '#0f3d26';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(x - capOver - 3, leafY, 9, 3.3, isTop ? 0.45 : -0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x + w + capOver + 3, leafY + (isTop ? -4 : 4), 8.5, 3, isTop ? -0.35 : 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawToriiPillar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    isTop: boolean,
    swayPhase: number,
  ): void {
    if (h <= 0) return;
    const capH = Math.min(PHYSICS.PIPE_CAP_HEIGHT, h);
    const capOver = PHYSICS.PIPE_CAP_OVERHANG + 3;

    // Vermilion lacquered torii column gradient
    const colGrad = ctx.createLinearGradient(x, 0, x + w, 0);
    colGrad.addColorStop(0, '#6e0d19');
    colGrad.addColorStop(0.26, '#d92638');
    colGrad.addColorStop(0.45, '#f25764');
    colGrad.addColorStop(0.75, '#b31929');
    colGrad.addColorStop(1, '#590a14');

    ctx.fillStyle = colGrad;
    ctx.fillRect(x, y, w, h);

    // Lacquer specular gleam
    ctx.fillStyle = 'rgba(255, 224, 224, 0.22)';
    ctx.fillRect(x + w * 0.26, y, w * 0.11, h);

    // Decorative dark-gold shrine bands on shaft
    ctx.fillStyle = '#23192d';
    const bandY = isTop ? y + h - capH - 18 : y + capH + 12;
    if ((isTop && bandY > y + 8) || (!isTop && bandY + 6 < y + h - 8)) {
      ctx.fillRect(x - 1, bandY, w + 2, 6);
      ctx.fillStyle = '#f5c542';
      ctx.fillRect(x + 2, bandY + 1.5, w - 4, 2.5);
    }

    ctx.strokeStyle = '#3f070e';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Ornate Torii Cap (Shimaki + curved black Kasagi ridge)
    const capY = isTop ? y + h - capH : y;
    ctx.fillStyle = colGrad;
    this.drawRoundedRect(ctx, x - capOver, capY, w + capOver * 2, capH, 4);
    ctx.fill();
    ctx.strokeStyle = '#3f070e';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Curved black kasagi bar on the gap-facing edge
    ctx.fillStyle = '#1b1626';
    ctx.beginPath();
    if (isTop) {
      const edgeY = capY + capH;
      ctx.moveTo(x - capOver - 4, edgeY - 6);
      ctx.quadraticCurveTo(x + w * 0.5, edgeY + 4, x + w + capOver + 4, edgeY - 6);
      ctx.lineTo(x + w + capOver + 2, edgeY + 1);
      ctx.quadraticCurveTo(x + w * 0.5, edgeY + 9, x - capOver - 2, edgeY + 1);
    } else {
      const edgeY = capY;
      ctx.moveTo(x - capOver - 4, edgeY + 6);
      ctx.quadraticCurveTo(x + w * 0.5, edgeY - 4, x + w + capOver + 4, edgeY + 6);
      ctx.lineTo(x + w + capOver + 2, edgeY - 1);
      ctx.quadraticCurveTo(x + w * 0.5, edgeY - 9, x - capOver - 2, edgeY - 1);
    }
    ctx.closePath();
    ctx.fill();

    // Central Gold Shrine Plaque (扁额)
    const plaqueW = 16;
    const plaqueH = 12;
    const plaqueX = x + (w - plaqueW) * 0.5;
    const plaqueY = capY + (capH - plaqueH) * 0.5;
    ctx.fillStyle = '#1e1624';
    ctx.fillRect(plaqueX, plaqueY, plaqueW, plaqueH);
    ctx.strokeStyle = '#f5c542';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(plaqueX, plaqueY, plaqueW, plaqueH);
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(plaqueX + 6.5, plaqueY + 2.5, 3, 7);

    // Swaying warm glowing shrine lantern (提灯) hanging from top torii cap
    if (isTop && h > 34) {
      const lx = x - capOver + 6;
      const ly = capY + capH + 2;
      const sway = Math.sin(swayPhase * 2.2) * 0.16;

      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(sway);

      // Soft warm glow
      const lGlow = ctx.createRadialGradient(0, 12, 2, 0, 12, 18);
      lGlow.addColorStop(0, 'rgba(255, 224, 130, 0.55)');
      lGlow.addColorStop(1, 'rgba(255, 160, 64, 0)');
      ctx.fillStyle = lGlow;
      ctx.beginPath();
      ctx.arc(0, 12, 18, 0, Math.PI * 2);
      ctx.fill();

      // Cord
      ctx.strokeStyle = '#f5c542';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 6);
      ctx.stroke();

      // Paper lantern body
      ctx.fillStyle = '#ffcf66';
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(0, 12, 5.5, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Caps & horizontal ribs
      ctx.fillStyle = '#23192d';
      ctx.fillRect(-3.5, 5, 7, 2);
      ctx.fillRect(-3.5, 18, 7, 2);
      ctx.strokeStyle = 'rgba(180, 50, 24, 0.55)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-5, 10);
      ctx.lineTo(5, 10);
      ctx.moveTo(-5, 14);
      ctx.lineTo(5, 14);
      ctx.stroke();

      ctx.restore();
    }
  }

  private drawCollectible(ctx: CanvasRenderingContext2D, star: StarCollectible, elapsed: number): void {
    ctx.save();
    ctx.translate(star.x, star.y);

    const pulse = 1 + Math.sin(elapsed * 5.2 + star.bobPhase) * 0.08;
    const isPower = star.kind === 'power';

    // Outer radiant aura
    const aura = ctx.createRadialGradient(0, 0, 3, 0, 0, star.radius * 2.1);
    if (isPower) {
      aura.addColorStop(0, 'rgba(255, 224, 102, 0.72)');
      aura.addColorStop(0.55, 'rgba(239, 68, 68, 0.34)');
      aura.addColorStop(1, 'rgba(239, 68, 68, 0)');
    } else {
      aura.addColorStop(0, 'rgba(186, 230, 253, 0.8)');
      aura.addColorStop(0.55, 'rgba(250, 204, 21, 0.35)');
      aura.addColorStop(1, 'rgba(56, 189, 248, 0)');
    }
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, star.radius * 2.1, 0, Math.PI * 2);
    ctx.fill();

    // Orbiting mini sparkle dots
    for (let i = 0; i < 3; i++) {
      const a = elapsed * 3.4 + (i * Math.PI * 2) / 3;
      const ox = Math.cos(a) * (star.radius + 5);
      const oy = Math.sin(a) * (star.radius + 5);
      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      ctx.arc(ox, oy, 1.9, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.scale(pulse, pulse);

    if (isPower) {
      // Classic Touhou Power Star-Badge ("P")
      ctx.save();
      ctx.rotate(Math.sin(elapsed * 2.4 + star.bobPhase) * 0.14);
      this.drawStarPath(ctx, 5, star.radius + 1.5, star.radius * 0.56);
      ctx.fillStyle = '#fde047';
      ctx.fill();
      ctx.strokeStyle = '#b91c1c';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner red badge circle
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(0, 0, star.radius * 0.56, 0, Math.PI * 2);
      ctx.fill();

      // Crisp white "P"
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 11px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('P', 0.4, 0.8);
      ctx.restore();
    } else {
      // Touhou Faith Star (信仰星)
      ctx.save();
      ctx.rotate(star.spin);
      this.drawStarPath(ctx, 5, star.radius + 2, star.radius * 0.48);
      const grad = ctx.createRadialGradient(-2, -2, 1, 0, 0, star.radius + 2);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.45, '#fde047');
      grad.addColorStop(1, '#38bdf8');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = '#1d4ed8';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  private drawGround(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const y = PLAYABLE_HEIGHT;

    // Ground base
    const groundGrad = ctx.createLinearGradient(0, y, 0, STAGE_HEIGHT);
    groundGrad.addColorStop(0, '#1e4234');
    groundGrad.addColorStop(0.32, '#16282a');
    groundGrad.addColorStop(1, '#0d141c');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, y, STAGE_WIDTH, GROUND_HEIGHT);

    // Scrolling top lush bamboo-moss strip
    ctx.fillStyle = '#38a169';
    ctx.fillRect(0, y, STAGE_WIDTH, 11);
    ctx.fillStyle = '#68d391';
    ctx.fillRect(0, y, STAGE_WIDTH, 3);

    // Repeating diagonal bamboo-weave / shrine tiles on the grass rim
    const tileW = 28;
    const offset = state.scrollDistance % tileW;
    ctx.fillStyle = '#226f48';
    for (let gx = -tileW; gx < STAGE_WIDTH + tileW; gx += tileW) {
      const px = gx - offset;
      ctx.beginPath();
      ctx.moveTo(px, y + 11);
      ctx.lineTo(px + 12, y + 11);
      ctx.lineTo(px + 18, y + 3);
      ctx.lineTo(px + 6, y + 3);
      ctx.closePath();
      ctx.fill();
    }

    // Crimson & gold Hakurei shrine trim border
    ctx.fillStyle = '#b91c2c';
    ctx.fillRect(0, y + 11, STAGE_WIDTH, 6);
    ctx.fillStyle = '#f5c542';
    ctx.fillRect(0, y + 17, STAGE_WIDTH, 2);

    // Scrolling cobblestone & ground speed marks
    const stonePeriod = 48;
    const stoneOff = state.scrollDistance % stonePeriod;
    for (let sx = -stonePeriod; sx < STAGE_WIDTH + stonePeriod; sx += stonePeriod) {
      const px = sx - stoneOff;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      this.drawRoundedRect(ctx, px + 4, y + 27, 34, 16, 6);
      ctx.fill();
      this.drawRoundedRect(ctx, px + 22, y + 51, 30, 15, 6);
      ctx.fill();

      // Gold accent diamond in crimson trim
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.moveTo(px + 24, y + 12);
      ctx.lineTo(px + 27, y + 14);
      ctx.lineTo(px + 24, y + 16);
      ctx.lineTo(px + 21, y + 14);
      ctx.closePath();
      ctx.fill();
    }

    // Ground top crisp shadow line
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(0, y - 1, STAGE_WIDTH, 1.5);
  }

  private drawSpeedLines(ctx: CanvasRenderingContext2D, state: RenderState): void {
    if (state.phase !== 'playing') return;
    const speedRatio = Math.max(
      0,
      (state.speed - PHYSICS.BASE_SPEED) / (PHYSICS.MAX_SPEED - PHYSICS.BASE_SPEED),
    );
    const alpha = 0.07 + speedRatio * 0.16;

    ctx.save();
    ctx.strokeStyle = `rgba(255, 248, 232, ${alpha})`;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';

    for (let i = 0; i < 6; i++) {
      const period = 320 + i * 55;
      const x =
        STAGE_WIDTH + 60 - (((state.scrollDistance * (1.55 + i * 0.12) + i * 97) % period) + period) % period;
      const y = 36 + i * 86 + Math.sin(state.elapsed * 2 + i) * 10;
      const len = 28 + speedRatio * 42 + (i % 3) * 14;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawPlayer(
    ctx: CanvasRenderingContext2D,
    character: CharacterId,
    player: PlayerState,
    phase: RenderState['phase'],
    elapsed: number,
  ): void {
    ctx.save();
    ctx.translate(player.x, player.y);

    // Subtle soft glow behind player so character pops vividly in Scarlet Mist Night
    const glow = ctx.createRadialGradient(0, 0, 6, 0, 0, 32);
    if (character === 'cirno') {
      glow.addColorStop(0, 'rgba(125, 211, 252, 0.34)');
      glow.addColorStop(1, 'rgba(56, 189, 248, 0)');
    } else if (character === 'reimu') {
      glow.addColorStop(0, 'rgba(254, 202, 202, 0.32)');
      glow.addColorStop(1, 'rgba(244, 63, 94, 0)');
    } else {
      glow.addColorStop(0, 'rgba(254, 240, 199, 0.3)');
      glow.addColorStop(1, 'rgba(220, 38, 38, 0)');
    }
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fill();

    // Reimu's orbiting Yin-Yang orbs (drawn in world-oriented orbit around her!)
    if (character === 'reimu') {
      this.drawYinYangOrb(
        ctx,
        Math.cos(player.orbAngle) * 25,
        Math.sin(player.orbAngle) * 17,
        5.5,
        player.orbAngle * 1.8,
      );
    }

    ctx.rotate(player.rotation);

    const isDizzy = phase === 'dying' || phase === 'gameover';
    const flapAngle = isDizzy
      ? 0.45
      : Math.sin(player.wingPhase) * (0.58 + player.wingBoost * 0.35);

    if (character === 'aya') {
      this.drawAya(ctx, flapAngle, isDizzy, elapsed);
    } else if (character === 'reimu') {
      this.drawReimu(ctx, flapAngle, isDizzy, elapsed);
    } else {
      this.drawCirno(ctx, flapAngle, isDizzy, elapsed);
    }

    ctx.restore();

    // Front orbiting Yin-Yang orb for Reimu
    if (character === 'reimu') {
      ctx.save();
      ctx.translate(player.x, player.y);
      this.drawYinYangOrb(
        ctx,
        Math.cos(player.orbAngle + Math.PI) * 25,
        Math.sin(player.orbAngle + Math.PI) * 17,
        5.5,
        -player.orbAngle * 1.8,
      );
      ctx.restore();
    }

    // Comical spinning dizzy stars halo when crashed!
    if (isDizzy) {
      ctx.save();
      ctx.translate(player.x, player.y - 22);
      for (let i = 0; i < 3; i++) {
        const a = player.dizzyTime * 6.5 + (i * Math.PI * 2) / 3;
        const sx = Math.cos(a) * 15;
        const sy = Math.sin(a) * 5.5;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(a);
        this.drawStarPath(ctx, 4, 4.6, 1.9);
        ctx.fillStyle = i % 2 === 0 ? '#fde047' : '#f97316';
        ctx.fill();
        ctx.strokeStyle = '#7c2d12';
        ctx.lineWidth = 0.9;
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
  }

  private drawAya(
    ctx: CanvasRenderingContext2D,
    flapAngle: number,
    isDizzy: boolean,
    elapsed: number,
  ): void {
    // Back black tengu wing
    ctx.save();
    ctx.translate(-5, -2);
    ctx.rotate(-0.28 + flapAngle * 0.85);
    ctx.fillStyle = '#141824';
    ctx.strokeStyle = '#07090e';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-18, -20, -32, -10, -24, 4);
    ctx.bezierCurveTo(-17, 9, -7, 6, 0, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Fluttering red tengu ribbon behind body
    const flutter = Math.sin(elapsed * 14) * 3;
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(-7, 5);
    ctx.quadraticCurveTo(-18, 9 + flutter, -26, 5 - flutter * 0.6);
    ctx.quadraticCurveTo(-18, 15 + flutter * 0.5, -7, 11);
    ctx.closePath();
    ctx.fill();

    // Chibi torso (crisp white blouse + dark skirt + red tengu tie)
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(-1, 6, 11.5, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Dark skirt accent
    ctx.fillStyle = '#1e2230';
    ctx.beginPath();
    ctx.arc(-1, 7.5, 9.8, 0.25, Math.PI - 0.25);
    ctx.closePath();
    ctx.fill();

    // Red tie / collar ribbon
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(3, 2);
    ctx.lineTo(9, 5.5);
    ctx.lineTo(4.5, 10.5);
    ctx.lineTo(1, 6.2);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.fillStyle = '#ffebd6';
    ctx.strokeStyle = '#2d1c22';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(3.5, -5.5, 11.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Glossy short black tengu hair with wind-swept bangs
    ctx.fillStyle = '#181c29';
    ctx.strokeStyle = '#090b12';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(2.5, -7.2, 12.2, Math.PI * 0.85, Math.PI * 2.04);
    ctx.lineTo(14, -4);
    ctx.quadraticCurveTo(10, -10.5, 4, -10.8);
    ctx.quadraticCurveTo(-3, -11, -7.5, -3);
    ctx.quadraticCurveTo(-12.5, -1, -13.5, 2 + flutter * 0.35);
    ctx.quadraticCurveTo(-9, -4, -9.5, -7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Hair highlight glint
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(3, -9.5, 7, Math.PI * 1.15, Math.PI * 1.65);
    ctx.stroke();

    // Iconic red polygonal Tengu Tokin cap + gold cord
    ctx.fillStyle = '#dc2626';
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-2.5, -16);
    ctx.lineTo(8.5, -17.5);
    ctx.lineTo(10.5, -24.5);
    ctx.lineTo(-0.5, -24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-2, -16);
    ctx.lineTo(8.5, -17.3);
    ctx.stroke();

    // Expressive face (crimson determined eyes or dizzy swirls)
    this.drawChibiFace(ctx, 8.2, -4.5, '#c81e32', isDizzy);

    // Front detailed feathered black tengu wing
    ctx.save();
    ctx.translate(-3, 2);
    ctx.rotate(-0.12 - flapAngle);
    ctx.fillStyle = '#242b40';
    ctx.strokeStyle = '#090b12';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(1, 0);
    ctx.bezierCurveTo(-15, -18, -32, -8, -24, 6);
    ctx.lineTo(-27, 9);
    ctx.quadraticCurveTo(-18, 13, -12, 10);
    ctx.lineTo(-14, 13);
    ctx.quadraticCurveTo(-6, 13, 1, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Feather barbs highlight
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-20, 1);
    ctx.lineTo(-8, 3.5);
    ctx.moveTo(-18, 6);
    ctx.lineTo(-7, 6.5);
    ctx.stroke();
    ctx.restore();
  }

  private drawReimu(
    ctx: CanvasRenderingContext2D,
    flapAngle: number,
    isDizzy: boolean,
    elapsed: number,
  ): void {
    const flutter = Math.sin(elapsed * 12) * 3.2;

    // Back flapping wide white-and-red miko sleeve
    ctx.save();
    ctx.translate(-4, 0);
    ctx.rotate(-0.18 + flapAngle * 0.75);
    ctx.fillStyle = '#fff5f5';
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.quadraticCurveTo(-18, -14, -24, -1);
    ctx.quadraticCurveTo(-16, 10, 0, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Oversized iconic red Hakurei ribbon bow behind head!
    ctx.save();
    ctx.translate(-7, -14);
    ctx.rotate(-0.15 + Math.sin(elapsed * 10) * 0.08);
    ctx.fillStyle = '#e03140';
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1.4;
    // Left bow wing
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-14, -12, -16, 1);
    ctx.quadraticCurveTo(-12, 9, 0, 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Upper bow wing
    ctx.beginPath();
    ctx.moveTo(1, 0);
    ctx.quadraticCurveTo(-4, -16, 8, -12);
    ctx.quadraticCurveTo(10, -4, 3, 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Fluttering trailing ribbon tails
    ctx.beginPath();
    ctx.moveTo(-2, 3);
    ctx.quadraticCurveTo(-14, 10 + flutter, -21, 7 - flutter * 0.5);
    ctx.lineTo(-17, 13 - flutter * 0.4);
    ctx.quadraticCurveTo(-10, 12 + flutter * 0.5, 0, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Miko outfit body (crimson hakama & white haori collar)
    ctx.fillStyle = '#dc2626';
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(-1, 6.5, 11.5, 9.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // White miko blouse upper chest + yellow neckerchief
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 3.5, 8.8, Math.PI * 1.05, Math.PI * 1.98);
    ctx.lineTo(5, 8);
    ctx.lineTo(-6, 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(2.5, 3);
    ctx.lineTo(8.5, 5.5);
    ctx.lineTo(4.2, 9.5);
    ctx.lineTo(1, 6);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.fillStyle = '#ffebd6';
    ctx.strokeStyle = '#3b1d24';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(3.5, -5.5, 11.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Dark chestnut-brown hair with side hair tubes
    ctx.fillStyle = '#2c181d';
    ctx.strokeStyle = '#14090c';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(2.5, -7, 12.2, Math.PI * 0.82, Math.PI * 2.02);
    ctx.lineTo(13.8, -4.5);
    ctx.quadraticCurveTo(9, -11, 3.5, -10.8);
    ctx.quadraticCurveTo(-4, -10.5, -7.8, -2);
    ctx.quadraticCurveTo(-11, 4, -8, 8);
    ctx.quadraticCurveTo(-13, 3, -10, -7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cute white hair tube accessory on side lock
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1;
    this.drawRoundedRect(ctx, -2.5, 0.5, 4.2, 6, 1.8);
    ctx.fill();
    ctx.stroke();

    // Expressive face (warm crimson-brown eyes)
    this.drawChibiFace(ctx, 8.2, -4.5, '#b91c1c', isDizzy);

    // Front fluttering miko sleeve (acts as graceful wing!)
    ctx.save();
    ctx.translate(-2, 3);
    ctx.rotate(-0.08 - flapAngle * 0.92);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(2, -1);
    ctx.bezierCurveTo(-12, -15, -26, -7, -21, 7);
    ctx.quadraticCurveTo(-12, 12, 2, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Red sleeve tie trim
    ctx.strokeStyle = '#e03140';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-16, -2);
    ctx.lineTo(-14, 7);
    ctx.stroke();
    ctx.restore();
  }

  private drawCirno(
    ctx: CanvasRenderingContext2D,
    flapAngle: number,
    isDizzy: boolean,
    elapsed: number,
  ): void {
    const shimmer = 0.72 + Math.sin(elapsed * 8) * 0.14;

    // Cirno's 6 translucent crystalline ice wings (3 back + 3 front icicle blades!)
    const drawIceWingFan = (angleOffset: number, scale: number, alpha: number) => {
      ctx.save();
      ctx.translate(-5, 0);
      ctx.rotate(angleOffset);
      ctx.scale(scale, scale);

      const wingAngles = [-0.62, -0.08, 0.44];
      const wingLengths = [23, 27, 21];

      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.rotate(wingAngles[i]);
        const len = wingLengths[i];
        const grad = ctx.createLinearGradient(0, 0, -len, 0);
        grad.addColorStop(0, `rgba(224, 247, 255, ${alpha})`);
        grad.addColorStop(0.55, `rgba(96, 205, 255, ${alpha * 0.92})`);
        grad.addColorStop(1, `rgba(186, 238, 255, ${alpha * 0.85})`);
        ctx.fillStyle = grad;
        ctx.strokeStyle = `rgba(37, 99, 235, ${alpha * 0.9})`;
        ctx.lineWidth = 1.3;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-len * 0.48, -4.8);
        ctx.lineTo(-len, 0);
        ctx.lineTo(-len * 0.48, 4.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Crystal core facet line
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(-2, 0);
        ctx.lineTo(-len + 3, 0);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    };

    // Back ice wings
    drawIceWingFan(flapAngle * 0.65 - 0.18, 0.92, shimmer * 0.72);

    // Cute blue fairy dress with white collar & ribbon
    ctx.fillStyle = '#3b82f6';
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(-1, 6.5, 11, 8.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // White blouse & scalloped trim
    ctx.fillStyle = '#eff6ff';
    ctx.beginPath();
    ctx.arc(0, 3.2, 8.4, Math.PI * 1.05, Math.PI * 1.98);
    ctx.lineTo(5, 7.5);
    ctx.lineTo(-5, 7.5);
    ctx.closePath();
    ctx.fill();

    // Red chest ribbon
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(2.5, 3);
    ctx.lineTo(8, 5.2);
    ctx.lineTo(4, 9);
    ctx.lineTo(1, 5.8);
    ctx.closePath();
    ctx.fill();

    // Blue hair bow behind head
    ctx.save();
    ctx.translate(-6, -15);
    ctx.fillStyle = '#60a5fa';
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(-5, -1, 6.5, 4, -0.35, 0, Math.PI * 2);
    ctx.ellipse(3, -5, 5.5, 3.5, 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Head
    ctx.fillStyle = '#fff0e0';
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(3.5, -5.5, 11.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Light cyan bob hair
    ctx.fillStyle = '#60c5ff';
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.arc(2.5, -7, 12, Math.PI * 0.78, Math.PI * 2.02);
    ctx.lineTo(13.5, -4);
    ctx.quadraticCurveTo(9, -10.8, 3.5, -10.6);
    ctx.quadraticCurveTo(-4, -10.2, -7.5, -1.5);
    ctx.quadraticCurveTo(-11, 2.5, -8.5, 5.5);
    ctx.quadraticCurveTo(-12.5, 0, -9.8, -7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Hair ice sheen
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(3, -9.5, 7, Math.PI * 1.18, Math.PI * 1.65);
    ctx.stroke();

    // Expressive face (vivid sapphire eyes)
    this.drawChibiFace(ctx, 8.2, -4.5, '#1d4ed8', isDizzy);

    // Front translucent ice wings
    drawIceWingFan(-flapAngle * 0.85 + 0.06, 1, shimmer);
  }

  private drawChibiFace(
    ctx: CanvasRenderingContext2D,
    eyeX: number,
    eyeY: number,
    eyeColor: string,
    isDizzy: boolean,
  ): void {
    // Rosy cheek blush
    ctx.fillStyle = 'rgba(251, 113, 133, 0.55)';
    ctx.beginPath();
    ctx.ellipse(eyeX + 1.8, eyeY + 3.4, 2.5, 1.3, 0, 0, Math.PI * 2);
    ctx.fill();

    if (isDizzy) {
      // Comical "> <" / swirl dizzy eye
      ctx.strokeStyle = '#2d1c22';
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(eyeX - 2.2, eyeY - 2.4);
      ctx.lineTo(eyeX + 1.6, eyeY);
      ctx.lineTo(eyeX - 2.2, eyeY + 2.4);
      ctx.stroke();

      // Tiny surprised "o" mouth
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.arc(eyeX + 2.2, eyeY + 5.2, 1.5, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // Sparkling anime eye
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.ellipse(eyeX, eyeY, 2.3, 3.1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye catchlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(eyeX + 0.7, eyeY - 1.2, 1, 0, Math.PI * 2);
    ctx.fill();

    // Confident cute smile
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1.15;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(eyeX + 1.4, eyeY + 4.4, 2, 0.2, Math.PI * 0.85);
    ctx.stroke();
  }

  private drawYinYangOrb(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    spin: number,
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spin);

    // Outer white half
    ctx.fillStyle = '#fff5f5';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Red Yin-Yang swirl
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.arc(0, r * 0.5, r * 0.5, Math.PI * 0.5, -Math.PI * 0.5, true);
    ctx.arc(0, -r * 0.5, r * 0.5, Math.PI * 0.5, -Math.PI * 0.5, false);
    ctx.closePath();
    ctx.fill();

    // Dots
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(0, -r * 0.5, r * 0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff5f5';
    ctx.beginPath();
    ctx.arc(0, r * 0.5, r * 0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
    for (const p of particles) {
      const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      switch (p.kind) {
        case 'maple': {
          // Stylized red/amber autumn maple leaf
          ctx.fillStyle = p.color;
          ctx.beginPath();
          const s = p.size;
          ctx.moveTo(0, -s);
          ctx.lineTo(s * 0.35, -s * 0.35);
          ctx.lineTo(s, -s * 0.3);
          ctx.lineTo(s * 0.45, s * 0.15);
          ctx.lineTo(s * 0.72, s * 0.85);
          ctx.lineTo(0, s * 0.45);
          ctx.lineTo(-s * 0.72, s * 0.85);
          ctx.lineTo(-s * 0.45, s * 0.15);
          ctx.lineTo(-s, -s * 0.3);
          ctx.lineTo(-s * 0.35, -s * 0.35);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'sakura': {
          // Soft pink notched sakura petal
          const s = p.size;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(0, s);
          ctx.bezierCurveTo(s * 0.95, s * 0.4, s * 0.85, -s * 0.75, s * 0.24, -s);
          ctx.lineTo(0, -s * 0.6);
          ctx.lineTo(-s * 0.24, -s);
          ctx.bezierCurveTo(-s * 0.85, -s * 0.75, -s * 0.95, s * 0.4, 0, s);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'snowflake': {
          // 6-ray crystalline snowflake
          const s = p.size;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.4;
          ctx.lineCap = 'round';
          for (let i = 0; i < 3; i++) {
            const a = (i * Math.PI) / 3;
            const dx = Math.cos(a) * s;
            const dy = Math.sin(a) * s;
            ctx.beginPath();
            ctx.moveTo(-dx, -dy);
            ctx.lineTo(dx, dy);
            ctx.stroke();
          }
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'feather': {
          const s = p.size;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, s * 1.15, s * 0.42, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'wind': {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.8;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(0, 0, p.size, -0.6, 0.6);
          ctx.stroke();
          break;
        }
        case 'ring': {
          const progress = 1 - alpha;
          const r = p.size * (0.6 + progress * 1.85);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = Math.max(1, 3 * alpha);
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case 'starBurst': {
          this.drawStarPath(ctx, 5, p.size, p.size * 0.46);
          ctx.fillStyle = p.color;
          ctx.fill();
          break;
        }
        default: {
          // 4-point danmaku sparkle
          const s = p.size;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(0, -s);
          ctx.lineTo(s * 0.34, -s * 0.34);
          ctx.lineTo(s, 0);
          ctx.lineTo(s * 0.34, s * 0.34);
          ctx.lineTo(0, s);
          ctx.lineTo(-s * 0.34, s * 0.34);
          ctx.lineTo(-s, 0);
          ctx.lineTo(-s * 0.34, -s * 0.34);
          ctx.closePath();
          ctx.fill();
          break;
        }
      }

      ctx.restore();
    }
  }

  private drawFloatingTexts(ctx: CanvasRenderingContext2D, texts: FloatingText[]): void {
    for (const ft of texts) {
      const alpha = Math.max(0, Math.min(1, ft.life / (ft.maxLife * 0.55)));
      const pop = 1 + Math.max(0, (ft.life - ft.maxLife * 0.72) / (ft.maxLife * 0.28)) * 0.22;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(ft.x, ft.y);
      ctx.scale(ft.scale * pop, ft.scale * pop);
      ctx.font = '900 18px system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = ft.strokeColor;
      ctx.lineJoin = 'round';
      ctx.strokeText(ft.text, 0, 0);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, 0, 0);
      ctx.restore();
    }
  }

  private drawPhaseBanner(ctx: CanvasRenderingContext2D, text: string, timer: number): void {
    // Smooth fade-in and fade-out across 2.4s banner duration
    const total = 2.4;
    const elapsed = total - timer;
    let alpha = 1;
    if (elapsed < 0.3) alpha = elapsed / 0.3;
    else if (timer < 0.45) alpha = timer / 0.45;
    alpha = Math.max(0, Math.min(1, alpha));

    ctx.save();
    ctx.globalAlpha = alpha;
    const y = 114;

    const bgGrad = ctx.createLinearGradient(50, y, STAGE_WIDTH - 50, y);
    bgGrad.addColorStop(0, 'rgba(18, 12, 34, 0)');
    bgGrad.addColorStop(0.22, 'rgba(24, 14, 42, 0.76)');
    bgGrad.addColorStop(0.78, 'rgba(24, 14, 42, 0.76)');
    bgGrad.addColorStop(1, 'rgba(18, 12, 34, 0)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(46, y - 18, STAGE_WIDTH - 92, 36);

    ctx.strokeStyle = 'rgba(245, 197, 66, 0.65)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(86, y - 18);
    ctx.lineTo(STAGE_WIDTH - 86, y - 18);
    ctx.moveTo(86, y + 18);
    ctx.lineTo(STAGE_WIDTH - 86, y + 18);
    ctx.stroke();

    ctx.font = '700 15px system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fde68a';
    ctx.fillText(`✦ ${text} ✦`, STAGE_WIDTH * 0.5, y);
    ctx.restore();
  }

  private drawStarPath(
    ctx: CanvasRenderingContext2D,
    points: number,
    outerR: number,
    innerR: number,
  ): void {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = (i * Math.PI) / points - Math.PI * 0.5;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    const radius = Math.min(r, w * 0.5, h * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }
}
