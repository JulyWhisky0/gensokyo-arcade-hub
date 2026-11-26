export const FLAPPY_COVER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200" role="img" aria-label="幻想乡管道鸟 · 竹林疾飞">
  <defs>
    <linearGradient id="flappy-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1c1538"/>
      <stop offset="52%" stop-color="#5a2648"/>
      <stop offset="100%" stop-color="#d96b43"/>
    </linearGradient>
    <radialGradient id="flappy-moon" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fff4d6"/>
      <stop offset="55%" stop-color="#ff8c6b"/>
      <stop offset="100%" stop-color="#ff4d6d" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="flappy-bamboo" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#15573a"/>
      <stop offset="35%" stop-color="#38a169"/>
      <stop offset="68%" stop-color="#277952"/>
      <stop offset="100%" stop-color="#0f3d28"/>
    </linearGradient>
    <linearGradient id="flappy-torii" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#8c1522"/>
      <stop offset="40%" stop-color="#e03140"/>
      <stop offset="78%" stop-color="#b91c2c"/>
      <stop offset="100%" stop-color="#690d18"/>
    </linearGradient>
    <linearGradient id="flappy-ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#275c3e"/>
      <stop offset="28%" stop-color="#1a332b"/>
      <stop offset="100%" stop-color="#0f1c1d"/>
    </linearGradient>
    <filter id="flappy-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Twilight-to-Scarlet Gensokyo Sky -->
  <rect width="320" height="200" fill="url(#flappy-sky)"/>

  <!-- Giant Glowing Moon -->
  <circle cx="242" cy="54" r="46" fill="url(#flappy-moon)" opacity="0.72"/>
  <circle cx="242" cy="54" r="24" fill="#ffe6c7"/>
  <circle cx="235" cy="49" r="5" fill="#f7be94" opacity="0.45"/>
  <circle cx="249" cy="60" r="3.5" fill="#f7be94" opacity="0.4"/>

  <!-- Twinkling Stars -->
  <g fill="#fff4cc" opacity="0.85">
    <circle cx="34" cy="24" r="1.4"/>
    <circle cx="78" cy="16" r="1.1"/>
    <circle cx="132" cy="30" r="1.5"/>
    <circle cx="176" cy="20" r="1.2"/>
    <circle cx="294" cy="26" r="1.3"/>
    <path d="M56 38 L57.4 41.6 L61 43 L57.4 44.4 L56 48 L54.6 44.4 L51 43 L54.6 41.6 Z" opacity="0.8"/>
    <path d="M196 36 L197 38.8 L199.8 39.8 L197 40.8 L196 43.6 L195 40.8 L192.2 39.8 L195 38.8 Z" opacity="0.75"/>
  </g>

  <!-- Stylized Japanese Clouds -->
  <g fill="#ffd2b8" opacity="0.24">
    <rect x="18" y="64" width="66" height="10" rx="5"/>
    <rect x="40" y="56" width="38" height="9" rx="4.5"/>
    <rect x="150" y="76" width="76" height="9" rx="4.5"/>
    <rect x="174" y="69" width="42" height="8" rx="4"/>
  </g>

  <!-- Youkai Mountain Silhouette -->
  <path d="M0 164 L44 114 L88 142 L144 96 L198 138 L254 108 L320 148 L320 176 L0 176 Z" fill="#2c193a" opacity="0.82"/>
  <path d="M0 172 L56 134 L120 156 L184 128 L244 152 L320 132 L320 178 L0 178 Z" fill="#1b2632" opacity="0.9"/>

  <!-- Background Bamboo Silhouettes -->
  <g fill="#163b2d" opacity="0.65">
    <rect x="16" y="60" width="5" height="120"/>
    <rect x="28" y="80" width="4" height="100"/>
    <rect x="128" y="75" width="5" height="105"/>
    <rect x="292" y="58" width="6" height="122"/>
    <rect x="304" y="74" width="4" height="106"/>
  </g>

  <!-- Left Obstacle: Emerald Bamboo Pillar Pair -->
  <g>
    <!-- Top Bamboo -->
    <rect x="44" y="0" width="28" height="44" fill="url(#flappy-bamboo)" stroke="#0d3121" stroke-width="1.2"/>
    <rect x="41" y="20" width="34" height="4" rx="2" fill="#4ec283" stroke="#0d3121" stroke-width="1"/>
    <rect x="39" y="40" width="38" height="11" rx="3" fill="url(#flappy-bamboo)" stroke="#0d3121" stroke-width="1.4"/>
    <rect x="43" y="42" width="30" height="2.5" rx="1" fill="#86efac" opacity="0.5"/>
    <!-- Bottom Bamboo -->
    <rect x="44" y="132" width="28" height="48" fill="url(#flappy-bamboo)" stroke="#0d3121" stroke-width="1.2"/>
    <rect x="39" y="128" width="38" height="11" rx="3" fill="url(#flappy-bamboo)" stroke="#0d3121" stroke-width="1.4"/>
    <rect x="41" y="154" width="34" height="4" rx="2" fill="#4ec283" stroke="#0d3121" stroke-width="1"/>
    <!-- Bamboo Leaves -->
    <ellipse cx="36" cy="138" rx="7" ry="2.6" transform="rotate(-24 36 138)" fill="#5cd68d"/>
    <ellipse cx="80" cy="48" rx="6.5" ry="2.4" transform="rotate(20 80 48)" fill="#5cd68d"/>
  </g>

  <!-- Right Obstacle: Crimson Torii Shrine Pillar Pair -->
  <g>
    <!-- Top Torii Pillar -->
    <rect x="230" y="0" width="30" height="62" fill="url(#flappy-torii)" stroke="#4f0a12" stroke-width="1.2"/>
    <rect x="222" y="54" width="46" height="9" rx="2" fill="url(#flappy-torii)" stroke="#4f0a12" stroke-width="1.3"/>
    <path d="M218 62 Q245 68 272 62 L270 67 Q245 73 220 67 Z" fill="#1c1926"/>
    <rect x="239" y="55" width="12" height="7" rx="1" fill="#f5c542" stroke="#5a180d" stroke-width="0.9"/>
    <!-- Hanging Lantern -->
    <line x1="227" y1="66" x2="227" y2="74" stroke="#f5c542" stroke-width="1"/>
    <ellipse cx="227" cy="79" rx="5" ry="6" fill="#ffcf6b" stroke="#991b1b" stroke-width="1.1"/>
    <line x1="223" y1="79" x2="231" y2="79" stroke="#c2410c" stroke-width="0.8"/>

    <!-- Bottom Torii Pillar -->
    <rect x="230" y="142" width="30" height="38" fill="url(#flappy-torii)" stroke="#4f0a12" stroke-width="1.2"/>
    <path d="M218 140 Q245 134 272 140 L270 145 Q245 139 220 145 Z" fill="#1c1926"/>
    <rect x="222" y="144" width="46" height="8" rx="2" fill="url(#flappy-torii)" stroke="#4f0a12" stroke-width="1.3"/>
    <rect x="239" y="144" width="12" height="7" rx="1" fill="#f5c542" stroke="#5a180d" stroke-width="0.9"/>
  </g>

  <!-- Collectible Touhou P-Star -->
  <g transform="translate(194, 102)" filter="url(#flappy-glow)">
    <circle cx="0" cy="0" r="12" fill="#f59e0b" opacity="0.28"/>
    <path d="M0 -10 L2.9 -3.2 L10 -2.6 L4.6 2.1 L6.2 9.2 L0 5.5 L-6.2 9.2 L-4.6 2.1 L-10 -2.6 L-2.9 -3.2 Z" fill="#fde047" stroke="#b91c1c" stroke-width="1.2"/>
    <text x="0" y="3.2" text-anchor="middle" font-family="sans-serif" font-size="8.5" font-weight="900" fill="#991b1b">P</text>
  </g>

  <!-- Wind & Maple Leaf Trail behind Aya -->
  <g opacity="0.92">
    <path d="M84 98 Q100 92 114 97" fill="none" stroke="#fff3d1" stroke-width="1.8" stroke-linecap="round" opacity="0.7"/>
    <path d="M76 108 Q94 104 110 109" fill="none" stroke="#fca5a5" stroke-width="1.4" stroke-linecap="round" opacity="0.65"/>
    <!-- Maple Leaves -->
    <path d="M98 86 L101 82 L102 86 L106 85 L103 88 L105 91 L101 89 L98 92 L99 88 L95 87 Z" fill="#ef4444"/>
    <path d="M82 114 L85 111 L86 114 L89 113 L87 116 L88 119 L85 117 L82 119 L83 116 L80 115 Z" fill="#f97316"/>
    <path d="M110 116 L112 113 L113 116 L116 115 L114 118 L115 120 L112 119 L110 120 L111 118 L108 117 Z" fill="#fbbf24"/>
  </g>

  <!-- Hero Flyer: Aya Shameimaru (Chibi Tengu) -->
  <g transform="translate(136, 98) rotate(-10)">
    <!-- Back Tengu Wing -->
    <path d="M-4 -4 C-22 -22 -32 -12 -24 2 C-18 6 -10 4 -4 0 Z" fill="#181c28" stroke="#0b0d14" stroke-width="1.3"/>
    <!-- Red Trailing Ribbon -->
    <path d="M-8 6 Q-18 12 -26 9 Q-19 16 -10 13 Z" fill="#dc2626"/>
    <!-- Body / White Blouse & Dark Skirt -->
    <ellipse cx="0" cy="6" rx="11" ry="9" fill="#f8fafc" stroke="#1e293b" stroke-width="1.3"/>
    <path d="M-9 8 Q0 16 9 8 L7 14 Q0 17 -7 14 Z" fill="#1e2230"/>
    <!-- Red Tie -->
    <polygon points="3,3 8,6 4,10 1,6" fill="#dc2626"/>
    <!-- Head -->
    <circle cx="3" cy="-5" r="11.5" fill="#ffebd6" stroke="#2d1e24" stroke-width="1.3"/>
    <!-- Short Black Hair -->
    <path d="M-9 -6 C-10 -18 8 -21 14 -11 C15 -8 14 -3 11 -1 C11 -6 8 -10 2 -10 C-3 -10 -7 -6 -8 0 Z" fill="#1b1e2b" stroke="#0c0e16" stroke-width="1.1"/>
    <!-- Cute Blush & Eyes -->
    <ellipse cx="7.5" cy="-4.5" rx="2.1" ry="2.7" fill="#c81e32"/>
    <circle cx="8.2" cy="-5.4" r="0.8" fill="#ffffff"/>
    <ellipse cx="10.2" cy="-1.2" rx="1.8" ry="1" fill="#fda4af" opacity="0.75"/>
    <path d="M8.8 0.4 Q10.6 1.8 12.2 0.2" fill="none" stroke="#7f1d1d" stroke-width="1" stroke-linecap="round"/>
    <!-- Iconic Red Tokin Cap -->
    <polygon points="-2,-15 8,-17 11,-23 1,-24" fill="#dc2626" stroke="#7f1d1d" stroke-width="1.1"/>
    <line x1="-1" y1="-15" x2="10" y2="-17" stroke="#f5c542" stroke-width="1.4"/>
    <!-- Front Flapping Tengu Wing -->
    <path d="M-3 2 C-18 -14 -30 -4 -22 9 C-16 14 -7 10 -1 6 Z" fill="#23293d" stroke="#0b0d14" stroke-width="1.3"/>
    <path d="M-19 2 L-8 4 M-21 6 L-9 7" stroke="#475569" stroke-width="1" stroke-linecap="round"/>
  </g>

  <!-- Foreground Shrine Bamboo Path -->
  <rect x="0" y="176" width="320" height="24" fill="url(#flappy-ground)"/>
  <rect x="0" y="174" width="320" height="4" fill="#48bb78"/>
  <rect x="0" y="178" width="320" height="2" fill="#f5c542" opacity="0.75"/>
  <!-- Speed Stripes on Ground -->
  <g stroke="#2d6a4f" stroke-width="2" opacity="0.6">
    <line x1="12" y1="186" x2="36" y2="186"/>
    <line x1="74" y1="191" x2="108" y2="191"/>
    <line x1="146" y1="185" x2="182" y2="185"/>
    <line x1="216" y1="192" x2="254" y2="192"/>
    <line x1="278" y1="186" x2="306" y2="186"/>
  </g>
</svg>`;
