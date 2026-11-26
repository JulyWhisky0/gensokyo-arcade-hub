export const puyoCoverSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200">
  <defs>
    <linearGradient id="puyo-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0d0921"/>
      <stop offset="48%" stop-color="#171138"/>
      <stop offset="82%" stop-color="#201644"/>
      <stop offset="100%" stop-color="#19243d"/>
    </linearGradient>
    <radialGradient id="puyo-moon-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fff0b5" stop-opacity="0.72"/>
      <stop offset="52%" stop-color="#f5b82e" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#f5b82e" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="puyo-hakkero-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#f5c859" stop-opacity="0.22"/>
      <stop offset="60%" stop-color="#9b4ee6" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#9b4ee6" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="puyo-red" cx="34%" cy="28%" r="70%">
      <stop offset="0%" stop-color="#ffa8b6"/>
      <stop offset="42%" stop-color="#e53950"/>
      <stop offset="100%" stop-color="#871024"/>
    </radialGradient>
    <radialGradient id="puyo-blue" cx="34%" cy="28%" r="70%">
      <stop offset="0%" stop-color="#b5f0ff"/>
      <stop offset="42%" stop-color="#1ea7f2"/>
      <stop offset="100%" stop-color="#0b4e8c"/>
    </radialGradient>
    <radialGradient id="puyo-gold" cx="34%" cy="28%" r="70%">
      <stop offset="0%" stop-color="#fff6b8"/>
      <stop offset="42%" stop-color="#f2b724"/>
      <stop offset="100%" stop-color="#995b05"/>
    </radialGradient>
    <radialGradient id="puyo-green" cx="34%" cy="28%" r="70%">
      <stop offset="0%" stop-color="#b0fcd6"/>
      <stop offset="42%" stop-color="#24bd6b"/>
      <stop offset="100%" stop-color="#096232"/>
    </radialGradient>
    <radialGradient id="puyo-purple" cx="34%" cy="28%" r="70%">
      <stop offset="0%" stop-color="#ebcaff"/>
      <stop offset="42%" stop-color="#9b4ee6"/>
      <stop offset="100%" stop-color="#4b1786"/>
    </radialGradient>
    <linearGradient id="puyo-frame-gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffe28a"/>
      <stop offset="45%" stop-color="#e03e52"/>
      <stop offset="75%" stop-color="#9b4ee6"/>
      <stop offset="100%" stop-color="#f5c259"/>
    </linearGradient>
    <linearGradient id="puyo-spell-ribbon" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#28081e" stop-opacity="0"/>
      <stop offset="18%" stop-color="#5c102e" stop-opacity="0.92"/>
      <stop offset="52%" stop-color="#2b1047" stop-opacity="0.94"/>
      <stop offset="86%" stop-color="#4a112c" stop-opacity="0.88"/>
      <stop offset="100%" stop-color="#1b0a33" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="puyo-spell-trim" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#f5c859" stop-opacity="0"/>
      <stop offset="22%" stop-color="#ffe282"/>
      <stop offset="55%" stop-color="#ff4d6d"/>
      <stop offset="84%" stop-color="#ffe282"/>
      <stop offset="100%" stop-color="#f5c859" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="puyo-firefly" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fff8cc" stop-opacity="0.95"/>
      <stop offset="45%" stop-color="#f5b82e" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#f5b82e" stop-opacity="0"/>
    </radialGradient>
    <filter id="puyo-soft-glow" x="-24%" y="-24%" width="148%" height="148%">
      <feGaussianBlur stdDeviation="2.4" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Starry Forest of Magic Twilight Sky -->
  <rect width="320" height="200" fill="url(#puyo-bg)"/>

  <!-- Crescent Moon & Halo -->
  <circle cx="268" cy="40" r="48" fill="url(#puyo-moon-glow)"/>
  <path d="M272 18 A21 21 0 1 0 285 55 A16 16 0 1 1 272 18 Z" fill="#fff4c4" opacity="0.94"/>

  <!-- Forest Silhouette & Mist -->
  <path d="M0 164 L20 120 L38 150 L58 110 L78 156 L102 128 L122 168 L196 168 L222 118 L244 154 L268 108 L292 148 L320 122 L320 200 L0 200 Z" fill="#0f0b24" opacity="0.82"/>
  <path d="M0 178 Q80 162 160 176 Q240 190 320 172 L320 200 L0 200 Z" fill="#0b091c"/>

  <!-- Twinkling Stars & 4-Point Sparkles -->
  <g fill="#fff0b8" opacity="0.88">
    <circle cx="32" cy="28" r="1.5"/>
    <circle cx="70" cy="50" r="1.2"/>
    <circle cx="112" cy="22" r="1.6"/>
    <circle cx="208" cy="28" r="1.4"/>
    <circle cx="298" cy="76" r="1.5"/>
    <circle cx="46" cy="84" r="1.1"/>
  </g>
  <path d="M52 44 L54.1 49.9 L60 52 L54.1 54.1 L52 60 L49.9 54.1 L44 52 L49.9 49.9 Z" fill="#ffe892" opacity="0.92"/>
  <path d="M240 66 L241.6 70.4 L246 72 L241.6 73.6 L240 78 L238.4 73.6 L234 72 L238.4 70.4 Z" fill="#a8eeff" opacity="0.88"/>

  <!-- Marisa Witch Hat Emblem -->
  <g transform="translate(20, 18) rotate(-14)" opacity="0.9">
    <ellipse cx="22" cy="30" rx="26" ry="6.5" fill="#191330" stroke="#f5c259" stroke-width="1.4"/>
    <path d="M8 29 L21 4 L34 29 Z" fill="#1d1638" stroke="#f5c259" stroke-width="1.3"/>
    <path d="M11 25 Q22 29 33 25" fill="none" stroke="#fff4fa" stroke-width="2.4" stroke-linecap="round"/>
    <polygon points="22,12 23.6,16 28,16 24.5,18.5 25.8,22.5 22,20 18.2,22.5 19.5,18.5 16,16 20.4,16" fill="#ffe57a"/>
  </g>

  <!-- Ornate Spellbook Board Frame -->
  <rect x="84" y="16" width="152" height="170" rx="13" fill="url(#puyo-frame-gold)"/>
  <rect x="87" y="19" width="146" height="164" rx="10" fill="#110c28"/>
  <rect x="90" y="22" width="140" height="158" rx="8" fill="none" stroke="#f5c859" stroke-opacity="0.32" stroke-width="1"/>

  <!-- Marisa Hakkero Magic Circle Watermark inside Board -->
  <g transform="translate(160, 102)" opacity="0.42">
    <circle r="56" fill="url(#puyo-hakkero-glow)"/>
    <circle r="44" fill="none" stroke="#f5c859" stroke-width="1" stroke-opacity="0.55"/>
    <circle r="38" fill="none" stroke="#f5c859" stroke-width="0.9" stroke-dasharray="3 4" stroke-opacity="0.45"/>
    <polygon points="0,-34 24,-24 34,0 24,24 0,34 -24,24 -34,0 -24,-24" fill="none" stroke="#ffe18c" stroke-width="0.95" stroke-opacity="0.5"/>
    <polygon points="0,-24 6,-6 24,0 6,6 0,24 -6,6 -24,0 -6,-6" fill="none" stroke="#ffe18c" stroke-width="0.9" stroke-opacity="0.48"/>
  </g>

  <!-- Subtle Shrine Lattice & Crimson Death Seal X -->
  <g stroke="#f5c859" stroke-opacity="0.08" stroke-width="1">
    <line x1="125" y1="22" x2="125" y2="180"/>
    <line x1="160" y1="22" x2="160" y2="180"/>
    <line x1="195" y1="22" x2="195" y2="180"/>
    <line x1="90" y1="62" x2="230" y2="62"/>
    <line x1="90" y1="101" x2="230" y2="101"/>
    <line x1="90" y1="140" x2="230" y2="140"/>
  </g>
  <g transform="translate(142, 40)" opacity="0.72">
    <circle r="9.5" fill="none" stroke="#ff5270" stroke-width="1.2" stroke-dasharray="3 2"/>
    <line x1="-4.5" y1="-4.5" x2="4.5" y2="4.5" stroke="#ff6b85" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="4.5" y1="-4.5" x2="-4.5" y2="4.5" stroke="#ff6b85" stroke-width="1.8" stroke-linecap="round"/>
  </g>

  <!-- Fused Red Reimu Concave Metaball Duo (bottom-left) -->
  <g filter="url(#puyo-soft-glow)">
    <!-- Unified dark rim silhouette + concave bezier bridge -->
    <circle cx="109" cy="157" r="17.8" fill="#590916"/>
    <circle cx="143" cy="157" r="17.8" fill="#590916"/>
    <path d="M114 140.4 Q126 149.2 138 140.4 L138 173.6 Q126 164.8 114 173.6 Z" fill="#590916"/>
    <!-- Seamless fused translucent red gel body + concave waist -->
    <circle cx="109" cy="157" r="16" fill="url(#puyo-red)"/>
    <circle cx="143" cy="157" r="16" fill="url(#puyo-red)"/>
    <path d="M113.5 142.2 Q126 150.6 138.5 142.2 L138.5 171.8 Q126 163.4 113.5 171.8 Z" fill="#e53950"/>
    <!-- Shared specular bridge shimmer + crisp crescent gel highlights -->
    <path d="M115 150 Q126 153 137 150" fill="none" stroke="#ffffff" stroke-opacity="0.38" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M97 153 A12.5 12.5 0 0 1 107 144.5 Q102.5 149.5 97 153 Z" fill="#ffffff" opacity="0.76"/>
    <path d="M131 153 A12.5 12.5 0 0 1 141 144.5 Q136.5 149.5 131 153 Z" fill="#ffffff" opacity="0.76"/>
    <!-- Reimu Yin-Yang inner motifs -->
    <g transform="translate(109, 149.5)" opacity="0.78">
      <circle r="3.4" fill="#fff5f7"/>
      <path d="M0 -3.4 A3.4 3.4 0 0 1 0 3.4 A1.7 1.7 0 0 1 0 0 A1.7 1.7 0 0 0 0 -3.4 Z" fill="#750c1d"/>
    </g>
    <g transform="translate(143, 149.5)" opacity="0.78">
      <circle r="3.4" fill="#fff5f7"/>
      <path d="M0 -3.4 A3.4 3.4 0 0 1 0 3.4 A1.7 1.7 0 0 1 0 0 A1.7 1.7 0 0 0 0 -3.4 Z" fill="#750c1d"/>
    </g>
    <!-- Expressive eyes -->
    <ellipse cx="104" cy="159" rx="2.7" ry="3.6" fill="#fff"/>
    <ellipse cx="114" cy="159" rx="2.7" ry="3.6" fill="#fff"/>
    <circle cx="104.6" cy="159.5" r="1.6" fill="#3b0918"/>
    <circle cx="114.6" cy="159.5" r="1.6" fill="#3b0918"/>
    <circle cx="103.8" cy="158.3" r="0.75" fill="#fff"/>
    <circle cx="113.8" cy="158.3" r="0.75" fill="#fff"/>
    <ellipse cx="138" cy="159" rx="2.7" ry="3.6" fill="#fff"/>
    <ellipse cx="148" cy="159" rx="2.7" ry="3.6" fill="#fff"/>
    <circle cx="138.6" cy="159.5" r="1.6" fill="#3b0918"/>
    <circle cx="148.6" cy="159.5" r="1.6" fill="#3b0918"/>
    <circle cx="137.8" cy="158.3" r="0.75" fill="#fff"/>
    <circle cx="147.8" cy="158.3" r="0.75" fill="#fff"/>
  </g>

  <!-- Green Sanae Puyo (Wind Pinwheel motif + happy eyes) -->
  <g>
    <circle cx="177" cy="157" r="16" fill="url(#puyo-green)" stroke="#063d20" stroke-width="1.8"/>
    <path d="M165 153 A12.5 12.5 0 0 1 175 144.5 Q170.5 149.5 165 153 Z" fill="#ffffff" opacity="0.74"/>
    <!-- 4-blade Wind Pinwheel -->
    <g transform="translate(177, 149.5)" fill="#dcffeb" opacity="0.78">
      <path d="M0 0 Q3 -1.2 4 -3.6 Q1 -4 0 0 Z"/>
      <path d="M0 0 Q1.2 3 3.6 4 Q4 1 0 0 Z"/>
      <path d="M0 0 Q-3 1.2 -4 3.6 Q-1 4 0 0 Z"/>
      <path d="M0 0 Q-1.2 -3 -3.6 -4 Q-4 -1 0 0 Z"/>
    </g>
    <path d="M169.5 159 Q172.3 155.5 175 159" fill="none" stroke="#06331b" stroke-width="2" stroke-linecap="round"/>
    <path d="M179 159 Q181.7 155.5 184.5 159" fill="none" stroke="#06331b" stroke-width="2" stroke-linecap="round"/>
  </g>

  <!-- Purple Patchouli Puyo (Crescent Moon motif) -->
  <g>
    <circle cx="211" cy="157" r="16" fill="url(#puyo-purple)" stroke="#2f0c57" stroke-width="1.8"/>
    <path d="M199 153 A12.5 12.5 0 0 1 209 144.5 Q204.5 149.5 199 153 Z" fill="#ffffff" opacity="0.72"/>
    <path d="M212.5 146.3 A3.6 3.6 0 1 0 212.5 153 A2.8 2.8 0 1 1 212.5 146.3 Z" fill="#f5e0ff" opacity="0.82"/>
    <ellipse cx="206" cy="159" rx="2.6" ry="3.3" fill="#fff"/>
    <ellipse cx="216" cy="159" rx="2.6" ry="3.3" fill="#fff"/>
    <circle cx="206.5" cy="159.6" r="1.5" fill="#2e0b4f"/>
    <circle cx="216.5" cy="159.6" r="1.5" fill="#2e0b4f"/>
    <line x1="203.2" y1="156.5" x2="208.8" y2="156.5" stroke="#2f0c57" stroke-width="1.3" stroke-linecap="round"/>
    <line x1="213.2" y1="156.5" x2="218.8" y2="156.5" stroke="#2f0c57" stroke-width="1.3" stroke-linecap="round"/>
  </g>

  <!-- Blue Cirno Ice Crystal Puyo (vertical fused look on row above) -->
  <g>
    <circle cx="177" cy="123" r="16" fill="url(#puyo-blue)" stroke="#07325c" stroke-width="1.8"/>
    <path d="M165 119 A12.5 12.5 0 0 1 175 110.5 Q170.5 115.5 165 119 Z" fill="#ffffff" opacity="0.78"/>
    <g transform="translate(177, 115.5)" stroke="#e6fbff" stroke-width="1.2" stroke-linecap="round" opacity="0.82">
      <line x1="-3.8" y1="0" x2="3.8" y2="0"/>
      <line x1="-1.9" y1="-3.3" x2="1.9" y2="3.3"/>
      <line x1="1.9" y1="-3.3" x2="-1.9" y2="3.3"/>
    </g>
    <ellipse cx="172" cy="125" rx="2.7" ry="3.5" fill="#fff"/>
    <ellipse cx="182" cy="125" rx="2.7" ry="3.5" fill="#fff"/>
    <circle cx="172.5" cy="125.6" r="1.6" fill="#062c52"/>
    <circle cx="182.5" cy="125.6" r="1.6" fill="#062c52"/>
  </g>

  <!-- Active Falling Marisa Gold + Reimu Red Pair -->
  <g filter="url(#puyo-soft-glow)">
    <line x1="143" y1="59" x2="143" y2="93" stroke="#fff0b8" stroke-opacity="0.45" stroke-width="3.6" stroke-linecap="round"/>
    <!-- Gold Marisa Star Puyo -->
    <circle cx="143" cy="59" r="16.2" fill="url(#puyo-gold)" stroke="#5c3600" stroke-width="1.8"/>
    <path d="M131 55 A12.5 12.5 0 0 1 141 46.5 Q136.5 51.5 131 55 Z" fill="#ffffff" opacity="0.8"/>
    <polygon points="143,47 144.4,50.5 148.2,50.7 145.2,53 146.2,56.5 143,54.5 139.8,56.5 140.8,53 137.8,50.7 141.6,50.5" fill="#fffce0" opacity="0.9"/>
    <ellipse cx="138" cy="61" rx="2.7" ry="3.6" fill="#fff"/>
    <ellipse cx="148" cy="61" rx="2.7" ry="3.6" fill="#fff"/>
    <circle cx="138.6" cy="61.6" r="1.6" fill="#4a2600"/>
    <circle cx="148.6" cy="61.6" r="1.6" fill="#4a2600"/>
    <!-- Red Reimu Pivot Puyo with dashed golden axis ring -->
    <circle cx="143" cy="93" r="19" fill="none" stroke="#ffe694" stroke-width="1.4" stroke-dasharray="5 3" opacity="0.85"/>
    <circle cx="143" cy="93" r="16.2" fill="url(#puyo-red)" stroke="#590916" stroke-width="1.8"/>
    <path d="M131 89 A12.5 12.5 0 0 1 141 80.5 Q136.5 85.5 131 89 Z" fill="#ffffff" opacity="0.78"/>
    <ellipse cx="138" cy="95" rx="2.7" ry="3.6" fill="#fff"/>
    <ellipse cx="148" cy="95" rx="2.7" ry="3.6" fill="#fff"/>
    <circle cx="138.6" cy="95.6" r="1.6" fill="#3b0918"/>
    <circle cx="148.6" cy="95.6" r="1.6" fill="#3b0918"/>
  </g>

  <!-- Sleek Diagonal Crimson/Gold Touhou Spell Card Cut-in Ribbon -->
  <g transform="translate(160, 102) rotate(-6.5)">
    <rect x="-152" y="-16" width="304" height="32" fill="url(#puyo-spell-ribbon)"/>
    <rect x="-152" y="-16" width="304" height="2.2" fill="url(#puyo-spell-trim)"/>
    <rect x="-152" y="13.8" width="304" height="2.2" fill="url(#puyo-spell-trim)"/>
    <text x="68" y="-3" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="7.5" font-weight="800" fill="#ffe699" letter-spacing="0.8">✦ 4 CHAIN SPELL ✦</text>
    <text x="68" y="9" text-anchor="middle" font-family="serif" font-size="10.5" font-weight="900" fill="#fffdf5">灵符「梦想封印」</text>
  </g>

  <!-- Drifting Golden Magic Fireflies -->
  <circle cx="58" cy="128" r="8" fill="url(#puyo-firefly)"/>
  <circle cx="266" cy="136" r="7.5" fill="url(#puyo-firefly)"/>
  <circle cx="72" cy="152" r="5" fill="url(#puyo-firefly)"/>
  <circle cx="250" cy="86" r="5.5" fill="url(#puyo-firefly)"/>
</svg>`;
