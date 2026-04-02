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

    // Ensure MemberMaster table exists
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MemberMaster' AND xtype='U')
      CREATE TABLE MemberMaster (
        MemberId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        Name NVARCHAR(255),
        Phone NVARCHAR(20) UNIQUE,
        Email NVARCHAR(255),
        CreditLimit DECIMAL(18,2) DEFAULT 1000,
        CurrentBalance DECIMAL(18,2) DEFAULT 0,
        CreatedAt DATETIME DEFAULT GETDATE()
      )
    `);

    // Add MemberId to SettlementHeader if not exists
    await pool.request().query(`
      IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'MemberId' AND Object_ID = Object_ID(N'SettlementHeader'))
      BEGIN
         ALTER TABLE SettlementHeader ADD MemberId UNIQUEIDENTIFIER;
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

/* ================= TABLES ================= */
app.get("/tables", async (req, res) => {
  try {
    const pool = await poolPromise;
    const { section } = req.query;

    // Map frontend section names to DiningSection values in the DB
    // Section 1=1, Section 2=2, Section 3=3, Takeaway=4
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

    if (section && SECTION_MAP[section] !== undefined) {
      request.input("DiningSection", SECTION_MAP[section]);
      query += ` WHERE DiningSection = @DiningSection`;
    }

    query += ` ORDER BY SortCode`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error("TABLES ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET Locked Tables (Status = 1)
app.get("/api/tables/locked", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT TableId as tableId, TableNumber as tableNumber 
      FROM TableMaster 
      WHERE Status = 1
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lock Table (Persistent)
app.post("/api/tables/lock-persistent", async (req, res) => {
  try {
    const pool = await poolPromise;
    const { tableId } = req.body;
    await pool.request()
      .input("tableId", tableId)
      .query(`UPDATE TableMaster SET Status = 1 WHERE TableId = @tableId`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Unlock Table (Persistent)
app.post("/api/tables/unlock-persistent", async (req, res) => {
  try {
    const pool = await poolPromise;
    const { tableId } = req.body;
    await pool.request()
      .input("tableId", tableId)
      .query(`UPDATE TableMaster SET Status = 0 WHERE TableId = @tableId`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= MEMBERS ================= */
app.get("/api/members", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT * FROM MemberMaster ORDER BY Name");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/members/add", async (req, res) => {
  try {
    const pool = await poolPromise;
    const { name, phone, email, creditLimit } = req.body;
    await pool.request()
      .input("Name", name)
      .input("Phone", phone)
      .input("Email", email)
      .input("CreditLimit", creditLimit || 1000)
      .query(`
        INSERT INTO MemberMaster (Name, Phone, Email, CreditLimit)
        VALUES (@Name, @Phone, @Email, @CreditLimit)
      `);
    res.json({ success: true });
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
    const startOfDay = `${date} 00:00:00`;
    const endOfDay = `${date} 23:59:59`;

    const result = await pool.request()
      .input("StartOfDay", sql.DateTime, startOfDay)
      .input("EndOfDay", sql.DateTime, endOfDay)
      .query(`
        SELECT 
          COUNT(DISTINCT sh.SettlementID) as TotalTransactions,
          ISNULL(SUM(sts.SysAmount), 0) as TotalSales,
          ISNULL(SUM(CASE WHEN sts.PayMode = 'CASH' THEN sts.SysAmount ELSE 0 END), 0) as CashSales,
          ISNULL(SUM(CASE WHEN sts.PayMode = 'NETS' THEN sts.SysAmount ELSE 0 END), 0) as NETS_Sales,
          ISNULL(SUM(CASE WHEN sts.PayMode = 'PAYNOW' THEN sts.SysAmount ELSE 0 END), 0) as PayNow_Sales,
          ISNULL(SUM(CASE WHEN sts.PayMode = 'CARD' THEN sts.SysAmount ELSE 0 END), 0) as CardSales,
          ISNULL(SUM(CASE WHEN sts.PayMode = 'CREDIT' THEN sts.SysAmount ELSE 0 END), 0) as MemberSales,
          ISNULL(SUM(sts.ReceiptCount), 0) as TotalItems
        FROM SettlementHeader sh
        LEFT JOIN SettlementTotalSales sts ON sh.SettlementID = sts.SettlementID
        WHERE sh.LastSettlementDate BETWEEN @StartOfDay AND @EndOfDay
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
      orderId,
      memberId
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
        .input("MemberId", memberId || null)
        .query(`
          INSERT INTO SettlementHeader (SettlementID, LastSettlementDate, SubTotal, TotalTax, DiscountAmount, BillNo, MemberId)
          VALUES (@SettlementID, @Date, @SubTotal, @TotalTax, @DiscountAmount, @BillNo, @MemberId)
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

      // 5. Update Member Balance if it was a Credit sale
      if (memberId && (paymentMethod || '').toUpperCase() === 'CREDIT') {
        await transaction.request()
          .input("MemberId", memberId)
          .input("Amount", totalAmount || 0)
          .query(`
            UPDATE MemberMaster 
            SET CurrentBalance = CurrentBalance + @Amount 
            WHERE MemberId = @MemberId
          `);
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

    console.log(`📊 Fetching transactions: ${startDate} to ${endDate}`);

    const result = await pool.request()
      .input("StartDateParam", sql.VarChar, startDate)
      .input("EndDateParam", sql.VarChar, endDate)
      .query(`
        SELECT
          sh.SettlementID,
          sh.LastSettlementDate AS SettlementDate,
          sh.BillNo,
          ISNULL(sts.PayMode, 'CASH') AS PayMode,
          ISNULL(sts.SysAmount, 0) AS SysAmount,
          ISNULL(sts.ManualAmount, 0) AS ManualAmount,
          ISNULL(sts.ReceiptCount, 0) AS ReceiptCount,
          m.Name as MemberName
        FROM SettlementHeader sh
        LEFT JOIN SettlementTotalSales sts 
          ON sh.SettlementID = sts.SettlementID
        LEFT JOIN MemberMaster m 
          ON sh.MemberId = m.MemberId
        WHERE 
          sh.LastSettlementDate IS NOT NULL
          AND CAST(sh.LastSettlementDate AS DATE) 
              BETWEEN CAST(@StartDateParam AS DATE) 
              AND CAST(@EndDateParam AS DATE)       
        ORDER BY sh.LastSettlementDate DESC
      `);

    console.log(`✅ Transactions found: ${result.recordset.length}`);
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
      .input("StartDate", sql.DateTime, `${startDate} 00:00:00`)
      .input("EndDate", sql.DateTime, `${endDate} 23:59:59`)
      .query(`
        SELECT 
          CAST(sh.LastSettlementDate AS DATE) as SaleDate,
          COUNT(DISTINCT sh.SettlementID) as TotalTransactions,
          SUM(sts.SysAmount) as TotalSales,
          SUM(CASE WHEN sts.PayMode = 'CASH' THEN sts.SysAmount ELSE 0 END) as CashSales,
          SUM(CASE WHEN sts.PayMode = 'NETS' THEN sts.SysAmount ELSE 0 END) as NETS_Sales,
          SUM(CASE WHEN sts.PayMode = 'PAYNOW' THEN sts.SysAmount ELSE 0 END) as PayNow_Sales,
          SUM(CASE WHEN sts.PayMode = 'CARD' THEN sts.SysAmount ELSE 0 END) as CardSales,
          SUM(CASE WHEN sts.PayMode = 'CREDIT' THEN sts.SysAmount ELSE 0 END) as MemberSales
        FROM SettlementHeader sh
        LEFT JOIN SettlementTotalSales sts ON sh.SettlementID = sts.SettlementID
        WHERE sh.LastSettlementDate BETWEEN @StartDate AND @EndDate
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
      .input("Id", sql.UniqueIdentifier, id)
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