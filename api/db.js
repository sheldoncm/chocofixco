// ============================================================
// CHOCOFIXCO - DATABASE CONNECTION
// Module 8: Express + MariaDB + EJS
//
// LEARNING NOTES:
// mysql2/promise allows us to use async/await with SQL queries.
// A connection pool reuses database connections efficiently.
// Environment variables keep database credentials out of code.
// ============================================================

require('dotenv').config();

const mysql = require('mysql2/promise');

// Create a reusable connection pool for MariaDB.
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});

// Export the pool so Express routers can execute SQL queries.
module.exports = db;
