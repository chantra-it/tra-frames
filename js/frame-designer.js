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
      footerText: 'CONGRATULATIONS!',
      footerColor: '#ffffff',
      footerBg: '#0f172a',
      showFooter: true,
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

  update(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
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

    this.update({
      shape,
      theme,
      pattern,
      borderStyle,
      cornerStyle,
      sticker
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

    // 7. Header Badge Pill
    if (this.settings.showHeader && this.settings.headerText.trim()) {
      ctx.save();
      ctx.font = "900 32px 'Segoe UI', 'Kantumruy Pro', sans-serif";
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;

      const badgeWidth = Math.min(Math.max(ctx.measureText(this.settings.headerText.toUpperCase()).width + 120, 480), 780);
      const badgeHeight = 78;
      const bx = center - badgeWidth / 2;
      const by = 48;

      // Outer pill
      ctx.fillStyle = this.settings.headerBg || '#0f172a';
      ctx.beginPath();
      ctx.roundRect(bx, by, badgeWidth, badgeHeight, badgeHeight / 2);
      ctx.fill();

      // Border on pill
      ctx.strokeStyle = this.settings.headerColor || ringColor;
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Text
      ctx.fillStyle = this.settings.headerColor || ringColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.settings.headerText.toUpperCase(), center, by + badgeHeight / 2);
      ctx.restore();
    }

    // 8. Footer Badge / Ribbon
    if (this.settings.showFooter && this.settings.footerText.trim()) {
      ctx.save();
      ctx.font = "800 30px 'Segoe UI', 'Kantumruy Pro', sans-serif";
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;

      const footerWidth = Math.min(Math.max(ctx.measureText(this.settings.footerText.toUpperCase()).width + 120, 460), 800);
      const footerHeight = 78;
      const fx = center - footerWidth / 2;
      const fy = s - 128;

      ctx.fillStyle = this.settings.footerBg || '#0f172a';
      ctx.beginPath();
      ctx.roundRect(fx, fy, footerWidth, footerHeight, 20);
      ctx.fill();

      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 3.5;
      ctx.stroke();

      ctx.fillStyle = this.settings.footerColor || '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.settings.footerText.toUpperCase(), center, fy + footerHeight / 2);
      ctx.restore();
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
}
