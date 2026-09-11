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

// Built-in Twibbon Frame Designer Studio
class FrameDesigner {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.size = options.size || 1000;
    this.canvas.width = this.size;
    this.canvas.height = this.size;

    this.settings = {
      shape: 'circle', // circle, rounded, square, arch, octagon
      theme: 'royalBlue', // royalBlue, emerald, crimson, sunset, midnightGold, cyberNeon, rosePink
      borderWidth: 50,
      ringColor: '#fbbf24',
      headerText: 'CLASS OF 2026',
      headerColor: '#fbbf24',
      headerBg: '#0f172a',
      footerText: 'CONGRATULATIONS!',
      footerColor: '#ffffff',
      footerBg: '#0f172a',
      showCornerAccents: true,
      showSparkles: true
    };

    this.themes = {
      royalBlue: {
        gradient: ['#1e3a8a', '#2563eb', '#1d4ed8'],
        ring: '#fbbf24',
        accent: '#f59e0b'
      },
      emerald: {
        gradient: ['#064e3b', '#059669', '#10b981'],
        ring: '#a7f3d0',
        accent: '#34d399'
      },
      crimson: {
        gradient: ['#7f1d1d', '#b91c1c', '#dc2626'],
        ring: '#fef08a',
        accent: '#eab308'
      },
      sunset: {
        gradient: ['#c2410c', '#ea580c', '#f97316'],
        ring: '#fef08a',
        accent: '#fde047'
      },
      midnightGold: {
        gradient: ['#09090b', '#18181b', '#27272a'],
        ring: '#eab308',
        accent: '#fde047'
      },
      cyberNeon: {
        gradient: ['#1e1b4b', '#3730a3', '#4f46e5'],
        ring: '#06b6d4',
        accent: '#ec4899'
      },
      rosePink: {
        gradient: ['#881337', '#e11d48', '#fb7185'],
        ring: '#ffffff',
        accent: '#fbcfe8'
      }
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
      sessionStorage.setItem('tra_designer_draft', JSON.stringify(this.settings));
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

  render() {
    const ctx = this.ctx;
    const s = this.size;
    const center = s / 2;
    const radius = 370;

    // Clear canvas
    ctx.clearRect(0, 0, s, s);

    // Create offscreen canvas for cutout masking
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = s;
    maskCanvas.height = s;
    const mCtx = maskCanvas.getContext('2d');

    // 1. Draw solid outer frame background on maskCanvas
    const theme = this.themes[this.settings.theme] || this.themes.royalBlue;
    const grad = mCtx.createLinearGradient(0, 0, s, s);
    grad.addColorStop(0, theme.gradient[0]);
    grad.addColorStop(0.5, theme.gradient[1]);
    grad.addColorStop(1, theme.gradient[2]);
    mCtx.fillStyle = grad;
    mCtx.fillRect(0, 0, s, s);

    // 2. Cut out the transparent hole using 'destination-out'
    mCtx.globalCompositeOperation = 'destination-out';
    mCtx.fillStyle = '#000000';
    mCtx.beginPath();

    if (this.settings.shape === 'circle') {
      mCtx.arc(center, center, radius, 0, Math.PI * 2);
    } else if (this.settings.shape === 'rounded') {
      const rw = 720;
      const rh = 720;
      mCtx.roundRect(center - rw / 2, center - rh / 2, rw, rh, 70);
    } else if (this.settings.shape === 'square') {
      const sq = 720;
      mCtx.rect(center - sq / 2, center - sq / 2, sq, sq);
    } else if (this.settings.shape === 'arch') {
      const aw = 680;
      const ah = 720;
      const ax = center - aw / 2;
      const ay = center - ah / 2;
      mCtx.moveTo(ax, ay + ah);
      mCtx.lineTo(ax, ay + aw / 2);
      mCtx.arc(center, ay + aw / 2, aw / 2, Math.PI, 0);
      mCtx.lineTo(ax + aw, ay + ah);
      mCtx.closePath();
    } else if (this.settings.shape === 'octagon') {
      const r = 380;
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4 - Math.PI / 8;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        if (i === 0) mCtx.moveTo(x, y);
        else mCtx.lineTo(x, y);
      }
      mCtx.closePath();
    }
    mCtx.fill();

    // Reset composite operation
    mCtx.globalCompositeOperation = 'source-over';

    // 3. Draw masked frame to main canvas
    ctx.drawImage(maskCanvas, 0, 0);

    // 4. Draw Inner Ring / Border Accents
    ctx.save();
    ctx.strokeStyle = this.settings.ringColor || theme.ring;
    ctx.lineWidth = 14;
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 6;

    if (this.settings.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(center, center, radius + 2, 0, Math.PI * 2);
      ctx.stroke();

      // Dashed subtle secondary ring
      ctx.beginPath();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.arc(center, center, radius + 18, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.settings.shape === 'rounded') {
      ctx.beginPath();
      ctx.roundRect(center - 362, center - 362, 724, 724, 72);
      ctx.stroke();
    } else if (this.settings.shape === 'square') {
      ctx.beginPath();
      ctx.rect(center - 362, center - 362, 724, 724);
      ctx.stroke();
    } else if (this.settings.shape === 'arch') {
      const aw = 684;
      const ah = 724;
      const ax = center - aw / 2;
      const ay = center - ah / 2;
      ctx.beginPath();
      ctx.moveTo(ax, ay + ah);
      ctx.lineTo(ax, ay + aw / 2);
      ctx.arc(center, ay + aw / 2, aw / 2, Math.PI, 0);
      ctx.lineTo(ax + aw, ay + ah);
      ctx.closePath();
      ctx.stroke();
    } else if (this.settings.shape === 'octagon') {
      const r = 384;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4 - Math.PI / 8;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();

    // 5. Corner Accents
    if (this.settings.showCornerAccents) {
      ctx.save();
      ctx.fillStyle = this.settings.ringColor || theme.ring;
      const offset = 60;
      const l = 100;
      // Top Left
      ctx.beginPath();
      ctx.moveTo(offset, offset + l);
      ctx.lineTo(offset + l, offset);
      ctx.lineTo(offset + l + 60, offset);
      ctx.lineTo(offset, offset + l + 60);
      ctx.closePath();
      ctx.fill();

      // Top Right
      ctx.beginPath();
      ctx.moveTo(s - offset, offset + l);
      ctx.lineTo(s - offset - l, offset);
      ctx.lineTo(s - offset - l - 60, offset);
      ctx.lineTo(s - offset, offset + l + 60);
      ctx.closePath();
      ctx.fill();

      // Bottom Left
      ctx.beginPath();
      ctx.moveTo(offset, s - offset - l);
      ctx.lineTo(offset + l, s - offset);
      ctx.lineTo(offset + l + 60, s - offset);
      ctx.lineTo(offset, s - offset - l - 60);
      ctx.closePath();
      ctx.fill();

      // Bottom Right
      ctx.beginPath();
      ctx.moveTo(s - offset, s - offset - l);
      ctx.lineTo(s - offset - l, s - offset);
      ctx.lineTo(s - offset - l - 60, s - offset);
      ctx.lineTo(s - offset, s - offset - l - 60);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 6. Header Badge Pill
    if (this.settings.headerText.trim()) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 6;

      const badgeWidth = Math.min(Math.max(ctx.measureText(this.settings.headerText).width + 120, 480), 760);
      const badgeHeight = 78;
      const bx = center - badgeWidth / 2;
      const by = 48;

      // Outer pill
      ctx.fillStyle = this.settings.headerBg || '#0f172a';
      ctx.beginPath();
      ctx.roundRect(bx, by, badgeWidth, badgeHeight, badgeHeight / 2);
      ctx.fill();

      // Border on pill
      ctx.strokeStyle = this.settings.headerColor || theme.ring;
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Text
      ctx.fillStyle = this.settings.headerColor || theme.ring;
      ctx.font = "900 32px 'Segoe UI', 'Kantumruy Pro', sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.settings.headerText.toUpperCase(), center, by + badgeHeight / 2);
      ctx.restore();
    }

    // 7. Footer Badge / Ribbon
    if (this.settings.footerText.trim()) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 6;

      const footerWidth = Math.min(Math.max(ctx.measureText(this.settings.footerText).width + 120, 460), 780);
      const footerHeight = 78;
      const fx = center - footerWidth / 2;
      const fy = s - 128;

      ctx.fillStyle = this.settings.footerBg || '#0f172a';
      ctx.beginPath();
      ctx.roundRect(fx, fy, footerWidth, footerHeight, 20);
      ctx.fill();

      ctx.strokeStyle = this.settings.ringColor || theme.ring;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = this.settings.footerColor || '#ffffff';
      ctx.font = "800 30px 'Segoe UI', 'Kantumruy Pro', sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.settings.footerText.toUpperCase(), center, fy + footerHeight / 2);
      ctx.restore();
    }
  }

  getTransparentPNGDataUrl() {
    return this.canvas.toDataURL('image/png');
  }
}
