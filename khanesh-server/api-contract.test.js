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
let llmLastRequest = null; // بدنهٔ آخرین درخواست به مدل — T23 می‌بیند چه چیزی به مدل *رفته*

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
    llmLastRequest = typeof init?.body === "string" ? init.body : null;
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
    { name: "Hemoglobin", value: 15.0, unit: "g/dL" },
    { name: "Platelet", value: 250000 },
    { name: "Creatinine", value: 1.0, unit: "mg/dL" },
    { name: "FBS", value: 90, unit: "mg/dL" },
    { name: "Potassium", value: 4.2 },
    { name: "Sodium", value: 140 },
  ],
};

// پتاسیم ۷.۱ → potassium_critical، فوریتِ emergency، has_critical=true
const PANEL_CRITICAL = {
  patient: { age: 40, sex: "M" },
  tests: [
    { name: "Potassium", value: 7.1 },
    { name: "Creatinine", value: 1.0, unit: "mg/dL" },
    { name: "Sodium", value: 140 },
  ],
};

// پروفایل چربی → lipid_profile، فوریتِ this_week، has_critical=false
const PANEL_ABNORMAL_NONCRITICAL = {
  patient: { age: 35, sex: "M" },
  tests: [
    { name: "Cholesterol", value: 245, unit: "mg/dL" },
    { name: "Triglyceride", value: 210, unit: "mg/dL" },
    { name: "HDL", value: 38, unit: "mg/dL" },
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
    { name: "Hemoglobin", value: 6.2, unit: "g/dL" },
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
  tests: [{ name: "Hemoglobin", value: 7.2, unit: "g/dL" }, { name: "Creatinine", value: 0.9, unit: "mg/dL" }],
};
const PANEL_ANEMIA_NO_CANCER = {
  patient: { age: 50, sex: "F" },
  tests: [{ name: "Hemoglobin", value: 7.2, unit: "g/dL" }, { name: "Creatinine", value: 0.9, unit: "mg/dL" }],
};

const hgbOf = (body) => (body?._engine?.tests ?? []).find((t) => t.key === "HGB");

test("T11: conditions از ورودِ دستی به موتور می‌رسد و CTCAE را فعال می‌کند", async () => {
  // پیش‌شرط: موتور با conditions واقعاً درجه می‌دهد. اگر این بشکند، تست
  // دربارهٔ سرورِ چیزی ثابت نمی‌کند.
  const direct = runEngine({
    patient: { age: "50 سال", sex: "زن", conditions: ["سرطان پستان"] },
    tests: [{ name: "Hemoglobin", value: 7.2, unit: "g/dL" }],
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
    { name: "Calcium", value: 6.2, unit: "mg/dL" },
    { name: "Albumin", value: 2.1, unit: "g/dL" },
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
    tests: [{ name: "Hemoglobin", value: 14, unit: "g/dL" }, { name: "UFC", value: 20, unit: "µg/24h" }],
  });
  assert.equal(status, 200);
  const w = (body?.ocr_warnings ?? []).join(" ");
  assert.match(w, /محدوده مرجع نداریم/, `پیش‌شرط: هشدار باید بیاید؛ آمده: ${w}`);
  assert.doesNotMatch(w, /\bPRL\b|\bUFC\b|CORTISOL_AM/, `کلیدِ خام به بیمار رسید: ${w}`);
  // پرولاکتین و کورتیزولِ صبح با تأییدِ P46 بازه گرفتند؛ نمونهٔ بی‌بازهٔ این تست کورتیزولِ آزادِ ادرار است (حدش به روشِ سنجش بستگی دارد).
  assert.match(w, /کورتیزولِ آزادِ ادرار/);
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
    { name: "WBC", value: "7.2", unit: "10*3/µL" }, { name: "Hb", value: "14", unit: "g/dL" }, { name: "PLT", value: "250" }] } };
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

test("T20: برگه‌ای که فقط عددِ بی‌واحد دارد مسیرِ موتور را می‌گیرد — نه اورژانس، نه «همه‌چیز طبیعی است»", async () => {
  // 🔴 روی edec069: «Creatinine 80» بی‌واحد → ۸۰ mg/dL → has_critical: true (specs/003، SC-001).
  const { status, body } = await analyze({ patient: { age: 40, sex: "M" }, tests: [{ name: "Creatinine", value: "80" }] });
  assert.equal(status, 200);
  assert.ok(body?._engine, "مسیرِ موتور گرفته نشد");
  assert.ok(body._engine.patterns.includes("unit_unknown_values"), `patterns=${body._engine.patterns}`);
  assert.equal(body.has_critical, false, "کراتینینِ بی‌واحد هنوز بحرانی خوانده می‌شود");
});

test("T21: برگه‌ای که فقط آنالیتِ بی‌بازهٔ فصلِ ویتامین/عناصر دارد مسیرِ موتور را می‌گیرد — نه «طبیعی است»، نه کلیدِ خام (specs/004، FR-009)", async () => {
  // 🔴 روی 2d32dd3: graded خالی ⇒ مسیرِ قدیمِ بی‌موتور (مدل خودش قضاوت می‌کند).
  const { status, body } = await analyze({ patient: { age: 40, sex: "M" }, tests: [
    // سرولوپلاسمینِ ۲۵ (زیرِ ۲۰ نیست، بی‌التهاب) عمداً: از ۲۰۲۶-۰۹-۱۹ عددِ زیرِ ۲۰ یافتهٔ ویلسون می‌گیرد (P49-الف، T22).
    { name: "Zinc", value: "40", unit: "µg/dL" }, { name: "Ceruloplasmin", value: "25", unit: "mg/dL" }] });
  // آنتی‌بادی‌ها اینجا نیستند: ورودِ دستی عمداً فقط عدد می‌پذیرد (server.js، manualTests)؛ مسیرِ عکسِ آن‌ها M147 است.
  assert.equal(status, 200);
  assert.ok(body?._engine, "مسیرِ موتور گرفته نشد");
  assert.equal(body.has_critical, false);
  assert.doesNotMatch(`${body.summary} ${body.interpretation}`, /در محدوده طبیعی است/);
  const warn = (body.ocr_warnings || []).join(" ");
  for (const fa of ["روی", "سرولوپلاسمین"]) assert.ok(warn.includes(fa), `«${fa}» در هشدار نیست: ${warn}`);
  assert.doesNotMatch(JSON.stringify(body), /"(ZINC|CERULOPLASMIN|ANTI_IF)"|\b(ZINC|CERULOPLASMIN|ANTI_IF)\b(?!")/, "کلیدِ خام به پاسخ رسید");
});

test("T22: سرولوپلاسمینِ پایین یافتهٔ ویلسون می‌گیرد و از خطِ «تفسیر نشدند» بیرون می‌رود؛ رویِ بی‌بازه می‌ماند (P49-الف)", async () => {
  // 🔴 پیش از P49: سرولوپلاسمینِ ۱۲ فقط «محدوده مرجع نداریم … تفسیر نشدند» می‌گرفت.
  const { status, body } = await analyze({ patient: { age: 25, sex: "F" }, tests: [
    { name: "Zinc", value: "80", unit: "µg/dL" }, { name: "Ceruloplasmin", value: "12", unit: "mg/dL" }] });
  assert.equal(status, 200);
  assert.ok(body?._engine?.patterns?.includes("wilson_evaluation"), JSON.stringify(body?._engine?.patterns));
  assert.equal(body.has_critical, false);
  const warn = (body.ocr_warnings || []).find((w) => /محدوده مرجع نداریم/.test(w)) ?? "";
  assert.ok(warn.includes("روی"), `«روی» در هشدار نیست: ${warn}`);
  assert.ok(!warn.includes("سرولوپلاسمین"), `سرولوپلاسمینِ تفسیرشده هنوز «تفسیر نشدند» است: ${warn}`);
  assert.doesNotMatch(JSON.stringify(body), /\b(ZINC|CERULOPLASMIN|U_COPPER_24H)\b/, "کلیدِ خام به پاسخ رسید");
});

// ═══ T23: فهرستِ توصیه‌ها از موتور می‌آید، نه از مدل؛ action/warnings اصلاً به مدل نمی‌روند ═══
// 🔴 برگهٔ واقعی (۲۰۲۶-۰۹-۲۳، پان‌سیتوپنی، مرد ۶۲): مدل ۴ مورد از ۱۴ توصیهٔ موتور را انداخت،
//    از جمله «بدون اتلاف وقت فوراً به اورژانس». بیمار «همین امروز با پزشک تماس بگیرید» خواند.
test("T23: توصیه‌ها عیناً از موتورند — فهرستِ کوتاه/ملایمِ مدل نادیده گرفته می‌شود و action به مدل نمی‌رسد", async () => {
  const panel = {
    patient: { age: 62, sex: "M" },
    tests: [
      { name: "WBC", value: 0.27, unit: "10^3/uL" }, { name: "NEUT", value: 0.07, unit: "10^3/uL" },
      { name: "LYMPH", value: 0.14, unit: "10^3/uL" }, { name: "HGB", value: 8.3, unit: "g/dL" },
      { name: "HCT", value: 23.7, unit: "%" }, { name: "MCV", value: 65.8, unit: "fL" },
      { name: "PLT", value: 15, unit: "10^3/uL" },
    ],
  };
  const MILD = "همین امروز با پزشک تماس بگیرید.";
  const { body } = await analyze(panel, modelSays({ text: "تفسیرِ نمونه.", hasCritical: true, recommendations: [MILD] }));
  const recs = body?.general_recommendations ?? [];
  assert.equal(recs[0], "بدون اتلاف وقت فوراً به اورژانس مراجعه کنید.", `دستورِ اول: ${recs[0]}`);
  assert.ok(!recs.includes(MILD), "فهرستِ مدل نباید به بیمار برسد");
  assert.ok(recs.includes("از تماس با افراد بیمار و مکان‌های شلوغ پرهیز کنید تا پزشک را ببینید."), `هشدارِ نوتروپنی گم شد: ${recs}`);
  assert.ok(llmLastRequest, "درخواستِ مدل ثبت نشد");
  assert.ok(!llmLastRequest.includes("بدون اتلاف وقت فوراً به اورژانس"), "action به مدل فرستاده شد");
  assert.ok(!llmLastRequest.includes("از تماس با افراد بیمار"), "warnings به مدل فرستاده شد");
});

test("T24: mergePages — «HBs»ِ صفحهٔ هپاتیت و «HbS»ِ صفحهٔ الکتروفورز هر دو می‌مانند، به هر ترتیب (specs/008 دور ۲، CR6، N25)", async () => {
  // 🔴 پیش‌تر: کلیدِ ادغام فقط نام بود ⇒ «hbs» یکی می‌شد و اولی برنده؛ نتیجهٔ هپاتیت یا واریانتِ داسی بی‌صدا حذف می‌شد.
  const { mergePages } = await import("./server.js");
  const hep = { ok: true, page: 1, ocr: { patient: { age: "30", sex: "مرد" }, tests: [
    { name: "HBs Ag", value: "Negative" }, { name: "HBs", value: "150", unit: "mIU/mL" }] } };
  const electro = { ok: true, page: 2, ocr: { patient: { age: "30", sex: "مرد" }, tests: [
    { name: "HbA2", value: "3.1", unit: "%" }, { name: "HbS", value: "38", unit: "%" }] } };
  for (const pages of [[hep, electro], [electro, hep]]) {
    const m = mergePages(pages);
    const vals = m.tests.filter((t) => /^hbs$/i.test(t.name)).map((t) => t.value).sort();
    assert.deepEqual(vals, ["150", "38"], `یک ردیفِ HBs/HbS حذف شد (ترتیب ${pages.map((p) => p.page)})`);
  }
});

test("T26: mergePages — «HbS 38 %» و «HBs: Positive» روی *یک* صفحه هر دو می‌مانند (specs/008 دور ۳، R3-CR4)", async () => {
  // 🔴 پیش‌تر: با HbA2 روی صفحه هر دو «electro:hbs» می‌شدند و دومی به‌عنوانِ «تکراریِ ناهمخوان» می‌افتاد.
  const { mergePages } = await import("./server.js");
  const page = { ok: true, page: 1, ocr: { patient: { age: "28", sex: "زن" }, tests: [
    { name: "HbA2", value: "3.1", unit: "%" }, { name: "HbS", value: "38", unit: "%" }, { name: "HBs", value: "Positive" }] } };
  const m = mergePages([page]);
  const vals = m.tests.filter((t) => /^hbs$/i.test(t.name)).map((t) => t.value).sort();
  assert.deepEqual(vals, ["38", "Positive"], JSON.stringify(m.tests));
});

test("T25:برگه‌ای که فقط «Hgb S 40 %» دارد مسیرِ موتور می‌گیرد — نه اورژانس، نه «طبیعی است»، نه کلیدِ خام (specs/008 دور ۲، R2-B4)", async () => {
  // 🔴 پیش‌تر: «hgbs» ⇒ قاعدهٔ جمع ⇒ HGB ⇒ «هموگلوبین ۴۰» بی‌واحد ⇒ unit_unknown_values اورژانس.
  const { status, body } = await analyze({ patient: { age: 30, sex: "M" }, tests: [{ name: "Hgb S", value: "40", unit: "%" }] });
  assert.equal(status, 200);
  assert.ok(body?._engine, "مسیرِ موتور گرفته نشد");
  assert.equal(body.has_critical, false);
  assert.doesNotMatch(`${body.summary} ${body.interpretation}`, /در محدوده طبیعی است/);
  // ⚠️ عمداً عوض شد — P53 پرسش ۶: HbS حالا تفسیر می‌شود (hb_variant، «صفت»)، پس به‌جای خطِ «تفسیر نشدند» در متنِ یافته است.
  assert.ok(body._engine.patterns.includes("hb_variant"), JSON.stringify(body._engine.patterns));
  // هشدارِ ناقل بودن (پرسش ۱۶: صفتِ داسیِ ۳۵–۴۰٪ پیش‌تر هیچ هشداری نمی‌گرفت) از فهرستِ موتور می‌آید، نه از مدل.
  assert.ok((body.general_recommendations || []).some((r) => /ناقل/.test(r)), JSON.stringify(body.general_recommendations));
  assert.doesNotMatch(JSON.stringify(body), /\bHBS\b/, "کلیدِ خام به پاسخ رسید");
});

test("T27: بازهٔ درصدیِ جابه‌جا روی شمارشِ مطلق به ردیفِ ٪ برمی‌گردد؛ جنسیتِ برگه با فیلدِ خالیِ فرم پاک نمی‌شود (برگهٔ واقعی ۲۰۲۶-۰۹-۲۴)", async () => {
  // 🔴 پیش‌تر: «NEUT 1.38 10^3/uL — 42.2–75.2» در فهرستِ اعداد؛ و patientِ فرم (پیش‌فرضِ «مرد») کلِ patientِ برگه را جایگزین می‌کرد.
  const { fixShiftedDiffRefs, mergePatient } = await import("./server.js");
  const rows = fixShiftedDiffRefs([
    { name: "NEUT", value: "1.38", unit: "10^3/uL", reference: "42.2 - 75.2" },
    { name: "NEUT%", value: "39.5", unit: "%", reference: "—" },
    { name: "MONO", value: "0.46", unit: "10^3/uL", reference: "1.7 - 9.8" },
    { name: "EO", value: "0.32", unit: "10^3/uL", reference: "0 - 0.3" },
    { name: "WBC", value: "3.50", unit: "10^3/uL", reference: "4.0 - 10.0" },
  ]);
  const ref = (n) => rows.find((r) => r.name === n).reference;
  assert.equal(ref("NEUT"), "");
  assert.equal(ref("NEUT%"), "42.2 - 75.2");
  assert.equal(ref("MONO"), "", "۱.۷ بالاتر از سقفِ مونوسیتِ مطلق است");
  assert.equal(ref("EO"), "0 - 0.3", "بازهٔ ممکن برای شمارشِ مطلق دست نمی‌خورد");
  assert.equal(ref("WBC"), "4.0 - 10.0");
  // جنسیت
  assert.deepEqual(mergePatient({ sex: "زن", age: "45" }, { age: "46", sex: null, conditions: [] }),
    { sex: "زن", age: "46", conditions: [] });
  assert.equal(mergePatient({ sex: "زن" }, { sex: "مرد" }).sex, "مرد", "انتخابِ صریحِ کاربر برنده است");
});

test("T28: ردیفِ درصدیِ بی‌«%» روی همان صفحه با شمارشِ مطلق یکی نمی‌شود (برگهٔ واقعی ۲۰۲۶-۰۹-۲۴، job 7b413a8d)", async () => {
  // 🔴 پیش‌تر: «NEUT 1.38 10^3/uL» و «NEUT 39.5 %» ⇒ یک کلید، درصد دور ریخته و هشدارِ «در صفحه 1 و 1 با مقادیر متفاوت».
  const { mergePages } = await import("./server.js");
  const m = mergePages([{ ok: true, page: 1, ocr: { tests: [
    { name: "NEUT", value: "1.38", unit: "10^3/uL" }, { name: "NEUT", value: "39.5", unit: "%" },
    { name: "HCT", value: "30.4", unit: "%" },
  ] } }]);
  assert.deepEqual(m.duplicates, []);
  assert.deepEqual(m.tests.map((t) => t.name), ["NEUT", "NEUT%", "HCT"], "HCT ردیفِ غیرِ٪ ندارد و نامش دست نمی‌خورد");
});

test("T29: «---.-» (جای‌نگهدارِ دستگاه) مثلِ مقدارِ خالی هشدارِ «خوانا نبود» می‌گیرد؛ «-»ِ نوارِ ادرار نه (job fff90f58، P58)", async () => {
  // 🔴 پیش‌تر: فقط null/"" هشدار داشت؛ NEUT%/NEUT#/MXD با «---.-» بی‌صدا گذشتند و بیمار نفهمید دیف ناقص است.
  const { ocrToText } = await import("./server.js");
  const { warnings } = ocrToText({ tests: [
    { name: "NEUT%", value: "---.-", unit: "%" }, { name: "MXD#", value: "---.-", unit: "10^3/µL" },
    { name: "WBC", value: "36.6", unit: "10^3/µL" }, { name: "Nitrite", value: "-" },
  ] });
  assert.ok(warnings.some((w) => /^NEUT%: مقدار خوانا نبود/.test(w)), warnings.join(" | "));
  assert.ok(warnings.some((w) => /^MXD#: مقدار خوانا نبود/.test(w)), warnings.join(" | "));
  assert.ok(!warnings.some((w) => /^(WBC|Nitrite):/.test(w)), "عددِ واقعی و «منفی»ِ نوار ناخوانا نیستند (N6)");
});

test("T30: _engine.suppressed/suppressed_ids/supplementary برسند، و یافتهٔ تکمیلیِ افتاده از متنِ مدل برگردانده شود (job 40b8a901/fff90f58، ۲۰۲۶-۰۹-۲۹)", async () => {
  // 🔴 پیش‌تر: suppressed فقط در لاگِ trace بود و در _engine نبود — فرانت/بازبین نمی‌دانستند چه چیزی زیرِ اورژانس پنهان شد؛
  //   و یافتهٔ کم‌فوریتِ پنهان اصلاً به متنِ بیمار نمی‌رسید. مدلِ stub اینجا هیچ‌کدام را نمی‌نویسد.
  const panel = { patient: { age: 50, sex: "M" }, tests: [
    { name: "WBC", value: "80", unit: "10^3/uL" }, { name: "Hb", value: "12", unit: "g/dL" }, { name: "PLT", value: "450", unit: "10^3/uL" },
    { name: "Neut %", value: "70", unit: "%" }, { name: "Lymph %", value: "8", unit: "%" }, { name: "Mono %", value: "4", unit: "%" },
    { name: "Eos %", value: "6", unit: "%" }, { name: "Baso %", value: "5", unit: "%" },
  ] };
  const { status, body } = await analyze(panel);
  assert.equal(status, 200);
  const eng = body._engine;
  assert.equal(eng.suppressed, 4, JSON.stringify(eng.suppressed));
  assert.deepEqual([...eng.suppressed_ids].sort(), ["cll_suspicion_nccn", "eosinophilia", "monocytosis", "neutrophilia"]);
  assert.deepEqual([...eng.supplementary].sort(), ["cll_suspicion_nccn", "eosinophilia", "monocytosis", "neutrophilia"]);
  assert.ok(!(eng.uncovered ?? []).some((k) => ["LYMPH_ABS", "EOS_ABS", "MONO_ABS"].includes(k)), `هنوز بی‌توضیح: ${eng.uncovered}`);
  const interp = body.interpretation ?? "";
  for (const n of ["6400", "4800", "3200"]) assert.ok(interp.includes(n), `عدد ${n} به متنِ بیمار نرسید: ${interp}`);
  assert.equal(body.has_critical, true);
});

test("T31: نوزاد — برگهٔ بی‌خطر (کف) has_critical نمی‌گیرد و بنرِ نوزادی نیست؛ اورژانسِ واقعی (K 7.1) has_critical می‌گیرد (job 5fdd233a)", async () => {
  // 🔴 پیش‌تر کفِ نوزادی هر عددِ غیرطبیعی را اورژانس می‌کرد (MCH 38 تنها ⇒ بنرِ «همین امروز» + has_critical). حالا soon.
  const t = (name, value, unit = "") => ({ name, value, unit });
  const neo = await analyze({ patient: { age: "3 روز", sex: "unknown" }, tests: [t("MCH", "38", "pg"), t("T. Bilirubin(Clot)", "9.58", "mg/dl")] });
  assert.equal(neo.status, 200);
  assert.equal(neo.body.has_critical, false);
  assert.notEqual(neo.body._engine.urgency, "emergency");
  assert.equal(neo.body._engine.critical_banner, null);

  const real = await analyze({ patient: { age: "1 روز", sex: "unknown" }, tests: [t("K", "7.1", "mmol/L")] });
  assert.equal(real.body.has_critical, true);
});

test("T32: برگهٔ فاکتور ۸ مسیرِ موتور و factor_activity می‌گیرد — نه «طبیعی»، نه مسیرِ قدیم (specs/010، FR-019، N2/N18)", async () => {
  // 🔴 روی e285030: «Factor VIII Activity 0.5 %» unmapped بود. با Hbِ طبیعی ⇒ پاسخِ آمادهٔ «نتایج شما طبیعی است»؛
  //    تنها ⇒ graded خالی ⇒ مسیرِ قدیمِ بی‌موتور، جایی که مدل خودش شدت را قضاوت می‌کند.
  const t = (name, value, unit = "") => ({ name, value, unit });
  // بازوی ۱: کنارِ یک Hbِ طبیعی
  const a1 = await analyze({ patient: { age: 25, sex: "M" }, tests: [t("Factor VIII Activity", "0.5", "%"), t("HGB", "14", "g/dL")] });
  assert.equal(a1.status, 200);
  assert.ok(a1.body?._engine?.patterns?.includes("factor_activity"), JSON.stringify(a1.body?._engine?.patterns));
  assert.doesNotMatch(`${a1.body.summary} ${a1.body.interpretation}`, /در محدوده طبیعی است/);
  assert.doesNotMatch(JSON.stringify(a1.body), /\b(FVIII|FVIII_INHIB|VWF_AG|VWF_ACT|PT_CONTROL)\b(?!:)/, "کلیدِ خام به پاسخ رسید");
  // بازوی ۲: فقط همین یک ردیف — هیچ تستِ نمره‌داری نیست
  const a2 = await analyze({ patient: { age: 25, sex: "M" }, tests: [t("Factor VIII Activity", "0.5", "%")] });
  assert.equal(a2.status, 200);
  assert.ok(a2.body?._engine, "مسیرِ موتور گرفته نشد (مسیرِ قدیمِ بی‌موتور)");
  assert.ok(a2.body._engine.patterns.includes("factor_activity"), JSON.stringify(a2.body._engine.patterns));
  assert.equal(a2.body.has_critical, false);
});

// ── specs/011: ورودِ دستیِ ادرار، خطِ «تفسیر بر پایهٔ …»، و اختلافِ برگه/پروفایل ──

test("T37: ورودِ دستیِ ادرار — مقدارِ رشته‌ایِ «+2» و «10-15» به موتور می‌رسد و hematuria می‌سازد (N2/N18)", async () => {
  // 🔴 پیش‌تر مسیرِ دستی هر ردیفِ غیرعددی را با Number.isFinite دور می‌ریخت؛ ادرارِ دستی بی‌صدا حذف می‌شد.
  const r = await analyze({
    patient: { age: 40, sex: "F" },
    tests: [
      { name: "Urine Blood", value: "+2", unit: "", kind: "urine" },
      { name: "Urine RBC", value: "10-15", unit: "/hpf", kind: "urine" },
    ],
  });
  assert.equal(r.status, 200);
  assert.ok(r.body?._engine?.patterns?.includes("hematuria_pattern"), JSON.stringify(r.body?._engine?.patterns));
});

test("T38: _engine.context فقط بیماری‌های فعال را نام می‌برد؛ فشار خون هرگز «لحاظ‌شده» گزارش نمی‌شود (FR-016/FR-019)", async () => {
  const tests = [{ name: "Fasting Blood Sugar", value: "95", unit: "mg/dL" }, { name: "LDL cholesterol", value: "114", unit: "mg/dL" }];
  const a = await analyze({ patient: { age: "45 سال", sex: "زن", conditions: ["htn", "dm2"] }, tests });
  assert.equal(a.status, 200);
  const ctx = a.body?._engine?.context;
  assert.ok(ctx, "context در _engine نیست");
  assert.equal(ctx.sex, "زن");
  assert.equal(ctx.age_text, "۴۵ سال");
  assert.deepEqual(ctx.conditions_applied, [{ id: "dm2", fa: "دیابت نوع ۲" }]);
  assert.ok(a.body._engine.patterns.includes("lipid_profile"));
  const b = await analyze({ patient: { age: "45 سال", sex: "زن", conditions: ["htn"] }, tests });
  assert.deepEqual(b.body._engine.context.conditions_applied, []);
  assert.doesNotMatch(JSON.stringify(b.body._engine.context), /فشار/);
});

async function analyzePhoto(sheetPatient, formPatient, tests) {
  // یک پاسخِ مدل برای هر دو مرحله: OCR فیلدهای tests/patient را برمی‌دارد، تفسیر summary/interpretation را.
  llmPayload = { tests, patient: sheetPatient, ...modelSays() };
  llmRawContent = null;
  const res = await realFetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ imageDataUrls: ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="], patient: formPatient }),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

test("T39: برگه «مرد»، پروفایل «زن» → با زن سنجیده می‌شود و یک جملهٔ اختلاف در ocr_warnings می‌آید؛ هم‌خوان ⇒ بی‌جمله (FR-017)", async () => {
  const tests = [{ name: "Hemoglobin", value: "12.5", unit: "g/dL", reference: "" }];
  const r = await analyzePhoto({ sex: "مرد", age: "45" }, { sex: "زن", age: "45 سال" }, tests);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body._engine.context.sex, "زن");
  const w = (r.body.ocr_warnings ?? []).join(" ");
  assert.match(w, /روی برگه جنسیت «مرد» چاپ شده/);
  const ok = await analyzePhoto({ sex: "زن", age: "45" }, { sex: "زن", age: "45 سال" }, tests);
  assert.doesNotMatch((ok.body.ocr_warnings ?? []).join(" "), /چاپ شده، ولی|فرق دارد؛ تفسیر با سنِ پروفایل/);
});

test("T36: احراز هویتِ خاموش — پروفایل و حذفِ حساب ۴۰۹ «local_only» می‌دهند و نامی در پایگاه‌داده نوشته نمی‌شود (research R7)", async () => {
  // 🔴 در حالتِ خاموش همه userId=1اند؛ نوشتنِ نام یعنی بیمارِ بعدی نامِ قبلی را می‌بیند.
  const req = (method, url, body) => realFetch(`${baseUrl}${url}`, {
    method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
  const p = await req("PATCH", "/api/profile", { firstName: "سارا", lastName: "رضایی" });
  assert.equal(p.status, 409);
  assert.equal(p.body.code, "local_only");
  assert.equal((await req("GET", "/api/profile")).status, 409);
  assert.equal((await req("DELETE", "/api/auth/me", { confirm: true })).status, 409);
  const { getProfile } = await import("./database.js");
  assert.equal(await getProfile(1), null, "پروفایلی برای کاربرِ ناشناس نوشته شد");
});

// ── specs/011، بازبینیِ کد ──

test("T41: برگهٔ نوزاد با پروفایلِ بزرگسال → اول تأیید (PATIENT_MISMATCH)؛ با «ادامه بده» پروفایل برنده است؛ هم‌گروه ⇒ بی‌پرسش", async () => {
  // 🔴 پیش‌تر پروفایلِ مادر (۳۲ سال) بی‌صدا جای سنِ «۳ روز»ِ برگه می‌نشست و قندِ ۳۸ِ نوزاد از اورژانس به «این هفته» می‌افتاد.
  const tests = [{ name: "Glucose", value: "38", unit: "mg/dL", reference: "" }];
  const a = await analyzePhoto({ age: "3 روز" }, { sex: "زن", age: "32 سال" }, tests);
  assert.equal(a.status, 422, JSON.stringify(a.body));
  assert.equal(a.body.code, "PATIENT_MISMATCH");
  assert.match(a.body.error, /گروهِ سنی/);
  // تأییدِ صریح ⇒ همان رفتارِ FR-017
  llmPayload = { tests, patient: { age: "3 روز" }, ...modelSays() };
  const res = await realFetch(`${baseUrl}/api/analyze`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ imageDataUrls: ["data:image/png;base64,iVBORw0KGgo="], patient: { sex: "زن", age: "32 سال" }, ignorePatientMismatch: true }),
  });
  const b = await res.json();
  assert.equal(res.status, 200, JSON.stringify(b));
  assert.equal(b._engine.context.age_text, "۳۲ سال");
  // هم‌گروه (۴۵ و ۴۷) ⇒ بی‌پرسش، فقط جملهٔ اختلاف
  const c = await analyzePhoto({ age: "47" }, { sex: "زن", age: "45 سال" }, [{ name: "Hemoglobin", value: "12.5", unit: "g/dL", reference: "" }]);
  assert.equal(c.status, 200);
});

test("T42: برگهٔ فقط-ادرار در مسیرِ موتور — نیتریتِ مثبتی که هیچ یافته‌ای نامش را نبرد در ocr_warnings نام برده می‌شود (N18)", async () => {
  const r = await analyze({
    patient: { age: 40, sex: "F" },
    tests: [
      { name: "Urine Specific Gravity", value: "1.040", kind: "urine" },
      { name: "Urine Nitrite", value: "Positive", kind: "urine" },
      { name: "Urine Protein", value: "Negative", kind: "urine" },
    ],
  });
  assert.equal(r.status, 200);
  assert.ok(r.body._engine, "مسیرِ موتور گرفته نشد");
  // ۲۰۲۶-۱۰-۰۳ (P67): نیتریتِ تنها حالا قاعدهٔ خودش را دارد (urine_nitrite_alone) — پس باید «یافته» باشد، نه فقط هشدار.
  assert.ok(r.body._engine.patterns.includes("urine_nitrite_alone"), "نیتریتِ مثبتِ تنها بی‌یافته ماند");
  const w = (r.body.ocr_warnings ?? []).join(" ");
  assert.doesNotMatch(w, /Urine Protein/, "ردیفِ منفی نباید نام برده شود");
});

test("T43: dm2 فقط وقتی «لحاظ‌شده» است که شاخه‌اش واقعاً یافته ساخت — برگهٔ فقط-CBC آن را در context نمی‌آورد (FR-016)", async () => {
  const cbc = await analyze({ patient: { age: "45 سال", sex: "زن", conditions: ["dm2"] }, tests: [{ name: "Hemoglobin", value: "10.5", unit: "g/dL" }] });
  assert.equal(cbc.status, 200);
  assert.deepEqual(cbc.body._engine.context.conditions_applied, []);
  const lipid = await analyze({ patient: { age: "45 سال", sex: "زن", conditions: ["dm2"] }, tests: [{ name: "LDL cholesterol", value: "114", unit: "mg/dL" }] });
  assert.deepEqual(lipid.body._engine.context.conditions_applied, [{ id: "dm2", fa: "دیابت نوع ۲" }]);
});

test("T44: AUTH خاموش — نتیجهٔ کاربرِ ناشناس در جدولِ jobs ذخیره نمی‌شود (حذف‌شدنی نبود و به اولین کاربرِ ثبت‌نامی می‌رسید)", async () => {
  const { getUserJobs } = await import("./database.js");
  const before = (await getUserJobs(1)).length;
  const r = await realFetch(`${baseUrl}/api/analyze/start`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ patient: { age: 40, sex: "M" }, tests: [{ name: "Hemoglobin", value: "14", unit: "g/dL" }], testResults: "Hb 14" }),
  });
  assert.equal(r.status, 202);
  await new Promise((res) => setTimeout(res, 300));
  assert.equal((await getUserJobs(1)).length, before);
});

// ─────────── specs/012 (P68): سرولوژیِ ردیف ۱ — قراردادِ مسیرِ سرور (C4) و ادغامِ چندصفحه‌ای (SC-008) ───────────
// 🔴 پیش از specs/012 برگهٔ فقط-VDRL هیچ تستِ نمره‌دار و هیچ ردیفِ شناخته‌شده‌ای نداشت ⇒ مسیرِ قدیمِ بی‌موتور، جایی که مدل
//    خودش قضاوت می‌کند (N18 در لایهٔ مسیریابی). و پس از افزودنِ خواننده، شبکهٔ unreadQualRows همان VDRL را «ردیفِ ادرارِ
//    توضیح‌داده‌نشده» گزارش می‌کرد چون QUAL_WORDS فقط واژه‌های ادرار را می‌شناخت.
test("T45: برگهٔ فقط-VDRL در مسیرِ موتور می‌ماند، یافتهٔ خودش را دارد و «ردیفِ ادرارِ توضیح‌داده‌نشده» گزارش نمی‌شود", async () => {
  // سرولوژی از عکسِ برگه می‌آید (فرمِ دستی فیلدِ سرولوژی ندارد و فقط عدد نگه می‌دارد) — پس مسیرِ عکس آزموده می‌شود.
  const r = await analyzePhoto({ sex: "زن", age: "30" }, { sex: "زن", age: "30 سال" }, [{ name: "VDRL", value: "Reactive 1:8", unit: "", reference: "Non-reactive" }]);
  assert.equal(r.status, 200);
  assert.ok(r.body._engine, "مسیرِ موتور گرفته نشد — مدل خودش قضاوت کرد");
  assert.ok(r.body._engine.patterns.includes("syphilis_screen_result"), `patterns=${r.body._engine.patterns}`);
  assert.doesNotMatch(JSON.stringify(r.body), /نتایج آزمایش شما در محدوده طبیعی است/, "VDRLِ واکنش‌گر «طبیعی» خوانده شد");
  const w = (r.body.ocr_warnings ?? []).join(" ");
  assert.doesNotMatch(w, /VDRL/, `VDRL به‌عنوانِ ردیفِ توضیح‌داده‌نشده گزارش شد: ${w}`);
});

test("T46: برگهٔ فقط-Anti-Tg (با بازهٔ چاپ‌شده) در مسیرِ موتور می‌ماند و یافتهٔ تیروئید می‌سازد", async () => {
  const r = await analyzePhoto({ sex: "زن", age: "40" }, { sex: "زن", age: "40 سال" }, [{ name: "Anti-Tg", value: "300", unit: "IU/mL", reference: "<115" }]);
  assert.equal(r.status, 200);
  assert.ok(r.body._engine, "مسیرِ موتور گرفته نشد");
  assert.ok(r.body._engine.patterns.includes("thyroid"), `patterns=${r.body._engine.patterns}`);
  assert.doesNotMatch(JSON.stringify(r.body), /نتایج آزمایش شما در محدوده طبیعی است/);
});

test("T47: دو صفحه — چربی (Tg = تری‌گلیسیرید) و تیروئید (Anti-Tg/TRAb)، به هر ترتیب: هیچ ردیفی گم یا جابه‌جا نمی‌شود (N25، SC-008)", async () => {
  const { mergePages } = await import("./server.js");
  const { runEngine } = await import("./rules/adapter.js");
  const { runPatterns } = await import("./rules/patterns.js");
  const lipid = { ok: true, page: 1, ocr: { patient: { age: "45", sex: "زن" }, tests: [
    { name: "Cholesterol", value: "190", unit: "mg/dL" }, { name: "Tg", value: "180", unit: "mg/dL" }, { name: "HDL", value: "50", unit: "mg/dL" }] } };
  const thy = { ok: true, page: 2, ocr: { patient: { age: "45", sex: "زن" }, tests: [
    { name: "TSH", value: "8", unit: "mIU/L" }, { name: "Anti-Tg", value: "300", unit: "IU/mL", reference: "<115" },
    { name: "TRAb", value: "0.5", unit: "IU/L", reference: "<1.75" }] } };
  for (const pages of [[lipid, thy], [thy, lipid]]) {
    const m = mergePages(pages);
    assert.equal(m.tests.length, 6, `ردیفی در ادغام گم شد (ترتیب ${pages.map((p) => p.page)}): ${m.tests.map((t) => t.name)}`);
    const e = runEngine({ patient: { age: 45, sex: "F" }, tests: m.tests });
    assert.equal(e.graded.find((g) => g.test === "TG")?.value, 180, "Tg دیگر تری‌گلیسیرید ۱۸۰ نیست");
    assert.equal(e.ungraded?.ANTI_TG?.reason, "assay_printed", "Anti-Tg به assay_printed نرسید");
    assert.equal(e.ungraded?.TRAB?.reason, "assay_printed", "TRAb به assay_printed نرسید");
    const f = runPatterns(e).findings;
    assert.equal(f.filter((x) => /تیروگلوبولین/.test(`${x.headline} ${x.must_say}`)).length, 1, "Anti-Tg در بیش از یک یافته (یا هیچ‌کدام) آمد");
  }
});

test("T48: دو صفحه — CBC و منی (با Sperm concentration و Spermogram)، به هر ترتیب: WBC/RBCِ CBC خون می‌مانند و هیچ ردیفی گم نمی‌شود", async () => {
  const { mergePages } = await import("./server.js");
  const { runEngine } = await import("./rules/adapter.js");
  const cbc = { ok: true, page: 1, ocr: { patient: { age: "35", sex: "مرد" }, tests: [
    { name: "WBC", value: "7.2", unit: "10*3/µL" }, { name: "RBC", value: "4.8", unit: "10*6/µL" }, { name: "Hb", value: "14", unit: "g/dL" }] } };
  const semen = { ok: true, page: 2, ocr: { patient: { age: "35", sex: "مرد" }, tests: [
    { name: "Volume", value: "2.5", unit: "mL" }, { name: "Sperm concentration", value: "40", unit: "million/mL" },
    { name: "WBC", value: "1", unit: "million/mL" }, { name: "RBC", value: "0", unit: "/hpf" }, { name: "Spermogram", value: "Normal" }] } };
  for (const pages of [[cbc, semen], [semen, cbc]]) {
    const m = mergePages(pages);
    assert.equal(m.tests.length, 8, `ردیفی در ادغام گم شد: ${m.tests.map((t) => t.name)}`);
    const e = runEngine({ patient: { age: 35, sex: "M" }, tests: m.tests });
    assert.equal(e.graded.find((g) => g.test === "WBC")?.value, 7.2, "WBCِ CBC گم یا جابه‌جا شد");
    assert.equal(e.graded.find((g) => g.test === "RBC")?.value, 4.8, "RBCِ CBC گم یا جابه‌جا شد");
    assert.ok(e.graded.some((g) => g.test === "SPERM_CONC"), "غلظتِ اسپرم درجه‌بندی نشد");
  }
});
