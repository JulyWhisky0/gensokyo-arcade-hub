import type { GameInstance, GameMountContext } from '../../types/game';
import { PuyoAudio } from './audio';
import { PuyoEngine } from './engine';
import { BOARD_ASPECT_ROWS, PuyoRenderer } from './renderer';
import { PUYO_STYLES } from './styles';
import {
  COLS,
  DIFFICULTIES,
  DifficultyId,
  HudSnapshot,
  PUYO_THEMES,
} from './types';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function mountPuyoGame(ctx: GameMountContext): GameInstance {
  ctx.container.innerHTML = '';

  const styleEl = document.createElement('style');
  styleEl.textContent = PUYO_STYLES;
  ctx.container.appendChild(styleEl);

  const stage = document.createElement('div');
  stage.className = 'puyo-stage';

  const orbChipsHtml = PUYO_THEMES.map(
    (t) =>
      `<span class="puyo-orb-chip" title="${escapeHtml(t.character)} · ${escapeHtml(t.name)}" style="background:radial-gradient(circle at 35% 30%, ${t.light}, ${t.base} 55%, ${t.dark});"></span>`,
  ).join('');

  const diffListHtml = (['easy', 'normal', 'lunatic'] as DifficultyId[])
    .map((id) => {
      const d = DIFFICULTIES[id];
      return `
        <button type="button" class="puyo-diff-opt${id === 'normal' ? ' selected' : ''}" data-diff="${id}">
          <div>
            <div class="puyo-diff-title">${escapeHtml(d.name)} · ${escapeHtml(d.shortLabel)}</div>
            <div class="puyo-diff-desc">${escapeHtml(d.subtitle)}</div>
          </div>
          <span class="puyo-diff-tag" style="background:${d.badgeColor};">${d.colorCount}色</span>
        </button>
      `;
    })
    .join('');

  stage.innerHTML = `
    <div class="puyo-main">
      <div class="puyo-board-frame">
        <canvas class="puyo-board-canvas" aria-label="魔法森林噗哟噗哟棋盘"></canvas>
      </div>
      <aside class="puyo-sidebar">
        <div class="puyo-panel">
          <div class="puyo-panel-label">
            <span>NEXT 灵珠</span>
            <span class="puyo-diff-pill" data-el="diff-pill">Normal</span>
          </div>
          <canvas class="puyo-preview-canvas" aria-label="下组预告"></canvas>
        </div>

        <div class="puyo-panel">
          <div class="puyo-stats-grid">
            <div class="puyo-stat-box wide">
              <span class="puyo-stat-k">当前得分</span>
              <span class="puyo-stat-v gold" data-el="score">0</span>
            </div>
            <div class="puyo-stat-box">
              <div class="puyo-stat-k">当前连锁</div>
              <div class="puyo-stat-v chain" data-el="chain">0</div>
            </div>
            <div class="puyo-stat-box">
              <div class="puyo-stat-k">最高连锁</div>
              <div class="puyo-stat-v" data-el="max-chain">0</div>
            </div>
            <div class="puyo-stat-box">
              <div class="puyo-stat-k">速度等级</div>
              <div class="puyo-stat-v" data-el="speed">LV.1</div>
            </div>
            <div class="puyo-stat-box">
              <div class="puyo-stat-k">已消除</div>
              <div class="puyo-stat-v" data-el="cleared">0</div>
            </div>
          </div>
        </div>

        <div class="puyo-panel puyo-desktop-pad">
          <div class="puyo-panel-label"><span>快捷按键</span></div>
          <div class="puyo-pad">
            <button type="button" class="puyo-btn-ctrl" data-action="ccw" title="逆时针旋转 (Z/Q)">↺</button>
            <button type="button" class="puyo-btn-ctrl accent" data-action="hard" title="硬降落位 (Space)">⚡</button>
            <button type="button" class="puyo-btn-ctrl" data-action="cw" title="顺时针旋转 (X/↑)">↻</button>
            <button type="button" class="puyo-btn-ctrl" data-action="left" title="左移 (←/A)">◀</button>
            <button type="button" class="puyo-btn-ctrl" data-action="down" title="缓降 (↓/S)">▼</button>
            <button type="button" class="puyo-btn-ctrl" data-action="right" title="右移 (→/D)">▶</button>
          </div>
        </div>

        <div class="puyo-panel puyo-desktop-keys">
          <div class="puyo-keys-hint">
            <kbd>←</kbd><kbd>→</kbd> 移动 · <kbd>↓</kbd> 缓降 · <kbd>Space</kbd> 硬降<br/>
            <kbd>X</kbd>/<kbd>↑</kbd> 顺转 · <kbd>Z</kbd>/<kbd>Q</kbd> 逆转 · 窄道双按180°翻转
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
        <button type="button" class="puyo-btn-ctrl accent" data-action="hard" aria-label="硬降">⚡</button>
        <button type="button" class="puyo-btn-ctrl" data-action="ccw" aria-label="逆转">↺</button>
        <button type="button" class="puyo-btn-ctrl" data-action="cw" aria-label="顺转">↻</button>
      </div>
    </div>

    <!-- Start / Difficulty Overlay -->
    <div class="puyo-overlay" data-overlay="menu">
      <div class="puyo-modal">
        <div class="puyo-modal-eyebrow">Gensokyo Spirit Puyo</div>
        <h2 class="puyo-modal-title">魔法森林噗哟噗哟</h2>
        <p class="puyo-modal-sub">将 4 颗同色幻想乡灵珠连结消除，触发多段连锁与华丽符卡宣言！</p>
        <div class="puyo-orb-row">${orbChipsHtml}</div>
        <div class="puyo-diff-list">${diffListHtml}</div>
        <div class="puyo-action-row">
          <button type="button" class="puyo-cta" data-btn="start">开始连锁挑战</button>
        </div>
      </div>
    </div>

    <!-- Pause Overlay -->
    <div class="puyo-overlay hidden" data-overlay="pause">
      <div class="puyo-modal">
        <div class="puyo-modal-eyebrow">Boundary Paused</div>
        <h2 class="puyo-modal-title">结界暂停中</h2>
        <p class="puyo-modal-sub">灵珠已静滞，随时可以继续消除或重新开局。</p>
        <div class="puyo-action-row">
          <button type="button" class="puyo-cta" data-btn="resume">继续游戏</button>
          <button type="button" class="puyo-cta secondary" data-btn="pause-restart">重新开始</button>
          <button type="button" class="puyo-cta secondary" data-btn="pause-menu">切换难度</button>
        </div>
      </div>
    </div>

    <!-- Game Over Overlay -->
    <div class="puyo-overlay hidden" data-overlay="gameover">
      <div class="puyo-modal">
        <div class="puyo-modal-eyebrow">Spirit Overflow</div>
        <h2 class="puyo-modal-title">灵力满溢 · 结界终结</h2>
        <p class="puyo-modal-sub" data-el="go-subtitle">封印格被填满，本次魔法实验结束！</p>
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
            <div class="puyo-stat-k">消除 / 全消</div>
            <div class="puyo-stat-v" data-el="go-cleared">0 / 0</div>
          </div>
        </div>
        <div class="puyo-action-row">
          <button type="button" class="puyo-cta" data-btn="retry">再来一局 (R)</button>
          <button type="button" class="puyo-cta secondary" data-btn="go-diff">切换难度</button>
          <button type="button" class="puyo-cta secondary" data-btn="go-hub">返回大厅</button>
        </div>
      </div>
    </div>
  `;

  ctx.container.appendChild(stage);

  // Element references
  const boardCanvas = stage.querySelector<HTMLCanvasElement>('.puyo-board-canvas')!;
  const previewCanvas = stage.querySelector<HTMLCanvasElement>('.puyo-preview-canvas')!;
  const scoreEl = stage.querySelector<HTMLElement>('[data-el="score"]')!;
  const chainEl = stage.querySelector<HTMLElement>('[data-el="chain"]')!;
  const maxChainEl = stage.querySelector<HTMLElement>('[data-el="max-chain"]')!;
  const speedEl = stage.querySelector<HTMLElement>('[data-el="speed"]')!;
  const clearedEl = stage.querySelector<HTMLElement>('[data-el="cleared"]')!;
  const diffPillEl = stage.querySelector<HTMLElement>('[data-el="diff-pill"]')!;

  const menuOverlay = stage.querySelector<HTMLElement>('[data-overlay="menu"]')!;
  const pauseOverlay = stage.querySelector<HTMLElement>('[data-overlay="pause"]')!;
  const gameOverOverlay = stage.querySelector<HTMLElement>('[data-overlay="gameover"]')!;
  const goScoreEl = stage.querySelector<HTMLElement>('[data-el="go-score"]')!;
  const goBestEl = stage.querySelector<HTMLElement>('[data-el="go-best"]')!;
  const goMaxChainEl = stage.querySelector<HTMLElement>('[data-el="go-max-chain"]')!;
  const goClearedEl = stage.querySelector<HTMLElement>('[data-el="go-cleared"]')!;
  const goSubtitleEl = stage.querySelector<HTMLElement>('[data-el="go-subtitle"]')!;

  const diffButtons = Array.from(
    stage.querySelectorAll<HTMLButtonElement>('[data-diff]'),
  );

  // Core instances
  const audio = new PuyoAudio(ctx.isMuted, ctx.onMuteChange);
  const renderer = new PuyoRenderer();

  let lastQueueSig = '';
  let destroyed = false;

  const updateHud = (snap: HudSnapshot): void => {
    scoreEl.textContent = snap.score.toLocaleString();
    chainEl.textContent = String(snap.chain);
    maxChainEl.textContent = String(snap.maxChain);
    speedEl.textContent = `LV.${snap.speedLevel}`;
    clearedEl.textContent = String(snap.totalCleared);
    const diffCfg = DIFFICULTIES[snap.difficulty];
    diffPillEl.textContent = diffCfg.shortLabel.split(' · ')[0];
    diffPillEl.style.borderColor = diffCfg.badgeColor;

    for (const btn of diffButtons) {
      btn.classList.toggle('selected', btn.dataset.diff === snap.difficulty);
    }

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
      goClearedEl.textContent = `${snap.totalCleared} / ${snap.allClears}`;
      goSubtitleEl.textContent = `${diffCfg.name}（${diffCfg.shortLabel}）· 魔法灵力已达上限`;
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
  ctx.onScoreChange(0, ctx.getBestScore(), '最高 0 连锁');
  updateHud(engine.getSnapshot());

  // ==================== RESPONSIVE SIZING ====================

  const updateLayoutSize = (): void => {
    if (destroyed) return;
    const w = ctx.container.clientWidth || 640;
    const h = ctx.container.clientHeight || 560;
    const isCompact = w < 540;
    stage.classList.toggle('compact', isCompact);

    const sideReserveW = isCompact ? 116 : 200;
    const horizPad = isCompact ? 24 : 32;
    const vertPad = isCompact ? 76 : 28; // includes frame border + mobile pad if compact

    const availBoardW = Math.max(96, w - sideReserveW - horizPad);
    const availBoardH = Math.max(196, h - vertPad);

    const cellSize = Math.max(
      16,
      Math.min(
        48,
        Math.floor(Math.min(availBoardW / COLS, availBoardH / BOARD_ASPECT_ROWS)),
      ),
    );

    renderer.resizeBoard(boardCanvas, cellSize);
    renderer.renderPreview(previewCanvas, engine.queue, engine.elapsedMs);
  };

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

  // On-screen arcade buttons (pointer events for zero-latency mouse & touch)
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

    // Prevent page scrolling on gameplay keys
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
