/**
 * Enhanced Cart Modal with comprehensive UI features
 * Replaces the basic alert-based cart display with a cyberpunk-themed modal
 */

class EnhancedCartModal {
    constructor(cartManager, userManager, notificationManager) {
        this.cartManager = cartManager;
        this.userManager = userManager;
        this.notificationManager = notificationManager;
        this.currentModal = null;
        this.keydownHandler = null;

        // Tax rate (8.5% for demo)
        this.TAX_RATE = 0.085;

        // Free shipping threshold
        this.FREE_SHIPPING_THRESHOLD = 100;
        this.SHIPPING_COST = 15;
    }

    // Calculate tax
    calculateTax(subtotal) {
        return subtotal * this.TAX_RATE;
    }

    // Calculate shipping
    calculateShipping(subtotal) {
        return subtotal >= this.FREE_SHIPPING_THRESHOLD ? 0 : this.SHIPPING_COST;
    }

    // Get cart sync status indicator
    getSyncStatusIndicator() {
        const isAuthenticated = this.userManager && this.userManager.isUserAuthenticated();
        const syncInProgress = this.cartManager.syncInProgress;

        if (!isAuthenticated) {
            return {
                icon: 'fas fa-user-slash',
                text: 'Guest Cart (Local Storage)',
                class: 'sync-guest',
                tooltip: 'Cart saved locally. Sign in to sync across devices.'
            };
        }

        if (syncInProgress) {
            return {
                icon: 'fas fa-sync fa-spin',
                text: 'Syncing...',
                class: 'sync-progress',
                tooltip: 'Synchronizing cart with server...'
            };
        }

        return {
            icon: 'fas fa-cloud-check',
            text: 'Synced',
            class: 'sync-complete',
            tooltip: 'Cart synchronized with server'
        };
    }

    // Show the enhanced cart modal
    show() {
        const items = this.cartManager.getItems();

        if (items.length === 0) {
            this.notificationManager.info('Your cart is empty!', {
                title: 'Empty Cart',
                actions: [
                    {
                        label: 'Browse Products',
                        handler: () => {
                            document.getElementById('products').scrollIntoView({
                                behavior: 'smooth'
                            });
                        }
                    }
                ]
            });
            return;
        }

        this.showModal(items);
    }

    // Create and display the modal
    showModal(items) {
        // Remove existing modal
        this.close();

        const modal = document.createElement('div');
        modal.className = 'cart-modal';

        const subtotal = this.cartManager.getTotal();
        const tax = this.calculateTax(subtotal);
        const shipping = this.calculateShipping(subtotal);
        const total = subtotal + tax + shipping;
        const itemCount = this.cartManager.getItemCount();
        const syncStatus = this.getSyncStatusIndicator();

        modal.innerHTML = this.generateModalHTML(items, subtotal, tax, shipping, total, itemCount, syncStatus);

        // Add enhanced cart modal styles
        this.addEnhancedStyles();

        // Add event listeners
        this.setupEventListeners(modal);

        // Focus management
        setTimeout(() => {
            const firstInput = modal.querySelector('.quantity-input');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);

        document.body.appendChild(modal);
        this.currentModal = modal;

        // Add animation class after a brief delay
        setTimeout(() => {
            modal.classList.add('modal-open');
        }, 10);
    }

    // Generate modal HTML
    generateModalHTML(items, subtotal, tax, shipping, total, itemCount, syncStatus) {
        return `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <div class="header-left">
                        <h2><i class="fas fa-shopping-cart"></i> Neural Cart</h2>
                        <div class="cart-sync-status ${syncStatus.class}" title="${syncStatus.tooltip}">
                            <i class="${syncStatus.icon}"></i>
                            <span>${syncStatus.text}</span>
                        </div>
                    </div>
                    <div class="header-right">
                        <span class="item-count">${itemCount} items</span>
                        <button class="modal-close" aria-label="Close cart">&times;</button>
                    </div>
                </div>
                <div class="modal-body">
                    <div class="cart-items">
                        ${items.map(item => this.generateItemHTML(item)).join('')}
                    </div>
                    <div class="cart-summary">
                        ${this.generateSummaryHTML(subtotal, tax, shipping, total, itemCount)}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="continue-shopping">
                        <i class="fas fa-arrow-left"></i>
                        Continue Shopping
                    </button>
                    <button class="checkout-btn">
                        <i class="fas fa-credit-card"></i> 
                        Secure Checkout
                    </button>
                </div>
            </div>
        `;
    }

    // Generate individual item HTML
    generateItemHTML(item) {
        return `
            <div class="cart-item" data-product-id="${item.id}">
                <div class="item-icon">
                    <i class="${item.icon}"></i>
                </div>
                <div class="item-details">
                    <h4>${item.name}</h4>
                    <p class="item-price">$${item.price.toFixed(2)} each</p>
                    ${item.inventory !== undefined ? `
                        <p class="item-stock ${item.inventory < 5 ? 'low-stock' : ''}">
                            ${item.inventory} in stock
                        </p>
                    ` : ''}
                </div>
                <div class="item-controls">
                    <button class="quantity-btn minus" 
                            data-product-id="${item.id}"
                            data-action="decrease"
                            ${item.quantity <= 1 ? 'disabled' : ''}
                            aria-label="Decrease quantity">
                        <i class="fas fa-minus"></i>
                    </button>
                    <div class="quantity-display">
                        <input type="number" 
                               class="quantity-input" 
                               value="${item.quantity}" 
                               min="1" 
                               max="${item.inventory || 999}"
                               data-product-id="${item.id}"
                               aria-label="Quantity">
                    </div>
                    <button class="quantity-btn plus" 
                            data-product-id="${item.id}"
                            data-action="increase"
                            ${item.inventory && item.quantity >= item.inventory ? 'disabled' : ''}
                            aria-label="Increase quantity">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <div class="item-total">
                    <span class="total-label">Total:</span>
                    <span class="total-amount">$${(item.price * item.quantity).toFixed(2)}</span>
                </div>
                <button class="remove-item" 
                        data-product-id="${item.id}"
                        title="Remove item"
                        aria-label="Remove ${item.name} from cart">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }

    // Generate summary HTML
    generateSummaryHTML(subtotal, tax, shipping, total, itemCount) {
        return `
            <div class="summary-section">
                <div class="summary-row">
                    <span>Subtotal (${itemCount} items):</span>
                    <span>$${subtotal.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span>Tax (${(this.TAX_RATE * 100).toFixed(1)}%):</span>
                    <span>$${tax.toFixed(2)}</span>
                </div>
                <div class="summary-row shipping">
                    <span>Shipping:</span>
                    <span class="${shipping === 0 ? 'free-shipping' : ''}">
                        ${shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}
                    </span>
                </div>
                ${shipping > 0 ? `
                    <div class="shipping-notice">
                        <i class="fas fa-info-circle"></i>
                        Free shipping on orders over $${this.FREE_SHIPPING_THRESHOLD}
                    </div>
                ` : `
                    <div class="shipping-notice free">
                        <i class="fas fa-check-circle"></i>
                        You qualify for free shipping!
                    </div>
                `}
            </div>
            <div class="summary-total">
                <div class="total-row">
                    <span>Total:</span>
                    <span>$${total.toFixed(2)}</span>
                </div>
            </div>
        `;
    }

    // Setup event listeners
    setupEventListeners(modal) {
        const closeBtn = modal.querySelector('.modal-close');
        const overlay = modal.querySelector('.modal-overlay');
        const continueBtn = modal.querySelector('.continue-shopping');
        const checkoutBtn = modal.querySelector('.checkout-btn');

        // Close handlers
        closeBtn.addEventListener('click', () => this.close());
        overlay.addEventListener('click', () => this.close());
        continueBtn.addEventListener('click', () => this.close());

        // Checkout handler
        checkoutBtn.addEventListener('click', () => this.proceedToCheckout());

        // Quantity control handlers
        modal.addEventListener('click', (e) => this.handleQuantityControls(e));
        modal.addEventListener('change', (e) => this.handleQuantityInput(e));
        modal.addEventListener('blur', (e) => this.handleQuantityBlur(e), true);

        // Keyboard navigation
        this.keydownHandler = (e) => this.handleKeydown(e);
        document.addEventListener('keydown', this.keydownHandler);
    }

    // Handle quantity control buttons
    async handleQuantityControls(e) {
        if (e.target.closest('.quantity-btn')) {
            const btn = e.target.closest('.quantity-btn');
            const productId = parseInt(btn.dataset.productId);
            const action = btn.dataset.action;
            const currentItem = this.cartManager.getItems().find(item => item.id === productId);

            if (!currentItem) return;

            let newQuantity = currentItem.quantity;
            if (action === 'increase') {
                newQuantity++;
            } else if (action === 'decrease') {
                newQuantity--;
            }

            await this.updateQuantity(productId, newQuantity);
        } else if (e.target.closest('.remove-item')) {
            const btn = e.target.closest('.remove-item');
            const productId = parseInt(btn.dataset.productId);
            await this.removeItem(productId);
        }
    }

    // Handle quantity input changes
    async handleQuantityInput(e) {
        if (e.target.classList.contains('quantity-input')) {
            const input = e.target;
            const productId = parseInt(input.dataset.productId);
            const newQuantity = parseInt(input.value);

            if (newQuantity && newQuantity > 0) {
                await this.updateQuantity(productId, newQuantity);
            }
        }
    }

    // Handle quantity input blur (validation)
    handleQuantityBlur(e) {
        if (e.target.classList.contains('quantity-input')) {
            const input = e.target;
            const productId = parseInt(input.dataset.productId);
            const currentItem = this.cartManager.getItems().find(item => item.id === productId);

            if (!currentItem) return;

            let value = parseInt(input.value);
            const min = parseInt(input.min) || 1;
            const max = parseInt(input.max) || 999;

            // Validate and correct the value
            if (isNaN(value) || value < min) {
                value = min;
            } else if (value > max) {
                value = max;
                this.notificationManager.warning(`Maximum quantity available: ${max}`);
            }

            input.value = value;

            // Update if different from current
            if (value !== currentItem.quantity) {
                this.updateQuantity(productId, value);
            }
        }
    }

    // Handle keyboard navigation
    handleKeydown(e) {
        if (!this.currentModal) return;

        switch (e.key) {
            case 'Escape':
                this.close();
                break;
            case 'Enter':
                if (e.target.classList.contains('checkout-btn')) {
                    this.proceedToCheckout();
                }
                break;
            case 'Tab':
                // Allow default tab behavior for accessibility
                break;
        }
    }

    // Update item quantity
    async updateQuantity(productId, newQuantity) {
        try {
            if (newQuantity <= 0) {
                await this.removeItem(productId);
                return;
            }

            await this.cartManager.updateQuantity(productId, newQuantity);

            // Refresh modal with updated data
            const items = this.cartManager.getItems();
            if (items.length > 0) {
                this.showModal(items);
            } else {
                this.close();
            }
        } catch (error) {
            console.error('Failed to update quantity:', error);
            this.notificationManager.error('Failed to update quantity');
        }
    }

    // Remove item from cart
    async removeItem(productId) {
        try {
            await this.cartManager.removeItem(productId);

            // Refresh modal with updated data
            const items = this.cartManager.getItems();
            if (items.length > 0) {
                this.showModal(items);
            } else {
                this.close();
                this.notificationManager.success('Item removed from cart');
            }
        } catch (error) {
            console.error('Failed to remove item:', error);
            this.notificationManager.error('Failed to remove item');
        }
    }

    // Proceed to checkout
    proceedToCheckout() {
        if (!this.userManager.isUserAuthenticated()) {
            this.notificationManager.info('Please log in to proceed to checkout', {
                title: 'Authentication Required',
                actions: [
                    {
                        label: 'Login',
                        handler: () => this.userManager.showAuthModal()
                    }
                ]
            });
            return;
        }

        // Close cart modal
        this.close();

        // Initialize checkout process
        if (window.checkoutManager) {
            window.checkoutManager.initializeCheckout();
        } else {
            this.notificationManager.error('Checkout system not available');
        }
    }

    // Close the modal
    close() {
        if (this.currentModal) {
            this.currentModal.classList.remove('modal-open');

            setTimeout(() => {
                if (this.currentModal) {
                    this.currentModal.remove();
                    this.currentModal = null;
                }
            }, 300);
        }

        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
            this.keydownHandler = null;
        }
    }

    // Add enhanced styles for the cart modal
    addEnhancedStyles() {
        if (document.querySelector('#enhanced-cart-modal-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'enhanced-cart-modal-styles';
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
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .cart-modal.modal-open {
                opacity: 1;
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
                max-width: 800px;
                width: 90%;
                max-height: 85vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 0 50px var(--neon-cyan);
                transform: scale(0.9);
                transition: transform 0.3s ease;
            }

            .cart-modal.modal-open .modal-content {
                transform: scale(1);
            }

            .cart-modal .modal-header {
                padding: 1.5rem;
                border-bottom: 1px solid var(--neon-cyan);
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                background: linear-gradient(135deg, var(--dark-bg), var(--darker-bg));
            }

            .cart-modal .header-left h2 {
                color: var(--neon-cyan);
                font-family: 'Orbitron', monospace;
                margin: 0 0 0.5rem 0;
                text-shadow: 0 0 10px var(--neon-cyan);
                font-size: 1.5rem;
            }

            .cart-modal .cart-sync-status {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.8rem;
                padding: 0.25rem 0.5rem;
                border-radius: 3px;
                font-family: 'Rajdhani', sans-serif;
                font-weight: 500;
            }

            .cart-modal .sync-guest {
                background: rgba(255, 111, 0, 0.1);
                color: var(--neon-orange);
                border: 1px solid rgba(255, 111, 0, 0.3);
            }

            .cart-modal .sync-progress {
                background: rgba(0, 229, 255, 0.1);
                color: var(--neon-cyan);
                border: 1px solid rgba(0, 229, 255, 0.3);
            }

            .cart-modal .sync-complete {
                background: rgba(76, 175, 80, 0.1);
                color: #4CAF50;
                border: 1px solid rgba(76, 175, 80, 0.3);
            }

            .cart-modal .header-right {
                display: flex;
                align-items: center;
                gap: 1rem;
            }

            .cart-modal .item-count {
                color: var(--neon-pink);
                font-family: 'Orbitron', monospace;
                font-weight: 600;
                font-size: 0.9rem;
            }

            .cart-modal .modal-close {
                background: none;
                border: none;
                color: var(--neon-pink);
                font-size: 2rem;
                cursor: pointer;
                transition: all 0.3s ease;
                padding: 0;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
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
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
            }

            .cart-modal .cart-items {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }

            .cart-item {
                display: grid;
                grid-template-columns: 60px 1fr auto auto auto;
                gap: 1rem;
                align-items: center;
                padding: 1rem;
                border: 1px solid rgba(0, 229, 255, 0.2);
                background: rgba(0, 229, 255, 0.05);
                transition: all 0.3s ease;
                position: relative;
            }

            .cart-item:hover {
                border-color: var(--neon-cyan);
                box-shadow: 0 0 15px rgba(0, 229, 255, 0.2);
            }

            .cart-item .item-icon {
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

            .cart-item .item-details h4 {
                color: var(--neon-cyan);
                margin: 0 0 0.25rem 0;
                font-family: 'Orbitron', monospace;
                font-size: 1rem;
                font-weight: 600;
            }

            .cart-item .item-price {
                color: #ccc;
                margin: 0 0 0.25rem 0;
                font-size: 0.9rem;
            }

            .cart-item .item-stock {
                color: #4CAF50;
                margin: 0;
                font-size: 0.8rem;
                font-weight: 500;
            }

            .cart-item .item-stock.low-stock {
                color: var(--neon-orange);
            }

            .cart-item .item-controls {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                background: rgba(0, 0, 0, 0.3);
                padding: 0.5rem;
                border-radius: 4px;
            }

            .cart-item .quantity-btn {
                width: 32px;
                height: 32px;
                background: var(--neon-pink);
                border: 1px solid var(--neon-pink);
                color: white;
                cursor: pointer;
                font-weight: bold;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.8rem;
            }

            .cart-item .quantity-btn:hover:not(:disabled) {
                background: var(--neon-red);
                border-color: var(--neon-red);
                box-shadow: 0 0 10px var(--neon-red);
            }

            .cart-item .quantity-btn:disabled {
                background: #666;
                border-color: #666;
                color: #999;
                cursor: not-allowed;
                opacity: 0.5;
            }

            .cart-item .quantity-display {
                position: relative;
            }

            .cart-item .quantity-input {
                width: 50px;
                height: 32px;
                text-align: center;
                background: var(--dark-bg);
                border: 1px solid var(--neon-cyan);
                color: white;
                font-weight: bold;
                font-family: 'Orbitron', monospace;
                font-size: 0.9rem;
            }

            .cart-item .quantity-input:focus {
                outline: none;
                border-color: var(--neon-pink);
                box-shadow: 0 0 10px var(--neon-pink);
            }

            .cart-item .item-total {
                text-align: right;
                min-width: 100px;
            }

            .cart-item .total-label {
                display: block;
                color: #ccc;
                font-size: 0.8rem;
                margin-bottom: 0.25rem;
            }

            .cart-item .total-amount {
                color: var(--neon-pink);
                font-weight: bold;
                font-family: 'Orbitron', monospace;
                font-size: 1.1rem;
            }

            .cart-item .remove-item {
                background: none;
                border: 1px solid var(--neon-red);
                color: var(--neon-red);
                width: 40px;
                height: 40px;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .cart-item .remove-item:hover {
                background: var(--neon-red);
                color: white;
                box-shadow: 0 0 10px var(--neon-red);
            }

            .cart-modal .cart-summary {
                border-top: 2px solid var(--neon-cyan);
                padding-top: 1.5rem;
            }

            .cart-modal .summary-section {
                margin-bottom: 1rem;
            }

            .cart-modal .summary-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 0.5rem;
                color: white;
                font-size: 1rem;
            }

            .cart-modal .summary-row.shipping {
                padding-bottom: 0.5rem;
                border-bottom: 1px solid rgba(0, 229, 255, 0.2);
            }

            .cart-modal .free-shipping {
                color: #4CAF50;
                font-weight: bold;
            }

            .cart-modal .shipping-notice {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-top: 0.5rem;
                padding: 0.5rem;
                border-radius: 4px;
                font-size: 0.9rem;
            }

            .cart-modal .shipping-notice:not(.free) {
                background: rgba(0, 229, 255, 0.1);
                color: var(--neon-cyan);
                border: 1px solid rgba(0, 229, 255, 0.3);
            }

            .cart-modal .shipping-notice.free {
                background: rgba(76, 175, 80, 0.1);
                color: #4CAF50;
                border: 1px solid rgba(76, 175, 80, 0.3);
            }

            .cart-modal .summary-total {
                background: rgba(245, 0, 87, 0.1);
                padding: 1rem;
                border: 1px solid rgba(245, 0, 87, 0.3);
                border-radius: 4px;
            }

            .cart-modal .total-row {
                display: flex;
                justify-content: space-between;
                font-size: 1.3rem;
                font-weight: bold;
                color: var(--neon-pink);
                font-family: 'Orbitron', monospace;
            }

            .cart-modal .modal-footer {
                padding: 1.5rem;
                border-top: 1px solid var(--neon-cyan);
                display: flex;
                gap: 1rem;
                justify-content: space-between;
                background: linear-gradient(135deg, var(--darker-bg), var(--dark-bg));
            }

            .cart-modal .continue-shopping {
                background: transparent;
                border: 1px solid var(--neon-cyan);
                color: var(--neon-cyan);
                padding: 12px 24px;
                font-family: 'Rajdhani', sans-serif;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
            }

            .cart-modal .continue-shopping:hover {
                background: var(--neon-cyan);
                color: var(--dark-bg);
                box-shadow: 0 0 15px var(--neon-cyan);
            }

            .cart-modal .checkout-btn {
                background: linear-gradient(45deg, var(--neon-pink), var(--neon-red));
                border: 1px solid var(--neon-pink);
                color: white;
                padding: 12px 24px;
                font-family: 'Rajdhani', sans-serif;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
            }

            .cart-modal .checkout-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 25px var(--neon-pink);
            }

            /* Mobile responsiveness */
            @media (max-width: 768px) {
                .cart-modal .modal-content {
                    width: 95%;
                    max-height: 90vh;
                }

                .cart-modal .modal-header {
                    flex-direction: column;
                    gap: 1rem;
                    align-items: stretch;
                }

                .cart-modal .header-right {
                    justify-content: space-between;
                }

                .cart-item {
                    grid-template-columns: 50px 1fr;
                    grid-template-rows: auto auto auto;
                    gap: 0.5rem;
                }

                .cart-item .item-controls {
                    grid-column: 1 / -1;
                    justify-self: center;
                }

                .cart-item .item-total {
                    grid-column: 1 / -1;
                    text-align: center;
                }

                .cart-item .remove-item {
                    position: absolute;
                    top: 0.5rem;
                    right: 0.5rem;
                    width: 30px;
                    height: 30px;
                }

                .cart-modal .modal-footer {
                    flex-direction: column;
                }
            }

            /* Accessibility improvements */
            .cart-modal .quantity-btn:focus,
            .cart-modal .remove-item:focus,
            .cart-modal .continue-shopping:focus,
            .cart-modal .checkout-btn:focus {
                outline: 2px solid var(--neon-cyan);
                outline-offset: 2px;
            }

            /* Reduced motion support */
            @media (prefers-reduced-motion: reduce) {
                .cart-modal,
                .cart-modal .modal-content,
                .cart-item,
                .quantity-btn,
                .remove-item {
                    transition: none;
                }
            }
        `;

        document.head.appendChild(styles);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedCartModal;
}