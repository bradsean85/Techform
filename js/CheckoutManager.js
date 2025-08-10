/**
 * CheckoutManager - Handles checkout process and order management
 */
class CheckoutManager {
  constructor(apiClient, cartManager, userManager, notificationManager) {
    this.apiClient = apiClient;
    this.cartManager = cartManager;
    this.userManager = userManager;
    this.notificationManager = notificationManager;
    this.currentStep = 1;
    this.orderData = {
      shippingAddress: {},
      paymentMethod: null,
      items: []
    };
  }

  /**
   * Initialize checkout process
   */
  async initializeCheckout() {
    try {
      // Check if user is logged in
      const currentUser = this.userManager.getCurrentUser();
      if (!currentUser) {
        this.notificationManager.show('Please log in to proceed with checkout', 'warning');
        return false;
      }

      // Get cart items
      const cartItems = this.cartManager.getItems();
      if (!cartItems || cartItems.length === 0) {
        this.notificationManager.show('Your cart is empty', 'warning');
        return false;
      }

      // Prepare order items
      this.orderData.items = cartItems.map(item => ({
        productId: item.id,
        quantity: item.quantity
      }));

      // Show checkout modal
      this.showCheckoutModal();
      return true;

    } catch (error) {
      console.error('Checkout initialization error:', error);
      this.notificationManager.show('Failed to initialize checkout', 'error');
      return false;
    }
  }

  /**
   * Show checkout modal
   */
  showCheckoutModal() {
    const modal = this.createCheckoutModal();
    document.body.appendChild(modal);
    
    // Show modal with animation
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);

    // Focus first input
    const firstInput = modal.querySelector('input');
    if (firstInput) {
      firstInput.focus();
    }
  }

  /**
   * Create checkout modal HTML
   */
  createCheckoutModal() {
    const modal = document.createElement('div');
    modal.className = 'checkout-modal';
    modal.innerHTML = `
      <div class="checkout-modal-content">
        <div class="checkout-header">
          <h2>Checkout</h2>
          <button class="close-btn" onclick="this.closest('.checkout-modal').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="checkout-progress">
          <div class="progress-step ${this.currentStep >= 1 ? 'active' : ''}" data-step="1">
            <div class="step-number">1</div>
            <div class="step-label">Shipping</div>
          </div>
          <div class="progress-step ${this.currentStep >= 2 ? 'active' : ''}" data-step="2">
            <div class="step-number">2</div>
            <div class="step-label">Payment</div>
          </div>
          <div class="progress-step ${this.currentStep >= 3 ? 'active' : ''}" data-step="3">
            <div class="step-number">3</div>
            <div class="step-label">Review</div>
          </div>
        </div>

        <div class="checkout-content">
          ${this.renderCurrentStep()}
        </div>

        <div class="checkout-actions">
          ${this.renderStepActions()}
        </div>
      </div>
    `;

    // Add event listeners
    this.addCheckoutEventListeners(modal);
    
    return modal;
  }

  /**
   * Render current checkout step
   */
  renderCurrentStep() {
    switch (this.currentStep) {
      case 1:
        return this.renderShippingStep();
      case 2:
        return this.renderPaymentStep();
      case 3:
        return this.renderReviewStep();
      default:
        return this.renderShippingStep();
    }
  }

  /**
   * Render shipping address step
   */
  renderShippingStep() {
    const currentUser = this.userManager.getCurrentUser();
    const savedAddress = this.orderData.shippingAddress;

    return `
      <div class="checkout-step shipping-step">
        <h3>Shipping Address</h3>
        <form class="shipping-form">
          <div class="form-row">
            <div class="form-group">
              <label for="firstName">First Name *</label>
              <input type="text" id="firstName" name="firstName" 
                     value="${savedAddress.firstName || currentUser?.firstName || ''}" required>
            </div>
            <div class="form-group">
              <label for="lastName">Last Name *</label>
              <input type="text" id="lastName" name="lastName" 
                     value="${savedAddress.lastName || currentUser?.lastName || ''}" required>
            </div>
          </div>
          
          <div class="form-group">
            <label for="street">Street Address *</label>
            <input type="text" id="street" name="street" 
                   value="${savedAddress.street || ''}" required>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="city">City *</label>
              <input type="text" id="city" name="city" 
                     value="${savedAddress.city || ''}" required>
            </div>
            <div class="form-group">
              <label for="state">State *</label>
              <input type="text" id="state" name="state" 
                     value="${savedAddress.state || ''}" required>
            </div>
            <div class="form-group">
              <label for="zipCode">ZIP Code *</label>
              <input type="text" id="zipCode" name="zipCode" 
                     value="${savedAddress.zipCode || ''}" required>
            </div>
          </div>
          
          <div class="form-group">
            <label for="country">Country *</label>
            <select id="country" name="country" required>
              <option value="US" ${savedAddress.country === 'US' ? 'selected' : ''}>United States</option>
              <option value="CA" ${savedAddress.country === 'CA' ? 'selected' : ''}>Canada</option>
              <option value="MX" ${savedAddress.country === 'MX' ? 'selected' : ''}>Mexico</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="phone">Phone Number</label>
            <input type="tel" id="phone" name="phone" 
                   value="${savedAddress.phone || currentUser?.phone || ''}">
          </div>
        </form>
      </div>
    `;
  }

  /**
   * Render payment method step
   */
  renderPaymentStep() {
    return `
      <div class="checkout-step payment-step">
        <h3>Payment Method</h3>
        <div class="payment-methods">
          <div class="payment-method ${this.orderData.paymentMethod === 'credit_card' ? 'selected' : ''}" 
               data-method="credit_card">
            <div class="payment-method-header">
              <input type="radio" name="paymentMethod" value="credit_card" 
                     ${this.orderData.paymentMethod === 'credit_card' ? 'checked' : ''}>
              <label>Credit Card</label>
              <div class="card-icons">
                <i class="fab fa-cc-visa"></i>
                <i class="fab fa-cc-mastercard"></i>
                <i class="fab fa-cc-amex"></i>
              </div>
            </div>
            <div class="payment-method-details">
              <div class="form-group">
                <label for="cardNumber">Card Number *</label>
                <input type="text" id="cardNumber" name="cardNumber" 
                       placeholder="1234 5678 9012 3456" maxlength="19">
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="expiryDate">Expiry Date *</label>
                  <input type="text" id="expiryDate" name="expiryDate" 
                         placeholder="MM/YY" maxlength="5">
                </div>
                <div class="form-group">
                  <label for="cvv">CVV *</label>
                  <input type="text" id="cvv" name="cvv" 
                         placeholder="123" maxlength="4">
                </div>
              </div>
              <div class="form-group">
                <label for="cardName">Name on Card *</label>
                <input type="text" id="cardName" name="cardName">
              </div>
            </div>
          </div>
          
          <div class="payment-method ${this.orderData.paymentMethod === 'paypal' ? 'selected' : ''}" 
               data-method="paypal">
            <div class="payment-method-header">
              <input type="radio" name="paymentMethod" value="paypal" 
                     ${this.orderData.paymentMethod === 'paypal' ? 'checked' : ''}>
              <label>PayPal</label>
              <i class="fab fa-paypal"></i>
            </div>
            <div class="payment-method-details">
              <p>You will be redirected to PayPal to complete your payment.</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render order review step
   */
  renderReviewStep() {
    const cartItems = this.cartManager.getItems();
    const subtotal = this.cartManager.getSubtotal();
    const tax = subtotal * 0.08; // 8% tax
    const shipping = subtotal > 100 ? 0 : 9.99; // Free shipping over $100
    const total = subtotal + tax + shipping;

    const itemsHtml = cartItems.map(item => `
      <div class="review-item">
        <div class="item-image">
          <i class="${item.icon}"></i>
        </div>
        <div class="item-details">
          <div class="item-name">${item.name}</div>
          <div class="item-quantity">Qty: ${item.quantity}</div>
        </div>
        <div class="item-price">$${(item.price * item.quantity).toFixed(2)}</div>
      </div>
    `).join('');

    return `
      <div class="checkout-step review-step">
        <h3>Order Review</h3>
        
        <div class="review-section">
          <h4>Shipping Address</h4>
          <div class="address-summary">
            ${this.orderData.shippingAddress.firstName} ${this.orderData.shippingAddress.lastName}<br>
            ${this.orderData.shippingAddress.street}<br>
            ${this.orderData.shippingAddress.city}, ${this.orderData.shippingAddress.state} ${this.orderData.shippingAddress.zipCode}<br>
            ${this.orderData.shippingAddress.country}
            ${this.orderData.shippingAddress.phone ? `<br>Phone: ${this.orderData.shippingAddress.phone}` : ''}
          </div>
        </div>
        
        <div class="review-section">
          <h4>Payment Method</h4>
          <div class="payment-summary">
            ${this.orderData.paymentMethod === 'credit_card' ? 'Credit Card' : 'PayPal'}
          </div>
        </div>
        
        <div class="review-section">
          <h4>Order Items</h4>
          <div class="review-items">
            ${itemsHtml}
          </div>
        </div>
        
        <div class="review-section">
          <h4>Order Summary</h4>
          <div class="order-summary">
            <div class="summary-row">
              <span>Subtotal:</span>
              <span>$${subtotal.toFixed(2)}</span>
            </div>
            <div class="summary-row">
              <span>Tax:</span>
              <span>$${tax.toFixed(2)}</span>
            </div>
            <div class="summary-row">
              <span>Shipping:</span>
              <span>${shipping === 0 ? 'FREE' : '$' + shipping.toFixed(2)}</span>
            </div>
            <div class="summary-row total">
              <span>Total:</span>
              <span>$${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render step action buttons
   */
  renderStepActions() {
    const backButton = this.currentStep > 1 ? 
      `<button class="btn btn-secondary back-btn">Back</button>` : '';
    
    const nextButton = this.currentStep < 3 ? 
      `<button class="btn btn-primary next-btn">Next</button>` : 
      `<button class="btn btn-primary place-order-btn">Place Order</button>`;

    return `
      ${backButton}
      ${nextButton}
    `;
  }

  /**
   * Add event listeners to checkout modal
   */
  addCheckoutEventListeners(modal) {
    // Back button
    const backBtn = modal.querySelector('.back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => this.goToPreviousStep(modal));
    }

    // Next button
    const nextBtn = modal.querySelector('.next-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.goToNextStep(modal));
    }

    // Place order button
    const placeOrderBtn = modal.querySelector('.place-order-btn');
    if (placeOrderBtn) {
      placeOrderBtn.addEventListener('click', () => this.placeOrder(modal));
    }

    // Payment method selection
    const paymentMethods = modal.querySelectorAll('.payment-method');
    paymentMethods.forEach(method => {
      method.addEventListener('click', () => {
        paymentMethods.forEach(m => m.classList.remove('selected'));
        method.classList.add('selected');
        const radio = method.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      });
    });

    // Card number formatting
    const cardNumberInput = modal.querySelector('#cardNumber');
    if (cardNumberInput) {
      cardNumberInput.addEventListener('input', this.formatCardNumber);
    }

    // Expiry date formatting
    const expiryInput = modal.querySelector('#expiryDate');
    if (expiryInput) {
      expiryInput.addEventListener('input', this.formatExpiryDate);
    }
  }

  /**
   * Go to previous step
   */
  goToPreviousStep(modal) {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.updateModalContent(modal);
    }
  }

  /**
   * Go to next step
   */
  async goToNextStep(modal) {
    if (await this.validateCurrentStep(modal)) {
      this.currentStep++;
      this.updateModalContent(modal);
    }
  }

  /**
   * Update modal content for current step
   */
  updateModalContent(modal) {
    const content = modal.querySelector('.checkout-content');
    const actions = modal.querySelector('.checkout-actions');
    const progressSteps = modal.querySelectorAll('.progress-step');

    // Update progress indicators
    progressSteps.forEach((step, index) => {
      if (index + 1 <= this.currentStep) {
        step.classList.add('active');
      } else {
        step.classList.remove('active');
      }
    });

    // Update content
    content.innerHTML = this.renderCurrentStep();
    actions.innerHTML = this.renderStepActions();

    // Re-add event listeners
    this.addCheckoutEventListeners(modal);
  }

  /**
   * Validate current step
   */
  async validateCurrentStep(modal) {
    switch (this.currentStep) {
      case 1:
        return this.validateShippingStep(modal);
      case 2:
        return this.validatePaymentStep(modal);
      default:
        return true;
    }
  }

  /**
   * Validate shipping step
   */
  validateShippingStep(modal) {
    const form = modal.querySelector('.shipping-form');
    const formData = new FormData(form);
    const shippingData = {};

    // Collect form data
    for (const [key, value] of formData.entries()) {
      shippingData[key] = value.trim();
    }

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'street', 'city', 'state', 'zipCode', 'country'];
    for (const field of requiredFields) {
      if (!shippingData[field]) {
        this.notificationManager.show(`${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required`, 'error');
        return false;
      }
    }

    // Validate ZIP code format
    if (shippingData.country === 'US' && !/^\d{5}(-\d{4})?$/.test(shippingData.zipCode)) {
      this.notificationManager.show('Please enter a valid ZIP code', 'error');
      return false;
    }

    // Save shipping data
    this.orderData.shippingAddress = shippingData;
    return true;
  }

  /**
   * Validate payment step
   */
  validatePaymentStep(modal) {
    const selectedMethod = modal.querySelector('input[name="paymentMethod"]:checked');
    if (!selectedMethod) {
      this.notificationManager.show('Please select a payment method', 'error');
      return false;
    }

    this.orderData.paymentMethod = selectedMethod.value;

    // Validate credit card details if selected
    if (selectedMethod.value === 'credit_card') {
      const cardNumber = modal.querySelector('#cardNumber').value.replace(/\s/g, '');
      const expiryDate = modal.querySelector('#expiryDate').value;
      const cvv = modal.querySelector('#cvv').value;
      const cardName = modal.querySelector('#cardName').value.trim();

      if (!cardNumber || cardNumber.length < 13) {
        this.notificationManager.show('Please enter a valid card number', 'error');
        return false;
      }

      if (!expiryDate || !/^\d{2}\/\d{2}$/.test(expiryDate)) {
        this.notificationManager.show('Please enter a valid expiry date (MM/YY)', 'error');
        return false;
      }

      if (!cvv || cvv.length < 3) {
        this.notificationManager.show('Please enter a valid CVV', 'error');
        return false;
      }

      if (!cardName) {
        this.notificationManager.show('Please enter the name on card', 'error');
        return false;
      }

      // Save payment details (in real app, these would be tokenized)
      this.orderData.paymentDetails = {
        cardNumber: cardNumber.slice(-4), // Only store last 4 digits
        expiryDate,
        cardName
      };
    }

    return true;
  }

  /**
   * Place order
   */
  async placeOrder(modal) {
    try {
      const placeOrderBtn = modal.querySelector('.place-order-btn');
      placeOrderBtn.disabled = true;
      placeOrderBtn.textContent = 'Processing...';

      // Create order
      const response = await this.apiClient.post('/orders', {
        shippingAddress: this.orderData.shippingAddress,
        paymentMethod: this.orderData.paymentMethod,
        items: this.orderData.items
      });

      if (response.success) {
        // Show success message
        this.showOrderConfirmation(response.data.order, modal);
        
        // Clear cart
        this.cartManager.clearCart();
        
        this.notificationManager.show('Order placed successfully!', 'success');
      } else {
        throw new Error(response.error?.message || 'Failed to place order');
      }

    } catch (error) {
      console.error('Place order error:', error);
      this.notificationManager.show(error.message || 'Failed to place order', 'error');
      
      // Re-enable button
      const placeOrderBtn = modal.querySelector('.place-order-btn');
      placeOrderBtn.disabled = false;
      placeOrderBtn.textContent = 'Place Order';
    }
  }

  /**
   * Show order confirmation
   */
  showOrderConfirmation(order, modal) {
    const content = modal.querySelector('.checkout-content');
    const actions = modal.querySelector('.checkout-actions');

    content.innerHTML = `
      <div class="order-confirmation">
        <div class="confirmation-icon">
          <i class="fas fa-check-circle"></i>
        </div>
        <h3>Order Confirmed!</h3>
        <p>Thank you for your order. Your order number is:</p>
        <div class="order-number">#${order.id}</div>
        <p>You will receive an email confirmation shortly.</p>
        <div class="order-details">
          <h4>Order Summary</h4>
          <div class="summary-row">
            <span>Total Amount:</span>
            <span>$${order.totalAmount.toFixed(2)}</span>
          </div>
          <div class="summary-row">
            <span>Status:</span>
            <span class="status-badge ${order.status}">${order.status.toUpperCase()}</span>
          </div>
        </div>
      </div>
    `;

    actions.innerHTML = `
      <button class="btn btn-primary" onclick="this.closest('.checkout-modal').remove()">
        Continue Shopping
      </button>
      <button class="btn btn-secondary" onclick="window.checkoutManager.viewOrderHistory()">
        View Orders
      </button>
    `;
  }

  /**
   * View order history
   */
  async viewOrderHistory() {
    try {
      // Close checkout modal if open
      const checkoutModal = document.querySelector('.checkout-modal');
      if (checkoutModal) {
        checkoutModal.remove();
      }

      // Show order history modal
      this.showOrderHistoryModal();

    } catch (error) {
      console.error('View order history error:', error);
      this.notificationManager.show('Failed to load order history', 'error');
    }
  }

  /**
   * Show order history modal
   */
  async showOrderHistoryModal() {
    try {
      const response = await this.apiClient.get('/orders');
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch orders');
      }

      const orders = response.data.orders;
      const modal = this.createOrderHistoryModal(orders);
      document.body.appendChild(modal);
      
      setTimeout(() => {
        modal.classList.add('show');
      }, 10);

    } catch (error) {
      console.error('Show order history error:', error);
      this.notificationManager.show(error.message || 'Failed to load order history', 'error');
    }
  }

  /**
   * Create order history modal
   */
  createOrderHistoryModal(orders) {
    const modal = document.createElement('div');
    modal.className = 'order-history-modal';
    
    const ordersHtml = orders.length > 0 ? orders.map(order => `
      <div class="order-item" data-order-id="${order.id}">
        <div class="order-header">
          <div class="order-number">Order #${order.id}</div>
          <div class="order-date">${new Date(order.createdAt).toLocaleDateString()}</div>
          <div class="order-status">
            <span class="status-badge ${order.status}">${order.status.toUpperCase()}</span>
          </div>
        </div>
        <div class="order-details">
          <div class="order-total">$${order.totalAmount.toFixed(2)}</div>
          <div class="order-items-count">${order.items.length} item${order.items.length !== 1 ? 's' : ''}</div>
          ${order.trackingNumber ? `<div class="tracking-number">Tracking: ${order.trackingNumber}</div>` : ''}
        </div>
        <div class="order-actions">
          <button class="btn btn-sm btn-secondary view-order-btn" data-order-id="${order.id}">
            View Details
          </button>
          ${order.status === 'pending' ? `
            <button class="btn btn-sm btn-danger cancel-order-btn" data-order-id="${order.id}">
              Cancel
            </button>
          ` : ''}
        </div>
      </div>
    `).join('') : '<div class="no-orders">No orders found</div>';

    modal.innerHTML = `
      <div class="order-history-modal-content">
        <div class="modal-header">
          <h2>Order History</h2>
          <button class="close-btn" onclick="this.closest('.order-history-modal').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="orders-list">
          ${ordersHtml}
        </div>
      </div>
    `;

    // Add event listeners
    this.addOrderHistoryEventListeners(modal);
    
    return modal;
  }

  /**
   * Add event listeners to order history modal
   */
  addOrderHistoryEventListeners(modal) {
    // View order details
    const viewOrderBtns = modal.querySelectorAll('.view-order-btn');
    viewOrderBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const orderId = e.target.dataset.orderId;
        this.viewOrderDetails(orderId);
      });
    });

    // Cancel order
    const cancelOrderBtns = modal.querySelectorAll('.cancel-order-btn');
    cancelOrderBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const orderId = e.target.dataset.orderId;
        this.cancelOrder(orderId, modal);
      });
    });
  }

  /**
   * View order details
   */
  async viewOrderDetails(orderId) {
    try {
      const response = await this.apiClient.get(`/orders/${orderId}`);
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch order details');
      }

      const order = response.data.order;
      this.showOrderDetailsModal(order);

    } catch (error) {
      console.error('View order details error:', error);
      this.notificationManager.show(error.message || 'Failed to load order details', 'error');
    }
  }

  /**
   * Show order details modal
   */
  showOrderDetailsModal(order) {
    const modal = document.createElement('div');
    modal.className = 'order-details-modal';
    
    const itemsHtml = order.items.map(item => `
      <div class="order-detail-item">
        <div class="item-image">
          <i class="${item.product.icon || 'fas fa-cube'}"></i>
        </div>
        <div class="item-info">
          <div class="item-name">${item.product.name}</div>
          <div class="item-quantity">Quantity: ${item.quantity}</div>
          <div class="item-price">$${item.price.toFixed(2)} each</div>
        </div>
        <div class="item-total">$${(item.price * item.quantity).toFixed(2)}</div>
      </div>
    `).join('');

    modal.innerHTML = `
      <div class="order-details-modal-content">
        <div class="modal-header">
          <h2>Order #${order.id}</h2>
          <button class="close-btn" onclick="this.closest('.order-details-modal').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="order-info">
          <div class="info-section">
            <h3>Order Information</h3>
            <div class="info-row">
              <span>Order Date:</span>
              <span>${new Date(order.createdAt).toLocaleDateString()}</span>
            </div>
            <div class="info-row">
              <span>Status:</span>
              <span class="status-badge ${order.status}">${order.status.toUpperCase()}</span>
            </div>
            <div class="info-row">
              <span>Payment Status:</span>
              <span class="status-badge ${order.paymentStatus}">${order.paymentStatus.toUpperCase()}</span>
            </div>
            ${order.trackingNumber ? `
              <div class="info-row">
                <span>Tracking Number:</span>
                <span>${order.trackingNumber}</span>
              </div>
            ` : ''}
          </div>
          
          <div class="info-section">
            <h3>Shipping Address</h3>
            <div class="address">
              ${order.shippingAddress.firstName} ${order.shippingAddress.lastName}<br>
              ${order.shippingAddress.street}<br>
              ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}<br>
              ${order.shippingAddress.country}
            </div>
          </div>
          
          <div class="info-section">
            <h3>Order Items</h3>
            <div class="order-items">
              ${itemsHtml}
            </div>
          </div>
          
          <div class="info-section">
            <h3>Order Total</h3>
            <div class="total-amount">$${order.totalAmount.toFixed(2)}</div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId, modal) {
    try {
      if (!confirm('Are you sure you want to cancel this order?')) {
        return;
      }

      const response = await this.apiClient.put(`/orders/${orderId}/cancel`);
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to cancel order');
      }

      this.notificationManager.show('Order cancelled successfully', 'success');
      
      // Refresh order history
      modal.remove();
      this.showOrderHistoryModal();

    } catch (error) {
      console.error('Cancel order error:', error);
      this.notificationManager.show(error.message || 'Failed to cancel order', 'error');
    }
  }

  /**
   * Format card number input
   */
  formatCardNumber(e) {
    let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
    let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
    e.target.value = formattedValue;
  }

  /**
   * Format expiry date input
   */
  formatExpiryDate(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    e.target.value = value;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CheckoutManager;
}