import type { GameMetadata } from '../../types/game';
import { SUIKA_COVER_SVG } from './cover';
import { mountSuikaGame } from './game';

export const suikaGame: GameMetadata = {
  id: 'suika',
  title: '幻想乡合成大西瓜',
  subtitle: 'Fumo水果布偶·符卡合果',
  englishTitle: 'Gensokyo Fumo Fruit Suika',
  description:
    '软萌东方 Fumo 水果布偶合成！一路合成红富士灵梦苹果与大西瓜伊吹萃香，善用四大支援符卡、隙间暂存与决死结界冲击高分！',
  controls: [
    '鼠标移动 / 触屏滑动 / A D：瞄准投放位置',
    '左键点击 / 空格 / ↓：投放当前水果布偶',
    'E / 右键 / 点击符卡：发动当前支援符卡',
    'Shift / 点击隙间槽：隙间暂存互换（每2投充能）',
    'P / Esc：暂停游戏或取消隙间点选',
  ],
  themeColor: '#1b7a4e',
  accentColor: '#f0c259',
  characterName: '伊吹萃香',
  difficulty: '休闲益智',
  tags: ['合成', '布偶', '符卡'],
  coverSvg: SUIKA_COVER_SVG,
  mount: mountSuikaGame,
};
