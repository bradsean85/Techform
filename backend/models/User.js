const database = require('../config/database');
const bcrypt = require('bcrypt');

class User {
  constructor(data = {}) {
    this.id = data.id;
    this.email = data.email;
    this.password = data.password;
    this.firstName = data.first_name;
    this.lastName = data.last_name;
    this.phone = data.phone;
    this.isAdmin = data.is_admin;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // Create or update user
  async save() {
    try {
      if (this.id) {
        // Update existing user
        const result = await database.run(`
          UPDATE users 
          SET email = ?, first_name = ?, last_name = ?, phone = ?, 
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [this.email, this.firstName, this.lastName, this.phone, this.id]);
        return result.changes > 0;
      } else {
        // Create new user
        const result = await database.run(`
          INSERT INTO users (email, password, first_name, last_name, phone, is_admin)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [this.email, this.password, this.firstName, this.lastName, this.phone, this.isAdmin || 0]);
        this.id = result.id;
        return true;
      }
    } catch (error) {
      throw new Error(`Failed to save user: ${error.message}`);
    }
  }

  // Find user by ID
  static async findById(id) {
    try {
      const row = await database.get('SELECT * FROM users WHERE id = ?', [id]);
      return row ? new User(row) : null;
    } catch (error) {
      throw new Error(`Failed to find user: ${error.message}`);
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      const row = await database.get('SELECT * FROM users WHERE email = ?', [email]);
      return row ? new User(row) : null;
    } catch (error) {
      throw new Error(`Failed to find user by email: ${error.message}`);
    }
  }

  // Find all users
  static async findAll(filters = {}) {
    try {
      let sql = 'SELECT * FROM users WHERE 1=1';
      const params = [];

      if (filters.isAdmin !== undefined) {
        sql += ' AND is_admin = ?';
        params.push(filters.isAdmin);
      }

      if (filters.search) {
        sql += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
      }

      sql += ' ORDER BY created_at DESC';

      if (filters.limit) {
        sql += ' LIMIT ?';
        params.push(filters.limit);
      }

      const rows = await database.all(sql, params);
      return rows.map(row => new User(row));
    } catch (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
  }

  // Create user with hashed password
  static async create(userData) {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = new User({
        email: userData.email,
        password: hashedPassword,
        first_name: userData.firstName,
        last_name: userData.lastName,
        phone: userData.phone,
        is_admin: userData.isAdmin || 0
      });
      await user.save();
      return user;
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  // Verify password
  async verifyPassword(password) {
    try {
      return await bcrypt.compare(password, this.password);
    } catch (error) {
      throw new Error(`Failed to verify password: ${error.message}`);
    }
  }

  // Update password
  async updatePassword(newPassword) {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const result = await database.run(`
        UPDATE users 
        SET password = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [hashedPassword, this.id]);
      
      if (result.changes > 0) {
        this.password = hashedPassword;
        return true;
      }
      return false;
    } catch (error) {
      throw new Error(`Failed to update password: ${error.message}`);
    }
  }

  // Delete user
  async delete() {
    try {
      if (!this.id) {
        throw new Error('Cannot delete user without ID');
      }
      const result = await database.run('DELETE FROM users WHERE id = ?', [this.id]);
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  // Get user addresses
  async getAddresses() {
    try {
      const rows = await database.all(`
        SELECT * FROM user_addresses 
        WHERE user_id = ? 
        ORDER BY is_default DESC, created_at DESC
      `, [this.id]);
      return rows;
    } catch (error) {
      throw new Error(`Failed to get user addresses: ${error.message}`);
    }
  }

  // Add address
  async addAddress(addressData) {
    try {
      const result = await database.run(`
        INSERT INTO user_addresses (user_id, street, city, state, zip_code, country, is_default)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        this.id,
        addressData.street,
        addressData.city,
        addressData.state,
        addressData.zipCode,
        addressData.country || 'US',
        addressData.isDefault || 0
      ]);
      
      // If this is set as default, unset other defaults
      if (addressData.isDefault) {
        await database.run(`
          UPDATE user_addresses 
          SET is_default = 0 
          WHERE user_id = ? AND id != ?
        `, [this.id, result.id]);
      }
      
      return result.id;
    } catch (error) {
      throw new Error(`Failed to add address: ${error.message}`);
    }
  }

  // Update address
  async updateAddress(addressId, addressData) {
    try {
      const result = await database.run(`
        UPDATE user_addresses 
        SET street = ?, city = ?, state = ?, zip_code = ?, country = ?, is_default = ?
        WHERE id = ? AND user_id = ?
      `, [
        addressData.street,
        addressData.city,
        addressData.state,
        addressData.zipCode,
        addressData.country || 'US',
        addressData.isDefault || 0,
        addressId,
        this.id
      ]);
      
      // If this is set as default, unset other defaults
      if (addressData.isDefault) {
        await database.run(`
          UPDATE user_addresses 
          SET is_default = 0 
          WHERE user_id = ? AND id != ?
        `, [this.id, addressId]);
      }
      
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Failed to update address: ${error.message}`);
    }
  }

  // Delete address
  async deleteAddress(addressId) {
    try {
      const result = await database.run(`
        DELETE FROM user_addresses 
        WHERE id = ? AND user_id = ?
      `, [addressId, this.id]);
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Failed to delete address: ${error.message}`);
    }
  }

  // Convert to JSON (for API responses) - exclude password
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      phone: this.phone,
      isAdmin: Boolean(this.isAdmin),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Get full name
  get fullName() {
    return `${this.firstName} ${this.lastName}`.trim();
  }
}

module.exports = User;