import { val, smearAxis, smearLeukemicSentence, ungradedFa, rbcMorphOf } from "./patterns_utils.js";
import { faName } from "./names.js";

// ==========================================
// الگوهای بدخیمی و اختلالات شدید خونی (NCCN, WHO, ASH)
// شامل: MDS, AML/ALL, CLL, CML, ITP, TTP
// ==========================================

// P58 پرسش ۱ — WBC به ×10³/µL (واحدِ موتور). بالاتر از این و بالاتر از بازهٔ سنی = «لکوسیتوزِ بارز».
export const MARKED_LEUKOCYTOSIS_K = 20;

// P91: حدِ لنفوسیتِ iwCLL 2018 (≥ ۵×۱۰⁹/L؛ قاعده پیش‌تر هم > ۵۰۰۰ بود) و مرزهای سیتوپنیِ مرحلهٔ III/IV ِ Rai (Hb < ۱۱ g/dL، PLT < ۱۰۰).
const CLL_LYMPH_ABS = 5000, RAI_HGB_BELOW = 11, RAI_PLT_BELOW = 100;
// P95: مرزِ ارجاعِ هماتولوژیِ مسیرِ محلیِ بریتانیا (South Tees؛ گایدلاینِ بین‌المللی نیست) — لنفوسیت > ۱۰ ×۱۰⁹/L.
const CLL_REFER_ABS = 10000;
function cllCytopeniaFa(e) {
  const out = [];
  const hb = e.graded.find((g) => g.test === "HGB"), plt = e.graded.find((g) => g.test === "PLT");
  if (hb && hb.value < RAI_HGB_BELOW) out.push(`هموگلوبین ${hb.value} (پایین)`);
  if (plt && plt.value < RAI_PLT_BELOW) out.push(`پلاکت ${plt.value} (پایین)`);
  return out;
}

// P88 (N4): هموگلوبین/گلبول سفیدِ چاپ‌شده ولی بی‌نمره — بیرون از متنِ قاعده تا M38 کلیدها را متنِ بیمار نخواند.
// P91/P95: نشانگرهای همولیز برای maha_ttp_suspicion — یک فهرست برای match و build. هر نشانگرِ سنجیده در هر جهت جمله دارد (M156، N21).
// ⚠️ کلیدها عمداً همین‌جا هم به‌صورتِ رشته در بدنهٔ قاعده‌اند؟ نه — RULE_READS از منبعِ قاعده می‌خواند؛ گارد L28 پوششِ LDH را می‌سنجد.
const MAHA_MARK = [["LDH", "LDH", "high"], ["HAPTO", "هاپتوگلوبین", "low"], ["RETIC", "رتیکولوسیت", "high"],
  ["RETIC_ABS", "رتیکولوسیتِ مطلق", "high"], ["BILI_I", "بیلی‌روبین غیرمستقیم", "high"]];
export function mahaMarkers(e) {
  const support = [], other = [];
  // P96 (تصمیمِ بازبین ۲۰۲۶-۱۰-۰۶): شیستوسیتِ لام نشانگرِ مستقیمِ MAHA است. ≥ ۱٪ (ICSH 2012) یا «زیاد/متوسط» پشتیبان است؛ «کم/<۱٪/گزارش‌شده بی‌کمیت» فقط ذکر می‌شود.
  const sch = rbcMorphOf(e, "schistocytes");
  if (sch?.state === "present") {
    const q = sch.pct != null ? `شیستوسیت ${sch.pct}٪` : `شیستوسیت («${sch.raw}»)`;
    if (sch.qty === "significant") support.push(`${q} — قطعاتِ گلبولِ قرمز روی لام`);
    else other.push(`${q} (کمتر از حدِ معنادار یا بی‌کمیت)`);
  }
  for (const [k, fa, hemolytic] of MAHA_MARK) {
    const g = e.graded.find((x) => x.test === k);
    if (!g) continue;
    if (g.abnormal && g.dir === hemolytic) support.push(`${fa} ${g.value} (${hemolytic === "high" ? "بالا" : "پایین"})`);
    else other.push(`${fa} ${g.value} (${!g.abnormal ? "طبیعی" : g.dir === "high" ? "بالا" : "پایین"})`);
  }
  return { support, other };
}

function otherLinesUngradedFa(e) {
  const parts = [ungradedFa(e, "HGB", "هموگلوبین"), ungradedFa(e, "WBC", "گلبول سفید")].filter(Boolean);
  return parts.length ? `؛ ${parts.join("؛ ")}، پس این‌که فقط پلاکت کم است یا رده‌های دیگر هم، باید با پزشک مرور شود` : "";
}

// ─── job fff90f58 (P58): جمله‌های مشترکِ دو سطحِ «لکوسیتوز + سیتوپنیِ شدید» ───
// «شدید» از خودِ acute_leukemia_suspicion پرسیده می‌شود — همان match با WBCی بالای دروازه‌اش (درسِ M91e). عددِ تازه‌ای نیست.
function severeCytopeniaArm(e) {
  const leuk = RULES_MALIGNANCY.find((r) => r.id === "acute_leukemia_suspicion");
  return leuk.match({ ...e, graded: e.graded.map((g) => (g.test === "WBC" ? { ...g, value: Infinity } : g)) });
}
// P96 (تصمیمِ بازبین ۲۰۲۶-۱۰-۰۶، [87]: WBC 22.2 · Hb 7.5↓ · PLT 549↑ · ESR 104 · CRP ++ ⇒ پیش‌تر اورژانسِ «افتِ رده‌های خون»): وقتی پلاکت *بالا* است،
//   تصویر «نارسایی تولید» نیست — ترومبوسیتوز کنارِ لکوسیتوز اغلب واکنشی است. «سیتوپنی» فقط وقتی معنا دارد که دست‌کم یک ردهٔ واقعاً پایین باشد و رده‌ای
//   هم‌زمان بالا نباشد؛ این حالت از سطحِ اورژانس به سطحِ ۲ (reactive_leukocytosis_with_cytopenia) می‌رود. شرطِ WBC > ۵۰ (acute_leukemia_suspicion) دست نمی‌خورد.
function thrombocytoticVariant(e) {
  const plt = e.graded.find((g) => g.test === "PLT");
  return !!(plt?.abnormal && plt.dir === "high");
}
function wbcCytoSentenceFa(w, hb, plt, ped) {
  const hi = Number(String(w.range).split("–")[1]);
  const times = Number.isFinite(hi) && hi > 0 ? ` (حدودِ ${(w.value / hi).toFixed(1)} برابرِ سقفِ آن)` : "";
  const low = [hb?.abnormal && hb.dir === "low" ? `هموگلوبین ${hb.value} (بازه ${hb.range})` : null,
    plt?.abnormal && plt.dir === "low" ? `پلاکت ${plt.value} (بازه ${plt.range})` : null].filter(Boolean);
  return `گلبول سفید ${w.value} است و از بازهٔ ${ped ? "این سن" : "طبیعی"} (${w.range}) بالاتر است${times}، ` +
    `در حالی که هم‌زمان ${low.join(" و ")} پایین است.`;
}
// نوتروفیل سه‌حالته (N4): سنجیده / چاپ‌شده ولی بی‌عدد یا دیفِ نامعتبر / روی برگه نیست.
function neutSentenceFa(e, ne) {
  const unread = e.diffFailed || e.ungraded?.NEUT_ABS?.unreadable === true;
  return ne ? `نوتروفیل ${ne.value} است (بازه ${ne.range}).`
    : unread ? "شمارشِ افتراقیِ دستگاه برای نوتروفیل عددی نداد، پس تعدادِ نوتروفیل در دست نیست."
    : "تعدادِ نوتروفیل روی این برگه نیست.";
}
// لنفوسیت: هر جهت جمله دارد (M156) — قاعده‌ها LYMPH_ABS را می‌خوانند.
function lymphSentenceFa(ly, ped) {
  const ref = `بازهٔ ${ped ? "این سن" : "طبیعی"} (${ly.range})`;
  return ly.abnormal && ly.dir === "low"
    ? `لنفوسیت ${ly.value} است و از ${ref} پایین‌تر است؛ تا شمارشِ افتراقیِ دستی انجام نشود، معنای آن جدا از بقیهٔ عددها روشن نیست.`
    : ly.abnormal && ly.dir === "high"
      ? `لنفوسیت ${ly.value} است و از ${ref} بالاتر است؛ شمارشِ افتراقیِ دستی نوعِ این سلول‌ها را روشن می‌کند.`
      : `لنفوسیت ${ly.value} است و در ${ref} قرار دارد.`;
}

// P77-۱۲ (تصمیمِ بازبین ۲۰۲۶-۱۰-۰۴؛ Katzmann 2002، Hutchison 2008 — وابسته به کیتِ Freelite): نسبتِ κ/λ.
const FLC_RATIO_NORMAL = [0.26, 1.65];
const FLC_RATIO_RENAL = [0.37, 3.1];
const FLC_NOTE = " (بازه‌ها برای واحدِ mg/L و کیتِ Freelite است؛ کیت‌های دیگر کمی فرق می‌کنند.)";
function flcState(e) {
  const k = e.graded.find((g) => g.test === "KAPPA_FLC");
  const l = e.graded.find((g) => g.test === "LAMBDA_FLC");
  if (!k || !l || !(l.value > 0)) return { ratio: null };
  const renal = e.indices?.egfr != null && e.indices.egfr < 60;
  const [lo, hi] = renal ? FLC_RATIO_RENAL : FLC_RATIO_NORMAL;
  const ratio = +(k.value / l.value).toFixed(2);
  return { ratio, renal, range: `${lo}–${hi}`, abnormal: ratio < lo || ratio > hi };
}
function flcRatioFa(e) {
  const s = flcState(e);
  if (s.ratio == null) return " نسبتِ کاپا به لامبدا برای تفسیر لازم است و یکی از این دو روی برگه نیست.";
  return s.abnormal
    ? ` نسبتِ کاپا به لامبدا ${s.ratio} است و خارج از محدودهٔ ${s.range}${s.renal ? " (مخصوصِ کاهشِ کارِ کلیه)" : ""} قرار دارد؛ یعنی افزایش نامتقارن است.`
    : ` نسبتِ کاپا به لامبدا ${s.ratio} است و در محدودهٔ ${s.range}${s.renal ? " (مخصوصِ کاهشِ کارِ کلیه)" : ""} قرار دارد؛ افزایشِ هم‌زمانِ هر دو معمولاً از کاهشِ دفعِ کلیوی یا التهاب است و به‌تنهایی نشانهٔ اختلالِ سلولِ پلاسما نیست.`;
}
const flcUrgency = (e) => (flcState(e).ratio != null && !flcState(e).abnormal ? "routine" : "this_week");

export const RULES_MALIGNANCY = [
  // ─────────────────────────────────────────
  // 0. زنجیره‌های سبک و گاموپاتی مونوکلونال (MGUS / Multiple Myeloma)
  // ─────────────────────────────────────────
  {
    id: "monoclonal_gammopathy_lambda",
    match: (e) => {
      // پیدا کردن تستی که شامل کلمه LAMBDA یا لامبدا است و مقدارش بالا (high) است
      const lam = e.graded.find((g) => g.test === "LAMBDA_FLC" && g.dir === "high");
      // هر دو بالا ⇒ مالکِ یافته کاپاست (یک یافته با هر دو عدد، نه دو یافتهٔ هم‌متن) — N20
      return !!lam && !e.graded.some((g) => g.test === "KAPPA_FLC" && g.dir === "high");
    },
    build: (e) => {
      const lam = e.graded.find((g) => g.test === "LAMBDA_FLC");
      return {
        pattern: "monoclonal_gammopathy_lambda",
        urgency: flcUrgency(e),
        headline: "افزایش زنجیره سبک لامبدا (Lambda FLC)",
        must_say: `میزان پروتئین لامبدا در آزمایش شما ${lam.value} (حد طبیعی ${lam.range}) است که بالاتر از حد طبیعی است.` + flcRatioFa(e) +
          (flcState(e).abnormal !== false
            ? " افزایش نامتقارن زنجیره‌های سبک ایمونوگلوبولین می‌تواند نشان‌دهنده تولید بیش از حد این پروتئین‌ها توسط سلول‌های پلاسما در مغز استخوان باشد (مانند وضعیت MGUS یا میلوم متعدد)."
            : "") + FLC_NOTE,
        action: flcUrgency(e) === "routine"
          ? "در نوبتِ عادی با پزشک مطرح کنید و کارِ کلیه را هم بسنجید."
          : "جهت بررسی‌های تکمیلی (نظیر الکتروفورز پروتئین‌های خون و ادرار) حتماً در اولین فرصت با متخصص خون و سرطان (هماتولوژیست) مشورت کنید.",
        suggest: ["SPEP", "UPEP", "کلسیم", "کراتینین"],
        key_number: lam.value
      };
    }
  },
  {
    id: "monoclonal_gammopathy_kappa",
    match: (e) => {
      const kap = e.graded.find((g) => g.test === "KAPPA_FLC" && g.dir === "high");
      return !!kap;
    },
    build: (e) => {
      const kap = e.graded.find((g) => g.test === "KAPPA_FLC");
      const lamH = e.graded.find((g) => g.test === "LAMBDA_FLC" && g.dir === "high");
      return {
        pattern: "monoclonal_gammopathy_kappa",
        urgency: flcUrgency(e),
        headline: "افزایش زنجیره سبک کاپا (Kappa FLC)",
        must_say: `میزان پروتئین کاپا در آزمایش شما ${kap.value} (حد طبیعی ${kap.range}) است که بالاتر از حد طبیعی است.` +
          (lamH ? ` لامبدا هم ${lamH.value} (حد طبیعی ${lamH.range}) و بالاتر از حد است.` : "") + flcRatioFa(e) +
          (flcState(e).abnormal !== false ? " این الگو می‌تواند نشانه اختلالات سلول‌های پلاسما باشد و نیاز به پیگیری دارد." : "") + FLC_NOTE,
        action: flcUrgency(e) === "routine"
          ? "در نوبتِ عادی با پزشک مطرح کنید و کارِ کلیه را هم بسنجید."
          : "جهت ارزیابی و انجام تست‌های الکتروفورز پروتئین به متخصص خون (هماتولوژیست) مراجعه کنید.",
        suggest: ["SPEP", "UPEP"],
        key_number: kap.value
      };
    }
  },

  // ─────────────────────────────────────────
  // 1. Myelodysplastic Syndromes (MDS)
  // ─────────────────────────────────────────
  {
    id: "mds_suspicion",
    match: (e) => {
      if (!e.age || e.age < 60) return false;
      const t = val(e);
      if (t.MCV == null || t.MCV <= 100) return false;

      // جستجوی سایتوپنی
      let cytopenias = 0;
      const hgb = e.graded.find((g) => g.test === "HGB");
      if (hgb?.abnormal && hgb.dir === "low" && t.HGB < 10) cytopenias++;
      
      const plt = e.graded.find((g) => g.test === "PLT");
      if (plt?.abnormal && plt.dir === "low" && t.PLT < 100) cytopenias++;
      
      const neut = e.graded.find((g) => g.test === "NEUT_ABS");
      if (neut?.abnormal && neut.dir === "low" && t.NEUT_ABS < 1800) cytopenias++;

      // آنمی ماکروسیتیک + حداقل یک سایتوپنی دیگر (جمعاً ۲ مورد)
      return cytopenias >= 2;
    },
    build: (e) => {
      // 🔴 بازبینیِ ۲۰۲۶-۱۰-۰۴ (N16/N18): این یافته anemia_macrocytic_mds را کنار می‌زند و PLT را در منبع می‌خواند (RULE_READS ⇒ «پوشش‌داده»).
      //    با Hb 9 · ANC 1500 · PLT 120 · MCV 105 در ۶۵ سالگی، پلاکتِ پایین (≥۱۰۰، پس در شمارشِ بالا نیامده) در هیچ متنی گفته نمی‌شد.
      //    حالا هر رده‌ای که درجه‌بندی «پایین» داده با عددش نام برده می‌شود — بی‌آستانهٔ تازه.
      const t = val(e);
      const low = (k) => { const g = e.graded.find((x) => x.test === k); return !!(g?.abnormal && g.dir === "low"); };
      const lines = [
        low("HGB") && `هموگلوبین ${t.HGB}`,
        low("PLT") && `پلاکت ${t.PLT}`,
        low("NEUT_ABS") && `نوتروفیلِ مطلق ${t.NEUT_ABS}`,
      ].filter(Boolean);
      return {
        pattern: "mds_suspicion",
        urgency: "this_week",
        headline: "نقص در تولید سلول‌های خونی؛ نیاز به بررسی تخصصی",
        must_say: `گلبول‌های قرمزِ شما بزرگ‌تر از حدِ طبیعی‌اند (MCV ${t.MCV}) و این رده‌ها پایین‌تر از محدودهٔ طبیعی‌اند: ${lines.join("، ")}. ` +
          "ترکیبِ بزرگ بودنِ گلبول‌های قرمز با افتِ بیش از یک ردهٔ خونی در سنینِ بالاتر از ۶۰ سال می‌تواند نشانه‌ای از سندرم‌های نارساییِ مغزِ استخوان نظیرِ MDS باشد.",
        action: "در اسرع وقت برای بررسی مورفولوژیک به یک هماتولوژیست (متخصص خون) مراجعه کنید.",
        suggest: ["گسترش خون محیطی (Peripheral Smear)", "معاینه کامل بالینی"],
        warnings: ["لطفاً از مصرف مکمل‌های تقویتی بدون دستور پزشک پرهیز کرده و پیگیری تخصصی را در اولویت قرار دهید."],
      };
    },
  },

  // ─────────────────────────────────────────
  // 2. Acute Leukemia (AML / ALL)
  // ─────────────────────────────────────────
  {
    id: "acute_leukemia_suspicion",
    match: (e) => {
      const t = val(e);
      if (t.WBC == null || t.WBC <= 50) return false; // WBC > 50k

      const hgb = e.graded.find((g) => g.test === "HGB");
      const hgbSevere = hgb?.abnormal && hgb.dir === "low" && t.HGB < 8;

      const plt = e.graded.find((g) => g.test === "PLT");
      const pltSevere = plt?.abnormal && plt.dir === "low" && t.PLT < 50;

      return hgbSevere || pltSevere;
    },
    build: (e) => {
      // specs/009 (hand-off، data-model §3): بلاستِ ≥۲۰٪ یا میله‌های اوئرِ همین برگه اینجا گفته می‌شود و
      //   peripheral_smear_findings آن‌ها را کنار می‌گذارد — دقیقاً یک یافته دربارهٔ بلاست (M202g).
      const leuk = smearAxis(e)?.leukemic ?? [];
      const smearClause = leuk.length ? ` ${smearLeukemicSentence(leuk)} این یافتهٔ لام همین نگرانی را تقویت می‌کند و بررسیِ تخصصیِ مغزِ استخوان را ضروری‌تر می‌کند.` : "";
      return {
        pattern: "acute_leukemia_suspicion",
        urgency: "emergency",
        headline: "اختلال شدید و خطرناک در سلول‌های خون (اورژانس)",
        // P56 پرسش ۶ (تصمیمِ بازبین ۲۰۲۶-۰۹-۲۸): نامِ تشخیص («بدخیمی»، «لوسمی») در متنِ بیمار نمی‌آید؛ id فقط پرچمِ داخلی است.
        must_say: "افزایش بسیار شدید و غیرطبیعی گلبول‌های سفید همراه با افت شدید گلبول‌های قرمز یا پلاکت‌ها، یک اورژانس خونی است و نیازمندِ ارزیابیِ فوریِ تخصصیِ خون (هماتولوژی) در سریع‌ترین زمانِ ممکن است." + smearClause,
        action: "بدون هیچ‌گونه تأخیر، مستقیماً به اورژانس یک بیمارستان مجهز (ترجیحاً دارای بخش خون) مراجعه کنید.",
        // N8/N20 (P72، بازبینی): «درخواست ارجاع فوری اورژانسی از پزشک» زیرِ «مستقیماً به اورژانس» یعنی «اول از پزشک ارجاع بگیر».
        suggest: [],
        warnings: ["این یک وضعیت تهدیدکننده حیات است و هرگونه تأخیر در پیگیری پزشکی عواقب جبران‌ناپذیری دارد."],
      };
    },
  },

  // ─────────────────────────────────────────
  // 2b. لکوسیتوز + سیتوپنیِ شدید، زیرِ دروازهٔ WBC > 50ِ قاعدهٔ بالا (job fff90f58، P58)
  // ─────────────────────────────────────────
  // 🔴 شیرخوارِ ۶–۱۲ ماهه: WBC 36.6 (بازه ۵–۱۲) + Hb 7.1 + PLT 36، بی‌دیف. acute_leukemia_suspicion فقط بالای ۵۰ فعال
  //    می‌شود، pancytopenia به‌درستی WBCِ پایین می‌خواهد، و leukocytosis زیرِ blockerِ ترومبوسیتوپنی پنهان ماند؛ پس
  //    WBC فقط در خطِ «۲ نتیجهٔ دیگر» آمد و خانواده فقط «TTP یا HUS» خواند (N18/N20).
  // عددِ تازه‌ای نیست: «لکوسیتوز» = WBC بالاتر از بازهٔ همین سن (grade)، و «سیتوپنیِ شدید» از خودِ قاعدهٔ
  //    acute_leukemia_suspicion پرسیده می‌شود — همان match با WBCی بالای دروازه‌اش (درسِ M91e: «آیا آن قاعده فعال
  //    می‌شود»، نه تکرارِ ۸ و ۵۰). وقتی خودِ آن قاعده فعال است، این یکی کنار می‌رود (یک یافته دربارهٔ یک تصویر).
  // P56 پرسش ۶: نامِ تشخیص («لوسمی»، «بدخیمی») در متنِ بیمار نمی‌آید (M203e).
  // P58 پرسش ۱ (تصمیمِ بازبینِ بالینی، ۲۰۲۶-۰۹-۲۹): «لکوسیتوزِ بارز» کنارِ سیتوپنی = WBC > ۲۰٬۰۰۰/µL، برای کودک و بزرگسال.
  //   بازبین «۲۰ تا ۲۵ هزار» داد؛ کرانِ پایین انتخاب شد (خطا به سمتِ توضیح). WBCِ ۱۱ تا ۲۰ هزار کنارِ کم‌خونی/ترومبوسیتوپنی
  //   «اغلب واکنشی است» و این یافته را نمی‌سازد. منبعِ منتشرشده نام برده نشد — برچسب همان تصمیمِ بازبین است.
  {
    id: "leukocytosis_with_cytopenia",
    match: (e) => {
      const w = e.graded.find((g) => g.test === "WBC");
      if (!w?.abnormal || w.dir !== "high" || !(w.value > MARKED_LEUKOCYTOSIS_K)) return false;
      if (RULES_MALIGNANCY.find((r) => r.id === "acute_leukemia_suspicion").match(e)) return false;
      if (thrombocytoticVariant(e)) return false;   // P96: reactive_leukocytosis_with_cytopenia مالکِ آن است
      return severeCytopeniaArm(e);
    },
    build: (e) => {
      const g = (k) => e.graded.find((x) => x.test === k);
      const w = g("WBC"), hb = g("HGB"), plt = g("PLT"), ly = g("LYMPH_ABS"), ne = g("NEUT_ABS");
      const ped = e.age != null && e.age < 16;
      const s = [
        wbcCytoSentenceFa(w, hb, plt, ped) + " " +
        // P58 پرسش ۲ (بازبین، ۲۰۲۶-۰۹-۲۹): جملهٔ خودِ بازبین؛ نامِ تشخیص نمی‌آید (P56 پرسش ۶، M203e).
        "تغییرات همزمان در رده‌های گلبول‌های سفید و سایر سلول‌های خونی مشاهده شده که نیازمند ارزیابی تکمیلی و فوری توسط متخصص خون (هماتولوژیست) جهت بررسی دقیق عملکرد مغز استخوان است.",
      ];
      s.push(neutSentenceFa(e, ne));
      // بلاست: یا لامِ همین برگه دارد (مالکش peripheral_smear_findings است) یا گزارش نشده.
      const leukSmear = smearAxis(e)?.leukemic ?? [];
      s.push(leukSmear.length
        ? "لامِ همین برگه سلول‌های نارس گزارش کرده که جداگانه توضیح داده شده است."
        : `وجود یا نبودِ سلول‌های نارس (بلاست) هم روی این برگه گزارش نشده؛ ${ne ? "" : "این دو عدد سرنوشت‌سازند و "}برای همین شمارشِ افتراقیِ دستی روی لامِ خونِ محیطی، با جست‌وجوی بلاست، لازم است.`);
      if (ly) s.push(lymphSentenceFa(ly, ped));
      // تصمیمِ کاربر (۲۰۲۶-۰۹-۲۹): همان واژهٔ جملهٔ بازبین برای همهٔ سنین — «هماتولوژیست»، نه «هماتولوژیستِ اطفال».
      const doc = "متخصصِ خون (هماتولوژیست)";
      return {
        pattern: "leukocytosis_with_cytopenia",
        urgency: "emergency",
        headline: "گلبول سفیدِ بالا همراه با افتِ شدیدِ رده‌های دیگرِ خون (اورژانس)",
        must_say: s.join(" "),
        action: `بدون اتلاف وقت فوراً به اورژانسِ بیمارستانی مراجعه کنید که ${doc} دارد.`,
        suggest: [
          "گسترش خون محیطی با شمارش افتراقی دستی و بررسی بلاست",
          "شمارش رتیکولوسیت", "بیلی‌روبین مستقیم و غیرمستقیم", "هاپتوگلوبین", "کومبس مستقیم", "LDH",
          "کراتینین", "اوره", "آزمایش کامل ادرار", "اسید اوریک", "پتاسیم",
        ],
        warnings: [`اگر ${ped ? "کودک" : "بیمار"} تب دارد، همان ابتدا به تیمِ اورژانس بگویید؛ کشتِ خون و CRP را پزشک بر همین اساس درخواست می‌کند.`],
        ...(w.refSource === "RCPCH 2016" ? { sources: ["RCPCH"] } : /^HSL \/ Royal Free/.test(w.refSource ?? "") ? { sources: ["HSL_RFH"] } : {}),
      };
    },
  },

  // ─────────────────────────────────────────
  // 2c. سطحِ ۲: لکوسیتوزِ خفیف تا متوسط + سیتوپنیِ شدید (P58، تصمیمِ بازبین ۲۰۲۶-۰۹-۲۹)
  // ─────────────────────────────────────────
  // WBC بالاتر از بازهٔ همین سن ولی ≤ MARKED_LEUKOCYTOSIS_K، کنارِ همان سیتوپنیِ شدیدِ سطحِ ۱. بازبین: «اغلب واکنشی به عفونت،
  //   التهابِ حاد یا کم‌خونیِ زمینه‌ای» — بی‌این یافته، WBC زیرِ blockerِ اورژانسِ پلاکت/Hb به خطِ «بی‌توضیح» می‌افتاد (N18).
  // فوریت this_week + always_show (تصمیمِ کاربر): خودش آلارم نمی‌سازد و دستورِ نهایی مالِ یافتهٔ اورژانسی است (M188)،
  //   ولی زیرِ آن پنهان نمی‌ماند. brief همان متنِ کامل است، چون کلیدها فقط با متنِ نشان‌داده‌شده پوشش می‌گیرند (R3-CR1).
  {
    id: "reactive_leukocytosis_with_cytopenia",
    match: (e) => {
      const w = e.graded.find((g) => g.test === "WBC");
      if (!w?.abnormal || w.dir !== "high") return false;
      if (w.value > MARKED_LEUKOCYTOSIS_K) {
        // P96: بالای حدِ «بارز» فقط وقتی پلاکتِ بالا اورژانسِ سطحِ ۱ را کنار زده و WBC > ۵۰ (acute_leukemia_suspicion) مالک نیست.
        if (!thrombocytoticVariant(e) || RULES_MALIGNANCY.find((r) => r.id === "acute_leukemia_suspicion").match(e)) return false;
      }
      return severeCytopeniaArm(e);
    },
    build: (e) => {
      const g = (k) => e.graded.find((x) => x.test === k);
      const w = g("WBC"), hb = g("HGB"), plt = g("PLT"), ly = g("LYMPH_ABS"), ne = g("NEUT_ABS");
      const ped = e.age != null && e.age < 16;
      const s = [
        wbcCytoSentenceFa(w, hb, plt, ped),
        // P58 (بازبین، ۲۰۲۶-۰۹-۲۹): متنِ خودِ بازبین، عیناً.
        "این وضعیت اغلب واکنشی به عفونت‌ها، التهاب‌های حاد یا کم‌خونی‌های زمینه‌ای است. جهت مشخص شدن علت دقیق عفونی یا التهابی، بررسی و تطبیق آزمایش با معاینه بالینی توسط پزشک ضروری است.",
        neutSentenceFa(e, ne),
      ];
      // P96: پلاکتِ بالا (جهت از graded.dir، نه آستانه — N12) در همین یافته گفته می‌شود تا PLT «توضیح‌نشده» نماند و تصویرِ «واکنشی» روشن باشد.
      if (plt?.abnormal && plt.dir === "high") {
        s.push(`پلاکت ${plt.value} است و از بازهٔ ${ped ? "این سن" : "طبیعی"} (${plt.range}) بالاتر است؛ بالا بودنِ هم‌زمانِ گلبول سفید و پلاکت اغلب با التهاب یا عفونتِ فعال همراه است و به‌تنهایی نشانهٔ کمبودِ تولیدِ سلول‌های خون نیست، ولی پزشک باید آن را کنارِ معاینه و بقیهٔ عددها معنا کند.`);
      }
      if (ly) s.push(lymphSentenceFa(ly, ped));
      const text = s.join(" ");
      const fever = `اگر ${ped ? "کودک" : "بیمار"} تب دارد، این را همان ابتدا به پزشک بگویید؛ کشتِ خون و CRP را پزشک بر همین اساس درخواست می‌کند.`;
      return {
        pattern: "reactive_leukocytosis_with_cytopenia",
        urgency: "this_week",
        headline: "افزایش گلبول‌های سفید خون همزمان با کاهش در سایر سلول‌ها",
        must_say: text,
        always_show: true,
        brief: text,
        action: "این هفته با پزشک وقت بگیرید تا علتِ آن کنارِ معاینه روشن شود.",
        suggest: [...(ne ? [] : ["شمارش افتراقی (عدد نوتروفیل)"]), "CRP", "ESR"],
        warnings: [fever],
        brief_warnings: [fever],
        ...(w.refSource === "RCPCH 2016" ? { sources: ["RCPCH"] } : /^HSL \/ Royal Free/.test(w.refSource ?? "") ? { sources: ["HSL_RFH"] } : {}),
      };
    },
  },

  // ─────────────────────────────────────────
  // 3. Chronic Lymphocytic Leukemia (CLL)
  // ─────────────────────────────────────────
  {
    id: "cll_suspicion_nccn",
    // P91 (تصمیمِ کاربر ۲۰۲۶-۱۰-۰۶): گیتِ ۵۰ سال برای لنفوسیتوزِ *تنها* می‌ماند (زیرِ ۵۰ لنفوسیتِ ۵۰۰۰ اغلب ویروسی است)، ولی
    //   لنفوسیت > ۵۰۰۰ (حدِ iwCLL 2018) همراهِ Hb < ۱۱ یا پلاکت < ۱۰۰ (مرزهای مرحلهٔ III/IV ِ Rai) در هر بزرگسال ⇒ soon.
    // P95 (تصمیمِ کاربر ۲۰۲۶-۱۰-۰۶، منابعِ کاربر: NCCN CLL/SLL از نقلِ ثانویه، ARUP، CAP، مسیرِ South Tees): گیتِ ۵۰ سال معیارِ NCCN نیست.
    //   هر بزرگسال (≥ ۱۶) با لنفوسیتِ ≥ ۵۰۰۰ مالکِ این قاعده است؛ سن فقط وزن است، نه دروازه. فوریت: سیتوپنی ⇒ soon؛ لنفوسیت > ۱۰٬۰۰۰
    //   (مرزِ ارجاعِ مسیرِ بریتانیایی) یا سنِ ≥ ۵۰ ⇒ this_week؛ بقیه routine با «تکرار پس از ۶–۸ هفته، اگر ماند فلوسیتومتری». هیچ فوریتی
    //   پایین نمی‌آید (زیرِ ۵۰ پیش‌تر viral_lymphocytosis: routine، یا this_week بالای ۲۰٬۰۰۰). گارد L30.
    match: (e) => {
      const lymph = e.graded.find((g) => g.test === "LYMPH_ABS");
      if (!(lymph?.abnormal && lymph.dir === "high" && lymph.value >= CLL_LYMPH_ABS)) return false;
      return e.age != null && e.age >= 16;
    },
    build: (e) => {
      const cyto = cllCytopeniaFa(e);
      const lymph = e.graded.find((g) => g.test === "LYMPH_ABS");
      if (cyto.length) {
        return {
          pattern: "cll_suspicion_nccn",
          urgency: "soon",
          key_number: lymph.value,
          headline: "افزایشِ لنفوسیت‌ها همراه با کاهشِ ردهٔ دیگری از خون؛ نیازمند بررسیِ تخصصیِ خون",
          must_say: `لنفوسیت شما ${lymph.value} است (حد طبیعی ${lymph.range}) و هم‌زمان ${cyto.join(" و ")} است. ` +
            "عفونت‌ها هم لنفوسیت را بالا می‌برند، ولی افزایشِ لنفوسیت کنارِ کاهشِ گلبول قرمز یا پلاکت باید زود بررسی شود تا بیماری‌های خونیِ لنفوسیتی (مانند CLL) رد یا تأیید شوند.",
          action: "در اسرع وقت، حداکثر ظرفِ ۲۴ تا ۴۸ ساعتِ آینده، به پزشک متخصص داخلی یا خون (هماتولوژیست) مراجعه کنید و این برگه را همراه ببرید.",
          suggest: ["گسترش خون محیطی (Peripheral Smear)", "فلوسیتومتری خون محیطی (Flow Cytometry)", "LDH"],
          warnings: ["اگر تب، خونریزی یا کبودیِ بی‌دلیل دارید، همان روز به اورژانس مراجعه کنید."],
        };
      }
      const high = lymph.value > CLL_REFER_ABS || e.age >= 50;
      const causes = "عفونت‌های ویروسیِ حاد (مثلِ مونونوکلئوز، CMV یا هپاتیت)، سیاه‌سرفه، توکسوپلاسموز، سل، بروسلوز و برداشتنِ طحال هم لنفوسیت را بالا می‌برند. " +
        "اگر این افزایش در تکرارِ آزمایش باقی بماند — به‌ویژه اگر تا ۳ ماه پایدار باشد — فلوسیتومتریِ خونِ محیطی نشان می‌دهد که آیا این سلول‌ها از یک ردهٔ واحد (مانند CLL) هستند یا نه.";
      if (!high) {
        return {
          pattern: "cll_suspicion_nccn",
          urgency: "routine",
          key_number: lymph.value,
          headline: "لنفوسیت‌های خون شما بالاست؛ تکرارِ آزمایش لازم است",
          must_say: `لنفوسیت شما ${lymph.value} است (حد طبیعی ${lymph.range}). ${causes}`,
          action: "در نوبتِ عادی با پزشک مطرح کنید تا شمارشِ خون پس از ۶ تا ۸ هفته تکرار شود؛ اگر لنفوسیت هنوز بالا بود، فلوسیتومتری درخواست می‌شود.",
          suggest: ["تکرار CBC", "گسترش خون محیطی (Peripheral Smear)"],
          warnings: ["اگر غده‌های لنفاویِ بزرگ‌شده، تبِ طولانی، تعریقِ شبانه یا کاهشِ وزنِ بی‌دلیل دارید، زودتر به پزشک مراجعه کنید."],
        };
      }
      return {
        pattern: "cll_suspicion_nccn",
        urgency: "this_week",
        key_number: lymph.value,
        headline: "افزایش لنفوسیت‌ها؛ نیازمند بررسی تخصصی خون",
        must_say: `لنفوسیت شما ${lymph.value} است (حد طبیعی ${lymph.range}). ${causes} ` +
          (lymph.value > CLL_REFER_ABS
            ? "در این سطح، بررسی نباید به تعویق بیفتد."
            : "در سنِ شما احتمالِ بیماری‌های خونیِ لنفوسیتی بیشتر است، پس بررسی نباید به تعویق بیفتد."),
        action: "این هفته با پزشک (ترجیحاً متخصصِ داخلی یا خون) مطرح کنید و این برگه را همراه ببرید.",
        suggest: ["گسترش خون محیطی (Peripheral Smear)", "فلوسیتومتری خون محیطی (Flow Cytometry)", "LDH"],
        warnings: ["اگر غده‌های لنفاویِ بزرگ‌شده، تبِ طولانی، تعریقِ شبانه یا کاهشِ وزنِ بی‌دلیل دارید، زودتر به پزشک مراجعه کنید."],
      };
    },
  },

  // ─────────────────────────────────────────
  // 4. Chronic Myeloid Leukemia (CML)
  // ─────────────────────────────────────────
  {
    id: "cml_suspicion",
    match: (e) => {
      const t = val(e);
      if (t.WBC == null || t.WBC <= 50) return false; // WBC > 50k

      const baso = e.graded.find((g) => g.test === "BASO_ABS");
      return baso?.abnormal && baso.dir === "high";
    },
    // 🔴 تصمیمِ بازبینِ بالینی (۲۰۲۶-۰۹-۲۸، P56): این یافته همیشه زیرِ extreme_leukocytosis (WBC ≥ ۵۰، blocks_others)
    //    پنهان می‌ماند — یعنی هرگز. «لکوسیتوزِ شدید» فقط توصیفِ شمارشی است و این یافته جهتِ بالینی (BCR-ABL، لام) را می‌دهد؛
    //    always_show + brief تا زیرِ اورژانس نسخهٔ کوتاهش با عددِ بازوفیل بماند. M204.
    //    نامِ بیماری («CML»، «میلوپرولیفراتیو») در متنِ بیمار نمی‌آید — id فقط پرچمِ داخلی است (همان تصمیم، M204b).
    build: (e) => {
      const baso = e.graded.find((g) => g.test === "BASO_ABS");
      return {
        pattern: "cml_suspicion",
        urgency: "this_week",
        always_show: true,
        headline: "افزایش شدید گلبول‌های سفید و بازوفیل‌ها",
        must_say: `لکوسیتوز بسیار شدید (بالای ۵۰ هزار) همراه با افزایش غیرطبیعی بازوفیل‌ها (${baso.value}، حد طبیعی ${baso.range}) نیازمند بررسی تخصصی خون جهت رد اختلالات تکثیری مغز استخوان است.`,
        brief: `بازوفیل‌های شما هم بالاست (${baso.value}، حد طبیعی ${baso.range})؛ این همراهی با گلبول سفیدِ بسیار بالا نیازمندِ بررسیِ تخصصیِ خون جهتِ ردِ اختلالاتِ تکثیریِ مغزِ استخوان است و متخصصِ خون آن را با لامِ خون و آزمایشِ ژنتیکیِ BCR-ABL بررسی می‌کند.`,
        action: "بدون تأخیر به متخصص خون (هماتولوژیست) مراجعه کنید.",
        suggest: ["تست ژنتیک BCR-ABL", "گسترش خون محیطی"],
        warnings: [],
      };
    },
  },

  // ─────────────────────────────────────────
  // 5. ITP (Immune Thrombocytopenia)
  // ─────────────────────────────────────────
  {
    id: "isolated_thrombocytopenia",
    match: (e) => {
      const plt = e.graded.find((g) => g.test === "PLT");
      const pltLow = plt?.abnormal && plt.dir === "low";
      if (!pltLow) return false;

      const t = val(e);
      if (t.PLT > 100) return false;

      const hgb = e.graded.find((g) => g.test === "HGB");
      const wbc = e.graded.find((g) => g.test === "WBC");

      // «ایزوله» یعنی هیچ شاخصِ انعقادی هم بالا/پایین نباشد؛ با D-dimer/PT/aPTT/INR بالا یا فیبرینوژنِ پایین،
      // مالکِ برگه الگوی مصرفی/انعقادی است، نه این (بازبینیِ متخصص ۲۰۲۶-۰۹-۳۰، 61-e).
      const coagOff = e.graded.some((g) => g.abnormal &&
        ((["DDIMER", "PT", "APTT", "INR"].includes(g.test) && g.dir === "high") || (g.test === "FIB" && g.dir === "low")));
      return (!hgb || !hgb.abnormal) && (!wbc || !wbc.abnormal) && !coagOff;
    },
    build: (e) => {
      const t = val(e);
      const plt = e.graded.find((g) => g.test === "PLT");
      const isCritical = t.PLT < 30;
      // 🔴 بندِ ۴ (LIS ۲۰۲۶-۱۰-۰۶): (۱) «به زیر ۱۰۰ هزار» کنارِ PLT = ۱۰۰ غلط بود و عدد هیچ‌جا نقل نمی‌شد (N5) ⇒ عدد و بازه؛ (۲) «ایزوله» و
      //   «سایر رده‌ها طبیعی‌اند» کنارِ RBC/HCTِ پایین ⇒ فقط وقتی هیچ‌کدام پایین نیست (N4/N21)؛ (۳) حالا مالکِ تنهای PLT ۵۰–۱۰۰ است (thrombocytopenia
      //   کنار می‌رود)، پس هشدارِ کبودی و «تکرار CBC» ِ آن اینجا می‌آیند. شرط و فوریت دست نخورد. گارد L26.
      const redLow = e.graded.filter((g) => ["RBC", "HCT"].includes(g.test) && g.abnormal && g.dir === "low");
      const hbWbcNormal = e.graded.some((g) => g.test === "HGB" && !g.abnormal) && e.graded.some((g) => g.test === "WBC" && !g.abnormal);
      const isolated = hbWbcNormal && redLow.length === 0;
      return {
        pattern: "isolated_thrombocytopenia",
        urgency: isCritical ? "emergency" : "this_week",   // «today» در هیچ جدولِ رتبه نبود؛ actionِ «بلافاصله به اورژانس» ⇒ emergency (N20)
        headline: isolated ? "افت ایزوله پلاکت‌ها (ترومبوسیتوپنی)" : "پلاکت‌های شما کم است (ترومبوسیتوپنی)",
        // 🔴 N4 (لایهٔ ۲): «سایر رده‌ها طبیعی‌اند» فقط وقتی Hb و WBC هر دو روی برگه‌اند؛ غایب را نباید «طبیعی» خواند.
        must_say: `پلاکت شما ${t.PLT} است (حد طبیعی ${plt.range})${
          isolated
            ? "، در حالی که سایر رده‌های خونی طبیعی هستند"
            : hbWbcNormal
              ? `؛ هموگلوبین و گلبول سفید طبیعی‌اند، ولی ${redLow.map((g) => `${faName(g.test)} (${g.value})`).join(" و ")} هم پایین است`
              // P88: هموگلوبین/گلبول سفیدِ چاپ‌شده ولی بی‌نمره «روی برگه نیست» نیست (N4، گارد L8).
              : otherLinesUngradedFa(e) ||
                "؛ هموگلوبین یا گلبول سفید روی این برگه نیست؛ برای دانستنِ این‌که فقط پلاکت کم است یا رده‌های دیگر هم، شمارشِ کاملِ خون (CBC) لازم است"}. این حالت می‌تواند ایمنی (ITP) یا ثانویه به عفونت‌های ویروسی باشد.${isCritical ? ' افت شدید زیر ۳۰ هزار خطر خونریزی را به شدت بالا می‌برد.' : ''}`,
        action: isCritical ? "امروز بلافاصله به اورژانس یا هماتولوژیست مراجعه کنید." : "در هفته جاری به پزشک داخلی یا خون مراجعه کنید.",
        suggest: ["تکرار CBC", "بررسی اسمیر برای رد کلامپ پلاکتی", "تست‌های ویروسی HCV و HIV"],
        warnings: isCritical ? ["از هرگونه فعالیت فیزیکی شدید که خطر ضربه دارد خودداری کنید."] : ["اگر خونریزی یا کبودی بی‌دلیل دیدید، زودتر مراجعه کنید."],
      };
    },
  },

  // ─────────────────────────────────────────
  // 6. MAHA / TTP
  // ─────────────────────────────────────────
  // P96 (تصمیمِ بازبین ۲۰۲۶-۱۰-۰۶، spec ِ ریخت‌شناسیِ RBC): شیستوسیت ≥ ۱٪ (ICSH 2012) با پلاکت یا هموگلوبینِ پایین ⇒ اورژانس (TMA)، نه فقط پیشنهاد.
  //   وقتی maha_ttp_suspicion فعال است همان مالک است (شیستوسیت در mahaMarkers می‌آید)؛ این یافته برای حالتی است که آستانهٔ Hb < ۱۰ و PLT < ۵۰ نرسیده.
  {
    id: "schistocytes_screen",
    match: (e) => {
      if (rbcMorphOf(e, "schistocytes")?.state !== "present") return false;
      return !RULES_MALIGNANCY.find((r) => r.id === "maha_ttp_suspicion").match(e);
    },
    build: (e) => {
      const sch = rbcMorphOf(e, "schistocytes");
      const g = (k) => e.graded.find((x) => x.test === k);
      const plt = g("PLT"), hb = g("HGB");
      const st = (x) => (!x ? "absent" : x.abnormal ? x.dir : "normal");   // سه‌حالته + جهت از graded.dir (N4، N12)
      const lows = [st(plt) === "low" ? `پلاکت ${plt.value}` : null, st(hb) === "low" ? `هموگلوبین ${hb.value}` : null].filter(Boolean);
      const unmeasured = [!plt ? "پلاکت" : null, !hb ? "هموگلوبین" : null].filter(Boolean);
      const countFa = sch.pct != null ? `حدود ${sch.pct}٪` : `«${sch.raw}»`;
      const significant = sch.qty === "significant", minor = sch.qty === "minor";
      const cyto = lows.length > 0;
      const urgency = significant ? (cyto ? "emergency" : unmeasured.length ? "soon" : "this_week")
        : minor ? (cyto ? "this_week" : "routine")
        : (cyto ? "soon" : "routine");
      const base = `لامِ خونِ شما شیستوسیت (قطعه‌قطعه‌شدنِ گلبول قرمز) ${countFa} گزارش کرده است. `;
      const mid = significant
        ? (cyto
          ? `شیستوسیتِ ۱٪ یا بیشتر (حدِ ICSH) هم‌زمان با ${lows.join(" و ")} (پایین) می‌تواند نشانهٔ آسیبِ مکانیکی به گلبول‌های قرمز در رگ‌های کوچک (از جمله TTP و HUS) باشد؛ این یک وضعیتِ فوریِ خونی است و باید همان روز در بیمارستان بررسی شود.`
          : unmeasured.length
            ? `شیستوسیتِ ۱٪ یا بیشتر (حدِ ICSH) معنایش را از پلاکت و هموگلوبین می‌گیرد و ${unmeasured.join(" و ")} روی این برگه نیست؛ برای تصمیم باید CBC کامل انجام شود.`
            : `شیستوسیتِ ۱٪ یا بیشتر (حدِ ICSH) در حالی که پلاکت ${plt.value} و هموگلوبین ${hb.value} طبیعی‌اند معمولاً نیازمندِ تأیید با شمارشِ دوباره و بررسیِ پزشک است.`)
        : minor
          ? `این مقدار کم است (زیر ۱٪ یا «کم») و به‌تنهایی معمولاً معنای بالینیِ مشخصی ندارد${cyto ? `، ولی چون ${lows.join(" و ")} پایین است، پزشک باید آن را کنارِ هم ببیند` : "؛ فقط اگر پلاکت یا هموگلوبین پایین باشد یا شود باید دوباره بررسی شود"}.`
          : `مقدارِ آن گزارش نشده؛ حدِ معنادار ۱٪ است، پس درصدِ دقیق را از آزمایشگاه بخواهید${cyto ? `، به‌ویژه چون ${lows.join(" و ")} پایین است` : ""}.`;
      return {
        pattern: "schistocytes_screen",
        urgency,
        always_show: true,
        headline: urgency === "emergency" ? "شیستوسیت همراه با افتِ پلاکت یا هموگلوبین (اورژانس خونی)" : "شیستوسیت (قطعاتِ گلبول قرمز) روی لامِ خون دیده شده است",
        must_say: base + mid,
        brief: base + mid,
        action: urgency === "emergency" ? "بدون اتلاف وقت فوراً به اورژانس مراجعه کنید."
          : urgency === "soon" ? "همین امروز نزدِ پزشک بروید و این برگه را همراه ببرید."
          : urgency === "this_week" ? "این هفته با پزشک مطرح کنید." : "در نوبتِ عادی با پزشک مطرح کنید.",
        suggest: significant || cyto ? ["LDH", "هاپتوگلوبین", "رتیکولوسیت", "بیلی‌روبین مستقیم و غیرمستقیم", "آزمایش انعقادی", ...(unmeasured.length ? ["تکرار CBC"] : [])] : ["تکرار CBC"],
        warnings: urgency === "emergency" ? ["این وضعیت یک اورژانس واقعی است و نباید منتظر نوبت مطب بمانید."] : [],
      };
    },
  },

  {
    id: "maha_ttp_suspicion",
    match: (e) => {
      const t = val(e);
      if (t.PLT == null || t.HGB == null) return false;

      const hgbLow = e.graded.find((g) => g.test === "HGB" && g.dir === "low");
      const pltLow = e.graded.find((g) => g.test === "PLT" && g.dir === "low");

      // P95 (تصمیمِ کاربر ۲۰۲۶-۱۰-۰۶، منابعِ کاربر: ISTH 2020، PLASMIC/French): شک به TTP بر پایهٔ MAHA است، نه فقط عددِ Hb و پلاکت.
      //   بی‌نشانگرِ همولیز، شاخهٔ قدیمِ «بی‌نامِ بیماری» اورژانسی بود که منبع نداشت؛ حالا مالکِ آن برگه severe_thrombocytopenia است
      //   (همان اورژانس، همان درخواستِ لام/LDH). Hb < ۱۰ در تعریفِ HUS/aHUS پشتوانه دارد؛ پلاکتِ < ۵۰ هیچ‌جا پیدا نشد ⇒ «طراحیِ خودمان»
      //   (MEDICAL_RULES P95). شیستوسیت هنوز خوانده نمی‌شود (spec ِ ریخت‌شناسیِ RBC). گارد L28.
      return hgbLow && t.HGB < 10 && pltLow && t.PLT < 50 && mahaMarkers(e).support.length > 0;
    },
    // P91 (تصمیمِ کاربر ۲۰۲۶-۱۰-۰۶، [199]؛ ISTH 2020 TTP: ارزیابیِ اولیه = لام برای قطعاتِ گلبول قرمز، LDH، هاپتوگلوبین،
    //   بیلی‌روبینِ غیرمستقیم): نامِ TTP/HUS فقط وقتی می‌آید که نشانهٔ همولیز روی همین برگه هست. بی‌آن، همان اورژانس (فوریت
    //   دست نخورد) ولی بی‌نامِ بیماری و با درخواستِ فوریِ لام و LDH. هر نشانگرِ سنجیده در هر جهت جمله دارد (M156، N21).
    build: (e) => {
      const t = val(e);
      // match تضمین می‌کند دست‌کم یک نشانگرِ همولیز هست (P95)؛ شاخهٔ بی‌نشانگر رفت.
      const { support, other } = mahaMarkers(e);
      const nums = `هموگلوبین ${t.HGB} و پلاکت ${t.PLT}`;
      const otherFa = other.length ? ` روی همین برگه ${other.join("، ")} است.` : "";
      return {
        pattern: "maha_ttp_suspicion",
        urgency: "emergency",
        headline: "افت همزمان و شدید پلاکت و هموگلوبین (اورژانس خونی)",
        must_say: `افت توأم و شدید ${nums}، همراه با نشانهٔ تخریبِ گلبول قرمز روی همین برگه (${support.join("، ")})، زنگ خطری جدی برای سندرم‌های میکروآنژیوپاتیک (مثل TTP یا HUS) است که با تخریب سریع سلول‌ها همراهند.` + otherFa,
        action: "بدون اتلاف وقت فوراً به اورژانس مراجعه کنید.",
        suggest: ["گسترش خون محیطی جهت رویت شیستوسیت", "LDH", "آزمایش انعقادی"],
        warnings: ["این وضعیت یک اورژانس واقعی است و نباید منتظر نوبت مطب بمانید."],
      };
    },
  }
];
