const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const Product = require('../models/Product');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateRequired, validatePrice, validateQuantity, sanitizeString } = require('../utils/validation');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/products');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// GET /api/products - Get all products with filtering and search
router.get('/', async (req, res) => {
  try {
    const {
      category,
      search,
      minPrice,
      maxPrice,
      limit,
      isActive = true
    } = req.query;

    // Build filters object
    const filters = {};
    
    if (category) {
      filters.category = sanitizeString(category);
    }
    
    if (search) {
      filters.search = sanitizeString(search);
    }
    
    if (minPrice && validatePrice(minPrice)) {
      filters.minPrice = parseFloat(minPrice);
    }
    
    if (maxPrice && validatePrice(maxPrice)) {
      filters.maxPrice = parseFloat(maxPrice);
    }
    
    if (limit && validateQuantity(limit)) {
      filters.limit = parseInt(limit);
    }
    
    // Only show active products by default for public API
    filters.isActive = isActive === 'false' ? false : true;

    const products = await Product.findAll(filters);

    res.json({
      success: true,
      data: {
        products: products.map(product => product.toJSON()),
        count: products.length,
        filters: filters
      }
    });

  } catch (error) {
    console.error('Products fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PRODUCTS_FETCH_FAILED',
        message: 'Failed to fetch products'
      }
    });
  }
});

// GET /api/products/:id - Get specific product details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateQuantity(id)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PRODUCT_ID',
          message: 'Invalid product ID'
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

    res.json({
      success: true,
      data: {
        product: product.toJSON()
      }
    });

  } catch (error) {
    console.error('Product fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PRODUCT_FETCH_FAILED',
        message: 'Failed to fetch product'
      }
    });
  }
});

// POST /api/products - Create new product (admin only)
router.post('/', authenticateToken, requireAdmin, upload.array('images', 5), async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      icon,
      specifications,
      inventory = 0
    } = req.body;

    // Validate required fields
    if (!validateRequired(name) || !validateRequired(description) || 
        !validateRequired(price) || !validateRequired(category)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name, description, price, and category are required'
        }
      });
    }

    // Validate price
    if (!validatePrice(price)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PRICE',
          message: 'Price must be a valid positive number'
        }
      });
    }

    // Validate inventory
    if (!validateQuantity(inventory)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INVENTORY',
          message: 'Inventory must be a valid non-negative number'
        }
      });
    }

    // Process uploaded images
    const imageUrls = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        imageUrls.push(`/uploads/products/${file.filename}`);
      });
    }

    // Parse specifications if provided
    let parsedSpecs = {};
    if (specifications) {
      try {
        parsedSpecs = typeof specifications === 'string' 
          ? JSON.parse(specifications) 
          : specifications;
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SPECIFICATIONS',
            message: 'Specifications must be valid JSON'
          }
        });
      }
    }

    // Create product
    const productData = {
      name: sanitizeString(name),
      description: sanitizeString(description),
      price: parseFloat(price),
      category: sanitizeString(category),
      icon: icon ? sanitizeString(icon) : null,
      images: JSON.stringify(imageUrls),
      specifications: JSON.stringify(parsedSpecs),
      inventory: parseInt(inventory),
      isActive: true
    };

    const product = new Product(productData);
    await product.save();

    res.status(201).json({
      success: true,
      data: {
        product: product.toJSON()
      }
    });

  } catch (error) {
    console.error('Product creation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PRODUCT_CREATION_FAILED',
        message: 'Failed to create product'
      }
    });
  }
});

// PUT /api/products/:id - Update product (admin only)
router.put('/:id', authenticateToken, requireAdmin, upload.array('images', 5), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
      category,
      icon,
      specifications,
      inventory,
      isActive
    } = req.body;

    if (!validateQuantity(id)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PRODUCT_ID',
          message: 'Invalid product ID'
        }
      });
    }

    // Find existing product
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

    // Validate fields if provided
    if (name !== undefined) {
      if (!validateRequired(name)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_NAME',
            message: 'Name cannot be empty'
          }
        });
      }
      product.name = sanitizeString(name);
    }

    if (description !== undefined) {
      if (!validateRequired(description)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DESCRIPTION',
            message: 'Description cannot be empty'
          }
        });
      }
      product.description = sanitizeString(description);
    }

    if (price !== undefined) {
      if (!validatePrice(price)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PRICE',
            message: 'Price must be a valid positive number'
          }
        });
      }
      product.price = parseFloat(price);
    }

    if (category !== undefined) {
      if (!validateRequired(category)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CATEGORY',
            message: 'Category cannot be empty'
          }
        });
      }
      product.category = sanitizeString(category);
    }

    if (icon !== undefined) {
      product.icon = icon ? sanitizeString(icon) : null;
    }

    if (inventory !== undefined) {
      if (!validateQuantity(inventory)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INVENTORY',
            message: 'Inventory must be a valid non-negative number'
          }
        });
      }
      product.inventory = parseInt(inventory);
    }

    if (isActive !== undefined) {
      product.isActive = Boolean(isActive);
    }

    // Handle specifications update
    if (specifications !== undefined) {
      try {
        const parsedSpecs = typeof specifications === 'string' 
          ? JSON.parse(specifications) 
          : specifications;
        product.specifications = JSON.stringify(parsedSpecs);
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SPECIFICATIONS',
            message: 'Specifications must be valid JSON'
          }
        });
      }
    }

    // Handle image updates
    if (req.files && req.files.length > 0) {
      const imageUrls = [];
      req.files.forEach(file => {
        imageUrls.push(`/uploads/products/${file.filename}`);
      });
      
      // Get existing images
      const existingImages = product.images ? JSON.parse(product.images) : [];
      
      // Combine existing and new images
      const allImages = [...existingImages, ...imageUrls];
      product.images = JSON.stringify(allImages);
    }

    // Save updated product
    await product.save();

    res.json({
      success: true,
      data: {
        product: product.toJSON()
      }
    });

  } catch (error) {
    console.error('Product update error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PRODUCT_UPDATE_FAILED',
        message: 'Failed to update product'
      }
    });
  }
});

// DELETE /api/products/:id - Delete product (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateQuantity(id)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PRODUCT_ID',
          message: 'Invalid product ID'
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

    // Delete associated image files
    if (product.images) {
      try {
        const images = JSON.parse(product.images);
        for (const imagePath of images) {
          const fullPath = path.join(__dirname, '../../', imagePath);
          try {
            await fs.unlink(fullPath);
          } catch (fileError) {
            console.warn(`Failed to delete image file: ${fullPath}`, fileError);
          }
        }
      } catch (parseError) {
        console.warn('Failed to parse product images for deletion', parseError);
      }
    }

    // Delete product from database
    const success = await product.delete();
    if (!success) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'PRODUCT_DELETE_FAILED',
          message: 'Failed to delete product'
        }
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('Product deletion error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PRODUCT_DELETE_FAILED',
        message: 'Failed to delete product'
      }
    });
  }
});

// POST /api/products/:id/images - Add images to existing product (admin only)
router.post('/:id/images', authenticateToken, requireAdmin, upload.array('images', 5), async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateQuantity(id)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PRODUCT_ID',
          message: 'Invalid product ID'
        }
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_IMAGES',
          message: 'No images provided'
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

    // Process uploaded images
    const newImageUrls = [];
    req.files.forEach(file => {
      newImageUrls.push(`/uploads/products/${file.filename}`);
    });

    // Get existing images and add new ones
    const existingImages = product.images ? JSON.parse(product.images) : [];
    const allImages = [...existingImages, ...newImageUrls];
    
    product.images = JSON.stringify(allImages);
    await product.save();

    res.json({
      success: true,
      data: {
        product: product.toJSON(),
        newImages: newImageUrls
      }
    });

  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'IMAGE_UPLOAD_FAILED',
        message: 'Failed to upload images'
      }
    });
  }
});

// DELETE /api/products/:id/images/:imageIndex - Remove specific image (admin only)
router.delete('/:id/images/:imageIndex', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id, imageIndex } = req.params;

    if (!validateQuantity(id) || !validateQuantity(imageIndex)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PARAMETERS',
          message: 'Invalid product ID or image index'
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

    if (!product.images) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NO_IMAGES',
          message: 'Product has no images'
        }
      });
    }

    const images = JSON.parse(product.images);
    const index = parseInt(imageIndex);

    if (index < 0 || index >= images.length) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'IMAGE_NOT_FOUND',
          message: 'Image not found'
        }
      });
    }

    // Delete the image file
    const imagePath = images[index];
    const fullPath = path.join(__dirname, '../../', imagePath);
    try {
      await fs.unlink(fullPath);
    } catch (fileError) {
      console.warn(`Failed to delete image file: ${fullPath}`, fileError);
    }

    // Remove image from array
    images.splice(index, 1);
    product.images = JSON.stringify(images);
    await product.save();

    res.json({
      success: true,
      data: {
        product: product.toJSON()
      }
    });

  } catch (error) {
    console.error('Image deletion error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'IMAGE_DELETE_FAILED',
        message: 'Failed to delete image'
      }
    });
  }
});

module.exports = router;