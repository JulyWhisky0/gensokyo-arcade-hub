import type { GameMetadata } from '../types/game';
import { suikaGame } from './suika';
import { puyoGame } from './puyo';
import { flappyGame } from './flappy';

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
