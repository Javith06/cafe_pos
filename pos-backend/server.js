require("dotenv").config();

const express = require("express");
const cors = require("cors");
const sql = require("mssql");
const { poolPromise } = require("./db");

const app = express();

const PORT = process.env.PORT || 3000;

console.log("PORT:", PORT);
console.log("DB_SERVER:", process.env.DB_SERVER);

// ✅ Increase timeout for all requests
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 seconds
  res.setTimeout(30000);
  next();
});

// ✅ CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

/* ================= ROOT ================= */
app.get("/", (req, res) => {
  res.send("POS Backend Running");
});

/* ================= TEST ================= */
app.get("/test", (req, res) => {
  res.send("TEST OK");
});

/* ================= TABLES ================= */
app.get("/tables", async (req, res) => {
  try {
    console.log("📊 Fetching tables...");
    const pool = await poolPromise;
    
    // 🔥 Optimized query - no ORDER BY for speed
    const result = await pool.request().query(`
      SELECT 
        TableId AS id,
        TableNumber AS label,
        DiningSection
      FROM TableMaster
    `);
    
    console.log(`✅ Found ${result.recordset.length} tables`);
    
    // Sort in memory (faster than SQL ORDER BY sometimes)
    const tables = result.recordset.sort((a, b) => {
      const numA = parseInt(a.label) || 0;
      const numB = parseInt(b.label) || 0;
      return numA - numB;
    });
    
    // Add cache control headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.json(tables);
    
  } catch (err) {
    console.error("❌ TABLES ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= KITCHENS ================= */
app.get("/kitchens", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        CategoryId,             
        CategoryName AS KitchenTypeName
      FROM CategoryMaster
      WHERE IsActive = 1
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("KITCHEN ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= DISH GROUPS ================= */
app.get("/dishgroups/:CategoryId", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("CategoryId", req.params.CategoryId)
      .query(`
        SELECT 
          a.DishGroupId,
          a.DishGroupName
        FROM DishGroupMaster a
        JOIN CategoryMaster b 
          ON a.CategoryId = b.CategoryId
        WHERE a.CategoryId = @CategoryId
          AND a.IsActive = 1
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error("DISH GROUP ERROR:", err);
    res.status(500).send(err.message);
  }
});

/* ================= DISHES ================= */
app.get("/dishes/:DishGroupId", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("DishGroupId", req.params.DishGroupId)
      .query(`
        SELECT
          d.DishId,
          d.Name,
          d.DishGroupId,
          ISNULL(p.Amount, 0) AS Price,
          CASE 
            WHEN i.ImageData IS NOT NULL THEN
              'data:image/jpeg;base64,' + 
              CAST('' AS XML).value(
                'xs:base64Binary(sql:column("i.ImageData"))',
                'VARCHAR(MAX)'
              )
            ELSE NULL
          END AS ImageBase64
        FROM DishMaster d
        INNER JOIN DishPriceList p 
          ON d.DishId = p.DishId
        LEFT JOIN ImageList i 
          ON d.Imageid = i.Imageid
        WHERE d.IsActive = 1
        AND d.DishGroupId = @DishGroupId
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error("DISH ERROR:", err);
    res.status(500).send(err.message);
  }
});

/* ================= MODIFIERS ================= */
app.get("/modifiers/:dishId", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("dishId", req.params.dishId)
      .query(`
        SELECT 
          dm.DishId,
          dm.ModifierId AS ModifierID,
          m.ModifierName,
          TRY_CAST(REPLACE(m.ModifierName, '$', '') AS FLOAT) AS Price
        FROM DishModifier dm 
        INNER JOIN ModifierMaster m 
          ON dm.ModifierId = m.ModifierId
        WHERE dm.DishId = @dishId
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error("MODIFIER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= SALES REPORT APIs ================= */

// API 1: Get all sales
app.get("/api/sales/all", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        sh.SettlementID,
        sh.LastSettlementDate AS SettlementDate,
        sts.PayMode,
        sts.SysAmount,
        sts.ManualAmount,
        sts.ReceiptCount
      FROM SettlementHeader sh
      INNER JOIN SettlementTotalSales sts ON sh.SettlementID = sts.SettlementID
      ORDER BY sh.LastSettlementDate DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("SALES ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// API 2: Get daily summary
app.get("/api/sales/daily/:date", async (req, res) => {
  try {
    const pool = await poolPromise;
    const { date } = req.params;
    
    const result = await pool.request()
      .input("Date", sql.Date, date)
      .query(`
        SELECT 
          COUNT(DISTINCT sh.SettlementID) as TotalTransactions,
          SUM(sts.SysAmount) as TotalSales,
          SUM(CASE WHEN sts.PayMode = 'CASH' THEN sts.SysAmount ELSE 0 END) as CashSales,
          SUM(CASE WHEN sts.PayMode = 'NETS' THEN sts.SysAmount ELSE 0 END) as NETS_Sales,
          SUM(CASE WHEN sts.PayMode = 'PAYNOW' THEN sts.SysAmount ELSE 0 END) as PayNow_Sales,
          SUM(sts.ReceiptCount) as TotalItems
        FROM SettlementHeader sh
        INNER JOIN SettlementTotalSales sts ON sh.SettlementID = sts.SettlementID
        WHERE CAST(sh.LastSettlementDate AS DATE) = @Date
      `);
    res.json(result.recordset[0] || {});
  } catch (err) {
    console.error("DAILY SUMMARY ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// API 3: Get sales by date range
app.get("/api/sales/range", async (req, res) => {
  try {
    const pool = await poolPromise;
    const { startDate, endDate } = req.query;
    
    const result = await pool.request()
      .input("StartDate", sql.Date, startDate)
      .input("EndDate", sql.Date, endDate)
      .query(`
        SELECT 
          CAST(sh.LastSettlementDate AS DATE) as SaleDate,
          COUNT(DISTINCT sh.SettlementID) as TotalTransactions,
          SUM(sts.SysAmount) as TotalSales,
          SUM(CASE WHEN sts.PayMode = 'CASH' THEN sts.SysAmount ELSE 0 END) as CashSales,
          SUM(CASE WHEN sts.PayMode = 'NETS' THEN sts.SysAmount ELSE 0 END) as NETS_Sales,
          SUM(CASE WHEN sts.PayMode = 'PAYNOW' THEN sts.SysAmount ELSE 0 END) as PayNow_Sales
        FROM SettlementHeader sh
        INNER JOIN SettlementTotalSales sts ON sh.SettlementID = sts.SettlementID
        WHERE CAST(sh.LastSettlementDate AS DATE) BETWEEN @StartDate AND @EndDate
        GROUP BY CAST(sh.LastSettlementDate AS DATE)
        ORDER BY SaleDate DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error("RANGE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= SAVE SALE API ================= */
app.post("/api/sales/save", async (req, res) => {
  try {
    const pool = await poolPromise;
    const {
      orderId,
      orderType,
      tableNo,
      section,
      items,
      subTotal,
      taxAmount,
      discountAmount,
      totalAmount,
      paymentMethod,
      cashierId
    } = req.body;

    const crypto = require('crypto');
    const settlementId = crypto.randomUUID();
    const businessUnitId = "FBFD4E31-5C91-4DEC-86EA-989D3B5639CA";

    // Start transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Insert into SettlementHeader
      await transaction.request()
        .input("SettlementID", sql.UniqueIdentifier, settlementId)
        .input("CashierID", sql.UniqueIdentifier, cashierId || "FFA46DDA-2871-42BB-BE6D-A547AE9C1B88")
        .input("BusinessUnitID", sql.UniqueIdentifier, businessUnitId)
        .input("Shift", sql.Numeric, 1)
        .input("TerminalCode", sql.VarChar, "SR")
        .input("LastSettlementDate", sql.DateTime, new Date())
        .input("SysAmount", sql.Money, totalAmount)
        .input("ManualAmount", sql.Money, totalAmount)
        .query(`
          INSERT INTO SettlementHeader 
          (SettlementID, CashierID, BusinessUnitID, Shift, TerminalCode, LastSettlementDate, SysAmount, ManualAmount)
          VALUES 
          (@SettlementID, @CashierID, @BusinessUnitID, @Shift, @TerminalCode, @LastSettlementDate, @SysAmount, @ManualAmount)
        `);

      // Insert into SettlementTotalSales
      await transaction.request()
        .input("SettlementID", sql.UniqueIdentifier, settlementId)
        .input("PayMode", sql.VarChar, paymentMethod || "CASH")
        .input("SysAmount", sql.Money, totalAmount)
        .input("ManualAmount", sql.Money, totalAmount)
        .input("ReceiptCount", sql.Numeric, items?.length || 1)
        .query(`
          INSERT INTO SettlementTotalSales 
          (SettlementID, PayMode, SysAmount, ManualAmount, ReceiptCount)
          VALUES 
          (@SettlementID, @PayMode, @SysAmount, @ManualAmount, @ReceiptCount)
        `);

      await transaction.commit();
      console.log("✅ Sale saved:", settlementId);
      res.json({ success: true, settlementId });

    } catch (err) {
      await transaction.rollback();
      throw err;
    }

  } catch (err) {
    console.error("SAVE SALE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= SERVER ================= */
console.log("🚀 Starting server...");

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});