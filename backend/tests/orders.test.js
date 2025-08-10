const request = require('supertest');
const app = require('../server');
const database = require('../config/database');
const { User, Product, Order } = require('../models');

describe('Orders API', () => {
  let authToken;
  let testUser;
  let testProduct;

  beforeAll(async () => {
    // Connect to test database
    await database.connect();
    
    // Clean up any existing test data
    await database.run('DELETE FROM order_items');
    await database.run('DELETE FROM orders');
    await database.run('DELETE FROM products WHERE name LIKE "Test%"');
    await database.run('DELETE FROM users WHERE email LIKE "%test%"');
    
    // Create test user with unique email
    const uniqueEmail = `test-${Date.now()}@example.com`;
    testUser = await User.create({
      email: uniqueEmail,
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    });

    // Create test product
    testProduct = await Product.create({
      name: 'Test Product',
      description: 'A test product',
      price: 99.99,
      category: 'test',
      inventory: 10
    });

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: uniqueEmail,
        password: 'password123'
      });

    authToken = loginResponse.body.data.token;
  });

  afterAll(async () => {
    // Clean up test data
    await database.run('DELETE FROM order_items');
    await database.run('DELETE FROM orders');
    await database.run('DELETE FROM products WHERE name LIKE "Test%"');
    await database.run('DELETE FROM users WHERE email LIKE "%test%"');
    await database.close();
  });

  describe('POST /api/orders', () => {
    it('should create a new order with valid data', async () => {
      const orderData = {
        shippingAddress: {
          firstName: 'Test',
          lastName: 'User',
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'US',
          phone: '555-0123'
        },
        paymentMethod: 'credit_card',
        items: [
          {
            productId: testProduct.id,
            quantity: 2
          }
        ]
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.order).toBeDefined();
      expect(response.body.data.order.totalAmount).toBe(199.98); // 99.99 * 2
      expect(response.body.data.order.status).toBe('pending');
      expect(response.body.data.order.items).toHaveLength(1);
      expect(response.body.data.order.items[0].quantity).toBe(2);
    });

    it('should fail without authentication', async () => {
      const orderData = {
        shippingAddress: {
          firstName: 'Test',
          lastName: 'User',
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'US'
        },
        paymentMethod: 'credit_card',
        items: [
          {
            productId: testProduct.id,
            quantity: 1
          }
        ]
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail with missing shipping address', async () => {
      const orderData = {
        paymentMethod: 'credit_card',
        items: [
          {
            productId: testProduct.id,
            quantity: 1
          }
        ]
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_ORDER_DATA');
    });

    it('should fail with insufficient inventory', async () => {
      const orderData = {
        shippingAddress: {
          firstName: 'Test',
          lastName: 'User',
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'US'
        },
        paymentMethod: 'credit_card',
        items: [
          {
            productId: testProduct.id,
            quantity: 20 // More than available inventory
          }
        ]
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_INVENTORY');
    });

    it('should fail with non-existent product', async () => {
      const orderData = {
        shippingAddress: {
          firstName: 'Test',
          lastName: 'User',
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'US'
        },
        paymentMethod: 'credit_card',
        items: [
          {
            productId: 99999, // Non-existent product
            quantity: 1
          }
        ]
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });
  });

  describe('GET /api/orders', () => {
    let testOrder;

    beforeAll(async () => {
      // Create a test order
      testOrder = await Order.create({
        userId: testUser.id,
        items: [
          {
            productId: testProduct.id,
            quantity: 1
          }
        ],
        shippingAddress: {
          firstName: 'Test',
          lastName: 'User',
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'US'
        },
        paymentMethod: 'credit_card'
      });
    });

    it('should get user order history', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.orders).toBeDefined();
      expect(Array.isArray(response.body.data.orders)).toBe(true);
      expect(response.body.data.orders.length).toBeGreaterThan(0);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/orders');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should filter orders by status', async () => {
      const response = await request(app)
        .get('/api/orders?status=pending')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.orders).toBeDefined();
      
      // All returned orders should have pending status
      response.body.data.orders.forEach(order => {
        expect(order.status).toBe('pending');
      });
    });
  });

  describe('GET /api/orders/:id', () => {
    let testOrder;

    beforeAll(async () => {
      // Create a test order
      testOrder = await Order.create({
        userId: testUser.id,
        items: [
          {
            productId: testProduct.id,
            quantity: 1
          }
        ],
        shippingAddress: {
          firstName: 'Test',
          lastName: 'User',
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'US'
        },
        paymentMethod: 'credit_card'
      });
    });

    it('should get specific order details', async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.order).toBeDefined();
      expect(response.body.data.order.id).toBe(testOrder.id);
      expect(response.body.data.order.items).toBeDefined();
      expect(response.body.data.order.shippingAddress).toBeDefined();
    });

    it('should fail for non-existent order', async () => {
      const response = await request(app)
        .get('/api/orders/99999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ORDER_NOT_FOUND');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrder.id}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/orders/:id/cancel', () => {
    let testOrder;

    beforeEach(async () => {
      // Create a fresh test order for each test
      testOrder = await Order.create({
        userId: testUser.id,
        items: [
          {
            productId: testProduct.id,
            quantity: 1
          }
        ],
        shippingAddress: {
          firstName: 'Test',
          lastName: 'User',
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'US'
        },
        paymentMethod: 'credit_card'
      });
    });

    it('should cancel pending order', async () => {
      const response = await request(app)
        .put(`/api/orders/${testOrder.id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.order.status).toBe('cancelled');
    });

    it('should fail for non-existent order', async () => {
      const response = await request(app)
        .put('/api/orders/99999/cancel')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ORDER_NOT_FOUND');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .put(`/api/orders/${testOrder.id}/cancel`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Admin endpoints', () => {
    let adminToken;
    let adminUser;
    let testOrder;

    beforeAll(async () => {
      // Create admin user with unique email
      const uniqueAdminEmail = `admin-${Date.now()}@example.com`;
      adminUser = await User.create({
        email: uniqueAdminEmail,
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        isAdmin: true
      });

      // Login as admin
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: uniqueAdminEmail,
          password: 'admin123'
        });

      adminToken = loginResponse.body.data.token;

      // Create test order
      testOrder = await Order.create({
        userId: testUser.id,
        items: [
          {
            productId: testProduct.id,
            quantity: 1
          }
        ],
        shippingAddress: {
          firstName: 'Test',
          lastName: 'User',
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'US'
        },
        paymentMethod: 'credit_card'
      });
    });

    describe('PUT /api/orders/:id/status', () => {
      it('should update order status as admin', async () => {
        const response = await request(app)
          .put(`/api/orders/${testOrder.id}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'confirmed' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.order.status).toBe('confirmed');
      });

      it('should fail with invalid status', async () => {
        const response = await request(app)
          .put(`/api/orders/${testOrder.id}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'invalid_status' });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INVALID_STATUS');
      });

      it('should fail for non-admin user', async () => {
        const response = await request(app)
          .put(`/api/orders/${testOrder.id}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ status: 'confirmed' });

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('ACCESS_DENIED');
      });
    });

    describe('PUT /api/orders/:id/payment-status', () => {
      it('should update payment status as admin', async () => {
        const response = await request(app)
          .put(`/api/orders/${testOrder.id}/payment-status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ paymentStatus: 'completed' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.order.paymentStatus).toBe('completed');
      });

      it('should fail with invalid payment status', async () => {
        const response = await request(app)
          .put(`/api/orders/${testOrder.id}/payment-status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ paymentStatus: 'invalid_status' });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INVALID_PAYMENT_STATUS');
      });
    });

    describe('PUT /api/orders/:id/tracking', () => {
      it('should add tracking number as admin', async () => {
        const trackingNumber = 'TRACK123456789';
        
        const response = await request(app)
          .put(`/api/orders/${testOrder.id}/tracking`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ trackingNumber });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.order.trackingNumber).toBe(trackingNumber);
      });

      it('should fail without tracking number', async () => {
        const response = await request(app)
          .put(`/api/orders/${testOrder.id}/tracking`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('MISSING_TRACKING_NUMBER');
      });
    });
  });
});