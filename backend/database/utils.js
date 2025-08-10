const database = require('../config/database');
const { Product, User, Cart, Order } = require('../models');

/**
 * Database utility functions for common operations
 */
class DatabaseUtils {
  
  /**
   * Initialize database with schema and seed data
   */
  static async initialize() {
    const { runMigrations } = require('./migrate');
    const { seedDatabase } = require('./seed');
    
    try {
      console.log('Initializing database...');
      await runMigrations();
      await seedDatabase();
      console.log('Database initialization completed successfully!');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Reset database (drop all data and reinitialize)
   */
  static async reset() {
    try {
      await database.connect();
      
      // Drop all tables
      const tables = ['order_items', 'orders', 'cart_items', 'carts', 'user_addresses', 'products', 'users'];
      
      for (const table of tables) {
        await database.run(`DROP TABLE IF EXISTS ${table}`);
      }
      
      console.log('All tables dropped');
      await database.close();
      
      // Reinitialize
      await this.initialize();
    } catch (error) {
      console.error('Database reset failed:', error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  static async getStats() {
    try {
      await database.connect();
      
      const stats = {
        users: await database.count('users'),
        products: await database.count('products'),
        orders: await database.count('orders'),
        carts: await database.count('carts'),
        activeProducts: await database.count('products', 'is_active = 1'),
        adminUsers: await database.count('users', 'is_admin = 1'),
        completedOrders: await database.count('orders', 'payment_status = "completed"'),
        totalRevenue: 0
      };
      
      // Calculate total revenue
      const revenueResult = await database.get(`
        SELECT SUM(total_amount) as revenue 
        FROM orders 
        WHERE payment_status = 'completed'
      `);
      stats.totalRevenue = revenueResult?.revenue || 0;
      
      await database.close();
      return stats;
    } catch (error) {
      console.error('Failed to get database stats:', error);
      throw error;
    }
  }

  /**
   * Clean up old data (carts, expired sessions, etc.)
   */
  static async cleanup(options = {}) {
    try {
      await database.connect();
      
      const results = {
        deletedCarts: 0,
        deletedSessions: 0
      };
      
      // Clean up old empty carts (older than 30 days)
      const cartCleanupDays = options.cartCleanupDays || 30;
      const cartResult = await database.run(`
        DELETE FROM carts 
        WHERE id NOT IN (SELECT DISTINCT cart_id FROM cart_items)
        AND created_at < datetime('now', '-${cartCleanupDays} days')
      `);
      results.deletedCarts = cartResult.changes;
      
      // Clean up old guest carts with no items (older than 7 days)
      const guestCartResult = await database.run(`
        DELETE FROM carts 
        WHERE user_id IS NULL 
        AND id NOT IN (SELECT DISTINCT cart_id FROM cart_items)
        AND created_at < datetime('now', '-7 days')
      `);
      results.deletedSessions = guestCartResult.changes;
      
      await database.close();
      return results;
    } catch (error) {
      console.error('Database cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Backup database to JSON format
   */
  static async backup() {
    try {
      await database.connect();
      
      const backup = {
        timestamp: new Date().toISOString(),
        users: await database.all('SELECT * FROM users'),
        products: await database.all('SELECT * FROM products'),
        orders: await database.all('SELECT * FROM orders'),
        orderItems: await database.all('SELECT * FROM order_items'),
        userAddresses: await database.all('SELECT * FROM user_addresses')
      };
      
      await database.close();
      return backup;
    } catch (error) {
      console.error('Database backup failed:', error);
      throw error;
    }
  }

  /**
   * Validate database integrity
   */
  static async validateIntegrity() {
    try {
      await database.connect();
      
      const issues = [];
      
      // Check for orphaned cart items
      const orphanedCartItems = await database.all(`
        SELECT ci.id, ci.cart_id, ci.product_id 
        FROM cart_items ci 
        LEFT JOIN carts c ON ci.cart_id = c.id 
        WHERE c.id IS NULL
      `);
      
      if (orphanedCartItems.length > 0) {
        issues.push({
          type: 'orphaned_cart_items',
          count: orphanedCartItems.length,
          items: orphanedCartItems
        });
      }
      
      // Check for orphaned order items
      const orphanedOrderItems = await database.all(`
        SELECT oi.id, oi.order_id, oi.product_id 
        FROM order_items oi 
        LEFT JOIN orders o ON oi.order_id = o.id 
        WHERE o.id IS NULL
      `);
      
      if (orphanedOrderItems.length > 0) {
        issues.push({
          type: 'orphaned_order_items',
          count: orphanedOrderItems.length,
          items: orphanedOrderItems
        });
      }
      
      // Check for products with negative inventory
      const negativeInventory = await database.all(`
        SELECT id, name, inventory 
        FROM products 
        WHERE inventory < 0
      `);
      
      if (negativeInventory.length > 0) {
        issues.push({
          type: 'negative_inventory',
          count: negativeInventory.length,
          items: negativeInventory
        });
      }
      
      await database.close();
      
      return {
        isValid: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error('Database integrity validation failed:', error);
      throw error;
    }
  }

  /**
   * Get popular products based on order data
   */
  static async getPopularProducts(limit = 10) {
    try {
      await database.connect();
      
      const popularProducts = await database.all(`
        SELECT 
          p.id,
          p.name,
          p.price,
          p.category,
          p.icon,
          COUNT(oi.id) as order_count,
          SUM(oi.quantity) as total_sold,
          SUM(oi.quantity * oi.price) as total_revenue
        FROM products p
        JOIN order_items oi ON p.id = oi.product_id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.payment_status = 'completed'
        GROUP BY p.id, p.name, p.price, p.category, p.icon
        ORDER BY total_sold DESC
        LIMIT ?
      `, [limit]);
      
      await database.close();
      return popularProducts;
    } catch (error) {
      console.error('Failed to get popular products:', error);
      throw error;
    }
  }

  /**
   * Get sales summary for a date range
   */
  static async getSalesSummary(startDate, endDate) {
    try {
      await database.connect();
      
      const summary = await database.get(`
        SELECT 
          COUNT(*) as total_orders,
          SUM(total_amount) as total_revenue,
          AVG(total_amount) as average_order_value,
          COUNT(DISTINCT user_id) as unique_customers
        FROM orders 
        WHERE payment_status = 'completed'
        AND created_at BETWEEN ? AND ?
      `, [startDate, endDate]);
      
      const dailySales = await database.all(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as orders,
          SUM(total_amount) as revenue
        FROM orders 
        WHERE payment_status = 'completed'
        AND created_at BETWEEN ? AND ?
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `, [startDate, endDate]);
      
      await database.close();
      
      return {
        summary: summary || { total_orders: 0, total_revenue: 0, average_order_value: 0, unique_customers: 0 },
        dailySales
      };
    } catch (error) {
      console.error('Failed to get sales summary:', error);
      throw error;
    }
  }
}

module.exports = DatabaseUtils;