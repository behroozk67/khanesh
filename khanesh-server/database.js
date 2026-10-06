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
    // specs/011: DB_FILE برای تستِ احراز هویت (فایلِ جدا، تا با سوئیتِ دیگر روی یک فایل قفل نشوند).
    _dbPromise = open({
      filename: process.env.DB_FILE || path.join(process.cwd(), 'database.sqlite'),
      driver: sqlite3.Database
    });
    // ⚠️ PRAGMA foreign_keys عمداً روشن نمی‌شود: در حالتِ AUTH خاموش، jobs با user_id=1 نوشته می‌شود و
    //    ردیفِ users برایش نیست — روشن کردنش هر تحلیلِ ناشناس را می‌شکست. حذفِ آبشاری در deleteUserCascade صریح است.
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
      phone TEXT UNIQUE,
      email TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      CHECK (phone IS NOT NULL OR email IS NOT NULL)
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
  await migrateUsersV1(db);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id),
      first_name TEXT,
      last_name TEXT,
      sex TEXT,
      age_value INTEGER,
      age_unit TEXT,
      pregnant INTEGER NOT NULL DEFAULT 0,
      conditions TEXT NOT NULL DEFAULT '[]',
      conditions_answered INTEGER NOT NULL DEFAULT 0,
      age_recorded_at INTEGER,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  // ستونِ بعداً افزوده‌شده (بازبینیِ کد #1) — پایگاهی که جدول را بی‌آن ساخته، با ALTER به‌روز می‌شود.
  const pcols = await db.all('PRAGMA table_info(profiles)');
  if (!pcols.some((c) => c.name === 'age_recorded_at')) {
    await db.exec('ALTER TABLE profiles ADD COLUMN age_recorded_at INTEGER');
  }
  // سنِ بارداری (۲۰۲۶-۱۰-۰۶): هفته + زمانِ ثبت، تا هفتهٔ امروز محاسبه شود.
  for (const col of ['gest_weeks', 'gest_recorded_at']) {
    if (!pcols.some((c) => c.name === col)) await db.exec(`ALTER TABLE profiles ADD COLUMN ${col} INTEGER`);
  }
  console.log("✅ Database initialized");
}

/**
 * specs/011: جدولِ users قدیمی `phone NOT NULL` داشت؛ ورود با ایمیل کاربرِ بی‌شماره می‌سازد.
 * SQLite قیدِ NOT NULL را درجا برنمی‌دارد، پس جدول بازسازی می‌شود و ردیف‌ها کپی می‌شوند.
 * ایدمپوتنت (user_version). foreign_keys خاموش است (کامنتِ dbConn)، پس DROPِ users به jobs.user_id گیر نمی‌کند.
 */
async function migrateUsersV1(db) {
  const { user_version: v } = await db.get('PRAGMA user_version');
  if (v >= 1) return;
  const cols = await db.all('PRAGMA table_info(users)');
  if (!cols.some((c) => c.name === 'email')) {
    try {
      await db.exec(`
        BEGIN;
        CREATE TABLE users_v1 (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          phone TEXT UNIQUE,
          email TEXT UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          CHECK (phone IS NOT NULL OR email IS NOT NULL)
        );
        INSERT INTO users_v1 (id, phone, email, created_at) SELECT id, phone, NULL, created_at FROM users;
        DROP TABLE users;
        ALTER TABLE users_v1 RENAME TO users;
        COMMIT;
      `);
    } catch (e) {
      await db.exec('ROLLBACK').catch(() => {});
      throw e;
    }
  }
  await db.exec('PRAGMA user_version = 1');
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

export async function getUserById(id) {
  const db = await dbConn();
  return db.get(`SELECT * FROM users WHERE id = ?`, [id]);
}

export async function getUserByEmail(email) {
  const db = await dbConn();
  return db.get(`SELECT * FROM users WHERE email = ?`, [email]);
}

export async function createUserWithEmail(email) {
  const db = await dbConn();
  const result = await db.run(`INSERT INTO users (email) VALUES (?)`, [email]);
  return { id: result.lastID, email };
}

// ── پروفایل (specs/011) ─────────────────────────────────────
// ⚠️ فقط وقتی AUTH_REQUIRED روشن است نوشته می‌شود؛ در حالتِ خاموش همه userId=1اند و نامِ یک بیمار
//    به بیمارِ بعدی نشان داده می‌شد (research R7). نگهبانش در profile.js است.
const PROFILE_COLS = {
  firstName: 'first_name', lastName: 'last_name', sex: 'sex', ageValue: 'age_value',
  ageUnit: 'age_unit', pregnant: 'pregnant', conditions: 'conditions', conditionsAnswered: 'conditions_answered',
  ageRecordedAt: 'age_recorded_at', gestWeeks: 'gest_weeks', gestRecordedAt: 'gest_recorded_at',
};

function rowToProfile(r) {
  if (!r) return null;
  return {
    firstName: r.first_name ?? null, lastName: r.last_name ?? null, sex: r.sex ?? null,
    ageValue: r.age_value ?? null, ageUnit: r.age_unit ?? null, pregnant: r.pregnant === 1,
    conditions: JSON.parse(r.conditions || '[]'), conditionsAnswered: r.conditions_answered === 1,
    ageRecordedAt: r.age_recorded_at ?? null,
    gestWeeks: r.gest_weeks ?? null, gestRecordedAt: r.gest_recorded_at ?? null,
  };
}

export async function getProfile(userId) {
  const db = await dbConn();
  return rowToProfile(await db.get(`SELECT * FROM profiles WHERE user_id = ?`, [userId]));
}

export async function upsertProfile(userId, patch) {
  const db = await dbConn();
  await db.run(`INSERT OR IGNORE INTO profiles (user_id) VALUES (?)`, [userId]);
  const sets = [];
  const vals = [];
  for (const [k, col] of Object.entries(PROFILE_COLS)) {
    if (!(k in patch)) continue;
    let v = patch[k];
    if (k === 'conditions') v = JSON.stringify(v);
    if (k === 'pregnant' || k === 'conditionsAnswered') v = v ? 1 : 0;
    sets.push(`${col} = ?`);
    vals.push(v);
  }
  if (sets.length) {
    await db.run(`UPDATE profiles SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`, [...vals, userId]);
  }
  return getProfile(userId);
}

/** حذفِ حساب (clarify A): کاربر، پروفایل و نتایجِ ذخیره‌شده در یک تراکنش. */
export async function deleteUserCascade(userId) {
  const db = await dbConn();
  await db.exec('BEGIN');
  try {
    await db.run(`DELETE FROM jobs WHERE user_id = ?`, [userId]);
    await db.run(`DELETE FROM profiles WHERE user_id = ?`, [userId]);
    await db.run(`DELETE FROM users WHERE id = ?`, [userId]);
    await db.exec('COMMIT');
  } catch (e) {
    await db.exec('ROLLBACK').catch(() => {});
    throw e;
  }
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
