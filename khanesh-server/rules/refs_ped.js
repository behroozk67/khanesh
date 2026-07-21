// ============================================================
// LabMate — محدوده‌های مرجع اطفال
// منبع: NEW RCPCH REFERENCE RANGES - 2016
//        (Based largely on MSCAA ranges + Sheffield Children's Hospital
//         NHSFT Laboratory Handbook 2015)
//
// ⚠️ منبع اصلی SI است. اینجا به Conventional تبدیل شده تا با
//    برگه‌های آزمایشگاه ایران (g/dL, mg/dL) بخواند.
//    ضرایب تبدیل در پایین فایل مستند شده‌اند.
//
// ⚠️ RCPCH: "بالغ" را > 12 سال یا شروع بلوغ تعریف می‌کند — نه 18.
// ⚠️ RCPCH: اگر محدوده سنی اطفال وجود نداشت، از محدوده بالغ استفاده کن.
// ============================================================

// ---------- ضرایب تبدیل SI → Conventional ----------
const CONV = {
  HGB:   0.1,      // g/L    → g/dL
  CREAT: 1/88.4,   // µmol/L → mg/dL
  UREA_N:(1/0.357)/2.14, // mmol/L urea → mg/dL urea → BUN. (mmol/L ÷ 0.357 = mg/dL urea)
  GLU:   1/0.0555, // mmol/L → mg/dL
  CA:    1/0.25,   // mmol/L → mg/dL
  MG:    1/0.4114, // mmol/L → mg/dL
  PHOS:  1/0.3229, // mmol/L → mg/dL
  BILI:  1/17.1,   // µmol/L → mg/dL
  ALB:   0.1,      // g/L    → g/dL
  TP:    0.1,      // g/L    → g/dL
  FT4:   1/12.87,  // pmol/L → ng/dL
  B12:   1,        // ng/L   = pg/mL
  IRON:  1/0.1791, // µmol/L → µg/dL
  TIBC:  1/0.1791, // µmol/L → µg/dL
  CHOL:  1/0.02586,// mmol/L → mg/dL
  TG:    1/0.01129,// mmol/L → mg/dL
};

const r = (lo, hi, f = 1) => [ +(lo * f).toFixed(2), +(hi * f).toFixed(2) ];

// ---------- سن بر حسب سال (کسری برای ماه/روز) ----------
const D = d => d / 365;
const M = m => m / 12;

// ============================================================
// جدول اطفال — هر تست: آرایه‌ای از {maxAge, range}
// اولین ردیفی که سن ≤ maxAge باشد انتخاب می‌شود.
// ============================================================
export const PED_REFS = {

  // ---- خون‌شناسی (صفحه ۱) ----
  HGB: [                                    // g/L → g/dL
    { maxAge: D(6),   range: r(145, 220, CONV.HGB) },  // 0–6 روز
    { maxAge: D(7),   range: r(140, 186, CONV.HGB) },  // 7 روز
    { maxAge: M(3),   range: r(95,  125, CONV.HGB) },  // 8 روز – 3 ماه
    { maxAge: 4,      range: r(110, 140, CONV.HGB) },  // 3 ماه – 4 سال
    { maxAge: 12,     range: r(115, 140, CONV.HGB) },  // 5 – 12 سال
  ],
  WBC: [                                    // ×10⁹/L = K/µL (بدون تبدیل)
    { maxAge: D(6),   range: [10.0, 26.0] },
    { maxAge: D(7),   range: [5.0,  21.0] },
    { maxAge: M(6),   range: [6.0,  15.0] },
    { maxAge: 12,     range: [5.0,  12.0] },
  ],
  PLT: [
    { maxAge: 16,     range: [150, 450] },
  ],
  MCH: [                                    // pg
    { maxAge: M(3),   range: [31, 37] },
    { maxAge: M(4),   range: [27, 33] },
    { maxAge: 12,     range: [23, 31] },
  ],
  MCHC: [                                   // g/dL
    { maxAge: 16,     range: [32, 35] },
  ],
  MCV: [                                    // fL
    { maxAge: M(3),   range: [100, 130] },
    { maxAge: M(4),   range: [85,  100] },
    { maxAge: 4,      range: [70,   86] },
    { maxAge: 12,     range: [77,   91] },
  ],
  NEUT_ABS: [                               // ×10⁹/L → /µL (×1000)
    { maxAge: D(3),   range: [5000, 13000] },
    { maxAge: D(4),   range: [1500, 10000] },
    { maxAge: 6,      range: [1500,  8000] },
    { maxAge: 11,     range: [2000,  6000] },
  ],
  LYMPH_ABS: [
    { maxAge: D(2),   range: [2000, 4500] },
    { maxAge: D(3),   range: [3000, 9000] },
    { maxAge: 1,      range: [4000, 10000] },
    { maxAge: 6,      range: [1500, 9500] },
    { maxAge: 10,     range: [1500, 7000] },
  ],
  MONO_ABS: [
    { maxAge: D(3),   range: [500, 1500] },
    { maxAge: 6,      range: [300, 1100] },
    { maxAge: 10,     range: [200, 1200] },
  ],
  EOS_ABS: [
    { maxAge: D(3),   range: [100, 2000] },
    { maxAge: 6,      range: [100, 1000] },
    { maxAge: 10,     range: [100,  800] },
  ],
  BASO_ABS: [
    { maxAge: 16,     range: [0, 100] },
  ],
  RETIC_ABS: [                              // ×10⁹/L → /µL
    { maxAge: D(1),   range: [1800, 4600] },
  ],
  HCT: [                                    // PCV، fraction → %
    { maxAge: M(2),   range: [44, 64] },
    { maxAge: M(3),   range: [32, 44] },
    { maxAge: 3,      range: [36, 44] },
  ],
  ESR: [                                    // mm/hr
    { maxAge: 16,     range: [0, 20] },
  ],
  DDIMER: [                                 // mg/L → ng/mL (×1000)
    { maxAge: 16,     range: [0, 500] },
  ],

  // ---- انعقاد (صفحه ۱ و ۲) ----
  APTT: [                                   // ثانیه — ترم
    { maxAge: M(3),   range: [28.0, 55.0] },
    { maxAge: 12,     range: [28.0, 45.0] },
  ],
  PT: [                                     // ثانیه — ترم
    { maxAge: M(3),   range: [8.5, 14.1] },
  ],
  TT:  [ { maxAge: 16, range: [9, 15] } ],
  FIB: [ { maxAge: 16, range: [150, 400] } ],  // g/L → mg/dL (×100)

  // ---- الکترولیت‌ها (صفحه ۲) ----
  NA:  [ { maxAge: 16, range: [133, 146] } ],
  K:   [ { maxAge: 16, range: [3.5, 5.5] } ],
  CL:  [ { maxAge: 16, range: [95, 106] } ],
  HCO3:[ { maxAge: M(1),  range: [14, 28] },
         { maxAge: 16,    range: [19, 28] } ],
  UREA_N: [                                 // mmol/L urea → BUN mg/dL
    { maxAge: 1,      range: r(0.8, 5.5, CONV.UREA_N) },   // 0–12 ماه
    { maxAge: 16,     range: r(2.5, 6.5, CONV.UREA_N) },   // 1–16 سال
  ],
  CREAT: [                                  // µmol/L → mg/dL
    { maxAge: M(1),   range: r(21, 75, CONV.CREAT) },   // نوزاد
    { maxAge: 4,      range: r(13, 39, CONV.CREAT) },   // 1 ماه – 4 سال
    { maxAge: 11,     range: r(29, 53, CONV.CREAT) },   // 5–11 سال
    { maxAge: 16,     range: r(40, 90, CONV.CREAT) },   // 12+
  ],
  CA: [                                     // mmol/L → mg/dL
    { maxAge: M(1),   range: r(2.0, 2.7, CONV.CA) },    // <4 هفته
    { maxAge: 16,     range: r(2.2, 2.7, CONV.CA) },
  ],
  MG:   [ { maxAge: 16, range: r(0.6, 1.0, CONV.MG) } ],
  PHOS: [ { maxAge: 1,  range: r(1.3, 2.6, CONV.PHOS) },
          { maxAge: 16, range: r(0.9, 1.8, CONV.PHOS) } ],

  // ---- متابولیک (صفحه ۲) ----
  GLU_F: [                                  // mmol/L → mg/dL
    { maxAge: M(1),   range: r(2.5, 5.5, CONV.GLU) },   // نوزاد
    { maxAge: 16,     range: r(3.0, 6.0, CONV.GLU) },
  ],
  HBA1C: [ { maxAge: 16, range: [4, 6] } ],  // %
  CHOL: [
    { maxAge: 1,      range: r(1.2, 4.7, CONV.CHOL) },  // شیرخوار
    { maxAge: 16,     range: r(2.8, 6.0, CONV.CHOL) },
  ],
  TG: [
    { maxAge: M(1),   range: r(0,   1.8, CONV.TG) },
    { maxAge: 1,      range: r(0.3, 1.7, CONV.TG) },
    { maxAge: 16,     range: r(0.4, 2.1, CONV.TG) },
  ],

  // ---- کبد (صفحه ۳) ----
  ALB: [                                    // g/L → g/dL
    { maxAge: M(1),   range: r(25, 45, CONV.ALB) },
    { maxAge: 1,      range: r(30, 45, CONV.ALB) },
    { maxAge: 16,     range: r(35, 50, CONV.ALB) },
  ],
  ALT: [                                    // IU/L
    { maxAge: 1,      range: [0, 41] },
    { maxAge: 2,      range: [0, 28] },
    { maxAge: 6,      range: [0, 29] },
    { maxAge: 12,     range: [0, 36] },
    { maxAge: 17,     range: [0, 37] },
  ],
  AST: [
    { maxAge: M(1),   range: [18, 92] },    // نوزاد
    { maxAge: 16,     range: [8,  60] },    // کودک
  ],
  ALP: [
    { maxAge: M(1),   range: [73, 391] },   // نوزاد
    { maxAge: 1,      range: [59, 425] },   // شیرخوار
    { maxAge: 14,     range: [76, 308] },
    { maxAge: 16,     range: [49, 242] },
  ],
  BILI_T: [                                 // µmol/L → mg/dL
    { maxAge: 16,     range: r(0, 21, CONV.BILI) },   // 14 روز – 16 سال
  ],
  GGT: [ { maxAge: 16, range: [9, 40] } ],

  // ---- قلبی (صفحه ۳) ----
  CK: [ { maxAge: 16, range: [25, 300] } ],
  TROPONIN_T: [ { maxAge: 16, range: [0, 0.01] } ],  // µg/L

  // ---- هماتینیک (صفحه ۳) ----
  B12:      [ { maxAge: 16, range: [160, 925] } ],   // ng/L = pg/mL
  FOLATE:   [ { maxAge: 16, range: [3, 15] } ],      // µg/L = ng/mL
  FERRITIN: [ { maxAge: 16, range: [12, 200] } ],    // µg/L = ng/mL
  IRON:     [ { maxAge: 16, range: r(14, 31, CONV.IRON) } ],
  TIBC:     [ { maxAge: 16, range: r(54, 75, CONV.TIBC) } ],

  TSH: [                                    // mU/L = µU/mL
    { maxAge: D(3),   range: [5.2, 14.6] },
    { maxAge: 1,      range: [0.6,  8.1] },
    { maxAge: 16,     range: [0.5,  4.5] },
  ],
  FT4: [                                    // pmol/L → ng/dL
    { maxAge: D(6),   range: r(11, 32, CONV.FT4) },
    { maxAge: M(3),   range: r(12, 18, CONV.FT4) },
    { maxAge: 16,     range: r(12, 24, CONV.FT4) },
  ],

  // ---- سایر (صفحه ۴ و ۵) ----
  CRP:     [ { maxAge: 16, range: [0, 5] } ],        // mg/L
  AMYLASE: [ { maxAge: 16, range: [0, 220] } ],      // U/L
  LDH:     [ { maxAge: M(1), range: [0, 1300] },     // نوزاد
             { maxAge: 16,   range: [400, 900] } ],
  TP: [                                     // g/L → g/dL
    { maxAge: D(1),   range: r(34, 50, CONV.TP) },
    { maxAge: 1,      range: r(46, 76, CONV.TP) },
    { maxAge: 18,     range: r(60, 80, CONV.TP) },
  ],
};

// ============================================================
// RCPCH: بالغ = > 12 سال یا شروع بلوغ
// ولی خیلی از ردیف‌های جدول تا 16 سال ادامه دارند.
// اینجا: اگر سن < 16 و ردیف اطفال داریم، از آن استفاده کن.
// ============================================================
export const PED_MAX_AGE = 16;

export function isPediatricRCPCH(age) {
  return age != null && age < PED_MAX_AGE;
}

/**
 * محدوده اطفال را برای یک تست و سن برگردان.
 * اگر ردیف اطفال نبود، null → کدِ فراخوان باید به محدوده بالغ برگردد.
 */
export function getPedRef(testKey, ageYears) {
  const rows = PED_REFS[testKey];
  if (!rows || ageYears == null) return null;
  for (const row of rows) {
    if (ageYears <= row.maxAge) return row.range;
  }
  return null;   // سن از آخرین ردیف بیشتر است → بالغ
}

/**
 * توضیح گروه سنی — برای نمایش به کاربر/دیباگ
 */
export function pedAgeBand(testKey, ageYears) {
  const rows = PED_REFS[testKey];
  if (!rows) return null;
  for (let i = 0; i < rows.length; i++) {
    if (ageYears <= rows[i].maxAge) {
      const lo = i === 0 ? 0 : rows[i-1].maxAge;
      return { from: lo, to: rows[i].maxAge };
    }
  }
  return null;
}
