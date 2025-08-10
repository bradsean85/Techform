class CartManager {
  constructor() {
    this.cart = [];
    this.isAuthenticated = false;
    this.sessionId = this.generateSessionId();
    this.apiBaseUrl = '/api';
    this.syncInProgress = false;
    
    // Initialize cart from localStorage
    this.loadFromLocalStorage();
    
    // Set up periodic sync for authenticated users
    this.setupPeriodicSync();
  }

  // Generate a session ID for guest users
  generateSessionId() {
    let sessionId = localStorage.getItem('guestSessionId');
    if (!sessionId) {
      sessionId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('guestSessionId', sessionId);
    }
    return sessionId;
  }

  // Load cart from localStorage
  loadFromLocalStorage() {
    try {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        this.cart = JSON.parse(savedCart);
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      this.cart = [];
    }
  }

  // Save cart to localStorage
  saveToLocalStorage() {
    try {
      localStorage.setItem('cart', JSON.stringify(this.cart));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }

  // Set authentication status
  setAuthenticated(isAuth, userToken = null) {
    this.isAuthenticated = isAuth;
    this.userToken = userToken;
    
    if (isAuth && userToken) {
      // Sync cart with server when user logs in
      this.syncWithServer();
    }
  }

  // Make API request with proper headers
  async makeApiRequest(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'X-Session-ID': this.sessionId,
      ...options.headers
    };

    if (this.isAuthenticated && this.userToken) {
      headers['Authorization'] = `Bearer ${this.userToken}`;
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

  // Add item to cart
  async addItem(productId, quantity = 1) {
    try {
      // Add to local cart first for immediate UI feedback
      const existingItem = this.cart.find(item => item.id === productId);
      
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        // For local cart, we need product details
        // In a real app, you'd fetch this from the products API
        const product = await this.getProductDetails(productId);
        this.cart.push({
          ...product,
          quantity: quantity
        });
      }

      this.saveToLocalStorage();
      this.updateCartDisplay();

      // Sync with server if possible
      if (this.isAuthenticated || this.sessionId) {
        try {
          const response = await this.makeApiRequest('/cart/items', {
            method: 'POST',
            body: JSON.stringify({ productId, quantity })
          });
          
          if (response.success) {
            // Update local cart with server response
            this.updateCartFromServer(response.data);
          }
        } catch (error) {
          console.warn('Failed to sync add to cart with server:', error);
          // Continue with local cart functionality
        }
      }

      return true;
    } catch (error) {
      console.error('Error adding item to cart:', error);
      throw error;
    }
  }

  // Update item quantity
  async updateQuantity(productId, quantity) {
    try {
      if (quantity <= 0) {
        return this.removeItem(productId);
      }

      // Update local cart first
      const item = this.cart.find(item => item.id === productId);
      if (item) {
        item.quantity = quantity;
        this.saveToLocalStorage();
        this.updateCartDisplay();
      }

      // Sync with server
      if (this.isAuthenticated || this.sessionId) {
        try {
          const response = await this.makeApiRequest(`/cart/items/${productId}`, {
            method: 'PUT',
            body: JSON.stringify({ quantity })
          });
          
          if (response.success) {
            this.updateCartFromServer(response.data);
          }
        } catch (error) {
          console.warn('Failed to sync quantity update with server:', error);
        }
      }

      return true;
    } catch (error) {
      console.error('Error updating item quantity:', error);
      throw error;
    }
  }

  // Remove item from cart
  async removeItem(productId) {
    try {
      // Remove from local cart first
      this.cart = this.cart.filter(item => item.id !== productId);
      this.saveToLocalStorage();
      this.updateCartDisplay();

      // Sync with server
      if (this.isAuthenticated || this.sessionId) {
        try {
          const response = await this.makeApiRequest(`/cart/items/${productId}`, {
            method: 'DELETE'
          });
          
          if (response.success) {
            this.updateCartFromServer(response.data);
          }
        } catch (error) {
          console.warn('Failed to sync item removal with server:', error);
        }
      }

      return true;
    } catch (error) {
      console.error('Error removing item from cart:', error);
      throw error;
    }
  }

  // Clear entire cart
  async clearCart() {
    try {
      // Clear local cart first
      this.cart = [];
      this.saveToLocalStorage();
      this.updateCartDisplay();

      // Sync with server
      if (this.isAuthenticated || this.sessionId) {
        try {
          const response = await this.makeApiRequest('/cart', {
            method: 'DELETE'
          });
          
          if (response.success) {
            this.updateCartFromServer(response.data);
          }
        } catch (error) {
          console.warn('Failed to sync cart clear with server:', error);
        }
      }

      return true;
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  }

  // Sync cart with server
  async syncWithServer() {
    if (this.syncInProgress) return;
    
    try {
      this.syncInProgress = true;
      
      // If user just logged in, merge guest cart
      if (this.isAuthenticated && this.cart.length > 0) {
        try {
          await this.makeApiRequest('/cart/merge', {
            method: 'POST',
            body: JSON.stringify({ guestSessionId: this.sessionId })
          });
        } catch (error) {
          console.warn('Failed to merge guest cart:', error);
        }
      }

      // Get current cart from server
      const response = await this.makeApiRequest('/cart');
      if (response.success) {
        this.updateCartFromServer(response.data);
      }
    } catch (error) {
      console.warn('Failed to sync cart with server:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Update local cart from server response
  updateCartFromServer(serverCart) {
    if (serverCart && serverCart.items) {
      // Convert server cart format to local cart format
      this.cart = serverCart.items.map(item => ({
        id: item.productId,
        name: item.product.name,
        price: item.product.price,
        icon: item.product.icon,
        quantity: item.quantity,
        inventory: item.product.inventory,
        isActive: item.product.isActive
      }));
      
      this.saveToLocalStorage();
      this.updateCartDisplay();
    }
  }

  // Get product details (placeholder - would typically fetch from API)
  async getProductDetails(productId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/products/${productId}`);
      if (response.ok) {
        const data = await response.json();
        return data.success ? data.data : null;
      }
    } catch (error) {
      console.warn('Failed to fetch product details:', error);
    }
    
    // Fallback to hardcoded products for demo
    const products = [
      {
        id: 1,
        name: "NEURAL AUDIO LINK",
        description: "Direct neural interface earbuds with quantum noise cancellation and 72-hour bio-battery",
        price: 1999.99,
        icon: "fas fa-brain"
      },
      {
        id: 2,
        name: "BIOMETRIC SYNC WATCH",
        description: "Cybernetic wrist interface with real-time vitals monitoring and AR projection",
        price: 2999.99,
        icon: "fas fa-heartbeat"
      },
      {
        id: 3,
        name: "QUANTUM POWER CELL",
        description: "Miniaturized fusion reactor with wireless energy transmission and EMP shielding",
        price: 799.99,
        icon: "fas fa-atom"
      },
      {
        id: 4,
        name: "HOLO-REC IMPLANT",
        description: "Retinal implant camera with 8K holographic recording and memory encryption",
        price: 4999.99,
        icon: "fas fa-eye"
      },
      {
        id: 5,
        name: "TACTILE INTERFACE DECK",
        description: "Haptic feedback keyboard with neural response keys and quantum encryption",
        price: 1299.99,
        icon: "fas fa-microchip"
      },
      {
        id: 6,
        name: "WIRELESS ENERGY MATRIX",
        description: "Ambient energy harvesting pad with quantum field manipulation technology",
        price: 399.99,
        icon: "fas fa-bolt"
      }
    ];
    
    return products.find(p => p.id === productId);
  }

  // Get cart total
  getTotal() {
    return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  // Get total item count
  getItemCount() {
    return this.cart.reduce((count, item) => count + item.quantity, 0);
  }

  // Get cart items
  getItems() {
    return [...this.cart];
  }

  // Update cart display in UI
  updateCartDisplay() {
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
      cartCount.textContent = this.getItemCount();
    }

    // Dispatch custom event for other components to listen to
    window.dispatchEvent(new CustomEvent('cartUpdated', {
      detail: {
        items: this.getItems(),
        total: this.getTotal(),
        itemCount: this.getItemCount()
      }
    }));
  }

  // Setup periodic sync for authenticated users
  setupPeriodicSync() {
    setInterval(() => {
      if (this.isAuthenticated && !this.syncInProgress) {
        this.syncWithServer();
      }
    }, 30000); // Sync every 30 seconds
  }

  // Validate cart items with server
  async validateCart() {
    try {
      const response = await this.makeApiRequest('/cart/validate');
      if (response.success) {
        return {
          isValid: response.data.isValid,
          issues: response.data.issues || []
        };
      }
    } catch (error) {
      console.warn('Failed to validate cart:', error);
    }
    
    return { isValid: true, issues: [] };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CartManager;
}