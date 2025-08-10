class ProductManager {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.products = [];
    this.filteredProducts = [];
    this.currentFilters = {};
    this.searchQuery = '';
    this.isLoading = false;
    
    // DOM elements
    this.productGrid = document.getElementById('productGrid');
    this.searchInput = null;
    this.filterContainer = null;
    
    this.init();
  }

  init() {
    this.setupSearchUI();
    this.setupFilterUI();
    this.loadProducts();
  }

  // Setup search UI
  setupSearchUI() {
    const searchIcon = document.querySelector('.fa-search');
    if (searchIcon) {
      // Replace simple click with proper search input
      searchIcon.addEventListener('click', () => {
        this.toggleSearchInput();
      });
    }
  }

  // Toggle search input visibility
  toggleSearchInput() {
    if (!this.searchInput) {
      this.createSearchInput();
    } else {
      this.removeSearchInput();
    }
  }

  // Create search input element
  createSearchInput() {
    const navIcons = document.querySelector('.nav-icons');
    
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.placeholder = 'Search products...';
    this.searchInput.className = 'search-input';
    this.searchInput.style.cssText = `
      background: var(--dark-bg);
      border: 1px solid var(--neon-cyan);
      color: white;
      padding: 8px 12px;
      margin-right: 10px;
      border-radius: 0;
      font-family: 'Rajdhani', sans-serif;
      box-shadow: 0 0 10px var(--neon-cyan);
      transition: all 0.3s ease;
    `;

    // Add event listeners
    this.searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.debounceSearch();
    });

    this.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.performSearch();
      }
    });

    this.searchInput.addEventListener('blur', () => {
      setTimeout(() => this.removeSearchInput(), 200);
    });

    navIcons.insertBefore(this.searchInput, navIcons.firstChild);
    this.searchInput.focus();
  }

  // Remove search input
  removeSearchInput() {
    if (this.searchInput) {
      this.searchInput.remove();
      this.searchInput = null;
    }
  }

  // Debounced search
  debounceSearch() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.performSearch();
    }, 300);
  }

  // Setup filter UI
  setupFilterUI() {
    // Create filter container if it doesn't exist
    const productsSection = document.getElementById('products');
    const container = productsSection.querySelector('.container');
    
    if (!this.filterContainer) {
      this.filterContainer = document.createElement('div');
      this.filterContainer.className = 'filter-container';
      this.filterContainer.style.cssText = `
        display: flex;
        justify-content: center;
        gap: 1rem;
        margin-bottom: 2rem;
        flex-wrap: wrap;
      `;
      
      container.insertBefore(this.filterContainer, this.productGrid);
      this.createFilterButtons();
    }
  }

  // Create filter buttons
  createFilterButtons() {
    const categories = ['All', 'Neural', 'Biometric', 'Quantum', 'Holo', 'Tactile', 'Wireless'];
    
    categories.forEach(category => {
      const button = document.createElement('button');
      button.textContent = category;
      button.className = 'filter-button';
      button.dataset.category = category.toLowerCase();
      
      button.style.cssText = `
        background: ${category === 'All' ? 'var(--neon-cyan)' : 'transparent'};
        border: 1px solid var(--neon-cyan);
        color: ${category === 'All' ? 'var(--dark-bg)' : 'var(--neon-cyan)'};
        padding: 8px 16px;
        font-family: 'Rajdhani', sans-serif;
        font-weight: 500;
        text-transform: uppercase;
        cursor: pointer;
        transition: all 0.3s ease;
        letter-spacing: 1px;
      `;

      button.addEventListener('click', () => {
        this.setActiveFilter(button, category.toLowerCase());
      });

      button.addEventListener('mouseenter', () => {
        if (!button.classList.contains('active')) {
          button.style.background = 'var(--neon-cyan)';
          button.style.color = 'var(--dark-bg)';
          button.style.boxShadow = '0 0 15px var(--neon-cyan)';
        }
      });

      button.addEventListener('mouseleave', () => {
        if (!button.classList.contains('active')) {
          button.style.background = 'transparent';
          button.style.color = 'var(--neon-cyan)';
          button.style.boxShadow = 'none';
        }
      });

      this.filterContainer.appendChild(button);
    });
  }

  // Set active filter
  setActiveFilter(activeButton, category) {
    // Update button states
    this.filterContainer.querySelectorAll('.filter-button').forEach(btn => {
      btn.classList.remove('active');
      btn.style.background = 'transparent';
      btn.style.color = 'var(--neon-cyan)';
      btn.style.boxShadow = 'none';
    });

    activeButton.classList.add('active');
    activeButton.style.background = 'var(--neon-cyan)';
    activeButton.style.color = 'var(--dark-bg)';
    activeButton.style.boxShadow = '0 0 15px var(--neon-cyan)';

    // Apply filter
    this.currentFilters.category = category === 'all' ? null : category;
    this.applyFilters();
  }

  // Load products from API or fallback data
  async loadProducts(filters = {}) {
    this.showLoading(true);
    
    try {
      // Try to load from API first
      if (this.apiClient) {
        const response = await this.apiClient.get('/products', { params: filters });
        if (response.success) {
          this.products = response.data;
        } else {
          throw new Error('API request failed');
        }
      } else {
        throw new Error('No API client available');
      }
    } catch (error) {
      console.warn('Failed to load products from API, using fallback data:', error);
      // Fallback to hardcoded products
      this.products = this.getFallbackProducts();
    }
    
    this.filteredProducts = [...this.products];
    this.renderProducts();
    this.showLoading(false);
  }

  // Get fallback products
  getFallbackProducts() {
    return [
      {
        id: 1,
        name: "NEURAL AUDIO LINK",
        description: "Direct neural interface earbuds with quantum noise cancellation and 72-hour bio-battery",
        price: 1999.99,
        icon: "fas fa-brain",
        category: "neural",
        inventory: 15,
        isActive: true
      },
      {
        id: 2,
        name: "BIOMETRIC SYNC WATCH",
        description: "Cybernetic wrist interface with real-time vitals monitoring and AR projection",
        price: 2999.99,
        icon: "fas fa-heartbeat",
        category: "biometric",
        inventory: 8,
        isActive: true
      },
      {
        id: 3,
        name: "QUANTUM POWER CELL",
        description: "Miniaturized fusion reactor with wireless energy transmission and EMP shielding",
        price: 799.99,
        icon: "fas fa-atom",
        category: "quantum",
        inventory: 25,
        isActive: true
      },
      {
        id: 4,
        name: "HOLO-REC IMPLANT",
        description: "Retinal implant camera with 8K holographic recording and memory encryption",
        price: 4999.99,
        icon: "fas fa-eye",
        category: "holo",
        inventory: 3,
        isActive: true
      },
      {
        id: 5,
        name: "TACTILE INTERFACE DECK",
        description: "Haptic feedback keyboard with neural response keys and quantum encryption",
        price: 1299.99,
        icon: "fas fa-microchip",
        category: "tactile",
        inventory: 12,
        isActive: true
      },
      {
        id: 6,
        name: "WIRELESS ENERGY MATRIX",
        description: "Ambient energy harvesting pad with quantum field manipulation technology",
        price: 399.99,
        icon: "fas fa-bolt",
        category: "wireless",
        inventory: 20,
        isActive: true
      }
    ];
  }

  // Search products
  async searchProducts(query) {
    this.searchQuery = query;
    this.performSearch();
  }

  // Perform search
  performSearch() {
    if (!this.searchQuery.trim()) {
      this.filteredProducts = [...this.products];
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredProducts = this.products.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        (product.category && product.category.toLowerCase().includes(query))
      );
    }
    
    this.applyFilters();
  }

  // Apply current filters
  applyFilters() {
    let filtered = [...this.products];

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        (product.category && product.category.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    if (this.currentFilters.category) {
      filtered = filtered.filter(product =>
        product.category && product.category.toLowerCase().includes(this.currentFilters.category)
      );
    }

    this.filteredProducts = filtered;
    this.renderProducts();
  }

  // Render products
  renderProducts() {
    if (!this.productGrid) return;

    this.productGrid.innerHTML = '';

    if (this.filteredProducts.length === 0) {
      this.showNoResults();
      return;
    }

    this.filteredProducts.forEach(product => {
      const productCard = this.createProductCard(product);
      this.productGrid.appendChild(productCard);
    });
  }

  // Create product card
  createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.productId = product.id;

    const isOutOfStock = product.inventory <= 0;
    const isLowStock = product.inventory > 0 && product.inventory <= 5;

    card.innerHTML = `
      <div class="product-image">
        <i class="${product.icon}"></i>
        ${isOutOfStock ? '<div class="stock-overlay">OUT OF STOCK</div>' : ''}
        ${isLowStock ? '<div class="stock-indicator">LOW STOCK</div>' : ''}
      </div>
      <h3>${product.name}</h3>
      <p>${product.description}</p>
      <div class="product-price">$${product.price.toFixed(2)}</div>
      <div class="product-actions">
        <button class="add-to-cart" 
                onclick="window.productManager.addToCart(${product.id})"
                ${isOutOfStock ? 'disabled' : ''}>
          ${isOutOfStock ? 'OUT OF STOCK' : 'Add to Cart'}
        </button>
        <button class="view-details" onclick="window.productManager.showProductDetails(${product.id})">
          View Details
        </button>
      </div>
    `;

    // Add click handler for card
    card.addEventListener('click', (e) => {
      if (!e.target.closest('button')) {
        this.showProductDetails(product.id);
      }
    });

    return card;
  }

  // Show no results message
  showNoResults() {
    this.productGrid.innerHTML = `
      <div class="no-results">
        <i class="fas fa-search" style="font-size: 4rem; color: var(--neon-cyan); margin-bottom: 1rem;"></i>
        <h3 style="color: var(--neon-cyan); margin-bottom: 1rem;">No Products Found</h3>
        <p style="color: #ccc;">Try adjusting your search or filters</p>
        <button onclick="window.productManager.clearFilters()" 
                style="margin-top: 1rem; background: var(--neon-pink); border: 1px solid var(--neon-pink); color: white; padding: 10px 20px; cursor: pointer;">
          Clear Filters
        </button>
      </div>
    `;
  }

  // Clear all filters
  clearFilters() {
    this.searchQuery = '';
    this.currentFilters = {};
    
    // Reset filter buttons
    this.filterContainer.querySelectorAll('.filter-button').forEach(btn => {
      btn.classList.remove('active');
      btn.style.background = 'transparent';
      btn.style.color = 'var(--neon-cyan)';
      btn.style.boxShadow = 'none';
    });

    // Set "All" as active
    const allButton = this.filterContainer.querySelector('[data-category="all"]');
    if (allButton) {
      allButton.classList.add('active');
      allButton.style.background = 'var(--neon-cyan)';
      allButton.style.color = 'var(--dark-bg)';
    }

    this.filteredProducts = [...this.products];
    this.renderProducts();
  }

  // Add to cart
  async addToCart(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    if (product.inventory <= 0) {
      this.showNotification('Product is out of stock', 'error');
      return;
    }

    try {
      // Dispatch event for cart manager to handle
      window.dispatchEvent(new CustomEvent('addToCart', {
        detail: { productId, quantity: 1 }
      }));
      
      this.showNotification(`${product.name} added to cart!`, 'success');
    } catch (error) {
      console.error('Failed to add item to cart:', error);
      this.showNotification('Failed to add item to cart', 'error');
    }
  }

  // Show product details modal
  showProductDetails(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    this.createProductModal(product);
  }

  // Create product details modal
  createProductModal(product) {
    // Remove existing modal
    const existingModal = document.querySelector('.product-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'product-modal';
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <button class="modal-close">&times;</button>
        <div class="modal-body">
          <div class="modal-image">
            <i class="${product.icon}"></i>
          </div>
          <div class="modal-details">
            <h2>${product.name}</h2>
            <p class="modal-description">${product.description}</p>
            <div class="modal-price">$${product.price.toFixed(2)}</div>
            <div class="modal-stock">
              Stock: <span class="${product.inventory <= 5 ? 'low-stock' : ''}">${product.inventory} units</span>
            </div>
            <div class="modal-actions">
              <button class="modal-add-to-cart" 
                      onclick="window.productManager.addToCart(${product.id})"
                      ${product.inventory <= 0 ? 'disabled' : ''}>
                ${product.inventory <= 0 ? 'OUT OF STOCK' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add modal styles
    this.addModalStyles();

    // Add event listeners
    const closeBtn = modal.querySelector('.modal-close');
    const overlay = modal.querySelector('.modal-overlay');
    
    closeBtn.addEventListener('click', () => modal.remove());
    overlay.addEventListener('click', () => modal.remove());
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') modal.remove();
    });

    document.body.appendChild(modal);
  }

  // Add modal styles
  addModalStyles() {
    if (document.querySelector('#product-modal-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'product-modal-styles';
    styles.textContent = `
      .product-modal {
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

      .modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(5px);
      }

      .modal-content {
        position: relative;
        background: linear-gradient(145deg, var(--darker-bg), var(--dark-bg));
        border: 2px solid var(--neon-cyan);
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 0 50px var(--neon-cyan);
      }

      .modal-close {
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

      .modal-close:hover {
        color: var(--neon-red);
        text-shadow: 0 0 10px var(--neon-red);
        transform: scale(1.2);
      }

      .modal-body {
        padding: 2rem;
        display: flex;
        gap: 2rem;
        flex-direction: column;
      }

      .modal-image {
        width: 100%;
        height: 200px;
        background: linear-gradient(45deg, var(--dark-bg), var(--darker-bg));
        border: 2px solid var(--neon-orange);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 5rem;
        color: var(--neon-orange);
        text-shadow: 0 0 20px var(--neon-orange);
      }

      .modal-details h2 {
        color: var(--neon-cyan);
        font-family: 'Orbitron', monospace;
        font-size: 1.8rem;
        margin-bottom: 1rem;
        text-shadow: 0 0 10px var(--neon-cyan);
      }

      .modal-description {
        color: #ccc;
        line-height: 1.6;
        margin-bottom: 1.5rem;
        font-size: 1.1rem;
      }

      .modal-price {
        font-size: 2rem;
        font-weight: bold;
        font-family: 'Orbitron', monospace;
        color: var(--neon-pink);
        margin-bottom: 1rem;
        text-shadow: 0 0 15px var(--neon-pink);
      }

      .modal-stock {
        color: #ccc;
        margin-bottom: 2rem;
        font-size: 1.1rem;
      }

      .modal-stock .low-stock {
        color: var(--neon-red);
        font-weight: bold;
      }

      .modal-add-to-cart {
        background: linear-gradient(45deg, var(--neon-red), var(--neon-orange));
        color: white;
        border: 2px solid var(--neon-red);
        padding: 15px 30px;
        font-family: 'Rajdhani', sans-serif;
        font-weight: 600;
        font-size: 1.2rem;
        text-transform: uppercase;
        letter-spacing: 1px;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 0 15px rgba(255, 61, 0, 0.3);
        width: 100%;
      }

      .modal-add-to-cart:hover:not(:disabled) {
        transform: translateY(-2px);
        border-color: var(--neon-cyan);
        box-shadow: 0 5px 25px var(--neon-red);
      }

      .modal-add-to-cart:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      @media (min-width: 768px) {
        .modal-body {
          flex-direction: row;
        }

        .modal-image {
          width: 250px;
          flex-shrink: 0;
        }
      }
    `;

    document.head.appendChild(styles);
  }

  // Show loading state
  showLoading(show) {
    this.isLoading = show;
    
    if (show) {
      this.productGrid.innerHTML = `
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <p>Loading products...</p>
        </div>
      `;
      this.addLoadingStyles();
    }
  }

  // Add loading styles
  addLoadingStyles() {
    if (document.querySelector('#loading-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'loading-styles';
    styles.textContent = `
      .loading-container {
        grid-column: 1 / -1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem;
        color: var(--neon-cyan);
      }

      .loading-spinner {
        width: 50px;
        height: 50px;
        border: 3px solid transparent;
        border-top: 3px solid var(--neon-cyan);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 1rem;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;

    document.head.appendChild(styles);
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

    // Add animation styles if not present
    if (!document.querySelector('#notification-styles')) {
      const styles = document.createElement('style');
      styles.id = 'notification-styles';
      styles.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(styles);
    }
  }

  // Get product by ID
  getProduct(productId) {
    return this.products.find(p => p.id === productId);
  }

  // Refresh products
  async refresh() {
    await this.loadProducts();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProductManager;
}