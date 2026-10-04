// ============================================================
// patterns_p73_gaps.js — شکاف‌های پوششِ تک‌آزمایشی (P73، ۲۰۲۶-۱۰-۰۳)
// ------------------------------------------------------------
// ۱۲ ترکیبِ «کلید×جهت» که در ممیزیِ لایهٔ ۱ (P72) فقط «توضیحِ آماده نداریم» می‌گرفتند (N1/N18):
//   HCT↑، RBC↑، BILI_T↑، CK↑، ALB↓، FERRITIN↑، TSAT↑، T4 (هر دو جهت)، HCO3↓، PCT↑، NH3↑، Hb↓ تنها.
// ده قاعده؛ هر کدام آستانه‌اش را از یک منبعِ ثبت‌شده در guidelines.js می‌گیرد (کنارِ هر قاعده نوشته شده).
// ⚠️ منبع‌ها «باز» شدند مگر جایی که صریحاً نوشته «خلاصهٔ ثانویه». هیچ‌کدام تأییدِ بازبینِ انسانی نیست (MEDICAL_RULES.md P73).
// ⚠️ هیچ عددِ تازه‌ای اینجا ساخته نشده؛ فوریت از levelGrade (CTCAE/شدتِ موتور) یا از آستانهٔ منبع می‌آید.
// ⚠️ هر قاعده فقط وقتی فعال می‌شود که مالکِ قبلیِ همان آزمایش فعال نباشد (N20: دو یافته دربارهٔ یک عدد ممنوع).
//    مالک‌ها صریحاً فهرست شده‌اند، نه با «قاعده این کلید را خواند» (N18: خواندن ≠ گفتن) — `M313` وجودشان را می‌سنجد.
// ⚠️ هر جمله‌ای که از آزمایشِ دیگر حرف می‌زند سه‌حالته است (بالا/پایین/طبیعی/غایب) — `comp()` (N4، M156).
// ============================================================
import { levelGrade, anemiaSeverityFa, infantAnemiaNoGrade } from "./patterns_utils.js";
import { isNeonate } from "./neonatal.js";

const g = (e, k) => e.graded?.find((x) => x.test === k);
const hi = (x) => !!(x?.abnormal && x.dir === "high");
const lo = (x) => !!(x?.abnormal && x.dir === "low");

// N20: زمان‌بندیِ جمله از خودِ urgency می‌آید.
// کلیدِ آزمایش‌ها که به comp() می‌روند: ثابتِ سطحِ ماژول، نه literal داخلِ build — M38 هر literalِ داخلِ build را «متنِ کاربر» می‌شمارد.
const K = {
  MCV: "MCV", HGB: "HGB", BILI_D: "BILI_D", CREAT: "CREAT", FERRITIN: "FERRITIN", TSAT: "TSAT", CRP: "CRP_Q",
  TSH: "TSH", FT4: "FT4", WBC: "WBC", ALT: "ALT", AST: "AST", ALP: "ALP",
};

const ACT = {
  routine: "در نوبتِ عادی با پزشک مطرح کنید.",
  this_week: "این هفته با پزشک مطرح کنید.",
  emergency: "همین حالا به اورژانس مراجعه کنید.",
};

// فوریتی که تورِ «unmatched_abnormal» تا امروز به همین آزمایش می‌داد: critical ⇒ emergency، marked/G≥3 ⇒ this_week، بقیه routine.
// عمداً کپیِ همان منطق (patterns.js، تور ایمنی): قاعدهٔ تازه نباید فوریتِ امروزِ یک عدد را پایین بیاورد (M129: بیلی‌روبین ۱۴ ⇒ اورژانس).
// استثنا (همان تور): بیلی‌روبینِ نوزادِ < ۲۸ روز با بازهٔ بزرگسال سنجیده می‌شود، پس «بحرانی» شمرده نمی‌شود.
function netUrgency(e, x, neoBili = false) {
  if (x?.level === "critical" && !neoBili) return "emergency";
  if (!neoBili && (x?.level === "marked" || x?.level === "critical" || levelGrade(x) >= 3)) return "this_week";
  return "routine";
}

// سقفِ بازه از رشتهٔ «55–170» (en dash) — عددِ جدا از refs.js نمی‌سازیم.
const upperLimit = (x) => {
  const n = String(x?.range ?? "").split(/[–-]/).map(Number).filter(Number.isFinite);
  return n.length >= 2 ? n[n.length - 1] : null;
};

// سه‌حالتهٔ N4: غایب / طبیعی / بالا-پایین. فقط برای اشاره به آزمایشِ دیگر.
function comp(e, key, fa) {
  const x = g(e, key);
  if (!x) {
    return e.ungraded?.[key] || e.noRef?.includes(key)
      ? `${fa} روی برگه هست ولی بازهٔ مرجعِ قابل‌اتکا ندارد، پس اینجا ارزیابی نشد.`
      : `${fa} روی این برگه نیست.`;
  }
  if (!x.abnormal) return `${fa} ${x.value} و در محدودهٔ طبیعی است.`;
  return `${fa} ${x.value} است و ${x.dir === "high" ? "بالاتر" : "پایین‌تر"} از حد طبیعی (${x.range}).`;
}

// ── مالک‌ها: قاعده‌هایی که واقعاً دربارهٔ همان عدد حرف می‌زنند ──
export const P73_OWNERS = {
  erythro: ["erythrocytosis", "erythrocytosis_who_screen", "thal_trait_no_anemia", "microcytosis_no_anemia", "rbc_indices_implausible"],
  bilirubin: ["bilirubin_pattern", "bilirubin_emergency", "hemolysis_pattern", "cirrhosis_pattern"],
  ck: ["rhabdomyolysis_pattern", "myoglobin_abnormal", "ckmb_high", "troponin_positive", "troponin_hs_above_99th", "liver_pattern"],
  albumin: ["total_protein_abnormal", "cirrhosis_pattern", "nephrotic_pattern"],
  iron: ["iron_deficiency_panel", "anemia_chronic_disease"],
  hco3: ["severe_acidosis", "high_anion_gap", "normal_ag_acidosis", "dka_pattern", "hhs_pattern"],
  pct: ["sepsis_markers"],
  ammonia: ["hyperammonemia"],
  anemia: [
    "severe_anemia_crisis", "macrocytic_anemia", "anemia_macrocytic_mds", "microcytic_anemia", "normocytic_anemia",
    "pancytopenia", "iron_deficiency_panel", "anemia_chronic_disease", "spherocytosis_likely", "overt_b12_deficiency",
    "mds_suspicion", "acute_leukemia_suspicion", "leukocytosis_with_cytopenia", "reactive_leukocytosis_with_cytopenia",
    "maha_ttp_suspicion", "hemolysis_pattern", "hgb_sex_unknown", "rbc_indices_implausible", "low_rbc_hct_without_anemia",
  ],
};

// patterns.js پس از ساختنِ RULES این را صدا می‌زند (import مستقیمِ RULES دور می‌ساخت و در TDZ می‌خورد).
let ALL = [];
export function bindP73Owners(rules) { ALL = rules; }
function anyFires(e, ids) {
  for (const id of ids) {
    const r = ALL.find((x) => x?.id === id);
    if (!r) continue;
    try { if (r.match(e)) return true; } catch { /* قاعدهٔ مالک شکست خورد ⇒ مالک حساب نمی‌شود */ }
  }
  return false;
}

// ── ۱) HCT↑ / RBC↑ — WHO 2016 (معیارِ بزرگِ اولِ پلی‌سیتمی ورا): Hct > 49٪ مرد / > 48٪ زن ──
const hctRbcHigh = {
  id: "hct_rbc_high",
  // Hbِ پایین کنارِ HCT/RBCِ بالا ناهم‌خوان است (پرخونی با کم‌خونی نمی‌آید)؛ آن حالت را کم‌خونی/N18 دارد، نه این قاعده (M179c، M189c، M191b).
  match: (e) => (hi(g(e, "HCT")) || hi(g(e, "RBC"))) && !lo(g(e, "HGB")) && !anyFires(e, P73_OWNERS.erythro),
  build: (e) => {
    const hct = g(e, "HCT"), rbc = g(e, "RBC");
    const hctHi = hi(hct), rbcHi = hi(rbc);
    const cut = e.sex === "M" ? 49 : e.sex === "F" ? 48 : null;
    const urgency = hctHi ? "this_week" : "routine";
    const hctText = hctHi
      ? `هماتوکریت شما ${hct.value}٪ است (حد طبیعی ${hct.range}). هماتوکریت یعنی چند درصدِ حجمِ خون را گلبول‌های قرمز تشکیل می‌دهند؛ مقدارِ بالا یعنی خون غلیظ‌تر از معمول است. ` +
        (cut == null
          ? "آستانهٔ سازمان جهانی بهداشت (۲۰۱۶) برای غربالگریِ پرخونیِ مغز استخوان (پلی‌سیتمی ورا) ۴۹٪ در مرد و ۴۸٪ در زن است و جنسِ شما روی برگه معلوم نیست. "
          : hct.value > cut
            ? `این عدد از آستانهٔ ${cut}٪ هم بالاتر است که سازمان جهانی بهداشت (۲۰۱۶) برای غربالگریِ پلی‌سیتمی ورا به کار می‌برد. `
            : `این عدد از بازهٔ آزمایشگاه بالاتر است ولی از آستانهٔ ${cut}٪ سازمان جهانی بهداشت برای غربالگریِ پلی‌سیتمی ورا پایین‌تر است. `)
      : "";
    const rbcText = rbcHi
      ? `تعداد گلبول قرمز ${rbc.value} است (حد طبیعی ${rbc.range}) و بالاتر از حد طبیعی است. `
      : "";
    return {
      pattern: "hct_rbc_high",
      urgency,
      sources: ["WHO_MPN_2016"],
      headline: hctHi ? "هماتوکریت شما بالاتر از حد طبیعی است" : "تعداد گلبول قرمز شما بالاتر از حد طبیعی است",
      must_say:
        hctText + rbcText +
        "شایع‌ترین علت‌ها کم‌آبی، سیگار، آپنهٔ خواب، زندگی در ارتفاع و بعضی داروها (مثل تستوسترون) هستند؛ کمتر پیش می‌آید علت یک اختلالِ مغز استخوان باشد. " +
        (rbcHi && !hctHi
          ? `اگر گلبول‌ها کوچک باشند، صفتِ تالاسمی هم می‌تواند تعدادشان را بالا ببرد؛ ${comp(e, K.MCV, "حجم گلبول قرمز (MCV)")} `
          : "") +
        comp(e, K.HGB, "هموگلوبین") + (hctHi ? " هماتوکریتِ خیلی بالا خون را غلیظ می‌کند و خطرِ لخته را بالا می‌برد." : ""),
      action: ACT[urgency] + " اگر کم‌آب بودید، آزمایش پس از آب‌رسانیِ کافی تکرار شود.",
      suggest: ["تکرار CBC", "اریتروپویتین"],
      warnings: hctHi
        ? ["اگر سردردِ شدید، تاری دید، دردِ قفسهٔ سینه، تنگیِ نفس یا ضعف و بی‌حسیِ ناگهانی دارید، همان لحظه به اورژانس بروید."]
        : [],
    };
  },
};

// ── ۲) بیلی‌روبین تامِ بالا تنها — ACG 2017: بیلی‌روبینِ بالا ⇒ تفکیکِ مستقیم/غیرمستقیم و مقایسه با الگوی آنزیم‌ها ──
const bilirubinTotalAlone = {
  id: "bilirubin_total_alone",
  match: (e) => hi(g(e, "BILI_T")) && !anyFires(e, P73_OWNERS.bilirubin),
  build: (e) => {
    const b = g(e, "BILI_T");
    const urgency = netUrgency(e, b, isNeonate(e.age));
    const enz = [g(e, "ALT"), g(e, "AST"), g(e, "ALP")];
    const allNormal = enz.every((x) => x && !x.abnormal);
    const anyAbn = enz.some((x) => x?.abnormal);
    return {
      pattern: "bilirubin_total_alone",
      urgency,
      blocks_others: urgency === "emergency",   // همان رفتارِ تورِ بی‌توضیح برای عددِ بحرانی
      sources: ["ACG_LIVER"],
      headline: "بیلی‌روبینِ شما بالاتر از حد طبیعی است",
      must_say:
        `بیلی‌روبین تام شما ${b.value} است (حد طبیعی ${b.range}). بیلی‌روبین رنگدانه‌ای است که از تجزیهٔ گلبول‌های قرمز ساخته می‌شود، در کبد پردازش می‌شود و با صفرا دفع می‌شود؛ پس بالا بودنش سه دسته علت دارد: تخریبِ بیش‌ازحدِ گلبول قرمز، کندیِ پردازش در کبد (مثلاً سندرم ژیلبر که شایع و بی‌خطر است)، یا بیماری یا انسدادِ کبد و مجاریِ صفراوی. ` +
        "برای تفکیک، اولین قدم سنجشِ بیلی‌روبینِ مستقیم و غیرمستقیم و مقایسه با آنزیم‌های کبدی است. " +
        [comp(e, K.BILI_D, "بیلی‌روبین مستقیم"), comp(e, K.ALT, "ALT"), comp(e, K.AST, "AST"), comp(e, K.ALP, "ALP")].join(" ") + " " +
        (allNormal
          ? "طبیعی بودنِ هر سه آنزیم، افزایشِ جدا از بیلی‌روبین را بیشتر به علتِ غیرکبدی یا ژیلبر نزدیک می‌کند، ولی اثباتش نمی‌کند."
          : anyAbn
            ? "چون آنزیم‌های کبد هم خارج از محدوده‌اند، ارزیابیِ کبد و مجاریِ صفراوی اولویت دارد."
            : ""),
      action: ACT[urgency],
      suggest: ["بیلی‌روبین مستقیم و غیرمستقیم", "AST", "ALP"],
      warnings: ["اگر زردیِ چشم یا پوست، ادرارِ تیره همراه با مدفوعِ کم‌رنگ، تب یا دردِ شکم دارید، منتظرِ نوبت نمانید و همان روز مراجعه کنید."],
    };
  },
};

// ── ۳) CK↑ تنها — رابدومیولیز: CK > ۵×ULN (Merck/MSD؛ مرورِ Chavez, Crit Care 2016 فقط از خلاصهٔ ثانویه) ──
const ckElevatedAlone = {
  id: "ck_elevated_alone",
  match: (e) => hi(g(e, "CK")) && !anyFires(e, P73_OWNERS.ck),
  build: (e) => {
    const ck = g(e, "CK");
    const ul = upperLimit(ck);
    const mult = ul ? ck.value / ul : null;
    const big = mult != null && mult >= 5;
    // کفِ فوریت = همان نگاشتِ تورِ بی‌توضیح (CK ۳۰۰۰ «critical» ⇒ emergency بود)؛ ۵×ULN فقط بالا می‌برد، پایین نمی‌آورد (N29).
    const netU = netUrgency(e, ck, isNeonate(e.age));
    const urgency = netU === "emergency" ? "emergency" : big || netU === "this_week" ? "this_week" : "routine";
    return {
      pattern: "ck_elevated_alone",
      urgency,
      blocks_others: urgency === "emergency",
      sources: ["MERCK_PRO"],
      headline: big ? "CK شما چند برابرِ حد طبیعی است" : "CK شما کمی بالاتر از حد طبیعی است",
      must_say:
        `CK شما ${ck.value} است (حد طبیعی ${ck.range})` + (big ? `، یعنی حدودِ ${Math.round(mult)} برابرِ حدِ بالای طبیعی` : "") + ". CK آنزیمی در عضله‌هاست که با آسیبِ عضله به خون می‌ریزد. " +
        (big
          ? "وقتی از حدودِ ۵ برابرِ حدِ بالا بیشتر شود، در حدِ آسیبِ قابل‌توجهِ عضله (رابدومیولیز) است که می‌تواند به کلیه آسیب بزند. "
          : "") +
        "شایع‌ترین علت‌ها ورزشِ سنگین یا ناآشنا، ضربه، تزریقِ عضلانی، تشنج، گرمازدگی و داروهایی مثل استاتین‌ها هستند؛ " +
        (big ? "" : "اغلب با استراحتِ چند روزه و تکرارِ آزمایش پایین می‌آید. ") +
        comp(e, K.CREAT, "کراتینین (برای سنجشِ اثر بر کلیه)"),
      action: ACT[urgency],
      suggest: ["تکرار CK", "کراتینین"],
      warnings: big
        ? ["اگر ادرارِ تیره (رنگِ چای یا کولا)، دردِ شدیدِ عضلانی، ضعفِ شدید یا کم‌شدنِ ادرار دارید، منتظرِ نوبت نمانید و همان روز به اورژانس بروید."]
        : [],
    };
  },
};

// ── ۴) آلبومین↓ تنها — Soeters, JPEN 2019: نشانه است نه بیماری؛ درمان = رفعِ علت (التهاب، کبد، دفعِ پروتئین، سوءتغذیه) ──
const albuminLowAlone = {
  id: "albumin_low_alone",
  match: (e) => lo(g(e, "ALB")) && !anyFires(e, P73_OWNERS.albumin),
  build: (e) => {
    const a = g(e, "ALB");
    const urgency = netUrgency(e, a);
    return {
      pattern: "albumin_low_alone",
      urgency,
      blocks_others: urgency === "emergency",   // همان رفتارِ تورِ بی‌توضیح برای عددِ بحرانی
      sources: ["SOETERS_HYPOALB_2019"],
      headline: "آلبومینِ شما پایین‌تر از حد طبیعی است",
      must_say:
        `آلبومین شما ${a.value} است (حد طبیعی ${a.range}). آلبومین مهم‌ترین پروتئینِ خون است و آب را داخل رگ نگه می‌دارد. پایین بودنش خودش بیماری نیست؛ نشانه‌ای است از یک علتِ دیگر: التهاب یا بیماریِ مزمن و عفونت (شایع‌ترین علت)، بیماریِ کبد (کبد آلبومین می‌سازد)، دفعِ پروتئین از راهِ کلیه یا روده، سوءتغذیه، و رقیق‌شدنِ خون با مایعاتِ زیاد. ` +
        "آلبومین به‌تنهایی نمی‌گوید کدام‌یک؛ پزشک معمولاً پروتئینِ ادرار، آنزیم‌های کبد، CRP و وضعیتِ تغذیه را کنارش می‌بیند. درمانِ اصلی رفعِ علت است، نه تزریقِ آلبومین.",
      action: ACT[urgency],
      suggest: ["CRP", "AST"],
      warnings: ["اگر تورمِ پا یا صورت، افزایشِ وزنِ ناگهانی، بزرگ‌شدنِ شکم یا تنگیِ نفس دارید، زودتر مراجعه کنید."],
    };
  },
};

// ── ۵+۶) فریتین↑ / TSAT↑ — EASL 2022: TSAT > 45٪ و فریتین > 200 (زن) | TSAT > 50٪ و فریتین > 300 (مرد) ⇒ بارِ آهنِ احتمالی ──
const ironMarkersHigh = {
  id: "iron_markers_high",
  match: (e) => (hi(g(e, "FERRITIN")) || hi(g(e, "TSAT"))) && !anyFires(e, P73_OWNERS.iron),
  build: (e) => {
    const fer = g(e, "FERRITIN"), ts = g(e, "TSAT");
    const feHi = hi(fer), tsHi = hi(ts);
    const feCut = e.sex === "M" ? 300 : e.sex === "F" ? 200 : null;
    const tsCut = e.sex === "M" ? 50 : e.sex === "F" ? 45 : null;
    const provisional = feCut != null && fer && ts && fer.value > feCut && ts.value > tsCut;
    const urgency = provisional ? "this_week" : "routine";
    return {
      pattern: "iron_markers_high",
      urgency,
      sources: ["EASL_HH_2022"],
      headline: feHi && tsHi ? "فریتین و اشباعِ ترانسفرینِ شما بالاترند" : feHi ? "فریتینِ شما بالاتر از حد طبیعی است" : "اشباعِ ترانسفرینِ شما بالاتر از حد طبیعی است",
      must_say:
        (feHi
          ? `فریتین شما ${fer.value} است (حد طبیعی ${fer.range}). فریتین علاوه بر ذخیرهٔ آهن، با التهاب، عفونت، بیماریِ کبد (مثل کبد چرب یا الکل)، چاقی و سندرمِ متابولیک و بعضی سرطان‌ها هم بالا می‌رود؛ در بیشترِ موارد علتش همین‌هاست نه انباشتِ آهن. `
          : "") +
        (tsHi
          ? `اشباعِ ترانسفرین شما ${ts.value}٪ است (حد طبیعی ${ts.range}). این عدد نشان می‌دهد چند درصد از ظرفیتِ آهن‌بریِ خون پر است و برخلافِ فریتین با التهاب بالا نمی‌رود؛ ولی تغییرپذیریِ زیادی دارد (مصرفِ قرصِ آهن و خون‌گیریِ غیرناشتا اثر می‌گذارند)، پس برای تفسیر بهتر است ناشتا و بدونِ مکملِ آهن تکرار شود. `
          : "") +
        (!feHi ? comp(e, K.FERRITIN, "فریتین") + " " : "") + (!tsHi ? comp(e, K.TSAT, "اشباعِ ترانسفرین") + " " : "") +
        (provisional
          ? `هر دو عدد از آستانه‌های راهنمای EASL (اشباعِ ترانسفرین > ${tsCut}٪ و فریتین > ${feCut}) بالاترند، که یعنی بارِ آهنِ احتمالی (مثلاً هموکروماتوز ارثی)؛ قدمِ بعد آزمایشِ ژنِ HFE و بررسیِ کبد است. `
          : feHi && tsHi
            ? "وقتی هر دو بالا باشند، بررسیِ بارِ آهن (و آزمایشِ ژنِ HFE اگر آستانه‌های راهنما رد شود) مطرح می‌شود؛ جنسِ شما روی برگه معلوم نیست پس آستانه‌ها را نمی‌سنجیم. "
            : "") +
        comp(e, K.CRP, "CRP"),
      action: ACT[urgency],
      suggest: provisional ? ["پنل کامل آهن", "ژن HFE (هموکروماتوز)"] : ["پنل کامل آهن"],
      warnings: feHi ? ["اگر تب، لرز، کاهشِ وزنِ ناخواسته، زردی یا دردِ شکم دارید، زودتر مراجعه کنید."] : [],
    };
  },
};

// ── ۷) T4 تام (هر دو جهت) — ATA 2016: T4 تام به پروتئینِ حامل (TBG)، بارداری، بیوتین حساس است؛ تفسیر با TSH و FT4 ──
const totalT4Abnormal = {
  id: "total_t4_abnormal",
  match: (e) => !!g(e, "T4")?.abnormal,
  build: (e) => {
    const t = g(e, "T4");
    const high = t.dir === "high";
    const tshFt4Abn = !!(g(e, "TSH")?.abnormal || g(e, "FT4")?.abnormal);
    return {
      pattern: "total_t4_abnormal",
      urgency: "routine",
      sources: ["ATA_HYPER_2016"],
      headline: `T4 تامِ شما ${high ? "بالاتر" : "پایین‌تر"} از حد طبیعی است`,
      must_say:
        `T4 تام شما ${t.value} است (حد طبیعی ${t.range}) و ${high ? "بالاتر" : "پایین‌تر"} از حد طبیعی است. T4 تام مجموعِ T4ِ آزاد و T4ِ چسبیده به پروتئین‌های حامل است (بیش از ۹۹٪ آن چسبیده است)؛ پس هم با بیماریِ تیروئید و هم با مقدارِ پروتئینِ حامل (TBG) عوض می‌شود. ` +
        (high
          ? "بارداری، استروژن و بعضی حالت‌های ارثی TBG را بالا می‌برند و T4 تام را بالا نشان می‌دهند بی‌آنکه تیروئید پرکار باشد؛ مکملِ بیوتین هم می‌تواند نتیجه را کاذب کند. " +
            (e.pregnant === true ? "چون باردار هستید، T4 تام به‌طور طبیعی از بازهٔ عموم بالاتر می‌رود. " : "")
          : "بیماریِ شدید، از دست رفتنِ پروتئین (مثلاً در بیماریِ کلیه) و بعضی داروها آن را پایین می‌آورند؛ البته کم‌کاریِ تیروئید هم یک علت است. ") +
        "برای تفسیرِ درست TSH و T4ِ آزاد (FT4) لازم‌اند: " + comp(e, K.TSH, "TSH") + " " + comp(e, K.FT4, "FT4"),
      action: tshFt4Abn ? "" : "در نوبتِ عادی با پزشک مطرح کنید و آزمایش TSH و FT4 را بخواهید.",
      suggest: ["TSH و FT4"],
      warnings: [],
    };
  },
};

// ── ۸) HCO3↓ متوسط (بالای آستانهٔ اورژانس) — KDIGO 2024: اسیدوزِ CKD ≤ 22؛ قلیا فقط < 18 ──
const bicarbonateLow = {
  id: "bicarbonate_low_moderate",
  match: (e) => lo(g(e, "HCO3")) && !anyFires(e, P73_OWNERS.hco3),
  build: (e) => {
    const h = g(e, "HCO3");
    // ۱۸ آستانهٔ KDIGOِ بزرگسال است؛ زیر ۱۶ سال بازهٔ کودکان از PED_REFS می‌آید و عددِ ثابت نمی‌خورد (N23).
    const adult = e.age == null || e.age >= 16;
    const urgency = adult && h.value < 18 ? "this_week" : "routine";
    return {
      pattern: "bicarbonate_low_moderate",
      urgency,
      sources: ["KDIGO_CKD"],
      headline: "بی‌کربناتِ خونِ شما پایین‌تر از حد طبیعی است",
      must_say:
        `بی‌کربنات خون شما ${h.value} است (حد طبیعی ${h.range}). بی‌کربنات «بافرِ» خون است و کاهشش یعنی ممکن است بدن اسیدِ اضافه داشته باشد (اسیدوزِ متابولیک). شایع‌ترین علت‌ها بیماریِ کلیه، اسهالِ شدید، کتواسیدوز (در دیابتِ کنترل‌نشده)، تجمعِ لاکتات و بعضی داروها یا مسمومیت‌هاست. ` +
        "راهنمای KDIGO در بیماریِ مزمنِ کلیه بی‌کربناتِ ۲۲ و کمتر را اسیدوز می‌شمارد. نمونه‌ای که دیر به آزمایشگاه برسد هم بی‌کربنات را کمی پایین نشان می‌دهد. " +
        "برای معلوم‌شدنِ علت، پزشک معمولاً pHِ خون، سدیم و کلر (برای شکافِ آنیونی)، کراتینین و قند و کتون را می‌خواهد. " +
        comp(e, K.CREAT, "کراتینین"),
      action: ACT[urgency],
      suggest: ["الکترولیت‌ها", "کراتینین و eGFR"],
      warnings: ["اگر تنفسِ تند و عمیق، تهوع و استفراغِ مداوم، خواب‌آلودگیِ غیرعادی یا گیجی دارید، همان لحظه به اورژانس بروید."],
    };
  },
};

// ── ۹) PCT بینابینی (≥ بازه و < ۲) — سازندهٔ کیت (B·R·A·H·M·S): 0.5–<2 «ممکن»؛ تکرار پس از ۶–۲۴ ساعت ──
const pctIntermediate = {
  id: "pct_intermediate",
  match: (e) => hi(g(e, "PCT_SEPSIS")) && !anyFires(e, P73_OWNERS.pct),
  build: (e) => {
    const p = g(e, "PCT_SEPSIS");
    return {
      pattern: "pct_intermediate",
      urgency: "this_week",
      sources: ["BRAHMS_PCT"],
      headline: "پروکلسی‌تونینِ شما کمی بالاتر از حد طبیعی است",
      must_say:
        `پروکلسی‌تونین (PCT) شما ${p.value} است (حد طبیعی ${p.range}). PCT پروتئینی است که در عفونت‌های باکتریاییِ منتشر در خون بالا می‌رود. مقدارِ ۰٫۵ تا کمتر از ۲ یعنی عفونتِ منتشر ممکن است، ولی حالت‌های دیگر (جراحی یا ضربهٔ اخیر، سوختگی، بیماریِ کلیه و گاهی التهاب‌های غیرعفونی) هم PCT را کمی بالا می‌برند؛ پس این عدد به‌تنهایی حکم نیست و با علائم و معاینه خوانده می‌شود. ` +
        "اگر نمونه خیلی زود پس از شروعِ عفونت گرفته شده باشد، توصیهٔ سازندهٔ کیت سنجشِ دوبارهٔ PCT پس از ۶ تا ۲۴ ساعت است. " +
        [comp(e, K.WBC, "گلبول سفید (WBC)"), comp(e, K.CRP, "CRP")].join(" "),
      action: ACT.this_week,
      suggest: ["تکرار PCT", "CRP", "CBC کامل با شمارش گلبول‌های سفید"],
      warnings: ["اگر تب، لرز، تپشِ قلبِ تند یا تنگیِ نفس دارید، منتظرِ نوبت نمانید و همان روز به پزشک یا اورژانس مراجعه کنید."],
    };
  },
};

// ── ۱۰) NH3↑ خفیف (زیرِ آستانهٔ اورژانس) — AASLD/EASL 2014: آمونیاکِ بالا به‌تنهایی ارزشِ تشخیصی ندارد؛ نمونه‌گیری حساس است ──
const ammoniaMildHigh = {
  id: "ammonia_mild_high",
  match: (e) => hi(g(e, "NH3")) && !anyFires(e, P73_OWNERS.ammonia),
  build: (e) => {
    const a = g(e, "NH3");
    return {
      pattern: "ammonia_mild_high",
      urgency: "routine",
      sources: ["AASLD_EASL_HE_2014"],
      headline: "آمونیاکِ خونِ شما کمی بالاتر از حد طبیعی است",
      must_say:
        `آمونیاکِ خون شما ${a.value} است (حد طبیعی ${a.range}). آمونیاک را کبد از خون پاک می‌کند. راهنمای انجمن‌های کبد (AASLD و EASL) می‌گوید آمونیاکِ بالا به‌تنهایی برای تشخیص یا مرحله‌بندیِ آسیبِ مغزیِ ناشی از کبد (انسفالوپاتیِ کبدی) ارزشی ندارد و قضاوت بر پایهٔ علائم است. ` +
        "نتیجه به شیوهٔ نمونه‌گیری هم حساس است: نمونه باید فوراً روی یخ برود و ظرفِ ۱۵ دقیقه جدا شود، وگرنه عدد کاذب بالا می‌رود (در دمای اتاق ظرفِ دو ساعت می‌تواند دو برابر شود)؛ مشت‌کردنِ دست، بستنِ تورنیکه و سیگار هم اثر دارند. " +
        "پس این عدد را با علائم و آنزیم‌های کبد بخوانید و اگر شک دارید با نمونه‌گیریِ درست تکرارش کنید. " +
        [comp(e, K.ALT, "ALT"), comp(e, K.AST, "AST")].join(" "),
      action: ACT.routine,
      suggest: ["تکرار آمونیاک با نمونه‌گیریِ استاندارد"],
      warnings: ["اگر گیجی، خواب‌آلودگیِ غیرعادی، تغییرِ ناگهانیِ رفتار یا ناتوانی در تمرکز دارید (به‌ویژه با بیماریِ کبد)، همان روز به اورژانس بروید."],
    };
  },
};

// ── ۱۱) Hb↓ تنها (بی‌شاخصِ MCV؛ مسیرِ ورودِ دستی) — WHO: آستانهٔ کم‌خونی و شدت (بزرگسالِ غیرباردار) ──
// بازبینیِ ۲۰۲۶-۱۰-۰۴: همان تابعِ مشترکِ patterns_utils.js؛ سنِ نامعلوم هنوز درجه نمی‌دهد (N4: درجه از سنِ حدسی نمی‌آید).
function whoSeverity(e, hb) {
  return e.age == null ? null : anemiaSeverityFa(e, hb);
}
const anemiaHbAlone = {
  id: "anemia_hb_alone",
  match: (e) => lo(g(e, "HGB")) && !anyFires(e, P73_OWNERS.anemia),
  build: (e) => {
    const hb = g(e, "HGB");
    // شیرخوارِ زیرِ ۶ ماه درجه ندارد ⇒ دست‌کم this_week (بازبینیِ ۲۰۲۶-۱۰-۰۴)؛ اورژانسِ عددِ بحرانی دست‌نخورده.
    let urgency = netUrgency(e, hb);
    if (urgency === "routine" && infantAnemiaNoGrade(e)) urgency = "this_week";
    const sev = whoSeverity(e, hb.value);
    return {
      pattern: "anemia_hb_alone",
      urgency,
      blocks_others: urgency === "emergency",   // همان رفتارِ تورِ بی‌توضیح برای عددِ بحرانی
      sources: ["WHO_ANAEMIA"],
      headline: "هموگلوبینِ شما پایین‌تر از حد طبیعی است (کم‌خونی)",
      must_say:
        `هموگلوبین شما ${hb.value} است (حد طبیعی ${hb.range})؛ یعنی کم‌خونی. ` +
        (sev ? `بر پایهٔ طبقه‌بندیِ سازمان جهانی بهداشت برای سن${e.pregnant ? " و بارداریِ" : "ِ"} شما، این کم‌خونیِ ${sev} است. ` : "") +
        "هموگلوبین به‌تنهایی علت را نمی‌گوید. برای پیدا کردنِ علت معمولاً حجمِ گلبول قرمز (MCV) و بقیهٔ شاخص‌های CBC، فریتین (ذخیرهٔ آهن)، رتیکولوسیت، و در صورتِ لزوم B12 و فولات خواسته می‌شود؛ چون درمانِ هر نوع فرق دارد و بدونِ دانستنِ علت نباید خودسرانه قرصِ آهن شروع کرد. " +
        comp(e, K.MCV, "حجم گلبول قرمز (MCV)") + " " + comp(e, K.FERRITIN, "فریتین"),
      action: ACT[urgency],
      suggest: ["شاخص‌های گلبول قرمز (MCV، MCH)", "فریتین", "رتیکولوسیت"],
      warnings: ["اگر ضعفِ شدید، تپشِ قلبِ تند، تنگیِ نفس، سرگیجه یا دردِ قفسهٔ سینه دارید، یا خونریزی (مدفوعِ سیاه، قاعدگیِ بسیار زیاد) دارید، زودتر مراجعه کنید."],
    };
  },
};

export const RULES_P73_GAPS = [
  hctRbcHigh, bilirubinTotalAlone, ckElevatedAlone, albuminLowAlone, ironMarkersHigh,
  totalT4Abnormal, bicarbonateLow, pctIntermediate, ammoniaMildHigh, anemiaHbAlone,
];
