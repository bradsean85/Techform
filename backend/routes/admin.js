const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateQuantity, validateRequired } = require('../utils/validation');

// Get inventory dashboard data
router.get('/inventory/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { lowStockThreshold = 5 } = req.query;
    const threshold = parseInt(lowStockThreshold);

    // Get inventory summary
    const summary = await Product.getInventorySummary();
    
    // Get low stock products
    const lowStockProducts = await Product.getLowStock(threshold);
    
    // Get out of stock products
    const outOfStockProducts = await Product.getOutOfStock();

    res.json({
      success: true,
      data: {
        summary,
        lowStockProducts: lowStockProducts.map(product => product.toJSON()),
        outOfStockProducts: outOfStockProducts.map(product => product.toJSON()),
        lowStockThreshold: threshold
      }
    });

  } catch (error) {
    console.error('Inventory dashboard error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INVENTORY_DASHBOARD_FAILED',
        message: 'Failed to fetch inventory dashboard data'
      }
    });
  }
});

// Get low stock alerts
router.get('/inventory/alerts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { threshold = 5 } = req.query;
    const lowStockThreshold = parseInt(threshold);

    const lowStockProducts = await Product.getLowStock(lowStockThreshold);
    const outOfStockProducts = await Product.getOutOfStock();

    const alerts = [
      ...outOfStockProducts.map(product => ({
        id: product.id,
        type: 'out_of_stock',
        severity: 'critical',
        product: product.toJSON(),
        message: `${product.name} is out of stock`,
        actionRequired: 'Restock immediately'
      })),
      ...lowStockProducts.filter(p => p.inventory > 0).map(product => ({
        id: product.id,
        type: 'low_stock',
        severity: 'warning',
        product: product.toJSON(),
        message: `${product.name} is running low (${product.inventory} remaining)`,
        actionRequired: 'Consider restocking soon'
      }))
    ];

    res.json({
      success: true,
      data: {
        alerts,
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
        warningAlerts: alerts.filter(a => a.severity === 'warning').length
      }
    });

  } catch (error) {
    console.error('Inventory alerts error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INVENTORY_ALERTS_FAILED',
        message: 'Failed to fetch inventory alerts'
      }
    });
  }
});

// Get all products with inventory details
router.get('/inventory/products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { 
      category, 
      status, 
      lowStockThreshold = 5,
      sortBy = 'inventory',
      sortOrder = 'asc',
      limit 
    } = req.query;

    const filters = { isActive: status !== 'inactive' };
    
    if (category) filters.category = category;
    if (limit) filters.limit = parseInt(limit);

    let products = await Product.findAll(filters);

    // Filter by inventory status if specified
    if (status === 'low_stock') {
      products = products.filter(p => p.isLowStock(parseInt(lowStockThreshold)));
    } else if (status === 'out_of_stock') {
      products = products.filter(p => p.isOutOfStock());
    } else if (status === 'in_stock') {
      products = products.filter(p => p.inventory > parseInt(lowStockThreshold));
    }

    // Sort products
    products.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'inventory') {
        aValue = parseInt(aValue) || 0;
        bValue = parseInt(bValue) || 0;
      }
      
      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    // Add inventory status to each product
    const productsWithStatus = products.map(product => ({
      ...product.toJSON(),
      inventoryStatus: product.getInventoryStatus(parseInt(lowStockThreshold)),
      isLowStock: product.isLowStock(parseInt(lowStockThreshold)),
      isOutOfStock: product.isOutOfStock()
    }));

    res.json({
      success: true,
      data: {
        products: productsWithStatus,
        count: productsWithStatus.length,
        filters: { category, status, lowStockThreshold, sortBy, sortOrder }
      }
    });

  } catch (error) {
    console.error('Admin products fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ADMIN_PRODUCTS_FETCH_FAILED',
        message: 'Failed to fetch products for admin'
      }
    });
  }
});

// Update product inventory
router.put('/inventory/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { inventory } = req.body;

    if (!validateQuantity(id)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PRODUCT_ID',
          message: 'Invalid product ID'
        }
      });
    }

    if (!validateQuantity(inventory)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INVENTORY',
          message: 'Inventory must be a valid non-negative number'
        }
      });
    }

    const product = await Product.findById(parseInt(id));
    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found'
        }
      });
    }

    const oldInventory = product.inventory;
    const newInventory = parseInt(inventory);
    
    await product.updateInventory(newInventory);

    res.json({
      success: true,
      data: {
        product: product.toJSON(),
        inventoryChange: newInventory - oldInventory,
        message: `Inventory updated from ${oldInventory} to ${newInventory}`
      }
    });

  } catch (error) {
    console.error('Inventory update error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INVENTORY_UPDATE_FAILED',
        message: 'Failed to update inventory'
      }
    });
  }
});

// Bulk update inventory
router.put('/inventory/bulk-update', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_UPDATES',
          message: 'Updates must be a non-empty array'
        }
      });
    }

    // Validate all updates
    for (const update of updates) {
      if (!validateQuantity(update.productId) || !validateQuantity(update.quantity)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_UPDATE_DATA',
            message: 'Each update must have valid productId and quantity'
          }
        });
      }
    }

    const results = await Product.bulkUpdateInventory(updates);

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      data: {
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: failureCount
        }
      }
    });

  } catch (error) {
    console.error('Bulk inventory update error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'BULK_INVENTORY_UPDATE_FAILED',
        message: 'Failed to bulk update inventory'
      }
    });
  }
});

// Get sales analytics
router.get('/analytics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const filters = {};
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const analytics = await Order.getAnalytics(filters);

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYTICS_FETCH_FAILED',
        message: 'Failed to fetch analytics data'
      }
    });
  }
});

// Get all orders (admin view)
router.get('/orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, paymentStatus, dateFrom, dateTo, limit } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (paymentStatus) filters.paymentStatus = paymentStatus;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    if (limit) filters.limit = parseInt(limit);

    const orders = await Order.findAll(filters);

    res.json({
      success: true,
      data: {
        orders: orders.map(order => order.toJSON()),
        count: orders.length
      }
    });

  } catch (error) {
    console.error('Admin orders fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ADMIN_ORDERS_FETCH_FAILED',
        message: 'Failed to fetch orders for admin'
      }
    });
  }
});

module.exports = router;