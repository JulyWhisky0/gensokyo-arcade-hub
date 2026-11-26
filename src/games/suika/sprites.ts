import { ORB_TIERS } from './tiers';

const TAU = Math.PI * 2;
/** Padding multiplier around orb radius so hats, wings, horns & bows never clip in cached sprites */
const SPRITE_PAD_RATIO = 1.62;

export interface CachedOrbSprite {
  canvas: HTMLCanvasElement;
  logicalHalf: number;
  scale: number;
}

export interface OrbDrawOptions {
  scaleX?: number;
  scaleY?: number;
  flash?: number;
  time?: number;
  iconMode?: boolean;
}

/**
 * High-DPI offscreen sprite cache for all 11 Touhou chibi orbs.
 * Pre-renders every orb once on init and only rebuilds when DPR/canvas scale bucket changes.
 */
export class OrbSpriteCache {
  private sprites: Array<CachedOrbSprite | null> = new Array(ORB_TIERS.length).fill(null);
  private currentBucketScale = 0;

  ensureScale(pixelScale: number): void {
    const quantized = Math.max(1, Math.min(3, Math.ceil(pixelScale * 4) / 4));
    if (quantized === this.currentBucketScale && this.sprites[0] !== null) return;
    this.currentBucketScale = quantized;
    this.rebuildAll(quantized);
  }

  get(tier: number): CachedOrbSprite | null {
    if (this.currentBucketScale === 0) {
      this.ensureScale(Math.min(window.devicePixelRatio || 1, 2));
    }
    return this.sprites[tier] ?? this.sprites[0] ?? null;
  }

  private rebuildAll(scale: number): void {
    for (let t = 0; t < ORB_TIERS.length; t++) {
      const def = ORB_TIERS[t];
      const logicalHalf = Math.ceil(def.radius * SPRITE_PAD_RATIO);
      const pxSize = Math.max(16, Math.ceil(logicalHalf * 2 * scale));
      const off = document.createElement('canvas');
      off.width = pxSize;
      off.height = pxSize;
      const octx = off.getContext('2d');
      if (octx) {
        octx.setTransform(scale, 0, 0, scale, 0, 0);
        drawTouhouOrb(octx, logicalHalf, logicalHalf, def.radius, t, 0, {
          iconMode: false,
          time: 0,
        });
      }
      this.sprites[t] = { canvas: off, logicalHalf, scale };
    }
  }
}

/**
 * Renders a crisp high-DPI miniature icon of any Touhou orb tier onto a small UI canvas.
 */
export function renderOrbIcon(canvas: HTMLCanvasElement, tier: number, cssSize: number): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(cssSize * dpr);
  canvas.height = Math.round(cssSize * dpr);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssSize, cssSize);

  const r = cssSize * 0.335;
  drawTouhouOrb(ctx, cssSize * 0.5, cssSize * 0.56, r, tier, 0, {
    iconMode: true,
    time: 0,
  });
}

/**
 * Draws one of the 11 expressive cel-shaded doujin Touhou chibi character orbs.
 */
export function drawTouhouOrb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  tier: number,
  angle: number,
  options: OrbDrawOptions = {}
): void {
  const def = ORB_TIERS[tier] ?? ORB_TIERS[0];
  const scaleX = options.scaleX ?? 1;
  const scaleY = options.scaleY ?? 1;
  const flash = options.flash ?? 0;
  const iconMode = options.iconMode ?? false;

  ctx.save();
  ctx.translate(x, y);
  if (angle !== 0) ctx.rotate(angle);
  if (scaleX !== 1 || scaleY !== 1) ctx.scale(scaleX, scaleY);

  // Subtle baked soft ambient aura for high tiers
  if (!iconMode && tier >= 8) {
    const auraR = r * (tier === 10 ? 1.24 : 1.14);
    const aura = ctx.createRadialGradient(0, 0, r * 0.78, 0, 0, auraR);
    aura.addColorStop(0, def.glow);
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, auraR, 0, TAU);
    ctx.fill();
  }

  // 1. Back accessories (fluffy halo, wings, horns, bows, knives, phantom wisp)
  drawBackAccessories(ctx, r, tier, iconMode);

  // 2. Main cel-shaded 3D sphere base
  const sphereGrad = ctx.createRadialGradient(-r * 0.34, -r * 0.36, r * 0.06, 0, 0, r * 1.06);
  sphereGrad.addColorStop(0, def.highlight);
  sphereGrad.addColorStop(0.54, def.primary);
  sphereGrad.addColorStop(1, def.secondary);

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fillStyle = sphereGrad;
  ctx.fill();

  // 3. Clipped interior layers: motifs, hair bangs, cel shadow, glossy specular & bounce rim
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.clip();

  // Character-specific inner patterns (stripes, clockwork, Hakkero, gap eyes, collars)
  drawInnerMotifs(ctx, r, tier);

  // Soft cel-shaded crescent shadow along bottom-right edge
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.04, 0, TAU);
  ctx.arc(-r * 0.22, -r * 0.24, r * 0.96, 0, TAU, true);
  ctx.fillStyle = tier === 0 ? 'rgba(130, 112, 185, 0.16)' : 'rgba(14, 8, 30, 0.22)';
  ctx.fill('evenodd');
  ctx.restore();

  // Distinct anime hair bangs & side-framing fringe (Tiers 1..10)
  if (tier >= 1) {
    drawAnimeHairBangs(ctx, r, tier);
  }

  // Glossy specular highlight crescent (upper-left candy glass sheen)
  ctx.save();
  ctx.translate(-r * 0.35, -r * 0.4);
  ctx.rotate(-0.56);
  const specGrad = ctx.createLinearGradient(0, -r * 0.18, 0, r * 0.18);
  specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.56)');
  specGrad.addColorStop(1, 'rgba(255, 255, 255, 0.06)');
  ctx.fillStyle = specGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.34, r * 0.15, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Crisp secondary sparkle dot
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.beginPath();
  ctx.arc(-r * 0.54, -r * 0.16, Math.max(1, r * 0.058), 0, TAU);
  ctx.fill();

  // Luminous lower bounce rim light arc
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.91, 0.16 * Math.PI, 0.84 * Math.PI);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = Math.max(1.2, r * 0.055);
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.restore(); // end sphere clip

  // 4. Crisp doujin double-rim stroke (luminous inner rim + colored ink outline)
  ctx.beginPath();
  ctx.arc(0, 0, r - 0.6, 0, TAU);
  ctx.strokeStyle = def.rim;
  ctx.lineWidth = Math.max(1.4, Math.min(3.2, r * 0.052));
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, r + 0.35, 0, TAU);
  ctx.strokeStyle = def.ink;
  ctx.lineWidth = Math.max(0.9, Math.min(2.0, r * 0.028));
  ctx.stroke();

  // 5. Expressive cel-shaded chibi anime face
  drawChibiFace(ctx, r, tier);

  // 6. Front signature headgear, ribbons, hats, hair tubes & charms
  drawFrontAccessories(ctx, r, tier, iconMode);

  // 7. Merge birth bright flash overlay (used when rendering uncached / icons)
  if (flash > 0.01) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fillStyle = `rgba(255, 252, 232, ${flash * 0.58})`;
    ctx.fill();
  }

  ctx.restore();
}

function drawBackAccessories(
  ctx: CanvasRenderingContext2D,
  r: number,
  tier: number,
  iconMode: boolean
): void {
  const ext = iconMode ? 0.84 : 1.0;

  switch (tier) {
    case 0: {
      // 毛玉 (Kedama): lush fluffy cloud halo with soft pastel glow & scalloped fur puffs
      const haloGrad = ctx.createRadialGradient(0, 0, r * 0.72, 0, 0, r * 1.35 * ext);
      haloGrad.addColorStop(0, 'rgba(255, 246, 255, 0.55)');
      haloGrad.addColorStop(1, 'rgba(255, 246, 255, 0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.35 * ext, 0, TAU);
      ctx.fill();

      const lobes = 10;
      ctx.fillStyle = '#fffdf9';
      ctx.strokeStyle = '#9987c2';
      ctx.lineWidth = Math.max(1.1, r * 0.075);
      for (let i = 0; i < lobes; i++) {
        const a = (TAU * i) / lobes + 0.15;
        const px = Math.cos(a) * r * 0.86;
        const py = Math.sin(a) * r * 0.86;
        const pr = r * (i % 2 === 0 ? 0.28 : 0.22);
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      // Re-fill inner cloud body to hide interior stroke seams
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.94, 0, TAU);
      ctx.fill();
      break;
    }

    case 1: {
      // 琪露诺 (Cirno): 6 crisp faceted translucent ice-crystal wings
      const wingAngles = [-0.58, -0.1, 0.38];
      for (const side of [-1, 1]) {
        for (let k = 0; k < wingAngles.length; k++) {
          ctx.save();
          ctx.scale(side, 1);
          ctx.rotate(wingAngles[k]);
          const len = r * (0.56 - k * 0.04) * ext;
          const base = r * 0.82;
          const halfW = r * 0.155;

          // Crystal outer silhouette
          const iceGrad = ctx.createLinearGradient(base, -halfW, base + len, halfW);
          iceGrad.addColorStop(0, 'rgba(210, 252, 255, 0.94)');
          iceGrad.addColorStop(0.55, 'rgba(104, 224, 255, 0.86)');
          iceGrad.addColorStop(1, 'rgba(42, 152, 240, 0.92)');
          ctx.beginPath();
          ctx.moveTo(base, 0);
          ctx.lineTo(base + len * 0.45, -halfW);
          ctx.lineTo(base + len, 0);
          ctx.lineTo(base + len * 0.45, halfW);
          ctx.closePath();
          ctx.fillStyle = iceGrad;
          ctx.fill();

          // Upper bright facet sheen
          ctx.beginPath();
          ctx.moveTo(base, 0);
          ctx.lineTo(base + len * 0.45, -halfW);
          ctx.lineTo(base + len, 0);
          ctx.closePath();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
          ctx.fill();

          ctx.strokeStyle = '#1b5eb8';
          ctx.lineWidth = Math.max(0.9, r * 0.045);
          ctx.beginPath();
          ctx.moveTo(base, 0);
          ctx.lineTo(base + len * 0.45, -halfW);
          ctx.lineTo(base + len, 0);
          ctx.lineTo(base + len * 0.45, halfW);
          ctx.closePath();
          ctx.stroke();

          ctx.restore();
        }
      }
      break;
    }

    case 2: {
      // 露米娅 (Rumia): swirling shadowy darkness wisps around the rim
      ctx.save();
      for (let i = 0; i < 6; i++) {
        const a = (TAU * i) / 6 + 0.35;
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(r * 0.84, -r * 0.14);
        ctx.quadraticCurveTo(r * 1.24 * ext, -r * 0.28 * ext, r * 1.22 * ext, r * 0.08);
        ctx.quadraticCurveTo(r * 1.04 * ext, r * 0.02, r * 0.86, r * 0.16);
        ctx.closePath();
        ctx.fillStyle = i % 2 === 0 ? 'rgba(22, 13, 44, 0.88)' : 'rgba(58, 36, 102, 0.78)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(235, 77, 101, 0.45)';
        ctx.lineWidth = Math.max(0.8, r * 0.03);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      break;
    }

    case 3: {
      // 芙兰朵露 (Flandre): 7-color crystal wing gems + flowing golden side-tail!
      const leftGems = [
        { x: 0.94, y: -0.48, c: '#ff3b5c' }, // Red
        { x: 1.12, y: -0.34, c: '#ff922b' }, // Orange
        { x: 1.24, y: -0.14, c: '#ffe047' }, // Yellow
        { x: 1.26, y: 0.12, c: '#2ee68a' },  // Green
      ];
      const rightGems = [
        { x: 0.96, y: -0.46, c: '#38d9ff' }, // Cyan
        { x: 1.16, y: -0.24, c: '#4f6ef7' }, // Blue
        { x: 1.24, y: 0.04, c: '#a84dff' },  // Violet
      ];

      ctx.save();
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        // Sculpted dark iron candelabra wing frame
        ctx.beginPath();
        ctx.moveTo(r * 0.72, -r * 0.06);
        ctx.quadraticCurveTo(r * 1.12 * ext, -r * 0.56 * ext, r * 1.28 * ext, -r * 0.05);
        ctx.quadraticCurveTo(r * 1.26 * ext, r * 0.14 * ext, r * 1.12 * ext, r * 0.22 * ext);
        ctx.strokeStyle = '#2d192c';
        ctx.lineWidth = Math.max(1.6, r * 0.07);
        ctx.lineCap = 'round';
        ctx.stroke();

        const gems = side < 0 ? leftGems : rightGems;
        for (const g of gems) {
          const gx = r * g.x * ext;
          const gy = r * g.y * ext;
          const gw = r * 0.105;
          const gh = r * 0.145;
          // Gem glow
          ctx.fillStyle = g.c;
          ctx.beginPath();
          ctx.moveTo(gx, gy - gh);
          ctx.lineTo(gx + gw, gy);
          ctx.lineTo(gx, gy + gh);
          ctx.lineTo(gx - gw, gy);
          ctx.closePath();
          ctx.fill();
          // Bright top facet
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.beginPath();
          ctx.moveTo(gx, gy - gh);
          ctx.lineTo(gx + gw, gy);
          ctx.lineTo(gx, gy);
          ctx.closePath();
          ctx.fill();
          // Crisp border
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = Math.max(0.8, r * 0.026);
          ctx.beginPath();
          ctx.moveTo(gx, gy - gh);
          ctx.lineTo(gx + gw, gy);
          ctx.lineTo(gx, gy + gh);
          ctx.lineTo(gx - gw, gy);
          ctx.closePath();
          ctx.stroke();
        }
        ctx.restore();
      }

      // Flandre's signature flowing golden side-tail on her right side
      ctx.beginPath();
      ctx.moveTo(r * 0.62, -r * 0.54);
      ctx.quadraticCurveTo(r * 1.12 * ext, -r * 0.36 * ext, r * 1.04 * ext, r * 0.36 * ext);
      ctx.quadraticCurveTo(r * 0.84 * ext, r * 0.26 * ext, r * 0.72, -r * 0.12);
      ctx.closePath();
      const tailGrad = ctx.createLinearGradient(r * 0.6, -r * 0.5, r * 1.05, r * 0.35);
      tailGrad.addColorStop(0, '#fff099');
      tailGrad.addColorStop(0.6, '#ffd24d');
      tailGrad.addColorStop(1, '#d99826');
      ctx.fillStyle = tailGrad;
      ctx.fill();
      ctx.strokeStyle = '#4a1426';
      ctx.lineWidth = Math.max(1, r * 0.035);
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 4: {
      // 蕾米莉亚 (Remilia): sculpted scarlet-rimmed gothic bat wings
      ctx.save();
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.beginPath();
        ctx.moveTo(r * 0.76, -r * 0.1);
        ctx.quadraticCurveTo(r * 1.1 * ext, -r * 0.62 * ext, r * 1.34 * ext, -r * 0.3 * ext);
        ctx.quadraticCurveTo(r * 1.2 * ext, -r * 0.04, r * 1.26 * ext, r * 0.18 * ext);
        ctx.quadraticCurveTo(r * 1.08 * ext, r * 0.08, r * 1.02 * ext, r * 0.28 * ext);
        ctx.quadraticCurveTo(r * 0.9 * ext, r * 0.14, r * 0.76, r * 0.24);
        ctx.closePath();
        const wingGrad = ctx.createLinearGradient(r * 0.76, -r * 0.4, r * 1.3, r * 0.25);
        wingGrad.addColorStop(0, '#4a0c24');
        wingGrad.addColorStop(1, '#1e0410');
        ctx.fillStyle = wingGrad;
        ctx.fill();
        ctx.strokeStyle = '#eb3b5a';
        ctx.lineWidth = Math.max(1.1, r * 0.038);
        ctx.stroke();

        // Inner wing rib vein
        ctx.beginPath();
        ctx.moveTo(r * 0.84, -r * 0.08);
        ctx.quadraticCurveTo(r * 1.06 * ext, -r * 0.2 * ext, r * 1.22 * ext, r * 0.12 * ext);
        ctx.strokeStyle = 'rgba(255, 110, 140, 0.5)';
        ctx.lineWidth = Math.max(0.8, r * 0.022);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      break;
    }

    case 5: {
      // 十六夜咲夜 (Sakuya): crossed glistening silver throwing knives behind shoulders
      ctx.save();
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.rotate(-0.52);
        // Silver blade extending out upper-side
        ctx.beginPath();
        ctx.moveTo(r * 0.76, -r * 0.08);
        ctx.lineTo(r * 1.26 * ext, -r * 0.03);
        ctx.lineTo(r * 1.36 * ext, 0.02);
        ctx.lineTo(r * 1.22 * ext, r * 0.09);
        ctx.lineTo(r * 0.76, r * 0.07);
        ctx.closePath();
        const bladeGrad = ctx.createLinearGradient(r * 0.76, -r * 0.08, r * 1.34, r * 0.08);
        bladeGrad.addColorStop(0, '#eef4ff');
        bladeGrad.addColorStop(0.5, '#b8c8eb');
        bladeGrad.addColorStop(1, '#ffffff');
        ctx.fillStyle = bladeGrad;
        ctx.fill();
        ctx.strokeStyle = '#2d3f75';
        ctx.lineWidth = Math.max(0.9, r * 0.026);
        ctx.stroke();
        // Blade center bevel highlight
        ctx.beginPath();
        ctx.moveTo(r * 0.82, 0);
        ctx.lineTo(r * 1.28 * ext, 0);
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = Math.max(0.7, r * 0.018);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      break;
    }

    case 6: {
      // 魂魄妖梦 (Youmu): glowing ghostly half-phantom wisp (半灵) + trailing ribbon ends
      ctx.save();
      const wx = r * 0.96 * ext;
      const wy = -r * 0.36 * ext;
      const wr = r * 0.25;

      // Soft ghostly mint aura
      const aura = ctx.createRadialGradient(wx, wy, wr * 0.2, wx, wy, wr * 1.85);
      aura.addColorStop(0, 'rgba(175, 255, 228, 0.65)');
      aura.addColorStop(1, 'rgba(175, 255, 228, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(wx, wy, wr * 1.85, 0, TAU);
      ctx.fill();

      // Ghostly teardrop body + swirled spirit tail
      ctx.beginPath();
      ctx.arc(wx, wy, wr, Math.PI * 0.82, Math.PI * 2.25);
      ctx.quadraticCurveTo(wx + wr * 1.15, wy + wr * 1.35, wx + wr * 1.55, wy + wr * 0.85);
      ctx.quadraticCurveTo(wx + wr * 0.85, wy + wr * 1.95, wx - wr * 0.28, wy + wr * 0.96);
      ctx.closePath();
      const wispGrad = ctx.createRadialGradient(wx - wr * 0.25, wy - wr * 0.25, wr * 0.1, wx, wy, wr * 1.4);
      wispGrad.addColorStop(0, '#ffffff');
      wispGrad.addColorStop(0.65, '#d6fff0');
      wispGrad.addColorStop(1, '#7ff0c6');
      ctx.fillStyle = wispGrad;
      ctx.fill();
      ctx.strokeStyle = '#38a888';
      ctx.lineWidth = Math.max(1, r * 0.028);
      ctx.stroke();

      // Cute tiny gleam inside wisp
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(wx - wr * 0.26, wy - wr * 0.24, wr * 0.24, wr * 0.14, -0.4, 0, TAU);
      ctx.fill();
      ctx.restore();
      break;
    }

    case 7: {
      // 雾雨魔理沙 (Marisa): fluffy golden side-braid curls framing behind orb
      ctx.save();
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.beginPath();
        ctx.moveTo(r * 0.72, -r * 0.22);
        ctx.quadraticCurveTo(r * 1.16 * ext, r * 0.04, r * 1.06 * ext, r * 0.56 * ext);
        ctx.quadraticCurveTo(r * 0.86 * ext, r * 0.62 * ext, r * 0.74, r * 0.34);
        ctx.closePath();
        const curlGrad = ctx.createLinearGradient(r * 0.7, -r * 0.2, r * 1.1, r * 0.6);
        curlGrad.addColorStop(0, '#fff099');
        curlGrad.addColorStop(0.55, '#ffd447');
        curlGrad.addColorStop(1, '#c98e18');
        ctx.fillStyle = curlGrad;
        ctx.fill();
        ctx.strokeStyle = '#1f1438';
        ctx.lineWidth = Math.max(1.1, r * 0.028);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      break;
    }

    case 8: {
      // 博丽灵梦 (Reimu): massive iconic sweeping crimson shrine maiden ribbon bow!
      ctx.save();
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        // Main sweeping upper wing
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.84);
        ctx.quadraticCurveTo(r * 0.56 * ext, -r * 1.38 * ext, r * 1.12 * ext, -r * 0.92 * ext);
        ctx.lineTo(r * 0.88 * ext, -r * 0.42 * ext);
        ctx.quadraticCurveTo(r * 0.42 * ext, -r * 0.66 * ext, 0, -r * 0.72);
        ctx.closePath();
        const bowGrad = ctx.createLinearGradient(0, -r * 1.25, r * 1.0, -r * 0.5);
        bowGrad.addColorStop(0, '#ff4d63');
        bowGrad.addColorStop(0.55, '#db1f38');
        bowGrad.addColorStop(1, '#990e22');
        ctx.fillStyle = bowGrad;
        ctx.fill();
        ctx.strokeStyle = '#fff5e6';
        ctx.lineWidth = Math.max(1.5, r * 0.032);
        ctx.stroke();

        // Subtle inner ribbon fold line
        ctx.beginPath();
        ctx.moveTo(r * 0.16, -r * 0.82);
        ctx.quadraticCurveTo(r * 0.56 * ext, -r * 0.94 * ext, r * 0.86 * ext, -r * 0.72 * ext);
        ctx.strokeStyle = 'rgba(255, 232, 232, 0.45)';
        ctx.lineWidth = Math.max(1, r * 0.022);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      break;
    }

    case 9: {
      // 八云紫 (Yukari): flowing golden waves + twin mystic violet Gap ribbon edges
      ctx.save();
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        // Golden flowing hair locks behind sides
        ctx.beginPath();
        ctx.moveTo(r * 0.76, -r * 0.34);
        ctx.quadraticCurveTo(r * 1.16 * ext, -r * 0.02, r * 1.08 * ext, r * 0.56 * ext);
        ctx.quadraticCurveTo(r * 0.86 * ext, r * 0.66 * ext, r * 0.72, r * 0.34);
        ctx.closePath();
        const lockGrad = ctx.createLinearGradient(r * 0.7, -r * 0.3, r * 1.1, r * 0.6);
        lockGrad.addColorStop(0, '#fff2ad');
        lockGrad.addColorStop(0.6, '#f2c85b');
        lockGrad.addColorStop(1, '#c48f25');
        ctx.fillStyle = lockGrad;
        ctx.fill();
        ctx.strokeStyle = '#38155e';
        ctx.lineWidth = Math.max(1.2, r * 0.024);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      break;
    }

    case 10: {
      // 伊吹萃香 (Ibuki Suika): majestic curved golden-amber oni horns + festive sake aura!
      ctx.save();
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        const hornGrad = ctx.createLinearGradient(r * 0.28, -r * 0.74, r * 0.72, -r * 1.38);
        hornGrad.addColorStop(0, '#b85314');
        hornGrad.addColorStop(0.45, '#f5a623');
        hornGrad.addColorStop(0.85, '#ffe066');
        hornGrad.addColorStop(1, '#fff8cc');
        ctx.beginPath();
        ctx.moveTo(r * 0.22, -r * 0.82);
        ctx.bezierCurveTo(
          r * 0.56 * ext,
          -r * 0.96 * ext,
          r * 0.8 * ext,
          -r * 1.18 * ext,
          r * 0.64 * ext,
          -r * 1.38 * ext
        );
        ctx.bezierCurveTo(
          r * 0.52 * ext,
          -r * 1.2 * ext,
          r * 0.42 * ext,
          -r * 1.02 * ext,
          r * 0.48,
          -r * 0.72
        );
        ctx.closePath();
        ctx.fillStyle = hornGrad;
        ctx.fill();
        ctx.strokeStyle = '#4a1d08';
        ctx.lineWidth = Math.max(1.4, r * 0.028);
        ctx.stroke();

        // Sculpted golden horn ridge rings
        ctx.strokeStyle = 'rgba(145, 58, 12, 0.42)';
        ctx.lineWidth = Math.max(1, r * 0.018);
        for (const t of [0.28, 0.52, 0.74]) {
          const hx = r * (0.36 + t * 0.26) * ext;
          const hy = -r * (0.86 + t * 0.34) * ext;
          ctx.beginPath();
          ctx.arc(hx, hy, r * (0.12 - t * 0.05), 0.2, Math.PI * 0.85);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Ginger-orange fluffy spiky side hair tufts peeking from behind watermelon silhouette
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.beginPath();
        ctx.moveTo(r * 0.84, -r * 0.28);
        ctx.quadraticCurveTo(r * 1.14 * ext, -r * 0.12, r * 1.05 * ext, r * 0.16);
        ctx.quadraticCurveTo(r * 0.92 * ext, r * 0.1, r * 0.84, r * 0.26);
        ctx.closePath();
        ctx.fillStyle = '#ff9248';
        ctx.fill();
        ctx.strokeStyle = '#5c220a';
        ctx.lineWidth = Math.max(1.2, r * 0.022);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      break;
    }
  }
}

function drawInnerMotifs(ctx: CanvasRenderingContext2D, r: number, tier: number): void {
  switch (tier) {
    case 0: {
      // Kedama: soft dreamy pastel center glow
      const g = ctx.createRadialGradient(0, r * 0.1, 0, 0, r * 0.1, r * 0.85);
      g.addColorStop(0, 'rgba(255, 232, 245, 0.35)');
      g.addColorStop(1, 'rgba(255, 232, 245, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(-r, -r, r * 2, r * 2);
      break;
    }

    case 1: {
      // Cirno: crisp ice-crystal lower collar facets + frost ⑨ emblem
      ctx.fillStyle = 'rgba(255, 255, 255, 0.26)';
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, r * 0.62);
      ctx.lineTo(-r * 0.18, r * 0.86);
      ctx.lineTo(0, r * 0.64);
      ctx.lineTo(r * 0.18, r * 0.86);
      ctx.lineTo(r * 0.6, r * 0.62);
      ctx.lineTo(r * 0.72, r * 1.05);
      ctx.lineTo(-r * 0.72, r * 1.05);
      ctx.closePath();
      ctx.fill();

      if (r >= 16) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
        ctx.font = `800 ${Math.round(r * 0.4)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⑨', r * 0.5, r * 0.46);
      }
      break;
    }

    case 2: {
      // Rumia: twilight shadow & iconic white blouse + crimson vest ribbon
      ctx.fillStyle = 'rgba(255, 248, 252, 0.82)';
      ctx.beginPath();
      ctx.arc(0, r * 1.1, r * 0.56, Math.PI * 1.15, Math.PI * 1.85);
      ctx.fill();
      ctx.strokeStyle = '#eb3b5a';
      ctx.lineWidth = Math.max(1.6, r * 0.085);
      ctx.beginPath();
      ctx.arc(0, r * 0.96, r * 0.55, Math.PI * 1.18, Math.PI * 1.82);
      ctx.stroke();
      break;
    }

    case 3: {
      // Flandre: crimson Scarlet dress collar & bright golden ascot tie
      const dress = ctx.createLinearGradient(0, r * 0.32, 0, r);
      dress.addColorStop(0, 'rgba(219, 56, 78, 0)');
      dress.addColorStop(0.6, 'rgba(195, 28, 56, 0.65)');
      dress.addColorStop(1, 'rgba(138, 12, 36, 0.88)');
      ctx.fillStyle = dress;
      ctx.fillRect(-r, r * 0.32, r * 2, r * 0.75);

      // Cute white ruffled collar V
      ctx.fillStyle = '#fff5f7';
      ctx.beginPath();
      ctx.moveTo(-r * 0.36, r * 0.62);
      ctx.lineTo(0, r * 0.84);
      ctx.lineTo(r * 0.36, r * 0.62);
      ctx.lineTo(r * 0.22, r * 0.96);
      ctx.lineTo(-r * 0.22, r * 0.96);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 4: {
      // Remilia: soft pale-pink aristocratic blouse collar + ruby jewel brooch
      ctx.fillStyle = 'rgba(255, 232, 240, 0.86)';
      ctx.beginPath();
      ctx.arc(0, r * 1.08, r * 0.58, Math.PI * 1.12, Math.PI * 1.88);
      ctx.fill();

      // Crimson gem brooch at collar center
      ctx.fillStyle = '#ff2a55';
      ctx.strokeStyle = '#ffe082';
      ctx.lineWidth = Math.max(1, r * 0.028);
      ctx.beginPath();
      ctx.arc(0, r * 0.68, r * 0.11, 0, TAU);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 5: {
      // Sakuya: crisp golden-silver pocket-watch dial watermark + white maid collar
      ctx.save();
      ctx.strokeStyle = 'rgba(245, 208, 108, 0.42)';
      ctx.lineWidth = Math.max(1.1, r * 0.03);
      ctx.beginPath();
      ctx.arc(0, r * 0.04, r * 0.76, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, r * 0.04, r * 0.68, 0, TAU);
      ctx.strokeStyle = 'rgba(245, 208, 108, 0.22)';
      ctx.stroke();

      for (let h = 0; h < 12; h++) {
        const a = (TAU * h) / 12;
        const inner = h % 3 === 0 ? 0.58 : 0.65;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * inner, r * 0.04 + Math.sin(a) * r * inner);
        ctx.lineTo(Math.cos(a) * r * 0.76, r * 0.04 + Math.sin(a) * r * 0.76);
        ctx.strokeStyle = h % 3 === 0 ? 'rgba(245, 208, 108, 0.52)' : 'rgba(245, 208, 108, 0.3)';
        ctx.stroke();
      }
      // Ornate clock hands
      ctx.strokeStyle = 'rgba(245, 208, 108, 0.38)';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, r * 0.04);
      ctx.lineTo(0, -r * 0.44);
      ctx.moveTo(0, r * 0.04);
      ctx.lineTo(r * 0.34, r * 0.2);
      ctx.stroke();

      // White pleated maid collar at bottom
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.moveTo(-r * 0.44, r * 0.66);
      ctx.lineTo(0, r * 0.84);
      ctx.lineTo(r * 0.44, r * 0.66);
      ctx.lineTo(r * 0.36, r * 1.02);
      ctx.lineTo(-r * 0.36, r * 1.02);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      break;
    }

    case 6: {
      // Youmu: dark Hakugyokurou teal vest + crisp white V-collar & black ribbon tie
      ctx.fillStyle = 'rgba(13, 66, 54, 0.68)';
      ctx.beginPath();
      ctx.arc(0, r * 1.0, r * 0.68, Math.PI * 1.08, Math.PI * 1.92);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.8, r * 0.055);
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-r * 0.36, r * 0.56);
      ctx.lineTo(0, r * 0.82);
      ctx.lineTo(r * 0.36, r * 0.56);
      ctx.stroke();

      // Subtle sakura petal accent
      ctx.fillStyle = 'rgba(255, 196, 220, 0.72)';
      ctx.beginPath();
      ctx.ellipse(-r * 0.52, r * 0.48, r * 0.09, r * 0.05, -0.5, 0, TAU);
      ctx.fill();
      break;
    }

    case 7: {
      // Marisa: starry twilight robe + glowing Mini-Hakkero octagon star badge!
      const stars = [
        { x: -0.56, y: 0.42, s: 0.1 },
        { x: -0.44, y: 0.66, s: 0.07 },
        { x: 0.58, y: 0.22, s: 0.08 },
      ];
      ctx.fillStyle = '#ffe169';
      for (const st of stars) {
        drawStarPath(ctx, r * st.x, r * st.y, 4, r * st.s, r * st.s * 0.36);
        ctx.fill();
      }

      // Glowing Mini-Hakkero octagon emblem at lower right
      const hx = r * 0.46;
      const hy = r * 0.52;
      const hr = r * 0.21;
      ctx.save();
      ctx.translate(hx, hy);
      // Warm Hakkero radial glow
      const hGlow = ctx.createRadialGradient(0, 0, hr * 0.1, 0, 0, hr * 1.6);
      hGlow.addColorStop(0, 'rgba(255, 228, 107, 0.75)');
      hGlow.addColorStop(1, 'rgba(255, 228, 107, 0)');
      ctx.fillStyle = hGlow;
      ctx.beginPath();
      ctx.arc(0, 0, hr * 1.6, 0, TAU);
      ctx.fill();

      // Octagon frame
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (TAU * i) / 8 + Math.PI / 8;
        const px = Math.cos(a) * hr;
        const py = Math.sin(a) * hr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = '#2d2352';
      ctx.fill();
      ctx.strokeStyle = '#ffe169';
      ctx.lineWidth = Math.max(1.2, r * 0.025);
      ctx.stroke();

      // Glowing 5-point Hakkero core star
      ctx.fillStyle = '#fff5b8';
      drawStarPath(ctx, 0, 0, 5, hr * 0.66, hr * 0.3);
      ctx.fill();
      ctx.restore();
      break;
    }

    case 8: {
      // Reimu: crisp white miko collar sash + yellow tie + detailed Yin-Yang orb badge
      ctx.fillStyle = 'rgba(255, 248, 242, 0.94)';
      ctx.beginPath();
      ctx.arc(0, r * 1.06, r * 0.72, Math.PI * 1.08, Math.PI * 1.92);
      ctx.fill();

      // Golden shrine bow tie at center collar
      drawRibbonBow(ctx, 0, r * 0.68, r * 0.17, '#f2c14e', '#a3162a');

      // Detailed Hakurei Yin-Yang orb on lower-right
      drawYinYangBadge(ctx, r * 0.52, r * 0.44, r * 0.19);
      break;
    }

    case 9: {
      // Yukari: twin mystic crimson-rimmed Gap (スキマ) portals with eerie-cute golden eyes!
      drawGapEye(ctx, 0, r * 0.6, r * 0.48, r * 0.22);
      ctx.save();
      ctx.translate(-r * 0.62, r * 0.24);
      ctx.rotate(-0.55);
      drawGapEye(ctx, 0, 0, r * 0.24, r * 0.12);
      ctx.restore();
      ctx.save();
      ctx.translate(r * 0.62, r * 0.24);
      ctx.rotate(0.55);
      drawGapEye(ctx, 0, 0, r * 0.24, r * 0.12);
      ctx.restore();
      break;
    }

    case 10: {
      // Ibuki Suika: lush striped watermelon skin with double-tone wavy dark-jade stripes!
      ctx.save();
      const cols = [-0.66, -0.24, 0.24, 0.66];
      // Outer softer jade halo stripe
      ctx.strokeStyle = 'rgba(13, 94, 48, 0.55)';
      ctx.lineWidth = Math.max(3.5, r * 0.185);
      ctx.lineCap = 'round';
      for (const cx of cols) {
        traceWatermelonStripe(ctx, cx * r, r);
        ctx.stroke();
      }
      // Crisp dark-forest inner jagged stripe
      ctx.strokeStyle = 'rgba(8, 62, 32, 0.82)';
      ctx.lineWidth = Math.max(2.2, r * 0.115);
      for (const cx of cols) {
        traceWatermelonStripe(ctx, cx * r, r);
        ctx.stroke();
      }

      // Festive golden sake aura sparkles & warm glow near bottom
      const sakeGlow = ctx.createRadialGradient(0, r * 0.55, r * 0.05, 0, r * 0.55, r * 0.65);
      sakeGlow.addColorStop(0, 'rgba(255, 226, 112, 0.28)');
      sakeGlow.addColorStop(1, 'rgba(255, 226, 112, 0)');
      ctx.fillStyle = sakeGlow;
      ctx.fillRect(-r, 0, r * 2, r);

      ctx.fillStyle = 'rgba(255, 236, 138, 0.72)';
      drawStarPath(ctx, -r * 0.66, r * 0.26, 4, r * 0.1, r * 0.04);
      ctx.fill();
      drawStarPath(ctx, r * 0.68, r * 0.22, 4, r * 0.11, r * 0.045);
      ctx.fill();
      ctx.restore();
      break;
    }
  }
}

/**
 * Draws crisp cel-shaded anime hair bangs, fringe silhouettes, side locks, and an angel-ring highlight!
 */
function drawAnimeHairBangs(ctx: CanvasRenderingContext2D, r: number, tier: number): void {
  const def = ORB_TIERS[tier];
  ctx.save();

  const hairGrad = ctx.createLinearGradient(0, -r, 0, -r * 0.1);
  hairGrad.addColorStop(0, def.hair);
  hairGrad.addColorStop(0.75, def.hair);
  hairGrad.addColorStop(1, def.hairShadow);

  // Soft cast shadow directly beneath bangs onto forehead
  ctx.save();
  ctx.translate(0, r * 0.045);
  traceBangsPath(ctx, r, tier);
  ctx.fillStyle = 'rgba(22, 10, 38, 0.18)';
  ctx.fill();
  ctx.restore();

  // Main hair bangs silhouette
  traceBangsPath(ctx, r, tier);
  ctx.fillStyle = hairGrad;
  ctx.fill();

  // Crisp cel-shaded hair outline
  ctx.strokeStyle = def.ink;
  ctx.lineWidth = Math.max(0.85, Math.min(2.1, r * 0.024));
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Anime hair "angel ring" glossy sheen arc across bangs
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, -r * 0.34, r * 0.62, Math.PI * 1.18, Math.PI * 1.82);
  ctx.strokeStyle =
    tier === 8 || tier === 1 || tier === 4
      ? 'rgba(255, 255, 255, 0.42)'
      : 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = Math.max(1.2, r * 0.055);
  ctx.lineCap = 'round';
  ctx.setLineDash([r * 0.24, r * 0.12, r * 0.14, r * 0.12]);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

function traceBangsPath(ctx: CanvasRenderingContext2D, r: number, tier: number): void {
  ctx.beginPath();
  ctx.moveTo(-r * 1.05, -r * 1.05);
  ctx.lineTo(r * 1.05, -r * 1.05);

  if (tier === 10) {
    // Suika: energetic spiky ginger bangs peeking above watermelon face
    ctx.lineTo(r * 0.92, -r * 0.28);
    ctx.quadraticCurveTo(r * 0.68, -r * 0.24, r * 0.54, -r * 0.44);
    ctx.lineTo(r * 0.38, -r * 0.22);
    ctx.lineTo(r * 0.18, -r * 0.42);
    ctx.lineTo(0, -r * 0.19);
    ctx.lineTo(-r * 0.18, -r * 0.42);
    ctx.lineTo(-r * 0.38, -r * 0.22);
    ctx.lineTo(-r * 0.54, -r * 0.44);
    ctx.quadraticCurveTo(-r * 0.68, -r * 0.24, -r * 0.92, -r * 0.28);
  } else if (tier === 7 || tier === 9) {
    // Marisa & Yukari: sweeping parted golden anime bangs + lush side cheek locks
    ctx.lineTo(r * 0.98, r * 0.18);
    ctx.quadraticCurveTo(r * 0.78, r * 0.04, r * 0.68, -r * 0.26);
    ctx.quadraticCurveTo(r * 0.48, -r * 0.18, r * 0.32, -r * 0.38);
    ctx.quadraticCurveTo(r * 0.14, -r * 0.2, 0, -r * 0.46);
    ctx.quadraticCurveTo(-r * 0.14, -r * 0.2, -r * 0.32, -r * 0.38);
    ctx.quadraticCurveTo(-r * 0.48, -r * 0.18, -r * 0.68, -r * 0.26);
    ctx.quadraticCurveTo(-r * 0.78, r * 0.04, -r * 0.98, r * 0.18);
  } else if (tier === 8 || tier === 5) {
    // Reimu & Sakuya: neat Hime-cut / layered maid bangs with crisp center lock & long cheek locks
    ctx.lineTo(r * 0.96, r * 0.24);
    ctx.quadraticCurveTo(r * 0.76, r * 0.08, r * 0.68, -r * 0.28);
    ctx.lineTo(r * 0.46, -r * 0.22);
    ctx.lineTo(r * 0.28, -r * 0.38);
    ctx.lineTo(r * 0.08, -r * 0.2);
    ctx.lineTo(0, -r * 0.34);
    ctx.lineTo(-r * 0.08, -r * 0.2);
    ctx.lineTo(-r * 0.28, -r * 0.38);
    ctx.lineTo(-r * 0.46, -r * 0.22);
    ctx.lineTo(-r * 0.68, -r * 0.28);
    ctx.quadraticCurveTo(-r * 0.76, r * 0.08, -r * 0.96, r * 0.24);
  } else {
    // Cirno, Rumia, Flandre, Remilia, Youmu: lively bob-cut anime fringe
    ctx.lineTo(r * 0.96, r * 0.02);
    ctx.quadraticCurveTo(r * 0.74, -r * 0.08, r * 0.62, -r * 0.32);
    ctx.lineTo(r * 0.42, -r * 0.22);
    ctx.lineTo(r * 0.22, -r * 0.38);
    ctx.lineTo(0, -r * 0.19);
    ctx.lineTo(-r * 0.22, -r * 0.38);
    ctx.lineTo(-r * 0.42, -r * 0.22);
    ctx.lineTo(-r * 0.62, -r * 0.32);
    ctx.quadraticCurveTo(-r * 0.74, -r * 0.08, -r * 0.96, r * 0.02);
  }
  ctx.closePath();
}

function drawChibiFace(ctx: CanvasRenderingContext2D, r: number, tier: number): void {
  const def = ORB_TIERS[tier];
  const eyeX = r * (tier === 0 ? 0.26 : 0.3);
  const eyeY = r * (tier === 0 ? 0.0 : tier === 9 ? 0.04 : 0.05);
  const eyeR = Math.max(1.6, r * (tier === 0 ? 0.115 : 0.135));

  // Soft rosy radial blush cheeks
  for (const side of [-1, 1]) {
    const bx = side * eyeX * 1.44;
    const by = eyeY + r * 0.175;
    const br = r * 0.16;
    const blush = ctx.createRadialGradient(bx, by, 0, bx, by, br);
    blush.addColorStop(0, tier === 1 ? 'rgba(255, 118, 168, 0.68)' : 'rgba(255, 112, 148, 0.74)');
    blush.addColorStop(1, 'rgba(255, 112, 148, 0)');
    ctx.fillStyle = blush;
    ctx.beginPath();
    ctx.ellipse(bx, by, br, br * 0.62, 0, 0, TAU);
    ctx.fill();

    // Cute tiny anime blush lines on larger orbs
    if (r >= 42) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.48)';
      ctx.lineWidth = Math.max(0.9, r * 0.018);
      ctx.lineCap = 'round';
      for (const off of [-0.04, 0.03]) {
        ctx.beginPath();
        ctx.moveTo(bx + r * off - r * 0.02, by + r * 0.025);
        ctx.lineTo(bx + r * off + r * 0.02, by - r * 0.025);
        ctx.stroke();
      }
    }
  }

  // Expressive anime eyes
  for (const side of [-1, 1]) {
    const ex = side * eyeX;
    if (tier === 7 && side === 1) {
      // Marisa's signature cheerful wink!
      ctx.strokeStyle = '#ffe46b';
      ctx.lineWidth = Math.max(1.8, r * 0.062);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(ex - eyeR * 0.9, eyeY - eyeR * 0.45);
      ctx.lineTo(ex + eyeR * 0.68, eyeY);
      ctx.lineTo(ex - eyeR * 0.9, eyeY + eyeR * 0.52);
      ctx.stroke();
      continue;
    }

    const ry = eyeR * (tier === 9 ? 0.78 : tier === 4 ? 0.9 : 1.08);
    const rx = eyeR * 0.9;

    // Subtle white sclera backing on medium/large orbs for jewel-like anime contrast
    if (r >= 24 && tier !== 0) {
      ctx.fillStyle = 'rgba(255, 252, 255, 0.92)';
      ctx.beginPath();
      ctx.ellipse(ex, eyeY + ry * 0.05, rx * 1.12, ry * 1.04, 0, 0, TAU);
      ctx.fill();
    }

    // Rich vertical iris gradient
    const irisGrad = ctx.createLinearGradient(ex, eyeY - ry, ex, eyeY + ry);
    irisGrad.addColorStop(0, def.ink);
    irisGrad.addColorStop(0.45, def.eye);
    irisGrad.addColorStop(1, def.highlight);
    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, rx, ry, 0, 0, TAU);
    ctx.fill();

    // Deep pupil core
    if (r >= 24) {
      ctx.fillStyle = def.ink;
      ctx.beginPath();
      ctx.ellipse(ex, eyeY - ry * 0.04, rx * 0.46, ry * 0.48, 0, 0, TAU);
      ctx.fill();
    }

    // Luminous lower iris crescent bounce
    if (r >= 30) {
      ctx.beginPath();
      ctx.arc(ex, eyeY + ry * 0.1, rx * 0.62, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.58)';
      ctx.lineWidth = Math.max(1, r * 0.025);
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Thick curved anime upper eyelash arch
    ctx.strokeStyle = tier === 7 ? '#ffe885' : def.ink;
    ctx.lineWidth = Math.max(1.3, r * 0.042);
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (tier === 9 || tier === 4) {
      // Half-lidded regal lash
      ctx.moveTo(ex - rx * 1.18, eyeY - ry * 0.54);
      ctx.quadraticCurveTo(ex, eyeY - ry * 0.72, ex + rx * 1.18, eyeY - ry * 0.38);
    } else {
      ctx.arc(ex, eyeY + ry * 0.05, rx * 1.12, Math.PI * 1.12, Math.PI * 1.88);
    }
    ctx.stroke();

    // Cirno's confident cheeky eyebrows!
    if (tier === 1) {
      ctx.strokeStyle = '#15366e';
      ctx.lineWidth = Math.max(1.1, r * 0.05);
      ctx.beginPath();
      ctx.moveTo(ex - side * rx * 0.9, eyeY - ry * 1.05);
      ctx.lineTo(ex + side * rx * 0.85, eyeY - ry * 1.38);
      ctx.stroke();
    }

    // Main bright white upper-left anime catchlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(
      ex - rx * 0.3,
      eyeY - ry * 0.3,
      Math.max(0.9, rx * 0.36),
      Math.max(0.8, ry * 0.32),
      -0.3,
      0,
      TAU
    );
    ctx.fill();

    // Secondary lower-right jewel sparkle
    if (r >= 24) {
      ctx.fillStyle = tier === 3 || tier === 10 ? '#ffe680' : 'rgba(255, 255, 255, 0.86)';
      ctx.beginPath();
      ctx.arc(ex + rx * 0.3, eyeY + ry * 0.3, Math.max(0.7, rx * 0.18), 0, TAU);
      ctx.fill();
    }
  }

  // Expressive Mouth
  const my = eyeY + r * 0.22;
  const mouthStroke = tier === 7 || tier === 2 ? '#ffe680' : def.ink;
  ctx.strokeStyle = mouthStroke;
  ctx.lineWidth = Math.max(1.3, r * 0.044);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (tier === 10) {
    // Giant triumphant happy open watermelon oni grin!
    ctx.fillStyle = '#ff5e78';
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, my - r * 0.02);
    ctx.quadraticCurveTo(0, my + r * 0.27, r * 0.2, my - r * 0.02);
    ctx.closePath();
    ctx.fill();
    // Cute tongue highlight inside grin
    ctx.fillStyle = '#ff9bb0';
    ctx.beginPath();
    ctx.ellipse(0, my + r * 0.11, r * 0.1, r * 0.055, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, my - r * 0.02);
    ctx.quadraticCurveTo(0, my + r * 0.27, r * 0.2, my - r * 0.02);
    ctx.closePath();
    ctx.stroke();
  } else if (tier === 2 || tier === 3 || tier === 4) {
    // Mischievous vampire / youkai fang smile
    ctx.beginPath();
    ctx.moveTo(-r * 0.16, my);
    ctx.quadraticCurveTo(0, my + r * 0.15, r * 0.16, my);
    ctx.stroke();
    if (r >= 20) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(r * 0.045, my + r * 0.045);
      ctx.lineTo(r * 0.11, my + r * 0.025);
      ctx.lineTo(r * 0.08, my + r * 0.14);
      ctx.closePath();
      ctx.fill();
    }
  } else if (tier === 7 || tier === 1) {
    // Exuberant cheerful open grin
    ctx.fillStyle = '#ff708c';
    ctx.beginPath();
    ctx.moveTo(-r * 0.16, my - r * 0.01);
    ctx.quadraticCurveTo(0, my + r * 0.2, r * 0.16, my - r * 0.01);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (tier === 0) {
    // Cute ':3' cat smile
    ctx.beginPath();
    ctx.moveTo(-r * 0.15, my);
    ctx.quadraticCurveTo(-r * 0.075, my + r * 0.11, 0, my);
    ctx.quadraticCurveTo(r * 0.075, my + r * 0.11, r * 0.15, my);
    ctx.stroke();
  } else {
    // Serene composed Touhou smile
    ctx.beginPath();
    ctx.moveTo(-r * 0.13, my);
    ctx.quadraticCurveTo(0, my + r * 0.12, r * 0.13, my);
    ctx.stroke();
  }
}

function drawFrontAccessories(
  ctx: CanvasRenderingContext2D,
  r: number,
  tier: number,
  iconMode: boolean
): void {
  const ext = iconMode ? 0.88 : 1.0;

  switch (tier) {
    case 1: {
      // Cirno: crisp royal-blue bow on crown
      drawRibbonBow(ctx, 0, -r * 0.88, r * 0.36, '#1f64db', '#d6f8ff');
      break;
    }

    case 2: {
      // Rumia: iconic tilted crimson talisman ribbon bow on upper-left with trailing tails
      ctx.save();
      ctx.translate(-r * 0.44, -r * 0.78);
      ctx.rotate(-0.48);
      // Ribbon tails
      ctx.fillStyle = '#d4203e';
      ctx.strokeStyle = '#ffccd6';
      ctx.lineWidth = Math.max(0.8, r * 0.028);
      ctx.beginPath();
      ctx.moveTo(-r * 0.06, 0);
      ctx.lineTo(-r * 0.28, r * 0.36);
      ctx.lineTo(-r * 0.1, r * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      drawRibbonBow(ctx, 0, 0, r * 0.38, '#e62948', '#ffd6de');
      ctx.restore();
      break;
    }

    case 3: {
      // Flandre: white ruffled mob-cap headband + bright red side-tail ribbon
      drawMobCap(ctx, r, '#fff5f7', '#e0364f', false);
      ctx.save();
      ctx.translate(r * 0.62, -r * 0.6);
      ctx.rotate(0.55);
      drawRibbonBow(ctx, 0, 0, r * 0.28, '#e0243d', '#ffe066');
      ctx.restore();
      break;
    }

    case 4: {
      // Remilia: lavish pink-white Victorian mob cap + twin-tail scarlet bow
      drawMobCap(ctx, r, '#fff0f5', '#d62442', true);
      drawRibbonBow(ctx, 0, -r * 0.88, r * 0.34, '#d92140', '#ffd9e3');
      break;
    }

    case 5: {
      // Sakuya: crisp pleated snow-white maid headpiece + emerald twin side bows
      drawFrillBand(ctx, r, '#ffffff', '#6d82bd');
      drawRibbonBow(ctx, -r * 0.56, -r * 0.7, r * 0.2, '#24a16a', '#ffffff');
      drawRibbonBow(ctx, r * 0.56, -r * 0.7, r * 0.2, '#24a16a', '#ffffff');
      break;
    }

    case 6: {
      // Youmu: iconic crisp twin-tail black ribbon bow centered on crown
      ctx.save();
      ctx.translate(0, -r * 0.88);
      // Sweeping dark ribbon tails
      ctx.fillStyle = '#181a24';
      ctx.strokeStyle = '#99fae0';
      ctx.lineWidth = Math.max(0.9, r * 0.025);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(side * r * 0.34, r * 0.26);
        ctx.lineTo(side * r * 0.16, r * 0.28);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      drawRibbonBow(ctx, 0, 0, r * 0.42, '#1c1f2b', '#8ef7d5');
      ctx.restore();
      break;
    }

    case 7: {
      // Marisa: iconic oversized jaunty black witch hat with pleated white band & glowing gold star!
      ctx.save();
      ctx.translate(0, -r * 0.73);
      ctx.rotate(-0.14);

      // Wide curved brim
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.88 * ext, r * 0.21, 0, 0, TAU);
      const brimGrad = ctx.createLinearGradient(-r * 0.8, 0, r * 0.8, 0);
      brimGrad.addColorStop(0, '#140f29');
      brimGrad.addColorStop(0.5, '#2b224f');
      brimGrad.addColorStop(1, '#140f29');
      ctx.fillStyle = brimGrad;
      ctx.fill();
      ctx.strokeStyle = '#ffd966';
      ctx.lineWidth = Math.max(1.2, r * 0.028);
      ctx.stroke();

      // Sweeping curled pointed cone
      ctx.beginPath();
      ctx.moveTo(-r * 0.45, -r * 0.02);
      ctx.bezierCurveTo(-r * 0.32, -r * 0.56, r * 0.12, -r * 0.72 * ext, r * 0.5 * ext, -r * 0.5 * ext);
      ctx.bezierCurveTo(r * 0.24, -r * 0.34, r * 0.36, -r * 0.16, r * 0.45, -r * 0.02);
      ctx.closePath();
      const coneGrad = ctx.createLinearGradient(-r * 0.3, -r * 0.5, r * 0.4, 0);
      coneGrad.addColorStop(0, '#3a2f66');
      coneGrad.addColorStop(0.6, '#211940');
      coneGrad.addColorStop(1, '#130e26');
      ctx.fillStyle = coneGrad;
      ctx.fill();
      ctx.stroke();

      // Pleated crisp white ribbon band + bow
      ctx.beginPath();
      ctx.moveTo(-r * 0.41, -r * 0.04);
      ctx.quadraticCurveTo(0, r * 0.07, r * 0.41, -r * 0.04);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2.2, r * 0.088);
      ctx.lineCap = 'round';
      ctx.stroke();

      // Glowing golden star brooch on hat
      ctx.fillStyle = '#ffe46b';
      ctx.strokeStyle = '#99640c';
      ctx.lineWidth = Math.max(0.8, r * 0.018);
      drawStarPath(ctx, -r * 0.15, -r * 0.18, 5, r * 0.145, r * 0.064);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 8: {
      // Reimu: bright red-white shrine bow knot, twin white hair-tubes & Yin-Yang hairpiece!
      ctx.fillStyle = '#fff8f0';
      ctx.strokeStyle = '#db1f38';
      ctx.lineWidth = Math.max(1.2, r * 0.026);
      ctx.beginPath();
      ctx.arc(0, -r * 0.84, r * 0.155, 0, TAU);
      ctx.fill();
      ctx.stroke();

      // Twin iconic white shrine hair-tubes with crimson bands
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(side * r * 0.74, -r * 0.06);
        ctx.rotate(side * 0.14);
        roundRectPath(ctx, -r * 0.085, -r * 0.22, r * 0.17, r * 0.42, r * 0.055);
        ctx.fillStyle = '#fffcf7';
        ctx.fill();
        ctx.strokeStyle = '#db1f38';
        ctx.lineWidth = Math.max(1.1, r * 0.022);
        ctx.stroke();

        // Red ribbon tie wrapping the hair tube
        ctx.fillStyle = '#e0243d';
        ctx.fillRect(-r * 0.082, -r * 0.04, r * 0.164, r * 0.08);
        ctx.restore();
      }

      // Crisp miniature Yin-Yang hairpiece pinned on upper-left bangs
      drawYinYangBadge(ctx, -r * 0.44, -r * 0.56, r * 0.125);
      break;
    }

    case 9: {
      // Yukari: ornate gold-trimmed white mob cap + crimson bow + golden hanging tassels
      drawMobCap(ctx, r, '#fff9eb', '#e0a938', true);
      drawRibbonBow(ctx, 0, -r * 0.88, r * 0.36, '#c92059', '#f7d572');

      // Twin small gold bead tassels on mob-cap sides
      ctx.fillStyle = '#f7d572';
      ctx.strokeStyle = '#75460e';
      ctx.lineWidth = Math.max(0.8, r * 0.018);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(side * r * 0.66, -r * 0.58, r * 0.06, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }

    case 10: {
      // Ibuki Suika: red & violet horn bows + geometric charm band (● ▲ ■) + festive sparkles!
      drawRibbonBow(ctx, -r * 0.38, -r * 0.79, r * 0.19, '#e62e49', '#ffe470');
      drawRibbonBow(ctx, r * 0.38, -r * 0.79, r * 0.19, '#8b46eb', '#ffe470');

      // Golden forehead charm chain
      const by = -r * 0.6;
      ctx.strokeStyle = '#ffe470';
      ctx.lineWidth = Math.max(1.4, r * 0.024);
      ctx.beginPath();
      ctx.moveTo(-r * 0.38, by);
      ctx.quadraticCurveTo(0, by + r * 0.1, r * 0.38, by);
      ctx.stroke();

      // Red Circle bead (●)
      ctx.fillStyle = '#ff4d6d';
      ctx.strokeStyle = '#4a121f';
      ctx.lineWidth = Math.max(0.9, r * 0.016);
      ctx.beginPath();
      ctx.arc(-r * 0.23, by + r * 0.04, r * 0.068, 0, TAU);
      ctx.fill();
      ctx.stroke();

      // Golden Triangle bead (▲)
      ctx.fillStyle = '#ffe46b';
      ctx.beginPath();
      ctx.moveTo(0, by - r * 0.025);
      ctx.lineTo(r * 0.075, by + r * 0.105);
      ctx.lineTo(-r * 0.075, by + r * 0.105);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cerulean Square bead (■)
      ctx.fillStyle = '#52d6ff';
      ctx.fillRect(r * 0.165, by - r * 0.02, r * 0.125, r * 0.125);
      ctx.strokeRect(r * 0.165, by - r * 0.02, r * 0.125, r * 0.125);
      break;
    }
  }
}

function drawMobCap(
  ctx: CanvasRenderingContext2D,
  r: number,
  fill: string,
  trim: string,
  withDome: boolean
): void {
  ctx.save();
  if (withDome) {
    // Soft puffy Victorian mob-cap crown dome sitting gently atop head
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.86, r * 0.56, r * 0.24, 0, Math.PI, TAU);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = trim;
    ctx.lineWidth = Math.max(1, r * 0.026);
    ctx.stroke();
  }
  drawFrillBand(ctx, r, fill, trim);
  ctx.restore();
}

function drawFrillBand(
  ctx: CanvasRenderingContext2D,
  r: number,
  fill: string,
  trim: string
): void {
  ctx.save();
  const scallops = 7;
  ctx.fillStyle = fill;
  ctx.strokeStyle = trim;
  ctx.lineWidth = Math.max(0.95, r * 0.026);
  for (let i = 0; i < scallops; i++) {
    const t = i / (scallops - 1);
    const a = -Math.PI * 0.83 + t * Math.PI * 0.66;
    const fx = Math.cos(a) * r * 0.86;
    const fy = Math.sin(a) * r * 0.86;
    ctx.beginPath();
    ctx.arc(fx, fy, r * 0.145, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawRibbonBow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  fill: string,
  stroke: string
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(0.9, size * 0.1);
  ctx.lineJoin = 'round';

  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(side * size * 0.62, -size * 0.58, side * size, -size * 0.36);
    ctx.quadraticCurveTo(side * size * 0.96, size * 0.12, side * size * 0.82, size * 0.42);
    ctx.quadraticCurveTo(side * size * 0.42, size * 0.32, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(0, 0, size * 0.25, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawYinYangBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  yr: number
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, yr, 0, TAU);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, yr, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.fillStyle = '#db1f38';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -yr * 0.5, yr * 0.5, 0, TAU);
  ctx.fillStyle = '#db1f38';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, yr * 0.5, yr * 0.5, 0, TAU);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -yr * 0.5, yr * 0.18, 0, TAU);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, yr * 0.5, yr * 0.18, 0, TAU);
  ctx.fillStyle = '#db1f38';
  ctx.fill();
  ctx.strokeStyle = '#750c1d';
  ctx.lineWidth = Math.max(0.8, yr * 0.1);
  ctx.beginPath();
  ctx.arc(0, 0, yr, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawGapEye(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  halfW: number,
  halfH: number
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(-halfW, 0);
  ctx.quadraticCurveTo(0, -halfH, halfW, 0);
  ctx.quadraticCurveTo(0, halfH, -halfW, 0);
  ctx.closePath();
  ctx.fillStyle = '#140624';
  ctx.fill();
  ctx.strokeStyle = '#e63259';
  ctx.lineWidth = Math.max(1.1, halfW * 0.065);
  ctx.stroke();

  // Glowing golden-crimson iris peering out of the gap
  ctx.fillStyle = '#fff5cc';
  ctx.beginPath();
  ctx.ellipse(0, 0, halfW * 0.34, halfH * 0.48, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#e0284c';
  ctx.beginPath();
  ctx.ellipse(0, 0, halfW * 0.17, halfH * 0.38, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#180624';
  ctx.beginPath();
  ctx.ellipse(0, 0, halfW * 0.075, halfH * 0.26, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-halfW * 0.06, -halfH * 0.1, Math.max(0.7, halfW * 0.05), 0, TAU);
  ctx.fill();
  ctx.restore();
}

function traceWatermelonStripe(ctx: CanvasRenderingContext2D, x0: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x0, -r * 1.06);
  ctx.bezierCurveTo(
    x0 - r * 0.17,
    -r * 0.46,
    x0 + r * 0.17,
    -r * 0.1,
    x0 - r * 0.06,
    r * 0.32
  );
  ctx.bezierCurveTo(
    x0 - r * 0.18,
    r * 0.64,
    x0 + r * 0.14,
    r * 0.86,
    x0,
    r * 1.08
  );
}

export function drawStarPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerR: number,
  innerR: number
): void {
  let rot = -Math.PI / 2;
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

export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
): void {
  const r = Math.min(radius, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
