import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDb() {
  try {
    const schemaPath = path.join(__dirname, 'sql', 'schema.postgres.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Running schema...');
    await pool.query(sql);
    console.log('Schema applied successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

initDb();
