class UserManager {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.currentUser = null;
    this.isAuthenticated = false;
    this.token = null;
    this.apiBaseUrl = '/api';
    
    this.init();
  }

  init() {
    this.loadStoredAuth();
    this.setupAuthUI();
    this.updateUIState();
  }

  // Load stored authentication data
  loadStoredAuth() {
    try {
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('userData');
      
      if (token && userData) {
        this.token = token;
        this.currentUser = JSON.parse(userData);
        this.isAuthenticated = true;
        
        // Verify token is still valid
        this.verifyToken();
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
      this.clearAuth();
    }
  }

  // Setup authentication UI
  setupAuthUI() {
    this.createAuthModal();
    this.addAuthButton();
  }

  // Add authentication button to navigation
  addAuthButton() {
    const navIcons = document.querySelector('.nav-icons');
    if (!navIcons) return;

    this.authButton = document.createElement('div');
    this.authButton.className = 'auth-button';
    this.authButton.innerHTML = '<i class="fas fa-user"></i>';
    
    this.authButton.style.cssText = `
      cursor: pointer;
      font-size: 1.3rem;
      transition: all 0.3s ease;
      padding: 8px;
      border-radius: 50%;
      border: 1px solid transparent;
      position: relative;
    `;

    this.authButton.addEventListener('click', () => {
      if (this.isAuthenticated) {
        this.showUserMenu();
      } else {
        this.showAuthModal();
      }
    });

    this.authButton.addEventListener('mouseenter', () => {
      this.authButton.style.color = 'var(--neon-cyan)';
      this.authButton.style.textShadow = '0 0 15px var(--neon-cyan)';
      this.authButton.style.borderColor = 'var(--neon-cyan)';
      this.authButton.style.boxShadow = '0 0 15px var(--neon-cyan)';
      this.authButton.style.transform = 'scale(1.1)';
    });

    this.authButton.addEventListener('mouseleave', () => {
      this.authButton.style.color = '';
      this.authButton.style.textShadow = '';
      this.authButton.style.borderColor = 'transparent';
      this.authButton.style.boxShadow = '';
      this.authButton.style.transform = '';
    });

    // Insert before search icon
    const searchIcon = navIcons.querySelector('.fa-search');
    navIcons.insertBefore(this.authButton, searchIcon);
  }

  // Create authentication modal
  createAuthModal() {
    this.authModal = document.createElement('div');
    this.authModal.className = 'auth-modal';
    this.authModal.style.display = 'none';
    
    this.authModal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <button class="modal-close">&times;</button>
        <div class="auth-tabs">
          <button class="auth-tab active" data-tab="login">Login</button>
          <button class="auth-tab" data-tab="register">Register</button>
        </div>
        
        <div class="auth-form-container">
          <!-- Login Form -->
          <form class="auth-form login-form active" id="loginForm">
            <h2>Neural Link Access</h2>
            <div class="form-group">
              <input type="email" id="loginEmail" placeholder="Email" required>
              <i class="fas fa-envelope"></i>
            </div>
            <div class="form-group">
              <input type="password" id="loginPassword" placeholder="Password" required>
              <i class="fas fa-lock"></i>
            </div>
            <button type="submit" class="auth-submit">
              <span class="button-text">JACK IN</span>
              <div class="loading-spinner" style="display: none;"></div>
            </button>
            <div class="auth-error" style="display: none;"></div>
          </form>

          <!-- Register Form -->
          <form class="auth-form register-form" id="registerForm">
            <h2>Neural Registration</h2>
            <div class="form-group">
              <input type="text" id="registerFirstName" placeholder="First Name" required>
              <i class="fas fa-user"></i>
            </div>
            <div class="form-group">
              <input type="text" id="registerLastName" placeholder="Last Name" required>
              <i class="fas fa-user"></i>
            </div>
            <div class="form-group">
              <input type="email" id="registerEmail" placeholder="Email" required>
              <i class="fas fa-envelope"></i>
            </div>
            <div class="form-group">
              <input type="password" id="registerPassword" placeholder="Password" required>
              <i class="fas fa-lock"></i>
            </div>
            <div class="form-group">
              <input type="password" id="registerConfirmPassword" placeholder="Confirm Password" required>
              <i class="fas fa-lock"></i>
            </div>
            <button type="submit" class="auth-submit">
              <span class="button-text">INITIALIZE</span>
              <div class="loading-spinner" style="display: none;"></div>
            </button>
            <div class="auth-error" style="display: none;"></div>
          </form>
        </div>
      </div>
    `;

    this.addAuthModalStyles();
    this.setupAuthModalEvents();
    document.body.appendChild(this.authModal);
  }

  // Add authentication modal styles
  addAuthModalStyles() {
    if (document.querySelector('#auth-modal-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'auth-modal-styles';
    styles.textContent = `
      .auth-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .auth-modal .modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(5px);
      }

      .auth-modal .modal-content {
        position: relative;
        background: linear-gradient(145deg, var(--darker-bg), var(--dark-bg));
        border: 2px solid var(--neon-cyan);
        max-width: 400px;
        width: 90%;
        box-shadow: 0 0 50px var(--neon-cyan);
        padding: 2rem;
      }

      .auth-modal .modal-close {
        position: absolute;
        top: 15px;
        right: 20px;
        background: none;
        border: none;
        color: var(--neon-pink);
        font-size: 2rem;
        cursor: pointer;
        z-index: 1;
        transition: all 0.3s ease;
      }

      .auth-modal .modal-close:hover {
        color: var(--neon-red);
        text-shadow: 0 0 10px var(--neon-red);
        transform: scale(1.2);
      }

      .auth-tabs {
        display: flex;
        margin-bottom: 2rem;
        border-bottom: 1px solid var(--neon-cyan);
      }

      .auth-tab {
        flex: 1;
        background: none;
        border: none;
        color: #ccc;
        padding: 15px;
        font-family: 'Rajdhani', sans-serif;
        font-weight: 600;
        font-size: 1.1rem;
        text-transform: uppercase;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
      }

      .auth-tab.active {
        color: var(--neon-cyan);
        text-shadow: 0 0 10px var(--neon-cyan);
      }

      .auth-tab.active::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 0;
        width: 100%;
        height: 2px;
        background: var(--neon-cyan);
        box-shadow: 0 0 10px var(--neon-cyan);
      }

      .auth-form {
        display: none;
      }

      .auth-form.active {
        display: block;
      }

      .auth-form h2 {
        color: var(--neon-cyan);
        font-family: 'Orbitron', monospace;
        text-align: center;
        margin-bottom: 2rem;
        text-shadow: 0 0 10px var(--neon-cyan);
      }

      .form-group {
        position: relative;
        margin-bottom: 1.5rem;
      }

      .form-group input {
        width: 100%;
        background: var(--dark-bg);
        border: 1px solid var(--neon-cyan);
        color: white;
        padding: 15px 45px 15px 15px;
        font-family: 'Rajdhani', sans-serif;
        font-size: 1rem;
        transition: all 0.3s ease;
      }

      .form-group input:focus {
        outline: none;
        border-color: var(--neon-pink);
        box-shadow: 0 0 15px var(--neon-pink);
      }

      .form-group i {
        position: absolute;
        right: 15px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--neon-cyan);
        transition: all 0.3s ease;
      }

      .form-group input:focus + i {
        color: var(--neon-pink);
        text-shadow: 0 0 10px var(--neon-pink);
      }

      .auth-submit {
        width: 100%;
        background: linear-gradient(45deg, var(--neon-pink), var(--neon-red));
        color: white;
        border: 2px solid var(--neon-pink);
        padding: 15px;
        font-family: 'Orbitron', monospace;
        font-weight: 600;
        font-size: 1.1rem;
        text-transform: uppercase;
        letter-spacing: 1px;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 0 15px rgba(245, 0, 87, 0.3);
        position: relative;
        overflow: hidden;
      }

      .auth-submit:hover:not(:disabled) {
        transform: translateY(-2px);
        border-color: var(--neon-cyan);
        box-shadow: 0 5px 25px var(--neon-pink);
      }

      .auth-submit:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }

      .auth-submit .loading-spinner {
        width: 20px;
        height: 20px;
        border: 2px solid transparent;
        border-top: 2px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto;
      }

      .auth-error {
        background: rgba(255, 61, 0, 0.1);
        border: 1px solid var(--neon-red);
        color: var(--neon-red);
        padding: 10px;
        margin-top: 1rem;
        text-align: center;
        font-family: 'Rajdhani', sans-serif;
      }

      .user-menu {
        position: absolute;
        top: 100%;
        right: 0;
        background: linear-gradient(145deg, var(--darker-bg), var(--dark-bg));
        border: 1px solid var(--neon-cyan);
        min-width: 200px;
        box-shadow: 0 0 20px var(--neon-cyan);
        z-index: 9999;
      }

      .user-menu-item {
        display: block;
        width: 100%;
        background: none;
        border: none;
        color: white;
        padding: 15px 20px;
        text-align: left;
        font-family: 'Rajdhani', sans-serif;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.3s ease;
        border-bottom: 1px solid rgba(0, 229, 255, 0.2);
      }

      .user-menu-item:hover {
        background: rgba(0, 229, 255, 0.1);
        color: var(--neon-cyan);
      }

      .user-menu-item:last-child {
        border-bottom: none;
      }

      .user-info {
        padding: 15px 20px;
        border-bottom: 1px solid rgba(0, 229, 255, 0.2);
        color: var(--neon-cyan);
        font-family: 'Rajdhani', sans-serif;
        font-weight: 600;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;

    document.head.appendChild(styles);
  }

  // Setup authentication modal events
  setupAuthModalEvents() {
    // Tab switching
    this.authModal.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        this.switchAuthTab(tabName);
      });
    });

    // Form submissions
    const loginForm = this.authModal.querySelector('#loginForm');
    const registerForm = this.authModal.querySelector('#registerForm');

    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin();
    });

    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleRegister();
    });

    // Close modal
    const closeBtn = this.authModal.querySelector('.modal-close');
    const overlay = this.authModal.querySelector('.modal-overlay');
    
    closeBtn.addEventListener('click', () => this.hideAuthModal());
    overlay.addEventListener('click', () => this.hideAuthModal());
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.authModal.style.display !== 'none') {
        this.hideAuthModal();
      }
    });
  }

  // Switch authentication tab
  switchAuthTab(tabName) {
    // Update tab buttons
    this.authModal.querySelectorAll('.auth-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    this.authModal.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update forms
    this.authModal.querySelectorAll('.auth-form').forEach(form => {
      form.classList.remove('active');
    });
    this.authModal.querySelector(`.${tabName}-form`).classList.add('active');

    // Clear errors
    this.clearAuthErrors();
  }

  // Show authentication modal
  showAuthModal() {
    this.authModal.style.display = 'flex';
    this.clearAuthErrors();
    this.clearAuthForms();
  }

  // Hide authentication modal
  hideAuthModal() {
    this.authModal.style.display = 'none';
  }

  // Handle login
  async handleLogin() {
    const email = this.authModal.querySelector('#loginEmail').value;
    const password = this.authModal.querySelector('#loginPassword').value;
    const submitBtn = this.authModal.querySelector('.login-form .auth-submit');
    const buttonText = submitBtn.querySelector('.button-text');
    const spinner = submitBtn.querySelector('.loading-spinner');

    this.clearAuthErrors();
    this.setAuthLoading(submitBtn, buttonText, spinner, true);

    try {
      const response = await this.makeApiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (response.success) {
        this.handleAuthSuccess(response.data);
        this.hideAuthModal();
        this.showNotification('Successfully logged in!', 'success');
      } else {
        throw new Error(response.error?.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      this.showAuthError('.login-form', error.message || 'Login failed. Please try again.');
    } finally {
      this.setAuthLoading(submitBtn, buttonText, spinner, false);
    }
  }

  // Handle registration
  async handleRegister() {
    const firstName = this.authModal.querySelector('#registerFirstName').value;
    const lastName = this.authModal.querySelector('#registerLastName').value;
    const email = this.authModal.querySelector('#registerEmail').value;
    const password = this.authModal.querySelector('#registerPassword').value;
    const confirmPassword = this.authModal.querySelector('#registerConfirmPassword').value;
    const submitBtn = this.authModal.querySelector('.register-form .auth-submit');
    const buttonText = submitBtn.querySelector('.button-text');
    const spinner = submitBtn.querySelector('.loading-spinner');

    this.clearAuthErrors();

    // Validate passwords match
    if (password !== confirmPassword) {
      this.showAuthError('.register-form', 'Passwords do not match');
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      this.showAuthError('.register-form', 'Password must be at least 6 characters');
      return;
    }

    this.setAuthLoading(submitBtn, buttonText, spinner, true);

    try {
      const response = await this.makeApiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password
        })
      });

      if (response.success) {
        this.handleAuthSuccess(response.data);
        this.hideAuthModal();
        this.showNotification('Account created successfully!', 'success');
      } else {
        throw new Error(response.error?.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      this.showAuthError('.register-form', error.message || 'Registration failed. Please try again.');
    } finally {
      this.setAuthLoading(submitBtn, buttonText, spinner, false);
    }
  }

  // Handle authentication success
  handleAuthSuccess(authData) {
    this.token = authData.token;
    this.currentUser = authData.user;
    this.isAuthenticated = true;

    // Store in localStorage
    localStorage.setItem('authToken', this.token);
    localStorage.setItem('userData', JSON.stringify(this.currentUser));

    // Update UI
    this.updateUIState();

    // Notify other components
    window.dispatchEvent(new CustomEvent('userAuthenticated', {
      detail: { user: this.currentUser, token: this.token }
    }));
  }

  // Make API request
  async makeApiRequest(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Verify token validity
  async verifyToken() {
    if (!this.token) return false;

    try {
      const response = await this.makeApiRequest('/auth/verify');
      if (response.success) {
        this.currentUser = response.data.user;
        this.updateUIState();
        return true;
      } else {
        throw new Error('Token verification failed');
      }
    } catch (error) {
      console.warn('Token verification failed:', error);
      this.clearAuth();
      return false;
    }
  }

  // Show user menu
  showUserMenu() {
    // Remove existing menu
    const existingMenu = document.querySelector('.user-menu');
    if (existingMenu) {
      existingMenu.remove();
      return;
    }

    const menu = document.createElement('div');
    menu.className = 'user-menu';
    
    menu.innerHTML = `
      <div class="user-info">
        ${this.currentUser.firstName} ${this.currentUser.lastName}
      </div>
      <button class="user-menu-item" onclick="window.userManager.showProfile()">
        <i class="fas fa-user"></i> Profile
      </button>
      <button class="user-menu-item" onclick="window.userManager.showOrderHistory()">
        <i class="fas fa-history"></i> Order History
      </button>
      <button class="user-menu-item" onclick="window.userManager.logout()">
        <i class="fas fa-sign-out-alt"></i> Logout
      </button>
    `;

    // Position menu
    this.authButton.style.position = 'relative';
    this.authButton.appendChild(menu);

    // Close menu when clicking outside
    setTimeout(() => {
      document.addEventListener('click', (e) => {
        if (!this.authButton.contains(e.target)) {
          menu.remove();
        }
      }, { once: true });
    }, 100);
  }

  // Show profile modal (placeholder)
  showProfile() {
    this.showNotification('Profile management coming soon!', 'info');
  }

  // Show order history (placeholder)
  showOrderHistory() {
    this.showNotification('Order history coming soon!', 'info');
  }

  // Logout user
  async logout() {
    try {
      // Call logout endpoint if available
      if (this.token) {
        await this.makeApiRequest('/auth/logout', { method: 'POST' });
      }
    } catch (error) {
      console.warn('Logout API call failed:', error);
    }

    this.clearAuth();
    this.showNotification('Logged out successfully', 'success');
  }

  // Clear authentication data
  clearAuth() {
    this.token = null;
    this.currentUser = null;
    this.isAuthenticated = false;

    // Clear localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');

    // Update UI
    this.updateUIState();

    // Notify other components
    window.dispatchEvent(new CustomEvent('userLoggedOut'));
  }

  // Update UI state based on authentication
  updateUIState() {
    if (this.authButton) {
      const icon = this.authButton.querySelector('i');
      if (this.isAuthenticated) {
        icon.className = 'fas fa-user-check';
        this.authButton.style.color = 'var(--neon-cyan)';
      } else {
        icon.className = 'fas fa-user';
        this.authButton.style.color = '';
      }
    }
  }

  // Set authentication loading state
  setAuthLoading(button, textElement, spinner, loading) {
    button.disabled = loading;
    textElement.style.display = loading ? 'none' : 'inline';
    spinner.style.display = loading ? 'block' : 'none';
  }

  // Show authentication error
  showAuthError(formSelector, message) {
    const form = this.authModal.querySelector(formSelector);
    const errorElement = form.querySelector('.auth-error');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }

  // Clear authentication errors
  clearAuthErrors() {
    this.authModal.querySelectorAll('.auth-error').forEach(error => {
      error.style.display = 'none';
      error.textContent = '';
    });
  }

  // Clear authentication forms
  clearAuthForms() {
    this.authModal.querySelectorAll('input').forEach(input => {
      input.value = '';
    });
  }

  // Show notification
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    const color = type === 'error' ? 'var(--neon-red)' : 
                  type === 'success' ? 'var(--neon-cyan)' : 'var(--neon-orange)';

    notification.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      background: var(--dark-bg);
      border: 1px solid ${color};
      color: ${color};
      padding: 15px 20px;
      z-index: 9999;
      font-family: 'Rajdhani', sans-serif;
      font-weight: 500;
      box-shadow: 0 0 20px ${color};
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Get authentication token
  getToken() {
    return this.token;
  }

  // Check if user is authenticated
  isUserAuthenticated() {
    return this.isAuthenticated;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UserManager;
}