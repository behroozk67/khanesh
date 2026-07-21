// ============================================================
// LabMate — محدوده‌های مرجع
// منبع: Henry's Clinical Diagnosis, Appendix A5 (Tables A5-4, A5-9)
// این جدول جایگزین محدوده‌های چاپ‌شده روی برگه می‌شود.
// ⚠️ فقط بزرگسال. برای سن < 18 هیچ مرجعی اینجا نیست.
// ============================================================

export const ADULT_REFS = {
  // ---- CBC (Table A5-9) ----
  HCT:  { M: [41.5, 50.4], F: [35.9, 44.6], unit: '%' },
  HGB:  { M: [14, 17.5],   F: [12.3, 15.3], unit: 'g/dL' },
  RBC:  { M: [4.5, 5.9],   F: [4.5, 5.1],   unit: 'M/µL' },
  WBC:  { both: [4.4, 11],  unit: 'K/µL' },
  MCV:  { both: [80, 96],   unit: 'fL' },
  MCH:  { both: [27.5, 33.2], unit: 'pg' },
  // ⚠️ تصمیم کاربر (کارشناس ارشد آزمایشگاه): 32–36 به‌جای Henry 33.4–35.5
  MCHC: { both: [32, 36], unit: '%', source: 'user_override' },
  PLT:  { both: [150, 450], unit: 'K/µL' },
  RETIC:{ both: [0.5, 1.5], unit: '%' },
  RDW_CV:{ both: [11.5, 14.5], unit: '%' },
  RDW_SD:{ both: [35, 56],    unit: 'fL' },
  MPV:  { both: [7.5, 11.5],  unit: 'fL' },

  // ---- Diff — درصد (از Mean % و absolute counts استنتاج شده) ----
  // جدول A5-9 برای درصدها فقط "Mean %" می‌دهد نه بازه.
  // بازه‌های زیر از absolute counts + WBC 4.4-11 محاسبه شده‌اند.
  NEUT_ABS:  { both: [1800, 7800], unit: '/µL' },
  LYMPH_ABS: { both: [1000, 4800], unit: '/µL' },
  MONO_ABS:  { both: [0, 800],     unit: '/µL' },
  EOS_ABS:   { both: [0, 450],     unit: '/µL' },
  BASO_ABS:  { both: [0, 200],     unit: '/µL' },
  BAND_ABS:  { both: [0, 700],     unit: '/µL' },

  // ---- بیوشیمی (Table A5-4) ----
  UREA_N:  { both: [8, 23],    unit: 'mg/dL' },  // Urea nitrogen (BUN)
  CREAT:   { both: [0.6, 1.2], unit: 'mg/dL' },
  NA:      { both: [136, 142], unit: 'mEq/L' },
  K:       { both: [3.8, 5],   unit: 'mEq/L' },
  CL:      { both: [95, 103],  unit: 'mEq/L' },
  AST:     { both: [8, 33],    unit: 'U/L' },
  ALT:     { both: [4, 36],    unit: 'U/L' },
  ALP:     { both: [20, 130],  unit: 'U/L' },
  GGT:     { both: [5, 40],    unit: 'U/L' },
  CK:      { M: [55, 170], F: [30, 135], unit: 'U/L' },
  CK_MB:   { both: [0, 25],  unit: 'U/L' },  // فعالیت؛ روش‌ها متفاوت‌اند — مرجع برگه ارجح است
  AMYLASE: { both: [0, 130],   unit: 'U/L' },  // 0-4 U/dL × 1.85 → U/L
  LIPASE:  { both: [14, 280],  unit: 'U/L' },
  GLU_F:   { both: [70, 110],  unit: 'mg/dL' },
  GLU_2H:  { both: [70, 140],  unit: 'mg/dL' },  // قند دو ساعته (بعد غذا) — طبیعی < 140
  GLU_RANDOM: { both: [70, 140], unit: 'mg/dL' },  // قند تصادفی (غیرناشتا)
  URIC:    { M: [4, 8.5], F: [2.7, 7.3], unit: 'mg/dL' },
  ALB:     { both: [3.2, 4.5], unit: 'g/dL' },
  TP:      { both: [6, 7.8],   unit: 'g/dL' },
  BILI_T:  { both: [0.1, 1.2], unit: 'mg/dL' },
  BILI_D:  { both: [0, 0.3],   unit: 'mg/dL' },
  BILI_I:  { both: [0.1, 1],   unit: 'mg/dL' },
  FERRITIN:{ M: [15, 200], F: [12, 150], unit: 'ng/mL' },
  IRON:    { both: [60, 150],  unit: 'µg/dL' },
  TIBC:    { both: [250, 400], unit: 'µg/dL' },
  TSAT:    { both: [20, 55],   unit: '%' },
  B12:     { both: [160, 950], unit: 'pg/mL' },
  FOLATE:  { both: [3.5, 999], unit: 'ng/mL' },  // ≥3.5
  TSH:     { both: [0.5, 5],   unit: 'µU/mL' },
  FT4:     { both: [0.9, 2.3], unit: 'ng/dL' },
  FT3:     { both: [2.8, 4.4], unit: 'pg/mL' },
  T3:      { both: [80, 200],  unit: 'ng/dL' },
  T4:      { both: [5.5, 12.5],unit: 'µg/dL' },
  ANTI_TPO: { both: [0, 9],    unit: 'IU/mL' },  // بالای ۹ = تیروئیدیت خودایمنی
  CHOL:    { both: [150, 250], unit: 'mg/dL' },
  HDL:     { both: [40, 100],  unit: 'mg/dL' },  // پایین بودن نامطلوب است
  LDL:     { both: [0, 130],   unit: 'mg/dL' },  // بالا بودن نامطلوب است
  TG:      { both: [10, 190],  unit: 'mg/dL' },
  MG:      { both: [1.8, 3],   unit: 'mg/dL' },
  PHOS:    { both: [2.3, 4.7], unit: 'mg/dL' },
  CA:      { both: [9.2, 11],  unit: 'mg/dL' },
  HAPTO:   { both: [60, 270],  unit: 'mg/dL' },
  LDH:     { both: [235, 470], unit: 'U/L' },

  // ---- انعقاد ----
  PT:      { both: [10, 13],   unit: 'sec' },
  APTT:    { both: [25, 35],   unit: 'sec' },
  FIB:     { both: [200, 400], unit: 'mg/dL' },
  DDIMER:  { both: [0, 200],   unit: 'ng/mL' },
  INR:     { both: [0.8, 1.2], unit: '' },
  LACTATE: { both: [0.5, 2.2], unit: 'mmol/L' },
  PCT_SEPSIS: { both: [0, 0.5], unit: 'ng/mL' },
  CRP_Q:   { both: [0, 5],     unit: 'mg/L' },
  NH3:     { both: [15, 45],   unit: 'µmol/L' },
  HCO3:    { both: [22, 29],   unit: 'mEq/L' },
  PH:      { both: [7.35, 7.45], unit: '' },
  ATIII:   { both: [80, 120],  unit: 'U/dL' },

  // ---- کیفی ----
  TROPONIN_I: { both: [0, 0.6], unit: 'µg/L', qualitative_ok: true },
};

// ESR — سن و جنس محور
export function esrRef(sex, age) {
  if (sex === 'M') {
    if (age < 50) return [0, 15];
    if (age <= 85) return [0, 20];
    return [0, 30];
  }
  if (age < 50) return [0, 20];
  if (age <= 85) return [0, 30];
  return [0, 42];
}

// کراتینین سن‌محور (تنها مورد اطفال در جدول)
// سن نامعلوم (null) → محدودهٔ بالغ؛ در غیر این صورت `null < 2` به‌اشتباه محدودهٔ نوزادی می‌داد.
export function creatRef(age) {
  return (age != null && age < 2) ? [0.3, 0.6] : [0.6, 1.2];
}

import { getPedRef, isPediatricRCPCH } from './refs_ped.js';

// گرفتن محدوده برای یک تست
// اطفال (< 16 سال) → اول جدول RCPCH، اگر نبود → بالغ (طبق دستور خود RCPCH)
export function getRef(testKey, sex, age) {
  if (isPediatricRCPCH(age)) {
    const ped = getPedRef(testKey, age);
    if (ped) return ped;
    // RCPCH: "If there is no age-specific paediatric range, use the adult range."
  }
  if (testKey === 'ESR')   return esrRef(sex, age);
  if (testKey === 'CREAT') return creatRef(age);
  const r = ADULT_REFS[testKey];
  if (!r) return null;
  if (r.both) return r.both;
  return sex === 'M' ? r.M : r.F;
}

// منبع محدوده — برای شفافیت
export function getRefSource(testKey, age) {
  if (isPediatricRCPCH(age) && getPedRef(testKey, age)) return 'RCPCH 2016';
  return 'Henry A5';
}

export function getUnit(testKey) {
  return ADULT_REFS[testKey]?.unit ?? '';
}

// ---- گیت سنی: زیر ۱۸ سال هیچ مرجعی نداریم ----
export const PEDIATRIC_CUTOFF = 18;
export function isPediatric(age) { return age < PEDIATRIC_CUTOFF; }

// ---- تبدیل واحد ----
// برگه‌های ایرانی "urea" می‌دهند، جدول "urea nitrogen" (BUN)
export const ureaToBUN = urea => urea / 2.14;
export const bunToUrea = bun  => bun * 2.14;
