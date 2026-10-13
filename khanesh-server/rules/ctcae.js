// ============================================================
// LabMate — درجه‌بندی CTCAE v5.0
//
// منبع: NCI Common Terminology Criteria for Adverse Events v5.0
//        (27 نوامبر 2017)
//        https://dctd.cancer.gov/research/ctep-trials/for-sites/adverse-events/
//
// چرا این فایل:
//   SEVERITY_STEP خودساخته بود. CTCAE استاندارد جهانی است و در همه‌ی
//   کارآزمایی‌های بالینی استفاده می‌شود. هر جا CTCAE پوشش دارد، از آن
//   استفاده می‌کنیم؛ بقیه با برچسب unvalidated می‌مانند.
//
// ⚠️ CTCAE با step کار نمی‌کند — نقاط برش صریح یا ضریب ULN/LLN دارد.
//
// نگاشت CTCAE → LabMate:
//   Grade 1 → mild
//   Grade 2 → moderate
//   Grade 3 → marked
//   Grade 4 → critical  (سطح جدید — CTCAE چهار درجه دارد، ما سه تا داشتیم)
//
// ⚠️ CTCAE برای بیمار سرطانی تحت درمان طراحی شده. درجه‌ها "سمیت" را
//    می‌سنجند نه لزوماً "شدت بیماری". برای LabMate قابل قبول است چون
//    هر دو یک سؤال را می‌پرسند: چقدر از نرمال دور است و چقدر مهم است.
// ============================================================

// نوع قاعده:
//   'abs'      → نقاط برش مطلق
//   'uln_mult' → ضریب حد بالای نرمال
//   'delta'    → اختلاف از ULN (مثل Hb افزایش‌یافته)
export const CTCAE_V5 = {

  // ===== خون‌شناسی =====
  HGB_LOW: {
    term: 'Anemia', dir: 'low', type: 'abs', unit: 'g/dL',
    // G1: <LLN – 10.0 | G2: <10.0 – 8.0 | G3: <8.0 | G4: —
    g1: v => v < 10.0,   // بالای 10 ولی زیر LLN → g1 (با گیت LLN)
    cuts: { g2: 10.0, g3: 8.0 },
    grade(v, lln) {
      if (v >= lln) return 0;
      if (v >= 10.0) return 1;
      if (v >= 8.0)  return 2;
      return 3;
    },
  },
  HGB_HIGH: {
    term: 'Hemoglobin increased', dir: 'high', type: 'delta', unit: 'g/dL',
    // G1: >ULN – ULN+2 | G2: >ULN+2 – ULN+4 | G3: >ULN+4
    grade(v, _lln, uln) {
      if (v <= uln) return 0;
      const d = v - uln;
      if (d <= 2) return 1;
      if (d <= 4) return 2;
      return 3;
    },
  },
  PLT_LOW: {
    term: 'Platelet count decreased', dir: 'low', type: 'abs', unit: 'K/µL',
    // G1: <LLN – 75 | G2: <75 – 50 | G3: <50 – 25 | G4: <25
    grade(v, lln) {
      if (v >= lln) return 0;
      if (v >= 75) return 1;
      if (v >= 50) return 2;
      if (v >= 25) return 3;
      return 4;
    },
  },
  WBC_LOW: {
    term: 'White blood cell decreased', dir: 'low', type: 'abs', unit: 'K/µL',
    // G1: <LLN – 3.0 | G2: <3.0 – 2.0 | G3: <2.0 – 1.0 | G4: <1.0
    grade(v, lln) {
      if (v >= lln) return 0;
      if (v >= 3.0) return 1;
      if (v >= 2.0) return 2;
      if (v >= 1.0) return 3;
      return 4;
    },
  },
  WBC_HIGH: {
    term: 'Leukocytosis', dir: 'high', type: 'abs', unit: 'K/µL',
    // CTCAE فقط G3: >100 دارد. G1/G2 تعریف نشده.
    grade(v, _lln, uln) {
      if (v <= uln) return 0;
      if (v > 100) return 3;
      return null;      // CTCAE درجه‌بندی ندارد
    },
    partial: true,
  },
  NEUT_LOW: {
    term: 'Neutrophil count decreased', dir: 'low', type: 'abs', unit: '/µL',
    // G1: <LLN – 1500 | G2: <1500 – 1000 | G3: <1000 – 500 | G4: <500
    grade(v, lln) {
      if (v >= lln) return 0;
      if (v >= 1500) return 1;
      if (v >= 1000) return 2;
      if (v >= 500)  return 3;
      return 4;
    },
  },
  LYMPH_LOW: {
    term: 'Lymphocyte count decreased', dir: 'low', type: 'abs', unit: '/µL',
    // G1: <LLN – 800 | G2: <800 – 500 | G3: <500 – 200 | G4: <200
    grade(v, lln) {
      if (v >= lln) return 0;
      if (v >= 800) return 1;
      if (v >= 500) return 2;
      if (v >= 200) return 3;
      return 4;
    },
  },
  LYMPH_HIGH: {
    term: 'Lymphocyte count increased', dir: 'high', type: 'abs', unit: '/µL',
    // G2: >4000 – 20000 | G3: >20000   (G1 و G4 تعریف نشده)
    grade(v) {
      if (v <= 4000)  return 0;
      if (v <= 20000) return 2;
      return 3;
    },
  },
  EOS_HIGH: {
    term: 'Eosinophilia', dir: 'high', type: 'abs', unit: '/µL',
    // فقط G1: >ULN و >baseline
    grade(v, _lln, uln) { return v > uln ? 1 : 0; },
    partial: true,
  },

  // ===== الکترولیت‌ها =====
  NA_LOW: {
    term: 'Hyponatremia', dir: 'low', type: 'abs', unit: 'mEq/L',
    // G1: <LLN – 130 | G2: — | G3: <130 – 120 | G4: <120
    grade(v, lln) {
      if (v >= lln) return 0;
      if (v >= 130) return 1;
      if (v >= 120) return 3;
      return 4;
    },
    note: 'CTCAE Grade 2 برای هیپوناترمی تعریف نشده',
  },
  NA_HIGH: {
    term: 'Hypernatremia', dir: 'high', type: 'abs', unit: 'mEq/L',
    // G1: >ULN – 150 | G2: >150 – 155 | G3: >155 – 160 | G4: >160
    grade(v, _lln, uln) {
      if (v <= uln) return 0;
      if (v <= 150) return 1;
      if (v <= 155) return 2;
      if (v <= 160) return 3;
      return 4;
    },
  },
  K_LOW: {
    term: 'Hypokalemia', dir: 'low', type: 'abs', unit: 'mEq/L',
    // G1: <LLN – 3.0 | G2: — | G3: <3.0 – 2.5 | G4: <2.5
    grade(v, lln) {
      if (v >= lln) return 0;
      if (v >= 3.0) return 1;
      if (v >= 2.5) return 3;
      return 4;
    },
    note: 'CTCAE Grade 2 برای هیپوکالمی تعریف نشده',
  },
  // P107 (L13، تصمیمِ کاربر ۲۰۲۶-۱۰-۱۳): pHِ خونِ شریانی (فقط وقتی adapter آن را pHِ خون شناخته — شاهدِ ABG).
  //   CTCAE v5 «Acidosis»: G1 = pH < طبیعی و ≥ ۷٫۳؛ G3 = pH < ۷٫۳؛ «Alkalosis»: G1 = > طبیعی و ≤ ۷٫۵؛ G3 = > ۷٫۵.
  //   G4ِ CTCAE «تهدیدکنندهٔ حیات» است و عدد ندارد؛ عددِ G4 اینجا تصمیمِ کاربر است: < ۷٫۲۰ یا > ۷٫۵۵ ⇒ بحرانی (اورژانس).
  PH_LOW: {
    term: 'Acidosis', dir: 'low', type: 'abs', unit: '',
    grade(v, lln) {
      if (v >= lln) return 0;
      if (v >= 7.3) return 1;
      if (v >= 7.2) return 3;
      return 4;
    },
  },
  PH_HIGH: {
    term: 'Alkalosis', dir: 'high', type: 'abs', unit: '',
    grade(v, _lln, uln) {
      if (v <= uln) return 0;
      if (v <= 7.5) return 1;
      if (v <= 7.55) return 3;
      return 4;
    },
  },
  K_HIGH: {
    term: 'Hyperkalemia', dir: 'high', type: 'abs', unit: 'mEq/L',
    // G1: >ULN – 5.5 | G2: >5.5 – 6.0 | G3: >6.0 – 7.0 | G4: >7.0
    grade(v, _lln, uln) {
      if (v <= uln) return 0;
      if (v <= 5.5) return 1;
      if (v <= 6.0) return 2;
      if (v <= 7.0) return 3;
      return 4;
    },
  },
  CA_LOW: {
    term: 'Hypocalcemia', dir: 'low', type: 'abs', unit: 'mg/dL',
    // G1: <LLN – 8.0 | G2: <8.0 – 7.0 | G3: <7.0 – 6.0 | G4: <6.0
    grade(v, lln) {
      if (v >= lln) return 0;
      if (v >= 8.0) return 1;
      if (v >= 7.0) return 2;
      if (v >= 6.0) return 3;
      return 4;
    },
    note: 'CTCAE کلسیم تصحیح‌شده می‌خواهد، نه کلسیم توتال خام',
  },
  CA_HIGH: {
    term: 'Hypercalcemia', dir: 'high', type: 'abs', unit: 'mg/dL',
    // G1: >ULN – 11.5 | G2: >11.5 – 12.5 | G3: >12.5 – 13.5 | G4: >13.5
    grade(v, _lln, uln) {
      if (v <= uln) return 0;
      if (v <= 11.5) return 1;
      if (v <= 12.5) return 2;
      if (v <= 13.5) return 3;
      return 4;
    },
    note: 'CTCAE کلسیم تصحیح‌شده می‌خواهد',
  },
  MG_LOW: {
    term: 'Hypomagnesemia', dir: 'low', type: 'abs', unit: 'mg/dL',
    // G1: <LLN – 1.2 | G2: <1.2 – 0.9 | G3: <0.9 – 0.7 | G4: <0.7
    grade(v, lln) {
      if (v >= lln) return 0;
      if (v >= 1.2) return 1;
      if (v >= 0.9) return 2;
      if (v >= 0.7) return 3;
      return 4;
    },
  },

  // ===== متابولیک =====
  GLU_LOW: {
    term: 'Hypoglycemia', dir: 'low', type: 'abs', unit: 'mg/dL',
    // G1: <LLN – 55 | G2: <55 – 40 | G3: <40 – 30 | G4: <30
    grade(v, lln) {
      if (v >= lln) return 0;
      if (v >= 55) return 1;
      if (v >= 40) return 2;
      if (v >= 30) return 3;
      return 4;
    },
  },
  GLU_HIGH: {
    term: 'Hyperglycemia', dir: 'high', type: 'abs', unit: 'mg/dL',
    // G1: >ULN – 160 | G2: >160 – 250 | G3: >250 – 500 | G4: >500
    grade(v, _lln, uln) {
      if (v <= uln) return 0;
      if (v <= 160) return 1;
      if (v <= 250) return 2;
      if (v <= 500) return 3;
      return 4;
    },
    note: 'در CTCAE v5 رسماً clinical-only است؛ این نقاط برش از v4/پروتکل‌ها',
  },
  ALB_LOW: {
    term: 'Hypoalbuminemia', dir: 'low', type: 'abs', unit: 'g/dL',
    // G1: <LLN – 3 | G2: <3 – 2 | G3: <2 | G4: تهدید حیات
    grade(v, lln) {
      if (v >= lln) return 0;
      if (v >= 3) return 1;
      if (v >= 2) return 2;
      return 3;
    },
  },

  // ===== کبد — ضریب ULN =====
  AST_HIGH: {
    term: 'Aspartate aminotransferase increased', dir: 'high', type: 'uln_mult', unit: 'U/L',
    // G1: >ULN – 3× | G2: >3× – 5× | G3: >5× – 20× | G4: >20×
    mults: [3, 5, 20],
    grade(v, _lln, uln) {
      const m = v / uln;
      if (m <= 1)  return 0;
      if (m <= 3)  return 1;
      if (m <= 5)  return 2;
      if (m <= 20) return 3;
      return 4;
    },
  },
  ALT_HIGH: {
    term: 'Alanine aminotransferase increased', dir: 'high', type: 'uln_mult', unit: 'U/L',
    mults: [3, 5, 20],
    grade(v, _lln, uln) {
      const m = v / uln;
      if (m <= 1)  return 0;
      if (m <= 3)  return 1;
      if (m <= 5)  return 2;
      if (m <= 20) return 3;
      return 4;
    },
  },
  ALP_HIGH: {
    term: 'Alkaline phosphatase increased', dir: 'high', type: 'uln_mult', unit: 'U/L',
    // G1: >ULN – 2.5× | G2: >2.5× – 5× | G3: >5× – 20× | G4: >20×
    mults: [2.5, 5, 20],
    grade(v, _lln, uln) {
      const m = v / uln;
      if (m <= 1)   return 0;
      if (m <= 2.5) return 1;
      if (m <= 5)   return 2;
      if (m <= 20)  return 3;
      return 4;
    },
  },
  GGT_HIGH: {
    term: 'GGT increased', dir: 'high', type: 'uln_mult', unit: 'U/L',
    mults: [2.5, 5, 20],
    grade(v, _lln, uln) {
      const m = v / uln;
      if (m <= 1)   return 0;
      if (m <= 2.5) return 1;
      if (m <= 5)   return 2;
      if (m <= 20)  return 3;
      return 4;
    },
  },
  BILI_HIGH: {
    term: 'Blood bilirubin increased', dir: 'high', type: 'uln_mult', unit: 'mg/dL',
    // G1: >ULN – 1.5× | G2: >1.5× – 3× | G3: >3× – 10× | G4: >10×
    mults: [1.5, 3, 10],
    grade(v, _lln, uln) {
      const m = v / uln;
      if (m <= 1)   return 0;
      if (m <= 1.5) return 1;
      if (m <= 3)   return 2;
      if (m <= 10)  return 3;
      return 4;
    },
  },
  CREAT_HIGH: {
    term: 'Creatinine increased', dir: 'high', type: 'uln_mult', unit: 'mg/dL',
    // G1: >ULN – 1.5× | G2: >1.5× – 3× | G3: >3× – 6× | G4: >6×
    mults: [1.5, 3, 6],
    grade(v, _lln, uln) {
      const m = v / uln;
      if (m <= 1)   return 0;
      if (m <= 1.5) return 1;
      if (m <= 3)   return 2;
      if (m <= 6)   return 3;
      return 4;
    },
  },
  CK_HIGH: {
    term: 'CPK increased', dir: 'high', type: 'uln_mult', unit: 'U/L',
    // G1: >ULN – 2.5× | G2: >2.5× – 5× | G3: >5× – 10× | G4: >10×
    mults: [2.5, 5, 10],
    grade(v, _lln, uln) {
      const m = v / uln;
      if (m <= 1)   return 0;
      if (m <= 2.5) return 1;
      if (m <= 5)   return 2;
      if (m <= 10)  return 3;
      return 4;
    },
  },
  TG_HIGH: {
    term: 'Hypertriglyceridemia', dir: 'high', type: 'abs', unit: 'mg/dL',
    // G1: 150–300 | G2: >300–500 | G3: >500–1000 | G4: >1000
    grade(v) {
      if (v < 150)  return 0;
      if (v <= 300) return 1;
      if (v <= 500) return 2;
      if (v <= 1000)return 3;
      return 4;
    },
  },
  CHOL_HIGH: {
    term: 'Cholesterol high', dir: 'high', type: 'abs', unit: 'mg/dL',
    // G1: >ULN–300 | G2: >300–400 | G3: >400–500 | G4: >500
    grade(v, _lln, uln) {
      if (v <= uln) return 0;
      if (v <= 300) return 1;
      if (v <= 400) return 2;
      if (v <= 500) return 3;
      return 4;
    },
  },
};

// ---------- نگاشت کلید تست LabMate → قواعد CTCAE ----------
export const CTCAE_MAP = {
  HGB:       { low: 'HGB_LOW',   high: 'HGB_HIGH'   },
  PLT:       { low: 'PLT_LOW',   high: null         },
  WBC:       { low: 'WBC_LOW',   high: 'WBC_HIGH'   },
  NEUT_ABS:  { low: 'NEUT_LOW',  high: null         },
  LYMPH_ABS: { low: 'LYMPH_LOW', high: 'LYMPH_HIGH' },
  EOS_ABS:   { low: null,        high: 'EOS_HIGH'   },
  NA:        { low: 'NA_LOW',    high: 'NA_HIGH'    },
  K:         { low: 'K_LOW',     high: 'K_HIGH'     },
  PH:        { low: 'PH_LOW',    high: 'PH_HIGH'    },   // P107 (L13)
  CA:        { low: 'CA_LOW',    high: 'CA_HIGH'    },
  MG:        { low: 'MG_LOW',    high: null         },
  GLU_F:     { low: 'GLU_LOW',   high: 'GLU_HIGH'   },
  GLU_RANDOM:{ low: 'GLU_LOW',   high: 'GLU_HIGH'   },
  ALB:       { low: 'ALB_LOW',   high: null         },
  AST:       { low: null,        high: 'AST_HIGH'   },
  ALT:       { low: null,        high: 'ALT_HIGH'   },
  ALP:       { low: null,        high: 'ALP_HIGH'   },
  GGT:       { low: null,        high: 'GGT_HIGH'   },
  BILI_T:    { low: null,        high: 'BILI_HIGH'  },
  CREAT:     { low: null,        high: 'CREAT_HIGH' },
  CK:        { low: null,        high: 'CK_HIGH'    },
  TG:        { low: null,        high: 'TG_HIGH'    },
  CHOL:      { low: null,        high: 'CHOL_HIGH'  },
};

/**
 * درجه CTCAE را برای یک تست برگردان.
 * @returns {{grade:number, term:string, source:'CTCAE v5'}|null}
 *          null یعنی CTCAE این تست/جهت را پوشش نمی‌دهد.
 */
export function ctcaeGrade(testKey, value, lln, uln) {
  const m = CTCAE_MAP[testKey];
  if (!m || value == null) return null;

  const dir = value > uln ? 'high' : (value < lln ? 'low' : null);
  if (!dir) return { grade: 0, term: null, source: 'CTCAE v5' };

  const ruleName = m[dir];
  if (!ruleName) return null;

  const rule = CTCAE_V5[ruleName];
  const g = rule.grade(value, lln, uln);
  if (g == null) return null;

  return { grade: g, term: rule.term, source: 'CTCAE v5', note: rule.note ?? null };
}

// CTCAE grade → برچسب LabMate
export const CTCAE_TO_LABEL = {
  0: 'normal',
  1: 'mild',
  2: 'moderate',
  3: 'marked',
  4: 'critical',
};

export const CTCAE_FA = {
  0: 'طبیعی',
  1: 'کمی خارج از حد طبیعی',
  2: 'خارج از حد طبیعی',
  3: 'خیلی خارج از حد طبیعی',
  4: 'بحرانی',
};

export function ctcaeCoverage() {
  const covered = [], partial = [];
  for (const [k, m] of Object.entries(CTCAE_MAP)) {
    const dirs = [];
    if (m.low)  dirs.push('پایین');
    if (m.high) dirs.push('بالا');
    const isPartial = (m.low && CTCAE_V5[m.low]?.partial) || (m.high && CTCAE_V5[m.high]?.partial);
    (isPartial ? partial : covered).push({ test: k, dirs });
  }
  return { covered, partial };
}
