import type { GameMetadata } from '../../types/game';
import { puyoCoverSvg } from './coverSvg';
import { mountPuyoGame } from './mount';

export const puyoGame: GameMetadata = {
  id: 'puyo',
  title: '魔法森林噗哟噗哟',
  subtitle: '符卡改盘·异变BOSS连消',
  englishTitle: 'Gensokyo Spirit Puyo',
  description:
    '东方符卡对战噗哟！灵梦、魔理沙、帕秋莉三自机蓄满灵力释放改盘符卡，迎战琪露诺、蕾米莉亚、八云紫、萃香异变BOSS，亦支持经典无尽连锁挑战。',
  controls: [
    '← / → 或 A / D：左右移动（支持长按连发）',
    '↓ 或 S：加速缓降 · Space：瞬间硬降',
    'X / ↑ / W：顺时针旋转 · Z / Q：逆时针旋转（窄道双按180°翻转）',
    'Shift / E 或点击侧栏符卡钮：满灵力释放自机符卡',
    'P / Esc：暂停或继续',
  ],
  themeColor: '#9b4ee6',
  accentColor: '#f5b82e',
  characterName: '灵梦 · 魔理沙 · 帕秋莉',
  difficulty: 'Easy / Normal / Lunatic',
  tags: ['异变BOSS战', '主动符卡', '连锁消除'],
  coverSvg: puyoCoverSvg,
  mount: mountPuyoGame,
};
