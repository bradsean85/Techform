/**
 * Enhanced Cart Modal Tests
 * Tests for the comprehensive shopping cart UI functionality
 */

// Mock dependencies
const mockCartManager = {
    getItems: jest.fn(),
    getTotal: jest.fn(),
    getItemCount: jest.fn(),
    updateQuantity: jest.fn(),
    removeItem: jest.fn(),
    syncInProgress: false
};

const mockUserManager = {
    isUserAuthenticated: jest.fn()
};

const mockNotificationManager = {
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn()
};

// Mock DOM methods
Object.defineProperty(window, 'localStorage', {
    value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
    }
});

// Mock document methods
document.createElement = jest.fn(() => ({
    className: '',
    innerHTML: '',
    classList: {
        add: jest.fn(),
        remove: jest.fn()
    },
    addEventListener: jest.fn(),
    querySelector: jest.fn(),
    remove: jest.fn(),
    focus: jest.fn()
}));

document.querySelector = jest.fn();
document.head = { appendChild: jest.fn() };
document.body = { appendChild: jest.fn() };
document.addEventListener = jest.fn();
document.removeEventListener = jest.fn();

describe('EnhancedCartModal', () => {
    let enhancedCartModal;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Mock cart items
        mockCartManager.getItems.mockReturnValue([
            {
                id: 1,
                name: 'Neural Audio Link',
                price: 1999.99,
                quantity: 2,
                icon: 'fas fa-brain',
                inventory: 10
            },
            {
                id: 2,
                name: 'Biometric Sync Watch',
                price: 2999.99,
                quantity: 1,
                icon: 'fas fa-heartbeat',
                inventory: 5
            }
        ]);
        
        mockCartManager.getTotal.mockReturnValue(6999.97);
        mockCartManager.getItemCount.mockReturnValue(3);
        mockUserManager.isUserAuthenticated.mockReturnValue(false);
        
        // Create instance
        enhancedCartModal = new EnhancedCartModal(
            mockCartManager,
            mockUserManager,
            mockNotificationManager
        );
    });

    describe('Initialization', () => {
        test('should initialize with correct dependencies', () => {
            expect(enhancedCartModal.cartManager).toBe(mockCartManager);
            expect(enhancedCartModal.userManager).toBe(mockUserManager);
            expect(enhancedCartModal.notificationManager).toBe(mockNotificationManager);
        });

        test('should set correct tax rate and shipping threshold', () => {
            expect(enhancedCartModal.TAX_RATE).toBe(0.085);
            expect(enhancedCartModal.FREE_SHIPPING_THRESHOLD).toBe(100);
            expect(enhancedCartModal.SHIPPING_COST).toBe(15);
        });
    });

    describe('Tax and Shipping Calculations', () => {
        test('should calculate tax correctly', () => {
            const subtotal = 100;
            const tax = enhancedCartModal.calculateTax(subtotal);
            expect(tax).toBe(8.5);
        });

        test('should calculate shipping for orders under threshold', () => {
            const subtotal = 50;
            const shipping = enhancedCartModal.calculateShipping(subtotal);
            expect(shipping).toBe(15);
        });

        test('should calculate free shipping for orders over threshold', () => {
            const subtotal = 150;
            const shipping = enhancedCartModal.calculateShipping(subtotal);
            expect(shipping).toBe(0);
        });

        test('should calculate free shipping for orders at threshold', () => {
            const subtotal = 100;
            const shipping = enhancedCartModal.calculateShipping(subtotal);
            expect(shipping).toBe(0);
        });
    });

    describe('Sync Status Indicators', () => {
        test('should show guest status for unauthenticated users', () => {
            mockUserManager.isUserAuthenticated.mockReturnValue(false);
            
            const status = enhancedCartModal.getSyncStatusIndicator();
            
            expect(status.class).toBe('sync-guest');
            expect(status.text).toBe('Guest Cart (Local Storage)');
            expect(status.icon).toBe('fas fa-user-slash');
        });

        test('should show syncing status when sync in progress', () => {
            mockUserManager.isUserAuthenticated.mockReturnValue(true);
            mockCartManager.syncInProgress = true;
            
            const status = enhancedCartModal.getSyncStatusIndicator();
            
            expect(status.class).toBe('sync-progress');
            expect(status.text).toBe('Syncing...');
            expect(status.icon).toBe('fas fa-sync fa-spin');
        });

        test('should show synced status for authenticated users', () => {
            mockUserManager.isUserAuthenticated.mockReturnValue(true);
            mockCartManager.syncInProgress = false;
            
            const status = enhancedCartModal.getSyncStatusIndicator();
            
            expect(status.class).toBe('sync-complete');
            expect(status.text).toBe('Synced');
            expect(status.icon).toBe('fas fa-cloud-check');
        });
    });

    describe('Empty Cart Handling', () => {
        test('should show empty cart notification when no items', () => {
            mockCartManager.getItems.mockReturnValue([]);
            
            enhancedCartModal.show();
            
            expect(mockNotificationManager.info).toHaveBeenCalledWith(
                'Your cart is empty!',
                expect.objectContaining({
                    title: 'Empty Cart',
                    actions: expect.arrayContaining([
                        expect.objectContaining({
                            label: 'Browse Products'
                        })
                    ])
                })
            );
        });
    });

    describe('Modal Display', () => {
        test('should create modal with correct structure', () => {
            const mockModal = {
                className: '',
                innerHTML: '',
                classList: { add: jest.fn(), remove: jest.fn() },
                addEventListener: jest.fn(),
                querySelector: jest.fn(() => ({ focus: jest.fn() })),
                remove: jest.fn()
            };
            
            document.createElement.mockReturnValue(mockModal);
            
            enhancedCartModal.show();
            
            expect(document.createElement).toHaveBeenCalledWith('div');
            expect(mockModal.className).toBe('cart-modal');
            expect(document.body.appendChild).toHaveBeenCalledWith(mockModal);
        });

        test('should generate correct modal HTML with items', () => {
            const items = mockCartManager.getItems();
            const subtotal = 6999.97;
            const tax = enhancedCartModal.calculateTax(subtotal);
            const shipping = enhancedCartModal.calculateShipping(subtotal);
            const total = subtotal + tax + shipping;
            const itemCount = 3;
            const syncStatus = enhancedCartModal.getSyncStatusIndicator();
            
            const html = enhancedCartModal.generateModalHTML(
                items, subtotal, tax, shipping, total, itemCount, syncStatus
            );
            
            expect(html).toContain('Neural Cart');
            expect(html).toContain('3 items');
            expect(html).toContain('Neural Audio Link');
            expect(html).toContain('Biometric Sync Watch');
            expect(html).toContain('$6999.97');
        });

        test('should generate correct item HTML', () => {
            const item = {
                id: 1,
                name: 'Test Product',
                price: 99.99,
                quantity: 2,
                icon: 'fas fa-test',
                inventory: 10
            };
            
            const html = enhancedCartModal.generateItemHTML(item);
            
            expect(html).toContain('Test Product');
            expect(html).toContain('$99.99');
            expect(html).toContain('quantity: 2');
            expect(html).toContain('10 in stock');
            expect(html).toContain('fas fa-test');
        });

        test('should generate correct summary HTML', () => {
            const subtotal = 100;
            const tax = 8.5;
            const shipping = 0;
            const total = 108.5;
            const itemCount = 2;
            
            const html = enhancedCartModal.generateSummaryHTML(
                subtotal, tax, shipping, total, itemCount
            );
            
            expect(html).toContain('Subtotal (2 items)');
            expect(html).toContain('$100.00');
            expect(html).toContain('Tax (8.5%)');
            expect(html).toContain('$8.50');
            expect(html).toContain('FREE');
            expect(html).toContain('$108.50');
        });
    });

    describe('Quantity Updates', () => {
        test('should update quantity successfully', async () => {
            mockCartManager.updateQuantity.mockResolvedValue(true);
            mockCartManager.getItems.mockReturnValue([
                { id: 1, name: 'Test', price: 10, quantity: 3 }
            ]);
            
            await enhancedCartModal.updateQuantity(1, 3);
            
            expect(mockCartManager.updateQuantity).toHaveBeenCalledWith(1, 3);
        });

        test('should remove item when quantity is zero or negative', async () => {
            mockCartManager.removeItem.mockResolvedValue(true);
            
            await enhancedCartModal.updateQuantity(1, 0);
            
            expect(mockCartManager.removeItem).toHaveBeenCalledWith(1);
        });

        test('should handle quantity update errors', async () => {
            mockCartManager.updateQuantity.mockRejectedValue(new Error('Update failed'));
            
            await enhancedCartModal.updateQuantity(1, 2);
            
            expect(mockNotificationManager.error).toHaveBeenCalledWith('Failed to update quantity');
        });
    });

    describe('Item Removal', () => {
        test('should remove item successfully', async () => {
            mockCartManager.removeItem.mockResolvedValue(true);
            mockCartManager.getItems.mockReturnValue([]);
            
            await enhancedCartModal.removeItem(1);
            
            expect(mockCartManager.removeItem).toHaveBeenCalledWith(1);
            expect(mockNotificationManager.success).toHaveBeenCalledWith('Item removed from cart');
        });

        test('should handle item removal errors', async () => {
            mockCartManager.removeItem.mockRejectedValue(new Error('Remove failed'));
            
            await enhancedCartModal.removeItem(1);
            
            expect(mockNotificationManager.error).toHaveBeenCalledWith('Failed to remove item');
        });
    });

    describe('Checkout Process', () => {
        test('should proceed to checkout for authenticated users', () => {
            mockUserManager.isUserAuthenticated.mockReturnValue(true);
            
            enhancedCartModal.proceedToCheckout();
            
            expect(mockNotificationManager.info).toHaveBeenCalledWith(
                'Checkout functionality coming soon!',
                { title: 'Coming Soon' }
            );
        });

        test('should prompt login for unauthenticated users', () => {
            mockUserManager.isUserAuthenticated.mockReturnValue(false);
            
            enhancedCartModal.proceedToCheckout();
            
            expect(mockNotificationManager.info).toHaveBeenCalledWith(
                'Please log in to proceed to checkout',
                expect.objectContaining({
                    title: 'Authentication Required',
                    actions: expect.arrayContaining([
                        expect.objectContaining({
                            label: 'Login'
                        })
                    ])
                })
            );
        });
    });

    describe('Event Handling', () => {
        test('should handle quantity control button clicks', async () => {
            const mockEvent = {
                target: {
                    closest: jest.fn(() => ({
                        dataset: { productId: '1', action: 'increase' }
                    }))
                }
            };
            
            mockCartManager.getItems.mockReturnValue([
                { id: 1, quantity: 2 }
            ]);
            mockCartManager.updateQuantity.mockResolvedValue(true);
            
            await enhancedCartModal.handleQuantityControls(mockEvent);
            
            expect(mockCartManager.updateQuantity).toHaveBeenCalledWith(1, 3);
        });

        test('should handle remove item button clicks', async () => {
            const mockEvent = {
                target: {
                    closest: jest.fn()
                        .mockReturnValueOnce(null) // First call for quantity-btn
                        .mockReturnValueOnce({ // Second call for remove-item
                            dataset: { productId: '1' }
                        })
                }
            };
            
            mockCartManager.removeItem.mockResolvedValue(true);
            mockCartManager.getItems.mockReturnValue([]);
            
            await enhancedCartModal.handleQuantityControls(mockEvent);
            
            expect(mockCartManager.removeItem).toHaveBeenCalledWith(1);
        });

        test('should handle quantity input changes', async () => {
            const mockEvent = {
                target: {
                    classList: { contains: jest.fn(() => true) },
                    dataset: { productId: '1' },
                    value: '5'
                }
            };
            
            mockCartManager.updateQuantity.mockResolvedValue(true);
            mockCartManager.getItems.mockReturnValue([
                { id: 1, quantity: 5 }
            ]);
            
            await enhancedCartModal.handleQuantityInput(mockEvent);
            
            expect(mockCartManager.updateQuantity).toHaveBeenCalledWith(1, 5);
        });

        test('should validate quantity input on blur', () => {
            const mockInput = {
                classList: { contains: jest.fn(() => true) },
                dataset: { productId: '1' },
                value: '0',
                min: '1',
                max: '10'
            };
            
            const mockEvent = { target: mockInput };
            
            mockCartManager.getItems.mockReturnValue([
                { id: 1, quantity: 2 }
            ]);
            
            enhancedCartModal.handleQuantityBlur(mockEvent);
            
            expect(mockInput.value).toBe(1);
        });

        test('should handle keyboard navigation', () => {
            enhancedCartModal.currentModal = { remove: jest.fn() };
            
            const escapeEvent = { key: 'Escape' };
            enhancedCartModal.handleKeydown(escapeEvent);
            
            expect(enhancedCartModal.currentModal.remove).toHaveBeenCalled();
        });
    });

    describe('Modal Lifecycle', () => {
        test('should close modal properly', () => {
            const mockModal = {
                classList: { remove: jest.fn() },
                remove: jest.fn()
            };
            
            enhancedCartModal.currentModal = mockModal;
            enhancedCartModal.keydownHandler = jest.fn();
            
            enhancedCartModal.close();
            
            expect(mockModal.classList.remove).toHaveBeenCalledWith('modal-open');
            expect(document.removeEventListener).toHaveBeenCalledWith(
                'keydown',
                enhancedCartModal.keydownHandler
            );
        });

        test('should add enhanced styles only once', () => {
            document.querySelector.mockReturnValue(null); // First call
            
            enhancedCartModal.addEnhancedStyles();
            
            expect(document.createElement).toHaveBeenCalledWith('style');
            expect(document.head.appendChild).toHaveBeenCalled();
            
            // Second call should not add styles again
            document.querySelector.mockReturnValue({}); // Style exists
            jest.clearAllMocks();
            
            enhancedCartModal.addEnhancedStyles();
            
            expect(document.createElement).not.toHaveBeenCalled();
        });
    });

    describe('Accessibility', () => {
        test('should include proper ARIA labels in HTML', () => {
            const item = {
                id: 1,
                name: 'Test Product',
                price: 99.99,
                quantity: 2,
                icon: 'fas fa-test'
            };
            
            const html = enhancedCartModal.generateItemHTML(item);
            
            expect(html).toContain('aria-label="Decrease quantity"');
            expect(html).toContain('aria-label="Increase quantity"');
            expect(html).toContain('aria-label="Quantity"');
            expect(html).toContain('aria-label="Remove Test Product from cart"');
        });

        test('should focus on first input when modal opens', (done) => {
            const mockInput = { focus: jest.fn() };
            const mockModal = {
                className: '',
                innerHTML: '',
                classList: { add: jest.fn() },
                addEventListener: jest.fn(),
                querySelector: jest.fn(() => mockInput),
                remove: jest.fn()
            };
            
            document.createElement.mockReturnValue(mockModal);
            
            enhancedCartModal.show();
            
            setTimeout(() => {
                expect(mockInput.focus).toHaveBeenCalled();
                done();
            }, 150);
        });
    });

    describe('Error Handling', () => {
        test('should handle missing cart items gracefully', async () => {
            mockCartManager.getItems.mockReturnValue([]);
            
            await enhancedCartModal.updateQuantity(999, 1);
            
            // Should not throw error and should not call updateQuantity
            expect(mockCartManager.updateQuantity).not.toHaveBeenCalled();
        });

        test('should handle invalid quantity inputs', () => {
            const mockInput = {
                classList: { contains: jest.fn(() => true) },
                dataset: { productId: '1' },
                value: 'invalid',
                min: '1',
                max: '10'
            };
            
            const mockEvent = { target: mockInput };
            
            mockCartManager.getItems.mockReturnValue([
                { id: 1, quantity: 2 }
            ]);
            
            enhancedCartModal.handleQuantityBlur(mockEvent);
            
            expect(mockInput.value).toBe(1);
        });

        test('should warn when exceeding maximum quantity', () => {
            const mockInput = {
                classList: { contains: jest.fn(() => true) },
                dataset: { productId: '1' },
                value: '15',
                min: '1',
                max: '10'
            };
            
            const mockEvent = { target: mockInput };
            
            mockCartManager.getItems.mockReturnValue([
                { id: 1, quantity: 2 }
            ]);
            
            enhancedCartModal.handleQuantityBlur(mockEvent);
            
            expect(mockInput.value).toBe(10);
            expect(mockNotificationManager.warning).toHaveBeenCalledWith(
                'Maximum quantity available: 10'
            );
        });
    });
});

// Integration tests
describe('EnhancedCartModal Integration', () => {
    let enhancedCartModal;
    
    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = '';
        
        enhancedCartModal = new EnhancedCartModal(
            mockCartManager,
            mockUserManager,
            mockNotificationManager
        );
    });

    test('should integrate with real DOM elements', () => {
        // This would test actual DOM manipulation
        // In a real environment with jsdom or browser testing
        expect(enhancedCartModal).toBeDefined();
    });

    test('should handle real user interactions', () => {
        // This would test actual click events and form interactions
        // In a real environment with user event simulation
        expect(enhancedCartModal).toBeDefined();
    });
});

// Performance tests
describe('EnhancedCartModal Performance', () => {
    test('should handle large cart efficiently', () => {
        const largeCart = Array.from({ length: 100 }, (_, i) => ({
            id: i + 1,
            name: `Product ${i + 1}`,
            price: Math.random() * 1000,
            quantity: Math.floor(Math.random() * 10) + 1,
            icon: 'fas fa-test'
        }));
        
        mockCartManager.getItems.mockReturnValue(largeCart);
        
        const startTime = performance.now();
        enhancedCartModal.generateModalHTML(
            largeCart, 10000, 850, 0, 10850, 500, 
            { class: 'sync-complete', icon: 'fas fa-check', text: 'Synced' }
        );
        const endTime = performance.now();
        
        // Should complete within reasonable time (100ms)
        expect(endTime - startTime).toBeLessThan(100);
    });
});