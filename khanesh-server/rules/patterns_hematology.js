import { serologyReactive, qualPositive, qualValue, titreFa, hasInflammation, whoFerritinThreshold, whoInflamIronDeficiency, urinePositive, urineCellCount, urineGrade, isNephrotic, isGlomerulonephritis, isDIC, val, rankOf, anemiaCrisisOwns, actionUnlessAnemiaCrisis , urineBiliSentence, crisisArm, ferritinBelowIdCut, ferritinIdCut, isPedAge, ironLowForAcd, hba2State, hba2Measured, hba2Clause, ferritinMicroClause, stfrIndex, stfrIndexHigh, STFR_INDEX_ID_ABOVE, zppState, ZPP_HIGH_ABOVE, hbVariantState, HB_VARIANT_FA, macroMcvCut } from "./patterns_utils.js";
import { faName } from "./names.js";
import { preanalyticalCaveats, attachPreanalytical } from "./preanalytical.js";
import { repeatDeltaFa } from "./biovar.js";
import { getPedRef, isPediatricRCPCH } from "./refs_ped.js";
import { RULES_MALIGNANCY } from "./patterns_malignancy.js";

// P58 (N20): وقتی یکی از دو سطحِ «لکوسیتوز + سیتوپنیِ شدید» فعال است، WBC صاحب دارد و leukocytosis کنار می‌رود — دو یافته
//   دربارهٔ یک عدد نمی‌سازیم. «آیا آن قاعده فعال می‌شود»، نه تکرارِ آستانه‌ها (M91e).
const LEUK_CYTO_IDS = new Set(["leukocytosis_with_cytopenia", "reactive_leukocytosis_with_cytopenia"]);
const leukCytopeniaOwns = (e) => RULES_MALIGNANCY.some((r) => LEUK_CYTO_IDS.has(r.id) && r.match(e));
import { isNeonate, inNeonatalRedCellPeriod, ageFa, NEONATAL_DANGER_WARNING, NEONATAL_TODAY_ACTION, neutMissingText, neonatalContextText,
  plateletAbnormal, plateletIndicesText, indicesInconsistentText, neonatalLowRbcClause } from "./neonatal.js";

// ─── specs/008 بازبینیِ دور ۲ (R2-B4): هشدارِ ناقل بودن — هر یافته‌ای که جملهٔ HbA2ِ «صفت» را می‌گوید آن را هم دارد ───
// hba2_elevated برای مالکانِ تالاسمی کنار می‌رود؛ بی‌این، برگهٔ پیش‌ازدواجِ «CBC + HbA2 5.2» فقط دلگرمی می‌گرفت و
// پیامدِ فرزند — دلیلِ انجامِ این آزمایش — گم می‌شد (M155-class، N20).
const HBA2_CARRIER_WARNING = "اگر قصدِ ازدواج یا بچه‌دار شدن دارید، این نتیجه را حتماً به پزشک یا مشاورِ ژنتیک نشان دهید؛ " +
  "اگر هر دو والد ناقل باشند، فرزند ممکن است شکلِ شدیدِ بیماری را بگیرد.";
const carrierWarnings = (e) => (["trait", "very_high"].includes(hba2State(e)) ? [HBA2_CARRIER_WARNING] : []);

// ─── برگهٔ واقعی ۲۰۲۶-۰۹-۲۴: نسخهٔ کوتاهِ normocytic_anemia زیرِ اورژانسِ دیگر ───
// ⚠️ عمداً بیرون از قاعده: RULE_READS کلیدها را از متنِ match/build می‌خواند؛ اگر HCT/MCH/RDW آن‌جا بودند، یافتهٔ
//    کاملِ (نه‌کوتاهِ) نورموسیتیک آن‌ها را در هر جهتی «پوشش‌داده» می‌کرد بی‌آنکه نامشان را ببرد (M156).
// job fff90f58 (E3، P58): شاخصی که در کودک بازهٔ سنی ندارد و با ردیفِ بزرگسال (هنری) سنجیده شد — مثلاً RBC و RDWِ شیرخوارِ
//   ۶–۱۲ ماهه. چنین عددی «حد طبیعی» نامیده نمی‌شود و پایهٔ گمانه‌ای نمی‌شود؛ فقط گفته می‌شود با چه بازه‌ای سنجیده شد.
const adultRangeInChild = (e, x) => isPediatricRCPCH(e.age) && !getPedRef(x.test, e.age);
const indexLabelFa = (k) => (k === "RDW_SD" ? "RDW-SD" : k === "RDW_CV" ? "RDW-CV" : faName(k));
function adultRangeSentence(items) {
  if (!items.length) return "";
  const many = items.length > 1;
  return `${items.map((x) => `${indexLabelFa(x.test)} ${x.value} (${x.range})`).join(" و ")} با بازهٔ بزرگسالان سنجیده ${many ? "شدند" : "شد"}، ` +
    `چون بازهٔ مرجعِ این سن را در دست نداریم؛ معنای ${many ? "آن‌ها" : "آن"} را پزشک کنارِ سنِ کودک می‌سنجد. `;
}
function normocyticBrief(e, hgb) {
  // 🔴 برگهٔ واقعی (۲۰۲۶-۰۹-۲۴): زیرِ پان‌سیتوپنی/ترومبوسیتوپنیِ شدید (blocks_others) این یافته کامل پنهان می‌شد و
  //    Hb 10.1، هماتوکریت، MCH و RDW به «توضیح داده نشدند» می‌رفتند — همان کلاسِ M187 که microcytic_anemia بست.
  //    brief فقط جهت‌های هم‌سو را نام می‌برد (HCT/RBC/MCHِ پایین، RDWِ بالا)؛ جهتِ ناهم‌سو به تور می‌رود (R3-CR1).
  const gOf = (k) => e.graded.find((x) => x.test === k);
  const mcvN = gOf("MCV");
  const rdwsAll = ["RDW_SD", "RDW_CV"].map(gOf).filter((x) => x?.abnormal && x.dir === "high");
  // job fff90f58 (E3، P58): PED_REFS برای شیرخوار ردیفِ RDW ندارد، پس RDW-CV 15ِ کودکِ ۶–۱۲ ماهه با بازهٔ بزرگسالِ هنری
  //   «بالا» خورد و جملهٔ «کمبودِ هم‌زمانِ آهن و B12/فولات» را زیرِ اورژانسِ خونی ساخت. عددی که با بازهٔ این سن سنجیده
  //   نشده نه «بخشی از همین کم‌خونی» شمرده می‌شود نه پایهٔ آن گمانه است؛ فقط راست گفته می‌شود که با چه بازه‌ای سنجیده شد.
  const adultInChild = (x) => adultRangeInChild(e, x);
  const rdwsN = rdwsAll.filter((x) => !adultInChild(x));
  const rdwsAdult = rdwsAll.filter(adultInChild);
  const sameN = [
    ["HCT", "هماتوکریت"], ["RBC", "گلبول قرمز"], ["MCH", "MCH"], ["MCHC", "MCHC"],
  ].map(([k, fa]) => { const x = gOf(k); return x?.abnormal && x.dir === "low" && !adultInChild(x) ? `${fa} ${x.value}` : null; })
    .concat(rdwsN.map((x) => `${x.test === "RDW_SD" ? "RDW-SD" : "RDW-CV"} ${x.value}`))
    .filter(Boolean);
  return (
    (hgb != null
      ? `همچنین کم‌خونی دیده می‌شود: هموگلوبین ${hgb.value} (حد طبیعی ${hgb.range})` +
        (mcvN ? `، با گلبول‌هایی به اندازهٔ طبیعی (MCV ${mcvN.value})` : "") +
        (sameN.length ? `؛ ${sameN.join("، ")} هم بخشی از همین کم‌خونی است` : "") + ". "
      : "همچنین کم‌خونی دیده می‌شود. ") +
    adultRangeSentence([...["HCT", "RBC", "MCH", "MCHC"].map(gOf).filter((x) => x?.abnormal && x.dir === "low" && adultInChild(x)), ...rdwsAdult]) +
    (rdwsN.length
      ? "اندازهٔ گلبول‌ها با هم یکسان نیست (RDW بالا)؛ وقتی اندازهٔ متوسطِ گلبول طبیعی است، این می‌تواند کمبودِ هم‌زمانِ دو چیز (مثلاً آهن و B12 یا فولات) باشد. "
      : "") +
    "علت‌یابیِ آن هم باید در کنار موارد فوریِ بالا با پزشک مطرح شود.");
}

// ─── برگهٔ واقعی ۲۰۲۶-۰۹-۲۴ (دوم، ماکروسیتیک): شاخص‌های هم‌جهتِ کم‌خونی در متنِ *کامل* ───
// 🔴 RBC 3.33، HCT 34.1 و MCH 35.6 کنارِ Hb 11.9 / MCV 102.3 در «توضیح داده نشدند» آمدند: macrocytic_anemia و متنِ
//    کاملِ normocytic_anemia هیچ‌کدام را نام نمی‌بردند (brief نورموسیتیک می‌برد، متنِ کامل نه). فقط جهتِ هم‌سو نام برده
//    می‌شود (RBC/HCTِ پایین؛ MCHِ بالا در ماکرو، پایین در نورمو)؛ جهتِ ناهم‌سو عمداً به تور می‌رود. بیرون از قاعده (M156).
function anemiaCompanionsFa(e, macro) {
  const mchDir = macro ? "high" : "low";
  const gOf = (k) => e.graded.find((x) => x.test === k);
  const fmt = (x) => `${faName(x.test)} ${x.value} (حد طبیعی ${x.range})`;
  const lowAll = ["RBC", "HCT"].map(gOf).filter((x) => x?.abnormal && x.dir === "low");
  const low = lowAll.filter((x) => !adultRangeInChild(e, x));
  const m = gOf("MCH");
  let out = low.length ? `${low.map(fmt).join(" و ")} هم پایین است که بخشی از همین کم‌خونی است. ` : "";
  out += adultRangeSentence(lowAll.filter((x) => adultRangeInChild(e, x)));
  if (m?.abnormal && m.dir === mchDir) {
    out += macro
      ? `${fmt(m)} بالاست، چون هر گلبولِ بزرگ‌تر هموگلوبینِ بیشتری در خود دارد؛ این با بزرگ بودنِ گلبول‌ها جور است. `
      : `${fmt(m)} هم پایین است، یعنی هر گلبول هموگلوبینِ کمتری از معمول دارد. `;
  }
  // job 40b8a901 (F3): MCHCِ پایین در کم‌خونیِ نورموسیتیک — MCHC = Hb ÷ Hct، پس پایین بودنش یعنی گلبول‌ها کم‌رنگ‌ترند.
  //   فقط جهتِ هم‌سو (پایین) نام برده می‌شود؛ MCHCِ بالا به اسفروسیتوز/artefact می‌رود و این‌جا عمداً نیست (M156).
  //   یک جمله در همان متنِ کم‌خونی، نه قاعدهٔ جدا، تا بیمار «سه کم‌خونی» نخواند.
  const mc = gOf("MCHC");
  if (!macro && mc?.abnormal && mc.dir === "low" && !adultRangeInChild(e, mc)) {
    out += `${fmt(mc)} هم پایین است، یعنی گلبول‌ها کمی کم‌رنگ‌تر از معمول‌اند؛ پزشک این را کنار فریتین و آهن می‌سنجد. `;
  }
  return out;
}
// نسخهٔ کوتاهِ macrocytic_anemia زیرِ اورژانسِ دیگر — خواهرِ normocyticBrief (N20: «وقتی یکی always_show گرفت، خواهرها را هم»).
function macrocyticBrief(e, hgb) {
  const mcv = e.graded.find((x) => x.test === "MCV");
  return (hgb ? `همچنین کم‌خونی با گلبول‌های بزرگ دیده می‌شود: هموگلوبین ${hgb.value} (حد طبیعی ${hgb.range})` : "همچنین کم‌خونی با گلبول‌های بزرگ دیده می‌شود") +
    (mcv ? `، MCV ${mcv.value}` : "") + ". " + anemiaCompanionsFa(e, true) +
    "علت‌یابیِ آن (ویتامین B12، فولات، تیروئید) هم باید در کنار موارد فوریِ بالا با پزشک مطرح شود.";
}
// شمارشِ نوتروفیلِ پایین کنارِ گلبول سفیدِ پایین مالِ leukopenia است (همان یک یافته)؛ بیرون از قاعده تا WBC در
// RULE_READSِ mild_neutropenia نیاید و WBCِ *بالا* (مثلاً لنفوسیتوز) بی‌صدا «پوشش‌داده» نشود (M156).
const wbcLowGraded = (e) => { const w = e.graded.find((g) => g.test === "WBC"); return !!(w?.abnormal && w.dir === "low"); };
// job fff90f58 (E2-ب، P58): نوتروفیلِ غایب کنارِ گلبول سفیدِ *بالا* — عددِ سرنوشت‌ساز (نوتروفیل/بلاست) در دست نیست و
//   دیفِ دستی باید صریح خواسته شود، نه فقط «شمارش افتراقی». بیرون از قاعده تا WBC در RULE_READSِ neutrophil_count_missing
//   نیاید و WBCِ *پایین* بی‌صدا «پوشش‌داده» نشود (M156). عددِ تازه‌ای نیست: «بالا» همان حکمِ grade است.
const wbcHighGraded = (e) => { const w = e.graded.find((g) => g.test === "WBC"); return !!(w?.abnormal && w.dir === "high"); };
const MANUAL_DIFF_BLAST_SUGGEST = "گسترش خون محیطی با شمارش افتراقی دستی و بررسی بلاست";
function wbcHighDiffClause(e) {
  if (!wbcHighGraded(e)) return "";
  const w = e.graded.find((g) => g.test === "WBC");
  return ` گلبول سفید ${w.value} است و از بازه (${w.range}) بالاتر است؛ وقتی گلبول سفید بالاست و تعدادِ نوتروفیل در دست نیست، ` +
    "شمارشِ افتراقیِ دستی روی لامِ خونِ محیطی، با جست‌وجوی سلول‌های نارس (بلاست)، لازم است.";
}
// job 40b8a901 (F5): PT بالا و هیچ شاخصِ دیگرِ انعقاد غیرطبیعی نیست. INR باید *اندازه‌گیری‌شده و طبیعی* باشد؛ INRِ غایب
//   «طبیعی» نیست (N4) و برگه همان متنِ کلیِ قبلی را می‌گیرد. بیرون از قاعده (M156: PT/INR/APTT در RULE_READS نیایند).
function ptIsolatedMild(e) {
  const g = (k) => e.graded.find((x) => x.test === k);
  const pt = g("PT"), inr = g("INR"), aptt = g("APTT"), fib = g("FIB");
  return !!(pt?.abnormal && pt.dir === "high" && inr && !inr.abnormal &&
    !(aptt?.abnormal && aptt.dir === "high") && !(fib?.abnormal && fib.dir === "low"));
}
function coagulationIsolatedPtText(e) {
  const g = (k) => e.graded.find((x) => x.test === k);
  const pt = g("PT"), inr = g("INR"), aptt = g("APTT");
  return `زمان پروترومبین (PT) شما ${pt.value} است و از حد طبیعی (${pt.range}) کمی بالاتر است، ولی INR (که PT را بین آزمایشگاه‌ها قابل‌مقایسه می‌کند) ${inr.value} و در محدوده است` +
    (aptt && !aptt.abnormal ? ` و APTT هم طبیعی است` : "") + ". " +
    "PTِ خام به معرفِ هر آزمایشگاه بستگی دارد، پس این تفاوت به‌تنهایی نشانهٔ اختلالِ انعقادی نیست؛ برای اطمینان PT و INR باید تکرار شود. " +
    "اگر داروی رقیق‌کننده (مثل وارفارین) مصرف می‌کنید یا خونریزی یا کبودیِ بی‌دلیل دارید، به پزشک بگویید.";
}
// نسخهٔ کوتاه زیرِ اورژانسِ دیگر (خواهرِ normocyticBrief؛ N20). فقط شاخص‌های همین یافته را با عددشان می‌گوید.
function coagulationBrief(e) {
  const g = (k) => e.graded.find((x) => x.test === k);
  if (ptIsolatedMild(e)) {
    const pt = g("PT"), inr = g("INR");
    return `زمان پروترومبین (PT) ${pt.value} (حد طبیعی ${pt.range}) کمی بالاتر است ولی INR ${inr.value} در محدوده است؛ تکرارِ PT و INR را در همان مراجعه با پزشک مطرح کنید.`;
  }
  const items = [["PT", "PT (زمان پروترومبین)", "high"], ["INR", "INR", "high"], ["APTT", "APTT", "high"], ["FIB", "فیبرینوژن", "low"]]
    .map(([k, fa, dir]) => { const x = g(k); return x?.abnormal && x.dir === dir ? `${fa} ${x.value} (حد طبیعی ${x.range})` : null; })
    .filter(Boolean);
  return `شاخص‌های لخته شدنِ خون هم غیرطبیعی است: ${items.join("، ")}. این را در همان مراجعه با پزشک مطرح کنید و بگویید چه داروهایی مصرف می‌کنید.`;
}
// job 40b8a901 (F1): لنفوسیتِ مطلقِ پایین زیرِ پان‌سیتوپنی. درجهٔ «شدید» از جدولِ CTCAE می‌آید (< ۵۰۰ = G3) و دست نمی‌خورد؛
//   ولی خواننده نباید آن را «لنفوپنیِ ایزولهٔ شدید» بخواند: WBC کمی پایین است و این کاهش همان افتِ سلول‌های سفید است.
//   بیرون از قاعده تا LYMPH_ABS در RULE_READSِ pancytopenia نیاید و جهتِ دیگر (بالا) بی‌صدا «پوشش‌داده» نشود (M156).
function lymphClauseInPancytopenia(e) {
  const ly = e.graded.find((g) => g.test === "LYMPH_ABS");
  if (!ly?.abnormal) return "";
  if (ly.dir === "high") return ` لنفوسیت ${ly.value} بالاتر از حد طبیعی (${ly.range}) است؛ پزشک آن را کنارِ همین تصویر می‌سنجد.`;
  const neut = e.graded.find((g) => g.test === "NEUT_ABS");
  const neutOk = neut && !neut.abnormal;
  return ` لنفوسیت ${ly.value} (حد طبیعی ${ly.range}) هم پایین است` +
    (neutOk ? `؛ نوتروفیل در محدوده است، پس افتِ گلبول‌های سفید بیشتر از لنفوسیت‌هاست` : "") +
    `. این کاهش بخشی از همین تصویرِ کلیِ خون است و به‌تنهایی یک بیماریِ جدا نیست؛ پزشک آن را کنار بقیه می‌سنجد.`;
}
function neutLowClause(e) {
  const n = e.graded.find((g) => g.test === "NEUT_ABS");
  return n?.abnormal && n.dir === "low"
    ? ` نوتروفیل هم ${n.value} است (حد طبیعی ${n.range}) — بخشی از گلبول‌های سفید که با عفونت‌های باکتریایی مقابله می‌کند.`
    : "";
}

// شدتِ کم‌خونی به‌سبکِ WHO: خفیف تا ۱۱، متوسط ۸ تا ۱۱، شدید زیرِ ۸. P53 پرسش ۲ (بارداری): WHO برای بارداری
// خفیف ۱۰–۱۰.۹، متوسط ۷–۹.۹، شدید زیرِ ۷ — وگرنه بارداری با Hb 10.8 «کم‌خونیِ متوسط» می‌خواند.
function anemiaSeverityFa(e, hb) {
  if (e.pregnant) return hb < 7 ? "شدید" : hb < 10 ? "متوسط" : "خفیف";
  return hb < 8 ? "شدید" : hb < 11 ? "متوسط" : "خفیف";
}

// ─── specs/004: فولات و B12 — سه‌حالته، مشترکِ macrocytic_anemia و folate_deficiency ───
// شرطِ کم‌خونیِ ماکروسیتیک یک جا نوشته می‌شود؛ folate_deficiency با همین تابع کنار می‌رود (N20).
export const macrocyticMatch = (e) => {
  const hgb = e.graded.find((g) => g.test === "HGB");
  return !!(hgb?.abnormal && hgb.dir === "low" && val(e).MCV > macroMcvCut(e));
};
// فوریت و جملهٔ اقدام از یک تصمیم (N20) — همان کمکیِ patterns_cardiac.js، عمداً کپی.
function actionFor(urgency, { week, routine }) {
  return urgency === "this_week" ? week : routine;
}
// عددِ تازه‌ای نیست: همان مرزهای overt_b12_deficiency (< ۱۵۰) و borderline_b12_deficiency (۱۵۰ تا ۳۹۹)، P21.
// حالتِ جمله: یافتهٔ خودِ فولات، یا بندی درونِ ماکروسیتیک (عدد، نه رشته — M38 رشته‌ها را متنِ بیمار می‌شمارد).
const CLAUSE_FOR = { own: 0, macro: 1 };
const B12_OVERT_BELOW = 150;
const B12_BORDERLINE_MAX = 399;
const FOLIC_CAUTION = "پیش از مصرفِ اسید فولیک باید B12 هم سنجیده شود، چون اسید فولیک می‌تواند کم‌خونیِ ناشی از کمبودِ B12 را بپوشاند در حالی که آسیبِ عصبیِ آن ادامه پیدا می‌کند.";
const FOLIC_WARNING = "تا پزشک وضعیتِ ویتامین B12 را بررسی نکرده، خودسرانه اسید فولیک شروع نکنید.";
// عددِ چاپ‌شده، نه فقط عددِ تبدیل‌شده (N5).
function printedOf(e, key, value) {
  const c = (e.unitConversions || []).find((x) => x.test === key);
  if (!c) return `${value}`;
  // واحدی که برگه چاپ نکرده (از محدودهٔ مرجع یا اندازه تعیین شد) کنارِ عددِ بیمار «چاپ‌شده» نوشته نمی‌شود —
  // کارتِ «واحدها» در فرانت پایه‌اش را توضیح می‌دهد (بازبینیِ کدِ 004، مورد ۴).
  if (c.basis && c.basis !== "printed") return `${c.raw}`;
  // units.js واحد را کوچک‌شده نگه می‌دارد («nmol/l»)؛ لیتر را به شکلِ چاپیِ رایج برگردان.
  return `${c.raw} ${String(c.from).replace(/\/l$/, "/L")}`;
}
// B12 از نگاهِ فولات: کمبودش رد نشده (اندازه‌نشده، واحدِ نامعلوم یا مرزی)؟ زیرِ ۱۵۰ را overt_b12_deficiency
// با هشدارِ فولیکِ خودش می‌گوید.
function b12Unsettled(e) {
  const b = val(e).B12;
  return b == null || (b >= B12_OVERT_BELOW && b <= B12_BORDERLINE_MAX);
}
// فولات: پایین / پایین‌نیست / واحدِ نامعلوم / اندازه‌نشده (N4). `mode`: CLAUSE_FOR.own = یافتهٔ فولات، CLAUSE_FOR.macro = ماکروسیتیک.
function folateClause(e, mode) {
  const f = e.graded.find((g) => g.test === "FOLATE");
  if (!f) {
    return e.ungraded?.FOLATE
      ? "فولات روی برگه هست ولی واحدش خوانده نشد، پس درباره‌اش قضاوت نمی‌کنیم."
      : "فولات روی این برگه اندازه‌گیری نشده است.";
  }
  const low = f.abnormal && f.dir === "low";
  const shown = printedOf(e, "FOLATE", f.value);
  if (mode === CLAUSE_FOR.own) {
    const lo = String(f.range ?? "").split(/[–-]/)[0];
    const conv = shown === `${f.value}` ? `${f.value} ng/mL` : `${shown} (برابرِ ${f.value} ng/mL)`;
    return `فولاتِ سرمِ شما ${conv} است و از حدِ پایینِ طبیعی (${lo} ng/mL) کمتر است.`;
  }
  // سه‌حالته، نه دوحالته: «پایین نیست» با «طبیعی است» یکی نیست (N12؛ کودک: محدودهٔ ۳–۱۵).
  if (low) return `فولاتِ شما روی همین برگه ${shown} و پایین است، که با این نوع کم‌خونی می‌خواند.`;
  if (f.abnormal && f.dir === "high") {
    return `فولاتِ شما روی همین برگه بالاتر از محدودهٔ طبیعی است (${shown}، طبیعی ${f.range})، پس کمبودِ فولات علتِ محتمل‌تری نیست.`;
  }
  return `فولاتِ شما روی همین برگه طبیعی است (${shown})، پس کمبودِ فولات علتِ محتمل‌تری نیست.`;
}
// B12: پایین / مرزی / پایین‌نیست / واحدِ نامعلوم / اندازه‌نشده.
function b12Clause(e, mode) {
  const b = val(e).B12;
  if (b == null) {
    return e.ungraded?.B12
      ? "ویتامین B12 روی برگه هست ولی واحدش خوانده نشد، پس درباره‌اش قضاوت نمی‌کنیم."
      : "ویتامین B12 روی این برگه اندازه‌گیری نشده است.";
  }
  const shown = printedOf(e, "B12", b);
  // B12ِ بالاتر از محدوده: این قاعده B12 را «می‌خواند»، پس تورِ unexplained_abnormal دیگر نامش را نمی‌برد —
  // پس جمله خودش باید بگوید بالاست، نه فقط «پایین نیست» (بازبینی B2، N18).
  const g = e.graded.find((x) => x.test === "B12");
  if (g?.abnormal && g.dir === "high") {
    const high = `ویتامین B12 شما (${shown}) بالاتر از محدودهٔ طبیعی است (${g.range})`;
    return mode === CLAUSE_FOR.own
      ? `${high}؛ کمبودِ B12 نیست، ولی بالا بودنش را این یافته توضیح نمی‌دهد و باید با پزشک بررسی شود.`
      : `${high}، پس کمبودِ B12 علتِ محتمل‌تری نیست؛ بالا بودنش را این یافته توضیح نمی‌دهد و باید با پزشک بررسی شود.`;
  }
  if (b < B12_OVERT_BELOW) {
    return mode === CLAUSE_FOR.own
      ? `ویتامین B12 شما هم روی همین برگه پایین است (${shown})؛ کمبودِ هم‌زمانِ این دو ویتامین را پزشک با هم بررسی می‌کند.`
      : `ویتامین B12 شما روی همین برگه پایین است (${shown})، که با این نوع کم‌خونی می‌خواند.`;
  }
  if (b <= B12_BORDERLINE_MAX) {
    return mode === CLAUSE_FOR.own
      ? `ویتامین B12 شما (${shown}) نزدیکِ مرزِ پایین است؛ پیش از مصرفِ اسید فولیک، پزشک باید کمبودِ B12 را هم رد کند.`
      : `ویتامین B12 شما (${shown}) نزدیکِ مرزِ پایین است و کمبود را کاملاً رد نمی‌کند.`;
  }
  return mode === CLAUSE_FOR.own
    ? `ویتامین B12 شما روی همین برگه پایین نیست (${shown}).`
    : `ویتامین B12 شما روی همین برگه پایین نیست (${shown})، پس کمبودِ B12 علتِ محتمل‌تری نیست.`;
}

/**
 * «spherocytosis_likely فعال است؟» — خودِ match ِ آن قاعده صدا زده می‌شود، تا rbc_indices_implausible
 * آستانهٔ ۳۶ (P5) را دوباره ننویسد (M91e، specs/007). ⚠️ match سرِ جایش در قاعده می‌ماند و اینجا منتقل
 * نمی‌شود: RULE_READS در patterns.js کلیدها را از *متنِ* match می‌خواند، و بیرون‌کشیدنش MCH/RDW/MCV را از
 * «خوانده‌شده» بیرون می‌برد و به تورِ unexplained_abnormal می‌انداخت.
 */
function spherocytosisFires(e) {
  return !!RULES_HEMATOLOGY.find((r) => r.id === "spherocytosis_likely").match(e);
}

/*
 * specs/007 (Q3=B): MCHCِ بالای ۳۶.۵ g/dL از نظرِ فیزیولوژیک بعید است — MCHC = Hb ÷ Hct، پس یعنی
 * هموگلوبین و هماتوکریتِ همین برگه با هم نمی‌خوانند (آگلوتینینِ سرد، چربیِ خون). 🔴 پیش از 007 الگوی
 * کلاسیکِ آگلوتینینِ سرد (Hb 14، Hct 30، MCHC 46.7) «یعنی این نتیجه کم‌خونی نیست … کمبود آهن، B12 یا
 * فولات» می‌خواند: توضیحِ یک خطای دستگاه به‌عنوانِ یافتهٔ واقعی.
 * ⚠️ ۳۶.۵: تأییدِ کاربر ۱۴۰۵/۰۶/۳۱؛ عدد از استخراجِ Gemini از هنری فصل ۳۱ — نه از خودِ کتاب (P52).
 *    قاعدهٔ سه‌تایی (Hb×۳ ≈ Hct ± ۳) عمداً ماشه نیست: در کمبودِ آهن و تالاسمی به‌حق می‌شکند.
 * - هر دو Hb و Hct باید سنجیده شده باشند: نبودنِ یکی «ناهماهنگی» نیست (اصل II).
 * - اسفروسیتوز مالکِ MCHCِ خودش است؛ بحرانِ کم‌خونی هم — «شاید خطای نمونه باشد» کنارِ «فوراً به
 *   اورژانس» بیمار را به نادیده‌گرفتنِ اورژانس دعوت می‌کند (تصمیمِ plan، R5).
 */
const MCHC_ARTEFACT_GDL = 36.5;

function indicesImplausible(e) {
  const mchc = e.graded.find((g) => g.test === "MCHC");
  const hgb = e.graded.find((g) => g.test === "HGB");
  const hct = e.graded.find((g) => g.test === "HCT");
  // 🔴 بازبینیِ پزشکی B1: Hbِ پایین مستقیم سنجیده می‌شود و آگلوتینینِ سرد پایینش نمی‌آورد (چربی حتی بالا می‌برد) —
  //    پس کم‌خونی واقعی است و قاعده‌های کم‌خونی مالکِ برگه‌اند. «نتیجه‌ای دربارهٔ کم‌خونی گرفته نمی‌شود … نوبتِ عادی»
  //    کنارِ «این هفته»ِ آن‌ها دو خوانش و دو زمان‌بندی بود (M182d).
  // ⚠️ استثنا (تصمیمِ کاربر ۱۴۰۵/۰۷/۰۱، P52 پرسش ۱): زیرِ بحرانِ Hb یادداشت *می‌آید*، با متنی که می‌گوید دستورِ
  //    اورژانس عوض نمی‌شود و اقدامش به همان دستور واگذار است (M183). بازوی Hct این‌جا نمی‌رسد — Hb باید سنجیده باشد.
  const hgbLow = hgb?.abnormal && hgb.dir === "low";
  const underHgbCrisis = crisisArm(e) === "hgb";
  return !!(mchc?.abnormal && mchc.dir === "high" && Number(mchc.value) > MCHC_ARTEFACT_GDL &&
    hgb && hct && (underHgbCrisis || !hgbLow) && !spherocytosisFires(e));
}

export const RULES_HEMATOLOGY = [
  {
    id: "dic_pattern",
    match: (e) => isDIC(e),
    build: (e) => {
      const t = val(e);
      const d = e.graded.find((g) => g.test === "DDIMER");
      // فقط شاخص‌هایی را نام ببر که واقعاً غیرطبیعی‌اند (چون تریگرِ ISTH ممکن است
      // بدون پایین بودنِ فیبرینوژن هم فعال شود).
      const parts = [];
      if (t.PLT != null && t.PLT < 100) parts.push("پلاکت پایین");
      if (t.PT != null && t.PT > 15) parts.push("طولانی شدن زمان انعقاد (PT)");
      if (t.FIB != null && t.FIB < 150) parts.push("فیبرینوژن پایین");
      if (d?.abnormal && d.dir === "high") parts.push("D-dimer بالا");
      return {
        pattern: "possible_DIC",
        urgency: "emergency",
        headline: "چند شاخص لخته شدن خون همزمان غیرطبیعی است",
        must_say:
          `${parts.join("، ")} با هم می‌توانند نشانهٔ یک اختلال جدی انعقاد باشند که همزمان لخته و خونریزی ایجاد می‌کند. این ترکیب نیاز به بررسی فوری دارد.`,
        action: "همین امروز به اورژانس مراجعه کنید.",
        suggest: [],
        blocks_others: true,
      };
    },
  },
  // دی‌دایمرِ بالای تنها — وقتی تصویر DIC نباشد. باینری است و هیچ الگویی
  // برنمی‌داشتش، پس «خوانده می‌شد ولی تفسیر نداشت». D-dimer غیراختصاصی است:
  // فوریت this_week با لحن اطمینان‌بخش + هشدارِ علائم لخته.
  {
    id: "d_dimer_elevated",
    match: (e) => {
      const d = e.graded.find((g) => g.test === "DDIMER");
      if (!(d?.abnormal && d.dir === "high")) return false;
      return !isDIC(e);   // اگر DIC فعال است، آن الگوی اورژانسی پوشش می‌دهد
    },
    build: (e) => {
      const d = e.graded.find((g) => g.test === "DDIMER");

      // ── کات‌آفِ سن‌تعدیل‌شده (هنری فصل ۱۹) ──
      //
      // ⚠️ این جمله عمداً *داخلِ* همین یافته نشست و قاعدهٔ جدا نشد. نسخهٔ اولش
      //    یک قاعدهٔ مستقلِ routine بود و روی D-dimer=۷۰۰ در سن ۷۸ اندازه‌گیری
      //    شد: هر دو با هم فعال می‌شدند و بیمار یک «این هفته به پزشک» و یک
      //    «برای سن شما زیر حد است، عادی» را کنارِ هم می‌خواند. تناقضِ دو یافته،
      //    همان چیزی است که N20 دربارهٔ دو *فیلدِ* یک یافته می‌گوید — و راهِ
      //    حلش هم همان است: یک تصمیم، یک جا.
      // ⚠️ و فوریت عمداً دست‌نخورده ماند. کات‌آفِ سن‌تعدیل‌شده در متنِ منبع
      //    مخصوصِ *رد کردنِ آمبولیِ ریه در بیمارِ کم‌احتمال* است، نه یک بازهٔ
      //    مرجعِ عمومی؛ D-dimerِ بالا معناهای دیگری هم دارد. پس این عدد به متن
      //    اضافه می‌شود تا بیمار سیاقش را بداند، و فوریت را پایین نمی‌آورد.
      const age = e.age;
      let ageLine = "";
      let ageSourced = false;
      if (age != null && age >= 50) {
        const adj = 10 * age;   // «۵۰۰ در زیر ۵۰ سال و ده برابرِ سن در مسن‌ترها»
        ageSourced = true;
        ageLine = d.value <= adj
          ? `نکتهٔ مهم دربارهٔ سن: سطحِ زمینه‌ایِ D-dimer با بالا رفتنِ سن به‌طور طبیعی زیاد می‌شود، و روشِ پیشنهادشده این است که در افرادِ بالای ۵۰ سال حد را «ده برابرِ سن» بگیرند — برای شما ${adj}. عددِ شما زیرِ این حدِ تعدیل‌شده است، یعنی برای سنِ شما افزایشِ چشمگیری نیست. `
          : `این را هم بدانید: حتی با حدِ تعدیل‌شده بر اساسِ سن (ده برابرِ سن، یعنی ${adj} برای شما) عددِ شما بالاتر است. `;
      }

      return {
        pattern: "d_dimer_elevated",
        urgency: "this_week",
        // حتی وقتی یک یافتهٔ اورژانسیِ دیگر (blocks_others) فعال است، دی‌دایمر
        // نباید کاملاً پنهان شود — زیر اورژانس نسخهٔ کوتاه (brief) نمایش داده می‌شود.
        always_show: true,
        headline: "شاخص D-dimer خون شما بالاتر از حد طبیعی است",
        must_say:
          `مقدار D-dimer شما ${d.value} است (حد طبیعی ${d.range}). ` +
          "D-dimer وقتی بالا می‌رود که در بدن لخته‌ای ساخته و سپس تجزیه شده باشد. " +
          "اما این شاخص «غیراختصاصی» است و به دلایل بی‌خطر بسیاری هم بالا می‌رود — مانند بارداری، سن بالا، التهاب یا عفونت، و جراحی یا آسیب اخیر. " +
          "بنابراین D-dimer بالا به‌تنهایی به معنای وجود لختهٔ خطرناک نیست و باید در کنار علائم شما و نظر پزشک تفسیر شود. ارزش اصلی این تست وقتی است که نتیجه‌اش طبیعی باشد و لخته را کنار بگذارد. " +
          ageLine,
        // نسخهٔ کوتاه برای وقتی زیر یک اورژانسِ مهم‌تر نمایش داده می‌شود.
        brief:
          `شاخص D-dimer شما هم بالاتر از حد طبیعی است (${d.value}، حد طبیعی ${d.range}). ` +
          "این یک شاخص غیراختصاصی است و باید در کنار موارد فوریِ بالا توسط پزشک بررسی شود.",
        action: "این هفته با پزشک مطرح کنید تا در کنار شرح‌حال شما بررسی شود.",
        suggest: ["بررسی توسط پزشک برای تفسیر در کنار علائم بالینی"],
        warnings: [
          "اگر همین حالا نشانه‌های احتمالِ لخته دارید — تورم، درد یا قرمزیِ یک‌طرفهٔ ساق پا، یا تنگی نفس ناگهانی، درد قفسهٔ سینه و سرفهٔ خونی — منتظر نمانید و فوراً به اورژانس مراجعه کنید.",
          // ⚠️ این جمله مکملِ ضروریِ ageLine است و بدونِ آن، جملهٔ «زیرِ حدِ
          //    تعدیل‌شدهٔ سنِ شماست» شبیهِ «لخته ندارید» خوانده می‌شود. متنِ
          //    منبع صریح است: اگر احتمالِ پیش‌آزمون متوسط یا بالا باشد،
          //    تصویربرداری به‌هرحال باید انجام شود و D-dimer اصلاً مفید نیست.
          "این آزمایش فقط وقتی چیزی را «رد» می‌کند که پزشک از قبل احتمالِ لخته را کم برآورد کرده باشد؛ اگر آن احتمال متوسط یا بالا باشد، تصمیم با تصویربرداری گرفته می‌شود نه با این عدد.",
        ],
        // منبع فقط وقتی ضمیمه می‌شود که واقعاً عددی از آن در متن آمده باشد —
        // یعنی شاخهٔ سنی. برای بیمارِ زیرِ ۵۰ سال هیچ عددی از این فصل استفاده
        // نشده و برچسب‌زدنش یعنی ادعای منبعی که خوانده نشده.
        ...(ageSourced ? { sources: ["HENRY_CARDIAC"] } : {}),
      };
    },
  },

  // ═══════════ لکوسیتوز شدید — پرچم قرمز ═══════════
  // 🔴 این قاعده نبود و WBC=258 «طبیعی» گزارش شد.
  {
    id: "extreme_leukocytosis",
    match: (e) => {
      const w = e.graded.find((g) => g.test === "WBC");
      return w?.abnormal && w.dir === "high" && w.value >= 50;
    },
    build: (e) => {
      const w = e.graded.find((g) => g.test === "WBC");
      return {
        pattern: "extreme_leukocytosis",
        urgency: "emergency",
        headline: "تعداد گلبول‌های سفید خون شما بسیار بالاست",
        must_say:
          `گلبول سفید ${w.value} است — چندین برابر حد بالای طبیعی (${w.range}). ` +
          "این عدد نیاز به بررسی فوری توسط پزشک دارد." +
          (e.diffFailed
            ? " دستگاه نتوانست انواع گلبول سفید را بشمارد — این خودش نشانه‌ی همان مشکل است و لام دستی لازم دارد."
            : ""),
        action: "همین امروز به پزشک یا اورژانس مراجعه کنید. این برگه را همراه ببرید.",
        suggest: [],
        warnings: [],
        blocks_others: true,
      };
    },
  },
  {
    id: "leukocytosis",
    match: (e) => {
      const w = e.graded.find((g) => g.test === "WBC");
      return w?.abnormal && w.dir === "high" && w.value < 50 && !leukCytopeniaOwns(e);
    },
    build: (e) => {
      const w = e.graded.find((g) => g.test === "WBC");
      const marked = w.value >= 20;
      return {
        pattern: "leukocytosis",
        urgency: marked ? "this_week" : "routine",
        headline: "تعداد گلبول‌های سفید خون شما بالاتر از حد طبیعی است",
        must_say:
          `گلبول سفید شما ${w.value} است (حد طبیعی ${w.range}). ` +
          "گلبول سفید بالا اغلب پاسخ بدن به عفونت یا التهاب است؛ استرس، ورزش شدید یا برخی داروها (مثل کورتون) هم موقتاً آن را بالا می‌برند. " +
          (marked
            ? "این افزایش قابل‌توجه است و بهتر است زودتر بررسی شود."
            : "یک آزمایش به‌تنهایی علت را مشخص نمی‌کند؛ روند آن در تکرار مهم‌تر است."),
        action: marked ? "این هفته با پزشک وقت بگیرید." : "نوبت عادی با پزشک.",
        suggest: ["CRP", "تکرار CBC"],
        warnings: [],
      };
    },
  },
  {
    id: "leukopenia",
    match: (e) => {
      const w = e.graded.find((g) => g.test === "WBC");
      return w?.abnormal && w.dir === "low";
    },
    build: (e) => {
      const w = e.graded.find((g) => g.test === "WBC");
      const severe = w.value < 2;
      // job c138671c (D2): «پس از عفونتِ ویروسی» و «بررسیِ مغزِ استخوان» جملهٔ بزرگسال است؛ برای نوزاد (زیرِ ۲۸ روز، WHO)
      //   متن از همبستگیِ بالینی، تکرارِ CBC و علائمِ خطرِ عفونتِ نوزادی حرف می‌زند. فوریت دست نخورده است.
      const neo = isNeonate(e.age) && !severe;
      // D1: وقتی نوتروفیل غایب است، «شمارش افتراقی» مالِ neutrophil_count_missing است (همان استنتاج)، نه جملهٔ عمومیِ اینجا.
      const diffOwned = e.ungraded?.NEUT_ABS?.reason === "diff_incomplete";
      if (neo) return {
        pattern: "leukopenia",
        urgency: "this_week",
        headline: "تعداد گلبول‌های سفیدِ نوزاد کمتر از بازهٔ این سن است",
        must_say:
          `گلبول سفید ${w.value} است (بازهٔ مرجعِ نوزادی برای سنِ ${ageFa(e.age)}: ${w.range}). ` +
          "در نوزاد، معنای این عدد به ساعتِ تولد، سنِ بارداری و حالِ بالینیِ نوزاد بستگی دارد و باید پزشکِ نوزاد آن را کنارِ معاینه ببیند. " +
          "معمولاً اولین قدم تکرارِ CBC است، و اگر نوزاد علامتی دارد، پزشک بررسیِ عفونتِ نوزادی را در نظر می‌گیرد." +
          neutLowClause(e),
        // P57 پرسش ۵: فوریتِ «امروز» را applyNeonatalFloor در runPatterns می‌گذارد؛ جمله از همان‌جا می‌آید (N20).
        action: NEONATAL_TODAY_ACTION,
        suggest: diffOwned ? ["تکرار CBC"] : ["تکرار CBC", "شمارش افتراقی"],
        warnings: [NEONATAL_DANGER_WARNING],
      };
      return {
        pattern: "leukopenia",
        urgency: severe ? "emergency" : "this_week",
        headline: "تعداد گلبول‌های سفید خون شما کم است",
        must_say: severe
          ? `گلبول سفید شما ${w.value} است — خیلی کم (حد طبیعی ${w.range}). توان بدن برای مقابله با عفونت کاهش یافته و همین باعث اهمیت فوری آن است.`
          : `گلبول سفید شما ${w.value} است (حد طبیعی ${w.range}). ` +
            "گلبول سفید دفاع بدن در برابر عفونت است؛ کم بودن خفیف آن می‌تواند موقت باشد (مثلاً پس از یک عفونت ویروسی یا با برخی داروها) یا نیاز به بررسی مغز استخوان داشته باشد. تکرار آزمایش معمولاً اولین قدم است." +
            neutLowClause(e),
        action: severe
          ? "همین امروز با پزشک تماس بگیرید. اگر تب دارید، فوراً به اورژانس بروید."
          : "این هفته با پزشک وقت بگیرید.",
        suggest: diffOwned ? ["تکرار CBC"] : ["تکرار CBC", "شمارش افتراقی"],
        warnings: severe ? ["اگر تب کردید، منتظر نمانید — همان ساعت به اورژانس بروید."] : [],
        blocks_others: severe,
      };
    },
  },
  {
    id: "severe_neutropenia",
    match: (e) => {
      const n = e.graded.find((g) => g.test === "NEUT_ABS");
      return n?.abnormal && n.dir === "low" && n.value < 500;
    },
    build: () => ({
      pattern: "severe_neutropenia",
      urgency: "emergency",
      headline: "یکی از انواع گلبول سفید بسیار کم است",
      must_say:
        "نوتروفیل — سلولی که با عفونت باکتریایی مقابله می‌کند — بسیار کم است. " +
        "این وضعیت نیاز به رسیدگی فوری دارد.",
      action: "همین امروز به پزشک مراجعه کنید. اگر تب دارید، به اورژانس بروید.",
      suggest: [],
      warnings: ["از تماس با افراد بیمار و مکان‌های شلوغ پرهیز کنید تا پزشک را ببینید."],
      blocks_others: true,
    }),
  },
  // ─── برگهٔ واقعی ۲۰۲۶-۰۹-۲۴: نوتروفیلِ پایین با گلبول سفیدِ طبیعی هیچ قاعده‌ای نداشت (N1) ───
  // NEUT 1697 (حد 1800) به «توضیح داده نشدند» رفت. زیرِ ۵۰۰ مالِ severe_neutropenia است؛ با WBCِ پایین مالِ leukopenia.
  // فوریت از درجه‌های CTCAE v5 برای شمارشِ نوتروفیل (G1: تا ۱۵۰۰، G2: ۱۰۰۰–۱۵۰۰، G3: ۵۰۰–۱۰۰۰) — عددِ تازه‌ای نیست.
  {
    id: "mild_neutropenia",
    match: (e) => {
      const n = e.graded.find((g) => g.test === "NEUT_ABS");
      return !!(n?.abnormal && n.dir === "low" && n.value >= 500) && !wbcLowGraded(e);
    },
    build: (e) => {
      const n = e.graded.find((g) => g.test === "NEUT_ABS");
      const deg = n.value < 1000 ? "متوسط" : "خفیف";
      const urgency = n.value < 1500 ? "this_week" : "routine";
      return {
        pattern: "mild_neutropenia",
        urgency,
        headline: "نوتروفیل‌های خون شما کمی کم است",
        must_say:
          `نوتروفیل شما ${n.value} است (حد طبیعی ${n.range}) — کاهشِ ${deg}. ` +
          "نوتروفیل بخشی از گلبول‌های سفید است که با عفونت‌های باکتریایی مقابله می‌کند؛ تعدادِ کلِ گلبول‌های سفیدِ شما طبیعی است. " +
          (urgency === "routine"
            ? "کاهش در این حد خطرِ عفونت را چندان بالا نمی‌برد. "
            : "") +
          "این کاهش اغلب موقتی است — مثلاً پس از یک عفونت ویروسی یا با برخی داروها — و در بعضی افراد هم به‌طورِ ارثی و بی‌خطر همیشه کمی پایین‌تر از میانگین است. " +
          "تکرارِ آزمایش پس از چند هفته نشان می‌دهد این کاهش پایدار است یا نه.",
        action: actionFor(urgency, {
          week: "این هفته با پزشک وقت بگیرید و این برگه و فهرستِ داروهایتان را همراه ببرید.",
          routine: "در نوبتِ عادی با پزشک مطرح کنید و فهرستِ داروهایتان را همراه ببرید.",
        }),
        // شمارشِ افتراقی نه: این قاعده فقط وقتی فعال است که نوتروفیلِ مطلق روی برگه هست (N8).
        suggest: ["تکرار CBC"],
        warnings: urgency === "this_week"
          ? ["اگر تب کردید (۳۸ درجه یا بیشتر)، منتظر نوبت نمانید و همان روز به پزشک یا اورژانس مراجعه کنید."]
          : [],
      };
    },
  },
  // ─── job c138671c (D1): نوتروفیلِ غایب با دیفِ ناقص ───
  // سقف و فوریت در adapter.js حساب می‌شوند (e.ungraded.NEUT_ABS، reason = "diff_incomplete"): سقف = WBC منهای بقیهٔ
  // شمارش‌های مطلق، فوریت = کفِ همان چیزی که موتور به نوتروفیلی برابرِ سقف می‌دهد. عددِ تازه‌ای نیست.
  // لنفوسیت اینجا سه‌حالته نام برده می‌شود (M156)؛ برای نوزاد این یافته مالکِ آن است و viral_lymphocytosis کنار می‌رود.
  {
    id: "neutrophil_count_missing",
    match: (e) => e.ungraded?.NEUT_ABS?.reason === "diff_incomplete",
    build: (e) => {
      const u = e.ungraded.NEUT_ABS;
      const neo = isNeonate(e.age);
      const urgency = u.urgency === "emergency" ? "emergency" : u.urgency === "routine" || u.urgency === "none" ? "routine" : "this_week";
      const ly = e.graded.find((g) => g.test === "LYMPH_ABS");
      const lyFa = !ly ? ""
        : ly.abnormal && ly.dir === "high" ? ` لنفوسیت ${ly.value} است و از بازهٔ این سن (${ly.range}) بالاتر است.`
        : ly.abnormal && ly.dir === "low" ? ` لنفوسیت ${ly.value} است و از بازهٔ این سن (${ly.range}) پایین‌تر است.`
        : ` لنفوسیت ${ly.value} است و در بازهٔ این سن (${ly.range}) قرار دارد.`;
      const doc = neo ? "پزشکِ نوزاد (متخصصِ کودکان)" : "پزشک";
      return {
        pattern: "neutrophil_count_missing",
        urgency,
        headline: u.below ? "شمارشِ نوتروفیل در دست نیست و عددهای برگه نشان می‌دهند کم است" : "شمارشِ نوتروفیل در دست نیست",
        must_say: neutMissingText(e) + lyFa + wbcHighDiffClause(e),
        action: urgency === "emergency"
          ? `همین امروز با ${doc} تماس بگیرید. اگر ${neo ? "نوزاد تب دارد" : "تب دارید"}، فوراً به اورژانس بروید.`
          : urgency === "this_week"
            ? (neo ? NEONATAL_TODAY_ACTION : "این هفته با پزشک وقت بگیرید.")
            : neo ? NEONATAL_TODAY_ACTION : `در نوبتِ عادی با ${doc} مطرح کنید.`,
        // D1: پیشنهاد به همین استنتاج گره خورده — نه «شمارش افتراقی»ِ عمومیِ leukopenia (که با diffOwned کنار می‌رود).
        suggest: [wbcHighGraded(e) ? MANUAL_DIFF_BLAST_SUGGEST : "شمارش افتراقی (عدد نوتروفیل)"],
        warnings: neo ? [NEONATAL_DANGER_WARNING] : [],
        blocks_others: urgency === "emergency",
        // منبع فقط وقتی ردیفِ به‌کاررفته واقعاً RCPCH است (بزرگسال: هنری).
        ...(u.refSource === "RCPCH 2016" ? { sources: ["RCPCH"] } : {}),
      };
    },
  },
  // ─── job c138671c (D4–D6، D8): چرا بعضی شاخص‌های گلبول قرمزِ نوزاد/شیرخوار سنجیده نشدند ───
  // مالکِ ungradedهای neonatal_no_range (RBC، RDW) و neonatal_derived (MCH) — explains ⇒ بیرون از خطِ «تفسیر نشدند».
  // دستوری نمی‌دهد و فوریتی نمی‌سازد؛ فقط می‌گوید سنجش با بازهٔ سنی انجام شد و چه چیزی عمداً سنجیده نشد.
  {
    id: "neonatal_reference_context",
    match: (e) => inNeonatalRedCellPeriod(e.age) &&
      Object.values(e.ungraded ?? {}).some((u) => u.reason === "neonatal_no_range" || u.reason === "neonatal_derived"),
    build: (e) => ({
      pattern: "neonatal_reference_context",
      urgency: "routine",
      headline: isNeonate(e.age) ? "شمارشِ خونِ نوزاد با بازه‌های مرجعِ این سن سنجیده شد" : "شمارشِ خونِ شیرخوار با بازه‌های مرجعِ این سن سنجیده شد",
      must_say: neonatalContextText(e),
      // بی‌دستور: این یافته فقط توضیح است؛ دستورِ مراجعه مالِ یافته‌های دیگر است (N20: یک تصمیم، یک جا).
      action: "",
      suggest: [],
      warnings: [],
      explains: Object.entries(e.ungraded)
        .filter(([, u]) => u.reason === "neonatal_no_range" || u.reason === "neonatal_derived")
        .map(([k]) => k),
    }),
  },
  // ─── P57 پرسش ۳: MCH با MCV × MCHC ÷ ۱۰۰ بیش از ۱۰٪ نمی‌خواند ⇒ پرچمِ فنی (adapter.js، reason = indices_inconsistent) ───
  // یافتهٔ فنی است نه بالینی: فوریت ندارد، کفِ نوزادی نمی‌گیرد، و MCH از قضاوت بیرون است (تصمیم‌ها بر پایهٔ MCV و Hb).
  {
    id: "rbc_indices_inconsistent",
    match: (e) => e.ungraded?.MCH?.reason === "indices_inconsistent",
    build: (e) => ({
      pattern: "rbc_indices_inconsistent",
      urgency: "routine",
      technical: true,
      headline: "یکی از شاخص‌های گلبول قرمزِ این برگه با بقیه جور درنمی‌آید",
      must_say: indicesInconsistentText(e),
      action: "از آزمایشگاه بخواهید شاخص‌های گلبول قرمزِ این برگه (MCV، MCH، MCHC) را بازبینی کند.",
      suggest: [],
      warnings: [],
      explains: ["MCH"],
    }),
  },
  // ─── P57 پرسش ۶: شاخص‌های پلاکتی فقط کنارِ پلاکت/MPVِ غیرطبیعی، بی‌حکم و بی‌فوریت ───
  {
    id: "platelet_indices_context",
    match: (e) => Object.values(e.ungraded ?? {}).some((u) => u.reason === "platelet_index") && plateletAbnormal(e),
    build: (e) => ({
      pattern: "platelet_indices_context",
      urgency: "routine",
      headline: "شاخص‌های پلاکتی — فقط به‌عنوانِ شاهدِ کمکی",
      must_say: plateletIndicesText(e),
      // بی‌دستور: دستور مالِ یافتهٔ پلاکت/MPV است (N20).
      action: "",
      suggest: [],
      warnings: [],
    }),
  },
  {
    id: "severe_thrombocytopenia",
    match: (e) => {
      const p = e.graded.find((g) => g.test === "PLT");
      return p?.abnormal && p.dir === "low" && p.value < 50;
    },
    build: (e) => {
      const p = e.graded.find((g) => g.test === "PLT");
      return {
        pattern: "severe_thrombocytopenia",
        urgency: "emergency",
        headline: "پلاکت خون شما بسیار کم است",
        must_say:
          `پلاکت ${p.value} است. پلاکت سلولی است که جلوی خونریزی را می‌گیرد.`,
        action: "همین امروز به پزشک یا اورژانس مراجعه کنید.",
        suggest: [],
        warnings: [
          "آسپرین یا مسکن‌های ضدالتهاب مصرف نکنید.",
          "اگر خونریزی، کبودی بی‌دلیل یا نقطه‌های قرمز روی پوست دیدید، فوراً به اورژانس بروید.",
        ],
        blocks_others: true,
      };
    },
  },
  {
    id: "thrombocytopenia",
    match: (e) => {
      const p = e.graded.find((g) => g.test === "PLT");
      return p?.abnormal && p.dir === "low" && p.value >= 50;
    },
    build: (e) => {
      const p = e.graded.find((g) => g.test === "PLT");
      return {
        pattern: "thrombocytopenia",
        urgency: "this_week",
        headline: "پلاکت خون شما کمتر از حد طبیعی است",
        must_say:
          `پلاکت شما ${p.value} است (حد طبیعی ${p.range}). ` +
          "پلاکت‌ها جلوی خونریزی را می‌گیرند. کاهش خفیف اغلب علت موقتی دارد (عفونت ویروسی، برخی داروها) و باید فقط پیگیری شود؛ خطر خونریزی معمولاً وقتی جدی می‌شود که پلاکت خیلی پایین‌تر بیاید.",
        action: "این هفته با پزشک وقت بگیرید.",
        suggest: ["تکرار CBC"],
        warnings: ["اگر خونریزی یا کبودی بی‌دلیل دیدید، زودتر مراجعه کنید."],
      };
    },
  },
  {
    id: "thrombocytosis",
    match: (e) => {
      const p = e.graded.find((g) => g.test === "PLT");
      return p?.abnormal && p.dir === "high";
    },
    build: (e) => {
      const p = e.graded.find((g) => g.test === "PLT");
      return {
        pattern: "thrombocytosis",
        urgency: "routine",
        headline: "پلاکت خون شما بالاتر از حد طبیعی است",
        must_say:
          `پلاکت شما ${p.value} است (حد طبیعی ${p.range}). ` +
          "پلاکت بالا در بیشتر موارد یک واکنش موقت بدن است — به التهاب، عفونت، کمبود آهن، یا پس از خونریزی (به این حالت «واکنشی» می‌گویند). کمتر پیش می‌آید که از خود مغز استخوان باشد. تکرار آزمایش و بررسی آهن معمولاً تصویر را روشن می‌کند.",
        action: "نوبت عادی با پزشک.",
        suggest: ["CRP", "فریتین", "تکرار CBC"],
        warnings: [],
      };
    },
  },
  {
    id: "pancytopenia",
    match: (e) => {
      const t = val(e);
      const hgb = e.graded.find((g) => g.test === "HGB");
      return (
        hgb?.abnormal && hgb.dir === "low" &&
        t.WBC != null && t.WBC < 4 &&
        t.PLT != null && t.PLT < 150
      );
    },
    // 🔴 برگهٔ واقعی (۲۰۲۶-۰۹-۲۴، Hb 10.1، WBC 3.5، PLT 31): متن هیچ عددی نداشت — «هر سه پایین هستند» — و با
    //    blocks_others یافته‌های کم‌خونی و گلبول سفید پنهان شدند، پس Hb 10.1 و نوتروفیلِ 1380 هیچ‌جا گفته نشد و
    //    هیچ آزمایشِ علت‌یابی پیشنهاد نشد (suggest خالی). حالا سه عدد، نوتروفیل (هر جهت — M156) و آزمایش‌های نخست
    //    این‌جاست؛ کمبودِ B12/فولات علتِ درمان‌پذیرِ افتِ هر سه رده است (تأییدِ کاربر ۲۰۲۶-۰۹-۲۴).
    build: (e) => {
      const g = (k) => e.graded.find((x) => x.test === k);
      const hgb = g("HGB"), wbc = g("WBC"), plt = g("PLT"), neut = g("NEUT_ABS");
      const num = (x, fa) => (x ? `${fa} ${x.value} (حد طبیعی ${x.range})` : fa);
      const neutClause = !neut?.abnormal ? ""
        : neut.dir === "low"
          ? ` نوتروفیل ${neut.value} (حد طبیعی ${neut.range}) هم پایین است؛ نوتروفیل‌ها سلول‌های اصلیِ دفاع در برابرِ عفونت‌های باکتریایی‌اند.`
          : ` نوتروفیل ${neut.value} بالاتر از حد طبیعی (${neut.range}) است؛ پزشک آن را کنارِ همین تصویر می‌سنجد.`;
      return {
        pattern: "pancytopenia",
        urgency: "emergency",
        headline: "هر سه نوع سلول خونی کمتر از حد طبیعی هستند",
        must_say:
          `${num(hgb, "هموگلوبین")}، ${num(wbc, "گلبول سفید")} و ${num(plt, "پلاکت")} — هر سه پایین هستند.` + neutClause + lymphClauseInPancytopenia(e) + " " +
          "وقتی هر سه ردهٔ سلولی با هم افت می‌کنند، معمولاً مشکل از خودِ مغز استخوان (کارخانهٔ ساخت سلول‌های خونی) یا تخریب گستردهٔ آن‌هاست و نیاز به بررسی فوری دارد. " +
          "یکی از علت‌های درمان‌پذیرِ آن کمبودِ ویتامین B12 یا فولات است؛ لام خون محیطی، رتیکولوسیت، B12، فولات و فریتین آزمایش‌های نخستِ علت‌یابی‌اند.",
        action: actionUnlessAnemiaCrisis(e, "همین امروز با پزشک تماس بگیرید."),
        suggest: ["لام خون محیطی", "رتیکولوسیت", "ویتامین B12", "فولات", "فریتین"],
        warnings: [],
        blocks_others: true,
      };
    },
  },

  // ═══════════ تالاسمی مینور — بدون کم‌خونی ═══════════
  // 🔴 باگ بالینی: قاعده microcytic_anemia فقط وقتی Hb پایین باشد
  //    فعال می‌شد. ولی تالاسمی مینور اغلب Hb نرمال دارد —
  //    بدن با ساختن گلبول بیشتر (RBC بالا) جبران می‌کند.
  //
  //    نمونه واقعی: RBC 7.13↑ | MCV 67.3↓ | MCH 22.2↓ | HGB 15.8 (نرمال)
  //    Mentzer = 9.4 → کلاسیک‌ترین تالاسمی مینور. موتور هیچ نگفت.
  {
    id: "thal_trait_no_anemia",
    // ⚠️ specs/008: hba2_elevated همین match را صدا می‌زند (thalOwnerFires پایینِ فایل). شرط عمداً درون‌خط
    //    می‌ماند: RULE_READS کلیدهای خوانده‌شده را از *متنِ منبعِ* match برمی‌دارد، و انتقالش به کمکی
    //    MCV/RBC/HGB را از پوشش می‌انداخت (unexplained_abnormal روی پنل‌های تالاسمی — سنجیده شد).
    // 🔴 P53 پرسش ۱۶ (تصمیمِ کاربر ۲۰۲۶-۰۹-۲۴): زیرِ ۱۶ سال MCV و RBC با بازهٔ سنیِ PED_REFS (dir) سنجیده می‌شوند، نه
    //    ۸۰ و ۵.۵ِ بزرگسال — کودکِ ۳ سالهٔ سالم (MCV 75، بازه ۷۰–۸۶) «ویژگیِ ارثی» می‌خواند (همان شکلِ R2-B1).
    // 🔴 همان تصمیم، N4: «هموگلوبین شما طبیعی است» فقط با Hbِ نمره‌دارِ *در محدوده*. پیش‌تر !anemic برای Hbِ غایب هم
    //    درست بود و برگهٔ بی‌Hb «کم‌خونی ندارید» می‌گرفت؛ آن حالت حالا مالِ microcytosis_no_anemia (پرسش ۱۳) است.
    match: (e) => {
      const t = val(e);
      const hgb = e.graded.find((g) => g.test === "HGB");
      const inRange = !!hgb && !hgb.abnormal;
      const mcv = e.graded.find((g) => g.test === "MCV");
      const rbc = e.graded.find((g) => g.test === "RBC");
      const ped = isPedAge(e);
      const small = ped ? !!(mcv?.abnormal && mcv.dir === "low") : t.MCV != null && t.MCV < 80;
      const rbcHigh = ped ? !!(rbc?.abnormal && rbc.dir === "high") : t.RBC != null && t.RBC > 5.5;
      // میکروسیتوز + Hbِ در محدوده + RBC بالا یا Mentzer پایین
      return inRange && small && (rbcHigh || (e.indices.mentzer != null && e.indices.mentzer < 13));
    },
    build: (e) => {
      const mi = e.indices.mentzer;
      // specs/008: الکتروفورز روی همین برگه است ⇒ دوباره خواسته نمی‌شود (N8)، و جملهٔ HbA2 همین‌جا می‌آید.
      const a2 = hba2Measured(e);
      // P53 پرسش ۱۶: فریتینِ روی برگه دوباره خواسته نمی‌شود و جمله‌اش گفته می‌شود (N8، N21).
      const fc = ferritinMicroClause(e, "FERRITIN"); // کلید در متنِ منبع می‌ماند تا RULE_READS آن را «خوانده‌شده» بشمارد
      return {
        pattern: "thal_trait_likely",
        urgency: "routine",
        headline: "گلبول‌های قرمز شما کوچک هستند ولی تعدادشان زیاد است",
        must_say:
          "هموگلوبین شما طبیعی است، پس کم‌خونی ندارید. " +
          "ولی گلبول‌ها کوچک‌ترند و تعدادشان بیشتر از حد معمول است. " +
          "این الگو معمولاً به یک ویژگی ارثی اشاره دارد که از پدر یا مادر به ارث می‌رسد " +
          "و خودش معمولاً بی‌خطر است. کمبود آهن هم می‌تواند شبیهش باشد، " +
          "ولی این الگو بیشتر به حالت ارثی می‌خورد." +
          (mi != null ? ` (شاخص Mentzer = ${mi})` : "") +
          (fc ? ` ${fc.text}.` + (["low", "masked"].includes(fc.state) ? " کمبودِ آهن و این ویژگیِ ارثی می‌توانند هم‌زمان باشند." : "") : "") +
          hba2Clause(e, { owner: true }),
        action: a2
          ? (fc ? "نوبت عادی با پزشک. نتیجهٔ همین برگه را همراه ببرید." : "نوبت عادی با پزشک. نتیجهٔ الکتروفورزِ همین برگه را همراه ببرید و آزمایش فریتین را مطرح کنید.")
          : (fc ? "نوبت عادی با پزشک. آزمایش الکتروفورز هموگلوبین را مطرح کنید." : "نوبت عادی با پزشک. آزمایش الکتروفورز هموگلوبین و فریتین را مطرح کنید."),
        suggest: [...(a2 ? [] : ["الکتروفورز هموگلوبین"]), ...(fc ? [] : ["فریتین"])],
        warnings: [
          "بدون تجویز پزشک قرص آهن نخورید. اگر علت آهن نباشد، آهن اضافی به بدن آسیب می‌زند.",
          "⚠️ اگر قصد بچه‌دار شدن دارید، این نتیجه مهم است — حتماً با پزشک و همسرتان مطرح کنید. " +
            "اگر هر دو والد این ویژگی را داشته باشند، فرزند ممکن است شکل شدید بیماری را بگیرد.",
        ],
      };
    },
  },
  {
    // ═══ specs/008، بازبینیِ پزشکی B1 — گلبولِ کوچک بدونِ کم‌خونی ═══
    // حدِ پایینِ Hb پایین آمد (۱۴→۱۳.۷ و …)، پس «Hb 13.5، MCV 72» در مردِ ۶۵ ساله دیگر microcytic_anemia نمی‌گیرد و
    // با «برای این ترکیب توضیح آماده‌ای نداریم» می‌ماند — درست گروهی که علت‌یابیِ کمبودِ آهن (خونریزیِ پنهانِ گوارشی)
    // برایش مهم‌تر است. شکافِ پیش‌موجود هم بود (Hb 15، MCV 72، RBC 5.2 روی 9deba20). این قاعده صاحبِ «MCV <۸۰ بی‌کم‌خونی»
    // است وقتی thal_trait_no_anemia (RBC بالا یا منتزر <۱۳) فعال نیست. سه‌حالته روی Hb (N4). روتین — P53 بندِ ۱۰.
    id: "microcytosis_no_anemia",
    // 🔴 بازبینیِ دور ۲ (R2-B1): زیرِ ۱۶ سال MCVِ ۷۵ در ۳ سالگی طبیعی است (بازهٔ سنیِ PED_REFS) — ۸۰ِ تختِ بزرگسال
    //    کودکِ سالم را «گلبول کوچک، کمبودِ آهن یا تالاسمی» می‌خواند. زیرِ ۱۶ همان dir (مثلِ ferritinBelowIdCut).
    // 🔴 R2-B2: فریتینِ پایینِ چاپ‌شده ⇒ iron_deficiency_panel مالک است (یک فریتین، یک یافته — N20)؛ فریتینِ غیرِپایین
    //    ⇒ جملهٔ خودش و دیگر «فریتین بخواهید» نه (N8/N21).
    match: (e) => {
      const t = val(e);
      const hgb = e.graded.find((g) => g.test === "HGB");
      // 🔴 دور ۲ (CR2/CR3): فقط Hbِ نمره‌دارِ *در محدوده*. Hbِ بالا با «کم‌خونی ندارید» پوشش‌داده و بی‌توضیح می‌شد؛
      //    Hbِ غایب یا بی‌واحد کنارِ بحرانِ هماتوکریت «هموگلوبین روی برگه نیست» می‌گفت. آن حالت‌ها مثلِ 9deba20 به تور می‌روند.
      const inRange = !!hgb && !hgb.abnormal;
      // P53 پرسش ۱۳ (تصمیمِ کاربر ۲۰۲۶-۰۹-۲۴): Hb روی برگه *اصلاً* نیست ⇒ جملهٔ جداگانه. نه Hbِ بی‌واحد یا جنس‌نامعلوم
      //   (ungraded/noRef — چاپ شده، N4)، و نه زیرِ بحرانِ هماتوکریت (CR3: «Hb روی برگه نیست» کنارِ «فوراً به اورژانس»).
      const hbAbsent = !hgb && !e.ungraded?.HGB && !e.noRef?.includes("HGB") && !anemiaCrisisOwns(e);
      const mcv = e.graded.find((g) => g.test === "MCV");
      const small = isPedAge(e) ? !!(mcv?.abnormal && mcv.dir === "low") : t.MCV != null && t.MCV < 80;
      return (inRange || hbAbsent) && small && !ruleFiresById(e, "thal_trait_no_anemia") && !ruleFiresById(e, "iron_deficiency_panel");
    },
    build: (e) => {
      const t = val(e);
      const hgb = e.graded.find((g) => g.test === "HGB");
      const mcv = e.graded.find((g) => g.test === "MCV");
      const adultRisk = e.age != null && e.age >= 16 && (e.sex === "M" || e.age >= 50);
      const a2 = hba2Measured(e);
      // match تضمین می‌کند اینجا فریتین یا نیست یا زیرِ آستانه نیست (وگرنه iron_deficiency_panel مالک است).
      // 🔴 P53 پرسش ۱۴: مرزِ «کم‌احتمال‌تر» ۴۵ (با التهاب ۱۰۰) — ferritinMicroClause؛ پیش‌تر سقفِ بازه (۳۰۰/۱۵۰).
      //    خواندنِ FERRITIN آن را در هر جهتی پوشش‌داده می‌کند (M156) — هر حالت جملهٔ خودش را دارد.
      const fc = ferritinMicroClause(e, "FERRITIN"); // کلید در متنِ منبع می‌ماند تا RULE_READS آن را «خوانده‌شده» بشمارد
      const mi = e.indices.mentzer;
      const hbSentence = hgb
        ? `هموگلوبین شما ${hgb.value} است (حد طبیعی ${hgb.range}) و پایین نیست، پس کم‌خونی ندارید. `
        : "هموگلوبین روی این برگه نیست، پس از روی همین برگه نمی‌شود گفت کم‌خونی دارید یا نه — هموگلوبین مهم‌ترین عددِ غایبِ این نتیجه است. " +
          (mi != null && mi < 13 ? `شاخصِ محاسباتیِ منتزر (حدود ${mi}) زیرِ ۱۳ است که بیشتر به سمتِ صفتِ تالاسمی می‌خورد، ولی این فقط یک احتمال است. ` : "");
      const giBleed = " در مردان و در زنانِ بالای ۵۰ سال، اگر کمبودِ آهن تأیید شود، باید علتش — به‌ویژه خونریزیِ پنهانِ گوارشی — بررسی شود.";
      return {
        pattern: "microcytosis_no_anemia",
        urgency: "routine",
        headline: hgb ? "گلبول‌های قرمز شما کوچک‌تر از حد معمول‌اند" : "گلبول‌های قرمز شما کوچک‌اند و هموگلوبین روی برگه نیست",
        must_say:
          `اندازهٔ متوسط گلبول‌ها (MCV) ${t.MCV} است که کوچک‌تر از حد طبیعی${mcv?.range ? ` (${mcv.range})` : ""} است. ` +
          hbSentence +
          (fc
            ? `${fc.text}؛ علتِ شایعِ دیگرِ گلبولِ کوچک یک ویژگیِ ارثیِ خون (صفتِ تالاسمی) است.` +
              (adultRisk && ["neutral", "masked"].includes(fc.state) ? giBleed : "")
            : "دو علتِ شایعِ گلبولِ کوچک، کمبودِ آهن (که گاهی پیش از کم‌خونی دیده می‌شود) و یک ویژگیِ ارثیِ خون (صفتِ تالاسمی) است؛ " +
              "فریتین این دو را از هم جدا می‌کند." + (adultRisk ? giBleed : "")) +
          hba2Clause(e, { owner: true }),
        action: [
          "در نوبت عادی با پزشک مطرح کنید",
          ...(hgb ? [] : ["شمارشِ کاملِ خون (با هموگلوبین) هم سنجیده شود"]),
          ...(fc ? [] : ["آزمایش فریتین را بخواهید"]),
        ].join(" و ") + ".",
        suggest: [...(hgb ? [] : ["شمارش خون (CBC)"]), ...(fc ? [] : ["فریتین"]), ...(a2 ? [] : ["الکتروفورز هموگلوبین"])],
        warnings: ["بدون تجویز پزشک قرص آهن نخورید. اگر علت آهن نباشد، آهن اضافی به بدن آسیب می‌زند.", ...carrierWarnings(e)],
      };
    },
  },
  {
    // ═══ specs/008 (clarify) — HbA2ِ بالا وقتی هیچ مالکِ تالاسمی فعال نیست ═══
    // برگهٔ «فقط الکتروفورز» MCV و RBC ندارد، پس thal_trait_no_anemia و microcytic_anemia فعال نمی‌شوند و HbA2ِ
    // ۵.۲ به خطِ «توضیح آماده‌ای نداریم» می‌رفت — درست روی برگه‌ای که HbA2 نتیجهٔ اصلی‌اش است. اینجا فقط وقتی
    // مالکی فعال نیست؛ وگرنه همان جمله در یافتهٔ مالک است. یک برگه، یک یافته دربارهٔ HbA2 (N20، M186g).
    // روتین است و هرگز فوریتِ برگه را بالا نمی‌برد: ناقل بودن تشخیص یا اورژانس نیست.
    id: "hba2_elevated",
    // پوشش: متنِ یافته «هموگلوبین A2» را نام می‌برد، پس HBA2 به خطِ «توضیح داده نشدند» نمی‌رود.
    match: (e) => hba2State(e) != null && !thalOwnerFires(e),
    build: (e) => {
      const st = hba2State(e);
      return {
        pattern: "hba2_elevated",
        urgency: "routine",
        headline: st === "trait"
          ? "هموگلوبین A2 شما بالاست — معمولاً نشانهٔ ناقل بودنِ تالاسمیِ بتا"
          : st === "very_high"
            ? "هموگلوبین A2 شما خیلی بالاست — نتیجهٔ کاملِ الکتروفورز باید دیده شود"
            : "هموگلوبین A2 شما کمی بالاتر از حد طبیعی است",
        must_say: hba2Clause(e).trim() +
          // 🔴 بازبینیِ پزشکی، یادداشت ۲: در کم‌خونیِ مگالوبلاستیک (B12/فولات) HbA2 کمی بالا می‌رود.
          (val(e).MCV > macroMcvCut(e)
            ? " گلبول‌های شما درشت‌اند (MCV بالا)؛ در کمبودِ B12 یا فولات HbA2 می‌تواند کمی بالا برود، پس این عدد باید پس از روشن‌شدنِ آن تفسیر شود."
            : "") +
          " این یک تشخیص نیست؛ برای تفسیرِ درست، پزشک باید آن را کنارِ شمارشِ کاملِ خون (CBC) و فریتین ببیند.",
        action: "در نوبت عادی با پزشک مطرح کنید و نتیجهٔ همین آزمایش را همراه ببرید.",
        suggest: ["شمارش خون (CBC)", "فریتین"],
        warnings: carrierWarnings(e),
      };
    },
  },
  {
    // ═══ P53 پرسش ۱۲ (تصمیمِ کاربر ۲۰۲۶-۰۹-۲۴) — HbA2ِ پایینِ تنها ═══
    // پیش‌تر وقتی هیچ مالکِ تالاسمی فعال نبود فقط «توضیح داده نشدند» می‌گرفت. جمله همان شاخهٔ «پایین»ِ hba2Clause است
    // که یافته‌های مالک هم می‌گویند (یک متن، نه دو). روتین.
    id: "hba2_low",
    match: (e) => {
      const g = e.graded.find((x) => x.test === "HBA2");
      return !!(g?.abnormal && g.dir === "low") && !thalOwnerFires(e);
    },
    build: (e) => ({
      pattern: "hba2_low",
      urgency: "routine",
      headline: "هموگلوبین A2 شما کمتر از حد طبیعی است",
      must_say: hba2Clause(e, { owner: true }).trim() +
        " این یک تشخیص نیست؛ پزشک باید آن را کنارِ شمارشِ کاملِ خون (CBC) و فریتین ببیند.",
      action: "در نوبت عادی با پزشک مطرح کنید و نتیجهٔ همین آزمایش را همراه ببرید.",
      suggest: ["شمارش خون (CBC)", "فریتین"],
      warnings: [],
    }),
  },
  {
    // ═══ P53 پرسش ۶ (تصمیمِ کاربر ۲۰۲۶-۰۹-۲۴) — HbFِ بالا ═══
    // از ۱ سالگی با ۰–۲٪ سنجیده می‌شود (adapter.js؛ تا ۱ سالگی به زیرِ ۲٪ می‌رسد). پیش‌تر HbFِ بزرگسالِ بالای ۲٪ فقط
    // «توضیح داده نشدند» می‌گرفت (پرسش ۱۱ بندِ ۲). فهرستِ علت‌ها بی‌حکم است؛ روتین.
    id: "hbf_elevated",
    match: (e) => {
      const g = e.graded.find((x) => x.test === "HBF");
      return !!(g?.abnormal && g.dir === "high");
    },
    build: (e) => {
      const g = e.graded.find((x) => x.test === "HBF");
      return {
        pattern: "hbf_elevated",
        urgency: "routine",
        headline: "هموگلوبین جنینی (HbF) شما بالاتر از حد طبیعی است",
        must_say:
          `هموگلوبین جنینی (HbF) شما ${g.value}٪ است که بالاتر از حد طبیعی (${g.range}) است. ` +
          "HbFِ بالا بعد از یک‌سالگی در چند حالت دیده می‌شود: یک ویژگیِ ارثیِ معمولاً بی‌خطر (تداومِ ارثیِ هموگلوبینِ جنینی)، " +
          "برخی انواعِ صفتِ تالاسمیِ بتا، بیماریِ داسی‌شکل، بارداری، و گاهی بیماری‌های مغزِ استخوان. " +
          "این عدد به‌تنهایی تشخیص نیست و پزشک باید آن را کنارِ شمارشِ کاملِ خون و بقیهٔ نتیجهٔ الکتروفورز ببیند.",
        action: "در نوبت عادی با پزشک مطرح کنید و نتیجهٔ کاملِ الکتروفورز را همراه ببرید.",
        suggest: ["شمارش خون (CBC)"],
        warnings: [],
      };
    },
  },
  {
    // ═══ P53 پرسش ۶ (تصمیمِ کاربر ۲۰۲۶-۰۹-۲۴) — HbS/HbC/HbE: صفت یا بیماری ═══
    // مرزها در patterns_utils.js hbVariantState (ASH 2021، BSH 2023). پیش‌تر بی‌بازه و «تفسیر نشدند» — و صفتِ داسیِ ۳۵٪
    // هشدارِ ناقل بودن نمی‌گرفت (پرسش ۱۶). explains ⇒ از خطِ «تفسیر نشدند» بیرون می‌روند.
    // صفت: روتین + هشدارِ ناقل بودن. بیماریِ احتمالی: این هفته، با متخصصِ خون.
    id: "hb_variant",
    match: (e) => hbVariantState(e) != null,
    build: (e) => {
      const st = hbVariantState(e);
      const list = st.variants.map((x) => `${HB_VARIANT_FA[x.key]} ${x.value}٪`).join(" و ");
      const hbaFa = st.hba == null ? "هموگلوبین A روی این برگه نیست" : `هموگلوبین A شما ${st.hba}٪ است`;
      const transfusion = " اگر در سه ماهِ اخیر خون دریافت کرده‌اید به پزشک بگویید، چون این درصدها را عوض می‌کند.";
      const explains = ["HBS", "HBC", "HBE", "HBA"].filter((k) => e.ungraded?.[k] != null);
      if (st.state === "trait") {
        return {
          pattern: "hb_variant_trait",
          urgency: "routine",
          headline: "در الکتروفورزِ شما یک هموگلوبینِ ارثیِ دیگر دیده می‌شود — الگوی ناقل بودن",
          must_say:
            `در نتیجهٔ الکتروفورزِ شما ${list} است و ${hbaFa}. ` +
            "این الگو معمولاً با «صفت» می‌خواند، یعنی ناقل بودن و نه بیماری؛ ناقل‌ها معمولاً مشکلی ندارند. " +
            "پزشک باید نتیجه را کنارِ شمارشِ کاملِ خون ببیند." + transfusion,
          action: "در نوبت عادی با پزشک مطرح کنید و نتیجهٔ همین آزمایش را همراه ببرید.",
          suggest: ["شمارش خون (CBC)"],
          warnings: [HBA2_CARRIER_WARNING],
          explains,
        };
      }
      const sickle = st.variants.some((x) => x.key === "HBS");
      return {
        pattern: "hb_variant_disease",
        urgency: "this_week",
        headline: "الگوی الکتروفورزِ شما فقط «ناقل بودن» نیست و باید با متخصصِ خون بررسی شود",
        must_say:
          `در نتیجهٔ الکتروفورزِ شما ${list} است و ${hbaFa}. ` +
          "وقتی سهمِ این هموگلوبین‌ها نصف یا بیشتر است، از هموگلوبین A بیشتر است، یا دو نوعِ آن با هم دیده می‌شوند، " +
          "الگو با ناقل بودنِ ساده نمی‌خواند و می‌تواند یک بیماریِ ارثیِ هموگلوبین باشد (مثلاً کم‌خونیِ داسی‌شکل، بیماریِ HbSC، " +
          "یا ترکیب با تالاسمی). تشخیصِ قطعی با متخصصِ خون است." + transfusion,
        action: "این هفته با پزشک، ترجیحاً متخصصِ خون، وقت بگیرید و نتیجهٔ کاملِ الکتروفورز را همراه ببرید.",
        suggest: ["شمارش خون (CBC)"],
        warnings: [
          HBA2_CARRIER_WARNING,
          ...(sickle ? ["اگر تبِ بالا، دردِ شدید، تنگی نفس یا دردِ قفسهٔ سینه دارید، همان روز به اورژانس مراجعه کنید."] : []),
        ],
        explains,
      };
    },
  },
  {
    // ═══ P53 پرسش ۴ (تصمیمِ کاربر ۲۰۲۶-۰۹-۲۴) — ZPPِ بالای ۱۰۰ µmol/mol ═══
    // فقط با واحدِ چاپ‌شدهٔ µmol/mol (zppState). ≤۱۰۰ بی‌حکم می‌ماند («تفسیر نشدند»): عددی جز ۱۰۰ تأیید نشده.
    // سرب: در ایران تریاکِ آلوده به سرب علتِ شناخته‌شدهٔ مسمومیت است.
    id: "zpp_high",
    match: (e) => zppState(e) === "high",
    build: (e) => {
      const z = e.ungraded.ZPP;
      return {
        pattern: "zpp_high",
        urgency: "this_week",
        headline: "روی‌پروتوپورفیرین (ZPP) شما بالاست",
        must_say:
          `ZPPِ شما ${z.value} ${z.unit} است و از ${ZPP_HIGH_ABOVE} بالاتر است؛ یعنی مغزِ استخوان برای ساختِ هموگلوبین آهنِ کافی ` +
          "در دسترس نداشته است. شایع‌ترین علتش کمبودِ آهن است؛ مسمومیت با سرب و التهابِ مزمن هم آن را بالا می‌برند.",
        action: "این هفته با پزشک مطرح کنید؛ اگر در معرضِ سرب هستید (مثلاً کار با باتری یا رنگ، یا مصرفِ تریاک)، حتماً بگویید.",
        suggest: ["فریتین"],
        warnings: ["بدون تجویز پزشک قرص آهن نخورید. اگر علت آهن نباشد، آهن اضافی به بدن آسیب می‌زند."],
        explains: ["ZPP"],
      };
    },
  },
  {
    // ═══ P53 پرسش ۴ — نسبتِ sTfR/log فریتینِ ≤۲ ═══
    // نسبتِ >۲ را iron_deficiency_panel می‌گوید (یک یافته دربارهٔ کمبودِ آهن، N20)؛ این قاعده فقط وقتی حرف می‌زند که آن
    // فعال نیست. فقط با sTfR به mg/L و فریتینِ نمره‌دار (stfrIndex).
    id: "stfr_index",
    match: (e) => stfrIndex(e) != null && !ruleFiresById(e, "iron_deficiency_panel"),
    build: (e) => {
      const ix = stfrIndex(e);
      return {
        pattern: "stfr_index",
        urgency: "routine",
        headline: "شاخصِ گیرندهٔ محلولِ ترانسفرین به سمتِ کمبودِ آهن نیست",
        must_say:
          `نسبتِ گیرندهٔ محلولِ ترانسفرین به لگاریتمِ فریتین (sTfR ${ix.stfr} تقسیم بر لگاریتمِ فریتینِ ${ix.ferritin}) حدود ${ix.value} است ` +
          `و از ${STFR_INDEX_ID_ABOVE} بالاتر نیست؛ پس این شاخص به‌تنهایی کمبودِ آهن را نشان نمی‌دهد. ` +
          "مرزِ این شاخص به کیتِ آزمایشگاه بستگی دارد و پزشک آن را کنارِ فریتین و شمارشِ خون می‌سنجد.",
        action: "در نوبت عادی با پزشک مطرح کنید.",
        suggest: [],
        warnings: [],
        explains: ["STFR"],
      };
    },
  },
  {
    // ═══ P53 پرسش ۱۱ بندِ ۳ (تصمیمِ کاربر ۲۰۲۶-۰۹-۲۴) — Hbِ جنس‌نامعلوم بینِ دو ردیف ═══
    // adapter.js عددی را که برای یک جنس طبیعی و برای دیگری غیرطبیعی است سنجیده نمی‌کند (ungraded، reason sex_unknown).
    // پیش‌تر ردیفِ زن (۱۲.۰) اعمال می‌شد و مردِ Hb 12.5 «طبیعی» می‌خواند. روتین — عدد در هیچ ردیفی بحرانی نیست.
    id: "hgb_sex_unknown",
    match: (e) => e.ungraded?.HGB?.reason === "hgb_sex_unknown",
    build: (e) => {
      const h = e.ungraded.HGB;
      const low = h.side === "low";
      return {
        pattern: "hgb_sex_unknown",
        urgency: "routine",
        headline: "جنسیت روی برگه نیست و تفسیرِ هموگلوبین به آن بستگی دارد",
        must_say:
          `هموگلوبین شما ${h.value} است. جنسیت روی این برگه مشخص نیست و حدِ طبیعیِ هموگلوبین برای زن و مرد فرق دارد ` +
          `(زن ${h.female}، مرد ${h.male})؛ این عدد ${low ? "برای زن طبیعی ولی برای مرد پایین" : "برای مرد طبیعی ولی برای زن بالا"} است. ` +
          (low
            ? "اگر مرد هستید، این مقدار کم‌خونیِ خفیف حساب می‌شود و علتش باید با پزشک بررسی شود."
            : "اگر زن هستید، این مقدار بالاتر از حد طبیعی است و باید با پزشک بررسی شود."),
        action: "در نوبت عادی با پزشک مطرح کنید؛ اگر جنسیت را در فرم وارد کنید، تفسیر دقیق‌تر می‌شود.",
        suggest: [],
        warnings: [],
        explains: ["HGB"],
      };
    },
  },
  {
    id: "erythrocytosis",
    match: (e) => {
      const t = val(e);
      const rbc = e.graded.find((g) => g.test === "RBC");
      const hgb = e.graded.find((g) => g.test === "HGB");
      // RBC بالا + MCV نرمال یا بالا + Hb بالا → پلی‌سیتمی، نه تالاسمی
      return (
        rbc?.abnormal && rbc.dir === "high" &&
        t.MCV != null && t.MCV >= 80 &&
        hgb?.abnormal && hgb.dir === "high"
      );
    },
    build: (e) => {
      const hgb = e.graded.find((g) => g.test === "HGB");
      return {
        pattern: "erythrocytosis",
        urgency: "this_week",
        headline: "تعداد گلبول‌های قرمز و هموگلوبین شما بالاست",
        must_say:
          (hgb ? `هموگلوبین شما ${hgb.value} است (حد طبیعی ${hgb.range})؛ ` : "") +
          "یعنی خون غلیظ‌تر از حد معمول است. علت‌های شایع: کم‌آبی (که موقت است)، سیگار، آپنهٔ خواب، یا زندگی در ارتفاع. کمتر پیش می‌آید که از یک اختلال مغز استخوان (پلی‌سیتمی) باشد.",
        action: "این هفته با پزشک وقت بگیرید. اگر کم‌آب هستید، آزمایش پس از آب‌رسانی کافی تکرار شود.",
        suggest: ["تکرار CBC", "اریتروپویتین", "اشباع اکسیژن خون"],
        warnings: ["اگر سردرد شدید، تاری دید، یا درد و تورم یک‌طرفهٔ ساق پا دارید، زودتر مراجعه کنید — خون غلیظ خطر لخته را کمی بالا می‌برد."],
      };
    },
  },
  {
    // P53 پرسش ۵ (تصمیمِ کاربر): آستانهٔ غربالگریِ WHO برای پلی‌سیتمیِ ورا (Hb > ۱۶.۵ مرد / ۱۶.۰ زن) — نه
    // بازهٔ مرجعِ refs.js (۱۳.۷–۱۷.۵ مرد)، چون آن پاسخِ «برای بزرگسالِ عادی غیرمعمول است؟» را می‌دهد، این پاسخِ
    // «باید پلی‌سیتمیِ ورا بررسی شود؟» را (N23 — یک عدد دو کار نمی‌کند). برگهٔ واقعیِ ۱۴۰۵/۰۷/۰۳ (job 656ed637):
    // Hb=17.0 مرد، داخلِ بازهٔ موتور، بالای آستانهٔ WHO — بی‌این قاعده به unmatched_abnormal می‌رفت.
    id: "erythrocytosis_who_screen",
    match: (e) => {
      const hgb = e.graded.find((g) => g.test === "HGB");
      if (hgb?.value == null || !e.sex) return false;
      const who = e.sex === "M" ? 16.5 : 16.0;
      if (hgb.value < who) return false;
      // erythrocytosisِ خودش (بالای بازهٔ موتور + RBC بالا + MCV≥80) فوریت و متنِ خودش را دارد؛
      // هم‌پوشانیِ دو یافته روی یک هموگلوبین ممنوع است (N20) — واگذاری از رویِ matchِ زنده‌اش، نه کپیِ آستانه.
      return !RULES_HEMATOLOGY.some((x) => x.id === "erythrocytosis" && x.match(e));
    },
    build: (e) => {
      const hgb = e.graded.find((g) => g.test === "HGB");
      const rbc = e.graded.find((g) => g.test === "RBC");
      const hct = e.graded.find((g) => g.test === "HCT");
      const who = e.sex === "M" ? 16.5 : 16.0;
      // M156: هر دو جهتِ RBC باید جمله داشته باشد، وگرنه این قاعده RBC را در هر جهتی «پوشش‌داده» می‌شمارد
      // (RULE_READS متن‌کاو است، نه شرط‌آگاه) و گلبولِ قرمزِ پایینِ کنارِ هموگلوبینِ بالا بی‌صدا گم می‌شود.
      const extra = [
        rbc?.abnormal && rbc.dir === "high" ? `تعداد گلبول قرمز هم ${rbc.value} است (حد طبیعی ${rbc.range}).`
          : rbc?.abnormal && rbc.dir === "low" ? `با این‌حال تعداد گلبول قرمز ${rbc.value} است (حد طبیعی ${rbc.range}) که پایین‌تر از حد طبیعی است؛ پزشک این ترکیب را جداگانه بررسی می‌کند.`
          : null,
        hct != null ? `هماتوکریت ${hct.value}٪ است (حد طبیعی ${hct.range}).` : null,
      ].filter(Boolean).join(" ");
      // بازبینیِ همکار: hgb می‌تواند بالای بازهٔ خودِ موتور هم باشد — در زن چون سقفِ آزمایشگاه (۱۵.۳) زیرِ
      // آستانهٔ WHO (۱۶.۰) است، و در مرد چون erythrocytosis (RBC بالا + MCV≥80) شرطِ سخت‌گیرانه‌تری دارد و
      // فقط نبودنِ آن است که این قاعده را نوبت می‌دهد، نه اینکه Hb حتماً داخلِ بازه باشد. ادعای «داخلِ محدوده»
      // وقتی hgb.abnormal است غلط می‌بود (N12/N23 — یک عدد را با فرضِ یک جهت نخوان).
      const inRange = !hgb.abnormal;
      return {
        pattern: "erythrocytosis_who_screen",
        urgency: inRange ? "routine" : "this_week",
        headline: inRange
          ? "هموگلوبین شما داخل محدودهٔ آزمایشگاه ولی نزدیک سقف آن است"
          : "هموگلوبین شما بالاتر از حد طبیعی است",
        must_say:
          (inRange
            ? `هموگلوبین شما ${hgb.value} است (حد طبیعی ${hgb.range}) — داخل محدودهٔ آزمایشگاه، ولی بالاتر از آستانهٔ `
            : `هموگلوبین شما ${hgb.value} است که از حد طبیعی (${hgb.range}) هم بالاتر است، و همچنین بالاتر از آستانهٔ `) +
          `${who} که سازمان جهانی بهداشت برای غربالگری پرخونی مغز استخوان (پلی‌سیتمی ورا) به کار می‌برد. ` + extra +
          " علت‌های شایع‌تر: کم‌آبی، سیگار، آپنهٔ خواب، یا زندگی در ارتفاع؛ کمتر پیش می‌آید از یک اختلال مغز استخوان باشد.",
        action: inRange
          ? "در نوبت عادی با پزشک مطرح کنید. اگر کم‌آب هستید، آزمایش پس از آب‌رسانی کافی تکرار شود."
          : "این هفته با پزشک وقت بگیرید. اگر کم‌آب هستید، آزمایش پس از آب‌رسانی کافی تکرار شود.",
        suggest: ["تکرار CBC", "اریتروپویتین"],
        warnings: [],
        explains: ["HGB"],
      };
    },
  },

  // ═══════════ کم‌خونی ═══════════
  // پورت‌شده از patterns_anemia.js — فایلی مرده که هیچ‌کس import نمی‌کرد و
  // در ba144a7 حذف شد. بدونِ هیچ تغییری منتقل شد: آستانه، متنِ فارسی،
  // key_number و کامنتِ داخلی عیناً همان‌اند.
  // ⚠️ آستانهٔ Hb < 7.0 منبعِ ثبت‌شده ندارد — در MEDICAL_RULES.md به‌عنوان
  //    «منتقل‌شده بدون تغییر، منبع نامعلوم، نیازمند بازبینی» ثبت شد.
  //    کامنتِ «یا زیر ۸.۰ برای بیماران پرخطر» عمداً پیاده نشد.
  {
    id: "severe_anemia_crisis",
    // شرط از patterns_utils خوانده می‌شود، نه اینجا نوشته: قاعده‌هایی که کنار
    // می‌روند باید دقیقاً همین شرط را ببینند، وگرنه دو نسخه از یک تصمیم می‌شود (N20).
    match: (e) => anemiaCrisisOwns(e),
    build: (e) => {
      const base = {
        pattern: "severe_anemia_crisis",
        urgency: "emergency",
        headline: "بحران کم‌خونی شدید (اورژانس پزشکی)",
        action: "فوراً و بدون اتلاف وقت به بخش اورژانس بیمارستان مراجعه کنید (احتمال نیاز فوری به تزریق خون وجود دارد).",
        suggest: ["تزریق خون (Blood Transfusion)", "CBC"],
      };
      // specs/007 (Q2=A): بازوی هماتوکریت — Hb سنجیده نشده و Hct زیرِ Hb۷×۳. همان دستور، همان فوریت؛
      // متن باید بگوید هموگلوبین روی برگه نیست و فوریت *برآورد* شده (N4، N5). گلبول قرمزِ پایین هم اینجا
      // نام برده می‌شود، چون low_rbc_hct_without_anemia زیرِ بحران کنار می‌رود و آن را بی‌صاحب می‌گذاشت (N20).
      if (crisisArm(e) === "hct") {
        const hct = e.graded.find((g) => g.test === "HCT");
        const rbc = e.graded.find((g) => g.test === "RBC");
        const rbcLow = rbc?.abnormal && rbc.dir === "low";
        // N5 (بازبینی N-b): «0.19 L/L» روی برگه چاپ شده، نه «19» — عددِ تبدیل‌شده بی‌عددِ چاپ‌شده ادعای برگه است.
        const conv = (e.unitConversions ?? []).find((c) => c.test === "HCT");
        const printed = conv ? ` — روی برگه ${conv.raw} ${conv.from === "l/l" ? "L/L" : conv.from}` : "";
        return {
          ...base,
          must_say:
            `هماتوکریت شما ${hct.value}٪ است${printed} (حد طبیعی ${hct.range}). هموگلوبین روی این برگه اندازه‌گیری نشده است؛ ` +
            "هماتوکریتِ زیر ۲۱ معمولاً با هموگلوبینِ زیر ۷ همراه است، یعنی کم‌خونیِ بسیار شدیدی که اکسیژن‌رسانی به قلب و مغز را به خطر می‌اندازد. " +
            "این فوریت از هماتوکریت برآورد شده، نه از هموگلوبینِ اندازه‌گیری‌شده." +
            (rbcLow ? ` تعداد گلبول قرمز هم ${rbc.value} است (حد طبیعی ${rbc.range}).` : ""),
          key_number: hct.value,
        };
      }
      const hgb = e.graded.find((g) => g.test === "HGB");
      return {
        ...base,
        must_say: `مقدار هموگلوبین شما ${hgb.value} است که افت بسیار شدیدی را نشان می‌دهد (کمتر از ۷.۰). این میزان از کم‌خونی باعث کاهش شدید اکسیژن‌رسانی به بافت‌های حیاتی از جمله قلب و مغز می‌شود و خطر جانی دارد.`,
        key_number: hgb.value
      };
    }
  },
  {
    id: "macrocytic_anemia",
    match: (e) => macrocyticMatch(e),
    build: (e) => {
      const t = val(e);
      const hgb = e.graded.find((g) => g.test === "HGB");
      const rdwHigh = t.RDW_CV > 15 || t.RDW_SD > 56;
      // بازبینی B1: وقتی ماکروسیتیک مالکِ فولاتِ پایین است، folate_deficiency کنار می‌رود و هشدارِ
      // اسید فولیک با آن — درست در پنلی که اسید فولیک کمبودِ B12 را می‌پوشاند. هشدار اینجا می‌آید.
      const f = e.graded.find((g) => g.test === "FOLATE");
      const folicRisk = !!(f?.abnormal && f.dir === "low") && b12Unsettled(e);
      return {
        pattern: "macrocytic_anemia",
        urgency: "this_week",
        always_show: true,
        brief: macrocyticBrief(e, hgb),
        brief_warnings: ["خودتان مکمل B12 شروع نکنید — اگر قبل از آزمایش مصرف کنید، نتیجه گمراه‌کننده می‌شود."],
        headline: "گلبول‌های قرمز شما کم و بزرگ‌تر از حد معمول هستند",
        must_say:
          (hgb ? `هموگلوبین شما ${hgb.value} است (حد طبیعی ${hgb.range}) و ` : "") +
          `گلبول‌های قرمز بزرگ‌تر از حد معمول‌اند (MCV حدود ${t.MCV}). ` +
          anemiaCompanionsFa(e, true) +
          "این نوع کم‌خونی («ماکروسیتیک») اغلب از کمبود ویتامین B12 یا فولات می‌آید — این ویتامین‌ها برای ساخت درست سلول لازم‌اند و بدون آن‌ها گلبول‌ها بزرگ و ناقص ساخته می‌شوند. " +
          // specs/004، N21: علت‌ها را فهرست کردن بس نیست — عددی که میانشان داوری می‌کند روی همین برگه است.
          `${folateClause(e, CLAUSE_FOR.macro)} ${b12Clause(e, CLAUSE_FOR.macro)} ` +
          (folicRisk && t.B12 == null ? `${FOLIC_CAUTION} ` : "") +
          "کم‌کاری تیروئید هم می‌تواند علت باشد. " +
          (rdwHigh
            ? "تفاوت اندازهٔ گلبول‌ها هم زیاد است (RDW بالا) که سرنخ مهمی است."
            : ""),
        action: actionUnlessAnemiaCrisis(
          e,
          "این هفته با پزشک عمومی یا داخلی وقت بگیرید و این آزمایش‌ها را بخواهید.",
        ),
        // ⚠️ آهن اینجا نیست — مدل قبلاً اشتباهاً پیشنهاد می‌داد
        suggest: ["ویتامین B12", "فولات", "رتیکولوسیت", "TSH"],
        forbid: ["آهن", "فریتین", "iron", "ferritin"],
        warnings: [
          "خودتان مکمل B12 شروع نکنید — اگر قبل از آزمایش مصرف کنید، نتیجه گمراه‌کننده می‌شود.",
          ...(folicRisk ? [FOLIC_WARNING] : []),
        ],
      };
    },
  },
  // ─── specs/004: فولاتِ پایین — تا امروز فقط به «توضیحی نداریم» می‌رسید (N1) ───
  // مالکیت (N20): وقتی macrocytic_anemia فعال است، فولات مالِ آن است و این قاعده کنار می‌رود.
  // شرط از *همان* macrocyticMatch خوانده می‌شود، نه با بازنویسیِ «MCV > 100» — دو شرطِ هم‌معنا
  // یک ویرایش تا دو یافتهٔ متناقض فاصله دارند. آستانه همان بازهٔ refs.js است؛ عددِ تازه‌ای نیست.
  // فوریت همیشه routine (clarify ۲۰۲۶-۰۹-۱۹، P49) — موتور برای فولات درجهٔ CTCAE ندارد.
  {
    id: "folate_deficiency",
    match: (e) => {
      const f = e.graded.find((g) => g.test === "FOLATE");
      return !!(f?.abnormal && f.dir === "low") && !macrocyticMatch(e);
    },
    build: (e) => {
      const f = e.graded.find((g) => g.test === "FOLATE");
      const b12 = val(e).B12;
      // فولاتِ تنها همیشه routine است (clarify Q4). ولی کنارِ B12ِ زیرِ ۱۵۰، overt_b12_deficiency همین
      // B12 را «این هفته» می‌گوید و این یافته هم از همان B12 حرف می‌زند — یک عدد، یک زمان‌بندی
      // (بازبینی B3، N20). فوریت از قاعدهٔ موجود گرفته می‌شود، نه عددِ تازه.
      const urgency = b12 != null && b12 < B12_OVERT_BELOW ? "this_week" : "routine";
      return {
        pattern: "folate_deficiency",
        urgency,
        headline: "فولاتِ خونِ شما پایین است",
        must_say:
          `${folateClause(e, CLAUSE_FOR.own)} ` +
          "فولات یکی از ویتامین‌های گروهِ B است که بدن برای ساختنِ گلبول‌های قرمز و سلول‌های تازه لازم دارد. " +
          b12Clause(e, CLAUSE_FOR.own) +
          (b12 == null ? ` ${FOLIC_CAUTION}` : ""),
        action: actionFor(urgency, {
          week: "همراه با یافتهٔ ویتامین B12، این هفته با پزشک مطرح کنید و پیش از شروعِ هر مکملی این برگه را به پزشک نشان دهید.",
          routine: "در نوبتِ عادی با پزشک مطرح کنید و پیش از شروعِ هر مکملی این برگه را به پزشک نشان دهید.",
        }),
        ...(b12 == null ? { suggest: ["ویتامین B12"] } : {}),
        // زیرِ ۱۵۰ همان هشدار را overt_b12_deficiency (با همان فوریت) می‌دهد؛ بالای ۳۹۹ لازم نیست.
        warnings: b12Unsettled(e) ? [FOLIC_WARNING] : [],
        key_number: f.value,
      };
    },
  },
  {
    id: "anemia_macrocytic_mds",
    match: (e) => {
      const hgb = e.graded.find((g) => g.test === "HGB");
      const isAnemia = hgb?.abnormal && hgb.dir === "low";
      if (!isAnemia) return false;

      const t = val(e);
      const mcvHigh = t.MCV != null && t.MCV > 102;
      
      const plt = e.graded.find((g) => g.test === "PLT");
      const pltLow = plt?.abnormal && plt.dir === "low";

      return mcvHigh && pltLow;
    },
    build: (e) => {
      return {
        pattern: "anemia_macrocytic_mds",
        urgency: "this_week",
        headline: "کم‌خونی ماکروسیتیک و کاهش پلاکت",
        must_say: "حجم گلبول‌های قرمز بزرگتر از حد طبیعی است (بالای ۱۰۲) و تعداد پلاکت‌ها نیز کاهش یافته است. در برخی موارد، این الگو (به‌ویژه در سنین بالاتر) می‌تواند نشان‌دهنده سندرم‌های میلودیسپلاستیک (MDS) باشد.",
        action: "جهت بررسی دقیق‌تر و معاینه بالینی، در اسرع وقت به متخصص خون (هماتولوژیست) مراجعه کنید.",
        suggest: ["گسترش خون محیطی (PBS)", "مشاوره هماتولوژی"],
        warnings: [],
      };
    },
  },
  {
    id: "microcytic_anemia",
    // ⚠️ specs/008: شرط درون‌خط می‌ماند (همان دلیلِ thal_trait_no_anemia — RULE_READS).
    match: (e) => {
      const t = val(e);
      const hgb = e.graded.find((g) => g.test === "HGB");
      return hgb?.abnormal && hgb.dir === "low" && t.MCV < 80;
    },
    build: (e) => {
      const t = val(e);
      const mi = e.indices.mentzer;
      // 🔴 P53 پرسش ۷ (تصمیمِ کاربر ۲۰۲۶-۰۹-۲۴): HbA2ِ بالای ۳.۸ (یا ≥۸، هموگلوبینِ هم‌جا) شاخهٔ منتزر را به سمتِ
      //    تالاسمی برمی‌گرداند — کمبودِ آهن HbA2 را پایین می‌آورد، پس HbA2ِ بالا کنارِ گلبولِ کوچک شاهدِ قوی‌ترِ صفت است
      //    تا منتزرِ ≥۱۳. پیش‌تر شاخه عوض نمی‌شد و «کمبودِ آهن محتمل‌تر» کنارِ «صفتِ بتا» می‌آمد.
      const a2Thal = ["trait", "very_high"].includes(hba2State(e));
      const thal = (mi != null && mi < 13) || a2Thal;
      // specs/008: HbA2 روی برگه ⇒ الکتروفورز دوباره خواسته نمی‌شود (N8).
      const a2 = hba2Measured(e);
      // P53 پرسش ۱۶: فریتینِ روی برگه دوباره خواسته نمی‌شود؛ جمله‌اش با مرزهای پرسش ۱۴ گفته می‌شود (N8، N21).
      const fc = ferritinMicroClause(e, "FERRITIN"); // کلید در متنِ منبع می‌ماند تا RULE_READS آن را «خوانده‌شده» بشمارد
      const mcvG = e.graded.find((g) => g.test === "MCV");
      const hgb = e.graded.find((g) => g.test === "HGB");
      // شدت کم‌خونی به‌سبک WHO: خفیف تا حد ۱۱، متوسط ۸ تا ۱۱، شدید زیر ۸.
      const hb = hgb?.value;
      const sev =
        hb == null ? null : anemiaSeverityFa(e, hb);
      // HCT از نظرِ بالینی همان کاهشِ HGB است، نه یافتهٔ جداگانه — ولی تورِ
      // unexplained_abnormal این را نمی‌داند و فقط توکن‌های داخلِ سورس/متن را
      // می‌شمارد (patterns.js RULE_READS). اگر اینجا اسمش برده نشود، HCT
      // (و به همین دلیل MCH/RDW) با «توضیحِ آماده نداریم» به بیمار برمی‌گردد،
      // درست زیرِ همین جمله‌ای که در واقع توضیحش می‌دهد.
      const hct = e.graded.find((g) => g.test === "HCT");
      const rbc = e.graded.find((g) => g.test === "RBC");
      // فقط RBCِ «پایین» همان افت است؛ RBCِ بالا نشانهٔ شاخهٔ تالاسمی است، نه کم‌خونی.
      const sameDrop = [
        hct?.abnormal && hct.dir === "low" ? `هماتوکریت ${hct.value} (حد طبیعی ${hct.range})` : null,
        rbc?.abnormal && rbc.dir === "low" ? `تعداد گلبول قرمز ${rbc.value} (حد طبیعی ${rbc.range})` : null,
      ].filter(Boolean);
      const mch = e.graded.find((g) => g.test === "MCH");
      // ⚠️ خواندنِ یک کلید در این سورس آن را برای تورِ unexplained_abnormal «پوشش‌داده»
      //    می‌کند، در هر جهتی (M156). پس هر جهتی که این کلیدها می‌توانند بگیرند جمله دارد:
      //    RBCِ بالا و RDWِ پایین (RDW-SD با گلبولِ کوچک به‌طور طبیعی کم می‌شود).
      const rdws = ["RDW_SD", "RDW_CV"].map((k) => e.graded.find((g) => g.test === k)).filter((g) => g?.abnormal);
      const rdwHigh = rdws.some((g) => g.dir === "high");
      const rdwLow = !rdwHigh && rdws.some((g) => g.dir === "low");
      const rbcHigh = rbc?.abnormal && rbc.dir === "high";
      // بزرگیِ کم‌خونی: مقدار هموگلوبین + محدودهٔ طبیعی، و اندازهٔ گلبول (MCV).
      const mag =
        hgb != null
          ? `هموگلوبین شما ${hgb.value} است (حد طبیعی ${hgb.range})${sev ? ` — کم‌خونیِ ${sev}` : ""}` +
            (t.MCV != null ? `، و اندازهٔ متوسط گلبول‌ها (MCV) ${t.MCV} است که کوچک‌تر از حد طبیعی${mcvG?.range ? ` (${mcvG.range})` : ""} است` : "") +
            (sameDrop.length ? `. ${sameDrop.join(" و ")} شما هم پایین است — همان افتِ گلبولِ قرمز است، نه یک مشکلِ جدا` : "") +
            // 🔴 بازبینیِ دور ۲ (R2-B3، N12): جهت از dir، نه از abnormal — MCHِ بالا کوچکی را «تأیید» نمی‌کند.
            (mch?.abnormal && mch.dir === "low" ? ` (MCH هم ${mch.value} است که همین کوچکی را تأیید می‌کند)` : "") +
            (mch?.abnormal && mch.dir === "high" ? `. MCH شما ${mch.value} است که بالاتر از حد طبیعی (${mch.range}) است و با کوچکیِ گلبول‌ها هم‌خوان نیست؛ پزشک باید آن را در کنارِ بقیهٔ نتایج بسنجد` : "") +
            (hct?.abnormal && hct.dir === "high" ? `. هماتوکریت شما ${hct.value} است که بالاتر از حد طبیعی (${hct.range}) است و با هموگلوبینِ پایین هم‌خوان نیست؛ پزشک باید آن را در کنارِ بقیهٔ نتایج بسنجد` : "") +
            (rbcHigh ? `. تعداد گلبول قرمز شما ${rbc.value} است که بالاتر از حد طبیعی (${rbc.range}) است؛ پزشک این را در کنارِ بقیهٔ نتایج می‌سنجد` : "") +
            (rdwHigh ? `. اندازهٔ گلبول‌های قرمزِ شما با هم یکسان نیست (RDW بالا) که با همین کم‌خونی سازگار است` : "") +
            (rdwLow ? `. RDW شما کمی پایین‌تر از حد طبیعی است که به‌تنهایی معنای بالینیِ خاصی ندارد` : "") +
            ". "
          : "";
      // مکانیسم: چرا گلبول‌ها کوچک شده‌اند.
      // آزمایشِ قطعیِ باقی‌مانده: فقط آنچه روی برگه نیست (N8).
      const thalWorkup = [fc ? null : "فریتین", a2 ? null : "الکتروفورز هموگلوبین"].filter(Boolean);
      const ferrSentence = fc
        ? ` ${fc.text}.` + (thal && ["low", "masked"].includes(fc.state) ? " کمبودِ آهن و صفتِ تالاسمی می‌توانند هم‌زمان باشند." : "")
        : "";
      const mechThal =
        "دو علت شایعِ گلبولِ کوچک وجود دارد: کمبود آهن، یا یک ویژگی ارثی خون (صفت تالاسمی) که معمولاً بی‌خطر است. " +
        (mi != null && mi < 13
          ? `یک شاخص محاسباتی (اندکس منتزر حدود ${mi}) در اینجا زیر ۱۳ است که بیشتر به سمت صفت تالاسمی می‌خورد تا کمبود آهن — ولی این فقط یک احتمال است`
          : "نتیجهٔ الکتروفورزِ همین برگه (هموگلوبین A2ِ بالا) بیشتر به سمتِ صفتِ تالاسمی می‌خورد تا کمبودِ آهن" +
            (mi != null ? `، هرچند شاخصِ محاسباتیِ منتزر (حدود ${mi}) بالای ۱۳ است` : "")) +
        (thalWorkup.length ? ` و آزمایش قطعی (${thalWorkup.join(" و ")}) لازم است.` : ".") +
        ferrSentence;
      const mechIda =
        "آهن جزء اصلیِ هموگلوبین است؛ وقتی ذخیرهٔ آهن کم می‌شود، مغز استخوان مجبور می‌شود گلبول‌های کوچک‌تر و کم‌رنگ‌تر بسازد — که همین الگوی آزمایش شماست. " +
        (mi != null
          ? `شاخص محاسباتی منتزر (حدود ${mi}) بالای ۱۳ است که با کمبود آهن سازگارتر است تا صفت تالاسمی. `
          : "") +
        (fc
          ? `${fc.text}.`
          : "برای تأیید، فریتین باید اندازه‌گیری شود (فریتین زیر ۳۰ کمبود آهن را تأیید می‌کند؛ ولی چون فریتین در التهاب بالا می‌رود، مقدار طبیعی هم گاهی کمبود آهن را رد نمی‌کند).");
      return {
        pattern: thal ? "microcytic_thal_likely" : "microcytic_ida_likely",
        urgency: thal ? "routine" : "this_week",
        // زیرِ یک اورژانسِ دیگر (pancytopenia، severe_neutropenia، ...) کاملاً
        // پنهان نشود — آن‌ها دربارهٔ اندازهٔ گلبول و علت‌یابیِ آهن هیچ نمی‌گویند،
        // پس بدونِ این، عددِ Hb/MCV و درخواستِ فریتین از گزارش ناپدید می‌شد.
        always_show: true,
        // 🔴 بازبینیِ دور ۳ (R3-CR1): brief فقط چیزی را می‌گوید که واقعاً می‌گوید — تورِ unexplained_abnormal زیرِ
        //    blocker پوشش را از همین متن می‌سنجد، پس MCH/RBC/RDW و HCTِ بالا به فهرستِ «جداگانه توضیح داده نشدند»
        //    برمی‌گردند. جملهٔ HbA2 و هشدارِ ناقل بودن (brief_warnings) زیرِ اورژانسِ دیگر هم نمی‌افتند.
        //    R3-CR5: «شما … دارید» نه — سبکِ ENGINE_SYSTEM_PROMPT.
        //    فقط جهت‌های هم‌سو (HCT/RBCِ پایین، MCHِ پایین، RDWِ بالا) نام برده می‌شوند؛ جهتِ ناهم‌سو به تور می‌رود.
        brief:
          (hgb != null
            ? `همچنین کم‌خونی دیده می‌شود: هموگلوبین ${hgb.value}` +
              (t.MCV != null ? `، و گلبول‌ها کوچک‌اند (MCV ${t.MCV})` : "") +
              (() => {
                const same = [
                  hct?.abnormal && hct.dir === "low" ? `هماتوکریت ${hct.value}` : null,
                  rbc?.abnormal && rbc.dir === "low" ? `گلبول قرمز ${rbc.value}` : null,
                  mch?.abnormal && mch.dir === "low" ? `MCH ${mch.value}` : null,
                  ...rdws.filter((g) => g.dir === "high").map((g) => `${g.test === "RDW_SD" ? "RDW-SD" : "RDW-CV"} ${g.value}`),
                ].filter(Boolean);
                return same.length ? `؛ ${same.join("، ")} هم بخشی از همین کم‌خونی است` : "";
              })() + ". "
            : "همچنین کم‌خونیِ میکروسیتیک دیده می‌شود. ") +
          (fc ? "علت‌یابیِ آن هم باید در کنار موارد فوریِ بالا با پزشک مطرح شود." : "علت‌یابیِ آن (مثل فریتین) هم باید در کنار موارد فوریِ بالا با پزشک مطرح شود.") +
          hba2Clause(e, { idaBranch: !thal, owner: true }),
        brief_warnings: carrierWarnings(e),
        ...(hb != null ? { key_number: hb } : {}),
        // P53 پرسش ۷: شاخه‌ای که فقط HbA2 برگردانده دربارهٔ تعدادِ گلبول‌ها چیزی نمی‌داند (RBC می‌تواند پایین باشد).
        headline: thal
          ? (mi != null && mi < 13
            ? "گلبول‌های قرمز شما کوچک هستند ولی تعدادشان زیاد است"
            : "گلبول‌های قرمز شما کوچک‌اند و الگو بیشتر به یک ویژگیِ ارثیِ خون می‌خورد")
          : "گلبول‌های قرمز شما کم و کوچک‌تر از حد معمول هستند",
        must_say:
          mag +
          "این یعنی کم‌خونیِ میکروسیتیک (گلبولِ کوچک). " +
          (thal ? mechThal : mechIda) +
          hba2Clause(e, { idaBranch: !thal, owner: true }),
        action: actionUnlessAnemiaCrisis(
          e,
          thal
            ? (thalWorkup.length
              ? `نوبت عادی با پزشک. آزمایش ${thalWorkup.join(" و ")} را مطرح کنید${a2 || fc ? " و نتیجهٔ همین برگه را همراه ببرید" : ""}.`
              : "نوبت عادی با پزشک. نتیجهٔ همین برگه را همراه ببرید.")
            : `${sev === "شدید" ? "چون کم‌خونی شدید است، همین چند روز با پزشک وقت بگیرید" : "این هفته با پزشک وقت بگیرید"}؛ در بزرگسالان، کمبود آهن باید علت‌یابی شود (به‌ویژه منبع خونریزی پنهان گوارشی).`,
        ),
        suggest: thal
          ? thalWorkup
          : [fc ? null : "فریتین", t.IRON != null ? null : "آهن سرم", t.TIBC != null ? null : "TIBC", "بررسی خون مخفی در مدفوع (FOBT)"].filter(Boolean),
        forbid: ["B12", "فولات"],
        warnings: [
          "بدون تجویز پزشک قرص آهن نخورید. اگر علت آهن نباشد، آهن اضافی به بدن آسیب می‌زند.",
          ...(sev === "شدید"
            ? ["اگر تنگی نفس، تپش قلب، یا احساس ضعف و سرگیجهٔ شدید دارید، زودتر به پزشک مراجعه کنید."]
            : []),
          ...(carrierWarnings(e).length
            ? carrierWarnings(e)
            : thal
              ? ["اگر در خانواده‌تان کسی تالاسمی دارد یا قصد بچه‌دار شدن دارید، حتماً به پزشک بگویید."]
              : []),
        ],
      };
    },
  },
  {
    id: "normocytic_anemia",
    match: (e) => {
      const t = val(e);
      const hgb = e.graded.find((g) => g.test === "HGB");
      return hgb?.abnormal && hgb.dir === "low" && t.MCV >= 80 && t.MCV <= macroMcvCut(e);
    },
    build: (e) => {
      // رتیکولوسیت کلید تفکیک کم‌خونیِ کم‌تولید از پرتخریب/خونریزی است.
      const retic = e.graded.find((g) => g.test === "RETIC");
      const reticHigh = retic?.abnormal && retic.dir === "high";
      const reticLow = retic?.abnormal && retic.dir === "low";
      const hgb = e.graded.find((g) => g.test === "HGB");
      const hb = hgb?.value;
      const sev =
        hb == null ? null : anemiaSeverityFa(e, hb);
      const mag =
        hgb != null
          ? `هموگلوبین شما ${hgb.value} است (حد طبیعی ${hgb.range})${sev ? ` — کم‌خونیِ ${sev}` : ""}. `
          : "";
      let extra = "";
      let suggest = ["رتیکولوسیت", "فریتین", "کراتینین", "CRP"];
      if (reticHigh) {
        extra = " شمارش رتیکولوسیت بالاست — یعنی مغز استخوان در حال جبران است؛ این بیشتر به خونریزی یا تجزیهٔ گلبول‌ها (همولیز) می‌خورد.";
        suggest = ["هاپتوگلوبین", "LDH", "بیلی‌روبین مستقیم و غیرمستقیم", "بررسی منبع خونریزی"];
      } else if (reticLow) {
        extra = " شمارش رتیکولوسیت پایین است — یعنی مغز استخوان پاسخ کافی نمی‌دهد؛ علت‌هایی مثل کمبود آهن/ویتامین، کم‌کاری کلیه یا مشکل مغز استخوان مطرح است.";
        suggest = ["فریتین", "ویتامین B12 و فولات", "کراتینین", "بررسی توسط پزشک"];
      }
      // brief در کمکیِ بیرونی است تا کلیدهایش در RULE_READS نیایند (M156) — normocyticBrief بالای فایل.
      const brief = normocyticBrief(e, hgb);
      return {
        pattern: "normocytic_anemia",
        urgency: "this_week",
        always_show: true,
        brief,
        ...(hb != null ? { key_number: hb } : {}),
        headline: "خون شما کم‌خونی نشان می‌دهد",
        must_say:
          mag +
          "گلبول‌ها اندازهٔ طبیعی دارند ولی تعدادشان کم است (کم‌خونیِ نورموسیتیک)." +
          (anemiaCompanionsFa(e, false) ? ` ${anemiaCompanionsFa(e, false).trim()}` : "") + extra +
          " شمارش رتیکولوسیت (گلبول‌های تازه‌ساز) کلید تعیین علت است و برای پیدا کردن ریشهٔ کم‌خونی چند آزمایش دیگر لازم است.",
        action: actionUnlessAnemiaCrisis(
          e,
          sev === "شدید"
            ? "چون کم‌خونی شدید است، همین چند روز با پزشک وقت بگیرید."
            : "نوبت با پزشک بگیرید.",
        ),
        suggest,
        warnings:
          sev === "شدید"
            ? ["اگر تنگی نفس، تپش قلب، یا سرگیجهٔ شدید دارید، زودتر مراجعه کنید."]
            : [],
      };
    },
  },

  {
    // P1 — تا امروز *هر* قاعدهٔ گلبولِ قرمز در این فایل روی
    // `hgb.abnormal && hgb.dir === "low"` گیت شده بود (macrocytic_anemia،
    // microcytic_anemia، normocytic_anemia، anemia_macrocytic_mds،
    // spherocytosis_likely). پس بیماری که RBC و HCT او صراحتاً «پایین» علامت
    // خورده ولی هموگلوبینش پایین نیست، هیچ قاعده‌ای نمی‌گرفت و مستقیم در
    // unmatched_abnormal می‌افتاد: «برای این ترکیب توضیح آماده‌ای نداریم» کنارِ
    // دو عددِ آشکارا غیرطبیعی. همان کلاسِ N1.
    //
    // موردِ واقعی که این را نشان داد: مرد ۷۸ ساله، RBC 3.82↓ و HCT 38.6↓ ولی
    // HGB 12.3 که با GERIATRIC_REFS «طبیعی» است. توجه: RBC و HCT جدولِ
    // سالمندی ندارند و HGB دارد، پس یک نمونهٔ خون همزمان «هموگلوبینِ طبیعی» و
    // «هماتوکریتِ پایین» می‌شود — ریشهٔ این ناهمخوانی P2 در MEDICAL_RULES.md
    // است و تصمیمش با بازبینِ انسانی است، نه با این قاعده.
    //
    // ⚠️ این قاعده عمداً *ادعای کم‌خونی نمی‌کند*. موتور هموگلوبین را پایین
    //    ندانسته؛ نقض‌کردنِ آن از داخلِ یک قاعده همان کاری است که N13 در سمتِ
    //    LLM ممنوع می‌کند. فقط می‌گوید کدام دو شاخص پایین‌اند و راهِ روشن‌شدنش
    //    چیست. اگر روزی بازهٔ سالمندیِ HGB اصلاح شود، این مورد خودش به
    //    قاعده‌های کم‌خونی منتقل می‌شود و اینجا دیگر فعال نمی‌گردد. تست: M47.
    id: "low_rbc_hct_without_anemia",
    match: (e) => {
      const rbc = e.graded.find((g) => g.test === "RBC");
      const hct = e.graded.find((g) => g.test === "HCT");
      const hgb = e.graded.find((g) => g.test === "HGB");
      const rbcLow = rbc?.abnormal && rbc.dir === "low";
      const hctLow = hct?.abnormal && hct.dir === "low";
      // هموگلوبینِ پایین کارِ قاعده‌های کم‌خونی است، نه این یکی.
      const hgbLow = hgb?.abnormal && hgb.dir === "low";
      // specs/007: زیرِ بحرانِ هماتوکریت (Hb سنجیده نشده، Hct < ۲۱) کنار می‌رود — «نمی‌توان گفت کم‌خونی
      // هست یا نه … در نوبت عادی» کنارِ «فوراً به اورژانس» دو دستور است (N20). شرط «آن قاعده فعال است؟»
      // است نه بازنویسیِ آستانه (M91e). بازوی Hb همین حالا هم با !hgbLow بیرون است.
      // specs/007 (FR-008): وقتی MCHC ناممکن است، «کم‌خونی نیست» از همان شاخص‌هایی نتیجه می‌شود که
      // rbc_indices_implausible می‌گوید قابلِ اعتماد نیستند — آن یافته مالکِ RBC/HCT ِ پایین است.
      // 🔴 بازبینیِ پزشکی R2-B1 (N20): Hbِ بی‌واحدی که unit_unknown_values با هر خوانش فوری می‌داند مالکِ کم‌خونیِ برگه
      //    است؛ «نمی‌توان گفت کم‌خونی هست یا نه … نوبت عادی» کنارِ «همین حالا به اورژانس» دو دستور بود (M182f).
      //    Hbِ بی‌واحدِ روتین (۸.۵ mmol/L) رفتارِ امروز را نگه می‌دارد.
      const hgbUrgentUnread = ["emergency", "this_week"].includes(e.ungraded?.HGB?.urgency);
      return (rbcLow || hctLow) && !hgbLow && !anemiaCrisisOwns(e) && !indicesImplausible(e) && !hgbUrgentUnread;
    },
    build: (e) => {
      const rbc = e.graded.find((g) => g.test === "RBC");
      const hct = e.graded.find((g) => g.test === "HCT");
      const hgb = e.graded.find((g) => g.test === "HGB");
      const rbcLow = rbc?.abnormal && rbc.dir === "low";
      const hctLow = hct?.abnormal && hct.dir === "low";

      // فقط شاخصی را نام ببر که واقعاً پایین است — قاعده با «یا» فعال می‌شود.
      const parts = [];
      if (rbcLow) parts.push(`تعداد گلبول‌های قرمز ${rbc.value} است (حد طبیعی ${rbc.range})`);
      if (hctLow) parts.push(`هماتوکریت ${hct.value} است (حد طبیعی ${hct.range})`);

      // N4 — «اندازه‌گیری‌نشده» با «طبیعی» یکی نیست. سه حالت، سه متن.
      // specs/007 (بازبینی B1/B2، N4): Hbِ چاپ‌شده‌ای که واحدش معلوم نشد «اندازه‌گیری‌نشده» نیست — شاخهٔ چهارم.
      const hgbUnread = !hgb && (e.ungraded?.HGB || e.noRef?.includes("HGB"));
      // P53 پرسش ۱۱ بندِ ۳: Hbِ جنس‌نامعلوم واحد دارد؛ جمله‌اش در hgb_sex_unknown است (N4 — «واحد معلوم نبود» غلط است).
      const hgbSexUnknown = !hgb && e.ungraded?.HGB?.reason === "hgb_sex_unknown";
      const hgbFa = hgbSexUnknown
        ? `هموگلوبین شما ${e.ungraded.HGB.value} است؛ چون جنسیت روی برگه مشخص نیست، معلوم نیست این عدد برای شما طبیعی است یا پایین.`
        : hgbUnread
        ? "هموگلوبین روی این برگه چاپ شده، ولی چون واحدش معلوم نبود سنجیده نشد؛ بدون آن نمی‌توان گفت کم‌خونی هست یا نه."
        : !hgb
        ? "هموگلوبین در این برگه اندازه‌گیری نشده است، و بدون آن نمی‌توان گفت کم‌خونی هست یا نه — این مهم‌ترین عددِ غایب در این نتیجه است."
        : hgb.abnormal && hgb.dir === "high"
        ? `در مقابل، هموگلوبین شما ${hgb.value} است که بالاتر از حد طبیعی (${hgb.range}) گزارش شده.`
        : `در مقابل، هموگلوبین شما ${hgb.value} است و داخل محدودهٔ طبیعیِ گزارش‌شده (${hgb.range}) قرار دارد؛ یعنی این نتیجه «کم‌خونی» نیست.`;

      // متنِ سالمندی از P2 در MEDICAL_RULES.md می‌آید: کاهشِ شاخص‌های گلبول
      // قرمز در سالمندی یافتهٔ فیزیولوژیکِ پیری نیست و علت می‌خواهد.
      const elderly =
        e.age != null && e.age >= 75
          ? " در سنین بالای ۷۵ سال این یافته را نباید به‌حسابِ «طبیعیِ سن» گذاشت؛ افتِ شاخص‌های گلبول قرمز در سالمندی بخشی از روند طبیعی پیری نیست و علت‌یابی می‌خواهد."
          : "";

      // P57 (job c138671c، D7): RBCِ نوزاد حالا بازهٔ سنی دارد (۴.۰–۶.۵ در روزِ ۰ تا ۳). فریتین/B12/فولات/کراتینین و
      //   «مکملِ آهن شروع نکنید» توصیهٔ بزرگسال‌اند؛ برای نوزاد: همان جملهٔ Hb، جملهٔ گلبولِ درشت، تکرارِ CBC، پزشکِ نوزاد.
      if (isNeonate(e.age)) return {
        pattern: "low_rbc_hct_without_anemia",
        urgency: "routine",
        ...(rbcLow ? { key_number: rbc.value } : {}),
        headline: "بعضی از شاخص‌های گلبول قرمزِ نوزاد پایین‌تر از بازهٔ این سن است",
        must_say: `${parts.join(" و ")}. ${hgbFa} ${neonatalLowRbcClause(e)}`,
        action: NEONATAL_TODAY_ACTION,
        suggest: ["تکرار CBC"],
        warnings: [NEONATAL_DANGER_WARNING],
      };
      const suggest = hgb
        ? ["فریتین", "ویتامین B12", "فولات", "رتیکولوسیت", "کراتینین"]
        : ["شمارش خون (CBC)", "فریتین", "رتیکولوسیت", "کراتینین"];

      return {
        pattern: "low_rbc_hct_without_anemia",
        urgency: "routine",
        ...(rbcLow ? { key_number: rbc.value } : {}),
        headline: "بعضی از شاخص‌های گلبول قرمز پایین‌تر از حد طبیعی است",
        must_say:
          `${parts.join(" و ")}. ` +
          `${hgbFa} ` +
          "هماتوکریت درصدِ حجمی است که گلبول‌های قرمز از خون اشغال می‌کنند، و هموگلوبین مقدارِ مادهٔ اکسیژن‌رسانِ داخلِ آن‌هاست؛ این‌ها دو چیز متفاوت‌اند و می‌توانند هم‌جهت نباشند. " +
          "این ترکیب می‌تواند صرفاً تفاوتِ آزمایشگاهی یا رقیق‌بودنِ خون باشد، ولی می‌تواند شروعِ کاهشِ ساختِ گلبول قرمز هم باشد — که علت‌هایی مثل کمبود آهن، کمبود B12 یا فولات، و کم‌کاری کلیه دارد." +
          elderly,
        action:
          "با پزشک عمومی یا داخلی در نوبت عادی مطرح کنید و آزمایش‌های زیر را بخواهید؛ اگر آزمایش قبلی دارید حتماً همراه ببرید تا روند مقایسه شود.",
        suggest,
        warnings: [
          "خودتان مکملِ آهن یا B12 شروع نکنید — مصرفِ پیش از آزمایش، نتیجه را گمراه‌کننده می‌کند و علتِ اصلی پنهان می‌ماند.",
        ],
      };
    },
  },

  {
    // P5 — تا acc9cc0 هر چهار رشتهٔ کاربرمحورِ این قاعده انگلیسی بود
    // («Increased Intracellular Hemoglobin Concentration»)، یعنی یک قاعدهٔ
    // زنده که به بیمارِ فارسی‌زبان انگلیسی می‌داد — همان چیزی که M38 برای
    // گرفتنش نوشته شد. اینجا فقط *ترجمه* شده: match، آستانه‌ها، urgency و
    // ${mchc.value} عیناً همان‌اند و هیچ محتوایی افزوده یا کم نشده. تست: M41.
    id: "spherocytosis_likely",
    match: (e) => {
      const t = val(e);
      const mch = e.graded.find((g) => g.test === "MCH");
      const hgb = e.graded.find((g) => g.test === "HGB");
      const rbc = e.graded.find((g) => g.test === "RBC");
      const rdw = e.graded.find((g) => g.test.startsWith("RDW"));

      const mchcHigh = t.MCHC != null && t.MCHC > 36;
      const mcvNormalOrLow = t.MCV != null && t.MCV <= macroMcvCut(e);
      const mchNormal = mch && (!mch.abnormal || mch.tag === "normal" || mch.tag === "normochromic" || mch.dir == null);
      const hgbLow = hgb && hgb.abnormal && hgb.dir === "low";
      const rbcNotHigh = !rbc || !rbc.abnormal || rbc.dir === "low";
      const rdwHigh = rdw && rdw.abnormal && rdw.dir === "high";

      return mchcHigh && mcvNormalOrLow && mchNormal && hgbLow && rbcNotHigh && rdwHigh;
    },
    build: (e) => {
      const mchc = e.graded.find((g) => g.test === "MCHC");
      return {
        pattern: "spherocytosis_likely",
        urgency: "this_week",
        headline: "غلظت هموگلوبین داخل گلبول‌های قرمز بالاتر از حد طبیعی است",
        must_say: `غلظت هموگلوبین در گلبول‌های قرمز (MCHC) بالاتر از حد طبیعی است، با مقدار ${mchc.value}. وقتی با RDW بالا، کم‌خونی خفیف و گلبول‌های قرمز طبیعی یا کوچک همراه باشد، به‌شدت نشان‌دهندهٔ نیاز به بررسی شکل‌های غیرطبیعی گلبول قرمز (مانند اسفروسیتوز) است. لام خون محیطی به‌شدت توصیه می‌شود.`,
        action: actionUnlessAnemiaCrisis(
          e,
          "در همین هفته‌های پیشِ رو با پزشک وقت بگیرید تا لام خون محیطی بررسی شود.",
        ),
        suggest: ["لام خون محیطی", "بیلی‌روبین", "تکرار CBC"],
        warnings: [],
      };
    },
  },

  {
    // specs/007 (Q3=B) — شرح و منبعِ ۳۶.۵ بالای indicesImplausible. فقط متن: urgency روتین است و
    // overall_urgency را جابه‌جا نمی‌کند، چون MCHCِ بالای ۳۶.۵ همیشه «غیرطبیعی» است و بی‌این قاعده هم
    // یک یافتهٔ روتین (unmatched_abnormal) می‌گرفت (M180). هیچ بیماری‌ای نام برده نمی‌شود.
    id: "rbc_indices_implausible",
    match: (e) => indicesImplausible(e),
    build: (e) => {
      const mchc = e.graded.find((g) => g.test === "MCHC");
      const hgb = e.graded.find((g) => g.test === "HGB");
      const hct = e.graded.find((g) => g.test === "HCT");
      const rbc = e.graded.find((g) => g.test === "RBC");
      const mcv = e.graded.find((g) => g.test === "MCV");
      const crisis = crisisArm(e) === "hgb";
      // زیرِ بحران: فقط «ناهماهنگ‌اند» — نه «نتیجه‌ای دربارهٔ کم‌خونی گرفته نمی‌شود» و نه «همین ناهماهنگی علتش است»؛
      // هر دو کنارِ «فوراً به اورژانس» اورژانس را کم‌رنگ می‌کنند (N20، M183).
      if (crisis) {
        return {
          pattern: "rbc_indices_implausible",
          // P60: جملهٔ «معمولاً اثرِ نمونه یا دستگاه» تنها و زیرِ اورژانس می‌تواند عددِ بحرانیِ Hb را بی‌اهمیت جلوه دهد؛ «یافتهٔ تکمیلی» نمی‌شود.
          no_supplementary: true,
          urgency: "routine",
          key_number: mchc.value,
          headline: "شاخص‌های گلبول قرمزِ این برگه با هم جور درنمی‌آیند",
          must_say:
            `غلظت هموگلوبین در گلبول‌های قرمز (MCHC) ${mchc.value} گزارش شده (حد طبیعی ${mchc.range})؛ ` +
            `این مقدار از نظرِ بدنی بعید است و نشان می‌دهد هموگلوبین (${hgb.value}) و هماتوکریت (${hct.value}) این برگه با هم هماهنگ نیستند — معمولاً اثرِ نمونه یا دستگاه. ` +
            "این ناهماهنگی دستورِ فوریِ بالا را عوض نمی‌کند: هموگلوبینِ به این پایینی را باید همین حالا جدی گرفت، و آزمایشِ تکراری در همان مراجعهٔ فوری انجام می‌شود.",
          action: actionUnlessAnemiaCrisis(e, ""),
          suggest: ["تکرار CBC"],
          warnings: [],
        };
      }
      // فقط شاخصی که واقعاً پایین است نام برده می‌شود — low_rbc_hct_without_anemia کنار رفته و این یافته مالکِ آن‌هاست.
      const low = [];
      if (hct.abnormal && hct.dir === "low") low.push(`هماتوکریت (${hct.value})`);
      if (rbc?.abnormal && rbc.dir === "low") low.push(`تعداد گلبول قرمز (${rbc.value})`);
      // P52 پرسش ۳ (تصمیمِ کاربر ۱۴۰۵/۰۷/۰۱): MCVِ بالا در آگلوتینینِ سرد از همان خطا می‌آید — دستگاه چند گلبولِ
      // چسبیده را یک گلبولِ بزرگ می‌شمارد. پیش‌تر جدا به «توضیح داده نشدند» می‌رفت (M183b). MCVِ طبیعی نام برده نمی‌شود.
      const mcvHigh = mcv?.abnormal && mcv.dir === "high";
      return {
        pattern: "rbc_indices_implausible",
        // P60: جملهٔ «معمولاً اثرِ نمونه یا دستگاه» تنها و زیرِ اورژانس می‌تواند عددِ بحرانیِ Hb را بی‌اهمیت جلوه دهد؛ «یافتهٔ تکمیلی» نمی‌شود.
        no_supplementary: true,
        urgency: "routine",
        key_number: mchc.value,
        headline: "شاخص‌های گلبول قرمزِ این برگه با هم جور درنمی‌آیند",
        must_say:
          `غلظت هموگلوبین در گلبول‌های قرمز (MCHC) ${mchc.value} گزارش شده (حد طبیعی ${mchc.range})؛ ` +
          `این مقدار از نظرِ بدنی بعید است و معمولاً یعنی هموگلوبین (${hgb.value}) و هماتوکریت (${hct.value}) این برگه با هم هماهنگ نیستند. ` +
          "شایع‌ترین علت، اثرِ نمونه یا دستگاه است — مثلاً چسبیدنِ گلبول‌ها به هم در نمونهٔ سرد (آگلوتینینِ سرد) یا چربیِ زیادِ خون — نه یک بیماری. " +
          "تا تکرارِ آزمایش، از این شاخص‌ها نتیجه‌ای دربارهٔ کم‌خونی گرفته نمی‌شود." +
          (low.length ? ` ${low.join(" و ")} هم پایین گزارش شده، ولی همین ناهماهنگی می‌تواند علتش باشد.` : "") +
          (mcvHigh ? ` حجمِ گلبول قرمز (MCV) هم ${mcv.value} و بالا گزارش شده؛ وقتی گلبول‌ها در نمونهٔ سرد به هم می‌چسبند، دستگاه چند گلبولِ چسبیده را یک گلبولِ بزرگ می‌شمارد، پس این عدد هم ممکن است واقعی نباشد.` : ""),
        action: "در نوبتِ عادی از پزشک یا آزمایشگاه بخواهید شمارش خون (CBC) روی نمونهٔ تازه تکرار شود.",
        suggest: ["تکرار CBC", "لام خون محیطی"],
        warnings: ["تا تکرارِ آزمایش، خودتان مکملِ آهن، B12 یا فولات شروع نکنید."],
      };
    },
  },

  {
    id: "coagulation_abnormal",
    match: (e) => {
      const pt = e.graded.find((g) => g.test === "PT");
      const aptt = e.graded.find((g) => g.test === "APTT");
      const fib = e.graded.find((g) => g.test === "FIB");
      const inr = e.graded.find((g) => g.test === "INR");
      return (pt?.abnormal && pt.dir === "high") ||
             (aptt?.abnormal && aptt.dir === "high") ||
             (fib?.abnormal && fib.dir === "low") ||
             (inr?.abnormal && inr.dir === "high");
    },
    build: (e) => {
      const pt = e.graded.find((g) => g.test === "PT");
      const fib = e.graded.find((g) => g.test === "FIB");
      const inr = e.graded.find((g) => g.test === "INR");
      // PT>25، فیبرینوژن<100، یا INR>3 → فوری
      const severe = (pt && pt.value > 25) || (fib && fib.value < 100) ||
                     (inr && inr.value > 3);
      // job 40b8a901 (F5): PTِ خام کمی بالا با INR و APTTِ طبیعی «زمان لخته شدن طولانی» نیست — INR همان PT است که
      //   بین معرف‌ها قابل‌مقایسه شده. متن سه‌حالته است و عددِ سه شاخص را می‌گوید؛ فوریت دست‌نخورده (P59، تصمیمِ بازبین).
      const isoPt = ptIsolatedMild(e);
      const brief = coagulationBrief(e);
      return {
        pattern: "coagulation_abnormal",
        // P59 پرسش ۵ (بازبین): PT ایزوله با INRِ طبیعی «routine» است؛ INR معیارِ قابل‌مقایسه است.
        urgency: severe ? "emergency" : isoPt ? "routine" : "this_week",
        ...(isoPt ? { sources: ["STATPEARLS_INR"] } : {}),   // فقط متنِ «PTِ خام به معرف بستگی دارد»
        always_show: true,
        brief,
        headline: "شاخص‌های لخته شدن خون شما غیرطبیعی هستند",
        must_say: isoPt
          ? coagulationIsolatedPtText(e)
          : "زمان لخته شدن خون طولانی‌تر از حد معمول است. " +
            "داروهای رقیق‌کننده خون هم می‌توانند این را بسازند.",
        action: severe
          ? "همین امروز با پزشک تماس بگیرید."
          : isoPt
            ? "در نوبتِ عادی با پزشک مطرح کنید و بخواهید PT و INR تکرار شود. حتماً بگویید چه داروهایی مصرف می‌کنید."
            : "این هفته با پزشک وقت بگیرید. حتماً بگویید چه داروهایی مصرف می‌کنید.",
        suggest: ["تکرار آزمایش انعقاد"],
        warnings: [
          "تا مشخص شدن علت، آسپرین یا مسکن‌های ضدالتهاب مصرف نکنید.",
          "اگر خونریزی غیرعادی یا کبودی بی‌دلیل دیدید، همان روز به پزشک مراجعه کنید.",
        ],
        blocks_others: severe,
        brief_warnings: [
          "اگر خونریزی غیرعادی یا کبودیِ بی‌دلیل دیدید، همان روز به پزشک مراجعه کنید.",
        ],
      };
    },
  },

  // ═══════════ فقر آهن — با پنل آهن (نه فقط CBC) ═══════════
  // رویکرد الف: فقط وقتی پنل آهن موجود است فعال می‌شود.
  // اگر فقط CBC باشد، microcytic_anemia قبلی کار می‌کند.
  // گایدلاین (Labcorp/AAFP): فقر آهن = فریتین پایین + TIBC بالا + TSAT پایین.
  {
    id: "iron_deficiency_panel",
    match: (e) => {
      const t = val(e);
      // حداقل فریتین لازم است — قوی‌ترین نشانگر
      if (t.FERRITIN == null) return false;
      // specs/008 (N23): آستانهٔ قاعده، نه dirِ بازهٔ درجه‌بندی — مرد <۳۰، زنِ ≥۵۰ <۳۰، بقیه <۱۵ (کودک: PED_REFS).
      const ferrLow = ferritinBelowIdCut(e);
      // فریتین پایین به‌تنهایی تقریباً قطعیِ فقر آهن است (اگر التهاب نباشد)
      const tsatLow = t.TSAT != null && t.TSAT < 20;
      const tibcHigh = (() => {
        const g = e.graded.find((x) => x.test === "TIBC");
        return g?.abnormal && g.dir === "high";
      })();
      // ⚠️ شکافِ واقعی (کلاسِ N2 — کم‌خوانیِ خاموش):
      //    فریتین واکنش‌گرِ فاز حاد است و در التهاب بالا می‌رود. پس در بیمارِ
      //    ملتهب، فریتینِ «طبیعی» کمبودِ آهن را رد نمی‌کند. WHO 2020 دقیقاً
      //    برای همین آستانهٔ جداگانه دارد: در حضورِ عفونت/التهاب، فریتینِ
      //    زیر ۷۰ µg/L در بزرگسال کمبودِ آهن را مطرح می‌کند (به‌جای ۱۵).
      //    بدون این شاخه، بیمارِ CRPِ ۴۰ با فریتینِ ۴۵ هیچ پیامی نمی‌گرفت.
      // P53 پرسش ۴ (تصمیمِ کاربر ۲۰۲۶-۰۹-۲۴): نسبتِ sTfR/log فریتینِ >۲ ⇒ کمبودِ آهن، حتی با فریتینِ «طبیعی» در التهاب.
      return ferrLow || (tsatLow && tibcHigh) || whoInflamIronDeficiency(e) || stfrIndexHigh(e);
    },
    build: (e) => {
      const t = val(e);
      const ferr = e.graded.find((g) => g.test === "FERRITIN");
      // specs/008: «زیرِ آستانهٔ کمبود» و «زیرِ بازهٔ چاپ‌شده» دیگر یکی نیستند (مردِ فریتینِ ۲۰: بازه ۱۲–۳۰۰).
      //   متن سه‌حالته است تا کنارِ برچسبِ «طبیعی» ادعای «فریتین پایین» نکند.
      const ferrLow = ferritinBelowIdCut(e);
      const ferrGradedLow = !!(ferr?.abnormal && ferr.dir === "low");
      const inflam = hasInflammation(e);
      // شاخهٔ WHO: فریتین زیرِ آستانهٔ معمول نیست ولی با التهاب زیر ۷۰.
      const whoOnly = !ferrLow && whoInflamIronDeficiency(e);
      // P53 پرسش ۴: فقط نسبتِ sTfR این یافته را فعال کرده ⇒ «ذخیره پایین است» ادعا نمی‌شود (فریتین پایین نیست).
      const ix = stfrIndex(e);
      const tibcG = e.graded.find((g) => g.test === "TIBC");
      const panelArm = t.TSAT != null && t.TSAT < 20 && !!(tibcG?.abnormal && tibcG.dir === "high");
      const indexOnly = !ferrLow && !whoOnly && !panelArm && stfrIndexHigh(e);
      const ixClause = !ix ? ""
        : ix.value > STFR_INDEX_ID_ABOVE
          ? (indexOnly ? "" : ` نسبتِ گیرندهٔ محلولِ ترانسفرین به لگاریتمِ فریتین هم حدود ${ix.value} و بالاتر از ${STFR_INDEX_ID_ABOVE} است که با کمبودِ آهن جور است.`)
          : ` نسبتِ گیرندهٔ محلولِ ترانسفرین به لگاریتمِ فریتین حدود ${ix.value} است و از ${STFR_INDEX_ID_ABOVE} بالاتر نیست؛ پزشک این را کنارِ فریتین می‌سنجد.`;
      // 🔴 بازبینیِ دور ۲ (R2-B2): وقتی Hb پایین نیست، microcytosis_no_anemia به این یافته واگذار می‌کند (یک فریتین،
      //    یک یافته) — پس MCV اینجا نام برده می‌شود، وگرنه به «بی‌توضیح» می‌رفت. با Hbِ پایین، قاعده‌های کم‌خونی
      //    صاحبِ MCVاند. هر دو جهت جمله دارند، چون خواندنِ کلید آن را در هر جهتی «پوشش‌داده» می‌کند (M156).
      const hgbI = e.graded.find((g) => g.test === "HGB");
      const mcvI = e.graded.find((g) => g.test === "MCV");
      const mcvClause = !(hgbI?.abnormal && hgbI.dir === "low") && mcvI?.abnormal
        ? mcvI.dir === "low"
          ? ` اندازهٔ متوسط گلبول‌ها (MCV) ${mcvI.value} است که کوچک‌تر از حد طبیعی (${mcvI.range}) است و با کمبودِ آهن جور است.`
          : ` اندازهٔ متوسط گلبول‌ها (MCV) ${mcvI.value} است که بزرگ‌تر از حد طبیعی (${mcvI.range}) است و با کمبودِ آهنِ تنها جور نیست؛ پزشک باید علت‌های دیگر (مثل کمبودِ B12 یا فولات) را هم بسنجد.`
        : "";
      return {
        pattern: whoOnly ? "iron_deficiency_masked_by_inflammation" : "iron_deficiency",
        urgency: "this_week",
        sources: ["WHO_FERRITIN"],
        headline: whoOnly
          ? "فریتین شما «طبیعی» گزارش شده، ولی با توجه به التهاب می‌تواند کمبود آهن را پنهان کند"
          : indexOnly
            ? "شاخصِ گیرندهٔ محلولِ ترانسفرین به کمبود آهن اشاره دارد"
            : "الگوی آزمایش‌ها به کمبود آهن اشاره دارد",
        must_say: (indexOnly
          ? `فریتین شما ${t.FERRITIN} است و زیرِ حدِ کمبودِ آهن نیست، ولی نسبتِ گیرندهٔ محلولِ ترانسفرین به لگاریتمِ فریتین ` +
            `(sTfR ${ix.stfr} تقسیم بر لگاریتمِ فریتین) حدود ${ix.value} و بالاتر از ${STFR_INDEX_ID_ABOVE} است؛ این یعنی مغزِ استخوان برای ساختِ ` +
            "گلبولِ قرمز آهنِ کافی در دسترس ندارد — حتی وقتی فریتین (مثلاً به‌خاطرِ التهاب) «طبیعی» به نظر می‌رسد. مرزِ این شاخص به کیتِ آزمایشگاه بستگی دارد."
          : whoOnly
          // 🔴 بازبینیِ دور ۲ (کد #5): آستانه‌ها از همان توابعی که قاعده می‌خواند — زیرِ ۵ سال ۳۰ نه ۷۰، و زیرِ ۱۶ سال
          //    «آستانهٔ معمول» حدِ پایینِ بازهٔ سنی است نه ۳۰ِ مردِ بالغ. «چاپ‌شده» ⇒ «مرجع» (N5، غیرِمسدودکنندهٔ ۲).
          ? `فریتین شما ${t.FERRITIN} است که در محدودهٔ مرجع «طبیعی» به حساب می‌آید — ولی ` +
            "فریتین یک پروتئینِ التهابی هم هست و هر التهاب یا عفونتی آن را بالا می‌برد، حتی وقتی ذخیرهٔ آهن ته کشیده باشد. " +
            `چون نشانه‌های التهاب در همین برگه بالاست، سازمان جهانی بهداشت در این وضعیت آستانهٔ بالاتری (فریتین زیر ${whoFerritinThreshold(e)}) را ` +
            `برای مطرح کردنِ کمبود آهن به کار می‌برد، نه ${isPedAge(e) ? "حدِ پایینِ محدودهٔ مرجع برای سنِ شما" : `حدِ ${ferritinIdCut(e)} که بدونِ التهاب به کار می‌رود`}. یعنی این عدد کمبود آهن را رد نمی‌کند و باید بررسی شود.`
          : "ذخیره آهن بدن شما پایین است" +
            (ferrGradedLow
              ? " (فریتین پایین، قوی‌ترین نشانه کمبود آهن)"
              : ferrLow
                ? ` (فریتین شما ${t.FERRITIN} است؛ در محدودهٔ مرجع جا می‌گیرد ولی نزدیکِ لبهٔ پایینِ آن است و ` +
                  "زیرِ حدی است که معمولاً برای کمبودِ آهن در نظر گرفته می‌شود)"
                : "") +
            ". شایع‌ترین علت‌ها خون‌ریزی مزمن (مثلاً قاعدگی سنگین یا دستگاه گوارش) و دریافت ناکافی آهن است." +
            (inflam ? " توجه: نشانه‌های التهاب هم بالاست و ممکن است تصویر آهن را پیچیده کند — پزشک باید تفسیر کند." : "")) + mcvClause + ixClause,
        ...(ix ? { explains: ["STFR"] } : {}),
        action: "این هفته با پزشک وقت بگیرید. اگر خون‌ریزی گوارشی یا قاعدگی سنگین دارید حتماً بگویید.",
        suggest: whoOnly
          ? ["اشباع ترانسفرین (TSAT)", "گیرندهٔ محلول ترانسفرین (sTfR)", "بررسی علت التهاب"]
          : ["پنل کامل آهن", "بررسی علت خون‌ریزی"],
        warnings: [
          "قبل از تأیید پزشک و مشخص شدن علت، خودتان دوز بالای آهن شروع نکنید.",
        ],
      };
    },
  },

  // ═══════════ کم‌خونی بیماری مزمن ═══════════
  // گایدلاین: آهن پایین + TIBC پایین/طبیعی + فریتین طبیعی/بالا + TSAT پایین.
  // تمایز کلیدی از فقر آهن: در فقر آهن TIBC بالاست، اینجا پایین.
  {
    id: "anemia_chronic_disease",
    match: (e) => {
      const t = val(e);
      const hgb = e.graded.find((g) => g.test === "HGB");
      const anemic = hgb?.abnormal && hgb.dir === "low";
      if (!anemic) return false;
      // نیاز به پنل آهن برای تمایز
      if (t.IRON == null || t.FERRITIN == null) return false;
      // specs/008 (N23): آستانه‌های نگه‌داشته — آهن <۶۰ و «فریتین نه زیرِ آستانهٔ کمبود»، نه dirِ بازهٔ تازه.
      const ironLow = ironLowForAcd(e);
      // فریتین طبیعی یا بالا (نه پایین) — این فقر آهن را رد می‌کند
      const ferrNotLow = !ferritinBelowIdCut(e);
      // TIBC پایین یا طبیعی (نه بالا)
      const tibc = e.graded.find((g) => g.test === "TIBC");
      const tibcNotHigh = !(tibc?.abnormal && tibc.dir === "high");
      return ironLow && ferrNotLow && tibcNotHigh;
    },
    build: (e) => {
      const crp = e.graded.find((g) => g.test === "CRP_Q");
      const inflam = crp?.abnormal && crp.dir === "high";
      return {
        pattern: "anemia_of_chronic_disease",
        urgency: "this_week",
        headline: "الگوی کم‌خونی شما بیشتر به التهاب یا بیماری زمینه‌ای می‌خورد تا کمبود آهن",
        must_say:
          "برخلاف کمبود آهن، اینجا ذخیره آهن بدن پایین نیست — ولی بدن نمی‌تواند از آهن موجود خوب استفاده کند. " +
          "این الگو معمولاً همراه یک التهاب یا بیماری مزمن دیده می‌شود." +
          (inflam ? " CRP شما هم بالاست که با این تصویر همخوانی دارد." : ""),
        action: "این هفته با پزشک وقت بگیرید تا علت زمینه‌ای بررسی شود.",
        suggest: ["CRP", "بررسی بیماری زمینه‌ای", "عملکرد کلیه"],
        // مهم: در این نوع کم‌خونی آهن خوراکی کمکی نمی‌کند و گاهی مضر است
        forbid: ["آهن خوراکی", "قرص آهن", "iron supplement"],
        warnings: [
          "در این نوع کم‌خونی، مصرف خودسرانه قرص آهن معمولاً کمکی نمی‌کند. درمان روی علت اصلی است.",
        ],
      };
    },
  },

  // ═══════════ همولیز ═══════════
  // گایدلاین (AAFP/ARUP): LDH بالا + بیلی‌روبین غیرمستقیم بالا +
  //   هاپتوگلوبین پایین + رتیکولوسیت بالا → همولیز.
  // تله مهم (منبع): LDH+AST بالا با هاپتوگلوبین طبیعی → عضله، نه همولیز.
  {
    id: "hemolysis_pattern",
    match: (e) => {
      const t = val(e);
      // حداقل دو نشانگر از نشانگرهای اصلی همولیز لازم است
      const ldhHigh = (() => {
        const g = e.graded.find((x) => x.test === "LDH");
        return g?.abnormal && g.dir === "high";
      })();
      const haptoLow = (() => {
        const g = e.graded.find((x) => x.test === "HAPTO");
        return g?.abnormal && g.dir === "low";
      })();
      const reticHigh = (() => {
        const g = e.graded.find((x) => x.test === "RETIC");
        return g?.abnormal && g.dir === "high";
      })();
      // بیلی‌روبین غیرمستقیم: اگر خودش روی برگه چاپ شده از همان استفاده کن،
      // وگرنه از تفریقِ تام منهای مستقیم بساز — همان ترتیبی که
      // patterns_biochem.js:758 از قبل به کار می‌بَرد.
      // ⚠️ پیش از این فقط مسیرِ دوم بود، پس برگه‌ای که غیرمستقیم را مستقیماً
      //    چاپ می‌کند (هشت املای BILI_I در adapter.js) در شمارشِ نشانگرها صفر
      //    می‌آورد و همان بیمار بسته به ستونی که آزمایشگاه چاپ کرده بود، الگوی
      //    همولیز می‌گرفت یا نمی‌گرفت. تست: M46.
      // آستانهٔ ۱.۰ و هر سه شاخهٔ خروج دست‌نخورده‌اند.
      const indirect = t.BILI_I != null ? t.BILI_I
                     : (t.BILI_T != null && t.BILI_D != null ? t.BILI_T - t.BILI_D : null);
      const indirectHigh = indirect != null && indirect > 1.0;
      const markers = [ldhHigh, haptoLow, reticHigh, indirectHigh].filter(Boolean).length;

      // تله عضله: LDH بالا + AST/CK بالا + هاپتوگلوبین طبیعی → عضله، نه همولیز.
      // این حالت هم باید الگو را فعال کند تا توضیح درست به کاربر برسد
      // (وگرنه در تور ایمنی عمومی می‌افتد و پیام گمراه‌کننده می‌دهد).
      const ast = e.graded.find((g) => g.test === "AST");
      const ck = e.graded.find((g) => g.test === "CK");
      const muscleTrap = ldhHigh && !haptoLow &&
                         ck?.abnormal && ck.dir === "high" &&
                         ast?.abnormal && ast.dir === "high";

      // هاپتوگلوبین پایین قوی‌ترین نشانه است؛ اگر باشد یک نشانه دیگر کافی است
      return muscleTrap || (haptoLow && markers >= 2) || markers >= 3;
    },
    build: (e) => {
      const t = val(e);
      // تله عضله: اگر AST و CK بالا و هاپتوگلوبین طبیعی → احتمالاً عضله
      const ast = e.graded.find((g) => g.test === "AST");
      const ck = e.graded.find((g) => g.test === "CK");
      const hapto = e.graded.find((g) => g.test === "HAPTO");
      const haptoLow = hapto?.abnormal && hapto.dir === "low";
      const muscleTrap = !haptoLow &&
                         ck?.abnormal && ck.dir === "high" &&
                         ast?.abnormal && ast.dir === "high";
      if (muscleTrap) {
        return {
          pattern: "ldh_muscle_not_hemolysis",
          urgency: "routine",
          headline: "چند شاخص بالا هستند، ولی الگو بیشتر به عضله می‌خورد تا خون",
          must_say:
            "LDH و برخی آنزیم‌ها بالا هستند، ولی هاپتوگلوبین طبیعی است — " +
            "این به آسیب یا فعالیت عضلانی اشاره دارد نه شکستن گلبول قرمز. ورزش سنگین اخیر هم می‌تواند علت باشد.",
          // ⚠️ specs/006 (بازبینی B1): این شاخه مالکِ بیلی‌روبینِ نوار *نیست* — «نه کبد» می‌گوید؛ یافتهٔ ادرار مستقل می‌ماند.
          action: "نوبت عادی. اگر ورزش سنگین کرده‌اید حتماً به پزشک بگویید.",
          suggest: ["CK", "تکرار آزمایش پس از استراحت"],
          warnings: [],
        };
      }
      return {
        pattern: "hemolysis_likely",
        urgency: "this_week",
        headline: "الگوی آزمایش‌ها به شکستن گلبول‌های قرمز (همولیز) اشاره دارد",
        must_say:
          "چند شاخص با هم نشان می‌دهند که گلبول‌های قرمز شما ممکن است زودتر از حد معمول تجزیه شوند. " +
          "علت‌های زیادی دارد — از ارثی تا خودایمنی و دارویی — و برای مشخص شدن باید بررسی شود." +
          // specs/006 (FR-021): نوارِ ادرار یافتهٔ دوم نمی‌سازد؛ جمله‌اش اینجاست.
          urineBiliSentence(e, { direct: false }),
        action: "این هفته با پزشک وقت بگیرید. این برگه را همراه ببرید.",
        suggest: ["هاپتوگلوبین", "رتیکولوسیت", "بیلی‌روبین مستقیم و غیرمستقیم", "اسمیر خون محیطی", "تست کومبس"],
        warnings: [],
      };
    },
  },

  // ═══════════ LDHِ بالای منفرد ═══════════
  //
  // 🔴 چرا این قاعده وجود دارد (P24 در MEDICAL_RULES.md): تا ۲۰۲۶-۰۸-۰۶ بازهٔ
  //    LDH در بالغ [235, 470] بود، پس LDH=۳۰۰ «طبیعی» گرفته می‌شد و «LDHِ بالا»
  //    عملاً کمیاب بود. با اصلاحِ بازه به [100, 250] این حالت شایع شد و هیچ
  //    قاعده‌ای مالکش نبود: پنلِ سالم با LDH=۳۰۰ فقط unmatched_abnormal می‌گرفت،
  //    یعنی «برای این ترکیب توضیح آماده‌ای نداریم» — صادقانه، ولی بی‌فایده.
  //    اصلاحِ بازه یک شکاف را نساخت، فقط آن را از کمیاب به شایع برد.
  //
  // منبع: دورِ پژوهشِ P24 — Merck Manual Professional و ARUP Consult (هر دو آزاد).
  //    چهار نکتهٔ صریحِ منبع که عمداً در متنِ بیمار آمده‌اند:
  //      • LDH نشانگرِ *غیراختصاصیِ* آسیبِ بافتی است. عضله، کبد، قلب، کلیه،
  //        بدخیمی و همولیز همه بالایش می‌برند، پس به‌تنهایی تشخیص نیست.
  //      • مسیرِ بازتابیِ همولیز سه‌تایی است: هاپتوگلوبین + رتیکولوسیت +
  //        بیلی‌روبینِ غیرمستقیم.
  //      • گسترشِ خونِ محیطی *پس از* تأییدِ همولیز می‌آید، نه هم‌زمان با آن.
  //        به همین دلیل در suggest نیست — درخواستش در این مرحله، مرحله‌ای را
  //        جا می‌اندازد که تصمیم می‌گیرد اصلاً لازم هست یا نه.
  //      • هاپتوگلوبینِ طبیعی همولیز را رد نمی‌کند: پروتئینِ فازِ حاد است و در
  //        عفونت/التهاب بالا می‌رود و می‌تواند افتِ ناشی از همولیز را بپوشاند.
  //        این جمله در متن هست چون نبودنش «طبیعی» را به «رد شد» ترجمه می‌کند.
  //
  // ⚠️ هرگز با hemolysis_pattern هم‌زمان فعال نمی‌شود، و شرطش «قاعدهٔ همولیز
  //    فعال نشد» است نه یک کپیِ منطقِ آن — رجوع به hemolysisRuleFires پایین‌تر.
  {
    id: "isolated_ldh_elevation",
    match: (e) => {
      const ldh = e.graded.find((g) => g.test === "LDH");
      // جهت از graded.dir می‌آید، هرگز از مقایسه با یک آستانهٔ شدت — N12.
      if (!(ldh?.abnormal && ldh.dir === "high")) return false;
      return !hemolysisRuleFires(e);
    },
    build: (e) => {
      const t = val(e);
      // وضعیتِ چهارحالته. «نبودن» یک حالتِ مستقل است، نه مترادفِ «طبیعی» — N4.
      const stateOf = (k) => {
        const g = e.graded.find((x) => x.test === k);
        if (!g) return "absent";
        return g.abnormal ? g.dir : "normal";
      };
      const hapto = stateOf("HAPTO");
      const retic = stateOf("RETIC");
      const hgb   = stateOf("HGB");
      const ck    = stateOf("CK");
      const ast   = stateOf("AST");
      const alt   = stateOf("ALT");

      // بیلی‌روبینِ غیرمستقیم: اگر برگه خودش چاپش کرده از همان، وگرنه از تفریقِ
      // تام منهای مستقیم — همان ترتیب و همان آستانهٔ ۱.۰ که hemolysis_pattern
      // به کار می‌برد، تا دو قاعده دربارهٔ یک عدد دو حرف نزنند.
      const printed = t.BILI_I != null;
      const indirect = printed
        ? t.BILI_I
        : (t.BILI_T != null && t.BILI_D != null ? t.BILI_T - t.BILI_D : null);
      const bili = indirect == null ? "absent" : (indirect > 1.0 ? "high" : "normal");

      // کلیدهایی که این قاعده در متن اسم برده است. ⚠️ لازم است، نه تزئینی:
      // تورِ ایمنیِ unexplained_abnormal کلیدی را «پوشش‌داده» می‌شمارد که سورسِ
      // قاعده خوانده باشد (RULE_READS در patterns.js). پس هر کلیدی که اینجا
      // خوانده شود و در متن اسمش نیاید، از آن تور هم می‌افتد — یعنی سکوت،
      // که همان کلاسِ N18 است. حلقهٔ leftover پایین‌تر این را می‌بندد.
      const named = new Set();

      // ── مسیرِ بازتابیِ سه‌تایی ──
      const done = [];   // روی برگه هست، با خواندنش
      const need = [];   // روی برگه نیست، باید درخواست شود

      if (hapto === "absent") need.push("هاپتوگلوبین");
      else {
        named.add("HAPTO");
        done.push(
          hapto === "low"
            // ⚠️ عملاً دست‌نیافتنی است: هاپتوگلوبینِ پایین به‌همراهِ LDHِ بالا
            //    دو نشانگر می‌شود و hemolysis_pattern را فعال می‌کند، پس اینجا
            //    نمی‌رسد. عمداً نوشته شده تا اگر روزی آستانهٔ آن قاعده باریک‌تر
            //    شد، این حالت به سکوت نیفتد — N16 از سمتِ مقابل.
            ? "هاپتوگلوبینِ شما پایین است، که قوی‌ترین نشانه به نفعِ شکسته‌شدنِ گلبولِ قرمز است"
            : hapto === "high"
            ? "هاپتوگلوبینِ شما بالاست، که معمولاً نشانهٔ التهاب است نه همولیز"
            : "هاپتوگلوبینِ شما طبیعی است",
        );
      }

      if (retic === "absent") need.push("شمارش رتیکولوسیت");
      else {
        named.add("RETIC");
        done.push(
          retic === "high"
            ? "رتیکولوسیتِ شما بالاست، یعنی مغزِ استخوان با سرعتِ بیشتری گلبولِ قرمزِ تازه می‌سازد — این با تخریبِ زودرس هم‌خوانی دارد"
            : retic === "low"
            ? "رتیکولوسیتِ شما پایین است، که بیشتر به کم‌کاریِ ساختِ گلبول می‌خورد تا به تخریبِ آن"
            : "رتیکولوسیتِ شما طبیعی است",
        );
      }

      if (bili === "absent") need.push("بیلی‌روبین مستقیم و غیرمستقیم");
      else {
        named.add("BILI_I"); named.add("BILI_T"); named.add("BILI_D");
        // ⚠️ N5: عددِ مشتق‌شده روی برگهٔ بیمار چاپ نشده. نه نقلش می‌کنیم و نه
        //    وانمود می‌کنیم چاپ شده — می‌گوییم از کجا آمده.
        const derived = printed ? "" : " (این مقدار روی برگهٔ شما چاپ نشده و از کسرِ بیلی‌روبینِ مستقیم از تام به دست آمده)";
        done.push(
          bili === "high"
            ? `بیلی‌روبینِ غیرمستقیمِ شما بالاست${derived}`
            : `بیلی‌روبینِ غیرمستقیمِ شما بالا نیست${derived}`,
        );
      }

      // ── سرنخ‌های منبعِ دیگر ──
      //
      // ⚠️ تا ۲۰۲۶-۰۸-۱۰ این بخش فقط شاخهٔ «بالا» داشت. یعنی روی برگه‌ای که
      //    AST=۱۶ و ALT=۲۲ (هر دو طبیعی) کنارِ LDH=۲۹۰ چاپ شده بود، متن
      //    کبد و عضله را جزوِ علت‌های ممکن نام می‌برد و بعد هیچ‌جا نمی‌گفت که
      //    دوتاشان روی همین برگه بررسی و طبیعی بوده‌اند. بیمار «کبد، قلب،
      //    کلیه، بدخیمی» را می‌خواند در حالی که دو ستونِ کنارِ همان عدد،
      //    یکی از آن احتمال‌ها را کم‌رنگ می‌کرد. اطلاعاتِ نگه‌داشته‌شده هم
      //    اطلاعاتِ گم‌شده است.
      const others = [];
      if (ck === "high") {
        named.add("CK");
        others.push("CK (آنزیمِ عضله) هم بالاست، که انگشت را بیشتر به سمتِ عضله می‌گیرد تا خون — ورزشِ سنگینِ اخیر، تزریقِ عضلانی یا آسیبِ عضلانی");
      } else if (ck === "normal") {
        named.add("CK");
        others.push("CK (آنزیمِ عضله) روی همین برگه هست و طبیعی است، پس آسیبِ عضلانیِ قابلِ توجه علتِ محتملی برای این عدد نیست");
      }
      if (ast === "high" || alt === "high") {
        if (ast === "high") named.add("AST");
        if (alt === "high") named.add("ALT");
        others.push(
          ast === "high" && alt === "high"
            ? "AST و ALT هم بالا هستند، پس کبد وارد فهرستِ علت‌های ممکن می‌شود"
            : ast === "high" && alt === "normal"
            ? "AST بالاست در حالی که ALT طبیعی است؛ این ترکیب به عضله یا حتی به همولیزِ خودِ نمونه در لوله هم می‌خورد، نه فقط به کبد"
            : ast === "high"
            ? "AST هم بالاست و ALT روی برگهٔ شما نیست؛ بدونِ ALT نمی‌شود کبد را از عضله جدا کرد"
            : "ALT هم بالاست، پس کبد وارد فهرستِ علت‌های ممکن می‌شود",
        );
      } else if (ast === "normal" && alt === "normal") {
        named.add("AST"); named.add("ALT");
        others.push("AST و ALT (آنزیم‌های کبدی) روی همین برگه هستند و هر دو طبیعی‌اند؛ این کبد را به‌عنوانِ علتِ محتمل کم‌رنگ می‌کند، هرچند به‌تنهایی ردش نمی‌کند");
      } else if ((ast === "normal" && alt === "absent") || (alt === "normal" && ast === "absent")) {
        // ⚠️ شرط عمداً «absent» را صریح می‌خواهد، نه «هرچه بالا نیست». اگر
        //    یکی طبیعی و دیگری *پایین* باشد، جملهٔ زیر می‌گفت «روی برگهٔ شما
        //    نیست» دربارهٔ عددی که چاپ شده — همان ادعای کاذبِ N4، از سمتِ عکس.
        const seen = ast === "normal" ? "AST" : "ALT";
        const gone = ast === "normal" ? "ALT" : "AST";
        named.add(seen);
        others.push(`${seen} (آنزیمِ کبدی) طبیعی است، ولی ${gone} روی برگهٔ شما نیست؛ با یکی از این دو نمی‌شود کبد را کنار گذاشت`);
      }

      // هموگلوبین: سه‌شاخه، چون «اندازه‌گیری نشده» جوابِ سوم است نه سکوت — N4.
      let anemiaLine;
      if (hgb === "low") {
        named.add("HGB");
        anemiaLine = "هموگلوبینِ شما هم پایین است. ترکیبِ کم‌خونی با LDHِ بالا همان جایی است که پرسشِ همولیز از کنجکاوی به بررسیِ لازم تبدیل می‌شود.";
      } else if (hgb === "high") {
        named.add("HGB");
        anemiaLine = "هموگلوبینِ شما بالاتر از حد طبیعی است؛ این خودش جداگانه باید بررسی شود و کم‌خونیِ ناشی از همولیز را در این برگه مطرح نمی‌کند.";
      } else if (hgb === "normal") {
        named.add("HGB");
        anemiaLine = "هموگلوبینِ شما طبیعی است، که از احتمالِ همولیزِ فعال و پرحجم می‌کاهد — ولی آن را رد نمی‌کند.";
      } else {
        anemiaLine = "هموگلوبین روی برگهٔ شما نیست؛ بدونِ آن نمی‌شود گفت این عدد کم‌خونی ساخته یا نه.";
      }

      // ⚠️ هر کلیدِ خوانده‌شده‌ای که غیرطبیعی است و بالا اسمش برده نشد، اینجا
      //    اسم برده می‌شود. بدونِ این، تورِ unexplained_abnormal آن را
      //    «پوشش‌داده» می‌شمارد و بیمار هیچ‌جا خبردار نمی‌شود — N18.
      const leftover = ["HAPTO", "RETIC", "BILI_I", "BILI_T", "BILI_D", "HGB", "CK", "AST", "ALT"]
        .filter((k) => !named.has(k))
        .filter((k) => e.graded.find((x) => x.test === k)?.abnormal)
        .map((k) => faName(k));

      // ⚠️ رشته‌های `need` عیناً همان‌هایی‌اند که به suggest می‌روند و باید با
      //    کلیدهای SUGGEST_TESTS مو‌به‌مو یکی بمانند، وگرنه alreadyMeasured
      //    تطابق نمی‌دهد و آزمایشی که روی برگه هست دوباره «درخواست» می‌شود.
      //    پس برای متن فقط کنارِ هم چیده می‌شوند، نه بازنویسی.
      const missingText =
        need.length === 3
          ? "هیچ‌کدام از این سه روی برگهٔ شما نیست"
          : `${need.join("، ")} روی برگهٔ شما ${need.length > 1 ? "نیستند" : "نیست"}`;
      const ask = need.length > 1 ? "درخواستشان" : "درخواستش";
      const trio = !done.length
        ? `${missingText} و ${ask} قدمِ بعدی است.`
        : need.length
        ? `از این سه، ${done.join("؛ ")}. ${missingText} و ${ask} قدمِ بعدی است.`
        : `هر سه روی برگهٔ شما هست: ${done.join("؛ ")}.`;

      const haptoCaveat =
        hapto === "normal" || hapto === "high"
          ? " توجه: هاپتوگلوبینِ طبیعی یا بالا همولیز را قطعاً رد نمی‌کند — این پروتئین در عفونت و التهاب بالا می‌رود و می‌تواند افتِ ناشی از همولیز را بپوشاند."
          : "";

      const urgent = hgb === "low";

      return {
        pattern: "ldh_high_nonspecific",
        urgency: urgent ? "this_week" : "routine",
        headline: "LDH بالاتر از حد طبیعی است؛ این عدد به‌تنهایی یک بیماری را مشخص نمی‌کند",
        must_say:
          "LDH آنزیمی است که تقریباً در همهٔ سلول‌های بدن وجود دارد و هر بار سلولی آسیب ببیند وارد خون می‌شود. " +
          "برای همین بالا بودنش به‌تنهایی تشخیص نیست: آسیبِ عضلانی، بیماریِ کبد، سکتهٔ قلبی، آسیبِ کلیه، بدخیمی و " +
          "شکسته‌شدنِ گلبول‌های قرمز (همولیز) همه می‌توانند آن را بالا ببرند. کارِ درست این است که منبعش مشخص شود، " +
          "نه اینکه از روی همین یک عدد نتیجه‌گیری شود. " +
          anemiaLine +
          " برای پاسخ به مهم‌ترین پرسش — اینکه آیا گلبول‌های قرمز در حال شکسته‌شدن‌اند یا نه — سه آزمایش با هم خوانده می‌شوند: " +
          "هاپتوگلوبین، شمارشِ رتیکولوسیت، و بیلی‌روبینِ غیرمستقیم. " +
          trio +
          haptoCaveat +
          (others.length ? ` ${others.join(". ")}.` : "") +
          (leftover.length ? ` ${leftover.join(" و ")} هم خارج از محدودهٔ مرجع است و در این توضیح دربارهٔ آن نتیجه‌گیری نشده.` : "") +
          " گسترشِ خونِ محیطی (اسمیر) مرحلهٔ بعدی است، پس از آنکه این سه آزمایش همولیز را تأیید کردند — نه هم‌زمان با آن‌ها.",
        action: urgent
          ? "این هفته با پزشک وقت بگیرید و این برگه را همراه ببرید."
          : "این نتیجه را با پزشک خود در میان بگذارید تا آزمایش‌های بالا درخواست شود.",
        suggest: need.length ? need : [],
        warnings: [
          "LDHِ بالا به‌تنهایی نه تشخیص است و نه لزوماً نشانهٔ بیماریِ جدی. تا وقتی منبعش مشخص نشده، از روی آن دربارهٔ خودتان نتیجه‌گیری نکنید.",
        ],
      };
    },
  }];

/**
 * آیا قاعدهٔ همولیز روی همین پنل فعال می‌شود؟
 *
 * ⚠️ عمداً از خودِ قاعده پرسیده می‌شود و منطقش کپی نمی‌شود. کپی می‌کرد، اولین
 *    تغییرِ آستانه در hemolysis_pattern این دو را واگرا می‌کرد و بیمار دو متنِ
 *    متناقض دربارهٔ یک عدد می‌خواند — یا هیچ‌کدام فعال نمی‌شد و LDH دوباره به
 *    سکوت می‌افتاد. تابع در زمانِ فراخوانی اجرا می‌شود، پس ارجاع به آرایه‌ای که
 *    پایین‌تر از تعریفِ خودش کامل شده مشکلی ندارد.
 */
function hemolysisRuleFires(e) {
  const r = RULES_HEMATOLOGY.find((x) => x.id === "hemolysis_pattern");
  return r ? r.match(e) : false;
}

/**
 * specs/008 (clarify) — آیا یکی از مالکانِ تصویرِ تالاسمی فعال است؟ hba2_elevated فقط وقتی حرف می‌زند که هیچ‌کدام
 * فعال نباشد؛ خودِ matchِ همان قاعده‌ها پرسیده می‌شود، نه کپیِ آستانه‌شان (M91e، همان شکلِ hemolysisRuleFires).
 */
const THAL_OWNER_IDS = new Set(["thal_trait_no_anemia", "microcytic_anemia", "microcytosis_no_anemia"]);
function thalOwnerFires(e) {
  return RULES_HEMATOLOGY.some((x) => THAL_OWNER_IDS.has(x.id) && x.match(e));
}

/** specs/008: «آیا آن قاعده فعال است» با matchِ زنده — برای microcytosis_no_anemia در برابرِ thal_trait_no_anemia. */
function ruleFiresById(e, id) {
  const r = RULES_HEMATOLOGY.find((x) => x.id === id);
  return r ? !!r.match(e) : false;
}
