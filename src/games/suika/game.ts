import type { GameInstance, GameMountContext } from '../../types/game';
import { SuikaAudio } from './audio';
import { SuikaPhysics, type OrbBody } from './physics';
import { SuikaRenderer, renderOrbIcon, renderSupportPortrait } from './renderer';
import { SUIKA_STYLES } from './styles';
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  DROP_COOLDOWN_MS,
  DROP_EARLY_UNLOCK_MS,
  FEVER_DURATION,
  GAP_HOLD_COOLDOWN_DROPS,
  MAX_TIER,
  ORB_TIERS,
  SPAWN_Y,
  SPIRIT_MAX_VALUE,
  SPIRIT_PER_CHARGE,
  SUPPORT_SPELLS,
  TIME_STOP_DURATION,
  TIME_STOP_RAPID_DROPS,
  pickNextSpawnTier,
  type SupportSpellDef,
  type SupportSpellId,
} from './tiers';

type GamePhase = 'playing' | 'paused' | 'gameover';

const KEY_INITIAL_SPEED = 120;
const KEY_MAX_SPEED = 440;
const KEY_ACCEL = 2500;
const DROP_BUFFER_MS = 115;

export function mountSuikaGame(ctx: GameMountContext): GameInstance {
  ctx.container.innerHTML = '';

  const physics = new SuikaPhysics();
  const renderer = new SuikaRenderer();
  const audio = new SuikaAudio(ctx.isMuted());

  let destroyed = false;
  // Start directly ready-to-drop without a blocking text modal!
  let phase: GamePhase = 'playing';
  let score = 0;
  let bestScore = Math.max(0, ctx.getBestScore());
  let isNewRecord = false;
  let gameOverReported = false;
  let highestTier = 0;
  let dropCount = 0;
  let currentTier = pickNextSpawnTier(0);
  let nextTier = pickNextSpawnTier(1);
  let dropX = BOARD_WIDTH * 0.5;

  // Snappy drop cadence & held-orb spring pop-in
  let dropCooldownMs = 0;
  let timeSinceDropMs = DROP_COOLDOWN_MS;
  let dropBufferMs = 0;
  let lastDroppedOrb: OrbBody | null = null;
  let heldPopProgress = 0;
  let nearDangerFactor = 0;
  let firstDropHintAlpha = 1;

  // --- Touhou Gameplay Mechanics State ---
  let spiritValue = 0; // 0..200 (2 charges max)
  let selectedSpell: SupportSpellId = 'reimu';
  let timeStopTimer = 0;
  let timeStopRapidDropsLeft = 0;
  let timeStopLastTickSec = 0;
  let yukariPickMode = false;
  let yukariHoveredOrbId: number | null = null;
  let feverTimer = 0;
  let gapStashTier: number | null = null;
  let gapCooldownDrops = 0;

  let elapsedTime = 0;
  let lastFrameTime = 0;
  let rafId = 0;

  // Smooth input tracking
  let keyLeft = false;
  let keyRight = false;
  let keyVelX = 0;
  let activePointerId: number | null = null;

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

  // --- Overlays (NO heavy startOverlay! Preserves Pause contract .suika-overlay.visible + [data-action="resume"]) ---
  const pauseOverlay = document.createElement('div');
  pauseOverlay.className = 'suika-overlay';
  pauseOverlay.innerHTML = `
    <div class="suika-modal">
      <div class="suika-modal-badge">时间静止</div>
      <h2 class="suika-modal-title">游戏已暂停</h2>
      <div class="suika-btn-row" style="margin-top: 16px;">
        <button type="button" class="suika-btn suika-btn-primary" data-action="resume">继续游戏</button>
        <button type="button" class="suika-btn suika-btn-secondary" data-action="restart">重新开始</button>
      </div>
    </div>
  `;
  canvasShell.appendChild(pauseOverlay);

  const gameOverOverlay = document.createElement('div');
  gameOverOverlay.className = 'suika-overlay';
  gameOverOverlay.innerHTML = `
    <div class="suika-modal">
      <div class="suika-modal-badge" data-role="over-badge">结界溢出</div>
      <h2 class="suika-modal-title" data-role="over-title">本局结束</h2>
      <div class="suika-trophy-row">
        <canvas class="suika-trophy-canvas" data-role="over-icon"></canvas>
        <div class="suika-trophy-text">
          <div class="suika-trophy-label">最高合成</div>
          <div class="suika-trophy-name" data-role="over-tier-name">白玉果 · 毛玉</div>
        </div>
      </div>
      <div class="suika-score-grid">
        <div class="suika-score-tile">
          <div class="suika-score-tile-label">得分</div>
          <div class="suika-score-tile-val" data-role="over-score">0</div>
        </div>
        <div class="suika-score-tile">
          <div class="suika-score-tile-label">最高纪录</div>
          <div class="suika-score-tile-val" data-role="over-best">0</div>
        </div>
      </div>
      <div class="suika-btn-row">
        <button type="button" class="suika-btn suika-btn-primary" data-action="restart">再来一局</button>
        <button type="button" class="suika-btn suika-btn-secondary" data-action="menu">返回大厅</button>
      </div>
    </div>
  `;
  canvasShell.appendChild(gameOverOverlay);

  // --- Ultra-Clean 3-Module Sidebar ---
  const sidebar = document.createElement('aside');
  sidebar.className = 'suika-sidebar';
  layout.appendChild(sidebar);

  // Module 1: [Next + Gap Hold]
  const slotsCard = document.createElement('div');
  slotsCard.className = 'suika-card suika-slots-card';
  slotsCard.innerHTML = `
    <div class="suika-slots-row">
      <div class="suika-slot-box" data-role="next-slot" title="下一个布偶">
        <span class="suika-slot-tag">NEXT</span>
        <canvas class="suika-slot-canvas" data-role="next-icon"></canvas>
      </div>
      <button type="button" class="suika-slot-box suika-gap-slot" data-action="gap-hold" title="隙间暂存 (Shift) · 每投放2次充能">
        <span class="suika-slot-tag gap">隙间</span>
        <canvas class="suika-slot-canvas" data-role="gap-icon"></canvas>
        <span class="suika-gap-empty" data-role="gap-empty">👁</span>
        <span class="suika-gap-badge" data-role="gap-badge">Shift</span>
      </button>
    </div>
  `;
  sidebar.appendChild(slotsCard);

  // Module 2: [Spirit Gauge + 4-Icon Support Selector + Spell Cast Button]
  const spellCard = document.createElement('div');
  spellCard.className = 'suika-card suika-spell-card';
  spellCard.innerHTML = `
    <div class="suika-spell-top">
      <span class="suika-spell-heading">P 灵力符卡</span>
      <div class="suika-charge-pips" data-role="charge-pips">
        <span class="suika-pip" data-pip="0"></span>
        <span class="suika-pip" data-pip="1"></span>
      </div>
    </div>
    <div class="suika-gauge-track">
      <div class="suika-gauge-seg"><div class="suika-gauge-fill" data-fill="0"></div></div>
      <div class="suika-gauge-seg"><div class="suika-gauge-fill" data-fill="1"></div></div>
    </div>
    <div class="suika-support-picker" data-role="support-picker"></div>
    <button type="button" class="suika-cast-btn" data-action="cast-spell">
      <span class="suika-cast-name" data-role="cast-name">灵符「梦想封印」</span>
      <span class="suika-cast-key" data-role="cast-key">E / 右键</span>
    </button>
  `;
  sidebar.appendChild(spellCard);

  // Module 3: [Icon-Only Fumo Fruit Evolution Strip]
  const evoCard = document.createElement('div');
  evoCard.className = 'suika-card suika-evo-card';
  evoCard.innerHTML = `
    <div class="suika-card-header">
      <span>布偶进化</span>
      <span>毛玉 → 🍉</span>
    </div>
    <div class="suika-evo-strip" data-role="evo-strip"></div>
  `;
  sidebar.appendChild(evoCard);

  ctx.container.appendChild(root);

  // --- Query UI Elements ---
  const nextSlotEl = slotsCard.querySelector<HTMLElement>('[data-role="next-slot"]');
  const nextIconCanvas = slotsCard.querySelector<HTMLCanvasElement>('[data-role="next-icon"]');
  const gapSlotBtn = slotsCard.querySelector<HTMLButtonElement>('[data-action="gap-hold"]');
  const gapIconCanvas = slotsCard.querySelector<HTMLCanvasElement>('[data-role="gap-icon"]');
  const gapEmptyEl = slotsCard.querySelector<HTMLElement>('[data-role="gap-empty"]');
  const gapBadgeEl = slotsCard.querySelector<HTMLElement>('[data-role="gap-badge"]');

  const pipEls = [
    spellCard.querySelector<HTMLElement>('[data-pip="0"]'),
    spellCard.querySelector<HTMLElement>('[data-pip="1"]'),
  ];
  const fillEls = [
    spellCard.querySelector<HTMLElement>('[data-fill="0"]'),
    spellCard.querySelector<HTMLElement>('[data-fill="1"]'),
  ];
  const supportPickerEl = spellCard.querySelector<HTMLElement>('[data-role="support-picker"]');
  const castBtnEl = spellCard.querySelector<HTMLButtonElement>('[data-action="cast-spell"]');
  const castNameEl = spellCard.querySelector<HTMLElement>('[data-role="cast-name"]');
  const castKeyEl = spellCard.querySelector<HTMLElement>('[data-role="cast-key"]');

  const evoStripEl = evoCard.querySelector<HTMLElement>('[data-role="evo-strip"]');

  const overBadgeEl = gameOverOverlay.querySelector<HTMLElement>('[data-role="over-badge"]');
  const overTitleEl = gameOverOverlay.querySelector<HTMLElement>('[data-role="over-title"]');
  const overIconCanvas = gameOverOverlay.querySelector<HTMLCanvasElement>('[data-role="over-icon"]');
  const overTierNameEl = gameOverOverlay.querySelector<HTMLElement>('[data-role="over-tier-name"]');
  const overScoreEl = gameOverOverlay.querySelector<HTMLElement>('[data-role="over-score"]');
  const overBestEl = gameOverOverlay.querySelector<HTMLElement>('[data-role="over-best"]');

  // Build 4-icon Support Character Selector
  const supportBtns = new Map<SupportSpellId, HTMLButtonElement>();
  if (supportPickerEl) {
    for (const sp of SUPPORT_SPELLS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'suika-support-btn';
      btn.dataset.action = 'select-support';
      btn.dataset.spell = sp.id;
      btn.title = `${sp.charName} · ${sp.spellName}\n${sp.shortDesc}`;

      const icon = document.createElement('canvas');
      icon.className = 'suika-support-canvas';
      renderSupportPortrait(icon, sp.id, 34);
      btn.appendChild(icon);

      supportPickerEl.appendChild(btn);
      supportBtns.set(sp.id, btn);
    }
  }

  // Build Icon-Only Fumo Fruit Evolution Strip (zero text clutter, rich hover tooltip!)
  const evoItems: HTMLElement[] = [];
  if (evoStripEl) {
    for (let t = 0; t < ORB_TIERS.length; t++) {
      const def = ORB_TIERS[t];
      const item = document.createElement('div');
      item.className = `suika-evo-chip${t === MAX_TIER ? ' tier-suika' : ''}`;
      item.title = `${t + 1}. ${def.title} (+${def.score}分)`;

      const icon = document.createElement('canvas');
      icon.className = 'suika-evo-icon';
      renderOrbIcon(icon, t, t === MAX_TIER ? 34 : 28);
      item.appendChild(icon);

      evoStripEl.appendChild(item);
      evoItems.push(item);
    }
  }

  // --- Helper Lookups & UI Sync ---
  function getActiveSpellDef(): SupportSpellDef {
    return SUPPORT_SPELLS.find((s) => s.id === selectedSpell) ?? SUPPORT_SPELLS[0];
  }

  function getSpellCharges(): number {
    return Math.floor(spiritValue / SPIRIT_PER_CHARGE);
  }

  function syncNextPreview(): void {
    const def = ORB_TIERS[nextTier];
    if (nextIconCanvas) {
      renderOrbIcon(nextIconCanvas, nextTier, 46);
    }
    if (nextSlotEl) {
      nextSlotEl.title = `下一个：${def.title}`;
    }
  }

  function syncGapHoldUI(): void {
    if (!gapSlotBtn || !gapIconCanvas || !gapEmptyEl || !gapBadgeEl) return;
    const ready = gapCooldownDrops === 0 && !yukariPickMode;
    gapSlotBtn.classList.toggle('ready', ready);
    gapSlotBtn.classList.toggle('cooldown', gapCooldownDrops > 0);
    gapSlotBtn.classList.toggle('has-orb', gapStashTier !== null);

    if (gapStashTier !== null) {
      renderOrbIcon(gapIconCanvas, gapStashTier, 44);
      gapIconCanvas.style.display = 'block';
      gapEmptyEl.style.display = 'none';
      const def = ORB_TIERS[gapStashTier];
      gapSlotBtn.title = `隙间暂存：${def.title} (${gapCooldownDrops > 0 ? `再投${gapCooldownDrops}次可用` : 'Shift 互换'})`;
    } else {
      gapIconCanvas.style.display = 'none';
      gapEmptyEl.style.display = 'flex';
      gapSlotBtn.title =
        gapCooldownDrops > 0
          ? `隙间冷却中：再投 ${gapCooldownDrops} 次可用`
          : '隙间暂存 (Shift)：收起当前布偶，每2次投放充能';
    }

    gapBadgeEl.textContent = gapCooldownDrops > 0 ? `待${gapCooldownDrops}` : 'Shift';
  }

  function syncSpellUI(): void {
    const charges = getSpellCharges();
    const def = getActiveSpellDef();

    const seg0 = Math.min(100, Math.max(0, spiritValue));
    const seg1 = Math.min(100, Math.max(0, spiritValue - 100));
    if (fillEls[0]) fillEls[0].style.width = `${seg0}%`;
    if (fillEls[1]) fillEls[1].style.width = `${seg1}%`;

    if (pipEls[0]) pipEls[0].classList.toggle('filled', charges >= 1);
    if (pipEls[1]) pipEls[1].classList.toggle('filled', charges >= 2);

    for (const [id, btn] of supportBtns) {
      btn.classList.toggle('active', id === selectedSpell);
    }

    if (castBtnEl && castNameEl && castKeyEl) {
      if (yukariPickMode) {
        castNameEl.textContent = '点选布偶互换';
        castKeyEl.textContent = '取消';
        castBtnEl.classList.add('ready', 'picking');
        castBtnEl.disabled = false;
      } else {
        const canCast = charges >= 1 && phase === 'playing';
        castNameEl.textContent = def.spellName;
        castKeyEl.textContent = charges >= 1 ? `×${charges} · E` : '充能中';
        castBtnEl.classList.toggle('ready', canCast);
        castBtnEl.classList.remove('picking');
        castBtnEl.disabled = !canCast;
        castBtnEl.style.setProperty('--spell-color', def.color);
      }
      castBtnEl.title = `${def.charName} · ${def.spellName}\n${def.shortDesc}`;
    }

    canvas.classList.toggle('yukari-pick', yukariPickMode);
  }

  function syncEvolutionChain(): void {
    for (let t = 0; t < evoItems.length; t++) {
      const item = evoItems[t];
      item.classList.toggle('reached', t <= highestTier);
      item.classList.toggle('highest', t === highestTier);
    }
  }

  function syncScoreHUD(comboLabel?: string): void {
    const tierName = ORB_TIERS[highestTier].shortName;
    const prefix = feverTimer > 0 ? '百鬼夜行2×' : comboLabel;
    const extra = prefix ? `${prefix} · ${tierName}` : `最高:${tierName}`;
    ctx.onScoreChange(score, bestScore, extra);
  }

  function syncOverlays(): void {
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
    if (overTierNameEl) overTierNameEl.textContent = reached.title;
    if (overScoreEl) {
      overScoreEl.innerHTML = `${score}${isNewRecord && score > 0 ? '<span class="suika-new-record">NEW</span>' : ''}`;
    }
    if (overBestEl) overBestEl.textContent = String(bestScore);
  }

  function addSpirit(amount: number): void {
    const prevCharges = getSpellCharges();
    spiritValue = Math.min(SPIRIT_MAX_VALUE, spiritValue + amount);
    const nextCharges = getSpellCharges();
    if (nextCharges > prevCharges) {
      audio.playSpellReady();
    }
    syncSpellUI();
  }

  function spendOneCharge(): boolean {
    if (spiritValue < SPIRIT_PER_CHARGE) return false;
    spiritValue = Math.max(0, spiritValue - SPIRIT_PER_CHARGE);
    syncSpellUI();
    return true;
  }

  // --- Responsive Canvas Fit + High-DPI Offscreen Sprite Cache Sync ---
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
    renderer.setPixelScale(targetW / BOARD_WIDTH);
  }

  const resizeObserver = new ResizeObserver(() => {
    updateCanvasSize();
  });
  resizeObserver.observe(stageCol);
  updateCanvasSize();

  // --- Core Actions & Touhou Mechanics ---
  function resetRun(): void {
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
    timeSinceDropMs = DROP_COOLDOWN_MS;
    dropBufferMs = 0;
    lastDroppedOrb = null;
    heldPopProgress = 0;
    nearDangerFactor = 0;
    firstDropHintAlpha = 1;

    spiritValue = 0;
    timeStopTimer = 0;
    timeStopRapidDropsLeft = 0;
    timeStopLastTickSec = 0;
    yukariPickMode = false;
    yukariHoveredOrbId = null;
    feverTimer = 0;
    gapStashTier = null;
    gapCooldownDrops = 0;

    activePointerId = null;
    keyLeft = false;
    keyRight = false;
    keyVelX = 0;
    phase = 'playing';
    lastFrameTime = performance.now();

    syncNextPreview();
    syncGapHoldUI();
    syncSpellUI();
    syncEvolutionChain();
    syncScoreHUD();
    syncOverlays();
  }

  function triggerGapHold(): void {
    if (phase !== 'playing' || yukariPickMode) return;
    if (gapCooldownDrops > 0) return;
    audio.unlock();

    if (gapStashTier === null) {
      gapStashTier = currentTier;
      currentTier = nextTier;
      nextTier = pickNextSpawnTier(dropCount + 1);
    } else {
      const prev = currentTier;
      currentTier = gapStashTier;
      gapStashTier = prev;
    }

    gapCooldownDrops = GAP_HOLD_COOLDOWN_DROPS;
    dropX = physics.clampDropX(dropX, currentTier);
    heldPopProgress = 0;
    audio.playGapHold();
    renderer.spawnGapPortalFX(dropX, SPAWN_Y, 28);
    syncNextPreview();
    syncGapHoldUI();
  }

  function cancelYukariPick(): void {
    if (!yukariPickMode) return;
    yukariPickMode = false;
    yukariHoveredOrbId = null;
    syncSpellUI();
    syncGapHoldUI();
  }

  function triggerActiveSpell(): void {
    if (phase !== 'playing') return;
    audio.unlock();

    // Pressing Spell / clicking button again cancels Yukari target-pick without spending charge
    if (yukariPickMode) {
      cancelYukariPick();
      return;
    }

    if (getSpellCharges() < 1) return;

    if (selectedSpell === 'reimu') {
      const targets = physics.selectSmallestForOfuda(3);
      if (targets.length === 0) {
        renderer.spawnFloatingBanner('箱内尚无布偶', undefined, '#ffd6de', BOARD_WIDTH * 0.5, 180, 0.95);
        return;
      }
      spendOneCharge();
      audio.playReimuOfuda();
      renderer.spawnReimuOfudaFX(targets, dropX);
      return;
    }

    if (selectedSpell === 'sakuya') {
      if (timeStopTimer > 0.05) return;
      spendOneCharge();
      timeStopTimer = TIME_STOP_DURATION;
      timeStopRapidDropsLeft = TIME_STOP_RAPID_DROPS;
      timeStopLastTickSec = Math.ceil(TIME_STOP_DURATION);
      dropCooldownMs = 0;
      dropBufferMs = 0;
      audio.playTimeStopStart();
      renderer.spawnTimeStopStartFX();
      return;
    }

    if (selectedSpell === 'yukari') {
      const hasAnyOrb = physics.orbs.some((o) => !o.sealed);
      if (!hasAnyOrb) {
        renderer.spawnFloatingBanner('箱内尚无布偶', undefined, '#e3c7ff', BOARD_WIDTH * 0.5, 180, 0.95);
        return;
      }
      // Enter target-pick mode WITHOUT spending charge yet!
      yukariPickMode = true;
      yukariHoveredOrbId = null;
      activePointerId = null;
      keyVelX = 0;
      audio.playGapHold();
      syncSpellUI();
      syncGapHoldUI();
      return;
    }

    if (selectedSpell === 'suika') {
      const hasAnyOrb = physics.orbs.some((o) => !o.sealed);
      if (!hasAnyOrb) {
        renderer.spawnFloatingBanner('箱内尚无布偶', undefined, '#ffe899', BOARD_WIDTH * 0.5, 180, 0.95);
        return;
      }
      spendOneCharge();
      physics.triggerSuikaShake();
      audio.playSuikaSpell();
      renderer.spawnSuikaSakeRippleFX();
    }
  }

  function tryYukariSwapAt(bx: number, by: number): boolean {
    const target = physics.findOrbAtPoint(bx, by);
    if (!target) return false;
    if (!spendOneCharge()) {
      cancelYukariPick();
      return false;
    }

    const result = physics.swapOrbTier(target.id, currentTier);
    if (result) {
      const { orb, oldTier } = result;
      currentTier = oldTier;
      dropX = physics.clampDropX(dropX, currentTier);
      heldPopProgress = 0;
      audio.playGapSwap();
      renderer.spawnGapPortalFX(orb.x, orb.y, Math.max(30, orb.radius * 1.1));
      renderer.spawnGapPortalFX(dropX, SPAWN_Y, Math.max(26, ORB_TIERS[currentTier].radius * 1.1));
      renderer.spawnFloatingBanner('境符「隙间穿梭」', undefined, '#d8adff', orb.x, Math.max(135, orb.y - 24), 1.05);
      if (orb.tier > highestTier) {
        highestTier = orb.tier;
        syncEvolutionChain();
        syncScoreHUD();
      }
    }

    yukariPickMode = false;
    yukariHoveredOrbId = null;
    syncSpellUI();
    syncGapHoldUI();
    return true;
  }

  function triggerDeathbomb(): void {
    spendOneCharge();
    cancelYukariPick();
    const cleared = physics.executeDeathbombClear();
    audio.playDeathbomb();
    renderer.spawnDeathbombFX(cleared);
    syncSpellUI();
    syncScoreHUD('✦决死结界');
  }

  function requestDrop(): void {
    if (phase !== 'playing' || yukariPickMode) return;
    audio.unlock();
    if (dropCooldownMs <= 0) {
      executeDrop();
    } else {
      dropBufferMs = DROP_BUFFER_MS;
    }
  }

  function executeDrop(): void {
    const droppedTier = currentTier;
    dropX = physics.clampDropX(dropX, droppedTier);

    const inRapidTimeStop = timeStopTimer > 0.02 && timeStopRapidDropsLeft > 0;
    if (inRapidTimeStop) {
      lastDroppedOrb = physics.spawnTimeStopOrb(dropX, droppedTier);
      timeStopRapidDropsLeft--;
    } else {
      lastDroppedOrb = physics.spawnDroppedOrb(dropX, droppedTier);
    }

    audio.playDrop(droppedTier);

    if (droppedTier > highestTier) {
      highestTier = droppedTier;
      syncEvolutionChain();
      syncScoreHUD();
    }

    dropCount++;
    if (gapCooldownDrops > 0) {
      gapCooldownDrops = Math.max(0, gapCooldownDrops - 1);
      syncGapHoldUI();
    }

    currentTier = nextTier;
    nextTier = pickNextSpawnTier(dropCount + 1);
    dropX = physics.clampDropX(dropX, currentTier);

    // Zero-cooldown rapid drop during Sakuya's Time Stop (up to 3 rapid drops!)
    dropCooldownMs =
      timeStopTimer > 0.02 && timeStopRapidDropsLeft > 0 ? 55 : DROP_COOLDOWN_MS;
    timeSinceDropMs = 0;
    dropBufferMs = 0;
    heldPopProgress = 0;
    syncNextPreview();
  }

  function setPaused(paused: boolean): void {
    if (destroyed) return;
    if (paused && phase === 'playing') {
      phase = 'paused';
      cancelYukariPick();
      keyLeft = false;
      keyRight = false;
      keyVelX = 0;
      activePointerId = null;
      dropBufferMs = 0;
      syncOverlays();
      syncSpellUI();
    } else if (!paused && phase === 'paused') {
      phase = 'playing';
      lastFrameTime = performance.now();
      syncOverlays();
      syncSpellUI();
    }
  }

  function handleGameOver(): void {
    if (gameOverReported) return;
    gameOverReported = true;
    phase = 'gameover';
    cancelYukariPick();
    keyLeft = false;
    keyRight = false;
    keyVelX = 0;
    activePointerId = null;
    dropBufferMs = 0;

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
    syncSpellUI();
  }

  // --- Ultra-Responsive Pointer / Touch / Right-Click / Keyboard Handlers ---
  function clientToBoard(clientX: number, clientY: number): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return { x: dropX, y: SPAWN_Y };
    return {
      x: ((clientX - rect.left) / rect.width) * BOARD_WIDTH,
      y: ((clientY - rect.top) / rect.height) * BOARD_HEIGHT,
    };
  }

  function clientXToBoardX(clientX: number): number {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0) return dropX;
    const raw = ((clientX - rect.left) / rect.width) * BOARD_WIDTH;
    return physics.clampDropX(raw, currentTier);
  }

  const onCanvasContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  const onCanvasPointerDown = (e: PointerEvent): void => {
    audio.unlock();
    if (phase !== 'playing') return;

    // Right-click casts Spell Card (or cancels Yukari target-pick!)
    if (e.pointerType === 'mouse' && e.button === 2) {
      e.preventDefault();
      if (yukariPickMode) {
        cancelYukariPick();
      } else {
        triggerActiveSpell();
      }
      return;
    }

    if (e.pointerType === 'mouse' && e.button !== 0) return;

    // Yukari target-pick mode: left-click an orb to swap through Gap!
    if (yukariPickMode) {
      e.preventDefault();
      const pt = clientToBoard(e.clientX, e.clientY);
      tryYukariSwapAt(pt.x, pt.y);
      return;
    }

    e.preventDefault();
    keyVelX = 0;
    dropX = clientXToBoardX(e.clientX);
    activePointerId = e.pointerId;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic pointer events may not support capture
    }
  };

  const onWindowPointerMove = (e: PointerEvent): void => {
    if (phase !== 'playing') return;

    if (yukariPickMode) {
      const pt = clientToBoard(e.clientX, e.clientY);
      const hit = physics.findOrbAtPoint(pt.x, pt.y);
      yukariHoveredOrbId = hit ? hit.id : null;
      return;
    }

    if (activePointerId !== null && e.pointerId === activePointerId) {
      keyVelX = 0;
      dropX = clientXToBoardX(e.clientX);
    } else if (e.pointerType === 'mouse' && activePointerId === null) {
      const rect = canvas.getBoundingClientRect();
      if (
        e.clientX >= rect.left - 36 &&
        e.clientX <= rect.right + 36 &&
        e.clientY >= rect.top - 28 &&
        e.clientY <= rect.bottom + 28
      ) {
        keyVelX = 0;
        dropX = clientXToBoardX(e.clientX);
      }
    }
  };

  const onWindowPointerUp = (e: PointerEvent): void => {
    if (activePointerId !== null && e.pointerId === activePointerId) {
      activePointerId = null;
      try {
        if (canvas.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore if already released
      }
      if (phase === 'playing' && !yukariPickMode) {
        dropX = clientXToBoardX(e.clientX);
        requestDrop();
      }
    }
  };

  const onWindowPointerCancel = (e: PointerEvent): void => {
    if (activePointerId !== null && e.pointerId === activePointerId) {
      activePointerId = null;
    }
  };

  const onWindowKeyDown = (e: KeyboardEvent): void => {
    if (destroyed) return;

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
      if (e.repeat) return;
      audio.unlock();
      if (phase === 'playing' && !yukariPickMode) {
        requestDrop();
      } else if (phase === 'gameover' && (e.code === 'Enter' || e.code === 'Space')) {
        resetRun();
      }
    } else if (e.code === 'KeyE') {
      if (phase === 'playing') {
        e.preventDefault();
        if (!e.repeat) triggerActiveSpell();
      }
    } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      if (phase === 'playing' && !yukariPickMode) {
        e.preventDefault();
        if (!e.repeat) triggerGapHold();
      }
    } else if (e.code === 'Escape') {
      if (yukariPickMode) {
        e.preventDefault();
        cancelYukariPick();
      } else if (phase === 'playing') {
        e.preventDefault();
        setPaused(true);
      } else if (phase === 'paused') {
        e.preventDefault();
        setPaused(false);
      }
    } else if (e.code === 'KeyP') {
      if (phase === 'playing') {
        e.preventDefault();
        setPaused(true);
      } else if (phase === 'paused') {
        e.preventDefault();
        setPaused(false);
      }
    } else if (e.code === 'KeyR' && phase === 'gameover') {
      e.preventDefault();
      resetRun();
    }
  };

  const onWindowKeyUp = (e: KeyboardEvent): void => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keyLeft = false;
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') keyRight = false;
  };

  const onWindowBlur = (): void => {
    keyLeft = false;
    keyRight = false;
    keyVelX = 0;
    activePointerId = null;
    dropBufferMs = 0;
  };

  const onRootClick = (e: MouseEvent): void => {
    const btn = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    audio.unlock();

    if (action === 'resume') {
      setPaused(false);
    } else if (action === 'restart') {
      resetRun();
    } else if (action === 'menu') {
      ctx.onBackToMenu();
    } else if (action === 'gap-hold') {
      triggerGapHold();
    } else if (action === 'cast-spell') {
      triggerActiveSpell();
    } else if (action === 'select-support') {
      const sp = btn.dataset.spell as SupportSpellId | undefined;
      if (sp && supportBtns.has(sp)) {
        if (yukariPickMode && sp !== 'yukari') {
          cancelYukariPick();
        }
        selectedSpell = sp;
        syncSpellUI();
      }
    }
  };

  canvas.addEventListener('contextmenu', onCanvasContextMenu);
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
      const dtMs = dt * 1000;
      timeSinceDropMs += dtMs;

      // Fade out light non-blocking hint right after first drop
      if (dropCount > 0 && firstDropHintAlpha > 0) {
        firstDropHintAlpha = Math.max(0, firstDropHintAlpha - dt * 3.2);
      }

      // Advance Hyakki Yagyo Fever timer (paused only during Yukari target-pick)
      if (feverTimer > 0 && !yukariPickMode) {
        const wasFever = feverTimer > 0;
        feverTimer = Math.max(0, feverTimer - dt);
        if (wasFever && feverTimer === 0) {
          syncScoreHUD();
        }
      }

      // Advance Sakuya Time Stop timer
      if (timeStopTimer > 0 && !yukariPickMode) {
        timeStopTimer = Math.max(0, timeStopTimer - dt);
        const secCeil = Math.ceil(timeStopTimer);
        if (secCeil > 0 && secCeil < timeStopLastTickSec) {
          timeStopLastTickSec = secCeil;
          audio.playTimeStopTick();
        }
        if (timeStopTimer === 0) {
          timeStopRapidDropsLeft = 0;
          physics.onTimeStopEnd();
          audio.playTimeStopResume();
        }
      }

      if (dropCooldownMs > 0) {
        dropCooldownMs = Math.max(0, dropCooldownMs - dtMs);

        if (dropCooldownMs > 0 && timeSinceDropMs >= DROP_EARLY_UNLOCK_MS && timeStopTimer <= 0) {
          const cleared =
            !lastDroppedOrb ||
            !physics.orbs.includes(lastDroppedOrb) ||
            lastDroppedOrb.y - lastDroppedOrb.radius >
              SPAWN_Y + ORB_TIERS[currentTier].radius + 8;
          if (cleared) {
            dropCooldownMs = 0;
          }
        }
      }

      if (dropCooldownMs <= 0 && heldPopProgress < 1) {
        heldPopProgress = Math.min(1, heldPopProgress + dt * 4.4);
      }

      if (dropBufferMs > 0 && !yukariPickMode) {
        dropBufferMs = Math.max(0, dropBufferMs - dtMs);
        if (dropCooldownMs <= 0) {
          executeDrop();
        }
      }

      // Smooth keyboard aiming
      if (!yukariPickMode) {
        const moveDir = (keyRight ? 1 : 0) - (keyLeft ? 1 : 0);
        if (moveDir !== 0) {
          if (keyVelX * moveDir <= 0 || Math.abs(keyVelX) < KEY_INITIAL_SPEED) {
            keyVelX = moveDir * KEY_INITIAL_SPEED;
          } else {
            keyVelX += moveDir * KEY_ACCEL * dt;
            if (Math.abs(keyVelX) > KEY_MAX_SPEED) {
              keyVelX = moveDir * KEY_MAX_SPEED;
            }
          }
        } else if (Math.abs(keyVelX) > 0.1) {
          keyVelX *= Math.pow(0.00012, dt);
          if (Math.abs(keyVelX) < 4) keyVelX = 0;
        }

        if (keyVelX !== 0) {
          const nextX = dropX + keyVelX * dt;
          const clampedX = physics.clampDropX(nextX, currentTier);
          if (clampedX !== nextX) {
            keyVelX = 0;
          }
          dropX = clampedX;
        }
      }

      // Advance circle physics (honoring Sakuya Time Stop & Yukari Pick pause)
      const res = physics.update(dt, {
        timeStopActive: timeStopTimer > 0.01,
        pauseSimulation: yukariPickMode,
      });
      nearDangerFactor = res.nearDangerFactor;

      // Crisp chime + ring when Time Stop rapid drops snap into frozen position
      if (res.timeStopLanded.length > 0) {
        for (const o of res.timeStopLanded) {
          audio.playTimeStopTick();
          renderer.spawnTimeStopSnapFX(o.x, o.y, o.radius);
        }
        // Once all 3 rapid drops have landed, shorten remaining wait cleanly for instant chain payoff!
        if (timeStopRapidDropsLeft <= 0 && !physics.orbs.some((o) => o.timeStopDrop)) {
          timeStopTimer = Math.min(timeStopTimer, 0.52);
        }
      }

      if (res.strongestBounce > 0.28) {
        audio.playBounce(res.strongestBounce);
      }

      if (res.dangerWarningTick !== null) {
        audio.playDangerTick(res.dangerWarningTick);
      }

      // Process merge events (with 2× Hyakki Yagyo Fever + Spirit Gauge charging!)
      if (res.merges.length > 0) {
        let bestComboLabel: string | undefined;
        let tierUpdated = false;
        let totalSpiritGain = 0;
        let triggerFever = false;

        for (let i = 0; i < res.merges.length; i++) {
          const ev = res.merges[i];
          const feverActive = feverTimer > 0.01;
          const finalPoints = feverActive ? ev.points * 2 : ev.points;
          const fxEvent = feverActive ? { ...ev, points: finalPoints } : ev;

          score += finalPoints;
          if (score > bestScore) {
            bestScore = score;
            isNewRecord = true;
          }

          totalSpiritGain += ev.isDoubleSuika
            ? 60
            : Math.round(9 + ev.newTier * 2.8 + Math.max(0, ev.combo - 1) * 6);

          renderer.spawnMergeFX(fxEvent, feverActive);

          if (ev.isDoubleSuika) {
            audio.playSuikaCelebration();
            bestComboLabel = '🍉双萃香!';
            triggerFever = true;
          } else {
            audio.playMerge(ev.newTier, ev.combo);
            if (ev.newTier >= MAX_TIER) {
              triggerFever = true;
            }
            if (ev.newTier > highestTier) {
              highestTier = Math.min(MAX_TIER, ev.newTier);
              tierUpdated = true;
            }
            if (ev.combo >= 2) {
              bestComboLabel = `${ev.combo}连击`;
            }
          }
        }

        if (triggerFever) {
          feverTimer = FEVER_DURATION;
          audio.playFeverStart();
          renderer.spawnFeverStartFX();
        }

        addSpirit(totalSpiritGain);
        if (tierUpdated) syncEvolutionChain();
        syncScoreHUD(bestComboLabel);
      }

      // Advance VFX & process Reimu homing ofuda impacts
      const landedOfudaIds = renderer.updateEffects(dt, physics.orbs, feverTimer > 0.01);
      if (landedOfudaIds.length > 0) {
        for (const orbId of landedOfudaIds) {
          const removed = physics.removeOrbById(orbId);
          if (removed) {
            const baseBonus = Math.max(5, ORB_TIERS[removed.tier].score * 2);
            const pts = feverTimer > 0.01 ? baseBonus * 2 : baseBonus;
            score += pts;
            if (score > bestScore) {
              bestScore = score;
              isNewRecord = true;
            }
            audio.playOfudaHit();
            renderer.spawnOfudaSealBurst(removed.x, removed.y, removed.tier, pts);
          }
        }
        syncScoreHUD();
      }

      // Danger overflow -> Auto Deathbomb 「决死结界」 if >= 1 full Spell charge!
      if (res.dangerTriggered) {
        if (getSpellCharges() >= 1) {
          triggerDeathbomb();
        } else {
          handleGameOver();
        }
      }
    } else if (phase === 'gameover') {
      elapsedTime += dt;
      renderer.updateEffects(dt, physics.orbs, false);
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
        canDrop: dropCooldownMs <= 0 && phase === 'playing' && !yukariPickMode,
        isAiming: activePointerId !== null && phase === 'playing' && !yukariPickMode,
        heldPopProgress,
        showGuide: phase === 'playing',
        predictedLandingY: predictedY,
        dangerTimer: physics.dangerTimer,
        nearDangerFactor,
        comboCount: physics.comboCount,
        time: elapsedTime,
        timeStopTimer,
        timeStopRapidDropsLeft,
        yukariPickMode,
        yukariHoveredOrbId,
        suikaShrinkTimer: physics.suikaShrinkTimer,
        feverTimer,
        firstDropHintAlpha,
      });
    }
  }

  // Initial sync & start RAF loop directly ready-to-drop!
  syncNextPreview();
  syncGapHoldUI();
  syncSpellUI();
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
      canvas.removeEventListener('contextmenu', onCanvasContextMenu);
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
      resetRun();
    },
    setPaused,
  };
}
