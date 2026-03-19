const express = require("express");
const cors = require("cors");
const { poolPromise } = require("./db");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

/* ROOT */

app.get("/", (req, res) => {
  res.send("POS Backend Running");
});

/* ================= KITCHENS ================= */

const sql = require("mssql"); 
app.get("/kitchens", async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request()
          .input("dishId", sql.VarChar, req.params.dishId) 
      .query(`
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

    const result = await pool.request()
      .input("kitchenName", req.params.kitchenName)
      .query(`
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

    console.log("GROUP ID:", req.params.groupId);

    const result = await pool.request()
      .input("groupId", req.params.groupId)
      .query(`
        SELECT 
          d.DishId,               
          d.Name,
          d.SordCode AS DishIntId,  
          0 AS Price
        FROM DishMaster d
        WHERE d.DishGroupId = @groupId
          AND d.IsActive = 1
      `);

    res.json(result.recordset);

  } catch (err) {
    console.error("DISH ERROR:", err);
    res.status(500).send(err.message);
  }
});



app.get("/modifiers", async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .query(`
        SELECT 
          m.ModifierId,
          m.ModifierName
        FROM DishModifiers dm, ModifierMaster m
        WHERE dm.ModifierId = m.ModifierId
          AND dm.DishId = 58   -- 🔥 HARDCODE
      `);

    res.json(result.recordset);

  } catch (err) {
    console.error("MODIFIER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});
/* ================= SERVER ================= */

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});