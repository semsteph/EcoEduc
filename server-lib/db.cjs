// =====================================================================
//  Pool de connexions MySQL partagé par server.cjs et tous les routers.
// =====================================================================

const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'projetoff',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = db;
