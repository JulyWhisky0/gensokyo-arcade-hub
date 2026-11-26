import { PuyoAudio } from './audio';
import {
  ActivePair,
  COLS,
  ClearingCell,
  DEATH_COL,
  DEATH_ROW,
  DIFFICULTIES,
  DifficultyId,
  DropTrail,
  FallingPuyo,
  FloatingText,
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
  private generatedPairsCount = 0;
  private lastLandSoundTime = -1000;

  private readonly audio: PuyoAudio;
  private readonly callbacks: EngineCallbacks;

  constructor(audio: PuyoAudio, callbacks: EngineCallbacks) {
    this.audio = audio;
    this.callbacks = callbacks;
    this.bestScore = callbacks.getBestScore();
    this.resetGrid();
    this.refillQueue();
  }

  private resetGrid(): void {
    this.grid = Array.from({ length: TOTAL_ROWS }, () =>
      Array.from({ length: COLS }, () => null),
    );
  }

  private getConfig() {
    return DIFFICULTIES[this.difficulty];
  }

  private getExtraString(): string {
    return `最高 ${this.maxChain} 连锁`;
  }

  private getFullExtraString(): string {
    const label = this.getConfig().shortLabel.split(' · ')[0];
    return `最高 ${this.maxChain} 连锁 · ${label}`;
  }

  public getSnapshot(): HudSnapshot {
    return {
      phase: this.phase,
      score: this.score,
      bestScore: this.bestScore,
      chain: this.chain,
      maxChain: this.maxChain,
      speedLevel: this.speedLevel,
      totalCleared: this.totalCleared,
      allClears: this.allClears,
      difficulty: this.difficulty,
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

  public setDifficulty(diff: DifficultyId): void {
    this.difficulty = diff;
    if (this.phase === 'menu') {
      this.queue = [];
      this.generatedPairsCount = 0;
      this.refillQueue();
      this.notifyHud();
    }
  }

  public openMenu(): void {
    this.paused = false;
    this.phase = 'menu';
    this.activePair = null;
    this.fallingPuyos = [];
    this.clearingCells = [];
    this.spellBanner = null;
    this.clearHeldInputs();
    this.resetGrid();
    this.queue = [];
    this.generatedPairsCount = 0;
    this.refillQueue();
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
    this.activePair = null;
    this.fallingPuyos = [];
    this.clearingCells = [];
    this.particles = [];
    this.floatingTexts = [];
    this.dropTrails = [];
    this.spellBanner = null;
    this.shakeTime = 0;
    this.dangerRatio = 0;
    this.chainExcitement = 0;
    this.spellFlash = 0;
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
      // Child above pivot -> only pivot is bottom
      return !this.isEmpty(pivotCol, pivotRow + 1);
    }
    if (rot === 2) {
      // Child below pivot -> only child is bottom
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
    this.refillQueue();
    const next = this.queue.shift()!;
    this.refillQueue();

    // Check death cell before spawning
    if (this.grid[DEATH_ROW][DEATH_COL] !== null) {
      this.triggerGameOver();
      return;
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
      } else if ((this.phase === 'dropping' || this.phase === 'clearing') && !this.paused) {
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
      } else if ((this.phase === 'dropping' || this.phase === 'clearing') && !this.paused) {
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
      if (this.phase === 'dropping' || this.phase === 'clearing') {
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
      if (this.phase === 'dropping' || this.phase === 'clearing') {
        this.bufferedRotate = dir;
        this.bufferedRotateUntil = this.elapsedMs + INPUT_BUFFER_MS;
      }
      return false;
    }
    this.audio.unlock();
    const p = this.activePair;
    const newRot = (((p.rot + dir) % 4) + 4) % 4 as RotationIndex;

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
    // Shortest directional arc around pivot (normalized so cumulative angle stays bounded)
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

  private spawnLandingDust(col: number, row: number, color: PuyoColor, count: number): void {
    if (row < HIDDEN_ROWS) return;
    const theme = PUYO_THEMES[color];
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
        color: i === 0 ? '#ffffff' : theme.light,
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
      // Child directly above pivot
      const pivotLand = dropRowForCol(p.pivotCol, p.pivotRow);
      const childLand = Math.max(0, pivotLand - 1);
      return [
        { col: p.pivotCol, row: pivotLand, color: p.pivotColor },
        { col: cx, row: childLand, color: p.childColor },
      ];
    }
    if (p.rot === 2) {
      // Child directly below pivot
      const childLand = dropRowForCol(cx, cy);
      const pivotLand = Math.max(0, childLand - 1);
      return [
        { col: p.pivotCol, row: pivotLand, color: p.pivotColor },
        { col: cx, row: childLand, color: p.childColor },
      ];
    }

    // Horizontal pair: each puyo falls independently in its column
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

    // Flood-fill visible rows (HIDDEN_ROWS .. TOTAL_ROWS - 1) for groups >= 4
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
        if (!cell) continue;

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
              if (neighbor && neighbor.color === targetColor) {
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
      // Settled cleanly — verify death cell (col 2, top visible row)
      if (this.grid[DEATH_ROW][DEATH_COL] !== null) {
        this.triggerGameOver();
        return;
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

    const clearedCount = clearedList.length;
    const chainPower =
      CHAIN_POWER_TABLE[Math.min(this.chain, CHAIN_POWER_TABLE.length - 1)];
    const colorBonus =
      COLOR_BONUS_TABLE[Math.min(distinctColors.size, COLOR_BONUS_TABLE.length - 1)];
    const multiplier = Math.min(999, Math.max(1, chainPower + colorBonus + groupBonus));
    const stepScore = 10 * clearedCount * multiplier;

    this.score += stepScore;
    this.totalCleared += clearedCount;
    this.clearingCells = clearedList;
    this.clearTimer = 0;
    this.clearDuration = this.chain >= 3 ? 470 : this.chain === 2 ? 430 : 385;
    this.chainExcitement = 1;
    this.phase = 'clearing';

    // Centroid popup
    const avgX = Math.max(1.1, Math.min(COLS - 1.1, sumCol / clearedCount));
    const avgY = Math.max(1.2, Math.min(10.5, sumRow / clearedCount));
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
      // Sparkling burst rings radiating from Spell Card emblem!
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
    // Burst juicy particles & clear grid cells
    for (const item of this.clearingCells) {
      const theme = PUYO_THEMES[item.color];
      const cx = item.col + 0.5;
      const cy = item.row - HIDDEN_ROWS + 0.5;

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

      this.grid[item.row][item.col] = null;
    }

    this.clearingCells = [];

    // Check All Clear (全消)!
    if (this.isBoardCompletelyEmpty()) {
      this.allClears += 1;
      this.score += 2100;
      this.audio.playAllClear();
      this.spellBanner = {
        chain: Math.max(this.chain, 1),
        title: '全消「博丽神社大净化!!」',
        caster: 'ALL CLEAR +2100',
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
      this.notifyScore();
    }

    this.startGravityDrop(false);
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
    if (this.dasDir !== 0 && (this.phase === 'dropping' || this.phase === 'clearing')) {
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
        // Sustained soft drop skips remaining lock delay crisply
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
      // Slightly faster snap when falling smoothly, plush glide on floor/ceiling kicks & spawn
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
      // Keep canonical angles compact once settled
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
      // Smooth ease-in gravity acceleration for juicy cascade falls
      f.vy = Math.min(0.048, f.vy + 0.00011 * dt);
      f.y += f.vy * dt;
      if (f.y >= f.targetRow) {
        this.grid[f.targetRow][f.col] = {
          color: f.color,
          squish: 0,
          squishPhase: 0,
          squishFreq: 0.026,
        };
        const impactEnergy = Math.min(1.32, 0.72 + f.vy * 14);
        this.triggerCellSquish(f.col, f.targetRow, impactEnergy);
        if (f.targetRow - f.startRow >= 2) {
          this.spawnLandingDust(f.col, f.targetRow, f.color, 3);
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
