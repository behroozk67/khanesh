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
  // ⚠️ محدوده‌های الکترولیت/کبد در ۲۰۲۶-۰۷ با فرانت‌اند آشتی داده شدند (ریسرچ منبع‌محور،
  //    جزئیات و منابع در REF_DIFF.md). چند مقدارِ قبلی «هنری» با متن منتشرشده نمی‌خواند
  //    و مقادیر طبیعی را غیرطبیعی می‌زد (مثلاً Ca 8.5–9.1 → «پایین»).
  UREA_N:  { both: [7, 20],    unit: 'mg/dL' },  // BUN — MedlinePlus 6–20 (بود 8–23، ازوتمی خفیف را نرمال می‌گرفت)
  UREA:    { both: [15, 45],   unit: 'mg/dL' },  // اورهٔ کامل (≈BUN×۲.۱۴). هم‌تراز با REFِ فرانت‌اند (Tafsir.jsx). جداگانه تفسیر می‌شود، نه تبدیل به BUN
  CREAT:   { both: [0.6, 1.2], unit: 'mg/dL' },  // بزرگسال؛ جنس‌محور در creatRef() اعمال می‌شود
  // ACR — نسبت آلبومین به کراتینین ادرار. مرجع سلامت < 30 mg/g.
  // طبقه‌بندی A1/A2/A3 در interpret.js انجام می‌شود (KDIGO 2024).
  ACR:     { both: [0, 30], unit: 'mg/g' },
  NA:      { both: [135, 145], unit: 'mEq/L' },  // MedlinePlus 135–145 (بود 136–142، سقف را کوتاه می‌کرد)
  K:       { both: [3.5, 5],   unit: 'mEq/L' },  // 3.5–5.0 استاندارد (بود 3.8–5.0)
  CL:      { both: [95, 103],  unit: 'mEq/L' },
  AST:     { both: [0, 40],    unit: 'U/L' },    // ULN ~۴۰، عملاً بدون تفاوت جنسی (بود 8–33)
  ALT:     { M: [0, 41], F: [0, 33], unit: 'U/L' },  // ALT خفیف جنس‌محور؛ ULN امروزی (بود 4–36 یکسان)
  ALP:     { both: [20, 130],  unit: 'U/L' },
  GGT:     { both: [5, 40],    unit: 'U/L' },
  CK:      { M: [55, 170], F: [30, 135], unit: 'U/L' },
  CK_MB:   { both: [0, 25],  unit: 'U/L' },  // فعالیت؛ روش‌ها متفاوت‌اند — مرجع برگه ارجح است
  AMYLASE: { both: [0, 130],   unit: 'U/L' },  // 0-4 U/dL × 1.85 → U/L
  LIPASE:  { both: [14, 280],  unit: 'U/L' },
  GLU_F:   { both: [70, 110],  unit: 'mg/dL' },
  GLU_2H:  { both: [70, 140],  unit: 'mg/dL' },  // قند دو ساعته (بعد غذا) — طبیعی < 140
  GLU_RANDOM: { both: [70, 140], unit: 'mg/dL' },  // قند تصادفی (غیرناشتا)
  // HbA1c بزرگسال — ADA: طبیعی < 5.7٪، پیش‌دیابت 5.7–6.4، دیابت ≥ 6.5.
  // ⚠️ بدون این ردیف، getRef برای بزرگسال null می‌داد و HbA1c هرگز
  //    درجه‌بندی نمی‌شد؛ در نتیجه الگوی قند برای بزرگسالان آن را نادیده می‌گرفت.
  HBA1C:   { both: [4, 5.6],    unit: '%' },
  URIC:    { M: [4, 8.5], F: [2.7, 7.3], unit: 'mg/dL' },
  ALB:     { both: [3.5, 5.0], unit: 'g/dL' },  // 3.5–5.0 (بود 3.2–4.5، نرمالِ 4.6–5.0 را «بالا» می‌زد)
  TP:      { both: [6, 7.8],   unit: 'g/dL' },
  BILI_T:  { both: [0.1, 1.2], unit: 'mg/dL' },
  BILI_D:  { both: [0, 0.3],   unit: 'mg/dL' },
  BILI_I:  { both: [0.1, 1],   unit: 'mg/dL' },
  FERRITIN:{ M: [30, 300], F: [15, 150], unit: 'ng/mL' },  // متن کلاسیک/LabCorp (بود M15–200/F12–150). کفِ کمبود مهم‌تر از سقف است
  IRON:    { both: [60, 150],  unit: 'µg/dL' },
  TIBC:    { both: [250, 400], unit: 'µg/dL' },
  TSAT:    { both: [20, 55],   unit: '%' },
  B12:     { both: [200, 900], unit: 'pg/mL' },  // کفِ کمبود ۲۰۰ (بود 160، مرزیِ کمبود را نرمال می‌گرفت)
  FOLATE:  { both: [3.5, 999], unit: 'ng/mL' },  // ≥3.5
  // ویتامین D (25-OH): آستانه‌ها محل اختلاف واقعی است.
  //   Endocrine Society 2011 → کمبود <20، ناکافی 21–29، کافی ≥30  ← انتخاب‌شده (رایج در ایران)
  //   IOM/NAM 2011          → کمبود <12، کافی ≥20
  //   ⚠️ خود Endocrine Society در بازنگری ۲۰۲۴ از هدف ۳۰ عقب نشست و آستانه عددی مشخصی تایید نمی‌کند.
  //   حد بالا ۱۰۰: بالای آن احتمال مسمومیت مطرح است.
  VIT_D:   { both: [30, 100],  unit: 'ng/mL' },
  TSH:     { both: [0.5, 4.5], unit: 'µU/mL' },  // حد بالا از ۵ به ۴.۵ (استاندارد امروزی آزمایشگاه‌ها)
  FT4:     { both: [0.9, 2.3], unit: 'ng/dL' },
  FT3:     { both: [2.8, 4.4], unit: 'pg/mL' },
  T3:      { both: [80, 200],  unit: 'ng/dL' },
  T4:      { both: [5, 12],    unit: 'µg/dL' },  // بزرگسال، بدون تفاوت جنسی (بود 5.5–12.5)
  ANTI_TPO: { both: [0, 9],    unit: 'IU/mL' },  // بالای ۹ = تیروئیدیت خودایمنی
  // کلسترول و TG «بازهٔ مرجع» نیستند، بلکه آستانهٔ ریسک‌اند (NCEP ATP III).
  //   حد پایین ۰ می‌گذاریم تا فقط سمت «بالا» علامت بخورد (کلسترول/TGِ پایین بیمار را نمی‌ترساند).
  //   CTCAE هم برای این دو فقط قاعدهٔ _HIGH دارد، پس رفتار آستانه‌ای سازگار است.
  CHOL:    { both: [0, 200],   unit: 'mg/dL' },  // «مطلوب» <۲۰۰ (بود 150–250، ۲۴۰ را نرمال می‌گرفت)
  HDL:     { both: [40, 100],  unit: 'mg/dL' },  // پایین بودن نامطلوب است
  LDL:     { both: [0, 130],   unit: 'mg/dL' },  // بالا بودن نامطلوب است
  TG:      { both: [0, 150],   unit: 'mg/dL' },  // «طبیعی» <۱۵۰ (بود 10–190، مرزیِ 150–199 را جا می‌انداخت)
  MG:      { both: [1.7, 2.2], unit: 'mg/dL' },  // 🔴 بیشترین اصلاح: 1.5 حالا درست «پایین» است (بود 1.8–3.0؛ فرانت 1.3–2.5 آن را نرمال می‌زد)
  PHOS:    { both: [2.5, 4.5], unit: 'mg/dL' },  // (بود 2.3–4.7)
  CA:      { both: [8.5, 10.2],unit: 'mg/dL' },  // MedlinePlus/Henry (بود 9.2–11، نرمالِ 8.5–9.1 را «پایین» می‌زد)
  HAPTO:   { both: [60, 270],  unit: 'mg/dL' },
  LDH:     { both: [235, 470], unit: 'U/L' },

  // ---- انعقاد ----
  PT:      { both: [10, 13],   unit: 'sec' },
  APTT:    { both: [25, 35],   unit: 'sec' },
  FIB:     { both: [200, 400], unit: 'mg/dL' },
  DDIMER:  { both: [0, 500],   unit: 'ng/mL' },   // ۵۰۰ ng/mL = ۰.۵ mg/L FEU؛ حد ردِ VTE (سازگار با refs_ped)
  INR:     { both: [0.8, 1.2], unit: '' },
  LACTATE: { both: [0.5, 2.2], unit: 'mmol/L' },
  PCT_SEPSIS: { both: [0, 0.5], unit: 'ng/mL' },
  CRP_Q:   { both: [0, 5],     unit: 'mg/L' },
  NH3:     { both: [15, 45],   unit: 'µmol/L' },
  HCO3:    { both: [22, 29],   unit: 'mEq/L' },
  PH:      { both: [7.35, 7.45], unit: '' },
  ATIII:   { both: [80, 120],  unit: 'U/dL' },

  // ---- روماتولوژی ----
  // فاکتور روماتوئید. ⚠️ هیچ نقطهٔ برشِ جهانیِ واحدی ندارد (۱۴ / ۲۰ / ۳۰ / ۶۰ IU/mL
  //   بسته به منبع و روش). ۲۰ به‌عنوان پیش‌فرضِ رایج گرفته شده، ولی آنچه بالینی است
  //   نسبت به ULNِ خودِ آزمایشگاه است: ACR/EULAR 2010 «مثبتِ کم» را ≤۳×ULN و
  //   «مثبتِ زیاد» را >۳×ULN تعریف می‌کند. الگو از همین نسبت استفاده می‌کند.
  RF:      { both: [0, 20],    unit: 'IU/mL' },

  // ---- سرولوژی بروسلوز (تب مالت) — بر حسب مخرجِ تیتر، نه غلظت ----
  // مقدارِ ذخیره‌شده مخرجِ تیتر است: «۱/۱۶۰» → ۱۶۰، و منفی → ۰.
  //
  // آستانه‌ها از «راهنمای کشوری تشخیص و درمان بروسلوز» وزارت بهداشت (ص ۴۰):
  //   رایت ≥۱/۸۰ ، 2ME ≥۱/۴۰ ، کومبس رایت ≥۱/۴۰.
  // ⚠️ این‌ها عمداً از عددِ بین‌المللی (CDC: SAT ≥۱:۱۶۰) پایین‌ترند: گونهٔ غالبِ
  //   انسانی در ایران B. melitensis است ولی آنتی‌ژنِ تست B. abortus، و عیارِ
  //   به‌دست‌آمده تقریباً نصفِ رقمِ حقیقی است (همان راهنما، ص ۳۴).
  //   منبع را عوض نکن مگر با تصمیمِ آگاهانه — این یک انتخابِ کشوری است نه خطا.
  WRIGHT:         { both: [0, 40], unit: 'تیتر' },   // ≥۸۰ باارزش
  ME2:            { both: [0, 20], unit: 'تیتر' },   // ≥۴۰ باارزش
  COOMBS_WRIGHT:  { both: [0, 20], unit: 'تیتر' },   // ≥۴۰ باارزش

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
export function creatRef(age, sex) {
  if (age != null && age < 2) return [0.3, 0.6];   // نوزاد — جنس هنوز مهم نیست
  // بزرگسال جنس‌محور: زنان تودهٔ عضلانی کمتر → کفِ طبیعی پایین‌تر.
  // بدون این، کراتینین طبیعیِ یک زن (۰.۵) با کف یکسانِ ۰.۶ «پایین» علامت می‌خورد.
  // sex نامعلوم → پیش‌فرض بازهٔ بازتر [0.6,1.2] تا هشدار کاذب ندهد.
  return sex === 'F' ? [0.5, 1.1] : [0.6, 1.2];
}

// eGFR — CKD-EPI 2021 (بدون ضریب نژاد). فقط بزرگسال (≥ ۱۸).
// کراتینین تنها سن/جنس/تودهٔ عضلانی را نادیده می‌گیرد؛ eGFR این‌ها را لحاظ می‌کند.
// scr بر حسب mg/dL. خروجی: mL/min/1.73m² (گرد شده).
export function ckdEpiEgfr(scr, age, sex) {
  if (scr == null || age == null || !sex) return null;
  const female = sex === 'F';
  const k = female ? 0.7 : 0.9;
  const a = female ? -0.241 : -0.302;
  const ratio = scr / k;
  const egfr =
    142 *
    Math.pow(Math.min(ratio, 1), a) *
    Math.pow(Math.max(ratio, 1), -1.200) *
    Math.pow(0.9938, age) *
    (female ? 1.012 : 1);
  return Math.round(egfr);
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
  if (testKey === 'CREAT') return creatRef(age, sex);
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
