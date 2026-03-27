require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { poolPromise } = require("./db");

const app = express();

const PORT = process.env.PORT || 3000;

console.log("PORT:", PORT);
console.log("DB_SERVER:", process.env.DB_SERVER);

// ✅ FIXED CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  }),
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
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT 
        TableId AS id,
        TableNumber AS label,
        DiningSection
      FROM TableMaster
      ORDER BY SortCode
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("TABLE ERROR:", err);
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
      .input("CategoryId", req.params.CategoryId).query(`
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

/* ================= DISHES (🔥 IMAGE FIXED) ================= */
app.get("/dishes/:DishGroupId", async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("DishGroupId", req.params.DishGroupId).query(`
        SELECT
          d.DishId,
          d.Name,
          d.DishGroupId,
          ISNULL(p.Amount, 0) AS Price,

          -- 🔥 BASE64 IMAGE
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
    console.error("🔥 DISH ERROR:", err);
    res.status(500).send(err.message);
  }
});

/* ================= MODIFIERS ================= */
app.get("/modifiers/:dishId", async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().input("dishId", req.params.dishId)
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

/* ================= SERVER ================= */

console.log("🚀 Starting server...");

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});
