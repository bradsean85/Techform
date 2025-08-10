# Database Layer Documentation

## Overview

The Cyberpunk E-commerce Platform uses SQLite as its database with a comprehensive data model layer built in Node.js. This document provides detailed information about the database architecture, models, and usage patterns.

## Table of Contents

- [Database Schema](#database-schema)
- [Data Models](#data-models)
- [Database Configuration](#database-configuration)
- [Migration System](#migration-system)
- [Seeding System](#seeding-system)
- [Database Utilities](#database-utilities)
- [Testing](#testing)
- [Best Practices](#best-practices)

## Database Schema

### Core Tables

#### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  is_admin BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Products Table
```sql
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  icon TEXT,
  images TEXT, -- JSON array of image URLs
  specifications TEXT, -- JSON object for product specs
  inventory INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Orders Table
```sql
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  shipping_address TEXT NOT NULL, -- JSON object
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  tracking_number TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### Carts Table
```sql
CREATE TABLE carts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  session_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Supporting Tables

- **user_addresses**: User shipping addresses
- **cart_items**: Items in shopping carts
- **order_items**: Items in completed orders

### Indexes

Performance indexes are created for:
- User email lookups
- Product category and status filtering
- Cart and order user associations
- Order status filtering

## Data Models

### Product Model (`backend/models/Product.js`)

The Product model handles all product-related operations including inventory management.

#### Key Features:
- **CRUD Operations**: Create, read, update, delete products
- **Inventory Management**: Track stock levels, reduce inventory on orders
- **Search & Filtering**: Find products by category, price range, search terms
- **Low Stock Alerts**: Identify products below threshold
- **JSON Serialization**: Convert to API-friendly format

#### Usage Examples:

```javascript
const { Product } = require('../models');

// Find all active products
const products = await Product.findAll({ isActive: true });

// Find products by category
const neuralTech = await Product.findByCategory('neural-tech');

// Update inventory
const product = await Product.findById(1);
await product.updateInventory(50);

// Reduce inventory (for orders)
await product.reduceInventory(2);
```

### User Model (`backend/models/User.js`)

Handles user authentication, profile management, and address storage.

#### Key Features:
- **Authentication**: Password hashing with bcrypt
- **Profile Management**: User information CRUD
- **Address Management**: Multiple shipping addresses per user
- **Admin Support**: Admin user identification
- **Security**: Password verification and updates

#### Usage Examples:

```javascript
const { User } = require('../models');

// Create new user
const user = await User.create({
  email: 'user@example.com',
  password: 'securepassword',
  firstName: 'John',
  lastName: 'Doe'
});

// Authenticate user
const user = await User.findByEmail('user@example.com');
const isValid = await user.verifyPassword('password');

// Add shipping address
await user.addAddress({
  street: '123 Main St',
  city: 'Neo Tokyo',
  state: 'CA',
  zipCode: '90210',
  isDefault: true
});
```

### Cart Model (`backend/models/Cart.js`)

Manages shopping cart functionality for both authenticated users and guest sessions.

#### Key Features:
- **Session Support**: Handle both user and guest carts
- **Item Management**: Add, update, remove cart items
- **Inventory Validation**: Check stock availability
- **Cart Merging**: Merge guest cart with user cart on login
- **Total Calculation**: Calculate cart totals and item counts

#### Usage Examples:

```javascript
const { Cart } = require('../models');

// Get or create cart for user
const cart = await Cart.getOrCreate(userId);

// Add item to cart
await cart.addItem(productId, 2);

// Update item quantity
await cart.updateItemQuantity(productId, 3);

// Validate cart items
const issues = await cart.validateItems();

// Get cart total
const total = cart.getTotal();
```

### Order Model (`backend/models/Order.js`)

Handles order processing, status tracking, and analytics.

#### Key Features:
- **Order Creation**: Create orders from cart items
- **Status Management**: Track order and payment status
- **Inventory Integration**: Automatically reduce inventory on order
- **Analytics**: Sales reporting and popular products
- **Order History**: User order tracking

#### Usage Examples:

```javascript
const { Order } = require('../models');

// Create order from cart
const order = await Order.create({
  userId: user.id,
  items: cart.items.map(item => ({
    productId: item.productId,
    quantity: item.quantity
  })),
  shippingAddress: {
    street: '123 Main St',
    city: 'Neo Tokyo',
    state: 'CA',
    zipCode: '90210'
  }
});

// Update order status
await order.updateStatus('shipped');
await order.addTrackingNumber('TRACK123456');

// Get user orders
const orders = await Order.findByUserId(userId);

// Get analytics
const analytics = await Order.getAnalytics();
```

## Database Configuration

The database configuration is centralized in `backend/config/database.js`:

### Core Features:
- **Connection Management**: Automatic connection handling
- **Promise-based API**: All operations return promises
- **Transaction Support**: Begin, commit, rollback transactions
- **Helper Methods**: Upsert, batch insert, pagination
- **Error Handling**: Comprehensive error management

### Advanced Features:

```javascript
const database = require('../config/database');

// Transaction example
await database.transaction([
  { sql: 'INSERT INTO products (...) VALUES (...)', params: [...] },
  { sql: 'UPDATE inventory SET ...', params: [...] }
]);

// Pagination example
const result = await database.paginate(
  'SELECT * FROM products WHERE category = ?',
  ['electronics'],
  1, // page
  10 // limit
);

// Batch insert
await database.batchInsert('products', productArray);
```

## Migration System

Database migrations are handled by `backend/database/migrate.js`:

### Features:
- **Schema Execution**: Runs SQL schema files
- **Progress Tracking**: Detailed execution logging
- **Error Handling**: Rollback on failure
- **Verification**: Confirms table creation

### Usage:
```bash
# Run migrations
node backend/database/migrate.js
```

## Seeding System

The seeding system (`backend/database/seed.js`) populates the database with initial data:

### Features:
- **Cyberpunk Products**: 10 themed tech products
- **User Accounts**: Admin and test customer accounts
- **Inventory Management**: Proper stock levels
- **Duplicate Prevention**: Checks for existing data

### Sample Products:
- Neural Interface Headset ($2,499.99)
- Quantum Processor Core ($4,999.99)
- Holographic Display Matrix ($1,899.99)
- Cybernetic Arm Enhancement ($15,999.99)
- And 6 more cyberpunk-themed items

### Usage:
```bash
# Seed database
node backend/database/seed.js
```

## Database Utilities

The `backend/database/utils.js` provides advanced database operations:

### Features:
- **Initialization**: Complete database setup
- **Statistics**: Database metrics and analytics
- **Cleanup**: Remove old carts and sessions
- **Backup**: Export data to JSON
- **Integrity Validation**: Check for data consistency
- **Popular Products**: Sales-based product ranking

### Usage Examples:

```javascript
const DatabaseUtils = require('../database/utils');

// Initialize database
await DatabaseUtils.initialize();

// Get statistics
const stats = await DatabaseUtils.getStats();

// Clean up old data
const results = await DatabaseUtils.cleanup();

// Validate integrity
const validation = await DatabaseUtils.validateIntegrity();
```

## Testing

Comprehensive model testing is available in `backend/tests/models.test.js`:

### Test Coverage:
- **Product Operations**: CRUD, inventory, search
- **User Management**: Authentication, addresses
- **Cart Functionality**: Items, totals, validation
- **Order Processing**: Creation, status updates
- **Analytics**: Sales reporting

### Running Tests:
```bash
node backend/tests/models.test.js
```

## Best Practices

### Performance
1. **Use Indexes**: Leverage database indexes for frequent queries
2. **Batch Operations**: Use batch inserts for multiple records
3. **Connection Pooling**: Reuse database connections
4. **Query Optimization**: Use specific WHERE clauses

### Security
1. **Parameterized Queries**: Always use parameter binding
2. **Password Hashing**: Use bcrypt for password storage
3. **Input Validation**: Validate all user inputs
4. **SQL Injection Prevention**: Never concatenate user input

### Data Integrity
1. **Foreign Keys**: Maintain referential integrity
2. **Transactions**: Use transactions for multi-table operations
3. **Validation**: Implement model-level validation
4. **Error Handling**: Comprehensive error management

### Maintenance
1. **Regular Cleanup**: Remove old sessions and carts
2. **Backup Strategy**: Regular data backups
3. **Monitoring**: Track database performance
4. **Integrity Checks**: Regular validation runs

## Environment Variables

Configure the database using environment variables:

```env
# Admin account
ADMIN_EMAIL=admin@cyberpunk-store.com
ADMIN_PASSWORD=secure_admin_password

# Database settings
DB_PATH=./backend/database/ecommerce.db
```

## Error Handling

All database operations include comprehensive error handling:

```javascript
try {
  const product = await Product.findById(id);
  if (!product) {
    throw new Error('Product not found');
  }
  // Process product
} catch (error) {
  console.error('Database operation failed:', error.message);
  // Handle error appropriately
}
```

## Next Steps

For the next implementation phase, the database layer provides:

1. **Complete Data Models**: Ready for API integration
2. **Authentication Support**: User management system
3. **E-commerce Logic**: Cart and order processing
4. **Analytics Foundation**: Sales and inventory reporting
5. **Testing Framework**: Comprehensive test coverage

The database layer is production-ready and provides a solid foundation for building the REST API and frontend integration.