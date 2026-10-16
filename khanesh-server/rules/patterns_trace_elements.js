// ─── فصلِ ویتامین‌ها و عناصرِ کمیابِ هنری — بندهای تأییدشدهٔ P49 (specs/004، داستانِ ۳) ───
// P49-الف (سرولوپلاسمین و ویلسون) در ۲۰۲۶-۰۹-۱۹ تأیید شد. P49-ب (MMA) در patterns_endocrine_rheum.js، داخلِ یافتهٔ B12.
// P49-د فقط برای مسِ پایین (تأییدِ عاملی ۲۰۲۶-۱۰-۰۳)؛ روی، سلنیوم، E، C و PLP هنوز عدد ندارند — آزمونِ M154b todo است.
//
// سرولوپلاسمین و مسِ ادرار بازهٔ تأییدشده در refs.js ندارند و سنجیده نمی‌شوند (noRef). این قاعده عددِ
// خامشان را از e.ungraded می‌خواند — نه val(e)، که فقط graded را می‌بیند (N17) — و فقط با واحدِ
// *چاپ‌شده* حکم می‌دهد (N3): ۱۰ بی‌واحد می‌تواند ۱۰ mg/dL (پایین) یا ۱۰ g/L (ناممکن) باشد.
// مقداری که تفسیر شد در explains می‌آید تا از خطِ «تفسیر نشدند» بیرون برود (unexplainedNoRef).
import { hasInflammation } from "./patterns_utils.js";
// همان نرمال‌سازِ units.js (M126): «میلی گرم در دسی لیتر»، «(mg/dL)»، «mgdl» → mg/dl.
import { normUnit } from "./units.js";

// P49-الف: سرولوپلاسمین < ۲۰ mg/dL ⇒ ارزیابیِ ویلسون؛ مسِ ادرارِ ۲۴ساعته > ۱۰۰ µg ⇒ شاهدِ پشتیبان.
const CERULO_LOW_MGDL = 20;
const U_COPPER_SUPPORTS_UG = 100;
// زیرِ یک سال سرولوپلاسمین به‌طورِ طبیعی پایین است (P49-الف)؛ سقفِ سنی ندارد.
const WILSON_MIN_AGE_Y = 1;
// ضریب‌های تعریفیِ واحد، نه آستانهٔ بالینی: ۱ g/L = ۱۰۰ mg/dL؛ جرمِ اتمیِ مس ۶۳.۵۵ ⇒ ۱ µmol = ۶۳.۵۵ µg.
const G_PER_L_TO_MG_PER_DL = 100;
const MG_PER_L_TO_MG_PER_DL = 0.1;
const CU_UG_PER_UMOL = 63.55;

// ── P49-د، فقط مسِ پایین (تأییدِ عاملی ۲۰۲۶-۱۰-۰۳، نه بازبینِ انسانی) ──
// مسِ سرم < ۷۰ µg/dL (حدِ پایینِ رایجِ آزمایشگاه‌ها: ۷۰–۱۴۰ µg/dL = ۱۱–۲۲ µmol/L). رویِ سرمِ بالا > ۱۲۰ µg/dL «بالاتر از حدِ معمول»
// (مراجع ۱۰۶ تا ۱۲۰). رویِ زیاد (اغلب مکمل) با جذبِ مس رقابت می‌کند و کمبودِ مس می‌سازد (NIH ODS؛ مقالات). منابعِ عددها لابراتواری و ثانویه‌اند.
// روی، سلنیوم، E، C و PLP هنوز عدد ندارند و نیستند (M154b).
const COPPER_LOW_UGDL = 70;
const ZINC_HIGH_UGDL = 120;
const CU_UGDL_PER_UMOLL = 6.355;   // جرمِ اتمیِ مس ۶۳.۵۵ ⇒ ۱ µmol/L = ۶.۳۵۵ µg/dL (تعریفی)
const ZN_UGDL_PER_UMOLL = 6.538;   // جرمِ اتمیِ روی ۶۵.۳۸
function ugdlOf(entry, perUmol) {
  if (!entry || typeof entry.value !== "number") return null;
  const u = normUnit(String(entry.unit ?? "")).replace(/[µμ]|mc/g, "u");
  if (/^ug\/dl$/.test(u)) return entry.value;
  if (/^umol\/l$/.test(u)) return +(entry.value * perUmol).toFixed(1);
  if (/^ug\/l$/.test(u)) return +(entry.value / 10).toFixed(1);
  return null;
}
const noRangeOf = (e, k) => { const u = e.ungraded?.[k]; return u && u.reason === "no_range" ? u : null; };

const unitKey = (u) => normUnit(String(u ?? "")).replace(/[µμ]|mc/g, "u");

// سرولوپلاسمین → mg/dL، یا null وقتی واحد چاپ نشده یا شناخته نیست.
function ceruloMgDl(entry) {
  if (!entry || typeof entry.value !== "number") return null;
  const u = unitKey(entry.unit);
  if (/^mg\/dl$|^mg%$/.test(u)) return entry.value;
  if (/^g\/l$/.test(u)) return +(entry.value * G_PER_L_TO_MG_PER_DL).toFixed(1);
  if (/^mg\/l$/.test(u)) return +(entry.value * MG_PER_L_TO_MG_PER_DL).toFixed(1);
  return null;
}
// مسِ ادرارِ ۲۴ساعته → µg در ۲۴ ساعت، یا null.
function urineCopperUg(entry) {
  if (!entry || typeof entry.value !== "number") return null;
  const u = unitKey(entry.unit);
  const per24 = /\/(24h|24hr|24hrs|24hour|d|day)$/;
  if (/^ug/.test(u) && per24.test(u)) return entry.value;
  if (/^umol/.test(u) && per24.test(u)) return Math.round(entry.value * CU_UG_PER_UMOL);
  return null;
}
// عدد همان‌طور که روی برگه است، و اگر تبدیل شد عددِ تبدیل‌شده کنارش (N5).
const shownWith = (entry, conv, to) =>
  conv === entry.value ? `${entry.value} ${to}` : `${entry.value} ${entry.unit} (برابرِ ${conv} ${to})`;

function actionFor(urgency, { week, routine }) {
  return urgency === "this_week" ? week : routine;
}

// مسِ ادرارِ ۲۴ساعته، سه‌حالته + واحدِ نامعلوم (N4، N21).
function urineCopperClause(e) {
  const entry = e.ungraded?.U_COPPER_24H;
  if (!entry) return { text: "مسِ ادرارِ ۲۴ساعته اندازه‌گیری نشده است؛ پزشک ممکن است آن را درخواست کند.", judged: false, absent: true };
  const ug = urineCopperUg(entry);
  if (ug == null) {
    return { text: "مسِ ادرارِ ۲۴ساعته روی برگه هست ولی واحدش خوانده نشد، پس درباره‌اش قضاوت نمی‌کنیم.", judged: false, absent: false };
  }
  const shown = shownWith(entry, ug, "µg/24h");
  return ug > U_COPPER_SUPPORTS_UG
    ? { text: `مسِ ادرارِ ۲۴ساعتهٔ شما هم ${shown} و بالای ۱۰۰ میکروگرم در ۲۴ ساعت است، که با این بررسی می‌خواند.`, judged: true, absent: false }
    : { text: `مسِ ادرارِ ۲۴ساعتهٔ شما ${shown} است و از ۱۰۰ میکروگرم در ۲۴ ساعت بیشتر نیست؛ این به‌تنهایی ویلسون را رد نمی‌کند و تصمیمش با پزشک است.`, judged: true, absent: false };
}

const wilsonAgeOk = (e) => !(e.age != null && e.age < WILSON_MIN_AGE_Y);
// مالکِ رویِ سرم وقتی مسِ پایین هم هست copper_deficiency است (روی را در متنش سه‌حالته می‌گوید)؛ zinc_status کنار می‌رود (N20).
const copperDeficiencyFires = (e) => {
  const cu = ugdlOf(noRangeOf(e, "COPPER"), CU_UGDL_PER_UMOLL);
  return cu != null && cu < COPPER_LOW_UGDL && wilsonAgeOk(e);
};

// ── P109 (تصمیمِ کاربر ۲۰۲۶-۱۰-۱۶): رویِ سرم با مرزهای IZiNCG ──
// IZiNCG Technical Brief No. 2 (2012؛ برگرفته از Hotz 2003، صدکِ ۲٫۵ ِ NHANES II): حدِ پایینِ رویِ سرم (µg/dL) بر حسبِ زمان و ناشتایی.
//   کودک < ۱۰ سال: صبحِ غیرناشتا ۶۵، بعدازظهر ۵۷ (ناشتا ندارد)؛ زنِ غیرباردار ≥ ۱۰: صبحِ ناشتا ۷۰، صبحِ غیرناشتا ۶۶، بعدازظهر ۵۹؛
//   مرد ≥ ۱۰: ۷۴ / ۷۰ / ۶۱. ⚠️ عددها از بازتولیدِ جدولِ IZiNCG خوانده شد، نه خودِ PDF (MEDICAL_RULES.md P109).
// زمان و ناشتایی روی برگه نیست ⇒ زیرِ مرزِ بعدازظهر «پایین»، تا مرزِ بالاترین حالت «مرزی»، بالاتر «کمبود را نشان نمی‌دهد».
// جنسِ نامعلوم ⇒ مرزهای زن (کمتر؛ «پایین» کمتر گفته می‌شود). بارداری و زیرِ یک سال ⇒ بی‌حکم (مرزِ جدا دارند و این‌جا نیست).
// P110 (گزارشِ کاربر ۲۰۲۶-۱۰-۱۶: «زینک بدون محدوده است، در حالی که برگه ۷۲–۱۲۷ چاپ کرده»): رویِ بی‌واحد با بازهٔ چاپ‌شده.
//   بازه هم‌واحدِ عدد است؛ بازه‌ای بینِ ۴۰ و ۲۵۰ فقط µg/dL می‌تواند باشد (µmol/L حدودِ ۱۰–۲۰، µg/L حدودِ ۷۰۰–۱۲۰۰). بیرون از آن ⇒ null (حدس نمی‌زنیم، N3/P48).
function zincRangeUgdl(entry) {
  if (!entry || typeof entry.value !== "number" || String(entry.unit ?? "").trim()) return null;
  const m = String(entry.printed_range ?? "").match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const lo = Number(m[1]), hi = Number(m[2]);
  return lo >= 40 && hi <= 250 && hi > lo ? { lo, hi } : null;
}
const zincUgdl = (entry) => ugdlOf(entry, ZN_UGDL_PER_UMOLL) ?? (zincRangeUgdl(entry) ? entry.value : null);
// P110-ب: بی‌بازهٔ چاپ‌شده فقط مرزِ صبحِ غیرناشتا (nonfasting) به کار می‌رود؛ top/low برای سابقه نگه داشته شده‌اند.
const ZINC_CUTOFFS = { child: { top: 65, low: 57, nonfasting: 65 }, F: { top: 70, low: 59, nonfasting: 66 }, M: { top: 74, low: 61, nonfasting: 70 } };
function zincCutoffs(e) {
  if (e.pregnant || (e.age != null && e.age < 1)) return null;
  if (e.age != null && e.age < 10) return ZINC_CUTOFFS.child;
  return e.sex === "M" ? ZINC_CUTOFFS.M : ZINC_CUTOFFS.F;
}

export const RULES_TRACE_ELEMENTS = [
  {
    id: "zinc_status",
    match: (e) => zincUgdl(noRangeOf(e, "ZINC")) != null && !copperDeficiencyFires(e),
    build: (e) => {
      const entry = noRangeOf(e, "ZINC");
      const zn = zincUgdl(entry);
      const byRange = ugdlOf(entry, ZN_UGDL_PER_UMOLL) == null ? zincRangeUgdl(entry) : null;
      // N5: واحدی که چاپ نشده «روی برگه» نوشته نمی‌شود؛ می‌گوییم از بازهٔ خودِ برگه تعیین شد.
      // P110-ب: حکم از خودِ بازهٔ چاپ‌شده است (هم‌واحدِ عدد)، پس رویِ بی‌واحد فقط عددِ خودش را نشان می‌دهد.
      const shown = byRange ? `${entry.value}` : shownWith(entry, zn, "µg/dL");
      const c = zincCutoffs(e);
      const infl = hasInflammation(e)
        ? " نشانگرِ التهاب (CRP/ESR) روی همین برگه بالاست؛ در التهاب و عفونت رویِ سرم به‌طورِ موقت پایین می‌آید، پس این عدد را باید بعد از رفعِ التهاب دوباره سنجید."
        : "";
      const deficitText = " کمبودِ روی می‌تواند با کندیِ ترمیمِ زخم، ریزشِ مو، کاهشِ اشتها و حسِ چشایی، یا عفونت‌های مکرر همراه باشد.";
      const highText = " رویِ زیاد اغلب از مکمل می‌آید و مصرفِ طولانیِ آن می‌تواند جذبِ مس را کم کند؛ مصرفِ مکملِ روی را به پزشک بگویید.";
      // P110-ب (تصمیمِ بازبینِ کاربر ۲۰۲۶-۱۰-۱۶): برچسب از بازهٔ چاپ‌شدهٔ آزمایشگاه؛ IZiNCG فقط وقتی بازه‌ای چاپ نشده.
      //   مرزهای IZiNCG از NHANES II است و داده‌های بزرگسالانِ ایران ناهمگن‌اند (بازهٔ مرجعِ مردان ۹٫۶–۳۱٫۶ µmol/L در ۲۶۳۲ نفر).
      //   بازه هم‌واحدِ عددِ چاپ‌شده است ⇒ عددِ خام با بازهٔ خام (N12: بازه با واحدِ چاپ‌شده سفر می‌کند).
      const pr = String(entry.printed_range ?? "").match(/^\s*(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*$/);
      const printed = c && pr && Number(pr[2]) > Number(pr[1]) ? { lo: Number(pr[1]), hi: Number(pr[2]), raw: `${pr[1]}–${pr[2]}` } : null;
      // بی‌بازه: زمان و ناشتایی معلوم نیست ⇒ مرزِ صبحِ غیرناشتا (کودک ۶۵، زن ۶۶، مرد ۷۰).
      let state, text;
      if (printed) {
        const v = entry.value;
        if (v < printed.lo) {
          state = "low";
          text = `رویِ سرمِ شما ${shown} است و از حدِ پایینِ بازهٔ چاپ‌شدهٔ آزمایشگاه (${printed.raw}) کمتر است.${infl}${deficitText}`;
        } else if (v > printed.hi) {
          state = "high";
          text = `رویِ سرمِ شما ${shown} است و از حدِ بالای بازهٔ چاپ‌شدهٔ آزمایشگاه (${printed.raw}) بیشتر است.${highText}`;
        } else {
          state = "ok";
          text = `رویِ سرمِ شما ${shown} است و داخلِ بازهٔ چاپ‌شدهٔ آزمایشگاه (${printed.raw}) است؛ کمبودِ روی را نشان نمی‌دهد.`;
        }
      } else if (zn > ZINC_HIGH_UGDL) {
        state = "high";
        text = `رویِ سرمِ شما ${shown} است و از حدِ بالای معمولِ آزمایشگاه‌ها (حدودِ ${ZINC_HIGH_UGDL}) بیشتر است.${highText}`;
      } else if (!c) {
        state = "nojudge";
        text = `رویِ سرمِ شما ${shown} است. برای ${e.pregnant ? "بارداری" : "زیرِ یک سال"} مرزِ جداگانه‌ای لازم است که این‌جا نداریم، پس درباره‌اش حکم نمی‌دهیم.`;
      } else if (zn < c.nonfasting) {
        state = "low";
        text = `رویِ سرمِ شما ${shown} است. آزمایشگاه بازه‌ای چاپ نکرده؛ مرزِ پایینِ گروهِ بین‌المللیِ مشاورهٔ تغذیهٔ روی (IZiNCG) برای سن و جنسِ شما در نمونهٔ صبحِ غیرناشتا ${c.nonfasting} میکروگرم در دسی‌لیتر است و این عدد کمتر است؛ این با کمبودِ روی می‌خواند، ولی زمانِ نمونه‌گیری و ناشتابودن روی برگه نیست.${infl}${deficitText}`;
      } else {
        state = "ok";
        text = `رویِ سرمِ شما ${shown} است. آزمایشگاه بازه‌ای چاپ نکرده؛ این عدد از مرزِ پایینِ IZiNCG برای سن و جنسِ شما (${c.nonfasting} میکروگرم در دسی‌لیتر، صبحِ غیرناشتا) کمتر نیست و کمبودِ روی را نشان نمی‌دهد.`;
      }
      return {
        pattern: `zinc_${state}`,
        urgency: "routine",
        key_number: zn,
        // P110: رویِ کافی ⇒ یک خط در «موارد دیگر».
        ...(state === "ok" ? { info: true, minor_line: printed
          ? `رویِ سرم ${shown}: داخلِ بازهٔ چاپ‌شدهٔ آزمایشگاه (${printed.raw})`
          : `رویِ سرم ${shown}: از مرزِ پایینِ IZiNCG (${c.nonfasting}، صبحِ غیرناشتا) کمتر نیست؛ کمبودی نشان نمی‌دهد` } : {}),
        headline: { high: "رویِ سرمِ شما بالاتر از حدِ معمول است", low: "رویِ سرمِ شما پایین است", borderline: "رویِ سرمِ شما مرزی است", ok: "رویِ سرم", nojudge: "رویِ سرم" }[state],
        must_say: text,
        action: state === "low" || state === "high"
          ? "در نوبتِ عادی با پزشک مطرح کنید؛ خودسرانه مکملِ روی با دوزِ بالا شروع یا قطع نکنید."
          : "در نوبتِ عادی با پزشک مطرح کنید.",
        suggest: state === "low" || state === "borderline" ? ["تکرار روی سرم، صبح و ناشتا"] : [],
        warnings: [],
        explains: ["ZINC"],
      };
    },
  },
  {
    id: "copper_deficiency",
    // مسِ سرمِ پایین، فقط با واحدِ چاپ‌شده. زیرِ یک سال مس به‌طورِ طبیعی پایین است (همان مرزِ ویلسون).
    match: (e) => {
      const cu = ugdlOf(noRangeOf(e, "COPPER"), CU_UGDL_PER_UMOLL);
      return cu != null && cu < COPPER_LOW_UGDL && wilsonAgeOk(e);
    },
    build: (e) => {
      const entry = noRangeOf(e, "COPPER");
      const cu = ugdlOf(entry, CU_UGDL_PER_UMOLL);
      const cuShown = shownWith(entry, cu, "µg/dL");
      const zEntry = noRangeOf(e, "ZINC");
      const zn = ugdlOf(zEntry, ZN_UGDL_PER_UMOLL);
      // روی سه‌حالته + واحدِ نامعلوم (N4، N21): بالا / در محدوده یا پایین / واحدش خوانده نشد / روی برگه نیست.
      let zTxt, zJudged = false;
      if (!zEntry) {
        zTxt = "رویِ سرم روی این برگه نیست؛ مصرفِ مکملِ روی (حتی بدونِ نسخه) را به پزشک بگویید، چون روی زیاد جذبِ مس را کم می‌کند.";
      } else if (zn == null) {
        zTxt = "رویِ سرم روی برگه هست ولی واحدش خوانده نشد، پس دربارهٔ آن قضاوت نمی‌کنیم؛ مصرفِ مکملِ روی را به پزشک بگویید.";
      } else if (zn > ZINC_HIGH_UGDL) {
        zJudged = true;
        zTxt = `رویِ سرمِ شما ${shownWith(zEntry, zn, "µg/dL")} است و از حدِ معمولِ حدود ${ZINC_HIGH_UGDL} بیشتر است. روی زیاد، که اغلب از مکمل می‌آید، جذبِ مس را کم می‌کند و می‌تواند یکی از علت‌های این مسِ پایین باشد؛ مصرفِ مکملِ روی را به پزشک بگویید و بدونِ مشورتِ او تغییرش ندهید.`;
      } else {
        zJudged = true;
        zTxt = `رویِ سرمِ شما ${shownWith(zEntry, zn, "µg/dL")} و بالاتر از حدِ معمولِ حدود ${ZINC_HIGH_UGDL} نیست، پس روی زیاد توضیحِ این مسِ پایین به نظر نمی‌رسد؛ مصرفِ مکملِ روی را به هر حال به پزشک بگویید.`;
      }
      return {
        pattern: "copper_deficiency",
        urgency: "routine",
        key_number: cu,
        headline: "مسِ سرمِ شما پایین است",
        must_say:
          `مسِ سرمِ شما ${cuShown} است و از حدِ پایینِ معمول (${COPPER_LOW_UGDL}) کمتر است. ` +
          "علت‌های شناخته‌شده کم‌جذبی (مثلاً پس از جراحیِ معده یا چاقی، یا بیماریِ سلیاک)، رویِ زیاد و تغذیهٔ ناکافی است؛ بیماریِ ویلسون و کمبودِ پروتئینِ خون هم مسِ سرم را پایین می‌آورند. " +
          zTxt +
          " کمبودِ مس می‌تواند کم‌خونی، کمیِ گلبول‌های سفید یا گزگز و بی‌حسیِ پاها بسازد؛ اگر این نشانه‌ها را دارید به پزشک بگویید. این عدد به‌تنهایی تشخیص نیست.",
        action: "در نوبتِ عادی با پزشک مطرح کنید.",
        suggest: [],
        warnings: [],
        explains: ["COPPER", ...(zJudged ? ["ZINC"] : [])],
      };
    },
  },
  {
    id: "wilson_evaluation",
    // دو شاخه: سرولوپلاسمینِ پایین (this_week)، یا زیرِ ۲۰ نیست ولی نشانگرِ التهاب (CRP/ESR) بالاست (routine) — سرولوپلاسمین
    // پروتئینِ فازِ حاد است و در التهاب بالا می‌رود، پس آن عدد ویلسون را رد نمی‌کند (P49-الف).
    match: (e) => {
      const c = ceruloMgDl(e.ungraded?.CERULOPLASMIN);
      if (c == null || !wilsonAgeOk(e)) return false;
      return c < CERULO_LOW_MGDL || hasInflammation(e);
    },
    build: (e) => {
      const entry = e.ungraded.CERULOPLASMIN;
      const c = ceruloMgDl(entry);
      const shown = shownWith(entry, c, "mg/dL");
      const cu = urineCopperClause(e);
      const explains = ["CERULOPLASMIN", ...(cu.judged ? ["U_COPPER_24H"] : [])];

      if (c >= CERULO_LOW_MGDL) {
        const urgency = "routine";
        return {
          pattern: "wilson_evaluation",
          urgency,
          headline: "سرولوپلاسمینِ شما در کنارِ التهاب",
          must_say:
            `سرولوپلاسمینِ شما ${shown} است و زیرِ ۲۰ نیست، ولی نشانگرِ التهاب (CRP یا ESR) روی برگهٔ شما بالاست. ` +
            "سرولوپلاسمین در التهاب بالا می‌رود، پس این عدد در کنارِ التهاب بیماریِ ویلسون را رد نمی‌کند. " + cu.text,
          action: actionFor(urgency, {
            week: "این هفته با پزشک مطرح کنید.",
            routine: "اگر این آزمایش برای بررسیِ ویلسون خواسته شده، در نوبتِ عادی این نکته را با پزشک مطرح کنید.",
          }),
          explains,
          key_number: entry.value,
        };
      }

      const urgency = "this_week";
      return {
        pattern: "wilson_evaluation",
        urgency,
        headline: "سرولوپلاسمینِ شما پایین است — بررسیِ بیماریِ ویلسون با پزشک",
        must_say:
          `سرولوپلاسمینِ شما ${shown} است و از ۲۰ mg/dL کمتر است. سرولوپلاسمین پروتئینی است که مس را در ` +
          "خون حمل می‌کند، و پایین بودنش یکی از نشانه‌هایی است که پزشک برای بررسیِ بیماریِ ویلسون (انباشتِ مس " +
          "در بدن) از آن استفاده می‌کند. این عدد به‌تنهایی تشخیص نیست: سرولوپلاسمینِ پایین علت‌های دیگری هم " +
          "دارد، و تشخیصِ ویلسون به چند بررسیِ دیگر نیاز دارد. " + cu.text,
        action: actionFor(urgency, {
          week: "این هفته با پزشک وقت بگیرید و این برگه را همراه ببرید.",
          routine: "در نوبتِ عادی با پزشک مطرح کنید.",
        }),
        ...(cu.absent ? { suggest: ["مسِ ادرارِ ۲۴ساعته"] } : {}),
        warnings: ["این یافته تشخیصِ بیماریِ ویلسون نیست؛ پیش از نظرِ پزشک رژیم یا دارویی را تغییر ندهید."],
        explains,
        key_number: entry.value,
      };
    },
  },
];
