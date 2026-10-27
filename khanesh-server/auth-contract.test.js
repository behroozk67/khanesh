// ============================================================
// قراردادِ ورود، پروفایل و حذفِ حساب با احراز هویتِ *روشن* (specs/011).
//
// ⚠️ فایلِ جدا از api-contract.test.js، چون AUTH_REQUIRED هنگامِ import خوانده می‌شود و
//    آن سوئیت با احراز هویتِ خاموش نوشته شده. node --test هر فایل را در فرایندِ جدا اجرا
//    می‌کند، پس این دو با هم تداخل ندارند. پایگاه‌داده هم فایلِ موقتِ خودش را دارد (DB_FILE)
//    تا دو سوئیتِ هم‌زمان روی یک database.sqlite قفل نشوند.
// ============================================================
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "azmayar-auth-"));
process.env.PORT = "0";
process.env.AVALAI_API_KEY = "test-key-never-used";
process.env.AUTH_REQUIRED = "true";
process.env.JWT_SECRET = "test-secret-for-auth-contract-only";
process.env.DB_FILE = path.join(TMP, "auth.sqlite");
process.env.OTP_REQUEST_MAX = "1000";
process.env.OTP_VERIFY_MAX = "1000";
process.env.ALLOWED_ORIGINS = "";

let serverHandle = null;
const realCreateServer = http.createServer;
http.createServer = function patched(...args) {
  const s = realCreateServer.apply(this, args);
  serverHandle = s;
  return s;
};

const sent = { sms: new Map(), email: new Map() };
let base = "";
const quiet = { log: console.log, warn: console.warn };

async function call(method, url, body, token) {
  const res = await fetch(`${base}${url}`, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function signInPhone(raw, normalized) {
  const r = await call("POST", "/api/auth/request-otp", { phone: raw });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const v = await call("POST", "/api/auth/verify-otp", { phone: raw, code: sent.sms.get(normalized) });
  assert.equal(v.status, 200, JSON.stringify(v.body));
  return v.body;
}

before(async () => {
  console.log = () => {};
  console.warn = () => {};
  const auth = await import("./auth.js");
  auth.setOtpSenders({
    sms: (phone, code) => sent.sms.set(phone, code),
    email: (email, code) => sent.email.set(email, code),
  });
  await import("./server.js");
  const deadline = Date.now() + 10_000;
  while (!serverHandle && Date.now() < deadline) await new Promise((r) => setTimeout(r, 10));
  if (!serverHandle) throw new Error("سرور بالا نیامد");
  await new Promise((resolve) => (serverHandle.listening ? resolve() : serverHandle.once("listening", resolve)));
  base = `http://127.0.0.1:${serverHandle.address().port}`;
});

after(async () => {
  console.log = quiet.log;
  console.warn = quiet.warn;
  http.createServer = realCreateServer;
  if (serverHandle) {
    serverHandle.closeAllConnections?.();
    await new Promise((r) => serverHandle.close(r));
  }
  const { closeDb } = await import("./database.js");
  await closeDb();
  fs.rmSync(TMP, { recursive: true, force: true });
});

test("T33: ورود با موبایل (رقمِ فارسی و +98) و با ایمیل؛ ۵ کدِ اشتباه کد را می‌سوزاند؛ ایمیلِ نامعتبر ۴۰۰ فارسی", async () => {
  const a = await signInPhone("۰۹۱۲۱۲۳۴۵۶۷", "09121234567");
  assert.ok(a.token);
  assert.equal(a.profile, null, "کاربرِ تازه پروفایل ندارد");
  // همان شماره با +98 همان حساب است
  const b = await signInPhone("+989121234567", "09121234567");
  assert.equal(b.user.id, a.user.id);
  // ⚠️ شناسه داخلِ توکن نیست
  const payload = JSON.parse(Buffer.from(a.token.split(".")[1], "base64url").toString());
  assert.equal(payload.phone, undefined);

  const e1 = await call("POST", "/api/auth/request-email-otp", { email: " Sara@Example.IR " });
  assert.equal(e1.status, 200);
  const e2 = await call("POST", "/api/auth/verify-email-otp", { email: "sara@example.ir", code: sent.email.get("sara@example.ir") });
  assert.equal(e2.status, 200, JSON.stringify(e2.body));
  assert.notEqual(e2.body.user.id, a.user.id, "ایمیل و موبایل دو حسابِ جدایند");

  // ارسالِ دوباره زیرِ یک دقیقه ⇒ ۴۲۹ با ثانیه‌های باقی‌مانده
  await call("POST", "/api/auth/request-otp", { phone: "09130000000" });
  const again = await call("POST", "/api/auth/request-otp", { phone: "09130000000" });
  assert.equal(again.status, 429);
  assert.ok(again.body.retryAfterSec > 0);
  assert.match(again.body.error, /ثانیه/);

  // پنج کدِ اشتباه
  const wrong = sent.sms.get("09130000000") === "000000" ? "111111" : "000000";
  let last;
  for (let i = 0; i < 5; i++) last = await call("POST", "/api/auth/verify-otp", { phone: "09130000000", code: wrong });
  assert.match(last.body.error, /کدِ تازه بگیرید/);
  const burnt = await call("POST", "/api/auth/verify-otp", { phone: "09130000000", code: sent.sms.get("09130000000") });
  assert.equal(burnt.status, 400, "کدِ سوخته نباید پذیرفته شود");
  // 🔴 بازبینیِ کد: سوختنِ کد رکوردش را پاک می‌کرد و فاصلهٔ ارسالِ دوباره با آن می‌رفت — کدِ تازه بی‌فاصله.
  const afterBurn = await call("POST", "/api/auth/request-otp", { phone: "09130000000" });
  assert.equal(afterBurn.status, 429, "پس از سوختنِ کد، فاصلهٔ ارسالِ دوباره دور زده شد");
  assert.match(afterBurn.body.error, /[۰-۹]+ ثانیه/, "شمارشِ ثانیه در جملهٔ فارسی باید رقمِ فارسی باشد");

  const bad = await call("POST", "/api/auth/request-email-otp", { email: "not-an-email" });
  assert.equal(bad.status, 400);
  assert.match(bad.body.error, /ایمیل/);
  const health = await call("GET", "/health");
  assert.equal(health.body.smsOtp, "mock");
  assert.equal(health.body.emailOtp, "mock");
});

test("T35: پروفایل — اعتبارسنجیِ فارسیِ هر فیلد و پیشروی intakeStep: name → sex → age → conditions → done", async () => {
  const { token } = await signInPhone("09125550000", "09125550000");
  const g = await call("GET", "/api/profile", null, token);
  assert.equal(g.body.intakeStep, "name");

  let r = await call("PATCH", "/api/profile", { firstName: "سارا", lastName: "  " }, token);
  assert.equal(r.status, 400);
  assert.equal(r.body.error, "نام خانوادگی را وارد کنید.");
  r = await call("PATCH", "/api/profile", { firstName: "سارا", lastName: "رضایی" }, token);
  assert.equal(r.body.intakeStep, "sex");
  r = await call("PATCH", "/api/profile", { sex: "female" }, token);
  assert.equal(r.body.intakeStep, "age");
  r = await call("PATCH", "/api/profile", { ageValue: 90, ageUnit: "day" }, token);
  assert.equal(r.status, 400, "۹۰ روز باید رد شود (بالای ۶۰ ⇒ ماه)");
  r = await call("PATCH", "/api/profile", { ageValue: "۳۲", ageUnit: "year", pregnant: true }, token);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.profile.ageValue, 32);
  assert.equal(r.body.profile.pregnant, true);
  assert.equal(r.body.intakeStep, "conditions");
  r = await call("PATCH", "/api/profile", { conditions: ["none", "dm2"] }, token);
  assert.equal(r.status, 400);
  r = await call("PATCH", "/api/profile", { conditions: ["xyz"] }, token);
  assert.equal(r.status, 400);
  r = await call("PATCH", "/api/profile", { conditions: ["none"] }, token);
  assert.equal(r.body.intakeStep, "done", "«هیچ‌کدام» پاسخ است، نه جای خالی");
  assert.deepEqual(r.body.profile.conditions, []);
  // تغییرِ جنس به مرد بارداری را خاموش می‌کند؛ بارداریِ مرد ۴۰۰
  r = await call("PATCH", "/api/profile", { sex: "male" }, token);
  assert.equal(r.body.profile.pregnant, false);
  r = await call("PATCH", "/api/profile", { pregnant: true }, token);
  assert.equal(r.status, 400);
  // ورودِ دوباره پروفایل را برمی‌گرداند
  const again = await signInPhone("09125550000", "09125550000");
  assert.equal(again.profile.firstName, "سارا");
});

test("T40: حذفِ حساب — بی‌تأیید ۴۰۰؛ با تأیید کاربر/پروفایل/کارها پاک و توکنِ قدیمی ۴۰۱", async () => {
  const { token, user } = await signInPhone("09127770000", "09127770000");
  await call("PATCH", "/api/profile", { firstName: "علی", lastName: "احمدی" }, token);
  const no = await call("DELETE", "/api/auth/me", {}, token);
  assert.equal(no.status, 400);
  const yes = await call("DELETE", "/api/auth/me", { confirm: true }, token);
  assert.equal(yes.status, 200, JSON.stringify(yes.body));
  const after1 = await call("GET", "/api/profile", null, token);
  assert.equal(after1.status, 401);
  const { getUserById, getProfile } = await import("./database.js");
  assert.equal(await getUserById(user.id), undefined);
  assert.equal(await getProfile(user.id), null);
  // ورودِ دوباره حسابِ تازه و خالی می‌سازد
  const fresh = await signInPhone("09127770000", "09127770000");
  assert.equal(fresh.profile, null);
});

test("T45: سنِ روز/ماهِ قدیمی‌تر از ۷ روز دوباره پرسیده می‌شود؛ سنِ سالی هرگز (بازبینیِ کد #1)", async () => {
  // 🔴 نوزادِ «۱۰ روز» دو ماه بعد هنوز «۱۰ روز» بود و برگهٔ شیرخوار با بازهٔ نوزادی و کفِ «همین امروز» سنجیده می‌شد.
  const { intakeStep } = await import("./profile.js");
  const day = 24 * 60 * 60 * 1000;
  const base = { firstName: "ن", lastName: "خ", sex: "female", conditionsAnswered: true, conditions: [] };
  assert.equal(intakeStep({ ...base, ageValue: 10, ageUnit: "day", ageRecordedAt: Date.now() - 8 * day }), "age");
  assert.equal(intakeStep({ ...base, ageValue: 3, ageUnit: "month", ageRecordedAt: null }), "age");
  assert.equal(intakeStep({ ...base, ageValue: 10, ageUnit: "day", ageRecordedAt: Date.now() - 2 * day }), "done");
  assert.equal(intakeStep({ ...base, ageValue: 45, ageUnit: "year", ageRecordedAt: null }), "done");
  // PATCHِ سن زمان را ثبت می‌کند
  const { token } = await signInPhone("09126660000", "09126660000");
  const r = await call("PATCH", "/api/profile", { ageValue: 10, ageUnit: "day" }, token);
  assert.ok(Date.now() - r.body.profile.ageRecordedAt < 60_000, JSON.stringify(r.body.profile));
});

test("T34: مهاجرتِ users — پایگاهِ قدیمی (phone NOT NULL) ردیفش را نگه می‌دارد و کاربرِ فقط-ایمیل می‌پذیرد", async () => {
  // ⚠️ آخرین تست: اتصالِ ماژول را به یک فایلِ قدیمیِ تازه می‌برد.
  const { closeDb, initDb, createUserWithEmail, getUser } = await import("./database.js");
  const sqlite3 = (await import("sqlite3")).default;
  const { open } = await import("sqlite");
  const oldFile = path.join(TMP, "old.sqlite");
  const old = await open({ filename: oldFile, driver: sqlite3.Database });
  await old.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, phone TEXT UNIQUE NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
                  CREATE TABLE jobs (id TEXT PRIMARY KEY, user_id INTEGER, pages_total INTEGER, status TEXT, created_at DATETIME, updated_at DATETIME, result_json TEXT, FOREIGN KEY(user_id) REFERENCES users(id));
                  CREATE TABLE profiles (user_id INTEGER PRIMARY KEY, first_name TEXT, conditions TEXT NOT NULL DEFAULT '[]');
                  INSERT INTO users (phone) VALUES ('09120001111');
                  INSERT INTO jobs (id, user_id, status) VALUES ('j1', 1, 'done');`);
  await old.close();

  await closeDb();
  process.env.DB_FILE = oldFile;
  await initDb();
  await initDb();   // ایدمپوتنت
  assert.equal((await getUser("09120001111"))?.id, 1);
  const u = await createUserWithEmail("new@example.ir");
  assert.ok(u.id > 1);
  const chk = await open({ filename: oldFile, driver: sqlite3.Database });
  assert.equal((await chk.get("PRAGMA user_version")).user_version, 1);
  assert.equal((await chk.get("SELECT user_id FROM jobs WHERE id='j1'")).user_id, 1);
  // پایگاهی که profiles را بی‌ستونِ age_recorded_at ساخته بود، با ALTER به‌روز می‌شود (بازبینیِ کد #1).
  assert.ok((await chk.all("PRAGMA table_info(profiles)")).some((c) => c.name === "age_recorded_at"));
  await chk.close();
});

// ارسالِ ناموفقِ کد نباید «موفق» گزارش شود، و فاصلهٔ ارسالِ دوباره نباید کاربر را قفل کند.
test("SF1: فرستندهٔ شکست‌خورده ⇒ ۵۰۲ با جملهٔ فارسی، و تلاشِ فوریِ بعدی ۴۲۹ نیست", async () => {
  const auth = await import("./auth.js");
  let fail = true;
  auth.setOtpSenders({ sms: (phone, code) => { if (fail) return false; sent.sms.set(phone, code); } });
  const r1 = await call("POST", "/api/auth/request-otp", { phone: "09123334455" });
  assert.equal(r1.status, 502, JSON.stringify(r1.body));
  assert.match(r1.body.error, /ارسالِ کد انجام نشد/);
  fail = false;
  const r2 = await call("POST", "/api/auth/request-otp", { phone: "09123334455" });
  assert.equal(r2.status, 200, JSON.stringify(r2.body));
  assert.ok(sent.sms.get("09123334455"));
});
