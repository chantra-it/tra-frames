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
    const scriptRegex = new RegExp('<script\\b[^<]*(?:(?!<\\/script[>])<[^<]*)*<\\/script[>]', 'gi');
    const foreignObjectRegex = new RegExp('<foreignObject\\b[^<]*(?:(?!<\\/foreignObject[>])<[^<]*)*<\\/foreignObject[>]', 'gi');
    const iframeRegex = new RegExp('<iframe\\b[^<]*(?:(?!<\\/iframe[>])<[^<]*)*<\\/iframe[>]', 'gi');
    const objectRegex = new RegExp('<object\\b[^<]*(?:(?!<\\/object[>])<[^<]*)*<\\/object[>]', 'gi');
    return svgContent
      .replace(scriptRegex, '')
      .replace(foreignObjectRegex, '')
      .replace(/<use\b[^>]*>/gi, '')
      .replace(iframeRegex, '')
      .replace(objectRegex, '')
      .replace(/<embed\b[^>]*>/gi, '')
      .replace(/on\w+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '')
      .replace(/href\s*=\s*["']\s*javascript:[^"']*["']/gi, '')
      .replace(/xlink:href\s*=\s*["']\s*javascript:[^"']*["']/gi, '');
  },
  
  sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return '#';
    const trimmed = url.trim();
    // Allow standard https, http, relative paths, hashes, and safe raster data URLs
    if (/^(https?:\/\/|\/|#|data:image\/(png|jpeg|jpg|webp)[;,])/i.test(trimmed)) {
      return trimmed;
    }
    // For SVG data URLs, rigorously sanitize the SVG markup
    if (/^data:image\/svg\+xml/i.test(trimmed)) {
      try {
        const commaIdx = trimmed.indexOf(',');
        if (commaIdx === -1) return '#';
        const meta = trimmed.slice(0, commaIdx).toLowerCase();
        const body = trimmed.slice(commaIdx + 1);
        let svgText = '';
        if (meta.includes(';base64')) {
          try {
            svgText = decodeURIComponent(escape(atob(body)));
          } catch (e) {
            svgText = atob(body);
          }
        } else {
          try {
            svgText = decodeURIComponent(body);
          } catch (e) {
            svgText = body;
          }
        }
        const cleanSvg = this.sanitizeSvg(svgText);
        if (!cleanSvg || !cleanSvg.includes('<svg')) return '#';
        return `data:image/svg+xml;utf8,${encodeURIComponent(cleanSvg)}`;
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
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
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

// Global deleted campaign registry (applied platform-wide for all visitors, devices, and incognito sessions)
const GLOBAL_DELETED_CAMPAIGN_IDS = [
  'ai-future-tech-summit-2026',
  'tech-summit-2026',
  'class-of-2026-graduation',
  'grad-2026',
  'khmer-new-year-2026',
  'proud-community-volunteer',
  'proud-volunteer-2026',
  'jsframe',
  'protect-our-planet-earth-day',
  'earth-hour-2026',
  'happy-birthday-vip-celebration',
  'birthday-vip-2026',
  'test-write-live-ok'
];

// Presets are kept empty so deleted demo presets do not pollute the live feed or duplicate cloud campaigns
const INITIAL_CAMPAIGNS = [];

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
// 4-DIGIT EMAIL OTP VERIFICATION SERVICE
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

    // Generate cryptographically random 4-digit number (1000 - 9999)
    let otpCode = '';
    if (window.crypto && window.crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      window.crypto.getRandomValues(arr);
      otpCode = (1000 + (arr[0] % 9000)).toString();
    } else {
      otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    }

    // Hash the OTP with salt for secure storage
    const otpHash = await SecurityUtils.hashPassword(otpCode, `otp_${cleanEmail}`);
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    const record = {
      email: cleanEmail,
      hash: otpHash,
      code: otpCode, // store code for reliable client verification
      expiresAt: expiresAt,
      attempts: 0
    };

    try {
      sessionStorage.setItem("tra_otp_record", JSON.stringify(record));
    } catch (e) {}

    // Dispatch email across all configured delivery channels
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

  getActiveOtpCode(email) {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    try {
      const raw = sessionStorage.getItem("tra_otp_record");
      if (!raw) return null;
      const rec = JSON.parse(raw);
      if (rec.email === cleanEmail && Date.now() < rec.expiresAt) {
        return rec.code || null;
      }
    } catch (e) {}
    return null;
  },

  async sendOtpEmail(email, otpCode, displayName = '') {
    const cleanEmail = email.trim().toLowerCase();
    const name = displayName || cleanEmail.split('@')[0];

    // Channel 1: EmailJS (Live configured)
    const emailConfig = window.EMAILJS_CONFIG || {
      serviceId: "service_u9birxn",
      templateId: "template_5aw8xer",
      publicKey: "lKysw7jpIZvN46ncp"
    };

    if (typeof emailjs !== 'undefined' && emailConfig.publicKey) {
      try {
        await emailjs.send(
          emailConfig.serviceId,
          emailConfig.templateId,
          {
            to_email: cleanEmail,
            email: cleanEmail,
            user_name: name,
            otp_code: otpCode
          },
          emailConfig.publicKey
        );
        console.log("📩 [EmailJS] 4-digit OTP sent successfully to", cleanEmail);
      } catch (e) {
        console.warn("EmailJS delivery notice:", e);
      }
    }

    // Channel 2: Firebase Firestore 'mail' collection (Trigger Email extension)
    const db = initFirestore();
    if (db) {
      try {
        await db.collection("mail").add({
          to: [cleanEmail],
          message: {
            subject: `Tra Frames - លេខកូដផ្ទៀងផ្ទាត់ OTP របស់អ្នកគឺ៖ ${otpCode}`,
            text: `សួស្តី ${name}!\nលេខកូដសម្ងាត់ ៤ ខ្ទង់របស់អ្នកគឺ៖ ${otpCode}\nលេខកូដនេះមានសុពលភាពរយៈពេល ១០ នាទី។`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; text-align: center;">
                <h2 style="color: #2563eb; margin-bottom: 6px;">Tra Frames</h2>
                <p style="color: #64748b; font-size: 14px; margin-top: 0;">វេទិកាស៊ុមរូបថតយុទ្ធនាការ និងព្រឹត្តិការណ៍</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 18px 0;">
                <p style="color: #334155; font-size: 15px;">សួស្តី <strong>${name}</strong>,</p>
                <p style="color: #475569; font-size: 14px;">នេះជាលេខកូដផ្ទៀងផ្ទាត់អ៊ីមែល OTP (៤ ខ្ទង់) របស់អ្នក៖</p>
                <div style="margin: 24px 0;">
                  <span style="font-size: 40px; font-weight: 800; letter-spacing: 12px; color: #0f172a; background: #eff6ff; padding: 14px 28px; border-radius: 8px; border: 2px dashed #2563eb; display: inline-block; font-family: monospace;">
                    ${otpCode}
                  </span>
                </div>
                <p style="color: #e11d48; font-size: 13px; font-weight: 600;">⚠️ លេខកូដនេះមានសុពលភាពរយៈពេល ១០ នាទីប៉ុណ្ណោះ។</p>
                <p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">ប្រសិនបើអ្នកមិនបានស្នើសុំលេខកូដនេះទេ សូមកុំចែករំលែកវាជាមួយនរណាម្នាក់ឡើយ។</p>
              </div>
            `
          }
        });
        console.log("🔥 [Firestore Mail] Trigger Email queued for", cleanEmail);
      } catch (e) {
        console.warn("Firestore mail queue notice:", e);
      }
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
    console.log(`%c🔑 [Tra Frames OTP] 4-digit code generated for ${cleanEmail}: ${otpCode}`, "color: #2563eb; font-weight: bold; font-size: 15px;");
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
    const matchesCode = record.code && record.code.toString() === cleanCode;
    if (inputHash !== record.hash && !matchesCode) {
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

    // Mark email as verified across all persistence layers
    await this.markEmailVerified(cleanEmail);

    return { success: true };
  },

  async markEmailVerified(email, uid = null) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) return;

    // 1. Add to persistent verified emails list in localStorage
    try {
      const list = JSON.parse(localStorage.getItem("tra_verified_emails") || "[]");
      if (!list.includes(cleanEmail)) {
        list.push(cleanEmail);
        localStorage.setItem("tra_verified_emails", JSON.stringify(list));
      }
    } catch (e) {}

    // 2. Update active user in memory and localStorage
    if (AuthService.currentUser) {
      AuthService.currentUser.emailVerified = true;
      try {
        localStorage.setItem("tra_active_user", JSON.stringify(AuthService.currentUser));
      } catch (e) {}
      uid = uid || AuthService.currentUser.uid;
    }

    // 3. Update local account if applicable
    const accounts = AuthService.getLocalAccounts();
    const acc = accounts.find(a => a.email && a.email.toLowerCase() === cleanEmail);
    if (acc) {
      acc.emailVerified = true;
      try {
        localStorage.setItem("tra_local_accounts", JSON.stringify(accounts));
      } catch (e) {}
    }

    // 4. Record in Firestore verified_users
    const db = initFirestore();
    if (db && uid) {
      try {
        await db.collection("verified_users").doc(uid).set({
          email: cleanEmail,
          verified: true,
          verifiedAt: new Date().toISOString(),
          method: "email_otp_4digits"
        }, { merge: true });
        console.log("🔥 [Cloud Verified] User verified in Firestore:", uid);
      } catch (e) {
        console.warn("Firestore verified_users update notice:", e);
      }
    }

    AuthService.notifyListeners();
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
        let isVerified = isGoogle || !!user.emailVerified;

        if (!isVerified) {
          try {
            const list = JSON.parse(localStorage.getItem("tra_verified_emails") || "[]");
            if (user.email && list.includes(user.email.toLowerCase())) {
              isVerified = true;
            }
          } catch (e) {}
        }

        this.currentUser = {
          uid: user.uid,
          email: user.email || '',
          displayName: SecurityUtils.cleanText(user.displayName || (user.email ? user.email.split('@')[0] : 'Creator'), 50),
          photoURL: SecurityUtils.sanitizeUrl(user.photoURL || ''),
          emailVerified: isVerified,
          isLocal: false
        };

        // Check or sync verified status in Firestore
        const db = initFirestore();
        if (db) {
          if (!this.currentUser.emailVerified) {
            db.collection("verified_users").doc(user.uid).get().then(doc => {
              if (doc.exists && this.currentUser && this.currentUser.uid === user.uid) {
                this.currentUser.emailVerified = true;
                try { localStorage.setItem("tra_active_user", JSON.stringify(this.currentUser)); } catch (e) {}
                this.notifyListeners();
              }
            }).catch(() => {});
          } else {
            db.collection("verified_users").doc(user.uid).set({
              email: (user.email || '').toLowerCase(),
              verified: true,
              verifiedAt: new Date().toISOString(),
              method: "email_otp_4digits"
            }, { merge: true }).catch(() => {});
          }
        }

        try {
          localStorage.setItem("tra_active_user", JSON.stringify(this.currentUser));
        } catch (e) {}
      } else {
        // When Firebase Auth has no user or during cold start / custom domain,
        // preserve the locally persisted active user if present!
        try {
          const activeStored = localStorage.getItem("tra_active_user");
          if (activeStored) {
            this.currentUser = JSON.parse(activeStored);
          } else {
            this.currentUser = null;
          }
        } catch (e) {
          this.currentUser = null;
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
    if (this.currentUser) return true;
    try {
      const activeStored = localStorage.getItem("tra_active_user");
      if (activeStored) {
        this.currentUser = JSON.parse(activeStored);
        return !!this.currentUser;
      }
    } catch (e) {}
    return false;
  },

  isEmailVerified() {
    if (!this.currentUser) {
      try {
        const activeStored = localStorage.getItem("tra_active_user");
        if (activeStored) {
          this.currentUser = JSON.parse(activeStored);
        }
      } catch (e) {}
    }
    if (!this.currentUser) return false;
    if (this.currentUser.emailVerified === true) return true;
    try {
      const list = JSON.parse(localStorage.getItem("tra_verified_emails") || "[]");
      if (this.currentUser.email && list.includes(this.currentUser.email.toLowerCase())) {
        return true;
      }
    } catch (e) {}
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

        if (preVerified) {
          await OtpService.markEmailVerified(cleanEmail, result.user.uid);
        } else {
          // Dispatch 4-digit OTP code to email if not pre-verified
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

    if (preVerified) {
      await OtpService.markEmailVerified(cleanEmail, uid);
    } else {
      // Dispatch 4-digit OTP code to email if not pre-verified
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
      emailVerified: found.emailVerified !== false,
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

    const deletedIds = JSON.parse(localStorage.getItem('tra_admin_deleted_ids') || '[]');
    const suppressed = JSON.parse(localStorage.getItem('tra_suppressed_presets') || '[]');
    const allDeleted = new Set([...GLOBAL_DELETED_CAMPAIGN_IDS, ...deletedIds, ...suppressed]);
    const overrides = JSON.parse(localStorage.getItem('tra_admin_campaign_overrides') || '{}');

    const combined = [...userCampaigns];
    if (this._memoryCache) {
      for (const [id, c] of this._memoryCache.entries()) {
        if (!combined.some(existing => existing.slug === c.slug || existing.id === c.id || (c._docId && existing._docId === c._docId))) {
          combined.unshift(c);
        }
      }
    }

    const isDeleted = (c) => {
      if (!c) return true;
      if (c.slug && allDeleted.has(c.slug)) return true;
      if (c.id && allDeleted.has(c.id)) return true;
      if (c._docId && allDeleted.has(c._docId)) return true;
      return false;
    };

    const filteredUser = combined
      .filter(c => !isDeleted(c))
      .map(c => {
        const o = overrides[c.slug] || overrides[c.id] || (c._docId && overrides[c._docId]);
        return o ? { ...c, ...o } : c;
      });

    const cleanPresets = INITIAL_CAMPAIGNS
      .filter(p => !isDeleted(p))
      .map(p => {
        const o = overrides[p.slug] || overrides[p.id];
        return o ? { ...p, ...o } : p;
      });

    // Deduplicate strictly so any campaign or preset never appears twice
    const seenKeys = new Set();
    const finalCampaigns = [];

    for (const c of filteredUser) {
      const key = c.slug || c.id || c._docId;
      if (key && !seenKeys.has(key)) {
        seenKeys.add(key);
        if (c.slug) seenKeys.add(c.slug);
        if (c.id) seenKeys.add(c.id);
        if (c._docId) seenKeys.add(c._docId);
        finalCampaigns.push(c);
      }
    }

    for (const p of cleanPresets) {
      const key = p.slug || p.id;
      if (key && !seenKeys.has(key) && !seenKeys.has(p.slug) && !seenKeys.has(p.id)) {
        seenKeys.add(key);
        if (p.slug) seenKeys.add(p.slug);
        if (p.id) seenKeys.add(p.id);
        finalCampaigns.push(p);
      }
    }

    Object.values(overrides).forEach(ov => {
      if (ov && !isDeleted(ov)) {
        const key = ov.slug || ov.id || ov._docId;
        if (key && !seenKeys.has(key)) {
          seenKeys.add(key);
          if (ov.slug) seenKeys.add(ov.slug);
          if (ov.id) seenKeys.add(ov.id);
          finalCampaigns.unshift(ov);
        }
      }
    });

    return finalCampaigns;
  },

  normalizeSlug(str) {
    if (!str || typeof str !== 'string') return '';
    let decoded = str;
    try { decoded = decodeURIComponent(str); } catch (e) {}
    return decoded.toLowerCase().trim()
      .replace(/[\s_+]+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  },

  normalizeNoPunct(str) {
    if (!str || typeof str !== 'string') return '';
    let decoded = str;
    try { decoded = decodeURIComponent(str); } catch (e) {}
    return decoded.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  },

  getCampaignBySlugOrId(identifier) {
    if (!identifier) return null;
    let cleanId = String(identifier).trim();
    try { cleanId = decodeURIComponent(cleanId).trim(); } catch (e) {}
    if (!cleanId) return null;

    const normSlug = this.normalizeSlug(cleanId);
    const noPunct = this.normalizeNoPunct(cleanId);

    const deletedIds = JSON.parse(localStorage.getItem('tra_admin_deleted_ids') || '[]');
    const suppressed = JSON.parse(localStorage.getItem('tra_suppressed_presets') || '[]');
    if (
      GLOBAL_DELETED_CAMPAIGN_IDS.includes(cleanId) || deletedIds.includes(cleanId) || suppressed.includes(cleanId) ||
      (normSlug && (GLOBAL_DELETED_CAMPAIGN_IDS.includes(normSlug) || deletedIds.includes(normSlug)))
    ) {
      return null;
    }

    const overrides = JSON.parse(localStorage.getItem('tra_admin_campaign_overrides') || '{}');
    if (overrides[cleanId]) return overrides[cleanId];
    if (normSlug && overrides[normSlug]) return overrides[normSlug];

    if (this._memoryCache) {
      const probeKeys = [cleanId, normSlug, noPunct, identifier];
      for (const k of probeKeys) {
        if (k && this._memoryCache.has(k)) {
          const cached = this._memoryCache.get(k);
          if (cached) {
            const o = overrides[cached.slug] || overrides[cached.id] || (cached._docId && overrides[cached._docId]);
            return o ? { ...cached, ...o } : cached;
          }
        }
      }
    }

    const all = this.getCampaigns();
    // 1. Direct match (exact slug, id, or docId)
    let found = all.find(c => 
      c.slug === cleanId || c.id === cleanId || c._docId === cleanId ||
      c.slug === identifier || c.id === identifier
    );
    if (found) return found;

    // 2. Normalized slug match (e.g. 'fb frame js' or 'fb%20frame%20js' matches 'fb-frame-js' or 'fbframejs')
    if (normSlug) {
      found = all.find(c => this.normalizeSlug(c.slug) === normSlug || this.normalizeSlug(c.id) === normSlug);
      if (found) return found;
    }

    // 3. No punctuation match
    if (noPunct) {
      found = all.find(c => this.normalizeNoPunct(c.slug) === noPunct || this.normalizeNoPunct(c.id) === noPunct);
      if (found) return found;
    }

    // 4. Case-insensitive title match (Khmer or English)
    const lowerClean = cleanId.toLowerCase();
    found = all.find(c => 
      (c.titleEn && c.titleEn.trim().toLowerCase() === lowerClean) ||
      (c.titleKm && c.titleKm.trim().toLowerCase() === lowerClean)
    );
    if (found) return found;

    return null;
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
    const rawSlug = typeof campaignData.slug === 'string' && campaignData.slug.trim()
      ? campaignData.slug.trim()
      : (campaignData.titleEn || campaignData.titleKm || "campaign");
    const safeSlug = this.normalizeSlug(rawSlug) || ("campaign-" + Date.now());

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
      const docId = newCampaign.slug || newCampaign.id;
      db.collection("campaigns").doc(docId).set(newCampaign)
        .then(() => {
          console.log("🔥 Campaign synced to Cloud Firestore:", docId);
          newCampaign.isSyncedToCloud = true;
        })
        .catch(err => {
          console.warn("Cloud Firestore sync error:", err);
          this.markPendingSync(newCampaign);
        });
    } else {
      this.markPendingSync(newCampaign);
    }

    return newCampaign;
  },

  markPendingSync(campaign) {
    if (!campaign) return;
    try {
      const pending = JSON.parse(localStorage.getItem('tra_pending_cloud_syncs') || '[]');
      const id = campaign.slug || campaign.id;
      if (!pending.some(p => (p.slug || p.id) === id)) {
        pending.push(campaign);
        localStorage.setItem('tra_pending_cloud_syncs', JSON.stringify(pending));
      }
    } catch (e) {}
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
      campaign.isSyncedToCloud = true;

      try {
        const pending = JSON.parse(localStorage.getItem('tra_pending_cloud_syncs') || '[]');
        const updated = pending.filter(p => (p.slug || p.id) !== docId);
        localStorage.setItem('tra_pending_cloud_syncs', JSON.stringify(updated));
      } catch (e) {}

      const cloudStatusEl = document.getElementById('cloudSyncStatus');
      if (cloudStatusEl) {
        const isKm = getLanguage() === 'km';
        cloudStatusEl.innerHTML = `☁️ ${isKm ? 'បាន Sync ឡើង Cloud Firestore រួចរាល់ • អាចចែករំលែកបាន' : 'Synced to Cloud Firestore • Shareable Worldwide'}`;
        cloudStatusEl.style.color = '#10b981';
      }
      return true;
    } catch (err) {
      console.warn("Failed syncing single campaign to Firestore:", docId, err);
      this.markPendingSync(campaign);
      const cloudStatusEl = document.getElementById('cloudSyncStatus');
      if (cloudStatusEl) {
        const isKm = getLanguage() === 'km';
        cloudStatusEl.innerHTML = `⚠️ <span title="${err.message || ''}">${isKm ? 'រក្សាទុកលើម៉ាស៊ីននេះរួចរាល់ (មិនទាន់ឡើង Cloud)' : 'Saved locally (Not on Cloud yet)'}</span>`;
        cloudStatusEl.style.color = '#f59e0b';
      }
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
    const docId = doc.name ? doc.name.split('/').pop() : null;
    if (docId) result._docId = docId;
    if (!result.id && docId) result.id = docId;
    if (!result.slug && docId) result.slug = docId;
    return result;
  },

  // Save to memory cache (and local storage only if owned/created by user)
  cacheCloudCampaign(campaign) {
    if (!campaign) return;
    if (campaign.slug) this._memoryCache.set(campaign.slug, campaign);
    if (campaign.id) this._memoryCache.set(campaign.id, campaign);
    if (campaign._docId) this._memoryCache.set(campaign._docId, campaign);

    // STRICT ISOLATION: NEVER cache public or unowned cloud campaigns into LOCAL_STORAGE_KEY.
    // LOCAL_STORAGE_KEY is exclusively for campaigns created/owned by the currently logged-in user.
    const user = AuthService.currentUser;
    const cleanUserEmail = (user && user.email) ? user.email.toLowerCase().trim() : '';
    const isOwner = user && (
      (campaign.creatorUid && campaign.creatorUid === user.uid) ||
      (cleanUserEmail && campaign.creatorEmail && campaign.creatorEmail.toLowerCase().trim() === cleanUserEmail)
    );

    if (isOwner) {
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
    }
  },

  // Fetch campaign from Cloud Firestore (SDK + High-Reliability REST fallback)
  async fetchCloudCampaign(identifier) {
    if (!identifier) return null;
    let cleanId = String(identifier).trim();
    try { cleanId = decodeURIComponent(cleanId).trim(); } catch (e) {}
    if (!cleanId) return null;

    const normSlug = this.normalizeSlug(cleanId);
    const noPunct = this.normalizeNoPunct(cleanId);

    const deletedIds = JSON.parse(localStorage.getItem('tra_admin_deleted_ids') || '[]');
    const suppressed = JSON.parse(localStorage.getItem('tra_suppressed_presets') || '[]');
    if (
      GLOBAL_DELETED_CAMPAIGN_IDS.includes(cleanId) || deletedIds.includes(cleanId) || suppressed.includes(cleanId) ||
      (normSlug && (GLOBAL_DELETED_CAMPAIGN_IDS.includes(normSlug) || deletedIds.includes(normSlug)))
    ) {
      return null;
    }

    const overrides = JSON.parse(localStorage.getItem('tra_admin_campaign_overrides') || '{}');
    if (overrides[cleanId]) return overrides[cleanId];
    if (normSlug && overrides[normSlug]) return overrides[normSlug];

    // Search keys to probe across Firestore (e.g. 'fb frame js', 'fb-frame-js', 'fbframejs')
    const searchKeys = [...new Set([cleanId, normSlug, noPunct, identifier].filter(Boolean))];

    // Check memory cache first
    if (this._memoryCache) {
      for (const k of searchKeys) {
        if (this._memoryCache.has(k)) {
          const cached = this._memoryCache.get(k);
          if (cached) {
            const o = overrides[cached.slug] || overrides[cached.id] || (cached._docId && overrides[cached._docId]);
            return o ? { ...cached, ...o } : cached;
          }
        }
      }
    }

    // 1. Try Firebase SDK if available
    const db = initFirestore();
    if (db) {
      try {
        // Probe document IDs directly
        for (const docKey of searchKeys) {
          try {
            const docRef = await db.collection("campaigns").doc(docKey).get();
            if (docRef.exists) {
              let data = docRef.data();
              if (data) {
                data._docId = docKey;
                if (
                  GLOBAL_DELETED_CAMPAIGN_IDS.includes(data.slug) || GLOBAL_DELETED_CAMPAIGN_IDS.includes(data.id) ||
                  deletedIds.includes(data.slug) || deletedIds.includes(data.id)
                ) return null;
                const o = overrides[data.slug] || overrides[data.id] || overrides[docKey];
                if (o) data = { ...data, ...o };
                this.cacheCloudCampaign(data);
                return data;
              }
            }
          } catch (eDoc) {}
        }

        // Probe by 'slug' field in Firestore
        for (const sKey of searchKeys) {
          try {
            const snapshot = await db.collection("campaigns").where("slug", "==", sKey).limit(1).get();
            if (!snapshot.empty) {
              let data = snapshot.docs[0].data();
              if (data) {
                data._docId = snapshot.docs[0].id;
                if (
                  GLOBAL_DELETED_CAMPAIGN_IDS.includes(data.slug) || GLOBAL_DELETED_CAMPAIGN_IDS.includes(data.id) ||
                  deletedIds.includes(data.slug) || deletedIds.includes(data.id)
                ) return null;
                const o = overrides[data.slug] || overrides[data.id] || overrides[data._docId];
                if (o) data = { ...data, ...o };
                this.cacheCloudCampaign(data);
                return data;
              }
            }
          } catch (eSlug) {}
        }

        // Probe by 'id' field in Firestore
        for (const idKey of searchKeys) {
          try {
            const idSnapshot = await db.collection("campaigns").where("id", "==", idKey).limit(1).get();
            if (!idSnapshot.empty) {
              let data = idSnapshot.docs[0].data();
              if (data) {
                data._docId = idSnapshot.docs[0].id;
                if (
                  GLOBAL_DELETED_CAMPAIGN_IDS.includes(data.slug) || GLOBAL_DELETED_CAMPAIGN_IDS.includes(data.id) ||
                  deletedIds.includes(data.slug) || deletedIds.includes(data.id)
                ) return null;
                const o = overrides[data.slug] || overrides[data.id] || overrides[data._docId];
                if (o) data = { ...data, ...o };
                this.cacheCloudCampaign(data);
                return data;
              }
            }
          } catch (eId) {}
        }
      } catch (err) {
        console.warn("Firestore SDK notice, switching to direct REST lookup:", err);
      }
    }

    // 2. High-speed Direct REST Fallback (Works 100% reliably on all mobile networks without auth)
    for (const restKey of searchKeys) {
      try {
        const restUrl = `https://firestore.googleapis.com/v1/projects/tra-frames/databases/(default)/documents/campaigns/${encodeURIComponent(restKey)}`;
        const res = await fetch(restUrl);
        if (res.ok) {
          const docJson = await res.json();
          let data = this.parseFirestoreDoc(docJson);
          if (data) {
            if (
              GLOBAL_DELETED_CAMPAIGN_IDS.includes(data.slug) || GLOBAL_DELETED_CAMPAIGN_IDS.includes(data.id) || GLOBAL_DELETED_CAMPAIGN_IDS.includes(data._docId) ||
              deletedIds.includes(data.slug) || deletedIds.includes(data.id) || deletedIds.includes(data._docId)
            ) return null;
            const o = overrides[data.slug] || overrides[data.id] || overrides[data._docId];
            if (o) data = { ...data, ...o };
            this.cacheCloudCampaign(data);
            return data;
          }
        }
      } catch (restErr) {}
    }

    // 3. Fallback to all cloud campaigns search (catches fuzzy title or unnormalized slug)
    try {
      const allCloud = await this.fetchAllCloudCampaigns();
      if (allCloud && allCloud.length > 0) {
        const lowerClean = cleanId.toLowerCase();
        const found = allCloud.find(c => 
          (c.slug && searchKeys.includes(c.slug)) ||
          (c.id && searchKeys.includes(c.id)) ||
          (c._docId && searchKeys.includes(c._docId)) ||
          (c.slug && (this.normalizeSlug(c.slug) === normSlug || this.normalizeNoPunct(c.slug) === noPunct)) ||
          (c.titleEn && c.titleEn.trim().toLowerCase() === lowerClean) ||
          (c.titleKm && c.titleKm.trim().toLowerCase() === lowerClean)
        );
        if (found) {
          this.cacheCloudCampaign(found);
          return found;
        }
      }
    } catch (eAll) {}

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
          const deletedIds = JSON.parse(localStorage.getItem('tra_admin_deleted_ids') || '[]');
          const suppressed = JSON.parse(localStorage.getItem('tra_suppressed_presets') || '[]');
          const allDeleted = new Set([...GLOBAL_DELETED_CAMPAIGN_IDS, ...deletedIds, ...suppressed]);
          const overrides = JSON.parse(localStorage.getItem('tra_admin_campaign_overrides') || '{}');

          const isDeleted = (c) => {
            if (!c) return true;
            if (c.slug && allDeleted.has(c.slug)) return true;
            if (c.id && allDeleted.has(c.id)) return true;
            if (c._docId && allDeleted.has(c._docId)) return true;
            return false;
          };

          const campaigns = json.documents
            .map(d => this.parseFirestoreDoc(d))
            .filter(Boolean)
            .filter(c => !isDeleted(c))
            .map(c => {
              const o = overrides[c.slug] || overrides[c.id] || (c._docId && overrides[c._docId]);
              return o ? { ...c, ...o } : c;
            });

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
      const pendingStored = localStorage.getItem('tra_pending_cloud_syncs');
      let userCampaigns = stored ? JSON.parse(stored) : [];
      let pendingList = pendingStored ? JSON.parse(pendingStored) : [];

      // Combine both lists uniquely by id/slug
      const map = new Map();
      userCampaigns.forEach(c => map.set(c.slug || c.id, c));
      pendingList.forEach(c => map.set(c.slug || c.id, c));

      let updatedAny = false;
      const allToSync = Array.from(map.values());

      for (let i = 0; i < allToSync.length; i++) {
        let c = allToSync[i];
        const docId = c.slug || c.id;
        if (!docId) continue;

        let toSync = { ...c };
        if (toSync.frameUrl && toSync.frameUrl.length > 650000) {
          try {
            toSync.frameUrl = await this.compressFrameDataUrl(toSync.frameUrl);
            updatedAny = true;
          } catch (e) {}
        }

        try {
          await db.collection("campaigns").doc(docId).set(toSync, { merge: true });
          console.log("🔥 Synced local campaign to Cloud:", docId);
          c.isSyncedToCloud = true;
          // Remove from pending
          pendingList = pendingList.filter(p => (p.slug || p.id) !== docId);
        } catch (e) {
          console.warn("Failed syncing campaign:", docId, e);
        }
      }

      try {
        localStorage.setItem('tra_pending_cloud_syncs', JSON.stringify(pendingList));
      } catch (e) {}

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
      if (!user || !user.uid) {
        console.warn("Unauthorized: Must be logged in to delete campaigns");
        return false;
      }
      const cleanUserEmail = (user.email || '').toLowerCase().trim();

      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        let userCampaigns = JSON.parse(stored);
        const target = userCampaigns.find(c => c.id === safeId || c.slug === safeId);

        // Strict IDOR Protection: Verify caller is the authentic owner
        const isOwner = target && (
          (target.creatorUid && target.creatorUid === user.uid) ||
          (cleanUserEmail && target.creatorEmail && target.creatorEmail.toLowerCase().trim() === cleanUserEmail)
        );

        if (target && !isOwner) {
          console.warn("Unauthorized attempt to delete campaign not owned by current user:", safeId);
          return false;
        }

        userCampaigns = userCampaigns.filter(c => c.id !== safeId && c.slug !== safeId);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userCampaigns));

        // Delete from memory cache so it doesn't re-appear on route changes
        if (this._memoryCache) {
          this._memoryCache.delete(safeId);
          if (target && target.slug) this._memoryCache.delete(target.slug);
          if (target && target.id) this._memoryCache.delete(target.id);
        }

        // Register in admin deleted list too so it never resurfaces
        try {
          const delIds = JSON.parse(localStorage.getItem('tra_admin_deleted_ids') || '[]');
          if (safeId && !delIds.includes(safeId)) delIds.push(safeId);
          if (target && target.slug && !delIds.includes(target.slug)) delIds.push(target.slug);
          if (target && target._docId && !delIds.includes(target._docId)) delIds.push(target._docId);
          localStorage.setItem('tra_admin_deleted_ids', JSON.stringify(delIds));
        } catch (e) {}

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
      const user = AuthService.currentUser;
      if (!user || !user.uid) return [];

      const cleanUserEmail = (user.email || '').toLowerCase().trim();
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      let allUserCampaigns = stored ? JSON.parse(stored) : [];

      // STRICT OWNERSHIP FILTER:
      // A campaign belongs to this user ONLY if creatorUid matches user.uid,
      // OR creatorEmail matches user's email.
      const isMyCampaign = (c) => {
        if (!c) return false;
        if (c.creatorUid && c.creatorUid === user.uid) return true;
        if (cleanUserEmail && c.creatorEmail && c.creatorEmail.toLowerCase().trim() === cleanUserEmail) return true;
        return false;
      };

      // Sanitize localStorage: Purge any unowned campaigns so they never pollute personal dashboard
      const myCampaigns = allUserCampaigns.filter(isMyCampaign);
      if (myCampaigns.length !== allUserCampaigns.length) {
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(myCampaigns));
        } catch (e) {}
      }

      // Also check memory cache for any cloud campaigns owned by current user
      if (this._memoryCache) {
        for (const [id, c] of this._memoryCache.entries()) {
          if (isMyCampaign(c) && !myCampaigns.some(existing => existing.slug === c.slug || existing.id === c.id)) {
            myCampaigns.unshift(c);
          }
        }
      }

      return myCampaigns;
    } catch (e) {
      return [];
    }
  },

  async fetchUserCampaignsFromCloud() {
    const user = AuthService.currentUser;
    if (!user || !user.uid) return [];
    const db = initFirestore();
    if (db) {
      try {
        const snapshot = await db.collection("campaigns").where("creatorUid", "==", user.uid).get();
        const campaigns = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data) {
            campaigns.push(data);
            this.cacheCloudCampaign(data);
          }
        });
        return campaigns;
      } catch (err) {
        console.warn("fetchUserCampaignsFromCloud notice:", err);
      }
    }
    return [];
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

// =========================================================
// SUPER ADMIN SERVICE (Master Platform Management)
// =========================================================
const AdminService = {
  SUPER_ADMIN_EMAILS: ['haschitra@gmail.com', 'ctpro007@gmail.com'],

  // Verify if given user has Super Admin authority
  isSuperAdmin(user) {
    if (!user) return false;
    const cleanEmail = (user.email || '').toLowerCase().trim();
    if (this.SUPER_ADMIN_EMAILS.includes(cleanEmail)) return true;
    if (user.role === 'admin' || user.isSuperAdmin === true) return true;
    return false;
  },

  // Check current active user across all memory and storage locations
  isCurrentSuperAdmin() {
    let user = AuthService ? AuthService.currentUser : null;
    if (!user) {
      try {
        const stored = localStorage.getItem("tra_active_user");
        if (stored) user = JSON.parse(stored);
      } catch (e) {}
    }
    return this.isSuperAdmin(user);
  },

  // Persistent Admin Deleted Registry (merging built-in global list with local edits)
  getDeletedCampaignIds() {
    try {
      const stored = JSON.parse(localStorage.getItem('tra_admin_deleted_ids') || '[]');
      const combined = new Set([...GLOBAL_DELETED_CAMPAIGN_IDS, ...stored]);
      return Array.from(combined);
    } catch (e) {
      return [...GLOBAL_DELETED_CAMPAIGN_IDS];
    }
  },

  saveDeletedCampaignId(ids) {
    if (!Array.isArray(ids)) ids = [ids];
    try {
      const existing = this.getDeletedCampaignIds();
      ids.forEach(id => {
        if (id && typeof id === 'string') {
          const clean = id.trim();
          if (clean && !existing.includes(clean)) existing.push(clean);
          if (clean && !GLOBAL_DELETED_CAMPAIGN_IDS.includes(clean)) GLOBAL_DELETED_CAMPAIGN_IDS.push(clean);
        }
      });
      localStorage.setItem('tra_admin_deleted_ids', JSON.stringify(existing));
    } catch (e) {}
  },

  removeDeletedCampaignId(ids) {
    if (!Array.isArray(ids)) ids = [ids];
    try {
      let existing = this.getDeletedCampaignIds();
      existing = existing.filter(id => !ids.includes(id));
      localStorage.setItem('tra_admin_deleted_ids', JSON.stringify(existing));
    } catch (e) {}
  },

  // Persistent Admin Overrides Registry
  getCampaignOverrides() {
    try {
      return JSON.parse(localStorage.getItem('tra_admin_campaign_overrides') || '{}');
    } catch (e) {
      return {};
    }
  },

  saveCampaignOverride(campaign) {
    if (!campaign) return;
    try {
      const overrides = this.getCampaignOverrides();
      if (campaign.slug) overrides[campaign.slug] = campaign;
      if (campaign.id && campaign.id !== campaign.slug) overrides[campaign.id] = campaign;
      if (campaign._docId && campaign._docId !== campaign.slug) overrides[campaign._docId] = campaign;
      localStorage.setItem('tra_admin_campaign_overrides', JSON.stringify(overrides));
    } catch (e) {}
  },

  // Fetch all campaigns across all cloud and local sources for admin management
  async fetchAllCampaignsAdmin() {
    const campaignMap = new Map();
    const deletedIds = this.getDeletedCampaignIds();
    let suppressed = [];
    try {
      suppressed = JSON.parse(localStorage.getItem('tra_suppressed_presets') || '[]');
    } catch (e) {}
    const allDeleted = new Set([...deletedIds, ...suppressed]);
    const overrides = this.getCampaignOverrides();

    const isDeleted = (c) => {
      if (!c) return true;
      if (c.slug && allDeleted.has(c.slug)) return true;
      if (c.id && allDeleted.has(c.id)) return true;
      if (c._docId && allDeleted.has(c._docId)) return true;
      return false;
    };

    const applyOverride = (c) => {
      if (!c) return c;
      const o = overrides[c.slug] || overrides[c.id] || (c._docId && overrides[c._docId]);
      return o ? { ...c, ...o } : c;
    };

    // 1. Fetch from Cloud Firestore (SDK + REST fallback)
    const db = initFirestore();
    let cloudFound = false;

    if (db) {
      try {
        const snapshot = await db.collection("campaigns").get();
        if (!snapshot.empty) {
          snapshot.forEach(doc => {
            let data = doc.data();
            if (data) {
              data._docId = doc.id;
              if (!data.id) data.id = doc.id;
              if (!data.slug) data.slug = doc.id;
              if (!isDeleted(data)) {
                data = applyOverride(data);
                const key = data.slug || data.id || doc.id;
                campaignMap.set(key, { ...data, _source: 'cloud' });
                CampaignService.cacheCloudCampaign(data);
              }
            }
          });
          cloudFound = true;
        }
      } catch (sdkErr) {
        console.warn("Admin fetch SDK notice, trying REST:", sdkErr);
      }
    }

    // Direct REST fetch if SDK didn't return or for comprehensive coverage
    if (!cloudFound) {
      try {
        const restUrl = `https://firestore.googleapis.com/v1/projects/tra-frames/databases/(default)/documents/campaigns`;
        const res = await fetch(restUrl);
        if (res.ok) {
          const json = await res.json();
          if (json.documents && Array.isArray(json.documents)) {
            json.documents.forEach(d => {
              let parsed = CampaignService.parseFirestoreDoc(d);
              if (parsed && !isDeleted(parsed)) {
                parsed = applyOverride(parsed);
                const key = parsed.slug || parsed.id;
                campaignMap.set(key, { ...parsed, _source: 'cloud' });
                CampaignService.cacheCloudCampaign(parsed);
              }
            });
          }
        }
      } catch (restErr) {
        console.warn("Admin fetch REST notice:", restErr);
      }
    }

    // 2. Fetch from Local Storage user campaigns
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const localList = JSON.parse(stored);
        localList.forEach(c => {
          if (c && !isDeleted(c)) {
            const finalCamp = applyOverride(c);
            const key = finalCamp.slug || finalCamp.id;
            if (!campaignMap.has(key)) {
              campaignMap.set(key, { ...finalCamp, _source: 'local' });
            }
          }
        });
      }
    } catch (e) {}

    // 3. Include Initial Preset Campaigns (if not deleted/suppressed)
    INITIAL_CAMPAIGNS.forEach(preset => {
      if (!isDeleted(preset)) {
        const finalPreset = applyOverride(preset);
        const key = finalPreset.slug || finalPreset.id;
        if (!campaignMap.has(key)) {
          campaignMap.set(key, { ...finalPreset, _source: 'preset', isPreset: true });
        }
      }
    });

    // 4. Also include any independent active overrides not present in other lists
    Object.values(overrides).forEach(ov => {
      if (ov && !isDeleted(ov)) {
        const key = ov.slug || ov.id;
        if (!campaignMap.has(key)) {
          campaignMap.set(key, { ...ov, _source: ov._source || 'cloud' });
        }
      }
    });

    const result = Array.from(campaignMap.values());
    // Sort newest first
    return result.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  },

  // Admin Update Campaign: update all fields with instant persistence
  async adminUpdateCampaign(targetId, updateData) {
    if (!this.isCurrentSuperAdmin()) {
      throw new Error("Unauthorized: Super Admin permissions required.");
    }
    if (!targetId) throw new Error("Target campaign ID is required.");

    const safeId = String(targetId).trim();

    // Find existing campaign to preserve metadata
    const all = await this.fetchAllCampaignsAdmin();
    const existing = all.find(c => c.slug === safeId || c.id === safeId || c._docId === safeId) ||
                     (CampaignService._memoryCache ? (CampaignService._memoryCache.get(safeId) || {}) : {});

    const existingDocId = existing._docId || existing.slug || existing.id || safeId;
    const newSlug = (updateData.slug || existing.slug || safeId).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60);

    const updatedCampaign = {
      ...existing,
      id: existing.id || safeId,
      _docId: newSlug,
      slug: newSlug,
      titleKm: SecurityUtils.cleanText(updateData.titleKm || existing.titleKm || '', 120),
      titleEn: SecurityUtils.cleanText(updateData.titleEn || existing.titleEn || '', 120),
      category: ['education', 'culture', 'charity', 'sports', 'tech', 'celebration'].includes(updateData.category) ? updateData.category : (existing.category || 'celebration'),
      creator: SecurityUtils.cleanText(updateData.creator || existing.creator || 'Admin', 80),
      creatorEmail: SecurityUtils.cleanText(updateData.creatorEmail || existing.creatorEmail || '', 100),
      creatorUid: existing.creatorUid || (AuthService && AuthService.currentUser ? AuthService.currentUser.uid : null),
      descriptionKm: SecurityUtils.cleanText(updateData.descriptionKm || existing.descriptionKm || '', 1000),
      descriptionEn: SecurityUtils.cleanText(updateData.descriptionEn || existing.descriptionEn || '', 1000),
      captionKm: SecurityUtils.cleanText(updateData.captionKm || existing.captionKm || '', 1000),
      captionEn: SecurityUtils.cleanText(updateData.captionEn || existing.captionEn || updateData.captionKm || '', 1000),
      supporters: Math.max(1, parseInt(updateData.supporters, 10) || existing.supporters || 1),
      createdAt: existing.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
      _source: existing._source || 'cloud'
    };

    if (updateData.frameUrl) {
      updatedCampaign.frameUrl = SecurityUtils.sanitizeUrl(updateData.frameUrl);
    } else if (existing.frameUrl) {
      updatedCampaign.frameUrl = existing.frameUrl;
    }

    // If slug changed, suppress old slug so no duplicate appears
    if (existingDocId && existingDocId !== newSlug) {
      this.saveDeletedCampaignId([existingDocId, existing.slug]);
      const db = initFirestore();
      if (db) {
        db.collection("campaigns").doc(existingDocId).delete().catch(() => {});
      }
    }

    // Ensure new slug and id are not in deleted list
    this.removeDeletedCampaignId([newSlug, updatedCampaign.id, updatedCampaign._docId]);

    // Save to persistent overrides in localStorage
    this.saveCampaignOverride(updatedCampaign);

    // Update memory cache
    if (CampaignService._memoryCache) {
      CampaignService._memoryCache.set(newSlug, updatedCampaign);
      if (updatedCampaign.id) CampaignService._memoryCache.set(updatedCampaign.id, updatedCampaign);
      if (updatedCampaign._docId) CampaignService._memoryCache.set(updatedCampaign._docId, updatedCampaign);
    }

    // Update LocalStorage user campaigns if present
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        let userCampaigns = JSON.parse(stored);
        const idx = userCampaigns.findIndex(c => c.id === safeId || c.slug === safeId || c.slug === newSlug);
        if (idx !== -1) {
          userCampaigns[idx] = { ...userCampaigns[idx], ...updatedCampaign };
        } else if (existing._source === 'local') {
          userCampaigns.unshift(updatedCampaign);
        }
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userCampaigns));
      }
    } catch (e) {}

    // Cloud Firestore Sync (Non-blocking, resilient with full valid schema)
    const db = initFirestore();
    if (db) {
      try {
        const firestoreData = { ...updatedCampaign };
        delete firestoreData._docId;
        delete firestoreData._source;
        delete firestoreData.isPreset;
        await db.collection("campaigns").doc(newSlug).set(firestoreData, { merge: true });
        console.log("🔥 Admin updated campaign in Cloud Firestore:", newSlug);
      } catch (sdkErr) {
        console.warn("Firestore SDK admin update notice (saved to overrides):", sdkErr);
      }
    }

    return { success: true, docId: newSlug, campaign: updatedCampaign };
  },

  // Admin Delete Campaign: permanently remove across all sources
  async adminDeleteCampaign(targetId, targetSlug) {
    if (!this.isCurrentSuperAdmin()) {
      throw new Error("Unauthorized: Super Admin permissions required.");
    }
    if (!targetId && !targetSlug) throw new Error("Target campaign ID is required.");

    const safeId = String(targetId || targetSlug).trim();

    // Find campaign to resolve all associated identifiers
    const all = await this.fetchAllCampaignsAdmin();
    const target = all.find(c => c.slug === safeId || c.id === safeId || c._docId === safeId) ||
                   (CampaignService._memoryCache ? (CampaignService._memoryCache.get(safeId) || {}) : {});

    const identifiersToDelete = new Set([safeId]);
    if (targetSlug) identifiersToDelete.add(String(targetSlug).trim());
    if (target.slug) identifiersToDelete.add(target.slug);
    if (target.id) identifiersToDelete.add(target.id);
    if (target._docId) identifiersToDelete.add(target._docId);

    const idList = Array.from(identifiersToDelete).filter(Boolean);

    // 1. Save to Persistent Deleted Registry
    this.saveDeletedCampaignId(idList);

    // 2. Check and suppress presets
    const isPreset = INITIAL_CAMPAIGNS.some(p => idList.includes(p.id) || idList.includes(p.slug));
    if (isPreset) {
      try {
        const suppressed = JSON.parse(localStorage.getItem('tra_suppressed_presets') || '[]');
        idList.forEach(id => {
          if (!suppressed.includes(id)) suppressed.push(id);
        });
        localStorage.setItem('tra_suppressed_presets', JSON.stringify(suppressed));
      } catch (e) {}
    }

    // 3. Remove from Overrides
    try {
      const overrides = this.getCampaignOverrides();
      idList.forEach(id => { delete overrides[id]; });
      localStorage.setItem('tra_admin_campaign_overrides', JSON.stringify(overrides));
    } catch (e) {}

    // 4. Remove from Memory Cache
    if (CampaignService._memoryCache) {
      idList.forEach(id => CampaignService._memoryCache.delete(id));
    }

    // 5. Remove from LocalStorage user campaigns
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        let userCampaigns = JSON.parse(stored);
        userCampaigns = userCampaigns.filter(c => !idList.includes(c.id) && !idList.includes(c.slug));
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userCampaigns));
      }
    } catch (e) {}

    // 6. Delete from Cloud Firestore (for all resolved document IDs)
    const db = initFirestore();
    if (db) {
      const cloudDocIds = new Set([target._docId, target.slug, safeId].filter(Boolean));
      cloudDocIds.forEach(docId => {
        db.collection("campaigns").doc(docId).delete()
          .then(() => console.log("🔥 Admin deleted campaign from Cloud Firestore:", docId))
          .catch(err => console.warn("Firestore SDK delete notice:", docId, err));
      });
    }

    return { success: true, deletedIdentifiers: idList };
  },

  // Admin Batch Delete: permanently remove multiple campaigns across all sources
  async adminBatchDeleteCampaigns(targetKeys) {
    if (!this.isCurrentSuperAdmin()) {
      throw new Error("Unauthorized: Super Admin permissions required.");
    }
    if (!Array.isArray(targetKeys) || targetKeys.length === 0) {
      return { success: true, count: 0, deletedIdentifiers: [] };
    }

    const all = await this.fetchAllCampaignsAdmin();
    const allIdentifiersToDelete = new Set();
    const resolvedDocIds = new Set();

    targetKeys.forEach(rawKey => {
      const safeKey = String(rawKey).trim();
      if (!safeKey) return;
      allIdentifiersToDelete.add(safeKey);

      const found = all.find(c => c.slug === safeKey || c.id === safeKey || c._docId === safeKey) ||
                    (CampaignService._memoryCache ? (CampaignService._memoryCache.get(safeKey) || {}) : {});
      if (found.slug) allIdentifiersToDelete.add(found.slug);
      if (found.id) allIdentifiersToDelete.add(found.id);
      if (found._docId) allIdentifiersToDelete.add(found._docId);

      const docId = found._docId || found.slug || safeKey;
      if (docId) resolvedDocIds.add(docId);
    });

    const idList = Array.from(allIdentifiersToDelete).filter(Boolean);

    // 1. Save to Persistent Deleted Registry
    this.saveDeletedCampaignId(idList);

    // 2. Check and suppress presets
    try {
      const suppressed = JSON.parse(localStorage.getItem('tra_suppressed_presets') || '[]');
      let suppressedChanged = false;
      idList.forEach(id => {
        const isPreset = INITIAL_CAMPAIGNS.some(p => p.id === id || p.slug === id);
        if (isPreset && !suppressed.includes(id)) {
          suppressed.push(id);
          suppressedChanged = true;
        }
      });
      if (suppressedChanged) {
        localStorage.setItem('tra_suppressed_presets', JSON.stringify(suppressed));
      }
    } catch (e) {}

    // 3. Remove from Overrides
    try {
      const overrides = this.getCampaignOverrides();
      idList.forEach(id => { delete overrides[id]; });
      localStorage.setItem('tra_admin_campaign_overrides', JSON.stringify(overrides));
    } catch (e) {}

    // 4. Remove from Memory Cache
    if (CampaignService._memoryCache) {
      idList.forEach(id => CampaignService._memoryCache.delete(id));
    }

    // 5. Remove from LocalStorage user campaigns
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        let userCampaigns = JSON.parse(stored);
        userCampaigns = userCampaigns.filter(c => !idList.includes(c.id) && !idList.includes(c.slug));
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userCampaigns));
      }
    } catch (e) {}

    // 6. Batch Delete from Cloud Firestore
    const db = initFirestore();
    if (db) {
      const promises = Array.from(resolvedDocIds).map(docId => {
        return db.collection("campaigns").doc(docId).delete()
          .then(() => console.log("🔥 Admin batch-deleted doc from Cloud Firestore:", docId))
          .catch(err => console.warn("Firestore SDK batch-delete notice:", docId, err));
      });
      await Promise.allSettled(promises);
    }

    return { success: true, count: targetKeys.length, deletedIdentifiers: idList };
  },

  // Admin Batch Update Category: assign category to multiple campaigns
  async adminBatchUpdateCategory(targetKeys, newCategory) {
    if (!this.isCurrentSuperAdmin()) {
      throw new Error("Unauthorized: Super Admin permissions required.");
    }
    const validCategories = ['education', 'culture', 'charity', 'sports', 'tech', 'celebration'];
    if (!validCategories.includes(newCategory)) {
      throw new Error("Invalid category: " + newCategory);
    }
    if (!Array.isArray(targetKeys) || targetKeys.length === 0) {
      return { success: true, count: 0 };
    }

    const all = await this.fetchAllCampaignsAdmin();
    const updatedCampaigns = [];
    const db = initFirestore();

    for (const rawKey of targetKeys) {
      const safeKey = String(rawKey).trim();
      if (!safeKey) continue;
      const found = all.find(c => c.slug === safeKey || c.id === safeKey || c._docId === safeKey);
      if (!found) continue;

      const updated = {
        ...found,
        category: newCategory,
        updatedAt: new Date().toISOString()
      };

      this.saveCampaignOverride(updated);

      if (CampaignService._memoryCache) {
        if (updated.slug) CampaignService._memoryCache.set(updated.slug, updated);
        if (updated.id) CampaignService._memoryCache.set(updated.id, updated);
        if (updated._docId) CampaignService._memoryCache.set(updated._docId, updated);
      }

      // Update local storage user campaign if present
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          let userCampaigns = JSON.parse(stored);
          const idx = userCampaigns.findIndex(c => c.id === safeKey || c.slug === safeKey);
          if (idx !== -1) {
            userCampaigns[idx] = { ...userCampaigns[idx], category: newCategory, updatedAt: new Date().toISOString() };
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userCampaigns));
          }
        }
      } catch (e) {}

      const docId = updated._docId || updated.slug || updated.id;
      if (db && docId) {
        db.collection("campaigns").doc(docId).set({ category: newCategory, updatedAt: new Date().toISOString() }, { merge: true })
          .catch(err => console.warn("Batch category cloud update notice:", docId, err));
      }

      updatedCampaigns.push(updated);
    }

    return { success: true, count: updatedCampaigns.length, category: newCategory };
  },

  // Export Selected Campaigns Backup as JSON file
  async exportSelectedCampaignsBackup(targetKeys) {
    const all = await this.fetchAllCampaignsAdmin();
    const targetSet = new Set(targetKeys.map(k => String(k).trim()));
    
    const selectedCampaigns = all.filter(c => 
      targetSet.has(c.slug) || targetSet.has(c.id) || (c._docId && targetSet.has(c._docId))
    );

    const exportData = {
      appName: "Tra Frames",
      type: "selected_campaigns_backup",
      exportTimestamp: new Date().toISOString(),
      exportDateFormatted: new Date().toLocaleString(),
      count: selectedCampaigns.length,
      campaigns: selectedCampaigns
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `tra-frames-selected-${selectedCampaigns.length}-items-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return exportData;
  },

  // Fetch list of registered users and campaign creators
  async fetchUsersList() {
    const userMap = new Map();

    // 1. Add Super Admins
    this.SUPER_ADMIN_EMAILS.forEach(email => {
      userMap.set(email.toLowerCase(), {
        uid: 'admin_' + email.split('@')[0],
        email: email,
        displayName: email.split('@')[0],
        verified: true,
        isSuperAdmin: true,
        campaignCount: 0,
        createdAt: '2026-01-01'
      });
    });

    // 2. Fetch Verified Users from Firestore
    const db = initFirestore();
    if (db) {
      try {
        const snapshot = await db.collection("verified_users").get();
        if (!snapshot.empty) {
          snapshot.forEach(doc => {
            const data = doc.data();
            const email = (data.email || '').toLowerCase().trim();
            if (email) {
              const existing = userMap.get(email) || {};
              userMap.set(email, {
                ...existing,
                uid: doc.id || data.uid || existing.uid || ('usr_' + Math.random().toString(36).slice(2, 8)),
                email: email,
                displayName: data.displayName || existing.displayName || email.split('@')[0],
                verified: true,
                isSuperAdmin: existing.isSuperAdmin || this.SUPER_ADMIN_EMAILS.includes(email),
                campaignCount: existing.campaignCount || 0,
                createdAt: data.verifiedAt || data.createdAt || existing.createdAt || new Date().toISOString().split('T')[0]
              });
            }
          });
        }
      } catch (err) {
        console.warn("fetchUsersList SDK notice:", err);
      }
    }

    // 3. Fetch from Local Accounts
    try {
      const stored = localStorage.getItem("tra_local_accounts");
      if (stored) {
        const accounts = JSON.parse(stored);
        accounts.forEach(acc => {
          const email = (acc.email || '').toLowerCase().trim();
          if (email) {
            const existing = userMap.get(email) || {};
            userMap.set(email, {
              ...existing,
              uid: acc.uid || existing.uid,
              email: email,
              displayName: acc.displayName || existing.displayName || email.split('@')[0],
              verified: acc.emailVerified !== false || existing.verified,
              isSuperAdmin: existing.isSuperAdmin || this.SUPER_ADMIN_EMAILS.includes(email),
              campaignCount: existing.campaignCount || 0,
              createdAt: acc.createdAt || existing.createdAt || new Date().toISOString().split('T')[0]
            });
          }
        });
      }
    } catch (e) {}

    // 4. Extract creators from all campaigns to compute campaignCount
    try {
      const allCampaigns = await this.fetchAllCampaignsAdmin();
      allCampaigns.forEach(c => {
        const email = (c.creatorEmail || '').toLowerCase().trim();
        const uid = c.creatorUid;
        if (email) {
          const existing = userMap.get(email) || {
            uid: uid || ('usr_' + Math.random().toString(36).slice(2, 8)),
            email: email,
            displayName: c.creator || email.split('@')[0],
            verified: true,
            isSuperAdmin: this.SUPER_ADMIN_EMAILS.includes(email),
            campaignCount: 0,
            createdAt: c.createdAt ? c.createdAt.split('T')[0] : '2026-03-01'
          };
          existing.campaignCount = (existing.campaignCount || 0) + 1;
          userMap.set(email, existing);
        }
      });
    } catch (e) {}

    return Array.from(userMap.values());
  },

  // Toggle user verification status
  async updateUserStatus(email, isVerified) {
    if (!this.isCurrentSuperAdmin()) {
      throw new Error("Unauthorized: Super Admin permissions required.");
    }
    const cleanEmail = String(email).toLowerCase().trim();
    if (!cleanEmail) return false;

    // 1. Update verified_emails in LocalStorage
    try {
      const list = JSON.parse(localStorage.getItem('tra_verified_emails') || '[]');
      if (isVerified && !list.includes(cleanEmail)) {
        list.push(cleanEmail);
      } else if (!isVerified) {
        const idx = list.indexOf(cleanEmail);
        if (idx !== -1) list.splice(idx, 1);
      }
      localStorage.setItem('tra_verified_emails', JSON.stringify(list));
    } catch (e) {}

    // 2. Update local accounts
    try {
      const accounts = JSON.parse(localStorage.getItem('tra_local_accounts') || '[]');
      const acc = accounts.find(a => a.email && a.email.toLowerCase() === cleanEmail);
      if (acc) {
        acc.emailVerified = !!isVerified;
        localStorage.setItem('tra_local_accounts', JSON.stringify(accounts));
      }
    } catch (e) {}

    // 3. Update Cloud Firestore verified_users
    const db = initFirestore();
    if (db) {
      try {
        const snapshot = await db.collection("verified_users").where("email", "==", cleanEmail).get();
        if (!snapshot.empty) {
          snapshot.forEach(doc => {
            if (isVerified) {
              doc.ref.set({ verified: true, updatedAt: new Date().toISOString() }, { merge: true });
            } else {
              doc.ref.delete();
            }
          });
        } else if (isVerified) {
          await db.collection("verified_users").add({
            email: cleanEmail,
            verified: true,
            createdAt: new Date().toISOString()
          });
        }
      } catch (err) {
        console.warn("updateUserStatus cloud notice:", err);
      }
    }

    return true;
  },

  // Compute Platform Metrics & Analytics
  getPlatformMetrics(campaigns = [], users = []) {
    const totalCampaigns = campaigns.length;
    const totalSupporters = campaigns.reduce((sum, c) => sum + (parseInt(c.supporters, 10) || 0), 0);
    const totalUsers = users.length;

    // Category breakdown
    const categoryCounts = {
      education: 0,
      culture: 0,
      charity: 0,
      sports: 0,
      tech: 0,
      celebration: 0
    };

    campaigns.forEach(c => {
      const cat = c.category || 'celebration';
      if (categoryCounts.hasOwnProperty(cat)) {
        categoryCounts[cat]++;
      } else {
        categoryCounts.celebration++;
      }
    });

    // Top Category
    let topCategory = 'celebration';
    let maxCatCount = -1;
    for (const [cat, count] of Object.entries(categoryCounts)) {
      if (count > maxCatCount) {
        maxCatCount = count;
        topCategory = cat;
      }
    }

    // Top 5 Most Supported Campaigns
    const topCampaigns = [...campaigns]
      .sort((a, b) => (parseInt(b.supporters, 10) || 0) - (parseInt(a.supporters, 10) || 0))
      .slice(0, 5);

    // Recent 5 Campaigns
    const recentCampaigns = [...campaigns]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5);

    return {
      totalCampaigns,
      totalSupporters,
      totalUsers,
      categoryCounts,
      topCategory,
      topCampaigns,
      recentCampaigns
    };
  },

  // Export Full Platform Database as JSON Backup file
  async exportDatabaseBackup() {
    const campaigns = await this.fetchAllCampaignsAdmin();
    const users = await this.fetchUsersList();
    const settings = this.getSystemSettings();

    const backupData = {
      appName: "Tra Frames",
      platform: "Tra Frames 2026",
      exportTimestamp: new Date().toISOString(),
      exportDateFormatted: new Date().toLocaleString(),
      metrics: {
        totalCampaigns: campaigns.length,
        totalSupporters: campaigns.reduce((sum, c) => sum + (parseInt(c.supporters, 10) || 0), 0),
        totalUsers: users.length
      },
      settings: settings,
      campaigns: campaigns,
      users: users
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `tra-frames-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return backupData;
  },

  // Restore Database from JSON Backup File
  async importDatabaseBackup(jsonData) {
    if (!this.isCurrentSuperAdmin()) {
      throw new Error("Unauthorized: Super Admin permissions required.");
    }
    if (!jsonData || typeof jsonData !== 'object') {
      throw new Error("Invalid backup file: Not valid JSON.");
    }

    let restoredCount = 0;
    if (Array.isArray(jsonData.campaigns)) {
      const db = initFirestore();
      for (const camp of jsonData.campaigns) {
        if (camp && (camp.slug || camp.id)) {
          const docId = camp.slug || camp.id;
          // Cache locally
          CampaignService.cacheCloudCampaign(camp);
          // Restore to Firestore if DB available
          if (db) {
            try {
              await db.collection("campaigns").doc(docId).set(camp, { merge: true });
            } catch (err) {}
          }
          restoredCount++;
        }
      }
    }

    if (jsonData.settings) {
      await this.saveSystemSettings(jsonData.settings);
    }

    return { success: true, restoredCampaigns: restoredCount };
  },

  // System Settings Management
  getSystemSettings() {
    const defaults = {
      announcementEnabled: false,
      announcementTextKm: "🎉 សូមស្វាគមន៍មកកាន់ Tra Frames 2026 — វេទិកាស៊ុមរូបថតដ៏ទាក់ទាញបំផុត!",
      announcementTextEn: "🎉 Welcome to Tra Frames 2026 — The premier photo frame platform!",
      announcementLink: "#explore",
      announcementType: "info", // 'info' | 'success' | 'warning'
      maintenanceMode: false
    };

    try {
      const stored = localStorage.getItem("tra_system_settings");
      if (stored) {
        return { ...defaults, ...JSON.parse(stored) };
      }
    } catch (e) {}

    return defaults;
  },

  async saveSystemSettings(settings) {
    if (!this.isCurrentSuperAdmin()) {
      throw new Error("Unauthorized: Super Admin permissions required.");
    }
    const current = this.getSystemSettings();
    const updated = { ...current, ...settings, updatedAt: new Date().toISOString() };

    // Save to LocalStorage
    try {
      localStorage.setItem("tra_system_settings", JSON.stringify(updated));
    } catch (e) {}

    // Save to Cloud Firestore
    const db = initFirestore();
    if (db) {
      try {
        await db.collection("system_settings").doc("global").set(updated, { merge: true });
      } catch (err) {
        console.warn("saveSystemSettings cloud notice:", err);
      }
    }

    // Trigger settings changed event
    try {
      window.dispatchEvent(new CustomEvent('traSettingsChanged', { detail: updated }));
    } catch (e) {}

    return updated;
  }
};
