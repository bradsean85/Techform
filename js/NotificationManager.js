class NotificationManager {
  constructor() {
    this.notifications = [];
    this.container = null;
    this.maxNotifications = 5;
    
    this.init();
  }

  init() {
    this.createContainer();
    this.addStyles();
  }

  // Create notification container
  createContainer() {
    this.container = document.createElement('div');
    this.container.className = 'notification-container';
    this.container.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    
    document.body.appendChild(this.container);
  }

  // Add notification styles
  addStyles() {
    if (document.querySelector('#notification-manager-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'notification-manager-styles';
    styles.textContent = `
      .cyber-notification {
        background: linear-gradient(145deg, var(--darker-bg), var(--dark-bg));
        border: 1px solid var(--neon-cyan);
        color: white;
        padding: 15px 20px;
        min-width: 300px;
        max-width: 400px;
        font-family: 'Rajdhani', sans-serif;
        font-weight: 500;
        font-size: 1rem;
        position: relative;
        overflow: hidden;
        pointer-events: auto;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 0 20px rgba(0, 229, 255, 0.3);
      }

      .cyber-notification::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
        transition: left 0.6s;
      }

      .cyber-notification:hover::before {
        left: 100%;
      }

      .cyber-notification.success {
        border-color: var(--neon-cyan);
        box-shadow: 0 0 20px rgba(0, 229, 255, 0.3);
      }

      .cyber-notification.error {
        border-color: var(--neon-red);
        box-shadow: 0 0 20px rgba(255, 61, 0, 0.3);
      }

      .cyber-notification.warning {
        border-color: var(--neon-orange);
        box-shadow: 0 0 20px rgba(255, 111, 0, 0.3);
      }

      .cyber-notification.info {
        border-color: var(--neon-pink);
        box-shadow: 0 0 20px rgba(245, 0, 87, 0.3);
      }

      .notification-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 5px;
      }

      .notification-icon {
        font-size: 1.2rem;
        text-shadow: 0 0 10px currentColor;
      }

      .notification-title {
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-family: 'Orbitron', monospace;
      }

      .notification-close {
        position: absolute;
        top: 10px;
        right: 15px;
        background: none;
        border: none;
        color: currentColor;
        font-size: 1.2rem;
        cursor: pointer;
        opacity: 0.7;
        transition: all 0.3s ease;
      }

      .notification-close:hover {
        opacity: 1;
        transform: scale(1.2);
        text-shadow: 0 0 10px currentColor;
      }

      .notification-message {
        line-height: 1.4;
        margin-bottom: 10px;
      }

      .notification-actions {
        display: flex;
        gap: 10px;
        margin-top: 10px;
      }

      .notification-action {
        background: transparent;
        border: 1px solid currentColor;
        color: currentColor;
        padding: 5px 12px;
        font-family: 'Rajdhani', sans-serif;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.3s ease;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .notification-action:hover {
        background: currentColor;
        color: var(--dark-bg);
        box-shadow: 0 0 10px currentColor;
      }

      .notification-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: currentColor;
        transition: width linear;
        box-shadow: 0 0 10px currentColor;
      }

      .loading-notification {
        border-color: var(--neon-cyan);
        animation: pulse 2s infinite;
      }

      .loading-notification .notification-icon {
        animation: spin 1s linear infinite;
      }

      @keyframes pulse {
        0%, 100% { box-shadow: 0 0 20px rgba(0, 229, 255, 0.3); }
        50% { box-shadow: 0 0 30px rgba(0, 229, 255, 0.6); }
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }

      .cyber-notification.entering {
        animation: slideInRight 0.3s ease;
      }

      .cyber-notification.exiting {
        animation: slideOutRight 0.3s ease;
      }

      @media (max-width: 768px) {
        .notification-container {
          right: 10px;
          left: 10px;
        }

        .cyber-notification {
          min-width: auto;
          max-width: none;
        }
      }
    `;

    document.head.appendChild(styles);
  }

  // Show notification
  show(message, type = 'info', options = {}) {
    const notification = this.createNotification(message, type, options);
    this.addNotification(notification);
    return notification;
  }

  // Show success notification
  success(message, options = {}) {
    return this.show(message, 'success', options);
  }

  // Show error notification
  error(message, options = {}) {
    return this.show(message, 'error', { duration: 5000, ...options });
  }

  // Show warning notification
  warning(message, options = {}) {
    return this.show(message, 'warning', options);
  }

  // Show info notification
  info(message, options = {}) {
    return this.show(message, 'info', options);
  }

  // Show loading notification
  loading(message, options = {}) {
    return this.show(message, 'loading', { 
      duration: 0, 
      closable: false,
      icon: 'fas fa-sync-alt',
      ...options 
    });
  }

  // Create notification element
  createNotification(message, type, options = {}) {
    const {
      title = this.getDefaultTitle(type),
      icon = this.getDefaultIcon(type),
      duration = 4000,
      closable = true,
      actions = [],
      progress = duration > 0
    } = options;

    const notification = document.createElement('div');
    notification.className = `cyber-notification ${type} entering`;
    
    const notificationId = Date.now() + Math.random();
    notification.dataset.id = notificationId;

    notification.innerHTML = `
      <div class="notification-header">
        <i class="notification-icon ${icon}"></i>
        <span class="notification-title">${title}</span>
      </div>
      <div class="notification-message">${message}</div>
      ${actions.length > 0 ? `
        <div class="notification-actions">
          ${actions.map((action, index) => `
            <button class="notification-action" data-action="${index}">
              ${action.label}
            </button>
          `).join('')}
        </div>
      ` : ''}
      ${closable ? '<button class="notification-close">&times;</button>' : ''}
      ${progress ? '<div class="notification-progress"></div>' : ''}
    `;

    // Add event listeners
    this.setupNotificationEvents(notification, options);

    // Auto-remove after duration
    if (duration > 0) {
      this.scheduleRemoval(notification, duration);
    }

    return notification;
  }

  // Setup notification event listeners
  setupNotificationEvents(notification, options) {
    const { actions = [], onClose } = options;

    // Close button
    const closeBtn = notification.querySelector('.notification-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.remove(notification);
        if (onClose) onClose();
      });
    }

    // Click to dismiss
    notification.addEventListener('click', () => {
      if (options.closable !== false) {
        this.remove(notification);
        if (onClose) onClose();
      }
    });

    // Action buttons
    notification.querySelectorAll('.notification-action').forEach((btn, index) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = actions[index];
        if (action && action.handler) {
          action.handler();
        }
        if (action && action.closeOnClick !== false) {
          this.remove(notification);
        }
      });
    });
  }

  // Schedule notification removal
  scheduleRemoval(notification, duration) {
    const progressBar = notification.querySelector('.notification-progress');
    
    if (progressBar) {
      progressBar.style.width = '100%';
      progressBar.style.transition = `width ${duration}ms linear`;
      
      // Start progress animation
      setTimeout(() => {
        progressBar.style.width = '0%';
      }, 50);
    }

    setTimeout(() => {
      this.remove(notification);
    }, duration);
  }

  // Add notification to container
  addNotification(notification) {
    // Remove oldest notifications if at max capacity
    while (this.notifications.length >= this.maxNotifications) {
      const oldest = this.notifications.shift();
      this.remove(oldest, false);
    }

    this.notifications.push(notification);
    this.container.appendChild(notification);

    // Trigger entrance animation
    setTimeout(() => {
      notification.classList.remove('entering');
    }, 300);
  }

  // Remove notification
  remove(notification, updateArray = true) {
    if (!notification || !notification.parentNode) return;

    notification.classList.add('exiting');
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      
      if (updateArray) {
        const index = this.notifications.indexOf(notification);
        if (index > -1) {
          this.notifications.splice(index, 1);
        }
      }
    }, 300);
  }

  // Update existing notification
  update(notification, message, type, options = {}) {
    if (!notification) return;

    const messageEl = notification.querySelector('.notification-message');
    const iconEl = notification.querySelector('.notification-icon');
    const titleEl = notification.querySelector('.notification-title');

    if (messageEl) messageEl.textContent = message;
    if (type && iconEl) iconEl.className = `notification-icon ${this.getDefaultIcon(type)}`;
    if (type && titleEl) titleEl.textContent = options.title || this.getDefaultTitle(type);
    
    // Update class
    if (type) {
      notification.className = `cyber-notification ${type}`;
    }

    // Reschedule removal if duration specified
    if (options.duration > 0) {
      this.scheduleRemoval(notification, options.duration);
    }
  }

  // Clear all notifications
  clear() {
    this.notifications.forEach(notification => {
      this.remove(notification, false);
    });
    this.notifications = [];
  }

  // Get default title for notification type
  getDefaultTitle(type) {
    const titles = {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Info',
      loading: 'Loading'
    };
    return titles[type] || 'Notification';
  }

  // Get default icon for notification type
  getDefaultIcon(type) {
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-triangle',
      warning: 'fas fa-exclamation-circle',
      info: 'fas fa-info-circle',
      loading: 'fas fa-sync-alt'
    };
    return icons[type] || 'fas fa-bell';
  }

  // Show confirmation dialog
  confirm(message, options = {}) {
    return new Promise((resolve) => {
      const notification = this.show(message, 'warning', {
        title: options.title || 'Confirm',
        duration: 0,
        closable: false,
        actions: [
          {
            label: options.confirmLabel || 'Confirm',
            handler: () => resolve(true)
          },
          {
            label: options.cancelLabel || 'Cancel',
            handler: () => resolve(false)
          }
        ]
      });
    });
  }

  // Show prompt dialog
  prompt(message, options = {}) {
    return new Promise((resolve) => {
      // Create custom prompt notification
      const notification = document.createElement('div');
      notification.className = 'cyber-notification info';
      
      notification.innerHTML = `
        <div class="notification-header">
          <i class="notification-icon fas fa-question-circle"></i>
          <span class="notification-title">${options.title || 'Input Required'}</span>
        </div>
        <div class="notification-message">${message}</div>
        <input type="text" class="prompt-input" placeholder="${options.placeholder || ''}" 
               style="width: 100%; margin: 10px 0; padding: 8px; background: var(--dark-bg); 
                      border: 1px solid var(--neon-cyan); color: white; font-family: 'Rajdhani', sans-serif;">
        <div class="notification-actions">
          <button class="notification-action confirm-btn">OK</button>
          <button class="notification-action cancel-btn">Cancel</button>
        </div>
      `;

      const input = notification.querySelector('.prompt-input');
      const confirmBtn = notification.querySelector('.confirm-btn');
      const cancelBtn = notification.querySelector('.cancel-btn');

      confirmBtn.addEventListener('click', () => {
        resolve(input.value);
        this.remove(notification);
      });

      cancelBtn.addEventListener('click', () => {
        resolve(null);
        this.remove(notification);
      });

      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          resolve(input.value);
          this.remove(notification);
        }
      });

      this.addNotification(notification);
      input.focus();
    });
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotificationManager;
}