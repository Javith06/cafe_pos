const express = require("express");
const cors = require("cors");
const sql = require("mssql");
const { poolPromise } = require("./db");

const app = express();
const PORT = 3000;

/* -------- MIDDLEWARE -------- */

app.use(cors());
app.use(express.json());
 
// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

/* -------- ROOT -------- */

app.get("/", (req, res) => {
  res.send("POS Backend Running");
});

/* -------- GET KITCHENS -------- */

app.get("/kitchens", async (req, res) => {

  try {

    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT 
        KitchenTypeId,
        KitchenTypeName
      FROM Kitchen
      WHERE IsActive = 1
      ORDER BY KitchenTypeName
    `);

    res.json(result.recordset);

  } catch (err) {

    console.error("Kitchen API Error:", err);

    res.status(500).json({
      error: "Failed to fetch kitchens",
      details: err.message
    });

  }

});

/* -------- GET DISH GROUPS BY KITCHEN -------- */
app.get("/dishgroups", async (req, res) => {

  try {

    const pool = await poolPromise;

    const result = await pool.request()
      .query(`
        SELECT
          DishGroupId,
          DishGroupName
        FROM DishGroupMaster
        WHERE IsActive = 1
        ORDER BY SortCode
      `);

    res.json(result.recordset);

  } catch (err) {

    console.error("DishGroup API Error:", err);

    res.status(500).json({
      error: "Failed to fetch dish groups",
      details: err.message
    });

  }

});
app.get("/dishgroups/:kitchen", async (req, res) => {
  const kitchen = req.params.kitchen;
  console.log("Kitchen received:", kitchen);

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input("kitchen", sql.VarChar, kitchen)
      .query(`
        SELECT
          a.DishGroupId,
          a.DishGroupName
        FROM DishGroupMaster a
        JOIN CategoryMaster b 
          ON a.CategoryId = b.CategoryId
        WHERE b.CategoryName = @kitchen
          AND a.IsActive = 1
        ORDER BY a.DishGroupName
      `);

    console.log("Groups returned:", result.recordset.length);
    res.json(result.recordset);

  } catch (err) {
    console.error("DishGroup API Error:", err);
    res.status(500).json({
      error: "Failed to fetch dish groups",
      details: err.message
    });
  }
});

/* -------- GET DISHES BY GROUP -------- */

app.get("/dishes/:groupId", async (req, res) => {

  const groupId = req.params.groupId;

  try {

    const pool = await poolPromise;

    const result = await pool.request()
      .input("groupId", sql.VarChar, groupId)
      .query(`
        SELECT
          v.DishId,
          v.Name,
          v.SordCode AS DishIntId,
          v.Amount AS Price,
          d.DishImage AS imagename,
          v.ImageId AS imageid
        FROM Vw_DishPriceList v
        JOIN DishMaster d ON v.DishId = d.DishId
        WHERE v.DishGroupId = @groupId
          AND v.IsActive = 1
        ORDER BY v.Name
      `);

    res.json(result.recordset);

  } catch (err) {

    console.error("Dish API Error:", err);

    res.status(500).json({
      error: "Failed to fetch dishes",
      details: err.message
    });

  }

});



/* -------- GET MODIFIERS BY DISH -------- */

app.get("/modifiers/:dishId", async (req, res) => {

  const dishId = req.params.dishId;

  try {

    const pool = await poolPromise;

    const result = await pool.request()
      .input("dishId", sql.VarChar, dishId)
      .query(`
        SELECT 
          m.ModifierID AS ModifierId,
          m.ModifierName,
          m.DishCost AS Price
        FROM DishModifier dm
        JOIN ModifierMaster m
          ON dm.ModifierId = m.ModifierID
        WHERE dm.DishId = @dishId
        ORDER BY m.ModifierName
      `);

    res.json(result.recordset);

  } catch (err) {

    console.error("Modifier API Error:", err);

    res.status(500).json({
      error: "Failed to fetch modifiers",
      details: err.message
    });

  }

});

/* -------- SERVER START -------- */

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Diagnostic handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});