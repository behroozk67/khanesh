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

export function getJob(id) {
  const j = jobs.get(id);
  if (!j) return null;
  if (Date.now() - j.createdAt > JOB_TTL_MS) {
    jobs.delete(id);
    return null;
  }
  return j;
}

/** نمایِ روبه‌کلاینت — بدنهٔ نتیجه فقط وقتی کار تمام شده */
export function jobView(j) {
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
