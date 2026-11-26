import type { GameMetadata } from '../types/game';
import { suikaGame } from './suika';
import { puyoGame } from './puyo';
import { flappyGame } from './flappy';
import {
  COMING_SOON_2048_SVG,
  COMING_SOON_DANMAKU_SVG,
  COMING_SOON_RHYTHM_SVG,
} from '../shared/icons';

export const GAMES: readonly GameMetadata[] = [
  suikaGame,
  puyoGame,
  flappyGame,
];

export function getGameById(id: string): GameMetadata | undefined {
  return GAMES.find((game) => game.id === id);
}

export type CategoryFilterId = 'all' | 'merge' | 'puzzle' | 'action';

export interface CategoryFilter {
  id: CategoryFilterId;
  label: string;
}

export const CATEGORY_FILTERS: readonly CategoryFilter[] = [
  { id: 'all', label: '全部' },
  { id: 'merge', label: '合成' },
  { id: 'puzzle', label: '益智消除' },
  { id: 'action', label: '动作躲避' },
];

export function matchesCategory(game: GameMetadata, category: CategoryFilterId): boolean {
  if (category === 'all') return true;
  const corpus = [game.title, game.subtitle, game.description, ...game.tags].join(' ').toLowerCase();
  switch (category) {
    case 'merge':
      return game.id === 'suika' || /合成|西瓜|物理|suika|merge/.test(corpus);
    case 'puzzle':
      return game.id === 'puyo' || /消除|益智|连锁|气泡|噗哟|puyo|puzzle/.test(corpus);
    case 'action':
      return game.id === 'flappy' || /动作|躲避|飞行|敏捷|街机|flappy|arcade/.test(corpus);
    default:
      return true;
  }
}

export interface ComingSoonGame {
  id: string;
  title: string;
  englishTitle: string;
  characterName: string;
  description: string;
  tags: string[];
  statusLabel: string;
  coverSvg: string;
}

export const COMING_SOON_GAMES: readonly ComingSoonGame[] = [
  {
    id: 'danmaku-dodge',
    title: '红魔馆弹幕避弹',
    englishTitle: 'Scarlet Danmaku Survival',
    characterName: '蕾米莉亚 · 芙兰朵露',
    description: '在千变万化的红雾符卡弹幕中擦弹求生，积累灵力释放结界反击，挑战极速生存纪录。',
    tags: ['弹幕避弹', '擦弹得分', '生存挑战'],
    statusLabel: '企划封印中',
    coverSvg: COMING_SOON_DANMAKU_SVG,
  },
  {
    id: 'touhou-2048',
    title: '永远亭东方 2048',
    englishTitle: 'Eientei 2048',
    characterName: '蓬莱山辉夜 · 八意永琳',
    description: '滑动蓬莱玉枝与月都秘药，将幻想乡符卡数字层层合成至 2048 与月光终章。',
    tags: ['数字合成', '策略益智', '无尽模式'],
    statusLabel: '企划封印中',
    coverSvg: COMING_SOON_2048_SVG,
  },
  {
    id: 'youmu-rhythm',
    title: '白玉楼节奏斩击',
    englishTitle: 'Hakugyokurou Blade Beat',
    characterName: '魂魄妖梦 · 西行寺幽幽子',
    description: '伴随幻想乡经典旋律挥动楼观剑与白楼剑，在樱吹雪节拍点上斩破幽灵弹幕。',
    tags: ['音乐节奏', '瞬时反应', '连击演出'],
    statusLabel: '企划封印中',
    coverSvg: COMING_SOON_RHYTHM_SVG,
  },
];
