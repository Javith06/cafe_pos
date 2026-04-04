const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { poolPromise } = require('./db');

(async () => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'SettlementHeader' 
      AND (IS_NULLABLE = 'NO' OR COLUMN_DEFAULT IS NULL)
      ORDER BY ORDINAL_POSITION
    `);
    console.log('SettlementHeader required columns (no defaults/not nullable):');
    result.recordset.forEach(r => {
      const nullable = r.IS_NULLABLE === 'YES' ? 'nullable' : 'NOT NULL';
      const deflt = r.COLUMN_DEFAULT ? `(default: ${r.COLUMN_DEFAULT})` : '(no default)';
      console.log(`  - ${r.COLUMN_NAME}: ${nullable} ${deflt}`);
    });
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
