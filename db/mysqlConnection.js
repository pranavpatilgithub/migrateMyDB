const mysql = require('mysql2/promise');

// Create a connection pool for reusability
const pool = mysql.createPool({
  host: 'localhost',       // Replace with your MySQL host
  port: 3306,              // Default MySQL port is 3306
  user: 'root',            // Replace with your MySQL username
  password: 'myDBp', // Replace with your MySQL password
  database: 'sampledbs'  // Replace with your MySQL database
});

module.exports = pool;
