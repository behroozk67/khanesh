// ============================================================
// LabMate — تفسیر تست‌های بدون مقیاس شدت
//
// اصل معماری (تصمیم کارشناس آزمایشگاه):
//   بعضی تست‌ها شدت ندارند — دسته دارند.
//   MCV=69 و MCV=65 هر دو "میکروسیتوز" هستند. تفاوتشان بی‌معنی است.
//   شدت را تست‌های دیگری می‌گویند که CTCAE پوششان می‌دهد (مثل Hb).
//
//   پس: به‌جای mild/moderate/marked، یک برچسب معنایی می‌دهیم.
//
// سه نوع تست:
//   1. CTCAE دارد        → درجه‌بندی شدت (grade.js)
//   2. دسته‌بند است       → این فایل: برچسب معنایی
//   3. فقط باینری        → خارج از محدوده / داخل محدوده
// ============================================================

// دسته‌بندها: نقاط برش معنایی، نه شدت
export const CLASSIFIERS = {

  // ---- ریخت‌شناسی گلبول قرمز — دسته، نه شدت ----
  MCV: {
    kind: 'classifier',
    label: 'اندازه گلبول قرمز',
    bands: [
      { max: 80,  tag: 'microcytosis', fa: 'گلبول‌های کوچک',   patient: 'گلبول‌های قرمز شما کوچک‌تر از حد معمول هستند' },
      { max: 100, tag: 'normocytic',   fa: 'اندازه طبیعی',      patient: null },
      { max: Infinity, tag: 'macrocytosis', fa: 'گلبول‌های بزرگ', patient: 'گلبول‌های قرمز شما بزرگ‌تر از حد معمول هستند' },
    ],
    note: 'شدت کم‌خونی را Hb تعیین می‌کند، نه MCV',
  },

  MCH: {
    kind: 'classifier',
    label: 'محتوای هموگلوبین گلبول',
    bands: [
      { max: 27, tag: 'hypochromia', fa: 'کم‌رنگ', patient: 'گلبول‌های قرمز شما هموگلوبین کمتری دارند' },
      { max: 34, tag: 'normochromic', fa: 'طبیعی', patient: null },
      { max: Infinity, tag: 'hyperchromia', fa: 'پررنگ', patient: null },
    ],
  },

  MCHC: {
    kind: 'binary',
    label: 'غلظت هموگلوبین گلبول',
    note: 'MCHC بالا با میکروسیتوز → اسفروسیتوز مطرح است',
  },

  // ---- آهن ----
  IRON: {
    kind: 'binary',
    label: 'آهن سرم',
    note: 'آهن پایین + TIBC بالا → فقر آهن. آهن پایین + TIBC پایین → بیماری مزمن. الگو تصمیم می‌گیرد، نه عدد تنها.',
  },

  // ---- ESR ----
  ESR: {
    kind: 'binary',
    label: 'سرعت رسوب',
    note: 'ESR بالا با CRP نرمال → التهاب مزمن. CRP بالا با ESR نرمال → التهاب حاد. الگو تصمیم می‌گیرد.',
  },

  // ---- فریتین ----
  FERRITIN: {
    kind: 'binary',
    label: 'ذخیره آهن',
    note: 'فریتین واکنش‌گر فاز حاد است — در التهاب کاذب بالا می‌رود. با CRP تفسیر شود.',
  },

  TSAT: {
    kind: 'binary',
    label: 'اشباع ترانسفرین',
    note: 'با آهن و TIBC با هم تفسیر شود',
  },

  // ---- انعقاد — باینری، الگو تصمیم می‌گیرد ----
  PT:     { kind: 'binary', label: 'زمان پروترومبین', note: 'الگوی PT/aPTT مسیر را مشخص می‌کند' },
  APTT:   { kind: 'binary', label: 'زمان ترومبوپلاستین', note: 'همان' },
  FIB:    { kind: 'binary', label: 'فیبرینوژن', note: 'ISTH: <100 mg/dL امتیاز DIC' },
  DDIMER: { kind: 'binary', label: 'D-dimer', note: 'ISTH: افزایش شدید امتیاز DIC' },
  INR:     { kind: 'binary', label: 'INR', note: 'با PT تفسیر شود' },
  LACTATE: { kind: 'binary', label: 'لاکتات', note: '>4 mmol/L → شوک/سپسیس' },
  PCT_SEPSIS: { kind: 'binary', label: 'پروکلسی‌تونین', note: '>2 → عفونت باکتریایی شدید' },
  CRP_Q:   { kind: 'binary', label: 'CRP کمی' },
  NH3:     { kind: 'binary', label: 'آمونیاک', note: 'بالا → انسفالوپاتی کبدی' },
  HCO3:    { kind: 'binary', label: 'بی‌کربنات', note: 'برای anion gap لازم است' },
  PH:      { kind: 'binary', label: 'pH خون' },

  // ---- تیروئید — الگوی TSH/FT4 ----
  TSH: {
    kind: 'classifier',
    label: 'تیروئید',
    bands: [
      { max: 0.5, tag: 'hyperthyroid', fa: 'پرکاری',  patient: 'غده تیروئید شما پرکارتر از حد معمول است' },
      { max: 5,   tag: 'normal',       fa: 'طبیعی',   patient: null },
      { max: Infinity, tag: 'hypothyroid', fa: 'کم‌کاری', patient: 'غده تیروئید شما کندتر از حد معمول کار می‌کند' },
    ],
    note: 'آشکار یا تحت‌بالینی بودن را FT4 مشخص می‌کند، نه شدت TSH',
  },
  FT4: { kind: 'binary', label: 'FT4', note: 'با TSH تفسیر شود' },

  // ---- بقیه: باینری ----
  HCT:      { kind: 'binary', label: 'هماتوکریت', note: 'شدت را Hb می‌گوید' },
  RBC:      { kind: 'binary', label: 'شمارش گلبول قرمز', note: 'RBC>5 با MCV پایین → تالاسمی مطرح' },
  RDW_CV:   { kind: 'binary', label: 'تفاوت اندازه گلبول‌ها',
              note: 'RDW بالا + MCV پایین → فقر آهن. RDW نرمال + MCV پایین → تالاسمی مینور.' },
  RDW_SD:   { kind: 'binary', label: 'تفاوت اندازه گلبول‌ها (SD)' },
  MPV:      { kind: 'binary', label: 'حجم متوسط پلاکت' },
  RETIC:    { kind: 'binary', label: 'رتیکولوسیت', note: 'بالا=همولیز/خونریزی، پایین=نارسایی مغز استخوان' },
  MONO_ABS: { kind: 'binary', label: 'مونوسیت' },
  BASO_ABS: { kind: 'binary', label: 'بازوفیل' },
  UREA_N:   { kind: 'binary', label: 'اوره', note: 'نسبت BUN/Cr مهم‌تر از عدد تنهاست' },
  CL:       { kind: 'binary', label: 'کلر', note: 'برای anion gap لازم است' },
  URIC:     { kind: 'binary', label: 'اسید اوریک' },
  TP:       { kind: 'binary', label: 'پروتئین توتال' },
  BILI_D:   { kind: 'binary', label: 'بیلی‌روبین مستقیم', note: 'نسبت مستقیم/غیرمستقیم الگو را می‌سازد' },
  TIBC:     { kind: 'binary', label: 'TIBC', note: 'بالا با آهن پایین → فقر آهن. پایین → بیماری مزمن' },
  B12:      { kind: 'binary', label: 'ویتامین B12' },
  HAPTO:    { kind: 'binary', label: 'هاپتوگلوبین', note: 'پایین → همولیز' },
  LDH:      { kind: 'binary', label: 'LDH', note: 'بالا با هاپتو پایین → همولیز' },
  PHOS:     { kind: 'binary', label: 'فسفر' },
  AMYLASE:  { kind: 'binary', label: 'آمیلاز', note: 'ACG: لیپاز >3×ULN اختصاصی‌تر' },
  LIPASE:   { kind: 'binary', label: 'لیپاز', note: 'ACG: >3×ULN → پانکراتیت حاد' },
};

/**
 * تفسیر یک تست دسته‌بند یا باینری.
 * @returns {{kind, tag, fa, patient, note, source}|null}
 *          null یعنی این تست دسته‌بند نیست (CTCAE دارد).
 */
export function classify(testKey, value, lln, uln) {
  const c = CLASSIFIERS[testKey];
  if (!c || value == null) return null;

  if (c.kind === 'binary') {
    const inRange = value >= lln && value <= uln;
    const dir = value > uln ? 'high' : (value < lln ? 'low' : null);
    return {
      kind: 'binary',
      tag: inRange ? 'normal' : `out_of_range_${dir}`,
      fa: inRange ? 'طبیعی' : (dir === 'high' ? 'بالاتر از حد طبیعی' : 'پایین‌تر از حد طبیعی'),
      patient: null,
      dir,
      label: c.label,
      note: c.note ?? null,
      source: 'محدوده مرجع',
    };
  }

  // classifier
  for (const b of c.bands) {
    if (value < b.max) {
      return {
        kind: 'classifier',
        tag: b.tag,
        fa: b.fa,
        patient: b.patient,
        label: c.label,
        note: c.note ?? null,
        source: c.source ?? 'نقطه برش معنایی',
      };
    }
  }
  return null;
}

export function isClassifier(testKey) {
  return CLASSIFIERS[testKey]?.kind === 'classifier';
}
export function isBinary(testKey) {
  return CLASSIFIERS[testKey]?.kind === 'binary';
}
