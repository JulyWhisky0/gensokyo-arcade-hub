import type { GameMetadata } from '../../types/game';
import { FLAPPY_COVER_SVG } from './cover';
import { mountFlappyGame } from './engine';

export const flappyGame: GameMetadata = {
  id: 'flappy',
  title: '幻想乡管道鸟 · 竹林疾飞',
  subtitle: '擦弹充能 · 三自机符卡疾飞',
  englishTitle: 'Gensokyo Flappy Aya',
  description:
    '化身射命丸文、博丽灵梦或琪露诺，擦弹竹柱与异变弹幕充能灵力槽，释放幻想风靡冲刺破柱、决死阴阳结界或完美冻结慢动作！',
  controls: [
    'Space / ↑ / W / 点击：振翼飞升',
    'Shift / E / 右键 / 点击符卡槽：释放自机符卡',
    '贴近竹柱或异变弹幕擦弹 (GRAZE)：+1 分并快速充能',
    'P / Esc：暂停 · R / Enter：再来一局',
  ],
  themeColor: '#c82333',
  accentColor: '#f5c542',
  characterName: '射命丸文 / 博丽灵梦 / 琪露诺',
  difficulty: '中等 · 渐进挑战',
  tags: ['动作躲避', '东方同人', '擦弹符卡', '三自机'],
  coverSvg: FLAPPY_COVER_SVG,
  mount: mountFlappyGame,
};
