import type { GameInstance, GameMountContext } from '../../types/game';
import { SuikaAudio } from './audio';
import { SuikaPhysics } from './physics';
import { SuikaRenderer, renderOrbIcon } from './renderer';
import { SUIKA_STYLES } from './styles';
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  DROP_COOLDOWN_MS,
  MAX_TIER,
  ORB_TIERS,
  pickNextSpawnTier,
} from './tiers';

type GamePhase = 'ready' | 'playing' | 'paused' | 'gameover';

export function mountSuikaGame(ctx: GameMountContext): GameInstance {
  ctx.container.innerHTML = '';

  const physics = new SuikaPhysics();
  const renderer = new SuikaRenderer();
  const audio = new SuikaAudio(ctx.isMuted());

  let destroyed = false;
  let phase: GamePhase = 'ready';
  let score = 0;
  let bestScore = Math.max(0, ctx.getBestScore());
  let isNewRecord = false;
  let gameOverReported = false;
  let highestTier = 0;
  let dropCount = 0;
  let currentTier = pickNextSpawnTier(0);
  let nextTier = pickNextSpawnTier(1);
  let dropX = BOARD_WIDTH * 0.5;
  let dropCooldownMs = 0;
  let elapsedTime = 0;
  let lastFrameTime = 0;
  let rafId = 0;

  // Input tracking
  let keyLeft = false;
  let keyRight = false;
  let activeTouchPointerId: number | null = null;

  // --- Build Scoped DOM ---
  const root = document.createElement('div');
  root.className = 'suika-root';

  const styleEl = document.createElement('style');
  styleEl.textContent = SUIKA_STYLES;
  root.appendChild(styleEl);

  const layout = document.createElement('div');
  layout.className = 'suika-layout';
  root.appendChild(layout);

  // Stage column & canvas shell
  const stageCol = document.createElement('div');
  stageCol.className = 'suika-stage-col';
  layout.appendChild(stageCol);

  const canvasShell = document.createElement('div');
  canvasShell.className = 'suika-canvas-shell';
  stageCol.appendChild(canvasShell);

  const canvas = document.createElement('canvas');
  canvas.className = 'suika-canvas';
  canvasShell.appendChild(canvas);

  const ctx2d = canvas.getContext('2d');

  // --- Overlays ---
  // 1. Start Overlay
  const startOverlay = document.createElement('div');
  startOverlay.className = 'suika-overlay visible';
  startOverlay.innerHTML = `
    <div class="suika-modal">
      <div class="suika-modal-badge">博丽神社 · 翠香祭</div>
      <h2 class="suika-modal-title">幻想乡合成大西瓜</h2>
      <div class="suika-trophy-row">
        <canvas class="suika-trophy-canvas" data-role="start-icon"></canvas>
        <div class="suika-trophy-text">
          <div class="suika-trophy-label">终极合成目标 · TIER 11</div>
          <div class="suika-trophy-name">伊吹萃香（大西瓜！）</div>
          <div class="suika-trophy-epithet">从毛玉一路合成至萃香鬼王</div>
        </div>
      </div>
      <p class="suika-modal-sub">
        鼠标或触控瞄准后投放角色球，相同角色相遇即可进化升级。<br/>
        注意不要让角色球长时间超过顶部结界警戒线！
      </p>
      <div class="suika-btn-row">
        <button type="button" class="suika-btn suika-btn-primary" data-action="start">开始合成</button>
      </div>
    </div>
  `;
  canvasShell.appendChild(startOverlay);

  // 2. Pause Overlay
  const pauseOverlay = document.createElement('div');
  pauseOverlay.className = 'suika-overlay';
  pauseOverlay.innerHTML = `
    <div class="suika-modal">
      <div class="suika-modal-badge">时间静止</div>
      <h2 class="suika-modal-title">游戏已暂停</h2>
      <p class="suika-modal-sub">十六夜咲夜为你暂停了幻想乡的时间，随时可以继续。</p>
      <div class="suika-btn-row">
        <button type="button" class="suika-btn suika-btn-primary" data-action="resume">继续游戏</button>
        <button type="button" class="suika-btn suika-btn-secondary" data-action="restart">重新开始</button>
      </div>
    </div>
  `;
  canvasShell.appendChild(pauseOverlay);

  // 3. Game Over Overlay
  const gameOverOverlay = document.createElement('div');
  gameOverOverlay.className = 'suika-overlay';
  gameOverOverlay.innerHTML = `
    <div class="suika-modal">
      <div class="suika-modal-badge" data-role="over-badge">结界溢出</div>
      <h2 class="suika-modal-title" data-role="over-title">本局结束</h2>
      <div class="suika-trophy-row">
        <canvas class="suika-trophy-canvas" data-role="over-icon"></canvas>
        <div class="suika-trophy-text">
          <div class="suika-trophy-label">本局最高合成</div>
          <div class="suika-trophy-name" data-role="over-tier-name">毛玉</div>
          <div class="suika-trophy-epithet" data-role="over-tier-title">幻想乡软萌毛球</div>
        </div>
      </div>
      <div class="suika-score-grid">
        <div class="suika-score-tile">
          <div class="suika-score-tile-label">本局得分</div>
          <div class="suika-score-tile-val" data-role="over-score">0</div>
        </div>
        <div class="suika-score-tile">
          <div class="suika-score-tile-label">最高纪录</div>
          <div class="suika-score-tile-val" data-role="over-best">0</div>
        </div>
      </div>
      <p class="suika-modal-sub" data-role="over-stats">总合成 0 次 · 最高连击 0x</p>
      <div class="suika-btn-row">
        <button type="button" class="suika-btn suika-btn-primary" data-action="restart">再来一局</button>
        <button type="button" class="suika-btn suika-btn-secondary" data-action="menu">返回大厅</button>
      </div>
    </div>
  `;
  canvasShell.appendChild(gameOverOverlay);

  // --- Sidebar ---
  const sidebar = document.createElement('aside');
  sidebar.className = 'suika-sidebar';
  layout.appendChild(sidebar);

  // Next orb preview card
  const nextCard = document.createElement('div');
  nextCard.className = 'suika-card suika-next-card';
  nextCard.innerHTML = `
    <div class="suika-card-header">
      <span>下一个角色</span>
      <span>NEXT</span>
    </div>
    <div class="suika-next-wrap">
      <div class="suika-next-canvas-box">
        <canvas data-role="next-icon"></canvas>
      </div>
      <div class="suika-next-info">
        <div class="suika-next-name" data-role="next-name">毛玉</div>
        <div class="suika-next-sub" data-role="next-title">幻想乡软萌毛球</div>
      </div>
    </div>
  `;
  sidebar.appendChild(nextCard);

  // Compact stats card
  const statsCard = document.createElement('div');
  statsCard.className = 'suika-card suika-stats-card';
  statsCard.innerHTML = `
    <div class="suika-mini-stats">
      <div class="suika-stat-box">
        <div class="suika-stat-label">当前分数</div>
        <div class="suika-stat-val" data-role="hud-score">0</div>
      </div>
      <div class="suika-stat-box">
        <div class="suika-stat-label">最高连击</div>
        <div class="suika-stat-val accent" data-role="hud-combo">0x</div>
      </div>
    </div>
  `;
  sidebar.appendChild(statsCard);

  // Evolution chain card (all 11 Touhou tiers)
  const evoCard = document.createElement('div');
  evoCard.className = 'suika-card suika-evo-card';
  evoCard.innerHTML = `
    <div class="suika-card-header">
      <span>进化图鉴 (11阶)</span>
      <span>0 → 🍉</span>
    </div>
    <div class="suika-evo-list" data-role="evo-list"></div>
  `;
  sidebar.appendChild(evoCard);

  const controlsHint = document.createElement('div');
  controlsHint.className = 'suika-controls-hint';
  controlsHint.innerHTML = `
    <span class="suika-kbd">鼠标/触控</span> 瞄准投放 ·
    <span class="suika-kbd">A/D</span><span class="suika-kbd">←/→</span> 移动 ·
    <span class="suika-kbd">空格</span> 投放
  `;
  sidebar.appendChild(controlsHint);

  ctx.container.appendChild(root);

  // --- Query UI Elements ---
  const startIconCanvas = startOverlay.querySelector<HTMLCanvasElement>('[data-role="start-icon"]');
  const nextIconCanvas = nextCard.querySelector<HTMLCanvasElement>('[data-role="next-icon"]');
  const nextNameEl = nextCard.querySelector<HTMLElement>('[data-role="next-name"]');
  const nextTitleEl = nextCard.querySelector<HTMLElement>('[data-role="next-title"]');
  const hudScoreEl = statsCard.querySelector<HTMLElement>('[data-role="hud-score"]');
  const hudComboEl = statsCard.querySelector<HTMLElement>('[data-role="hud-combo"]');
  const evoListEl = evoCard.querySelector<HTMLElement>('[data-role="evo-list"]');

  const overBadgeEl = gameOverOverlay.querySelector<HTMLElement>('[data-role="over-badge"]');
  const overTitleEl = gameOverOverlay.querySelector<HTMLElement>('[data-role="over-title"]');
  const overIconCanvas = gameOverOverlay.querySelector<HTMLCanvasElement>('[data-role="over-icon"]');
  const overTierNameEl = gameOverOverlay.querySelector<HTMLElement>('[data-role="over-tier-name"]');
  const overTierTitleEl = gameOverOverlay.querySelector<HTMLElement>('[data-role="over-tier-title"]');
  const overScoreEl = gameOverOverlay.querySelector<HTMLElement>('[data-role="over-score"]');
  const overBestEl = gameOverOverlay.querySelector<HTMLElement>('[data-role="over-best"]');
  const overStatsEl = gameOverOverlay.querySelector<HTMLElement>('[data-role="over-stats"]');

  // Render static showcase icon on start modal
  if (startIconCanvas) {
    renderOrbIcon(startIconCanvas, MAX_TIER, 52);
  }

  // Build Evolution Chain items with live canvas-rendered Touhou orb portraits
  const evoItems: HTMLElement[] = [];
  if (evoListEl) {
    for (let t = 0; t < ORB_TIERS.length; t++) {
      const def = ORB_TIERS[t];
      const item = document.createElement('div');
      item.className = `suika-evo-item${t === MAX_TIER ? ' tier-suika' : ''}`;
      item.title = `${t + 1}. ${def.name} — ${def.title} (+${def.score}分)`;

      const icon = document.createElement('canvas');
      icon.className = 'suika-evo-icon';
      renderOrbIcon(icon, t, t === MAX_TIER ? 28 : 24);
      item.appendChild(icon);

      const meta = document.createElement('div');
      meta.className = 'suika-evo-meta';
      const nameSpan = document.createElement('span');
      nameSpan.className = 'suika-evo-name';
      nameSpan.textContent = `${t + 1}.${def.shortName}`;
      const ptsSpan = document.createElement('span');
      ptsSpan.className = 'suika-evo-pts';
      ptsSpan.textContent = t === 0 ? '初始球' : `+${def.score}`;
      meta.appendChild(nameSpan);
      meta.appendChild(ptsSpan);
      item.appendChild(meta);

      evoListEl.appendChild(item);
      evoItems.push(item);
    }
  }

  // --- UI Sync Helpers ---
  function syncNextPreview(): void {
    const def = ORB_TIERS[nextTier];
    if (nextIconCanvas) {
      renderOrbIcon(nextIconCanvas, nextTier, 48);
      nextIconCanvas.style.maxWidth = '100%';
      nextIconCanvas.style.maxHeight = '100%';
    }
    if (nextNameEl) nextNameEl.textContent = def.name;
    if (nextTitleEl) nextTitleEl.textContent = def.title;
  }

  function syncEvolutionChain(): void {
    for (let t = 0; t < evoItems.length; t++) {
      const item = evoItems[t];
      item.classList.toggle('reached', t <= highestTier);
      item.classList.toggle('highest', t === highestTier);
    }
  }

  function syncScoreHUD(comboLabel?: string): void {
    if (hudScoreEl) hudScoreEl.textContent = String(score);
    if (hudComboEl) hudComboEl.textContent = `${physics.maxCombo}x`;
    const tierName = ORB_TIERS[highestTier].shortName;
    const extra = comboLabel ? `${comboLabel} · ${tierName}` : `最高:${tierName}`;
    ctx.onScoreChange(score, bestScore, extra);
  }

  function syncOverlays(): void {
    startOverlay.classList.toggle('visible', phase === 'ready');
    pauseOverlay.classList.toggle('visible', phase === 'paused');
    gameOverOverlay.classList.toggle('visible', phase === 'gameover');
  }

  function showGameOverModal(): void {
    const reached = ORB_TIERS[highestTier];
    const reachedSuika = highestTier >= MAX_TIER;
    if (overBadgeEl) {
      overBadgeEl.textContent = reachedSuika ? '🍉 大西瓜达成' : '结界溢出';
    }
    if (overTitleEl) {
      overTitleEl.textContent = reachedSuika ? '幻想乡西瓜之王！' : '本局结束';
    }
    if (overIconCanvas) {
      renderOrbIcon(overIconCanvas, highestTier, 52);
    }
    if (overTierNameEl) overTierNameEl.textContent = reached.name;
    if (overTierTitleEl) overTierTitleEl.textContent = reached.title;
    if (overScoreEl) {
      overScoreEl.innerHTML = `${score}${isNewRecord && score > 0 ? '<span class="suika-new-record">NEW</span>' : ''}`;
    }
    if (overBestEl) overBestEl.textContent = String(bestScore);
    if (overStatsEl) {
      overStatsEl.textContent = `总合成 ${physics.totalMerges} 次 · 最高连击 ${physics.maxCombo}x`;
    }
  }

  // --- Responsive Canvas Fit ---
  function updateCanvasSize(): void {
    if (destroyed) return;
    const availW = Math.max(200, stageCol.clientWidth - 4);
    const availH = Math.max(260, stageCol.clientHeight - 4);
    const scale = Math.min(availW / BOARD_WIDTH, availH / BOARD_HEIGHT);
    const cssW = Math.max(180, Math.floor(BOARD_WIDTH * scale));
    const cssH = Math.max(250, Math.floor(BOARD_HEIGHT * scale));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvasShell.style.width = `${cssW}px`;
    canvasShell.style.height = `${cssH}px`;

    const targetW = Math.round(cssW * dpr);
    const targetH = Math.round(cssH * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
  }

  const resizeObserver = new ResizeObserver(() => {
    updateCanvasSize();
  });
  resizeObserver.observe(stageCol);
  updateCanvasSize();

  // --- Core Actions ---
  function startGame(): void {
    audio.unlock();
    if (phase === 'ready') {
      phase = 'playing';
      lastFrameTime = performance.now();
      syncOverlays();
    }
  }

  function resetRun(startImmediately: boolean): void {
    physics.reset();
    renderer.resetEffects();
    score = 0;
    bestScore = Math.max(bestScore, ctx.getBestScore());
    isNewRecord = false;
    gameOverReported = false;
    highestTier = 0;
    dropCount = 0;
    currentTier = pickNextSpawnTier(0);
    nextTier = pickNextSpawnTier(1);
    dropX = BOARD_WIDTH * 0.5;
    dropCooldownMs = 0;
    activeTouchPointerId = null;
    keyLeft = false;
    keyRight = false;
    phase = startImmediately ? 'playing' : 'ready';
    lastFrameTime = performance.now();

    syncNextPreview();
    syncEvolutionChain();
    syncScoreHUD();
    syncOverlays();
  }

  function triggerDrop(): void {
    if (phase !== 'playing' || dropCooldownMs > 0) return;
    audio.unlock();

    const droppedTier = currentTier;
    dropX = physics.clampDropX(dropX, droppedTier);
    physics.spawnDroppedOrb(dropX, droppedTier);
    audio.playDrop(droppedTier);

    if (droppedTier > highestTier) {
      highestTier = droppedTier;
      syncEvolutionChain();
      syncScoreHUD();
    }

    dropCount++;
    currentTier = nextTier;
    nextTier = pickNextSpawnTier(dropCount + 1);
    dropX = physics.clampDropX(dropX, currentTier);
    dropCooldownMs = DROP_COOLDOWN_MS;
    syncNextPreview();
  }

  function setPaused(paused: boolean): void {
    if (destroyed) return;
    if (paused && phase === 'playing') {
      phase = 'paused';
      keyLeft = false;
      keyRight = false;
      activeTouchPointerId = null;
      syncOverlays();
    } else if (!paused && phase === 'paused') {
      phase = 'playing';
      lastFrameTime = performance.now();
      syncOverlays();
    }
  }

  function handleGameOver(): void {
    if (gameOverReported) return;
    gameOverReported = true;
    phase = 'gameover';
    keyLeft = false;
    keyRight = false;
    activeTouchPointerId = null;

    audio.playGameOver();

    if (score > bestScore) {
      bestScore = score;
      isNewRecord = true;
    }

    const extraSummary = `最高:${ORB_TIERS[highestTier].shortName}`;
    ctx.saveScore(score, extraSummary);
    ctx.onScoreChange(score, bestScore, extraSummary);
    ctx.onGameOver(score, extraSummary);

    showGameOverModal();
    syncOverlays();
  }

  // --- Pointer / Touch / Keyboard Handlers ---
  function clientXToBoardX(clientX: number): number {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0) return dropX;
    const raw = ((clientX - rect.left) / rect.width) * BOARD_WIDTH;
    return physics.clampDropX(raw, currentTier);
  }

  const onCanvasPointerDown = (e: PointerEvent): void => {
    audio.unlock();
    if (phase !== 'playing') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    e.preventDefault();
    dropX = clientXToBoardX(e.clientX);

    if (e.pointerType === 'mouse') {
      triggerDrop();
    } else {
      activeTouchPointerId = e.pointerId;
    }
  };

  const onWindowPointerMove = (e: PointerEvent): void => {
    if (phase !== 'playing') return;
    if (e.pointerType === 'mouse') {
      const rect = canvas.getBoundingClientRect();
      if (
        e.clientX >= rect.left - 32 &&
        e.clientX <= rect.right + 32 &&
        e.clientY >= rect.top - 24 &&
        e.clientY <= rect.bottom + 24
      ) {
        dropX = clientXToBoardX(e.clientX);
      }
    } else if (activeTouchPointerId === e.pointerId) {
      dropX = clientXToBoardX(e.clientX);
    }
  };

  const onWindowPointerUp = (e: PointerEvent): void => {
    if (activeTouchPointerId !== null && e.pointerId === activeTouchPointerId) {
      activeTouchPointerId = null;
      if (phase === 'playing') {
        dropX = clientXToBoardX(e.clientX);
        triggerDrop();
      }
    }
  };

  const onWindowPointerCancel = (e: PointerEvent): void => {
    if (activeTouchPointerId !== null && e.pointerId === activeTouchPointerId) {
      activeTouchPointerId = null;
    }
  };

  const onWindowKeyDown = (e: KeyboardEvent): void => {
    if (destroyed) return;

    // Ignore if user is typing in an external search/input element
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      keyLeft = true;
      if (phase === 'playing') e.preventDefault();
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      keyRight = true;
      if (phase === 'playing') e.preventDefault();
    } else if (e.code === 'Space' || e.code === 'ArrowDown' || e.code === 'Enter') {
      e.preventDefault();
      audio.unlock();
      if (phase === 'ready') {
        startGame();
      } else if (phase === 'playing') {
        triggerDrop();
      } else if (phase === 'gameover' && (e.code === 'Enter' || e.code === 'Space')) {
        resetRun(true);
      }
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      if (phase === 'playing') {
        e.preventDefault();
        setPaused(true);
      } else if (phase === 'paused') {
        e.preventDefault();
        setPaused(false);
      }
    } else if (e.code === 'KeyR' && phase === 'gameover') {
      e.preventDefault();
      resetRun(true);
    }
  };

  const onWindowKeyUp = (e: KeyboardEvent): void => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keyLeft = false;
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') keyRight = false;
  };

  const onWindowBlur = (): void => {
    keyLeft = false;
    keyRight = false;
    activeTouchPointerId = null;
  };

  const onRootClick = (e: MouseEvent): void => {
    const btn = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    audio.unlock();
    if (action === 'start') {
      startGame();
    } else if (action === 'resume') {
      setPaused(false);
    } else if (action === 'restart') {
      resetRun(true);
    } else if (action === 'menu') {
      ctx.onBackToMenu();
    }
  };

  canvas.addEventListener('pointerdown', onCanvasPointerDown);
  window.addEventListener('pointermove', onWindowPointerMove);
  window.addEventListener('pointerup', onWindowPointerUp);
  window.addEventListener('pointercancel', onWindowPointerCancel);
  window.addEventListener('keydown', onWindowKeyDown);
  window.addEventListener('keyup', onWindowKeyUp);
  window.addEventListener('blur', onWindowBlur);
  root.addEventListener('click', onRootClick);

  const unsubMute = ctx.onMuteChange((muted) => {
    audio.setMuted(muted);
  });

  // --- Main RAF Loop ---
  function tick(now: number): void {
    if (destroyed) return;
    rafId = requestAnimationFrame(tick);

    if (lastFrameTime === 0) lastFrameTime = now;
    const dt = Math.min(0.05, Math.max(0, (now - lastFrameTime) / 1000));
    lastFrameTime = now;

    if (phase === 'playing') {
      elapsedTime += dt;

      if (dropCooldownMs > 0) {
        dropCooldownMs = Math.max(0, dropCooldownMs - dt * 1000);
      }

      // Keyboard smooth horizontal movement
      const moveDir = (keyRight ? 1 : 0) - (keyLeft ? 1 : 0);
      if (moveDir !== 0) {
        dropX = physics.clampDropX(dropX + moveDir * 320 * dt, currentTier);
      }

      // Advance fixed-timestep circle physics
      const res = physics.update(dt);

      if (res.strongestBounce > 0.28) {
        audio.playBounce(res.strongestBounce);
      }

      if (res.dangerWarningTick !== null) {
        audio.playDangerTick(res.dangerWarningTick);
      }

      // Process merge events (score, SFX, particles, combo, highest tier)
      if (res.merges.length > 0) {
        let bestComboLabel: string | undefined;
        let tierUpdated = false;

        for (let i = 0; i < res.merges.length; i++) {
          const ev = res.merges[i];
          score += ev.points;
          if (score > bestScore) {
            bestScore = score;
            isNewRecord = true;
          }

          renderer.spawnMergeFX(ev);

          if (ev.isDoubleSuika) {
            audio.playSuikaCelebration();
            bestComboLabel = '🍉双萃香!';
          } else {
            audio.playMerge(ev.newTier, ev.combo);
            if (ev.newTier > highestTier) {
              highestTier = Math.min(MAX_TIER, ev.newTier);
              tierUpdated = true;
            }
            if (ev.combo >= 2) {
              bestComboLabel = `${ev.combo}连击`;
            }
          }
        }

        if (tierUpdated) syncEvolutionChain();
        syncScoreHUD(bestComboLabel);
      }

      renderer.updateEffects(dt);

      if (res.dangerTriggered) {
        handleGameOver();
      }
    } else if (phase === 'ready' || phase === 'gameover') {
      // Gentle ambient motion while idle on overlay
      elapsedTime += dt;
      renderer.updateEffects(dt);
    }

    // Render frame
    if (ctx2d && canvas.width > 0 && canvas.height > 0) {
      const scaleX = canvas.width / BOARD_WIDTH;
      const scaleY = canvas.height / BOARD_HEIGHT;
      ctx2d.setTransform(scaleX, 0, 0, scaleY, 0, 0);

      const predictedY = physics.predictLandingY(dropX, currentTier);
      renderer.renderStage(ctx2d, {
        orbs: physics.orbs,
        heldTier: currentTier,
        dropX,
        canDrop: dropCooldownMs <= 0 && phase === 'playing',
        showGuide: phase === 'playing' || phase === 'ready',
        predictedLandingY: predictedY,
        dangerTimer: physics.dangerTimer,
        comboCount: physics.comboCount,
        time: elapsedTime,
      });
    }
  }

  // Initial sync & kick off loop
  syncNextPreview();
  syncEvolutionChain();
  syncScoreHUD();
  syncOverlays();
  rafId = requestAnimationFrame(tick);

  return {
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onCanvasPointerDown);
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', onWindowPointerUp);
      window.removeEventListener('pointercancel', onWindowPointerCancel);
      window.removeEventListener('keydown', onWindowKeyDown);
      window.removeEventListener('keyup', onWindowKeyUp);
      window.removeEventListener('blur', onWindowBlur);
      root.removeEventListener('click', onRootClick);
      unsubMute();
      audio.destroy();
      ctx.container.innerHTML = '';
    },
    restart(): void {
      if (destroyed) return;
      audio.unlock();
      resetRun(true);
    },
    setPaused,
  };
}
