// ============================================================
// انبارِ کارهای تحلیل — درون‌حافظه‌ای، با TTL
//
// چرا لازم شد: تا پیش از این، کلِ نتیجه در بدنهٔ یک درخواستِ POST طولانی
// برمی‌گشت. با IMAGE_CONCURRENCY=1 و OCR_RETRIES=3، یک برگهٔ سه‌صفحه‌ای
// معمولاً ۹۰ تا ۱۵۰ ثانیه طول می‌کشد و کلاینت در ۳۰۰ ثانیه abort می‌کند.
// در این بازه، هر چیزی که گوشی‌ها به‌طور عادی انجام می‌دهند — قفل شدن
// صفحه، رفتن به تلگرام، یک تونل، یک pull-to-refresh — کلِ کار و هزینهٔ
// واقعیِ OCR را از بین می‌برد و کاربر باید از عکس گرفتن شروع کند، بدون
// اینکه بفهمد چه شد.
//
// با شناسهٔ کار، بازگشتِ کاربر به‌جای فرمِ خالی، نتیجهٔ آماده را می‌بیند.
//
// ⚠️ محدودیتِ آگاهانه: این انبار درون‌حافظه‌ای است. با ری‌استارتِ سرور
//    کارهای در جریان از بین می‌روند، و اگر روزی چند نمونه (instance) پشت
//    یک لودبالانسر اجرا شود، poll ممکن است به نمونه‌ای برسد که کار را
//    ندارد. برای آن حالت به یک انبارِ مشترک (Redis) نیاز است. تا وقتی
//    استقرار تک‌نمونه‌ای است، این کافی و بدونِ وابستگیِ جدید است.
// ============================================================

const JOB_TTL_MS = 30 * 60 * 1000;   // ۳۰ دقیقه
const SWEEP_EVERY_MS = 5 * 60 * 1000;
const MAX_JOBS = 500;                // سقفِ ساده در برابر رشدِ بی‌مهار حافظه

const jobs = new Map();

function newId() {
  // crypto.randomUUID در نود ۱۹+ سراسری است
  return globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createJob(meta = {}) {
  // اگر سقف پر شد، قدیمی‌ترین کارِ تمام‌شده را بینداز بیرون
  if (jobs.size >= MAX_JOBS) {
    const oldestDone = [...jobs.entries()]
      .filter(([, j]) => j.status !== "running")
      .sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
    if (oldestDone) jobs.delete(oldestDone[0]);
  }

  const id = newId();
  jobs.set(id, {
    id,
    // ⚠️ مالکِ کار. بدونِ این، `getJob(id)` تنها چیزی که لازم داشت شناسهٔ کار
    //    بود — و شناسه در پاسخِ /start به کلاینت می‌رود. یعنی با AUTH_REQUIRED
    //    روشن هم، *شروعِ* تحلیل احراز هویت می‌خواست ولی *خواندنِ نتیجه‌اش* نه.
    //    نتیجه، کلِ تفسیرِ یک بیمار است. `requireAuth` همیشه `req.user.userId`
    //    را ست می‌کند (با احراز هویتِ خاموش، کاربرِ ناشناسِ مشترک)، پس این
    //    امروز رفتار را عوض نمی‌کند و روزی که روشن شود درست کار می‌کند.
    userId: meta.userId ?? null,
    status: "running",          // running | done | error
    createdAt: Date.now(),
    pagesTotal: meta.pagesTotal ?? 0,
    pagesDone: 0,
    lastPageTests: null,        // «صفحهٔ ۱ خوانده شد — ۱۴ آزمایش»
    statusCode: null,
    result: null,
  });
  return id;
}

/** پیشرفتِ واقعی: صفحات سریالی تمام می‌شوند، پس این عدد یکنواخت بالا می‌رود */
export function reportPage(id, pageNumber, testCount) {
  const j = jobs.get(id);
  if (!j || j.status !== "running") return;
  j.pagesDone = Math.max(j.pagesDone, pageNumber);
  j.lastPageTests = testCount ?? null;
}

export function finishJob(id, statusCode, body) {
  const j = jobs.get(id);
  if (!j) return;
  j.status = statusCode >= 400 ? "error" : "done";
  j.statusCode = statusCode;
  j.result = body;
  j.finishedAt = Date.now();
}

/** قرار دادن کار در وضعیت انتظار پرداخت پس از موفقیت OCR */
export function setJobAwaitingPayment(id, { planId, amount, authority, paymentUrl, testsCount, testNames, pendingResult }) {
  const j = jobs.get(id);
  if (!j) return;
  j.status = "awaiting_payment";
  j.paymentInfo = { planId, amount, authority, paymentUrl, testsCount, testNames };
  j.pendingResult = pendingResult;
}

/** آزادسازی کار پس از تایید موفقیت تراکنش در درگاه زرین‌پال */
export function unlockPaidJob(id, { refId, cardPan } = {}) {
  const j = jobs.get(id);
  if (!j) return null;
  j.status = "done";
  j.statusCode = 200;
  j.result = {
    ...j.pendingResult,
    _payment: {
      paid: true,
      refId: refId || null,
      cardPan: cardPan || null,
      planId: j.paymentInfo?.planId,
    },
  };
  j.paid = true;
  j.refId = refId;
  j.finishedAt = Date.now();
  return j.result;
}

export function getJob(id) {
  const j = jobs.get(id);
  if (!j) return null;
  if (Date.now() - j.createdAt > JOB_TTL_MS) {
    jobs.delete(id);
    return null;
  }
  return j;
}

/**
 * خواندنِ کار برای یک کاربرِ مشخص — تنها راهِ درستِ پاسخ به یک درخواستِ HTTP.
 *
 * ⚠️ عمداً «اگر مالک نداشت اجازه بده» ندارد: گاردی که در نبودِ داده باز
 *    می‌شود همان کلاسِ N18 است. کارِ بی‌مالک فقط از مسیرهای قدیمی می‌آید و
 *    نباید از این در خوانده شود.
 */
export function getJobFor(id, userId) {
  const j = getJob(id);
  if (!j) return null;
  if (userId == null || j.userId !== userId) return null;
  return j;
}

/** نمایِ روبه‌کلاینت — بدنهٔ نتیجه فقط وقتی کار تمام شده */
/** حذفِ حساب (specs/011): کارهای در-حافظهٔ این کاربر هم پاک شوند، نه فقط ردیف‌های DB. */
export function dropJobsForUser(userId) {
  for (const [id, j] of jobs) if (j.userId === userId) jobs.delete(id);
}

export function jobView(j) {
  if (j.status === "awaiting_payment") {
    return {
      job_id: j.id,
      status: "awaiting_payment",
      pages_total: j.pagesTotal,
      pages_done: j.pagesDone,
      tests_count: j.paymentInfo?.testsCount ?? 0,
      test_names: j.paymentInfo?.testNames ?? [],
      plan_id: j.paymentInfo?.planId ?? "starter",
      amount: j.paymentInfo?.amount ?? 39000,
      authority: j.paymentInfo?.authority ?? null,
      payment_url: j.paymentInfo?.paymentUrl ?? null,
    };
  }

  return {
    job_id: j.id,
    status: j.status,
    pages_total: j.pagesTotal,
    pages_done: j.pagesDone,
    last_page_tests: j.lastPageTests,
    ...(j.status === "running" ? {} : { status_code: j.statusCode, result: j.result }),
  };
}

export function sweepJobs() {
  const now = Date.now();
  for (const [id, j] of jobs) {
    if (now - j.createdAt > JOB_TTL_MS) jobs.delete(id);
  }
}

export function jobCount() {
  return jobs.size;
}

// جاروی دوره‌ای. unref تا این تایمر مانعِ خروجِ فرایند نشود (مهم برای تست).
const sweeper = setInterval(sweepJobs, SWEEP_EVERY_MS);
if (typeof sweeper.unref === "function") sweeper.unref();
