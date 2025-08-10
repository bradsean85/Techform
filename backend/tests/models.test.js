const database = require('../config/database');
const { Product, User, Cart, Order } = require('../models');

async function testModels() {
  try {
    console.log('Starting model tests...');
    
    // Connect to database
    await database.connect();
    
    // Test Product model
    console.log('\n=== Testing Product Model ===');
    
    // Find all products
    const products = await Product.findAll();
    console.log(`✓ Found ${products.length} products`);
    
    // Find products by category
    const neuralTech = await Product.findByCategory('neural-tech');
    console.log(`✓ Found ${neuralTech.length} neural-tech products`);
    
    // Find product by ID
    if (products.length > 0) {
      const product = await Product.findById(products[0].id);
      console.log(`✓ Found product by ID: ${product.name}`);
      
      // Test inventory operations
      const originalInventory = product.inventory;
      await product.updateInventory(originalInventory + 5);
      console.log(`✓ Updated inventory from ${originalInventory} to ${product.inventory}`);
      
      // Restore original inventory
      await product.updateInventory(originalInventory);
      console.log(`✓ Restored inventory to ${product.inventory}`);
    }
    
    // Test low stock
    const lowStock = await Product.getLowStock(10);
    console.log(`✓ Found ${lowStock.length} low stock products`);
    
    // Test User model
    console.log('\n=== Testing User Model ===');
    
    // Find user by email
    const admin = await User.findByEmail('admin@cyberpunk-store.com');
    console.log(`✓ Found admin user: ${admin.fullName}`);
    
    // Find customer
    const customer = await User.findByEmail('customer@test.com');
    console.log(`✓ Found customer: ${customer.fullName}`);
    
    // Test password verification
    const isValidPassword = await customer.verifyPassword('customer123');
    console.log(`✓ Password verification: ${isValidPassword}`);
    
    // Test Cart model
    console.log('\n=== Testing Cart Model ===');
    
    // Create cart for customer
    const cart = await Cart.getOrCreate(customer.id);
    console.log(`✓ Created/retrieved cart for customer: ${cart.id}`);
    
    // Add item to cart
    if (products.length > 0) {
      await cart.addItem(products[0].id, 2);
      console.log(`✓ Added ${products[0].name} to cart (quantity: 2)`);
      
      // Update quantity
      await cart.updateItemQuantity(products[0].id, 3);
      console.log(`✓ Updated cart item quantity to 3`);
      
      // Check cart total
      console.log(`✓ Cart total: $${cart.getTotal().toFixed(2)}`);
      console.log(`✓ Cart item count: ${cart.getItemCount()}`);
      
      // Validate cart
      const issues = await cart.validateItems();
      console.log(`✓ Cart validation issues: ${issues.length}`);
      
      // Test Order model
      console.log('\n=== Testing Order Model ===');
      
      // Create test order
      const orderData = {
        userId: customer.id,
        items: cart.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        })),
        shippingAddress: {
          street: '123 Cyber Street',
          city: 'Neo Tokyo',
          state: 'CA',
          zipCode: '90210',
          country: 'US'
        },
        paymentMethod: 'credit_card'
      };
      
      const order = await Order.create(orderData);
      console.log(`✓ Created order: ${order.id} for $${order.totalAmount}`);
      
      // Test order status update
      await order.updateStatus('confirmed');
      console.log(`✓ Updated order status to: ${order.status}`);
      
      // Test payment status update
      await order.updatePaymentStatus('completed');
      console.log(`✓ Updated payment status to: ${order.paymentStatus}`);
      
      // Find orders by user
      const userOrders = await Order.findByUserId(customer.id);
      console.log(`✓ Found ${userOrders.length} orders for customer`);
      
      // Test order analytics
      const analytics = await Order.getAnalytics();
      console.log(`✓ Order analytics - Total orders: ${analytics.totalSales.order_count}, Revenue: $${analytics.totalSales.total_revenue || 0}`);
      
      // Clear cart after order
      await cart.clear();
      console.log(`✓ Cleared cart after order`);
    }
    
    console.log('\n=== All Model Tests Passed! ===');
    
  } catch (error) {
    console.error('Model test failed:', error);
  } finally {
    await database.close();
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testModels();
}

module.exports = { testModels };