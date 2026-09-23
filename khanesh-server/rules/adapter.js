// ============================================================
// LabMate — پل بین OCR و موتور قواعد
//
// کار این فایل:
//   ۱. نام تست‌های برگه (W.B.C, Hb, urea, ...) → کلید موتور (WBC, HGB, UREA_N)
//   ۲. تبدیل واحد (اوره → BUN)
//   ۳. Diff درصدی → مطلق
//   ۴. استنتاج سن و جنسیت
// ============================================================

import { getRef, getRefSource, getUnit, ckdEpiEgfr, REPRO_HORMONE_KEYS, HCG_POSITIVE_ABOVE, HCG_QUAL_NAME_RE } from "./refs.js";
import { evaluate } from "./grade.js";
import { toConventional, UNIT_PROFILE, recognizedUnit, decideUnit, verdictsAcrossSystems, BRANCH_FACTORS,
         parseReference, printedVerdict, readingsAcrossSystems, printedRangeFits, possibleConv, normUnit } from "./units.js";
// فقط برای سنجیدنِ «هر خوانشِ ممکن»ِ عددِ بی‌واحد با خودِ موتور (specs/003، B3). patterns.js هیچ‌چیز از
// adapter.js نمی‌خواند، پس چرخهٔ import نیست.
import { runPatterns } from "./patterns.js";
// سیلندرِ ادرار (specs/005). patterns_utils.js هم چیزی از adapter.js نمی‌خواند.
import { isCastKey, castRoute, isSgKey, sgValue, SG_KEY, isCrystalKey, crystalRoute, epithelialKind, epithelialRoute,
  urineBiliValueState, urobilValueState } from "./patterns_utils.js";

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
  // specs/004 (FR-005): املاهایی که روی برگهٔ واقعی می‌آیند و unmapped می‌ماندند (N2)
  vitb12: "B12", cobalamin: "B12", "ویتامینب۱۲": "B12", "ویتامینb12": "B12", "ویتامینب12": "B12",
  folate: "FOLATE", folicacid: "FOLATE", فولات: "FOLATE",
  serumfolate: "FOLATE", folateserum: "FOLATE", vitaminb9: "FOLATE", فولیکاسید: "FOLATE", اسیدفولیک: "FOLATE",
  vitd: "VIT_D", vitamind: "VIT_D", "vitamind3": "VIT_D", vitd3: "VIT_D",
  // ═══ specs/004: ویتامین‌ها و عناصرِ کمیاب — شناخته‌شده، بی‌بازه (noRef) تا تأییدِ P49 ═══
  // فقط نامِ کامل. مخففِ دوحرفی (zn/cu/se) فقط با واحدِ سازگار — UNIT_GATED_ALIASES پایین‌تر.
  // mn/co/cr/mo هرگز: «Cr» روی برگهٔ ایرانی کراتینین است (N2).
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
  // ⚠️ norm() خط تیره و فاصله را می‌اندازد، پس «Apo-B» و «Apo B» هر دو «apob»
  //    می‌شوند و کلیدِ جدایی لازم ندارند. فارسی هم ي→ی و نیم‌فاصله نرمال می‌شود.
  apob: "APOB", apob100: "APOB", apolipoproteinb: "APOB", apolipoproteinb100: "APOB",
  آپولیپوپروتئینb: "APOB", آپوب: "APOB", آپوبی: "APOB",
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
  "specificgravity", "sg", "turbidity", "nitrite", "nitrites", "leukocyteesterase", "urobilinogen",
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
function resolveAlias(key) {
  // هیچ تستِ دیگری با esr شروع نمی‌شود؛ «ESR 1hrs»، «ESR 1st hour»، «ESR 2hrs»
  if (/^esr/.test(key)) return "ESR";
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
function unitGatedKey(key, unit) {
  const k = UNIT_GATED_ALIASES[key];
  return k && TRACE_CONC_UNIT.test(normUnit(unit)) ? k : undefined;
}

// ═══ specs/004 (FR-007، N25): کیفی — هرگز به عدد تبدیل نمی‌شوند (N6) و هرگز به qual نمی‌روند ═══
// qual با regex روی *هر* کلید جست‌وجو می‌شود (N25)، پس «Anti-Intrinsic Factor: Positive» آنجا
// خواننده‌های ناخواسته پیدا می‌کرد. به noRef ⇒ خطِ «تفسیر نشدند» با faName، و متنِ خامشان در
// ungraded (reason: no_range) تا overt_b12_deficiency فقط «مثبت» را بخواند (P49-ج، تأییدِ ۲۰۲۶-۰۹-۱۹).
// یافته‌ای که یکی را تفسیر کند آن را در explains می‌گذارد و از خط بیرون می‌رود (unexplainedNoRef).
const QUAL_NO_READER = new Set(["ANTI_IF", "APCA"]);
// ═══ P49-الف: کلیدهای بی‌پروفایلِ واحد که قاعده‌ای عددشان را می‌خواند ═══
// سرولوپلاسمین mg/dL یا g/L چاپ می‌شود (۱۰ در برابرِ ۰.۱)، مسِ ادرار µg یا µmol در ۲۴ ساعت. هیچ‌کدام در
// UNIT_PROFILE نیستند، پس واحدِ چاپ‌شده اینجا نگه داشته می‌شود و قاعده فقط با واحدِ چاپ‌شده حکم می‌دهد (N3).
const UNIT_KEPT = new Set(["CERULOPLASMIN", "U_COPPER_24H"]);

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
  "apob", "apolipoproteinb",
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
// ارقام فارسی/عربی و ممیز عربی را اول به لاتین تبدیل می‌کنیم؛ سپس فقط رقم/نقطه/علامت می‌مانَد.
//
// 🔴 کاما (بازبینیِ specs/003؛ HEAD هم همین بود): هر کاما جداکنندهٔ هزارگان حساب می‌شد، پس برگه‌ای که
//    ممیز را کاما می‌نویسد «K 5,5» → ۵۵ (هیپرکالمیِ کشنده، اورژانسِ کاذب) و «Creatinine 1,2» → ۱۲ می‌گرفت.
//    حالا همان قاعدهٔ parseReference در units.js: کاما فقط وقتی هزارگان است که پیش از گروه‌های دقیقاً
//    سه‌رقمی بیاید و عدد با صفر شروع نشود («250,000»، «1,250,000»)؛ با نقطه در عدد، کاما هزارگان است
//    («1,234.5»)؛ یک کامای دیگر ممیز است («5,5»، «0,500»)؛ هر شکلِ دیگر («5,5,5») مبهم ⇒ null، نه حدس.
//    ⚠️ ابهامِ باقی‌مانده: «1,200» همیشه ۱۲۰۰ خوانده می‌شود، حتی اگر منظور ۱٫۲۰۰ بوده باشد.
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
function commaToDot(s) {
  const run = s.match(/[\d.,]*\d/)?.[0] ?? "";
  if (!run.includes(",")) return s;
  if (run.includes(".") || /^[1-9]\d{0,2}(,\d{3})+$/.test(run)) return s.replace(/,/g, "");
  if (/^\d+,\d+$/.test(run)) return s.replace(",", ".");
  return null;
}
function toNum(v) {
  if (v == null) return null;
  const pre = commaToDot(String(v)
    .replace(/[۰-۹]/g, (d) => FA_DIGITS.indexOf(d))
    .replace(/[٠-٩]/g, (d) => AR_DIGITS.indexOf(d))
    .replace(/٬/g, ",")           // جداکنندهٔ هزارگانِ عربی → کاما (همان قاعدهٔ بالا)
    .replace(/٫/g, "."));         // ممیز عربی → نقطه
  if (pre == null) return null;
  const s = pre.replace(/[^\d.\-+]/g, "");
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
    [/([\d.]+)\s*(?:ماه|month|mo)/gi, 1 / 12],
    [/([\d.]+)\s*(?:هفته|weeks?|wks?|w)(?![a-z])/gi, 7 / 365],
    [/([\d.]+)\s*(?:روز|day|d)/gi, 1 / 365],
    [/([\d.]+)\s*(?:ساعت|hours?|hrs?|h)(?![a-z])/gi, 1 / 8760],
  ];
  let total = 0, hit = false;
  for (const [re, f] of PARTS) for (const p of s.matchAll(re)) { total += Number(p[1]) * f; hit = true; }
  if (hit) return total;
  const m = s.match(/([\d.]+)/);
  return m ? Number(m[1]) : null;
}

/**
 * OCR → مقادیر آماده برای موتور
 */
export function ocrToEngineInput(ocr) {
  const tests = {};
  const qual = {};
  const unmapped = [];
  // کلیدهای QUAL_NO_READER که روی برگه بودند — در runEngine به noRef می‌روند (specs/004).
  const noReader = [];
  const noReaderValues = {};   // متنِ خامِ همان کلیدها («Positive»، «منفی»، «25») — P49-ج
  const printedUnits = {};     // واحدِ چاپ‌شدهٔ UNIT_KEPT — P49-الف
  // تبدیل‌های واحدِ انجام‌شده — برای شفافیت به بیمار و برای اشکال‌زدایی.
  // «۴۸ mmol/mol → ۶.۵٪» باید جایی دیده شود، وگرنه عددِ روی برگه با عددِ
  // تفسیر نمی‌خواند و بیمار حق دارد فکر کند اشتباه شده.
  const unitConversions = [];
  const urineOnlyPages = detectUrineOnlyPages(ocr?.tests || []);
  const abgPages = detectAbgPages(ocr?.tests || []);
  // آنالیزِ منی (P47): ردیف‌های این صفحه‌ها نه ادرارند نه CBC. کانالِ جدا، نه qual (بالا).
  const semenQual = {};
  // ردیف‌هایی که واحدشان نه چاپ شده، نه از محدودهٔ مرجع/اندازه تعیین شد (specs/003، P48):
  //   کلید → عددِ خام. سنجیده نمی‌شوند؛ مالک: unit_unknown_values.
  const unitUnknown = {};
  // تعیینِ واحد از شواهد (نه چاپ‌شده): کلید → { basis, raw, from } — برای سطرِ «واحد» به بیمار.
  const unitResolved = {};
  const sexHint = inferSex(ocr), ageHint = inferAge(ocr);
  // 🔴 واحدِ نانوشته (کلاسِ N3): پیش از این هر عددِ بی‌واحد بی‌صدا «متعارف» فرض می‌شد — کراتینینِ
  //    ۸۰ µmol/L (طبیعی) → اورژانس، قندِ ۱۵ mmol/L (بالا) → «قند پایین». حالا: اگر واحدِ چاپ‌شده
  //    شناخته‌شده است، همان راهِ امروز (دست‌نخورده)؛ وگرنه decideUnit در units.js از شواهدِ خودِ
  //    ردیف تصمیم می‌گیرد، و اگر نتوانست، عدد *اصلاً* سنجیده نمی‌شود.
  //    خروجی: ردیفی با واحدِ متعارفِ سیستمِ انتخاب‌شده (تا شاخه‌های پایین همان تبدیلِ همیشگی را
  //    بکنند)، یا null یعنی «نامعلوم».
  const BRANCH_KEYS = new Set(["TROPONIN_I", "CRP_Q", "TESTO", "T3"]);
  const resolveRowUnit = (key, row, v) => {
    if (!UNIT_PROFILE[key]) return row;
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
    const d = decideUnit(key, v, row.reference, sexHint, ageHint);
    if (!d.system) { unitUnknown[key] = { value: v, reference: row.reference ?? null }; return null; }
    unitResolved[key] = { basis: d.basis, raw: v, from: d.system.unit };
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

  for (let t of ocr?.tests || []) {
    if (!t?.name) continue;
    const key = norm(t.name);
    const onUrinePage = urineOnlyPages.has(t._page ?? 0);
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
          else if (nv != null && !/[+<>≤≥]/.test(rawV)) tests[sk] = nv;
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
        } else {
          // ng/mL و µg/L عددشان یکی است → دست‌نخورده.
          // ⚠️ واحدِ نانوشته عمداً *حدس زده نمی‌شود*، برخلافِ D-dimer بالاتر.
          //    آنجا دو مقیاس شکافِ عددیِ تمیزی دارند (mg/L زیر ۵۰، ng/mL بالای
          //    آن)؛ اینجا ندارند: بازهٔ µg/L در بیمارِ واقعی ۰.۰۱ تا ~۱۰۰ است و
          //    بازهٔ ng/L ‏۱ تا ۱۰۰٬۰۰۰ — روی ۱۰ تا ۱۰۰ کاملاً هم‌پوشان‌اند.
          //    حدس زدن در این هم‌پوشانی همان چیزی است که N3 دربارهٔ آن است.
          tests.TROPONIN_I = tv;
        }
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
    if (!engineKey) engineKey = unitGatedKey(key, t.unit);
    if (!engineKey) {
      unmapped.push(t.name);
      continue;
    }
    if (QUAL_NO_READER.has(engineKey)) {
      if (!noReader.includes(engineKey)) noReader.push(engineKey);
      if (noReaderValues[engineKey] == null) noReaderValues[engineKey] = String(t.value ?? "");
      continue;
    }
    if (UNIT_KEPT.has(engineKey) && !(engineKey in printedUnits)) printedUnits[engineKey] = t.unit ?? null;

    let v = toNum(t.value);
    if (v == null) {
      // عددِ کامادارِ مبهم («5,5,5») متن نیست که قاعده‌ای در qual بخواند — بی‌صدا گم می‌شد (N2).
      // به unmapped ⇒ «این تست‌ها … تفسیرشان نمی‌کند … با پزشک بررسی کنید».
      if (/^\s*[<>≤≥]?\s*[\d۰-۹٠-٩][\d۰-۹٠-٩.,٫٬\s]*$/.test(String(t.value ?? "")) && /[,٬]/.test(String(t.value))) {
        unmapped.push(t.name);
        continue;
      }
      qual[t.name] = String(t.value);   // مقدار غیرعددی
      continue;
    }

    // ═══ واحدِ نانوشته (specs/003) — پیش از هر تبدیلی، تا شاخه‌های پایین واحدِ قطعی ببینند ═══
    t = resolveRowUnit(engineKey, t, v);
    if (!t) continue;

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
        tests.ACR = +(v * BRANCH_FACTORS.ACR_MGMMOL_TO_MGG).toFixed(1);          // mg/mmol → mg/g
      } else {
        tests.ACR = v;                               // mg/g یا µg/mg (معادل)
      }
      continue;
    }

    tests[engineKey] = v;
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
    semenQual,
    unitUnknown,
    rawText,
    unmapped,
    noReader,
    noReaderValues,
    printedUnits,
    unitConversions,
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
  const { tests, qual, semenQual, unitUnknown, rawText, unmapped, noReader, noReaderValues, printedUnits, unitConversions, diffFailed, sex, age } = ocrToEngineInput(ocr);

  const conditions = ocr?.patient?.conditions || [];
  const isCancerPatient = conditions.some((c) => /سرطان|شیمی.?درمانی|رادیوتراپی|ایمونوتراپی/.test(c));

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
  if (tests.CA != null && tests.ALB != null) {
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
  const URG_RANK = { none: 0, routine: 1, this_week: 2, emergency: 3 };
  const maxUrg = (a, b) => (URG_RANK[a] >= URG_RANK[b] ? a : b);
  const urgencyOfReading = (key, conv) => {
    const ref = getRef(key, sex, age);
    if (!ref) return "none";
    const probe = {
      sex, age, qual: {}, semenQual: {}, ungraded: {}, indices: {}, unmapped: [], unitConversions: [],
      noRef: [], diffFailed: false,
      graded: [{ test: key, value: conv, range: `${ref[0]}–${ref[1]}`, refSource: getRefSource(key, age),
        ...evaluate(key, conv, ref[0], ref[1], isCancerPatient) }],
    };
    probe.abnormal = probe.graded.filter((g) => g.abnormal);
    return runPatterns(probe).overall_urgency;
  };
  for (const [key, { value, reference }] of Object.entries(unitUnknown)) {
    const band = getRef(key, sex, age ?? 40);
    const printed = parseReference(reference, sex);
    const neonatalBili = /^BILI_/.test(key) && age != null && age < 1;
    const entry = { value, reason: "unit_unknown", alt: verdictsAcrossSystems(key, value, sex, age),
      units: UNIT_PROFILE[key].systems.length };
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
      if (entry.level === "all" && possible.length > 1) entry.urgency = maxUrg(entry.urgency, "this_week");
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

  for (const [key, value] of Object.entries(tests)) {
    if (key.startsWith("_") || key.endsWith("_PCT")) continue;

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

    const ref = getRef(key, sex, age);
    if (!ref) {
      noRef.push(key);
      if (REPRO_HORMONE_KEYS.has(key)) ungraded[key] = { value, reason: "no_range" };
      else if (UNIT_KEPT.has(key)) ungraded[key] = { value, reason: "no_range", unit: printedUnits[key] ?? null };
      continue;
    }

    const e = evaluate(key, value, ref[0], ref[1], isCancerPatient);
    graded.push({
      test: key,
      value,
      // بازهٔ یک‌طرفه (فقط حدِ پایین، P47) «≥ حد» نمایش داده می‌شود، نه «16–null».
      range: ref[1] == null ? `≥ ${ref[0]}` : `${ref[0]}–${ref[1]}`,
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
    // ردیف‌های کیفی/بازه‌ایِ برگهٔ منی (P47). ⚠️ عمداً جدا از qual: قاعده‌های ادرار qual را با
    // /rbc/ و /wbc/ می‌خوانند. هیچ قاعده‌ای در مرحلهٔ الف این را نمی‌خواند.
    semenQual,
    ungraded,
    indices: idx,
    unmapped,
    unitConversions,
    noRef,
    diffFailed,
    abnormal: graded.filter((g) => g.abnormal),
  };
}
