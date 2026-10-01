import { RULES_INFECTIOUS } from "./patterns_infectious.js";
import { RULES_NEPHROLOGY, RULES_NEPHROLOGY_NEW } from "./patterns_nephrology.js";
import { RULES_HEMATOLOGY } from "./patterns_hematology.js";
import { RULES_BIOCHEM, RULES_BIOCHEM_NEW } from "./patterns_biochem.js";
import { levelGrade } from "./patterns_utils.js";
import { RULES_ENDOCRINE_RHEUM, RULES_ENDOCRINE_NEW } from "./patterns_endocrine_rheum.js";
import { RULES_MALIGNANCY } from "./patterns_malignancy.js";
import { RULES_MINERAL_BONE } from "./patterns_mineral_bone.js";
import { RULES_CARDIAC } from "./patterns_cardiac.js";
import { RULES_ENDOCRINE_PITUITARY } from "./patterns_endocrine_pituitary.js";
import { RULES_REPRODUCTIVE } from "./patterns_reproductive.js";
import { RULES_UNIT_UNKNOWN } from "./patterns_unit_unknown.js";
import { RULES_TRACE_ELEMENTS } from "./patterns_trace_elements.js";
import { RULES_URINE_CASTS } from "./patterns_urine_casts.js";
import { RULES_URINALYSIS } from "./patterns_urinalysis.js";
import { RULES_LEUKOCYTE } from "./patterns_leukocyte.js";
import { RULES_HEMOSTASIS } from "./patterns_hemostasis.js";
import { rankOf } from "./patterns_utils.js";
import { faName } from "./names.js";
import { applyNeonatalFloor, applyNeonatalVoice, isNeonate } from "./neonatal.js";
import { preanalyticalCaveats, attachPreanalytical } from "./preanalytical.js";
import { repeatDeltaFa } from "./biovar.js";


// حذف‌شده: LEGACY_ANEMIA_IDS — فهرستِ سرکوبِ مهاجرتی که در ba144a7 لغو شد.
// هرگز خوانده نمی‌شد؛ patterns_anemia.js که قرار بود جایگزینِ این هشت قاعده شود
// حذف شد چون هر کدامشان معادلِ زنده داشتند. نگه‌داشتنِ فهرست یعنی یک مهاجرتِ
// نیمه‌کاره را زنده جلوه دادن. هشت شناسه در تاریخچهٔ گیت‌اند اگر لازم شد.

export const RULES = [
  ...RULES_INFECTIOUS,
  ...RULES_NEPHROLOGY,
  ...RULES_NEPHROLOGY_NEW,
  ...RULES_HEMATOLOGY,
  ...RULES_MALIGNANCY,
  ...RULES_BIOCHEM,
  ...RULES_BIOCHEM_NEW,
  ...RULES_ENDOCRINE_RHEUM,
  ...RULES_ENDOCRINE_NEW,
  ...RULES_MINERAL_BONE,
  ...RULES_CARDIAC,
  ...RULES_ENDOCRINE_PITUITARY,
  ...RULES_REPRODUCTIVE,
  ...RULES_UNIT_UNKNOWN,
  ...RULES_TRACE_ELEMENTS,
  ...RULES_URINE_CASTS,
  ...RULES_URINALYSIS,
  ...RULES_LEUKOCYTE,
  ...RULES_HEMOSTASIS
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
  // specs/008 (N8): الکتروفورزِ روی برگه = HbA2 چاپ شده؛ sTfR را شاخهٔ التهابِ iron_deficiency پیشنهاد می‌دهد.
  "الکتروفورز هموگلوبین": ["HBA2"],
  "گیرندهٔ محلول ترانسفرین (sTfR)": ["STFR"],
  "TSH": ["TSH"],
  "FT4": ["FT4"],
  "FT3": ["FT3"],
  "TSH و FT4": ["TSH", "FT4"],
  // `amylase_emergency` این را پیشنهاد می‌دهد؛ بدونِ این ردیف، alreadyMeasured
  // برای رشتهٔ ناشناس false می‌دهد و به بیماری که لیپازش روی همان برگه چاپ شده
  // «درخواست آزمایش لیپاز» گفته می‌شود — N8، و جهتِ خطای ردیفِ غایب همیشه غلط است.
  "لیپاز": ["LIPASE"],
  "PLT": ["PLT"],
  "WBC": ["WBC"],
  "CRP": ["CRP_Q"],
  "ALP": ["ALP"],
  "AST": ["AST"],
  "GGT": ["GGT"],
  "PT": ["PT"],
  "FIB": ["FIB"],
  // specs/010 (N8): پیشنهادهای هموستاز؛ «تکرار آزمایش انعقاد» تکرار است و ردیف نمی‌خواهد.
  "aPTT": ["APTT"],
  "فیبرینوژن": ["FIB"],
  "vWF:RCo": ["VWF_ACT"],
  "vWF:Ag": ["VWF_AG"],
  "CK": ["CK"],
  "HbA1c": ["HBA1C"],
  "بیلی‌روبین": ["BILI_T"],
  "آلبومین خون": ["ALB"],
  "آلبومین (برای تصحیح کلسیم)": ["ALB"],
  "ویتامین B12": ["B12"],
  "مسِ ادرارِ ۲۴ساعته": ["U_COPPER_24H"],
  "فولات": ["FOLATE"],
  "آمیلاز": ["AMYLASE"],
  "منیزیم": ["MG"],
  // رشته باید *عیناً* با suggestِ قاعده‌ها یکی باشد — alreadyMeasured تطابقِ دقیق دارد.
  "اسمولالیتهٔ سرم": ["OSM"],
  "رتیکولوسیت": ["RETIC"],
  "شمارش رتیکولوسیت": ["RETIC"],
  "هاپتوگلوبین": ["HAPTO"],
  // job fff90f58 (E4، P58): پنلِ leukocytosis_with_cytopenia و maha_ttp_suspicion — بی‌این ردیف‌ها، LDH/پتاسیم/کراتینینِ
  //   چاپ‌شده روی همان برگه دوباره «درخواست» می‌شدند (N8؛ ردیفِ غایب همیشه به سمتِ غلط خطا می‌کند).
  "LDH": ["LDH"],
  "کراتینین": ["CREAT"],
  "اوره": ["UREA"],
  "اسید اوریک": ["URIC"],
  "پتاسیم": ["K"],
  // بیلی‌روبینِ غیرمستقیم روی برگه‌های ایرانی معمولاً چاپ نمی‌شود و از کسرِ
  // مستقیم از تام به دست می‌آید؛ پس «درخواستش» یعنی درخواستِ آن دو. اگر هر
  // دو روی برگه باشند این پیشنهاد باید حذف شود، وگرنه همان باگِ «درخواست
  // آزمایش فریتین» است که فریتین روی برگه بود — N8.
  "بیلی‌روبین مستقیم و غیرمستقیم": ["BILI_T", "BILI_D"],
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
  // ── مینرال و استخوان ──
  // ⚠️ این‌ها *باید* اینجا باشند، وگرنه دقیقاً باگِ N8 تکرار می‌شود: قاعده‌های
  //    patterns_mineral_bone.js وقتی PTH را می‌خوانند «هورمون پاراتیروئید (PTH)»
  //    را هم پیشنهاد می‌دهند، و بدونِ این ردیف‌ها به بیمار گفته می‌شد
  //    «درخواست آزمایش PTH از پزشک» در حالی که PTH همان بالای برگه‌اش چاپ شده.
  //    رشته باید *عیناً* با suggestِ قاعده یکی باشد — تطابق دقیق است.
  "هورمون پاراتیروئید (PTH)": ["PTH"],
  "کلسیم ادرار ۲۴ ساعته": ["U_CA"],
  // ⚠️ «تکرار کلسیم» / «تکرار فسفر» عمداً اینجا *نیستند* — طبق همان قاعدهٔ
  //    بالا، «تکرارِ …» پایشِ سریالی است نه درخواستِ آزمایشی که نداریم.
  //    اگر اضافه شوند، calcium_abnormal توصیهٔ «تکرار کلسیم»‌اش را از دست
  //    می‌دهد، چون کلسیم همیشه روی برگه هست وقتی آن قاعده فعال می‌شود.
  "کلسیم": ["CA"],
  "فسفر": ["PHOS"],
  "ویتامین D": ["VIT_D"],
  "کراتینین و eGFR": ["CREAT"],
  // ⚠️ همان باگِ N8، روی برگه‌ای که *کلِ* پروفایل چربی رویش چاپ شده بود:
  //    قاعدهٔ glycemia «پروفایل چربی» را پیشنهاد می‌دهد، این رشته در جدول
  //    نبود، پس alreadyMeasured هیچ‌وقت حذفش نمی‌کرد و بیمار زیرِ چهار عددِ
  //    چربیِ خودش می‌خواند «درخواست آزمایش پروفایل چربی از پزشک».
  //    چهار کلید با همِ لازم است: با سه‌تا، برگه‌ای که LDL ندارد هم «کامل»
  //    شمرده می‌شد و پیشنهادِ درست حذف می‌شد.
  "پروفایل چربی": ["CHOL", "LDL", "HDL", "TG"],
  // فصل ۲۶ (P47). ⚠️ LH/FSHِ مرد هنوز بازه ندارند و در graded نیستند، پس این ردیف امروز چیزی
  //   را حذف نمی‌کند؛ male_gonadal_axis خودش فقط وقتی پیشنهاد می‌دهد که روی برگه نباشند.
  //   ردیف برای روزی است که بازه‌شان تأیید شود (N8: ردیفِ غایب همیشه به سمتِ غلط می‌شکند).
  "LH و FSH": ["LH", "FSH"],
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
  // نوزاد (job c138671c) — بازه‌های سنیِ همین یافته‌ها از PED_REFS (RCPCH 2016) می‌آیند.
  neonatal_reference_context: ["RCPCH"],
  // کلیه — مرحله‌بندی G1–G5، باندهای ACR، و شرطِ دوامِ ۳ ماه، همه KDIGO است.
  kidney:               ["KDIGO_CKD"],
  albuminuria_pattern:  ["KDIGO_CKD"],
  // قند — آستانه‌های تشخیصی و DKA/HHS از ADA.
  glycemia:             ["ADA_SOC"],
  dka_pattern:          ["ADA_SOC"],
  hhs_pattern:          ["ADA_SOC"],
  hypoglycemia:         ["ADA_SOC"],
  // ⚠️ `lipid_profile` عمداً اینجا نیست: آستانه‌های LDL/کلسترول در refs.js از
  //    NCEP ATP III می‌آیند، نه از ESC/EAS. تا وقتی اهدافِ ریسک‌محورِ ESC
  //    (<۵۵/<۷۰/<۱۰۰/<۱۱۶) واقعاً پیاده نشده‌اند، برچسبِ ESC یعنی ادعای
  //    منبعی که موتور از آن استفاده نمی‌کند. ورودیِ ESC_EAS_LIPID در
  //    guidelines.js برای همان کارِ آینده نگه داشته شده.
  //    شاخهٔ ≥۵۰۰ی همان قاعده منبعش هنری فصل ۱۸ است و برچسبش را — مثل شاخهٔ
  //    دیابتِ کنارش — روی خودِ یافته می‌گذارد، نه روی کلِ قاعده.
  // چربی — آستانه‌های شکِ FH (بزرگسال ۱۹۰/۲۲۰، زیر ۲۰ سال ۱۶۰/۱۹۰) و apoB ≥۱۳۰
  //    همگی از هنری فصل ۱۸ می‌آیند.
  severe_hypercholesterolemia:        ["HENRY_LIPID"],
  familial_hypercholesterolemia_youth:["HENRY_LIPID"],
  apob_elevated:                      ["HENRY_LIPID"],
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
  // LDHِ بالای منفرد — متنش هیچ عددی ندارد؛ آنچه از منبع می‌آید *ترتیبِ* مسیرِ
  // بازتابی است (سه‌تایی اول، اسمیر بعد از تأیید) و غیراختصاصی‌بودنِ LDH.
  isolated_ldh_elevation: ["MERCK_PRO", "ARUP_CONSULT"],
  // انعقاد
  dic_pattern:          ["ISTH"],
  dic_isth_score:       ["ISTH"],
  factor_activity:      ["WFH_HEMOPHILIA"],
  factor_inhibitor:     ["WFH_HEMOPHILIA"],
  // P59 — فقط جایی که سند خوانده و تطبیق داده شد؛ scopeِ هر ورودی می‌گوید چه چیزی را پوشش *نمی‌دهد*.
  pancytopenia:         ["CHEW_PANCYTOPENIA"],
  maha_ttp_suspicion:   ["ISTH_TTP"],
  // سرولوژی
  hcv_screen_reactive:  ["CDC_SEROLOGY", "AASLD"],
  hbv_screen_reactive:  ["CDC_SEROLOGY", "AASLD"],
  hiv_screen_reactive:  ["CDC_SEROLOGY"],
  brucella_active:      ["IR_BRUCELLOSIS"],
  brucella_wright_only: ["IR_BRUCELLOSIS"],
  // روماتولوژی و ویتامین
  rf_positive:          ["ACR_EULAR"],
  vitamin_d_abnormal:   ["ENDO_VIT_D"],
  // مینرال و استخوان — محورِ کلسیم/PTH، جدول‌های ۱۶.۱ و ۱۶.۲ و آستانهٔ
  //   هیپوفسفاتمیِ علامت‌دار، همه از فصل ۱۶ هنری می‌آیند.
  hpt_primary:                       ["HENRY_MINERAL"],
  fhh_pattern:                       ["HENRY_MINERAL"],
  hypercalcemia_pth_independent:     ["HENRY_MINERAL"],
  hypercalcemia_pth_indeterminate:   ["HENRY_MINERAL"],
  hypoparathyroidism:                ["HENRY_MINERAL"],
  hpt_secondary_renal:               ["HENRY_MINERAL"],
  hpt_secondary_nonrenal:            ["HENRY_MINERAL"],
  hypocalcemia_pth_indeterminate:    ["HENRY_MINERAL"],
  hpt_renal_advanced:                ["HENRY_MINERAL"],
  hypophosphatemia_severe:           ["HENRY_MINERAL"],
  // ⚠️ pth_isolated_abnormal / phosphate_abnormal / urine_calcium_abnormal
  //    عمداً اینجا نیستند: آن‌ها فقط روی محدودهٔ مرجع می‌ایستند (که خودش در
  //    getRefSource ثبت است) و هیچ آستانه یا الگویی از فصل ۱۶ نمی‌خوانند.
  //    برچسبِ منبع روی قاعده‌ای که از آن منبع چیزی نگرفته، ادعای دروغ است.
};

/**
 * کلیدهایی که *سورسِ* هر قاعده می‌خواند — یک‌بار در بارگذاریِ ماژول ساخته می‌شود.
 *
 * چرا از روی سورس و نه یک فیلدِ `tests:` روی خودِ قاعده: ۹۵ قاعده هست و
 * دست‌زدن به همه‌شان یعنی ۹۵ فرصتِ خراب‌کاری — همان استدلالِ RULE_SOURCES.
 * سورس‌خوانی هم دقیق‌تر از متن‌کاوی است: `liver_pattern` دربارهٔ AST/ALT
 * حرف می‌زند بی‌آنکه اسمشان را در متن بیاورد، ولی در `match` هر دو را می‌خواند.
 *
 * ⚠️ این نگاشت فقط به تورِ ایمنیِ `unexplained_abnormal` سرویس می‌دهد. برای
 *    هیچ تصمیمِ بالینیِ دیگری استفاده نشود — «قاعده این کلید را خواند» با
 *    «قاعده دربارهٔ این کلید چیزی گفت» یکی نیست، و دقیقاً به همین دلیل
 *    شرطِ AND با متن‌کاوی هم لازم است.
 */
const RULE_READS = new Map();
for (const rule of RULES) {
  if (!rule?.id) continue;
  // ⚠️ کامنت‌ها اول حذف می‌شوند. toString() آن‌ها را نگه می‌دارد، و کامنتی مثل
  //    «// PT>25، فیبرینوژن<100، یا INR>3 → فوری» کلید را «خوانده‌شده» جا می‌زند
  //    بی‌آنکه کد واقعاً بخواندش. جهتِ این خطا سکوت است، و سکوت بدترین خروجیِ
  //    این تور است — پس محافظه‌کارانه‌تر آن است که کمتر «پوشش‌داده» بشماریم.
  const src = (String(rule.match) + "\n" + String(rule.build))
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n]*/g, " ");
  const keys = new Set();
  for (const tok of src.match(/[A-Z][A-Z0-9_]+/g) ?? []) keys.add(tok);
  RULE_READS.set(rule.id, keys);
}

/**
 * آیا این تستِ ناهنجار در متنِ یافته‌ها اسم برده شده؟
 *
 * سه راهِ اسم‌بردن پذیرفته است: نامِ فارسیِ faName، هستهٔ فارسیِ آن بدون
 * پرانتزِ لاتین («PT (زمان پروترومبین)» → «زمان پروترومبین»)، و خودِ کلیدِ
 * لاتین با مرزِ واژه. مرزِ واژه لازم است وگرنه `PT` داخلِ `aPTT` می‌افتد و
 * تستِ دیگری را «توضیح‌داده‌شده» جا می‌زند — یعنی سکوت، که خطرناک‌ترین جهت است.
 */
function textNamesTest(text, key) {
  const fa = faName(key);
  if (fa && fa !== key && text.includes(fa)) return true;
  const faCore = String(fa).replace(/\s*\([^)]*\)\s*/g, " ").trim();
  if (faCore && faCore !== key && faCore.length > 1 && text.includes(faCore)) return true;
  // RDW_SD/RDW_CV تا ۲۰۲۶-۰۹-۲۴ هر دو «RDW» نام داشتند و متنِ قاعده‌ها (مثلاً اسفروسیتوز) «RDW» می‌گوید. نام جدا شد
  // (N8)، ولی «RDW» در متن هنوز اشاره به همین دو است — بی این، RDW-CVِ همان یافته به «توضیح داده نشدند» می‌رفت.
  if ((key === "RDW_SD" || key === "RDW_CV") && /(^|[^A-Za-z])RDW([^A-Za-z_]|$)/.test(text)) return true;
  return new RegExp(`(^|[^A-Za-z0-9_])${key}([^A-Za-z0-9_]|$)`).test(text);
}

// soon = «ظرفِ ۲۴ تا ۴۸ ساعت» — بینِ اورژانس و این هفته (تصمیمِ بازبینِ بالینی ۲۰۲۶-۰۹-۲۸، P56؛ اول برای بلاستِ کم).
const order = { emergency: 0, soon: 1, this_week: 2, routine: 3 };
const rank = (u) => (u in order ? order[u] : 3);  // urgency نامعتبر → routine
/** فوری‌ترین blocks_othersِ فهرست (Infinity اگر نباشد). */
const blockerRankOf = (findings) =>
  Math.min(...findings.filter((f) => f.blocks_others).map((f) => rank(f.urgency)));
/** یافتهٔ always_show که فقط به‌خاطر همین استثنا زیرِ یک blocker مانده و نسخهٔ کوتاهش (brief) را می‌گیرد. */
function willBrief(f, findings) {
  const br = blockerRankOf(findings);
  return Number.isFinite(br) && !!f.always_show && rank(f.urgency) > br && !!f.brief;
}

/** جملهٔ اولِ must_say — همان جمله‌ای که server.js برای key_number هم برمی‌دارد (عدد و جهت در آن است). */
const firstSentence = (s) => String(s ?? "").split(/(?<=[.؟!])\s/)[0].trim();
/**
 * متنِ فشردهٔ «یافتهٔ تکمیلی»: جملهٔ اولِ خودِ قاعده، بی‌هیچ متنِ تازه. برچسب و شمارش را انتخابِ یافته‌ها می‌گذارد.
 * ⚠️ فقط از همان یافته می‌خواند؛ چیزی نمی‌سازد و timeline ندارد (action و warnings و suggest نمی‌آیند — N20).
 */
// جملهٔ اولی که بی‌زمینه نامفهوم است («این اعداد…»، «برای قطعی‌شدنِ تشخیص، این آزمایش…»، «برخلافِ کمبودِ آهن…») تنها و زیرِ اورژانس
// به چیزی ارجاع می‌دهد که بیمار ندیده؛ به‌جایش headline می‌آید (عنوانِ خودبسندهٔ همان قاعده). بازبینیِ ۲۰۲۶-۰۹-۲۹، شرطِ پرسش ۲ از P60.
// ⚠️ با مرزِ واژه: «آنزیمی…» و «آنتی‌بادی…» با «آن» شروع می‌شوند و نباید گرفتار شوند (تستِ CK-MB این را گرفت).
const DANGLING_START = /^(این|آن|همین|چنین|برخلاف|برای|یک آزمایش|پس|بنابراین|همچنین)(?=[\s،—])/;
// جملهٔ اولِ تعریفی که دربارهٔ عددِ بیمار ادعایی ندارد («LDH آنزیمی است که…»، «لیپاز آنزیمی است…»، «لنفوسیت‌ها نوعی گلبول سفیدند که در
// عفونتِ ویروسی بالا می‌روند») — فهرستِ صریحِ id (نه heuristic): headline می‌آید. تأییدِ کاربر ۲۰۲۶-۰۹-۲۹، بندِ (ج) پرسش ۲ از P60.
const COMPACT_HEADLINE_ONLY = new Set(["isolated_ldh_elevation", "pancreas_pattern", "viral_lymphocytosis"]);
// یافته‌ای که هرگز «یافتهٔ تکمیلی» نمی‌شود: hematuria_pattern در جملهٔ نوار «رنگدانهٔ هموگلوبین» را می‌گوید و تورِ نام‌برداری با آن
// Hb را «نام‌برده‌شده» می‌شمرد؛ خودش هم کلیدِ graded ندارد (کیفی است)، پس چیزی از بیمار گرفته نمی‌شود. همین تأیید.
const NO_SUPPLEMENTARY_IDS = new Set(["hematuria_pattern"]);
const compactBody = (f) => {
  const s = firstSentence(f.must_say);
  const head = String(f.headline ?? "").trim();
  if (COMPACT_HEADLINE_ONLY.has(f.rule_id) && head) return head;
  return s && !DANGLING_START.test(s) ? s : head || s;
};
/**
 * متنِ نمایشیِ یافتهٔ تکمیلی: جملهٔ اول + مقدارِ کلیدهایی که به‌خاطرشان برگشت، اگر جمله عددشان را نگفته باشد —
 * همان قالبِ خطِ «توضیح داده نشدند» (نام، عدد، طبیعی). بدونِ این، عددِ CK-MB ۴۵ از گزارش می‌افتاد و فقط اسمش می‌ماند.
 * @param named ردیف‌های engineOut.abnormal که این یافته نامشان را می‌برد و هیچ متنِ دیگری نگفته بود.
 */
function compactText(f, named = []) {
  const body = compactBody(f);
  const esc = (v) => String(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const says = (a) => new RegExp(`(^|[^0-9.])${esc(a.value)}($|[^0-9])`).test(body);
  const lacking = named.filter((a) => !says(a));
  if (!lacking.length) return body;
  const list = lacking.map((a) => `${faName(a.test)} ${a.value}${a.range ? ` (طبیعی ${a.range})` : ""}`).join("، ");
  return `${body.replace(/[.؟!]+$/, "")} — مقدار روی برگه: ${list}.`;
}

export function runPatterns(engineOut) {
  const findings = [];
  // یافته‌های کم‌فوریتی که زیرِ blocker پنهان می‌شدند ولی عددی را توضیح می‌دهند که هیچ متنِ نمایشی نمی‌گوید —
  // به‌جای حذف، به‌صورتِ فشرده نشان داده می‌شوند (پر می‌شود در تورِ ایمنی ۲، مصرف می‌شود در «انتخاب یافته‌ها»).
  const rescued = new Map(); // یافته → ردیف‌های غیرطبیعیِ بی‌توضیحی که به‌خاطرشان برمی‌گردد
  // ⚠️ قاعده‌ای که throw کند، یافته‌اش بی‌صدا از گزارشِ بیمار حذف می‌شود.
  //    تا امروز فقط یک console.error می‌خورد — یعنی روی سرورِ پرودکشن هیچ‌کس
  //    نمی‌فهمید، و خروجی همچنان «کامل» به نظر می‌رسید. این همان چیزی است که
  //    انتهای N15 در CLAUDE.md می‌گوید: «گاردی که دادهٔ بد را بی‌شمارش رد کند،
  //    خطای بلند را به خطای خاموش تبدیل می‌کند.» پس شمرده می‌شود و برمی‌گردد.
  //    قفل: M93 (هیچ قاعده‌ای throw نمی‌کند) و M93b (شمارنده واقعاً می‌شمارد).
  const rulesFailed = [];
  for (const rule of RULES) {
    if (!rule?.id) continue;
    try {
      if (!rule.match(engineOut)) continue;
      const f = rule.build(engineOut);
      if (f) findings.push({ rule_id: rule.id, ...f });
    } catch (e) {
      console.error(`[Engine] Rule ${rule.id} failed:`, e.message);
      rulesFailed.push({ rule_id: rule.id, error: String(e?.message ?? e) });
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
  const measured = new Set([...(engineOut?.graded ?? []).map((g) => g.test), ...Object.keys(engineOut?.hemostasis ?? {})]);
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
    // نوزادِ < ۲۸ روز: بیلی‌روبین با بازهٔ بزرگسال سنجیده می‌شود، پس ۹ تا ۱۴ «بحرانی» درمی‌آید. اورژانسِ بیلی‌روبینِ نوزاد فقط از
    //   bilirubin_emergency (≥ ۱۵ mg/dL) می‌آید؛ این تور آن را بحرانی نمی‌شمارد و کفِ نوزادی «همین امروز» می‌گذارد (P63).
    const neoBili = (a) => isNeonate(engineOut.age) && /^BILI_/.test(a.test);
    const hasCritical = engineOut.abnormal.some((a) => a.level === "critical" && !neoBili(a));
    const hasMarked = engineOut.abnormal.some(
      (a) => !neoBili(a) && (a.level === "marked" || a.level === "critical" || levelGrade(a) >= 3)
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

  // ═══ تور ایمنی ۲ — تستِ ناهنجارِ بی‌اشاره ═══
  // 🔴 باگ واقعی (اندازه‌گیری‌شده، ۲۰۲۶-۰۸-۰۶): تورِ بالا فقط وقتی می‌گیرد که
  //    findings خالی باشد. پس روی برگه‌ای که یک قاعدهٔ دیگر فعال شده، تستِ
  //    ناهنجارِ بی‌قاعده *اصلاً ذکر نمی‌شد* — نه پیامِ مبهم، بلکه سکوتِ کامل.
  //
  //    پنلِ سنجش: Hb 9.5 · MCV 70 · فریتین 6 · فسفر 1.0
  //    → microcytic_anemia + iron_deficiency_panel فعال شدند و فسفرِ ۱.۰
  //      (هیپوفسفاتمیِ شدید) از گزارش ناپدید شد. بیمار یک تفسیرِ کامل و
  //      قانع‌کننده دربارهٔ فقر آهن می‌خواند و خبر ندارد چیزِ دیگری هم هست.
  //      این همان کلاسِ N2/N16 است: کم‌خوانیِ خاموش در لباسِ جوابِ تمام‌شده.
  //
  // «بی‌اشاره» با شرطِ AND تعریف می‌شود — هم هیچ قاعدهٔ فعال‌شده‌ای کلید را
  // *نخوانده* باشد، هم متنِ یافته‌ها اسمش را نبرده باشد. هر کدام تنها،
  // اندازه‌گیری شد و بد بود: متن‌کاویِ خالص روی پنلِ کبدی ۶ مثبتِ کاذب داد
  // (liver_pattern دربارهٔ AST/ALT حرف می‌زند بی‌آنکه اسمشان را بیاورد)، و
  // سورس‌خوانیِ خالص روی همان پنلِ فقر آهن IRON را «پوشش‌داده» جا زد.
  // با AND، پنلِ کبدی به یک مورد رسید و شکاف‌های واقعی سرِ جایشان ماندند.
  if (findings.length > 0 && engineOut.abnormal.length > 0) {
    // 🔴 بازبینیِ دور ۳ (R3-CR1): یافته‌ای که زیرِ یک blocker فقط briefش نشان داده می‌شود، کلیدهایی را که
    //    must_sayِ کاملش توضیح می‌داد «پوشش‌داده» می‌کرد و بعد همان متن با brief عوض می‌شد — HCTِ ۵۵ کنارِ Hbِ ۸.۳،
    //    MCH و RBCِ بالا روی برگهٔ پان‌سیتوپنی نه توضیح داشتند نه در این تور می‌آمدند (N18). چنین یافته‌ای فقط با
    //    متنی که واقعاً نشان داده می‌شود (brief و brief_warnings) پوشش می‌دهد، نه با RULE_READS.
    // 🔴 specs/009 (R6، M200): همین کلاس برای یافته‌ای که زیرِ blocker *کاملاً* پنهان می‌شود. WBC 80 + بازوفیل ۵٪ →
    //    cml_suspicion و cll_suspicion_nccn match می‌شدند، زیرِ extreme_leukocytosis پنهان می‌ماندند و BASO_ABS/LYMPH_ABS را
    //    «پوشش‌داده» می‌کردند: بازوفیلِ ۴۰۰۰ و لنفوسیتِ ۶۴۰۰ نه در متن بودند نه در این تور. یافتهٔ پنهان با RULE_READS هیچ پوششی نمی‌دهد؛ فقط اگر متنِ فشردهٔ «یافتهٔ تکمیلی» عددی را نام ببرد (rescued، پایین‌تر) پوشش با همان متن حساب می‌شود.
    const br = blockerRankOf(findings);
    const hidden = new Set(Number.isFinite(br)
      ? findings.filter((f) => rank(f.urgency) > br && !f.always_show)
      : []);
    const briefed = new Set(findings.filter((f) => willBrief(f, findings)));
    const covered = new Set();
    for (const f of findings) {
      if (briefed.has(f) || hidden.has(f)) continue;
      for (const k of RULE_READS.get(f.rule_id) ?? []) covered.add(k);
    }
    const text = findings
      .filter((f) => !hidden.has(f))
      .map((f) => briefed.has(f)
        ? [f.headline, f.brief, f.action, (f.brief_warnings ?? []).join(" ")].join(" ")
        : [f.headline, f.must_say, f.action, (f.warnings ?? []).join(" ")].join(" "))
      .join(" ");

    let orphans = engineOut.abnormal
      .filter((a) => !covered.has(a.test) && !textNamesTest(text, a.test))
      .sort((a, b) => rankOf(b) - rankOf(a));

    // 🔴 job 40b8a901 / fff90f58: یافتهٔ پنهان‌شده‌ای که *خودش* عددی را نام می‌برد که هیچ متنِ نمایشی نمی‌گوید، قبلاً
    //    بی‌صدا حذف می‌شد و همان عدد زیرِ «توضیحِ آمادهٔ اختصاصی نداریم» می‌آمد — بیمار عددِ دارای‌توضیحِ موتور را
    //    «بی‌توضیح» می‌خواند (N18/N2). حالا چنین یافته‌ای به شکلِ فشرده برمی‌گردد. یافته‌ای که چیزِ تازه‌ای نمی‌گوید
    //    (کلیدهایش را متنِ دیگری گفته، مثلِ leukopenia زیرِ pancytopenia) پنهان می‌ماند تا اورژانس رقیق نشود؛ شمارشش در
    //    suppressed/suppressed_ids می‌ماند. ملاک، متنِ فشرده است نه RULE_READS (N18: پوششْ خاصیتِ متنِ دیده‌شده است).
    if (orphans.length > 0 && hidden.size > 0) {
      const seen = (f) => `${f.headline ?? ""} ${compactBody(f)}`;
      for (const f of hidden) {
        // یافتهٔ فنی (خطای نمونه/دستگاه) یا آن‌که خودش کنار گذاشته، تکمیلی نمی‌شود؛ کلیدش به خطِ صادقانهٔ «توضیح داده نشدند» می‌رود.
        if (f.technical || f.no_supplementary || NO_SUPPLEMENTARY_IDS.has(f.rule_id)) continue;
        const named = orphans.filter((a) => textNamesTest(seen(f), a.test));
        if (named.length) rescued.set(f, named);
      }
      if (rescued.size > 0) {
        const extra = [...rescued.keys()].map((f) => `${f.headline ?? ""} ${compactText(f, rescued.get(f))}`).join(" ");
        orphans = orphans.filter((a) => !textNamesTest(extra, a.test));
      }
    }

    if (orphans.length > 0) {
      const hasCritical = orphans.some((a) => a.level === "critical");
      const hasMarked = orphans.some(
        (a) => a.level === "marked" || a.level === "critical" || levelGrade(a) >= 3
      );
      const urgency = hasCritical ? "emergency" : hasMarked ? "this_week" : "routine";

      // فهرست را می‌بریم تا جمله بلند نشود؛ چون بر اساس rankOf مرتب شده،
      // آن‌چه بریده می‌شود همیشه کم‌اهمیت‌ترین‌هاست و تعدادش گفته می‌شود.
      const SHOWN = 6;
      const head = orphans.slice(0, SHOWN);
      const rest = orphans.length - head.length;
      const list = head
        .map((a) => `${faName(a.test)} ${a.value}${a.range ? ` (طبیعی ${a.range})` : ""}`)
        .join("، ");
      const tail = rest > 0 ? ` و ${rest} مورد دیگر` : "";

      findings.push({
        rule_id: "unexplained_abnormal",
        pattern: "unexplained_abnormal",
        // ⚠️ فهرستِ ساختاریِ همان کلیدها، برای مصرف‌کنندهٔ پایین‌دست.
        //    بدونِ این، فرانت فقط می‌دانست «یک جایی در این پنل چیزی بی‌توضیح
        //    ماند» و آن پرچمِ کل‌پنلی را به *هر* ردیفِ غیرطبیعی می‌چسباند —
        //    پس بیمارِ فقر آهن کنارِ Hb و MCVِ کاملاً توضیح‌داده‌شده هم
        //    «نیازمند بررسی» می‌دید. سیگنالی که دربارهٔ پنل درست است دربارهٔ
        //    یک تست غلط است؛ همان کلاسِ N18/N16 یک لایه بالاتر.
        uncovered: orphans.map((a) => a.test),
        urgency,
        // ⚠️ هرگز blocks_others نمی‌شود: این تور جای قاعده را نمی‌گیرد،
        //    فقط چیزی را که هیچ قاعده‌ای برنداشته اضافه می‌کند.
        blocks_others: false,
        // زیر یک یافتهٔ مهم‌تر پنهان نمی‌شود، ولی نسخهٔ کوتاهش را می‌گیرد —
        // همان قراردادِ always_show/brief که D-dimer هم از آن استفاده می‌کند.
        always_show: true,
        headline: "چند نتیجهٔ خارج از محدوده که جداگانه توضیح داده نشدند",
        must_say:
          `${orphans.length} مورد دیگر هم خارج از محدودهٔ مرجع است و در توضیح‌های بالا ` +
          `به آن‌ها پرداخته نشده: ${list}${tail}. برای این‌ها توضیحِ آمادهٔ اختصاصی نداریم؛ ` +
          "این یعنی موتور دربارهٔ آن‌ها نتیجه‌گیری نکرده، نه اینکه بی‌اهمیت‌اند.",
        brief: `${orphans.length} نتیجهٔ دیگر هم خارج از محدوده است: ${list}${tail}.`,
        action: hasCritical
          ? "همین امروز با پزشک تماس بگیرید و این برگه را همراه ببرید."
          : hasMarked
          ? "این هفته با پزشک وقت بگیرید و این برگه را همراه ببرید."
          // 🔴 برگهٔ واقعی ۲۰۲۶-۰۹-۲۴: «این موارد را …» در فهرستِ توصیه‌ها بی‌مرجع می‌ماند — آن فهرست جدا از متن است.
          : `این نتایجِ خارج از محدوده را هم موقع مراجعه با پزشک مرور کنید: ${head.map((a) => faName(a.test)).join("، ")}${tail}.`,
        suggest: [],
        warnings: [],
      });
    }
  }

  // ═══ کفِ فوریتِ نوزادی (P57 پرسش ۵) ═══ — پیش از انتخاب، تا blocks_others و ترتیب با فوریتِ نهایی کار کنند.
  applyNeonatalFloor(findings, engineOut);
  applyNeonatalVoice(findings, engineOut);

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
  // blocks_others یعنی «موارد کم‌اهمیت‌تر را بپوشان» — یعنی هرچه فوریتش از
  // خودِ blocker پایین‌تر است. نه هاردکد "emergency": اگر روزی blocker با
  // فوریت this_week تعریف شود، فیلترِ === "emergency" خودِ blocker را هم
  // حذف می‌کرد و selected خالی می‌شد → overall_urgency اشتباهاً "none".
  const blockerRank = blockerRankOf(findings);
  const hasBlocker = Number.isFinite(blockerRank);

  // always_show: یافته‌ای که حتی زیر یک blockerِ مهم‌تر هم نباید پنهان شود
  //   (مثل D-dimer که همیشه باید دست‌کم یک اشارهٔ کوتاه داشته باشد). بقیهٔ
  //   موارد کم‌اهمیت‌تر طبق روال پنهان می‌شوند تا پیام اورژانس رقیق نشود —
  //   مگر اینکه عددی را توضیح بدهند که هیچ متنِ نمایشی نمی‌گوید (rescued، تورِ ایمنی ۲):
  //   آن‌ها «یافتهٔ تکمیلی» می‌شوند، نه حذف.
  const isDemoted = (f) => hasBlocker && rank(f.urgency) > blockerRank && !f.always_show;
  const demoted = findings.filter(isDemoted);
  const selected = findings.filter((f) => !isDemoted(f));
  // به ترتیبِ فوریت (پایدار) تا شمارهٔ «۱ از n» همان ترتیبی باشد که بعد از shown.sort دیده می‌شود.
  const supplementary = demoted.filter((f) => rescued.has(f)).sort((x, y) => rank(x.urgency) - rank(y.urgency));

  // یافتهٔ always_show که فقط به‌خاطر همین استثنا زیر یک blocker مانده،
  //   نسخهٔ کوتاهش (brief) را می‌گیرد تا پیام اورژانس را شلوغ نکند.
  //   brief_warnings: هشدارهایی که حتی در نسخهٔ کوتاه نباید بیفتند (مثلِ هشدارِ ناقل بودنِ HbA2 — R3-CR1).
  const shown = selected.map((f) =>
    willBrief(f, findings)
      ? { ...f, must_say: f.brief, warnings: f.brief_warnings ?? [], suggest: [] }
      : f
  );
  // یافتهٔ تکمیلی: فقط جملهٔ اولِ خودِ قاعده، با برچسب و شمارش. action/warnings/suggest/protected نمی‌آیند —
  // فوریت و دستورِ نهایی و ترتیبِ اورژانس دست‌نخورده می‌ماند (این‌ها فوریتِ پایین‌تر از blocker دارند و
  // pickFinalAction/overall_urgency را عوض نمی‌کنند). forbid و key_number می‌مانند.
  supplementary.forEach((f, i) => {
    shown.push({
      ...f,
      must_say: `یافتهٔ تکمیلی ${i + 1} از ${supplementary.length} (جدا از دستور اورژانسی): ${compactText(f, rescued.get(f))}`,
      action: "",
      warnings: [],
      suggest: [],
      protected: [],
      supplementary: true,
    });
  });

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
    // چند یافته زیرِ blocker از متنِ کامل افتاد (پیش از این: همه حذف می‌شدند؛ حالا آن‌هایی که عددِ بی‌توضیح را
    // می‌گویند فشرده برمی‌گردند). suppressed_ids همهٔ آن‌هاست، supplementary_ids فقط زیرمجموعهٔ نمایش‌داده‌شده.
    suppressed: demoted.length,
    suppressed_ids: demoted.map((f) => f.rule_id),
    supplementary_ids: supplementary.map((f) => f.rule_id),
    // قاعده‌هایی که استثنا دادند و یافته‌شان از گزارش افتاد. آرایهٔ خالی یعنی
    // هیچ‌کدام نیفتاده — نه اینکه کسی نگاه نکرده. ⚠️ اگر روزی ناخالی شد،
    // یعنی بیمار یک گزارشِ ناقص گرفته و هیچ‌جای دیگری این را نمی‌گوید.
    rules_failed: rulesFailed,
    // هشدارهای پیش‌تحلیلیِ بی‌صاحب (هدفشان در این پنل یافته‌ای نداشت)
    preanalytical,
  };
}
