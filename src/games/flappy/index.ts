import type { GameMetadata } from '../../types/game';
import { FLAPPY_COVER_SVG } from './cover';
import { mountFlappyGame } from './engine';

export const flappyGame: GameMetadata = {
  id: 'flappy',
  title: '幻想乡管道鸟 · 竹林疾飞',
  subtitle: 'Gensokyo Flappy Aya',
  englishTitle: 'Gensokyo Flappy Aya',
  description:
    '化身射命丸文、博丽灵梦或琪露诺，振翼穿梭迷途竹林与博丽鸟居！收集飘浮的 P 点与信仰星赢取额外加分，随着分数攀升亲历黎明、黄昏直至红魔异变绯月夜空。',
  controls: [
    'Space / ↑ / W / 点击或轻触屏幕：振翼飞升',
    '准备界面：点击下方角色卡切换 射命丸文 / 博丽灵梦 / 琪露诺',
    'P / Esc：暂停或继续飞行',
    '结算界面 R / Enter：快速再来一局',
  ],
  themeColor: '#c82333',
  accentColor: '#f5c542',
  characterName: '射命丸文 / 博丽灵梦 / 琪露诺',
  difficulty: '中等 · 渐进挑战',
  tags: ['动作躲避', '东方同人', '多角色', '敏捷挑战'],
  coverSvg: FLAPPY_COVER_SVG,
  mount: mountFlappyGame,
};
