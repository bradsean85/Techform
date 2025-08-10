// Frontend Components Test Suite
// This file tests the modular component system implementation

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Setup DOM environment
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Test</title>
</head>
<body>
    <div id="productGrid"></div>
    <div class="nav-icons">
        <i class="fa-search"></i>
        <i class="fa-shopping-cart"></i>
        <span class="cart-count">0</span>
    </div>
</body>
</html>
`, {
    url: 'http://localhost:3000',
    pretendToBeVisual: true,
    resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;
global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};
global.fetch = jest.fn();

// Mock CSS variables
Object.defineProperty(dom.window.document.documentElement.style, 'setProperty', {
    value: jest.fn()
});

// Load the component files
function loadComponent(filename) {
    const filePath = path.join(__dirname, 'js', filename);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Remove module.exports for browser environment
    const browserContent = content.replace(/if \(typeof module.*\n.*module\.exports.*\n\}/g, '');
    
    // Execute in global context
    eval(browserContent);
}

describe('Frontend Modular Component System', () => {
    beforeAll(() => {
        // Load all components
        loadComponent('ApiClient.js');
        loadComponent('NotificationManager.js');
        loadComponent('CartManager.js');
        loadComponent('ProductManager.js');
        loadComponent('UserManager.js');
    });

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        localStorage.getItem.mockReturnValue(null);
        
        // Reset DOM
        document.body.innerHTML = `
            <div id="productGrid"></div>
            <div class="nav-icons">
                <i class="fa-search"></i>
                <i class="fa-shopping-cart"></i>
                <span class="cart-count">0</span>
            </div>
        `;
    });

    describe('ApiClient', () => {
        test('should instantiate correctly', () => {
            const apiClient = new ApiClient();
            expect(apiClient).toBeDefined();
            expect(apiClient.baseUrl).toBe('/api');
        });

        test('should generate session ID', () => {
            const apiClient = new ApiClient();
            expect(apiClient.sessionId).toBeDefined();
            expect(apiClient.sessionId).toMatch(/^guest_\d+_[a-z0-9]+$/);
        });

        test('should set and get headers correctly', () => {
            const apiClient = new ApiClient();
            const headers = apiClient.getHeaders();
            
            expect(headers['Content-Type']).toBe('application/json');
            expect(headers['X-Session-ID']).toBeDefined();
        });

        test('should handle token setting', () => {
            const apiClient = new ApiClient();
            const token = 'test-token-123';
            
            apiClient.setToken(token);
            expect(apiClient.token).toBe(token);
            
            const headers = apiClient.getHeaders();
            expect(headers['Authorization']).toBe(`Bearer ${token}`);
        });
    });

    describe('NotificationManager', () => {
        test('should instantiate correctly', () => {
            const notificationManager = new NotificationManager();
            expect(notificationManager).toBeDefined();
            expect(notificationManager.notifications).toEqual([]);
            expect(notificationManager.maxNotifications).toBe(5);
        });

        test('should create container on init', () => {
            const notificationManager = new NotificationManager();
            const container = document.querySelector('.notification-container');
            expect(container).toBeDefined();
        });

        test('should create notification element', () => {
            const notificationManager = new NotificationManager();
            const notification = notificationManager.createNotification('Test message', 'success');
            
            expect(notification).toBeDefined();
            expect(notification.classList.contains('cyber-notification')).toBe(true);
            expect(notification.classList.contains('success')).toBe(true);
            expect(notification.textContent).toContain('Test message');
        });

        test('should handle different notification types', () => {
            const notificationManager = new NotificationManager();
            
            const successNotif = notificationManager.createNotification('Success', 'success');
            const errorNotif = notificationManager.createNotification('Error', 'error');
            const warningNotif = notificationManager.createNotification('Warning', 'warning');
            const infoNotif = notificationManager.createNotification('Info', 'info');
            
            expect(successNotif.classList.contains('success')).toBe(true);
            expect(errorNotif.classList.contains('error')).toBe(true);
            expect(warningNotif.classList.contains('warning')).toBe(true);
            expect(infoNotif.classList.contains('info')).toBe(true);
        });
    });

    describe('CartManager', () => {
        test('should instantiate correctly', () => {
            const cartManager = new CartManager();
            expect(cartManager).toBeDefined();
            expect(cartManager.cart).toEqual([]);
            expect(cartManager.isAuthenticated).toBe(false);
        });

        test('should generate session ID', () => {
            const cartManager = new CartManager();
            expect(cartManager.sessionId).toBeDefined();
            expect(cartManager.sessionId).toMatch(/^guest_\d+_[a-z0-9]+$/);
        });

        test('should calculate total correctly', () => {
            const cartManager = new CartManager();
            cartManager.cart = [
                { id: 1, price: 10.99, quantity: 2 },
                { id: 2, price: 5.50, quantity: 1 }
            ];
            
            const total = cartManager.getTotal();
            expect(total).toBe(27.48); // (10.99 * 2) + (5.50 * 1)
        });

        test('should calculate item count correctly', () => {
            const cartManager = new CartManager();
            cartManager.cart = [
                { id: 1, price: 10.99, quantity: 2 },
                { id: 2, price: 5.50, quantity: 3 }
            ];
            
            const itemCount = cartManager.getItemCount();
            expect(itemCount).toBe(5); // 2 + 3
        });

        test('should set authentication status', () => {
            const cartManager = new CartManager();
            const token = 'test-token';
            
            cartManager.setAuthenticated(true, token);
            expect(cartManager.isAuthenticated).toBe(true);
            expect(cartManager.userToken).toBe(token);
        });
    });

    describe('ProductManager', () => {
        test('should instantiate correctly', () => {
            const apiClient = new ApiClient();
            const productManager = new ProductManager(apiClient);
            
            expect(productManager).toBeDefined();
            expect(productManager.apiClient).toBe(apiClient);
            expect(productManager.products).toEqual([]);
            expect(productManager.filteredProducts).toEqual([]);
        });

        test('should get fallback products', () => {
            const apiClient = new ApiClient();
            const productManager = new ProductManager(apiClient);
            
            const products = productManager.getFallbackProducts();
            expect(products).toBeDefined();
            expect(products.length).toBeGreaterThan(0);
            expect(products[0]).toHaveProperty('id');
            expect(products[0]).toHaveProperty('name');
            expect(products[0]).toHaveProperty('price');
        });

        test('should create product card', () => {
            const apiClient = new ApiClient();
            const productManager = new ProductManager(apiClient);
            
            const product = {
                id: 1,
                name: 'Test Product',
                description: 'Test Description',
                price: 99.99,
                icon: 'fas fa-test',
                inventory: 10
            };
            
            const card = productManager.createProductCard(product);
            expect(card).toBeDefined();
            expect(card.classList.contains('product-card')).toBe(true);
            expect(card.textContent).toContain('Test Product');
            expect(card.textContent).toContain('$99.99');
        });

        test('should handle out of stock products', () => {
            const apiClient = new ApiClient();
            const productManager = new ProductManager(apiClient);
            
            const product = {
                id: 1,
                name: 'Out of Stock Product',
                description: 'Test Description',
                price: 99.99,
                icon: 'fas fa-test',
                inventory: 0
            };
            
            const card = productManager.createProductCard(product);
            expect(card.textContent).toContain('OUT OF STOCK');
            
            const button = card.querySelector('.add-to-cart');
            expect(button.disabled).toBe(true);
        });

        test('should filter products by search query', () => {
            const apiClient = new ApiClient();
            const productManager = new ProductManager(apiClient);
            
            productManager.products = [
                { id: 1, name: 'Neural Link', description: 'Brain interface', category: 'neural' },
                { id: 2, name: 'Quantum Cell', description: 'Power source', category: 'quantum' },
                { id: 3, name: 'Bio Watch', description: 'Health monitor', category: 'biometric' }
            ];
            
            productManager.searchQuery = 'neural';
            productManager.performSearch();
            
            expect(productManager.filteredProducts.length).toBe(1);
            expect(productManager.filteredProducts[0].name).toBe('Neural Link');
        });
    });

    describe('UserManager', () => {
        test('should instantiate correctly', () => {
            const apiClient = new ApiClient();
            const userManager = new UserManager(apiClient);
            
            expect(userManager).toBeDefined();
            expect(userManager.apiClient).toBe(apiClient);
            expect(userManager.isAuthenticated).toBe(false);
            expect(userManager.currentUser).toBe(null);
        });

        test('should handle authentication success', () => {
            const apiClient = new ApiClient();
            const userManager = new UserManager(apiClient);
            
            const authData = {
                token: 'test-token',
                user: { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' }
            };
            
            userManager.handleAuthSuccess(authData);
            
            expect(userManager.isAuthenticated).toBe(true);
            expect(userManager.token).toBe('test-token');
            expect(userManager.currentUser).toEqual(authData.user);
        });

        test('should clear authentication', () => {
            const apiClient = new ApiClient();
            const userManager = new UserManager(apiClient);
            
            // Set up authenticated state
            userManager.token = 'test-token';
            userManager.currentUser = { id: 1, name: 'John' };
            userManager.isAuthenticated = true;
            
            userManager.clearAuth();
            
            expect(userManager.isAuthenticated).toBe(false);
            expect(userManager.token).toBe(null);
            expect(userManager.currentUser).toBe(null);
        });

        test('should check authentication status', () => {
            const apiClient = new ApiClient();
            const userManager = new UserManager(apiClient);
            
            expect(userManager.isUserAuthenticated()).toBe(false);
            
            userManager.isAuthenticated = true;
            expect(userManager.isUserAuthenticated()).toBe(true);
        });
    });

    describe('Component Integration', () => {
        test('should work together in a complete flow', () => {
            // Initialize all components
            const apiClient = new ApiClient();
            const notificationManager = new NotificationManager();
            const cartManager = new CartManager();
            const productManager = new ProductManager(apiClient);
            const userManager = new UserManager(apiClient);
            
            // Test product loading and cart interaction
            const products = productManager.getFallbackProducts();
            expect(products.length).toBeGreaterThan(0);
            
            // Test adding product to cart
            const product = products[0];
            cartManager.cart.push({
                ...product,
                quantity: 1
            });
            
            expect(cartManager.getItemCount()).toBe(1);
            expect(cartManager.getTotal()).toBe(product.price);
            
            // Test authentication flow
            const authData = {
                token: 'integration-test-token',
                user: { id: 1, firstName: 'Test', lastName: 'User' }
            };
            
            userManager.handleAuthSuccess(authData);
            expect(userManager.isUserAuthenticated()).toBe(true);
            
            // Test API client token update
            apiClient.setToken(authData.token);
            const headers = apiClient.getHeaders();
            expect(headers['Authorization']).toBe(`Bearer ${authData.token}`);
        });
    });
});

module.exports = {
    testEnvironment: 'jsdom'
};