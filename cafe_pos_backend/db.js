const sql = require("mssql");
 
// MSSQL configuration
const dbConfig = {
  user: "ups",
  password: "ups",
  server: "26.14.83.241", 
  port: 5899,
  database: "UCS",
  options: {
    encrypt: false,        
    enableArithAbort: true, 
     requestTimeout: 120000 
  },
};
 
// Create a single connection pool
const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then(pool => {
    console.log("✅ Connected to MSSQL");
    return pool;
  })
  .catch(err => {
    console.error("❌ DB Connection Error: ", err);
    process.exit(1); 
  });
 
module.exports = { sql, poolPromise };