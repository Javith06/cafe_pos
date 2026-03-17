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

/* KITCHENS */
app.get("/kitchens", async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT 
        ROW_NUMBER() OVER (ORDER BY CategoryName) AS KitchenTypeId,
        CategoryName AS KitchenTypeName
      FROM CategoryMaster
      WHERE isactive = 1
    `);

    res.json(result.recordset);

  } catch (err) {
    console.error("KITCHEN ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* DISH GROUPS */
app.get("/dishgroups", async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT DishGroupId, DishGroupName
      FROM DishGroupMaster
      WHERE IsActive = 1
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

/* DISHES */
app.get("/dishes/:groupId", async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input("groupId", req.params.groupId)
      .query(`
        SELECT 
          d.DishId,
          d.Name,
          d.DishCode,
          ISNULL(p.Amount,0) AS Price
        FROM DishMaster d
        LEFT JOIN DishDishGroup dg ON d.DishId = dg.DishId
        LEFT JOIN DishPriceList p ON d.DishId = p.DishId
        WHERE dg.DishGroupId = @groupId
          AND d.IsActive = 1
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

/* MODIFIERS */
app.get("/modifiers/:dishId", async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input("dishId", req.params.dishId)
      .query(`
        SELECT ModifierId, ModifierName
        FROM DishModifiers
        WHERE DishId = @dishId
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});