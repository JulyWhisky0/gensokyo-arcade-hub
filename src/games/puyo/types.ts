export const COLS = 6;
export const VISIBLE_ROWS = 12;
export const HIDDEN_ROWS = 1;
export const TOTAL_ROWS = VISIBLE_ROWS + HIDDEN_ROWS; // 13 rows total: row 0 hidden buffer, rows 1..12 visible
export const DEATH_COL = 2;
export const DEATH_ROW = HIDDEN_ROWS; // Top visible row (row index 1)
export const BUFFER_PEEK_CELLS = 0.55;
export const BOSS_BANNER_CELLS = 1.9;
export const BOSS_PORTRAIT_X = 0.92;
export const BOSS_PORTRAIT_Y = -(BUFFER_PEEK_CELLS + BOSS_BANNER_CELLS * 0.5);

export type PuyoColor = 0 | 1 | 2 | 3 | 4;

export type GameMode = 'boss' | 'classic';

export type DifficultyId = 'easy' | 'normal' | 'lunatic';

export type CharacterId = 'reimu' | 'marisa' | 'patchouli';

export type BossId = 'cirno' | 'remilia' | 'yukari' | 'suika';

export interface DifficultyConfig {
  id: DifficultyId;
  name: string;
  shortLabel: string;
  colorCount: 4 | 5;
  baseGravityMs: number;
  minGravityMs: number;
  speedStepEvery: number; // pieces dropped per speed level
  speedDecayFactor: number;
  bossHpScale: number;
  bossIntervalScale: number;
  badgeColor: string;
}

export const DIFFICULTIES: Record<DifficultyId, DifficultyConfig> = {
  easy: {
    id: 'easy',
    name: 'Easy',
    shortLabel: 'Easy',
    colorCount: 4,
    baseGravityMs: 780,
    minGravityMs: 220,
    speedStepEvery: 18,
    speedDecayFactor: 0.91,
    bossHpScale: 0.85,
    bossIntervalScale: 1.18,
    badgeColor: '#26b868',
  },
  normal: {
    id: 'normal',
    name: 'Normal',
    shortLabel: 'Normal',
    colorCount: 4,
    baseGravityMs: 580,
    minGravityMs: 115,
    speedStepEvery: 12,
    speedDecayFactor: 0.87,
    bossHpScale: 1.0,
    bossIntervalScale: 1.0,
    badgeColor: '#f5b82e',
  },
  lunatic: {
    id: 'lunatic',
    name: 'Lunatic',
    shortLabel: 'Lunatic',
    colorCount: 5,
    baseGravityMs: 470,
    minGravityMs: 85,
    speedStepEvery: 10,
    speedDecayFactor: 0.85,
    bossHpScale: 1.18,
    bossIntervalScale: 0.88,
    badgeColor: '#b45ef5',
  },
};

export interface CharacterConfig {
  id: CharacterId;
  name: string;
  shortName: string;
  spellName: string;
  spellShort: string;
  skillTag: string; // 4-6 chars concise tag
  primaryColor: string;
  secondaryColor: string;
  motif: 'yinyang' | 'star' | 'moon';
}

export const CHARACTERS: Record<CharacterId, CharacterConfig> = {
  reimu: {
    id: 'reimu',
    name: '博丽灵梦',
    shortName: '灵梦',
    spellName: '灵符「梦想封印」',
    spellShort: '梦想封印',
    skillTag: '净化顶层两行',
    primaryColor: '#e83b54',
    secondaryColor: '#ffd480',
    motif: 'yinyang',
  },
  marisa: {
    id: 'marisa',
    name: '雾雨魔理沙',
    shortName: '魔理沙',
    spellName: '魔炮「极限火花」',
    spellShort: '极限火花',
    skillTag: '中路双列激光',
    primaryColor: '#f5b82e',
    secondaryColor: '#fff59d',
    motif: 'star',
  },
  patchouli: {
    id: 'patchouli',
    name: '帕秋莉',
    shortName: '帕秋莉',
    spellName: '七曜「贤者之石」',
    spellShort: '贤者之石',
    skillTag: '稀色转主色',
    primaryColor: '#a855f7',
    secondaryColor: '#f0abfc',
    motif: 'moon',
  },
};

export const CHARACTER_ORDER: readonly CharacterId[] = [
  'reimu',
  'marisa',
  'patchouli',
] as const;

export interface BossTemplate {
  id: BossId;
  name: string;
  title: string;
  primaryColor: string;
  secondaryColor: string;
  hairColor: string;
  eyeColor: string;
  ribbonColor: string;
  baseHp: number;
  baseIntervalMs: number;
}

export const BOSS_ROSTER: readonly BossTemplate[] = [
  {
    id: 'cirno',
    name: '琪露诺',
    title: '湖上冰精',
    primaryColor: '#29b6f6',
    secondaryColor: '#c7f4ff',
    hairColor: '#48b7ff',
    eyeColor: '#1a6ed8',
    ribbonColor: '#7be3ff',
    baseHp: 980,
    baseIntervalMs: 13800,
  },
  {
    id: 'remilia',
    name: '蕾米莉亚',
    title: '红魔大小姐',
    primaryColor: '#e53950',
    secondaryColor: '#ffb3c1',
    hairColor: '#c9b8f2',
    eyeColor: '#d91e3b',
    ribbonColor: '#e53950',
    baseHp: 1450,
    baseIntervalMs: 12600,
  },
  {
    id: 'yukari',
    name: '八云紫',
    title: '境界妖怪',
    primaryColor: '#a855f7',
    secondaryColor: '#fde047',
    hairColor: '#f6d365',
    eyeColor: '#b57b18',
    ribbonColor: '#e03e52',
    baseHp: 1980,
    baseIntervalMs: 11500,
  },
  {
    id: 'suika',
    name: '伊吹萃香',
    title: '萃梦鬼王',
    primaryColor: '#ff7043',
    secondaryColor: '#ffe082',
    hairColor: '#d47a3e',
    eyeColor: '#c94c24',
    ribbonColor: '#f5b82e',
    baseHp: 2560,
    baseIntervalMs: 10600,
  },
] as const;

export interface BossState {
  stage: number; // 1-based wave
  template: BossTemplate;
  hp: number;
  maxHp: number;
  displayHp: number;
  attackTimer: number; // ms remaining until next Ojama attack
  attackInterval: number; // total ms for this countdown
  pendingOjama: number; // 0 when idle, 2..5 when armed to drop
  pendingCols: number[]; // target columns for armed Ojama
  hitFlash: number; // 0..1 hit wobble / flash
  attackFlash: number; // 0..1 attack flash
  defeatTimer: number; // >0 during defeat celebration before next stage
  enterTimer: number; // >0 during boss slide-in entrance
}

export interface DanmakuOrb {
  startX: number;
  startY: number;
  ctrlX: number;
  ctrlY: number;
  targetX: number;
  targetY: number;
  progress: number;
  duration: number;
  color: string;
  coreColor: string;
  radius: number;
  damage: number;
  trail: Array<{ x: number; y: number }>;
}

export interface ActiveSpellVfx {
  character: CharacterId;
  timer: number;
  duration: number;
  impactMs: number;
  impactApplied: boolean;
  targetRows?: number[];
  targetCols?: number[];
  transformedCells?: Array<{
    col: number;
    row: number;
    fromColor: PuyoColor;
    toColor: PuyoColor;
  }>;
  fromColor?: PuyoColor;
  toColor?: PuyoColor;
}

export interface BossBonusBanner {
  bossName: string;
  stage: number;
  bonus: number;
  timer: number;
  duration: number;
}

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
  tag?: string; // Optional override for right-hand kicker (e.g. SPELL CARD)
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
  isOjama?: boolean;
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
  isOjama?: boolean;
  startRow: number;
  targetRow: number;
  y: number;
  vy: number;
}

export interface ClearingCell {
  col: number;
  row: number;
  color: PuyoColor;
  isOjama?: boolean;
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
  | 'spell'
  | 'gameover';

export interface HudSnapshot {
  phase: GamePhase;
  mode: GameMode;
  character: CharacterId;
  difficulty: DifficultyId;
  score: number;
  bestScore: number;
  chain: number;
  maxChain: number;
  speedLevel: number;
  totalCleared: number;
  allClears: number;
  spiritGauge: number; // 0..100
  spiritReady: boolean;
  bossStage: number;
  bossDefeated: number;
  bossName: string;
  paused: boolean;
  isNewBest: boolean;
}
