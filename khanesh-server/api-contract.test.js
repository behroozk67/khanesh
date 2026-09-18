// ============================================================
// قرارداد پاسخِ /api/analyze — مجموعهٔ تستِ ده‌گانه
//
// این فایل «رفتار درست» را تعریف می‌کند، نه رفتار فعلی را. هر تست یکی از
// تضمین‌هایی است که تورِ ایمنیِ server.js قرار بود بدهد:
//   • has_critical همیشه از موتور می‌آید، نه از مدل (مرزِ موتور — N9)
//   • پنلِ کاملاً طبیعی اصلاً به LLM نمی‌رسد (buildNormalResult)
//   • JSON خرابِ مدل نباید به «اورژانسِ ساختگی» یا ۵۰۰ تبدیل شود
//   • must_sayِ اورژانسی که مدل انداخته، دوباره تزریق می‌شود (N7)
//   • توصیه‌های تکراری/زیرمجموعه ادغام و forbid حذف می‌شود (N8)
//   • دربارهٔ تستی که روی برگه نبوده، ادعای «طبیعی است» نمی‌شود (N4 / M26)
//
// ⚠️ هیچ فایلِ پرودکشنی برای سبز شدنِ این تست‌ها تغییر نکرده است.
//
// مرزِ شبکه یک‌جا بسته می‌شود: globalThis.fetch جایگزین می‌شود، و چون
// labmat-agents/llm.js هم از همان fetchِ سراسری استفاده می‌کند، هم OCR،
// هم گرافِ ۱۰-عامله و هم MedlinePlus آفلاین می‌شوند. هیچ تستی به شبکه
// نمی‌زند و همه قطعی‌اند.
// ============================================================

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

import { runEngine } from "./rules/adapter.js";
import { runPatterns } from "./rules/patterns.js";
import { missingFindingText } from "./rules/coverage.js";

// ── محیطِ تست ───────────────────────────────────────────────
// قبل از import شدنِ server.js ست می‌شود. dotenv مقدارِ از قبل موجود را
// بازنویسی نمی‌کند، پس این‌ها بر .env می‌چربند.
process.env.PORT = "0";                    // پورتِ آزاد — با سرورِ در حال اجرا تداخل نکند
process.env.AVALAI_API_KEY = "test-key-never-used";   // llm.js بدون کلید throw می‌کند
process.env.USE_ENGINE = "true";
process.env.ALLOWED_ORIGINS = "";
process.env.RATE_LIMIT_MAX = "10000";      // ۱۰ تست نباید به سقفِ ۲۰ بخورد
process.env.TRUST_PROXY = "";

// ── گرفتنِ دستهٔ سرور ────────────────────────────────────────
// server.js چیزی export نمی‌کند و در import شدن app.listen() می‌زند. برای
// اینکه بشود بعداً بستش (وگرنه فرایندِ تست خارج نمی‌شود)، http.createServer
// را قبل از import کردنِ سرور می‌گیریم. این تغییر فقط در فرایندِ تست است.
let serverHandle = null;
const realCreateServer = http.createServer;
http.createServer = function patchedCreateServer(...args) {
  const s = realCreateServer.apply(this, args);
  serverHandle = s;
  return s;
};

// ── مرزِ شبکه ────────────────────────────────────────────────
const realFetch = globalThis.fetch;
let llmCalls = 0;          // شمارندهٔ فراخوانیِ مدل — تستِ T6 روی این است
let medlineCalls = 0;
let llmPayload = null;     // چیزی که مدل «برمی‌گرداند» در تستِ جاری
let llmRawContent = null;  // اگر ست شود، عیناً به‌جای JSON برگردانده می‌شود (مسیرِ parse-failure)

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}

globalThis.fetch = async function stubbedFetch(input, init) {
  const url = String(input && input.url ? input.url : input);

  // درخواست‌های خودِ تست به سرورِ محلی — عبور بده
  if (url.includes("127.0.0.1") || url.includes("localhost")) {
    return realFetch(input, init);
  }

  // MedlinePlus: آفلاین. fetchMedline خطا/غیر-ok را می‌بلعد و null می‌دهد.
  if (url.includes("nlm.nih.gov")) {
    medlineCalls++;
    return new Response("", { status: 503 });
  }

  // مرزِ LLM (AvalAI، سازگار با OpenAI) — هم OCR، هم هر ۱۲ عاملِ گراف
  if (url.includes("/chat/completions")) {
    llmCalls++;
    const content = llmRawContent !== null
      ? llmRawContent
      : JSON.stringify(llmPayload ?? {});
    return jsonResponse({ choices: [{ message: { content } }] });
  }

  throw new Error(`تستِ آفلاین: درخواستِ خارجیِ مسدودشده به ${url}`);
};

// ── فیکسچرها ────────────────────────────────────────────────
// همه از کلیدهایی ساخته شده‌اند که موتور واقعاً می‌شناسد (هیچ مقدارِ
// ساختگی‌ای که adapter نگاشتش نکند). خروجیِ موتور برای هرکدام با اجرای
// مستقیمِ runEngine/runPatterns تأیید شده است.

const PANEL_NORMAL = {
  patient: { age: 35, sex: "M" },
  tests: [
    { name: "WBC", value: 7000 },
    { name: "Hemoglobin", value: 15.0 },
    { name: "Platelet", value: 250000 },
    { name: "Creatinine", value: 1.0 },
    { name: "FBS", value: 90 },
    { name: "Potassium", value: 4.2 },
    { name: "Sodium", value: 140 },
  ],
};

// پتاسیم ۷.۱ → potassium_critical، فوریتِ emergency، has_critical=true
const PANEL_CRITICAL = {
  patient: { age: 40, sex: "M" },
  tests: [
    { name: "Potassium", value: 7.1 },
    { name: "Creatinine", value: 1.0 },
    { name: "Sodium", value: 140 },
  ],
};

// پروفایل چربی → lipid_profile، فوریتِ this_week، has_critical=false
const PANEL_ABNORMAL_NONCRITICAL = {
  patient: { age: 35, sex: "M" },
  tests: [
    { name: "Cholesterol", value: 245 },
    { name: "Triglyceride", value: 210 },
    { name: "HDL", value: 38 },
  ],
};

// موردِ M26: CK بالا + خونِ ادرار، بدونِ کراتینین روی برگه.
// موتور صریحاً می‌گوید «کراتینین اندازه‌گیری نشده» — شاخهٔ سه‌طرفهٔ N4.
const PANEL_MISSING_CREATININE = {
  patient: { age: 34, sex: "M" },
  tests: [
    { name: "CK", value: 8200 },
    { name: "Urine Blood", value: 2 },
  ],
};

// فیکسچرِ پنجم (خارج از چهارتای مشخصه، لازمِ T9): تنها الگویی که
// forbid ناتهی می‌دهد — microcytic_anemia با forbid: ["B12", "فولات"].
const PANEL_FORBID = {
  patient: { age: 40, sex: "M" },
  tests: [
    { name: "Hemoglobin", value: 6.2 },
    { name: "MCV", value: 70 },
    { name: "Ferritin", value: 5 },
  ],
};

// ── ابزارها ─────────────────────────────────────────────────

/** متنِ نمایشیِ برگه — server.js بدونِ testResults درخواست را ۴۰۰ می‌کند */
function panelText(panel) {
  return panel.tests.map((t) => `${t.name}: ${t.value}`).join("\n");
}

/** حکمِ قطعیِ موتور برای یک فیکسچر — همان چیزی که پاسخِ API باید با آن بخواند */
function engineVerdict(panel) {
  const e = runEngine({ patient: panel.patient, tests: panel.tests });
  return { engineOut: e, patterns: runPatterns(e) };
}

/** همهٔ رشته‌های پاسخ، یک‌کاسه — تا تست به شکلِ دقیقِ بدنه گره نخورد */
function collectText(node, out = []) {
  if (typeof node === "string") out.push(node);
  else if (Array.isArray(node)) node.forEach((n) => collectText(n, out));
  else if (node && typeof node === "object") Object.values(node).forEach((n) => collectText(n, out));
  return out;
}
const allText = (body) => collectText(body).join("\n");

/**
 * پاسخِ پیش‌فرضِ مدل. عمداً هر دو شکل را با هم دارد:
 *   • فیلدهای عامل‌های گراف (text/analysis/reasoning/…)  ← مسیرِ فعلی
 *   • فیلدهای قراردادِ پاسخ (interpretation/has_critical/…) ← مسیرِ بازگردانده‌شده
 * پس یک stub برای هر دو کار می‌کند و تست به معماریِ داخلی گره نمی‌خورد.
 */
function modelSays({ text = "تفسیرِ نمونهٔ مدل.", hasCritical = false, recommendations = ["نتایج را با پزشک بررسی کنید."] } = {}) {
  return {
    // شکلِ عامل‌های گراف
    context: "زمینهٔ نمونه",
    analysis: text,
    reasoning: text,
    diagnosis: text,
    status: "verified",     // جلوی حلقهٔ evidence را می‌گیرد
    text,
    score: 95,
    warnings: [],
    followUps: [],
    // شکلِ قراردادِ پاسخ
    summary: text,
    abnormal_results: [],
    interpretation: text,
    general_recommendations: recommendations,
    disclaimer: "این تفسیر جایگزین پزشک نیست.",
    has_critical: hasCritical,
  };
}

let baseUrl = "";

/** یک درخواستِ کاملِ /api/analyze با پاسخِ ازپیش‌تعیین‌شدهٔ مدل */
async function analyze(panel, model = modelSays(), { rawContent = null } = {}) {
  llmPayload = model;
  llmRawContent = rawContent;
  llmCalls = 0;
  const res = await realFetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      patientInfo: `سن: ${panel.patient.age}، جنسیت: ${panel.patient.sex}`,
      testResults: panelText(panel),
      tests: panel.tests,
      patient: panel.patient,
    }),
  });
  let body = null;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status, body, llmCalls: llmCalls };
}

// ── راه‌اندازی / خاموش‌کردن ──────────────────────────────────
const quiet = { log: console.log, warn: console.warn };

before(async () => {
  // گرافِ ۱۰-عامله برای هر درخواست ۱۲ خط لاگ می‌زند؛ خروجیِ تست خوانا بماند.
  console.log = () => {};
  console.warn = () => {};

  await import("./server.js");

  // ⚠️ server.js دیگر app.listen() را هم‌زمان با import صدا نمی‌زند؛ حالا داخلِ
  //    initDb().then(...) است، یعنی سرور یک تیکِ ناهمگام بعد بالا می‌آید. پس
  //    درست بعد از import هنوز serverHandle برابرِ null است و `.once` روی null
  //    می‌ترکد (TypeError: Cannot read properties of null). اول منتظرِ ساخته‌شدنِ
  //    خودِ هندل می‌مانیم، بعد منتظرِ listening.
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
});

after(async () => {
  console.log = quiet.log;
  console.warn = quiet.warn;
  globalThis.fetch = realFetch;
  http.createServer = realCreateServer;
  if (serverHandle) {
    serverHandle.closeAllConnections?.();
    await new Promise((r) => serverHandle.close(r));
  }
  // ⚠️ server.js هنگامِ import، initDb() را صدا می‌زند و یک اتصالِ SQLite باز
  //    می‌کند. بدونِ بستنش حلقهٔ رویداد زنده می‌ماند و فرایندِ تست هرگز خارج
  //    نمی‌شود — یعنی `npm test` (و در نتیجه هوکِ pre-commit) هنگ می‌کند.
  //    اندازه‌گیری‌شده: پیش از این خط، `node --test api-contract.test.js`
  //    با exit 124 تایم‌اوت می‌خورد.
  const { closeDb } = await import("./database.js");
  await closeDb();
});

// ════════════════════════════════════════════════════════════
// T1 — has_critical وجود دارد و boolean است
// می‌گیرد: حذفِ کاملِ فیلد از شیءِ پاسخ.
// ════════════════════════════════════════════════════════════
test("T1: پاسخ فیلدِ has_critical از نوعِ boolean دارد", async () => {
  const { status, body } = await analyze(PANEL_NORMAL);
  assert.equal(status, 200, `پاسخ باید ۲۰۰ باشد، بود ${status}`);
  assert.equal(
    typeof body?.has_critical,
    "boolean",
    `has_critical باید boolean باشد؛ بود: ${JSON.stringify(body?.has_critical)}. ` +
    `کلیدهای پاسخ: ${Object.keys(body ?? {}).join(", ")}`
  );
});

// ════════════════════════════════════════════════════════════
// T2 — پنلِ بحرانی پرچم را true می‌کند
// ════════════════════════════════════════════════════════════
test("T2: پنلِ بحرانی has_critical=true می‌دهد", async () => {
  // پیش‌شرط: موتور واقعاً این پنل را اورژانس می‌داند، وگرنه تست بی‌معنی است.
  const { patterns } = engineVerdict(PANEL_CRITICAL);
  assert.equal(patterns.has_critical, true, "پیش‌شرط: موتور باید این پنل را بحرانی بداند");

  const { body } = await analyze(PANEL_CRITICAL, modelSays({ hasCritical: true }));
  assert.equal(body?.has_critical, true,
    `موتور has_critical=true داد ولی پاسخ ${JSON.stringify(body?.has_critical)} برگرداند`);
});

// ════════════════════════════════════════════════════════════
// T3 — پنلِ طبیعی پرچم را false می‌کند (صریحاً false، نه falsy)
// ════════════════════════════════════════════════════════════
test("T3: پنلِ طبیعی has_critical=false می‌دهد (نه undefined)", async () => {
  const { patterns } = engineVerdict(PANEL_NORMAL);
  assert.equal(patterns.has_critical, false, "پیش‌شرط: موتور باید این پنل را غیربحرانی بداند");

  const { body } = await analyze(PANEL_NORMAL);
  assert.strictEqual(body?.has_critical, false,
    `باید دقیقاً false باشد؛ undefined/null قبول نیست. بود: ${JSON.stringify(body?.has_critical)}`);
});

// ════════════════════════════════════════════════════════════
// T4 ⚠️ — پرچم از موتور می‌آید، نه از مدل
// تستِ تعیین‌کننده: مدل صریحاً می‌گوید «بحرانی نیست» و متنِ آرام می‌نویسد،
// در حالی که موتور پتاسیمِ ۷.۱ را اورژانس گرفته. اگر نظرِ مدل برنده شود،
// بیمار با پتاسیمِ کشنده «همه‌چیز خوب است» می‌خواند. مرزِ موتور (N9).
// ════════════════════════════════════════════════════════════
test("T4: نظرِ مدل نمی‌تواند حکمِ بحرانیِ موتور را نقض کند", async () => {
  const { patterns } = engineVerdict(PANEL_CRITICAL);
  assert.equal(patterns.has_critical, true, "پیش‌شرط: موتور باید این پنل را بحرانی بداند");

  const { body } = await analyze(PANEL_CRITICAL, modelSays({
    text: "همهٔ مقادیر در محدودهٔ طبیعی است و جای نگرانی نیست.",
    hasCritical: false,                       // ← ادعای صریحِ مدل
    recommendations: ["نیازی به اقدام خاصی نیست."],
  }));

  assert.equal(body?.has_critical, true,
    "مدل has_critical=false گفت و پاسخ آن را پذیرفت — حکمِ موتور باید بچربد");
});

// ════════════════════════════════════════════════════════════
// T5 — عکسِ قضیه: مدل نمی‌تواند اورژانس بسازد
// جفتِ T4؛ با هم پرچم را از هر دو طرف به موتور میخ می‌کنند.
// ════════════════════════════════════════════════════════════
test("T5: مدل نمی‌تواند روی پنلِ طبیعی اورژانسِ ساختگی بسازد", async () => {
  const { patterns } = engineVerdict(PANEL_NORMAL);
  assert.equal(patterns.has_critical, false, "پیش‌شرط: موتور باید این پنل را غیربحرانی بداند");

  const { body } = await analyze(PANEL_NORMAL, modelSays({
    text: "وضعیت بحرانی است، فوراً به اورژانس مراجعه کنید.",
    hasCritical: true,                        // ← ادعای صریحِ مدل
  }));

  assert.strictEqual(body?.has_critical, false,
    "مدل has_critical=true گفت و پاسخ آن را پذیرفت — بیمارِ سالم هشدارِ اورژانس می‌بیند");
});

// ════════════════════════════════════════════════════════════
// T6 — پنلِ طبیعی اصلاً LLM را صدا نمی‌زند
// buildNormalResult() باید قبل از هر فراخوانیِ مدل کوتاه کند. می‌گیرد:
// رگرسیونِ «۱۲ فراخوانیِ مدل برای یک بیمارِ سالم».
// ════════════════════════════════════════════════════════════
test("T6: پنلِ کاملاً طبیعی هیچ فراخوانیِ LLM نمی‌زند", async () => {
  const { engineOut, patterns } = engineVerdict(PANEL_NORMAL);
  assert.equal(engineOut.abnormal.length, 0, "پیش‌شرط: هیچ مقدارِ غیرطبیعی نباید باشد");
  assert.equal(patterns.findings.length, 0, "پیش‌شرط: هیچ الگویی نباید فعال شود");

  const { status, body, llmCalls: calls } = await analyze(PANEL_NORMAL);

  assert.equal(calls, 0, `پنلِ طبیعی نباید مدل را صدا بزند؛ ${calls} فراخوانی انجام شد`);
  assert.equal(status, 200, "پاسخ باید ۲۰۰ باشد");
  assert.strictEqual(body?.has_critical, false, "پاسخِ کوتاه‌شده هم باید has_critical=false داشته باشد");
  assert.equal(typeof body?.summary, "string", "پاسخ باید خلاصهٔ متنی داشته باشد");
  assert.ok(body.summary.length > 0, "خلاصه نباید خالی باشد");
});

// ════════════════════════════════════════════════════════════
// T7 — JSON خرابِ مدل باید بی‌خطر تخریب شود
// مسیرِ parse-failure: محتوای غیرِ JSON → callLLM مقدارِ null می‌دهد.
// می‌گیرد: باگِ `null < 50 === true` — امتیازِ ایمنیِ null در کلاینت
// به‌صورتِ «خطرِ بحرانی» رندر می‌شود و بیمارِ سالم بنرِ اورژانس می‌بیند.
// ════════════════════════════════════════════════════════════
test("T7: خروجیِ نامعتبرِ مدل نه ۵۰۰ می‌دهد نه اورژانسِ کاذب", async () => {
  const { status, body } = await analyze(PANEL_NORMAL, null, {
    rawContent: "این اصلاً JSON نیست — پاسخِ قطع‌شدهٔ مدل",
  });

  assert.notEqual(status, 500, "شکستِ parse نباید به ۵۰۰ تبدیل شود");
  assert.strictEqual(body?.has_critical, false,
    `has_critical باید false بماند؛ بود: ${JSON.stringify(body?.has_critical)}`);

  // هیچ فیلدی نباید به سیگنالِ اورژانسِ کاذب ترجمه شود.
  const safety = body?.labmat?.safetyDetails ?? body?.safetyDetails;
  if (safety && "score" in safety) {
    assert.equal(typeof safety.score, "number",
      `امتیازِ ایمنی null است؛ چون null < 50 در جاوااسکریپت true است، ` +
      `کلاینت آن را «بحرانی» می‌خواند`);
  }
});

// ════════════════════════════════════════════════════════════
// T8 — تورِ پوششِ اورژانس متنِ افتاده را برمی‌گرداند (N7)
// مدل must_sayِ یافتهٔ اورژانسی را کامل می‌اندازد؛ پاسخِ نهایی باید
// آن را داشته باشد. سنجش با همان معیارِ coverage.js است (جمله‌به‌جمله،
// نه زیررشتهٔ عینی) — چون همان چیزی است که مسیرِ زنده استفاده می‌کند.
// ════════════════════════════════════════════════════════════
test("T8: must_sayِ اورژانسی که مدل انداخته، در پاسخِ نهایی هست", async () => {
  const { patterns } = engineVerdict(PANEL_CRITICAL);
  const emergency = patterns.findings.find((f) => f.urgency === "emergency");
  assert.ok(emergency, "پیش‌شرط: باید یک یافتهٔ اورژانسی وجود داشته باشد");
  assert.ok(emergency.must_say, "پیش‌شرط: یافتهٔ اورژانسی باید must_say داشته باشد");

  const { body } = await analyze(PANEL_CRITICAL, modelSays({
    // متنی کاملاً بی‌ربط: هیچ توکنِ متمایزی از must_say ندارد
    text: "نتایج بررسی شد. لطفاً در فرصت مناسب با پزشک صحبت کنید.",
    hasCritical: true,
  }));

  const missing = missingFindingText(emergency, allText(body));
  assert.equal(missing, "",
    `این بخش از متنِ قطعیِ موتور به بیمار نرسید:\n«${missing.slice(0, 300)}»`);
});

// ════════════════════════════════════════════════════════════
// T9 — ادغامِ توصیه‌ها و فیلترِ forbid (N8)
// مدل فهرستی برمی‌گرداند که هم تکراریِ عینی دارد، هم یکی زیرمجموعهٔ
// دیگری است، هم یکی تستی را نام می‌برد که موتور برای این الگو forbid
// کرده (B12 در کم‌خونیِ میکروسیتیک — بالینی غلط).
// ════════════════════════════════════════════════════════════
test("T9: توصیه‌های تکراری ادغام و توصیهٔ forbid حذف می‌شود", async () => {
  const { patterns } = engineVerdict(PANEL_FORBID);
  const forbidden = patterns.findings.flatMap((f) => f.forbid ?? []);
  assert.ok(forbidden.includes("B12"), "پیش‌شرط: این الگو باید B12 را forbid کند");

  const DUP = "نتایج را با پزشک بررسی کنید.";
  const LEAD = "به پزشک مراجعه کنید.";
  const FULL = "به پزشک مراجعه کنید. این هفته وقت بگیرید.";
  const BANNED = "مصرف مکمل B12 را شروع کنید.";

  const { body } = await analyze(PANEL_FORBID, modelSays({
    text: "کم‌خونی دیده می‌شود.",
    recommendations: [DUP, DUP, LEAD, FULL, BANNED],
  }));

  const recs = body?.general_recommendations;
  assert.ok(Array.isArray(recs),
    `general_recommendations باید آرایه باشد؛ بود: ${JSON.stringify(recs)}`);

  // (الف) تکراریِ عینی جمع شده
  const exact = recs.filter((r) => r.trim() === DUP);
  assert.equal(exact.length <= 1, true, `«${DUP}» ${exact.length} بار آمده`);

  // (ب) زیرمجموعه حذف شده — نسخهٔ کوتاه نباید مستقل بماند
  assert.ok(!recs.some((r) => r.trim() === LEAD),
    `«${LEAD}» زیرمجموعهٔ «${FULL}» است و باید در آن ادغام می‌شد`);

  // (ج) توصیهٔ forbid اصلاً نباید باشد
  assert.ok(!recs.some((r) => /B12|فولات/.test(r)),
    `توصیهٔ forbid از فهرست حذف نشد: ${JSON.stringify(recs.filter((r) => /B12|فولات/.test(r)))}`);
});

// ════════════════════════════════════════════════════════════
// T10 — ادعای «طبیعی است» دربارهٔ تستی که روی برگه نیست (M26 / N4)
// موتور صریحاً می‌گوید «در این برگه کراتینین اندازه‌گیری نشده». مدل
// خلافش را می‌نویسد. پاسخِ نهایی نباید ادعای مدل را حمل کند.
//
// ⚠️ انتظار می‌رود این تست حتی پس از بازگردانیِ تورِ ایمنی هم قرمز بماند:
//    هیچ سازوکاری در مسیرِ قدیمی این کلاس را نمی‌گرفت. قرمز ماندنش
//    خودش یافته است، نه خرابیِ تست.
// ════════════════════════════════════════════════════════════
test("T10: دربارهٔ تستِ اندازه‌گیری‌نشده ادعای «طبیعی» نمی‌کند", async () => {
  const { engineOut, patterns } = engineVerdict(PANEL_MISSING_CREATININE);
  assert.ok(!engineOut.graded.some((g) => g.test === "CREAT"),
    "پیش‌شرط: کراتینین نباید روی این برگه باشد");
  assert.ok(patterns.findings.some((f) => /اندازه‌گیری نشده/.test(f.must_say ?? "")),
    "پیش‌شرط: موتور باید صریحاً بگوید کراتینین اندازه‌گیری نشده");

  const { body } = await analyze(PANEL_MISSING_CREATININE, modelSays({
    text: "کراتینین شما طبیعی است و کلیه‌ها مشکلی ندارند.",   // ← ادعای کاذب
    hasCritical: true,
  }));

  // «کراتینین … طبیعی/نرمال/در محدوده» درونِ یک جمله. روی متنِ خودِ موتور
  // تأیید شده که false می‌دهد، پس مثبتِ کاذب نیست.
  const FALSE_CLAIM =
    /کراتینین[^.؛!؟\n]{0,80}(طبیعی|نرمال|در محدوده)|(?:طبیعی|نرمال)[^.؛!؟\n]{0,40}کراتینین/;

  const text = allText(body);
  const hit = text.match(FALSE_CLAIM);
  assert.equal(hit, null,
    `پاسخ دربارهٔ کراتینینِ اندازه‌گیری‌نشده ادعای «طبیعی» دارد: «${hit?.[0]}»`);
});

// ════════════════════════════════════════════════════════════
// T11 ⚠️ — conditions باید از مسیرِ ورودِ دستی هم به موتور برسد
//
// از وقتی grade.js درجه‌بندیِ CTCAE را به بیمارِ سرطانی مشروط کرد،
// patient.conditions دیگر «فقط زمینه برای لحنِ متن» نیست؛ ورودیِ
// درجه‌بندی است. مسیرِ عکس کلِ آبجکتِ patient را پاس می‌دهد، ولی مسیرِ
// ورودِ دستی آن را دستی بازسازی می‌کرد و فقط age/sex می‌گذاشت — یعنی
// همان بیمار، همان عددها، دو خروجیِ متفاوت بسته به اینکه تایپ کرده یا
// عکس گرفته. تستِ منفی هم لازم است، وگرنه پاس‌دادنِ بی‌قیدِ conditions
// (که به هرکسی درجهٔ CTCAE بدهد) هم سبز می‌شد.
// ════════════════════════════════════════════════════════════
const PANEL_ANEMIA_CANCER = {
  patient: { age: 50, sex: "F", conditions: ["سرطان پستان"] },
  tests: [{ name: "Hemoglobin", value: 7.2 }, { name: "Creatinine", value: 0.9 }],
};
const PANEL_ANEMIA_NO_CANCER = {
  patient: { age: 50, sex: "F" },
  tests: [{ name: "Hemoglobin", value: 7.2 }, { name: "Creatinine", value: 0.9 }],
};

const hgbOf = (body) => (body?._engine?.tests ?? []).find((t) => t.key === "HGB");

test("T11: conditions از ورودِ دستی به موتور می‌رسد و CTCAE را فعال می‌کند", async () => {
  // پیش‌شرط: موتور با conditions واقعاً درجه می‌دهد. اگر این بشکند، تست
  // دربارهٔ سرورِ چیزی ثابت نمی‌کند.
  const direct = runEngine({
    patient: { age: "50 سال", sex: "زن", conditions: ["سرطان پستان"] },
    tests: [{ name: "Hemoglobin", value: 7.2 }],
  }).graded.find((g) => g.test === "HGB");
  assert.equal(typeof direct.ctcaeGrade, "number",
    "پیش‌شرط: موتور با conditions باید ctcaeGrade عددی بدهد");

  const { body } = await analyze(PANEL_ANEMIA_CANCER, modelSays({ hasCritical: false }));
  const hgb = hgbOf(body);
  assert.ok(hgb, `HGB باید در _engine.tests باشد؛ کلیدها: ${(body?._engine?.tests ?? []).map((t) => t.key).join(", ")}`);
  assert.equal(typeof hgb.ctcaeGrade, "number",
    `بیمارِ سرطانی باید درجهٔ CTCAE بگیرد، ولی ctcaeGrade=${JSON.stringify(hgb.ctcaeGrade)} برگشت — ` +
    `یعنی conditions در ساختِ ورودیِ موتور در server.js افتاده است.`);
});

test("T11b: بدونِ conditions درجهٔ CTCAE داده نمی‌شود (ولی شدت می‌ماند)", async () => {
  const { body } = await analyze(PANEL_ANEMIA_NO_CANCER, modelSays({ hasCritical: false }));
  const hgb = hgbOf(body);
  assert.ok(hgb, "HGB باید در _engine.tests باشد");
  assert.equal(hgb.ctcaeGrade, null,
    `بیمارِ غیرسرطانی نباید درجهٔ CTCAE بگیرد؛ CTCAE مقیاسِ عوارضِ درمانِ سرطان است. بود: ${JSON.stringify(hgb.ctcaeGrade)}`);
  // شدت نباید همراهش گم شود — وگرنه «CTCAE را خاموش کردیم» تبدیل می‌شود به
  // «شدت را خاموش کردیم» و آن یک کم‌خوانیِ خاموش است (N2).
  assert.ok(["mild", "moderate", "marked", "critical"].includes(hgb.level),
    `شدت باید مستقل از CTCAE بماند؛ level=${JSON.stringify(hgb.level)}`);
});

// ════════════════════════════════════════════════════════════
// T12 — C3: تورِ coverage فقط روی اورژانس اجرا می‌شد
//
// پنلِ Calcium 6.2 + Albumin 2.1: موتور کلسیم را با آلبومین تصحیح
// می‌کند و عددِ تصحیح‌شده را نقل می‌کند، ولی در must_say صریحاً
// می‌گوید عددِ روی برگه چیست. آن یافته اورژانسی نیست، پس تا پیش از
// این رفع هرگز بررسی نمی‌شد: مدل جملهٔ تصحیح را می‌انداخت و بیمار
// عددی می‌خواند که روی برگه‌اش نیست. کلاسِ N5.
//
// مدل اینجا عمداً متنی می‌دهد که عددِ تصحیح‌شده را دارد ولی جملهٔ
// تصحیح را ندارد — دقیقاً همان چیزی که در مشاهدهٔ زنده رخ داد. اگر
// تور فقط عدد را تضمین کند (کاری که تضمینِ عددِ کلیدی می‌کند)، این
// تست سبز می‌شود بی‌آنکه نقص رفع شده باشد؛ پس روی *عددِ اندازه‌گیری‌شده*
// assert می‌کنیم، نه روی عددِ تصحیح‌شده.
// ════════════════════════════════════════════════════════════
const PANEL_CORRECTED_CALCIUM = {
  patient: { age: 45, sex: "F" },
  tests: [
    { name: "Calcium", value: 6.2 },
    { name: "Albumin", value: 2.1 },
  ],
};

test("T12: عددِ تصحیح‌شده بدون توضیح به بیمار نمی‌رسد (C3)", async () => {
  const { engineOut, patterns } = engineVerdict(PANEL_CORRECTED_CALCIUM);

  // پیش‌شرط‌ها — بدونِ این‌ها تست چیزی را اثبات نمی‌کند (N15: اول ثابت کن
  // قاعده فعال شد، بعد خروجی‌اش را اسکن کن).
  assert.equal(engineOut.indices?.ca_correction_applied, true,
    "پیش‌شرط: تصحیحِ کلسیم باید اعمال شده باشد");
  const ca = patterns.findings.find((f) => f.key_number != null);
  assert.ok(ca, "پیش‌شرط: باید یک یافتهٔ عدددار وجود داشته باشد");
  assert.notEqual(ca.urgency, "emergency",
    "پیش‌شرط: این یافته نباید اورژانسی باشد — وگرنه تورِ قدیمی هم می‌گرفتش و تست چیزی را قفل نمی‌کند");

  const measured = String(engineOut.indices.ca_measured);   // 6.2 — روی برگه
  const corrected = String(engineOut.indices.ca_corrected); // آنچه موتور نقل می‌کند

  const { body } = await analyze(PANEL_CORRECTED_CALCIUM, modelSays({
    text: `کلسیم خون شما ${corrected} است و پایین‌تر از حد طبیعی قرار دارد.`,
    hasCritical: false,
  }));

  const text = allText(body);
  assert.ok(text.includes(measured),
    `عددِ روی برگهٔ بیمار (${measured}) در پاسخ نیست، ولی عددِ تصحیح‌شده (${corrected}) هست. ` +
    `بیمار عددی می‌خواند که روی برگه‌اش نیست — N5/C3.`);
});

// کنترلِ منفی: تور نباید متنی را که مدل *کامل* منتقل کرده دوباره اضافه کند.
// این همان چیزی است که N7 از آن آسیب دید — تورِ بیش‌ازحد مشتاق، متنِ تکراری.
test("T12b: وقتی مدل جملهٔ تصحیح را آورده، تور چیزی تکرار نمی‌کند", async () => {
  const { patterns } = engineVerdict(PANEL_CORRECTED_CALCIUM);
  const ca = patterns.findings.find((f) => f.key_number != null);
  assert.ok(ca?.must_say, "پیش‌شرط: یافته باید must_say داشته باشد");

  const { body } = await analyze(PANEL_CORRECTED_CALCIUM, modelSays({
    text: ca.must_say,          // مدل عیناً همه‌چیز را منتقل کرده
    hasCritical: false,
  }));

  // ⚠️ فقط interpretation شمرده می‌شود، نه allText(body). استابِ modelSays همان
  //    متن را در شش فیلد می‌گذارد (analysis/reasoning/diagnosis/text/summary/
  //    interpretation)، پس شمارشِ کلِ بدنه همیشه ۶ می‌دهد و ربطی به تور ندارد.
  //    تور *به interpretation* اضافه می‌کند، پس همان‌جا جای درستِ اندازه‌گیری است.
  const first = String(ca.must_say).split(/(?<=[.؟!])\s/)[0].trim();
  assert.ok(first.length > 12, "پیش‌شرط: جملهٔ اول باید به‌قدرِ کافی متمایز باشد");
  const occurrences = String(body?.interpretation || "").split(first).length - 1;
  assert.equal(occurrences, 1,
    `جملهٔ اولِ must_say باید دقیقاً یک بار در interpretation باشد، بود ${occurrences} بار. ` +
    `بیش از یک بار یعنی تور متنی را که مدل کامل منتقل کرده دوباره اضافه کرده (N7).`);
});

// ═══ T14–T16: حریمِ نتیجه، و درِ بازِ مسیرِ گراف ═══
//
// اندازه‌گیری‌شده روی کدِ پیش از رفع (۲۰۲۶-۰۹-۱۷):
//   • GET /api/analyze/job/:id نه `requireAuth` داشت و نه مالک را می‌سنجید —
//     فقط `getJob(id)`. پس با AUTH_REQUIRED روشن هم، *شروعِ* تحلیل احراز هویت
//     می‌خواست و *خواندنِ نتیجه‌اش* نه؛ و نتیجه کلِ تفسیرِ یک بیمار است.
//   • POST /api/labmat/analyze مستقل از USE_GRAPH همیشه گراف را اجرا می‌کرد و
//     `requireAuth` نداشت — یعنی همان مسیری که N13 برای بستنش «پیش‌فرض خاموش»
//     شد، زنده و بی‌احراز هویت باز بود.

test("T14: نتیجهٔ یک کار به مالکش مقید است — شناسهٔ کار کافی نیست", async () => {
  const { createJob, finishJob, getJobFor, getJob } = await import("./jobStore.js");

  const id = createJob({ pagesTotal: 1, userId: 7 });
  finishJob(id, 200, { interpretation: "متنِ بالینیِ بیمارِ شمارهٔ ۷" });

  assert.ok(getJobFor(id, 7), "مالک باید کارِ خودش را ببیند");
  assert.equal(getJobFor(id, 9), null, "کاربرِ دیگر با شناسهٔ کار نباید نتیجه را بخواند");
  assert.equal(getJobFor(id, null), null, "درخواستِ بی‌کاربر نباید باز شود — گاردی که در نبودِ داده باز می‌شود همان کلاسِ N18 است");
  assert.equal(getJobFor("شناسهٔ-ناموجود", 7), null);

  // `getJob` خودش عمداً بی‌قید مانده (مصرفِ داخلی)، پس تنها راهِ درستِ پاسخ
  // به HTTP همان getJobFor است. این assert آن تفکیک را ثبت می‌کند.
  assert.ok(getJob(id), "مصرفِ داخلی دست‌نخورده است");
});

test("T15: poll فقط کارِ خودِ کاربر را برمی‌گرداند و شناسهٔ غریبه ۴۰۴ می‌گیرد", async () => {
  const { createJob, finishJob } = await import("./jobStore.js");

  // با AUTH_REQUIRED خاموش، requireAuth کاربرِ ناشناسِ مشترک را ست می‌کند؛
  // پس کارِ ساخته‌شده توسط /start خوانده می‌شود و کارِ کاربرِ دیگر نه.
  const foreign = createJob({ pagesTotal: 1, userId: 4242 });
  finishJob(foreign, 200, { interpretation: "نتیجهٔ بیمارِ دیگر" });

  const res = await realFetch(`${baseUrl}/api/analyze/job/${encodeURIComponent(foreign)}`);
  assert.equal(res.status, 404, "کارِ کاربرِ دیگر نباید خوانده شود");
  const body = await res.json();
  assert.ok(!JSON.stringify(body).includes("نتیجهٔ بیمارِ دیگر"), "بدنهٔ نتیجه نباید لو برود");
});

test("T16: مسیرِ گراف با USE_GRAPH خاموش در دسترس نیست", async () => {
  // ⚠️ تورهای ایمنیِ مرحلهٔ ۸ روی این مسیر اجرا نمی‌شوند (N13). گیت تا امروز
  //    فقط داخلِ analyzeHandler بود، نه روی این روت.
  const res = await realFetch(`${baseUrl}/api/labmat/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rawData: { patientInfo: { age: 40, sex: "M" }, testResults: [] } }),
  });
  assert.equal(res.status, 503, "با گرافِ خاموش باید ۵۰۳ بدهد، نه اینکه گراف را اجرا کند");
  const body = await res.json();
  assert.match(String(body.error || ""), /USE_GRAPH/, "پیام باید بگوید چه چیزی خاموش است");
});

// ════════════════════════════════════════════════════════════
// T17 — کلیدِ بی‌بازه نباید خام به هشدارِ بیمار برسد (N8)
// می‌گیرد: server.js فهرستِ noRef را خام join می‌کرد. تا وقتی noRef عملاً خالی بود
// کسی نمی‌دید؛ با شناساییِ پرولاکتین/کورتیزول (P46، مرحلهٔ الف) بیمار
// «محدوده مرجع نداریم: PRL» می‌خواند.
// ════════════════════════════════════════════════════════════
test("T17: هشدارِ «محدوده مرجع نداریم» نامِ فارسی می‌گوید، نه کلیدِ خامِ موتور", async () => {
  const { status, body } = await analyze({
    patient: { age: 40, sex: "F" },
    // Hb طبیعی لازم است: بدونِ هیچ تستِ نمره‌دار، server.js کلِ برگه را به مسیرِ قدیم می‌فرستد.
    tests: [{ name: "Hemoglobin", value: 14 }, { name: "Prolactin", value: 80 }, { name: "Cortisol (8 AM)", value: 12 }],
  });
  assert.equal(status, 200);
  const w = (body?.ocr_warnings ?? []).join(" ");
  assert.match(w, /محدوده مرجع نداریم/, `پیش‌شرط: هشدار باید بیاید؛ آمده: ${w}`);
  assert.doesNotMatch(w, /\bPRL\b|CORTISOL_AM/, `کلیدِ خام به بیمار رسید: ${w}`);
  assert.match(w, /پرولاکتین/);
  // بازبینی: وقتی این تست‌ها unmapped بودند، هشدار بیمار را به پزشک می‌فرستاد؛ انتقال به noRef
  //   نباید آن تنها جمله را کنار خلاصهٔ «طبیعی» حذف کند.
  const noRefLine = (body?.ocr_warnings ?? []).find((x) => /محدوده مرجع نداریم/.test(x));
  assert.match(noRefLine, /پزشک/, `هشدارِ بی‌بازه بیمار را به پزشک نمی‌فرستد: ${noRefLine}`);
});

test("T18: mergePages — برگهٔ CBC و برگهٔ منی، به هر ترتیب، هر دو ردیفِ WBC را نگه می‌دارند", async () => {
  // 🔴 باگِ واقعی (P47، research R3): ردیف‌های هم‌نامِ صفحه‌های مختلف با «اولی برنده» یکی
  //    می‌شدند. اگر صفحهٔ منی اول بارگذاری می‌شد، WBCِ CBC بی‌صدا دور ریخته می‌شد — کمبودخوانیِ
  //    کلاسِ N2 روی رایج‌ترین آزمایشِ برنامه.
  const { mergePages } = await import("./server.js");
  assert.equal(typeof mergePages, "function", "mergePages از server.js صادر نشده");
  const cbc = { ok: true, page: 1, ocr: { patient: { age: "35", sex: "مرد" }, tests: [
    { name: "WBC", value: "7.2", unit: "10*3/µL" }, { name: "Hb", value: "14" }, { name: "PLT", value: "250" }] } };
  const semen = { ok: true, page: 2, ocr: { patient: { age: "35", sex: "مرد" }, tests: [
    { name: "WBC", value: "3-4", unit: "/hpf" }, { name: "Motility", value: "40", unit: "%" },
    { name: "Count", value: "40", unit: "million/mL" }] } };
  for (const pages of [[cbc, semen], [semen, cbc]]) {
    const m = mergePages(pages);
    const wbcs = m.tests.filter((t) => t.name === "WBC").map((t) => t.value).sort();
    assert.deepEqual(wbcs, ["3-4", "7.2"], `یک WBC حذف شد (ترتیب ${pages.map((p) => p.page)})`);
    assert.ok(!m.duplicates.some((d) => d.name === "WBC"), "WBCِ منی «تکراریِ متناقض» گزارش شد");
  }
});

test("T19: برگه‌ای که فقط هورمونِ بی‌قضاوت دارد مسیرِ موتور را می‌گیرد — هرگز «همه‌چیز طبیعی است»", async () => {
  // ⚠️ امروز graded.length === 0 → مسیرِ قدیمِ بی‌موتور. اگر شرط بدونِ قاعدهٔ زمینه عوض شود،
  //    برگهٔ FSHِ بی‌روز به buildNormalResult می‌رسد — همان کلاسِ N2.
  const { status, body } = await analyze({ patient: { age: 30, sex: "F" }, tests: [{ name: "FSH", value: "12" }] });
  assert.equal(status, 200);
  assert.ok(body?._engine, "مسیرِ موتور گرفته نشد");
  assert.ok(body._engine.patterns.includes("reproductive_hormone_context"), `patterns=${body._engine.patterns}`);
});
