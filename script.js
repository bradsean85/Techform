// Global managers
let apiClient;
let notificationManager;
let productManager;
let cartManager;
let userManager;
let enhancedCartModal;
let checkoutManager;

// Initialize the website
document.addEventListener('DOMContentLoaded', function() {
    initializeManagers();
    setupGlobalEventListeners();
    setupSmoothScrolling();
});

// Initialize all managers
function initializeManagers() {
    // Initialize API client
    apiClient = new ApiClient();
    
    // Initialize notification manager
    notificationManager = new NotificationManager();
    
    // Initialize user manager
    userManager = new UserManager(apiClient);
    
    // Initialize cart manager
    cartManager = new CartManager();
    
    // Initialize product manager
    productManager = new ProductManager(apiClient);
    
    // Initialize enhanced cart modal
    enhancedCartModal = new EnhancedCartModal(cartManager, userManager, notificationManager);
    
    // Initialize checkout manager
    checkoutManager = new CheckoutManager(apiClient, cartManager, userManager, notificationManager);
    
    // Make managers globally available
    window.apiClient = apiClient;
    window.notificationManager = notificationManager;
    window.productManager = productManager;
    window.cartManager = cartManager;
    window.userManager = userManager;
    window.enhancedCartModal = enhancedCartModal;
    window.checkoutManager = checkoutManager;
    
    // Set up authentication integration
    setupAuthIntegration();
}

// Setup authentication integration
function setupAuthIntegration() {
    // Listen for authentication events
    window.addEventListener('userAuthenticated', function(event) {
        const { user, token } = event.detail;
        
        // Update API client token
        apiClient.setToken(token);
        
        // Update cart manager authentication status
        cartManager.setAuthenticated(true, token);
        
        // Sync cart with server
        cartManager.syncWithServer();
        
        notificationManager.success(`Welcome back, ${user.firstName}!`);
    });
    
    window.addEventListener('userLoggedOut', function() {
        // Clear API client token
        apiClient.setToken(null);
        
        // Update cart manager authentication status
        cartManager.setAuthenticated(false);
        
        notificationManager.info('You have been logged out');
    });
}

// Setup global event listeners
function setupGlobalEventListeners() {
    // Listen for add to cart events from product manager
    window.addEventListener('addToCart', async function(event) {
        const { productId, quantity } = event.detail;
        
        try {
            await cartManager.addItem(productId, quantity);
            showAddToCartFeedback();
        } catch (error) {
            console.error('Failed to add item to cart:', error);
            notificationManager.error('Failed to add item to cart');
        }
    });
    
    // Listen for cart updates
    window.addEventListener('cartUpdated', function(event) {
        updateCartDisplay(event.detail);
    });
    
    // Shopping cart click handler
    const cartIcon = document.querySelector('.fa-shopping-cart');
    if (cartIcon) {
        cartIcon.addEventListener('click', function() {
            enhancedCartModal.show();
        });
    }
    
    // Initial cart display update
    setTimeout(() => {
        updateCartDisplay({
            items: cartManager.getItems(),
            total: cartManager.getTotal(),
            itemCount: cartManager.getItemCount()
        });
    }, 100);
}

// Setup smooth scrolling for navigation
function setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Update cart display
function updateCartDisplay(cartData) {
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
        cartCount.textContent = cartData.itemCount;
        
        // Add pulse animation for updates
        cartCount.style.animation = 'none';
        setTimeout(() => {
            cartCount.style.animation = 'pulse 0.5s ease';
        }, 10);
    }
}

// Show feedback when item is added to cart
function showAddToCartFeedback() {
    const cartIcon = document.querySelector('.fa-shopping-cart');
    if (cartIcon) {
        cartIcon.style.color = '#00d4ff';
        cartIcon.style.transform = 'scale(1.2)';
        cartIcon.style.textShadow = '0 0 15px #00d4ff';
        
        setTimeout(() => {
            cartIcon.style.color = '';
            cartIcon.style.transform = '';
            cartIcon.style.textShadow = '';
        }, 500);
    }
}

// Legacy cart functions for backward compatibility
function showCart() {
    enhancedCartModal.show();
}

// Cart management functions for backward compatibility
function updateCartQuantity(productId, newQuantity) {
    // This will be handled by the enhanced cart modal
    console.warn('updateCartQuantity is deprecated. Use EnhancedCartModal instead.');
}

function removeCartItem(productId) {
    // This will be handled by the enhanced cart modal
    console.warn('removeCartItem is deprecated. Use EnhancedCartModal instead.');
}

function closeCartModal() {
    if (enhancedCartModal) {
        enhancedCartModal.close();
    }
}

function proceedToCheckout() {
    if (enhancedCartModal) {
        enhancedCartModal.proceedToCheckout();
    }
}

// Removed old showCartModal function - replaced with EnhancedCartModal
    
    const total = cartManager.getTotal();
    const itemCount = cartManager.getItemCount();
    
    modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-shopping-cart"></i> Neural Cart (${itemCount} items)</h2>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="cart-items">
                    ${items.map(item => `
                        <div class="cart-item" data-product-id="${item.id}">
                            <div class="item-icon">
                                <i class="${item.icon}"></i>
                            </div>
                            <div class="item-details">
                                <h4>${item.name}</h4>
                                <p class="item-price">$${item.price.toFixed(2)}</p>
                            </div>
                            <div class="item-controls">
                                <button class="quantity-btn minus" onclick="updateCartQuantity(${item.id}, ${item.quantity - 1})">-</button>
                                <span class="quantity">${item.quantity}</span>
                                <button class="quantity-btn plus" onclick="updateCartQuantity(${item.id}, ${item.quantity + 1})">+</button>
                            </div>
                            <div class="item-total">
                                $${(item.price * item.quantity).toFixed(2)}
                            </div>
                            <button class="remove-item" onclick="removeCartItem(${item.id})" title="Remove item">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
                <div class="cart-summary">
                    <div class="summary-row">
                        <span>Subtotal:</span>
                        <span>$${total.toFixed(2)}</span>
                    </div>
                    <div class="summary-row">
                        <span>Shipping:</span>
                        <span>FREE</span>
                    </div>
                    <div class="summary-row total">
                        <span>Total:</span>
                        <span>$${total.toFixed(2)}</span>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="continue-shopping" onclick="closeCartModal()">Continue Shopping</button>
                <button class="checkout-btn" onclick="proceedToCheckout()">
                    <i class="fas fa-credit-card"></i> Checkout
                </button>
            </div>
        </div>
    `;

    // Add cart modal styles
    addCartModalStyles();

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

// Add cart modal styles
function addCartModalStyles() {
    if (document.querySelector('#cart-modal-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'cart-modal-styles';
    styles.textContent = `
        .cart-modal {
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

        .cart-modal .modal-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(5px);
        }

        .cart-modal .modal-content {
            position: relative;
            background: linear-gradient(145deg, var(--darker-bg), var(--dark-bg));
            border: 2px solid var(--neon-cyan);
            max-width: 700px;
            width: 90%;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 0 50px var(--neon-cyan);
        }

        .cart-modal .modal-header {
            padding: 1.5rem;
            border-bottom: 1px solid var(--neon-cyan);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .cart-modal .modal-header h2 {
            color: var(--neon-cyan);
            font-family: 'Orbitron', monospace;
            margin: 0;
            text-shadow: 0 0 10px var(--neon-cyan);
        }

        .cart-modal .modal-close {
            background: none;
            border: none;
            color: var(--neon-pink);
            font-size: 2rem;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .cart-modal .modal-close:hover {
            color: var(--neon-red);
            text-shadow: 0 0 10px var(--neon-red);
            transform: scale(1.2);
        }

        .cart-modal .modal-body {
            flex: 1;
            overflow-y: auto;
            padding: 1.5rem;
        }

        .cart-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            border: 1px solid rgba(0, 229, 255, 0.2);
            margin-bottom: 1rem;
            background: rgba(0, 229, 255, 0.05);
            transition: all 0.3s ease;
        }

        .cart-item:hover {
            border-color: var(--neon-cyan);
            box-shadow: 0 0 15px rgba(0, 229, 255, 0.2);
        }

        .item-icon {
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--dark-bg);
            border: 1px solid var(--neon-orange);
            color: var(--neon-orange);
            font-size: 1.5rem;
        }

        .item-details {
            flex: 1;
        }

        .item-details h4 {
            color: var(--neon-cyan);
            margin: 0 0 0.5rem 0;
            font-family: 'Orbitron', monospace;
            font-size: 1rem;
        }

        .item-price {
            color: #ccc;
            margin: 0;
            font-size: 0.9rem;
        }

        .item-controls {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .quantity-btn {
            width: 30px;
            height: 30px;
            background: var(--neon-pink);
            border: 1px solid var(--neon-pink);
            color: white;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.3s ease;
        }

        .quantity-btn:hover {
            background: var(--neon-red);
            border-color: var(--neon-red);
            box-shadow: 0 0 10px var(--neon-red);
        }

        .quantity {
            min-width: 30px;
            text-align: center;
            color: white;
            font-weight: bold;
        }

        .item-total {
            min-width: 80px;
            text-align: right;
            color: var(--neon-pink);
            font-weight: bold;
            font-family: 'Orbitron', monospace;
        }

        .remove-item {
            background: none;
            border: 1px solid var(--neon-red);
            color: var(--neon-red);
            width: 35px;
            height: 35px;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .remove-item:hover {
            background: var(--neon-red);
            color: white;
            box-shadow: 0 0 10px var(--neon-red);
        }

        .cart-summary {
            border-top: 1px solid var(--neon-cyan);
            padding-top: 1rem;
            margin-top: 1rem;
        }

        .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.5rem;
            color: white;
        }

        .summary-row.total {
            font-size: 1.2rem;
            font-weight: bold;
            color: var(--neon-pink);
            border-top: 1px solid rgba(245, 0, 87, 0.3);
            padding-top: 0.5rem;
            margin-top: 1rem;
            font-family: 'Orbitron', monospace;
        }

        .cart-modal .modal-footer {
            padding: 1.5rem;
            border-top: 1px solid var(--neon-cyan);
            display: flex;
            gap: 1rem;
            justify-content: space-between;
        }

        .continue-shopping {
            background: transparent;
            border: 1px solid var(--neon-cyan);
            color: var(--neon-cyan);
            padding: 12px 24px;
            font-family: 'Rajdhani', sans-serif;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            flex: 1;
        }

        .continue-shopping:hover {
            background: var(--neon-cyan);
            color: var(--dark-bg);
            box-shadow: 0 0 15px var(--neon-cyan);
        }

        .checkout-btn {
            background: linear-gradient(45deg, var(--neon-pink), var(--neon-red));
            border: 1px solid var(--neon-pink);
            color: white;
            padding: 12px 24px;
            font-family: 'Rajdhani', sans-serif;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            flex: 1;
        }

        .checkout-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 25px var(--neon-pink);
        }

        @media (max-width: 768px) {
            .cart-item {
                flex-wrap: wrap;
                gap: 0.5rem;
            }

            .item-controls {
                order: 3;
            }

            .item-total {
                order: 4;
                width: 100%;
                text-align: left;
                margin-top: 0.5rem;
            }
        }
    `;

    document.head.appendChild(styles);
}

// Old cart management functions removed - functionality moved to EnhancedCartModal