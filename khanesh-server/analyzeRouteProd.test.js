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
      ALLOWED_ORIGINS: "",
      TRUST_PROXY: "",
      PAYMENT_EXEMPT_PHONES: "",
      ...extraEnv,
    },
  });
  let stderr = "";
  child.stderr.on("data", (d) => { stderr += d; });
  const exited = new Promise((resolve) => child.once("exit", resolve));

  try {
    const base = `http://127.0.0.1:${port}`;
    let up = false;
    for (let i = 0; i < 100 && !up && child.exitCode === null; i++) {
      up = await fetch(`${base}/health`).then((r) => r.ok, () => false);
      if (!up) await new Promise((r) => setTimeout(r, 200));
    }
    assert.ok(up, `server did not start: ${stderr.slice(0, 500)}`);
    return await fn(base, dbFile);
  } finally {
    child.kill();
    await exited;
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

const post = (base, p, token) => fetch(`${base}${p}`, {
  method: "POST",
  headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
  body: "{}",   // بدنهٔ خالی پیش از هر فراخوانیِ AvalAI با خطای ۴۰۰ در کار تمام می‌شود
});

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
