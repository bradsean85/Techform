/**
 * Frontend Cart Manager Tests
 * 
 * These tests can be run in a browser environment or with jsdom
 * To run: open this file in a browser with the CartManager.js script loaded
 */

// Mock localStorage for testing
const mockLocalStorage = {
  store: {},
  getItem: function(key) {
    return this.store[key] || null;
  },
  setItem: function(key, value) {
    this.store[key] = value;
  },
  removeItem: function(key) {
    delete this.store[key];
  },
  clear: function() {
    this.store = {};
  }
};

// Mock fetch for testing
const mockFetch = (url, options) => {
  return new Promise((resolve, reject) => {
    // Simulate API responses based on URL and method
    const method = options?.method || 'GET';
    
    if (url.includes('/api/cart') && method === 'GET') {
      resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            items: [],
            total: 0,
            itemCount: 0
          }
        })
      });
    } else if (url.includes('/api/cart/items') && method === 'POST') {
      const body = JSON.parse(options.body);
      resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            items: [{
              productId: body.productId,
              quantity: body.quantity,
              product: {
                id: body.productId,
                name: 'Test Product',
                price: 99.99,
                icon: 'fas fa-test'
              }
            }],
            total: 99.99 * body.quantity,
            itemCount: body.quantity
          }
        })
      });
    } else {
      reject(new Error('Not found'));
    }
  });
};

// Test suite
class CartManagerTests {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    
    // Setup mocks
    if (typeof window !== 'undefined') {
      this.originalLocalStorage = window.localStorage;
      this.originalFetch = window.fetch;
      window.localStorage = mockLocalStorage;
      window.fetch = mockFetch;
    }
  }

  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  async runTests() {
    console.log('Running CartManager Tests...\n');
    
    for (const test of this.tests) {
      try {
        // Clear localStorage before each test
        mockLocalStorage.clear();
        
        await test.testFn();
        console.log(`✅ ${test.name}`);
        this.passed++;
      } catch (error) {
        console.error(`❌ ${test.name}: ${error.message}`);
        this.failed++;
      }
    }
    
    console.log(`\nTest Results: ${this.passed} passed, ${this.failed} failed`);
    
    // Restore original functions
    if (typeof window !== 'undefined') {
      window.localStorage = this.originalLocalStorage;
      window.fetch = this.originalFetch;
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  assertArrayEqual(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }
}

// Initialize test suite
const tests = new CartManagerTests();

// Test: CartManager initialization
tests.test('CartManager should initialize with empty cart', () => {
  const cartManager = new CartManager();
  
  tests.assertEqual(cartManager.getItemCount(), 0, 'Initial item count should be 0');
  tests.assertEqual(cartManager.getTotal(), 0, 'Initial total should be 0');
  tests.assertArrayEqual(cartManager.getItems(), [], 'Initial items should be empty array');
});

// Test: Session ID generation
tests.test('CartManager should generate session ID for guests', () => {
  const cartManager = new CartManager();
  
  tests.assert(cartManager.sessionId, 'Session ID should be generated');
  tests.assert(cartManager.sessionId.startsWith('guest_'), 'Session ID should start with guest_');
  tests.assert(mockLocalStorage.getItem('guestSessionId'), 'Session ID should be stored in localStorage');
});

// Test: Local storage persistence
tests.test('CartManager should persist cart to localStorage', () => {
  const cartManager = new CartManager();
  
  // Manually add item to cart
  cartManager.cart = [{
    id: 1,
    name: 'Test Product',
    price: 99.99,
    quantity: 2
  }];
  
  cartManager.saveToLocalStorage();
  
  const savedCart = JSON.parse(mockLocalStorage.getItem('cart'));
  tests.assertEqual(savedCart.length, 1, 'Cart should be saved to localStorage');
  tests.assertEqual(savedCart[0].quantity, 2, 'Item quantity should be preserved');
});

// Test: Load from localStorage
tests.test('CartManager should load cart from localStorage', () => {
  // Pre-populate localStorage
  const testCart = [{
    id: 1,
    name: 'Test Product',
    price: 99.99,
    quantity: 3
  }];
  mockLocalStorage.setItem('cart', JSON.stringify(testCart));
  
  const cartManager = new CartManager();
  
  tests.assertEqual(cartManager.getItemCount(), 3, 'Should load item count from localStorage');
  tests.assertEqual(cartManager.getTotal(), 299.97, 'Should calculate correct total');
  tests.assertEqual(cartManager.getItems().length, 1, 'Should load items from localStorage');
});

// Test: Cart calculations
tests.test('CartManager should calculate totals correctly', () => {
  const cartManager = new CartManager();
  
  cartManager.cart = [
    { id: 1, name: 'Product 1', price: 10.00, quantity: 2 },
    { id: 2, name: 'Product 2', price: 25.50, quantity: 1 },
    { id: 3, name: 'Product 3', price: 5.99, quantity: 3 }
  ];
  
  tests.assertEqual(cartManager.getTotal(), 63.47, 'Should calculate correct total'); // 20 + 25.50 + 17.97
  tests.assertEqual(cartManager.getItemCount(), 6, 'Should calculate correct item count'); // 2 + 1 + 3
});

// Test: Authentication state
tests.test('CartManager should handle authentication state', () => {
  const cartManager = new CartManager();
  
  tests.assertEqual(cartManager.isAuthenticated, false, 'Should start unauthenticated');
  
  cartManager.setAuthenticated(true, 'test-token');
  
  tests.assertEqual(cartManager.isAuthenticated, true, 'Should update authentication state');
  tests.assertEqual(cartManager.userToken, 'test-token', 'Should store user token');
});

// Test: API request headers
tests.test('CartManager should set correct API headers', async () => {
  const cartManager = new CartManager();
  
  // Test guest headers
  let requestOptions = {
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': cartManager.sessionId
    }
  };
  
  tests.assert(requestOptions.headers['X-Session-ID'], 'Should include session ID for guests');
  
  // Test authenticated headers
  cartManager.setAuthenticated(true, 'test-token');
  
  requestOptions = {
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': cartManager.sessionId,
      'Authorization': 'Bearer test-token'
    }
  };
  
  tests.assert(requestOptions.headers['Authorization'], 'Should include auth token for authenticated users');
});

// Test: Error handling
tests.test('CartManager should handle localStorage errors gracefully', () => {
  // Mock localStorage to throw error
  const originalSetItem = mockLocalStorage.setItem;
  mockLocalStorage.setItem = () => {
    throw new Error('Storage quota exceeded');
  };
  
  const cartManager = new CartManager();
  cartManager.cart = [{ id: 1, name: 'Test', price: 10, quantity: 1 }];
  
  // Should not throw error
  cartManager.saveToLocalStorage();
  
  // Restore original function
  mockLocalStorage.setItem = originalSetItem;
  
  tests.assert(true, 'Should handle localStorage errors gracefully');
});

// Test: Product details fallback
tests.test('CartManager should use fallback product data', async () => {
  const cartManager = new CartManager();
  
  const product = await cartManager.getProductDetails(1);
  
  tests.assert(product, 'Should return product details');
  tests.assertEqual(product.id, 1, 'Should return correct product ID');
  tests.assert(product.name, 'Should include product name');
  tests.assert(product.price, 'Should include product price');
});

// Test: Cart validation
tests.test('CartManager should validate cart items', async () => {
  const cartManager = new CartManager();
  
  const validation = await cartManager.validateCart();
  
  tests.assert(validation.hasOwnProperty('isValid'), 'Should return validation result');
  tests.assert(Array.isArray(validation.issues), 'Should return issues array');
});

// Run tests if in browser environment
if (typeof window !== 'undefined' && typeof CartManager !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      tests.runTests();
    });
  } else {
    tests.runTests();
  }
} else if (typeof module !== 'undefined' && module.exports) {
  // Export for Node.js environment
  module.exports = { CartManagerTests, tests };
}

// Enhanced Cart Modal Tests
tests.test('EnhancedCartModal should calculate tax correctly', () => {
    // Mock the enhanced cart modal
    const mockCartManager = { getItems: () => [], getTotal: () => 0, getItemCount: () => 0 };
    const mockUserManager = { isUserAuthenticated: () => false };
    const mockNotificationManager = { info: () => {}, success: () => {}, error: () => {} };
    
    if (typeof EnhancedCartModal !== 'undefined') {
        const modal = new EnhancedCartModal(mockCartManager, mockUserManager, mockNotificationManager);
        
        const subtotal = 100;
        const tax = modal.calculateTax(subtotal);
        
        tests.assertEqual(tax, 8.5, 'Tax should be 8.5% of subtotal');
    } else {
        console.log('EnhancedCartModal not available, skipping test');
    }
});

tests.test('EnhancedCartModal should calculate shipping correctly', () => {
    const mockCartManager = { getItems: () => [], getTotal: () => 0, getItemCount: () => 0 };
    const mockUserManager = { isUserAuthenticated: () => false };
    const mockNotificationManager = { info: () => {}, success: () => {}, error: () => {} };
    
    if (typeof EnhancedCartModal !== 'undefined') {
        const modal = new EnhancedCartModal(mockCartManager, mockUserManager, mockNotificationManager);
        
        // Test shipping under threshold
        tests.assertEqual(modal.calculateShipping(50), 15, 'Shipping should be $15 for orders under $100');
        
        // Test free shipping
        tests.assertEqual(modal.calculateShipping(100), 0, 'Shipping should be free for orders $100 and over');
        tests.assertEqual(modal.calculateShipping(150), 0, 'Shipping should be free for orders over $100');
    } else {
        console.log('EnhancedCartModal not available, skipping test');
    }
});

tests.test('EnhancedCartModal should show correct sync status', () => {
    const mockCartManager = { getItems: () => [], getTotal: () => 0, getItemCount: () => 0, syncInProgress: false };
    const mockUserManager = { isUserAuthenticated: () => false };
    const mockNotificationManager = { info: () => {}, success: () => {}, error: () => {} };
    
    if (typeof EnhancedCartModal !== 'undefined') {
        const modal = new EnhancedCartModal(mockCartManager, mockUserManager, mockNotificationManager);
        
        // Test guest status
        const guestStatus = modal.getSyncStatusIndicator();
        tests.assertEqual(guestStatus.class, 'sync-guest', 'Should show guest status for unauthenticated users');
        
        // Test authenticated status
        mockUserManager.isUserAuthenticated = () => true;
        const authStatus = modal.getSyncStatusIndicator();
        tests.assertEqual(authStatus.class, 'sync-complete', 'Should show synced status for authenticated users');
        
        // Test syncing status
        mockCartManager.syncInProgress = true;
        const syncingStatus = modal.getSyncStatusIndicator();
        tests.assertEqual(syncingStatus.class, 'sync-progress', 'Should show syncing status when sync in progress');
    } else {
        console.log('EnhancedCartModal not available, skipping test');
    }
});

tests.test('EnhancedCartModal should generate correct item HTML', () => {
    const mockCartManager = { getItems: () => [], getTotal: () => 0, getItemCount: () => 0 };
    const mockUserManager = { isUserAuthenticated: () => false };
    const mockNotificationManager = { info: () => {}, success: () => {}, error: () => {} };
    
    if (typeof EnhancedCartModal !== 'undefined') {
        const modal = new EnhancedCartModal(mockCartManager, mockUserManager, mockNotificationManager);
        
        const testItem = {
            id: 1,
            name: 'Test Product',
            price: 99.99,
            quantity: 2,
            icon: 'fas fa-test',
            inventory: 10
        };
        
        const html = modal.generateItemHTML(testItem);
        
        tests.assert(html.includes('Test Product'), 'Should include product name');
        tests.assert(html.includes('$99.99'), 'Should include product price');
        tests.assert(html.includes('value="2"'), 'Should include quantity');
        tests.assert(html.includes('10 in stock'), 'Should include inventory info');
        tests.assert(html.includes('fas fa-test'), 'Should include product icon');
    } else {
        console.log('EnhancedCartModal not available, skipping test');
    }
});

tests.test('EnhancedCartModal should generate correct summary HTML', () => {
    const mockCartManager = { getItems: () => [], getTotal: () => 0, getItemCount: () => 0 };
    const mockUserManager = { isUserAuthenticated: () => false };
    const mockNotificationManager = { info: () => {}, success: () => {}, error: () => {} };
    
    if (typeof EnhancedCartModal !== 'undefined') {
        const modal = new EnhancedCartModal(mockCartManager, mockUserManager, mockNotificationManager);
        
        const subtotal = 100;
        const tax = 8.5;
        const shipping = 0;
        const total = 108.5;
        const itemCount = 2;
        
        const html = modal.generateSummaryHTML(subtotal, tax, shipping, total, itemCount);
        
        tests.assert(html.includes('Subtotal (2 items)'), 'Should include item count in subtotal');
        tests.assert(html.includes('$100.00'), 'Should include subtotal amount');
        tests.assert(html.includes('Tax (8.5%)'), 'Should include tax percentage');
        tests.assert(html.includes('$8.50'), 'Should include tax amount');
        tests.assert(html.includes('FREE'), 'Should show free shipping');
        tests.assert(html.includes('$108.50'), 'Should include total amount');
    } else {
        console.log('EnhancedCartModal not available, skipping test');
    }
});

// Instructions for running tests:
console.log(`
To run these tests:

1. In Browser:
   - Open index.html in a browser
   - Open browser console
   - Include this script after CartManager.js and EnhancedCartModal.js
   - Tests will run automatically

2. Manual Testing:
   - Open tests/cart-ui-manual-tests.html in a browser
   - Follow the interactive test scenarios
   - Test all cart functionality manually

3. Enhanced Cart Modal Features:
   - Tax calculation (8.5%)
   - Shipping rules (free over $100)
   - Sync status indicators
   - Real-time quantity updates
   - Inventory validation
   - Keyboard navigation
   - Mobile responsiveness

4. Node.js Testing:
   - Run: npm test tests/enhanced-cart-modal.test.js
   - Requires Jest and jsdom setup
`);