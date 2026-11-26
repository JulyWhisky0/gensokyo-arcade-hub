export const COLS = 6;
export const VISIBLE_ROWS = 12;
export const HIDDEN_ROWS = 1;
export const TOTAL_ROWS = VISIBLE_ROWS + HIDDEN_ROWS; // 13 rows total: row 0 hidden buffer, rows 1..12 visible
export const DEATH_COL = 2;
export const DEATH_ROW = HIDDEN_ROWS; // Top visible row (row index 1)

export type PuyoColor = 0 | 1 | 2 | 3 | 4;

export type DifficultyId = 'easy' | 'normal' | 'lunatic';

export interface DifficultyConfig {
  id: DifficultyId;
  name: string;
  shortLabel: string;
  subtitle: string;
  colorCount: 4 | 5;
  baseGravityMs: number;
  minGravityMs: number;
  speedStepEvery: number; // pieces dropped per speed level
  speedDecayFactor: number;
  badgeColor: string;
}

export const DIFFICULTIES: Record<DifficultyId, DifficultyConfig> = {
  easy: {
    id: 'easy',
    name: '初窥魔法',
    shortLabel: 'Easy · 4色',
    subtitle: '4色灵珠 · 舒缓下落 · 适合练习连锁',
    colorCount: 4,
    baseGravityMs: 780,
    minGravityMs: 220,
    speedStepEvery: 18,
    speedDecayFactor: 0.91,
    badgeColor: '#26b868',
  },
  normal: {
    id: 'normal',
    name: '幻想异变',
    shortLabel: 'Normal · 4色加速',
    subtitle: '4色灵珠 · 节奏加速 · 经典竞技手感',
    colorCount: 4,
    baseGravityMs: 580,
    minGravityMs: 115,
    speedStepEvery: 12,
    speedDecayFactor: 0.87,
    badgeColor: '#f5b82e',
  },
  lunatic: {
    id: 'lunatic',
    name: '红雾狂宴',
    shortLabel: 'Lunatic · 5色',
    subtitle: '5色灵珠 · 高速魔力 · 帕秋莉秘法参战',
    colorCount: 5,
    baseGravityMs: 470,
    minGravityMs: 85,
    speedStepEvery: 10,
    speedDecayFactor: 0.85,
    badgeColor: '#b45ef5',
  },
};

export interface PuyoTheme {
  id: PuyoColor;
  name: string;
  character: string;
  motif: 'yinyang' | 'crystal' | 'star' | 'leaf' | 'moon';
  base: string;
  light: string;
  dark: string;
  rim: string;
  glow: string;
  particle: string;
}

export const PUYO_THEMES: readonly PuyoTheme[] = [
  {
    id: 0,
    name: '阴阳红',
    character: '博丽灵梦',
    motif: 'yinyang',
    base: '#e53950',
    light: '#ff9cab',
    dark: '#961529',
    rim: '#590916',
    glow: 'rgba(255, 76, 102, 0.55)',
    particle: '#ff7084',
  },
  {
    id: 1,
    name: '冰晶蓝',
    character: '琪露诺',
    motif: 'crystal',
    base: '#1ea7f2',
    light: '#a8ecff',
    dark: '#0f5c9c',
    rim: '#07325c',
    glow: 'rgba(64, 206, 255, 0.55)',
    particle: '#7de4ff',
  },
  {
    id: 2,
    name: '星辰金',
    character: '雾雨魔理沙',
    motif: 'star',
    base: '#f2b724',
    light: '#fff3a1',
    dark: '#a86908',
    rim: '#5c3600',
    glow: 'rgba(255, 212, 71, 0.55)',
    particle: '#ffe36e',
  },
  {
    id: 3,
    name: '疾风绿',
    character: '东风谷早苗',
    motif: 'leaf',
    base: '#24bd6b',
    light: '#9cf7c2',
    dark: '#0d703b',
    rim: '#063d20',
    glow: 'rgba(66, 230, 138, 0.55)',
    particle: '#79f0aa',
  },
  {
    id: 4,
    name: '秘法紫',
    character: '帕秋莉',
    motif: 'moon',
    base: '#9b4ee6',
    light: '#e2bdff',
    dark: '#571e96',
    rim: '#2f0c57',
    glow: 'rgba(186, 117, 255, 0.55)',
    particle: '#d099ff',
  },
] as const;

export interface SpellCardBanner {
  chain: number;
  title: string;
  caster: string;
  primaryColor: string;
  secondaryColor: string;
  motif: PuyoTheme['motif'];
  timer: number;
  duration: number;
}

export interface SpellCardSpec {
  title: string;
  caster: string;
  primaryColor: string;
  secondaryColor: string;
  motif: PuyoTheme['motif'];
}

export function getSpellCardForChain(chain: number): SpellCardSpec | null {
  if (chain < 2) return null;
  if (chain === 2) {
    return {
      title: '恋符「非定向光线」',
      caster: '雾雨魔理沙',
      primaryColor: '#f5b82e',
      secondaryColor: '#fff0a6',
      motif: 'star',
    };
  }
  if (chain === 3) {
    return {
      title: '冰符「完美冻结」',
      caster: '琪露诺',
      primaryColor: '#29b6f6',
      secondaryColor: '#c7f4ff',
      motif: 'crystal',
    };
  }
  if (chain === 4) {
    return {
      title: '灵符「梦想封印」',
      caster: '博丽灵梦',
      primaryColor: '#e83b54',
      secondaryColor: '#ffd4a3',
      motif: 'yinyang',
    };
  }
  if (chain === 5) {
    return {
      title: '魔炮「极限火花!!」',
      caster: '雾雨魔理沙',
      primaryColor: '#ff7043',
      secondaryColor: '#fff59d',
      motif: 'star',
    };
  }
  if (chain === 6) {
    return {
      title: '七曜「贤者之石!!」',
      caster: '帕秋莉·诺蕾姬',
      primaryColor: '#a855f7',
      secondaryColor: '#f0abfc',
      motif: 'moon',
    };
  }
  return {
    title: '秘仪「幻想乡大结界!!!」',
    caster: '博丽灵梦 · 极彩',
    primaryColor: '#f43f5e',
    secondaryColor: '#fde047',
    motif: 'yinyang',
  };
}

export interface GridCell {
  color: PuyoColor;
  squish: number; // 0..1.4 remaining damped-spring wobble energy
  squishPhase: number;
  squishFreq: number; // spring angular speed for varied organic feel
}

export interface PuyoPairColors {
  pivot: PuyoColor;
  child: PuyoColor;
}

/** Rotation index: 0=Up, 1=Right, 2=Down, 3=Left */
export type RotationIndex = 0 | 1 | 2 | 3;

export const ROTATION_OFFSETS: readonly [number, number][] = [
  [0, -1], // 0: child above pivot
  [1, 0],  // 1: child right of pivot
  [0, 1],  // 2: child below pivot
  [-1, 0], // 3: child left of pivot
];

export interface ActivePair {
  pivotCol: number;
  pivotRow: number;
  rot: RotationIndex;
  pivotColor: PuyoColor;
  childColor: PuyoColor;
  fallFrac: number; // 0..1 sub-cell vertical offset
  lockTimer: number; // ms spent grounded
  lockResets: number;
  softDropGroundMs: number; // ms holding down while grounded for crisp soft-drop lock
  // Smooth visual interpolation fields
  renderCol: number;
  renderRow: number; // smooth continuous vertical row (interpolates kicks & spawn)
  renderAngle: number; // radians: 0 = Up, PI/2 = Right, PI = Down, -PI/2 = Left
  targetAngle: number;
  quickTurnTimer: number; // ms window to trigger 180 flip when squeezed
  bumpOffsetX: number; // visual bounce when wall-blocked
  touchSquish: number; // 0..1 subtle elastic squish when landing/rotating while grounded
  touchSquishPhase: number;
  wasGrounded: boolean;
}

export interface FallingPuyo {
  col: number;
  color: PuyoColor;
  startRow: number;
  targetRow: number;
  y: number;
  vy: number;
}

export interface ClearingCell {
  col: number;
  row: number;
  color: PuyoColor;
}

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
  shape: 'dot' | 'star' | 'ring' | 'diamond';
  rotation: number;
  vRot: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  subText?: string;
  color: string;
  life: number;
  maxLife: number;
  scale: number;
}

export interface DropTrail {
  col: number;
  fromRow: number;
  toRow: number;
  color: string;
  life: number;
  maxLife: number;
}

export type GamePhase =
  | 'menu'
  | 'falling'
  | 'dropping'
  | 'clearing'
  | 'gameover';

export interface HudSnapshot {
  phase: GamePhase;
  score: number;
  bestScore: number;
  chain: number;
  maxChain: number;
  speedLevel: number;
  totalCleared: number;
  allClears: number;
  difficulty: DifficultyId;
  paused: boolean;
  isNewBest: boolean;
}
