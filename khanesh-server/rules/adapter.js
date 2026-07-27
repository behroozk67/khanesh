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
  urea: "UREA", اوره: "UREA", bun: "UREA_N", bloodureanitrogen: "UREA_N", ureanitrogen: "UREA_N",
  creatinine: "CREAT", cr: "CREAT", کراتینین: "CREAT",
  creatinin: "CREAT", creatnine: "CREAT", cretinine: "CREAT", serumcreatinine: "CREAT",
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
  // ACR — فقط نام‌های صریحِ «نسبت آلبومین به کراتینین». «albumin»/«microalbumin»
  // تنها (غلظت mg/L) عمداً نگاشت نمی‌شود چون نقاط برشِ KDIGO فقط برای نسبت (mg/g) معتبرند.
  acr: "ACR", uacr: "ACR", albumincreatinineratio: "ACR",
  albumintocreatinineratio: "ACR", urinealbumincreatinineratio: "ACR",
  microalbumincreatinineratio: "ACR", malbcr: "ACR",
  نسبتآلبومینبهکراتینین: "ACR", آلبومینبهکراتینین: "ACR",
  میکروآلبومینبهکراتینین: "ACR",
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
  folate: "FOLATE", folicacid: "FOLATE", فولات: "FOLATE",
  vitd: "VIT_D", vitamind: "VIT_D", "vitamind3": "VIT_D",
  "25ohd": "VIT_D", "25ohvitamind": "VIT_D", "25hydroxyvitamind": "VIT_D",
  vitamind25oh: "VIT_D", "ویتامیند": "VIT_D",
  tsh: "TSH",
  ft4: "FT4", freet4: "FT4",
  ft3: "FT3", freet3: "FT3",
  t3: "T3", totalt3: "T3", tt3: "T3",
  antitpo: "ANTI_TPO", tpoab: "ANTI_TPO", tpoantibody: "ANTI_TPO", "anti-tpo": "ANTI_TPO", thyroidperoxidaseantibody: "ANTI_TPO",
  t4: "T4", totalt4: "T4", tt4: "T4",
  // ⚠️ املاهای واقعیِ برگه‌های ایرانی. این‌ها تایپیِ ما نیستند — عیناً روی
  //    برگه چاپ شده‌اند و بدونشان تست «خوانده ولی تفسیرنشده» می‌ماند.
  chol: "CHOL", cholesterol: "CHOL", totalcholesterol: "CHOL",
  cholestrol: "CHOL", cholestrole: "CHOL", colesterol: "CHOL",
  cholesterole: "CHOL", cholestérol: "CHOL", کلسترول: "CHOL",
  hdl: "HDL", hdlc: "HDL", hdlcholesterol: "HDL", "hdl-c": "HDL", hdlcholestrol: "HDL",
  ldl: "LDL", ldlc: "LDL", ldlcholesterol: "LDL", "ldl-c": "LDL", ldlcholestrol: "LDL",
  tg: "TG", triglyceride: "TG", triglycerides: "TG",
  triglicerde: "TG", triglicerid: "TG", triglicerides: "TG", trigliserid: "TG",
  triglycerid: "TG", تریگلیسیرید: "TG", تریگلیسرید: "TG",
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

  // ═══ سرولوژی — بلوکِ ثابتِ برگه‌های ایرانی ═══
  // 🔴 باگ واقعی: رایت/2ME/کومبس رایت اصلاً در NAME_MAP نبودند → unmapped →
  //    و چون هیچ‌کدام به abnormal نمی‌رسیدند، برگه‌ای که تنها ایرادش «رایت ۱/۳۲۰»
  //    بود پاسخِ آمادهٔ «نتایج شما طبیعی است» می‌گرفت.
  wright: "WRIGHT", wrighttest: "WRIGHT", wrighttube: "WRIGHT",
  wrightagglutination: "WRIGHT", standardtubeagglutination: "WRIGHT",
  brucellaagglutination: "WRIGHT", brucellawright: "WRIGHT",
  tubeagglutinationtest: "WRIGHT", رایت: "WRIGHT", تسترایت: "WRIGHT",
  آزمایشرایت: "WRIGHT", آگلوتیناسیون: "WRIGHT",

  // ⚠️ norm() رقم را نگه می‌دارد، پس کلید واقعاً «2me» است.
  "2me": "ME2", "2mercaptoethanol": "ME2", "2mercaptoetanol": "ME2",
  mercaptoethanol: "ME2", me2: "ME2", "2mewright": "ME2", wright2me: "ME2",
  مرکاپتواتانول: "ME2", دومرکاپتواتانل: "ME2", "۲امای": "ME2",

  // ⚠️ هرگز روی «coombs» تنها تطبیق نده: کومبس مستقیم/غیرمستقیم (DAT/IAT)
  //    آزمایشِ کاملاً دیگری‌اند و روی همان بلوکِ سرولوژی می‌نشینند.
  coombswright: "COOMBS_WRIGHT", combswright: "COOMBS_WRIGHT",
  coombswrighttest: "COOMBS_WRIGHT", coombsbrucella: "COOMBS_WRIGHT",
  brucellacoombs: "COOMBS_WRIGHT", کومبسرایت: "COOMBS_WRIGHT",
  کمبسرایت: "COOMBS_WRIGHT",

  // فاکتور روماتوئید — هم شکل کمی (IU/mL) هم تیتر/کیفی
  rheumatoidfactor: "RF", rafactor: "RF", ralatex: "RF", rflatex: "RF",
  rfquantitative: "RF", rfquant: "RF", rhfactor: "RF",
  فاکتورروماتوئید: "RF", فاکتورروماتیسمی: "RF", رومافاکتور: "RF", آرافاکتور: "RF",

  crplatex: "CRP_Q", creactiveprotein: "CRP_Q", crpqualitative: "CRP_Q",
};

// ---------- نگاشتِ پشتیبان برای املاهای دیده‌نشده ----------
// ⚠️ NAME_MAP تطبیقِ دقیق می‌خواهد، پس هر املای تازه‌ای که روی برگه ظاهر شود
//    تست را unmapped می‌کند و از تفسیر می‌اندازد. نمونهٔ واقعی: «ESR 1hrs»
//    خوانده شد ولی تفسیر نشد، در حالی که مقدارش ۸۵ بود (مرجع تا ۲۲).
//
// اینجا فقط قاعده‌هایی می‌آیند که *مبهم نیستند* — حدسِ فازی عمداً نداریم،
// چون نگاشتِ اشتباه در متنِ بالینی از نگاشت‌نشدن بدتر است.
function resolveAlias(key) {
  // هیچ تستِ دیگری با esr شروع نمی‌شود؛ «ESR 1hrs»، «ESR 1st hour»، «ESR 2hrs»
  if (/^esr/.test(key)) return "ESR";
  // جمعِ انگلیسی و «e» پایانیِ اختیاری: cholesterols → cholesterol
  if (key.endsWith("s") && NAME_MAP[key.slice(0, -1)]) return NAME_MAP[key.slice(0, -1)];
  if (NAME_MAP[key + "e"]) return NAME_MAP[key + "e"];
  return undefined;
}

/** کلیدِ برگه → کلیدِ موتور (با پشتیبانِ املایی) */
function mapKey(key) {
  return NAME_MAP[key] ?? resolveAlias(key);
}

// ---------- پارسِ تیتر ----------
// ⚠️ toNum() هر چیزِ غیر رقم را دور می‌ریزد، پس toNum("1/160") = ۱۱۶۰ می‌دهد.
//    تیتر باید پارسرِ خودش را داشته باشد وگرنه «۱/۱۶۰» به عددِ چهاررقمی
//    تبدیل و با محدودهٔ مرجع مقایسه می‌شود.
//
// برمی‌گرداند: مخرجِ تیتر (۱/۱۶۰ → ۱۶۰)، ۰ برای منفی، یا null اگر نفهمید.
export function parseTitre(raw) {
  if (raw == null) return null;
  let s = String(raw).trim();
  // ارقام فارسی/عربی → لاتین
  s = s.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
       .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
  // منفیِ صریح — پیش از هر عددخوانی، چون «1/20 Negative» هم عدد دارد
  if (/neg|منفی|not\s*detected|^nr$|بدون\s*واکنش/i.test(s)) return 0;
  // «<1/20» یا «کمتر از ۱/۲۰» → زیرِ آستانه، عملاً منفی
  if (/^\s*(<|≤|کمتر)/.test(s)) return 0;
  // شکل‌های ۱/۱۶۰ و ۱:۱۶۰
  const m = s.match(/\b1\s*[:/]\s*(\d+)/);
  if (m) return Number(m[1]);
  // عددِ تنها (برگه گاهی فقط «160» می‌نویسد)
  const n = s.match(/^\s*(\d+)\s*$/);
  if (n) return Number(n[1]);
  if (/pos|مثبت/i.test(s)) return null;   // مثبتِ بدون تیتر — تیتر نداریم
  return null;
}

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

// ═══════════ تفکیک زمینهٔ ادرار از خون ═══════════
// 🔴 باگ واقعی: روی برگهٔ ادرار، «pH = ۵» با محدودهٔ pH خون (۷.۳۵–۷.۴۵) سنجیده شد
//    و الگوی severe_acidosis یک «اورژانس» کاذب ساخت. همچنین Protein/Blood/WBC/RBC
//    ادراری unmapped می‌شدند و الگوهای ادرار هرگز فعال نمی‌شدند.
//
// سه لایهٔ محافظت (به ترتیب قطعیت):
//   ۱. واحد /hpf یا /lpf  → قطعاً میکروسکوپی ادرار است، نه شمارش خون.
//   ۲. pH خارج از دامنهٔ سازگار با حیات → قطعاً pH ادرار است.
//   ۳. صفحه‌ای که فقط نشانگر ادرار دارد و هیچ نشانگر CBC ندارد → کلیدهای مبهم ادراری‌اند.

// نشانگرهایی که فقط روی برگهٔ ادرار می‌آیند
const URINE_ONLY_MARKERS = new Set([
  "specificgravity", "sg", "color", "appearance", "turbidity",
  "nitrite", "nitrites", "leukocyteesterase", "urobilinogen",
  "casts", "crystals", "yeasts", "epithelialcells", "epithelial",
  "mucus", "puscell", "puscells", "bacteria", "urinalysis", "ua",
]);

// نشانگرهایی که فقط روی برگهٔ خون (CBC) می‌آیند — برای محافظت از برگهٔ ترکیبی
const BLOOD_ONLY_MARKERS = new Set([
  "mcv", "mch", "mchc", "plt", "platelet", "hct", "hematocrit", "pcv",
  "neut", "neu", "lymph", "lym", "mono", "eos", "baso",
  "rdw", "rdwcv", "rdwsd", "mpv", "esr",
]);

// نشانگرهای بیوشیمیِ سرمی که روی میکروسکوپی/دیپ‌استیک ادرار نمی‌آیند.
// ⚠️ باگ واقعی: برگهٔ «بیوشیمی + ادرار» (بدون CBC) به‌عنوان «ادرارِ خالص» شناخته می‌شد
//    و قند/هموگلوبینِ خونِ همان برگه به «قند/هموگلوبین ادرار» منحرف می‌شد — بی‌هیچ هشدار.
//    این‌ها شاهدِ «این صفحه ادرارِ خالص نیست» هستند.
//    عمداً کلیدهای مبهم (na/k/ca/creatinine که در پنل ادرار هم می‌آیند) را نمی‌گذاریم.
const BLOOD_BIOCHEM_MARKERS = new Set([
  "urea", "bun", "cholesterol", "chol", "tg", "triglyceride", "triglycerides",
  "ast", "sgot", "alt", "sgpt", "alp", "ggt", "ldh", "hba1c", "a1c",
  "ferritin", "iron", "tibc", "tsh", "ft4", "ft3", "t3", "t4",
  "uricacid", "amylase", "lipase", "hdl", "ldl", "b12", "vitd", "vitamind",
]);

// نشانگرهای گاز خون شریانی (ABG) — تنها زمینه‌ای که pH خون معنا دارد.
const ABG_MARKERS = new Set([
  "hco3", "bicarbonate", "pco2", "paco2", "po2", "pao2",
  "baseexcess", "be", "abg", "so2", "sao2", "o2sat",
]);

// کلیدهایی که هم روی برگهٔ خون و هم روی برگهٔ ادرار دیده می‌شوند
const AMBIGUOUS_URINE_KEYS = new Set([
  "ph", "wbc", "rbc", "glucose", "hgb", "hb", "protein", "bilirubin", "blood", "ketone",
]);

// pH خون فقط در این دامنه با حیات سازگار است؛ خارج از آن یعنی pH ادرار.
const BLOOD_PH_MIN = 6.5;
const BLOOD_PH_MAX = 7.9;

/**
 * کدام صفحه‌ها «برگهٔ ادرارِ خالص»‌اند؟
 * شرط محافظه‌کارانه: حداقل ۲ نشانگر ادرار و هیچ نشانگر خون (CBC یا بیوشیمی).
 * (اگر صفحه‌ای شاهد خون داشته باشد، دست نمی‌زنیم تا تستِ خون از بین نرود.)
 */
function detectUrineOnlyPages(ocrTests) {
  const urineCount = new Map();
  const bloodCount = new Map();
  for (const t of ocrTests) {
    if (!t?.name) continue;
    const p = t._page ?? 0;
    const k = norm(t.name);
    if (URINE_ONLY_MARKERS.has(k)) urineCount.set(p, (urineCount.get(p) ?? 0) + 1);
    if (BLOOD_ONLY_MARKERS.has(k) || BLOOD_BIOCHEM_MARKERS.has(k)) {
      bloodCount.set(p, (bloodCount.get(p) ?? 0) + 1);
    }
  }
  const pages = new Set();
  for (const [p, n] of urineCount) {
    if (n >= 2 && !(bloodCount.get(p) > 0)) pages.add(p);
  }
  return pages;
}

/** کدام صفحه‌ها پنل گاز خون (ABG) دارند؟ فقط این صفحه‌ها pH خون معنا دارند. */
function detectAbgPages(ocrTests) {
  const pages = new Set();
  for (const t of ocrTests) {
    if (!t?.name) continue;
    if (ABG_MARKERS.has(norm(t.name))) pages.add(t._page ?? 0);
  }
  return pages;
}

// آیا این کلید (نرمال‌شده) کیفی است؟
// هم تطبیق دقیق با Set، هم چند الگوی امن برای نام‌های ترکیبی.
// ⚠️ الگوها عمداً محدودند تا با تست‌های عددی تداخل نکنند.
const QUALITATIVE_PATTERNS = [
  // تروپونین جداگانه و بالاتر مدیریت می‌شود (عددی یا کیفی)
  /^hbsag/,      // hbsagquant, ...
  /^hcvab/,      // hcvabscreen, ...

  // ⚠️ باگ واقعی (هم‌خانوادهٔ N2): قبلاً فقط کلیدهای دقیقِ hbsag/hcvab/hiv
  //    کیفی شمرده می‌شدند. برگه‌ها تقریباً هیچ‌وقت «HIV» تنها نمی‌نویسند —
  //    «HIV Ab»، «HIV 1/2 Ab»، «Anti-HIV» می‌نویسند. آن نام‌ها نه به qual
  //    می‌رفتند نه به tests، پس قاعدهٔ hiv_screen_reactive هرگز فعال نمی‌شد و
  //    یک غربالگریِ واکنش‌گر پاسخِ buildNormalResult() («طبیعی است») می‌گرفت.
  /^(anti)?hiv/,          // hiv, hivab, hiv12ab, antihiv, hivantibody
  /^(anti)?hcv/,          // hcv, hcvantibody, antihcv
  /^hepatitisc/,          // hepatitiscantibody, hepatitiscab
  /^hepatitisbsurface/,   // hepatitisbsurfaceantigen (= HBsAg)
  /^(anti)?hbs$|^antihbs/,// Anti-HBs — کیفی است، ولی نشانهٔ ایمنی/واکسن، نه عفونت
  /^antihbc/,             // Anti-HBc — عفونتِ گذشته/فعلی، تفسیرش با HBsAg فرق دارد
  /^هپاتیت/, /^ایدز/, /^اچآیوی/,
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
  const urineOnlyPages = detectUrineOnlyPages(ocr?.tests || []);
  const abgPages = detectAbgPages(ocr?.tests || []);

  for (const t of ocr?.tests || []) {
    if (!t?.name) continue;
    const key = norm(t.name);
    const onUrinePage = urineOnlyPages.has(t._page ?? 0);
    const onAbgPage = abgPages.has(t._page ?? 0);

    // ═══ لایه ۱: واحد /hpf یا /lpf → میکروسکوپی ادرار، نه شمارش خون ═══
    if (/\/?\s*[hl]pf/i.test(String(t.unit || ""))) {
      qual[/urine|ادرار|^u/i.test(t.name) ? t.name : `Urine ${t.name}`] = String(t.value);
      continue;
    }

    // ═══ لایه ۲: pH فقط با شاهدِ گاز خون، pH خون است ═══
    // ⚠️ باگ واقعی: روی برگهٔ بدون ABG، pH ادرارِ ۷.۰ به‌عنوان pH خون سنجیده می‌شد و
    //    الگوی severe_acidosis یک «🚨 اورژانس» کاذب می‌ساخت. pH خون فقط با پنل گاز خون
    //    (HCO3/pCO2/…) اندازه‌گیری می‌شود؛ pH تنها روی یک برگه تقریباً همیشه pH ادرار است.
    //    pH خارج از دامنهٔ حیات (۵) هم که قطعاً ادرار است.
    if (key === "ph") {
      const v = toNum(t.value);
      const isBloodPh = onAbgPage && !onUrinePage &&
        v != null && v >= BLOOD_PH_MIN && v <= BLOOD_PH_MAX;
      if (!isBloodPh) {
        qual["Urine pH"] = String(t.value);
        continue;
      }
    }

    // ═══ لایه ۳: کلید مبهم روی برگهٔ ادرارِ خالص → ادراری تلقی شود ═══
    // این هم اورژانس کاذب را می‌بندد و هم الگوهای ادرار را فعال می‌کند
    // (قبلاً این‌ها unmapped می‌شدند و کلاً از دست می‌رفتند).
    if (onUrinePage && AMBIGUOUS_URINE_KEYS.has(key)) {
      qual[/urine|ادرار/i.test(t.name) ? t.name : `Urine ${t.name}`] = String(t.value);
      continue;
    }

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

    // ═══ سرولوژی بروسلوز: مقدار، تیتر است نه غلظت ═══
    // مخرجِ تیتر ذخیره می‌شود («۱/۱۶۰» → ۱۶۰، منفی → ۰) تا با آستانه‌های
    // راهنمای کشوری در refs.js سنجیده شود. «مثبتِ بدون تیتر» عدد ندارد و
    // نباید عددی ساخته شود — کیفی می‌ماند تا الگو خودش تصمیم بگیرد.
    if (["WRIGHT", "ME2", "COOMBS_WRIGHT"].includes(mapKey(key))) {
      const ek = mapKey(key);
      const titre = parseTitre(t.value);
      if (titre != null) tests[ek] = titre;
      else qual[t.name] = String(t.value);
      continue;
    }

    // ⚠️ باگ واقعی (هم‌خانوادهٔ تروپونین): «crp» و «rf» در فهرست QUALITATIVE
    //    بودند، پس حتی وقتی برگه عددِ واقعی می‌داد («CRP 24 mg/L»، «RF 42 IU/mL»)
    //    مقدار به qual می‌رفت و هرگز با مرجعِ خودش سنجیده نمی‌شد.
    //    حالا مثل تروپونین: عدد → کلیدِ عددی، کلمه/پلاس → کیفی.
    if (["CRP_Q", "RF"].includes(mapKey(key)) || key === "crp" || key === "rf") {
      const ek = mapKey(key) ?? (key === "crp" ? "CRP_Q" : "RF");
      const nv = toNum(t.value);
      // «3+» و «+++» عدد نیستند حتی اگر toNum رقمی از آن‌ها دربیاورد.
      const looksGraded = /\+/.test(String(t.value));
      if (nv != null && !looksGraded) {
        // mg/dL → mg/L برای CRP (برگه‌های ایرانی هر دو را می‌دهند)
        tests[ek] = (ek === "CRP_Q" && /mg\/dl/i.test(String(t.unit || "")))
          ? +(nv * 10).toFixed(1)
          : nv;
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

    let engineKey = mapKey(key);
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

    // اوره را همان‌طور که هست نگه می‌داریم و با محدودهٔ مرجعِ خودِ اوره تفسیر می‌کنیم
    // (نه تبدیل به BUN). تبدیل ÷۲.۱۴ فقط داخلی و صرفاً برای شاخصِ BUN/Cr می‌ماند.
    if (engineKey === "UREA") {
      tests.UREA = v;
      continue;
    }

    // T3 با واحد SI (nmol/L) → ng/dL که موتور می‌فهمد.
    // ⚠️ باگ واقعی: فرم دستی دو فیلد T3 دارد («Total T3 (ng/dL)» و «(nmol/L)»)
    //    که پس از حذف پرانتز هر دو به کلید T3 می‌رسند. بدون تبدیل، مقدار SI طبیعی
    //    مثل ۲.۲ با محدودهٔ ng/dL [80–200] سنجیده می‌شد و «پایین» کاذب می‌داد.
    //    ۱ nmol/L ≈ ۶۵.۱ ng/dL (وزن مولکولی T3 = ۶۵۱).
    if (engineKey === "T3" && /nmol/i.test(String(t.unit || ""))) {
      tests.T3 = Math.round(v * 65.1);
      continue;
    }

    // ⚠️ شمارش مطلق: برگه معمولاً 10^3/uL می‌دهد (مثل NEU# = 3.66)
    //    موتور /µL می‌خواهد. اگر عدد کوچک بود، ضرب در 1000.
    if (engineKey.endsWith("_ABS") && v < 100) {
      tests[engineKey] = Math.round(v * 1000);
      continue;
    }

    // ⚠️ 🔴 باگ واقعی: WBC/PLT/RBC روی برگه گاهی خامِ شمارش‌اند (WBC 7000،
    //    پلاکت 250000، RBC 4800000) ولی refs.js واحدِ K/µL و M/µL می‌خواهد
    //    (WBC 4.4–11، PLT 150–450، RBC 4.5–5.9). بدون نرمال‌سازی، یک CBC کاملاً
    //    طبیعی «لکوسیتوز شدید — بررسی فوری» می‌گرفت؛ یعنی اورژانسِ کاذب روی
    //    شایع‌ترین آزمایشِ ممکن. برخلافِ _ABS و D-dimer و ACR، اینجا هیچ
    //    محافظی نبود.
    //
    //    آستانه‌ها با فاصلهٔ ایمن از بیشترین مقدارِ بالینیِ ممکن انتخاب شده‌اند،
    //    تا مقدارِ واقعاً بحرانی (که همان واحدِ درست را دارد) نصفه نشود:
    //      • WBC: بالاترین گزارش‌های لوسمی ≈ ۵۰۰ K/µL → آستانهٔ ۱۰۰۰
    //      • PLT: ترومبوسیتوزِ شدید تا ≈ ۲۰۰۰ K/µL → آستانهٔ ۳۰۰۰
    //      • RBC: پلی‌سیتمی تا ≈ ۱۰ M/µL → آستانهٔ ۱۰۰
    if (engineKey === "WBC" || engineKey === "PLT" || engineKey === "RBC") {
      const u = String(t.unit || "").toLowerCase().replace(/\s+/g, "");
      // واحدِ صریحِ خام: /µL یا /mm³ بدون هیچ نشانهٔ 10^3
      const rawUnit = /(\/ul|\/µl|\/μl|\/mm3|\/mm³|cells)/.test(u) && !/(10\^?3|10\*3|k\/|10\^?6|10\*6|m\/)/.test(u);
      const RAW_MIN = { WBC: 1000, PLT: 3000, RBC: 100 }[engineKey];
      const DIVISOR = engineKey === "RBC" ? 1e6 : 1000;
      if (v >= RAW_MIN || (rawUnit && v >= RAW_MIN)) {
        const scaled = v / DIVISOR;
        tests[engineKey] = engineKey === "RBC" ? +scaled.toFixed(2) : +scaled.toFixed(1);
        continue;
      }
      tests[engineKey] = v;
      continue;
    }

    // ⚠️ D-dimer: واحدها بدنام‌اند و برگه‌های ایرانی اغلب mg/L یا µg/mL می‌دهند
    //    (مثل «۱.۵، مرجع <۰.۵»). موتور ng/mL می‌خواهد (refs.js). بدون تبدیل،
    //    ۱.۵ mg/L (= ۱۵۰۰ ng/mL، واضحاً بالا) با [0,200] «نرمال» گزارش می‌شد و
    //    حتی DIC از دست می‌رفت. تبدیلِ حجمی مستقل از قرارداد FEU/DDU است.
    //    ۱ mg/L = ۱ µg/mL = ۱۰۰۰ ng/mL ؛ ۱ µg/L = ۱ ng/mL.
    if (engineKey === "DDIMER") {
      const u = String(t.unit || "").toLowerCase().replace(/\s+/g, "");
      tests._ddimer_raw = v;
      if (/(mg\/l|µg\/ml|μg\/ml|ug\/ml)/.test(u)) {
        tests.DDIMER = Math.round(v * 1000);          // mg/L یا µg/mL → ng/mL
      } else if (/(ng\/ml|µg\/l|μg\/l|ug\/l)/.test(u)) {
        tests.DDIMER = v;                             // ng/mL یا µg/L (معادل)
      } else if (v < 50) {
        tests.DDIMER = Math.round(v * 1000);          // بدون واحد، عددِ کوچک ≈ mg/L
      } else {
        tests.DDIMER = v;                            // بدون واحد، عددِ بزرگ ≈ ng/mL
      }
      continue;
    }

    // ⚠️ ACR: نقاط برشِ KDIGO بر حسب mg/g است. برگه‌های SI گاهی mg/mmol می‌دهند
    //    (۱ mg/mmol ≈ ۸.۸۴ mg/g). µg/mg با mg/g عددی برابر است.
    if (engineKey === "ACR") {
      const u = String(t.unit || "").toLowerCase().replace(/\s+/g, "");
      if (/mg\/mmol|mmol/.test(u)) {
        tests.ACR = +(v * 8.84).toFixed(1);          // mg/mmol → mg/g
      } else {
        tests.ACR = v;                               // mg/g یا µg/mg (معادل)
      }
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
  // BUN/Cr: از BUNِ اندازه‌گیری‌شده؛ اگر فقط اوره داریم، BUN را داخلی (اوره÷۲.۱۴) برای همین شاخص می‌سازیم.
  const bunForRatio = tests.UREA_N != null ? tests.UREA_N
                    : (tests.UREA != null ? ureaToBUN(tests.UREA) : null);
  if (bunForRatio != null && tests.CREAT) idx.bun_cr = +(bunForRatio / tests.CREAT).toFixed(0);
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
  // non-HDL کلسترول = کلسترول تام − HDL (Kenwright, «Lipids and Lipoproteins»).
  //   همهٔ ذرات آتروژنِ حاوی ApoB را پوشش می‌دهد، در حالت غیرناشتا هم معتبر است،
  //   و برخلاف LDLِ فریدوالد با تری‌گلیسریدِ بالا خراب نمی‌شود. هدف ≈ هدفِ LDL + ۳۰.
  if (tests.CHOL != null && tests.HDL != null) {
    idx.non_hdl = +(tests.CHOL - tests.HDL).toFixed(0);
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
