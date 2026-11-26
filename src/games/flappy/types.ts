export type CharacterId = 'aya' | 'reimu' | 'cirno';

export interface CharacterConfig {
  id: CharacterId;
  name: string;
  title: string;
  englishName: string;
  tagline: string;
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
    tagline: '疾风乌翼 · 红叶尾迹',
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
    tagline: '阴阳玉随行 · 樱吹雪',
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
    tagline: '冰晶六翼 · 细雪结晶',
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
  width: number;
  gapY: number;
  gapHeight: number;
  passed: boolean;
  style: ObstacleStyle;
  lanternPhase: number;
}

export interface StarCollectible {
  id: number;
  x: number;
  baseY: number;
  y: number;
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
  | 'feather'
  | 'sparkle'
  | 'ring'
  | 'starBurst'
  | 'wind';

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
  secondaryColor?: string;
  kind: ParticleKind;
  gravity: number;
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
  vy: number;
  rotation: number;
  wingPhase: number;
  wingBoost: number;
  orbAngle: number;
  radius: number;
  dizzyTime: number;
}

export interface RenderState {
  phase: GamePhase;
  character: CharacterId;
  player: PlayerState;
  pipes: PipeObstacle[];
  stars: StarCollectible[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  score: number;
  bestScore: number;
  pipesCleared: number;
  starsCollected: number;
  skyProgress: number; // 0 = Dawn, 1 = Twilight, 2 = Scarlet Mist Night
  scrollDistance: number;
  speed: number;
  elapsed: number;
  flashAlpha: number;
  shakeTime: number;
  shakeIntensity: number;
  phaseBannerText: string;
  phaseBannerTimer: number;
}

export const STAGE_WIDTH = 420;
export const STAGE_HEIGHT = 640;
export const GROUND_HEIGHT = 84;
export const PLAYABLE_HEIGHT = STAGE_HEIGHT - GROUND_HEIGHT;

export const PHYSICS = {
  PLAYER_X: 118,
  PLAYER_START_Y: 266,
  HITBOX_RADIUS: 12.5,
  GRAVITY: 1420,
  FLAP_VELOCITY: -432,
  MAX_FALL_SPEED: 560,
  BASE_SPEED: 162,
  MAX_SPEED: 208,
  BASE_GAP: 154,
  MIN_GAP: 128,
  PIPE_WIDTH: 64,
  PIPE_CAP_OVERHANG: 5,
  PIPE_CAP_HEIGHT: 24,
  BASE_PIPE_SPACING: 234,
  MIN_PIPE_SPACING: 218,
  MIN_GAP_Y: 112,
  MAX_GAP_Y: PLAYABLE_HEIGHT - 112,
  MAX_GAP_DELTA: 150,
  HITSTOP_DURATION: 0.085,
} as const;
