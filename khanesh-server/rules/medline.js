// ============================================================
// LabMate — نگاشت نام تست‌ها به عبارت جستجوی MedlinePlus + استخراج ترم‌ها
//
// این ماژول خالص و بدون side-effect است (نه fetch نه شبکه) تا مستقل
// تست‌پذیر باشد. بخش fetch/کش در server.js می‌ماند.
// ============================================================

export const TEST_MEDLINE_MAP = {
  // قند و دیابت
  "قند خون ناشتا": "Blood Glucose",
  "fbs": "Blood Glucose",
  "glucose": "Blood Glucose",
  "قند دو ساعته": "Blood Glucose",
  "2hpp": "Blood Glucose",
  "postprandial": "Blood Glucose",
  "hba1c": "A1C Test",
  // چربی
  "کلسترول تام": "Cholesterol Levels",
  "cholesterol": "Cholesterol Levels",
  "تری‌گلیسیرید": "Triglyceride Levels",
  "triglyceride": "Triglyceride Levels",
  "hdl": "HDL Cholesterol",
  "ldl": "LDL Cholesterol",
  // کلیه
  "اوره": "Urea",
  "urea": "Urea",
  "bun": "BUN (Blood Urea Nitrogen)",
  "کراتینین": "Creatinine Test",
  "creatinine": "Creatinine Test",
  "اسید اوریک": "Uric Acid Test",
  "uric": "Uric Acid Test",
  // کبد
  "ast": "Liver Function Tests",
  "sgot": "Liver Function Tests",
  "alt": "Liver Function Tests",
  "sgpt": "Liver Function Tests",
  "alp": "Liver Function Tests",
  // LDH عمداً نگاشت ندارد: MedlinePlus موضوعی متناظر LDH ندارد و همهٔ ترم‌های
  // آزموده‌شده سند نامربوط می‌دادند («Lactate Dehydrogenase (LDH) Test» →
  // Pancreatic Diseases، «LDH»/«Lactate Dehydrogenase» → Anemia). LDH نشانگر
  // عمومی آسیب بافتی است؛ هیچ‌کدام درست نیست. «بدون منبع» بهتر از «منبع غلط» است.
  "بیلی‌روبین": "Bilirubin Blood Test",
  "bilirubin": "Bilirubin Blood Test",
  "آلبومین": "Albumin Blood Test",
  "albumin": "Albumin Blood Test",
  // الکترولیت
  "سدیم": "Sodium Blood Test",
  "sodium": "Sodium Blood Test",
  "پتاسیم": "Potassium Blood Test",
  "potassium": "Potassium Blood Test",
  "کلسیم": "Calcium Blood Test",
  "calcium": "Calcium Blood Test",
  "منیزیم": "Magnesium Blood Test",
  "magnesium": "Magnesium Blood Test",
  // آهن
  "فریتین": "Ferritin Blood Test",
  "ferritin": "Ferritin Blood Test",
  "آهن": "Iron Tests",
  "iron": "Iron Tests",
  "tibc": "Iron Tests",
  // CBC
  "گلبول سفید": "White Blood Count (WBC)",
  "wbc": "White Blood Count (WBC)",
  "گلبول قرمز": "RBC Count",
  "rbc": "RBC Count",
  // ⚠️ ترم «Hemoglobin Test» در MedlinePlus وجود ندارد و جست‌وجو سند «A1C» را
  //    برمی‌گرداند — یعنی خلاصهٔ پایش دیابت به‌عنوان مرجع هموگلوبین وارد پرامپت می‌شد.
  //    MedlinePlus هموگلوبین را زیر «Blood Count Tests» پوشش می‌دهد (مثل WBC/RBC/HCT).
  "هموگلوبین": "Blood Count Tests",
  "hemoglobin": "Blood Count Tests",
  "hgb": "Blood Count Tests",
  "هماتوکریت": "Hematocrit Test",
  "hematocrit": "Hematocrit Test",
  "hct": "Hematocrit Test",
  "mcv": "Red Blood Cell (RBC) Indices",
  "mch": "Red Blood Cell (RBC) Indices",
  "mchc": "Red Blood Cell (RBC) Indices",
  "پلاکت": "Platelet Tests",
  "platelet": "Platelet Tests",
  "plt": "Platelet Tests",
  "esr": "ESR (Erythrocyte Sedimentation Rate)",
  "rdw": "Red Blood Cell (RBC) Indices",
  // انعقاد
  "pt": "Prothrombin Time Test and INR",
  "ptt": "Partial Thromboplastin Time (PTT) Test",
  "aptt": "Partial Thromboplastin Time (PTT) Test",
  // تیروئید
  "tsh": "TSH (Thyroid-Stimulating Hormone) Test",
  "t4": "T4 Test",
  "t3": "T3 Test",
  // ویتامین
  "ویتامین d": "Vitamin D Test",
  "vitamin d": "Vitamin D Test",
  "vitd": "Vitamin D Test",
  "ویتامین b12": "Vitamin B12 Level Test",
  "b12": "Vitamin B12 Level Test",
  "فولات": "Folate Test",
  "folate": "Folate Test",
};

// کاراکترهای «واژه» برای مرزبندی: لاتین، رقم و حروف فارسی/عربی.
// تطبیق زیررشته‌ای (مثلاً "ast" داخل "fasting" یا "pt" داخل "aptt") مرجع اشتباه می‌داد.
const WORD_CHAR = "a-z0-9\\u0600-\\u06FF";
const medlineKeyRegexCache = new Map();
export function matchesMedlineKey(namePart, key) {
  let re = medlineKeyRegexCache.get(key);
  if (!re) {
    const esc = key.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    re = new RegExp(`(?<![${WORD_CHAR}])${esc}(?![${WORD_CHAR}])`, "u");
    medlineKeyRegexCache.set(key, re);
  }
  return re.test(namePart);
}

export function extractMedlineTerms(testResultsText) {
  if (!testResultsText) return [];
  const terms = new Map();
  const lines = testResultsText.split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    const namePart = (line.split(":")[0] || "").trim().toLowerCase();
    if (!namePart) continue;
    for (const key in TEST_MEDLINE_MAP) {
      if (matchesMedlineKey(namePart, key)) {
        const term = TEST_MEDLINE_MAP[key];
        if (!terms.has(term)) terms.set(term, line.trim());
        break;
      }
    }
  }
  return Array.from(terms.entries()).map(([term, sourceLine]) => ({ term, sourceLine }));
}
