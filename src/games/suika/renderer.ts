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
  type OrbFaceState,
} from './tiers';
import type { MergeEvent, OrbBody } from './physics';
import {
  OrbSpriteCache,
  drawStarPath,
  drawTouhouOrb,
  renderOrbIcon,
  renderSupportPortrait,
  roundRectPath,
} from './sprites';

export { drawTouhouOrb, renderOrbIcon, renderSupportPortrait };
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

export interface OfudaProjectile {
  orbId: number;
  startX: number;
  startY: number;
  ctrlX: number;
  ctrlY: number;
  targetX: number;
  targetY: number;
  progress: number;
  duration: number;
}

interface GapPortalFX {
  x: number;
  y: number;
  radius: number;
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
  /** Touhou Gameplay Visual States */
  timeStopTimer: number;
  timeStopRapidDropsLeft: number;
  yukariPickMode: boolean;
  yukariHoveredOrbId: number | null;
  suikaShrinkTimer: number;
  feverTimer: number;
  firstDropHintAlpha: number;
}

export class SuikaRenderer {
  private spriteCache = new OrbSpriteCache();
  private particles: Particle[] = [];
  private shockwaves: Shockwave[] = [];
  private floatingTexts: FloatingText[] = [];
  private ofudas: OfudaProjectile[] = [];
  private gapPortals: GapPortalFX[] = [];
  private ambient: AmbientMote[] = [];
  private shakeMag = 0;
  private screenFlashAlpha = 0;
  private screenFlashColor = '#ffe6a3';

  constructor() {
    this.initAmbient();
  }

  /** Pre-renders or refreshes high-DPI offscreen plush orb sprites when canvas scale/DPR changes. */
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
    this.ofudas = [];
    this.gapPortals = [];
    this.shakeMag = 0;
    this.screenFlashAlpha = 0;
  }

  spawnFloatingBanner(
    text: string,
    subText: string | undefined,
    color: string,
    x = BOARD_WIDTH * 0.5,
    y = 185,
    scale = 1.18
  ): void {
    this.floatingTexts.push({
      x: clamp(x, 86, BOARD_WIDTH - 86),
      y,
      vy: -36,
      text,
      subText,
      color,
      scale,
      life: 0,
      maxLife: 1.4,
    });
  }

  /** Reimu 灵符「梦想封印」: launches 3 curving homing ofuda talismans toward targeted orbs */
  spawnReimuOfudaFX(targets: readonly OrbBody[], originX: number): void {
    this.shakeMag = Math.min(8, this.shakeMag + 3.5);
    this.screenFlashColor = '#ff7082';
    this.screenFlashAlpha = 0.22;

    targets.forEach((orb, idx) => {
      const fanOffset = (idx - (targets.length - 1) * 0.5) * 125;
      this.ofudas.push({
        orbId: orb.id,
        startX: originX,
        startY: SPAWN_Y + 8,
        ctrlX: clamp(originX + fanOffset, INNER_LEFT + 14, INNER_RIGHT - 14),
        ctrlY: Math.min(orb.y - 70, JAR_TOP_Y + 80 + idx * 35),
        targetX: orb.x,
        targetY: orb.y,
        progress: 0,
        duration: 0.26 + idx * 0.055,
      });
    });

    this.spawnFloatingBanner('灵符「梦想封印」', undefined, '#ff9aa8', BOARD_WIDTH * 0.5, 165, 1.12);
  }

  spawnOfudaSealBurst(x: number, y: number, tier: number, points: number): void {
    const def = ORB_TIERS[tier] ?? ORB_TIERS[0];
    this.shockwaves.push({
      x,
      y,
      radius: def.radius * 0.4,
      maxRadius: def.radius * 2.2 + 24,
      color: '#ff667d',
      alpha: 0.92,
      lineWidth: 3.2,
      isMagicCircle: true,
      rotation: Math.random() * TAU,
      vRot: 2.8,
      points: 6,
    });
    for (let i = 0; i < 18; i++) {
      const ang = (TAU * i) / 18 + (Math.random() - 0.5) * 0.3;
      const spd = 75 + Math.random() * 145;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 30,
        size: 3.5 + Math.random() * 3.0,
        color: i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#ff4d66' : '#ffe07d',
        alpha: 1,
        life: 0,
        maxLife: 0.58 + Math.random() * 0.26,
        rotation: Math.random() * TAU,
        vRot: (Math.random() - 0.5) * 9,
        shape: i % 2 === 0 ? 'petal' : 'star',
      });
    }
    this.floatingTexts.push({
      x: clamp(x, 68, BOARD_WIDTH - 68),
      y: Math.max(125, y - 14),
      vy: -44,
      text: `+${points}`,
      subText: '封印!',
      color: '#ffccd5',
      scale: 0.96,
      life: 0,
      maxLife: 0.85,
    });
  }

  /** Sakuya 幻世「The World」 activation & landing rings */
  spawnTimeStopStartFX(): void {
    this.shakeMag = Math.min(8, this.shakeMag + 4);
    this.screenFlashColor = '#b8d8ff';
    this.screenFlashAlpha = 0.34;
    this.shockwaves.push({
      x: BOARD_WIDTH * 0.5,
      y: (JAR_TOP_Y + FLOOR_Y) * 0.5,
      radius: 26,
      maxRadius: 270,
      color: '#b8dcff',
      alpha: 0.9,
      lineWidth: 4,
      isMagicCircle: true,
      rotation: 0,
      vRot: -1.6,
      points: 8,
    });
    this.spawnFloatingBanner('幻世「The World」', '时间静止 · 无冷却连投3枚', '#cfe6ff', BOARD_WIDTH * 0.5, 172, 1.15);
  }

  spawnTimeStopSnapFX(x: number, y: number, r: number): void {
    this.shockwaves.push({
      x,
      y,
      radius: r * 0.65,
      maxRadius: r * 1.55,
      color: '#d4e8ff',
      alpha: 0.78,
      lineWidth: 2.2,
      isMagicCircle: false,
      rotation: 0,
      vRot: 0,
      points: 0,
    });
  }

  /** Yukari 境符「隙间穿梭」 & Gap Hold portal rift VFX */
  spawnGapPortalFX(x: number, y: number, radius = 38): void {
    this.gapPortals.push({
      x,
      y,
      radius,
      life: 0,
      maxLife: 0.56,
    });
    for (let i = 0; i < 16; i++) {
      const ang = (TAU * i) / 16 + Math.random() * 0.2;
      const spd = 60 + Math.random() * 110;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 3.2 + Math.random() * 2.8,
        color: i % 3 === 0 ? '#f7d572' : i % 3 === 1 ? '#b87aff' : '#ff5978',
        alpha: 1,
        life: 0,
        maxLife: 0.52 + Math.random() * 0.22,
        rotation: Math.random() * TAU,
        vRot: (Math.random() - 0.5) * 8,
        shape: i % 2 === 0 ? 'diamond' : 'star',
      });
    }
  }

  /** Suika 鬼符「密与疏」 golden sake shockwave ripples */
  spawnSuikaSakeRippleFX(): void {
    this.shakeMag = Math.min(13, this.shakeMag + 9.5);
    this.screenFlashColor = '#ffe078';
    this.screenFlashAlpha = 0.28;
    const cx = BOARD_WIDTH * 0.5;
    const cy = (JAR_TOP_Y + FLOOR_Y) * 0.55;
    for (let w = 0; w < 2; w++) {
      this.shockwaves.push({
        x: cx,
        y: cy,
        radius: 28 + w * 24,
        maxRadius: 235 + w * 55,
        color: w === 0 ? '#ffe169' : '#58e690',
        alpha: 0.9,
        lineWidth: 4.5 - w * 1.2,
        isMagicCircle: w === 0,
        rotation: w * 0.5,
        vRot: 1.9,
        points: 8,
      });
    }
    for (let i = 0; i < 34; i++) {
      const ang = (TAU * i) / 34 + Math.random() * 0.25;
      const spd = 90 + Math.random() * 200;
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 180,
        y: FLOOR_Y - 40 - Math.random() * 140,
        vx: Math.cos(ang) * spd * 0.55,
        vy: -90 - Math.random() * 180,
        size: 3.8 + Math.random() * 3.8,
        color: i % 3 === 0 ? '#ffe169' : i % 3 === 1 ? '#64eb97' : '#fff5cf',
        alpha: 1,
        life: 0,
        maxLife: 0.72 + Math.random() * 0.35,
        rotation: Math.random() * TAU,
        vRot: (Math.random() - 0.5) * 8,
        shape: i % 2 === 0 ? 'star' : 'dot',
      });
    }
    this.spawnFloatingBanner('鬼符「密与疏」', '布偶缩小15% · 酒气震荡!', '#ffe270', cx, 172, 1.16);
  }

  /** Deathbomb 「决死结界」 dramatic golden-crimson barrier rescue blast! */
  spawnDeathbombFX(clearedOrbs: readonly OrbBody[]): void {
    this.shakeMag = Math.min(15, this.shakeMag + 12.5);
    this.screenFlashColor = '#ff5468';
    this.screenFlashAlpha = 0.44;

    const cx = BOARD_WIDTH * 0.5;
    const cy = DANGER_Y + 32;
    for (let w = 0; w < 3; w++) {
      this.shockwaves.push({
        x: cx,
        y: cy,
        radius: 20 + w * 22,
        maxRadius: 230 + w * 45,
        color: w % 2 === 0 ? '#ffe066' : '#ff475e',
        alpha: 0.96,
        lineWidth: 5 - w * 1.1,
        isMagicCircle: true,
        rotation: w * 0.6,
        vRot: (w % 2 === 0 ? 1 : -1) * 2.4,
        points: 8,
      });
    }

    for (const o of clearedOrbs) {
      this.shockwaves.push({
        x: o.x,
        y: o.y,
        radius: o.radius * 0.4,
        maxRadius: o.radius * 2.3 + 18,
        color: '#ffe078',
        alpha: 0.9,
        lineWidth: 3.2,
        isMagicCircle: false,
        rotation: 0,
        vRot: 0,
        points: 0,
      });
      for (let i = 0; i < 16; i++) {
        const ang = (TAU * i) / 16 + Math.random() * 0.25;
        const spd = 95 + Math.random() * 190;
        this.particles.push({
          x: o.x,
          y: o.y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 50,
          size: 4 + Math.random() * 3.5,
          color: i % 3 === 0 ? '#ffe066' : i % 3 === 1 ? '#ff4762' : '#ffffff',
          alpha: 1,
          life: 0,
          maxLife: 0.72 + Math.random() * 0.35,
          rotation: Math.random() * TAU,
          vRot: (Math.random() - 0.5) * 10,
          shape: i % 2 === 0 ? 'star' : 'petal',
        });
      }
    }

    this.spawnFloatingBanner('✦ 决死结界!!', '自动消耗灵力净化警戒区!', '#ffe36e', cx, 175, 1.32);
  }

  /** Hyakki Yagyo Fever start celebration */
  spawnFeverStartFX(): void {
    this.screenFlashColor = '#ffe47a';
    this.screenFlashAlpha = 0.28;
    this.spawnFloatingBanner('🏮 百鬼夜行宴会!', '10秒得分 2× FEVER!!', '#ffe678', BOARD_WIDTH * 0.5, 172, 1.24);
  }

  spawnMergeFX(ev: MergeEvent, isFever = false): void {
    if (ev.isDoubleSuika) {
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

    this.shockwaves.push({
      x: ev.x,
      y: ev.y,
      radius: def.radius * 0.52,
      maxRadius: def.radius * (isSuika ? 2.5 : isBig ? 2.05 : 1.88),
      color: isFever ? '#ffe470' : def.rim,
      alpha: isBig ? 0.94 : 0.78,
      lineWidth: isBig ? 3.8 : 2.5,
      isMagicCircle: true,
      rotation: Math.random() * TAU,
      vRot: (ev.newTier % 2 === 0 ? 1 : -1) * (isBig ? 2.1 : 1.5),
      points: isBig ? 8 : 6,
    });

    this.shockwaves.push({
      x: ev.x,
      y: ev.y,
      radius: def.radius * 0.35,
      maxRadius: def.radius * (isSuika ? 2.95 : 1.55),
      color: isSuika ? '#4ce080' : isFever ? '#ffe678' : '#fff5cf',
      alpha: isSuika ? 0.92 : 0.62,
      lineWidth: isSuika ? 4.6 : 2.0,
      isMagicCircle: false,
      rotation: 0,
      vRot: 0,
      points: 0,
    });

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
      const petalTint =
        isFever && i % 3 === 0
          ? '#ffe570'
          : shape === 'petal' && i % 2 === 0
          ? '#ffc2d9'
          : def.particleColors[i % def.particleColors.length];
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
      subText = '🍉 大西瓜 · 伊吹萃香!';
    } else if (ev.combo >= 2) {
      subText = isFever ? `${ev.combo}x COMBO · 2×!` : `${ev.combo}x COMBO!`;
    } else if (ev.newTier >= 8) {
      subText = `${def.fruitName}·${def.shortName}!`;
    } else if (isFever) {
      subText = 'FEVER 2×';
    }

    this.floatingTexts.push({
      x: clamp(ev.x, 76, BOARD_WIDTH - 76),
      y: Math.max(126, ev.y - def.radius * 0.45),
      vy: -50,
      text: `+${ev.points}`,
      subText,
      color: isSuika ? '#6ef09e' : isFever || ev.combo >= 2 ? '#ffe36e' : '#ffffff',
      scale: isSuika ? 1.38 : ev.combo >= 2 ? 1.16 : isBig ? 1.12 : 0.98,
      life: 0,
      maxLife: isSuika ? 1.65 : ev.combo >= 2 ? 1.15 : 0.92,
    });
  }

  /**
   * Advances VFX animations & returns orbIds whose homing ofuda just struck!
   */
  updateEffects(dt: number, orbs?: readonly OrbBody[], isFever = false): number[] {
    const cdt = Math.min(0.05, Math.max(0, dt));
    const landedOfudaOrbIds: number[] = [];

    if (this.shakeMag > 0.05) {
      this.shakeMag *= Math.pow(0.0012, cdt);
    } else {
      this.shakeMag = 0;
    }

    if (this.screenFlashAlpha > 0.005) {
      this.screenFlashAlpha = Math.max(0, this.screenFlashAlpha - cdt * 1.35);
    } else {
      this.screenFlashAlpha = 0;
    }

    // Festive golden sake sparks rising during Hyakki Yagyo Fever!
    if (isFever && Math.random() < cdt * 16) {
      this.particles.push({
        x: INNER_LEFT + 14 + Math.random() * (INNER_WIDTH - 28),
        y: FLOOR_Y - 12 - Math.random() * 40,
        vx: (Math.random() - 0.5) * 28,
        vy: -70 - Math.random() * 80,
        size: 3 + Math.random() * 3.2,
        color: Math.random() < 0.65 ? '#ffe470' : '#ff9ebb',
        alpha: 0.9,
        life: 0,
        maxLife: 0.95 + Math.random() * 0.55,
        rotation: Math.random() * TAU,
        vRot: (Math.random() - 0.5) * 4.5,
        shape: Math.random() < 0.55 ? 'star' : 'petal',
      });
    }

    // Update homing Reimu ofuda talismans
    for (let i = this.ofudas.length - 1; i >= 0; i--) {
      const f = this.ofudas[i];
      if (orbs) {
        const target = orbs.find((o) => o.id === f.orbId);
        if (target) {
          f.targetX = target.x;
          f.targetY = target.y;
        }
      }
      f.progress += cdt / f.duration;

      // Trailing shrine sparks along curve
      if (Math.random() < 0.65) {
        const p = Math.min(1, f.progress);
        const pos = evalQuadBezier(f.startX, f.startY, f.ctrlX, f.ctrlY, f.targetX, f.targetY, p);
        this.particles.push({
          x: pos.x,
          y: pos.y,
          vx: (Math.random() - 0.5) * 30,
          vy: (Math.random() - 0.5) * 30,
          size: 2.5 + Math.random() * 2,
          color: Math.random() < 0.5 ? '#ff576d' : '#ffe478',
          alpha: 0.85,
          life: 0,
          maxLife: 0.25,
          rotation: Math.random() * TAU,
          vRot: 4,
          shape: 'star',
        });
      }

      if (f.progress >= 1) {
        landedOfudaOrbIds.push(f.orbId);
        this.ofudas.splice(i, 1);
      }
    }

    // Update Yukari Gap portals
    for (let i = this.gapPortals.length - 1; i >= 0; i--) {
      const gp = this.gapPortals[i];
      gp.life += cdt;
      if (gp.life >= gp.maxLife) {
        this.gapPortals.splice(i, 1);
      }
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

    // Burst particles (cap length for locked 60fps on mega chains)
    if (this.particles.length > 190) {
      this.particles.splice(0, this.particles.length - 190);
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += cdt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += (p.shape === 'petal' ? 180 : 280) * cdt;
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

    return landedOfudaOrbIds;
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
      timeStopTimer,
      timeStopRapidDropsLeft,
      yukariPickMode,
      yukariHoveredOrbId,
      suikaShrinkTimer,
      feverTimer,
      firstDropHintAlpha,
    } = params;

    const isTimeStop = timeStopTimer > 0.01;
    const isFever = feverTimer > 0.01;

    ctx.save();

    if (this.shakeMag > 0.1) {
      const sx = (Math.random() - 0.5) * 2 * this.shakeMag;
      const sy = (Math.random() - 0.5) * 2 * this.shakeMag;
      ctx.translate(sx, sy);
    }

    // 1. Background canvas fill (cozy twilight Hakurei shrine plum-indigo, shifting gracefully for Time Stop / Fever)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, BOARD_HEIGHT);
    if (isTimeStop) {
      bgGrad.addColorStop(0, '#10182b');
      bgGrad.addColorStop(0.55, '#192742');
      bgGrad.addColorStop(1, '#121e33');
    } else if (isFever) {
      bgGrad.addColorStop(0, '#26142e');
      bgGrad.addColorStop(0.52, '#331c3d');
      bgGrad.addColorStop(1, '#211c2b');
    } else {
      bgGrad.addColorStop(0, '#18102e');
      bgGrad.addColorStop(0.52, '#241744');
      bgGrad.addColorStop(1, '#141d2e');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

    // Warm lantern glow above drop rail
    const topGlow = ctx.createRadialGradient(
      BOARD_WIDTH * 0.5,
      44,
      8,
      BOARD_WIDTH * 0.5,
      56,
      215
    );
    if (isTimeStop) {
      topGlow.addColorStop(0, 'rgba(155, 205, 255, 0.22)');
      topGlow.addColorStop(0.55, 'rgba(100, 150, 235, 0.09)');
      topGlow.addColorStop(1, 'rgba(16, 24, 43, 0)');
    } else if (isFever) {
      topGlow.addColorStop(0, 'rgba(255, 224, 112, 0.30)');
      topGlow.addColorStop(0.55, 'rgba(240, 130, 62, 0.12)');
      topGlow.addColorStop(1, 'rgba(38, 20, 46, 0)');
    } else {
      topGlow.addColorStop(0, 'rgba(247, 206, 104, 0.17)');
      topGlow.addColorStop(0.55, 'rgba(212, 42, 62, 0.08)');
      topGlow.addColorStop(1, 'rgba(24, 16, 46, 0)');
    }
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, 0, BOARD_WIDTH, 220);

    // 2. Jar interior backing & clipped shrine atmosphere
    ctx.save();
    roundRectPath(ctx, INNER_LEFT, JAR_TOP_Y, INNER_WIDTH, FLOOR_Y - JAR_TOP_Y, 14);
    const jarGrad = ctx.createLinearGradient(0, JAR_TOP_Y, 0, FLOOR_Y);
    if (isTimeStop) {
      jarGrad.addColorStop(0, 'rgba(14, 24, 46, 0.72)');
      jarGrad.addColorStop(0.62, 'rgba(22, 36, 66, 0.78)');
      jarGrad.addColorStop(1, 'rgba(16, 28, 52, 0.90)');
    } else if (isFever) {
      jarGrad.addColorStop(0, 'rgba(34, 18, 38, 0.64)');
      jarGrad.addColorStop(0.6, 'rgba(46, 24, 46, 0.72)');
      jarGrad.addColorStop(1, 'rgba(36, 26, 30, 0.86)');
    } else {
      jarGrad.addColorStop(0, 'rgba(15, 10, 32, 0.64)');
      jarGrad.addColorStop(0.62, 'rgba(24, 16, 50, 0.74)');
      jarGrad.addColorStop(1, 'rgba(15, 25, 40, 0.88)');
    }
    ctx.fillStyle = jarGrad;
    ctx.fill();
    ctx.clip();

    // Animated gently rotating Hakurei Yin-Yang Magic Circle watermark (or Sakuya Pocket-Watch during Time Stop!)
    if (isTimeStop) {
      this.drawSakuyaClockWatermark(ctx, timeStopTimer);
    } else {
      this.drawHakureiMagicWatermark(ctx, time, isFever);
    }

    // Suika golden sake ripples mist inside jar when shrinking
    if (suikaShrinkTimer > 0.02) {
      this.drawSuikaSakeMist(ctx, time, suikaShrinkTimer);
    }

    // Floating sakura petals & golden shrine dust motes
    this.drawAmbient(ctx, isTimeStop ? 0 : time, isFever);

    // Glowing warning pulse near danger line
    if (!isTimeStop && (nearDangerFactor > 0.05 || dangerTimer > 0)) {
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
    this.drawDangerLine(ctx, dangerTimer, nearDangerFactor, time, isTimeStop);

    // 4. Aim Guide & Held Orb Preview
    if (showGuide) {
      this.drawAimGuideAndHeldOrb(
        ctx,
        dropX,
        heldTier,
        canDrop,
        isAiming,
        heldPopProgress,
        predictedLandingY,
        time,
        yukariPickMode
      );
    }

    // 5. All physics plushie orbs rendered via high-DPI cached sprites + live Fumo expressions!
    const globalPanic = !isTimeStop && nearDangerFactor > 0.55;
    for (let i = 0; i < orbs.length; i++) {
      const o = orbs[i];
      const radiusRatio = o.radius / Math.max(1, o.baseRadius);
      let scaleX = radiusRatio;
      let scaleY = radiusRatio;

      if (o.spawnProgress < 1 && o.isMergeBorn) {
        const p = o.spawnProgress;
        const taper = 1 - p * p * p;
        const baseScale = 1 - 0.4 * Math.exp(-2.5 * p) * Math.cos(p * 8.95) * taper;
        const squash = Math.sin(p * Math.PI * 2.2) * (1 - p) * 0.13;
        scaleX *= baseScale * (1 + squash);
        scaleY *= baseScale * (1 - squash * 0.85);
      }

      // Soft velvety springy squash-and-stretch on impacts (gives the 4 plush nub limbs adorable bounce!)
      if (o.impactSquash > 0.01) {
        const imp = Math.sin(o.impactSquash * Math.PI * 1.45) * o.impactSquash * 0.17;
        scaleX *= 1 + imp;
        scaleY *= 1 - imp * 0.84;
      }

      // Determine live Fumo facial expression (normal / blink / panicked ＞﹏＜!)
      const isPanicking = !o.sealed && !isTimeStop && (o.inDanger || globalPanic);
      const faceState: OrbFaceState = isPanicking
        ? 'panic'
        : o.blinkDuration > 0 && !isTimeStop
        ? 'blink'
        : 'normal';

      // Pulsing danger halo behind violating orb
      if (o.inDanger && dangerTimer > 0.05 && !isTimeStop) {
        const pulse = 0.5 + 0.5 * Math.sin(time * 12);
        ctx.save();
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.radius + 5 + pulse * 3.5, 0, TAU);
        ctx.strokeStyle = `rgba(255, 76, 102, ${0.48 + pulse * 0.46})`;
        ctx.lineWidth = 3.2;
        ctx.stroke();
        ctx.restore();
      }

      // Reimu ofuda sealing glow halo
      if (o.sealed) {
        const pulse = 0.5 + 0.5 * Math.sin(time * 24);
        ctx.save();
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.radius + 4 + pulse * 4, 0, TAU);
        ctx.strokeStyle = `rgba(255, 92, 114, ${0.65 + pulse * 0.35})`;
        ctx.lineWidth = 2.8;
        ctx.stroke();
        ctx.restore();
      }

      // Festive aura for Tier 10 Suika Watermelon Plush
      if (o.tier === 10) {
        this.drawSuikaLiveAura(ctx, o.x, o.y, o.radius, time);
      }

      // Blit cached plush sprite with live expression!
      this.blitOrbSprite(
        ctx,
        o.x,
        o.y,
        o.radius,
        o.tier,
        o.angle,
        scaleX,
        scaleY,
        o.flashTimer,
        faceState
      );

      // Animated glistening sweatdrop beside bangs on panicked Fumo plushies!
      if (isPanicking && o.radius >= 18) {
        this.drawLiveSweatdrop(ctx, o.x, o.y, o.radius, o.angle, time, o.id);
      }

      // Yukari target-pick highlight ring
      if (yukariPickMode && !o.sealed) {
        const isHovered = o.id === yukariHoveredOrbId;
        this.drawYukariTargetRing(ctx, o.x, o.y, o.radius, isHovered, time);
      }
    }

    // 6. Yukari Gap Portals & Homing Reimu Ofuda Talismans
    this.drawGapPortals(ctx);
    this.drawOfudas(ctx);

    // 7. Expanding Magic-Circle Shockwaves & Burst Petals/Stars
    this.drawShockwaves(ctx);
    this.drawParticles(ctx);

    // 8. Warm Crimson-Gold Lacquer Shrine Jar Frame (with cool Time-Stop or radiant Fever accents)
    this.drawJarFrame(ctx, dangerTimer, nearDangerFactor, time, isTimeStop, isFever);

    // 9. Active Touhou Mode Status Pills (Time Stop / Yukari Pick / Hyakki Yagyo Fever / First-Drop Hint)
    this.drawStageBanners(
      ctx,
      timeStopTimer,
      timeStopRapidDropsLeft,
      yukariPickMode,
      feverTimer,
      firstDropHintAlpha,
      time
    );

    // 10. Screen flash accent (Deathbomb / Spell cast)
    if (this.screenFlashAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = clamp(this.screenFlashAlpha, 0, 0.5);
      ctx.fillStyle = this.screenFlashColor;
      ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
      ctx.restore();
    }

    // 11. Floating score, combo & spell banners
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
    flash: number,
    faceState: OrbFaceState = 'normal'
  ): void {
    const sprite = this.spriteCache.get(tier, faceState);
    if (!sprite) {
      drawTouhouOrb(ctx, x, y, r, tier, angle, { scaleX, scaleY, flash, faceState });
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
      ctx.arc(0, 0, ORB_TIERS[tier].radius, 0, TAU);
      ctx.fillStyle = `rgba(255, 252, 232, ${flash * 0.52})`;
      ctx.fill();
    }
    ctx.restore();
  }

  private drawLiveSweatdrop(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    angle: number,
    time: number,
    id: number
  ): void {
    const bob = Math.sin(time * 9 + id * 1.7) * Math.max(1.2, r * 0.045);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const sx = r * 0.44;
    const sy = -r * 0.14 + bob;
    const sz = Math.max(3.2, Math.min(9.5, r * 0.11));

    ctx.beginPath();
    ctx.moveTo(sx, sy - sz);
    ctx.bezierCurveTo(sx + sz * 0.8, sy + sz * 0.1, sx + sz * 0.72, sy + sz, sx, sy + sz);
    ctx.bezierCurveTo(sx - sz * 0.72, sy + sz, sx - sz * 0.8, sy + sz * 0.1, sx, sy - sz);
    ctx.closePath();
    ctx.fillStyle = 'rgba(135, 224, 255, 0.92)';
    ctx.fill();
    ctx.strokeStyle = '#2a6bb5';
    ctx.lineWidth = Math.max(0.8, sz * 0.18);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx - sz * 0.2, sy + sz * 0.25, sz * 0.22, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  private drawYukariTargetRing(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    isHovered: boolean,
    time: number
  ): void {
    ctx.save();
    ctx.translate(x, y);
    const pulse = 0.5 + 0.5 * Math.sin(time * 8);
    if (isHovered) {
      ctx.beginPath();
      ctx.arc(0, 0, r + 5 + pulse * 3, 0, TAU);
      ctx.strokeStyle = '#f7d572';
      ctx.lineWidth = 3.2;
      ctx.stroke();

      ctx.rotate(time * 1.8);
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, r + 10, 0, TAU);
      ctx.strokeStyle = '#c48aff';
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, r + 2, 0, TAU);
      ctx.strokeStyle = `rgba(196, 138, 255, ${0.22 + pulse * 0.16})`;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawOfudas(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.ofudas.length; i++) {
      const f = this.ofudas[i];
      const t = clamp(f.progress, 0, 1);
      const pos = evalQuadBezier(f.startX, f.startY, f.ctrlX, f.ctrlY, f.targetX, f.targetY, t);
      const nextPos = evalQuadBezier(
        f.startX,
        f.startY,
        f.ctrlX,
        f.ctrlY,
        f.targetX,
        f.targetY,
        Math.min(1, t + 0.04)
      );
      const heading = Math.atan2(nextPos.y - pos.y, nextPos.x - pos.x);

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(heading + Math.PI * 0.5);

      // Luminous red-gold aura behind ofuda
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 18);
      g.addColorStop(0, 'rgba(255, 110, 130, 0.72)');
      g.addColorStop(1, 'rgba(255, 110, 130, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, TAU);
      ctx.fill();

      // White-crimson shrine paper ofuda card
      roundRectPath(ctx, -6, -11, 12, 22, 2);
      ctx.fillStyle = '#fff9f2';
      ctx.fill();
      ctx.strokeStyle = '#d92641';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Crimson calligraphy strokes inside ofuda
      ctx.strokeStyle = '#d92641';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(0, 7);
      ctx.moveTo(-3, -3.5);
      ctx.lineTo(3, -3.5);
      ctx.moveTo(-2.5, 2);
      ctx.lineTo(2.5, 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawGapPortals(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.gapPortals.length; i++) {
      const gp = this.gapPortals[i];
      const t = gp.life / gp.maxLife;
      const open = t < 0.35 ? t / 0.35 : Math.max(0, 1 - (t - 0.35) / 0.65);
      const halfW = gp.radius * (0.85 + t * 0.4);
      const halfH = gp.radius * 0.55 * open;

      ctx.save();
      ctx.translate(gp.x, gp.y);
      ctx.globalAlpha = clamp(open * 1.15, 0, 1);

      ctx.beginPath();
      ctx.moveTo(-halfW, 0);
      ctx.quadraticCurveTo(0, -halfH, halfW, 0);
      ctx.quadraticCurveTo(0, halfH, -halfW, 0);
      ctx.closePath();
      ctx.fillStyle = '#18052c';
      ctx.fill();
      ctx.strokeStyle = '#d93860';
      ctx.lineWidth = 2.6;
      ctx.stroke();

      // Glowing golden-red Gap eye peering out!
      if (halfH > 5) {
        ctx.fillStyle = '#fff3cc';
        ctx.beginPath();
        ctx.ellipse(0, 0, halfW * 0.28, halfH * 0.52, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#e0284c';
        ctx.beginPath();
        ctx.ellipse(0, 0, halfW * 0.13, halfH * 0.4, 0, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawSakuyaClockWatermark(ctx: CanvasRenderingContext2D, timeStopTimer: number): void {
    const cx = BOARD_WIDTH * 0.5;
    const cy = (JAR_TOP_Y + FLOOR_Y) * 0.5 + 14;
    ctx.save();
    ctx.translate(cx, cy);

    // Translucent silver-gold pocket-watch dial
    ctx.strokeStyle = 'rgba(182, 218, 255, 0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 134, 0, TAU);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(240, 212, 138, 0.16)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, 118, 0, TAU);
    ctx.stroke();

    for (let h = 0; h < 12; h++) {
      const a = (TAU * h) / 12 - Math.PI * 0.5;
      const inner = h % 3 === 0 ? 102 : 110;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      ctx.lineTo(Math.cos(a) * 126, Math.sin(a) * 126);
      ctx.strokeStyle = h % 3 === 0 ? 'rgba(255, 232, 152, 0.34)' : 'rgba(182, 218, 255, 0.22)';
      ctx.lineWidth = h % 3 === 0 ? 2.4 : 1.2;
      ctx.stroke();
    }

    // Countdown progress arc around clock rim
    const ratio = clamp(timeStopTimer / 4.0, 0, 1);
    ctx.beginPath();
    ctx.arc(0, 0, 134, -Math.PI * 0.5, -Math.PI * 0.5 + TAU * ratio);
    ctx.strokeStyle = 'rgba(170, 224, 255, 0.52)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Ornate stopped clock hands
    const handAngle = -Math.PI * 0.5 + (1 - ratio) * TAU;
    ctx.strokeStyle = 'rgba(255, 236, 168, 0.42)';
    ctx.lineCap = 'round';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(handAngle) * 92, Math.sin(handAngle) * 92);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(0.6) * 58, Math.sin(0.6) * 58);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 236, 168, 0.48)';
    ctx.beginPath();
    ctx.arc(0, 0, 5.5, 0, TAU);
    ctx.fill();

    ctx.restore();
  }

  private drawSuikaSakeMist(ctx: CanvasRenderingContext2D, time: number, shrinkTimer: number): void {
    const alpha = clamp(shrinkTimer / 0.8, 0, 1) * 0.22;
    const g = ctx.createLinearGradient(0, FLOOR_Y, 0, JAR_TOP_Y + 120);
    g.addColorStop(0, `rgba(255, 224, 102, ${alpha})`);
    g.addColorStop(0.5, `rgba(82, 224, 138, ${alpha * 0.55})`);
    g.addColorStop(1, 'rgba(255, 224, 102, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(INNER_LEFT, JAR_TOP_Y, INNER_WIDTH, FLOOR_Y - JAR_TOP_Y);

    ctx.strokeStyle = `rgba(255, 232, 132, ${alpha * 1.4})`;
    ctx.lineWidth = 1.6;
    for (let k = 0; k < 3; k++) {
      const y = FLOOR_Y - 50 - ((time * 90 + k * 140) % 380);
      ctx.beginPath();
      ctx.moveTo(INNER_LEFT + 20, y);
      ctx.quadraticCurveTo(BOARD_WIDTH * 0.5, y - 14, INNER_RIGHT - 20, y);
      ctx.stroke();
    }
  }

  private drawStageBanners(
    ctx: CanvasRenderingContext2D,
    timeStopTimer: number,
    timeStopRapidDropsLeft: number,
    yukariPickMode: boolean,
    feverTimer: number,
    firstDropHintAlpha: number,
    time: number
  ): void {
    let bannerY = JAR_TOP_Y + 18;

    if (timeStopTimer > 0.02) {
      const text = `⏱ The World · ${timeStopTimer.toFixed(1)}s · 速投 ${timeStopRapidDropsLeft}`;
      this.drawCompactTopPill(ctx, BOARD_WIDTH * 0.5, bannerY, text, 'rgba(18, 34, 66, 0.9)', '#9fd2ff', '#eaf5ff');
      bannerY += 28;
    }

    if (yukariPickMode) {
      const pulse = 0.72 + 0.28 * Math.sin(time * 7);
      this.drawCompactTopPill(
        ctx,
        BOARD_WIDTH * 0.5,
        bannerY,
        '👁 点选布偶进行隙间互换 · 右键/Esc取消',
        'rgba(38, 14, 66, 0.92)',
        `rgba(247, 213, 114, ${pulse})`,
        '#fff4d6'
      );
      bannerY += 28;
    }

    if (feverTimer > 0.02) {
      const pulse = 0.75 + 0.25 * Math.sin(time * 8);
      this.drawCompactTopPill(
        ctx,
        BOARD_WIDTH * 0.5,
        bannerY,
        `🏮 百鬼夜行 2× · ${feverTimer.toFixed(1)}s`,
        'rgba(58, 22, 14, 0.9)',
        `rgba(255, 224, 102, ${pulse})`,
        '#ffe98a'
      );
    }

    // Light non-blocking floating hint before first drop (replaces verbose Start Modal!)
    if (firstDropHintAlpha > 0.02) {
      ctx.save();
      ctx.globalAlpha = clamp(firstDropHintAlpha, 0, 1);
      const hintY = (JAR_TOP_Y + FLOOR_Y) * 0.5 + Math.sin(time * 2.6) * 3;
      this.drawCompactTopPill(
        ctx,
        BOARD_WIDTH * 0.5,
        hintY,
        '点击 / 空格投放 · E 符卡 · Shift 隙间',
        'rgba(22, 14, 44, 0.84)',
        'rgba(245, 202, 98, 0.58)',
        '#fff2cc'
      );
      ctx.restore();
    }
  }

  private drawCompactTopPill(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    text: string,
    bg: string,
    border: string,
    fg: string
  ): void {
    ctx.save();
    ctx.font = '700 11.5px "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
    const w = Math.min(INNER_WIDTH - 24, ctx.measureText(text).width + 24);
    const h = 24;
    roundRectPath(ctx, cx - w * 0.5, cy - h * 0.5, w, h, 12);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = border;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, cy + 0.5);
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

  private drawHakureiMagicWatermark(
    ctx: CanvasRenderingContext2D,
    time: number,
    isFever: boolean
  ): void {
    const cx = BOARD_WIDTH * 0.5;
    const cy = (JAR_TOP_Y + FLOOR_Y) * 0.5 + 14;
    const boost = isFever ? 1.85 : 1;
    ctx.save();
    ctx.translate(cx, cy);

    ctx.save();
    ctx.rotate(time * (isFever ? 0.28 : 0.11));
    ctx.strokeStyle = `rgba(245, 202, 98, ${0.085 * boost})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, 132, 0, TAU);
    ctx.stroke();

    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, 122, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);

    for (let i = 0; i < 8; i++) {
      const a = (TAU * i) / 8;
      const c = Math.cos(a);
      const s = Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(c * 100, s * 100);
      ctx.lineTo(c * 132, s * 132);
      ctx.stroke();

      ctx.fillStyle =
        i % 2 === 0
          ? `rgba(235, 64, 88, ${0.11 * boost})`
          : `rgba(245, 202, 98, ${0.11 * boost})`;
      ctx.beginPath();
      ctx.arc(c * 114, s * 114, 3.2, 0, TAU);
      ctx.fill();
    }

    ctx.strokeStyle = `rgba(245, 202, 98, ${0.055 * boost})`;
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

    ctx.save();
    ctx.rotate(-time * (isFever ? 0.34 : 0.16));
    ctx.strokeStyle = `rgba(245, 202, 98, ${0.09 * boost})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, 74, 0, TAU);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -37, 37, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.arc(0, 37, 37, -Math.PI * 0.5, Math.PI * 0.5, true);
    ctx.stroke();

    ctx.fillStyle = `rgba(235, 64, 88, ${0.08 * boost})`;
    ctx.beginPath();
    ctx.arc(0, -37, 10.5, 0, TAU);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = `rgba(255, 240, 200, ${0.08 * boost})`;
    ctx.beginPath();
    ctx.arc(0, 37, 10.5, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  private drawAmbient(ctx: CanvasRenderingContext2D, time: number, isFever: boolean): void {
    for (let i = 0; i < this.ambient.length; i++) {
      const a = this.ambient[i];
      const swayX = Math.sin(time * a.swayFreq + a.phase) * a.swayAmp;
      ctx.save();
      ctx.translate(a.x + swayX, a.y);

      if (a.kind === 'star') {
        const twinkle = 0.55 + 0.45 * Math.sin(time * 2.8 + i);
        ctx.rotate(a.angle);
        ctx.fillStyle = `rgba(255, 232, 148, ${a.alpha * twinkle * (isFever ? 1.6 : 1)})`;
        drawStarPath(ctx, 0, 0, 4, a.size, a.size * 0.36);
        ctx.fill();
      } else if (a.kind === 'dust') {
        const pulse = 0.5 + 0.5 * Math.sin(time * 2.1 + a.phase);
        ctx.fillStyle = `rgba(255, 218, 138, ${a.alpha * pulse * (isFever ? 1.5 : 1)})`;
        ctx.beginPath();
        ctx.arc(0, 0, a.size, 0, TAU);
        ctx.fill();
      } else {
        ctx.rotate(a.angle);
        ctx.fillStyle = isFever
          ? `rgba(255, 218, 128, ${a.alpha * 1.45})`
          : `rgba(255, 184, 212, ${a.alpha})`;
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
    time: number,
    isTimeStop: boolean
  ): void {
    const active = dangerTimer > 0.02 && !isTimeStop;
    const ratio = clamp(dangerTimer / DANGER_GRACE_SECONDS, 0, 1);
    const pulse = active
      ? 0.55 + 0.45 * Math.sin(time * (7 + ratio * 10))
      : nearDangerFactor > 0.1
      ? 0.45 + 0.55 * Math.sin(time * 5.2)
      : 0.35;

    ctx.save();
    if (active || (!isTimeStop && nearDangerFactor > 0.1)) {
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
    ctx.strokeStyle = isTimeStop
      ? 'rgba(155, 205, 255, 0.42)'
      : active
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
      ctx.fillStyle = isTimeStop
        ? 'rgba(175, 218, 255, 0.62)'
        : nearDangerFactor > 0.2
        ? `rgba(255, 198, 125, ${0.55 + pulse * 0.35})`
        : 'rgba(240, 194, 89, 0.46)';
      ctx.font = '600 9.5px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(isTimeStop ? '警戒静止' : '结界警戒线', INNER_RIGHT - 8, DANGER_Y - 3);
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
    time: number,
    yukariPickMode: boolean
  ): void {
    const def = ORB_TIERS[heldTier];
    const r = def.radius;

    ctx.save();
    if (!yukariPickMode) {
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

      if (canDrop && landingY > SPAWN_Y + r) {
        ctx.beginPath();
        ctx.arc(dropX, landingY, r, 0, TAU);
        ctx.strokeStyle = isAiming ? 'rgba(255, 232, 148, 0.34)' : 'rgba(255, 232, 148, 0.19)';
        ctx.lineWidth = isAiming ? 1.8 : 1.4;
        ctx.setLineDash([4, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Golden dropper rail
    ctx.beginPath();
    ctx.moveTo(INNER_LEFT + 14, 16);
    ctx.lineTo(INNER_RIGHT - 14, 16);
    ctx.strokeStyle = yukariPickMode ? 'rgba(196, 138, 255, 0.45)' : 'rgba(240, 194, 89, 0.26)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pointer notch on rail
    ctx.beginPath();
    ctx.moveTo(dropX - 6.5, 11);
    ctx.lineTo(dropX + 6.5, 11);
    ctx.lineTo(dropX, 20.5);
    ctx.closePath();
    ctx.fillStyle = yukariPickMode
      ? '#d5a3ff'
      : canDrop
      ? '#ffd966'
      : 'rgba(240, 194, 89, 0.38)';
    ctx.fill();

    // Purple Gap aura around held orb during Yukari target-pick mode
    if (yukariPickMode) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 8);
      ctx.beginPath();
      ctx.arc(dropX, SPAWN_Y, r + 6 + pulse * 3, 0, TAU);
      ctx.strokeStyle = 'rgba(213, 163, 255, 0.78)';
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }

    const p = clamp(heldPopProgress, 0, 1);
    const springScale =
      p >= 1
        ? 1
        : 1 - 0.62 * Math.exp(-3.4 * p) * Math.cos(p * Math.PI * 2.35) * (1 - p * p);
    const scale = canDrop || yukariPickMode ? springScale : Math.max(0.45, springScale * 0.78);
    const bob = (canDrop || yukariPickMode) && p > 0.7 ? Math.sin(time * 4.2) * 1.6 : 0;

    ctx.globalAlpha = canDrop || yukariPickMode ? clamp(0.25 + p * 0.75, 0, 1) : 0.45;
    this.blitOrbSprite(ctx, dropX, SPAWN_Y + bob, r, heldTier, 0, scale, scale, 0, 'normal');
    ctx.restore();
  }

  private drawJarFrame(
    ctx: CanvasRenderingContext2D,
    dangerTimer: number,
    nearDangerFactor: number,
    time: number,
    isTimeStop: boolean,
    isFever: boolean
  ): void {
    ctx.save();
    const isDanger = dangerTimer > 0.05 && !isTimeStop;
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

    // 2. Lacquer shrine frame gradient (shifts gracefully for Time Stop / Fever / Danger)
    const lacquerGrad = ctx.createLinearGradient(leftX, topY, rightX, botY);
    if (isTimeStop) {
      lacquerGrad.addColorStop(0, '#5a8ad4');
      lacquerGrad.addColorStop(0.5, '#33548c');
      lacquerGrad.addColorStop(1, '#5a8ad4');
    } else if (isDanger) {
      lacquerGrad.addColorStop(0, `rgba(255, 68, 96, ${0.78 + dangerPulse * 0.22})`);
      lacquerGrad.addColorStop(0.5, '#c91c38');
      lacquerGrad.addColorStop(1, `rgba(255, 68, 96, ${0.78 + dangerPulse * 0.22})`);
    } else if (isFever) {
      lacquerGrad.addColorStop(0, '#e68c2e');
      lacquerGrad.addColorStop(0.5, '#c92e3b');
      lacquerGrad.addColorStop(1, '#e68c2e');
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

    // 3. Inner metallic gold-leaf / silver inlay strip
    const goldGrad = ctx.createLinearGradient(leftX, topY, rightX, botY);
    if (isTimeStop) {
      goldGrad.addColorStop(0, '#e3f1ff');
      goldGrad.addColorStop(0.5, '#8ab8f0');
      goldGrad.addColorStop(1, '#e3f1ff');
    } else {
      goldGrad.addColorStop(0, isDanger ? '#ffb3c0' : '#ffe699');
      goldGrad.addColorStop(0.5, isDanger ? '#ff6e88' : isFever ? '#fff0a3' : '#e0a93e');
      goldGrad.addColorStop(1, isDanger ? '#ffb3c0' : '#ffe699');
    }
    traceUFrame();
    ctx.strokeStyle = goldGrad;
    ctx.lineWidth = isFever ? 3.2 : 2.4;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 4. Metallic Gold Corner Clasps (金具)
    this.drawCornerClasp(ctx, leftX, botY, rad, 1);
    this.drawCornerClasp(ctx, rightX, botY, rad, -1);

    // 5. Sculpted Torii-style Crimson & Gold Top Pillar Caps + tiny shide charms
    const sway = isTimeStop ? 0 : Math.sin(time * 2.2) * 0.08;
    for (const side of [-1, 1]) {
      const capX = side < 0 ? leftX : rightX;
      ctx.fillStyle = '#871022';
      roundRectPath(ctx, capX - 7.5, topY - 1, 15, 6, 2);
      ctx.fill();
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
    leftGlass.addColorStop(0, 'rgba(255, 255, 255, 0.10)');
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
        ctx.beginPath();
        ctx.arc(0, 0, s.radius, 0, TAU);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.lineWidth;
        ctx.stroke();

        const innerR = s.radius * 0.82;
        ctx.beginPath();
        ctx.arc(0, 0, innerR, 0, TAU);
        ctx.strokeStyle = '#fff5cc';
        ctx.lineWidth = Math.max(1, s.lineWidth * 0.45);
        ctx.stroke();

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

      ctx.font = '900 18px "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(14, 10, 30, 0.88)';
      ctx.strokeText(f.text, 0, 0);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, 0, 0);

      if (f.subText) {
        ctx.font = '800 12.5px "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = 'rgba(14, 10, 30, 0.92)';
        ctx.strokeText(f.subText, 0, -19);
        ctx.fillStyle = '#ffe680';
        ctx.fillText(f.subText, 0, -19);
      }
      ctx.restore();
    }
  }
}

function evalQuadBezier(
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  t: number
): { x: number; y: number } {
  const u = 1 - t;
  return {
    x: u * u * x0 + 2 * u * t * cx + t * t * x1,
    y: u * u * y0 + 2 * u * t * cy + t * t * y1,
  };
}

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
