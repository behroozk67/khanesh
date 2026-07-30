// ============================================================
// LabMate — تبدیل واحدِ SI به واحدِ متعارف (IFCC)
//
// چرا این فایل لازم شد (کلاسِ N3 در Lab Notebook):
//   `refs.js` همه‌جا واحدِ متعارفِ آمریکایی می‌خواهد (mg/dL، %، ng/mL).
//   ولی برگه‌های آزمایشگاهی — به‌ویژه دستگاه‌های اروپایی و نرم‌افزارهایی که
//   خروجیِ IFCC می‌دهند — واحدِ SI چاپ می‌کنند. تا امروز فقط پنج تست
//   محافظ داشتند (WBC/PLT/RBC، D-dimer، ACR، T3، CRP) و هر کدام بعد از یک
//   باگِ واقعی اضافه شده بود. بقیه بی‌محافظ بودند.
//
//   بدترینِ آن‌ها HbA1c است: واحدِ IFCC ‏mmol/mol است و «۴۸ mmol/mol»
//   دقیقاً همان «۶.۵٪» است — یعنی مرزِ تشخیصِ دیابت. بدون تبدیل، عددِ ۴۸ با
//   محدودهٔ [۴، ۵.۶] سنجیده می‌شد و به بیمارِ تازه‌تشخیصِ دیابت، عددی در حدِ
//   «قندِ کنترل‌نشدهٔ فاجعه‌بار» نشان داده می‌شد. برعکسش هم ممکن است:
//   ۳۹ mmol/mol (= ۵.۷٪، پیش‌دیابت) به‌شکلِ «۳۹٪» یعنی عددی بی‌معنا.
//
// اصلِ ایمنی (همان اصلِ adapter):
//   ⚠️ فقط وقتی تبدیل کن که واحدِ روی برگه *صریحاً* SI باشد.
//   حدس زدن از روی بزرگیِ عدد، یک تبدیلِ غلط می‌سازد و «تبدیلِ غلط بدتر از
//   نبودِ تبدیل است» (همان قاعدهٔ N2 دربارهٔ نگاشتِ فازی).
//   تنها استثنا HbA1c است که در `HBA1C_SANITY` توضیح داده شده — چون آنجا
//   دو واحد بازهٔ عددیِ کاملاً جدا دارند و هیچ همپوشانی‌ای ممکن نیست.
//
// منبع: IFCC/NGSP master equation و جدولِ ضرایبِ SI (guidelines.js → IFCC).
// ============================================================

/**
 * ضریبِ تبدیل: مقدارِ متعارف = مقدارِ SI × factor
 *
 * `si` الگویی است که باید در واحدِ *نرمال‌شدهٔ* برگه دیده شود.
 * `conv` صرفاً مستندسازیِ واحدِ مقصد است (همان چیزی که در refs.js نشسته).
 */
export const SI_CONVERSIONS = {
  // ---- قند و دیابت ----
  GLU_F:      { si: /^mmol\/l$/, factor: 18.0182, conv: 'mg/dL' },
  GLU_2H:     { si: /^mmol\/l$/, factor: 18.0182, conv: 'mg/dL' },
  GLU_RANDOM: { si: /^mmol\/l$/, factor: 18.0182, conv: 'mg/dL' },

  // ---- لیپید ----
  CHOL: { si: /^mmol\/l$/, factor: 38.67, conv: 'mg/dL' },
  HDL:  { si: /^mmol\/l$/, factor: 38.67, conv: 'mg/dL' },
  LDL:  { si: /^mmol\/l$/, factor: 38.67, conv: 'mg/dL' },
  // تری‌گلیسرید وزنِ مولکولیِ متفاوتی دارد — ضریبش با کلسترول یکی نیست.
  TG:   { si: /^mmol\/l$/, factor: 88.57, conv: 'mg/dL' },

  // ---- کلیه ----
  CREAT:  { si: /^(µmol\/l|umol\/l|μmol\/l)$/, factor: 1 / 88.4,  conv: 'mg/dL' },
  UREA:   { si: /^mmol\/l$/, factor: 6.006, conv: 'mg/dL' },
  UREA_N: { si: /^mmol\/l$/, factor: 2.801, conv: 'mg/dL' },
  URIC:   { si: /^(µmol\/l|umol\/l|μmol\/l)$/, factor: 1 / 59.48, conv: 'mg/dL' },

  // ---- الکترولیت و مواد معدنی ----
  // ⚠️ Na/K/Cl عمداً اینجا نیستند: mmol/L و mEq/L برای یونِ یک‌ظرفیتی
  //    عددشان یکی است. «تبدیل» کردنشان یعنی خرابکاری.
  CA:   { si: /^mmol\/l$/, factor: 4.008, conv: 'mg/dL' },
  MG:   { si: /^mmol\/l$/, factor: 2.431, conv: 'mg/dL' },
  PHOS: { si: /^mmol\/l$/, factor: 3.097, conv: 'mg/dL' },

  // ---- کبد ----
  BILI_T: { si: /^(µmol\/l|umol\/l|μmol\/l)$/, factor: 1 / 17.104, conv: 'mg/dL' },
  BILI_D: { si: /^(µmol\/l|umol\/l|μmol\/l)$/, factor: 1 / 17.104, conv: 'mg/dL' },
  BILI_I: { si: /^(µmol\/l|umol\/l|μmol\/l)$/, factor: 1 / 17.104, conv: 'mg/dL' },
  // آلبومین و پروتئینِ توتال: SI بر حسب g/L، متعارف g/dL.
  ALB: { si: /^g\/l$/, factor: 0.1, conv: 'g/dL' },
  TP:  { si: /^g\/l$/, factor: 0.1, conv: 'g/dL' },

  // ---- هماتولوژی ----
  // هموگلوبینِ SI بر حسب g/L (مثل «۱۳۵») در برابر g/dL («۱۳.۵»).
  HGB: { si: /^g\/l$/, factor: 0.1, conv: 'g/dL' },

  // ---- آهن ----
  IRON: { si: /^(µmol\/l|umol\/l|μmol\/l)$/, factor: 5.587, conv: 'µg/dL' },
  TIBC: { si: /^(µmol\/l|umol\/l|μmol\/l)$/, factor: 5.587, conv: 'µg/dL' },
  // فریتین: ng/mL و µg/L عددشان یکی است — تبدیل لازم ندارد و عمداً اینجا نیست.

  // ---- ویتامین‌ها ----
  B12:    { si: /^pmol\/l$/, factor: 1 / 0.7378, conv: 'pg/mL' },
  FOLATE: { si: /^nmol\/l$/, factor: 1 / 2.266,  conv: 'ng/mL' },
  VIT_D:  { si: /^nmol\/l$/, factor: 1 / 2.496,  conv: 'ng/mL' },

  // ---- تیروئید ----
  // TSH در همهٔ برگه‌ها µIU/mL = mIU/L است — عدد یکی است، تبدیل ندارد.
  T4:  { si: /^nmol\/l$/, factor: 1 / 12.87, conv: 'µg/dL' },
  FT4: { si: /^pmol\/l$/, factor: 1 / 12.87, conv: 'ng/dL' },
  FT3: { si: /^pmol\/l$/, factor: 1 / 1.536, conv: 'pg/mL' },
  // T3 در adapter.js دستِ خودش تبدیل می‌شود (nmol/L → ng/dL) — اینجا تکرار نشود.
};

/** واحد را مثل adapter نرمال کن: حروف کوچک، بی‌فاصله. */
function normUnit(u) {
  return String(u ?? '').toLowerCase().replace(/\s+/g, '').trim();
}

/**
 * HbA1c — تنها موردی که اجازهٔ تشخیصِ واحد از روی خودِ عدد را دارد.
 *
 * چرا امن است: دو مقیاس هیچ همپوشانیِ بالینی ندارند.
 *   ٪NGSP در انسانِ زنده عملاً ۳ تا ۲۰ است (بالای ۲۰ هم گزارش نمی‌شود).
 *   mmol/mol معادلِ همان بازه، ۹ تا ۱۹۵ است — ولی مقدارِ طبیعی‌اش ≈ ۲۰–۴۲.
 * پس عددِ > ۲۰ بدونِ واحد، قطعاً mmol/mol است و نمی‌تواند درصد باشد.
 * زیر ۲۰ را دست نمی‌زنیم (۱۸ mmol/mol غیرممکن است، ولی احتیاط ارزان‌تر است).
 */
const HBA1C_IMPLAUSIBLE_AS_PERCENT = 20;

/** IFCC (mmol/mol) → NGSP (%) — معادلهٔ master رسمیِ IFCC/NGSP. */
export function ifccToNgsp(mmolPerMol) {
  return +(0.09148 * mmolPerMol + 2.152).toFixed(2);
}

/** NGSP (%) → IFCC (mmol/mol) — جهتِ عکس، برای نمایشِ دوواحدی. */
export function ngspToIfcc(percent) {
  return Math.round(10.929 * percent - 23.5);
}

/**
 * مقدارِ HbA1c را به ٪NGSP برگردان.
 * @returns {{value:number, converted:boolean, from:string|null}}
 */
export function normalizeHba1c(value, unit) {
  const u = normUnit(unit);
  if (/mmol\/mol/.test(u)) {
    return { value: ifccToNgsp(value), converted: true, from: 'mmol/mol' };
  }
  // بدونِ واحدِ صریح، فقط وقتی که عدد به‌عنوانِ درصد ناممکن است.
  if (!/%|percent|ngsp/.test(u) && value > HBA1C_IMPLAUSIBLE_AS_PERCENT) {
    return { value: ifccToNgsp(value), converted: true, from: 'mmol/mol (استنتاجی)' };
  }
  return { value, converted: false, from: null };
}

/**
 * تبدیلِ عمومیِ SI → متعارف برای یک کلیدِ موتور.
 *
 * ⚠️ کلیدهایی که در adapter.js تبدیلِ اختصاصیِ خودشان را دارند
 *    (WBC/PLT/RBC، DDIMER، ACR، T3، CRP_Q، *_ABS) عمداً در جدول نیستند؛
 *    اگر روزی اضافه‌شان کردی، تبدیل دوبار اعمال می‌شود.
 *
 * @returns {{value:number, converted:boolean, from:string|null, to:string|null}}
 */
export function toConventional(engineKey, value, unit) {
  if (value == null || !Number.isFinite(value)) {
    return { value, converted: false, from: null, to: null };
  }

  if (engineKey === 'HBA1C') {
    const r = normalizeHba1c(value, unit);
    return { value: r.value, converted: r.converted, from: r.from, to: '%' };
  }

  const rule = SI_CONVERSIONS[engineKey];
  if (!rule) return { value, converted: false, from: null, to: null };

  const u = normUnit(unit);
  if (!u || !rule.si.test(u)) {
    return { value, converted: false, from: null, to: null };
  }

  const out = value * rule.factor;
  // گردکردن متناسب با بزرگیِ عدد؛ کراتینینِ ۰.۹۵ نباید ۱ شود.
  const rounded = Math.abs(out) >= 100 ? Math.round(out)
                : Math.abs(out) >= 10  ? +out.toFixed(1)
                : +out.toFixed(2);
  return { value: rounded, converted: true, from: u, to: rule.conv };
}
