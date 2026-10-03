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
      { max: 'lln', tag: 'microcytosis', fa: 'گلبول‌های کوچک',   patient: 'گلبول‌های قرمز شما کوچک‌تر از حد معمول هستند' },
      { max: 'uln', tag: 'normocytic',   fa: 'اندازه طبیعی',      patient: null, normal: true },
      { max: Infinity, tag: 'macrocytosis', fa: 'گلبول‌های بزرگ', patient: 'گلبول‌های قرمز شما بزرگ‌تر از حد معمول هستند' },
    ],
    note: 'شدت کم‌خونی را Hb تعیین می‌کند، نه MCV',
  },

  MCH: {
    kind: 'classifier',
    label: 'محتوای هموگلوبین گلبول',
    bands: [
      { max: 'lln', tag: 'hypochromia', fa: 'کم‌رنگ', patient: 'گلبول‌های قرمز شما هموگلوبین کمتری دارند' },
      { max: 'uln', tag: 'normochromic', fa: 'طبیعی', patient: null, normal: true },
      { max: Infinity, tag: 'hyperchromia', fa: 'پررنگ', patient: null },
    ],
  },

  MCHC: {
    kind: 'binary',
    label: 'غلظت هموگلوبین گلبول',
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

  // ---- ویتامین D — دسته، نه شدت CTCAE ----
  // آستانه‌ها: Endocrine Society 2011 (کمبود <20، ناکافی 21–29، کافی ≥30).
  // این انتخاب آگاهانه است — IOM/NAM آستانه کفایت را ۲۰ می‌داند و
  // خود Endocrine Society در ۲۰۲۴ از هدف ۳۰ عقب نشست. جزئیات در refs.js.
  VIT_D: {
    kind: 'classifier',
    label: 'ویتامین D',
    bands: [
      { max: 20,  tag: 'deficiency',    fa: 'کمبود ویتامین D',  patient: 'ویتامین D خون شما کم است' },
      { max: 30,  tag: 'insufficiency', fa: 'ویتامین D ناکافی', patient: 'ویتامین D خون شما کمی کمتر از حد مطلوب است' },
      { max: 100, tag: 'sufficient',    fa: 'کافی',             patient: null, normal: true },
      // ۱۰۰–۱۵۰: بالاتر از حد مطلوب ولی سمّی نیست (معمولاً از مکمل).
      { max: 150, tag: 'above_target',  fa: 'بالاتر از حد مطلوب', patient: 'ویتامین D خون شما بالاتر از حد مطلوب است — مصرف مکمل را با پزشک بررسی کنید' },
      // سمّیت ویتامین D قراردادی >۱۵۰ ng/mL است و معمولاً با کلسیم بالا همراه است.
      { max: Infinity, tag: 'possible_toxicity', fa: 'احتمال زیاده‌روی در مکمل', patient: 'ویتامین D خون شما خیلی بالاست — حتماً مصرف مکمل را با پزشک در میان بگذارید' },
    ],
    note: 'ویتامین D بالا معمولاً ناشی از مکمل است، نه بیماری',
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

  // ---- نشانگرهای قلبی‌عروقی (هنری فصل ۱۹) — همه باینری، باندها در قاعده ----
  //
  // ⚠️ هر سهٔ این‌ها باندِ چندتایی دارند (hs-CRP سه رده، هموسیستئین سه درجه،
  //    BNP آستانهٔ تصمیم) و با این حال عمداً `classifier` نشده‌اند. دلیلش یک
  //    جزئیاتِ مکانیکیِ همین فایل است که به بیمار می‌رسد: مقایسهٔ باندها
  //    `value <= limit` است، در حالی که هنری باندهایش را *بسته از چپ* تعریف
  //    می‌کند («mild ۱۶–۳۰»، یعنی خودِ ۱۶ خفیف است). با bands، عددِ مرزی یک
  //    رده پایین‌تر گزارش می‌شد. در patterns_cardiac.js عملگر دستِ خودمان است
  //    (`>= 16`, `> 30`, `> 100`) و دقیقاً همان چیزی می‌شود که متن می‌گوید.
  BNP: {
    kind: 'binary',
    label: 'BNP',
    note: 'آستانهٔ ۱۰۰ pg/mL فقط در بیمارِ دچارِ تنگیِ نفسِ حاد اعتبارسنجی شده؛ چاقی پایینش می‌آورد و سن/کم‌خونی/نارساییِ کلیه بالا. الگو تصمیم می‌گیرد.',
  },
  NTPROBNP: {
    kind: 'binary',
    label: 'NT-proBNP',
    note: 'متنِ منبع فقط آستانهٔ *رد* دارد (<۳۰۰ pg/mL). هیچ آستانهٔ تأییدی ساخته نشده.',
  },
  HCY: {
    kind: 'binary',
    label: 'هموسیستئین',
    note: 'درجه‌بندی خفیف/متوسط/شدید (۱۶–۳۰ / ۳۰–۱۰۰ / >۱۰۰ µmol/L) در patterns_cardiac.js اعمال می‌شود.',
  },

  // ---- سرولوژی بروسلوز — مقدار، مخرجِ تیتر است ----
  // آستانه‌ها: راهنمای کشوری بروسلوز، وزارت بهداشت، ص ۴۰
  //   (رایت ≥۱/۸۰، 2ME ≥۱/۴۰، کومبس رایت ≥۱/۴۰).
  // ⚠️ تیتر «شدت» نیست، پس severity/CTCAE اینجا بی‌معناست — طبقه‌بند است.
  WRIGHT: {
    kind: 'classifier',
    label: 'رایت (آگلوتیناسیون بروسلا)',
    bands: [
      { max: 80,  tag: 'below_threshold', fa: 'زیر آستانهٔ تشخیصی', patient: null, normal: true },
      { max: 160, tag: 'significant',     fa: 'در آستانهٔ باارزش',
        patient: 'تیتر رایت شما در حدی است که باید بررسی شود' },
      { max: Infinity, tag: 'high_titre', fa: 'تیتر بالا',
        patient: 'تیتر رایت شما بالاست و باید حتماً بررسی شود' },
    ],
    note: 'تیترِ منفرد، عفونتِ فعال را از تماسِ قبلی جدا نمی‌کند؛ افزایشِ ۴برابری در دو هفته ملاک است',
  },
  ME2: {
    kind: 'classifier',
    label: '2ME',
    bands: [
      { max: 40, tag: 'below_threshold', fa: 'زیر آستانهٔ تشخیصی', patient: null, normal: true },
      { max: Infinity, tag: 'significant', fa: 'باارزش',
        patient: 'تست 2ME شما مثبتِ باارزش است' },
    ],
    note: '2ME فقط IgG را می‌سنجد؛ در تب مالت IgG با بیماریِ فعال و علامت‌دار همراهی بیشتری دارد تا IgM',
  },
  COOMBS_WRIGHT: {
    kind: 'classifier',
    label: 'کومبس رایت',
    bands: [
      { max: 40, tag: 'below_threshold', fa: 'زیر آستانهٔ تشخیصی', patient: null, normal: true },
      { max: Infinity, tag: 'significant', fa: 'باارزش',
        patient: 'تست کومبس رایت شما مثبتِ باارزش است' },
    ],
    note: 'آنتی‌بادیِ بلوک‌کننده را می‌گیرد که رایتِ ساده را منفیِ کاذب می‌کند — به‌ویژه در موارد مزمن',
  },

  // فاکتور روماتوئید — «مثبت بودن» تشخیص نیست؛ نسبت به ULN مهم است.
  RF: { kind: 'binary', label: 'فاکتور روماتوئید',
        note: 'غیراختصاصی: ۵٪ بزرگسالانِ سالم و ۱۰–۲۵٪ سالمندانِ سالم مثبت‌اند' },
  NH3:     { kind: 'binary', label: 'آمونیاک', note: 'بالا → انسفالوپاتی کبدی' },
  HCO3:    { kind: 'binary', label: 'بی‌کربنات', note: 'برای anion gap لازم است' },
  PH:      { kind: 'binary', label: 'pH خون' },

  // ---- تیروئید — الگوی TSH/FT4 ----
  TSH: {
    kind: 'classifier',
    label: 'تیروئید',
    bands: [
      { max: 0.5, tag: 'hyperthyroid', fa: 'پرکاری',  patient: 'غده تیروئید شما پرکارتر از حد معمول است' },
      { max: 4.5, tag: 'normal',       fa: 'طبیعی',   patient: null },  // حد بالا از ۵ به ۴.۵
      { max: Infinity, tag: 'hypothyroid', fa: 'کم‌کاری', patient: 'غده تیروئید شما کندتر از حد معمول کار می‌کند' },
    ],
    note: 'آشکار یا تحت‌بالینی بودن را FT4 مشخص می‌کند، نه شدت TSH',
  },
  FT4: { kind: 'binary', label: 'FT4', note: 'با TSH تفسیر شود' },

  // ---- آلبومین ادرار (ACR) — طبقه‌بندی KDIGO ----
  // A1 <30، A2 30–300، A3 ≥300 mg/g (منبع: KDIGO 2024؛ فصل کلیه بیوشیمی بالینی).
  // با `<` سختِ classify: <30→A1، 30–<300→A2، ≥300→A3 (منطبق بر «A3 ≥300»).
  ACR: {
    kind: 'classifier',
    label: 'نسبت آلبومین به کراتینین ادرار',
    bands: [
      { max: 30,  tag: 'A1', fa: 'طبیعی تا افزایش خفیف', patient: null, normal: true },
      { max: 300, tag: 'A2', fa: 'افزایش متوسط آلبومین ادرار (میکروآلبومینوری)',
        patient: 'مقدار کمی آلبومین در ادرار شما دفع می‌شود' },
      { max: Infinity, tag: 'A3', fa: 'افزایش شدید آلبومین ادرار',
        patient: 'آلبومین قابل‌توجهی در ادرار شما دفع می‌شود' },
    ],
    note: 'نشانگر زودرس آسیب کلیه در دیابت/فشارخون — پیش از تغییر کراتینین/eGFR',
    source: 'KDIGO 2024',
  },

  // ---- بقیه: باینری ----
  HCT:      { kind: 'binary', label: 'هماتوکریت', note: 'شدت را Hb می‌گوید' },
  RBC:      { kind: 'binary', label: 'شمارش گلبول قرمز', note: 'RBC>5 با MCV پایین → تالاسمی مطرح' },
  RDW_CV:   { kind: 'binary', label: 'تفاوت اندازه گلبول‌ها',
              note: 'RDW بالا + MCV پایین → فقر آهن. RDW نرمال + MCV پایین → تالاسمی مینور.' },
  RDW_SD:   { kind: 'binary', label: 'تفاوت اندازه گلبول‌ها (SD)' },
  MPV:      { kind: 'binary', label: 'حجم متوسط پلاکت' },
  MYOGLOBIN:   { kind: 'binary', label: 'میوگلوبین' },
  TRANSFERRIN: { kind: 'binary', label: 'ترانسفرین' },
  ATIII:       { kind: 'binary', label: 'آنتی‌ترومبین III' },
  TT:          { kind: 'binary', label: 'زمان ترومبین' },
  RETIC:    { kind: 'binary', label: 'رتیکولوسیت', note: 'بالا=همولیز/خونریزی، پایین=نارسایی مغز استخوان' },
  MONO_ABS: { kind: 'binary', label: 'مونوسیت' },
  BASO_ABS: { kind: 'binary', label: 'بازوفیل' },
  UREA_N:   { kind: 'binary', label: 'BUN (نیتروژن اورهٔ خون)', note: 'نسبت BUN/Cr مهم‌تر از عدد تنهاست' },
  UREA:     { kind: 'binary', label: 'اوره', note: 'با محدودهٔ خودِ اوره تفسیر می‌شود، نه BUN' },
  CL:       { kind: 'binary', label: 'کلر', note: 'برای anion gap لازم است' },
  URIC:     { kind: 'binary', label: 'اسید اوریک' },
  TP:       { kind: 'binary', label: 'پروتئین توتال' },
  BILI_D:   { kind: 'binary', label: 'بیلی‌روبین مستقیم', note: 'نسبت مستقیم/غیرمستقیم الگو را می‌سازد' },
  TIBC:     { kind: 'binary', label: 'TIBC', note: 'بالا با آهن پایین → فقر آهن. پایین → بیماری مزمن' },
  B12:      { kind: 'binary', label: 'ویتامین B12' },
  HAPTO:    { kind: 'binary', label: 'هاپتوگلوبین', note: 'پایین → همولیز' },
  LDH:      { kind: 'binary', label: 'LDH', note: 'بالا با هاپتو پایین → همولیز' },
  PHOS:     { kind: 'binary', label: 'فسفر', note: 'با کلسیم و PTH با هم تفسیر می‌شود؛ جهتش تعیین‌کنندهٔ الگوست' },
  // PTH و کلسیمِ ادرار عمداً باینری‌اند، نه دسته‌بند: عددشان به‌تنهایی هیچ
  // معنایی ندارد. «PTH = ۹۰» در هایپرکلسمی یعنی پرکاریِ اولیه و در
  // هایپوکلسمی یعنی پاسخِ طبیعیِ ثانویه — دو تشخیصِ متضاد از یک عدد.
  // تصمیم فقط در patterns_mineral_bone.js گرفته می‌شود، جایی که کلسیم هم دیده می‌شود.
  PTH:      { kind: 'binary', label: 'هورمون پاراتیروئید (PTH)', note: 'بدون کلسیمِ همزمان تفسیرپذیر نیست' },
  U_CA:     { kind: 'binary', label: 'کلسیم ادرار ۲۴ ساعته', note: 'هایپرپاراتیروئیدی اولیه را از FHH جدا می‌کند' },
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
    let limit = b.max;
    if (limit === 'lln') limit = lln;
    else if (limit === 'uln') limit = uln;
    
    // در مواردی که uln برای تست ارسال نشده یا نامعتبر باشد
    if (limit == null || isNaN(limit)) {
        if (b.max === 'lln') {
            if (testKey === 'MCV') limit = 80;
            else if (testKey === 'MCH') limit = 27;
        }
        if (b.max === 'uln') {
            if (testKey === 'MCV') limit = 100;
            else if (testKey === 'MCH') limit = 34;
        }
    }

    // مرزِ پایینِ بازهٔ مرجع «طبیعی» است، نه غیرطبیعی: بازهٔ [lln, uln] هر دو سر را شامل می‌شود.
    // پس بند lln باید اکیداً کوچک‌تر باشد (MCV=80 نرموسیتیک است، نه میکروسیتیک)، در حالی که
    // بند uln شامل خودِ مرز است (MCV=100 نرموسیتیک است). قبلاً هر دو <= بودند و مرزِ پایین
    // برخلافِ refs.js غیرطبیعی علامت می‌خورد.
    const hit = b.max === 'lln' ? value < limit : value <= limit;
    if (hit) {
      return {
        kind: 'classifier',
        tag: b.tag,
        fa: b.fa,
        normal: b.normal === true,
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
