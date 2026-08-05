import { RULES_INFECTIOUS } from "./patterns_infectious.js";
import { RULES_NEPHROLOGY } from "./patterns_nephrology.js";
import { RULES_NEPHROLOGY_NEW } from "./patterns_nephrology_new.js";
import { RULES_HEMATOLOGY } from "./patterns_hematology.js";
import { RULES_BIOCHEM } from "./patterns_biochem.js";
import { levelGrade } from "./patterns_utils.js";
import { RULES_BIOCHEM_NEW } from "./patterns_biochem_new.js";
import { RULES_ENDOCRINE_RHEUM } from "./patterns_endocrine_rheum.js";
import { RULES_ENDOCRINE_NEW } from "./patterns_endocrine_new.js";
import { RULES_MALIGNANCY } from "./patterns_malignancy.js";
import { rankOf } from "./patterns_utils.js";
import { faName } from "./names.js";
import { preanalyticalCaveats, attachPreanalytical } from "./preanalytical.js";
import { repeatDeltaFa } from "./biovar.js";


const LEGACY_ANEMIA_IDS = [
  "macrocytic_anemia",
  "microcytic_anemia",
  "microcytic_thal_likely",
  "microcytic_ida_likely",
  "normocytic_anemia",
  "iron_deficiency_panel",
  "anemia_chronic_disease",
  "hemolysis_pattern",
];

export const RULES = [
  ...RULES_INFECTIOUS,
  ...RULES_NEPHROLOGY,
  ...RULES_NEPHROLOGY_NEW,
  ...RULES_HEMATOLOGY,
  ...RULES_MALIGNANCY,
  ...RULES_BIOCHEM,
  ...RULES_BIOCHEM_NEW,
  ...RULES_ENDOCRINE_RHEUM,
  ...RULES_ENDOCRINE_NEW
];

//    پیشنهادها («تکرار CBC»، «پایش دوره‌ای TSH»، «تکرار کراتینین») دقیقاً دربارهٔ
//    آزمایشی هستند که همین حالا داریم و باید بمانند. تطبیق دقیق تضمین می‌کند
//    فقط پیشنهادِ «آزمایشی بده که همین الان دستت هست» حذف شود.
//    ورودی چندتستی فقط وقتی حذف می‌شود که همهٔ اجزایش موجود باشد.
export const SUGGEST_TESTS = {
  "فریتین": ["FERRITIN"],
  "آهن سرم": ["IRON"],
  "TIBC": ["TIBC"],
  "پنل کامل آهن": ["FERRITIN", "IRON", "TIBC"],
  "TSH": ["TSH"],
  "FT4": ["FT4"],
  "FT3": ["FT3"],
  "TSH و FT4": ["TSH", "FT4"],
  "PLT": ["PLT"],
  "WBC": ["WBC"],
  "CRP": ["CRP_Q"],
  "ALP": ["ALP"],
  "AST": ["AST"],
  "GGT": ["GGT"],
  "PT": ["PT"],
  "FIB": ["FIB"],
  "CK": ["CK"],
  "HbA1c": ["HBA1C"],
  "بیلی‌روبین": ["BILI_T"],
  "آلبومین خون": ["ALB"],
  "آلبومین (برای تصحیح کلسیم)": ["ALB"],
  "ویتامین B12": ["B12"],
  "فولات": ["FOLATE"],
  "آمیلاز": ["AMYLASE"],
  "رتیکولوسیت": ["RETIC"],
  "هاپتوگلوبین": ["HAPTO"],
  "قند خون ناشتا (FBS)": ["GLU_F"],
  // ⚠️ اگر قند/ESR/CRP همین حالا روی برگه هست، «درخواستش» همان باگِ
  //    «درخواست آزمایش فریتین» است. قالبِ «تکرارِ …» عمداً اینجا نیست —
  //    پایشِ سریالی درخواستِ تکراری نیست.
  "قند خون": ["GLU_F"],
  "ESR": ["ESR"],
  "CRP کمی (mg/L)": ["CRP_Q"],
  "شمارش خون (CBC)": ["HGB", "WBC", "PLT"],
  // ⚠️ Na+K تنها، الکترولیت‌ها را «کامل» نمی‌کند. در نارسایی کلیه، Ca/فسفات/
  //    بی‌کربناتِ غایب همان‌هایی‌اند که پیشنهاد باید بخواهد. مجموعهٔ کامل را شرط می‌کنیم
  //    تا پیشنهاد فقط وقتی حذف شود که واقعاً همه‌شان موجود باشند.
  "الکترولیت‌ها": ["NA", "K", "CA", "PHOS", "HCO3"],
};

/** آیا این پیشنهاد، آزمایشی است که همین حالا اندازه‌گیری شده؟ */
export function alreadyMeasured(suggestion, measuredKeys) {
  const keys = SUGGEST_TESTS[suggestion];
  return !!keys && keys.every((k) => measuredKeys.has(k));
}

/**
 * منبعِ گایدلاینیِ هر قاعده — شناسه‌ها از guidelines.js.
 *
 * چرا جدولِ جداگانه و نه فیلد داخلِ خودِ قاعده: قاعده‌ها ۶۸ تا هستند و
 * دست‌زدن به همه‌شان یعنی ۶۸ فرصتِ خراب‌کاری در متنی که به بیمار می‌رسد.
 * هر قاعده می‌تواند در build خودش هم `sources` بدهد؛ آن با این ادغام می‌شود.
 *
 * ⚠️ قاعده‌ای که اینجا نیست، منبعِ گایدلاینیِ *اختصاصی* ندارد و صرفاً روی
 *    محدودهٔ مرجع + CTCAE می‌ایستد — که خودشان در getRefSource ثبت‌اند.
 *    منبعِ بی‌ربط اضافه نکن تا فهرست پر شود؛ فهرست به بیمار نشان داده می‌شود.
 */
export const RULE_SOURCES = {
  // کلیه — مرحله‌بندی G1–G5، باندهای ACR، و شرطِ دوامِ ۳ ماه، همه KDIGO است.
  kidney:               ["KDIGO_CKD"],
  albuminuria_pattern:  ["KDIGO_CKD"],
  // قند — آستانه‌های تشخیصی و DKA/HHS از ADA.
  glycemia:             ["ADA_SOC"],
  dka_pattern:          ["ADA_SOC"],
  hhs_pattern:          ["ADA_SOC"],
  hypoglycemia:         ["ADA_SOC"],
  // ⚠️ لیپید عمداً اینجا نیست: آستانه‌های LDL/کلسترول/TG در refs.js از
  //    NCEP ATP III می‌آیند، نه از ESC/EAS. تا وقتی اهدافِ ریسک‌محورِ ESC
  //    (<۵۵/<۷۰/<۱۰۰/<۱۱۶) واقعاً پیاده نشده‌اند، برچسبِ ESC یعنی ادعای
  //    منبعی که موتور از آن استفاده نمی‌کند. ورودیِ ESC_EAS_LIPID در
  //    guidelines.js برای همان کارِ آینده نگه داشته شده.
  // کبد — نسبت R و آستانه‌های آنزیمی از گایدلاینِ آنزیم‌های کبدیِ ACG.
  liver_pattern:        ["ACG_LIVER"],
  bilirubin_pattern:    ["ACG_LIVER"],
  alp_isolated:         ["ACG_LIVER"],
  cirrhosis_pattern:    ["ACG_LIVER"],
  alcoholic_liver_pattern: ["ACG_LIVER"],
  // ⚠️ پانکراس اینجا نیست: آستانهٔ «لیپاز > ۳×ULN» از گایدلاینِ پانکراتیتِ
  //    حادِ ACG است، نه از سندِ آنزیم‌های کبدی که در دفترِ منابع ثبت شده.
  //    ارجاع به سندِ اشتباهِ همان سازمان، باز هم ارجاعِ اشتباه است.
  // خون و آهن — باندهای شدتِ کم‌خونی (<۸ شدید، <۱۱ متوسط) از WHO.
  microcytic_anemia:    ["WHO_ANAEMIA"],
  iron_deficiency_panel:["WHO_FERRITIN"],
  // ⚠️ anemia_chronic_disease اینجا نیست: روی الگوی آهن/TIBC/فریتین می‌ایستد،
  //    نه روی آستانه‌های WHO.
  // انعقاد
  dic_pattern:          ["ISTH"],
  // سرولوژی
  hcv_screen_reactive:  ["CDC_SEROLOGY", "AASLD"],
  hbv_screen_reactive:  ["CDC_SEROLOGY", "AASLD"],
  hiv_screen_reactive:  ["CDC_SEROLOGY"],
  brucella_active:      ["IR_BRUCELLOSIS"],
  brucella_wright_only: ["IR_BRUCELLOSIS"],
  // روماتولوژی و ویتامین
  rf_positive:          ["ACR_EULAR"],
  vitamin_d_abnormal:   ["ENDO_VIT_D"],
};

export function runPatterns(engineOut) {
  const findings = [];
  for (const rule of RULES) {
    if (!rule?.id) continue;
    try {
      if (!rule.match(engineOut)) continue;
      const f = rule.build(engineOut);
      if (f) findings.push({ rule_id: rule.id, ...f });
    } catch (e) {
      console.error(`[Engine] Rule ${rule.id} failed:`, e.message);
    }
  }

  // منبعِ گایدلاینی را به یافته بچسبان (ادغام با آنچه خودِ build داده).
  for (const f of findings) {
    const merged = [...(RULE_SOURCES[f.rule_id] ?? []), ...(f.sources ?? [])];
    if (merged.length) f.sources = [...new Set(merged)];
  }

  // ⚠️ باگ واقعی: در پنل فقر آهن که فریتین/آهن/TIBC هر سه وارد شده بودند،
  //    به کاربر گفته می‌شد «درخواست آزمایش فریتین از پزشک».
  //    اینجا فیلتر می‌شود — نه در ساخت توصیه‌ها — چون suggest از طریق پرامپت
  //    به LLM هم می‌رود و مدل صادقانه بازگویش می‌کند. سرِ منبع باید پاک باشد.
  const measured = new Set((engineOut?.graded ?? []).map((g) => g.test));
  for (const f of findings) {
    if (f.suggest?.length) {
      f.suggest = f.suggest.filter((s) => !alreadyMeasured(s, measured));
    }
  }

  // ═══ تور ایمنی ═══
  // 🔴 باگ واقعی: WBC=258 هیچ قاعده‌ای نداشت → findings خالی →
  //    سرور گفت «نتایج شما طبیعی است».
  //
  // هیچ‌وقت نمی‌شود همه‌ی الگوها را از قبل نوشت. پس اگر تستی
  // غیرطبیعی بود ولی قاعده‌ای نداشت، یک finding عمومی بساز.
  if (findings.length === 0 && engineOut.abnormal.length > 0) {
    const worst = [...engineOut.abnormal].sort(
      (a, b) => (rankOf(b) - rankOf(a))
    )[0];
    const hasCritical = engineOut.abnormal.some((a) => a.level === "critical");
    const hasMarked = engineOut.abnormal.some(
      (a) => a.level === "marked" || a.level === "critical" || levelGrade(a) >= 3
    );
    // بحرانی → emergency، شدید → this_week، بقیه → routine
    const urgency = hasCritical ? "emergency" : hasMarked ? "this_week" : "routine";
    findings.push({
      rule_id: "unmatched_abnormal",
      pattern: "unmatched_abnormal",
      urgency,
      blocks_others: hasCritical,
      headline: "بعضی از نتایج خارج از محدوده طبیعی هستند",
      must_say:
        `${engineOut.abnormal.length} مورد خارج از محدوده مرجع است` +
        (worst ? `، از جمله ${faName(worst.test)} با مقدار ${worst.value} (طبیعی ${worst.range})` : "") +
        ". برای این ترکیب توضیح آماده‌ای نداریم.",
      action: hasCritical
        ? "همین امروز با پزشک تماس بگیرید و این برگه را همراه ببرید."
        : hasMarked
        ? "این هفته با پزشک وقت بگیرید و این برگه را همراه ببرید."
        : "نتایج را با پزشک خود در میان بگذارید.",
      suggest: [],
      warnings: [],
    });
  }

  // ═══ انتخاب یافته‌ها ═══
  // 🔴 باگ قبلی: .find() فقط اولین blocks_others را برمی‌داشت و
  //    بقیه را دور می‌ریخت. بیمار با تروپونین مثبت + پلاکت ۳۰ +
  //    لاکتات ۶ فقط تروپونین را می‌دید — سه اورژانس ناپدید.
  //
  //    خطر واقعی: پلاکت ۳۰ یعنی خطر خونریزی. اگر پنهان بماند و
  //    بیمار برای «مشکل قلبی» آسپرین بگیرد، کشنده است.
  //
  // درست: blocks_others یعنی «موارد کم‌اهمیت‌تر را بپوشان»،
  //       نه «بقیه‌ی اورژانس‌ها را حذف کن».
  const order = { emergency: 0, this_week: 1, routine: 2 };
  const rank = (u) => (u in order ? order[u] : 2);  // urgency نامعتبر → routine

  // blocks_others یعنی «موارد کم‌اهمیت‌تر را بپوشان» — یعنی هرچه فوریتش از
  // خودِ blocker پایین‌تر است. نه هاردکد "emergency": اگر روزی blocker با
  // فوریت this_week تعریف شود، فیلترِ === "emergency" خودِ blocker را هم
  // حذف می‌کرد و selected خالی می‌شد → overall_urgency اشتباهاً "none".
  const blockerRank = Math.min(
    ...findings.filter((f) => f.blocks_others).map((f) => rank(f.urgency))
  );
  const hasBlocker = Number.isFinite(blockerRank);

  // always_show: یافته‌ای که حتی زیر یک blockerِ مهم‌تر هم نباید پنهان شود
  //   (مثل D-dimer که همیشه باید دست‌کم یک اشارهٔ کوتاه داشته باشد). بقیهٔ
  //   موارد کم‌اهمیت‌تر طبق روال پنهان می‌شوند تا پیام اورژانس رقیق نشود.
  const selected = hasBlocker
    ? findings.filter((f) => rank(f.urgency) <= blockerRank || f.always_show)
    : findings;

  // یافتهٔ always_show که فقط به‌خاطر همین استثنا زیر یک blocker مانده،
  //   نسخهٔ کوتاهش (brief) را می‌گیرد تا پیام اورژانس را شلوغ نکند.
  const shown = selected.map((f) =>
    hasBlocker && f.always_show && rank(f.urgency) > blockerRank && f.brief
      ? { ...f, must_say: f.brief, warnings: [], suggest: [] }
      : f
  );

  shown.sort((a, b) => rank(a.urgency) - rank(b.urgency));

  // ═══ CLSI — هشدارهای پیش‌تحلیلی ═══
  // بعد از انتخابِ یافته‌ها اجرا می‌شود، نه قبلش: هشداری که به یافتهٔ
  // پنهان‌شده بچسبد، با آن پنهان می‌شود. این‌طور اگر هدفش سرکوب شده باشد،
  // به‌عنوان هشدارِ عمومی برمی‌گردد و گم نمی‌شود.
  // ⚠️ هیچ‌کدام از این‌ها فوریت را تغییر نمی‌دهند — فقط متن اضافه می‌کنند.
  const preanalytical = attachPreanalytical(shown, preanalyticalCaveats(engineOut));

  return {
    findings: shown,
    overall_urgency: shown[0]?.urgency ?? "none",
    has_critical: shown.some((f) => f.urgency === "emergency"),
    // چند مورد کم‌اهمیت‌تر پنهان شد — برای شفافیت
    suppressed: hasBlocker ? findings.length - shown.length : 0,
    // هشدارهای پیش‌تحلیلیِ بی‌صاحب (هدفشان در این پنل یافته‌ای نداشت)
    preanalytical,
  };
}
