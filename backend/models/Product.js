const database = require('../config/database');

class Product {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.price = data.price;
    this.category = data.category;
    this.icon = data.icon;
    this.images = data.images;
    this.specifications = data.specifications;
    this.inventory = data.inventory;
    this.isActive = data.is_active !== undefined ? Boolean(data.is_active) : true;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // Create a new product
  async save() {
    try {
      if (this.id) {
        // Update existing product
        const result = await database.run(`
          UPDATE products 
          SET name = ?, description = ?, price = ?, category = ?, icon = ?, 
              images = ?, specifications = ?, inventory = ?, is_active = ?, 
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
          this.name, this.description, this.price, this.category, this.icon,
          this.images, this.specifications, this.inventory, this.isActive, this.id
        ]);
        return result.changes > 0;
      } else {
        // Create new product
        const result = await database.run(`
          INSERT INTO products (name, description, price, category, icon, images, specifications, inventory, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          this.name, this.description, this.price, this.category, this.icon,
          this.images, this.specifications, this.inventory, this.isActive
        ]);
        this.id = result.id;
        return true;
      }
    } catch (error) {
      throw new Error(`Failed to save product: ${error.message}`);
    }
  }

  // Find product by ID
  static async findById(id) {
    try {
      const row = await database.get('SELECT * FROM products WHERE id = ?', [id]);
      return row ? new Product(row) : null;
    } catch (error) {
      throw new Error(`Failed to find product: ${error.message}`);
    }
  }

  // Find all products with optional filters
  static async findAll(filters = {}) {
    try {
      let sql = 'SELECT * FROM products WHERE 1=1';
      const params = [];

      if (filters.category) {
        sql += ' AND category = ?';
        params.push(filters.category);
      }

      if (filters.isActive !== undefined) {
        sql += ' AND is_active = ?';
        params.push(filters.isActive);
      }

      if (filters.search) {
        sql += ' AND (name LIKE ? OR description LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      if (filters.minPrice) {
        sql += ' AND price >= ?';
        params.push(filters.minPrice);
      }

      if (filters.maxPrice) {
        sql += ' AND price <= ?';
        params.push(filters.maxPrice);
      }

      sql += ' ORDER BY created_at DESC';

      if (filters.limit) {
        sql += ' LIMIT ?';
        params.push(filters.limit);
      }

      const rows = await database.all(sql, params);
      return rows.map(row => new Product(row));
    } catch (error) {
      throw new Error(`Failed to fetch products: ${error.message}`);
    }
  }

  // Delete product
  async delete() {
    try {
      if (!this.id) {
        throw new Error('Cannot delete product without ID');
      }
      const result = await database.run('DELETE FROM products WHERE id = ?', [this.id]);
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Failed to delete product: ${error.message}`);
    }
  }

  // Update inventory
  async updateInventory(quantity) {
    try {
      if (!this.id) {
        throw new Error('Cannot update inventory without product ID');
      }
      const result = await database.run(`
        UPDATE products 
        SET inventory = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [quantity, this.id]);
      
      if (result.changes > 0) {
        this.inventory = quantity;
        return true;
      }
      return false;
    } catch (error) {
      throw new Error(`Failed to update inventory: ${error.message}`);
    }
  }

  // Reduce inventory (for orders)
  async reduceInventory(quantity) {
    try {
      if (!this.id) {
        throw new Error('Cannot reduce inventory without product ID');
      }
      
      const result = await database.run(`
        UPDATE products 
        SET inventory = inventory - ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND inventory >= ?
      `, [quantity, this.id, quantity]);
      
      if (result.changes > 0) {
        this.inventory -= quantity;
        return true;
      }
      return false; // Insufficient inventory
    } catch (error) {
      throw new Error(`Failed to reduce inventory: ${error.message}`);
    }
  }

  // Get low stock products
  static async getLowStock(threshold = 5) {
    try {
      const rows = await database.all(`
        SELECT * FROM products 
        WHERE inventory <= ? AND is_active = 1 
        ORDER BY inventory ASC
      `, [threshold]);
      return rows.map(row => new Product(row));
    } catch (error) {
      throw new Error(`Failed to get low stock products: ${error.message}`);
    }
  }

  // Get out of stock products
  static async getOutOfStock() {
    try {
      const rows = await database.all(`
        SELECT * FROM products 
        WHERE inventory = 0 AND is_active = 1 
        ORDER BY name ASC
      `);
      return rows.map(row => new Product(row));
    } catch (error) {
      throw new Error(`Failed to get out of stock products: ${error.message}`);
    }
  }

  // Check if product is in stock
  isInStock(quantity = 1) {
    return this.inventory >= quantity;
  }

  // Check if product is low stock
  isLowStock(threshold = 5) {
    return this.inventory <= threshold && this.inventory > 0;
  }

  // Check if product is out of stock
  isOutOfStock() {
    return this.inventory === 0;
  }

  // Get inventory status
  getInventoryStatus(lowStockThreshold = 5) {
    if (this.inventory === 0) {
      return 'out_of_stock';
    } else if (this.inventory <= lowStockThreshold) {
      return 'low_stock';
    } else {
      return 'in_stock';
    }
  }

  // Bulk update inventory for multiple products
  static async bulkUpdateInventory(updates) {
    try {
      const results = [];
      for (const update of updates) {
        const { productId, quantity } = update;
        const product = await Product.findById(productId);
        if (product) {
          await product.updateInventory(quantity);
          results.push({ productId, success: true, newQuantity: quantity });
        } else {
          results.push({ productId, success: false, error: 'Product not found' });
        }
      }
      return results;
    } catch (error) {
      throw new Error(`Failed to bulk update inventory: ${error.message}`);
    }
  }

  // Get inventory summary
  static async getInventorySummary() {
    try {
      const summary = await database.get(`
        SELECT 
          COUNT(*) as total_products,
          SUM(CASE WHEN inventory = 0 THEN 1 ELSE 0 END) as out_of_stock_count,
          SUM(CASE WHEN inventory <= 5 AND inventory > 0 THEN 1 ELSE 0 END) as low_stock_count,
          SUM(CASE WHEN inventory > 5 THEN 1 ELSE 0 END) as in_stock_count,
          SUM(inventory) as total_inventory_value,
          AVG(inventory) as average_inventory
        FROM products 
        WHERE is_active = 1
      `);
      
      return {
        totalProducts: summary.total_products || 0,
        outOfStockCount: summary.out_of_stock_count || 0,
        lowStockCount: summary.low_stock_count || 0,
        inStockCount: summary.in_stock_count || 0,
        totalInventoryValue: summary.total_inventory_value || 0,
        averageInventory: Math.round((summary.average_inventory || 0) * 100) / 100
      };
    } catch (error) {
      throw new Error(`Failed to get inventory summary: ${error.message}`);
    }
  }

  // Get products by category
  static async findByCategory(category) {
    try {
      const rows = await database.all(`
        SELECT * FROM products 
        WHERE category = ? AND is_active = 1 
        ORDER BY name ASC
      `, [category]);
      return rows.map(row => new Product(row));
    } catch (error) {
      throw new Error(`Failed to find products by category: ${error.message}`);
    }
  }

  // Convert to JSON (for API responses)
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      price: this.price,
      category: this.category,
      icon: this.icon,
      images: this.images ? JSON.parse(this.images) : [],
      specifications: this.specifications ? JSON.parse(this.specifications) : {},
      inventory: this.inventory,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Product;