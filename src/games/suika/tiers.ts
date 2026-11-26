export type FumoExpression =
  | 'kedama'  // ·ω·
  | 'smug'    // ᗜˬᗜ
  | 'deadpan' // ᗜ_ᗜ
  | 'fang'    // ᗜ▽ᗜ (with tiny vampire fang)
  | 'cat'     // ᗜωᗜ
  | 'gentle'  // ᗜ‿ᗜ
  | 'proud'   // ᗜ‸ᗜ (with tiny vampire fang)
  | 'wink'    // ᗜ▽<
  | 'tipsy';  // ᗜ▽ᗜ (festive tipsy grin)

export type OrbFaceState = 'normal' | 'blink' | 'panic';

export interface OrbTierDef {
  tier: number;
  id: string;
  name: string;
  shortName: string;
  fruitName: string;
  title: string;
  radius: number;
  score: number;
  /** Matte velvety plush fruit fabric tones */
  fruitLight: string;
  fruitBase: string;
  fruitShadow: string;
  /** Warm plush stitch / soft fabric contour */
  stitch: string;
  /** Recessed creamy plush face cutout */
  faceCream: string;
  /** Character felt/minky hair tones */
  hair: string;
  hairShadow: string;
  hairHighlight: string;
  /** Fumo embroidered iris tones */
  eyeTop: string;
  eyeBottom: string;
  blush: string;
  expression: FumoExpression;
  /** Accent rim & burst VFX palette */
  rim: string;
  glow: string;
  particleColors: string[];
}

export type SupportSpellId = 'reimu' | 'sakuya' | 'yukari' | 'suika';

export interface SupportSpellDef {
  id: SupportSpellId;
  charName: string;
  shortChar: string;
  spellName: string;
  shortDesc: string;
  color: string;
  accent: string;
  /** Orb tier index used as portrait reference when applicable (-1 for custom Yukari badge) */
  portraitTier: number;
}

export const BOARD_WIDTH = 420;
export const BOARD_HEIGHT = 590;
export const WALL_THICKNESS = 14;
export const INNER_LEFT = WALL_THICKNESS;
export const INNER_RIGHT = BOARD_WIDTH - WALL_THICKNESS;
export const INNER_WIDTH = INNER_RIGHT - INNER_LEFT; // 392
export const FLOOR_Y = BOARD_HEIGHT - 16; // 574
export const JAR_TOP_Y = 82;
export const SPAWN_Y = 50;
export const DANGER_Y = 114;

export const MAX_SPAWN_TIER = 4;
export const DROP_COOLDOWN_MS = 300;
export const DROP_EARLY_UNLOCK_MS = 160;
export const DANGER_GRACE_SECONDS = 2.5;
export const DOUBLE_SUIKA_BONUS = 2000;

// Touhou Gameplay Mechanics constants
export const SPIRIT_PER_CHARGE = 100;
export const SPIRIT_MAX_CHARGES = 2;
export const SPIRIT_MAX_VALUE = SPIRIT_PER_CHARGE * SPIRIT_MAX_CHARGES;
export const TIME_STOP_DURATION = 4.0;
export const TIME_STOP_RAPID_DROPS = 3;
export const SUIKA_SHRINK_DURATION = 2.6;
export const SUIKA_SHRINK_SCALE = 0.85;
export const FEVER_DURATION = 10.0;
export const GAP_HOLD_COOLDOWN_DROPS = 2;

export const SUPPORT_SPELLS: readonly SupportSpellDef[] = [
  {
    id: 'reimu',
    charName: '博丽灵梦',
    shortChar: '灵梦',
    spellName: '灵符「梦想封印」',
    shortDesc: '发射3道诱导灵符，消除箱内最小的3枚布偶',
    color: '#e6394d',
    accent: '#ffe399',
    portraitTier: 9,
  },
  {
    id: 'sakuya',
    charName: '十六夜咲夜',
    shortChar: '咲夜',
    spellName: '幻世「The World」',
    shortDesc: '冻结时间与警戒4秒，可无冷却连续投放3枚布偶',
    color: '#6b94e8',
    accent: '#dce8ff',
    portraitTier: 6,
  },
  {
    id: 'yukari',
    charName: '八云紫',
    shortChar: '八云紫',
    spellName: '境符「隙间穿梭」',
    shortDesc: '点选箱内任意布偶，与当前手头布偶通过隙间互换',
    color: '#9b5de5',
    accent: '#f7d572',
    portraitTier: -1,
  },
  {
    id: 'suika',
    charName: '伊吹萃香',
    shortChar: '萃香',
    spellName: '鬼符「密与疏」',
    shortDesc: '震荡酒气并短暂缩小布偶15%，促成卡位连锁合成',
    color: '#2fa85e',
    accent: '#ffd86b',
    portraitTier: 10,
  },
] as const;

export const ORB_TIERS: readonly OrbTierDef[] = [
  {
    tier: 0,
    id: 'kedama',
    name: '毛玉',
    shortName: '毛玉',
    fruitName: '白玉果',
    title: '白玉果 · 毛玉',
    radius: 16,
    score: 1,
    fruitLight: '#fffdf9',
    fruitBase: '#f6f0e6',
    fruitShadow: '#ddd0c0',
    stitch: '#8f7d6e',
    faceCream: '#fffaf4',
    hair: '#fffdf9',
    hairShadow: '#e2d7c8',
    hairHighlight: '#ffffff',
    eyeTop: '#4a3531',
    eyeBottom: '#6b4d45',
    blush: '#ff9eb5',
    expression: 'kedama',
    rim: '#f0e2d0',
    glow: 'rgba(255, 246, 232, 0.72)',
    particleColors: ['#fffaf0', '#f5e6d3', '#ffc2d4', '#a8e090'],
  },
  {
    tier: 1,
    id: 'cirno',
    name: '琪露诺',
    shortName: '琪露诺',
    fruitName: '蓝莓',
    title: '蓝莓 · 琪露诺',
    radius: 22,
    score: 3,
    fruitLight: '#87cbff',
    fruitBase: '#509be6',
    fruitShadow: '#3267b5',
    stitch: '#24477d',
    faceCream: '#fff8f0',
    hair: '#69c2ff',
    hairShadow: '#3585d6',
    hairHighlight: '#b0e3ff',
    eyeTop: '#2466bf',
    eyeBottom: '#6cc8ff',
    blush: '#ff9cb5',
    expression: 'smug',
    rim: '#bce8ff',
    glow: 'rgba(118, 206, 255, 0.78)',
    particleColors: ['#b5ecff', '#58aef5', '#ffffff'],
  },
  {
    tier: 2,
    id: 'rumia',
    name: '露米娅',
    shortName: '露米娅',
    fruitName: '紫葡萄',
    title: '紫葡萄 · 露米娅',
    radius: 28,
    score: 6,
    fruitLight: '#9d76cf',
    fruitBase: '#6d449e',
    fruitShadow: '#46256e',
    stitch: '#2d1547',
    faceCream: '#fff7ee',
    hair: '#f7d87c',
    hairShadow: '#cfa240',
    hairHighlight: '#fff0b3',
    eyeTop: '#b82542',
    eyeBottom: '#f26b82',
    blush: '#ff99ae',
    expression: 'deadpan',
    rim: '#d3b2ff',
    glow: 'rgba(168, 118, 224, 0.72)',
    particleColors: ['#c299ff', '#e84a64', '#ffe285'],
  },
  {
    tier: 3,
    id: 'flandre',
    name: '芙兰朵露',
    shortName: '芙兰',
    fruitName: '草莓',
    title: '草莓 · 芙兰朵露',
    radius: 35,
    score: 12,
    fruitLight: '#ff707c',
    fruitBase: '#e33f52',
    fruitShadow: '#b02438',
    stitch: '#6e1928',
    faceCream: '#fff7ee',
    hair: '#ffe07d',
    hairShadow: '#d9a43b',
    hairHighlight: '#fff3ba',
    eyeTop: '#bf1f3f',
    eyeBottom: '#ff6982',
    blush: '#ff94a8',
    expression: 'fang',
    rim: '#ffccd3',
    glow: 'rgba(255, 110, 126, 0.78)',
    particleColors: ['#ff576d', '#ffe066', '#4ce0a3', '#66d6ff', '#c27dff'],
  },
  {
    tier: 4,
    id: 'chen',
    name: '橙',
    shortName: '橙',
    fruitName: '橘子',
    title: '橘子 · 橙',
    radius: 43,
    score: 22,
    fruitLight: '#ffb35c',
    fruitBase: '#f08229',
    fruitShadow: '#c25710',
    stitch: '#73310a',
    faceCream: '#fff8ef',
    hair: '#874c2d',
    hairShadow: '#592e18',
    hairHighlight: '#b06d46',
    eyeTop: '#8f4f1c',
    eyeBottom: '#ebb349',
    blush: '#ff9494',
    expression: 'cat',
    rim: '#ffe0b0',
    glow: 'rgba(255, 162, 74, 0.8)',
    particleColors: ['#ffad4d', '#ff6352', '#ffe699', '#7acc5c'],
  },
  {
    tier: 5,
    id: 'youmu',
    name: '魂魄妖梦',
    shortName: '妖梦',
    fruitName: '青苹果',
    title: '青苹果 · 魂魄妖梦',
    radius: 52,
    score: 36,
    fruitLight: '#b1eb83',
    fruitBase: '#72c752',
    fruitShadow: '#499432',
    stitch: '#2b5c1e',
    faceCream: '#fff9f2',
    hair: '#e8f4ef',
    hairShadow: '#b4cfc4',
    hairHighlight: '#ffffff',
    eyeTop: '#24735e',
    eyeBottom: '#6dd4b4',
    blush: '#ffa3b8',
    expression: 'deadpan',
    rim: '#d4fac0',
    glow: 'rgba(130, 224, 114, 0.8)',
    particleColors: ['#9df078', '#ffffff', '#b8f5e0', '#ffc4d6'],
  },
  {
    tier: 6,
    id: 'sakuya',
    name: '十六夜咲夜',
    shortName: '咲夜',
    fruitName: '雪梨',
    title: '雪梨 · 十六夜咲夜',
    radius: 62,
    score: 56,
    fruitLight: '#fff8db',
    fruitBase: '#f0df9e',
    fruitShadow: '#ccb66e',
    stitch: '#7d6b38',
    faceCream: '#fffaf4',
    hair: '#cfdcf5',
    hairShadow: '#93a6cc',
    hairHighlight: '#eff5ff',
    eyeTop: '#354f8f',
    eyeBottom: '#7ea2eb',
    blush: '#ffa6ba',
    expression: 'gentle',
    rim: '#fff3c4',
    glow: 'rgba(245, 226, 152, 0.82)',
    particleColors: ['#fff4c7', '#c7dbff', '#f2c85b', '#ffffff'],
  },
  {
    tier: 7,
    id: 'remilia',
    name: '蕾米莉亚',
    shortName: '蕾米',
    fruitName: '水蜜桃',
    title: '水蜜桃 · 蕾米莉亚',
    radius: 73,
    score: 84,
    fruitLight: '#ffd4df',
    fruitBase: '#f598b2',
    fruitShadow: '#cc6888',
    stitch: '#7a354d',
    faceCream: '#fff7f2',
    hair: '#c6d6ff',
    hairShadow: '#8ea3db',
    hairHighlight: '#ebf1ff',
    eyeTop: '#b51b3b',
    eyeBottom: '#f25c7c',
    blush: '#ff8da8',
    expression: 'proud',
    rim: '#ffe0ea',
    glow: 'rgba(255, 166, 192, 0.84)',
    particleColors: ['#ffb0c8', '#ffe4ee', '#c4d4ff', '#e83f5b'],
  },
  {
    tier: 8,
    id: 'marisa',
    name: '雾雨魔理沙',
    shortName: '魔理沙',
    fruitName: '菠萝',
    title: '菠萝 · 雾雨魔理沙',
    radius: 85,
    score: 120,
    fruitLight: '#ffe67d',
    fruitBase: '#f0be3c',
    fruitShadow: '#c78c18',
    stitch: '#734d0e',
    faceCream: '#fff8ef',
    hair: '#ffe57f',
    hairShadow: '#d9a42e',
    hairHighlight: '#fff6c2',
    eyeTop: '#b57414',
    eyeBottom: '#ffd652',
    blush: '#ff96a6',
    expression: 'wink',
    rim: '#fff0a8',
    glow: 'rgba(255, 212, 86, 0.86)',
    particleColors: ['#ffe266', '#fff5bf', '#5bc765', '#ffffff'],
  },
  {
    tier: 9,
    id: 'reimu',
    name: '博丽灵梦',
    shortName: '灵梦',
    fruitName: '红富士大苹果',
    title: '红富士大苹果 · 博丽灵梦',
    radius: 98,
    score: 180,
    fruitLight: '#ff695e',
    fruitBase: '#e33b3b',
    fruitShadow: '#ad2026',
    stitch: '#63141a',
    faceCream: '#fff7ef',
    hair: '#45262b',
    hairShadow: '#261216',
    hairHighlight: '#6b4047',
    eyeTop: '#7d1828',
    eyeBottom: '#d9485e',
    blush: '#ff94a8',
    expression: 'deadpan',
    rim: '#ffe8d9',
    glow: 'rgba(255, 92, 88, 0.86)',
    particleColors: ['#ff5454', '#fff5eb', '#f5c75c', '#98d968'],
  },
  {
    tier: 10,
    id: 'suika',
    name: '伊吹萃香',
    shortName: '萃香🍉',
    fruitName: '大西瓜',
    title: '大西瓜 · 伊吹萃香',
    radius: 112,
    score: 300,
    fruitLight: '#6ad184',
    fruitBase: '#33a358',
    fruitShadow: '#1e6e3a',
    stitch: '#154526',
    faceCream: '#fff7ee',
    hair: '#ff9a52',
    hairShadow: '#cc6023',
    hairHighlight: '#ffc48a',
    eyeTop: '#8f3018',
    eyeBottom: '#eb7d34',
    blush: '#ff7d93',
    expression: 'tipsy',
    rim: '#ffe885',
    glow: 'rgba(94, 232, 138, 0.92)',
    particleColors: ['#4ce080', '#ffe36e', '#ff6978', '#ffffff'],
  },
] as const;

export const MAX_TIER = ORB_TIERS.length - 1;

const SPAWN_WEIGHTS = [0.30, 0.28, 0.22, 0.13, 0.07];

export function pickNextSpawnTier(dropCount: number): number {
  // Friendly opening: first 2 drops are always tiers 0..2
  if (dropCount < 2) {
    const r = Math.random();
    if (r < 0.44) return 0;
    if (r < 0.82) return 1;
    return 2;
  }
  const r = Math.random();
  let acc = 0;
  for (let i = 0; i < SPAWN_WEIGHTS.length; i++) {
    acc += SPAWN_WEIGHTS[i];
    if (r <= acc) return i;
  }
  return 0;
}
