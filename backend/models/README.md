# Data Models Documentation

This directory contains the core data models for the Cyberpunk E-commerce Platform. Each model provides a clean abstraction layer over the SQLite database operations.

## Model Architecture

All models follow a consistent pattern:
- **Constructor**: Initialize model with database row data
- **Static Methods**: Class-level operations (find, create, etc.)
- **Instance Methods**: Object-level operations (save, delete, etc.)
- **Validation**: Input validation and business logic
- **Error Handling**: Comprehensive error management
- **JSON Serialization**: API-friendly data conversion

## Available Models

### Product Model
**File**: `Product.js`
**Purpose**: Manage product catalog and inventory

**Key Methods**:
- `Product.findAll(filters)` - Find products with optional filtering
- `Product.findById(id)` - Find specific product
- `Product.findByCategory(category)` - Find products by category
- `Product.getLowStock(threshold)` - Find low inventory products
- `product.save()` - Create or update product
- `product.updateInventory(quantity)` - Update stock levels
- `product.reduceInventory(quantity)` - Reduce stock (for orders)

**Example Usage**:
```javascript
const { Product } = require('./models');

// Find all active products in neural-tech category
const products = await Product.findAll({
  category: 'neural-tech',
  isActive: true
});

// Update inventory
const product = await Product.findById(1);
await product.updateInventory(50);
```

### User Model
**File**: `User.js`
**Purpose**: User authentication and profile management

**Key Methods**:
- `User.create(userData)` - Create new user with hashed password
- `User.findByEmail(email)` - Find user by email
- `User.findById(id)` - Find user by ID
- `user.verifyPassword(password)` - Verify user password
- `user.updatePassword(newPassword)` - Update user password
- `user.addAddress(addressData)` - Add shipping address
- `user.getAddresses()` - Get user addresses

**Example Usage**:
```javascript
const { User } = require('./models');

// Create new user
const user = await User.create({
  email: 'user@example.com',
  password: 'securepassword',
  firstName: 'John',
  lastName: 'Doe'
});

// Authenticate
const user = await User.findByEmail('user@example.com');
const isValid = await user.verifyPassword('password');
```

### Cart Model
**File**: `Cart.js`
**Purpose**: Shopping cart management for users and guests

**Key Methods**:
- `Cart.getOrCreate(userId, sessionId)` - Get or create cart
- `Cart.mergeGuestCart(sessionId, userId)` - Merge guest cart on login
- `cart.addItem(productId, quantity)` - Add item to cart
- `cart.updateItemQuantity(productId, quantity)` - Update item quantity
- `cart.removeItem(productId)` - Remove item from cart
- `cart.validateItems()` - Check inventory availability
- `cart.getTotal()` - Calculate cart total
- `cart.clear()` - Empty cart

**Example Usage**:
```javascript
const { Cart } = require('./models');

// Get user cart
const cart = await Cart.getOrCreate(userId);

// Add items
await cart.addItem(productId, 2);

// Validate before checkout
const issues = await cart.validateItems();
if (issues.length === 0) {
  // Proceed to checkout
}
```

### Order Model
**File**: `Order.js`
**Purpose**: Order processing and management

**Key Methods**:
- `Order.create(orderData)` - Create new order from cart
- `Order.findById(id)` - Find specific order
- `Order.findByUserId(userId)` - Find user's orders
- `Order.findAll(filters)` - Find all orders (admin)
- `Order.getAnalytics(filters)` - Get sales analytics
- `order.updateStatus(status)` - Update order status
- `order.updatePaymentStatus(status)` - Update payment status
- `order.addTrackingNumber(number)` - Add tracking info
- `order.cancel()` - Cancel order and restore inventory

**Example Usage**:
```javascript
const { Order } = require('./models');

// Create order
const order = await Order.create({
  userId: user.id,
  items: cart.items.map(item => ({
    productId: item.productId,
    quantity: item.quantity
  })),
  shippingAddress: userAddress
});

// Update status
await order.updateStatus('shipped');
```

## Model Relationships

```
User (1) -----> (0..n) Cart
User (1) -----> (0..n) Order
User (1) -----> (0..n) UserAddress

Cart (1) -----> (0..n) CartItem
CartItem (n) -----> (1) Product

Order (1) -----> (1..n) OrderItem
OrderItem (n) -----> (1) Product
```

## Data Validation

Each model includes validation for:
- **Required Fields**: Ensure essential data is present
- **Data Types**: Validate field types and formats
- **Business Rules**: Enforce business logic constraints
- **Referential Integrity**: Maintain data relationships

## Error Handling

All models use consistent error handling:
```javascript
try {
  const result = await Model.someOperation();
  return result;
} catch (error) {
  throw new Error(`Failed to perform operation: ${error.message}`);
}
```

## JSON Serialization

All models provide `toJSON()` methods for API responses:
- Exclude sensitive data (passwords)
- Parse JSON fields (images, specifications)
- Format data for frontend consumption

## Testing

Each model is thoroughly tested in `../tests/models.test.js`:
- Unit tests for all methods
- Integration tests with database
- Error condition testing
- Performance validation

## Usage Patterns

### Creating Records
```javascript
// Using constructor + save
const product = new Product(productData);
await product.save();

// Using static create method (for users)
const user = await User.create(userData);
```

### Finding Records
```javascript
// By ID
const product = await Product.findById(1);

// With filters
const products = await Product.findAll({
  category: 'electronics',
  minPrice: 100,
  maxPrice: 1000
});

// By specific field
const user = await User.findByEmail('user@example.com');
```

### Updating Records
```javascript
// Load, modify, save
const product = await Product.findById(1);
product.price = 299.99;
await product.save();

// Direct update methods
await product.updateInventory(50);
```

### Complex Operations
```javascript
// Cart to order conversion
const cart = await Cart.getOrCreate(userId);
const order = await Order.create({
  userId: userId,
  items: cart.items.map(item => ({
    productId: item.productId,
    quantity: item.quantity
  })),
  shippingAddress: address
});
await cart.clear();
```

## Performance Considerations

- **Lazy Loading**: Related data loaded on demand
- **Batch Operations**: Use database batch methods for multiple records
- **Caching**: Consider caching frequently accessed data
- **Indexes**: Database indexes optimize common queries

## Security Features

- **Password Hashing**: Automatic bcrypt hashing for user passwords
- **SQL Injection Prevention**: Parameterized queries throughout
- **Data Sanitization**: Input validation and sanitization
- **Access Control**: Admin-only methods clearly marked

## Future Enhancements

Potential model improvements:
- **Caching Layer**: Redis integration for frequently accessed data
- **Audit Trail**: Track changes to critical records
- **Soft Deletes**: Mark records as deleted instead of removing
- **Versioning**: Track record versions for rollback capability
- **Search Integration**: Full-text search capabilities