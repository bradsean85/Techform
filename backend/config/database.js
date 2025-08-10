const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/ecommerce.db');

class Database {
  constructor() {
    this.db = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error connecting to database:', err.message);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          resolve(this.db);
        }
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Transaction support
  async beginTransaction() {
    return await this.run('BEGIN TRANSACTION');
  }

  async commit() {
    return await this.run('COMMIT');
  }

  async rollback() {
    return await this.run('ROLLBACK');
  }

  // Execute multiple queries in a transaction
  async transaction(queries) {
    try {
      await this.beginTransaction();
      
      const results = [];
      for (const query of queries) {
        const result = await this.run(query.sql, query.params);
        results.push(result);
      }
      
      await this.commit();
      return results;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }

  // Helper method for INSERT OR UPDATE operations
  async upsert(table, data, conflictColumns) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');
    
    let sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    
    if (conflictColumns && conflictColumns.length > 0) {
      const updateClauses = columns
        .filter(col => !conflictColumns.includes(col))
        .map(col => `${col} = excluded.${col}`)
        .join(', ');
      
      if (updateClauses) {
        sql += ` ON CONFLICT(${conflictColumns.join(', ')}) DO UPDATE SET ${updateClauses}`;
      }
    }
    
    return await this.run(sql, values);
  }

  // Helper method for batch inserts
  async batchInsert(table, records) {
    if (!records || records.length === 0) {
      return [];
    }

    const columns = Object.keys(records[0]);
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    
    const results = [];
    for (const record of records) {
      const values = columns.map(col => record[col]);
      const result = await this.run(sql, values);
      results.push(result);
    }
    
    return results;
  }

  // Helper method for counting records
  async count(table, whereClause = '', params = []) {
    const sql = `SELECT COUNT(*) as count FROM ${table}${whereClause ? ' WHERE ' + whereClause : ''}`;
    const result = await this.get(sql, params);
    return result ? result.count : 0;
  }

  // Helper method for checking if record exists
  async exists(table, whereClause, params = []) {
    const count = await this.count(table, whereClause, params);
    return count > 0;
  }

  // Helper method for pagination
  async paginate(sql, params = [], page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const paginatedSql = `${sql} LIMIT ? OFFSET ?`;
    const paginatedParams = [...params, limit, offset];
    
    const rows = await this.all(paginatedSql, paginatedParams);
    
    // Get total count for pagination info
    const countSql = sql.replace(/SELECT .+ FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await this.get(countSql, params);
    const total = countResult ? countResult.total : 0;
    
    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }
}

module.exports = new Database();