class ApiClient {
  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
    this.token = null;
    this.sessionId = null;
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
    
    this.init();
  }

  init() {
    // Load stored token
    this.token = localStorage.getItem('authToken');
    
    // Generate or load session ID
    this.sessionId = localStorage.getItem('guestSessionId') || this.generateSessionId();
    localStorage.setItem('guestSessionId', this.sessionId);
  }

  // Generate session ID for guest users
  generateSessionId() {
    return 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Set authentication token
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  // Get request headers
  getHeaders(customHeaders = {}) {
    const headers = {
      ...this.defaultHeaders,
      'X-Session-ID': this.sessionId,
      ...customHeaders
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Make HTTP request
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      credentials: 'include',
      ...options,
      headers: this.getHeaders(options.headers)
    };

    try {
      const response = await fetch(url, config);
      
      // Handle different response types
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        throw new ApiError(
          data.error?.message || `HTTP ${response.status}`,
          response.status,
          data
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Network or other errors
      throw new ApiError(
        error.message || 'Network error occurred',
        0,
        { originalError: error }
      );
    }
  }

  // GET request
  async get(endpoint, options = {}) {
    const { params, ...requestOptions } = options;
    
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          searchParams.append(key, value);
        }
      });
      url += `?${searchParams.toString()}`;
    }

    return this.request(url, {
      method: 'GET',
      ...requestOptions
    });
  }

  // POST request
  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options
    });
  }

  // PUT request
  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options
    });
  }

  // PATCH request
  async patch(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...options
    });
  }

  // DELETE request
  async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'DELETE',
      ...options
    });
  }

  // Upload file
  async upload(endpoint, file, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add additional fields if provided
    if (options.fields) {
      Object.entries(options.fields).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const headers = this.getHeaders();
    delete headers['Content-Type']; // Let browser set it for FormData

    return this.request(endpoint, {
      method: 'POST',
      body: formData,
      headers,
      ...options
    });
  }

  // Products API
  products = {
    // Get all products
    getAll: (filters = {}) => {
      return this.get('/products', { params: filters });
    },

    // Get product by ID
    getById: (id) => {
      return this.get(`/products/${id}`);
    },

    // Search products
    search: (query, filters = {}) => {
      return this.get('/products', { 
        params: { search: query, ...filters } 
      });
    },

    // Create product (admin only)
    create: (productData) => {
      return this.post('/products', productData);
    },

    // Update product (admin only)
    update: (id, productData) => {
      return this.put(`/products/${id}`, productData);
    },

    // Delete product (admin only)
    delete: (id) => {
      return this.delete(`/products/${id}`);
    }
  };

  // Cart API
  cart = {
    // Get cart contents
    get: () => {
      return this.get('/cart');
    },

    // Add item to cart
    addItem: (productId, quantity = 1) => {
      return this.post('/cart/items', { productId, quantity });
    },

    // Update item quantity
    updateItem: (productId, quantity) => {
      return this.put(`/cart/items/${productId}`, { quantity });
    },

    // Remove item from cart
    removeItem: (productId) => {
      return this.delete(`/cart/items/${productId}`);
    },

    // Clear cart
    clear: () => {
      return this.delete('/cart');
    },

    // Merge guest cart with user cart
    merge: (guestSessionId) => {
      return this.post('/cart/merge', { guestSessionId });
    },

    // Validate cart
    validate: () => {
      return this.get('/cart/validate');
    }
  };

  // Authentication API
  auth = {
    // Login
    login: (email, password) => {
      return this.post('/auth/login', { email, password });
    },

    // Register
    register: (userData) => {
      return this.post('/auth/register', userData);
    },

    // Logout
    logout: () => {
      return this.post('/auth/logout');
    },

    // Verify token
    verify: () => {
      return this.get('/auth/verify');
    },

    // Refresh token
    refresh: () => {
      return this.post('/auth/refresh');
    }
  };

  // User API
  users = {
    // Get user profile
    getProfile: () => {
      return this.get('/users/profile');
    },

    // Update user profile
    updateProfile: (profileData) => {
      return this.put('/users/profile', profileData);
    },

    // Change password
    changePassword: (currentPassword, newPassword) => {
      return this.post('/users/change-password', {
        currentPassword,
        newPassword
      });
    }
  };

  // Orders API
  orders = {
    // Get user orders
    getAll: (filters = {}) => {
      return this.get('/orders', { params: filters });
    },

    // Get order by ID
    getById: (id) => {
      return this.get(`/orders/${id}`);
    },

    // Create order
    create: (orderData) => {
      return this.post('/orders', orderData);
    },

    // Update order status (admin only)
    updateStatus: (id, status) => {
      return this.put(`/orders/${id}/status`, { status });
    }
  };

  // Admin API
  admin = {
    // Analytics
    analytics: {
      getSales: (dateRange = {}) => {
        return this.get('/admin/analytics/sales', { params: dateRange });
      },

      getProducts: (dateRange = {}) => {
        return this.get('/admin/analytics/products', { params: dateRange });
      },

      getCustomers: (dateRange = {}) => {
        return this.get('/admin/analytics/customers', { params: dateRange });
      }
    },

    // Inventory
    inventory: {
      getAll: () => {
        return this.get('/admin/inventory');
      },

      update: (productId, quantity) => {
        return this.put(`/admin/inventory/${productId}`, { quantity });
      },

      bulkUpdate: (updates) => {
        return this.post('/admin/inventory/bulk', { updates });
      }
    },

    // Users
    users: {
      getAll: (filters = {}) => {
        return this.get('/admin/users', { params: filters });
      },

      getById: (id) => {
        return this.get(`/admin/users/${id}`);
      },

      update: (id, userData) => {
        return this.put(`/admin/users/${id}`, userData);
      },

      delete: (id) => {
        return this.delete(`/admin/users/${id}`);
      }
    }
  };

  // Utility methods
  utils = {
    // Health check
    health: () => {
      return this.get('/health');
    },

    // Get server info
    info: () => {
      return this.get('/info');
    }
  };
}

// Custom API Error class
class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }

  // Check if error is due to authentication
  isAuthError() {
    return this.status === 401 || this.status === 403;
  }

  // Check if error is due to validation
  isValidationError() {
    return this.status === 400;
  }

  // Check if error is server error
  isServerError() {
    return this.status >= 500;
  }

  // Check if error is network error
  isNetworkError() {
    return this.status === 0;
  }
}

// Export classes
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ApiClient, ApiError };
}