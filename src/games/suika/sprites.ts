import {
  ORB_TIERS,
  type FumoExpression,
  type OrbFaceState,
  type OrbTierDef,
  type SupportSpellId,
} from './tiers';

const TAU = Math.PI * 2;
/** Generous padding so plush nub limbs, stems, crowns, hats, bows, wings & horns never clip */
const SPRITE_PAD_RATIO = 1.62;
const EMBROIDERY_INK = '#36211e';

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
  faceState?: OrbFaceState;
}

/**
 * High-DPI offscreen sprite cache for all 11 "苹果乐 × 东方 Fumo" plushie fruit tiers.
 * Normal faces are pre-rendered once per scale bucket; blink & panic expressions are
 * lazily cached per tier on first use so live Fumo expressions run at locked 60fps
 * with authentic bangs layering over eyes.
 */
export class OrbSpriteCache {
  private normalSprites: Array<CachedOrbSprite | null> = new Array(ORB_TIERS.length).fill(null);
  private blinkSprites: Array<CachedOrbSprite | null> = new Array(ORB_TIERS.length).fill(null);
  private panicSprites: Array<CachedOrbSprite | null> = new Array(ORB_TIERS.length).fill(null);
  private currentBucketScale = 0;

  ensureScale(pixelScale: number): void {
    const quantized = Math.max(1, Math.min(3, Math.ceil(pixelScale * 4) / 4));
    if (quantized === this.currentBucketScale && this.normalSprites[0] !== null) return;
    this.currentBucketScale = quantized;
    this.normalSprites = new Array(ORB_TIERS.length).fill(null);
    this.blinkSprites = new Array(ORB_TIERS.length).fill(null);
    this.panicSprites = new Array(ORB_TIERS.length).fill(null);
    for (let t = 0; t < ORB_TIERS.length; t++) {
      this.normalSprites[t] = this.buildSprite(t, quantized, 'normal');
    }
  }

  get(tier: number, faceState: OrbFaceState = 'normal'): CachedOrbSprite | null {
    if (this.currentBucketScale === 0) {
      this.ensureScale(Math.min(window.devicePixelRatio || 1, 2));
    }
    const idx = Math.max(0, Math.min(ORB_TIERS.length - 1, tier));
    if (faceState === 'normal') {
      if (!this.normalSprites[idx]) {
        this.normalSprites[idx] = this.buildSprite(idx, this.currentBucketScale, 'normal');
      }
      return this.normalSprites[idx];
    }
    if (faceState === 'blink') {
      if (!this.blinkSprites[idx]) {
        this.blinkSprites[idx] = this.buildSprite(idx, this.currentBucketScale, 'blink');
      }
      return this.blinkSprites[idx];
    }
    if (!this.panicSprites[idx]) {
      this.panicSprites[idx] = this.buildSprite(idx, this.currentBucketScale, 'panic');
    }
    return this.panicSprites[idx];
  }

  private buildSprite(tier: number, scale: number, faceState: OrbFaceState): CachedOrbSprite {
    const def = ORB_TIERS[tier];
    const logicalHalf = Math.ceil(def.radius * SPRITE_PAD_RATIO);
    const pxSize = Math.max(20, Math.ceil(logicalHalf * 2 * scale));
    const off = document.createElement('canvas');
    off.width = pxSize;
    off.height = pxSize;
    const octx = off.getContext('2d');
    if (octx) {
      octx.setTransform(scale, 0, 0, scale, 0, 0);
      drawTouhouOrb(octx, logicalHalf, logicalHalf, def.radius, tier, 0, {
        iconMode: false,
        faceState,
        time: 0,
      });
    }
    return { canvas: off, logicalHalf, scale };
  }
}

/**
 * Renders a crisp high-DPI miniature icon of any plush fruit tier onto a small UI canvas.
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
  drawTouhouOrb(ctx, cssSize * 0.5, cssSize * 0.55, r, tier, 0, {
    iconMode: true,
    faceState: 'normal',
    time: 0,
  });
}

/**
 * Renders a crisp high-DPI portrait icon for the 4 Support Spell Card selector buttons.
 */
export function renderSupportPortrait(
  canvas: HTMLCanvasElement,
  spellId: SupportSpellId,
  cssSize: number
): void {
  if (spellId === 'reimu') {
    renderOrbIcon(canvas, 9, cssSize);
    return;
  }
  if (spellId === 'sakuya') {
    renderOrbIcon(canvas, 6, cssSize);
    return;
  }
  if (spellId === 'suika') {
    renderOrbIcon(canvas, 10, cssSize);
    return;
  }

  // Bespoke adorable Yukari Yakumo (八云紫) Gap-Plush Fumo portrait icon!
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(cssSize * dpr);
  canvas.height = Math.round(cssSize * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssSize, cssSize);

  const cx = cssSize * 0.5;
  const cy = cssSize * 0.56;
  const r = cssSize * 0.335;

  ctx.save();
  ctx.translate(cx, cy);

  // Subtle violet Gap aura behind Yukari plush
  drawPlushNubLimbs(ctx, r, '#46226e', true);

  // Matte twilight-violet plush body
  const grad = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.08, 0, 0, r * 1.05);
  grad.addColorStop(0, '#ae82e8');
  grad.addColorStop(0.58, '#7949b8');
  grad.addColorStop(1, '#4d2682');
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = '#331559';
  ctx.lineWidth = Math.max(1.1, r * 0.075);
  ctx.stroke();

  // Recessed creamy face cutout
  const faceY = r * 0.09;
  const faceRx = r * 0.66;
  const faceRy = r * 0.56;
  ctx.beginPath();
  ctx.ellipse(0, faceY, faceRx, faceRy, 0, 0, TAU);
  ctx.fillStyle = '#fff8f0';
  ctx.fill();
  ctx.strokeStyle = 'rgba(77, 38, 130, 0.35)';
  ctx.lineWidth = Math.max(0.8, r * 0.05);
  ctx.stroke();

  // Embroidered golden Fumo eyes & playful smile
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, faceY, faceRx, faceRy, 0, 0, TAU);
  ctx.clip();

  drawFumoEyes(ctx, r, '#b57b18', '#ffd966', 'gentle', 'normal');
  drawFumoBlush(ctx, r, '#ff98b2', false);
  drawFumoMouth(ctx, r, 'gentle', 'normal');

  // Golden parted Yukari bangs
  ctx.beginPath();
  ctx.moveTo(-faceRx * 1.08, faceY - faceRy * 1.12);
  ctx.lineTo(faceRx * 1.08, faceY - faceRy * 1.12);
  ctx.lineTo(faceRx * 1.04, faceY + r * 0.08);
  ctx.quadraticCurveTo(r * 0.44, -r * 0.02, r * 0.28, -r * 0.08);
  ctx.quadraticCurveTo(r * 0.12, r * 0.02, 0, -r * 0.08);
  ctx.quadraticCurveTo(-r * 0.12, r * 0.02, -r * 0.28, -r * 0.08);
  ctx.quadraticCurveTo(-r * 0.44, -r * 0.02, -faceRx * 1.04, faceY + r * 0.08);
  ctx.closePath();
  ctx.fillStyle = '#ffe582';
  ctx.fill();
  ctx.strokeStyle = '#9e701e';
  ctx.lineWidth = Math.max(0.75, r * 0.045);
  ctx.stroke();
  ctx.restore();

  // Signature white frilly mob cap with crimson ribbon
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.86, r * 0.64, r * 0.3, 0, 0, TAU);
  ctx.fillStyle = '#fff9f2';
  ctx.fill();
  ctx.strokeStyle = '#6c389c';
  ctx.lineWidth = Math.max(0.9, r * 0.05);
  ctx.stroke();

  // Crimson bow on cap
  drawPlushBow(ctx, 0, -r * 0.72, r * 0.34, '#e03652', '#ffe0a3', '#6e1424');

  // Tiny Gap eye peeking on lower-right rim
  drawMiniGapEye(ctx, r * 0.56, r * 0.56, r * 0.26, r * 0.16);

  ctx.restore();
}

/**
 * Draws one of the 11 adorable "苹果乐 × 东方 Fumo" matte velvety plushie fruits.
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
  const faceState = options.faceState ?? 'normal';

  ctx.save();
  ctx.translate(x, y);
  if (angle !== 0) ctx.rotate(angle);
  if (scaleX !== 1 || scaleY !== 1) ctx.scale(scaleX, scaleY);

  // Subtle cozy aura for flagship high tiers (Reimu Apple & Suika Watermelon)
  if (!iconMode && tier >= 9) {
    const auraR = r * (tier === 10 ? 1.2 : 1.12);
    const aura = ctx.createRadialGradient(0, 0, r * 0.78, 0, 0, auraR);
    aura.addColorStop(0, def.glow);
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, auraR, 0, TAU);
    ctx.fill();
  }

  // 1. Back plush accessories (wings, giant bows, oni horns, half-phantom puff, gourd)
  drawPlushBackAccessories(ctx, r, tier, iconMode);

  // 2. Four tiny stubby creamy-white plush nub limbs (四只小豆豆手脚, 苹果乐 signature!)
  drawPlushNubLimbs(ctx, r, def.stitch, iconMode);

  // 3. Soft matte velvety minky fruit plush body (NO plastic glass sheen!)
  const bodyGrad = ctx.createRadialGradient(-r * 0.28, -r * 0.34, r * 0.08, 0, r * 0.06, r * 1.08);
  bodyGrad.addColorStop(0, def.fruitLight);
  bodyGrad.addColorStop(0.56, def.fruitBase);
  bodyGrad.addColorStop(1, def.fruitShadow);

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // 4. Clipped interior matte fruit textures, plush fabric shading & soft stitched seams
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.clip();

  drawFruitPlushTexture(ctx, r, tier);

  // Gentle warm ambient minky shading (soft matte lower-right shadow)
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.05, 0, TAU);
  ctx.arc(-r * 0.2, -r * 0.24, r * 0.96, 0, TAU, true);
  ctx.fillStyle = tier === 0 ? 'rgba(148, 126, 108, 0.14)' : 'rgba(54, 18, 16, 0.16)';
  ctx.fill('evenodd');
  ctx.restore();

  // Wide diffused velvety peach-fuzz upper-left ambient light (completely matte)
  const fuzz = ctx.createRadialGradient(-r * 0.32, -r * 0.42, 0, -r * 0.32, -r * 0.42, r * 0.62);
  fuzz.addColorStop(0, 'rgba(255, 250, 240, 0.20)');
  fuzz.addColorStop(0.65, 'rgba(255, 250, 240, 0.06)');
  fuzz.addColorStop(1, 'rgba(255, 250, 240, 0)');
  ctx.fillStyle = fuzz;
  ctx.fillRect(-r, -r, r * 2, r * 2);

  // Subtle plush vertical seam line peeks at outer edges on larger fruits
  if (r >= 32) {
    ctx.strokeStyle = 'rgba(255, 248, 236, 0.12)';
    ctx.lineWidth = Math.max(0.8, r * 0.022);
    ctx.setLineDash([r * 0.07, r * 0.06]);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.92, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore(); // end fruit peel clip

  // Soft plush rim & warm fabric stitch outline
  ctx.beginPath();
  ctx.arc(0, 0, r - 0.5, 0, TAU);
  ctx.strokeStyle = def.rim;
  ctx.globalAlpha = 0.52;
  ctx.lineWidth = Math.max(1.0, Math.min(2.4, r * 0.036));
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.arc(0, 0, r + 0.25, 0, TAU);
  ctx.strokeStyle = def.stitch;
  ctx.lineWidth = Math.max(1.05, Math.min(2.3, r * 0.034));
  ctx.stroke();

  // 5. Recessed creamy-white plush face cutout + authentic embroidered Fumo face + layered felt bangs!
  drawFaceCutoutAndFumo(ctx, r, def, faceState);

  // 6. Top fruit stem / leaf / calyx + miniature Touhou headgear & charms
  drawTopFruitAndHeadgear(ctx, r, tier, iconMode);

  // 7. Merge birth soft warm flash overlay
  if (flash > 0.01) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fillStyle = `rgba(255, 250, 230, ${flash * 0.52})`;
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draws the 4 adorable stubby creamy-white plush nub limbs (四只小豆豆手脚)
 * poking symmetrically from left/right and bottom-left/bottom-right — straight from 苹果乐!
 */
function drawPlushNubLimbs(
  ctx: CanvasRenderingContext2D,
  r: number,
  outlineColor: string,
  iconMode: boolean
): void {
  const ext = iconMode ? 0.9 : 1.0;
  const strokeW = Math.max(0.95, Math.min(2.0, r * 0.042));

  // Left & Right tiny stubby plush bean hands
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * r * 0.95 * ext, r * 0.16);
    ctx.rotate(side * 0.34);

    const armGrad = ctx.createRadialGradient(-r * 0.04, -r * 0.05, 0, 0, 0, r * 0.24);
    armGrad.addColorStop(0, '#fffdf9');
    armGrad.addColorStop(0.68, '#f7ece1');
    armGrad.addColorStop(1, '#e0cfc0');

    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.19 * ext, r * 0.135 * ext, 0, 0, TAU);
    ctx.fillStyle = armGrad;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = strokeW;
    ctx.stroke();
    ctx.restore();
  }

  // Bottom-Left & Bottom-Right tiny stubby plush bean feet
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * r * 0.44 * ext, r * 0.92 * ext);
    ctx.rotate(side * -0.22);

    const footGrad = ctx.createRadialGradient(0, -r * 0.04, 0, 0, 0, r * 0.24);
    footGrad.addColorStop(0, '#fffdf8');
    footGrad.addColorStop(0.68, '#f5e8dc');
    footGrad.addColorStop(1, '#dcc8b8');

    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.185 * ext, r * 0.135 * ext, 0, 0, TAU);
    ctx.fillStyle = footGrad;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = strokeW;
    ctx.stroke();
    ctx.restore();
  }
}

function drawPlushBackAccessories(
  ctx: CanvasRenderingContext2D,
  r: number,
  tier: number,
  iconMode: boolean
): void {
  const ext = iconMode ? 0.86 : 1.0;

  switch (tier) {
    case 0: {
      // 白玉果 · 毛玉: soft fluffy white cloud puffs behind the mochi fruit
      const lobes = 8;
      ctx.fillStyle = '#fffbf5';
      ctx.strokeStyle = '#9c8a7a';
      ctx.lineWidth = Math.max(0.95, r * 0.062);
      for (let i = 0; i < lobes; i++) {
        const a = (TAU * i) / lobes + 0.22;
        const px = Math.cos(a) * r * 0.85;
        const py = Math.sin(a) * r * 0.85;
        const pr = r * (i % 2 === 0 ? 0.25 : 0.2);
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.93, 0, TAU);
      ctx.fill();
      break;
    }

    case 1: {
      // 蓝莓 · 琪露诺: 6 cute soft-plush translucent ice-crystal wings
      const wingAngles = [-0.52, -0.06, 0.4];
      for (const side of [-1, 1]) {
        for (let k = 0; k < wingAngles.length; k++) {
          ctx.save();
          ctx.scale(side, 1);
          ctx.rotate(wingAngles[k]);
          const len = r * (0.48 - k * 0.03) * ext;
          const base = r * 0.82;
          const halfW = r * 0.14;
          ctx.beginPath();
          ctx.moveTo(base, 0);
          ctx.lineTo(base + len * 0.46, -halfW);
          ctx.lineTo(base + len, 0);
          ctx.lineTo(base + len * 0.46, halfW);
          ctx.closePath();
          ctx.fillStyle = k === 1 ? '#b8f0ff' : '#8fdcff';
          ctx.fill();
          ctx.strokeStyle = '#2d68b5';
          ctx.lineWidth = Math.max(0.85, r * 0.044);
          ctx.stroke();
          ctx.restore();
        }
      }
      break;
    }

    case 2: {
      // 紫葡萄 · 露米娅: cute pair of small grape buddy-berries tucked at upper back sides
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(side * r * 0.72 * ext, -r * 0.68 * ext, r * 0.26 * ext, 0, TAU);
        ctx.fillStyle = side < 0 ? '#784eb0' : '#5e3691';
        ctx.fill();
        ctx.strokeStyle = '#2d1547';
        ctx.lineWidth = Math.max(0.9, r * 0.038);
        ctx.stroke();
      }
      break;
    }

    case 3: {
      // 草莓 · 芙兰朵露: mini 7-color crystal felt wings + golden side-tail
      const leftGems = [
        { x: 0.94, y: -0.44, c: '#ff4d6a' },
        { x: 1.12, y: -0.26, c: '#ff9d3b' },
        { x: 1.2, y: -0.04, c: '#ffe052' },
        { x: 1.16, y: 0.2, c: '#48db96' },
      ];
      const rightGems = [
        { x: 0.94, y: -0.42, c: '#54d8ff' },
        { x: 1.14, y: -0.18, c: '#5c7cfa' },
        { x: 1.18, y: 0.1, c: '#b366ff' },
      ];

      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.beginPath();
        ctx.moveTo(r * 0.74, -r * 0.08);
        ctx.quadraticCurveTo(r * 1.1 * ext, -r * 0.48 * ext, r * 1.2 * ext, 0.06 * r);
        ctx.strokeStyle = '#47222d';
        ctx.lineWidth = Math.max(1.4, r * 0.056);
        ctx.lineCap = 'round';
        ctx.stroke();

        const gems = side < 0 ? leftGems : rightGems;
        for (const g of gems) {
          const gx = r * g.x * ext;
          const gy = r * g.y * ext;
          const gw = r * 0.095;
          const gh = r * 0.125;
          ctx.beginPath();
          ctx.moveTo(gx, gy - gh);
          ctx.lineTo(gx + gw, gy);
          ctx.lineTo(gx, gy + gh);
          ctx.lineTo(gx - gw, gy);
          ctx.closePath();
          ctx.fillStyle = g.c;
          ctx.fill();
          ctx.strokeStyle = '#fff9f2';
          ctx.lineWidth = Math.max(0.75, r * 0.025);
          ctx.stroke();
        }
        ctx.restore();
      }
      break;
    }

    case 4: {
      // 橘子 · 橙: cute twin orange plush cat tails peeking out on the right side
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(r * 0.78, r * 0.45);
      ctx.quadraticCurveTo(r * 1.24 * ext, r * 0.48, r * 1.14 * ext, r * 0.04);
      ctx.strokeStyle = '#6e2e0b';
      ctx.lineWidth = Math.max(3.2, r * 0.16);
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.strokeStyle = '#f28b30';
      ctx.lineWidth = Math.max(2.0, r * 0.11);
      ctx.stroke();

      // Second little tail tip (bakeneko Chen!)
      ctx.beginPath();
      ctx.moveTo(r * 0.82, r * 0.56);
      ctx.quadraticCurveTo(r * 1.26 * ext, r * 0.72, r * 1.24 * ext, r * 0.34);
      ctx.strokeStyle = '#6e2e0b';
      ctx.lineWidth = Math.max(2.8, r * 0.14);
      ctx.stroke();
      ctx.strokeStyle = '#ffac59';
      ctx.lineWidth = Math.max(1.7, r * 0.092);
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 5: {
      // 青苹果 · 魂魄妖梦: adorable fluffy white half-phantom (半灵) plush puff!
      ctx.save();
      const wx = r * 1.0 * ext;
      const wy = -r * 0.36 * ext;
      const wr = r * 0.25;

      // Soft ghostly mint-cream plush puff
      ctx.beginPath();
      ctx.arc(wx, wy, wr, Math.PI * 0.78, Math.PI * 2.28);
      ctx.quadraticCurveTo(wx + wr * 1.05, wy + wr * 1.2, wx + wr * 1.4, wy + wr * 0.72);
      ctx.quadraticCurveTo(wx + wr * 0.75, wy + wr * 1.75, wx - wr * 0.28, wy + wr * 0.88);
      ctx.closePath();
      const wispGrad = ctx.createRadialGradient(wx - wr * 0.2, wy - wr * 0.2, wr * 0.1, wx, wy, wr * 1.3);
      wispGrad.addColorStop(0, '#ffffff');
      wispGrad.addColorStop(0.7, '#e8faf2');
      wispGrad.addColorStop(1, '#bcead8');
      ctx.fillStyle = wispGrad;
      ctx.fill();
      ctx.strokeStyle = '#3c7d66';
      ctx.lineWidth = Math.max(1, r * 0.028);
      ctx.stroke();

      // Tiny sleepy dot eyes on the half-phantom plush!
      ctx.fillStyle = '#3c7d66';
      ctx.beginPath();
      ctx.arc(wx - wr * 0.26, wy - wr * 0.04, Math.max(0.8, wr * 0.1), 0, TAU);
      ctx.arc(wx + wr * 0.22, wy - wr * 0.04, Math.max(0.8, wr * 0.1), 0, TAU);
      ctx.fill();
      ctx.restore();
      break;
    }

    case 7: {
      // 水蜜桃 · 蕾米莉亚: mini plush gothic bat wings
      ctx.save();
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.beginPath();
        ctx.moveTo(r * 0.8, -r * 0.12);
        ctx.quadraticCurveTo(r * 1.08 * ext, -r * 0.54 * ext, r * 1.28 * ext, -r * 0.24 * ext);
        ctx.quadraticCurveTo(r * 1.15 * ext, -r * 0.02, r * 1.2 * ext, r * 0.16 * ext);
        ctx.quadraticCurveTo(r * 1.04 * ext, r * 0.08, r * 0.98 * ext, r * 0.24 * ext);
        ctx.quadraticCurveTo(r * 0.88 * ext, r * 0.14, r * 0.78, r * 0.2);
        ctx.closePath();
        ctx.fillStyle = '#471a30';
        ctx.fill();
        ctx.strokeStyle = '#d9486a';
        ctx.lineWidth = Math.max(1.0, r * 0.028);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      break;
    }

    case 8: {
      // 菠萝 · 雾雨魔理沙: lush green plush pineapple leaf crown behind the hat!
      drawPineappleLeafCrown(ctx, r, ext);
      break;
    }

    case 9: {
      // 红富士大苹果 · 博丽灵梦: iconic sweeping giant crimson-white shrine ribbon bow!
      ctx.save();
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.82);
        ctx.quadraticCurveTo(r * 0.58 * ext, -r * 1.38 * ext, r * 1.14 * ext, -r * 0.88 * ext);
        ctx.quadraticCurveTo(r * 1.05 * ext, -r * 0.58 * ext, r * 0.86 * ext, -r * 0.42 * ext);
        ctx.quadraticCurveTo(r * 0.42 * ext, -r * 0.64 * ext, 0, -r * 0.7);
        ctx.closePath();
        const bowGrad = ctx.createLinearGradient(0, -r * 1.25, r * 1.05, -r * 0.48);
        bowGrad.addColorStop(0, '#f24b59');
        bowGrad.addColorStop(0.6, '#cf2538');
        bowGrad.addColorStop(1, '#9e1929');
        ctx.fillStyle = bowGrad;
        ctx.fill();
        ctx.strokeStyle = '#fff5ea';
        ctx.lineWidth = Math.max(1.4, r * 0.028);
        ctx.stroke();

        // Warm plush fold stitch line
        ctx.beginPath();
        ctx.moveTo(r * 0.18, -r * 0.82);
        ctx.quadraticCurveTo(r * 0.54 * ext, -r * 0.94 * ext, r * 0.84 * ext, -r * 0.72 * ext);
        ctx.strokeStyle = 'rgba(255, 236, 224, 0.42)';
        ctx.lineWidth = Math.max(0.9, r * 0.018);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      break;
    }

    case 10: {
      // 大西瓜 · 伊吹萃香: curved golden-amber plush oni horns + mini sake gourd!
      ctx.save();
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        const hornGrad = ctx.createLinearGradient(r * 0.25, -r * 0.72, r * 0.7, -r * 1.34);
        hornGrad.addColorStop(0, '#c46521');
        hornGrad.addColorStop(0.5, '#f2ad42');
        hornGrad.addColorStop(1, '#ffea99');
        ctx.beginPath();
        ctx.moveTo(r * 0.24, -r * 0.82);
        ctx.bezierCurveTo(
          r * 0.54 * ext,
          -r * 0.94 * ext,
          r * 0.78 * ext,
          -r * 1.15 * ext,
          r * 0.62 * ext,
          -r * 1.36 * ext
        );
        ctx.bezierCurveTo(
          r * 0.5 * ext,
          -r * 1.18 * ext,
          r * 0.42 * ext,
          -r * 1.0 * ext,
          r * 0.48,
          -r * 0.72
        );
        ctx.closePath();
        ctx.fillStyle = hornGrad;
        ctx.fill();
        ctx.strokeStyle = '#59280e';
        ctx.lineWidth = Math.max(1.3, r * 0.025);
        ctx.stroke();
        ctx.restore();
      }

      // Cute miniature plush Ibuki sake gourd tucked on lower-right side
      ctx.save();
      ctx.translate(r * 0.96 * ext, -r * 0.26 * ext);
      ctx.rotate(0.28);
      ctx.fillStyle = '#e8aa4d';
      ctx.strokeStyle = '#5c2d10';
      ctx.lineWidth = Math.max(1.0, r * 0.022);
      ctx.beginPath();
      ctx.arc(0, r * 0.12, r * 0.145, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -r * 0.05, r * 0.1, 0, TAU);
      ctx.fill();
      ctx.stroke();
      // Red ribbon tied around gourd waist
      ctx.strokeStyle = '#db2b42';
      ctx.lineWidth = Math.max(1.4, r * 0.032);
      ctx.beginPath();
      ctx.moveTo(-r * 0.09, r * 0.02);
      ctx.lineTo(r * 0.09, r * 0.02);
      ctx.stroke();
      ctx.restore();

      ctx.restore();
      break;
    }
  }
}

function drawPineappleLeafCrown(ctx: CanvasRenderingContext2D, r: number, ext: number): void {
  ctx.save();
  const leaves = [
    { ang: -0.62, len: 0.44, w: 0.13, c: '#3f9946' },
    { ang: 0.62, len: 0.44, w: 0.13, c: '#3f9946' },
    { ang: -0.32, len: 0.56, w: 0.15, c: '#54b858' },
    { ang: 0.32, len: 0.56, w: 0.15, c: '#54b858' },
    { ang: 0, len: 0.62, w: 0.16, c: '#6ed16b' },
  ];
  for (const lf of leaves) {
    ctx.save();
    ctx.translate(0, -r * 0.86);
    ctx.rotate(lf.ang);
    ctx.beginPath();
    ctx.moveTo(-r * lf.w, r * 0.06);
    ctx.quadraticCurveTo(-r * lf.w * 0.7, -r * lf.len * 0.6 * ext, 0, -r * lf.len * ext);
    ctx.quadraticCurveTo(r * lf.w * 0.7, -r * lf.len * 0.6 * ext, r * lf.w, r * 0.06);
    ctx.closePath();
    ctx.fillStyle = lf.c;
    ctx.fill();
    ctx.strokeStyle = '#245c2a';
    ctx.lineWidth = Math.max(1.0, r * 0.022);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawFruitPlushTexture(ctx: CanvasRenderingContext2D, r: number, tier: number): void {
  switch (tier) {
    case 0: {
      // 白玉果: gentle top fruit dimple shadow
      ctx.fillStyle = 'rgba(182, 162, 140, 0.24)';
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.84, r * 0.28, r * 0.1, 0, 0, TAU);
      ctx.fill();
      break;
    }

    case 1: {
      // 蓝莓: soft matte powdery bloom + subtle plush panel stitch curves
      ctx.strokeStyle = 'rgba(220, 244, 255, 0.24)';
      ctx.lineWidth = Math.max(0.8, r * 0.032);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(side * r * 0.55, 0, r * 0.85, side < 0 ? -0.9 : Math.PI - 0.9, side < 0 ? 0.9 : Math.PI + 0.9);
        ctx.stroke();
      }
      break;
    }

    case 2: {
      // 紫葡萄: soft velvety bloom highlights on cheeks
      const bloom = ctx.createRadialGradient(-r * 0.58, -r * 0.35, 0, -r * 0.58, -r * 0.35, r * 0.48);
      bloom.addColorStop(0, 'rgba(228, 206, 255, 0.24)');
      bloom.addColorStop(1, 'rgba(228, 206, 255, 0)');
      ctx.fillStyle = bloom;
      ctx.fillRect(-r, -r, r * 2, r * 2);
      break;
    }

    case 3: {
      // 草莓: cute golden-yellow embroidered strawberry seeds around the red peel!
      const seeds: Array<[number, number, number]> = [
        [-0.76, -0.34, -0.3],
        [0.76, -0.34, 0.3],
        [-0.82, 0.1, -0.1],
        [0.82, 0.1, 0.1],
        [-0.68, 0.54, 0.28],
        [0.68, 0.54, -0.28],
        [-0.3, 0.78, 0.12],
        [0.3, 0.78, -0.12],
        [0, 0.84, 0],
      ];
      ctx.fillStyle = '#ffe580';
      ctx.strokeStyle = '#996018';
      ctx.lineWidth = Math.max(0.6, r * 0.02);
      for (const [sx, sy, rot] of seeds) {
        ctx.save();
        ctx.translate(sx * r, sy * r);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.045, r * 0.072, 0, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      break;
    }

    case 4: {
      // 橘子: subtle citrus dimple pores around outer tangerine peel
      ctx.fillStyle = 'rgba(166, 68, 12, 0.22)';
      const pores: Array<[number, number]> = [
        [-0.78, -0.28], [-0.84, 0.08], [-0.72, 0.44], [-0.46, 0.74],
        [0.78, -0.28], [0.84, 0.08], [0.72, 0.44], [0.46, 0.74],
        [-0.62, -0.56], [0.62, -0.56], [0, 0.82],
      ];
      for (const [px, py] of pores) {
        ctx.beginPath();
        ctx.arc(px * r, py * r, Math.max(0.8, r * 0.03), 0, TAU);
        ctx.fill();
      }
      break;
    }

    case 5: {
      // 青苹果: cozy top apple cleft shadow + soft light-apple cheek blush
      ctx.fillStyle = 'rgba(52, 112, 34, 0.26)';
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.86, r * 0.3, r * 0.11, 0, 0, TAU);
      ctx.fill();
      break;
    }

    case 6: {
      // 雪梨: delicate warm snow-pear blush & tiny caramel speckles
      const blush = ctx.createRadialGradient(r * 0.56, r * 0.34, 0, r * 0.56, r * 0.34, r * 0.55);
      blush.addColorStop(0, 'rgba(255, 200, 150, 0.32)');
      blush.addColorStop(1, 'rgba(255, 200, 150, 0)');
      ctx.fillStyle = blush;
      ctx.fillRect(-r, -r, r * 2, r * 2);

      ctx.fillStyle = 'rgba(156, 124, 58, 0.24)';
      const specks: Array<[number, number]> = [
        [-0.78, -0.2], [-0.76, 0.36], [-0.48, 0.74],
        [0.78, -0.24], [0.8, 0.28], [0.52, 0.72],
        [-0.62, -0.58], [0.62, -0.58], [0.18, 0.84], [-0.22, 0.82],
      ];
      for (const [sx, sy] of specks) {
        ctx.beginPath();
        ctx.arc(sx * r, sy * r, Math.max(0.8, r * 0.022), 0, TAU);
        ctx.fill();
      }
      break;
    }

    case 7: {
      // 水蜜桃: velvety rose-blush peach cheek gradient + soft top peach cleft!
      const topBlush = ctx.createRadialGradient(0, -r * 0.55, r * 0.05, 0, -r * 0.35, r * 0.95);
      topBlush.addColorStop(0, 'rgba(255, 118, 156, 0.36)');
      topBlush.addColorStop(0.6, 'rgba(255, 198, 212, 0.12)');
      topBlush.addColorStop(1, 'rgba(255, 240, 224, 0.18)');
      ctx.fillStyle = topBlush;
      ctx.fillRect(-r, -r, r * 2, r * 2);

      // Soft peach vertical cleft curve at top & bottom
      ctx.strokeStyle = 'rgba(176, 72, 106, 0.32)';
      ctx.lineWidth = Math.max(1.2, r * 0.028);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.98);
      ctx.quadraticCurveTo(r * 0.05, -r * 0.72, 0, -r * 0.52);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, r * 0.72);
      ctx.quadraticCurveTo(-r * 0.04, r * 0.86, 0, r * 0.98);
      ctx.stroke();
      break;
    }

    case 8: {
      // 菠萝: stitched-diamond quilted golden plush pineapple pattern!
      ctx.save();
      ctx.strokeStyle = 'rgba(138, 86, 12, 0.32)';
      ctx.lineWidth = Math.max(1.1, r * 0.02);
      ctx.setLineDash([r * 0.08, r * 0.05]);
      const step = r * 0.34;
      for (let d = -r * 2; d <= r * 2; d += step) {
        ctx.beginPath();
        ctx.moveTo(d, -r * 1.1);
        ctx.lineTo(d + r * 1.5, r * 1.1);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(d, -r * 1.1);
        ctx.lineTo(d - r * 1.5, r * 1.1);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Tiny stitched diamond center pips along outer pineapple peel
      ctx.fillStyle = 'rgba(150, 92, 14, 0.28)';
      const pips: Array<[number, number]> = [
        [-0.78, -0.22], [-0.8, 0.24], [-0.56, 0.66],
        [0.78, -0.22], [0.8, 0.24], [0.56, 0.66],
        [-0.64, -0.58], [0.64, -0.58], [0, 0.82],
      ];
      for (const [px, py] of pips) {
        ctx.beginPath();
        ctx.arc(px * r, py * r, Math.max(1, r * 0.025), 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      break;
    }

    case 9: {
      // 红富士大苹果 · 博丽灵梦: iconic 苹果乐 apple cleft dimple + warm plush sheen + shrine collar accent!
      ctx.fillStyle = 'rgba(115, 16, 22, 0.32)';
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.86, r * 0.32, r * 0.12, 0, 0, TAU);
      ctx.fill();

      // Subtle warm crimson Fuji apple vertical stripes along edges
      ctx.strokeStyle = 'rgba(255, 186, 158, 0.16)';
      ctx.lineWidth = Math.max(1.5, r * 0.045);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(side * r * 0.22, 0, r * 0.88, side < 0 ? 0.72 * Math.PI : -0.28 * Math.PI, side < 0 ? 1.28 * Math.PI : 0.28 * Math.PI);
        ctx.stroke();
      }

      // Tiny white shrine collar bow accent sewn at very bottom of the apple
      ctx.fillStyle = 'rgba(255, 248, 240, 0.85)';
      ctx.beginPath();
      ctx.moveTo(-r * 0.22, r * 0.98);
      ctx.quadraticCurveTo(0, r * 0.76, r * 0.22, r * 0.98);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 10: {
      // 大西瓜 · 伊吹萃香: iconic wavy dark-jade matte plush watermelon stripes!
      ctx.save();
      ctx.lineCap = 'round';
      const stripeXs = [-0.78, -0.44, 0, 0.44, 0.78];
      for (const sx of stripeXs) {
        const x0 = r * sx;
        ctx.strokeStyle = 'rgba(14, 72, 36, 0.62)';
        ctx.lineWidth = r * 0.16;
        traceWatermelonStripe(ctx, x0, r);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(24, 108, 54, 0.38)';
        ctx.lineWidth = r * 0.065;
        traceWatermelonStripe(ctx, x0, r);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
  }
}

/**
 * Draws the recessed creamy-white plush face cutout, authentic Fumo embroidered face,
 * and layered character hair bangs resting right over the top of the face window (苹果乐 style!).
 */
function drawFaceCutoutAndFumo(
  ctx: CanvasRenderingContext2D,
  r: number,
  def: OrbTierDef,
  faceState: OrbFaceState
): void {
  const tier = def.tier;
  const faceY = r * 0.09;
  const faceRx = r * (tier <= 1 ? 0.67 : 0.62);
  const faceRy = r * (tier <= 1 ? 0.58 : 0.53);

  // 1. Recessed plush face cutout base (creamy-white minky)
  const faceGrad = ctx.createRadialGradient(0, faceY - faceRy * 0.25, 0, 0, faceY + faceRy * 0.1, faceRx * 1.15);
  faceGrad.addColorStop(0, def.faceCream);
  faceGrad.addColorStop(0.75, '#faefe4');
  faceGrad.addColorStop(1, '#ecd9ca');

  ctx.beginPath();
  ctx.ellipse(0, faceY, faceRx, faceRy, 0, 0, TAU);
  ctx.fillStyle = faceGrad;
  ctx.fill();

  // 2. Clip inside face cutout to draw recessed inner rim shadow, embroidered Fumo face, and layered bangs
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, faceY, faceRx, faceRy, 0, 0, TAU);
  ctx.clip();

  // Soft recessed seam inner shadow along upper/side hood edge
  ctx.save();
  ctx.strokeStyle = 'rgba(84, 40, 34, 0.18)';
  ctx.lineWidth = Math.max(1.4, r * 0.055);
  ctx.beginPath();
  ctx.ellipse(0, faceY + r * 0.025, faceRx, faceRy, 0, 0, TAU);
  ctx.stroke();
  ctx.restore();

  // 3. Authentic Fumo embroidered eyes, rosy blush puffs, and minimalist mouth
  drawFumoBlush(ctx, r, def.blush, faceState === 'panic');
  drawFumoEyes(ctx, r, def.eyeTop, def.eyeBottom, def.expression, faceState);
  drawFumoMouth(ctx, r, def.expression, faceState);

  // 4. Layered plush felt character hair bangs resting over top of face cutout!
  drawPlushHairBangs(ctx, r, def, faceY, faceRx, faceRy);

  ctx.restore(); // end face cutout clip

  // Delicate stitched border around the plush face cutout window
  ctx.beginPath();
  ctx.ellipse(0, faceY, faceRx, faceRy, 0, 0, TAU);
  ctx.strokeStyle = tier === 0 ? 'rgba(155, 134, 118, 0.38)' : 'rgba(64, 28, 24, 0.28)';
  ctx.lineWidth = Math.max(0.85, Math.min(1.8, r * 0.028));
  ctx.stroke();

  // Front hair charms that sit right on top of the face/bangs border (Reimu white tubes, Suika brow beads)
  if (tier === 9) {
    // Reimu's iconic twin white hair tubes framing her plush bangs!
    ctx.fillStyle = '#fffdf8';
    ctx.strokeStyle = '#c4273b';
    ctx.lineWidth = Math.max(1.0, r * 0.022);
    for (const side of [-1, 1]) {
      roundRectPath(ctx, side * r * 0.56 - r * 0.06, -r * 0.05, r * 0.12, r * 0.28, r * 0.04);
      ctx.fill();
      ctx.stroke();
    }
  } else if (tier === 10) {
    // Suika's signature geometric brow charm chain (red circle, gold triangle, blue square)
    const cy = -r * 0.25;
    ctx.strokeStyle = '#ffe27a';
    ctx.lineWidth = Math.max(1.1, r * 0.022);
    ctx.beginPath();
    ctx.moveTo(-r * 0.34, cy - r * 0.02);
    ctx.quadraticCurveTo(0, cy + r * 0.07, r * 0.34, cy - r * 0.02);
    ctx.stroke();

    // Red circle
    ctx.fillStyle = '#f24b64';
    ctx.strokeStyle = '#521822';
    ctx.lineWidth = Math.max(0.9, r * 0.018);
    ctx.beginPath();
    ctx.arc(-r * 0.2, cy + r * 0.02, r * 0.062, 0, TAU);
    ctx.fill();
    ctx.stroke();

    // Gold triangle
    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    ctx.moveTo(0, cy - r * 0.045);
    ctx.lineTo(r * 0.068, cy + r * 0.075);
    ctx.lineTo(-r * 0.068, cy + r * 0.075);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Blue square
    ctx.fillStyle = '#57c9ff';
    const sq = r * 0.11;
    ctx.fillRect(r * 0.145, cy - r * 0.035, sq, sq);
    ctx.strokeRect(r * 0.145, cy - r * 0.035, sq, sq);
  }
}

function drawFumoBlush(
  ctx: CanvasRenderingContext2D,
  r: number,
  blushColor: string,
  panicked: boolean
): void {
  const bx = r * 0.35;
  const by = r * 0.27;
  const brx = r * (panicked ? 0.14 : 0.115);
  const bry = r * (panicked ? 0.085 : 0.068);
  for (const side of [-1, 1]) {
    const g = ctx.createRadialGradient(side * bx, by, 0, side * bx, by, brx * 1.2);
    g.addColorStop(0, panicked ? 'rgba(255, 118, 146, 0.72)' : hexToRgba(blushColor, 0.58));
    g.addColorStop(1, 'rgba(255, 150, 175, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(side * bx, by, brx * 1.15, bry * 1.25, 0, 0, TAU);
    ctx.fill();
  }
}

function drawFumoEyes(
  ctx: CanvasRenderingContext2D,
  r: number,
  eyeTop: string,
  eyeBottom: string,
  expression: FumoExpression,
  faceState: OrbFaceState
): void {
  const ex = r * 0.245;
  const ey = r * 0.135;
  const erx = r * 0.118;
  const ery = r * 0.138;
  const embW = Math.max(1.2, r * 0.044);

  // Panicked "＞  ＜" squeezed embroidered eyes!
  if (faceState === 'panic') {
    ctx.strokeStyle = EMBROIDERY_INK;
    ctx.lineWidth = Math.max(1.4, r * 0.052);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Left eye: ＞
    ctx.beginPath();
    ctx.moveTo(-ex - erx * 0.8, ey - ery * 0.65);
    ctx.lineTo(-ex + erx * 0.75, ey);
    ctx.lineTo(-ex - erx * 0.8, ey + ery * 0.65);
    ctx.stroke();

    // Right eye: ＜
    ctx.beginPath();
    ctx.moveTo(ex + erx * 0.8, ey - ery * 0.65);
    ctx.lineTo(ex - erx * 0.75, ey);
    ctx.lineTo(ex + erx * 0.8, ey + ery * 0.65);
    ctx.stroke();
    return;
  }

  // Blinking closed embroidered lashes!
  if (faceState === 'blink') {
    ctx.strokeStyle = EMBROIDERY_INK;
    ctx.lineWidth = Math.max(1.3, r * 0.048);
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      if (expression === 'deadpan') {
        ctx.moveTo(side * ex - erx * 0.88, ey + ery * 0.08);
        ctx.lineTo(side * ex + erx * 0.88, ey + ery * 0.08);
      } else {
        ctx.arc(side * ex, ey - ery * 0.15, erx * 0.9, 0.18 * Math.PI, 0.82 * Math.PI);
      }
      ctx.stroke();
    }
    return;
  }

  // Special adorable minimalist dot eyes for Tier 0 Kedama (·ω·)
  if (expression === 'kedama') {
    const dotR = Math.max(1.5, r * 0.105);
    for (const side of [-1, 1]) {
      ctx.fillStyle = EMBROIDERY_INK;
      ctx.beginPath();
      ctx.arc(side * ex * 0.94, ey, dotR, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(side * ex * 0.94 - dotR * 0.32, ey - dotR * 0.34, dotR * 0.34, 0, TAU);
      ctx.fill();
    }
    return;
  }

  // Authentic embroidered Fumo rounded-oval eyes!
  for (const side of [-1, 1]) {
    // Marisa right-eye wink (`ᗜ▽<`)
    if (expression === 'wink' && side === 1) {
      ctx.strokeStyle = EMBROIDERY_INK;
      ctx.lineWidth = Math.max(1.5, r * 0.052);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(ex + erx * 0.82, ey - ery * 0.56);
      ctx.lineTo(ex - erx * 0.72, ey + ery * 0.04);
      ctx.lineTo(ex + erx * 0.82, ey + ery * 0.62);
      ctx.stroke();
      continue;
    }

    const cx = side * ex;

    // 1. Clean soft iris satin-stitch gradient inside rounded Fumo oval
    const irisGrad = ctx.createLinearGradient(cx, ey - ery, cx, ey + ery);
    irisGrad.addColorStop(0, eyeTop);
    irisGrad.addColorStop(0.62, eyeBottom);
    irisGrad.addColorStop(1, '#fff5e6');

    ctx.beginPath();
    ctx.ellipse(cx, ey, erx, ery, 0, 0, TAU);
    ctx.fillStyle = irisGrad;
    ctx.fill();

    // Soft deeper upper iris shadow (gives iconic Fumo plush depth)
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, ey, erx, ery, 0, 0, TAU);
    ctx.clip();

    ctx.fillStyle = 'rgba(40, 16, 16, 0.28)';
    ctx.beginPath();
    ctx.ellipse(cx, ey - ery * 0.52, erx * 1.15, ery * 0.55, 0, 0, TAU);
    ctx.fill();

    // Bright embroidered upper catchlight + tiny lower sparkle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx - erx * 0.28, ey - ery * 0.28, erx * 0.36, ery * 0.28, -0.3, 0, TAU);
    ctx.fill();

    if (r >= 28) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.beginPath();
      ctx.arc(cx + erx * 0.28, ey + ery * 0.34, Math.max(0.7, erx * 0.16), 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // 2. Thick dark-brown/charcoal Fumo embroidery outline around eye
    ctx.beginPath();
    ctx.ellipse(cx, ey, erx, ery, 0, 0, TAU);
    ctx.strokeStyle = EMBROIDERY_INK;
    ctx.lineWidth = embW;
    ctx.stroke();

    // Thick iconic flat-curved upper Fumo lash arc (gives the signature ᗜ shape!)
    ctx.strokeStyle = EMBROIDERY_INK;
    ctx.lineWidth = Math.max(1.4, embW * 1.45);
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (expression === 'deadpan' || expression === 'smug') {
      ctx.moveTo(cx - erx * 1.04, ey - ery * 0.72);
      ctx.quadraticCurveTo(cx, ey - ery * 1.06, cx + erx * 1.04, ey - ery * 0.72);
    } else if (expression === 'proud') {
      ctx.moveTo(cx - side * erx * 1.02, ey - ery * 0.62);
      ctx.quadraticCurveTo(cx, ey - ery * 1.04, cx + side * erx * 1.05, ey - ery * 0.88);
    } else {
      ctx.arc(cx, ey, erx * 1.02, Math.PI * 1.12, Math.PI * 1.88);
    }
    ctx.stroke();

    // Delicate embroidered eyebrow peeking above eye (for medium/large tiers)
    if (r >= 26) {
      ctx.strokeStyle = EMBROIDERY_INK;
      ctx.lineWidth = Math.max(0.9, r * 0.028);
      ctx.beginPath();
      const by = ey - ery * 1.38;
      if (expression === 'proud') {
        ctx.moveTo(cx - side * erx * 0.62, by + r * 0.025);
        ctx.lineTo(cx + side * erx * 0.68, by - r * 0.025);
      } else if (expression === 'smug') {
        ctx.moveTo(cx - erx * 0.6, by + (side < 0 ? 0.02 * r : -0.015 * r));
        ctx.quadraticCurveTo(cx, by - r * 0.035, cx + erx * 0.6, by + (side < 0 ? -0.015 * r : 0.02 * r));
      } else {
        ctx.moveTo(cx - erx * 0.55, by);
        ctx.quadraticCurveTo(cx, by - r * 0.02, cx + erx * 0.55, by);
      }
      ctx.stroke();
    }
  }
}

function drawFumoMouth(
  ctx: CanvasRenderingContext2D,
  r: number,
  expression: FumoExpression,
  faceState: OrbFaceState
): void {
  const my = r * 0.34;
  const strokeW = Math.max(1.15, r * 0.04);
  ctx.strokeStyle = EMBROIDERY_INK;
  ctx.lineWidth = strokeW;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Panicked squiggly `﹏` mouth!
  if (faceState === 'panic') {
    const mw = r * 0.16;
    ctx.beginPath();
    ctx.moveTo(-mw, my + r * 0.01);
    ctx.quadraticCurveTo(-mw * 0.5, my - r * 0.055, 0, my + r * 0.01);
    ctx.quadraticCurveTo(mw * 0.5, my + r * 0.065, mw, my + r * 0.01);
    ctx.stroke();
    return;
  }

  switch (expression) {
    case 'kedama':
    case 'cat': {
      // Iconic cute `ω` kitty/mochi mouth (`·ω·` / `ᗜωᗜ`)
      const mw = r * 0.135;
      ctx.beginPath();
      ctx.moveTo(-mw, my - r * 0.01);
      ctx.quadraticCurveTo(-mw * 0.5, my + r * 0.085, 0, my - r * 0.005);
      ctx.quadraticCurveTo(mw * 0.5, my + r * 0.085, mw, my - r * 0.01);
      ctx.stroke();
      break;
    }

    case 'smug': {
      // Cirno cheeky smirk (`ᗜˬᗜ`)
      const mw = r * 0.12;
      ctx.beginPath();
      ctx.moveTo(-mw, my + r * 0.01);
      ctx.quadraticCurveTo(mw * 0.2, my + r * 0.065, mw * 1.15, my - r * 0.045);
      ctx.stroke();
      break;
    }

    case 'deadpan': {
      // Iconic minimalist Fumo deadpan stitch (`ᗜ_ᗜ`)
      const mw = r * 0.115;
      ctx.beginPath();
      ctx.moveTo(-mw, my + r * 0.015);
      ctx.quadraticCurveTo(0, my + r * 0.032, mw, my + r * 0.015);
      ctx.stroke();
      break;
    }

    case 'gentle': {
      // Serene Sakuya Fumo smile (`ᗜ‿ᗜ`)
      const mw = r * 0.13;
      ctx.beginPath();
      ctx.moveTo(-mw, my - r * 0.015);
      ctx.quadraticCurveTo(0, my + r * 0.085, mw, my - r * 0.015);
      ctx.stroke();
      break;
    }

    case 'proud': {
      // Proud Remilia vampiric pout-smirk (`ᗜ‸ᗜ`) + tiny white fang!
      const mw = r * 0.115;
      ctx.beginPath();
      ctx.moveTo(-mw, my + r * 0.035);
      ctx.quadraticCurveTo(0, my - r * 0.035, mw, my + r * 0.035);
      ctx.stroke();

      // Tiny crisp white vampire fang
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(mw * 0.3, my + r * 0.01);
      ctx.lineTo(mw * 0.65, my + r * 0.018);
      ctx.lineTo(mw * 0.45, my + r * 0.085);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = EMBROIDERY_INK;
      ctx.lineWidth = Math.max(0.7, strokeW * 0.65);
      ctx.stroke();
      break;
    }

    case 'fang':
    case 'wink':
    case 'tipsy': {
      // Embroidered open coral-pink plush mouth (`ᗜ▽ᗜ` / `ᗜ▽<`) just like 苹果乐!
      const mw = r * (expression === 'tipsy' ? 0.155 : 0.13);
      const mh = r * (expression === 'tipsy' ? 0.15 : 0.125);
      ctx.beginPath();
      ctx.moveTo(-mw, my - r * 0.025);
      ctx.lineTo(mw, my - r * 0.025);
      ctx.quadraticCurveTo(mw * 0.65, my + mh, 0, my + mh);
      ctx.quadraticCurveTo(-mw * 0.65, my + mh, -mw, my - r * 0.025);
      ctx.closePath();
      ctx.fillStyle = expression === 'tipsy' ? '#ff7084' : '#f26d7d';
      ctx.fill();
      ctx.stroke();

      // Tiny warm tongue highlight
      if (r >= 32) {
        ctx.fillStyle = '#ffa6b2';
        ctx.beginPath();
        ctx.ellipse(0, my + mh * 0.65, mw * 0.48, mh * 0.26, 0, 0, TAU);
        ctx.fill();
      }

      // Cute tiny white fang for Flandre
      if (expression === 'fang') {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(mw * 0.34, my - r * 0.022);
        ctx.lineTo(mw * 0.72, my - r * 0.022);
        ctx.lineTo(mw * 0.52, my + mh * 0.42);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
  }
}

/**
 * Draws layered felt/minky character bangs draping over the top of the creamy face cutout,
 * complete with a gentle plush cast shadow onto the face (exact 苹果乐 plush layering!).
 */
function drawPlushHairBangs(
  ctx: CanvasRenderingContext2D,
  r: number,
  def: OrbTierDef,
  faceY: number,
  faceRx: number,
  faceRy: number
): void {
  const tier = def.tier;
  const topY = faceY - faceRy * 1.15;

  const traceBangsPath = (): void => {
    ctx.beginPath();
    if (tier === 0) {
      // 毛玉: soft fluffy white cloud-wool top tuft
      ctx.moveTo(-faceRx * 1.08, topY);
      ctx.lineTo(faceRx * 1.08, topY);
      ctx.lineTo(faceRx * 1.04, -r * 0.14);
      ctx.quadraticCurveTo(r * 0.44, -r * 0.08, r * 0.24, -r * 0.19);
      ctx.quadraticCurveTo(r * 0.08, -r * 0.08, 0, -r * 0.18);
      ctx.quadraticCurveTo(-r * 0.08, -r * 0.08, -r * 0.24, -r * 0.19);
      ctx.quadraticCurveTo(-r * 0.44, -r * 0.08, -faceRx * 1.04, -r * 0.14);
      ctx.closePath();
      return;
    }

    if (tier === 1 || tier === 10) {
      // 琪露诺 & 伊吹萃香: energetic spiky felt bangs!
      ctx.moveTo(-faceRx * 1.1, topY);
      ctx.lineTo(faceRx * 1.1, topY);
      ctx.lineTo(faceRx * 1.06, r * 0.18);
      ctx.lineTo(r * 0.52, -r * 0.02);
      ctx.lineTo(r * 0.44, r * 0.12);
      ctx.lineTo(r * 0.26, -r * 0.08);
      ctx.lineTo(r * 0.12, r * 0.03);
      ctx.lineTo(0, -r * 0.1);
      ctx.lineTo(-r * 0.12, r * 0.03);
      ctx.lineTo(-r * 0.26, -r * 0.08);
      ctx.lineTo(-r * 0.44, r * 0.12);
      ctx.lineTo(-r * 0.52, -r * 0.02);
      ctx.lineTo(-faceRx * 1.06, r * 0.18);
      ctx.closePath();
      return;
    }

    if (tier === 9) {
      // 博丽灵梦: lush layered shrine-maiden bangs + long cheek-framing side locks!
      ctx.moveTo(-faceRx * 1.1, topY);
      ctx.lineTo(faceRx * 1.1, topY);
      ctx.lineTo(faceRx * 1.08, r * 0.32);
      ctx.quadraticCurveTo(r * 0.54, r * 0.24, r * 0.47, -r * 0.02);
      ctx.quadraticCurveTo(r * 0.34, -r * 0.09, r * 0.18, -r * 0.04);
      ctx.quadraticCurveTo(r * 0.08, r * 0.05, 0, -r * 0.05);
      ctx.quadraticCurveTo(-r * 0.08, r * 0.05, -r * 0.18, -r * 0.04);
      ctx.quadraticCurveTo(-r * 0.34, -r * 0.09, -r * 0.47, -r * 0.02);
      ctx.quadraticCurveTo(-r * 0.54, r * 0.24, -faceRx * 1.08, r * 0.32);
      ctx.closePath();
      return;
    }

    if (tier === 8 || tier === 6) {
      // 魔理沙 & 咲夜: breezy parted plush bangs with sweeping side-locks
      ctx.moveTo(-faceRx * 1.1, topY);
      ctx.lineTo(faceRx * 1.1, topY);
      ctx.lineTo(faceRx * 1.06, r * 0.28);
      ctx.quadraticCurveTo(r * 0.52, r * 0.16, r * 0.44, -r * 0.04);
      ctx.quadraticCurveTo(r * 0.22, -r * 0.09, r * 0.04, -r * 0.02);
      ctx.quadraticCurveTo(-r * 0.02, -r * 0.12, -r * 0.12, -r * 0.02);
      ctx.quadraticCurveTo(-r * 0.28, -r * 0.09, -r * 0.44, -r * 0.04);
      ctx.quadraticCurveTo(-r * 0.52, r * 0.16, -faceRx * 1.06, r * 0.28);
      ctx.closePath();
      return;
    }

    // Standard layered Fumo felt bangs (Rumia, Flandre, Chen, Youmu, Remilia)
    ctx.moveTo(-faceRx * 1.1, topY);
    ctx.lineTo(faceRx * 1.1, topY);
    ctx.lineTo(faceRx * 1.05, r * 0.22);
    ctx.quadraticCurveTo(r * 0.5, r * 0.12, r * 0.44, -r * 0.05);
    ctx.quadraticCurveTo(r * 0.28, -r * 0.1, r * 0.16, -r * 0.03);
    ctx.quadraticCurveTo(r * 0.05, r * 0.04, 0, -r * 0.07);
    ctx.quadraticCurveTo(-r * 0.05, r * 0.04, -r * 0.16, -r * 0.03);
    ctx.quadraticCurveTo(-r * 0.28, -r * 0.1, -r * 0.44, -r * 0.05);
    ctx.quadraticCurveTo(-r * 0.5, r * 0.12, -faceRx * 1.05, r * 0.22);
    ctx.closePath();
  };

  // 1. Soft plush shadow cast by the felt bangs onto the creamy white face!
  ctx.save();
  ctx.translate(0, Math.max(1.2, r * 0.042));
  traceBangsPath();
  ctx.fillStyle = 'rgba(84, 46, 38, 0.16)';
  ctx.fill();
  ctx.restore();

  // 2. Matte plush felt hair fill
  const hairGrad = ctx.createLinearGradient(0, topY, 0, r * 0.18);
  hairGrad.addColorStop(0, def.hairHighlight);
  hairGrad.addColorStop(0.55, def.hair);
  hairGrad.addColorStop(1, def.hairShadow);

  traceBangsPath();
  ctx.fillStyle = hairGrad;
  ctx.fill();

  // Soft warm stitched hair outline
  ctx.strokeStyle = def.hairShadow;
  ctx.lineWidth = Math.max(0.85, Math.min(1.8, r * 0.028));
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Subtle matte felt hair parting lines on larger orbs
  if (r >= 38 && tier >= 1) {
    ctx.strokeStyle = 'rgba(255, 252, 245, 0.25)';
    ctx.lineWidth = Math.max(0.9, r * 0.02);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, -r * 0.26, r * 0.34, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
}

/**
 * Draws each tier's top fruit stem/leaf/calyx cleanly harmonized with miniature Touhou headgear/charm
 * so every single orb reads as BOTH its fruit AND its Touhou character in 0.1s!
 */
function drawTopFruitAndHeadgear(
  ctx: CanvasRenderingContext2D,
  r: number,
  tier: number,
  iconMode: boolean
): void {
  const ext = iconMode ? 0.9 : 1.0;

  switch (tier) {
    case 0: {
      // 白玉果 · 毛玉: cute tiny green stem & baby sprout leaf
      drawPlushStemAndLeaf(ctx, 0, -r * 0.9, r * 0.85 * ext, '#5a8f40', '#87d459', '#325921');
      break;
    }

    case 1: {
      // 蓝莓 · 琪露诺: blueberry star calyx crown + Cirno's blue ribbon bow!
      ctx.save();
      ctx.translate(0, -r * 0.94);
      ctx.fillStyle = '#2e5da8';
      ctx.strokeStyle = '#1b386e';
      ctx.lineWidth = Math.max(0.85, r * 0.04);
      ctx.beginPath();
      ctx.moveTo(-r * 0.32, r * 0.08);
      ctx.lineTo(-r * 0.22, -r * 0.15);
      ctx.lineTo(-r * 0.07, -r * 0.02);
      ctx.lineTo(0, -r * 0.19);
      ctx.lineTo(r * 0.07, -r * 0.02);
      ctx.lineTo(r * 0.22, -r * 0.15);
      ctx.lineTo(r * 0.32, r * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      drawPlushBow(ctx, 0, -r * 0.86, r * 0.42 * ext, '#2e74e6', '#d9f4ff', '#163b7a');
      break;
    }

    case 2: {
      // 紫葡萄 · 露米娅: curly grape vine stem + crimson ribbon bow!
      ctx.save();
      ctx.strokeStyle = '#4e3524';
      ctx.lineWidth = Math.max(1.5, r * 0.07);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.9);
      ctx.quadraticCurveTo(r * 0.04, -r * 1.18 * ext, r * 0.2 * ext, -r * 1.24 * ext);
      ctx.stroke();

      // Curly green grape tendril spiral
      ctx.strokeStyle = '#6ec255';
      ctx.lineWidth = Math.max(1.1, r * 0.042);
      ctx.beginPath();
      ctx.moveTo(-r * 0.04, -r * 1.04);
      ctx.bezierCurveTo(-r * 0.34, -r * 1.26, -r * 0.44, -r * 0.98, -r * 0.26, -r * 0.96);
      ctx.stroke();
      ctx.restore();

      drawPlushBow(ctx, r * 0.16, -r * 0.92, r * 0.38 * ext, '#e63950', '#ffe0e6', '#6b1222');
      break;
    }

    case 3: {
      // 草莓 · 芙兰朵露: lush 5-leaf green strawberry calyx cap + tiny red ribbon mob-cap accent!
      ctx.save();
      ctx.translate(0, -r * 0.88);
      const leafAngles = [-0.85, -0.42, 0, 0.42, 0.85];
      for (const a of leafAngles) {
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(-r * 0.12, 0);
        ctx.quadraticCurveTo(0, r * 0.26, r * 0.12, 0);
        ctx.quadraticCurveTo(0, -r * 0.16, -r * 0.12, 0);
        ctx.closePath();
        ctx.fillStyle = '#5ec454';
        ctx.fill();
        ctx.strokeStyle = '#296626';
        ctx.lineWidth = Math.max(0.8, r * 0.028);
        ctx.stroke();
        ctx.restore();
      }
      // Short strawberry stem
      ctx.strokeStyle = '#3f8a36';
      ctx.lineWidth = Math.max(1.6, r * 0.068);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.02);
      ctx.lineTo(r * 0.06, -r * 0.24 * ext);
      ctx.stroke();
      ctx.restore();

      // Tiny crimson ribbon bow on Flandre's strawberry cap
      drawPlushBow(ctx, -r * 0.24, -r * 0.84, r * 0.28 * ext, '#eb364d', '#fff0a6', '#691220');
      break;
    }

    case 4: {
      // 橘子 · 橙: green tangerine leaf + Chen's crimson mob-cap with perky cat ears!
      drawPlushStemAndLeaf(ctx, r * 0.24, -r * 0.9, r * 0.85 * ext, '#4c7d36', '#72c94d', '#2b4f1d');

      ctx.save();
      ctx.translate(-r * 0.04, -r * 0.92);
      // Red plush cap dome
      ctx.beginPath();
      ctx.ellipse(0, r * 0.04, r * 0.52 * ext, r * 0.24 * ext, -0.05, Math.PI, TAU);
      ctx.closePath();
      ctx.fillStyle = '#db3242';
      ctx.fill();
      ctx.strokeStyle = '#63131d';
      ctx.lineWidth = Math.max(1.0, r * 0.03);
      ctx.stroke();

      // White frill trim
      ctx.strokeStyle = '#fff8f0';
      ctx.lineWidth = Math.max(1.4, r * 0.045);
      ctx.beginPath();
      ctx.moveTo(-r * 0.5 * ext, r * 0.04);
      ctx.quadraticCurveTo(0, r * 0.14, r * 0.5 * ext, r * 0.04);
      ctx.stroke();

      // Perky plush cat ears poking out of the cap!
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(side * r * 0.34 * ext, -r * 0.06);
        ctx.rotate(side * 0.28);
        ctx.beginPath();
        ctx.moveTo(-r * 0.14, r * 0.1);
        ctx.lineTo(0, -r * 0.24 * ext);
        ctx.lineTo(r * 0.14, r * 0.1);
        ctx.closePath();
        ctx.fillStyle = '#e87a24';
        ctx.fill();
        ctx.strokeStyle = '#632909';
        ctx.lineWidth = Math.max(0.95, r * 0.028);
        ctx.stroke();

        // Inner pink cat ear
        ctx.beginPath();
        ctx.moveTo(-r * 0.07, r * 0.06);
        ctx.lineTo(0, -r * 0.12 * ext);
        ctx.lineTo(r * 0.07, r * 0.06);
        ctx.closePath();
        ctx.fillStyle = '#ffb5c4';
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      break;
    }

    case 5: {
      // 青苹果 · 魂魄妖梦: crisp brown apple stem + fresh leaf + Youmu's iconic black plush ribbon bow!
      drawPlushStemAndLeaf(ctx, 0, -r * 0.9, r * 0.92 * ext, '#5c3824', '#86d658', '#305e1e');
      drawPlushBow(ctx, -r * 0.22, -r * 0.86, r * 0.38 * ext, '#2c2938', '#e6f7f0', '#13111a');
      break;
    }

    case 6: {
      // 雪梨 · 十六夜咲夜: curved pear stem + scalloped white lace maid frill + mini gold pocket watch charm!
      drawPlushStemAndLeaf(ctx, 0, -r * 0.94, r * 0.82 * ext, '#6b492a', '#8fd15e', '#385c21');

      // Crisp scalloped white maid headband frill across crown
      ctx.save();
      ctx.translate(0, -r * 0.84);
      ctx.fillStyle = '#fffdf8';
      ctx.strokeStyle = '#6b7fa8';
      ctx.lineWidth = Math.max(0.95, r * 0.022);
      const frills = 7;
      for (let i = 0; i < frills; i++) {
        const t = (i / (frills - 1)) * 2 - 1;
        ctx.beginPath();
        ctx.arc(t * r * 0.44, -Math.cos(t * 1.1) * r * 0.08, r * 0.11, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      // Subtle sapphire maid ribbon band
      ctx.strokeStyle = '#4e73c4';
      ctx.lineWidth = Math.max(1.3, r * 0.036);
      ctx.beginPath();
      ctx.moveTo(-r * 0.46, r * 0.03);
      ctx.quadraticCurveTo(0, -r * 0.08, r * 0.46, r * 0.03);
      ctx.stroke();
      ctx.restore();

      // Miniature golden pocket-watch charm pinned near lower-right peel rim!
      ctx.save();
      ctx.translate(r * 0.72, r * 0.46);
      ctx.fillStyle = '#f2c95c';
      ctx.strokeStyle = '#6e4c0e';
      ctx.lineWidth = Math.max(0.9, r * 0.02);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.15, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fffdf5';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.105, 0, TAU);
      ctx.fill();
      // Tiny clock hands
      ctx.strokeStyle = '#334678';
      ctx.lineWidth = Math.max(0.8, r * 0.018);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -r * 0.075);
      ctx.moveTo(0, 0);
      ctx.lineTo(r * 0.055, r * 0.03);
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 7: {
      // 水蜜桃 · 蕾米莉亚: lush peach leaf + frilly ZUN mob-cap with crimson ribbons!
      drawPlushStemAndLeaf(ctx, r * 0.36, -r * 0.86, r * 0.82 * ext, '#5e3c26', '#72c962', '#2d5e29');

      ctx.save();
      ctx.translate(-r * 0.04, -r * 0.92);
      // Puff scalloped ZUN mob-cap
      ctx.fillStyle = '#fff5f7';
      ctx.strokeStyle = '#b34d68';
      ctx.lineWidth = Math.max(1.0, r * 0.022);
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.02, r * 0.56 * ext, r * 0.25 * ext, -0.04, 0, TAU);
      ctx.fill();
      ctx.stroke();

      // Crimson ribbon band & twin little side bows
      ctx.strokeStyle = '#d92647';
      ctx.lineWidth = Math.max(1.8, r * 0.042);
      ctx.beginPath();
      ctx.moveTo(-r * 0.52 * ext, r * 0.06);
      ctx.quadraticCurveTo(0, r * 0.16, r * 0.52 * ext, r * 0.06);
      ctx.stroke();
      drawPlushBow(ctx, -r * 0.38 * ext, r * 0.05, r * 0.22 * ext, '#e02b4d', '#ffe3ec', '#6b1224');
      ctx.restore();
      break;
    }

    case 8: {
      // 菠萝 · 雾雨魔理沙: jaunty tilted black felt witch hat with white band & golden star atop pineapple crown!
      ctx.save();
      ctx.translate(r * 0.04, -r * 0.92);
      ctx.rotate(-0.14);

      // Wide felt brim
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.68 * ext, r * 0.17 * ext, 0, 0, TAU);
      ctx.fillStyle = '#2a243d';
      ctx.fill();
      ctx.strokeStyle = '#f2c955';
      ctx.lineWidth = Math.max(1.0, r * 0.02);
      ctx.stroke();

      // Soft curved witch cone
      ctx.beginPath();
      ctx.moveTo(-r * 0.36 * ext, -r * 0.02);
      ctx.quadraticCurveTo(-r * 0.1 * ext, -r * 0.64 * ext, r * 0.42 * ext, -r * 0.42 * ext);
      ctx.quadraticCurveTo(r * 0.22 * ext, -r * 0.2 * ext, r * 0.36 * ext, -r * 0.02);
      ctx.closePath();
      ctx.fillStyle = '#382f52';
      ctx.fill();
      ctx.stroke();

      // White plush ribbon band
      ctx.strokeStyle = '#fff9f0';
      ctx.lineWidth = Math.max(2.2, r * 0.062);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-r * 0.32 * ext, -r * 0.02);
      ctx.quadraticCurveTo(0, r * 0.06, r * 0.32 * ext, -r * 0.02);
      ctx.stroke();

      // Golden star badge on hat
      ctx.fillStyle = '#ffe266';
      ctx.strokeStyle = '#734d0e';
      ctx.lineWidth = Math.max(0.7, r * 0.015);
      drawStarPath(ctx, -r * 0.12 * ext, -r * 0.24 * ext, 5, r * 0.12 * ext, r * 0.055 * ext);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 9: {
      // 红富士大苹果 · 博丽灵梦: authentic 苹果乐 brown felt stem + pastel green leaf + white bow knot!
      drawPlushStemAndLeaf(ctx, 0, -r * 0.9, r * 0.98 * ext, '#543020', '#96d964', '#335e1e');

      // Cozy center shrine bow knot right at base of stem
      ctx.fillStyle = '#fff7ed';
      ctx.strokeStyle = '#c42136';
      ctx.lineWidth = Math.max(1.2, r * 0.022);
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.82, r * 0.145, r * 0.105, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 10: {
      // 大西瓜 · 伊吹萃香: curly dark-green watermelon stem + crimson & purple horn ribbons!
      ctx.save();
      ctx.strokeStyle = '#21592f';
      ctx.lineWidth = Math.max(2.0, r * 0.045);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.94);
      ctx.quadraticCurveTo(-r * 0.04, -r * 1.14 * ext, r * 0.14 * ext, -r * 1.16 * ext);
      ctx.stroke();
      ctx.restore();

      // Crimson bow on left horn base, violet bow on right horn base!
      drawPlushBow(ctx, -r * 0.38 * ext, -r * 0.84 * ext, r * 0.24 * ext, '#e3344b', '#ffe694', '#5c121e');
      drawPlushBow(ctx, r * 0.38 * ext, -r * 0.84 * ext, r * 0.24 * ext, '#8c4de6', '#ffe694', '#351666');
      break;
    }
  }
}

/**
 * Draws a cute plush felt fruit stem + soft oval felt leaf (homage to 苹果乐's top felt stem & leaf!).
 */
function drawPlushStemAndLeaf(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scaleR: number,
  stemColor: string,
  leafColor: string,
  leafOutline: string
): void {
  ctx.save();
  ctx.translate(x, y);

  // Soft pastel-green felt leaf
  ctx.save();
  ctx.translate(-scaleR * 0.05, -scaleR * 0.08);
  ctx.rotate(-0.55);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-scaleR * 0.18, -scaleR * 0.2, -scaleR * 0.36, -scaleR * 0.06);
  ctx.quadraticCurveTo(-scaleR * 0.2, scaleR * 0.14, 0, 0);
  ctx.closePath();
  ctx.fillStyle = leafColor;
  ctx.fill();
  ctx.strokeStyle = leafOutline;
  ctx.lineWidth = Math.max(0.85, scaleR * 0.025);
  ctx.stroke();
  ctx.restore();

  // Chunky soft felt brown/green stem (just like 苹果乐!)
  ctx.beginPath();
  ctx.moveTo(-scaleR * 0.055, scaleR * 0.05);
  ctx.quadraticCurveTo(-scaleR * 0.04, -scaleR * 0.16, scaleR * 0.05, -scaleR * 0.28);
  ctx.lineTo(scaleR * 0.145, -scaleR * 0.23);
  ctx.quadraticCurveTo(scaleR * 0.06, -scaleR * 0.1, scaleR * 0.055, scaleR * 0.05);
  ctx.closePath();
  ctx.fillStyle = stemColor;
  ctx.fill();
  ctx.strokeStyle = '#331c12';
  ctx.lineWidth = Math.max(0.8, scaleR * 0.022);
  ctx.stroke();

  ctx.restore();
}

function drawPlushBow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  fill: string,
  trim: string,
  stroke: string
): void {
  ctx.save();
  ctx.translate(x, y);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(side * size * 0.65, -size * 0.56, side * size, -size * 0.14);
    ctx.quadraticCurveTo(side * size * 0.92, size * 0.42, 0, size * 0.14);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(0.85, size * 0.09);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, size * 0.04, size * 0.22, 0, TAU);
  ctx.fillStyle = trim;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(0.8, size * 0.08);
  ctx.stroke();
  ctx.restore();
}

function drawMiniGapEye(
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
  ctx.fillStyle = '#1a072e';
  ctx.fill();
  ctx.strokeStyle = '#e6395c';
  ctx.lineWidth = Math.max(0.9, halfW * 0.1);
  ctx.stroke();

  ctx.fillStyle = '#fff4cc';
  ctx.beginPath();
  ctx.ellipse(0, 0, halfW * 0.34, halfH * 0.46, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#d9264a';
  ctx.beginPath();
  ctx.ellipse(0, 0, halfW * 0.16, halfH * 0.35, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function traceWatermelonStripe(ctx: CanvasRenderingContext2D, x0: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x0, -r * 1.06);
  ctx.bezierCurveTo(
    x0 - r * 0.16,
    -r * 0.46,
    x0 + r * 0.16,
    -r * 0.1,
    x0 - r * 0.06,
    r * 0.32
  );
  ctx.bezierCurveTo(
    x0 - r * 0.16,
    r * 0.64,
    x0 + r * 0.14,
    r * 0.86,
    x0,
    r * 1.08
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const n = parseInt(clean, 16);
  const red = (n >> 16) & 255;
  const green = (n >> 8) & 255;
  const blue = n & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
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
