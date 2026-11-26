import { PuyoEngine } from './engine';
import {
  ActiveSpellVfx,
  BOSS_BANNER_CELLS,
  BOSS_PORTRAIT_X,
  BUFFER_PEEK_CELLS,
  BossState,
  COLS,
  DEATH_COL,
  DEATH_ROW,
  GameMode,
  HIDDEN_ROWS,
  PUYO_THEMES,
  PuyoColor,
  PuyoPairColors,
  PuyoTheme,
  TOTAL_ROWS,
  VISIBLE_ROWS,
} from './types';

export { BUFFER_PEEK_CELLS };
export const BOARD_ASPECT_ROWS = VISIBLE_ROWS + BUFFER_PEEK_CELLS;

export function getBoardAspectRows(mode: GameMode): number {
  return VISIBLE_ROWS + BUFFER_PEEK_CELLS + (mode === 'boss' ? BOSS_BANNER_CELLS : 0);
}

interface StarSpec {
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
  sparkle: boolean;
}

interface FireflySpec {
  baseX: number;
  baseY: number;
  driftX: number;
  driftY: number;
  freqX: number;
  freqY: number;
  phase: number;
  r: number;
  warm: boolean;
}

interface CellDrawInfo {
  c: number;
  r: number;
  x: number;
  y: number;
  radius: number;
  sx: number;
  sy: number;
  isClr: boolean;
  flashWhite: number;
  color: PuyoColor;
}

const BG_STARS: readonly StarSpec[] = Array.from({ length: 30 }, (_, i) => ({
  x: ((i * 67 + 13) % 96 + 2) / 100,
  y: ((i * 37 + 9) % 86 + 2) / 100,
  r: 0.65 + (i % 3) * 0.42,
  phase: i * 1.41,
  speed: 0.0013 + (i % 5) * 0.00045,
  sparkle: i % 6 === 0,
}));

const BG_FIREFLIES: readonly FireflySpec[] = Array.from({ length: 14 }, (_, i) => ({
  baseX: ((i * 53 + 17) % 88 + 6) / 100,
  baseY: ((i * 71 + 19) % 82 + 12) / 100,
  driftX: 0.045 + (i % 4) * 0.018,
  driftY: 0.035 + (i % 3) * 0.02,
  freqX: 0.00042 + (i % 5) * 0.00012,
  freqY: 0.00034 + (i % 4) * 0.00011,
  phase: i * 2.13,
  r: 1.5 + (i % 3) * 0.75,
  warm: i % 4 !== 0,
}));

export class PuyoRenderer {
  private cellSize = 36;
  private dpr = 1;
  private showBossBanner = true;

  public resizeBoard(
    canvas: HTMLCanvasElement,
    cellSize: number,
    showBossBanner = false,
  ): void {
    this.cellSize = Math.max(16, Math.floor(cellSize));
    this.showBossBanner = showBossBanner;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const aspectRows =
      VISIBLE_ROWS + BUFFER_PEEK_CELLS + (showBossBanner ? BOSS_BANNER_CELLS : 0);
    const cssW = this.cellSize * COLS;
    const cssH = Math.round(this.cellSize * aspectRows);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    const targetW = Math.round(cssW * this.dpr);
    const targetH = Math.round(cssH * this.dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
  }

  private getHeaderHeight(hasBoss = this.showBossBanner): number {
    return hasBoss ? BOSS_BANNER_CELLS * this.cellSize : 0;
  }

  private rowToY(row: number, hasBoss = this.showBossBanner): number {
    return (
      this.getHeaderHeight(hasBoss) +
      (row - HIDDEN_ROWS + BUFFER_PEEK_CELLS) * this.cellSize
    );
  }

  public renderBoard(canvas: HTMLCanvasElement, engine: PuyoEngine): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cs = this.cellSize;
    const hasBoss = engine.mode === 'boss' && engine.boss !== null;
    this.showBossBanner = hasBoss;
    const headerH = this.getHeaderHeight(hasBoss);
    const width = cs * COLS;
    const aspectRows =
      VISIBLE_ROWS + BUFFER_PEEK_CELLS + (hasBoss ? BOSS_BANNER_CELLS : 0);
    const height = Math.round(cs * aspectRows);
    const topLineY = headerH + BUFFER_PEEK_CELLS * cs;

    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // Screen shake on chains & spells (smooth damped oscillation)
    if (engine.shakeTime > 0) {
      const ratio = Math.min(1, engine.shakeTime / 260);
      const mag = engine.shakeMagnitude * ratio;
      ctx.translate(
        Math.sin(engine.elapsedMs * 0.075) * mag * 0.8 + (Math.random() - 0.5) * mag * 0.7,
        Math.cos(engine.elapsedMs * 0.09) * mag * 0.8 + (Math.random() - 0.5) * mag * 0.7,
      );
    }

    // 1. Starry Forest of Magic twilight backdrop + Hakkero watermark + fireflies
    this.drawForestBackdrop(ctx, width, height, topLineY, cs, engine);

    // 1b. Pending Boss Ojama column warning pips along the hidden buffer strip
    if (hasBoss && engine.boss && engine.boss.pendingOjama > 0) {
      this.drawPendingOjamaIndicators(ctx, headerH, topLineY, cs, engine.boss, engine.elapsedMs);
    }

    // 2. Crimson Shrine Seal X at death cell (col 2, top visible row)
    this.drawDeathSeal(ctx, DEATH_COL * cs + cs / 2, topLineY + cs / 2, cs, engine);

    // 3. Hard-drop luminous trails
    for (const tr of engine.dropTrails) {
      const ratio = 1 - tr.life / tr.maxLife;
      const x = tr.col * cs + cs * 0.16;
      const y1 = Math.max(headerH, this.rowToY(tr.fromRow, hasBoss) + cs * 0.5);
      const y2 = this.rowToY(tr.toRow, hasBoss) + cs * 0.5;
      if (y2 <= y1) continue;
      const g = ctx.createLinearGradient(0, y1, 0, y2);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.7, tr.color);
      g.addColorStop(1, '#ffffff');
      ctx.save();
      ctx.globalAlpha = ratio * 0.42;
      ctx.fillStyle = g;
      ctx.fillRect(x, y1, cs * 0.68, y2 - y1);
      ctx.restore();
    }

    // 4. Ghost landing preview
    const ghosts = engine.getGhostPositions();
    for (const g of ghosts) {
      if (g.row < HIDDEN_ROWS) continue;
      this.drawGhostPuyo(
        ctx,
        g.col * cs + cs / 2,
        this.rowToY(g.row, hasBoss) + cs / 2,
        cs * 0.42,
        g.color,
        engine.elapsedMs,
      );
    }

    // Build quick lookup set for clearing cells
    const clearingSet = new Set<string>();
    for (const cc of engine.clearingCells) {
      clearingSet.add(`${cc.col},${cc.row}`);
    }
    const clearProgress =
      engine.phase === 'clearing'
        ? Math.min(1, engine.clearTimer / Math.max(1, engine.clearDuration))
        : 0;

    // 5. Settled Puyos — Hidden buffer row (peek)
    for (let c = 0; c < COLS; c++) {
      const cell = engine.grid[0][c];
      if (!cell) continue;
      if (cell.isOjama) {
        this.drawOjamaOrb(
          ctx,
          c * cs + cs / 2,
          this.rowToY(0, hasBoss) + cs / 2,
          cs * 0.45,
          { scaleX: 1, scaleY: 1, alpha: 0.62, shattering: false, flashWhite: 0 },
        );
      } else {
        this.drawStandalonePuyo(
          ctx,
          c * cs + cs / 2,
          this.rowToY(0, hasBoss) + cs / 2,
          cs * 0.455,
          cell.color,
          {
            scaleX: 1,
            scaleY: 1,
            alpha: 0.58,
            blinking: false,
            surprised: false,
            excited: false,
            flashWhite: 0,
            isPivot: false,
            lockProgress: 0,
            lookX: 0,
            lookY: 0,
            nervous: false,
            elapsedMs: engine.elapsedMs,
          },
        );
      }
    }

    // 5b. Settled Visible Puyos — Seamless Per-Color Concave Metaball Gel Clusters + Translucent Ojama Orbs!
    this.drawSettledMetaballClusters(ctx, cs, engine, clearingSet, clearProgress);

    // 6. Independently falling puyos & Ojama during gravity cascade
    for (const f of engine.fallingPuyos) {
      const stretch = Math.min(0.16, f.vy * 3.8);
      const fy = this.rowToY(f.y, hasBoss) + cs / 2;
      if (fy + cs * 0.5 < headerH) continue;
      if (f.isOjama) {
        this.drawOjamaOrb(ctx, f.col * cs + cs / 2, fy, cs * 0.455, {
          scaleX: 1 - stretch * 0.52,
          scaleY: 1 + stretch,
          alpha: 0.96,
          shattering: false,
          flashWhite: 0,
        });
      } else {
        this.drawStandalonePuyo(
          ctx,
          f.col * cs + cs / 2,
          fy,
          cs * 0.46,
          f.color,
          {
            scaleX: 1 - stretch * 0.58,
            scaleY: 1 + stretch,
            alpha: 1,
            blinking: false,
            surprised: false,
            excited: engine.chainExcitement > 0.2,
            flashWhite: 0,
            isPivot: false,
            lockProgress: 0,
            lookX: 0,
            lookY: 0.35,
            nervous: false,
            elapsedMs: engine.elapsedMs,
          },
        );
      }
    }

    // 7. Active player-controlled pair (60fps smoothly interpolated X, Y, & orbital arc!)
    if (engine.activePair && engine.phase === 'falling') {
      this.drawActivePair(ctx, cs, engine);
    }

    // 7b. Compact Fumo BOSS Banner Strip at top of board in Boss mode
    if (hasBoss && engine.boss) {
      this.drawBossBanner(ctx, width, headerH, cs, engine.boss, engine.elapsedMs);
    }

    // 7c. Active Character Spell Card Board VFX (Fantasy Seal / Master Spark / Philosopher's Stone)
    if (engine.activeSpellVfx) {
      this.drawActiveSpellVfx(
        ctx,
        width,
        height,
        headerH,
        topLineY,
        cs,
        engine.activeSpellVfx,
        engine.elapsedMs,
      );
    }

    // 8. Glowing Danmaku Orbs flying into the Boss + Burst particles & rings
    if (engine.danmakuOrbs.length > 0) {
      this.drawDanmakuOrbs(ctx, topLineY, cs, engine);
    }
    this.drawParticles(ctx, topLineY, cs, engine);

    // 9. Floating chain, damage & score popups
    this.drawFloatingTexts(ctx, topLineY, cs, engine);

    // 10. Dramatic Diagonal Touhou Spell Card Cut-in Banner & Boss Defeat Bonus Flash!
    if (engine.spellFlash > 0.01) {
      ctx.save();
      ctx.globalAlpha = engine.spellFlash * 0.24;
      const fGrad = ctx.createLinearGradient(0, 0, width, height);
      fGrad.addColorStop(0, '#fff4c2');
      fGrad.addColorStop(
        0.5,
        engine.bossBonusBanner
          ? '#f5b82e'
          : (engine.spellBanner?.primaryColor ?? '#e83b54'),
      );
      fGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = fGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
    if (engine.bossBonusBanner) {
      this.drawBossBonusBanner(ctx, width, height, topLineY, cs, engine);
    } else if (engine.spellBanner) {
      this.drawSpellBanner(ctx, width, height, topLineY, cs, engine);
    }

    // 11. Subtle inner spellbook gold corner filigree frame
    this.drawInnerFrameFiligree(ctx, width, height, topLineY, cs);

    ctx.restore();
  }

  // ==================== BACKDROP & ENVIRONMENT ====================

  private drawForestBackdrop(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    topLineY: number,
    cs: number,
    engine: PuyoEngine,
  ): void {
    // Deep Forest of Magic twilight gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0d0921');
    bgGrad.addColorStop(0.42, '#161136');
    bgGrad.addColorStop(0.78, '#1d1642');
    bgGrad.addColorStop(1, '#1a233b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Soft moonlight nebula glow near upper right
    const moonGlow = ctx.createRadialGradient(
      width * 0.84,
      topLineY + height * 0.12,
      cs * 0.2,
      width * 0.84,
      topLineY + height * 0.12,
      width * 0.68,
    );
    moonGlow.addColorStop(0, 'rgba(255, 232, 166, 0.14)');
    moonGlow.addColorStop(0.5, 'rgba(138, 92, 224, 0.08)');
    moonGlow.addColorStop(1, 'rgba(13, 9, 33, 0)');
    ctx.fillStyle = moonGlow;
    ctx.fillRect(0, 0, width, height);

    // Emerald-indigo magical forest mist along lower third
    const mistGrad = ctx.createLinearGradient(0, height * 0.66, 0, height);
    mistGrad.addColorStop(0, 'rgba(34, 148, 122, 0)');
    mistGrad.addColorStop(1, 'rgba(42, 165, 130, 0.14)');
    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, height * 0.66, width, height * 0.34);

    // Distant pine tree & enchanted mushroom silhouettes at very bottom
    ctx.save();
    ctx.fillStyle = 'rgba(10, 8, 28, 0.56)';
    ctx.beginPath();
    ctx.moveTo(0, height);
    const treePeaks = [0.06, 0.17, 0.28, 0.42, 0.58, 0.72, 0.85, 0.96];
    const treeHeights = [0.095, 0.14, 0.085, 0.125, 0.11, 0.145, 0.09, 0.12];
    for (let i = 0; i < treePeaks.length; i++) {
      const px = treePeaks[i] * width;
      const py = height - treeHeights[i] * height;
      const baseW = width * 0.11;
      ctx.lineTo(px - baseW * 0.5, height - height * 0.03);
      ctx.lineTo(px, py);
      ctx.lineTo(px + baseW * 0.5, height - height * 0.03);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Twinkling Forest of Magic stars
    for (const s of BG_STARS) {
      const tw = 0.22 + 0.62 * (0.5 + 0.5 * Math.sin(engine.elapsedMs * s.speed + s.phase));
      const sx = s.x * width;
      const sy = topLineY + s.y * (height - topLineY);
      ctx.fillStyle = `rgba(255, 243, 198, ${tw.toFixed(3)})`;
      if (s.sparkle) {
        const arm = s.r * 2.4;
        ctx.beginPath();
        ctx.moveTo(sx, sy - arm);
        ctx.lineTo(sx + s.r * 0.55, sy - s.r * 0.55);
        ctx.lineTo(sx + arm, sy);
        ctx.lineTo(sx + s.r * 0.55, sy + s.r * 0.55);
        ctx.lineTo(sx, sy + arm);
        ctx.lineTo(sx - s.r * 0.55, sy + s.r * 0.55);
        ctx.lineTo(sx - arm, sy);
        ctx.lineTo(sx - s.r * 0.55, sy - s.r * 0.55);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Soft glowing Marisa Hakkero Magic Circle Watermark
    this.drawHakkeroWatermark(
      ctx,
      width * 0.5,
      topLineY + (height - topLineY) * 0.5,
      Math.min(width * 0.45, (height - topLineY) * 0.28),
      engine.elapsedMs,
      engine.chainExcitement,
    );

    // Drifting golden magic fireflies
    for (const ff of BG_FIREFLIES) {
      const fx =
        (ff.baseX + Math.sin(engine.elapsedMs * ff.freqX + ff.phase) * ff.driftX) * width;
      const fy =
        topLineY +
        (ff.baseY + Math.cos(engine.elapsedMs * ff.freqY + ff.phase * 1.3) * ff.driftY) *
          (height - topLineY);
      const glowPulse =
        0.35 + 0.65 * (0.5 + 0.5 * Math.sin(engine.elapsedMs * 0.0028 + ff.phase));
      const haloR = ff.r * 4.2;
      const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, haloR);
      if (ff.warm) {
        fg.addColorStop(0, `rgba(255, 244, 178, ${(0.72 * glowPulse).toFixed(3)})`);
        fg.addColorStop(0.35, `rgba(245, 184, 46, ${(0.34 * glowPulse).toFixed(3)})`);
        fg.addColorStop(1, 'rgba(245, 184, 46, 0)');
      } else {
        fg.addColorStop(0, `rgba(210, 250, 255, ${(0.62 * glowPulse).toFixed(3)})`);
        fg.addColorStop(0.4, `rgba(110, 224, 255, ${(0.25 * glowPulse).toFixed(3)})`);
        fg.addColorStop(1, 'rgba(110, 224, 255, 0)');
      }
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(fx, fy, haloR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Danger column crimson warning aura when stack approaches the X seal
    if (engine.dangerRatio > 0 && engine.phase !== 'menu') {
      const pulse = 0.5 + 0.5 * Math.sin(engine.elapsedMs * 0.011);
      const alpha = engine.dangerRatio * (0.14 + 0.16 * pulse);
      const dGrad = ctx.createLinearGradient(0, topLineY, 0, topLineY + cs * 5.2);
      dGrad.addColorStop(0, `rgba(235, 52, 82, ${alpha.toFixed(3)})`);
      dGrad.addColorStop(0.55, `rgba(235, 52, 82, ${(alpha * 0.35).toFixed(3)})`);
      dGrad.addColorStop(1, 'rgba(235, 52, 82, 0)');
      ctx.fillStyle = dGrad;
      ctx.fillRect(DEATH_COL * cs, topLineY, cs, cs * 5.2);
    }

    // Subtle shrine lattice grid
    ctx.strokeStyle = 'rgba(240, 194, 89, 0.068)';
    ctx.lineWidth = 1;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cs + 0.5, topLineY);
      ctx.lineTo(c * cs + 0.5, height);
      ctx.stroke();
    }
    for (let r = 0; r < VISIBLE_ROWS; r++) {
      const y = topLineY + r * cs + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Hidden buffer top zone tint + luminous crimson-gold seal line
    ctx.fillStyle = 'rgba(9, 5, 22, 0.52)';
    ctx.fillRect(0, 0, width, topLineY);
    const lineGrad = ctx.createLinearGradient(0, 0, width, 0);
    lineGrad.addColorStop(0, 'rgba(240, 194, 89, 0.22)');
    lineGrad.addColorStop(0.35, 'rgba(240, 194, 89, 0.55)');
    lineGrad.addColorStop(0.5, 'rgba(240, 62, 92, 0.85)');
    lineGrad.addColorStop(0.65, 'rgba(240, 194, 89, 0.55)');
    lineGrad.addColorStop(1, 'rgba(240, 194, 89, 0.22)');
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, topLineY);
    ctx.lineTo(width, topLineY);
    ctx.stroke();
  }

  private drawHakkeroWatermark(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    elapsedMs: number,
    excitement: number,
  ): void {
    const baseAlpha = 0.085 + excitement * 0.14;
    const rot = elapsedMs * 0.00018;

    ctx.save();
    ctx.translate(cx, cy);

    // Soft ambient radial glow behind Hakkero emblem
    const glow = ctx.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius * 1.25);
    glow.addColorStop(0, `rgba(245, 194, 89, ${(baseAlpha * 0.95).toFixed(3)})`);
    glow.addColorStop(0.55, `rgba(155, 78, 230, ${(baseAlpha * 0.55).toFixed(3)})`);
    glow.addColorStop(1, 'rgba(155, 78, 230, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.25, 0, Math.PI * 2);
    ctx.fill();

    // Outer rotating rune ring
    ctx.save();
    ctx.rotate(rot);
    ctx.strokeStyle = `rgba(245, 206, 112, ${(baseAlpha * 1.5).toFixed(3)})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.89, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Octagonal Mini-Hakkero frame + 8 trigram dashes
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + Math.PI / 8;
      const x = Math.cos(a) * radius * 0.82;
      const y = Math.sin(a) * radius * 0.82;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // Trigram bars around the octagon
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ctx.save();
      ctx.rotate(a);
      ctx.strokeStyle = `rgba(255, 226, 146, ${(baseAlpha * 1.3).toFixed(3)})`;
      ctx.lineWidth = 1.1;
      for (let b = 0; b < 3; b++) {
        const y = -radius * (0.64 + b * 0.055);
        const w = radius * 0.12;
        if ((i + b) % 2 === 0) {
          ctx.beginPath();
          ctx.moveTo(-w, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(-w, y);
          ctx.lineTo(-w * 0.22, y);
          ctx.moveTo(w * 0.22, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    ctx.restore();

    // Counter-rotating inner 8-point Marisa star core
    ctx.save();
    ctx.rotate(-rot * 1.45);
    ctx.strokeStyle = `rgba(255, 224, 130, ${(baseAlpha * 1.55).toFixed(3)})`;
    ctx.lineWidth = 1.1;
    this.traceStar(ctx, 0, 0, 8, radius * 0.54, radius * 0.22);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  private drawInnerFrameFiligree(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    topLineY: number,
    cs: number,
  ): void {
    const pad = 4;
    const arm = Math.max(8, cs * 0.34);
    ctx.save();
    ctx.strokeStyle = 'rgba(245, 200, 98, 0.42)';
    ctx.lineWidth = 1.25;
    ctx.lineCap = 'round';

    const corners: [number, number, number, number][] = [
      [pad, topLineY + pad, 1, 1],
      [width - pad, topLineY + pad, -1, 1],
      [pad, height - pad, 1, -1],
      [width - pad, height - pad, -1, -1],
    ];
    for (const [cx, cy, dx, dy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx, cy + dy * arm);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + dx * arm, cy);
      ctx.stroke();

      // Tiny gold corner diamond dot
      ctx.fillStyle = 'rgba(255, 228, 148, 0.55)';
      ctx.beginPath();
      ctx.arc(cx + dx * 4.5, cy + dy * 4.5, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawDeathSeal(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    cs: number,
    engine: PuyoEngine,
  ): void {
    const danger = engine.dangerRatio;
    const pulse = 0.5 + 0.5 * Math.sin(engine.elapsedMs * (0.005 + danger * 0.012));
    const r = cs * 0.36;
    ctx.save();
    ctx.translate(cx, cy);

    // Pulsing crimson shrine warning aura
    const auraR = r * (1.45 + danger * 0.55 + pulse * 0.2);
    const aura = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, auraR);
    aura.addColorStop(0, `rgba(255, 76, 108, ${(0.24 + danger * 0.42 + pulse * 0.12).toFixed(3)})`);
    aura.addColorStop(0.55, `rgba(224, 38, 68, ${(0.1 + danger * 0.24).toFixed(3)})`);
    aura.addColorStop(1, 'rgba(224, 38, 68, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, auraR, 0, Math.PI * 2);
    ctx.fill();

    // Slowly rotating outer shrine seal talisman ring
    ctx.save();
    ctx.rotate(engine.elapsedMs * (0.0008 + danger * 0.0022));
    ctx.strokeStyle = `rgba(245, 92, 114, ${(0.36 + danger * 0.45 + pulse * 0.14).toFixed(3)})`;
    ctx.lineWidth = Math.max(1.2, cs * 0.045);
    ctx.setLineDash([r * 0.45, r * 0.26]);
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.06, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Inner shrine ring
    ctx.strokeStyle = `rgba(255, 112, 134, ${(0.42 + danger * 0.48 + pulse * 0.1).toFixed(3)})`;
    ctx.lineWidth = Math.max(1.3, cs * 0.05);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.84, 0, Math.PI * 2);
    ctx.stroke();

    // Glowing crimson X mark
    const arm = r * 0.48;
    ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(255, 86, 112, ${(0.58 + danger * 0.36 + pulse * 0.1).toFixed(3)})`;
    ctx.lineWidth = Math.max(2.0, cs * 0.082);
    ctx.beginPath();
    ctx.moveTo(-arm, -arm);
    ctx.lineTo(arm, arm);
    ctx.moveTo(arm, -arm);
    ctx.lineTo(-arm, arm);
    ctx.stroke();

    // Crisp bright center gleam inside X
    ctx.strokeStyle = `rgba(255, 224, 232, ${(0.4 + danger * 0.45).toFixed(3)})`;
    ctx.lineWidth = Math.max(0.9, cs * 0.032);
    ctx.beginPath();
    ctx.moveTo(-arm * 0.78, -arm * 0.78);
    ctx.lineTo(arm * 0.78, arm * 0.78);
    ctx.moveTo(arm * 0.78, -arm * 0.78);
    ctx.lineTo(-arm * 0.78, arm * 0.78);
    ctx.stroke();

    ctx.restore();
  }

  // ==================== CONCAVE METABALL GEL CLUSTERS ====================

  private drawSettledMetaballClusters(
    ctx: CanvasRenderingContext2D,
    cs: number,
    engine: PuyoEngine,
    clearingSet: Set<string>,
    clearProgress: number,
  ): void {
    const baseR = cs * 0.46;
    const rimW = Math.max(1.6, cs * 0.056);

    // Precompute cell render transforms for visible rows (HIDDEN_ROWS .. TOTAL_ROWS - 1)
    const infoGrid: (CellDrawInfo | null)[][] = Array.from({ length: TOTAL_ROWS }, () =>
      Array.from({ length: COLS }, () => null),
    );
    const byColor: CellDrawInfo[][] = [[], [], [], [], []];
    const ojamaCells: CellDrawInfo[] = [];

    for (let r = HIDDEN_ROWS; r < TOTAL_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = engine.grid[r][c];
        if (!cell) continue;
        const isClr = clearingSet.has(`${c},${r}`);
        if (isClr && clearProgress > 0.78) continue;

        let sx = 1;
        let sy = 1;
        if (cell.squish > 0.008) {
          const wave = Math.sin(cell.squishPhase) * cell.squish * 0.17;
          sx = 1 + wave;
          sy = 1 - wave;
        }
        let flashWhite = 0;
        if (isClr) {
          // Snappy anticipation pulse (0..0.62) -> juicy elastic pop shrink (0.62..0.78)
          const popScale =
            clearProgress < 0.62
              ? 1 + Math.sin(clearProgress * Math.PI * 6) * 0.09 + clearProgress * 0.16
              : Math.max(0.05, 1.16 * (1 - (clearProgress - 0.62) / 0.17));
          sx *= popScale;
          sy *= popScale;
          flashWhite =
            clearProgress < 0.62
              ? Math.max(0, 0.35 + Math.sin(clearProgress * Math.PI * 10) * 0.48)
              : 0.92;
        }

        const trembleX =
          engine.dangerRatio > 0.32 && !isClr
            ? Math.sin(engine.elapsedMs * 0.044 + c * 1.7 + r * 0.9) *
              engine.dangerRatio *
              1.35
            : 0;

        // Ground-anchored squish keeps bottom planted on floor/stack!
        const yGroundOffset = baseR * (1 - sy);
        const info: CellDrawInfo = {
          c,
          r,
          x: c * cs + cs / 2 + trembleX,
          y: this.rowToY(r) + cs / 2 + yGroundOffset,
          radius: baseR,
          sx,
          sy,
          isClr,
          flashWhite,
          color: cell.color,
        };
        if (cell.isOjama) {
          ojamaCells.push(info);
        } else {
          infoGrid[r][c] = info;
          byColor[cell.color].push(info);
        }
      }
    }

    const activePairX =
      engine.activePair && engine.phase === 'falling'
        ? (engine.activePair.renderCol + engine.activePair.bumpOffsetX) * cs + cs / 2
        : null;
    const activePairY =
      engine.activePair && engine.phase === 'falling'
        ? this.rowToY(engine.activePair.renderRow) + cs / 2
        : null;
    const sealX = DEATH_COL * cs + cs / 2;
    const sealY = this.rowToY(DEATH_ROW) + cs / 2;

    // Render per color so fused same-color clusters are 100% seamless while different colors keep crisp outlines
    for (let colorIdx = 0; colorIdx < PUYO_THEMES.length; colorIdx++) {
      const cells = byColor[colorIdx];
      if (cells.length === 0) continue;
      const theme = PUYO_THEMES[colorIdx];

      // Gather same-color horizontal & vertical neighbor pairs
      const bridges: [CellDrawInfo, CellDrawInfo, boolean][] = []; // [a, b, isHorizontal]
      const quads: [CellDrawInfo, CellDrawInfo, CellDrawInfo, CellDrawInfo][] = [];

      for (const a of cells) {
        const right = a.c + 1 < COLS ? infoGrid[a.r][a.c + 1] : null;
        const down = a.r + 1 < TOTAL_ROWS ? infoGrid[a.r + 1][a.c] : null;
        if (right && right.color === colorIdx && right.isClr === a.isClr) {
          bridges.push([a, right, true]);
        }
        if (down && down.color === colorIdx && down.isClr === a.isClr) {
          bridges.push([a, down, false]);
        }
        if (right && down && right.color === colorIdx && down.color === colorIdx) {
          const diag = infoGrid[a.r + 1][a.c + 1];
          if (diag && diag.color === colorIdx && diag.isClr === a.isClr && right.isClr === a.isClr && down.isClr === a.isClr) {
            quads.push([a, right, diag, down]);
          }
        }
      }

      // PASS 1: Unified Soft Ambient Outer Glow
      ctx.save();
      for (const a of cells) {
        const rx = a.radius * a.sx;
        const ry = a.radius * a.sy;
        const glowR = Math.max(rx, ry) * (a.isClr ? 1.55 : 1.28);
        const g = ctx.createRadialGradient(a.x, a.y, Math.min(rx, ry) * 0.45, a.x, a.y, glowR);
        g.addColorStop(0, theme.glow);
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.globalAlpha = a.isClr ? 0.85 : 0.34;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(a.x, a.y, glowR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // PASS 2: Unified Dark Rim Silhouette (spheres + concave waisted bezier bridges + 2x2 pockets)
      ctx.save();
      ctx.fillStyle = theme.rim;
      for (const a of cells) {
        ctx.beginPath();
        ctx.ellipse(
          a.x,
          a.y,
          a.radius * a.sx + rimW,
          a.radius * a.sy + rimW,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      for (const [a, b] of bridges) {
        this.fillConcaveBridge(ctx, a, b, rimW, theme.rim);
      }
      for (const [tl, tr, br, bl] of quads) {
        ctx.beginPath();
        ctx.moveTo(tl.x, tl.y);
        ctx.lineTo(tr.x, tr.y);
        ctx.lineTo(br.x, br.y);
        ctx.lineTo(bl.x, bl.y);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // PASS 3: Unified Translucent Gel Base Silhouette (deep rich dark-base gradient across whole cluster)
      ctx.save();
      ctx.fillStyle = theme.dark;
      for (const a of cells) {
        ctx.beginPath();
        ctx.ellipse(a.x, a.y, a.radius * a.sx, a.radius * a.sy, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const [a, b] of bridges) {
        this.fillConcaveBridge(ctx, a, b, 0, theme.dark);
      }
      for (const [tl, tr, br, bl] of quads) {
        ctx.beginPath();
        ctx.moveTo(tl.x, tl.y);
        ctx.lineTo(tr.x, tr.y);
        ctx.lineTo(br.x, br.y);
        ctx.lineTo(bl.x, bl.y);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // PASS 4: Inner Subsurface Jelly Body (slightly inset so rim edge keeps rich saturated depth!)
      const inset = Math.max(1.2, cs * 0.048);
      ctx.save();
      ctx.fillStyle = theme.base;
      for (const a of cells) {
        ctx.beginPath();
        ctx.ellipse(
          a.x,
          a.y - inset * 0.22,
          Math.max(2, a.radius * a.sx - inset * 0.85),
          Math.max(2, a.radius * a.sy - inset * 0.85),
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      for (const [a, b] of bridges) {
        this.fillConcaveBridge(ctx, a, b, -inset * 0.85, theme.base);
      }
      for (const [tl, tr, br, bl] of quads) {
        ctx.beginPath();
        ctx.moveTo(tl.x, tl.y);
        ctx.lineTo(tr.x, tr.y);
        ctx.lineTo(br.x, br.y);
        ctx.lineTo(bl.x, bl.y);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // PASS 5: Translucent Inner Subsurface Glow & Bounced Bottom Caustics (additive-like soft gradients)
      for (const a of cells) {
        const rx = a.radius * a.sx;
        const ry = a.radius * a.sy;
        const avgR = (rx + ry) * 0.5;

        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.scale(a.sx, a.sy);

        // Luminous translucent upper-left subsurface core
        const subGrad = ctx.createRadialGradient(
          -a.radius * 0.28,
          -a.radius * 0.34,
          a.radius * 0.06,
          -a.radius * 0.1,
          -a.radius * 0.12,
          a.radius * 0.86,
        );
        subGrad.addColorStop(0, theme.light);
        subGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.16)');
        subGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.globalAlpha = 0.72;
        ctx.fillStyle = subGrad;
        ctx.beginPath();
        ctx.arc(0, 0, a.radius * 0.9, 0, Math.PI * 2);
        ctx.fill();

        // Warm bottom-right internal bounce caustic shimmer
        const causticGrad = ctx.createRadialGradient(
          a.radius * 0.22,
          a.radius * 0.44,
          a.radius * 0.04,
          a.radius * 0.16,
          a.radius * 0.36,
          a.radius * 0.56,
        );
        causticGrad.addColorStop(0, theme.light);
        causticGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.globalAlpha = 0.34;
        ctx.fillStyle = causticGrad;
        ctx.beginPath();
        ctx.arc(0, 0, a.radius * 0.9, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Suppress unused var warning
        void avgR;
      }

      // PASS 6: Shared Specular Shimmer Ribbon across connected bridges!
      ctx.save();
      for (const [a, b, isHoriz] of bridges) {
        const avgR = ((a.radius * a.sy + b.radius * b.sy) * 0.5);
        const shimmerGrad = ctx.createLinearGradient(
          a.x,
          a.y - avgR * 0.45,
          b.x,
          b.y - avgR * 0.45,
        );
        shimmerGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        shimmerGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.36)');
        shimmerGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.strokeStyle = shimmerGrad;
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(1.8, avgR * 0.2);
        ctx.beginPath();
        if (isHoriz) {
          const offsetY = -avgR * 0.34;
          const mx = (a.x + b.x) * 0.5;
          const my = (a.y + b.y) * 0.5 + offsetY;
          ctx.moveTo(a.x + avgR * 0.25, a.y + offsetY);
          ctx.quadraticCurveTo(mx, my + avgR * 0.14, b.x - avgR * 0.25, b.y + offsetY);
        } else {
          const offsetX = -avgR * 0.34;
          const mx = (a.x + b.x) * 0.5 + offsetX;
          const my = (a.y + b.y) * 0.5;
          ctx.moveTo(a.x + offsetX, a.y + avgR * 0.25);
          ctx.quadraticCurveTo(mx + avgR * 0.14, my, b.x + offsetX, b.y - avgR * 0.25);
        }
        ctx.stroke();
      }
      ctx.restore();

      // PASS 7: Crisp Crescent Gel Highlights, Inner Touhou Magic Motifs, Lively Eyes & Clear Flash
      for (const a of cells) {
        // Staggered per-cell organic blink schedule
        const blinkPeriod = 3600 + ((a.c * 521 + a.r * 317) % 1900);
        const blinkOffset = (a.c * 977 + a.r * 613) % blinkPeriod;
        const blinkPhase = (engine.elapsedMs + blinkOffset) % blinkPeriod;
        const isBlinking = !a.isClr && blinkPhase > blinkPeriod - 135;

        // Compute expressive pupil gaze (toward X seal in danger, or glancing toward active piece)
        let lookX = 0;
        let lookY = 0;
        if (engine.dangerRatio > 0.22) {
          const dx = sealX - a.x;
          const dy = sealY - a.y;
          const d = Math.max(1, Math.hypot(dx, dy));
          const weight = Math.min(1, engine.dangerRatio * 1.15);
          lookX = (dx / d) * weight;
          lookY = (dy / d) * weight;
        } else if (activePairX !== null && activePairY !== null) {
          const dx = activePairX - a.x;
          const dy = activePairY - a.y;
          const d = Math.hypot(dx, dy);
          if (d < cs * 5.2 && d > 1) {
            const weight = (1 - d / (cs * 5.2)) * 0.55;
            lookX = (dx / d) * weight;
            lookY = (dy / d) * weight;
          }
        }

        const nervous = engine.dangerRatio > 0.55 && a.r <= HIDDEN_ROWS + 4 && !a.isClr;
        const excited = engine.chainExcitement > 0.18 && !a.isClr;

        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.scale(a.sx, a.sy);

        this.drawCrescentHighlight(ctx, a.radius);
        this.drawMotif(ctx, a.radius, theme.motif, engine.elapsedMs);
        this.drawEyes(ctx, a.radius, a.color, {
          blinking: isBlinking,
          surprised: a.isClr,
          excited,
          lookX,
          lookY,
          nervous,
          elapsedMs: engine.elapsedMs,
        });

        if (a.flashWhite > 0.01) {
          ctx.fillStyle = `rgba(255, 255, 255, ${a.flashWhite.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(0, 0, a.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // PASS 8: Translucent 「阻碍毛玉 (Ojama)」 Orbs (never fused with colored puyos!)
    for (const o of ojamaCells) {
      this.drawOjamaOrb(ctx, o.x, o.y, o.radius, {
        scaleX: o.sx,
        scaleY: o.sy,
        alpha: 0.94,
        shattering: o.isClr,
        flashWhite: o.flashWhite,
      });
    }
  }

  /**
   * Draws an organic concave waisted metaball gel bridge using dual quadratic bezier fillets
   * smoothly tangent to both puyo spheres with zero blocky seams.
   */
  private fillConcaveBridge(
    ctx: CanvasRenderingContext2D,
    a: CellDrawInfo,
    b: CellDrawInfo,
    expand: number,
    fillStyle: string,
  ): void {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return;

    const ux = dx / dist;
    const uy = dy / dist;
    const px = -uy;
    const py = ux;

    // Effective transverse radius for each orb along the perpendicular to the bridge
    const isHoriz = Math.abs(dx) >= Math.abs(dy);
    const ra = Math.max(2, a.radius * (isHoriz ? a.sy : a.sx) + expand);
    const rb = Math.max(2, b.radius * (isHoriz ? b.sy : b.sx) + expand);
    const rAvg = (ra + rb) * 0.5;

    const anchorA = Math.min(dist * 0.34, ra * 0.28);
    const anchorB = Math.min(dist * 0.34, rb * 0.28);
    const flareA = ra * 0.94;
    const flareB = rb * 0.94;

    // Pinched concave waist half-width at midpoint
    const waist = Math.max(2, rAvg * 0.57 + expand * 0.22);
    const flareAvg = (flareA + flareB) * 0.5;
    // Quadratic bezier midpoint width = 0.5 * flareAvg + 0.5 * ctrlW => ctrlW = 2*waist - flareAvg
    const ctrlW = 2 * waist - flareAvg;

    const ax = a.x + ux * anchorA;
    const ay = a.y + uy * anchorA;
    const bx = b.x - ux * anchorB;
    const by = b.y - uy * anchorB;
    const mx = (ax + bx) * 0.5;
    const my = (ay + by) * 0.5;

    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.moveTo(ax + px * flareA, ay + py * flareA);
    ctx.quadraticCurveTo(mx + px * ctrlW, my + py * ctrlW, bx + px * flareB, by + py * flareB);
    ctx.lineTo(bx - px * flareB, by - py * flareB);
    ctx.quadraticCurveTo(mx - px * ctrlW, my - py * ctrlW, ax - px * flareA, ay - py * flareA);
    ctx.closePath();
    ctx.fill();
  }

  // ==================== ACTIVE PAIR & STANDALONE PUYOS ====================

  private drawActivePair(
    ctx: CanvasRenderingContext2D,
    cs: number,
    engine: PuyoEngine,
  ): void {
    const p = engine.activePair;
    if (!p) return;

    const basePivotX = (p.renderCol + p.bumpOffsetX) * cs + cs / 2;
    const basePivotY = this.rowToY(p.renderRow) + cs / 2;
    // Smooth circular orbital arc around pivot (0 = Up, PI/2 = Right, PI = Down, -PI/2 = Left)
    const childX = basePivotX + Math.sin(p.renderAngle) * cs;
    const childY = basePivotY - Math.cos(p.renderAngle) * cs;

    // Elastic touch-down squish on active pair
    let sx = 1;
    let sy = 1;
    if (p.touchSquish > 0.008) {
      const wave = Math.sin(p.touchSquishPhase) * p.touchSquish * 0.13;
      sx = 1 + wave;
      sy = 1 - wave;
    }
    const yGroundShift = cs * 0.46 * (1 - sy);

    const lockProg = engine.getLockProgress();
    const lockFlash =
      lockProg > 0 ? (0.1 + lockProg * 0.22) * (0.6 + 0.4 * Math.sin(engine.elapsedMs * 0.032)) : 0;

    // Luminous spirit tether between active pair
    ctx.save();
    const tetherGrad = ctx.createLinearGradient(
      basePivotX,
      basePivotY + yGroundShift,
      childX,
      childY + yGroundShift,
    );
    tetherGrad.addColorStop(0, PUYO_THEMES[p.pivotColor].light);
    tetherGrad.addColorStop(0.5, 'rgba(255, 244, 198, 0.72)');
    tetherGrad.addColorStop(1, PUYO_THEMES[p.childColor].light);
    ctx.strokeStyle = tetherGrad;
    ctx.globalAlpha = p.pivotColor === p.childColor ? 0.56 : 0.34;
    ctx.lineWidth = Math.max(2.4, cs * (p.pivotColor === p.childColor ? 0.14 : 0.085));
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(basePivotX, basePivotY + yGroundShift);
    ctx.lineTo(childX, childY + yGroundShift);
    ctx.stroke();
    ctx.restore();

    // Subtle look direction matching rotation / falling motion
    const lookX = Math.max(-0.5, Math.min(0.5, (p.pivotCol - p.renderCol) * 1.4));
    const lookY = p.wasGrounded ? 0.15 : 0.3;

    this.drawStandalonePuyo(ctx, childX, childY + yGroundShift, cs * 0.46, p.childColor, {
      scaleX: sx,
      scaleY: sy,
      alpha: 1,
      blinking: false,
      surprised: false,
      excited: false,
      flashWhite: lockFlash,
      isPivot: false,
      lockProgress: lockProg,
      lookX,
      lookY,
      nervous: false,
      elapsedMs: engine.elapsedMs,
    });

    this.drawStandalonePuyo(ctx, basePivotX, basePivotY + yGroundShift, cs * 0.46, p.pivotColor, {
      scaleX: sx,
      scaleY: sy,
      alpha: 1,
      blinking: false,
      surprised: false,
      excited: false,
      flashWhite: lockFlash,
      isPivot: true,
      lockProgress: lockProg,
      lookX,
      lookY,
      nervous: false,
      elapsedMs: engine.elapsedMs,
    });
  }

  private drawGhostPuyo(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    color: PuyoColor,
    elapsedMs: number,
  ): void {
    const theme = PUYO_THEMES[color];
    const pulse = 0.78 + 0.22 * Math.sin(elapsedMs * 0.0075);
    ctx.save();
    ctx.translate(cx, cy);

    const g = ctx.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius);
    g.addColorStop(0, theme.light);
    g.addColorStop(0.55, theme.base);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.globalAlpha = 0.28 * pulse;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.76 * pulse;
    ctx.strokeStyle = theme.light;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.92, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Faint inner motif dot so ghost color is effortless to read
    ctx.globalAlpha = 0.35 * pulse;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawStandalonePuyo(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    color: PuyoColor,
    opts: {
      scaleX: number;
      scaleY: number;
      alpha: number;
      blinking: boolean;
      surprised: boolean;
      excited: boolean;
      flashWhite: number;
      isPivot: boolean;
      lockProgress: number;
      lookX: number;
      lookY: number;
      nervous: boolean;
      elapsedMs: number;
    },
  ): void {
    if (opts.scaleX <= 0.02 || opts.scaleY <= 0.02) return;
    const theme = PUYO_THEMES[color];
    const rimW = Math.max(1.5, r * 0.115);

    ctx.save();
    ctx.globalAlpha = opts.alpha;
    ctx.translate(cx, cy);
    ctx.scale(opts.scaleX, opts.scaleY);

    // Soft outer spirit glow
    const glowGrad = ctx.createRadialGradient(0, 0, r * 0.45, 0, 0, r * 1.32);
    glowGrad.addColorStop(0, theme.glow);
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.32, 0, Math.PI * 2);
    ctx.fill();

    // Rotating golden axis indicator halo for active pivot puyo
    if (opts.isPivot) {
      ctx.save();
      ctx.rotate(opts.elapsedMs * 0.0024);
      ctx.strokeStyle =
        opts.lockProgress > 0
          ? `rgba(255, 245, 195, ${(0.75 + opts.lockProgress * 0.25).toFixed(3)})`
          : 'rgba(255, 232, 152, 0.82)';
      ctx.lineWidth = Math.max(1.5, r * 0.11);
      ctx.setLineDash([r * 0.5, r * 0.28]);
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Outer dark rim silhouette
    ctx.fillStyle = theme.rim;
    ctx.beginPath();
    ctx.arc(0, 0, r + rimW, 0, Math.PI * 2);
    ctx.fill();

    // Rich translucent subsurface radial gradient body
    const grad = ctx.createRadialGradient(-r * 0.28, -r * 0.34, r * 0.08, 0, 0, r * 1.04);
    grad.addColorStop(0, theme.light);
    grad.addColorStop(0.38, theme.base);
    grad.addColorStop(0.84, theme.dark);
    grad.addColorStop(1, theme.dark);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Subtle lower-right subsurface caustic bounce light
    const caustic = ctx.createRadialGradient(
      r * 0.22,
      r * 0.44,
      r * 0.04,
      r * 0.16,
      r * 0.36,
      r * 0.56,
    );
    caustic.addColorStop(0, theme.light);
    caustic.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.save();
    ctx.globalAlpha = opts.alpha * 0.36;
    ctx.fillStyle = caustic;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Crisp crescent gel highlight
    this.drawCrescentHighlight(ctx, r);

    // Distinct Touhou inner magic motif
    this.drawMotif(ctx, r, theme.motif, opts.elapsedMs);

    // Expressive animated anime eyes
    this.drawEyes(ctx, r, color, {
      blinking: opts.blinking,
      surprised: opts.surprised,
      excited: opts.excited,
      lookX: opts.lookX,
      lookY: opts.lookY,
      nervous: opts.nervous,
      elapsedMs: opts.elapsedMs,
    });

    // Lock / clear flash overlay
    if (opts.flashWhite > 0.01) {
      ctx.fillStyle = `rgba(255, 255, 255, ${opts.flashWhite.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawCrescentHighlight(ctx: CanvasRenderingContext2D, r: number): void {
    // Upper-left crisp curved banana-crescent gel specular highlight
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.78, Math.PI * 1.07, Math.PI * 1.44);
    ctx.quadraticCurveTo(
      -r * 0.34,
      -r * 0.4,
      Math.cos(Math.PI * 1.07) * r * 0.78,
      Math.sin(Math.PI * 1.07) * r * 0.78,
    );
    ctx.closePath();
    ctx.fill();

    // Secondary crisp specular gem dot
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(-r * 0.44, -r * 0.1, r * 0.085, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawMotif(
    ctx: CanvasRenderingContext2D,
    r: number,
    motif: PuyoTheme['motif'],
    elapsedMs: number,
  ): void {
    ctx.save();
    ctx.translate(0, -r * 0.44);
    ctx.globalAlpha = 0.72;

    if (motif === 'yinyang') {
      // Reimu authentic Yin-Yang orb with tiny twin dots
      const mr = r * 0.22;
      ctx.fillStyle = '#fff5f7';
      ctx.beginPath();
      ctx.arc(0, 0, mr, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
      ctx.fillStyle = '#750c1d';
      ctx.beginPath();
      ctx.arc(0, 0, mr, Math.PI / 2, (Math.PI * 3) / 2);
      ctx.fill();
      ctx.fillStyle = '#fff5f7';
      ctx.beginPath();
      ctx.arc(0, -mr * 0.5, mr * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#750c1d';
      ctx.beginPath();
      ctx.arc(0, mr * 0.5, mr * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -mr * 0.5, mr * 0.19, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff5f7';
      ctx.beginPath();
      ctx.arc(0, mr * 0.5, mr * 0.19, 0, Math.PI * 2);
      ctx.fill();
    } else if (motif === 'crystal') {
      // Cirno 6-point faceted ice crystal snowflake
      const s = r * 0.24;
      ctx.strokeStyle = '#e8fbff';
      ctx.lineWidth = Math.max(1.1, r * 0.075);
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * -s, Math.sin(a) * -s);
        ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2);
      ctx.fill();
    } else if (motif === 'star') {
      // Marisa glowing Hakkero 5-point magic star
      ctx.fillStyle = '#fffce0';
      this.traceStar(ctx, 0, 0, 5, r * 0.26, r * 0.115);
      ctx.fill();
    } else if (motif === 'leaf') {
      // Sanae gently spinning 4-blade Wind Pinwheel
      ctx.rotate(elapsedMs * 0.0016);
      const s = r * 0.23;
      ctx.fillStyle = '#dcffeb';
      for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI) / 2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(s * 0.65, -s * 0.25, s, -s * 0.72);
        ctx.quadraticCurveTo(s * 0.25, -s * 0.8, 0, 0);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.06, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Patchouli ornate Crescent Moon + tiny accompanying starlet
      ctx.fillStyle = '#f6e4ff';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.23, 0.35, Math.PI * 1.75);
      ctx.arc(r * 0.095, -r * 0.02, r * 0.175, Math.PI * 1.7, 0.4, true);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      this.traceStar(ctx, r * 0.13, -r * 0.04, 4, r * 0.09, r * 0.035);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawEyes(
    ctx: CanvasRenderingContext2D,
    r: number,
    color: PuyoColor,
    opts: {
      blinking: boolean;
      surprised: boolean;
      excited: boolean;
      lookX: number;
      lookY: number;
      nervous: boolean;
      elapsedMs: number;
    },
  ): void {
    const ex = r * 0.31;
    const ey = r * 0.14;
    const ew = r * 0.2;
    const eh = r * 0.26;
    const gazeX = opts.lookX * ew * 0.38;
    const gazeY = opts.lookY * eh * 0.34;

    if (opts.surprised) {
      // Wide thrilled sparkle O_O eyes during popping anticipation!
      for (const side of [-1, 1]) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(side * ex, ey, eh * 1.18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#240b2e';
        ctx.beginPath();
        ctx.arc(side * ex, ey, eh * 0.54, 0, Math.PI * 2);
        ctx.fill();
        // Sparkling 4-point star glint inside excited eyes
        ctx.fillStyle = '#fff5b8';
        this.traceStar(ctx, side * ex - eh * 0.15, ey - eh * 0.16, 4, eh * 0.42, eh * 0.15);
        ctx.fill();
      }
      return;
    }

    if (opts.blinking) {
      ctx.strokeStyle = '#1b0d24';
      ctx.lineWidth = Math.max(1.4, r * 0.11);
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * ex - ew * 0.82, ey);
        ctx.quadraticCurveTo(side * ex, ey + eh * 0.36, side * ex + ew * 0.82, ey);
        ctx.stroke();
      }
      return;
    }

    // Sanae cheerful smiling arcs (opens into bright sparkling eyes on chain excitement or high danger!)
    if (color === 3 && !opts.excited && !opts.nervous) {
      ctx.strokeStyle = '#06331b';
      ctx.lineWidth = Math.max(1.6, r * 0.125);
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(
          side * ex + gazeX * 0.5,
          ey + eh * 0.22 + gazeY * 0.4,
          ew * 0.96,
          Math.PI * 1.12,
          Math.PI * 1.88,
        );
        ctx.stroke();
      }
      return;
    }

    // Expressive anime eyes with sclera, tinted iris depth, pupil gaze, and double catchlights
    const irisColors = ['#3d0a1a', '#062c52', '#4a2600', '#06361c', '#2e0b4f'];
    const irisColor = irisColors[color] ?? '#1c0b26';

    for (const side of [-1, 1]) {
      const cx = side * ex;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(cx, ey, ew * (opts.excited ? 1.12 : 1), eh * (opts.excited ? 1.12 : 1), 0, 0, Math.PI * 2);
      ctx.fill();

      // Pupil shifted smoothly toward gaze target
      ctx.fillStyle = irisColor;
      ctx.beginPath();
      ctx.ellipse(
        cx + gazeX,
        ey + eh * 0.06 + gazeY,
        ew * 0.62,
        eh * 0.64,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      // Main catchlight (sparkles as a star on chains!)
      ctx.fillStyle = '#ffffff';
      if (opts.excited) {
        this.traceStar(
          ctx,
          cx + gazeX * 0.45 - ew * 0.18,
          ey + gazeY * 0.45 - eh * 0.22,
          4,
          ew * 0.5,
          ew * 0.18,
        );
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(
          cx + gazeX * 0.45 - ew * 0.22,
          ey + gazeY * 0.45 - eh * 0.24,
          ew * 0.31,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }

      // Secondary micro catchlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.beginPath();
      ctx.arc(
        cx + gazeX * 0.5 + ew * 0.18,
        ey + gazeY * 0.5 + eh * 0.24,
        ew * 0.14,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      // Character eye accents: Cirno cheeky brows / Patchouli serene lids
      if (color === 1) {
        ctx.strokeStyle = '#07325c';
        ctx.lineWidth = Math.max(1.2, r * 0.09);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - side * ew * 0.9, ey - eh * 0.95);
        ctx.lineTo(cx + side * ew * 0.85, ey - eh * 1.32);
        ctx.stroke();
      } else if (color === 4 && !opts.excited && !opts.nervous) {
        ctx.strokeStyle = '#331059';
        ctx.lineWidth = Math.max(1.2, r * 0.09);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - ew * 0.95, ey - eh * 0.55);
        ctx.lineTo(cx + ew * 0.95, ey - eh * 0.55);
        ctx.stroke();
      }
    }

    // Cute translucent nervous sweatdrop near temple when stack is critically high!
    if (opts.nervous) {
      const dropY = -r * 0.08 + ((opts.elapsedMs * 0.015) % (r * 0.22));
      ctx.fillStyle = 'rgba(182, 240, 255, 0.85)';
      ctx.beginPath();
      ctx.moveTo(r * 0.62, dropY - r * 0.14);
      ctx.quadraticCurveTo(r * 0.74, dropY + r * 0.06, r * 0.62, dropY + r * 0.1);
      ctx.quadraticCurveTo(r * 0.5, dropY + r * 0.06, r * 0.62, dropY - r * 0.14);
      ctx.fill();
    }
  }

  // ==================== PARTICLES, POPUPS & SPELL CARD CUT-IN ====================

  private drawParticles(
    ctx: CanvasRenderingContext2D,
    topLineY: number,
    cs: number,
    engine: PuyoEngine,
  ): void {
    for (const pt of engine.particles) {
      const px = pt.x * cs;
      const py = topLineY + pt.y * cs;
      ctx.save();
      ctx.globalAlpha = Math.max(0, pt.alpha);
      ctx.translate(px, py);
      ctx.rotate(pt.rotation);

      if (pt.shape === 'ring') {
        ctx.strokeStyle = pt.color;
        ctx.lineWidth = Math.max(1.6, cs * 0.075 * pt.alpha);
        ctx.beginPath();
        ctx.arc(0, 0, pt.size * cs, 0, Math.PI * 2);
        ctx.stroke();
      } else if (pt.shape === 'star') {
        ctx.fillStyle = pt.color;
        this.traceStar(ctx, 0, 0, 5, pt.size * cs, pt.size * cs * 0.46);
        ctx.fill();
      } else if (pt.shape === 'diamond') {
        const s = pt.size * cs;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.7, 0);
        ctx.lineTo(0, s);
        ctx.lineTo(-s * 0.7, 0);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(0, 0, pt.size * cs * 0.75, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawFloatingTexts(
    ctx: CanvasRenderingContext2D,
    topLineY: number,
    cs: number,
    engine: PuyoEngine,
  ): void {
    for (const ft of engine.floatingTexts) {
      const progress = ft.life / ft.maxLife;
      const alpha = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;
      const pop = progress < 0.14 ? 0.68 + (progress / 0.14) * 0.44 : 1.0;
      const x = ft.x * cs;
      const y = topLineY + ft.y * cs;
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.translate(x, y);
      ctx.scale(ft.scale * pop, ft.scale * pop);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const mainFontSize = Math.max(13, Math.round(cs * 0.46));
      ctx.font = `900 ${mainFontSize}px system-ui, -apple-system, sans-serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(18, 10, 38, 0.92)';
      ctx.strokeText(ft.text, 0, 0);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, 0, 0);

      if (ft.subText) {
        const subFontSize = Math.max(10, Math.round(cs * 0.32));
        ctx.font = `800 ${subFontSize}px system-ui, -apple-system, sans-serif`;
        ctx.lineWidth = 3;
        ctx.strokeText(ft.subText, 0, mainFontSize * 0.85);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(ft.subText, 0, mainFontSize * 0.85);
      }
      ctx.restore();
    }
  }

  /**
   * Dramatic diagonal glowing crimson/gold Touhou Spell Card cut-in ribbon banner
   * with sweeping light flare, rotating character emblem glow, and sparkling burst rings!
   */
  private drawSpellBanner(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    topLineY: number,
    cs: number,
    engine: PuyoEngine,
  ): void {
    const b = engine.spellBanner;
    if (!b) return;
    const t = b.timer / b.duration;

    // Ease-out slash entry (0..0.15) -> dramatic hold -> graceful fade-out (0.78..1.0)
    let slideEase = 1;
    let alpha = 1;
    if (t < 0.15) {
      const p = t / 0.15;
      slideEase = 1 - Math.pow(1 - p, 3);
      alpha = Math.min(1, p * 1.4);
    } else if (t > 0.78) {
      alpha = Math.max(0, 1 - (t - 0.78) / 0.22);
    }

    const bannerY = topLineY + (height - topLineY) * 0.26;
    const bannerH = Math.max(50, cs * 1.72);
    const slashOffsetX = (1 - slideEase) * width * 0.62;
    const ribbonAngle = -0.115; // Sleek ~-6.6 deg diagonal slash

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(width * 0.5 + slashOffsetX, bannerY);
    ctx.rotate(ribbonAngle);

    const ribbonW = width * 1.32;

    // Outer crimson/gold aura glow behind ribbon
    ctx.save();
    ctx.shadowColor = b.primaryColor;
    ctx.shadowBlur = 18;
    const bg = ctx.createLinearGradient(-ribbonW * 0.5, -bannerH * 0.5, ribbonW * 0.5, bannerH * 0.5);
    bg.addColorStop(0, 'rgba(36, 8, 28, 0.94)');
    bg.addColorStop(0.28, 'rgba(72, 14, 38, 0.96)');
    bg.addColorStop(0.55, 'rgba(26, 12, 48, 0.96)');
    bg.addColorStop(1, 'rgba(18, 8, 36, 0.92)');
    ctx.fillStyle = bg;
    ctx.fillRect(-ribbonW * 0.5, -bannerH * 0.5, ribbonW, bannerH);
    ctx.restore();

    // Glowing golden & crimson double trim borders
    const borderGrad = ctx.createLinearGradient(-ribbonW * 0.5, 0, ribbonW * 0.5, 0);
    borderGrad.addColorStop(0, '#c82333');
    borderGrad.addColorStop(0.32, '#f5c859');
    borderGrad.addColorStop(0.6, b.primaryColor);
    borderGrad.addColorStop(1, '#f5c859');
    ctx.fillStyle = borderGrad;
    ctx.fillRect(-ribbonW * 0.5, -bannerH * 0.5, ribbonW, 3);
    ctx.fillRect(-ribbonW * 0.5, bannerH * 0.5 - 3, ribbonW, 3);

    // Subtle inner filigree gold pinstripes
    ctx.fillStyle = 'rgba(255, 232, 160, 0.35)';
    ctx.fillRect(-ribbonW * 0.5, -bannerH * 0.5 + 5, ribbonW, 1);
    ctx.fillRect(-ribbonW * 0.5, bannerH * 0.5 - 6, ribbonW, 1);

    // Glowing character emblem magic circle on left side of ribbon
    const embX = -width * 0.36;
    const embR = bannerH * 0.44;
    ctx.save();
    ctx.translate(embX, 0);
    const embGlow = ctx.createRadialGradient(0, 0, embR * 0.1, 0, 0, embR * 1.45);
    embGlow.addColorStop(0, b.secondaryColor);
    embGlow.addColorStop(0.45, b.primaryColor);
    embGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.globalAlpha = alpha * 0.55;
    ctx.fillStyle = embGlow;
    ctx.beginPath();
    ctx.arc(0, 0, embR * 1.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = alpha * 0.85;
    ctx.rotate(engine.elapsedMs * 0.0022);
    ctx.strokeStyle = b.secondaryColor;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(0, 0, embR * 0.85, 0, Math.PI * 2);
    ctx.stroke();
    this.traceStar(ctx, 0, 0, 6, embR * 0.78, embR * 0.38);
    ctx.stroke();
    ctx.restore();

    // Sparkling burst ring expanding from emblem on entry
    if (t < 0.42) {
      const ringT = t / 0.42;
      ctx.save();
      ctx.globalAlpha = alpha * (1 - ringT) * 0.78;
      ctx.strokeStyle = b.secondaryColor;
      ctx.lineWidth = 2 * (1 - ringT) + 0.6;
      ctx.beginPath();
      ctx.arc(embX, 0, embR * (0.6 + ringT * 1.9), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Sweeping diagonal light flash flare across the ribbon (0..0.38)
    if (t < 0.38) {
      const sweepT = t / 0.38;
      const sx = -ribbonW * 0.55 + sweepT * ribbonW * 1.15;
      const flare = ctx.createLinearGradient(sx - 38, 0, sx + 38, 0);
      flare.addColorStop(0, 'rgba(255, 255, 255, 0)');
      flare.addColorStop(0.5, 'rgba(255, 248, 210, 0.72)');
      flare.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = flare;
      ctx.fillRect(-ribbonW * 0.5, -bannerH * 0.5, ribbonW, bannerH);
    }

    // Caster & Chain / Spell tag
    const smallSize = Math.max(9.5, Math.round(cs * 0.29));
    ctx.font = `800 ${smallSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = b.secondaryColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const rightTag = b.tag ?? `${b.chain} CHAIN`;
    ctx.fillText(
      `✦ ${b.caster}  ·  ${rightTag} ✦`,
      width * 0.04,
      -bannerH * 0.21,
    );

    // Spell Card Name with radiant elemental glow
    const titleSize = Math.max(13, Math.round(cs * 0.43));
    ctx.font = `900 ${titleSize}px "Noto Serif SC", "Songti SC", system-ui, serif`;
    ctx.shadowColor = b.primaryColor;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(20, 6, 30, 0.85)';
    ctx.strokeText(b.title, width * 0.04, bannerH * 0.17);
    ctx.fillStyle = '#fffdf5';
    ctx.fillText(b.title, width * 0.04, bannerH * 0.17);

    ctx.restore();
  }

  // ==================== BOSS BANNER, FUMO PORTRAITS, OJAMA, DANMAKU & SPELL VFX ====================

  private drawBossBanner(
    ctx: CanvasRenderingContext2D,
    width: number,
    headerH: number,
    cs: number,
    boss: BossState,
    elapsedMs: number,
  ): void {
    const tpl = boss.template;
    const enterT = boss.enterTimer > 0 ? boss.enterTimer / 480 : 0;
    const slideX = enterT * enterT * width * 0.45;
    const defeatRatio = boss.defeatTimer > 0 ? boss.defeatTimer / 1250 : 1;

    ctx.save();
    // Clip to compact Boss header strip
    ctx.beginPath();
    ctx.rect(0, 0, width, headerH);
    ctx.clip();

    // Rich dark shrine battle banner backdrop
    const bg = ctx.createLinearGradient(0, 0, width, headerH);
    bg.addColorStop(0, '#190b30');
    bg.addColorStop(0.5, '#251142');
    bg.addColorStop(1, '#140928');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, headerH);

    // Subtle Boss elemental radial aura behind Fumo portrait
    const px = BOSS_PORTRAIT_X * cs + slideX;
    const py = headerH * 0.5;
    const aura = ctx.createRadialGradient(px, py, cs * 0.12, px, py, cs * 1.45);
    aura.addColorStop(0, tpl.primaryColor);
    aura.addColorStop(0.55, 'rgba(155, 78, 230, 0.16)');
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.save();
    ctx.globalAlpha = boss.defeatTimer > 0 ? 0.35 * defeatRatio : 0.32 + boss.attackFlash * 0.32;
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, width, headerH);
    ctx.restore();

    // Draw Cute Q-Version Fumo BOSS Portrait!
    const bob = boss.defeatTimer > 0 ? 0 : Math.sin(elapsedMs * 0.0046) * (cs * 0.055);
    const hitShakeX =
      boss.hitFlash > 0 ? Math.sin(elapsedMs * 0.09) * boss.hitFlash * cs * 0.14 : 0;
    const portraitR = Math.min(headerH * 0.41, cs * 0.72);
    this.drawFumoBossPortrait(
      ctx,
      px + hitShakeX,
      py + bob,
      portraitR,
      boss,
      elapsedMs,
    );

    // Right side: Stage + Boss Name + HP Bar + Attack Countdown Bar
    const infoX = cs * 1.82 + slideX * 0.5;
    const infoW = Math.max(40, width - infoX - cs * 0.24);
    const padTop = headerH * 0.15;

    // Row 1: Stage Pill + Boss Name + HP Numbers
    const nameFont = Math.max(10, Math.round(cs * 0.33));
    const smallFont = Math.max(8.5, Math.round(cs * 0.25));

    // Stage badge pill
    const stageText = `S${boss.stage}`;
    ctx.font = `900 ${smallFont}px system-ui, sans-serif`;
    const badgeW = Math.max(cs * 0.58, ctx.measureText(stageText).width + 9);
    const badgeH = Math.max(12, smallFont + 4);
    this.fillRoundRect(ctx, infoX, padTop - 1, badgeW, badgeH, 4, tpl.primaryColor);
    ctx.fillStyle = '#0f0820';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(stageText, infoX + badgeW * 0.5, padTop - 1 + badgeH * 0.53);

    // Boss Name
    ctx.font = `900 ${nameFont}px system-ui, "PingFang SC", sans-serif`;
    ctx.fillStyle = '#fff8e6';
    ctx.textAlign = 'left';
    ctx.fillText(tpl.name, infoX + badgeW + 5, padTop - 1 + badgeH * 0.52);

    // HP text (right-aligned, adapts cleanly on compact boards)
    if (infoW >= 92) {
      ctx.font = `800 ${smallFont}px ui-monospace, SFMono-Regular, system-ui, sans-serif`;
      ctx.fillStyle = boss.hitFlash > 0.2 ? '#ffffff' : 'rgba(255, 232, 175, 0.88)';
      ctx.textAlign = 'right';
      const hpStr =
        infoW >= 122 ? `${Math.ceil(boss.hp)}/${boss.maxHp}` : `${Math.ceil(boss.hp)}`;
      ctx.fillText(hpStr, infoX + infoW, padTop - 1 + badgeH * 0.52);
    }

    // Row 2: HP Bar (with lagging damage drain trail!)
    const hpY = headerH * 0.45;
    const hpH = Math.max(7, headerH * 0.165);
    this.fillRoundRect(ctx, infoX, hpY, infoW, hpH, hpH * 0.5, 'rgba(8, 4, 20, 0.85)');

    const dispRatio = Math.max(0, Math.min(1, boss.displayHp / Math.max(1, boss.maxHp)));
    const hpRatio = Math.max(0, Math.min(1, boss.hp / Math.max(1, boss.maxHp)));
    if (dispRatio > 0.002) {
      this.fillRoundRect(
        ctx,
        infoX,
        hpY,
        Math.max(hpH, infoW * dispRatio),
        hpH,
        hpH * 0.5,
        'rgba(255, 238, 175, 0.7)',
      );
    }
    if (hpRatio > 0.002) {
      const hpGrad = ctx.createLinearGradient(infoX, hpY, infoX + infoW, hpY);
      hpGrad.addColorStop(0, '#e83b54');
      hpGrad.addColorStop(0.55, '#ff7043');
      hpGrad.addColorStop(1, '#ffd166');
      this.fillRoundRect(
        ctx,
        infoX,
        hpY,
        Math.max(hpH, infoW * hpRatio),
        hpH,
        hpH * 0.5,
        hpGrad,
      );
      // Glossy top sheen on HP bar
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.fillRect(infoX + 3, hpY + 1, Math.max(0, infoW * hpRatio - 6), Math.max(1.5, hpH * 0.32));
    }
    ctx.strokeStyle = 'rgba(245, 204, 102, 0.48)';
    ctx.lineWidth = 1;
    this.strokeRoundRect(ctx, infoX, hpY, infoW, hpH, hpH * 0.5);

    // Row 3: Attack Countdown Bar (fills toward Ojama drop!)
    const atkY = headerH * 0.72;
    const atkH = Math.max(5.5, headerH * 0.115);
    const chargeRatio =
      boss.defeatTimer > 0
        ? 0
        : boss.pendingOjama > 0
          ? 1
          : Math.max(0, Math.min(1, 1 - boss.attackTimer / Math.max(1, boss.attackInterval)));
    const urgent = boss.pendingOjama > 0 || chargeRatio > 0.78;
    const urgentPulse = urgent ? 0.65 + 0.35 * Math.sin(elapsedMs * 0.018) : 1;

    // Compact label on left of countdown bar
    const lblFont = Math.max(8, Math.round(cs * 0.225));
    ctx.font = `800 ${lblFont}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const atkLabel =
      boss.defeatTimer > 0
        ? '收卡成功!'
        : boss.pendingOjama > 0
          ? `毛玉×${boss.pendingOjama}`
          : `干扰 ${(boss.attackTimer / 1000).toFixed(1)}s`;
    ctx.fillStyle =
      boss.defeatTimer > 0
        ? '#ffe36e'
        : urgent
          ? `rgba(255, 138, 168, ${urgentPulse.toFixed(2)})`
          : 'rgba(216, 204, 245, 0.8)';
    ctx.fillText(atkLabel, infoX, atkY + atkH * 0.5);

    const barOffsetX = Math.min(infoW * 0.44, Math.max(cs * 1.4, ctx.measureText(atkLabel).width + 6));
    const barW = Math.max(24, infoW - barOffsetX);
    const barX = infoX + barOffsetX;

    this.fillRoundRect(ctx, barX, atkY, barW, atkH, atkH * 0.5, 'rgba(8, 4, 20, 0.82)');
    if (chargeRatio > 0.01) {
      const atkGrad = ctx.createLinearGradient(barX, atkY, barX + barW, atkY);
      if (urgent) {
        atkGrad.addColorStop(0, '#ff4d6d');
        atkGrad.addColorStop(1, '#ffd166');
      } else {
        atkGrad.addColorStop(0, '#7c5cff');
        atkGrad.addColorStop(1, '#c8d8ff');
      }
      ctx.save();
      ctx.globalAlpha = urgentPulse;
      this.fillRoundRect(
        ctx,
        barX,
        atkY,
        Math.max(atkH, barW * chargeRatio),
        atkH,
        atkH * 0.5,
        atkGrad,
      );
      ctx.restore();
    }
    ctx.strokeStyle = urgent ? 'rgba(255, 118, 148, 0.65)' : 'rgba(200, 190, 240, 0.28)';
    ctx.lineWidth = 0.9;
    this.strokeRoundRect(ctx, barX, atkY, barW, atkH, atkH * 0.5);

    // Bottom filigree divider between Boss Strip and board playfield
    const divGrad = ctx.createLinearGradient(0, 0, width, 0);
    divGrad.addColorStop(0, 'rgba(245, 200, 98, 0.25)');
    divGrad.addColorStop(0.5, 'rgba(255, 224, 130, 0.88)');
    divGrad.addColorStop(1, 'rgba(245, 200, 98, 0.25)');
    ctx.fillStyle = divGrad;
    ctx.fillRect(0, headerH - 1.5, width, 1.5);

    ctx.restore();
  }

  private drawFumoBossPortrait(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    boss: BossState,
    elapsedMs: number,
  ): void {
    const tpl = boss.template;
    const defeatRatio = boss.defeatTimer > 0 ? boss.defeatTimer / 1250 : 1;

    ctx.save();
    ctx.translate(cx, cy);
    if (boss.defeatTimer > 0) {
      ctx.globalAlpha = Math.max(0.2, defeatRatio);
      const shrink = 0.72 + 0.28 * defeatRatio;
      ctx.scale(shrink, shrink);
    }

    // Rotating Touhou spell circle ring behind Fumo portrait
    ctx.save();
    ctx.rotate(elapsedMs * 0.0014);
    ctx.strokeStyle =
      boss.pendingOjama > 0 ? '#ff6b8b' : tpl.primaryColor;
    ctx.globalAlpha = 0.72;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.08, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Circular medallion background
    const medGrad = ctx.createRadialGradient(0, -r * 0.2, r * 0.1, 0, 0, r);
    medGrad.addColorStop(0, 'rgba(46, 26, 82, 0.95)');
    medGrad.addColorStop(1, 'rgba(18, 9, 36, 0.98)');
    ctx.fillStyle = medGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Character back accessories (wings / gap!)
    if (tpl.id === 'cirno') {
      // 6 translucent cyan ice-crystal wings
      ctx.save();
      ctx.fillStyle = 'rgba(130, 232, 255, 0.85)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.7;
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const ang = side * (0.42 + i * 0.36);
          ctx.save();
          ctx.rotate(ang);
          ctx.beginPath();
          ctx.moveTo(side * r * 0.45, r * 0.1);
          ctx.lineTo(side * r * 1.12, -r * 0.08 + i * r * 0.14);
          ctx.lineTo(side * r * 0.62, r * 0.34);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }
      ctx.restore();
    } else if (tpl.id === 'remilia') {
      // Cute dark crimson bat wings
      ctx.fillStyle = '#3b102c';
      ctx.strokeStyle = '#e53950';
      ctx.lineWidth = 0.85;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * r * 0.42, r * 0.12);
        ctx.quadraticCurveTo(side * r * 0.98, -r * 0.28, side * r * 1.08, r * 0.16);
        ctx.quadraticCurveTo(side * r * 0.84, r * 0.22, side * r * 0.72, r * 0.42);
        ctx.quadraticCurveTo(side * r * 0.56, r * 0.32, side * r * 0.42, r * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (tpl.id === 'yukari') {
      // Iconic shadowy purple-crimson Yukari gap ribbon behind head
      ctx.save();
      ctx.fillStyle = '#1b0726';
      ctx.strokeStyle = '#e03e52';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, r * 0.05, r * 1.02, r * 0.44, -0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Q-version Fumo plush bob hair back
    ctx.fillStyle = tpl.hairColor;
    ctx.beginPath();
    ctx.arc(0, r * 0.02, r * 0.72, 0, Math.PI * 2);
    ctx.fill();

    // Soft matte plush face cutout (warm cream Fumo face!)
    ctx.fillStyle = '#fff2e6';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.14, r * 0.58, r * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();

    // Soft rosy blush puffs
    ctx.fillStyle = 'rgba(255, 138, 158, 0.46)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.34, r * 0.26, r * 0.12, r * 0.07, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.34, r * 0.26, r * 0.12, r * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();

    // Layered Fumo bangs resting over top of face
    ctx.fillStyle = tpl.hairColor;
    ctx.beginPath();
    ctx.arc(0, -r * 0.02, r * 0.66, Math.PI * 1.02, Math.PI * 1.98);
    ctx.lineTo(r * 0.52, r * 0.06);
    ctx.lineTo(r * 0.28, -r * 0.09);
    ctx.lineTo(r * 0.08, r * 0.09);
    ctx.lineTo(-r * 0.12, -r * 0.08);
    ctx.lineTo(-r * 0.32, r * 0.08);
    ctx.lineTo(-r * 0.52, r * 0.02);
    ctx.closePath();
    ctx.fill();

    // Signature Headwear!
    if (tpl.id === 'cirno') {
      // Cirno pale-blue hair ribbon on top
      ctx.fillStyle = '#a8ecff';
      ctx.strokeStyle = '#1e78b8';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(-r * 0.26, -r * 0.62, r * 0.24, r * 0.14, -0.35, 0, Math.PI * 2);
      ctx.ellipse(r * 0.26, -r * 0.62, r * 0.24, r * 0.14, 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -r * 0.6, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (tpl.id === 'remilia' || tpl.id === 'yukari') {
      // Frilly white Touhou mob cap + crimson bow!
      ctx.fillStyle = '#fff5f8';
      ctx.strokeStyle = 'rgba(180, 150, 190, 0.65)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.54, r * 0.56, r * 0.26, 0, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Red ribbon accent
      ctx.fillStyle = tpl.ribbonColor;
      ctx.beginPath();
      ctx.ellipse(-r * 0.18, -r * 0.56, r * 0.15, r * 0.09, -0.25, 0, Math.PI * 2);
      ctx.ellipse(r * 0.18, -r * 0.56, r * 0.15, r * 0.09, 0.25, 0, Math.PI * 2);
      ctx.fill();
    } else if (tpl.id === 'suika') {
      // Two curved Suika oni horns with gold ribbons!
      ctx.fillStyle = '#ffe9cc';
      ctx.strokeStyle = '#994b1a';
      ctx.lineWidth = 0.95;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * r * 0.28, -r * 0.44);
        ctx.quadraticCurveTo(side * r * 0.52, -r * 0.94, side * r * 0.72, -r * 0.86);
        ctx.quadraticCurveTo(side * r * 0.56, -r * 0.6, side * r * 0.44, -r * 0.36);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Little gold ribbon around horn base
        ctx.fillStyle = '#f5b82e';
        ctx.beginPath();
        ctx.arc(side * r * 0.38, -r * 0.52, r * 0.09, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffe9cc';
      }
    }

    // Authentic Fumo Embroidered Eyes & Expressions!
    const ex = r * 0.22;
    const ey = r * 0.16;
    const blinking = (elapsedMs % 4200) > 4060;

    if (boss.defeatTimer > 0) {
      // Dizzy × × defeated Fumo eyes
      ctx.strokeStyle = '#2d1a24';
      ctx.lineWidth = Math.max(1.4, r * 0.09);
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        const s = r * 0.11;
        ctx.beginPath();
        ctx.moveTo(side * ex - s, ey - s);
        ctx.lineTo(side * ex + s, ey + s);
        ctx.moveTo(side * ex + s, ey - s);
        ctx.lineTo(side * ex - s, ey + s);
        ctx.stroke();
      }
    } else if (boss.hitFlash > 0.22) {
      // Wincing > < hurt Fumo eyes
      ctx.strokeStyle = '#2d1a24';
      ctx.lineWidth = Math.max(1.4, r * 0.09);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-ex - r * 0.1, ey - r * 0.09);
      ctx.lineTo(-ex + r * 0.08, ey);
      ctx.lineTo(-ex - r * 0.1, ey + r * 0.09);
      ctx.moveTo(ex + r * 0.1, ey - r * 0.09);
      ctx.lineTo(ex - r * 0.08, ey);
      ctx.lineTo(ex + r * 0.1, ey + r * 0.09);
      ctx.stroke();
    } else if (blinking) {
      ctx.strokeStyle = '#2d1a24';
      ctx.lineWidth = Math.max(1.3, r * 0.085);
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * ex - r * 0.11, ey);
        ctx.lineTo(side * ex + r * 0.11, ey);
        ctx.stroke();
      }
    } else {
      // Classic Fumo oval embroidered eyes!
      for (const side of [-1, 1]) {
        ctx.fillStyle = '#24141d';
        ctx.beginPath();
        ctx.ellipse(side * ex, ey, r * 0.125, r * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = tpl.eyeColor;
        ctx.beginPath();
        ctx.ellipse(side * ex, ey + r * 0.025, r * 0.092, r * 0.105, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(side * ex - r * 0.035, ey - r * 0.045, r * 0.045, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Iconic minimalist Fumo mouth (ᗜˬᗜ / ᗜ‿ᗜ / ᗜ_ᗜ / ᗜ▽ᗜ)
    ctx.strokeStyle = '#3b212a';
    ctx.lineWidth = Math.max(1.1, r * 0.068);
    ctx.lineCap = 'round';
    const my = r * 0.36;
    if (boss.defeatTimer > 0 || boss.hitFlash > 0.22) {
      // Wavy O / wince mouth
      ctx.beginPath();
      ctx.arc(0, my + r * 0.02, r * 0.07, 0, Math.PI * 2);
      ctx.stroke();
    } else if (tpl.id === 'suika') {
      // Cheerful open grin
      ctx.fillStyle = '#e8687a';
      ctx.beginPath();
      ctx.arc(0, my - r * 0.02, r * 0.12, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (tpl.id === 'yukari') {
      // Serene cat/flat smile
      ctx.beginPath();
      ctx.moveTo(-r * 0.1, my);
      ctx.quadraticCurveTo(0, my + r * 0.06, r * 0.1, my);
      ctx.stroke();
    } else {
      // Smug Fumo ᗜˬᗜ smile
      ctx.beginPath();
      ctx.moveTo(-r * 0.12, my - r * 0.02);
      ctx.quadraticCurveTo(0, my + r * 0.1, r * 0.12, my - r * 0.02);
      ctx.stroke();
    }

    // White hit flash overlay when struck by Danmaku
    if (boss.hitFlash > 0.05) {
      ctx.fillStyle = `rgba(255, 255, 255, ${(boss.hitFlash * 0.55).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Crisp gold outer medallion rim
    ctx.strokeStyle = boss.attackFlash > 0.2 ? '#ff6b8b' : 'rgba(255, 224, 130, 0.85)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  private drawPendingOjamaIndicators(
    ctx: CanvasRenderingContext2D,
    headerH: number,
    topLineY: number,
    cs: number,
    boss: BossState,
    elapsedMs: number,
  ): void {
    const cy = headerH + (topLineY - headerH) * 0.5;
    const pulse = 0.65 + 0.35 * Math.sin(elapsedMs * 0.016);
    for (const c of boss.pendingCols) {
      const cx = c * cs + cs * 0.5;
      this.drawOjamaOrb(ctx, cx, cy, cs * 0.22 * (0.9 + 0.14 * pulse), {
        scaleX: 1,
        scaleY: 1,
        alpha: 0.72 * pulse,
        shattering: false,
        flashWhite: 0.2 * pulse,
      });
    }
  }

  /**
   * Translucent 「阻碍毛玉 (Ojama)」 Orb — unmistakable silvery-lavender frosted
   * Touhou Kedama spirit ball that never color-matches and shatters adjacent to clears!
   */
  private drawOjamaOrb(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    opts: {
      scaleX: number;
      scaleY: number;
      alpha: number;
      shattering: boolean;
      flashWhite: number;
    },
  ): void {
    if (opts.scaleX <= 0.02 || opts.scaleY <= 0.02) return;
    ctx.save();
    ctx.globalAlpha = opts.alpha;
    ctx.translate(cx, cy);
    ctx.scale(opts.scaleX, opts.scaleY);

    // Subtle frosted outer aura
    const aura = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 1.24);
    aura.addColorStop(0, 'rgba(210, 224, 255, 0.36)');
    aura.addColorStop(1, 'rgba(180, 200, 240, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.24, 0, Math.PI * 2);
    ctx.fill();

    // Translucent frosted glass / Kedama body
    const bodyGrad = ctx.createRadialGradient(-r * 0.28, -r * 0.3, r * 0.08, 0, 0, r);
    bodyGrad.addColorStop(0, 'rgba(246, 250, 255, 0.88)');
    bodyGrad.addColorStop(0.5, 'rgba(184, 198, 228, 0.72)');
    bodyGrad.addColorStop(0.88, 'rgba(116, 130, 170, 0.78)');
    bodyGrad.addColorStop(1, 'rgba(78, 88, 126, 0.85)');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Delicate crystalline silver outline + tiny fluffy kedama top tuft
    ctx.strokeStyle = 'rgba(235, 244, 255, 0.76)';
    ctx.lineWidth = Math.max(1.3, r * 0.095);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.96, 0, Math.PI * 2);
    ctx.stroke();

    // Cute Kedama soft swirl inner reflection
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = Math.max(1, r * 0.075);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.72, Math.PI * 1.1, Math.PI * 1.55);
    ctx.stroke();

    // Cute blank / shattering Kedama face (·_· or > <)
    const ex = r * 0.27;
    const ey = r * 0.08;
    ctx.strokeStyle = 'rgba(54, 62, 96, 0.9)';
    ctx.fillStyle = 'rgba(54, 62, 96, 0.9)';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.2, r * 0.095);

    if (opts.shattering) {
      ctx.beginPath();
      ctx.moveTo(-ex - r * 0.12, ey - r * 0.1);
      ctx.lineTo(-ex + r * 0.08, ey);
      ctx.lineTo(-ex - r * 0.12, ey + r * 0.1);
      ctx.moveTo(ex + r * 0.12, ey - r * 0.1);
      ctx.lineTo(ex - r * 0.08, ey);
      ctx.lineTo(ex + r * 0.12, ey + r * 0.1);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(-ex, ey, Math.max(1.3, r * 0.1), 0, Math.PI * 2);
      ctx.arc(ex, ey, Math.max(1.3, r * 0.1), 0, Math.PI * 2);
      ctx.fill();
      // Tiny horizontal sleepy mouth
      ctx.beginPath();
      ctx.moveTo(-r * 0.11, ey + r * 0.2);
      ctx.lineTo(r * 0.11, ey + r * 0.2);
      ctx.stroke();
    }

    if (opts.flashWhite > 0.01) {
      ctx.fillStyle = `rgba(255, 255, 255, ${opts.flashWhite.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawDanmakuOrbs(
    ctx: CanvasRenderingContext2D,
    topLineY: number,
    cs: number,
    engine: PuyoEngine,
  ): void {
    for (const orb of engine.danmakuOrbs) {
      if (orb.progress < 0) continue;
      const t = Math.min(1, orb.progress);
      const omt = 1 - t;
      const gx = omt * omt * orb.startX + 2 * omt * t * orb.ctrlX + t * t * orb.targetX;
      const gy = omt * omt * orb.startY + 2 * omt * t * orb.ctrlY + t * t * orb.targetY;
      const px = gx * cs;
      const py = topLineY + gy * cs;
      const rad = orb.radius * cs;

      ctx.save();
      // Luminous comet trail
      if (orb.trail.length > 1) {
        for (let i = 1; i < orb.trail.length; i++) {
          const p0 = orb.trail[i - 1];
          const p1 = orb.trail[i];
          const frac = i / orb.trail.length;
          ctx.strokeStyle = orb.color;
          ctx.globalAlpha = frac * 0.68;
          ctx.lineWidth = Math.max(1.5, rad * 1.15 * frac);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p0.x * cs, topLineY + p0.y * cs);
          ctx.lineTo(p1.x * cs, topLineY + p1.y * cs);
          ctx.stroke();
        }
      }

      // Touhou glowing danmaku bullet (outer elemental halo + pure white core)
      ctx.globalAlpha = 0.95;
      const glow = ctx.createRadialGradient(px, py, rad * 0.15, px, py, rad * 1.9);
      glow.addColorStop(0, '#ffffff');
      glow.addColorStop(0.4, orb.color);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(px, py, rad * 1.9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = orb.coreColor;
      ctx.beginPath();
      ctx.arc(px, py, rad * 0.58, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawActiveSpellVfx(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    headerH: number,
    topLineY: number,
    cs: number,
    vfx: ActiveSpellVfx,
    elapsedMs: number,
  ): void {
    const p = Math.min(1, vfx.timer / Math.max(1, vfx.duration));
    const fade = p < 0.7 ? 1 : Math.max(0, 1 - (p - 0.7) / 0.3);

    ctx.save();

    if (vfx.character === 'reimu' && vfx.targetRows) {
      // 博丽灵梦 · 灵符「梦想封印」: Crimson-gold purification wave across top 2 occupied rows!
      for (const r of vfx.targetRows) {
        const y = this.rowToY(r);
        const bandH = cs * (0.95 + Math.sin(p * Math.PI) * 0.22);
        const cy = y + cs * 0.5;

        const g = ctx.createLinearGradient(0, cy - bandH * 0.5, 0, cy + bandH * 0.5);
        g.addColorStop(0, 'rgba(255, 76, 108, 0)');
        g.addColorStop(0.28, `rgba(232, 59, 84, ${(0.72 * fade).toFixed(3)})`);
        g.addColorStop(0.5, `rgba(255, 246, 200, ${(0.9 * fade).toFixed(3)})`);
        g.addColorStop(0.72, `rgba(232, 59, 84, ${(0.72 * fade).toFixed(3)})`);
        g.addColorStop(1, 'rgba(255, 76, 108, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, cy - bandH * 0.5, width, bandH);

        // Sweeping crimson-white Yin-Yang homing orbs & ofuda talismans across the row
        for (let i = 0; i < 4; i++) {
          const ox = ((p * 1.65 + i * 0.25) % 1.2 - 0.1) * width;
          const oy = cy + Math.sin(p * 12 + i * 1.9) * cs * 0.26;
          ctx.save();
          ctx.globalAlpha = fade * 0.92;
          ctx.translate(ox, oy);
          ctx.rotate(elapsedMs * 0.01 + i);
          const or = cs * 0.28;
          ctx.fillStyle = '#fff5f7';
          ctx.beginPath();
          ctx.arc(0, 0, or, -Math.PI / 2, Math.PI / 2);
          ctx.fill();
          ctx.fillStyle = '#d91e3b';
          ctx.beginPath();
          ctx.arc(0, 0, or, Math.PI / 2, (Math.PI * 3) / 2);
          ctx.fill();
          ctx.strokeStyle = '#ffe38e';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(0, 0, or, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    } else if (vfx.character === 'marisa') {
      // 雾雨魔理沙 · 魔炮「极限火花」: Dazzling full-height rainbow Master Spark through cols 2 & 3!
      const beamCenterX = 3 * cs; // Exact seam between col 2 and col 3
      const baseBeamW = cs * 2.08;
      const chargeT = Math.min(1, vfx.timer / Math.max(1, vfx.impactMs));

      // Spinning golden Hakkero ignition circle at bottom of cols 2 & 3
      ctx.save();
      ctx.translate(beamCenterX, height - cs * 0.65);
      ctx.rotate(elapsedMs * 0.008);
      ctx.globalAlpha = fade * 0.95;
      const hr = cs * (0.65 + chargeT * 0.62);
      ctx.strokeStyle = '#ffe980';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, hr, 0, Math.PI * 2);
      ctx.stroke();
      this.traceStar(ctx, 0, 0, 8, hr * 0.92, hr * 0.45);
      ctx.stroke();
      ctx.restore();

      if (vfx.timer >= vfx.impactMs * 0.65) {
        const beamPhase = Math.min(1, (vfx.timer - vfx.impactMs * 0.65) / 110);
        const pulseW = baseBeamW * (0.9 + 0.14 * Math.sin(elapsedMs * 0.06)) * beamPhase;
        const beamTop = headerH > 0 ? headerH * 0.25 : 0;

        // Outer blazing rainbow Master Spark prism aura!
        const prism = ctx.createLinearGradient(
          beamCenterX - pulseW * 0.72,
          0,
          beamCenterX + pulseW * 0.72,
          0,
        );
        prism.addColorStop(0, 'rgba(168, 85, 247, 0)');
        prism.addColorStop(0.14, `rgba(168, 85, 247, ${(0.65 * fade).toFixed(3)})`);
        prism.addColorStop(0.28, `rgba(41, 182, 246, ${(0.82 * fade).toFixed(3)})`);
        prism.addColorStop(0.42, `rgba(255, 224, 92, ${(0.95 * fade).toFixed(3)})`);
        prism.addColorStop(0.5, `rgba(255, 255, 255, ${(1.0 * fade).toFixed(3)})`);
        prism.addColorStop(0.58, `rgba(255, 224, 92, ${(0.95 * fade).toFixed(3)})`);
        prism.addColorStop(0.72, `rgba(255, 107, 139, ${(0.82 * fade).toFixed(3)})`);
        prism.addColorStop(0.86, `rgba(168, 85, 247, ${(0.65 * fade).toFixed(3)})`);
        prism.addColorStop(1, 'rgba(168, 85, 247, 0)');

        ctx.fillStyle = prism;
        ctx.fillRect(beamCenterX - pulseW * 0.72, beamTop, pulseW * 1.44, height - beamTop);

        // Blinding white laser core
        const coreW = pulseW * 0.44;
        ctx.fillStyle = `rgba(255, 255, 255, ${(0.92 * fade).toFixed(3)})`;
        ctx.fillRect(beamCenterX - coreW * 0.5, beamTop, coreW, height - beamTop);

        // Upward shooting star streaks inside Master Spark
        ctx.fillStyle = `rgba(255, 252, 210, ${(0.88 * fade).toFixed(3)})`;
        for (let i = 0; i < 9; i++) {
          const sx = beamCenterX + Math.sin(i * 2.7 + elapsedMs * 0.01) * (pulseW * 0.36);
          const sy = height - (((elapsedMs * 0.9 + i * 75) % (height - beamTop)) + 10);
          this.traceStar(ctx, sx, sy, 5, cs * 0.24, cs * 0.1);
          ctx.fill();
        }
      }
    } else if (vfx.character === 'patchouli') {
      // 帕秋莉 · 七曜「贤者之石」: Grand 7-element alchemy circle + transmutation beams!
      const centerX = width * 0.5;
      const centerY = topLineY + (height - topLineY) * 0.5;
      const circleR = Math.min(width * 0.4, (height - topLineY) * 0.25) * (0.75 + p * 0.32);
      const sevenColors = [
        '#ff6b8b', // Fire
        '#4ecbff', // Water
        '#57e393', // Wood
        '#ffe066', // Metal
        '#d9965b', // Earth
        '#ffd480', // Sun
        '#d896ff', // Moon
      ];

      ctx.save();
      ctx.globalAlpha = fade * 0.88;
      ctx.translate(centerX, centerY);
      ctx.rotate(elapsedMs * 0.0028);

      // Arcane double alchemy ring
      ctx.strokeStyle = '#e5b8ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, circleR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = '#ffd97d';
      ctx.beginPath();
      ctx.arc(0, 0, circleR * 0.76, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // 7 glowing orbiting elemental jewels
      for (let i = 0; i < 7; i++) {
        const a = (Math.PI * 2 * i) / 7;
        const jx = Math.cos(a) * circleR;
        const jy = Math.sin(a) * circleR;
        ctx.fillStyle = sevenColors[i];
        ctx.beginPath();
        ctx.arc(jx, jy, cs * 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(jx, jy, cs * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Luminous transmutation rays into every transformed cell!
      if (vfx.transformedCells && vfx.toColor !== undefined) {
        const destLight = PUYO_THEMES[vfx.toColor].light;
        for (const tc of vfx.transformedCells) {
          const tx = tc.col * cs + cs * 0.5;
          const ty = this.rowToY(tc.row) + cs * 0.5;
          ctx.save();
          ctx.globalAlpha = fade * 0.72;
          ctx.strokeStyle = destLight;
          ctx.lineWidth = Math.max(1.5, cs * 0.08 * (1 - p * 0.5));
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(tx, ty);
          ctx.stroke();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(tx, ty, cs * (0.32 + p * 0.45), 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    ctx.restore();
  }

  /**
   * Crisp 「Spell Card Bonus! 收卡成功」 victory flash overlay upon defeating a BOSS!
   */
  private drawBossBonusBanner(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    topLineY: number,
    cs: number,
    engine: PuyoEngine,
  ): void {
    const b = engine.bossBonusBanner;
    if (!b) return;
    const t = b.timer / b.duration;
    let alpha = 1;
    let scale = 1;
    if (t < 0.12) {
      const p = t / 0.12;
      alpha = p;
      scale = 0.8 + 0.25 * (1 - Math.pow(1 - p, 3));
    } else if (t < 0.2) {
      scale = 1.05 - ((t - 0.12) / 0.08) * 0.05;
    } else if (t > 0.78) {
      alpha = Math.max(0, 1 - (t - 0.78) / 0.22);
    }

    const cy = topLineY + (height - topLineY) * 0.3;
    const h = Math.max(62, cs * 2.15);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(width * 0.5, cy);
    ctx.scale(scale, scale);

    // Radiant gold-crimson victory ribbon
    ctx.shadowColor = '#f5b82e';
    ctx.shadowBlur = 22;
    const bg = ctx.createLinearGradient(-width * 0.52, 0, width * 0.52, 0);
    bg.addColorStop(0, 'rgba(32, 8, 28, 0.92)');
    bg.addColorStop(0.5, 'rgba(78, 18, 42, 0.97)');
    bg.addColorStop(1, 'rgba(32, 8, 28, 0.92)');
    ctx.fillStyle = bg;
    ctx.fillRect(-width * 0.52, -h * 0.5, width * 1.04, h);
    ctx.shadowBlur = 0;

    // Double golden trim lines
    ctx.fillStyle = '#ffe078';
    ctx.fillRect(-width * 0.52, -h * 0.5, width * 1.04, 3);
    ctx.fillRect(-width * 0.52, h * 0.5 - 3, width * 1.04, 3);

    // Kicker: Spell Card Bonus!
    const kickerFont = Math.max(9.5, Math.round(cs * 0.28));
    ctx.font = `900 ${kickerFont}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffe588';
    ctx.fillText('★ SPELL CARD BONUS! ★', 0, -h * 0.28);

    // Main Bold Title: 收卡成功！
    const mainFont = Math.max(15, Math.round(cs * 0.5));
    ctx.font = `900 ${mainFont}px "Noto Serif SC", "Songti SC", system-ui, serif`;
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = 'rgba(24, 6, 18, 0.9)';
    ctx.strokeText('收卡成功！', 0, h * 0.04);
    ctx.fillStyle = '#fffef2';
    ctx.fillText('收卡成功！', 0, h * 0.04);

    // Sub line: Boss defeated + Bonus score
    const subFont = Math.max(9.5, Math.round(cs * 0.27));
    ctx.font = `800 ${subFont}px system-ui, sans-serif`;
    ctx.fillStyle = '#ffd166';
    ctx.fillText(
      `击破 ${b.bossName} · +${b.bonus.toLocaleString()} PTS`,
      0,
      h * 0.32,
    );

    ctx.restore();
  }

  private fillRoundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fill: string | CanvasGradient,
  ): void {
    const rad = Math.min(r, w * 0.5, h * 0.5);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
    ctx.fill();
  }

  private strokeRoundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    const rad = Math.min(r, w * 0.5, h * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
    ctx.stroke();
  }

  // ==================== NEXT PREVIEW CANVAS ====================

  public renderPreview(
    canvas: HTMLCanvasElement,
    queue: readonly PuyoPairColors[],
    elapsedMs = 0,
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(64, Math.round(rect.width || 96));
    const h = Math.max(80, Math.round(rect.height || 92));

    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    // Primary NEXT pair (left/center-left, larger)
    const next1 = queue[0];
    const next2 = queue[1];
    const r1 = Math.min(w * 0.2, h * 0.195);
    const x1 = next2 ? w * 0.34 : w * 0.5;
    const y1Top = h * 0.29;
    const y1Bot = y1Top + r1 * 2.04;

    if (next1) {
      this.drawStandalonePuyo(ctx, x1, y1Top, r1, next1.child, {
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        blinking: false,
        surprised: false,
        excited: false,
        flashWhite: 0,
        isPivot: false,
        lockProgress: 0,
        lookX: 0,
        lookY: 0,
        nervous: false,
        elapsedMs,
      });
      this.drawStandalonePuyo(ctx, x1, y1Bot, r1, next1.pivot, {
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        blinking: false,
        surprised: false,
        excited: false,
        flashWhite: 0,
        isPivot: true,
        lockProgress: 0,
        lookX: 0,
        lookY: 0,
        nervous: false,
        elapsedMs,
      });
    }

    // Secondary NEXT 2 pair (right side, smaller)
    if (next2) {
      const r2 = r1 * 0.72;
      const x2 = w * 0.77;
      const y2Top = h * 0.42;
      const y2Bot = y2Top + r2 * 2.04;

      ctx.fillStyle = 'rgba(245, 204, 102, 0.72)';
      ctx.font = `800 ${Math.max(9, Math.round(r2 * 0.72))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('NEXT 2', x2, y2Top - r2 * 1.35);

      this.drawStandalonePuyo(ctx, x2, y2Top, r2, next2.child, {
        scaleX: 1,
        scaleY: 1,
        alpha: 0.92,
        blinking: false,
        surprised: false,
        excited: false,
        flashWhite: 0,
        isPivot: false,
        lockProgress: 0,
        lookX: 0,
        lookY: 0,
        nervous: false,
        elapsedMs,
      });
      this.drawStandalonePuyo(ctx, x2, y2Bot, r2, next2.pivot, {
        scaleX: 1,
        scaleY: 1,
        alpha: 0.92,
        blinking: false,
        surprised: false,
        excited: false,
        flashWhite: 0,
        isPivot: false,
        lockProgress: 0,
        lookX: 0,
        lookY: 0,
        nervous: false,
        elapsedMs,
      });
    }

    ctx.restore();
  }

  private traceStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spikes: number,
    outerR: number,
    innerR: number,
  ): void {
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
      rot += step;
    }
    ctx.closePath();
  }
}
