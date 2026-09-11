// Campaign Data Service with Rich Presets & LocalStorage Persistence

// Security Utilities (Anti-XSS, URL Sanitization & Input Validation)
const SecurityUtils = {
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\//g, '&#x2F;');
  },
  
  sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return '#';
    const trimmed = url.trim();
    if (/^(https?:\/\/|\/|#|data:image\/(png|jpeg|jpg|webp|svg\+xml)[;,])/i.test(trimmed)) {
      return trimmed;
    }
    return '#';
  },

  validateImageFile(file) {
    if (!file) return { valid: false, error: 'No file selected.' };
    const maxSizeBytes = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSizeBytes) {
      return { valid: false, error: 'File size exceeds 5MB limit. Please upload a smaller image.' };
    }
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      return { valid: false, error: 'Invalid file type. Only PNG, JPG, and WebP images are allowed.' };
    }
    return { valid: true };
  }
};

const escapeHtml = (str) => SecurityUtils.escapeHtml(str);
const sanitizeUrl = (url) => SecurityUtils.sanitizeUrl(url);

const PRESET_FRAMES = {
  graduation: `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
  <defs>
    <linearGradient id="gradGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a"/>
      <stop offset="50%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.35"/>
    </filter>
    <mask id="gradHole">
      <rect width="1000" height="1000" fill="white"/>
      <circle cx="500" cy="500" r="380" fill="black"/>
    </mask>
  </defs>

  <!-- Outer Frame with Hole Mask -->
  <rect width="1000" height="1000" fill="url(#gradGrad)" mask="url(#gradHole)"/>
  
  <!-- Subtle inner background patterns -->
  <g mask="url(#gradHole)" opacity="0.15">
    <circle cx="100" cy="100" r="180" fill="none" stroke="#fff" stroke-width="40"/>
    <circle cx="900" cy="900" r="180" fill="none" stroke="#fff" stroke-width="40"/>
  </g>

  <!-- Golden Ring around photo hole -->
  <circle cx="500" cy="500" r="382" fill="none" stroke="url(#goldGrad)" stroke-width="14" filter="url(#shadow)"/>
  <circle cx="500" cy="500" r="370" fill="none" stroke="#ffffff" stroke-width="3" stroke-dasharray="8 6"/>

  <!-- Corner Golden Accents -->
  <path d="M 60 120 L 120 60 L 220 60 L 60 220 Z" fill="url(#goldGrad)"/>
  <path d="M 940 120 L 880 60 L 780 60 L 940 220 Z" fill="url(#goldGrad)"/>
  <path d="M 60 880 L 120 940 L 220 940 L 60 780 Z" fill="url(#goldGrad)"/>
  <path d="M 940 880 L 880 940 L 780 940 L 940 780 Z" fill="url(#goldGrad)"/>

  <!-- Top Banner Header -->
  <g filter="url(#shadow)">
    <rect x="250" y="45" width="500" height="75" rx="37.5" fill="url(#goldGrad)"/>
    <text x="500" y="93" text-anchor="middle" font-family="'Segoe UI', 'Kantumruy Pro', sans-serif" font-weight="900" font-size="34" fill="#0f172a" letter-spacing="4">🎓 CLASS OF 2026</text>
  </g>

  <!-- Bottom Banner Ribbon -->
  <g filter="url(#shadow)">
    <path d="M 120 890 L 200 870 L 800 870 L 880 890 L 850 940 L 150 940 Z" fill="url(#goldGrad)"/>
    <rect x="180" y="860" width="640" height="85" rx="20" fill="#0f172a"/>
    <rect x="185" y="865" width="630" height="75" rx="16" fill="none" stroke="url(#goldGrad)" stroke-width="3"/>
    <text x="500" y="914" text-anchor="middle" font-family="'Segoe UI', 'Kantumruy Pro', sans-serif" font-weight="800" font-size="32" fill="#fbbf24" letter-spacing="2">CONGRATULATIONS GRADUATE!</text>
  </g>

  <!-- Sparkles -->
  <g fill="#fbbf24">
    <path d="M 220 200 Q 220 230 190 230 Q 220 230 220 260 Q 220 230 250 230 Q 220 230 220 200 Z"/>
    <path d="M 780 200 Q 780 230 750 230 Q 780 230 780 260 Q 780 230 810 230 Q 780 230 780 200 Z"/>
  </g>
</svg>
`)}`,

  khmerNewYear: `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
  <defs>
    <linearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#991b1b"/>
      <stop offset="40%" stop-color="#dc2626"/>
      <stop offset="100%" stop-color="#7f1d1d"/>
    </linearGradient>
    <linearGradient id="kGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#ca8a04"/>
    </linearGradient>
    <mask id="kHole">
      <rect width="1000" height="1000" fill="white"/>
      <circle cx="500" cy="500" r="375" fill="black"/>
    </mask>
  </defs>

  <rect width="1000" height="1000" fill="url(#redGrad)" mask="url(#kHole)"/>

  <!-- Ornaments -->
  <circle cx="500" cy="500" r="380" fill="none" stroke="url(#kGold)" stroke-width="12"/>
  <circle cx="500" cy="500" r="392" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="6 6"/>

  <!-- Top Ribbon -->
  <rect x="180" y="45" width="640" height="85" rx="42.5" fill="url(#kGold)"/>
  <text x="500" y="98" text-anchor="middle" font-family="'Kantumruy Pro', sans-serif" font-weight="bold" font-size="34" fill="#7f1d1d">🇰🇭 រីករាយពិធីបុណ្យចូលឆ្នាំថ្មីប្រពៃណីជាតិ</text>

  <!-- Bottom Ribbon -->
  <rect x="220" y="865" width="560" height="80" rx="40" fill="url(#kGold)"/>
  <text x="500" y="917" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-weight="900" font-size="30" fill="#7f1d1d" letter-spacing="3">HAPPY KHMER NEW YEAR 2026</text>
  
  <!-- Flower accents -->
  <g fill="url(#kGold)">
    <circle cx="120" cy="120" r="25"/>
    <circle cx="880" cy="120" r="25"/>
    <circle cx="120" cy="880" r="25"/>
    <circle cx="880" cy="880" r="25"/>
  </g>
</svg>
`)}`,

  earthDay: `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
  <defs>
    <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#065f46"/>
      <stop offset="50%" stop-color="#059669"/>
      <stop offset="100%" stop-color="#047857"/>
    </linearGradient>
    <mask id="greenHole">
      <rect width="1000" height="1000" fill="white"/>
      <rect x="150" y="150" width="700" height="700" rx="60" fill="black"/>
    </mask>
  </defs>

  <rect width="1000" height="1000" fill="url(#greenGrad)" mask="url(#greenHole)"/>
  <rect x="145" y="145" width="710" height="710" rx="65" fill="none" stroke="#a7f3d0" stroke-width="10"/>

  <rect x="200" y="45" width="600" height="75" rx="37.5" fill="#ecfdf5"/>
  <text x="500" y="94" text-anchor="middle" font-family="'Segoe UI', 'Kantumruy Pro', sans-serif" font-weight="900" font-size="30" fill="#065f46" letter-spacing="2">🌱 PROTECT OUR PLANET</text>

  <rect x="250" y="875" width="500" height="75" rx="37.5" fill="#ecfdf5"/>
  <text x="500" y="922" text-anchor="middle" font-family="'Segoe UI', 'Kantumruy Pro', sans-serif" font-weight="800" font-size="28" fill="#047857">ACT FOR NATURE • 2026</text>
</svg>
`)}`,

  techSummit: `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
  <defs>
    <linearGradient id="cyberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#312e81"/>
      <stop offset="50%" stop-color="#4c1d95"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="neonGlow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#06b6d4"/>
      <stop offset="50%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#ec4899"/>
    </linearGradient>
    <mask id="cyberHole">
      <rect width="1000" height="1000" fill="white"/>
      <circle cx="500" cy="500" r="380" fill="black"/>
    </mask>
  </defs>

  <rect width="1000" height="1000" fill="url(#cyberGrad)" mask="url(#cyberHole)"/>
  
  <circle cx="500" cy="500" r="385" fill="none" stroke="url(#neonGlow)" stroke-width="12"/>
  <circle cx="500" cy="500" r="400" fill="none" stroke="#38bdf8" stroke-width="3" stroke-dasharray="14 10"/>

  <rect x="180" y="45" width="640" height="80" rx="20" fill="#0f172a"/>
  <rect x="182" y="47" width="636" height="76" rx="18" fill="none" stroke="url(#neonGlow)" stroke-width="4"/>
  <text x="500" y="97" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-weight="900" font-size="32" fill="#38bdf8" letter-spacing="3">⚡ AI & TECH SUMMIT 2026</text>

  <rect x="220" y="870" width="560" height="75" rx="20" fill="#0f172a"/>
  <rect x="222" y="872" width="556" height="71" rx="18" fill="none" stroke="url(#neonGlow)" stroke-width="4"/>
  <text x="500" y="918" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-weight="800" font-size="28" fill="#f472b6" letter-spacing="2">INNOVATE THE FUTURE 🚀</text>
</svg>
`)}`,

  volunteer: `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
  <defs>
    <linearGradient id="volGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e11d48"/>
      <stop offset="50%" stop-color="#f43f5e"/>
      <stop offset="100%" stop-color="#fb7185"/>
    </linearGradient>
    <mask id="volHole">
      <rect width="1000" height="1000" fill="white"/>
      <circle cx="500" cy="500" r="375" fill="black"/>
    </mask>
  </defs>

  <rect width="1000" height="1000" fill="url(#volGrad)" mask="url(#volHole)"/>
  <circle cx="500" cy="500" r="380" fill="none" stroke="#fff" stroke-width="12"/>

  <rect x="220" y="45" width="560" height="80" rx="40" fill="#ffffff"/>
  <text x="500" y="97" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-weight="900" font-size="32" fill="#e11d48" letter-spacing="3">❤️ PROUD VOLUNTEER</text>

  <rect x="250" y="870" width="500" height="75" rx="37.5" fill="#ffffff"/>
  <text x="500" y="918" text-anchor="middle" font-family="'Segoe UI', 'Kantumruy Pro', sans-serif" font-weight="bold" font-size="28" fill="#be123c">TOGETHER FOR COMMUNITY</text>
</svg>
`)}`,

  birthdayVIP: `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
  <defs>
    <linearGradient id="vipDark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18181b"/>
      <stop offset="50%" stop-color="#27272a"/>
      <stop offset="100%" stop-color="#09090b"/>
    </linearGradient>
    <linearGradient id="vipGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="40%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#a16207"/>
    </linearGradient>
    <mask id="vipHole">
      <rect width="1000" height="1000" fill="white"/>
      <circle cx="500" cy="500" r="375" fill="black"/>
    </mask>
  </defs>

  <rect width="1000" height="1000" fill="url(#vipDark)" mask="url(#vipHole)"/>
  <circle cx="500" cy="500" r="380" fill="none" stroke="url(#vipGold)" stroke-width="12"/>
  <circle cx="500" cy="500" r="395" fill="none" stroke="#fef08a" stroke-width="2" stroke-dasharray="6 8"/>

  <rect x="200" y="45" width="600" height="85" rx="42.5" fill="url(#vipGold)"/>
  <text x="500" y="100" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-weight="900" font-size="34" fill="#09090b" letter-spacing="3">👑 IT'S MY BIRTHDAY! ✨</text>

  <rect x="230" y="870" width="540" height="75" rx="37.5" fill="url(#vipGold)"/>
  <text x="500" y="918" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-weight="800" font-size="30" fill="#18181b" letter-spacing="2">CELEBRATE WITH ME</text>
</svg>
`)}`
};

// Ready-to-test Demo Avatars (SVG Data URLs)
const SAMPLE_AVATARS = [
  `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
  <defs>
    <linearGradient id="bg1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="url(#bg1)"/>
  <circle cx="300" cy="240" r="110" fill="#fed7aa"/>
  <path d="M 190 220 Q 300 120 410 220 Q 380 150 300 140 Q 220 150 190 220 Z" fill="#1e293b"/>
  <!-- Eyes & Smile -->
  <circle cx="260" cy="235" r="10" fill="#1e293b"/>
  <circle cx="340" cy="235" r="10" fill="#1e293b"/>
  <path d="M 270 270 Q 300 300 330 270" fill="none" stroke="#1e293b" stroke-width="8" stroke-linecap="round"/>
  <!-- Body/Shoulders -->
  <path d="M 120 540 C 120 400 200 370 300 370 C 400 370 480 400 480 540 Z" fill="#ffffff"/>
  <path d="M 260 370 L 300 450 L 340 370 Z" fill="#3b82f6"/>
</svg>
  `)}`,
  `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
  <defs>
    <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fb7185"/>
      <stop offset="100%" stop-color="#f43f5e"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="url(#bg2)"/>
  <circle cx="300" cy="240" r="110" fill="#fde047"/>
  <!-- Hair -->
  <path d="M 170 250 C 170 140 430 140 430 250 C 440 360 410 400 400 360 C 370 200 230 200 200 360 C 190 400 160 360 170 250 Z" fill="#451a03"/>
  <!-- Face features -->
  <circle cx="260" cy="240" r="9" fill="#1c1917"/>
  <circle cx="340" cy="240" r="9" fill="#1c1917"/>
  <path d="M 270 275 Q 300 305 330 275" fill="none" stroke="#1c1917" stroke-width="7" stroke-linecap="round"/>
  <!-- Blushes -->
  <circle cx="240" cy="260" r="14" fill="#fda4af" opacity="0.8"/>
  <circle cx="360" cy="260" r="14" fill="#fda4af" opacity="0.8"/>
  <!-- Body -->
  <path d="M 140 550 C 140 410 200 380 300 380 C 400 380 460 410 460 550 Z" fill="#ffffff"/>
</svg>
  `)}`,
  `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
  <defs>
    <linearGradient id="bg3" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#047857"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="url(#bg3)"/>
  <circle cx="300" cy="240" r="110" fill="#ffedd5"/>
  <!-- Glasses -->
  <circle cx="255" cy="235" r="28" fill="none" stroke="#1e293b" stroke-width="7"/>
  <circle cx="345" cy="235" r="28" fill="none" stroke="#1e293b" stroke-width="7"/>
  <line x1="283" y1="235" x2="317" y2="235" stroke="#1e293b" stroke-width="6"/>
  <!-- Smile -->
  <path d="M 275 285 Q 300 310 325 285" fill="none" stroke="#1e293b" stroke-width="6" stroke-linecap="round"/>
  <!-- Shoulders -->
  <path d="M 130 540 C 130 410 210 380 300 380 C 390 380 470 410 470 540 Z" fill="#f8fafc"/>
</svg>
  `)}`
];

const INITIAL_CAMPAIGNS = [
  {
    id: "grad-2026",
    slug: "class-of-2026-graduation",
    titleKm: "អបអរសាទរពិធីចែកសញ្ញាបត្រ ជំនាន់ឆ្នាំ ២០២៦",
    titleEn: "Class of 2026 Graduation Celebration",
    descriptionKm: "អបអរសាទរជោគជ័យ និងការបញ្ចប់ការសិក្សាសម្រាប់និស្សិតគ្រប់រូបក្នុងឆ្នាំ ២០២៦! រួបរួមគ្នាពាក់ស៊ុមរូបថតនេះដើម្បីអបអរសាទរដំណើរថ្មីទាំងអស់គ្នា។",
    descriptionEn: "Celebrate the momentous graduation milestone of the Class of 2026! Wear this prestigious frame to celebrate hard work, dedication, and a bright future.",
    creator: "National University Alumni",
    category: "education",
    supporters: 14250,
    frameUrl: PRESET_FRAMES.graduation,
    captionKm: "ខ្ញុំពិតជាមានមោទនភាពដែលបានបញ្ចប់ការសិក្សាថ្នាក់បរិញ្ញាបត្រឆ្នាំ ២០២៦! 🎓 សូមជូនពរមិត្តៗទាំងអស់ជួបតែសំណាងល្អ។ #ClassOf2026 #Graduation #AlumniPride",
    captionEn: "Proud to officially graduate as the Class of 2026! 🎓 The journey was incredible and the best is yet to come. #ClassOf2026 #GraduationDay #ProudGraduate",
    createdAt: "2026-03-01",
    featured: true,
    shape: "circle"
  },
  {
    id: "khmer-new-year-2026",
    slug: "khmer-new-year-2026",
    titleKm: "រីករាយពិធីបុណ្យចូលឆ្នាំថ្មីប្រពៃណីជាតិខ្មែរ ២០២៦",
    titleEn: "Happy Khmer Traditional New Year 2026",
    descriptionKm: "ចូលរួមអបអរសាទរទេវតាឆ្នាំថ្មី និងលើកស្ទួយវប្បធម៌ប្រពៃណីខ្មែរដ៏ល្អផូរផង់ ជាមួយស៊ុមរូបថតដ៏ប្រណិតនេះ!",
    descriptionEn: "Celebrate the auspicious Khmer Traditional New Year 2026! Join families and communities nationwide with this festive celebratory frame.",
    creator: "Khmer Culture Association",
    category: "culture",
    supporters: 28930,
    frameUrl: PRESET_FRAMES.khmerNewYear,
    captionKm: "សួស្ដីឆ្នាំថ្មីប្រពៃណីជាតិខ្មែរ ២០២៦! សូមទេវតាឆ្នាំថ្មីប្រទានពរជ័យ សិរីសួស្ដី វិបុលសុខ និងសុខភាពល្អដល់បងប្អូនទាំងអស់គ្នា។ 🇰🇭✨ #KhmerNewYear2026 #HappyNewYear",
    captionEn: "Wishing everyone a joyful, prosperous, and peaceful Khmer New Year 2026! 🇰🇭✨ #KhmerNewYear #Cambodia #Celebration",
    createdAt: "2026-04-01",
    featured: true,
    shape: "circle"
  },
  {
    id: "earth-hour-2026",
    slug: "protect-our-planet-earth-day",
    titleKm: "យុទ្ធនាការការពារភពផែនដី និងបរិស្ថានបៃតង",
    titleEn: "Go Green • Protect Our Planet Campaign",
    descriptionKm: "រួមគ្នាកាត់បន្ថយការប្រើប្រាស់ប្លាស្ទិក ដាំដើមឈើ និងថែរក្សាភពផែនដីដើម្បីអនាគតកូនចៅជំនាន់ក្រោយ។",
    descriptionEn: "Stand with millions worldwide taking direct action to safeguard our biodiversity, plant trees, and create sustainable communities.",
    creator: "Eco Champions Network",
    category: "charity",
    supporters: 8430,
    frameUrl: PRESET_FRAMES.earthDay,
    captionKm: "ខ្ញុំគាំទ្រយុទ្ធនាការបរិស្ថានបៃតង និងការពារភពផែនដី! មួយដៃមួយជើងដើម្បីពិភពលោកស្រស់បំព្រង។ 🌱🌍 #GoGreen #ProtectOurEarth #EcoWarrior",
    captionEn: "I proudly stand for clean energy, zero waste, and protecting our precious earth! 🌱🌍 #ProtectOurPlanet #ClimateAction #GoGreen",
    createdAt: "2026-04-20",
    featured: true,
    shape: "rounded"
  },
  {
    id: "tech-summit-2026",
    slug: "ai-future-tech-summit-2026",
    titleKm: "សន្និសីទបច្ចេកវិទ្យាបញ្ញាសិប្បនិម្មិត AI & Tech Summit 2026",
    titleEn: "AI & Future Tech Summit 2026",
    descriptionKm: "ព្រឹត្តិការណ៍បច្ចេកវិទ្យាធំជាងគេប្រចាំឆ្នាំ ជួបជុំអ្នកបង្កើតថ្មី វិស្វករ AI និងសហគ្រិនឌីជីថលល្បីៗ។",
    descriptionEn: "Join the premier annual gathering of software creators, AI innovators, and tech visionaries building the next frontier.",
    creator: "Tech Innovators Hub",
    category: "tech",
    supporters: 11200,
    frameUrl: PRESET_FRAMES.techSummit,
    captionKm: "ខ្ញុំត្រៀមខ្លួនរួចរាល់សម្រាប់ AI & Tech Summit 2026! 🚀 រួមគ្នាស្វែងយល់ពីបច្ចេកវិទ្យាអនាគត។ #TechSummit2026 #AIRevolution #Developers",
    captionEn: "Ready to explore the next generation of artificial intelligence at AI & Tech Summit 2026! ⚡🚀 #TechSummit2026 #Innovation #FutureTech",
    createdAt: "2026-05-15",
    featured: true,
    shape: "circle"
  },
  {
    id: "proud-volunteer-2026",
    slug: "proud-community-volunteer",
    titleKm: "យុទ្ធនាការអ្នកស្ម័គ្រចិត្តដើម្បីសង្គម",
    titleEn: "Proud Community Volunteer 2026",
    descriptionKm: "អរគុណបេះដូងសប្បុរសធម៌របស់អ្នកស្ម័គ្រចិត្តទាំងអស់ ដែលតែងតែលះបង់កម្លាំងកាយចិត្តដើម្បីជួយដល់សហគមន៍។",
    descriptionEn: "Honoring the selfless volunteers who dedicate their time, energy, and hearts to making every neighborhood stronger and kinder.",
    creator: "Hope & Care Foundation",
    category: "charity",
    supporters: 6510,
    frameUrl: PRESET_FRAMES.volunteer,
    captionKm: "មោទនភាពដែលបានក្លាយជាអ្នកស្ម័គ្រចិត្តបម្រើសង្គម! ការចែករំលែកនាំមកនូវស្នាមញញឹម។ ❤️ #ProudVolunteer #CareForCommunity #YouthAction",
    captionEn: "Volunteering isn't just what we do—it's who we are. Proud to serve our community! ❤️ #VolunteerLife #CommunityHero #GiveBack",
    createdAt: "2026-06-01",
    featured: false,
    shape: "circle"
  },
  {
    id: "birthday-vip-2026",
    slug: "happy-birthday-vip-celebration",
    titleKm: "ស៊ុមខួបកំណើត VIP អបអរសាទរទិវាពិសេស",
    titleEn: "Happy Birthday VIP Celebration Frame",
    descriptionKm: "ស៊ុមរូបថតរចនាប័ទ្មខ្មៅមាសដ៏ប្រណិត សម្រាប់ដាក់តាំងក្នុងថ្ងៃខួបកំណើតរបស់អ្នក ឬមនុស្សជាទីស្រឡាញ់!",
    descriptionEn: "A luxurious gold & black frame designed to make your birthday photos look spectacular and memorable across social media.",
    creator: "Celebration Studio",
    category: "celebration",
    supporters: 9140,
    frameUrl: PRESET_FRAMES.birthdayVIP,
    captionKm: "រីករាយថ្ងៃខួបកំណើតរបស់ខ្ញុំ! ✨ អរគុណចំពោះពាក្យជូនពរ និងក្ដីស្រឡាញ់ពីអ្នកទាំងអស់គ្នា។ #HappyBirthdayToMe #VIPCelebration #Blessed",
    captionEn: "Another year older, bolder, and more grateful! ✨ Thanks for all the wonderful birthday wishes! #HappyBirthday #VIP #Celebration",
    createdAt: "2026-07-07",
    featured: false,
    shape: "circle"
  }
];

const LOCAL_STORAGE_KEY = "twibbon_user_campaigns";

// Firebase Cloud Database Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDbtWymUNZ9Gk4URHgRUb6UkcSS3IwItiY",
  authDomain: "tra-frames.firebaseapp.com",
  projectId: "tra-frames",
  storageBucket: "tra-frames.firebasestorage.app",
  messagingSenderId: "635316364309",
  appId: "1:635316364309:web:95d68cc9782c8aa8bd9a1c",
  measurementId: "G-SFN5CFCT4E"
};

let firestoreDb = null;
function initFirestore() {
  if (firestoreDb) return firestoreDb;
  try {
    if (typeof firebase !== 'undefined') {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      firestoreDb = firebase.firestore();
      console.log("🔥 Tra Frames: Connected to Google Cloud Firestore!");
      return firestoreDb;
    }
  } catch (err) {
    console.warn("Firestore connection notice:", err);
  }
  return null;
}

let firebaseAuth = null;
function initFirebaseAuth() {
  if (firebaseAuth) return firebaseAuth;
  try {
    if (typeof firebase !== 'undefined') {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      firebaseAuth = firebase.auth();
      return firebaseAuth;
    }
  } catch (err) {
    console.warn("Firebase Auth connection notice:", err);
  }
  return null;
}

const AuthService = {
  currentUser: null,
  listeners: [],
  initialized: false,

  init() {
    if (this.initialized) return;
    this.initialized = true;

    // 1. Check local session storage first
    try {
      const activeStored = localStorage.getItem("tra_active_user");
      if (activeStored) {
        this.currentUser = JSON.parse(activeStored);
        this.notifyListeners();
      }
    } catch (e) {}

    // 2. Connect to Firebase Auth
    const auth = initFirebaseAuth();
    if (!auth) return;

    auth.onAuthStateChanged((user) => {
      if (user) {
        this.currentUser = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Creator'),
          photoURL: user.photoURL || '',
          isLocal: false
        };
        try {
          localStorage.setItem("tra_active_user", JSON.stringify(this.currentUser));
        } catch (e) {}
      } else {
        if (this.currentUser && !this.currentUser.isLocal) {
          this.currentUser = null;
          try {
            localStorage.removeItem("tra_active_user");
          } catch (e) {}
        }
      }

      console.log("👤 Tra Frames Auth:", this.currentUser ? `Signed in as ${this.currentUser.displayName}` : "Guest");
      this.notifyListeners();
    });
  },

  onAuthStateChanged(callback) {
    this.listeners.push(callback);
    callback(this.currentUser);
  },

  notifyListeners() {
    this.listeners.forEach(cb => {
      try { cb(this.currentUser); } catch (e) { console.error(e); }
    });
  },

  isAuthenticated() {
    return !!this.currentUser;
  },

  async loginWithGoogle() {
    const auth = initFirebaseAuth();
    if (!auth) throw new Error("Firebase Auth is not available.");
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await auth.signInWithPopup(provider);
      return result.user;
    } catch (err) {
      console.error("Google Sign-In Error:", err);
      throw err;
    }
  },

  async loginWithEmail(email, password) {
    const auth = initFirebaseAuth();
    if (auth) {
      try {
        const result = await auth.signInWithEmailAndPassword(email, password);
        this.currentUser = {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName || (result.user.email ? result.user.email.split('@')[0] : 'Creator'),
          photoURL: result.user.photoURL || '',
          isLocal: false
        };
        try { localStorage.setItem("tra_active_user", JSON.stringify(this.currentUser)); } catch (e) {}
        this.notifyListeners();
        return this.currentUser;
      } catch (err) {
        console.warn("Firebase Cloud Login Notice:", err);
        // If Firebase Console has provider disabled or account is local, check local accounts
        if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          const local = this.loginLocal(email, password);
          if (local) return local;
        }
        throw err;
      }
    }
    return this.loginLocal(email, password);
  },

  async signUpWithEmail(email, password, displayName) {
    const auth = initFirebaseAuth();
    if (auth) {
      try {
        const result = await auth.createUserWithEmailAndPassword(email, password);
        if (displayName && result.user) {
          try { await result.user.updateProfile({ displayName }); } catch (e) {}
        }
        this.currentUser = {
          uid: result.user.uid,
          email: result.user.email,
          displayName: displayName || result.user.displayName || (result.user.email ? result.user.email.split('@')[0] : 'Creator'),
          photoURL: result.user.photoURL || '',
          isLocal: false
        };
        try { localStorage.setItem("tra_active_user", JSON.stringify(this.currentUser)); } catch (e) {}
        this.notifyListeners();
        return this.currentUser;
      } catch (err) {
        console.warn("Firebase Cloud Sign-Up Notice:", err);
        // If Firebase Console has Email/Password disabled (OPERATION_NOT_ALLOWED), fallback to seamless Local Account!
        if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/network-request-failed') {
          return this.signUpLocal(email, password, displayName);
        }
        throw err;
      }
    }
    return this.signUpLocal(email, password, displayName);
  },

  signUpLocal(email, password, displayName) {
    const accounts = this.getLocalAccounts();
    const existing = accounts.find(a => a.email && a.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      const err = new Error("Email already registered");
      err.code = 'auth/email-already-in-use';
      throw err;
    }
    const user = {
      uid: "local-" + Date.now(),
      email: email,
      displayName: displayName || email.split('@')[0] || 'Creator',
      photoURL: '',
      isLocal: true
    };
    accounts.push({ ...user, passwordHash: btoa(encodeURIComponent(password)) });
    try {
      localStorage.setItem("tra_local_accounts", JSON.stringify(accounts));
    } catch (e) {}
    this.currentUser = user;
    try {
      localStorage.setItem("tra_active_user", JSON.stringify(user));
    } catch (e) {}
    this.notifyListeners();
    return user;
  },

  loginLocal(email, password) {
    const accounts = this.getLocalAccounts();
    const hash = btoa(encodeURIComponent(password));
    const found = accounts.find(a => a.email && a.email.toLowerCase() === email.toLowerCase() && a.passwordHash === hash);
    if (!found) {
      const err = new Error("Invalid email or password");
      err.code = 'auth/invalid-credential';
      throw err;
    }
    const user = {
      uid: found.uid,
      email: found.email,
      displayName: found.displayName,
      photoURL: found.photoURL || '',
      isLocal: true
    };
    this.currentUser = user;
    try {
      localStorage.setItem("tra_active_user", JSON.stringify(user));
    } catch (e) {}
    this.notifyListeners();
    return user;
  },

  getLocalAccounts() {
    try {
      const stored = localStorage.getItem("tra_local_accounts");
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  async logout() {
    this.currentUser = null;
    try {
      localStorage.removeItem("tra_active_user");
    } catch (e) {}
    const auth = initFirebaseAuth();
    if (auth) {
      try {
        await auth.signOut();
      } catch (e) {}
    }
    this.notifyListeners();
  }
};

const CampaignService = {
  _memoryCache: new Map(),

  getCampaigns() {
    let userCampaigns = [];
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        userCampaigns = JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to load user campaigns from localStorage:", e);
    }
    const combined = [...userCampaigns];
    if (this._memoryCache) {
      for (const [id, c] of this._memoryCache.entries()) {
        if (!combined.some(existing => existing.slug === c.slug || existing.id === c.id)) {
          combined.unshift(c);
        }
      }
    }
    return [...combined, ...INITIAL_CAMPAIGNS];
  },

  getCampaignBySlugOrId(identifier) {
    if (!identifier) return null;
    if (this._memoryCache && this._memoryCache.has(identifier)) {
      return this._memoryCache.get(identifier);
    }
    const all = this.getCampaigns();
    return all.find(c => c.slug === identifier || c.id === identifier);
  },

  async compressFrameDataUrl(dataUrl, maxDim = 1080) {
    if (!dataUrl || typeof dataUrl !== 'string') return dataUrl;
    if (!dataUrl.startsWith('data:image')) return dataUrl;
    if (dataUrl.startsWith('data:image/svg+xml')) return dataUrl;

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Try WebP first (supports alpha transparency and is 3-5x smaller than PNG)
          try {
            const webpUrl = canvas.toDataURL('image/webp', 0.85);
            if (webpUrl && webpUrl.startsWith('data:image/webp') && webpUrl.length < 800000) {
              return resolve(webpUrl);
            }
          } catch (e) {}

          // Fallback to PNG (guaranteed lossless transparency)
          const pngUrl = canvas.toDataURL('image/png');
          if (pngUrl.length < 900000) {
            return resolve(pngUrl);
          }

          // If still larger than 900KB, scale down slightly to 900x900 PNG
          canvas.width = Math.min(width, 900);
          canvas.height = Math.min(height, 900);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          return resolve(canvas.toDataURL('image/png'));
        } catch (err) {
          console.warn('Image compression exception, using original:', err);
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  },

  async saveCampaign(campaignData) {
    let userCampaigns = [];
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) userCampaigns = JSON.parse(stored);
    } catch (e) {
      userCampaigns = [];
    }

    const safeSlug = (campaignData.slug || campaignData.titleEn || "campaign")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "")
      .replace(/^-+|-+$/g, "") || "campaign-" + Date.now();

    let frameUrl = SecurityUtils.sanitizeUrl(campaignData.frameUrl);
    if (frameUrl && frameUrl.length > 650000) {
      try {
        frameUrl = await this.compressFrameDataUrl(frameUrl);
      } catch (e) {}
    }

    const user = AuthService.currentUser;
    const newCampaign = {
      ...campaignData,
      id: campaignData.id || "user-" + Date.now(),
      creatorUid: user ? user.uid : (campaignData.creatorUid || null),
      creatorEmail: user ? user.email : (campaignData.creatorEmail || null),
      titleKm: SecurityUtils.escapeHtml(campaignData.titleKm || ''),
      titleEn: SecurityUtils.escapeHtml(campaignData.titleEn || ''),
      slug: safeSlug,
      category: ['education', 'culture', 'charity', 'sports', 'tech', 'celebration'].includes(campaignData.category)
        ? campaignData.category
        : 'celebration',
      creator: SecurityUtils.escapeHtml(campaignData.creator || (user ? user.displayName : 'Anonymous')),
      descriptionKm: SecurityUtils.escapeHtml(campaignData.descriptionKm || ''),
      descriptionEn: SecurityUtils.escapeHtml(campaignData.descriptionEn || ''),
      caption: SecurityUtils.escapeHtml(campaignData.caption || ''),
      frameUrl: frameUrl,
      supporters: Math.max(1, parseInt(campaignData.supporters, 10) || 1),
      createdAt: new Date().toISOString().split("T")[0],
      isUserCreated: true
    };

    userCampaigns.unshift(newCampaign);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userCampaigns));
    } catch (err) {
      console.warn("Storage quota exceeded, removing oldest custom campaigns:", err);
      if (userCampaigns.length > 1) {
        userCampaigns.pop();
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userCampaigns));
        } catch (e2) {}
      }
    }

    // Save to Cloud Firestore so it is instantly accessible worldwide
    const db = initFirestore();
    if (db) {
      db.collection("campaigns").doc(newCampaign.slug || newCampaign.id).set(newCampaign)
        .then(() => console.log("🔥 Campaign synced to Cloud Firestore:", newCampaign.slug))
        .catch(err => console.warn("Cloud Firestore sync error:", err));
    }

    return newCampaign;
  },

  // Sync a single campaign to Cloud Firestore
  async syncSingleCampaignToCloud(campaign) {
    const db = initFirestore();
    if (!db || !campaign) return false;
    const docId = campaign.slug || campaign.id;
    if (!docId) return false;

    try {
      let dataToSave = { ...campaign };
      if (dataToSave.frameUrl && dataToSave.frameUrl.length > 650000) {
        dataToSave.frameUrl = await this.compressFrameDataUrl(dataToSave.frameUrl);
      }
      await db.collection("campaigns").doc(docId).set(dataToSave, { merge: true });
      console.log("🔥 Synced campaign to Cloud Firestore:", docId);
      const cloudStatusEl = document.getElementById('cloudSyncStatus');
      if (cloudStatusEl) {
        const isKm = getLanguage() === 'km';
        cloudStatusEl.innerHTML = `☁️ ${isKm ? 'បាន Sync ឡើង Cloud Firestore រួចរាល់ • អាចបើកលើទូរស័ព្ទបាន' : 'Synced to Cloud Firestore • Accessible on Mobile'}`;
        cloudStatusEl.style.color = '#10b981';
      }
      return true;
    } catch (err) {
      console.warn("Failed syncing single campaign to Firestore:", docId, err);
      return false;
    }
  },

  parseFirestoreDoc(doc) {
    if (!doc || !doc.fields) return null;
    const result = {};
    for (const [key, val] of Object.entries(doc.fields)) {
      if (val.stringValue !== undefined) result[key] = val.stringValue;
      else if (val.integerValue !== undefined) result[key] = parseInt(val.integerValue, 10);
      else if (val.doubleValue !== undefined) result[key] = parseFloat(val.doubleValue);
      else if (val.booleanValue !== undefined) result[key] = val.booleanValue;
      else if (val.timestampValue !== undefined) result[key] = val.timestampValue;
      else if (val.nullValue !== undefined) result[key] = null;
    }
    return result;
  },

  // Save to memory cache and local storage so subsequent loads are instant
  cacheCloudCampaign(campaign) {
    if (!campaign) return;
    if (campaign.slug) this._memoryCache.set(campaign.slug, campaign);
    if (campaign.id) this._memoryCache.set(campaign.id, campaign);
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      let userCampaigns = stored ? JSON.parse(stored) : [];
      const idx = userCampaigns.findIndex(c => c.slug === campaign.slug || c.id === campaign.id);
      if (idx >= 0) {
        userCampaigns[idx] = campaign;
      } else {
        userCampaigns.unshift(campaign);
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userCampaigns));
    } catch (e) {
      console.warn("Storage quota warning on cacheCloudCampaign:", e);
    }
  },

  // Fetch campaign from Cloud Firestore (SDK + High-Reliability REST fallback)
  async fetchCloudCampaign(identifier) {
    if (!identifier) return null;

    // Check memory cache first
    if (this._memoryCache && this._memoryCache.has(identifier)) {
      return this._memoryCache.get(identifier);
    }

    // 1. Try Firebase SDK if available
    const db = initFirestore();
    if (db) {
      try {
        const docRef = await db.collection("campaigns").doc(identifier).get();
        if (docRef.exists) {
          const data = docRef.data();
          this.cacheCloudCampaign(data);
          return data;
        }

        const snapshot = await db.collection("campaigns").where("slug", "==", identifier).limit(1).get();
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          this.cacheCloudCampaign(data);
          return data;
        }

        const idSnapshot = await db.collection("campaigns").where("id", "==", identifier).limit(1).get();
        if (!idSnapshot.empty) {
          const data = idSnapshot.docs[0].data();
          this.cacheCloudCampaign(data);
          return data;
        }
      } catch (err) {
        console.warn("Firestore SDK notice, switching to direct REST lookup:", err);
      }
    }

    // 2. High-speed Direct REST Fallback (Works 100% reliably on all mobile networks without auth)
    try {
      const restUrl = `https://firestore.googleapis.com/v1/projects/tra-frames/databases/(default)/documents/campaigns/${encodeURIComponent(identifier)}`;
      const res = await fetch(restUrl);
      if (res.ok) {
        const docJson = await res.json();
        const data = this.parseFirestoreDoc(docJson);
        if (data) {
          this.cacheCloudCampaign(data);
          return data;
        }
      }
    } catch (restErr) {
      console.warn("Firestore REST direct lookup error:", restErr);
    }

    return null;
  },

  // Fetch all public campaigns from Cloud Firestore to populate Explore feed
  async fetchAllCloudCampaigns() {
    try {
      const restUrl = `https://firestore.googleapis.com/v1/projects/tra-frames/databases/(default)/documents/campaigns`;
      const res = await fetch(restUrl);
      if (res.ok) {
        const json = await res.json();
        if (json.documents && Array.isArray(json.documents)) {
          const campaigns = json.documents.map(d => this.parseFirestoreDoc(d)).filter(Boolean);
          campaigns.forEach(c => this.cacheCloudCampaign(c));
          return campaigns;
        }
      }
    } catch (err) {
      console.warn("fetchAllCloudCampaigns notice:", err);
    }
    return [];
  },

  // Sync existing local campaigns to Cloud Firestore
  async syncLocalCampaignsToCloud() {
    const db = initFirestore();
    if (!db) return;
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!stored) return;
      const userCampaigns = JSON.parse(stored);
      let updatedAny = false;
      for (let i = 0; i < userCampaigns.length; i++) {
        let c = userCampaigns[i];
        const docId = c.slug || c.id;
        if (!docId) continue;

        let toSync = { ...c };
        if (toSync.frameUrl && toSync.frameUrl.length > 650000) {
          try {
            toSync.frameUrl = await this.compressFrameDataUrl(toSync.frameUrl);
            userCampaigns[i] = toSync;
            updatedAny = true;
          } catch (e) {}
        }

        try {
          await db.collection("campaigns").doc(docId).set(toSync, { merge: true });
          console.log("🔥 Synced local campaign to Cloud:", docId);
        } catch (e) {
          console.warn("Failed syncing campaign:", docId, e);
        }
      }
      if (updatedAny) {
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userCampaigns));
        } catch (e) {}
      }
    } catch (err) {
      console.warn("Sync to cloud error:", err);
    }
  },

  deleteCampaign(id) {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        let userCampaigns = JSON.parse(stored);
        userCampaigns = userCampaigns.filter(c => c.id !== id);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userCampaigns));
        return true;
      }
    } catch (e) {
      console.error("Failed to delete campaign:", e);
    }
    return false;
  },

  getUserCampaigns() {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      const allUserCampaigns = stored ? JSON.parse(stored) : [];
      const user = AuthService.currentUser;
      if (user) {
        return allUserCampaigns.filter(c => !c.creatorUid || c.creatorUid === user.uid);
      }
      return allUserCampaigns;
    } catch (e) {
      return [];
    }
  },

  incrementSupporter(id) {
    const all = this.getCampaigns();
    const item = all.find(c => c.id === id);
    if (item) {
      item.supporters = (item.supporters || 0) + 1;
      // If it's in user campaigns, update it
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          let userCampaigns = JSON.parse(stored);
          const userIdx = userCampaigns.findIndex(c => c.id === id);
          if (userIdx !== -1) {
            userCampaigns[userIdx].supporters = (userCampaigns[userIdx].supporters || 0) + 1;
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userCampaigns));
          }
        }
      } catch (e) {}
      return item.supporters;
    }
    return 1;
  }
};
