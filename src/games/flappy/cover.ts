export const FLAPPY_COVER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200" role="img" aria-label="幻想乡管道鸟 · 竹林疾飞">
  <defs>
    <linearGradient id="flappy-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#140c2b"/>
      <stop offset="35%" stop-color="#471a48"/>
      <stop offset="72%" stop-color="#a63656"/>
      <stop offset="100%" stop-color="#f0925c"/>
    </linearGradient>
    <radialGradient id="flappy-moon" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fff4db"/>
      <stop offset="46%" stop-color="#ff8c7a" stop-opacity="0.72"/>
      <stop offset="78%" stop-color="#e0365e" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#b81d4a" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="flappy-ray" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffe8c4" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#ffe8c4" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="flappy-mist" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f89680" stop-opacity="0"/>
      <stop offset="100%" stop-color="#f89680" stop-opacity="0.32"/>
    </linearGradient>
    <radialGradient id="flappy-lantern-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffe699" stop-opacity="0.82"/>
      <stop offset="50%" stop-color="#ff8a4c" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#e03140" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="flappy-bamboo" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0d3b27"/>
      <stop offset="28%" stop-color="#2d9960"/>
      <stop offset="46%" stop-color="#86efac"/>
      <stop offset="74%" stop-color="#1e7248"/>
      <stop offset="100%" stop-color="#12452d"/>
    </linearGradient>
    <linearGradient id="flappy-torii" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#5e0a15"/>
      <stop offset="28%" stop-color="#d92638"/>
      <stop offset="48%" stop-color="#ff828d"/>
      <stop offset="78%" stop-color="#a81526"/>
      <stop offset="100%" stop-color="#5a0a14"/>
    </linearGradient>
    <linearGradient id="flappy-ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#224a38"/>
      <stop offset="35%" stop-color="#172b2d"/>
      <stop offset="100%" stop-color="#0c131c"/>
    </linearGradient>
    <filter id="flappy-glow" x="-35%" y="-35%" width="170%" height="170%">
      <feGaussianBlur stdDeviation="2.4" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- 4-stop Gensokyo Sunset-to-Scarlet Sky -->
  <rect width="320" height="200" fill="url(#flappy-sky)"/>

  <!-- Diagonal Volumetric Moonbeams -->
  <g fill="url(#flappy-ray)">
    <polygon points="228,44 246,44 132,176 92,176"/>
    <polygon points="244,44 260,44 202,176 168,176"/>
    <polygon points="256,44 270,44 268,176 236,176"/>
  </g>

  <!-- Giant Luminous Volumetric Moon -->
  <circle cx="246" cy="50" r="56" fill="url(#flappy-moon)"/>
  <circle cx="246" cy="50" r="24" fill="#ffe4cc"/>
  <circle cx="246" cy="50" r="24.5" fill="none" stroke="#fff3e0" stroke-width="0.9" opacity="0.45"/>
  <circle cx="238" cy="45" r="5.5" fill="#e69285" opacity="0.38"/>
  <circle cx="253" cy="57" r="4" fill="#e69285" opacity="0.34"/>

  <!-- Twinkling Stars & Danmaku Glints -->
  <g fill="#fff5d4" opacity="0.88">
    <circle cx="28" cy="22" r="1.3"/>
    <circle cx="76" cy="15" r="1.1"/>
    <circle cx="132" cy="28" r="1.4"/>
    <circle cx="176" cy="18" r="1.2"/>
    <circle cx="296" cy="24" r="1.3"/>
    <path d="M54 34 L55.4 37.8 L59.2 39.2 L55.4 40.6 L54 44.4 L52.6 40.6 L48.8 39.2 L52.6 37.8 Z"/>
    <path d="M196 32 L197 34.8 L199.8 35.8 L197 36.8 L196 39.6 L195 36.8 L192.2 35.8 L195 34.8 Z" opacity="0.8"/>
  </g>

  <!-- Soft Painterly Wispy Clouds -->
  <g opacity="0.28">
    <ellipse cx="48" cy="64" rx="28" ry="6" fill="#ffcca8"/>
    <ellipse cx="62" cy="58" rx="18" ry="6.5" fill="#ffe6cc"/>
    <ellipse cx="174" cy="74" rx="34" ry="6.5" fill="#ffcca8"/>
    <ellipse cx="190" cy="67" rx="20" ry="7" fill="#ffe6cc"/>
  </g>

  <!-- Layered Distant Youkai Mountain + Waterfall Glint -->
  <path d="M0 162 L40 112 L84 140 L142 90 L198 134 L256 104 L320 144 L320 176 L0 176 Z" fill="#32193f" opacity="0.84"/>
  <path d="M141 100 Q145 122 142 142" fill="none" stroke="#d8f2ff" stroke-width="1.3" opacity="0.32"/>

  <!-- Mid-ground Hills with Hakurei Shrine Hall & Glowing Lanterns -->
  <path d="M0 172 Q70 128 148 152 Q232 126 320 156 L320 178 L0 178 Z" fill="#1d182e" opacity="0.94"/>
  <!-- Hakurei Shrine Roof & Glowing Shoji Windows -->
  <g transform="translate(154, 146)">
    <path d="M-20 0 Q0 -14 20 0 L15 2 L15 12 L-15 12 L-15 2 Z" fill="#181226"/>
    <rect x="-8" y="4" width="4.5" height="6" fill="#ffd98a" opacity="0.85"/>
    <rect x="-2.2" y="4" width="4.5" height="6" fill="#ffd98a" opacity="0.85"/>
    <rect x="3.5" y="4" width="4.5" height="6" fill="#ffd98a" opacity="0.85"/>
  </g>

  <!-- Background Lost Bamboo Grove Silhouettes -->
  <g fill="#163b2d" opacity="0.62">
    <rect x="14" y="56" width="5" height="122"/>
    <rect x="26" y="76" width="4" height="102"/>
    <rect x="116" y="70" width="5" height="108"/>
    <rect x="292" y="54" width="6" height="124"/>
    <rect x="304" y="72" width="4" height="106"/>
  </g>

  <!-- Atmospheric Mist & Fireflies -->
  <rect x="0" y="132" width="320" height="44" fill="url(#flappy-mist)"/>
  <g fill="#fff8c4" opacity="0.78">
    <circle cx="96" cy="146" r="1.4"/>
    <circle cx="186" cy="154" r="1.3"/>
    <circle cx="278" cy="138" r="1.5"/>
  </g>

  <!-- Left Obstacle: Ornate Emerald Bamboo Pillars with Shide Charms & Leaves -->
  <g>
    <rect x="40" y="0" width="30" height="46" fill="url(#flappy-bamboo)" stroke="#092417" stroke-width="1.2"/>
    <rect x="37" y="19" width="36" height="4.5" rx="2.2" fill="#4ad182" stroke="#092417" stroke-width="1"/>
    <rect x="35" y="40" width="40" height="12" rx="3.2" fill="url(#flappy-bamboo)" stroke="#092417" stroke-width="1.3"/>
    <rect x="37" y="43" width="36" height="2.4" fill="#dc2626"/>
    <!-- Swaying White Shide Paper Charm -->
    <polygon points="46,52 50,52 49,56 51.5,57 49.5,62 46.5,61 48,57 45.5,56" fill="#fffef8" stroke="#b91c2c" stroke-width="0.65"/>
    <!-- Bottom Bamboo -->
    <rect x="40" y="132" width="30" height="46" fill="url(#flappy-bamboo)" stroke="#092417" stroke-width="1.2"/>
    <rect x="35" y="128" width="40" height="12" rx="3.2" fill="url(#flappy-bamboo)" stroke="#092417" stroke-width="1.3"/>
    <rect x="37" y="135" width="36" height="2.4" fill="#dc2626"/>
    <rect x="37" y="155" width="36" height="4.5" rx="2.2" fill="#4ad182" stroke="#092417" stroke-width="1"/>
    <!-- Bamboo Leaf Clusters -->
    <g fill="#4ade80" stroke="#0c3520" stroke-width="0.7">
      <ellipse cx="30" cy="137" rx="7.5" ry="2.4" transform="rotate(-24 30 137)"/>
      <ellipse cx="32" cy="142" rx="6" ry="2" transform="rotate(14 32 142)"/>
      <ellipse cx="81" cy="46" rx="7" ry="2.3" transform="rotate(20 81 46)"/>
    </g>
  </g>

  <!-- Right Obstacle: Crimson Torii Shrine Pillars with Glowing Mini Red Lanterns -->
  <g>
    <rect x="230" y="0" width="32" height="62" fill="url(#flappy-torii)" stroke="#3f070e" stroke-width="1.2"/>
    <rect x="221" y="54" width="50" height="10" rx="2.2" fill="url(#flappy-torii)" stroke="#3f070e" stroke-width="1.3"/>
    <path d="M216 63 Q246 70 276 63 L274 68 Q246 75 218 68 Z" fill="#191424"/>
    <rect x="240" y="55.5" width="12" height="7.5" rx="1" fill="#1c1424" stroke="#f5c542" stroke-width="1"/>
    <rect x="244.5" y="57.2" width="3" height="4.2" fill="#fde68a"/>
    <!-- Hanging Glowing Mini Red Lantern -->
    <circle cx="226" cy="80" r="18" fill="url(#flappy-lantern-glow)"/>
    <line x1="226" y1="67" x2="226" y2="74" stroke="#f5c542" stroke-width="1.1"/>
    <ellipse cx="226" cy="80" rx="5.2" ry="6.2" fill="#ff9457" stroke="#7f1d1d" stroke-width="1.1"/>
    <circle cx="225" cy="78.5" r="2.2" fill="#fff5cc"/>
    <rect x="223" y="73.5" width="6" height="1.8" fill="#1c1424"/>
    <rect x="223" y="85.2" width="6" height="1.8" fill="#1c1424"/>

    <!-- Bottom Torii Pillar -->
    <rect x="230" y="142" width="32" height="36" fill="url(#flappy-torii)" stroke="#3f070e" stroke-width="1.2"/>
    <path d="M216 140 Q246 133 276 140 L274 145 Q246 138 218 145 Z" fill="#191424"/>
    <rect x="221" y="144" width="50" height="9" rx="2.2" fill="url(#flappy-torii)" stroke="#3f070e" stroke-width="1.3"/>
    <rect x="240" y="145" width="12" height="7" rx="1" fill="#1c1424" stroke="#f5c542" stroke-width="1"/>
    <rect x="244.5" y="146.5" width="3" height="4" fill="#fde68a"/>
  </g>

  <!-- Authentic Touhou [P] Power Collectible -->
  <g transform="translate(194, 102)" filter="url(#flappy-glow)">
    <circle cx="0" cy="0" r="15" fill="#fde047" opacity="0.26"/>
    <g stroke="#fef08a" stroke-width="1.1" opacity="0.7" stroke-linecap="round">
      <line x1="0" y1="-13" x2="0" y2="-10"/>
      <line x1="0" y1="10" x2="0" y2="13"/>
      <line x1="-13" y1="0" x2="-10" y2="0"/>
      <line x1="10" y1="0" x2="13" y2="0"/>
    </g>
    <rect x="-8.5" y="-8.5" width="17" height="17" rx="3.5" fill="#fde047" stroke="#991b1b" stroke-width="1.3"/>
    <rect x="-6.8" y="-6.8" width="13.6" height="13.6" rx="2.4" fill="#dc2626"/>
    <text x="0.3" y="3.5" text-anchor="middle" font-family="sans-serif" font-size="10.5" font-weight="900" fill="#ffffff">P</text>
  </g>

  <!-- Glowing Incident Danmaku Orbs & Electric Graze Sparks -->
  <g filter="url(#flappy-glow)">
    <g transform="translate(178, 66)">
      <circle cx="0" cy="0" r="11" fill="#f43f5e" opacity="0.3"/>
      <circle cx="0" cy="0" r="6.4" fill="#f43f5e" stroke="#4c0519" stroke-width="0.9"/>
      <circle cx="0" cy="0" r="4.1" fill="#ffffff"/>
    </g>
    <g transform="translate(274, 114)">
      <circle cx="0" cy="0" r="10.5" fill="#facc15" opacity="0.32"/>
      <circle cx="0" cy="0" r="6" fill="#facc15" stroke="#713f12" stroke-width="0.9"/>
      <circle cx="0" cy="0" r="3.8" fill="#ffffff"/>
    </g>
    <!-- Crisp Electric Graze Sparks near Aya -->
    <g stroke="#fff9c4" stroke-width="1.4" stroke-linecap="round" opacity="0.92">
      <line x1="156" y1="78" x2="164" y2="73"/>
      <line x1="154" y1="72" x2="160" y2="65"/>
      <line x1="160" y1="84" x2="167" y2="83"/>
    </g>
  </g>

  <!-- Crisp Wind-Gust Air Ring, Wind Ribbons & Maple Trail behind Aya -->
  <g>
    <ellipse cx="116" cy="112" rx="14" ry="5" transform="rotate(-12 116 112)" fill="none" stroke="#fffdf4" stroke-width="1.6" opacity="0.8"/>
    <path d="M78 96 Q98 89 116 96" fill="none" stroke="#fff6db" stroke-width="1.8" stroke-linecap="round" opacity="0.76"/>
    <path d="M72 108 Q92 103 110 109" fill="none" stroke="#fca5a5" stroke-width="1.4" stroke-linecap="round" opacity="0.68"/>
    <path d="M96 84 L99 80 L100 84 L104 83 L101 86 L103 89 L99 87 L96 90 L97 86 L93 85 Z" fill="#ef4444"/>
    <path d="M80 114 L83 111 L84 114 L87 113 L85 116 L86 119 L83 117 L80 119 L81 116 L78 115 Z" fill="#f97316"/>
    <path d="M108 117 L110 114 L111 117 L114 116 L112 119 L113 121 L110 120 L108 121 L109 119 L106 118 Z" fill="#fbbf24"/>
  </g>

  <!-- Detailed Chibi Aya Shameimaru -->
  <g transform="translate(136, 97) rotate(-11)">
    <!-- Back Crow Wing -->
    <path d="M-4 -4 C-22 -22 -33 -12 -25 2 C-18 6 -10 4 -4 0 Z" fill="#141824" stroke="#080a10" stroke-width="1.3"/>
    <!-- Flowing Crimson Tengu Scarf -->
    <path d="M-6 5 Q-18 11 -30 7 L-25 13 Q-15 15 -6 11 Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="0.9"/>
    <!-- Blouse, Skirt & Tie -->
    <ellipse cx="0" cy="6" rx="11.2" ry="9" fill="#f8fafc" stroke="#1e293b" stroke-width="1.3"/>
    <path d="M-9 8 Q0 16 9 8 L7 14 Q0 17 -7 14 Z" fill="#1e2230"/>
    <polygon points="3,2.5 8.5,5.5 4,10.5 1,6" fill="#dc2626"/>
    <!-- Head & Hair -->
    <circle cx="3" cy="-5" r="11.6" fill="#ffebd6" stroke="#2d1e24" stroke-width="1.3"/>
    <path d="M-9 -6 C-10 -18 8 -21 14 -11 C15 -8 14 -3 11 -1 C11 -6 8 -10 2 -10 C-3 -10 -7 -6 -9 1 C-12 2 -14 4 -12 -2 Z" fill="#181c29" stroke="#090b12" stroke-width="1.1"/>
    <path d="M-2 -12 A7 7 0 0 1 7 -13" fill="none" stroke="#94a3b8" stroke-width="1.3" stroke-linecap="round"/>
    <!-- Layered Anime Eye, Blush & Confident Grin -->
    <ellipse cx="7.6" cy="-4.5" rx="2.3" ry="3" fill="#ffffff"/>
    <ellipse cx="7.8" cy="-4.4" rx="2" ry="2.7" fill="#b91c1c"/>
    <ellipse cx="7.8" cy="-3.3" rx="1.4" ry="1" fill="#f87171"/>
    <circle cx="7.9" cy="-4.5" r="0.9" fill="#180d14"/>
    <circle cx="8.5" cy="-5.5" r="0.85" fill="#ffffff"/>
    <circle cx="7.2" cy="-3.3" r="0.45" fill="#ffffff"/>
    <ellipse cx="10.2" cy="-1.1" rx="2" ry="1.1" fill="#fb7185" opacity="0.62"/>
    <path d="M8.8 0.2 Q10.6 1.8 12.2 0.2" fill="none" stroke="#7f1d1d" stroke-width="1.05" stroke-linecap="round"/>
    <!-- Iconic Red Tokin Cap -->
    <polygon points="-2,-15 8.5,-17 11,-23.5 0.5,-24" fill="#dc2626" stroke="#7f1d1d" stroke-width="1.1"/>
    <line x1="-1" y1="-15" x2="10" y2="-17" stroke="#facc15" stroke-width="1.5"/>
    <!-- Articulated Front Crow Wing -->
    <path d="M-2 2 C-18 -15 -31 -5 -23 8 L-26 11 Q-16 14 -10 10 L-12 13 Q-5 13 0 6 Z" fill="#252c42" stroke="#090b12" stroke-width="1.3"/>
    <path d="M-19 2 L-8 4 M-21 6 L-9 7" stroke="#94a3b8" stroke-width="1" stroke-linecap="round"/>
  </g>

  <!-- Rich Shrine Moss & Stepping-Stone Foreground Path -->
  <rect x="0" y="176" width="320" height="24" fill="url(#flappy-ground)"/>
  <rect x="0" y="174" width="320" height="4.5" fill="#38a169"/>
  <rect x="0" y="178.5" width="320" height="2.2" fill="#b91c2c"/>
  <rect x="0" y="180.7" width="320" height="1.3" fill="#f5c542"/>
  <!-- Swaying Grass Blades -->
  <g stroke="#68d391" stroke-width="1.2" stroke-linecap="round" fill="none">
    <path d="M18 175 Q17 170 20 168"/>
    <path d="M62 175 Q60 171 64 169"/>
    <path d="M126 175 Q125 170 128 168"/>
    <path d="M204 175 Q202 171 206 168"/>
    <path d="M286 175 Q285 170 289 168"/>
  </g>
  <!-- Shrine Stepping Stones & Fallen Petals -->
  <g fill="#e2e8f0" opacity="0.1">
    <rect x="10" y="185" width="34" height="10" rx="4"/>
    <rect x="56" y="187" width="38" height="10" rx="4"/>
    <rect x="112" y="185" width="36" height="10" rx="4"/>
    <rect x="164" y="187" width="40" height="10" rx="4"/>
    <rect x="220" y="185" width="34" height="10" rx="4"/>
    <rect x="270" y="187" width="38" height="10" rx="4"/>
  </g>
  <g fill="#fdbacc" opacity="0.65">
    <ellipse cx="42" cy="190" rx="2.6" ry="1.2" transform="rotate(20 42 190)"/>
    <ellipse cx="144" cy="192" rx="2.5" ry="1.2" transform="rotate(-15 144 192)"/>
    <ellipse cx="256" cy="189" rx="2.4" ry="1.1" transform="rotate(18 256 189)"/>
  </g>
</svg>`;
