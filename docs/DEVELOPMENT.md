# Development Guide 🛠️

This guide provides detailed information for developers working on the Cyberpunk Ecommerce Platform.

## 🏗️ Architecture Overview

The application follows a traditional MVC pattern with clear separation of concerns:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (HTML/CSS/JS) │◄──►│   (Express.js)  │◄──►│   (SQLite)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Backend Architecture

```
backend/
├── server.js           # Express app setup and middleware
├── config/
│   └── database.js     # Database connection wrapper
├── routes/
│   ├── index.js        # Main router
│   ├── products.js     # Product endpoints (to be created)
│   ├── auth.js         # Authentication endpoints (to be created)
│   ├── cart.js         # Cart endpoints (to be created)
│   ├── orders.js       # Order endpoints (to be created)
│   └── admin.js        # Admin endpoints (to be created)
├── middleware/
│   ├── auth.js         # JWT authentication
│   ├── validation.js   # Request validation (to be created)
│   └── upload.js       # File upload handling (to be created)
├── models/
│   ├── User.js         # User model (to be created)
│   ├── Product.js      # Product model (to be created)
│   ├── Cart.js         # Cart model (to be created)
│   └── Order.js        # Order model (to be created)
├── services/
│   ├── authService.js  # Authentication logic (to be created)
│   ├── cartService.js  # Cart business logic (to be created)
│   └── orderService.js # Order processing (to be created)
└── utils/
    ├── validation.js   # Input validation utilities
    ├── encryption.js   # Password hashing (to be created)
    └── email.js        # Email notifications (to be created)
```

## 🗄️ Database Design

### Entity Relationship Diagram

```
Users (1) ──────── (M) User_Addresses
  │
  │ (1)
  │
  │ (M)
Carts ──── (M) Cart_Items ──── (M) Products
  │                               │
  │                               │ (M)
  │                               │
  │ (1)                          │ (M)
  │                         Order_Items
  │                               │
  │                               │ (M)
  │                               │
  └────────── (M) Orders ─────────┘
```

### Key Relationships

1. **Users → Carts**: One-to-Many (users can have multiple carts for different sessions)
2. **Carts → Cart_Items**: One-to-Many (each cart contains multiple items)
3. **Products → Cart_Items**: One-to-Many (products can be in multiple carts)
4. **Users → Orders**: One-to-Many (users can have multiple orders)
5. **Orders → Order_Items**: One-to-Many (orders contain multiple items)
6. **Products → Order_Items**: One-to-Many (products can be in multiple orders)

## 🔧 Development Workflow

### Setting Up Development Environment

1. **Clone and Install**
   ```bash
   git clone <repo-url>
   cd cyberpunk-ecommerce
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Database Setup**
   ```bash
   npm run setup  # Runs migrations and seeding
   ```

4. **Start Development**
   ```bash
   npm run dev    # Starts server with nodemon
   ```

### Code Style Guidelines

#### JavaScript Style
- Use **ES6+** features where appropriate
- **Async/await** for asynchronous operations
- **Arrow functions** for short functions
- **Template literals** for string interpolation
- **Destructuring** for object/array extraction

#### Naming Conventions
- **camelCase** for variables and functions
- **PascalCase** for classes and constructors
- **UPPER_SNAKE_CASE** for constants
- **kebab-case** for file names and URLs

#### Error Handling
```javascript
// Use try-catch for async operations
try {
  const result = await someAsyncOperation();
  return { success: true, data: result };
} catch (error) {
  console.error('Operation failed:', error);
  return { 
    success: false, 
    error: { 
      code: 'OPERATION_FAILED', 
      message: error.message 
    } 
  };
}
```

#### API Response Format
```javascript
// Success response
res.json({
  success: true,
  data: responseData,
  message: 'Optional success message'
});

// Error response
res.status(400).json({
  success: false,
  error: {
    code: 'ERROR_CODE',
    message: 'Human readable message'
  }
});
```

### Testing Strategy

#### Unit Tests
- Test individual functions and methods
- Mock external dependencies
- Focus on business logic

```javascript
// Example unit test
describe('User Validation', () => {
  test('should validate email format', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('invalid-email')).toBe(false);
  });
});
```

#### Integration Tests
- Test API endpoints
- Test database operations
- Test middleware functionality

```javascript
// Example integration test
describe('Products API', () => {
  test('GET /api/products should return product list', async () => {
    const response = await request(app)
      .get('/api/products')
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data.products)).toBe(true);
  });
});
```

## 📝 Implementation Guidelines

### Next Tasks Context

Based on the current project structure, here's what needs to be implemented next:

#### Task 2: Product Management System
**Files to create/modify:**
- `backend/models/Product.js` - Product data model
- `backend/routes/products.js` - Product API endpoints
- `backend/services/productService.js` - Product business logic
- `backend/tests/products.test.js` - Product tests

**Key Requirements:**
- CRUD operations for products
- Category filtering
- Search functionality
- Inventory management
- Image upload support

#### Task 3: User Authentication System
**Files to create/modify:**
- `backend/models/User.js` - User data model
- `backend/routes/auth.js` - Authentication endpoints
- `backend/services/authService.js` - Auth business logic
- `backend/utils/encryption.js` - Password utilities
- `backend/tests/auth.test.js` - Authentication tests

**Key Requirements:**
- User registration and login
- JWT token generation
- Password hashing with bcrypt
- Email validation
- Admin role management

### Database Utilities

The `backend/config/database.js` provides these methods:

```javascript
const database = require('./config/database');

// Connect to database
await database.connect();

// Run SQL with parameters
const result = await database.run(
  'INSERT INTO users (email, password) VALUES (?, ?)',
  [email, hashedPassword]
);

// Get single row
const user = await database.get(
  'SELECT * FROM users WHERE email = ?',
  [email]
);

// Get multiple rows
const products = await database.all(
  'SELECT * FROM products WHERE category = ?',
  [category]
);

// Close connection
await database.close();
```

### Validation Utilities

The `backend/utils/validation.js` provides:

```javascript
const { 
  validateEmail, 
  validatePassword, 
  validateRequired,
  validatePrice,
  validateQuantity,
  sanitizeString 
} = require('./utils/validation');

// Usage examples
if (!validateEmail(email)) {
  return res.status(400).json({
    success: false,
    error: { code: 'INVALID_EMAIL', message: 'Invalid email format' }
  });
}

const cleanName = sanitizeString(productName);
```

### Authentication Middleware

The `backend/middleware/auth.js` provides:

```javascript
const { authenticateToken, requireAdmin } = require('./middleware/auth');

// Protect routes
router.get('/profile', authenticateToken, (req, res) => {
  // req.user contains decoded JWT payload
  res.json({ user: req.user });
});

// Admin-only routes
router.post('/admin/products', authenticateToken, requireAdmin, (req, res) => {
  // Only admin users can access this
});
```

## 🚀 Deployment Considerations

### Environment Variables
Ensure all sensitive data is in environment variables:
- Database credentials
- JWT secrets
- API keys
- File upload paths

### Security Best Practices
- Always hash passwords with bcrypt
- Validate and sanitize all inputs
- Use HTTPS in production
- Implement rate limiting
- Set proper CORS policies
- Use secure JWT secrets

### Performance Optimization
- Add database indexes for frequently queried fields
- Implement caching for product data
- Optimize image sizes and formats
- Use compression middleware
- Monitor database query performance

## 🐛 Debugging

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check if database file exists
   ls -la backend/database/ecommerce.db
   
   # Re-run migrations if needed
   npm run migrate
   ```

2. **JWT Token Issues**
   ```bash
   # Check JWT_SECRET in .env
   echo $JWT_SECRET
   
   # Verify token format in requests
   # Should be: Authorization: Bearer <token>
   ```

3. **CORS Errors**
   ```bash
   # Check CORS_ORIGIN in .env
   # Should match your frontend URL
   ```

### Logging

Add logging throughout the application:

```javascript
// Use console.log for development
console.log('User authenticated:', req.user.id);

// For production, consider using a logging library
const winston = require('winston');
logger.info('User authenticated', { userId: req.user.id });
```

## 📚 Resources

### Documentation
- [Express.js Guide](https://expressjs.com/en/guide/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [JWT.io](https://jwt.io/) - JWT debugger
- [bcrypt Documentation](https://www.npmjs.com/package/bcrypt)

### Tools
- **Postman** - API testing
- **SQLite Browser** - Database inspection
- **VS Code Extensions**:
  - SQLite Viewer
  - REST Client
  - Jest Runner

---

This development guide should be updated as the project evolves and new patterns emerge.