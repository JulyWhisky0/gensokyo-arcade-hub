// Bespoke Touhou Gensokyo Suika cover illustration (320x200)
export const SUIKA_COVER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200">
  <defs>
    <linearGradient id="sk-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#191334"/>
      <stop offset="55%" stop-color="#281d4f"/>
      <stop offset="100%" stop-color="#1a2c38"/>
    </linearGradient>
    <radialGradient id="sk-glow" cx="50%" cy="62%" r="48%">
      <stop offset="0%" stop-color="#3be382" stop-opacity="0.32"/>
      <stop offset="60%" stop-color="#f0c259" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#191334" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="sk-suika" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#57ea96"/>
      <stop offset="58%" stop-color="#229e57"/>
      <stop offset="100%" stop-color="#0f5c31"/>
    </radialGradient>
    <radialGradient id="sk-reimu" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#ff6b7d"/>
      <stop offset="62%" stop-color="#d92b40"/>
      <stop offset="100%" stop-color="#871022"/>
    </radialGradient>
    <radialGradient id="sk-marisa" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#4e407d"/>
      <stop offset="65%" stop-color="#221b3d"/>
      <stop offset="100%" stop-color="#110d24"/>
    </radialGradient>
    <radialGradient id="sk-cirno" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#aef1ff"/>
      <stop offset="60%" stop-color="#3bb6f0"/>
      <stop offset="100%" stop-color="#1d6ac2"/>
    </radialGradient>
    <clipPath id="sk-suika-clip">
      <circle cx="164" cy="134" r="46"/>
    </clipPath>
  </defs>

  <!-- Night shrine sky -->
  <rect width="320" height="200" fill="url(#sk-bg)"/>
  <rect width="320" height="200" fill="url(#sk-glow)"/>

  <!-- Subtle starry sky & sakura petals -->
  <g fill="#ffe694" opacity="0.8">
    <circle cx="34" cy="28" r="1.5"/>
    <circle cx="72" cy="18" r="1.2"/>
    <circle cx="255" cy="24" r="1.6"/>
    <circle cx="288" cy="48" r="1.3"/>
    <circle cx="48" cy="72" r="1.1"/>
    <path d="M276 22 l2 5 l5 2 l-5 2 l-2 5 l-2-5 l-5-2 l5-2z"/>
    <path d="M44 46 l1.5 3.5 l3.5 1.5 l-3.5 1.5 l-1.5 3.5 l-1.5-3.5 l-3.5-1.5 l3.5-1.5z"/>
  </g>
  <g fill="#ffacc7" opacity="0.55">
    <ellipse cx="64" cy="48" rx="4" ry="2.1" transform="rotate(-25 64 48)"/>
    <ellipse cx="262" cy="68" rx="4.2" ry="2.2" transform="rotate(30 262 68)"/>
    <ellipse cx="290" cy="126" rx="3.5" ry="1.8" transform="rotate(-40 290 126)"/>
  </g>

  <!-- Shrine glass jar -->
  <rect x="64" y="42" width="192" height="146" rx="16" fill="#120d26" fill-opacity="0.62" stroke="#f0c259" stroke-width="2.5" stroke-opacity="0.72"/>
  <rect x="68" y="46" width="184" height="138" rx="13" fill="none" stroke="#c82333" stroke-width="1.4" stroke-opacity="0.55"/>
  <!-- Danger dashed line -->
  <line x1="72" y1="64" x2="248" y2="64" stroke="#ff5e78" stroke-width="1.3" stroke-dasharray="5 5" opacity="0.55"/>

  <!-- Dotted drop guide & hovering Kedama orb -->
  <line x1="160" y1="26" x2="160" y2="84" stroke="#ffe169" stroke-width="1.5" stroke-dasharray="3 4" opacity="0.7"/>
  <g transform="translate(160, 22)">
    <circle r="11" fill="#fffdf9" stroke="#d5c9f0" stroke-width="1.5"/>
    <circle cx="-8" cy="-4" r="4" fill="#fffdf9"/>
    <circle cx="8" cy="-4" r="4" fill="#fffdf9"/>
    <circle cx="-3.5" cy="0" r="1.4" fill="#3a2f5c"/>
    <circle cx="3.5" cy="0" r="1.4" fill="#3a2f5c"/>
    <ellipse cx="-6" cy="2.5" rx="2" ry="1.1" fill="#ff9eb5" opacity="0.7"/>
    <ellipse cx="6" cy="2.5" rx="2" ry="1.1" fill="#ff9eb5" opacity="0.7"/>
    <path d="M-2 2.5 Q0 4.5 2 2.5" fill="none" stroke="#3a2f5c" stroke-width="1.2" stroke-linecap="round"/>
  </g>

  <!-- Marisa orb (left) -->
  <g transform="translate(106, 148)">
    <circle r="28" fill="url(#sk-marisa)" stroke="#ffd659" stroke-width="1.6"/>
    <!-- Witch hat -->
    <ellipse cx="0" cy="-23" rx="26" ry="6.5" fill="#1e1736" stroke="#ffd659" stroke-width="1.2"/>
    <path d="M-15 -24 Q-3 -48 14 -38 Q8 -30 14 -24 Z" fill="#251d42" stroke="#ffd659" stroke-width="1.1"/>
    <path d="M-12 -24 Q0 -21 12 -24" fill="none" stroke="#ffffff" stroke-width="3"/>
    <!-- Eyes & grin -->
    <circle cx="-8" cy="-2" r="3" fill="#ffe169"/>
    <circle cx="8" cy="-2" r="3" fill="#ffe169"/>
    <circle cx="-9" cy="-3" r="1" fill="#ffffff"/>
    <circle cx="7" cy="-3" r="1" fill="#ffffff"/>
    <path d="M-5 6 Q0 12 5 6" fill="none" stroke="#ffe169" stroke-width="2" stroke-linecap="round"/>
    <path d="M14 -12 l1.6 3.5 l3.5 1.6 l-3.5 1.6 l-1.6 3.5 l-1.6-3.5 l-3.5-1.6 l3.5-1.6z" fill="#ffe169"/>
  </g>

  <!-- Reimu orb (right) -->
  <g transform="translate(222, 149)">
    <circle r="27" fill="url(#sk-reimu)" stroke="#fff2e6" stroke-width="1.6"/>
    <!-- Giant shrine bow -->
    <path d="M-2 -24 L-24 -36 L-19 -17 Z" fill="#e62e45" stroke="#fff2e6" stroke-width="1.2"/>
    <path d="M2 -24 L24 -36 L19 -17 Z" fill="#e62e45" stroke="#fff2e6" stroke-width="1.2"/>
    <circle cx="0" cy="-24" r="5" fill="#fff2e6"/>
    <!-- Face -->
    <circle cx="-8" cy="-1" r="3" fill="#2b0c16"/>
    <circle cx="8" cy="-1" r="3" fill="#2b0c16"/>
    <circle cx="-9" cy="-2" r="1.2" fill="#ffffff"/>
    <circle cx="7" cy="-2" r="1.2" fill="#ffffff"/>
    <ellipse cx="-13" cy="4" rx="3" ry="1.6" fill="#ff9eb5" opacity="0.7"/>
    <ellipse cx="13" cy="4" rx="3" ry="1.6" fill="#ff9eb5" opacity="0.7"/>
    <path d="M-4 5 Q0 9 4 5" fill="none" stroke="#2b0c16" stroke-width="1.8" stroke-linecap="round"/>
  </g>

  <!-- Cirno orb (perched upper-left inside jar) -->
  <g transform="translate(106, 102)">
    <!-- Ice crystal wings -->
    <polygon points="-15,-4 -28,-12 -22,2" fill="#8ef0ff" opacity="0.88"/>
    <polygon points="15,-4 28,-12 22,2" fill="#8ef0ff" opacity="0.88"/>
    <circle r="17" fill="url(#sk-cirno)" stroke="#dcf8ff" stroke-width="1.4"/>
    <path d="M0 -15 L-9 -21 L-7 -12 Z M0 -15 L9 -21 L7 -12 Z" fill="#2667d4"/>
    <circle cx="-5" cy="-1" r="2.2" fill="#102b5c"/>
    <circle cx="5" cy="-1" r="2.2" fill="#102b5c"/>
    <path d="M-4 4 Q0 8 4 4" fill="none" stroke="#102b5c" stroke-width="1.6" stroke-linecap="round"/>
  </g>

  <!-- Centerpiece: Giant Ibuki Suika (Watermelon Oni!) -->
  <g>
    <!-- Festive golden aura -->
    <circle cx="164" cy="134" r="51" fill="#3be382" opacity="0.16"/>
    <!-- Oni Horns -->
    <path d="M137 98 Q121 72 132 58 Q144 74 148 92 Z" fill="#f7b733" stroke="#fff0a6" stroke-width="1.5"/>
    <path d="M191 98 Q207 72 196 58 Q184 74 180 92 Z" fill="#f7b733" stroke="#fff0a6" stroke-width="1.5"/>
    <!-- Horn Ribbons -->
    <circle cx="141" cy="95" r="5" fill="#e03e52"/>
    <circle cx="187" cy="95" r="5" fill="#8d4de8"/>
    <!-- Main Watermelon Orb -->
    <circle cx="164" cy="134" r="46" fill="url(#sk-suika)" stroke="#ffe169" stroke-width="2.2"/>
    <!-- Watermelon wavy dark stripes -->
    <g clip-path="url(#sk-suika-clip)" fill="none" stroke="#0d522c" stroke-width="7.5" stroke-linecap="round" opacity="0.7">
      <path d="M132 84 Q122 108 134 134 Q124 160 134 184"/>
      <path d="M164 84 Q156 108 166 134 Q158 160 164 184"/>
      <path d="M196 84 Q206 108 194 134 Q204 160 194 184"/>
    </g>
    <!-- Glossy highlight -->
    <ellipse cx="147" cy="112" rx="15" ry="8" transform="rotate(-28 147 112)" fill="#ffffff" opacity="0.32"/>
    <!-- Expressive joyful Suika face -->
    <circle cx="148" cy="131" r="5.5" fill="#2b1710"/>
    <circle cx="180" cy="131" r="5.5" fill="#2b1710"/>
    <circle cx="146" cy="129" r="2.2" fill="#ffffff"/>
    <circle cx="178" cy="129" r="2.2" fill="#ffffff"/>
    <circle cx="150" cy="133" r="1.1" fill="#ffd966"/>
    <circle cx="182" cy="133" r="1.1" fill="#ffd966"/>
    <ellipse cx="136" cy="141" rx="6" ry="3.2" fill="#ff7d95" opacity="0.72"/>
    <ellipse cx="192" cy="141" rx="6" ry="3.2" fill="#ff7d95" opacity="0.72"/>
    <path d="M155 142 Q164 155 173 142 Z" fill="#ff6b81" stroke="#3b1912" stroke-width="1.8" stroke-linejoin="round"/>
  </g>
</svg>`;
