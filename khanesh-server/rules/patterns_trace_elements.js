// ─── فصلِ ویتامین‌ها و عناصرِ کمیابِ هنری — بندهای تأییدشدهٔ P49 (specs/004، داستانِ ۳) ───
// P49-الف (سرولوپلاسمین و ویلسون) در ۲۰۲۶-۰۹-۱۹ تأیید شد. P49-ب (MMA) و P49-د (روی، مس، سلنیوم،
// E، C، PLP) هنوز عدد ندارند و اینجا نیستند — آزمون‌هایشان todo می‌مانند.
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

export const RULES_TRACE_ELEMENTS = [
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
