import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

// ⚠️ اتصال *تنبل* است و عمداً در سطحِ ماژول باز نمی‌شود.
//    باز کردنش هنگامِ import یعنی هر چیزی که این فایل را import کند — از جمله
//    سوئیتِ تست، از راهِ server.js و auth.js — یک هندلِ باز به حلقهٔ رویداد
//    اضافه می‌کند و فرایند دیگر هرگز خارج نمی‌شود. اندازه‌گیری‌شده:
//    `node --test api-contract.test.js` با نسخهٔ قبلی هنگ می‌کرد (exit 124)،
//    و چون هوکِ pre-commit همان `npm test` را می‌زند، هوک هم هنگ می‌کرد.
//    رفتارِ پرودکشن عوض نشده: initDb() هنگامِ بوت صدا زده می‌شود و همان‌جا
//    اتصال ساخته می‌شود.
let _dbPromise = null;
function dbConn() {
  if (!_dbPromise) {
    _dbPromise = open({
      filename: path.join(process.cwd(), 'database.sqlite'),
      driver: sqlite3.Database
    });
  }
  return _dbPromise;
}

/**
 * بستنِ اتصال و آزادکردنِ حلقهٔ رویداد.
 * برای تست‌هاست: هرکه اتصال را باز کرد باید ببندد، وگرنه فرایند خارج نمی‌شود.
 */
export async function closeDb() {
  if (!_dbPromise) return;
  const conn = await _dbPromise;
  _dbPromise = null;
  await conn.close();
}

export async function initDb() {
  const db = await dbConn();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      user_id INTEGER,
      pages_total INTEGER,
      status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      result_json TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
  console.log("✅ Database initialized");
}

export async function getUser(phone) {
  const db = await dbConn();
  return db.get(`SELECT * FROM users WHERE phone = ?`, [phone]);
}

export async function createUser(phone) {
  const db = await dbConn();
  const result = await db.run(`INSERT INTO users (phone) VALUES (?)`, [phone]);
  return { id: result.lastID, phone };
}

export async function createJobRecord(jobId, userId, pagesTotal) {
  const db = await dbConn();
  await db.run(
    `INSERT INTO jobs (id, user_id, pages_total, status) VALUES (?, ?, ?, ?)`,
    [jobId, userId, pagesTotal, 'pending']
  );
}

export async function updateJobResult(jobId, status, resultJson) {
  const db = await dbConn();
  await db.run(
    `UPDATE jobs SET status = ?, result_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [status, JSON.stringify(resultJson), jobId]
  );
}

export async function getUserJobs(userId) {
  const db = await dbConn();
  return db.all(`SELECT id, status, created_at FROM jobs WHERE user_id = ? ORDER BY created_at DESC`, [userId]);
}

export async function getJobById(jobId, userId) {
  const db = await dbConn();
  const row = await db.get(`SELECT * FROM jobs WHERE id = ? AND user_id = ?`, [jobId, userId]);
  if (row && row.result_json) {
    row.result = JSON.parse(row.result_json);
  }
  return row;
}

// ⚠️ قبلاً خودِ promise را default export می‌کرد، که یعنی هر import اتصال را
//    باز می‌کرد. حالا خودِ گیرنده export می‌شود؛ هیچ فایلی default را import
//    نمی‌کند (بررسی شد: auth.js و server.js فقط named import دارند).
export default dbConn;
