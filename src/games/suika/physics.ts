import {
  BOARD_WIDTH,
  DANGER_GRACE_SECONDS,
  DANGER_Y,
  DOUBLE_SUIKA_BONUS,
  FLOOR_Y,
  INNER_LEFT,
  INNER_RIGHT,
  MAX_TIER,
  ORB_TIERS,
  SPAWN_Y,
  SUIKA_SHRINK_DURATION,
  SUIKA_SHRINK_SCALE,
} from './tiers';

export interface OrbBody {
  id: number;
  tier: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  omega: number;
  baseRadius: number;
  radius: number;
  mass: number;
  invMass: number;
  invInertia: number;
  age: number;
  hasTouched: boolean;
  mergeCooldown: number;
  /** 0..1 progress for elastic merge/spawn pop-in spring (1 = settled) */
  spawnProgress: number;
  isMergeBorn: boolean;
  /** Soft springy plush squash-and-stretch impulse on impacts (decays to 0) */
  impactSquash: number;
  flashTimer: number;
  inDanger: boolean;
  /** Resting sleep state to guarantee zero micro-jitter in settled stacks */
  restTime: number;
  sleeping: boolean;
  /** True while targeted & being sealed by Reimu's homing ofuda */
  sealed: boolean;
  /** True while gliding straight down to a frozen placement during Sakuya's Time Stop */
  timeStopDrop: boolean;
  timeStopTargetY: number;
  /** Lightweight Fumo idle blink timers */
  blinkTimer: number;
  blinkDuration: number;
}

export interface MergeEvent {
  x: number;
  y: number;
  oldTier: number;
  newTier: number;
  isDoubleSuika: boolean;
  points: number;
  combo: number;
}

export interface PhysicsUpdateOptions {
  timeStopActive?: boolean;
  pauseSimulation?: boolean;
}

export interface PhysicsStepResult {
  merges: MergeEvent[];
  strongestBounce: number;
  dangerTriggered: boolean;
  dangerWarningTick: number | null;
  /** 0..1 proximity alert when settled orbs get close to DANGER_Y even before crossing */
  nearDangerFactor: number;
  /** Orbs that just snapped into place during Sakuya's Time Stop */
  timeStopLanded: OrbBody[];
}

const FIXED_DT = 1 / 120;
const GRAVITY = 1360;
const POSITION_ITERATIONS = 8;
const SLOP = 0.14;
const CORRECTION_PERCENT = 0.78;
const LINEAR_DAMPING = 0.9982;
const ANGULAR_DAMPING = 0.992;
const RESTITUTION_WALL = 0.24;
const RESTITUTION_BALL = 0.19;
const BOUNCE_THRESHOLD = 62;
const FRICTION_WALL = 0.34;
const FRICTION_BALL = 0.28;
const MAX_SPEED = 1180;
const MAX_OMEGA = 10;
const COMBO_WINDOW = 1.25;

// Sleep thresholds for crisp zero-jitter resting stacks
const SLEEP_SPEED_SQ = 18 * 18;
const SLEEP_OMEGA = 0.22;
const SLEEP_DELAY = 0.16;
const WAKE_IMPACT = 22;

const WARNING_MILESTONES = [1.0, 1.6, 2.1];

export class SuikaPhysics {
  public orbs: OrbBody[] = [];
  public dangerTimer = 0;
  public comboCount = 0;
  public comboTimer = 0;
  public maxCombo = 0;
  public totalMerges = 0;
  public suikaShrinkTimer = 0;

  private nextId = 1;
  private accumulator = 0;
  private lastWarningMilestone = -1;

  reset(): void {
    this.orbs = [];
    this.dangerTimer = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;
    this.totalMerges = 0;
    this.suikaShrinkTimer = 0;
    this.nextId = 1;
    this.accumulator = 0;
    this.lastWarningMilestone = -1;
  }

  getCurrentRadiusScale(): number {
    if (this.suikaShrinkTimer <= 0) return 1;
    const elapsed = SUIKA_SHRINK_DURATION - this.suikaShrinkTimer;
    if (elapsed < 0.22) {
      const t = elapsed / 0.22;
      return 1 - (1 - SUIKA_SHRINK_SCALE) * easeOutQuad(t);
    }
    if (this.suikaShrinkTimer < 0.65) {
      const t = 1 - this.suikaShrinkTimer / 0.65;
      return SUIKA_SHRINK_SCALE + (1 - SUIKA_SHRINK_SCALE) * easeInOutQuad(t);
    }
    return SUIKA_SHRINK_SCALE;
  }

  clampDropX(x: number, tier: number): number {
    const r = ORB_TIERS[tier].radius * this.getCurrentRadiusScale();
    const margin = r + 3;
    return Math.max(INNER_LEFT + margin, Math.min(INNER_RIGHT - margin, x));
  }

  spawnDroppedOrb(x: number, tier: number): OrbBody {
    const clampedX = this.clampDropX(x, tier);
    const orb = this.createOrb(tier, clampedX, SPAWN_Y);
    orb.vx = (Math.random() - 0.5) * 5;
    orb.vy = 32;
    orb.omega = (Math.random() - 0.5) * 0.35;
    orb.hasTouched = false;
    orb.spawnProgress = 1;
    orb.isMergeBorn = false;
    orb.impactSquash = 0.22;
    this.orbs.push(orb);
    return orb;
  }

  /**
   * Spawns a crisp fast-dropping orb during Sakuya's Time Stop that glides straight down
   * and freezes right at its predicted contact position, ready to chain-merge when time resumes!
   */
  spawnTimeStopOrb(x: number, tier: number): OrbBody {
    const clampedX = this.clampDropX(x, tier);
    const targetY = this.predictLandingY(clampedX, tier);
    const orb = this.createOrb(tier, clampedX, SPAWN_Y);
    orb.vx = 0;
    orb.vy = 140; // Downward latent momentum when time resumes
    orb.omega = 0;
    orb.hasTouched = false;
    orb.spawnProgress = 1;
    orb.isMergeBorn = false;
    orb.impactSquash = 0.2;
    orb.timeStopDrop = true;
    orb.timeStopTargetY = targetY;
    this.orbs.push(orb);
    return orb;
  }

  /** Releases all frozen orbs cleanly when Sakuya's Time Stop ends. */
  onTimeStopEnd(): void {
    for (let i = 0; i < this.orbs.length; i++) {
      const o = this.orbs[i];
      if (o.timeStopDrop) {
        o.timeStopDrop = false;
        o.hasTouched = true;
      }
      o.sleeping = false;
      o.restTime = 0;
    }
  }

  /**
   * Reimu's 灵符「梦想封印」: selects up to `maxCount` smallest unsealed orbs
   * (tie-breaking by highest elevation so troublesome upper small orbs vanish first).
   */
  selectSmallestForOfuda(maxCount: number): OrbBody[] {
    const candidates = this.orbs
      .filter((o) => !o.sealed)
      .sort((a, b) => (a.tier !== b.tier ? a.tier - b.tier : a.y - b.y));
    const chosen = candidates.slice(0, maxCount);
    for (const o of chosen) {
      o.sealed = true;
      o.mergeCooldown = 6;
      o.inDanger = false;
    }
    return chosen;
  }

  removeOrbById(id: number): OrbBody | null {
    const idx = this.orbs.findIndex((o) => o.id === id);
    if (idx < 0) return null;
    const [removed] = this.orbs.splice(idx, 1);
    this.wakeAllOrbs();
    return removed;
  }

  /** Hit-tests an orb for Yukari's 境符「隙间穿梭」 target-pick mode. */
  findOrbAtPoint(bx: number, by: number): OrbBody | null {
    let best: OrbBody | null = null;
    let bestScore = Infinity;
    for (let i = 0; i < this.orbs.length; i++) {
      const o = this.orbs[i];
      if (o.sealed) continue;
      const dx = bx - o.x;
      const dy = by - o.y;
      const dist = Math.hypot(dx, dy);
      const hitR = o.radius + 8;
      if (dist <= hitR) {
        // Prefer direct inner hits & closer centers
        const score = dist / Math.max(12, o.radius);
        if (score < bestScore) {
          bestScore = score;
          best = o;
        }
      }
    }
    return best;
  }

  /** Swaps an orb in the box to a new tier via Yukari's Gap portal. */
  swapOrbTier(orbId: number, newTier: number): { orb: OrbBody; oldTier: number } | null {
    const orb = this.orbs.find((o) => o.id === orbId && !o.sealed);
    if (!orb) return null;

    const oldTier = orb.tier;
    const def = ORB_TIERS[newTier];
    const scale = this.getCurrentRadiusScale();
    const r = def.radius * scale;
    const mass = (def.radius * def.radius) / 256;
    const inertia = 0.5 * mass * def.radius * def.radius;

    orb.tier = newTier;
    orb.baseRadius = def.radius;
    orb.radius = r;
    orb.mass = mass;
    orb.invMass = 1 / mass;
    orb.invInertia = 1 / inertia;
    orb.x = clamp(orb.x, INNER_LEFT + r + 1, INNER_RIGHT - r - 1);
    orb.y = Math.min(FLOOR_Y - r, orb.y);
    orb.vx *= 0.25;
    orb.vy = Math.min(orb.vy * 0.25, -45);
    orb.mergeCooldown = 0;
    orb.spawnProgress = 0;
    orb.isMergeBorn = true;
    orb.flashTimer = 1;
    orb.impactSquash = 0.48;
    this.wakeAllOrbs();

    return { orb, oldTier };
  }

  /**
   * Suika's 鬼符「密与疏」: shakes the box with golden sake ripples,
   * shrinking orbs by 15% and giving a playful upward jolt so stuck same-tier orbs tumble & merge!
   */
  triggerSuikaShake(): void {
    this.suikaShrinkTimer = SUIKA_SHRINK_DURATION;
    for (let i = 0; i < this.orbs.length; i++) {
      const o = this.orbs[i];
      if (o.sealed) continue;
      const toCenter = (BOARD_WIDTH * 0.5 - o.x) * 0.52;
      const tierLift = 1 - o.tier * 0.032;
      o.sleeping = false;
      o.restTime = 0;
      o.vx += toCenter + (Math.random() - 0.5) * 160;
      o.vy = Math.min(o.vy, 0) - (175 + Math.random() * 95) * tierLift;
      o.omega += (Math.random() - 0.5) * 5.2;
      o.impactSquash = Math.max(o.impactSquash, 0.52);
      o.flashTimer = Math.max(o.flashTimer, 0.45);
    }
  }

  /**
   * Deathbomb 「决死结界」: eliminates offending upper-zone small/danger orbs
   * and resets dangerTimer to 0 for a thrilling Touhou last-second save!
   */
  executeDeathbombClear(): OrbBody[] {
    const offending = this.orbs
      .filter((o) => !o.sealed && (o.inDanger || o.y - o.radius < DANGER_Y + 34))
      .sort((a, b) => (a.tier !== b.tier ? a.tier - b.tier : a.y - b.y));

    const toRemove = new Map<number, OrbBody>();

    // First clear offending upper orbs (preferring tier <= 7, up to 5)
    for (const o of offending) {
      if (toRemove.size >= 5) break;
      if (o.tier <= 7) {
        toRemove.set(o.id, o);
      }
    }

    // If upper zone also still has small clutter (tier <= 4), clear up to 5 total to relieve pressure
    if (toRemove.size < 3) {
      const smalls = this.orbs
        .filter((o) => !o.sealed && !toRemove.has(o.id) && o.tier <= 5)
        .sort((a, b) => (a.y !== b.y ? a.y - b.y : a.tier - b.tier));
      for (const o of smalls) {
        if (toRemove.size >= 4) break;
        toRemove.set(o.id, o);
      }
    }

    // Fallback: if somehow every single danger orb was tier >= 8 and nothing was removed yet,
    // clear the highest offending orb so the player is guaranteed survival!
    if (toRemove.size === 0 && offending.length > 0) {
      toRemove.set(offending[0].id, offending[0]);
    }

    const removed = Array.from(toRemove.values());
    if (toRemove.size > 0) {
      this.orbs = this.orbs.filter((o) => !toRemove.has(o.id));
    }

    this.dangerTimer = 0;
    this.lastWarningMilestone = -1;
    for (let i = 0; i < this.orbs.length; i++) {
      const o = this.orbs[i];
      o.inDanger = false;
      o.sleeping = false;
      o.restTime = 0;
      o.vy = Math.max(o.vy, 35);
      o.flashTimer = Math.max(o.flashTimer, 0.5);
    }

    return removed;
  }

  private createOrb(tier: number, x: number, y: number): OrbBody {
    const def = ORB_TIERS[tier];
    const baseRadius = def.radius;
    const r = baseRadius * this.getCurrentRadiusScale();
    const mass = (baseRadius * baseRadius) / 256;
    const invMass = 1 / mass;
    const inertia = 0.5 * mass * baseRadius * baseRadius;
    const invInertia = 1 / inertia;

    return {
      id: this.nextId++,
      tier,
      x,
      y,
      vx: 0,
      vy: 0,
      angle: 0,
      omega: 0,
      baseRadius,
      radius: r,
      mass,
      invMass,
      invInertia,
      age: 0,
      hasTouched: false,
      mergeCooldown: 0,
      spawnProgress: 1,
      isMergeBorn: false,
      impactSquash: 0,
      flashTimer: 0,
      inDanger: false,
      restTime: 0,
      sleeping: false,
      sealed: false,
      timeStopDrop: false,
      timeStopTargetY: FLOOR_Y - r,
      blinkTimer: 1.8 + Math.random() * 4.4,
      blinkDuration: 0,
    };
  }

  /**
   * Predicts the vertical landing center Y for an orb dropped straight down from (dropX, SPAWN_Y).
   */
  predictLandingY(dropX: number, tier: number): number {
    const r = ORB_TIERS[tier].radius * this.getCurrentRadiusScale();
    let bestY = FLOOR_Y - r;

    for (let i = 0; i < this.orbs.length; i++) {
      const o = this.orbs[i];
      if (o.sealed) continue;
      const oy = o.timeStopDrop ? o.timeStopTargetY : o.y;
      const dx = dropX - o.x;
      const sumR = r + o.radius;
      const dxSq = dx * dx;
      if (dxSq < sumR * sumR) {
        const dy = Math.sqrt(sumR * sumR - dxSq);
        const hitY = oy - dy;
        if (hitY >= SPAWN_Y && hitY < bestY) {
          bestY = hitY;
        }
      }
    }
    return bestY;
  }

  update(frameDt: number, options: PhysicsUpdateOptions = {}): PhysicsStepResult {
    const clampedDt = Math.min(0.05, Math.max(0, frameDt));
    const timeStopActive = options.timeStopActive ?? false;
    const pauseSimulation = options.pauseSimulation ?? false;

    const merges: MergeEvent[] = [];
    const timeStopLanded: OrbBody[] = [];

    // Advance lightweight Fumo blinking even during pauses/time-stop? Only in normal play!
    if (pauseSimulation) {
      return {
        merges,
        strongestBounce: 0,
        dangerTriggered: false,
        dangerWarningTick: null,
        nearDangerFactor: this.computeNearDangerFactor().nearDangerFactor,
        timeStopLanded,
      };
    }

    if (timeStopActive) {
      // Sakuya's 「The World」: freeze all existing orbs & pause dangerTimer,
      // while letting newly dropped rapid orbs glide cleanly straight to their frozen landing spots!
      for (let i = 0; i < this.orbs.length; i++) {
        const o = this.orbs[i];
        if (o.flashTimer > 0) o.flashTimer = Math.max(0, o.flashTimer - clampedDt * 3.5);
        if (o.impactSquash > 0) o.impactSquash = Math.max(0, o.impactSquash - clampedDt * 4.2);

        if (o.timeStopDrop) {
          o.y += 1080 * clampedDt;
          if (o.y >= o.timeStopTargetY) {
            o.y = o.timeStopTargetY;
            o.timeStopDrop = false;
            o.hasTouched = true;
            o.impactSquash = 0.42;
            o.flashTimer = 0.72;
            timeStopLanded.push(o);
          }
        }
      }

      return {
        merges,
        strongestBounce: 0,
        dangerTriggered: false,
        dangerWarningTick: null,
        nearDangerFactor: this.computeNearDangerFactor().nearDangerFactor,
        timeStopLanded,
      };
    }

    // Advance Suika's 鬼符「密与疏」 shrink timer & sync radii
    if (this.suikaShrinkTimer > 0) {
      this.suikaShrinkTimer = Math.max(0, this.suikaShrinkTimer - clampedDt);
      const scale = this.getCurrentRadiusScale();
      for (let i = 0; i < this.orbs.length; i++) {
        this.orbs[i].radius = this.orbs[i].baseRadius * scale;
      }
      if (this.suikaShrinkTimer === 0) {
        this.wakeAllOrbs();
      }
    }

    // Fixed-timestep sub-stepping for rock-solid zero-tunneling physics
    const maxSubSteps = 8;
    this.accumulator = Math.min(this.accumulator + clampedDt, FIXED_DT * maxSubSteps);

    let strongestBounce = 0;
    let dangerTriggered = false;
    let dangerWarningTick: number | null = null;

    let subSteps = 0;
    while (this.accumulator >= FIXED_DT && subSteps < maxSubSteps) {
      this.accumulator -= FIXED_DT;
      subSteps++;
      const bounce = this.stepFixed(FIXED_DT, merges);
      if (bounce > strongestBounce) strongestBounce = bounce;
    }

    // Advance cute Fumo idle blinking on settled orbs
    for (let i = 0; i < this.orbs.length; i++) {
      const o = this.orbs[i];
      if (o.blinkDuration > 0) {
        o.blinkDuration = Math.max(0, o.blinkDuration - clampedDt);
      } else if (o.hasTouched && !o.inDanger && !o.sealed) {
        o.blinkTimer -= clampedDt;
        if (o.blinkTimer <= 0) {
          o.blinkDuration = 0.145;
          o.blinkTimer = 2.6 + Math.random() * 4.8;
        }
      }
    }

    // Evaluate danger line & proximity alert
    const { anyDanger, nearDangerFactor } = this.computeNearDangerFactor();

    if (anyDanger) {
      this.dangerTimer += clampedDt;
      for (let m = 0; m < WARNING_MILESTONES.length; m++) {
        if (this.dangerTimer >= WARNING_MILESTONES[m] && this.lastWarningMilestone < m) {
          this.lastWarningMilestone = m;
          dangerWarningTick = (m + 1) / WARNING_MILESTONES.length;
        }
      }
      if (this.dangerTimer >= DANGER_GRACE_SECONDS) {
        this.dangerTimer = DANGER_GRACE_SECONDS;
        dangerTriggered = true;
      }
    } else {
      this.dangerTimer = Math.max(0, this.dangerTimer - clampedDt * 2.2);
      if (this.dangerTimer < WARNING_MILESTONES[0] * 0.8) {
        this.lastWarningMilestone = -1;
      }
    }

    return {
      merges,
      strongestBounce,
      dangerTriggered,
      dangerWarningTick,
      nearDangerFactor,
      timeStopLanded,
    };
  }

  private computeNearDangerFactor(): { anyDanger: boolean; nearDangerFactor: number } {
    let anyDanger = false;
    let closestTopY = FLOOR_Y;
    for (let i = 0; i < this.orbs.length; i++) {
      const o = this.orbs[i];
      if (o.sealed || o.timeStopDrop) {
        o.inDanger = false;
        continue;
      }
      const eligible = (o.hasTouched && o.age > 0.65) || o.age > 1.8;
      if (eligible) {
        const topY = o.y - o.radius;
        if (topY < closestTopY) closestTopY = topY;
        if (topY < DANGER_Y - 1) {
          o.inDanger = true;
          anyDanger = true;
        } else {
          o.inDanger = false;
        }
      } else {
        o.inDanger = false;
      }
    }
    const nearDangerFactor = anyDanger
      ? 1
      : clamp(1 - (closestTopY - DANGER_Y) / 56, 0, 1);
    return { anyDanger, nearDangerFactor };
  }

  private wakeOrb(o: OrbBody): void {
    o.sleeping = false;
    o.restTime = 0;
  }

  private wakeAllOrbs(): void {
    for (let i = 0; i < this.orbs.length; i++) {
      this.orbs[i].sleeping = false;
      this.orbs[i].restTime = 0;
    }
  }

  private stepFixed(dt: number, outMerges: MergeEvent[]): number {
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboTimer = 0;
        this.comboCount = 0;
      }
    }

    const orbs = this.orbs;
    const count = orbs.length;
    let strongestBounce = 0;

    // 0. Verify sleeping orbs still have valid support (guarantees zero floating)
    for (let i = 0; i < count; i++) {
      const o = orbs[i];
      if (!o.sleeping) continue;
      if (o.y + o.radius >= FLOOR_Y - 1.5) continue;
      let hasSupport = false;
      for (let j = 0; j < count; j++) {
        if (i === j) continue;
        const other = orbs[j];
        if (other.y <= o.y + 1) continue;
        const dx = other.x - o.x;
        const dy = other.y - o.y;
        const maxD = o.radius + other.radius + 1.8;
        if (dx * dx + dy * dy <= maxD * maxD && dy / Math.max(1, maxD) > 0.25) {
          hasSupport = true;
          break;
        }
      }
      if (!hasSupport) {
        this.wakeOrb(o);
      }
    }

    // 1. Advance visual timers & integrate forces for awake orbs
    for (let i = 0; i < count; i++) {
      const o = orbs[i];
      o.age += dt;
      if (o.mergeCooldown > 0) o.mergeCooldown = Math.max(0, o.mergeCooldown - dt);
      if (o.spawnProgress < 1) o.spawnProgress = Math.min(1, o.spawnProgress + dt * 2.9);
      if (o.impactSquash > 0) o.impactSquash = Math.max(0, o.impactSquash - dt * 4.4);
      if (o.flashTimer > 0) o.flashTimer = Math.max(0, o.flashTimer - dt * 3.5);

      if (o.sleeping || o.sealed) continue;

      o.vy += GRAVITY * dt;
      o.vx *= LINEAR_DAMPING;
      o.vy *= LINEAR_DAMPING;
      o.omega *= ANGULAR_DAMPING;

      const speedSq = o.vx * o.vx + o.vy * o.vy;
      if (speedSq > MAX_SPEED * MAX_SPEED) {
        const scale = MAX_SPEED / Math.sqrt(speedSq);
        o.vx *= scale;
        o.vy *= scale;
      }
      if (o.omega > MAX_OMEGA) o.omega = MAX_OMEGA;
      else if (o.omega < -MAX_OMEGA) o.omega = -MAX_OMEGA;

      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.angle += o.omega * dt;
    }

    // 2. Wall & floor impulses + rolling friction
    for (let i = 0; i < count; i++) {
      const o = orbs[i];
      if (o.sleeping || o.sealed) continue;
      const r = o.radius;

      // Floor
      if (o.y + r > FLOOR_Y) {
        o.y = FLOOR_Y - r;
        o.hasTouched = true;
        if (o.vy > 0) {
          const impact = o.vy;
          if (impact > 130) {
            const norm = Math.min(1, (impact - 120) / 500);
            strongestBounce = Math.max(strongestBounce, norm);
            o.impactSquash = Math.max(o.impactSquash, Math.min(0.75, norm * 0.72));
          }
          const e = impact > BOUNCE_THRESHOLD ? RESTITUTION_WALL : 0;
          const jn = (1 + e) * impact * o.mass;
          o.vy = -impact * e;

          const vt = o.vx - o.omega * r;
          const maxJt = FRICTION_WALL * jn;
          const jt = clamp(-vt / (3 * o.invMass), -maxJt, maxJt);
          o.vx += jt * o.invMass;
          o.omega -= jt * r * o.invInertia;
        }
      }

      // Left wall
      if (o.x - r < INNER_LEFT) {
        o.x = INNER_LEFT + r;
        if (o.vx < 0) {
          const impact = -o.vx;
          if (impact > 150) {
            o.impactSquash = Math.max(o.impactSquash, Math.min(0.42, (impact - 130) / 700));
          }
          const e = impact > BOUNCE_THRESHOLD ? RESTITUTION_WALL : 0;
          const jn = (1 + e) * impact * o.mass;
          o.vx = impact * e;

          const vt = o.vy - o.omega * r;
          const maxJt = FRICTION_WALL * jn;
          const jt = clamp(-vt / (3 * o.invMass), -maxJt, maxJt);
          o.vy += jt * o.invMass;
          o.omega -= jt * r * o.invInertia;
        }
      }

      // Right wall
      if (o.x + r > INNER_RIGHT) {
        o.x = INNER_RIGHT - r;
        if (o.vx > 0) {
          const impact = o.vx;
          if (impact > 150) {
            o.impactSquash = Math.max(o.impactSquash, Math.min(0.42, (impact - 130) / 700));
          }
          const e = impact > BOUNCE_THRESHOLD ? RESTITUTION_WALL : 0;
          const jn = (1 + e) * impact * o.mass;
          o.vx = -impact * e;

          const vt = o.vy + o.omega * r;
          const maxJt = FRICTION_WALL * jn;
          const jt = clamp(-vt / (3 * o.invMass), -maxJt, maxJt);
          o.vy += jt * o.invMass;
          o.omega += jt * r * o.invInertia;
        }
      }
    }

    // 3. Circle-circle collision impulses & merge candidate gathering
    const mergeCandidates: Array<{ a: OrbBody; b: OrbBody; ratioSq: number }> = [];

    for (let i = 0; i < count; i++) {
      const a = orbs[i];
      if (a.sealed) continue;
      for (let j = i + 1; j < count; j++) {
        const b = orbs[j];
        if (b.sealed) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const minDist = a.radius + b.radius;
        const distSq = dx * dx + dy * dy;

        if (a.tier === b.tier && a.mergeCooldown <= 0 && b.mergeCooldown <= 0) {
          const mergeDist = minDist + 1.1;
          if (distSq <= mergeDist * mergeDist) {
            mergeCandidates.push({ a, b, ratioSq: distSq / (minDist * minDist) });
            continue;
          }
        }

        if (distSq >= minDist * minDist) continue;
        if (a.sleeping && b.sleeping) continue;

        a.hasTouched = true;
        b.hasTouched = true;

        let dist = Math.sqrt(distSq);
        let nx: number;
        let ny: number;
        if (dist < 1e-5) {
          nx = (a.id & 1) === 0 ? 1 : -1;
          ny = 0;
          dist = 0;
        } else {
          nx = dx / dist;
          ny = dy / dist;
        }

        const rvx = b.vx - a.vx;
        const rvy = b.vy - a.vy;
        const vn = rvx * nx + rvy * ny;

        if (vn < 0) {
          const impact = -vn;
          if (impact > WAKE_IMPACT) {
            if (a.sleeping) this.wakeOrb(a);
            if (b.sleeping) this.wakeOrb(b);
          } else if (a.sleeping || b.sleeping) {
            if (a.sleeping && !b.sleeping) {
              b.vx -= vn * nx;
              b.vy -= vn * ny;
              continue;
            }
            if (b.sleeping && !a.sleeping) {
              a.vx += vn * nx;
              a.vy += vn * ny;
              continue;
            }
          }

          if (impact > 130) {
            const norm = Math.min(1, (impact - 120) / 500);
            strongestBounce = Math.max(strongestBounce, norm);
            const sq = Math.min(0.65, norm * 0.62);
            a.impactSquash = Math.max(a.impactSquash, sq);
            b.impactSquash = Math.max(b.impactSquash, sq);
          }

          const e = impact > BOUNCE_THRESHOLD ? RESTITUTION_BALL : 0;
          const invMassSum = a.invMass + b.invMass;
          const jn = (-(1 + e) * vn) / invMassSum;

          const impX = jn * nx;
          const impY = jn * ny;
          a.vx -= impX * a.invMass;
          a.vy -= impY * a.invMass;
          b.vx += impX * b.invMass;
          b.vy += impY * b.invMass;

          const tx = -ny;
          const ty = nx;
          const vt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty - (a.omega * a.radius + b.omega * b.radius);
          const denomT = 3 * invMassSum;
          const maxJt = FRICTION_BALL * jn;
          const jt = clamp(-vt / denomT, -maxJt, maxJt);

          a.vx -= jt * tx * a.invMass;
          a.vy -= jt * ty * a.invMass;
          b.vx += jt * tx * b.invMass;
          b.vy += jt * ty * b.invMass;

          a.omega -= jt * a.radius * a.invInertia;
          b.omega -= jt * b.radius * b.invInertia;
        }
      }
    }

    // 4. Execute queued merges (tightest overlap first, never merging the same orb twice)
    if (mergeCandidates.length > 0) {
      mergeCandidates.sort((p, q) => p.ratioSq - q.ratioSq);
      const removedIds = new Set<number>();
      const newlyCreated: OrbBody[] = [];

      for (let k = 0; k < mergeCandidates.length; k++) {
        const { a, b } = mergeCandidates[k];
        if (removedIds.has(a.id) || removedIds.has(b.id)) continue;

        removedIds.add(a.id);
        removedIds.add(b.id);

        this.totalMerges++;
        this.comboCount++;
        this.comboTimer = COMBO_WINDOW;
        if (this.comboCount > this.maxCombo) this.maxCombo = this.comboCount;

        const comboMult = 1 + Math.max(0, this.comboCount - 1) * 0.15;
        const mx = (a.x + b.x) * 0.5;
        const my = (a.y + b.y) * 0.5;

        if (a.tier >= MAX_TIER) {
          const points = Math.round(DOUBLE_SUIKA_BONUS * comboMult);
          outMerges.push({
            x: mx,
            y: my,
            oldTier: a.tier,
            newTier: MAX_TIER + 1,
            isDoubleSuika: true,
            points,
            combo: this.comboCount,
          });
          this.applyMergeShockwave(mx, my, 195, 175, removedIds);
        } else {
          const newTier = a.tier + 1;
          const newDef = ORB_TIERS[newTier];
          const newR = newDef.radius * this.getCurrentRadiusScale();
          const clampedX = Math.max(INNER_LEFT + newR, Math.min(INNER_RIGHT - newR, mx));
          const clampedY = Math.min(FLOOR_Y - newR, my);

          const merged = this.createOrb(newTier, clampedX, clampedY);
          merged.vx = (a.vx + b.vx) * 0.22;
          merged.vy = Math.min((a.vy + b.vy) * 0.22, 0) - 90;
          merged.angle = (a.angle + b.angle) * 0.5;
          merged.omega = (a.omega + b.omega) * 0.24;
          merged.hasTouched = true;
          merged.mergeCooldown = 0.055;
          merged.spawnProgress = 0;
          merged.isMergeBorn = true;
          merged.flashTimer = 1;
          newlyCreated.push(merged);

          const points = Math.round(newDef.score * comboMult);
          outMerges.push({
            x: clampedX,
            y: clampedY,
            oldTier: a.tier,
            newTier,
            isDoubleSuika: false,
            points,
            combo: this.comboCount,
          });

          this.applyMergeShockwave(clampedX, clampedY, newR + 38, 102, removedIds);
        }
      }

      if (removedIds.size > 0) {
        this.orbs = this.orbs.filter((o) => !removedIds.has(o.id));
        for (let n = 0; n < newlyCreated.length; n++) {
          this.orbs.push(newlyCreated[n]);
        }
        this.wakeAllOrbs();
      }
    }

    // 5. Iterative position projection (guarantees zero wall tunneling & ultra-stable stacks)
    const curOrbs = this.orbs;
    const curLen = curOrbs.length;
    for (let iter = 0; iter < POSITION_ITERATIONS; iter++) {
      for (let i = 0; i < curLen; i++) {
        const a = curOrbs[i];
        if (a.sealed) continue;
        for (let j = i + 1; j < curLen; j++) {
          const b = curOrbs[j];
          if (b.sealed) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const minDist = a.radius + b.radius;
          const distSq = dx * dx + dy * dy;
          if (distSq >= minDist * minDist) continue;

          let dist = Math.sqrt(distSq);
          let nx: number;
          let ny: number;
          if (dist < 1e-5) {
            nx = (a.id & 1) === 0 ? 1 : -1;
            ny = 0;
            dist = 0;
          } else {
            nx = dx / dist;
            ny = dy / dist;
          }

          const penetration = minDist - dist;
          if (a.sleeping && b.sleeping && penetration < 0.45) continue;
          if (penetration <= SLOP) continue;

          const invMassSum = a.invMass + b.invMass;
          const correction = ((penetration - SLOP) / invMassSum) * CORRECTION_PERCENT;
          const cx = nx * correction;
          const cy = ny * correction;

          if (a.sleeping && !b.sleeping) {
            b.x += cx * invMassSum;
            b.y += cy * invMassSum;
          } else if (b.sleeping && !a.sleeping) {
            a.x -= cx * invMassSum;
            a.y -= cy * invMassSum;
          } else {
            a.x -= cx * a.invMass;
            a.y -= cy * a.invMass;
            b.x += cx * b.invMass;
            b.y += cy * b.invMass;
          }
        }
      }

      for (let i = 0; i < curLen; i++) {
        const o = curOrbs[i];
        if (o.sealed) continue;
        const r = o.radius;
        if (o.x - r < INNER_LEFT) o.x = INNER_LEFT + r;
        else if (o.x + r > INNER_RIGHT) o.x = INNER_RIGHT - r;
        if (o.y + r > FLOOR_Y) o.y = FLOOR_Y - r;
      }
    }

    // 6. Multi-pass support detection + silky resting sleep damping
    const supported = new Uint8Array(curLen);
    for (let i = 0; i < curLen; i++) {
      if (curOrbs[i].y + curOrbs[i].radius >= FLOOR_Y - 1.2) {
        supported[i] = 1;
      }
    }
    for (let pass = 0; pass < 3; pass++) {
      let changed = false;
      for (let i = 0; i < curLen; i++) {
        if (supported[i]) continue;
        const a = curOrbs[i];
        for (let j = 0; j < curLen; j++) {
          if (!supported[j] || i === j) continue;
          const b = curOrbs[j];
          if (b.y <= a.y) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const maxD = a.radius + b.radius + 1.5;
          if (dx * dx + dy * dy <= maxD * maxD && dy > maxD * 0.28) {
            supported[i] = 1;
            changed = true;
            break;
          }
        }
      }
      if (!changed) break;
    }

    for (let i = 0; i < curLen; i++) {
      const o = curOrbs[i];
      if (!supported[i]) {
        o.restTime = 0;
        if (o.sleeping) o.sleeping = false;
        continue;
      }
      if (o.sleeping || o.sealed) continue;

      const speedSq = o.vx * o.vx + o.vy * o.vy;
      if (speedSq < SLEEP_SPEED_SQ && Math.abs(o.omega) < SLEEP_OMEGA) {
        o.vx *= 0.84;
        o.vy *= 0.84;
        o.omega *= 0.82;
        if (speedSq < 36 && Math.abs(o.omega) < 0.14) {
          o.restTime += dt;
          if (o.restTime >= SLEEP_DELAY) {
            o.vx = 0;
            o.vy = 0;
            o.omega = 0;
            o.sleeping = true;
          }
        }
      } else {
        o.restTime = Math.max(0, o.restTime - dt * 2);
      }
    }

    return strongestBounce;
  }

  private applyMergeShockwave(
    cx: number,
    cy: number,
    reach: number,
    maxImpulse: number,
    excludedIds: Set<number>
  ): void {
    for (let i = 0; i < this.orbs.length; i++) {
      const o = this.orbs[i];
      if (excludedIds.has(o.id) || o.sealed) continue;
      const dx = o.x - cx;
      const dy = o.y - cy;
      const distSq = dx * dx + dy * dy;
      const maxDist = reach + o.radius;
      if (distSq > maxDist * maxDist || distSq < 1e-4) continue;
      const dist = Math.sqrt(distSq);
      const falloff = 1 - dist / maxDist;
      const push = maxImpulse * falloff;
      o.sleeping = false;
      o.restTime = 0;
      o.vx += (dx / dist) * push;
      o.vy += (dy / dist) * push - 26 * falloff;
    }
  }
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}
