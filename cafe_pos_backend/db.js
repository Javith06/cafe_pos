const sql = require("mssql");
 
// MSSQL configuration with full optimization
const dbConfig = {
  user: "ups",
  password: "ups",
  server: "26.14.83.241", 
  port: 5899,
  database: "UCS",
  options: {
    encrypt: false,        
    enableArithAbort: true, 
    requestTimeout: 120000,
    connectionTimeout: 60000,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};
 
// Create a single connection pool with retry
let poolPromise = null;

const getPool = async () => {
  if (poolPromise) return poolPromise;
  
  try {
    poolPromise = await new sql.ConnectionPool(dbConfig).connect();
    console.log("✅ Connected to MSSQL");
    return poolPromise;
  } catch (err) {
    console.error("❌ DB Connection Error: ", err.message);
    // Don't exit, allow retry
    poolPromise = null;
    throw err;
  }
};
 
module.exports = { sql, getPool };