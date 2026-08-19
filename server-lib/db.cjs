// =====================================================================
//  Pool de connexions MySQL partagé par server.cjs et tous les routers.
//
//  En local (LAMPP) comme en production (ex: MySQL fourni par Railway),
//  la config vient des variables d'environnement :
//    - DATABASE_URL="mysql://user:password@host:port/dbname" (prioritaire)
//    - ou DB_HOST / DB_USER / DB_PASSWORD / DB_NAME / DB_PORT séparément
//  À défaut, on retombe sur la config LAMPP par défaut (root sans mot de
//  passe sur localhost) pour ne rien casser en dev si le .env est absent.
// =====================================================================

const mysql = require('mysql2/promise');

function buildConfigFromEnv() {
  // .trim() : certains hébergeurs (ex: référence de variable mal résolue sur
  // Railway) peuvent injecter une chaîne blanche plutôt qu'une vraie URL —
  // on l'ignore proprement au lieu de laisser `new URL(' ')` planter le process.
  const databaseUrl = (process.env.DATABASE_URL || '').trim();
  if (databaseUrl) {
    const url = new URL(databaseUrl);
    return {
      host: url.hostname,
      port: url.port ? Number(url.port) : 3306,
      user: decodeURIComponent(url.username || 'root'),
      password: decodeURIComponent(url.password || ''),
      database: url.pathname.replace(/^\//, ''),
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'projetoff',
  };
}

const db = mysql.createPool({
  ...buildConfigFromEnv(),
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = db;
