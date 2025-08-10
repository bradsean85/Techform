const express = require('express');
const router = express.Router();
const { Cart } = require('../models');
const { authenticateToken } = require('../middleware/auth');

// Optional authentication middleware - doesn't fail if no token
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    const jwt = require('jsonwebtoken');
    jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err, user) => {
      if (!err) {
        req.user = user;
      }
    });
  }
  next();
};

// Get cart contents
router.get('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'] || (req.session && req.session.id);
    
    if (!userId && !sessionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_IDENTIFIER',
          message: 'User ID or session ID required'
        }
      });
    }

    const cart = await Cart.getOrCreate(userId, sessionId);
    
    res.json({
      success: true,
      data: cart.toJSON()
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CART_FETCH_ERROR',
        message: 'Failed to retrieve cart'
      }
    });
  }
});

// Add item to cart
router.post('/items', optionalAuth, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    
    if (!productId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PRODUCT_ID',
          message: 'Product ID is required'
        }
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUANTITY',
          message: 'Quantity must be greater than 0'
        }
      });
    }

    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'] || (req.session && req.session.id);
    
    if (!userId && !sessionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_IDENTIFIER',
          message: 'User ID or session ID required'
        }
      });
    }

    const cart = await Cart.getOrCreate(userId, sessionId);
    await cart.addItem(productId, quantity);
    
    res.json({
      success: true,
      data: cart.toJSON(),
      message: 'Item added to cart successfully'
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found'
        }
      });
    }
    
    if (error.message.includes('inactive')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PRODUCT_INACTIVE',
          message: 'Product is not available'
        }
      });
    }
    
    if (error.message.includes('inventory')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_INVENTORY',
          message: 'Not enough items in stock'
        }
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'ADD_TO_CART_ERROR',
        message: 'Failed to add item to cart'
      }
    });
  }
});

// Update item quantity
router.put('/items/:productId', optionalAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    
    if (quantity === undefined || quantity < 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUANTITY',
          message: 'Valid quantity is required'
        }
      });
    }

    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'] || (req.session && req.session.id);
    
    if (!userId && !sessionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_IDENTIFIER',
          message: 'User ID or session ID required'
        }
      });
    }

    const cart = await Cart.getOrCreate(userId, sessionId);
    await cart.updateItemQuantity(parseInt(productId), quantity);
    
    res.json({
      success: true,
      data: cart.toJSON(),
      message: 'Cart updated successfully'
    });
  } catch (error) {
    console.error('Update cart error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ITEM_NOT_FOUND',
          message: 'Item not found in cart'
        }
      });
    }
    
    if (error.message.includes('inventory')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_INVENTORY',
          message: 'Not enough items in stock'
        }
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_CART_ERROR',
        message: 'Failed to update cart'
      }
    });
  }
});

// Remove item from cart
router.delete('/items/:productId', optionalAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'] || (req.session && req.session.id);
    
    if (!userId && !sessionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_IDENTIFIER',
          message: 'User ID or session ID required'
        }
      });
    }

    const cart = await Cart.getOrCreate(userId, sessionId);
    await cart.removeItem(parseInt(productId));
    
    res.json({
      success: true,
      data: cart.toJSON(),
      message: 'Item removed from cart successfully'
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ITEM_NOT_FOUND',
          message: 'Item not found in cart'
        }
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'REMOVE_FROM_CART_ERROR',
        message: 'Failed to remove item from cart'
      }
    });
  }
});

// Clear cart
router.delete('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'] || (req.session && req.session.id);
    
    if (!userId && !sessionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_IDENTIFIER',
          message: 'User ID or session ID required'
        }
      });
    }

    const cart = await Cart.getOrCreate(userId, sessionId);
    await cart.clear();
    
    res.json({
      success: true,
      data: cart.toJSON(),
      message: 'Cart cleared successfully'
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CLEAR_CART_ERROR',
        message: 'Failed to clear cart'
      }
    });
  }
});

// Validate cart items (check inventory and availability)
router.get('/validate', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'] || (req.session && req.session.id);
    
    if (!userId && !sessionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_IDENTIFIER',
          message: 'User ID or session ID required'
        }
      });
    }

    const cart = await Cart.getOrCreate(userId, sessionId);
    const issues = await cart.validateItems();
    
    res.json({
      success: true,
      data: {
        cart: cart.toJSON(),
        issues: issues,
        isValid: issues.length === 0
      }
    });
  } catch (error) {
    console.error('Validate cart error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'VALIDATE_CART_ERROR',
        message: 'Failed to validate cart'
      }
    });
  }
});

// Merge guest cart with user cart (called during login)
router.post('/merge', authenticateToken, async (req, res) => {
  try {
    const { guestSessionId } = req.body;
    const userId = req.user.id;
    
    if (!guestSessionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_SESSION_ID',
          message: 'Guest session ID is required'
        }
      });
    }

    const userCart = await Cart.mergeGuestCart(guestSessionId, userId);
    
    res.json({
      success: true,
      data: userCart ? userCart.toJSON() : null,
      message: 'Cart merged successfully'
    });
  } catch (error) {
    console.error('Merge cart error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'MERGE_CART_ERROR',
        message: 'Failed to merge cart'
      }
    });
  }
});

module.exports = router;