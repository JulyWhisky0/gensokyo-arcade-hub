import { PuyoEngine } from './engine';
import {
  COLS,
  DEATH_COL,
  HIDDEN_ROWS,
  PUYO_THEMES,
  PuyoColor,
  PuyoPairColors,
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
}

const BG_STARS: readonly StarSpec[] = Array.from({ length: 24 }, (_, i) => ({
  x: ((i * 73 + 19) % 100) / 100,
  y: ((i * 41 + 11) % 100) / 100,
  r: 0.7 + (i % 3) * 0.45,
  phase: i * 1.37,
  speed: 0.0014 + (i % 4) * 0.0005,
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

    // Subtle screen shake on big chains
    if (engine.shakeTime > 0) {
      const ratio = Math.min(1, engine.shakeTime / 240);
      const mag = engine.shakeMagnitude * ratio;
      ctx.translate(
        (Math.random() - 0.5) * mag * 2,
        (Math.random() - 0.5) * mag * 2,
      );
    }

    // 1. Magical Forest night background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#120d29');
    bgGrad.addColorStop(0.55, '#19133a');
    bgGrad.addColorStop(1, '#221542');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Twinkling stars
    for (const s of BG_STARS) {
      const tw = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(engine.elapsedMs * s.speed + s.phase));
      ctx.fillStyle = `rgba(255, 240, 185, ${tw.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(s.x * width, topLineY + s.y * (height - topLineY), s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Danger column crimson aura when col 2 is near top
    if (engine.dangerRatio > 0 && engine.phase !== 'menu') {
      const pulse = 0.5 + 0.5 * Math.sin(engine.elapsedMs * 0.01);
      const alpha = engine.dangerRatio * (0.12 + 0.14 * pulse);
      const dGrad = ctx.createLinearGradient(0, topLineY, 0, topLineY + cs * 5);
      dGrad.addColorStop(0, `rgba(232, 59, 84, ${alpha.toFixed(3)})`);
      dGrad.addColorStop(1, 'rgba(232, 59, 84, 0)');
      ctx.fillStyle = dGrad;
      ctx.fillRect(DEATH_COL * cs, topLineY, cs, cs * 5);
    }

    // Subtle shrine lattice grid
    ctx.strokeStyle = 'rgba(240, 194, 89, 0.08)';
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

    // Hidden buffer top zone tint + golden boundary line
    ctx.fillStyle = 'rgba(10, 6, 24, 0.42)';
    ctx.fillRect(0, 0, width, topLineY);
    const lineGrad = ctx.createLinearGradient(0, 0, width, 0);
    lineGrad.addColorStop(0, 'rgba(240, 194, 89, 0.2)');
    lineGrad.addColorStop(0.5, 'rgba(232, 59, 84, 0.72)');
    lineGrad.addColorStop(1, 'rgba(240, 194, 89, 0.2)');
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, topLineY);
    ctx.lineTo(width, topLineY);
    ctx.stroke();

    // 2. Crimson Shrine Seal X at death cell (col 2, top visible row)
    this.drawDeathSeal(ctx, DEATH_COL * cs + cs / 2, topLineY + cs / 2, cs, engine);

    // 3. Drop trails
    for (const tr of engine.dropTrails) {
      const ratio = 1 - tr.life / tr.maxLife;
      const x = tr.col * cs + cs * 0.2;
      const y1 = this.rowToY(tr.fromRow) + cs * 0.5;
      const y2 = this.rowToY(tr.toRow) + cs * 0.5;
      if (y2 <= y1) continue;
      const g = ctx.createLinearGradient(0, y1, 0, y2);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, tr.color);
      ctx.save();
      ctx.globalAlpha = ratio * 0.36;
      ctx.fillStyle = g;
      ctx.fillRect(x, y1, cs * 0.6, y2 - y1);
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

    // 5. Settled Puyos — Pass A: Organic fused bridges for same-color orthogonal neighbors
    for (let r = HIDDEN_ROWS; r < TOTAL_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = engine.grid[r][c];
        if (!cell) continue;
        const isClr = clearingSet.has(`${c},${r}`);
        if (isClr && clearProgress > 0.72) continue;

        const cx = c * cs + cs / 2;
        const cy = this.rowToY(r) + cs / 2;
        const right = c + 1 < COLS ? engine.grid[r][c + 1] : null;
        const down = r + 1 < TOTAL_ROWS ? engine.grid[r + 1][c] : null;

        if (right && right.color === cell.color) {
          this.drawBridge(ctx, cx, cy, cx + cs, cy, cs, cell.color, isClr, clearProgress);
        }
        if (down && down.color === cell.color) {
          this.drawBridge(ctx, cx, cy, cx, cy + cs, cs, cell.color, isClr, clearProgress);
        }
      }
    }

    // 5b. Settled Puyos — Pass B: Glossy spirit bodies, Touhou motifs & expressive eyes
    const isBlinking = engine.elapsedMs % 4200 > 4060;
    for (let r = 0; r < TOTAL_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = engine.grid[r][c];
        if (!cell) continue;
        const isClr = clearingSet.has(`${c},${r}`);
        const inBuffer = r < HIDDEN_ROWS;

        let sx = 1;
        let sy = 1;
        if (cell.squish > 0.01) {
          const wave = Math.sin(cell.squishPhase) * cell.squish * 0.16;
          sx = 1 + wave;
          sy = 1 - wave;
        }
        if (isClr) {
          const popScale =
            clearProgress < 0.68
              ? 1 + Math.sin(clearProgress * Math.PI * 5) * 0.09 + clearProgress * 0.14
              : Math.max(0, 1.15 * (1 - (clearProgress - 0.68) / 0.32));
          sx *= popScale;
          sy *= popScale;
        }

        const trembleX =
          engine.dangerRatio > 0.35 && !isClr
            ? Math.sin(engine.elapsedMs * 0.04 + c * 1.7 + r) * engine.dangerRatio * 1.2
            : 0;

        this.drawPuyoBody(
          ctx,
          c * cs + cs / 2 + trembleX,
          this.rowToY(r) + cs / 2,
          cs * 0.46,
          cell.color,
          {
            scaleX: sx,
            scaleY: sy,
            alpha: inBuffer ? 0.62 : 1,
            blinking: isBlinking && !isClr,
            surprised: isClr,
            flashWhite: isClr ? Math.max(0, Math.sin(clearProgress * Math.PI * 7)) * 0.72 : 0,
            isPivot: false,
            connectMask: inBuffer
              ? 0
              : this.getConnectMask(engine, c, r, cell.color),
          },
        );
      }
    }

    // 6. Independently falling puyos during gravity split
    for (const f of engine.fallingPuyos) {
      const stretch = Math.min(0.14, f.vy * 3.5);
      this.drawPuyoBody(
        ctx,
        f.col * cs + cs / 2,
        this.rowToY(f.y) + cs / 2,
        cs * 0.46,
        f.color,
        {
          scaleX: 1 - stretch * 0.6,
          scaleY: 1 + stretch,
          alpha: 1,
          blinking: false,
          surprised: false,
          flashWhite: 0,
          isPivot: false,
          connectMask: 0,
        },
      );
    }

    // 7. Active player-controlled pair
    if (engine.activePair && engine.phase === 'falling') {
      const p = engine.activePair;
      const basePivotX = (p.renderCol + p.bumpOffsetX) * cs + cs / 2;
      const basePivotY = this.rowToY(p.pivotRow + p.fallFrac) + cs / 2;
      // Orbital child position using smooth renderAngle (0 = Up, PI/2 = Right, PI = Down, -PI/2 = Left)
      const childX = basePivotX + Math.sin(p.renderAngle) * cs;
      const childY = basePivotY - Math.cos(p.renderAngle) * cs;

      // Faint spirit tether between active pair
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 236, 179, 0.35)';
      ctx.lineWidth = Math.max(2, cs * 0.08);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(basePivotX, basePivotY);
      ctx.lineTo(childX, childY);
      ctx.stroke();
      ctx.restore();

      const lockPulse = p.lockTimer > 0 ? 0.16 + 0.14 * Math.sin(engine.elapsedMs * 0.03) : 0;

      // Draw child first, then pivot with subtle axis indicator ring
      this.drawPuyoBody(ctx, childX, childY, cs * 0.46, p.childColor, {
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        blinking: false,
        surprised: false,
        flashWhite: lockPulse,
        isPivot: false,
        connectMask: 0,
      });

      this.drawPuyoBody(ctx, basePivotX, basePivotY, cs * 0.46, p.pivotColor, {
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        blinking: false,
        surprised: false,
        flashWhite: lockPulse,
        isPivot: true,
        connectMask: 0,
      });
    }

    // 8. Burst particles
    for (const pt of engine.particles) {
      const px = pt.x * cs;
      const py = topLineY + pt.y * cs;
      ctx.save();
      ctx.globalAlpha = Math.max(0, pt.alpha);
      ctx.translate(px, py);
      ctx.rotate(pt.rotation);

      if (pt.shape === 'ring') {
        ctx.strokeStyle = pt.color;
        ctx.lineWidth = Math.max(1.5, cs * 0.06 * pt.alpha);
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

    // 9. Floating chain & score popups
    for (const ft of engine.floatingTexts) {
      const progress = ft.life / ft.maxLife;
      const alpha = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;
      const pop = progress < 0.14 ? 0.7 + (progress / 0.14) * 0.42 : 1.0;
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

    // 10. Touhou Spell Card Cut-in Banner!
    if (engine.spellBanner) {
      this.drawSpellBanner(ctx, width, height, cs, engine);
    }

    ctx.restore();
  }

  public renderPreview(
    canvas: HTMLCanvasElement,
    queue: readonly PuyoPairColors[],
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(64, Math.round(rect.width || 96));
    const h = Math.max(96, Math.round(rect.height || 140));

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
    const r1 = Math.min(w * 0.21, h * 0.19);
    const x1 = next2 ? w * 0.34 : w * 0.5;
    const y1Top = h * 0.3;
    const y1Bot = y1Top + r1 * 2.02;

    if (next1) {
      this.drawPuyoBody(ctx, x1, y1Top, r1, next1.child, {
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        blinking: false,
        surprised: false,
        flashWhite: 0,
        isPivot: false,
        connectMask: 0,
      });
      this.drawPuyoBody(ctx, x1, y1Bot, r1, next1.pivot, {
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        blinking: false,
        surprised: false,
        flashWhite: 0,
        isPivot: true,
        connectMask: 0,
      });
    }

    // Secondary NEXT 2 pair (right side, smaller)
    if (next2) {
      const r2 = r1 * 0.72;
      const x2 = w * 0.77;
      const y2Top = h * 0.42;
      const y2Bot = y2Top + r2 * 2.02;

      ctx.fillStyle = 'rgba(240, 194, 89, 0.58)';
      ctx.font = `700 ${Math.max(9, Math.round(r2 * 0.72))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('NEXT 2', x2, y2Top - r2 * 1.35);

      this.drawPuyoBody(ctx, x2, y2Top, r2, next2.child, {
        scaleX: 1,
        scaleY: 1,
        alpha: 0.9,
        blinking: false,
        surprised: false,
        flashWhite: 0,
        isPivot: false,
        connectMask: 0,
      });
      this.drawPuyoBody(ctx, x2, y2Bot, r2, next2.pivot, {
        scaleX: 1,
        scaleY: 1,
        alpha: 0.9,
        blinking: false,
        surprised: false,
        flashWhite: 0,
        isPivot: false,
        connectMask: 0,
      });
    }

    ctx.restore();
  }

  private getConnectMask(
    engine: PuyoEngine,
    c: number,
    r: number,
    color: PuyoColor,
  ): number {
    let mask = 0;
    if (r > HIDDEN_ROWS && engine.grid[r - 1][c]?.color === color) mask |= 1; // Up
    if (c + 1 < COLS && engine.grid[r][c + 1]?.color === color) mask |= 2; // Right
    if (r + 1 < TOTAL_ROWS && engine.grid[r + 1][c]?.color === color) mask |= 4; // Down
    if (c > 0 && engine.grid[r][c - 1]?.color === color) mask |= 8; // Left
    return mask;
  }

  private drawDeathSeal(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    cs: number,
    engine: PuyoEngine,
  ): void {
    const pulse = 0.5 + 0.5 * Math.sin(engine.elapsedMs * (0.005 + engine.dangerRatio * 0.01));
    const r = cs * 0.34;
    ctx.save();
    ctx.translate(cx, cy);

    // Subtle shrine seal circle
    ctx.strokeStyle = `rgba(232, 59, 84, ${(0.34 + engine.dangerRatio * 0.45 + pulse * 0.14).toFixed(3)})`;
    ctx.lineWidth = Math.max(1.4, cs * 0.055);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    // Inner crimson X mark
    const arm = r * 0.56;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-arm, -arm);
    ctx.lineTo(arm, arm);
    ctx.moveTo(arm, -arm);
    ctx.lineTo(-arm, arm);
    ctx.stroke();

    ctx.restore();
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
    const pulse = 0.78 + 0.22 * Math.sin(elapsedMs * 0.008);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = 0.32 * pulse;
    ctx.fillStyle = theme.base;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.78 * pulse;
    ctx.strokeStyle = theme.light;
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.94, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawBridge(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    cs: number,
    color: PuyoColor,
    isClearing: boolean,
    clearProgress: number,
  ): void {
    const theme = PUYO_THEMES[color];
    const thickness = cs * (isClearing ? 0.52 * (1 + clearProgress * 0.12) : 0.56);
    const rimThickness = thickness + Math.max(2.6, cs * 0.09);

    ctx.save();
    ctx.lineCap = 'round';

    // Outer rim stroke
    ctx.strokeStyle = theme.rim;
    ctx.lineWidth = rimThickness;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Inner fused gel body
    ctx.strokeStyle = theme.base;
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Soft glossy inner core line
    ctx.strokeStyle = theme.light;
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = thickness * 0.38;
    ctx.beginPath();
    ctx.moveTo(x1, y1 - cs * 0.06);
    ctx.lineTo(x2, y2 - cs * 0.06);
    ctx.stroke();
    ctx.restore();
  }

  private drawPuyoBody(
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
      flashWhite: number;
      isPivot: boolean;
      connectMask: number;
    },
  ): void {
    if (opts.scaleX <= 0.02 || opts.scaleY <= 0.02) return;
    const theme = PUYO_THEMES[color];

    ctx.save();
    ctx.globalAlpha = opts.alpha;
    ctx.translate(cx, cy);
    ctx.scale(opts.scaleX, opts.scaleY);

    // Subtle pivot indicator aura for active piece
    if (opts.isPivot) {
      ctx.strokeStyle = 'rgba(255, 240, 170, 0.85)';
      ctx.lineWidth = Math.max(1.5, r * 0.12);
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.11, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Main jelly sphere with radial gradient
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.34, r * 0.1, 0, 0, r * 1.05);
    grad.addColorStop(0, theme.light);
    grad.addColorStop(0.42, theme.base);
    grad.addColorStop(1, theme.dark);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Rim outline (lighter where fused to neighbors so connection looks seamless)
    ctx.strokeStyle = theme.rim;
    ctx.lineWidth = Math.max(1.3, r * 0.11);
    ctx.stroke();

    // If fused to neighbors, repaint subtle soft inner lobe bridges to cover inner seams
    if (opts.connectMask !== 0) {
      ctx.fillStyle = theme.base;
      const bw = r * 0.54;
      if (opts.connectMask & 1) ctx.fillRect(-bw, -r * 1.06, bw * 2, r * 0.6);
      if (opts.connectMask & 2) ctx.fillRect(r * 0.45, -bw, r * 0.62, bw * 2);
      if (opts.connectMask & 4) ctx.fillRect(-bw, r * 0.45, bw * 2, r * 0.62);
      if (opts.connectMask & 8) ctx.fillRect(-r * 1.06, -bw, r * 0.6, bw * 2);
    }

    // Specular glossy highlight (top-left)
    ctx.save();
    ctx.translate(-r * 0.34, -r * 0.4);
    ctx.rotate(-0.52);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.56)';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.28, r * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Touhou Character Motif (subtle badge at bottom/forehead for charm & colorblind distinction)
    this.drawMotif(ctx, r, theme.motif);

    // Cute expressive anime eyes
    this.drawEyes(ctx, r, color, opts.blinking, opts.surprised);

    // Clearing / lock flash overlay
    if (opts.flashWhite > 0.01) {
      ctx.fillStyle = `rgba(255, 255, 255, ${opts.flashWhite.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawMotif(
    ctx: CanvasRenderingContext2D,
    r: number,
    motif: 'yinyang' | 'crystal' | 'star' | 'leaf' | 'moon',
  ): void {
    ctx.save();
    ctx.globalAlpha = 0.55;
    if (motif === 'yinyang') {
      // Reimu mini yin-yang dot near forehead
      const mr = r * 0.2;
      ctx.translate(0, -r * 0.46);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, mr, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
      ctx.fillStyle = '#750c1d';
      ctx.beginPath();
      ctx.arc(0, 0, mr, Math.PI / 2, (Math.PI * 3) / 2);
      ctx.fill();
    } else if (motif === 'crystal') {
      // Cirno 6-spoke ice crystal
      ctx.translate(0, -r * 0.44);
      ctx.strokeStyle = '#e0f9ff';
      ctx.lineWidth = Math.max(1, r * 0.08);
      const s = r * 0.22;
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * -s, Math.sin(a) * -s);
        ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
        ctx.stroke();
      }
    } else if (motif === 'star') {
      // Marisa 5-point golden star
      ctx.fillStyle = '#fffbe0';
      this.traceStar(ctx, 0, -r * 0.46, 5, r * 0.25, r * 0.11);
      ctx.fill();
    } else if (motif === 'leaf') {
      // Sanae wind-leaf swirl
      ctx.strokeStyle = '#d9ffea';
      ctx.lineWidth = Math.max(1.1, r * 0.09);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, -r * 0.44, r * 0.18, Math.PI * 0.2, Math.PI * 1.55);
      ctx.stroke();
    } else {
      // Patchouli crescent moon
      ctx.translate(0, -r * 0.45);
      ctx.fillStyle = '#f3dcff';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.22, 0.35, Math.PI * 1.75);
      ctx.arc(r * 0.09, -r * 0.02, r * 0.17, Math.PI * 1.7, 0.4, true);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private drawEyes(
    ctx: CanvasRenderingContext2D,
    r: number,
    color: PuyoColor,
    blinking: boolean,
    surprised: boolean,
  ): void {
    const ex = r * 0.3;
    const ey = r * 0.14;
    const ew = r * 0.19;
    const eh = r * 0.25;

    if (surprised) {
      // Sparkling wide O_O eyes during chain clear
      for (const side of [-1, 1]) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(side * ex, ey, eh * 1.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#240b2e';
        ctx.beginPath();
        ctx.arc(side * ex, ey, eh * 0.56, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(side * ex - eh * 0.22, ey - eh * 0.24, eh * 0.24, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    if (blinking) {
      ctx.strokeStyle = '#1b0d24';
      ctx.lineWidth = Math.max(1.4, r * 0.11);
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * ex - ew * 0.8, ey);
        ctx.quadraticCurveTo(side * ex, ey + eh * 0.35, side * ex + ew * 0.8, ey);
        ctx.stroke();
      }
      return;
    }

    // Sanae cheerful smiling curved eyes
    if (color === 3) {
      ctx.strokeStyle = '#07361d';
      ctx.lineWidth = Math.max(1.6, r * 0.12);
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(side * ex, ey + eh * 0.2, ew * 0.95, Math.PI * 1.12, Math.PI * 1.88);
        ctx.stroke();
      }
      return;
    }

    // Classic glossy anime eyes for Reimu / Cirno / Marisa / Patchouli
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(side * ex, ey, ew, eh, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1c0b26';
      ctx.beginPath();
      ctx.ellipse(side * ex, ey + eh * 0.08, ew * 0.62, eh * 0.64, 0, 0, Math.PI * 2);
      ctx.fill();

      // Catchlight dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(side * ex - ew * 0.22, ey - eh * 0.24, ew * 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Cirno cheeky brow slant / Patchouli calm lid
      if (color === 1) {
        ctx.strokeStyle = '#07325c';
        ctx.lineWidth = Math.max(1.2, r * 0.09);
        ctx.beginPath();
        ctx.moveTo(side * ex - side * ew * 0.9, ey - eh * 0.95);
        ctx.lineTo(side * ex + side * ew * 0.8, ey - eh * 1.3);
        ctx.stroke();
      } else if (color === 4) {
        ctx.strokeStyle = '#331059';
        ctx.lineWidth = Math.max(1.2, r * 0.09);
        ctx.beginPath();
        ctx.moveTo(side * ex - ew * 0.95, ey - eh * 0.55);
        ctx.lineTo(side * ex + ew * 0.95, ey - eh * 0.55);
        ctx.stroke();
      }
    }
  }

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
    let slideIn = 1;
    let alpha = 1;
    if (t < 0.14) {
      slideIn = t / 0.14;
      alpha = slideIn;
    } else if (t > 0.78) {
      alpha = Math.max(0, 1 - (t - 0.78) / 0.22);
    }

    const bannerY = height * 0.26;
    const bannerH = Math.max(46, cs * 1.55);
    const offsetX = (1 - slideIn) * width * 0.35;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(offsetX, 0);

    // Dramatic dark silk ribbon with glowing borders
    const bg = ctx.createLinearGradient(0, bannerY - bannerH / 2, width, bannerY + bannerH / 2);
    bg.addColorStop(0, 'rgba(14, 8, 34, 0.92)');
    bg.addColorStop(0.5, 'rgba(32, 16, 58, 0.95)');
    bg.addColorStop(1, 'rgba(14, 8, 34, 0.88)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, bannerY - bannerH / 2, width, bannerH);

    // Glowing top & bottom gold/elemental trim
    ctx.fillStyle = b.primaryColor;
    ctx.fillRect(0, bannerY - bannerH / 2, width, 2.5);
    ctx.fillRect(0, bannerY + bannerH / 2 - 2.5, width, 2.5);

    // Caster & Chain tag
    const smallSize = Math.max(10, Math.round(cs * 0.3));
    ctx.font = `700 ${smallSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = b.secondaryColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `✦ ${b.caster} · ${b.chain} CHAIN ✦`,
      width / 2,
      bannerY - bannerH * 0.22,
    );

    // Spell Card Name
    const titleSize = Math.max(13, Math.round(cs * 0.43));
    ctx.font = `900 ${titleSize}px "Noto Serif SC", "Songti SC", system-ui, serif`;
    ctx.shadowColor = b.primaryColor;
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(b.title, width / 2, bannerY + bannerH * 0.16);

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
