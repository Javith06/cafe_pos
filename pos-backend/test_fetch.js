const { poolPromise } = require('./db');
require('dotenv').config();

async function checkData() {
  try {
    const pool = await poolPromise;
    
    // Check SettlementHeader
    console.log("--- SettlementHeader (Top 10) ---");
    const headers = await pool.request().query("SELECT TOP 10 * FROM SettlementHeader ORDER BY LastSettlementDate DESC");
    console.table(headers.recordset);

    // Check SettlementTotalSales
    console.log("\n--- SettlementTotalSales (Top 10) ---");
    const sales = await pool.request().query("SELECT TOP 10 * FROM SettlementTotalSales ORDER BY SettlementID DESC");
    console.table(sales.recordset);

    process.exit(0);
  } catch (err) {
    console.error("DB Error:", err);
    process.exit(1);
  }
}

checkData();
