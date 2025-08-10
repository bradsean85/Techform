# Authentication System Documentation

## Overview

The authentication system provides secure user registration, login, and profile management functionality for the ecommerce platform. It uses JWT (JSON Web Tokens) for stateless authentication and bcrypt for password hashing.

## Architecture

### Components

1. **Authentication Routes** (`backend/routes/auth.js`)
   - User registration and login endpoints
   - Profile management endpoints
   - Password change functionality

2. **Authentication Middleware** (`backend/middleware/auth.js`)
   - JWT token validation
   - User authentication verification
   - Admin role verification

3. **User Model** (`backend/models/User.js`)
   - User data management
   - Password hashing and verification
   - Profile operations

4. **Validation Utilities** (`backend/utils/validation.js`)
   - Input validation functions
   - Data sanitization

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "555-0123" // optional
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

**Validation Rules:**
- Email must be valid format
- Password must be at least 8 characters with letters and numbers
- First name and last name are required
- Email must be unique

#### POST /api/auth/login
Authenticate user and receive JWT token.

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

#### POST /api/auth/logout
Logout user (client-side token removal).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Profile Management Endpoints

#### GET /api/auth/profile
Get current user profile.

**Headers:**
```
Authorization: Bearer <jwt_token>
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
    }
  }
}
```

#### PUT /api/auth/profile
Update user profile information.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

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

#### PUT /api/auth/password
Change user password.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

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

## Security Features

### Password Security
- **Hashing**: Passwords are hashed using bcrypt with 10 salt rounds
- **Validation**: Minimum 8 characters, must contain letters and numbers
- **Storage**: Plain text passwords are never stored

### JWT Token Security
- **Expiration**: Tokens expire after 24 hours
- **Payload**: Contains user ID, email, and admin status
- **Secret**: Uses environment variable `JWT_SECRET` or fallback
- **Verification**: All protected routes verify token validity

### Input Validation
- **Email**: Validated using validator.js
- **Sanitization**: All string inputs are escaped and trimmed
- **Required Fields**: Enforced at API level

### Error Handling
- **Consistent Format**: All errors follow standard format
- **No Information Leakage**: Generic messages for security-sensitive operations
- **Proper HTTP Status Codes**: 400, 401, 403, 409, 500

## Middleware

### authenticateToken
Validates JWT tokens and adds user information to request object.

```javascript
const { authenticateToken } = require('../middleware/auth');

router.get('/protected', authenticateToken, (req, res) => {
  // req.user contains decoded token data
  res.json({ user: req.user });
});
```

### requireAdmin
Ensures authenticated user has admin privileges.

```javascript
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.get('/admin-only', authenticateToken, requireAdmin, (req, res) => {
  // Only admin users can access this endpoint
  res.json({ message: 'Admin access granted' });
});
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  is_admin INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### User Addresses Table
```sql
CREATE TABLE user_addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  country TEXT DEFAULT 'US',
  is_default INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Testing

### Test Coverage
The authentication system includes comprehensive test coverage with 28 test cases:

- **Registration Tests**: Valid registration, validation errors, duplicate emails
- **Login Tests**: Valid login, invalid credentials, case sensitivity
- **Profile Tests**: Get profile, update profile, authorization
- **Password Tests**: Change password, validation, authorization
- **JWT Tests**: Token validation, expiration, malformed tokens
- **Middleware Tests**: Authentication, admin roles

### Running Tests
```bash
# Run authentication tests
npm test -- backend/tests/auth.test.js

# Run all tests
npm test
```

## Environment Variables

```env
# JWT Secret (required for production)
JWT_SECRET=your-super-secret-jwt-key

# CORS Origin (optional)
CORS_ORIGIN=http://localhost:3000

# Server Port (optional, defaults to 3000)
PORT=3000
```

## Usage Examples

### Frontend Integration

#### Registration
```javascript
const registerUser = async (userData) => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });
  
  const result = await response.json();
  
  if (result.success) {
    // Store token in localStorage or secure cookie
    localStorage.setItem('authToken', result.data.token);
    return result.data.user;
  } else {
    throw new Error(result.error.message);
  }
};
```

#### Login
```javascript
const loginUser = async (email, password) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  
  const result = await response.json();
  
  if (result.success) {
    localStorage.setItem('authToken', result.data.token);
    return result.data.user;
  } else {
    throw new Error(result.error.message);
  }
};
```

#### Authenticated Requests
```javascript
const getProfile = async () => {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch('/api/auth/profile', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  const result = await response.json();
  
  if (result.success) {
    return result.data.user;
  } else {
    throw new Error(result.error.message);
  }
};
```

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Invalid input data | 400 |
| `INVALID_EMAIL` | Email format is invalid | 400 |
| `WEAK_PASSWORD` | Password doesn't meet requirements | 400 |
| `USER_EXISTS` | Email already registered | 409 |
| `INVALID_CREDENTIALS` | Wrong email or password | 401 |
| `NO_TOKEN` | Authorization token missing | 401 |
| `INVALID_TOKEN` | Token is invalid or expired | 403 |
| `ADMIN_REQUIRED` | Admin privileges required | 403 |
| `USER_NOT_FOUND` | User doesn't exist | 404 |
| `REGISTRATION_FAILED` | Registration process failed | 500 |
| `LOGIN_FAILED` | Login process failed | 500 |
| `PROFILE_FETCH_FAILED` | Failed to fetch profile | 500 |
| `PROFILE_UPDATE_FAILED` | Failed to update profile | 500 |
| `PASSWORD_UPDATE_FAILED` | Failed to update password | 500 |

## Next Steps

The authentication system is now ready for integration with:

1. **Frontend Components**: Login/register forms, protected routes
2. **Product Management**: User-specific product interactions
3. **Shopping Cart**: User-specific cart management
4. **Order Management**: User order history and tracking
5. **Admin Panel**: Administrative user management

## Security Considerations

1. **Production Deployment**:
   - Use strong JWT secret (minimum 32 characters)
   - Enable HTTPS for all authentication endpoints
   - Consider token refresh mechanism for long-lived sessions
   - Implement rate limiting for authentication endpoints

2. **Token Management**:
   - Store tokens securely (httpOnly cookies recommended)
   - Implement token blacklisting for logout
   - Consider shorter token expiration times

3. **Password Policy**:
   - Consider implementing password complexity requirements
   - Add password history to prevent reuse
   - Implement account lockout after failed attempts

4. **Monitoring**:
   - Log authentication attempts
   - Monitor for suspicious activity
   - Implement alerting for security events