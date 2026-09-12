// High-Performance Interactive HTML5 Canvas Studio for Twibbon Framing

class CanvasStudio {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.outputResolution = options.resolution || 1080; // 1080x1080 HD
    
    // Layers
    this.userImage = null;
    this.frameImage = null;

    // Transform State
    this.state = {
      x: 0,
      y: 0,
      scale: 1,
      baseScale: 1,
      rotation: 0,
      flipH: 1,
      flipV: 1,
      // Filters
      brightness: 100,
      contrast: 100,
      saturation: 100,
      sepia: 0,
      grayscale: 0
    };

    // Interaction tracking
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.lastPinchDistance = null;

    // Dirty & Unsaved Work State
    this.isDirty = false;
    this.isDownloaded = false;
    this.isCustomUserPhoto = false;

    // Callbacks
    this.onStateChange = options.onStateChange || null;
    this.onPhotoLoaded = options.onPhotoLoaded || null;

    this.initEvents();
  }

  hasUnsavedWork() {
    return (this.isCustomUserPhoto || this.isDirty) && !this.isDownloaded;
  }

  markDirty() {
    this.isDirty = true;
    this.isDownloaded = false;
  }

  clearDirty() {
    this.isDirty = false;
    this.isDownloaded = true;
  }

  setFrame(sourceUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (!sourceUrl.startsWith('data:')) {
        img.crossOrigin = "anonymous";
      }
      img.onload = () => {
        this.frameImage = img;
        this.render();
        resolve();
      };
      img.onerror = (e) => {
        console.error("Failed to load frame image", e);
        reject(e);
      };
      img.src = sourceUrl;
    });
  }

  setUserPhoto(sourceUrlOrFile, isCustom = true) {
    return new Promise((resolve, reject) => {
      if (typeof sourceUrlOrFile === 'string') {
        const img = new Image();
        if (!sourceUrlOrFile.startsWith('data:')) {
          img.crossOrigin = "anonymous";
        }
        img.onload = () => {
          this.userImage = img;
          this.fitPhotoToCanvas();
          if (isCustom) {
            this.isCustomUserPhoto = true;
            this.markDirty();
          } else {
            this.isCustomUserPhoto = false;
            this.isDirty = false;
          }
          this.render();
          if (this.onPhotoLoaded) this.onPhotoLoaded();
          resolve();
        };
        img.onerror = reject;
        img.src = sourceUrlOrFile;
      } else if (sourceUrlOrFile instanceof File || sourceUrlOrFile instanceof Blob) {
        if (typeof SecurityUtils !== 'undefined' && sourceUrlOrFile instanceof File) {
          const check = SecurityUtils.validateImageFile(sourceUrlOrFile);
          if (!check.valid) {
            reject(new Error(check.error));
            return;
          }
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            this.userImage = img;
            this.fitPhotoToCanvas();
            this.isCustomUserPhoto = true;
            this.markDirty();
            this.render();
            if (this.onPhotoLoaded) this.onPhotoLoaded();
            resolve();
          };
          img.onerror = reject;
          img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(sourceUrlOrFile);
      }
    });
  }

  fitPhotoToCanvas() {
    if (!this.userImage) return;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const iw = this.userImage.width;
    const ih = this.userImage.height;

    // Calculate scale to cover canvas smoothly
    const scaleX = cw / iw;
    const scaleY = ch / ih;
    this.state.baseScale = Math.max(scaleX, scaleY);
    this.state.scale = 1;
    this.state.x = 0;
    this.state.y = 0;
    this.state.rotation = 0;
    this.state.flipH = 1;
    this.state.flipV = 1;
    this.resetFilters();
    this.notifyChange();
  }

  resetFilters() {
    this.state.brightness = 100;
    this.state.contrast = 100;
    this.state.saturation = 100;
    this.state.sepia = 0;
    this.state.grayscale = 0;
    this.notifyChange();
  }

  resetPosition() {
    this.state.x = 0;
    this.state.y = 0;
    this.state.scale = 1;
    this.state.rotation = 0;
    this.state.flipH = 1;
    this.state.flipV = 1;
    this.render();
    this.notifyChange();
  }

  setScale(val) {
    this.state.scale = Math.min(Math.max(val, 0.2), 4.0);
    this.render();
    this.notifyChange();
  }

  setRotation(deg) {
    this.state.rotation = (deg % 360 + 360) % 360;
    this.render();
    this.notifyChange();
  }

  rotate90() {
    this.setRotation(this.state.rotation + 90);
  }

  toggleFlipH() {
    this.state.flipH *= -1;
    this.render();
    this.notifyChange();
  }

  toggleFlipV() {
    this.state.flipV *= -1;
    this.render();
    this.notifyChange();
  }

  setFilter(name, value) {
    if (this.state.hasOwnProperty(name)) {
      this.state[name] = value;
      this.render();
      this.notifyChange();
    }
  }

  notifyChange() {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }

  initEvents() {
    const el = this.canvas;

    // Mouse Drag Events
    el.addEventListener('mousedown', (e) => {
      if (!this.userImage) return;
      this.isDragging = true;
      const rect = el.getBoundingClientRect();
      const scaleCoord = (rect.width > 0) ? (this.canvas.width / rect.width) : 1;
      this.dragStartX = e.clientX * scaleCoord - this.state.x;
      this.dragStartY = e.clientY * scaleCoord - this.state.y;
      el.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging || !this.userImage) return;
      const rect = el.getBoundingClientRect();
      const scaleCoord = (rect.width > 0) ? (this.canvas.width / rect.width) : 1;
      this.state.x = e.clientX * scaleCoord - this.dragStartX;
      this.state.y = e.clientY * scaleCoord - this.dragStartY;
      this.render();
      this.notifyChange();
    });

    window.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        el.style.cursor = 'grab';
      }
    });

    // Mouse Wheel Zoom
    el.addEventListener('wheel', (e) => {
      if (!this.userImage) return;
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      this.setScale(this.state.scale * zoomFactor);
    }, { passive: false });

    // Touch Drag & Pinch Zoom Events
    el.addEventListener('touchstart', (e) => {
      if (!this.userImage) return;
      e.preventDefault();
      if (e.touches.length === 1) {
        this.isDragging = true;
        const rect = el.getBoundingClientRect();
        const scaleCoord = (rect.width > 0) ? (this.canvas.width / rect.width) : 1;
        this.dragStartX = e.touches[0].clientX * scaleCoord - this.state.x;
        this.dragStartY = e.touches[0].clientY * scaleCoord - this.state.y;
      } else if (e.touches.length === 2) {
        this.isDragging = false;
        this.lastPinchDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }, { passive: false });

    el.addEventListener('touchmove', (e) => {
      if (!this.userImage) return;
      e.preventDefault();
      if (e.touches.length === 1 && this.isDragging) {
        const rect = el.getBoundingClientRect();
        const scaleCoord = (rect.width > 0) ? (this.canvas.width / rect.width) : 1;
        this.state.x = e.touches[0].clientX * scaleCoord - this.dragStartX;
        this.state.y = e.touches[0].clientY * scaleCoord - this.dragStartY;
        this.render();
        this.notifyChange();
      } else if (e.touches.length === 2 && this.lastPinchDistance) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = dist / this.lastPinchDistance;
        this.setScale(this.state.scale * factor);
        this.lastPinchDistance = dist;
      }
    }, { passive: false });

    el.addEventListener('touchend', (e) => {
      if (e.touches.length < 2) {
        this.lastPinchDistance = null;
      }
      if (e.touches.length === 1 && this.userImage) {
        this.isDragging = true;
        const rect = el.getBoundingClientRect();
        const scaleCoord = (rect.width > 0) ? (this.canvas.width / rect.width) : 1;
        this.dragStartX = e.touches[0].clientX * scaleCoord - this.state.x;
        this.dragStartY = e.touches[0].clientY * scaleCoord - this.state.y;
      } else if (e.touches.length === 0) {
        this.isDragging = false;
      }
    });
  }

  getFilterString() {
    const { brightness, contrast, saturation, sepia, grayscale } = this.state;
    return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) sepia(${sepia}%) grayscale(${grayscale}%)`;
  }

  renderToContext(ctx, width, height, isExport = false) {
    // 1. Clear background
    ctx.clearRect(0, 0, width, height);

    // If not export and no photo, draw helpful placeholder
    if (!this.userImage && !isExport) {
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, width, height);

      // Draw subtle grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 2;
      const step = 40;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }
    }

    // 2. Draw User Image Layer
    if (this.userImage) {
      ctx.save();
      // Move to center + pan offset
      const cx = width / 2 + (this.state.x * (width / this.canvas.width));
      const cy = height / 2 + (this.state.y * (height / this.canvas.height));
      ctx.translate(cx, cy);

      // Rotate
      ctx.rotate((this.state.rotation * Math.PI) / 180);

      // Flip
      ctx.scale(this.state.flipH, this.state.flipV);

      // Calculate scaled dimensions
      const totalScale = this.state.baseScale * this.state.scale * (width / this.canvas.width);
      const iw = this.userImage.width * totalScale;
      const ih = this.userImage.height * totalScale;

      // Filter
      ctx.filter = this.getFilterString();

      // Draw centered
      ctx.drawImage(this.userImage, -iw / 2, -ih / 2, iw, ih);
      ctx.restore();
    }

    // 3. Draw Frame Overlay
    if (this.frameImage) {
      ctx.save();
      ctx.filter = "none";
      ctx.drawImage(this.frameImage, 0, 0, width, height);
      ctx.restore();
    }
  }

  render() {
    this.renderToContext(this.ctx, this.canvas.width, this.canvas.height, false);
  }

  exportHighRes() {
    return new Promise((resolve) => {
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = this.outputResolution;
      exportCanvas.height = this.outputResolution;
      const expCtx = exportCanvas.getContext('2d');

      // High image rendering smoothing
      expCtx.imageSmoothingEnabled = true;
      expCtx.imageSmoothingQuality = 'high';

      this.renderToContext(expCtx, this.outputResolution, this.outputResolution, true);

      if (exportCanvas.toBlob) {
        exportCanvas.toBlob((blob) => {
          this.clearDirty();
          if (blob) {
            resolve(blob);
          } else {
            const dataUrl = exportCanvas.toDataURL('image/png', 1.0);
            fetch(dataUrl).then(res => res.blob()).then(resolve).catch(() => resolve(null));
          }
        }, 'image/png', 1.0);
      } else {
        this.clearDirty();
        const dataUrl = exportCanvas.toDataURL('image/png', 1.0);
        fetch(dataUrl).then(res => res.blob()).then(resolve).catch(() => resolve(null));
      }
    });
  }
}

// Confetti Particle System for Celebratory Downloads
function triggerConfetti() {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);

  const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
  const particleCount = 70;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'confetti-particle';
    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    particle.style.left = `${Math.random() * 100}vw`;
    particle.style.top = '-20px';
    particle.style.transform = `rotate(${Math.random() * 360}deg)`;
    particle.style.animation = `confettiFall ${2 + Math.random() * 2}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`;
    particle.style.animationDelay = `${Math.random() * 0.5}s`;
    container.appendChild(particle);
  }

  setTimeout(() => {
    container.remove();
  }, 4500);
}
