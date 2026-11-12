import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { createHash } from 'node:crypto';

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

// یک اتصالِ مشترک داریم: تراکنشِ هم‌زمان «cannot start a transaction within a transaction» می‌دهد، پس پشتِ هم اجرا می‌شوند.
let txTail = Promise.resolve();
async function beginTx(db) {
  let release;
  const done = new Promise((r) => { release = r; });
  const wait = txTail;
  txTail = txTail.then(() => done);
  await wait;
  try {
    await db.exec('BEGIN');
    return release;
  } catch (e) {
    release();
    throw e;
  }
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
  // پروفایل‌های خانواده (P131): همان ستون‌های پروفایل، جدا از صاحبِ حساب. نام هرگز به تحلیل نمی‌رود.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS family_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      first_name TEXT, last_name TEXT, sex TEXT, age_value INTEGER, age_unit TEXT,
      pregnant INTEGER NOT NULL DEFAULT 0,
      conditions TEXT NOT NULL DEFAULT '[]',
      conditions_answered INTEGER NOT NULL DEFAULT 0,
      age_recorded_at INTEGER, gest_weeks INTEGER, gest_recorded_at INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_family_user ON family_members(user_id);
  `);
  const jcols = await db.all('PRAGMA table_info(jobs)');
  if (!jcols.some((c) => c.name === 'member_id')) {
    await db.exec('ALTER TABLE jobs ADD COLUMN member_id INTEGER');
  }
  // ستونِ بعداً افزوده‌شده (بازبینیِ کد #1) — پایگاهی که جدول را بی‌آن ساخته، با ALTER به‌روز می‌شود.
  const pcols = await db.all('PRAGMA table_info(profiles)');
  if (!pcols.some((c) => c.name === 'age_recorded_at')) {
    await db.exec('ALTER TABLE profiles ADD COLUMN age_recorded_at INTEGER');
  }
  // سنِ بارداری (۲۰۲۶-۱۰-۰۶): هفته + زمانِ ثبت، تا هفتهٔ امروز محاسبه شود.
  for (const col of ['gest_weeks', 'gest_recorded_at']) {
    if (!pcols.some((c) => c.name === col)) await db.exec(`ALTER TABLE profiles ADD COLUMN ${col} INTEGER`);
  }

  // ── تاریخچهٔ آزمایش‌ها (P120) ─────────────────────────────
  // چرا جدولِ جدا و نه خواندنِ `jobs.result_json`: هر تحلیل یک JSONِ کاملِ
  // تفسیر ذخیره می‌کند. برای «روندِ کراتینین در ۵ نوبت» باید ۵ JSON پارس شود و
  // ردیف‌ها از زیرکلیدهای مختلف در بیایند — یعنی حلقهٔ نمایش به شکلِ داخلیِ
  // نتیجه گره بخورد. این‌جا ردیفِ *مشاهده* جدا و بی‌متغیر ذخیره می‌شود.
  // ⚠️ value فقط عددی؛ ردیفِ کیفی واردِ تاریخچه نمی‌شود (مقایسهٔ «Positive» بی‌معناست).
  await db.exec(`
    CREATE TABLE IF NOT EXISTS lab_events (
      id TEXT PRIMARY KEY,
      owner TEXT NOT NULL,
      job_id TEXT,
      taken_at TEXT NOT NULL,
      source TEXT,
      lab_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_lab_events_owner ON lab_events(owner, taken_at);
    CREATE TABLE IF NOT EXISTS lab_observations (
      lab_id TEXT NOT NULL,
      marker_key TEXT NOT NULL,
      value REAL,
      unit TEXT,
      ref_range TEXT,
      abnormal INTEGER NOT NULL DEFAULT 0,
      dir TEXT,
      PRIMARY KEY (lab_id, marker_key)
    );
    CREATE INDEX IF NOT EXISTS idx_lab_obs_marker ON lab_observations(marker_key);
    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      contact TEXT NOT NULL,
      subject TEXT,
      message TEXT NOT NULL,
      ip TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      authority TEXT UNIQUE NOT NULL,
      job_id TEXT,
      user_id INTEGER,
      plan_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      currency TEXT DEFAULT 'IRT',
      status TEXT DEFAULT 'pending',
      ref_id TEXT,
      card_pan TEXT,
      card_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      paid_at DATETIME,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(job_id) REFERENCES jobs(id)
    );
    CREATE INDEX IF NOT EXISTS idx_payments_authority ON payments(authority);
    CREATE INDEX IF NOT EXISTS idx_payments_job_id ON payments(job_id);
  `);

  const ucols = await db.all('PRAGMA table_info(users)');
  if (!ucols.some((c) => c.name === 'credits')) {
    await db.exec('ALTER TABLE users ADD COLUMN credits INTEGER NOT NULL DEFAULT 0');
  }
  if (!ucols.some((c) => c.name === 'active_plan')) {
    await db.exec("ALTER TABLE users ADD COLUMN active_plan TEXT DEFAULT 'starter'");
  }
  // هدیهٔ ثبت‌نام: free_credits جدا از credits خریداری‌شده؛ trial_until (ISO) پایانِ یک ماهِ اول است.
  // حساب‌های موجود هر دو را صفر/NULL می‌گیرند، پس هدیه فقط برای ثبت‌نام‌های بعد از استقرار است.
  if (!ucols.some((c) => c.name === 'free_credits')) {
    await db.exec('ALTER TABLE users ADD COLUMN free_credits INTEGER NOT NULL DEFAULT 0');
  }
  if (!ucols.some((c) => c.name === 'trial_until')) {
    await db.exec('ALTER TABLE users ADD COLUMN trial_until TEXT');
  }
  // دفترِ هدیه: با حذفِ حساب و ثبت‌نامِ دوباره با همان شماره، هدیه دوباره داده نمی‌شود. کلید هشِ شماره است، نه خودِ شماره.
  await db.exec(`CREATE TABLE IF NOT EXISTS free_grant_ledger (
    identity_hash TEXT PRIMARY KEY, remaining INTEGER NOT NULL, trial_until TEXT NOT NULL)`);
  // برای سقفِ روزانهٔ کل: زمانِ هدیه (NULL برای هدیهٔ یک‌بارهٔ کاربرانِ موجود، تا سقف را مصرف نکند)
  const lcols = await db.all('PRAGMA table_info(free_grant_ledger)');
  if (!lcols.some((x) => x.name === 'granted_at')) await db.exec('ALTER TABLE free_grant_ledger ADD COLUMN granted_at TEXT');

  await grantExistingUsersV2(db);
  console.log("✅ Database initialized");
}

/**
 * یک‌بار: کاربرانِ موبایلیِ موجود هم هدیهٔ ثبت‌نام (۲ تفسیر، یک ماه) را می‌گیرند. user_version=2 جلوی تکرار را می‌گیرد.
 * ردیفِ دفتر با granted_at=NULL ساخته می‌شود تا سقفِ روزانهٔ ثبت‌نام‌های تازه را مصرف نکند.
 * production بدونِ نمک بوت رد می‌شود؛ مهاجرت هم در آن حالت اجرا نمی‌شود تا هشِ اشتباه در دفتر نماند.
 */
async function grantExistingUsersV2(db) {
  const { user_version: v } = await db.get('PRAGMA user_version');
  const n = signupCredits();
  if (v >= 2 || n === 0) return;
  if (process.env.NODE_ENV === 'production' && !process.env.FREE_LEDGER_SALT) return;
  const trial = new Date(Date.now() + TRIAL_DAYS * 86400000).toISOString();
  const release = await beginTx(db);
  try {
    const rows = await db.all('SELECT id, phone FROM users WHERE phone IS NOT NULL AND trial_until IS NULL');
    for (const u of rows) {
      await db.run('INSERT OR IGNORE INTO free_grant_ledger (identity_hash, remaining, trial_until) VALUES (?, ?, ?)', [identityHash(u.phone), n, trial]);
      await db.run('UPDATE users SET free_credits = ?, trial_until = ? WHERE id = ?', [n, trial, u.id]);
    }
    await db.exec('PRAGMA user_version = 2');
    await db.exec('COMMIT');
  } catch (e) {
    await db.exec('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    release();
  }
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
  // هدیهٔ ثبت‌نام فقط برای حسابِ موبایلی (ایمیل هدیه ندارد). دفتر مانع هدیهٔ دوباره بعد از حذفِ حساب می‌شود:
  // ردیفِ دفتر هست ⇒ همان ماندهٔ قبلی و همان مهلت؛ نیست ⇒ هدیهٔ تازه، مگر سقفِ روزانهٔ کل پر باشد.
  // shortcut: سقف «بخوان، بعد بنویس» است؛ ثبت‌نامِ هم‌زمان می‌تواند چند هدیه از سقف بگذرد. اگر مسئله شد، در تراکنش ببر.
  const hash = identityHash(phone);
  const n = signupCredits();
  let g = await db.get(`SELECT remaining, trial_until FROM free_grant_ledger WHERE identity_hash = ?`, [hash]);
  if (!g && n > 0) {
    const since = new Date(Date.now() - 86400000).toISOString();
    const day = (await db.get(`SELECT COUNT(*) c FROM free_grant_ledger WHERE granted_at > ?`, [since])).c;
    if (day >= envInt('FREE_SIGNUP_DAILY_MAX', 200)) {
      console.error(`[FREE-GRANT] هدیه داده نشد: سقفِ روزانهٔ کل (امروز ${day} هدیه).`);
    } else {
      const trial = new Date(Date.now() + TRIAL_DAYS * 86400000).toISOString();
      await db.run(
        `INSERT OR IGNORE INTO free_grant_ledger (identity_hash, remaining, trial_until, granted_at) VALUES (?, ?, ?, ?)`,
        [hash, n, trial, new Date().toISOString()]
      );
      g = await db.get(`SELECT remaining, trial_until FROM free_grant_ledger WHERE identity_hash = ?`, [hash]);
    }
  }
  const result = await db.run(`INSERT INTO users (phone, free_credits, trial_until) VALUES (?, ?, ?)`, [phone, g?.remaining ?? 0, g?.trial_until ?? null]);
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
    phone: r.phone ?? null,
  };
}

export async function getProfile(userId) {
  const db = await dbConn();
  const row = await db.get(
    `SELECT p.*, u.phone, u.email FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?`,
    [userId]
  );
  if (!row || row.user_id == null) return null;
  return rowToProfile(row);
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
  const release = await beginTx(db);
  try {
    await db.run(`DELETE FROM jobs WHERE user_id = ?`, [userId]);
    // تاریخچهٔ صاحبِ حساب و همهٔ عضوها (u:<id> و u:<id>:m:<memberId>)
    const owners = `owner = ? OR owner LIKE ?`;
    const ownerArgs = [`u:${userId}`, `u:${userId}:m:%`];
    await db.run(`DELETE FROM lab_observations WHERE lab_id IN (SELECT id FROM lab_events WHERE ${owners})`, ownerArgs);
    await db.run(`DELETE FROM lab_events WHERE ${owners}`, ownerArgs);
    await db.run(`DELETE FROM family_members WHERE user_id = ?`, [userId]);
    await db.run(`DELETE FROM profiles WHERE user_id = ?`, [userId]);
    // ماندهٔ هدیه در دفتر می‌ماند تا حذف + ثبت‌نامِ دوباره با همان شماره هدیه را برنگرداند
    const u = await db.get(`SELECT phone, free_credits FROM users WHERE id = ?`, [userId]);
    if (u?.phone) await db.run(`UPDATE free_grant_ledger SET remaining = ? WHERE identity_hash = ?`, [u.free_credits, identityHash(u.phone)]);
    await db.run(`DELETE FROM users WHERE id = ?`, [userId]);
    await db.exec('COMMIT');
  } catch (e) {
    await db.exec('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    release();
  }
}

export async function createJobRecord(jobId, userId, pagesTotal, memberId = null) {
  const db = await dbConn();
  await db.run(
    `INSERT INTO jobs (id, user_id, pages_total, status, member_id) VALUES (?, ?, ?, ?, ?)`,
    [jobId, userId, pagesTotal, 'pending', memberId]
  );
}

// ── اعضای خانواده (P131) ─────────────────────────────────────
const memberRow = (r) => (r ? { id: r.id, ...rowToProfile(r) } : null);

export async function listFamilyMembers(userId) {
  const db = await dbConn();
  return (await db.all(`SELECT * FROM family_members WHERE user_id = ? ORDER BY id`, [userId])).map(memberRow);
}

export async function getFamilyMember(userId, memberId) {
  const db = await dbConn();
  return memberRow(await db.get(`SELECT * FROM family_members WHERE id = ? AND user_id = ?`, [memberId, userId]));
}

function memberColumns(patch) {
  const cols = [];
  const vals = [];
  for (const [k, col] of Object.entries(PROFILE_COLS)) {
    if (!(k in patch)) continue;
    let v = patch[k];
    if (k === 'conditions') v = JSON.stringify(v);
    if (k === 'pregnant' || k === 'conditionsAnswered') v = v ? 1 : 0;
    cols.push(col);
    vals.push(v);
  }
  return { cols, vals };
}

/** سقف در همان INSERT سنجیده می‌شود تا دو درخواستِ هم‌زمان از آن رد نشوند. null ⇒ سقف پر است. */
export async function createFamilyMember(userId, patch, max) {
  const db = await dbConn();
  const { cols, vals } = memberColumns(patch);
  const r = await db.run(
    `INSERT INTO family_members (user_id, ${cols.join(', ')})
     SELECT ?, ${cols.map(() => '?').join(', ')}
     WHERE (SELECT COUNT(*) FROM family_members WHERE user_id = ?) < ?`,
    [userId, ...vals, userId, max]
  );
  return r.changes === 1 ? getFamilyMember(userId, r.lastID) : null;
}

export async function updateFamilyMember(userId, memberId, patch) {
  const db = await dbConn();
  const { cols, vals } = memberColumns(patch);
  if (cols.length) {
    await db.run(
      `UPDATE family_members SET ${cols.map((c) => `${c} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
      [...vals, memberId, userId]
    );
  }
  return getFamilyMember(userId, memberId);
}

/** حذفِ عضو با نتایج و تاریخچه‌اش. */
export async function deleteFamilyMember(userId, memberId) {
  const db = await dbConn();
  const owner = `u:${userId}:m:${memberId}`;
  const release = await beginTx(db);
  try {
    const r = await db.run(`DELETE FROM family_members WHERE id = ? AND user_id = ?`, [memberId, userId]);
    if (r.changes === 1) {
      await db.run(`DELETE FROM jobs WHERE user_id = ? AND member_id = ?`, [userId, memberId]);
      await db.run(`DELETE FROM lab_observations WHERE lab_id IN (SELECT id FROM lab_events WHERE owner = ?)`, [owner]);
      await db.run(`DELETE FROM lab_events WHERE owner = ?`, [owner]);
    }
    await db.exec('COMMIT');
    return r.changes === 1;
  } catch (e) {
    await db.exec('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    release();
  }
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

/** P108-ج: آخرین نتیجهٔ کامل‌شدهٔ همین بیمار (همان عضوِ خانواده، غیر از کارِ جاری) — منبعِ «نوبتِ قبلی» برای پایداریِ ALT/AST و «آخرین نتیجه». */
export async function getLatestCompletedJob(userId, excludeJobId = '', memberId = null) {
  const db = await dbConn();
  const row = await db.get(
    `SELECT id, created_at, result_json FROM jobs WHERE user_id = ? AND id != ? AND member_id IS ? AND status = 'completed' AND result_json IS NOT NULL ORDER BY created_at DESC, rowid DESC LIMIT 1`,
    [userId, excludeJobId, memberId]
  );
  if (!row) return null;
  try { return { id: row.id, created_at: row.created_at, result: JSON.parse(row.result_json) }; } catch { return null; }
}

/** P142-الف: همهٔ نتیجه‌های کامل‌شدهٔ همین بیمار در `days` روزِ اخیر (جدیدترین اول) — برای «سابقهٔ ALT/AST در یک سال». */
export async function getRecentCompletedJobs(userId, excludeJobId = '', memberId = null, days = 366, limit = 24) {
  const db = await dbConn();
  const rows = await db.all(
    `SELECT id, created_at, result_json FROM jobs WHERE user_id = ? AND id != ? AND member_id IS ? AND status = 'completed' AND result_json IS NOT NULL AND created_at >= datetime('now', ?) ORDER BY created_at DESC, rowid DESC LIMIT ?`,
    [userId, excludeJobId, memberId, `-${Math.floor(days)} days`, limit]
  );
  const out = [];
  for (const row of rows) { try { out.push({ id: row.id, created_at: row.created_at, result: JSON.parse(row.result_json) }); } catch { /* ردیفِ خراب نادیده */ } }
  return out;
}

export async function getJobById(jobId, userId) {
  const db = await dbConn();
  const row = await db.get(`SELECT * FROM jobs WHERE id = ? AND user_id = ?`, [jobId, userId]);
  if (row && row.result_json) {
    row.result = JSON.parse(row.result_json);
  }
  return row;
}

// ── تاریخچهٔ آزمایش‌ها (P120) ────────────────────────────────
// مالکیت با `owner` (متنی) است، نه user_id عددی:
//   'u:<userId>'   کاربرِ واردشده (AUTH_REQUIRED=true)
//   'd:<hash>'     شناسهٔ دستگاه (UUIDِ مرورگر) وقتی احراز هویت خاموش است
// چرا: در حالتِ AUTH خاموش همه userId=1اند و تاریخچهٔ یک بیمار به بیمارِ بعدی
// نشان داده می‌شد (همان دامِ research R7 در پروفایل). شناسهٔ دستگاه همان سطحِ
// اعتمادِ کشِ localStorage را دارد، ولی بینِ دستگاه‌ها قاطی نمی‌شود.
// ⚠️ هر پرس‌وجو با owner فیلتر می‌شود؛ هیچ تابعی «همه» را برنمی‌گرداند.

export async function insertLabEvent({ id, owner, jobId, takenAt, source, labName, observations }) {
  const db = await dbConn();
  const release = await beginTx(db);
  try {
    // ⚠️ job_id عمداً یکتا نیست: یک کار می‌تواند دو بار ثبت شود اگر کاربر تاریخ را
    //    ویرایش کند. در آن حالت DELETE+INSERT همان id عوض می‌کند، نه ردیفِ دوم.
    await db.run(
      `INSERT OR REPLACE INTO lab_events (id, owner, job_id, taken_at, source, lab_name) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, owner, jobId ?? null, takenAt, source ?? 'upload', labName ?? null]
    );
    await db.run(`DELETE FROM lab_observations WHERE lab_id = ?`, [id]);
    for (const o of observations ?? []) {
      if (!Number.isFinite(Number(o.value))) continue;
      await db.run(
        `INSERT OR REPLACE INTO lab_observations (lab_id, marker_key, value, unit, ref_range, abnormal, dir) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, o.marker_key, Number(o.value), o.unit ?? null, o.range ?? null, o.abnormal ? 1 : 0, o.dir ?? null]
      );
    }
    await db.exec('COMMIT');
  } catch (e) {
    await db.exec('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    release();
  }
}

/** رویدادِ آزمایشی که برای همین کار ساخته شده (idempotencyِ بارگذاریِ دوباره). */
export async function getLabEventByJob(owner, jobId) {
  const db = await dbConn();
  return db.get(`SELECT * FROM lab_events WHERE owner = ? AND job_id = ? LIMIT 1`, [owner, jobId]);
}

export async function listLabEvents(owner) {
  const db = await dbConn();
  return db.all(
    `SELECT e.id, e.taken_at, e.source, e.lab_name, e.job_id, e.created_at,
            (SELECT COUNT(*) FROM lab_observations o WHERE o.lab_id = e.id) AS markers,
            (SELECT COUNT(*) FROM lab_observations o WHERE o.lab_id = e.id AND o.abnormal = 1) AS abnormal
       FROM lab_events e WHERE e.owner = ? ORDER BY e.taken_at DESC`,
    [owner]
  );
}

export async function getLabEvent(owner, labId) {
  const db = await dbConn();
  const event = await db.get(`SELECT * FROM lab_events WHERE owner = ? AND id = ?`, [owner, labId]);
  if (!event) return null;
  event.observations = await db.all(`SELECT * FROM lab_observations WHERE lab_id = ? ORDER BY marker_key`, [labId]);
  return event;
}

/** همهٔ مشاهده‌های مالک، برای ساختِ سری‌ها (compareSeries) با تضمینِ نگهداری آزمایش‌ها (دست‌کم ۶ ماه و بیشتر). */
export async function getOwnerObservations(owner, { since = null } = {}) {
  const db = await dbConn();
  const sql = `SELECT o.lab_id, o.marker_key, o.value, o.unit, o.ref_range, o.abnormal, o.dir, e.taken_at
                 FROM lab_observations o JOIN lab_events e ON e.id = o.lab_id
                WHERE e.owner = ?${since ? ' AND e.taken_at >= ?' : ''}
                ORDER BY e.taken_at ASC`;
  return db.all(sql, since ? [owner, since] : [owner]);
}

/** انتقال و اتصالِ تاریخچهٔ ثبت‌شده با شناسهٔ دستگاه به حسابِ کاربر پس از ورود با شماره */
export async function linkDeviceHistoryToUser(deviceOwner, userOwner) {
  if (!deviceOwner || !userOwner || deviceOwner === userOwner) return 0;
  const db = await dbConn();
  const r = await db.run(`UPDATE lab_events SET owner = ? WHERE owner = ?`, [userOwner, deviceOwner]);
  return r?.changes || 0;
}

export async function deleteLabEvent(owner, labId) {
  const db = await dbConn();
  const release = await beginTx(db);
  try {
    await db.run(`DELETE FROM lab_observations WHERE lab_id IN (SELECT id FROM lab_events WHERE id = ? AND owner = ?)`, [labId, owner]);
    const r = await db.run(`DELETE FROM lab_events WHERE id = ? AND owner = ?`, [labId, owner]);
    await db.exec('COMMIT');
    return r.changes > 0;
  } catch (e) {
    await db.exec('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    release();
  }
}

/** پاک‌سازیِ کاملِ تاریخچهٔ یک مالک (حذفِ حساب). */
export async function deleteOwnerHistory(owner) {
  const db = await dbConn();
  await db.run(`DELETE FROM lab_observations WHERE lab_id IN (SELECT id FROM lab_events WHERE owner = ?)`, [owner]);
  await db.run(`DELETE FROM lab_events WHERE owner = ?`, [owner]);
}

/** ثبت پیام تماس و بازخورد */
export async function saveContactMessage({ name, contact, subject, message, ip }) {
  const db = await dbConn();
  const res = await db.run(
    'INSERT INTO contact_messages (name, contact, subject, message, ip) VALUES (?, ?, ?, ?, ?)',
    name || null,
    contact,
    subject || null,
    message,
    ip || null
  );
  return { id: res.lastID, name, contact, subject, message, ip, createdAt: new Date() };
}

// ── تراکنش‌های پرداخت و اعتبارسنجی زرین‌پال ──

export async function createPaymentRecord({ authority, jobId, userId, planId, amount, currency = 'IRT' }) {
  const db = await dbConn();
  const res = await db.run(
    `INSERT INTO payments (authority, job_id, user_id, plan_id, amount, currency, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [authority, jobId || null, userId || null, planId, amount, currency]
  );
  return { id: res.lastID, authority, jobId, userId, planId, amount, status: 'pending' };
}

export async function getPaymentByAuthority(authority) {
  const db = await dbConn();
  return db.get(`SELECT * FROM payments WHERE authority = ?`, [authority]);
}

// پیش از صدا زدنِ verifyِ زرین‌پال: اگر سرور بعد از تأییدِ زرین‌پال و پیش از ثبت بیفتد، این ردیف نشان می‌دهد
// پولی شاید گرفته شده؛ زرین‌پال دیگر آن را در unVerified نمی‌آورد، پس بررسیِ دوره‌ای از همین وضعیت پیدایش می‌کند.
export async function markPaymentVerifying(authority) {
  const db = await dbConn();
  await db.run(`UPDATE payments SET status = 'verifying' WHERE authority = ? AND status != 'paid'`, [authority]);
}

// «در حالِ تأیید» که ۲۰ دقیقه مانده (مهلتِ درگاه گذشته، پس verifyِ زنده‌ای در جریان نیست). بعد از ۷ روز رها می‌شود.
export async function listStuckPayments() {
  const db = await dbConn();
  return db.all(`SELECT * FROM payments WHERE status = 'verifying'
    AND created_at < datetime('now', '-20 minutes') AND created_at > datetime('now', '-7 days')`);
}

// «paid» و اعتبار در یک تراکنش: سقوط بینِ این دو، پرداختِ paidِ بی‌اعتبار نمی‌گذارد.
// firstTime=true فقط برای اولین تأیید؛ تأیید دوباره (callback + refresh + بررسیِ دوره‌ای) اعتبار را دوباره اضافه نمی‌کند.
export async function settlePaymentRecord(authority, { refId, cardPan, cardHash }, credit = null) {
  const db = await dbConn();
  const release = await beginTx(db);
  try {
    const r = await db.run(
      `UPDATE payments
       SET status = 'paid', ref_id = ?, card_pan = ?, card_hash = ?, paid_at = CURRENT_TIMESTAMP
       WHERE authority = ? AND status != 'paid'`,
      [refId, cardPan || null, cardHash || null, authority]
    );
    const firstTime = r.changes === 1;
    if (firstTime && credit?.userId) await addUserCredits(credit.userId, credit.credits, credit.planId);
    await db.exec('COMMIT');
    return { firstTime };
  } catch (e) {
    await db.exec('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    release();
  }
}

export async function markPaymentFailed(authority) {
  const db = await dbConn();
  // بدونِ این شرط، ردیفِ paid به failed برمی‌گشت و تأییدِ بعدی (۱۰۱) با firstTime اعتبار را دوباره می‌داد.
  await db.run(`UPDATE payments SET status = 'failed' WHERE authority = ? AND status != 'paid'`, [authority]);
}

/** تعدادِ تحلیل‌های شروع‌شدهٔ این کاربر در ۲۴ ساعتِ گذشته — سقفِ روزانه‌ای که با ری‌استارت صفر نمی‌شود. */
export async function countRecentJobs(userId) {
  const db = await dbConn();
  const row = await db.get(`SELECT COUNT(*) n FROM jobs WHERE user_id = ? AND created_at > datetime('now', '-1 day')`, [userId]);
  return row?.n ?? 0;
}

export async function getUserCredits(userId) {
  if (!userId) return 0;
  const db = await dbConn();
  const row = await db.get(`SELECT credits FROM users WHERE id = ?`, [userId]);
  return row?.credits || 0;
}

// خریدِ پلن پایین‌تر اعتبار را اضافه می‌کند ولی قابلیت‌های پلن بالاتر را نمی‌گیرد.
const planRankSql = (x) => `(CASE ${x} WHEN 'unicorn' THEN 3 WHEN 'empire' THEN 2 ELSE 1 END)`;

export async function addUserCredits(userId, creditsToAdd, planId) {
  if (!userId) return;
  const db = await dbConn();
  await db.run(
    `UPDATE users
     SET credits = credits + ?,
         active_plan = CASE WHEN ${planRankSql('?')} > ${planRankSql('active_plan')} THEN ? ELSE active_plan END
     WHERE id = ?`,
    [creditsToAdd, planId || 'starter', planId || 'starter', userId]
  );
}

const TRIAL_DAYS = 30;
// FREE_SIGNUP_CREDITS=0 هدیه را خاموش می‌کند؛ نبود/نامعتبر ⇒ ۲. (نه `Number(x) || 2`: آن صفر را ۲ می‌کرد.)
function envInt(name, dflt) {
  const n = Number.parseInt(process.env[name], 10);
  return Number.isInteger(n) && n >= 0 ? n : dflt;
}
const signupCredits = () => envInt('FREE_SIGNUP_CREDITS', 2);
// نمکِ جدا از JWT_SECRET: عوض‌شدنِ راز نباید دفترِ هدیه را بی‌اثر کند. هرگز عوضش نکن. production بدونِ آن بوت نمی‌شود.
const saltHash = (kind, v) => createHash('sha256').update(`${process.env.FREE_LEDGER_SALT || 'dev'}:${kind}:${v}`).digest('hex');
const identityHash = (phone) => saltHash('id', phone);

/** ماندهٔ هدیهٔ ثبت‌نام که هنوز در مهلتش است (پس از یک ماه می‌سوزد و ریست نمی‌شود). */
export async function getFreeCredits(userId) {
  if (!userId) return 0;
  const db = await dbConn();
  const row = await db.get(`SELECT free_credits FROM users WHERE id = ? AND trial_until > ?`, [userId, new Date().toISOString()]);
  return row?.free_credits ?? 0;
}

/** تا این زمان کاربر امکاناتِ پلنِ پایش سلامت را دارد (هدیهٔ ثبت‌نام)؛ NULL برای حساب‌های قدیمی. */
export async function getTrialUntil(userId) {
  if (!userId) return null;
  const db = await dbConn();
  return (await db.get(`SELECT trial_until FROM users WHERE id = ?`, [userId]))?.trial_until ?? null;
}

/**
 * یک تفسیر از اعتبار کم می‌کند: free=true ⇒ اول هدیهٔ ثبت‌نام (اگر مهلتش نگذشته)، بعد خریداری‌شده.
 * یک UPDATE (SET روی مقدارِ قدیمیِ ردیف حساب می‌شود)، پس دو درخواستِ هم‌زمان یک اعتبار را دو بار نمی‌گیرند و منفی نمی‌شود.
 */
export async function deductUserCredit(userId, { free = false } = {}) {
  if (!userId) return false;
  const db = await dbConn();
  if (!free) {
    const r = await db.run(`UPDATE users SET credits = credits - 1 WHERE id = ? AND credits > 0`, [userId]);
    return r.changes === 1;
  }
  const now = new Date().toISOString();
  const r = await db.run(
    `UPDATE users
     SET free_credits = CASE WHEN free_credits > 0 AND trial_until > ? THEN free_credits - 1 ELSE free_credits END,
         credits      = CASE WHEN free_credits > 0 AND trial_until > ? THEN credits ELSE credits - 1 END
     WHERE id = ? AND ((free_credits > 0 AND trial_until > ?) OR credits > 0)`,
    [now, now, userId, now]
  );
  return r.changes === 1;
}

export async function getUserPlan(userId) {
  if (!userId) return null;
  const db = await dbConn();
  return db.get(`SELECT credits, active_plan FROM users WHERE id = ?`, [userId]);
}

// ⚠️ قبلاً خودِ promise را default export می‌کرد، که یعنی هر import اتصال را
//    باز می‌کرد. حالا خودِ گیرنده export می‌شود؛ هیچ فایلی default را import
//    نمی‌کند (بررسی شد: auth.js و server.js فقط named import دارند).
export default dbConn;
