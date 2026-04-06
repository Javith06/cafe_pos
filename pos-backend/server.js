const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const sql = require("mssql");
const { poolPromise } = require("./db");

const app = express();

const PORT = process.env.PORT || 3000;

/* ================= INITIALIZATION ================= */

let pool = null;

const initDB = async (maxRetries = 3, retryDelay = 3000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Database Connection Attempt ${attempt}/${maxRetries}...`);
      pool = await poolPromise;
      
      if (!pool) {
        throw new Error("Pool connection failed - pool is undefined");
      }

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
        IF NOT EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='SettlementHeader' AND COLUMN_NAME='BillNo')
           ALTER TABLE SettlementHeader ADD BillNo NVARCHAR(50);
      `);

      // Ensure MemberMaster table exists
      // Ensure MemberMaster table exists with correct schema
      await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MemberMaster' AND xtype='U')
        BEGIN
          CREATE TABLE MemberMaster (
            MemberId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
            Name NVARCHAR(255),
            Phone NVARCHAR(20) UNIQUE,
            Email NVARCHAR(255),
            CreditLimit DECIMAL(18,2) DEFAULT 1000,
            CurrentBalance DECIMAL(18,2) DEFAULT 0,
            Balance DECIMAL(18,2) DEFAULT 0,
            CreatedAt DATETIME DEFAULT GETDATE()
          );
        END
      `);

      // 1. Check if we need to migrate MemberId from INT to UNIQUEIDENTIFIER (if empty)
      const mmCount = await pool.request().query("SELECT COUNT(*) as cnt FROM MemberMaster");
      const isMMEmpty = mmCount.recordset[0].cnt === 0;
      
      const idType = await pool.request().query(`
        SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'MemberMaster' AND COLUMN_NAME = 'MemberId'
      `);
      
      if (isMMEmpty && idType.recordset[0]?.DATA_TYPE === 'int') {
        console.log("🔄 Migrating MemberMaster schema (Type: int -> UNIQUEIDENTIFIER)...");
        await pool.request().query(`
          DROP TABLE MemberMaster;
          CREATE TABLE MemberMaster (
            MemberId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
            Name NVARCHAR(255),
            Phone NVARCHAR(20) UNIQUE,
            Email NVARCHAR(255),
            CreditLimit DECIMAL(18,2) DEFAULT 1000,
            CurrentBalance DECIMAL(18,2) DEFAULT 0,
            Balance DECIMAL(18,2) DEFAULT 0,
            CreatedAt DATETIME DEFAULT GETDATE()
          );
        `);
      }

      // 2. Ensure individual columns exist if they weren't created above
      const columnsToAdd = [
        { name: "Email", type: "NVARCHAR(255) NULL" },
        { name: "CreatedAt", type: "DATETIME DEFAULT GETDATE()" },
        { name: "CreditLimit", type: "DECIMAL(18,2) DEFAULT 1000" },
        { name: "CurrentBalance", type: "DECIMAL(18,2) DEFAULT 0" },
        { name: "Balance", type: "DECIMAL(18,2) DEFAULT 0" }
      ];

      for (const col of columnsToAdd) {
        await pool.request().query(`
          IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MemberMaster' AND COLUMN_NAME = '${col.name}')
            ALTER TABLE MemberMaster ADD ${col.name} ${col.type};
        `);
      }

      // 3. Synchronize Balance and CurrentBalance (Only works because columns now exist in separate batches)
      await pool.request().query(`
        IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MemberMaster' AND COLUMN_NAME = 'Balance')
        AND EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MemberMaster' AND COLUMN_NAME = 'CurrentBalance')
        BEGIN
          -- Sync CurrentBalance from Balance if CurrentBalance is 0
          UPDATE MemberMaster SET CurrentBalance = Balance 
          WHERE (CurrentBalance IS NULL OR CurrentBalance = 0) AND Balance IS NOT NULL AND Balance != 0;
          
          -- Sync Balance from CurrentBalance if Balance is 0
          UPDATE MemberMaster SET Balance = CurrentBalance 
          WHERE (Balance IS NULL OR Balance = 0) AND CurrentBalance IS NOT NULL AND CurrentBalance != 0;
        END
      `);

      // Add MemberId to SettlementHeader if not exists
      await pool.request().query(`
        IF NOT EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='SettlementHeader' AND COLUMN_NAME='MemberId')
           ALTER TABLE SettlementHeader ADD MemberId UNIQUEIDENTIFIER;
      `);

      // Add OrderId column to track the order number
      await pool.request().query(`
        IF NOT EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='SettlementHeader' AND COLUMN_NAME='OrderId')
           ALTER TABLE SettlementHeader ADD OrderId NVARCHAR(50);
      `);

      // Add OrderType column (DINE-IN or TAKEAWAY)
      await pool.request().query(`
        IF NOT EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='SettlementHeader' AND COLUMN_NAME='OrderType')
           ALTER TABLE SettlementHeader ADD OrderType NVARCHAR(50);
      `);

      // Add TableNo column for dine-in tracking
      await pool.request().query(`
        IF NOT EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='SettlementHeader' AND COLUMN_NAME='TableNo')
           ALTER TABLE SettlementHeader ADD TableNo NVARCHAR(50);
      `);

      // Add Section column for location tracking
      await pool.request().query(`
        IF NOT EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='SettlementHeader' AND COLUMN_NAME='Section')
           ALTER TABLE SettlementHeader ADD Section NVARCHAR(100);
      `);

      // Add CashierId column for cashier tracking
      await pool.request().query(`
        IF NOT EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='SettlementHeader' AND COLUMN_NAME='CashierId')
           ALTER TABLE SettlementHeader ADD CashierId NVARCHAR(100);
      `);

      // Add cancellation tracking columns
      await pool.request().query(`
        IF NOT EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='SettlementHeader' AND COLUMN_NAME='IsCancelled')
           ALTER TABLE SettlementHeader ADD IsCancelled BIT DEFAULT 0;
      `);

      await pool.request().query(`
        IF NOT EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='SettlementHeader' AND COLUMN_NAME='CancellationReason')
           ALTER TABLE SettlementHeader ADD CancellationReason NVARCHAR(500);
      `);

      await pool.request().query(`
        IF NOT EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='SettlementHeader' AND COLUMN_NAME='CancelledBy')
           ALTER TABLE SettlementHeader ADD CancelledBy NVARCHAR(100);
      `);

      await pool.request().query(`
        IF NOT EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='SettlementHeader' AND COLUMN_NAME='CancelledDate')
           ALTER TABLE SettlementHeader ADD CancelledDate DATETIME;
      `);

      // Add discount type tracking column
      await pool.request().query(`
        IF NOT EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='SettlementHeader' AND COLUMN_NAME='DiscountType')
           ALTER TABLE SettlementHeader ADD DiscountType NVARCHAR(50);
      `);

      // Add UNIQUE constraint on OrderId to prevent duplicates
      // First clean up any old duplicate OrderIds from the sequential system (1001, 1002, etc.)
      await pool.request().query(`
        DELETE FROM SettlementHeader 
        WHERE OrderId IS NOT NULL 
        AND OrderId LIKE '[0-9][0-9][0-9][0-9]'
        AND LEN(OrderId) = 4;
      `);

      await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('SettlementHeader') AND name = 'UX_OrderId')
           CREATE UNIQUE NONCLUSTERED INDEX UX_OrderId ON SettlementHeader(OrderId) WHERE OrderId IS NOT NULL;
      `);

      // Ensure DailyAttendance table exists
      await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DailyAttendance' AND xtype='U')
        CREATE TABLE DailyAttendance (
          AttendanceId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          DeliveryPersonId NVARCHAR(100),
          EmployeeName NVARCHAR(255),
          StartDateTime DATETIME,
          BreakInTime DATETIME NULL,
          BreakOutTime DATETIME NULL,
          EndDateTime DATETIME NULL,
          NoofHours DECIMAL(5,2),
          NoofTrips INT DEFAULT 0,
          TotalAmount DECIMAL(18,2) DEFAULT 0,
          IsPaid BIT DEFAULT 0,
          BusinessUnitId NVARCHAR(100),
          CreatedBy NVARCHAR(100),
          CreatedOn DATETIME DEFAULT GETDATE(),
          ModifiedBy NVARCHAR(100) NULL,
          ModifiedOn DATETIME NULL
        )
      `);

      console.log("✅ Database initialized: SettlementItemDetail, MemberMaster/MemberTimeLog, cancellation tracking, discount type, and DailyAttendance table ready.");
      return; // Success - exit
    } catch (err) {
      console.error(`❌ DB Initialization Error (Attempt ${attempt}/${maxRetries}):`, err.message);
      
      if (attempt < maxRetries) {
        console.log(`⏳ Retrying in ${retryDelay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error("\n⚠️  Database connection failed after all retries.");
        console.error("   Please verify your database configuration:");
        console.error("   - Check that MSSQL Server is running and accessible");
        console.error("   - Verify network connectivity to the database server");
        console.error("   - Check credentials in the .env file:");
        console.error(`     DB_SERVER: ${process.env.DB_SERVER}`);
        console.error(`     DB_PORT: ${process.env.DB_PORT}`);
        console.error(`     DB_NAME: ${process.env.DB_NAME}`);
        console.error(`     DB_USER: ${process.env.DB_USER}`);
        console.error("\n   The server will continue running, but database operations will fail.");
      }
    }
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

// Middleware to check database connection for API routes
app.use((req, res, next) => {
  // Skip check for root and test endpoints
  if (req.path === "/" || req.path === "/test") {
    return next();
  }
  
  if (!pool) {
    return res.status(503).json({
      error: "Database Connection Unavailable",
      message: "The server is currently unable to connect to the database. Please try again in a few moments.",
      timestamp: new Date().toISOString(),
    });
  }
  
  next();
});

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

// Diagnostic endpoint to see actual table IDs
app.get("/api/tables/diagnostic", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT TOP 10 
        TableId, 
        TableNumber, 
        DiningSection, 
        Status,
        CAST(TableId AS VARCHAR(50)) AS TableId_AsString
      FROM TableMaster
    `);
    console.log("📋 Diagnostic - Tables in DB:", result.recordset);
    res.json(result.recordset);
  } catch (err) {
    console.error("Diagnostic error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/tables", async (req, res) => {
  try {
    const pool = await poolPromise;
    const { section } = req.query;

    // Map frontend section names to DiningSection values in the DB
    // Section 1=1, Section 2=2, Section 3=3, Takeaway=4
    const SECTION_MAP = {
      SECTION_1: "1",
      SECTION_2: "2",
      SECTION_3: "3",
      TAKEAWAY: "4",
    };

    let query = `
      SELECT
        TableId AS id,
        CAST(TableNumber AS VARCHAR(50)) AS label,
        CAST(DiningSection AS VARCHAR(10)) AS DiningSection
      FROM TableMaster
    `;

    const request = pool.request();

    if (section && SECTION_MAP[section] !== undefined) {
      request.input("DiningSection", SECTION_MAP[section]);
      query += ` WHERE CAST(DiningSection AS VARCHAR(10)) = @DiningSection`;
    }

    query += ` ORDER BY SortCode`;

    const result = await request.query(query);
    console.log(`✅ /tables endpoint: Found ${result.recordset?.length || 0} tables`);
    res.json(result.recordset || []);
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
    console.error("GET /api/tables/locked error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Lock Table (Persistent)
app.post("/api/tables/lock-persistent", async (req, res) => {
  try {
    const pool = await poolPromise;
    const { tableId, lockedByName } = req.body;
    
    console.log("🔒 Locking table:", { tableId, lockedByName });
    
    if (!tableId) {
      return res.status(400).json({ error: "tableId is required" });
    }
    
    // TableId is a GUID string - validate it looks like a UUID
    const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidPattern.test(tableId)) {
      return res.status(400).json({ error: "Invalid tableId format (must be GUID)" });
    }
    
    const request = pool.request();
    request.input("tableId", sql.VarChar, tableId);
    
    const result = await request.query(`
      UPDATE TableMaster 
      SET Status = 1 
      WHERE CAST(TableId AS VARCHAR(36)) = @tableId
    `);
    
    console.log("✅ Lock result:", { rowsAffected: result.rowsAffected[0] });
    
    if ((result.rowsAffected[0] || 0) === 0) {
      return res.status(404).json({ error: "Table not found" });
    }
    
    res.json({ success: true, rowsAffected: result.rowsAffected[0] || 0 });
  } catch (err) {
    console.error("❌ Lock error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Unlock Table (Persistent)
app.post("/api/tables/unlock-persistent", async (req, res) => {
  try {
    const pool = await poolPromise;
    const { tableId } = req.body;
    
    console.log("🔓 Unlocking table:", tableId);
    
    if (!tableId) {
      return res.status(400).json({ error: "tableId is required" });
    }
    
    // TableId is a GUID string - validate it looks like a UUID
    const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidPattern.test(tableId)) {
      return res.status(400).json({ error: "Invalid tableId format (must be GUID)" });
    }
    
    const request = pool.request();
    request.input("tableId", sql.VarChar, tableId);
    
    const result = await request.query(`
      UPDATE TableMaster 
      SET Status = 0 
      WHERE CAST(TableId AS VARCHAR(36)) = @tableId
    `);
    
    console.log("✅ Unlock result:", { rowsAffected: result.rowsAffected[0] });
    
    if ((result.rowsAffected[0] || 0) === 0) {
      return res.status(404).json({ error: "Table not found" });
    }
    
    res.json({ success: true, rowsAffected: result.rowsAffected[0] || 0 });
  } catch (err) {
    console.error("❌ Unlock error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= MEMBERS ================= */
app.get("/api/members", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        MemberId,
        Name,
        Phone,
        Email,
        CreditLimit,
        CreatedAt,
        COALESCE(CurrentBalance, Balance, 0) AS CurrentBalance,
        COALESCE(Balance, CurrentBalance, 0) AS Balance
      FROM MemberMaster
      ORDER BY Name
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/members/add", async (req, res) => {
  try {
    const pool = await poolPromise;
    const { name, phone, email, creditLimit, initialBalance } = req.body;
    const lim = parseFloat(creditLimit);
    const credit = Number.isFinite(lim) ? lim : 1000;
    const ib = parseFloat(initialBalance);
    const bal = Number.isFinite(ib) ? ib : 0;
    await pool
      .request()
      .input("Name", sql.NVarChar, name)
      .input("Phone", sql.NVarChar, phone)
      .input("Email", sql.NVarChar, email || null)
      .input("CreditLimit", sql.Decimal(18, 2), credit)
      .input("Bal", sql.Decimal(18, 2), bal)
      .query(`
        INSERT INTO MemberMaster (Name, Phone, Email, CreditLimit, CurrentBalance, Balance)
        VALUES (@Name, @Phone, @Email, @CreditLimit, @Bal, @Bal)
      `);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Member
app.put("/api/members/:memberId", async (req, res) => {
  try {
    const pool = await poolPromise;
    const { name, phone, email, creditLimit, currentBalance, balance } = req.body;
    const { memberId } = req.params;
    
    console.log(`Updating member ID: ${memberId}...`);
    
    const result = await pool
      .request()
      .input("MemberId", sql.NVarChar, memberId)
      .input("Name", sql.NVarChar, name)
      .input("Phone", sql.NVarChar, phone)
      .input("Email", sql.NVarChar, email || null)
      .input("CreditLimit", sql.Decimal(18, 2), parseFloat(creditLimit) || 0)
      .input("CurrentBalance", sql.Decimal(18, 2), parseFloat(currentBalance) || 0)
      .input("Balance", sql.Decimal(18, 2), parseFloat(balance) || 0)
      .query(`
        UPDATE MemberMaster 
        SET Name = @Name, 
            Phone = @Phone, 
            Email = @Email, 
            CreditLimit = @CreditLimit, 
            CurrentBalance = @CurrentBalance, 
            Balance = @Balance
        WHERE MemberId = @MemberId
      `);
    
    console.log(`Update result:`, result.rowsAffected);
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Member ID not found in database." });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("PUT MEMBER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete Member
app.delete("/api/members/:memberId", async (req, res) => {
  try {
    const pool = await poolPromise;
    const { memberId } = req.params;
    
    console.log(`Deleting member ID: ${memberId}...`);

    const result = await pool
      .request()
      .input("MemberId", sql.NVarChar, memberId)
      .query(`
        DELETE FROM MemberMaster WHERE MemberId = @MemberId
      `);
    
    console.log(`Delete result:`, result.rowsAffected);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Member ID not found for deletion." });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE MEMBER ERROR:", err);
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
    // Optimized: Don't convert images in SQL, just return image IDs
    // Images will be fetched separately if needed
    const result = await pool
      .request()
      .input("DishGroupId", req.params.DishGroupId)
      .query(`
        SELECT
          d.DishId,
          d.Name,
          d.DishGroupId,
          ISNULL(p.Amount, 0) AS Price,
          d.Imageid,
          CASE WHEN i.Imageid IS NOT NULL THEN 1 ELSE 0 END AS HasImage
        FROM DishMaster d
        INNER JOIN DishPriceList p 
          ON d.DishId = p.DishId
        LEFT JOIN ImageList i 
          ON d.Imageid = i.Imageid
        WHERE d.IsActive = 1
        AND d.DishGroupId = @DishGroupId
        ORDER BY d.Name ASC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error("DISH ERROR:", err);
    res.status(500).send(err.message);
  }
});

/* ================= DISH IMAGE (ON DEMAND) ================= */
app.get("/image/:imageId", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("Imageid", req.params.imageId)
      .query(`
        SELECT ImageData FROM ImageList WHERE Imageid = @Imageid
      `);
    
    if (result.recordset.length > 0 && result.recordset[0].ImageData) {
      const base64 = result.recordset[0].ImageData.toString('base64');
      res.json({ imageBase64: 'data:image/jpeg;base64,' + base64 });
    } else {
      res.json({ imageBase64: null });
    }
  } catch (err) {
    console.error("IMAGE FETCH ERROR:", err);
    res.status(500).json({ error: err.message });
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
          m.ModifierCode,
          m.ModifierName,
          0 AS Price
        FROM DishModifier dm 
        INNER JOIN ModifierMaster m 
          ON dm.ModifierId = m.ModifierId
        WHERE dm.DishId = @dishId
        ORDER BY m.ModifierName ASC
      `);
    console.log(`✅ Modifiers for dish ${req.params.dishId}: ${result.recordset.length} found`);
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
        sh.OrderId,
        sh.OrderType,
        sh.TableNo,
        sh.Section,
        sh.CashierId,
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
        INNER JOIN SettlementTotalSales sts ON sh.SettlementID = sts.SettlementID
        WHERE sh.LastSettlementDate BETWEEN @StartOfDay AND @EndOfDay
      `);
    res.json(result.recordset[0] || {});
  } catch (err) {
    console.error("DAILY SUMMARY ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= VALIDATION ENDPOINTS ================= */

// Validate or check if OrderId exists (for conflict detection)
app.get("/api/orders/check/:orderId", async (req, res) => {
  try {
    const pool = await poolPromise;
    const { orderId } = req.params;

    // Validate format: #XXXXXX
    if (!/^#[A-Z0-9]{6}$/.test(orderId)) {
      return res.status(400).json({ valid: false, message: "Invalid Order ID format" });
    }

    const result = await pool.request()
      .input("OrderId", orderId)
      .query(`SELECT SettlementID FROM SettlementHeader WHERE OrderId = @OrderId`);

    if (result.recordset.length > 0) {
      return res.status(409).json({ valid: false, message: "Order ID already exists", exists: true });
    }

    res.json({ valid: true, message: "Order ID is unique", exists: false });
  } catch (err) {
    console.error("ORDER CHECK ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// Validate cancellation reason is provided
app.post("/api/orders/validate-cancel", async (req, res) => {
  try {
    const { settlementId, cancellationReason, cancelledBy } = req.body;

    if (!settlementId) {
      return res.status(400).json({ valid: false, message: "Settlement ID is required" });
    }

    if (!cancellationReason || !cancellationReason.trim()) {
      return res.status(400).json({ valid: false, message: "Cancellation reason is required" });
    }

    if (!cancelledBy || !cancelledBy.trim()) {
      return res.status(400).json({ valid: false, message: "Cancelled by is required" });
    }

    res.json({ valid: true, message: "Cancellation data is valid" });
  } catch (err) {
    console.error("CANCEL VALIDATION ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// Validate modifier selection (ensure at least main dish is selected)
app.post("/api/modifiers/validate", async (req, res) => {
  try {
    const { dishId, modifierIds } = req.body;

    if (!dishId) {
      return res.status(400).json({ valid: false, message: "Dish ID is required" });
    }

    // modifierIds is optional - user can add dish without modifiers
    res.json({ valid: true, message: "Modifier selection is valid" });
  } catch (err) {
    console.error("MODIFIER VALIDATION ERROR:", err);
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
      discountType,
      orderId,
      orderType,
      tableNo,
      section,
      cashierId,
      memberId
    } = req.body;

    // Validate Order ID format (#XXXXXX)
    if (!orderId || !/^#[A-Z0-9]{6}$/.test(orderId)) {
      return res.status(400).json({ error: "Invalid Order ID format. Expected: #XXXXXX" });
    }

    console.log("Saving sale for Order:", orderId, "Type:", orderType, "Payment:", paymentMethod);

    // Check if Order ID is unique before transaction
    const existingOrder = await pool.request()
      .input("OrderId", orderId)
      .query(`SELECT SettlementID FROM SettlementHeader WHERE OrderId = @OrderId`);
    
    if (existingOrder.recordset.length > 0) {
      return res.status(409).json({ error: "Order ID already exists. Please try creating a new order." });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Generate Settlement ID and Random Bill No
      const settlementIdResult = await transaction.request().query(`SELECT NEWID() AS id`);
      const settlementId = settlementIdResult.recordset[0].id;
      const billNo = generateRandomBillId();

      console.log(`📝 Processing Sale: Bill #${billNo} (ID: ${settlementId}, OrderID: ${orderId})`);

      // 2. Insert into SettlementHeader with all order details
      await transaction.request()
        .input("SettlementID", settlementId)
        .input("LastSettlementDate", new Date())
        .input("SubTotal", subTotal || 0)
        .input("TotalTax", taxAmount || 0)
        .input("DiscountAmount", discountAmount || 0)
        .input("DiscountType", discountType || "fixed")
        .input("BillNo", billNo)
        .input("OrderId", orderId || null)
        .input("OrderType", orderType || "DINE-IN")
        .input("TableNo", tableNo || null)
        .input("Section", section || null)
        .input("MemberId", memberId || null)
        .query(`
          INSERT INTO SettlementHeader (SettlementID, LastSettlementDate, SubTotal, TotalTax, DiscountAmount, DiscountType, BillNo, OrderId, OrderType, TableNo, Section, MemberId)
          VALUES (@SettlementID, @LastSettlementDate, @SubTotal, @TotalTax, @DiscountAmount, @DiscountType, @BillNo, @OrderId, @OrderType, @TableNo, @Section, @MemberId)
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

    const result = await pool.request()
  .input("StartDate", sql.DateTime, new Date(startDate))
  .input("EndDate", sql.DateTime, new Date(endDate))
  .query(`
    SELECT
      sh.SettlementID,
      sh.LastSettlementDate AS SettlementDate,
     
      ISNULL(sts.PayMode, 'CASH') AS PayMode,
      ISNULL(sts.SysAmount, 0) AS SysAmount,
      ISNULL(sts.ManualAmount, 0) AS ManualAmount,
      ISNULL(sts.ReceiptCount, 0) AS ReceiptCount,
      m.Name as MemberName
    FROM SettlementHeader sh
    INNER JOIN SettlementTotalSales sts 
      ON sh.SettlementID = sts.SettlementID
    LEFT JOIN MemberMaster m 
      ON sh.MemberId = m.MemberId
    WHERE 
      sh.LastSettlementDate IS NOT NULL
      AND CAST(sh.LastSettlementDate AS DATE) 
          BETWEEN CAST(@StartDate AS DATE) 
          AND CAST(@EndDate AS DATE)       
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
        INNER JOIN SettlementTotalSales sts ON sh.SettlementID = sts.SettlementID
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

/* ================= CANCEL REASON MASTER ================= */
app.get("/api/cancel-reasons", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT CRCode, CRName, SortCode FROM [dbo].[CancelRemarksmaster] 
      ORDER BY SortCode ASC
    `);
    res.json(result.recordset || []);
  } catch (err) {
    console.error("CANCEL REASONS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= CANCEL ORDER ================= */
app.post("/api/orders/cancel", async (req, res) => {
  try {
    const pool = await poolPromise;
    const { settlementId, cancellationReason, cancelledBy } = req.body;

    if (!settlementId || !cancellationReason) {
      return res.status(400).json({ error: "Missing settlementId or cancellationReason" });
    }

    await pool.request()
      .input("SettlementID", settlementId)
      .input("IsCancelled", true)
      .input("CancellationReason", cancellationReason)
      .input("CancelledBy", cancelledBy || "System")
      .input("CancelledDate", new Date())
      .query(`
        UPDATE SettlementHeader 
        SET IsCancelled = @IsCancelled, 
            CancellationReason = @CancellationReason,
            CancelledBy = @CancelledBy,
            CancelledDate = @CancelledDate
        WHERE SettlementID = @SettlementID
      `);

    console.log(`✅ Order cancelled: ${settlementId}, Reason: ${cancellationReason}`);
    res.json({ success: true, settlementId });
  } catch (err) {
    console.error("CANCEL ORDER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= DISCOUNT MASTER ================= */
app.get("/api/discounts", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        DiscountId, DiscountQty, Discountprice, ActualPrice, 
        FromDate, ToDate, isActive, CreatedBy, CreatedDate
      FROM [dbo].[Discount]
      WHERE isActive = 1 
      AND CAST(GETDATE() AS DATE) BETWEEN CAST(FromDate AS DATE) AND CAST(ToDate AS DATE)
      ORDER BY DiscountQty ASC
    `);
    res.json(result.recordset || []);
  } catch (err) {
    console.error("DISCOUNT FETCH ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= APPLY DISCOUNT ================= */
app.post("/api/discounts/apply", async (req, res) => {
  try {
    const pool = await poolPromise;
    const { settlementId, discountAmount, discountType } = req.body;

    if (!settlementId) {
      return res.status(400).json({ error: "Missing settlementId" });
    }

    await pool.request()
      .input("SettlementID", settlementId)
      .input("DiscountAmount", discountAmount || 0)
      .input("DiscountType", discountType || "fixed")
      .query(`
        UPDATE SettlementHeader 
        SET DiscountAmount = @DiscountAmount, DiscountType = @DiscountType
        WHERE SettlementID = @SettlementID
      `);

    console.log(`✅ Discount applied: ${settlementId}, Amount: ${discountAmount}, Type: ${discountType}`);
    res.json({ success: true, settlementId });
  } catch (err) {
    console.error("APPLY DISCOUNT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= DAILY ATTENDANCE - CREATE/UPDATE ================= */
app.post("/api/attendance/track", async (req, res) => {
  try {
    const pool = await poolPromise;
    const { 
      employeeId, 
      employeeName, 
      action, // "START", "BREAK_IN", "BREAK_OUT", "END"
      timestamp,
      businessUnitId,
      userId
    } = req.body;

    if (!employeeId || !action) {
      return res.status(400).json({ error: "Missing employeeId or action" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if attendance record exists for today
    const result = await pool.request()
      .input("EmployeeId", employeeId)
      .input("TodayDate", today)
      .query(`
        SELECT TOP 1 AttendanceId, StartDateTime, BreakInTime, BreakOutTime, EndDateTime
        FROM DailyAttendance
        WHERE DeliveryPersonId = @EmployeeId 
        AND CAST(CreatedOn AS DATE) = CAST(@TodayDate AS DATE)
      `);

    const existingRecord = result.recordset?.[0];
    const currentTime = timestamp ? new Date(timestamp) : new Date();

    if (action === "START") {
      // Create new record or update START if not exists
      if (!existingRecord) {
        // Convert employeeId string to a consistent UUID format
        const crypto = require('crypto');
        const hash = crypto.createHash('md5').update(employeeId).digest('hex');
        const formattedUUID = [
          hash.substring(0, 8),
          hash.substring(8, 12),
          hash.substring(12, 16),
          hash.substring(16, 20),
          hash.substring(20, 32)
        ].join('-');
        
        const businessUUID = businessUnitId || '00000000-0000-0000-0000-000000000000';
        const createdByUUID = userId || '00000000-0000-0000-0000-000000000000';
        const endTime = new Date(currentTime.getTime() + 8*60*60*1000);
        
        try {
          await pool.request()
            .input("DeliveryPersonId", formattedUUID)
            .input("StartDateTime", currentTime)
            .input("EndDateTime", endTime)
            .input("NoofHours", 0)
            .input("NoofTrips", 0)
            .input("TotalAmount", 0)
            .input("IsPaid", 0)
            .input("BusinessUnitId", businessUUID)
            .input("CreatedBy", createdByUUID)
            .input("CreatedOn", new Date())
            .query(`
              INSERT INTO DailyAttendance (DeliveryPersonId, StartDateTime, EndDateTime, NoofHours, NoofTrips, TotalAmount, IsPaid, BusinessUnitId, CreatedBy, CreatedOn)
              VALUES (@DeliveryPersonId, @StartDateTime, @EndDateTime, @NoofHours, @NoofTrips, @TotalAmount, @IsPaid, @BusinessUnitId, @CreatedBy, @CreatedOn)
            `);
          console.log(`✅ Shift started: ${employeeId} at ${currentTime}`);
        } catch (insertErr) {
          console.error("INSERT ERROR:", insertErr.message);
          throw insertErr;
        }
      }
    } else if (action === "BREAK_IN") {
      console.log(`✅ Break started: ${employeeId} at ${currentTime}`);
    } else if (action === "BREAK_OUT") {
      console.log(`✅ Break ended: ${employeeId} at ${currentTime}`);
    } else if (action === "END") {
      if (existingRecord && !existingRecord.EndDateTime) {
        const startTime = new Date(existingRecord.StartDateTime);
        const totalHours = (currentTime - startTime) / (1000 * 60 * 60);
        
        const crypto = require('crypto');
        const hash = crypto.createHash('md5').update(employeeId).digest('hex');
        const formattedUUID = [
          hash.substring(0, 8),
          hash.substring(8, 12),
          hash.substring(12, 16),
          hash.substring(16, 20),
          hash.substring(20, 32)
        ].join('-');
        
        const modifiedByUUID = userId || '00000000-0000-0000-0000-000000000000';
        const hours = Math.max(0, Math.round(totalHours * 100) / 100);

        try {
          await pool.request()
            .input("EndDateTime", currentTime)
            .input("NoofHours", hours)
            .input("ModifiedBy", modifiedByUUID)
            .input("ModifiedOn", new Date())
            .input("DeliveryPersonId", formattedUUID)
            .query(`
              UPDATE DailyAttendance
              SET EndDateTime = @EndDateTime, 
                  NoofHours = @NoofHours,
                  ModifiedBy = @ModifiedBy,
                  ModifiedOn = @ModifiedOn
              WHERE DeliveryPersonId = @DeliveryPersonId
              AND CAST(CreatedOn AS DATE) = CAST(GETDATE() AS DATE)
            `);
          console.log(`✅ Shift ended: ${employeeId}, Hours: ${hours}`);
        } catch (updateErr) {
          console.error("UPDATE ERROR:", updateErr.message);
          throw updateErr;
        }
      }
    }

    res.json({ success: true, action });
  } catch (err) {
    console.error("ATTENDANCE TRACK ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ================= GET TODAY'S ATTENDANCE ================= */
app.get("/api/attendance/today/:employeeId", async (req, res) => {
  try {
    const pool = await poolPromise;
    const { employeeId } = req.params;

    const result = await pool.request()
      .input("EmployeeId", employeeId)
      .input("TodayDate", new Date())
      .query(`
        SELECT TOP 1 
          AttendanceId, DeliveryPersonId, EmployeeName, StartDateTime, 
          BreakInTime, BreakOutTime, EndDateTime, NoofHours, CreatedOn
        FROM DailyAttendance
        WHERE DeliveryPersonId = @EmployeeId
        AND CAST(CreatedOn AS DATE) = CAST(@TodayDate AS DATE)
        ORDER BY CreatedOn DESC
      `);

    res.json(result.recordset?.[0] || null);
  } catch (err) {
    console.error("GET ATTENDANCE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= SERVER ================= */
console.log("🚀 Starting server...");

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});