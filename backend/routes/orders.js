const express = require('express');
const router = express.Router();
const { Order, Cart, User } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const EmailService = require('../utils/emailService');

// Create new order (checkout)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { shippingAddress, paymentMethod, items } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!shippingAddress || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ORDER_DATA',
          message: 'Missing required order information'
        }
      });
    }

    // Validate shipping address
    const requiredAddressFields = ['street', 'city', 'state', 'zipCode', 'country'];
    for (const field of requiredAddressFields) {
      if (!shippingAddress[field]) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SHIPPING_ADDRESS',
            message: `Missing required address field: ${field}`
          }
        });
      }
    }

    // Create order
    const orderData = {
      userId,
      items,
      shippingAddress,
      paymentMethod,
      status: 'pending',
      paymentStatus: 'pending'
    };

    const order = await Order.create(orderData);

    // Clear user's cart after successful order
    try {
      const cart = await Cart.findByUserId(userId);
      if (cart) {
        await cart.clear();
      }
    } catch (cartError) {
      console.warn('Failed to clear cart after order creation:', cartError.message);
    }

    // Send order confirmation email
    try {
      const user = await User.findById(userId);
      if (user) {
        const emailService = new EmailService();
        await emailService.sendOrderConfirmation(user, order);
      }
    } catch (emailError) {
      console.warn('Failed to send order confirmation email:', emailError.message);
    }

    res.status(201).json({
      success: true,
      data: {
        order: order.toJSON(),
        message: 'Order created successfully'
      }
    });

  } catch (error) {
    console.error('Order creation error:', error);
    
    if (error.message.includes('Insufficient inventory')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_INVENTORY',
          message: error.message
        }
      });
    }

    if (error.message.includes('not found')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: error.message
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'ORDER_CREATION_FAILED',
        message: 'Failed to create order'
      }
    });
  }
});

// Get user's order history
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, paymentStatus, limit } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (paymentStatus) filters.paymentStatus = paymentStatus;
    if (limit) filters.limit = parseInt(limit);

    const orders = await Order.findByUserId(userId, filters);

    res.json({
      success: true,
      data: {
        orders: orders.map(order => order.toJSON())
      }
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ORDERS_FAILED',
        message: 'Failed to fetch orders'
      }
    });
  }
});

// Get specific order details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ORDER_ID',
          message: 'Invalid order ID'
        }
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    // Check if user owns this order (or is admin)
    if (order.userId !== userId && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Access denied'
        }
      });
    }

    res.json({
      success: true,
      data: {
        order: order.toJSON()
      }
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ORDER_FAILED',
        message: 'Failed to fetch order'
      }
    });
  }
});

// Update order status (admin only)
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Admin access required'
        }
      });
    }

    const orderId = parseInt(req.params.id);
    const { status } = req.body;

    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ORDER_ID',
          message: 'Invalid order ID'
        }
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_STATUS',
          message: 'Status is required'
        }
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    const previousStatus = order.status;
    const updated = await order.updateStatus(status);
    if (!updated) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'STATUS_UPDATE_FAILED',
          message: 'Failed to update order status'
        }
      });
    }

    // Send status update email
    try {
      const user = await User.findById(order.userId);
      if (user) {
        const emailService = new EmailService();
        await emailService.sendOrderStatusUpdate(user, order, previousStatus);
        
        // Send shipping notification if status changed to shipped
        if (status === 'shipped') {
          await emailService.sendShippingNotification(user, order);
        }
      }
    } catch (emailError) {
      console.warn('Failed to send status update email:', emailError.message);
    }

    res.json({
      success: true,
      data: {
        order: order.toJSON(),
        message: 'Order status updated successfully'
      }
    });

  } catch (error) {
    console.error('Update order status error:', error);
    
    if (error.message.includes('Invalid order status')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: error.message
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_UPDATE_FAILED',
        message: 'Failed to update order status'
      }
    });
  }
});

// Update payment status
router.put('/:id/payment-status', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Admin access required'
        }
      });
    }

    const orderId = parseInt(req.params.id);
    const { paymentStatus } = req.body;

    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ORDER_ID',
          message: 'Invalid order ID'
        }
      });
    }

    if (!paymentStatus) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PAYMENT_STATUS',
          message: 'Payment status is required'
        }
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    const updated = await order.updatePaymentStatus(paymentStatus);
    if (!updated) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PAYMENT_STATUS_UPDATE_FAILED',
          message: 'Failed to update payment status'
        }
      });
    }

    res.json({
      success: true,
      data: {
        order: order.toJSON(),
        message: 'Payment status updated successfully'
      }
    });

  } catch (error) {
    console.error('Update payment status error:', error);
    
    if (error.message.includes('Invalid payment status')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PAYMENT_STATUS',
          message: error.message
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'PAYMENT_STATUS_UPDATE_FAILED',
        message: 'Failed to update payment status'
      }
    });
  }
});

// Add tracking number
router.put('/:id/tracking', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Admin access required'
        }
      });
    }

    const orderId = parseInt(req.params.id);
    const { trackingNumber } = req.body;

    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ORDER_ID',
          message: 'Invalid order ID'
        }
      });
    }

    if (!trackingNumber) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TRACKING_NUMBER',
          message: 'Tracking number is required'
        }
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    const updated = await order.addTrackingNumber(trackingNumber);
    if (!updated) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TRACKING_UPDATE_FAILED',
          message: 'Failed to add tracking number'
        }
      });
    }

    res.json({
      success: true,
      data: {
        order: order.toJSON(),
        message: 'Tracking number added successfully'
      }
    });

  } catch (error) {
    console.error('Add tracking number error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TRACKING_UPDATE_FAILED',
        message: 'Failed to add tracking number'
      }
    });
  }
});

// Cancel order
router.put('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ORDER_ID',
          message: 'Invalid order ID'
        }
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    // Check if user owns this order (or is admin)
    if (order.userId !== userId && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Access denied'
        }
      });
    }

    await order.cancel();

    res.json({
      success: true,
      data: {
        order: order.toJSON(),
        message: 'Order cancelled successfully'
      }
    });

  } catch (error) {
    console.error('Cancel order error:', error);
    
    if (error.message.includes('already cancelled') || error.message.includes('Cannot cancel')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANCELLATION_NOT_ALLOWED',
          message: error.message
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'ORDER_CANCELLATION_FAILED',
        message: 'Failed to cancel order'
      }
    });
  }
});

module.exports = router;