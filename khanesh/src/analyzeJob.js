// ============================================================
// کلاینتِ مسیرِ ناهمگام تحلیل — شروع، پرسشِ دوره‌ای، بازیابی
//
// مسئلهٔ اصلی: تحلیل ۹۰ تا ۱۵۰ ثانیه طول می‌کشد و قبلاً کلِ نتیجه در بدنهٔ
// یک fetch طولانی می‌آمد و هیچ‌جا ذخیره نمی‌شد. قفل شدن گوشی، رفتن به
// یک اپ دیگر، یا یک pull-to-refresh، همه‌چیز را از بین می‌برد.
//
// حالا شناسهٔ کار در localStorage می‌نشیند: کاربر که برمی‌گردد، به‌جای فرمِ
// خالی نتیجهٔ آماده را می‌بیند و اصلاً نمی‌فهمد چیزی قطع شده بود.
//
// ⚠️ داده فقط روی دستگاهِ خودِ کاربر می‌ماند و هرگز جایی فرستاده نمی‌شود.
//    سرور هم کار را بیش از ۳۰ دقیقه نگه نمی‌دارد.
// ============================================================

// ⚠️ رقمِ فارسی از digits.js می‌آید، نه از یک کپیِ محلی. قبلاً همین تابع دو
//    بار تعریف شده بود (اینجا faNum، و toFa در ResultView.jsx) — دو نسخه از
//    یک سیاستِ نمایشی که هیچ‌چیز هم‌خوانی‌شان را تضمین نمی‌کرد.
import { toFaDigits as faNum } from "./digits.js";
import { deviceId, activeMemberId } from "./deviceId.js";

const START_URL = "/api/analyze/start";
const JOB_URL = "/api/analyze/job/";
const LS_KEY = "khanesh_job";
const LS_RESULT = "khanesh_last_result";

const POLL_MS = 2000;
const JOB_MAX_AGE_MS = 30 * 60 * 1000;   // هم‌تراز با TTL سرور
const MAX_POLL_FAILURES = 6;             // تونل ≠ شکستِ تحلیل

/* ---------- ذخیره‌سازی محلی ---------- */

function safeGet(key) {
  try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; }
}
function safeSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* حالت خصوصی/پر */ }
}
function safeDel(key) {
  try { localStorage.removeItem(key); } catch { /* بی‌اهمیت */ }
}

export function storeJob(id, pagesTotal) {
  safeSet(LS_KEY, { id, startedAt: Date.now(), pagesTotal });
}
export function clearJob() { safeDel(LS_KEY); }

/** کارِ ناتمامِ باقی‌مانده از بازدیدِ قبلی — اگر هنوز منقضی نشده */
export function pendingJob() {
  const j = safeGet(LS_KEY);
  if (!j?.id) return null;
  if (Date.now() - (j.startedAt || 0) > JOB_MAX_AGE_MS) { clearJob(); return null; }
  return j;
}

export function storeResult(result) {
  safeSet(LS_RESULT, { at: Date.now(), result });
}
export function lastResult() {
  const r = safeGet(LS_RESULT);
  if (!r?.result) return null;
  if (Date.now() - (r.at || 0) > JOB_MAX_AGE_MS) { safeDel(LS_RESULT); return null; }
  return r;
}
export function clearResult() { safeDel(LS_RESULT); }

/* ---------- شبکه ---------- */

/**
 * هدرِ احراز هویت.
 *
 * ⚠️ `pollJob` هم به این نیاز دارد، نه فقط `startJob`: روتِ
 *    `GET /api/analyze/job/:id` از ۲۰۲۶-۰۹-۱۷ `requireAuth` دارد و نتیجه را
 *    به مالکِ کار مقید می‌کند (پیش از آن، هر کسی با یک شناسه تفسیرِ کاملِ
 *    بیمارِ دیگری را می‌خواند). بدونِ این تابع، شروعِ تحلیل موفق می‌شد و
 *    poll ۴۰۱ می‌گرفت — یعنی تحلیلِ پرداخت‌شده روی زمین می‌ماند.
 */
function authHeaders(base = {}) {
  const token = localStorage.getItem('auth_token');
  // P120: شناسهٔ دستگاه هم لازم است — بدونِ آن، تحلیلِ کاربرِ ناشناس در
  // تاریخچهٔ هیچ مالکی نمی‌نشیند و «نوبتِ قبل» هیچ‌وقت پیدا نمی‌شود.
  const dev = deviceId();
  const h = { ...base, 'x-device-id': dev };
  const member = activeMemberId();
  if (member) h['x-member-id'] = member;
  return token ? { ...h, Authorization: `Bearer ${token}` } : h;
}

/** ۴۰۱ یعنی نشست منقضی/غایب است — توکنِ بی‌اثر باید پاک شود تا صفحهٔ ورود بیاید. */
function authError(status, data) {
  if (status !== 401) return null;
  try { localStorage.removeItem('auth_token'); } catch { /* حالتِ خصوصی مرورگر */ }
  const err = new Error(data?.error || "برای دیدن نتیجه باید وارد شوید. لطفاً دوباره وارد شوید.");
  err.code = "auth_required";
  return err;
}

export async function startJob(payload, signal) {
  const headers = authHeaders({ "Content-Type": "application/json" });

  const res = await fetch(START_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal,
  });
  let data = null;
  try { data = await res.json(); } catch { /* JSON نبود */ }
  if (!res.ok) {
    const authErr = authError(res.status, data);
    if (authErr) throw authErr;
    const err = new Error(data?.error || `خطای سرور (${res.status})`);
    if (data?.code) err.code = data.code;
    throw err;
  }
  if (!data?.job_id) throw new Error("پاسخ سرور شناسهٔ تحلیل نداشت.");
  return data;
}

/**
 * تا تمام شدنِ کار poll می‌کند.
 *
 * onProgress({pagesDone, pagesTotal, lastPageTests, degraded}) — پیشرفتِ واقعی.
 * خطای موقتِ شبکه کار را نمی‌کشد: با degraded=true ادامه می‌دهد و فقط بعد
 * از MAX_POLL_FAILURES بارِ پیاپی تسلیم می‌شود. یک تونل، تحلیلِ شکست‌خورده نیست.
 *
 * ⚠️ فراخوانیِ degraded عمداً **فقط همان یک کلید** را می‌فرستد، چون دربارهٔ
 *    صفحه‌ها هیچ خبرِ تازه‌ای ندارد. مصرف‌کننده باید آن را روی حالتِ قبلی
 *    merge کند، نه جایگزینش. (تا امروز Tafsir.jsx جایگزین می‌کرد و نتیجه‌اش
 *    این بود که با یک قطعیِ لحظه‌ای، «صفحهٔ ۲ از ۳ خوانده شد» و نوارِ پیشرفت
 *    هر دو از صفحه پاک می‌شدند و بعد برمی‌گشتند — دقیقاً همان چیزی که
 *    این حالت قرار بود جلویش را بگیرد.)
 */
export async function pollJob(id, { onProgress, signal } = {}) {
  let failures = 0;

  for (;;) {
    if (signal?.aborted) throw new DOMException("aborted", "AbortError");

    let res, data = null;
    try {
      res = await fetch(JOB_URL + encodeURIComponent(id), { headers: authHeaders(), signal });
      try { data = await res.json(); } catch { /* JSON نبود */ }
      failures = 0;
    } catch (e) {
      if (e.name === "AbortError") throw e;
      if (++failures >= MAX_POLL_FAILURES) {
        throw new Error("اتصال برقرار نشد. لطفاً دوباره تلاش کنید.");
      }
      onProgress?.({ degraded: true });
      await sleep(POLL_MS * Math.min(failures, 3), signal);
      continue;
    }

    if (res.status === 404) {
      clearJob();
      throw new Error(data?.error || "این تحلیل پیدا نشد یا منقضی شده.");
    }
    const authErr = authError(res.status, data);
    if (authErr) throw authErr;
    if (!res.ok) throw new Error(data?.error || `خطای سرور (${res.status})`);

    if (data.status === "running") {
      onProgress?.({
        pagesDone: data.pages_done,
        pagesTotal: data.pages_total,
        lastPageTests: data.last_page_tests,
        degraded: false,
      });
      await sleep(POLL_MS, signal);
      continue;
    }

    // برگه با موفقیت خوانده شده و در انتظار پرداخت است
    if (data.status === "awaiting_payment") {
      return {
        _requiresPayment: true,
        status: "awaiting_payment",
        job_id: data.job_id,
        pages_total: data.pages_total,
        tests_count: data.tests_count,
        test_names: data.test_names,
        plan_id: data.plan_id,
        has_critical: data.has_critical === true,
        urgency: data.urgency ?? null,
        critical_banner: data.critical_banner ?? null,
        amount: data.amount,
        authority: data.authority,
        payment_url: data.payment_url,
      };
    }

    // تمام شد — چه موفق چه ناموفق
    clearJob();
    if (data.status === "error" || (data.status_code && data.status_code >= 400)) {
      const err = new Error(data.result?.error || "تحلیل با خطا مواجه شد.");
      if (data.result?.code) err.code = data.result.code;
      throw err;
    }
    storeResult(data.result);
    return data.result;
  }
}

// ⚠️ `{ once: true }` فقط وقتی listener را برمی‌دارد که رویدادِ abort *رخ دهد*.
//    در مسیرِ عادی (تایمر تمام می‌شود، abort نمی‌آید) listener می‌ماند، و
//    pollJob روی یک تحلیلِ ۹۰–۱۵۰ ثانیه‌ای ده‌ها بار sleep می‌کند — پس ده‌ها
//    listenerِ مرده روی همان AbortController جمع می‌شد. اثرِ کاربری نداشت،
//    ولی الگویش نشتی است، پس در هر دو مسیر پاک می‌شود.
function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(t);
      signal?.removeEventListener("abort", onAbort);
      reject(new DOMException("aborted", "AbortError"));
    };
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** متنِ حالتِ انتظار — هر جمله‌اش راست است، هیچ درصدِ ساختگی‌ای نیست
 *
 * ⚠️ «اتصال ضعیف» دیگر اینجا نیست و این عمدی است. قبلاً degraded کلِ این متن
 *    را می‌بلعید، یعنی وضعیتِ اتصال جای وضعیتِ کار را می‌گرفت — در حالی که
 *    این دو خبرِ مستقل‌اند: صفحهٔ ۲ از ۳ همچنان خوانده شده، ما فقط نمی‌توانیم
 *    خبرِ تازه بگیریم. حالا پیشرفت اینجا می‌ماند و اتصال بلوکِ خودش را دارد
 *    (.degraded در UploadCard)، پس هیچ‌کدام دیگری را پاک نمی‌کند.
 */
export function progressText(p) {
  if (!p) return "در حال آماده‌سازی…";
  const total = p.pagesTotal || 0;
  if (total > 1 && p.pagesDone > 0 && p.pagesDone < total) {
    const seen = p.lastPageTests ? ` — ${faNum(p.lastPageTests)} آزمایش` : "";
    return `صفحهٔ ${faNum(p.pagesDone)} خوانده شد${seen} · در حال خواندن صفحهٔ ${faNum(p.pagesDone + 1)} از ${faNum(total)}…`;
  }
  if (total > 1 && p.pagesDone >= total) return "همهٔ صفحه‌ها خوانده شد · در حال تفسیر…";
  if (total === 1 && p.pagesDone >= 1) return "عکس خوانده شد · در حال تفسیر…";
  if (total >= 1) return `در حال خواندن ${faNum(total)} عکس…`;
  return "در حال تفسیر نتایج…";
}

/** برآوردِ مدت: ~۲۵ ثانیه به‌ازای هر صفحه + ~۳۰ ثانیه تفسیر. کمی بیش‌برآورد عمدی است. */
export function etaText(pages) {
  const secs = 30 + 25 * Math.max(pages, 0);
  if (secs < 60) return "کمتر از یک دقیقه";
  const mins = Math.round((secs / 60) * 2) / 2;
  return `حدود ${faNum(String(mins).replace(".5", "٫۵"))} دقیقه`;
}
