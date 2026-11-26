export const puyoCoverSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200">
  <defs>
    <linearGradient id="puyoBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#130f2e"/>
      <stop offset="55%" stop-color="#1e1747"/>
      <stop offset="100%" stop-color="#291a4d"/>
    </linearGradient>
    <radialGradient id="puyoMoonGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffe89e" stop-opacity="0.65"/>
      <stop offset="60%" stop-color="#f5b82e" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#f5b82e" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="puyoRed" cx="35%" cy="30%" r="68%">
      <stop offset="0%" stop-color="#ff9cab"/>
      <stop offset="45%" stop-color="#e53950"/>
      <stop offset="100%" stop-color="#871024"/>
    </radialGradient>
    <radialGradient id="puyoBlue" cx="35%" cy="30%" r="68%">
      <stop offset="0%" stop-color="#a8ecff"/>
      <stop offset="45%" stop-color="#1ea7f2"/>
      <stop offset="100%" stop-color="#0c5291"/>
    </radialGradient>
    <radialGradient id="puyoGold" cx="35%" cy="30%" r="68%">
      <stop offset="0%" stop-color="#fff4a8"/>
      <stop offset="45%" stop-color="#f2b724"/>
      <stop offset="100%" stop-color="#9e5e06"/>
    </radialGradient>
    <radialGradient id="puyoGreen" cx="35%" cy="30%" r="68%">
      <stop offset="0%" stop-color="#a4fad0"/>
      <stop offset="45%" stop-color="#24bd6b"/>
      <stop offset="100%" stop-color="#0a6635"/>
    </radialGradient>
    <radialGradient id="puyoPurple" cx="35%" cy="30%" r="68%">
      <stop offset="0%" stop-color="#e5c2ff"/>
      <stop offset="45%" stop-color="#9b4ee6"/>
      <stop offset="100%" stop-color="#4e198a"/>
    </radialGradient>
    <linearGradient id="puyoSpellRibbon" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#f5b82e" stop-opacity="0"/>
      <stop offset="25%" stop-color="#f5b82e" stop-opacity="0.32"/>
      <stop offset="50%" stop-color="#ff5e78" stop-opacity="0.5"/>
      <stop offset="75%" stop-color="#a855f7" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#a855f7" stop-opacity="0"/>
    </linearGradient>
    <filter id="puyoSoftGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Night Forest Sky -->
  <rect width="320" height="200" fill="url(#puyoBg)"/>

  <!-- Crescent Moon & Glow -->
  <circle cx="264" cy="42" r="46" fill="url(#puyoMoonGlow)"/>
  <path d="M268 20 A22 22 0 1 0 282 58 A17 17 0 1 1 268 20 Z" fill="#fff2b8" opacity="0.92"/>

  <!-- Forest Silhouette & Magic Mushrooms -->
  <path d="M0 165 L22 122 L38 152 L58 112 L78 158 L102 128 L122 168 L195 168 L222 120 L244 155 L268 110 L292 150 L320 124 L320 200 L0 200 Z" fill="#120d26" opacity="0.78"/>
  <path d="M0 178 Q80 162 160 176 Q240 190 320 172 L320 200 L0 200 Z" fill="#0d091d"/>

  <!-- Starlight sparkles -->
  <g fill="#ffe89e" opacity="0.85">
    <circle cx="34" cy="30" r="1.6"/>
    <circle cx="72" cy="52" r="1.2"/>
    <circle cx="110" cy="24" r="1.8"/>
    <circle cx="204" cy="30" r="1.4"/>
    <circle cx="298" cy="76" r="1.5"/>
    <circle cx="48" cy="84" r="1.1"/>
  </g>
  <!-- 4-point magic stars -->
  <path d="M52 44 L54.2 49.8 L60 52 L54.2 54.2 L52 60 L49.8 54.2 L44 52 L49.8 49.8 Z" fill="#ffe587" opacity="0.9"/>
  <path d="M236 68 L237.6 72.4 L242 74 L237.6 75.6 L236 80 L234.4 75.6 L230 74 L234.4 72.4 Z" fill="#99e9ff" opacity="0.85"/>

  <!-- Marisa Witch Hat Silhouette Emblem (top left accent) -->
  <g transform="translate(26, 20) rotate(-14)" opacity="0.88">
    <ellipse cx="22" cy="30" rx="26" ry="6.5" fill="#191330" stroke="#f2b724" stroke-width="1.4"/>
    <path d="M8 29 L21 4 L34 29 Z" fill="#1d1638" stroke="#f2b724" stroke-width="1.3"/>
    <path d="M11 25 Q22 29 33 25" fill="none" stroke="#ffeff8" stroke-width="2.4" stroke-linecap="round"/>
    <polygon points="22,12 23.6,16 28,16 24.5,18.5 25.8,22.5 22,20 18.2,22.5 19.5,18.5 16,16 20.4,16" fill="#ffe36e"/>
  </g>

  <!-- Central Mini Shrine Board Frame -->
  <rect x="86" y="20" width="148" height="164" rx="12" fill="#140f2b" fill-opacity="0.88" stroke="#f0c259" stroke-width="2"/>
  <rect x="91" y="25" width="138" height="154" rx="8" fill="none" stroke="#c82333" stroke-opacity="0.55" stroke-width="1"/>
  <!-- Subtle grid lines -->
  <g stroke="#ffffff" stroke-opacity="0.06" stroke-width="1">
    <line x1="126" y1="26" x2="126" y2="178"/>
    <line x1="160" y1="26" x2="160" y2="178"/>
    <line x1="194" y1="26" x2="194" y2="178"/>
    <line x1="92" y1="64" x2="228" y2="64"/>
    <line x1="92" y1="102" x2="228" y2="102"/>
    <line x1="92" y1="140" x2="228" y2="140"/>
  </g>

  <!-- Glowing Chain Ribbon Behind Puyos -->
  <rect x="44" y="84" width="232" height="28" fill="url(#puyoSpellRibbon)"/>

  <!-- Fused Red Reimu Puyo Duo (bottom-left of frame) -->
  <g filter="url(#puyoSoftGlow)">
    <rect x="109" y="143" width="34" height="24" rx="10" fill="url(#puyoRed)"/>
    <circle cx="109" cy="155" r="16" fill="url(#puyoRed)" stroke="#5c0b1a" stroke-width="1.6"/>
    <circle cx="143" cy="155" r="16" fill="url(#puyoRed)" stroke="#5c0b1a" stroke-width="1.6"/>
    <!-- Smooth connector mask -->
    <rect x="112" y="144" width="28" height="22" rx="8" fill="url(#puyoRed)"/>
    <!-- Gloss & Yin-Yang highlight -->
    <ellipse cx="103" cy="147" rx="4.5" ry="2.6" transform="rotate(-24 103 147)" fill="#ffffff" opacity="0.58"/>
    <ellipse cx="137" cy="147" rx="4.5" ry="2.6" transform="rotate(-24 137 147)" fill="#ffffff" opacity="0.58"/>
    <!-- Cute eyes -->
    <ellipse cx="104" cy="156" rx="2.6" ry="3.5" fill="#fff"/>
    <ellipse cx="114" cy="156" rx="2.6" ry="3.5" fill="#fff"/>
    <circle cx="104.7" cy="156.5" r="1.6" fill="#2b0812"/>
    <circle cx="114.7" cy="156.5" r="1.6" fill="#2b0812"/>
    <ellipse cx="138" cy="156" rx="2.6" ry="3.5" fill="#fff"/>
    <ellipse cx="148" cy="156" rx="2.6" ry="3.5" fill="#fff"/>
    <circle cx="138.7" cy="156.5" r="1.6" fill="#2b0812"/>
    <circle cx="148.7" cy="156.5" r="1.6" fill="#2b0812"/>
  </g>

  <!-- Green Sanae Puyo (bottom-right) -->
  <g>
    <circle cx="177" cy="155" r="16" fill="url(#puyoGreen)" stroke="#063d20" stroke-width="1.6"/>
    <ellipse cx="171" cy="147" rx="4.5" ry="2.5" transform="rotate(-24 171 147)" fill="#ffffff" opacity="0.58"/>
    <path d="M170 156 Q172.5 153 175 156" fill="none" stroke="#083019" stroke-width="2" stroke-linecap="round"/>
    <path d="M179 156 Q181.5 153 184 156" fill="none" stroke="#083019" stroke-width="2" stroke-linecap="round"/>
  </g>

  <!-- Purple Patchouli Puyo (bottom far right) -->
  <g>
    <circle cx="211" cy="155" r="16" fill="url(#puyoPurple)" stroke="#300d59" stroke-width="1.6"/>
    <ellipse cx="205" cy="147" rx="4.5" ry="2.5" transform="rotate(-24 205 147)" fill="#ffffff" opacity="0.55"/>
    <ellipse cx="206" cy="156" rx="2.5" ry="3.2" fill="#fff"/>
    <ellipse cx="216" cy="156" rx="2.5" ry="3.2" fill="#fff"/>
    <circle cx="206.5" cy="156.7" r="1.5" fill="#290b4a"/>
    <circle cx="216.5" cy="156.7" r="1.5" fill="#290b4a"/>
  </g>

  <!-- Fused Blue Cirno Vertical Pair -->
  <g>
    <rect x="165" y="121" width="24" height="22" rx="8" fill="url(#puyoBlue)"/>
    <circle cx="177" cy="121" r="16" fill="url(#puyoBlue)" stroke="#07325c" stroke-width="1.6"/>
    <ellipse cx="171" cy="113" rx="4.5" ry="2.5" transform="rotate(-24 171 113)" fill="#ffffff" opacity="0.65"/>
    <!-- Ice crystal sparkle -->
    <g stroke="#d9f7ff" stroke-width="1.2" opacity="0.7">
      <line x1="177" y1="108" x2="177" y2="114"/>
      <line x1="174" y1="111" x2="180" y2="111"/>
    </g>
    <ellipse cx="172" cy="122" rx="2.6" ry="3.5" fill="#fff"/>
    <ellipse cx="182" cy="122" rx="2.6" ry="3.5" fill="#fff"/>
    <circle cx="172.5" cy="122.5" r="1.6" fill="#06284a"/>
    <circle cx="182.5" cy="122.5" r="1.6" fill="#06284a"/>
  </g>

  <!-- Golden Marisa Star Puyo (falling active pair!) -->
  <g filter="url(#puyoSoftGlow)">
    <circle cx="143" cy="68" r="16.5" fill="url(#puyoGold)" stroke="#5c3600" stroke-width="1.6"/>
    <circle cx="143" cy="102" r="16.5" fill="url(#puyoRed)" stroke="#5c0b1a" stroke-width="1.6"/>
    <!-- Star motif on gold puyo -->
    <polygon points="143,54 144.8,58.2 149.4,58.4 145.8,61.2 147,65.6 143,63.1 139,65.6 140.2,61.2 136.6,58.4 141.2,58.2" fill="#fffbe0" opacity="0.85"/>
    <!-- Eyes on Gold -->
    <ellipse cx="138" cy="70" rx="2.7" ry="3.6" fill="#fff"/>
    <ellipse cx="148" cy="70" rx="2.7" ry="3.6" fill="#fff"/>
    <circle cx="138.6" cy="70.5" r="1.6" fill="#472800"/>
    <circle cx="148.6" cy="70.5" r="1.6" fill="#472800"/>
    <!-- Eyes on Red -->
    <ellipse cx="138" cy="103" rx="2.7" ry="3.6" fill="#fff"/>
    <ellipse cx="148" cy="103" rx="2.7" ry="3.6" fill="#fff"/>
    <circle cx="138.6" cy="103.5" r="1.6" fill="#2b0812"/>
    <circle cx="148.6" cy="103.5" r="1.6" fill="#2b0812"/>
  </g>

  <!-- Chain Sparkle Arc & Badge -->
  <g transform="translate(232, 92)">
    <rect x="0" y="0" width="76" height="30" rx="15" fill="#1e133b" stroke="#f5b82e" stroke-width="1.6"/>
    <text x="38" y="19" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="11.5" font-weight="800" fill="#ffe680">4 CHAIN!</text>
  </g>

  <!-- Decorative Floating Sparkle Orbs -->
  <circle cx="64" cy="126" r="5" fill="#ff7084" opacity="0.7"/>
  <circle cx="260" cy="138" r="4.5" fill="#7de4ff" opacity="0.75"/>
  <circle cx="74" cy="144" r="3" fill="#ffe36e" opacity="0.8"/>
</svg>`;
