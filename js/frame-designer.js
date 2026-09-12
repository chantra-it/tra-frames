// Polyfill roundRect for maximum browser compatibility
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
    let r = typeof radii === 'number' ? radii : (Array.isArray(radii) ? radii[0] : 0);
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };
}

// Built-in Twibbon Frame Designer Studio Engine
class FrameDesigner {
  static FONTS = {
    moul: { id: 'moul', name: 'អក្សរមូល (Moul)', family: "'Moul', cursive", weight: '400', preview: 'សួស្តីឆ្នាំថ្មី Moul' },
    koulen: { id: 'koulen', name: 'កូលែន (Koulen)', family: "'Koulen', cursive", weight: '400', preview: 'កូលែន Koulen' },
    kantumruy: { id: 'kantumruy', name: 'កន្ទុំរុយ (Kantumruy Pro)', family: "'Kantumruy Pro', sans-serif", weight: '700', preview: 'កន្ទុំរុយ Kantumruy' },
    battambang: { id: 'battambang', name: 'បាត់ដំបង (Battambang)', family: "'Battambang', cursive", weight: '700', preview: 'បាត់ដំបង Battambang' },
    bayon: { id: 'bayon', name: 'បាយ័ន (Bayon)', family: "'Bayon', cursive", weight: '400', preview: 'បាយ័ន Bayon' },
    siemreap: { id: 'siemreap', name: 'សៀមរាប (Siemreap)', family: "'Siemreap', cursive", weight: '700', preview: 'សៀមរាប Siemreap' },
    bokor: { id: 'bokor', name: 'បូកគោ (Bokor)', family: "'Bokor', cursive", weight: '400', preview: 'បូកគោ Bokor' },
    inter: { id: 'inter', name: 'Inter (Modern Sans)', family: "'Inter', sans-serif", weight: '800', preview: 'Inter Modern' }
  };

  static BANNER_STYLES = {
    ribbon: { id: 'ribbon', name: 'បដាទង់ (Ribbon)', icon: '🎗️' },
    pill: { id: 'pill', name: 'គ្រាប់ថ្នាំ (Pill)', icon: '💊' },
    luxury: { id: 'luxury', name: 'មាសប្រណិត (Luxury)', icon: '👑' },
    neon: { id: 'neon', name: 'ណេអុង (Neon)', icon: '⚡' },
    ornate: { id: 'ornate', name: 'ក្បាច់បុរាណ (Ornate)', icon: '🛕' },
    glass: { id: 'glass', name: 'កញ្ចក់ថ្លា (Glass)', icon: '🪟' },
    minimal: { id: 'minimal', name: 'សាមញ្ញ (Minimal)', icon: '✨' }
  };

  static TEXT_EFFECTS = {
    clean: { id: 'clean', name: 'ធម្មតា (Clean)', icon: '🌟' },
    goldGlow: { id: 'goldGlow', name: 'ពន្លឺមាស (Gold)', icon: '👑' },
    neonGlow: { id: 'neonGlow', name: 'ពន្លឺណេអុង (Neon)', icon: '⚡' },
    outline: { id: 'outline', name: 'គែមច្បាស់ (Stroke)', icon: '✏️' },
    shadow3d: { id: 'shadow3d', name: 'ស្រមោល 3D (3D)', icon: '🏔️' }
  };

  static TEMPLATES = {
    graduation: {
      shape: 'arch',
      theme: 'royalBlue',
      pattern: 'sparkles',
      borderStyle: 'double',
      cornerStyle: 'ribbon',
      ringColor: '#fbbf24',
      headerText: 'CLASS OF 2026',
      headerColor: '#fbbf24',
      headerBg: '#0f172a',
      footerText: 'CONGRATULATIONS!',
      footerColor: '#ffffff',
      footerBg: '#0f172a',
      sticker: 'graduation'
    },
    khmerNewYear: {
      shape: 'circle',
      theme: 'crimson',
      pattern: 'sunburst',
      borderStyle: 'double',
      cornerStyle: 'stars',
      ringColor: '#fbbf24',
      headerText: 'សួស្តីឆ្នាំថ្មី ២០២៦',
      headerColor: '#fbbf24',
      headerBg: '#450a0a',
      footerText: 'HAPPY KHMER NEW YEAR',
      footerColor: '#ffffff',
      footerBg: '#450a0a',
      sticker: 'khmer'
    },
    birthday: {
      shape: 'heart',
      theme: 'sunset',
      pattern: 'confetti',
      borderStyle: 'neon',
      cornerStyle: 'stars',
      ringColor: '#fef08a',
      headerText: 'HAPPY BIRTHDAY',
      headerColor: '#ffffff',
      headerBg: '#9a3412',
      footerText: 'WISHING YOU ALL THE BEST!',
      footerColor: '#fef08a',
      footerBg: '#9a3412',
      sticker: 'party'
    },
    wedding: {
      shape: 'heart',
      theme: 'rosePink',
      pattern: 'sparkles',
      borderStyle: 'pearl',
      cornerStyle: 'floral',
      ringColor: '#ffffff',
      headerText: 'HAPPY WEDDING',
      headerColor: '#ffffff',
      headerBg: '#4c0519',
      footerText: 'FOREVER & ALWAYS',
      footerColor: '#fed7aa',
      footerBg: '#4c0519',
      sticker: 'heart'
    },
    techSummit: {
      shape: 'hexagon',
      theme: 'cyberNeon',
      pattern: 'techGrid',
      borderStyle: 'neon',
      cornerStyle: 'geometric',
      ringColor: '#06b6d4',
      headerText: 'AI & TECH SUMMIT 2026',
      headerColor: '#06b6d4',
      headerBg: '#020617',
      footerText: 'INNOVATE THE FUTURE',
      footerColor: '#ec4899',
      footerBg: '#020617',
      sticker: 'rocket'
    },
    sports: {
      shape: 'octagon',
      theme: 'emerald',
      pattern: 'sunburst',
      borderStyle: 'double',
      cornerStyle: 'ribbon',
      ringColor: '#fde047',
      headerText: 'CHAMPIONSHIP 2026',
      headerColor: '#fde047',
      headerBg: '#022c22',
      footerText: 'VICTORY & PRIDE',
      footerColor: '#ffffff',
      footerBg: '#022c22',
      sticker: 'trophy'
    },
    vip: {
      shape: 'rounded',
      theme: 'midnightGold',
      pattern: 'dots',
      borderStyle: 'double',
      cornerStyle: 'geometric',
      ringColor: '#eab308',
      headerText: 'VIP SPECIAL GUEST',
      headerColor: '#fef08a',
      headerBg: '#09090b',
      footerText: 'HONORARY RECOGNITION',
      footerColor: '#fde047',
      footerBg: '#09090b',
      sticker: 'crown'
    },
    transparent: {
      shape: 'circle',
      theme: 'transparent',
      pattern: 'none',
      borderStyle: 'double',
      cornerStyle: 'stars',
      ringColor: '#2563eb',
      headerText: 'SUMMER FESTIVAL',
      headerColor: '#2563eb',
      headerBg: '#ffffff',
      footerText: 'JOIN THE COMMUNITY',
      footerColor: '#1e293b',
      footerBg: '#ffffff',
      sticker: 'star'
    }
  };

  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.size = options.size || 1000;
    this.canvas.width = this.size;
    this.canvas.height = this.size;

    this.settings = {
      shape: 'circle', // circle, rounded, square, heart, arch, hexagon, octagon, star, oval
      theme: 'royalBlue',
      customColor: '',
      pattern: 'none', // none, sparkles, confetti, dots, techGrid, sunburst
      borderStyle: 'solid', // solid, double, neon, dashed, pearl
      borderWidth: 14,
      cutoutScale: 0.74,
      ringColor: '#fbbf24',
      cornerStyle: 'geometric', // geometric, ribbon, stars, floral, none
      headerText: 'CLASS OF 2026',
      headerColor: '#fbbf24',
      headerBg: '#0f172a',
      showHeader: true,
      headerFontSize: 32,
      footerText: 'CONGRATULATIONS!',
      footerColor: '#ffffff',
      footerBg: '#0f172a',
      showFooter: true,
      footerFontSize: 28,
      fontFamily: 'kantumruy', // moul, koulen, kantumruy, battambang, bayon, siemreap, bokor, inter
      bannerStyle: 'ribbon', // ribbon, pill, luxury, neon, ornate, glass, minimal
      textEffect: 'clean', // clean, goldGlow, neonGlow, outline, shadow3d
      sticker: 'none', // none, graduation, khmer, trophy, heart, crown, party, rocket, lotus, star, fire
      stickerPos: 'top-right',
      customLogo: null, // HTMLImageElement or dataUrl
      customLogoPos: 'top-left',
      previewPhoto: false
    };

    this.themes = {
      royalBlue: { gradient: ['#1e3a8a', '#2563eb', '#1d4ed8'], ring: '#fbbf24', accent: '#f59e0b' },
      emerald: { gradient: ['#064e3b', '#059669', '#10b981'], ring: '#a7f3d0', accent: '#34d399' },
      crimson: { gradient: ['#7f1d1d', '#b91c1c', '#dc2626'], ring: '#fef08a', accent: '#eab308' },
      sunset: { gradient: ['#c2410c', '#ea580c', '#f97316'], ring: '#fef08a', accent: '#fde047' },
      midnightGold: { gradient: ['#09090b', '#18181b', '#27272a'], ring: '#eab308', accent: '#fde047' },
      cyberNeon: { gradient: ['#1e1b4b', '#3730a3', '#4f46e5'], ring: '#06b6d4', accent: '#ec4899' },
      rosePink: { gradient: ['#881337', '#e11d48', '#fb7185'], ring: '#ffffff', accent: '#fbcfe8' },
      violetMagic: { gradient: ['#3b0764', '#7c3aed', '#a855f7'], ring: '#fde047', accent: '#c084fc' },
      goldMetallic: { gradient: ['#78350f', '#b45309', '#d97706'], ring: '#fef08a', accent: '#fde68a' },
      coralPeach: { gradient: ['#9f1239', '#e11d48', '#fb923c'], ring: '#ffffff', accent: '#fed7aa' },
      oceanTeal: { gradient: ['#042f2e', '#0d9488', '#14b8a6'], ring: '#67e8f9', accent: '#5eead4' },
      transparent: { gradient: null, ring: '#fbbf24', accent: '#f59e0b', isTransparent: true }
    };

    this.stickers = {
      graduation: '🎓',
      khmer: '🇰🇭',
      trophy: '🏆',
      heart: '💖',
      crown: '👑',
      party: '🎉',
      rocket: '🚀',
      lotus: '🌸',
      star: '⭐',
      fire: '🔥'
    };

    // Dirty & Unsaved Work State
    this.isDirty = false;
    this.isExported = false;

    // Restore draft from sessionStorage if available
    try {
      const saved = sessionStorage.getItem('tra_designer_draft');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
        this.isDirty = true;
      }
    } catch (e) {}

    this.render();
  }

  saveDraft() {
    try {
      const copy = { ...this.settings };
      if (copy.customLogo instanceof HTMLImageElement) {
        copy.customLogo = copy.customLogo.src;
      }
      sessionStorage.setItem('tra_designer_draft', JSON.stringify(copy));
    } catch (e) {}
  }

  hasUnsavedWork() {
    return this.isDirty && !this.isExported;
  }

  clearDirty() {
    this.isDirty = false;
    this.isExported = true;
    try {
      sessionStorage.removeItem('tra_designer_draft');
    } catch (e) {}
  }

  ensureFontLoaded(fontKey) {
    const fontInfo = FrameDesigner.FONTS[fontKey];
    if (fontInfo && document.fonts && document.fonts.load) {
      document.fonts.load(`${fontInfo.weight || 'normal'} 32px ${fontInfo.family}`).then(() => {
        this.render();
      }).catch(() => {});
    }
  }

  update(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    if (newSettings.fontFamily) {
      this.ensureFontLoaded(newSettings.fontFamily);
    }
    this.isDirty = true;
    this.isExported = false;
    this.saveDraft();
    this.render();
  }

  applyTemplate(templateKey) {
    const tmpl = FrameDesigner.TEMPLATES[templateKey];
    if (!tmpl) return;
    this.update({ ...tmpl });
  }

  randomize() {
    const shapes = ['circle', 'rounded', 'square', 'heart', 'arch', 'hexagon', 'octagon', 'star', 'oval'];
    const themes = Object.keys(this.themes).filter(t => t !== 'transparent');
    const patterns = ['none', 'sparkles', 'confetti', 'dots', 'techGrid', 'sunburst'];
    const borderStyles = ['solid', 'double', 'neon', 'dashed', 'pearl'];
    const cornerStyles = ['geometric', 'ribbon', 'stars', 'floral', 'none'];
    const stickers = Object.keys(this.stickers);

    const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const shape = rand(shapes);
    const theme = rand(themes);
    const pattern = rand(patterns);
    const borderStyle = rand(borderStyles);
    const cornerStyle = rand(cornerStyles);
    const sticker = Math.random() > 0.4 ? rand(stickers) : 'none';
    const fonts = Object.keys(FrameDesigner.FONTS);
    const bannerStyles = Object.keys(FrameDesigner.BANNER_STYLES);
    const textEffects = Object.keys(FrameDesigner.TEXT_EFFECTS);

    const fontFamily = rand(fonts);
    const bannerStyle = rand(bannerStyles);
    const textEffect = rand(textEffects);

    this.update({
      shape,
      theme,
      pattern,
      borderStyle,
      cornerStyle,
      sticker,
      fontFamily,
      bannerStyle,
      textEffect
    });
  }

  // Draw Cutout Shape Path
  buildCutoutPath(targetCtx, center, radius) {
    const shape = this.settings.shape;

    targetCtx.beginPath();
    if (shape === 'circle') {
      targetCtx.arc(center, center, radius, 0, Math.PI * 2);
    } else if (shape === 'rounded') {
      const size = radius * 1.94;
      targetCtx.roundRect(center - size / 2, center - size / 2, size, size, 70);
    } else if (shape === 'square') {
      const size = radius * 1.94;
      targetCtx.rect(center - size / 2, center - size / 2, size, size);
    } else if (shape === 'heart') {
      const hx = center;
      const hy = center + radius * 0.08;
      const hw = radius * 0.96;
      targetCtx.moveTo(hx, hy + hw * 0.65);
      targetCtx.bezierCurveTo(hx - hw * 1.25, hy - hw * 0.35, hx - hw * 0.85, hy - hw * 1.15, hx, hy - hw * 0.45);
      targetCtx.bezierCurveTo(hx + hw * 0.85, hy - hw * 1.15, hx + hw * 1.25, hy - hw * 0.35, hx, hy + hw * 0.65);
      targetCtx.closePath();
    } else if (shape === 'arch') {
      const aw = radius * 1.84;
      const ah = radius * 1.95;
      const ax = center - aw / 2;
      const ay = center - ah / 2;
      targetCtx.moveTo(ax, ay + ah);
      targetCtx.lineTo(ax, ay + aw / 2);
      targetCtx.arc(center, ay + aw / 2, aw / 2, Math.PI, 0);
      targetCtx.lineTo(ax + aw, ay + ah);
      targetCtx.closePath();
    } else if (shape === 'hexagon') {
      const r = radius * 1.04;
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 - Math.PI / 6;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        if (i === 0) targetCtx.moveTo(x, y);
        else targetCtx.lineTo(x, y);
      }
      targetCtx.closePath();
    } else if (shape === 'octagon') {
      const r = radius * 1.02;
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4 - Math.PI / 8;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        if (i === 0) targetCtx.moveTo(x, y);
        else targetCtx.lineTo(x, y);
      }
      targetCtx.closePath();
    } else if (shape === 'star') {
      const outerR = radius * 1.08;
      const innerR = radius * 0.52;
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        if (i === 0) targetCtx.moveTo(x, y);
        else targetCtx.lineTo(x, y);
      }
      targetCtx.closePath();
    } else if (shape === 'oval') {
      targetCtx.ellipse(center, center, radius * 0.88, radius * 1.08, 0, 0, Math.PI * 2);
    }
  }

  // Draw Background Pattern on Frame
  drawPattern(targetCtx, s) {
    const pattern = this.settings.pattern;
    if (pattern === 'none') return;

    targetCtx.save();
    if (pattern === 'sparkles') {
      // Draw 28 scattered stars
      targetCtx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      const coords = [
        [120, 150, 14], [250, 90, 8], [800, 120, 12], [890, 220, 16],
        [90, 480, 10], [920, 520, 14], [110, 820, 18], [240, 910, 10],
        [820, 870, 16], [910, 780, 12], [480, 70, 10], [520, 930, 12],
        [60, 240, 8], [940, 360, 9], [70, 680, 11], [930, 670, 14],
        [320, 60, 6], [680, 60, 7], [320, 940, 8], [680, 940, 8]
      ];
      for (const [x, y, r] of coords) {
        targetCtx.beginPath();
        targetCtx.moveTo(x, y - r);
        targetCtx.quadraticCurveTo(x, y, x + r, y);
        targetCtx.quadraticCurveTo(x, y, x, y + r);
        targetCtx.quadraticCurveTo(x, y, x - r, y);
        targetCtx.quadraticCurveTo(x, y, x, y - r);
        targetCtx.fill();
      }
    } else if (pattern === 'confetti') {
      // Draw festive confetti particles
      const colors = ['#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#f43f5e', '#ffffff'];
      for (let i = 0; i < 48; i++) {
        const cx = (i * 73 + 47) % s;
        const cy = (i * 109 + 29) % s;
        const angle = (i * 37 * Math.PI) / 180;
        const col = colors[i % colors.length];
        targetCtx.save();
        targetCtx.translate(cx, cy);
        targetCtx.rotate(angle);
        targetCtx.fillStyle = col;
        targetCtx.globalAlpha = 0.55;
        if (i % 2 === 0) {
          targetCtx.fillRect(-7, -4, 14, 8);
        } else {
          targetCtx.beginPath();
          targetCtx.arc(0, 0, 5, 0, Math.PI * 2);
          targetCtx.fill();
        }
        targetCtx.restore();
      }
    } else if (pattern === 'dots') {
      // Modern polka dots
      targetCtx.fillStyle = 'rgba(255, 255, 255, 0.16)';
      const step = 42;
      for (let x = 20; x < s; x += step) {
        for (let y = 20; y < s; y += step) {
          targetCtx.beginPath();
          targetCtx.arc(x, y, 2.5, 0, Math.PI * 2);
          targetCtx.fill();
        }
      }
    } else if (pattern === 'techGrid') {
      // Cyber isometric / grid lines
      targetCtx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
      targetCtx.lineWidth = 1.5;
      const step = 60;
      targetCtx.beginPath();
      for (let x = 0; x <= s; x += step) {
        targetCtx.moveTo(x, 0);
        targetCtx.lineTo(x, s);
      }
      for (let y = 0; y <= s; y += step) {
        targetCtx.moveTo(0, y);
        targetCtx.lineTo(s, y);
      }
      targetCtx.stroke();
    } else if (pattern === 'sunburst') {
      // Radial rays
      targetCtx.save();
      targetCtx.translate(s / 2, s / 2);
      targetCtx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      const rays = 24;
      const angleStep = (Math.PI * 2) / rays;
      for (let i = 0; i < rays; i += 2) {
        targetCtx.beginPath();
        targetCtx.moveTo(0, 0);
        targetCtx.arc(0, 0, s * 0.9, i * angleStep, (i + 1) * angleStep);
        targetCtx.closePath();
        targetCtx.fill();
      }
      targetCtx.restore();
    }
    targetCtx.restore();
  }

  // Draw Corner Ornaments
  drawCorners(ctx, s, ringColor) {
    const style = this.settings.cornerStyle;
    if (style === 'none') return;

    ctx.save();
    ctx.fillStyle = ringColor;
    ctx.strokeStyle = ringColor;

    if (style === 'geometric') {
      // Modern geometric brackets with double line
      const off = 55;
      const len = 90;

      const drawBracket = (x, y, dx, dy) => {
        ctx.beginPath();
        ctx.moveTo(x, y + dy * len);
        ctx.lineTo(x + dx * len, y);
        ctx.lineTo(x + dx * (len + 30), y);
        ctx.lineTo(x, y + dy * (len + 30));
        ctx.closePath();
        ctx.fill();

        // Little square accent
        ctx.fillRect(x + dx * 20 - 4, y + dy * 20 - 4, 8, 8);
      };

      drawBracket(off, off, 1, 1);
      drawBracket(s - off, off, -1, 1);
      drawBracket(off, s - off, 1, -1);
      drawBracket(s - off, s - off, -1, -1);
    } else if (style === 'ribbon') {
      // Celebratory folded ribbon wings
      const off = 50;
      const drawRibbon = (x, y, dx, dy) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        ctx.moveTo(0, dy * 110);
        ctx.lineTo(dx * 110, 0);
        ctx.lineTo(dx * 140, 0);
        ctx.lineTo(0, dy * 140);
        ctx.closePath();
        ctx.fill();

        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, dy * 85);
        ctx.lineTo(dx * 85, 0);
        ctx.stroke();
        ctx.restore();
      };

      drawRibbon(off, off, 1, 1);
      drawRibbon(s - off, off, -1, 1);
      drawRibbon(off, s - off, 1, -1);
      drawRibbon(s - off, s - off, -1, -1);
    } else if (style === 'stars') {
      // 3-star cluster in corners
      const drawStar = (cx, cy, r) => {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a1 = (i * Math.PI * 2) / 5 - Math.PI / 2;
          const a2 = a1 + Math.PI / 5;
          const x1 = cx + r * Math.cos(a1);
          const y1 = cy + r * Math.sin(a1);
          const x2 = cx + (r * 0.45) * Math.cos(a2);
          const y2 = cy + (r * 0.45) * Math.sin(a2);
          if (i === 0) ctx.moveTo(x1, y1);
          else ctx.lineTo(x1, y1);
          ctx.lineTo(x2, y2);
        }
        ctx.closePath();
        ctx.fill();
      };

      const cornerPoints = [
        [75, 75], [s - 75, 75], [75, s - 75], [s - 75, s - 75]
      ];
      for (const [cx, cy] of cornerPoints) {
        drawStar(cx, cy, 22);
        drawStar(cx + (cx < 500 ? 34 : -34), cy, 14);
        drawStar(cx, cy + (cy < 500 ? 34 : -34), 14);
      }
    } else if (style === 'floral') {
      // Classic floral scrolls
      const drawLeaf = (x, y, angle) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(25, -25, 55, 0);
        ctx.quadraticCurveTo(25, 25, 0, 0);
        ctx.fill();
        ctx.restore();
      };

      drawLeaf(70, 70, Math.PI / 4);
      drawLeaf(s - 70, 70, (3 * Math.PI) / 4);
      drawLeaf(70, s - 70, -Math.PI / 4);
      drawLeaf(s - 70, s - 70, (-3 * Math.PI) / 4);
    }
    ctx.restore();
  }

  // Draw Sticker Stamp
  drawSticker(ctx, s) {
    const stickerKey = this.settings.sticker;
    const emoji = this.stickers[stickerKey];
    if (!emoji || stickerKey === 'none') return;

    ctx.save();
    let sx = s - 110;
    let sy = 110;

    if (this.settings.stickerPos === 'top-left') {
      sx = 110;
      sy = 110;
    } else if (this.settings.stickerPos === 'bottom-right') {
      sx = s - 110;
      sy = s - 180;
    } else if (this.settings.stickerPos === 'bottom-left') {
      sx = 110;
      sy = s - 180;
    }

    // Circular badge backdrop
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;

    ctx.beginPath();
    ctx.arc(sx, sy, 48, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.lineWidth = 4;
    ctx.strokeStyle = this.settings.ringColor || '#fbbf24';
    ctx.stroke();

    // Render Emoji
    ctx.shadowColor = 'transparent';
    ctx.font = '50px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, sx, sy + 3);

    ctx.restore();
  }

  // Draw Custom Uploaded Logo
  drawCustomLogo(ctx, s) {
    if (!this.settings.customLogo) return;

    const img = this.settings.customLogo instanceof HTMLImageElement ? this.settings.customLogo : null;
    if (!img || !img.complete || img.naturalWidth === 0) return;

    ctx.save();
    const logoSize = 88;
    let lx = 60;
    let ly = 60;

    if (this.settings.customLogoPos === 'top-right') {
      lx = s - 60 - logoSize;
      ly = 60;
    } else if (this.settings.customLogoPos === 'bottom-left') {
      lx = 60;
      ly = s - 60 - logoSize;
    } else if (this.settings.customLogoPos === 'bottom-right') {
      lx = s - 60 - logoSize;
      ly = s - 60 - logoSize;
    }

    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;

    ctx.drawImage(img, lx, ly, logoSize, logoSize);
    ctx.restore();
  }

  // Draw Live Mockup Face Placeholder
  drawPreviewFace(ctx, s, center, radius) {
    if (!this.settings.previewPhoto) return;

    ctx.save();
    // Warm soft portrait backdrop
    const grad = ctx.createRadialGradient(center, center - 20, 50, center, center, radius);
    grad.addColorStop(0, '#fde68a');
    grad.addColorStop(0.5, '#fed7aa');
    grad.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);

    // Render cute stylized person avatar silhouette
    ctx.fillStyle = '#475569';
    // Head
    ctx.beginPath();
    ctx.arc(center, center - 45, radius * 0.38, 0, Math.PI * 2);
    ctx.fill();

    // Smile & eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(center - 40, center - 60, 10, 0, Math.PI * 2);
    ctx.arc(center + 40, center - 60, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(center, center - 25, 36, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    // Shoulders
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(center, center + radius * 0.95, radius * 0.72, Math.PI, 0);
    ctx.fill();

    ctx.restore();
  }

  render() {
    const ctx = this.ctx;
    const s = this.size;
    const center = s / 2;
    const radius = 370 * (this.settings.cutoutScale || 0.74) / 0.74;

    // Clear canvas
    ctx.clearRect(0, 0, s, s);

    // 0. Live Preview Face Model (underneath cutout)
    this.drawPreviewFace(ctx, s, center, radius);

    const theme = this.themes[this.settings.theme] || this.themes.royalBlue;
    const ringColor = this.settings.ringColor || theme.ring;

    if (!theme.isTransparent && (theme.gradient || this.settings.customColor)) {
      // Create offscreen canvas for cutout masking
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = s;
      maskCanvas.height = s;
      const mCtx = maskCanvas.getContext('2d');

      // 1. Draw solid outer frame background on maskCanvas
      if (this.settings.customColor) {
        mCtx.fillStyle = this.settings.customColor;
      } else {
        const grad = mCtx.createLinearGradient(0, 0, s, s);
        grad.addColorStop(0, theme.gradient[0]);
        grad.addColorStop(0.5, theme.gradient[1]);
        grad.addColorStop(1, theme.gradient[2]);
        mCtx.fillStyle = grad;
      }
      mCtx.fillRect(0, 0, s, s);

      // 2. Draw Decorative Pattern on solid frame
      this.drawPattern(mCtx, s);

      // 3. Cut out the transparent hole using 'destination-out'
      mCtx.globalCompositeOperation = 'destination-out';
      mCtx.fillStyle = '#000000';
      this.buildCutoutPath(mCtx, center, radius);
      mCtx.fill();

      // Reset composite operation
      mCtx.globalCompositeOperation = 'source-over';

      // 4. Draw masked frame to main canvas
      ctx.drawImage(maskCanvas, 0, 0);
    }

    // 5. Draw Inner Ring / Border Accents
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.38)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;

    const bStyle = this.settings.borderStyle || 'solid';
    const bWidth = this.settings.borderWidth || 14;

    if (bStyle === 'neon') {
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = bWidth;
      ctx.shadowColor = ringColor;
      ctx.shadowBlur = 24;
      this.buildCutoutPath(ctx, center, radius);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(3, bWidth * 0.3);
      ctx.shadowBlur = 8;
      this.buildCutoutPath(ctx, center, radius);
      ctx.stroke();
    } else if (bStyle === 'double') {
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = bWidth;
      this.buildCutoutPath(ctx, center, radius);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(3, bWidth * 0.35);
      this.buildCutoutPath(ctx, center, radius + bWidth + 6);
      ctx.stroke();
    } else if (bStyle === 'dashed') {
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = bWidth;
      ctx.setLineDash([18, 12]);
      this.buildCutoutPath(ctx, center, radius);
      ctx.stroke();
    } else if (bStyle === 'pearl') {
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = Math.max(4, bWidth * 0.5);
      this.buildCutoutPath(ctx, center, radius);
      ctx.stroke();

      // Draw pearl dots along circle/perimeter
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 4;
      const pearlCount = 36;
      for (let i = 0; i < pearlCount; i++) {
        const angle = (i * Math.PI * 2) / pearlCount;
        const px = center + (radius + bWidth * 0.8) * Math.cos(angle);
        const py = center + (radius + bWidth * 0.8) * Math.sin(angle);
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Solid classic
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = bWidth;
      this.buildCutoutPath(ctx, center, radius);
      ctx.stroke();
    }
    ctx.restore();

    // 6. Corner Accents
    this.drawCorners(ctx, s, ringColor);

    // 7. Header Banner / Badge
    if (this.settings.showHeader && this.settings.headerText && this.settings.headerText.trim()) {
      this.drawBannerSection(ctx, s, center, true, ringColor);
    }

    // 8. Footer Banner / Ribbon
    if (this.settings.showFooter && this.settings.footerText && this.settings.footerText.trim()) {
      this.drawBannerSection(ctx, s, center, false, ringColor);
    }

    // 9. Sticker Stamp
    this.drawSticker(ctx, s);

    // 10. Custom Logo
    this.drawCustomLogo(ctx, s);
  }

  getTransparentPNGDataUrl() {
    // When exporting, ensure previewPhoto is temporarily disabled so it's a true transparent PNG frame!
    const wasPreview = this.settings.previewPhoto;
    if (wasPreview) {
      this.settings.previewPhoto = false;
      this.render();
    }

    const dataUrl = this.canvas.toDataURL('image/png');

    if (wasPreview) {
      this.settings.previewPhoto = true;
      this.render();
    }

    return dataUrl;
  }

  // Ensure requested web font is fully loaded
  ensureFontLoaded(fontKey) {
    const fontObj = FrameDesigner.FONTS[fontKey] || FrameDesigner.FONTS.kantumruy;
    if (document.fonts && document.fonts.load) {
      document.fonts.load(`32px ${fontObj.family}`).then(() => {
        this.render();
      }).catch(() => {});
    }
  }

  // Draw Header or Footer Banner with full styling
  drawBannerSection(ctx, s, center, isHeader, ringColor) {
    const text = isHeader ? this.settings.headerText.trim() : this.settings.footerText.trim();
    if (!text) return;

    ctx.save();
    const fontObj = FrameDesigner.FONTS[this.settings.fontFamily] || FrameDesigner.FONTS.kantumruy;
    const baseFontSize = isHeader ? (this.settings.headerFontSize || 32) : (this.settings.footerFontSize || 28);
    const weight = fontObj.weight || '700';

    ctx.font = `${weight} ${baseFontSize}px ${fontObj.family}`;
    let textWidth = ctx.measureText(text).width;

    // Auto-fit long text gracefully
    let actualFontSize = baseFontSize;
    const maxTextWidth = 660;
    if (textWidth > maxTextWidth) {
      const scale = maxTextWidth / textWidth;
      actualFontSize = Math.max(Math.floor(baseFontSize * scale), 18);
      ctx.font = `${weight} ${actualFontSize}px ${fontObj.family}`;
      textWidth = ctx.measureText(text).width;
    }

    const bannerPadding = 110;
    const bannerWidth = Math.min(Math.max(textWidth + bannerPadding, 460), 840);
    const bannerHeight = Math.max(actualFontSize + 44, 76);

    const bx = center - bannerWidth / 2;
    const by = isHeader ? 52 : (s - bannerHeight - 50);

    const bgColor = (isHeader ? this.settings.headerBg : this.settings.footerBg) || '#0f172a';
    const textColor = (isHeader ? this.settings.headerColor : this.settings.footerColor) || (isHeader ? ringColor : '#ffffff');
    const borderColor = ringColor || '#fbbf24';
    const bannerStyle = this.settings.bannerStyle || 'ribbon';
    const textEffect = this.settings.textEffect || 'clean';

    // 1. Draw Banner Background Shape
    this.drawBannerShape(ctx, bx, by, bannerWidth, bannerHeight, bannerStyle, bgColor, borderColor, isHeader);

    // 2. Draw Styled Text
    const fontStr = `${weight} ${actualFontSize}px ${fontObj.family}`;
    const cy = by + bannerHeight / 2 + (isHeader ? 1 : 0);
    this.drawStyledText(ctx, text, center, cy, fontStr, textColor, textEffect, borderColor);

    ctx.restore();
  }

  // Draw Banner Background Shape
  drawBannerShape(ctx, bx, by, bw, bh, style, bgColor, borderColor, isHeader) {
    ctx.save();

    if (style === 'ribbon') {
      // Classic Celebration Ribbon with 3D folded triangular notched tails
      const tailW = 46;
      const foldOffset = isHeader ? 12 : -12;
      const notch = 18;

      // Shaded Back Folds
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.moveTo(bx, by + (isHeader ? bh : 0));
      ctx.lineTo(bx - 14, by + bh / 2);
      ctx.lineTo(bx, by + (isHeader ? 0 : bh));
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(bx + bw, by + (isHeader ? bh : 0));
      ctx.lineTo(bx + bw + 14, by + bh / 2);
      ctx.lineTo(bx + bw, by + (isHeader ? 0 : bh));
      ctx.fill();

      // Left Tail
      ctx.fillStyle = bgColor;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(bx, by + foldOffset);
      ctx.lineTo(bx - tailW, by + foldOffset);
      ctx.lineTo(bx - tailW + notch, by + foldOffset + bh / 2);
      ctx.lineTo(bx - tailW, by + foldOffset + bh);
      ctx.lineTo(bx, by + foldOffset + bh);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Tail
      ctx.beginPath();
      ctx.moveTo(bx + bw, by + foldOffset);
      ctx.lineTo(bx + bw + tailW, by + foldOffset);
      ctx.lineTo(bx + bw + tailW - notch, by + foldOffset + bh / 2);
      ctx.lineTo(bx + bw + tailW, by + foldOffset + bh);
      ctx.lineTo(bx + bw, by + foldOffset + bh);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Main Banner Center Body
      ctx.fillStyle = bgColor;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 6;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 8);
      ctx.fill();
      ctx.stroke();

      // Subtle Stitched Inner Line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx + 4, by + 4, bw - 8, bh - 8);

    } else if (style === 'pill') {
      // Capsule Pill
      ctx.fillStyle = bgColor;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, bh / 2);
      ctx.fill();
      ctx.stroke();

      // Subtle inner rim
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(bx + 4, by + 4, bw - 8, bh - 8, (bh - 8) / 2);
      ctx.stroke();

    } else if (style === 'luxury') {
      // Luxury Gold Double Frame with Diamond Ornaments
      ctx.fillStyle = bgColor;
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = 'rgba(251, 191, 36, 0.45)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 4;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 10);
      ctx.fill();
      ctx.stroke();

      // Inner gold hairline
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(bx + 5, by + 5, bw - 10, bh - 10, 6);
      ctx.stroke();

      // Left & Right Diamond Accents
      const drawDiamond = (cx, cy) => {
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 5);
        ctx.lineTo(cx + 5, cy);
        ctx.lineTo(cx, cy + 5);
        ctx.lineTo(cx - 5, cy);
        ctx.closePath();
        ctx.fill();
      };
      drawDiamond(bx + 14, by + bh / 2);
      drawDiamond(bx + bw - 14, by + bh / 2);

    } else if (style === 'neon') {
      // Cyber Neon Glow
      ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 3;
      ctx.shadowColor = borderColor;
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 12);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bx + 4, by + 4, bw - 8, bh - 8, 8);
      ctx.stroke();

    } else if (style === 'ornate') {
      // Traditional Khmer Crest with Pointed Ornamental End Tips
      const tipW = 32;
      ctx.fillStyle = bgColor;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 6;
      ctx.beginPath();
      ctx.moveTo(bx, by + bh / 2);
      ctx.lineTo(bx + tipW, by);
      ctx.lineTo(bx + bw - tipW, by);
      ctx.lineTo(bx + bw, by + bh / 2);
      ctx.lineTo(bx + bw - tipW, by + bh);
      ctx.lineTo(bx + tipW, by + bh);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inset accent points
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx + 10, by + bh / 2);
      ctx.lineTo(bx + tipW + 2, by + 5);
      ctx.lineTo(bx + bw - tipW - 2, by + 5);
      ctx.lineTo(bx + bw - 10, by + bh / 2);
      ctx.lineTo(bx + bw - tipW - 2, by + bh - 5);
      ctx.lineTo(bx + tipW + 2, by + bh - 5);
      ctx.closePath();
      ctx.stroke();

    } else if (style === 'glass') {
      // Frosted Glass
      ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 14);
      ctx.fill();
      ctx.stroke();

    } else {
      // Minimal Underline & Frame Accents
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 6);
      ctx.fill();
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(bx + 16, by + bh);
      ctx.lineTo(bx + bw - 16, by + bh);
      ctx.stroke();
    }

    ctx.restore();
  }

  // Draw Text with Typography Effects
  drawStyledText(ctx, text, cx, cy, fontStr, textColor, effect, borderColor) {
    ctx.save();
    ctx.font = fontStr;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (effect === 'outline') {
      // High contrast outline stroke around text for maximum readability
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.strokeText(text, cx, cy);
      ctx.fillStyle = textColor;
      ctx.fillText(text, cx, cy);

    } else if (effect === 'goldGlow') {
      // Rich Golden Bloom
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = textColor || '#fde047';
      ctx.fillText(text, cx, cy);

    } else if (effect === 'neonGlow') {
      // Electric Neon Bloom
      ctx.shadowColor = borderColor || '#06b6d4';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = textColor || '#ffffff';
      ctx.fillText(text, cx, cy);

    } else if (effect === 'shadow3d') {
      // Multi-layer 3D Extrusion Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillText(text, cx + 2, cy + 2);
      ctx.fillText(text, cx + 3, cy + 4);
      ctx.fillStyle = textColor;
      ctx.fillText(text, cx, cy);

    } else {
      // Clean Crisp with Soft Shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = textColor;
      ctx.fillText(text, cx, cy);
    }

    ctx.restore();
  }

}
