// Campaign Data Service with Rich Presets & LocalStorage Persistence

// Security Utilities (Anti-XSS, Cryptographic Hashing, Rate Limiting & Input Validation)
const SecurityUtils = {
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  sanitizeSvg(svgContent) {
    if (!svgContent || typeof svgContent !== 'string') return '';
    // Strip dangerous elements, foreign objects, and execution vectors
    return svgContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, '')
      .replace(/<use\b[^>]*>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^>]*>/gi, '')
      .replace(/on\w+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '')
      .replace(/href\s*=\s*["']\s*javascript:[^"']*["']/gi, '')
      .replace(/xlink:href\s*=\s*["']\s*javascript:[^"']*["']/gi, '');
  },
  
  sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return '#';
    const trimmed = url.trim();
    // Allow standard https, relative paths, hashes, and safe raster data URLs
    if (/^(https?:\/\/|\/|#|data:image\/(png|jpeg|jpg|webp)[;,])/i.test(trimmed)) {
      return trimmed;
    }
    // For SVG data URLs, rigorously sanitize the SVG markup
    if (/^data:image\/svg\+xml[;,]/i.test(trimmed)) {
      try {
        let svgBody = '';
        if (trimmed.includes(';base64,')) {
          svgBody = atob(trimmed.split(';base64,')[1]);
          const cleanSvg = this.sanitizeSvg(svgBody);
          return `data:image/svg+xml;base64,${btoa(cleanSvg)}`;
        } else if (trimmed.includes(';utf8,')) {
          svgBody = decodeURIComponent(trimmed.split(';utf8,')[1]);
          const cleanSvg = this.sanitizeSvg(svgBody);
          return `data:image/svg+xml;utf8,${encodeURIComponent(cleanSvg)}`;
        }
      } catch (e) {
        return '#';
      }
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
  },

  cleanText(str, maxLength = 200) {
    if (!str) return '';
    return this.escapeHtml(String(str).trim().slice(0, maxLength));
  },

  isDisposableEmail(email) {
    if (!email || typeof email !== 'string') return true;
    const domain = email.split('@')[1]?.toLowerCase().trim();
    if (!domain) return true;
    const disposableDomains = [
      'tempmail.com', '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
      'throwawaymail.com', 'yopmail.com', 'trashmail.com', 'sharklasers.com',
      'getairmail.com', 'fakemailgenerator.com', 'dispostable.com', 'maildrop.cc',
      'generator.email', 'temp-mail.org', 'mohmal.com', 'crazymailing.com',
      'fakeinbox.com', 'emailondeck.com', 'mytemp.email', 'burnermail.io'
    ];
    return disposableDomains.includes(domain);
  },

  // Secure One-Way Cryptographic Password Hashing using native Web Crypto API (SHA-256)
  async hashPassword(password, salt = 'tra-frames-salt') {
    if (!password) return '';
    try {
      if (window.crypto && window.crypto.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(`${salt}:${password}:tra-auth-secure-2026`);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) {
      console.warn("WebCrypto notice, using robust fallback hash:", e);
    }
    let hash = 0;
    const str = `${salt}:${password}:tra-fallback-2026`;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(16) + '_safe';
  },

  // Client-Side Rate Limiter & Anti-Flood Protection
  checkRateLimit(actionKey, maxAttempts = 5, windowSeconds = 60) {
    try {
      const now = Date.now();
      const storageKey = `tra_rl_${actionKey}`;
      const records = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const validRecords = records.filter(timestamp => now - timestamp < windowSeconds * 1000);
      
      if (validRecords.length >= maxAttempts) {
        const oldest = validRecords[0];
        const waitTime = Math.ceil((windowSeconds * 1000 - (now - oldest)) / 1000);
        return { allowed: false, waitSeconds: Math.max(1, waitTime) };
      }

      validRecords.push(now);
      localStorage.setItem(storageKey, JSON.stringify(validRecords));
      return { allowed: true, waitSeconds: 0 };
    } catch (e) {
      return { allowed: true, waitSeconds: 0 };
    }
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

// ==========================================
// 6-DIGIT EMAIL OTP VERIFICATION SERVICE
// ==========================================
const OtpService = {
  async generateOtp(email, displayName = '') {
    if (!email) throw new Error("Email is required for OTP generation");
    const cleanEmail = email.trim().toLowerCase();
    
    // Rate limit: max 3 requests per 60 seconds
    const rateCheck = SecurityUtils.checkRateLimit(`otp_req_${cleanEmail}`, 3, 60);
    if (!rateCheck.allowed) {
      const isKm = typeof getLanguage === 'function' && getLanguage() === 'km';
      const err = new Error(isKm 
        ? `សូមរង់ចាំ ${rateCheck.waitSeconds} វិនាទីមុននឹងស្នើសុំលេខកូដថ្មី`
        : `Please wait ${rateCheck.waitSeconds}s before requesting a new OTP.`);
      err.code = 'otp/rate-limit';
      throw err;
    }

    // Generate cryptographically random 6-digit number
    let otpCode = '';
    if (window.crypto && window.crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      window.crypto.getRandomValues(arr);
      otpCode = (100000 + (arr[0] % 900000)).toString();
    } else {
      otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    }

    // Hash the OTP with salt for secure storage
    const otpHash = await SecurityUtils.hashPassword(otpCode, `otp_${cleanEmail}`);
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    const record = {
      email: cleanEmail,
      hash: otpHash,
      expiresAt: expiresAt,
      attempts: 0
    };

    try {
      sessionStorage.setItem("tra_otp_record", JSON.stringify(record));
    } catch (e) {}

    // Dispatch email
    await this.sendOtpEmail(cleanEmail, otpCode, displayName);

    return { email: cleanEmail, otpCode, expiresAt };
  },

  hasActiveOtp(email) {
    if (!email) return false;
    const cleanEmail = email.trim().toLowerCase();
    try {
      const raw = sessionStorage.getItem("tra_otp_record");
      if (!raw) return false;
      const rec = JSON.parse(raw);
      return (rec.email === cleanEmail && Date.now() < rec.expiresAt);
    } catch (e) {}
    return false;
  },

  async sendOtpEmail(email, otpCode, displayName = '') {
    const cleanEmail = email.trim().toLowerCase();
    const name = displayName || cleanEmail.split('@')[0];

    // Channel 1: EmailJS (if configured)
    if (typeof emailjs !== 'undefined' && window.EMAILJS_CONFIG && window.EMAILJS_CONFIG.publicKey) {
      try {
        await emailjs.send(
          window.EMAILJS_CONFIG.serviceId,
          window.EMAILJS_CONFIG.templateId,
          {
            to_email: cleanEmail,
            otp_code: otpCode,
            user_name: name
          },
          window.EMAILJS_CONFIG.publicKey
        );
        console.log("📩 [EmailJS] OTP sent successfully to", cleanEmail);
      } catch (e) {
        console.warn("EmailJS delivery notice:", e);
      }
    }

    // Channel 2: Firebase Firestore 'mail' collection (Trigger Email extension)
    const db = initFirestore();
    if (db) {
      try {
        db.collection("mail").add({
          to: [cleanEmail],
          message: {
            subject: `Tra Frames - លេខកូដផ្ទៀងផ្ទាត់ OTP របស់អ្នកគឺ៖ ${otpCode}`,
            text: `សួស្តី ${name}!\nលេខកូដសម្ងាត់ ៦ ខ្ទង់របស់អ្នកគឺ៖ ${otpCode}\nលេខកូដនេះមានសុពលភាពរយៈពេល ១០ នាទី។`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; text-align: center;">
                <h2 style="color: #059669; margin-bottom: 6px;">Tra Frames</h2>
                <p style="color: #64748b; font-size: 14px; margin-top: 0;">វេទិកាស៊ុមរូបថតយុទ្ធនាការ និងព្រឹត្តិការណ៍</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 18px 0;">
                <p style="color: #334155; font-size: 15px;">សួស្តី <strong>${name}</strong>,</p>
                <p style="color: #475569; font-size: 14px;">នេះជាលេខកូដផ្ទៀងផ្ទាត់អ៊ីមែល (OTP) របស់អ្នក៖</p>
                <div style="margin: 24px 0;">
                  <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f172a; background: #f0fdf4; padding: 12px 24px; border-radius: 8px; border: 2px dashed #10b981; display: inline-block;">
                    ${otpCode}
                  </span>
                </div>
                <p style="color: #e11d48; font-size: 13px; font-weight: 600;">⚠️ លេខកូដនេះមានសុពលភាពរយៈពេល ១០ នាទីប៉ុណ្ណោះ។</p>
                <p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">ប្រសិនបើអ្នកមិនបានស្នើសុំលេខកូដនេះទេ សូមកុំចែករំលែកវាជាមួយនរណាម្នាក់ឡើយ។</p>
              </div>
            `
          }
        }).then(() => console.log("🔥 [Firestore Mail] Trigger Email queued for", cleanEmail))
          .catch(e => console.warn("Firestore mail queue notice:", e));
      } catch (e) {}
    }

    // Channel 3: Firebase Auth Action Code in background
    const auth = initFirebaseAuth();
    if (auth && auth.currentUser && typeof auth.currentUser.sendEmailVerification === 'function') {
      try {
        auth.currentUser.sendEmailVerification().catch(() => {});
      } catch (e) {}
    }

    // Channel 4: Global notification dispatch
    window.dispatchEvent(new CustomEvent('tra_otp_dispatched', {
      detail: { email: cleanEmail, otpCode }
    }));
    console.log(`%c🔑 [Tra Frames OTP] Code generated for ${cleanEmail}: ${otpCode}`, "color: #059669; font-weight: bold; font-size: 14px;");
  },

  async verifyOtp(email, enteredCode) {
    if (!email || !enteredCode) {
      return { success: false, reason: 'missing_data' };
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = enteredCode.toString().trim();

    let rawRecord = null;
    try {
      rawRecord = sessionStorage.getItem("tra_otp_record");
    } catch (e) {}

    if (!rawRecord) {
      return { success: false, reason: 'expired' };
    }

    let record = null;
    try {
      record = JSON.parse(rawRecord);
    } catch (e) {
      return { success: false, reason: 'invalid' };
    }

    if (record.email !== cleanEmail) {
      return { success: false, reason: 'email_mismatch' };
    }

    if (Date.now() > record.expiresAt) {
      return { success: false, reason: 'expired' };
    }

    if (record.attempts >= 5) {
      return { success: false, reason: 'max_attempts' };
    }

    const inputHash = await SecurityUtils.hashPassword(cleanCode, `otp_${cleanEmail}`);
    if (inputHash !== record.hash) {
      record.attempts = (record.attempts || 0) + 1;
      try {
        sessionStorage.setItem("tra_otp_record", JSON.stringify(record));
      } catch (e) {}
      return { success: false, reason: 'invalid', remainingAttempts: Math.max(0, 5 - record.attempts) };
    }

    // OTP IS VALID!
    try {
      sessionStorage.removeItem("tra_otp_record");
    } catch (e) {}

    // Update active user state
    if (AuthService.currentUser) {
      AuthService.currentUser.emailVerified = true;
      try {
        localStorage.setItem("tra_active_user", JSON.stringify(AuthService.currentUser));
      } catch (e) {}

      // Update local account database if local
      if (AuthService.currentUser.isLocal) {
        const accounts = AuthService.getLocalAccounts();
        const acc = accounts.find(a => a.email && a.email.toLowerCase() === cleanEmail);
        if (acc) {
          acc.emailVerified = true;
          try {
            localStorage.setItem("tra_local_accounts", JSON.stringify(accounts));
          } catch (e) {}
        }
      }

      // Record in Cloud Firestore verified_users collection
      const db = initFirestore();
      if (db && AuthService.currentUser.uid) {
        try {
          await db.collection("verified_users").doc(AuthService.currentUser.uid).set({
            email: cleanEmail,
            verifiedAt: new Date().toISOString(),
            method: "email_otp"
          }, { merge: true });
          console.log("🔥 [Cloud Verified] User verified in Firestore:", AuthService.currentUser.uid);
        } catch (e) {
          console.warn("Firestore verified_users update notice:", e);
        }
      }

      AuthService.notifyListeners();
    }

    return { success: true };
  }
};

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
        const isGoogle = user.providerData && user.providerData.some(p => p.providerId === 'google.com');
        this.currentUser = {
          uid: user.uid,
          email: user.email || '',
          displayName: SecurityUtils.cleanText(user.displayName || (user.email ? user.email.split('@')[0] : 'Creator'), 50),
          photoURL: SecurityUtils.sanitizeUrl(user.photoURL || ''),
          emailVerified: isGoogle ? true : !!user.emailVerified,
          isLocal: false
        };

        // Check if verified via OTP in Firestore
        if (!this.currentUser.emailVerified) {
          const db = initFirestore();
          if (db) {
            db.collection("verified_users").doc(user.uid).get().then(doc => {
              if (doc.exists && this.currentUser && this.currentUser.uid === user.uid) {
                this.currentUser.emailVerified = true;
                try { localStorage.setItem("tra_active_user", JSON.stringify(this.currentUser)); } catch (e) {}
                this.notifyListeners();
              }
            }).catch(() => {});
          }
        }

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

      console.log("👤 Tra Frames Auth:", this.currentUser ? `Signed in as ${this.currentUser.displayName} (Verified: ${this.isEmailVerified()})` : "Guest");
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

  isEmailVerified() {
    if (!this.currentUser) return false;
    if (this.currentUser.emailVerified === true) return true;
    if (this.currentUser.isLocal && this.currentUser.emailVerified !== false) return true;
    return false;
  },

  async checkEmailVerificationStatus() {
    const auth = initFirebaseAuth();
    if (auth && auth.currentUser) {
      try {
        await auth.currentUser.reload();
        const isGoogle = auth.currentUser.providerData && auth.currentUser.providerData.some(p => p.providerId === 'google.com');
        let isVerified = isGoogle || !!auth.currentUser.emailVerified;
        if (!isVerified) {
          const db = initFirestore();
          if (db) {
            try {
              const doc = await db.collection("verified_users").doc(auth.currentUser.uid).get();
              if (doc.exists) isVerified = true;
            } catch (e) {}
          }
        }
        if (this.currentUser) {
          this.currentUser.emailVerified = isVerified;
          try { localStorage.setItem("tra_active_user", JSON.stringify(this.currentUser)); } catch (e) {}
          this.notifyListeners();
        }
        return isVerified;
      } catch (err) {
        console.warn("reload user error:", err);
      }
    }
    if (this.currentUser && this.currentUser.isLocal) {
      return this.currentUser.emailVerified !== false;
    }
    return false;
  },

  async resendVerificationEmail() {
    const rateCheck = SecurityUtils.checkRateLimit('resend_email_verification', 1, 60);
    if (!rateCheck.allowed) {
      const err = new Error(`សូមរង់ចាំ ${rateCheck.waitSeconds} វិនាទីមុននឹងផ្ញើម្តងទៀត`);
      err.code = 'auth/too-many-requests';
      throw err;
    }
    const auth = initFirebaseAuth();
    if (auth && auth.currentUser) {
      if (typeof auth.currentUser.sendEmailVerification === 'function') {
        await auth.currentUser.sendEmailVerification();
        return true;
      }
    }
    return false;
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
      if (result.user) {
        this.currentUser = {
          uid: result.user.uid,
          email: result.user.email || '',
          displayName: SecurityUtils.cleanText(result.user.displayName || (result.user.email ? result.user.email.split('@')[0] : 'Creator'), 50),
          photoURL: SecurityUtils.sanitizeUrl(result.user.photoURL || ''),
          emailVerified: true,
          isLocal: false
        };
        try { localStorage.setItem("tra_active_user", JSON.stringify(this.currentUser)); } catch (e) {}
        this.notifyListeners();
      }
      return result.user;
    } catch (err) {
      console.error("Google Sign-In Error:", err);
      throw err;
    }
  },

  async loginWithEmail(email, password) {
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      const err = new Error("Invalid credentials provided");
      err.code = 'auth/invalid-credential';
      throw err;
    }
    const cleanEmail = email.trim().toLowerCase();

    // Anti-Brute Force Protection: max 5 attempts per minute per email
    const rateCheck = SecurityUtils.checkRateLimit(`login_${cleanEmail}`, 5, 60);
    if (!rateCheck.allowed) {
      const err = new Error(`Too many failed attempts. Please wait ${rateCheck.waitSeconds}s.`);
      err.code = 'auth/too-many-requests';
      throw err;
    }

    const auth = initFirebaseAuth();
    if (auth) {
      try {
        const result = await auth.signInWithEmailAndPassword(cleanEmail, password);
        if (result.user) {
          const isGoogle = result.user.providerData && result.user.providerData.some(p => p.providerId === 'google.com');
          let verified = isGoogle || !!result.user.emailVerified;
          
          if (!verified) {
            const db = initFirestore();
            if (db) {
              try {
                const doc = await db.collection("verified_users").doc(result.user.uid).get();
                if (doc.exists) verified = true;
              } catch (e) {}
            }
          }

          this.currentUser = {
            uid: result.user.uid,
            email: result.user.email,
            displayName: SecurityUtils.cleanText(result.user.displayName || (result.user.email ? result.user.email.split('@')[0] : 'Creator'), 50),
            photoURL: SecurityUtils.sanitizeUrl(result.user.photoURL || ''),
            emailVerified: verified,
            isLocal: false
          };
          try { localStorage.setItem("tra_active_user", JSON.stringify(this.currentUser)); } catch (e) {}
          this.notifyListeners();
          return this.currentUser;
        }
      } catch (err) {
        console.warn("Firebase Email Login Notice:", err);
        // If Firebase Console has provider disabled or account is local, check local accounts
        if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          const local = await this.loginLocal(cleanEmail, password);
          if (local) return local;
        }
        throw err;
      }
    }
    return await this.loginLocal(cleanEmail, password);
  },

  async signUpWithEmail(email, password, displayName, preVerified = false) {
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      const err = new Error("Email and password are required");
      err.code = 'auth/invalid-credential';
      throw err;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      const err = new Error("Invalid email format");
      err.code = 'auth/invalid-email';
      throw err;
    }
    if (SecurityUtils.isDisposableEmail(cleanEmail)) {
      const err = new Error("Disposable or temporary email addresses are not allowed.");
      err.code = 'auth/disposable-email';
      throw err;
    }
    if (password.length < 6 || password.length > 128) {
      const err = new Error("Password must be between 6 and 128 characters");
      err.code = 'auth/weak-password';
      throw err;
    }
    const safeDisplayName = SecurityUtils.cleanText(displayName || cleanEmail.split('@')[0] || 'Creator', 50);

    const auth = initFirebaseAuth();
    if (auth) {
      try {
        const result = await auth.createUserWithEmailAndPassword(cleanEmail, password);
        if (safeDisplayName && result.user) {
          try { await result.user.updateProfile({ displayName: safeDisplayName }); } catch (e) {}
        }

        // Send Email Verification link in background if not already pre-verified
        let emailSent = false;
        if (!preVerified && result.user && typeof result.user.sendEmailVerification === 'function') {
          try {
            await result.user.sendEmailVerification();
            emailSent = true;
            console.log("📩 Verification email dispatched to:", cleanEmail);
          } catch (verErr) {
            console.warn("sendEmailVerification notice:", verErr);
          }
        }

        this.currentUser = {
          uid: result.user.uid,
          email: result.user.email,
          displayName: safeDisplayName,
          photoURL: SecurityUtils.sanitizeUrl(result.user.photoURL || ''),
          emailVerified: !!preVerified,
          verificationEmailSent: emailSent,
          isLocal: false
        };
        try { localStorage.setItem("tra_active_user", JSON.stringify(this.currentUser)); } catch (e) {}

        // Dispatch 6-digit OTP code to email only if not pre-verified
        if (!preVerified) {
          try {
            await OtpService.generateOtp(cleanEmail, safeDisplayName);
          } catch (otpErr) {
            console.warn("OTP dispatch notice:", otpErr);
          }
        }

        this.notifyListeners();
        return this.currentUser;
      } catch (err) {
        console.warn("Firebase Cloud Sign-Up Notice:", err);
        // If Firebase Console has Email/Password disabled (OPERATION_NOT_ALLOWED), fallback to seamless Local Account!
        if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/network-request-failed') {
          return await this.signUpLocal(cleanEmail, password, safeDisplayName, preVerified);
        }
        throw err;
      }
    }
    return await this.signUpLocal(cleanEmail, password, safeDisplayName, preVerified);
  },

  async signUpLocal(email, password, displayName, preVerified = false) {
    const cleanEmail = email.trim().toLowerCase();
    const accounts = this.getLocalAccounts();
    const existing = accounts.find(a => a.email && a.email.toLowerCase() === cleanEmail);
    if (existing) {
      const err = new Error("Email already registered");
      err.code = 'auth/email-already-in-use';
      throw err;
    }

    const uid = "local-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
    const safeDisplayName = SecurityUtils.cleanText(displayName || cleanEmail.split('@')[0] || 'Creator', 50);
    const passwordHash = await SecurityUtils.hashPassword(password, uid);

    const user = {
      uid: uid,
      email: cleanEmail,
      displayName: safeDisplayName,
      photoURL: '',
      emailVerified: !!preVerified,
      isLocal: true
    };

    accounts.push({ ...user, passwordHash });
    try {
      localStorage.setItem("tra_local_accounts", JSON.stringify(accounts));
    } catch (e) {}
    this.currentUser = user;
    try {
      localStorage.setItem("tra_active_user", JSON.stringify(user));
    } catch (e) {}

    // Dispatch 6-digit OTP code to email if not pre-verified
    if (!preVerified) {
      try {
        await OtpService.generateOtp(cleanEmail, safeDisplayName);
      } catch (otpErr) {
        console.warn("OTP dispatch notice:", otpErr);
      }
    }

    this.notifyListeners();
    return user;
  },

  async loginLocal(email, password) {
    const cleanEmail = email.trim().toLowerCase();
    const accounts = this.getLocalAccounts();
    const found = accounts.find(a => a.email && a.email.toLowerCase() === cleanEmail);
    if (!found) {
      const err = new Error("Invalid email or password");
      err.code = 'auth/invalid-credential';
      throw err;
    }

    // Verify SHA-256 hash with salt
    const expectedHash = await SecurityUtils.hashPassword(password, found.uid);
    let isMatch = (found.passwordHash === expectedHash);

    // Backward compatibility: upgrade legacy base64 password to SHA-256 on successful login
    if (!isMatch && found.passwordHash === btoa(encodeURIComponent(password))) {
      isMatch = true;
      found.passwordHash = expectedHash;
      try {
        localStorage.setItem("tra_local_accounts", JSON.stringify(accounts));
      } catch (e) {}
    }

    if (!isMatch) {
      const err = new Error("Invalid email or password");
      err.code = 'auth/invalid-credential';
      throw err;
    }

    const user = {
      uid: found.uid,
      email: found.email,
      displayName: SecurityUtils.cleanText(found.displayName, 50),
      photoURL: SecurityUtils.sanitizeUrl(found.photoURL || ''),
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
    // 1. Rate Limiting: max 5 campaign creations per 60 seconds per user
    const rateCheck = SecurityUtils.checkRateLimit('create_campaign', 5, 60);
    if (!rateCheck.allowed) {
      throw new Error(`Rate limit exceeded. Please wait ${rateCheck.waitSeconds}s before publishing again.`);
    }

    let userCampaigns = [];
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) userCampaigns = JSON.parse(stored);
    } catch (e) {
      userCampaigns = [];
    }

    // 2. Strict Slug Validation (lowercase alphanumeric and hyphens only, max 60 chars)
    const rawSlug = typeof campaignData.slug === 'string' ? campaignData.slug : (campaignData.titleEn || "campaign");
    const safeSlug = rawSlug
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "campaign-" + Date.now();

    // 3. Frame URL Sanitization and Compression
    let frameUrl = SecurityUtils.sanitizeUrl(campaignData.frameUrl);
    if (!frameUrl || frameUrl === '#' || frameUrl.length > 3000000) {
      throw new Error("Invalid or excessively large frame image provided.");
    }
    if (frameUrl && frameUrl.length > 650000) {
      try {
        frameUrl = await this.compressFrameDataUrl(frameUrl);
      } catch (e) {}
    }

    const user = AuthService.currentUser;
    if (user && !AuthService.isEmailVerified()) {
      const isKm = typeof getLanguage === 'function' && getLanguage() === 'km';
      throw new Error(isKm 
        ? "សូមផ្ទៀងផ្ទាត់អ៊ីមែលរបស់អ្នកជាមុនសិន ទើបអាចបង្កើតយុទ្ធនាការបាន" 
        : "Email verification required. Please verify your email before publishing campaigns.");
    }
    const allowedCategories = ['education', 'culture', 'charity', 'sports', 'tech', 'celebration'];
    const safeCategory = allowedCategories.includes(campaignData.category) ? campaignData.category : 'celebration';

    // 4. Strict Whitelist Construction (Anti-Prototype Pollution & Field Injection)
    const rawId = typeof campaignData.id === 'string' ? campaignData.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) : '';
    const newCampaign = {
      id: rawId || "user-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      creatorUid: user ? user.uid : null,
      creatorEmail: user ? user.email : null,
      titleKm: SecurityUtils.cleanText(campaignData.titleKm || '', 120),
      titleEn: SecurityUtils.cleanText(campaignData.titleEn || '', 120),
      slug: safeSlug,
      category: safeCategory,
      creator: SecurityUtils.cleanText(campaignData.creator || (user ? user.displayName : 'Anonymous'), 80),
      descriptionKm: SecurityUtils.cleanText(campaignData.descriptionKm || '', 1000),
      descriptionEn: SecurityUtils.cleanText(campaignData.descriptionEn || '', 1000),
      captionKm: SecurityUtils.cleanText(campaignData.captionKm || campaignData.caption || '', 1000),
      captionEn: SecurityUtils.cleanText(campaignData.captionEn || campaignData.caption || '', 1000),
      frameUrl: frameUrl,
      supporters: Math.max(1, Math.min(10000000, parseInt(campaignData.supporters, 10) || 1)),
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

  async deleteCampaign(id) {
    if (!id || typeof id !== 'string') return false;
    const safeId = id.trim();
    try {
      const user = AuthService.currentUser;
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        let userCampaigns = JSON.parse(stored);
        const target = userCampaigns.find(c => c.id === safeId || c.slug === safeId);
        // IDOR Protection: Verify caller is owner of this campaign
        if (target && target.creatorUid && user && target.creatorUid !== user.uid) {
          console.warn("Unauthorized attempt to delete campaign:", safeId);
          return false;
        }

        userCampaigns = userCampaigns.filter(c => c.id !== safeId && c.slug !== safeId);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userCampaigns));

        // Delete from Cloud Firestore if authorized
        const db = initFirestore();
        if (db && target) {
          const docId = target.slug || target.id;
          db.collection("campaigns").doc(docId).delete()
            .then(() => console.log("🔥 Cloud campaign deleted:", docId))
            .catch(err => console.warn("Cloud Firestore delete notice:", err));
        }
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
    if (!id) return 1;
    const safeId = String(id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
    if (!safeId) return 1;

    // Rate Limiting / Anti-Spam: max 1 vote per campaign per 24 hours per client
    const rateCheck = SecurityUtils.checkRateLimit(`vote_${safeId}`, 1, 86400);
    const all = this.getCampaigns();
    const item = all.find(c => c.id === safeId || c.slug === safeId);

    if (!rateCheck.allowed) {
      // User has already supported recently, return current count without duplicate increment
      return item ? item.supporters : 1;
    }

    if (item) {
      item.supporters = (item.supporters || 0) + 1;
      // If it's in user campaigns, update it locally
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          let userCampaigns = JSON.parse(stored);
          const userIdx = userCampaigns.findIndex(c => c.id === safeId || c.slug === safeId);
          if (userIdx !== -1) {
            userCampaigns[userIdx].supporters = (userCampaigns[userIdx].supporters || 0) + 1;
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userCampaigns));
          }
        }
      } catch (e) {}

      // Atomic Cloud Increment (Safe against race conditions and concurrent votes)
      const db = initFirestore();
      if (db && (item.slug || item.id)) {
        const docId = item.slug || item.id;
        try {
          if (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue) {
            db.collection("campaigns").doc(docId).update({
              supporters: firebase.firestore.FieldValue.increment(1)
            }).catch(() => {});
          }
        } catch (e) {}
      }

      return item.supporters;
    }
    return 1;
  }
};
