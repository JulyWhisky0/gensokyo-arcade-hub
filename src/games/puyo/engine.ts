import { PuyoAudio } from './audio';
import {
  ActivePair,
  ActiveSpellVfx,
  BOSS_PORTRAIT_X,
  BOSS_PORTRAIT_Y,
  BOSS_ROSTER,
  BossBonusBanner,
  BossState,
  CHARACTERS,
  COLS,
  CharacterId,
  ClearingCell,
  DEATH_COL,
  DEATH_ROW,
  DIFFICULTIES,
  DanmakuOrb,
  DifficultyId,
  DropTrail,
  FallingPuyo,
  FloatingText,
  GameMode,
  GamePhase,
  GridCell,
  HIDDEN_ROWS,
  HudSnapshot,
  PUYO_THEMES,
  Particle,
  PuyoColor,
  PuyoPairColors,
  ROTATION_OFFSETS,
  RotationIndex,
  SpellCardBanner,
  TOTAL_ROWS,
  getSpellCardForChain,
} from './types';

const DAS_MS = 132;
const ARR_MS = 38;
const LOCK_DELAY_MS = 380;
const SOFT_DROP_LOCK_MS = 65;
const SOFT_DROP_CELL_MS = 38;
const MAX_LOCK_RESETS = 8;
const QUICK_TURN_WINDOW_MS = 340;
const INPUT_BUFFER_MS = 175;
const SPELL_BUFFER_MS = 520;

const CHAIN_POWER_TABLE = [
  0, 0, 8, 16, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416,
  448, 480, 512,
] as const;

const COLOR_BONUS_TABLE = [0, 0, 3, 6, 12, 24] as const;

function getGroupBonus(size: number): number {
  if (size <= 4) return 0;
  if (size === 5) return 2;
  if (size === 6) return 3;
  if (size === 7) return 4;
  if (size === 8) return 5;
  if (size === 9) return 6;
  if (size === 10) return 7;
  return 10;
}

export interface GhostCell {
  col: number;
  row: number;
  color: PuyoColor;
}

export interface EngineCallbacks {
  getBestScore: () => number;
  onScoreChange: (score: number, best: number, extra?: string) => void;
  onGameOver: (finalScore: number, extra?: string) => void;
  saveScore: (score: number, extra?: string) => void;
  onHudUpdate: (snapshot: HudSnapshot) => void;
}

export class PuyoEngine {
  public grid: (GridCell | null)[][] = [];
  public phase: GamePhase = 'menu';
  public mode: GameMode = 'boss';
  public character: CharacterId = 'reimu';
  public difficulty: DifficultyId = 'normal';
  public paused = false;

  public activePair: ActivePair | null = null;
  public queue: PuyoPairColors[] = [];
  public fallingPuyos: FallingPuyo[] = [];
  public clearingCells: ClearingCell[] = [];
  public clearTimer = 0;
  public clearDuration = 450;

  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];
  public dropTrails: DropTrail[] = [];
  public spellBanner: SpellCardBanner | null = null;

  // Touhou Spell Card & Boss Battle State
  public spiritGauge = 0; // 0..100
  public boss: BossState | null = null;
  public bossDefeated = 0;
  public danmakuOrbs: DanmakuOrb[] = [];
  public activeSpellVfx: ActiveSpellVfx | null = null;
  public bossBonusBanner: BossBonusBanner | null = null;

  public score = 0;
  public bestScore = 0;
  public isNewBest = false;
  public chain = 0;
  public maxChain = 0;
  public totalCleared = 0;
  public allClears = 0;
  public piecesDropped = 0;
  public speedLevel = 1;

  public elapsedMs = 0;
  public shakeTime = 0;
  public shakeMagnitude = 0;
  public dangerRatio = 0; // 0..1 warning intensity when col 2 stacks high
  public chainExcitement = 0; // 0..1 sparkles on puyos & magic circle during/after chains
  public spellFlash = 0; // 0..1 dramatic diagonal flash flare on Spell Card cut-in

  private heldLeft = false;
  private heldRight = false;
  private heldDown = false;
  private dasDir: -1 | 0 | 1 = 0;
  private dasTimer = 0;
  private arrTimer = 0;
  private bufferedRotate: -1 | 0 | 1 = 0;
  private bufferedRotateUntil = -1;
  private bufferedMove: -1 | 0 | 1 = 0;
  private bufferedMoveUntil = -1;
  private bufferedSpellUntil = -1;
  private generatedPairsCount = 0;
  private lastLandSoundTime = -1000;
  private lastBossHitSoundTime = -1000;

  private wasSpiritReady = false;
  private inSpellCascade = false;
  private suspendedPair: PuyoPairColors | null = null;
  private spellPhaseTimer = 0;
  private spellPhaseEndMs = 480;
  private pendingChainStepDamage = 0;

  private readonly audio: PuyoAudio;
  private readonly callbacks: EngineCallbacks;

  constructor(audio: PuyoAudio, callbacks: EngineCallbacks) {
    this.audio = audio;
    this.callbacks = callbacks;
    this.bestScore = callbacks.getBestScore();
    this.resetGrid();
    this.refillQueue();
    if (this.mode === 'boss') {
      this.boss = this.createBossForStage(1);
    }
  }

  private resetGrid(): void {
    this.grid = Array.from({ length: TOTAL_ROWS }, () =>
      Array.from({ length: COLS }, () => null),
    );
  }

  private getConfig() {
    return DIFFICULTIES[this.difficulty];
  }

  private createBossForStage(stage: number): BossState {
    const template = BOSS_ROSTER[(stage - 1) % BOSS_ROSTER.length];
    const loop = Math.floor((stage - 1) / BOSS_ROSTER.length);
    const cfg = this.getConfig();
    const maxHp = Math.round((template.baseHp + loop * 1950) * cfg.bossHpScale);
    const attackInterval = Math.max(
      7600,
      Math.round((template.baseIntervalMs - loop * 1100) * cfg.bossIntervalScale),
    );
    return {
      stage,
      template,
      hp: maxHp,
      maxHp,
      displayHp: maxHp,
      attackTimer: attackInterval,
      attackInterval,
      pendingOjama: 0,
      pendingCols: [],
      hitFlash: 0,
      attackFlash: 0,
      defeatTimer: 0,
      enterTimer: stage === 1 ? 0 : 480,
    };
  }

  private getExtraString(): string {
    if (this.mode === 'boss' && this.boss) {
      return `Stage ${this.boss.stage} · ${this.boss.template.name}`;
    }
    return `最高 ${this.maxChain} 连锁`;
  }

  private getFullExtraString(): string {
    const label = this.getConfig().shortLabel;
    const charName = CHARACTERS[this.character].shortName;
    if (this.mode === 'boss') {
      return `异变S${this.boss?.stage ?? 1}(击破${this.bossDefeated}) · ${charName} · ${this.maxChain}连锁`;
    }
    return `无尽 · ${charName} · ${this.maxChain}连锁 · ${label}`;
  }

  public getSnapshot(): HudSnapshot {
    return {
      phase: this.phase,
      mode: this.mode,
      character: this.character,
      difficulty: this.difficulty,
      score: this.score,
      bestScore: this.bestScore,
      chain: this.chain,
      maxChain: this.maxChain,
      speedLevel: this.speedLevel,
      totalCleared: this.totalCleared,
      allClears: this.allClears,
      spiritGauge: Math.round(this.spiritGauge),
      spiritReady: this.spiritGauge >= 100,
      bossStage: this.boss?.stage ?? 1,
      bossDefeated: this.bossDefeated,
      bossName: this.boss?.template.name ?? '',
      paused: this.paused,
      isNewBest: this.isNewBest,
    };
  }

  private notifyHud(): void {
    this.callbacks.onHudUpdate(this.getSnapshot());
  }

  private notifyScore(): void {
    const storedBest = this.callbacks.getBestScore();
    if (this.score > Math.max(this.bestScore, storedBest)) {
      this.bestScore = this.score;
      this.isNewBest = true;
    } else {
      this.bestScore = Math.max(this.bestScore, storedBest);
    }
    this.callbacks.onScoreChange(
      this.score,
      this.bestScore,
      this.getExtraString(),
    );
    this.notifyHud();
  }

  public setMode(mode: GameMode): void {
    this.mode = mode;
    if (this.phase === 'menu') {
      this.boss = mode === 'boss' ? this.createBossForStage(1) : null;
      this.notifyHud();
    }
  }

  public setCharacter(char: CharacterId): void {
    this.character = char;
    if (this.phase === 'menu') {
      this.notifyHud();
    }
  }

  public setDifficulty(diff: DifficultyId): void {
    this.difficulty = diff;
    if (this.phase === 'menu') {
      this.queue = [];
      this.generatedPairsCount = 0;
      this.refillQueue();
      if (this.mode === 'boss') {
        this.boss = this.createBossForStage(1);
      }
      this.notifyHud();
    }
  }

  public openMenu(): void {
    this.paused = false;
    this.phase = 'menu';
    this.activePair = null;
    this.suspendedPair = null;
    this.fallingPuyos = [];
    this.clearingCells = [];
    this.danmakuOrbs = [];
    this.activeSpellVfx = null;
    this.bossBonusBanner = null;
    this.spellBanner = null;
    this.spiritGauge = 0;
    this.wasSpiritReady = false;
    this.inSpellCascade = false;
    this.clearHeldInputs();
    this.resetGrid();
    this.queue = [];
    this.generatedPairsCount = 0;
    this.refillQueue();
    this.boss = this.mode === 'boss' ? this.createBossForStage(1) : null;
    this.notifyHud();
  }

  public startGame(diff?: DifficultyId): void {
    if (diff) {
      this.difficulty = diff;
    }
    this.audio.unlock();
    this.resetGrid();
    this.paused = false;
    this.score = 0;
    this.bestScore = this.callbacks.getBestScore();
    this.isNewBest = false;
    this.chain = 0;
    this.maxChain = 0;
    this.totalCleared = 0;
    this.allClears = 0;
    this.piecesDropped = 0;
    this.speedLevel = 1;
    this.spiritGauge = 0;
    this.wasSpiritReady = false;
    this.inSpellCascade = false;
    this.bossDefeated = 0;
    this.boss = this.mode === 'boss' ? this.createBossForStage(1) : null;
    this.activePair = null;
    this.suspendedPair = null;
    this.fallingPuyos = [];
    this.clearingCells = [];
    this.particles = [];
    this.floatingTexts = [];
    this.dropTrails = [];
    this.danmakuOrbs = [];
    this.activeSpellVfx = null;
    this.bossBonusBanner = null;
    this.spellBanner = null;
    this.shakeTime = 0;
    this.dangerRatio = 0;
    this.chainExcitement = 0;
    this.spellFlash = 0;
    this.pendingChainStepDamage = 0;
    this.queue = [];
    this.generatedPairsCount = 0;
    this.clearHeldInputs();

    this.refillQueue();
    this.spawnNextPair();
    this.callbacks.onScoreChange(0, this.bestScore, this.getExtraString());
    this.notifyHud();
  }

  public setPaused(paused: boolean): void {
    if (this.phase === 'menu' || this.phase === 'gameover') {
      this.paused = false;
      this.notifyHud();
      return;
    }
    this.paused = paused;
    if (paused) {
      this.clearHeldInputs();
    }
    this.notifyHud();
  }

  public clearHeldInputs(): void {
    this.heldLeft = false;
    this.heldRight = false;
    this.heldDown = false;
    this.dasDir = 0;
    this.dasTimer = 0;
    this.arrTimer = 0;
    this.bufferedRotate = 0;
    this.bufferedRotateUntil = -1;
    this.bufferedMove = 0;
    this.bufferedMoveUntil = -1;
    this.bufferedSpellUntil = -1;
  }

  public getLockProgress(): number {
    if (!this.activePair || this.phase !== 'falling') return 0;
    return Math.min(1, this.activePair.lockTimer / LOCK_DELAY_MS);
  }

  private randomColor(): PuyoColor {
    const count = this.getConfig().colorCount;
    // Opening 2 pairs draw from first 3 colors (classic Puyo Puyo Tsu fairness)
    const pool = this.generatedPairsCount < 2 ? Math.min(3, count) : count;
    return Math.floor(Math.random() * pool) as PuyoColor;
  }

  private refillQueue(): void {
    while (this.queue.length < 3) {
      const pivot = this.randomColor();
      const child = this.randomColor();
      this.generatedPairsCount++;
      this.queue.push({ pivot, child });
    }
  }

  private isInside(col: number, row: number): boolean {
    return col >= 0 && col < COLS && row >= 0 && row < TOTAL_ROWS;
  }

  private isEmpty(col: number, row: number): boolean {
    return this.isInside(col, row) && this.grid[row][col] === null;
  }

  private getChildCoords(
    pivotCol: number,
    pivotRow: number,
    rot: RotationIndex,
  ): [number, number] {
    const [dx, dy] = ROTATION_OFFSETS[rot];
    return [pivotCol + dx, pivotRow + dy];
  }

  private isPairValid(
    pivotCol: number,
    pivotRow: number,
    rot: RotationIndex,
  ): boolean {
    const [cx, cy] = this.getChildCoords(pivotCol, pivotRow, rot);
    return this.isEmpty(pivotCol, pivotRow) && this.isEmpty(cx, cy);
  }

  private isPairBlockedBelow(
    pivotCol: number,
    pivotRow: number,
    rot: RotationIndex,
  ): boolean {
    if (rot === 0) {
      return !this.isEmpty(pivotCol, pivotRow + 1);
    }
    if (rot === 2) {
      return !this.isEmpty(pivotCol, pivotRow + 2);
    }
    const [cx, cy] = this.getChildCoords(pivotCol, pivotRow, rot);
    return !this.isEmpty(pivotCol, pivotRow + 1) || !this.isEmpty(cx, cy + 1);
  }

  private getGravityMs(): number {
    const cfg = this.getConfig();
    return Math.max(
      cfg.minGravityMs,
      cfg.baseGravityMs * Math.pow(cfg.speedDecayFactor, this.speedLevel - 1),
    );
  }

  private spawnNextPair(): void {
    this.inSpellCascade = false;

    // Check death cell before spawning
    if (this.grid[DEATH_ROW][DEATH_COL] !== null) {
      this.triggerGameOver();
      return;
    }

    let next: PuyoPairColors;
    if (this.suspendedPair) {
      next = this.suspendedPair;
      this.suspendedPair = null;
    } else {
      this.refillQueue();
      next = this.queue.shift()!;
      this.refillQueue();
    }

    this.activePair = {
      pivotCol: DEATH_COL,
      pivotRow: DEATH_ROW,
      rot: 0,
      pivotColor: next.pivot,
      childColor: next.child,
      fallFrac: 0,
      lockTimer: 0,
      lockResets: 0,
      softDropGroundMs: 0,
      renderCol: DEATH_COL,
      renderRow: DEATH_ROW - 0.52,
      renderAngle: 0,
      targetAngle: 0,
      quickTurnTimer: 0,
      bumpOffsetX: 0,
      touchSquish: 0,
      touchSquishPhase: 0,
      wasGrounded: false,
    };
    this.chain = 0;
    this.phase = 'falling';
    this.updateDangerRatio();

    // Consume buffered Spell Card press first if ready
    if (this.bufferedSpellUntil >= this.elapsedMs && this.spiritGauge >= 100) {
      this.bufferedSpellUntil = -1;
      if (this.castSpellCard()) {
        return;
      }
    } else {
      this.bufferedSpellUntil = -1;
    }

    // Consume buffered directional tap or rotation pressed during cascade/spawn
    if (this.bufferedMove !== 0 && this.elapsedMs <= this.bufferedMoveUntil) {
      const moveDir = this.bufferedMove;
      this.bufferedMove = 0;
      this.bufferedMoveUntil = -1;
      this.tryMoveHorizontal(moveDir);
    } else {
      this.bufferedMove = 0;
    }

    if (this.bufferedRotate !== 0 && this.elapsedMs <= this.bufferedRotateUntil) {
      const rotDir = this.bufferedRotate;
      this.bufferedRotate = 0;
      this.bufferedRotateUntil = -1;
      this.tryRotate(rotDir);
    } else {
      this.bufferedRotate = 0;
    }

    this.notifyHud();
  }

  private triggerGameOver(): void {
    this.phase = 'gameover';
    this.activePair = null;
    this.suspendedPair = null;
    this.clearHeldInputs();
    this.audio.playGameOver();
    const fullExtra = this.getFullExtraString();
    const prevBest = this.callbacks.getBestScore();
    if (this.score > prevBest) {
      this.bestScore = this.score;
      this.isNewBest = true;
    }
    this.callbacks.saveScore(this.score, fullExtra);
    this.callbacks.onGameOver(this.score, fullExtra);
    this.notifyHud();
  }

  private updateDangerRatio(): void {
    let highestInDeathCol = TOTAL_ROWS;
    for (let r = HIDDEN_ROWS; r < TOTAL_ROWS; r++) {
      if (this.grid[r][DEATH_COL] !== null) {
        highestInDeathCol = r;
        break;
      }
    }
    // Danger builds when column 2 reaches top 4 rows (rows 1..4)
    const filledHeight = TOTAL_ROWS - highestInDeathCol;
    this.dangerRatio = Math.max(0, Math.min(1, (filledHeight - 7) / 4));
  }

  // ==================== SPIRIT GAUGE & ACTIVE SPELL CARDS ====================

  private addSpirit(amount: number): void {
    if (amount <= 0) return;
    const prev = this.spiritGauge;
    this.spiritGauge = Math.min(100, this.spiritGauge + amount);
    if (prev < 100 && this.spiritGauge >= 100 && !this.wasSpiritReady) {
      this.wasSpiritReady = true;
      this.audio.playSpellReady();
      this.floatingTexts.push({
        x: COLS / 2,
        y: 2.3,
        text: '✦ 符卡充能完毕!',
        subText: `${CHARACTERS[this.character].spellShort} [Shift/E]`,
        color: CHARACTERS[this.character].secondaryColor,
        life: 0,
        maxLife: 1350,
        scale: 1.05,
      });
    }
  }

  public castSpellCard(): boolean {
    if (
      this.paused ||
      this.phase === 'menu' ||
      this.phase === 'gameover' ||
      this.phase === 'spell'
    ) {
      return false;
    }

    this.audio.unlock();

    if (this.spiritGauge < 100) {
      this.audio.playBump();
      return false;
    }

    // Buffer cast if currently in dropping/clearing cascade
    if (this.phase !== 'falling') {
      this.bufferedSpellUntil = this.elapsedMs + SPELL_BUFFER_MS;
      return true;
    }

    const charCfg = CHARACTERS[this.character];

    if (this.character === 'reimu') {
      // Find top 2 occupied rows (including Ojama orbs)
      const targetRows: number[] = [];
      for (let r = 0; r < TOTAL_ROWS; r++) {
        let hasAny = false;
        for (let c = 0; c < COLS; c++) {
          if (this.grid[r][c] !== null) {
            hasAny = true;
            break;
          }
        }
        if (hasAny) {
          targetRows.push(r);
          if (targetRows.length >= 2) break;
        }
      }

      if (targetRows.length === 0) {
        this.audio.playBump();
        this.floatingTexts.push({
          x: COLS / 2,
          y: 5.5,
          text: '场上无灵珠',
          color: '#ffb4c2',
          life: 0,
          maxLife: 850,
          scale: 0.95,
        });
        return false;
      }

      this.activeSpellVfx = {
        character: 'reimu',
        timer: 0,
        duration: 820,
        impactMs: 185,
        impactApplied: false,
        targetRows,
      };
      this.spellPhaseEndMs = 480;
      this.audio.playReimuSpell();
    } else if (this.character === 'marisa') {
      const targetCols = [2, 3];
      let countInCols = 0;
      for (const c of targetCols) {
        for (let r = 0; r < TOTAL_ROWS; r++) {
          if (this.grid[r][c] !== null) countInCols++;
        }
      }

      // In Classic mode don't waste gauge on empty center; in Boss mode laser blasts Boss directly!
      if (countInCols === 0 && this.mode !== 'boss') {
        this.audio.playBump();
        this.floatingTexts.push({
          x: COLS / 2,
          y: 5.5,
          text: '中路两列为空',
          color: '#ffe892',
          life: 0,
          maxLife: 850,
          scale: 0.95,
        });
        return false;
      }

      this.activeSpellVfx = {
        character: 'marisa',
        timer: 0,
        duration: 880,
        impactMs: 160,
        impactApplied: false,
        targetCols,
      };
      this.spellPhaseEndMs = 530;
      this.audio.playMarisaSpell();
    } else {
      // Patchouli: rarest regular color (>= 1) -> most abundant regular color
      const counts = [0, 0, 0, 0, 0];
      for (let r = 0; r < TOTAL_ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cell = this.grid[r][c];
          if (cell && !cell.isOjama) {
            counts[cell.color] += 1;
          }
        }
      }

      const present: Array<{ color: PuyoColor; count: number }> = [];
      for (let color = 0; color < 5; color++) {
        if (counts[color] > 0) {
          present.push({ color: color as PuyoColor, count: counts[color] });
        }
      }

      if (present.length < 2) {
        this.audio.playBump();
        this.floatingTexts.push({
          x: COLS / 2,
          y: 5.5,
          text: '需至少2种灵珠',
          color: '#e5b8ff',
          life: 0,
          maxLife: 850,
          scale: 0.95,
        });
        return false;
      }

      present.sort((a, b) => a.count - b.count || a.color - b.color);
      const fromColor = present[0].color;
      const toColor = present[present.length - 1].color;

      const transformedCells: Array<{
        col: number;
        row: number;
        fromColor: PuyoColor;
        toColor: PuyoColor;
      }> = [];
      for (let r = 0; r < TOTAL_ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cell = this.grid[r][c];
          if (cell && !cell.isOjama && cell.color === fromColor) {
            transformedCells.push({ col: c, row: r, fromColor, toColor });
          }
        }
      }

      this.activeSpellVfx = {
        character: 'patchouli',
        timer: 0,
        duration: 860,
        impactMs: 215,
        impactApplied: false,
        transformedCells,
        fromColor,
        toColor,
      };
      this.spellPhaseEndMs = 500;
      this.audio.playPatchouliSpell();
    }

    // Consume Spirit Gauge & suspend current active pair cleanly
    this.spiritGauge = 0;
    this.wasSpiritReady = false;
    this.bufferedSpellUntil = -1;
    this.inSpellCascade = true;

    if (this.activePair) {
      this.suspendedPair = {
        pivot: this.activePair.pivotColor,
        child: this.activePair.childColor,
      };
      this.activePair = null;
    }

    this.phase = 'spell';
    this.spellPhaseTimer = 0;
    this.spellFlash = 1.0;
    this.chainExcitement = 1.0;
    this.shakeTime = 360;
    this.shakeMagnitude = this.character === 'marisa' ? 8.5 : 5.5;
    this.spellBanner = {
      chain: 0,
      tag: 'SPELL CARD',
      title: charCfg.spellName,
      caster: charCfg.name,
      primaryColor: charCfg.primaryColor,
      secondaryColor: charCfg.secondaryColor,
      motif: charCfg.motif,
      timer: 0,
      duration: 1650,
    };

    this.notifyHud();
    return true;
  }

  private applyActiveSpellImpact(): void {
    const vfx = this.activeSpellVfx;
    if (!vfx || vfx.impactApplied) return;
    vfx.impactApplied = true;

    if (vfx.character === 'reimu' && vfx.targetRows) {
      let cleared = 0;
      let ojamaCleared = 0;
      const clearedCoords: Array<{ col: number; row: number; color: string }> = [];

      for (const r of vfx.targetRows) {
        for (let c = 0; c < COLS; c++) {
          const cell = this.grid[r][c];
          if (!cell) continue;
          const cx = c + 0.5;
          const cy = r - HIDDEN_ROWS + 0.5;
          const ptColor = cell.isOjama ? '#e2ecff' : PUYO_THEMES[cell.color].particle;
          clearedCoords.push({ col: c, row: r, color: cell.isOjama ? '#ff94a8' : ptColor });
          this.spawnPurifyBurst(cx, cy, cell.isOjama ? '#e8f0ff' : '#ff7088', '#ffe49e');
          this.grid[r][c] = null;
          cleared++;
          if (cell.isOjama) ojamaCleared++;
        }
      }

      if (ojamaCleared > 0) {
        this.audio.playOjamaShatter();
      }
      this.totalCleared += cleared;
      const bonus = cleared * 100;
      this.score += bonus;
      const midRow =
        vfx.targetRows.reduce((s, r) => s + r, 0) / Math.max(1, vfx.targetRows.length) -
        HIDDEN_ROWS +
        0.5;
      this.floatingTexts.push({
        x: COLS / 2,
        y: Math.max(1.6, Math.min(9.5, midRow)),
        text: `梦想封印 · 净化${cleared}`,
        subText: `+${bonus}`,
        color: '#ffe38e',
        life: 0,
        maxLife: 1200,
        scale: 1.12,
      });

      if (this.mode === 'boss' && this.boss && this.boss.defeatTimer <= 0) {
        const dmg = 220 + cleared * 35;
        this.launchSpellDanmaku(clearedCoords, dmg, '#ff4d6d', '#fff4cc');
      }

      this.checkAllClearBonus();
      this.updateDangerRatio();
      this.notifyScore();
    } else if (vfx.character === 'marisa' && vfx.targetCols) {
      let cleared = 0;
      let ojamaCleared = 0;
      const clearedCoords: Array<{ col: number; row: number; color: string }> = [];
      const rainbow = ['#ff6b8b', '#ffd166', '#6cf0a0', '#6ce4ff', '#d099ff'];

      for (const c of vfx.targetCols) {
        for (let r = 0; r < TOTAL_ROWS; r++) {
          const cell = this.grid[r][c];
          if (!cell) continue;
          const cx = c + 0.5;
          const cy = r - HIDDEN_ROWS + 0.5;
          const colHex = rainbow[(r + c) % rainbow.length];
          clearedCoords.push({ col: c, row: r, color: colHex });
          this.spawnPurifyBurst(cx, cy, colHex, '#ffffff');
          this.grid[r][c] = null;
          cleared++;
          if (cell.isOjama) ojamaCleared++;
        }
      }

      if (ojamaCleared > 0) {
        this.audio.playOjamaShatter();
      }
      this.shakeTime = 400;
      this.shakeMagnitude = 9.0;
      this.totalCleared += cleared;
      const bonus = Math.max(200, cleared * 110);
      this.score += bonus;
      this.floatingTexts.push({
        x: 3.0,
        y: 5.0,
        text: 'MASTER SPARK!!',
        subText: cleared > 0 ? `贯穿 ${cleared} 颗 · +${bonus}` : `+${bonus}`,
        color: '#fff282',
        life: 0,
        maxLife: 1300,
        scale: 1.18,
      });

      if (this.mode === 'boss' && this.boss && this.boss.defeatTimer <= 0) {
        const dmg = 280 + cleared * 38;
        const sources =
          clearedCoords.length > 0
            ? clearedCoords
            : [
                { col: 2, row: 7, color: '#ffe36e' },
                { col: 3, row: 7, color: '#7de4ff' },
                { col: 2, row: 4, color: '#ff7084' },
                { col: 3, row: 4, color: '#d099ff' },
              ];
        this.launchSpellDanmaku(sources, dmg, '#f5b82e', '#ffffff');
      }

      this.checkAllClearBonus();
      this.updateDangerRatio();
      this.notifyScore();
    } else if (vfx.character === 'patchouli' && vfx.transformedCells && vfx.toColor !== undefined) {
      const targetTheme = PUYO_THEMES[vfx.toColor];
      const sources: Array<{ col: number; row: number; color: string }> = [];
      let transformedCount = 0;

      for (const item of vfx.transformedCells) {
        const cell = this.grid[item.row][item.col];
        if (cell && !cell.isOjama) {
          cell.color = item.toColor;
          this.triggerCellSquish(item.col, item.row, 1.3);
          this.spawnPurifyBurst(
            item.col + 0.5,
            item.row - HIDDEN_ROWS + 0.5,
            targetTheme.particle,
            '#f0abfc',
          );
          sources.push({ col: item.col, row: item.row, color: '#d099ff' });
          transformedCount++;
        }
      }

      const bonus = transformedCount * 90;
      this.score += bonus;
      this.floatingTexts.push({
        x: COLS / 2,
        y: 5.2,
        text: `贤者之石 · 同化${transformedCount}`,
        subText: `转为 ${targetTheme.name}`,
        color: '#f0abfc',
        life: 0,
        maxLife: 1200,
        scale: 1.12,
      });

      if (this.mode === 'boss' && this.boss && this.boss.defeatTimer <= 0) {
        const dmg = 160 + transformedCount * 24;
        this.launchSpellDanmaku(sources, dmg, '#a855f7', '#f5e0ff');
      }

      this.notifyScore();
    }
  }

  private spawnPurifyBurst(cx: number, cy: number, colorA: string, colorB: string): void {
    this.particles.push({
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      size: 0.32,
      color: colorB,
      alpha: 0.95,
      life: 0,
      maxLife: 320,
      shape: 'ring',
      rotation: 0,
      vRot: 0,
    });
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.4;
      const spd = 0.0024 + Math.random() * 0.0042;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 0.0012,
        size: 0.11 + Math.random() * 0.13,
        color: i % 2 === 0 ? colorA : colorB,
        alpha: 1,
        life: 0,
        maxLife: 360 + Math.random() * 240,
        shape: i % 2 === 0 ? 'star' : 'diamond',
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.015,
      });
    }
  }

  // ==================== BOSS DANMAKU & OJAMA SYSTEM ====================

  private launchSpellDanmaku(
    sources: Array<{ col: number; row: number; color: string }>,
    totalDamage: number,
    fallbackColor: string,
    coreColor: string,
  ): void {
    if (!this.boss || this.boss.defeatTimer > 0) return;
    const picked = sources.slice(0, 10);
    if (picked.length === 0) {
      picked.push({ col: 2, row: 6, color: fallbackColor });
      picked.push({ col: 3, row: 6, color: fallbackColor });
    }
    const perOrb = totalDamage / picked.length;
    picked.forEach((src, i) => {
      const sx = src.col + 0.5;
      const sy = Math.max(0.2, src.row - HIDDEN_ROWS + 0.5);
      const curveSide = (i % 2 === 0 ? -1 : 1) * (0.9 + (i % 3) * 0.5);
      this.danmakuOrbs.push({
        startX: sx,
        startY: sy,
        ctrlX: Math.max(0.2, Math.min(COLS - 0.2, (sx + BOSS_PORTRAIT_X) * 0.5 + curveSide)),
        ctrlY: (sy + BOSS_PORTRAIT_Y) * 0.45 - 0.6,
        targetX: BOSS_PORTRAIT_X,
        targetY: BOSS_PORTRAIT_Y,
        progress: -i * 0.055,
        duration: 360 + (i % 4) * 35,
        color: src.color || fallbackColor,
        coreColor,
        radius: 0.24,
        damage: perOrb,
        trail: [],
      });
    });
  }

  private launchClearDanmaku(cleared: ClearingCell[], totalDamage: number): void {
    if (!this.boss || this.boss.defeatTimer > 0 || totalDamage <= 0) return;
    const regular = cleared.filter((c) => !c.isOjama);
    const pool = regular.length > 0 ? regular : cleared;
    const maxOrbs = Math.min(12, pool.length);
    const step = Math.max(1, pool.length / maxOrbs);
    const chosen: ClearingCell[] = [];
    for (let i = 0; i < maxOrbs; i++) {
      chosen.push(pool[Math.min(pool.length - 1, Math.floor(i * step))]);
    }
    const perOrb = totalDamage / chosen.length;
    chosen.forEach((cell, i) => {
      const sx = cell.col + 0.5;
      const sy = cell.row - HIDDEN_ROWS + 0.5;
      const theme = PUYO_THEMES[cell.color];
      const swing = (i % 2 === 0 ? 1 : -1) * (0.75 + (i % 3) * 0.45);
      this.danmakuOrbs.push({
        startX: sx,
        startY: sy,
        ctrlX: Math.max(0.2, Math.min(COLS - 0.2, (sx + BOSS_PORTRAIT_X) * 0.5 + swing)),
        ctrlY: Math.min(sy, (sy + BOSS_PORTRAIT_Y) * 0.5 - 0.5),
        targetX: BOSS_PORTRAIT_X,
        targetY: BOSS_PORTRAIT_Y,
        progress: -i * 0.045,
        duration: 330 + (i % 4) * 35,
        color: cell.isOjama ? '#b8d4ff' : theme.particle,
        coreColor: '#ffffff',
        radius: Math.min(0.28, 0.16 + this.chain * 0.028),
        damage: perOrb,
        trail: [],
      });
    });
  }

  private applyBossDamage(amount: number, color: string): void {
    const boss = this.boss;
    if (!boss || boss.defeatTimer > 0) return;

    const dmg = Math.max(1, Math.round(amount));
    boss.hp = Math.max(0, boss.hp - dmg);
    boss.hitFlash = 1.0;

    if (this.elapsedMs - this.lastBossHitSoundTime > 48) {
      this.lastBossHitSoundTime = this.elapsedMs;
      this.audio.playBossHit(dmg >= 110);
    }

    // Spark burst right on the Fumo Boss portrait!
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 0.002 + Math.random() * 0.003;
      this.particles.push({
        x: BOSS_PORTRAIT_X + (Math.random() - 0.5) * 0.35,
        y: BOSS_PORTRAIT_Y + (Math.random() - 0.5) * 0.35,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: 0.09 + Math.random() * 0.09,
        color: i === 0 ? '#ffffff' : color,
        alpha: 0.95,
        life: 0,
        maxLife: 240 + Math.random() * 140,
        shape: i % 2 === 0 ? 'star' : 'dot',
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.02,
      });
    }

    if (dmg >= 25) {
      this.floatingTexts.push({
        x: BOSS_PORTRAIT_X + 0.55 + (Math.random() - 0.5) * 0.5,
        y: BOSS_PORTRAIT_Y + 0.15,
        text: `-${dmg}`,
        color: dmg >= 140 ? '#ffe36e' : '#ff9eb0',
        life: 0,
        maxLife: 560,
        scale: dmg >= 140 ? 0.92 : 0.76,
      });
    }

    if (boss.hp <= 0) {
      this.triggerBossDefeat();
    }
  }

  private triggerBossDefeat(): void {
    const boss = this.boss;
    if (!boss || boss.defeatTimer > 0) return;

    boss.hp = 0;
    boss.defeatTimer = 1250;
    boss.pendingOjama = 0;
    boss.pendingCols = [];
    this.bossDefeated += 1;

    const bonus = 1500 * boss.stage;
    this.score += bonus;

    this.bossBonusBanner = {
      bossName: boss.template.name,
      stage: boss.stage,
      bonus,
      timer: 0,
      duration: 2150,
    };
    this.spellFlash = 0.92;
    this.shakeTime = 380;
    this.shakeMagnitude = 7.2;
    this.audio.playBossDefeat();

    // Celebratory starburst around defeated Fumo Boss
    const colors = ['#ffe36e', '#ff7084', '#7de4ff', '#d099ff', '#ffffff'];
    for (let i = 0; i < 24; i++) {
      const a = (Math.PI * 2 * i) / 24;
      const spd = 0.0024 + Math.random() * 0.004;
      this.particles.push({
        x: BOSS_PORTRAIT_X,
        y: BOSS_PORTRAIT_Y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: 0.13 + Math.random() * 0.13,
        color: colors[i % colors.length],
        alpha: 1,
        life: 0,
        maxLife: 580 + Math.random() * 280,
        shape: i % 2 === 0 ? 'star' : 'diamond',
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.018,
      });
    }

    // Shatter ALL Ojama orbs on the board immediately!
    let shatteredOjama = 0;
    for (let r = 0; r < TOTAL_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = this.grid[r][c];
        if (cell?.isOjama) {
          this.spawnOjamaShatterParticles(c + 0.5, r - HIDDEN_ROWS + 0.5);
          this.grid[r][c] = null;
          shatteredOjama++;
        }
      }
    }

    // Also shatter any mid-air falling Ojama
    if (this.fallingPuyos.length > 0) {
      const remaining: FallingPuyo[] = [];
      for (const f of this.fallingPuyos) {
        if (f.isOjama) {
          this.spawnOjamaShatterParticles(f.col + 0.5, f.y - HIDDEN_ROWS + 0.5);
          shatteredOjama++;
        } else {
          remaining.push(f);
        }
      }
      this.fallingPuyos = remaining;
    }

    if (shatteredOjama > 0) {
      this.audio.playOjamaShatter();
      this.updateDangerRatio();

      // If shattering Ojama left cells floating during 'falling', drop them cleanly!
      if (this.phase === 'falling' && this.hasFloatingGridCells()) {
        if (this.activePair) {
          this.suspendedPair = {
            pivot: this.activePair.pivotColor,
            child: this.activePair.childColor,
          };
          this.activePair = null;
        }
        this.startGravityDrop(false);
      }
    }

    this.notifyScore();
  }

  private hasFloatingGridCells(): boolean {
    for (let c = 0; c < COLS; c++) {
      let seenEmpty = false;
      for (let r = TOTAL_ROWS - 1; r >= 0; r--) {
        if (this.grid[r][c] === null) {
          seenEmpty = true;
        } else if (seenEmpty) {
          return true;
        }
      }
    }
    return false;
  }

  private spawnOjamaShatterParticles(cx: number, cy: number): void {
    this.particles.push({
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      size: 0.3,
      color: '#e6f0ff',
      alpha: 0.9,
      life: 0,
      maxLife: 280,
      shape: 'ring',
      rotation: 0,
      vRot: 0,
    });
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.4;
      const spd = 0.002 + Math.random() * 0.0036;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 0.0014,
        size: 0.09 + Math.random() * 0.11,
        color: i % 2 === 0 ? '#ffffff' : '#c9d8f8',
        alpha: 0.95,
        life: 0,
        maxLife: 320 + Math.random() * 200,
        shape: i % 2 === 0 ? 'diamond' : 'dot',
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.018,
      });
    }
  }

  private armBossOjamaAttack(): void {
    const boss = this.boss;
    if (!boss || boss.defeatTimer > 0) return;

    // 2..5 Ojama orbs scaling smoothly with stage & difficulty
    const baseMin = boss.stage === 1 ? 2 : boss.stage === 2 ? 3 : 3;
    const baseMax = boss.stage === 1 ? 3 : boss.stage === 2 ? 4 : 5;
    let count = baseMin + Math.floor(Math.random() * (baseMax - baseMin + 1));
    if (this.difficulty === 'easy') count = Math.max(2, count - 1);
    if (this.difficulty === 'lunatic') count = Math.min(5, count + 1);
    count = Math.max(2, Math.min(5, count));

    const cols = this.pickOjamaColumns(count);
    boss.pendingCols = cols;
    boss.pendingOjama = cols.length;
    boss.attackFlash = 1.0;
    this.audio.playBossAttack();

    this.floatingTexts.push({
      x: COLS * 0.58,
      y: BOSS_PORTRAIT_Y + 0.35,
      text: `毛玉干扰 ×${cols.length}!`,
      color: '#dbe8ff',
      life: 0,
      maxLife: 1050,
      scale: 0.88,
    });
  }

  private pickOjamaColumns(count: number): number[] {
    // Prefer open non-danger columns first so Ojama feels strategic rather than cheap instant-kill
    const safeCols: number[] = [];
    const tightCols: number[] = [];

    for (let c = 0; c < COLS; c++) {
      let emptyRow = -1;
      for (let r = TOTAL_ROWS - 1; r >= 0; r--) {
        if (this.grid[r][c] === null) {
          emptyRow = r;
          break;
        }
      }
      if (emptyRow < 0) continue;
      if (c === DEATH_COL && emptyRow <= DEATH_ROW + 1) {
        tightCols.push(c);
      } else if (emptyRow <= HIDDEN_ROWS) {
        tightCols.push(c);
      } else {
        safeCols.push(c);
      }
    }

    const shuffle = (arr: number[]) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    const ordered = [...shuffle(safeCols), ...shuffle(tightCols)];
    return ordered.slice(0, Math.min(count, ordered.length));
  }

  private dropPendingOjama(): boolean {
    const boss = this.boss;
    if (!boss || boss.pendingOjama <= 0 || boss.defeatTimer > 0) return false;

    // Re-validate landing rows for armed columns (fall back to picking fresh if filled)
    const desiredCount = boss.pendingOjama;
    const chosen: number[] = [];
    for (const c of boss.pendingCols) {
      if (this.grid[0][c] === null) {
        chosen.push(c);
      }
    }
    if (chosen.length < desiredCount) {
      const extra = this.pickOjamaColumns(desiredCount).filter((c) => !chosen.includes(c));
      while (chosen.length < desiredCount && extra.length > 0) {
        chosen.push(extra.shift()!);
      }
    }

    boss.pendingOjama = 0;
    boss.pendingCols = [];
    boss.attackTimer = boss.attackInterval;

    if (chosen.length === 0) return false;

    const spawned: FallingPuyo[] = [];
    chosen.forEach((c, idx) => {
      let targetRow = -1;
      for (let r = TOTAL_ROWS - 1; r >= 0; r--) {
        if (this.grid[r][c] === null) {
          targetRow = r;
          break;
        }
      }
      if (targetRow >= 0) {
        spawned.push({
          col: c,
          color: 0,
          isOjama: true,
          startRow: -0.6 - idx * 0.22,
          targetRow,
          y: -0.6 - idx * 0.22,
          vy: 0.011,
        });
        this.dropTrails.push({
          col: c,
          fromRow: -0.2,
          toRow: targetRow,
          color: '#dce8ff',
          life: 0,
          maxLife: 240,
        });
      }
    });

    if (spawned.length === 0) return false;

    this.fallingPuyos = spawned;
    this.phase = 'dropping';
    this.audio.playOjamaDrop();
    return true;
  }

  // ==================== INPUT ACTIONS ====================

  public setLeftHeld(held: boolean): void {
    if (held === this.heldLeft) return;
    this.heldLeft = held;
    if (held) {
      this.audio.unlock();
      this.dasDir = -1;
      this.dasTimer = 0;
      this.arrTimer = 0;
      if (this.phase === 'falling' && !this.paused) {
        this.tryMoveHorizontal(-1);
      } else if (
        (this.phase === 'dropping' || this.phase === 'clearing' || this.phase === 'spell') &&
        !this.paused
      ) {
        this.bufferedMove = -1;
        this.bufferedMoveUntil = this.elapsedMs + INPUT_BUFFER_MS;
      }
    } else if (this.heldRight) {
      this.dasDir = 1;
      this.dasTimer = 0;
      this.arrTimer = 0;
    } else {
      this.dasDir = 0;
    }
  }

  public setRightHeld(held: boolean): void {
    if (held === this.heldRight) return;
    this.heldRight = held;
    if (held) {
      this.audio.unlock();
      this.dasDir = 1;
      this.dasTimer = 0;
      this.arrTimer = 0;
      if (this.phase === 'falling' && !this.paused) {
        this.tryMoveHorizontal(1);
      } else if (
        (this.phase === 'dropping' || this.phase === 'clearing' || this.phase === 'spell') &&
        !this.paused
      ) {
        this.bufferedMove = 1;
        this.bufferedMoveUntil = this.elapsedMs + INPUT_BUFFER_MS;
      }
    } else if (this.heldLeft) {
      this.dasDir = -1;
      this.dasTimer = 0;
      this.arrTimer = 0;
    } else {
      this.dasDir = 0;
    }
  }

  public setDownHeld(held: boolean): void {
    if (held) {
      this.audio.unlock();
    } else if (this.activePair) {
      this.activePair.softDropGroundMs = 0;
    }
    this.heldDown = held;
  }

  public tryMoveHorizontal(dx: -1 | 1): boolean {
    if (this.paused) return false;
    if (this.phase !== 'falling' || !this.activePair) {
      if (this.phase === 'dropping' || this.phase === 'clearing' || this.phase === 'spell') {
        this.bufferedMove = dx;
        this.bufferedMoveUntil = this.elapsedMs + INPUT_BUFFER_MS;
      }
      return false;
    }
    const p = this.activePair;
    const nextCol = p.pivotCol + dx;

    if (this.isPairValid(nextCol, p.pivotRow, p.rot)) {
      p.pivotCol = nextCol;
      if (this.isPairBlockedBelow(p.pivotCol, p.pivotRow, p.rot)) {
        p.fallFrac = 0;
        p.softDropGroundMs = 0;
        this.tryResetLockDelay();
      }
      p.quickTurnTimer = 0;
      this.audio.playMove();
      return true;
    }

    p.bumpOffsetX = dx * 0.17;
    return false;
  }

  /**
   * Rotate active pair with authentic wall kicks, floor kicks,
   * and squeezed 1-wide column 180-degree quick-turn flip.
   * @param dir +1 = clockwise, -1 = counter-clockwise
   */
  public tryRotate(dir: 1 | -1): boolean {
    if (this.paused) return false;
    if (this.phase !== 'falling' || !this.activePair) {
      if (this.phase === 'dropping' || this.phase === 'clearing' || this.phase === 'spell') {
        this.bufferedRotate = dir;
        this.bufferedRotateUntil = this.elapsedMs + INPUT_BUFFER_MS;
      }
      return false;
    }
    this.audio.unlock();
    const p = this.activePair;
    const newRot = ((((p.rot + dir) % 4) + 4) % 4) as RotationIndex;

    // 1. Direct rotation
    if (this.isPairValid(p.pivotCol, p.pivotRow, newRot)) {
      this.applyRotation(p, p.pivotCol, p.pivotRow, newRot, dir * (Math.PI / 2), false);
      return true;
    }

    // 2. Wall kicks (horizontal kick away from obstacle)
    if (newRot === 1 && this.isPairValid(p.pivotCol - 1, p.pivotRow, newRot)) {
      this.applyRotation(p, p.pivotCol - 1, p.pivotRow, newRot, dir * (Math.PI / 2), false);
      return true;
    }
    if (newRot === 3 && this.isPairValid(p.pivotCol + 1, p.pivotRow, newRot)) {
      this.applyRotation(p, p.pivotCol + 1, p.pivotRow, newRot, dir * (Math.PI / 2), false);
      return true;
    }

    // 3. Floor kick (push pivot up when rotating child down into floor/stack)
    if (newRot === 2 && this.isPairValid(p.pivotCol, p.pivotRow - 1, newRot)) {
      this.applyRotation(p, p.pivotCol, p.pivotRow - 1, newRot, dir * (Math.PI / 2), false);
      return true;
    }

    // 4. Ceiling kick (push pivot down if rotating child up at top buffer edge)
    if (newRot === 0 && this.isPairValid(p.pivotCol, p.pivotRow + 1, newRot)) {
      this.applyRotation(p, p.pivotCol, p.pivotRow + 1, newRot, dir * (Math.PI / 2), false);
      return true;
    }

    // 5. Squeezed in 1-wide column: Quick-Turn 180-degree flip!
    if (p.quickTurnTimer > 0) {
      const flipRot = ((p.rot + 2) % 4) as RotationIndex;
      if (
        flipRot === 0 &&
        this.isPairBlockedBelow(p.pivotCol, p.pivotRow, p.rot) &&
        this.isPairValid(p.pivotCol, p.pivotRow + 1, flipRot)
      ) {
        this.applyRotation(p, p.pivotCol, p.pivotRow + 1, flipRot, dir * Math.PI, true);
        p.quickTurnTimer = 0;
        return true;
      }
      if (this.isPairValid(p.pivotCol, p.pivotRow, flipRot)) {
        this.applyRotation(p, p.pivotCol, p.pivotRow, flipRot, dir * Math.PI, true);
        p.quickTurnTimer = 0;
        return true;
      }
      if (flipRot === 2 && this.isPairValid(p.pivotCol, p.pivotRow - 1, flipRot)) {
        this.applyRotation(p, p.pivotCol, p.pivotRow - 1, flipRot, dir * Math.PI, true);
        p.quickTurnTimer = 0;
        return true;
      }
      if (flipRot === 0 && this.isPairValid(p.pivotCol, p.pivotRow + 1, flipRot)) {
        this.applyRotation(p, p.pivotCol, p.pivotRow + 1, flipRot, dir * Math.PI, true);
        p.quickTurnTimer = 0;
        return true;
      }
    }

    // Arm quick-turn window on first squeezed press
    p.quickTurnTimer = QUICK_TURN_WINDOW_MS;
    p.bumpOffsetX = dir * 0.14;
    this.audio.playBump();
    return false;
  }

  private applyRotation(
    p: ActivePair,
    newCol: number,
    newRow: number,
    newRot: RotationIndex,
    angleDelta: number,
    isQuickTurn: boolean,
  ): void {
    const movedVertically = newRow !== p.pivotRow;
    p.pivotCol = newCol;
    p.pivotRow = newRow;
    p.rot = newRot;
    p.targetAngle += angleDelta;
    if (this.isPairBlockedBelow(p.pivotCol, p.pivotRow, p.rot)) {
      p.fallFrac = 0;
      p.softDropGroundMs = 0;
      p.touchSquish = Math.max(p.touchSquish, 0.42);
      p.touchSquishPhase = 0;
      this.tryResetLockDelay();
    } else if (movedVertically) {
      p.fallFrac = 0;
    }
    this.audio.playRotate(isQuickTurn);
  }

  private tryResetLockDelay(): void {
    if (!this.activePair) return;
    if (this.activePair.lockResets < MAX_LOCK_RESETS) {
      this.activePair.lockTimer = 0;
      this.activePair.lockResets += 1;
    }
  }

  private triggerCellSquish(col: number, row: number, energy: number): void {
    if (!this.isInside(col, row)) return;
    const cell = this.grid[row][col];
    if (!cell) return;
    cell.squish = Math.min(1.4, Math.max(cell.squish, energy));
    cell.squishPhase = 0;
    cell.squishFreq = 0.025 + ((col * 7 + row * 13) % 5) * 0.0012;

    // Subtle sympathetic jelly cushion ripple on the puyo directly underneath
    if (row + 1 < TOTAL_ROWS) {
      const below = this.grid[row + 1][col];
      if (below) {
        below.squish = Math.min(1.0, Math.max(below.squish, energy * 0.42));
        below.squishPhase = 0.25;
      }
    }
  }

  private spawnLandingDust(
    col: number,
    row: number,
    color: PuyoColor,
    count: number,
    isOjama = false,
  ): void {
    if (row < HIDDEN_ROWS) return;
    const lightColor = isOjama ? '#dce8ff' : PUYO_THEMES[color].light;
    const cx = col + 0.5;
    const cy = row - HIDDEN_ROWS + 0.88;
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const spread = 0.0012 + Math.random() * 0.002;
      this.particles.push({
        x: cx + side * (0.12 + Math.random() * 0.2),
        y: cy,
        vx: side * spread,
        vy: -0.0007 - Math.random() * 0.0014,
        size: 0.06 + Math.random() * 0.06,
        color: i === 0 ? '#ffffff' : lightColor,
        alpha: 0.85,
        life: 0,
        maxLife: 220 + Math.random() * 140,
        shape: i % 3 === 0 ? 'star' : 'dot',
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.012,
      });
    }
  }

  public hardDrop(): void {
    if (this.phase !== 'falling' || this.paused || !this.activePair) return;
    this.audio.unlock();
    const p = this.activePair;
    const ghosts = this.getGhostPositions();

    let dropDist = 0;
    while (!this.isPairBlockedBelow(p.pivotCol, p.pivotRow + dropDist, p.rot)) {
      dropDist += 1;
    }

    // Create sleek vertical drop trails to the final ghost landing rows
    const [cx, cy] = this.getChildCoords(p.pivotCol, p.pivotRow, p.rot);
    if (ghosts.length === 2) {
      this.dropTrails.push({
        col: p.pivotCol,
        fromRow: p.renderRow,
        toRow: ghosts[0].row,
        color: PUYO_THEMES[p.pivotColor].light,
        life: 0,
        maxLife: 210,
      });
      this.dropTrails.push({
        col: cx,
        fromRow: cy + (p.renderRow - p.pivotRow),
        toRow: ghosts[1].row,
        color: PUYO_THEMES[p.childColor].light,
        life: 0,
        maxLife: 210,
      });
    }

    if (dropDist > 0) {
      p.pivotRow += dropDist;
      this.score += dropDist;
      this.notifyScore();
    }
    p.fallFrac = 0;
    p.renderRow = p.pivotRow;
    this.audio.playHardDrop();
    this.lockActivePair(true);
  }

  public getGhostPositions(): GhostCell[] {
    const p = this.activePair;
    if (!p || this.phase !== 'falling') return [];

    const dropRowForCol = (col: number, startRow: number): number => {
      let r = Math.max(0, startRow);
      while (r + 1 < TOTAL_ROWS && this.grid[r + 1][col] === null) {
        r++;
      }
      return r;
    };

    const [cx, cy] = this.getChildCoords(p.pivotCol, p.pivotRow, p.rot);

    if (p.rot === 0) {
      const pivotLand = dropRowForCol(p.pivotCol, p.pivotRow);
      const childLand = Math.max(0, pivotLand - 1);
      return [
        { col: p.pivotCol, row: pivotLand, color: p.pivotColor },
        { col: cx, row: childLand, color: p.childColor },
      ];
    }
    if (p.rot === 2) {
      const childLand = dropRowForCol(cx, cy);
      const pivotLand = Math.max(0, childLand - 1);
      return [
        { col: p.pivotCol, row: pivotLand, color: p.pivotColor },
        { col: cx, row: childLand, color: p.childColor },
      ];
    }

    return [
      {
        col: p.pivotCol,
        row: dropRowForCol(p.pivotCol, p.pivotRow),
        color: p.pivotColor,
      },
      {
        col: cx,
        row: dropRowForCol(cx, cy),
        color: p.childColor,
      },
    ];
  }

  // ==================== LOCKING, GRAVITY, CHAINS ====================

  private lockActivePair(fromHardDrop = false): void {
    const p = this.activePair;
    if (!p) return;

    const squishEnergy = fromHardDrop ? 1.28 : 0.96;
    const [cx, cy] = this.getChildCoords(p.pivotCol, p.pivotRow, p.rot);
    if (this.isInside(p.pivotCol, p.pivotRow)) {
      this.grid[p.pivotRow][p.pivotCol] = {
        color: p.pivotColor,
        squish: 0,
        squishPhase: 0,
        squishFreq: 0.026,
      };
      this.triggerCellSquish(p.pivotCol, p.pivotRow, squishEnergy);
      if (fromHardDrop) {
        this.spawnLandingDust(p.pivotCol, p.pivotRow, p.pivotColor, 4);
      }
    }
    if (this.isInside(cx, cy)) {
      this.grid[cy][cx] = {
        color: p.childColor,
        squish: 0,
        squishPhase: 0,
        squishFreq: 0.027,
      };
      this.triggerCellSquish(cx, cy, squishEnergy);
      if (fromHardDrop) {
        this.spawnLandingDust(cx, cy, p.childColor, 4);
      }
    }

    this.activePair = null;
    this.piecesDropped += 1;
    const cfg = this.getConfig();
    const nextLevel = 1 + Math.floor(this.piecesDropped / cfg.speedStepEvery);
    if (nextLevel !== this.speedLevel) {
      this.speedLevel = nextLevel;
      this.floatingTexts.push({
        x: COLS / 2,
        y: 3.4,
        text: `SPEED LV.${this.speedLevel}`,
        color: '#ffe36e',
        life: 0,
        maxLife: 1100,
        scale: 1.0,
      });
    }

    this.startGravityDrop(true);
  }

  private startGravityDrop(playLandIfStatic: boolean): void {
    this.fallingPuyos = [];

    for (let c = 0; c < COLS; c++) {
      let writeRow = TOTAL_ROWS - 1;
      for (let r = TOTAL_ROWS - 1; r >= 0; r--) {
        const cell = this.grid[r][c];
        if (!cell) continue;
        if (r < writeRow) {
          this.grid[r][c] = null;
          this.fallingPuyos.push({
            col: c,
            color: cell.color,
            isOjama: cell.isOjama,
            startRow: r,
            targetRow: writeRow,
            y: r,
            vy: 0.008,
          });
        }
        writeRow--;
      }
    }

    if (this.fallingPuyos.length > 0) {
      this.phase = 'dropping';
    } else {
      if (playLandIfStatic) {
        this.playLandDebounced();
      }
      this.checkChainsAndResolve();
    }
  }

  private playLandDebounced(): void {
    if (this.elapsedMs - this.lastLandSoundTime > 55) {
      this.lastLandSoundTime = this.elapsedMs;
      this.audio.playLand();
    }
  }

  private checkChainsAndResolve(): void {
    this.updateDangerRatio();

    // Flood-fill visible rows (HIDDEN_ROWS .. TOTAL_ROWS - 1) for groups >= 4 (excluding Ojama!)
    const visited: boolean[][] = Array.from({ length: TOTAL_ROWS }, () =>
      Array.from({ length: COLS }, () => false),
    );
    const matchedGroups: ClearingCell[][] = [];

    const dirs: readonly [number, number][] = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    for (let r = HIDDEN_ROWS; r < TOTAL_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (visited[r][c]) continue;
        const cell = this.grid[r][c];
        if (!cell || cell.isOjama) continue;

        const targetColor = cell.color;
        const group: ClearingCell[] = [];
        const stack: [number, number][] = [[c, r]];
        visited[r][c] = true;

        while (stack.length > 0) {
          const [cc, rr] = stack.pop()!;
          group.push({ col: cc, row: rr, color: targetColor });
          for (const [dc, dr] of dirs) {
            const nc = cc + dc;
            const nr = rr + dr;
            if (
              nc >= 0 &&
              nc < COLS &&
              nr >= HIDDEN_ROWS &&
              nr < TOTAL_ROWS &&
              !visited[nr][nc]
            ) {
              const neighbor = this.grid[nr][nc];
              if (neighbor && !neighbor.isOjama && neighbor.color === targetColor) {
                visited[nr][nc] = true;
                stack.push([nc, nr]);
              }
            }
          }
        }

        if (group.length >= 4) {
          matchedGroups.push(group);
        }
      }
    }

    if (matchedGroups.length === 0) {
      // Settled cleanly — check death cell first
      if (this.grid[DEATH_ROW][DEATH_COL] !== null) {
        this.triggerGameOver();
        return;
      }

      // Drop armed Boss Ojama orbs between turns!
      if (this.mode === 'boss' && this.boss && this.boss.pendingOjama > 0 && this.boss.defeatTimer <= 0) {
        if (this.dropPendingOjama()) {
          return;
        }
      }

      this.spawnNextPair();
      return;
    }

    // Chain triggered!
    this.chain += 1;
    if (this.chain > this.maxChain) {
      this.maxChain = this.chain;
    }

    const clearedList: ClearingCell[] = [];
    const distinctColors = new Set<PuyoColor>();
    let groupBonus = 0;
    let sumCol = 0;
    let sumRow = 0;

    for (const grp of matchedGroups) {
      groupBonus += getGroupBonus(grp.length);
      for (const item of grp) {
        clearedList.push(item);
        distinctColors.add(item.color);
        sumCol += item.col + 0.5;
        sumRow += item.row - HIDDEN_ROWS + 0.5;
      }
    }

    const regularClearedCount = clearedList.length;

    // Auto-shatter any Ojama orbs orthogonally adjacent to matched puyo groups!
    const ojamaKeys = new Set<string>();
    let ojamaCount = 0;
    for (let i = 0; i < regularClearedCount; i++) {
      const item = clearedList[i];
      for (const [dc, dr] of dirs) {
        const nc = item.col + dc;
        const nr = item.row + dr;
        if (nc >= 0 && nc < COLS && nr >= 0 && nr < TOTAL_ROWS) {
          const neighbor = this.grid[nr][nc];
          if (neighbor?.isOjama) {
            const key = `${nc},${nr}`;
            if (!ojamaKeys.has(key)) {
              ojamaKeys.add(key);
              ojamaCount++;
              clearedList.push({ col: nc, row: nr, color: 0, isOjama: true });
            }
          }
        }
      }
    }

    const chainPower =
      CHAIN_POWER_TABLE[Math.min(this.chain, CHAIN_POWER_TABLE.length - 1)];
    const colorBonus =
      COLOR_BONUS_TABLE[Math.min(distinctColors.size, COLOR_BONUS_TABLE.length - 1)];
    const multiplier = Math.min(999, Math.max(1, chainPower + colorBonus + groupBonus));
    const stepScore = 10 * regularClearedCount * multiplier + ojamaCount * 40;

    // Charge Spirit Gauge (0..100%)
    const rawSpiritGain =
      14 +
      Math.max(0, regularClearedCount - 4) * 2.5 +
      (this.chain - 1) * 14 +
      ojamaCount * 3;
    this.addSpirit(this.inSpellCascade ? rawSpiritGain * 0.34 : rawSpiritGain);

    // Precompute Boss damage to launch when puyos pop at end of clearing flash
    if (this.mode === 'boss' && this.boss && this.boss.defeatTimer <= 0) {
      const chainScale =
        this.chain === 1
          ? 1.0
          : this.chain === 2
            ? 2.4
            : this.chain === 3
              ? 4.6
              : this.chain === 4
                ? 7.8
                : 7.8 + (this.chain - 4) * 3.8;
      const sizeFactor =
        1 +
        Math.max(0, regularClearedCount - 4) * 0.16 +
        Math.max(0, distinctColors.size - 1) * 0.35;
      this.pendingChainStepDamage = Math.round(
        regularClearedCount * 32 * chainScale * sizeFactor + ojamaCount * 15,
      );
    } else {
      this.pendingChainStepDamage = 0;
    }

    this.score += stepScore;
    this.totalCleared += regularClearedCount + ojamaCount;
    this.clearingCells = clearedList;
    this.clearTimer = 0;
    this.clearDuration = this.chain >= 3 ? 470 : this.chain === 2 ? 430 : 385;
    this.chainExcitement = 1;
    this.phase = 'clearing';

    // Centroid popup
    const avgX = Math.max(1.1, Math.min(COLS - 1.1, sumCol / regularClearedCount));
    const avgY = Math.max(1.2, Math.min(10.5, sumRow / regularClearedCount));
    const primaryColor = PUYO_THEMES[clearedList[0].color].light;

    this.floatingTexts.push({
      x: avgX,
      y: avgY,
      text: this.chain > 1 ? `${this.chain} CHAIN!` : `+${stepScore}`,
      subText: this.chain > 1 ? `+${stepScore}` : undefined,
      color: this.chain >= 4 ? '#ffe36e' : primaryColor,
      life: 0,
      maxLife: 1150,
      scale: Math.min(1.48, 0.98 + this.chain * 0.1),
    });

    // Touhou Spell Card Cut-in for 2+ chains
    const spell = getSpellCardForChain(this.chain);
    if (spell) {
      this.spellBanner = {
        chain: this.chain,
        title: spell.title,
        caster: spell.caster,
        primaryColor: spell.primaryColor,
        secondaryColor: spell.secondaryColor,
        motif: spell.motif,
        timer: 0,
        duration: 1550,
      };
      this.spellFlash = Math.min(1, 0.55 + this.chain * 0.1);
      this.shakeTime = 240 + Math.min(this.chain, 6) * 35;
      this.shakeMagnitude = Math.min(8, 2.2 + this.chain * 1.1);
      this.audio.playSpellCard(this.chain);
      for (let i = 0; i < 2; i++) {
        this.particles.push({
          x: COLS * 0.5,
          y: 3.1,
          vx: 0,
          vy: 0,
          size: 0.4 + i * 0.35,
          color: i === 0 ? spell.secondaryColor : spell.primaryColor,
          alpha: 0.9,
          life: 0,
          maxLife: 420 + i * 140,
          shape: 'ring',
          rotation: 0,
          vRot: 0,
        });
      }
    }

    this.audio.playChain(this.chain);
    this.notifyScore();
  }

  private finishClearingPhase(): void {
    let hadOjama = false;

    // Launch glowing Danmaku orbs into the Boss right as the puyos pop!
    if (this.pendingChainStepDamage > 0 && this.clearingCells.length > 0) {
      this.launchClearDanmaku(this.clearingCells, this.pendingChainStepDamage);
      this.pendingChainStepDamage = 0;
    }

    // Burst juicy particles & clear grid cells
    for (const item of this.clearingCells) {
      const cx = item.col + 0.5;
      const cy = item.row - HIDDEN_ROWS + 0.5;

      if (item.isOjama) {
        hadOjama = true;
        this.spawnOjamaShatterParticles(cx, cy);
      } else {
        const theme = PUYO_THEMES[item.color];
        // Expanding halo ring
        this.particles.push({
          x: cx,
          y: cy,
          vx: 0,
          vy: 0,
          size: 0.35,
          color: theme.light,
          alpha: 0.95,
          life: 0,
          maxLife: 320,
          shape: 'ring',
          rotation: 0,
          vRot: 0,
        });

        const count = 9 + Math.min(this.chain * 2, 8);
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
          const speed = 0.0022 + Math.random() * 0.0046;
          const shapes: Particle['shape'][] = ['dot', 'star', 'diamond'];
          this.particles.push({
            x: cx + (Math.random() - 0.5) * 0.2,
            y: cy + (Math.random() - 0.5) * 0.2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 0.0016,
            size: 0.1 + Math.random() * 0.14,
            color: i % 3 === 0 ? '#ffffff' : theme.particle,
            alpha: 1,
            life: 0,
            maxLife: 380 + Math.random() * 280,
            shape: shapes[i % shapes.length],
            rotation: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 0.014,
          });
        }
      }

      this.grid[item.row][item.col] = null;
    }

    if (hadOjama) {
      this.audio.playOjamaShatter();
    }

    this.clearingCells = [];
    this.checkAllClearBonus();
    this.startGravityDrop(false);
  }

  private checkAllClearBonus(): void {
    if (!this.isBoardCompletelyEmpty()) return;

    this.allClears += 1;
    this.score += 2100;
    this.audio.playAllClear();
    this.spellBanner = {
      chain: Math.max(this.chain, 1),
      tag: 'ALL CLEAR +2100',
      title: '全消「博丽神社大净化!!」',
      caster: '博丽大结界',
      primaryColor: '#f5b82e',
      secondaryColor: '#fff7c2',
      motif: 'yinyang',
      timer: 0,
      duration: 1900,
    };
    this.spellFlash = 0.85;
    this.floatingTexts.push({
      x: COLS / 2,
      y: 5.2,
      text: 'ALL CLEAR!',
      subText: '+2100 BONUS',
      color: '#ffe875',
      life: 0,
      maxLife: 1500,
      scale: 1.32,
    });
    this.spawnAllClearFireworks();

    if (this.mode === 'boss' && this.boss && this.boss.defeatTimer <= 0) {
      this.launchSpellDanmaku(
        [
          { col: 1, row: 6, color: '#ffe36e' },
          { col: 2, row: 5, color: '#ff7084' },
          { col: 3, row: 5, color: '#7de4ff' },
          { col: 4, row: 6, color: '#d099ff' },
        ],
        600,
        '#ffe36e',
        '#ffffff',
      );
    }

    this.notifyScore();
  }

  private isBoardCompletelyEmpty(): boolean {
    for (let r = 0; r < TOTAL_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.grid[r][c] !== null) return false;
      }
    }
    return true;
  }

  private spawnAllClearFireworks(): void {
    const colors = ['#ff7084', '#7de4ff', '#ffe36e', '#79f0aa', '#d099ff'];
    for (let i = 0; i < 36; i++) {
      const angle = (Math.PI * 2 * i) / 36;
      const speed = 0.0025 + Math.random() * 0.0045;
      this.particles.push({
        x: COLS / 2,
        y: 6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.001,
        size: 0.14 + Math.random() * 0.14,
        color: colors[i % colors.length],
        alpha: 1,
        life: 0,
        maxLife: 650 + Math.random() * 350,
        shape: i % 2 === 0 ? 'star' : 'diamond',
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.015,
      });
    }
  }

  // ==================== MAIN TICK ====================

  public update(dtMs: number): void {
    const dt = Math.min(dtMs, 50); // Clamp dt to prevent tab-switch jumps
    this.elapsedMs += dt;

    if (this.paused) return;

    this.updateVisualEffects(dt);

    if (this.phase === 'menu' || this.phase === 'gameover') {
      return;
    }

    // Update Boss battle timers & Danmaku orbs
    if (this.mode === 'boss' && this.boss) {
      this.updateBossState(dt);
    }

    // Update elastic damped-spring squish animations on settled grid cells
    for (let r = 0; r < TOTAL_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = this.grid[r][c];
        if (cell && cell.squish > 0.001) {
          cell.squishPhase += dt * cell.squishFreq;
          cell.squish *= Math.exp(-dt * 0.0095);
          if (cell.squish < 0.008) cell.squish = 0;
        }
      }
    }

    // Allow subtle DAS pre-charging while holding left/right during cascade/clear
    if (
      this.dasDir !== 0 &&
      (this.phase === 'dropping' || this.phase === 'clearing' || this.phase === 'spell')
    ) {
      this.dasTimer = Math.min(DAS_MS, this.dasTimer + dt * 0.75);
    }

    if (this.phase === 'falling') {
      this.updateFallingPhase(dt);
    } else if (this.phase === 'dropping') {
      this.updateDroppingPhase(dt);
    } else if (this.phase === 'clearing') {
      this.clearTimer += dt;
      if (this.clearTimer >= this.clearDuration) {
        this.finishClearingPhase();
      }
    } else if (this.phase === 'spell') {
      this.spellPhaseTimer += dt;
      if (
        this.activeSpellVfx &&
        !this.activeSpellVfx.impactApplied &&
        this.spellPhaseTimer >= this.activeSpellVfx.impactMs
      ) {
        this.applyActiveSpellImpact();
      }
      if (this.spellPhaseTimer >= this.spellPhaseEndMs) {
        if (this.activeSpellVfx && !this.activeSpellVfx.impactApplied) {
          this.applyActiveSpellImpact();
        }
        this.startGravityDrop(false);
      }
    }
  }

  private updateBossState(dt: number): void {
    const boss = this.boss;
    if (!boss) return;

    // Smooth lagging HP drain bar
    if (boss.displayHp > boss.hp) {
      const diff = boss.displayHp - boss.hp;
      boss.displayHp = Math.max(boss.hp, boss.displayHp - Math.max(diff * dt * 0.008, dt * 0.45));
    } else {
      boss.displayHp = boss.hp;
    }

    if (boss.hitFlash > 0) {
      boss.hitFlash = Math.max(0, boss.hitFlash - dt / 260);
    }
    if (boss.attackFlash > 0) {
      boss.attackFlash = Math.max(0, boss.attackFlash - dt / 420);
    }
    if (boss.enterTimer > 0) {
      boss.enterTimer = Math.max(0, boss.enterTimer - dt);
    }

    // Advance flying Danmaku orbs
    if (this.danmakuOrbs.length > 0) {
      const activeOrbs: DanmakuOrb[] = [];
      for (const orb of this.danmakuOrbs) {
        orb.progress += dt / orb.duration;
        if (orb.progress >= 1) {
          this.applyBossDamage(orb.damage, orb.color);
          continue;
        }
        if (orb.progress >= 0) {
          const t = orb.progress;
          const omt = 1 - t;
          const x = omt * omt * orb.startX + 2 * omt * t * orb.ctrlX + t * t * orb.targetX;
          const y = omt * omt * orb.startY + 2 * omt * t * orb.ctrlY + t * t * orb.targetY;
          orb.trail.push({ x, y });
          if (orb.trail.length > 7) {
            orb.trail.shift();
          }
        }
        activeOrbs.push(orb);
      }
      this.danmakuOrbs = activeOrbs;
    }

    // Handle defeat celebration & next stage transition
    if (boss.defeatTimer > 0) {
      boss.defeatTimer = Math.max(0, boss.defeatTimer - dt);
      if (boss.defeatTimer <= 0) {
        this.boss = this.createBossForStage(boss.stage + 1);
        this.notifyScore();
      }
      return;
    }

    // Attack countdown (slowed slightly during active chains, paused during cast/enter)
    if (boss.enterTimer <= 0 && boss.pendingOjama === 0) {
      const rate =
        this.phase === 'spell'
          ? 0
          : this.phase === 'clearing' || this.phase === 'dropping' || this.chain > 0
            ? 0.35
            : 1.0;
      boss.attackTimer = Math.max(0, boss.attackTimer - dt * rate);
      if (boss.attackTimer <= 0) {
        this.armBossOjamaAttack();
      }
    }
  }

  private updateFallingPhase(dt: number): void {
    const p = this.activePair;
    if (!p) return;

    // Horizontal DAS / ARR repeat
    if (this.dasDir !== 0) {
      this.dasTimer += dt;
      if (this.dasTimer >= DAS_MS) {
        this.arrTimer += dt;
        while (this.arrTimer >= ARR_MS) {
          this.arrTimer -= ARR_MS;
          if (!this.tryMoveHorizontal(this.dasDir)) {
            break;
          }
        }
      }
    }

    // Vertical gravity / authentic ~380ms lock delay
    const blocked = this.isPairBlockedBelow(p.pivotCol, p.pivotRow, p.rot);
    if (blocked) {
      p.fallFrac = 0;
      if (!p.wasGrounded) {
        p.wasGrounded = true;
        p.touchSquish = 0.62;
        p.touchSquishPhase = 0;
      }
      if (this.heldDown) {
        p.softDropGroundMs += dt;
        if (p.softDropGroundMs >= SOFT_DROP_LOCK_MS) {
          this.lockActivePair(false);
          return;
        }
      } else {
        p.softDropGroundMs = 0;
      }
      p.lockTimer += dt;
      if (p.lockTimer >= LOCK_DELAY_MS) {
        this.lockActivePair(false);
        return;
      }
    } else {
      p.wasGrounded = false;
      p.lockTimer = 0;
      p.softDropGroundMs = 0;
      const gravityMs = this.getGravityMs();
      const effectiveCellMs = this.heldDown
        ? Math.min(gravityMs, SOFT_DROP_CELL_MS)
        : gravityMs;

      p.fallFrac += dt / effectiveCellMs;
      while (p.fallFrac >= 1) {
        if (this.isPairBlockedBelow(p.pivotCol, p.pivotRow, p.rot)) {
          p.fallFrac = 0;
          break;
        }
        p.pivotRow += 1;
        p.fallFrac -= 1;
        if (this.heldDown) {
          this.score += 1;
          this.notifyScore();
        }
        if (this.isPairBlockedBelow(p.pivotCol, p.pivotRow, p.rot)) {
          p.fallFrac = 0;
          break;
        }
      }
    }

    // Silky 60/120Hz exponential interpolation for column, continuous row, and circular arc rotation
    const colAlpha = 1 - Math.exp(-dt * 0.026);
    p.renderCol += (p.pivotCol - p.renderCol) * colAlpha;
    if (Math.abs(p.pivotCol - p.renderCol) < 0.002) {
      p.renderCol = p.pivotCol;
    }

    const targetRow = p.pivotRow + p.fallFrac;
    const rowDiff = targetRow - p.renderRow;
    if (Math.abs(rowDiff) > 0.001) {
      const rowRate = rowDiff < 0 ? 0.024 : 0.034;
      p.renderRow += rowDiff * (1 - Math.exp(-dt * rowRate));
      if (Math.abs(targetRow - p.renderRow) < 0.002) {
        p.renderRow = targetRow;
      }
    } else {
      p.renderRow = targetRow;
    }

    const angleAlpha = 1 - Math.exp(-dt * 0.029);
    p.renderAngle += (p.targetAngle - p.renderAngle) * angleAlpha;
    if (Math.abs(p.targetAngle - p.renderAngle) < 0.003) {
      p.renderAngle = p.targetAngle;
      const twoPi = Math.PI * 2;
      if (Math.abs(p.targetAngle) > twoPi * 4) {
        const turns = Math.trunc(p.targetAngle / twoPi) * twoPi;
        p.targetAngle -= turns;
        p.renderAngle -= turns;
      }
    }

    p.bumpOffsetX *= Math.exp(-dt * 0.018);
    if (Math.abs(p.bumpOffsetX) < 0.002) p.bumpOffsetX = 0;

    if (p.touchSquish > 0.005) {
      p.touchSquishPhase += dt * 0.027;
      p.touchSquish *= Math.exp(-dt * 0.012);
      if (p.touchSquish < 0.008) p.touchSquish = 0;
    }

    if (p.quickTurnTimer > 0) {
      p.quickTurnTimer = Math.max(0, p.quickTurnTimer - dt);
    }
  }

  private updateDroppingPhase(dt: number): void {
    const stillFalling: FallingPuyo[] = [];
    let landedAny = false;

    for (const f of this.fallingPuyos) {
      f.vy = Math.min(0.048, f.vy + 0.00011 * dt);
      f.y += f.vy * dt;
      if (f.y >= f.targetRow) {
        this.grid[f.targetRow][f.col] = {
          color: f.color,
          isOjama: f.isOjama,
          squish: 0,
          squishPhase: 0,
          squishFreq: 0.026,
        };
        const impactEnergy = Math.min(1.32, 0.72 + f.vy * 14);
        this.triggerCellSquish(f.col, f.targetRow, impactEnergy);
        if (f.targetRow - f.startRow >= 2) {
          this.spawnLandingDust(f.col, f.targetRow, f.color, 3, Boolean(f.isOjama));
        }
        landedAny = true;
      } else {
        stillFalling.push(f);
      }
    }

    this.fallingPuyos = stillFalling;
    if (landedAny) {
      this.playLandDebounced();
    }

    if (this.fallingPuyos.length === 0) {
      if (this.hasFloatingGridCells()) {
        this.startGravityDrop(false);
        return;
      }
      this.checkChainsAndResolve();
    }
  }

  private updateVisualEffects(dt: number): void {
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - dt);
    }

    if (this.chainExcitement > 0) {
      this.chainExcitement = Math.max(0, this.chainExcitement - dt / 1200);
    }

    if (this.spellFlash > 0) {
      this.spellFlash = Math.max(0, this.spellFlash - dt / 340);
    }

    if (this.spellBanner) {
      this.spellBanner.timer += dt;
      if (this.spellBanner.timer >= this.spellBanner.duration) {
        this.spellBanner = null;
      }
    }

    if (this.activeSpellVfx) {
      this.activeSpellVfx.timer += dt;
      if (this.activeSpellVfx.timer >= this.activeSpellVfx.duration) {
        this.activeSpellVfx = null;
      }
    }

    if (this.bossBonusBanner) {
      this.bossBonusBanner.timer += dt;
      if (this.bossBonusBanner.timer >= this.bossBonusBanner.duration) {
        this.bossBonusBanner = null;
      }
    }

    // Particles
    const nextParticles: Particle[] = [];
    for (const pt of this.particles) {
      pt.life += dt;
      if (pt.life >= pt.maxLife) continue;
      if (pt.shape === 'ring') {
        pt.size += dt * 0.0032;
      } else {
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vy += 0.000012 * dt;
        pt.rotation += pt.vRot * dt;
      }
      pt.alpha = 1 - pt.life / pt.maxLife;
      nextParticles.push(pt);
    }
    this.particles = nextParticles;

    // Floating texts
    const nextTexts: FloatingText[] = [];
    for (const ft of this.floatingTexts) {
      ft.life += dt;
      if (ft.life >= ft.maxLife) continue;
      ft.y -= dt * 0.0011;
      nextTexts.push(ft);
    }
    this.floatingTexts = nextTexts;

    // Drop trails
    const nextTrails: DropTrail[] = [];
    for (const tr of this.dropTrails) {
      tr.life += dt;
      if (tr.life < tr.maxLife) {
        nextTrails.push(tr);
      }
    }
    this.dropTrails = nextTrails;
  }
}
