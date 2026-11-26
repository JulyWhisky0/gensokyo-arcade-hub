import type { GameInstance, GameMountContext } from '../../types/game';
import { PuyoAudio } from './audio';
import { PuyoEngine } from './engine';
import { PuyoRenderer, getBoardAspectRows } from './renderer';
import { PUYO_STYLES } from './styles';
import {
  CHARACTERS,
  CHARACTER_ORDER,
  COLS,
  CharacterId,
  DIFFICULTIES,
  DifficultyId,
  GameMode,
  HudSnapshot,
} from './types';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getCharacterEmblemSvg(charId: CharacterId): string {
  if (charId === 'reimu') {
    return `<svg viewBox="0 0 28 28" width="22" height="22" aria-hidden="true">
      <circle cx="14" cy="14" r="11.5" fill="#fff5f7" stroke="#ff9cab" stroke-width="1.4"/>
      <path d="M14 2.5 A11.5 11.5 0 0 1 14 25.5 A5.75 5.75 0 0 1 14 14 A5.75 5.75 0 0 0 14 2.5 Z" fill="#d9223f"/>
      <circle cx="14" cy="8.25" r="2.2" fill="#d9223f"/>
      <circle cx="14" cy="19.75" r="2.2" fill="#fff5f7"/>
    </svg>`;
  }
  if (charId === 'marisa') {
    return `<svg viewBox="0 0 28 28" width="22" height="22" aria-hidden="true">
      <polygon points="14,2 17.4,9.6 25.6,10.5 19.4,16 21.1,24.2 14,20 6.9,24.2 8.6,16 2.4,10.5 10.6,9.6" fill="#ffd84d" stroke="#fff6bf" stroke-width="1.3" stroke-linejoin="round"/>
      <circle cx="14" cy="14" r="3" fill="#fffdf0"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 28 28" width="22" height="22" aria-hidden="true">
    <path d="M17.5 4.2 A10.5 10.5 0 1 0 17.5 23.8 A8.2 8.2 0 1 1 17.5 4.2 Z" fill="#d896ff" stroke="#f6e0ff" stroke-width="1.2"/>
    <polygon points="20.2,9.2 21.3,12 24.2,13 21.3,14 20.2,16.8 19.1,14 16.2,13 19.1,12" fill="#fff3ff"/>
  </svg>`;
}

export function mountPuyoGame(ctx: GameMountContext): GameInstance {
  ctx.container.innerHTML = '';

  const styleEl = document.createElement('style');
  styleEl.textContent = PUYO_STYLES;
  ctx.container.appendChild(styleEl);

  const stage = document.createElement('div');
  stage.className = 'puyo-stage';

  const diffPillsHtml = (['easy', 'normal', 'lunatic'] as DifficultyId[])
    .map((id) => {
      const d = DIFFICULTIES[id];
      return `
        <button type="button" class="puyo-pill-opt${id === 'normal' ? ' selected' : ''}" data-diff="${id}">
          <span class="puyo-pill-main">${escapeHtml(d.shortLabel)}</span>
          <span class="puyo-pill-dot" style="background:${d.badgeColor};">${d.colorCount}色</span>
        </button>
      `;
    })
    .join('');

  const charPillsHtml = CHARACTER_ORDER.map((id) => {
    const ch = CHARACTERS[id];
    return `
      <button type="button" class="puyo-char-opt${id === 'reimu' ? ' selected' : ''}" data-char="${id}" style="--char-accent:${ch.primaryColor};--char-glow:${ch.secondaryColor};">
        <span class="puyo-char-emblem">${getCharacterEmblemSvg(id)}</span>
        <span class="puyo-char-name">${escapeHtml(ch.shortName)}</span>
        <span class="puyo-char-tag">${escapeHtml(ch.skillTag)}</span>
      </button>
    `;
  }).join('');

  stage.innerHTML = `
    <div class="puyo-main">
      <div class="puyo-board-frame">
        <canvas class="puyo-board-canvas" aria-label="魔法森林噗哟噗哟棋盘"></canvas>
      </div>
      <aside class="puyo-sidebar">
        <div class="puyo-panel">
          <div class="puyo-panel-label">
            <span>NEXT</span>
            <span class="puyo-diff-pill" data-el="diff-pill">Normal</span>
          </div>
          <canvas class="puyo-preview-canvas" aria-label="下组预告"></canvas>
        </div>

        <div class="puyo-panel puyo-spell-panel" data-el="spell-panel">
          <div class="puyo-spell-head">
            <span class="puyo-spell-emblem" data-el="char-emblem">${getCharacterEmblemSvg('reimu')}</span>
            <div class="puyo-spell-meta">
              <span class="puyo-spell-char" data-el="char-name">灵梦</span>
              <span class="puyo-spell-pct" data-el="spirit-pct">0%</span>
            </div>
          </div>
          <div class="puyo-spirit-track" aria-label="灵力槽">
            <div class="puyo-spirit-fill" data-el="spirit-fill" style="width:0%"></div>
          </div>
          <button type="button" class="puyo-spell-btn" data-btn="spell" disabled>
            <span class="puyo-spell-btn-title" data-el="spell-title">梦想封印</span>
            <span class="puyo-spell-btn-key" data-el="spell-key">充能中</span>
          </button>
        </div>

        <div class="puyo-pills-panel">
          <div class="puyo-pill-stat">
            <span class="puyo-stat-k">连锁</span>
            <span class="puyo-stat-v chain" data-el="chain">0</span>
          </div>
          <div class="puyo-pill-stat">
            <span class="puyo-stat-k">速度</span>
            <span class="puyo-stat-v" data-el="speed">LV.1</span>
          </div>
          <div class="puyo-pill-stat wide" data-el="stage-pill">
            <span class="puyo-stat-k" data-el="stage-k">异变</span>
            <span class="puyo-stat-v gold" data-el="stage-v">S1 · 琪露诺</span>
          </div>
        </div>
      </aside>
    </div>

    <div class="puyo-mobile-pad">
      <div class="puyo-mobile-group">
        <button type="button" class="puyo-btn-ctrl" data-action="left" aria-label="左移">◀</button>
        <button type="button" class="puyo-btn-ctrl" data-action="down" aria-label="缓降">▼</button>
        <button type="button" class="puyo-btn-ctrl" data-action="right" aria-label="右移">▶</button>
      </div>
      <div class="puyo-mobile-group">
        <button type="button" class="puyo-btn-ctrl spell-mini" data-action="spell" data-el="mobile-spell" aria-label="释放符卡">✦</button>
        <button type="button" class="puyo-btn-ctrl accent" data-action="hard" aria-label="硬降">⚡</button>
        <button type="button" class="puyo-btn-ctrl" data-action="ccw" aria-label="逆转">↺</button>
        <button type="button" class="puyo-btn-ctrl" data-action="cw" aria-label="顺转">↻</button>
      </div>
    </div>

    <!-- Streamlined Start Menu Overlay -->
    <div class="puyo-overlay" data-overlay="menu">
      <div class="puyo-modal">
        <h2 class="puyo-modal-title">魔法森林噗哟噗哟</h2>

        <div class="puyo-section-label">模式</div>
        <div class="puyo-mode-row">
          <button type="button" class="puyo-mode-opt selected" data-mode="boss">
            <span class="puyo-mode-name">异变讨伐</span>
            <span class="puyo-mode-badge">BOSS</span>
          </button>
          <button type="button" class="puyo-mode-opt" data-mode="classic">
            <span class="puyo-mode-name">经典无尽</span>
            <span class="puyo-mode-badge subtle">无尽</span>
          </button>
        </div>

        <div class="puyo-section-label">难度</div>
        <div class="puyo-diff-row">${diffPillsHtml}</div>

        <div class="puyo-section-label">自机 · 主动符卡</div>
        <div class="puyo-char-row">${charPillsHtml}</div>

        <div class="puyo-action-row">
          <button type="button" class="puyo-cta" data-btn="start">开始异变讨伐</button>
        </div>
      </div>
    </div>

    <!-- Pause Overlay (preserves [data-overlay="pause"] + .hidden contract) -->
    <div class="puyo-overlay hidden" data-overlay="pause">
      <div class="puyo-modal compact">
        <h2 class="puyo-modal-title">结界暂停中</h2>
        <div class="puyo-action-row">
          <button type="button" class="puyo-cta" data-btn="resume">继续游戏</button>
          <button type="button" class="puyo-cta secondary" data-btn="pause-restart">重新开始</button>
          <button type="button" class="puyo-cta secondary" data-btn="pause-menu">更换配置</button>
        </div>
      </div>
    </div>

    <!-- Game Over Overlay -->
    <div class="puyo-overlay hidden" data-overlay="gameover">
      <div class="puyo-modal">
        <h2 class="puyo-modal-title">结界终结</h2>
        <p class="puyo-modal-sub" data-el="go-subtitle"></p>
        <div class="puyo-summary-grid">
          <div class="puyo-summary-item">
            <div class="puyo-stat-k">最终得分</div>
            <div class="puyo-stat-v gold" data-el="go-score">0</div>
          </div>
          <div class="puyo-summary-item">
            <div class="puyo-stat-k">最高纪录</div>
            <div class="puyo-stat-v" data-el="go-best">0</div>
          </div>
          <div class="puyo-summary-item">
            <div class="puyo-stat-k">最高连锁</div>
            <div class="puyo-stat-v chain" data-el="go-max-chain">0 连锁</div>
          </div>
          <div class="puyo-summary-item">
            <div class="puyo-stat-k" data-el="go-fourth-k">讨伐进度</div>
            <div class="puyo-stat-v" data-el="go-fourth-v">Stage 1</div>
          </div>
        </div>
        <div class="puyo-action-row">
          <button type="button" class="puyo-cta" data-btn="retry">再来一局 (R)</button>
          <button type="button" class="puyo-cta secondary" data-btn="go-diff">更换配置</button>
          <button type="button" class="puyo-cta secondary" data-btn="go-hub">返回大厅</button>
        </div>
      </div>
    </div>
  `;

  ctx.container.appendChild(stage);

  // Element references
  const boardCanvas = stage.querySelector<HTMLCanvasElement>('.puyo-board-canvas')!;
  const previewCanvas = stage.querySelector<HTMLCanvasElement>('.puyo-preview-canvas')!;
  const chainEl = stage.querySelector<HTMLElement>('[data-el="chain"]')!;
  const speedEl = stage.querySelector<HTMLElement>('[data-el="speed"]')!;
  const diffPillEl = stage.querySelector<HTMLElement>('[data-el="diff-pill"]')!;
  const stageKeyEl = stage.querySelector<HTMLElement>('[data-el="stage-k"]')!;
  const stageValEl = stage.querySelector<HTMLElement>('[data-el="stage-v"]')!;

  const spellPanelEl = stage.querySelector<HTMLElement>('[data-el="spell-panel"]')!;
  const charEmblemEl = stage.querySelector<HTMLElement>('[data-el="char-emblem"]')!;
  const charNameEl = stage.querySelector<HTMLElement>('[data-el="char-name"]')!;
  const spiritPctEl = stage.querySelector<HTMLElement>('[data-el="spirit-pct"]')!;
  const spiritFillEl = stage.querySelector<HTMLElement>('[data-el="spirit-fill"]')!;
  const spellBtnEl = stage.querySelector<HTMLButtonElement>('[data-btn="spell"]')!;
  const spellTitleEl = stage.querySelector<HTMLElement>('[data-el="spell-title"]')!;
  const spellKeyEl = stage.querySelector<HTMLElement>('[data-el="spell-key"]')!;
  const mobileSpellEl = stage.querySelector<HTMLButtonElement>('[data-el="mobile-spell"]')!;
  const startBtnEl = stage.querySelector<HTMLButtonElement>('[data-btn="start"]')!;

  const menuOverlay = stage.querySelector<HTMLElement>('[data-overlay="menu"]')!;
  const pauseOverlay = stage.querySelector<HTMLElement>('[data-overlay="pause"]')!;
  const gameOverOverlay = stage.querySelector<HTMLElement>('[data-overlay="gameover"]')!;
  const goScoreEl = stage.querySelector<HTMLElement>('[data-el="go-score"]')!;
  const goBestEl = stage.querySelector<HTMLElement>('[data-el="go-best"]')!;
  const goMaxChainEl = stage.querySelector<HTMLElement>('[data-el="go-max-chain"]')!;
  const goFourthKeyEl = stage.querySelector<HTMLElement>('[data-el="go-fourth-k"]')!;
  const goFourthValEl = stage.querySelector<HTMLElement>('[data-el="go-fourth-v"]')!;
  const goSubtitleEl = stage.querySelector<HTMLElement>('[data-el="go-subtitle"]')!;

  const modeButtons = Array.from(
    stage.querySelectorAll<HTMLButtonElement>('[data-mode]'),
  );
  const diffButtons = Array.from(
    stage.querySelectorAll<HTMLButtonElement>('[data-diff]'),
  );
  const charButtons = Array.from(
    stage.querySelectorAll<HTMLButtonElement>('[data-char]'),
  );

  // Core instances
  const audio = new PuyoAudio(ctx.isMuted, ctx.onMuteChange);
  const renderer = new PuyoRenderer();

  let lastQueueSig = '';
  let lastRenderedMode: GameMode | null = null;
  let lastEmblemChar: CharacterId | null = null;
  let destroyed = false;

  const updateLayoutSize = (): void => {
    if (destroyed) return;
    const w = ctx.container.clientWidth || 640;
    const h = ctx.container.clientHeight || 560;
    const isTouchDevice =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    const isCompact = w < 540;
    const showMobilePad = isCompact || isTouchDevice;

    stage.classList.toggle('compact', isCompact);
    stage.classList.toggle('touch-pad', showMobilePad);

    const sideReserveW = isCompact ? 112 : 176;
    const horizPad = isCompact ? 20 : 28;
    const vertPad = showMobilePad ? 76 : 24;

    const availBoardW = Math.max(96, w - sideReserveW - horizPad);
    const availBoardH = Math.max(196, h - vertPad);
    const aspectRows = getBoardAspectRows(engine.mode);

    const cellSize = Math.max(
      16,
      Math.min(
        46,
        Math.floor(Math.min(availBoardW / COLS, availBoardH / aspectRows)),
      ),
    );

    renderer.resizeBoard(boardCanvas, cellSize, engine.mode === 'boss');
    renderer.renderPreview(previewCanvas, engine.queue, engine.elapsedMs);
  };

  const updateHud = (snap: HudSnapshot): void => {
    const diffCfg = DIFFICULTIES[snap.difficulty];
    const charCfg = CHARACTERS[snap.character];

    chainEl.textContent = snap.chain > 0 ? `${snap.chain}连` : `MAX ${snap.maxChain}`;
    speedEl.textContent = `LV.${snap.speedLevel}`;
    diffPillEl.textContent = diffCfg.shortLabel;
    diffPillEl.style.borderColor = diffCfg.badgeColor;

    if (snap.mode === 'boss') {
      stageKeyEl.textContent = `S${snap.bossStage}`;
      stageValEl.textContent = snap.bossName || '琪露诺';
    } else {
      stageKeyEl.textContent = '已消';
      stageValEl.textContent = `${snap.totalCleared}`;
    }

    // Spirit Gauge & Spell Card button
    if (lastEmblemChar !== snap.character) {
      lastEmblemChar = snap.character;
      charEmblemEl.innerHTML = getCharacterEmblemSvg(snap.character);
    }
    charNameEl.textContent = charCfg.shortName;
    spiritPctEl.textContent = `${snap.spiritGauge}%`;
    spiritFillEl.style.width = `${snap.spiritGauge}%`;
    spellPanelEl.style.setProperty('--spell-accent', charCfg.primaryColor);
    spellPanelEl.style.setProperty('--spell-glow', charCfg.secondaryColor);
    spellPanelEl.classList.toggle('ready', snap.spiritReady);

    const canClickSpell =
      snap.spiritReady &&
      !snap.paused &&
      snap.phase !== 'menu' &&
      snap.phase !== 'gameover';
    spellBtnEl.disabled = !canClickSpell;
    spellBtnEl.classList.toggle('ready', canClickSpell);
    spellTitleEl.textContent = charCfg.spellShort;
    spellKeyEl.textContent = canClickSpell ? 'Shift/E' : `${snap.spiritGauge}%`;
    mobileSpellEl.classList.toggle('ready', canClickSpell);

    for (const btn of modeButtons) {
      btn.classList.toggle('selected', btn.dataset.mode === snap.mode);
    }
    for (const btn of diffButtons) {
      btn.classList.toggle('selected', btn.dataset.diff === snap.difficulty);
    }
    for (const btn of charButtons) {
      btn.classList.toggle('selected', btn.dataset.char === snap.character);
    }

    startBtnEl.textContent =
      snap.mode === 'boss' ? '开始异变讨伐' : '开始经典无尽';

    menuOverlay.classList.toggle('hidden', snap.phase !== 'menu');
    pauseOverlay.classList.toggle(
      'hidden',
      !(snap.paused && snap.phase !== 'menu' && snap.phase !== 'gameover'),
    );
    gameOverOverlay.classList.toggle('hidden', snap.phase !== 'gameover');

    if (snap.phase === 'gameover') {
      goScoreEl.innerHTML = `${snap.score.toLocaleString()}${
        snap.isNewBest ? '<span class="puyo-new-badge">NEW!</span>' : ''
      }`;
      goBestEl.textContent = snap.bestScore.toLocaleString();
      goMaxChainEl.textContent = `${snap.maxChain} 连锁`;
      if (snap.mode === 'boss') {
        goFourthKeyEl.textContent = '讨伐战绩';
        goFourthValEl.textContent = `S${snap.bossStage} · 击破${snap.bossDefeated}`;
        goSubtitleEl.textContent = `${charCfg.name} · 异变讨伐（${diffCfg.shortLabel}）`;
      } else {
        goFourthKeyEl.textContent = '消除 / 全消';
        goFourthValEl.textContent = `${snap.totalCleared} / ${snap.allClears}`;
        goSubtitleEl.textContent = `${charCfg.name} · 经典无尽（${diffCfg.shortLabel}）`;
      }
    }

    if (lastRenderedMode !== snap.mode) {
      lastRenderedMode = snap.mode;
      updateLayoutSize();
    }
  };

  const engine = new PuyoEngine(audio, {
    getBestScore: ctx.getBestScore,
    onScoreChange: ctx.onScoreChange,
    onGameOver: ctx.onGameOver,
    saveScore: ctx.saveScore,
    onHudUpdate: updateHud,
  });

  // Initial sync with portal HUD
  ctx.onScoreChange(0, ctx.getBestScore(), 'Stage 1 · 琪露诺');
  updateHud(engine.getSnapshot());

  // ==================== RESPONSIVE SIZING ====================

  let resizeObserver: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      updateLayoutSize();
    });
    resizeObserver.observe(ctx.container);
  }
  const onWindowResize = () => updateLayoutSize();
  window.addEventListener('resize', onWindowResize);
  updateLayoutSize();

  // ==================== BUTTON & POINTER BINDINGS ====================

  for (const btn of modeButtons) {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode as GameMode | undefined;
      if (mode === 'boss' || mode === 'classic') {
        audio.unlock();
        audio.playMove();
        engine.setMode(mode);
      }
    });
  }

  for (const btn of diffButtons) {
    btn.addEventListener('click', () => {
      const id = btn.dataset.diff as DifficultyId | undefined;
      if (id && DIFFICULTIES[id]) {
        audio.unlock();
        audio.playMove();
        engine.setDifficulty(id);
      }
    });
  }

  for (const btn of charButtons) {
    btn.addEventListener('click', () => {
      const id = btn.dataset.char as CharacterId | undefined;
      if (id && CHARACTERS[id]) {
        audio.unlock();
        audio.playRotate();
        engine.setCharacter(id);
      }
    });
  }

  spellBtnEl.addEventListener('click', () => {
    engine.castSpellCard();
  });

  stage.querySelector('[data-btn="start"]')?.addEventListener('click', () => {
    engine.startGame();
  });
  stage.querySelector('[data-btn="resume"]')?.addEventListener('click', () => {
    engine.setPaused(false);
  });
  stage.querySelector('[data-btn="pause-restart"]')?.addEventListener('click', () => {
    engine.startGame();
  });
  stage.querySelector('[data-btn="pause-menu"]')?.addEventListener('click', () => {
    engine.openMenu();
  });
  stage.querySelector('[data-btn="retry"]')?.addEventListener('click', () => {
    engine.startGame();
  });
  stage.querySelector('[data-btn="go-diff"]')?.addEventListener('click', () => {
    engine.openMenu();
  });
  stage.querySelector('[data-btn="go-hub"]')?.addEventListener('click', () => {
    ctx.onBackToMenu();
  });

  // Compact / touch arcade buttons
  const ctrlButtons = Array.from(
    stage.querySelectorAll<HTMLButtonElement>('[data-action]'),
  );
  const activePointers = new Map<number, { btn: HTMLButtonElement; action: string }>();

  const releaseAction = (action: string, btn: HTMLButtonElement): void => {
    btn.classList.remove('pressed');
    if (action === 'left') engine.setLeftHeld(false);
    else if (action === 'right') engine.setRightHeld(false);
    else if (action === 'down') engine.setDownHeld(false);
  };

  for (const btn of ctrlButtons) {
    const action = btn.dataset.action || '';
    btn.addEventListener('pointerdown', (e: PointerEvent) => {
      e.preventDefault();
      audio.unlock();
      btn.classList.add('pressed');
      if (btn.setPointerCapture) {
        try {
          btn.setPointerCapture(e.pointerId);
        } catch {
          // Ignore synthetic pointer errors
        }
      }
      activePointers.set(e.pointerId, { btn, action });

      if (action === 'left') engine.setLeftHeld(true);
      else if (action === 'right') engine.setRightHeld(true);
      else if (action === 'down') engine.setDownHeld(true);
      else if (action === 'cw') engine.tryRotate(1);
      else if (action === 'ccw') engine.tryRotate(-1);
      else if (action === 'hard') engine.hardDrop();
      else if (action === 'spell') engine.castSpellCard();
    });

    const handleRelease = (e: PointerEvent) => {
      const entry = activePointers.get(e.pointerId);
      if (entry) {
        activePointers.delete(e.pointerId);
        releaseAction(entry.action, entry.btn);
      } else {
        releaseAction(action, btn);
      }
    };

    btn.addEventListener('pointerup', handleRelease);
    btn.addEventListener('pointercancel', handleRelease);
    btn.addEventListener('lostpointercapture', handleRelease);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // ==================== KEYBOARD BINDINGS ====================

  const isTypingTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
  };

  const onKeyDown = (e: KeyboardEvent): void => {
    if (destroyed || isTypingTarget(e.target)) return;

    const code = e.code;

    if (
      code === 'ArrowLeft' ||
      code === 'ArrowRight' ||
      code === 'ArrowDown' ||
      code === 'ArrowUp' ||
      code === 'Space'
    ) {
      e.preventDefault();
    }

    if (engine.phase === 'menu') {
      if ((code === 'Enter' || code === 'Space') && !e.repeat) {
        engine.startGame();
      } else if ((code === 'ArrowUp' || code === 'KeyW') && !e.repeat) {
        const order: DifficultyId[] = ['easy', 'normal', 'lunatic'];
        const nextIdx = (order.indexOf(engine.difficulty) + 2) % 3;
        engine.setDifficulty(order[nextIdx]);
        audio.playMove();
      } else if ((code === 'ArrowDown' || code === 'KeyS') && !e.repeat) {
        const order: DifficultyId[] = ['easy', 'normal', 'lunatic'];
        const nextIdx = (order.indexOf(engine.difficulty) + 1) % 3;
        engine.setDifficulty(order[nextIdx]);
        audio.playMove();
      } else if ((code === 'ArrowLeft' || code === 'KeyA') && !e.repeat) {
        const nextIdx = (CHARACTER_ORDER.indexOf(engine.character) + 2) % 3;
        engine.setCharacter(CHARACTER_ORDER[nextIdx]);
        audio.playRotate();
      } else if ((code === 'ArrowRight' || code === 'KeyD') && !e.repeat) {
        const nextIdx = (CHARACTER_ORDER.indexOf(engine.character) + 1) % 3;
        engine.setCharacter(CHARACTER_ORDER[nextIdx]);
        audio.playRotate();
      }
      return;
    }

    if (engine.phase === 'gameover') {
      if ((code === 'KeyR' || code === 'Enter') && !e.repeat) {
        engine.startGame();
      }
      return;
    }

    if ((code === 'KeyP' || code === 'Escape') && !e.repeat) {
      engine.setPaused(!engine.paused);
      return;
    }

    if (engine.paused) return;

    if (code === 'ArrowLeft' || code === 'KeyA') {
      if (!e.repeat) engine.setLeftHeld(true);
    } else if (code === 'ArrowRight' || code === 'KeyD') {
      if (!e.repeat) engine.setRightHeld(true);
    } else if (code === 'ArrowDown' || code === 'KeyS') {
      engine.setDownHeld(true);
    } else if (code === 'Space') {
      if (!e.repeat) engine.hardDrop();
    } else if (code === 'KeyX' || code === 'ArrowUp' || code === 'KeyW') {
      if (!e.repeat) engine.tryRotate(1);
    } else if (code === 'KeyZ' || code === 'KeyQ') {
      if (!e.repeat) engine.tryRotate(-1);
    } else if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyE') {
      if (!e.repeat) engine.castSpellCard();
    }
  };

  const onKeyUp = (e: KeyboardEvent): void => {
    if (destroyed) return;
    const code = e.code;
    if (code === 'ArrowLeft' || code === 'KeyA') {
      engine.setLeftHeld(false);
    } else if (code === 'ArrowRight' || code === 'KeyD') {
      engine.setRightHeld(false);
    } else if (code === 'ArrowDown' || code === 'KeyS') {
      engine.setDownHeld(false);
    }
  };

  const onWindowBlur = (): void => {
    engine.clearHeldInputs();
    for (const { btn, action } of activePointers.values()) {
      releaseAction(action, btn);
    }
    activePointers.clear();
  };

  const onVisibilityChange = (): void => {
    if (document.hidden) {
      engine.clearHeldInputs();
    }
  };

  window.addEventListener('keydown', onKeyDown, { passive: false });
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onWindowBlur);
  document.addEventListener('visibilitychange', onVisibilityChange);

  // ==================== ANIMATION LOOP ====================

  let rafId = 0;
  let lastTime = performance.now();
  let lastPreviewRenderMs = -1000;

  const frame = (now: number): void => {
    if (destroyed) return;
    const dt = Math.min(50, Math.max(0, now - lastTime));
    lastTime = now;

    engine.update(dt);
    renderer.renderBoard(boardCanvas, engine);

    const sig = engine.queue.map((q) => `${q.pivot}${q.child}`).join('-');
    if (sig !== lastQueueSig || engine.elapsedMs - lastPreviewRenderMs >= 66) {
      lastQueueSig = sig;
      lastPreviewRenderMs = engine.elapsedMs;
      renderer.renderPreview(previewCanvas, engine.queue, engine.elapsedMs);
    }

    rafId = window.requestAnimationFrame(frame);
  };

  rafId = window.requestAnimationFrame(frame);

  // ==================== GAME INSTANCE LIFECYCLE ====================

  return {
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      window.cancelAnimationFrame(rafId);
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      window.removeEventListener('resize', onWindowResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      engine.clearHeldInputs();
      audio.destroy();
      ctx.container.innerHTML = '';
    },
    restart(): void {
      if (destroyed) return;
      engine.startGame();
    },
    setPaused(paused: boolean): void {
      if (destroyed) return;
      engine.setPaused(paused);
    },
  };
}
