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
  type DanmakuColor,
  type DanmakuOrb,
  type Particle,
  type ParticleKind,
  type PipeObstacle,
  type RenderState,
} from './types';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function getHitboxRadius(character: CharacterId): number {
  return character === 'reimu'
    ? PHYSICS.HITBOX_RADIUS * PHYSICS.REIMU_HITBOX_SCALE
    : PHYSICS.HITBOX_RADIUS;
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
  private hudBarEl: HTMLDivElement;
  private skillPillEl: HTMLButtonElement;
  private skillFillEl: HTMLDivElement;
  private skillLabelEl: HTMLSpanElement;
  private skillStateEl: HTMLSpanElement;
  private grazeBadgeEl: HTMLDivElement;
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
  private grazePopTimer = 0;
  private skillNudgeTimer = 0;
  private trailTimer = 0;
  private afterimageTimer = 0;
  private freezeFrostTimer = 0;
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

    // Slim Live Top HUD: Score + Spirit Gauge/Skill Pill + Live Graze Badge
    const hudEl = document.createElement('div');
    hudEl.className = 'flappy-hud';
    this.scoreLiveEl = document.createElement('div');
    this.scoreLiveEl.className = 'flappy-score-live';
    this.scoreLiveEl.textContent = '0';

    this.hudBarEl = document.createElement('div');
    this.hudBarEl.className = 'flappy-hud-bar hidden';

    this.skillPillEl = document.createElement('button');
    this.skillPillEl.type = 'button';
    this.skillPillEl.className = 'flappy-skill-pill';
    this.skillPillEl.setAttribute('aria-label', '释放自机符卡');

    this.skillFillEl = document.createElement('div');
    this.skillFillEl.className = 'flappy-skill-fill';

    this.skillLabelEl = document.createElement('span');
    this.skillLabelEl.className = 'flappy-skill-label';

    this.skillStateEl = document.createElement('span');
    this.skillStateEl.className = 'flappy-skill-state';

    this.skillPillEl.append(this.skillFillEl, this.skillLabelEl, this.skillStateEl);

    const onSkillPointerDown = (ev: PointerEvent) => {
      ev.stopPropagation();
      ev.preventDefault();
      if (this.state.phase === 'playing') {
        this.tryActivateSkill();
      }
    };
    const onSkillClick = (ev: Event) => {
      ev.stopPropagation();
    };
    this.skillPillEl.addEventListener('pointerdown', onSkillPointerDown);
    this.skillPillEl.addEventListener('click', onSkillClick);
    this.cleanupListeners.push(
      () => this.skillPillEl.removeEventListener('pointerdown', onSkillPointerDown),
      () => this.skillPillEl.removeEventListener('click', onSkillClick),
    );

    this.grazeBadgeEl = document.createElement('div');
    this.grazeBadgeEl.className = 'flappy-graze-badge hidden';
    this.grazeBadgeEl.textContent = '⚡ GRAZE 0';

    this.hudBarEl.append(this.skillPillEl, this.grazeBadgeEl);
    hudEl.append(this.scoreLiveEl, this.hudBarEl);
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
    this.updateSkillHud();
    this.updateGrazeHud();
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
        radius: getHitboxRadius(character),
        dizzyTime: 0,
        blinkTimer: 2.8,
        blinkDuration: 0,
        determinedTimer: 0,
        grazeFlash: 0,
        invincibleTimer: 0,
      },
      pipes: [],
      stars: [],
      danmaku: [],
      afterimages: [],
      particles: particlePool,
      particleCount: 0,
      floatingTexts: [],
      score: 0,
      bestScore,
      pipesCleared: 0,
      starsCollected: 0,
      grazeCount: 0,
      spiritGauge: 0,
      ayaDashTimer: 0,
      cirnoFreezeTimer: 0,
      reimuBarrierTimer: 0,
      reimuBarrierX: PHYSICS.PLAYER_X,
      reimuBarrierY: PHYSICS.PLAYER_START_Y,
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
      spellBannerText: '',
      spellBannerTimer: 0,
      spellBannerColor: '#facc15',
    };
  }

  private buildReadyOverlay(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.className = 'flappy-overlay flappy-ready-overlay';

    const header = document.createElement('div');
    header.className = 'flappy-ready-header';
    header.innerHTML = `<div class="flappy-ready-title">竹林疾飞</div>`;

    const footer = document.createElement('div');
    footer.className = 'flappy-ready-footer';

    const hint = document.createElement('div');
    hint.className = 'flappy-tap-hint';
    hint.textContent = '✦ 点击 / Space 起飞 ✦';

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
      if (ev.button === 2) {
        if (this.state.phase === 'playing') {
          ev.preventDefault();
          this.tryActivateSkill();
        }
        return;
      }
      if (ev.button !== 0 && ev.pointerType === 'mouse') return;
      if (this.state.phase === 'ready' || this.state.phase === 'playing') {
        ev.preventDefault();
        this.requestFlap();
      }
    };

    const onContextMenu = (ev: MouseEvent) => {
      ev.preventDefault();
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

      if (ev.code === 'ShiftLeft' || ev.code === 'ShiftRight' || ev.code === 'KeyE') {
        if (this.state.phase === 'playing') {
          ev.preventDefault();
          if (!ev.repeat) {
            this.tryActivateSkill();
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
    this.stageEl.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onWindowResize);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
      this.resizeObserver.observe(this.rootEl);
    }

    this.cleanupListeners.push(
      () => this.stageEl.removeEventListener('pointerdown', onPointerDown),
      () => this.stageEl.removeEventListener('contextmenu', onContextMenu),
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
    this.state.player.radius = getHitboxRadius(id);
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
    this.updateSkillHud();
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
      this.updateSkillHud();
      this.updateGrazeHud();
    }

    if (this.state.phase !== 'playing') return;
    // Ignore vertical flaps during Aya's locked horizontal wind dash
    if (this.state.ayaDashTimer > 0) {
      this.flapBufferTimer = 0;
      return;
    }

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
    this.state.danmaku = [];
    this.state.afterimages = [];
    // Comfortable scenic sightline before first obstacle glides into view
    const firstX = STAGE_WIDTH + 68;
    this.spawnPipeAt(firstX, null);
    const { spacing } = this.getDifficultyParams(0);
    this.spawnPipeAt(firstX + spacing, this.state.pipes[0]);
  }

  private spawnPipeAt(x: number, prevPipe: PipeObstacle | null): void {
    const { gapHeight, speed } = this.getDifficultyParams(this.state.score);
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
      grazedTop: false,
      grazedBottom: false,
      topShattered: false,
      bottomShattered: false,
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

    // Incident Danmaku Waves (异变弹幕): start at score >= 10, ramping through Twilight & Scarlet Mist
    if (this.state.score >= 10) {
      this.maybeSpawnIncidentDanmaku(pipe, prevPipe, speed);
    }
  }

  private maybeSpawnIncidentDanmaku(
    pipe: PipeObstacle,
    prevPipe: PipeObstacle | null,
    scrollSpeed: number,
  ): void {
    const score = this.state.score;
    const spawnChance = score >= 30 ? 0.82 : score >= 15 ? 0.66 : 0.48;
    if (Math.random() > spawnChance) return;

    const doubleChance = score >= 30 ? 0.48 : score >= 15 ? 0.25 : 0;
    const count = Math.random() < doubleChance ? 2 : 1;

    const pickColor = (): DanmakuColor => {
      if (score >= 30) return Math.random() < 0.72 ? 'scarlet' : 'gold';
      if (score >= 15) return Math.random() < 0.48 ? 'scarlet' : 'gold';
      return 'gold';
    };

    const firstSign = Math.random() < 0.5 ? -1 : 1;

    // Orb 1: aims to cross the open corridor between prevPipe and pipe (or just ahead of pipe)
    const targetX1 = prevPipe
      ? (prevPipe.x + prevPipe.width + pipe.x) * 0.5
      : pipe.x + pipe.width * 0.5;
    const avgY = prevPipe ? (prevPipe.gapY + pipe.gapY) * 0.5 : pipe.gapY;
    const vx1 = 24 + Math.random() * 18;
    const travelTime1 = Math.max(0.4, (targetX1 - PHYSICS.PLAYER_X) / Math.max(120, scrollSpeed));
    const spawnX1 = targetX1 + vx1 * travelTime1;
    const baseY1 = clamp(avgY + firstSign * (28 + Math.random() * 16), 74, PLAYABLE_HEIGHT - 74);

    this.state.danmaku.push({
      id: this.nextEntityId++,
      x: spawnX1,
      prevX: spawnX1,
      y: baseY1,
      prevY: baseY1,
      baseY: baseY1,
      vx: vx1,
      ampY: 10 + Math.random() * 8,
      freqY: 1.7 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
      radius: 13.5,
      color: pickColor(),
      grazed: false,
      shattered: false,
    });

    // Orb 2 (Twilight / Scarlet Mist): staggered in pipe gap on the opposite vertical lane for clean S-weave & double graze
    if (count === 2) {
      const targetX2 = pipe.x + pipe.width * 0.5;
      const vx2 = 28 + Math.random() * 18;
      const travelTime2 = Math.max(0.4, (targetX2 - PHYSICS.PLAYER_X) / Math.max(120, scrollSpeed));
      const spawnX2 = Math.max(spawnX1 + 78, targetX2 + vx2 * travelTime2);
      const laneOffset = Math.min(34, pipe.gapHeight * 0.24);
      const baseY2 = clamp(pipe.gapY - firstSign * laneOffset, 76, PLAYABLE_HEIGHT - 76);

      this.state.danmaku.push({
        id: this.nextEntityId++,
        x: spawnX2,
        prevX: spawnX2,
        y: baseY2,
        prevY: baseY2,
        baseY: baseY2,
        vx: vx2,
        ampY: 8 + Math.random() * 6,
        freqY: 1.9 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        radius: 13,
        color: pickColor(),
        grazed: false,
        shattered: false,
      });
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

    this.notifyHostScore();
  }

  private addSpirit(amount: number): void {
    if (this.state.phase !== 'playing') return;
    // Don't double-charge while Aya is actively dashing
    if (this.state.ayaDashTimer > 0) return;

    const prev = this.state.spiritGauge;
    this.state.spiritGauge = clamp(prev + amount, 0, 100);
    if (prev < 100 && this.state.spiritGauge >= 100) {
      this.audio.playSpellReady();
      const p = this.state.player;
      const cfg = CHARACTER_MAP[this.state.character];
      this.emitParticle(p.x, p.y, 0, 0, 18, 0, 0, 0.42, cfg.accentColor, '#ffffff', 'ring', 0, 1);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        this.emitParticle(
          p.x,
          p.y,
          Math.cos(a) * 95,
          Math.sin(a) * 95,
          4.2,
          a,
          4,
          0.38,
          '#fef08a',
          '#ffffff',
          'sparkle',
          0,
          0.92,
        );
      }
    }
    this.updateSkillHud();
  }

  private isSkillActive(): boolean {
    return (
      this.state.ayaDashTimer > 0 ||
      this.state.cirnoFreezeTimer > 0 ||
      this.state.reimuBarrierTimer > 0
    );
  }

  private triggerSpellBanner(text: string, color: string): void {
    this.state.spellBannerText = text;
    this.state.spellBannerTimer = 1.55;
    this.state.spellBannerColor = color;
  }

  private tryActivateSkill(): void {
    if (this.state.phase !== 'playing') return;
    if (this.state.spiritGauge < 100 || this.isSkillActive()) {
      this.skillPillEl.classList.remove('not-ready');
      void this.skillPillEl.offsetWidth;
      this.skillPillEl.classList.add('not-ready');
      this.skillNudgeTimer = 0.25;
      return;
    }

    const p = this.state.player;
    const char = this.state.character;

    if (char === 'aya') {
      // 射命丸文 — 疾风「幻想风靡」: 0.45s high-speed invincible dash shattering pipes & danmaku
      this.state.spiritGauge = 0;
      this.state.ayaDashTimer = PHYSICS.AYA_DASH_DURATION;
      p.invincibleTimer = Math.max(
        p.invincibleTimer,
        PHYSICS.AYA_DASH_DURATION + PHYSICS.AYA_DASH_GRACE_INVINCIBLE,
      );
      p.vy = 0;
      p.rotation = -0.06;
      p.rotVelocity = 0;
      p.scaleX = 1.26;
      p.scaleY = 0.78;
      p.scaleVelX = -1.5;
      p.scaleVelY = 1.5;
      p.determinedTimer = 0.7;
      this.afterimageTimer = 0;
      this.state.flashAlpha = 0.34;
      this.state.shakeTime = 0.2;
      this.state.shakeIntensity = 5.2;
      this.triggerSpellBanner('疾风「幻想风靡」', '#f59e0b');
      this.audio.playAyaDash();
      this.spawnAyaDashBurst(p.x, p.y);
    } else if (char === 'reimu') {
      // 博丽灵梦 — Manual 结界「阴阳玉」 clear pulse
      this.activateReimuBarrier(false);
    } else {
      // 琪露诺 — 冰符「完美冻结」: 2.5s 45% Bullet-Time Slow-Mo
      this.state.spiritGauge = 0;
      this.state.cirnoFreezeTimer = PHYSICS.CIRNO_FREEZE_DURATION;
      this.freezeFrostTimer = 0;
      p.flapGlow = 1;
      p.determinedTimer = 0.9;
      this.state.flashAlpha = 0.36;
      this.state.shakeTime = 0.16;
      this.state.shakeIntensity = 3.5;
      this.triggerSpellBanner('冰符「完美冻结」', '#38bdf8');
      this.audio.playCirnoFreeze();
      this.spawnFreezeBurst(p.x, p.y);
    }

    this.updateSkillHud();
  }

  private activateReimuBarrier(
    isDeathbomb: boolean,
    hitPipe?: PipeObstacle,
    hitTop = false,
    hitBottom = false,
    hitOrb?: DanmakuOrb,
  ): void {
    const p = this.state.player;
    this.state.spiritGauge = 0;
    p.invincibleTimer = PHYSICS.REIMU_INVINCIBLE_DURATION;
    this.state.reimuBarrierTimer = PHYSICS.REIMU_BARRIER_VISUAL_DURATION;
    this.state.reimuBarrierX = p.x;
    this.state.reimuBarrierY = p.y;
    p.flapGlow = 1;
    p.determinedTimer = 0.9;
    this.state.flashAlpha = isDeathbomb ? 0.58 : 0.36;
    this.state.shakeTime = 0.26;
    this.state.shakeIntensity = isDeathbomb ? 6.8 : 4.6;

    if (isDeathbomb) {
      this.hitstopTimer = 0.055;
      if (p.vy > 100) {
        p.vy = -210;
      }
      this.triggerSpellBanner('决死结界「阴阳玉」', '#fb7185');
      this.state.floatingTexts.push({
        x: p.x + 12,
        y: p.y - 34,
        vy: -54,
        text: '决死结界!',
        color: '#ffe4e6',
        strokeColor: '#881337',
        scale: 1.18,
        life: 1.0,
        maxLife: 1.0,
      });
    } else {
      this.triggerSpellBanner('结界「阴阳玉」', '#fb7185');
    }

    this.audio.playReimuBarrier(isDeathbomb);
    this.spawnReimuBarrierBurst(p.x, p.y);

    // Explicitly shatter colliding obstacle(s)
    if (hitPipe) {
      if (hitTop && !hitPipe.topShattered) {
        this.shatterPipePillar(hitPipe, true, 'reimu');
      }
      if (hitBottom && !hitPipe.bottomShattered) {
        this.shatterPipePillar(hitPipe, false, 'reimu');
      }
    }
    if (hitOrb && !hitOrb.shattered) {
      this.shatterDanmakuOrb(hitOrb, 'reimu');
    }

    // Clear nearby pillars within Yin-Yang shockwave radius & nearby danmaku orbs
    const pillarBlastR = 148;
    const capOver = PHYSICS.PIPE_CAP_OVERHANG;
    for (let i = 0; i < this.state.pipes.length; i++) {
      const pipe = this.state.pipes[i];
      const topH = Math.max(0, pipe.gapY - pipe.gapHeight * 0.5);
      const bottomY = pipe.gapY + pipe.gapHeight * 0.5;
      const bottomH = Math.max(0, PLAYABLE_HEIGHT - bottomY);

      if (
        !pipe.topShattered &&
        topH > 0 &&
        circleIntersectsRect(p.x, p.y, pillarBlastR, pipe.x - capOver, 0, pipe.width + capOver * 2, topH)
      ) {
        this.shatterPipePillar(pipe, true, 'reimu');
      }
      if (
        !pipe.bottomShattered &&
        bottomH > 0 &&
        circleIntersectsRect(
          p.x,
          p.y,
          pillarBlastR,
          pipe.x - capOver,
          bottomY,
          pipe.width + capOver * 2,
          bottomH,
        )
      ) {
        this.shatterPipePillar(pipe, false, 'reimu');
      }
    }

    const orbBlastR = 235;
    for (let i = 0; i < this.state.danmaku.length; i++) {
      const orb = this.state.danmaku[i];
      if (orb.shattered) continue;
      const dx = orb.x - p.x;
      const dy = orb.y - p.y;
      if (dx * dx + dy * dy <= orbBlastR * orbBlastR) {
        this.shatterDanmakuOrb(orb, 'reimu');
      }
    }

    this.updateSkillHud();
  }

  private shatterPipePillar(pipe: PipeObstacle, isTop: boolean, source: 'aya' | 'reimu'): void {
    if (isTop) {
      if (pipe.topShattered) return;
      pipe.topShattered = true;
      pipe.grazedTop = true;
    } else {
      if (pipe.bottomShattered) return;
      pipe.bottomShattered = true;
      pipe.grazedBottom = true;
    }

    const topH = Math.max(0, pipe.gapY - pipe.gapHeight * 0.5);
    const bottomY = pipe.gapY + pipe.gapHeight * 0.5;
    const cx = pipe.x + pipe.width * 0.5;
    const cy = isTop
      ? Math.max(36, topH - 42)
      : Math.min(PLAYABLE_HEIGHT - 36, bottomY + 42);

    this.audio.playShatter();
    this.spawnPipeShatterBurst(cx, cy, pipe.style, source);
    this.state.shakeTime = Math.max(this.state.shakeTime, 0.14);
    this.state.shakeIntensity = Math.max(this.state.shakeIntensity, 4.2);

    const color = source === 'aya' ? '#fde047' : '#fda4af';
    this.addScore(2, cx, cy - 10, '破柱 +2!', color);
  }

  private shatterDanmakuOrb(orb: DanmakuOrb, source: 'aya' | 'reimu'): void {
    if (orb.shattered) return;
    orb.shattered = true;
    orb.grazed = true;

    this.audio.playShatter();
    this.spawnDanmakuShatterBurst(orb.x, orb.y, orb.color, source);
    const color = source === 'aya' ? '#fde047' : '#fbcfe8';
    this.addScore(2, orb.x, orb.y - 12, '弹消 +2!', color);
  }

  private triggerGraze(sparkX: number, sparkY: number): void {
    this.state.grazeCount++;
    this.state.player.grazeFlash = 1;
    this.audio.playGraze();
    this.spawnGrazeBurst(sparkX, sparkY);
    this.addSpirit(PHYSICS.GRAZE_SPIRIT);

    const p = this.state.player;
    this.addScore(1, p.x + 22, p.y - 26, 'GRAZE! +1', '#fff59d');
    this.updateGrazeHud(true);
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
      medal.tier !== 'none'
        ? `${charName} · ${medal.label}${this.state.grazeCount > 0 ? ` · 擦弹${this.state.grazeCount}` : ''}`
        : `${charName} · ${this.state.pipesCleared}柱${this.state.grazeCount > 0 ? ` · 擦弹${this.state.grazeCount}` : ''}`;
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

    this.goCharEl.textContent = charCfg.name;
    this.goStatsEl.textContent = `柱 ${this.state.pipesCleared} · 星 ${this.state.starsCollected} · 擦弹 ${this.state.grazeCount}`;
    this.goNoteEl.textContent = medal.subtitle;
  }

  private updateSkillHud(): void {
    const cfg = CHARACTER_MAP[this.state.character];
    const glow =
      this.state.character === 'cirno'
        ? 'rgba(56, 189, 248, 0.72)'
        : this.state.character === 'reimu'
          ? 'rgba(251, 113, 133, 0.72)'
          : 'rgba(245, 158, 11, 0.72)';
    this.skillPillEl.style.setProperty('--skill-color', cfg.primaryColor);
    this.skillPillEl.style.setProperty('--skill-accent', cfg.accentColor);
    this.skillPillEl.style.setProperty('--skill-glow', glow);
    this.skillLabelEl.textContent = `${cfg.skillIcon} ${cfg.skillName}`;

    const active = this.isSkillActive();
    let pct = this.state.spiritGauge;
    let stateText = `${Math.floor(pct)}%`;

    if (this.state.ayaDashTimer > 0) {
      pct = (this.state.ayaDashTimer / PHYSICS.AYA_DASH_DURATION) * 100;
      stateText = '冲刺!';
    } else if (this.state.cirnoFreezeTimer > 0) {
      pct = (this.state.cirnoFreezeTimer / PHYSICS.CIRNO_FREEZE_DURATION) * 100;
      stateText = `${this.state.cirnoFreezeTimer.toFixed(1)}s`;
    } else if (this.state.reimuBarrierTimer > 0) {
      pct = (this.state.reimuBarrierTimer / PHYSICS.REIMU_BARRIER_VISUAL_DURATION) * 100;
      stateText = '结界!';
    } else if (this.state.spiritGauge >= 100) {
      pct = 100;
      stateText = this.state.character === 'reimu' ? '就绪·自动' : 'Shift/右键';
    }

    this.skillFillEl.style.width = `${clamp(pct, 0, 100).toFixed(1)}%`;
    this.skillStateEl.textContent = stateText;
    this.skillPillEl.classList.toggle('ready', !active && this.state.spiritGauge >= 100);
    this.skillPillEl.classList.toggle('active', active);
  }

  private updateGrazeHud(pop = false): void {
    const count = this.state.grazeCount;
    this.grazeBadgeEl.classList.toggle('hidden', count <= 0);
    if (count > 0) {
      this.grazeBadgeEl.textContent = `⚡ GRAZE ${count}`;
      if (pop) {
        this.grazeBadgeEl.classList.add('pop');
        this.grazePopTimer = 0.14;
      }
    }
  }

  private notifyHostScore(): void {
    const charName = CHARACTER_MAP[this.state.character].name;
    const sky = getSkyPhaseForScore(this.state.score);
    const grazePart = this.state.grazeCount > 0 ? ` · 擦弹 ${this.state.grazeCount}` : '';
    this.ctx.onScoreChange(
      this.state.score,
      this.state.bestScore,
      `${charName} · ${sky.name}${grazePart}`,
    );
  }

  private syncOverlays(): void {
    const isReady = this.state.phase === 'ready';
    this.readyOverlayEl.classList.toggle('hidden', !isReady);
    this.pauseOverlayEl.classList.toggle('hidden', this.state.phase !== 'paused');
    this.gameOverOverlayEl.classList.toggle('hidden', this.state.phase !== 'gameover');
    this.scoreLiveEl.style.opacity = isReady ? '0' : '1';
    this.hudBarEl.classList.toggle('hidden', isReady);
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

  private spawnGrazeBurst(x: number, y: number): void {
    // Crisp electric gold-white graze ring
    this.emitParticle(x, y, 0, 0, 10, 0, 0, 0.22, '#fff9c4', '#fde047', 'ring', 0, 1);
    const colors = ['#ffffff', '#fef08a', '#facc15', '#fffbeb'];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
      const spd = 125 + Math.random() * 165;
      this.emitParticle(
        x,
        y,
        Math.cos(a) * spd,
        Math.sin(a) * spd,
        7.5 + Math.random() * 5.5,
        a,
        0,
        0.22 + Math.random() * 0.14,
        colors[i % colors.length],
        '#fde047',
        'grazeSpark',
        0,
        0.88,
      );
    }
  }

  private spawnAyaDashBurst(x: number, y: number): void {
    this.emitParticle(x + 8, y, -40, 0, 22, 0, 0, 0.32, '#fef08a', '#ef4444', 'ring', 0, 0.94);
    const colors = ['#ef4444', '#f97316', '#facc15', '#dc2626'];
    for (let i = 0; i < 16; i++) {
      this.emitParticle(
        x + (Math.random() * 18 - 9),
        y + (Math.random() * 24 - 12),
        -220 - Math.random() * 180,
        (Math.random() - 0.5) * 130,
        5.5 + Math.random() * 3.8,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 14,
        0.48 + Math.random() * 0.3,
        colors[i % colors.length],
        '#fde68a',
        i % 3 === 0 ? 'windRibbon' : 'maple',
        45,
        0.96,
      );
    }
  }

  private spawnReimuBarrierBurst(x: number, y: number): void {
    this.emitParticle(x, y, 0, 0, 26, 0, 0, 0.45, '#fff1f2', '#e11d48', 'ring', 0, 1);
    const colors = ['#fff5f5', '#fb7185', '#e11d48', '#fde047'];
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2 + Math.random() * 0.15;
      const spd = 120 + Math.random() * 175;
      this.emitParticle(
        x,
        y,
        Math.cos(a) * spd,
        Math.sin(a) * spd,
        5.8 + Math.random() * 3.2,
        a,
        (Math.random() - 0.5) * 10,
        0.52 + Math.random() * 0.34,
        colors[i % colors.length],
        '#dc2626',
        i % 2 === 0 ? 'talisman' : 'sakura',
        65,
        0.95,
      );
    }
  }

  private spawnFreezeBurst(x: number, y: number): void {
    this.emitParticle(x, y, 0, 0, 28, 0, 0, 0.52, '#bae6fd', '#38bdf8', 'frostRing', 0, 1);
    const colors = ['#ffffff', '#e0f2fe', '#7dd3fc', '#38bdf8'];
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2 + Math.random() * 0.2;
      const spd = 90 + Math.random() * 160;
      this.emitParticle(
        x,
        y,
        Math.cos(a) * spd,
        Math.sin(a) * spd,
        5.2 + Math.random() * 4.0,
        Math.random() * Math.PI,
        (Math.random() - 0.5) * 7,
        0.65 + Math.random() * 0.4,
        colors[i % colors.length],
        '#38bdf8',
        i % 2 === 0 ? 'iceCrystal' : 'snowflake',
        24,
        0.95,
      );
    }
  }

  private spawnPipeShatterBurst(
    x: number,
    y: number,
    style: 'bamboo' | 'torii',
    source: 'aya' | 'reimu',
  ): void {
    const shardKind: ParticleKind = style === 'bamboo' ? 'bambooShard' : 'toriiShard';
    const shardColors =
      style === 'bamboo'
        ? ['#4ade80', '#22c55e', '#86efac', '#15803d']
        : ['#ef4444', '#f87171', '#f5c542', '#b91c1c'];

    this.emitParticle(
      x,
      y,
      0,
      0,
      20,
      0,
      0,
      0.32,
      source === 'aya' ? '#fde047' : '#fda4af',
      '#ffffff',
      'ring',
      0,
      1,
    );

    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      const spd = 110 + Math.random() * 195;
      const isCharAccent = i % 4 === 0;
      this.emitParticle(
        x + (Math.random() * 34 - 17),
        y + (Math.random() * 48 - 24),
        Math.cos(a) * spd + (source === 'aya' ? 75 : 0),
        Math.sin(a) * spd - 45,
        6.5 + Math.random() * 4.5,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 14,
        0.52 + Math.random() * 0.34,
        isCharAccent ? (source === 'aya' ? '#f97316' : '#fff1f2') : shardColors[i % shardColors.length],
        '#fde047',
        isCharAccent ? (source === 'aya' ? 'maple' : 'talisman') : shardKind,
        310,
        0.97,
      );
    }
  }

  private spawnDanmakuShatterBurst(
    x: number,
    y: number,
    color: DanmakuColor,
    source: 'aya' | 'reimu',
  ): void {
    const ringCol = color === 'scarlet' ? '#fb7185' : '#fde047';
    this.emitParticle(x, y, 0, 0, 16, 0, 0, 0.3, ringCol, '#ffffff', 'ring', 0, 1);

    const cols =
      color === 'scarlet'
        ? ['#ffffff', '#fda4af', '#f43f5e', '#fde047']
        : ['#ffffff', '#fef08a', '#facc15', '#fb923c'];

    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + Math.random() * 0.25;
      const spd = 95 + Math.random() * 145;
      this.emitParticle(
        x,
        y,
        Math.cos(a) * spd,
        Math.sin(a) * spd,
        4.6 + Math.random() * 3.2,
        a,
        (Math.random() - 0.5) * 11,
        0.42 + Math.random() * 0.24,
        cols[i % cols.length],
        '#ffffff',
        i % 3 === 0 ? (source === 'aya' ? 'maple' : 'talisman') : 'starBurst',
        70,
        0.94,
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
    for (let i = 0; i < s.danmaku.length; i++) {
      s.danmaku[i].prevX = s.danmaku[i].x;
      s.danmaku[i].prevY = s.danmaku[i].y;
    }
  }

  private stepSimulation(dt: number): void {
    if (this.scorePopTimer > 0) {
      this.scorePopTimer -= dt;
      if (this.scorePopTimer <= 0) {
        this.scoreLiveEl.classList.remove('pop');
      }
    }
    if (this.grazePopTimer > 0) {
      this.grazePopTimer -= dt;
      if (this.grazePopTimer <= 0) {
        this.grazeBadgeEl.classList.remove('pop');
      }
    }
    if (this.skillNudgeTimer > 0) {
      this.skillNudgeTimer -= dt;
      if (this.skillNudgeTimer <= 0) {
        this.skillPillEl.classList.remove('not-ready');
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
    if (this.state.spellBannerTimer > 0) {
      this.state.spellBannerTimer = Math.max(0, this.state.spellBannerTimer - dt);
    }
    if (this.gameOverGuardTimer > 0) {
      this.gameOverGuardTimer = Math.max(0, this.gameOverGuardTimer - dt);
    }

    if (this.state.phase === 'paused') {
      return;
    }

    // Subtle impact hitstop freeze frame on crash or heroic Deathbomb
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.updateParticlesAndPopups(dt * 0.35);
      return;
    }

    // Active skill timers advance in real time
    const wasSkillActive = this.isSkillActive();
    const wasDashing = this.state.ayaDashTimer > 0;
    if (this.state.ayaDashTimer > 0) {
      this.state.ayaDashTimer = Math.max(0, this.state.ayaDashTimer - dt);
      if (this.state.ayaDashTimer === 0 && wasDashing) {
        // Gentle upward lift at end of Aya's dash so player exits cleanly
        this.state.player.vy = -105;
      }
    }
    if (this.state.cirnoFreezeTimer > 0) {
      this.state.cirnoFreezeTimer = Math.max(0, this.state.cirnoFreezeTimer - dt);
    }
    if (this.state.reimuBarrierTimer > 0) {
      this.state.reimuBarrierTimer = Math.max(0, this.state.reimuBarrierTimer - dt);
    }
    if (wasSkillActive) {
      this.updateSkillHud();
    }

    // Bullet-Time Slow-Mo scaling during Cirno's Perfect Freeze (~45%)
    const isFrozen = this.state.cirnoFreezeTimer > 0;
    const isDashing = this.state.ayaDashTimer > 0;
    const worldDt = isFrozen ? dt * PHYSICS.CIRNO_TIME_SCALE : dt;

    this.state.elapsed += worldDt;
    const player = this.state.player;
    player.orbAngle += dt * 3.9;
    player.wingBoost = Math.max(0, player.wingBoost - dt * 3.6);
    player.flapGlow = Math.max(0, player.flapGlow - dt * 3.2);
    player.determinedTimer = Math.max(0, player.determinedTimer - dt);
    player.grazeFlash = Math.max(0, player.grazeFlash - dt * 4.8);
    if (player.invincibleTimer > 0) {
      player.invincibleTimer = Math.max(0, player.invincibleTimer - dt);
    }
    player.scarfWave +=
      dt * (11.5 + (this.state.speed - PHYSICS.BASE_SPEED) * 0.06 + (isDashing ? 12 : 0));

    // Fade Aya dash afterimages
    for (let i = this.state.afterimages.length - 1; i >= 0; i--) {
      const img = this.state.afterimages[i];
      img.x -= this.state.speed * (isDashing ? PHYSICS.AYA_DASH_SPEED_MULT : 1.0) * worldDt;
      img.alpha -= dt * 3.1;
      if (img.alpha <= 0) {
        this.state.afterimages.splice(i, 1);
      }
    }

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

      const moveSpeed = isDashing ? this.state.speed * PHYSICS.AYA_DASH_SPEED_MULT : this.state.speed;
      this.state.scrollDistance += moveSpeed * worldDt;

      // Vertical physics (Aya dash locks horizontal flight; Cirno Perfect Freeze slows gravity & motion via worldDt)
      if (isDashing) {
        player.vy *= Math.pow(0.76, dt * 60);
        player.y = clamp(
          player.y + player.vy * dt,
          player.radius + 10,
          PLAYABLE_HEIGHT - player.radius - 10,
        );
        player.rotation += (-0.06 - player.rotation) * Math.min(1, dt * 18);
        player.rotVelocity = 0;
        player.wingPhase += dt * 28;

        this.afterimageTimer += dt;
        if (this.afterimageTimer >= 0.032) {
          this.afterimageTimer = 0;
          this.state.afterimages.push({
            x: player.x,
            y: player.y,
            rotation: player.rotation,
            alpha: 0.72,
            character: 'aya',
          });
          this.spawnFlapBurst(player.x - 12, player.y + 2, 'aya', 2, false);
        }
      } else {
        player.vy = Math.min(PHYSICS.MAX_FALL_SPEED, player.vy + PHYSICS.GRAVITY * worldDt);
        player.y += player.vy * worldDt;

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
        const rotAccel =
          omega * omega * (targetRot - player.rotation) - 2 * omega * player.rotVelocity;
        player.rotVelocity += rotAccel * worldDt;
        player.rotation = clamp(player.rotation + player.rotVelocity * worldDt, -0.56, 1.44);

        // Articulated wing cadence
        player.wingPhase += worldDt * (player.vy < 70 ? 19.5 : 9.2);

        // Ambient themed character trail while flying
        this.trailTimer += dt;
        if (this.trailTimer >= 0.14) {
          this.trailTimer = 0;
          this.spawnFlapBurst(player.x - 14, player.y + 3, this.state.character, 1, false);
        }
      }

      // Cirno Perfect Freeze ambient crystalline sparkles
      if (isFrozen) {
        this.freezeFrostTimer += dt;
        if (this.freezeFrostTimer >= 0.1) {
          this.freezeFrostTimer = 0;
          this.emitParticle(
            Math.random() * STAGE_WIDTH,
            Math.random() * PLAYABLE_HEIGHT,
            -26 - Math.random() * 24,
            12 + Math.random() * 18,
            3.8 + Math.random() * 3.4,
            Math.random() * Math.PI,
            (Math.random() - 0.5) * 3,
            0.75 + Math.random() * 0.4,
            '#e0f2fe',
            '#7dd3fc',
            Math.random() < 0.5 ? 'snowflake' : 'iceCrystal',
            6,
            0.99,
          );
        }
      }

      // Move pipes & score checks
      for (let i = 0; i < this.state.pipes.length; i++) {
        const pipe = this.state.pipes[i];
        pipe.x -= moveSpeed * worldDt;
        if (!pipe.passed && pipe.x + pipe.width * 0.5 < player.x) {
          pipe.passed = true;
          this.state.pipesCleared++;
          this.audio.playScore();
          this.addSpirit(PHYSICS.PIPE_SPIRIT);
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

      // Update collectibles & Reimu magnetic pull + pickup checks
      const isReimu = this.state.character === 'reimu';
      for (let i = this.state.stars.length - 1; i >= 0; i--) {
        const s = this.state.stars[i];
        s.x -= moveSpeed * worldDt;

        // Reimu passive: magnetic pull on nearby P-points / faith stars!
        if (isReimu && !s.collected) {
          const mdx = player.x - s.x;
          const mdy = player.y - s.y;
          const distSq = mdx * mdx + mdy * mdy;
          const magnetR = PHYSICS.REIMU_MAGNET_RADIUS;
          if (distSq > 1 && distSq < magnetR * magnetR) {
            const dist = Math.sqrt(distSq);
            const pullSpeed = 210 + (1 - dist / magnetR) * 420;
            s.x += (mdx / dist) * pullSpeed * worldDt;
            s.baseY += (mdy / dist) * pullSpeed * worldDt;
          }
        }

        s.y = s.baseY + Math.sin(this.state.elapsed * 4.4 + s.bobPhase) * 6.5;
        s.spin += worldDt * 2.4;

        if (!s.collected) {
          const dx = player.x - s.x;
          const dy = player.y - s.y;
          const collectR = PHYSICS.HITBOX_RADIUS + s.radius + 5.5;
          if (dx * dx + dy * dy <= collectR * collectR) {
            s.collected = true;
            this.state.starsCollected++;
            this.audio.playStar();
            this.spawnStarBurst(s.x, s.y, s.kind);
            this.addSpirit(PHYSICS.STAR_SPIRIT);
            const label = s.kind === 'power' ? 'P +2!' : '★ +2!';
            const color = s.kind === 'power' ? '#fde047' : '#7dd3fc';
            this.addScore(2, s.x, s.y - 12, label, color);
          }
        }

        if (s.collected || s.x < -40) {
          this.state.stars.splice(i, 1);
        }
      }

      // Update Incident Danmaku Orbs
      for (let i = this.state.danmaku.length - 1; i >= 0; i--) {
        const orb = this.state.danmaku[i];
        orb.x -= (moveSpeed + orb.vx) * worldDt;
        orb.y = clamp(
          orb.baseY + Math.sin(this.state.elapsed * orb.freqY + orb.phase) * orb.ampY,
          36,
          PLAYABLE_HEIGHT - 36,
        );
        if (orb.shattered || orb.x < -50) {
          this.state.danmaku.splice(i, 1);
        }
      }

      // Collisions & Skill Shattering
      let survivedFrame = true;
      const capOver = PHYSICS.PIPE_CAP_OVERHANG;
      const capH = PHYSICS.PIPE_CAP_HEIGHT;

      // 1. Ground collision
      if (player.y + player.radius >= PLAYABLE_HEIGHT) {
        if (isDashing) {
          player.y = PLAYABLE_HEIGHT - player.radius - 2;
          player.vy = 0;
        } else if (player.invincibleTimer > 0) {
          player.y = PLAYABLE_HEIGHT - player.radius - 2;
          player.vy = -250;
        } else if (this.state.character === 'reimu' && this.state.spiritGauge >= 100) {
          player.y = PLAYABLE_HEIGHT - player.radius - 4;
          player.vy = PHYSICS.FLAP_VELOCITY * 0.92;
          this.activateReimuBarrier(true);
        } else {
          player.y = PLAYABLE_HEIGHT - player.radius;
          this.triggerCrash();
          survivedFrame = false;
        }
      }

      // 2. Pipe collisions (or Aya dash shattering!)
      if (survivedFrame) {
        const grace = isDashing ? 0 : 2.5;
        const checkRadius = isDashing ? player.radius + 10 : player.radius;

        for (let i = 0; i < this.state.pipes.length; i++) {
          const pipe = this.state.pipes[i];
          if (
            pipe.x + pipe.width + capOver + 6 < player.x - checkRadius ||
            pipe.x - capOver - 6 > player.x + checkRadius
          ) {
            continue;
          }

          const topH = Math.max(0, pipe.gapY - pipe.gapHeight * 0.5);
          const bottomY = pipe.gapY + pipe.gapHeight * 0.5;
          const bottomH = Math.max(0, PLAYABLE_HEIGHT - bottomY);

          const hitTop =
            !pipe.topShattered &&
            topH > 0 &&
            (circleIntersectsRect(
              player.x,
              player.y,
              checkRadius,
              pipe.x + grace,
              0,
              pipe.width - grace * 2,
              Math.max(0, topH - grace),
            ) ||
              circleIntersectsRect(
                player.x,
                player.y,
                checkRadius,
                pipe.x - capOver + grace,
                Math.max(0, topH - capH + grace),
                pipe.width + capOver * 2 - grace * 2,
                Math.max(0, Math.min(capH, topH) - grace * 2),
              ));

          const hitBottom =
            !pipe.bottomShattered &&
            bottomH > 0 &&
            (circleIntersectsRect(
              player.x,
              player.y,
              checkRadius,
              pipe.x + grace,
              bottomY + grace,
              pipe.width - grace * 2,
              Math.max(0, bottomH - grace),
            ) ||
              circleIntersectsRect(
                player.x,
                player.y,
                checkRadius,
                pipe.x - capOver + grace,
                bottomY + grace,
                pipe.width + capOver * 2 - grace * 2,
                Math.max(0, Math.min(capH, bottomH) - grace * 2),
              ));

          if (hitTop || hitBottom) {
            if (isDashing) {
              if (hitTop) this.shatterPipePillar(pipe, true, 'aya');
              if (hitBottom) this.shatterPipePillar(pipe, false, 'aya');
            } else if (player.invincibleTimer > 0) {
              // Post-dash or post-Deathbomb invincibility passes safely
            } else if (this.state.character === 'reimu' && this.state.spiritGauge >= 100) {
              // Automatic Reimu Deathbomb!
              this.activateReimuBarrier(true, pipe, hitTop, hitBottom);
              break;
            } else {
              this.triggerCrash();
              survivedFrame = false;
              break;
            }
          }
        }
      }

      // 3. Incident Danmaku collisions (or Aya dash shattering!)
      if (survivedFrame) {
        for (let i = 0; i < this.state.danmaku.length; i++) {
          const orb = this.state.danmaku[i];
          if (orb.shattered) continue;
          const dx = player.x - orb.x;
          const dy = player.y - orb.y;
          const hitR = isDashing
            ? player.radius + orb.radius + 12
            : player.radius + orb.radius * 0.72;
          if (dx * dx + dy * dy < hitR * hitR) {
            if (isDashing) {
              this.shatterDanmakuOrb(orb, 'aya');
            } else if (player.invincibleTimer > 0) {
              // Invincible passes safely
            } else if (this.state.character === 'reimu' && this.state.spiritGauge >= 100) {
              this.activateReimuBarrier(true, undefined, false, false, orb);
              break;
            } else {
              this.triggerCrash();
              survivedFrame = false;
              break;
            }
          }
        }
      }

      // 4. Touhou GRAZE check (only when alive, not dashing, not invincible)
      if (survivedFrame && !isDashing && player.invincibleTimer <= 0) {
        const grazeR = PHYSICS.HITBOX_RADIUS + PHYSICS.GRAZE_HALO;

        // Pipe edge grazing (once per top edge & once per bottom edge)
        for (let i = 0; i < this.state.pipes.length; i++) {
          const pipe = this.state.pipes[i];
          if (
            pipe.x + pipe.width + capOver + grazeR < player.x ||
            pipe.x - capOver - grazeR > player.x
          ) {
            continue;
          }

          const topH = Math.max(0, pipe.gapY - pipe.gapHeight * 0.5);
          const bottomY = pipe.gapY + pipe.gapHeight * 0.5;
          const bottomH = Math.max(0, PLAYABLE_HEIGHT - bottomY);

          if (!pipe.grazedTop && !pipe.topShattered && topH > 0) {
            const nearTop =
              circleIntersectsRect(player.x, player.y, grazeR, pipe.x, 0, pipe.width, topH) ||
              circleIntersectsRect(
                player.x,
                player.y,
                grazeR,
                pipe.x - capOver,
                Math.max(0, topH - capH),
                pipe.width + capOver * 2,
                Math.min(capH, topH),
              );
            if (nearTop) {
              pipe.grazedTop = true;
              const sx = clamp(player.x, pipe.x - capOver, pipe.x + pipe.width + capOver);
              const sy = Math.min(player.y, topH);
              this.triggerGraze((player.x + sx) * 0.5, (player.y + sy) * 0.5);
            }
          }

          if (!pipe.grazedBottom && !pipe.bottomShattered && bottomH > 0) {
            const nearBottom =
              circleIntersectsRect(
                player.x,
                player.y,
                grazeR,
                pipe.x,
                bottomY,
                pipe.width,
                bottomH,
              ) ||
              circleIntersectsRect(
                player.x,
                player.y,
                grazeR,
                pipe.x - capOver,
                bottomY,
                pipe.width + capOver * 2,
                Math.min(capH, bottomH),
              );
            if (nearBottom) {
              pipe.grazedBottom = true;
              const sx = clamp(player.x, pipe.x - capOver, pipe.x + pipe.width + capOver);
              const sy = Math.max(player.y, bottomY);
              this.triggerGraze((player.x + sx) * 0.5, (player.y + sy) * 0.5);
            }
          }
        }

        // Danmaku orb grazing (once per orb)
        for (let i = 0; i < this.state.danmaku.length; i++) {
          const orb = this.state.danmaku[i];
          if (orb.grazed || orb.shattered) continue;
          const dx = player.x - orb.x;
          const dy = player.y - orb.y;
          const gr = grazeR + orb.radius * 0.85;
          if (dx * dx + dy * dy <= gr * gr) {
            orb.grazed = true;
            this.triggerGraze((player.x + orb.x) * 0.5, (player.y + orb.y) * 0.5);
          }
        }
      }

      this.updateParticlesAndPopups(isFrozen ? dt * 0.65 : dt);
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
    this.grazePopTimer = 0;
    this.skillNudgeTimer = 0;
    this.trailTimer = 0;
    this.afterimageTimer = 0;
    this.freezeFrostTimer = 0;
    this.pipesSpawned = 0;
    this.lastGapY = PHYSICS.PLAYER_START_Y;
    this.lastSkyPhaseId = 'dawn';
    this.runSaved = false;
    this.isNewBest = false;
    this.particleOverwriteCursor = 0;

    this.scoreLiveEl.textContent = '0';
    this.scoreLiveEl.classList.remove('pop');
    this.grazeBadgeEl.classList.remove('pop');
    this.skillPillEl.classList.remove('not-ready');
    this.updateSkillHud();
    this.updateGrazeHud();
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
