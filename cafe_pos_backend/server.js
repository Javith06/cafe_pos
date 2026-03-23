const express = require("express");
const cors = require("cors");
const sql = require("mssql");
const { poolPromise } = require("./db");

const app = express();
const PORT = 3000;

/* -------- MIDDLEWARE -------- */

app.use(cors());
app.use(express.json());

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
          DishGroupId,
          DishGroupName
        FROM DishGroupMaster
        WHERE KitchenTypeName = @kitchen
        AND IsActive = 1
        ORDER BY SortCode
      `);

    console.log("Rows returned:", result.recordset.length);
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
      .input("groupId", sql.VarChar, groupId)   // FIX HERE
      .query(`
        SELECT
        DishId,
        Name,
        DishCode,
        0 AS Price
        FROM DishMaster
        WHERE DishGroupId = @groupId
        ORDER BY Name
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
        m.ModifierId,
        m.ModifierName
        FROM DishModifier dm
        JOIN ModifierMaster m
        ON dm.ModifierId = m.ModifierId
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