require("dotenv").config();

const express = require("express");
const cors = require("cors");
const sql = require("mssql");
const { poolPromise } = require("./db");

const app = express();

const PORT = process.env.PORT || 3000;

/* ================= INITIALIZATION ================= */

const initDB = async () => {
  try {
    const pool = await poolPromise;

    // Ensure our custom table exists for detailed reports
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SettlementItemDetail' AND xtype='U')
      CREATE TABLE SettlementItemDetail (
        SettlementID UNIQUEIDENTIFIER,
        DishName NVARCHAR(255),
        Qty INT,
        Price DECIMAL(18,2),
        OrderDateTime DATETIME DEFAULT GETDATE()
      )
    `);

    // Ensure SettlementHeader has a BillNo string column to store random IDs (e.g., #A996E780)
    await pool.request().query(`
      IF EXISTS(SELECT * FROM sys.columns WHERE Name = N'BillNo' AND Object_ID = Object_ID(N'SettlementHeader') AND system_type_id = 56) -- 56 is INT
      BEGIN
         ALTER TABLE SettlementHeader ALTER COLUMN BillNo NVARCHAR(50);
      END
      ELSE IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'BillNo' AND Object_ID = Object_ID(N'SettlementHeader'))
      BEGIN
         ALTER TABLE SettlementHeader ADD BillNo NVARCHAR(50);
      END
    `);

    console.log("✅ Database initialized: SettlementItemDetail and BillNo column ready.");
  } catch (err) {
    console.error("❌ DB Initialization Error:", err);
  }
};
initDB();

// Helper to generate a random 8-character hex ID (e.g. A996E780)
const generateRandomBillId = () => {
  return Math.random().toString(16).slice(2, 10).toUpperCase();
};

console.log("PORT:", PORT);
console.log("DB_SERVER:", process.env.DB_SERVER);

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

/* ================= IN-MEMORY TABLE LOCKS ================= */
// Stores { tableId: { lockedBy: string, lockedAt: number } }
const tableLocks = new Map();

// Clear old locks every minute (e.g. older than 30 mins)
setInterval(() => {
  const now = Date.now();
  for (const [tableId, lock] of tableLocks.entries()) {
    if (now - lock.lockedAt > 30 * 60 * 1000) {
      tableLocks.delete(tableId);
    }
  }
}, 60 * 1000);

// Get a lock on a table
app.post("/api/tables/lock", (req, res) => {
  const { tableId, userId } = req.body;
  if (!tableId || !userId) return res.status(400).json({ error: "Missing parameters" });

  const existingLock = tableLocks.get(tableId);
  if (existingLock && existingLock.lockedBy !== userId) {
    return res.status(409).json({ success: false, message: "Table is heavily occupied by another user.", lockedBy: existingLock.lockedBy });
  }

  tableLocks.set(tableId, { lockedBy: userId, lockedAt: Date.now() });
  res.json({ success: true });
});

// Release lock
app.post("/api/tables/unlock", (req, res) => {
  const { tableId, userId } = req.body;
  const existingLock = tableLocks.get(tableId);

  // Only the person who locked it, or an admin can unlock it (for simplicity, we let the frontend request unlock)
  if (existingLock && existingLock.lockedBy === userId) {
    tableLocks.delete(tableId);
  }
  res.json({ success: true });
});

// Get all locks (for dashboard)
app.get("/api/tables/locks", (req, res) => {
  const locks = {};
  for (const [key, value] of tableLocks.entries()) {
    locks[key] = value.lockedBy;
  }
  res.json(locks);
});

/* ================= SECTIONS ================= */
app.get("/api/sections", async (req, res) => {
  try {
    const pool = await poolPromise;
    // Get all distinct DiningSection values. Provide an auto-label if desired
    const result = await pool.request().query(`
      SELECT DISTINCT DiningSection AS id,
      CASE 
        WHEN DiningSection = 4 THEN 'Takeaway'
        ELSE CONCAT('Section ', DiningSection)
      END AS name
      FROM TableMaster
      WHERE DiningSection IS NOT NULL
      ORDER BY DiningSection
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("SECTIONS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= TABLES ================= */
app.get("/tables", async (req, res) => {
  try {
    const pool = await poolPromise;
    const { section } = req.query;

    // Map string section keys (sent by frontend) to DiningSection numeric IDs
    const SECTION_MAP = {
      SECTION_1: 1,
      SECTION_2: 2,
      SECTION_3: 3,
      TAKEAWAY: 4,
    };

    let query = `
      SELECT
        TableId AS id,
        TableNumber AS label,
        DiningSection
      FROM TableMaster
    `;

    const request = pool.request();

    if (section) {
      let sectionNum = null;
      if (SECTION_MAP[section] !== undefined) {
        // String key like "SECTION_1"
        sectionNum = SECTION_MAP[section];
      } else if (!isNaN(Number(section))) {
        // Numeric ID fallback
        sectionNum = Number(section);
      }
      if (sectionNum !== null) {
        request.input("DiningSection", sectionNum);
        query += ` WHERE DiningSection = @DiningSection`;
      }
    }

    query += ` ORDER BY SortCode`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error("TABLES ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/testdb", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%Section%' OR TABLE_NAME LIKE '%Dining%'");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/schema", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES");
    res.json(result.recordset);
  } catch (err) {
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
    console.log("📊 Fetching all sales...");

    const result = await pool.request().query(`
      SELECT 
        sh.SettlementID,
        sh.LastSettlementDate AS SettlementDate,
        sh.BillNo,
        ISNULL(sts.PayMode, 'CASH') as PayMode,
        ISNULL(sts.SysAmount, 0) as SysAmount,
        ISNULL(sts.ManualAmount, 0) as ManualAmount,
        ISNULL(sts.ReceiptCount, 0) as ReceiptCount
      FROM SettlementHeader sh
      LEFT JOIN SettlementTotalSales sts ON sh.SettlementID = sts.SettlementID
      ORDER BY sh.LastSettlementDate DESC
    `);

    console.log(`✅ Found ${result.recordset.length} sales records.`);
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

// API 3: Save new sale
app.post("/api/sales/save", async (req, res) => {
  try {
    const pool = await poolPromise;
    const {
      totalAmount,
      paymentMethod,
      items,
      subTotal,
      taxAmount,
      discountAmount,
      orderId
    } = req.body;

    console.log("Saving sale for Order:", orderId);

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Generate Settlement ID and Random Bill No
      const settlementIdResult = await transaction.request().query(`SELECT NEWID() AS id`);
      const settlementId = settlementIdResult.recordset[0].id;
      const billNo = generateRandomBillId();

      console.log(`📝 Processing Sale: Bill #${billNo} (ID: ${settlementId})`);

      // 2. Insert into SettlementHeader
      await transaction.request()
        .input("SettlementID", settlementId)
        .input("Date", new Date())
        .input("SubTotal", subTotal || 0)
        .input("TotalTax", taxAmount || 0)
        .input("DiscountAmount", discountAmount || 0)
        .input("BillNo", billNo)
        .query(`
          INSERT INTO SettlementHeader (SettlementID, LastSettlementDate, SubTotal, TotalTax, DiscountAmount, BillNo)
          VALUES (@SettlementID, @Date, @SubTotal, @TotalTax, @DiscountAmount, @BillNo)
        `);

      // 3. Insert into SettlementTotalSales
      const itemCount = items ? items.length : 0;
      await transaction.request()
        .input("SettlementID", settlementId)
        .input("PayMode", (paymentMethod || 'CASH').toUpperCase())
        .input("SysAmount", totalAmount || 0)
        .input("ManualAmount", totalAmount || 0)
        .input("AmountDiff", 0)
        .input("ReceiptCount", itemCount)
        .query(`
          INSERT INTO SettlementTotalSales (SettlementID, PayMode, SysAmount, ManualAmount, AmountDiff, ReceiptCount)
          VALUES (@SettlementID, @PayMode, @SysAmount, @ManualAmount, @AmountDiff, @ReceiptCount)
        `);

      // 4. Insert individual dishes into SettlementItemDetail
      if (items && Array.isArray(items)) {
        for (const item of items) {
          const name = item.dish_name || item.DishName || item.name || "Unknown Item";
          const qty = item.qty || item.Qty || item.quantity || 1;
          const price = item.price || item.Price || 0;

          await transaction.request()
            .input("SettlementID", settlementId)
            .input("DishName", name)
            .input("Qty", qty)
            .input("Price", price)
            .query(`
              INSERT INTO SettlementItemDetail (SettlementID, DishName, Qty, Price)
              VALUES (@SettlementID, @DishName, @Qty, @Price)
            `);
        }
      }

      await transaction.commit();

      // Auto-unlock the table if it was locked.
      if (orderId) {
        tableLocks.delete(orderId);
      }

      console.log("✅ Sale saved successfully:", settlementId, "Bill No:", billNo);
      res.json({ success: true, settlementId, billNo });
    } catch (err) {
      if (transaction) await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("SAVE SALE ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API 4: Get individual transactions by date range (used by the sales table)
app.get("/api/sales/transactions", async (req, res) => {
  try {
    const pool = await poolPromise;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required" });
    }

    const result = await pool.request()
      .input("StartDate", sql.Date, startDate)
      .input("EndDate", sql.Date, endDate)
      .query(`
        SELECT
          sh.SettlementID,
          sh.LastSettlementDate AS SettlementDate,
          sh.BillNo,
          ISNULL(sts.PayMode, 'CASH') AS PayMode,
          ISNULL(sts.SysAmount, 0) AS SysAmount,
          ISNULL(sts.ManualAmount, 0) AS ManualAmount,
          ISNULL(sts.ReceiptCount, 0) AS ReceiptCount
        FROM SettlementHeader sh
        LEFT JOIN SettlementTotalSales sts ON sh.SettlementID = sts.SettlementID
        WHERE CAST(sh.LastSettlementDate AS DATE) BETWEEN @StartDate AND @EndDate
        ORDER BY sh.LastSettlementDate DESC
      `);

    console.log(`✅ Transactions: ${result.recordset.length} rows for ${startDate} → ${endDate}`);
    res.json(result.recordset);
  } catch (err) {
    console.error("TRANSACTIONS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// API 4b: Get daily/range summary aggregates
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

// API 5: Get settlement details (items eaten)
app.get("/api/sales/detail/:id", async (req, res) => {
  try {
    const pool = await poolPromise;
    const { id } = req.params;

    const result = await pool.request()
      .input("Id", id)
      .query(`
        SELECT 
          DishName,
          Qty,
          Price
        FROM SettlementItemDetail
        WHERE SettlementID = @Id
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error("DETAIL ERROR:", err);
    res.json([]);
  }
});

/* ================= SERVER ================= */
console.log("🚀 Starting server...");

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});