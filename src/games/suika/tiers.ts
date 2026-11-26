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
  highlight: string;
  rim: string;
  ink: string;
  hair: string;
  hairShadow: string;
  eye: string;
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
export const DROP_COOLDOWN_MS = 300;
export const DROP_EARLY_UNLOCK_MS = 160;
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
    primary: '#fffdf8',
    secondary: '#e1d7f5',
    highlight: '#ffffff',
    rim: '#c9bde8',
    ink: '#4d3b6e',
    hair: '#fffdf8',
    hairShadow: '#ddd2f2',
    eye: '#3e2d5e',
    glow: 'rgba(245, 240, 255, 0.72)',
    particleColors: ['#ffffff', '#ece5ff', '#ffd1e3'],
  },
  {
    tier: 1,
    id: 'cirno',
    name: '琪露诺',
    shortName: '琪露诺',
    title: '湖上冰精 ⑨',
    radius: 22,
    score: 3,
    primary: '#7ce4ff',
    secondary: '#2482de',
    highlight: '#e3fbff',
    rim: '#d6f8ff',
    ink: '#15366e',
    hair: '#4cb6ff',
    hairShadow: '#1c69c9',
    eye: '#12408a',
    glow: 'rgba(105, 224, 255, 0.78)',
    particleColors: ['#b5f4ff', '#48b8ff', '#ffffff'],
  },
  {
    tier: 2,
    id: 'rumia',
    name: '露米娅',
    shortName: '露米娅',
    title: '宵暗的小妖怪',
    radius: 28,
    score: 6,
    primary: '#4b3b73',
    secondary: '#1d1536',
    highlight: '#7d69b0',
    rim: '#eb4d65',
    ink: '#1f122e',
    hair: '#ffe07d',
    hairShadow: '#d9a43b',
    eye: '#e0284a',
    glow: 'rgba(224, 72, 94, 0.68)',
    particleColors: ['#eb4d65', '#876ec7', '#ffe07d'],
  },
  {
    tier: 3,
    id: 'flandre',
    name: '芙兰朵露',
    shortName: '芙兰',
    title: '红魔馆恶魔之妹',
    radius: 35,
    score: 12,
    primary: '#ffd166',
    secondary: '#db384e',
    highlight: '#fff3ba',
    rim: '#fff0ad',
    ink: '#4a1426',
    hair: '#ffe27a',
    hairShadow: '#e0a938',
    eye: '#d61c42',
    glow: 'rgba(255, 184, 77, 0.78)',
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
    primary: '#e63956',
    secondary: '#7a102e',
    highlight: '#ff8599',
    rim: '#ffd9e2',
    ink: '#450c1e',
    hair: '#b9c9ff',
    hairShadow: '#7b8ed4',
    eye: '#c41236',
    glow: 'rgba(235, 58, 92, 0.78)',
    particleColors: ['#ff4d6d', '#ffd6e0', '#b9c9ff'],
  },
  {
    tier: 5,
    id: 'sakuya',
    name: '十六夜咲夜',
    shortName: '咲夜',
    title: '完美潇洒的从者',
    radius: 52,
    score: 36,
    primary: '#c9d7f5',
    secondary: '#455891',
    highlight: '#f7faff',
    rim: '#f5f8ff',
    ink: '#222d52',
    hair: '#dde5fa',
    hairShadow: '#9aa8d4',
    eye: '#2d3f75',
    glow: 'rgba(182, 206, 255, 0.8)',
    particleColors: ['#e8f0ff', '#8ea8e6', '#f0c259'],
  },
  {
    tier: 6,
    id: 'youmu',
    name: '魂魄妖梦',
    shortName: '妖梦',
    title: '半人半灵庭师',
    radius: 62,
    score: 56,
    primary: '#66e0b3',
    secondary: '#1a7560',
    highlight: '#c4ffe9',
    rim: '#dbfff1',
    ink: '#133d33',
    hair: '#e6f5f0',
    hairShadow: '#a6ccbf',
    eye: '#145948',
    glow: 'rgba(98, 222, 176, 0.8)',
    particleColors: ['#82f7ca', '#ffffff', '#ffbfd6'],
  },
  {
    tier: 7,
    id: 'marisa',
    name: '雾雨魔理沙',
    shortName: '魔理沙',
    title: '普通的魔法使',
    radius: 73,
    score: 84,
    primary: '#322854',
    secondary: '#140f29',
    highlight: '#625496',
    rim: '#ffd966',
    ink: '#160f2b',
    hair: '#ffe073',
    hairShadow: '#d9a42e',
    eye: '#ffd447',
    glow: 'rgba(255, 214, 89, 0.86)',
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
    primary: '#ed344a',
    secondary: '#991126',
    highlight: '#ff8594',
    rim: '#fff5e6',
    ink: '#420c18',
    hair: '#3d2129',
    hairShadow: '#1f0d13',
    eye: '#8c172b',
    glow: 'rgba(255, 86, 108, 0.86)',
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
    primary: '#8452cc',
    secondary: '#371a69',
    highlight: '#c499ff',
    rim: '#f7d572',
    ink: '#250e47',
    hair: '#ffe68c',
    hairShadow: '#d9ae43',
    eye: '#f5be41',
    glow: 'rgba(176, 118, 255, 0.88)',
    particleColors: ['#c792ff', '#f7d572', '#ff5978'],
  },
  {
    tier: 10,
    id: 'suika',
    name: '伊吹萃香',
    shortName: '萃香🍉',
    title: '大西瓜鬼王！',
    radius: 112,
    score: 300,
    primary: '#2ebd6e',
    secondary: '#126939',
    highlight: '#7cf5b0',
    rim: '#ffe470',
    ink: '#173822',
    hair: '#ff964f',
    hairShadow: '#cc5c22',
    eye: '#592312',
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
