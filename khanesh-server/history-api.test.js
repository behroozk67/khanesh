// ============================================================
// قراردادِ HTTP تاریخچهٔ آزمایش‌ها (P120)
//
// چه چیزی را قفل می‌کند:
//   • ذخیره و خواندنِ نوبت‌ها، و **جداییِ مالک‌ها** (دستگاه A نباید B را ببیند).
//   • مقایسهٔ نوبت‌ها با همان آستانهٔ RCVِ موتور.
//   • ویرایشِ تاریخِ نمونه و حذف.
//   • برچسبِ تاریخِ فارسی در پاسخ.
//
// ⚠️ هیچ شبکه‌ای لازم نیست: ردیف‌ها مستقیم در DBِ موقت نوشته می‌شوند و فقط
//    مسیرهای `/api/history/*` با HTTP واقعی آزموده می‌شوند.
// ============================================================

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import http from "node:http";

// ── محیطِ تست — پیش از import شدنِ server.js ────────────────
const DB_FILE = path.join(os.tmpdir(), `khanesh-history-${process.pid}.sqlite`);
process.env.PORT = "0";
process.env.DB_FILE = DB_FILE;
process.env.AVALAI_API_KEY = "test-key-never-used";
process.env.USE_ENGINE = "true";
process.env.ALLOWED_ORIGINS = "";
process.env.RATE_LIMIT_MAX = "10000";
process.env.AUTH_REQUIRED = "";              // مسیرِ شناسهٔ دستگاه آزموده شود

const quiet = { log: console.log, warn: console.warn };
let baseUrl = "";

// ── گرفتنِ دستهٔ سرور ────────────────────────────────────────
// server.js چیزی export نمی‌کند؛ برای بستنِ سرور بعد از تست، createServer را
// قبل از import کردنِ آن می‌گیریم (همان ترفندِ api-contract.test.js).
let serverHandle = null;
const realCreateServer = http.createServer;
http.createServer = function patchedCreateServer(...args) {
  const s = realCreateServer.apply(this, args);
  serverHandle = s;
  return s;
};

const DEV_A = "deviceAAAAAAAA1234";
const DEV_B = "deviceBBBBBBBB5678";

const req = (p, opts = {}) =>
  fetch(baseUrl + p, {
    ...opts,
    headers: { "content-type": "application/json", ...(opts.headers || {}) },
  }).then(async (r) => ({ status: r.status, body: await r.json() }));

before(async () => {
  console.log = () => {};
  console.warn = () => {};

  await import("./server.js");

  const deadline = Date.now() + 10_000;
  while (!serverHandle && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 10));
  }
  if (!serverHandle) throw new Error("سرور در ۱۰ ثانیه بالا نیامد");
  await new Promise((resolve) => {
    if (serverHandle.listening) return resolve();
    serverHandle.once("listening", resolve);
  });
  baseUrl = `http://127.0.0.1:${serverHandle.address().port}`;

  const { ownerOf } = await import("./historyRoutes.js");
  const { insertLabEvent } = await import("./database.js");
  const owner = ownerOf({ user: { userId: 1, anonymous: true }, get: () => DEV_A });

  // سه نوبتِ کراتینین برای دستگاه A — ۱٫۰ → ۱٫۱ (زیرِ RCV) → ۱٫۶ (بالای RCV)
  const mk = (id, date, creat, hgb) => ({
    id, owner, jobId: `job-${id}`, takenAt: date, source: "upload", labName: "آزمایشگاه نمونه",
    observations: [
      { marker_key: "CREAT", value: creat, unit: "mg/dL", range: "0.7–1.3", abnormal: creat > 1.3, dir: creat > 1.3 ? "high" : null },
      ...(hgb ? [{ marker_key: "HGB", value: hgb, unit: "g/dL", range: "13–17", abnormal: hgb < 13, dir: hgb < 13 ? "low" : null }] : []),
    ],
  });
  await insertLabEvent(mk("lab-a1", "2025-11-01T09:00:00.000Z", 1.0, 14.2));
  await insertLabEvent(mk("lab-a2", "2026-01-15T09:00:00.000Z", 1.1, 13.8));
  await insertLabEvent(mk("lab-a3", "2026-04-20T09:00:00.000Z", 1.6, 12.6));

  // یک نوبت برای دستگاه B — نباید در خروجیِ A دیده شود
  await insertLabEvent({
    id: "lab-b1", owner: ownerOf({ user: { userId: 1, anonymous: true }, get: () => DEV_B }),
    jobId: "job-b1", takenAt: "2026-04-20T09:00:00.000Z", source: "upload", labName: null,
    observations: [{ marker_key: "CREAT", value: 0.8, unit: "mg/dL", range: "0.7–1.3", abnormal: false, dir: null }],
  });
});

after(async () => {
  console.log = quiet.log;
  console.warn = quiet.warn;
  if (serverHandle) {
    serverHandle.closeAllConnections?.();
    await new Promise((r) => serverHandle.close(r));
  }
  http.createServer = realCreateServer;
  const { closeDb } = await import("./database.js");
  await closeDb();
  try { fs.unlinkSync(DB_FILE); } catch { /* پاک‌شدنِ فایل اختیاری است */ }
});

// ══════════════════════════════════════════════════════════════
// A1 — فهرستِ نوبت‌ها
// ══════════════════════════════════════════════════════════════
test("A1: فهرستِ نوبت‌ها فقط مالکِ همان دستگاه را می‌دهد", async () => {
  const { status, body } = await req("/api/history", { headers: { "x-device-id": DEV_A } });
  assert.equal(status, 200);
  assert.equal(body.count, 3);
  assert.deepEqual(body.labs.map((l) => l.id), ["lab-a3", "lab-a2", "lab-a1"]);   // تازه‌ترین اول
  assert.equal(body.labs[0].markers, 2);
  assert.equal(body.labs[0].abnormal, 2);
  assert.ok(body.labs[0].taken_fa && body.labs[0].taken_fa.length > 0, "تاریخِ فارسی باید باشد");
});

test("A1b: دستگاهِ دیگر همان ردیف‌ها را نمی‌بیند", async () => {
  const { body } = await req("/api/history", { headers: { "x-device-id": DEV_B } });
  assert.equal(body.count, 1);
  assert.equal(body.labs[0].id, "lab-b1");
});

test("A1c: بی‌شناسهٔ دستگاه و بی‌ورود ⇒ ۴۰۰ با کدِ no_owner", async () => {
  const { status, body } = await req("/api/history");
  assert.equal(status, 400);
  assert.equal(body.code, "no_owner");
});

// ══════════════════════════════════════════════════════════════
// A2 — روند و مقایسه
// ══════════════════════════════════════════════════════════════
test("A2: آخرین نوبت در برابرِ نوبتِ قبل با آستانهٔ RCV سنجیده می‌شود", async () => {
  const { status, body } = await req("/api/history/trends?keys=CREAT", { headers: { "x-device-id": DEV_A } });
  assert.equal(status, 200);
  assert.equal(body.markers.length, 1);
  const m = body.markers[0];
  assert.equal(m.key, "CREAT");
  assert.equal(m.count, 3);
  assert.equal(m.latest.value, 1.6);
  assert.equal(m.previous.value, 1.1);
  assert.equal(m.baseline.value, 1.0);
  assert.equal(m.rcvPct, 18);
  assert.equal(m.significant, true);
  assert.equal(m.zone.kind, "to_abnormal");
  assert.equal(m.comparable, true);
  assert.match(m.fa, /۱۸٪/);
  assert.ok(m.latest_fa, "برچسبِ تاریخِ آخرین نوبت لازم است");
});

test("A2b: بدونِ فیلتر، همهٔ مارکرها می‌آیند و غیرطبیعی‌ها اول", async () => {
  const { body } = await req("/api/history/trends", { headers: { "x-device-id": DEV_A } });
  assert.equal(body.summary.markers, 2);
  assert.equal(body.summary.labs, 3);
  assert.equal(body.summary.abnormalNow, 2);      // CREAT و HGB در آخرین نوبت
  assert.equal(body.markers[0].followUp, true);
});

// ══════════════════════════════════════════════════════════════
// A3 — ویرایشِ تاریخِ نمونه
// ══════════════════════════════════════════════════════════════
test("A3: تاریخِ نمونه را می‌شود اصلاح کرد و مقایسه از نو حساب می‌شود", async () => {
  const before = await req("/api/history/labs/lab-a2", { headers: { "x-device-id": DEV_A } });
  assert.equal(before.body.lab.taken_at, "2026-01-15T09:00:00.000Z");

  const patched = await req("/api/history/labs/lab-a2", {
    method: "PATCH",
    headers: { "x-device-id": DEV_A },
    body: JSON.stringify({ takenAt: "2025-12-01T00:00:00.000Z" }),
  });
  assert.equal(patched.status, 200);

  const after = await req("/api/history/labs/lab-a2", { headers: { "x-device-id": DEV_A } });
  assert.equal(after.body.lab.taken_at, new Date("2025-12-01T00:00:00.000Z").toISOString());
  assert.equal(after.body.lab.observations.length, 2, "ویرایشِ تاریخ نباید ردیف‌ها را پاک کند");
});

test("A3b: تاریخِ آینده و تاریخِ بی‌معنا رد می‌شوند", async () => {
  const future = await req("/api/history/labs/lab-a1", {
    method: "PATCH", headers: { "x-device-id": DEV_A },
    body: JSON.stringify({ takenAt: "2099-01-01T00:00:00.000Z" }),
  });
  assert.equal(future.status, 400);
  const junk = await req("/api/history/labs/lab-a1", {
    method: "PATCH", headers: { "x-device-id": DEV_A },
    body: JSON.stringify({ takenAt: "not-a-date" }),
  });
  assert.equal(junk.status, 400);
});

// ══════════════════════════════════════════════════════════════
// A4 — حذف و جداییِ مالک
// ══════════════════════════════════════════════════════════════
test("A4: دستگاهی نمی‌تواند ردیفِ دستگاهِ دیگر را حذف کند", async () => {
  const bad = await req("/api/history/labs/lab-b1", { method: "DELETE", headers: { "x-device-id": DEV_A } });
  assert.equal(bad.status, 404);
  const still = await req("/api/history", { headers: { "x-device-id": DEV_B } });
  assert.equal(still.body.count, 1);
});

test("A4b: حذفِ ردیفِ خودی هم ردیف و هم مشاهده‌هایش را می‌برد", async () => {
  const del = await req("/api/history/labs/lab-a1", { method: "DELETE", headers: { "x-device-id": DEV_A } });
  assert.equal(del.status, 200);
  const { body } = await req("/api/history", { headers: { "x-device-id": DEV_A } });
  assert.equal(body.count, 2);
  const gone = await req("/api/history/labs/lab-a1", { headers: { "x-device-id": DEV_A } });
  assert.equal(gone.status, 404);
  // روند باید فقط با دو نوبتِ باقی‌مانده ساخته شود
  const trends = await req("/api/history/trends?keys=CREAT", { headers: { "x-device-id": DEV_A } });
  assert.equal(trends.body.markers[0].count, 2);
  assert.equal(trends.body.markers[0].baseline.value, 1.1);
});
