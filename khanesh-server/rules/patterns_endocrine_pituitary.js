// ============================================================
// LabMate — قواعد هیپوفیز و آدرنال
// منبع: Henry's Clinical Diagnosis, فصل ۲۵ «Endocrine and Pituitary Function»
//        (شناسهٔ HENRY_ENDOCRINE در guidelines.js)
// طراحی: specs/001-endocrine-pituitary-rules/ — ثبتِ بالینی: P46 در MEDICAL_RULES.md
//
// ⚠️ تأییدِ عاملی (جست‌وجوی منبع، ۲۰۲۶-۱۰-۰۳) — نه بازبینِ انسانی. جزئیات و دلیلِ هر عدد: P46 در MEDICAL_RULES.md.
//   • hyperprolactinemia — تنها مالکِ PRL (بندهای ۱ و ۲ و ۱۱)
//   • adrenalAxis(e) + شش قاعدهٔ برچسبی — تنها مالکِ خانوادهٔ کورتیزول (بندهای ۳–۱۰، ۱۲)
//   • cortisol_untimed — کورتیزولِ بی‌ساعت؛ عددِ بالینی ندارد
// حدِ UFC و بزاق به روشِ سنجش بستگی دارد و موتور حدِ چاپ‌شدهٔ برگه را نمی‌خواند — فقط پیش‌فرض دارد.
// ============================================================
import { getRef } from "./refs.js";
import { canBePregnant } from "./patterns_utils.js";
import { faName } from "./names.js";
import { normUnit } from "./units.js";
// P77-۶: آستانه‌های قابل‌تنظیمِ الگوی بحرانِ آدرنال (Na/K/قند منبع‌دار نیستند؛ Endocrine Society فقط الگو را می‌گوید).
const ADRENAL_CRISIS_NA_BELOW = 130;
const ADRENAL_CRISIS_K_ABOVE = 5.5;
const ADRENAL_CRISIS_GLU_BELOW = 70;

// P46 بند ۲: بالای ۲۰۰ ng/mL علت‌های ساده به‌ندرت کافی‌اند و ارزیابیِ هیپوفیز مطرح می‌شود؛ ۲۵۰ حدِ «معمولاً
// پرولاکتینوما» در دستورالعملِ Endocrine Society 2011 است و بعضی داروها (ریسپریدون، متوکلوپرامید) تا بالای ۲۰۰
// هم می‌برند — پس متن هرگز تشخیص نمی‌دهد (ES_HYPERPROLACTINEMIA).
const PRL_PITUITARY_NG_ML = 200;

const tshState = (e) => {
  const g = e.graded?.find((x) => x.test === "TSH");
  if (!g) return { arm: "absent" };
  if (g.abnormal && g.dir === "high") return { arm: "high", value: g.value };
  if (g.abnormal && g.dir === "low") return { arm: "low", value: g.value };
  return { arm: "normal", value: g.value };
};

const thyroidSentence = (t) => {
  switch (t.arm) {
    case "high":
      return `TSH شما بالاست (${t.value}) و کم‌کاریِ تیروئید خودش می‌تواند پرولاکتین را بالا ببرد؛ پزشک معمولاً پیش از هر نتیجه‌گیری اول تیروئید را بررسی یا درمان می‌کند و بعد پرولاکتین را دوباره می‌سنجد. `;
    case "low":
      return `TSH شما پایین است (${t.value})؛ وضعیتِ تیروئیدِ شما جدا بررسی می‌شود و کم‌کاریِ تیروئید توضیحِ این پرولاکتین نیست. `;
    case "normal":
      return `TSH شما ${t.value} و طبیعی است؛ پس کم‌کاریِ تیروئید به‌احتمالِ زیاد علتِ این افزایش نیست. `;
    default:
      return "TSH روی این برگه نیست و وضعیتِ تیروئید مشخص نیست؛ کم‌کاریِ تیروئید یکی از علت‌های شایعِ پرولاکتینِ بالاست و اندازه‌گیریِ TSH و FT4 معمولاً اولین قدم است. ";
  }
};

function prlHigh(e) {
  const g = e.graded?.find((x) => x.test === "PRL");
  return g?.abnormal && g.dir === "high" ? g : null;
}

// ─── کورتیزولِ بی‌ساعت ───
// عددِ بی‌ساعت از e.ungraded.CORTISOL می‌آید (نه val(e) — N17). ردیفِ «Cortisol» روی صفحهٔ ادرار هم به همین کلید
// می‌رسد (P46)، پس با واحدِ ۲۴ساعته حکم نمی‌دهد.
const unitKey = (u) => normUnit(String(u ?? "")).replace(/[µμ]|mc/g, "u");
const isPer24h = (u) => /\/(24h|24hr|24hrs|24hour|d|day|روز)$/.test(unitKey(u));

function cortisolShown(e, entry) {
  const conv = e.unitConversions?.find((r) => r.test === "CORTISOL");
  if (conv) return `${conv.raw} ${conv.from} (برابرِ ${conv.value} µg/dL)`;
  return `${entry.value}${entry.unit ? ` ${entry.unit}` : ""}`;
}

// ─── محورِ آدرنال (P46 بندهای ۳–۱۰؛ تأییدِ عاملی ۲۰۲۶-۱۰-۰۳) ───
// همان شکلِ mineralAxis: یک طبقه‌بند که دقیقاً یک برچسب یا null می‌دهد و هر قاعده فقط می‌پرسد «برچسبِ من است؟».
// آستانه‌ها و منبعشان:
//   • کورتیزولِ صبح < ۳ ⇒ «نارساییِ محتمل»؛ ۳ تا < ۵ ⇒ نامشخص؛ > ۲۳ ⇒ بالای غیراختصاصی. ۵ و ۲۳ حدِ رایجِ آزمایشگاه‌هاست و ۵
//     با Endocrine Society 2016 (صبح < ۵ µg/dL همراهِ ACTH ⇒ مشکوک) می‌خواند. ⚠️ «< ۳» را فقط از خلاصه‌های ثانویه دیدم، نه متنِ دستورالعمل.
//   • آزمونِ دگزامتازون ≥ ۱.۸ µg/dL ⇒ غربالگری مثبت (ES 2008، متنِ اصلی).
//   • UFC: حدِ مثبت «حدِ بالای همان روش» است و هم‌پوشانیِ کاذب «تا حدودِ ۴ برابر» (ES 2008، متنِ اصلی)؛ پس > ۴× ⇒ بسیار مطرح‌کننده.
//     حدِ بالای پیش‌فرض ۴۵ µg/24h از LC-MS/MS است (Mayo ‏۳.۵–۴۵؛ LabCorp ‏۶–۴۲ زن/۵–۶۴ مرد) — حدِ چاپ‌شدهٔ برگه را موتور نمی‌خواند.
//   • بزاقِ نیمه‌شب > ۰.۱۴۵ µg/dL (= ۴ nmol/L، «افرادِ سالم معمولاً زیر ۱۴۵ ng/dL»؛ ES 2008). به روشِ سنجش وابسته است؛ مقالات برای
//     ایمونواسی ۹–۱۰ nmol/L می‌گویند، پس این حد حساس‌تر است و متن «تأیید لازم است» می‌گوید.
//   • ACTH < ۱۰ فوق‌کلیوی (مستقل از ACTH)، > ۲۰ وابسته به ACTH، ۱۰–۲۰ خاکستری (منابعِ ثانویه؛ متنِ اصلی ندیدم).
const AM_LIKELY_UGDL = 3;
const AM_LOW_UGDL = 5;
const AM_HIGH_UGDL = 23;
const DST_POSITIVE_UGDL = 1.8;
const UFC_ULN_UG24 = 45;
const UFC_VERY_FOLD = 4;
const SAL_ULN_UGDL = 0.145;
const ACTH_LOW_PGML = 10;
const ACTH_HIGH_PGML = 20;

const gradedOf = (e, k) => e.graded?.find((g) => g.test === k) ?? null;
const ungradedOf = (e, k) => {
  const u = e.ungraded?.[k];
  return u && u.reason === "no_range" && typeof u.value === "number" ? u : null;
};
const fmtNum = (n) => String(+Number(n).toFixed(2));
// عددِ چاپ‌شده با معادلِ تبدیل‌شده کنارش (N5)؛ بی‌تبدیل، همان عدد با واحدِ موتور.
function shownWith(e, key, value, to) {
  const c = e.unitConversions?.find((r) => r.test === key);
  return c ? `${c.raw} ${c.from} (برابرِ ${fmtNum(value)} ${to})` : `${fmtNum(value)} ${to}`;
}

function adrenalFacts(e) {
  const am = gradedOf(e, "CORTISOL_AM")?.value ?? null;
  const dst = gradedOf(e, "CORTISOL_DST")?.value ?? null;
  const ufc = ungradedOf(e, "UFC")?.value ?? null;
  const sal = ungradedOf(e, "CORTISOL_SAL")?.value ?? null;
  const acth = ungradedOf(e, "ACTH")?.value ?? null;
  const hyper = {
    ufc: ufc != null && ufc > UFC_ULN_UG24,
    dst: dst != null && dst >= DST_POSITIVE_UGDL,
    sal: sal != null && sal > SAL_ULN_UGDL,
  };
  return { am, dst, ufc, sal, acth, hyper, anyHyper: hyper.ufc || hyper.dst || hyper.sal,
    ufcVery: ufc != null && ufc > UFC_VERY_FOLD * UFC_ULN_UG24 };
}

export function adrenalAxis(e) {
  const f = adrenalFacts(e);
  if (f.am == null && !f.anyHyper) return null;
  const amLow = f.am != null && f.am < AM_LOW_UGDL;
  if (amLow && f.anyHyper) return "adrenal_discordant";
  if (f.ufcVery) return "cushing_likely";
  if (f.anyHyper) return "cushing_screen_positive";
  if (f.am != null && f.am < AM_LIKELY_UGDL) return "adrenal_insufficiency_likely";
  if (amLow) return "adrenal_insufficiency_indeterminate";
  if (f.am != null && f.am > AM_HIGH_UGDL) return "cortisol_am_high_nonspecific";
  return null;
}

// جملهٔ داروها: پایین ⇒ استروئید؛ بالا ⇒ استروژن. هرگز توصیه به قطع یا تغییرِ دارو (FR-018، FR-023).
const DRUG_LOW =
  "داروهای استروئیدی (قرص، تزریق، اسپریِ استنشاقی یا پماد) شایع‌ترین علتِ کورتیزولِ پایین‌اند؛ مصرفشان را به پزشک بگویید و بدونِ مشورتِ او چیزی را قطع نکنید. ";
const DRUG_HIGH =
  "قرص‌های استروژنی و ضدبارداری پروتئینِ حاملِ کورتیزول را زیاد می‌کنند و کورتیزولِ کلِ خون (و نتیجهٔ آزمونِ دگزامتازون) را بالا نشان می‌دهند؛ اثرشان روی کورتیزولِ ادرار و بزاق کمتر است. مصرفشان را به پزشک بگویید. ";
const METHOD_NOTE = "حدِ دقیقِ این آزمایش به روشِ سنجش بستگی دارد؛ حدِ چاپ‌شدهٔ همین برگه را هم به پزشک نشان دهید. ";
const urgencyAction = (urgency, week, routine) => (urgency === "this_week" ? week : routine);
const AI_RED_FLAG = " اگر ضعفِ شدید، سرگیجه، استفراغ یا افتِ فشارِ خون دارید همین حالا به اورژانس بروید.";

// «سیگنال‌های پرکورتیزولی» که روی برگه است، هرکدام با عدد و برچسبِ فارسی.
function hyperSignals(e, f) {
  const parts = [];
  if (f.hyper.ufc) parts.push(`${faName("UFC")} ${shownWith(e, "UFC", f.ufc, "µg/24h")} (بالاتر از حدِ معمولِ حدود ${UFC_ULN_UG24})`);
  if (f.hyper.dst) parts.push(`${faName("CORTISOL_DST")} ${shownWith(e, "CORTISOL_DST", f.dst, "µg/dL")} (از ${DST_POSITIVE_UGDL} کمتر نشده است)`);
  if (f.hyper.sal) parts.push(`${faName("CORTISOL_SAL")} ${shownWith(e, "CORTISOL_SAL", f.sal, "µg/dL")} (بالاتر از حدِ معمولِ حدود ${SAL_ULN_UGDL})`);
  return parts.join("؛ ");
}
const hyperExplains = (f) => [...(f.hyper.ufc ? ["UFC"] : []), ...(f.hyper.sal ? ["CORTISOL_SAL"] : [])];

function acthClause(e, f) {
  if (f.acth == null) return { text: "ACTH روی این برگه نیست؛ اندازه‌گیریِ آن (نمونهٔ صبح) به پزشک کمک می‌کند منشأ را مشخص کند. ", suggest: ["ACTH"], explains: [] };
  const v = shownWith(e, "ACTH", f.acth, "pg/mL");
  if (f.acth < ACTH_LOW_PGML)
    return { text: `ACTH شما ${v} و پایین است؛ این الگو معمولاً به خودِ غدهٔ فوق‌کلیوی اشاره می‌کند، نه به فرمانِ بیرونی. `, suggest: [], explains: ["ACTH"] };
  if (f.acth > ACTH_HIGH_PGML)
    return { text: `ACTH شما ${v} و بالاست؛ این الگو معمولاً از هیپوفیز یا یک منبعِ نابجا می‌آید و پزشک با تصویربرداری و آزمون‌های بیشتر پیگیری می‌کند. `, suggest: [], explains: ["ACTH"] };
  return { text: `ACTH شما ${v} و در ناحیهٔ خاکستریِ ${ACTH_LOW_PGML} تا ${ACTH_HIGH_PGML} است؛ به‌تنهایی منشأ را مشخص نمی‌کند و پزشک آزمون‌های دیگر را می‌خواهد. `, suggest: [], explains: ["ACTH"] };
}

export const RULES_ENDOCRINE_PITUITARY = [
  {
    id: "hyperprolactinemia",
    match: (e) => !!prlHigh(e),
    build: (e) => {
      const prl = prlHigh(e);
      const hi = getRef("PRL", e.sex, e.age)?.[1];
      const veryHigh = prl.value > PRL_PITUITARY_NG_ML;
      const urgency = veryHigh ? "this_week" : "routine";
      const t = tshState(e);
      const preg = canBePregnant(e);
      return {
        pattern: "hyperprolactinemia",
        urgency,
        sources: ["ES_HYPERPROLACTINEMIA"],
        key_number: prl.value,
        headline: "پرولاکتین شما بالاتر از حدِ معمول است",
        must_say:
          `پرولاکتین شما ${prl.value} ng/mL است و از حدِ بالای معمول (${hi}) بیشتر است. ` +
          `این هورمون در ${preg ? "بارداری و شیردهی، " : ""}استرس و بعد از ورزش یا نمونه‌گیریِ ناآرام بالا می‌رود، ` +
          "بعضی داروها (از جمله چند داروی ضدروان‌پریشی و ضدتهوع) و بیماری‌هایی مثل کم‌کاریِ تیروئید و نارساییِ کلیه هم همین اثر را دارند. " +
          thyroidSentence(t) +
          (veryHigh
            ? "عددِ بالای ۲۰۰ را علت‌های ساده کمتر می‌سازند و پزشک معمولاً هیپوفیز را هم بررسی می‌کند؛ این به معنای بیماریِ قطعی نیست و بعضی داروها هم می‌توانند عدد را تا این حد برسانند. "
            : "اگر افزایش در نمونهٔ دوم هم دیده شود، پزشک علتش را بررسی می‌کند. ") +
          "داروهایی که مصرف می‌کنید را به پزشک بگویید.",
        action: veryHigh
          ? "این هفته با پزشک مطرح کنید تا علتِ این عدد بررسی شود. داروی خود را بدون مشورتِ پزشک قطع نکنید."
          : "در نوبتِ عادی با پزشک مطرح کنید و فهرستِ داروهایتان را همراه ببرید. داروی خود را بدون مشورتِ پزشک قطع نکنید.",
        suggest: t.arm === "absent" ? ["TSH و FT4"] : [],
        warnings: [],
        // TSH در هر چهار شاخه جمله دارد، پس پوشش‌اش با این قاعده درست است (N18/M156).
      };
    },
  },
  {
    id: "cortisol_untimed",
    match: (e) => {
      const c = e.ungraded?.CORTISOL;
      // فقط reason "no_range" (واحدِ سرمیِ چاپ‌شده)؛ بی‌واحد/نامعلوم را unit_unknown_values می‌گوید و دو یافته برای یک عدد نمی‌شود (N20).
      return c != null && c.reason === "no_range" && typeof c.value === "number" && !isPer24h(c.unit);
    },
    build: (e) => {
      const entry = e.ungraded.CORTISOL;
      return {
        pattern: "cortisol_untimed",
        urgency: "routine",
        headline: "کورتیزولِ شما بدونِ ساعتِ نمونه‌گیری است",
        must_say:
          `کورتیزولِ شما ${cortisolShown(e, entry)} است. ` +
          "این هورمون در طولِ روز بالا و پایین می‌شود: صبح بیشترین و عصر و شب کمترین است. " +
          "روی این برگه ساعتِ نمونه‌گیری معلوم نیست، پس تفسیرِ این عدد به آن ساعت بستگی دارد و بدونِ آن نمی‌توان آن را در محدودهٔ مرجع سنجید.",
        action: "اگر پزشک این آزمایش را برای بررسیِ غدهٔ فوق‌کلیه خواسته، ساعتِ دقیقِ نمونه‌گیری را به او بگویید.",
        suggest: [],
        warnings: [],
        explains: ["CORTISOL"],
      };
    },
  },

  // ── شش برچسبِ آدرنال: هرکدام فقط «برچسبِ من است؟» می‌پرسد. کلیدهایی که می‌خوانند در کامنتِ بدنهٔ build نیست، در متن/کد است (RULE_READS). ──
  {
    id: "adrenal_insufficiency_likely",
    match: (e) => adrenalAxis(e) === "adrenal_insufficiency_likely",
    build: (e) => {
      const f = adrenalFacts(e);
      const reads = ["CORTISOL_AM"];
      const amShown = shownWith(e, "CORTISOL_AM", f.am, "µg/dL");
      // P77-۶ (تصمیمِ بازبین ۲۰۲۶-۱۰-۰۴؛ Endocrine Society — Na/K/قند عددهای منبع‌دار نیستند، آستانهٔ قابل‌تنظیم): کورتیزولِ بسیار پایین
      //    همراهِ Na < ۱۳۰ و K > ۵٫۵ و قند < ۷۰ (هر سه روی همین برگه) ⇒ الگوی بحرانِ آدرنال ⇒ اورژانس؛ وگرنه سقفِ this_week (P46 بند ۱۲).
      const gv = (k) => e.graded.find((x) => x.test === k)?.value;
      const naV = gv("NA"), kV = gv("K");
      const glu = [gv("GLU_F"), gv("GLU_RANDOM")].filter((v) => v != null);
      const crisis = gv("NA") != null && gv("NA") < ADRENAL_CRISIS_NA_BELOW &&
                     gv("K") != null && gv("K") > ADRENAL_CRISIS_K_ABOVE &&
                     glu.some((v) => v < ADRENAL_CRISIS_GLU_BELOW);
      const urgency = crisis ? "emergency" : "this_week";   // سقفِ فوریتِ غیرِبحران: موتور نمی‌داند حالِ حاد دارید
      return {
        pattern: "adrenal_insufficiency_likely",
        urgency,
        sources: ["ES_PAI_DX"],
        key_number: f.am,
        headline: "کورتیزولِ صبحِ شما بسیار پایین است",
        must_say:
          `${faName(reads[0])} شما ${amShown} است و از ${AM_LIKELY_UGDL} کمتر است. ` +
          "اگر نمونه واقعاً صبح گرفته شده باشد، این سطح با کم‌کاریِ غدهٔ فوق‌کلیه می‌خواند. " + DRUG_LOW +
          "برای قطعی‌شدن معمولاً آزمونِ تحریکِ ACTH لازم است و تشخیص با پزشک است." +
          (crisis ? ` روی همین برگه سدیم (${naV}) پایین، پتاسیم (${kV}) بالا و قند پایین هم هست؛ این سه‌گانه همراهِ کورتیزولِ پایین الگوی بحرانِ غدهٔ فوق‌کلیه است و ارزیابیِ فوری می‌خواهد.` : ""),
        action: crisis
          ? "همین امروز به اورژانس مراجعه کنید و بگویید کورتیزولِ صبحتان بسیار پایین بوده است."
          : urgencyAction(urgency, "این هفته با پزشک مطرح کنید." + AI_RED_FLAG, "در نوبتِ عادی با پزشک مطرح کنید."),
        suggest: [],
        warnings: [],
      };
    },
  },
  {
    id: "adrenal_insufficiency_indeterminate",
    match: (e) => adrenalAxis(e) === "adrenal_insufficiency_indeterminate",
    build: (e) => {
      const f = adrenalFacts(e);
      const reads = ["CORTISOL_AM"];
      const amShown = shownWith(e, "CORTISOL_AM", f.am, "µg/dL");
      const urgency = "routine";
      return {
        pattern: "adrenal_insufficiency_indeterminate",
        urgency,
        sources: ["ES_PAI_DX"],
        key_number: f.am,
        headline: "کورتیزولِ صبحِ شما پایین‌تر از معمول است",
        must_say:
          `${faName(reads[0])} شما ${amShown} است؛ از حدِ پایینِ معمولِ صبح (حدود ${AM_LOW_UGDL}) کمتر ولی از ${AM_LIKELY_UGDL} بیشتر است، یعنی در ناحیهٔ نامشخص. ` +
          "این عدد به‌تنهایی نارسایی را نشان نمی‌دهد: اگر نمونه صبحِ زود (حدود ساعتِ ۸) گرفته نشده باشد، کورتیزولِ طبیعی هم پایین‌تر از این است. " + DRUG_LOW +
          "پزشک تصمیم می‌گیرد آزمونِ تکمیلی لازم است یا نه.",
        action: urgencyAction(urgency, "این هفته با پزشک مطرح کنید.", "در نوبتِ عادی با پزشک مطرح کنید؛ اگر ضعفِ شدید یا سرگیجهٔ مداوم دارید زودتر."),
        suggest: [],
        warnings: [],
      };
    },
  },
  {
    id: "cortisol_am_high_nonspecific",
    match: (e) => adrenalAxis(e) === "cortisol_am_high_nonspecific",
    build: (e) => {
      const f = adrenalFacts(e);
      const reads = ["CORTISOL_AM"];
      const amShown = shownWith(e, "CORTISOL_AM", f.am, "µg/dL");
      const urgency = "routine";
      return {
        pattern: "cortisol_am_high_nonspecific",
        urgency,
        sources: ["ES_CUSHING_DX"],
        key_number: f.am,
        headline: "کورتیزولِ صبحِ شما بالاتر از معمول است",
        must_say:
          `${faName(reads[0])} شما ${amShown} است و از حدِ بالای معمولِ صبح (حدود ${AM_HIGH_UGDL}) بیشتر است. ` +
          "استرس، بیماری، کم‌خوابی، چاقی و بارداری هم آن را بالا می‌برند؛ کورتیزولِ صبح به‌تنهایی کوشینگ را نشان نمی‌دهد و برای غربالگریِ آن آزمون‌های دیگری (ادرار ۲۴ساعته، بزاقِ نیمه‌شب، دگزامتازون) به کار می‌رود. " + DRUG_HIGH,
        action: urgencyAction(urgency, "این هفته با پزشک مطرح کنید.", "در نوبتِ عادی با پزشک مطرح کنید."),
        suggest: [],
        warnings: [],
      };
    },
  },
  {
    id: "cushing_screen_positive",
    match: (e) => adrenalAxis(e) === "cushing_screen_positive",
    build: (e) => {
      const f = adrenalFacts(e);
      const reads = ["CORTISOL_DST", "UFC", "CORTISOL_SAL"];
      const urgency = "routine";
      return {
        pattern: "cushing_screen_positive",
        urgency,
        sources: ["ES_CUSHING_DX"],
        headline: "غربالگریِ کوشینگ مثبت است",
        must_say:
          `${hyperSignals(e, f)}. این یعنی یک آزمونِ غربالگری از حدِ معمول بیشتر است، نه اینکه کوشینگ تأیید شده باشد؛ افسردگی، چاقی، مصرفِ الکل و کم‌خوابی هم نتیجهٔ کاذب می‌دهند و معمولاً آزمون باید دوباره تکرار یا با آزمونِ دیگری تأیید شود. ` +
          METHOD_NOTE + DRUG_HIGH,
        action: urgencyAction(urgency, "این هفته با پزشک مطرح کنید.", "در نوبتِ عادی با پزشک مطرح کنید و فهرستِ داروهایتان را همراه ببرید."),
        suggest: [],
        warnings: [],
        explains: hyperExplains(f).filter((k) => reads.includes(k)),
      };
    },
  },
  {
    id: "cushing_likely",
    match: (e) => adrenalAxis(e) === "cushing_likely",
    build: (e) => {
      const f = adrenalFacts(e);
      const reads = ["UFC", "CORTISOL_DST", "CORTISOL_SAL", "ACTH"];
      const urgency = "this_week";
      const a = acthClause(e, f);
      return {
        pattern: "cushing_likely",
        urgency,
        sources: ["ES_CUSHING_DX"],
        key_number: f.ufc,
        headline: "کورتیزولِ ادرارِ شما بسیار بالاست",
        must_say:
          `${hyperSignals(e, f)}. این بیش از ${UFC_VERY_FOLD} برابرِ حدِ معمول است و هم‌پوشانی با حالت‌های کاذب (مثل افسردگی یا چاقی) در این سطح بسیار کم است، پس بسیار مطرح‌کنندهٔ مازادِ کورتیزول است. ` +
          a.text + "این به‌تنهایی تشخیص نیست و پزشک با آزمون‌های بیشتر تأیید می‌کند. " + METHOD_NOTE + DRUG_HIGH,
        action: urgencyAction(urgency, "این هفته با پزشک مطرح کنید.", "در نوبتِ عادی با پزشک مطرح کنید."),
        suggest: a.suggest,
        warnings: [],
        explains: [...hyperExplains(f), ...a.explains].filter((k) => reads.includes(k)),
      };
    },
  },
  {
    id: "adrenal_discordant",
    match: (e) => adrenalAxis(e) === "adrenal_discordant",
    build: (e) => {
      const f = adrenalFacts(e);
      const reads = ["CORTISOL_AM", "CORTISOL_DST", "UFC", "CORTISOL_SAL"];
      const amShown = shownWith(e, "CORTISOL_AM", f.am, "µg/dL");
      // کفِ فوریت: اگر طرفِ «پایین» بسیار پایین است همان this_week می‌ماند — تناقض فوریت را پایین نمی‌آورد (N20).
      const urgency = f.am < AM_LIKELY_UGDL ? "this_week" : "routine";
      return {
        pattern: "adrenal_discordant",
        urgency,
        sources: ["ES_PAI_DX", "ES_CUSHING_DX"],
        headline: "نتایجِ کورتیزولِ شما با هم نمی‌خوانند",
        must_say:
          `${faName(reads[0])} شما ${amShown} و پایین است، در حالی که ${hyperSignals(e, f)} که بالاست. ` +
          "این دو نتیجه با هم نمی‌خوانند و هیچ‌کدام را نمی‌توان درست‌تر دانست: ممکن است ساعتِ نمونه‌گیری یا روشِ سنجش فرق داشته باشد، یا دارو و بیماری یکی را مخدوش کرده باشد. " +
          DRUG_LOW + DRUG_HIGH + "پزشک باید آزمون‌ها را کنارِ هم و در صورتِ لزوم دوباره تفسیر کند.",
        action: urgencyAction(urgency, "این هفته با پزشک مطرح کنید." + AI_RED_FLAG, "در نوبتِ عادی با پزشک مطرح کنید و هر دو نتیجه را نشان دهید."),
        suggest: [],
        warnings: [],
        explains: hyperExplains(f).filter((k) => reads.includes(k)),
      };
    },
  },
];
