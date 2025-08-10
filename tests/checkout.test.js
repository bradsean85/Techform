/**
 * @jest-environment jsdom
 */

// Mock dependencies
const mockApiClient = {
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn()
};

const mockCartManager = {
  getItems: jest.fn(),
  getSubtotal: jest.fn(),
  clearCart: jest.fn()
};

const mockUserManager = {
  getCurrentUser: jest.fn(),
  isUserAuthenticated: jest.fn()
};

const mockNotificationManager = {
  show: jest.fn(),
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn()
};

// Import CheckoutManager
const CheckoutManager = require('../js/CheckoutManager');

describe('CheckoutManager', () => {
  let checkoutManager;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create fresh instance
    checkoutManager = new CheckoutManager(
      mockApiClient,
      mockCartManager,
      mockUserManager,
      mockNotificationManager
    );

    // Setup DOM
    document.body.innerHTML = '';
  });

  describe('initializeCheckout', () => {
    it('should fail if user is not logged in', async () => {
      mockUserManager.getCurrentUser.mockReturnValue(null);

      const result = await checkoutManager.initializeCheckout();

      expect(result).toBe(false);
      expect(mockNotificationManager.show).toHaveBeenCalledWith(
        'Please log in to proceed with checkout',
        'warning'
      );
    });

    it('should fail if cart is empty', async () => {
      mockUserManager.getCurrentUser.mockReturnValue({ id: 1, firstName: 'Test' });
      mockCartManager.getItems.mockReturnValue([]);

      const result = await checkoutManager.initializeCheckout();

      expect(result).toBe(false);
      expect(mockNotificationManager.show).toHaveBeenCalledWith(
        'Your cart is empty',
        'warning'
      );
    });

    it('should initialize checkout with valid conditions', async () => {
      const mockUser = { id: 1, firstName: 'Test', lastName: 'User' };
      const mockItems = [
        { id: 1, name: 'Product 1', price: 99.99, quantity: 2 }
      ];

      mockUserManager.getCurrentUser.mockReturnValue(mockUser);
      mockCartManager.getItems.mockReturnValue(mockItems);

      const result = await checkoutManager.initializeCheckout();

      expect(result).toBe(true);
      expect(checkoutManager.orderData.items).toEqual([
        { productId: 1, quantity: 2 }
      ]);
      
      // Check if modal was created
      const modal = document.querySelector('.checkout-modal');
      expect(modal).toBeTruthy();
    });
  });

  describe('validateShippingStep', () => {
    beforeEach(() => {
      // Create mock form
      document.body.innerHTML = `
        <div class="checkout-modal">
          <form class="shipping-form">
            <input name="firstName" value="John" />
            <input name="lastName" value="Doe" />
            <input name="street" value="123 Main St" />
            <input name="city" value="Anytown" />
            <input name="state" value="CA" />
            <input name="zipCode" value="12345" />
            <select name="country">
              <option value="US" selected>United States</option>
            </select>
            <input name="phone" value="555-0123" />
          </form>
        </div>
      `;
    });

    it('should validate complete shipping form', () => {
      const modal = document.querySelector('.checkout-modal');
      const result = checkoutManager.validateShippingStep(modal);

      expect(result).toBe(true);
      expect(checkoutManager.orderData.shippingAddress).toEqual({
        firstName: 'John',
        lastName: 'Doe',
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        country: 'US',
        phone: '555-0123'
      });
    });

    it('should fail validation with missing required fields', () => {
      // Clear required field
      document.querySelector('input[name="firstName"]').value = '';
      
      const modal = document.querySelector('.checkout-modal');
      const result = checkoutManager.validateShippingStep(modal);

      expect(result).toBe(false);
      expect(mockNotificationManager.show).toHaveBeenCalledWith(
        'firstName is required',
        'error'
      );
    });

    it('should validate US ZIP code format', () => {
      // Invalid ZIP code
      document.querySelector('input[name="zipCode"]').value = 'invalid';
      
      const modal = document.querySelector('.checkout-modal');
      const result = checkoutManager.validateShippingStep(modal);

      expect(result).toBe(false);
      expect(mockNotificationManager.show).toHaveBeenCalledWith(
        'Please enter a valid ZIP code',
        'error'
      );
    });
  });

  describe('validatePaymentStep', () => {
    beforeEach(() => {
      // Create mock payment form
      document.body.innerHTML = `
        <div class="checkout-modal">
          <input type="radio" name="paymentMethod" value="credit_card" checked />
          <input id="cardNumber" value="4111111111111111" />
          <input id="expiryDate" value="12/25" />
          <input id="cvv" value="123" />
          <input id="cardName" value="John Doe" />
        </div>
      `;
    });

    it('should validate complete credit card form', () => {
      const modal = document.querySelector('.checkout-modal');
      const result = checkoutManager.validatePaymentStep(modal);

      expect(result).toBe(true);
      expect(checkoutManager.orderData.paymentMethod).toBe('credit_card');
      expect(checkoutManager.orderData.paymentDetails).toEqual({
        cardNumber: '1111', // Last 4 digits
        expiryDate: '12/25',
        cardName: 'John Doe'
      });
    });

    it('should fail without payment method selection', () => {
      document.querySelector('input[name="paymentMethod"]').checked = false;
      
      const modal = document.querySelector('.checkout-modal');
      const result = checkoutManager.validatePaymentStep(modal);

      expect(result).toBe(false);
      expect(mockNotificationManager.show).toHaveBeenCalledWith(
        'Please select a payment method',
        'error'
      );
    });

    it('should validate credit card number', () => {
      document.querySelector('#cardNumber').value = '123'; // Too short
      
      const modal = document.querySelector('.checkout-modal');
      const result = checkoutManager.validatePaymentStep(modal);

      expect(result).toBe(false);
      expect(mockNotificationManager.show).toHaveBeenCalledWith(
        'Please enter a valid card number',
        'error'
      );
    });

    it('should validate expiry date format', () => {
      document.querySelector('#expiryDate').value = 'invalid';
      
      const modal = document.querySelector('.checkout-modal');
      const result = checkoutManager.validatePaymentStep(modal);

      expect(result).toBe(false);
      expect(mockNotificationManager.show).toHaveBeenCalledWith(
        'Please enter a valid expiry date (MM/YY)',
        'error'
      );
    });

    it('should validate CVV', () => {
      document.querySelector('#cvv').value = '1'; // Too short
      
      const modal = document.querySelector('.checkout-modal');
      const result = checkoutManager.validatePaymentStep(modal);

      expect(result).toBe(false);
      expect(mockNotificationManager.show).toHaveBeenCalledWith(
        'Please enter a valid CVV',
        'error'
      );
    });
  });

  describe('placeOrder', () => {
    beforeEach(() => {
      // Setup order data
      checkoutManager.orderData = {
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'US'
        },
        paymentMethod: 'credit_card',
        items: [{ productId: 1, quantity: 2 }]
      };

      // Create mock modal
      document.body.innerHTML = `
        <div class="checkout-modal">
          <button class="place-order-btn">Place Order</button>
          <div class="checkout-content"></div>
          <div class="checkout-actions"></div>
        </div>
      `;
    });

    it('should place order successfully', async () => {
      const mockOrder = {
        id: 123,
        totalAmount: 199.98,
        status: 'pending'
      };

      mockApiClient.post.mockResolvedValue({
        success: true,
        data: { order: mockOrder }
      });

      const modal = document.querySelector('.checkout-modal');
      await checkoutManager.placeOrder(modal);

      expect(mockApiClient.post).toHaveBeenCalledWith('/orders', {
        shippingAddress: checkoutManager.orderData.shippingAddress,
        paymentMethod: 'credit_card',
        items: [{ productId: 1, quantity: 2 }]
      });

      expect(mockCartManager.clearCart).toHaveBeenCalled();
      expect(mockNotificationManager.show).toHaveBeenCalledWith(
        'Order placed successfully!',
        'success'
      );
    });

    it('should handle order placement failure', async () => {
      mockApiClient.post.mockResolvedValue({
        success: false,
        error: { message: 'Insufficient inventory' }
      });

      const modal = document.querySelector('.checkout-modal');
      await checkoutManager.placeOrder(modal);

      expect(mockNotificationManager.show).toHaveBeenCalledWith(
        'Insufficient inventory',
        'error'
      );

      // Button should be re-enabled
      const button = modal.querySelector('.place-order-btn');
      expect(button.disabled).toBe(false);
      expect(button.textContent).toBe('Place Order');
    });

    it('should handle API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Network error'));

      const modal = document.querySelector('.checkout-modal');
      await checkoutManager.placeOrder(modal);

      expect(mockNotificationManager.show).toHaveBeenCalledWith(
        'Network error',
        'error'
      );
    });
  });

  describe('viewOrderHistory', () => {
    it('should fetch and display order history', async () => {
      const mockOrders = [
        {
          id: 1,
          totalAmount: 99.99,
          status: 'delivered',
          createdAt: '2024-01-01T00:00:00Z',
          items: [{ id: 1, quantity: 1 }]
        },
        {
          id: 2,
          totalAmount: 199.98,
          status: 'pending',
          createdAt: '2024-01-02T00:00:00Z',
          items: [{ id: 1, quantity: 2 }]
        }
      ];

      mockApiClient.get.mockResolvedValue({
        success: true,
        data: { orders: mockOrders }
      });

      await checkoutManager.viewOrderHistory();

      expect(mockApiClient.get).toHaveBeenCalledWith('/orders');
      
      // Check if modal was created
      const modal = document.querySelector('.order-history-modal');
      expect(modal).toBeTruthy();
      
      // Check if orders are displayed
      const orderItems = modal.querySelectorAll('.order-item');
      expect(orderItems).toHaveLength(2);
    });

    it('should handle empty order history', async () => {
      mockApiClient.get.mockResolvedValue({
        success: true,
        data: { orders: [] }
      });

      await checkoutManager.viewOrderHistory();

      const modal = document.querySelector('.order-history-modal');
      const noOrdersMessage = modal.querySelector('.no-orders');
      expect(noOrdersMessage).toBeTruthy();
      expect(noOrdersMessage.textContent).toBe('No orders found');
    });

    it('should handle API errors', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Failed to fetch'));

      await checkoutManager.viewOrderHistory();

      expect(mockNotificationManager.show).toHaveBeenCalledWith(
        'Failed to fetch',
        'error'
      );
    });
  });

  describe('cancelOrder', () => {
    beforeEach(() => {
      // Mock window.confirm
      global.confirm = jest.fn();
    });

    afterEach(() => {
      delete global.confirm;
    });

    it('should cancel order successfully', async () => {
      global.confirm.mockReturnValue(true);
      
      const mockOrder = {
        id: 123,
        status: 'cancelled'
      };

      mockApiClient.put.mockResolvedValue({
        success: true,
        data: { order: mockOrder }
      });

      // Create mock modal
      document.body.innerHTML = '<div class="order-history-modal"></div>';
      const modal = document.querySelector('.order-history-modal');

      // Mock showOrderHistoryModal
      checkoutManager.showOrderHistoryModal = jest.fn();

      await checkoutManager.cancelOrder(123, modal);

      expect(mockApiClient.put).toHaveBeenCalledWith('/orders/123/cancel');
      expect(mockNotificationManager.show).toHaveBeenCalledWith(
        'Order cancelled successfully',
        'success'
      );
      expect(checkoutManager.showOrderHistoryModal).toHaveBeenCalled();
    });

    it('should not cancel if user declines confirmation', async () => {
      global.confirm.mockReturnValue(false);

      await checkoutManager.cancelOrder(123, null);

      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('should handle cancellation errors', async () => {
      global.confirm.mockReturnValue(true);
      
      mockApiClient.put.mockResolvedValue({
        success: false,
        error: { message: 'Cannot cancel shipped order' }
      });

      await checkoutManager.cancelOrder(123, null);

      expect(mockNotificationManager.show).toHaveBeenCalledWith(
        'Cannot cancel shipped order',
        'error'
      );
    });
  });

  describe('formatCardNumber', () => {
    it('should format card number with spaces', () => {
      const mockEvent = {
        target: { value: '4111111111111111' }
      };

      checkoutManager.formatCardNumber(mockEvent);

      expect(mockEvent.target.value).toBe('4111 1111 1111 1111');
    });

    it('should handle partial card numbers', () => {
      const mockEvent = {
        target: { value: '411111' }
      };

      checkoutManager.formatCardNumber(mockEvent);

      expect(mockEvent.target.value).toBe('4111 11');
    });
  });

  describe('formatExpiryDate', () => {
    it('should format expiry date with slash', () => {
      const mockEvent = {
        target: { value: '1225' }
      };

      checkoutManager.formatExpiryDate(mockEvent);

      expect(mockEvent.target.value).toBe('12/25');
    });

    it('should handle partial expiry dates', () => {
      const mockEvent = {
        target: { value: '12' }
      };

      checkoutManager.formatExpiryDate(mockEvent);

      expect(mockEvent.target.value).toBe('12');
    });
  });
});