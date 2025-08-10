const database = require('../config/database');
const Product = require('./Product');
const User = require('./User');

class Order {
  constructor(data = {}) {
    this.id = data.id;
    this.userId = data.user_id;
    this.totalAmount = data.total_amount;
    this.status = data.status;
    this.shippingAddress = data.shipping_address;
    this.paymentMethod = data.payment_method;
    this.paymentStatus = data.payment_status;
    this.trackingNumber = data.tracking_number;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    this.items = [];
  }

  // Create new order
  static async create(orderData) {
    try {
      // Validate required fields
      if (!orderData.userId || !orderData.items || !orderData.shippingAddress) {
        throw new Error('Missing required order data');
      }

      // Calculate total amount
      let totalAmount = 0;
      const orderItems = [];

      // Validate items and calculate total
      for (const item of orderData.items) {
        const product = await Product.findById(item.productId);
        if (!product || !product.isActive) {
          throw new Error(`Product ${item.productId} not found or inactive`);
        }

        // Check inventory
        if (item.quantity > product.inventory) {
          throw new Error(`Insufficient inventory for product ${product.name}`);
        }

        const itemTotal = product.price * item.quantity;
        totalAmount += itemTotal;

        orderItems.push({
          productId: item.productId,
          quantity: item.quantity,
          price: product.price,
          productSnapshot: JSON.stringify(product.toJSON())
        });
      }

      // Create order
      const result = await database.run(`
        INSERT INTO orders (user_id, total_amount, status, shipping_address, payment_method, payment_status)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        orderData.userId,
        totalAmount,
        orderData.status || 'pending',
        JSON.stringify(orderData.shippingAddress),
        orderData.paymentMethod || null,
        orderData.paymentStatus || 'pending'
      ]);

      const orderId = result.id;

      // Create order items and reduce inventory
      for (const item of orderItems) {
        await database.run(`
          INSERT INTO order_items (order_id, product_id, quantity, price, product_snapshot)
          VALUES (?, ?, ?, ?, ?)
        `, [orderId, item.productId, item.quantity, item.price, item.productSnapshot]);

        // Reduce product inventory
        const product = await Product.findById(item.productId);
        const inventoryReduced = await product.reduceInventory(item.quantity);
        
        if (!inventoryReduced) {
          // Rollback the order if inventory reduction fails
          await database.run('DELETE FROM orders WHERE id = ?', [orderId]);
          await database.run('DELETE FROM order_items WHERE order_id = ?', [orderId]);
          throw new Error(`Failed to reduce inventory for product ${product.name}. Order cancelled.`);
        }
      }

      // Load and return the created order
      return await Order.findById(orderId);
    } catch (error) {
      throw new Error(`Failed to create order: ${error.message}`);
    }
  }

  // Find order by ID
  static async findById(id) {
    try {
      const row = await database.get('SELECT * FROM orders WHERE id = ?', [id]);
      if (!row) return null;

      const order = new Order(row);
      await order.loadItems();
      return order;
    } catch (error) {
      throw new Error(`Failed to find order: ${error.message}`);
    }
  }

  // Find orders by user ID
  static async findByUserId(userId, filters = {}) {
    try {
      let sql = 'SELECT * FROM orders WHERE user_id = ?';
      const params = [userId];

      if (filters.status) {
        sql += ' AND status = ?';
        params.push(filters.status);
      }

      if (filters.paymentStatus) {
        sql += ' AND payment_status = ?';
        params.push(filters.paymentStatus);
      }

      sql += ' ORDER BY created_at DESC';

      if (filters.limit) {
        sql += ' LIMIT ?';
        params.push(filters.limit);
      }

      const rows = await database.all(sql, params);
      const orders = [];

      for (const row of rows) {
        const order = new Order(row);
        await order.loadItems();
        orders.push(order);
      }

      return orders;
    } catch (error) {
      throw new Error(`Failed to find orders by user: ${error.message}`);
    }
  }

  // Find all orders (admin)
  static async findAll(filters = {}) {
    try {
      let sql = 'SELECT * FROM orders WHERE 1=1';
      const params = [];

      if (filters.status) {
        sql += ' AND status = ?';
        params.push(filters.status);
      }

      if (filters.paymentStatus) {
        sql += ' AND payment_status = ?';
        params.push(filters.paymentStatus);
      }

      if (filters.dateFrom) {
        sql += ' AND created_at >= ?';
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        sql += ' AND created_at <= ?';
        params.push(filters.dateTo);
      }

      sql += ' ORDER BY created_at DESC';

      if (filters.limit) {
        sql += ' LIMIT ?';
        params.push(filters.limit);
      }

      const rows = await database.all(sql, params);
      const orders = [];

      for (const row of rows) {
        const order = new Order(row);
        await order.loadItems();
        orders.push(order);
      }

      return orders;
    } catch (error) {
      throw new Error(`Failed to find all orders: ${error.message}`);
    }
  }

  // Load order items
  async loadItems() {
    try {
      const rows = await database.all(`
        SELECT oi.*, p.name, p.icon
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
        ORDER BY oi.id ASC
      `, [this.id]);

      this.items = rows.map(row => ({
        id: row.id,
        productId: row.product_id,
        quantity: row.quantity,
        price: row.price,
        productSnapshot: row.product_snapshot ? JSON.parse(row.product_snapshot) : null,
        product: {
          name: row.name,
          icon: row.icon
        }
      }));
    } catch (error) {
      throw new Error(`Failed to load order items: ${error.message}`);
    }
  }

  // Update order status
  async updateStatus(status) {
    try {
      const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        throw new Error('Invalid order status');
      }

      const result = await database.run(`
        UPDATE orders 
        SET status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [status, this.id]);

      if (result.changes > 0) {
        this.status = status;
        return true;
      }
      return false;
    } catch (error) {
      throw new Error(`Failed to update order status: ${error.message}`);
    }
  }

  // Update payment status
  async updatePaymentStatus(paymentStatus) {
    try {
      const validStatuses = ['pending', 'processing', 'completed', 'failed', 'refunded'];
      if (!validStatuses.includes(paymentStatus)) {
        throw new Error('Invalid payment status');
      }

      const result = await database.run(`
        UPDATE orders 
        SET payment_status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [paymentStatus, this.id]);

      if (result.changes > 0) {
        this.paymentStatus = paymentStatus;
        return true;
      }
      return false;
    } catch (error) {
      throw new Error(`Failed to update payment status: ${error.message}`);
    }
  }

  // Add tracking number
  async addTrackingNumber(trackingNumber) {
    try {
      const result = await database.run(`
        UPDATE orders 
        SET tracking_number = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [trackingNumber, this.id]);

      if (result.changes > 0) {
        this.trackingNumber = trackingNumber;
        return true;
      }
      return false;
    } catch (error) {
      throw new Error(`Failed to add tracking number: ${error.message}`);
    }
  }

  // Cancel order
  async cancel() {
    try {
      if (this.status === 'cancelled') {
        throw new Error('Order is already cancelled');
      }

      if (['shipped', 'delivered'].includes(this.status)) {
        throw new Error('Cannot cancel shipped or delivered order');
      }

      // Restore inventory for cancelled orders
      await this.loadItems(); // Ensure items are loaded
      for (const item of this.items) {
        const product = await Product.findById(item.productId);
        if (product) {
          const newInventory = product.inventory + item.quantity;
          await product.updateInventory(newInventory);
          console.log(`Restored ${item.quantity} units to product ${product.name}. New inventory: ${newInventory}`);
        }
      }

      await this.updateStatus('cancelled');
      return true;
    } catch (error) {
      throw new Error(`Failed to cancel order: ${error.message}`);
    }
  }

  // Process payment completion (reduces inventory if not already done)
  async processPaymentCompletion() {
    try {
      if (this.paymentStatus === 'completed') {
        return true; // Already processed
      }

      // Update payment status
      await this.updatePaymentStatus('completed');
      
      // Update order status to confirmed if still pending
      if (this.status === 'pending') {
        await this.updateStatus('confirmed');
      }

      return true;
    } catch (error) {
      throw new Error(`Failed to process payment completion: ${error.message}`);
    }
  }

  // Get order analytics
  static async getAnalytics(filters = {}) {
    try {
      let dateFilter = '';
      const params = [];

      if (filters.dateFrom) {
        dateFilter += ' AND created_at >= ?';
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        dateFilter += ' AND created_at <= ?';
        params.push(filters.dateTo);
      }

      // Total sales
      const totalSales = await database.get(`
        SELECT 
          COUNT(*) as order_count,
          SUM(total_amount) as total_revenue,
          AVG(total_amount) as average_order_value
        FROM orders 
        WHERE payment_status = 'completed'${dateFilter}
      `, params);

      // Sales by status
      const salesByStatus = await database.all(`
        SELECT status, COUNT(*) as count, SUM(total_amount) as revenue
        FROM orders 
        WHERE 1=1${dateFilter}
        GROUP BY status
        ORDER BY count DESC
      `, params);

      // Top selling products
      const topProducts = await database.all(`
        SELECT 
          oi.product_id,
          p.name,
          SUM(oi.quantity) as total_sold,
          SUM(oi.quantity * oi.price) as total_revenue
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE o.payment_status = 'completed'${dateFilter}
        GROUP BY oi.product_id, p.name
        ORDER BY total_sold DESC
        LIMIT 10
      `, params);

      return {
        totalSales: totalSales || { order_count: 0, total_revenue: 0, average_order_value: 0 },
        salesByStatus,
        topProducts
      };
    } catch (error) {
      throw new Error(`Failed to get order analytics: ${error.message}`);
    }
  }

  // Get user information
  async getUser() {
    try {
      return await User.findById(this.userId);
    } catch (error) {
      throw new Error(`Failed to get order user: ${error.message}`);
    }
  }

  // Convert to JSON (for API responses)
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      totalAmount: this.totalAmount,
      status: this.status,
      shippingAddress: this.shippingAddress ? JSON.parse(this.shippingAddress) : null,
      paymentMethod: this.paymentMethod,
      paymentStatus: this.paymentStatus,
      trackingNumber: this.trackingNumber,
      items: this.items,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Order;