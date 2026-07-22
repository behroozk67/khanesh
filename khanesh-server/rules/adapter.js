// ============================================================
// LabMate — پل بین OCR و موتور قواعد
//
// کار این فایل:
//   ۱. نام تست‌های برگه (W.B.C, Hb, urea, ...) → کلید موتور (WBC, HGB, UREA_N)
//   ۲. تبدیل واحد (اوره → BUN)
//   ۳. Diff درصدی → مطلق
//   ۴. استنتاج سن و جنسیت
// ============================================================

import { getRef, getRefSource, ckdEpiEgfr } from "./refs.js";
import { evaluate } from "./grade.js";

// بیشترین مقدار قندِ موجود (ناشتا/تصادفی/دوساعته) — برای تصحیح سدیم
function maxGlucose(tests) {
  const vals = [tests.GLU_F, tests.GLU_RANDOM, tests.GLU_2H].filter((v) => v != null);
  return vals.length ? Math.max(...vals) : null;
}

// ---------- نرمال‌سازی نام ----------
function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[\s._\-\/()%#]/g, "")
    .replace(/[يی]/g, "ی")
    .replace(/[كک]/g, "ک")
    .replace(/\u200c/g, "")   // نیم‌فاصله
    .trim();
}

// ---------- نگاشت نام برگه → کلید موتور ----------
// کلیدها نرمال‌شده‌اند (بدون نقطه، فاصله، خط تیره)
const NAME_MAP = {
  // CBC
  wbc: "WBC", whitebloodcell: "WBC", wb: "WBC",
  rbc: "RBC", redbloodcell: "RBC",
  hb: "HGB", hgb: "HGB", hemoglobin: "HGB", haemoglobin: "HGB", هموگلوبین: "HGB",
  hct: "HCT", hematocrit: "HCT", haematocrit: "HCT", pcv: "HCT", هماتوکریت: "HCT",
  mcv: "MCV", mch: "MCH", mchc: "MCHC",
  plt: "PLT", platelet: "PLT", plateletcount: "PLT", پلاکت: "PLT",
  retic: "RETIC", reticulocyte: "RETIC",
  rdwcv: "RDW_CV", rdw: "RDW_CV",
  rdwsd: "RDW_SD",
  mpv: "MPV",
  esr: "ESR", esr1sthr: "ESR", esr1sth: "ESR", sedrate: "ESR",

  // Diff — درصد
  neut: "NEUT_PCT", neu: "NEUT_PCT", neutrophil: "NEUT_PCT", neutrophils: "NEUT_PCT",
  lymph: "LYMPH_PCT", lym: "LYMPH_PCT", lymphocyte: "LYMPH_PCT", lymphocytes: "LYMPH_PCT",
  mono: "MONO_PCT", mon: "MONO_PCT", monocyte: "MONO_PCT", monocytes: "MONO_PCT",
  eos: "EOS_PCT", eosinophil: "EOS_PCT", eosinophils: "EOS_PCT",
  baso: "BASO_PCT", bas: "BASO_PCT", basophil: "BASO_PCT", basophils: "BASO_PCT",

  // ⚠️ NEU# و NEU% هر دو به "neu" نرمال می‌شوند.
  //    تفکیک با علامت اصلی نام انجام می‌شود (rawHasHash / rawHasPct).

  // بیوشیمی
  bloodsugar: "GLU_RANDOM", bs: "GLU_RANDOM", randombloodsugar: "GLU_RANDOM",
  fbs: "GLU_F", fastingbloodsugar: "GLU_F", fastingbloodglucose: "GLU_F",
  fastingplasmaglucose: "GLU_F", glucosefasting: "GLU_F", قندخونناشتا: "GLU_F",
  // گلوکز/قند بدون قید → ناشتا فرض می‌شود (شایع‌ترین حالت در برگه‌های روتین)
  glucose: "GLU_F", قند: "GLU_F", قندخون: "GLU_F", گلوکز: "GLU_F", plasmaglucose: "GLU_F",
  "2hpp": "GLU_2H", "2hp": "GLU_2H", bs2hpp: "GLU_2H", "2hppbs": "GLU_2H",
  bs2h: "GLU_2H", glu2h: "GLU_2H", glucose2h: "GLU_2H", "2hourpp": "GLU_2H",
  postprandial: "GLU_2H", postprandialbloodsugar: "GLU_2H",
  "2hourpostprandial": "GLU_2H", قندخوندوساعته: "GLU_2H", قنددوساعته: "GLU_2H",
  hba1c: "HBA1C", a1c: "HBA1C",
  urea: "UREA", bun: "UREA_N", bloodureanitrogen: "UREA_N", ureanitrogen: "UREA_N",
  creatinine: "CREAT", cr: "CREAT", کراتینین: "CREAT",
  na: "NA", serumna: "NA", sodium: "NA",
  k: "K", serumk: "K", potassium: "K",
  cl: "CL", chloride: "CL",
  ca: "CA", calcium: "CA", کلسیم: "CA",
  mg: "MG", magnesium: "MG",
  phos: "PHOS", phosphorus: "PHOS", p: "PHOS",
  ast: "AST", sgot: "AST", astsgot: "AST",
  alt: "ALT", sgpt: "ALT", altsgpt: "ALT",
  alkp: "ALP", alp: "ALP", alkalinephosphatase: "ALP",
  ggt: "GGT", gammagt: "GGT",
  ckmb: "CK_MB", cpkmb: "CK_MB", ckmbfraction: "CK_MB", ckmbmass: "CK_MB",
  cpk: "CK", ck: "CK", creatinekinase: "CK",
  amylase: "AMYLASE", lipase: "LIPASE",
  uricacid: "URIC", uric: "URIC",
  alb: "ALB", albumin: "ALB",
  tp: "TP", totalprotein: "TP",
  bili: "BILI_T", bilirubintotal: "BILI_T", totalbilirubin: "BILI_T", tbil: "BILI_T",
  tbili: "BILI_T", بیلیروبینتام: "BILI_T", بیلیروبینکل: "BILI_T",
  bilirubindirect: "BILI_D", directbilirubin: "BILI_D", dbil: "BILI_D",
  directbili: "BILI_D", dbili: "BILI_D", conjugatedbilirubin: "BILI_D",
  conjugatedbili: "BILI_D", بیلیروبینمستقیم: "BILI_D",
  bilirubinindirect: "BILI_I", indirectbilirubin: "BILI_I", ibil: "BILI_I",
  indirectbili: "BILI_I", ibili: "BILI_I", unconjugatedbilirubin: "BILI_I",
  unconjugatedbili: "BILI_I", بیلیروبینغیرمستقیم: "BILI_I",
  ferritin: "FERRITIN", فریتین: "FERRITIN",
  iron: "IRON", serumiron: "IRON", آهن: "IRON",
  tibc: "TIBC",
  transferrinsaturation: "TSAT", tsat: "TSAT",
  b12: "B12", vitaminb12: "B12", serumvitaminb12: "B12",
  folate: "FOLATE", folicacid: "FOLATE",
  tsh: "TSH",
  ft4: "FT4", freet4: "FT4",
  ft3: "FT3", freet3: "FT3",
  t3: "T3", totalt3: "T3", tt3: "T3",
  antitpo: "ANTI_TPO", tpoab: "ANTI_TPO", tpoantibody: "ANTI_TPO", "anti-tpo": "ANTI_TPO", thyroidperoxidaseantibody: "ANTI_TPO",
  t4: "T4",
  chol: "CHOL", cholesterol: "CHOL", totalcholesterol: "CHOL",
  hdl: "HDL", hdlc: "HDL", hdlcholesterol: "HDL", "hdl-c": "HDL",
  ldl: "LDL", ldlc: "LDL", ldlcholesterol: "LDL", "ldl-c": "LDL",
  tg: "TG", triglyceride: "TG", triglycerides: "TG",
  ldh: "LDH",
  haptoglobin: "HAPTO",
  pt: "PT", prothrombintime: "PT",
  aptt: "APTT", ptt: "APTT",
  fibrinogen: "FIB",
  ddimer: "DDIMER",

  // ⚠️ این‌ها قبلاً unmapped می‌شدند و بی‌صدا ناپدید — همه نشانگر بحرانی‌اند
  lactate: "LACTATE", lacticacid: "LACTATE",
  procalcitonin: "PCT_SEPSIS", pct: "PCT_SEPSIS",
  crpquant: "CRP_Q", hscrp: "CRP_Q", crpquantitative: "CRP_Q",
  ammonia: "NH3", nh3: "NH3",
  hco3: "HCO3", bicarbonate: "HCO3", co2: "HCO3",
  ph: "PH",
  inr: "INR",
  esrfirsthour: "ESR",
};

// تست‌هایی که کیفی‌اند — عدد نیستند
const QUALITATIVE = new Set([
  "troponin", "troponin2", "troponini", "troponint", "crp", "rf", "aso",
  "urineculture", "bloodculture", "hbsag", "hcvab", "hiv",
  // ═══ تحلیل ادرار (U/A) — همه کیفی/نیمه‌کمی، به qual می‌روند ═══
  // ⚠️ فقط شکل‌های صریحاً ادراری. کلیدهای مبهم مثل "protein"/"glucose"/"blood"
  //    تنها، عمداً حذف شده‌اند تا با تست خون تداخل نکنند.
  // پروتئین ادرار
  "urineprotein", "uprotein", "proteinuria", "urprotein", "پروتئینادرار",
  // گلوکز ادرار
  "urineglucose", "uglucose", "urglucose", "glucoseurine", "قندادرار", "گلوکزادرار",
  // کتون (ادرار یا سرم)
  "urineketone", "uketone", "ketoneurine", "کتونادرار",
  "ketone", "ketones", "کتون", "betahydroxybutyrate", "bhb",
  // خون / RBC ادرار
  "urineblood", "urblood", "hematuria", "خونادرار",
  "urinerbc", "rbcurine", "urrbc", "rbchpf",
  // لکوسیت / WBC ادرار
  "leukocyteesterase", "لکوسیتاستراز",
  "urinewbc", "wbcurine", "urwbc", "wbchpf", "puscell", "puscells", "پوسسل",
  // نیتریت
  "nitrite", "nitrites", "urinenitrite", "نیتریت",
  // باکتری (کیفی: many/moderate/few/negative)
  "bacteria", "bacteriuria", "باکتری",
  // موارد تکمیلی
  "urobilinogen", "urinebilirubin",
]);

// آیا این کلید (نرمال‌شده) کیفی است؟
// هم تطبیق دقیق با Set، هم چند الگوی امن برای نام‌های ترکیبی.
// ⚠️ الگوها عمداً محدودند تا با تست‌های عددی تداخل نکنند.
const QUALITATIVE_PATTERNS = [
  // تروپونین جداگانه و بالاتر مدیریت می‌شود (عددی یا کیفی)
  /^hbsag/,      // hbsagquant, ...
  /^hcvab/,      // hcvabscreen, ...
];
function isQualitative(key) {
  if (QUALITATIVE.has(key)) return true;
  return QUALITATIVE_PATTERNS.some((re) => re.test(key));
}

// ---------- تبدیل واحد ----------
// ⚠️ اوره ≠ BUN. برگه‌های ایرانی معمولاً اوره می‌دهند.
//    BUN = urea ÷ 2.14
const ureaToBUN = (u) => u / 2.14;

// ---------- تبدیل عدد ----------
// ارقام فارسی/عربی و ممیز عربی را اول به لاتین تبدیل می‌کنیم؛ سپس فقط رقم/نقطه/علامت
// می‌مانَد (کاما به‌عنوان جداکنندهٔ هزارگان حذف می‌شود — قرارداد رایج برگه‌های ایرانی).
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
function toNum(v) {
  if (v == null) return null;
  const s = String(v)
    .replace(/[۰-۹]/g, (d) => FA_DIGITS.indexOf(d))
    .replace(/[٠-٩]/g, (d) => AR_DIGITS.indexOf(d))
    .replace(/٫/g, ".")           // ممیز عربی → نقطه
    .replace(/[^\d.\-+]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// ---------- استنتاج جنسیت ----------
// از فیلد patient، یا از محدوده‌ی مرجع خود برگه (Hb 12-16 → زن)
function inferSex(ocr) {
  const p = ocr?.patient;
  if (p?.sex) {
    const s = String(p.sex).toLowerCase();
    // ⚠️ ترتیب و مرز کلمه مهم است: "female" شامل "male" است.
    //    اول female/زن را چک کن، و از مرز کلمه استفاده کن.
    if (s.includes("زن") || /\bfemale\b/.test(s) || s === "f") return "F";
    if (s.includes("مرد") || /\bmale\b/.test(s) || s === "m") return "M";
  }
  // از محدوده‌ی Hb روی برگه
  // ⚠️ فقط برای بزرگسالان معتبر است. در کودکان محدوده‌ی Hb متفاوت است
  //    (مثلاً ۶ ساله: ~۱۱.۵–۱۳.۵) و این مرزها جنسیت را غلط می‌سازند،
  //    که بعد باعث اعمال مرجع بزرگسال (MCV، فریتین) روی کودک می‌شود.
  const age = inferAge(ocr);
  if (age != null && age < 12) return null;
  for (const t of ocr?.tests || []) {
    if (NAME_MAP[norm(t.name)] !== "HGB" || !t.reference) continue;
    const m = String(t.reference).match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
    if (!m) continue;
    const lo = Number(m[1]);
    if (lo >= 13.5) return "M";
    if (lo <= 12.5) return "F";
  }
  return null;
}

// ---------- استنتاج سن (سال) ----------
function inferAge(ocr) {
  const raw = ocr?.patient?.age;
  if (!raw) return null;
  const s = String(raw);
  let m = s.match(/([\d.]+)\s*(?:سال|year|yr|y)/i);
  if (m) return Number(m[1]);
  m = s.match(/([\d.]+)\s*(?:ماه|month|mo)/i);
  if (m) return Number(m[1]) / 12;
  m = s.match(/([\d.]+)\s*(?:روز|day|d)/i);
  if (m) return Number(m[1]) / 365;
  m = s.match(/([\d.]+)/);
  return m ? Number(m[1]) : null;
}

/**
 * OCR → مقادیر آماده برای موتور
 */
export function ocrToEngineInput(ocr) {
  const tests = {};
  const qual = {};
  const unmapped = [];

  for (const t of ocr?.tests || []) {
    if (!t?.name) continue;
    const key = norm(t.name);

    // ⚠️ تروپونین حیاتی است: امروزه اغلب عددی گزارش می‌شود (hs-cTnI = 0.5).
    //    اشکال رایج: Troponin، cTnI، cTnT، hs-cTnI، TnI، TnT.
    //    اگر مقدار عددی باشد، به کلید عددی TROPONIN_I بفرست تا با مرجع
    //    [0, 0.6] سنجیده شود. اگر کلمه‌ای (positive/مثبت) باشد، کیفی بماند.
    if (/troponin|ctn[it]|hs.?ctn|^tn[it]$|cardiactroponin/.test(key)) {
      const tv = toNum(t.value);
      if (tv != null) {
        tests.TROPONIN_I = tv;
      } else {
        qual[t.name] = String(t.value);
      }
      continue;
    }

    if (isQualitative(key)) {
      qual[t.name] = String(t.value);
      continue;
    }

    // NEU# و NEU% هر دو "neu" می‌شوند — از نام خام تفکیک کن
    const raw = String(t.name);
    const isAbs = raw.includes("#");
    const isPct = raw.includes("%");

    let engineKey = NAME_MAP[key];
    if (engineKey && isAbs && engineKey.endsWith("_PCT")) {
      engineKey = engineKey.replace("_PCT", "_ABS");
    }

    // ⚠️ برگه‌های Sysmex بدون # می‌نویسند: "NEUT 4.31 [10^3/uL]"
    //    اگر واحد 10^3 بود یا عدد < 100 و درصد نبود → مطلق است نه درصد.
    //    بدون این، NEUT=4.31 به‌عنوان «۴.۳٪» خوانده می‌شد و
    //    نوتروپنی شدید کاذب می‌ساخت.
    if (engineKey?.endsWith("_PCT") && !isPct) {
      const u = String(t.unit || "");
      const looksAbsolute = /10\^?3|10\*3|K\/|\/uL|\/µL/i.test(u);
      const v0 = toNum(t.value);
      if (looksAbsolute || (v0 != null && v0 < 20 && !u.includes("%"))) {
        engineKey = engineKey.replace("_PCT", "_ABS");
      }
    }
    if (!engineKey) {
      unmapped.push(t.name);
      continue;
    }

    const v = toNum(t.value);
    if (v == null) {
      qual[t.name] = String(t.value);   // مقدار غیرعددی
      continue;
    }

    // اوره → BUN
    if (engineKey === "UREA") {
      tests.UREA_N = +ureaToBUN(v).toFixed(1);
      tests._urea_raw = v;
      continue;
    }

    // ⚠️ شمارش مطلق: برگه معمولاً 10^3/uL می‌دهد (مثل NEU# = 3.66)
    //    موتور /µL می‌خواهد. اگر عدد کوچک بود، ضرب در 1000.
    if (engineKey.endsWith("_ABS") && v < 100) {
      tests[engineKey] = Math.round(v * 1000);
      continue;
    }

    tests[engineKey] = v;
  }

  // ═══ تشخیص شکست دیف دستگاه ═══
  // ⚠️ نکته‌ی کارشناس آزمایشگاه:
  //    وقتی WBC خیلی بالاست (مثلاً ۲۵۸)، سل‌کانتر نمی‌تواند دیف بدهد
  //    و همه را صفر گزارش می‌کند. این «نوتروپنی» نیست — «دستگاه نتوانست بشمارد» است.
  //    برگه معمولاً می‌نویسد "WBC Rechecked with PBS" یعنی لام دستی لازم است.
  //
  //    بدون این چک، موتور اورژانس کاذب «نوتروپنی شدید» می‌سازد
  //    در حالی که مشکل واقعی لکوسیتوز است.
  const diffPcts = ["NEUT_PCT", "LYMPH_PCT", "MONO_PCT", "EOS_PCT", "BASO_PCT"]
    .map((k) => tests[k])
    .filter((v) => v != null);
  const pctSum = diffPcts.reduce((s, v) => s + v, 0);

  // دیف معتبر نیست اگر:
  //   - مجموع درصدها خیلی کمتر از ۱۰۰ باشد (باید ~۱۰۰ شود)
  //   - یا نوتروفیل و لنفوسیت هر دو صفر/غایب باشند در حالی که دستگاه
  //     دست‌کم یکی را صفر گزارش کرده (غیرممکن در بیمار زنده).
  // ⚠️ احتیاط: اگر هر دو کاملاً غایب باشند (برگه اصلاً دیف ندارد)،
  //    این را «شکست» نمی‌گیریم — فقط یعنی دیف گزارش نشده.
  const neutZeroOrNull = tests.NEUT_PCT === 0 || tests.NEUT_PCT == null;
  const lymphZeroOrNull = tests.LYMPH_PCT === 0 || tests.LYMPH_PCT == null;
  const atLeastOneZero = tests.NEUT_PCT === 0 || tests.LYMPH_PCT === 0;
  // شرط سوم: WBC بسیار بالا + دیف تقریباً صفر (حتی اگر کمتر از ۳ دیف موجود باشد).
  //   نمونه: لوسمی با WBC=۲۵۸ که برگه فقط NEUT%=۰ و LYMPH%=۰ داده.
  //   فقط وقتی حداقل یک دیف گزارش شده (diffPcts.length >= 1) تا برگه‌ی
  //   بدون دیف را اشتباهاً نگیرد.
  const wbcVeryHigh = tests.WBC != null && tests.WBC > 50;
  const diffCollapsed = diffPcts.length >= 1 && pctSum < 10;
  const diffFailed =
    (diffPcts.length >= 3 && pctSum < 50) ||
    (neutZeroOrNull && lymphZeroOrNull && atLeastOneZero) ||
    (wbcVeryHigh && diffCollapsed);

  if (diffFailed) {
    // شمارش‌های مطلق را دور بریز — بی‌معنی‌اند
    for (const k of ["NEUT_ABS", "LYMPH_ABS", "MONO_ABS", "EOS_ABS", "BASO_ABS"]) {
      delete tests[k];
    }
    for (const k of diffPcts.length ? ["NEUT_PCT","LYMPH_PCT","MONO_PCT","EOS_PCT","BASO_PCT"] : []) {
      delete tests[k];
    }
  }

  // Diff درصد → مطلق
  if (tests.WBC && !diffFailed) {
    const abs = tests.WBC * 1000;
    for (const [p, a] of [
      ["NEUT_PCT", "NEUT_ABS"], ["LYMPH_PCT", "LYMPH_ABS"],
      ["MONO_PCT", "MONO_ABS"], ["EOS_PCT", "EOS_ABS"], ["BASO_PCT", "BASO_ABS"],
    ]) {
      if (tests[p] != null && tests[a] == null) {
        tests[a] = Math.round((abs * tests[p]) / 100);
      }
    }
  }

  return {
    tests,
    qual,
    unmapped,
    diffFailed,
    sex: inferSex(ocr),
    age: inferAge(ocr),
  };
}

/**
 * اجرای موتور روی خروجی OCR
 * @returns خروجی ساختاریافته برای پرامپت
 */
export function runEngine(ocr) {
  const { tests, qual, unmapped, diffFailed, sex, age } = ocrToEngineInput(ocr);

  // ═══ تصحیح‌های مشتق (پیش از درجه‌بندی، تا CTCAE و الگوها روی مقدار درست کار کنند) ═══
  const derived = {};

  // R1 — کلسیم تصحیح‌شده با آلبومین: Ca_corr = Ca + 0.8×(4.0 − Alb[g/dL]).
  //   در هیپوآلبومینمی کلسیم توتال کاذب پایین می‌شود؛ CTCAE هم کلسیم تصحیح‌شده می‌خواهد.
  if (tests.CA != null && tests.ALB != null) {
    const caCorr = +(tests.CA + 0.8 * (4.0 - tests.ALB)).toFixed(1);
    derived.ca_measured = tests.CA;
    derived.ca_corrected = caCorr;
    if (Math.abs(caCorr - tests.CA) >= 0.3) {
      tests.CA = caCorr;                    // درجه‌بندی و الگو روی مقدار تصحیح‌شده
      derived.ca_correction_applied = true;
    }
  }

  // R6 — سدیم تصحیح‌شده در هایپرگلیسمی: Na_corr = Na + 0.024×(Glu − 100) (Hillier).
  //   در قند خیلی بالا سدیم اندازه‌گیری‌شده کاذب پایین می‌شود (pseudohyponatremia).
  const gluForNa = maxGlucose(tests);
  if (tests.NA != null && gluForNa != null && gluForNa > 250) {
    const naCorr = +(tests.NA + 0.024 * (gluForNa - 100)).toFixed(0);
    derived.na_measured = tests.NA;
    derived.na_corrected = naCorr;
    if (Math.abs(naCorr - tests.NA) >= 3) {
      tests.NA = naCorr;
      derived.na_correction_applied = true;
    }
  }

  const graded = [];
  const noRef = [];

  for (const [key, value] of Object.entries(tests)) {
    if (key.startsWith("_") || key.endsWith("_PCT")) continue;
    const ref = getRef(key, sex, age);
    if (!ref) { noRef.push(key); continue; }

    const e = evaluate(key, value, ref[0], ref[1]);
    graded.push({
      test: key,
      value,
      range: `${ref[0]}–${ref[1]}`,
      refSource: getRefSource(key, age),
      ...e,
    });
  }

  // شاخص‌ها
  const idx = {};
  if (tests.MCV && tests.RBC) idx.mentzer = +(tests.MCV / tests.RBC).toFixed(1);
  if (tests.NEUT_PCT && tests.LYMPH_PCT) idx.nlr = +(tests.NEUT_PCT / tests.LYMPH_PCT).toFixed(1);
  if (tests.UREA_N && tests.CREAT) idx.bun_cr = +(tests.UREA_N / tests.CREAT).toFixed(0);
  if (tests.ALT && tests.ALP) {
    const ALT_ULN = getRef("ALT", sex, age)?.[1];
    const ALP_ULN = getRef("ALP", sex, age)?.[1];
    if (ALT_ULN && ALP_ULN) idx.r_ratio = +((tests.ALT / ALT_ULN) / (tests.ALP / ALP_ULN)).toFixed(1);
  }
  // R2 — آنیون‌گپ: Na − (Cl + HCO3). با سدیمِ اندازه‌گیری‌شده (نه تصحیح‌شده) محاسبه می‌شود.
  if (tests.NA != null && tests.CL != null && tests.HCO3 != null) {
    const naForAg = derived.na_measured ?? tests.NA;
    const ag = naForAg - (tests.CL + tests.HCO3);
    idx.anion_gap = +ag.toFixed(1);
    // تصحیح آلبومین (هر ۱ g/dL افت آلبومین ≈ ۲.۵ کاهش کاذب آنیون‌گپ)
    if (tests.ALB != null) idx.anion_gap_corr = +(ag + 2.5 * (4.0 - tests.ALB)).toFixed(1);
  }
  // R3 — eGFR با CKD-EPI 2021 (فقط بزرگسال؛ اطفال فرمول متفاوت دارند)
  if (tests.CREAT != null && age != null && age >= 18 && sex) {
    idx.egfr = ckdEpiEgfr(tests.CREAT, age, sex);
  }
  // تصحیح‌های مشتق را برای مصرف الگوها در indices بگذار
  Object.assign(idx, derived);

  return {
    sex, age,
    graded,
    qual,
    indices: idx,
    unmapped,
    noRef,
    diffFailed,
    abnormal: graded.filter((g) => g.abnormal),
  };
}
