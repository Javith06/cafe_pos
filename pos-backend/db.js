const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const sql = require("mssql");

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

// Log configuration for debugging (mask password)
console.log("📋 Database Configuration:");
console.log(`   Server: ${dbConfig.server || "NOT SET"}`);
console.log(`   Port: ${dbConfig.port || "NOT SET"}`);
console.log(`   Database: ${dbConfig.database || "NOT SET"}`);
console.log(`   User: ${dbConfig.user || "NOT SET"}`);

const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then((pool) => {
    console.log("✅ Connected to MSSQL Successfully");
    return pool;
  })
  .catch((err) => {
    console.error("❌ Database Connection Failed:", err.message);
    console.error("   Please verify your .env file contains:");
    console.error("   - DB_SERVER");
    console.error("   - DB_PORT");
    console.error("   - DB_NAME");
    console.error("   - DB_USER");
    console.error("   - DB_PASSWORD");
    throw err;
  });

module.exports = { sql, poolPromise };
