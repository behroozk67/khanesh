// ============================================================
// محتوایی که اجازهٔ عبور از مدلِ زبانی را ندارد  (کانالِ عیناً)
//
// مسئله: هر متنِ بالینی در این پروژه از یک مدلِ ارزان رد می‌شود تا فارسیِ
// روان شود. برای «هموگلوبینِ شما پایین است» بازنویسی بی‌خطر است. برای
// نامِ دارو، دوز، و راهِ مصرف نیست — آنجا یک کلمه جابه‌جا شدن یعنی
// دستورالعملِ غلط، و هیچ‌کدام از تورهای موجود این را نمی‌گیرند:
//   • coverage.js می‌سنجد آیا جمله *منتقل شده*، نه آیا *درست* منتقل شده.
//     سنجشش توکنی و با آستانهٔ ۰.۶ است، پس «وریدی» → «خوراکی» از آن رد می‌شود.
//   • تضمینِ key_number فقط یک عدد را می‌بیند، نه واحد و نه راهِ مصرف.
//
// راه‌حل ساختاری است نه نظارتی: این متن اصلاً به مدل داده نمی‌شود.
// روی finding در فیلدِ `protected` می‌نشیند، از payloadِ پرامپت بیرون
// می‌ماند، و server.js آن را *پس از* مدل، مستقیم از موتور به پاسخ می‌چسباند.
// یعنی یکسان‌بودنش با خروجیِ موتور یک تضمینِ ساختاری است، نه نتیجهٔ یک تست.
//
// ⚠️ این فایل هیچ محتوای بالینیِ جدیدی نمی‌سازد. فقط مسیرِ متنی را عوض
//    می‌کند که از قبل در قواعد نوشته شده بود. افزودنِ نامِ دارو یا دوزی که
//    در موتور نیست، همان اختراعی است که کلِ این معماری برای جلوگیری‌اش هست
//    — از MEDICAL_RULES.md رد شود، نه از اینجا.
// ============================================================

import { normalizeFa } from "./coverage.js";

/** انواعِ مجاز. `kind` فقط برچسبِ نمایشی نیست — رابط کاربری بر اساسش تفکیک می‌کند. */
export const PROTECTED_KINDS = new Set([
  "drug",             // نامِ دارو
  "dose",             // مقدارِ مصرف
  "route",            // راهِ مصرف (وریدی، خوراکی، …)
  "treatment",        // دستورِ درمانی که عاملی را نام می‌برد
  "contraindication", // «این را مصرف نکن»
]);

/**
 * جمع‌آوریِ محتوای محافظت‌شده از یافته‌ها.
 * ترتیب = ترتیبِ یافته‌ها (که خودش با فوریت مرتب شده)، پس اورژانس بالا می‌ماند.
 */
export function collectProtected(patternOut) {
  const out = [];
  for (const f of patternOut?.findings ?? []) {
    for (const p of f.protected ?? []) {
      if (!p?.text) continue;
      if (!PROTECTED_KINDS.has(p.kind)) {
        // بی‌صدا ردش نکن — کلاسِ N15: گاردی که بد را بی‌شمار می‌اندازد،
        // شکستِ بلند را به سکوت تبدیل می‌کند.
        throw new Error(
          `نوعِ محافظت‌شدهٔ ناشناخته «${p.kind}» در قاعدهٔ ${f.rule_id} — ` +
          `مجازها: ${[...PROTECTED_KINDS].join(", ")}`,
        );
      }
      out.push({
        kind: p.kind,
        text: p.text,
        from: f.rule_id,
        urgency: f.urgency,
      });
    }
  }
  // تکراری‌زدایی روی متنِ عینی: دو یافته می‌توانند یک هشدارِ دارویی بدهند.
  const seen = new Set();
  return out.filter((p) => {
    const k = `${p.kind}|${p.text}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ============================================================
// آشکارسازِ دوز/راهِ مصرف در متنِ آزاد
//
// کاربردش در پرودکشن باریک است: آیا *مدل* دوز یا راهِ مصرفی نوشته که در
// هیچ رشتهٔ موتور نبوده؟ پس خروجیِ خامِ آشکارساز به‌تنهایی معنا ندارد —
// همیشه با متنِ موتور مقایسه می‌شود (invented()).
// ============================================================

// ⚠️ واحدهای آزمایشگاهی دوز نیستند. «mg/dL» و «میلی‌گرم بر دسی‌لیتر» روی
//    هر برگهٔ چربی هست و اگر اینجا بیفتند، آشکارساز روی پنلِ عادی مثبت
//    می‌شود و کسی دیگر به هشدارش نگاه نمی‌کند.
const LAB_UNIT_TAIL = /^\s*(?:\/|بر\s|per\s|در\s*(?:دسی[\s‌]?لیتر|لیتر|دقیقه|میلی[\s‌]?لیتر|میکرو[\s‌]?لیتر))/;   // لنگر ^: بی آن هر «/» بعدیِ جمله دوزِ واقعی را پنهان می‌کرد؛ «گرم در دسی‌لیتر» واحدِ آزمایش است

const DOSE_RX = new RegExp(
  String.raw`(?:\d|[۰-۹])+(?:[.,](?:\d|[۰-۹])+)?\s*` +
  String.raw`(?:mg|mcg|µg|ug|g|ml|cc|IU|U)\b` +
  `|` +
  String.raw`(?:\d|[۰-۹])+(?:[.,](?:\d|[۰-۹])+)?\s*` +
  String.raw`(?:میلی[\s‌]?گرم|میکرو[\s‌]?گرم|میلی[\s‌]?لیتر|سی[\s‌]?سی|واحد|گرم)`,
  "gi",
);

// ⚠️ تلهٔ `\b` در جاوااسکریپت: مرزِ کلمه فقط بین [A-Za-z0-9_] و بقیه
//    تعریف می‌شود. حروف فارسی \w نیستند، پس «وریدی» با \b پایانی *هرگز*
//    match نمی‌شود (اندازه‌گیری‌شده: dosageSignals('وارفارین وریدی') → []).
//    به‌جای \b از مرزهای صریحِ «اول/آخرِ حرفِ یونیکد» استفاده می‌کنیم؛
//    lookaround عرضِ صفر است و متن را مصرف نمی‌کند، پس همسایه‌ها دست‌نخورده
//    می‌مانند. با این اصلاح همان ورودی → [{kind:'route', match:'وریدی'}].
const FA_WORD = String.raw`[\p{L}\p{N}ـ]`;
const ROUTE_RX = new RegExp(
  `(?<!${FA_WORD})(?:وریدی|داخل[\\s‌]?وریدی|خوراکی|زیرجلدی|زیر[\\s‌]?جلدی|عضلانی|تزریقی|زیرزبانی|مقعدی|استنشاقی)(?!${FA_WORD})` +
  `|\\b(?:IV|IM|SC|PO|SL)\\b`,
  "giu",
);

const FREQ_RX =
  /(?:روزی|هر)\s*(?:\d|[۰-۹])+\s*(?:بار|ساعت|روز)|(?:\d|[۰-۹])+\s*بار\s*در\s*(?:روز|هفته)/gi;

/**
 * همهٔ نشانه‌های دوز/راه/تناوب در یک متن.
 * @returns {{kind:string, match:string}[]}
 */
export function dosageSignals(text) {
  const s = String(text ?? "");
  const hits = [];

  for (const m of s.matchAll(DOSE_RX)) {
    // «۱۳۰ میلی‌گرم بر دسی‌لیتر» یک محدودهٔ مرجع است، نه دوز.
    const tail = s.slice(m.index + m[0].length);
    if (LAB_UNIT_TAIL.test(tail)) continue;
    hits.push({ kind: "dose", match: m[0].trim() });
  }
  for (const m of s.matchAll(ROUTE_RX)) hits.push({ kind: "route", match: m[0].trim() });
  for (const m of s.matchAll(FREQ_RX)) hits.push({ kind: "frequency", match: m[0].trim() });

  return hits;
}

/**
 * نشانه‌هایی که مدل نوشته ولی در هیچ متنِ موتوری نبوده‌اند.
 *
 * مقایسه روی متنِ نرمال‌شده است (نیم‌فاصله/ی‌ک عربی/ارقام فارسی)، چون مدل
 * «میلی‌گرم» را با نیم‌فاصله و موتور بدونش می‌نویسد و برعکس — و آن تفاوت
 * نباید «مدل از خودش ساخت» خوانده شود.
 *
 * @param {string}   modelText  متنی که مدل تولید کرده
 * @param {string[]} engineText همهٔ رشته‌های موتور برای همین پاسخ
 */
export function inventedDosage(modelText, engineText) {
  const engineNorm = normalizeFa((engineText ?? []).join(" \n "));
  const engineSet = new Set(dosageSignals(engineText?.join(" \n ") ?? "").map((h) => normalizeFa(h.match)));

  return dosageSignals(modelText).filter((h) => {
    const n = normalizeFa(h.match);
    if (engineSet.has(n)) return false;
    // فرمِ دقیق نیامده ولی متنِ موتور همان را در بر دارد (اختلافِ فاصله)
    return !engineNorm.includes(n);
  });
}

/**
 * همهٔ رشته‌هایی که *موتور* برای این پاسخ تولید کرده — مرجعِ مقایسه.
 * محتوای محافظت‌شده عمداً داخل است: خودش متنِ موتور است و مدل ندیده‌اش،
 * ولی وقتی در پاسخ کنارِ متنِ مدل می‌نشیند، نباید «اختراعِ مدل» شمرده شود.
 */
export function engineStrings(patternOut) {
  const out = [];
  for (const f of patternOut?.findings ?? []) {
    if (f.headline) out.push(f.headline);
    if (f.must_say) out.push(f.must_say);
    if (f.action) out.push(f.action);
    for (const w of f.warnings ?? []) out.push(w);
    for (const s of f.suggest ?? []) out.push(String(s));
    for (const p of f.protected ?? []) out.push(p.text);
  }
  return out;
}

/**
 * تمامیتِ کانال: هر رشتهٔ محافظت‌شده باید عیناً در پاسخ باشد.
 * هارنسِ e2e و تستِ رگرسیون هر دو از همین استفاده می‌کنند.
 *
 * @returns {{ok:boolean, missing:object[], mangled:object[]}}
 *   missing = در critical_verbatim نیست
 *   mangled = مدل نسخهٔ تغییریافته‌ای از آن را در متنِ خودش آورده
 */
export function verbatimIntegrity(responseBody, patternOut) {
  const expected = collectProtected(patternOut);
  const got = responseBody?.critical_verbatim ?? [];
  const gotTexts = new Set(got.map((g) => g.text));

  const missing = expected.filter((e) => !gotTexts.has(e.text));

  // متنِ مدل نباید نسخهٔ دیگری از همان دستور را داشته باشد. سنجه: نشانه‌های
  // دوز/راهِ داخلِ رشتهٔ محافظت‌شده که در متنِ مدل هم آمده‌اند ولی جملهٔ
  // در بر گیرنده‌شان با اصل یکی نیست.
  const modelText = [responseBody?.summary, responseBody?.interpretation]
    .filter(Boolean).join(" ");
  const mangled = [];
  for (const e of expected) {
    for (const sig of dosageSignals(e.text)) {
      const inModel = normalizeFa(modelText).includes(normalizeFa(sig.match));
      if (inModel && !modelText.includes(e.text)) {
        mangled.push({ from: e.from, signal: sig.match, kind: sig.kind });
      }
    }
  }

  return { ok: missing.length === 0 && mangled.length === 0, missing, mangled };
}
