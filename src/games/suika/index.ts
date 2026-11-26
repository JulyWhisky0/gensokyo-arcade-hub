import type { GameMetadata } from '../../types/game';
import { SUIKA_COVER_SVG } from './cover';
import { mountSuikaGame } from './game';

export const suikaGame: GameMetadata = {
  id: 'suika',
  title: '幻想乡合成大西瓜',
  subtitle: '毛玉一路合成至伊吹萃香！',
  englishTitle: 'Gensokyo Suika Merge',
  description:
    '物理碰撞合成小游戏！投放毛玉、琪露诺、露米娅等东方角色球，相同角色相遇进化升级，一路挑战合成巨型大西瓜鬼王「伊吹萃香」，触发双萃香烟花大爆发！',
  controls: [
    '鼠标移动 / 触屏滑动：瞄准投放位置',
    '左键点击 / 松开触屏：投放当前角色球',
    'A / D 或 ← / →：微调投放位置',
    '空格 / ↓ / Enter：快速投放',
    'P / Esc：暂停或继续游戏',
  ],
  themeColor: '#1b7a4e',
  accentColor: '#f0c259',
  characterName: '伊吹萃香',
  difficulty: '休闲益智',
  tags: ['合成', '物理', '休闲'],
  coverSvg: SUIKA_COVER_SVG,
  mount: mountSuikaGame,
};
