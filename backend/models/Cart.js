const database = require('../config/database');
const Product = require('./Product');

class Cart {
  constructor(data = {}) {
    this.id = data.id;
    this.userId = data.user_id;
    this.sessionId = data.session_id;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    this.items = [];
  }

  // Create or get cart for user/session
  static async getOrCreate(userId = null, sessionId = null) {
    try {
      let cart;
      
      if (userId) {
        // Get cart for authenticated user
        const row = await database.get('SELECT * FROM carts WHERE user_id = ?', [userId]);
        if (row) {
          cart = new Cart(row);
        } else {
          // Create new cart for user
          const result = await database.run(`
            INSERT INTO carts (user_id) VALUES (?)
          `, [userId]);
          cart = new Cart({ id: result.id, user_id: userId });
        }
      } else if (sessionId) {
        // Get cart for guest session
        const row = await database.get('SELECT * FROM carts WHERE session_id = ?', [sessionId]);
        if (row) {
          cart = new Cart(row);
        } else {
          // Create new cart for session
          const result = await database.run(`
            INSERT INTO carts (session_id) VALUES (?)
          `, [sessionId]);
          cart = new Cart({ id: result.id, session_id: sessionId });
        }
      } else {
        throw new Error('Either userId or sessionId must be provided');
      }

      // Load cart items
      await cart.loadItems();
      return cart;
    } catch (error) {
      throw new Error(`Failed to get or create cart: ${error.message}`);
    }
  }

  // Load cart items
  async loadItems() {
    try {
      const rows = await database.all(`
        SELECT ci.*, p.name, p.price, p.icon, p.inventory, p.is_active
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.cart_id = ?
        ORDER BY ci.created_at ASC
      `, [this.id]);

      this.items = rows.map(row => ({
        id: row.id,
        productId: row.product_id,
        quantity: row.quantity,
        createdAt: row.created_at,
        product: {
          id: row.product_id,
          name: row.name,
          price: row.price,
          icon: row.icon,
          inventory: row.inventory,
          isActive: row.is_active
        }
      }));
    } catch (error) {
      throw new Error(`Failed to load cart items: ${error.message}`);
    }
  }

  // Add item to cart
  async addItem(productId, quantity = 1) {
    try {
      // Check if product exists and is active
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }
      if (!product.isActive) {
        throw new Error('Product is inactive');
      }

      // Check if item already exists in cart
      const existingItem = await database.get(`
        SELECT * FROM cart_items 
        WHERE cart_id = ? AND product_id = ?
      `, [this.id, productId]);

      if (existingItem) {
        // Update quantity
        const newQuantity = existingItem.quantity + quantity;
        
        // Check inventory
        if (newQuantity > product.inventory) {
          throw new Error('Insufficient inventory');
        }

        await database.run(`
          UPDATE cart_items 
          SET quantity = ? 
          WHERE cart_id = ? AND product_id = ?
        `, [newQuantity, this.id, productId]);
      } else {
        // Check inventory
        if (quantity > product.inventory) {
          throw new Error('Insufficient inventory');
        }

        // Add new item
        await database.run(`
          INSERT INTO cart_items (cart_id, product_id, quantity)
          VALUES (?, ?, ?)
        `, [this.id, productId, quantity]);
      }

      // Update cart timestamp
      await database.run(`
        UPDATE carts 
        SET updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [this.id]);

      // Reload items
      await this.loadItems();
      return true;
    } catch (error) {
      throw new Error(`Failed to add item to cart: ${error.message}`);
    }
  }

  // Update item quantity
  async updateItemQuantity(productId, quantity) {
    try {
      if (quantity <= 0) {
        return await this.removeItem(productId);
      }

      // Check if product exists and has sufficient inventory
      const product = await Product.findById(productId);
      if (!product || !product.isActive) {
        throw new Error('Product not found or inactive');
      }

      if (quantity > product.inventory) {
        throw new Error('Insufficient inventory');
      }

      const result = await database.run(`
        UPDATE cart_items 
        SET quantity = ? 
        WHERE cart_id = ? AND product_id = ?
      `, [quantity, this.id, productId]);

      if (result.changes === 0) {
        throw new Error('Item not found in cart');
      }

      // Update cart timestamp
      await database.run(`
        UPDATE carts 
        SET updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [this.id]);

      // Reload items
      await this.loadItems();
      return true;
    } catch (error) {
      throw new Error(`Failed to update item quantity: ${error.message}`);
    }
  }

  // Remove item from cart
  async removeItem(productId) {
    try {
      const result = await database.run(`
        DELETE FROM cart_items 
        WHERE cart_id = ? AND product_id = ?
      `, [this.id, productId]);

      if (result.changes === 0) {
        throw new Error('Item not found in cart');
      }

      // Update cart timestamp
      await database.run(`
        UPDATE carts 
        SET updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [this.id]);

      // Reload items
      await this.loadItems();
      return true;
    } catch (error) {
      throw new Error(`Failed to remove item from cart: ${error.message}`);
    }
  }

  // Clear all items from cart
  async clear() {
    try {
      await database.run('DELETE FROM cart_items WHERE cart_id = ?', [this.id]);
      
      // Update cart timestamp
      await database.run(`
        UPDATE carts 
        SET updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [this.id]);

      this.items = [];
      return true;
    } catch (error) {
      throw new Error(`Failed to clear cart: ${error.message}`);
    }
  }

  // Get cart total
  getTotal() {
    return this.items.reduce((total, item) => {
      return total + (item.product.price * item.quantity);
    }, 0);
  }

  // Get total item count
  getItemCount() {
    return this.items.reduce((count, item) => count + item.quantity, 0);
  }

  // Merge guest cart with user cart (for login)
  static async mergeGuestCart(guestSessionId, userId) {
    try {
      // Get guest cart
      const guestCart = await database.get('SELECT * FROM carts WHERE session_id = ?', [guestSessionId]);
      if (!guestCart) {
        return; // No guest cart to merge
      }

      // Get or create user cart
      const userCart = await Cart.getOrCreate(userId);

      // Get guest cart items
      const guestItems = await database.all(`
        SELECT * FROM cart_items WHERE cart_id = ?
      `, [guestCart.id]);

      // Merge items into user cart
      for (const item of guestItems) {
        await userCart.addItem(item.product_id, item.quantity);
      }

      // Delete guest cart
      await database.run('DELETE FROM cart_items WHERE cart_id = ?', [guestCart.id]);
      await database.run('DELETE FROM carts WHERE id = ?', [guestCart.id]);

      return userCart;
    } catch (error) {
      throw new Error(`Failed to merge guest cart: ${error.message}`);
    }
  }

  // Validate cart items (check inventory and active status)
  async validateItems() {
    try {
      const issues = [];
      
      for (const item of this.items) {
        const product = await Product.findById(item.productId);
        
        if (!product || !product.isActive) {
          issues.push({
            type: 'unavailable',
            productId: item.productId,
            productName: item.product.name,
            message: 'Product is no longer available'
          });
        } else if (item.quantity > product.inventory) {
          issues.push({
            type: 'insufficient_inventory',
            productId: item.productId,
            productName: item.product.name,
            requested: item.quantity,
            available: product.inventory,
            message: `Only ${product.inventory} items available`
          });
        }
      }
      
      return issues;
    } catch (error) {
      throw new Error(`Failed to validate cart items: ${error.message}`);
    }
  }

  // Convert to JSON (for API responses)
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      sessionId: this.sessionId,
      items: this.items,
      total: this.getTotal(),
      itemCount: this.getItemCount(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Cart;