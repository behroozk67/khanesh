// ============================================================
// حالت‌های نتیجه — واژه + شکل + رنگ.
//
// رنگ هرگز تنها حاملِ معنا نیست (WCAG 1.4.1): هر حالت برچسبِ فارسی و
// شکلِ نشانهٔ خودش را دارد، چون قرمز/زرد/سبز زیر دوترانوپی روی هم می‌افتند.
//
// قرمز انحصاراً برای اورژانس است. اگر جای دیگری — لینک، خطای فرم، دکمهٔ
// حذف — قرمز مصرف شود، «قرمز یعنی همین امروز» معنایش را از دست می‌دهد.
// (دکمهٔ «حذف صفحه» به همین دلیل در این نسخه از قرمز درآمد.)
//
// ⚠️ تغییرِ مکانیزم نسبت به نسخهٔ قبل: اینجا دیگر هیچ کدِ هگزی نیست.
//    هر حالت فقط یک کلاسِ CSS دارد و رنگ‌ها در :root داخل index.css
//    زندگی می‌کنند. قبلاً همان شش جفت رنگ هم اینجا (به‌صورت JS) و هم
//    آنجا (به‌صورت custom property) تعریف شده بود و هیچ‌چیز هم‌خوانی‌شان
//    را تضمین نمی‌کرد — متغیرهای CSS اصلاً خوانده نمی‌شدند.
// ============================================================

export const STATES = {
  normal: {
    key: "normal",
    label: "در محدوده",
    icon: "✓",
    cls: "st-normal",
  },
  // داخلِ محدوده ولی در ۱۰٪ لبه — خودِ موتور این را با nearLimit می‌گوید.
  // حالتِ جداگانه‌ای است چون «۹۹ با سقفِ ۱۰۰» و «۷۰ با سقفِ ۱۰۰» یک چیز نیستند،
  // ولی هیچ‌کدام «خارج از محدوده» نیستند و نباید رنگِ هشدار بگیرند.
  near: {
    key: "near",
    label: "در محدوده، نزدیک مرز",
    icon: "◑",
    cls: "st-near",
  },
  out: {
    key: "out",
    label: "خارج از محدوده",
    icon: "▲",
    cls: "st-out",
  },
  // حالتِ سوم: خارج از محدوده است ولی موتور الگویی برایش ندارد.
  // نه زنگ خطر، نه خطای سیستم — یک پرسشِ باز که پاسخش با پزشک است.
  // بنفشِ سرد عمدی است: زرد قبلاً برای هشدارهای OCR مصرف شده و قرمز رزرو است.
  unmatched: {
    key: "unmatched",
    label: "نیازمند بررسی",
    icon: "◌",
    cls: "st-unmatched",
  },
  emergency: {
    key: "emergency",
    label: "امروز",
    icon: "⚠",
    cls: "st-emergency",
  },
  // «اندازه‌گیری نشده» رنگِ اقدام و حاشیهٔ خط‌چین دارد، نه خاکستریِ بی‌اهمیت —
  // چون خاکستری «مهم نیست» خوانده می‌شود و همان اطمینانِ کاذبِ N4 را می‌سازد:
  // آزمایشِ غایب، آزمایشِ طبیعی نیست.
  missing: {
    key: "missing",
    label: "روی برگه نیست",
    icon: "—",
    cls: "st-missing",
  },
  // specs/019: ردیفی که روی برگه هست ولی موتور حکمی برایش ندارد (بدون محدودهٔ چاپی، بازهٔ ناخوانا، یا CEA بین دو حدِ
  // سیگاری/غیرسیگاری). نه «در محدوده» است نه «خارج از محدوده»: همان حاشیهٔ خط‌چینِ missing تا سبزِ کاذب (N4) نسازد.
  norange: {
    key: "norange",
    label: "بدون محدوده مرجع",
    icon: "◇",
    cls: "st-norange",
  },
};

/** برچسبِ فوریتِ کلِ برگه (`_engine.urgency`) — تنها نسخه؛ پیش‌تر داخلِ Scorecard.jsx بود. */
export const URGENCY = {
  emergency: { label: "همین امروز دیده شود", cls: "st-emergency" },
  // «۲۴ تا ۴۸ ساعت» — سطحِ جدا از ۲۰۲۶-۰۹-۲۸ (P56). همان رنگِ «خارج از محدوده»؛ رنگِ اورژانس نیست.
  soon: { label: "ظرفِ ۲۴ تا ۴۸ ساعت با پزشک", cls: "st-out" },
  this_week: { label: "این هفته با پزشک", cls: "st-out" },
  routine: { label: "در نوبت عادیِ پزشک", cls: "st-near" },
  none: { label: "پیگیریِ فوری لازم ندانست", cls: "st-normal" },
};

/**
 * زمینهٔ حکم برای یک پنل.
 *
 * چرا لازم شد: تا قبل از این، حالتِ هر ردیف فقط از `_engine.urgency` — یعنی
 * فوریتِ **کلِ پنل** — ساخته می‌شد. نتیجه‌اش این بود که در یک پنلِ اورژانسی،
 * HDLِ کمی پایین و پتاسیمِ درجهٔ ۳ هر دو چیپِ «امروز» می‌گرفتند. سرور از قبل
 * برای هر تست `fa`, `level`, `ctcaeGrade`, `nearLimit` را می‌فرستاد و کلاینت
 * هر چهارتا را دور می‌ریخت (serializeGraded در server.js دقیقاً برای همین
 * نوشته شده بود).
 *
 * ⚠️ مرزِ موتور: اینجا هیچ قضاوتِ بالینیِ تازه‌ای انجام نمی‌شود.
 *    • «اورژانس هست یا نه» را فقط موتور می‌گوید (urgency === "emergency").
 *      هیچ‌وقت از روی مقدار حدس نمی‌زنیم.
 *    • داخلِ یک پنلی که موتور اورژانسی اعلام کرده، فقط تصمیم می‌گیریم قرمز را
 *      روی کدام ردیف‌ها بگذاریم، و برای این کار از شدتِ خودِ موتور
 *      (level / ctcaeGrade) استفاده می‌کنیم، نه از عدد.
 *    • اگر هیچ ردیفی شدتِ بالا نداشت (اورژانسِ الگومحور، مثل رابدومیولیز)،
 *      قرمز روی **همهٔ** ردیف‌های غیرطبیعی می‌رود. خطا همیشه به سمتِ
 *      بیش‌نمایی است، نه کم‌خوانی — کم‌خوانیِ خاموش بدترین شکستِ این پروژه است.
 */
/*
 * 🔴 باگِ واقعی (۲۰۲۶-۰۹-۱۷): پارامترِ سومِ این تابع یک بولینِ **کل‌پنلی** بود
 *    (`patterns.includes("unmatched_abnormal")`) و `stateOf` آن را به *هر*
 *    ردیفِ غیرطبیعی می‌چسباند. پس بیمارِ فقر آهن که یک ALPِ بالای بی‌ربط هم
 *    داشت، کنارِ Hb و MCV — که همان صفحه با اطمینان توضیحشان داده بود —
 *    چیپِ «نیازمند بررسی» می‌دید. سیگنالی که دربارهٔ پنل درست است دربارهٔ یک
 *    تست غلط است. حالا سرور فهرستِ دقیقِ کلیدها را در `_engine.uncovered`
 *    می‌فرستد و این تابع فقط عضویت را می‌سنجد.
 */
export function buildVerdictContext(tests, urgency, uncoveredKeys) {
  const list = Array.isArray(tests) ? tests : [];
  const emergencyKeys = new Set();
  const uncovered = new Set(Array.isArray(uncoveredKeys) ? uncoveredKeys : []);

  if (urgency === "emergency") {
    // ردیفِ تومورمارکر هرگز مرجعِ «قرمزِ امروز» نمی‌شود، هرچند abnormal باشد (specs/019؛ اورژانس را فقط یافتهٔ دیگر می‌گوید).
    const abnormal = list.filter((t) => t.abnormal && t.source !== "tumor_marker_printed");
    const severe = abnormal.filter(
      (t) =>
        t.level === "critical" ||
        t.level === "marked" ||
        (typeof t.ctcaeGrade === "number" && t.ctcaeGrade >= 3)
    );
    for (const t of (severe.length ? severe : abnormal)) emergencyKeys.add(t.key);
  }

  return { urgency: urgency ?? "none", uncovered, emergencyKeys };
}

/**
 * حالتِ یک ردیف.
 *
 * @param t   یک عضو از `_engine.tests`
 * @param ctx خروجی buildVerdictContext برای همین پنل
 */
export function stateOf(t, ctx) {
  if (!t) return STATES.missing;
  // specs/019: «بی‌حکم» (abnormal:null یا verdict بی‌حکم) پیش از شاخهٔ !abnormal می‌آید وگرنه به «در محدوده» می‌رفت (Principle II).
  if (t.abnormal === null || t.verdict === "noref" || t.verdict === "unreadable" || t.verdict === "between") return STATES.norange;
  if (!t.abnormal) return t.nearLimit ? STATES.near : STATES.normal;
  if (ctx?.emergencyKeys?.has(t.key)) return STATES.emergency;
  // خارج از محدوده ولی هیچ قاعده‌ای نگرفتش → حالت سوم، نه زرد.
  // ⚠️ فقط برای همین کلید، نه برای کلِ پنل — توضیحِ بالای buildVerdictContext.
  if (ctx?.uncovered?.has(t.key)) return STATES.unmatched;
  return STATES.out;
}

/**
 * نشانهٔ جهت — گلیفِ عمودی، چون مثلثِ چپ/راست در RTL معنایش برعکس می‌شود.
 * (نکتهٔ ۹ در design-reference: trend arrow = KEEP، هرگز افقی نباشد.)
 */
export function dirIcon(t, state) {
  if (state.key === "normal" || state.key === "near" || state.key === "missing" || state.key === "norange") return state.icon;
  if (t?.dir === "high") return "▲";
  if (t?.dir === "low") return "▼";
  return state.icon;
}

/**
 * برچسبِ ردیف: **واژهٔ خودِ موتور**، نه واژه‌ای که کلاینت از نو می‌سازد.
 * frontend.md صریح است: «fa از قبل حل‌شده است؛ رندرش کنید، دوباره نسازیدش».
 * fallback فقط برای مسیرهایی است که fa ندارند.
 */
export function labelOf(t, state) {
  const fa = typeof t?.fa === "string" ? t.fa.trim() : "";
  return fa || state.label;
}

/** شمارشِ «۳ در محدوده · ۱ خارج از محدوده» برای سرتیترِ هر دسته */
export function countRows(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const out = list.filter((r) => r.abnormal).length;
  const near = list.filter((r) => !r.abnormal && r.abnormal !== null && r.nearLimit).length;
  // بی‌حکم (abnormal:null) نه «در محدوده» شمرده می‌شود نه «خارج» (specs/019).
  const noRange = list.filter((r) => r.abnormal === null).length;
  return { inRange: list.length - out - noRange, out, near, noRange, total: list.length };
}

/** بدترین حالتِ موجود در یک مجموعه ردیف — برای رنگِ حلقه و کارتِ دستگاه بدن */
export function worstState(rows, ctx) {
  const order = ["normal", "near", "norange", "unmatched", "out", "emergency"];
  let best = STATES.normal;
  for (const r of rows || []) {
    const s = stateOf(r, ctx);
    if (order.indexOf(s.key) > order.indexOf(best.key)) best = s;
  }
  return best;
}
