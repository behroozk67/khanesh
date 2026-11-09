// ============================================================
// ردیابیِ مرحله‌به‌مرحلهٔ یک درخواستِ تحلیل  (trace_id)
//
// چرا وجود دارد: وقتی خروجیِ نهایی با پاسخِ مرجعِ بالینی فرق می‌کند، سؤال
// «کجا خراب شد؟» تا امروز فقط با خواندنِ کد جواب داده می‌شد. مسیر یازده
// مرحله دارد و هر کدام می‌توانند بی‌صدا چیزی را بخورند:
//   نگاشتِ نامِ تست (N2)، واحد (N3)، قاعده‌ای که فعال نشد (N1/N16)،
//   یافته‌ای که به payloadِ مدل نرسید، مدلی که جمله‌ای را انداخت (N7)،
//   و تورِ ایمنی‌ای که جملهٔ *درستی* را حذف کرد (کلاسِ stripUnmeasuredClaims).
//
// این ماژول ورودی و خروجیِ هر مرحله را زیر یک شناسه ثبت می‌کند تا
// «تشخیصِ موتور»، «تحویل به مدل» و «بازنویسیِ مدل» از هم قابلِ تفکیک شوند.
//
// ⚠️ حریم خصوصی — این تنها جای پروژه است که مقدارِ بالینیِ بیمار را عمداً
//    نگه می‌دارد. بقیهٔ کد فقط نامِ تست را لاگ می‌کند (به server.js خط ۸۹۸
//    نگاه کن). پس:
//      • پیش‌فرض خاموش است. با TRACE=1 یا setTraceEnabled(true) روشن می‌شود.
//      • بایت‌های عکس هرگز ثبت نمی‌شوند — فقط طول و تعداد.
//      • پوشهٔ .traces/ در .gitignore است.
//      • در پرودکشن روشنش نکن مگر با تصمیمِ آگاهانه دربارهٔ نگهداری و حذف.
// ============================================================

import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const TRACE_DIR = path.join(HERE, ".traces");

// ── ترتیبِ قطعیِ مراحل ───────────────────────────────────────
// ⚠️ این آرایه قراردادِ مکان‌یابیِ خطاست، نه یک فهرستِ توصیفی. localize.mjs
//    «زودترین مرحله‌ای که انتظار در آن نقض شد» را با همین ترتیب پیدا می‌کند،
//    پس جابه‌جا کردنِ دو عضو یعنی عوض‌شدنِ نتیجهٔ انتساب. عضوِ جدید را در
//    جای واقعی‌اش در خطِ لوله بگذار، نه ته فهرست.
export const STAGES = [
  "intake",       // بدنهٔ درخواست، نرمال‌شده (بدون بایتِ عکس)
  "ocr",          // خروجیِ خامِ هر صفحه از مدلِ بینایی
  "merge",        // ادغامِ صفحات + تعارض‌ها
  "adapter",      // نگاشتِ نام→کلید، تبدیلِ واحد، نگاشت‌نشده‌ها
  "grade",        // درجه‌بندیِ هر تست در برابر محدودهٔ مرجع
  "patterns",     // یافته‌های چندتستی + فوریتِ کلی
  "protected",    // محتوایی که اجازهٔ عبور از مدل را ندارد
  "prompt",       // دقیقاً همان messages که به مدل رفت
  "llm_raw",      // دقیقاً همان رشته‌ای که مدل برگرداند
  "parse",        // JSONِ خوانده‌شده از آن رشته
  "safety_nets",  // هر تور: قبل، بعد، و اینکه چه چیزی عوض شد
  "response",     // بدنهٔ نهایی که به کلاینت رفت
];

const STAGE_INDEX = new Map(STAGES.map((s, i) => [s, i]));

/** شمارهٔ ترتیبیِ یک مرحله؛ برای مقایسهٔ «زودتر/دیرتر» در مکان‌یابیِ خطا */
export function stageOrder(name) {
  const i = STAGE_INDEX.get(name);
  return i === undefined ? Number.MAX_SAFE_INTEGER : i;
}

// ── وضعیت ────────────────────────────────────────────────────
let enabled = process.env.TRACE === "1";
let toDisk = process.env.TRACE_DISK === "1";

// حلقهٔ حافظه: هارنسِ e2e در همین فرایند اجرا می‌شود و ردها را از اینجا
// می‌خواند، پس نه به دیسک نیاز دارد نه به رقابتِ فایل.
const RING_MAX = Number(process.env.TRACE_RING || 200);
const ring = new Map();   // traceId → trace

export function setTraceEnabled(v) { enabled = !!v; }
export function isTraceEnabled() { return enabled; }
export function setTraceToDisk(v) { toDisk = !!v; }

/** پاکسازیِ کامل — هارنس بینِ سناریوها صدا می‌زند */
export function clearTraces() { ring.clear(); }

export function newTraceId() { return randomUUID(); }

// ── محدودکردنِ حجم ───────────────────────────────────────────
// یک data-URL عکس ~۴۰۰KB است و هیچ ارزشِ تشخیصی‌ای در ردِ خطا ندارد.
// هر رشتهٔ طولانی بریده می‌شود و *صراحتاً* علامت می‌خورد، تا کسی بریدگی
// را با «مدل چیزی نگفت» اشتباه نگیرد.
const MAX_STR = Number(process.env.TRACE_MAX_STR || 20000);

function shrink(v, depth = 0) {
  if (v == null) return v;
  if (typeof v === "string") {
    if (v.startsWith("data:image")) return `«data:image حذف شد — ${v.length} بایت»`;
    if (v.length > MAX_STR) return v.slice(0, MAX_STR) + `…«${v.length - MAX_STR} نویسهٔ دیگر بریده شد»`;
    return v;
  }
  if (typeof v !== "object") return v;
  if (depth > 8) return "«عمقِ بیش از حد»";
  if (Array.isArray(v)) return v.map((x) => shrink(x, depth + 1));
  const out = {};
  for (const [k, val] of Object.entries(v)) out[k] = shrink(val, depth + 1);
  return out;
}

/**
 * شروعِ یک رد. اگر ردیابی خاموش باشد، یک شیءِ بی‌اثر برمی‌گردد که همان
 * رابط را دارد — پس مسیرِ درخواست هیچ‌جا نیاز به `if (trace)` ندارد.
 */
export function beginTrace(meta = {}) {
  // از هدر x-trace-id می‌آید و نام فایل می‌شود؛ بدون این الگو، «../» بیرون از .traces می‌نویسد.
  const id = /^[\w-]{1,64}$/.test(meta.traceId ?? "") ? meta.traceId : newTraceId();
  if (!enabled) return noopTrace(id);

  const trace = {
    trace_id: id,
    started_at: new Date().toISOString(),
    meta: shrink(meta),
    stages: [],
    // خطاهایی که خودِ خطِ لوله انداخته — جدا از مراحل، چون مرحله‌ای که
    // throw کرده هیچ خروجی‌ای ثبت نمی‌کند و نبودش نباید «مرحله اجرا نشد»
    // خوانده شود.
    errors: [],
  };

  ring.set(id, trace);
  if (ring.size > RING_MAX) ring.delete(ring.keys().next().value);

  return {
    id,
    trace,
    stage(name, payload = {}) {
      if (!STAGE_INDEX.has(name)) {
        throw new Error(`مرحلهٔ ناشناخته در ردیابی: ${name} — به STAGES در trace.js اضافه‌اش کن`);
      }
      trace.stages.push({
        stage: name,
        order: STAGE_INDEX.get(name),
        at: new Date().toISOString(),
        ...shrink(payload),
      });
    },
    /**
     * ثبتِ یک تورِ ایمنی. جدا از stage() است چون چند تور زیرِ یک مرحله
     * می‌نشینند و مکان‌یاب باید بداند کدام‌یک متن را عوض کرده.
     *
     * ⚠️ `changed` را حدس نزن — از مقایسهٔ before/after بساز. توری که
     *    گزارش می‌دهد «کاری نکردم» ولی کرده، دقیقاً همان سکوتی است که
     *    این ماژول برای شکستنش نوشته شده.
     */
    net(name, before, after, extra = {}) {
      const b = JSON.stringify(before ?? null);
      const a = JSON.stringify(after ?? null);
      let entry = trace.stages.find((s) => s.stage === "safety_nets");
      if (!entry) {
        entry = { stage: "safety_nets", order: STAGE_INDEX.get("safety_nets"), at: new Date().toISOString(), nets: [] };
        trace.stages.push(entry);
      }
      entry.nets.push({
        net: name,
        changed: b !== a,
        before: shrink(before),
        after: shrink(after),
        ...shrink(extra),
      });
    },
    error(where, err) {
      trace.errors.push({ where, name: err?.name, message: err?.message });
    },
    finish(extra = {}) {
      trace.finished_at = new Date().toISOString();
      Object.assign(trace, shrink(extra));
      if (toDisk) writeTrace(trace);
      return trace;
    },
  };
}

function noopTrace(id) {
  const noop = () => {};
  return { id, trace: null, stage: noop, net: noop, error: noop, finish: () => null };
}

export function getTrace(id) { return ring.get(id) ?? null; }
export function allTraces() { return [...ring.values()]; }

/** آخرین مرحلهٔ ثبت‌شده با این نام (مراحل می‌توانند تکرار شوند، مثلاً ocr هر صفحه) */
export function stageOf(trace, name) {
  if (!trace) return null;
  const hits = trace.stages.filter((s) => s.stage === name);
  return hits.length ? hits[hits.length - 1] : null;
}

export function stagesOf(trace, name) {
  if (!trace) return [];
  return trace.stages.filter((s) => s.stage === name);
}

function writeTrace(trace) {
  try {
    fs.mkdirSync(TRACE_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(TRACE_DIR, `${trace.trace_id}.json`),
      JSON.stringify(trace, null, 2),
      "utf8",
    );
  } catch (e) {
    console.error("ثبتِ ردِ خطا روی دیسک شکست خورد:", e.message);
  }
}

/** گزارشِ راه‌اندازی — اگر ردیابی روشن است، بی‌صدا نباشد */
export function traceBootReport() {
  if (!enabled) return;
  console.warn(
    "⚠️ ردیابیِ درخواست‌ها روشن است (TRACE=1). مقادیرِ بالینیِ بیمار در حافظه" +
    (toDisk ? ` و در ${TRACE_DIR} ` : " ") +
    "نگه داشته می‌شود. در پرودکشن این را روشن نگذار.",
  );
}
