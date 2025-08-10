# Database Management Documentation

This directory contains all database-related files for the Cyberpunk E-commerce Platform, including schema definitions, migration scripts, seeding utilities, and management tools.

## Directory Structure

```
backend/database/
├── README.md           # This documentation
├── schema.sql          # Database schema definition
├── migrate.js          # Migration execution script
├── seed.js            # Database seeding script
├── utils.js           # Database utility functions
└── ecommerce.db       # SQLite database file (created after migration)
```

## Files Overview

### schema.sql
**Purpose**: Complete database schema definition
**Contains**:
- Table definitions for all entities
- Foreign key relationships
- Indexes for performance optimization
- Default values and constraints

**Key Tables**:
- `users` - User accounts and authentication
- `user_addresses` - User shipping addresses
- `products` - Product catalog with cyberpunk theme
- `carts` - Shopping carts for users and guests
- `cart_items` - Items within shopping carts
- `orders` - Completed orders
- `order_items` - Items within orders

### migrate.js
**Purpose**: Execute database migrations
**Features**:
- Reads and executes schema.sql
- Detailed progress logging
- Error handling with rollback
- Table creation verification
- Idempotent execution (safe to run multiple times)

**Usage**:
```bash
# Run migrations
node backend/database/migrate.js

# Or from project root
npm run db:migrate
```

**Output Example**:
```
Starting database migration...
Connected to SQLite database
Executing 14 migration statements...
✓ Statement 1/14 executed successfully
✓ Statement 2/14 executed successfully
...
Created tables: cart_items, carts, order_items, orders, products, user_addresses, users
Database migration completed successfully!
```

### seed.js
**Purpose**: Populate database with initial data
**Features**:
- Creates admin and test user accounts
- Adds 10 cyberpunk-themed products
- Uses model classes for data integrity
- Prevents duplicate data insertion
- Comprehensive logging and statistics

**Sample Data**:
- **Admin User**: admin@cyberpunk-store.com
- **Test Customer**: customer@test.com
- **Products**: Neural interfaces, quantum processors, holographic displays, etc.
- **Total Inventory**: 83+ items across all products

**Usage**:
```bash
# Seed database
node backend/database/seed.js

# Or from project root
npm run db:seed
```

**Output Example**:
```
Starting database seeding...
✓ Admin user already exists: admin@cyberpunk-store.com
✓ Test customer created: customer@test.com
✓ Created product: Neon Pulse Gaming Rig
...
Seeding Summary:
- Products created: 4
- Products already existed: 6
- Total products in catalog: 10
- Total inventory items: 83
```

### utils.js
**Purpose**: Advanced database management utilities
**Features**:
- Complete database initialization
- Database reset and cleanup
- Statistics and analytics
- Data backup and restore
- Integrity validation
- Popular products analysis

**Key Functions**:

#### DatabaseUtils.initialize()
Complete database setup (migration + seeding)
```javascript
await DatabaseUtils.initialize();
```

#### DatabaseUtils.getStats()
Get comprehensive database statistics
```javascript
const stats = await DatabaseUtils.getStats();
// Returns: users, products, orders, revenue, etc.
```

#### DatabaseUtils.cleanup(options)
Clean up old data (carts, sessions)
```javascript
const results = await DatabaseUtils.cleanup({
  cartCleanupDays: 30
});
```

#### DatabaseUtils.validateIntegrity()
Check database consistency
```javascript
const validation = await DatabaseUtils.validateIntegrity();
if (!validation.isValid) {
  console.log('Issues found:', validation.issues);
}
```

#### DatabaseUtils.backup()
Export database to JSON
```javascript
const backup = await DatabaseUtils.backup();
// Returns complete database export
```

#### DatabaseUtils.getPopularProducts(limit)
Get best-selling products
```javascript
const popular = await DatabaseUtils.getPopularProducts(10);
```

#### DatabaseUtils.getSalesSummary(startDate, endDate)
Get sales analytics for date range
```javascript
const summary = await DatabaseUtils.getSalesSummary(
  '2024-01-01',
  '2024-12-31'
);
```

## Database Schema Details

### Core Entities

#### Users
- **Primary Key**: Auto-incrementing ID
- **Authentication**: Email/password with bcrypt hashing
- **Profile**: First name, last name, phone
- **Admin Support**: Boolean flag for admin users
- **Timestamps**: Created and updated timestamps

#### Products
- **Catalog Management**: Name, description, pricing
- **Categorization**: Category-based organization
- **Visual Elements**: Icons and image arrays (JSON)
- **Specifications**: Detailed specs as JSON objects
- **Inventory Tracking**: Stock levels with automatic updates
- **Status Management**: Active/inactive product states

#### Orders
- **Order Processing**: Status tracking (pending → confirmed → shipped → delivered)
- **Payment Integration**: Payment method and status tracking
- **Shipping**: Address storage as JSON, tracking numbers
- **Financial**: Total amount calculation and storage
- **Audit Trail**: Creation and update timestamps

#### Carts
- **Session Support**: Both authenticated users and guest sessions
- **Persistence**: Cart data survives browser sessions
- **Item Management**: Quantity tracking and updates
- **Validation**: Inventory checking before checkout

### Relationships

```sql
-- User to Cart (1:1 or 1:0)
carts.user_id → users.id

-- User to Orders (1:many)
orders.user_id → users.id

-- User to Addresses (1:many)
user_addresses.user_id → users.id

-- Cart to Items (1:many)
cart_items.cart_id → carts.id
cart_items.product_id → products.id

-- Order to Items (1:many)
order_items.order_id → orders.id
order_items.product_id → products.id
```

### Indexes

Performance indexes are created for:
```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);

-- Product filtering
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(is_active);

-- Cart operations
CREATE INDEX idx_carts_user_id ON carts(user_id);
CREATE INDEX idx_carts_session_id ON carts(session_id);

-- Order management
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
```

## Management Commands

### Setup Commands
```bash
# Initialize database (migrate + seed)
node -e "require('./backend/database/utils').initialize()"

# Reset database (drop all + reinitialize)
node -e "require('./backend/database/utils').reset()"
```

### Maintenance Commands
```bash
# Get database statistics
node -e "require('./backend/database/utils').getStats().then(console.log)"

# Clean up old data
node -e "require('./backend/database/utils').cleanup().then(console.log)"

# Validate database integrity
node -e "require('./backend/database/utils').validateIntegrity().then(console.log)"
```

### Analytics Commands
```bash
# Get popular products
node -e "require('./backend/database/utils').getPopularProducts(5).then(console.log)"

# Get sales summary
node -e "require('./backend/database/utils').getSalesSummary('2024-01-01', '2024-12-31').then(console.log)"
```

## Environment Configuration

Configure database behavior with environment variables:

```env
# Admin account setup
ADMIN_EMAIL=admin@cyberpunk-store.com
ADMIN_PASSWORD=secure_admin_password

# Database configuration
DB_PATH=./backend/database/ecommerce.db
DB_CLEANUP_DAYS=30
```

## Backup and Recovery

### Manual Backup
```javascript
const DatabaseUtils = require('./utils');
const fs = require('fs');

// Create backup
const backup = await DatabaseUtils.backup();
fs.writeFileSync('backup.json', JSON.stringify(backup, null, 2));
```

### Database File Backup
```bash
# Copy SQLite file
cp backend/database/ecommerce.db backup/ecommerce-$(date +%Y%m%d).db
```

## Troubleshooting

### Common Issues

#### Migration Fails
```bash
# Check if database file is locked
lsof backend/database/ecommerce.db

# Remove database and retry
rm backend/database/ecommerce.db
node backend/database/migrate.js
```

#### Seeding Errors
```bash
# Check if migration was run first
node backend/database/migrate.js
node backend/database/seed.js
```

#### Performance Issues
```bash
# Analyze database
sqlite3 backend/database/ecommerce.db "ANALYZE;"

# Check index usage
sqlite3 backend/database/ecommerce.db "EXPLAIN QUERY PLAN SELECT * FROM products WHERE category = 'electronics';"
```

### Database Repair
```javascript
// Validate and report issues
const validation = await DatabaseUtils.validateIntegrity();
if (!validation.isValid) {
  console.log('Database issues found:');
  validation.issues.forEach(issue => {
    console.log(`- ${issue.type}: ${issue.count} items`);
  });
}
```

## Performance Monitoring

### Query Performance
```sql
-- Enable query logging (development only)
PRAGMA query_only = ON;

-- Check slow queries
EXPLAIN QUERY PLAN SELECT * FROM products 
JOIN order_items ON products.id = order_items.product_id;
```

### Database Size
```bash
# Check database size
ls -lh backend/database/ecommerce.db

# Check table sizes
sqlite3 backend/database/ecommerce.db "
SELECT name, COUNT(*) as rows 
FROM sqlite_master 
JOIN pragma_table_info(name) 
GROUP BY name;"
```

## Security Considerations

### File Permissions
```bash
# Secure database file
chmod 600 backend/database/ecommerce.db
```

### Backup Security
- Encrypt backup files
- Store backups securely
- Regular backup rotation
- Test restore procedures

### Access Control
- Database file access restrictions
- Environment variable protection
- Connection string security

## Next Steps for API Integration

The database layer provides everything needed for the next implementation phase:

1. **Complete Models**: All CRUD operations ready
2. **Authentication Support**: User management with password hashing
3. **E-commerce Logic**: Cart and order processing
4. **Analytics Foundation**: Sales and inventory reporting
5. **Testing Coverage**: Comprehensive test suite
6. **Performance Optimization**: Indexes and query optimization
7. **Data Integrity**: Foreign keys and validation
8. **Maintenance Tools**: Cleanup and monitoring utilities

The database is production-ready and provides a solid foundation for building the REST API endpoints.