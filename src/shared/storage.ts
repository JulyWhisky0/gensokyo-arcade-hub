import type { GameScoreEntry } from '../types/game';

export interface GameRecordData {
  bestScore: number;
  bestExtra?: string;
  playCount: number;
  lastPlayedAt?: string;
  history: GameScoreEntry[];
}

export interface PortalStorageData {
  version: number;
  muted: boolean;
  lastPlayedGameId?: string;
  games: Record<string, GameRecordData>;
}

const STORAGE_KEY = 'gensokyo_arcade_hub_v1';
const MAX_HISTORY_PER_GAME = 15;

function createEmptyData(): PortalStorageData {
  return {
    version: 1,
    muted: false,
    games: {},
  };
}

function createEmptyRecord(): GameRecordData {
  return {
    bestScore: 0,
    playCount: 0,
    history: [],
  };
}

function safeLoad(): PortalStorageData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyData();
    const parsed = JSON.parse(raw) as Partial<PortalStorageData>;
    if (!parsed || typeof parsed !== 'object') return createEmptyData();
    return {
      version: 1,
      muted: Boolean(parsed.muted),
      lastPlayedGameId:
        typeof parsed.lastPlayedGameId === 'string' ? parsed.lastPlayedGameId : undefined,
      games:
        parsed.games && typeof parsed.games === 'object' ? parsed.games : {},
    };
  } catch {
    return createEmptyData();
  }
}

function safeSave(data: PortalStorageData): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore quota or private-mode errors gracefully
  }
}

function ensureRecord(data: PortalStorageData, gameId: string): GameRecordData {
  const existing = data.games[gameId];
  if (existing && typeof existing === 'object') {
    if (!Array.isArray(existing.history)) {
      existing.history = [];
    }
    if (typeof existing.bestScore !== 'number' || !Number.isFinite(existing.bestScore)) {
      existing.bestScore = 0;
    }
    if (typeof existing.playCount !== 'number' || !Number.isFinite(existing.playCount)) {
      existing.playCount = 0;
    }
    return existing;
  }
  const fresh = createEmptyRecord();
  data.games[gameId] = fresh;
  return fresh;
}

class PortalStorage {
  private data: PortalStorageData;
  private muteListeners = new Set<(muted: boolean) => void>();

  constructor() {
    this.data = safeLoad();
  }

  private persist(): void {
    safeSave(this.data);
  }

  isMuted(): boolean {
    return this.data.muted;
  }

  setMuted(muted: boolean): void {
    if (this.data.muted === muted) return;
    this.data.muted = muted;
    this.persist();
    for (const listener of this.muteListeners) {
      try {
        listener(muted);
      } catch {
        // Keep other listeners unaffected
      }
    }
  }

  toggleMuted(): boolean {
    const next = !this.data.muted;
    this.setMuted(next);
    return next;
  }

  onMuteChange(cb: (muted: boolean) => void): () => void {
    this.muteListeners.add(cb);
    return () => {
      this.muteListeners.delete(cb);
    };
  }

  getGameRecord(gameId: string): GameRecordData {
    const rec = ensureRecord(this.data, gameId);
    return {
      bestScore: rec.bestScore,
      bestExtra: rec.bestExtra,
      playCount: rec.playCount,
      lastPlayedAt: rec.lastPlayedAt,
      history: rec.history.map((entry) => ({ ...entry })),
    };
  }

  getBestScore(gameId: string): number {
    return ensureRecord(this.data, gameId).bestScore;
  }

  recordPlayStart(gameId: string): void {
    const rec = ensureRecord(this.data, gameId);
    rec.playCount += 1;
    rec.lastPlayedAt = new Date().toISOString();
    this.data.lastPlayedGameId = gameId;
    this.persist();
  }

  saveScore(gameId: string, score: number, extra?: string): { isNewBest: boolean; best: number } {
    const cleanScore = Math.max(0, Math.floor(Number.isFinite(score) ? score : 0));
    const cleanExtra = extra?.trim() || undefined;
    const rec = ensureRecord(this.data, gameId);
    const now = new Date().toISOString();

    const isNewBest = cleanScore > rec.bestScore;
    if (isNewBest) {
      rec.bestScore = cleanScore;
      rec.bestExtra = cleanExtra;
    } else if (cleanScore === rec.bestScore && cleanExtra && !rec.bestExtra) {
      rec.bestExtra = cleanExtra;
    }

    if (cleanScore > 0 || cleanExtra) {
      rec.history.unshift({
        score: cleanScore,
        date: now,
        extra: cleanExtra,
      });
      if (rec.history.length > MAX_HISTORY_PER_GAME) {
        rec.history.length = MAX_HISTORY_PER_GAME;
      }
    }

    rec.lastPlayedAt = now;
    this.data.lastPlayedGameId = gameId;
    this.persist();

    return {
      isNewBest,
      best: rec.bestScore,
    };
  }

  getTotalPlayCount(): number {
    return Object.values(this.data.games).reduce((sum, rec) => sum + (rec.playCount || 0), 0);
  }

  getTotalBestScore(gameIds: readonly string[]): number {
    return gameIds.reduce((sum, id) => sum + this.getBestScore(id), 0);
  }

  getLastPlayedGameId(): string | undefined {
    return this.data.lastPlayedGameId;
  }

  getLastActivityDate(): string | undefined {
    let latest: string | undefined;
    for (const rec of Object.values(this.data.games)) {
      if (rec.lastPlayedAt && (!latest || rec.lastPlayedAt > latest)) {
        latest = rec.lastPlayedAt;
      }
    }
    return latest;
  }

  clearGameRecord(gameId: string): void {
    delete this.data.games[gameId];
    if (this.data.lastPlayedGameId === gameId) {
      this.data.lastPlayedGameId = undefined;
    }
    this.persist();
  }

  clearAllRecords(): void {
    this.data.games = {};
    this.data.lastPlayedGameId = undefined;
    this.persist();
  }
}

export const storage = new PortalStorage();

export function formatScore(value: number): string {
  const n = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  return n.toLocaleString('zh-CN');
}

export function formatRecordDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--';
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hour}:${min}`;
}
