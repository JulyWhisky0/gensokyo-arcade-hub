export interface GameScoreEntry {
  score: number;
  date: string;
  extra?: string;
}

export interface GameMountContext {
  container: HTMLElement;
  onScoreChange: (score: number, best: number, extra?: string) => void;
  onGameOver: (finalScore: number, extra?: string) => void;
  getBestScore: () => number;
  saveScore: (score: number, extra?: string) => void;
  isMuted: () => boolean;
  onMuteChange: (cb: (muted: boolean) => void) => () => void;
  onBackToMenu: () => void;
}

export interface GameInstance {
  destroy: () => void;
  restart: () => void;
  setPaused?: (paused: boolean) => void;
}

export interface GameMetadata {
  id: 'suika' | 'puyo' | 'flappy';
  title: string;
  subtitle: string;
  englishTitle: string;
  description: string;
  controls: string[];
  themeColor: string;
  accentColor: string;
  characterName: string;
  difficulty: string;
  tags: string[];
  coverSvg: string;
  mount: (ctx: GameMountContext) => GameInstance;
}
