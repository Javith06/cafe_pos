const express = require("express");
const cors = require("cors");
const path = require("path");
const { poolPromise } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static images (if you have images folder)
app.use("/images", express.static(path.join(__dirname, "../assets/images")));

/* ROOT */
app.get("/", (req, res) => {
  res.send("POS Backend Running");
});
app.get("/test", (req, res) => {
  res.send("TEST OK");
});

/* ================= KITCHENS ================= */
app.get("/kitchens", async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT 
        ROW_NUMBER() OVER (ORDER BY CategoryName) AS KitchenTypeId,
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

/* ================= DISH GROUPS (FILTER BY KITCHEN) ================= */
app.get("/dishgroups/:kitchenName", async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("kitchenName", req.params.kitchenName).query(`
        SELECT 
          a.DishGroupId,
          a.DishGroupName
        FROM DishGroupMaster a
        JOIN CategoryMaster b 
          ON a.CategoryId = b.CategoryId
        WHERE b.CategoryName = @kitchenName
          AND a.IsActive = 1
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error("DISH GROUP ERROR:", err);
    res.status(500).send(err.message);
  }
});

/* ================= DISHES ================= */

app.get("/dishes/:groupId", async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().input("groupId", req.params.groupId)
      .query(`
        SELECT 
          d.DishId,
          d.Name,
          ISNULL(p.Amount, 0) AS Price
        FROM DishMaster d
        LEFT JOIN DishPriceList p 
          ON d.DishId = p.DishId
        WHERE d.DishGroupId = @groupId   -- ✅ direct match
          AND d.IsActive = 1
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
          m.ModifierId,
          m.ModifierName,
          m.Rate AS Price
        FROM DishModifiers dm 
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

console.log("DB connected and server starting...");
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
