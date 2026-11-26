import {
  GROUND_HEIGHT,
  PHYSICS,
  PLAYABLE_HEIGHT,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  type DanmakuOrb,
  type FloatingText,
  type Particle,
  type PipeObstacle,
  type PlayerAfterimage,
  type RenderState,
  type StarCollectible,
} from './types';

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface SkyPalette {
  zenith: RGB;
  upper: RGB;
  mid: RGB;
  horizon: RGB;
  mountainFar: RGB;
  mountainMid: RGB;
  hillNear: RGB;
  bambooFar: RGB;
  bambooNear: RGB;
  cloudTop: RGB;
  cloudShadow: RGB;
  rayColor: RGB;
  rayAlpha: number;
  mistColor: RGB;
  mistAlpha: number;
  starAlpha: number;
  lanternGlow: number;
}

const PALETTE_DAWN: SkyPalette = {
  zenith: { r: 34, g: 52, b: 108 },
  upper: { r: 78, g: 102, b: 162 },
  mid: { r: 166, g: 148, b: 194 },
  horizon: { r: 252, g: 204, b: 152 },
  mountainFar: { r: 84, g: 92, b: 140 },
  mountainMid: { r: 58, g: 78, b: 112 },
  hillNear: { r: 34, g: 64, b: 74 },
  bambooFar: { r: 30, g: 76, b: 64 },
  bambooNear: { r: 20, g: 64, b: 50 },
  cloudTop: { r: 255, g: 247, b: 234 },
  cloudShadow: { r: 186, g: 166, b: 204 },
  rayColor: { r: 255, g: 238, b: 190 },
  rayAlpha: 0.12,
  mistColor: { r: 248, g: 236, b: 214 },
  mistAlpha: 0.24,
  starAlpha: 0.2,
  lanternGlow: 0.45,
};

const PALETTE_SUNSET: SkyPalette = {
  zenith: { r: 32, g: 20, b: 66 },
  upper: { r: 104, g: 38, b: 88 },
  mid: { r: 204, g: 82, b: 84 },
  horizon: { r: 252, g: 164, b: 86 },
  mountainFar: { r: 74, g: 34, b: 74 },
  mountainMid: { r: 52, g: 26, b: 58 },
  hillNear: { r: 34, g: 22, b: 44 },
  bambooFar: { r: 36, g: 36, b: 50 },
  bambooNear: { r: 22, g: 30, b: 40 },
  cloudTop: { r: 255, g: 216, b: 164 },
  cloudShadow: { r: 148, g: 56, b: 84 },
  rayColor: { r: 255, g: 196, b: 120 },
  rayAlpha: 0.16,
  mistColor: { r: 248, g: 148, b: 108 },
  mistAlpha: 0.3,
  starAlpha: 0.56,
  lanternGlow: 0.82,
};

const PALETTE_SCARLET: SkyPalette = {
  zenith: { r: 13, g: 7, b: 26 },
  upper: { r: 44, g: 11, b: 34 },
  mid: { r: 102, g: 18, b: 44 },
  horizon: { r: 166, g: 30, b: 56 },
  mountainFar: { r: 52, g: 14, b: 34 },
  mountainMid: { r: 34, g: 10, b: 26 },
  hillNear: { r: 20, g: 9, b: 22 },
  bambooFar: { r: 26, g: 17, b: 32 },
  bambooNear: { r: 16, g: 16, b: 26 },
  cloudTop: { r: 248, g: 122, b: 142 },
  cloudShadow: { r: 92, g: 20, b: 44 },
  rayColor: { r: 255, g: 132, b: 158 },
  rayAlpha: 0.13,
  mistColor: { r: 226, g: 52, b: 84 },
  mistAlpha: 0.38,
  starAlpha: 0.98,
  lanternGlow: 1,
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerpRgb(out: RGB, a: RGB, b: RGB, t: number): void {
  out.r = Math.round(a.r + (b.r - a.r) * t);
  out.g = Math.round(a.g + (b.g - a.g) * t);
  out.b = Math.round(a.b + (b.b - a.b) * t);
}

function rgbStr(c: RGB, alpha = 1): string {
  return alpha >= 1 ? `rgb(${c.r}, ${c.g}, ${c.b})` : `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
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
  layer: 0 | 1;
  puffSeed: number;
}

interface BgBamboo {
  offsetX: number;
  width: number;
  height: number;
  lean: number;
  layer: 0 | 1;
  leafSeed: number;
}

interface AmbientMote {
  x: number;
  y: number;
  speedX: number;
  speedY: number;
  phase: number;
  size: number;
}

interface CachedGradients {
  ctx: CanvasRenderingContext2D;
  bambooShaft: CanvasGradient;
  bambooCap: CanvasGradient;
  toriiShaft: CanvasGradient;
  toriiCap: CanvasGradient;
  lanternGlow: CanvasGradient;
  groundBase: CanvasGradient;
  playerGlowAya: CanvasGradient;
  playerGlowReimu: CanvasGradient;
  playerGlowCirno: CanvasGradient;
  powerAura: CanvasGradient;
  faithAura: CanvasGradient;
  danmakuScarletAura: CanvasGradient;
  danmakuGoldAura: CanvasGradient;
  skyGrad: CanvasGradient | null;
  skyKey: number;
}

export class FlappyRenderer {
  private readonly bgStars: BgStar[];
  private readonly bgClouds: BgCloud[];
  private readonly bgBamboos: BgBamboo[];
  private readonly ambientMotes: AmbientMote[];
  private cache: CachedGradients | null = null;

  // Reusable palette object (zero per-frame allocations)
  private readonly pal: SkyPalette = {
    zenith: { r: 0, g: 0, b: 0 },
    upper: { r: 0, g: 0, b: 0 },
    mid: { r: 0, g: 0, b: 0 },
    horizon: { r: 0, g: 0, b: 0 },
    mountainFar: { r: 0, g: 0, b: 0 },
    mountainMid: { r: 0, g: 0, b: 0 },
    hillNear: { r: 0, g: 0, b: 0 },
    bambooFar: { r: 0, g: 0, b: 0 },
    bambooNear: { r: 0, g: 0, b: 0 },
    cloudTop: { r: 0, g: 0, b: 0 },
    cloudShadow: { r: 0, g: 0, b: 0 },
    rayColor: { r: 0, g: 0, b: 0 },
    rayAlpha: 0,
    mistColor: { r: 0, g: 0, b: 0 },
    mistAlpha: 0,
    starAlpha: 0,
    lanternGlow: 0,
  };

  constructor() {
    this.bgStars = Array.from({ length: 46 }, (_, i) => ({
      x: ((i * 73 + 19) % (STAGE_WIDTH - 16)) + 8,
      y: ((i * 41 + 13) % 240) + 12,
      size: 1 + ((i * 19) % 10) * 0.15,
      phase: i * 0.87,
      diamond: i % 5 === 0,
    }));

    this.bgClouds = [
      // Far wispy cirrus layer
      { x: 32, y: 74, width: 138, height: 15, speedScale: 0.04, layer: 0, puffSeed: 1 },
      { x: 245, y: 108, width: 164, height: 16, speedScale: 0.035, layer: 0, puffSeed: 2 },
      { x: 430, y: 58, width: 128, height: 14, speedScale: 0.045, layer: 0, puffSeed: 3 },
      // Mid painterly cloud puffs
      { x: 85, y: 152, width: 124, height: 22, speedScale: 0.08, layer: 1, puffSeed: 4 },
      { x: 310, y: 178, width: 140, height: 24, speedScale: 0.07, layer: 1, puffSeed: 5 },
      { x: 475, y: 134, width: 112, height: 20, speedScale: 0.095, layer: 1, puffSeed: 6 },
    ];

    // Two parallax depth planes of swaying Lost Bamboo Forest
    this.bgBamboos = Array.from({ length: 24 }, (_, i) => ({
      offsetX: i * 32 + ((i * 17) % 18),
      width: i % 2 === 0 ? 5.5 + (i % 3) * 1.4 : 8.5 + (i % 3) * 2.2,
      height: i % 2 === 0 ? 195 + ((i * 37) % 150) : 230 + ((i * 43) % 175),
      lean: ((i % 5) - 2) * 0.022,
      layer: (i % 2) as 0 | 1,
      leafSeed: i * 1.37,
    }));

    // Deterministic ambient drifting sakura petals & fireflies
    this.ambientMotes = Array.from({ length: 22 }, (_, i) => ({
      x: (i * 47 + 23) % STAGE_WIDTH,
      y: 70 + ((i * 61) % (PLAYABLE_HEIGHT - 110)),
      speedX: 16 + (i % 5) * 6,
      speedY: 9 + (i % 4) * 4.5,
      phase: i * 1.13,
      size: 2.6 + (i % 4) * 0.9,
    }));
  }

  private ensureCache(ctx: CanvasRenderingContext2D): CachedGradients {
    if (this.cache && this.cache.ctx === ctx) {
      return this.cache;
    }

    const w = PHYSICS.PIPE_WIDTH;
    const capOver = PHYSICS.PIPE_CAP_OVERHANG;
    const toriiOver = PHYSICS.PIPE_CAP_OVERHANG + 4;

    const bambooShaft = ctx.createLinearGradient(0, 0, w, 0);
    bambooShaft.addColorStop(0, '#0d3b27');
    bambooShaft.addColorStop(0.18, '#238252');
    bambooShaft.addColorStop(0.36, '#5cd68d');
    bambooShaft.addColorStop(0.46, '#96f2b6');
    bambooShaft.addColorStop(0.72, '#1f7449');
    bambooShaft.addColorStop(0.92, '#0d3623');
    bambooShaft.addColorStop(1, '#256b49'); // subtle warm bounced rim light

    const bambooCap = ctx.createLinearGradient(-capOver, 0, w + capOver, 0);
    bambooCap.addColorStop(0, '#0b3824');
    bambooCap.addColorStop(0.22, '#2d9960');
    bambooCap.addColorStop(0.42, '#7ceaa6');
    bambooCap.addColorStop(0.74, '#1b6d44');
    bambooCap.addColorStop(1, '#12462e');

    const toriiShaft = ctx.createLinearGradient(0, 0, w, 0);
    toriiShaft.addColorStop(0, '#5c0a14');
    toriiShaft.addColorStop(0.22, '#cf2034');
    toriiShaft.addColorStop(0.4, '#f86974');
    toriiShaft.addColorStop(0.5, '#ff9aa2');
    toriiShaft.addColorStop(0.75, '#ad1628');
    toriiShaft.addColorStop(0.93, '#4f0811');
    toriiShaft.addColorStop(1, '#821c29');

    const toriiCap = ctx.createLinearGradient(-toriiOver, 0, w + toriiOver, 0);
    toriiCap.addColorStop(0, '#5a0913');
    toriiCap.addColorStop(0.25, '#da2538');
    toriiCap.addColorStop(0.45, '#ff7d88');
    toriiCap.addColorStop(0.78, '#a61425');
    toriiCap.addColorStop(1, '#610c17');

    const lanternGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
    lanternGlow.addColorStop(0, 'rgba(255, 228, 148, 0.72)');
    lanternGlow.addColorStop(0.42, 'rgba(255, 130, 72, 0.3)');
    lanternGlow.addColorStop(1, 'rgba(230, 52, 42, 0)');

    const groundBase = ctx.createLinearGradient(0, PLAYABLE_HEIGHT, 0, STAGE_HEIGHT);
    groundBase.addColorStop(0, '#234a39');
    groundBase.addColorStop(0.26, '#1a2d30');
    groundBase.addColorStop(0.62, '#131d26');
    groundBase.addColorStop(1, '#0b1019');

    const playerGlowAya = ctx.createRadialGradient(0, 0, 5, 0, 0, 34);
    playerGlowAya.addColorStop(0, 'rgba(254, 240, 199, 0.34)');
    playerGlowAya.addColorStop(0.55, 'rgba(239, 68, 68, 0.12)');
    playerGlowAya.addColorStop(1, 'rgba(220, 38, 38, 0)');

    const playerGlowReimu = ctx.createRadialGradient(0, 0, 5, 0, 0, 34);
    playerGlowReimu.addColorStop(0, 'rgba(255, 224, 230, 0.36)');
    playerGlowReimu.addColorStop(0.55, 'rgba(244, 63, 94, 0.14)');
    playerGlowReimu.addColorStop(1, 'rgba(244, 63, 94, 0)');

    const playerGlowCirno = ctx.createRadialGradient(0, 0, 5, 0, 0, 34);
    playerGlowCirno.addColorStop(0, 'rgba(186, 238, 255, 0.4)');
    playerGlowCirno.addColorStop(0.55, 'rgba(56, 189, 248, 0.15)');
    playerGlowCirno.addColorStop(1, 'rgba(56, 189, 248, 0)');

    const powerAura = ctx.createRadialGradient(0, 0, 3, 0, 0, 32);
    powerAura.addColorStop(0, 'rgba(255, 232, 118, 0.8)');
    powerAura.addColorStop(0.5, 'rgba(239, 68, 68, 0.36)');
    powerAura.addColorStop(1, 'rgba(239, 68, 68, 0)');

    const faithAura = ctx.createRadialGradient(0, 0, 3, 0, 0, 32);
    faithAura.addColorStop(0, 'rgba(204, 242, 255, 0.85)');
    faithAura.addColorStop(0.5, 'rgba(250, 204, 21, 0.36)');
    faithAura.addColorStop(1, 'rgba(56, 189, 248, 0)');

    const danmakuScarletAura = ctx.createRadialGradient(0, 0, 4, 0, 0, 28);
    danmakuScarletAura.addColorStop(0, 'rgba(255, 224, 232, 0.92)');
    danmakuScarletAura.addColorStop(0.45, 'rgba(244, 63, 94, 0.56)');
    danmakuScarletAura.addColorStop(0.8, 'rgba(225, 29, 72, 0.2)');
    danmakuScarletAura.addColorStop(1, 'rgba(190, 18, 60, 0)');

    const danmakuGoldAura = ctx.createRadialGradient(0, 0, 4, 0, 0, 28);
    danmakuGoldAura.addColorStop(0, 'rgba(255, 251, 210, 0.92)');
    danmakuGoldAura.addColorStop(0.45, 'rgba(250, 204, 21, 0.56)');
    danmakuGoldAura.addColorStop(0.8, 'rgba(245, 158, 11, 0.2)');
    danmakuGoldAura.addColorStop(1, 'rgba(217, 119, 6, 0)');

    this.cache = {
      ctx,
      bambooShaft,
      bambooCap,
      toriiShaft,
      toriiCap,
      lanternGlow,
      groundBase,
      playerGlowAya,
      playerGlowReimu,
      playerGlowCirno,
      powerAura,
      faithAura,
      danmakuScarletAura,
      danmakuGoldAura,
      skyGrad: null,
      skyKey: -1,
    };
    return this.cache;
  }

  private samplePalette(progress: number): SkyPalette {
    const p = clamp(progress, 0, 2);
    const from = p < 1 ? PALETTE_DAWN : PALETTE_SUNSET;
    const to = p < 1 ? PALETTE_SUNSET : PALETTE_SCARLET;
    const t = p < 1 ? p : p - 1;
    const out = this.pal;
    lerpRgb(out.zenith, from.zenith, to.zenith, t);
    lerpRgb(out.upper, from.upper, to.upper, t);
    lerpRgb(out.mid, from.mid, to.mid, t);
    lerpRgb(out.horizon, from.horizon, to.horizon, t);
    lerpRgb(out.mountainFar, from.mountainFar, to.mountainFar, t);
    lerpRgb(out.mountainMid, from.mountainMid, to.mountainMid, t);
    lerpRgb(out.hillNear, from.hillNear, to.hillNear, t);
    lerpRgb(out.bambooFar, from.bambooFar, to.bambooFar, t);
    lerpRgb(out.bambooNear, from.bambooNear, to.bambooNear, t);
    lerpRgb(out.cloudTop, from.cloudTop, to.cloudTop, t);
    lerpRgb(out.cloudShadow, from.cloudShadow, to.cloudShadow, t);
    lerpRgb(out.rayColor, from.rayColor, to.rayColor, t);
    out.rayAlpha = lerp(from.rayAlpha, to.rayAlpha, t);
    lerpRgb(out.mistColor, from.mistColor, to.mistColor, t);
    out.mistAlpha = lerp(from.mistAlpha, to.mistAlpha, t);
    out.starAlpha = lerp(from.starAlpha, to.starAlpha, t);
    out.lanternGlow = lerp(from.lanternGlow, to.lanternGlow, t);
    return out;
  }

  public render(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const cache = this.ensureCache(ctx);
    const palette = this.samplePalette(state.skyProgress);
    const alpha = state.interpAlpha;
    const scroll = lerp(state.prevScrollDistance, state.scrollDistance, alpha);

    ctx.save();

    if (state.shakeTime > 0) {
      const mag = state.shakeIntensity * (state.shakeTime / 0.28);
      ctx.translate((Math.random() * 2 - 1) * mag, (Math.random() * 2 - 1) * mag);
    }

    this.drawSkyAndCelestials(ctx, cache, state, palette, scroll);
    this.drawParallaxMountains(ctx, state, palette, scroll);
    this.drawShrineHillsAndBambooGrove(ctx, cache, state, palette, scroll);
    this.drawAmbientMistAndMotes(ctx, state, palette, scroll);

    // Sub-pixel smooth pipes, collectibles & incident danmaku orbs
    const playerY = lerp(state.player.prevY, state.player.y, alpha);
    const playerRot = lerp(state.player.prevRotation, state.player.rotation, alpha);

    for (let i = 0; i < state.pipes.length; i++) {
      const pipe = state.pipes[i];
      const pipeX = lerp(pipe.prevX, pipe.x, alpha);
      this.drawPipePair(ctx, cache, pipe, pipeX, state.elapsed);
    }

    for (let i = 0; i < state.stars.length; i++) {
      const star = state.stars[i];
      if (!star.collected) {
        const sx = lerp(star.prevX, star.x, alpha);
        const sy = lerp(star.prevY, star.y, alpha);
        if (state.character === 'reimu' && state.phase === 'playing') {
          const dx = state.player.x - sx;
          const dy = playerY - sy;
          const dist = Math.hypot(dx, dy);
          if (dist < PHYSICS.REIMU_MAGNET_RADIUS) {
            this.drawMagnetTether(ctx, sx, sy, state.player.x, playerY, 1 - dist / PHYSICS.REIMU_MAGNET_RADIUS);
          }
        }
        this.drawCollectible(ctx, cache, star, sx, sy, state.elapsed);
      }
    }

    const isFrozen = state.cirnoFreezeTimer > 0;
    for (let i = 0; i < state.danmaku.length; i++) {
      const orb = state.danmaku[i];
      if (!orb.shattered) {
        const ox = lerp(orb.prevX, orb.x, alpha);
        const oy = lerp(orb.prevY, orb.y, alpha);
        this.drawDanmakuOrb(ctx, cache, orb, ox, oy, state.elapsed, isFrozen);
      }
    }

    // Foreground mossy shrine stone path & subtle speed lines
    this.drawGround(ctx, cache, state, scroll);
    this.drawSpeedLines(ctx, state, scroll);

    // Aya maple-leaf dash afterimages
    if (state.afterimages.length > 0) {
      this.drawAfterimages(ctx, state.afterimages);
    }

    // Reimu expanding Yin-Yang barrier pulse
    if (state.reimuBarrierTimer > 0) {
      this.drawReimuBarrierWave(ctx, state);
    }

    // Pooled active particles
    this.drawParticles(ctx, state.particles, state.particleCount);

    // Detailed chibi flyer with sub-pixel interpolation + squash-and-stretch
    this.drawPlayer(ctx, cache, state, playerY, playerRot);

    // Cirno Perfect Freeze frosty crystalline screen border
    if (state.cirnoFreezeTimer > 0) {
      this.drawFrostVignette(ctx, state.cirnoFreezeTimer, state.elapsed);
    }

    // Floating score / graze / shatter popups
    this.drawFloatingTexts(ctx, state.floatingTexts);

    // Spell Card activation banner (takes priority cleanly over sky banner)
    if (state.spellBannerTimer > 0 && state.spellBannerText) {
      this.drawSpellBanner(ctx, state.spellBannerText, state.spellBannerTimer, state.spellBannerColor);
    } else if (state.phaseBannerTimer > 0 && state.phaseBannerText) {
      this.drawPhaseBanner(ctx, state.phaseBannerText, state.phaseBannerTimer);
    }

    // Impact flash
    if (state.flashAlpha > 0.01) {
      ctx.fillStyle = `rgba(255, 248, 242, ${Math.min(0.82, state.flashAlpha)})`;
      ctx.fillRect(-14, -14, STAGE_WIDTH + 28, STAGE_HEIGHT + 28);
    }

    ctx.restore();
  }

  private drawSkyAndCelestials(
    ctx: CanvasRenderingContext2D,
    cache: CachedGradients,
    state: RenderState,
    palette: SkyPalette,
    scroll: number,
  ): void {
    const skyKey = Math.round(state.skyProgress * 240);
    if (!cache.skyGrad || cache.skyKey !== skyKey) {
      const grad = ctx.createLinearGradient(0, 0, 0, PLAYABLE_HEIGHT);
      grad.addColorStop(0, rgbStr(palette.zenith));
      grad.addColorStop(0.32, rgbStr(palette.upper));
      grad.addColorStop(0.68, rgbStr(palette.mid));
      grad.addColorStop(1, rgbStr(palette.horizon));
      cache.skyGrad = grad;
      cache.skyKey = skyKey;
    }
    ctx.fillStyle = cache.skyGrad;
    ctx.fillRect(0, 0, STAGE_WIDTH, PLAYABLE_HEIGHT + 2);

    // Twinkling stars & danmaku glints
    if (palette.starAlpha > 0.04) {
      for (let i = 0; i < this.bgStars.length; i++) {
        const s = this.bgStars[i];
        const twinkle = 0.42 + 0.58 * Math.sin(state.elapsed * 2.5 + s.phase);
        const alpha = palette.starAlpha * twinkle;
        ctx.fillStyle =
          state.skyProgress > 1.35 && s.diamond
            ? `rgba(255, 200, 216, ${alpha})`
            : `rgba(255, 248, 222, ${alpha})`;
        if (s.diamond) {
          ctx.beginPath();
          ctx.moveTo(s.x, s.y - s.size * 2.3);
          ctx.lineTo(s.x + s.size * 0.72, s.y - s.size * 0.72);
          ctx.lineTo(s.x + s.size * 2.3, s.y);
          ctx.lineTo(s.x + s.size * 0.72, s.y + s.size * 0.72);
          ctx.lineTo(s.x, s.y + s.size * 2.3);
          ctx.lineTo(s.x - s.size * 0.72, s.y + s.size * 0.72);
          ctx.lineTo(s.x - s.size * 2.3, s.y);
          ctx.lineTo(s.x - s.size * 0.72, s.y - s.size * 0.72);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Celestial anchor for god-rays
    let rayOriginX = 392;
    let rayOriginY = 122;

    // Dawn / Golden Sunset Sun
    if (state.skyProgress < 1.55) {
      const sunFade = Math.max(0, 1 - Math.max(0, state.skyProgress - 0.85) / 0.7);
      const sunX = lerp(398, 356, Math.min(1, state.skyProgress));
      const sunY = lerp(124, 240, Math.min(1.4, state.skyProgress));
      const sunR = lerp(34, 44, Math.min(1, state.skyProgress));
      rayOriginX = sunX;
      rayOriginY = sunY;

      const halo = ctx.createRadialGradient(sunX, sunY, sunR * 0.35, sunX, sunY, sunR * 3.4);
      halo.addColorStop(0, `rgba(255, 242, 194, ${0.62 * sunFade})`);
      halo.addColorStop(0.38, `rgba(255, 168, 102, ${0.3 * sunFade})`);
      halo.addColorStop(0.72, `rgba(255, 118, 86, ${0.1 * sunFade})`);
      halo.addColorStop(1, 'rgba(255, 110, 82, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR * 3.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 248, 224, ${0.96 * sunFade})`;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Giant Scarlet Moon with luminous volumetric halo
    if (state.skyProgress > 0.72) {
      const moonT = Math.min(1, (state.skyProgress - 0.72) / 1.15);
      const moonX = 394;
      const moonY = lerp(226, 116, moonT);
      const moonR = lerp(38, 60, moonT);
      if (state.skyProgress >= 1.15) {
        rayOriginX = moonX;
        rayOriginY = moonY;
      }

      // Outer volumetric moon halo
      const moonHalo = ctx.createRadialGradient(moonX, moonY, moonR * 0.6, moonX, moonY, moonR * 2.9);
      moonHalo.addColorStop(0, `rgba(255, 112, 134, ${0.55 * moonT})`);
      moonHalo.addColorStop(0.45, `rgba(214, 34, 72, ${0.26 * moonT})`);
      moonHalo.addColorStop(0.78, `rgba(148, 18, 52, ${0.1 * moonT})`);
      moonHalo.addColorStop(1, 'rgba(120, 10, 38, 0)');
      ctx.fillStyle = moonHalo;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR * 2.9, 0, Math.PI * 2);
      ctx.fill();

      // Moon disc
      const moonGrad = ctx.createRadialGradient(
        moonX - moonR * 0.28,
        moonY - moonR * 0.24,
        moonR * 0.12,
        moonX,
        moonY,
        moonR,
      );
      moonGrad.addColorStop(0, `rgba(255, 236, 226, ${0.98 * moonT})`);
      moonGrad.addColorStop(0.58, `rgba(255, 132, 144, ${0.96 * moonT})`);
      moonGrad.addColorStop(1, `rgba(206, 34, 66, ${0.96 * moonT})`);
      ctx.fillStyle = moonGrad;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
      ctx.fill();

      // Delicate painted lunar mare silhouettes
      ctx.fillStyle = `rgba(142, 18, 46, ${0.22 * moonT})`;
      ctx.beginPath();
      ctx.arc(moonX - 18, moonY - 12, 13, 0, Math.PI * 2);
      ctx.arc(moonX + 18, moonY + 14, 9.5, 0, Math.PI * 2);
      ctx.arc(moonX + 7, moonY - 21, 7, 0, Math.PI * 2);
      ctx.arc(moonX - 8, moonY + 20, 6, 0, Math.PI * 2);
      ctx.fill();

      // Subtle rim glow ring
      ctx.strokeStyle = `rgba(255, 226, 220, ${0.32 * moonT})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR + 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Subtle diagonal volumetric sunlight / moonlight god-rays
    ctx.save();
    for (let i = 0; i < 5; i++) {
      const shimmer = 0.65 + 0.35 * Math.sin(state.elapsed * 0.9 + i * 1.45);
      const beamAlpha = palette.rayAlpha * shimmer;
      const spreadX = -320 + i * 98;
      const beamW = 36 + (i % 3) * 18;
      const grad = ctx.createLinearGradient(rayOriginX, rayOriginY, rayOriginX + spreadX, PLAYABLE_HEIGHT);
      grad.addColorStop(0, rgbStr(palette.rayColor, beamAlpha));
      grad.addColorStop(0.55, rgbStr(palette.rayColor, beamAlpha * 0.45));
      grad.addColorStop(1, rgbStr(palette.rayColor, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(rayOriginX - 14 + i * 6, rayOriginY - 10);
      ctx.lineTo(rayOriginX + 14 + i * 6, rayOriginY - 10);
      ctx.lineTo(rayOriginX + spreadX + beamW, PLAYABLE_HEIGHT);
      ctx.lineTo(rayOriginX + spreadX - beamW * 0.4, PLAYABLE_HEIGHT);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Soft wispy multi-layered Gensokyo clouds
    for (let i = 0; i < this.bgClouds.length; i++) {
      const c = this.bgClouds[i];
      const span = STAGE_WIDTH + c.width + 90;
      const cx =
        STAGE_WIDTH + 45 - (((scroll * c.speedScale + c.x) % span) + span) % span;
      this.drawPainterlyCloud(ctx, cx, c.y, c.width, c.height, c.layer, palette);
    }
  }

  private drawPainterlyCloud(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    layer: 0 | 1,
    palette: SkyPalette,
  ): void {
    const baseAlpha = layer === 0 ? 0.16 : 0.28;
    // Soft shaded lower cloud belly
    ctx.fillStyle = rgbStr(palette.cloudShadow, baseAlpha * 0.85);
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.35, w * 0.48, h * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();

    // Layered sunlit / moonlit wispy puffs
    ctx.fillStyle = rgbStr(palette.cloudTop, baseAlpha);
    ctx.beginPath();
    ctx.ellipse(x + w * 0.26, y + h * 0.14, w * 0.24, h * 0.42, 0, 0, Math.PI * 2);
    ctx.ellipse(x + w * 0.48, y - h * 0.12, w * 0.26, h * 0.56, 0, 0, Math.PI * 2);
    ctx.ellipse(x + w * 0.72, y + h * 0.1, w * 0.23, h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fine bright upper wisp highlight
    ctx.fillStyle = rgbStr(palette.cloudTop, baseAlpha * 0.65);
    ctx.beginPath();
    ctx.ellipse(x + w * 0.48, y - h * 0.22, w * 0.19, h * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawParallaxMountains(
    ctx: CanvasRenderingContext2D,
    state: RenderState,
    palette: SkyPalette,
    scroll: number,
  ): void {
    // Layer 1: Distant misty Youkai Mountain massif
    const farPeriod = 540;
    const farOff = (scroll * 0.1) % farPeriod;
    ctx.fillStyle = rgbStr(palette.mountainFar, 0.76);

    for (let rep = -1; rep <= 2; rep++) {
      const bx = rep * farPeriod - farOff;
      if (bx > STAGE_WIDTH + 20 || bx + farPeriod < -20) continue;

      ctx.beginPath();
      ctx.moveTo(bx, PLAYABLE_HEIGHT);
      ctx.lineTo(bx, PLAYABLE_HEIGHT - 122);
      ctx.lineTo(bx + 76, PLAYABLE_HEIGHT - 208);
      ctx.lineTo(bx + 150, PLAYABLE_HEIGHT - 154);
      ctx.lineTo(bx + 252, PLAYABLE_HEIGHT - 266); // Towering peak of Youkai Mountain
      ctx.lineTo(bx + 356, PLAYABLE_HEIGHT - 168);
      ctx.lineTo(bx + 448, PLAYABLE_HEIGHT - 216);
      ctx.lineTo(bx + farPeriod, PLAYABLE_HEIGHT - 122);
      ctx.lineTo(bx + farPeriod, PLAYABLE_HEIGHT);
      ctx.closePath();
      ctx.fill();

      // Luminous sunlit / moonlit ridge crest highlight on peak
      ctx.strokeStyle = rgbStr(palette.cloudTop, 0.24);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(bx + 195, PLAYABLE_HEIGHT - 206);
      ctx.lineTo(bx + 252, PLAYABLE_HEIGHT - 266);
      ctx.lineTo(bx + 295, PLAYABLE_HEIGHT - 224);
      ctx.stroke();

      // Shimmering Genbu Ravine waterfall gleam
      ctx.strokeStyle = `rgba(218, 244, 255, ${state.skyProgress > 1.3 ? 0.16 : 0.26})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(bx + 250, PLAYABLE_HEIGHT - 238);
      ctx.quadraticCurveTo(bx + 258, PLAYABLE_HEIGHT - 196, bx + 252, PLAYABLE_HEIGHT - 154);
      ctx.stroke();
    }

    // Layer 2: Closer hazy mountain ridge
    const midPeriod = 460;
    const midOff = (scroll * 0.18) % midPeriod;
    ctx.fillStyle = rgbStr(palette.mountainMid, 0.88);
    for (let rep = -1; rep <= 2; rep++) {
      const bx = rep * midPeriod - midOff;
      if (bx > STAGE_WIDTH + 20 || bx + midPeriod < -20) continue;

      ctx.beginPath();
      ctx.moveTo(bx, PLAYABLE_HEIGHT);
      ctx.lineTo(bx, PLAYABLE_HEIGHT - 96);
      ctx.lineTo(bx + 96, PLAYABLE_HEIGHT - 164);
      ctx.lineTo(bx + 188, PLAYABLE_HEIGHT - 120);
      ctx.lineTo(bx + 302, PLAYABLE_HEIGHT - 182);
      ctx.lineTo(bx + 392, PLAYABLE_HEIGHT - 134);
      ctx.lineTo(bx + midPeriod, PLAYABLE_HEIGHT - 96);
      ctx.lineTo(bx + midPeriod, PLAYABLE_HEIGHT);
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawShrineHillsAndBambooGrove(
    ctx: CanvasRenderingContext2D,
    cache: CachedGradients,
    state: RenderState,
    palette: SkyPalette,
    scroll: number,
  ): void {
    // Mid-ground Hakurei Shrine hill silhouette with Torii & glowing warm lanterns
    const hillPeriod = 440;
    const hillOff = (scroll * 0.28) % hillPeriod;
    const lanternPulse = 0.82 + 0.18 * Math.sin(state.elapsed * 3.4);

    for (let rep = -1; rep <= 2; rep++) {
      const bx = rep * hillPeriod - hillOff;
      if (bx > STAGE_WIDTH + 40 || bx + hillPeriod < -40) continue;

      ctx.fillStyle = rgbStr(palette.hillNear, 0.94);
      ctx.beginPath();
      ctx.moveTo(bx, PLAYABLE_HEIGHT);
      ctx.lineTo(bx, PLAYABLE_HEIGHT - 84);
      ctx.quadraticCurveTo(bx + 108, PLAYABLE_HEIGHT - 156, bx + 220, PLAYABLE_HEIGHT - 102);
      ctx.quadraticCurveTo(bx + 332, PLAYABLE_HEIGHT - 148, bx + hillPeriod, PLAYABLE_HEIGHT - 84);
      ctx.lineTo(bx + hillPeriod, PLAYABLE_HEIGHT);
      ctx.closePath();
      ctx.fill();

      // Pine / cedar tree tufts near shrine
      this.drawCedarTuft(ctx, bx + 54, PLAYABLE_HEIGHT - 112, 16, palette);
      this.drawCedarTuft(ctx, bx + 150, PLAYABLE_HEIGHT - 118, 19, palette);
      this.drawCedarTuft(ctx, bx + 284, PLAYABLE_HEIGHT - 118, 17, palette);
      this.drawCedarTuft(ctx, bx + 382, PLAYABLE_HEIGHT - 112, 15, palette);

      // Hilltop Hakurei Torii Gate silhouette + paired glowing shrine stone lanterns
      const tx = bx + 104;
      const ty = PLAYABLE_HEIGHT - 128;
      ctx.fillStyle = rgbStr(palette.hillNear, 0.98);
      ctx.fillRect(tx - 12, ty - 26, 3.6, 30);
      ctx.fillRect(tx + 8.4, ty - 26, 3.6, 30);
      // Curved top kasagi beam
      ctx.beginPath();
      ctx.moveTo(tx - 19, ty - 29);
      ctx.quadraticCurveTo(tx, ty - 24, tx + 19, ty - 29);
      ctx.lineTo(tx + 17, ty - 24.5);
      ctx.quadraticCurveTo(tx, ty - 20.5, tx - 17, ty - 24.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(tx - 14, ty - 20, 28, 2.8);

      // Paired glowing lanterns flanking the Torii gate
      this.drawDistantShrineLantern(ctx, cache, tx - 22, ty - 8, palette.lanternGlow * lanternPulse);
      this.drawDistantShrineLantern(ctx, cache, tx + 22, ty - 8, palette.lanternGlow * lanternPulse);

      // Hakurei Shrine Main Hall silhouette with upturned eaves & warm glowing shoji windows
      const sx = bx + 334;
      const sy = PLAYABLE_HEIGHT - 120;
      ctx.fillStyle = rgbStr(palette.hillNear, 0.98);
      // Upturned irimoya roof
      ctx.beginPath();
      ctx.moveTo(sx - 34, sy - 6);
      ctx.quadraticCurveTo(sx - 16, sy - 14, sx, sy - 27);
      ctx.quadraticCurveTo(sx + 16, sy - 14, sx + 34, sy - 6);
      ctx.lineTo(sx + 25, sy - 2);
      ctx.lineTo(sx + 25, sy + 14);
      ctx.lineTo(sx - 25, sy + 14);
      ctx.lineTo(sx - 25, sy - 2);
      ctx.closePath();
      ctx.fill();

      // Golden shrine ridge accent
      ctx.strokeStyle = `rgba(250, 204, 21, ${0.42 * palette.lanternGlow})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(sx - 11, sy - 21);
      ctx.lineTo(sx + 11, sy - 21);
      ctx.stroke();

      // Warm glowing shoji doors & hanging eaves lantern
      const winAlpha = 0.55 + 0.4 * palette.lanternGlow;
      ctx.fillStyle = `rgba(255, 212, 128, ${winAlpha * lanternPulse})`;
      ctx.fillRect(sx - 13, sy + 1, 7, 9);
      ctx.fillRect(sx - 3.5, sy + 1, 7, 9);
      ctx.fillRect(sx + 6, sy + 1, 7, 9);

      // Soft warm glow cast from shrine hall
      ctx.save();
      ctx.translate(sx, sy + 5);
      ctx.globalAlpha = 0.45 * palette.lanternGlow * lanternPulse;
      ctx.fillStyle = cache.lanternGlow;
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Two-depth Swaying Lost Bamboo Forest (迷途竹林)
    const grovePeriod = this.bgBamboos.length * 32;
    for (let layer = 0; layer <= 1; layer++) {
      const speedScale = layer === 0 ? 0.38 : 0.54;
      const groveOff = (scroll * speedScale) % grovePeriod;
      const baseColor = layer === 0 ? palette.bambooFar : palette.bambooNear;
      const baseAlpha = layer === 0 ? 0.42 : 0.62;

      for (let i = 0; i < this.bgBamboos.length; i++) {
        const b = this.bgBamboos[i];
        if (b.layer !== layer) continue;

        for (let rep = -1; rep <= 1; rep++) {
          const x = b.offsetX + rep * grovePeriod - groveOff;
          if (x < -36 || x > STAGE_WIDTH + 36) continue;

          const sway = Math.sin(state.elapsed * (1.2 + layer * 0.35) + b.leafSeed) * (0.012 + layer * 0.008);
          ctx.save();
          ctx.translate(x, PLAYABLE_HEIGHT);
          ctx.rotate(b.lean + sway);

          ctx.fillStyle = rgbStr(baseColor, baseAlpha);
          ctx.fillRect(-b.width * 0.5, -b.height, b.width, b.height);

          // Highlight left edge of stalk
          ctx.fillStyle = `rgba(148, 232, 182, ${baseAlpha * 0.24})`;
          ctx.fillRect(-b.width * 0.28, -b.height, b.width * 0.22, b.height);

          // Bamboo segment nodes
          ctx.fillStyle = `rgba(164, 236, 192, ${baseAlpha * 0.38})`;
          for (let jy = -34; jy > -b.height + 18; jy -= 38) {
            ctx.fillRect(-b.width * 0.66, jy, b.width * 1.32, 2.2);
          }

          // Swaying pointed bamboo leaf clusters
          const leafSway = Math.sin(state.elapsed * 2.4 + b.leafSeed) * 0.1;
          ctx.fillStyle = rgbStr(baseColor, Math.min(0.88, baseAlpha * 1.15));
          this.drawBgBambooLeafCluster(ctx, -b.width * 0.5, -b.height * 0.74, -1, leafSway);
          this.drawBgBambooLeafCluster(ctx, b.width * 0.5, -b.height * 0.54, 1, -leafSway);
          if (layer === 1) {
            this.drawBgBambooLeafCluster(ctx, -b.width * 0.4, -b.height * 0.36, -1, leafSway * 0.8);
          }

          ctx.restore();
        }
      }
    }
  }

  private drawCedarTuft(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    h: number,
    palette: SkyPalette,
  ): void {
    ctx.fillStyle = rgbStr(palette.hillNear, 0.96);
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.lineTo(x + h * 0.42, y + 6);
    ctx.lineTo(x - h * 0.42, y + 6);
    ctx.closePath();
    ctx.fill();
  }

  private drawDistantShrineLantern(
    ctx: CanvasRenderingContext2D,
    cache: CachedGradients,
    x: number,
    y: number,
    glowStrength: number,
  ): void {
    // Mini stone lantern stand
    ctx.fillStyle = '#1f192c';
    ctx.fillRect(x - 1.5, y, 3, 12);
    ctx.fillRect(x - 4, y - 4, 8, 2);

    // Warm glowing radial light halo
    ctx.save();
    ctx.translate(x, y - 1);
    ctx.globalAlpha = 0.52 * glowStrength;
    ctx.fillStyle = cache.lanternGlow;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Bright lantern core
    ctx.fillStyle = `rgba(255, 224, 140, ${0.7 + 0.3 * glowStrength})`;
    ctx.fillRect(x - 2.2, y - 2.4, 4.4, 3.6);
  }

  private drawBgBambooLeafCluster(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    dir: -1 | 1,
    sway: number,
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(sway);
    for (let k = 0; k < 3; k++) {
      const a = dir * (0.28 + k * 0.34);
      const len = 13 - k * 2;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(dir * len * 0.5, -3.2, dir * len, 0);
      ctx.quadraticCurveTo(dir * len * 0.5, 3.2, 0, 0);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  private drawAmbientMistAndMotes(
    ctx: CanvasRenderingContext2D,
    state: RenderState,
    palette: SkyPalette,
    scroll: number,
  ): void {
    // Layered atmospheric mist along the bamboo floor
    const mistGrad = ctx.createLinearGradient(0, PLAYABLE_HEIGHT - 155, 0, PLAYABLE_HEIGHT);
    mistGrad.addColorStop(0, rgbStr(palette.mistColor, 0));
    mistGrad.addColorStop(0.65, rgbStr(palette.mistColor, palette.mistAlpha * 0.45));
    mistGrad.addColorStop(1, rgbStr(palette.mistColor, palette.mistAlpha));
    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, PLAYABLE_HEIGHT - 155, STAGE_WIDTH, 155);

    // Ambient drifting sakura petals (Dawn/Sunset) & glowing fireflies (Twilight/Scarlet Night)
    const fireflyMix = clamp((state.skyProgress - 0.65) / 0.9, 0, 1);
    const petalAlpha = Math.max(0.12, 1 - fireflyMix * 0.85);

    for (let i = 0; i < this.ambientMotes.length; i++) {
      const m = this.ambientMotes[i];
      const mx =
        STAGE_WIDTH + 20 - (((scroll * 0.32 + state.elapsed * m.speedX + m.x) % (STAGE_WIDTH + 40)) + (STAGE_WIDTH + 40)) % (STAGE_WIDTH + 40);
      const my =
        ((m.y + state.elapsed * m.speedY * (1 - fireflyMix * 0.8) + Math.sin(state.elapsed * 2 + m.phase) * 18) %
          (PLAYABLE_HEIGHT - 40)) +
        20;

      if (i % 2 === 0 && fireflyMix > 0.15) {
        // Warm glowing firefly bobbing through the bamboo mist
        const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(state.elapsed * 3.8 + m.phase));
        const a = fireflyMix * pulse;
        ctx.fillStyle =
          state.skyProgress > 1.45
            ? `rgba(255, 196, 152, ${a * 0.38})`
            : `rgba(218, 255, 148, ${a * 0.38})`;
        ctx.beginPath();
        ctx.arc(mx, my, m.size * 2.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 252, 220, ${a * 0.92})`;
        ctx.beginPath();
        ctx.arc(mx, my, m.size * 0.55, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Soft drifting sakura petal
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(state.elapsed * 1.4 + m.phase);
        ctx.fillStyle = `rgba(255, 212, 224, ${0.58 * petalAlpha})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, m.size * 1.15, m.size * 0.62, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  private drawPipePair(
    ctx: CanvasRenderingContext2D,
    cache: CachedGradients,
    pipe: PipeObstacle,
    pipeX: number,
    elapsed: number,
  ): void {
    const topHeight = Math.max(0, pipe.gapY - pipe.gapHeight * 0.5);
    const bottomY = pipe.gapY + pipe.gapHeight * 0.5;
    const bottomHeight = Math.max(0, PLAYABLE_HEIGHT - bottomY);

    ctx.save();
    ctx.translate(pipeX, 0);

    if (pipe.style === 'bamboo') {
      if (!pipe.topShattered) {
        this.drawBambooPillar(ctx, cache, 0, pipe.width, topHeight, true, elapsed + pipe.lanternPhase);
      }
      if (!pipe.bottomShattered) {
        this.drawBambooPillar(
          ctx,
          cache,
          bottomY,
          pipe.width,
          bottomHeight,
          false,
          elapsed + pipe.lanternPhase + 1.2,
        );
      }
    } else {
      if (!pipe.topShattered) {
        this.drawToriiPillar(ctx, cache, 0, pipe.width, topHeight, true, elapsed + pipe.lanternPhase);
      }
      if (!pipe.bottomShattered) {
        this.drawToriiPillar(
          ctx,
          cache,
          bottomY,
          pipe.width,
          bottomHeight,
          false,
          elapsed + pipe.lanternPhase + 1.5,
        );
      }
    }

    ctx.restore();
  }

  private drawBambooPillar(
    ctx: CanvasRenderingContext2D,
    cache: CachedGradients,
    y: number,
    w: number,
    h: number,
    isTop: boolean,
    swayPhase: number,
  ): void {
    if (h <= 0) return;
    const capH = Math.min(PHYSICS.PIPE_CAP_HEIGHT, h);
    const capOver = PHYSICS.PIPE_CAP_OVERHANG;

    // Cylindrical specular-shaded bamboo shaft (cached gradient in local coords)
    ctx.fillStyle = cache.bambooShaft;
    ctx.fillRect(0, y, w, h);

    // Subtle vertical specular band & fine bamboo fiber lines
    ctx.fillStyle = 'rgba(224, 255, 232, 0.24)';
    ctx.fillRect(w * 0.31, y, w * 0.1, h);
    ctx.fillStyle = 'rgba(8, 36, 22, 0.18)';
    ctx.fillRect(w * 0.78, y, 2, h);

    ctx.strokeStyle = '#092417';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, y, w, h);

    // Raised beveled bamboo nodes every 44px
    const nodeStart = isTop ? y + h - capH - 36 : y + capH + 34;
    const nodeDir = isTop ? -1 : 1;
    for (let step = 0; step < 12; step++) {
      const ny = nodeStart + step * 44 * nodeDir;
      if (isTop && ny < y + 4) break;
      if (!isTop && ny > y + h - 4) break;

      // Shadow beneath node
      ctx.fillStyle = 'rgba(6, 28, 17, 0.36)';
      ctx.fillRect(1, ny + 3, w - 2, 3);

      ctx.fillStyle = '#4ad182';
      this.drawRoundedRect(ctx, -3, ny - 3.2, w + 6, 6.4, 3);
      ctx.fill();
      ctx.strokeStyle = '#0a2b1c';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.fillStyle = 'rgba(235, 255, 240, 0.55)';
      ctx.fillRect(4, ny - 2.2, w - 8, 1.6);

      // Occasional bamboo leaf sprig on first node
      if (step === 0) {
        this.drawForegroundBambooLeafCluster(ctx, w + 1, ny, 1, swayPhase);
      }
    }

    // Ornate Bamboo Cap
    const capY = isTop ? y + h - capH : y;
    ctx.fillStyle = cache.bambooCap;
    this.drawRoundedRect(ctx, -capOver, capY, w + capOver * 2, capH, 5.5);
    ctx.fill();

    // Cap specular gleam
    ctx.fillStyle = 'rgba(230, 255, 238, 0.3)';
    ctx.fillRect(w * 0.29, capY + 2, w * 0.12, capH - 4);

    ctx.strokeStyle = '#072114';
    ctx.lineWidth = 2;
    this.drawRoundedRect(ctx, -capOver, capY, w + capOver * 2, capH, 5.5);
    ctx.stroke();

    // Crimson & gold shrine shimenawa band around cap
    const cordY = isTop ? capY + 6 : capY + capH - 9.5;
    ctx.fillStyle = '#c81e2e';
    ctx.fillRect(-capOver + 2, cordY, w + capOver * 2 - 4, 4);
    ctx.fillStyle = '#facc15';
    for (let cx = -capOver + 6; cx < w + capOver - 6; cx += 11) {
      ctx.fillRect(cx, cordY + 0.7, 4.5, 2.6);
    }

    // Gently swaying white zigzag shide paper charms hanging from top cap
    if (isTop && h > 36) {
      const sway = Math.sin(swayPhase * 2.5) * 0.16;
      this.drawShideCharm(ctx, w * 0.24, capY + capH, sway, 1);
      this.drawShideCharm(ctx, w * 0.76, capY + capH, sway * 0.9 + 0.04, 0.9);
    }

    // Swaying bamboo leaf clusters near rim
    const leafY = isTop ? capY - 1 : capY + capH + 1;
    this.drawForegroundBambooLeafCluster(ctx, -capOver + 1, leafY, -1, swayPhase);
    this.drawForegroundBambooLeafCluster(ctx, w + capOver - 1, leafY + (isTop ? -3 : 3), 1, swayPhase + 0.8);
  }

  private drawForegroundBambooLeafCluster(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    dir: -1 | 1,
    swayPhase: number,
  ): void {
    const sway = Math.sin(swayPhase * 2.1) * 0.1;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(sway);
    const leaves = [
      { angle: -0.52, len: 13, w: 3.3, color: '#4ade80' },
      { angle: 0.04, len: 16, w: 3.6, color: '#22c55e' },
      { angle: 0.55, len: 11, w: 2.9, color: '#86efac' },
    ];
    ctx.strokeStyle = '#0c3520';
    ctx.lineWidth = 1.1;
    for (let i = 0; i < leaves.length; i++) {
      const lf = leaves[i];
      ctx.save();
      ctx.rotate(dir * lf.angle);
      ctx.fillStyle = lf.color;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(dir * lf.len * 0.5, -lf.w, dir * lf.len, 0);
      ctx.quadraticCurveTo(dir * lf.len * 0.5, lf.w, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  private drawShideCharm(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    sway: number,
    scale: number,
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(sway);
    ctx.scale(scale, scale);

    ctx.fillStyle = '#fffef8';
    ctx.strokeStyle = '#b91c2c';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-2.2, 0);
    ctx.lineTo(2.4, 0);
    ctx.lineTo(1.2, 4.5);
    ctx.lineTo(4.2, 5.2);
    ctx.lineTo(2.2, 10.5);
    ctx.lineTo(4.4, 11.4);
    ctx.lineTo(0.8, 16.5);
    ctx.lineTo(-2.8, 14.8);
    ctx.lineTo(-0.4, 10.2);
    ctx.lineTo(-3.4, 9.2);
    ctx.lineTo(-1, 4.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  private drawToriiPillar(
    ctx: CanvasRenderingContext2D,
    cache: CachedGradients,
    y: number,
    w: number,
    h: number,
    isTop: boolean,
    swayPhase: number,
  ): void {
    if (h <= 0) return;
    const capH = Math.min(PHYSICS.PIPE_CAP_HEIGHT, h);
    const capOver = PHYSICS.PIPE_CAP_OVERHANG + 4;

    // Vermilion lacquered cylindrical shaft
    ctx.fillStyle = cache.toriiShaft;
    ctx.fillRect(0, y, w, h);

    // Crisp lacquer specular gleam
    ctx.fillStyle = 'rgba(255, 228, 228, 0.24)';
    ctx.fillRect(w * 0.29, y, w * 0.1, h);

    // Decorative black-and-gold shrine collar band
    const bandY = isTop ? y + h - capH - 19 : y + capH + 12;
    if ((isTop && bandY > y + 8) || (!isTop && bandY + 7 < y + h - 8)) {
      ctx.fillStyle = '#1f172b';
      ctx.fillRect(-1, bandY, w + 2, 7);
      ctx.fillStyle = '#f5c542';
      ctx.fillRect(2, bandY + 2, w - 4, 2.8);
    }

    ctx.strokeStyle = '#3f070e';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, y, w, h);

    // Torii Shimaki Cap
    const capY = isTop ? y + h - capH : y;
    ctx.fillStyle = cache.toriiCap;
    this.drawRoundedRect(ctx, -capOver, capY, w + capOver * 2, capH, 4);
    ctx.fill();
    ctx.strokeStyle = '#3f070e';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Curved upturned black Kasagi ridge
    ctx.fillStyle = '#191424';
    ctx.beginPath();
    if (isTop) {
      const edgeY = capY + capH;
      ctx.moveTo(-capOver - 5, edgeY - 6);
      ctx.quadraticCurveTo(w * 0.5, edgeY + 4.5, w + capOver + 5, edgeY - 6);
      ctx.lineTo(w + capOver + 3, edgeY + 1.5);
      ctx.quadraticCurveTo(w * 0.5, edgeY + 10, -capOver - 3, edgeY + 1.5);
    } else {
      const edgeY = capY;
      ctx.moveTo(-capOver - 5, edgeY + 6);
      ctx.quadraticCurveTo(w * 0.5, edgeY - 4.5, w + capOver + 5, edgeY + 6);
      ctx.lineTo(w + capOver + 3, edgeY - 1.5);
      ctx.quadraticCurveTo(w * 0.5, edgeY - 10, -capOver - 3, edgeY - 1.5);
    }
    ctx.closePath();
    ctx.fill();

    // Central Gold Shrine Plaque (扁额)
    const plaqueW = 17;
    const plaqueH = 13;
    const plaqueX = (w - plaqueW) * 0.5;
    const plaqueY = capY + (capH - plaqueH) * 0.5;
    ctx.fillStyle = '#1c1424';
    ctx.fillRect(plaqueX, plaqueY, plaqueW, plaqueH);
    ctx.strokeStyle = '#f5c542';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(plaqueX, plaqueY, plaqueW, plaqueH);
    // Gold calligraphic emblem mark
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(plaqueX + 4.5, plaqueY + 3, 8, 1.8);
    ctx.fillRect(plaqueX + 7.5, plaqueY + 3, 2, 7.2);
    ctx.fillRect(plaqueX + 5.2, plaqueY + 7.5, 6.6, 1.5);

    // Swaying shide paper charm + glowing mini red paper lanterns casting warm radial glow
    const sway = Math.sin(swayPhase * 2.2) * 0.15;
    if (isTop && h > 34) {
      this.drawShideCharm(ctx, w * 0.78, capY + capH + 3, sway * 0.9, 0.9);
      this.drawMiniRedLantern(ctx, cache, -capOver + 7, capY + capH + 2, sway, swayPhase);
    } else if (!isTop && h > 40) {
      // Mounted glowing shrine lantern on bottom torii pillar cap corner
      this.drawMountedCapLantern(ctx, cache, w + capOver - 6, capY - 8, swayPhase);
    }
  }

  private drawMiniRedLantern(
    ctx: CanvasRenderingContext2D,
    cache: CachedGradients,
    x: number,
    y: number,
    sway: number,
    phase: number,
  ): void {
    const pulse = 0.86 + 0.14 * Math.sin(phase * 4.2);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(sway);

    // Warm radial light cast onto pillar & air
    ctx.save();
    ctx.translate(0, 12.5);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = cache.lanternGlow;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Gold hanging cord
    ctx.strokeStyle = '#f5c542';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 6);
    ctx.stroke();

    // Luminous red paper lantern body
    const bodyGrad = ctx.createRadialGradient(-1, 11, 1, 0, 12.5, 8);
    bodyGrad.addColorStop(0, '#fff2b2');
    bodyGrad.addColorStop(0.42, '#ff8e53');
    bodyGrad.addColorStop(1, '#d92638');
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 12.5, 6, 7.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Black lacquer caps & delicate ribs
    ctx.fillStyle = '#1e1628';
    ctx.fillRect(-3.8, 5, 7.6, 2.2);
    ctx.fillRect(-3.8, 18.8, 7.6, 2.2);
    ctx.strokeStyle = 'rgba(127, 29, 29, 0.55)';
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(-5.5, 10.5);
    ctx.lineTo(5.5, 10.5);
    ctx.moveTo(-5.5, 14.5);
    ctx.lineTo(5.5, 14.5);
    ctx.stroke();

    // Tiny gold tassel
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 21);
    ctx.lineTo(0, 24.5);
    ctx.stroke();

    ctx.restore();
  }

  private drawMountedCapLantern(
    ctx: CanvasRenderingContext2D,
    cache: CachedGradients,
    x: number,
    y: number,
    phase: number,
  ): void {
    const pulse = 0.84 + 0.16 * Math.sin(phase * 3.8 + 1);
    ctx.save();
    ctx.translate(x, y);

    // Warm radial glow
    ctx.save();
    ctx.globalAlpha = 0.82 * pulse;
    ctx.fillStyle = cache.lanternGlow;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Lantern stand
    ctx.fillStyle = '#1e1628';
    ctx.fillRect(-2.5, 5, 5, 4);

    // Mini glowing red lantern globe
    ctx.fillStyle = '#ff985a';
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.6, 5.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fff5cc';
    ctx.beginPath();
    ctx.arc(-0.8, -0.8, 2.1, 0, Math.PI * 2);
    ctx.fill();

    // Mini roof cap
    ctx.fillStyle = '#1e1628';
    ctx.beginPath();
    ctx.moveTo(-6, -4.5);
    ctx.lineTo(0, -7.8);
    ctx.lineTo(6, -4.5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawCollectible(
    ctx: CanvasRenderingContext2D,
    cache: CachedGradients,
    star: StarCollectible,
    sx: number,
    sy: number,
    elapsed: number,
  ): void {
    ctx.save();
    ctx.translate(sx, sy);

    const pulse = 1 + Math.sin(elapsed * 5.2 + star.bobPhase) * 0.08;
    const isPower = star.kind === 'power';

    // Cached glowing radial aura
    ctx.fillStyle = isPower ? cache.powerAura : cache.faithAura;
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fill();

    // Rotating golden corona rays
    ctx.save();
    ctx.rotate(elapsed * 1.4 + star.bobPhase);
    ctx.strokeStyle = isPower ? 'rgba(254, 240, 138, 0.55)' : 'rgba(186, 230, 253, 0.62)';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const r1 = star.radius + 3;
      const r2 = star.radius + (i % 2 === 0 ? 10 : 6.5);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
      ctx.stroke();
    }
    ctx.restore();

    // Orbiting mini sparkle dots
    for (let i = 0; i < 3; i++) {
      const a = elapsed * 3.6 + (i * Math.PI * 2) / 3;
      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * (star.radius + 6), Math.sin(a) * (star.radius + 6), 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.scale(pulse, pulse);

    if (isPower) {
      // Authentic Touhou [P] Power Emblem Badge
      ctx.save();
      ctx.rotate(Math.sin(elapsed * 2.6 + star.bobPhase) * 0.12);
      const sz = star.radius * 1.55;
      const half = sz * 0.5;

      // Outer golden frame
      ctx.fillStyle = '#fde047';
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 2;
      this.drawRoundedRect(ctx, -half - 2, -half - 2, sz + 4, sz + 4, 5.5);
      ctx.fill();
      ctx.stroke();

      // Vermilion Power tile interior
      ctx.fillStyle = '#dc2626';
      this.drawRoundedRect(ctx, -half, -half, sz, sz, 4);
      ctx.fill();

      // Glossy top sheen
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      this.drawRoundedRect(ctx, -half + 1.5, -half + 1.5, sz - 3, sz * 0.42, 2.5);
      ctx.fill();

      // Crisp bold white "P"
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 14px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('P', 0.4, 1);
      ctx.restore();
    } else {
      // Authentic Touhou [★] Faith Star Emblem
      ctx.save();
      ctx.rotate(Math.sin(elapsed * 2.2 + star.bobPhase) * 0.18);

      // Outer golden-cyan faceted star
      this.drawStarPath(ctx, 5, star.radius + 2.5, star.radius * 0.5);
      const grad = ctx.createRadialGradient(-2, -2, 1, 0, 0, star.radius + 3);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.48, '#fde047');
      grad.addColorStop(1, '#38bdf8');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = '#1d4ed8';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Inner glowing star highlight
      this.drawStarPath(ctx, 5, star.radius * 0.52, star.radius * 0.26);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  private drawGround(
    ctx: CanvasRenderingContext2D,
    cache: CachedGradients,
    state: RenderState,
    scroll: number,
  ): void {
    const y = PLAYABLE_HEIGHT;

    // Shrine stone-and-earth base
    ctx.fillStyle = cache.groundBase;
    ctx.fillRect(0, y, STAGE_WIDTH, GROUND_HEIGHT);

    // Rich moss upper rim strip
    ctx.fillStyle = '#2f8f5b';
    ctx.fillRect(0, y, STAGE_WIDTH, 12);
    ctx.fillStyle = '#68d391';
    ctx.fillRect(0, y, STAGE_WIDTH, 3.2);

    // Animated swaying grass blades sprouting along the mossy shrine rim!
    const bladePeriod = 18;
    const bladeOff = scroll % bladePeriod;
    ctx.lineCap = 'round';
    for (let gx = -bladePeriod; gx < STAGE_WIDTH + bladePeriod; gx += bladePeriod) {
      const px = gx - bladeOff;
      const worldIndex = Math.round((gx + scroll - bladeOff) / bladePeriod);
      const sway = Math.sin(state.elapsed * 3.8 + worldIndex * 0.9) * 2.6;
      const h1 = 6.5 + ((worldIndex * 7) & 3);
      const h2 = 5 + ((worldIndex * 5) & 3);

      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.moveTo(px + 4, y + 2);
      ctx.quadraticCurveTo(px + 2 + sway * 0.5, y - h1 * 0.5, px + 1 + sway, y - h1);
      ctx.stroke();

      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(px + 10, y + 2);
      ctx.quadraticCurveTo(px + 11 + sway * 0.5, y - h2 * 0.5, px + 12.5 + sway, y - h2);
      ctx.stroke();
    }

    // Diagonal mossy stone trim chevrons
    const tileW = 28;
    const tileOff = scroll % tileW;
    ctx.fillStyle = '#1f6440';
    for (let gx = -tileW; gx < STAGE_WIDTH + tileW; gx += tileW) {
      const px = gx - tileOff;
      ctx.beginPath();
      ctx.moveTo(px, y + 12);
      ctx.lineTo(px + 12, y + 12);
      ctx.lineTo(px + 18, y + 3.2);
      ctx.lineTo(px + 6, y + 3.2);
      ctx.closePath();
      ctx.fill();
    }

    // Crimson & gold Hakurei shrine trim border
    ctx.fillStyle = '#b91c2c';
    ctx.fillRect(0, y + 12, STAGE_WIDTH, 6);
    ctx.fillStyle = '#f5c542';
    ctx.fillRect(0, y + 18, STAGE_WIDTH, 2);

    // Detailed weathered shrine stepping stones + fallen petals
    const stonePeriod = 56;
    const stoneOff = scroll % stonePeriod;
    for (let sx = -stonePeriod; sx < STAGE_WIDTH + stonePeriod; sx += stonePeriod) {
      const px = sx - stoneOff;

      // Upper stepping stone
      ctx.fillStyle = 'rgba(226, 232, 240, 0.08)';
      this.drawRoundedRect(ctx, px + 4, y + 26, 40, 20, 6);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.09)';
      ctx.fillRect(px + 8, y + 27, 32, 2);
      ctx.strokeStyle = 'rgba(6, 12, 18, 0.35)';
      ctx.lineWidth = 1.2;
      this.drawRoundedRect(ctx, px + 4, y + 26, 40, 20, 6);
      ctx.stroke();

      // Moss tuck on stone corner
      ctx.fillStyle = 'rgba(74, 222, 128, 0.25)';
      ctx.beginPath();
      ctx.ellipse(px + 10, y + 27, 6, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Lower staggered stepping stone
      ctx.fillStyle = 'rgba(226, 232, 240, 0.06)';
      this.drawRoundedRect(ctx, px + 26, y + 53, 38, 19, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(6, 12, 18, 0.35)';
      ctx.stroke();

      // Fallen sakura petal / autumn leaf resting on shrine stones
      ctx.fillStyle = state.skyProgress > 1.2 ? 'rgba(251, 113, 133, 0.55)' : 'rgba(253, 186, 204, 0.62)';
      ctx.beginPath();
      ctx.ellipse(px + 28, y + 36, 3.6, 1.8, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(251, 146, 60, 0.48)';
      ctx.beginPath();
      ctx.ellipse(px + 48, y + 62, 3.2, 1.6, -0.35, 0, Math.PI * 2);
      ctx.fill();

      // Embossed gold diamond in crimson trim
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.moveTo(px + 28, y + 13);
      ctx.lineTo(px + 31.5, y + 15);
      ctx.lineTo(px + 28, y + 17);
      ctx.lineTo(px + 24.5, y + 15);
      ctx.closePath();
      ctx.fill();
    }

    // Ground horizon crisp edge shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
    ctx.fillRect(0, y - 1, STAGE_WIDTH, 1.5);
  }

  private drawMagnetTether(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    px: number,
    py: number,
    strength: number,
  ): void {
    ctx.save();
    ctx.strokeStyle = `rgba(253, 164, 175, ${0.18 + strength * 0.42})`;
    ctx.lineWidth = 1.4 + strength * 1.2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.restore();
  }

  private drawDanmakuOrb(
    ctx: CanvasRenderingContext2D,
    cache: CachedGradients,
    orb: DanmakuOrb,
    ox: number,
    oy: number,
    elapsed: number,
    isFrozen: boolean,
  ): void {
    const r = orb.radius;
    const isScarlet = orb.color === 'scarlet';
    const pulse = 1 + Math.sin(elapsed * 7.5 + orb.phase) * 0.06;

    ctx.save();
    ctx.translate(ox, oy);

    // Outer luminous danmaku aura (cached radial gradient)
    ctx.save();
    ctx.scale(pulse, pulse);
    ctx.fillStyle = isScarlet ? cache.danmakuScarletAura : cache.danmakuGoldAura;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Subtle frosted crystal halo around bullets while Cirno's Perfect Freeze is active
    if (isFrozen) {
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.72)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, r + 4.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Subtle grazed rim cue or crisp dark contrast ring so orbs always pop against Scarlet sky
    ctx.strokeStyle = orb.grazed
      ? 'rgba(254, 240, 138, 0.75)'
      : isScarlet
        ? 'rgba(60, 6, 22, 0.65)'
        : 'rgba(78, 34, 6, 0.6)';
    ctx.lineWidth = 1.8;

    // Saturated classic Touhou magic bullet ring
    ctx.fillStyle = isScarlet ? '#f43f5e' : '#f59e0b';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Mid radiant energy halo
    ctx.fillStyle = isScarlet ? '#fda4af' : '#fef08a';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
    ctx.fill();

    // Pure bright glowing core (authentic Touhou bullet readability!)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.56, 0, Math.PI * 2);
    ctx.fill();

    // Tiny rotating sparkle glint along rim
    const a = elapsed * 4.2 + orb.phase;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(Math.cos(a) * (r * 0.72), Math.sin(a) * (r * 0.72), 1.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawSpeedLines(ctx: CanvasRenderingContext2D, state: RenderState, scroll: number): void {
    if (state.phase !== 'playing') return;
    const isDashing = state.ayaDashTimer > 0;
    const speedRatio = Math.max(
      0,
      (state.speed - PHYSICS.BASE_SPEED) / (PHYSICS.MAX_SPEED - PHYSICS.BASE_SPEED),
    );
    const alpha = isDashing ? 0.42 : 0.06 + speedRatio * 0.15;
    const lineCount = isDashing ? 12 : 6;

    ctx.save();
    ctx.strokeStyle = isDashing
      ? `rgba(254, 240, 138, ${alpha})`
      : `rgba(255, 248, 232, ${alpha})`;
    ctx.lineWidth = isDashing ? 2.1 : 1.4;
    ctx.lineCap = 'round';

    for (let i = 0; i < lineCount; i++) {
      const period = 380 + (i % 6) * 62;
      const x =
        STAGE_WIDTH + 60 - (((scroll * (1.58 + (i % 6) * 0.12) + i * 113) % period) + period) % period;
      const y = 26 + i * (PLAYABLE_HEIGHT / lineCount) + Math.sin(state.elapsed * 2 + i) * 10;
      const len = (isDashing ? 86 : 30) + speedRatio * 46 + (i % 3) * 14;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawAfterimages(ctx: CanvasRenderingContext2D, afterimages: PlayerAfterimage[]): void {
    for (let i = 0; i < afterimages.length; i++) {
      const img = afterimages[i];
      const a = clamp(img.alpha, 0, 1);
      ctx.save();
      ctx.translate(img.x, img.y);
      ctx.rotate(img.rotation);
      ctx.globalAlpha = a * 0.56;

      // Crimson-gold tengu wind silhouette afterimage
      const grad = ctx.createRadialGradient(0, 0, 2, -6, 0, 26);
      grad.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
      grad.addColorStop(0.5, 'rgba(239, 68, 68, 0.72)');
      grad.addColorStop(1, 'rgba(185, 28, 28, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(-4, 0, 26, 17, 0, 0, Math.PI * 2);
      ctx.fill();

      // Stylized winged silhouette echo
      ctx.fillStyle = 'rgba(255, 224, 150, 0.85)';
      ctx.beginPath();
      ctx.arc(3, -5, 10.5, 0, Math.PI * 2);
      ctx.ellipse(-2, 6, 10, 7.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Trailing crimson wind wing sweep
      ctx.fillStyle = 'rgba(220, 38, 38, 0.78)';
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.quadraticCurveTo(-24, -14, -34, -2);
      ctx.quadraticCurveTo(-22, 12, -4, 6);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }

  private drawReimuBarrierWave(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const progress = 1 - clamp(state.reimuBarrierTimer / PHYSICS.REIMU_BARRIER_VISUAL_DURATION, 0, 1);
    const radius = 24 + progress * 188;
    const alpha = Math.pow(1 - progress, 0.75);

    ctx.save();
    ctx.translate(state.reimuBarrierX, state.reimuBarrierY);

    // Translucent crimson-white spiritual dome
    const domeGrad = ctx.createRadialGradient(0, 0, radius * 0.55, 0, 0, radius);
    domeGrad.addColorStop(0, 'rgba(255, 245, 247, 0)');
    domeGrad.addColorStop(0.72, `rgba(251, 113, 133, ${0.18 * alpha})`);
    domeGrad.addColorStop(0.92, `rgba(255, 241, 242, ${0.55 * alpha})`);
    domeGrad.addColorStop(1, `rgba(225, 29, 72, ${0.85 * alpha})`);
    ctx.fillStyle = domeGrad;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Crisp double barrier ring
    ctx.strokeStyle = `rgba(255, 250, 240, ${0.9 * alpha})`;
    ctx.lineWidth = 3 * alpha + 1;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(225, 29, 72, ${0.8 * alpha})`;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([10, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(8, radius - 8), state.elapsed * 3, state.elapsed * 3 + Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 8 rotating shrine diamond runes along the barrier circumference
    ctx.fillStyle = `rgba(254, 240, 138, ${0.9 * alpha})`;
    for (let i = 0; i < 8; i++) {
      const a = state.elapsed * 2.4 + (i * Math.PI) / 4;
      const rx = Math.cos(a) * radius;
      const ry = Math.sin(a) * radius;
      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(5, 0);
      ctx.lineTo(0, 3);
      ctx.lineTo(-5, 0);
      ctx.lineTo(0, -3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  private drawPlayer(
    ctx: CanvasRenderingContext2D,
    cache: CachedGradients,
    state: RenderState,
    playerY: number,
    playerRot: number,
  ): void {
    const { character, player, phase, elapsed } = state;
    const isDashing = state.ayaDashTimer > 0;
    const isInvincible = player.invincibleTimer > 0;

    ctx.save();
    ctx.translate(player.x, playerY);

    // Subtle blink shimmer in final 0.25s of post-Deathbomb invincibility
    if (isInvincible && !isDashing && player.invincibleTimer < 0.25) {
      ctx.globalAlpha = Math.sin(elapsed * 42) > 0 ? 1 : 0.62;
    }

    // Subtle character glow + pulsing energy boost on flap
    ctx.save();
    const glowScale = 1 + player.flapGlow * 0.28 + (isDashing ? 0.35 : 0);
    ctx.scale(glowScale, glowScale);
    ctx.fillStyle =
      character === 'cirno'
        ? cache.playerGlowCirno
        : character === 'reimu'
          ? cache.playerGlowReimu
          : cache.playerGlowAya;
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Electric white/gold Graze flash ring around player
    if (player.grazeFlash > 0.02) {
      const gf = player.grazeFlash;
      ctx.save();
      ctx.strokeStyle = `rgba(255, 249, 196, ${gf * 0.92})`;
      ctx.lineWidth = 2.4 * gf + 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, player.radius + 10 + (1 - gf) * 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Reimu's back orbiting Yin-Yang orb with soft trail aura
    if (character === 'reimu') {
      this.drawYinYangOrb(
        ctx,
        Math.cos(player.orbAngle) * 27,
        Math.sin(player.orbAngle) * 18,
        5.8,
        player.orbAngle * 2.1,
      );
    }

    // Apply smooth critically-damped rotation + elastic squash-and-stretch
    ctx.rotate(playerRot);
    ctx.scale(player.scaleX, player.scaleY);

    const isDizzy = phase === 'dying' || phase === 'gameover';
    const isBlinking = !isDizzy && player.blinkDuration > 0;
    const isDetermined = !isDizzy && (player.determinedTimer > 0 || player.vy < -180 || isDashing);
    const flapAngle = isDizzy
      ? 0.45
      : Math.sin(player.wingPhase) * (0.62 + player.wingBoost * 0.36);

    // Velocity-reactive drag for flowing scarf / ribbon / hair!
    const dragY = clamp(player.vy * 0.022, -7.5, 9.5);
    const wave = Math.sin(player.scarfWave);
    const wave2 = Math.cos(player.scarfWave * 0.85);

    if (character === 'aya') {
      this.drawAya(ctx, flapAngle, player.wingBoost, dragY, wave, wave2, isDizzy, isBlinking, isDetermined);
    } else if (character === 'reimu') {
      this.drawReimu(ctx, flapAngle, dragY, wave, wave2, isDizzy, isBlinking, isDetermined);
    } else {
      this.drawCirno(ctx, flapAngle, player.wingBoost, dragY, wave, isDizzy, isBlinking, isDetermined, elapsed);
    }

    // Aya blazing wind-cone gale aura slicing ahead during 疾风「幻想风靡」
    if (isDashing) {
      const dashGrad = ctx.createLinearGradient(34, 0, -34, 0);
      dashGrad.addColorStop(0, 'rgba(255, 253, 224, 0.92)');
      dashGrad.addColorStop(0.42, 'rgba(250, 204, 21, 0.56)');
      dashGrad.addColorStop(0.75, 'rgba(239, 68, 68, 0.32)');
      dashGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
      ctx.fillStyle = dashGrad;
      ctx.beginPath();
      ctx.moveTo(38, 0);
      ctx.quadraticCurveTo(10, -28, -32, -22);
      ctx.lineTo(-22, 0);
      ctx.lineTo(-32, 22);
      ctx.quadraticCurveTo(10, 28, 38, 0);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(36, 0);
      ctx.quadraticCurveTo(12, -21, -24, -18);
      ctx.moveTo(36, 0);
      ctx.quadraticCurveTo(12, 21, -24, 18);
      ctx.stroke();
    }

    ctx.restore();

    // Front orbiting Yin-Yang orb for Reimu
    if (character === 'reimu') {
      ctx.save();
      ctx.translate(player.x, playerY);
      this.drawYinYangOrb(
        ctx,
        Math.cos(player.orbAngle + Math.PI) * 27,
        Math.sin(player.orbAngle + Math.PI) * 18,
        5.8,
        -player.orbAngle * 2.1,
      );
      ctx.restore();
    }

    // Protective rotating Yin-Yang barrier shield while invincible (post-Deathbomb or post-dash grace)
    if (isInvincible && !isDashing) {
      ctx.save();
      ctx.translate(player.x, playerY);
      const shieldAlpha = clamp(player.invincibleTimer / 0.3, 0.25, 0.9);
      ctx.strokeStyle =
        character === 'reimu'
          ? `rgba(254, 205, 211, ${shieldAlpha})`
          : `rgba(254, 240, 138, ${shieldAlpha})`;
      ctx.lineWidth = 2.2;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, 25, elapsed * 5, elapsed * 5 + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle =
        character === 'reimu'
          ? `rgba(225, 29, 72, ${shieldAlpha * 0.72})`
          : `rgba(245, 158, 11, ${shieldAlpha * 0.72})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, 21, -elapsed * 4, -elapsed * 4 + Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Reimu iconic Touhou canon small-hitbox center dot during gameplay
    if (character === 'reimu' && phase === 'playing') {
      ctx.save();
      ctx.translate(player.x, playerY);
      ctx.strokeStyle = 'rgba(225, 29, 72, 0.88)';
      ctx.lineWidth = 1.6;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
      ctx.beginPath();
      ctx.arc(0, 0, 3.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Spinning dizzy stars halo on crash
    if (isDizzy) {
      ctx.save();
      ctx.translate(player.x, playerY - 23);
      for (let i = 0; i < 3; i++) {
        const a = player.dizzyTime * 6.5 + (i * Math.PI * 2) / 3;
        ctx.save();
        ctx.translate(Math.cos(a) * 16, Math.sin(a) * 5.8);
        ctx.rotate(a);
        this.drawStarPath(ctx, 4, 4.8, 2);
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
    wingBoost: number,
    dragY: number,
    wave: number,
    wave2: number,
    isDizzy: boolean,
    isBlinking: boolean,
    isDetermined: boolean,
  ): void {
    // Articulated back crow wing
    ctx.save();
    ctx.translate(-5, -2);
    ctx.rotate(-0.26 + flapAngle * 0.85);
    ctx.fillStyle = '#131724';
    ctx.strokeStyle = '#07090e';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-18, -22, -33, -11, -25, 4);
    ctx.bezierCurveTo(-18, 9, -7, 6, 0, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Velocity-reactive flowing crimson tengu scarf / ribbon tail
    ctx.fillStyle = '#dc2626';
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-6, 4);
    ctx.bezierCurveTo(-16, 6 + dragY * 0.45 + wave * 2.5, -26, 2 + dragY * 0.85 - wave2 * 3, -33, 5 + dragY + wave * 3);
    ctx.lineTo(-27, 10 + dragY * 0.9 + wave * 2);
    ctx.lineTo(-31, 13 + dragY * 0.8 - wave2 * 2.5);
    ctx.bezierCurveTo(-21, 14 + dragY * 0.4 + wave * 2, -13, 12, -6, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Crisp white tengu blouse & dark pleated skirt
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(-1, 6.2, 11.8, 9.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1e2230';
    ctx.beginPath();
    ctx.arc(-1, 7.6, 10, 0.22, Math.PI - 0.22);
    ctx.closePath();
    ctx.fill();

    // Red tengu tie with bright fold highlight
    ctx.fillStyle = '#e03140';
    ctx.beginPath();
    ctx.moveTo(3, 2);
    ctx.lineTo(9.5, 5.5);
    ctx.lineTo(4.5, 11);
    ctx.lineTo(1, 6.2);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.fillStyle = '#ffebd6';
    ctx.strokeStyle = '#2d1c22';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(3.5, -5.5, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Wind-swept glossy black tengu hair (trailing tips react to vertical velocity!)
    ctx.fillStyle = '#181c29';
    ctx.strokeStyle = '#090b12';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(2.5, -7.2, 12.4, Math.PI * 0.84, Math.PI * 2.04);
    ctx.lineTo(14.2, -4);
    ctx.quadraticCurveTo(10, -10.5, 4, -11);
    ctx.quadraticCurveTo(-3.2, -11, -7.5, -2.5);
    ctx.quadraticCurveTo(-13, -0.5 + dragY * 0.35, -16.5, 2.5 + dragY * 0.55 + wave * 1.8);
    ctx.quadraticCurveTo(-11, -3, -10, -7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glossy hair highlight arc
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.62)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(3, -9.6, 7.2, Math.PI * 1.16, Math.PI * 1.66);
    ctx.stroke();

    // Iconic crimson Tengu Tokin cap + gold cord & mini tassel
    ctx.fillStyle = '#dc2626';
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-2.5, -16);
    ctx.lineTo(8.8, -17.6);
    ctx.lineTo(10.8, -24.8);
    ctx.lineTo(-0.5, -24.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-2, -16);
    ctx.lineTo(8.8, -17.4);
    ctx.stroke();

    // Rich anime face (crimson eyes)
    this.drawAnimeFace(ctx, 8.2, -4.6, '#b91c1c', '#f87171', isDizzy, isBlinking, isDetermined);

    // Multi-stage articulated front crow wing (fanned primary feathers splay on flap!)
    ctx.save();
    ctx.translate(-3, 2);
    ctx.rotate(-0.1 - flapAngle);
    const splay = 0.08 + Math.max(0, -flapAngle) * 0.24 + wingBoost * 0.16;

    // 3 fanned primary flight feathers behind covert
    ctx.fillStyle = '#1b2032';
    ctx.strokeStyle = '#090b12';
    ctx.lineWidth = 1.25;
    for (let f = 0; f < 3; f++) {
      ctx.save();
      ctx.rotate(-0.18 + f * (0.24 + splay * 0.35));
      ctx.beginPath();
      ctx.moveTo(-4, 1);
      ctx.quadraticCurveTo(-20, -4, -30 + f * 3.5, 2 + f * 2);
      ctx.quadraticCurveTo(-18, 8, -4, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Upper wing covert
    ctx.fillStyle = '#283047';
    ctx.beginPath();
    ctx.moveTo(1.5, 0);
    ctx.bezierCurveTo(-12, -15, -25, -8, -20, 4);
    ctx.quadraticCurveTo(-10, 9, 1.5, 4.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Slate-blue wing sheen
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-16, -2);
    ctx.lineTo(-6, 1.5);
    ctx.stroke();
    ctx.restore();
  }

  private drawReimu(
    ctx: CanvasRenderingContext2D,
    flapAngle: number,
    dragY: number,
    wave: number,
    wave2: number,
    isDizzy: boolean,
    isBlinking: boolean,
    isDetermined: boolean,
  ): void {
    // Back articulated white-and-red miko sleeve
    ctx.save();
    ctx.translate(-4, 0);
    ctx.rotate(-0.18 + flapAngle * 0.78);
    ctx.fillStyle = '#fff5f5';
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.quadraticCurveTo(-19, -15, -25, -1);
    ctx.quadraticCurveTo(-16, 10, 0, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Oversized iconic red Hakurei ribbon bow with velocity-reactive dual tails!
    ctx.save();
    ctx.translate(-7, -14);
    ctx.rotate(-0.12 + wave * 0.07);
    ctx.fillStyle = '#e03140';
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1.4;
    // Left bow wing
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-15, -13, -17, 1);
    ctx.quadraticCurveTo(-12, 9, 0, 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Upper bow wing
    ctx.beginPath();
    ctx.moveTo(1, 0);
    ctx.quadraticCurveTo(-4, -17, 9, -12.5);
    ctx.quadraticCurveTo(10.5, -4, 3, 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Dynamic flowing ribbon tails
    ctx.beginPath();
    ctx.moveTo(-2, 3);
    ctx.bezierCurveTo(-14, 9 + dragY * 0.5 + wave * 3, -22, 6 + dragY * 0.85, -29, 9 + dragY + wave2 * 3);
    ctx.lineTo(-24, 15 + dragY * 0.85 + wave * 2.5);
    ctx.bezierCurveTo(-14, 13 + dragY * 0.4, -7, 10, 0, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Miko hakama body + crisp white upper collar + gold neckerchief
    ctx.fillStyle = '#dc2626';
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(-1, 6.5, 11.6, 9.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

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
    ctx.lineTo(8.8, 5.5);
    ctx.lineTo(4.2, 9.8);
    ctx.lineTo(1, 6);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.fillStyle = '#ffebd6';
    ctx.strokeStyle = '#3b1d24';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(3.5, -5.5, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Flowing chestnut-brown hair reacting to velocity
    ctx.fillStyle = '#2d181e';
    ctx.strokeStyle = '#14090c';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(2.5, -7, 12.4, Math.PI * 0.82, Math.PI * 2.02);
    ctx.lineTo(14, -4.5);
    ctx.quadraticCurveTo(9, -11, 3.5, -11);
    ctx.quadraticCurveTo(-4, -10.5, -7.8, -2);
    ctx.quadraticCurveTo(-13, 3 + dragY * 0.45, -14.5, 9 + dragY * 0.65 + wave * 2);
    ctx.quadraticCurveTo(-14.5, 2, -10, -7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Hair glossy sheen
    ctx.strokeStyle = 'rgba(214, 152, 164, 0.42)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(3, -9.6, 7.2, Math.PI * 1.15, Math.PI * 1.65);
    ctx.stroke();

    // White miko hair tube accessory
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1;
    this.drawRoundedRect(ctx, -2.5, 0.5, 4.3, 6.2, 1.8);
    ctx.fill();
    ctx.stroke();

    // Rich anime face (warm crimson eyes)
    this.drawAnimeFace(ctx, 8.2, -4.6, '#991b1b', '#fb7185', isDizzy, isBlinking, isDetermined);

    // Multi-stage articulated front billowing miko sleeve
    ctx.save();
    ctx.translate(-2, 3);
    ctx.rotate(-0.08 - flapAngle * 0.94);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(2, -1);
    ctx.bezierCurveTo(-13, -16, -27, -7, -22, 8);
    ctx.quadraticCurveTo(-12, 13, 2, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Vermilion sleeve cord trim
    ctx.strokeStyle = '#e03140';
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.moveTo(-17, -2.5);
    ctx.lineTo(-14.5, 8);
    ctx.stroke();
    ctx.restore();
  }

  private drawCirno(
    ctx: CanvasRenderingContext2D,
    flapAngle: number,
    wingBoost: number,
    dragY: number,
    wave: number,
    isDizzy: boolean,
    isBlinking: boolean,
    isDetermined: boolean,
    elapsed: number,
  ): void {
    const shimmer = 0.78 + Math.sin(elapsed * 8.5) * 0.14;
    const splay = 0.06 + wingBoost * 0.16;

    const drawIceWingFan = (angleOffset: number, scale: number, alpha: number) => {
      ctx.save();
      ctx.translate(-5, 0);
      ctx.rotate(angleOffset);
      ctx.scale(scale, scale);

      const wingAngles = [-0.66 - splay, -0.06, 0.48 + splay];
      const wingLengths = [24, 29, 22];

      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.rotate(wingAngles[i] + Math.sin(elapsed * 12 + i * 1.4) * 0.04);
        const len = wingLengths[i];
        const grad = ctx.createLinearGradient(0, 0, -len, 0);
        grad.addColorStop(0, `rgba(235, 250, 255, ${alpha})`);
        grad.addColorStop(0.5, `rgba(88, 206, 255, ${alpha * 0.9})`);
        grad.addColorStop(1, `rgba(196, 242, 255, ${alpha * 0.88})`);
        ctx.fillStyle = grad;
        ctx.strokeStyle = `rgba(37, 99, 235, ${alpha * 0.92})`;
        ctx.lineWidth = 1.25;

        // Faceted hexagonal ice crystal blade
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-len * 0.34, -4.6);
        ctx.lineTo(-len * 0.72, -3.6);
        ctx.lineTo(-len, 0);
        ctx.lineTo(-len * 0.72, 3.6);
        ctx.lineTo(-len * 0.34, 4.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Translucent prism highlight facet
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.48})`;
        ctx.beginPath();
        ctx.moveTo(-2, 0);
        ctx.lineTo(-len * 0.36, -3.4);
        ctx.lineTo(-len * 0.85, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    };

    // Back 3 translucent ice crystal wings
    drawIceWingFan(flapAngle * 0.68 - 0.18, 0.92, shimmer * 0.74);

    // Blue fairy dress with white collar & crisp red ribbon
    ctx.fillStyle = '#2563eb';
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(-1, 6.5, 11.2, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Frilled white dress trim
    ctx.fillStyle = '#eff6ff';
    ctx.beginPath();
    ctx.arc(0, 3.2, 8.6, Math.PI * 1.05, Math.PI * 1.98);
    ctx.lineTo(5.2, 7.8);
    ctx.lineTo(-5.2, 7.8);
    ctx.closePath();
    ctx.fill();

    // Red chest ribbon
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(2.5, 3);
    ctx.lineTo(8.2, 5.2);
    ctx.lineTo(4.2, 9.2);
    ctx.lineTo(1, 5.8);
    ctx.closePath();
    ctx.fill();

    // Blue hair bow with velocity-reactive flowing ribbons
    ctx.save();
    ctx.translate(-6, -15);
    ctx.fillStyle = '#60a5fa';
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(-5, -1, 6.8, 4.2, -0.35, 0, Math.PI * 2);
    ctx.ellipse(3, -5, 5.8, 3.6, 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Trailing ribbon tail
    ctx.beginPath();
    ctx.moveTo(-4, 1);
    ctx.quadraticCurveTo(-12, 5 + dragY * 0.45 + wave * 2, -19, 4 + dragY * 0.75 - wave * 2);
    ctx.lineTo(-16, 8.5 + dragY * 0.7);
    ctx.quadraticCurveTo(-9, 7 + dragY * 0.3, -2, 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Head
    ctx.fillStyle = '#fff0e0';
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(3.5, -5.5, 11.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Vibrant ice-blue bob hair
    ctx.fillStyle = '#60c5ff';
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.arc(2.5, -7, 12.2, Math.PI * 0.78, Math.PI * 2.02);
    ctx.lineTo(13.8, -4);
    ctx.quadraticCurveTo(9, -10.8, 3.5, -10.8);
    ctx.quadraticCurveTo(-4, -10.2, -7.5, -1.5);
    ctx.quadraticCurveTo(-12, 2.5 + dragY * 0.35, -12.5, 6.5 + dragY * 0.45 + wave * 1.6);
    ctx.quadraticCurveTo(-13, 0, -9.8, -7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Crisp white ice-hair highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(3, -9.6, 7.2, Math.PI * 1.18, Math.PI * 1.66);
    ctx.stroke();

    // Rich anime face (sapphire eyes)
    this.drawAnimeFace(ctx, 8.2, -4.6, '#1d4ed8', '#38bdf8', isDizzy, isBlinking, isDetermined);

    // Front 3 articulated translucent ice crystal wings
    drawIceWingFan(-flapAngle * 0.88 + 0.06, 1, shimmer);
  }

  private drawAnimeFace(
    ctx: CanvasRenderingContext2D,
    eyeX: number,
    eyeY: number,
    irisDark: string,
    irisLight: string,
    isDizzy: boolean,
    isBlinking: boolean,
    isDetermined: boolean,
  ): void {
    // Soft rosy cheek blush
    ctx.fillStyle = 'rgba(251, 113, 133, 0.52)';
    ctx.beginPath();
    ctx.ellipse(eyeX + 1.8, eyeY + 3.6, 2.7, 1.35, 0, 0, Math.PI * 2);
    ctx.fill();

    if (isDizzy) {
      // Surprised "> <" crash eye
      ctx.strokeStyle = '#2d1c22';
      ctx.lineWidth = 1.9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(eyeX - 2.4, eyeY - 2.6);
      ctx.lineTo(eyeX + 1.7, eyeY);
      ctx.lineTo(eyeX - 2.4, eyeY + 2.6);
      ctx.stroke();

      // Tiny comical blue sweatdrop
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(eyeX - 4.5, eyeY - 5.5);
      ctx.quadraticCurveTo(eyeX - 2.6, eyeY - 2.2, eyeX - 4.5, eyeY - 1.4);
      ctx.quadraticCurveTo(eyeX - 6.4, eyeY - 2.2, eyeX - 4.5, eyeY - 5.5);
      ctx.fill();

      // Surprised "o" mouth
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.arc(eyeX + 2.2, eyeY + 5.2, 1.7, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (isBlinking) {
      // Cute happy curved blink arc
      ctx.strokeStyle = '#24141b';
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(eyeX, eyeY + 0.8, 2.6, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else {
      // Layered luminous anime eye: white sclera base
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(eyeX, eyeY, 2.7, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Upper dark iris
      ctx.fillStyle = irisDark;
      ctx.beginPath();
      ctx.ellipse(eyeX + 0.2, eyeY + 0.1, 2.35, 3.05, 0, 0, Math.PI * 2);
      ctx.fill();

      // Lower luminous iris crescent glow
      ctx.fillStyle = irisLight;
      ctx.beginPath();
      ctx.ellipse(eyeX + 0.25, eyeY + 1.25, 1.65, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Deep pupil dot
      ctx.fillStyle = '#180d14';
      ctx.beginPath();
      ctx.arc(eyeX + 0.3, eyeY - 0.1, 1.05, 0, Math.PI * 2);
      ctx.fill();

      // Crisp double anime specular catchlights
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(eyeX + 0.95, eyeY - 1.35, 0.98, 0, Math.PI * 2);
      ctx.arc(eyeX - 0.5, eyeY + 1.25, 0.52, 0, Math.PI * 2);
      ctx.fill();

      // Defined upper eyelash curve
      ctx.strokeStyle = '#1f1118';
      ctx.lineWidth = 1.65;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(eyeX, eyeY + 0.1, 2.8, Math.PI * 1.12, Math.PI * 1.9);
      ctx.stroke();
    }

    // Expressive eyebrow (fiercely determined when flapping!)
    ctx.strokeStyle = '#2d1a22';
    ctx.lineWidth = 1.15;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (isDetermined) {
      ctx.moveTo(eyeX - 2.3, eyeY - 4.7);
      ctx.lineTo(eyeX + 2.2, eyeY - 3.6);
    } else {
      ctx.moveTo(eyeX - 2, eyeY - 4.3);
      ctx.quadraticCurveTo(eyeX, eyeY - 5, eyeX + 2.1, eyeY - 4.2);
    }
    ctx.stroke();

    // Confident cute mouth (bright open grin when determined)
    if (isDetermined) {
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(eyeX + 1.7, eyeY + 4.5, 1.75, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 1.15;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(eyeX + 1.4, eyeY + 4.4, 2, 0.2, Math.PI * 0.85);
      ctx.stroke();
    }
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

    // Subtle spiritual crimson-gold halo around orb
    ctx.fillStyle = 'rgba(254, 202, 202, 0.34)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.55, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(spin);

    ctx.fillStyle = '#fff5f5';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.arc(0, r * 0.5, r * 0.5, Math.PI * 0.5, -Math.PI * 0.5, true);
    ctx.arc(0, -r * 0.5, r * 0.5, Math.PI * 0.5, -Math.PI * 0.5, false);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(0, -r * 0.5, r * 0.19, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff5f5';
    ctx.beginPath();
    ctx.arc(0, r * 0.5, r * 0.19, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[], count: number): void {
    for (let i = 0; i < count; i++) {
      const p = particles[i];
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      switch (p.kind) {
        case 'airRing': {
          // Crisp tilted white wind-gust air ring on flap!
          const prog = 1 - alpha;
          const rx = p.size * (0.65 + prog * 1.65);
          const ry = rx * 0.36;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = Math.max(1, 2.8 * alpha);
          ctx.beginPath();
          ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case 'windRibbon': {
          const s = p.size;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = Math.max(1.1, 2.4 * alpha);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-s, 0);
          ctx.quadraticCurveTo(-s * 0.25, -s * 0.34, s * 0.55, 0);
          ctx.quadraticCurveTo(s * 0.9, s * 0.22, s, -s * 0.08);
          ctx.stroke();
          break;
        }
        case 'maple': {
          const s = p.size;
          ctx.fillStyle = p.color;
          ctx.beginPath();
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
          const s = p.size;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(0, s);
          ctx.bezierCurveTo(s * 0.95, s * 0.4, s * 0.85, -s * 0.75, s * 0.24, -s);
          ctx.lineTo(0, -s * 0.58);
          ctx.lineTo(-s * 0.24, -s);
          ctx.bezierCurveTo(-s * 0.85, -s * 0.75, -s * 0.95, s * 0.4, 0, s);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'snowflake': {
          const s = p.size;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.4;
          ctx.lineCap = 'round';
          for (let r = 0; r < 3; r++) {
            const a = (r * Math.PI) / 3;
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
        case 'iceCrystal': {
          const s = p.size;
          ctx.fillStyle = p.color;
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, -s * 1.15);
          ctx.lineTo(s * 0.62, 0);
          ctx.lineTo(0, s * 1.15);
          ctx.lineTo(-s * 0.62, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
          ctx.beginPath();
          ctx.moveTo(0, -s * 0.9);
          ctx.lineTo(s * 0.35, 0);
          ctx.lineTo(0, 0);
          ctx.closePath();
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
          const r = p.size * (0.6 + progress * 1.9);
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
        case 'grazeSpark': {
          // Razor-sharp electric white/gold Touhou Graze spark streak
          const s = p.size * (0.45 + 0.55 * alpha);
          ctx.strokeStyle = p.secondaryColor;
          ctx.lineWidth = 2.6 * alpha + 0.6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-s, 0);
          ctx.lineTo(s, 0);
          ctx.stroke();

          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.2 * alpha + 0.4;
          ctx.beginPath();
          ctx.moveTo(-s * 0.85, 0);
          ctx.lineTo(s * 0.85, 0);
          ctx.stroke();
          break;
        }
        case 'bambooShard': {
          const s = p.size;
          ctx.fillStyle = p.color;
          ctx.strokeStyle = '#092417';
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(-s, -s * 0.32);
          ctx.lineTo(s * 0.85, -s * 0.44);
          ctx.lineTo(s, s * 0.28);
          ctx.lineTo(-s * 0.72, s * 0.42);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        }
        case 'toriiShard': {
          const s = p.size;
          ctx.fillStyle = p.color;
          ctx.strokeStyle = '#3f070e';
          ctx.lineWidth = 1.1;
          ctx.fillRect(-s * 0.9, -s * 0.35, s * 1.8, s * 0.7);
          ctx.strokeRect(-s * 0.9, -s * 0.35, s * 1.8, s * 0.7);
          ctx.fillStyle = p.secondaryColor;
          ctx.fillRect(-s * 0.6, -s * 0.1, s * 1.2, s * 0.2);
          break;
        }
        case 'talisman': {
          // Classic Hakurei red-on-white ofuda paper charm
          const s = p.size;
          ctx.fillStyle = '#fffaf5';
          ctx.strokeStyle = '#b91c2c';
          ctx.lineWidth = 1;
          ctx.fillRect(-s * 0.45, -s * 0.85, s * 0.9, s * 1.7);
          ctx.strokeRect(-s * 0.45, -s * 0.85, s * 0.9, s * 1.7);
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(-s * 0.14, -s * 0.55, s * 0.28, s * 1.1);
          break;
        }
        case 'frostRing': {
          const prog = 1 - alpha;
          const r = p.size * (0.8 + prog * 3.8);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = Math.max(1.2, 3.4 * alpha);
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const a = (k * Math.PI) / 3;
            const px = Math.cos(a) * r;
            const py = Math.sin(a) * r;
            if (k === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
          break;
        }
        default: {
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
    for (let i = 0; i < texts.length; i++) {
      const ft = texts[i];
      const alpha = clamp(ft.life / (ft.maxLife * 0.55), 0, 1);
      const pop = 1 + Math.max(0, (ft.life - ft.maxLife * 0.72) / (ft.maxLife * 0.28)) * 0.24;

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

  private drawFrostVignette(
    ctx: CanvasRenderingContext2D,
    freezeTimer: number,
    elapsed: number,
  ): void {
    const total = PHYSICS.CIRNO_FREEZE_DURATION;
    const sinceStart = total - freezeTimer;
    let alpha = 1;
    if (sinceStart < 0.16) alpha = sinceStart / 0.16;
    else if (freezeTimer < 0.35) alpha = freezeTimer / 0.35;
    alpha = clamp(alpha, 0, 1);

    const pulse = 0.88 + 0.12 * Math.sin(elapsed * 9);

    ctx.save();
    // Subtle cool sub-zero atmospheric glaze
    ctx.fillStyle = `rgba(125, 211, 252, ${0.11 * alpha})`;
    ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);

    // Frosty icy vignette along all four edges
    const edgeThickness = 34;
    const topGrad = ctx.createLinearGradient(0, 0, 0, edgeThickness);
    topGrad.addColorStop(0, `rgba(186, 230, 253, ${0.52 * alpha * pulse})`);
    topGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, STAGE_WIDTH, edgeThickness);

    const botGrad = ctx.createLinearGradient(0, STAGE_HEIGHT, 0, STAGE_HEIGHT - edgeThickness);
    botGrad.addColorStop(0, `rgba(186, 230, 253, ${0.46 * alpha * pulse})`);
    botGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');
    ctx.fillStyle = botGrad;
    ctx.fillRect(0, STAGE_HEIGHT - edgeThickness, STAGE_WIDTH, edgeThickness);

    const leftGrad = ctx.createLinearGradient(0, 0, edgeThickness, 0);
    leftGrad.addColorStop(0, `rgba(186, 230, 253, ${0.5 * alpha * pulse})`);
    leftGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');
    ctx.fillStyle = leftGrad;
    ctx.fillRect(0, 0, edgeThickness, STAGE_HEIGHT);

    const rightGrad = ctx.createLinearGradient(STAGE_WIDTH, 0, STAGE_WIDTH - edgeThickness, 0);
    rightGrad.addColorStop(0, `rgba(186, 230, 253, ${0.5 * alpha * pulse})`);
    rightGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');
    ctx.fillStyle = rightGrad;
    ctx.fillRect(STAGE_WIDTH - edgeThickness, 0, edgeThickness, STAGE_HEIGHT);

    // Crisp luminous icy inner frame
    ctx.strokeStyle = `rgba(224, 242, 254, ${0.78 * alpha * pulse})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(2.5, 2.5, STAGE_WIDTH - 5, STAGE_HEIGHT - 5);

    // Geometric crystalline ice-prism clusters at all 4 corners
    const corners: Array<[number, number, number, number]> = [
      [14, 14, 1, 1],
      [STAGE_WIDTH - 14, 14, -1, 1],
      [14, STAGE_HEIGHT - 14, 1, -1],
      [STAGE_WIDTH - 14, STAGE_HEIGHT - 14, -1, -1],
    ];
    for (let c = 0; c < corners.length; c++) {
      const [cx, cy, sx, sy] = corners[c];
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(sx, sy);
      ctx.globalAlpha = 0.85 * alpha;

      // Primary ice spikes radiating inward from corner
      const spikes = [
        { ang: 0.22, len: 34, w: 6 },
        { ang: 0.78, len: 42, w: 7.5 },
        { ang: 1.32, len: 32, w: 5.5 },
      ];
      for (let s = 0; s < spikes.length; s++) {
        const sp = spikes[s];
        ctx.save();
        ctx.rotate(sp.ang);
        ctx.fillStyle = s === 1 ? 'rgba(224, 242, 254, 0.86)' : 'rgba(125, 211, 252, 0.78)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(sp.len * 0.45, -sp.w * 0.5);
        ctx.lineTo(sp.len, 0);
        ctx.lineTo(sp.len * 0.45, sp.w * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    ctx.restore();
  }

  private drawSpellBanner(
    ctx: CanvasRenderingContext2D,
    text: string,
    timer: number,
    accentColor: string,
  ): void {
    const total = 1.55;
    const sinceStart = total - timer;
    let alpha = 1;
    if (sinceStart < 0.16) alpha = sinceStart / 0.16;
    else if (timer < 0.35) alpha = timer / 0.35;
    alpha = clamp(alpha, 0, 1);

    const slideX = sinceStart < 0.18 ? (1 - sinceStart / 0.18) * 34 : 0;

    ctx.save();
    ctx.globalAlpha = alpha;
    const y = 122;

    const bgGrad = ctx.createLinearGradient(56, y, STAGE_WIDTH - 56, y);
    bgGrad.addColorStop(0, 'rgba(16, 10, 32, 0)');
    bgGrad.addColorStop(0.2, 'rgba(22, 11, 40, 0.84)');
    bgGrad.addColorStop(0.8, 'rgba(22, 11, 40, 0.84)');
    bgGrad.addColorStop(1, 'rgba(16, 10, 32, 0)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(52, y - 18, STAGE_WIDTH - 104, 36);

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(86, y - 18);
    ctx.lineTo(STAGE_WIDTH - 86, y - 18);
    ctx.moveTo(86, y + 18);
    ctx.lineTo(STAGE_WIDTH - 86, y + 18);
    ctx.stroke();

    ctx.font = '900 16px system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 12;
    ctx.fillText(`✦ ${text} ✦`, STAGE_WIDTH * 0.5 + slideX, y);
    ctx.restore();
  }

  private drawPhaseBanner(ctx: CanvasRenderingContext2D, text: string, timer: number): void {
    const total = 2.45;
    const elapsed = total - timer;
    let alpha = 1;
    if (elapsed < 0.3) alpha = elapsed / 0.3;
    else if (timer < 0.45) alpha = timer / 0.45;
    alpha = clamp(alpha, 0, 1);

    ctx.save();
    ctx.globalAlpha = alpha;
    const y = 114;

    const bgGrad = ctx.createLinearGradient(60, y, STAGE_WIDTH - 60, y);
    bgGrad.addColorStop(0, 'rgba(18, 12, 34, 0)');
    bgGrad.addColorStop(0.22, 'rgba(24, 14, 42, 0.78)');
    bgGrad.addColorStop(0.78, 'rgba(24, 14, 42, 0.78)');
    bgGrad.addColorStop(1, 'rgba(18, 12, 34, 0)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(54, y - 19, STAGE_WIDTH - 108, 38);

    ctx.strokeStyle = 'rgba(245, 197, 66, 0.68)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(96, y - 19);
    ctx.lineTo(STAGE_WIDTH - 96, y - 19);
    ctx.moveTo(96, y + 19);
    ctx.lineTo(STAGE_WIDTH - 96, y + 19);
    ctx.stroke();

    ctx.font = '700 15.5px system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
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
