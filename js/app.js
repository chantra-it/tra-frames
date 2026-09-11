// Main Single Page Application Coordinator & Router

class TwibbonApp {
  constructor() {
    this.currentView = 'explore';
    this.activeCampaign = null;
    this.activeStudio = null;
    this.activeDesigner = null;
    this.currentCategory = 'all';
    this.searchQuery = '';
    this.sortOrder = 'popular';

    // Force default to clean light mode
    const storedTheme = localStorage.getItem('twibbon_theme');
    this.theme = (storedTheme === 'dark' || storedTheme === 'light') ? storedTheme : 'light';
    // If it was previous dark, default to light for clean aesthetic
    if (!storedTheme) {
      this.theme = 'light';
      localStorage.setItem('twibbon_theme', 'light');
    }

    this.init();
  }

  init() {
    // 1. Apply theme
    document.documentElement.setAttribute('data-theme', this.theme);

    // 2. Initialize Firebase Auth
    if (typeof AuthService !== 'undefined') {
      AuthService.init();
      AuthService.onAuthStateChanged((user) => {
        this.updateNavAuth(user);
        if (this.currentView === 'create' || this.currentView === 'my-campaigns') {
          this.renderCurrentView();
        }
      });
    }

    // 3. Setup hash routing
    window.addEventListener('hashchange', () => this.handleRoute());

    // 4. Listen for language changes
    document.addEventListener('languageChanged', () => {
      this.updateStaticTranslations();
      this.updateNavAuth(AuthService ? AuthService.currentUser : null);
      this.renderCurrentView();
    });

    // 5. Initial route resolution
    this.updateStaticTranslations();
    this.handleRoute();
  }

  setTheme(theme) {
    this.theme = theme;
    localStorage.setItem('twibbon_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    this.updateThemeIcons();
  }

  toggleTheme() {
    this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
  }

  updateThemeIcons() {
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.innerHTML = this.theme === 'dark' ? Icons.sun : Icons.moon;
    }
  }

  updateStaticTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) el.placeholder = t(key);
    });

    const langBtnText = document.getElementById('langBtnText');
    if (langBtnText) {
      langBtnText.textContent = getLanguage() === 'km' ? 'ខ្មែរ' : 'EN';
    }

    this.updateThemeIcons();
  }

  updateNavAuth(user) {
    const container = document.getElementById('navAuthContainer');
    if (!container) return;

    if (!user) {
      container.innerHTML = `
        <button class="btn btn-outline btn-nav-signin" id="btnNavSignIn" onclick="app.openAuthModal()">
          ${Icons.logIn} <span>${t('signIn')}</span>
        </button>
      `;
    } else {
      const initial = SecurityUtils.cleanText(((user.displayName || user.email || 'U').trim()[0] || 'U').toUpperCase(), 1).replace(/[^A-Z0-9]/g, 'U');
      const displayName = SecurityUtils.escapeHtml(user.displayName || user.email.split('@')[0]);
      container.innerHTML = `
        <div class="user-profile-badge" id="userProfileBadge" onclick="app.toggleUserDropdown(event)">
          <div class="user-avatar-wrap">
            ${user.photoURL 
              ? `<img src="${SecurityUtils.sanitizeUrl(user.photoURL)}" class="user-avatar-img" alt="${displayName}" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" /><div class="user-avatar-placeholder" style="display:none;">${initial}</div>`
              : `<div class="user-avatar-placeholder">${initial}</div>`
            }
          </div>
          <span class="user-name-text">${displayName}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
          
          <div class="user-dropdown" id="userDropdownMenu" style="display: none;">
            <div style="padding: 0.45rem 0.75rem; border-bottom: 1px solid var(--border-color); font-size: 0.78rem; color: var(--text-muted); word-break: break-all;">
              ${SecurityUtils.escapeHtml(user.email)}
            </div>
            <button class="user-dropdown-item" onclick="window.location.hash='#my-campaigns'">
              ${Icons.avatar} <span>${t('myCampaigns')}</span>
            </button>
            <button class="user-dropdown-item" onclick="window.location.hash='#create'">
              ${Icons.plus} <span>${t('createCampaign')}</span>
            </button>
            <button class="user-dropdown-item danger" onclick="app.handleSignOut()">
              ${Icons.logOut} <span>${t('signOut')}</span>
            </button>
          </div>
        </div>
      `;
    }
  }

  toggleUserDropdown(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('userDropdownMenu');
    if (!dropdown) return;
    const isVisible = dropdown.style.display === 'flex';
    dropdown.style.display = isVisible ? 'none' : 'flex';

    if (!isVisible) {
      const closeDropdown = () => {
        dropdown.style.display = 'none';
        document.removeEventListener('click', closeDropdown);
      };
      setTimeout(() => document.addEventListener('click', closeDropdown), 0);
    }
  }

  async handleSignOut() {
    try {
      await AuthService.logout();
      this.showToast(t('logoutSuccess'), 'success');
      if (this.currentView === 'create' || this.currentView === 'my-campaigns') {
        window.location.hash = '#explore';
      }
    } catch (err) {
      this.showToast("Error signing out", 'error');
    }
  }

  openAuthModal(onSuccessCallback) {
    const existing = document.getElementById('authModalOverlay');
    if (existing) existing.remove();

    const isKm = getLanguage() === 'km';
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'authModalOverlay';
    overlay.innerHTML = `
      <div class="modal-card" style="max-width: 440px;">
        <div class="modal-header">
          <h3>${Icons.avatar} <span>${t('signIn')} / ${t('signUp')}</span></h3>
          <button class="modal-close-btn" onclick="document.getElementById('authModalOverlay').remove()">&times;</button>
        </div>

        <div style="background: var(--accent-soft); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: var(--radius-md); padding: 0.75rem 1rem; font-size: 0.84rem; color: var(--accent-primary); line-height: 1.5;">
          💡 <strong>${t('supporterNoLoginTip')}</strong>
        </div>

        <!-- Google Sign-In Primary Button -->
        <button class="btn-google" id="btnAuthGoogle">
          ${Icons.google} <span>${t('signInWithGoogle')}</span>
        </button>

        <div class="auth-divider">
          <span>${t('orDivider')}</span>
        </div>

        <!-- Auth Tabs (Sign In / Sign Up) -->
        <div class="auth-tabs">
          <button class="auth-tab active" id="tabSignIn">${t('signIn')}</button>
          <button class="auth-tab" id="tabSignUp">${t('createAccount')}</button>
        </div>

        <form id="authEmailForm" style="display: flex; flex-direction: column; gap: 1rem;">
          <div class="form-group" id="groupDisplayName" style="display: none;">
            <label class="form-label">${t('fullName')}</label>
            <input type="text" id="authDisplayNameInput" class="form-input" placeholder="e.g. Sok Chantra" />
          </div>

          <div class="form-group">
            <label class="form-label">${t('email')} *</label>
            <input type="email" id="authEmailInput" class="form-input" placeholder="name@example.com" required />
          </div>

          <div class="form-group">
            <label class="form-label">${t('password')} *</label>
            <input type="password" id="authPasswordInput" class="form-input" placeholder="••••••••" required minlength="6" />
          </div>

          <button type="submit" class="btn btn-primary" id="btnAuthSubmit" style="padding: 0.85rem; font-size: 1rem; margin-top: 0.25rem;">
            <span>${t('signIn')}</span>
          </button>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    let isSignUp = false;
    const tabSignIn = overlay.querySelector('#tabSignIn');
    const tabSignUp = overlay.querySelector('#tabSignUp');
    const groupName = overlay.querySelector('#groupDisplayName');
    const btnSubmit = overlay.querySelector('#btnAuthSubmit span');

    tabSignIn.addEventListener('click', () => {
      isSignUp = false;
      tabSignIn.classList.add('active');
      tabSignUp.classList.remove('active');
      groupName.style.display = 'none';
      btnSubmit.textContent = t('signIn');
    });

    tabSignUp.addEventListener('click', () => {
      isSignUp = true;
      tabSignUp.classList.add('active');
      tabSignIn.classList.remove('active');
      groupName.style.display = 'flex';
      btnSubmit.textContent = t('signUp');
    });

    // Handle Google Login
    overlay.querySelector('#btnAuthGoogle').addEventListener('click', async () => {
      try {
        await AuthService.loginWithGoogle();
        overlay.remove();
        this.showToast(t('loginSuccess'), 'success');
        if (onSuccessCallback) onSuccessCallback();
      } catch (err) {
        console.error(err);
        if (err.code === 'auth/unauthorized-domain') {
          this.showToast(isKm ? "Domain មិនទាន់អនុញ្ញាតក្នុង Firebase Console ទេ សូម Add frame.tra4me.com ក្នុង Firebase Console > Authentication > Settings" : "Domain not authorized. Add frame.tra4me.com in Firebase Console > Authentication > Settings", 'error');
        } else if (err.code !== 'auth/popup-closed-by-user') {
          this.showToast(t('loginFailed'), 'error');
        }
      }
    });

    // Handle Email Login / Sign-up
    overlay.querySelector('#authEmailForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = overlay.querySelector('#authEmailInput').value.trim();
      const password = overlay.querySelector('#authPasswordInput').value;
      const name = overlay.querySelector('#authDisplayNameInput').value.trim();

      try {
        if (isSignUp) {
          const user = await AuthService.signUpWithEmail(email, password, name);
          overlay.remove();
          if (user && !user.emailVerified) {
            this.openOtpModal(email, () => {
              if (onSuccessCallback) onSuccessCallback();
            });
          } else {
            this.showToast(t('signupSuccess'), 'success');
            if (onSuccessCallback) onSuccessCallback();
          }
          return;
        } else {
          await AuthService.loginWithEmail(email, password);
          this.showToast(t('loginSuccess'), 'success');
          overlay.remove();
          if (onSuccessCallback) onSuccessCallback();
        }
      } catch (err) {
        console.error(err);
        let msg = t('loginFailed');
        if (err.code === 'auth/disposable-email') {
          msg = t('disposableEmailError');
        } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          msg = isKm ? "អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ" : "Incorrect email or password.";
        } else if (err.code === 'auth/email-already-in-use') {
          msg = isKm ? "អ៊ីមែលនេះមានគណនីរួចហើយ សូមជ្រើសរើស ចូលគណនី" : "Email already registered. Please sign in.";
        } else if (err.code === 'auth/weak-password') {
          msg = isKm ? "ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច ៦ តួអក្សរ" : "Password must be at least 6 characters.";
        } else if (err.code === 'auth/operation-not-allowed') {
          msg = isKm ? "មុខងារ Email/Password មិនទាន់បានបើកក្នុង Firebase Console ទេ" : "Email/Password sign-in is disabled in Firebase Console.";
        } else if (err.code === 'auth/invalid-email') {
          msg = isKm ? "ទម្រង់អ៊ីមែលមិនត្រឹមត្រូវទេ" : "Invalid email address format.";
        } else if (err.code === 'auth/too-many-requests') {
          msg = err.message || (isKm ? "សូមរង់ចាំបន្តិចមុននឹងព្យាយាមម្តងទៀត" : "Too many requests. Please wait.");
        }
        this.showToast(msg, 'error');
      }
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  // ==========================================
  // 6-DIGIT EMAIL OTP VERIFICATION MODAL
  // ==========================================
  openOtpModal(email, onSuccessCallback) {
    const existing = document.getElementById('traOtpModalOverlay');
    if (existing) existing.remove();

    const isKm = getLanguage() === 'km';
    const targetEmail = email || (AuthService.currentUser ? AuthService.currentUser.email : '');
    const cleanEmail = SecurityUtils.escapeHtml(targetEmail);

    const overlay = document.createElement('div');
    overlay.id = 'traOtpModalOverlay';
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '9999';

    overlay.innerHTML = `
      <div class="otp-modal-content">
        <button class="modal-close-btn" id="btnOtpClose" style="position: absolute; top: 1rem; right: 1rem;">${Icons.close}</button>
        
        <div class="otp-icon-wrapper">
          ${Icons.mail}
        </div>
        
        <h2 style="font-size: 1.45rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.4rem;">
          ${t('otpModalTitle')}
        </h2>
        
        <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5; margin-bottom: 0.75rem;">
          ${t('otpModalSubtitle')}<br>
          <strong style="color: var(--accent-primary); word-break: break-all;">${cleanEmail}</strong>
        </p>

        <!-- 6-Digit Segmented Inputs -->
        <div class="otp-inputs-grid" id="otpInputsGrid">
          <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" class="otp-digit" data-index="0" autofocus>
          <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" class="otp-digit" data-index="1">
          <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" class="otp-digit" data-index="2">
          <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" class="otp-digit" data-index="3">
          <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" class="otp-digit" data-index="4">
          <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" class="otp-digit" data-index="5">
        </div>

        <div class="otp-timer-badge" id="otpTimerBadge">
          <span>⏱️ ${isKm ? 'សុពលភាព៖' : 'Expires in:'} <span id="otpCountdown">10:00</span></span>
        </div>

        <div class="otp-actions-wrapper">
          <button class="btn btn-primary" id="btnOtpSubmit" style="padding: 0.85rem; font-size: 1rem; width: 100%;" disabled>
            <span>${t('otpVerifyBtn')}</span>
          </button>
          
          <button class="btn btn-secondary" id="btnOtpResend" style="padding: 0.7rem; font-size: 0.88rem; width: 100%;">
            <span>${t('otpResendBtn')}</span>
          </button>
        </div>

        <div style="margin-top: 1.25rem; font-size: 0.82rem; color: var(--text-muted); line-height: 1.5; background: var(--bg-secondary); padding: 0.65rem 0.85rem; border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
          💡 ${isKm ? 'ប្រសិនបើមិនឃើញ Email ក្នុង Inbox សូមពិនិត្យមើលក្នុងប្រអប់ <strong>Spam</strong> ឬ <strong>Junk</strong>' : 'If you do not see the email, please check your <strong>Spam</strong> or <strong>Junk</strong> folder'}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const digits = overlay.querySelectorAll('.otp-digit');
    const submitBtn = overlay.querySelector('#btnOtpSubmit');
    const resendBtn = overlay.querySelector('#btnOtpResend');
    const countdownEl = overlay.querySelector('#otpCountdown');

    // Focus first input box
    setTimeout(() => {
      if (digits[0]) digits[0].focus();
    }, 100);

    const getEnteredOtp = () => Array.from(digits).map(d => d.value).join('');

    const checkFull = () => {
      const val = getEnteredOtp();
      const isComplete = val.length === 6 && /^\d{6}$/.test(val);
      submitBtn.disabled = !isComplete;
      if (isComplete) {
        doVerify();
      }
    };

    // Digit keyboard inputs
    digits.forEach((input, idx) => {
      input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/\D/g, '');
        e.target.value = val ? val[val.length - 1] : '';
        if (e.target.value) {
          e.target.classList.add('filled');
          if (idx < 5) digits[idx + 1].focus();
        } else {
          e.target.classList.remove('filled');
        }
        checkFull();
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace') {
          if (!input.value && idx > 0) {
            digits[idx - 1].focus();
            digits[idx - 1].value = '';
            digits[idx - 1].classList.remove('filled');
          } else {
            input.value = '';
            input.classList.remove('filled');
          }
          checkFull();
        } else if (e.key === 'ArrowLeft' && idx > 0) {
          digits[idx - 1].focus();
        } else if (e.key === 'ArrowRight' && idx < 5) {
          digits[idx + 1].focus();
        }
      });

      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
        const numOnly = pasteData.replace(/\D/g, '').slice(0, 6);
        if (numOnly) {
          for (let i = 0; i < 6; i++) {
            if (i < numOnly.length) {
              digits[i].value = numOnly[i];
              digits[i].classList.add('filled');
            } else {
              digits[i].value = '';
              digits[i].classList.remove('filled');
            }
          }
          const nextIdx = Math.min(5, numOnly.length);
          digits[nextIdx].focus();
          checkFull();
        }
      });
    });

    // 10-Minute Countdown
    let totalSeconds = 600;
    const timerInterval = setInterval(() => {
      totalSeconds--;
      if (totalSeconds <= 0) {
        clearInterval(timerInterval);
        countdownEl.textContent = "00:00";
        submitBtn.disabled = true;
        this.showToast(t('otpExpiredCode'), 'error');
        return;
      }
      const mins = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
      const secs = String(totalSeconds % 60).padStart(2, '0');
      countdownEl.textContent = `${mins}:${secs}`;
    }, 1000);

    // Resend 60s cooldown
    let resendCooldown = 60;
    const startResendCooldown = () => {
      resendBtn.disabled = true;
      let left = resendCooldown;
      const resendInterval = setInterval(() => {
        left--;
        if (left <= 0) {
          clearInterval(resendInterval);
          resendBtn.disabled = false;
          resendBtn.textContent = t('otpResendBtn');
        } else {
          resendBtn.textContent = `${t('otpResendWait')} ${left}s`;
        }
      }, 1000);
    };
    startResendCooldown();

    // Verify logic
    let isVerifying = false;
    const doVerify = async () => {
      if (isVerifying) return;
      const code = getEnteredOtp();
      if (code.length !== 6) return;

      isVerifying = true;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>⏳ ${isKm ? 'កំពុងផ្ទៀងផ្ទាត់...' : 'Verifying...'}</span>`;

      try {
        const result = await OtpService.verifyOtp(targetEmail, code);
        if (result.success) {
          clearInterval(timerInterval);
          this.showToast(t('otpVerifiedSuccess'), 'success');
          overlay.remove();
          if (onSuccessCallback) onSuccessCallback();
        } else {
          isVerifying = false;
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>${t('otpVerifyBtn')}</span>`;
          if (result.reason === 'expired') {
            this.showToast(t('otpExpiredCode'), 'error');
          } else if (result.reason === 'max_attempts') {
            this.showToast(t('otpMaxAttempts'), 'error');
          } else {
            this.showToast(t('otpInvalidCode'), 'error');
            const grid = overlay.querySelector('#otpInputsGrid');
            if (grid) {
              grid.style.animation = 'shake 0.4s ease';
              setTimeout(() => { grid.style.animation = ''; }, 400);
            }
          }
        }
      } catch (err) {
        isVerifying = false;
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>${t('otpVerifyBtn')}</span>`;
        this.showToast(t('otpInvalidCode'), 'error');
      }
    };

    submitBtn.addEventListener('click', doVerify);

    // Resend logic
    resendBtn.addEventListener('click', async () => {
      resendBtn.disabled = true;
      try {
        await OtpService.generateOtp(targetEmail);
        this.showToast(t('verificationEmailSent'), 'success');
        startResendCooldown();
        digits.forEach(d => { d.value = ''; d.classList.remove('filled'); });
        digits[0].focus();
        submitBtn.disabled = true;
      } catch (err) {
        resendBtn.disabled = false;
        this.showToast(err.message || 'Error sending OTP', 'error');
      }
    });

    // Close button & backdrop
    const closeBtn = overlay.querySelector('#btnOtpClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        clearInterval(timerInterval);
        overlay.remove();
      });
    }

    // In-App OTP Notification listener (helps user see OTP instantly)
    const onOtpDispatched = (e) => {
      if (e.detail && e.detail.otpCode) {
        this.showToast(`📩 OTP Code: ${e.detail.otpCode}`, 'info', 8000);
      }
    };
    window.addEventListener('tra_otp_dispatched', onOtpDispatched, { once: true });
  }

  async copyToClipboard(text) {
    if (!text) return false;
    let successful = false;

    // Method 1: Modern navigator.clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        successful = true;
      } catch (err) {
        console.warn('navigator.clipboard.writeText failed, attempting fallback...', err);
      }
    }

    // Method 2: Robust Fallback with temporary textarea
    if (!successful) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.top = '0';
        textArea.style.left = '-9999px';
        textArea.style.width = '2em';
        textArea.style.height = '2em';
        textArea.style.padding = '0';
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';
        textArea.style.background = 'transparent';
        textArea.setAttribute('readonly', '');
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        textArea.setSelectionRange(0, textArea.value.length);
        successful = document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch (err) {
        console.error('execCommand copy fallback failed:', err);
      }
    }

    return successful;
  }

  getShareableLink(campaign) {
    if (!campaign) return window.location.href;
    const slug = encodeURIComponent(String(campaign.slug || campaign.id || '').trim());
    if (window.location.protocol === 'file:') {
      return `https://frame.tra4me.com/#campaign/${slug}`;
    }
    return `${window.location.origin}${window.location.pathname}#campaign/${slug}`;
  }

  openShareModalById(identifier) {
    if (!identifier) return;
    const cleanId = String(identifier).trim();
    const campaign = CampaignService.getCampaignBySlugOrId(cleanId);
    if (campaign) {
      this.openShareModal(campaign);
    }
  }

  openShareModal(campaign) {
    const shareUrl = this.getShareableLink(campaign);
    const isKm = getLanguage() === 'km';
    const title = (isKm ? campaign.titleKm : campaign.titleEn) || campaign.titleKm || campaign.titleEn;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(shareUrl)}`;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'shareModalOverlay';
    overlay.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <h3>🚀 ${isKm ? 'ចែករំលែកតំណភ្ជាប់យុទ្ធនាការ' : 'Share Campaign Link'}</h3>
          <button class="modal-close-btn" onclick="document.getElementById('shareModalOverlay').remove()">&times;</button>
        </div>
        
        <p style="font-size: 0.92rem; color: var(--text-secondary); line-height: 1.5;">
          ${isKm 
            ? 'ផ្ញើតំណភ្ជាប់ (Link) នេះទៅកាន់មិត្តភក្តិ ឬអ្នកគាំទ្រ ដើម្បីឱ្យពួកគេអាចចូលមកពាក់ស៊ុមរូបថតនេះបានភ្លាមៗ៖' 
            : 'Send this shareable link to supporters so they can instantly wear and download your campaign frame:'}
        </p>

        <!-- Link Copy Bar -->
        <div class="share-link-input-group">
          <input type="text" class="share-link-input" id="modalShareLinkInput" value="${shareUrl}" readonly />
          <button class="btn btn-primary" id="btnModalCopyLink">
            ${Icons.copy} <span>${t('copyLink')}</span>
          </button>
        </div>

        <!-- QR Code Section -->
        <div class="share-qr-container">
          <img src="${qrUrl}" alt="QR Code" class="share-qr-img" />
          <div class="share-qr-desc">
            <strong>${isKm ? 'ស្កេន QR Code តាមទូរស័ព្ទ' : 'Scan via Mobile Camera'}</strong>
            <span>${isKm ? 'អ្នកគាំទ្រអាចស្កេនរូបនេះដើម្បីបើកស៊ុមលើទូរស័ព្ទដៃបានភ្លាមៗ' : 'Point camera to open and use this frame directly on mobile'}</span>
          </div>
        </div>

        <!-- Social Buttons -->
        <div style="display: flex; gap: 0.6rem; justify-content: center; margin-top: 0.25rem;">
          <button class="btn btn-secondary" onclick="window.open('https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}', '_blank', 'noopener,noreferrer')">
            ${Icons.telegram} <span>Telegram</span>
          </button>
          <button class="btn btn-secondary" onclick="window.open('https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}', '_blank', 'noopener,noreferrer')">
            ${Icons.facebook} <span>Facebook</span>
          </button>
          <button class="btn btn-secondary" onclick="window.open('https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' ' + shareUrl)}', '_blank', 'noopener,noreferrer')">
            <span>WhatsApp</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const btnModalCopy = overlay.querySelector('#btnModalCopyLink');
    if (btnModalCopy) {
      btnModalCopy.addEventListener('click', async () => {
        await this.copyToClipboard(shareUrl);
        this.showToast(t('linkCopied'), 'success');
        const btn = btnModalCopy.querySelector('span');
        if (btn) {
          const orig = btn.textContent;
          btn.textContent = isKm ? 'បានចម្លង!' : 'Copied!';
          setTimeout(() => { btn.textContent = orig; }, 2000);
        }
      });
    }

    const modalInput = overlay.querySelector('#modalShareLinkInput');
    if (modalInput) {
      modalInput.addEventListener('click', () => modalInput.select());
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  handleRoute() {
    const hash = window.location.hash.slice(1) || 'explore';
    const parts = hash.split('/');
    const mainRoute = parts[0];
    const param = parts[1];

    this.updateNavLinks(mainRoute);

    if (mainRoute === 'campaign' && param) {
      this.loadCampaignView(param);
    } else if (mainRoute === 'create') {
      this.loadCreateView(param);
    } else if (mainRoute === 'designer') {
      this.loadDesignerView();
    } else if (mainRoute === 'my-campaigns') {
      this.loadMyCampaignsView();
    } else {
      this.loadExploreView();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  updateNavLinks(activeRoute) {
    document.querySelectorAll('.nav-link, .mobile-nav-item').forEach(link => {
      const route = link.getAttribute('data-route');
      if (route === activeRoute) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  renderCurrentView() {
    this.handleRoute();
  }

  // ==========================================
  // VIEW 1: EXPLORE & FEED (ULTRA-CLEAN HERO)
  // ==========================================
  loadExploreView() {
    this.currentView = 'explore';
    const container = document.getElementById('appContent');
    const isKm = getLanguage() === 'km';

    // Fetch latest cloud campaigns in background to keep Explore feed fresh
    if (!this._cloudFetched) {
      this._cloudFetched = true;
      CampaignService.fetchAllCloudCampaigns().then(cloudList => {
        if (cloudList && cloudList.length > 0 && this.currentView === 'explore') {
          this.loadExploreView();
        }
      });
    }

    const allCampaigns = CampaignService.getCampaigns();

    // Filter by search & category
    const filtered = allCampaigns.filter(c => {
      const matchCat = this.currentCategory === 'all' || c.category === this.currentCategory;
      const title = (isKm ? c.titleKm : c.titleEn) || c.titleKm || c.titleEn || '';
      const desc = (isKm ? c.descriptionKm : c.descriptionEn) || '';
      const matchSearch = !this.searchQuery || 
        title.toLowerCase().includes(this.searchQuery.toLowerCase()) || 
        desc.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        c.creator.toLowerCase().includes(this.searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });

    // Apply sorting
    if (this.sortOrder === 'newest') {
      filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else {
      filtered.sort((a, b) => (b.supporters || 0) - (a.supporters || 0));
    }

    container.innerHTML = `
      <!-- Super Clean Minimal Search Header -->
      <section class="explore-hero-minimal">
        <h1 class="explore-hero-title">
          ${isKm ? 'ស្វែងរកស៊ុមរូបថត' : 'Explore Frames'}
        </h1>

        <div class="hero-search-box">
          <span class="hero-search-icon">${Icons.search}</span>
          <input 
            type="text" 
            class="hero-search-input" 
            placeholder="${t('searchPlaceholder')}"
            value="${SecurityUtils.escapeHtml(this.searchQuery || '')}"
            id="campaignSearchInput"
          />
          ${this.searchQuery ? `
            <button type="button" class="hero-search-clear" id="btnSearchClear" title="${t('clearSearch')}">
              ${Icons.clear}
            </button>
          ` : ''}
        </div>
      </section>

      <!-- Category Filter Pills -->
      <div class="categories-bar">
        <button class="category-chip ${this.currentCategory === 'all' ? 'active' : ''}" data-cat="all">
          ${t('allCategories')}
        </button>
        <button class="category-chip ${this.currentCategory === 'education' ? 'active' : ''}" data-cat="education">
          ${t('catEducation')}
        </button>
        <button class="category-chip ${this.currentCategory === 'culture' ? 'active' : ''}" data-cat="culture">
          ${t('catCulture')}
        </button>
        <button class="category-chip ${this.currentCategory === 'charity' ? 'active' : ''}" data-cat="charity">
          ${t('catCharity')}
        </button>
        <button class="category-chip ${this.currentCategory === 'tech' ? 'active' : ''}" data-cat="tech">
          ${t('catTech')}
        </button>
        <button class="category-chip ${this.currentCategory === 'celebration' ? 'active' : ''}" data-cat="celebration">
          ${t('catCelebration')}
        </button>
      </div>

      <!-- Section Title & Sort Toggle -->
      <div class="explore-section-header">
        <div class="explore-section-title-wrap">
          <h2 class="explore-section-title">
            ${this.searchQuery ? (isKm ? 'លទ្ធផលស្វែងរក' : 'Search Results') : (this.sortOrder === 'newest' ? t('sortNewest') : t('sortPopular'))}
          </h2>
          <span class="explore-section-count">
            ${filtered.length} ${t('resultsFound')}
          </span>
        </div>

        <div class="explore-sort-toggle">
          <button class="sort-btn ${this.sortOrder === 'popular' ? 'active' : ''}" id="btnSortPopular">
            ${t('sortPopular')}
          </button>
          <button class="sort-btn ${this.sortOrder === 'newest' ? 'active' : ''}" id="btnSortNewest">
            ${t('sortNewest')}
          </button>
        </div>
      </div>

      <!-- Campaign Grid -->
      <div class="campaign-grid" id="campaignListGrid">
        ${filtered.length > 0 ? filtered.map(c => this.renderCampaignCard(c)).join('') : `
          <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
            <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">🔍</div>
            <h3 style="font-size: 1.1rem;">${t('searchNoResults')}</h3>
          </div>
        `}
      </div>
    `;

    // Bind Search Input
    const searchInput = document.getElementById('campaignSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.loadExploreView();
      });
    }

    // Bind Clear Button
    const btnClear = document.getElementById('btnSearchClear');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        this.searchQuery = '';
        this.loadExploreView();
      });
    }

    // Bind Sort Buttons
    const btnSortPop = document.getElementById('btnSortPopular');
    if (btnSortPop) {
      btnSortPop.addEventListener('click', () => {
        this.sortOrder = 'popular';
        this.loadExploreView();
      });
    }

    const btnSortNew = document.getElementById('btnSortNewest');
    if (btnSortNew) {
      btnSortNew.addEventListener('click', () => {
        this.sortOrder = 'newest';
        this.loadExploreView();
      });
    }

    // Bind Category Chips
    container.querySelectorAll('.category-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.currentCategory = chip.getAttribute('data-cat');
        this.loadExploreView();
      });
    });
  }

  setQuickSearch(tag) {
    this.searchQuery = tag;
    this.loadExploreView();
  }

  renderCampaignCard(campaign) {
    const isKm = getLanguage() === 'km';
    const rawTitle = (isKm ? campaign.titleKm : campaign.titleEn) || campaign.titleKm || campaign.titleEn || 'Untitled Campaign';
    const rawDesc = (isKm ? campaign.descriptionKm : campaign.descriptionEn) || '';
    const title = SecurityUtils.escapeHtml(rawTitle);
    const desc = SecurityUtils.escapeHtml(rawDesc);
    const creator = SecurityUtils.escapeHtml(campaign.creator || 'Anonymous');
    const slug = SecurityUtils.escapeHtml(campaign.slug || campaign.id);
    const frameUrl = SecurityUtils.sanitizeUrl(campaign.frameUrl);
    const supporterCount = (campaign.supporters || 0).toLocaleString();

    return `
      <div class="campaign-card">
        <div class="card-preview-wrapper" onclick="window.location.hash='#campaign/${slug}'">
          <img src="${SAMPLE_AVATARS[0]}" class="card-sample-backdrop" alt="Preview backdrop" loading="lazy" />
          <img src="${frameUrl}" alt="${title}" class="card-preview-frame" loading="lazy" />
          <div class="card-badge-category">${t('cat' + (campaign.category.charAt(0).toUpperCase() + campaign.category.slice(1)))}</div>
          <div class="card-badge-supporters">${Icons.users} <span>${supporterCount}</span></div>
        </div>
        <div class="card-content">
          <h3 class="card-title" onclick="window.location.hash='#campaign/${slug}'">${title}</h3>
          <div class="card-creator">${Icons.avatar} <span>${t('by')} ${creator}</span></div>
          ${desc ? `<p class="card-description">${desc}</p>` : ''}
          <div class="card-footer">
            <button class="btn btn-primary btn-use-frame" onclick="window.location.hash='#campaign/${slug}'">
              ${Icons.camera} <span>${t('useFrame')}</span>
            </button>
            <button class="btn btn-secondary btn-card-share" title="${t('shareCampaign')}" onclick="event.stopPropagation(); app.openShareModalById(decodeURIComponent('${encodeURIComponent(campaign.slug || campaign.id || '')}'))">
              ${Icons.share}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // VIEW 2: CAMPAIGN STUDIO (CLEAN INTERACTION)
  // ==========================================
  loadCampaignView(identifier, directCampaign = null) {
    this.currentView = 'studio';
    const campaign = directCampaign || CampaignService.getCampaignBySlugOrId(identifier);
    const container = document.getElementById('appContent');

    if (!campaign) {
      const isKm = getLanguage() === 'km';
      container.innerHTML = `
        <div style="text-align: center; padding: 5rem 1rem;">
          <div style="font-size: 2.8rem; margin-bottom: 1rem;">☁️</div>
          <h2 style="color: var(--text-primary); font-weight: 800;">${isKm ? 'កំពុងទាញយកយុទ្ធនាការពី Cloud...' : 'Loading campaign from Cloud...'}</h2>
          <p style="color: var(--text-secondary); margin: 0.5rem 0 1.5rem 0;">${isKm ? 'សូមរង់ចាំមួយភ្លែត ប្រព័ន្ធកំពុងទាញទិន្នន័យពី Cloud Firestore...' : 'Fetching live campaign data from Cloud Firestore...'}</p>
        </div>
      `;
      CampaignService.fetchCloudCampaign(identifier).then(cloudCampaign => {
        if (cloudCampaign) {
          this.loadCampaignView(cloudCampaign.slug || identifier, cloudCampaign);
        } else {
          container.innerHTML = `
            <div style="text-align: center; padding: 4rem 1.2rem; max-width: 540px; margin: 0 auto;">
              <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
              <h2 style="color: var(--text-primary); font-weight: 800; font-size: 1.4rem;">${isKm ? 'រកមិនឃើញយុទ្ធនាការនេះទេ' : 'Campaign Not Found'}</h2>
              <p style="color: var(--text-secondary); margin: 1rem 0 1.5rem 0; line-height: 1.6; font-size: 0.95rem;">
                ${isKm 
                  ? 'យុទ្ធនាការនេះមិនទាន់បាន Upload ឡើង Cloud នៅឡើយទេ ឬត្រូវបានលុប។<br><br>💡 <strong>ប្រសិនបើបងបានបង្កើតវានៅលើកុំព្យូទ័រ៖</strong> សូមបើក Tab វេបសាយនៅលើកុំព្យូទ័រនោះ រួចចុច <strong>Refresh (Reload)</strong> ម្តង ដើម្បីឱ្យប្រព័ន្ធ Sync ឡើង Cloud ដោយស្វ័យប្រវត្តិ។' 
                  : 'The campaign you are looking for has not been synced to Cloud Firestore yet or was removed.<br><br>💡 If you created this on your computer, please refresh the page on your computer to sync it to the Cloud.'}
              </p>
              <button class="btn btn-primary" onclick="window.location.hash='#explore'">${t('backToHome')}</button>
            </div>
          `;
        }
      });
      return;
    }

    // Found campaign locally! Automatically ensure it's synced to Cloud Firestore
    CampaignService.syncSingleCampaignToCloud(campaign);

    this.activeCampaign = campaign;
    const isKm = getLanguage() === 'km';
    const rawTitle = (isKm ? campaign.titleKm : campaign.titleEn) || campaign.titleKm || campaign.titleEn || '';
    const rawDesc = (isKm ? campaign.descriptionKm : campaign.descriptionEn) || '';
    const title = SecurityUtils.escapeHtml(rawTitle);
    const desc = SecurityUtils.escapeHtml(rawDesc);
    const creator = SecurityUtils.escapeHtml(campaign.creator || 'Anonymous');
    const createdAt = SecurityUtils.escapeHtml(campaign.createdAt || '');
    const caption = (isKm ? campaign.captionKm : campaign.captionEn) || '';

    container.innerHTML = `
      <!-- Sleek Studio Mobile/Desktop Top Bar -->
      <div class="studio-top-bar">
        <button class="btn-icon" onclick="window.location.hash='#explore'" title="${t('backToHome')}">
          ${Icons.chevronLeft}
        </button>
        <div class="studio-top-title">${title}</div>
        <button class="btn-icon" id="btnTopNativeShare" title="${t('shareCampaign')}">
          ${Icons.share2}
        </button>
      </div>

      <div class="studio-header-bar">
        <button class="btn btn-secondary" onclick="window.location.hash='#explore'">
          ${Icons.back} <span>${t('backToHome')}</span>
        </button>
        <div class="studio-header-title-wrap">
          <h1 class="studio-header-title">${title}</h1>
          <div class="studio-header-meta">
            <span>${Icons.avatar} <strong>${creator}</strong></span>
            <span>${Icons.users} <strong id="supporterCount">${(campaign.supporters || 0).toLocaleString()}</strong> ${t('supporters')}</span>
            <span>📅 ${createdAt}</span>
          </div>
        </div>
      </div>

      <div class="studio-layout">
        <!-- Canvas Left Column (Complete Interactive Workspace) -->
        <div class="canvas-wrapper-card">
          <div class="canvas-container" id="canvasContainer">
            <canvas id="studioCanvas" width="1080" height="1080"></canvas>
          </div>

          <div class="studio-hint-text">
            💡 <span>${t('dragToReposition')}</span>
          </div>

          <!-- Quick Action Buttons: Rotate & Flip -->
          <div class="controls-row studio-toolbar">
            <button class="btn-icon" id="btnRotate90" title="${t('rotate')} 90°">${Icons.rotateRight}</button>
            <button class="btn-icon" id="btnFlipH" title="${t('flipH')}">${Icons.flipHorizontal}</button>
            <button class="btn-icon" id="btnFlipV" title="${t('flipV')}">${Icons.flipVertical}</button>
            <button class="btn-icon" id="btnResetPos" title="${t('reset')}">${Icons.reset}</button>
          </div>

          <!-- Step 1: Upload Photo Dropzone (Directly under Canvas for instant access) -->
          <div class="studio-upload-section">
            <input type="file" id="photoFileInput" accept="image/*" style="display: none;" />
            <div class="photo-dropzone" id="photoDropzone">
              <div class="dropzone-icon">${Icons.camera}</div>
              <div class="dropzone-text">
                <span class="dropzone-main-text">${t('choosePhoto')}</span>
                <span class="dropzone-sub-text">${t('photoTip')}</span>
              </div>
            </div>

            <!-- Quick Sample Avatars Selector -->
            <div class="sample-avatars-row">
              <span class="sample-avatars-label">${t('useSamplePhoto')}:</span>
              <div class="sample-avatar-pills">
                ${SAMPLE_AVATARS.map((avatar, idx) => `
                  <button class="sample-avatar-btn" data-avatar="${idx}" title="Sample ${idx + 1}">
                    <img src="${avatar}" alt="Sample ${idx + 1}" />
                  </button>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Step 2: Zoom Slider with Stepper Buttons -->
          <div class="slider-group zoom-slider-group">
            <div class="slider-header">
              <span style="font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 0.35rem;">
                ${Icons.search} <span>${t('zoom')}</span>
              </span>
              <span id="zoomVal" class="slider-val-badge">100%</span>
            </div>
            <div class="zoom-stepper-wrap">
              <button type="button" class="zoom-stepper-btn" id="btnZoomMinus" title="Zoom Out">${Icons.minus}</button>
              <input type="range" class="range-slider" id="zoomSlider" min="20" max="350" value="100" />
              <button type="button" class="zoom-stepper-btn" id="btnZoomPlus" title="Zoom In">${Icons.plusMini}</button>
            </div>
          </div>

          <!-- Step 3: Hero High-Res Download Button -->
          <button class="btn-download-hero" id="btnDownloadHD">
            ${Icons.download} <span>${t('downloadFrame')}</span>
            <span class="hd-badge">1080p</span>
          </button>
        </div>

        <!-- Studio Details & Share Right Column -->
        <div class="studio-controls-card">
          ${desc ? `
            <div class="campaign-about-section">
              <div class="tool-section-title">ℹ️ <span>${isKm ? 'អំពីយុទ្ធនាការ' : 'About Campaign'}</span></div>
              <p class="campaign-about-desc">${desc}</p>
            </div>
          ` : ''}

          <!-- Fine-tune Filters Collapsible Accordion -->
          <div class="collapsible-section" id="filtersSection">
            <button type="button" class="collapsible-header" id="btnToggleFilters">
              <span class="tool-section-title">${Icons.tune} <span>${t('adjustments')}</span></span>
              <span class="collapsible-arrow">▼</span>
            </button>
            <div class="collapsible-body" id="filtersBody">
              <div class="sliders-grid">
                <!-- Brightness -->
                <div class="slider-group">
                  <div class="slider-header">
                    <span>${t('brightness')}</span>
                    <span id="brightnessVal" class="slider-val-badge">100%</span>
                  </div>
                  <input type="range" class="range-slider" id="brightnessSlider" min="50" max="160" value="100" />
                </div>

                <!-- Contrast -->
                <div class="slider-group">
                  <div class="slider-header">
                    <span>${t('contrast')}</span>
                    <span id="contrastVal" class="slider-val-badge">100%</span>
                  </div>
                  <input type="range" class="range-slider" id="contrastSlider" min="50" max="160" value="100" />
                </div>

                <!-- Saturation -->
                <div class="slider-group">
                  <div class="slider-header">
                    <span>${t('saturation')}</span>
                    <span id="satVal" class="slider-val-badge">100%</span>
                  </div>
                  <input type="range" class="range-slider" id="satSlider" min="0" max="200" value="100" />
                </div>
              </div>
            </div>
          </div>

          <!-- Share Campaign Box -->
          <div>
            <div class="tool-section-title">${Icons.share} <span>${t('shareCampaign')}</span></div>
            
            <div class="campaign-share-box">
              <!-- 1-Tap Native Share Button -->
              <button class="btn btn-primary" id="btnNativeShare" style="width: 100%; padding: 0.85rem; font-size: 0.95rem; font-weight: 700;">
                ${Icons.share2} <span>${t('shareNative')}</span>
              </button>

              <div class="share-box-header" style="margin-top: 0.35rem;">
                <span>🔗 ${isKm ? 'តំណភ្ជាប់ចែករំលែក (Share Link)' : 'Campaign Share Link'}:</span>
              </div>
              <div class="share-link-input-group">
                <input type="text" class="share-link-input" id="studioShareLinkInput" value="${this.getShareableLink(campaign)}" readonly />
                <button class="btn btn-primary" id="btnCopyStudioLink">
                  ${Icons.copy} <span>${t('copyLink')}</span>
                </button>
              </div>

              <!-- Instant Mobile QR Code (Desktop view only) -->
              <div class="share-qr-container">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(this.getShareableLink(campaign))}" class="share-qr-img" alt="QR Code" />
                <div class="share-qr-desc">
                  <strong>${isKm ? 'ស្កេន QR Code តាមទូរស័ព្ទដៃ' : 'Scan with Mobile Camera'}</strong>
                  <span>${isKm ? 'អ្នកគាំទ្រអាចបើកកាមេរ៉ាទូរស័ព្ទស្កេន ដើម្បីប្រើស៊ុមនេះភ្លាមៗ' : 'Point camera to open and use this frame directly on mobile'}</span>
                </div>
              </div>

              <!-- Cloud Sync Indicator -->
              <div class="cloud-sync-status" id="cloudSyncStatus">
                ☁️ ${isKm ? 'បានតភ្ជាប់ Cloud Firestore • អាចបើកលើទូរស័ព្ទបាន' : 'Synced to Cloud Firestore • Accessible on Mobile'}
              </div>
            </div>

            ${caption ? `
              <div class="caption-box" style="margin-top: 1rem;">
                <div>${caption}</div>
                <div class="caption-actions">
                  <button class="btn btn-secondary" id="btnCopyCaption" style="padding: 0.35rem 0.8rem; font-size: 0.82rem;">
                    ${Icons.copy} <span>${t('copyCaption')}</span>
                  </button>
                </div>
              </div>
            ` : ''}

            <!-- Social Share Links -->
            <div class="social-share-row" style="margin-top: 1rem;">
              <button class="btn btn-secondary btn-social" id="btnShareTelegram">
                ${Icons.telegram} <span>Telegram</span>
              </button>
              <button class="btn btn-secondary btn-social" id="btnShareFacebook">
                ${Icons.facebook} <span>Facebook</span>
              </button>
              <button class="btn btn-secondary btn-social" id="btnShareWhatsapp">
                <span>WhatsApp</span>
              </button>
            </div>
          </div>

          <!-- Bottom Action: Extra Download Button on Mobile -->
          <button class="btn btn-success btn-download-bottom" id="btnDownloadHDBottom">
            ${Icons.download} <span>${t('downloadFrame')}</span>
          </button>
        </div>
      </div>
    `;

    // Initialize Canvas Studio
    const canvas = document.getElementById('studioCanvas');
    this.activeStudio = new CanvasStudio(canvas, {
      resolution: 1080,
      onStateChange: (state) => {
        const zoomVal = document.getElementById('zoomVal');
        if (zoomVal) zoomVal.textContent = `${Math.round(state.scale * 100)}%`;
        const zoomSlider = document.getElementById('zoomSlider');
        if (zoomSlider) zoomSlider.value = Math.round(state.scale * 100);
      }
    });

    // Load Frame Image
    this.activeStudio.setFrame(campaign.frameUrl);

    // Auto-load First Sample Avatar
    this.activeStudio.setUserPhoto(SAMPLE_AVATARS[0]);

    // Bind Upload Dropzone
    const dropzone = document.getElementById('photoDropzone');
    const fileInput = document.getElementById('photoFileInput');

    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.activeStudio.setUserPhoto(e.target.files[0]);
        this.showToast(t('choosePhoto') + ' OK!');
      }
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = 'var(--accent-primary)';
      dropzone.style.background = 'var(--accent-soft)';
    });
    dropzone.addEventListener('dragleave', () => {
      dropzone.style.borderColor = '#cbd5e1';
      dropzone.style.background = 'var(--bg-secondary)';
    });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#cbd5e1';
      dropzone.style.background = 'var(--bg-secondary)';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        this.activeStudio.setUserPhoto(e.dataTransfer.files[0]);
        this.showToast(t('choosePhoto') + ' OK!');
      }
    });

    // Bind Sample Photo Selectors
    container.querySelectorAll('.sample-avatar-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.getAttribute('data-avatar'));
        if (SAMPLE_AVATARS[idx]) {
          this.activeStudio.setUserPhoto(SAMPLE_AVATARS[idx]);
          this.showToast(t('choosePhoto') + ' OK!');
        }
      });
    });

    // Quick Tool Buttons
    document.getElementById('btnRotate90').addEventListener('click', () => this.activeStudio.rotate90());
    document.getElementById('btnFlipH').addEventListener('click', () => this.activeStudio.toggleFlipH());
    document.getElementById('btnFlipV').addEventListener('click', () => this.activeStudio.toggleFlipV());
    document.getElementById('btnResetPos').addEventListener('click', () => this.activeStudio.resetPosition());

    // Sliders & Zoom Steppers
    const zoomSlider = document.getElementById('zoomSlider');
    if (zoomSlider) {
      zoomSlider.addEventListener('input', (e) => {
        this.activeStudio.setScale(e.target.value / 100);
      });
    }

    const btnZoomMinus = document.getElementById('btnZoomMinus');
    if (btnZoomMinus) {
      btnZoomMinus.addEventListener('click', () => {
        const next = Math.max(0.2, this.activeStudio.state.scale - 0.1);
        this.activeStudio.setScale(next);
      });
    }

    const btnZoomPlus = document.getElementById('btnZoomPlus');
    if (btnZoomPlus) {
      btnZoomPlus.addEventListener('click', () => {
        const next = Math.min(3.5, this.activeStudio.state.scale + 0.1);
        this.activeStudio.setScale(next);
      });
    }

    // Toggle Fine-tune Filters Accordion
    const btnToggleFilters = document.getElementById('btnToggleFilters');
    const filtersSec = document.getElementById('filtersSection');
    if (btnToggleFilters && filtersSec) {
      btnToggleFilters.addEventListener('click', () => {
        filtersSec.classList.toggle('open');
      });
    }

    const brightSlider = document.getElementById('brightnessSlider');
    if (brightSlider) {
      brightSlider.addEventListener('input', (e) => {
        this.activeStudio.setFilter('brightness', e.target.value);
        document.getElementById('brightnessVal').textContent = `${e.target.value}%`;
      });
    }

    const contrastSlider = document.getElementById('contrastSlider');
    contrastSlider.addEventListener('input', (e) => {
      this.activeStudio.setFilter('contrast', e.target.value);
      document.getElementById('contrastVal').textContent = `${e.target.value}%`;
    });

    const satSlider = document.getElementById('satSlider');
    satSlider.addEventListener('input', (e) => {
      this.activeStudio.setFilter('saturation', e.target.value);
      document.getElementById('satVal').textContent = `${e.target.value}%`;
    });

    // Download HD Handlers (Top Canvas Card + Bottom Controls Card)
    const handleDownloadHD = async () => {
      const blob = await this.activeStudio.exportHighRes();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tra-frames-${campaign.slug || 'campaign'}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      const newCount = CampaignService.incrementSupporter(campaign.id);
      const counterEl = document.getElementById('supporterCount');
      if (counterEl) counterEl.textContent = newCount.toLocaleString();

      triggerConfetti();
      this.showToast(t('downloadSuccess'), 'success');
    };

    const btnDownloadTop = document.getElementById('btnDownloadHD');
    if (btnDownloadTop) btnDownloadTop.addEventListener('click', handleDownloadHD);
    const btnDownloadBottom = document.getElementById('btnDownloadHDBottom');
    if (btnDownloadBottom) btnDownloadBottom.addEventListener('click', handleDownloadHD);

    // Copy Caption & Link
    const shareableUrl = this.getShareableLink(campaign);
    const currentUrl = encodeURIComponent(shareableUrl);
    const shareTitle = encodeURIComponent(title);

    const btnCopyCaption = document.getElementById('btnCopyCaption');
    if (btnCopyCaption) {
      btnCopyCaption.addEventListener('click', async () => {
        await this.copyToClipboard(caption);
        this.showToast(t('captionCopied'), 'success');
        const span = btnCopyCaption.querySelector('span');
        if (span) {
          const orig = span.textContent;
          span.textContent = isKm ? 'បានចម្លង!' : 'Copied!';
          setTimeout(() => { span.textContent = orig; }, 2000);
        }
      });
    }

    // Studio Share Link Input (Auto-select on click)
    const studioShareInput = document.getElementById('studioShareLinkInput');
    if (studioShareInput) {
      studioShareInput.addEventListener('click', () => {
        studioShareInput.select();
      });
    }

    // Studio Share Link Button (#btnCopyStudioLink)
    const btnCopyStudioLink = document.getElementById('btnCopyStudioLink');
    if (btnCopyStudioLink) {
      btnCopyStudioLink.addEventListener('click', async () => {
        await this.copyToClipboard(shareableUrl);
        this.showToast(t('linkCopied'), 'success');
        const span = btnCopyStudioLink.querySelector('span');
        if (span) {
          const orig = span.textContent;
          span.textContent = isKm ? 'បានចម្លង!' : 'Copied!';
          setTimeout(() => { span.textContent = orig; }, 2000);
        }
      });
    }

    // Fallback if btnCopyLink exists
    const btnCopyLink = document.getElementById('btnCopyLink');
    if (btnCopyLink) {
      btnCopyLink.addEventListener('click', async () => {
        await this.copyToClipboard(shareableUrl);
        this.showToast(t('linkCopied'), 'success');
      });
    }

    // 1-Tap Native Web Share API (Mobile Telegram, Messenger, etc.)
    const handleNativeShare = async () => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: rawTitle,
            text: caption || rawTitle,
            url: shareableUrl
          });
        } catch (err) {
          if (err.name !== 'AbortError') {
            await this.copyToClipboard(shareableUrl);
            this.showToast(t('linkCopied'), 'success');
          }
        }
      } else {
        await this.copyToClipboard(shareableUrl);
        this.showToast(t('linkCopied'), 'success');
      }
    };

    const btnNativeShare = document.getElementById('btnNativeShare');
    if (btnNativeShare) btnNativeShare.addEventListener('click', handleNativeShare);
    const btnTopShare = document.getElementById('btnTopNativeShare');
    if (btnTopShare) btnTopShare.addEventListener('click', handleNativeShare);

    // Social Sharing Links (with safe null-checks)
    const btnShareTelegram = document.getElementById('btnShareTelegram');
    if (btnShareTelegram) {
      btnShareTelegram.addEventListener('click', () => {
        window.open(`https://t.me/share/url?url=${currentUrl}&text=${shareTitle}`, '_blank', 'noopener,noreferrer');
      });
    }
    const btnShareFacebook = document.getElementById('btnShareFacebook');
    if (btnShareFacebook) {
      btnShareFacebook.addEventListener('click', () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${currentUrl}`, '_blank', 'noopener,noreferrer');
      });
    }
    const btnShareWhatsapp = document.getElementById('btnShareWhatsapp');
    if (btnShareWhatsapp) {
      btnShareWhatsapp.addEventListener('click', () => {
        window.open(`https://api.whatsapp.com/send?text=${shareTitle}%20${currentUrl}`, '_blank', 'noopener,noreferrer');
      });
    }
    const btnShareX = document.getElementById('btnShareX');
    if (btnShareX) {
      btnShareX.addEventListener('click', () => {
        window.open(`https://twitter.com/intent/tweet?url=${currentUrl}&text=${shareTitle}`, '_blank', 'noopener,noreferrer');
      });
    }
  }

  // ==========================================
  // VIEW 3: CAMPAIGN CREATOR
  // ==========================================
  loadCreateView(presetFrameId) {
    this.currentView = 'create';
    const container = document.getElementById('appContent');

    // Route Guard: Require Login to Create or Upload Campaigns
    if (typeof AuthService !== 'undefined' && !AuthService.isAuthenticated()) {
      container.innerHTML = `
        <div class="auth-gate-card">
          <div class="auth-gate-icon">${Icons.lock}</div>
          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-primary);">${t('loginRequiredTitle')}</h2>
          <p style="color: var(--text-secondary); line-height: 1.6; font-size: 0.95rem;">${t('loginRequiredDesc')}</p>
          
          <div style="display: flex; flex-direction: column; gap: 0.85rem; max-width: 360px; margin: 0 auto; width: 100%;">
            <button class="btn-google" id="btnGateGoogle">${Icons.google} <span>${t('signInWithGoogle')}</span></button>
            <button class="btn btn-outline" id="btnGateEmail">${Icons.mail} <span>${t('signInWithEmail')}</span></button>
          </div>
          
          <div style="background: var(--accent-soft); border-radius: var(--radius-md); padding: 0.65rem 1rem; font-size: 0.84rem; color: var(--accent-primary); font-weight: 600; margin-top: 0.5rem;">
            💡 ${t('supporterNoLoginTip')}
          </div>
        </div>
      `;

      document.getElementById('btnGateGoogle').addEventListener('click', async () => {
        try {
          await AuthService.loginWithGoogle();
          this.showToast(t('loginSuccess'), 'success');
          this.loadCreateView(presetFrameId);
        } catch (err) {
          if (err.code === 'auth/unauthorized-domain') {
            this.showToast("Domain មិនទាន់អនុញ្ញាតក្នុង Firebase Console ទេ សូម Add frame.tra4me.com", 'error');
          } else if (err.code !== 'auth/popup-closed-by-user') {
            this.showToast(t('loginFailed'), 'error');
          }
        }
      });

      document.getElementById('btnGateEmail').addEventListener('click', () => {
        this.openAuthModal(() => this.loadCreateView(presetFrameId));
      });
      return;
    }

    // Route Guard 2: Require Verified Email before creating a campaign
    if (typeof AuthService !== 'undefined' && !AuthService.isEmailVerified()) {
      this.loadEmailVerificationGate(presetFrameId);
      return;
    }

    let initialFrame = PRESET_FRAMES.graduation;
    if (presetFrameId && PRESET_FRAMES[presetFrameId]) {
      initialFrame = PRESET_FRAMES[presetFrameId];
    } else if (presetFrameId === 'designer' && window._designerExportedFrame) {
      initialFrame = window._designerExportedFrame;
    }

    const defaultCreator = (AuthService && AuthService.currentUser) 
      ? SecurityUtils.escapeHtml(AuthService.currentUser.displayName || AuthService.currentUser.email.split('@')[0])
      : '';

    container.innerHTML = `
      <div style="margin-bottom: 1.5rem; text-align: center;">
        <h1 style="font-size: 1.85rem; font-weight: 800; margin-bottom: 0.35rem; color: var(--text-primary);">${t('newCampaignTitle')}</h1>
        <p style="color: var(--text-secondary); font-size: 0.95rem;">${t('tagline')}</p>
      </div>

      <div class="create-split-layout">
        <!-- Sticky Live Preview Column (Left) -->
        <div class="create-preview-sticky">
          <div class="live-preview-box">
            <div class="live-preview-header">
              ${Icons.eye} <span>${t('livePreview')}</span>
            </div>
            <div class="card-preview-wrapper">
              <img src="${SAMPLE_AVATARS[0]}" class="card-sample-backdrop" alt="Backdrop" />
              <img id="liveCardFrameImg" src="${initialFrame}" class="card-preview-frame" alt="Frame" />
              <div id="liveCardCategoryBadge" class="card-badge-category">${t('catEducation')}</div>
              <div class="card-badge-supporters">${Icons.users} <span>1</span></div>
            </div>
            <div class="card-content">
              <h3 id="liveCardTitle" class="card-title">${isKm ? 'ចំណងជើងយុទ្ធនាការ' : 'Campaign Title'}</h3>
              <div id="liveCardCreator" class="card-creator">${Icons.avatar} <span>${t('by')} ${defaultCreator || (isKm ? 'ឈ្មោះអ្នកបង្កើត' : 'Creator')}</span></div>
            </div>
          </div>

          <!-- Raw Cutout Verification Box -->
          <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.85rem; display: flex; align-items: center; gap: 0.85rem;">
            <div class="checkerboard-preview" style="width: 50px; height: 50px; border-radius: var(--radius-xs); flex-shrink: 0; border: 1px solid var(--border-color);">
              <img id="rawFrameImg" src="${initialFrame}" style="width:100%;height:100%;object-fit:contain;" />
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted); line-height: 1.4;">
              ${t('frameUploadHint')}
            </div>
          </div>
        </div>

        <!-- Form Column (Right) -->
        <form id="createCampaignForm" class="studio-controls-card" style="gap: 1.25rem;">
          <div class="form-group">
            <label class="form-label">${t('fieldTitle')} *</label>
            <input type="text" id="campaignTitle" class="form-input" placeholder="${t('fieldTitlePlaceholder')}" required />
          </div>

          <div class="form-row-2col">
            <div class="form-group">
              <label class="form-label">${t('fieldSlug')}</label>
              <input type="text" id="campaignSlug" class="form-input" placeholder="${t('fieldSlugPlaceholder')}" />
            </div>

            <div class="form-group">
              <label class="form-label">${t('fieldCategory')}</label>
              <select id="campaignCategory" class="form-select">
                <option value="education">🎓 ${t('catEducation')}</option>
                <option value="culture">🇰🇭 ${t('catCulture')}</option>
                <option value="charity">❤️ ${t('catCharity')}</option>
                <option value="tech">⚡ ${t('catTech')}</option>
                <option value="celebration">🎉 ${t('catCelebration')}</option>
                <option value="sports">🏆 ${t('catSports')}</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">${t('creator')} / Organization *</label>
            <input type="text" id="campaignCreator" class="form-input" value="${defaultCreator}" placeholder="e.g., Youth Union, Tech Team" required />
          </div>

          <div class="form-group">
            <label class="form-label">${t('fieldDesc')}</label>
            <textarea id="campaignDesc" class="form-textarea" rows="3" placeholder="${t('fieldDescPlaceholder')}"></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">${t('fieldCaption')}</label>
            <textarea id="campaignCaption" class="form-textarea" rows="2" placeholder="${t('fieldCaptionPlaceholder')}"></textarea>
          </div>

          <!-- Frame Selection / Upload -->
          <div class="form-group">
            <label class="form-label">${t('fieldFrameUpload')} *</label>
            <div style="display: flex; gap: 0.85rem; align-items: center; flex-wrap: wrap;">
              <input type="file" id="frameFileInput" accept="image/png,image/svg+xml,image/webp" style="display: none;" />
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('frameFileInput').click()">
                ${Icons.upload} <span>Upload PNG</span>
              </button>
              <button type="button" class="btn btn-outline" onclick="window.location.hash='#designer'">
                ${Icons.paint} <span>${t('designerTitle')}</span>
              </button>
            </div>
          </div>

          <!-- Preset Templates Shortcut -->
          <div>
            <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 0.45rem;">
              ${t('orChooseTemplate')}:
            </div>
            <div style="display: flex; gap: 0.65rem; overflow-x: auto; padding-bottom: 0.5rem;">
              ${Object.keys(PRESET_FRAMES).map(key => `
                <div class="sample-avatar-btn" style="width: 48px; height: 48px; flex-shrink: 0;" data-preset="${key}">
                  <img src="${PRESET_FRAMES[key]}" />
                </div>
              `).join('')}
            </div>
          </div>

          <button type="submit" class="btn-download-hero" style="margin-top: 0.5rem;">
            ${Icons.sparkles} <span>${t('publishCampaign')}</span>
          </button>
        </form>
      </div>
    `;

    let selectedFrameDataUrl = initialFrame;

    // Live Preview Binding Elements
    const titleInput = document.getElementById('campaignTitle');
    const slugInput = document.getElementById('campaignSlug');
    const catInput = document.getElementById('campaignCategory');
    const creatorInput = document.getElementById('campaignCreator');
    const liveCardTitle = document.getElementById('liveCardTitle');
    const liveCardCreator = document.getElementById('liveCardCreator');
    const liveCardCat = document.getElementById('liveCardCategoryBadge');
    const liveCardFrame = document.getElementById('liveCardFrameImg');
    const rawFrame = document.getElementById('rawFrameImg');

    let slugManual = false;
    if (slugInput) {
      slugInput.addEventListener('input', () => { slugManual = true; });
    }

    if (titleInput) {
      titleInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (liveCardTitle) liveCardTitle.textContent = val || (isKm ? 'ចំណងជើងយុទ្ធនាការ' : 'Campaign Title');
        if (!slugManual && slugInput) {
          const auto = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          if (auto) slugInput.value = auto;
        }
      });
    }

    if (creatorInput) {
      creatorInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        const safeVal = SecurityUtils.cleanText(val, 50);
        if (liveCardCreator) {
          liveCardCreator.innerHTML = `${Icons.avatar} <span>${t('by')} ${safeVal || (isKm ? 'ឈ្មោះអ្នកបង្កើត' : 'Creator')}</span>`;
        }
      });
    }

    if (catInput) {
      catInput.addEventListener('change', (e) => {
        const cat = e.target.value;
        if (liveCardCat) liveCardCat.textContent = t('cat' + (cat.charAt(0).toUpperCase() + cat.slice(1)));
      });
    }

    const updateFramePreviews = (url) => {
      selectedFrameDataUrl = url;
      if (liveCardFrame) liveCardFrame.src = url;
      if (rawFrame) rawFrame.src = url;
    };

    // Handle File Upload
    const frameFileInput = document.getElementById('frameFileInput');
    frameFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const validation = SecurityUtils.validateImageFile(file);
        if (!validation.valid) {
          this.showToast(validation.error, 'error');
          frameFileInput.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onload = async (event) => {
          this.showToast(isKm ? 'កំពុងដំណើរការ Optimize រូបភាព...' : 'Optimizing frame image...');
          const compressed = await CampaignService.compressFrameDataUrl(event.target.result);
          updateFramePreviews(compressed);
          this.showToast(isKm ? 'បានផ្ទុករូបភាពស៊ុមជោគជ័យ!' : 'Frame uploaded successfully!');
        };
        reader.readAsDataURL(file);
      }
    });

    // Preset Selection
    container.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-preset');
        if (PRESET_FRAMES[key]) {
          updateFramePreviews(PRESET_FRAMES[key]);
          this.showToast(`Selected preset: ${key}`);
        }
      });
    });

    // Form Submit
    document.getElementById('createCampaignForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = e.target.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>⏳ ${isKm ? 'កំពុងរក្សាទុក...' : 'Publishing...'}</span>`;
      }

      const title = document.getElementById('campaignTitle').value.trim();
      const slug = document.getElementById('campaignSlug').value.trim();
      const category = document.getElementById('campaignCategory').value;
      const creator = document.getElementById('campaignCreator').value.trim();
      const desc = document.getElementById('campaignDesc').value.trim();
      const caption = document.getElementById('campaignCaption').value.trim();

      const newCampaign = await CampaignService.saveCampaign({
        titleKm: title,
        titleEn: title,
        slug: slug,
        category: category,
        creator: creator,
        descriptionKm: desc,
        descriptionEn: desc,
        captionKm: caption,
        captionEn: caption,
        frameUrl: selectedFrameDataUrl
      });

      this.showToast(t('publishSuccess'), 'success');
      window.location.hash = `#campaign/${newCampaign.slug}`;
    });
  }

  // ==========================================
  // VIEW: EMAIL VERIFICATION GATE
  // ==========================================
  loadEmailVerificationGate(presetFrameId) {
    const container = document.getElementById('appContent');
    const isKm = getLanguage() === 'km';
    const user = AuthService.currentUser;
    const email = user ? SecurityUtils.escapeHtml(user.email) : '';

    container.innerHTML = `
      <div class="auth-gate-card" style="max-width: 480px; margin: 3rem auto; text-align: center;">
        <div class="auth-gate-icon" style="background: rgba(245, 158, 11, 0.12); color: #f59e0b; font-size: 2.2rem;">
          ${Icons.mail}
        </div>
        <h2 style="font-size: 1.45rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.5rem;">
          ${t('emailVerificationRequired')}
        </h2>
        <p style="color: var(--text-secondary); line-height: 1.6; font-size: 0.92rem; margin-bottom: 1.25rem;">
          ${t('emailVerificationDesc')}<br>
          <span style="display: inline-block; margin-top: 0.45rem; padding: 0.35rem 0.85rem; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-weight: 700; color: var(--accent-primary); word-break: break-all;">
            ${email}
          </span>
        </p>

        <div style="display: flex; flex-direction: column; gap: 0.75rem; width: 100%;">
          <button class="btn btn-primary" id="btnGateOpenOtp" style="padding: 0.85rem; font-size: 1rem;">
            <span>${t('otpEnterCodeBtn')}</span>
          </button>
          <button class="btn btn-outline" id="btnGateSendOtp" style="padding: 0.85rem; font-size: 0.92rem;">
            <span>${t('otpSendNewBtn')}</span>
          </button>
          <button class="btn btn-outline" id="btnCheckVerified" style="padding: 0.85rem; font-size: 0.92rem;">
            <span>🔄 ${t('checkVerificationBtn')}</span>
          </button>
          <button class="btn btn-secondary" id="btnSignOutGate" style="padding: 0.75rem; font-size: 0.88rem;">
            <span>${isKm ? 'ចាកចេញ / ប្រើគណនីផ្សេង' : 'Sign Out / Use Another Account'}</span>
          </button>
        </div>

        <div style="margin-top: 1.25rem; font-size: 0.82rem; color: var(--text-muted); line-height: 1.5; background: var(--bg-card); padding: 0.65rem 1rem; border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
          💡 ${isKm ? 'ប្រសិនបើមិនឃើញ Email ក្នុង Inbox សូមពិនិត្យមើលក្នុងប្រអប់ <strong>Spam</strong> ឬ <strong>Junk</strong> របស់អ្នក។' : 'If you do not see the email, please check your <strong>Spam</strong> or <strong>Junk</strong> folder.'}
        </div>
      </div>
    `;

    const btnOpenOtp = document.getElementById('btnGateOpenOtp');
    if (btnOpenOtp) {
      btnOpenOtp.addEventListener('click', () => {
        this.openOtpModal(user ? user.email : '', () => {
          this.loadCreateView(presetFrameId);
        });
      });
    }

    const btnSendOtp = document.getElementById('btnGateSendOtp');
    if (btnSendOtp) {
      btnSendOtp.addEventListener('click', async () => {
        btnSendOtp.disabled = true;
        try {
          await OtpService.generateOtp(user ? user.email : '');
          this.showToast(t('verificationEmailSent'), 'success');
          setTimeout(() => { if (btnSendOtp) btnSendOtp.disabled = false; }, 5000);
          this.openOtpModal(user ? user.email : '', () => {
            this.loadCreateView(presetFrameId);
          });
        } catch (err) {
          btnSendOtp.disabled = false;
          this.showToast(err.message || 'Error sending OTP', 'error');
        }
      });
    }

    const btnCheck = document.getElementById('btnCheckVerified');
    if (btnCheck) {
      btnCheck.addEventListener('click', async () => {
        btnCheck.disabled = true;
        btnCheck.innerHTML = `<span>⏳ ${isKm ? 'កំពុងពិនិត្យ...' : 'Checking...'}</span>`;
        try {
          const verified = await AuthService.checkEmailVerificationStatus();
          if (verified) {
            this.showToast(t('emailVerifiedSuccess'), 'success');
            this.loadCreateView(presetFrameId);
          } else {
            this.showToast(t('emailNotVerifiedYet'), 'error');
            btnCheck.disabled = false;
            btnCheck.innerHTML = `<span>🔄 ${t('checkVerificationBtn')}</span>`;
          }
        } catch (err) {
          btnCheck.disabled = false;
          btnCheck.innerHTML = `<span>🔄 ${t('checkVerificationBtn')}</span>`;
        }
      });
    }

    const btnResend = document.getElementById('btnResendVerification');
    if (btnResend) {
      btnResend.addEventListener('click', async () => {
        btnResend.disabled = true;
        try {
          await AuthService.resendVerificationEmail();
          this.showToast(t('verificationEmailSent'), 'success');
          setTimeout(() => { btnResend.disabled = false; }, 10000);
        } catch (err) {
          btnResend.disabled = false;
          this.showToast(err.message || 'Error sending email', 'error');
        }
      });
    }

    const btnSignOut = document.getElementById('btnSignOutGate');
    if (btnSignOut) {
      btnSignOut.addEventListener('click', async () => {
        await AuthService.logout();
        this.showToast(t('logoutSuccess'), 'success');
        window.location.hash = '#explore';
      });
    }
  }

  // ==========================================
  // VIEW 4: IN-APP FRAME DESIGNER (CLEAN PREVIEW)
  // ==========================================
  loadDesignerView() {
    this.currentView = 'designer';
    const container = document.getElementById('appContent');
    const isKm = getLanguage() === 'km';

    container.innerHTML = `
      <div class="designer-top-nav">
        <button class="btn btn-secondary" onclick="window.location.hash='#explore'">
          ${Icons.back} <span>${t('backToHome')}</span>
        </button>
      </div>

      <div class="designer-header-wrap">
        <h1 class="designer-title">${t('designerTitle')}</h1>
        <p class="designer-subtitle">${t('designerSubtitle')}</p>
      </div>

      <div class="studio-layout designer-studio-layout">
        <!-- Canvas Left Column -->
        <div class="canvas-wrapper-card designer-canvas-card">
          <div class="designer-card-meta">
            <span class="designer-live-badge">
              <span class="live-dot"></span> <span>${isKm ? 'ការមើលផ្ទាល់' : 'Live Canvas'}</span>
            </span>
            <span class="designer-res-badge">1000×1000 PNG</span>
          </div>

          <div class="canvas-container designer-canvas-container" id="designerCanvasWrap">
            <canvas id="designerCanvas" width="1000" height="1000"></canvas>
          </div>

          <div class="designer-action-buttons">
            <button class="btn btn-primary" id="btnUseAsCampaign">
              ${Icons.plus} <span>${t('exportAsFrame')}</span>
            </button>
            <button class="btn btn-secondary" id="btnDownloadDesignerFrame">
              ${Icons.download} <span>PNG</span>
            </button>
          </div>
        </div>

        <!-- Controls Right Column -->
        <div class="studio-controls-card designer-controls-card">
          <div class="controls-card-header">
            <h3>🎨 <span>${isKm ? 'កំណត់រចនាប័ទ្មស៊ុម' : 'Customize Frame'}</span></h3>
          </div>

          <!-- Shape Selection with Visual Icons -->
          <div class="form-group">
            <label class="form-label">🎯 ${t('cutoutShape')}</label>
            <div class="shape-picker-grid">
              <button type="button" class="shape-picker-btn active" data-shape="circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"/></svg>
                <span>${t('shapeCircle')}</span>
              </button>
              <button type="button" class="shape-picker-btn" data-shape="rounded">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="5"/></svg>
                <span>${t('shapeRounded')}</span>
              </button>
              <button type="button" class="shape-picker-btn" data-shape="square">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="0"/></svg>
                <span>${t('shapeSquare')}</span>
              </button>
              <button type="button" class="shape-picker-btn" data-shape="arch">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 21V10a8 8 0 0 1 16 0v11"/></svg>
                <span>${t('shapeArch')}</span>
              </button>
              <button type="button" class="shape-picker-btn" data-shape="octagon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/></svg>
                <span>${t('shapeOctagon')}</span>
              </button>
            </div>
          </div>

          <!-- Theme / Gradient Swatches -->
          <div class="form-group">
            <label class="form-label">🌈 ${t('frameTheme')}</label>
            <div class="color-swatch-picker">
              <button type="button" class="color-swatch-btn active" data-theme-name="royalBlue" style="background: linear-gradient(135deg, #1e3a8a, #3b82f6);" title="Royal Blue"></button>
              <button type="button" class="color-swatch-btn" data-theme-name="emerald" style="background: linear-gradient(135deg, #065f46, #10b981);" title="Emerald"></button>
              <button type="button" class="color-swatch-btn" data-theme-name="crimson" style="background: linear-gradient(135deg, #881337, #e11d48);" title="Crimson Red"></button>
              <button type="button" class="color-swatch-btn" data-theme-name="sunset" style="background: linear-gradient(135deg, #c2410c, #f97316);" title="Sunset Orange"></button>
              <button type="button" class="color-swatch-btn" data-theme-name="midnightGold" style="background: linear-gradient(135deg, #0f172a, #eab308);" title="Midnight Gold"></button>
              <button type="button" class="color-swatch-btn" data-theme-name="cyberNeon" style="background: linear-gradient(135deg, #581c87, #06b6d4);" title="Cyber Neon"></button>
              <button type="button" class="color-swatch-btn" data-theme-name="rosePink" style="background: linear-gradient(135deg, #9d174d, #ec4899);" title="Rose Pink"></button>
            </div>
          </div>

          <!-- Header Badge Text -->
          <div class="form-group">
            <label class="form-label">🏷️ ${t('badgeText')}</label>
            <input type="text" id="designerHeaderInput" class="form-input" value="CLASS OF 2026" placeholder="${t('badgePlaceholder')}" />
          </div>

          <!-- Footer Badge Text -->
          <div class="form-group">
            <label class="form-label">✨ ${t('subBadgeText')}</label>
            <input type="text" id="designerFooterInput" class="form-input" value="CONGRATULATIONS!" placeholder="${t('subBadgePlaceholder')}" />
          </div>
        </div>
      </div>
    `;

    // Initialize Designer
    const canvas = document.getElementById('designerCanvas');
    this.activeDesigner = new FrameDesigner(canvas);

    // Bind Shape Chips
    container.querySelectorAll('[data-shape]').forEach(chip => {
      chip.addEventListener('click', () => {
        container.querySelectorAll('[data-shape]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.activeDesigner.update({ shape: chip.getAttribute('data-shape') });
      });
    });

    // Bind Theme Chips
    container.querySelectorAll('[data-theme-name]').forEach(chip => {
      chip.addEventListener('click', () => {
        container.querySelectorAll('[data-theme-name]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.activeDesigner.update({ theme: chip.getAttribute('data-theme-name') });
      });
    });

    // Inputs
    document.getElementById('designerHeaderInput').addEventListener('input', (e) => {
      this.activeDesigner.update({ headerText: e.target.value });
    });
    document.getElementById('designerFooterInput').addEventListener('input', (e) => {
      this.activeDesigner.update({ footerText: e.target.value });
    });

    // Use As Campaign
    document.getElementById('btnUseAsCampaign').addEventListener('click', () => {
      window._designerExportedFrame = this.activeDesigner.getTransparentPNGDataUrl();
      window.location.hash = '#create/designer';
    });

    // Download PNG
    document.getElementById('btnDownloadDesignerFrame').addEventListener('click', () => {
      const dataUrl = this.activeDesigner.getTransparentPNGDataUrl();
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `custom-frame-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      this.showToast(t('downloadSuccess'), 'success');
    });
  }

  // ==========================================
  // VIEW 5: MY CAMPAIGNS
  // ==========================================
  loadMyCampaignsView() {
    this.currentView = 'my-campaigns';
    const container = document.getElementById('appContent');

    // Route Guard: Require login to view user campaigns
    if (typeof AuthService !== 'undefined' && !AuthService.isAuthenticated()) {
      container.innerHTML = `
        <div class="auth-gate-card">
          <div class="auth-gate-icon">${Icons.avatar}</div>
          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-primary);">${t('myCampaigns')}</h2>
          <p style="color: var(--text-secondary); line-height: 1.6; font-size: 0.95rem;">${t('loginRequiredDesc')}</p>
          
          <div style="display: flex; flex-direction: column; gap: 0.85rem; max-width: 360px; margin: 0 auto; width: 100%;">
            <button class="btn-google" id="btnMyGateGoogle">${Icons.google} <span>${t('signInWithGoogle')}</span></button>
            <button class="btn btn-outline" id="btnMyGateEmail">${Icons.mail} <span>${t('signInWithEmail')}</span></button>
          </div>
          
          <div style="background: var(--accent-soft); border-radius: var(--radius-md); padding: 0.65rem 1rem; font-size: 0.84rem; color: var(--accent-primary); font-weight: 600; margin-top: 0.5rem;">
            💡 ${t('supporterNoLoginTip')}
          </div>
        </div>
      `;

      document.getElementById('btnMyGateGoogle').addEventListener('click', async () => {
        try {
          await AuthService.loginWithGoogle();
          this.showToast(t('loginSuccess'), 'success');
          this.loadMyCampaignsView();
        } catch (err) {
          if (err.code === 'auth/unauthorized-domain') {
            this.showToast("Domain មិនទាន់អនុញ្ញាតក្នុង Firebase Console ទេ សូម Add frame.tra4me.com", 'error');
          } else if (err.code !== 'auth/popup-closed-by-user') {
            this.showToast(t('loginFailed'), 'error');
          }
        }
      });

      document.getElementById('btnMyGateEmail').addEventListener('click', () => {
        this.openAuthModal(() => this.loadMyCampaignsView());
      });
      return;
    }

    const myCampaigns = CampaignService.getUserCampaigns();
    const user = (typeof AuthService !== 'undefined' && AuthService.currentUser) ? AuthService.currentUser : null;
    const userName = (user && (user.displayName || user.email?.split('@')[0])) || 'Creator';
    const userEmail = (user && user.email) || '';
    const userInitial = userName.charAt(0).toUpperCase();
    const userPhoto = user && user.photoURL ? user.photoURL : null;
    const totalSupporters = myCampaigns.reduce((sum, c) => sum + (c.supporters || 0), 0);

    container.innerHTML = `
      <!-- Creator Profile & Stats Dashboard -->
      <div class="creator-profile-card">
        <div class="creator-profile-info">
          ${userPhoto ? `
            <img src="${SecurityUtils.sanitizeUrl(userPhoto)}" class="creator-avatar-circle" style="object-fit: cover;" alt="${SecurityUtils.escapeHtml(userName)}" />
          ` : `
            <div class="creator-avatar-circle">${userInitial}</div>
          `}
          <div class="creator-profile-meta">
            <h2>${SecurityUtils.escapeHtml(userName)}</h2>
            <p>${SecurityUtils.escapeHtml(userEmail)}</p>
          </div>
        </div>
        <div class="creator-stats-row">
          <div class="creator-stat-box">
            <span class="creator-stat-num">${myCampaigns.length}</span>
            <span class="creator-stat-label">${t('totalCampaigns')}</span>
          </div>
          <div class="creator-stat-box">
            <span class="creator-stat-num">${totalSupporters.toLocaleString()}</span>
            <span class="creator-stat-label">${t('totalSupporters')}</span>
          </div>
        </div>
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.5rem; font-weight: 800; color: var(--text-primary); margin: 0;">${t('myCampaigns')}</h1>
          <p style="color: var(--text-secondary); font-size: 0.88rem; margin: 0.25rem 0 0 0;">${myCampaigns.length} campaigns</p>
        </div>
        <button class="btn btn-primary" onclick="window.location.hash='#create'">
          ${Icons.plus} <span>${t('createCampaign')}</span>
        </button>
      </div>

      ${myCampaigns.length === 0 ? `
        <div style="text-align: center; padding: 4rem 1rem; background: var(--bg-card); border-radius: var(--radius-xl); border: 1px solid var(--border-color);">
          <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">🎨</div>
          <h3 style="font-size: 1.15rem; color: var(--text-primary);">${t('noCampaignsYet')}</h3>
          <p style="color: var(--text-secondary); margin: 0.5rem 0 1.25rem 0;">${t('startCreateFirst')}</p>
          <button class="btn btn-primary" onclick="window.location.hash='#create'">
            ${Icons.plus} <span>${t('createCampaign')}</span>
          </button>
        </div>
      ` : `
        <div class="campaign-grid">
          ${myCampaigns.map(c => {
            const safeTitle = SecurityUtils.escapeHtml(c.titleKm || c.titleEn || 'Untitled');
            const safeDate = SecurityUtils.escapeHtml(c.createdAt || '');
            const safeSlug = SecurityUtils.escapeHtml(c.slug || c.id);
            const safeId = SecurityUtils.escapeHtml(c.id);
            const safeFrameUrl = SecurityUtils.sanitizeUrl(c.frameUrl);
            const safeSupporters = (c.supporters || 0).toLocaleString();
            return `
              <div class="campaign-card">
                <div class="card-preview-wrapper" onclick="window.location.hash='#campaign/${safeSlug}'">
                  <img src="${SAMPLE_AVATARS[0]}" class="card-sample-backdrop" alt="Preview backdrop" loading="lazy" />
                  <img src="${safeFrameUrl}" class="card-preview-frame" loading="lazy" />
                  <div class="card-badge-supporters">${Icons.users} <span>${safeSupporters}</span></div>
                </div>
                <div class="card-content">
                  <h3 class="card-title">${safeTitle}</h3>
                  <div class="card-creator">📅 ${safeDate}</div>
                  <div class="card-footer" style="margin-top: 0.75rem; display: flex; gap: 0.5rem;">
                    <button class="btn btn-primary" style="flex: 1;" onclick="window.location.hash='#campaign/${safeSlug}'">
                      ${Icons.camera} <span>${t('viewCampaign')}</span>
                    </button>
                    <button class="btn-icon" style="color: #ef4444;" title="${t('delete')}" onclick="app.deleteUserCampaign(decodeURIComponent('${encodeURIComponent(c.id || '')}'))">
                      ${Icons.trash}
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    `;
  }

  async deleteUserCampaign(id) {
    if (!id) return;
    if (confirm(t('deleteConfirm'))) {
      await CampaignService.deleteCampaign(id);
      this.showToast("Campaign deleted");
      this.loadMyCampaignsView();
    }
  }

  showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const iconSpan = document.createElement('span');
    iconSpan.innerHTML = (type === 'success' ? Icons.check : '!');
    
    const textSpan = document.createElement('span');
    textSpan.textContent = String(message || '');

    toast.appendChild(iconSpan);
    toast.appendChild(textSpan);

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }
}

// Global App Instance
let app;
window.addEventListener('DOMContentLoaded', () => {
  app = new TwibbonApp();
  setTimeout(() => {
    CampaignService.syncLocalCampaignsToCloud();
  }, 1000);
});
