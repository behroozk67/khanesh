// ============================================================
// LabMate — پل بین OCR و موتور قواعد
//
// کار این فایل:
//   ۱. نام تست‌های برگه (W.B.C, Hb, urea, ...) → کلید موتور (WBC, HGB, UREA_N)
//   ۲. تبدیل واحد (اوره → BUN)
//   ۳. Diff درصدی → مطلق
//   ۴. استنتاج سن و جنسیت
// ============================================================

import { getRef, getRefSource, getUnit, REPRO_HORMONE_KEYS, HCG_POSITIVE_ABOVE, HCG_QUAL_NAME_RE,
  inNeonatalRedCellPeriod, NEONATAL_NO_ADULT_FALLBACK } from "./refs.js";
import { evaluate } from "./grade.js";
import { CLASSIFIERS } from "./interpret.js";
import { getPedRef } from "./refs_ped.js";
import { toConventional, UNIT_PROFILE, recognizedUnit, decideUnit, verdictsAcrossSystems, BRANCH_FACTORS,
         parseReference, printedVerdict, readingsAcrossSystems, printedRangeFits, possibleConv, normUnit,
         HEMOSTASIS_KEYS, hemostasisUnit, SURVIVAL_LIMITS, EXTRA_PRINTED_UNITS, extraUnitContradicted } from "./units.js";
// فقط برای سنجیدنِ «هر خوانشِ ممکن»ِ عددِ بی‌واحد با خودِ موتور (specs/003، B3). patterns.js هیچ‌چیز از
// adapter.js نمی‌خواند، پس چرخهٔ import نیست.
import { runPatterns } from "./patterns.js";
import { conditionIds } from "./conditions.js";
import { faName } from "./names.js";
import { computePhenoAge } from "./pheno_age.js";
// سیلندرِ ادرار (specs/005). patterns_utils.js هم چیزی از adapter.js نمی‌خواند.
import { routeSerology, isFecalBloodName } from "./serology.js";
// P117: کانالِ مشاهده‌های توصیفیِ مدفوع (رنگ/قوام/بقایای غذایی/مخاط/خونِ آشکار/تخم/کیست).
import { stoolFieldOf } from "./stool.js";
import { isPrenatalSheet, prenatalClaim, prenatalItem, parseRiskDenominator, parseRiskCategory, parseGaDays } from "./prenatal.js";
import { specimenSheetEvidence, specimenClaim, BARE_FLUID_LOOKALIKES } from "./specimen.js";
import { parseSampleDate } from "./sampledate.js";
import { isCastKey, castRoute, isSgKey, sgValue, SG_KEY, isCrystalKey, crystalRoute, epithelialKind, epithelialRoute,
  urineBiliValueState, urobilValueState, smearRow, mergeSmear, rbcMorphRow, mergeRbcMorph, MCHC_PLAUSIBLE_GDL, MCH_PLAUSIBLE_PG } from "./patterns_utils.js";

// بیشترین مقدار قندِ موجود (ناشتا/تصادفی/دوساعته) — برای تصحیح سدیم
function maxGlucose(tests) {
  const vals = [tests.GLU_F, tests.GLU_RANDOM, tests.GLU_2H].filter((v) => v != null);
  return vals.length ? Math.max(...vals) : null;
}

// ---------- نرمال‌سازی نام ----------
// P111 (بازبینیِ ۲۰۲۶-۱۰-۲۰، پیشنهادِ کاربر): پسوندِ روشِ دستگاه بخشی از نامِ آزمایش نیست.
//   «TSH (CL)»، «25 OH-Vit D (CLIA)»، «Bilirubin T (ECL)» — متد (کمی‌لومینسانس، الایزا، IFA…) روی برگه
//   چاپ می‌شود ولی هویتِ تست را عوض نمی‌کند. پیش‌تر برای هر کلید یک املاي چسبیدهٔ جداگانه ساخته می‌شد
//   (tshcl، tbilirubinclot …) و هر نامِ تازه‌ای که می‌رسید دوباره unmapped می‌شد. حالا یک قاعده: پسوندِ
//   داخلِ پرانتز/براکت در انتهای نام حذف می‌شود تا «TSH (CL)» همان TSH دیده شود.
const METHOD_PAREN_RE = /\s*[\(\[]\s*(cl|clia|ecl|eclia|elisa|ifa|cmia|icma|hplc|ria|fpia|eia|lia|petia|enzymatic|immunoassay|chemiluminescence)\s*[\)\]]\s*$/i;
// علامتِ پانویسِ برگه در نام: «WBC(*1)»، «WBC *1»، «HDL(**)»، «Hb†»، «Hb¹»، «Hb [1]». فقط ستاره/خنجر/بالانویس یا تک‌رقمِ داخلِ [ ] یا پرانتزِ
// ستاره‌دار؛ «(1)» ساده، «Factor VIII»، «B12» و «10*3»/«10³» (پس از رقم) دست نمی‌خورند. حدسِ فازی نیست: فقط حذفِ نشانه.
const FOOTNOTE_RE = /\s*(?:\(\s*[*†‡§¶]+\s*[\d۰-۹]?\s*\)|\(\s*[\d۰-۹]\s*[*†‡§¶]+\s*\)|\[\s*[\d۰-۹]\s*\]|(?<![\d۰-۹])[*†‡§¶]+\s*[\d۰-۹]?(?![\d۰-۹])|(?<![\d۰-۹])[¹²³⁰⁴-⁹]+)/g;
export function stripFootnote(name) {
  const s = String(name ?? "");
  const out = s.replace(FOOTNOTE_RE, "");
  return out === s || !out.trim() ? s : out.replace(/\s{2,}/g, " ").trim();
}
function norm(s) {
  let str = stripFootnote(s || "");
  for (let i = 0; i < 3 && METHOD_PAREN_RE.test(str); i++) str = str.replace(METHOD_PAREN_RE, "");
  return str
    .toLowerCase()
    .replace(/[\s._\-\/()%#,]/g, "")   // «،»/«,» هم: «Glucose, Fasting»، «Potassium, Serum»
    .replace(/[يی]/g, "ی")
    .replace(/[كک]/g, "ک")
    .replace(/\u200c/g, "")   // نیم‌فاصله
    .trim();
}

// ---------- نگاشت نام برگه → کلید موتور ----------
// کلیدها نرمال‌شده‌اند (بدون نقطه، فاصله، خط تیره)
export const NAME_MAP = {   // export فقط برای metamorphic.test.js (هم‌ارزیِ املاها)
  // CBC
  wbc: "WBC", whitebloodcell: "WBC", wb: "WBC",
  rbc: "RBC", redbloodcell: "RBC",
  hb: "HGB", hgb: "HGB", hemoglobin: "HGB", haemoglobin: "HGB", هموگلوبین: "HGB",
  hct: "HCT", hematocrit: "HCT", haematocrit: "HCT", pcv: "HCT", هماتوکریت: "HCT",
  mcv: "MCV", mch: "MCH", mchc: "MCHC",
  plt: "PLT", platelet: "PLT", plateletcount: "PLT", پلاکت: "PLT",
  retic: "RETIC", reticulocyte: "RETIC",
  // specs/007 (G8): شمارشِ *مطلقِ* رتیکولوسیت (×10⁹/L) کلیدِ جدای خود را دارد و هرگز RETIC ِ درصدی نیست.
  // بی‌بازه (P52) ⇒ همیشه noRef، حتی نوزاد — ردیفِ PED_REFS.RETIC_ABS واحدِ نامعلوم دارد (REF_DIFF.md).
  // پیش از این هر چهار املا به unmapped می‌رفتند (M181). «arc»/«reticabs» با هیچ کلیدِ دیگری برخورد ندارند.
  arc: "RETIC_ABS", reticabs: "RETIC_ABS", retabs: "RETIC_ABS", absoluteretic: "RETIC_ABS",
  absolutereticulocyte: "RETIC_ABS", absolutereticulocytes: "RETIC_ABS", reticulocyteabsolute: "RETIC_ABS",
  reticulocytecountabsolute: "RETIC_ABS", رتیکولوسیتمطلق: "RETIC_ABS",
  // ═══ specs/008 (FR-007، N25): الکتروفورزِ هموگلوبین و نشانگرهای آهنِ تخصصی ═══
  // پیش‌تر همه unmapped بودند. هیچ‌کدام با کلیدِ دیگری برخورد ندارد (بررسی‌شده در NAME_MAP، قاعدهٔ جمع و
  // قاعدهٔ دونیمه‌ای resolveAlias). hemoglobina1c/hba1c کلیدِ دقیقِ جدا دارند، پس «hba» آن‌ها را نمی‌رباید.
  // ⚠️ hbs/hbc/hbe عمداً اینجا نیستند: با HBs/anti-HBc/HBeِ هپاتیت هم‌نام‌اند — لایهٔ الکتروفورز در runEngine.
  //    «a2» تنها هم فقط با واحدِ ٪ (همان لایه).
  hba2: "HBA2", hemoglobina2: "HBA2", haemoglobina2: "HBA2", هموگلوبینa2: "HBA2",
  hbf: "HBF", fetalhb: "HBF", fetalhemoglobin: "HBF", hemoglobinf: "HBF", هموگلوبینf: "HBF", هموگلوبینجنینی: "HBF",
  hba: "HBA", hba0: "HBA", hemoglobina: "HBA",
  // 🔴 بازبینیِ دور ۲ (R2-B4): «Hgb A2/F/A» — بی‌این‌ها «Hgb A2 3.1 %» شناخته نمی‌شد و صفحه شاهدِ الکتروفورز نمی‌گرفت.
  hgba2: "HBA2", hgbf: "HBF", hgba: "HBA", hgba0: "HBA",
  sicklehb: "HBS", هموگلوبینs: "HBS",
  // 🔴 دور ۲ (R2-B5): «هموگلوبین E/C/A» فارسی و برچسبِ HPLCِ «HbA2/E» — بی‌این‌ها به unmapped و «همه طبیعی» می‌رفتند.
  //    فارسی دوپهلو نیست (هپاتیت را «HBs» می‌نویسند)، پس بی‌دروازه. «A2/E» یک پنجره است؛ عددِ بالایش را hba2Clause
  //    («very_high»، احتمالِ HbE) می‌گوید.
  هموگلوبینe: "HBE", هموگلوبینc: "HBC", هموگلوبینa: "HBA", hba2e: "HBA2",
  // تستِ حلالیت/داسی‌شدن («Sickle test: Positive») = HbS هست (صفت یا بیماری) — بی‌بازه، به «تفسیر نشدند» (N6).
  // 🔴 دور ۲ (CR5): کلیدِ خودش، نه HBS — «Sickle test: Negative» الکتروفورز نیست و نباید درخواستِ الکتروفورز را بردارد.
  sickle: "SICKLE", sickletest: "SICKLE", sicklingtest: "SICKLE", sicklecelltest: "SICKLE", sicklecellscreen: "SICKLE", تستداسی: "SICKLE",
  zpp: "ZPP", zincprotoporphyrin: "ZPP",
  stfr: "STFR", solubletransferrinreceptor: "STFR",
  epo: "EPO", erythropoietin: "EPO", اریتروپویتین: "EPO",
  rdwcv: "RDW_CV", rdw: "RDW_CV",
  rdwsd: "RDW_SD",
  mpv: "MPV",
  // P57 پرسش ۶: شاخص‌های پلاکتی — شناخته می‌شوند تا به «موتور تفسیرشان نمی‌کند» نروند؛ reader: platelet_indices_context.
  pdw: "PDW", plcr: "P_LCR",
  esr: "ESR", esr1sthr: "ESR", esr1sth: "ESR", sedrate: "ESR",

  // Diff — درصد
  neut: "NEUT_PCT", neu: "NEUT_PCT", neutrophil: "NEUT_PCT", neutrophils: "NEUT_PCT",
  // بازبینیِ متامورفیک ۲۰۲۶-۱۰-۰۵ (N2): «ANC» و «Absolute Neutrophil Count» unmapped بودند. ANCA (آنتی‌بادی) دست نمی‌خورد — R9.
  anc: "NEUT_ABS", absoluteneutrophilcount: "NEUT_ABS", absoluteneutrophils: "NEUT_ABS", neutrophilsabsolute: "NEUT_ABS",
  // بازبینیِ medium ۲۰۲۶-۱۰-۱۳ (M27، N2): املاهای رایجِ «abs» ⇒ unmapped بودند.
  // P113 (۲۰۲۶-۱۰-۲۷): پارامترهای دستگاهِ CBC که روی برگه‌ها چاپ می‌شوند. NRBC (گلبولِ قرمزِ هسته‌دار)
  //   عددِ بالینی است و باید *نام ببرد*، نه «تفسیر نشد». بازهٔ عمومی موتور برایش ادعا نمی‌شود؛ فقط اگر
  //   آزمایشگاه بازه چاپ کرده باشد همان سنجیده می‌شود (absPrintedRange)، وگرنه «محدوده مرجع ندارد».
  nrbc: "NRBC_ABS", nrbcabs: "NRBC_ABS", nucleatedrbc: "NRBC_ABS", nucleatedredcells: "NRBC_ABS",
  nrbcpct: "NRBC_PCT", nrbcr: "NRBC_PCT",
  img: "IMG_ABS", imgabs: "IMG_ABS", immaturegranulocytes: "IMG_ABS", imgpct: "IMG_PCT",
  plcc: "P_LCC", plcr: "P_LCR",
  neutrophilsabs: "NEUT_ABS", neutrophilabs: "NEUT_ABS", absneutrophil: "NEUT_ABS", absneutrophils: "NEUT_ABS",
  absoluteneutrophil: "NEUT_ABS",
  lymphocytesabs: "LYMPH_ABS", lymphocyteabs: "LYMPH_ABS", abslymphocyte: "LYMPH_ABS", abslymphocytes: "LYMPH_ABS",
  absolutelymphocytecount: "LYMPH_ABS", absolutelymphocytes: "LYMPH_ABS", lymphocytesabsolute: "LYMPH_ABS",
  lymph: "LYMPH_PCT", lym: "LYMPH_PCT", lymphocyte: "LYMPH_PCT", lymphocytes: "LYMPH_PCT",
  mono: "MONO_PCT", mon: "MONO_PCT", monocyte: "MONO_PCT", monocytes: "MONO_PCT",
  eos: "EOS_PCT", eosinophil: "EOS_PCT", eosinophils: "EOS_PCT",
  baso: "BASO_PCT", bas: "BASO_PCT", basophil: "BASO_PCT", basophils: "BASO_PCT",

  // ⚠️ NEU# و NEU% هر دو به "neu" نرمال می‌شوند.
  //    تفکیک با علامت اصلی نام انجام می‌شود (rawHasHash / rawHasPct).

  // بیوشیمی
  bloodsugar: "GLU_RANDOM", bs: "GLU_RANDOM", randombloodsugar: "GLU_RANDOM",
  // 🔴 N2 (۲۰۲۶-۱۰-۰۶، اندازه‌گیری‌شده): «Random Glucose 300» و «RBS» unmapped بودند ⇒ برگهٔ تک‌ردیفی هیچ یافته‌ای نمی‌گرفت.
  //   فقط املاهایی که «تصادفی/random» دارند؛ «Random Urine Glucose» عمداً نه (ادرار ≠ سرم، N25). گارد RG1.
  randomglucose: "GLU_RANDOM", rbs: "GLU_RANDOM", randombloodglucose: "GLU_RANDOM", glucoserandom: "GLU_RANDOM",
  bloodglucoserandom: "GLU_RANDOM", randomsugar: "GLU_RANDOM", randombs: "GLU_RANDOM",
  randomplasmaglucose: "GLU_RANDOM", قندتصادفی: "GLU_RANDOM", قندخونتصادفی: "GLU_RANDOM",
  // بازبینی ۲۰۲۶-۱۰-۱۳ (N2): املاهای رایجِ برگه که unmapped می‌ماندند ⇒ پتاسیم/سدیم/WBC/کراتینین بحرانی بی‌یافته. هر کدام فقط یک کلیدِ بی‌ابهام؛
  //   «leukocytes» عمداً نه (LE ادرار). ردیفِ ادراری با صفحهٔ ادرار جدا می‌شود (N25).
  "k+": "K", potassiumk: "K", serumpotassium: "K", potassiumserum: "K", پتاسیم: "K", پتاسیمسرم: "K",
  "na+": "NA", sodiumna: "NA", serumsodium: "NA", sodiumserum: "NA", سدیم: "NA", سدیمسرم: "NA",
  wbccount: "WBC", totalwbc: "WBC", pltcount: "PLT", bloodglucose: "GLU_RANDOM",
  creatinineserum: "CREAT", screatinine: "CREAT", ureaserum: "UREA", bloodurea: "UREA", neutrophilcount: "NEUT_ABS",
  fbs: "GLU_F", fastingbloodsugar: "GLU_F", fastingbloodglucose: "GLU_F",
  fastingplasmaglucose: "GLU_F", glucosefasting: "GLU_F", قندخونناشتا: "GLU_F",
  // گلوکز/قند بدون قید → ناشتا فرض می‌شود (شایع‌ترین حالت در برگه‌های روتین)
  glucose: "GLU_F", قند: "GLU_F", قندخون: "GLU_F", گلوکز: "GLU_F", plasmaglucose: "GLU_F",
  "2hpp": "GLU_2H", "2hp": "GLU_2H", bs2hpp: "GLU_2H", "2hppbs": "GLU_2H",
  bs2h: "GLU_2H", glu2h: "GLU_2H", glucose2h: "GLU_2H", "2hourpp": "GLU_2H",
  postprandial: "GLU_2H", postprandialbloodsugar: "GLU_2H",
  "2hourpostprandial": "GLU_2H", قندخوندوساعته: "GLU_2H", قنددوساعته: "GLU_2H",
  // 🔴 N2 (۲۰۲۶-۱۰-۰۶، اندازه‌گیری‌شده): «GTT 2h»، «OGTT 2 hr»، «2-hour glucose»، «PPBS»، «قند خون ۲ ساعته» unmapped بودند.
  //   OGTT (۷۵ گرمی) و «بعد از غذا» یک کلیدند؛ قاعدهٔ دیابتِ بارداری نامِ چاپ‌شده را می‌خواند (glucoseNames) و فقط برای OGTT حکم می‌دهد.
  //   «GCT» (چالشِ ۵۰ گرمی) و ردیف‌های ۳ساعته (آزمونِ ۱۰۰ گرمی) عمداً نه: معیارشان دیگر است. گارد GD1.
  gtt2h: "GLU_2H", gtt2hr: "GLU_2H", gtt2hour: "GLU_2H", ogtt2h: "GLU_2H", ogtt2hr: "GLU_2H", ogtt2hour: "GLU_2H",
  "2hgtt": "GLU_2H", "2hrgtt": "GLU_2H", "2hogtt": "GLU_2H", "2hrogtt": "GLU_2H", "2hourogtt": "GLU_2H",
  "2hourglucose": "GLU_2H", "2hrglucose": "GLU_2H", glucose2hr: "GLU_2H", glucose2hour: "GLU_2H",
  glucose2hrpp: "GLU_2H", glucose2hpp: "GLU_2H", "2hrpp": "GLU_2H", bloodsugar2hpp: "GLU_2H",
  postprandialglucose: "GLU_2H", glucosepostprandial: "GLU_2H", ppbs: "GLU_2H",
  "قندخون۲ساعته": "GLU_2H", "قندخون2ساعته": "GLU_2H", "قند۲ساعتبعدازغذا": "GLU_2H", "قند2ساعتبعدازغذا": "GLU_2H",
  // قندِ یک‌ساعتهٔ OGTT — بیرونِ بارداری معیاری ندارد ⇒ noRef (نام برده می‌شود، بی‌حکم)؛ در بارداری قاعدهٔ gestational_diabetes_range.
  gtt1h: "GLU_1H", gtt1hr: "GLU_1H", gtt1hour: "GLU_1H", ogtt1h: "GLU_1H", ogtt1hr: "GLU_1H", ogtt1hour: "GLU_1H",
  "1hgtt": "GLU_1H", "1hrgtt": "GLU_1H", "1hogtt": "GLU_1H", "1hrogtt": "GLU_1H",
  glucose1h: "GLU_1H", glucose1hr: "GLU_1H", glucose1hour: "GLU_1H", "1hourglucose": "GLU_1H", "1hrglucose": "GLU_1H",
  قندیکساعته: "GLU_1H", قندخونیکساعته: "GLU_1H",
  // P93-ب (۲۰۲۶-۱۰-۰۶): روشِ دومرحله‌ای — راهنمای انجمنِ غددِ ایران ۲۰۲۱ (توصیهٔ ۱۵: روشِ ترجیحی در هفتهٔ ۲۴ تا ۲۸).
  //   قندِ سه‌ساعته (آزمونِ ۱۰۰ گرمی) و چالشِ ۵۰ گرمی (GCT) — بیرونِ بارداری بی‌بازه (noRef)، در بارداری gestational_diabetes_range.
  gtt3h: "GLU_3H", gtt3hr: "GLU_3H", gtt3hour: "GLU_3H", ogtt3h: "GLU_3H", ogtt3hr: "GLU_3H", ogtt3hour: "GLU_3H",
  "3hgtt": "GLU_3H", "3hrgtt": "GLU_3H", "3hogtt": "GLU_3H", "3hrogtt": "GLU_3H",
  glucose3h: "GLU_3H", glucose3hr: "GLU_3H", glucose3hour: "GLU_3H", "3hourglucose": "GLU_3H", "3hrglucose": "GLU_3H",
  قندسهساعته: "GLU_3H", قندخونسهساعته: "GLU_3H",
  gct: "GLU_GCT", glucosechallengetest: "GLU_GCT", glucosechallenge: "GLU_GCT", gct50g: "GLU_GCT", "50ggct": "GLU_GCT",
  gct1h: "GLU_GCT", gct1hr: "GLU_GCT", "50gglucosechallengetest": "GLU_GCT", "50gglucosechallenge": "GLU_GCT",
  glucose1h50g: "GLU_GCT", glucose1hr50g: "GLU_GCT", "50gglucose1h": "GLU_GCT", "50gglucose1hr": "GLU_GCT",
  "قند۵۰گرمی": "GLU_GCT", "قند50گرمی": "GLU_GCT", تستچالشگلوکز: "GLU_GCT", آزمونچالشگلوکز: "GLU_GCT",
  // ناشتای OGTT همان قندِ ناشتاست (و «ناشتا» نام برده شده).
  gttfasting: "GLU_F", ogttfasting: "GLU_F", fastinggtt: "GLU_F", gtt0h: "GLU_F", ogtt0h: "GLU_F", glucose0h: "GLU_F",
  hemoglobina1c: "HBA1C", hba1c: "HBA1C", a1c: "HBA1C",
  urea: "UREA", اوره: "UREA", bun: "UREA_N", bloodureanitrogen: "UREA_N", ureanitrogen: "UREA_N",
  creatinine: "CREAT", cr: "CREAT", کراتینین: "CREAT",
  creatinin: "CREAT", creatnine: "CREAT", cretinine: "CREAT", serumcreatinine: "CREAT",
  na: "NA", serumna: "NA", sodium: "NA",
  k: "K", serumk: "K", potassium: "K",
  cl: "CL", chloride: "CL",
  ca: "CA", calcium: "CA", کلسیم: "CA",
  mg: "MG", magnesium: "MG",
  phos: "PHOS", phosphorus: "PHOS", p: "PHOS",
  // ۲۰۲۶-۱۰-۰۵، خروجیِ LIS یک بیمارستان (۹۰ درخواست): «Serum Ca/Mg/p» نگاشت نمی‌شد، در حالی که «Serum Na/K/Iron» می‌شد —
  //   کلسیم/منیزیم/فسفرِ ۱۴ درخواست بی‌صدا گم شد (N2). گارد L1.
  serumca: "CA", serumcalcium: "CA", serummg: "MG", serummagnesium: "MG",
  serump: "PHOS", serumphos: "PHOS", serumphosphorus: "PHOS",
  // ── هورمون پاراتیروئید ──
  // ⚠️ فقط PTHِ *سرم*. «PTH-rP» (پپتیدِ مرتبط، نشانگرِ هایپرکلسمیِ بدخیمی)
  //    عمداً نگاشت نمی‌شود: بازهٔ مرجعش pmol/L است و کاملاً متفاوت، و در جدولِ
  //    ۱۶.۲ دقیقاً همان ستونی است که PTH را از PTH-rP جدا می‌کند. نگاشتِ اشتباه
  //    یعنی هایپرکلسمیِ بدخیمی «پرکاریِ پاراتیروئید» خوانده شود.
  pth: "PTH", parathyroidhormone: "PTH", intactpth: "PTH", ipth: "PTH",
  pthintact: "PTH", parathormone: "PTH", parathyrin: "PTH",
  "pth-intact": "PTH", pthi: "PTH",
  پاراتورمون: "PTH", هورمونپاراتیروئید: "PTH", پاراتیروئید: "PTH",
  // ── کلسیم ادرارِ ۲۴ ساعته ──
  // ⚠️ «calcium» تنها به CA (سرم) می‌رود؛ فقط نام‌هایی که صریحاً ادرار را
  //    نام می‌برند اینجا می‌آیند. بدونِ این قید، کلسیمِ سرمِ ۹.۵ به‌عنوان
  //    کلسیمِ ادرارِ «خیلی پایین» خوانده می‌شد و FHH جعل می‌کرد — دو بازه
  //    (۸.۸–۱۰.۳ و ۱۰۰–۳۰۰) هیچ همپوشانی ندارند، پس خطا خاموش نمی‌ماند
  //    ولی جهتش خطرناک است.
  urinecalcium: "U_CA", urinarycalcium: "U_CA", calciumurine: "U_CA",
  "24hurinecalcium": "U_CA", "24hrurinecalcium": "U_CA",
  urinecalcium24h: "U_CA", calcium24hurine: "U_CA", ucalcium: "U_CA",
  کلسیمادرار: "U_CA", کلسیمادرار۲۴ساعته: "U_CA", دفعکلسیمادرار: "U_CA",
  ast: "AST", sgot: "AST", astsgot: "AST",
  alt: "ALT", sgpt: "ALT", altsgpt: "ALT",
  alkp: "ALP", alp: "ALP", alkalinephosphatase: "ALP",
  bilit: "BILI_T", bilid: "BILI_D",   // P111: املاي واقعیِ برگه («BILIT»/«BILID» چاپ می‌شود)
  ggt: "GGT", gammagt: "GGT", gamagt: "GGT",   // P111: «Gama GT» با یک m
  ckmb: "CK_MB", cpkmb: "CK_MB", ckmbfraction: "CK_MB", ckmbmass: "CK_MB",
  // همان LIS: «CK-MB II» و «CK MB 1» (شمارهٔ کیت/نوبت، نه آزمایشِ دیگر) — گارد L1. «ckmb2» عمداً نیست: «CK-MB2» نامِ
  //   ایزوفرمِ MB2 هم هست (نسبتِ MB2/MB1، مقدارش ~۱ U/L) و خواندنش به‌عنوانِ CK-MBِ کل یعنی اطمینانِ کاذب.
  ckmbii: "CK_MB", ckmb1: "CK_MB",
  // بند ۵ (LIS ۲۰۲۶-۱۰-۰۶، تصمیمِ «ب»): «CH MB II» (۵ درخواست) و «CPK-MB(CHEMICAL)» همان CK-MB‌اند و unmapped بودند.
  //   بی‌واحدِ چاپ‌شده سنجیده نمی‌شوند (شاخهٔ CK_MB پایین‌تر)، چون فعالیت (U/L) و جرم (ng/mL) دو سنجه‌اند. گارد L19.
  chmbii: "CK_MB", cpkmbchemical: "CK_MB", ckmbchemical: "CK_MB",
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
  // specs/021 (P133، G4): نسبتِ پروتئین به کراتینینِ ادرار — فقط شناختن (بی‌بازه ⇒ noRef، هرگز graded). «pcr» تنها عمداً نیست:
  //   «PCR»، «HCV PCR»، «COVID PCR» آزمایشِ مولکولی‌اند (N25).
  upcr: "UPCR", proteincreatinineratio: "UPCR", proteintocreatinineratio: "UPCR",
  urineproteincreatinineratio: "UPCR", urineproteintocreatinineratio: "UPCR",
  نسبتپروتئینبهکراتینین: "UPCR", پروتئینبهکراتینین: "UPCR",
  tp: "TP", totalprotein: "TP",
  bili: "BILI_T", bilirubintotal: "BILI_T", totalbilirubin: "BILI_T", tbil: "BILI_T",
  tbili: "BILI_T", بیلیروبینتام: "BILI_T", بیلیروبینکل: "BILI_T",
  // «T. Bilirubin(Clot)» — چاپِ واقعیِ یک آزمایشگاه؛ norm() نقطه/پرانتز را می‌خورد (job 5fdd233a، N2)
  tbilirubin: "BILI_T", tbilirubinclot: "BILI_T",
  dbilirubin: "BILI_D", dbilirubinclot: "BILI_D",
  ibilirubin: "BILI_I", ibilirubinclot: "BILI_I",
  bilirubindirect: "BILI_D", directbilirubin: "BILI_D", dbil: "BILI_D",
  directbili: "BILI_D", dbili: "BILI_D", conjugatedbilirubin: "BILI_D",
  conjugatedbili: "BILI_D", بیلیروبینمستقیم: "BILI_D",
  bilirubinindirect: "BILI_I", indirectbilirubin: "BILI_I", ibil: "BILI_I",
  indirectbili: "BILI_I", ibili: "BILI_I", unconjugatedbilirubin: "BILI_I",
  unconjugatedbili: "BILI_I", بیلیروبینغیرمستقیم: "BILI_I",
  ferritin: "FERRITIN", فریتین: "FERRITIN",
  iron: "IRON", serumiron: "IRON", آهن: "IRON",
  // P109 (برگهٔ واقعی ۲۰۲۶-۱۰-۱۶): «Fe» نمادِ آهن است — فقط شکلِ کامل («Fe»، «Serum Fe»)؛ «Ferritin» کلیدِ خودش را دارد.
  fe: "IRON", serumfe: "IRON", feserum: "IRON",
  tibc: "TIBC",
  transferrinsaturation: "TSAT", tsat: "TSAT",
  b12: "B12", vitaminb12: "B12", serumvitaminb12: "B12",
  // specs/004 (FR-005): املاهایی که روی برگهٔ واقعی می‌آیند و unmapped می‌ماندند (N2)
  vitb12: "B12", cobalamin: "B12", "ویتامینب۱۲": "B12", "ویتامینb12": "B12", "ویتامینب12": "B12",
  folate: "FOLATE", folicacid: "FOLATE", فولات: "FOLATE",
  serumfolate: "FOLATE", folateserum: "FOLATE", vitaminb9: "FOLATE", فولیکاسید: "FOLATE", اسیدفولیک: "FOLATE",
  vitd: "VIT_D", vitamind: "VIT_D", "vitamind3": "VIT_D", vitd3: "VIT_D",
  // ═══ specs/004: ویتامین‌ها و عناصرِ کمیاب — شناخته‌شده، بی‌بازه (noRef) تا تأییدِ P49 ═══
  // فقط نامِ کامل. مخففِ دوحرفی (zn/cu/se) فقط با واحدِ سازگار — UNIT_GATED_ALIASES پایین‌تر.
  // mn/co/cr/mo هرگز: «Cr» روی برگهٔ ایرانی کراتینین است (N2).
  // P109: eAG — «Estimated Average Gl» همان ستونِ بریده‌شدهٔ «Estimated Average Glucose» است.
  estimatedaverageglucose: "EAG", estimatedaveragegl: "EAG", estimatedavgglucose: "EAG", eag: "EAG",
  atherosclerosisindex: "ATHERO_INDEX", atherogenicindex: "ATHERO_INDEX", atherogenicindexofplasma: "ATHERO_INDEX", aip: "ATHERO_INDEX",
  zinc: "ZINC", serumzinc: "ZINC", zincserum: "ZINC", plasmazinc: "ZINC", روی: "ZINC", رویسرم: "ZINC", زینک: "ZINC",
  copper: "COPPER", serumcopper: "COPPER", copperserum: "COPPER", مس: "COPPER", مسسرم: "COPPER",
  ceruloplasmin: "CERULOPLASMIN", سرولوپلاسمین: "CERULOPLASMIN",
  selenium: "SELENIUM", serumselenium: "SELENIUM", سلنیوم: "SELENIUM",
  vitamina: "VIT_A", retinol: "VIT_A", ویتامینa: "VIT_A", ویتامینآ: "VIT_A",
  vitamine: "VIT_E", alphatocopherol: "VIT_E", tocopherol: "VIT_E", ویتامینe: "VIT_E", ویتامینای: "VIT_E",
  vitaminc: "VIT_C", ascorbicacid: "VIT_C", ویتامینc: "VIT_C", ویتامینث: "VIT_C", اسیداسکوربیک: "VIT_C",
  vitaminb1: "VIT_B1", thiamine: "VIT_B1", thiamin: "VIT_B1", ویتامینb1: "VIT_B1", ویتامینب۱: "VIT_B1", ویتامینب1: "VIT_B1", تیامین: "VIT_B1",
  vitaminb6: "VIT_B6", pyridoxalphosphate: "VIT_B6", pyridoxal5phosphate: "VIT_B6", "pyridoxal5'phosphate": "VIT_B6", plp: "VIT_B6",
  ویتامینb6: "VIT_B6", ویتامینب۶: "VIT_B6", ویتامینب6: "VIT_B6",
  mma: "MMA", methylmalonicacid: "MMA", serummma: "MMA", اسیدمتیلمالونیک: "MMA", متیلمالونیکاسید: "MMA",
  // فولاتِ گلبولِ قرمز: بازه‌اش حدودِ ۳۰ برابرِ فولاتِ سرم است — کلیدِ جدا (FR-010، N3)
  rbcfolate: "RBC_FOLATE", folaterbc: "RBC_FOLATE", redcellfolate: "RBC_FOLATE", redbloodcellfolate: "RBC_FOLATE",
  erythrocytefolate: "RBC_FOLATE", فولاتگلبولقرمز: "RBC_FOLATE",
  // مسِ ادرار فقط ۲۴ساعته؛ «Urine Copper» بی‌۲۴ عمداً نیست (FR-010)
  urinecopper24h: "U_COPPER_24H", "24hurinecopper": "U_COPPER_24H", "24hoururinecopper": "U_COPPER_24H",
  urinecopper24hr: "U_COPPER_24H", urinarycopper24h: "U_COPPER_24H", copper24hurine: "U_COPPER_24H",
  "مسادرار24ساعته": "U_COPPER_24H", "مسادرار۲۴ساعته": "U_COPPER_24H",
  // کیفی — مسیرشان QUAL_NO_READER است، نه qual (N25)
  antiintrinsicfactor: "ANTI_IF", antiintrinsicfactorantibody: "ANTI_IF", antiintrinsicfactorab: "ANTI_IF",
  intrinsicfactorantibody: "ANTI_IF", intrinsicfactorab: "ANTI_IF", antiif: "ANTI_IF", آنتیبادیفاکتورداخلی: "ANTI_IF",
  parietalcellantibody: "APCA", antiparietalcellantibody: "APCA", antiparietalcell: "APCA", parietalcellab: "APCA",
  gastricparietalcellantibody: "APCA", apca: "APCA", آنتیبادیسلولجداری: "APCA",
  // عناصرِ نادر — فقط نامِ کامل (FR-011b)
  manganese: "MANGANESE", منگنز: "MANGANESE", cobalt: "COBALT", کبالت: "COBALT",
  chromium: "CHROMIUM", کروم: "CHROMIUM", molybdenum: "MOLYBDENUM", مولیبدن: "MOLYBDENUM",
  pantothenicacid: "VIT_B5", vitaminb5: "VIT_B5", ویتامینb5: "VIT_B5", ویتامینب۵: "VIT_B5", ویتامینب5: "VIT_B5",
  urineiodine: "U_IODINE", urinaryiodine: "U_IODINE", iodineurine: "U_IODINE", یدادرار: "U_IODINE",
  "25ohd": "VIT_D", "25ohvitamind": "VIT_D", "25hydroxyvitamind": "VIT_D",
  vitamind25oh: "VIT_D", "ویتامیند": "VIT_D",
  vitd25oh: "VIT_D", "25ohvitd": "VIT_D", vitd25hydroxy: "VIT_D",   // P109: «Vit D (25 OH)»
  tsh: "TSH",
  ft4: "FT4", freet4: "FT4",
  ft3: "FT3", freet3: "FT3",
  t3: "T3", totalt3: "T3", tt3: "T3",
  antitpo: "ANTI_TPO", tpoab: "ANTI_TPO", tpoantibody: "ANTI_TPO", "anti-tpo": "ANTI_TPO", thyroidperoxidaseantibody: "ANTI_TPO",
  t4: "T4", totalt4: "T4", tt4: "T4",
  // «Total Thyroxine (T4) (CLIA)» روی برگهٔ زنده unmapped بود؛ «thyroxine» تنها عمداً نیست (FT4 نیست، T4 هم نباید حدس شود).
  totalthyroxine: "T4", totalthyroxin: "T4", thyroxinetotal: "T4", thyroxintotal: "T4", t4total: "T4",
  // ⚠️ املاهای واقعیِ برگه‌های ایرانی. این‌ها تایپیِ ما نیستند — عیناً روی
  //    برگه چاپ شده‌اند و بدونشان تست «خوانده ولی تفسیرنشده» می‌ماند.
  chol: "CHOL", cholesterol: "CHOL", totalcholesterol: "CHOL",
  cholestrol: "CHOL", cholestrole: "CHOL", colesterol: "CHOL",
  cholesterole: "CHOL", cholestérol: "CHOL", کلسترول: "CHOL",
  // P113 (۲۰۲۶-۱۰-۲۷): برگه‌ها «HDL-chol/LDL-chol/VLDL-chol» چاپ می‌کنند (norm نقطه‌خط را می‌زد ⇒ hdlchol).
  //   بی‌این، LDL و HDLِ واقعیِ بیمار نادیده می‌رفت و در «تفسیر نشدند» می‌نشست (پنلِ چربیِ رانِ ۴۶).
  hdl: "HDL", hdlc: "HDL", hdlcholesterol: "HDL", "hdl-c": "HDL", hdlcholestrol: "HDL", hdlchol: "HDL", hdlcholest: "HDL",
  ldl: "LDL", ldlc: "LDL", ldlcholesterol: "LDL", "ldl-c": "LDL", ldlcholestrol: "LDL", ldlchol: "LDL", ldlcholest: "LDL",
  // ⚠️ norm() خط تیره و فاصله را می‌اندازد، پس «Apo-B» و «Apo B» هر دو «apob»
  //    می‌شوند و کلیدِ جدایی لازم ندارند. فارسی هم ي→ی و نیم‌فاصله نرمال می‌شود.
  apob: "APOB", apob100: "APOB", apolipoproteinb: "APOB", apolipoproteinb100: "APOB",
  آپولیپوپروتئینb: "APOB", آپوب: "APOB", آپوبی: "APOB",
  // P77-۱۲: زنجیرهٔ سبکِ آزاد. «Kappa» و «Lambda» تنها هم همین‌اند (در برگهٔ ایرانی دیگر معنایی ندارند).
  kappa: "KAPPA_FLC", kappaflc: "KAPPA_FLC", kappafreelightchain: "KAPPA_FLC", kappafreelightchains: "KAPPA_FLC",
  kappafreelightchainflc: "KAPPA_FLC", freekappa: "KAPPA_FLC", freekappalightchain: "KAPPA_FLC", serumfreekappa: "KAPPA_FLC",
  کاپا: "KAPPA_FLC", زنجیرهسبککاپا: "KAPPA_FLC", زنجیرهسبکآزادکاپا: "KAPPA_FLC",
  lambda: "LAMBDA_FLC", lambdaflc: "LAMBDA_FLC", lambdafreelightchain: "LAMBDA_FLC", lambdafreelightchains: "LAMBDA_FLC",
  lambdafreelightchainflc: "LAMBDA_FLC", freelambda: "LAMBDA_FLC", freelambdalightchain: "LAMBDA_FLC", serumfreelambda: "LAMBDA_FLC",
  لامبدا: "LAMBDA_FLC", زنجیرهسبکلامبدا: "LAMBDA_FLC", زنجیرهسبکآزادلامبدا: "LAMBDA_FLC",
  tg: "TG", triglyceride: "TG", triglycerides: "TG",
  triglicerde: "TG", triglicerid: "TG", triglicerides: "TG", trigliserid: "TG",
  triglycerid: "TG", تریگلیسیرید: "TG", تریگلیسرید: "TG",
  ldh: "LDH",
  haptoglobin: "HAPTO",
  pt: "PT", prothrombintime: "PT",
  ptpatient: "PT", patientpt: "PT",   // P109: «PT Patient» کنارِ «PT Control» (کنترل در کانالِ hemostasis است)
  // ۲۰۲۶-۱۰-۰۳ (ممیزیِ پوشش): این پنج «تفسیر نشدند» می‌شدند.
  myoglobin: "MYOGLOBIN", serummyoglobin: "MYOGLOBIN", میوگلوبین: "MYOGLOBIN",
  transferrin: "TRANSFERRIN", serumtransferrin: "TRANSFERRIN", trf: "TRANSFERRIN", ترانسفرین: "TRANSFERRIN",
  antithrombin: "ATIII", antithrombiniii: "ATIII", atiii: "ATIII", at3: "ATIII", antithrombinactivity: "ATIII", antithrombinatiii: "ATIII", آنتیترومبین: "ATIII",
  thrombintime: "TT", tt: "TT", زمانترومبین: "TT",
  bandneutrophils: "BAND_PCT", bandneutrophil: "BAND_PCT", bandneut: "BAND_PCT", bands: "BAND_PCT", band: "BAND_PCT", stab: "BAND_PCT", stabs: "BAND_PCT", bandcells: "BAND_PCT", bandforms: "BAND_PCT", stabneutrophils: "BAND_PCT",
  aptt: "APTT", ptt: "APTT",
  fibrinogen: "FIB",
  ddimer: "DDIMER",

  // ── specs/010: فعالیتِ فاکتور، vWF، مهارکننده، PTِ کنترل — کانالِ جدای «hemostasis»، بی‌نمره (research R2) ──
  // ⚠️ فقط املای دقیق. همسایه‌های یک‌حرفی (Factor V/VII/X/XI/XII/XIII/II) عمداً اینجا نیستند و unmapped می‌مانند
  //    (M247). «Inhibitor» تنها هم نیست: همان واژه برای مهارکنندهٔ FIX، ضدانعقادِ لوپوسی و … می‌آید (research R4).
  factorviii: "FVIII", factorviiiactivity: "FVIII", fviii: "FVIII", fviiiactivity: "FVIII", "fviii:c": "FVIII",
  fviiic: "FVIII", "factorviii:c": "FVIII", factorviiic: "FVIII", f8: "FVIII", factor8: "FVIII", factor8activity: "FVIII",
  fviiiassay: "FVIII", factorviiiassay: "FVIII", "فاکتور۸": "FVIII", "فاکتور8": "FVIII", "فاکتورهشت": "FVIII",
  factorix: "FIX", factorixactivity: "FIX", fix: "FIX", fixactivity: "FIX", f9: "FIX", factor9: "FIX",
  factor9activity: "FIX", factorixassay: "FIX", "فاکتور۹": "FIX", "فاکتور9": "FIX", "فاکتورنه": "FIX",
  "vwf:ag": "VWF_AG", vwfag: "VWF_AG", vwfantigen: "VWF_AG", vonwillebrandfactorantigen: "VWF_AG",
  vonwillebrandantigen: "VWF_AG", "فونویلبراندآنتیژن": "VWF_AG", "آنتیژنفونویلبراند": "VWF_AG",
  "vwf:rco": "VWF_ACT", vwfrco: "VWF_ACT", vwfactivity: "VWF_ACT", "vwf:act": "VWF_ACT", vwfact: "VWF_ACT",
  ristocetincofactor: "VWF_ACT", vwfristocetincofactor: "VWF_ACT", "vwf:gpibm": "VWF_ACT", vwfgpibm: "VWF_ACT",
  "vwf:gpibr": "VWF_ACT", vonwillebrandfactoractivity: "VWF_ACT", "فعالیتفونویلبراند": "VWF_ACT",
  fviiiinhibitor: "FVIII_INHIB", factorviiiinhibitor: "FVIII_INHIB", f8inhibitor: "FVIII_INHIB",
  fixinhibitor: "FVIII_INHIB", factorixinhibitor: "FVIII_INHIB", bethesda: "FVIII_INHIB", bethesdaassay: "FVIII_INHIB",
  inhibitorbethesda: "FVIII_INHIB", bethesdainhibitor: "FVIII_INHIB", factorinhibitor: "FVIII_INHIB",
  inhibitorassay: "FVIII_INHIB", "مهارکنندهفاکتور": "FVIII_INHIB",
  ptcontrol: "PT_CONTROL", controlpt: "PT_CONTROL", ptcontroltime: "PT_CONTROL", "کنترلpt": "PT_CONTROL",

  // ⚠️ این‌ها قبلاً unmapped می‌شدند و بی‌صدا ناپدید — همه نشانگر بحرانی‌اند
  lactate: "LACTATE", lacticacid: "LACTATE",
  procalcitonin: "PCT_SEPSIS",
  // ⚠️ مخفف برهنهٔ «pct» اینجا نیست — با پلاکت‌کریت (شاخص پلاکتیِ CBC، برگه‌های Sysmex) تصادم دارد.
  //    گیت‌شده روی واحد است: pctKey() پایین‌تر.
  crpquant: "CRP_Q", hscrp: "CRP_Q", crpquantitative: "CRP_Q", crpq: "CRP_Q", quantitativecrp: "CRP_Q", qcrp: "CRP_Q",
  ammonia: "NH3", nh3: "NH3",
  hco3: "HCO3", bicarbonate: "HCO3", co2: "HCO3",
  ph: "PH",
  // ═══ اسمولالیته — عمداً فقط املاهایی که *نمونه* را نام می‌برند ═══
  // ⚠️ `osmolality` / `osmolarity` / `osm`ِ برهنه اینجا نیستند، و این یک
  //    تصمیم است نه فراموشی. برای pH یک گیتِ ارزشی کار می‌کند (adapter پایین‌تر،
  //    ABG_MARKERS) چون خونی و ادراری بازهٔ مجزا دارند؛ اینجا نمی‌کند: اسمولالیتهٔ
  //    سرم ۲۷۵–۲۹۵ است و اسمولالیتهٔ ادرار ۵۰–۱۲۰۰، یعنی عددِ ۳۰۰ به یک اندازه
  //    برای هر دو محتمل است. نگاشتِ اشتباه در متنِ بالینی از نبودِ نگاشت بدتر
  //    است (N2)، پس نامِ برهنه به `unmapped` می‌رود و سرور بلند می‌گوید
  //    «موتور تفسیرش نمی‌کند» — که شکستِ درست است.
  // ⚠️ املای «Osmolality, Serum» (سبکِ LabCorp/Quest) هنوز نگاشت نمی‌شود، چون
  //    norm() کاما را حذف نمی‌کند. این نقصِ عمومی‌ترِ norm است و جداگانه ثبت شده.
  serumosmolality: "OSM", serumosmolarity: "OSM",
  plasmaosmolality: "OSM", plasmaosmolarity: "OSM",
  osmolalityserum: "OSM", osmolalityplasma: "OSM",
  osmserum: "OSM", sosm: "OSM",
  "اسمولالیتهسرم": "OSM", "اسمولالیتهٔسرم": "OSM",
  "اسمولاریتهسرم": "OSM", "اسمولاریتهٔسرم": "OSM",
  "اسمولالیتهپلاسما": "OSM", "اسمولالیتهٔپلاسما": "OSM",
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

  // ═══ نشانگرهای قلبی‌عروقیِ هنری فصل ۱۹ — تا امروز هیچ‌کدام کلید نداشتند ═══
  // یعنی برگه‌ای که BNP یا هموسیستئین رویش چاپ شده بود، آن ردیف را به
  // `unmapped` می‌فرستاد و بی‌صدا از تفسیر می‌انداخت — همان کلاسِ N2.
  bnp: "BNP", btypenatriureticpeptide: "BNP", brainnatriureticpeptide: "BNP",
  // ⚠️ NT-proBNP باید کلیدِ *جدا* بماند: آستانه‌اش ۳۰۰ pg/mL است و BNP ۱۰۰.
  //    اگر به BNP نگاشت شود، NT-proBNP=۲۵۰ (طبیعی) «بالا» علامت می‌خورد.
  //    resolveAlias هم آن را به bnp نمی‌شکند، چون قاعدهٔ تقسیمش توافقِ هر دو
  //    نیمه را می‌خواهد و «ntpro» به هیچ کلیدی نگاشت نمی‌شود.
  ntprobnp: "NTPROBNP", nterminalprobnp: "NTPROBNP", ntprobnptest: "NTPROBNP",
  nbnp: "NTPROBNP", nterminalbnp: "NTPROBNP",
  // ⚠️ «Pro-BNP»ِ برهنه عمداً به NT-proBNP نگاشت می‌شود و نه به BNP. دلیلش
  //    این است که proBNPِ ۱۰۸ اسیدآمینه‌ای سنجهٔ سفارش‌دادنیِ بالینی نیست —
  //    متنِ منبع می‌گوید «در حال حاضر فقط سنجه‌های مرتبط با BNP کاربردِ گسترده
  //    دارند» و آن دو را BNP و N-BNP/NT-proBNP نام می‌برد. پس ردیفی که روی
  //    برگهٔ ایرانی «Pro BNP» نوشته شده، در عمل همان NT-proBNP است.
  probnp: "NTPROBNP", probnatriureticpeptide: "NTPROBNP",

  // هموسیستئین. ⚠️ «homocystine» (بدون e) از نظر شیمیایی مولکولِ دیگری است
  //    (دی‌سولفید)، ولی خودِ متنِ منبع می‌گوید آنچه اندازه‌گیری می‌شود «مجموعِ
  //    این گونه‌هاست» و نام‌های «total homocysteine»، «homocyst(e)ine» و
  //    «homocysteine» برای همان یک کمیت به کار می‌روند. پس ردیفِ برگه با هر
  //    کدام از این املاها همان آنالیت است.
  homocysteine: "HCY", totalhomocysteine: "HCY", homocystine: "HCY",
  homocysteineserum: "HCY", hcy: "HCY", thcy: "HCY",
  هموسیستئین: "HCY", هموسیستین: "HCY",

  // ── فصل ۲۵ هنری: پرولاکتین، کورتیزول، ACTH (P46) ──
  // ⚠️ بازه‌ها هنوز تأیید نشده‌اند، پس این کلیدها فعلاً به noRef می‌روند — فقط
  //    شناسایی است، ادعای بالینی نیست. املاها: تأییدشده از سایت‌های آزمایشگاهیِ
  //    ایرانی (abtinmed، parsteblab، nanomedicallab) + گونه‌های رایج؛ برگهٔ چاپیِ
  //    واقعی هنوز دیده نشده (N2) — هر املای تازه از برگهٔ واقعی اینجا بیاید.
  prolactin: "PRL", prl: "PRL", serumprolactin: "PRL", پرولاکتین: "PRL",
  // زمانِ نمونه‌گیری *فقط* از نامِ چاپی می‌آید (P46): «صبح/8AM» → CORTISOL_AM؛
  //   هر کورتیزولِ سرمِ دیگر — بی‌زمان، عصر، 4PM — → CORTISOL که عمداً بازه
  //   نمی‌گیرد. ⚠️ ستونِ جداگانهٔ ساعت در OCR گم می‌شود؛ زمان را از بازهٔ مرجعِ
  //   برگه حدس نزن.
  cortisol8am: "CORTISOL_AM", "cortisol8:00am": "CORTISOL_AM", cortisolam: "CORTISOL_AM",
  morningcortisol: "CORTISOL_AM", cortisolmorning: "CORTISOL_AM", cortisol89am: "CORTISOL_AM",
  amcortisol: "CORTISOL_AM", کورتیزولصبح: "CORTISOL_AM", "کورتیزول۸صبح": "CORTISOL_AM",
  "کورتیزول8صبح": "CORTISOL_AM",
  cortisol: "CORTISOL", serumcortisol: "CORTISOL", کورتیزول: "CORTISOL",
  cortisol4pm: "CORTISOL", cortisolpm: "CORTISOL", cortisolevening: "CORTISOL",
  کورتیزولعصر: "CORTISOL",
  // ⚠️ «DST» تنها عمداً نگاشت نشده: نامِ آزمون است نه آنالیت.
  cortisolafterdexamethasone: "CORTISOL_DST", cortisolpostdst: "CORTISOL_DST",
  cortisolpostdex: "CORTISOL_DST", overnightdst: "CORTISOL_DST",
  کورتیزولبعدازدگزامتازون: "CORTISOL_DST",
  salivarycortisol: "CORTISOL_SAL", latenightsalivarycortisol: "CORTISOL_SAL",
  cortisolsaliva: "CORTISOL_SAL", کورتیزولبزاق: "CORTISOL_SAL",
  // ⚠️ «17-Hydroxycorticosteroids» و «هیدروکورتیزول» UFC نیستند، هرچند در
  //    فهرستِ مترادفِ بعضی سایت‌ها آمده‌اند.
  ufc: "UFC", urinefreecortisol: "UFC", urinaryfreecortisol: "UFC",
  freecortisolurine: "UFC", cortisolurine: "UFC", "24hurinefreecortisol": "UFC",
  "کورتیزولادرار۲۴ساعته": "UFC",
  // ⚠️ «ACTH Stimulation Test» نگاشت نشده: نتیجه‌اش کورتیزول است، نه ACTH.
  acth: "ACTH", adrenocorticotropichormone: "ACTH", acthplasma: "ACTH",

  // ── فصل ۲۶ هنری: هورمون‌های باروری و hCG (P47) ──
  // ⚠️ فقط شناسایی — بازه‌ها منتظرِ بازبین‌اند، پس این کلیدها فعلاً به noRef می‌روند.
  //    املاها از سایت‌های آزمایشگاهی/اورولوژیِ ایرانی؛ برگهٔ چاپیِ واقعی هنوز دیده نشده (N2).
  // ⚠️ روزِ چرخه *فقط* از نامِ چاپی می‌آید (همان الگوی CORTISOL_AM): «FSH Day 3» → FSH_D3؛
  //    FSHِ بی‌روز → FSH. ارقامِ فارسی را norm() تبدیل نمی‌کند، پس هر دو شکل آمده‌اند.
  testosterone: "TESTO", totaltestosterone: "TESTO", testosteronetotal: "TESTO",
  تستوسترون: "TESTO", تستوسترونتام: "TESTO",
  lh: "LH", luteinizinghormone: "LH",
  fsh: "FSH", folliclestimulatinghormone: "FSH",
  lhday3: "LH_D3", day3lh: "LH_D3", lhd3: "LH_D3", "lhروز۳": "LH_D3", lhروز3: "LH_D3", lhروزسوم: "LH_D3",
  fshday3: "FSH_D3", day3fsh: "FSH_D3", fshd3: "FSH_D3", "fshروز۳": "FSH_D3", fshروز3: "FSH_D3", fshروزسوم: "FSH_D3",
  estradiol: "E2", e2: "E2", oestradiol: "E2", استرادیول: "E2",
  estradiolday3: "E2_D3", e2day3: "E2_D3", day3estradiol: "E2_D3", day3e2: "E2_D3",
  "استرادیولروز۳": "E2_D3", استرادیولروز3: "E2_D3", استرادیولروزسوم: "E2_D3",
  progesterone: "PROG", پروژسترون: "PROG",
  progesteroneday21: "PROG_D21", day21progesterone: "PROG_D21", progesteroned21: "PROG_D21",
  "پروژسترونروز۲۱": "PROG_D21", پروژسترونروز21: "PROG_D21", پروژسترونروزبیستویکم: "PROG_D21",
  amh: "AMH", antimullerianhormone: "AMH", "antimüllerianhormone": "AMH", هورمونآنتیمولرین: "AMH",
  dheas: "DHEAS", dheasulfate: "DHEAS", dheasulphate: "DHEAS", dheaso4: "DHEAS",
  dehydroepiandrosteronesulfate: "DHEAS",
  // ⚠️ 17-OHP با پروژسترون هم‌پیشوند نیست ولی هم‌خانواده است — هرگز به PROG نرسد (M105).
  "17ohprogesterone": "OHP17", "17hydroxyprogesterone": "OHP17", "17ohp": "OHP17",
  "17αohp": "OHP17", "17alphahydroxyprogesterone": "OHP17", "۱۷هیدروکسیپروژسترون": "OHP17",
  // ⚠️ «Free βhCG» (غربالگریِ سه‌ماههٔ اول، با MoM) و «Free Testosterone» و AFP (دو معنا:
  //    غربالگریِ بارداری و نشانگرِ تومور) عمداً نگاشت *نشده‌اند* — M105.
  betahcg: "HCG", bhcg: "HCG", "βhcg": "HCG", hcg: "HCG", serumhcg: "HCG", totalhcg: "HCG",
  quantitativebhcg: "HCG", quantitativehcg: "HCG", betahcgquantitative: "HCG",
  betahcgserum: "HCG", serumbetahcg: "HCG", bhcgserum: "HCG",
  pregnancytest: "HCG", تستبارداری: "HCG", آزمایشبارداری: "HCG",
  بتاhcg: "HCG", تستبارداری: "HCG", تستبارداریخون: "HCG",

  // ═══ بازبینیِ medium ۲۰۲۶-۱۰-۱۳ (M27، N2): املاهای رایجِ برگهٔ واقعی که unmapped بودند ═══
  //   «Creat 6» / «Alk Phos 900» / «Glycated Hemoglobin 11» ⇒ هیچ یافته‌ای. «Ca++» (کلسیمِ یونیزه، mmol/L) و «Globulin» عمداً
  //   نگاشت نشده‌اند: کلیدِ موتور ندارند، و نگاشتِ Ca++ به کلسیمِ تام عددِ ۱٫۲ را «کلسیمِ بحرانی» می‌کرد.
  creat: "CREAT", phosphate: "PHOS", inorganicphosphorus: "PHOS", inorganicphosphate: "PHOS",
  alkphos: "ALP", alkphosphatase: "ALP", alkph: "ALP", got: "AST", gpt: "ALT",
  tlc: "WBC", totalleukocytecount: "WBC",
  freethyroxine: "FT4", thyroidstimulatinghormone: "TSH", tshultra: "TSH", ultrasensitivetsh: "TSH",
  glycatedhemoglobin: "HBA1C", glycatedhaemoglobin: "HBA1C", glycosylatedhemoglobin: "HBA1C",
  cholesteroltotal: "CHOL", totalironbindingcapacity: "TIBC", reticulocytecount: "RETIC",
  urate: "URIC", serumurate: "URIC", thrombocyte: "PLT",
  // ═══ P111 (بازبینیِ ۲۰۲۶-۱۰-۲۰، برگه‌های واقعی): هر نگاشت صریح است، نه حدسِ فازی (N2) ═══
  //  • «Platlet» — غلطِ املاییِ رایجِ LIS؛ بی‌آن پلاکتِ ۳۰۹ هرگز وارد CBC نمی‌شد (N28: ردیفِ شناخته‌شدهٔ بی‌خواننده = افتِ خاموش).
  platlet: "PLT", platlets: "PLT", plts: "PLT",
  //  • «U.AC» = Uric Acid؛ بی‌آن اسید اوریکِ ۸٫۰ بالای برگه «تفسیر نشد».
  uac: "URIC", uacid: "URIC",
  //  • «Phosphorus.P» و «Mg +2»: نقطه و بارِ یونی بخشی از *نام* تست است، نه شناسه‌اش. norm() نقطه را برمی‌دارد
  //    ولی «+» را نه؛ هر دو صریح نگاشت می‌شوند تا با «P»ِ تنها (=PHOS، NAME_MAP بالا) یا «Mg» قاطی نشوند.
  phosphorusp: "PHOS", phosphorousp: "PHOS", serumphosphorusp: "PHOS", inorganicphosphorusp: "PHOS",
  // برگهٔ واقعیِ ۲۰۲۶-۱۱-۰۸ (N2): «P ( Phosphorus )» (فسفر ۵٫۱ = بالا) و «K ( Potassium )» «تفسیر نشدند» بودند؛ «Ca ( Calcium )» و «Na ( Sodium )» همان برگه نگاشت می‌شدند.
  pphosphorus: "PHOS", kpotassium: "K",
  tpoel: "ANTI_TPO", tpoelisa: "ANTI_TPO",
  mg2: "MG", "mg+2": "MG", mgplus2: "MG", magnesium2: "MG", serummagnesium2: "MG",
  ca2: "CA", "ca+2": "CA", calcium2: "CA",
  //  • «Serum Albumin» — بی‌آن قاعدهٔ پروتئینِ تام می‌گفت «آلبومین روی این برگه نیست» (ادعای کاذب، N4) و
  //    گلوبولینِ ۴٫۹ (هایپرگاماگلوبولینمی) پنهان می‌ماند.
  serumalbumin: "ALB", albuminserum: "ALB",
  //  • پسوندِ روشِ اندازه‌گیری (کمی‌لومینسانس) که به نام می‌چسبد: «TSH CL»، «T4 CL»، «T3 CL».
  tshcl: "TSH", t4cl: "T4", t3cl: "T3", ft4cl: "FT4", ft3cl: "FT3",
  //  • «T3UP» (T3 uptake) و «FTI»: شناخته‌شده ⇒ «تفسیر نشدند» با نامِ فارسی، نه ادعای «موتور نمی‌فهمد».
  t3up: "T3UP", t3uptake: "T3UP", t3resin: "T3UP", t3resinuptake: "T3UP",
  fti: "FTI", freethyroxineindex: "FTI",
};

// ═══════════ آنالیزِ مایع منی (P47) ═══════════
// 🔴 باگِ واقعی: برگهٔ منی `pH`، `WBC`، `RBC` و `Volume` دارد — همان نام‌های آزمایش ادرار و CBC.
//    pH به «Urine pH» می‌رفت و RBCِ «8-10» قاعدهٔ hematuria را فعال می‌کرد: بیمار می‌خواند «در
//    آزمایش ادرار شما خون دیده شده است». نامِ ردیف هویت نیست؛ صفحه‌ای که ردیف رویش است هم بخشی
//    از کلید است.
// ⚠️ OCR فیلدِ «عنوانِ بخش» ندارد، پس صفحهٔ منی از دو نشانهٔ دیگر شناخته می‌شود (P47، کلاریفای Q4):
//    یک ردیفِ مخصوصِ منی، یا یک واحدِ مخصوصِ منی. هر کدام کافی است.
const SEMEN_ONLY_MARKERS = new Set([
  "motility", "spermmotility", "totalmotility", "progressivemotility", "progressive",
  "rapidprogressive", "slowprogressive", "nonprogressive", "nonprogressivemotility", "immotile",
  "gradea", "gradeb", "gradec", "graded",
  "morphology", "spermmorphology", "normalforms", "normalmorphology", "strictmorphology", "krugermorphology",
  "liquefaction", "liquefactiontime", "viscosity", "vitality", "agglutination",
  "sperm", "spermcount", "spermconcentration", "totalspermcount", "totalspermnumber",
  "abstinence", "abstinencedays", "abstinenceperiod", "semenvolume", "semenanalysis", "spermogram",
  "seminalfructose", "fructose",
  "اسپرم", "تعداداسپرم", "غلظتاسپرم", "تحرک", "تحرککل", "تحرکپیشرونده", "مورفولوژی", "مرفولوژی",
  "زمانمایعشدن", "مایعشدگی", "ویسکوزیته", "مدتپرهیز", "مایعمنی", "اسپرموگرام", "فروکتوز",
]);
// ⚠️ باید mL باشد، نه µL: RBCِ خون با «10*6/µL» چاپ می‌شود و اگر این الگو µL را هم بگیرد، هر
//    برگهٔ CBC «منی» می‌شود (M104b).
const SEMEN_UNIT_RE = /^(million|mil|mill|[x×*]?10\^?\*?6)\/ml$/;
// 🔴 بازبینی: «×10⁶/ml» (بالانویسِ ۶) نمی‌خورد و صفحهٔ منی ادرار خوانده می‌شد (hematuria دوباره).
const SUPERSCRIPT = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9" };
function isSemenUnit(unit) {
  const raw = String(unit || "").replace(/\s+/g, "").replace(/[⁰-⁹¹²³]/g, (c) => SUPERSCRIPT[c] ?? c);
  // «M/mL» فقط با M بزرگ (میلیون) — حروفِ کوچک را نمی‌گیریم.
  return SEMEN_UNIT_RE.test(raw.toLowerCase()) || /^M\/m[lL]$/.test(raw);
}
// 🔴 بازبینی: برگهٔ آزمایش ادرار اغلب ردیفِ «Sperm» (در میکروسکوپی) دارد، و «Morphology» روی
//    لامِ خون هم می‌آید. یکی از این دو به‌تنهایی کلِ صفحه را «منی» می‌کرد: WBC/RBCِ ادرار به
//    semenQual می‌رفت، hematuria گم می‌شد و pHِ ادرار «pHِ مایع منی» خوانده می‌شد. این نشانگرهای
//    ضعیف فقط وقتی حساب‌اند که صفحه هیچ نشانگرِ ادرار یا خون ندارد.
const WEAK_SEMEN_MARKERS = new Set(["sperm", "اسپرم", "morphology", "مورفولوژی", "مرفولوژی"]);
// رنگ/ظاهر/پاس‌سل روی برگهٔ منی هم هست، پس شاهدِ «ادرار» نیستند.
const URINE_EVIDENCE = new Set([
  "specificgravity", "sg", "turbidity", "nitrite", "nitrites", "nitrit", "leukocyteesterase", "urobilinogen",
  "casts", "crystals", "yeasts", "epithelialcells", "epithelial", "mucus", "bacteria", "urinalysis", "ua",
]);

// ردیف‌های صفحهٔ منی → کلید. عددی‌ها به tests (فعلاً بی‌بازه → noRef)، بقیه به semenQual.
// ⚠️ semenQual عمداً از qual جداست: قاعده‌های ادرار qual را با /rbc/ و /wbc/ روی *هر* نامی
//    جست‌وجو می‌کنند (urineCellCount)، پس «Semen RBC» در qual همان hematuria را می‌ساخت.
const SEMEN_KEY = {
  volume: "SEMEN_VOL", semenvolume: "SEMEN_VOL", حجم: "SEMEN_VOL", حجممنی: "SEMEN_VOL",
  count: "SPERM_CONC", spermcount: "SPERM_CONC", concentration: "SPERM_CONC",
  spermconcentration: "SPERM_CONC", تعداداسپرم: "SPERM_CONC", غلظتاسپرم: "SPERM_CONC",
  totalcount: "SPERM_TOTAL", totalspermcount: "SPERM_TOTAL", totalspermnumber: "SPERM_TOTAL",
  motility: "SPERM_MOT_TOTAL", totalmotility: "SPERM_MOT_TOTAL", spermmotility: "SPERM_MOT_TOTAL",
  تحرک: "SPERM_MOT_TOTAL", تحرککل: "SPERM_MOT_TOTAL",
  progressivemotility: "SPERM_MOT_PROG", progressive: "SPERM_MOT_PROG", pr: "SPERM_MOT_PROG",
  تحرکپیشرونده: "SPERM_MOT_PROG",
  morphology: "SPERM_MORPH", spermmorphology: "SPERM_MORPH", normalforms: "SPERM_MORPH",
  normalmorphology: "SPERM_MORPH", strictmorphology: "SPERM_MORPH", krugermorphology: "SPERM_MORPH",
  مورفولوژی: "SPERM_MORPH", مرفولوژی: "SPERM_MORPH",
  ph: "SEMEN_PH",
  abstinence: "SEMEN_ABSTINENCE", abstinencedays: "SEMEN_ABSTINENCE",
  abstinenceperiod: "SEMEN_ABSTINENCE", مدتپرهیز: "SEMEN_ABSTINENCE",
};
const SEMEN_QUAL_KEY = {
  wbc: "SEMEN_WBC", whitebloodcell: "SEMEN_WBC", puscell: "SEMEN_WBC", puscells: "SEMEN_WBC",
  leukocytes: "SEMEN_WBC", wbchpf: "SEMEN_WBC",
  rbc: "SEMEN_RBC", redbloodcell: "SEMEN_RBC", rbchpf: "SEMEN_RBC",
  fructose: "SEMEN_FRUCTOSE", seminalfructose: "SEMEN_FRUCTOSE", فروکتوز: "SEMEN_FRUCTOSE",
  acidphosphatase: "SEMEN_ACP", neutralalphaglucosidase: "SEMEN_NAG", nag: "SEMEN_NAG",
};

/** آیا این ردیف‌ها (یک صفحه) آنالیزِ منی‌اند؟ — صادر می‌شود تا mergePages هم از همین استفاده کند. */
export function isSemenPage(pageTests) {
  const rows = (pageTests || []).filter((t) => t?.name);
  const keys = rows.map((t) => norm(t.name));
  if (rows.some((t) => isSemenUnit(t.unit))) return true;
  if (keys.some((k) => SEMEN_ONLY_MARKERS.has(k) && !WEAK_SEMEN_MARKERS.has(k))) return true;
  const otherKind = keys.some((k) => URINE_EVIDENCE.has(k) || BLOOD_ONLY_MARKERS.has(k));
  return !otherKind && keys.some((k) => WEAK_SEMEN_MARKERS.has(k));
}

function detectSemenPages(ocrTests) {
  const byPage = new Map();
  for (const t of ocrTests) {
    if (!t?.name) continue;
    const p = t._page ?? 0;
    if (!byPage.has(p)) byPage.set(p, []);
    byPage.get(p).push(t);
  }
  const pages = new Set();
  for (const [p, rows] of byPage) if (isSemenPage(rows)) pages.add(p);
  return pages;
}

// ---------- نگاشتِ پشتیبان برای املاهای دیده‌نشده ----------
// ⚠️ NAME_MAP تطبیقِ دقیق می‌خواهد، پس هر املای تازه‌ای که روی برگه ظاهر شود
//    تست را unmapped می‌کند و از تفسیر می‌اندازد. نمونهٔ واقعی: «ESR 1hrs»
//    خوانده شد ولی تفسیر نشد، در حالی که مقدارش ۸۵ بود (مرجع تا ۲۲).
//
// اینجا فقط قاعده‌هایی می‌آیند که *مبهم نیستند* — حدسِ فازی عمداً نداریم،
// چون نگاشتِ اشتباه در متنِ بالینی از نگاشت‌نشدن بدتر است.
// P111: پسوندِ چسبیدهٔ روشِ دستگاه («vitdcl»، «tshclia») — اگر با حذفِ پسوند، کلیدِ شناخته‌ای بماند همان را برمی‌گردانیم.
//   فقط پسوندهایی که در NAME_MAP به‌عنوانِ روش ثبت شده‌اند و فقط وقتی باقیِ نام دست‌کم سه نویسه باشد؛
//   «cl» تنها (کلرید) هرگز به کلیدِ خالی تبدیل نمی‌شود چون طولش کافی نیست. این جای املاهای بی‌پایانِ per-key را می‌گیرد.
const GLUED_METHOD_SUFFIXES = ["clia", "eclia", "elisa", "cmia", "icma", "hplc", "ecl", "ifa", "cl"];
function resolveAlias(key) {
  // هیچ تستِ دیگری با esr شروع نمی‌شود؛ «ESR 1hrs»، «ESR 1st hour»، «ESR 2hrs»
  if (/^esr/.test(key)) return "ESR";
  // P111: پسوندِ چسبیدهٔ متد — پیش از قاعده‌های املایی، چون «vitdcl» باید VIT_D شود نه چیزِ دیگر.
  for (const sfx of GLUED_METHOD_SUFFIXES) {
    if (key.length > sfx.length + 2 && key.endsWith(sfx)) {
      const base = key.slice(0, -sfx.length);
      const hit = NAME_MAP[base] ?? NAME_MAP[base.replace(/e$/, "")] ?? NAME_MAP[base + "e"];
      if (hit) return hit;
    }
  }
  // «Vitamin» تنها ویتامینِ خاصی نیست؛ بدونِ این، قاعدهٔ «e پایانی» پایین آن را VIT_E می‌کرد (specs/004، M148).
  if (key === "vitamin" || key === "ویتامین") return undefined;
  // جمعِ انگلیسی و «e» پایانیِ اختیاری: cholesterols → cholesterol
  if (key.endsWith("s") && NAME_MAP[key.slice(0, -1)]) return NAME_MAP[key.slice(0, -1)];
  if (NAME_MAP[key + "e"]) return NAME_MAP[key + "e"];

  // ---- دو نامِ یک آزمایش که برگه کنارِ هم چاپشان کرده ----
  // 🔴 باگ واقعی روی یک برگهٔ زنده: «SGOT (AST)» و «SGPT (ALT)». norm() پرانتز
  //    را می‌اندازد، پس کلید «sgotast» می‌شود — و NAME_MAP فقط ترتیبِ عکس را
  //    دارد («astsgot»). نتیجه: AST=۱۶ و ALT=۲۲ هر دو unmapped شدند، یعنی
  //    موتور کبد را ندید و قاعدهٔ LDH هم که AST/ALT را می‌خواند، خالی ماند.
  //    نگاشت‌نشدن سکوت است، نه خطا — همان کلاسِ N2.
  //
  // ⚠️ این حدسِ فازی نیست و نباید بشود: تقسیم فقط وقتی پذیرفته می‌شود که
  //    *هر دو نیمه* به یک کلیدِ موتورِ یکسان نگاشت شوند. پس «astalt»،
  //    «ptinr»، «cacr» و هر جفتِ نامرتبطِ دیگری رد می‌شوند — شرطِ توافق خودش
  //    نگهبان است، و برای همین اینجا خلافِ «حدس نزن» عمل نمی‌شود: جایی که
  //    دو نیمه دو چیزِ متفاوت بگویند، پاسخ «نمی‌دانم» است نه یکی از آن دو.
  //    هر دو نیمه دستِ‌کم دو نویسه‌اند تا «ldl»+«c» و امثالش تقسیم نشوند.
  for (let i = 2; i <= key.length - 2; i++) {
    const a = NAME_MAP[key.slice(0, i)];
    const b = NAME_MAP[key.slice(i)];
    if (a && b && a === b) return a;
  }
  return undefined;
}

// ═══ specs/004 (FR-011): مخففِ دوحرفی فقط با واحدِ غلظتِ سرم/پلاسما ═══
// «Cu»/«Zn» در کشت یا میکروسکوپیِ ادرار بی‌واحد یا /hpf می‌آیند؛ نگاشتِ غلط بدتر از نگاشت‌نکردن است (N2).
const TRACE_CONC_UNIT = /^(µg|μg|ug|mcg|ng|mg)\/(dl|l|ml)$|^(µmol|μmol|umol|nmol)\/l$/;
const UNIT_GATED_ALIASES = { zn: "ZINC", cu: "COPPER", se: "SELENIUM" };

// ═══ P111 (بازبینیِ ۲۰۲۶-۱۰-۲۰): ردیف‌های *مشتق* که برگه کنارِ اجزای خودشان چاپ می‌کند ═══
//   «VLDL»، «LDL/HDL»، «BUN/Cr»، «A/G Ratio»، «Serum Globulin»، «FBS(SI)» هیچ اطلاعِ مستقلی ندارند:
//   همه از ردیف‌های همان برگه ساخته می‌شوند. پیش‌تر unmapped می‌شدند و ته جدولِ تخصصی با «بدون حکم»
//   می‌نشستند (N28-وار: ردیفِ شناخته‌شدهٔ بی‌مصرف). قاعده: فقط وقتی کنار گذاشته می‌شوند که *همهٔ* اجزایشان
//   با مقدار روی همان برگه باشند؛ وگرنه ردیف تنهاست و باید در «تفسیر نشدند» بماند (N4: سکوت ممنوع).
const DERIVED_ROW_BASES = {
  vldl: ["TG"], vldlcholesterol: ["TG"], vldlc: ["TG"], vldlchol: ["TG"],
  ldlhdl: ["LDL", "HDL"], ldlhdlratio: ["LDL", "HDL"], cholhdlratio: ["CHOL", "HDL"],
  totalcholesterolhdl: ["CHOL", "HDL"], cholesterolhdlratio: ["CHOL", "HDL"],
  cholesterolhdl: ["CHOL", "HDL"], cholhdl: ["CHOL", "HDL"], tchdl: ["CHOL", "HDL"], totalcholhdl: ["CHOL", "HDL"],   // «Cholesterol / HDL» روی برگهٔ زنده (۲۰۲۶-۱۱-۰۸)
  buncr: ["UREA|UREA_N", "CREAT"], buncreat: ["UREA|UREA_N", "CREAT"], buncreatinine: ["UREA|UREA_N", "CREAT"],
  buncreatinineratio: ["UREA|UREA_N", "CREAT"],
  agratio: ["ALB", "TP"], aglobulinratio: ["ALB", "TP"], albuminoglobulinratio: ["ALB", "TP"],
  albumenglobulin: ["ALB", "TP"], albuminglobulin: ["ALB", "TP"], albuminaglobulin: ["ALB", "TP"],   // P113: norm «/» را می‌زند ⇒ albuminglobulin
  astalt: ["AST", "ALT"], sgotgptratio: ["AST", "ALT"], sgotgpt: ["AST", "ALT"],   // P113: رانِ ۳۳/۴۵
  globulin: ["ALB", "TP"], serumglobulin: ["ALB", "TP"],
  fbssi: ["GLU_F"], glucosefastingsi: ["GLU_F"], fastingbloodsugarsi: ["GLU_F"],
};

// متنِ چاپیِ غیرآزمایش روی برگه (سلبِ مسئولیت، پانویسِ آزمایشگاه) — ردیفِ آزمایش نیست و نباید در
// «تفسیر نشدند» به بیمار نشان داده شود. فقط عبارت‌های صریح؛ هر جملهٔ دیگر همان مسیرِ unmapped را دارد.
const BOILERPLATE_RE = /بر\s*عهده|تفسیر\s*نتایج|نتیجه\s*آزمایش\s*فقط|فقط\s*جهت\s*اطلاع|جهت\s*اطلاع\s*پزشک|نظر\s*پزشک\s*معالج|interpreted\s*by|for\s*physician\s*use|results?\s*should\s*be\s*(correlated|interpreted)|this\s*report\s*is\s*not\s*a\s*diagnosis/i;

// واژگانِ لامِ خون در متنِ آزاد — متنِ دارای این‌ها مالِ خوانندهٔ لام است (specs/009)، نه یادداشتِ عمومی.
const SMEAR_VOCAB_RE = /\b(blasts?|myeloblasts?|lymphoblasts?|auer|toxic\s*gran|d[oö]hle|pelger|may[\s-]*hegglin|alder[\s-]*reilly|ch[eé]diak|immature\s+mononuclear)\b|بلاست|پلگر/i;


function unitGatedKey(key, unit) {
  const k = UNIT_GATED_ALIASES[key];
  return k && TRACE_CONC_UNIT.test(normUnit(unit)) ? k : undefined;
}

// «PCT» دو تست کاملاً متفاوت است: پلاکت‌کریت (٪، کنار PLT/MPV در CBC) و پروکلسی‌تونین
// (ng/mL، نشانگر بحرانیِ سپسیس). نگاشتِ اشتباه در هر دو جهت خطرناک است — پلاکت‌کریتِ ۰.۲۸۷٪
// خوانده‌شده به‌عنوانِ پروکلسی‌تونین یعنی بیمار جوابِ «تستِ سپسیس منفی» برای تستی می‌گیرد که
// اصلاً انجام نشده (N2/N25). واحدِ درصد قطعی است؛ ng/mL و مشابه‌ها هم قطعی‌اند؛ فقط نبودِ واحد
// به نیتِ اصلیِ نگاشتِ برهنه (نشانگرِ بحرانی هرگز بی‌صدا گم نشود) برمی‌گردد.
const PCT_PLATELETCRIT_UNIT = /^%$/;
function pctKey(unit) {
  return PCT_PLATELETCRIT_UNIT.test(normUnit(unit)) ? "PLT_CRIT" : "PCT_SEPSIS";
}

// P107 (L10، N2): تستِ بارداریِ ادرار با املاهای رایجِ برگه unmapped بود و «Positive» هیچ یافته‌ای نمی‌گرفت.
//   فقط جوابِ کیفی (Positive/Negative/…) به HCG می‌رود: عددِ hCGِ ادرار با بازهٔ سرم قابلِ مقایسه نیست ⇒ unmapped، نه حدس (N3).
const URINE_HCG_QUAL_ALIASES = new Set([
  "urinepregnancytest", "pregnancytesturine", "upt", "pregtest", "pregnancytestqualitative",
  "hcgurine", "urinehcg", "bhcgurine", "urinebhcg", "betahcgurine", "urinebetahcg",
  "bhcgqualitative", "betahcgqualitative", "hcgqualitative", "qualitativehcg", "qualitativebhcg", "qualitativebetahcg",
  "تستبارداریادرار", "آزمایشبارداریادرار", "بارداریادرار", "تستحاملگی", "تستحاملگیادرار",
]);
function urineHcgKey(key, value) {
  return URINE_HCG_QUAL_ALIASES.has(key) && toNum(value) == null ? "HCG" : undefined;
}

// «PT INR» (ردیفِ جدا از «PT») روی برگه‌های LIS یعنی INR — ۴۰ درخواستِ یک بیمارستان، INRِ ۱٫۴ تا ۱٫۸ بی‌تفسیر (N2، گارد L2).
//   ولی «PT/INR» گاهی ردیفِ *ثانیهٔ* PT است و INR کنارش. ثانیه (≥ ۸) خوانده‌شده به‌عنوانِ INR یعنی INR ≥ ۱۰ ⇒ اورژانسِ کاذب
//   (INR_EMERGENCY_FROM). پس فقط عددِ زیرِ ۸ INR است؛ بقیه unmapped («تفسیر نشدند») می‌ماند — نه حدس.
function ptInrKey(key, value) {
  if (key !== "ptinr") return undefined;
  const v = toNum(value);
  return v != null && v > 0 && v < 8 ? "INR" : undefined;
}

// ═══ specs/004 (FR-007، N25): کیفی — هرگز به عدد تبدیل نمی‌شوند (N6) و هرگز به qual نمی‌روند ═══
// qual با regex روی *هر* کلید جست‌وجو می‌شود (N25)، پس «Anti-Intrinsic Factor: Positive» آنجا
// خواننده‌های ناخواسته پیدا می‌کرد. به noRef ⇒ خطِ «تفسیر نشدند» با faName، و متنِ خامشان در
// ungraded (reason: no_range) تا overt_b12_deficiency فقط «مثبت» را بخواند (P49-ج، تأییدِ ۲۰۲۶-۰۹-۱۹).
// یافته‌ای که یکی را تفسیر کند آن را در explains می‌گذارد و از خط بیرون می‌رود (unexplainedNoRef).
const QUAL_NO_READER = new Set(["ANTI_IF", "APCA"]);

// ═══ specs/010 (research R3/R6، FR-005/FR-021): یک ردیفِ هموستاز → آیتمِ کانالِ hemostasis ═══
// ⚠️ مهارکننده: حکم فقط از (الف) واژهٔ فهرستِ بسته که *کلِ* مقدار را بپوشاند یا (ب) محدودهٔ چاپ‌شدهٔ خودِ ردیف.
//    هیچ آستانهٔ عددی‌ای (مثلِ ۰٫۵ BU متنِ چسبانده‌شده) اینجا نیست — تأیید نشده (P61، پرسشِ 61-d). «Undetected» شاملِ
//    «detected» است و «+/-» شاملِ «+»؛ برای همین مطابقت روی کلِ مقدار است، نه زیررشته (N6، M153b).
const INHIB_POSITIVE = /^(positive|pos|detected|present|reactive|مثبت|دیده شد|یافت شد)$/;
const INHIB_NEGATIVE = /^(negative|neg|not detected|undetected|non-?detected|absent|nil|not seen|منفی|یافت نشد|دیده نشد)$/;
function inhibWord(raw) {
  const s = String(raw ?? "").toLowerCase().replace(/[.\s]+$/, "").replace(/\s+/g, " ").trim();
  if (INHIB_POSITIVE.test(s)) return "positive";
  if (INHIB_NEGATIVE.test(s)) return "negative";
  return null;
}
function hemostasisItem(key, t, sex) {
  const raw = String(t.value ?? "").trim();
  const reference = t.reference ?? null;
  const item = { raw, unit: t.unit ?? null, reference, value: null, unitState: null, qual: null, lessThan: false };
  // «Positive (2.4 BU)» / «Negative (0.0)»: واژه + عددِ داخلِ پرانتز — واژه حکم است، عدد فقط نقل می‌شود.
  const word = key === "FVIII_INHIB" ? (inhibWord(raw) ?? inhibWord(raw.replace(/\s*[(\[].*[)\]]\s*$/, ""))) : null;
  if (word) { item.qual = word; return item; }
  // «<1» / «کمتر از ۱»: عدد مرز است، نه مقدار — «<1٪» شدید است، نه متوسط.
  const lt = /^\s*(<|≤|کمتر\s*از)/.test(raw);
  const n = toNum(raw.replace(/^\s*(<|≤|>|≥|کمتر\s*از|بیشتر\s*از)\s*/, ""));
  if (n == null) { if (key === "FVIII_INHIB") item.qual = "unknown"; return item; }
  const { value, unitState } = hemostasisUnit(key, n, t.unit);
  item.value = value;
  item.unitState = unitState;
  item.lessThan = lt;
  // ⚠️ حکمِ عدد در برابرِ محدودهٔ چاپ‌شده باید با *عددِ چاپ‌شده* باشد، نه مقدارِ تبدیل‌شده به ٪: برگه‌ای که «0.45 IU/mL (0.5-1.5)»
  //    می‌نویسد محدوده‌اش هم IU/mL است، و مقایسهٔ ۴۵ با ۰٫۵–۱٫۵ جهت را وارونه می‌کرد (بازبینیِ کد، N12).
  item.position = reference && unitState === "ok" ? printedVerdict(reference, n, sex) : null;
  if (key === "FVIII_INHIB") {
    const pv = reference ? printedVerdict(reference, n, sex) : null;
    item.qual = pv === "above" ? "positive" : (pv === "within" || pv === "below") ? "negative" : "unknown";
    // بازبینیِ متخصص ۲۰۲۶-۰۹-۳۰ (61-d): بی‌محدودهٔ چاپ‌شده و با واحدِ BU، روشِ Nijmegen-Bethesda: ≥۰٫۶ مثبت، <۰٫۵ منفی؛
    //   ۰٫۵ تا <۰٫۶ مرزی ⇒ «unknown» (جوابِ روشن نیست، فوریتِ کف). آستانه وابسته به روش است و واژهٔ چاپ‌شده/محدودهٔ برگه مقدم است.
    if (pv == null && !reference && /^\s*(n?bu|bethesda)/i.test(String(t.unit ?? ""))) {
      item.qual = n >= 0.6 ? "positive" : n < 0.5 ? "negative" : "unknown";
    }
  }
  return item;
}
// ═══ P49-الف: کلیدهای بی‌پروفایلِ واحد که قاعده‌ای عددشان را می‌خواند ═══
// سرولوپلاسمین mg/dL یا g/L چاپ می‌شود (۱۰ در برابرِ ۰.۱)، مسِ ادرار µg یا µmol در ۲۴ ساعت. هیچ‌کدام در
// UNIT_PROFILE نیستند، پس واحدِ چاپ‌شده اینجا نگه داشته می‌شود و قاعده فقط با واحدِ چاپ‌شده حکم می‌دهد (N3).
// P57 پرسش ۶ — شاخص‌های پلاکتیِ وابسته به دستگاه.
const ADULT_ONLY_REF_KEYS = new Set(["MYOGLOBIN", "TRANSFERRIN", "ATIII", "TT"]);
const PLATELET_INDEX_KEYS = new Set(["PDW", "P_LCR", "PLT_CRIT"]);
const UNIT_KEPT = new Set(["PDW", "PLT_CRIT", "P_LCR", "CERULOPLASMIN", "U_COPPER_24H",
  // specs/021 (G4): PCR بی‌بازه است؛ در ungraded هم می‌نشیند تا امتیازِ برگه آن را «خوانده‌نشده» بشمارد (score.js) و برگه با
  //   PCRِ تفسیرنشده «مطلوب» نشود (اصلِ II). واحدِ چاپ‌شده (mg/mmol، mg/g، mg/mg) همراهش می‌ماند.
  "UPCR",
  // P93-ب: قندهای آزمونِ تحملِ قند (۱ و ۳ساعته، چالشِ ۵۰ گرمی) — mmol/L فقط با واحدِ چاپ‌شده تبدیل می‌شود (N3).
  "GLU_1H", "GLU_3H", "GLU_GCT",
  // P53 پرسش ۴ و ۶ (تصمیمِ کاربر ۲۰۲۶-۰۹-۲۴): ZPP فقط با µmol/mol، sTfR فقط با mg/L تفسیر می‌شوند، و درصدِ
  // واریانت‌های هموگلوبین را قاعده‌ها از ungraded می‌خوانند — بی‌بازه می‌مانند (noRef) تا قاعده explains کند.
  "ZPP", "STFR", "HBA", "HBS", "HBC", "HBE",
  // P46: کورتیزولِ بی‌ساعت بازه نمی‌گیرد (کورتیزولِ عصر طبیعی پایین است)؛ cortisol_untimed عددش را از اینجا می‌خواند.
  "CORTISOL",
  // P46 بندهای ۵–۱۰: سه کلیدِ بی‌بازه که قاعدهٔ adrenalAxis عددشان را از ungraded می‌خواند. حدِ UFC و بزاق به روشِ سنجش بستگی دارد.
  "UFC", "CORTISOL_SAL", "ACTH",
  // P47 (AMH، DHEA-S) و P49 (MMA، مس، روی): قاعده‌ها فقط با واحدِ چاپ‌شده حکم می‌دهند (N3)، پس واحد باید با عدد بماند.
  "AMH", "DHEAS", "MMA", "COPPER", "ZINC",
  // P109: eAG (مشتق از HbA1c) و شاخصِ آتروژنیک (نسبتِ چربی‌ها) — بی‌بازه؛ خواننده‌ها در patterns_p109.js.
  "EAG", "ATHERO_INDEX"]);

// ═══ specs/008 — ردیف‌های الکتروفورزِ هموگلوبین (R4) ═══
const HB_AMBIGUOUS = { hbs: "HBS", hbc: "HBC", hbe: "HBE",       // هم‌نامِ نشانگرهای هپاتیتِ B
  hemoglobins: "HBS", haemoglobins: "HBS", hemoglobinc: "HBC", haemoglobinc: "HBC", // جمعِ «hemoglobin» (B2)
  hgbs: "HBS", hgbc: "HBC", hgbe: "HBE", // 🔴 دور ۲ (R2-B4): «Hgb S» ⇒ جمعِ «hgb» = HGB ⇒ «Hgb S 40 %» اورژانس
  hbas: "HBS" }; // 🔴 دور ۲ (CR9): «HbAS 40%» (ژنوتیپِ صفتِ داسی) با قاعدهٔ جمع ⇒ «hba» = HBA
// 🔴 دور ۲ (CR9/CR10): نام‌هایی که با واحدِ غلظت (g/dL، g/L، mmol/L) خودِ هموگلوبین‌اند: «Hémoglobine 14 g/dL»
//    (فرانسوی) به unmapped می‌رفت و «Hemoglobina 6.1 g/dL» (اسپانیایی/ایتالیایی) HbA بی‌بازه می‌شد — Hbِ بحرانی بی‌حکم (N2).
const HB_TOTAL_WITH_MASS_UNIT = new Set(["hemoglobine", "hémoglobine", "haemoglobine", "hemoglobina", "haemoglobina", "hba", "hgba"]);
const HB_MASS_UNIT = /g\s*\/\s*(dl|l)\b|mmol\s*\/\s*l/i;
// «Hemoglobin E» و «Hémoglobine» هر دو «hemoglobine» می‌شوند: با شاهدِ الکتروفورز HbE؛ با واحدِ غلظت خودِ Hb
// (HB_TOTAL_WITH_MASS_UNIT)؛ وگرنه دوپهلو ⇒ «تفسیر نشدند» + HB_NAME_AMBIGUOUS (R2-B5).
const HB_FRENCH_HGB = { hemoglobine: "HBE", haemoglobine: "HBE" };
const HB_VARIANT_KEYS = new Set(["HBA", "HBA2", "HBF", "HBS", "HBC", "HBE", "SICKLE"]);
const HB_ELECTRO_EVIDENCE = new Set(["HBA2", "HBF", "HBA"]);        // نام‌های بی‌ابهام = شاهدِ صفحه
// کلیدهایی که بازهٔ تأییدشده ندارند (P53) — در هر سنی noRef ⇒ «تفسیر نشدند».
const NO_RANGE_KEYS = new Set(["RETIC_ABS", "HBA", "HBS", "HBC", "HBE", "SICKLE", "ZPP", "STFR", "EPO"]);

// ═══ P116 (بازبینی ۲۰۲۶-۱۰-۲۷) ═══
// ۱) دو شاخصِ تیروئیدی که موتور برایشان مرجعِ داخلی ندارد ولی برگه بازه چاپ می‌کند: بازهٔ خودِ برگه سنجه است.
const PRINTED_REF_ONLY_KEYS = new Set(["T3UP", "FTI"]);
// ۲) سنجه‌هایی که «تخفیفِ» بازهٔ چاپ‌شده هرگز به آن‌ها نمی‌رسد (خطرِ بالا: پتاسیم، سدیم، قند، تروپونین، انعقاد، CBC).
const PRINTED_RELAX_EXEMPT = new Set([
  "K", "NA", "CA", "MG", "PHOS", "GLU_F", "GLU_RANDOM", "TROPONIN_I", "TROPONIN_T", "INR", "PT", "PTT", "D_DIMER",
  "HGB", "HCT", "PLT", "WBC", "CREAT", "LACTATE", "PH", "DIGOXIN", "LITHIUM", "AMMONIA", "BILI_T",
  // URIC: تصمیمِ مستندِ Y24 (review1020) — اسید اوریک روی «سقفِ بازهٔ آزمایشگاه» خودِ قاعده با متنِ
  //   «سقفِ بازهٔ آزمایشگاه» می‌آید و بازهٔ چاپی را نقل می‌کند؛ تخفیفِ عمومی آن یافته را کامل حذف می‌کرد.
  "URIC",
  // MPV/PDW: قاعدهٔ platelet_indices_context خودش «بازهٔ چاپ‌شدهٔ آزمایشگاه» را نقل می‌کند (V29)؛
  //   تخفیفِ عمومی یافته را کامل حذف می‌کرد.
  "MPV", "PDW",
]);
/** 🔴 دور ۲ (CR6): صفحه‌ای که الکتروفورزِ هموگلوبین دارد — mergePages کلیدِ نام‌های دوپهلو را با آن جدا می‌کند. */
export function isHbElectroPage(tests) {
  return (tests || []).some((t) => t?.name && (HB_ELECTRO_EVIDENCE.has(NAME_MAP[norm(t.name)]) ||
    (norm(t.name) === "a2" && /%/.test(String(t.unit || "")))));
}
/** نامی که هم واریانتِ هموگلوبین است هم نشانگرِ هپاتیتِ B («HBs»/«HbS»). */
export const isHbAmbiguousName = (name) => !!HB_AMBIGUOUS[norm(name)];

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
  // «160.0» (بازبینیِ متامورفیک ۲۰۲۶-۱۰-۰۵): اعشارِ صفر همان تیتر است؛ پیش‌تر به qual می‌رفت و هیچ قاعده‌ای آن را نمی‌خواند.
  const n = s.match(/^\s*(\d+)(?:[.٫]0+)?\s*$/);
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
  "nitrite", "nitrites", "nitrit", "urinenitrite", "نیتریت",   // P113: «Nitrit» غلطِ املاییِ رایجِ LIS
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
  "nitrite", "nitrites", "nitrit", "leukocyteesterase", "urobilinogen",
  "casts", "crystals", "yeasts", "epithelialcells", "epithelial",
  "mucus", "puscell", "puscells", "bacteria", "urinalysis", "ua",
  "leukoestr", "leukoesterase", "leucoesterase",   // باگِ ۵: املاهای LIS ِ استراز
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
  "apob", "apolipoproteinb",
]);

// نشانگرهای گاز خون شریانی (ABG) — تنها زمینه‌ای که pH خون معنا دارد.
const ABG_MARKERS = new Set([
  "hco3", "bicarbonate", "pco2", "paco2", "po2", "pao2",
  "baseexcess", "be", "abg", "so2", "sao2", "o2sat",
]);

// کلیدهایی که هم روی برگهٔ خون و هم روی برگهٔ ادرار دیده می‌شوند
// P114 (۲۰۲۶-۱۰-۲۷، گزارشِ برگهٔ مرد ۵۵ ساله): «Hemoglobin» هم نامِ CBC است و هم پدِ خونِ نوارِ ادرار.
//   نبودنش در این فهرست یعنی هر دو ردیف هویتِ یکسان می‌گرفتند و mergePages هشدارِ
//   «Hemoglobin در صفحهٔ ۲ و ۲ با مقادیرِ متفاوت (6.4 و Negative)» می‌ساخت (N25).
const AMBIGUOUS_URINE_KEYS = new Set([
  "ph", "wbc", "rbc", "glucose", "hgb", "hb", "hemoglobin", "protein", "bilirubin", "blood", "ketone", "ob",
]);

// ═══ سرتیترِ بخشِ برگه (بازبینی ۲۰۲۶-۱۰-۱۳، N25، پیشنهادِ کاربر) ═══
// برگهٔ واقعی ردیف‌ها را زیرِ سرتیتر چاپ می‌کند («Biochemistry»، «Urine Analysis»، «کامل ادرار»). OCR حالا همان سرتیتر را در
//   `section` می‌آورد (فرمِ دستی ردیفِ ادرار را «Urinalysis» می‌فرستد). برای کلیدِ مبهم (Glucose، Protein، pH، WBC، …) این شاهدِ
//   مستقیم است و بر حدسِ صفحه‌ای مقدم است: «Glucose 106 mg/dL» زیرِ بیوشیمی، کنارِ نوارِ ادرار، قندِ خون می‌ماند.
//   فهرستِ بسته؛ سرتیترِ ناشناخته (یا نبودنش) ⇒ null ⇒ همان منطقِ صفحه‌ای قبلی. ادرار اول سنجیده می‌شود («Urine Chemistry»).
const SECTION_STOOL_RE = /stool|feces|faeces|fa?eces?|occult|calprotectin|\b(ob|fob|fobt|fit)\b|مدفوع|خون\s*مخفی/i;
const SECTION_URINE_RE = /urin|\bu\s*[\/.]?\s*a\b|dipstick|strip|sediment|ادرار|رسوب/i;
const SECTION_BLOOD_RE = /bioch|chem|serum|plasma|hemat|haemat|\bcbc\b|blood|lipid|liver|renal|kidney|electrolyt|hormon|endocrin|thyroid|immuno|serolog|coag|بیوشیمی|سرم|پلاسما|خون|هماتولوژی|چربی|هورمون|تیروئید|سرولوژی|ایمونولوژی|انعقاد/i;
export function sectionKind(section) {
  const s = String(section ?? "").trim();
  if (!s) return null;
  // P111 (بازبینیِ ۲۰۲۶-۱۰-۲۰): مدفوع پیش از ادرار سنجیده می‌شود چون سرتیترِ برگهٔ ترکیبی
  //   «Urine Analysis … Stool» است و سطرِ دوم باید برنده باشد. بی‌این شاخه، «Color: Brown» و «WBC /hpf»
  //  ِ مدفوع هم‌کلیدِ ردیفِ ادرار می‌شدند ⇒ «دو مقادیر متفاوت» و هشدارِ «رنگِ ادرارِ قهوه‌ای» (N25).
  if (SECTION_STOOL_RE.test(s)) return "stool";
  if (SECTION_URINE_RE.test(s)) return "urine";
  if (SECTION_BLOOD_RE.test(s)) return "blood";
  return null;
}

// pH خون فقط در این دامنه با حیات سازگار است؛ خارج از آن یعنی pH ادرار.
// P107h (بازبین، ردیف ۱۹): pH بیرون از ۶٫۸–۷٫۸ هرگز pH خون نیست (با زندگی ناسازگار) ⇒ ادرار می‌ماند.
const BLOOD_PH_MIN = 6.8;
const BLOOD_PH_MAX = 7.8;

// بازبینی ۲۰۲۶-۱۰-۱۳ (یافتهٔ ۹/۱۷، N25): واحدی که نوارِ ادرار و میکروسکوپیِ ادرار هرگز چاپ نمی‌کنند، شاهدِ خون است.
//   پیش‌تر برگهٔ بیوشیمیِ کوتاه («Glucose 600 mg/dL · Hb 5.0 g/dL · Creatinine» + نوار) چون هیچ نامی از فهرستِ خون نداشت «ادرارِ خالص»
//   می‌شد و Hb 5 به «Urine Blood» و قندِ ۶۰۰ به «Urine Glucose» می‌رفت. فقط واحدهای بی‌ابهام: g/dL، fL، pg و شمارشِ ×10³/×10⁶ در µL.
//   «/µL» تنها نه (شمارشِ خودکارِ ادرار همان را چاپ می‌کند)، mg/dL و g/L نه (پروتئین/قندِ نوار).
const BLOOD_ONLY_UNIT_RE = /^(g\/dl|fl|pg|(?:[x×*]?10(?:\^|\*\*)?[36]|10[³⁶]|[km]|thou|mill?)\/(?:[uµμ]l|mm3|cumm))$/i;
function isBloodOnlyUnit(unit) {
  return BLOOD_ONLY_UNIT_RE.test(String(unit ?? "").replace(/\s+/g, ""));
}

/**
 * کدام صفحه‌ها «برگهٔ ادرارِ خالص»‌اند؟/**
 * کدام صفحه‌ها «برگهٔ ادرارِ خالص»‌اند؟
 * شرط محافظه‌کارانه: حداقل ۲ نشانگر ادرار و هیچ نشانگر خون (CBC یا بیوشیمی).
 * (اگر صفحه‌ای شاهد خون داشته باشد، دست نمی‌زنیم تا تستِ خون از بین نرود.)
 */
// ═══ P111 (بازبینیِ ۲۰۲۶-۱۰-۲۰): رنگِ مدفوع ≠ رنگِ ادرار ═══
// 🔴 روی برگهٔ بیمارِ ۴۰ ساله، «Color: Brown»ِ بخشِ مدفوع صفحه به «رنگِ ادرار» تبدیل شد و موتور به بیمار
//    هشدارِ «رنگِ ادرارِ شما قهوه‌ای است» داد — در حالی که ردیف مالِ مدفوع بود (N25: حدسِ مالکیت ممنوع).
//    قاعده: صفحه‌ای که نشانگرِ صریحِ مدفوع دارد (FOBT/FIT/کالپروتکتین/Stool …) صاحبِ «Color»ِ برهنه است؛
//    ردیف با نامِ صریحِ «Urine …» همچنان مسیرِ خودش را دارد، چون آن شاخه پیش از این است.
const STOOL_PAGE_RE = /^(stool|feces|faeces|fecal|faecal|(fecal|faecal|stool)?calprotectin|مدفوع|دفع)/;
// P112 (۲۰۲۶-۱۰-۲۱): ردیف‌های بخشِ مدفوع که *خوانندهٔ خودشان را دارند*: خونِ مخفی (همهٔ املاها از یک منبع:
//   isFecalBloodName در serology.js)، کالرکتانتین/کالپروتکتین و رنگ. ردیف‌های دیگر (W.B.C، RBC، مخاط …) خواننده
//   ندارند و باید در «تفسیر نشدند» بنشینند، نه در ادرار یا CBC (N25/N4).
//   پیش‌تر این فهرست جدا از AI_IDSِ سروالوژی نگه‌داری می‌شد و دو بار از هم جدا افتاد (N3).
const STOOL_OTHER_ROW_RE = /^(calprotectin|fecalcalprotectin|faecalcalprotectin|stoolcalprotectin|colou?r|رنگ|consistency|stoolconsistency|قوام|undigestedfoods?|undigestedfoodstuff|undigestedfibers?|vegetablefibers?|foodremnants?|بقایایغذایی|هضمنشده|mucus|mucous|mucusthreads?|مخاط|blood|grossblood|visibleblood|stoolblood|fecalblood|ova|ovaofparasites|ovaandparasites?|parasiteova|protozoa|protozoacysts?|parasitecysts?|cysts?|تخمانگل|کیست)/;
const isStoolReaderRow = (key) => isFecalBloodName(key) || STOOL_OTHER_ROW_RE.test(key);
function detectStoolPages(ocrTests) {
  const pages = new Set();
  for (const t of ocrTests) {
    if (!t?.name) continue;
    const k = norm(t.name);
    if (isFecalBloodName(k) || STOOL_PAGE_RE.test(k)) pages.add(t._page ?? 0);
  }
  return pages;
}


function detectUrineOnlyPages(ocrTests) {
  const urineCount = new Map();
  const bloodCount = new Map();
  for (const t of ocrTests) {
    if (!t?.name) continue;
    const p = t._page ?? 0;
    const k = norm(t.name);
    if (URINE_ONLY_MARKERS.has(k)) urineCount.set(p, (urineCount.get(p) ?? 0) + 1);
    if (BLOOD_ONLY_MARKERS.has(k) || BLOOD_BIOCHEM_MARKERS.has(k) || isBloodOnlyUnit(t.unit)) {
      bloodCount.set(p, (bloodCount.get(p) ?? 0) + 1);
    }
  }
  const pages = new Set();
  for (const [p, n] of urineCount) {
    if (n >= 2 && !(bloodCount.get(p) > 0)) pages.add(p);
  }
  return pages;
}

// ═══ بازبینیِ LIS ۲۰۲۶-۱۰-۰۶ (باگِ ۵، N25): نوارِ ادرار روی برگهٔ ترکیبیِ CBC + ادرار ═══
// 🔴 detectUrineOnlyPages با هر شاهدِ CBC دست می‌کشد، پس «Blood 3+»، «Protein 1+»، «Glucose 3+» ِ همان صفحه unmapped می‌شدند
//    (۱۹/۱۸/۴ درخواست) و قاعده‌های هماچوری/پروتئینوری/گلوکزوری هرگز آن‌ها را نمی‌دیدند. «Leuko estr» (املای LIS) در هیچ فهرستی نبود.
//    هویتِ ردیف = (صفحه، نام، *شکلِ مقدار*): نوارِ ادرار فقط با فهرستِ بستهٔ نوار پاسخ می‌دهد («negative»، «Trace»، «1+»…)؛
//    سرم هرگز «3+» نیست. پس روی صفحه‌ای با دستِ‌کم دو نشانگرِ قویِ نوار (وزنِ مخصوص، نیتریت، استراز، اوروبیلینوژن)
//    ردیفِ مبهم با مقدارِ نواری ادراری است؛ عدد («Glucose 95») همان سرم می‌ماند — حدس نمی‌زنیم.
const LE_KEY_RE = /^(urine)?leu[ck]o(cytes?)?(esterase|estr|est|ester|esterasa)$|^لکوسیتاستراز$/;
const isLeKey = (k) => LE_KEY_RE.test(k);
const isDipstickStrongKey = (name, k) =>
  isSgKey(name) || k === "nitrite" || k === "nitrites" || isLeKey(k) || /^(urine)?urobilinogen$/.test(k);
// کلیدِ مبهمِ صفحه ⇒ نامِ ادراری‌ای که خواننده‌ها با آن جست‌وجو می‌کنند (urinePositive(e, /urine\s*blood/)، …).
const DIPSTICK_AMBIG_NAME = {
  blood: "Urine Blood", hb: "Urine Blood", hgb: "Urine Blood",
  protein: "Urine Protein", glucose: "Urine Glucose", bilirubin: "Urine Bilirubin", ketone: "Urine Ketone",
};
// فهرستِ بستهٔ مقدارِ نوار (N6): کلِ مقدار، نه زیررشته. «small/moderate/large» مقیاسِ نوارِ خون است.
const DIPSTICK_VALUE_RE = /^(neg|negative|منفی|nil|trace|رگه|\+\s*\/\s*-|±|[1-4]\s*\+|\+\s*[1-4]|\+{1,4}|pos|positive|مثبت|small|moderate|large)$/i;
const isPlainNumber = (v) => /^\s*[\d۰-۹٠-٩]+(?:[.,٫][\d۰-۹٠-٩]+)?\s*$/.test(String(v ?? ""));
/**
 * پسوندِ هویتِ ادغام برای mergePages (N25): «Glucose 106» (بیوشیمی) و «Glucose Negative» (ادرار) روی یک صفحه دو ردیف‌اند،
 * نه تکرار. پیش‌تر هم‌نام بودند، دومی «تکراری» دور ریخته می‌شد و هشدارِ «دو مقدارِ متفاوت» به بیمار می‌رسید.
 * فقط برای کلیدِ مبهم؛ سرتیتر اگر هست، وگرنه شکلِ مقدار (نواری / غیرِ آن).
 */
export function mergeIdentityTag(name, value, section) {
  const k = norm(name);
  const sk = sectionKind(section);
  // P111 (بازبینیِ ۲۰۲۶-۱۰-۲۰): صفحهٔ دومی که هم‌زمان ادرار و مدفوع دارد، «Color»، «WBC /hpf» و «RBC /hpf»
  //   را دو بار چاپ می‌کند. بی‌پسوندِ بخش، این دو یکی شمرده می‌شدند و موتور پیامِ «در صفحهٔ ۲ و ۲ با مقادیرِ
  //   متفاوت خوانده شد (Yellow و Brown)» می‌ساخت و رنگِ مدفوع را به ادرار نسبت می‌داد (N25).
  if (sk === "stool") return ":stool";
  if (!AMBIGUOUS_URINE_KEYS.has(k)) return "";
  if (sk) return `:${sk}`;
  return DIPSTICK_VALUE_RE.test(String(value ?? "").trim()) ? ":strip" : "";
}
/** «صفحه|کلید»ِ کلیدهای مبهمی که روی همان صفحه یک ردیف با مقدارِ نواری («Negative»، «2+») دارند. */
function detectStripTwins(ocrTests) {
  const out = new Set();
  for (const t of ocrTests) {
    if (!t?.name) continue;
    const k = norm(t.name);
    if (AMBIGUOUS_URINE_KEYS.has(k) && DIPSTICK_VALUE_RE.test(String(t.value ?? "").trim())) out.add(`${t._page ?? 0}|${k}`);
  }
  return out;
}
// ردیف‌های میکروسکوپیِ بی‌واحد که فقط روی برگهٔ ادرار می‌آیند و qual برایشان بس است (خواننده ندارند ⇒ unreadQualRows نامشان را می‌برد).
const URINE_MICRO_ONLY_RE = /^(yeasts?(pseudo|cells?)?|mycelium|mycelia|pseudohyphae|hyphae|mucus|mucous|mucousthreads?|مخمر|موکوس)$/;
function detectDipstickPages(ocrTests) {
  const count = new Map();
  for (const t of ocrTests) {
    if (!t?.name) continue;
    if (isDipstickStrongKey(t.name, norm(t.name))) count.set(t._page ?? 0, (count.get(t._page ?? 0) ?? 0) + 1);
  }
  return new Set([...count].filter(([, n]) => n >= 2).map(([p]) => p));
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

// P107i (بازبین، ردیف ۱۹): HCO3 در بیوشیمیِ معمولیِ سرم هم چاپ می‌شود و تنهایی شاهدِ گازِ خون نیست. صفحه‌ای که از نشانگرهای گاز خون فقط
//   HCO3/بی‌کربنات دارد «فقط‌بی‌کربنات» است: pH در آن فقط وقتی خون خوانده می‌شود که با آن هم‌جهت باشد (اسیدمی ⇒ HCO3 پایین، قلیایی ⇒
//   HCO3 بالا)، یا pH در ۷٫۳۵–۷٫۴۵ باشد. pH ناهم‌جهت (مثلاً ۷٫۰ با HCO3 ۲۵) pH ادرار می‌ماند. با pCO2/pO2/BE… یا سرتیترِ «خون» همان خوانش قبلی.
const HCO3_ONLY_KEYS = new Set(["hco3", "bicarbonate"]);
function detectHco3OnlyPages(ocrTests) {
  const hco3 = new Map(); const full = new Set();
  for (const t of ocrTests) {
    if (!t?.name) continue;
    const k = norm(t.name), p = t._page ?? 0;
    if (HCO3_ONLY_KEYS.has(k)) { const v = toNum(t.value); if (v != null || !hco3.has(p)) hco3.set(p, v); }   // P107j: ردیفِ HCO3ِ خالی/غیرعددی هم صفحه را «فقط‌بی‌کربنات» می‌کند
    else if (ABG_MARKERS.has(k)) full.add(p);
  }
  for (const p of full) hco3.delete(p);
  return hco3;
}
// P107j: قاعدهٔ جهتیِ ۲۲/۲۸ حذف شد — از روی pH و HCO3 نمی‌شود خون را از ادرار جدا کرد (اسیدوزِ تنفسیِ حاد HCO3 نرمال دارد؛ ادرارِ قلیایی/CKD
//   کنارِ HCO3 پایین می‌نشیند). pHِ بیرون از ۷٫۳۵–۷٫۴۵ در چنین صفحه‌ای نه خون است نه ادرار ⇒ `ambiguousPh` و یافتهٔ صریحِ ph_type_ambiguous.

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
  /^hbsab|^hepatitisbsurfaceantibody|^hbcab|^hbcantibody|^hepatitisbcore/,   // 2026-10-03: HBsAb/HBcAb — پیش از این به qual نمی‌رسیدند
  /^aso|^antistreptolysin/,
  /^bhydroxybutyrate|^βhydroxybutyrate/,
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

// ---------- جای‌نگهدارِ دستگاه ----------
// job fff90f58 (E2، P58): «---.-» یعنی دستگاه آن شمارش را نداد — خالی نیست ولی عدد هم نیست. server.js فقط برای
//   مقدارِ خالی هشدارِ «خوانا نبود» می‌ساخت و این‌جا ردیف به qual می‌رفت که هیچ قاعده‌ای NEUT% را آن‌جا نمی‌خواند (N25:
//   کانالِ بی‌خواننده). یک قاعده برای هر دو فایل (N3: «دو تابع که یک عدد را می‌خوانند یک قاعده دارند»).
//   ⚠️ «-»، «--» و «---» عمداً جای‌نگهدار نیستند — روی نوارِ ادرار «منفی»‌اند (N6). فقط با نقطه/ستاره یا ≥۴ خط‌تیره.
export function isPlaceholderValue(v) {
  if (v == null) return false;
  const s = String(v).replace(/\s/g, "");
  if (!/^[-–—_*.]+$/.test(s) || !/[-–—_*]/.test(s)) return false;
  return /[.*]/.test(s) || s.length >= 4;
}

// ---------- تبدیل عدد ----------
// ارقام فارسی/عربی و ممیز عربی را اول به لاتین تبدیل می‌کنیم؛ سپس فقط رقم/نقطه/علامت می‌مانَد.
//
// 🔴 کاما (بازبینیِ specs/003؛ HEAD هم همین بود): هر کاما جداکنندهٔ هزارگان حساب می‌شد، پس برگه‌ای که
//    ممیز را کاما می‌نویسد «K 5,5» → ۵۵ (هیپرکالمیِ کشنده، اورژانسِ کاذب) و «Creatinine 1,2» → ۱۲ می‌گرفت.
//    حالا همان قاعدهٔ parseReference در units.js: کاما فقط وقتی هزارگان است که پیش از گروه‌های دقیقاً
//    سه‌رقمی بیاید و عدد با صفر شروع نشود («250,000»، «1,250,000»)؛ با نقطه در عدد، کاما هزارگان است
//    («1,234.5»)؛ یک کامای دیگر ممیز است («5,5»، «0,500»)؛ هر شکلِ دیگر («5,5,5») مبهم ⇒ null، نه حدس.
//    ⚠️ ابهامِ باقی‌مانده: «1,200» همیشه ۱۲۰۰ خوانده می‌شود، حتی اگر منظور ۱٫۲۰۰ بوده باشد. P86: وقتی ۱۲۰۰ برای آن کلید
//    ناممکن است، ردیف «تفسیر نشدند» می‌شود (ambiguousThousands، پایین)؛ وقتی ممکن است (AST، TG، قند) همان ۱۲۰۰ می‌ماند.
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
function commaToDot(s) {
  const run = s.match(/[\d.,]*\d/)?.[0] ?? "";
  if (!run.includes(",")) return s;
  if (run.includes(".") || /^[1-9]\d{0,2}(,\d{3})+$/.test(run)) return s.replace(/,/g, "");
  if (/^\d+,\d+$/.test(run)) return s.replace(",", ".");
  return null;
}
// P86: «1,200» (یک گروهِ سه‌رقمی، بی‌نقطه) دو خوانش دارد: ۱۲۰۰ یا ۱٫۲. commaToDot هزارگان می‌گیرد؛ این فقط می‌گوید ابهام بوده
//    تا اگر خوانشِ هزارگان برای آن کلید ناممکن است (سقفِ SURVIVAL_LIMITS)، ردیف «تفسیر نشدند» شود — نه حدسِ اعشار (N3).
// سقفِ «خواندنی» فقط برای کامای مبهم، برای کلیدهایی که در SURVIVAL_LIMITS نیستند و ۱۰۰۰+ با هیچ بدنی جور نیست. عمداً بسیار گشاد
//    (INR ۱۰۰، ثانیه‌های انعقاد ۵۰۰) و روی هیچ عددِ بی‌کاما اثر ندارد. MEDICAL_RULES P86 — منتظرِ بازبین.
const AMBIG_CEILING = { INR: 100, HCO3: 100, LACTATE: 100, PT: 500, APTT: 500, TT: 500 };
export function ambiguousThousands(v) {
  const s = String(v ?? "").replace(/[۰-۹]/g, (d) => FA_DIGITS.indexOf(d)).replace(/[٠-٩]/g, (d) => AR_DIGITS.indexOf(d)).replace(/٬/g, ",");
  return /^[1-9]\d{0,2},\d{3}$/.test(s.match(/[\d.,]*\d/)?.[0] ?? "");
}
// مقدارِ سانسورشده («<6»، «>1000») — N5/N6 (لایهٔ ۲). toNum علامتِ < را دور می‌ریخت: «CRP <6 mg/L» (حدِ بالای ۵) ⇒ «CRP شما 6 است … بالاست»
//    و «CRP <6» بی‌واحد ⇒ «واحد نامعلوم، خارج از محدوده». «<x» فقط می‌گوید مقدار زیرِ x است: وقتی x از حدِ بالای مرجع بیشتر باشد (یا از
//    حدِ پایین، اگر حدِ پایین > ۰)، طبیعی یا غیرطبیعی بودنش معلوم نیست؛ «>x» وقتی x کمتر از حدِ بالا باشد. نامعلوم ⇒ «تفسیر نشدند»
//    (unmapped)، نه عددِ ساختگی. فقط وقتی واحدِ ردیف خالی یا همان واحدِ موتور است (مقایسه با بازهٔ متعارف فقط آن‌وقت معنا دارد).
function censoredIndeterminate(engineKey, t, v, ocr) {
  const cm = String(t.value ?? "").trim().match(/^(<|≤|>|≥|کمتر\s*از|بیشتر\s*از)/);
  if (!cm || v == null) return false;
  // واحدِ چاپ‌شده‌ای که تبدیل نمی‌خواهد (TSH «mIU/L» = «µU/mL») هم مقایسه با بازهٔ موتور را معنادار می‌کند؛ فقط واحدی که تبدیل می‌شود (SI) کنار می‌رود.
  const pu = String(t.unit ?? "").trim();
  if (pu && toConventional(engineKey, v, t.unit).converted) return false;
  const ref = getRef(engineKey, inferSex(ocr), inferAge(ocr) ?? 40);
  if (!Array.isArray(ref)) return false;
  const less = /^(<|≤|کمتر)/.test(cm[1]);
  return less ? (v > ref[1] || (ref[0] > 0 && v > ref[0])) : v < ref[1];
}
const SEX_UNKNOWN_OWN_POLICY = new Set(["CREAT", "PRL", "U_CA"]);   // M11 (P106)
// M24 (P106): صدکِ ۹۹ِ hs-cTnT = ۱۴ ng/L = ۰٫۰۱۴ µg/L (Roche Elecsys hs-TnT؛ Fourth Universal Definition of MI، ۲۰۱۸).
export const TNT_HS_99TH_UGL = 0.014;

function toNum(v) {
  if (v == null) return null;
  const pre = commaToDot(String(v)
    .replace(/[۰-۹]/g, (d) => FA_DIGITS.indexOf(d))
    .replace(/[٠-٩]/g, (d) => AR_DIGITS.indexOf(d))
    .replace(/٬/g, ",")           // جداکنندهٔ هزارگانِ عربی → کاما (همان قاعدهٔ بالا)
    .replace(/٫/g, "."));         // ممیز عربی → نقطه
  if (pre == null) return null;
  // بازبینیِ medium ۲۰۲۶-۱۰-۱۳ (M23، N3): واحدِ رقم‌دار در خودِ مقدار («7500 /mm3»، «7.5 x10^3/uL»، «90 mL/min/1.73m2») رقمش را
  //   به عدد می‌چسباند ⇒ «75003» / «7.5103»، و WBCِ طبیعی اورژانسِ لکوسیتوز می‌شد. فقط عددِ ابتدایی خوانده می‌شود، و فقط وقتی دنباله
  //   واقعاً واحد است و رقم دارد؛ تیتر («1/160»)، بازه («8-10»)، درجه («1+») و پرچم («11.2 H.») رفتارِ قبلی را دارند.
  const lead = pre.match(/^\s*[<>≤≥]?\s*([+\-]?\d+(?:\.\d+)?)\s*(\S.*)$/);
  if (lead && /\d/.test(lead[2]) && /^(\/\s*[a-zµμ]|[a-zµμ×*%]|10\s*[\^*eE])/i.test(lead[2])) return Number(lead[1]);
  const s = pre.replace(/[^\d.\-+]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// ---------- استنتاج جنسیت ----------
// از فیلد patient، یا از محدوده‌ی مرجع خود برگه (Hb 12-16 → زن)
export function inferSex(ocr) {
  const p = ocr?.patient;
  if (p?.sex) {
    const s = String(p.sex).toLowerCase();
    // ⚠️ ترتیب و مرز کلمه مهم است: "female" شامل "male" است.
    //    اول female/زن را چک کن، و از مرز کلمه استفاده کن.
    if (s.includes("زن") || /\bfemale\b/.test(s) || s === "f") return "F";
    if (s.includes("مرد") || /\bmale\b/.test(s) || s === "m") return "M";
    // P110-ب (تصمیمِ کاربر ۲۰۲۶-۱۰-۱۶): OCR جنس را از عنوانِ پیش از نام می‌گیرد؛ اگر خودِ عنوان را برگرداند (نه «مرد/زن»)، همان خوانده می‌شود.
    //   Mrs/Ms/Miss پیش از Mr (Mrs با Mr شروع می‌شود).
    if (/^\s*(خانم|بانو)/.test(s) || /^\s*(mrs|ms|miss)\.?(\s|$)/.test(s)) return "F";
    if (/^\s*(آقای|آقا)/.test(s) || /^\s*mr\.?(\s|$)/.test(s)) return "M";
  }
  // از محدوده‌ی Hb روی برگه
  // ⚠️ فقط برای بزرگسالان معتبر است. در کودکان محدوده‌ی Hb متفاوت است
  //    (مثلاً ۶ ساله: ~۱۱.۵–۱۳.۵) و این مرزها جنسیت را غلط می‌سازند،
  //    که بعد باعث اعمال مرجع بزرگسال (MCV، فریتین) روی کودک می‌شود.
  const age = inferAge(ocr);
  if (age != null && age < 12) return null;
  for (const t of ocr?.tests || []) {
    if (NAME_MAP[norm(t.name)] !== "HGB" || !t.reference) continue;
    // رقم فارسی/عربی و «٫» در محدودهٔ چاپی هم خوانده می‌شود (N34)، وگرنه «۱۳٫۵-۱۷٫۵» جنسیت را نامعلوم می‌گذاشت.
    const refText = String(t.reference)
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
      .replace(/[٫،]/g, ".");
    const m = refText.match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
    if (!m) continue;
    const lo = Number(m[1]);
    if (lo >= 13.5) return "M";
    if (lo <= 12.5) return "F";
  }
  return null;
}

// ---------- استنتاج سن (سال) ----------
export function inferAge(ocr) {
  const raw = ocr?.patient?.age;
  // ⚠️ سنِ ۰ (نوزاد) سنِ معلوم است، نه «نامعلوم». `!raw` صفر را هم دور می‌انداخت و بیلی‌روبینِ نوزاد با
  //    بازهٔ بزرگسال سنجیده و واحدش از آن تعیین می‌شد (specs/003، بازبینیِ پزشکی B1) — N4.
  if (raw == null || String(raw).trim() === "") return null;
  // 🔴 بازبینی B10: رقمِ فارسی/عربی خوانده نمی‌شد («۳ روزه» ⇒ سنِ نامعلوم)، و ساعت/هفته نبود («48 h» ⇒ ۴۸ سال،
  //    «2 weeks» ⇒ ۲ سال) — بیلی‌روبینِ نوزاد از همین سن فوریت می‌گیرد، پس هر دو به «در نوبتِ عادی» می‌رسید.
  const s = String(raw)
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  // 🔴 بازبینی B12: سنِ چندبخشی («۳ ماه و ۲ هفته»، «1 y 2 w») جمع می‌شود. «اولین بخش برنده» بخشِ کوچک را به‌تنهایی
  //    می‌خواند ⇒ شیرخوار نوزاد شمرده می‌شد و همهٔ برگه با بازه‌های نوزادی سنجیده می‌شد.
  //    هر الگو عدد را فقط وقتی می‌گیرد که واحد بلافاصله پس از آن بیاید، پس یک عدد دو بار شمرده نمی‌شود.
  const PARTS = [
    [/([\d.]+)\s*(?:سال|year|yr|y)/gi, 1],
    [/([\d.]+)\s*(?:ماه|month|mths?|mo)/gi, 1 / 12],
    [/([\d.]+)\s*(?:هفته|weeks?|wks?|w)(?![a-z])/gi, 7 / 365],
    [/([\d.]+)\s*(?:روز|day|d)/gi, 1 / 365],
    [/([\d.]+)\s*(?:ساعت|hours?|hrs?|h)(?![a-z])/gi, 1 / 8760],
  ];
  // بازبینیِ medium (M20): «4 M» ماه است یا مرد؟ — حدس نمی‌زنیم (سنِ نامعلوم، نه ۴ سال). و عددِ > ۱۲۰ سن نیست (سالِ تولد «1990»/«1370»
  //   یا خطای OCR)؛ پیش‌تر سنِ ۱۹۹۰ کراتینینِ ۱٫۱ را «نارساییِ کلیه، اورژانس» می‌کرد.
  if (/^\s*[\d.]+\s*M\s*$/i.test(s)) return null;
  let total = 0, hit = false;
  for (const [re, f] of PARTS) for (const p of s.matchAll(re)) { total += Number(p[1]) * f; hit = true; }
  const m = s.match(/([\d.]+)/);
  const age = hit ? total : m ? Number(m[1]) : null;
  return age != null && Number.isFinite(age) && age <= 120 ? age : null;
}

/**
 * OCR → مقادیر آماده برای موتور
 */
// ═══ بازبینیِ LIS ۲۰۲۶-۱۰-۰۵ (باگِ ۱، N3/N31): افتراقیِ بی‌واحدِ < ۲۰ درصد است یا شمارشِ مطلق؟ — تصمیم در سطحِ برگه ═══
// 🔴 قاعدهٔ ردیفی («بی‌واحد، بی‌٪، < ۲۰ ⇒ مطلق ×۱۰۰۰»، برای Sysmex «NEUT 4.31») روی خروجیِ LIS که درصد را بی‌واحد می‌دهد
//    یک CBCِ کاملاً طبیعی را «مونوسیت ۷۰۰۰، ائوزینوفیل ۲۵۰۰، بازوفیل ۵۰۰» کرد (۶۸ درخواست، CLL ِ کاذب، «مونوسیت ۹۳۰۰ = ۲۲۱٪ِ WBC»).
//    خودِ برگه جواب را دارد، بی‌حدسِ بزرگی: (الف) درصدهای یک افتراقی جمعشان ≈ ۱۰۰ است (Mixed/MID هم جزوِ آن)؛ (ب) شمارش‌های مطلق
//    از WBC بیشتر نمی‌شوند. هر کدام برقرار باشد ⇒ ردیف‌های بی‌واحدِ < ۲۰ درصدند. ردیفی که کلیدش ردیفِ دیگری هم دارد («NEUT%» کنارِ
//    «NEUT») دوقلوی مطلق است و نه کاندیدا است نه در جمع. بی‌هیچ‌کدام از دو شاهد ⇒ رفتارِ قبلی (Sysmex).
const DIFF_PCT_KEYS = new Set(["NEUT_PCT", "LYMPH_PCT", "MONO_PCT", "EOS_PCT", "BASO_PCT", "BAND_PCT"]);
const DIFF_MIXED_RE = /^(mixed|mxd|mid|mixedcells?|midcells?)(count|percent|pct)?$/;
const DIFF_ABS_UNIT_RE = /10\^?3|10\*3|10³|10e3|k\/|\/ul|\/µl|\/μl|\/mm3|\/mm³|cells|cumm/i;
function unitlessDiffIsPercent(rows) {
  const perKey = new Map();
  const cands = [];
  let pctSum = 0, pctRows = 0;
  const wbcs = [];
  for (const t of rows) {
    if (!t?.name) continue;
    const n = norm(t.name);
    const k = mapKey(n);
    const v = toNum(t.value);
    if (v == null) continue;
    const u = String(t.unit ?? "").trim();
    if (k === "WBC") { wbcs.push(v >= 1000 ? v / 1000 : v); continue; }
    if (DIFF_MIXED_RE.test(n) && !DIFF_ABS_UNIT_RE.test(u)) { pctSum += v; pctRows++; continue; }
    if (!DIFF_PCT_KEYS.has(k) || String(t.name).includes("#") || DIFF_ABS_UNIT_RE.test(u)) continue;
    perKey.set(k, (perKey.get(k) || 0) + 1);
    if (String(t.name).includes("%") || u.includes("%") || v >= 20) { pctSum += v; pctRows++; }
    else cands.push({ k, v });
  }
  const live = cands.filter((c) => perKey.get(c.k) === 1);
  if (!live.length) return false;
  const candSum = live.reduce((s, c) => s + c.v, 0);
  const total = pctSum + candSum;
  const wbcK = wbcs.length && wbcs.every((w) => Math.abs(w - wbcs[0]) < 1e-9) ? wbcs[0] : null;
  // (الف) جمعِ ≈ ۱۰۰ — مگر WBC خودش نزدیکِ ۱۰۰ باشد (آن‌جا مطلق‌ها هم جمعشان ≈ ۱۰۰ است)
  if (pctRows + live.length >= 2 && total >= 85 && total <= 115 && !(wbcK != null && wbcK >= 80)) return true;
  // (ب) مطلق‌ها نمی‌توانند از WBC بیشتر شوند
  if (wbcK != null && wbcK > 0 && candSum > wbcK * 1.1) return true;
  return false;
}

// ═══ بازبینیِ LIS ۲۰۲۶-۱۰-۰۵ (باگِ ۲، N25): دو ردیفِ WBC (یا RBC) روی یک صفحه — کدام مالِ ادرار است؟ ═══
// 🔴 برگهٔ ترکیبیِ CBC + ادرار: «WBC 68»ِ بی‌واحدِ میکروسکوپیِ ادرار عدد است (بازه نیست)، پس به کلیدِ WBCِ خون می‌رسید و چون آخرین
//    مقدار برنده بود، WBCِ 7.8 ِ CBC را پاک می‌کرد ⇒ `extreme_leukocytosis` اورژانسِ کاذب و نوتروفیلِ ۵۲٬۲۲۴ (درخواستِ [129]).
//    هویتِ ردیف = (زمینه، نام)، نه نام: ردیفی که همسایهٔ بلافصلش (همان صفحه) ردیفِ فقط‌ادراری است یا مقدارِ میکروسکوپیِ ادرار دارد
//    («20-25»، «Few») ادراری است ⇒ لایهٔ ۱ (/hpf). فقط وقتی برخی — نه همه — چنین همسایه‌ای دارند؛ وگرنه نمی‌دانیم کدام خون است ⇒
//    هیچ‌کدام سنجیده نمی‌شود («تفسیر نشدند»)، نه حدس. ردیفِ تنها دست نمی‌خورد.
const CELL_TWIN_KEYS = new Set(["WBC", "RBC"]);
const CBC_NEIGHBOUR_KEYS = new Set(["HGB", "HCT", "MCV", "MCH", "MCHC", "PLT", "RDW_CV", "RDW_SD", "MPV", "PDW",
  "NEUT_PCT", "LYMPH_PCT", "MONO_PCT", "EOS_PCT", "BASO_PCT", "BAND_PCT", "NEUT_ABS", "LYMPH_ABS", "MONO_ABS", "EOS_ABS", "BASO_ABS"]);
const URINE_MICRO_VALUE_RE = /^\s*(\d+(\.\d+)?\s*[-–]\s*\d+(\.\d+)?|few|many|moderate|rare|occasional|plenty|loaded|full\s*field|نادر|کم|زیاد|فراوان)\s*$/i;
function cellTwinRoutes(rows) {
  const routes = new Map();
  const groups = new Map();
  rows.forEach((t, i) => {
    if (!t?.name) return;
    const k = mapKey(norm(t.name));
    if (!CELL_TWIN_KEYS.has(k) || /[hl]pf/i.test(String(t.unit ?? ""))) return;
    // «1-2»/«Few» عدد نیستند و همین حالا به qual (ادرار) می‌روند — فقط عددِ تنها می‌تواند جای WBC/RBCِ خون بنشیند.
    if (toNum(t.value) == null || URINE_MICRO_VALUE_RE.test(String(t.value ?? ""))) return;
    const g = `${t._page ?? 0}|${k}`;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(i);
  });
  // ردیفِ مرزِ دو بخش (اولین ردیفِ CBC کنارِ آخرین ردیفِ ادرار) هر دو جور همسایه دارد ⇒ امتیاز نسبی، نه «همسایهٔ ادراری دارد؟».
  const score = (i) => {
    let urine = 0, blood = 0;
    for (const j of [i - 1, i + 1]) {
      const n = rows[j];
      if (!n?.name || (n._page ?? 0) !== (rows[i]._page ?? 0)) continue;
      const nn = norm(n.name);
      if (URINE_ONLY_MARKERS.has(nn) || URINE_MICRO_VALUE_RE.test(String(n.value ?? ""))) urine++;
      else if (BLOOD_ONLY_MARKERS.has(nn) || DIFF_MIXED_RE.test(nn) || CBC_NEIGHBOUR_KEYS.has(mapKey(nn))) blood++;
    }
    return { urine, net: urine - blood };
  };
  for (const idx of groups.values()) {
    if (idx.length < 2) continue;
    if (new Set(idx.map((i) => String(rows[i].value ?? "").trim())).size < 2) continue;   // همان مقدار ⇒ تعارضی نیست
    const s = idx.map((i) => ({ i, ...score(i) }));
    // رتبه: اول امتیازِ خالص، بعد شمارِ همسایهٔ ادراری (ردیفِ CBC ِ بی‌همسایه در برابرِ ردیفِ مرزیِ ادرار).
    const rank = (x) => x.net * 10 + x.urine;
    const top = Math.max(...s.map(rank));
    const best = s.filter((x) => rank(x) === top);
    // ادراری = تنها ردیفِ بیشترین امتیاز، با دستِ‌کم یک همسایهٔ ادراری. بقیه (اگر هنوز بیش از یک مقدار دارند) نامعلوم‌اند.
    if (best.length === 1 && best[0].urine > 0) {
      routes.set(rows[best[0].i], "urine");
      const rest = idx.filter((i) => i !== best[0].i);
      if (new Set(rest.map((i) => String(rows[i].value ?? "").trim())).size > 1) rest.forEach((i) => routes.set(rows[i], "conflict"));
    } else idx.forEach((i) => routes.set(rows[i], "conflict"));
  }
  return routes;
}

// ═══ بازبینیِ LIS ۲۰۲۶-۱۰-۰۵ (باگِ ۳، P89 — تصمیمِ کاربر): واحدِ Hbِ بی‌واحد از سازگاریِ درونیِ همان CBC ═══
// 🔴 خروجیِ LIS ستونِ واحد ندارد ⇒ Hb در ۱۶۹ از ۱۶۹ درخواست `unit_unknown` می‌شد؛ ۲۴ بیمارِ میکروسیتیک بی‌یافتهٔ کم‌خونی/تالاسمی ماندند.
//    دستگاه MCHC و MCH را *از خودِ Hb* حساب می‌کند: MCHC = Hb(g/dL) ÷ Hct(%) × ۱۰۰، MCH = Hb(g/dL) ÷ RBC(10⁶/µL) × ۱۰. پس
//    MCHC/MCHِ چاپ‌شدهٔ همان برگه واحدِ Hb را بی‌حدسِ بزرگی تعیین می‌کند (g/dL و g/L ده برابر فاصله دارند). شرط‌ها:
//    • هر رابطه‌ای که روی برگه هست باید برقرار باشد (±۱۵٪) و دقیقاً یک سیستم پاسخ دهد؛
//    • شاخصِ ناممکن شاهد نیست (MCHC بیرون از ۲۲–۴۲ g/dL، MCH بیرون از ۱۲–۴۵ pg): «Hb = RBC»ِ خطای ورود با MCHC 12 ([3]) تأیید نمی‌شود؛
//    • فقط وقتی decideUnit (واحدِ چاپ‌شده یا محدودهٔ مرجع) چیزی تعیین نکرد.
const HGB_INDEX_TOLERANCE = 0.15;
const MCHC_TRUSTED = MCHC_PLAUSIBLE_GDL, MCH_TRUSTED = MCH_PLAUSIBLE_PG;
function hgbSystemFromIndices(rows) {
  const first = {};
  for (const t of rows) {
    if (!t?.name) continue;
    const k = mapKey(norm(t.name));
    if (!["HGB", "HCT", "MCHC", "MCH", "RBC"].includes(k) || first[k] != null) continue;
    if (/[hl]pf/i.test(String(t.unit ?? ""))) continue;
    const v = toNum(t.value);
    if (v != null && v > 0 && /^\s*[\d.,]+\s*$/.test(String(t.value))) first[k] = v;
  }
  const hb = first.HGB;
  if (hb == null) return null;
  const ids = [];
  if (first.HCT != null && first.MCHC != null) {
    const hct = first.HCT <= 1 ? first.HCT * 100 : first.HCT;
    const mchc = first.MCHC > 100 ? first.MCHC / 10 : first.MCHC;
    if (mchc >= MCHC_TRUSTED[0] && mchc <= MCHC_TRUSTED[1] && hct >= 5 && hct <= 80) ids.push((gdl) => (gdl / hct) * 100 / mchc);
  }
  if (first.RBC != null && first.MCH != null) {
    const rbc = first.RBC >= 100 ? first.RBC / 1e6 : first.RBC;
    if (first.MCH >= MCH_TRUSTED[0] && first.MCH <= MCH_TRUSTED[1] && rbc >= 0.5 && rbc <= 10) ids.push((gdl) => (gdl / rbc) * 10 / first.MCH);
  }
  if (!ids.length) return null;
  const ok = UNIT_PROFILE.HGB.systems.filter((s) => ids.every((f) => Math.abs(f(hb * s.factor) - 1) <= HGB_INDEX_TOLERANCE));
  return ok.length === 1 ? ok[0] : null;
}

/** واحدِ شمارشِ خام (/µL، /mm³، cells، cumm) بدونِ هیچ نشانهٔ 10³/10⁶. */
function rawCountUnit(unit) {
  const u = String(unit || "").toLowerCase().replace(/\s+/g, "");
  // «x1000/mm³» و «Mill/mm³» (برگهٔ واقعی job 40b8a901) ضریب دارند، پس خام نیستند.
  return /(\/ul|\/µl|\/μl|\/mm3|\/mm³|cells|cumm|\/cmm)/.test(u) &&
    // 🔴 بازبینیِ کد (P84، H1): «x10E3/uL» (املای رایجِ دستگاه) ضریب است، نه خام — بی‌این، پلاکتِ ۱۵ unmapped می‌شد.
    !/(10\^?\d|10\*\d|10e\d|10[³⁶⁹]|1000|k\/|m\/|mill|thou|lac|lakh)/.test(u);
}

/**
 * مرزِ «ممکن» برای کلیدهایی که SURVIVAL_LIMITS ندارند ولی ردیفِ جابه‌جا/اعشارِ افتاده رویشان اورژانسِ کاذب می‌سازد
 * (بازبینیِ متامورفیک ۲۰۲۶-۱۰-۰۵). فقط «این عدد را نمی‌شود خواند» است، نه حکمِ بالینی؛ عمداً گشاد (N3: مرزِ تنگ
 * اورژانسِ واقعی را می‌خورد). ثبت: MEDICAL_RULES.md P84 — منتظرِ بازبین. HCT از HGB × ۳ مشتق است، نه عددِ تازه.
 */
// ⚠️ فهرستِ بسته، نه همهٔ SURVIVAL_LIMITS: آن جدول برای «کدام خوانشِ واحدِ نانوشته ممکن است» ساخته شد و برای چند کلید
//    (مثلاً FOLATE ۴۰) از مقدارِ واقعیِ مکمل‌خور تنگ‌تر است (M149) — اینجا فقط کلیدهایی‌اند که عددِ ناممکنشان اورژانسِ کاذب می‌ساخت.
const EXTRA_POSSIBLE = { K: [0.5, 20], NA: [80, 300], CL: [40, 200] };
const POSSIBLE_GATED = new Set(["K", "NA", "CL", "HCT", "HGB", "MG", "PHOS", "CA", "CREAT", "URIC", "ALB"]);
function possibleValue(key, v) {
  // درصدِ بالای ۱۰۰ تعریفاً ناممکن است (نه عددِ بالینی): «HbA2 1,125» ⇒ ۱۱۲۵٪ ⇒ «hba2_elevated» می‌شد.
  if (getUnit(key) === "%" && v > 100) return false;
  if (!POSSIBLE_GATED.has(key)) return true;
  // 🔴 بازبینیِ کد (P84، H3؛ N23): فقط سقف. کفِ SURVIVAL_LIMITS برای «کدام خوانشِ واحد ممکن است» ساخته شد و داخلِ بازهٔ
  //    بحرانیِ واقعی است — «فسفر 0.4»، «Hb 1.8»، «Mg 0.45» (واحدِ چاپ‌شده) اورژانس/this_week بودند و unmapped شدند.
  //    تنها کف، HCT است: همان کفِ مشتقِ crisisArm (HGB × ۳، M182b) تا «HCT 2» از «HCT 8»ِ اورژانسی «نوبتِ عادی» نگیرد.
  const lim = key === "HCT" ? [SURVIVAL_LIMITS.HGB[0] * 3, SURVIVAL_LIMITS.HGB[1] * 3]
    : (SURVIVAL_LIMITS[key] ?? EXTRA_POSSIBLE[key]);
  return !lim || (v <= lim[1] && (key !== "HCT" || v >= lim[0]));
}

// فوترِ چاپیِ دستگاه/امضا («Analysed by flowcytometric sysmex X series cell counter»، «Reported by …») آزمایش نیست؛ unmapped نمی‌شود.
const DEVICE_FOOTER_RE = /^\s*(?:analy[sz]ed|reported|verified|validated|printed|checked|authori[sz]ed|approved)\s+by\b|\b(?:cell\s*counter|sysmex|flow\s*cytometr\w*)\b/i;
export function ocrToEngineInput(ocr) {
  ocr = splitHpfFromName(stripFootnotesFromNames(ocr));
  if (Array.isArray(ocr?.tests)) ocr = { ...ocr, tests: ocr.tests.filter((t) => !(t?.name && DEVICE_FOOTER_RE.test(String(t.name)) && !/\d/.test(String(t.value ?? "")) || (/^[-–—]+$/.test(String(t.value ?? "").trim()) && /^(?:c\.?b\.?c\.?|urine\s*analysis|urine\s*\(?\s*culture.*)$/i.test(String(t?.name ?? "").trim())))) };
  // ═══ دو ردیف، دو عدد، یک آزمایش (۲۰۲۶-۱۰-۰۶، تصمیمِ کاربر) ═══
  // 🔴 اندازه‌گیری‌شده: «Potassium 7.0» + «K 4.2» ⇒ K=4.2؛ اورژانسِ هیپرکالمی بی‌صدا گم می‌شد. هر نقطهٔ نوشتن «آخری برنده» بود
  //    و mergePages فقط نام‌های یکسان را می‌گرفت. این ردیاب همهٔ نوشتن‌های حلقهٔ اصلی را می‌بیند (یک گلوگاه، نه بیست ویرایش).
  //    پس از حلقه: عددی که دورتر از محدوده است سنجیده می‌شود (کفِ فوریت، N3)، بقیه «تفسیر نشدند» + هشدار. گارد VC1.
  const testsObj = {};
  let curRow = null;
  const writer = {};
  const candidates = {};
  const tests = new Proxy(testsObj, {
    set(o, k, v) {
      if (curRow && typeof k === "string" && !k.startsWith("_") && typeof v === "number") {
        if (writer[k] && writer[k] !== curRow && typeof o[k] === "number") {
          (candidates[k] ??= [{ name: writer[k].name, value: o[k] }]).push({ name: curRow.name, value: v });
        }
        writer[k] = curRow;
      }
      o[k] = v;
      return true;
    },
  });
  const qual = {};
  const unmapped = [];
  const rowNames = {};       // کلیدِ موتور ← نامِ چاپ‌شدهٔ اولین ردیف (برای unmappedِ عددِ ناممکن)
  const ambigComma = new Set();   // P86: کلیدهایی که مقدارشان «1,200»ِ مبهم بود
  // کلیدهای QUAL_NO_READER که روی برگه بودند — در runEngine به noRef می‌روند (specs/004).
  const noReader = [];
  // ═══ P111: یادداشتِ چاپیِ آزمایشگاه/پاتولوژیست («Comment») ═══
  //   پیش‌تر این ردیف یا unmapped می‌شد یا متنش گم می‌شد؛ روی برگهٔ واقعی جملهٔ «Minor thalassemia is suspected»
  //   و «persistent absolute lymphocytosis» در همین فیلد بود و به گزارش نرسید. عینِ متن نگه داشته می‌شود و
  //   قاعدهٔ lab_comment_note آن را بی‌هیچ ترجمه/حکمی نقل می‌کند (تفسیرِ آزمایشگاه ≠ تفسیرِ موتور).
  const labComments = [];

  const noReaderValues = {};   // متنِ خامِ همان کلیدها («Positive»، «منفی»، «25») — P49-ج
  const printedUnits = {};     // واحدِ چاپ‌شدهٔ UNIT_KEPT — P49-الف
  let ckmbUnitless = null;     // بند ۵: CK-MBِ بی‌واحد ⇒ ungraded (unit_unknown) در runEngine
  let diffMixed = null;        // بند ۵: ردیفِ Mixed/MXDِ افتراقیِ CBC ⇒ ungraded (diff_mixed) در runEngine
  // تبدیل‌های واحدِ انجام‌شده — برای شفافیت به بیمار و برای اشکال‌زدایی.
  // «۴۸ mmol/mol → ۶.۵٪» باید جایی دیده شود، وگرنه عددِ روی برگه با عددِ
  // تفسیر نمی‌خواند و بیمار حق دارد فکر کند اشتباه شده.
  const unitConversions = [];
  // کلیدهایی که ردیفشان چاپ شده ولی مقدارش ناخوانا بود (job c138671c، D1).
  const unreadableKeys = new Set();
  const urineOnlyPages = detectUrineOnlyPages(ocr?.tests || []);
  const stripTwinKeys = detectStripTwins(ocr?.tests || []);
  const abgPages = detectAbgPages(ocr?.tests || []);
  const hco3OnlyPages = detectHco3OnlyPages(ocr?.tests || []);
  let ambiguousPh = null;   // P107j
  const stoolPages = detectStoolPages(ocr?.tests || []);   // P111: صاحبِ «Color»ِ برهنه روی صفحهٔ مدفوع
  const dipstickPages = detectDipstickPages(ocr?.tests || []);   // باگِ ۵
  // آنالیزِ منی (P47): ردیف‌های این صفحه‌ها نه ادرارند نه CBC. کانالِ جدا، نه qual (بالا).
  const semenQual = {};
  // specs/012 (P68): مرزِ چاپ‌شدهٔ ردیف‌های سرولوژیِ کیفی (سرخجه) و آنتی‌بادی‌های تیروئید با بازهٔ چاپ‌شده — خواننده: serology.js
  const serologyRef = {};
  const serologyAssay = {};
  // specs/009: ردیف‌های لامِ خونِ محیطی (بلاست، اوئر، …) — کانالِ جدا، نه qual (N25). ادغام در انتها (mergeSmear).
  const smearItems = [];
  // P96: شیستوسیت/اسفروسیتِ لام — کانالِ جدا (e.rbcMorph). خواننده: schistocytes_screen / spherocytes_dat / maha_ttp_suspicion.
  const rbcMorphItems = [];
  // specs/010: فاکتور ۸/۹، vWF، مهارکننده، PTِ کنترل — بی‌نمره، کانالِ جدا (نه tests، نه qual). خواننده: patterns_hemostasis.js
  //   و isthScore. ⚠️ متنِ چاپ‌شده دارد؛ به مدل و به گراف نمی‌رود (N13).
  const hemostasis = {};
  // specs/013: غربالگریِ سرمِ مادر (دابل/کوآد مارکر) — بی‌نمره، کانالِ جدا (N25). خواننده: patterns_prenatal.js.
  //   به مدل و گراف نمی‌رود (N13).
  const prenatal = { markers: {}, risk: {}, dating: {} };
  // specs/014 (P87، مرحلهٔ الف): ادرارِ ۲۴ساعته و مایعاتِ بدن — فقط شناخته می‌شوند. هیچ قاعده‌ای نمی‌خواندش (گارد U14)؛
  //   مصرف‌کننده فقط specimenLine() است. به مدل و گراف نمی‌رود (N13).
  const specimen = { u24: [], fluid: [], bareServingFluidNames: [], bareServingFluidKeys: [] };
  // ردیف‌هایی که واحدشان نه چاپ شده، نه از محدودهٔ مرجع/اندازه تعیین شد (specs/003، P48):
  //   کلید → عددِ خام. سنجیده نمی‌شوند؛ مالک: unit_unknown_values.
  const unitUnknown = {};
  // تعیینِ واحد از شواهد (نه چاپ‌شده): کلید → { basis, raw, from } — برای سطرِ «واحد» به بیمار.
  const unitResolved = {};
  // P96: بازهٔ چاپ‌شدهٔ ردیفِ کراتینین — برای «شیرخوار بی‌بازهٔ چاپ‌شده ⇒ بی‌پرچم».
  const printedRefs = {};
  // P113 (۲۰۲۶-۱۰-۲۷): بازهٔ چاپ‌شدهٔ شمارش‌های مطلقِ افتراقی (Monocyte/Lymphocyte/…) روی برگه به واحدِ
  //   ۱۰³/µL است، در حالی که مقدار به /µL تبدیل می‌شود. پیش‌تر این بازه عمداً دور ریخته می‌شد و بازهٔ
  //   *داخلی* سنجیده می‌شد: مونوسیتِ ۰٫۱۷ (مرجعِ برگه ۰٫۱۰–۱٫۲۰) با بازهٔ ۲۰۰–۸۰۰ «پایین» اعلام و
  //   monocytopenia ساخته می‌شد — تشخیصِ کاذب روی عددِ نرمال. مرجعِ خودِ آزمایشگاه بر بازهٔ عمومی مقدم است.
  const absRefs = {};
  // ۲۰۲۶-۱۰-۰۷: بازهٔ چاپ‌شدهٔ هر ردیف (کلید → رشتهٔ خام) — فقط برای نمایش کنارِ بازهٔ موتور (printedRangesFor)؛ هیچ درجه‌بندی‌ای از آن نمی‌آید.
  const printedRefsAll = {};
  // کلیدهای *_ABS که از «درصد × WBC» ساخته شدند ⇒ درصدِ چاپ‌شده. عددِ مطلق روی برگه نیست (N5).
  const derivedAbs = {};
  // بازهٔ چاپ‌شدهٔ ردیفِ درصدی (۲۰–۴۵٪) برای همان کلیدهای derivedAbs — فقط برای گزارشِ درصد کنارِ عدد (۲۰۲۶-۱۰-۰۸)؛ درجه‌بندی نمی‌شود.
  const pctRefs = {}, derivedAbsRefs = {};
  const sexHint = inferSex(ocr), ageHint = inferAge(ocr);
  const hgbFromIndices = hgbSystemFromIndices(ocr?.tests || []);
  // 🔴 واحدِ نانوشته (کلاسِ N3): پیش از این هر عددِ بی‌واحد بی‌صدا «متعارف» فرض می‌شد — کراتینینِ
  //    ۸۰ µmol/L (طبیعی) → اورژانس، قندِ ۱۵ mmol/L (بالا) → «قند پایین». حالا: اگر واحدِ چاپ‌شده
  //    شناخته‌شده است، همان راهِ امروز (دست‌نخورده)؛ وگرنه decideUnit در units.js از شواهدِ خودِ
  //    ردیف تصمیم می‌گیرد، و اگر نتوانست، عدد *اصلاً* سنجیده نمی‌شود.
  //    خروجی: ردیفی با واحدِ متعارفِ سیستمِ انتخاب‌شده (تا شاخه‌های پایین همان تبدیلِ همیشگی را
  //    بکنند)، یا null یعنی «نامعلوم».
  const BRANCH_KEYS = new Set(["TROPONIN_I", "CRP_Q", "TESTO", "T3"]);
  const resolveRowUnit = (key, row, v) => {
    if (!UNIT_PROFILE[key]) return row;
    // P107 (L11): واحدِ چاپ‌شدهٔ دوم (mEq/L کلسیم، mmol/L اسید اوریک/هموگلوبین) شناخته‌شده است؛ تبدیل پایین‌تر (toConventional).
    //   ⚠️ اگر محدودهٔ چاپ‌شدهٔ همان ردیف با آن واحد نمی‌خواند (H1)، واحد باور نمی‌شود ⇒ سنجیده نمی‌شود (unit_unknown_values).
    if (row.unit && EXTRA_PRINTED_UNITS[key]?.some(([re]) => re.test(String(row.unit).toLowerCase().replace(/\s+/g, "")))) {
      if (!extraUnitContradicted(key, row.unit, row.reference, sexHint, ageHint)) return row;
      unitUnknown[key] = { value: v, reference: row.reference ?? null };
      return null;
    }
    const rec = recognizedUnit(key, row.unit);
    if (rec) {
      // «(mg/dL)»، «mgdl»، «میلی گرم در دسی لیتر»: شناخته شد، ولی شاخه‌های پایین (تروپونین، تستوسترون،
      // CRP) واحد را با regexِ خودشان می‌خوانند — پس املای قانونی را به آن‌ها بده (FR-009). املایی که
      // همین حالا هم کار می‌کرد دست نمی‌خورد، تا خروجیِ برگه‌های سالم بایت‌به‌بایت یکی بماند (M125).
      // ⚠️ کلیدهای شاخه‌دار *همیشه* املای قانونی می‌گیرند: «CRP 3 mg%» سیستمِ mg/dL شناخته می‌شد ولی شاخهٔ CRP
      //    فقط /mg\/dl/ را می‌خواند و ۳ را mg/L می‌گرفت — ده برابر کم (بازبینیِ کد).
      if (BRANCH_KEYS.has(key)) return { ...row, unit: rec.unit };
      const plain = String(row.unit).toLowerCase().replace(/\s+/g, "");
      return rec.match(plain) ? row : { ...row, unit: rec.unit };
    }
    let d = decideUnit(key, v, row.reference, sexHint, ageHint);
    // باگِ ۳ (P89): Hb بی‌واحد ⇒ واحد از MCHC/MCHِ همان برگه، فقط اگر decideUnit نتوانست.
    if (!d.system && key === "HGB" && hgbFromIndices) d = { system: hgbFromIndices, basis: "indices" };
    // P110-ج (برگهٔ واقعی ۲۰۲۶-۱۰-۱۶): واحدی *چاپ شده* ولی شناخته نشد («CRP 5 IU/ml»، «T3 1.2 mmol/L») — متن نباید بگوید «واحد خوانده
    //   نشد». املای چاپ‌شده (فقط اگر شکلِ واحد دارد؛ متنِ خامِ OCR به پرامپت می‌رود) همراهِ ردیف می‌ماند.
    const printedUnit = printedUnitText(row.unit);
    if (!d.system) { unitUnknown[key] = { value: v, reference: row.reference ?? null, ...(printedUnit ? { printedUnit } : {}) }; return null; }
    unitResolved[key] = { basis: d.basis, raw: v, from: d.system.unit, ...(printedUnit ? { printedUnit } : {}) };
    // `_basis` روی *همین ردیف* — تا تبدیلِ ردیفِ واحددارِ هم‌کلید برچسبِ «بدونِ واحد» نگیرد (N5).
    return { ...row, unit: d.system.unit, _basis: d.basis };
  };
  // مقدارِ خامِ «<2» / «>1000»: برای نقلِ درست در متن (N5)؛ عدد فقط برای حکم است.
  const rawText = {};
  const semenPages = detectSemenPages(ocr?.tests || []);
  // صفحهٔ مخلوط: اگر همان صفحه نشانگرِ CBC هم دارد، WBC/RBCِ آن مالِ خون می‌ماند (M104c) —
  // همان احتیاطِ صفحهٔ ادرار: «هر شاهدی از خون، دست نزن».
  const bloodPages = new Set();
  for (const t of ocr?.tests || []) {
    if (t?.name && BLOOD_ONLY_MARKERS.has(norm(t.name))) bloodPages.add(t._page ?? 0);
  }

  // ═══ specs/008 (R4، N25): آیا این برگه الکتروفورزِ هموگلوبین دارد؟ — شاهدی بی‌ابهام (HbA2/HbF/HbA) ═══
  // 🔴 بازبینیِ کد #۵: شاهد برای هر *صفحه* جدا — «HBs 150 mIU/mL»ِ صفحهٔ هپاتیت کنارِ صفحهٔ الکتروفورز
  //    «هموگلوبین S» خوانده می‌شد.
  const electroPages = new Set();
  for (const t of ocr?.tests || []) {
    if (t?.name && (HB_ELECTRO_EVIDENCE.has(NAME_MAP[norm(t.name)]) ||
      (norm(t.name) === "a2" && /%/.test(String(t.unit || ""))))) electroPages.add(t._page ?? 0);
  }

  // specs/013 (گذرِ ۱): برگه شاهدِ غربالگری دارد؟ (نامِ قوی، واحدِ MoM، ردیفِ خطر) — پرچمِ بارداریِ پروفایل شاهد نیست (پرسش ۳).
  const prenatalSheet = isPrenatalSheet(ocr?.tests || [], norm);
  // specs/014 (R1): شاهدِ ۲۴ساعت و ردیفِ «Fluid Type» در سطحِ برگه.
  const specimenEv = specimenSheetEvidence(ocr?.tests || [], norm, mapKey);
  // باگِ ۱ (LIS ۲۰۲۶-۱۰-۰۵): افتراقیِ بی‌واحدِ این برگه درصد است؟ (جمع ≈ ۱۰۰ یا مطلق > WBC) — پایین، کنارِ v0 < 20.
  const diffUnitlessPct = unitlessDiffIsPercent(ocr?.tests || []);
  // باگِ ۲ (LIS ۲۰۲۶-۱۰-۰۵): WBC/RBCِ دوقلو روی یک صفحه — ادراری ⇒ /hpf؛ نامعلوم ⇒ «تفسیر نشدند».
  const twinRoutes = cellTwinRoutes(ocr?.tests || []);

  // «Total 100 %» زیرِ فرمولِ گلبولِ سفید جمعِ درصدهاست که دستگاه چاپ می‌کند، نه آزمایش (گزارشِ کاربر ۲۰۲۶-۱۰-۱۶: هشدارِ «Total را
  //   تفسیر نمی‌کند» نویز بود). فقط با ردیفِ ٪ِ افتراقی روی برگه و مقدارِ ۹۸ تا ۱۰۲ کنار گذاشته می‌شود؛ «Total» ِ دیگر (پروتئین؟ بیلی‌روبین؟)
  //   در «تفسیر نشدند» می‌ماند — حدس‌زدنِ «تامِ چه؟» همان خطایی است که پیش‌تر به بیمار رسیده بود.
  const diffPctOnSheet = (ocr?.tests || []).some((x) => /^(neut|neutrophils?|lymph|lymphocytes?|mono|monocytes?|eos|eosinophils?|baso|basophils?|seg|segmented)/.test(norm(x.name)));
  for (let t of ocr?.tests || []) {
    if (!t?.name) continue;
    curRow = { name: t.name };
    {
      const tw = twinRoutes.get(t);
      if (tw === "conflict") { unmapped.push(t.name); continue; }
      if (tw === "urine" && !String(t.unit ?? "").trim()) t = { ...t, unit: "/hpf" };
    }
    let key = norm(t.name);
    // بازبینیِ متامورفیک ۲۰۲۶-۱۰-۰۵ (N3): واحدِ چسبیده به عدد در خانهٔ نتیجه («21 mg/dL»، ستونِ واحد خالی) دور ریخته می‌شد و
    //   ردیف «واحدِ نامعلوم» می‌گرفت — قندِ ۲۱ از اورژانس به soon، تروپونینِ ۲٫۴ از اورژانس به this_week. فقط وقتی دنباله *همان*
    //   واحدی است که این کلید می‌شناسد (recognizedUnit یا واحدِ خودِ موتور) جدا می‌شود؛ هر متنِ دیگری دست نمی‌خورد (حدس نمی‌زنیم).
    //   پیش از همهٔ شاخه‌ها، چون تروپونین/CRP شاخهٔ ویژهٔ خود را پیش از نگاشتِ عمومی دارند.
    if (!String(t.unit ?? "").trim()) {
      const trop = /troponin|ctn[it]|hs.?ctn|^tn[it]$|cardiactroponin/.test(key);   // همان regexِ شاخهٔ تروپونینِ پایین
      let k0 = trop ? "TROPONIN_I" : mapKey(key);
      if (k0?.endsWith("_PCT") && String(t.name).includes("#")) k0 = k0.replace("_PCT", "_ABS");
      const sm = k0 && String(t.value ?? "").match(/^\s*([<>≤≥]?\s*[\d۰-۹٠-٩][\d۰-۹٠-٩.,٫]*)\s*([^\d\s۰-۹٠-٩].*?)\s*$/);
      if (sm && (recognizedUnit(k0, sm[2]) || (getUnit(k0) && normUnit(sm[2]) === normUnit(getUnit(k0))) ||
                 (trop && /^(ng|µg|ug|μg|pg)\/(l|ml)$/i.test(sm[2].replace(/\s+/g, ""))) ||
                 (k0.endsWith("_ABS") && /(10\^?3|10\*3|10³)\/(µl|ul|μl)|\/(µl|ul|μl)|cells/i.test(sm[2])))) {
        t = { ...t, value: sm[1], unit: sm[2] };
      }
    }
    // ═══ specs/014 (R2، N25): ادرارِ ۲۴ساعته / مایعِ بدن — پیش از prenatal و پیش از NAME_MAP/resolveAlias ═══
    //   «Fluid LDH» هرگز به کلیدِ LDHِ سرم نمی‌رسد؛ «Urine Protein»ِ کنارِ حجمِ ۲۴ساعته به نوارِ ادرار (qual) نمی‌رسد.
    //   ردیفی که mapKey امروز می‌شناسد ادعا نمی‌شود (R3: «24h urine calcium» همان U_CA می‌ماند).
    {
      const sc = specimenClaim(t, specimenEv, norm, mapKey);
      // P87 تصمیمِ ۸ (۲۰۲۶-۱۰-۰۶، تصمیمِ کاربر): کلسیمِ ۲۴ساعته یک هویت دارد. «Urine Ca/24h» و هر املای ۲۴ساعتهٔ دیگرِ کلسیم
      //   همان U_CA است، با همان بازه و همان محورِ معدنی. 🔴 اندازه‌گیری‌شده پیش از این: «Urine Ca/24h 50» کنارِ کلسیمِ بالا + PTHِ بالا
      //   به‌جای fhh_pattern «پرکاریِ اولیه» + «کلسیم ادرار روی این برگه نیست» می‌گرفت (N4، جهتِ خطا: جراحیِ بی‌فایده). گارد U20.
      if (sc?.id === "U24_CA") key = "urinecalcium24h";
      else if (sc) {
        const item = { id: sc.id, name: t.name, raw: String(t.value ?? "").trim(), unit: String(t.unit ?? "").trim() || null, claimed_by: sc.claimed_by };
        if (sc.fluid !== undefined) item.fluid = sc.fluid;
        const list = sc.id.startsWith("FL_") ? specimen.fluid : specimen.u24;
        const prev = list.find((x) => x.id === item.id && (x.fluid?.type ?? null) === (item.fluid?.type ?? null));
        // R7: دو مقدارِ ناهم‌خوان برای یک هویت ⇒ اولی می‌ماند، دومی «تفسیر نشدند» (قاعدهٔ هموستاز).
        if (!prev) list.push(item);
        else if (prev.raw !== item.raw) unmapped.push(t.name);
        continue;
      }
    }
    // ═══ specs/013 (گذرِ ۲): ردیفِ غربالگریِ بارداری — پیش از هر لایهٔ دیگر و پیش از شاخهٔ «MoM ⇒ unmapped» ═══
    //   🔴 اندازه‌گیری‌شده: «AFP 35 IU/mL» و «Total hCG 29000» در کوآدِ زنِ باردار تومورمارکر و تستِ بارداری خوانده
    //   می‌شدند. ردیفِ ادعاشده هرگز به NAME_MAP، ungraded.AFP یا ungraded.HCG نمی‌رسد.
    {
      const pc = prenatalClaim(t, prenatalSheet, norm);
      if (pc?.kind === "marker") {
        const it = prenatalItem(pc.key, t, toNum, pc.claimed_by, pc);
        const prev = prenatal.markers[pc.key];
        if (!prev) prenatal.markers[pc.key] = it;
        // 🔴 بازبینیِ کد C3: «Free β-hCG 92 ng/mL» کنارِ «Free β-hCG MoM 2.1» — ردیفِ MoM همان است که معنا دارد و نباید دور ریخته شود.
        else if (it.mom != null && prev.mom == null) prenatal.markers[pc.key] = it;
        else if (prev.mom != null && it.mom == null) { /* غلظت کنارِ MoMِ همان نشانگر: زائد، چیزی گم نمی‌شود */ }
        else if (prev.raw !== it.raw) unmapped.push(t.name);   // دو مقدارِ ناهم‌خوان — اولی می‌ماند (قاعدهٔ هموستاز)
        continue;
      }
      if (pc?.kind === "risk") {
        const raw = String(t.value ?? "").trim();
        // 🔴 بازبینیِ کد C1: خطرِ زمینه‌ایِ سن («Background/Age risk») خطرِ بیمار نیست — به «تفسیر نشدند»، نه به جای خطرِ تعدیل‌شده.
        if (pc.role === "background") { unmapped.push(t.name); continue; }
        if (!prenatal.risk[pc.trisomy]) {
          prenatal.risk[pc.trisomy] = { name: t.name, raw, denominator: parseRiskDenominator(raw), category: parseRiskCategory(raw) };
        } else unmapped.push(t.name);
        continue;
      }
      if (pc?.kind === "dating") {
        const raw = String(t.value ?? "").trim();
        if (pc.which === "basis") prenatal.dating.basis_raw = raw;
        else prenatal.dating[pc.which] = { raw, days: parseGaDays(raw, toNum) };
        continue;
      }
    }
    // job c138671c (D1): ردیفِ چاپ‌شده با مقدارِ ناخوانا — server.js فقط هشدارِ OCR می‌سازد و موتور هیچ‌وقت نمی‌فهمید
    //   «نوتروفیل غایب است» یعنی «خوانده نشد»، نه «روی برگه نیست». norm «#» و «%» را می‌اندازد، پس NEUT# هم NEUT_PCT است.
    //   فقط ثبت می‌شود؛ مسیرِ ردیف عوض نمی‌شود.
    if ((t.value == null || String(t.value).trim() === "") && NAME_MAP[key]) unreadableKeys.add(NAME_MAP[key]);
    // job fff90f58 (E2): جای‌نگهدار هم «ناخوانا» است، نه متنِ کیفی — نه qual، نه unmapped (هشدارش را server.js می‌سازد).
    if (isPlaceholderValue(t.value)) {
      if (NAME_MAP[key]) unreadableKeys.add(NAME_MAP[key]);
      continue;
    }
    if (key === "total" && diffPctOnSheet && Math.abs(toNum(t.value) - 100) <= 2) continue;
    // ═══ P111: متنِ چاپیِ غیرآزمایش (سلبِ مسئولیتِ آزمایشگاه) ردیفِ آزمایش نیست ═══
    //   «تفسیر نتایج آزمایشات بر عهده پزشک معالج می باشد» پیش‌تر unmapped می‌شد و در فهرستِ «تفسیر نشدند»
    //   به‌عنوان یک آزمایشِ ناخوانا به بیمار نشان داده می‌شد. نامِ جمله‌ای با این نشانه‌ها، ردیف نیست.
    if (BOILERPLATE_RE.test(String(t.name ?? ""))) continue;
    // ═══ P111: فیلدِ Comment/Note — متنِ آزمایشگاه، نه ردیفِ آزمایش ═══
    //   قاعدهٔ lab_comment_note عینِ آن را در گزارش نقل می‌کند (بی‌ترجمه، بی‌حکم).
    //   ⚠️ اگر متن واژگانِ لامِ خون دارد («Blasts»، «Toxic granulation»، «Pelger»…)، مالکش خوانندهٔ لام است
    //   (specs/009: M202i/M203d) — اینجا دست نمی‌زنیم، وگرنه «Blasts not evaluated» به‌جای «تفسیر نشدند» یک
    //   یادداشتِ خوش‌خط می‌شد. فقط متنِ آزادی که هیچ نشانگرِ لام ندارد (تشخیصِ پاتولوژیست) اینجا گرفته می‌شود.
    if (/^(comments?|remarks?|notes?|labcomments?|pathologistcomment|interpretation|نظر|توضیح|توضیحات|یادداشت)$/.test(key)
        && String(t.value ?? "").trim().length >= 4
        && !SMEAR_VOCAB_RE.test(String(t.value ?? ""))) {
      labComments.push({ name: String(t.name ?? "").trim(), text: String(t.value).trim() });
      continue;
    }


    // ═══ P111: ردیف‌های مشتق، وقتی اجزایشان روی همین برگه‌اند ═══
    if (DERIVED_ROW_BASES[key]) {
      const present = (k) => (ocr?.tests ?? []).some((x) => {
        const xk = norm(x?.name ?? "");
        return (NAME_MAP[xk] ?? resolveAlias(xk)) === k && String(x?.value ?? "").trim() !== "";
      });
      if (DERIVED_ROW_BASES[key].every((spec) => spec.split("|").some(present))) continue;
    }

    // «Hémoglobine 14 g/dL» / «Hemoglobina 6.1 g/dL»: خودِ هموگلوبین — به مسیرِ عادیِ HGB (CR9/CR10).
    if (HB_TOTAL_WITH_MASS_UNIT.has(key) && HB_MASS_UNIT.test(String(t.unit || ""))) {
      t = { ...t, name: "Hemoglobin" };
      key = "hemoglobin";
    }
    // سرتیترِ بخش بر حدسِ صفحه مقدم است، فقط برای کلیدِ مبهم و رنگ/ظاهر (نامِ صریحِ «Urine …»/«Serum …» مسیرِ خودش را دارد).
    const secKind = AMBIGUOUS_URINE_KEYS.has(key) || /^(colou?r|appearance|turbidity|clarity)$/.test(key) ? sectionKind(t.section) : null;
    // P111: بخشِ مدفوع برای *همهٔ* کلیدها سنجیده می‌شود، چون ردیف‌های میکروسکوپیِ مدفوع هم‌نامِ ادرارند
    //   («W.B.C /hpf»، «R.B.C»، «Color») و بی‌این پرچم به موتورِ CBC/ادرار می‌رفتند (N25).
    const secStool = sectionKind(t.section) === "stool";
    // P111: ردیف‌های بخشِ مدفوع باید *پیش از* لایه‌های ادرار/CBC کنار بروند، چون «W.B.C /hpf» و «R.B.C»ِ
    //   مدفوع هم‌نامِ ادرارند و پیش‌تر به qualِ ادرار می‌رفتند (مقدارِ مدفوع جای ادرار می‌نشست: «No Seen»).
    //   فقط ردیف‌هایی که خوانندهٔ خودشان را دارند می‌گذرند (خونِ مخفی/FIT، کالپروتکتین، رنگ)؛ بقیه با
    //   نامِ خودشان در «تفسیر نشدند» می‌مانند — نه سکوت (N4)، نه خواندن به‌عنوانِ ادرار/CBC (N25).
    if (secStool && !isStoolReaderRow(key)) {
      unmapped.push(t.name);
      continue;
    }
    // بی‌سرتیتر: «Glucose 106» (عددِ ساده) کنارِ «Glucose Negative» (مقدارِ نوار) روی همان صفحه — نوار کیفی است، پس عدد مالِ سرم است.
    //   پیش‌تر هر دو «Urine Glucose» می‌شدند و قندِ خون بی‌صدا گم می‌شد (آخری می‌برد).
    const serumTwin = !secKind && stripTwinKeys.has(`${t._page ?? 0}|${key}`) && isPlainNumber(t.value);
    const onUrinePage = secStool ? false
      : secKind === "urine" ? true
      : secKind === "blood" || serumTwin ? false
      // P111: ردیفی که خودش «Urine …»/«ادرار …» نام دارد صاحبِ صفحه‌اش را لازم ندارد. پیش‌تر
      //   «Urine Color: Yellow» روی صفحه‌ای با کمتر از دو نشانگرِ ادرار به «تفسیر نشدند» می‌رفت (N4/N25).
      : /^(urine|ادرار)/.test(norm(t.name)) ? true
      : urineOnlyPages.has(t._page ?? 0);
    const onStripPage = secStool ? false : secKind === "blood" || serumTwin ? false : secKind === "urine" || dipstickPages.has(t._page ?? 0);

    // ═══ specs/008: لایهٔ الکتروفورزِ هموگلوبین — پیش از qual، چون «hbs» را الگوی anti-HBs می‌گرفت ═══
    //  • hbs/hbc/hbe فقط با واحدِ ٪ یا شاهدِ الکتروفورز روی برگه واریانتِ هموگلوبین‌اند؛ بی‌شاهد ⇒ «تفسیر نشدند».
    //    «HbS: Positive» تنها (تستِ داسی؟ anti-HBs؟) پیش‌تر به qual می‌رفت و هیچ قاعده‌ای نمی‌خواندش
    //    (patterns_infectious.js عمداً «hbs» تنها را نمی‌خواند) — افتِ خاموش.
    //  ⚠️ هرگز به mapKey/resolveAlias نرسد: قاعدهٔ جمعِ آن «hbs» را به «hb» یعنی HGB می‌بَرد ⇒ «HbS 40» = Hb 40.
    //  • ردیفِ واریانت با مقدارِ غیرعددی («Positive»، «Normal») به unmapped با نامِ چاپ‌شده — نه عددِ ساختگی (N6).
    //  • 🔴 بازبینیِ پزشکی B2: «Hemoglobin S/C» هم (قاعدهٔ جمع «hemoglobins» را به HGB می‌بُرد ⇒ HbS 35٪ = «Hb 35»
    //    اورژانس). «hemoglobine» فرانسویِ خودِ هموگلوبین است ⇒ بی‌شاهد همان مسیرِ عادی (HGB)، نه HbE.
    //  • 🔴 بازبینیِ پزشکی B4: نامِ دوپهلوِ بی‌شاهد فقط unmapped نمی‌ماند — برگهٔ «فقط HbS: Positive» بی‌هیچ تستِ
    //    نمره‌دار به مسیرِ قدیمِ LLM می‌رفت. کلیدِ خنثای HB_NAME_AMBIGUOUS در noRef مسیرِ موتور را نگه می‌دارد و به
    //    بیمار می‌گوید این ردیف تفسیر نشد، بی‌آنکه «داسی» یا «هپاتیت» ادعا کند.
    {
      // 🔴 دور ۲ (CR8): «HbS: 35%» با ٪ در مقدار و واحدِ خالی.
      const pct = /%/.test(String(t.unit || "")) || /%\s*$/.test(String(t.value ?? ""));
      const rawV = String(t.value ?? "").trim();
      // 🔴 بازبینیِ کد #۲: پرچمِ چسبیده («5.2 H»، «5.2(H)»، «5.2*») عدد را نمی‌کشد — مسیرِ عمومی هم همین را می‌پذیرد.
      const cleaned = rawV.replace(/\s*[([]?\s*(?:HH|LL|H|L|\*+)\s*[)\]]?\s*$/i, "").trim();
      const nv = toNum(cleaned);
      const numeric = nv != null && !/[+>≥]/.test(cleaned) && !/[a-zA-Zء-ٟٮ-ۓ]/.test(cleaned);
      // 🔴 دور ۲ (غیرِمسدودکنندهٔ ۱): IU/mIU واحدِ anti-HBs است — هرگز «هموگلوبین S»، حتی روی صفحهٔ الکتروفورز.
      //    🔴 دور ۳ (R3-B2): S/CO، COI و index هم واحدهای سرولوژیِ هپاتیت‌اند.
      const hepUnit = /iu|s\s*\/\s*co|\bcoi\b|index/i.test(String(t.unit || ""));
      // 🔴 بازبینیِ دور ۳ (R3-B2): شاهدِ *صفحه* فقط برای عددِ بی‌واحدِ هپاتیتی کافی است. «HBs: Positive» کنارِ HbA2ِ
      //    همان صفحه (برگهٔ پیش‌ازدواج) «هموگلوبین S (داسی‌شکل)» خوانده می‌شد — آنتی‌ژنِ هپاتیتِ B به زوج «داسی» معرفی
      //    می‌شد. مقدارِ کیفی فقط با ٪ واریانت است؛ وگرنه HB_NAME_AMBIGUOUS، هرچه روی صفحه باشد.
      const evidence = pct || (electroPages.has(t._page ?? 0) && numeric);
      const vk = HB_AMBIGUOUS[key] ? (evidence && !hepUnit ? HB_AMBIGUOUS[key] : null)
        : HB_FRENCH_HGB[key] ? (evidence ? HB_FRENCH_HGB[key] : null)
        : key === "a2" ? (pct ? "HBA2" : undefined)
        : HB_VARIANT_KEYS.has(NAME_MAP[key]) ? NAME_MAP[key] : undefined;
      if (vk !== undefined) {
        if (vk && numeric) {
          tests[vk] = nv;
          if (/^[<≤]/.test(cleaned)) rawText[vk] = cleaned; // «<1»: عدد برای حکم، متنِ خام برای نقل (N5)
        } else if (vk) {
          // «Sickle test: Positive»، «HbS: Detected» — شناخته‌شده، بی‌بازه، هرگز عددِ ساختگی (N6).
          if (!noReader.includes(vk)) noReader.push(vk);
          if (noReaderValues[vk] == null) noReaderValues[vk] = rawV;
        } else {
          unmapped.push(t.name);
          if (!noReader.includes("HB_NAME_AMBIGUOUS")) noReader.push("HB_NAME_AMBIGUOUS");
          if (noReaderValues.HB_NAME_AMBIGUOUS == null) noReaderValues.HB_NAME_AMBIGUOUS = rawV;
        }
        continue;
      }
    }
    // ═══ specs/009: لامِ خونِ محیطی — پیش از منی/ادرار/qual، فقط روی صفحه‌ای که نه ادرارِ خالص است نه منی (N25) ═══
    //    ردیفِ نام‌دارِ خوانده‌شده از «تفسیر نشدند» بیرون می‌رود؛ مبهم می‌ماند؛ ردیفِ عمومی («Comment: …») آیتم‌هایش خوانده
    //    می‌شود ولی نامش در «تفسیر نشدند» می‌ماند تا بقیهٔ متنِ آزادش گم نشود.
    if (!onUrinePage && !semenPages.has(t._page ?? 0)) {
      const mr = rbcMorphRow(t.name, t.value, t.unit);
      if (mr) {
        // P114: نامِ چاپ‌شدهٔ ردیف را همراه ببر — «Elliptocyte»، «Target Cells»، «Tear Drops» همه زیرِ
        //   چترِ «پویکیلوسیتوز» می‌روند و اگر نام‌ها گم شوند، متن به بیمار می‌گوید «نوعِ شکل در این ردیف نیامده».
        if (mr.state !== "blank") rbcMorphItems.push({ ...mr, name: String(t.name ?? "") });
        continue;
      }
      const sr = smearRow(t.name, t.value, t.unit);
      if (sr) {
        smearItems.push(...sr.items);
        if (sr.handled !== "read") unmapped.push(t.name);
        continue;
      }
    }
    const onAbgPage = abgPages.has(t._page ?? 0);

    // ═══ لایهٔ ۰: صفحهٔ آنالیزِ منی — پیش از /hpf، چون WBC/RBCِ منی اغلب /hpf چاپ می‌شوند ═══
    //    (research R2؛ M104، M104b). ترتیب مهم است: اگر بعد از لایهٔ ۱ بیاید هرگز اجرا نمی‌شود.
    if (semenPages.has(t._page ?? 0)) {
      const p = t._page ?? 0;
      const cbcRow = bloodPages.has(p) && (key === "wbc" || key === "rbc");
      if (!cbcRow) {
        const u = String(t.unit || "").toLowerCase();
        let sk = SEMEN_KEY[key];
        // «Count» با واحدِ «در کلِ انزال» تعدادِ کل است، نه غلظت.
        if (sk === "SPERM_CONC" && /ejac|انزال/.test(u)) sk = "SPERM_TOTAL";
        const qk = SEMEN_QUAL_KEY[key];
        if (sk) {
          const rawV = String(t.value ?? "").trim();
          // 🔴 بازبینی: «Azoospermia»/«Nil»/«دیده نشد» به‌جای عدد به semenQual می‌رفت، هیچ قاعده‌ای
          //    نمی‌خواندش و برگهٔ بیمارِ بی‌اسپرم buildNormalResult («همه‌چیز طبیعی است») می‌گرفت —
          //    N2 روی مهم‌ترین نتیجهٔ منی. «هیچ اسپرمی» همان عددِ صفر است، نه تفسیر.
          const noSperm = (sk === "SPERM_CONC" || sk === "SPERM_TOTAL") &&
            /^(nil|none|zero|absent|azoo|no\s*sperm|not\s*(seen|detected|found)|دیده\s*نشد|مشاهده\s*نشد|ندارد|صفر|-+|—)/i.test(rawV);
          const nv = toNum(t.value);
          if (noSperm) tests[sk] = 0;
          // «<1» یا «>40» عدد نیست؛ toNum علامت را می‌انداخت و «کمتر از ۱» به «۱ میلیون» نقل می‌شد (N5).
          // مدتِ پرهیز بر حسب «روز» سنجیده می‌شود؛ «72 hours» (= ۳ روز) «۷۲ روز» خوانده می‌شد (N3، لایهٔ ۲).
          else if (nv != null && !/[+<>≤≥]/.test(rawV)) tests[sk] = (sk === "SEMEN_ABSTINENCE" && /^(h|hr|hrs|hour|hours|ساعت)$/i.test(u.trim())) ? nv / 24 : nv;
          else semenQual[sk] = rawV;
          continue;
        }
        if (qk) { semenQual[qk] = String(t.value); continue; }
        if (SEMEN_ONLY_MARKERS.has(key) || /^(color|colour|appearance|رنگ|ظاهر)$/.test(key)) {
          // شناخته‌شده ولی کلیدِ موتور ندارد (زمانِ مایع‌شدن، ویسکوزیته، رنگ…) — نمایش، بی‌تفسیر.
          semenQual[t.name] = String(t.value);
          continue;
        }
      }
    }

    // ═══ MoM غلظت نیست ═══
    // «Free βhCG 1.8 MoM»، «AFP 2.5 MoM»: نسبت به میانهٔ همان هفتهٔ بارداری است، نه مقدار؛
    // سنجیدنش با بازهٔ غلظت همیشه غلط است. خودِ آزمایشگاه خطر را محاسبه و چاپ کرده (P47، M105).
    if (/^mom$/i.test(String(t.unit || "").trim())) {
      unmapped.push(t.name);
      continue;
    }

    // ═══ بازبینیِ medium ۲۰۲۶-۱۰-۱۳ (M26، N25): میکروسکوپیِ مدفوع ادرار نیست ═══
    //   «Stool RBC 5-10 /hpf» به لایهٔ ۱ می‌رفت، «Urine Stool RBC» می‌شد و hematuria می‌گفت «در آزمایش ادرار شما خون … سنگ کلیه».
    //   خواننده‌ای برای میکروسکوپیِ مدفوع نداریم ⇒ «تفسیر نشدند». رنگ (STOOL_COLOR) و خونِ مخفی/کالپروتکتین خوانندهٔ خود را دارند.
    //   فقط ردیف‌های میکروسکوپی (سلول/مخاط/کریستال)؛ آنتی‌ژنِ هلیکوباکتر، خونِ مخفی و کالپروتکتین کانالِ خودشان را دارند (S01).
    if (/stool|feces|faeces|fa?ecal|مدفوع/i.test(t.name)
        && /rbc|wbc|pus|leuk|erythro|blood\s*cells?|epithel|bacteri|yeast|mucus|crystal|cast|گلبول|چرک|مخاط/i.test(t.name)) {
      unmapped.push(t.name);
      continue;
    }

    // ═══ M16 (N25/N2): HCV RNA / HIV RNA / بار ویروسی آنتی‌بادی نیست ═══
    //   «HCV RNA Positive» را خوانندهٔ غربالگریِ آنتی‌بادی می‌خواند («آنتی‌بادی هپاتیت C واکنش‌گر … آزمایش تکمیلی») و «HCV RNA 2500000»
    //   بی‌صدا در qual می‌ماند. RNA/DNA/بار ویروسی خواننده ندارد ⇒ «تفسیر نشدند»، مثلِ HBV DNA.
    if (/(hcv|hiv|hbv|hepatitis|هپاتیت|ایدز)[^a-z]*.*\b(rna|dna|pcr|nat|viral\s*load)\b|viral\s*load|بار\s*ویروس/i.test(t.name)) {
      unmapped.push(t.name);
      continue;
    }

    // ═══ لایه ۱: واحد /hpf یا /lpf → میکروسکوپی ادرار، نه شمارش خون ═══
    if (/\/?\s*[hl]pf/i.test(String(t.unit || ""))) {
      // سیلندری که نوع یا مقدارش معلوم نیست («Mixed Casts»، «RBC Casts: N/S»، «Casts: Hyaline 0-1, RBC 0»)
      // به نزدیک‌ترین نوع نگاشت نمی‌شود — به unmapped می‌رود تا بیمار سطرِ صادقِ «تفسیر نشدند» را ببیند (V6).
      if (isCastKey(t.name) && castRoute(t.name, t.value) === "unmapped") { unmapped.push(t.name); continue; }
      // specs/006: کریستالِ بی‌نوع/ناشناخته و سلولِ اپی‌تلیالِ ناخوانا یا ترانزیشنال با /hpf بی‌صدا در qual می‌ماند
      // و هیچ قاعده‌ای نمی‌خواندش (research R1، M171b) — به «تفسیر نشدند» می‌رود.
      if (isCrystalKey(t.name) && crystalRoute(t.name, t.value) === "unmapped") { unmapped.push(t.name); continue; }
      if (epithelialKind(t.name) && epithelialRoute(t.name, t.value) === "unmapped") { unmapped.push(t.name); continue; }
      qual[/urine|ادرار|^u/i.test(t.name) ? t.name : `Urine ${t.name}`] = String(t.value);
      continue;
    }

    // ═══ لایه ۱ب: سیلندرِ بی‌واحد («Casts: Hyaline, few») — specs/005 ═══
    // بی واحدِ /lpf این ردیف از همهٔ لایه‌ها رد می‌شد و در NAME_MAP نبود ⇒ unmapped، و قاعده‌های سیلندر
    // هرگز آن را نمی‌دیدند (research R4). تصمیم در castRoute است: نوعِ شناخته یا منفی ⇒ qual؛
    // بی‌نوعِ حاضر («Casts: few»)، چندنوعی، یا مقدارِ نامعلوم ⇒ unmapped (V6، بازبینی #۵ و #۷).
    if (isCastKey(t.name)) {
      if (castRoute(t.name, t.value) === "qual") qual[/urine|ادرار|^u/i.test(t.name) ? t.name : `Urine ${t.name}`] = String(t.value);
      else unmapped.push(t.name);
      continue;
    }

    // ═══ لایه ۱ج: وزنِ مخصوص، کریستال، سلولِ اپی‌تلیالِ بی‌واحد — specs/006، مرحلهٔ ب ═══
    // 🔴 روی b9068df هر سه به unmapped می‌رفتند، در حالی که detectUrineOnlyPages همین نام‌ها را شاهدِ «برگهٔ ادرار»
    // می‌شمارد: موتور با آن‌ها صفحه را می‌شناخت و بعد دورشان می‌انداخت (research R1). تصمیمِ مسیر در patterns_utils است.
    // وزنِ مخصوص واژگانِ فقط‌ادرار است، پس روی هر صفحه‌ای ادراری است؛ و هرگز عددِ درجه‌بندی‌شده نیست (FR-017a).
    if (isSgKey(t.name)) {
      if (sgValue(t.value) != null) qual[SG_KEY] = String(t.value);
      else unmapped.push(t.name);
      continue;
    }
    if (isCrystalKey(t.name)) {
      if (crystalRoute(t.name, t.value) === "qual") qual[/urine|ادرار/i.test(t.name) ? t.name : `Urine ${t.name}`] = String(t.value);
      else unmapped.push(t.name);
      continue;
    }
    // اوروبیلینوژن: واحدش کنارِ مقدار می‌ماند، چون ۳.۲ µmol/L طبیعی و ۴ mg/dL بالاست (بازبینیِ پزشکی B2، N3)؛
    // مقدارِ ناخوانا یا مبهم به «تفسیر نشدند» می‌رود، نه بی‌صدا در qual (بازبینی #۴، N18).
    if (/^(urine\s*)?urobil|اوروبیل/i.test(String(t.name).trim())) {
      const uv = t.unit ? `${t.value} ${t.unit}` : String(t.value);
      if (urobilValueState(uv) !== "unknown") qual[t.name] = uv;
      else unmapped.push(t.name);
      continue;
    }
    // «Urine Bilirubin» با نامِ صریح: همان فهرستِ بسته (B3، #۴).
    if (key === "urinebilirubin") {
      if (urineBiliValueState(t.value) !== "unknown") qual[t.name] = String(t.value);
      else unmapped.push(t.name);
      continue;
    }
    if (epithelialKind(t.name)) {
      if (epithelialRoute(t.name, t.value) === "qual") qual[/urine|ادرار/i.test(t.name) ? t.name : `Urine ${t.name}`] = String(t.value);
      else unmapped.push(t.name);
      continue;
    }

    // ═══ لایه ۲: pH فقط با شاهدِ گاز خون، pH خون است ═══
    // ⚠️ باگ واقعی: روی برگهٔ بدون ABG، pH ادرارِ ۷.۰ به‌عنوان pH خون سنجیده می‌شد و
    //    الگوی severe_acidosis یک «🚨 اورژانس» کاذب می‌ساخت. pH خون فقط با پنل گاز خون
    //    (HCO3/pCO2/…) اندازه‌گیری می‌شود؛ pH تنها روی یک برگه تقریباً همیشه pH ادرار است.
    //    pH خارج از دامنهٔ حیات (۵) هم که قطعاً ادرار است.
    // «Urine pH» / «pH (Urine)» نامِ صریحِ ادرار است؛ بدونِ این به unmapped می‌رفت و برگهٔ ادرارِ طبیعی را «تفسیر نشد» می‌کرد.
    if ((key === "urineph" || key === "phurine") && String(t.value ?? "").trim()) {
      qual["Urine pH"] = String(t.value).trim();
      continue;
    }
    if (key === "ph") {
      const v = toNum(t.value);
      const bloodEligible = (onAbgPage || secKind === "blood") && !onUrinePage && !onStripPage &&   // بی‌کربناتِ سرم کنار نوارِ ادرار pH ادرار را «pH خون» نمی‌کند (بازبینی ۱۰-۱۳)
        v != null && v >= BLOOD_PH_MIN && v <= BLOOD_PH_MAX;
      // P107j: صفحه‌ای که از نشانگرهای گاز خون فقط HCO3 دارد و سرتیترِ «خون» ندارد: pH فقط در ۷٫۳۵–۷٫۴۵ (بی‌خطر در هر دو خوانش) خون خوانده می‌شود.
      const hco3Only = secKind !== "blood" && hco3OnlyPages.has(t._page ?? 0);
      const isBloodPh = bloodEligible && (!hco3Only || (v >= 7.35 && v <= 7.45));
      if (!isBloodPh) {
        if (bloodEligible && hco3Only) { if (!ambiguousPh) ambiguousPh = { value: v, hco3: hco3OnlyPages.get(t._page ?? 0) ?? null }; continue; }
        qual["Urine pH"] = String(t.value);
        continue;
      }
    }

    // ═══ P109 (برگهٔ واقعی ۲۰۲۶-۱۰-۱۶): ردیف‌های ادراری با نامِ صریح ═══
    // «Blood (RBC/Hgb)» نامِ پدِ خونِ نوار است (پد هم گلبولِ قرمز و هم هموگلوبین را می‌بیند) — سرم هرگز این نام را ندارد؛
    //   فقط با مقدارِ نواری (فهرستِ بسته، N6)، وگرنه «تفسیر نشدند».
    if (/^(urine)?blood(rbchgb|rbchb|hgbrbc|hbrbc|rbchemoglobin|hemoglobinrbc)$/.test(key)) {
      const raw = String(t.value ?? "").trim();
      if (DIPSTICK_VALUE_RE.test(raw)) qual["Urine Blood"] = raw; else unmapped.push(t.name);
      continue;
    }
    // OB در بخشِ ادرار («Urine OB» یا «OB» زیرِ سرتیترِ Urinalysis) خونِ ادرار (نوار) است، نه مدفوع.
    if ((key === "ob" || key === "urineob") && (secKind === "urine" || /^(urine|ادرار)/.test(norm(t.name)))) {
      const raw = String(t.value ?? "").trim();
      if (DIPSTICK_VALUE_RE.test(raw)) qual["Urine Blood"] = raw; else unmapped.push(t.name);
      continue;
    }
    // P114 (برگهٔ مرد ۵۵ ساله): پدِ خونِ نوار روی برگه‌های ایرانی گاهی «Hemoglobin»/«Hb» نام دارد، نه «Blood».
    //   پیش‌تر زیرِ نامِ خودش در qual می‌نشست و هیچ قاعدهٔ ادراری نمی‌خواندش ⇒ هماچوریِ مثبت بی‌یافته می‌ماند.
    if ((key === "hemoglobin" || key === "hb" || key === "hgb") && (secKind === "urine" || /^(urine|ادرار)/.test(norm(t.name)))) {
      const raw = String(t.value ?? "").trim();
      if (DIPSTICK_VALUE_RE.test(raw)) qual["Urine Blood"] = raw; else unmapped.push(t.name);
      continue;
    }
    // «U/C» = کشتِ ادرار (Urine Culture)؛ «U/C First»، «U/C Final». ردیفِ «Culture (after 48 hrs)» فقط کنارِ یک ردیفِ U/C یا کشتِ ادرار
    //   روی همان صفحه ادراری است (N25: کشتِ خون هم «۴۸ ساعت» دارد) — وگرنه «تفسیر نشدند». نامِ قانونی با «Urine Culture» شروع می‌شود تا
    //   خوانندهٔ urine_culture_result (qualRows /^urineculture/) همهٔ نوبت‌ها را ببیند.
    {
      const isUc = /^uc(first|final|second|1st|2nd|prelim|preliminary)?$/.test(key);
      const isTimedCulture = /^culture(after)?(24|48|72)(h|hr|hrs|hour|hours)$/.test(key);
      if (isUc || isTimedCulture) {
        const raw = String(t.value ?? "").trim();
        const ucOnPage = (ocr?.tests ?? []).some((x) => (x._page ?? 0) === (t._page ?? 0) && /^(uc(first|final|second|1st|2nd|prelim|preliminary)?|urineculture.*)$/.test(norm(x.name)));
        if (raw && (isUc || ucOnPage)) qual[`Urine Culture (${t.name})`] = raw; else unmapped.push(t.name);
        continue;
      }
    }

    // ═══ P91 ([38]): رنگِ مدفوع — شناخته، بی‌بازه (noReader ⇒ ungraded.STOOL_COLOR). خواننده: melena_microcytic_anemia، که
    //   با explains آن را از خطِ «تفسیر نشدند» بیرون می‌برد؛ بی‌آن یافته، همان خط با نامِ فارسی می‌ماند. فقط نامِ صریحِ مدفوع —
    //   «Color»ِ برهنه روی برگهٔ ترکیبی رنگِ ادرار هم می‌تواند باشد (N25) و دست نمی‌خورد.
    if (/^(stool|feces|faeces|fecal|مدفوع)(colou?r|رنگ)$|^رنگمدفوع$/.test(key) && String(t.value ?? "").trim()) {
      if (!noReader.includes("STOOL_COLOR")) noReader.push("STOOL_COLOR");
      if (noReaderValues.STOOL_COLOR == null) noReaderValues.STOOL_COLOR = String(t.value).trim();
      continue;
    }
    // P111 (بازبینیِ ۲۰۲۶-۱۰-۲۰): «Color: Brown»ِ برهنه روی صفحه‌ای که نشانگرِ صریحِ مدفوع دارد (FOBT/FIT/
    //   کالپروتکتین/Stool …) مالِ مدفوع است. پیش‌تر روی صفحهٔ ترکیبی به «رنگِ ادرار» تبدیل می‌شد و موتور به
    //   بیمار هشدارِ «رنگِ ادرارِ شما قهوه‌ای است» می‌داد؛ حالا خوانندهٔ رنگِ مدفوع (melena) صاحبش است (N25).
    //   ⚠️ اگر خودِ ردیف سرتیترِ «Urine …» دارد مالِ ادرار است؛ پس fallbackِ صفحه‌ای فقط وقتی به کار می‌رود
    //   که ردیف هیچ سرتیترِ شناخته‌شده‌ای ندارد (secKind خالی).
    if (/^(colou?r|رنگ)$/.test(key) && (secStool || (!secKind && stoolPages.has(t._page ?? 0))) && String(t.value ?? "").trim()) {
      if (!noReader.includes("STOOL_COLOR")) noReader.push("STOOL_COLOR");
      if (noReaderValues.STOOL_COLOR == null) noReaderValues.STOOL_COLOR = String(t.value).trim();
      continue;
    }
    // ═══ P117 (۲۰۲۶-۱۰-۲۷): مشاهده‌های توصیفیِ مدفوع — کانالِ خودشان ═══
    //   برگهٔ واقعی (مردِ ۴۴ ساله): «Consistency: Soft»، «Undigested Food: Few»، «Ova Of Parasites: Negative»،
    //   «Protozoa Cyst: Negative» همه در «تفسیر نشدند» می‌افتادند — یعنی موتور فیلدهای استانداردِ گزارشِ مدفوع
    //   (WHO 2003: colour/consistency/blood/mucus/food remnants؛ CDC DPDx: ova/cyst) را نمی‌شناخت.
    //   اکنون به‌جای «تستِ بی‌محدوده» به‌عنوان *مشاهدهٔ چاپ‌شده* ثبت می‌شوند (noReader ⇒ ungraded) و قاعده‌های
    //   patterns_stool.js آن‌ها را می‌خوانند. ⚠️ هیچ بازه/آستانه‌ای ساخته نمی‌شود؛ متنِ خودِ برگه می‌مانَد.
    {
      const field = stoolFieldOf(key);
      const rawText = String(t.value ?? "").trim();
      // «Blood»/«Mucus»ِ برهنه فقط با شاهدِ مدفوع (سرتیتر یا صفحهٔ مدفوع) — مالکیتِ ردیف حدس زده نمی‌شود (N25).
      const needsWitness = field === "STOOL_BLOOD" || field === "STOOL_MUCUS";
      const hasWitness = secStool || stoolPages.has(t._page ?? 0);
      if (field && rawText && (!needsWitness || hasWitness)) {
        if (!noReader.includes(field)) noReader.push(field);
        if (noReaderValues[field] == null) noReaderValues[field] = rawText;
        continue;
      }
    }
    // P111: بقیهٔ ردیف‌های بخشِ مدفوع خوانندهٔ موتور ندارند (W.B.C /hpf، R.B.C، Ova، Fat globules، Consistency…).
    //   فقط ردیف‌هایی که خوانندهٔ خودشان را دارند از این‌جا می‌گذرند (خونِ مخفی/FIT، کالپروتکتین، رنگ)؛
    //   بقیه با نامِ خودشان در «تفسیر نشدند» می‌مانند — نه سکوت (N4)، نه خواندن به‌عنوانِ ادرار یا CBC (N25).
    if (secStool && !isStoolReaderRow(key)) {
      unmapped.push(t.name);
      continue;
    }
    // ═══ لایه ۲ب (باگِ ۵): استرازِ لکوسیتی با هر املا، و نوار/میکروسکوپیِ برگهٔ ترکیبی ═══
    //   استراز واژگانِ فقط‌ادرار است ⇒ روی هر صفحه‌ای؛ نامِ قانونی می‌گیرد تا LE_RE ِ قاعده‌ها («leukocyte|esterase») و
    //   PAD_ROW_RE (کنارگذاشتن از شمارشِ WBC) آن را بشناسند. مقدارِ بیرون از فهرستِ بسته ⇒ «تفسیر نشدند» (N6).
    //   املاهای قدیمی («Leukocyte Esterase»، «لکوسیت استراز») همان مسیرِ isQualitative را دارند — دست نمی‌خورند.
    if (isLeKey(key) && !QUALITATIVE.has(key)) {
      if (DIPSTICK_VALUE_RE.test(String(t.value ?? "").trim())) qual["Leukocyte Esterase"] = String(t.value).trim();
      else unmapped.push(t.name);
      continue;
    }
    // بند ۵ (تصمیمِ «الف»): Mixed/MXDِ عددی ⇒ runEngine تصمیم می‌گیرد (کنارِ CBC ⇒ ungraded.MIXED، وگرنه unmapped).
    if (DIFF_MIXED_RE.test(key) && toNum(t.value) != null && !/[<>≤≥]/.test(String(t.value))) {
      diffMixed ??= { name: t.name, value: toNum(t.value), unit: String(t.unit ?? "").trim() || null, reference: t.reference ?? null };
      continue;
    }
    // ═══ P111: مخاطِ ادرار («Mucus»، «Mucus threads») فقط-ادرار است ═══
    //   روی برگهٔ واقعی، «Mucus: Not seen» از qual جا می‌ماند و unmapped می‌شد، در حالی که Bacteria/Casts/Crystals
    //   همان ستون خوانده می‌شدند (شکستِ یک ردیف از هفت ردیفِ میکروسکوپی). این نام‌ها در هیچ برگهٔ خونی/سرمی نمی‌آیند.
    if (URINE_MICRO_ONLY_RE.test(key) && String(t.value ?? "").trim()) {
      qual[/urine|ادرار/i.test(t.name) ? t.name : `Urine ${t.name}`] = String(t.value).trim();
      continue;
    }

    if (onStripPage || onUrinePage) {
      const raw = String(t.value ?? "").trim();
      // بند ۵ (تصمیمِ «الف»): رنگ/ظاهرِ ادرار روی صفحهٔ ادرار — شناخته، بی‌خواننده. در qual با نامِ قانونی، تا شبکهٔ unreadQualRows
      //   مقدارِ غیرعادی (کدر، قرمز…) را با نامِ فارسی بیاورد و Yellow/Clear بی‌صدا بماند (۸۴ درخواست «تفسیرشان نمی‌کند» می‌گرفتند).
      //   روی صفحهٔ غیرادراری «Color»ِ برهنه همان unmapped می‌ماند (N25: رنگِ مدفوع/منی).
      if (/^(urine)?(colou?r|appearance|turbidity|clarity)$|^(رنگ|ظاهر|کدورت)(ادرار)?$/.test(key) && raw) {
        qual[/colou?r|رنگ/.test(key) ? "Urine Color" : "Urine Appearance"] = raw;
        continue;
      }
      const dn = onUrinePage ? null : DIPSTICK_AMBIG_NAME[key];   // صفحهٔ ادرارِ خالص: لایهٔ ۳ (پایین) همین را می‌کند
      if (dn && (key === "bilirubin" ? urineBiliValueState(raw) !== "unknown" : DIPSTICK_VALUE_RE.test(raw))) {
        qual[dn] = raw;
        continue;
      }
      if (URINE_MICRO_ONLY_RE.test(key) && raw) { qual[`Urine ${t.name}`] = raw; continue; }
    }

    // ═══ لایه ۳: کلید مبهم روی برگهٔ ادرارِ خالص → ادراری تلقی شود ═══
    // این هم اورژانس کاذب را می‌بندد و هم الگوهای ادرار را فعال می‌کند
    // (قبلاً این‌ها unmapped می‌شدند و کلاً از دست می‌رفتند).
    if (onUrinePage && AMBIGUOUS_URINE_KEYS.has(key)) {
      // specs/006 (بازبینیِ پزشکی B3/B4): «Bilirubin» روی صفحهٔ ادرار فقط با فهرستِ بستهٔ نوار خوانده می‌شود. عدد
      // («0.8 mg/dL» — اغلب بیلی‌روبینِ سرمی که آشکارساز صفحه را از دست داده) یا «+/-» مبهم است ⇒ «تفسیر نشدند».
      if (key === "bilirubin" && urineBiliValueState(t.value) === "unknown") { unmapped.push(t.name); continue; }
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
        t = resolveRowUnit("TROPONIN_I", t, tv);
        if (!t) continue;
        // 🔴 باگ واقعی، کلاسِ N3 — و جهتش «اورژانسِ کاذب» بود، نه سکوت.
        //    refs.js تروپونین را بر حسب µg/L می‌خواهد ([0, 0.6]) ولی سنجه‌های
        //    حساسیت‌بالا روی برگه با ng/L (یا pg/mL، که عددشان یکی است) چاپ
        //    می‌شوند. هنری فصل ۱۹: صدکِ ۹۹ این سنجه‌ها ۱۰ تا ۳۰ ng/L است، یعنی
        //    یک تروپونینِ کاملاً *طبیعیِ* «8 ng/L» بدونِ تبدیل با ۰.۶ سنجیده
        //    می‌شد → «بالاتر از حد طبیعی» → troponin_positive → «همین حالا به
        //    اورژانس بروید». روی شایع‌ترین حالتِ این تست، که طبیعی بودن است.
        //    ۱ ng/L = ۱ pg/mL = ۰.۰۰۱ µg/L = ۰.۰۰۱ ng/mL.
        const u = String(t.unit || "").toLowerCase().replace(/\s+/g, "");
        // ⚠️ سنجهٔ hs را باید *بشناسیم*، چون قاعدهٔ باندِ ۰.۰۳–۰.۶ فقط برای
        //    همین سنجه معتبر است: سنجهٔ سنتی حدِ تشخیصش ۱۰–۵۰ ng/L است و
        //    عددِ ۰.۰۴ ng/mL از آن، «بالای صدک ۹۹» نیست بلکه مرزِ نویزِ خودش
        //    است. دو نشانهٔ مستقل، هر کدام کافی: نامِ ردیف، یا واحدِ ng/L.
        const hsUnit = /^(ng\/l|pg\/ml)$/.test(u);
        const hsName = /^hs|highsensitiv|highsensetiv/.test(key);
        if (hsUnit || hsName) tests._trop_hs = true;

        if (hsUnit) {
          // ۴ رقمِ اعشار: ۸ ng/L → ۰.۰۰۸ µg/L. گردکردنِ کمتر، مقدارِ طبیعی را صفر می‌کند.
          const conv = +(tv * BRANCH_FACTORS.TROPONIN_NGL_TO_UGL).toFixed(4);
          unitConversions.push({ test: "TROPONIN_I", raw: tv, from: u, value: conv, to: "µg/L", basis: t._basis ?? "printed" });
          tests.TROPONIN_I = conv;
          // حدِ بالای ۹۹ امِ چاپ‌شدهٔ خودِ سنجه (ng/L ⇒ µg/L)؛ خاصیتِ سنجه است نه آنالیت (چهارمین تعریفِ جهانیِ MI).
          { const pr = t.reference ? parseReference(t.reference, inferSex(ocr)) : null;
            if (pr?.hi > 0 && pr.hi <= 1000) tests._trop_uln = +(pr.hi * BRANCH_FACTORS.TROPONIN_NGL_TO_UGL).toFixed(6); }
        } else {
          // ng/mL و µg/L عددشان یکی است → دست‌نخورده.
          // ⚠️ واحدِ نانوشته عمداً *حدس زده نمی‌شود*، برخلافِ D-dimer بالاتر.
          //    آنجا دو مقیاس شکافِ عددیِ تمیزی دارند (mg/L زیر ۵۰، ng/mL بالای
          //    آن)؛ اینجا ندارند: بازهٔ µg/L در بیمارِ واقعی ۰.۰۱ تا ~۱۰۰ است و
          //    بازهٔ ng/L ‏۱ تا ۱۰۰٬۰۰۰ — روی ۱۰ تا ۱۰۰ کاملاً هم‌پوشان‌اند.
          //    حدس زدن در این هم‌پوشانی همان چیزی است که N3 دربارهٔ آن است.
          tests.TROPONIN_I = tv;
          // P37 (تصمیمِ کاربر ۲۰۲۶-۱۰-۱۳، بازبینیِ چندعاملی یافتهٔ ۱۹): سقفِ ۰٫۶ µg/L عددِ سنجه‌های قدیمی است؛ سنجهٔ امروزیِ
          //   ng/mL حدش ۰٫۰۱–۰٫۰۶ است و TnT حتی پایین‌تر. «TnI 0.3 ng/mL، مرجعِ برگه <0.04» (۷ برابر) «طبیعی» و بی‌یافته می‌شد.
          //   حدِ بالای چاپ‌شدهٔ *همین ردیف* هم‌واحدِ خودِ عدد است، پس مقایسه به واحد وابسته نیست. فقط وقتی سخت‌گیرتر از
          //   موتور است به کار می‌رود (هرگز شُل‌تر نمی‌کند — N23)، و فقط حدِ مثبت و پایین‌تر از ۰٫۶.
          { const pr = t.reference ? parseReference(t.reference, inferSex(ocr)) : null;
            if (pr?.hi > 0 && pr.hi < 0.6 && !(pr.lo < 0)) tests._trop_conv_uln = pr.hi; }
        }
        // M24 (تصمیمِ کاربر ۲۰۲۶-۱۰-۱۳، P106): hs-cTnT حدِ صدکِ ۹۹ِ خودش را دارد — ۱۴ ng/L (Roche Elecsys، Fourth Universal Definition
        //   of MI) — نه آستانهٔ محافظه‌کارانهٔ ۳۰ ng/L ِ cTnI. «hs-cTnT 30 ng/L» (آسیبِ میوکارد) «طبیعی» و بی‌یافته بود. حدِ چاپ‌شدهٔ ردیف
        //   همچنان مقدم است؛ فقط سنجهٔ hs (نام یا واحدِ ng/L).
        if (tests._trop_hs && tests._trop_uln == null && /ctnt|^tnt$|^hstnt|troponint/.test(key)) {
          tests._trop_uln = TNT_HS_99TH_UGL;
          tests._trop_uln_tnt = true;
        }
      } else {
        qual[t.name] = String(t.value);
      }
      continue;
    }

    // ═══ specs/012 (P68): سرولوژیِ ردیف ۱ — پیش از بروسلا و isQualitative ═══
    // 🔴 پیش از این همهٔ این‌ها unmapped بودند و هیچ یافته‌ای نمی‌ساختند (VDRLِ واکنش‌گر → «طبیعی است»، N2/N28).
    // مسیریابی و خواندن در serology.js است؛ مقدارِ مبهم یا عددِ بی‌مرزِ چاپ‌شده ⇒ unmapped («تفسیر نشدند»)، نه حدس (N6، C1).
    // کومبسِ بی‌نوع، کومبسِ مستقیم، سرخجه IgM و هلیکوباکتر IgA/IgM عمداً خواننده ندارند ⇒ unmapped، نه qualِ بی‌خواننده.
    {
      const sr = routeSerology(key, t, sexHint);
      if (sr) {
        if (sr.to === "unmapped") unmapped.push(t.name);
        else if (sr.to === "qual") { qual[t.name] = String(t.value); serologyRef[t.name] = t.reference ?? null; }
        else if (sr.to === "assay" && !serologyAssay[sr.key]) serologyAssay[sr.key] = sr;
        else unmapped.push(t.name);   // ردیفِ دومِ همان آنتی‌بادی: اولی ملاک است، دومی بی‌صدا گم نشود (N2)
        continue;
      }
    }

    // ═══ سرولوژی بروسلوز: مقدار، تیتر است نه غلظت ═══
    // مخرجِ تیتر ذخیره می‌شود («۱/۱۶۰» → ۱۶۰، منفی → ۰) تا با آستانه‌های
    // راهنمای کشوری در refs.js سنجیده شود. «مثبتِ بدون تیتر» عدد ندارد و
    // نباید عددی ساخته شود — کیفی می‌ماند تا الگو خودش تصمیم بگیرد.
    if (["WRIGHT", "ME2", "COOMBS_WRIGHT"].includes(mapKey(key))) {
      const ek = mapKey(key);
      const titre = parseTitre(t.value);
      if (titre != null) tests[ek] = titre;
      // M18 (N28، P105): «الگو خودش تصمیم بگیرد» هرگز پیاده نشد — هیچ قاعده‌ای رایتِ کیفیِ qual را نمی‌خواند، پس «Wright: Positive»/«++»
      //   بی‌صدا گم می‌شد. بی‌تیتر نه عدد می‌سازیم نه حکم ⇒ «تفسیر نشدند».
      else unmapped.push(t.name);
      continue;
    }

    // ⚠️ باگ واقعی (هم‌خانوادهٔ تروپونین): «crp» و «rf» در فهرست QUALITATIVE
    //    بودند، پس حتی وقتی برگه عددِ واقعی می‌داد («CRP 24 mg/L»، «RF 42 IU/mL»)
    //    مقدار به qual می‌رفت و هرگز با مرجعِ خودش سنجیده نمی‌شد.
    //    حالا مثل تروپونین: عدد → کلیدِ عددی، کلمه/پلاس → کیفی.
    if (["CRP_Q", "RF"].includes(mapKey(key)) || key === "crp" || key === "rf") {
      const ek = mapKey(key) ?? (key === "crp" ? "CRP_Q" : "RF");
      // 🔴 تشخیصِ سنجهٔ hs برای CRP (کلاسِ N3، تصمیمِ کاربر ۲۰۲۶-۱۰-۱۶): ردهٔ
      //    خطرِ ASCVD (ACC/AHA 2019، جدولِ ۳) فقط برای *hs-CRP* تعریف شده
      //    («Elevated high-sensitivity C-reactive protein (≥2.0 mg/L)»). برگه‌ای
      //    که «CRP(quantitative)» با بازهٔ چاپیِ «Up to: 6» می‌دهد سنجهٔ معمولیِ
      //    التهاب است، نه hs؛ عددِ ۵ آن هیچ ردهٔ خطری نمی‌سازد. قاعدهٔ
      //    hscrp_ascvd_risk همین پرچم را می‌خواند. ⚠️ key همین‌جا عوض نمی‌شود،
      //    پس نامِ خام در دست است (mapKey(key) === "CRP_Q" برای هر دو hs و غیرِ آن).
      if (ek === "CRP_Q" && /^hs|highsensitiv|highsensetiv/.test(key)) tests._crp_hs = true;
      const nv = toNum(t.value);
      // «3+» و «+++» عدد نیستند حتی اگر toNum رقمی از آن‌ها دربیاورد.
      const looksGraded = /\+/.test(String(t.value));
      if (nv != null && !looksGraded && ek === "CRP_Q" && censoredIndeterminate(ek, t, nv, ocr)) { unmapped.push(t.name); continue; }
      if (nv != null && !looksGraded) {
        if (ek === "CRP_Q") { t = resolveRowUnit("CRP_Q", t, nv); if (!t) continue; }
        // mg/dL → mg/L برای CRP (برگه‌های ایرانی هر دو را می‌دهند)
        tests[ek] = (ek === "CRP_Q" && /mg\/dl/i.test(String(t.unit || "")))
          ? +(nv * BRANCH_FACTORS.CRP_MGDL_TO_MGL).toFixed(1)
          : nv;
      } else {
        qual[t.name] = String(t.value);
      }
      continue;
    }

    // ═══ specs/010: هموستاز — پیش از isQualitative، چون «Bethesda: Negative» متن است و نباید به qual برود (N25) ═══
    {
      const hk = mapKey(key);
      if (HEMOSTASIS_KEYS.has(hk)) {
        if (!hemostasis[hk]) hemostasis[hk] = hemostasisItem(hk, t, sexHint);
        // ردیفِ دومِ همان تست با مقدارِ دیگر (مثلاً روشِ یک‌مرحله‌ای و کروموژنیک): اولی ملاک می‌ماند، ولی دومی بی‌صدا گم نشود (N2).
        else if (String(t.value ?? "").trim() !== hemostasis[hk].raw) unmapped.push(t.name);
        continue;
      }
    }

    if (isQualitative(key)) {
      // مقدارِ عددیِ این ردیف‌ها بدونِ واحد بی‌معناست (BHB mmol/L یا mg/dL؟ ASO IU/mL؟) — واحد کنارِ مقدار می‌ماند، نه حدس.
      const uq = /^(aso|antistreptolysin|antihbs|hbsab|betahydroxybutyrate|bhb|bhydroxybutyrate)/.test(key) && String(t.unit ?? "").trim() && /^[<>≥≤]?\s*[\d.,]+$/.test(String(t.value).trim());
      qual[t.name] = uq ? `${String(t.value).trim()} ${String(t.unit).trim()}` : String(t.value);
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
    // P113 (۲۰۲۶-۱۰-۲۷): برعکسش هم لازم است — norm «%» را می‌زند، پس «NRBC%» و «NRBC#» هر دو
    //   به یک کلید می‌رسند و درصد به‌عنوان شمارشِ مطلق (×۱۰۰۰) خوانده می‌شد («NRBC% 1.2» ⇒ 1200).
    //   اگر نامِ ردیف درصدی است و «#» ندارد، درصد بماند.
    if (engineKey && engineKey.endsWith("_ABS") && isPct && !isAbs) {
      engineKey = engineKey.replace("_ABS", "_PCT");
    }

    // ⚠️ برگه‌های Sysmex بدون # می‌نویسند: "NEUT 4.31 [10^3/uL]"
    //    اگر واحد 10^3 بود یا عدد < 100 و درصد نبود → مطلق است نه درصد.
    //    بدون این، NEUT=4.31 به‌عنوان «۴.۳٪» خوانده می‌شد و
    //    نوتروپنی شدید کاذب می‌ساخت.
    if (engineKey?.endsWith("_PCT") && !isPct) {
      const u = String(t.unit || "");
      const looksAbsolute = /10\^?3|10\*3|K\/|\/uL|\/µL/i.test(u);
      const v0 = toNum(t.value);
      if (looksAbsolute || (v0 != null && v0 < 20 && !u.includes("%") && !diffUnitlessPct)) {
        engineKey = engineKey.replace("_PCT", "_ABS");
      }
    }
    if (!engineKey) engineKey = unitGatedKey(key, t.unit);
    if (!engineKey && key === "pct") engineKey = pctKey(t.unit);
    if (!engineKey) engineKey = ptInrKey(key, t.value);
    if (!engineKey) engineKey = urineHcgKey(key, t.value);
    if (!engineKey) {
      unmapped.push(t.name);
      continue;
    }
    rowNames[engineKey] ??= t.name;
    if (ambiguousThousands(t.value)) ambigComma.add(engineKey);
    if (QUAL_NO_READER.has(engineKey)) {
      if (!noReader.includes(engineKey)) noReader.push(engineKey);
      if (noReaderValues[engineKey] == null) noReaderValues[engineKey] = String(t.value ?? "");
      continue;
    }
    if (UNIT_KEPT.has(engineKey) && !(engineKey in printedUnits)) printedUnits[engineKey] = t.unit ?? null;
    // بازهٔ ردیفِ درصدی (۲–۵٪) مالِ کلیدِ *_ABS نیست؛ فقط ردیف‌های غیرِ دیفرانسیل.
    if (t.reference && !/_ABS$|_PCT$/.test(engineKey) && !(engineKey in printedRefsAll)) printedRefsAll[engineKey] = String(t.reference);
    if (t.reference && /(_ABS|_PCT)$/.test(engineKey) && !(engineKey in absRefs)) absRefs[engineKey] = String(t.reference);   // P113
    if (t.reference && /_PCT$/.test(engineKey) && !(engineKey in pctRefs)) pctRefs[engineKey] = String(t.reference);

    let v = toNum(t.value);
    if (v == null) {
      // عددِ کامادارِ مبهم («5,5,5») متن نیست که قاعده‌ای در qual بخواند — بی‌صدا گم می‌شد (N2).
      // به unmapped ⇒ «این تست‌ها … تفسیرشان نمی‌کند … با پزشک بررسی کنید».
      // بندِ ۴ (LIS ۲۰۲۶-۱۰-۰۶، [17]): «R.B.C = 4..81» (۴٫۸۱ با نقطهٔ دوتایی) همین شکل است — عددِ خراب، نه متن؛ در qual بی‌صدا می‌ماند. گارد L23.
      if (/^\s*[<>≤≥]?\s*[\d۰-۹٠-٩][\d۰-۹٠-٩.,٫٬\s]*$/.test(String(t.value ?? "")) && /[,٬]|[.٫]\s*[.٫]/.test(String(t.value))) {
        unmapped.push(t.name);
        continue;
      }
      // بازبینی ۲۰۲۶-۱۰-۱۳: عددِ خوانده‌نشده («7.5.»، «4.5 (3.8-5.2)»، «11.2 H.»، «7.5-») متن نیست؛ در qual هیچ قاعدهٔ عددی نمی‌خواندش
      //   (K 7.5. ⇒ گزارش طبیعی) و RBC/WBCِ خون را به «ادرار» می‌برد. بازه («8-10») و درجه («1+») و تیتر («1/160») سرِ جای خود می‌مانند.
      if (/^\s*[<>≤≥]?\s*[\d۰-۹٠-٩]+(?:[.,٫][\d۰-۹٠-٩]+)?\s*(?:\([^)]*\)|[.\s]*[HhLl]?[.\s]*|-)\s*$/.test(String(t.value ?? ""))
          && !/^\s*[\d۰-۹٠-٩]\s*\+/.test(String(t.value))) {
        unmapped.push(t.name);
        continue;
      }
      qual[t.name] = String(t.value);   // مقدار غیرعددی
      continue;
    }

    // ═══ مقدارِ سانسورشده («<6»، «>1000») — N5/N6 (لایهٔ ۲) ═══
    // 🔴 toNum علامتِ < را دور می‌ریخت: «CRP <6 mg/L» (حدِ بالای ۵) ⇒ «CRP شما 6 است … بالاست» و «CRP <6» بی‌واحد ⇒ «واحد نامعلوم، خارج از
    //    محدوده». «<x» فقط می‌گوید مقدار زیرِ x است: وقتی x از حدِ بالای مرجع بیشتر باشد (یا از حدِ پایین، اگر حدِ پایین > ۰)، طبیعی یا غیرطبیعی بودنش
    //    معلوم نیست؛ «>x» وقتی x کمتر از حدِ بالا باشد. نامعلوم ⇒ «تفسیر نشدند» (unmapped)، نه عددِ ساختگی. فقط وقتی واحدِ ردیف خالی یا
    //    همان واحدِ موتور است (مقایسه با بازهٔ متعارف فقط آن‌وقت معنا دارد؛ وگرنه رفتارِ قبلی).
    if (censoredIndeterminate(engineKey, t, v, ocr)) { unmapped.push(t.name); continue; }

    // ═══ specs/007 (N3): هماتوکریتِ بی‌واحدِ ≤ ۱ کسری است (0.39 = ۳۹٪) و MCHCِ بی‌واحدِ > ۱۰۰ g/L است ═══
    //    هیچ‌کدام با واحدِ متعارف ممکن نیست، ولی تبدیل از روی اندازه تا تأییدِ P48/P52 ممنوع است — پس
    //    سنجیده نمی‌شوند و به unmapped می‌روند («تفسیرشان نمی‌کند … با پزشک»). بی‌این، «Hct 0.39»ِ طبیعی
    //    «پایین» می‌شد و با بحرانِ هماتوکریت (patterns_utils، crisisArm) اورژانسِ کاذب. عددِ معمولی دست نمی‌خورد (M177b).
    // «ARC 1.2 %» ردیفِ RETIC ِ درصدیِ بدنام‌گذاری‌شده است، نه شمارشِ مطلق — حدس نمی‌زنیم کدام (M181).
    // بازبینیِ medium (M21، N3): PT/APTT/INR به درصد («PT 95 %»، فعالیتِ پروترومبین) با بازهٔ ثانیه/نسبت سنجیده می‌شد ⇒ INR 95٪ اورژانس.
    //   درصد واحدِ دیگری است و تبدیل ندارد ⇒ تفسیر نشدند.
    if ((engineKey === "PT" || engineKey === "APTT" || engineKey === "INR") && /%/.test(`${t.unit ?? ""} ${t.value ?? ""}`)) {
      unmapped.push(t.name);
      continue;
    }
    if (engineKey === "RETIC_ABS" && /%/.test(String(t.unit ?? ""))) {
      unmapped.push(t.name);
      continue;
    }
    // بازبینیِ کد N-c و پزشکی: واحدِ چاپ‌شده‌ای که با عدد نمی‌خواند هم حدس زده نمی‌شود — «Hct 0.39 %» کسری است،
    // «Hct 39 L/L» ۳۹۰۰ می‌شد و «MCHC 34 g/L» ۳.۴ (M182b، M182e). نه تبدیل، نه سنجش: unmapped.
    const hu = String(t.unit ?? "").trim().toLowerCase().replace(/\s+/g, "");
    if ((engineKey === "HCT" && ((hu === "%" && v <= 1) || (/^(l\/l|fraction)$/.test(hu) && v > 1))) ||
        (engineKey === "MCHC" && hu === "g/l" && v < 100)) {
      unmapped.push(t.name);
      continue;
    }
    // ترانسفرینِ بی‌واحدِ ≤ ۱۰ (g/L است نه mg/dL) و آنتی‌ترومبینِ بی‌واحدِ ≤ ۳ (IU/mL است نه ٪) — N3، حدس نمی‌زنیم.
    if (!String(t.unit ?? "").trim() && ((engineKey === "HCT" && v <= 1) || (engineKey === "MCHC" && v > 100) ||
        (engineKey === "TRANSFERRIN" && v <= 10) || (engineKey === "ATIII" && v <= 3))) {
      unmapped.push(t.name);
      continue;
    }
    // ═══ بند ۵ (LIS ۲۰۲۶-۱۰-۰۶، تصمیمِ کاربر «ب»، N3): CK-MB دو سنجهٔ جداست — فعالیت (U/L، حدِ بالا ~۲۵، همان بازهٔ refs.js)
    //   و جرم (ng/mL، حدِ بالا ~۵). ضریبِ تبدیل ندارند، پس UNIT_PROFILE هم نمی‌گیرند. پیش از این هر عددِ بی‌واحد با بازهٔ U/L
    //   سنجیده می‌شد: «CK-MB 13» از کیتِ جرمی (بالا) «طبیعی» خوانده می‌شد. حالا: U/L ⇒ همان سنجش؛ واحدِ جرمی ⇒ بی‌بازه (noRef)؛
    //   بی‌واحد ⇒ unit_unknown_values (عدد نقل، بی‌حکم). گارد L19.
    if (engineKey === "CK_MB") {
      const cu = String(t.unit ?? "").trim().toLowerCase().replace(/\s+/g, "");
      if (!/^(i?u\/l|i?u\/lit(er|re)?)$/.test(cu)) {
        if (cu) {
          if (!noReader.includes("CK_MB")) noReader.push("CK_MB");
          noReaderValues.CK_MB ??= String(t.value ?? "").trim();
        } else ckmbUnitless ??= { value: v, reference: t.reference ?? null };
        continue;
      }
    }

    // ═══ واحدِ نانوشته (specs/003) — پیش از هر تبدیلی، تا شاخه‌های پایین واحدِ قطعی ببینند ═══
    t = resolveRowUnit(engineKey, t, v);
    if (!t) continue;

    // پرولاکتینِ بی‌واحد با محدودهٔ چاپ‌شدهٔ بالای ۶۰ (۱۰۲–۴۹۶) mIU/L است، نه ng/mL: حدِ بالای ng/mL هیچ‌وقت نزدیکِ ۶۰ نیست.
    //   بدون این، «PRL 400» بی‌واحد ⇒ «۴۰۰ ng/mL … هیپوفیز» (هشدارِ کاذب، N3/N5). بی‌محدودهٔ چاپ‌شده همان رفتارِ قبلی (ng/mL).
    if (engineKey === "PRL" && !String(t.unit ?? "").trim() && t.reference) {
      const pr = parseReference(t.reference, inferSex(ocr));
      if (pr?.hi >= 60) t = { ...t, unit: "mIU/L", _basis: "reference" };
    }
    // مدتِ پرهیزِ منی بر حسب «روز» سنجیده می‌شود؛ «72 hours» (= ۳ روز) «۷۲ روز» خوانده می‌شد.
    if (engineKey === "SEMEN_ABSTINENCE" && /^(h|hr|hrs|hour|hours|ساعت)$/i.test(String(t.unit ?? "").trim())) v = v / 24;

    // ═══ IFCC — واحدِ SI روی برگه → واحدِ متعارفی که refs.js می‌فهمد ═══
    // ⚠️ کلاسِ N3: «درجه‌بندیِ عددِ برگه با واحدی که برگه استفاده نکرده».
    //    تا امروز فقط پنج تست محافظ داشتند و هرکدام بعد از یک باگِ واقعی.
    //    units.js همان محافظ را برای بقیه می‌گذارد — و فقط وقتی واحدِ برگه
    //    *صریحاً* SI باشد (تنها استثنا HbA1c؛ دلیلش در units.js).
    //    این باید *قبل* از شاخه‌های اختصاصی بیاید تا UREA هم پوشش بگیرد،
    //    ولی کلیدهای دارای تبدیلِ اختصاصی عمداً در جدولِ units.js نیستند
    //    تا تبدیل دوبار اعمال نشود.
    {
      const c = toConventional(engineKey, v, t.unit);
      if (c.converted) {
        unitConversions.push({
          test: engineKey, raw: v, from: c.from, value: c.value, to: c.to,
          // HbA1cِ بی‌واحدِ > ۲۰ از *اندازه* mmol/mol شد، نه از برگه — «printed» ادعای غلط بود.
          basis: t._basis ?? (c.inferred ? "magnitude" : "printed"),
        });
        v = c.value;
      }
    }

    // ═══ تستوسترون — ng/mL در برگه‌های ایرانی رایج است (بازبینی، N3) ═══
    // 🔴 «Testosterone 4.5 ng/mL» (= ۴۵۰ ng/dL، طبیعی) با حدِ ۳۰۰ ng/dL سنجیده می‌شد و مردِ سالم
    //    می‌خواند «تستوسترونِ شما 4.5 ng/dL است و از حدِ 300 کمتر است». ضریبِ ۱۰۰ تعریفِ واحد است.
    //    بی‌واحد → حکم نه: ۴.۵ و ۴۵۰ هر دو محتمل‌اند و حدس زدن از روی عدد همان N3 است.
    if (engineKey === "TESTO") {
      const u = String(t.unit || "").toLowerCase().replace(/\s+/g, "");
      if (/^ng\/ml$/.test(u)) {
        const nv = Math.round(v * BRANCH_FACTORS.TESTO_NGML_TO_NGDL);
        unitConversions.push({ test: "TESTO", raw: v, from: "ng/mL", value: nv, to: "ng/dL", basis: t._basis ?? "printed" });
        v = nv;
      }
      // بی‌واحد/ناشناخته دیگر اینجا نمی‌رسد: resolveRowUnit بالا آن را «نامعلوم» کرده است.
    }
    if (/^\s*[<>≤≥]/.test(String(t.value ?? ""))) rawText[engineKey] = String(t.value).trim();

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
      tests.T3 = Math.round(v * BRANCH_FACTORS.T3_NMOL_TO_NGDL);
      // N5 (برگهٔ واقعی ۲۰۲۶-۱۱-۰۸: «T3 1.78 nmol/L»): بی‌رکورد، بیمار «T3 تام 116» می‌دید و عددِ برگه‌اش را پیدا نمی‌کرد.
      unitConversions.push({ test: "T3", raw: v, from: "nmol/L", value: tests.T3, to: "ng/dL", basis: t._basis ?? "printed" });
      continue;
    }
    // ۲۰۲۶-۱۰-۱۶ (N3): ng/mL ⇒ ×۱۰۰ (همان عاملِ تعریفیِ تستوسترون). پیش‌تر «T3 1.2 ng/mL» خام با ۸۰–۱۸۰ سنجیده می‌شد.
    if (engineKey === "T3" && /^ng\/ml$/i.test(String(t.unit || "").replace(/\s+/g, ""))) {
      tests.T3 = Math.round(v * BRANCH_FACTORS.TESTO_NGML_TO_NGDL);
      unitConversions.push({ test: "T3", raw: v, from: "ng/mL", value: tests.T3, to: "ng/dL", basis: t._basis ?? "printed" });
      continue;
    }

    // ⚠️ شمارش مطلق: برگه معمولاً 10^3/uL می‌دهد (مثل NEU# = 3.66)
    //    موتور /µL می‌خواهد. اگر عدد کوچک بود، ضرب در 1000.
    // 🔴 بازبینیِ متامورفیک ۲۰۲۶-۱۰-۰۵ (N3/N12): واحدِ خامِ چاپ‌شده («/µL»، «cells/µL») نادیده گرفته می‌شد —
    //    «NEUT# 90 /µL» (آگرانولوسیتوز) ۹۰۰۰۰ و «کمی بالا، نوبتِ عادی» می‌شد. با واحدِ خام: عددِ صحیحِ ≥ ۱۰ همان شمارش است؛
    //    عددِ اعشاری با واحدِ خام ناممکن است (سلول کسری نیست) ⇒ OCR ۱۰³ را انداخته ⇒ همان ×۱۰۰۰ِ قبلی؛ صحیحِ < ۱۰ مبهم ⇒ unmapped.
    //    🔴 بازبینیِ کد (P84، H2): صحیحِ < ۱۰ با واحدِ خام پیش‌تر unmapped می‌شد؛ شمارشِ خامِ زیرِ ۱۰ عملاً گزارش نمی‌شود، پس همان ×۱۰۰۰ِ HEAD.
    if (engineKey.endsWith("_ABS")) {
      const rawU = rawCountUnit(t.unit);
      if (v < 100 && !(rawU && Number.isInteger(v) && v >= 10)) {
        tests[engineKey] = Math.round(v * 1000);
        continue;
      }
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
      // واحدِ صریحِ خام: /µL یا /mm³ بدون هیچ نشانهٔ 10^3
      const rawUnit = rawCountUnit(t.unit);
      const RAW_MIN = { WBC: 1000, PLT: 3000, RBC: 100 }[engineKey];
      const DIVISOR = engineKey === "RBC" ? 1e6 : 1000;
      // 🔴 بازبینیِ متامورفیک ۲۰۲۶-۱۰-۰۵: `rawUnit && v >= RAW_MIN` زیرمجموعهٔ `v >= RAW_MIN` بود، پس واحدِ خام هیچ اثری
      //    نداشت — «WBC 800 /µL» (لکوپنیِ شدید) ۸۰۰ K/µL و «بسیار بالا، اورژانس» می‌شد (جهتِ وارونه). با واحدِ خام و عددِ صحیح،
      //    عدد شمارش است تا کفِ RAW_FLOOR (کمتر از آن برای WBC/PLT گزارش نمی‌شود ⇒ مبهم ⇒ unmapped)؛ اعشاری = OCR ۱۰³ را انداخته.
      // 🔴 بازبینیِ کد (P84، H2): زیرِ کف پیش‌تر unmapped می‌شد و «Platelet 15 /µL» اورژانسِ ترومبوسیتوپنی را بی‌صدا از دست می‌داد.
      //    شمارشِ خامِ زیرِ کف (پلاکت < ۱۰۰۰، WBC < ۱۰۰ در میکرولیتر) گزارش نمی‌شود ⇒ OCR ۱۰³ را انداخته ⇒ همان خوانشِ K ِ HEAD.
      const RAW_FLOOR = { WBC: 100, PLT: 1000 }[engineKey];
      const rawCount = rawUnit && RAW_FLOOR != null && Number.isInteger(v) && v >= RAW_FLOOR;
      if (v >= RAW_MIN || rawCount) {
        const scaled = v / DIVISOR;
        tests[engineKey] = engineKey === "RBC" ? +scaled.toFixed(2) : (scaled < 1 ? +scaled.toFixed(2) : +scaled.toFixed(1));
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
      // حدِ بالای چاپ‌شدهٔ خودِ برگه (عددِ چاپ‌شده ÷ حدِ چاپ‌شده ⇒ بی‌وابستگی به واحد). ISTH: «متوسط/شدید» نسبت به بازهٔ
      // همان آزمایشگاه است (CLSI EP28؛ بازبینیِ متخصص ۲۰۲۶-۰۹-۳۰). بازه‌ای که کنارِ عدد معقول نباشد (×۱۰۰۰) نادیده می‌ماند (B7).
      { const pr = t.reference ? parseReference(t.reference, inferSex(ocr)) : null;
        if (pr?.hi > 0 && v > 0 && v / pr.hi <= 1000) tests._ddimer_ratio = v / pr.hi; }
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
        tests.ACR = +(v * BRANCH_FACTORS.ACR_MGMMOL_TO_MGG).toFixed(1);          // mg/mmol → mg/g
        // specs/021 (P133، G1): ردهٔ KDIGO با عددِ چاپی و مرزهای mg/mmol (۳/۳۰) گرفته می‌شود — پایینِ حلقهٔ درجه‌بندی.
        tests._acr_mgmmol = v;
        unitConversions.push({ test: "ACR", raw: v, from: "mg/mmol", value: tests.ACR, to: "mg/g", basis: t._basis ?? "printed" });
      } else {
        tests.ACR = v;                               // mg/g یا µg/mg (معادل)
      }
      continue;
    }

    if ((engineKey === "CREAT" || engineKey === "LDH") && t.reference) printedRefs[engineKey] = String(t.reference);
    tests[engineKey] = v;
  }

  curRow = null;
  const valueConflicts = [];
  {
    const sexR = inferSex(ocr), ageR = inferAge(ocr) ?? 40;
    const same = (a, b) => Math.abs(a - b) <= 0.01 * Math.max(Math.abs(a), Math.abs(b));   // دو واحدِ یک عدد (کراتینین ۱٫۲ و ۱۰۶ µmol/L)
    for (const [k, list] of Object.entries(candidates)) {
      const uniq = list.filter((c, i) => !list.slice(0, i).some((p) => same(p.value, c.value)));
      if (uniq.length < 2) { testsObj[k] = list[0].value; continue; }
      // عددِ ناممکن در انتخاب شرکت نمی‌کند (خودش پایین‌تر «تفسیر نشدند» می‌شود)؛ اگر هیچ‌کدام ممکن نیست، رفتارِ قبلی.
      const live = uniq.filter((c) => possibleValue(k, c.value));
      if (!live.length) continue;
      const r = getRef(k, sexR, ageR);
      const width = r ? Math.max(r[1] - r[0], 1e-9) : 1;
      const off = (v) => (r ? Math.max(r[0] - v, v - r[1], 0) / width : 0);
      // بدترین: دورترین از محدوده؛ تساوی ⇒ اولی (قاعدهٔ هموستاز).
      const kept = live.reduce((best, c) => (off(c.value) > off(best.value) ? c : best), live[0]);
      testsObj[k] = kept.value;
      const dropped = uniq.filter((c) => c !== kept);
      for (const d of dropped) if (!unmapped.includes(d.name)) unmapped.push(d.name);
      const reason = off(kept.value) > Math.max(...dropped.map((d) => (possibleValue(k, d.value) ? off(d.value) : -1))) ? "worse" : "first";
      valueConflicts.push({ key: k, name: faName(k), kept, dropped, reason });
    }
  }
  // P93 (دیابتِ بارداری، ۲۰۲۶-۱۰-۰۶): نامِ چاپ‌شدهٔ ردیفِ قندی که سنجیده شد — «ناشتا»ی صریح؟ OGTT یا «بعد از غذا»؟
  //   معیارِ IADPSG فقط برای ناشتای صریح و آزمونِ ۷۵ گرمی است (تصمیمِ کاربر). ردیفِ ۳ساعته ⇒ آزمونِ ۱۰۰ گرمی، معیارِ دیگر.
  const glucoseNames = {};
  for (const k of ["GLU_F", "GLU_2H", "GLU_1H"]) {
    if (typeof testsObj[k] === "number") glucoseNames[k] = valueConflicts.find((c) => c.key === k)?.kept.name ?? writer[k]?.name ?? null;
  }
  const ogtt100g = (ocr?.tests || []).some((t) => t?.name && /(gtt|ogtt|glucose|قند)/.test(norm(t.name)) && /(3h|3hr|3hour|۳ساعت|3ساعت|سهساعت)/.test(norm(t.name)));

  // ═══ عددِ ناممکن سنجیده نمی‌شود (بازبینیِ متامورفیک ۲۰۲۶-۱۰-۰۵، N3) ═══
  // 🔴 «K 55» (اعشارِ افتاده)، «K 2,625» (کامای سه‌رقمی ⇒ ۲۶۲۵) و «Na 1400» اورژانسِ هیپرکالمی/هیپرناترمی می‌گرفتند — در «K 2,625»
  //    جهت هم وارونه بود (پتاسیمِ پایین). «HCT 2» از «HCT 8»ِ اورژانسی «نوبتِ عادی» می‌گرفت. عددی که با هیچ بدنِ زنده‌ای جور
  //    نیست خوانده نشده است، نه غیرطبیعی: به unmapped («تفسیر نشدند … با پزشک») می‌رود، نه به درجه‌بندی.
  for (const k of Object.keys(tests)) {
    // P86: «Bilirubin 1,200»، «Urea 1,200»، «FT4 1,200» ⇒ ۱۲۰۰ و اورژانس، در حالی که هزارگان برای این کلیدها ناممکن است.
    //    فقط برای کامای مبهم، سقفِ SURVIVAL_LIMITS برای *همهٔ* کلیدهای آن جدول اعمال می‌شود (نه فقط POSSIBLE_GATED).
    const ceil = SURVIVAL_LIMITS[k]?.[1] ?? AMBIG_CEILING[k];
    const ambigImpossible = ambigComma.has(k) && ceil != null && tests[k] > ceil;
    if (typeof tests[k] === "number" && (ambigImpossible || !possibleValue(k, tests[k]))) {
      // ردیف‌هایی که پیش از نگاشتِ عمومی خوانده می‌شوند (الکتروفورز، …) در rowNames نیستند ⇒ نامِ چاپ‌شده از خودِ برگه.
      unmapped.push(rowNames[k] ?? (ocr?.tests || []).find((t) => t?.name && mapKey(norm(t.name)) === k)?.name ?? faName(k));
      delete tests[k];
    }
  }

  // ═══ یک آزمایش، یک مالک ═══
  // 🔴 بازبینی: دو ردیفِ یک کلید (مثلاً «Creatinine 1.0 mg/dL» و «Creatinine 88» بی‌واحد — برگه‌هایی که
  //    هر دو واحد را چاپ می‌کنند و OCR واحدِ دومی را نخوانده) هم سنجیده می‌شد و هم «واحد نامعلوم»
  //    می‌گرفت: دو یافته دربارهٔ یک عدد (N20). ردیفِ واحددار مالک است.
  for (const k of Object.keys(unitUnknown)) if (tests[k] != null) delete unitUnknown[k];

  // ═══ سطرِ «واحد» برای بیمار (FR-006) ═══
  // هر تبدیل می‌گوید واحد از کجا آمد. تعیینِ واحد از شواهد، حتی بی‌تبدیلِ عددی (سیستمِ متعارف)،
  // سطر می‌گیرد — چون خودِ «واحد روی برگه نبود و ما تعیینش کردیم» باید دیده شود.
  for (const c of unitConversions) c.basis ??= "printed";
  for (const [k, r] of Object.entries(unitResolved)) {
    if (tests[k] == null || unitConversions.some((c) => c.test === k)) continue;
    unitConversions.push({ test: k, raw: r.raw, from: r.from, value: tests[k], to: getUnit(k), basis: r.basis });
  }
  // P110-ج: واحدِ چاپ‌شدهٔ ناشناخته روی سطرِ «واحدها» — تا «بدونِ واحد» نوشته نشود (N5).
  for (const c of unitConversions) if (unitResolved[c.test]?.printedUnit && c.basis !== "printed") c.printedUnit = unitResolved[c.test].printedUnit;

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
    for (const k of ["NEUT_ABS", "LYMPH_ABS", "MONO_ABS", "EOS_ABS", "BASO_ABS", "BAND_ABS"]) {
      delete tests[k];
    }
    for (const k of diffPcts.length ? ["NEUT_PCT","LYMPH_PCT","MONO_PCT","EOS_PCT","BASO_PCT","BAND_PCT"] : []) {
      delete tests[k];
    }
  }

  // Diff درصد → مطلق
  if (tests.WBC && !diffFailed) {
    const abs = tests.WBC * 1000;
    for (const [p, a] of [
      ["NEUT_PCT", "NEUT_ABS"], ["LYMPH_PCT", "LYMPH_ABS"],
      ["MONO_PCT", "MONO_ABS"], ["EOS_PCT", "EOS_ABS"], ["BASO_PCT", "BASO_ABS"], ["BAND_PCT", "BAND_ABS"],
    ]) {
      if (tests[p] != null && tests[a] == null) {
        tests[a] = Math.round((abs * tests[p]) / 100);
        derivedAbs[a] = tests[p];
        if (pctRefs[p]) derivedAbsRefs[a] = pctRefs[p];
      }
    }
  }

  // specs/014 (R6): «Fluid Type» کنارِ Glucose/LDHِ برهنه — نمی‌دانیم مالِ مایع‌اند یا سرم (درخواستِ ۲۸ هر دو را دارد).
  //   دوباره‌نسبت داده نمی‌شوند (FR-004)؛ فقط نامشان برای جملهٔ احتیاط. «Protein»ِ برهنه mapKey ندارد و در unmapped هست.
  if (specimenEv.fluidTypeRow) {
    for (const t of ocr?.tests || []) {
      const n = t?.name ? norm(t.name) : "";
      const twin = BARE_FLUID_LOOKALIKES[n];
      if (twin && mapKey(n) && !specimen.fluid.some((r) => r.id === twin) && !specimen.bareServingFluidNames.includes(t.name)) {
        specimen.bareServingFluidNames.push(t.name);
        // P87 تصمیمِ ۱۱: کلیدِ موتور هم، تا patterns.js جملهٔ شرطی را به یافته‌های همان عدد بچسباند.
        specimen.bareServingFluidKeys.push({ name: t.name, key: mapKey(n), twin });
      }
    }
  }

  return {
    tests: testsObj,
    valueConflicts,
    ambiguousPh,
    glucoseNames,
    ogtt100g,
    qual,
    semenQual,
    smear: mergeSmear(smearItems),
    rbcMorph: mergeRbcMorph(rbcMorphItems),
    hemostasis,
    prenatal,
    specimen,
    labComments,
    serologyRef,
    serologyAssay,
    unitUnknown,
    rawText,
    unmapped,
    noReader,
    noReaderValues,
    ckmbUnitless,
    printedRefs,
    printedRefsAll,
    absRefs,
    derivedAbs,
    derivedAbsRefs,
    diffMixed,
    printedUnits,
    unitConversions,
    diffFailed,
    unreadableKeys,
    sex: inferSex(ocr),
    age: inferAge(ocr),
    pregnant: inferPregnant(ocr),
    gestWeeks: inferGestWeeks(ocr),
  };
}

// P53 پرسش ۲: «باردار» فقط از ورودیِ خودِ کاربر (فرم: patient.pregnant = true) — هرگز از متنِ برگه حدس زده نمی‌شود.
// مردِ «باردار» یا جنسِ نامعلوم اثری ندارد (getRef فقط برای F).
function inferPregnant(ocr) {
  const v = ocr?.patient?.pregnant;
  return v === true || /^(true|yes|بله|باردار)$/i.test(String(v ?? "").trim());
}

// سنِ بارداری (هفته): فقط از ورودیِ خودِ کاربر (فرم/پروفایل: patient.gestWeeks)، هرگز از متنِ برگه. عددِ صحیحِ ۱ تا ۴۲، وگرنه null.
export const GEST_WEEKS_RANGE = [1, 42];
function inferGestWeeks(ocr) {
  const raw = String(ocr?.patient?.gestWeeks ?? "").trim().replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  if (!/^\d{1,2}$/.test(raw)) return null;
  const n = Number(raw);
  return n >= GEST_WEEKS_RANGE[0] && n <= GEST_WEEKS_RANGE[1] ? n : null;
}

/**
 * اجرای موتور روی خروجی OCR
 * @returns خروجی ساختاریافته برای پرامپت
 */
// ═══ نوبتِ قبلی (P108-ج) ═══
// ورودی: ocr.prior = { date, graded: [{ test, value, abnormal, dir, range }] }   (از `_engine.tests` ِ نتیجهٔ ذخیره‌شده)
//                   یا { date, tests: [ردیف‌های خام] }                             (همان قالبِ برگه؛ با همان بیمار درجه‌بندی می‌شود)
//        ocr.sampleDate = تاریخِ نمونهٔ فعلی (پیش‌فرض: اکنون).
// خروجی: { weeks, ALT?, AST? } — فقط کلیدهایی که در نوبتِ قبلی سنجیده شده‌اند. تاریخِ نامعتبر یا آینده ⇒ null (نوبتِ قبلی نداریم).
const PRIOR_KEYS = ["ALT", "AST"];
const PRIOR_AGE_TOLERANCE_Y = 1.5;
/** تاریخِ نمونهٔ فعلی: ocr.sampleDate (سرور از برگه خوانده) یا patient.sample_date (رشتهٔ چاپ‌شده) ⇒ ISO یا null. */
function sampleDateOf(ocr) {
  if (ocr?.sampleDate && Number.isFinite(Date.parse(ocr.sampleDate))) return String(ocr.sampleDate);
  return parseSampleDate(ocr?.patient?.sample_date);
}
function priorVisit(ocr, sex, age) {
  const p = ocr?.prior;
  if (!p || typeof p !== "object") return null;
  const sd = sampleDateOf(ocr);
  const t0 = Date.parse(p.date), t1 = sd ? Date.parse(sd) : Date.now();
  if (!Number.isFinite(t0) || !Number.isFinite(t1)) return null;
  // نتیجهٔ قبلی هست ولی تاریخش از نمونهٔ فعلی جلوتر نیست (همان برگه دوباره فرستاده شد): «نوبتِ قبلی» نیست، ولی «تنها نتیجه» هم نیست.
  if (t0 >= t1) return { weeks: 0, notEarlier: true };
  // یک حساب ممکن است برگهٔ عضوِ دیگرِ خانواده را هم بفرستد: جنسِ متفاوت ⇒ همان شخص نیست ⇒ نوبتِ قبلی نداریم.
  if (p.sex && sex && p.sex !== sex) return null;
  // و سن (تصمیمِ کاربر ۲۰۲۶-۱۰-۱۶): سنِ امروز باید با سنِ نوبتِ قبلی + فاصلهٔ دو نوبت بخواند. سن روی برگه به سالِ کامل چاپ می‌شود ⇒
  //   ۱٫۵ سال رواداری (گرد کردن + تولدِ میانِ دو نوبت). ناهمخوان ⇒ شخصِ دیگر ⇒ نوبتِ قبلی نداریم.
  if (typeof p.age === "number" && typeof age === "number") {
    const years = (t1 - t0) / (365.25 * 24 * 3600 * 1000);
    if (Math.abs(age - (p.age + years)) > PRIOR_AGE_TOLERANCE_Y) return null;
  }
  let graded = Array.isArray(p.graded) ? p.graded : null;
  if (!graded && Array.isArray(p.tests)) graded = runEngine({ patient: { sex, age, ...(ocr.patient ?? {}) }, tests: p.tests }).graded;
  if (!graded) return null;
  const out = { weeks: +((t1 - t0) / (7 * 24 * 3600 * 1000)).toFixed(1) };
  for (const k of PRIOR_KEYS) {
    const g = graded.find((x) => (x.test ?? x.key) === k && typeof x.value === "number");
    if (g) out[k] = { value: g.value, abnormal: !!g.abnormal, dir: g.dir ?? null, range: g.range ?? null };
  }
  return PRIOR_KEYS.some((k) => out[k]) ? out : null;
}

/** P113: بازهٔ چاپ‌شدهٔ ردیفِ *_ABS را به واحدِ موتور (/µL) می‌برد.
 *  برگه‌ها این بازه را در ۱۰³/µL می‌چاپند («0.10 - 1.20») و موتور مقدار را در /µL نگه می‌دارد؛
 *  اگر هر دو کران زیرِ ۱۰۰ باشند مقیاس ۱۰³ است. بی‌بازه یا نامعتبر ⇒ null (بازهٔ داخلی می‌ماند). */
function absPrintedRange(printed, key = "") {
  const p = printedRangePair(printed);
  if (!p) return null;
  // درصد هرگز مقیاس نمی‌خورد؛ ۱۰³/µL فقط وقتی هر دو کران زیرِ ۱۰۰ باشند.
  const scale = /_PCT$/.test(key) ? 1 : (p[1] < 100 ? 1000 : 1);
  return [p[0] * scale, p[1] * scale];
}

/** P114: بازهٔ چاپ‌شدهٔ یک ردیف → [lo, hi] در واحدِ موتور؛ یک‌طرفهٔ «< 530» با کفِ ۰.
 *  برای LDH که سقفِ کیت‌ها ۲۴۰–۵۳۰ است، مرجعِ خودِ آزمایشگاه سنجهٔ درست است. */
function printedRangePair(printed) {
  if (!printed) return null;
  const p = parseReference(String(printed), null);
  if (!p || p.hi == null || !(p.hi > 0)) return null;
  return [p.lo ?? 0, p.hi];
}

export function runEngine(ocr, opts = {}) {
  // P113 (۲۰۲۶-۱۰-۲۷): `{ diagnostics: true }` کلیدِ `phenoAgeDiag` را اضافه می‌کند (چرا سنِ زیستی ساخته نشد).
  //   ⚠️ پیش‌فرض خاموش است تا خروجیِ موتور برای همهٔ فراخوان‌های دیگر — و همهٔ فریزهای بایت‌به‌بایت — دست‌نخورده بمانَد.
  const wantDiag = opts?.diagnostics === true;
  const { tests, qual, semenQual, smear, rbcMorph, hemostasis, prenatal, specimen, labComments, serologyRef, serologyAssay, unitUnknown, rawText, unmapped, noReader, noReaderValues, ckmbUnitless, printedRefs, printedRefsAll, absRefs, derivedAbs, derivedAbsRefs, diffMixed, printedUnits, unitConversions, diffFailed, unreadableKeys, sex, age, pregnant, gestWeeks, valueConflicts, ambiguousPh, glucoseNames, ogtt100g } = ocrToEngineInput(ocr);
  const pregnantF = pregnant && sex === "F";
  const gestWeeksF = pregnantF ? gestWeeks : null;

  // specs/011 (P66): شناسه یا برچسبِ قدیمیِ فارسی → شناسهٔ کاتالوگ. regexِ سرطان همان قبلی است (در conditions.js).
  const conditions = conditionIds(ocr?.patient?.conditions).ids;
  const isCancerPatient = conditions.includes("cancer");

  // ═══ تصحیح‌های مشتق (پیش از درجه‌بندی، تا CTCAE و الگوها روی مقدار درست کار کنند) ═══
  const derived = {};

  // R1 — کلسیم تصحیح‌شده با آلبومین: Ca_corr = Ca + 0.8×(4.4 − Alb[g/dL]).
  //   در هیپوآلبومینمی کلسیم توتال کاذب پایین می‌شود؛ CTCAE هم کلسیم تصحیح‌شده می‌خواهد.
  //
  // 🔴 ۲۰۲۶-۰۸-۰۶: آلبومینِ مرجع از ۴.۰ به ۴.۴ رفت. این همان معادلهٔ ۱۶.۱ در
  //    Henry فصل ۱۶ است و متن صریح است: «آلبومینی حدودِ ۴.۴ معمولاً به‌عنوان
  //    مقدارِ نرمال در فرمولِ بالا به کار می‌رود.» عددِ ۴.۰ منبعِ ثبت‌شده‌ای
  //    در این مخزن نداشت.
  //    اثرِ اندازه‌گیری‌شده: تصحیح ۰.۳۲ mg/dL بیشتر می‌شود (۰.۸ × ۰.۴). جهتش
  //    مهم است — موتور تا امروز *کم‌تصحیح* می‌کرد، یعنی در هیپوآلبومینمی
  //    هایپوکلسمی را بزرگ‌تر از واقع و هایپرکلسمی را کوچک‌تر از واقع نشان می‌داد.
  //    نمونهٔ تستِ engine.test.js (Ca 8.0 + Alb 2.0): ۹.۶ → ۹.۹.
  const CA_CORR_NORMAL_ALB = 4.4;
  // ═══ P111 (بازبینیِ ۲۰۲۶-۱۰-۲۰): تصحیح فقط در هیپوآلبومینمی ═══
  //   فرمول برای حالتی ساخته شده که آلبومینِ پایین کلسیمِ توتال را کاذب پایین می‌آورد. وقتی آلبومین *بالای*
  //   ۴٫۴ است، همان فرمول کلسیمِ واقعیِ ۹٫۹ را به ۹٫۲ «تصحیح» می‌کند — یعنی یک هیپوکلسمیِ ساختگی روی برگهٔ
  //   مردی با آلبومین ۵٫۳. با آلبومینِ ۴٫۴ و بالاتر هیچ تصحیحی لازم نیست و عددِ چاپ‌شده همان است که سنجیده می‌شود.
  if (tests.CA != null && tests.ALB != null && tests.ALB < CA_CORR_NORMAL_ALB) {

    const caCorr = +(tests.CA + 0.8 * (CA_CORR_NORMAL_ALB - tests.ALB)).toFixed(1);
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

  // ⚠️ `_trop_hs` را ocrToEngineInput روی `tests` گذاشته، ولی حلقهٔ درجه‌بندی
  //    پایین‌تر هر کلیدِ زیرخط‌دار را رد می‌کند و هیچ‌جای دیگری هم آن را
  //    نمی‌خواند. الگوها فقط `graded`/`qual`/`indices` را می‌بینند، پس بدونِ
  //    این خط پرچم به قاعده نمی‌رسد. (`_ddimer_raw` دقیقاً همین‌طور نوشته شد و
  //    تا امروز هیچ‌کس نمی‌خواندش — نمونهٔ زندهٔ همین تله.)
  if (tests._trop_hs) derived.trop_hs_assay = true;
  // همان تلهٔ `_trop_hs`: پرچم روی `tests` است ولی الگوها فقط `indices` را می‌بینند.
  if (tests._crp_hs) derived.crp_hs_assay = true;
  if (tests._trop_uln != null) derived.trop_uln_ugl = tests._trop_uln;
  if (tests._trop_uln_tnt) derived.trop_uln_source = "tnt_default";   // M24: حدِ پیش‌فرضِ hs-cTnT، نه چاپِ برگه

  const graded = [];
  // کیفی‌های بی‌خواننده (QUAL_NO_READER) از اول اینجا‌اند — خطِ «تفسیر نشدند»، نه qual (specs/004، N25).
  const noRef = [...noReader];
  // ═══ کانالِ «شناخته‌شده ولی بی‌قضاوت» (فصل ۲۶، P47؛ طراحیِ مشترک با P46) ═══
  // مقدارهایی که عمداً با بازه سنجیده نمی‌شوند ولی قاعده‌ای مالکشان است. هر ورودی دلیل دارد:
  //   pediatric / sex_unknown / cycle_day_unknown / hcg_positive → reproductive_hormone_context
  //   threshold → قاعدهٔ خودش با آستانهٔ تشخیصیِ تأییدشده (hCG، پروژسترونِ روزِ ۲۱)
  //   context   → semen_analysis (مدتِ پرهیز، تعدادِ کل)
  //   no_range  → بازه‌ای تأیید نشده؛ *در noRef هم می‌ماند* تا هشدارِ «تفسیر نشد» به بیمار برسد،
  //               و فقط برای نقلِ عدد در یافتهٔ دیگر (مثلاً LH/FSH کنارِ تستوسترونِ پایین) اینجاست.
  // ⚠️ این کانال به _engine سریال نمی‌شود و val(e) آن را نمی‌خواند (N17).
  const ungraded = {};
  for (const k of noReader) ungraded[k] = { value: noReaderValues[k], reason: "no_range" };
  // specs/012 (P68، C1): Anti-Tg/TRAb فقط در برابرِ بازهٔ چاپ‌شدهٔ همان ردیف — دلیلِ یکتا «assay_printed» (N25: هیچ خوانندهٔ دیگری این دلیل را نمی‌خواند).
  for (const [k, a] of Object.entries(serologyAssay ?? {})) ungraded[k] = { value: a.value, cmp: a.cmp, shown: a.shown, unit: a.unit, state: a.state, raw: a.raw, reference: a.reference, ...(a.name ? { name: a.name } : {}), reason: "assay_printed" };
  const hcgPositive = (tests.HCG != null && tests.HCG > HCG_POSITIVE_ABOVE) ||
    Object.entries(qual).some(([k, v]) => HCG_QUAL_NAME_RE.test(k) && /pos|positive|مثبت|\+/i.test(String(v)));
  const FEMALE_CYCLE_KEYS = new Set(["LH", "FSH", "E2", "PROG"]);

  // واحدِ نامعلوم (specs/003): سنجیده نمی‌شود. `alt` حکمِ «طبیعی/غیرطبیعی» در *هر* سیستمِ واحد است
  // — فقط برای فوریتِ unit_unknown_values (هر دو غیرطبیعی → این هفته). جهت عمداً نگه داشته نمی‌شود:
  // قندِ ۱۵ در mg/dL پایین و در mmol/L بالاست.
  //
  // 🔴 بازبینیِ پزشکی (B1–B5): «بی‌واحد، شدت دانستنی نیست» فقط وقتی درست است که خوانش‌ها اختلاف کنند.
  //    کلسیمِ ۱۵ (۱۵ mg/dL بحرانی؛ ۱۵ mmol/L = ۶۰ mg/dL ناممکن)، Hbِ ۵.۵، کراتینینِ ۸ یا ۹۰۰ با *هر*
  //    خوانشِ ممکن خطرناک‌اند و سقفِ «این هفته» روی آن‌ها توصیهٔ غلط بود. و محدودهٔ مرجعِ چاپ‌شده، حتی وقتی
  //    واحد را تعیین نکند، هم‌واحدِ خودِ عدد است: تروپونینِ ۴۵ کنارِ «<19» با هر واحدی بالای صدکِ ۹۹ِ همان
  //    آزمایشگاه است. پس فوریت از یک محاسبه می‌آید (N20)، و آن محاسبه *خودِ موتور* است، نه جدولِ تازه:
  //      الف) محدودهٔ چاپ‌شده هست ⇒ عدد به نسبتِ کرانِ همان محدوده به بازهٔ موتور برده و یک‌بار سنجیده
  //           می‌شود (شدت‌بندیِ CTCAE هم مضربِ ULN است، پس این همان سنجه است).
  //      ب)  نیست ⇒ هر خوانشِ *ممکن* (SURVIVAL_LIMITS) سنجیده می‌شود و کمینهٔ فوریت‌ها برنده است. اگر
  //           همه اورژانس‌اند، اورژانس — بی‌جهت. عددی که در یک واحد طبیعی است هرگز در همه بحرانی نیست،
  //           پس اورژانسِ کاذبی که specs/003 بست برنمی‌گردد.
  //    استثناها: نوزاد (بازهٔ موتور برای بیلی‌روبینِ نوزاد نوزادی نیست ⇒ الف ممنوع؛ بالای محدودهٔ چاپ‌شده ⇒
  //    اورژانس، وگرنه اگر خوانشی غیرطبیعی است دست‌کم «این هفته»)، و تروپونینِ بی‌محدوده (دست‌کم «این هفته»
  //    اگر خوانشی غیرطبیعی است؛ پرسشِ ۲ِ P48).
  const URG_RANK = { none: 0, routine: 1, this_week: 2, soon: 3, emergency: 4 };
  const maxUrg = (a, b) => (URG_RANK[a] >= URG_RANK[b] ? a : b);
  const urgencyOfReading = (key, conv) => {
    const ref = getRef(key, sex, age, { pregnant: pregnantF });
    if (!ref) return "none";
    // _probe: کاوشِ درونی — کفِ نوزادی (applyNeonatalFloor) رویش اعمال نمی‌شود (P57 پرسش ۵).
    const probe = { _probe: true,
      sex, age, qual: {}, semenQual: {}, ungraded: {}, indices: {}, unmapped: [], unitConversions: [],
      noRef: [], diffFailed: false,
      graded: [{ test: key, value: conv, range: `${ref[0]}–${ref[1]}`, refSource: getRefSource(key, age),
        ...evaluate(key, conv, ref[0], ref[1], isCancerPatient) }],
    };
    probe.abnormal = probe.graded.filter((g) => g.abnormal);
    return runPatterns(probe).overall_urgency;
  };
  for (const [key, { value, reference }] of Object.entries(unitUnknown)) {
    const band = getRef(key, sex, age ?? 40, { pregnant: pregnantF });
    const printed = parseReference(reference, sex);
    const neonatalBili = /^BILI_/.test(key) && age != null && age < 1;
    const entry = { value, reason: "unit_unknown", alt: verdictsAcrossSystems(key, value, sex, age),
      units: UNIT_PROFILE[key].systems.length, ...(unitUnknown[key].printedUnit ? { printedUnit: unitUnknown[key].printedUnit } : {}) };
    // 🔴 بازبینیِ پزشکی B7: OCR گاهی محدودهٔ ردیفِ *کناری* را به عدد می‌چسباند («Urea 40» کنارِ «0.6-1.4»ِ
    //    کراتینین ⇒ ×۳۲ ⇒ اورژانسِ کاذب). پس محدوده فقط وقتی مقیاس می‌دهد که (۱) با بازهٔ موتور در دست‌کم یک
    //    سیستمِ واحد هم‌خانواده باشد (≤ ×۳)، و (۲) عددِ مقیاس‌شده ممکن باشد (SURVIVAL_LIMITS).
    //    تروپونین از (۱) معاف است: بازهٔ موتور مالِ سنجهٔ سنتی است (P37) و صدکِ ۹۹ِ سنجه‌ها تا ×۳۰ از آن دور است.
    let scale = !printed || !band || neonatalBili ? null
      : printed.hi > 0 && band[1] > 0 ? band[1] / printed.hi
      : printed.lo > 0 && band[0] > 0 ? band[0] / printed.lo : null;
    if (scale != null && key !== "TROPONIN_I" && !printedRangeFits(key, printed, band)) scale = null;
    if (scale != null && !possibleConv(key, value * scale, true)) scale = null;
    if (scale != null) {
      entry.basis = "printed_range";
      entry.printed = { lo: printed.lo, hi: printed.hi };
      entry.position = printedVerdict(reference, value, sex);
      entry.urgency = entry.position === "within" ? "none" : urgencyOfReading(key, value * scale);
      // بیرون از محدودهٔ خودِ آزمایشگاه هرگز «بی‌اهمیت» نیست
      if (entry.position !== "within") entry.urgency = maxUrg(entry.urgency, "routine");
    } else {
      const possible = readingsAcrossSystems(key, value, sex, age).filter((r) => !r.impossible);
      entry.basis = "readings";
      const verdicts = possible.map((r) => r.verdict);
      // متن «با هر کدام از N واحد» باید از خوانش‌های *ممکن* بشمارد، نه از همهٔ واحدها (B6).
      entry.possible = possible.length;
      // هشدارِ «ممکن است خارج…» فقط وقتی خوانشِ غیرطبیعی *باورپذیر* است (مرزِ DECIDE)، نه صرفاً «زنده‌ماندنی»:
      // «FBS 90» با خوانشِ ۹۰ mmol/L (۱۶۲۱ mg/dL) زیرِ مرزِ بقای ۳۰۰۰ است، ولی گفتنِ «ممکن است خارج باشد»
      // روی قندِ ۹۰ نویز است (بازبینی NB1). فوریت عوض نمی‌شود — کمینه‌اش همین حالا هم «عادی» است.
      const hedgeAbn = possible.some((r) => r.verdict === "abnormal" && possibleConv(key, r.conv, true));
      entry.level = verdicts.length === 0 ? "impossible"
        : verdicts.every((v) => v === "normal") ? "none"
        : verdicts.every((v) => v === "abnormal") ? "all" : hedgeAbn ? "some" : "none";
      // هیچ خوانشِ ممکنی نیست ⇒ به‌احتمالِ زیاد خطای OCR؛ نه اورژانس، نه سکوت.
      const urgs = possible.map((r) => urgencyOfReading(key, r.conv));
      entry.urgency = possible.length === 0 ? "this_week"
        : urgs.reduce((a, b) => (URG_RANK[a] <= URG_RANK[b] ? a : b));
      const anyAbnormal = verdicts.includes("abnormal");
      // با هر واحدِ ممکن غیرطبیعی ⇒ دست‌کم «این هفته» (طراحیِ R7؛ M123d) — بیمار نمی‌داند کدام خوانش درست است.
      // ⚠️ فقط وقتی *بیش از یک* خوانش ممکن است: با یک خوانشِ ممکن واحد عملاً معلوم است و بالا بردنِ فوریت
      //    یعنی نبودِ واحد عدد را خطرناک‌تر از بودنش نشان دهد (Hbِ ۱۲.۵، بازبینیِ کد).
      // 🔴 P88 (۲۰۲۶-۱۰-۰۵، LIS بیمارستان): کفِ «این هفته» جهت را نمی‌دید. اورهٔ ۱۱ = پایین با mg/dL و بالا با mmol/L ⇒ «این هفته»
      //   برای اورهٔ پایینِ پس از زایمان (۱۴ ردیف). جملهٔ «با هر کدام … خارج» درست است و می‌ماند؛ فقط *کف* شرط دارد: دست‌کم دو خوانشِ
      //   باورپذیر (مرزِ DECIDE، همان مرزِ hedge؛ یادداشتِ NB1) و همه در یک جهت. وقتی جهت‌ها مخالف‌اند و هر دو مهم‌اند (قندِ ۱۵، کلسیمِ ۵)
      //   فوریت از کمینهٔ خودِ خوانش‌ها می‌آید (soon / emergency)، نه از این کف. گارد L7.
      const plausibleAbn = possible.filter((r) => r.verdict === "abnormal" && possibleConv(key, r.conv, true));
      const oneDir = new Set(plausibleAbn.map((r) => r.dir)).size === 1;
      if (entry.level === "all" && possible.length > 1 && plausibleAbn.length > 1 && oneDir) entry.urgency = maxUrg(entry.urgency, "this_week");
      if ((neonatalBili || key === "TROPONIN_I") && anyAbnormal) entry.urgency = maxUrg(entry.urgency, "this_week");
      if (neonatalBili) {
        // 🔴 نوزاد (B1، B6، بازبینیِ کد ۲): بازهٔ موتور نوزادی نیست، و محدودهٔ چاپ‌شده کنارِ نمونهٔ نوزاد گاهی
        //    محدودهٔ *بزرگسال* است («0.3-1.2» کنارِ ۱.۵ در روزِ سوم ⇒ اورژانس، در حالی که ۱.۵ فیزیولوژیک است).
        //    پس محدوده به‌تنهایی اورژانس نمی‌سازد: فقط وقتی عدد بالای محدودهٔ خودِ آزمایشگاه است، فوریت به
        //    *بدترین* خوانشِ ممکن می‌رسد — یعنی اورژانس فقط اگر خودِ موتور با آن خوانش اورژانس بدهد (۱۸ ⇒ آری،
        //    ۱.۵ ⇒ نه). نبودِ واحد هرگز فوریت را از همان عدد با واحدِ چاپ‌شده بالاتر نمی‌برد.
        // 🔴 بازبینی B11: جملهٔ «پزشکِ نوزاد / نمودارِ ساعتی» فقط زیرِ یک ماه — نمودارِ ساعتی مالِ هفته‌های اول است
        //    و شیرخوارِ ۲ تا ۱۱ ماهه را پزشکِ کودک می‌بیند. کفِ فوریتِ بالا برای زیرِ یک سال دست نخورده است.
        const newborn = age < 1 / 12;
        entry.neonatal = newborn;
        // متن از محدودهٔ خودِ آزمایشگاه حرف بزند، نه از بازهٔ بزرگسالِ موتور («۱۵۰ کنارِ <205» داخلِ محدوده است).
        if (printed) Object.assign(entry, { basis: "printed_range", printed: { lo: printed.lo, hi: printed.hi },
          position: printedVerdict(reference, value, sex) });
        // 🔴 بازبینی B9: نوزادِ زیرِ یک ماه، بی‌محدوده — «کمینهٔ خوانش‌ها» ۲۰ را «این هفته» می‌کرد، در حالی که همان
        //    ۲۰ با mg/dL چاپ‌شده bilirubin_emergency است. خوانشِ µmol/L با بازه‌ای سنجیده می‌شود که نوزادی نیست
        //    (ریشهٔ B1)، پس کمینه اینجا کم‌خوانی است. بدترین خوانش برنده است. هزینهٔ آگاهانه: عددِ بی‌واحدِ ۱۲.۵ تا ۶۰
        //    (اگر µmol/L باشد، اورژانس نیست) هم اورژانس می‌گیرد — برای نوزاد، کم‌خوانی بدتر است (P48 بندِ ۶).
        if (newborn && !printed && urgs.length) {
          const worst = urgs.reduce((a, b) => (URG_RANK[a] >= URG_RANK[b] ? a : b));
          if (worst === "emergency" && possible.length > 1) entry.worstReading = true;
          entry.urgency = maxUrg(entry.urgency, worst);
        } else if (printedVerdict(reference, value, sex) === "above" && urgs.length) {
          entry.urgency = maxUrg(entry.urgency, urgs.reduce((a, b) => (URG_RANK[a] >= URG_RANK[b] ? a : b)));
        }
      }
    }
    ungraded[key] = entry;
  }
  // بند ۵ (تصمیمِ «ب»): CK-MBِ بی‌واحد — همان قاعدهٔ unit_unknown_values، با «دو واحدِ رایج» و بی‌هیچ خوانشِ تبدیلی (دو سنجه، نه دو واحدِ
  //   یک سنجه). فوریت عادی؛ محدودهٔ چاپ‌شدهٔ همان ردیف، اگر بود، فقط جملهٔ «در/بیرون از محدودهٔ آزمایشگاه» را می‌سازد و فوریت را بالا نمی‌برد.
  if (ckmbUnitless && tests.CK_MB == null) {
    const printed = parseReference(ckmbUnitless.reference, sex);
    const entry = { value: ckmbUnitless.value, reason: "unit_unknown", units: 2, urgency: "routine" };
    if (printed) Object.assign(entry, { basis: "printed_range", printed: { lo: printed.lo, hi: printed.hi },
      position: printedVerdict(ckmbUnitless.reference, ckmbUnitless.value, sex) });
    else Object.assign(entry, { basis: "readings", level: "none" });
    ungraded.CK_MB = entry;
  }
  // بند ۵ (تصمیمِ «الف»): Mixed/MXD = مونوسیت + ائوزینوفیل + بازوفیل در دستگاهِ سه‌بخشی. شناخته، بی‌بازه، بی‌حکم — کنارِ CBC
  //   (پیش از این در ۱۲۸ از ۲۳۶ درخواست «تفسیرشان نمی‌کند» می‌گرفت). بی‌CBC روی برگه همان unmapped می‌ماند. جمعِ درصدها (باگِ ۱) دست نمی‌خورد.
  if (diffMixed) {
    const cbc = tests.WBC != null || Object.keys(tests).some((k) => /^(NEUT|LYMPH|MONO|EOS|BASO)_(PCT|ABS)$/.test(k));
    // P96 (تصمیمِ بازبین ۲۰۲۶-۱۰-۰۶): بازهٔ Mixed را عددِ ثابتِ موتور نمی‌دهد؛ فقط اگر برگه بازهٔ چاپ‌شدهٔ خودِ دستگاه دارد، موقعیتِ عدد نسبت به *همان* گفته می‌شود.
    if (cbc) ungraded.MIXED = { value: diffMixed.value, unit: diffMixed.unit, reason: "diff_mixed",
      ...(diffMixed.reference && printedVerdict(diffMixed.reference, diffMixed.value, sex) ? { reference: String(diffMixed.reference), position: printedVerdict(diffMixed.reference, diffMixed.value, sex) } : {}) };
    else unmapped.push(diffMixed.name);
  }

  for (const [key, value] of Object.entries(tests)) {
    if (key.startsWith("_")) continue;
    // ۲۰۲۶-۱۰-۰۳: درصدِ افتراقیِ بی‌WBC بی‌صدا حذف می‌شد (نه graded، نه ungraded، نه unmapped) و برگه «طبیعی» می‌شد (N2/N4).
    //   با WBC به مطلق تبدیل شده؛ بی‌آن به ungraded می‌رود و differential_without_wbc می‌خواندش.
    // P113: NRBC%/IMG% درصدِ افتراقیِ WBC نیستند — بازهٔ چاپیِ خودشان (یا «بی‌بازه») دارند.
    if (/^(NRBC|IMG)_PCT$/.test(key)) {
      const nr = absPrintedRange(absRefs?.[key], key);
      if (nr) graded.push({ test: key, value, range: `${nr[0]}–${nr[1]}`, refSource: "بازهٔ چاپ‌شدهٔ همین برگه", ...evaluate(key, value, nr[0], nr[1], isCancerPatient) });
      else { ungraded[key] = { value, reason: "no_range" }; if (!noRef.includes(key)) noRef.push(key); }
      continue;
    }
    if (key.endsWith("_PCT")) {
      if (tests[key.replace("_PCT", "_ABS")] == null) ungraded[key] = { value, reason: "diff_pct_no_wbc" };
      continue;
    }
    // بازهٔ این چهار کلید فقط بزرگسال است؛ زیرِ ۱۶ سال حکم نمی‌دهیم ولی «تفسیر نشدند» هم نمی‌شود — adult_ref_only را قاعده می‌خواند.
    if (ADULT_ONLY_REF_KEYS.has(key) && age != null && age < 16) { ungraded[key] = { value, reason: "adult_ref_only" }; continue; }
    // P77-۸ (تصمیمِ بازبین ۲۰۲۶-۱۰-۰۴، N3): زیرِ ۱۶ سال هماتوکریت بازهٔ سنیِ منبع‌دار ندارد (CALIPER به تفکیکِ سن/جنس می‌خواهد) — با بازهٔ
    //   بزرگسال سنجیده نمی‌شود (HCT 33 با Hb 11.2 در ۴ ساله «پایین» می‌شد). مثلِ بقیهٔ بی‌بازه‌ها: noRef + ungraded، ولی مقدارش برای
    //   بحرانِ HCT < ۲۱ (P52-۵، crisisArm) نگه داشته می‌شود. کم‌خونیِ کودک را Hb با بازهٔ سنیِ خودش می‌گوید.
    if (key === "HCT" && age != null && age < 16 && !getPedRef("HCT", age)) {
      noRef.push(key);
      ungraded.HCT = { value, reason: "no_ped_range" };
      continue;
    }

    // P96 (تصمیمِ کاربر/بازبین ۲۰۲۶-۱۰-۰۶، [209] — سنِ ۲): کراتینینِ شیرخوار/نوپا (< ۳ سال، همان بازهٔ سنیِ ردیفِ RCPCH در refs_ped.js) فقط وقتی برگه بازهٔ چاپ‌شده دارد حکم می‌گیرد. بازهٔ RCPCH به روشِ سنجشِ
    //   Jaffe/آنزیمی و به سنِ دقیق حساس است و بدونِ بازهٔ خودِ آزمایشگاه پرچمِ بالینی نمی‌دهیم؛ عدد نام برده می‌شود (noRef) تا بی‌صدا گم نشود (N28).
    if (key === "CREAT" && age != null && age < 3 && !(printedRefs.CREAT && parseReference(printedRefs.CREAT, sex))) {
      noRef.push(key);
      ungraded.CREAT = { value, reason: "infant_no_printed_range" };
      continue;
    }

    if (key === "HCG") {
      ungraded.HCG = { value, reason: "threshold", ...(rawText.HCG ? { raw: rawText.HCG } : {}) };
      continue;
    }
    if (key === "SPERM_TOTAL" || key === "SEMEN_ABSTINENCE") { ungraded[key] = { value, reason: "context" }; continue; }
    if (REPRO_HORMONE_KEYS.has(key)) {
      const reason = (age != null && age < 16) ? "pediatric"
        : !sex ? "sex_unknown"
        : (sex === "F" && FEMALE_CYCLE_KEYS.has(key)) ? "cycle_day_unknown"
        // آستانهٔ ۳ ng/mL فقط برای زن تأیید شده؛ PROG_D21ِ مرد بی‌مالک بود و بی‌صدا گم می‌شد
        // (بازبینی) — حالا به noRef می‌رود و هشدارِ «تفسیر نشد» می‌گیرد.
        : (key === "PROG_D21" && sex === "F") ? (hcgPositive ? "hcg_positive" : "threshold")
        : null;
      if (reason) { ungraded[key] = { value, reason }; continue; }
    }

    // specs/007: RETIC_ABS بازهٔ تأییدشده ندارد (۲۵–۱۰۰ ×10⁹/L در P52) — در هیچ سنی سنجیده نمی‌شود. ردیفِ نوزادیِ
    // بی‌منبعِ PED_REFS حذف شد (P52 پرسش ۴)؛ این گیت می‌ماند تا بازه‌ای که کسی بی‌تأیید بیفزاید حکم ندهد.
    // specs/008: کلیدهای بی‌بازه (NO_RANGE_KEYS، P53) و HbA2/HbF زیرِ ۲ سال (HbF نوزاد ۶۰–۸۵٪، HbA2 تا ۱–۲ سالگی
    // به حدِ بزرگسال نمی‌رسد) سنجیده نمی‌شوند ⇒ «تفسیر نشدند».
    // P53 پرسش ۶: HbF از ۱ سالگی با ۰–۲٪ سنجیده می‌شود (تا ۱ سالگی به زیرِ ۲٪ می‌رسد)؛ زیرِ ۱ سال فیزیولوژیک بالاست.
    const ungradedByAge = (key === "HBA2" && age != null && age < 2) || (key === "HBF" && age != null && age < 1);
    // P53 پرسش ۱۱ بندِ ۳: جنسِ نامعلوم ⇒ Hb با هر دو ردیف سنجیده می‌شود. عددی که برای هر دو جنس پایین (یا بالا) است
    //   حکم می‌گیرد؛ عددی که برای یک جنس طبیعی و برای دیگری غیرطبیعی است سنجیده نمی‌شود و hgb_sex_unknown آن را می‌گوید.
    //   پیش‌تر ردیفِ زن (۱۲.۰) اعمال می‌شد و مردِ Hb 12.5 «طبیعی» می‌خواند.
    // M11 (تصمیمِ کاربر ۲۰۲۶-۱۰-۱۳، P106): همان قاعده برای *هر* آزمایشی که بازهٔ زن و مرد فرق دارد (فریتین، کراتینین، ALT، آهن، …) —
    //   پیش‌تر ردیفِ زن اعمال می‌شد و مردِ فریتین ۲۰ یا کراتینین ۱٫۲۵ «طبیعی» می‌خواند. خواننده: sex_unknown_value (patterns_review1013.js).
    //   هورمون‌های تولیدمثل از قبل بی‌جنس سنجیده نمی‌شوند (REPRO_HORMONE_KEYS) و این‌جا نمی‌آیند.
    //   کلیدهایی که سیاستِ «جنسِ نامعلوم»ِ تصمیم‌گرفته‌شدهٔ خودشان را دارند بیرون‌اند: کراتینین (P88، اجتماعِ دو بازه)، پرولاکتین (M101b،
    //   حدِ پایین‌تر)، کلسیمِ ۲۴ساعته (W04، ۱۰۰–۳۰۰).
    if (!sex && !ungradedByAge && !REPRO_HORMONE_KEYS.has(key) && !NO_RANGE_KEYS.has(key) && !SEX_UNKNOWN_OWN_POLICY.has(key)) {
      const rf = getRef(key, "F", age), rm = getRef(key, "M", age);
      if (rf && rm && (rf[0] !== rm[0] || rf[1] !== rm[1])) {
        const lo = Math.min(rf[0], rm[0]), loMax = Math.max(rf[0], rm[0]);
        const hi = Math.max(rf[1], rm[1]), hiMin = Math.min(rf[1], rm[1]);
        if ((value >= lo && value < loMax) || (value > hiMin && value <= hi)) {
          // ⚠️ نه «sex_unknown»: آن دلیل را reproductive_hormone_context می‌خواند و Hb را «هورمون» می‌نامید.
          const side = value < loMax ? "low" : "high";
          // جنسی که این عدد برایش طبیعی است: در سمتِ پایین، آن‌که حدِ پایینش کمتر است؛ در سمتِ بالا، آن‌که حدِ بالایش بیشتر است.
          const normalFor = side === "low" ? (rf[0] < rm[0] ? "F" : "M") : (rf[1] > rm[1] ? "F" : "M");
          ungraded[key] = { value, reason: key === "HGB" ? "hgb_sex_unknown" : "sex_unknown_range", side, normalFor,
            female: `${rf[0]}–${rf[1]}`, male: `${rm[0]}–${rm[1]}` };
          noRef.push(key);
          continue;
        }
        const e0 = evaluate(key, value, lo, hi, isCancerPatient);
        graded.push({ test: key, value, range: `${lo}–${hi}`, refSource: getRefSource(key, age), ...e0 });
        continue;
      }
    }
    // P57 پرسش ۶: شاخص‌های پلاکتی بازهٔ استاندارد ندارند و به‌تنهایی هشدار نمی‌سازند — نه noRef («تفسیر نشدند»، «حتماً با پزشک»)،
    //   نه حکم. خواننده: platelet_indices_context، فقط کنارِ پلاکت/MPVِ غیرطبیعی.
    if (PLATELET_INDEX_KEYS.has(key)) {
      // P110: بازهٔ چاپ‌شدهٔ همان دستگاه همراهش — plateletIndicesText آن را بر «بازهٔ معمول» مقدم می‌کند (PDW ِ ۳۵–۵۵٪ کنارِ ۹–۲۰ِ برگه).
      ungraded[key] = { value, reason: "platelet_index", unit: printedUnits[key] ?? null, ...(printedRefsAll[key] ? { printed_range: printedRefsAll[key] } : {}) };
      continue;
    }
    // P93: قندِ یک‌ساعتهٔ OGTT بیرونِ بارداری معیار ندارد ⇒ noRef، ولی مقدار برای gestational_diabetes_range نگه داشته می‌شود.
    // P93-ب: ۳ساعته و چالشِ ۵۰ گرمی هم. 🔴 پیش از این «GTT 1h 10.5 mmol/L» (≈ ۱۸۹) ۱۰٫۵ خوانده می‌شد ⇒ «به ۱۸۰ نرسیده» (N3).
    //   mgdl فقط با واحدِ چاپ‌شده؛ بی‌واحد ⇒ نام برده می‌شود، با معیار سنجیده نمی‌شود (P48).
    if (key === "GLU_1H" || key === "GLU_3H" || key === "GLU_GCT") {
      noRef.push(key);
      const u = printedUnits[key] ?? null;
      const c = toConventional("GLU_2H", value, u);
      const mgdl = c.converted ? c.value : (u && /^mg\/?dl$/i.test(String(u).replace(/\s+/g, "")) ? value : null);
      ungraded[key] = { value, reason: "no_range", unit: u, mgdl };
      if (c.converted) unitConversions.push({ test: key, raw: value, from: c.from, value: c.value, to: "mg/dL", basis: "printed" });
      continue;
    }
    // P63 (تصمیمِ کاربر ۲۰۲۶-۱۰-۱۳، بازبینیِ چندعاملی یافتهٔ ۶): بیلی‌روبینِ تامِ نوزادِ زیرِ ۱۴ روز با یک بازهٔ ثابت (CALIPER)
    //   «طبیعی» گفته نمی‌شود — آستانه به سنِ ساعتی و سنِ بارداری بستگی دارد (AAP 2022) و موتور هیچ‌کدام را ندارد؛ «۱۴٫۵ در روزِ اول»
    //   پیش‌تر «طبیعی» و بی‌یافته بود. عددِ داخلِ بازه ⇒ ungraded (neonatal_hour_chart) ⇒ neonatal_bilirubin_hour_chart (soon).
    //   بالای بازه همان مسیرِ قبلی است (graded ⇒ bilirubin_total_alone / bilirubin_emergency) — فوریت هرگز پایین نمی‌آید.
    if (key === "BILI_T" && age != null && age * 365 < 14) {
      const r0 = getRef(key, sex, age);
      if (r0 && value >= r0[0] && value <= r0[1]) {
        ungraded.BILI_T = { value, reason: "neonatal_hour_chart" };
        continue;
      }
    }
    // P37 (بالا): تروپونینِ سنجهٔ سنتی با حدِ بالای چاپ‌شدهٔ خودِ ردیف سنجیده می‌شود ⇒ troponin_positive (همان فوریتِ موجود).
    if (key === "TROPONIN_I" && !tests._trop_hs && tests._trop_conv_uln != null) {
      const hi = tests._trop_conv_uln;
      graded.push({ test: key, value, range: `0–${hi}`, refSource: "حدِ چاپ‌شدهٔ همین برگه (P37)",
        ...evaluate(key, value, 0, hi, isCancerPatient) });
      continue;
    }
    // P113: مرجعِ چاپ‌شدهٔ برگه برای شمارشِ مطلقِ افتراقی (واحدِ ۱۰³/µL ⇒ ×۱۰۰۰) بر بازهٔ داخلی مقدم است.
    const absRef = /(_ABS|_PCT)$/.test(key) ? absPrintedRange(absRefs?.[key], key) : null;
    // P114 (برگهٔ مرد ۵۵ ساله): سقفِ LDH کیت‌به‌کیت از ۲۴۰ تا ۵۳۰ فرق می‌کند. «LDH 275» با برگهٔ «< 530»
    //   پیش‌تر «بالاتر از حد طبیعی» و یافتهٔ همولیز می‌شد.
    //   ⚠️ فقط بزرگسال: در کودک، قاعدهٔ P96 عمداً درجه‌بندی را با بازهٔ موتور نگه می‌دارد و سقفِ چاپ‌شده را
    //   فقط برای فوریت به کار می‌برد (p96.test.js) — این تصمیم دست‌نخورده می‌ماند.
    const printedOwn = key === "LDH" && !(age != null && age < 16) ? printedRangePair(printedRefs.LDH) : null;
    const ref = absRef ?? printedOwn ?? ((NO_RANGE_KEYS.has(key) || ungradedByAge) ? null : getRef(key, sex, age, { pregnant: pregnantF }));
    if (!ref) {
      // P116 (بازبینی ۲۰۲۶-۱۰-۲۷): T3 Uptake و FTI موتور برایشان مرجعِ داخلی ندارد، ولی خودِ آزمایشگاه بازه
      //   چاپ کرده (۲۴–۳۵٪ و ۱٫۴–۳٫۴). پیش‌تر «محدوده مرجع ندارد — تفسیر نشد» می‌شدند. حالا بازهٔ چاپ‌شده
      //   (بی‌هیچ تبدیلِ واحد؛ عدد و بازه از یک ستون‌اند) سنجه است و منبعش صریح نوشته می‌شود.
      const ownRef = PRINTED_REF_ONLY_KEYS.has(key) && printedRefsAll[key] ? parseReference(printedRefsAll[key], sex) : null;
      const ownPrinted = ownRef && ownRef.hi > 0 ? [ownRef.lo ?? 0, ownRef.hi] : null;
      if (ownPrinted) {
        graded.push({ test: key, value, range: `${ownPrinted[0]}–${ownPrinted[1]}`,
          refSource: "بازهٔ چاپ‌شدهٔ همین برگه", ...evaluate(key, value, ownPrinted[0], ownPrinted[1], isCancerPatient) });
        continue;
      }
      noRef.push(key);
      if (REPRO_HORMONE_KEYS.has(key)) ungraded[key] = { value, reason: "no_range", ...(UNIT_KEPT.has(key) ? { unit: printedUnits[key] ?? null } : {}) };
      // P110: بازهٔ چاپ‌شدهٔ رویِ سرم همراهش می‌رود — بی‌واحد، واحد از همین بازه تعیین می‌شود (zinc_status).
      else if (UNIT_KEPT.has(key)) ungraded[key] = { value, reason: "no_range", unit: printedUnits[key] ?? null, ...(key === "ZINC" && printedRefsAll[key] ? { printed_range: printedRefsAll[key] } : {}) };
      continue;
    }

    const e = evaluate(key, value, ref[0], ref[1], isCancerPatient);
    graded.push({
      test: key,
      value,
      // بازهٔ یک‌طرفه (فقط حدِ پایین، P47) «≥ حد» نمایش داده می‌شود، نه «16–null».
      range: ref[1] == null ? `≥ ${ref[0]}` : `${ref[0]}–${ref[1]}`,
      // P114: بازهٔ نمایش هم همان بازهٔ سنجیده‌شده است، نه بازهٔ داخلی.
      //   (پیش‌تر «LDH 275» با بازهٔ ۲۴۰–۴۸۰ نمایش داده می‌شد در حالی که برگه «< 530» چاپ کرده بود.)
      refSource: absRef ? "بازهٔ چاپ‌شدهٔ همین برگه" : printedOwn ? "بازهٔ چاپ‌شدهٔ همین برگه" : getRefSource(key, age),
      ...e,
    });
    // specs/021 (P133، G1): ACRِ چاپ‌شده با mg/mmol پیش‌تر پس از تبدیل با مرزهای mg/g رده می‌گرفت: ۳٫۰–۳٫۳۹ mg/mmol (۲۶٫۵–۲۹٫۹ mg/g)
    //   «A1، طبیعی» می‌شد، با اینکه KDIGO و بازهٔ چاپیِ خودِ برگه («< 3.0») A2 می‌گویند (کم‌خوانی، اصلِ II). مرزهای mg/mmol (۳ و ۳۰ =
    //   ۲۶٫۵ و ۲۶۵٫۲ mg/g) پایین‌ترِ مرزهای mg/g (۳۰ و ۳۰۰) هستند، پس این رده هرگز پایین‌تر از ردهٔ mg/g نیست. عددِ mg/g دست نمی‌خورد (M17).
    if (key === "ACR" && tests._acr_mgmmol != null) {
      const mm = tests._acr_mgmmol;
      const band = CLASSIFIERS.ACR.bands.find((b) => b.tag === (mm < 3 ? "A1" : mm <= 30 ? "A2" : "A3"));
      Object.assign(graded[graded.length - 1], {
        range: `0–${(3 * BRANCH_FACTORS.ACR_MGMMOL_TO_MGG).toFixed(1)}`,
        tag: band.tag, fa: band.fa, patient: band.patient, abnormal: band.normal !== true, dir: band.normal === true ? null : "high",
        printed: { value: mm, unit: "mg/mmol" },
      });
    }
  }

  // ═══ نوزاد و دیفِ ناقص (job c138671c، P57) ═══
  // D5/D4: RBC و RDW در دورهٔ گلبول‌های درشتِ نوزادی بازه ندارند (getRef ⇒ null ⇒ بالاتر به noRef رفتند). مالک:
  //   neonatal_reference_context — تا خطِ «محدوده مرجع نداریم» تنها چیزی نباشد که بیمار دربارهٔ آن‌ها می‌خواند.
  // D6: MCH ≡ MCV × MCHC ÷ ۱۰۰ (اتحاد: Hb/RBC = (Hct/RBC)·(Hb/Hct)). وقتی MCV و MCHC هر دو در بازهٔ نوزادیِ خودشان‌اند،
  //   «MCH غیرطبیعی» اطلاعِ مستقلی ندارد — فقط نشان می‌دهد ردیفِ MCH (۳۱–۳۷) با ردیف‌های MCV (۱۰۰–۱۳۰) و MCHC (۳۲–۳۵)
  //   نمی‌خواند (۱۳۰ × ۳۵ ÷ ۱۰۰ = ۴۵.۵). مستقل شمرده نمی‌شود و ردیفش به بازبین رفت (P57). عددِ تازه‌ای در کار نیست.
  // P57 پرسش ۳ (همهٔ سنین): MCH ≡ MCV × MCHC ÷ ۱۰۰. اختلافِ بیش از ۱۰٪ ⇒ پرچمِ فنی (rbc_indices_inconsistent) و MCH از
  //   قضاوت بیرون — تصمیمِ کم‌خونی بر پایهٔ MCV و Hb. عددِ ۱۰٪ از پاسخِ بازبین است.
  if (tests.MCH != null && tests.MCV != null && tests.MCHC != null && tests.MCV > 0 && tests.MCHC > 0) {
    const calc = (tests.MCV * tests.MCHC) / 100;
    if (Math.abs(tests.MCH - calc) / calc > 0.10) {
      const i = graded.findIndex((g) => g.test === "MCH");
      if (i >= 0) graded.splice(i, 1);
      ungraded.MCH = { value: tests.MCH, reason: "indices_inconsistent", calc: +calc.toFixed(1), mcv: tests.MCV, mchc: tests.MCHC };
      if (!noRef.includes("MCH")) noRef.push("MCH");
    }
  }
  if (inNeonatalRedCellPeriod(age)) {
    for (const k of NEONATAL_NO_ADULT_FALLBACK) {
      if (tests[k] != null && noRef.includes(k)) ungraded[k] = { value: tests[k], reason: "neonatal_no_range" };
    }
    const iMch = graded.findIndex((g) => g.test === "MCH");
    const mcvG = graded.find((g) => g.test === "MCV"), mchcG = graded.find((g) => g.test === "MCHC");
    if (iMch >= 0 && !ungraded.MCH && graded[iMch].abnormal && mcvG && !mcvG.abnormal && mchcG && !mchcG.abnormal) {
      const [g] = graded.splice(iMch, 1);
      ungraded.MCH = { value: g.value, reason: "neonatal_derived", range: g.range, dir: g.dir };
      noRef.push("MCH");
    }
  }
  // D1: نوتروفیلِ غایب با دیفِ ناقص. سقفِ آن حساب است نه حدس: WBC منهای بقیهٔ شمارش‌های مطلقِ روی برگه (سلول‌های
  //   «MXD/MID» که موتور نمی‌شناسد هم داخلِ همین سقف‌اند، پس عددِ واقعی ≤ سقف). فوریت *کف* است نه سقف (N3، دورِ ۳):
  //   عددِ واقعی از سقف بدتر است، پس فوریت دست‌کم همان است که خودِ موتور به نوتروفیلی برابرِ سقف می‌دهد.
  //   ⚠️ فقط وقتی دیف *ناقص* است (دست‌کم یک جزءِ دیگر هست). برگهٔ بی‌دیف یعنی «دیف گزارش نشده»، نه «نوتروفیل غایب».
  if (!diffFailed && tests.WBC != null && tests.NEUT_ABS == null) {
    const others = ["LYMPH_ABS", "MONO_ABS", "EOS_ABS", "BASO_ABS"].filter((k) => tests[k] != null);
    if (others.length) {
      const ceiling = Math.max(0, Math.round(tests.WBC * 1000 - others.reduce((s, k) => s + tests[k], 0)));
      const ref = getRef("NEUT_ABS", sex, age);
      const unreadable = unreadableKeys.has("NEUT_PCT") || unreadableKeys.has("NEUT_ABS");
      const below = !!(ref && ceiling < ref[0]);
      if (unreadable || below) {
        ungraded.NEUT_ABS = { value: null, reason: "diff_incomplete", ceiling, from: ["WBC", ...others], unreadable, below,
          range: ref ? `${ref[0]}–${ref[1]}` : null,
          refSource: ref ? getRefSource("NEUT_ABS", age) : null,
          urgency: below ? urgencyOfReading("NEUT_ABS", ceiling) : "routine" };
      }
    }
  }

  // شاخص‌ها
  const idx = {};
  // ═══ P111: شاخص‌ها فقط جایی که معنا دارند ═══
  //   منتزر (MCV/RBC) فقط برای تفکیکِ علتِ *میکروسیتوز* اعتبار دارد. روی برگهٔ ماکروسیتوزِ شدید (MCV 106.6)
  //   عددِ ۲۸٫۸ ساخته می‌شد و در نمای تخصصی به‌عنوان شاخصِ افتراقی نمایش داده می‌شد — عددی بی‌معنا.
  // ۲۰۲۶-۱۰-۲۸ (برگهٔ واقعی، N23): مرزِ میکروسیتوز باید *همان بازهٔ سنیِ همان ردیف* باشد، نه ۸۰ِ بزرگسال.
  //   پسرِ ۹ ساله با MCV 78.2 (بازهٔ اطفال ۷۷–۹۵ ⇒ طبیعی) منتزرِ ۱۵٫۵ می‌گرفت که در نمای تخصصی شاخصِ
  //   افتراقیِ تالاسمی/کمبودِ آهن خوانده می‌شد؛ کودک هیچ کم‌خونی و هیچ میکروسیتوزی نداشت. بازهٔ اطفال از
  //   getRef می‌آید (منبعِ ثبت‌شدهٔ همان سن)، پس هیچ آستانهٔ تازه‌ای ساخته نمی‌شود.
  const mcvLower = getRef("MCV", sex, age)?.[0];
  if (tests.MCV && tests.RBC && tests.MCV < (mcvLower ?? 80)) idx.mentzer = +(tests.MCV / tests.RBC).toFixed(1);
  if (tests.NEUT_PCT && tests.LYMPH_PCT) idx.nlr = +(tests.NEUT_PCT / tests.LYMPH_PCT).toFixed(1);
  // BUN/Cr: از BUNِ اندازه‌گیری‌شده؛ اگر فقط اوره داریم، BUN را داخلی (اوره÷۲.۱۴) برای همین شاخص می‌سازیم.
  const bunForRatio = tests.UREA_N != null ? tests.UREA_N
                    : (tests.UREA != null ? ureaToBUN(tests.UREA) : null);
  if (bunForRatio != null && tests.CREAT) idx.bun_cr = +(bunForRatio / tests.CREAT).toFixed(0);
  if (tests.ALT && tests.ALP) {
    const ALT_ULN = getRef("ALT", sex, age)?.[1];
    const ALP_ULN = getRef("ALP", sex, age)?.[1];
    //   R = (ALT/ULN) ÷ (ALP/ULN) برای تفکیکِ الگوی هپاتوسلولار از کولستاتیک است؛ وقتی هر دو آنزیم در محدوده‌اند
    //   عدد هیچ اطلاعاتی ندارد (۰٫۷ روی برگهٔ کاملاً نرمال). فقط با انحرافِ دست‌کم یکی از دو آنزیم ساخته می‌شود.
    if (ALT_ULN && ALP_ULN && (tests.ALT > ALT_ULN || tests.ALP > ALP_ULN)) {
      idx.r_ratio = +((tests.ALT / ALT_ULN) / (tests.ALP / ALP_ULN)).toFixed(1);
    }
  }

  // R2 — آنیون‌گپ: Na − (Cl + HCO3). با سدیمِ اندازه‌گیری‌شده (نه تصحیح‌شده) محاسبه می‌شود.
  if (tests.NA != null && tests.CL != null && tests.HCO3 != null) {
    const naForAg = derived.na_measured ?? tests.NA;
    const ag = naForAg - (tests.CL + tests.HCO3);
    idx.anion_gap = +ag.toFixed(1);
    // تصحیح آلبومین (هر ۱ g/dL افت آلبومین ≈ ۲.۵ کاهش کاذب آنیون‌گپ)
    if (tests.ALB != null) idx.anion_gap_corr = +(ag + 2.5 * (4.0 - tests.ALB)).toFixed(1);
  }
  // اسمولالیتهٔ محاسبه‌شده و شکافِ اسمولال: 2·Na + قند/18 + BUN/2.8.
  //
  // ⚠️ کلاً پشتِ «OSMِ اندازه‌گیری‌شده وجود دارد» گیت شده. بدونِ آن شکاف
  //    محاسبه‌ناپذیر است و عددِ محاسبه‌شده به‌تنهایی هیچ اطلاعِ مستقلی ندارد —
  //    هر سه جزئش خودشان قاعده دارند. ضمناً prompt.js کلِ indices را به LLM
  //    می‌دهد، پس عددِ بی‌صاحب یعنی چیزی که مدل می‌تواند دربارهٔ آن حرف بزند
  //    بی‌آنکه قاعده‌ای متنش را مهار کند.
  // ⚠️ سدیمِ *اندازه‌گیری‌شده*، نه تصحیح‌شده — همان دلیلِ آنیون‌گپ بالا:
  //    تصحیحِ هایپرگلیسمی خودش اثرِ قند است و اینجا جملهٔ قند دوباره شمرده می‌شد.
  // ⚠️ هر سه جزء لازم‌اند. نبودِ قند یا اوره، osm_calc را کم و شکاف را کاذب
  //    بزرگ می‌کند — یعنی دقیقاً به سمتِ آلارمِ اشتباه.
  // ⚠️ maxGlucose عمداً: بزرگ‌ترین قند، osm_calc را بیش‌برآورد و شکاف را
  //    کم‌برآورد می‌کند. یعنی خطا به سمتِ سکوت می‌شکند، نه به سمتِ ادعای
  //    مسمومیت — که جهتِ درستِ شکستن برای این قاعده است.
  if (tests.OSM != null) {
    const naForOsm = derived.na_measured ?? tests.NA;
    const gluForOsm = maxGlucose(tests);
    const bunForOsm = tests.UREA_N != null
      ? tests.UREA_N
      : (tests.UREA != null ? ureaToBUN(tests.UREA) : null);
    if (naForOsm != null && gluForOsm != null && bunForOsm != null) {
      idx.osm_calc = +(2 * naForOsm + gluForOsm / 18 + bunForOsm / 2.8).toFixed(0);
      idx.osm_gap = +(tests.OSM - idx.osm_calc).toFixed(0);
    }
  }
  // non-HDL کلسترول = کلسترول تام − HDL (Kenwright, «Lipids and Lipoproteins»).
  //   همهٔ ذرات آتروژنِ حاوی ApoB را پوشش می‌دهد، در حالت غیرناشتا هم معتبر است،
  //   و برخلاف LDLِ فریدوالد با تری‌گلیسریدِ بالا خراب نمی‌شود. هدف ≈ هدفِ LDL + ۳۰.
  if (tests.CHOL != null && tests.HDL != null) {
    idx.non_hdl = +(tests.CHOL - tests.HDL).toFixed(0);
  }
  // P110-ج (تصمیمِ کاربر ۲۰۲۶-۱۰-۱۶): دو شاخصِ «فقط محاسبه‌شده و اطلاعاتی» — هیچ قاعده‌ای آن‌ها را نمی‌خواند، فوریت و پیگیری نمی‌سازند.
  //   FIB-4 = سن × AST ÷ (پلاکت[10⁹/L] × √ALT) (Sterling 2006؛ AASLD 2023): < ۱٫۳ احتمالِ پایینِ فیبروزِ پیشرفته؛ در ≤ ۳۵ سال دقتِ پایین.
  //   فقط بزرگسال؛ پلاکت در موتور K/µL = 10⁹/L.
  if (tests.AST > 0 && tests.ALT > 0 && tests.PLT > 0 && age != null && age >= 18) {
    //   P111: FIB-4 یک شاخصِ غربالگریِ فیبروز است، نه عددِ تزئینی. روی برگهٔ خانمِ ۲۵ سالهٔ نورموسیتیک با
    //   ALT 12 و AST 20 (هر دو نرمال) ۰٫۵۸ ساخته می‌شد. فقط با انحرافِ دست‌کم یکی از دو آنزیم ساخته می‌شود.
    const AST_ULN = getRef("AST", sex, age)?.[1];
    const ALT_ULN_F = getRef("ALT", sex, age)?.[1];
    if ((AST_ULN && tests.AST > AST_ULN) || (ALT_ULN_F && tests.ALT > ALT_ULN_F)) {
      idx.fib4 = +((age * tests.AST) / (tests.PLT * Math.sqrt(tests.ALT))).toFixed(2);
      if (age <= 35) idx.fib4_low_accuracy = true;
    }
  }

  //   AIP = log10(TG/HDL) با غلظتِ مولی (Dobiášová 2001؛ TG ÷ ۸۸٫۵۷، HDL ÷ ۳۸٫۶۷ ⇒ mmol/L). مرزهای جهت‌دهنده: < ۰٫۱۱ / ۰٫۱۱–۰٫۲۱ / > ۰٫۲۱.
  if (tests.TG > 0 && tests.HDL > 0) {
    idx.aip = +Math.log10((tests.TG / 88.57) / (tests.HDL / 38.67)).toFixed(2);
  }
  // تصحیح‌های مشتق را برای مصرف الگوها در indices بگذار
  // P113 — سن زیستی فنوتیپی (Levine PhenoAge، MEDICAL_RULES): فقط عدد، بدونِ قاعده.
  //   ماژول خودش گیت می‌زند: نبودِ هر یک از ۹ مارکر، واحدِ ناشناخته یا سنِ زیرِ ۲۰ ⇒ هیچ عددی.
  //   هیچ قاعده‌ای این کلید را نمی‌خواند (پیگیری/فوریت نمی‌سازد). فقط وقتی CALCULATED است
  //   نوشته می‌شود تا برگه‌های ناقص کلیدِ بی‌مقدار نگیرند. ورودی همان واحدهای داخلیِ موتور است
  //   (CRP_Q بر حسبِ mg/L)؛ تبدیل به واحدهای معادله داخلِ pheno_age.js انجام می‌شود.
  const pheno = computePhenoAge({ tests, age, sex });
  if (pheno.status === "CALCULATED") idx.pheno_age = pheno.phenoAge;
  // P113 (۲۰۲۶-۱۰-۲۷): چرا ساخته نشد؟ — همان وضعیتِ ماژول، بی‌هیچ منطقِ دوم.
  //   ⚠️ فقط وقتی ساخته نشده نوشته می‌شود؛ تا خروجیِ برگه‌های کامل بایت‌به‌بایت همان بماند (فریزها).
  //   مصرف: لاگِ سرور و ردِّ حسابرسی (analysis-audit.jsonl) — به بیمار و به مدل نمی‌رود.
  const enginePhenoDiag = pheno.status !== "CALCULATED"
    ? { status: pheno.status, ...(pheno.missing ? { missing: pheno.missing } : {}) }
    : null;
  Object.assign(idx, derived);

  // بازهٔ چاپ‌شدهٔ برگه کنارِ بازهٔ موتور (فقط نمایش — حکمِ «غیرطبیعی» همچنان با بازهٔ موتور است). فقط وقتی هر دو سر خوانده شد، هم‌مقیاس است
  // (هر سر در ×۱٫۵ِ سرِ بازهٔ موتور؛ بازهٔ رایجِ «۷۰۰۰–۱۰۰۰۰» برای WBC یا بازهٔ واحدِ دیگر رد می‌شود) و با بازهٔ موتور فرق دارد.
  const printedRanges = {};
  // ۲۰۲۶-۱۰-۲۸ (برگهٔ واقعی، N5): ردیفی که واحدش تبدیل شده (T4 ‏ng/mL → µg/dL، T3 ‏ng/mL → ng/dL،
  //   کراتینین µmol/L → mg/dL) بازهٔ چاپ‌شده‌اش هنوز در واحدِ *برگه* است؛ مقایسهٔ خامِ ۴۵–۱۲۰ با بازهٔ
  //   موتور ۶٫۱۶–۱۰٫۳۲ همیشه «ناهم‌مقیاس» می‌شد و ستونِ بازهٔ برگه در نمای تخصصی برای همان ردیف «—» می‌ماند.
  //   ضریب از خودِ unitConversions گرفته می‌شود (value/raw) — یک عدد، یک منبع. تبدیل‌های *غیرخطی* (HbA1c
  //   mmol/mol ↔ ٪NGSP) عمداً کنار گذاشته می‌شوند: نسبتِ دو عدد در آن‌ها ضریب نیست.
  const convFactor = new Map();
  for (const c of unitConversions) {
    if (!(typeof c.raw === "number" && typeof c.value === "number" && c.raw > 0) || c.test === "HBA1C") continue;
    convFactor.set(c.test, c.value / c.raw);
  }
  for (const g of graded) {
    const raw = printedRefsAll[g.test];
    const m = /^(-?[\d.]+)–(-?[\d.]+)$/.exec(String(g.range ?? ""));
    if (!raw || !m) continue;
    const pr0 = parseReference(raw, sex);
    if (!pr0) continue;
    const f = convFactor.get(g.test) ?? 1;
    const pr = { lo: pr0.lo == null ? null : pr0.lo * f, hi: pr0.hi == null ? null : pr0.hi * f };
    const lo = Number(m[1]), hi = Number(m[2]);
    if (!pr || pr.lo == null || pr.hi == null || !(lo > 0) || !(hi > 0) || !(pr.lo > 0) || !(pr.hi > 0)) continue;
    const near = (a, b) => a / b <= 1.5 && b / a <= 1.5;
    if (!near(pr.lo, lo) || !near(pr.hi, hi) || (pr.lo === lo && pr.hi === hi)) continue;
    // همان واحدِ سنجیده‌شده (متعارف) تا با engine_range قابلِ مقایسه بماند؛ عددِ برگه در «تأیید اعداد» آمده است.
    const round = (x) => (Math.abs(x) >= 100 ? Math.round(x) : Math.abs(x) >= 10 ? +x.toFixed(1) : +x.toFixed(2));
    printedRanges[g.test] = `${round(pr.lo)}–${round(pr.hi)}`;
  }


  // ═══ P116 (بازبینی بالینی ۲۰۲۶-۱۰-۲۷): بازهٔ چاپ‌شدهٔ برگه حقِ «تخفیف» دارد، نه «تشدید» ═══
  //   «GGT 46.2» با برگهٔ «up to 49» و «MCHC 36.3» با برگهٔ «30-37» خارج از محدوده خوانده می‌شدند
  //   (بازهٔ موتور باریک‌تر است) و بیمار هشدارِ بی‌مورد می‌گرفت. اگر خودِ آزمایشگاه عدد را در بازهٔ
  //   چاپی‌اش طبیعی می‌داند و انحرافِ موتور خفیف است (بی‌درجه یا mild) و دو بازه هم‌مقیاس‌اند، برچسب
  //   «خارج از محدوده» برداشته می‌شود و دلیلش روی ردیف می‌مانَد (printedNormal + note).
  //   ⚠️ سنجه‌های پرخطر (PRINTED_RELAX_EXEMPT) و شدتِ moderate+ هرگز تخفیف نمی‌گیرند.
  const relaxed = [];
  for (const g of graded) {
    if (!g.abnormal || PRINTED_RELAX_EXEMPT.has(g.test)) continue;
    if (g.level && g.level !== "mild") continue;
    if (g.ctcaeGrade != null && g.ctcaeGrade > 1) continue;
    const raw = printedRefsAll?.[g.test];
    if (!raw) continue;
    const pr = parseReference(raw, sex);
    const band = getRef(g.test, sex, age ?? 40, { pregnant: pregnantF });
    if (!pr || !band) continue;
    const near = (a, b) => !(a > 0 && b > 0) || (a / b <= 1.5 && b / a <= 1.5);
    if (pr.hi != null && !near(pr.hi, band[1])) continue;
    if (pr.lo != null && !near(pr.lo, band[0])) continue;
    if (printedVerdict(raw, g.value, sex) !== "within") continue;
    Object.assign(g, {
      abnormal: false, dir: null, patient: null, tag: "normal",
      fa: "در محدودهٔ چاپ‌شدهٔ برگه", printedNormal: true, printedRange: String(raw),
      note: "بازهٔ چاپ‌شدهٔ برگه این مقدار را طبیعی می‌داند؛ بازهٔ مرجعِ سامانه باریک‌تر است.",
    });
    relaxed.push(g.test);
  }

  // P108-ج (تصمیمِ کاربر ۲۰۲۶-۱۰-۱۶): نوبتِ قبلیِ ALT/AST برای «پایداری». فقط وقتی ورودی دارد (سرور از نتیجهٔ ذخیره‌شدهٔ
  //   کاربرِ واردشده می‌سازد) ⇒ بی‌آن خروجی بایت‌به‌بایت همان.
  const pv = priorVisit(ocr, sex, age);
  const prior = pv?.notEarlier ? null : pv;   // e.prior فقط برای نوبتِ واقعاً قبلی (V11/V13)
  const sampleDate = sampleDateOf(ocr);

  return {
    ...(prior ? { prior } : {}),
    ...(pv?.notEarlier ? { priorNotEarlier: true } : {}),
    ...(sampleDate ? { sample_date: sampleDate } : {}),
    sex, age,
    pregnant: pregnantF,
    // specs/011: همهٔ شناسه‌های گزارش‌شده؛ قاعده‌ها فقط شناسه‌های ACTIVE_CONDITIONS را می‌خوانند.
    conditions,
    graded,
    qual,
    // ردیف‌های کیفی/بازه‌ایِ برگهٔ منی (P47). ⚠️ عمداً جدا از qual: قاعده‌های ادرار qual را با
    // /rbc/ و /wbc/ می‌خوانند. هیچ قاعده‌ای در مرحلهٔ الف این را نمی‌خواند.
    semenQual,
    // specs/009: آیتم‌های لامِ خون — خواننده: smearAxis. ⚠️ متنِ چاپ‌شده دارد؛ به مدل و به گراف نمی‌رود (N13).
    smear,
    // P111: متنِ چاپیِ Comment/Note (آزمایشگاه/پاتولوژیست) — خواننده: lab_comment_note. عینِ متن، بی‌ترجمه.
    //   ⚠️ به مدل و گراف نمی‌رود (N13). فقط وقتی هست، تا فریزهای برگه‌های بی‌کامنت دست نخورند.
    ...(labComments.length ? { labComments } : {}),
    // P96: شیستوسیت/اسفروسیت — خواننده‌ها: patterns_malignancy.js. ⚠️ به مدل و گراف نمی‌رود (N13).
    ...(rbcMorph?.length ? { rbcMorph } : {}),   // فقط وقتی ردیفی هست — بی‌آن خروجیِ همهٔ برگه‌های بی‌شیستوسیت بایت‌به‌بایت همان می‌ماند (فریزها)
    // specs/010: فاکتور ۸/۹، vWF، مهارکننده، PTِ کنترل — خواننده: patterns_hemostasis.js و isthScore. به مدل و گراف نمی‌رود (N13).
    hemostasis,
    // specs/013: دابل/کوآد مارکر — خواننده: patterns_prenatal.js. به مدل و گراف نمی‌رود (N13).
    prenatal,
    // specs/014 (P87، مرحلهٔ الف): ادرارِ ۲۴ساعته و مایعِ بدن — بی‌خواننده؛ فقط specimenLine (prompt.js). به مدل و گراف نمی‌رود (N13).
    specimen,
    // specs/012: مرزِ چاپ‌شدهٔ ردیف‌های سرولوژی (کلید = نامِ خامِ ردیف در qual). به مدل نمی‌رود (N13).
    serologyRef,
    ungraded,
    indices: idx,
    // P113: اگر سنِ زیستی ساخته نشد، دلیلش همین‌جاست (وضعیت + مارکرهای غایب). فقط با `diagnostics: true`.
    ...(wantDiag && enginePhenoDiag ? { phenoAgeDiag: enginePhenoDiag } : {}),
    // P116: ردیف‌هایی که بازهٔ چاپ‌شدهٔ برگه «تخفیف» داد (فقط با diagnostics؛ برای حسابرسی).
    ...(wantDiag && relaxed.length ? { printedRelaxed: relaxed } : {}),
    unmapped,
    // دو عددِ متفاوت برای یک آزمایش (۲۰۲۶-۱۰-۰۶): server.js هشدار می‌سازد. فقط وقتی هست، تا فریزها دست نخورند.
    ...(valueConflicts.length ? { valueConflicts } : {}),
    // P107j: pHِ بی‌نوع (خون یا ادرار؟) — فقط وقتی هست، تا فریزها دست نخورند. خواننده: ph_type_ambiguous.
    ...(ambiguousPh ? { ambiguousPh } : {}),
    // P93: فقط در بارداریِ اعلام‌شده (تا فریزهای غیرباردار دست نخورند).
    ...(pregnantF ? { glucoseNames, ogtt100g } : {}),
    // سنِ بارداری (هفته) — فقط بارداریِ اعلام‌شده با هفتهٔ واردشده؛ نبودنش یعنی «نامعلوم» (تا فریزها دست نخورند).
    ...(gestWeeksF != null ? { gestWeeks: gestWeeksF } : {}),
    // P96: سقفِ چاپ‌شدهٔ LDH — برای کودک ULN از بازهٔ خودِ برگه گرفته می‌شود (isolated_ldh_elevation).
    ...(printedRefs.LDH && parseReference(printedRefs.LDH, sex)?.hi > 0 ? { ldhPrintedHi: parseReference(printedRefs.LDH, sex).hi } : {}),
    unitConversions,
    noRef,
    diffFailed,
    // فقط وقتی هست، تا خروجیِ برگه‌های بی‌بازهٔ متفاوت بایت‌به‌بایت همان بماند (فریزها).
    ...(Object.keys(printedRanges).length ? { printedRanges } : {}),
    ...(Object.keys(derivedAbs).length ? { derivedAbs } : {}),
    ...(Object.keys(derivedAbsRefs).length ? { derivedAbsRefs } : {}),
    abnormal: graded.filter((g) => g.abnormal),
    ...(tests._ddimer_ratio != null ? { _ddimer_uln_ratio: tests._ddimer_ratio } : {}),
  };
}

/** P110-ج: املای واحدِ چاپ‌شده برای نقل در متن — فقط اگر شکلِ واحد دارد (حرف/عدد/«/»/«%»، حداکثر ۱۶ نویسه). متنِ خامِ OCR
 *  به پرامپت و به بیمار می‌رود؛ هر چیزِ دیگر نقل نمی‌شود (notes.md: متنِ OCR دستور نیست). */
function printedUnitText(u) {
  const t = String(u ?? "").trim();
  return t && t.length <= 16 && /^[A-Za-zµμ0-9%/*^.\s-]+$/.test(t) && /[A-Za-zµμ%]/.test(t) ? t : null;
}

/** P110-ج (برگهٔ واقعی ۲۰۲۶-۱۰-۱۶): OCR گاهی واحدِ میکروسکوپیِ ادرار را به نام می‌چسباند («Bacteria /hpf»، «Mucus threads /hpf») و ستونِ
 *  واحد را خالی می‌گذارد ⇒ نام شناخته نمی‌شد و «Not seen» در «تفسیر نشدند» می‌آمد. فقط /hpf و /lpf، فقط وقتی واحدی چاپ نشده. */
/** پانویسِ نام را پیش از هر خواننده برمی‌دارد تا هر مصرف‌کننده‌ای که t.name خام می‌خواند هم نامِ پاک ببیند. فقط name؛ مقدار/واحد/بازه دست نمی‌خورد. */
function stripFootnotesFromNames(ocr) {
  if (!Array.isArray(ocr?.tests) || !ocr.tests.some((t) => t?.name && stripFootnote(t.name) !== t.name)) return ocr;
  return { ...ocr, tests: ocr.tests.map((t) => (t?.name && stripFootnote(t.name) !== t.name ? { ...t, name: stripFootnote(t.name) } : t)) };
}
function splitHpfFromName(ocr) {
  if (!Array.isArray(ocr?.tests)) return ocr;
  const re = /^(.*\S)\s*\/\s*(hpf|lpf)\.?$/i;
  if (!ocr.tests.some((t) => !t?.unit && re.test(String(t?.name ?? "")))) return ocr;
  return { ...ocr, tests: ocr.tests.map((t) => {
    const m = !t?.unit && String(t?.name ?? "").match(re);
    return m ? { ...t, name: m[1], unit: `/${m[2].toLowerCase()}` } : t;
  }) };
}
