// Bespoke cel-shaded Touhou Gensokyo Suika cover illustration (320x200)
// All SVG IDs are strictly sk-prefixed to avoid DOM collisions across game cards.
export const SUIKA_COVER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200">
  <defs>
    <linearGradient id="sk-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#170f2e"/>
      <stop offset="52%" stop-color="#27194c"/>
      <stop offset="100%" stop-color="#152635"/>
    </linearGradient>
    <radialGradient id="sk-glow" cx="50%" cy="62%" r="52%">
      <stop offset="0%" stop-color="#3ee686" stop-opacity="0.34"/>
      <stop offset="52%" stop-color="#f5c65b" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#170f2e" stop-opacity="0"/>
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
    <radialGradient id="sk-suika" cx="34%" cy="28%" r="72%">
      <stop offset="0%" stop-color="#7ef5b0"/>
      <stop offset="55%" stop-color="#28b365"/>
      <stop offset="100%" stop-color="#106134"/>
    </radialGradient>
    <linearGradient id="sk-suika-horn" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="#b85314"/>
      <stop offset="52%" stop-color="#f5a623"/>
      <stop offset="100%" stop-color="#fff5ba"/>
    </linearGradient>
    <radialGradient id="sk-reimu" cx="34%" cy="28%" r="72%">
      <stop offset="0%" stop-color="#ff8594"/>
      <stop offset="58%" stop-color="#e32940"/>
      <stop offset="100%" stop-color="#8a1023"/>
    </radialGradient>
    <radialGradient id="sk-marisa" cx="34%" cy="28%" r="72%">
      <stop offset="0%" stop-color="#615296"/>
      <stop offset="62%" stop-color="#271f47"/>
      <stop offset="100%" stop-color="#120d26"/>
    </radialGradient>
    <radialGradient id="sk-cirno" cx="34%" cy="28%" r="72%">
      <stop offset="0%" stop-color="#d9f9ff"/>
      <stop offset="56%" stop-color="#4bc2f7"/>
      <stop offset="100%" stop-color="#1c6ac9"/>
    </radialGradient>
    <radialGradient id="sk-flan" cx="34%" cy="28%" r="72%">
      <stop offset="0%" stop-color="#fff2b5"/>
      <stop offset="58%" stop-color="#ffcb57"/>
      <stop offset="100%" stop-color="#d9384e"/>
    </radialGradient>
    <clipPath id="sk-suika-clip">
      <circle cx="164" cy="134" r="46"/>
    </clipPath>
    <clipPath id="sk-reimu-clip">
      <circle cx="0" cy="0" r="27"/>
    </clipPath>
    <clipPath id="sk-marisa-clip">
      <circle cx="0" cy="0" r="28"/>
    </clipPath>
    <clipPath id="sk-cirno-clip">
      <circle cx="0" cy="0" r="17"/>
    </clipPath>
    <clipPath id="sk-flan-clip">
      <circle cx="0" cy="0" r="18"/>
    </clipPath>
  </defs>

  <!-- Twilight Gensokyo shrine backdrop -->
  <rect width="320" height="200" fill="url(#sk-bg)"/>
  <rect width="320" height="200" fill="url(#sk-glow)"/>

  <!-- Subtle Hakurei Yin-Yang magic circle watermark -->
  <g transform="translate(160, 118)" fill="none" stroke="#f5c65b" opacity="0.14">
    <circle r="60" stroke-width="1.2"/>
    <circle r="52" stroke-width="1" stroke-dasharray="4 5"/>
    <circle r="32" stroke-width="1.2"/>
    <path d="M0 -32 A16 16 0 0 1 0 0 A16 16 0 0 0 0 32" stroke-width="1.2"/>
    <circle cx="0" cy="-16" r="4.5" stroke-width="1"/>
    <circle cx="0" cy="16" r="4.5" stroke-width="1"/>
  </g>

  <!-- Starlight & notched sakura petals -->
  <g fill="#ffe694" opacity="0.88">
    <circle cx="32" cy="28" r="1.5"/>
    <circle cx="70" cy="18" r="1.2"/>
    <circle cx="256" cy="24" r="1.6"/>
    <circle cx="292" cy="48" r="1.3"/>
    <circle cx="44" cy="76" r="1.2"/>
    <path d="M278 20 l2 5 l5 2 l-5 2 l-2 5 l-2-5 l-5-2 l5-2z"/>
    <path d="M40 46 l1.6 3.8 l3.8 1.6 l-3.8 1.6 l-1.6 3.8 l-1.6-3.8 l-3.8-1.6 l3.8-1.6z"/>
  </g>
  <g fill="#ffb5cf" opacity="0.65">
    <path d="M58 50 c-4-3 -4-7 -1-8 l1 2 l1-2 c3 1 3 5 -1 8z" transform="rotate(-24 58 46)"/>
    <path d="M268 74 c-4-3 -4-7 -1-8 l1 2 l1-2 c3 1 3 5 -1 8z" transform="rotate(32 268 70)"/>
    <path d="M288 134 c-3.5-2.6 -3.5-6 -0.8-7 l0.8 1.8 l0.8-1.8 c2.7 1 2.7 4.4 -0.8 7z" transform="rotate(-38 288 130)"/>
  </g>

  <!-- Warm Crimson-Gold Lacquer Shrine Jar -->
  <rect x="64" y="42" width="192" height="146" rx="15" fill="#120c26" fill-opacity="0.68"/>
  <!-- U-shaped crimson lacquer frame + gold inlay -->
  <path d="M64 42 L64 173 Q64 188 79 188 L241 188 Q256 188 256 173 L256 42" fill="none" stroke="url(#sk-lacquer)" stroke-width="6.5" stroke-linecap="round"/>
  <path d="M64 42 L64 173 Q64 188 79 188 L241 188 Q256 188 256 173 L256 42" fill="none" stroke="url(#sk-gold)" stroke-width="1.7" stroke-linecap="round"/>
  <!-- Metallic gold bottom corner clasps -->
  <path d="M64 158 L64 173 Q64 188 79 188 L96 188" fill="none" stroke="url(#sk-gold)" stroke-width="5.2" stroke-linecap="butt"/>
  <path d="M256 158 L256 173 Q256 188 241 188 L224 188" fill="none" stroke="url(#sk-gold)" stroke-width="5.2" stroke-linecap="butt"/>
  <!-- Torii top pillar caps -->
  <rect x="57" y="38" width="14" height="5.5" rx="2" fill="url(#sk-gold)" stroke="#5c101d" stroke-width="0.9"/>
  <rect x="249" y="38" width="14" height="5.5" rx="2" fill="url(#sk-gold)" stroke="#5c101d" stroke-width="0.9"/>
  <!-- Danger dashed talisman line -->
  <line x1="72" y1="62" x2="248" y2="62" stroke="#ff6680" stroke-width="1.3" stroke-dasharray="5 5" opacity="0.58"/>

  <!-- Dotted golden drop guide & fluffy Kedama orb -->
  <line x1="160" y1="26" x2="160" y2="82" stroke="#ffe169" stroke-width="1.5" stroke-dasharray="3 4" opacity="0.72"/>
  <g transform="translate(160, 21)">
    <g fill="#fffdf9" stroke="#a696cc" stroke-width="0.9">
      <circle cx="-8.5" cy="-4.5" r="3.8"/>
      <circle cx="8.5" cy="-4.5" r="3.8"/>
      <circle cx="-9" cy="4" r="3.6"/>
      <circle cx="9" cy="4" r="3.6"/>
      <circle cx="0" cy="-9" r="3.8"/>
    </g>
    <circle r="11" fill="#fffdf9" stroke="#c8bbe6" stroke-width="1.3"/>
    <ellipse cx="-3.5" cy="-4" rx="3.4" ry="1.5" transform="rotate(-25 -3.5 -4)" fill="#ffffff" opacity="0.7"/>
    <circle cx="-3.4" cy="0" r="1.45" fill="#3b2b5e"/>
    <circle cx="3.4" cy="0" r="1.45" fill="#3b2b5e"/>
    <circle cx="-3.9" cy="-0.5" r="0.5" fill="#ffffff"/>
    <circle cx="2.9" cy="-0.5" r="0.5" fill="#ffffff"/>
    <ellipse cx="-6" cy="2.6" rx="2.1" ry="1.1" fill="#ff96b2" opacity="0.72"/>
    <ellipse cx="6" cy="2.6" rx="2.1" ry="1.1" fill="#ff96b2" opacity="0.72"/>
    <path d="M-2.2 2.4 Q-1.1 4 0 2.4 Q1.1 4 2.2 2.4" fill="none" stroke="#3b2b5e" stroke-width="1.15" stroke-linecap="round"/>
  </g>

  <!-- Cirno orb (upper-left inside jar) -->
  <g transform="translate(101, 102)">
    <!-- 6 faceted ice crystal wings -->
    <g fill="#8ef2ff" stroke="#1b5eb8" stroke-width="0.8">
      <polygon points="-14,-5 -27,-13 -21,-2"/>
      <polygon points="-15,0 -29,0 -21,4"/>
      <polygon points="-14,5 -26,11 -20,1"/>
      <polygon points="14,-5 27,-13 21,-2"/>
      <polygon points="15,0 29,0 21,4"/>
      <polygon points="14,5 26,11 20,1"/>
    </g>
    <circle r="17" fill="url(#sk-cirno)" stroke="#dcf8ff" stroke-width="1.4"/>
    <g clip-path="url(#sk-cirno-clip)">
      <path d="M-19 -19 L19 -19 L18 -1 L11 -6 L5 -3 L0 -7 L-5 -3 L-11 -6 L-18 -1 Z" fill="#46b2ff" stroke="#15366e" stroke-width="0.8"/>
      <ellipse cx="-6" cy="-7" rx="5.5" ry="2.4" transform="rotate(-28 -6 -7)" fill="#ffffff" opacity="0.45"/>
    </g>
    <path d="M0 -15 L-9 -21 L-7 -12 Z M0 -15 L9 -21 L7 -12 Z" fill="#1f64db" stroke="#d6f8ff" stroke-width="0.8"/>
    <circle cx="0" cy="-15" r="2.2" fill="#1f64db" stroke="#d6f8ff" stroke-width="0.7"/>
    <circle cx="-5.2" cy="1" r="2.3" fill="#123d87"/>
    <circle cx="5.2" cy="1" r="2.3" fill="#123d87"/>
    <circle cx="-6" cy="0.2" r="0.85" fill="#ffffff"/>
    <circle cx="4.4" cy="0.2" r="0.85" fill="#ffffff"/>
    <path d="M-3.5 5.2 Q0 9 3.5 5.2 Z" fill="#ff7392" stroke="#15366e" stroke-width="1.1"/>
  </g>

  <!-- Flandre orb (upper-right inside jar) -->
  <g transform="translate(226, 102)">
    <!-- Rainbow crystal wing gems -->
    <path d="M-13 -2 Q-22 -12 -24 2 M13 -2 Q22 -12 24 2" fill="none" stroke="#30182d" stroke-width="1.6" stroke-linecap="round"/>
    <polygon points="-20,-10 -18,-7 -20,-4 -22,-7" fill="#ff3b5c" stroke="#fff" stroke-width="0.5"/>
    <polygon points="-24,-4 -22,-1 -24,2 -26,-1" fill="#ffe047" stroke="#fff" stroke-width="0.5"/>
    <polygon points="20,-10 22,-7 20,-4 18,-7" fill="#38d9ff" stroke="#fff" stroke-width="0.5"/>
    <polygon points="24,-4 26,-1 24,2 22,-1" fill="#a84dff" stroke="#fff" stroke-width="0.5"/>
    <circle r="18" fill="url(#sk-flan)" stroke="#fff2b5" stroke-width="1.4"/>
    <g clip-path="url(#sk-flan-clip)">
      <path d="M-20 -20 L20 -20 L19 -1 L11 -6 L5 -3 L0 -7 L-5 -3 L-11 -6 L-19 -1 Z" fill="#ffe073" stroke="#4a1426" stroke-width="0.8"/>
      <ellipse cx="-6" cy="-7" rx="5.5" ry="2.4" transform="rotate(-28 -6 -7)" fill="#ffffff" opacity="0.45"/>
    </g>
    <circle cx="-5.5" cy="1" r="2.3" fill="#c9183c"/>
    <circle cx="5.5" cy="1" r="2.3" fill="#c9183c"/>
    <circle cx="-6.2" cy="0.2" r="0.85" fill="#ffffff"/>
    <circle cx="4.8" cy="0.2" r="0.85" fill="#ffffff"/>
    <path d="M-4 5.5 Q0 8.5 4 5.5" fill="none" stroke="#4a1426" stroke-width="1.3" stroke-linecap="round"/>
    <polygon points="1,6.4 3,6.1 2.2,8.4" fill="#ffffff"/>
  </g>

  <!-- Marisa orb (bottom-left) -->
  <g transform="translate(104, 150)">
    <!-- Golden side curls -->
    <path d="M-22 -4 Q-32 4 -29 18 Q-23 19 -20 10 Z" fill="#ffd95c" stroke="#1b1336" stroke-width="1"/>
    <path d="M22 -4 Q32 4 29 18 Q23 19 20 10 Z" fill="#ffd95c" stroke="#1b1336" stroke-width="1"/>
    <circle r="28" fill="url(#sk-marisa)" stroke="#ffd966" stroke-width="1.6"/>
    <g clip-path="url(#sk-marisa-clip)">
      <!-- Blonde bangs -->
      <path d="M-30 -30 L30 -30 L28 3 L19 -7 L10 -5 L0 -12 L-10 -5 L-19 -7 L-28 3 Z" fill="#ffe073" stroke="#1a1233" stroke-width="1"/>
      <ellipse cx="-10" cy="-11" rx="9" ry="4" transform="rotate(-28 -10 -11)" fill="#ffffff" opacity="0.34"/>
      <!-- Glowing Mini-Hakkero star -->
      <path d="M14 10 l1.8 4 l4 1.8 l-4 1.8 l-1.8 4 l-1.8-4 l-4-1.8 l4-1.8z" fill="#ffe46b"/>
    </g>
    <!-- Jaunty witch hat -->
    <g transform="translate(0,-22) rotate(-7)">
      <ellipse cx="0" cy="0" rx="26" ry="6.2" fill="#1b1533" stroke="#ffd966" stroke-width="1.1"/>
      <path d="M-14 -1 Q-4 -23 16 -16 Q9 -9 14 -1 Z" fill="#271e4a" stroke="#ffd966" stroke-width="1.1"/>
      <path d="M-12 -1 Q0 2 12 -1" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      <path d="M-5 -10 l1.3 2.8 l2.8 1.3 l-2.8 1.3 l-1.3 2.8 l-1.3-2.8 l-2.8-1.3 l2.8-1.3z" fill="#ffe46b"/>
    </g>
    <!-- Eye & cheerful Marisa wink -->
    <circle cx="-8.5" cy="1" r="3.4" fill="#ffd959"/>
    <circle cx="-9.5" cy="0" r="1.2" fill="#ffffff"/>
    <path d="M5 -0.8 L11 1.2 L5 3.4" fill="none" stroke="#ffe46b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <ellipse cx="-13" cy="6.5" rx="3.4" ry="1.8" fill="#ff85a8" opacity="0.65"/>
    <ellipse cx="13" cy="6.5" rx="3.4" ry="1.8" fill="#ff85a8" opacity="0.65"/>
    <path d="M-5 7.5 Q0 13 5 7.5 Z" fill="#ff7392" stroke="#ffe46b" stroke-width="1.4"/>
  </g>

  <!-- Reimu orb (bottom-right) -->
  <g transform="translate(222, 150)">
    <!-- Sweeping giant Hakurei shrine bow -->
    <path d="M0 -23 Q-17 -38 -31 -25 L-24 -11 Q-12 -18 0 -20 Z" fill="#e3223b" stroke="#fff5e6" stroke-width="1.2"/>
    <path d="M0 -23 Q17 -38 31 -25 L24 -11 Q12 -18 0 -20 Z" fill="#e3223b" stroke="#fff5e6" stroke-width="1.2"/>
    <circle r="27" fill="url(#sk-reimu)" stroke="#fff5e6" stroke-width="1.6"/>
    <g clip-path="url(#sk-reimu-clip)">
      <!-- Chestnut-black bangs -->
      <path d="M-29 -29 L29 -29 L27 5 L18 -7 L9 -5 L0 -9 L-9 -5 L-18 -7 L-27 5 Z" fill="#3a1e26" stroke="#1c0b10" stroke-width="1"/>
      <ellipse cx="-9" cy="-10" rx="8.5" ry="3.8" transform="rotate(-28 -9 -10)" fill="#ffffff" opacity="0.34"/>
      <!-- White shrine sash & mini Yin-Yang badge -->
      <path d="M-16 26 Q0 14 16 26 Z" fill="#fff8f0"/>
      <circle cx="13" cy="12" r="5" fill="#ffffff" stroke="#8a1023" stroke-width="0.9"/>
      <path d="M13 7 A5 5 0 0 1 13 17 A2.5 2.5 0 0 1 13 12 A2.5 2.5 0 0 0 13 7 Z" fill="#db1f38"/>
    </g>
    <!-- Bow knot & twin white hair tubes -->
    <circle cx="0" cy="-23" r="4.5" fill="#fff8f0" stroke="#db1f38" stroke-width="1"/>
    <rect x="-22" y="-5" width="4.2" height="10" rx="1.5" fill="#fffcf7" stroke="#db1f38" stroke-width="0.9"/>
    <rect x="17.8" y="-5" width="4.2" height="10" rx="1.5" fill="#fffcf7" stroke="#db1f38" stroke-width="0.9"/>
    <!-- Expressive anime eyes -->
    <ellipse cx="-8" cy="1.2" rx="3.1" ry="3.5" fill="#591020"/>
    <ellipse cx="8" cy="1.2" rx="3.1" ry="3.5" fill="#591020"/>
    <circle cx="-9" cy="0" r="1.2" fill="#ffffff"/>
    <circle cx="7" cy="0" r="1.2" fill="#ffffff"/>
    <ellipse cx="-13" cy="6" rx="3.2" ry="1.7" fill="#ff9eb5" opacity="0.7"/>
    <ellipse cx="13" cy="6" rx="3.2" ry="1.7" fill="#ff9eb5" opacity="0.7"/>
    <path d="M-4 7 Q0 10.5 4 7" fill="none" stroke="#3b0c18" stroke-width="1.6" stroke-linecap="round"/>
  </g>

  <!-- Centerpiece: Giant Ibuki Suika (Cel-Shaded Watermelon Oni!) -->
  <g>
    <!-- Festive golden-jade sake aura -->
    <circle cx="164" cy="134" r="54" fill="#3ee686" opacity="0.16"/>
    <circle cx="164" cy="134" r="50" fill="none" stroke="#ffe470" stroke-width="1.2" stroke-dasharray="6 6" opacity="0.45"/>

    <!-- Sculpted curved golden Oni Horns -->
    <path d="M139 98 Q116 74 128 56 Q142 74 149 92 Z" fill="url(#sk-suika-horn)" stroke="#4a1d08" stroke-width="1.4"/>
    <path d="M189 98 Q212 74 200 56 Q186 74 179 92 Z" fill="url(#sk-suika-horn)" stroke="#4a1d08" stroke-width="1.4"/>
    <!-- Horn Ribbons (red & purple) -->
    <path d="M142 95 L133 90 L135 98 Z M142 95 L150 91 L148 99 Z" fill="#e62e49" stroke="#ffe470" stroke-width="0.9"/>
    <circle cx="142" cy="95" r="3" fill="#e62e49" stroke="#ffe470" stroke-width="0.8"/>
    <path d="M186 95 L178 91 L180 99 Z M186 95 L195 90 L193 98 Z" fill="#8b46eb" stroke="#ffe470" stroke-width="0.9"/>
    <circle cx="186" cy="95" r="3" fill="#8b46eb" stroke="#ffe470" stroke-width="0.8"/>

    <!-- Main glossy Watermelon Orb -->
    <circle cx="164" cy="134" r="46" fill="url(#sk-suika)" stroke="#ffe470" stroke-width="2.4"/>
    <g clip-path="url(#sk-suika-clip)">
      <!-- Double-tone wavy watermelon stripes -->
      <g fill="none" stroke="#0c542b" stroke-width="8" stroke-linecap="round" opacity="0.68">
        <path d="M131 84 Q121 108 133 134 Q123 160 133 184"/>
        <path d="M164 84 Q156 108 166 134 Q158 160 164 184"/>
        <path d="M197 84 Q207 108 195 134 Q205 160 195 184"/>
      </g>
      <!-- Energetic ginger-orange spiky anime bangs -->
      <path d="M114 84 L214 84 L208 119 L192 110 L181 122 L172 112 L164 124 L156 112 L147 122 L136 110 L120 119 Z" fill="#ff944d" stroke="#52200a" stroke-width="1.3" stroke-linejoin="round"/>
      <!-- Cel-shaded glossy highlight crescent -->
      <ellipse cx="147" cy="112" rx="16" ry="7.5" transform="rotate(-28 147 112)" fill="#ffffff" opacity="0.4"/>
      <!-- Lower bounce light rim -->
      <path d="M132 168 A41 41 0 0 0 196 168" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity="0.28"/>
    </g>

    <!-- Brow charm chain (Red Circle, Gold Triangle, Blue Square) -->
    <path d="M145 106 Q164 111 183 106" fill="none" stroke="#ffe470" stroke-width="1.4"/>
    <circle cx="152" cy="108" r="3.2" fill="#ff4d6d" stroke="#4a121f" stroke-width="0.9"/>
    <polygon points="164,104.5 167.8,111 160.2,111" fill="#ffe46b" stroke="#4a121f" stroke-width="0.9"/>
    <rect x="172.5" y="105" width="5.8" height="5.8" fill="#52d6ff" stroke="#4a121f" stroke-width="0.9"/>

    <!-- Expressive joyful Suika anime face -->
    <ellipse cx="148" cy="135" rx="5.6" ry="6.2" fill="#fffcfc"/>
    <ellipse cx="180" cy="135" rx="5.6" ry="6.2" fill="#fffcfc"/>
    <ellipse cx="148" cy="135" rx="4.9" ry="5.6" fill="#4f1e10"/>
    <ellipse cx="180" cy="135" rx="4.9" ry="5.6" fill="#4f1e10"/>
    <circle cx="146" cy="132.5" r="2.2" fill="#ffffff"/>
    <circle cx="178" cy="132.5" r="2.2" fill="#ffffff"/>
    <circle cx="150" cy="137.5" r="1.2" fill="#ffe46b"/>
    <circle cx="182" cy="137.5" r="1.2" fill="#ffe46b"/>
    <ellipse cx="135" cy="144" rx="6.2" ry="3.3" fill="#ff7392" opacity="0.74"/>
    <ellipse cx="193" cy="144" rx="6.2" ry="3.3" fill="#ff7392" opacity="0.74"/>
    <path d="M154 145 Q164 159 174 145 Z" fill="#ff5e78" stroke="#3b180e" stroke-width="1.8" stroke-linejoin="round"/>
    <ellipse cx="164" cy="151" rx="4.6" ry="2.2" fill="#ff9bb0"/>
  </g>
</svg>`;
