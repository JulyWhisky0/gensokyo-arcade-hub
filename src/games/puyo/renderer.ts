import { PuyoEngine } from './engine';
import {
  COLS,
  DEATH_COL,
  DEATH_ROW,
  HIDDEN_ROWS,
  PUYO_THEMES,
  PuyoColor,
  PuyoPairColors,
  PuyoTheme,
  TOTAL_ROWS,
  VISIBLE_ROWS,
} from './types';

export const BUFFER_PEEK_CELLS = 0.55;
export const BOARD_ASPECT_ROWS = VISIBLE_ROWS + BUFFER_PEEK_CELLS;

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

  public resizeBoard(canvas: HTMLCanvasElement, cellSize: number): void {
    this.cellSize = Math.max(16, Math.floor(cellSize));
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = this.cellSize * COLS;
    const cssH = Math.round(this.cellSize * BOARD_ASPECT_ROWS);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    const targetW = Math.round(cssW * this.dpr);
    const targetH = Math.round(cssH * this.dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
  }

  private rowToY(row: number): number {
    return (row - HIDDEN_ROWS + BUFFER_PEEK_CELLS) * this.cellSize;
  }

  public renderBoard(canvas: HTMLCanvasElement, engine: PuyoEngine): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cs = this.cellSize;
    const width = cs * COLS;
    const height = Math.round(cs * BOARD_ASPECT_ROWS);
    const topLineY = BUFFER_PEEK_CELLS * cs;

    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // Screen shake on chains (smooth damped oscillation)
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

    // 2. Crimson Shrine Seal X at death cell (col 2, top visible row)
    this.drawDeathSeal(ctx, DEATH_COL * cs + cs / 2, topLineY + cs / 2, cs, engine);

    // 3. Hard-drop luminous trails
    for (const tr of engine.dropTrails) {
      const ratio = 1 - tr.life / tr.maxLife;
      const x = tr.col * cs + cs * 0.16;
      const y1 = this.rowToY(tr.fromRow) + cs * 0.5;
      const y2 = this.rowToY(tr.toRow) + cs * 0.5;
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
        this.rowToY(g.row) + cs / 2,
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
      this.drawStandalonePuyo(
        ctx,
        c * cs + cs / 2,
        this.rowToY(0) + cs / 2,
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

    // 5b. Settled Visible Puyos — Seamless Per-Color Concave Metaball Gel Clusters!
    this.drawSettledMetaballClusters(ctx, cs, engine, clearingSet, clearProgress);

    // 6. Independently falling puyos during gravity cascade
    for (const f of engine.fallingPuyos) {
      const stretch = Math.min(0.16, f.vy * 3.8);
      this.drawStandalonePuyo(
        ctx,
        f.col * cs + cs / 2,
        this.rowToY(f.y) + cs / 2,
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

    // 7. Active player-controlled pair (60fps smoothly interpolated X, Y, & orbital arc!)
    if (engine.activePair && engine.phase === 'falling') {
      this.drawActivePair(ctx, cs, engine);
    }

    // 8. Burst particles & glowing rings
    this.drawParticles(ctx, topLineY, cs, engine);

    // 9. Floating chain & score popups
    this.drawFloatingTexts(ctx, topLineY, cs, engine);

    // 10. Dramatic Diagonal Touhou Spell Card Cut-in Banner!
    if (engine.spellFlash > 0.01) {
      ctx.save();
      ctx.globalAlpha = engine.spellFlash * 0.24;
      const fGrad = ctx.createLinearGradient(0, 0, width, height);
      fGrad.addColorStop(0, '#fff4c2');
      fGrad.addColorStop(0.5, engine.spellBanner?.primaryColor ?? '#e83b54');
      fGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = fGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
    if (engine.spellBanner) {
      this.drawSpellBanner(ctx, width, height, cs, engine);
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
        infoGrid[r][c] = info;
        byColor[cell.color].push(info);
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

    const bannerY = height * 0.28;
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

    // Caster & Chain tag
    const smallSize = Math.max(9.5, Math.round(cs * 0.29));
    ctx.font = `800 ${smallSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = b.secondaryColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `✦ ${b.caster}  ·  ${b.chain} CHAIN ✦`,
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
