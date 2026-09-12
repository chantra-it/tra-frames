// Main Single Page Application Coordinator & Router

class TwibbonApp {
  constructor() {
    this.currentView = 'explore';
    this.currentRouteHash = window.location.hash || '';
    this.previousRouteHash = '';
    this.isRevertingHash = false;
    this.isInitialLoad = true;
    this.activeCampaign = null;
    this.activeStudio = null;
    this.activeDesigner = null;
    this.studio = null;
    this.designer = null;
    this.isCreateFormDirty = false;
    this.isAuthPendingOtp = false;
    this.adminSelectedCampaigns = new Set();

    // Restore Explore states from sessionStorage
    try {
      this.currentCategory = sessionStorage.getItem('tra_explore_cat') || 'all';
      this.searchQuery = sessionStorage.getItem('tra_explore_q') || '';
      this.sortOrder = sessionStorage.getItem('tra_explore_sort') || 'popular';
    } catch (e) {
      this.currentCategory = 'all';
      this.searchQuery = '';
      this.sortOrder = 'popular';
    }

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
        const activeHash = window.location.hash || '';
        if (this.currentView === 'create' || this.currentView === 'my-campaigns' || activeHash.startsWith('#create') || activeHash.startsWith('#my-campaigns')) {
          this.renderCurrentView();
        }
      });
    }

    // 2.1 Multi-Tab Authentication Synchronization
    window.addEventListener('storage', (e) => {
      if (e.key === 'tra_active_user' || e.key === 'tra_verified_emails') {
        if (typeof AuthService !== 'undefined') {
          try {
            const activeStored = localStorage.getItem('tra_active_user');
            AuthService.currentUser = activeStored ? JSON.parse(activeStored) : null;
            this.updateNavAuth(AuthService.currentUser);
            const activeHash = window.location.hash || '';
            if (this.currentView === 'create' || this.currentView === 'my-campaigns' || activeHash.startsWith('#create') || activeHash.startsWith('#my-campaigns')) {
              this.renderCurrentView();
            }
          } catch (err) {}
        }
      }
    });

    // 3. Track scroll position per route for refresh/reload restoration
    window.addEventListener('scroll', () => {
      const activeHash = window.location.hash || '#explore';
      try {
        sessionStorage.setItem('tra_scroll_' + activeHash, window.scrollY);
      } catch (e) {}
    }, { passive: true });

    // 4. Browser BeforeUnload Guard (Prompts confirmation on F5 / Reload / Close Tab)
    window.addEventListener('beforeunload', (e) => {
      if (this.hasUnsavedWork()) {
        e.preventDefault();
        e.returnValue = ''; // Shows browser native: "Reload site? Changes you made may not be saved."
        return '';
      }
    });

    // 5. Setup Hash Routing with Intra-App Navigation Guard
    window.addEventListener('hashchange', (e) => {
      if (this.isRevertingHash) {
        this.isRevertingHash = false;
        return;
      }

      if (this.hasUnsavedWork()) {
        const isKm = typeof getLanguage === 'function' && getLanguage() === 'km';
        const confirmMsg = isKm
          ? "⚠️ អ្នកមានការងារដែលមិនទាន់បានបញ្ចប់ ឬមិនទាន់បានរក្សាទុក!\n\nតើអ្នកពិតជាចង់ចាកចេញមែនទេ? ការផ្លាស់ប្តូររបស់អ្នកអាចនឹងបាត់បង់។"
          : "⚠️ You have unsaved or unfinished work in progress!\n\nAre you sure you want to leave? Your changes may be lost.";
        
        if (!window.confirm(confirmMsg)) {
          this.isRevertingHash = true;
          const oldHash = e.oldURL ? e.oldURL.split('#')[1] : '';
          window.location.hash = oldHash ? ('#' + oldHash) : (this.currentRouteHash || '#explore');
          return;
        }
        // Confirmed leaving: clear dirty flags
        this.clearAllDirty();
      }

      this.previousRouteHash = this.currentRouteHash;
      this.currentRouteHash = window.location.hash;
      this.handleRoute();
    });

    // 6. Listen for language changes
    document.addEventListener('languageChanged', () => {
      this.updateStaticTranslations();
      this.updateNavAuth(AuthService ? AuthService.currentUser : null);
      this.renderCurrentView();
    });

    // 7. Route Persistence: If root URL visited without hash, restore last active route!
    if (!window.location.hash || window.location.hash === '#' || window.location.hash === '') {
      try {
        const lastRoute = localStorage.getItem('tra_last_active_route');
        if (lastRoute && lastRoute !== '#' && lastRoute !== '') {
          window.location.hash = lastRoute;
          return;
        }
      } catch (e) {}
    }

    // 8. Initial route resolution
    this.updateStaticTranslations();
    this.handleRoute();
  }

  hasUnsavedWork() {
    // 1. Check Canvas Studio
    const studio = this.activeStudio || this.studio;
    if ((this.currentView === 'campaign' || this.currentView === 'studio') && studio && typeof studio.hasUnsavedWork === 'function') {
      if (studio.hasUnsavedWork()) return true;
    }

    // 2. Check Frame Designer
    const designer = this.activeDesigner || this.designer;
    if (this.currentView === 'designer' && designer && typeof designer.hasUnsavedWork === 'function') {
      if (designer.hasUnsavedWork()) return true;
    }

    // 3. Check Campaign Creation Form
    if (this.currentView === 'create' && this.isCreateFormDirty) {
      return true;
    }

    // 4. Check Auth / Sign-up OTP in progress
    if (this.isAuthPendingOtp) {
      return true;
    }

    return false;
  }

  clearAllDirty() {
    const studio = this.activeStudio || this.studio;
    if (studio && typeof studio.clearDirty === 'function') {
      studio.clearDirty();
    }
    const designer = this.activeDesigner || this.designer;
    if (designer && typeof designer.clearDirty === 'function') {
      designer.clearDirty();
    }
    this.isCreateFormDirty = false;
    this.isAuthPendingOtp = false;
    try {
      sessionStorage.removeItem('tra_create_draft');
    } catch (e) {}
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
            ${(typeof AdminService !== 'undefined' && AdminService.isSuperAdmin(user)) ? `
            <button class="user-dropdown-item admin-dropdown-btn" onclick="app.navigateTo('admin')" style="background: rgba(37, 99, 235, 0.08); color: var(--accent-primary); font-weight: 700; border-left: 3px solid var(--accent-primary);">
              👑 <span>${t('adminDashboard')}</span>
            </button>
            ` : ''}
            <button class="user-dropdown-item" onclick="app.navigateTo('my-campaigns')">
              ${Icons.avatar} <span>${t('myCampaigns')}</span>
            </button>
            <button class="user-dropdown-item" onclick="app.navigateTo('create')">
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
      try {
        sessionStorage.removeItem('tra_admin_active_tab');
        localStorage.removeItem('tra_admin_active_tab');
      } catch (e) {}
      if (this.currentView === 'create' || this.currentView === 'my-campaigns' || this.currentView === 'admin') {
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
      <div class="modal-card modal-auth-card">
        <!-- Desktop Left Branding & Benefits Sidebar -->
        <div class="auth-sidebar">
          <div>
            <div class="auth-sidebar-brand">
              <div class="auth-sidebar-logo">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div>
                <div class="auth-sidebar-title">Tra Frames</div>
                <div class="auth-sidebar-subtitle">Next-Gen Profile Platform</div>
              </div>
            </div>

            <div class="auth-sidebar-headline">
              <h4>${isKm ? 'ចូលរួមជាមួយសហគមន៍ Tra Frames' : 'Join the Tra Frames Community'}</h4>
              <p>${isKm ? 'បង្កើត កែសម្រួល និងចែករំលែកស៊ុមរូបភាពកម្រិតខ្ពស់ដោយឥតគិតថ្លៃ និងសុវត្ថិភាពខ្ពស់។' : 'Design, customize, and share premium profile frames with ease, speed, and rock-solid security.'}</p>
            </div>

            <div class="auth-sidebar-features">
              <div class="auth-sidebar-feat-item">
                <div class="auth-sidebar-feat-icon">🎨</div>
                <div class="auth-sidebar-feat-text">
                  <strong>${isKm ? 'រចនាស៊ុមដោយសេរី' : 'Custom Frame Creator'}</strong>
                  <span>${isKm ? 'ឧបករណ៍ Canvas Studio ដ៏ទំនើប' : 'Powerful visual canvas studio'}</span>
                </div>
              </div>
              <div class="auth-sidebar-feat-item">
                <div class="auth-sidebar-feat-icon">⚡</div>
                <div class="auth-sidebar-feat-text">
                  <strong>${isKm ? 'ទាញយករហ័ស HD/4K' : 'Ultra Fast HD Export'}</strong>
                  <span>${isKm ? 'កម្រិតច្បាស់ខ្ពស់ គ្មានផ្ទៃខាងក្រោយ' : 'Crisp transparent PNG export'}</span>
                </div>
              </div>
              <div class="auth-sidebar-feat-item">
                <div class="auth-sidebar-feat-icon">🔒</div>
                <div class="auth-sidebar-feat-text">
                  <strong>${isKm ? 'សុវត្ថិភាព ផ្ទៀងផ្ទាត់ OTP' : 'Verified & Secure'}</strong>
                  <span>${isKm ? 'ការពារគណនីរបស់អ្នកជានិច្ច' : 'Fast email OTP verification'}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="auth-sidebar-footer">
            💡 <strong>${t('supporterNoLoginTip')}</strong>
          </div>
        </div>

        <!-- Right Form Panel -->
        <div class="auth-form-panel">
          <div class="auth-form-header">
            <h3 id="authModalTitle">${Icons.avatar} <span id="authModalTitleText">${t('signIn')}</span></h3>
            <button class="modal-close-btn" onclick="if (typeof app !== 'undefined') app.isAuthPendingOtp = false; document.getElementById('authModalOverlay').remove()">&times;</button>
          </div>

          <!-- Segmented Pill Tabs -->
          <div class="auth-tabs-pill">
            <button type="button" class="auth-tab-pill active" id="tabSignIn">${t('signIn')}</button>
            <button type="button" class="auth-tab-pill" id="tabSignUp">${t('createAccount')}</button>
          </div>

          <!-- Google Sign-In Primary Button -->
          <button class="btn-google" id="btnAuthGoogle" type="button" style="margin-bottom: 0.75rem;">
            ${Icons.google} <span>${t('signInWithGoogle')}</span>
          </button>

          <div class="auth-divider" style="margin: 0.35rem 0 0.85rem;">
            <span>${t('orDivider')}</span>
          </div>

          <form id="authEmailForm" style="display: flex; flex-direction: column; gap: 0.75rem;">
            <!-- Display Name (Sign Up only) -->
            <div class="form-group" id="groupDisplayName" style="display: none;">
              <label class="form-label">${t('fullName')}</label>
              <input type="text" id="authDisplayNameInput" class="form-input" placeholder="e.g. Sok Chantra" />
            </div>

            <!-- Email with Send OTP action -->
            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                <label class="form-label" style="margin-bottom: 0;">${t('email')} *</label>
                <button type="button" id="btnRequestOtp" class="btn-get-otp" style="display: none;">
                  📩 ${isKm ? 'ផ្ញើលេខកូដ OTP' : 'Send OTP Code'}
                </button>
              </div>
              <input type="email" id="authEmailInput" class="form-input" placeholder="name@example.com" required />
            </div>

            <!-- Sleek Compact OTP Dispatched Status Banner -->
            <div id="signUpOtpBanner" class="otp-compact-banner" style="display: none;">
              <div class="otp-banner-top">
                <div class="otp-badge-tag">
                  <span style="font-weight: 700; color: var(--text-primary);">📩 ${isKm ? 'បានផ្ញើកូដទៅ៖' : 'Code sent to:'}</span>
                  <span class="badge-sent" style="padding: 0.15rem 0.45rem; font-size: 0.7rem;">SENT</span>
                </div>
                <strong id="authSentEmailDisplay" style="color: var(--accent-primary); font-size: 0.78rem; word-break: break-all;"></strong>
              </div>

              <!-- Quick OTP Code Pill & 1-Click Auto Fill -->
              <div class="otp-quick-row">
                <div class="otp-code-pill">
                  <span class="otp-code-label">🔑 OTP:</span>
                  <span id="authOtpCodeDisplay" class="otp-code-val">----</span>
                </div>
                <button type="button" id="btnAutoFillSignUpOtp" class="btn-otp-fill-compact">
                  ⚡ <span>${isKm ? 'បំពេញស្វ័យប្រវត្តិ' : 'Auto Fill'}</span>
                </button>
              </div>
            </div>

            <!-- 4-Digit Segmented OTP Grid (Sign Up only) -->
            <div class="form-group" id="groupSignUpOtpInputs" style="display: none;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                <label class="form-label" style="margin-bottom: 0;">
                  🔑 ${isKm ? 'លេខកូដផ្ទៀងផ្ទាត់ OTP (៤ ខ្ទង់) *' : '4-Digit OTP Code *'}
                </label>
                <span id="authOtpTimerBadge" style="font-size: 0.8rem; font-weight: 700; color: var(--accent-primary); display: none;">
                  ⏱️ <span id="authOtpCountdown">10:00</span>
                </span>
              </div>
              <div class="otp-inputs-grid" id="authSignUpOtpGrid" style="margin: 0.15rem 0 0.25rem;">
                <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" class="otp-digit auth-otp-digit" data-idx="0">
                <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" class="otp-digit auth-otp-digit" data-idx="1">
                <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" class="otp-digit auth-otp-digit" data-idx="2">
                <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" class="otp-digit auth-otp-digit" data-idx="3">
              </div>
            </div>

            <!-- Password -->
            <div class="form-group">
              <label class="form-label">${t('password')} * <span id="pwdHint" style="font-size: 0.78rem; color: var(--text-muted); font-weight: normal; display: none;">(យ៉ាងតិច ៦ ខ្ទង់)</span></label>
              <input type="password" id="authPasswordInput" class="form-input" placeholder="••••••••" required minlength="6" />
            </div>

            <!-- Submit Button -->
            <button type="submit" class="btn btn-primary" id="btnAuthSubmit" style="padding: 0.8rem; font-size: 0.98rem; margin-top: 0.25rem;">
              <span>${t('signIn')}</span>
            </button>

            <!-- Bottom Mode Switcher Note -->
            <div style="text-align: center; margin-top: 0.35rem; font-size: 0.82rem; color: var(--text-secondary);">
              <span id="authBottomPrompt">${isKm ? 'មិនទាន់មានគណនីមែនទេ?' : "Don't have an account?"}</span>
              <button type="button" id="btnAuthToggleMode" style="background: none; border: none; color: var(--accent-primary); font-weight: 700; cursor: pointer; text-decoration: underline; margin-left: 0.25rem; font-family: inherit; font-size: 0.82rem;">
                ${t('createAccount')}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    let isSignUp = false;
    let authOtpInterval = null;
    const tabSignIn = overlay.querySelector('#tabSignIn');
    const tabSignUp = overlay.querySelector('#tabSignUp');
    const authModalTitleText = overlay.querySelector('#authModalTitleText');
    const authBottomPrompt = overlay.querySelector('#authBottomPrompt');
    const btnAuthToggleMode = overlay.querySelector('#btnAuthToggleMode');
    const groupName = overlay.querySelector('#groupDisplayName');
    const btnRequestOtp = overlay.querySelector('#btnRequestOtp');
    const signUpOtpBanner = overlay.querySelector('#signUpOtpBanner');
    const authSentEmailDisplay = overlay.querySelector('#authSentEmailDisplay');
    const groupSignUpOtpInputs = overlay.querySelector('#groupSignUpOtpInputs');
    const authOtpTimerBadge = overlay.querySelector('#authOtpTimerBadge');
    const authOtpCountdown = overlay.querySelector('#authOtpCountdown');
    const authOtpDigits = overlay.querySelectorAll('.auth-otp-digit');
    const pwdHint = overlay.querySelector('#pwdHint');
    const btnSubmit = overlay.querySelector('#btnAuthSubmit span');
    const authEmailInput = overlay.querySelector('#authEmailInput');
    const authDisplayNameInput = overlay.querySelector('#authDisplayNameInput');
    const authPasswordInput = overlay.querySelector('#authPasswordInput');
    const authSignUpOtpGrid = overlay.querySelector('#authSignUpOtpGrid');

    // Switch to Sign In Tab
    tabSignIn.addEventListener('click', () => {
      isSignUp = false;
      tabSignIn.classList.add('active');
      tabSignUp.classList.remove('active');
      if (authModalTitleText) authModalTitleText.textContent = t('signIn');
      if (authBottomPrompt) authBottomPrompt.textContent = isKm ? 'មិនទាន់មានគណនីមែនទេ?' : "Don't have an account?";
      if (btnAuthToggleMode) btnAuthToggleMode.textContent = t('createAccount');
      groupName.style.display = 'none';
      btnRequestOtp.style.display = 'none';
      signUpOtpBanner.style.display = 'none';
      groupSignUpOtpInputs.style.display = 'none';
      pwdHint.style.display = 'none';
      btnSubmit.textContent = t('signIn');
    });

    // Switch to Sign Up Tab
    tabSignUp.addEventListener('click', () => {
      isSignUp = true;
      tabSignUp.classList.add('active');
      tabSignIn.classList.remove('active');
      if (authModalTitleText) authModalTitleText.textContent = t('createAccount');
      if (authBottomPrompt) authBottomPrompt.textContent = isKm ? 'មានគណនីរួចហើយ?' : "Already have an account?";
      if (btnAuthToggleMode) btnAuthToggleMode.textContent = t('signIn');
      groupName.style.display = 'flex';
      btnRequestOtp.style.display = 'inline-block';
      groupSignUpOtpInputs.style.display = 'flex';
      pwdHint.style.display = 'inline';
      btnSubmit.textContent = isKm ? '✅ ផ្ទៀងផ្ទាត់ OTP & ចុះឈ្មោះ' : '✅ Verify OTP & Sign Up';

      // Check if existing valid OTP in session
      const currentEmail = authEmailInput.value.trim();
      if (currentEmail && OtpService.hasActiveOtp(currentEmail)) {
        if (authSentEmailDisplay) authSentEmailDisplay.textContent = currentEmail;
        const activeCode = OtpService.getActiveOtpCode(currentEmail);
        const codeDisplay = overlay.querySelector('#authOtpCodeDisplay');
        if (codeDisplay && activeCode) codeDisplay.textContent = activeCode;
        signUpOtpBanner.style.display = 'block';
      }
    });

    if (btnAuthToggleMode) {
      btnAuthToggleMode.addEventListener('click', () => {
        if (isSignUp) {
          tabSignIn.click();
        } else {
          tabSignUp.click();
        }
      });
    }

    const fillSignUpOtp = (code) => {
      if (!code || code.length !== 4) return;
      for (let i = 0; i < 4; i++) {
        authOtpDigits[i].value = code[i];
        authOtpDigits[i].classList.add('filled');
      }
      authOtpDigits[3].focus();
    };

    const btnAutoFillSignUpOtp = overlay.querySelector('#btnAutoFillSignUpOtp');
    if (btnAutoFillSignUpOtp) {
      btnAutoFillSignUpOtp.addEventListener('click', () => {
        const activeCode = OtpService.getActiveOtpCode(authEmailInput.value.trim());
        if (activeCode) {
          fillSignUpOtp(activeCode);
          this.showToast(isKm ? '⚡ បានបំពេញលេខកូដស្វ័យប្រវត្តិ!' : '⚡ OTP filled automatically!', 'success');
        }
      });
    }

    // 4-Digit OTP Segmented Inputs Event Listeners
    const getEnteredSignUpOtp = () => Array.from(authOtpDigits).map(d => d.value).join('');

    authOtpDigits.forEach((input, idx) => {
      input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/\D/g, '');
        e.target.value = val ? val[val.length - 1] : '';
        if (e.target.value) {
          e.target.classList.add('filled');
          if (idx < 3) authOtpDigits[idx + 1].focus();
        } else {
          e.target.classList.remove('filled');
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace') {
          if (!input.value && idx > 0) {
            authOtpDigits[idx - 1].focus();
            authOtpDigits[idx - 1].value = '';
            authOtpDigits[idx - 1].classList.remove('filled');
          } else {
            input.value = '';
            input.classList.remove('filled');
          }
        } else if (e.key === 'ArrowLeft' && idx > 0) {
          authOtpDigits[idx - 1].focus();
        } else if (e.key === 'ArrowRight' && idx < 3) {
          authOtpDigits[idx + 1].focus();
        }
      });

      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
        const numOnly = pasteData.replace(/\D/g, '').slice(0, 4);
        if (numOnly) {
          for (let i = 0; i < 4; i++) {
            if (i < numOnly.length) {
              authOtpDigits[i].value = numOnly[i];
              authOtpDigits[i].classList.add('filled');
            } else {
              authOtpDigits[i].value = '';
              authOtpDigits[i].classList.remove('filled');
            }
          }
          const nextIdx = Math.min(3, numOnly.length);
          authOtpDigits[nextIdx].focus();
        }
      });
    });

    // Sync active OTP if email is already active in session
    authEmailInput.addEventListener('input', () => {
      if (!isSignUp) return;
      const em = authEmailInput.value.trim().toLowerCase();
      const activeCode = OtpService.getActiveOtpCode(em);
      if (activeCode) {
        if (authSentEmailDisplay) authSentEmailDisplay.textContent = em;
        const codeDisplay = overlay.querySelector('#authOtpCodeDisplay');
        if (codeDisplay) codeDisplay.textContent = activeCode;
        signUpOtpBanner.style.display = 'block';
      }
    });

    // Start 10-minute countdown for Sign Up OTP
    const startAuthOtpCountdown = () => {
      if (authOtpInterval) clearInterval(authOtpInterval);
      let totalSeconds = 600;
      authOtpTimerBadge.style.display = 'inline-block';
      authOtpInterval = setInterval(() => {
        totalSeconds--;
        if (totalSeconds <= 0) {
          clearInterval(authOtpInterval);
          authOtpCountdown.textContent = "00:00";
          return;
        }
        const mins = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
        const secs = String(totalSeconds % 60).padStart(2, '0');
        authOtpCountdown.textContent = `${mins}:${secs}`;
      }, 1000);
    };

    // Request OTP Button Click
    const handleRequestOtp = async () => {
      const email = authEmailInput.value.trim().toLowerCase();
      if (!email) {
        this.showToast(isKm ? "សូមបញ្ចូលអ៊ីមែលជាមុនសិន!" : "Please enter your email first!", 'error');
        authEmailInput.focus();
        return null;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        this.showToast(isKm ? "ទម្រង់អ៊ីមែលមិនត្រឹមត្រូវទេ!" : "Invalid email format!", 'error');
        authEmailInput.focus();
        return null;
      }
      if (SecurityUtils.isDisposableEmail(email)) {
        this.showToast(t('disposableEmailError'), 'error');
        return null;
      }

      btnRequestOtp.disabled = true;
      btnRequestOtp.textContent = "⏳...";
      try {
        const res = await OtpService.generateOtp(email, authDisplayNameInput.value.trim());
        if (res && res.otpCode) {
          this.isAuthPendingOtp = true;
          if (authSentEmailDisplay) authSentEmailDisplay.textContent = email;
          const authOtpCodeDisplay = overlay.querySelector('#authOtpCodeDisplay');
          if (authOtpCodeDisplay) authOtpCodeDisplay.textContent = res.otpCode;
          signUpOtpBanner.style.display = 'block';
          startAuthOtpCountdown();
          this.showToast(isKm ? `🔑 លេខកូដ OTP ៤ ខ្ទង់របស់អ្នកគឺ៖ ${res.otpCode}` : `🔑 Your 4-digit OTP is: ${res.otpCode}`, 'success', 12000);

          // 60s cooldown on request button
          let left = 60;
          const cdInterval = setInterval(() => {
            left--;
            if (left <= 0) {
              clearInterval(cdInterval);
              btnRequestOtp.disabled = false;
              btnRequestOtp.textContent = isKm ? "📩 ផ្ញើលេខកូដ OTP" : "Send OTP Code";
            } else {
              btnRequestOtp.textContent = `${left}s`;
            }
          }, 1000);

          authOtpDigits[0].focus();
          return res.otpCode;
        }
      } catch (err) {
        btnRequestOtp.disabled = false;
        btnRequestOtp.textContent = isKm ? "📩 ផ្ញើលេខកូដ OTP" : "Send OTP Code";
        this.showToast(err.message || 'Error generating OTP', 'error');
      }
      return null;
    };

    btnRequestOtp.addEventListener('click', handleRequestOtp);

    // Handle Google Login
    overlay.querySelector('#btnAuthGoogle').addEventListener('click', async () => {
      try {
        await AuthService.loginWithGoogle();
        if (authOtpInterval) clearInterval(authOtpInterval);
        overlay.remove();
        this.showToast(t('loginSuccess'), 'success');
        if (onSuccessCallback) {
          onSuccessCallback();
        } else {
          this.renderCurrentView();
        }
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
      const email = authEmailInput.value.trim().toLowerCase();
      const password = authPasswordInput.value;
      const name = authDisplayNameInput.value.trim();

      try {
        if (isSignUp) {
          if (password.length < 6) {
            this.showToast(isKm ? "ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច ៦ តួអក្សរ" : "Password must be at least 6 characters.", 'error');
            authPasswordInput.focus();
            return;
          }

          let enteredOtp = getEnteredSignUpOtp();
          // If user hasn't entered OTP yet, send to email and prompt them!
          if (enteredOtp.length !== 4) {
            const hasOtp = OtpService.hasActiveOtp(email);
            if (!hasOtp) {
              await handleRequestOtp();
              this.showToast(isKm ? "💡 បានផ្ញើលេខកូដ OTP (៤ ខ្ទង់) ទៅ Email រួចរាល់! សូមពិនិត្យ Email រួចយកលេខកូដមកបំពេញ" : "4-digit OTP sent to your email! Please enter it below.", 'info', 8000);
              return;
            } else {
              this.showToast(isKm ? "សូមបើក Email របស់អ្នក រួចយកលេខកូដ OTP ៤ ខ្ទង់មកបំពេញក្នុងប្រអប់" : "Please check your email and enter the 4-digit OTP code below", 'error');
              authOtpDigits[0].focus();
              return;
            }
          }

          // Verify OTP first!
          const verifyResult = await OtpService.verifyOtp(email, enteredOtp);
          if (!verifyResult.success) {
            authSignUpOtpGrid.style.animation = 'shake 0.4s ease';
            setTimeout(() => { authSignUpOtpGrid.style.animation = ''; }, 400);
            if (verifyResult.reason === 'expired') {
              this.showToast(t('otpExpiredCode'), 'error');
            } else if (verifyResult.reason === 'max_attempts') {
              this.showToast(t('otpMaxAttempts'), 'error');
            } else {
              this.showToast(t('otpInvalidCode'), 'error');
            }
            return;
          }

          // OTP verified! Create account
          btnSubmit.parentElement.disabled = true;
          btnSubmit.innerHTML = `<span>⏳ ${isKm ? 'កំពុងបង្កើតគណនី...' : 'Creating account...'}</span>`;
          const user = await AuthService.signUpWithEmail(email, password, name, true);
          await OtpService.markEmailVerified(email, user ? user.uid : null);
          if (authOtpInterval) clearInterval(authOtpInterval);
          this.isAuthPendingOtp = false;
          overlay.remove();
          this.showToast(isKm ? "🎉 ចុះឈ្មោះ និងផ្ទៀងផ្ទាត់ OTP ជោគជ័យ!" : "🎉 Account registered & verified successfully!", 'success');
          if (onSuccessCallback) {
            onSuccessCallback();
          } else {
            this.renderCurrentView();
          }
          return;
        } else {
          // Sign In
          await AuthService.loginWithEmail(email, password);
          if (authOtpInterval) clearInterval(authOtpInterval);
          this.isAuthPendingOtp = false;
          this.showToast(t('loginSuccess'), 'success');
          overlay.remove();
          if (onSuccessCallback) {
            onSuccessCallback();
          } else {
            this.renderCurrentView();
          }
        }
      } catch (err) {
        console.error(err);
        btnSubmit.parentElement.disabled = false;
        btnSubmit.textContent = isSignUp ? (isKm ? '✅ ផ្ទៀងផ្ទាត់ OTP & ចុះឈ្មោះ' : '✅ Verify OTP & Sign Up') : t('signIn');
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
      if (e.target === overlay) {
        if (authOtpInterval) clearInterval(authOtpInterval);
        this.isAuthPendingOtp = false;
        overlay.remove();
      }
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
        
        <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5; margin-bottom: 0.85rem;">
          ${t('otpModalSubtitle')}<br>
          <strong style="color: var(--accent-primary); word-break: break-all;">${cleanEmail}</strong>
        </p>

        <!-- Quick OTP Code Box & 1-Click Auto Fill -->
        <div id="otpModalQuickBox" style="background: var(--accent-soft); border: 1.5px dashed var(--accent-primary); border-radius: var(--radius-md); padding: 0.65rem 0.85rem; margin: 0.6rem 0 1rem; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <span style="font-size: 0.76rem; color: var(--text-secondary); display: block; font-weight: 600;">🔑 ${isKm ? 'លេខកូដសម្ងាត់ OTP របស់អ្នក៖' : 'Your 4-Digit OTP Code:'}</span>
            <strong id="modalOtpCodeDisplay" style="font-size: 1.45rem; letter-spacing: 5px; color: var(--accent-primary); font-family: monospace; font-weight: 800;">----</strong>
          </div>
          <button type="button" id="btnAutoFillModalOtp" class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.82rem; border-radius: var(--radius-sm); display: flex; align-items: center; gap: 0.3rem;">
            ⚡ <span>${isKm ? 'បំពេញស្វ័យប្រវត្តិ' : 'Auto Fill'}</span>
          </button>
        </div>

        <!-- 4-Digit Segmented Inputs -->
        <div class="otp-inputs-grid" id="otpInputsGrid">
          <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" class="otp-digit" data-index="0" autofocus>
          <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" class="otp-digit" data-index="1">
          <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" class="otp-digit" data-index="2">
          <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" class="otp-digit" data-index="3">
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
          💡 ${isKm ? 'សូមបើកប្រអប់សំបុត្រ <strong>Email (Inbox ឬ Spam)</strong> របស់អ្នក រួចយកលេខកូដ ៤ ខ្ទង់មកបំពេញទីនេះ' : 'Please check your <strong>Email (Inbox or Spam)</strong> and enter the 4-digit code here'}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const digits = overlay.querySelectorAll('.otp-digit');
    const submitBtn = overlay.querySelector('#btnOtpSubmit');
    const resendBtn = overlay.querySelector('#btnOtpResend');
    const countdownEl = overlay.querySelector('#otpCountdown');
    const modalOtpCodeDisplay = overlay.querySelector('#modalOtpCodeDisplay');

    const activeCode = OtpService.getActiveOtpCode(targetEmail);
    if (activeCode && modalOtpCodeDisplay) {
      modalOtpCodeDisplay.textContent = activeCode;
    }

    const btnAutoFillModalOtp = overlay.querySelector('#btnAutoFillModalOtp');
    if (btnAutoFillModalOtp) {
      btnAutoFillModalOtp.addEventListener('click', () => {
        const code = OtpService.getActiveOtpCode(targetEmail);
        if (code && code.length === 4) {
          for (let i = 0; i < 4; i++) {
            digits[i].value = code[i];
            digits[i].classList.add('filled');
          }
          digits[3].focus();
          checkFull();
          this.showToast(isKm ? '⚡ បានបំពេញលេខកូដស្វ័យប្រវត្តិ!' : '⚡ OTP filled automatically!', 'success');
        }
      });
    }

    // Focus first input box
    setTimeout(() => {
      if (digits[0]) digits[0].focus();
    }, 100);

    const getEnteredOtp = () => Array.from(digits).map(d => d.value).join('');

    const checkFull = () => {
      const val = getEnteredOtp();
      const isComplete = val.length === 4 && /^\d{4}$/.test(val);
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
          if (idx < 3) digits[idx + 1].focus();
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
        } else if (e.key === 'ArrowRight' && idx < 3) {
          digits[idx + 1].focus();
        }
      });

      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
        const numOnly = pasteData.replace(/\D/g, '').slice(0, 4);
        if (numOnly) {
          for (let i = 0; i < 4; i++) {
            if (i < numOnly.length) {
              digits[i].value = numOnly[i];
              digits[i].classList.add('filled');
            } else {
              digits[i].value = '';
              digits[i].classList.remove('filled');
            }
          }
          const nextIdx = Math.min(3, numOnly.length);
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
      if (code.length !== 4) return;

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
        const res = await OtpService.generateOtp(targetEmail);
        if (modalOtpCodeDisplay && res && res.otpCode) {
          modalOtpCodeDisplay.textContent = res.otpCode;
        }
        this.showToast(isKm ? `🔑 លេខកូដ OTP ៤ ខ្ទង់របស់អ្នកគឺ៖ ${res.otpCode}` : `🔑 Your 4-digit OTP is: ${res.otpCode}`, 'success', 12000);
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
    const rawHash = window.location.hash || '#explore';
    const hash = rawHash.slice(1) || 'explore';
    const parts = hash.split('/');
    const mainRoute = parts[0];
    const param = parts[1];

    this.updateNavLinks(mainRoute);

    // Save active route to localStorage for persistence
    try {
      localStorage.setItem('tra_last_active_route', rawHash);
    } catch (e) {}

    const isNewRoute = (this.currentRouteHash !== this.previousRouteHash && !this.isInitialLoad);

    if (mainRoute === 'campaign' && param) {
      this.loadCampaignView(param);
    } else if (mainRoute === 'create') {
      this.loadCreateView(param);
    } else if (mainRoute === 'designer') {
      this.loadDesignerView();
    } else if (mainRoute === 'my-campaigns') {
      this.loadMyCampaignsView();
    } else if (mainRoute === 'admin') {
      this.loadAdminView(param);
    } else {
      this.loadExploreView();
    }

    this.renderGlobalAnnouncementBanner();

    // Scroll handling:
    // If it's a page reload or refresh, restore previous scroll position!
    const savedScroll = sessionStorage.getItem('tra_scroll_' + rawHash);
    if ((this.isInitialLoad || !isNewRoute) && savedScroll) {
      const scrollY = parseInt(savedScroll, 10);
      if (!isNaN(scrollY) && scrollY > 0) {
        setTimeout(() => {
          window.scrollTo({ top: scrollY, behavior: 'instant' });
        }, 80);
      }
    } else if (isNewRoute) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    this.isInitialLoad = false;
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

  navigateTo(route) {
    const targetHash = '#' + route;
    if (window.location.hash === targetHash) {
      this.handleRoute();
    } else {
      window.location.hash = targetHash;
    }
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
        try { sessionStorage.setItem('tra_explore_q', this.searchQuery); } catch (err) {}
        this.loadExploreView();
      });
    }

    // Bind Clear Button
    const btnClear = document.getElementById('btnSearchClear');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        this.searchQuery = '';
        try { sessionStorage.setItem('tra_explore_q', ''); } catch (err) {}
        this.loadExploreView();
      });
    }

    // Bind Sort Buttons
    const btnSortPop = document.getElementById('btnSortPopular');
    if (btnSortPop) {
      btnSortPop.addEventListener('click', () => {
        this.sortOrder = 'popular';
        try { sessionStorage.setItem('tra_explore_sort', 'popular'); } catch (err) {}
        this.loadExploreView();
      });
    }

    const btnSortNew = document.getElementById('btnSortNewest');
    if (btnSortNew) {
      btnSortNew.addEventListener('click', () => {
        this.sortOrder = 'newest';
        try { sessionStorage.setItem('tra_explore_sort', 'newest'); } catch (err) {}
        this.loadExploreView();
      });
    }

    // Bind Category Chips
    container.querySelectorAll('.category-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.currentCategory = chip.getAttribute('data-cat');
        try { sessionStorage.setItem('tra_explore_cat', this.currentCategory); } catch (err) {}
        this.loadExploreView();
      });
    });
  }

  setQuickSearch(tag) {
    this.searchQuery = tag;
    try { sessionStorage.setItem('tra_explore_q', this.searchQuery); } catch (err) {}
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
          <div class="card-badge-category">${t('cat' + (campaign.category ? (campaign.category.charAt(0).toUpperCase() + campaign.category.slice(1)) : 'Celebration'))}</div>
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

    // Auto-load First Sample Avatar (as sample preview, not custom user photo)
    this.activeStudio.setUserPhoto(SAMPLE_AVATARS[0], false);
    this.studio = this.activeStudio;

    // Bind Upload Dropzone
    const dropzone = document.getElementById('photoDropzone');
    const fileInput = document.getElementById('photoFileInput');

    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.activeStudio.setUserPhoto(e.target.files[0], true);
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
    const isKm = typeof getLanguage === 'function' && getLanguage() === 'km';

    // Ensure AuthService has restored current active user from storage
    if (typeof AuthService !== 'undefined' && !AuthService.currentUser) {
      try {
        const stored = localStorage.getItem("tra_active_user");
        if (stored) AuthService.currentUser = JSON.parse(stored);
      } catch (e) {}
    }

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

    // Load any existing draft from sessionStorage
    let savedDraft = null;
    try {
      const rawDraft = sessionStorage.getItem('tra_create_draft');
      if (rawDraft) savedDraft = JSON.parse(rawDraft);
    } catch (e) {}

    if (savedDraft && savedDraft.frameUrl) {
      initialFrame = savedDraft.frameUrl;
    }

    const defaultCreator = (savedDraft && savedDraft.creator)
      ? SecurityUtils.escapeHtml(savedDraft.creator)
      : ((AuthService && AuthService.currentUser) 
          ? SecurityUtils.escapeHtml(AuthService.currentUser.displayName || AuthService.currentUser.email.split('@')[0])
          : '');

    const initialTitle = savedDraft && savedDraft.title ? SecurityUtils.escapeHtml(savedDraft.title) : '';
    const initialSlug = savedDraft && savedDraft.slug ? SecurityUtils.escapeHtml(savedDraft.slug) : '';
    const initialCategory = savedDraft && savedDraft.category ? savedDraft.category : 'education';
    const initialDesc = savedDraft && savedDraft.desc ? SecurityUtils.escapeHtml(savedDraft.desc) : '';
    const initialCaption = savedDraft && savedDraft.caption ? SecurityUtils.escapeHtml(savedDraft.caption) : '';
    if (savedDraft && (savedDraft.title || savedDraft.desc || (savedDraft.frameUrl && savedDraft.frameUrl !== PRESET_FRAMES.graduation))) {
      this.isCreateFormDirty = true;
    }

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
              <span style="display:inline-flex;align-items:center;width:18px;height:18px;color:var(--accent-primary);flex-shrink:0;">${Icons.eye}</span>
              <span>${t('livePreview')}</span>
            </div>
            <div class="card-preview-wrapper">
              <img src="${SAMPLE_AVATARS[0]}" class="card-sample-backdrop" alt="Backdrop" />
              <img id="liveCardFrameImg" src="${initialFrame}" class="card-preview-frame" alt="Frame" />
              <div id="liveCardCategoryBadge" class="card-badge-category">${t('cat' + (initialCategory.charAt(0).toUpperCase() + initialCategory.slice(1)))}</div>
              <div class="card-badge-supporters">${Icons.users} <span>1</span></div>
            </div>
            <div class="card-content">
              <h3 id="liveCardTitle" class="card-title">${initialTitle || (isKm ? 'ចំណងជើងយុទ្ធនាការ' : 'Campaign Title')}</h3>
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
            <input type="text" id="campaignTitle" class="form-input" value="${initialTitle}" placeholder="${t('fieldTitlePlaceholder')}" required />
          </div>

          <div class="form-row-2col">
            <div class="form-group">
              <label class="form-label">${t('fieldSlug')}</label>
              <input type="text" id="campaignSlug" class="form-input" value="${initialSlug}" placeholder="${t('fieldSlugPlaceholder')}" />
            </div>

            <div class="form-group">
              <label class="form-label">${t('fieldCategory')}</label>
              <select id="campaignCategory" class="form-select">
                <option value="education" ${initialCategory === 'education' ? 'selected' : ''}>🎓 ${t('catEducation')}</option>
                <option value="culture" ${initialCategory === 'culture' ? 'selected' : ''}>🇰🇭 ${t('catCulture')}</option>
                <option value="charity" ${initialCategory === 'charity' ? 'selected' : ''}>❤️ ${t('catCharity')}</option>
                <option value="tech" ${initialCategory === 'tech' ? 'selected' : ''}>⚡ ${t('catTech')}</option>
                <option value="celebration" ${initialCategory === 'celebration' ? 'selected' : ''}>🎉 ${t('catCelebration')}</option>
                <option value="sports" ${initialCategory === 'sports' ? 'selected' : ''}>🏆 ${t('catSports')}</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">${t('creator')} / Organization *</label>
            <input type="text" id="campaignCreator" class="form-input" value="${defaultCreator}" placeholder="e.g., Youth Union, Tech Team" required />
          </div>

          <div class="form-group">
            <label class="form-label">${t('fieldDesc')}</label>
            <textarea id="campaignDesc" class="form-textarea" rows="3" placeholder="${t('fieldDescPlaceholder')}">${initialDesc}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label">${t('fieldCaption')}</label>
            <textarea id="campaignCaption" class="form-textarea" rows="2" placeholder="${t('fieldCaptionPlaceholder')}">${initialCaption}</textarea>
          </div>

          <!-- Frame Selection / Upload -->
          <div class="form-group">
            <label class="form-label">${t('fieldFrameUpload')} *</label>
            <div style="display: flex; gap: 0.85rem; align-items: center; flex-wrap: wrap;">
              <input type="file" id="frameFileInput" accept="image/png,image/svg+xml,image/webp" style="display: none;" />
              <button type="button" class="btn btn-primary" onclick="document.getElementById('frameFileInput').click()">
                ${Icons.upload} <span>Upload PNG</span>
              </button>
              <button type="button" class="btn btn-outline" onclick="window.location.hash='#designer'">
                ${Icons.paint} <span>${t('navDesigner')}</span>
              </button>
            </div>
          </div>

          <!-- Preset Templates Shortcut -->
          <div>
            <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 0.45rem;">
              ${t('orChooseTemplate')}:
            </div>
            <div class="preset-frame-picker">
              ${Object.keys(PRESET_FRAMES).map(key => `
                <div class="preset-frame-chip ${initialFrame === PRESET_FRAMES[key] ? 'active' : ''}" data-preset="${key}" title="${key}">
                  <img src="${PRESET_FRAMES[key]}" alt="${key}" />
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
    const descInput = document.getElementById('campaignDesc');
    const captionInput = document.getElementById('campaignCaption');
    const liveCardTitle = document.getElementById('liveCardTitle');
    const liveCardCreator = document.getElementById('liveCardCreator');
    const liveCardCat = document.getElementById('liveCardCategoryBadge');
    const liveCardFrame = document.getElementById('liveCardFrameImg');
    const rawFrame = document.getElementById('rawFrameImg');

    let slugManual = !!initialSlug;
    if (slugInput) {
      slugInput.addEventListener('input', () => { slugManual = true; });
    }

    const updateCreateDraft = () => {
      const title = titleInput ? titleInput.value.trim() : '';
      const desc = descInput ? descInput.value.trim() : '';
      const hasCustom = title !== '' || desc !== '' || (selectedFrameDataUrl && selectedFrameDataUrl !== PRESET_FRAMES.graduation);
      this.isCreateFormDirty = !!hasCustom;
      if (hasCustom) {
        try {
          sessionStorage.setItem('tra_create_draft', JSON.stringify({
            title: titleInput ? titleInput.value : '',
            slug: slugInput ? slugInput.value : '',
            category: catInput ? catInput.value : 'education',
            creator: creatorInput ? creatorInput.value : '',
            desc: descInput ? descInput.value : '',
            caption: captionInput ? captionInput.value : '',
            frameUrl: selectedFrameDataUrl
          }));
        } catch (e) {}
      } else {
        try { sessionStorage.removeItem('tra_create_draft'); } catch (e) {}
      }
    };

    if (titleInput) {
      titleInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (liveCardTitle) liveCardTitle.textContent = val || (isKm ? 'ចំណងជើងយុទ្ធនាការ' : 'Campaign Title');
        if (!slugManual && slugInput) {
          const auto = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          if (auto) slugInput.value = auto;
        }
        updateCreateDraft();
      });
    }

    if (creatorInput) {
      creatorInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        const safeVal = SecurityUtils.cleanText(val, 50);
        if (liveCardCreator) {
          liveCardCreator.innerHTML = `${Icons.avatar} <span>${t('by')} ${safeVal || (isKm ? 'ឈ្មោះអ្នកបង្កើត' : 'Creator')}</span>`;
        }
        updateCreateDraft();
      });
    }

    if (catInput) {
      catInput.addEventListener('change', (e) => {
        const cat = e.target.value;
        if (liveCardCat) liveCardCat.textContent = t('cat' + (cat.charAt(0).toUpperCase() + cat.slice(1)));
        updateCreateDraft();
      });
    }

    if (slugInput) slugInput.addEventListener('input', updateCreateDraft);
    if (descInput) descInput.addEventListener('input', updateCreateDraft);
    if (captionInput) captionInput.addEventListener('input', updateCreateDraft);

    const updateFramePreviews = (url) => {
      selectedFrameDataUrl = url;
      if (liveCardFrame) liveCardFrame.src = url;
      if (rawFrame) rawFrame.src = url;
      updateCreateDraft();
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
          container.querySelectorAll('[data-preset]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          updateFramePreviews(PRESET_FRAMES[key]);
          this.showToast(isKm ? `បានជ្រើសរើសស៊ុម៖ ${key}` : `Selected preset: ${key}`);
        }
      });
    });

    // Form Submit
    document.getElementById('createCampaignForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      try { sessionStorage.removeItem('tra_create_draft'); } catch (err) {}
      this.isCreateFormDirty = false;

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
      <!-- Sleek Mobile Top Bar (Native App Style) -->
      <div class="designer-mobile-bar">
        <button class="btn-icon" onclick="window.location.hash='#explore'" title="${t('backToHome')}">
          ${Icons.chevronLeft}
        </button>
        <div class="designer-mobile-title">${t('designerTitle')}</div>
        <button class="btn-icon" id="btnTopDownloadFrame" title="Download PNG">
          ${Icons.download}
        </button>
      </div>

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
              <button type="button" class="color-swatch-btn" data-theme-name="transparent" style="background: repeating-conic-gradient(#cbd5e1 0% 25%, #ffffff 0% 50%) 50% / 8px 8px;" title="${isKm ? 'គ្មានផ្ទៃពណ៌ (ថ្លាសុទ្ធ/Overlay)' : 'Transparent (Overlay Only)'}"></button>
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
    this.designer = this.activeDesigner;

    // Synchronize UI inputs and chips with designer's restored settings
    const currentSettings = this.activeDesigner.settings;
    const headerInput = document.getElementById('designerHeaderInput');
    const footerInput = document.getElementById('designerFooterInput');
    if (headerInput && currentSettings.headerText) headerInput.value = currentSettings.headerText;
    if (footerInput && currentSettings.footerText) footerInput.value = currentSettings.footerText;

    if (currentSettings.shape) {
      container.querySelectorAll('[data-shape]').forEach(chip => {
        if (chip.getAttribute('data-shape') === currentSettings.shape) {
          chip.classList.add('active');
        } else {
          chip.classList.remove('active');
        }
      });
    }

    if (currentSettings.theme) {
      container.querySelectorAll('[data-theme-name]').forEach(chip => {
        if (chip.getAttribute('data-theme-name') === currentSettings.theme) {
          chip.classList.add('active');
        } else {
          chip.classList.remove('active');
        }
      });
    }

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
      this.activeDesigner.clearDirty();
      window._designerExportedFrame = this.activeDesigner.getTransparentPNGDataUrl();
      window.location.hash = '#create/designer';
    });

    // Download PNG
    const dlHandler = () => {
      this.activeDesigner.clearDirty();
      const dataUrl = this.activeDesigner.getTransparentPNGDataUrl();
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `custom-frame-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      this.showToast(t('downloadSuccess'), 'success');
    };

    document.getElementById('btnDownloadDesignerFrame').addEventListener('click', dlHandler);
    const topDl = document.getElementById('btnTopDownloadFrame');
    if (topDl) topDl.addEventListener('click', dlHandler);
  }

  // ==========================================
  // VIEW 5: MY CAMPAIGNS
  // ==========================================
  loadMyCampaignsView() {
    this.currentView = 'my-campaigns';
    const container = document.getElementById('appContent');

    // Ensure AuthService has restored current active user from storage
    if (typeof AuthService !== 'undefined' && !AuthService.currentUser) {
      try {
        const stored = localStorage.getItem("tra_active_user");
        if (stored) AuthService.currentUser = JSON.parse(stored);
      } catch (e) {}
    }

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

    // Sync authentic user campaigns from cloud in background
    if (typeof CampaignService.fetchUserCampaignsFromCloud === 'function' && !this._fetchingUserCampaigns) {
      this._fetchingUserCampaigns = true;
      CampaignService.fetchUserCampaignsFromCloud().then(cloudCampaigns => {
        this._fetchingUserCampaigns = false;
        if (cloudCampaigns && cloudCampaigns.length > 0) {
          const fresh = CampaignService.getUserCampaigns();
          if (fresh.length !== myCampaigns.length) {
            this.loadMyCampaignsView();
          }
        }
      }).catch(() => {
        this._fetchingUserCampaigns = false;
      });
    }

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

  // =========================================================
  // GLOBAL ANNOUNCEMENT BANNER
  // =========================================================
  renderGlobalAnnouncementBanner() {
    try {
      const bannerEl = document.getElementById('globalAnnouncementBar');
      if (typeof AdminService === 'undefined') return;
      const settings = AdminService.getSystemSettings();
      const isDismissed = sessionStorage.getItem('tra_announcement_dismissed') === 'true';

      if (!settings || !settings.announcementEnabled || isDismissed) {
        if (bannerEl) bannerEl.remove();
        return;
      }

      const isKm = typeof getLanguage === 'function' && getLanguage() === 'km';
      const text = (isKm ? settings.announcementTextKm : settings.announcementTextEn) || settings.announcementTextKm || '';
      if (!text.trim()) {
        if (bannerEl) bannerEl.remove();
        return;
      }

      const link = settings.announcementLink ? SecurityUtils.sanitizeUrl(settings.announcementLink) : '';
      const type = settings.announcementType || 'info';

      let container = bannerEl;
      if (!container) {
        container = document.createElement('div');
        container.id = 'globalAnnouncementBar';
        const navbar = document.querySelector('.navbar');
        if (navbar && navbar.parentNode) {
          navbar.parentNode.insertBefore(container, navbar);
        } else {
          document.body.prepend(container);
        }
      }

      container.className = `global-announcement-bar banner-type-${type}`;
      container.innerHTML = `
        <div class="announcement-content-wrap">
          <span class="announcement-icon-badge">📢</span>
          <span class="announcement-text-msg">${SecurityUtils.cleanText(text, 250)}</span>
          ${link ? `<a href="${link}" class="announcement-action-link">${isKm ? 'ស្វែងយល់បន្ថែម' : 'Learn More'} &rarr;</a>` : ''}
          <button class="announcement-close-btn" onclick="app.dismissAnnouncement()" title="Close">&times;</button>
        </div>
      `;
    } catch (e) {
      console.warn("Announcement banner notice:", e);
    }
  }

  dismissAnnouncement() {
    sessionStorage.setItem('tra_announcement_dismissed', 'true');
    const bannerEl = document.getElementById('globalAnnouncementBar');
    if (bannerEl) bannerEl.remove();
  }

  // =========================================================
  // VIEW 5: SUPER ADMIN DASHBOARD (MASTER CONTROL PANEL)
  // =========================================================
  async loadAdminView(subTab = null) {
    this.currentView = 'admin';
    const container = document.getElementById('appContent');
    const isKm = typeof getLanguage === 'function' && getLanguage() === 'km';

    // Multi-tier active tab resolution:
    // 1. Explicit parameter passed in (e.g. from hash route #admin/users)
    // 2. Parsed directly from window.location.hash (#admin/<tab>)
    // 3. Current in-memory this.adminActiveTab
    // 4. Stored in sessionStorage or localStorage (preserves tab across F5/browser refresh)
    // 5. Fallback to 'overview'
    let targetTab = subTab;
    if (!targetTab) {
      const hashParts = (window.location.hash || '').slice(1).split('/');
      if (hashParts[0] === 'admin' && hashParts[1]) {
        targetTab = hashParts[1];
      }
    }
    if (!targetTab && this.adminActiveTab) {
      targetTab = this.adminActiveTab;
    }
    if (!targetTab) {
      try {
        targetTab = sessionStorage.getItem('tra_admin_active_tab') || localStorage.getItem('tra_admin_active_tab');
      } catch (e) {}
    }

    const validTabs = ['overview', 'campaigns', 'users', 'settings', 'backup'];
    if (!targetTab || !validTabs.includes(targetTab)) {
      targetTab = 'overview';
    }

    this.adminActiveTab = targetTab;
    try {
      sessionStorage.setItem('tra_admin_active_tab', targetTab);
      localStorage.setItem('tra_admin_active_tab', targetTab);
      const targetHash = '#admin/' + targetTab;
      if (window.location.hash !== targetHash) {
        history.replaceState(null, '', targetHash);
        this.currentRouteHash = targetHash;
        localStorage.setItem('tra_last_active_route', targetHash);
      }
    } catch (e) {}

    const user = AuthService ? AuthService.currentUser : null;

    // 1. Auth Guard: Check if logged in
    if (!user) {
      container.innerHTML = `
        <div class="container section" style="max-width: 580px; margin: 3rem auto;">
          <div class="admin-auth-gate-card">
            <div class="admin-auth-gate-icon">🔐</div>
            <h2 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem;">${t('adminDashboard')}</h2>
            <p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 1.5rem;">
              ${isKm ? 'សូមចូលគណនីជា Super Admin ដើម្បីគ្រប់គ្រងគេហទំព័រ Tra Frames ទាំងមូល។' : 'Please log in with an authorized Super Admin account to access this management dashboard.'}
            </p>
            <button class="btn btn-primary" onclick="app.openAuthModal(() => app.loadAdminView())" style="padding: 0.75rem 1.75rem; font-size: 1rem;">
              ${Icons.logIn} <span>${t('signIn')}</span>
            </button>
          </div>
        </div>
      `;
      return;
    }

    // 2. Role Guard: Check if Super Admin
    if (!AdminService.isSuperAdmin(user)) {
      container.innerHTML = `
        <div class="container section" style="max-width: 620px; margin: 3rem auto;">
          <div class="admin-denied-card">
            <div class="admin-denied-icon">🚫</div>
            <h2 style="font-size: 1.45rem; font-weight: 800; color: #ef4444; margin-bottom: 0.5rem;">${t('adminAccessDeniedTitle')}</h2>
            <p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 1.25rem;">
              ${t('adminAccessDeniedDesc')}
            </p>
            <div class="admin-logged-info">
              <span>${t('adminLoggedInAs')} <strong>${SecurityUtils.escapeHtml(user.email)}</strong></span>
            </div>
            <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 1.5rem; flex-wrap: wrap;">
              <button class="btn btn-primary" onclick="app.navigateTo('explore')">
                ${Icons.compass || '🧭'} <span>${t('adminReturnHome')}</span>
              </button>
              <button class="btn btn-outline" onclick="app.handleSignOut()">
                ${Icons.logOut} <span>${t('signOut')}</span>
              </button>
            </div>
          </div>
        </div>
      `;
      return;
    }

    // 3. Render Loading Placeholder while fetching comprehensive data
    container.innerHTML = `
      <div class="container section" style="padding: 3rem 1rem; text-align: center;">
        <div class="loading-spinner" style="margin: 0 auto 1rem auto;"></div>
        <h3 style="font-weight: 700; color: var(--text-primary);">${isKm ? 'កំពុងទាញយកទិន្នន័យ Admin ពី Cloud Firestore...' : 'Loading Super Admin platform data from Cloud Firestore...'}</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem;">${isKm ? 'សូមរង់ចាំបន្តិច...' : 'Please wait a moment...'}</p>
      </div>
    `;

    // 4. Fetch All Platform Data concurrently
    try {
      const [campaigns, users] = await Promise.all([
        AdminService.fetchAllCampaignsAdmin(),
        AdminService.fetchUsersList()
      ]);
      const metrics = AdminService.getPlatformMetrics(campaigns, users);
      const settings = AdminService.getSystemSettings();

      this.adminData = { campaigns, users, metrics, settings };
      this.renderAdminMainLayout(container, isKm, user);
    } catch (err) {
      console.error("Failed to load admin data:", err);
      container.innerHTML = `
        <div class="container section" style="text-align: center; padding: 3rem 1rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
          <h3 style="color: #ef4444;">Error Loading Admin Dashboard</h3>
          <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">${SecurityUtils.escapeHtml(err.message)}</p>
          <button class="btn btn-primary" onclick="app.loadAdminView()">🔄 Retry</button>
        </div>
      `;
    }
  }

  renderAdminMainLayout(container, isKm, user) {
    const { campaigns, users, metrics, settings } = this.adminData;
    const activeTab = this.adminActiveTab || 'overview';

    container.innerHTML = `
      <div class="admin-wrapper container">
        <!-- Top Admin Banner Header -->
        <div class="admin-top-banner">
          <div class="admin-banner-left">
            <div class="admin-badge-pill">
              <span class="admin-pulse-dot"></span>
              <span>SUPER ADMIN PLATFORM CONTROL</span>
            </div>
            <h1 class="admin-main-title">👑 ${t('adminDashboard')}</h1>
            <p class="admin-main-subtitle">${t('adminSubtitle')}</p>
            <div class="admin-user-tag">
              <span>👤 ${SecurityUtils.escapeHtml(user.email)}</span>
              <span class="admin-tag-role">MASTER ADMIN</span>
            </div>
          </div>
          <div class="admin-banner-actions">
            <button class="btn btn-primary" onclick="app.openAdminCreateModal()">
              ${Icons.plus} <span>${t('adminCreateNew')}</span>
            </button>
            <button class="btn btn-outline" onclick="app.handleAdminExportBackup()" title="Download Backup">
              ${Icons.download} <span>Backup (.json)</span>
            </button>
            <button class="btn btn-secondary" onclick="app.loadAdminView()" title="Refresh Data">
              🔄 <span>${t('adminRefreshData')}</span>
            </button>
          </div>
        </div>

        <!-- Admin Navigation Tabs -->
        <div class="admin-nav-tabs">
          <button class="admin-tab-item ${activeTab === 'overview' ? 'active' : ''}" onclick="app.switchAdminTab('overview')">
            <span class="admin-tab-icon">📊</span>
            <span>${t('adminOverview')}</span>
          </button>
          <button class="admin-tab-item ${activeTab === 'campaigns' ? 'active' : ''}" onclick="app.switchAdminTab('campaigns')">
            <span class="admin-tab-icon">🖼️</span>
            <span>${t('adminCampaigns')}</span>
            <span class="admin-tab-counter">${campaigns.length}</span>
          </button>
          <button class="admin-tab-item ${activeTab === 'users' ? 'active' : ''}" onclick="app.switchAdminTab('users')">
            <span class="admin-tab-icon">👥</span>
            <span>${t('adminUsers')}</span>
            <span class="admin-tab-counter">${users.length}</span>
          </button>
          <button class="admin-tab-item ${activeTab === 'settings' ? 'active' : ''}" onclick="app.switchAdminTab('settings')">
            <span class="admin-tab-icon">📢</span>
            <span>${t('adminSettings')}</span>
          </button>
          <button class="admin-tab-item ${activeTab === 'backup' ? 'active' : ''}" onclick="app.switchAdminTab('backup')">
            <span class="admin-tab-icon">💾</span>
            <span>${t('adminBackup')}</span>
          </button>
        </div>

        <!-- Tab Content Container -->
        <div class="admin-tab-content-wrap" id="adminTabContentWrap">
          ${this.getAdminTabHtml(activeTab, isKm)}
        </div>
      </div>
    `;

    // Attach Tab-specific listeners
    this.initAdminTabListeners(activeTab, isKm);
  }

  switchAdminTab(tabName) {
    const validTabs = ['overview', 'campaigns', 'users', 'settings', 'backup'];
    if (!validTabs.includes(tabName)) tabName = 'overview';

    this.adminActiveTab = tabName;
    const isKm = typeof getLanguage === 'function' && getLanguage() === 'km';

    // Persist active tab across browser refresh and reload
    try {
      sessionStorage.setItem('tra_admin_active_tab', tabName);
      localStorage.setItem('tra_admin_active_tab', tabName);
      const targetHash = '#admin/' + tabName;
      if (window.location.hash !== targetHash) {
        history.replaceState(null, '', targetHash);
        this.currentRouteHash = targetHash;
        localStorage.setItem('tra_last_active_route', targetHash);
      }
    } catch (e) {}
    
    // Update tab active classes
    document.querySelectorAll('.admin-tab-item').forEach(btn => {
      btn.classList.remove('active');
    });
    const clickedBtn = Array.from(document.querySelectorAll('.admin-tab-item')).find(b => b.onclick && b.onclick.toString().includes(tabName));
    if (clickedBtn) clickedBtn.classList.add('active');

    const contentWrap = document.getElementById('adminTabContentWrap');
    if (contentWrap) {
      contentWrap.innerHTML = this.getAdminTabHtml(tabName, isKm);
      this.initAdminTabListeners(tabName, isKm);
    }
  }

  getAdminTabHtml(tabName, isKm) {
    const { campaigns, users, metrics, settings } = this.adminData;
    switch (tabName) {
      case 'campaigns':
        return this.renderAdminCampaignsTab(campaigns, isKm);
      case 'users':
        return this.renderAdminUsersTab(users, isKm);
      case 'settings':
        return this.renderAdminSettingsTab(settings, isKm);
      case 'backup':
        return this.renderAdminBackupTab(isKm);
      case 'overview':
      default:
        return this.renderAdminOverviewTab(campaigns, users, metrics, isKm);
    }
  }

  // =========================================================
  // TAB 1: OVERVIEW & ANALYTICS
  // =========================================================
  renderAdminOverviewTab(campaigns, users, metrics, isKm) {
    const cloudCount = campaigns.filter(c => c._source === 'cloud').length;
    const localCount = campaigns.filter(c => c._source === 'local').length;
    const presetCount = campaigns.filter(c => c._source === 'preset' || c.isPreset).length;
    const verifiedUsersCount = users.filter(u => u.verified).length;

    const catKey = 'cat' + (metrics.topCategory ? (metrics.topCategory[0].toUpperCase() + metrics.topCategory.slice(1)) : 'Celebration');
    const topCatName = t(catKey) || metrics.topCategory;

    return `
      <!-- KPI Stats Grid -->
      <div class="admin-kpi-grid">
        <div class="admin-kpi-card card-kpi-blue">
          <div class="admin-kpi-header">
            <span class="admin-kpi-title">${t('adminTotalCampaigns')}</span>
            <span class="admin-kpi-icon">🖼️</span>
          </div>
          <div class="admin-kpi-value">${metrics.totalCampaigns}</div>
          <div class="admin-kpi-subtext">
            <span>Cloud: <strong>${cloudCount}</strong></span> • <span>Local: <strong>${localCount}</strong></span> • <span>Preset: <strong>${presetCount}</strong></span>
          </div>
        </div>

        <div class="admin-kpi-card card-kpi-cyan">
          <div class="admin-kpi-header">
            <span class="admin-kpi-title">${t('adminTotalSupporters')}</span>
            <span class="admin-kpi-icon">👥</span>
          </div>
          <div class="admin-kpi-value">${metrics.totalSupporters.toLocaleString()}</div>
          <div class="admin-kpi-subtext">
            ${isKm ? 'ការចូលរួមបង្កើតរូបថតគាំទ្រសរុប' : 'Total frame generation interactions'}
          </div>
        </div>

        <div class="admin-kpi-card card-kpi-indigo">
          <div class="admin-kpi-header">
            <span class="admin-kpi-title">${t('adminTotalUsers')}</span>
            <span class="admin-kpi-icon">👤</span>
          </div>
          <div class="admin-kpi-value">${metrics.totalUsers}</div>
          <div class="admin-kpi-subtext">
            <span>✅ ${isKm ? 'បានផ្ទៀងផ្ទាត់' : 'Verified'}: <strong>${verifiedUsersCount}</strong></span>
          </div>
        </div>

        <div class="admin-kpi-card card-kpi-purple">
          <div class="admin-kpi-header">
            <span class="admin-kpi-title">${t('adminTopCategory')}</span>
            <span class="admin-kpi-icon">🌟</span>
          </div>
          <div class="admin-kpi-value" style="font-size: 1.5rem; text-transform: capitalize;">${topCatName}</div>
          <div class="admin-kpi-subtext">
            ${isKm ? 'ប្រភេទដែលមានសកម្មភាពច្រើនជាងគេ' : 'Highest engagement category'}
          </div>
        </div>
      </div>

      <!-- Two-Column Analytics Layout -->
      <div class="admin-analytics-row">
        <!-- Left: Category Distribution Chart -->
        <div class="admin-card admin-chart-card">
          <div class="admin-card-header">
            <h3 class="admin-card-title">📊 ${t('adminCategoryDistribution')}</h3>
          </div>
          <div class="admin-cat-bars-list">
            ${Object.entries(metrics.categoryCounts).map(([cat, count]) => {
              const catLabel = t('cat' + cat[0].toUpperCase() + cat.slice(1)) || cat;
              const pct = metrics.totalCampaigns > 0 ? Math.round((count / metrics.totalCampaigns) * 100) : 0;
              return `
                <div class="admin-cat-bar-item">
                  <div class="admin-cat-bar-label">
                    <span>${catLabel}</span>
                    <span class="admin-cat-bar-count"><strong>${count}</strong> (${pct}%)</span>
                  </div>
                  <div class="admin-progress-track">
                    <div class="admin-progress-fill cat-color-${cat}" style="width: ${Math.max(4, pct)}%;"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Right: Top 5 Most Popular Campaigns -->
        <div class="admin-card admin-top-list-card">
          <div class="admin-card-header">
            <h3 class="admin-card-title">🔥 ${t('adminTopCampaigns')}</h3>
          </div>
          <div class="admin-top-campaigns-list">
            ${metrics.topCampaigns.length === 0 ? `
              <div style="padding: 1.5rem; text-align: center; color: var(--text-muted);">No campaigns yet.</div>
            ` : metrics.topCampaigns.map((c, index) => {
              const title = (isKm ? c.titleKm : c.titleEn) || c.titleKm || c.titleEn || 'Untitled';
              const supporters = (parseInt(c.supporters, 10) || 0).toLocaleString();
              const slug = c.slug || c.id;
              const frameUrl = SecurityUtils.sanitizeUrl(c.frameUrl);
              return `
                <div class="admin-top-camp-item">
                  <div class="admin-top-rank rank-${index + 1}">#${index + 1}</div>
                  <div class="admin-top-thumb-wrap">
                    <img src="${SAMPLE_AVATARS[0]}" class="admin-thumb-bg" />
                    <img src="${frameUrl}" class="admin-thumb-frame" />
                  </div>
                  <div class="admin-top-info">
                    <a href="#campaign/${slug}" class="admin-top-name">${SecurityUtils.cleanText(title, 45)}</a>
                    <span class="admin-top-sub">👥 ${supporters} ${t('supporters')}</span>
                  </div>
                  <button class="btn btn-secondary btn-sm" onclick="app.navigateTo('campaign/${slug}')">
                    ${Icons.camera}
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- Recent Platform Activity / Campaigns -->
      <div class="admin-card" style="margin-top: 1.5rem;">
        <div class="admin-card-header" style="display: flex; justify-content: space-between; align-items: center;">
          <h3 class="admin-card-title">⏱️ ${t('adminRecentCampaigns')}</h3>
          <button class="btn btn-outline btn-sm" onclick="app.switchAdminTab('campaigns')">
            ${isKm ? 'មើលទាំងអស់' : 'View All'} &rarr;
          </button>
        </div>
        <div class="admin-recent-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>${isKm ? 'ស៊ុម' : 'Frame'}</th>
                <th>${isKm ? 'ចំណងជើង' : 'Title'}</th>
                <th>${isKm ? 'ប្រភេទ' : 'Category'}</th>
                <th>${isKm ? 'អ្នកបង្កើត' : 'Creator'}</th>
                <th>${isKm ? 'អ្នកគាំទ្រ' : 'Supporters'}</th>
                <th>${isKm ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
                <th>${isKm ? 'សកម្មភាព' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              ${metrics.recentCampaigns.map(c => {
                const title = (isKm ? c.titleKm : c.titleEn) || c.titleKm || c.titleEn || 'Untitled';
                const catLabel = t('cat' + (c.category ? c.category[0].toUpperCase() + c.category.slice(1) : 'Celebration')) || c.category;
                const slug = c.slug || c.id;
                const date = (c.createdAt || '').split('T')[0] || '2026';
                const supporters = (parseInt(c.supporters, 10) || 0).toLocaleString();
                const frameUrl = SecurityUtils.sanitizeUrl(c.frameUrl);
                return `
                  <tr>
                    <td>
                      <div class="admin-mini-thumb">
                        <img src="${SAMPLE_AVATARS[0]}" class="admin-thumb-bg" />
                        <img src="${frameUrl}" class="admin-thumb-frame" />
                      </div>
                    </td>
                    <td>
                      <strong>${SecurityUtils.cleanText(title, 40)}</strong>
                      <div style="font-size: 0.75rem; color: var(--text-muted); font-family: monospace;">/${SecurityUtils.escapeHtml(slug)}</div>
                    </td>
                    <td><span class="admin-cat-badge cat-color-${c.category || 'celebration'}">${catLabel}</span></td>
                    <td>${SecurityUtils.cleanText(c.creator || c.creatorEmail || 'Admin', 25)}</td>
                    <td><strong>${supporters}</strong></td>
                    <td>${date}</td>
                    <td>
                      <div style="display: flex; gap: 0.35rem;">
                        <button class="btn btn-secondary btn-sm" onclick="app.navigateTo('campaign/${slug}')" title="View">👁️</button>
                        <button class="btn btn-outline btn-sm" onclick="app.openAdminEditCampaignModal('${c.slug || c.id || c._docId}')" title="Edit">✏️</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // =========================================================
  // TAB 2: CAMPAIGNS MANAGEMENT (FULL CRUD)
  // =========================================================
  renderAdminCampaignsTab(campaigns, isKm) {
    return `
      <div class="admin-card">
        <!-- Filter and Search Toolbar -->
        <div class="admin-toolbar">
          <div class="admin-search-wrap">
            <span class="admin-search-icon">${Icons.search}</span>
            <input type="text" id="adminCampSearchInput" class="form-input admin-search-input" placeholder="${t('adminSearchPlaceholder')}" />
          </div>

          <div class="admin-filters-wrap">
            <select id="adminCampCatSelect" class="form-select admin-filter-select">
              <option value="all">${t('adminFilterCategory')}</option>
              <option value="education">${t('catEducation')}</option>
              <option value="culture">${t('catCulture')}</option>
              <option value="charity">${t('catCharity')}</option>
              <option value="sports">${t('catSports')}</option>
              <option value="tech">${t('catTech')}</option>
              <option value="celebration">${t('catCelebration')}</option>
            </select>

            <select id="adminCampSourceSelect" class="form-select admin-filter-select">
              <option value="all">${t('adminAllSources')}</option>
              <option value="cloud">${t('adminSourceCloud')}</option>
              <option value="local">${t('adminSourceLocal')}</option>
              <option value="preset">${t('adminSourcePreset')}</option>
            </select>

            <button class="btn btn-primary" onclick="app.openAdminCreateModal()">
              ${Icons.plus} <span>${t('adminCreateNew')}</span>
            </button>
          </div>
        </div>

        <!-- Batch Actions Toolbar -->
        <div id="adminBatchBar" class="admin-batch-bar" style="display: none;">
          <div class="admin-batch-bar-left">
            <span class="admin-batch-badge" id="adminBatchCountBadge">0</span>
            <span class="admin-batch-text" id="adminBatchCountText">${t('adminSelectedCount').replace('{count}', '0')}</span>
          </div>
          <div class="admin-batch-bar-actions">
            <button class="btn btn-sm btn-batch-delete" onclick="app.handleAdminBatchDelete()" title="${t('adminBatchDelete')}">
              ${Icons.trash || '🗑️'} <span>${t('adminBatchDelete')}</span>
            </button>
            <button class="btn btn-sm btn-batch-export" onclick="app.handleAdminBatchExport()" title="${t('adminBatchExport')}">
              ${Icons.download || '📦'} <span>${t('adminBatchExport')}</span>
            </button>
            <button class="btn btn-sm btn-batch-cat" onclick="app.openAdminBatchCategoryModal()" title="${t('adminBatchChangeCategory')}">
              🏷️ <span>${t('adminBatchChangeCategory')}</span>
            </button>
            <button class="btn btn-sm btn-batch-close" onclick="app.handleAdminDeselectAll()" title="${t('adminDeselectAll')}">
              ${t('adminDeselectAll')}
            </button>
          </div>
        </div>

        <!-- Table Summary Counter -->
        <div class="admin-table-meta-bar">
          <span id="adminTableCountLabel">${isKm ? `បង្ហាញយុទ្ធនាការសរុបចំនួន ${campaigns.length}` : `Showing all ${campaigns.length} campaigns`}</span>
        </div>

        <!-- Campaigns Data Table Container -->
        <div class="admin-table-responsive" id="adminCampTableContainer">
          ${this.buildCampaignsTableHtml(campaigns, isKm)}
        </div>
      </div>
    `;
  }

  buildCampaignsTableHtml(campaigns, isKm) {
    if (!campaigns || campaigns.length === 0) {
      return `
        <div style="padding: 3rem 1rem; text-align: center; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
          <p>${isKm ? 'មិនមានយុទ្ធនាការដែលត្រូវនឹងការស្វែងរកទេ' : 'No campaigns matched your search criteria.'}</p>
        </div>
      `;
    }

    return `
      <table class="admin-table">
        <thead>
          <tr>
            <th style="width: 44px; text-align: center;">
              <input type="checkbox" id="adminMasterCb" class="admin-checkbox" onchange="app.handleAdminMasterCheckboxToggle(this.checked)" title="${t('adminSelectAll')}" />
            </th>
            <th style="width: 54px;">${isKm ? 'ស៊ុម' : 'Frame'}</th>
            <th>${isKm ? 'ព័ត៌មានយុទ្ធនាការ (Title & Slug)' : 'Campaign (Title & Slug)'}</th>
            <th>${isKm ? 'ប្រភេទ' : 'Category'}</th>
            <th>${isKm ? 'អ្នកបង្កើត (Creator)' : 'Creator'}</th>
            <th style="text-align: right;">${isKm ? 'អ្នកគាំទ្រ' : 'Supporters'}</th>
            <th>${isKm ? 'ប្រភព' : 'Source'}</th>
            <th>${isKm ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
            <th style="text-align: center; width: 130px;">${isKm ? 'សកម្មភាព' : 'Actions'}</th>
          </tr>
        </thead>
        <tbody>
          ${campaigns.map(c => {
            const titleKm = c.titleKm || '';
            const titleEn = c.titleEn || '';
            const displayTitle = (isKm ? titleKm : titleEn) || titleKm || titleEn || 'Untitled';
            const catLabel = t('cat' + (c.category ? c.category[0].toUpperCase() + c.category.slice(1) : 'Celebration')) || c.category;
            const slug = c.slug || c.id;
            const supporters = (parseInt(c.supporters, 10) || 0).toLocaleString();
            const date = (c.createdAt || '').split('T')[0] || '2026';
            const frameUrl = SecurityUtils.sanitizeUrl(c.frameUrl);
            const source = c._source || (c.isPreset ? 'preset' : 'cloud');
            const campKey = c.slug || c.id || c._docId;
            const safeCampId = SecurityUtils.escapeHtml(campKey);
            const safeTitleEscaped = SecurityUtils.escapeHtml(displayTitle).replace(/'/g, "\\'");
            const isSelected = this.adminSelectedCampaigns && this.adminSelectedCampaigns.has(campKey);

            let sourceBadge = `<span class="badge-source badge-cloud">Cloud</span>`;
            if (source === 'local') sourceBadge = `<span class="badge-source badge-local">Local</span>`;
            if (source === 'preset') sourceBadge = `<span class="badge-source badge-preset">Preset</span>`;

            return `
              <tr id="adminRow_${safeCampId}" class="${isSelected ? 'admin-row-selected' : ''}">
                <td style="text-align: center; width: 44px;">
                  <input type="checkbox" class="admin-checkbox admin-camp-cb" data-key="${safeCampId}" ${isSelected ? 'checked' : ''} onchange="app.handleAdminRowCheckboxToggle('${safeCampId}', this.checked)" />
                </td>
                <td>
                  <div class="admin-table-thumb" onclick="app.navigateTo('campaign/${slug}')" title="Click to view">
                    <img src="${SAMPLE_AVATARS[0]}" class="admin-thumb-bg" />
                    <img src="${frameUrl}" class="admin-thumb-frame" />
                  </div>
                </td>
                <td>
                  <div class="admin-camp-cell-title">
                    <a href="#campaign/${slug}" class="admin-link-title" title="${SecurityUtils.escapeHtml(displayTitle)}">
                      ${SecurityUtils.cleanText(displayTitle, 50)}
                    </a>
                    <div class="admin-slug-tag">/${SecurityUtils.escapeHtml(slug)}</div>
                  </div>
                </td>
                <td>
                  <span class="admin-cat-badge cat-color-${c.category || 'celebration'}">${catLabel}</span>
                </td>
                <td>
                  <div class="admin-creator-cell">
                    <span class="admin-creator-name">${SecurityUtils.cleanText(c.creator || 'Admin', 30)}</span>
                    <span class="admin-creator-email">${SecurityUtils.escapeHtml(c.creatorEmail || '')}</span>
                  </div>
                </td>
                <td style="text-align: right;">
                  <span class="admin-supporter-pill">${supporters}</span>
                </td>
                <td>${sourceBadge}</td>
                <td style="font-size: 0.82rem; color: var(--text-muted);">${date}</td>
                <td>
                  <div class="admin-actions-group">
                    <button class="btn-action-icon btn-action-view" onclick="app.navigateTo('campaign/${slug}')" title="${isKm ? 'មើលស៊ុម' : 'Preview'}">
                      👁️
                    </button>
                    <button class="btn-action-icon btn-action-edit" onclick="app.openAdminEditCampaignModal('${safeCampId}')" title="${isKm ? 'កែប្រែ' : 'Edit'}">
                      ✏️
                    </button>
                    <button class="btn-action-icon btn-action-delete" onclick="app.handleAdminDeleteCampaign('${safeCampId}', '${safeTitleEscaped}')" title="${isKm ? 'លុប' : 'Delete'}">
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  // =========================================================
  // TAB 3: USER MANAGEMENT
  // =========================================================
  renderAdminUsersTab(users, isKm) {
    return `
      <div class="admin-card">
        <div class="admin-toolbar">
          <div class="admin-search-wrap">
            <span class="admin-search-icon">${Icons.search}</span>
            <input type="text" id="adminUserSearchInput" class="form-input admin-search-input" placeholder="${isKm ? 'ស្វែងរកតាម Email, ឈ្មោះ, ឬ UID...' : 'Search by email, name, or UID...'}" />
          </div>
          <div class="admin-filters-wrap">
            <button class="btn btn-secondary" onclick="app.loadAdminView('users')">
              🔄 <span>${isKm ? 'ផ្ទុកទិន្នន័យឡើងវិញ' : 'Refresh Users'}</span>
            </button>
          </div>
        </div>

        <div class="admin-table-meta-bar">
          <span id="adminUserCountLabel">${isKm ? `អ្នកប្រើប្រាស់សរុបចំនួន ${users.length} នាក់` : `Total registered accounts: ${users.length}`}</span>
        </div>

        <div class="admin-table-responsive" id="adminUserTableContainer">
          ${this.buildUsersTableHtml(users, isKm)}
        </div>
      </div>
    `;
  }

  buildUsersTableHtml(users, isKm) {
    if (!users || users.length === 0) {
      return `
        <div style="padding: 3rem 1rem; text-align: center; color: var(--text-muted);">
          No users found.
        </div>
      `;
    }

    return `
      <table class="admin-table">
        <thead>
          <tr>
            <th>${isKm ? 'អ្នកប្រើប្រាស់' : 'User'}</th>
            <th>${isKm ? 'អ៊ីមែល (Email)' : 'Email'}</th>
            <th>UID</th>
            <th>${isKm ? 'តួនាទី (Role)' : 'Role'}</th>
            <th>${isKm ? 'ស្ថានភាព OTP' : 'Verification Status'}</th>
            <th style="text-align: center;">${isKm ? 'យុទ្ធនាការដែលបានបង្កើត' : 'Campaigns'}</th>
            <th style="text-align: center; width: 140px;">${isKm ? 'សកម្មភាព' : 'Action'}</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => {
            const initial = SecurityUtils.cleanText(((u.displayName || u.email || 'U')[0] || 'U').toUpperCase(), 1);
            const isVerified = !!u.verified;
            const isSuper = !!u.isSuperAdmin;
            const safeEmail = SecurityUtils.escapeHtml(u.email);

            return `
              <tr>
                <td>
                  <div style="display: flex; align-items: center; gap: 0.65rem;">
                    <div class="admin-user-avatar-placeholder">${initial}</div>
                    <strong style="color: var(--text-primary); font-size: 0.9rem;">${SecurityUtils.cleanText(u.displayName || u.email.split('@')[0], 30)}</strong>
                  </div>
                </td>
                <td><a href="mailto:${safeEmail}" style="color: var(--accent-primary); font-size: 0.88rem;">${safeEmail}</a></td>
                <td style="font-family: monospace; font-size: 0.78rem; color: var(--text-muted);">${SecurityUtils.cleanText(u.uid, 20)}</td>
                <td>
                  ${isSuper 
                    ? `<span class="badge-role badge-role-super">👑 Super Admin</span>` 
                    : `<span class="badge-role badge-role-member">👤 ${t('adminRoleUser')}</span>`
                  }
                </td>
                <td>
                  ${isVerified
                    ? `<span class="badge-verify badge-verify-yes">✅ ${t('adminUserVerified')}</span>`
                    : `<span class="badge-verify badge-verify-no">⚠️ ${t('adminUserUnverified')}</span>`
                  }
                </td>
                <td style="text-align: center;">
                  <span class="admin-camp-count-badge">${u.campaignCount || 0}</span>
                </td>
                <td style="text-align: center;">
                  <button class="btn btn-sm ${isVerified ? 'btn-outline' : 'btn-primary'}" onclick="app.handleAdminToggleVerifyUser('${u.email}', ${isVerified})">
                    ${isVerified ? 'បិទ OTP' : '✅ ផ្ទៀងផ្ទាត់'}
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  // =========================================================
  // TAB 4: SITE SETTINGS & ANNOUNCEMENTS
  // =========================================================
  renderAdminSettingsTab(settings, isKm) {
    const isEnabled = settings && settings.announcementEnabled;
    const type = (settings && settings.announcementType) || 'info';

    return `
      <div class="admin-settings-layout">
        <!-- Announcement Banner Setting Card -->
        <div class="admin-card">
          <div class="admin-card-header">
            <h3 class="admin-card-title">📢 ${t('adminAnnouncementBanner')}</h3>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.25rem;">
              ${isKm ? 'បង្ហាញសារប្រកាសព័ត៌មានបន្ទាន់ ឬកម្មវិធីពិសេសនៅលើកំពូលគេហទំព័រ Tra Frames ទាំងមូល' : 'Display a global announcement alert banner across the top of all pages.'}
            </p>
          </div>

          <form id="adminSettingsForm" onsubmit="event.preventDefault(); app.handleAdminSaveSettings();">
            <div class="form-group">
              <label class="admin-switch-wrap">
                <input type="checkbox" id="settingAnnouncementEnable" ${isEnabled ? 'checked' : ''} onchange="app.updateBannerPreview()" />
                <span class="admin-switch-slider"></span>
                <span class="admin-switch-label"><strong>${t('adminBannerEnable')}</strong></span>
              </label>
            </div>

            <div class="form-group">
              <label class="form-label">${t('adminBannerTextKm')}</label>
              <textarea id="settingAnnouncementKm" class="form-textarea" rows="2" placeholder="សរសេរសារប្រកាសជាភាសាខ្មែរ..." oninput="app.updateBannerPreview()">${SecurityUtils.escapeHtml(settings.announcementTextKm || '')}</textarea>
            </div>

            <div class="form-group">
              <label class="form-label">${t('adminBannerTextEn')}</label>
              <textarea id="settingAnnouncementEn" class="form-textarea" rows="2" placeholder="Write announcement message in English..." oninput="app.updateBannerPreview()">${SecurityUtils.escapeHtml(settings.announcementTextEn || '')}</textarea>
            </div>

            <div class="admin-form-grid-2">
              <div class="form-group">
                <label class="form-label">${t('adminBannerLink')}</label>
                <input type="text" id="settingAnnouncementLink" class="form-input" placeholder="#explore ឬតំណភ្ជាប់ URL..." value="${SecurityUtils.escapeHtml(settings.announcementLink || '')}" oninput="app.updateBannerPreview()" />
              </div>

              <div class="form-group">
                <label class="form-label">${t('adminBannerType')}</label>
                <select id="settingAnnouncementType" class="form-select" onchange="app.updateBannerPreview()">
                  <option value="info" ${type === 'info' ? 'selected' : ''}>${t('adminBannerTypeInfo')}</option>
                  <option value="success" ${type === 'success' ? 'selected' : ''}>${t('adminBannerTypeSuccess')}</option>
                  <option value="warning" ${type === 'warning' ? 'selected' : ''}>${t('adminBannerTypeWarning')}</option>
                </select>
              </div>
            </div>

            <!-- Live Banner Preview -->
            <div style="margin: 1.25rem 0;">
              <label class="form-label" style="margin-bottom: 0.5rem;">👁️ ${t('adminBannerPreview')}:</label>
              <div id="adminLiveBannerPreviewBox" class="global-announcement-bar banner-type-${type}">
                <div class="announcement-content-wrap">
                  <span class="announcement-icon-badge">📢</span>
                  <span class="announcement-text-msg" id="previewMsgText">${isKm ? (settings.announcementTextKm || 'សារគំរូ') : (settings.announcementTextEn || 'Sample Message')}</span>
                  <span class="announcement-action-link">&rarr;</span>
                </div>
              </div>
            </div>

            <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end;">
              <button type="submit" class="btn btn-primary" id="btnSaveAdminSettings">
                ${Icons.check} <span>${t('adminSaveSettings')}</span>
              </button>
            </div>
          </form>
        </div>

        <!-- Maintenance Mode Card -->
        <div class="admin-card" style="margin-top: 1.5rem;">
          <div class="admin-card-header">
            <h3 class="admin-card-title">🛠️ ${t('adminMaintenanceMode')}</h3>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.25rem;">
              ${isKm ? 'បើកដំណើរការពេលត្រូវការកែលម្អប្រព័ន្ធ ឬរៀបចំទិន្នន័យឡើងវិញ' : 'Temporarily display maintenance notification to regular visitors.'}
            </p>
          </div>
          <label class="admin-switch-wrap" style="margin-top: 0.5rem;">
            <input type="checkbox" id="settingMaintenanceMode" ${settings && settings.maintenanceMode ? 'checked' : ''} onchange="app.handleAdminSaveSettings()" />
            <span class="admin-switch-slider"></span>
            <span class="admin-switch-label"><strong>${isKm ? 'បើកដំណើរការ Maintenance Mode' : 'Enable Maintenance Mode'}</strong></span>
          </label>
        </div>
      </div>
    `;
  }

  updateBannerPreview() {
    const isKm = typeof getLanguage === 'function' && getLanguage() === 'km';
    const textKm = document.getElementById('settingAnnouncementKm')?.value || '';
    const textEn = document.getElementById('settingAnnouncementEn')?.value || '';
    const type = document.getElementById('settingAnnouncementType')?.value || 'info';
    const previewBox = document.getElementById('adminLiveBannerPreviewBox');
    const msgText = document.getElementById('previewMsgText');

    if (previewBox) {
      previewBox.className = `global-announcement-bar banner-type-${type}`;
    }
    if (msgText) {
      msgText.textContent = (isKm ? textKm : textEn) || textKm || textEn || 'Sample Preview Message';
    }
  }

  // =========================================================
  // TAB 5: BACKUP & DATA TOOLS
  // =========================================================
  renderAdminBackupTab(isKm) {
    return `
      <div class="admin-backup-grid">
        <!-- 1-Click Backup Card -->
        <div class="admin-card">
          <div style="font-size: 2.2rem; margin-bottom: 0.75rem;">📥</div>
          <h3 style="font-size: 1.25rem; font-weight: 800; margin-bottom: 0.5rem;">${t('adminExportBackup')}</h3>
          <p style="color: var(--text-secondary); line-height: 1.6; font-size: 0.9rem; margin-bottom: 1.5rem;">
            ${isKm 
              ? 'ទាញយកទិន្នន័យយុទ្ធនាការស៊ុមទាំងអស់ រួមទាំងបញ្ជីអ្នកប្រើប្រាស់ និងការកំណត់ប្រព័ន្ធ មកទុកលើកុំព្យូទ័រជាឯកសារ .json ដោយសុវត្ថិភាព។' 
              : 'Download complete snapshot of all campaigns, users metadata, and platform settings as a standalone .json backup file.'}
          </p>
          <button class="btn btn-primary" onclick="app.handleAdminExportBackup()" style="width: 100%;">
            ${Icons.download} <span>${isKm ? 'ទាញយក JSON Backup ឥឡូវនេះ' : 'Download JSON Backup'}</span>
          </button>
        </div>

        <!-- Restore Backup Card -->
        <div class="admin-card">
          <div style="font-size: 2.2rem; margin-bottom: 0.75rem;">📤</div>
          <h3 style="font-size: 1.25rem; font-weight: 800; margin-bottom: 0.5rem;">${t('adminImportBackup')}</h3>
          <p style="color: var(--text-secondary); line-height: 1.6; font-size: 0.9rem; margin-bottom: 1.5rem;">
            ${isKm 
              ? 'បញ្ចូលឯកសារ JSON Backup ដើម្បីស្តារឡើងវិញនូវរាល់យុទ្ធនាការ ឬការកំណត់ដែលបានបម្រុងទុកពីមុនមក។' 
              : 'Restore campaigns and platform configuration from a previously exported JSON backup file.'}
          </p>
          <input type="file" id="adminImportFileInput" accept=".json" style="display: none;" onchange="app.handleAdminImportBackup(this)" />
          <button class="btn btn-secondary" onclick="document.getElementById('adminImportFileInput').click()" style="width: 100%;">
            ${Icons.upload} <span>${isKm ? 'ជ្រើសរើស File Backup (.json)' : 'Select Backup File (.json)'}</span>
          </button>
        </div>

        <!-- System Cache Purge Card -->
        <div class="admin-card">
          <div style="font-size: 2.2rem; margin-bottom: 0.75rem;">🧹</div>
          <h3 style="font-size: 1.25rem; font-weight: 800; margin-bottom: 0.5rem;">${t('adminPurgeCache')}</h3>
          <p style="color: var(--text-secondary); line-height: 1.6; font-size: 0.9rem; margin-bottom: 1.5rem;">
            ${isKm 
              ? 'សម្អាត Local Memory Cache និងទាញយកទិន្នន័យស្រស់បំផុតពី Cloud Firestore ដើម្បីធានាភាពសុក្រឹត។' 
              : 'Purge local in-memory cache and force re-synchronization with latest Cloud Firestore documents.'}
          </p>
          <button class="btn btn-outline" onclick="app.handleAdminPurgeCache()" style="width: 100%;">
            🔄 <span>${isKm ? 'សម្អាត Cache និង Sync ឡើងវិញ' : 'Purge Cache & Sync'}</span>
          </button>
        </div>
      </div>
    `;
  }

  // =========================================================
  // ADMIN TAB LISTENERS (FILTERING & SEARCH)
  // =========================================================
  initAdminTabListeners(activeTab, isKm) {
    if (activeTab === 'campaigns') {
      const searchInput = document.getElementById('adminCampSearchInput');
      const catSelect = document.getElementById('adminCampCatSelect');
      const sourceSelect = document.getElementById('adminCampSourceSelect');
      const tableContainer = document.getElementById('adminCampTableContainer');
      const countLabel = document.getElementById('adminTableCountLabel');

      const applyFilters = () => {
        const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
        const selectedCat = catSelect ? catSelect.value : 'all';
        const selectedSource = sourceSelect ? sourceSelect.value : 'all';

        const filtered = this.adminData.campaigns.filter(c => {
          const matchCat = (selectedCat === 'all') || (c.category === selectedCat);
          const cSource = c._source || (c.isPreset ? 'preset' : 'cloud');
          const matchSource = (selectedSource === 'all') || (cSource === selectedSource);

          let matchQuery = true;
          if (query) {
            const titleKm = (c.titleKm || '').toLowerCase();
            const titleEn = (c.titleEn || '').toLowerCase();
            const slug = (c.slug || '').toLowerCase();
            const creator = (c.creator || '').toLowerCase();
            const email = (c.creatorEmail || '').toLowerCase();
            matchQuery = titleKm.includes(query) || titleEn.includes(query) || slug.includes(query) || creator.includes(query) || email.includes(query);
          }

          return matchCat && matchSource && matchQuery;
        });

        if (tableContainer) {
          tableContainer.innerHTML = this.buildCampaignsTableHtml(filtered, isKm);
          this.updateAdminBatchBarUI();
        }
        if (countLabel) {
          countLabel.textContent = isKm 
            ? `បង្ហាញ ${filtered.length} នៃ ${this.adminData.campaigns.length} យុទ្ធនាការ` 
            : `Showing ${filtered.length} of ${this.adminData.campaigns.length} campaigns`;
        }
      };

      if (searchInput) searchInput.addEventListener('input', applyFilters);
      if (catSelect) catSelect.addEventListener('change', applyFilters);
      if (sourceSelect) sourceSelect.addEventListener('change', applyFilters);
    } else if (activeTab === 'users') {
      const userSearch = document.getElementById('adminUserSearchInput');
      const userTableContainer = document.getElementById('adminUserTableContainer');
      const userCountLabel = document.getElementById('adminUserCountLabel');

      if (userSearch) {
        userSearch.addEventListener('input', () => {
          const q = userSearch.value.toLowerCase().trim();
          const filtered = this.adminData.users.filter(u => {
            const email = (u.email || '').toLowerCase();
            const name = (u.displayName || '').toLowerCase();
            const uid = (u.uid || '').toLowerCase();
            return !q || email.includes(q) || name.includes(q) || uid.includes(q);
          });

          if (userTableContainer) {
            userTableContainer.innerHTML = this.buildUsersTableHtml(filtered, isKm);
          }
          if (userCountLabel) {
            userCountLabel.textContent = isKm 
              ? `បង្ហាញ ${filtered.length} នៃ ${this.adminData.users.length} នាក់` 
              : `Showing ${filtered.length} of ${this.adminData.users.length} users`;
          }
        });
      }
    }
  }

  // =========================================================
  // ADMIN ACTIONS: EDIT CAMPAIGN MODAL
  // =========================================================
  openAdminEditCampaignModal(campaignId) {
    const isKm = typeof getLanguage === 'function' && getLanguage() === 'km';
    const camp = (this.adminData && this.adminData.campaigns)
      ? this.adminData.campaigns.find(c => c.slug === campaignId || c.id === campaignId || c._docId === campaignId)
      : null;
    if (!camp) {
      this.showToast("Campaign not found", "error");
      return;
    }

    const existing = document.getElementById('adminEditModalOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'adminEditModalOverlay';

    const safeFrameUrl = SecurityUtils.sanitizeUrl(camp.frameUrl);
    const cat = camp.category || 'celebration';
    const targetKey = camp.slug || camp.id || camp._docId || campaignId;

    overlay.innerHTML = `
      <div class="modal-card admin-modal-edit-card" style="max-width: 780px; max-height: 90vh; overflow-y: auto;">
        <div class="modal-header">
          <div>
            <h3 style="font-weight: 800; font-size: 1.25rem;">✏️ ${t('adminEditCampaign')}</h3>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem;">${t('adminEditCampaignSubtitle')}</p>
          </div>
          <button class="modal-close-btn" onclick="document.getElementById('adminEditModalOverlay').remove()">&times;</button>
        </div>

        <form id="adminEditForm" onsubmit="event.preventDefault(); app.handleAdminSaveCampaignEdit('${SecurityUtils.escapeHtml(targetKey)}')">
          <div class="admin-edit-layout">
            <!-- Left: Frame Preview -->
            <div class="admin-edit-preview-col">
              <label class="form-label">🖼️ ${isKm ? 'រូបភាពស៊ុមបច្ចុប្បន្ន' : 'Current Frame'}</label>
              <div class="admin-edit-frame-preview-box">
                <img src="${SAMPLE_AVATARS[0]}" class="admin-thumb-bg" />
                <img src="${safeFrameUrl}" class="admin-thumb-frame" id="adminEditFramePreviewImg" />
              </div>
              <div style="margin-top: 0.75rem;">
                <label class="form-label" style="font-size: 0.78rem;">${isKm ? 'ប្តូររូបភាពស៊ុមថ្មី (PNG ថ្លា)' : 'Replace Frame (PNG)'}</label>
                <input type="file" id="adminEditFrameFileInput" accept="image/png,image/webp" class="form-input" style="font-size: 0.8rem; padding: 0.35rem;" />
              </div>
            </div>

            <!-- Right: Metadata Form -->
            <div class="admin-edit-fields-col">
              <div class="form-group">
                <label class="form-label">${t('fieldTitle')} (Khmer) *</label>
                <input type="text" id="editCampTitleKm" class="form-input" value="${SecurityUtils.escapeHtml(camp.titleKm || '')}" required />
              </div>

              <div class="form-group">
                <label class="form-label">${t('fieldTitle')} (English) *</label>
                <input type="text" id="editCampTitleEn" class="form-input" value="${SecurityUtils.escapeHtml(camp.titleEn || '')}" required />
              </div>

              <div class="admin-form-grid-2">
                <div class="form-group">
                  <label class="form-label">${t('fieldSlug')} *</label>
                  <input type="text" id="editCampSlug" class="form-input" value="${SecurityUtils.escapeHtml(camp.slug || '')}" required />
                </div>

                <div class="form-group">
                  <label class="form-label">${t('fieldCategory')} *</label>
                  <select id="editCampCategory" class="form-select">
                    <option value="education" ${cat === 'education' ? 'selected' : ''}>${t('catEducation')}</option>
                    <option value="culture" ${cat === 'culture' ? 'selected' : ''}>${t('catCulture')}</option>
                    <option value="charity" ${cat === 'charity' ? 'selected' : ''}>${t('catCharity')}</option>
                    <option value="sports" ${cat === 'sports' ? 'selected' : ''}>${t('catSports')}</option>
                    <option value="tech" ${cat === 'tech' ? 'selected' : ''}>${t('catTech')}</option>
                    <option value="celebration" ${cat === 'celebration' ? 'selected' : ''}>${t('catCelebration')}</option>
                  </select>
                </div>
              </div>

              <div class="admin-form-grid-2">
                <div class="form-group">
                  <label class="form-label">${isKm ? 'ចំនួនអ្នកគាំទ្រ (Supporters)' : 'Supporters Count'} *</label>
                  <input type="number" id="editCampSupporters" class="form-input" value="${camp.supporters || 1}" min="1" required />
                </div>

                <div class="form-group">
                  <label class="form-label">${isKm ? 'ឈ្មោះអ្នកបង្កើត' : 'Creator Name'}</label>
                  <input type="text" id="editCampCreator" class="form-input" value="${SecurityUtils.escapeHtml(camp.creator || '')}" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">${isKm ? 'អ៊ីមែលអ្នកបង្កើត' : 'Creator Email'}</label>
                <input type="email" id="editCampCreatorEmail" class="form-input" value="${SecurityUtils.escapeHtml(camp.creatorEmail || '')}" />
              </div>

              <div class="form-group">
                <label class="form-label">${t('fieldDesc')} (Khmer)</label>
                <textarea id="editCampDescKm" class="form-textarea" rows="2">${SecurityUtils.escapeHtml(camp.descriptionKm || '')}</textarea>
              </div>

              <div class="form-group">
                <label class="form-label">${t('fieldDesc')} (English)</label>
                <textarea id="editCampDescEn" class="form-textarea" rows="2">${SecurityUtils.escapeHtml(camp.descriptionEn || '')}</textarea>
              </div>

              <div class="form-group">
                <label class="form-label">${t('fieldCaption')}</label>
                <textarea id="editCampCaptionKm" class="form-textarea" rows="2">${SecurityUtils.escapeHtml(camp.captionKm || camp.captionEn || '')}</textarea>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('adminEditModalOverlay').remove()">
              ${t('adminCancel')}
            </button>
            <button type="submit" class="btn btn-primary" id="btnAdminSaveEdit">
              ${Icons.check} <span>${t('adminSaveCampaignChanges')}</span>
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    // Handle frame file change preview
    const fileInput = document.getElementById('adminEditFrameFileInput');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            const previewImg = document.getElementById('adminEditFramePreviewImg');
            if (previewImg) previewImg.src = evt.target.result;
            overlay._newFrameDataUrl = evt.target.result;
          };
          reader.readAsDataURL(file);
        }
      });
    }
  }

  async handleAdminSaveCampaignEdit(campaignId) {
    const isKm = typeof getLanguage === 'function' && getLanguage() === 'km';
    const overlay = document.getElementById('adminEditModalOverlay');
    const saveBtn = document.getElementById('btnAdminSaveEdit');

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<span>⏳ ${isKm ? 'កំពុងរក្សាទុក...' : 'Saving...'}</span>`;
    }

    try {
      const titleKm = document.getElementById('editCampTitleKm').value.trim();
      const titleEn = document.getElementById('editCampTitleEn').value.trim();
      const slug = document.getElementById('editCampSlug').value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      const category = document.getElementById('editCampCategory').value;
      const supporters = parseInt(document.getElementById('editCampSupporters').value, 10) || 1;
      const creator = document.getElementById('editCampCreator').value.trim();
      const creatorEmail = document.getElementById('editCampCreatorEmail').value.trim();
      const descriptionKm = document.getElementById('editCampDescKm').value.trim();
      const descriptionEn = document.getElementById('editCampDescEn').value.trim();
      const captionKm = document.getElementById('editCampCaptionKm').value.trim();

      const updatePayload = {
        titleKm,
        titleEn,
        slug,
        category,
        supporters,
        creator,
        creatorEmail,
        descriptionKm,
        descriptionEn,
        captionKm,
        captionEn: captionKm
      };

      if (overlay && overlay._newFrameDataUrl) {
        updatePayload.frameUrl = overlay._newFrameDataUrl;
      }

      const res = await AdminService.adminUpdateCampaign(campaignId, updatePayload);
      const updated = res.campaign;

      // Immediately update local in-memory adminData
      if (this.adminData && this.adminData.campaigns) {
        const idx = this.adminData.campaigns.findIndex(c => 
          c.slug === campaignId || c.id === campaignId || c._docId === campaignId
        );
        if (idx !== -1) {
          this.adminData.campaigns[idx] = updated;
        } else {
          this.adminData.campaigns.unshift(updated);
        }
        this.adminData.metrics = AdminService.getPlatformMetrics(this.adminData.campaigns, this.adminData.users);
      }

      this.showToast(t('adminCampaignUpdated'), 'success');
      if (overlay) overlay.remove();

      // Refresh admin data and table UI
      const tableWrap = document.getElementById('adminCampTableContainer');
      if (tableWrap && this.adminActiveTab === 'campaigns') {
        tableWrap.innerHTML = this.buildCampaignsTableHtml(this.adminData.campaigns, isKm);
        this.initAdminTabListeners('campaigns', isKm);
      } else {
        await this.loadAdminView('campaigns');
      }
    } catch (err) {
      console.error("Admin save edit error:", err);
      this.showToast("Error updating campaign: " + (err.message || ''), 'error');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `${Icons.check} <span>${t('adminSaveCampaignChanges')}</span>`;
      }
    }
  }

  // =========================================================
  // ADMIN ACTIONS: DELETE CAMPAIGN
  // =========================================================
  async handleAdminDeleteCampaign(campaignId, title) {
    const isKm = typeof getLanguage === 'function' && getLanguage() === 'km';
    const confirmMsg = `${t('adminDeleteCampaignConfirm')}\n\n• Campaign: "${title || campaignId}"`;
    
    if (!window.confirm(confirmMsg)) return;

    try {
      await AdminService.adminDeleteCampaign(campaignId);

      // Immediately update local in-memory adminData
      if (this.adminData && this.adminData.campaigns) {
        this.adminData.campaigns = this.adminData.campaigns.filter(c => 
          c.slug !== campaignId && c.id !== campaignId && c._docId !== campaignId
        );
        this.adminData.metrics = AdminService.getPlatformMetrics(this.adminData.campaigns, this.adminData.users);
      }

      this.showToast(t('adminCampaignDeleted'), 'success');

      // Remove from selection if deleted
      if (this.adminSelectedCampaigns) {
        this.adminSelectedCampaigns.delete(campaignId);
      }

      this.refreshAdminCampaignsTable();
    } catch (err) {
      console.error("Admin delete error:", err);
      this.showToast("Error deleting campaign: " + (err.message || ''), 'error');
    }
  }

  // =========================================================
  // ADMIN BATCH SELECTION & ACTIONS
  // =========================================================
  handleAdminRowCheckboxToggle(safeCampId, isChecked) {
    if (!this.adminSelectedCampaigns) this.adminSelectedCampaigns = new Set();
    if (isChecked) {
      this.adminSelectedCampaigns.add(safeCampId);
    } else {
      this.adminSelectedCampaigns.delete(safeCampId);
    }
    const row = document.getElementById(`adminRow_${safeCampId}`);
    if (row) {
      if (isChecked) row.classList.add('admin-row-selected');
      else row.classList.remove('admin-row-selected');
    }
    this.updateAdminBatchBarUI();
  }

  handleAdminMasterCheckboxToggle(isChecked) {
    if (!this.adminSelectedCampaigns) this.adminSelectedCampaigns = new Set();
    const cbs = document.querySelectorAll('.admin-camp-cb');
    cbs.forEach(cb => {
      cb.checked = isChecked;
      const key = cb.getAttribute('data-key');
      if (key) {
        if (isChecked) this.adminSelectedCampaigns.add(key);
        else this.adminSelectedCampaigns.delete(key);
      }
      const row = cb.closest('tr');
      if (row) {
        if (isChecked) row.classList.add('admin-row-selected');
        else row.classList.remove('admin-row-selected');
      }
    });
    this.updateAdminBatchBarUI();
  }

  updateAdminBatchBarUI() {
    const isKm = typeof getLanguage === 'function' && getLanguage() === 'km';
    const count = this.adminSelectedCampaigns ? this.adminSelectedCampaigns.size : 0;
    const batchBar = document.getElementById('adminBatchBar');
    const badge = document.getElementById('adminBatchCountBadge');
    const text = document.getElementById('adminBatchCountText');

    if (batchBar) {
      if (count > 0) {
        batchBar.style.display = 'flex';
        if (badge) badge.textContent = count;
        if (text) text.textContent = t('adminSelectedCount').replace('{count}', count);
      } else {
        batchBar.style.display = 'none';
      }
    }

    const allVisibleCbs = Array.from(document.querySelectorAll('.admin-camp-cb'));
    const masterCb = document.getElementById('adminMasterCb');
    if (masterCb) {
      if (allVisibleCbs.length === 0) {
        masterCb.checked = false;
        masterCb.indeterminate = false;
      } else {
        const checkedCount = allVisibleCbs.filter(cb => cb.checked).length;
        masterCb.checked = (checkedCount === allVisibleCbs.length);
        masterCb.indeterminate = (checkedCount > 0 && checkedCount < allVisibleCbs.length);
      }
    }
  }

  handleAdminDeselectAll() {
    if (this.adminSelectedCampaigns) this.adminSelectedCampaigns.clear();
    document.querySelectorAll('.admin-camp-cb').forEach(cb => {
      cb.checked = false;
      cb.closest('tr')?.classList.remove('admin-row-selected');
    });
    const masterCb = document.getElementById('adminMasterCb');
    if (masterCb) {
      masterCb.checked = false;
      masterCb.indeterminate = false;
    }
    this.updateAdminBatchBarUI();
  }

  async handleAdminBatchDelete() {
    const isKm = typeof getLanguage === 'function' && getLanguage() === 'km';
    const count = this.adminSelectedCampaigns ? this.adminSelectedCampaigns.size : 0;
    if (count === 0) return;

    const confirmMsg = t('adminBatchDeleteConfirm').replace('{count}', count);
    if (!window.confirm(confirmMsg)) return;

    try {
      this.showToast(isKm ? 'កំពុងលុបយុទ្ធនាការដែលបានជ្រើស...' : 'Deleting selected campaigns...', 'info');
      const targetKeys = Array.from(this.adminSelectedCampaigns);

      const res = await AdminService.adminBatchDeleteCampaigns(targetKeys);

      // Update in-memory campaigns
      if (this.adminData && this.adminData.campaigns) {
        const deletedSet = new Set(res.deletedIdentifiers || targetKeys);
        this.adminData.campaigns = this.adminData.campaigns.filter(c => 
          !deletedSet.has(c.slug) && !deletedSet.has(c.id) && !(c._docId && deletedSet.has(c._docId))
        );
        this.adminData.metrics = AdminService.getPlatformMetrics(this.adminData.campaigns, this.adminData.users);
      }

      this.adminSelectedCampaigns.clear();
      this.showToast(t('adminBatchDeletedSuccess').replace('{count}', count), 'success');
      this.refreshAdminCampaignsTable();
    } catch (err) {
      console.error("Batch delete error:", err);
      this.showToast("Error during batch delete: " + (err.message || ''), 'error');
    }
  }

  async handleAdminBatchExport() {
    const isKm = typeof getLanguage === 'function' && getLanguage() === 'km';
    const count = this.adminSelectedCampaigns ? this.adminSelectedCampaigns.size : 0;
    if (count === 0) return;

    try {
      this.showToast(isKm ? 'កំពុងបង្កើត Backup...' : 'Generating JSON backup...', 'info');
      const targetKeys = Array.from(this.adminSelectedCampaigns);
      await AdminService.exportSelectedCampaignsBackup(targetKeys);
      this.showToast(isKm ? `បានទាញយក Backup យុទ្ធនាការចំនួន ${count}!` : `Exported ${count} selected campaigns!`, 'success');
    } catch (err) {
      console.error("Batch export error:", err);
      this.showToast("Error exporting campaigns: " + (err.message || ''), 'error');
    }
  }

  openAdminBatchCategoryModal() {
    const isKm = typeof getLanguage === 'function' && getLanguage() === 'km';
    const count = this.adminSelectedCampaigns ? this.adminSelectedCampaigns.size : 0;
    if (count === 0) return;

    const existing = document.getElementById('adminBatchCatModalOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'adminBatchCatModalOverlay';

    overlay.innerHTML = `
      <div class="modal-card" style="max-width: 480px;">
        <div class="modal-header">
          <div>
            <h3 style="font-weight: 800; font-size: 1.2rem;">🏷️ ${t('adminBatchChangeCategory')}</h3>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.2rem;">
              ${t('adminBatchCategoryPrompt').replace('{count}', count)}
            </p>
          </div>
          <button class="modal-close-btn" onclick="document.getElementById('adminBatchCatModalOverlay').remove()">&times;</button>
        </div>

        <form onsubmit="event.preventDefault(); app.handleAdminSaveBatchCategory();">
          <div class="form-group" style="margin: 1.25rem 0;">
            <label class="form-label">${t('fieldCategory')} *</label>
            <select id="batchNewCategorySelect" class="form-select" style="padding: 0.75rem 1rem; font-size: 1rem;">
              <option value="celebration">🎉 ${t('catCelebration')}</option>
              <option value="education">🎓 ${t('catEducation')}</option>
              <option value="culture">🏛️ ${t('catCulture')}</option>
              <option value="charity">❤️ ${t('catCharity')}</option>
              <option value="sports">⚽ ${t('catSports')}</option>
              <option value="tech">💻 ${t('catTech')}</option>
            </select>
          </div>

          <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('adminBatchCatModalOverlay').remove()">
              ${t('adminCancel')}
            </button>
            <button type="submit" class="btn btn-primary">
              💾 <span>${isKm ? `ប្តូរទៅ Category ថ្មី (${count})` : `Update Category (${count})`}</span>
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  async handleAdminSaveBatchCategory() {
    const isKm = typeof getLanguage === 'function' && getLanguage() === 'km';
    const select = document.getElementById('batchNewCategorySelect');
    const newCat = select ? select.value : 'celebration';
    const targetKeys = Array.from(this.adminSelectedCampaigns);
    const count = targetKeys.length;

    try {
      this.showToast(isKm ? 'កំពុងកែប្រែ Category...' : 'Updating categories...', 'info');
      await AdminService.adminBatchUpdateCategory(targetKeys, newCat);

      // Update in-memory campaigns
      if (this.adminData && this.adminData.campaigns) {
        const targetSet = new Set(targetKeys);
        this.adminData.campaigns.forEach(c => {
          if (targetSet.has(c.slug) || targetSet.has(c.id) || (c._docId && targetSet.has(c._docId))) {
            c.category = newCat;
          }
        });
        this.adminData.metrics = AdminService.getPlatformMetrics(this.adminData.campaigns, this.adminData.users);
      }

      const modal = document.getElementById('adminBatchCatModalOverlay');
      if (modal) modal.remove();

      this.showToast(t('adminBatchCategoryUpdated').replace('{count}', count), 'success');
      this.refreshAdminCampaignsTable();
    } catch (err) {
      console.error("Batch category update error:", err);
      this.showToast("Error updating category: " + (err.message || ''), 'error');
    }
  }

  refreshAdminCampaignsTable() {
    const isKm = typeof getLanguage === 'function' && getLanguage() === 'km';
    const tableWrap = document.getElementById('adminCampTableContainer');
    if (tableWrap && this.adminData) {
      tableWrap.innerHTML = this.buildCampaignsTableHtml(this.adminData.campaigns, isKm);
      this.initAdminTabListeners('campaigns', isKm);
      const countLabel = document.getElementById('adminTableCountLabel');
      if (countLabel) {
        countLabel.textContent = isKm 
          ? `បង្ហាញយុទ្ធនាការសរុបចំនួន ${this.adminData.campaigns.length}`
          : `Showing all ${this.adminData.campaigns.length} campaigns`;
      }
      const campTabPill = document.querySelector('.admin-tab-item:nth-child(2) .admin-tab-counter');
      if (campTabPill) campTabPill.textContent = this.adminData.campaigns.length;
      this.updateAdminBatchBarUI();
    } else {
      this.loadAdminView('campaigns');
    }
  }

  // =========================================================
  // ADMIN ACTIONS: CREATE CAMPAIGN DIRECTLY
  // =========================================================
  openAdminCreateModal() {
    // Super Admin can easily jump to #create
    this.navigateTo('create');
  }

  // =========================================================
  // ADMIN ACTIONS: EXPORT & IMPORT BACKUP
  // =========================================================
  async handleAdminExportBackup() {
    try {
      this.showToast("Preparing backup JSON...", "info");
      await AdminService.exportDatabaseBackup();
      this.showToast("Backup exported successfully!", "success");
    } catch (err) {
      this.showToast("Backup export failed: " + err.message, "error");
    }
  }

  async handleAdminImportBackup(fileInput) {
    const file = fileInput.files[0];
    if (!file) return;

    const isKm = typeof getLanguage === 'function' && getLanguage() === 'km';
    if (!window.confirm(t('adminRestoreConfirm'))) {
      fileInput.value = '';
      return;
    }

    try {
      this.showToast("Reading backup file...", "info");
      const text = await file.text();
      const jsonData = JSON.parse(text);
      const res = await AdminService.importDatabaseBackup(jsonData);
      this.showToast(t('adminRestoreSuccess') + ` (${res.restoredCampaigns} campaigns)`, "success");
      fileInput.value = '';
      await this.loadAdminView('backup');
    } catch (err) {
      console.error("Backup import error:", err);
      this.showToast("Import failed: " + (err.message || ''), "error");
      fileInput.value = '';
    }
  }

  // =========================================================
  // ADMIN ACTIONS: PURGE SYSTEM CACHE
  // =========================================================
  async handleAdminPurgeCache() {
    if (CampaignService._memoryCache) {
      CampaignService._memoryCache.clear();
    }
    this.showToast(t('adminPurgeSuccess'), "success");
    await this.loadAdminView(this.adminActiveTab || 'overview');
  }

  // =========================================================
  // ADMIN ACTIONS: SAVE SETTINGS
  // =========================================================
  async handleAdminSaveSettings() {
    const saveBtn = document.getElementById('btnSaveAdminSettings');
    if (saveBtn) saveBtn.disabled = true;

    try {
      const enabled = document.getElementById('settingAnnouncementEnable')?.checked || false;
      const textKm = document.getElementById('settingAnnouncementKm')?.value.trim() || '';
      const textEn = document.getElementById('settingAnnouncementEn')?.value.trim() || '';
      const link = document.getElementById('settingAnnouncementLink')?.value.trim() || '';
      const type = document.getElementById('settingAnnouncementType')?.value || 'info';
      const maintenance = document.getElementById('settingMaintenanceMode')?.checked || false;

      const newSettings = {
        announcementEnabled: enabled,
        announcementTextKm: textKm,
        announcementTextEn: textEn,
        announcementLink: link,
        announcementType: type,
        maintenanceMode: maintenance
      };

      await AdminService.saveSystemSettings(newSettings);
      this.showToast(t('adminSettingsSaved'), 'success');

      // Update active announcement banner immediately
      sessionStorage.removeItem('tra_announcement_dismissed');
      this.renderGlobalAnnouncementBanner();
    } catch (err) {
      this.showToast("Error saving settings: " + (err.message || ''), 'error');
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  // =========================================================
  // ADMIN ACTIONS: TOGGLE USER VERIFICATION
  // =========================================================
  async handleAdminToggleVerifyUser(email, currentStatus) {
    try {
      const newStatus = !currentStatus;
      await AdminService.updateUserStatus(email, newStatus);
      this.showToast(t('adminUserStatusUpdated'), 'success');
      await this.loadAdminView('users');
    } catch (err) {
      this.showToast("Error updating user: " + (err.message || ''), 'error');
    }
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
