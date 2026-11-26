import type { GameInstance, GameMountContext } from '../../types/game';
import { FlappyAudio } from './audio';
import { FlappyRenderer } from './renderer';
import { FLAPPY_STYLES } from './styles';
import {
  CHARACTERS,
  CHARACTER_MAP,
  PHYSICS,
  PLAYABLE_HEIGHT,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  getMedalForScore,
  getSkyPhaseForScore,
  type CharacterId,
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

  private resizeObserver: ResizeObserver | null = null;
  private cleanupListeners: Array<() => void> = [];

  constructor(ctx: GameMountContext) {
    this.ctx = ctx;
    this.audio = new FlappyAudio(ctx.isMuted, ctx.onMuteChange);

    const initialBest = ctx.getBestScore();
    this.state = this.createInitialState('aya', initialBest);

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
    const c2d = this.canvas.getContext('2d');
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

    // Pause Overlay
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

  private createInitialState(character: CharacterId, bestScore: number): RenderState {
    return {
      phase: 'ready',
      character,
      player: {
        x: PHYSICS.PLAYER_X,
        y: PHYSICS.PLAYER_START_Y,
        vy: 0,
        rotation: 0,
        wingPhase: 0,
        wingBoost: 0,
        orbAngle: 0,
        radius: PHYSICS.HITBOX_RADIUS,
        dizzyTime: 0,
      },
      pipes: [],
      stars: [],
      particles: [],
      floatingTexts: [],
      score: 0,
      bestScore,
      pipesCleared: 0,
      starsCollected: 0,
      skyProgress: 0,
      scrollDistance: 0,
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
    const onPointerDown = (ev: PointerEvent) => {
      if (this.destroyed) return;
      if (ev.button !== 0 && ev.pointerType === 'mouse') return;
      if (this.state.phase === 'ready' || this.state.phase === 'playing') {
        ev.preventDefault();
        this.flap();
      }
    };

    const onKeyDown = (ev: KeyboardEvent) => {
      if (this.destroyed) return;
      // Ignore keys if user is typing in an input somewhere outside
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
            this.flap();
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

    this.stageEl.addEventListener('pointerdown', onPointerDown);
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
      let fitH = Math.min(availH, 760);
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

    // Celebrate character pick with a signature burst!
    this.spawnFlapBurst(this.state.player.x, this.state.player.y, id, 9);
    this.updatePhasePill();
    this.notifyHostScore();
  }

  private flap(): void {
    if (this.state.phase === 'ready') {
      this.state.phase = 'playing';
      this.pipesSpawned = 0;
      this.lastGapY = PHYSICS.PLAYER_START_Y;
      this.spawnInitialPipes();
      this.syncOverlays();
    }

    if (this.state.phase !== 'playing') return;

    this.state.player.vy = PHYSICS.FLAP_VELOCITY;
    this.state.player.wingBoost = 1;
    this.state.player.wingPhase = 0.6;
    this.audio.playFlap(this.state.character);
    this.spawnFlapBurst(this.state.player.x - 10, this.state.player.y + 4, this.state.character, 6);
  }

  private getDifficultyParams(score: number): {
    speed: number;
    gapHeight: number;
    spacing: number;
  } {
    // Comfortable 0..14, smooth gentle ramp across 15, 30, 50 while staying 100% fair
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
    // Comfortable runway before first obstacle
    const firstX = STAGE_WIDTH + 96;
    this.spawnPipeAt(firstX, null);
    const { spacing } = this.getDifficultyParams(0);
    this.spawnPipeAt(firstX + spacing, this.state.pipes[0]);
  }

  private spawnPipeAt(x: number, prevPipe: PipeObstacle | null): void {
    const { gapHeight } = this.getDifficultyParams(this.state.score);
    const minY = Math.max(PHYSICS.MIN_GAP_Y, gapHeight * 0.5 + 34);
    const maxY = Math.min(PHYSICS.MAX_GAP_Y, PLAYABLE_HEIGHT - gapHeight * 0.5 - 34);

    let gapY: number;
    if (this.pipesSpawned === 0) {
      // Friendly first pipe near center
      gapY = PLAYABLE_HEIGHT * 0.48 + (Math.random() * 64 - 32);
    } else {
      const low = Math.max(minY, this.lastGapY - PHYSICS.MAX_GAP_DELTA);
      const high = Math.min(maxY, this.lastGapY + PHYSICS.MAX_GAP_DELTA);
      gapY = low + Math.random() * (high - low);
    }
    gapY = clamp(gapY, minY, maxY);
    this.lastGapY = gapY;

    // Stylized mix: Bamboo pillars & Crimson Torii Shrine pillars!
    const style =
      this.pipesSpawned % 3 === 1 || (this.state.score >= 25 && this.pipesSpawned % 2 === 1)
        ? 'torii'
        : 'bamboo';

    const pipe: PipeObstacle = {
      id: this.nextEntityId++,
      x,
      width: PHYSICS.PIPE_WIDTH,
      gapY,
      gapHeight,
      passed: false,
      style,
      lanternPhase: Math.random() * Math.PI * 2,
    };
    this.state.pipes.push(pipe);
    this.pipesSpawned++;

    // Periodically spawn a floating Touhou P点 / 信仰星 in a safe-but-spicy spot!
    if (this.pipesSpawned >= 2 && this.pipesSpawned % 2 === 0) {
      const kind: 'power' | 'faith' = this.pipesSpawned % 4 === 0 ? 'faith' : 'power';
      if (prevPipe && Math.random() < 0.65) {
        // Midway along flight corridor between previous pipe and new pipe
        const midX = (prevPipe.x + prevPipe.width + pipe.x) * 0.5;
        const avgY = (prevPipe.gapY + pipe.gapY) * 0.5;
        const spicyOffset = (Math.random() < 0.5 ? -1 : 1) * (18 + Math.random() * 20);
        const sy = clamp(avgY + spicyOffset, 72, PLAYABLE_HEIGHT - 76);
        this.state.stars.push({
          id: this.nextEntityId++,
          x: midX,
          baseY: sy,
          y: sy,
          radius: 14,
          kind,
          collected: false,
          bobPhase: Math.random() * Math.PI * 2,
          spin: 0,
        });
      } else {
        // Slightly off-center inside the pipe gap (always safely reachable!)
        const offset = (Math.random() < 0.5 ? -1 : 1) * Math.min(22, gapHeight * 0.16);
        const sy = clamp(gapY + offset, 76, PLAYABLE_HEIGHT - 76);
        this.state.stars.push({
          id: this.nextEntityId++,
          x: pipe.x + pipe.width * 0.5,
          baseY: sy,
          y: sy,
          radius: 14,
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
      vy: -56,
      text: label,
      color,
      strokeColor: '#2a0c18',
      scale: points >= 2 ? 1.12 : 0.95,
      life: 0.85,
      maxLife: 0.85,
    });

    // Check sky phase milestone transitions (Dawn -> Twilight -> Scarlet Mist Night)
    const phaseInfo = getSkyPhaseForScore(this.state.score);
    if (phaseInfo.id !== this.lastSkyPhaseId) {
      this.lastSkyPhaseId = phaseInfo.id;
      this.state.phaseBannerText = phaseInfo.banner;
      this.state.phaseBannerTimer = 2.4;
      this.audio.playPhaseShift();
    }

    this.updatePhasePill();
    this.notifyHostScore();
  }

  private triggerCrash(): void {
    if (this.state.phase === 'dying' || this.state.phase === 'gameover') return;

    this.state.phase = 'dying';
    this.hitstopTimer = PHYSICS.HITSTOP_DURATION;
    this.state.flashAlpha = 0.78;
    this.state.shakeTime = 0.28;
    this.state.shakeIntensity = 7;
    this.state.player.vy = -210; // Small comical hop before tumbling
    this.state.player.dizzyTime = 0;

    this.audio.playCrash();
    this.spawnCrashBurst(this.state.player.x, this.state.player.y);
    this.finalizeRunOnce();

    // If already touching ground, enter gameover quickly
    if (this.state.player.y >= PLAYABLE_HEIGHT - this.state.player.radius - 2) {
      this.state.player.y = PLAYABLE_HEIGHT - this.state.player.radius;
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
    this.gameOverGuardTimer = 0.34;
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

  private spawnFlapBurst(x: number, y: number, character: CharacterId, count: number): void {
    if (character === 'aya') {
      const leafColors = ['#ef4444', '#f97316', '#f59e0b', '#dc2626'];
      for (let i = 0; i < count; i++) {
        this.state.particles.push({
          x: x + (Math.random() * 10 - 5),
          y: y + (Math.random() * 10 - 5),
          vx: -65 - Math.random() * 85,
          vy: (Math.random() - 0.5) * 80 + 20,
          size: 4.5 + Math.random() * 3.5,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 9,
          life: 0.55 + Math.random() * 0.35,
          maxLife: 0.9,
          color: leafColors[i % leafColors.length],
          kind: i % 3 === 0 ? 'feather' : 'maple',
          gravity: 85,
        });
      }
      // Subtle tengu wind gust arc
      this.state.particles.push({
        x: x - 6,
        y,
        vx: -115,
        vy: 14,
        size: 13,
        rotation: Math.PI,
        vRot: 0,
        life: 0.24,
        maxLife: 0.24,
        color: 'rgba(255, 248, 226, 0.72)',
        kind: 'wind',
        gravity: 0,
      });
    } else if (character === 'reimu') {
      const petalColors = ['#fda4af', '#fbcfe8', '#fff1f2', '#fb7185'];
      for (let i = 0; i < count; i++) {
        this.state.particles.push({
          x: x + (Math.random() * 12 - 6),
          y: y + (Math.random() * 10 - 5),
          vx: -55 - Math.random() * 70,
          vy: (Math.random() - 0.5) * 70 + 18,
          size: 4.2 + Math.random() * 2.8,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 7,
          life: 0.65 + Math.random() * 0.38,
          maxLife: 1.03,
          color: petalColors[i % petalColors.length],
          kind: 'sakura',
          gravity: 55,
        });
      }
    } else {
      const iceColors = ['#e0f2fe', '#7dd3fc', '#38bdf8', '#ffffff'];
      for (let i = 0; i < count; i++) {
        this.state.particles.push({
          x: x + (Math.random() * 12 - 6),
          y: y + (Math.random() * 12 - 6),
          vx: -60 - Math.random() * 80,
          vy: (Math.random() - 0.5) * 78 + 15,
          size: 4.2 + Math.random() * 3.2,
          rotation: Math.random() * Math.PI,
          vRot: (Math.random() - 0.5) * 6,
          life: 0.55 + Math.random() * 0.32,
          maxLife: 0.87,
          color: iceColors[i % iceColors.length],
          kind: i % 2 === 0 ? 'snowflake' : 'sparkle',
          gravity: 40,
        });
      }
    }
  }

  private spawnStarBurst(x: number, y: number, kind: 'power' | 'faith'): void {
    const colors =
      kind === 'power'
        ? ['#fde047', '#fb923c', '#ef4444', '#ffffff']
        : ['#ffffff', '#fde047', '#38bdf8', '#93c5fd'];

    this.state.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      size: 14,
      rotation: 0,
      vRot: 0,
      life: 0.36,
      maxLife: 0.36,
      color: colors[0],
      kind: 'ring',
      gravity: 0,
    });

    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + Math.random() * 0.25;
      const spd = 75 + Math.random() * 115;
      this.state.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: 4 + Math.random() * 3.5,
        rotation: a,
        vRot: (Math.random() - 0.5) * 10,
        life: 0.48 + Math.random() * 0.26,
        maxLife: 0.74,
        color: colors[i % colors.length],
        kind: i % 2 === 0 ? 'starBurst' : 'sparkle',
        gravity: 95,
      });
    }
  }

  private spawnCrashBurst(x: number, y: number): void {
    this.state.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      size: 16,
      rotation: 0,
      vRot: 0,
      life: 0.32,
      maxLife: 0.32,
      color: '#fff7ed',
      kind: 'ring',
      gravity: 0,
    });

    const colors = ['#fde047', '#fb7185', '#ffffff', '#f97316'];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
      const spd = 90 + Math.random() * 145;
      this.state.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 35,
        size: 4.5 + Math.random() * 3.5,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 12,
        life: 0.5 + Math.random() * 0.32,
        maxLife: 0.82,
        color: colors[i % colors.length],
        kind: i % 3 === 0 ? 'starBurst' : 'feather',
        gravity: 280,
      });
    }
  }

  private updateParticlesAndPopups(dt: number): void {
    for (let i = this.state.particles.length - 1; i >= 0; i--) {
      const p = this.state.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.state.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.vRot * dt;
    }

    for (let i = this.state.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.state.floatingTexts[i];
      ft.life -= dt;
      if (ft.life <= 0) {
        this.state.floatingTexts.splice(i, 1);
        continue;
      }
      ft.y += ft.vy * dt;
      ft.vy *= 0.96;
    }

    if (this.state.particles.length > 120) {
      this.state.particles.splice(0, this.state.particles.length - 120);
    }
  }

  private update(dt: number): void {
    if (this.scorePopTimer > 0) {
      this.scorePopTimer -= dt;
      if (this.scorePopTimer <= 0) {
        this.scoreLiveEl.classList.remove('pop');
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

    // Subtle impact hitstop freeze frame on crash!
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.updateParticlesAndPopups(dt * 0.35);
      return;
    }

    this.state.elapsed += dt;
    const player = this.state.player;
    player.orbAngle += dt * 3.8;
    player.wingBoost = Math.max(0, player.wingBoost - dt * 3.4);

    // Smoothly interpolate sky palette target (0 Dawn -> 1 Twilight -> 2 Scarlet Mist Night)
    const targetSky = this.state.score >= 30 ? 2 : this.state.score >= 15 ? 1 : 0;
    const skyDiff = targetSky - this.state.skyProgress;
    if (Math.abs(skyDiff) > 0.001) {
      this.state.skyProgress += Math.sign(skyDiff) * Math.min(Math.abs(skyDiff), dt * 0.45);
    }

    if (this.state.phase === 'ready') {
      // Gentle hover + relaxing scrolling scenery
      this.state.scrollDistance += PHYSICS.BASE_SPEED * 0.42 * dt;
      player.y = PHYSICS.PLAYER_START_Y + Math.sin(this.state.elapsed * 4.2) * 8.5;
      player.rotation = Math.sin(this.state.elapsed * 4.2 - 0.5) * 0.07;
      player.wingPhase += dt * 11;

      this.trailTimer += dt;
      if (this.trailTimer >= 0.24) {
        this.trailTimer = 0;
        this.spawnFlapBurst(player.x - 14, player.y + 4, this.state.character, 1);
      }

      this.updateParticlesAndPopups(dt);
      return;
    }

    if (this.state.phase === 'playing') {
      const diff = this.getDifficultyParams(this.state.score);
      this.state.speed += (diff.speed - this.state.speed) * Math.min(1, dt * 3);
      this.state.scrollDistance += this.state.speed * dt;

      // Vertical physics
      player.vy = Math.min(PHYSICS.MAX_FALL_SPEED, player.vy + PHYSICS.GRAVITY * dt);
      player.y += player.vy * dt;

      // Soft ceiling clamp so player cannot fly over pipes
      const ceilingY = player.radius + 4;
      if (player.y < ceilingY) {
        player.y = ceilingY;
        if (player.vy < 0) player.vy = 0;
      }

      // Snappy yet smooth Flappy pitch rotation
      const targetRot =
        player.vy < 95
          ? -0.44
          : clamp(((player.vy - 95) / (PHYSICS.MAX_FALL_SPEED - 95)) * 1.48 - 0.12, -0.44, 1.42);
      const rotSpeed = targetRot < player.rotation ? 15 : 6.2;
      player.rotation += (targetRot - player.rotation) * Math.min(1, dt * rotSpeed);

      // Wing animation (faster when ascending, glide-flutter while diving)
      player.wingPhase += dt * (player.vy < 80 ? 18 : 9);

      // Gentle ambient character particle trail while flying
      this.trailTimer += dt;
      if (this.trailTimer >= 0.16) {
        this.trailTimer = 0;
        this.spawnFlapBurst(player.x - 14, player.y + 3, this.state.character, 1);
      }

      // Move pipes & spawn next ones
      for (const pipe of this.state.pipes) {
        pipe.x -= this.state.speed * dt;
        if (!pipe.passed && pipe.x + pipe.width * 0.5 < player.x) {
          pipe.passed = true;
          this.state.pipesCleared++;
          this.audio.playScore();
          this.addScore(1, player.x + 14, player.y - 24, '+1', '#fffef0');
        }
      }

      // Cull offscreen pipes
      while (this.state.pipes.length > 0 && this.state.pipes[0].x + this.state.pipes[0].width < -32) {
        this.state.pipes.shift();
      }

      // Spawn new pipe when rightmost pipe leaves enough room
      const lastPipe = this.state.pipes[this.state.pipes.length - 1];
      if (!lastPipe || lastPipe.x <= STAGE_WIDTH + 60 - diff.spacing) {
        const nextX = lastPipe ? lastPipe.x + diff.spacing : STAGE_WIDTH + 80;
        this.spawnPipeAt(nextX, lastPipe ?? null);
      }

      // Update collectibles & check pickup
      for (let i = this.state.stars.length - 1; i >= 0; i--) {
        const s = this.state.stars[i];
        s.x -= this.state.speed * dt;
        s.y = s.baseY + Math.sin(this.state.elapsed * 4.4 + s.bobPhase) * 6.5;
        s.spin += dt * 2.2;

        if (!s.collected) {
          const dx = player.x - s.x;
          const dy = player.y - s.y;
          const collectR = player.radius + s.radius + 5; // Generous pickup magnet!
          if (dx * dx + dy * dy <= collectR * collectR) {
            s.collected = true;
            this.state.starsCollected++;
            this.audio.playStar();
            this.spawnStarBurst(s.x, s.y, s.kind);
            const label = s.kind === 'power' ? 'P +2!' : '信仰 +2!';
            const color = s.kind === 'power' ? '#fde047' : '#7dd3fc';
            this.addScore(2, s.x, s.y - 12, label, color);
          }
        }

        if (s.collected || s.x < -36) {
          this.state.stars.splice(i, 1);
        }
      }

      // Ground collision
      if (player.y + player.radius >= PLAYABLE_HEIGHT) {
        player.y = PLAYABLE_HEIGHT - player.radius;
        this.triggerCrash();
      } else {
        // Pipe collision (forgiving circle-vs-AABB with 2px visual grace inset)
        const grace = 2;
        for (const pipe of this.state.pipes) {
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

    // Game Over idle dizzy stars spin
    if (this.state.phase === 'gameover') {
      player.dizzyTime += dt;
      this.updateParticlesAndPopups(dt);
    }
  }

  private loop = (timestamp: number): void => {
    if (this.destroyed) return;
    // Clamp dt to 50ms so tab switching or frame stalls never teleport the flyer
    const rawDt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    const dt = clamp(Number.isFinite(rawDt) ? rawDt : 0.016, 0, 0.05);

    this.update(dt);
    this.renderer.render(this.canvasCtx, this.state);

    this.rafId = requestAnimationFrame(this.loop);
  };

  public restart(): void {
    if (this.destroyed) return;
    const selectedChar = this.state.character;
    const best = Math.max(this.state.bestScore, this.ctx.getBestScore());
    this.state = this.createInitialState(selectedChar, best);
    this.hitstopTimer = 0;
    this.gameOverGuardTimer = 0;
    this.scorePopTimer = 0;
    this.trailTimer = 0;
    this.pipesSpawned = 0;
    this.lastGapY = PHYSICS.PLAYER_START_Y;
    this.lastSkyPhaseId = 'dawn';
    this.runSaved = false;
    this.isNewBest = false;

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
      this.syncOverlays();
    } else if (!paused && this.state.phase === 'paused') {
      this.state.phase = 'playing';
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
