import {
  DANGER_GRACE_SECONDS,
  DANGER_Y,
  DOUBLE_SUIKA_BONUS,
  FLOOR_Y,
  INNER_LEFT,
  INNER_RIGHT,
  MAX_TIER,
  ORB_TIERS,
  SPAWN_Y,
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
  /** Brief tactile squash-and-stretch impulse on hard impacts (decays to 0) */
  impactSquash: number;
  flashTimer: number;
  inDanger: boolean;
  /** Resting sleep state to guarantee zero micro-jitter in settled stacks */
  restTime: number;
  sleeping: boolean;
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

export interface PhysicsStepResult {
  merges: MergeEvent[];
  strongestBounce: number;
  dangerTriggered: boolean;
  dangerWarningTick: number | null;
  /** 0..1 proximity alert when settled orbs get close to DANGER_Y even before crossing */
  nearDangerFactor: number;
}

const FIXED_DT = 1 / 120;
const GRAVITY = 1360;
const POSITION_ITERATIONS = 8;
const SLOP = 0.14;
const CORRECTION_PERCENT = 0.78;
const LINEAR_DAMPING = 0.9982;
const ANGULAR_DAMPING = 0.992;
const RESTITUTION_WALL = 0.22;
const RESTITUTION_BALL = 0.18;
const BOUNCE_THRESHOLD = 66;
const FRICTION_WALL = 0.34;
const FRICTION_BALL = 0.28;
const MAX_SPEED = 1180;
const MAX_OMEGA = 10;
const COMBO_WINDOW = 1.15;

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
    this.nextId = 1;
    this.accumulator = 0;
    this.lastWarningMilestone = -1;
  }

  clampDropX(x: number, tier: number): number {
    const r = ORB_TIERS[tier].radius;
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
    orb.impactSquash = 0.18;
    this.orbs.push(orb);
    return orb;
  }

  private createOrb(tier: number, x: number, y: number): OrbBody {
    const def = ORB_TIERS[tier];
    const r = def.radius;
    // Mass proportional to area so heavier orbs feel genuinely substantial
    const mass = (r * r) / 256;
    const invMass = 1 / mass;
    // Solid disk moment of inertia I = 0.5 * m * r^2
    const inertia = 0.5 * mass * r * r;
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
    };
  }

  /**
   * Predicts the vertical landing center Y for an orb dropped straight down from (dropX, SPAWN_Y).
   */
  predictLandingY(dropX: number, tier: number): number {
    const r = ORB_TIERS[tier].radius;
    let bestY = FLOOR_Y - r;

    for (let i = 0; i < this.orbs.length; i++) {
      const o = this.orbs[i];
      const dx = dropX - o.x;
      const sumR = r + o.radius;
      const dxSq = dx * dx;
      if (dxSq < sumR * sumR) {
        const dy = Math.sqrt(sumR * sumR - dxSq);
        const hitY = o.y - dy;
        if (hitY >= SPAWN_Y && hitY < bestY) {
          bestY = hitY;
        }
      }
    }
    return bestY;
  }

  update(frameDt: number): PhysicsStepResult {
    // Clamp dt and cap accumulator so tab switches never cause tunneling or lag spikes
    const clampedDt = Math.min(0.05, Math.max(0, frameDt));
    const maxSubSteps = 8;
    this.accumulator = Math.min(this.accumulator + clampedDt, FIXED_DT * maxSubSteps);

    const merges: MergeEvent[] = [];
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

    // Evaluate danger line & proximity alert over frame dt
    let anyDanger = false;
    let closestTopY = FLOOR_Y;
    for (let i = 0; i < this.orbs.length; i++) {
      const o = this.orbs[i];
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
    };
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
      if (o.impactSquash > 0) o.impactSquash = Math.max(0, o.impactSquash - dt * 5.2);
      if (o.flashTimer > 0) o.flashTimer = Math.max(0, o.flashTimer - dt * 3.5);

      if (o.sleeping) continue;

      o.vy += GRAVITY * dt;
      o.vx *= LINEAR_DAMPING;
      o.vy *= LINEAR_DAMPING;
      o.omega *= ANGULAR_DAMPING;

      // Clamp extreme velocities
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
      if (o.sleeping) continue;
      const r = o.radius;

      // Floor
      if (o.y + r > FLOOR_Y) {
        o.y = FLOOR_Y - r;
        o.hasTouched = true;
        if (o.vy > 0) {
          const impact = o.vy;
          if (impact > 155) {
            const norm = Math.min(1, (impact - 140) / 520);
            strongestBounce = Math.max(strongestBounce, norm);
            o.impactSquash = Math.max(o.impactSquash, Math.min(0.65, norm * 0.6));
          }
          const e = impact > BOUNCE_THRESHOLD ? RESTITUTION_WALL : 0;
          const jn = (1 + e) * impact * o.mass;
          o.vy = -impact * e;

          // Floor rolling friction (bottom surface vel = vx - omega * r)
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
      for (let j = i + 1; j < count; j++) {
        const b = orbs[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const minDist = a.radius + b.radius;
        const distSq = dx * dx + dy * dy;

        // Same-tier merge detection with tiny 0.9px touch tolerance
        if (a.tier === b.tier && a.mergeCooldown <= 0 && b.mergeCooldown <= 0) {
          const mergeDist = minDist + 0.9;
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
          // Wake sleeping partner only on meaningful impact so resting piles stay rock-solid
          if (impact > WAKE_IMPACT) {
            if (a.sleeping) this.wakeOrb(a);
            if (b.sleeping) this.wakeOrb(b);
          } else if (a.sleeping || b.sleeping) {
            // Soft settling touch against a sleeping orb: damp approaching velocity without waking the whole pile
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

          if (impact > 155) {
            const norm = Math.min(1, (impact - 140) / 520);
            strongestBounce = Math.max(strongestBounce, norm);
            const sq = Math.min(0.55, norm * 0.5);
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

          // Tangential impulse with solid-disk rotational coupling
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
          // Legendary Double Ibuki Suika celebration!
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
          const clampedX = Math.max(
            INNER_LEFT + newDef.radius,
            Math.min(INNER_RIGHT - newDef.radius, mx)
          );
          const clampedY = Math.min(FLOOR_Y - newDef.radius, my);

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

          this.applyMergeShockwave(clampedX, clampedY, newDef.radius + 38, 102, removedIds);
        }
      }

      if (removedIds.size > 0) {
        this.orbs = this.orbs.filter((o) => !removedIds.has(o.id));
        for (let n = 0; n < newlyCreated.length; n++) {
          this.orbs.push(newlyCreated[n]);
        }
        // Wake remaining stack cleanly on any merge so overlying orbs settle naturally
        this.wakeAllOrbs();
      }
    }

    // 5. Iterative position projection (guarantees zero wall tunneling & ultra-stable stacks)
    const curOrbs = this.orbs;
    const curLen = curOrbs.length;
    for (let iter = 0; iter < POSITION_ITERATIONS; iter++) {
      for (let i = 0; i < curLen; i++) {
        const a = curOrbs[i];
        for (let j = i + 1; j < curLen; j++) {
          const b = curOrbs[j];
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

      // Hard boundary projection every sub-iteration
      for (let i = 0; i < curLen; i++) {
        const o = curOrbs[i];
        const r = o.radius;
        if (o.x - r < INNER_LEFT) o.x = INNER_LEFT + r;
        else if (o.x + r > INNER_RIGHT) o.x = INNER_RIGHT - r;
        if (o.y + r > FLOOR_Y) o.y = FLOOR_Y - r;
      }
    }

    // 6. Multi-pass support detection + silky resting sleep damping (zero buzz/jitter!)
    const supported = new Uint8Array(curLen);
    for (let i = 0; i < curLen; i++) {
      if (curOrbs[i].y + curOrbs[i].radius >= FLOOR_Y - 1.2) {
        supported[i] = 1;
      }
    }
    // Propagate support upward through settled contacts (3 passes covers deep stacks)
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
      if (o.sleeping) continue;

      const speedSq = o.vx * o.vx + o.vy * o.vy;
      if (speedSq < SLEEP_SPEED_SQ && Math.abs(o.omega) < SLEEP_OMEGA) {
        // Progressive resting friction to kill micro-oscillations smoothly
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
      if (excludedIds.has(o.id)) continue;
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

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}
