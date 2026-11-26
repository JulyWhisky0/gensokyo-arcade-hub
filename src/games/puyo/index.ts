import type { GameMetadata } from '../../types/game';
import { puyoCoverSvg } from './coverSvg';
import { mountPuyoGame } from './mount';

export const puyoGame: GameMetadata = {
  id: 'puyo',
  title: '魔法森林噗哟噗哟',
  subtitle: '灵珠连锁 · 符卡爆发',
  englishTitle: 'Gensokyo Spirit Puyo',
  description:
    '经典东方风噗哟噗哟！操控五色幻想乡灵珠自由旋转堆叠，触发华丽多段连锁与符卡宣言（恋符、冰符、梦想封印、极限火花），更有全消净化与三种难度挑战！',
  controls: [
    '← / → 或 A / D：左右移动（支持长按连发）',
    '↓ 或 S：加速缓降（+1 分/格）',
    'Space：瞬间硬降落位',
    'X / ↑ / W：顺时针旋转（支持踢墙、踢地与双按180°翻转）',
    'Z / Q：逆时针旋转',
    'P / Esc：暂停或继续 · 也可使用屏幕按键操作',
  ],
  themeColor: '#9b4ee6',
  accentColor: '#f5b82e',
  characterName: '雾雨魔理沙 & 灵梦',
  difficulty: 'Easy / Normal / Lunatic',
  tags: ['益智消除', '连锁符卡', '多难度'],
  coverSvg: puyoCoverSvg,
  mount: mountPuyoGame,
};
