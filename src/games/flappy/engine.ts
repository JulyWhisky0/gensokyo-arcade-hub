import type { GameInstance, GameMountContext } from '../../types/game';
import { FlappyAudio } from './audio';
import { FlappyRenderer } from './renderer';
import { FLAPPY_STYLES } from './styles';
import {
  CHARACTERS,
  CHARACTER_MAP,
  MAX_PARTICLES,
  PHYSICS,
  PLAYABLE_HEIGHT,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  getMedalForScore,
  getSkyPhaseForScore,
  type CharacterId,
  type Particle,
  type ParticleKind,
  type PipeObstacle,
  type RenderState,
} from './types';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function circleIntersectsRect(
  cx: number,
  cy: number,
  cr: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): boolean {
  if (rw <= 0 || rh <= 0) return false;
  const closestX = clamp(cx, rx, rx + rw);
  const closestY = clamp(cy, ry, ry + rh);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < cr * cr;
}

function createParticlePool(): Particle[] {
  const pool: Particle[] = new Array(MAX_PARTICLES);
  for (let i = 0; i < MAX_PARTICLES; i++) {
    pool[i] = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 4,
      rotation: 0,
      vRot: 0,
      life: 0,
      maxLife: 1,
      color: '#ffffff',
      secondaryColor: '#ffffff',
      kind: 'sparkle',
      gravity: 0,
      drag: 1,
    };
  }
  return pool;
}

class FlappyEngine implements GameInstance {
  private readonly ctx: GameMountContext;
  private readonly audio: FlappyAudio;
  private readonly renderer = new FlappyRenderer();

  private rootEl: HTMLDivElement;
  private stageEl: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private canvasCtx: CanvasRenderingContext2D;

  // HUD & Overlay Elements
  private scoreLiveEl: HTMLDivElement;
  private phasePillEl: HTMLDivElement;
  private readyOverlayEl: HTMLDivElement;
  private pauseOverlayEl: HTMLDivElement;
  private gameOverOverlayEl: HTMLDivElement;
  private charButtons = new Map<CharacterId, HTMLButtonElement>();

  // Scorecard dynamic elements
  private goMedalDiscEl: HTMLDivElement;
  private goMedalLabelEl: HTMLDivElement;
  private goScoreEl: HTMLSpanElement;
  private goBestEl: HTMLSpanElement;
  private goNewBadgeEl: HTMLSpanElement;
  private goCharEl: HTMLSpanElement;
  private goStatsEl: HTMLSpanElement;
  private goNoteEl: HTMLDivElement;

  private state: RenderState;
  private rafId: number | null = null;
  private lastTimestamp = 0;
  private accumulator = 0;
  private flapBufferTimer = 0;
  private flapCooldownTimer = 0;
  private hitstopTimer = 0;
  private gameOverGuardTimer = 0;
  private scorePopTimer = 0;
  private trailTimer = 0;
  private nextEntityId = 1;
  private pipesSpawned = 0;
  private lastGapY: number = PHYSICS.PLAYER_START_Y;
  private lastSkyPhaseId: 'dawn' | 'twilight' | 'scarlet' = 'dawn';
  private runSaved = false;
  private isNewBest = false;
  private destroyed = false;
  private particleOverwriteCursor = 0;

  private resizeObserver: ResizeObserver | null = null;
  private cleanupListeners: Array<() => void> = [];

  constructor(ctx: GameMountContext) {
    this.ctx = ctx;
    this.audio = new FlappyAudio(ctx.isMuted, ctx.onMuteChange);

    const initialBest = ctx.getBestScore();
    this.state = this.createInitialState('aya', initialBest, createParticlePool());

    // Mount isolated DOM tree & scoped styles inside ctx.container
    ctx.container.innerHTML = '';

    const styleEl = document.createElement('style');
    styleEl.textContent = FLAPPY_STYLES;
    ctx.container.appendChild(styleEl);

    this.rootEl = document.createElement('div');
    this.rootEl.className = 'flappy-root';

    this.stageEl = document.createElement('div');
    this.stageEl.className = 'flappy-stage';

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'flappy-canvas';
    const c2d = this.canvas.getContext('2d', { alpha: false });
    if (!c2d) {
      throw new Error('Failed to initialize 2D canvas context for Flappy Gensokyo.');
    }
    this.canvasCtx = c2d;
    this.stageEl.appendChild(this.canvas);

    // Live Top HUD
    const hudEl = document.createElement('div');
    hudEl.className = 'flappy-hud';
    this.scoreLiveEl = document.createElement('div');
    this.scoreLiveEl.className = 'flappy-score-live';
    this.scoreLiveEl.textContent = '0';
    this.phasePillEl = document.createElement('div');
    this.phasePillEl.className = 'flappy-phase-pill';
    this.phasePillEl.textContent = '射命丸文 · 黎明竹林';
    hudEl.append(this.scoreLiveEl, this.phasePillEl);
    this.stageEl.appendChild(hudEl);

    // Ready Overlay (character selection + tap/space prompt)
    this.readyOverlayEl = this.buildReadyOverlay();
    this.stageEl.appendChild(this.readyOverlayEl);

    // Pause Overlay (preserves .flappy-modal-overlay:not(.hidden) with PAUSED)
    this.pauseOverlayEl = this.buildPauseOverlay();
    this.stageEl.appendChild(this.pauseOverlayEl);

    // Game Over Scorecard Overlay
    const goParts = this.buildGameOverOverlay();
    this.gameOverOverlayEl = goParts.overlay;
    this.goMedalDiscEl = goParts.medalDisc;
    this.goMedalLabelEl = goParts.medalLabel;
    this.goScoreEl = goParts.scoreVal;
    this.goBestEl = goParts.bestVal;
    this.goNewBadgeEl = goParts.newBadge;
    this.goCharEl = goParts.charVal;
    this.goStatsEl = goParts.statsVal;
    this.goNoteEl = goParts.noteEl;
    this.stageEl.appendChild(this.gameOverOverlayEl);

    this.rootEl.appendChild(this.stageEl);
    ctx.container.appendChild(this.rootEl);

    this.resizeCanvas();
    this.bindEvents();
    this.syncOverlays();
    this.notifyHostScore();

    this.lastTimestamp = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  private createInitialState(
    character: CharacterId,
    bestScore: number,
    particlePool: Particle[],
  ): RenderState {
    return {
      phase: 'ready',
      character,
      player: {
        x: PHYSICS.PLAYER_X,
        y: PHYSICS.PLAYER_START_Y,
        prevY: PHYSICS.PLAYER_START_Y,
        vy: 0,
        rotation: 0,
        prevRotation: 0,
        rotVelocity: 0,
        scaleX: 1,
        scaleY: 1,
        scaleVelX: 0,
        scaleVelY: 0,
        wingPhase: 0,
        wingBoost: 0,
        flapGlow: 0,
        scarfWave: 0,
        orbAngle: 0,
        radius: PHYSICS.HITBOX_RADIUS,
        dizzyTime: 0,
        blinkTimer: 2.8,
        blinkDuration: 0,
        determinedTimer: 0,
      },
      pipes: [],
      stars: [],
      particles: particlePool,
      particleCount: 0,
      floatingTexts: [],
      score: 0,
      bestScore,
      pipesCleared: 0,
      starsCollected: 0,
      skyProgress: 0,
      scrollDistance: 0,
      prevScrollDistance: 0,
      interpAlpha: 1,
      speed: PHYSICS.BASE_SPEED,
      elapsed: 0,
      flashAlpha: 0,
      shakeTime: 0,
      shakeIntensity: 0,
      phaseBannerText: '',
      phaseBannerTimer: 0,
    };
  }

  private buildReadyOverlay(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.className = 'flappy-overlay flappy-ready-overlay';

    const header = document.createElement('div');
    header.className = 'flappy-ready-header';
    header.innerHTML = `
      <div class="flappy-ready-kicker">GENSOKYO FLAPPY AYA</div>
      <div class="flappy-ready-title">竹林疾飞 · 准备振翼</div>
      <div class="flappy-ready-sub">穿越竹林与博丽鸟居，收集 P 点与信仰星 (+2)</div>
    `;

    const footer = document.createElement('div');
    footer.className = 'flappy-ready-footer';

    const hint = document.createElement('div');
    hint.className = 'flappy-tap-hint';
    hint.textContent = '✦ 点击屏幕 或 按 Space / ↑ / W 起飞 ✦';

    const selector = document.createElement('div');
    selector.className = 'flappy-char-selector';

    for (const cfg of CHARACTERS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `flappy-char-pill${cfg.id === this.state.character ? ' active' : ''}`;
      btn.innerHTML = `
        <span class="flappy-char-dot" style="background:${cfg.primaryColor};color:${cfg.primaryColor}"></span>
        <span class="flappy-char-name">${cfg.name}</span>
        <span class="flappy-char-desc">${cfg.tagline}</span>
      `;
      const onSelect = (ev: Event) => {
        ev.stopPropagation();
        this.selectCharacter(cfg.id);
      };
      btn.addEventListener('click', onSelect);
      this.cleanupListeners.push(() => btn.removeEventListener('click', onSelect));
      this.charButtons.set(cfg.id, btn);
      selector.appendChild(btn);
    }

    // Prevent pointerdown on selector from starting the run
    const stopProp = (ev: Event) => ev.stopPropagation();
    selector.addEventListener('pointerdown', stopProp);
    this.cleanupListeners.push(() => selector.removeEventListener('pointerdown', stopProp));

    footer.append(hint, selector);
    overlay.append(header, footer);
    return overlay;
  }

  private buildPauseOverlay(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.className = 'flappy-overlay flappy-modal-overlay hidden';

    const card = document.createElement('div');
    card.className = 'flappy-card';
    card.innerHTML = `
      <div class="flappy-card-kicker">PAUSED</div>
      <div class="flappy-card-title">竹林小憩</div>
    `;

    const actions = document.createElement('div');
    actions.className = 'flappy-actions';

    const resumeBtn = document.createElement('button');
    resumeBtn.type = 'button';
    resumeBtn.className = 'flappy-btn flappy-btn-primary';
    resumeBtn.textContent = '继续疾飞';

    const restartBtn = document.createElement('button');
    restartBtn.type = 'button';
    restartBtn.className = 'flappy-btn flappy-btn-secondary';
    restartBtn.textContent = '重新开始';

    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'flappy-btn flappy-btn-secondary';
    backBtn.textContent = '返回游艺厅';

    const onResume = (e: Event) => {
      e.stopPropagation();
      this.setPaused(false);
    };
    const onRestart = (e: Event) => {
      e.stopPropagation();
      this.restart();
    };
    const onBack = (e: Event) => {
      e.stopPropagation();
      this.ctx.onBackToMenu();
    };
    const stopCard = (e: Event) => e.stopPropagation();

    card.addEventListener('pointerdown', stopCard);
    resumeBtn.addEventListener('click', onResume);
    restartBtn.addEventListener('click', onRestart);
    backBtn.addEventListener('click', onBack);

    this.cleanupListeners.push(
      () => card.removeEventListener('pointerdown', stopCard),
      () => resumeBtn.removeEventListener('click', onResume),
      () => restartBtn.removeEventListener('click', onRestart),
      () => backBtn.removeEventListener('click', onBack),
    );

    actions.append(resumeBtn, restartBtn, backBtn);
    card.appendChild(actions);
    overlay.appendChild(card);
    return overlay;
  }

  private buildGameOverOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'flappy-overlay flappy-modal-overlay hidden';

    const card = document.createElement('div');
    card.className = 'flappy-card';

    const kicker = document.createElement('div');
    kicker.className = 'flappy-card-kicker';
    kicker.textContent = 'FLIGHT REPORT · 文文。新闻';

    const title = document.createElement('div');
    title.className = 'flappy-card-title';
    title.textContent = '飞行结束';

    const topBox = document.createElement('div');
    topBox.className = 'flappy-scorecard-top';

    const medalWrap = document.createElement('div');
    medalWrap.className = 'flappy-medal-wrap';
    const medalDisc = document.createElement('div');
    medalDisc.className = 'flappy-medal-disc';
    medalDisc.textContent = '✦';
    const medalLabel = document.createElement('div');
    medalLabel.className = 'flappy-medal-label';
    medalWrap.append(medalDisc, medalLabel);

    const scoreCols = document.createElement('div');
    scoreCols.className = 'flappy-score-cols';

    const rowNow = document.createElement('div');
    rowNow.className = 'flappy-score-row';
    const labelNow = document.createElement('span');
    labelNow.className = 'flappy-score-label';
    labelNow.textContent = '本次得分';
    const scoreWrap = document.createElement('span');
    const scoreVal = document.createElement('span');
    scoreVal.className = 'flappy-score-value';
    scoreVal.textContent = '0';
    const newBadge = document.createElement('span');
    newBadge.className = 'flappy-new-badge';
    newBadge.textContent = 'NEW!';
    newBadge.style.display = 'none';
    scoreWrap.append(scoreVal, newBadge);
    rowNow.append(labelNow, scoreWrap);

    const rowBest = document.createElement('div');
    rowBest.className = 'flappy-score-row';
    const labelBest = document.createElement('span');
    labelBest.className = 'flappy-score-label';
    labelBest.textContent = '最高纪录';
    const bestVal = document.createElement('span');
    bestVal.className = 'flappy-score-value best';
    bestVal.textContent = '0';
    rowBest.append(labelBest, bestVal);

    scoreCols.append(rowNow, rowBest);
    topBox.append(medalWrap, scoreCols);

    const metaStrip = document.createElement('div');
    metaStrip.className = 'flappy-meta-strip';
    const charVal = document.createElement('span');
    const statsVal = document.createElement('span');
    metaStrip.append(charVal, statsVal);

    const noteEl = document.createElement('div');
    noteEl.className = 'flappy-medal-note';

    const actions = document.createElement('div');
    actions.className = 'flappy-actions';

    const restartBtn = document.createElement('button');
    restartBtn.type = 'button';
    restartBtn.className = 'flappy-btn flappy-btn-primary';
    restartBtn.textContent = '再来一局 (R / Enter)';

    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'flappy-btn flappy-btn-secondary';
    backBtn.textContent = '返回游艺厅';

    const stopCard = (e: Event) => e.stopPropagation();
    const onRestart = (e: Event) => {
      e.stopPropagation();
      this.restart();
    };
    const onBack = (e: Event) => {
      e.stopPropagation();
      this.ctx.onBackToMenu();
    };

    card.addEventListener('pointerdown', stopCard);
    restartBtn.addEventListener('click', onRestart);
    backBtn.addEventListener('click', onBack);

    this.cleanupListeners.push(
      () => card.removeEventListener('pointerdown', stopCard),
      () => restartBtn.removeEventListener('click', onRestart),
      () => backBtn.removeEventListener('click', onBack),
    );

    actions.append(restartBtn, backBtn);
    card.append(kicker, title, topBox, metaStrip, noteEl, actions);
    overlay.appendChild(card);

    return {
      overlay,
      medalDisc,
      medalLabel,
      scoreVal,
      bestVal,
      newBadge,
      charVal,
      statsVal,
      noteEl,
    };
  }

  private bindEvents(): void {
    // Instant zero-latency response on mouse, touch, and pen via pointerdown
    const onPointerDown = (ev: PointerEvent) => {
      if (this.destroyed) return;
      if (ev.button !== 0 && ev.pointerType === 'mouse') return;
      if (this.state.phase === 'ready' || this.state.phase === 'playing') {
        ev.preventDefault();
        this.requestFlap();
      }
    };

    const onKeyDown = (ev: KeyboardEvent) => {
      if (this.destroyed) return;
      const target = ev.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      if (ev.code === 'Space' || ev.code === 'ArrowUp' || ev.code === 'KeyW') {
        if (this.state.phase === 'ready' || this.state.phase === 'playing') {
          ev.preventDefault();
          if (!ev.repeat) {
            this.requestFlap();
          }
        }
        return;
      }

      if (ev.code === 'KeyR' || ev.code === 'Enter') {
        if (this.state.phase === 'gameover' && this.gameOverGuardTimer <= 0) {
          ev.preventDefault();
          this.restart();
        }
        return;
      }

      if (ev.code === 'KeyP' || ev.code === 'Escape') {
        if (this.state.phase === 'playing') {
          ev.preventDefault();
          this.setPaused(true);
        } else if (this.state.phase === 'paused') {
          ev.preventDefault();
          this.setPaused(false);
        }
      }
    };

    const onWindowResize = () => this.resizeCanvas();

    this.stageEl.addEventListener('pointerdown', onPointerDown, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onWindowResize);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
      this.resizeObserver.observe(this.rootEl);
    }

    this.cleanupListeners.push(
      () => this.stageEl.removeEventListener('pointerdown', onPointerDown),
      () => window.removeEventListener('keydown', onKeyDown),
      () => window.removeEventListener('resize', onWindowResize),
    );
  }

  private resizeCanvas(): void {
    const availW = Math.max(0, this.rootEl.clientWidth - 12);
    const availH = Math.max(0, this.rootEl.clientHeight - 12);
    if (availW > 0 && availH > 0) {
      const ratio = STAGE_WIDTH / STAGE_HEIGHT;
      let fitH = Math.min(availH, 780);
      let fitW = fitH * ratio;
      if (fitW > availW) {
        fitW = availW;
        fitH = fitW / ratio;
      }
      this.stageEl.style.width = `${Math.floor(fitW)}px`;
      this.stageEl.style.height = `${Math.floor(fitH)}px`;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const targetW = Math.round(STAGE_WIDTH * dpr);
    const targetH = Math.round(STAGE_HEIGHT * dpr);
    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
    }
    this.canvasCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private selectCharacter(id: CharacterId): void {
    if (this.state.character === id) return;
    this.state.character = id;
    this.audio.playSelect();

    for (const [cid, btn] of this.charButtons.entries()) {
      btn.classList.toggle('active', cid === id);
    }

    // Playful character swap pop + signature flourish
    const p = this.state.player;
    p.scaleX = 0.86;
    p.scaleY = 1.18;
    p.scaleVelX = 1.4;
    p.scaleVelY = -1.5;
    p.flapGlow = 0.85;
    this.spawnFlapBurst(p.x, p.y, id, 9, true);
    this.updatePhasePill();
    this.notifyHostScore();
  }

  private requestFlap(): void {
    this.flapBufferTimer = PHYSICS.FLAP_BUFFER_WINDOW;
    if (this.state.phase === 'ready' || this.flapCooldownTimer <= 0) {
      this.executeFlap();
    }
  }

  private executeFlap(): void {
    if (this.state.phase === 'ready') {
      this.state.phase = 'playing';
      this.pipesSpawned = 0;
      this.lastGapY = PHYSICS.PLAYER_START_Y;
      this.spawnInitialPipes();
      this.syncOverlays();
    }

    if (this.state.phase !== 'playing') return;

    this.flapBufferTimer = 0;
    this.flapCooldownTimer = PHYSICS.FLAP_COOLDOWN;

    const p = this.state.player;
    p.vy = PHYSICS.FLAP_VELOCITY;
    p.wingBoost = 1;
    p.wingPhase = 0.45;
    p.flapGlow = 1;
    p.determinedTimer = 0.36;

    // Snappy elastic squash-and-stretch impulse on upward lift
    p.scaleX = 0.85;
    p.scaleY = 1.21;
    p.scaleVelX = 1.35;
    p.scaleVelY = -1.55;

    // Gentle upward angular impulse to kick critically-damped pitch smoothly upward
    p.rotVelocity = Math.min(p.rotVelocity, -5.2);

    this.audio.playFlap(this.state.character);
    this.spawnFlapBurst(p.x - 10, p.y + 5, this.state.character, 7, true);
  }

  private getDifficultyParams(score: number): {
    speed: number;
    gapHeight: number;
    spacing: number;
  } {
    let tierProgress = 0;
    if (score >= 50) {
      tierProgress = 1;
    } else if (score >= 30) {
      tierProgress = 0.62 + ((score - 30) / 20) * 0.38;
    } else if (score >= 15) {
      tierProgress = 0.25 + ((score - 15) / 15) * 0.37;
    } else {
      tierProgress = (score / 15) * 0.25;
    }

    return {
      speed: PHYSICS.BASE_SPEED + (PHYSICS.MAX_SPEED - PHYSICS.BASE_SPEED) * tierProgress,
      gapHeight: PHYSICS.BASE_GAP - (PHYSICS.BASE_GAP - PHYSICS.MIN_GAP) * tierProgress,
      spacing:
        PHYSICS.BASE_PIPE_SPACING -
        (PHYSICS.BASE_PIPE_SPACING - PHYSICS.MIN_PIPE_SPACING) * tierProgress,
    };
  }

  private spawnInitialPipes(): void {
    this.state.pipes = [];
    this.state.stars = [];
    // Comfortable scenic sightline before first obstacle glides into view
    const firstX = STAGE_WIDTH + 68;
    this.spawnPipeAt(firstX, null);
    const { spacing } = this.getDifficultyParams(0);
    this.spawnPipeAt(firstX + spacing, this.state.pipes[0]);
  }

  private spawnPipeAt(x: number, prevPipe: PipeObstacle | null): void {
    const { gapHeight } = this.getDifficultyParams(this.state.score);
    const minY = Math.max(PHYSICS.MIN_GAP_Y, gapHeight * 0.5 + 36);
    const maxY = Math.min(PHYSICS.MAX_GAP_Y, PLAYABLE_HEIGHT - gapHeight * 0.5 - 36);

    let gapY: number;
    if (this.pipesSpawned === 0) {
      gapY = PLAYABLE_HEIGHT * 0.48 + (Math.random() * 58 - 29);
    } else {
      const low = Math.max(minY, this.lastGapY - PHYSICS.MAX_GAP_DELTA);
      const high = Math.min(maxY, this.lastGapY + PHYSICS.MAX_GAP_DELTA);
      gapY = low + Math.random() * (high - low);
    }
    gapY = clamp(gapY, minY, maxY);
    this.lastGapY = gapY;

    const style =
      this.pipesSpawned % 3 === 1 || (this.state.score >= 25 && this.pipesSpawned % 2 === 1)
        ? 'torii'
        : 'bamboo';

    const pipe: PipeObstacle = {
      id: this.nextEntityId++,
      x,
      prevX: x,
      width: PHYSICS.PIPE_WIDTH,
      gapY,
      gapHeight,
      passed: false,
      style,
      lanternPhase: Math.random() * Math.PI * 2,
    };
    this.state.pipes.push(pipe);
    this.pipesSpawned++;

    // Periodically spawn a floating Touhou [P] Power or [★] Faith Star in a fair, enticing spot
    if (this.pipesSpawned >= 2 && this.pipesSpawned % 2 === 0) {
      const kind: 'power' | 'faith' = this.pipesSpawned % 4 === 0 ? 'faith' : 'power';
      if (prevPipe && Math.random() < 0.65) {
        const midX = (prevPipe.x + prevPipe.width + pipe.x) * 0.5;
        const avgY = (prevPipe.gapY + pipe.gapY) * 0.5;
        const spicyOffset = (Math.random() < 0.5 ? -1 : 1) * (16 + Math.random() * 20);
        const sy = clamp(avgY + spicyOffset, 72, PLAYABLE_HEIGHT - 76);
        this.state.stars.push({
          id: this.nextEntityId++,
          x: midX,
          prevX: midX,
          baseY: sy,
          y: sy,
          prevY: sy,
          radius: 14.5,
          kind,
          collected: false,
          bobPhase: Math.random() * Math.PI * 2,
          spin: 0,
        });
      } else {
        const offset = (Math.random() < 0.5 ? -1 : 1) * Math.min(22, gapHeight * 0.16);
        const sy = clamp(gapY + offset, 76, PLAYABLE_HEIGHT - 76);
        const sx = pipe.x + pipe.width * 0.5;
        this.state.stars.push({
          id: this.nextEntityId++,
          x: sx,
          prevX: sx,
          baseY: sy,
          y: sy,
          prevY: sy,
          radius: 14.5,
          kind,
          collected: false,
          bobPhase: Math.random() * Math.PI * 2,
          spin: 0,
        });
      }
    }
  }

  private addScore(points: number, popupX: number, popupY: number, label: string, color: string): void {
    this.state.score += points;
    if (this.state.score > this.state.bestScore) {
      this.state.bestScore = this.state.score;
      this.isNewBest = true;
    }

    this.scoreLiveEl.textContent = String(this.state.score);
    this.scoreLiveEl.classList.add('pop');
    this.scorePopTimer = 0.13;

    this.state.floatingTexts.push({
      x: popupX,
      y: popupY,
      vy: -58,
      text: label,
      color,
      strokeColor: '#2a0c18',
      scale: points >= 2 ? 1.15 : 0.96,
      life: 0.88,
      maxLife: 0.88,
    });

    const phaseInfo = getSkyPhaseForScore(this.state.score);
    if (phaseInfo.id !== this.lastSkyPhaseId) {
      this.lastSkyPhaseId = phaseInfo.id;
      this.state.phaseBannerText = phaseInfo.banner;
      this.state.phaseBannerTimer = 2.45;
      this.audio.playPhaseShift();
    }

    this.updatePhasePill();
    this.notifyHostScore();
  }

  private triggerCrash(): void {
    if (this.state.phase === 'dying' || this.state.phase === 'gameover') return;

    this.state.phase = 'dying';
    this.flapBufferTimer = 0;
    this.hitstopTimer = PHYSICS.HITSTOP_DURATION;
    this.state.flashAlpha = 0.76;
    this.state.shakeTime = 0.28;
    this.state.shakeIntensity = 7.5;

    const p = this.state.player;
    p.vy = -215;
    p.dizzyTime = 0;
    p.scaleX = 1.24;
    p.scaleY = 0.78;
    p.scaleVelX = -1.6;
    p.scaleVelY = 1.5;

    this.audio.playCrash();
    this.spawnCrashBurst(p.x, p.y);
    this.finalizeRunOnce();

    if (p.y >= PLAYABLE_HEIGHT - p.radius - 2) {
      p.y = PLAYABLE_HEIGHT - p.radius;
      p.prevY = p.y;
      this.enterGameOver();
    }
  }

  private finalizeRunOnce(): void {
    if (this.runSaved) return;
    this.runSaved = true;
    const medal = getMedalForScore(this.state.score);
    const charName = CHARACTER_MAP[this.state.character].name;
    const extra =
      medal.tier !== 'none' ? `${charName} · ${medal.label}` : `${charName} · ${this.state.pipesCleared}根柱`;
    this.ctx.saveScore(this.state.score, extra);
    this.state.bestScore = Math.max(this.state.bestScore, this.ctx.getBestScore());
    this.ctx.onGameOver(this.state.score, extra);
    this.notifyHostScore();
  }

  private enterGameOver(): void {
    if (this.state.phase === 'gameover') return;
    this.state.phase = 'gameover';
    this.gameOverGuardTimer = 0.32;
    this.finalizeRunOnce();
    this.populateGameOverCard();
    this.syncOverlays();
  }

  private populateGameOverCard(): void {
    const medal = getMedalForScore(this.state.score);
    const charCfg = CHARACTER_MAP[this.state.character];
    const medalIcon =
      medal.tier === 'platinum'
        ? '♛'
        : medal.tier === 'gold'
          ? '★'
          : medal.tier === 'silver'
            ? '✦'
            : medal.tier === 'bronze'
              ? '◆'
              : '✿';

    this.goMedalDiscEl.textContent = medalIcon;
    this.goMedalDiscEl.style.setProperty('--medal-color', medal.color);
    this.goMedalDiscEl.style.setProperty('--medal-rim', medal.rimColor);
    this.goMedalDiscEl.style.setProperty('--medal-glow', medal.glowColor);
    this.goMedalLabelEl.textContent = medal.label;

    this.goScoreEl.textContent = String(this.state.score);
    this.goBestEl.textContent = String(this.state.bestScore);
    this.goNewBadgeEl.style.display = this.isNewBest && this.state.score > 0 ? 'inline-block' : 'none';

    this.goCharEl.textContent = `飞行角色：${charCfg.name}`;
    this.goStatsEl.textContent = `柱子 ${this.state.pipesCleared} · 星点 ${this.state.starsCollected}`;
    this.goNoteEl.textContent = medal.subtitle;
  }

  private updatePhasePill(): void {
    const charName = CHARACTER_MAP[this.state.character].name;
    const sky = getSkyPhaseForScore(this.state.score);
    this.phasePillEl.textContent = `${charName} · ${sky.name}`;
  }

  private notifyHostScore(): void {
    const charName = CHARACTER_MAP[this.state.character].name;
    const sky = getSkyPhaseForScore(this.state.score);
    this.ctx.onScoreChange(this.state.score, this.state.bestScore, `${charName} · ${sky.name}`);
  }

  private syncOverlays(): void {
    this.readyOverlayEl.classList.toggle('hidden', this.state.phase !== 'ready');
    this.pauseOverlayEl.classList.toggle('hidden', this.state.phase !== 'paused');
    this.gameOverOverlayEl.classList.toggle('hidden', this.state.phase !== 'gameover');
    this.scoreLiveEl.style.opacity = this.state.phase === 'ready' ? '0' : '1';
  }

  // Zero-GC pooled particle emitter
  private emitParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    size: number,
    rotation: number,
    vRot: number,
    life: number,
    color: string,
    secondaryColor: string,
    kind: ParticleKind,
    gravity: number,
    drag = 1,
  ): void {
    let idx: number;
    if (this.state.particleCount < MAX_PARTICLES) {
      idx = this.state.particleCount++;
    } else {
      idx = this.particleOverwriteCursor;
      this.particleOverwriteCursor = (this.particleOverwriteCursor + 1) % MAX_PARTICLES;
    }

    const p = this.state.particles[idx];
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.size = size;
    p.rotation = rotation;
    p.vRot = vRot;
    p.life = life;
    p.maxLife = life;
    p.color = color;
    p.secondaryColor = secondaryColor;
    p.kind = kind;
    p.gravity = gravity;
    p.drag = drag;
  }

  private spawnFlapBurst(
    x: number,
    y: number,
    character: CharacterId,
    count: number,
    withAirRing: boolean,
  ): void {
    // Crisp white wind-gust air ring on every energetic flap!
    if (withAirRing) {
      this.emitParticle(
        x + 4,
        y + 8,
        -68,
        36,
        15,
        -0.16,
        0,
        0.26,
        character === 'cirno'
          ? 'rgba(224, 247, 255, 0.92)'
          : character === 'reimu'
            ? 'rgba(255, 241, 244, 0.9)'
            : 'rgba(255, 252, 240, 0.92)',
        '#ffffff',
        'airRing',
        0,
        0.92,
      );
    }

    if (character === 'aya') {
      const leafColors = ['#ef4444', '#f97316', '#f59e0b', '#dc2626'];
      for (let i = 0; i < count; i++) {
        this.emitParticle(
          x + (Math.random() * 12 - 6),
          y + (Math.random() * 10 - 5),
          -72 - Math.random() * 92,
          (Math.random() - 0.5) * 78 + 22,
          4.6 + Math.random() * 3.4,
          Math.random() * Math.PI * 2,
          (Math.random() - 0.5) * 9,
          0.56 + Math.random() * 0.34,
          leafColors[i % leafColors.length],
          '#fde68a',
          i % 4 === 0 ? 'feather' : 'maple',
          82,
          0.985,
        );
      }
      // Silky curving tengu wind ribbon
      if (withAirRing || Math.random() < 0.55) {
        this.emitParticle(
          x - 4,
          y + (Math.random() * 10 - 5),
          -148 - Math.random() * 32,
          (Math.random() - 0.5) * 26 + 10,
          17 + Math.random() * 7,
          (Math.random() - 0.5) * 0.25,
          0,
          0.28,
          'rgba(255, 250, 232, 0.78)',
          'rgba(254, 202, 202, 0.45)',
          'windRibbon',
          0,
          0.96,
        );
      }
    } else if (character === 'reimu') {
      const petalColors = ['#fda4af', '#fbcfe8', '#fff1f2', '#fb7185'];
      for (let i = 0; i < count; i++) {
        this.emitParticle(
          x + (Math.random() * 12 - 6),
          y + (Math.random() * 10 - 5),
          -58 - Math.random() * 75,
          (Math.random() - 0.5) * 72 + 18,
          4.4 + Math.random() * 2.8,
          Math.random() * Math.PI * 2,
          (Math.random() - 0.5) * 7,
          0.66 + Math.random() * 0.36,
          petalColors[i % petalColors.length],
          '#fff5f7',
          i % 4 === 0 ? 'sparkle' : 'sakura',
          52,
          0.985,
        );
      }
    } else {
      const iceColors = ['#e0f2fe', '#7dd3fc', '#38bdf8', '#ffffff'];
      for (let i = 0; i < count; i++) {
        const kind: ParticleKind =
          i % 3 === 0 ? 'iceCrystal' : i % 2 === 0 ? 'snowflake' : 'sparkle';
        this.emitParticle(
          x + (Math.random() * 12 - 6),
          y + (Math.random() * 12 - 6),
          -62 - Math.random() * 82,
          (Math.random() - 0.5) * 76 + 14,
          4.4 + Math.random() * 3.2,
          Math.random() * Math.PI,
          (Math.random() - 0.5) * 6,
          0.56 + Math.random() * 0.34,
          iceColors[i % iceColors.length],
          '#bae6fd',
          kind,
          38,
          0.985,
        );
      }
    }
  }

  private spawnStarBurst(x: number, y: number, kind: 'power' | 'faith'): void {
    const colors =
      kind === 'power'
        ? ['#fde047', '#fb923c', '#ef4444', '#ffffff']
        : ['#ffffff', '#fde047', '#38bdf8', '#93c5fd'];

    this.emitParticle(x, y, 0, 0, 15, 0, 0, 0.38, colors[0], '#ffffff', 'ring', 0, 1);

    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + Math.random() * 0.22;
      const spd = 76 + Math.random() * 120;
      this.emitParticle(
        x,
        y,
        Math.cos(a) * spd,
        Math.sin(a) * spd,
        4.2 + Math.random() * 3.6,
        a,
        (Math.random() - 0.5) * 10,
        0.5 + Math.random() * 0.28,
        colors[i % colors.length],
        '#ffffff',
        i % 2 === 0 ? 'starBurst' : 'sparkle',
        92,
        0.96,
      );
    }
  }

  private spawnCrashBurst(x: number, y: number): void {
    this.emitParticle(x, y, 0, 0, 17, 0, 0, 0.34, '#fff7ed', '#ffffff', 'ring', 0, 1);

    const colors = ['#fde047', '#fb7185', '#ffffff', '#f97316'];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + Math.random() * 0.28;
      const spd = 92 + Math.random() * 150;
      this.emitParticle(
        x,
        y,
        Math.cos(a) * spd,
        Math.sin(a) * spd - 36,
        4.6 + Math.random() * 3.6,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 12,
        0.52 + Math.random() * 0.34,
        colors[i % colors.length],
        '#fffbeb',
        i % 3 === 0 ? 'starBurst' : 'feather',
        275,
        0.98,
      );
    }
  }

  private updateParticlesAndPopups(dt: number): void {
    const pool = this.state.particles;
    let count = this.state.particleCount;
    const dragPow = dt * 60;

    for (let i = count - 1; i >= 0; i--) {
      const p = pool[i];
      p.life -= dt;
      if (p.life <= 0) {
        // O(1) swap-remove without allocating or shifting arrays
        count--;
        if (i !== count) {
          const last = pool[count];
          pool[count] = p;
          pool[i] = last;
        }
        continue;
      }
      if (p.drag < 1) {
        const d = Math.pow(p.drag, dragPow);
        p.vx *= d;
        p.vy *= d;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.vRot * dt;
    }
    this.state.particleCount = count;

    const texts = this.state.floatingTexts;
    for (let i = texts.length - 1; i >= 0; i--) {
      const ft = texts[i];
      ft.life -= dt;
      if (ft.life <= 0) {
        texts.splice(i, 1);
        continue;
      }
      ft.y += ft.vy * dt;
      ft.vy *= Math.pow(0.955, dragPow);
    }
  }

  private snapshotPreviousPositions(): void {
    const s = this.state;
    s.prevScrollDistance = s.scrollDistance;
    s.player.prevY = s.player.y;
    s.player.prevRotation = s.player.rotation;
    for (let i = 0; i < s.pipes.length; i++) {
      s.pipes[i].prevX = s.pipes[i].x;
    }
    for (let i = 0; i < s.stars.length; i++) {
      s.stars[i].prevX = s.stars[i].x;
      s.stars[i].prevY = s.stars[i].y;
    }
  }

  private stepSimulation(dt: number): void {
    if (this.scorePopTimer > 0) {
      this.scorePopTimer -= dt;
      if (this.scorePopTimer <= 0) {
        this.scoreLiveEl.classList.remove('pop');
      }
    }

    if (this.flapCooldownTimer > 0) {
      this.flapCooldownTimer = Math.max(0, this.flapCooldownTimer - dt);
    }
    if (this.flapBufferTimer > 0) {
      this.flapBufferTimer = Math.max(0, this.flapBufferTimer - dt);
      if (this.flapCooldownTimer <= 0 && this.state.phase === 'playing') {
        this.executeFlap();
      }
    }

    if (this.state.flashAlpha > 0) {
      this.state.flashAlpha = Math.max(0, this.state.flashAlpha - dt * 2.8);
    }
    if (this.state.shakeTime > 0) {
      this.state.shakeTime = Math.max(0, this.state.shakeTime - dt);
    }
    if (this.state.phaseBannerTimer > 0) {
      this.state.phaseBannerTimer = Math.max(0, this.state.phaseBannerTimer - dt);
    }
    if (this.gameOverGuardTimer > 0) {
      this.gameOverGuardTimer = Math.max(0, this.gameOverGuardTimer - dt);
    }

    if (this.state.phase === 'paused') {
      return;
    }

    // Subtle impact hitstop freeze frame on crash
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.updateParticlesAndPopups(dt * 0.35);
      return;
    }

    this.state.elapsed += dt;
    const player = this.state.player;
    player.orbAngle += dt * 3.9;
    player.wingBoost = Math.max(0, player.wingBoost - dt * 3.6);
    player.flapGlow = Math.max(0, player.flapGlow - dt * 3.2);
    player.determinedTimer = Math.max(0, player.determinedTimer - dt);
    player.scarfWave += dt * (11.5 + (this.state.speed - PHYSICS.BASE_SPEED) * 0.06);

    // Natural subtle anime blinking
    if (player.blinkDuration > 0) {
      player.blinkDuration = Math.max(0, player.blinkDuration - dt);
    } else {
      player.blinkTimer -= dt;
      if (player.blinkTimer <= 0) {
        player.blinkDuration = 0.11;
        player.blinkTimer = 2.6 + Math.random() * 2.8;
      }
    }

    // Elastic spring return for squash-and-stretch
    const springK = 320;
    const springC = 18;
    player.scaleVelX += ((1 - player.scaleX) * springK - player.scaleVelX * springC) * dt;
    player.scaleVelY += ((1 - player.scaleY) * springK - player.scaleVelY * springC) * dt;
    player.scaleX = clamp(player.scaleX + player.scaleVelX * dt, 0.72, 1.32);
    player.scaleY = clamp(player.scaleY + player.scaleVelY * dt, 0.72, 1.34);

    // Continuous smooth cross-fade sky progress (0 Dawn -> 1 Golden Sunset -> 2 Scarlet Mist Night)
    const targetSky =
      this.state.score >= 30
        ? 2
        : this.state.score >= 15
          ? 1 + clamp((this.state.score - 15) / 15, 0, 1) * 0.32
          : clamp(this.state.score / 15, 0, 1) * 0.35;
    const skyDiff = targetSky - this.state.skyProgress;
    if (Math.abs(skyDiff) > 0.0005) {
      this.state.skyProgress += skyDiff * Math.min(1, dt * 1.15);
    }

    if (this.state.phase === 'ready') {
      this.state.scrollDistance += PHYSICS.BASE_SPEED * 0.44 * dt;
      player.y = PHYSICS.PLAYER_START_Y + Math.sin(this.state.elapsed * 4.1) * 8.5;
      player.rotation = Math.sin(this.state.elapsed * 4.1 - 0.5) * 0.075;
      player.wingPhase += dt * 11.2;

      this.trailTimer += dt;
      if (this.trailTimer >= 0.22) {
        this.trailTimer = 0;
        this.spawnFlapBurst(player.x - 14, player.y + 4, this.state.character, 1, false);
      }

      this.updateParticlesAndPopups(dt);
      return;
    }

    if (this.state.phase === 'playing') {
      const diff = this.getDifficultyParams(this.state.score);
      this.state.speed += (diff.speed - this.state.speed) * Math.min(1, dt * 3.2);
      this.state.scrollDistance += this.state.speed * dt;

      // Vertical physics
      player.vy = Math.min(PHYSICS.MAX_FALL_SPEED, player.vy + PHYSICS.GRAVITY * dt);
      player.y += player.vy * dt;

      // Soft ceiling clamp so player cannot fly above pipes
      const ceilingY = player.radius + 5;
      if (player.y < ceilingY) {
        player.y = ceilingY;
        if (player.vy < 0) player.vy = 0;
      }

      // Critically-damped spring pitch angle: snappy upward lift, graceful nose-dive curve
      let targetRot: number;
      if (player.vy < 65) {
        targetRot = -0.42;
      } else {
        const diveT = clamp((player.vy - 65) / (PHYSICS.MAX_FALL_SPEED - 65), 0, 1);
        targetRot = -0.42 + (diveT * diveT * 0.68 + diveT * 0.32) * 1.78;
      }
      const omega = targetRot < player.rotation ? 22 : 11.5;
      const rotAccel = omega * omega * (targetRot - player.rotation) - 2 * omega * player.rotVelocity;
      player.rotVelocity += rotAccel * dt;
      player.rotation = clamp(player.rotation + player.rotVelocity * dt, -0.56, 1.44);

      // Articulated wing cadence (energetic on ascent, graceful flutter on dive)
      player.wingPhase += dt * (player.vy < 70 ? 19.5 : 9.2);

      // Ambient themed character trail while flying
      this.trailTimer += dt;
      if (this.trailTimer >= 0.14) {
        this.trailTimer = 0;
        this.spawnFlapBurst(player.x - 14, player.y + 3, this.state.character, 1, false);
      }

      // Move pipes & score checks
      for (let i = 0; i < this.state.pipes.length; i++) {
        const pipe = this.state.pipes[i];
        pipe.x -= this.state.speed * dt;
        if (!pipe.passed && pipe.x + pipe.width * 0.5 < player.x) {
          pipe.passed = true;
          this.state.pipesCleared++;
          this.audio.playScore();
          this.addScore(1, player.x + 16, player.y - 24, '+1', '#fffef0');
        }
      }

      // Cull offscreen pipes
      while (this.state.pipes.length > 0 && this.state.pipes[0].x + this.state.pipes[0].width < -40) {
        this.state.pipes.shift();
      }

      // Spawn new pipe ahead of right edge
      const lastPipe = this.state.pipes[this.state.pipes.length - 1];
      if (!lastPipe || lastPipe.x <= STAGE_WIDTH + 72 - diff.spacing) {
        const nextX = lastPipe ? lastPipe.x + diff.spacing : STAGE_WIDTH + 72;
        this.spawnPipeAt(nextX, lastPipe ?? null);
      }

      // Update collectibles & pickup checks
      for (let i = this.state.stars.length - 1; i >= 0; i--) {
        const s = this.state.stars[i];
        s.x -= this.state.speed * dt;
        s.y = s.baseY + Math.sin(this.state.elapsed * 4.4 + s.bobPhase) * 6.5;
        s.spin += dt * 2.4;

        if (!s.collected) {
          const dx = player.x - s.x;
          const dy = player.y - s.y;
          const collectR = player.radius + s.radius + 5.5;
          if (dx * dx + dy * dy <= collectR * collectR) {
            s.collected = true;
            this.state.starsCollected++;
            this.audio.playStar();
            this.spawnStarBurst(s.x, s.y, s.kind);
            const label = s.kind === 'power' ? 'P +2!' : '★ +2!';
            const color = s.kind === 'power' ? '#fde047' : '#7dd3fc';
            this.addScore(2, s.x, s.y - 12, label, color);
          }
        }

        if (s.collected || s.x < -40) {
          this.state.stars.splice(i, 1);
        }
      }

      // Ground collision
      if (player.y + player.radius >= PLAYABLE_HEIGHT) {
        player.y = PLAYABLE_HEIGHT - player.radius;
        this.triggerCrash();
      } else {
        // Forgiving inset circle-vs-AABB pipe collision
        const grace = 2.5;
        for (let i = 0; i < this.state.pipes.length; i++) {
          const pipe = this.state.pipes[i];
          if (
            pipe.x + pipe.width + PHYSICS.PIPE_CAP_OVERHANG + 4 < player.x - player.radius ||
            pipe.x - PHYSICS.PIPE_CAP_OVERHANG - 4 > player.x + player.radius
          ) {
            continue;
          }

          const topH = Math.max(0, pipe.gapY - pipe.gapHeight * 0.5);
          const bottomY = pipe.gapY + pipe.gapHeight * 0.5;
          const bottomH = Math.max(0, PLAYABLE_HEIGHT - bottomY);

          const capOver = PHYSICS.PIPE_CAP_OVERHANG;
          const capH = PHYSICS.PIPE_CAP_HEIGHT;

          const hitTopShaft = circleIntersectsRect(
            player.x,
            player.y,
            player.radius,
            pipe.x + grace,
            0,
            pipe.width - grace * 2,
            Math.max(0, topH - grace),
          );
          const hitTopCap = circleIntersectsRect(
            player.x,
            player.y,
            player.radius,
            pipe.x - capOver + grace,
            Math.max(0, topH - capH + grace),
            pipe.width + capOver * 2 - grace * 2,
            Math.max(0, Math.min(capH, topH) - grace * 2),
          );
          const hitBottomShaft = circleIntersectsRect(
            player.x,
            player.y,
            player.radius,
            pipe.x + grace,
            bottomY + grace,
            pipe.width - grace * 2,
            Math.max(0, bottomH - grace),
          );
          const hitBottomCap = circleIntersectsRect(
            player.x,
            player.y,
            player.radius,
            pipe.x - capOver + grace,
            bottomY + grace,
            pipe.width + capOver * 2 - grace * 2,
            Math.max(0, Math.min(capH, bottomH) - grace * 2),
          );

          if (hitTopShaft || hitTopCap || hitBottomShaft || hitBottomCap) {
            this.triggerCrash();
            break;
          }
        }
      }

      this.updateParticlesAndPopups(dt);
      return;
    }

    if (this.state.phase === 'dying') {
      player.dizzyTime += dt;
      player.vy = Math.min(PHYSICS.MAX_FALL_SPEED * 1.15, player.vy + PHYSICS.GRAVITY * 1.1 * dt);
      player.y += player.vy * dt;
      player.rotation = Math.min(1.55, player.rotation + dt * 5.2);

      if (player.y + player.radius >= PLAYABLE_HEIGHT) {
        player.y = PLAYABLE_HEIGHT - player.radius;
        this.enterGameOver();
      }
      this.updateParticlesAndPopups(dt);
      return;
    }

    if (this.state.phase === 'gameover') {
      player.dizzyTime += dt;
      this.updateParticlesAndPopups(dt);
    }
  }

  private loop = (timestamp: number): void => {
    if (this.destroyed) return;
    const rawDt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    const clampedDt = clamp(Number.isFinite(rawDt) ? rawDt : PHYSICS.FIXED_DT, 0, 0.05);

    if (this.state.phase === 'paused') {
      this.state.interpAlpha = 1;
    } else {
      this.accumulator += clampedDt;
      let steps = 0;
      const maxSteps = 6;
      while (this.accumulator >= PHYSICS.FIXED_DT && steps < maxSteps) {
        this.snapshotPreviousPositions();
        this.stepSimulation(PHYSICS.FIXED_DT);
        this.accumulator -= PHYSICS.FIXED_DT;
        steps++;
      }
      if (steps === maxSteps && this.accumulator > PHYSICS.FIXED_DT) {
        this.accumulator = 0;
      }
      this.state.interpAlpha = clamp(this.accumulator / PHYSICS.FIXED_DT, 0, 1);
    }

    this.renderer.render(this.canvasCtx, this.state);

    this.rafId = requestAnimationFrame(this.loop);
  };

  public restart(): void {
    if (this.destroyed) return;
    const selectedChar = this.state.character;
    const best = Math.max(this.state.bestScore, this.ctx.getBestScore());
    const pool = this.state.particles;
    this.state = this.createInitialState(selectedChar, best, pool);
    this.accumulator = 0;
    this.flapBufferTimer = 0;
    this.flapCooldownTimer = 0;
    this.hitstopTimer = 0;
    this.gameOverGuardTimer = 0;
    this.scorePopTimer = 0;
    this.trailTimer = 0;
    this.pipesSpawned = 0;
    this.lastGapY = PHYSICS.PLAYER_START_Y;
    this.lastSkyPhaseId = 'dawn';
    this.runSaved = false;
    this.isNewBest = false;
    this.particleOverwriteCursor = 0;

    this.scoreLiveEl.textContent = '0';
    this.scoreLiveEl.classList.remove('pop');
    this.updatePhasePill();
    this.syncOverlays();
    this.notifyHostScore();
  }

  public setPaused(paused: boolean): void {
    if (this.destroyed) return;
    if (paused && this.state.phase === 'playing') {
      this.state.phase = 'paused';
      this.flapBufferTimer = 0;
      this.syncOverlays();
    } else if (!paused && this.state.phase === 'paused') {
      this.state.phase = 'playing';
      this.accumulator = 0;
      this.lastTimestamp = performance.now();
      this.syncOverlays();
    }
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    for (const cleanup of this.cleanupListeners) {
      cleanup();
    }
    this.cleanupListeners = [];

    this.audio.destroy();
    this.ctx.container.innerHTML = '';
  }
}

export function mountFlappyGame(ctx: GameMountContext): GameInstance {
  return new FlappyEngine(ctx);
}
