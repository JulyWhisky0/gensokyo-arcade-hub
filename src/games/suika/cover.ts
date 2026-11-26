// Bespoke "苹果乐 × 东方 Fumo" matte plushie fruit cover illustration (320x200)
// All SVG IDs are strictly sk-prefixed to avoid DOM collisions across game cards.
export const SUIKA_COVER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200">
  <defs>
    <linearGradient id="sk-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#19102e"/>
      <stop offset="54%" stop-color="#2b1b4a"/>
      <stop offset="100%" stop-color="#1c2433"/>
    </linearGradient>
    <radialGradient id="sk-glow" cx="50%" cy="62%" r="54%">
      <stop offset="0%" stop-color="#ff9978" stop-opacity="0.22"/>
      <stop offset="48%" stop-color="#58e08e" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#19102e" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="sk-lacquer" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#d6283e"/>
      <stop offset="50%" stop-color="#9e162b"/>
      <stop offset="100%" stop-color="#c42038"/>
    </linearGradient>
    <linearGradient id="sk-gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fff0b3"/>
      <stop offset="50%" stop-color="#e8b343"/>
      <stop offset="100%" stop-color="#b57b1b"/>
    </linearGradient>
    <!-- Soft matte velvety minky fruit gradients (NO harsh plastic sheen!) -->
    <radialGradient id="sk-apple" cx="38%" cy="32%" r="72%">
      <stop offset="0%" stop-color="#ff6d61"/>
      <stop offset="58%" stop-color="#e33b3b"/>
      <stop offset="100%" stop-color="#ab1f25"/>
    </radialGradient>
    <radialGradient id="sk-watermelon" cx="38%" cy="32%" r="72%">
      <stop offset="0%" stop-color="#68cf83"/>
      <stop offset="58%" stop-color="#33a157"/>
      <stop offset="100%" stop-color="#1c6b37"/>
    </radialGradient>
    <radialGradient id="sk-blueberry" cx="38%" cy="32%" r="72%">
      <stop offset="0%" stop-color="#87cbff"/>
      <stop offset="58%" stop-color="#509be6"/>
      <stop offset="100%" stop-color="#3165b3"/>
    </radialGradient>
    <radialGradient id="sk-face-cream" cx="50%" cy="38%" r="68%">
      <stop offset="0%" stop-color="#fff9f2"/>
      <stop offset="78%" stop-color="#faefe3"/>
      <stop offset="100%" stop-color="#ebd7c7"/>
    </radialGradient>
    <radialGradient id="sk-nub" cx="38%" cy="34%" r="68%">
      <stop offset="0%" stop-color="#fffdf9"/>
      <stop offset="72%" stop-color="#f5e9dd"/>
      <stop offset="100%" stop-color="#decbc0"/>
    </radialGradient>
    <linearGradient id="sk-horn" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="#c26321"/>
      <stop offset="55%" stop-color="#f2ad42"/>
      <stop offset="100%" stop-color="#ffea99"/>
    </linearGradient>
    <clipPath id="sk-reimu-face-clip">
      <ellipse cx="0" cy="3.5" rx="22.5" ry="19"/>
    </clipPath>
    <clipPath id="sk-suika-clip">
      <circle cx="0" cy="0" r="44"/>
    </clipPath>
    <clipPath id="sk-suika-face-clip">
      <ellipse cx="0" cy="4" rx="27" ry="23"/>
    </clipPath>
    <clipPath id="sk-cirno-face-clip">
      <ellipse cx="0" cy="2" rx="13.5" ry="11.5"/>
    </clipPath>
  </defs>

  <!-- Cozy twilight shrine backdrop -->
  <rect width="320" height="200" fill="url(#sk-bg)"/>
  <rect width="320" height="200" fill="url(#sk-glow)"/>

  <!-- Soft Hakurei magic watermark -->
  <g transform="translate(160, 118)" fill="none" stroke="#f5c65b" opacity="0.12">
    <circle r="60" stroke-width="1.2"/>
    <circle r="50" stroke-width="1" stroke-dasharray="4 5"/>
    <circle r="30" stroke-width="1.2"/>
  </g>

  <!-- Gentle stars & sakura petals -->
  <g fill="#ffe694" opacity="0.85">
    <circle cx="34" cy="30" r="1.4"/>
    <circle cx="286" cy="42" r="1.4"/>
    <path d="M276 20 l1.8 4.4 l4.4 1.8 l-4.4 1.8 l-1.8 4.4 l-1.8-4.4 l-4.4-1.8 l4.4-1.8z"/>
    <path d="M40 50 l1.5 3.6 l3.6 1.5 l-3.6 1.5 l-1.5 3.6 l-1.5-3.6 l-3.6-1.5 l3.6-1.5z"/>
  </g>
  <g fill="#ffb8d0" opacity="0.62">
    <path d="M56 124 c-3.5-2.6 -3.5-6 -0.8-7 l0.8 1.8 l0.8-1.8 c2.7 1 2.7 4.4 -0.8 7z" transform="rotate(-24 56 120)"/>
    <path d="M272 86 c-3.5-2.6 -3.5-6 -0.8-7 l0.8 1.8 l0.8-1.8 c2.7 1 2.7 4.4 -0.8 7z" transform="rotate(30 272 82)"/>
  </g>

  <!-- Warm Crimson-Gold Lacquer Shrine Jar -->
  <rect x="56" y="42" width="208" height="146" rx="15" fill="#140d29" fill-opacity="0.68"/>
  <path d="M56 42 L56 173 Q56 188 71 188 L249 188 Q264 188 264 173 L264 42" fill="none" stroke="url(#sk-lacquer)" stroke-width="6.5" stroke-linecap="round"/>
  <path d="M56 42 L56 173 Q56 188 71 188 L249 188 Q264 188 264 173 L264 42" fill="none" stroke="url(#sk-gold)" stroke-width="1.7" stroke-linecap="round"/>
  <rect x="49" y="38" width="14" height="5.5" rx="2" fill="url(#sk-gold)" stroke="#5c101d" stroke-width="0.9"/>
  <rect x="257" y="38" width="14" height="5.5" rx="2" fill="url(#sk-gold)" stroke="#5c101d" stroke-width="0.9"/>
  <line x1="64" y1="62" x2="256" y2="62" stroke="#f5ca64" stroke-width="1.2" stroke-dasharray="5 5" opacity="0.48"/>

  <!-- Golden Drop Guide & Tiny Dropping 白玉果 · 毛玉 Plushie -->
  <line x1="160" y1="28" x2="160" y2="76" stroke="#ffe169" stroke-width="1.5" stroke-dasharray="3 4" opacity="0.68"/>
  <g transform="translate(160, 22)">
    <!-- 4 tiny white plush nubs -->
    <ellipse cx="-10.5" cy="2" rx="2.5" ry="1.8" transform="rotate(-18 -10.5 2)" fill="url(#sk-nub)" stroke="#8f7d6e" stroke-width="0.8"/>
    <ellipse cx="10.5" cy="2" rx="2.5" ry="1.8" transform="rotate(18 10.5 2)" fill="url(#sk-nub)" stroke="#8f7d6e" stroke-width="0.8"/>
    <ellipse cx="-4.8" cy="10.2" rx="2.3" ry="1.7" fill="url(#sk-nub)" stroke="#8f7d6e" stroke-width="0.8"/>
    <ellipse cx="4.8" cy="10.2" rx="2.3" ry="1.7" fill="url(#sk-nub)" stroke="#8f7d6e" stroke-width="0.8"/>
    <circle r="11" fill="#faf4eb" stroke="#8f7d6e" stroke-width="1.1"/>
    <!-- Tiny green stem + sprout leaf -->
    <path d="M-1 -10.5 Q-4 -14 -7 -12 Q-4 -9 -1 -10.5 Z" fill="#87d459" stroke="#325921" stroke-width="0.7"/>
    <path d="M-0.5 -10 Q0 -13.5 1.8 -14.8" fill="none" stroke="#5a8f40" stroke-width="1.5" stroke-linecap="round"/>
    <!-- ·ω· face -->
    <circle cx="-3.3" cy="1" r="1.35" fill="#36211e"/>
    <circle cx="3.3" cy="1" r="1.35" fill="#36211e"/>
    <ellipse cx="-5.8" cy="3.2" rx="2" ry="1.1" fill="#ff9eb5" opacity="0.62"/>
    <ellipse cx="5.8" cy="3.2" rx="2" ry="1.1" fill="#ff9eb5" opacity="0.62"/>
    <path d="M-2.2 3.2 Q-1.1 4.8 0 3.2 Q1.1 4.8 2.2 3.2" fill="none" stroke="#36211e" stroke-width="1.1" stroke-linecap="round"/>
  </g>

  <!-- Hero 3 (Upper-Left): 蓝莓 · 琪露诺 Fumo Plushie -->
  <g transform="translate(105, 86) rotate(-8)">
    <!-- Mini soft ice wings -->
    <g fill="#9fe3ff" stroke="#2d68b5" stroke-width="0.85">
      <polygon points="-16,-4 -28,-11 -22,-1"/>
      <polygon points="-17,1 -30,1 -22,5"/>
      <polygon points="-16,6 -27,11 -21,2"/>
      <polygon points="16,-4 28,-11 22,-1"/>
      <polygon points="17,1 30,1 22,5"/>
      <polygon points="16,6 27,11 21,2"/>
    </g>
    <!-- 4 stubby white plush nubs -->
    <ellipse cx="-19" cy="3.5" rx="3.8" ry="2.6" transform="rotate(-18 -19 3.5)" fill="url(#sk-nub)" stroke="#24477d" stroke-width="0.9"/>
    <ellipse cx="19" cy="3.5" rx="3.8" ry="2.6" transform="rotate(18 19 3.5)" fill="url(#sk-nub)" stroke="#24477d" stroke-width="0.9"/>
    <ellipse cx="-8.5" cy="18.5" rx="3.6" ry="2.6" transform="rotate(12 -8.5 18.5)" fill="url(#sk-nub)" stroke="#24477d" stroke-width="0.9"/>
    <ellipse cx="8.5" cy="18.5" rx="3.6" ry="2.6" transform="rotate(-12 8.5 18.5)" fill="url(#sk-nub)" stroke="#24477d" stroke-width="0.9"/>
    <!-- Matte blueberry body -->
    <circle r="20" fill="url(#sk-blueberry)" stroke="#24477d" stroke-width="1.3"/>
    <!-- Recessed creamy face cutout -->
    <ellipse cx="0" cy="2" rx="13.5" ry="11.5" fill="url(#sk-face-cream)" stroke="#24477d" stroke-opacity="0.35" stroke-width="0.8"/>
    <g clip-path="url(#sk-cirno-face-clip)">
      <!-- Embroidered smug ᗜˬᗜ face -->
      <ellipse cx="-4.8" cy="3.2" rx="2.3" ry="2.7" fill="#3a8ae0" stroke="#36211e" stroke-width="1.15"/>
      <ellipse cx="4.8" cy="3.2" rx="2.3" ry="2.7" fill="#3a8ae0" stroke="#36211e" stroke-width="1.15"/>
      <circle cx="-5.4" cy="2.3" r="0.85" fill="#ffffff"/>
      <circle cx="4.2" cy="2.3" r="0.85" fill="#ffffff"/>
      <ellipse cx="-7.2" cy="6.2" rx="2.3" ry="1.3" fill="#ff9cb5" opacity="0.62"/>
      <ellipse cx="7.2" cy="6.2" rx="2.3" ry="1.3" fill="#ff9cb5" opacity="0.62"/>
      <path d="M-2.2 7.2 Q0.5 8.5 2.8 6.2" fill="none" stroke="#36211e" stroke-width="1.1" stroke-linecap="round"/>
      <!-- Spiky sky-blue felt bangs -->
      <path d="M-15 -11 L15 -11 L14 2 L8 -2 L4 0 L0 -3 L-4 0 L-8 -2 L-14 2 Z" fill="#69c2ff" stroke="#3585d6" stroke-width="0.85"/>
    </g>
    <!-- Blueberry star calyx + blue ribbon bow -->
    <polygon points="-6,-18 -4,-23 -1.5,-19 0,-24 1.5,-19 4,-23 6,-18" fill="#2e5da8" stroke="#1b386e" stroke-width="0.7"/>
    <path d="M0 -18 L-9 -23 L-7 -15 Z M0 -18 L9 -23 L7 -15 Z" fill="#2e74e6" stroke="#163b7a" stroke-width="0.8"/>
    <circle cx="0" cy="-18" r="2.1" fill="#d9f4ff" stroke="#163b7a" stroke-width="0.7"/>
  </g>

  <!-- Hero 1 (Bottom-Left Flagship!): 苹果乐风格 红富士大苹果 · 博丽灵梦 Plushie -->
  <g transform="translate(115, 144) rotate(-5)">
    <!-- Giant sweeping crimson-white Reimu shrine ribbon bow -->
    <path d="M0 -30 Q-22 -49 -40 -31 Q-37 -20 -30 -15 Q-15 -23 0 -25 Z" fill="#cf2538" stroke="#fff5ea" stroke-width="1.3"/>
    <path d="M0 -30 Q22 -49 40 -31 Q37 -20 30 -15 Q15 -23 0 -25 Z" fill="#cf2538" stroke="#fff5ea" stroke-width="1.3"/>
    <!-- 4 adorable stubby white plush nub hands & feet (苹果乐 signature!) -->
    <ellipse cx="-34" cy="6" rx="6.8" ry="4.8" transform="rotate(-18 -34 6)" fill="url(#sk-nub)" stroke="#63141a" stroke-width="1.2"/>
    <ellipse cx="34" cy="6" rx="6.8" ry="4.8" transform="rotate(18 34 6)" fill="url(#sk-nub)" stroke="#63141a" stroke-width="1.2"/>
    <ellipse cx="-16" cy="33" rx="6.6" ry="4.8" transform="rotate(12 -16 33)" fill="url(#sk-nub)" stroke="#63141a" stroke-width="1.2"/>
    <ellipse cx="16" cy="33" rx="6.6" ry="4.8" transform="rotate(-12 16 33)" fill="url(#sk-nub)" stroke="#63141a" stroke-width="1.2"/>
    <!-- Soft matte velvety crimson Fuji apple plush body -->
    <circle r="36" fill="url(#sk-apple)" stroke="#63141a" stroke-width="1.5"/>
    <!-- Cozy apple cleft shadow -->
    <ellipse cx="0" cy="-31" rx="11" ry="4" fill="#731016" opacity="0.34"/>
    <!-- Recessed creamy-white plush face cutout -->
    <ellipse cx="0" cy="3.5" rx="22.5" ry="19" fill="url(#sk-face-cream)" stroke="#63141a" stroke-opacity="0.3" stroke-width="1.1"/>
    <g clip-path="url(#sk-reimu-face-clip)">
      <!-- Soft inner cutout rim shadow -->
      <ellipse cx="0" cy="4.5" rx="22.5" ry="19" fill="none" stroke="#542822" stroke-opacity="0.16" stroke-width="2.2"/>
      <!-- Authentic embroidered Fumo deadpan ᗜ_ᗜ face! -->
      <ellipse cx="-12.5" cy="9.5" rx="4.2" ry="2.5" fill="#ff94a8" opacity="0.58"/>
      <ellipse cx="12.5" cy="9.5" rx="4.2" ry="2.5" fill="#ff94a8" opacity="0.58"/>
      <ellipse cx="-8.8" cy="4.8" rx="4.2" ry="5" fill="#a8263b" stroke="#36211e" stroke-width="1.7"/>
      <ellipse cx="8.8" cy="4.8" rx="4.2" ry="5" fill="#a8263b" stroke="#36211e" stroke-width="1.7"/>
      <ellipse cx="-10" cy="3.4" rx="1.5" ry="1.3" fill="#ffffff"/>
      <ellipse cx="7.6" cy="3.4" rx="1.5" ry="1.3" fill="#ffffff"/>
      <!-- Classic flat upper Fumo lashes -->
      <path d="M-13.2 1.2 Q-8.8 -0.6 -4.4 1.2 M4.4 1.2 Q8.8 -0.6 13.2 1.2" fill="none" stroke="#36211e" stroke-width="2.2" stroke-linecap="round"/>
      <!-- Minimalist deadpan Fumo mouth -->
      <path d="M-4.2 12.6 Q0 13.4 4.2 12.6" fill="none" stroke="#36211e" stroke-width="1.6" stroke-linecap="round"/>
      <!-- Cast plush shadow under layered chestnut bangs -->
      <path d="M-24 -16 L24 -16 L24 12 Q18 8 16.5 0 Q12 -3 6.5 -1 Q3 2.5 0 -1 Q-3 2.5 -6.5 -1 Q-12 -3 -16.5 0 Q-18 8 -24 12 Z" transform="translate(0, 1.8)" fill="#542e26" opacity="0.18"/>
      <!-- Layered chestnut felt bangs -->
      <path d="M-24 -16 L24 -16 L24 12 Q18 8 16.5 0 Q12 -3 6.5 -1 Q3 2.5 0 -1 Q-3 2.5 -6.5 -1 Q-12 -3 -16.5 0 Q-18 8 -24 12 Z" fill="#45262b" stroke="#261216" stroke-width="1"/>
    </g>
    <!-- Twin white hair tubes -->
    <rect x="-22" y="-1" width="4.4" height="10" rx="1.5" fill="#fffdf8" stroke="#c4273b" stroke-width="0.9"/>
    <rect x="17.6" y="-1" width="4.4" height="10" rx="1.5" fill="#fffdf8" stroke="#c4273b" stroke-width="0.9"/>
    <!-- 苹果乐 Felt Green Leaf + Chunky Brown Apple Stem + Center Bow Knot! -->
    <path d="M-2 -34 Q-11 -42 -16 -36 Q-9 -29 -2 -34 Z" fill="#96d964" stroke="#335e1e" stroke-width="0.9"/>
    <path d="M-2 -31 Q-1.5 -39 2 -43 L5.5 -41 Q2.5 -36 2 -31 Z" fill="#543020" stroke="#331c12" stroke-width="0.9"/>
    <ellipse cx="0" cy="-29.5" rx="5.2" ry="3.8" fill="#fff7ed" stroke="#c42136" stroke-width="1"/>
  </g>

  <!-- Hero 2 (Bottom-Right Centerpiece!): 大西瓜 · 伊吹萃香 Fumo Plushie -->
  <g transform="translate(206, 138) rotate(4)">
    <!-- Curved golden-amber plush Oni Horns -->
    <path d="M-11 -36 Q-26 -42 -27 -60 Q-19 -50 -20 -31 Z" fill="url(#sk-horn)" stroke="#59280e" stroke-width="1.3"/>
    <path d="M11 -36 Q26 -42 27 -60 Q19 -50 20 -31 Z" fill="url(#sk-horn)" stroke="#59280e" stroke-width="1.3"/>
    <!-- 4 stubby white plush nub hands & feet -->
    <ellipse cx="-41" cy="7" rx="8.2" ry="5.8" transform="rotate(-18 -41 7)" fill="url(#sk-nub)" stroke="#154526" stroke-width="1.3"/>
    <ellipse cx="41" cy="7" rx="8.2" ry="5.8" transform="rotate(18 41 7)" fill="url(#sk-nub)" stroke="#154526" stroke-width="1.3"/>
    <ellipse cx="-19" cy="40" rx="8" ry="5.8" transform="rotate(12 -19 40)" fill="url(#sk-nub)" stroke="#154526" stroke-width="1.3"/>
    <ellipse cx="19" cy="40" rx="8" ry="5.8" transform="rotate(-12 19 40)" fill="url(#sk-nub)" stroke="#154526" stroke-width="1.3"/>
    <!-- Matte velvety dark-jade watermelon plush body -->
    <circle r="44" fill="url(#sk-watermelon)" stroke="#154526" stroke-width="1.7"/>
    <g clip-path="url(#sk-suika-clip)">
      <!-- Soft wavy matte watermelon stripes -->
      <g fill="none" stroke="#0e4824" stroke-width="7.2" stroke-linecap="round" opacity="0.6">
        <path d="M-32 -46 Q-40 -22 -30 0 Q-38 24 -30 46"/>
        <path d="M0 -46 Q-6 -22 3 0 Q-5 24 0 46"/>
        <path d="M32 -46 Q40 -22 30 0 Q38 24 30 46"/>
      </g>
    </g>
    <!-- Recessed creamy-white plush face cutout -->
    <ellipse cx="0" cy="4" rx="27" ry="23" fill="url(#sk-face-cream)" stroke="#154526" stroke-opacity="0.3" stroke-width="1.2"/>
    <g clip-path="url(#sk-suika-face-clip)">
      <ellipse cx="0" cy="5.2" rx="27" ry="23" fill="none" stroke="#542822" stroke-opacity="0.16" stroke-width="2.4"/>
      <!-- Tipsy rosy Fumo blush & joyful ᗜ▽ᗜ grin! -->
      <ellipse cx="-15.5" cy="11.5" rx="5.2" ry="3.1" fill="#ff7d93" opacity="0.65"/>
      <ellipse cx="15.5" cy="11.5" rx="5.2" ry="3.1" fill="#ff7d93" opacity="0.65"/>
      <ellipse cx="-10.8" cy="5.8" rx="5.2" ry="6" fill="#c75224" stroke="#36211e" stroke-width="1.9"/>
      <ellipse cx="10.8" cy="5.8" rx="5.2" ry="6" fill="#c75224" stroke="#36211e" stroke-width="1.9"/>
      <ellipse cx="-12.2" cy="4.2" rx="1.9" ry="1.5" fill="#ffffff"/>
      <ellipse cx="9.4" cy="4.2" rx="1.9" ry="1.5" fill="#ffffff"/>
      <path d="M-7 14 L7 14 Q4.5 21 0 21 Q-4.5 21 -7 14 Z" fill="#ff7084" stroke="#36211e" stroke-width="1.8" stroke-linejoin="round"/>
      <!-- Spiky ginger-orange plush bangs + soft shadow -->
      <path d="M-29 -20 L29 -20 L28 7 L21 -1 L18 5 L11 -4 L5 1 L0 -5 L-5 1 L-11 -4 L-18 5 L-21 -1 L-28 7 Z" transform="translate(0, 2)" fill="#542e26" opacity="0.18"/>
      <path d="M-29 -20 L29 -20 L28 7 L21 -1 L18 5 L11 -4 L5 1 L0 -5 L-5 1 L-11 -4 L-18 5 L-21 -1 L-28 7 Z" fill="#ff9a52" stroke="#cc6023" stroke-width="1.1" stroke-linejoin="round"/>
    </g>
    <!-- Suika brow charm chain (red circle, gold triangle, blue square) -->
    <path d="M-15 -11 Q0 -7 15 -11" fill="none" stroke="#ffe27a" stroke-width="1.2"/>
    <circle cx="-8.8" cy="-10" r="2.7" fill="#f24b64" stroke="#521822" stroke-width="0.8"/>
    <polygon points="0,-13 3,-8 -3,-8" fill="#ffe066" stroke="#521822" stroke-width="0.8"/>
    <rect x="6.5" y="-12.5" width="4.8" height="4.8" fill="#57c9ff" stroke="#521822" stroke-width="0.8"/>
    <!-- Horn bows (crimson left, purple right) + curly watermelon stem -->
    <path d="M0 -42 Q-2 -50 6 -51" fill="none" stroke="#21592f" stroke-width="2.1" stroke-linecap="round"/>
    <path d="M-17 -37 L-25 -42 L-23 -33 Z M-17 -37 L-10 -41 L-12 -33 Z" fill="#e3344b" stroke="#5c121e" stroke-width="0.8"/>
    <circle cx="-17" cy="-37" r="2.2" fill="#ffe694" stroke="#5c121e" stroke-width="0.7"/>
    <path d="M17 -37 L10 -41 L12 -33 Z M17 -37 L25 -42 L23 -33 Z" fill="#8c4de6" stroke="#351666" stroke-width="0.8"/>
    <circle cx="17" cy="-37" r="2.2" fill="#ffe694" stroke="#351666" stroke-width="0.7"/>
  </g>
</svg>`;
