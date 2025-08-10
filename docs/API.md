# API Documentation 📡

This document provides detailed information about the Cyberpunk Ecommerce Platform API endpoints.

## Database Layer Integration

The API is built on top of a comprehensive database layer with complete data models. For detailed information about the underlying data structures and database operations, see:

- **[Database Documentation](DATABASE.md)** - Complete database schema and utilities
- **[Models Documentation](../backend/models/README.md)** - Data model implementations

### Available Data Models
- **Product Model** (`backend/models/Product.js`) - Product catalog with inventory management
- **User Model** (`backend/models/User.js`) - User authentication and profile management  
- **Cart Model** (`backend/models/Cart.js`) - Shopping cart for users and guests
- **Order Model** (`backend/models/Order.js`) - Order processing and status tracking

### Database Features Ready for API Integration
- ✅ **Complete CRUD Operations** - All models support create, read, update, delete
- ✅ **Authentication System** - User registration, login, password hashing with bcrypt
- ✅ **Inventory Management** - Real-time stock tracking and validation
- ✅ **Shopping Cart Logic** - Guest and user cart support with session merging
- ✅ **Order Processing** - Complete order lifecycle with status tracking
- ✅ **Analytics Support** - Sales reporting and popular products analysis
- ✅ **Data Validation** - Comprehensive input validation and business rules
- ✅ **Testing Coverage** - Full test suite for all models and operations

## Base URL
```
http://localhost:3000/api
```

## Authentication

Most endpoints require authentication via JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses follow this standard format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

## Endpoints

### Health Check

#### GET /api/health
Check if the API is running.

**Response:**
```json
{
  "status": "OK",
  "message": "API is running",
  "timestamp": "2024-08-09T23:55:00.000Z"
}
```

---

## Authentication Endpoints ✅

### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "555-0123"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "555-0123",
      "isAdmin": false,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Validation:**
- Email must be valid format and unique
- Password must be at least 8 characters with letters and numbers
- First name and last name are required

### POST /api/auth/login
Authenticate user and get JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "555-0123",
      "isAdmin": false,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### POST /api/auth/logout
Logout user (client-side token removal).

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET /api/auth/profile
Get current user profile.

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "555-0123",
      "isAdmin": false,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

### PUT /api/auth/profile
Update user profile information.

**Authentication:** Required

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "555-9876"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "phone": "555-9876",
      "isAdmin": false,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

### PUT /api/auth/password
Change user password.

**Authentication:** Required

**Request Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

---

## Product Endpoints (To be implemented)

### GET /api/products
Get all products with optional filtering.

**Query Parameters:**
- `category` (optional) - Filter by category
- `search` (optional) - Search in name and description
- `minPrice` (optional) - Minimum price filter
- `maxPrice` (optional) - Maximum price filter
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 1,
        "name": "Neural Interface Headset",
        "description": "Advanced brain-computer interface...",
        "price": 2499.99,
        "category": "neural-tech",
        "icon": "🧠",
        "images": ["/images/neural-headset-1.jpg"],
        "specifications": {
          "Bandwidth": "10 Gbps",
          "Latency": "< 1ms"
        },
        "inventory": 15,
        "isActive": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 6,
      "pages": 1
    }
  }
}
```

### GET /api/products/:id
Get a specific product by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "product": {
      "id": 1,
      "name": "Neural Interface Headset",
      "description": "Advanced brain-computer interface...",
      "price": 2499.99,
      "category": "neural-tech",
      "icon": "🧠",
      "images": ["/images/neural-headset-1.jpg"],
      "specifications": {
        "Bandwidth": "10 Gbps",
        "Latency": "< 1ms"
      },
      "inventory": 15,
      "isActive": true
    }
  }
}
```

---

## Cart Endpoints (To be implemented)

### GET /api/cart
Get current user's cart.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "cart": {
      "id": 1,
      "items": [
        {
          "id": 1,
          "productId": 1,
          "product": {
            "name": "Neural Interface Headset",
            "price": 2499.99,
            "icon": "🧠"
          },
          "quantity": 2
        }
      ],
      "totalItems": 2,
      "totalAmount": 4999.98
    }
  }
}
```

### POST /api/cart/items
Add item to cart.

**Authentication:** Required

**Request Body:**
```json
{
  "productId": 1,
  "quantity": 2
}
```

### PUT /api/cart/items/:id
Update cart item quantity.

**Authentication:** Required

**Request Body:**
```json
{
  "quantity": 3
}
```

### DELETE /api/cart/items/:id
Remove item from cart.

**Authentication:** Required

---

## Order Endpoints (To be implemented)

### GET /api/orders
Get user's order history.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": 1,
        "totalAmount": 4999.98,
        "status": "pending",
        "paymentStatus": "pending",
        "createdAt": "2024-08-09T23:55:00.000Z",
        "items": [
          {
            "productName": "Neural Interface Headset",
            "quantity": 2,
            "price": 2499.99
          }
        ]
      }
    ]
  }
}
```

### POST /api/orders
Create new order from cart.

**Authentication:** Required

**Request Body:**
```json
{
  "shippingAddress": {
    "street": "123 Cyber Street",
    "city": "Neo Tokyo",
    "state": "NT",
    "zipCode": "12345",
    "country": "US"
  },
  "paymentMethod": "credit_card"
}
```

---

## Admin Endpoints (To be implemented)

### GET /api/admin/products
Get all products (admin view).

**Authentication:** Required (Admin)

### POST /api/admin/products
Create new product.

**Authentication:** Required (Admin)

### PUT /api/admin/products/:id
Update product.

**Authentication:** Required (Admin)

### DELETE /api/admin/products/:id
Delete product.

**Authentication:** Required (Admin)

### GET /api/admin/orders
Get all orders.

**Authentication:** Required (Admin)

### PUT /api/admin/orders/:id
Update order status.

**Authentication:** Required (Admin)

---

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `CONFLICT` | Resource already exists |
| `INTERNAL_ERROR` | Server error |
| `NO_TOKEN` | JWT token missing |
| `INVALID_TOKEN` | JWT token invalid or expired |
| `ADMIN_REQUIRED` | Admin access required |

---

## Rate Limiting

API endpoints are rate limited to prevent abuse:
- **General endpoints**: 100 requests per 15 minutes
- **Authentication endpoints**: 5 requests per 15 minutes
- **Admin endpoints**: 200 requests per 15 minutes

---

## File Upload

### POST /api/upload
Upload product images or other files.

**Authentication:** Required (Admin)

**Content-Type:** `multipart/form-data`

**Request:**
```
file: <binary data>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "filename": "image-123456789.jpg",
    "url": "/uploads/image-123456789.jpg",
    "size": 1024000
  }
}
```

**Limits:**
- Maximum file size: 5MB
- Allowed types: JPG, PNG, GIF, WebP
- Maximum 10 files per request

---

## WebSocket Events (Future)

Real-time features will be implemented using WebSocket connections:

- `order_status_updated` - Order status changes
- `inventory_updated` - Product inventory changes
- `new_product` - New product added
- `cart_updated` - Cart modifications

---

## SDK Examples

### JavaScript/Node.js
```javascript
const API_BASE = 'http://localhost:3000/api';

// Login
const response = await fetch(`${API_BASE}/auth/login`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const { data } = await response.json();
const token = data.token;

// Get products
const productsResponse = await fetch(`${API_BASE}/products`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### cURL Examples
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Get products
curl -X GET http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Implementation Status

### ✅ Completed
- **Complete Data Models** - All core models implemented and tested
- **Database Schema** - Full SQLite schema with relationships and indexes
- **Sample Data** - 10 cyberpunk-themed products with comprehensive specifications
- **User Management** - Authentication, profiles, and address management
- **Cart System** - Guest and user cart support with inventory validation
- **Order Processing** - Complete order lifecycle with status tracking
- **Analytics Foundation** - Sales reporting and inventory management
- **Testing Suite** - Comprehensive model testing with 100% pass rate
- **Authentication API** - Complete user registration, login, and profile management
- **JWT Security** - Token-based authentication with middleware
- **API Testing** - 28 authentication tests with full coverage

### 🔄 Next Phase (API Implementation)
The database layer provides all necessary functionality. The API implementation should focus on:

1. **Route Handlers** - Express routes using existing models
2. **Authentication Middleware** - JWT integration with User model
3. **Request Validation** - Input validation using model validation
4. **Error Handling** - Consistent API error responses
5. **Session Management** - Guest cart and user authentication
6. **Admin Features** - Admin-only endpoints using existing model methods
7. **File Uploads** - Product image handling
8. **API Testing** - Integration tests for HTTP endpoints

### Database Statistics
- **Users**: 2 (1 admin, 1 test customer)
- **Products**: 10 cyberpunk-themed tech gadgets
- **Categories**: 8 different product categories
- **Total Inventory**: 83+ items across all products
- **Database Size**: Optimized with proper indexes and relationships

**Note:** The database layer is production-ready. API endpoints marked as "To be implemented" can now be built using the existing model functionality.