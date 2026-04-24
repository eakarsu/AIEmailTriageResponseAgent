const pool = require('./database');

const runMigrations = async () => {
  const migrations = [
    // Add AI analysis columns to emails table
    `ALTER TABLE emails ADD COLUMN IF NOT EXISTS sentiment VARCHAR(50)`,
    `ALTER TABLE emails ADD COLUMN IF NOT EXISTS sentiment_confidence INTEGER`,
    `ALTER TABLE emails ADD COLUMN IF NOT EXISTS sentiment_tone TEXT`,
    `ALTER TABLE emails ADD COLUMN IF NOT EXISTS action_items JSONB`,
    `ALTER TABLE emails ADD COLUMN IF NOT EXISTS summary TEXT`
  ];

  console.log('Running migrations...');

  for (const migration of migrations) {
    try {
      await pool.query(migration);
      console.log('Migration executed:', migration.substring(0, 60) + '...');
    } catch (error) {
      // Ignore errors for columns that already exist
      if (!error.message.includes('already exists')) {
        console.error('Migration error:', error.message);
      }
    }
  }

  console.log('Migrations completed');
};

module.exports = { runMigrations };
