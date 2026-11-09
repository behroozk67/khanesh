// مسیرِ پولیِ واقعی روی سرورِ production: اعطای اعتبار، مالکیتِ نتیجه، معافیت و needsPlan.
// زرین‌پال با یک fetchِ جعلی داخلِ پروسهٔ سرور جایگزین می‌شود؛ پنلِ طبیعی هیچ مدل زبانی‌ای را صدا نمی‌زند.
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
const JWT_SECRET = "test-secret-for-payment-flow-only";
const FAKE_ZARINPAL = `
const real = globalThis.fetch; let n = 0;
globalThis.fetch = async (u, o) => {
  const s = String(u);
  if (!s.includes("zarinpal.com")) return real(u, o);
  const data = s.endsWith("request.json")
    ? { code: 100, authority: "A00000000000000000000000000000" + (++n), fee: 0 }
    : { code: 100, ref_id: 777, card_pan: "502229******1234", card_hash: "h", fee: 0 };
  return new Response(JSON.stringify({ data }), { status: 200 });
};`;

const PANEL = {
  patient: { age: 35, sex: "M" },
  testResults: "WBC 7000",
  tests: [
    { name: "WBC", value: 7000 },
    { name: "Hemoglobin", value: 15.0, unit: "g/dL" },
    { name: "Platelet", value: 250000 },
    { name: "Creatinine", value: 1.0, unit: "mg/dL" },
    { name: "FBS", value: 90, unit: "mg/dL" },
    { name: "Potassium", value: 4.2 },
    { name: "Sodium", value: 140 },
  ],
};

const freePort = () => new Promise((resolve, reject) => {
  const s = createServer();
  s.once("error", reject);
  s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); });
});

async function withServer(extraEnv, fn) {
  const port = await freePort();
  const dir = mkdtempSync(path.join(tmpdir(), "payment-flow-"));
  const dbFile = path.join(dir, "test.sqlite");
  const child = spawn(process.execPath, ["--import", `data:text/javascript,${encodeURIComponent(FAKE_ZARINPAL)}`, "server.js"], {
    cwd: HERE,
    stdio: ["ignore", "ignore", "pipe"],
    env: {
      ...process.env, NODE_ENV: "production", PORT: String(port), DB_FILE: dbFile, AUTH_REQUIRED: "true", JWT_SECRET,
      AVALAI_API_KEY: "test-key-never-used", ALLOWED_ORIGINS: "https://test.local", TRUST_PROXY: "", RATE_LIMIT_MAX: "1000",
      ZARINPAL_MERCHANT_ID: "11111111-1111-1111-1111-111111111111", ZARINPAL_SANDBOX: "false",
      REQUIRE_PAYMENT: "true", PAYMENT_EXEMPT_PHONES: "", PAYMENT_TEST_PHONES: "", SITE_ORIGIN: "https://example.test",
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
    const db = await open({ filename: dbFile, driver: sqlite3.Database });
    const tokenFor = async (phone) => {
      const { lastID } = await db.run("INSERT INTO users (phone) VALUES (?)", [phone]);
      return jwt.sign({ userId: lastID, kind: "phone" }, JWT_SECRET, { expiresIn: "1h" });
    };
    const call = async (method, p, token, body) => {
      const res = await fetch(`${base}${p}`, {
        method,
        headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return { status: res.status, body: await res.json().catch(() => null) };
    };
    try {
      return await fn({ tokenFor, call });
    } finally {
      await db.close();
    }
  } finally {
    child.kill();
    await exited;
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

/** تحلیلِ کاربرِ بی‌اعتبار را تا پیش‌فاکتور می‌برد و Authority را برمی‌گرداند. */
async function awaitingAuthority(call, token, planId) {
  const start = await call("POST", "/api/analyze/start", token, { ...PANEL, planId });
  assert.equal(start.status, 202);
  for (let i = 0; i < 100; i++) {
    const job = await call("GET", `/api/analyze/job/${start.body.job_id}`, token);
    if (job.body?.status === "awaiting_payment") return job.body.authority;
    assert.notEqual(job.body?.status, "failed", JSON.stringify(job.body));
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("کار به پیش‌فاکتور نرسید");
}

const verify = (call, authority, token) => call("POST", "/api/payment/verify", token, { authority, status: "OK" });

test("خریدِ پلن: اعتبارِ کامل، یک بار، و needsPlan خاموش", async () => {
  await withServer({}, async ({ tokenFor, call }) => {
    const u = await tokenFor("09120000001");
    assert.equal((await call("GET", "/api/plan", u)).body.needsPlan, true, "بی‌اعتبار باید پلن بخرد");

    const req = await call("POST", "/api/payment/request", u, { planId: "empire" });
    assert.equal(req.status, 200);
    assert.equal((await verify(call, req.body.authority)).status, 200, "برگشت از درگاه بی‌توکن هم اعتبار می‌دهد");
    await verify(call, req.body.authority, u);

    const plan = (await call("GET", "/api/plan", u)).body;
    assert.equal(plan.credits, 3, "تأییدِ دوباره اعتبار اضافه نمی‌کند");
    assert.equal(plan.planId, "empire");
    assert.equal(plan.needsPlan, false);
  });
});

test("پرداختِ وابسته به تحلیل: همان تحلیل یکی از اعتبارهای پلن است", async () => {
  await withServer({}, async ({ tokenFor, call }) => {
    const starter = await tokenFor("09120000001");
    await verify(call, await awaitingAuthority(call, starter, "starter"), starter);
    assert.equal((await call("GET", "/api/plan", starter)).body.credits, 0, "پایه: نتیجه تحویل شد، اعتبارِ اضافه نباید بماند");

    const empire = await tokenFor("09120000002");
    await verify(call, await awaitingAuthority(call, empire, "empire"), empire);
    assert.equal((await call("GET", "/api/plan", empire)).body.credits, 2, "پایش سلامت: ۳ نوبت، یکی همین تحلیل");
  });
});

test("نتیجهٔ بیمار فقط به مالکِ پرداخت می‌رسد؛ داشتنِ Authority کافی نیست", async () => {
  await withServer({}, async ({ tokenFor, call }) => {
    const owner = await tokenFor("09120000001");
    const stranger = await tokenFor("09120000002");
    const authority = await awaitingAuthority(call, owner, "starter");

    const first = await verify(call, authority);
    assert.equal(first.status, 200);
    assert.equal(first.body.result ?? null, null, "بی‌توکن: نتیجه نباید برگردد");
    assert.equal(first.body.cardPan ?? null, null, "بی‌توکن: شمارهٔ کارت نباید برگردد");
    assert.equal(first.body.refId, "777", "شمارهٔ پیگیری برای خریدارِ با نشستِ منقضی می‌ماند");

    assert.equal((await verify(call, authority, stranger)).body.result ?? null, null, "کاربرِ دیگر نباید نتیجه را ببیند");

    let again;
    for (let i = 0; i < 50 && !again?.body?.result; i++) {
      again = await verify(call, authority, owner);
      if (!again.body?.result) await new Promise((r) => setTimeout(r, 100));
    }
    assert.equal(typeof again.body.result?.summary, "string", "مالک نتیجه‌اش را می‌گیرد");
    assert.equal(again.body.result?._engine?.expert, undefined, "پلن پایه: نمای تخصصی حتی در تأییدِ دوباره قفل است");
  });
});

test("شمارهٔ معاف با پرداختِ روشن: همهٔ قابلیت‌ها باز، بی‌نیاز به پلن", async () => {
  const EXEMPT = "09120000009";
  await withServer({ PAYMENT_EXEMPT_PHONES: EXEMPT }, async ({ tokenFor, call }) => {
    const plan = (await call("GET", "/api/plan", await tokenFor(EXEMPT))).body;
    assert.equal(plan.needsPlan, false);
    assert.equal(plan.paymentApplies, false);
    assert.equal(plan.planId, "unicorn", "معاف نباید پشتِ قفلِ پلن پایه بماند");
  });
});

test("REQUIRE_PAYMENT=false: فقط شمارهٔ تست باید پلن بخرد", async () => {
  const TESTER = "09120000005";
  await withServer({ REQUIRE_PAYMENT: "false", PAYMENT_TEST_PHONES: TESTER }, async ({ tokenFor, call }) => {
    assert.equal((await call("GET", "/api/plan", await tokenFor(TESTER))).body.needsPlan, true);
    assert.equal((await call("GET", "/api/plan", await tokenFor("09120000006"))).body.needsPlan, false);
  });
});
