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
const real = globalThis.fetch; let n = 0; const unverified = new Set();
globalThis.fetch = async (u, o) => {
  const s = String(u);
  if (/127\\.0\\.0\\.1|localhost/.test(s)) return real(u, o);
  if (s.includes("zarinpal.com")) {
    let data;
    if (s.endsWith("request.json")) {
      const authority = "A00000000000000000000000000000" + (++n);
      // فقط تراکنشی که با auto_verify=false ساخته شده در فهرستِ تأییدنشده می‌نشیند (رفتارِ مستندِ زرین‌پال).
      if (JSON.parse(o.body).metadata?.auto_verify === false) unverified.add(authority);
      data = { code: 100, authority, fee: 0 };
    } else if (s.endsWith("unVerified.json")) {
      data = { code: 100, authorities: [...unverified].map((authority) => ({ authority, amount: 1 })) };
    } else {
      unverified.delete(JSON.parse(o.body).authority);
      data = { code: 100, ref_id: 777, card_pan: "502229******1234", card_hash: "h", fee: 0 };
    }
    return new Response(JSON.stringify({ data }), { status: 200 });
  }
  return new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }), { status: 200 });
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
      AVALAI_API_KEY: "test-key-never-used", ALLOWED_ORIGINS: "", TRUST_PROXY: "", RATE_LIMIT_MAX: "1000",
      ZARINPAL_MERCHANT_ID: "11111111-1111-1111-1111-111111111111", ZARINPAL_SANDBOX: "false",
      REQUIRE_PAYMENT: "true", PAYMENT_EXEMPT_PHONES: "", PAYMENT_TEST_PHONES: "", SITE_ORIGIN: "https://example.test", RECONCILE_MS: "0",
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
    const db = await open({ filename: dbFile, driver: sqlite3.Database });
    const tokenFor = async (phone) => {
      const { lastID } = await db.run("INSERT INTO users (phone) VALUES (?)", [phone]);
      return jwt.sign({ userId: lastID, kind: "phone" }, JWT_SECRET, { expiresIn: "1h" });
    };
    const call = async (method, p, token, body, member) => {
      const res = await fetch(`${base}${p}`, {
        method,
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(member ? { "x-member-id": String(member) } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return { status: res.status, body: await res.json().catch(() => null) };
    };
    try {
      return await fn({ tokenFor, call, db });
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
async function runJob(call, token, body, member) {
  const start = await call("POST", "/api/analyze/start", token, body, member);
  assert.equal(start.status, 202, JSON.stringify(start.body));
  for (let i = 0; i < 150; i++) {
    const job = await call("GET", `/api/analyze/job/${start.body.job_id}`, token);
    if (job.body?.status && !["running", "pending", "queued"].includes(job.body.status)) return job.body;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("کار تمام نشد");
}

async function awaitingAuthority(call, token, planId) {
  const job = await runJob(call, token, { ...PANEL, planId });
  assert.equal(job.status, "awaiting_payment", JSON.stringify(job));
  return job.authority;
}

const give = (db, phone, credits, plan) => db.run("UPDATE users SET credits = ?, active_plan = ? WHERE phone = ?", [credits, plan, phone]);
const MEMBER = { firstName: "سارا", lastName: "کاربر", sex: "female", ageValue: 12, ageUnit: "year", conditions: ["none"] };

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

test("قیمت واحد: هر پلن یک مبلغ دارد، ورودیِ cycle بی‌اثر است", async () => {
  await withServer({}, async ({ tokenFor, call }) => {
    const u = await tokenFor("09120000001");
    for (const [planId, amount] of [["starter", 33000], ["empire", 89000], ["unicorn", 159000]]) {
      for (const cycle of [undefined, "single", "bundle"]) {
        assert.equal((await call("POST", "/api/payment/request", u, { planId, cycle })).body.amount, amount, `${planId}/${cycle}`);
      }
    }
    assert.deepEqual((await call("GET", "/api/plan", u)).body.plans.map((p) => p.price), [33000, 89000, 159000]);
  });
});

test("برگهٔ تفسیرنشده: نه پول می‌گیرد نه اعتبار کم می‌کند", async () => {
  await withServer({}, async ({ tokenFor, call, db }) => {
    const UNREADABLE = { patient: PANEL.patient, testResults: "سلام", tests: [{ name: "نامشخص", value: "x" }] };
    const none = await tokenFor("09120000001");
    const a = await runJob(call, none, UNREADABLE);
    assert.notEqual(a.status, "awaiting_payment", "برگهٔ تفسیرنشده نباید پیش‌فاکتور بدهد");
    assert.match(a.result.summary, /تفسیر نشد/);

    const withCredit = await tokenFor("09120000002");
    await give(db, "09120000002", 1, "starter");
    await runJob(call, withCredit, UNREADABLE);
    assert.equal((await call("GET", "/api/plan", withCredit)).body.credits, 1, "اعتبار نباید کم شود");
    await runJob(call, withCredit, PANEL);
    assert.equal((await call("GET", "/api/plan", withCredit)).body.credits, 0, "نتیجهٔ واقعی یک اعتبار می‌گیرد");
  });
});

test("خریدِ پلن پایین‌تر پلن بالاتر را پایین نمی‌آورد", async () => {
  await withServer({}, async ({ tokenFor, call, db }) => {
    const u = await tokenFor("09120000001");
    await give(db, "09120000001", 2, "unicorn");
    const req = await call("POST", "/api/payment/request", u, { planId: "starter" });
    await verify(call, req.body.authority, u);
    const plan = (await call("GET", "/api/plan", u)).body;
    assert.equal(plan.planId, "unicorn");
    assert.equal(plan.credits, 3);
    const up = await tokenFor("09120000002");
    await give(db, "09120000002", 0, "starter");
    await verify(call, (await call("POST", "/api/payment/request", up, { planId: "empire" })).body.authority, up);
    assert.equal((await call("GET", "/api/plan", up)).body.planId, "empire", "خریدِ پلن بالاتر همچنان ارتقا می‌دهد");
  });
});

test("پیش‌فاکتورِ برگهٔ اورژانسی هشدار دارد و جزئیات را لو نمی‌دهد", async () => {
  await withServer({}, async ({ tokenFor, call }) => {
    const u = await tokenFor("09120000001");
    const critical = { patient: PANEL.patient, testResults: "K 7.5", tests: [{ name: "Potassium", value: 7.5 }, { name: "Hemoglobin", value: 15, unit: "g/dL" }] };
    const job = await runJob(call, u, critical);
    assert.equal(job.status, "awaiting_payment");
    assert.equal(job.has_critical, true);
    assert.equal(job.urgency, "emergency");
    assert.equal(job.result, undefined, "متنِ نتیجه پیش از پرداخت نمی‌آید");
    const normal = await runJob(call, await tokenFor("09120000002"), PANEL);
    assert.equal(normal.has_critical, false);
  });
});

test("پرداختِ بدونِ برگشت به سایت: بررسیِ دوره‌ای آن را تأیید و اعتبار را ثبت می‌کند", async () => {
  await withServer({ RECONCILE_MS: "200" }, async ({ tokenFor, call }) => {
    const u = await tokenFor("09120000001");
    assert.equal((await call("POST", "/api/payment/request", u, { planId: "empire" })).status, 200);
    let plan;
    for (let i = 0; i < 50; i++) {
      plan = (await call("GET", "/api/plan", u)).body;
      if (plan.credits > 0) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.equal(plan.credits, 3);
    await new Promise((r) => setTimeout(r, 500));
    assert.equal((await call("GET", "/api/plan", u)).body.credits, 3, "بررسیِ بعدی دوباره اعتبار نمی‌دهد");
  });
});

test("آخرین نتیجه از سرور: فقط برای مالک، فقط نتیجهٔ تحویل‌شده", async () => {
  await withServer({}, async ({ tokenFor, call, db }) => {
    const u = await tokenFor("09120000001");
    assert.equal((await call("GET", "/api/analyze/latest", u)).status, 404);
    await runJob(call, u, PANEL); // بی‌اعتبار: در انتظارِ پرداخت
    assert.equal((await call("GET", "/api/analyze/latest", u)).status, 404, "نتیجهٔ پرداخت‌نشده نباید برگردد");
    await give(db, "09120000001", 1, "starter");
    await runJob(call, u, PANEL);
    let latest;
    for (let i = 0; i < 30 && latest?.status !== 200; i++) {
      latest = await call("GET", "/api/analyze/latest", u);
      if (latest.status !== 200) await new Promise((r) => setTimeout(r, 100));
    }
    assert.equal(latest.status, 200);
    assert.equal(typeof latest.body.result.summary, "string");
    assert.equal(latest.body.result._engine?.expert, undefined, "قفلِ نمای تخصصی پلن پایه می‌ماند");
    assert.equal((await call("GET", "/api/plan", u)).body.hasLatestResult, true);
    assert.equal((await call("GET", "/api/analyze/latest", await tokenFor("09120000002"))).status, 404);
    assert.equal((await call("GET", "/api/analyze/latest")).status, 401);
  });
});

test("پروفایل خانواده: فقط پلن خانواده، سقفِ سه عضو، جدا از صاحبِ حساب", async () => {
  await withServer({}, async ({ tokenFor, call, db }) => {
    const starter = await tokenFor("09120000001");
    await give(db, "09120000001", 5, "empire");
    const denied = await call("POST", "/api/profile/members", starter, MEMBER);
    assert.equal(denied.status, 403);
    assert.equal(denied.body.code, "plan_required");

    const u = await tokenFor("09120000002");
    await give(db, "09120000002", 6, "unicorn");
    assert.equal((await call("POST", "/api/profile/members", u, { firstName: "ناقص" })).status, 400, "عضوِ ناقص ساخته نمی‌شود");
    const ids = [];
    for (let i = 0; i < 3; i++) {
      const r = await call("POST", "/api/profile/members", u, { ...MEMBER, firstName: `عضو${i}` });
      assert.equal(r.status, 201, JSON.stringify(r.body));
      ids.push(r.body.member.id);
    }
    const fourth = await call("POST", "/api/profile/members", u, MEMBER);
    assert.equal(fourth.status, 409);
    const list = (await call("GET", "/api/profile/members", u)).body;
    assert.equal(list.members.length, 3);
    assert.equal(list.max, 3);

    const edited = await call("PATCH", `/api/profile/members/${ids[0]}`, u, { firstName: "تغییر" });
    assert.equal(edited.body.member.firstName, "تغییر");

    // جداسازی از حسابِ دیگر
    assert.equal((await call("GET", `/api/profile/members/${ids[0]}`, starter)).status, 404);
    assert.equal((await call("PATCH", `/api/profile/members/${ids[0]}`, starter, { firstName: "x" })).status, 404);
    assert.equal((await call("DELETE", `/api/profile/members/${ids[0]}`, starter)).status, 404);
    const stolen = await call("POST", "/api/analyze/start", starter, PANEL, ids[0]);
    assert.equal(stolen.status, 404, "تحلیل با شناسهٔ عضوِ حسابِ دیگر رد می‌شود");

    // تاریخچه و نتیجهٔ هر عضو جداست؛ اعتبار مشترکِ حساب است
    await runJob(call, u, PANEL, ids[0]);
    assert.equal((await call("GET", "/api/plan", u)).body.credits, 5);
    let memberHist;
    for (let i = 0; i < 30 && !memberHist?.count; i++) {
      memberHist = (await call("GET", "/api/history", u, undefined, ids[0])).body;
      if (!memberHist.count) await new Promise((r) => setTimeout(r, 100));
    }
    assert.equal(memberHist.count, 1);
    assert.equal((await call("GET", "/api/history", u)).body.count, 0, "تاریخچهٔ صاحبِ حساب نباید عددِ عضو را ببیند");
    assert.equal((await call("GET", "/api/history", u, undefined, ids[1])).body.count, 0, "تاریخچهٔ عضوِ دیگر هم همین‌طور");
    for (let i = 0; i < 30; i++) {
      if ((await call("GET", "/api/analyze/latest", u, undefined, ids[0])).status === 200) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.equal((await call("GET", "/api/analyze/latest", u, undefined, ids[0])).status, 200);
    assert.equal((await call("GET", "/api/analyze/latest", u)).status, 404, "نتیجهٔ عضو به‌نامِ صاحبِ حساب نشان داده نمی‌شود");

    // حذفِ عضو همهٔ داده‌هایش را می‌برد
    assert.equal((await call("DELETE", `/api/profile/members/${ids[0]}`, u)).status, 200);
    assert.equal((await call("GET", "/api/analyze/latest", u, undefined, ids[0])).status, 404);
    const left = await db.get("SELECT COUNT(*) n FROM lab_events WHERE owner LIKE ?", [`%:m:${ids[0]}`]);
    assert.equal(left.n, 0);

    // حذفِ حساب هم عضوها و داده‌هایشان را می‌برد
    await runJob(call, u, PANEL, ids[1]);
    assert.equal((await call("DELETE", "/api/auth/me", u, { confirm: true })).status, 200);
    assert.equal((await db.get("SELECT COUNT(*) n FROM family_members")).n, 0);
    assert.equal((await db.get("SELECT COUNT(*) n FROM lab_events WHERE owner LIKE '%:m:%'")).n, 0);
  });
});

test("تاریخچه فقط نتیجهٔ تحویل‌شده را می‌بیند: برگهٔ پرداخت‌نشده از راهِ /history لو نمی‌رود", async () => {
  await withServer({}, async ({ tokenFor, call, db }) => {
    const u = await tokenFor("09120000001");
    await give(db, "09120000001", 0, "empire");   // پلن بالا، اعتبار تمام‌شده
    const job = await runJob(call, u, PANEL);
    assert.equal(job.status, "awaiting_payment");
    await new Promise((r) => setTimeout(r, 400));
    assert.equal((await call("GET", "/api/history", u)).body.count, 0, "پیش از پرداخت هیچ عددی نباید در تاریخچه باشد");
    assert.deepEqual((await call("GET", "/api/history/trends", u)).body.markers, []);

    await verify(call, job.authority, u);
    let hist;
    for (let i = 0; i < 30 && !hist?.count; i++) {
      hist = (await call("GET", "/api/history", u)).body;
      if (!hist.count) await new Promise((r) => setTimeout(r, 100));
    }
    assert.equal(hist.count, 1, "بعد از پرداخت با همان مالک ثبت می‌شود");
  });
});
