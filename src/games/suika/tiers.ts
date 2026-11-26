export interface OrbTierDef {
  tier: number;
  id: string;
  name: string;
  shortName: string;
  title: string;
  radius: number;
  score: number;
  primary: string;
  secondary: string;
  rim: string;
  glow: string;
  particleColors: string[];
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
export const DROP_COOLDOWN_MS = 450;
export const DANGER_GRACE_SECONDS = 2.5;
export const DOUBLE_SUIKA_BONUS = 2000;

export const ORB_TIERS: readonly OrbTierDef[] = [
  {
    tier: 0,
    id: 'kedama',
    name: '毛玉',
    shortName: '毛玉',
    title: '幻想乡软萌毛球',
    radius: 16,
    score: 1,
    primary: '#fffdf9',
    secondary: '#e6dff5',
    rim: '#c8bee3',
    glow: 'rgba(245, 240, 255, 0.7)',
    particleColors: ['#ffffff', '#ece5ff', '#ffd6e7'],
  },
  {
    tier: 1,
    id: 'cirno',
    name: '琪露诺',
    shortName: '琪露诺',
    title: '湖上冰精 ⑨',
    radius: 22,
    score: 3,
    primary: '#7ce2ff',
    secondary: '#2b8de3',
    rim: '#d4f7ff',
    glow: 'rgba(105, 224, 255, 0.75)',
    particleColors: ['#a6f1ff', '#48b8ff', '#ffffff'],
  },
  {
    tier: 2,
    id: 'rumia',
    name: '露米娅',
    shortName: '露米娅',
    title: '宵暗的小妖怪',
    radius: 28,
    score: 6,
    primary: '#463869',
    secondary: '#1d1633',
    rim: '#e0485e',
    glow: 'rgba(224, 72, 94, 0.65)',
    particleColors: ['#e0485e', '#7c65b8', '#ffd86b'],
  },
  {
    tier: 3,
    id: 'flandre',
    name: '芙兰朵露',
    shortName: '芙兰',
    title: '红魔馆恶魔之妹',
    radius: 35,
    score: 12,
    primary: '#ffcf5c',
    secondary: '#e03e52',
    rim: '#fff0ad',
    glow: 'rgba(255, 184, 77, 0.75)',
    particleColors: ['#ff4d6d', '#ffd166', '#06d6a0', '#4cc9f0', '#b5179e'],
  },
  {
    tier: 4,
    id: 'remilia',
    name: '蕾米莉亚',
    shortName: '蕾米',
    title: '永远鲜红的幼月',
    radius: 43,
    score: 22,
    primary: '#e03652',
    secondary: '#7a1230',
    rim: '#ffd9e2',
    glow: 'rgba(235, 58, 92, 0.75)',
    particleColors: ['#ff4d6d', '#ffccd5', '#b9a3ff'],
  },
  {
    tier: 5,
    id: 'sakuya',
    name: '十六夜咲夜',
    shortName: '咲夜',
    title: '完美潇洒的从者',
    radius: 52,
    score: 36,
    primary: '#c9d7f2',
    secondary: '#4c5e96',
    rim: '#f5f8ff',
    glow: 'rgba(182, 206, 255, 0.78)',
    particleColors: ['#e3ecff', '#8ea8e6', '#f0c259'],
  },
  {
    tier: 6,
    id: 'youmu',
    name: '魂魄妖梦',
    shortName: '妖梦',
    title: '半人半灵庭师',
    radius: 62,
    score: 56,
    primary: '#62deb0',
    secondary: '#1d7a64',
    rim: '#d9fff0',
    glow: 'rgba(98, 222, 176, 0.78)',
    particleColors: ['#7ff5c8', '#ffffff', '#ffb8d1'],
  },
  {
    tier: 7,
    id: 'marisa',
    name: '雾雨魔理沙',
    shortName: '魔理沙',
    title: '普通的魔法使',
    radius: 73,
    score: 84,
    primary: '#2d254c',
    secondary: '#140f26',
    rim: '#ffd659',
    glow: 'rgba(255, 214, 89, 0.85)',
    particleColors: ['#ffe066', '#fff6cc', '#ff8fab', '#6ce5ff'],
  },
  {
    tier: 8,
    id: 'reimu',
    name: '博丽灵梦',
    shortName: '灵梦',
    title: '乐园的红白巫女',
    radius: 85,
    score: 120,
    primary: '#eb364b',
    secondary: '#9e1328',
    rim: '#fff5e6',
    glow: 'rgba(255, 86, 108, 0.85)',
    particleColors: ['#ff4757', '#fff5f5', '#f5c75c'],
  },
  {
    tier: 9,
    id: 'yukari',
    name: '八云紫',
    shortName: '八云紫',
    title: '境界的隙间妖怪',
    radius: 98,
    score: 180,
    primary: '#7e4dc4',
    secondary: '#371b66',
    rim: '#f5d26b',
    glow: 'rgba(176, 118, 255, 0.88)',
    particleColors: ['#c792ff', '#f5d26b', '#ff5978'],
  },
  {
    tier: 10,
    id: 'suika',
    name: '伊吹萃香',
    shortName: '萃香🍉',
    title: '大西瓜鬼王！',
    radius: 112,
    score: 300,
    primary: '#2eb86b',
    secondary: '#136b3b',
    rim: '#ffe169',
    glow: 'rgba(84, 240, 146, 0.92)',
    particleColors: ['#3be382', '#ffe169', '#ff5e78', '#ffffff'],
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
