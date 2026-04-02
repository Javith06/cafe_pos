const { poolPromise } = require('./db');
require('dotenv').config();

async function checkDates() {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT TOP 5 SettlementID, LastSettlementDate FROM SettlementHeader ORDER BY LastSettlementDate DESC");
    console.log("Recent dates in DB:");
    result.recordset.forEach(row => {
      console.log(`ID: ${row.SettlementID}, Date: ${row.LastSettlementDate} (${typeof row.LastSettlementDate})`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDates();
