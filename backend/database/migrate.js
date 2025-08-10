const fs = require('fs');
const path = require('path');
const database = require('../config/database');

async function runMigrations() {
  try {
    console.log('Starting database migration...');
    
    // Connect to database
    await database.connect();
    
    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`Executing ${statements.length} migration statements...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await database.run(statement);
        console.log(`✓ Statement ${i + 1}/${statements.length} executed successfully`);
      } catch (error) {
        console.error(`✗ Statement ${i + 1}/${statements.length} failed:`, error.message);
        throw error;
      }
    }
    
    // Verify tables were created
    const tables = await database.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
    
    console.log('Created tables:', tables.map(t => t.name).join(', '));
    console.log('Database migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await database.close();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };