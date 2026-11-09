// قواعدِ production برای مسیرهای پرهزینهٔ تحلیل:
//   • POST /api/analyze پرداخت و قفل پلن ندارد؛ نباید ثبت شود و /api/analyze/start باید بماند.
//   • هر کاربر روزی ۱۰ تحلیل شروع می‌کند، مگر شماره‌اش در PAYMENT_EXEMPT_PHONES باشد.
// server.js مسیرها را هنگام import ثبت می‌کند، پس هر حالت یک پروسهٔ جدا لازم دارد.
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import { open } from "sqlite";
import sqlite3 from "sqlite3";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const JWT_SECRET = "test-secret-for-route-check-only";

const freePort = () => new Promise((resolve, reject) => {
  const s = createServer();
  s.once("error", reject);
  s.listen(0, "127.0.0.1", () => {
    const { port } = s.address();
    s.close(() => resolve(port));
  });
});

async function withServer(nodeEnv, extraEnv, fn) {
  const port = await freePort();
  const dir = mkdtempSync(path.join(tmpdir(), "analyze-route-"));
  const dbFile = path.join(dir, "test.sqlite");
  const child = spawn(process.execPath, ["server.js"], {
    cwd: HERE,
    stdio: ["ignore", "ignore", "pipe"],
    env: {
      ...process.env,
      NODE_ENV: nodeEnv,
      PORT: String(port),
      DB_FILE: dbFile,
      AUTH_REQUIRED: "true",
      JWT_SECRET,
      AVALAI_API_KEY: "test-key-never-used",
      ALLOWED_ORIGINS: "https://test.local",
      ZARINPAL_MERCHANT_ID: "11111111-1111-1111-1111-111111111111",
      ZARINPAL_SANDBOX: "false",
      TRUST_PROXY: "",
      PAYMENT_EXEMPT_PHONES: "",
      ...extraEnv,
    },
  });
  let stderr = "";
  child.stderr.on("data", (d) => { stderr += d; });
  const exited = new Promise((resolve) => child.once("exit", resolve));

  try {
    // سرور روی :: گوش می‌دهد؛ روی ویندوز یک سرورِ تستیِ دیگر می‌تواند همان پورت را روی 127.0.0.1 گرفته باشد
    // و درخواستِ IPv4 به آن برسد. پس اول همان آدرسِ خودِ سرور سنجیده می‌شود.
    let base = null;
    let last = "";
    for (let i = 0; i < 100 && !base && child.exitCode === null; i++) {
      for (const host of ["[::1]", "127.0.0.1"]) {
        const url = `http://${host}:${port}`;
        last = await fetch(`${url}/health`).then((r) => String(r.status), (err) => String(err.cause?.code || err.message));
        if (last === "200") { base = url; break; }
      }
      if (!base) await new Promise((r) => setTimeout(r, 200));
    }
    assert.ok(base, `server did not start: port=${port} last=${last} exit=${child.exitCode} ${stderr.slice(0, 200)}`);
    return await fn(base, dbFile);
  } finally {
    child.kill();
    await exited;
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

// بدنهٔ خالی پیش از هر فراخوانیِ AvalAI با خطای ۴۰۰ در کار تمام می‌شود
const post = (base, p, token, body = "{}") => fetch(`${base}${p}`, {
  method: "POST",
  headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
  body,
});
const bodyOf = (bytes) => JSON.stringify({ pad: "x".repeat(bytes) });

test("production: مسیرِ همگام ثبت نمی‌شود و مسیرِ اصلی ورود می‌خواهد", async () => {
  await withServer("production", {}, async (base) => {
    assert.equal((await post(base, "/api/analyze")).status, 404);
    assert.equal((await post(base, "/api/analyze/start")).status, 401);
  });
});

test("غیر production: مسیرِ همگام برای تست و توسعه می‌ماند", async () => {
  await withServer("development", {}, async (base) => {
    assert.equal((await post(base, "/api/analyze")).status, 401);
    assert.equal((await post(base, "/api/analyze/start")).status, 401);
  });
});

test("سقفِ روزانه: کاربرِ عادی ۱۰ تحلیل، کاربرِ معاف بی‌سقف، و شمارش هر کاربر جداست", async () => {
  const NORMAL = "09120000000";
  const OTHER = "09120000001";
  const EXEMPT = "09120000009";
  await withServer("production", { RATE_LIMIT_MAX: "1000", PAYMENT_EXEMPT_PHONES: EXEMPT }, async (base, dbFile) => {
    const db = await open({ filename: dbFile, driver: sqlite3.Database });
    const tokenFor = async (phone) => {
      const { lastID } = await db.run("INSERT INTO users (phone) VALUES (?)", [phone]);
      return jwt.sign({ userId: lastID, kind: "phone" }, JWT_SECRET, { expiresIn: "1h" });
    };
    const [normal, other, exempt] = [await tokenFor(NORMAL), await tokenFor(OTHER), await tokenFor(EXEMPT)];
    await db.close();

    for (let i = 1; i <= 10; i++) {
      assert.equal((await post(base, "/api/analyze/start", normal)).status, 202, `تحلیلِ ${i}`);
    }
    const blocked = await post(base, "/api/analyze/start", normal);
    assert.equal(blocked.status, 429);
    assert.equal((await blocked.json()).error, "سقفِ تحلیلِ روزانه پر شده است. لطفاً فردا دوباره تلاش کنید.");

    assert.equal((await post(base, "/api/analyze/start", other)).status, 202);
    for (let i = 1; i <= 12; i++) {
      assert.equal((await post(base, "/api/analyze/start", exempt)).status, 202, `معاف ${i}`);
    }
  });
});

test("سقفِ بدنه: مسیرِ بی‌حساب ۲۵۶ کیلوبایت، مسیرِ عکس فقط بعد از ورود، و بدنهٔ خراب از سهمیه کم نمی‌کند", async () => {
  await withServer("production", { RATE_LIMIT_MAX: "1000" }, async (base, dbFile) => {
    const db = await open({ filename: dbFile, driver: sqlite3.Database });
    const { lastID } = await db.run("INSERT INTO users (phone) VALUES (?)", ["09120000002"]);
    await db.close();
    const token = jwt.sign({ userId: lastID, kind: "phone" }, JWT_SECRET, { expiresIn: "1h" });
    const KB = 1024;

    const big = await post(base, "/api/contact", null, bodyOf(300 * KB));
    assert.equal(big.status, 413);
    assert.equal((await big.json()).error, "حجم درخواست بیش از حد مجاز است.");
    const broken = await post(base, "/api/contact", null, "{not json");
    assert.equal(broken.status, 400);
    assert.equal((await broken.json()).error, "بدنهٔ درخواست معتبر نیست.");
    assert.equal((await post(base, "/api/auth/request-otp", null, bodyOf(300 * KB))).status, 413);
    assert.equal((await post(base, "/api/contact", null, JSON.stringify({ contact: "a@b.co", message: "سلام" }))).status, 200);
    assert.equal((await post(base, "/api/payment/verify", null, JSON.stringify({ authority: "missing" }))).status, 404);

    // بدون ورود، بدنهٔ بزرگ پیش از پارس رد می‌شود؛ با ورود، حجمِ عکس پذیرفته است.
    assert.equal((await post(base, "/api/analyze/start", null, bodyOf(KB * KB))).status, 401);
    assert.equal((await post(base, "/api/analyze/start", token, bodyOf(KB * KB))).status, 202);
    assert.equal((await post(base, "/api/analyze/start", token, bodyOf(61 * KB * KB))).status, 413);

    for (let i = 0; i < 12; i++) {
      assert.equal((await post(base, "/api/analyze/start", token, "{not json")).status, 400);
    }
    for (let i = 2; i <= 10; i++) {
      assert.equal((await post(base, "/api/analyze/start", token)).status, 202, `تحلیلِ ${i}`);
    }
    assert.equal((await post(base, "/api/analyze/start", token)).status, 429);
  });
});

// بوتِ رد شده: پروسه باید با کدِ غیرصفر بیرون برود و نام متغیر را بگوید، نه اینکه ناامن بالا بیاید.
function bootResult(env) {
  const dir = mkdtempSync(path.join(tmpdir(), "boot-check-"));
  return new Promise(async (resolve) => {
    const port = await freePort();
    const child = spawn(process.execPath, ["server.js"], {
      cwd: HERE,
      stdio: ["ignore", "ignore", "pipe"],
      env: {
        ...process.env,
        NODE_ENV: "production",
        PORT: String(port),
        DB_FILE: path.join(dir, "test.sqlite"),
        AUTH_REQUIRED: "true",
        JWT_SECRET,
        AVALAI_API_KEY: "test-key-never-used",
        ALLOWED_ORIGINS: "https://test.local",
        ZARINPAL_MERCHANT_ID: "11111111-1111-1111-1111-111111111111",
        ZARINPAL_SANDBOX: "false",
        TRUST_PROXY: "",
        ...env,
      },
    });
    let stderr = "";
    child.stderr.on("data", (d) => { stderr += d; });
    const finish = (code) => {
      clearTimeout(timer);
      rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      resolve({ code, stderr });
    };
    child.once("exit", finish);
    // رد شدن با خروج خودش تمام می‌شود، پس مهلت فقط برای وقتی است که بالا آمده؛ کوتاهش نکن: زیر بار هوک، بوت ثانیه‌ها طول می‌کشد.
    const timer = setTimeout(() => { child.removeListener("exit", finish); child.once("exit", () => finish("still-running")); child.kill(); }, 60000);
  });
}

for (const [name, env, label] of [
  ["AUTH_REQUIRED خاموش", { AUTH_REQUIRED: "" }, "AUTH_REQUIRED"],
  ["کلید AvalAI خالی", { AVALAI_API_KEY: "" }, "AVALAI_API_KEY"],
  ["ALLOWED_ORIGINS خالی", { ALLOWED_ORIGINS: "" }, "ALLOWED_ORIGINS"],
  ["مبدأ http در production حذف می‌شود و چیزی نمی‌ماند", { ALLOWED_ORIGINS: "http://example.com" }, "ALLOWED_ORIGINS"],
  ["مرچنت خالی", { ZARINPAL_MERCHANT_ID: "" }, "ZARINPAL"],
  ["ZARINPAL_SANDBOX روشن", { ZARINPAL_SANDBOX: "true" }, "ZARINPAL"],
]) {
  test(`بوتِ production رد می‌شود: ${name}`, async () => {
    const { code, stderr } = await bootResult(env);
    assert.notEqual(code, "still-running", "سرور با تنظیمِ ناامن بالا آمد");
    assert.notEqual(code, 0);
    assert.match(stderr, new RegExp(label));
    assert.doesNotMatch(stderr, /test-key-never-used|test-secret-for-route-check/);
  });
}

test("کد ورودِ ایمیلی بی‌فرستندهٔ واقعی در production چاپ نمی‌شود و ۵۰۳ می‌گیرد", async () => {
  await withServer("production", {}, async (base) => {
    const res = await post(base, "/api/auth/request-email-otp", null, JSON.stringify({ email: "a@example.com" }));
    assert.equal(res.status, 503);
    assert.match((await res.json()).error, /ارسالِ کد انجام نشد/);
  });
});
