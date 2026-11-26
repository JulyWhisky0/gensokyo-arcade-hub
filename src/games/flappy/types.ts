export type CharacterId = 'aya' | 'reimu' | 'cirno';

export interface CharacterConfig {
  id: CharacterId;
  name: string;
  title: string;
  englishName: string;
  tagline: string;
  skillName: string;
  skillCardTitle: string;
  skillIcon: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  trailType: 'maple' | 'sakura' | 'snowflake';
}

export const CHARACTERS: readonly CharacterConfig[] = [
  {
    id: 'aya',
    name: '射命丸文',
    title: '传统幻想鸦天狗',
    englishName: 'Aya Shameimaru',
    tagline: '幻想风靡·冲刺破柱',
    skillName: '幻想风靡',
    skillCardTitle: '疾风「幻想风靡」',
    skillIcon: '✦',
    primaryColor: '#d9383a',
    secondaryColor: '#1e2230',
    accentColor: '#f5b841',
    trailType: 'maple',
  },
  {
    id: 'reimu',
    name: '博丽灵梦',
    title: '乐园的巫女',
    englishName: 'Reimu Hakurei',
    tagline: '小判定·决死结界',
    skillName: '决死结界',
    skillCardTitle: '结界「阴阳玉」',
    skillIcon: '☯',
    primaryColor: '#e03e52',
    secondaryColor: '#fff6f6',
    accentColor: '#f7c95c',
    trailType: 'sakura',
  },
  {
    id: 'cirno',
    name: '琪露诺',
    title: '冰之妖精',
    englishName: 'Cirno',
    tagline: '完美冻结·慢动作',
    skillName: '完美冻结',
    skillCardTitle: '冰符「完美冻结」',
    skillIcon: '❄',
    primaryColor: '#4cc9f0',
    secondaryColor: '#2563eb',
    accentColor: '#d8f6ff',
    trailType: 'snowflake',
  },
] as const;

export const CHARACTER_MAP: Record<CharacterId, CharacterConfig> = {
  aya: CHARACTERS[0],
  reimu: CHARACTERS[1],
  cirno: CHARACTERS[2],
};

export type GamePhase = 'ready' | 'playing' | 'paused' | 'dying' | 'gameover';

export type ObstacleStyle = 'bamboo' | 'torii';

export interface PipeObstacle {
  id: number;
  x: number;
  prevX: number;
  width: number;
  gapY: number;
  gapHeight: number;
  passed: boolean;
  style: ObstacleStyle;
  lanternPhase: number;
  grazedTop: boolean;
  grazedBottom: boolean;
  topShattered: boolean;
  bottomShattered: boolean;
}

export type DanmakuColor = 'scarlet' | 'gold';

export interface DanmakuOrb {
  id: number;
  x: number;
  prevX: number;
  y: number;
  prevY: number;
  baseY: number;
  vx: number;
  ampY: number;
  freqY: number;
  phase: number;
  radius: number;
  color: DanmakuColor;
  grazed: boolean;
  shattered: boolean;
}

export interface PlayerAfterimage {
  x: number;
  y: number;
  rotation: number;
  alpha: number;
  character: CharacterId;
}

export interface StarCollectible {
  id: number;
  x: number;
  prevX: number;
  baseY: number;
  y: number;
  prevY: number;
  radius: number;
  kind: 'power' | 'faith';
  collected: boolean;
  bobPhase: number;
  spin: number;
}

export type ParticleKind =
  | 'maple'
  | 'sakura'
  | 'snowflake'
  | 'iceCrystal'
  | 'feather'
  | 'sparkle'
  | 'ring'
  | 'airRing'
  | 'starBurst'
  | 'wind'
  | 'windRibbon'
  | 'grazeSpark'
  | 'bambooShard'
  | 'toriiShard'
  | 'talisman'
  | 'frostRing';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  vRot: number;
  life: number;
  maxLife: number;
  color: string;
  secondaryColor: string;
  kind: ParticleKind;
  gravity: number;
  drag: number;
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  strokeColor: string;
  scale: number;
  life: number;
  maxLife: number;
}

export interface MedalInfo {
  tier: 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';
  label: string;
  subtitle: string;
  color: string;
  rimColor: string;
  glowColor: string;
}

export function getMedalForScore(score: number): MedalInfo {
  if (score >= 50) {
    return {
      tier: 'platinum',
      label: '幻想乡白金',
      subtitle: '天狗速报头版奇迹！',
      color: '#e6f7ff',
      rimColor: '#9b7bff',
      glowColor: 'rgba(167, 139, 250, 0.75)',
    };
  }
  if (score >= 30) {
    return {
      tier: 'gold',
      label: '金牌',
      subtitle: '博丽神社特等嘉奖',
      color: '#ffd65c',
      rimColor: '#d97706',
      glowColor: 'rgba(251, 191, 36, 0.65)',
    };
  }
  if (score >= 15) {
    return {
      tier: 'silver',
      label: '银牌',
      subtitle: '迷途竹林疾风名手',
      color: '#e2e8f0',
      rimColor: '#64748b',
      glowColor: 'rgba(203, 213, 225, 0.6)',
    };
  }
  if (score >= 5) {
    return {
      tier: 'bronze',
      label: '铜牌',
      subtitle: '初露锋芒的幻想飞客',
      color: '#e59866',
      rimColor: '#92400e',
      glowColor: 'rgba(217, 119, 6, 0.5)',
    };
  }
  return {
    tier: 'none',
    label: '见习飞客',
    subtitle: '再接再厉，突破 5 分获铜牌',
    color: '#64748b',
    rimColor: '#334155',
    glowColor: 'rgba(100, 116, 139, 0.3)',
  };
}

export interface SkyPhaseLabel {
  id: 'dawn' | 'twilight' | 'scarlet';
  name: string;
  banner: string;
}

export function getSkyPhaseForScore(score: number): SkyPhaseLabel {
  if (score >= 30) {
    return { id: 'scarlet', name: '红魔异变', banner: '红魔异变 · 绯月夜空' };
  }
  if (score >= 15) {
    return { id: 'twilight', name: '黄昏幻想', banner: '黄昏降临 · 妖怪之山' };
  }
  return { id: 'dawn', name: '黎明竹林', banner: '黎明破晓 · 迷途竹林' };
}

export interface PlayerState {
  x: number;
  y: number;
  prevY: number;
  vy: number;
  rotation: number;
  prevRotation: number;
  rotVelocity: number;
  scaleX: number;
  scaleY: number;
  scaleVelX: number;
  scaleVelY: number;
  wingPhase: number;
  wingBoost: number;
  flapGlow: number;
  scarfWave: number;
  orbAngle: number;
  radius: number;
  dizzyTime: number;
  blinkTimer: number;
  blinkDuration: number;
  determinedTimer: number;
  grazeFlash: number;
  invincibleTimer: number;
}

export interface RenderState {
  phase: GamePhase;
  character: CharacterId;
  player: PlayerState;
  pipes: PipeObstacle[];
  stars: StarCollectible[];
  danmaku: DanmakuOrb[];
  afterimages: PlayerAfterimage[];
  particles: Particle[];
  particleCount: number;
  floatingTexts: FloatingText[];
  score: number;
  bestScore: number;
  pipesCleared: number;
  starsCollected: number;
  grazeCount: number;
  spiritGauge: number; // 0..100
  ayaDashTimer: number;
  cirnoFreezeTimer: number;
  reimuBarrierTimer: number;
  reimuBarrierX: number;
  reimuBarrierY: number;
  skyProgress: number; // 0 = Dawn, 1 = Golden Sunset, 2 = Scarlet Mist Night
  scrollDistance: number;
  prevScrollDistance: number;
  interpAlpha: number;
  speed: number;
  elapsed: number;
  flashAlpha: number;
  shakeTime: number;
  shakeIntensity: number;
  phaseBannerText: string;
  phaseBannerTimer: number;
  spellBannerText: string;
  spellBannerTimer: number;
  spellBannerColor: string;
}

// Wider scenic Gensokyo stage for generous horizontal sightline & parallax vista
export const STAGE_WIDTH = 520;
export const STAGE_HEIGHT = 640;
export const GROUND_HEIGHT = 86;
export const PLAYABLE_HEIGHT = STAGE_HEIGHT - GROUND_HEIGHT;

export const MAX_PARTICLES = 240;

export const PHYSICS = {
  FIXED_DT: 1 / 120,
  FLAP_BUFFER_WINDOW: 0.08, // 80ms crisp flap input buffer
  FLAP_COOLDOWN: 0.042, // prevents accidental double-fire while keeping rapid taps razor-sharp
  PLAYER_X: 138,
  PLAYER_START_Y: 264,
  HITBOX_RADIUS: 12.2, // forgiving slightly-inset circular hitbox
  REIMU_HITBOX_SCALE: 0.85,
  REIMU_MAGNET_RADIUS: 145,
  REIMU_INVINCIBLE_DURATION: 0.9,
  REIMU_BARRIER_VISUAL_DURATION: 0.65,
  AYA_DASH_DURATION: 0.45,
  AYA_DASH_GRACE_INVINCIBLE: 0.22,
  AYA_DASH_SPEED_MULT: 2.85,
  CIRNO_FREEZE_DURATION: 2.5,
  CIRNO_TIME_SCALE: 0.45,
  GRAZE_HALO: 20,
  GRAZE_SPIRIT: 18,
  PIPE_SPIRIT: 12,
  STAR_SPIRIT: 18,
  GRAVITY: 1410,
  FLAP_VELOCITY: -430,
  MAX_FALL_SPEED: 555,
  BASE_SPEED: 164,
  MAX_SPEED: 212,
  BASE_GAP: 154,
  MIN_GAP: 128,
  PIPE_WIDTH: 66,
  PIPE_CAP_OVERHANG: 6,
  PIPE_CAP_HEIGHT: 25,
  BASE_PIPE_SPACING: 248,
  MIN_PIPE_SPACING: 222,
  MIN_GAP_Y: 112,
  MAX_GAP_Y: PLAYABLE_HEIGHT - 112,
  MAX_GAP_DELTA: 148,
  HITSTOP_DURATION: 0.08,
} as const;
