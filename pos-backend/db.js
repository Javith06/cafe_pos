const sql = require("mssql");

const dbConfig = {
  user: "ups",
  password: "ups",
  server: "26.14.83.241",   // office server
  port: 5899,
  database: "UCS",
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then(pool => {
    console.log("✅ Connected to MSSQL (Office DB)");
    return pool;
  })
  .catch(err => {
    console.error("❌ DB ERROR:", err);
  });

module.exports = { sql, poolPromise };