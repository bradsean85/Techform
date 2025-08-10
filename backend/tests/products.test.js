const request = require('supertest');
const path = require('path');
const fs = require('fs').promises;
const app = require('../server');
const database = require('../config/database');
const User = require('../models/User');
const Product = require('../models/Product');

describe('Product API Endpoints', () => {
  let adminToken;
  let userToken;
  let adminUser;
  let regularUser;
  let testProduct;

  beforeAll(async () => {
    // Connect to test database
    await database.connect();
    
    // Create test admin user
    adminUser = await User.create({
      email: 'admin@test.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      isAdmin: true
    });

    // Create test regular user
    regularUser = await User.create({
      email: 'user@test.com',
      password: 'user123',
      firstName: 'Regular',
      lastName: 'User',
      isAdmin: false
    });

    // Get admin token
    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'admin123'
      });
    adminToken = adminLoginResponse.body.data.token;

    // Get user token
    const userLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user@test.com',
        password: 'user123'
      });
    userToken = userLoginResponse.body.data.token;

    // Create test product
    testProduct = new Product({
      name: 'Test Gadget',
      description: 'A test cyberpunk gadget',
      price: 299.99,
      category: 'gadgets',
      icon: 'test-icon',
      images: JSON.stringify(['/uploads/test-image.jpg']),
      specifications: JSON.stringify({ color: 'neon', power: '100W' }),
      inventory: 10,
      isActive: true
    });
    await testProduct.save();
  });

  afterAll(async () => {
    // Clean up test data
    await database.run('DELETE FROM users WHERE email LIKE "%@test.com"');
    await database.run('DELETE FROM products WHERE name LIKE "Test%"');
    await database.close();
  });

  describe('GET /api/products', () => {
    test('should get all active products', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toBeInstanceOf(Array);
      expect(response.body.data.count).toBeGreaterThan(0);
      
      // Check that test product is included
      const testProductInResponse = response.body.data.products.find(
        p => p.name === 'Test Gadget'
      );
      expect(testProductInResponse).toBeDefined();
      expect(testProductInResponse.price).toBe(299.99);
    });

    test('should filter products by category', async () => {
      const response = await request(app)
        .get('/api/products?category=gadgets')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toBeInstanceOf(Array);
      
      // All products should be in gadgets category
      response.body.data.products.forEach(product => {
        expect(product.category).toBe('gadgets');
      });
    });

    test('should search products by name', async () => {
      const response = await request(app)
        .get('/api/products?search=Test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toBeInstanceOf(Array);
      
      // Should find our test product
      const testProductInResponse = response.body.data.products.find(
        p => p.name === 'Test Gadget'
      );
      expect(testProductInResponse).toBeDefined();
    });

    test('should filter products by price range', async () => {
      const response = await request(app)
        .get('/api/products?minPrice=200&maxPrice=400')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toBeInstanceOf(Array);
      
      // All products should be within price range
      response.body.data.products.forEach(product => {
        expect(product.price).toBeGreaterThanOrEqual(200);
        expect(product.price).toBeLessThanOrEqual(400);
      });
    });

    test('should limit number of products returned', async () => {
      const response = await request(app)
        .get('/api/products?limit=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toBeInstanceOf(Array);
      expect(response.body.data.products.length).toBeLessThanOrEqual(2);
    });

    test('should return empty array when no products match filters', async () => {
      const response = await request(app)
        .get('/api/products?category=nonexistent')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toEqual([]);
      expect(response.body.data.count).toBe(0);
    });
  });

  describe('GET /api/products/:id', () => {
    test('should get specific product by ID', async () => {
      const response = await request(app)
        .get(`/api/products/${testProduct.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.product).toBeDefined();
      expect(response.body.data.product.id).toBe(testProduct.id);
      expect(response.body.data.product.name).toBe('Test Gadget');
      expect(response.body.data.product.price).toBe(299.99);
    });

    test('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .get('/api/products/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    test('should return 400 for invalid product ID', async () => {
      const response = await request(app)
        .get('/api/products/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PRODUCT_ID');
    });
  });

  describe('POST /api/products', () => {
    test('should create new product with admin token', async () => {
      const productData = {
        name: 'Test New Product',
        description: 'A new test product',
        price: 199.99,
        category: 'accessories',
        icon: 'new-icon',
        specifications: JSON.stringify({ feature: 'advanced' }),
        inventory: 5
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.product).toBeDefined();
      expect(response.body.data.product.name).toBe('Test New Product');
      expect(response.body.data.product.price).toBe(199.99);
      expect(response.body.data.product.isActive).toBe(true);
    });

    test('should reject product creation without admin token', async () => {
      const productData = {
        name: 'Unauthorized Product',
        description: 'Should not be created',
        price: 99.99,
        category: 'test'
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${userToken}`)
        .send(productData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ADMIN_REQUIRED');
    });

    test('should reject product creation without authentication', async () => {
      const productData = {
        name: 'Unauthenticated Product',
        description: 'Should not be created',
        price: 99.99,
        category: 'test'
      };

      const response = await request(app)
        .post('/api/products')
        .send(productData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_TOKEN');
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Product'
          // Missing required fields
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should validate price format', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Product',
          description: 'Test description',
          price: 'invalid-price',
          category: 'test'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PRICE');
    });

    test('should validate inventory format', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Product',
          description: 'Test description',
          price: 99.99,
          category: 'test',
          inventory: 'invalid-inventory'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_INVENTORY');
    });
  });

  describe('PUT /api/products/:id', () => {
    test('should update existing product with admin token', async () => {
      const updateData = {
        name: 'Updated Test Gadget',
        price: 349.99,
        inventory: 15
      };

      const response = await request(app)
        .put(`/api/products/${testProduct.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.product.name).toBe('Updated Test Gadget');
      expect(response.body.data.product.price).toBe(349.99);
      expect(response.body.data.product.inventory).toBe(15);
    });

    test('should reject update without admin token', async () => {
      const response = await request(app)
        .put(`/api/products/${testProduct.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Should not update' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ADMIN_REQUIRED');
    });

    test('should return 404 for non-existent product update', async () => {
      const response = await request(app)
        .put('/api/products/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Non-existent' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    test('should validate updated fields', async () => {
      const response = await request(app)
        .put(`/api/products/${testProduct.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price: 'invalid-price' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PRICE');
    });
  });

  describe('DELETE /api/products/:id', () => {
    let productToDelete;

    beforeEach(async () => {
      // Create a product specifically for deletion tests
      productToDelete = new Product({
        name: 'Test Delete Product',
        description: 'Product to be deleted',
        price: 99.99,
        category: 'test',
        inventory: 1,
        isActive: true
      });
      await productToDelete.save();
    });

    test('should delete product with admin token', async () => {
      const response = await request(app)
        .delete(`/api/products/${productToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Product deleted successfully');

      // Verify product is deleted
      const deletedProduct = await Product.findById(productToDelete.id);
      expect(deletedProduct).toBeNull();
    });

    test('should reject deletion without admin token', async () => {
      const response = await request(app)
        .delete(`/api/products/${productToDelete.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ADMIN_REQUIRED');
    });

    test('should return 404 for non-existent product deletion', async () => {
      const response = await request(app)
        .delete('/api/products/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });
  });

  describe('POST /api/products/:id/images', () => {
    test('should add images to existing product', async () => {
      // Create a test image file
      const testImagePath = path.join(__dirname, 'test-image.jpg');
      await fs.writeFile(testImagePath, 'fake-image-data');

      const response = await request(app)
        .post(`/api/products/${testProduct.id}/images`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('images', testImagePath)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.newImages).toBeInstanceOf(Array);
      expect(response.body.data.newImages.length).toBeGreaterThan(0);

      // Clean up test file
      await fs.unlink(testImagePath).catch(() => {});
    });

    test('should reject image upload without admin token', async () => {
      const response = await request(app)
        .post(`/api/products/${testProduct.id}/images`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ADMIN_REQUIRED');
    });

    test('should return 400 when no images provided', async () => {
      const response = await request(app)
        .post(`/api/products/${testProduct.id}/images`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_IMAGES');
    });
  });

  describe('DELETE /api/products/:id/images/:imageIndex', () => {
    test('should remove specific image from product', async () => {
      // First, ensure the test product has images
      const productWithImages = await Product.findById(testProduct.id);
      expect(productWithImages.images).toBeTruthy();

      const response = await request(app)
        .delete(`/api/products/${testProduct.id}/images/0`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.product).toBeDefined();
    });

    test('should reject image deletion without admin token', async () => {
      const response = await request(app)
        .delete(`/api/products/${testProduct.id}/images/0`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ADMIN_REQUIRED');
    });

    test('should return 404 for invalid image index', async () => {
      const response = await request(app)
        .delete(`/api/products/${testProduct.id}/images/999`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('IMAGE_NOT_FOUND');
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Close database connection to simulate error
      await database.close();

      const response = await request(app)
        .get('/api/products')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PRODUCTS_FETCH_FAILED');

      // Reconnect for other tests
      await database.connect();
    });

    test('should handle malformed JSON in specifications', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Product',
          description: 'Test description',
          price: 99.99,
          category: 'test',
          specifications: 'invalid-json'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_SPECIFICATIONS');
    });
  });
});