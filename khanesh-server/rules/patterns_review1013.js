// بازبینیِ چندعاملیِ ۲۰۲۶-۱۰-۱۳ — قاعده‌هایی که با تصمیمِ کاربر (همان روز) اضافه شدند. ثبت: MEDICAL_RULES.md، P104.
//   ۱) neonatal_bilirubin_hour_chart (یافتهٔ ۶، P63): بیلی‌روبینِ تامِ نوزادِ < ۱۴ روز «طبیعی» گفته نمی‌شود.
//   ۲) pregnancy_hellp_severe_features (یافتهٔ ۲۰): پلاکتِ پایین + آنزیمِ کبدیِ بالا در بارداری.
// هیچ‌کدام عددِ تازه‌ای به بیمار نمی‌دهند جز آستانه‌های منبع‌دار که در P104 نوشته شده‌اند.
import { faName } from "./names.js";

const g = (e, k) => e.graded?.find((x) => x.test === k);
const upper = (x) => {
  const m = String(x?.range ?? "").match(/[–-]\s*([\d.]+)\s*$/);
  return m ? parseFloat(m[1]) : null;
};

// ── ۱) نوزاد: بیلی‌روبین با نمودارِ ساعتی، نه بازهٔ ثابت ──
// adapter.js عددِ داخلِ بازهٔ ثابتِ CALIPER را برای سنِ < ۱۴ روز در ungraded.BILI_T (reason: neonatal_hour_chart) می‌گذارد.
// عددِ بالای بازه graded می‌ماند و مالکِ خودش را دارد (bilirubin_total_alone / bilirubin_emergency)؛ این قاعده فقط حکمِ
// «طبیعی» را برمی‌دارد. فوریت soon = «همین امروز نزدِ پزشک» (همان کفِ نوزادیِ N26)، هرگز اورژانسِ خودکار.
const neonatalBilirubinHourChart = {
  id: "neonatal_bilirubin_hour_chart",
  match: (e) => e.ungraded?.BILI_T?.reason === "neonatal_hour_chart",
  build: (e) => {
    const v = e.ungraded.BILI_T.value;
    return {
      pattern: "neonatal_bilirubin_hour_chart",
      urgency: "soon",
      headline: "بیلی‌روبینِ نوزاد باید با نمودارِ ساعتی سنجیده شود",
      must_say:
        // ⚠️ نه «شما» و نه «باردار»: neonatalVoice «شما» را «نوزاد» می‌کند («نوزادِ نوزاد») و بندِ دارای «باردار» را حذف می‌کند.
        `بیلی‌روبینِ تامِ نوزاد ${v} است. در دو هفتهٔ اولِ زندگی، اینکه این عدد زیاد است یا نه به سنِ نوزاد به ساعت، ` +
        "زودرس یا رسیده به دنیا آمدنش و چند عاملِ خطر بستگی دارد و با یک محدودهٔ ثابت سنجیده نمی‌شود؛ " +
        "برای همین این برنامه دربارهٔ این عدد حکمِ «طبیعی» یا «بالا» نمی‌دهد.",
      action: "همین امروز این عدد را به پزشکِ نوزاد نشان دهید تا آن را روی نمودارِ ساعتیِ بیلی‌روبین بسنجد.",
      warnings: ["اگر نوزاد خیلی زرد شده، بی‌حال است یا خوب شیر نمی‌خورد، منتظر نمانید و همین حالا به اورژانس بروید."],
      suggest: [],
      explains: ["BILI_T"],
    };
  },
};

// ── ۲) بارداری: ویژگی‌های شدیدِ پره‌اکلامپسی / HELLP ──
// ACOG (ویژگی‌های شدید): پلاکت < ۱۰۰٬۰۰۰ و AST/ALT ≥ ۲ برابرِ حدِ بالا. معیارِ تنسی (HELLP): LDH ≥ ۶۰۰، AST ≥ ۷۰، پلاکت ≤ ۱۰۰٬۰۰۰.
// فقط بارداریِ اعلام‌شده (e.pregnant، هرگز حدس از برگه)؛ سنِ بارداریِ اعلام‌شدهٔ < ۲۰ هفته ⇒ این قاعده نه (پره‌اکلامپسی از هفتهٔ ۲۰ است).
// ⚠️ P91: آستانهٔ رهنمود پیشنهادی برای *جمعیتِ همان رهنمود* است. این دو معیار هر دو پلاکتِ زیرِ ۱۰۰ می‌خواهند (نه < ۱۵۰ که در P91
// رد شد) و هر دو آنزیمِ کبدیِ بالا؛ اندازه‌گیری روی برگه‌های واقعی در P104 ثبت است.
const PLT_SEVERE = 100;          // ×10³/µL — ACOG / تنسی
const LDH_TENNESSEE = 600;       // U/L — تنسی
const AST_TENNESSEE = 70;        // U/L — تنسی
function hellpCriteria(e) {
  if (e.pregnant !== true) return null;
  if (e.gestWeeks != null && e.gestWeeks < 20) return null;
  const plt = g(e, "PLT"), ast = g(e, "AST"), alt = g(e, "ALT"), ldh = g(e, "LDH");
  if (!plt || plt.value == null) return null;
  const twice = (x) => x && x.value != null && upper(x) != null && x.value >= 2 * upper(x);
  const acog = plt.value < PLT_SEVERE && (twice(ast) || twice(alt));
  const tenn = plt.value <= PLT_SEVERE && ldh?.value >= LDH_TENNESSEE && ast?.value >= AST_TENNESSEE;
  if (!acog && !tenn) return null;
  return { plt, ast, alt, ldh, acog, tenn };
}
const pregnancyHellp = {
  id: "pregnancy_hellp_severe_features",
  match: (e) => hellpCriteria(e) != null,
  build: (e) => {
    const c = hellpCriteria(e);
    const nums = [
      `${faName("PLT")} ${c.plt.value}`,
      ...[c.ast, c.alt, c.ldh].filter((x) => x?.value != null).map((x) => `${faName(x.test)} ${x.value}`),
    ].join("، ");
    const gaLine = e.gestWeeks != null
      ? ""
      : " سنِ بارداری را نمی‌دانیم؛ این ترکیب به‌ویژه از هفتهٔ ۲۰ بارداری به بعد اهمیت دارد، ولی در هر سنِ بارداری بررسیِ همان روز لازم است.";
    return {
      pattern: "pregnancy_hellp_severe_features",
      urgency: "emergency",
      blocks_others: true,
      headline: "در بارداری، پلاکتِ پایین همراه با آنزیم‌های کبدیِ بالا بررسیِ فوری می‌خواهد",
      must_say:
        `روی برگهٔ شما ${nums} است. در بارداری، پایین بودنِ پلاکت (زیرِ ۱۰۰ هزار) همراه با بالا رفتنِ آنزیم‌های کبد ` +
        "می‌تواند نشانهٔ پره‌اکلامپسیِ شدید یا سندرمِ HELLP باشد؛ این یک تشخیص نیست، ولی پزشکِ زنان باید همین امروز " +
        "فشارِ خون، ادرار و حالِ شما و جنین را بررسی کند." + gaLine,
      action: "همین حالا به اورژانسِ زنان و زایمان مراجعه کنید و این برگه را همراه ببرید.",
      warnings: ["اگر سردردِ شدید، تاری دید، دردِ بالای شکم یا زیرِ دنده‌های راست، یا تورمِ ناگهانی دارید، یک لحظه هم صبر نکنید."],
      suggest: [],
      sources: ["ACOG_PREECLAMPSIA"],
    };
  },
};

export const RULES_REVIEW1013 = [neonatalBilirubinHourChart, pregnancyHellp];
