import type { GameInstance, GameMetadata, GameMountContext } from '../types/game';
import {
  CATEGORY_FILTERS,
  COMING_SOON_GAMES,
  GAMES,
  getGameById,
  matchesCategory,
  type CategoryFilterId,
} from '../games/registry';
import { GensokyoBackdrop } from '../shared/backdrop';
import {
  BACK_ICON_SVG,
  CLOSE_ICON_SVG,
  HELP_ICON_SVG,
  HERO_MAGIC_CIRCLE_SVG,
  HERO_SHRINE_ART_SVG,
  HERO_YIN_YANG_SVG,
  PAUSE_ICON_SVG,
  PLAY_ICON_SVG,
  RESTART_ICON_SVG,
  SEARCH_ICON_SVG,
  SOUND_OFF_SVG,
  SOUND_ON_SVG,
  SPARKLE_ICON_SVG,
  TORII_ICON_SVG,
  TROPHY_ICON_SVG,
  YIN_YANG_SVG,
} from '../shared/icons';
import { formatRecordDate, formatScore, storage } from '../shared/storage';

interface ActiveGameState {
  game: GameMetadata;
  instance: GameInstance;
  container: HTMLElement;
  isPaused: boolean;
  runEnded: boolean;
  initialBest: number;
  lastSavedScore: number | null;
  lastSavedAt: number;
  cleanupListeners: Array<() => void>;
}

function detectGamePaused(gameId: GameMetadata['id'], container: HTMLElement): boolean {
  if (gameId === 'suika') {
    const resumeBtn = container.querySelector('[data-action="resume"]');
    const overlay = resumeBtn?.closest('.suika-overlay');
    return Boolean(overlay?.classList.contains('visible'));
  }
  if (gameId === 'puyo') {
    const overlay = container.querySelector('[data-overlay="pause"]');
    return Boolean(overlay && !overlay.classList.contains('hidden'));
  }
  if (gameId === 'flappy') {
    const overlays = container.querySelectorAll<HTMLElement>('.flappy-modal-overlay:not(.hidden)');
    for (const overlay of overlays) {
      const kicker = overlay.querySelector('.flappy-card-kicker')?.textContent?.trim().toUpperCase();
      if (kicker === 'PAUSED') return true;
    }
    return false;
  }
  return false;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function parseRoute(): { view: 'home' } | { view: 'game'; gameId: string } {
  const raw = window.location.hash.replace(/^#/, '').trim();
  const match = raw.match(/^\/?game\/([a-z0-9_-]+)\/?$/i);
  if (match) {
    return { view: 'game', gameId: match[1].toLowerCase() };
  }
  return { view: 'home' };
}

function navigateTo(hash: string): void {
  const normalized = hash.startsWith('#') ? hash : `#${hash}`;
  if (window.location.hash === normalized) {
    return;
  }
  window.location.hash = normalized;
}

export class GensokyoPortalApp {
  private root: HTMLElement;
  private viewHost: HTMLDivElement;
  private modalHost: HTMLDivElement;
  private backdrop: GensokyoBackdrop | null = null;
  private activeGame: ActiveGameState | null = null;
  private selectedCategory: CategoryFilterId = 'all';
  private searchQuery = '';
  private modalOpen: 'records' | 'help' | null = null;
  private pausedByHelp = false;
  private confirmClearTarget: string | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.root.innerHTML = '';

    const canvas = document.createElement('canvas');
    canvas.className = 'gensokyo-backdrop-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    this.root.appendChild(canvas);

    const pattern = document.createElement('div');
    pattern.className = 'shrine-pattern-overlay';
    pattern.setAttribute('aria-hidden', 'true');
    this.root.appendChild(pattern);

    this.viewHost = document.createElement('div');
    this.root.appendChild(this.viewHost);

    this.modalHost = document.createElement('div');
    this.root.appendChild(this.modalHost);

    try {
      this.backdrop = new GensokyoBackdrop(canvas);
    } catch {
      this.backdrop = null;
    }

    window.addEventListener('hashchange', this.handleRouteChange);
    window.addEventListener('keydown', this.handleGlobalKeyDown, true);

    this.handleRouteChange();
  }

  private handleGlobalKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.modalOpen !== null) {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.closeModal();
      return;
    }

    // Prevent accidental page scrolling or topbar focus clicks during active gameplay
    if (this.activeGame !== null && this.modalOpen === null) {
      const target = event.target as HTMLElement | null;
      const isEditable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        Boolean(target?.isContentEditable);
      if (isEditable) return;

      const isScrollKey =
        event.key === 'ArrowUp' ||
        event.key === 'ArrowDown' ||
        event.key === 'ArrowLeft' ||
        event.key === 'ArrowRight' ||
        event.key === ' ' ||
        event.code === 'Space';
      if (isScrollKey) {
        const isTopbarButton = Boolean(target?.closest('.stage-topbar button'));
        if (!isTopbarButton || event.key !== ' ') {
          event.preventDefault();
        }
      }
    }
  };

  private handleRouteChange = (): void => {
    this.closeModal(false);
    const route = parseRoute();
    if (route.view === 'game') {
      const game = getGameById(route.gameId);
      if (game) {
        this.renderGameStage(game);
        return;
      }
      navigateTo('#/');
    }
    this.renderHome();
  };

  private unmountActiveGame(): void {
    if (!this.activeGame) return;
    const prev = this.activeGame;
    this.activeGame = null;
    this.pausedByHelp = false;

    for (const unsub of prev.cleanupListeners) {
      try {
        unsub();
      } catch {
        // Ignore cleanup errors
      }
    }
    try {
      prev.instance.destroy();
    } catch (err) {
      console.error(`Error destroying game "${prev.game.id}":`, err);
    }
  }

  /* ==================== HOME VIEW ==================== */

  private renderHome(): void {
    this.unmountActiveGame();
    document.body.classList.remove('stage-locked');
    document.title = '博丽神社游艺厅 · 东方同人小游戏合集';
    this.backdrop?.setPaused(false);

    const totalPlays = storage.getTotalPlayCount();
    const totalBest = storage.getTotalBestScore(GAMES.map((g) => g.id));
    const lastPlayedId = storage.getLastPlayedGameId();
    const quickGame = (lastPlayedId ? getGameById(lastPlayedId) : undefined) ?? GAMES[0];
    const muted = storage.isMuted();

    this.viewHost.innerHTML = `
      <div class="portal-shell view-enter-home">
        <header class="portal-header">
          <div class="portal-header-inner">
            <a class="brand-link" href="#/" aria-label="博丽神社游艺厅首页">
              <span class="brand-orb">${YIN_YANG_SVG}</span>
              <span class="brand-text">
                <span class="brand-title">博丽神社游艺厅</span>
                <span class="brand-sub">Gensokyo Mini-Games Hub</span>
              </span>
            </a>
            <div class="header-actions">
              <button type="button" class="btn btn-gold" data-action="open-records">
                ${TROPHY_ICON_SVG}
                <span class="header-btn-label">赛钱箱战绩榜</span>
              </button>
              <button
                type="button"
                class="btn btn-ghost ${muted ? 'is-active' : ''}"
                data-action="toggle-mute"
                aria-label="${muted ? '取消静音' : '静音'}"
                title="${muted ? '音效已静音（点击开启）' : '音效开启（点击静音）'}"
              >
                ${muted ? SOUND_OFF_SVG : SOUND_ON_SVG}
                <span class="header-btn-label">${muted ? '已静音' : '音效开'}</span>
              </button>
            </div>
          </div>
        </header>

        <main class="portal-main">
          <section class="hero-banner" aria-label="游艺厅欢迎横幅">
            <div class="hero-shrine-stripe"></div>
            <div class="hero-shrine-art" aria-hidden="true">${HERO_SHRINE_ART_SVG}</div>
            <div class="hero-grid">
              <div class="hero-content">
                <div class="hero-kicker">
                  ${TORII_ICON_SVG}
                  <span>博丽大结界 · 幻想乡同人游艺厅</span>
                </div>
                <h1 class="hero-title">闲暇奉纳赛钱，共游幻想之境</h1>
                <p class="hero-desc">
                  精选东方 Project 主题经典小游戏——合成伊吹萃香大西瓜、触发符卡连锁魔法气泡、随射命丸文疾飞迷途竹林。纯前端零延迟即开即玩，每局战绩自动封存于本地赛钱箱。
                </p>
                <div class="hero-cta-row">
                  <button
                    type="button"
                    class="btn btn-primary hero-cta-primary"
                    data-action="quick-play"
                    data-game-id="${escapeHtml(quickGame.id)}"
                  >
                    ${PLAY_ICON_SVG}
                    <span>${lastPlayedId && quickGame ? `继续游玩 · ${escapeHtml(quickGame.title)}` : '立即开玩'}</span>
                  </button>
                  <button type="button" class="btn btn-gold" data-action="random-play">
                    ${SPARKLE_ICON_SVG}
                    <span>御神签随机一局</span>
                  </button>
                  <button type="button" class="btn btn-ghost" data-action="open-records">
                    ${TROPHY_ICON_SVG}
                    <span>查看赛钱箱战绩</span>
                  </button>
                </div>
                <div class="hero-stats">
                  <div class="stat-plaque">
                    <span class="stat-plaque-label">累计局数</span>
                    <span class="stat-plaque-value" data-stat="total-plays">${formatScore(totalPlays)}</span>
                  </div>
                  <div class="stat-plaque">
                    <span class="stat-plaque-label">最高分合计</span>
                    <span class="stat-plaque-value" data-stat="total-best">${formatScore(totalBest)}</span>
                  </div>
                  <div class="stat-plaque">
                    <span class="stat-plaque-label">开放机台</span>
                    <span class="stat-plaque-value">${GAMES.length} 款</span>
                  </div>
                </div>
              </div>
              <div class="hero-emblem-wrap" aria-hidden="true">
                <div class="hero-magic-circle">${HERO_MAGIC_CIRCLE_SVG}</div>
                <div class="hero-emblem-orb">${HERO_YIN_YANG_SVG}</div>
              </div>
            </div>
          </section>

          <section aria-label="游艺机台列表">
            <div class="games-toolbar-header">
              <div class="section-title-group">
                <h2 class="section-title">境内游艺机台</h2>
                <p class="section-subtitle">支持键盘、鼠标与触屏操控，即点即玩</p>
              </div>
              <div class="filter-toolbar">
                <div class="filter-tabs" role="tablist" aria-label="游戏分类筛选">
                  ${CATEGORY_FILTERS.map(
                    (cat) => `
                    <button
                      type="button"
                      role="tab"
                      aria-selected="${this.selectedCategory === cat.id}"
                      class="filter-tab ${this.selectedCategory === cat.id ? 'is-active' : ''}"
                      data-filter-cat="${cat.id}"
                    >
                      ${escapeHtml(cat.label)}
                    </button>`,
                  ).join('')}
                </div>
                <label class="search-box" aria-label="搜索游戏">
                  <span class="search-box-icon">${SEARCH_ICON_SVG}</span>
                  <input
                    type="search"
                    class="search-input"
                    placeholder="搜索游戏、角色或标签…"
                    value="${escapeHtml(this.searchQuery)}"
                    data-role="search-input"
                  />
                  <button
                    type="button"
                    class="search-clear-btn"
                    data-action="clear-search"
                    aria-label="清空搜索"
                    ${this.searchQuery ? '' : 'hidden'}
                  >
                    ${CLOSE_ICON_SVG}
                  </button>
                </label>
              </div>
            </div>

            <div class="games-grid" data-role="games-grid">
              ${this.renderGameCardsMarkup()}
            </div>
          </section>

          <section class="coming-soon-section" aria-label="幻想乡后续企划">
            <div class="section-header">
              <div class="section-title-group">
                <h2 class="section-title">幻想乡后续企划</h2>
                <p class="section-subtitle">更多东方同人玩法筹备中，随时可按统一接口无缝扩展上线</p>
              </div>
              <span class="arch-pill">
                ${SPARKLE_ICON_SVG}
                <span>插件化接入：<code>src/games/registry.ts</code></span>
              </span>
            </div>

            <div class="coming-soon-grid">
              ${COMING_SOON_GAMES.map(
                (item) => `
                <article class="coming-card">
                  <div class="coming-card-cover">
                    ${item.coverSvg}
                    <span class="ofuda-seal">${escapeHtml(item.statusLabel)}</span>
                  </div>
                  <div class="coming-card-body">
                    <h3 class="coming-card-title">${escapeHtml(item.title)}</h3>
                    <div class="coming-card-meta">${escapeHtml(item.characterName)} · ${escapeHtml(item.englishTitle)}</div>
                    <p class="coming-card-desc">${escapeHtml(item.description)}</p>
                    <div class="game-tags">
                      ${item.tags.map((t) => `<span class="tag-pill">${escapeHtml(t)}</span>`).join('')}
                    </div>
                  </div>
                </article>`,
              ).join('')}
            </div>
          </section>
        </main>

        <footer class="portal-footer">
          <div><strong>博丽神社游艺厅 · Gensokyo Mini-Games Hub</strong></div>
          <div>东方 Project 二次创作同人小游戏合集 · 原作：上海爱丽丝幻乐团 (ZUN) · 纯前端静态运行，战绩保存于浏览器本地</div>
        </footer>
      </div>
    `;

    this.bindHomeEvents();
  }

  private renderGameCardsMarkup(): string {
    const query = this.searchQuery.trim().toLowerCase();
    const filtered = GAMES.filter((game) => {
      if (!matchesCategory(game, this.selectedCategory)) return false;
      if (!query) return true;
      const haystack = [
        game.title,
        game.subtitle,
        game.englishTitle,
        game.characterName,
        game.description,
        game.difficulty,
        ...game.tags,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });

    if (filtered.length === 0) {
      return `
        <div class="empty-filter-state">
          <p>未找到与「${escapeHtml(this.searchQuery || CATEGORY_FILTERS.find((c) => c.id === this.selectedCategory)?.label || '')}」匹配的游艺机台。</p>
          <button type="button" class="btn btn-gold btn-sm" data-action="reset-filters">显示全部游戏</button>
        </div>
      `;
    }

    return filtered
      .map((game) => {
        const rec = storage.getGameRecord(game.id);
        const bestLabel = rec.bestScore > 0 ? formatScore(rec.bestScore) : '尚无纪录';
        const subMeta = rec.bestExtra
          ? rec.bestExtra
          : rec.playCount > 0
            ? `已游玩 ${rec.playCount} 局`
            : '点击开启首局';
        const subtitleLine =
          game.subtitle.trim().toLowerCase() === game.englishTitle.trim().toLowerCase()
            ? game.subtitle
            : `${game.subtitle} · ${game.englishTitle}`;
        return `
          <article
            class="game-card"
            style="--card-theme: ${escapeHtml(game.themeColor)}; --card-accent: ${escapeHtml(game.accentColor)};"
          >
            <span class="card-corner card-corner-tl" aria-hidden="true"></span>
            <span class="card-corner card-corner-tr" aria-hidden="true"></span>
            <span class="card-corner card-corner-bl" aria-hidden="true"></span>
            <span class="card-corner card-corner-br" aria-hidden="true"></span>
            <div
              class="game-card-cover"
              data-action="play-game"
              data-game-id="${escapeHtml(game.id)}"
              role="button"
              tabindex="0"
              aria-label="游玩 ${escapeHtml(game.title)}"
            >
              ${game.coverSvg}
              <div class="cover-badges">
                <span class="char-badge">
                  <span class="char-dot"></span>
                  <span>${escapeHtml(game.characterName)}</span>
                </span>
                <span class="diff-badge">${escapeHtml(game.difficulty)}</span>
              </div>
            </div>
            <div class="game-card-body">
              <div class="game-card-head">
                <h3 class="game-card-title">${escapeHtml(game.title)}</h3>
                <p class="game-card-subtitle">${escapeHtml(subtitleLine)}</p>
              </div>
              <p class="game-card-desc">${escapeHtml(game.description)}</p>
              <div class="game-tags">
                ${game.tags.map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`).join('')}
              </div>
              <div class="game-card-footer">
                <div class="card-record-box">
                  <span class="card-record-label">本地最高分</span>
                  <span class="card-record-value">${bestLabel}</span>
                  <span class="card-record-extra" title="${escapeHtml(subMeta)}">${escapeHtml(subMeta)}</span>
                </div>
                <button
                  type="button"
                  class="btn btn-primary"
                  data-action="play-game"
                  data-game-id="${escapeHtml(game.id)}"
                >
                  ${PLAY_ICON_SVG}
                  <span>开始游玩</span>
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join('');
  }

  private refreshHomeCards(): void {
    const grid = this.viewHost.querySelector<HTMLElement>('[data-role="games-grid"]');
    if (grid) {
      grid.innerHTML = this.renderGameCardsMarkup();
    }
    const clearBtn = this.viewHost.querySelector<HTMLButtonElement>('[data-action="clear-search"]');
    if (clearBtn) {
      clearBtn.hidden = !this.searchQuery;
    }
    this.viewHost.querySelectorAll<HTMLButtonElement>('[data-filter-cat]').forEach((btn) => {
      const active = btn.dataset.filterCat === this.selectedCategory;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
    });
  }

  private bindHomeEvents(): void {
    const shell = this.viewHost.querySelector('.portal-shell');
    if (!shell) return;

    shell.addEventListener('click', (event) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-action], [data-filter-cat]');
      if (!target) return;

      const filterCat = target.dataset.filterCat as CategoryFilterId | undefined;
      if (filterCat) {
        this.selectedCategory = filterCat;
        this.refreshHomeCards();
        return;
      }

      const action = target.dataset.action;
      if (action === 'play-game' || action === 'quick-play') {
        const gameId = target.dataset.gameId;
        if (gameId) {
          navigateTo(`#/game/${gameId}`);
        }
      } else if (action === 'random-play') {
        const chosen = GAMES[Math.floor(Math.random() * GAMES.length)];
        if (chosen) {
          navigateTo(`#/game/${chosen.id}`);
        }
      } else if (action === 'open-records') {
        this.openRecordsModal();
      } else if (action === 'toggle-mute') {
        const muted = storage.toggleMuted();
        target.classList.toggle('is-active', muted);
        target.setAttribute('aria-label', muted ? '取消静音' : '静音');
        target.setAttribute('title', muted ? '音效已静音（点击开启）' : '音效开启（点击静音）');
        target.innerHTML = `${muted ? SOUND_OFF_SVG : SOUND_ON_SVG}<span class="header-btn-label">${muted ? '已静音' : '音效开'}</span>`;
      } else if (action === 'clear-search') {
        this.searchQuery = '';
        const input = this.viewHost.querySelector<HTMLInputElement>('[data-role="search-input"]');
        if (input) {
          input.value = '';
          input.focus();
        }
        this.refreshHomeCards();
      } else if (action === 'reset-filters') {
        this.selectedCategory = 'all';
        this.searchQuery = '';
        const input = this.viewHost.querySelector<HTMLInputElement>('[data-role="search-input"]');
        if (input) input.value = '';
        this.refreshHomeCards();
      }
    });

    shell.addEventListener('keydown', (event) => {
      const e = event as KeyboardEvent;
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const cover = (e.target as HTMLElement | null)?.closest<HTMLElement>('.game-card-cover[data-game-id]');
      if (cover?.dataset.gameId) {
        e.preventDefault();
        navigateTo(`#/game/${cover.dataset.gameId}`);
      }
    });

    const searchInput = shell.querySelector<HTMLInputElement>('[data-role="search-input"]');
    searchInput?.addEventListener('input', () => {
      this.searchQuery = searchInput.value;
      this.refreshHomeCards();
    });
  }

  /* ==================== GAME STAGE VIEW ==================== */

  private renderGameStage(game: GameMetadata): void {
    this.unmountActiveGame();
    document.body.classList.add('stage-locked');
    document.title = `${game.title} · 博丽神社游艺厅`;
    this.backdrop?.setPaused(true);

    storage.recordPlayStart(game.id);
    const initialBest = storage.getBestScore(game.id);
    const muted = storage.isMuted();

    this.viewHost.innerHTML = `
      <div class="stage-shell view-enter-stage">
        <header class="stage-topbar">
          <div class="stage-left">
            <button type="button" class="btn btn-ghost btn-sm" data-stage-action="back" title="返回大厅">
              ${BACK_ICON_SVG}
              <span class="stage-btn-label">返回大厅</span>
            </button>
            <div class="stage-game-meta">
              <h1 class="stage-game-title">${escapeHtml(game.title)}</h1>
              <span class="stage-char-pill">${escapeHtml(game.characterName)}</span>
            </div>
          </div>

          <div class="stage-hud" aria-live="polite">
            <div class="hud-pill">
              <span class="hud-label">得分</span>
              <span class="hud-value" data-hud="score">0</span>
            </div>
            <div class="hud-pill hud-pill-best">
              <span class="hud-label">最高</span>
              <span class="hud-value" data-hud="best">${formatScore(initialBest)}</span>
              <span class="hud-new-tag" data-hud="new-tag" hidden>NEW</span>
            </div>
            <div class="hud-pill hud-pill-extra" data-hud="extra" hidden></div>
          </div>

          <div class="stage-controls">
            <button type="button" class="btn btn-ghost btn-sm btn-icon" data-stage-action="pause" title="暂停 / 继续">
              ${PAUSE_ICON_SVG}
              <span class="stage-btn-label">暂停</span>
            </button>
            <button type="button" class="btn btn-ghost btn-sm btn-icon" data-stage-action="restart" title="重新开始">
              ${RESTART_ICON_SVG}
              <span class="stage-btn-label">重开</span>
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-icon ${muted ? 'is-active' : ''}"
              data-stage-action="mute"
              title="${muted ? '音效已静音' : '音效开启'}"
              aria-label="${muted ? '取消静音' : '静音'}"
            >
              ${muted ? SOUND_OFF_SVG : SOUND_ON_SVG}
            </button>
            <button type="button" class="btn btn-gold btn-sm btn-icon" data-stage-action="help" title="操作说明">
              ${HELP_ICON_SVG}
              <span class="stage-btn-label">说明</span>
            </button>
          </div>
        </header>

        <main class="stage-main">
          <div class="stage-container stage-canvas-host" data-role="stage-container"></div>
        </main>
      </div>
    `;

    const container = this.viewHost.querySelector<HTMLElement>('[data-role="stage-container"]');
    const scoreEl = this.viewHost.querySelector<HTMLElement>('[data-hud="score"]');
    const bestEl = this.viewHost.querySelector<HTMLElement>('[data-hud="best"]');
    const newTagEl = this.viewHost.querySelector<HTMLElement>('[data-hud="new-tag"]');
    const extraEl = this.viewHost.querySelector<HTMLElement>('[data-hud="extra"]');
    const pauseBtn = this.viewHost.querySelector<HTMLButtonElement>('[data-stage-action="pause"]');
    const restartBtn = this.viewHost.querySelector<HTMLButtonElement>('[data-stage-action="restart"]');
    const muteBtn = this.viewHost.querySelector<HTMLButtonElement>('[data-stage-action="mute"]');
    const helpBtn = this.viewHost.querySelector<HTMLButtonElement>('[data-stage-action="help"]');
    const backBtn = this.viewHost.querySelector<HTMLButtonElement>('[data-stage-action="back"]');

    if (!container) return;

    const cleanupListeners: Array<() => void> = [];
    let isMounted = true;
    cleanupListeners.push(() => {
      isMounted = false;
    });

    const handleStageContextMenu = (event: MouseEvent): void => {
      const target = event.target as HTMLElement | null;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      event.preventDefault();
    };
    container.addEventListener('contextmenu', handleStageContextMenu);
    cleanupListeners.push(() => container.removeEventListener('contextmenu', handleStageContextMenu));

    const runTracker = {
      runEnded: false,
      initialBest,
      lastSavedScore: null as number | null,
      lastSavedAt: 0,
    };

    const updateHud = (score: number, best: number, extra?: string): void => {
      const cleanScore = Math.max(0, Math.floor(Number.isFinite(score) ? score : 0));
      const storedBest = storage.getBestScore(game.id);
      const displayBest = Math.max(
        storedBest,
        Math.max(0, Math.floor(Number.isFinite(best) ? best : 0)),
        cleanScore,
      );
      if (scoreEl) scoreEl.textContent = formatScore(cleanScore);
      if (bestEl) bestEl.textContent = formatScore(displayBest);
      if (newTagEl) {
        newTagEl.hidden = !(cleanScore > 0 && cleanScore > runTracker.initialBest);
      }
      if (extraEl) {
        const text = extra?.trim() ?? '';
        if (text) {
          extraEl.textContent = text;
          extraEl.title = text;
          extraEl.hidden = false;
        } else if (extra !== undefined) {
          extraEl.textContent = '';
          extraEl.hidden = true;
        }
      }
    };

    const persistScoreOnce = (rawScore: number, extra?: string): void => {
      if (!isMounted) return;
      const cleanScore = Math.max(0, Math.floor(Number.isFinite(rawScore) ? rawScore : 0));
      const now = Date.now();
      if (runTracker.lastSavedScore === cleanScore && now - runTracker.lastSavedAt < 1800) {
        return;
      }
      runTracker.lastSavedScore = cleanScore;
      runTracker.lastSavedAt = now;
      const result = storage.saveScore(game.id, cleanScore, extra);
      updateHud(cleanScore, result.best, extra);
    };

    const ctx: GameMountContext = {
      container,
      onScoreChange: (score, best, extra) => {
        if (!isMounted) return;
        if (runTracker.runEnded && score === 0) {
          runTracker.runEnded = false;
          runTracker.initialBest = storage.getBestScore(game.id);
          runTracker.lastSavedScore = null;
          storage.recordPlayStart(game.id);
        }
        updateHud(score, best, extra);
      },
      onGameOver: (finalScore, extra) => {
        if (!isMounted) return;
        runTracker.runEnded = true;
        persistScoreOnce(finalScore, extra);
      },
      getBestScore: () => storage.getBestScore(game.id),
      saveScore: (score, extra) => {
        persistScoreOnce(score, extra);
      },
      isMuted: () => storage.isMuted(),
      onMuteChange: (cb) => {
        const unsub = storage.onMuteChange(cb);
        cleanupListeners.push(unsub);
        return () => {
          unsub();
          const idx = cleanupListeners.indexOf(unsub);
          if (idx >= 0) cleanupListeners.splice(idx, 1);
        };
      },
      onBackToMenu: () => {
        navigateTo('#/');
      },
    };

    const instance = game.mount(ctx);

    this.activeGame = {
      game,
      instance,
      container,
      isPaused: detectGamePaused(game.id, container),
      runEnded: runTracker.runEnded,
      initialBest: runTracker.initialBest,
      lastSavedScore: runTracker.lastSavedScore,
      lastSavedAt: runTracker.lastSavedAt,
      cleanupListeners,
    };

    const syncPauseButton = (): void => {
      if (!pauseBtn || !this.activeGame) return;
      const paused = detectGamePaused(game.id, container);
      this.activeGame.isPaused = paused;
      pauseBtn.classList.toggle('is-active', paused);
      pauseBtn.innerHTML = paused
        ? `${PLAY_ICON_SVG}<span class="stage-btn-label">继续</span>`
        : `${PAUSE_ICON_SVG}<span class="stage-btn-label">暂停</span>`;
    };

    const pauseObserver = new MutationObserver(() => {
      if (!isMounted) return;
      syncPauseButton();
    });
    pauseObserver.observe(container, {
      attributes: true,
      attributeFilter: ['class'],
      subtree: true,
      childList: true,
    });
    cleanupListeners.push(() => pauseObserver.disconnect());

    if (pauseBtn) {
      if (typeof instance.setPaused !== 'function') {
        pauseBtn.hidden = true;
      } else {
        syncPauseButton();
        pauseBtn.addEventListener('click', () => {
          if (!this.activeGame || typeof this.activeGame.instance.setPaused !== 'function') return;
          const currentlyPaused = detectGamePaused(game.id, container);
          this.activeGame.instance.setPaused(!currentlyPaused);
          syncPauseButton();
          pauseBtn.blur();
        });
      }
    }

    restartBtn?.addEventListener('click', () => {
      if (!this.activeGame) return;
      runTracker.runEnded = false;
      runTracker.lastSavedScore = null;
      runTracker.initialBest = storage.getBestScore(game.id);
      this.activeGame.isPaused = false;
      storage.recordPlayStart(game.id);
      if (extraEl) {
        extraEl.textContent = '';
        extraEl.hidden = true;
      }
      updateHud(0, runTracker.initialBest);
      this.activeGame.instance.restart();
      syncPauseButton();
      restartBtn.blur();
    });

    muteBtn?.addEventListener('click', () => {
      const nextMuted = storage.toggleMuted();
      muteBtn.classList.toggle('is-active', nextMuted);
      muteBtn.innerHTML = nextMuted ? SOUND_OFF_SVG : SOUND_ON_SVG;
      muteBtn.title = nextMuted ? '音效已静音' : '音效开启';
      muteBtn.setAttribute('aria-label', nextMuted ? '取消静音' : '静音');
      muteBtn.blur();
    });

    helpBtn?.addEventListener('click', () => {
      helpBtn.blur();
      this.openHelpModal(game, syncPauseButton);
    });

    backBtn?.addEventListener('click', () => {
      navigateTo('#/');
    });
  }

  /* ==================== MODALS ==================== */

  private openRecordsModal(): void {
    this.modalOpen = 'records';
    this.confirmClearTarget = null;
    this.renderRecordsModal();
  }

  private renderRecordsModal(): void {
    const totalPlays = storage.getTotalPlayCount();
    const totalBest = storage.getTotalBestScore(GAMES.map((g) => g.id));
    const lastActive = storage.getLastActivityDate();

    this.modalHost.innerHTML = `
      <div class="modal-backdrop" data-modal-backdrop>
        <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="records-modal-title">
          <div class="modal-header">
            <h2 class="modal-title" id="records-modal-title">
              ${TROPHY_ICON_SVG}
              <span>赛钱箱战绩榜</span>
            </h2>
            <button type="button" class="modal-close-btn" data-modal-close aria-label="关闭">
              ${CLOSE_ICON_SVG}
            </button>
          </div>

          <div class="modal-body">
            <div class="records-summary">
              <div class="stat-plaque">
                <span class="stat-plaque-label">累计游玩</span>
                <span class="stat-plaque-value">${formatScore(totalPlays)} 局</span>
              </div>
              <div class="stat-plaque">
                <span class="stat-plaque-label">总最高分</span>
                <span class="stat-plaque-value">${formatScore(totalBest)}</span>
              </div>
              <div class="stat-plaque">
                <span class="stat-plaque-label">最近游玩</span>
                <span class="stat-plaque-value" style="font-size: 0.96rem;">${lastActive ? formatRecordDate(lastActive) : '暂无'}</span>
              </div>
            </div>

            ${GAMES.map((game) => {
              const rec = storage.getGameRecord(game.id);
              const confirming = this.confirmClearTarget === game.id;
              return `
                <section class="records-game-card">
                  <div class="records-game-head">
                    <div class="records-game-title-wrap">
                      <h3 class="records-game-title">${escapeHtml(game.title)}</h3>
                      <span class="stage-char-pill">${escapeHtml(game.characterName)}</span>
                    </div>
                    ${
                      rec.playCount > 0 || rec.bestScore > 0 || rec.history.length > 0
                        ? `<button
                            type="button"
                            class="btn btn-sm ${confirming ? 'btn-danger-confirm' : 'btn-danger-outline'}"
                            data-clear-game="${escapeHtml(game.id)}"
                          >
                            ${confirming ? '再次点击确认清除' : '清除此项'}
                          </button>`
                        : ''
                    }
                  </div>
                  <div class="records-best-line">
                    <span>最高分：<strong class="records-best-score">${formatScore(rec.bestScore)}</strong></span>
                    <span>局数：${formatScore(rec.playCount)}</span>
                    ${rec.bestExtra ? `<span>最佳达成：${escapeHtml(rec.bestExtra)}</span>` : ''}
                  </div>
                  ${
                    rec.history.length > 0
                      ? `<ul class="records-history-list">
                          ${rec.history
                            .slice(0, 6)
                            .map(
                              (entry, idx) => `
                            <li class="records-history-item">
                              <span class="history-score">#${idx + 1} · ${formatScore(entry.score)} 分</span>
                              <span class="history-extra">${entry.extra ? escapeHtml(entry.extra) : '—'}</span>
                              <span class="history-date">${formatRecordDate(entry.date)}</span>
                            </li>`,
                            )
                            .join('')}
                        </ul>`
                      : `<div class="records-empty">赛钱箱中尚无历史战绩，快去挑战一局吧！</div>`
                  }
                </section>
              `;
            }).join('')}
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-sm ${this.confirmClearTarget === '__all__' ? 'btn-danger-confirm' : 'btn-danger-outline'}"
              data-clear-all
            >
              ${this.confirmClearTarget === '__all__' ? '确认清空全部战绩？' : '清空全部本地记录'}
            </button>
            <button type="button" class="btn btn-primary btn-sm" data-modal-close>关闭战绩榜</button>
          </div>
        </div>
      </div>
    `;

    const backdropEl = this.modalHost.querySelector<HTMLElement>('[data-modal-backdrop]');
    backdropEl?.addEventListener('click', (event) => {
      if (event.target === backdropEl) {
        this.closeModal();
        return;
      }
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        '[data-modal-close], [data-clear-game], [data-clear-all]',
      );
      if (!target) return;

      if (target.hasAttribute('data-modal-close')) {
        this.closeModal();
        return;
      }

      const clearGameId = target.dataset.clearGame;
      if (clearGameId) {
        if (this.confirmClearTarget === clearGameId) {
          storage.clearGameRecord(clearGameId);
          this.confirmClearTarget = null;
          this.renderRecordsModal();
          this.syncHomeStatsAfterClear();
        } else {
          this.confirmClearTarget = clearGameId;
          this.renderRecordsModal();
        }
        return;
      }

      if (target.hasAttribute('data-clear-all')) {
        if (this.confirmClearTarget === '__all__') {
          storage.clearAllRecords();
          this.confirmClearTarget = null;
          this.renderRecordsModal();
          this.syncHomeStatsAfterClear();
        } else {
          this.confirmClearTarget = '__all__';
          this.renderRecordsModal();
        }
      }
    });
  }

  private syncHomeStatsAfterClear(): void {
    if (this.activeGame) return;
    const totalPlaysEl = this.viewHost.querySelector<HTMLElement>('[data-stat="total-plays"]');
    const totalBestEl = this.viewHost.querySelector<HTMLElement>('[data-stat="total-best"]');
    if (totalPlaysEl) totalPlaysEl.textContent = formatScore(storage.getTotalPlayCount());
    if (totalBestEl) totalBestEl.textContent = formatScore(storage.getTotalBestScore(GAMES.map((g) => g.id)));
    this.refreshHomeCards();
  }

  private openHelpModal(game: GameMetadata, onPauseSync: () => void): void {
    this.modalOpen = 'help';
    this.pausedByHelp = false;

    if (
      this.activeGame &&
      !detectGamePaused(this.activeGame.game.id, this.activeGame.container) &&
      typeof this.activeGame.instance.setPaused === 'function'
    ) {
      this.activeGame.instance.setPaused(true);
      const actuallyPaused = detectGamePaused(this.activeGame.game.id, this.activeGame.container);
      this.activeGame.isPaused = actuallyPaused;
      this.pausedByHelp = actuallyPaused;
      onPauseSync();
    }

    this.modalHost.innerHTML = `
      <div class="modal-backdrop" data-modal-backdrop>
        <div class="modal-panel modal-panel-sm" role="dialog" aria-modal="true" aria-labelledby="help-modal-title">
          <div class="modal-header">
            <h2 class="modal-title" id="help-modal-title">
              ${HELP_ICON_SVG}
              <span>操作说明 · ${escapeHtml(game.title)}</span>
            </h2>
            <button type="button" class="modal-close-btn" data-modal-close aria-label="关闭">
              ${CLOSE_ICON_SVG}
            </button>
          </div>

          <div class="modal-body">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span class="stage-char-pill">${escapeHtml(game.characterName)}</span>
              <span class="diff-badge">${escapeHtml(game.difficulty)}</span>
            </div>
            <p class="game-card-desc" style="margin:0;">${escapeHtml(game.description)}</p>
            <ul class="help-controls-list">
              ${game.controls.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}
            </ul>
          </div>

          <div class="modal-footer" style="justify-content:flex-end;">
            <button type="button" class="btn btn-primary btn-sm" data-modal-close>知道了，继续游戏</button>
          </div>
        </div>
      </div>
    `;

    const backdropEl = this.modalHost.querySelector<HTMLElement>('[data-modal-backdrop]');
    backdropEl?.addEventListener('click', (event) => {
      if (
        event.target === backdropEl ||
        (event.target as HTMLElement | null)?.closest('[data-modal-close]')
      ) {
        this.closeModal(true, onPauseSync);
      }
    });
  }

  private closeModal(resumeIfHelpPaused = true, onPauseSync?: () => void): void {
    const wasHelp = this.modalOpen === 'help';
    this.modalOpen = null;
    this.confirmClearTarget = null;
    this.modalHost.innerHTML = '';

    if (
      wasHelp &&
      resumeIfHelpPaused &&
      this.pausedByHelp &&
      this.activeGame &&
      typeof this.activeGame.instance.setPaused === 'function'
    ) {
      this.activeGame.isPaused = false;
      this.activeGame.instance.setPaused(false);
      this.pausedByHelp = false;
      if (onPauseSync) {
        onPauseSync();
      } else {
        const pauseBtn = this.viewHost.querySelector<HTMLButtonElement>('[data-stage-action="pause"]');
        if (pauseBtn) {
          pauseBtn.classList.remove('is-active');
          pauseBtn.innerHTML = `${PAUSE_ICON_SVG}<span class="stage-btn-label">暂停</span>`;
        }
      }
    }
  }
}
