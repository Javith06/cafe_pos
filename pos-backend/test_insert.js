const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const sql = require('mssql');
const { poolPromise } = require('./db');

(async () => {
  try {
    console.log("\n🧪 Testing minimal INSERT into SettlementHeader...");
    const pool = await poolPromise;
    const settlementId = require('crypto').randomUUID();
    
    const result = await pool.request()
      .input('SettlementID', settlementId)
      .input('LastSettlementDate', new Date())
      .input('SubTotal', 100)
      .input('TotalTax', 10)
      .input('DiscountAmount', 0)
      .input('DiscountType', 'fixed')
      .input('BillNo', '#TEST001')
      .input('OrderId', '#TESTID')
      .input('OrderType', 'DINE-IN')
      .input('TableNo', '1')
      .input('Section', 'Section1')
      .input('MemberId', null)
      .query(`
        INSERT INTO SettlementHeader 
        (SettlementID, LastSettlementDate, SubTotal, TotalTax, DiscountAmount, DiscountType, BillNo, OrderId, OrderType, TableNo, Section, MemberId)
        VALUES 
        (@SettlementID, @LastSettlementDate, @SubTotal, @TotalTax, @DiscountAmount, @DiscountType, @BillNo, @OrderId, @OrderType, @TableNo, @Section, @MemberId)
      `);
    
    console.log("✅ INSERT successful!");
    console.log("   SettlementID:", settlementId);
    process.exit(0);
    
  } catch (err) {
    console.error("❌ INSERT failed!");
    console.error("   Error:", err.message);
    console.error("   Code:", err.code);
    console.error("   LineNumber:", err.lineNumber);
    process.exit(1);
  }
})();
