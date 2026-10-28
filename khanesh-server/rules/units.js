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

import { getRef } from './refs.js';

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
  // کلسیمِ ادرارِ ۲۴ ساعته — mmol/day روی برگه‌های SI رایج است.
  // ضریب از خودِ متنِ منبع درآمده، نه از وزنِ اتمی: Henry فصل ۱۶ می‌نویسد
  //   «تا ۳۰۰ mg/day (۷.۴۹ mmol/day)» → 300 ÷ 7.49 = 40.05.
  // ⚠️ الگوی واحد باید mmol/24h و mmol/d و mmol/day را با هم بگیرد؛ هر سه
  //    روی برگه دیده می‌شوند و اگر یکی جا بیفتد عدد بدونِ تبدیل گرید می‌شود
  //    (۷.۵ در برابر بازهٔ ۱۰۰–۳۰۰ → «خیلی پایین» → FHH جعلی).
  U_CA: { si: /^mmol\/(24h|24hr|d|day)$/, siUnit: 'mmol/24h', factor: 40.05, conv: 'mg/24h' },
  // PTH عمداً اینجا نیست: متنِ منبع صریحاً pg/mL و ng/L را یکی می‌گیرد
  //   («10 to 65 pg/mL (ng/L)»)، پس عددشان برابر است و «تبدیل» خرابکاری است —
  //   همان استدلالِ Na/K/Cl بالا.

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

  // ---- آدرنال (فصل ۲۵ هنری، P46) ----
  // این سه ضریب از جرمِ مولی‌اند، نه از قراردادِ کیت — پس تصمیمِ بالینی نیستند:
  //   کورتیزول ۳۶۲.۴۶ g/mol → ۱ µg/dL = ۲۷.۵۹ nmol/L؛ و µg/24h ↔ nmol/24h ضریبِ ۲.۷۵۹.
  //   ACTH ‏۴۵۴۱ g/mol → ۱ pmol/L = ۴.۵۴۱ pg/mL (نه ۴.۵۱ که در پیش‌نویسِ طراحی آمده بود — غلطِ رقمی).
  // پرولاکتین (mIU/L ÷ ۲۱.۲، بندِ ۱۱ِ P46) در PRINTED_ONLY_CONVERSIONS است، نه اینجا — توضیحش آنجاست.
  CORTISOL_AM:  { si: /^nmol\/l$/, factor: 1 / 27.59, conv: 'µg/dL' },
  CORTISOL:     { si: /^nmol\/l$/, factor: 1 / 27.59, conv: 'µg/dL' },
  CORTISOL_DST: { si: /^nmol\/l$/, factor: 1 / 27.59, conv: 'µg/dL' },
  CORTISOL_SAL: { si: /^nmol\/l$/, factor: 1 / 27.59, conv: 'µg/dL' },
  UFC:  { si: /^nmol\/(24h|24hr|d|day)$/, siUnit: 'nmol/24h', factor: 1 / 2.759, conv: 'µg/24h' },
  ACTH: { si: /^pmol\/l$/, factor: 4.541, conv: 'pg/mL' },

  // ── فصل ۲۶ هنری (P47) — فقط تبدیل‌های *دقیق* از جرمِ مولی؛ تصمیمِ بالینی نیستند ──
  //   تستوسترون ۲۸۸.۴ g/mol → ۱ nmol/L = ۲۸.۸۴ ng/dL
  //   استرادیول ۲۷۲.۴ → ۱ pmol/L = ۰.۲۷۲۴ pg/mL (÷ ۳.۶۷۱)
  //   پروژسترون ۳۱۴.۵ → ۱ nmol/L = ۰.۳۱۴۵ ng/mL (÷ ۳.۱۸)
  //   17-OHP ۳۳۰.۵ → ۱ nmol/L = ۰.۳۳۰۵ ng/mL (÷ ۳.۰۲۶)
  //   DHEA-S ۳۶۸.۵ → ۱ µmol/L = ۳۶.۸۵ µg/dL
  // ⚠️ AMH (pmol/L ÷ ۷.۱۴) عمداً اینجا نیست: آن ضریب از وزنِ *اسمیِ* ~۱۴۰ kDa می‌آید و
  //    قرارداد است، نه اتحادِ مولی — بندِ ۱۷ِ P47، منتظرِ بازبین (M105c نگهبان است).
  //    LH/FSH/hCG: IU/L و mIU/mL عددشان یکی است — تبدیلی لازم نیست.
  TESTO:    { si: /^nmol\/l$/, factor: 28.84, conv: 'ng/dL' },
  E2:       { si: /^pmol\/l$/, factor: 1 / 3.671, conv: 'pg/mL' },
  E2_D3:    { si: /^pmol\/l$/, factor: 1 / 3.671, conv: 'pg/mL' },
  PROG:     { si: /^nmol\/l$/, factor: 1 / 3.18, conv: 'ng/mL' },
  PROG_D21: { si: /^nmol\/l$/, factor: 1 / 3.18, conv: 'ng/mL' },
  OHP17:    { si: /^nmol\/l$/, factor: 1 / 3.026, conv: 'ng/mL' },
  DHEAS:    { si: /^[µμu]mol\/l$/, factor: 36.85, conv: 'µg/dL' },
};

/**
 * تبدیل‌هایی که *فقط* با واحدِ چاپ‌شده انجام می‌شوند (specs/007، کلاسِ N3).
 *
 * 🔴 پیش از 007: «Hct 0.39 L/L» (طبیعی) ۰.۳۹٪ سنجیده می‌شد و «پایین» می‌خورد، و «MCHC 366 g/L»
 *    (۳۶.۶ g/dL) در برابرِ بازهٔ ۳۲–۳۶ «بالا». با بحرانِ هماتوکریتِ بی‌هموگلوبین (Hct < ۲۱) اولی
 *    اورژانسِ کاذب می‌شد، و با یادداشتِ MCHC > ۳۶.۵ دومی روی هر برگهٔ SI می‌نشست.
 * ⚠️ عمداً در SI_CONVERSIONS نیستند: آنجا بودن یعنی ردیفِ UNIT_PROFILE (M121b)، و آن‌وقت decideUnit
 *    سراغِ عددِ *بی‌واحد* هم می‌رود — «Hct 39»ِ بی‌واحد، رایج‌ترین شکلِ برگه، بی‌محدودهٔ چاپ‌شده دیگر
 *    سنجیده نمی‌شد. عددِ بی‌واحدِ ناممکن (هماتوکریتِ ≤ ۱، MCHCِ > ۱۰۰) را adapter به unmapped می‌فرستد.
 */
// ── P107 (L11، N3): واحدِ چاپ‌شدهٔ دومی که جدولِ اصلی نداشت. فقط با واحدِ *چاپ‌شده* (عددِ بی‌واحد هرگز به این‌ها نمی‌رسد) ──
//   ضریب‌ها از ظرفیت و جرمِ مولی‌اند، نه قراردادِ کیت:
//   کلسیم ۲ظرفیتی: ۱ mEq/L = ۰٫۵ mmol/L = ۲٫۰۰۴ mg/dL (۴۰٫۰۸ g/mol)؛ منیزیم ۲ظرفیتی: ۱ mEq/L = ۰٫۵ mmol/L = ۱٫۲۱۵ mg/dL (۲۴٫۳۱).
//   اسید اوریک ۱۶۸٫۱ g/mol: ۱ mmol/L = ۱۶٫۸۱ mg/dL. هموگلوبین (واحدِ تک‌زنجیره، Hb(Fe)، ۱۶۱۱۴ g/mol): ۱ mmol/L = ۱٫۶۱۱ g/dL.
//   پیش‌تر «Ca 4.8 mEq/L» (= ۹٫۶ mg/dL، طبیعی) اورژانس می‌شد و «Hb 5.2 mmol/L» (≈ ۸٫۴ g/dL) unit_unknown ِ اورژانسی.
//   فسفات عمداً نیست: ظرفیتش به pH بسته است و mEq/L برایش ضریبِ ثابت ندارد.
export const EXTRA_PRINTED_UNITS = {
  CA:   [[/^meq\/l$/, 2.004, 'mg/dL']],
  MG:   [[/^meq\/l$/, 1.215, 'mg/dL']],
  URIC: [[/^mmol\/l$/, 16.81, 'mg/dL']],
  HGB:  [[/^mmol\/l$/, 1.611, 'g/dL']],
  // 🔴 ۲۰۲۶-۱۰-۲۸ (بازبینیِ برگهٔ واقعی، N3): T4ِ *تام* روی برگه‌های ایرانی با ng/mL چاپ می‌شود (بازهٔ «45–120»)،
  //   نه فقط µg/dL. واحد شناخته نمی‌شد، decideUnit از روی محدودهٔ چاپ‌شده «nmol/l» را انتخاب می‌کرد و
  //   ۷۴٫۲ به ۵٫۷۷ µg/dL «پایین» تبدیل می‌شد ⇒ یافتهٔ `total_t4_abnormal` و هشدارِ کم‌کاریِ تیروئید برای کودکِ سالم
  //   (T4 ۷٫۴۲ µg/dL، وسطِ بازهٔ اطفال). ضریب تعریفیِ جرم است، نه تصمیمِ بالینی: ۱ ng/mL = ۱ µg/L = ۰٫۱ µg/dL.
  //   عمداً در SI_CONVERSIONS نیست (درسِ M177/P48): آن‌جا بودن یعنی ردیفِ UNIT_PROFILE و آن‌وقت decideUnit
  //   سراغِ عددِ *بی‌واحد* هم می‌رود.
  T4:   [[/^ng\/ml$/, 0.1, 'µg/dL']],
};


export const PRINTED_ONLY_CONVERSIONS = {
  HCT:  { si: /^(l\/l|fraction)$/, factor: 100, conv: '%' },
  MCHC: { si: /^g\/l$/, factor: 0.1, conv: 'g/dL' },
  // ۲۰۲۶-۱۰-۰۳: ترانسفرین g/L (۲–۳٫۶) رایج‌ترین شکلِ چاپ است؛ آنتی‌ترومبین IU/mL (۰٫۸–۱٫۳)؛ میوگلوبین ng/L.
  TRANSFERRIN: { si: /^g\/l$/, factor: 100, conv: 'mg/dL' },
  ATIII:       { si: /^(iu\/ml|u\/ml)$/, factor: 100, conv: '%' },
  MYOGLOBIN:   { si: /^ng\/l$/, factor: 0.001, conv: 'ng/mL' },
  // ۲۰۲۶-۱۰-۰۳ (لایهٔ ۲، N3): refs.js لاکتات را mmol/L می‌خواهد ولی برگهٔ ایرانی گاهی mg/dL می‌دهد؛ «لاکتات 18 mg/dL» (≈ ۲ mmol/L، طبیعی)
  //   با حدِ ۴ سپسیس اورژانسِ کاذب می‌شد. وزنِ مولکولی ۹۰٫۰۸: mg/dL ÷ ۹٫۰۰۸. PCT: pg/mL و ng/L هم‌ارزند (÷۱۰۰۰ ⇒ ng/mL)؛ «PCT 50 pg/mL»
  //   (= ۰٫۰۵ ng/mL، طبیعی) اورژانس می‌شد. APOB: refs.js mg/dL است؛ g/L ×۱۰۰ («Apo B 1.4 g/L» = ۱۴۰ mg/dL بی‌صدا طبیعی خوانده می‌شد).
  //   فقط با واحدِ چاپ‌شده — عددِ بی‌واحد حدس زده نمی‌شود (P48).
  LACTATE:     { si: /^mg\/dl$/, factor: 1 / 9.008, conv: 'mmol/L' },
  PCT_SEPSIS:  { si: /^(pg\/ml|ng\/l)$/, factor: 0.001, conv: 'ng/mL' },
  APOB:        { si: /^g\/l$/, factor: 100, conv: 'mg/dL' },
  // P107k (N3): refs.js فیبرینوژن را mg/dL (۲۰۰–۴۰۰) می‌خواهد ولی برگه‌های g/L (۲–۴) رایج‌اند؛ «۳٫۰ g/L» نرمال با بازهٔ mg/dL «پایین» و soon می‌شد.
  //   فقط با واحدِ چاپ‌شده؛ ۱ g/L = ۱۰۰ mg/dL (تعریفی).
  FIB:         { si: /^g\/l$/, factor: 100, conv: 'mg/dL' },
  // P77-۱۲: FLC در refs.js mg/L است؛ mg/dL ×۱۰. بی‌واحد = mg/L (شکلِ رایجِ Freelite) — فرضِ بازبین‌پذیر، در متنِ قاعده گفته می‌شود.
  KAPPA_FLC:   { si: /^mg\/dl$/, factor: 10, conv: 'mg/L' },
  LAMBDA_FLC:  { si: /^mg\/dl$/, factor: 10, conv: 'mg/L' },
  // P46 بند ۱۱ (تصمیمِ کاربر ۲۰۲۶-۱۰-۰۳: پرولاکتینِ mIU/L نباید به «تفسیر نشدند» برود): ۱ ng/mL = ۲۱.۲ mIU/L، استانداردِ
  //   WHO ‏۳rd IS ‏۸۴/۵۰۰ (هر آمپول ۵۳ mIU = ۲.۵ µg؛ NIBSC). ⚠️ به استانداردِ کیت وابسته است (کیتِ قدیمیِ ۷۵/۵۰۴ ضریبِ دیگری داشت)،
  //   پس ردیفِ تبدیل در unitConversions می‌آید. µIU/mL و mU/L عددشان با mIU/L یکی است. فقط با واحدِ چاپ‌شده (N3) —
  //   عمداً در SI_CONVERSIONS نیست تا PRLِ بی‌واحد (رایج‌ترین شکل، ng/mL) به decideUnit نرود.
  PRL:  { si: /^(?:miu\/l|[µμu]iu\/ml|mu\/l|[µμu]u\/ml)$/, siUnit: 'mIU/L', factor: 1 / 21.2, conv: 'ng/mL' },
};

// ── specs/010: واحدِ فعالیتِ فاکتور / vWF / مهارکننده — فقط واحدِ *چاپ‌شده* ──
// ⚠️ عمداً بیرون از SI_CONVERSIONS / UNIT_PROFILE: ورود به آن‌ها مقدارِ بی‌واحد را به decideUnit می‌فرستد (درسِ M177)،
//    و این کلیدها نمره نمی‌گیرند. عددِ بی‌واحد هرگز از روی بزرگی حدس زده نمی‌شود (P48): unitState «unknown».
//    ۱ IU/dL ≡ ۱٪ پلاسمای طبیعیِ تجمیعی؛ IU/mL صد برابر (۰٫۰۱ IU/mL = ۱٪).
const HEMOSTASIS_ACTIVITY_UNITS = [
  [/^(%|٪|percent|iu\/dl|u\/dl|iu\/100ml)$/, 1],
  [/^(iu\/ml|u\/ml)$/, 100],
];
const HEMOSTASIS_INHIB_UNITS = /^(bu|bu\/ml|bethesda|bethesdaunits?|bethesdaunit\/ml)$/;
export const HEMOSTASIS_KEYS = new Set(["FVIII", "FIX", "VWF_AG", "VWF_ACT", "FVIII_INHIB", "PT_CONTROL"]);

/** مقدارِ عددیِ یک ردیفِ هموستاز → { value, unitState }. value فقط وقتی unitState === "ok" تبدیل‌شده است. */
export function hemostasisUnit(key, value, unit) {
  const raw = unit == null ? "" : String(unit).trim();
  if (!raw) return { value, unitState: "unknown" };
  const u = normUnit(raw);
  if (key === "FVIII_INHIB") return HEMOSTASIS_INHIB_UNITS.test(u) ? { value, unitState: "ok" } : { value, unitState: "unrecognised" };
  if (key === "PT_CONTROL") return /^(s|sec|secs|second|seconds|ثانیه)$/.test(u) ? { value, unitState: "ok" } : { value, unitState: "unrecognised" };
  for (const [re, f] of HEMOSTASIS_ACTIVITY_UNITS) if (re.test(u)) return { value: Math.round(value * f * 1000) / 1000, unitState: "ok" };
  return { value, unitState: "unrecognised" };
}

// املای فارسیِ واحد (پس از حذفِ فاصله و نیم‌فاصله) → املای لاتین
const FA_UNITS = [
  [/میکروگرمدردسیلیتر/, 'µg/dl'], [/میلیگرمدردسیلیتر/, 'mg/dl'], [/نانوگرمدردسیلیتر/, 'ng/dl'],
  [/نانوگرمدرمیلیلیتر/, 'ng/ml'], [/پیکوگرمدرمیلیلیتر/, 'pg/ml'], [/گرمدردسیلیتر/, 'g/dl'],
  [/میلیمولدرلیتر/, 'mmol/l'], [/میکرومولدرلیتر/, 'µmol/l'], [/نانومولدرلیتر/, 'nmol/l'],
  [/پیکومولدرلیتر/, 'pmol/l'], [/گرمدرلیتر/, 'g/l'],
];

/**
 * واحدِ چاپ‌شده را به شکلِ قانونی برگردان: حروفِ کوچک، بی‌فاصله، بی‌قاب و نقطهٔ انتها.
 * ⚠️ OCR واحد را با قاب می‌نویسد («(mg/dL)»، «[mg/dL]»)، نقطه می‌گذارد («mg/dL.»)، «/» را می‌اندازد
 *    («mgdl») یا `l` را `i` می‌خواند («mg/di»)، و برگهٔ فارسی «میلی گرم در دسی لیتر» می‌نویسد.
 *    پیش از این، هر کدام «واحدِ ناشناخته» بود — و یعنی برگه‌ای که واحد را *داشت* مثلِ برگهٔ بی‌واحد
 *    رفتار می‌کرد (FR-009).
 */
export function normUnit(u) {
  let s = String(u ?? '').toLowerCase().replace(/[\s‌‏‎]+/g, '')
    .replace(/[()[\]{}]/g, '').replace(/\.+$/, '').trim();
  for (const [re, en] of FA_UNITS) if (re.test(s)) return en;
  // P110-ج (برگهٔ واقعی): «micg/dl» (T4) و «microg/dl» همان mcg ⇒ µg/dL؛ پیش‌تر ناشناخته بود و واحد «چاپ‌نشده» گزارش می‌شد.
  s = s.replace(/^(micg|microg(?:ram)?s?)(?=\/)/, 'mcg');
  s = s.replace(/^(mg|g|µg|μg|ug|mcg|ng|pg)\/di$/, '$1/dl')
    .replace(/^(mg|g|µg|μg|ug|mcg|ng|pg)(dl|ml)$/, '$1/$2')
    .replace(/^(mmol|µmol|μmol|umol|nmol|pmol)l$/, '$1/l');
  return s;
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
    // «استنتاجی» فیلدِ جدا است، نه بخشی از نامِ واحد: adapter آن را `basis: "magnitude"` می‌کند و
    // صفحه می‌گوید واحد روی برگه نبود (پیش‌تر «printed» برچسب می‌خورد — ادعای غلط، N5).
    return { value: ifccToNgsp(value), converted: true, from: 'mmol/mol', inferred: true };
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
    return { value: r.value, converted: r.converted, from: r.from, to: '%', ...(r.inferred ? { inferred: true } : {}) };
  }

  const u0 = normUnit(unit);
  // P107 (L11): واحدِ چاپ‌شدهٔ دوم (فقط چاپ‌شده، هرگز حدس) — پیش از جدولِ اصلی، چون الگوهایشان هم‌پوشانی ندارند.
  const alt = u0 && (EXTRA_PRINTED_UNITS[engineKey] ?? []).find(([re]) => re.test(u0));
  const rule = alt ? { si: alt[0], factor: alt[1], conv: alt[2] } : SI_CONVERSIONS[engineKey] ?? PRINTED_ONLY_CONVERSIONS[engineKey];
  if (!rule) return { value, converted: false, from: null, to: null };

  const u = u0;
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

// ============================================================
// واحدِ ردیفی که برگه برایش واحد ننوشته (specs/003-unitless-lab-values، P48)
// ============================================================
// 🔴 باگِ واقعی، کلاسِ N3 — این بار نه واحدِ غلط، بلکه واحدِ *نانوشته*: موتور هر عددِ بی‌واحد را
//    بی‌صدا با واحدِ متعارف می‌سنجید. روی برگه‌ای که SI است ولی واحد را چاپ نکرده (یا OCR نخوانده):
//      «Creatinine 80» (طبیعی، µmol/L)        → ۸۰ mg/dL → اورژانس
//      «Calcium 2.4» (طبیعی، mmol/L)          → هیپوکلسمی → اورژانس
//      «Total Bilirubin 17» (طبیعی، µmol/L)   → اورژانس
//      «Troponin I 8» (طبیعی، ng/L)           → «همین حالا به اورژانس»
//      «FBS 15» (بالا، mmol/L)                → «قند شما *پایین* است» — جهتِ وارونه
//      «Cholesterol 8» (بالا، mmol/L)         → هیچ یافته‌ای — سکوت
//
// زنجیرهٔ شواهد، اولین قاطع برنده (research R3):
//   ۱) واحدِ چاپ‌شدهٔ شناخته‌شده  → رفتارِ امروز، دست‌نخورده (این تابع اصلاً صدا زده نمی‌شود)
//   ۲) محدودهٔ مرجعِ چاپ‌شده روی همان ردیف
//   ۳) اندازهٔ عدد — فقط با `plausible`ِ تأییدشده در P48 (مرحلهٔ ب؛ تا آن زمان null)
//   ۴) نامعلوم → بی‌قضاوت؛ مالک: unit_unknown_values
// ⚠️ این تابع هیچ‌وقت `tests` را نمی‌نویسد — فقط تصمیم می‌گیرد؛ adapter اعمالش می‌کند.
// منبع: LOINC (دو کدِ جرم/مول برای هر آنالیت، از API عمومیِ NLM)، املای UCUM، و ضریب‌های
//       SI_CONVERSIONS که با جدولِ AMA سنجیده شده‌اند (guidelines.js → AMA_SI_UNITS).


// املاهای رایجِ واحدِ متعارف روی برگه‌ها (پس از normUnit). ng/L = pg/mL و µg/L = ng/mL عیناً برابرند.
const CONV_ALIASES = {
  'mg/dL':  ['mg/dl', 'mg%', 'mgr/dl', 'mgr%', 'mg/100ml', 'mg/deciliter'],
  'g/dL':   ['g/dl', 'gr/dl', 'gm/dl', 'g%', 'gr%', 'g/100ml'],
  'µg/dL':  ['µg/dl', 'μg/dl', 'ug/dl', 'mcg/dl', 'µg%', 'mcg%'],
  'ng/mL':  ['ng/ml', 'µg/l', 'μg/l', 'ug/l', 'mcg/l'],
  'pg/mL':  ['pg/ml', 'ng/l'],
  'ng/dL':  ['ng/dl'],
  'mg/24h': ['mg/24h', 'mg/24hr', 'mg/24hrs', 'mg/d', 'mg/day'],
  'µg/24h': ['µg/24h', 'μg/24h', 'ug/24h', 'mcg/24h', 'µg/24hr', 'ug/24hr', 'mcg/24hr', 'µg/d', 'ug/d', 'mcg/d', 'µg/day', 'μg/day', 'ug/day', 'mcg/day'],
};

// کلیدهایی که تبدیلشان در شاخهٔ اختصاصیِ adapter است (نه SI_CONVERSIONS). ضریب اینجا *یک‌بار*
// نوشته می‌شود و هم شاخهٔ adapter و هم UNIT_PROFILE از همین می‌خوانند («یک عدد، یک کار»).
export const BRANCH_FACTORS = {
  TROPONIN_NGL_TO_UGL: 0.001,   // ۱ ng/L = ۰.۰۰۱ µg/L (تعریفِ واحد)
  T3_NMOL_TO_NGDL: 65.1,        // جرمِ مولیِ T3 ≈ ۶۵۱ g/mol
  CRP_MGDL_TO_MGL: 10,          // تعریفِ واحد
  ACR_MGMMOL_TO_MGG: 8.84,      // جرمِ مولیِ کراتینین ۱۱۳.۱۲ g/mol
  TESTO_NGML_TO_NGDL: 100,      // تعریفِ واحد
};

// کدهای LOINC — بررسی‌شده با https://clinicaltables.nlm.nih.gov/api/loinc_items/v3/search (۱۴۰۵/۰۶/۲۸).
// `mass` = [Mass/volume] (واحدِ متعارف)، `substance` = [Moles/volume] (SI). null = آن آنالیت
// واحدِ مولیِ رایج ندارد و هر دو واحدش جرمی‌اند (توضیح در `note`).
const LOINC = {
  GLU: { mass: '2345-7', substance: '14749-6' }, CHOL: { mass: '2093-3', substance: '14647-2' },
  HDL: { mass: '2085-9', substance: '14646-4' }, LDL: { mass: '2089-1', substance: '22748-8' },
  TG: { mass: '2571-8', substance: '14927-8' }, CREAT: { mass: '2160-0', substance: '14682-9' },
  UREA: { mass: '3091-6', substance: '22664-7' }, UREA_N: { mass: '3094-0', substance: '14937-7' },
  URIC: { mass: '3084-1', substance: '14933-6' }, CA: { mass: '17861-6', substance: '2000-8' },
  MG: { mass: '19123-9', substance: '2601-3' }, PHOS: { mass: '2777-1', substance: '14879-1' },
  U_CA: { mass: '18488-7', substance: '25362-5' }, BILI_T: { mass: '1975-2', substance: '14631-6' },
  BILI_D: { mass: '1968-7', substance: '14629-0' }, BILI_I: { mass: '1971-1', substance: '14630-8' },
  ALB: { mass: '1751-7', substance: '54347-0' }, TP: { mass: '2885-2', substance: null, note: 'g/dL و g/L هر دو جرمی‌اند' },
  HGB: { mass: '718-7', substance: '59260-0' }, IRON: { mass: '2498-4', substance: '14798-3' },
  TIBC: { mass: '2500-7', substance: '14800-7' }, B12: { mass: '2132-9', substance: '14685-2' },
  FOLATE: { mass: '2284-8', substance: '14732-2' }, VIT_D: { mass: '62292-8', substance: '68438-1' },
  T4: { mass: '3026-2', substance: '14921-1' }, FT4: { mass: '3024-7', substance: '14920-3' },
  FT3: { mass: '3051-0', substance: '14928-6' }, T3: { mass: '3053-6', substance: '14930-2' },
  CORTISOL: { mass: '2143-6', substance: '14675-3' }, UFC: { mass: '2147-7', substance: '14676-1' },
  ACTH: { mass: '2141-0', substance: '14674-6' }, TESTO: { mass: '2986-8', substance: '14913-8' },
  E2: { mass: '2243-4', substance: '14715-7' }, PROG: { mass: '2839-9', substance: '14890-8' },
  OHP17: { mass: '1668-3', substance: '14569-8' }, DHEAS: { mass: '2191-5', substance: '14688-6' },
  TROPONIN_I: { mass: '10839-9', substance: null, hs: '89579-7', note: 'µg/L و ng/L هر دو جرمی‌اند؛ ng/L کدِ hs دارد' },
  CRP_Q: { mass: '1988-5', substance: null, note: 'mg/L و mg/dL هر دو جرمی‌اند' },
  ACR: { mass: '9318-7', substance: null, note: 'mg/g و mg/mmol؛ کدِ mg/mmol در API یافت نشد' },
};
const LOINC_FAMILY = {
  GLU_F: 'GLU', GLU_2H: 'GLU', GLU_RANDOM: 'GLU', CORTISOL_AM: 'CORTISOL', CORTISOL_DST: 'CORTISOL',
  CORTISOL_SAL: 'CORTISOL', E2_D3: 'E2', PROG_D21: 'PROG',
};

/** نخستین املای یک regexِ SI، به‌عنوانِ واحدِ «چاپ‌شده»ای که adapter بشناسد. */
function canonicalFromRe(re) {
  let s = re.source.replace(/^\^/, '').replace(/\$$/, '');
  s = s.replace(/^\((.*)\)$/, '$1').split('|')[0];
  s = s.replace(/^\(/, '').replace(/\[([^\]])[^\]]*\]/g, '$1').replace(/\\\//g, '/');
  return s;
}

function sys(id, unit, factor, match) {
  return { id, unit, factor, match };
}
const aliasMatcher = (conv) => {
  const list = CONV_ALIASES[conv];
  if (!list) throw new Error(`CONV_ALIASES برای ${conv} نیست`);
  return (u) => list.includes(u);
};

/**
 * برای هر کلیدِ دو‌سیستمی: سیستم‌های واحد (نخستین = متعارف، factor = ۱)، کدهای LOINC، و `plausible`.
 * ⚠️ `plausible` = حدودِ ممکنِ فیزیولوژیک به واحدِ متعارف — عددِ بالینی است و فقط پس از تأییدِ P48
 *    پر می‌شود (مرحلهٔ ب). null یعنی گامِ ۳ (اندازه) برای آن کلید خاموش است.
 */
export const UNIT_PROFILE = {};
for (const [key, r] of Object.entries(SI_CONVERSIONS)) {
  UNIT_PROFILE[key] = {
    key,
    systems: [
      sys('conv', r.conv, 1, aliasMatcher(r.conv)),
      sys('si', r.siUnit ?? canonicalFromRe(r.si), r.factor, (u) => r.si.test(u)),
    ],
    loinc: LOINC[LOINC_FAMILY[key] ?? key],
    plausible: null,
  };
}
// P96 (تصمیمِ کاربر/بازبین، ۲۰۲۶-۱۰-۰۶): گامِ «اندازه» فقط برای کلسیم و کراتینین روشن شد. `plausible` = بازهٔ باورپذیرِ بالینی به واحدِ
//   متعارف؛ سیستمی انتخاب می‌شود که *تنها* آن سیستم عدد را داخلِ این بازه ببرد (دو سیستم ⇒ تعیین‌نشده). مرزها از SURVIVAL/DECIDE جدا و
//   عمداً تنگ‌ترند: Ca ۴٫۵–۱۶ mg/dL ⇒ «۱۱» فقط mg/dL (۴۴ mg/dL ناممکن) و «۲٫۴» فقط mmol/L (۲٫۴ mg/dL ناممکن)؛ «۳٫۵–۴» تعیین‌نشده می‌ماند.
//   CREAT ۰٫۲–۲۰ mg/dL ⇒ «۸۴» فقط µmol/L (۰٫۹۵)، «۰٫۹» فقط mg/dL؛ «۱۷٫۷–۲۰» دو خوانش دارد ⇒ تعیین‌نشده. دیگران خاموش‌اند.
UNIT_PROFILE.CA.plausible = [4.5, 16];
// سقفِ جدا برای خوانشِ mmol/L: «۳٫۸» اگر mmol/L باشد ۱۵٫۲ mg/dL (بحرانِ هیپرکلسمی) و اگر mg/dL باشد ۳٫۸ (هیپوکلسمیِ تقریباً کشنده) است؛
//   هر دو اورژانس ولی جهتشان وارون است ⇒ تعیین نمی‌کنیم. mmol/L فقط تا ۳٫۳۷ (≈ ۱۳٫۵ mg/dL) تعیین می‌شود.
UNIT_PROFILE.CA.plausibleSi = [4.5, 13.5];
UNIT_PROFILE.CREAT.plausible = [0.2, 20];
/** بیلی‌روبینِ تام: گامِ اندازه فقط برای نوزادِ زیرِ یک ماه (mg/dL ≥ ۲ و ≤ ۴۰؛ µmol/L معادلِ زیرِ ۲ mg/dL بعد از تولد غیرمحتمل است). */
export const NEONATAL_BILI_PLAUSIBLE = [2, 40];
UNIT_PROFILE.TESTO.systems.push(sys('ng/mL', 'ng/ml', BRANCH_FACTORS.TESTO_NGML_TO_NGDL, (u) => u === 'ng/ml'));
// شاخه‌های اختصاصی: واحدِ «متعارف» همان است که refs.js می‌خواهد.
UNIT_PROFILE.TROPONIN_I = { key: 'TROPONIN_I', loinc: LOINC.TROPONIN_I, plausible: null, systems: [
  sys('conv', 'µg/l', 1, (u) => ['ng/ml', 'µg/l', 'μg/l', 'ug/l', 'mcg/l'].includes(u)),
  sys('ng/L', 'ng/l', BRANCH_FACTORS.TROPONIN_NGL_TO_UGL, (u) => u === 'ng/l' || u === 'pg/ml'),
] };
UNIT_PROFILE.T3 = { key: 'T3', loinc: LOINC.T3, plausible: null, systems: [
  sys('conv', 'ng/dl', 1, (u) => u === 'ng/dl'),
  sys('si', 'nmol/l', BRANCH_FACTORS.T3_NMOL_TO_NGDL, (u) => /nmol/.test(u)),
  // ۲۰۲۶-۱۰-۱۶ (N3): کیت‌های رایجِ ایران T3ِ تام را ng/mL چاپ می‌کنند (بازهٔ «0.52–1.85»). بی این سیستم «T3 1.2» با بازهٔ «0.52-2.1»
  //   nmol/L تعیین و ۷۸ ng/dL «پایین» خوانده می‌شد (درستش ۱۲۰، وسطِ بازه). ng/mL و nmol/L فقط ×۱.۵۴ فاصله دارند ⇒ محدودهٔ چاپ‌شده
  //   دیگر بینِ آن‌ها تمایز نمی‌دهد (R4) و عددِ بی‌واحد «واحد نامعلوم» می‌ماند، نه یک حدس.
  sys('ng/mL', 'ng/ml', BRANCH_FACTORS.TESTO_NGML_TO_NGDL, (u) => u === 'ng/ml'),
] };
UNIT_PROFILE.CRP_Q = { key: 'CRP_Q', loinc: LOINC.CRP_Q, plausible: null, systems: [
  sys('conv', 'mg/l', 1, (u) => ['mg/l', 'µg/ml', 'ug/ml', 'mcg/ml'].includes(u)),
  sys('mg/dL', 'mg/dl', BRANCH_FACTORS.CRP_MGDL_TO_MGL, (u) => CONV_ALIASES['mg/dL'].includes(u)),
] };
UNIT_PROFILE.ACR = { key: 'ACR', loinc: LOINC.ACR, plausible: null, systems: [
  sys('conv', 'mg/g', 1, (u) => /^(mg\/g|[µμu]g\/mg|mcg\/mg)(cr|creat|creatinine)?$/.test(u)),
  sys('mg/mmol', 'mg/mmol', BRANCH_FACTORS.ACR_MGMMOL_TO_MGG, (u) => /mmol/.test(u)),
] };

/** نسبتِ نزدیک‌ترین دو سیستمِ یک کلید — زیرِ ۲.۲۵ یعنی محدودهٔ چاپ‌شده نمی‌تواند تمایز دهد (R4). */
export function minSystemRatio(key) {
  const f = UNIT_PROFILE[key].systems.map((s) => s.factor);
  let m = Infinity;
  for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++) {
    m = Math.min(m, Math.max(f[i], f[j]) / Math.min(f[i], f[j]));
  }
  return m;
}
/** نسبتِ یک سیستم تا نزدیک‌ترین سیستمِ دیگرِ همان کلید. T3 (۲۰۲۶-۱۰-۱۶): ng/dL از هر دو دور است ولی nmol/L و ng/mL فقط ×۱.۵۴. */
export function systemRatio(key, s) {
  let m = Infinity;
  for (const o of UNIT_PROFILE[key].systems) if (o !== s) m = Math.min(m, Math.max(o.factor, s.factor) / Math.min(o.factor, s.factor));
  return m;
}
export const REFERENCE_DECISIVE_RATIO = 1.5;   // ریاضی، نه بالینی: √۲.۲۵ (research R4)

/** آیا واحدِ چاپ‌شده یکی از سیستم‌های این کلید است؟ (اگر آری، adapter همان راهِ امروز را می‌رود) */
export function recognizedUnit(key, unit) {
  const p = UNIT_PROFILE[key];
  const u = normUnit(unit);
  if (!p || !u) return null;
  return p.systems.find((s) => s.match(u)) ?? null;
}

const FA_DIGITS = { '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9', '٫': '.' };

const N = '(\\d+(?:\\.\\d+)?)';
const RANGE_RE = new RegExp(`^${N}\\s*(?:-|–|—|to|تا)\\s*${N}\\D*$`);
const UPPER_RE = new RegExp(`^(?:<|≤|<=)\\s*${N}\\D*$`);
const LOWER_RE = new RegExp(`^(?:>|≥|>=)\\s*${N}\\D*$`);

/** یک قطعهٔ تمیز (بدونِ برچسبِ جنس) → {lo, hi} یا null. */
function parseSegment(seg) {
  const s = seg
    // P110-ج (برگهٔ واقعی ۲۰۲۶-۱۰-۱۶): «Up to: 6» با دونقطه null می‌شد ⇒ CRPِ ۵ کنارِ «Up to: 6» «ممکن است خارج از محدوده» می‌خواند.
    .replace(/(up\s*to|less\s*than|کمتر\s*از)\s*:?/g, '<').replace(/(more\s*than|greater\s*than|بیشتر\s*از)\s*:?/g, '>')
    .replace(/[()[\]]/g, ' ').replace(/^[^\d<>≤≥]+/, '').trim();
  let m;
  if ((m = s.match(RANGE_RE))) { const lo = +m[1], hi = +m[2]; return lo < hi ? { lo, hi } : null; }
  if ((m = s.match(UPPER_RE))) return { lo: null, hi: +m[1] };
  if ((m = s.match(LOWER_RE))) return { lo: +m[1], hi: null };
  return null;
}

function asciiRef(str) {
  return String(str).replace(/[۰-۹٠-٩٫]/g, (c) => FA_DIGITS[c])
    // «1,000-5,000»: کامای پیش از دقیقاً سه رقم جداکنندهٔ هزارگان است، نه ممیز (پیش‌تر {lo:1, hi:5} می‌شد).
    .replace(/(\d),(\d{3})(?!\d)/g, '$1$2')
    .replace(/,/g, '.').trim().toLowerCase();
}

/**
 * محدودهٔ مرجعِ چاپ‌شده → {lo, hi} یا null. فقط قالب‌های بی‌ابهام؛ هر چیزِ دیگر «شاهد نیست».
 * پوشش: «0.6-1.2»، «<200»، «(13.5-17.5)»، «Desirable:<200»، «0.6-1.2 mg/dL» و خطِ دوجنسی
 * («M: 0.7-1.3 F: 0.6-1.1»): با جنسِ معلوم همان جنس، وگرنه پوششِ هر دو (کمینهٔ lo، بیشینهٔ hi).
 */
export function parseReference(str, sex = null) {
  if (str == null) return null;
  const s = asciiRef(str);
  if (!s) return null;
  const parts = s.split(/(male|female|(?<![a-z])[mf](?![a-z])|مرد|زن)/);
  if (parts.length > 1) {
    // برچسب *بعد* از عدد («13-17 (M) 12-15 (F)») یا برچسبِ سوم («Child»): جفت‌کردنِ برچسب و بازه مبهم است —
    // پیش‌تر به مردِ بیمار بازهٔ زن را می‌داد (بازبینی). شاهد نیست.
    if (/\d/.test(parts[0]) || /child|kid|کودک|نوزاد|infant|newborn/.test(s)) return null;
    const bySex = {};
    for (let i = 1; i < parts.length; i += 2) {
      const seg = parseSegment(parts[i + 1].replace(/^[\s:：-]+/, ''));
      if (!seg) return null;
      bySex[/^(m|male|مرد)$/.test(parts[i]) ? 'M' : 'F'] = seg;
    }
    if (sex && bySex[sex]) return bySex[sex];
    // خطی که فقط جنسِ *دیگر* را دارد، بازهٔ این بیمار نیست.
    if (sex && Object.keys(bySex).length === 1) return null;
    const all = Object.values(bySex);
    if (all.length === 0) return null;
    const los = all.map((r) => r.lo).filter((v) => v != null), his = all.map((r) => r.hi).filter((v) => v != null);
    return { lo: los.length === all.length ? Math.min(...los) : null, hi: his.length === all.length ? Math.max(...his) : null };
  }
  return parseSegment(s);
}

/**
 * واحدِ نوشته‌شده *داخلِ* ستونِ مرجع («0.6-1.2 mg/dL») — اگر یکی از سیستم‌های این کلید باشد، همان است.
 * این خودِ واحدِ چاپ‌شده است، فقط در ستونِ دیگر.
 */
export function unitInReference(key, reference) {
  if (reference == null || !UNIT_PROFILE[key]) return null;
  const tokens = asciiRef(reference).match(/[a-zµμ%]{1,5}\/[a-zµμ0-9]{1,10}/g) ?? [];
  const found = new Map();
  for (const t of tokens) {
    const sysMatch = recognizedUnit(key, t);
    if (sysMatch) found.set(sysMatch.id, sysMatch);
  }
  // 🔴 بازبینیِ کد: «0.6-1.2 mg/dL (53-106 µmol/L)» — برگه‌های SI هر دو واحد را در ستونِ مرجع می‌نویسند. نخستین
  //    واحد برنده می‌شد و «Creatinine 80» (µmol/L، طبیعی) ۸۰ mg/dL و اورژانس می‌شد — همان کلاسی که specs/003 بست.
  //    دو سیستم در یک مرجع ⇒ شاهد نیست.
  return found.size === 1 ? [...found.values()][0] : null;
}

/** عدد نسبت به محدودهٔ چاپ‌شدهٔ همان ردیف: 'above' | 'below' | 'within' | null. واحدش هرچه باشد، عدد و محدوده یکی است. */
export function printedVerdict(reference, value, sex = null) {
  const r = parseReference(reference, sex);
  if (!r || value == null || !Number.isFinite(value)) return null;
  if (r.hi != null && value > r.hi) return 'above';
  if (r.lo != null && value < r.lo) return 'below';
  return 'within';
}

/**
 * یک نقطهٔ نمایندهٔ قابلِ مقایسه از دو محدوده: کرانِ *بالا* (پایدار)، وگرنه کرانِ پایین.
 * ⚠️ میانهٔ هندسی پیش‌تر بود و ناپایدار است: «0.3-1.2» (بیلی‌روبینِ رایج) با پایینِ نزدیکِ صفر
 *    ×۱.۷ از بازهٔ موتور دور می‌افتاد و واحدش «نامعلوم» می‌شد (بازبینیِ پزشکی، B2).
 */
function comparablePoints(printed, band) {
  const [blo, bhi] = band;
  if (printed.hi > 0 && bhi > 0) return [printed.hi, bhi];
  if (printed.lo > 0 && blo > 0) return [printed.lo, blo];
  return null;
}

/**
 * حدودِ ممکنِ فیزیولوژیک به واحدِ متعارف — فقط برای *اینکه یک خوانش غیرممکن است یا نه* (فوریتِ
 * unit_unknown_values و پذیرفتنِ محدودهٔ چاپ‌شده)، نه برای تعیینِ واحد. گامِ «اندازه» هنوز خاموش است
 * (`plausible: null`، P48). مرزها پیشنهادِ P48 با اصلاحِ بازبین‌اند (دو دور): GLU ۱–۳۰۰۰، CREAT بالا ۴۰،
 * BILI_T بالا ۶۰، UREA ۷۰۰، UREA_N ۳۳۰، CA ۲۵، MG ۲۵، IRON ۳۰۰۰، VIT_D ۱۰۰۰؛ تروپونین/CRP/ACR/T3 عمداً نیستند.
 * ⚠️ خطای این جدول *دو* سمت دارد (بازبینی B8؛ پیش‌تر این توضیح «یک سمت» می‌گفت و غلط بود): مرزِ بالای
 *    تنگ، یک مقدارِ واقعاً بحرانی (اورهٔ ۴۵۰) را «ناممکن، شاید غلطِ خوانش» می‌کند و اورژانسش را می‌گیرد.
 *    پس مرزِ بالا باید از بالاترین مقدارِ *گزارش‌شده* رد شود، نه از «معمول».
 */
export const SURVIVAL_LIMITS = {
  GLU_F: [1, 3000], GLU_2H: [1, 3000], GLU_RANDOM: [1, 3000],
  CHOL: [50, 1000], HDL: [5, 150], LDL: [10, 600], TG: [20, 10000],
  CREAT: [0.1, 40], UREA: [5, 700], UREA_N: [2, 330], URIC: [0.5, 25],
  CA: [3, 25], MG: [0.5, 25], PHOS: [0.5, 20], U_CA: [5, 1000],
  BILI_T: [0.1, 60], BILI_D: [0.05, 40], BILI_I: [0.05, 40],
  ALB: [0.5, 7], TP: [2, 15], HGB: [2, 25],
  IRON: [5, 3000], TIBC: [100, 1000], B12: [50, 5000], FOLATE: [0.5, 40], VIT_D: [2, 1000],
  T4: [0.5, 30], FT4: [0.1, 10], FT3: [1, 30],
  CORTISOL_AM: [0.5, 100], CORTISOL: [0.5, 100], CORTISOL_DST: [0.2, 100], CORTISOL_SAL: [0.02, 10],
  UFC: [1, 5000], ACTH: [1, 2000], TESTO: [1, 3000], E2: [5, 5000], E2_D3: [5, 5000],
  PROG: [0.1, 300], PROG_D21: [0.1, 300], OHP17: [0.1, 300], DHEAS: [5, 2000],
};

/**
 * مرزِ «باورپذیر» برای *تعیینِ* واحد از محدودهٔ چاپ‌شده — تنگ‌تر از SURVIVAL_LIMITS، و عمداً جدا از آن.
 * دو پرسشِ متفاوت‌اند و یک جدول نمی‌تواند به هر دو جواب دهد (همان «یک عدد، دو کار»ِ N23):
 *   • SURVIVAL: «آیا این خوانش را می‌شود کنار گذاشت؟» — باید گشاد باشد، وگرنه اورهٔ ۴۵۰ِ واقعی گم می‌شود (B8).
 *   • DECIDE:   «آیا محدودهٔ چاپ‌شده را باور کنیم وقتی عدد را به این اندازه می‌رساند؟» — باید تنگ باشد، وگرنه
 *               «FBS 95» کنارِ «4-5.6»ِ HbA1c (محدودهٔ ردیفِ کناری) ۱۷۱۲ mg/dL و اورژانس می‌شود (B7).
 * خطای DECIDE امن است: عددِ بیرون از آن «تعیین‌نشده» می‌ماند و مسیرِ خوانش‌ها (با SURVIVAL) فوریت را می‌دهد.
 * مقادیر = «حدودِ ممکنِ» پیشنهادیِ P48 با اصلاحِ دورِ اولِ بازبین (قند پایین ۱، کراتینین ۴۰، بیلی‌روبین ۶۰).
 */
const DECIDE_LIMITS = {
  GLU_F: [1, 1500], GLU_2H: [1, 1500], GLU_RANDOM: [1, 1500],
  UREA: [5, 400], UREA_N: [2, 200], CA: [3, 20], MG: [0.5, 10], IRON: [5, 1000], VIT_D: [2, 200],
};

/** آیا مقدارِ متعارفِ `conv` برای این کلید ممکن است؟ (کلیدِ بی‌حد ⇒ بله) `strict` = مرزِ DECIDE. */
export function possibleConv(key, conv, strict = false) {
  const lim = (strict && DECIDE_LIMITS[key]) || SURVIVAL_LIMITS[key];
  return !lim || (conv >= lim[0] && conv <= lim[1]);
}

/** آیا محدودهٔ چاپ‌شده با بازهٔ موتور در دست‌کم یک سیستمِ واحد هم‌خانواده است (≤ ×۳)؟ — محدودهٔ ردیفِ کناری نیست. */
export const PRINTED_RANGE_FIT_RATIO = 3;
export function printedRangeFits(key, printed, band) {
  const p = UNIT_PROFILE[key];
  if (!p || !printed || !band) return false;
  return p.systems.some((s) => {
    const b = [band[0] == null ? null : band[0] / s.factor, band[1] == null ? null : band[1] / s.factor];
    const pts = comparablePoints(printed, b);
    return pts && Math.abs(Math.log(pts[0] / pts[1])) <= Math.log(PRINTED_RANGE_FIT_RATIO);
  });
}

/**
 * P107 (بازبینیِ Opus، H1): واحدِ چاپ‌شدهٔ دوم (EXTRA_PRINTED_UNITS) را محدودهٔ چاپ‌شدهٔ همان ردیف رد می‌کند؟
 * «Calcium 9.6 mEq/L، ref 8.5-10.5»: محدوده mg/dL است نه mEq/L؛ تبدیل ×۲ عددِ طبیعی را اورژانس می‌کرد (کلاسِ B7).
 * فقط وقتی محدوده خوانده و قابل‌مقایسه باشد و با بازهٔ موتور در آن واحد بیش از ×۳ فاصله داشته باشد «ردشده» است.
 */
export function extraUnitContradicted(key, unit, reference, sex, age) {
  const u0 = normUnit(unit);
  const alt = u0 && (EXTRA_PRINTED_UNITS[key] ?? []).find(([re]) => re.test(u0));
  if (!alt) return false;
  const printed = parseReference(reference, sex);
  const band = getRef(key, sex, age ?? 40);
  if (!printed || !band) return false;
  // محدوده به کدام بازه نزدیک‌تر است: بازهٔ متعارفِ موتور (واحدِ اصلی) یا همان بازه در واحدِ چاپ‌شده؟
  const dist = (div) => {
    const b = [band[0] == null ? null : band[0] / div, band[1] == null ? null : band[1] / div];
    const pts = comparablePoints(printed, b);
    return pts ? Math.abs(Math.log(pts[0] / pts[1])) : null;
  };
  const asConventional = dist(1), asPrinted = dist(alt[1]);
  return asConventional != null && asPrinted != null && asConventional < asPrinted;
}

/**
 * تصمیمِ واحد برای یک ردیفِ عددیِ بدونِ واحدِ شناخته‌شده. تابعِ خالص.
 * @returns {{system: object|null, basis: 'reference'|'magnitude'|null, detail: string|null}}
 */
export function decideUnit(key, value, reference, sex, age) {
  const p = UNIT_PROFILE[key];
  if (!p || value == null || !Number.isFinite(value)) return { system: null, basis: null, detail: null };
  // 🔴 بازبینی B7: «FBS 95» کنارِ «4-5.6»ِ HbA1c (محدودهٔ ردیفِ کناری) mmol/L تعیین می‌شد ⇒ ۱۷۱۲ mg/dL ⇒
  //    hhs_pattern اورژانس. سیستمی که عدد را ناممکن می‌کند هرگز انتخاب نمی‌شود.
  const plausible = key === 'BILI_T' ? (age != null && age < 1 / 12 ? NEONATAL_BILI_PLAUSIBLE : null) : p.plausible;
  const inPlausible = (s) => {
    const pl = s !== p.systems[0] && p.plausibleSi && plausible ? p.plausibleSi : plausible;
    return possibleConv(key, value * s.factor, true) && (!pl || (value * s.factor >= pl[0] && value * s.factor <= pl[1]));
  };

  // ۲-الف) واحد داخلِ ستونِ مرجع («0.6-1.2 mg/dL») — خودِ واحدِ چاپ‌شده
  const inRef = unitInReference(key, reference);
  if (inRef) return { system: inRef, basis: 'reference', detail: String(reference) };

  // ۲) محدودهٔ چاپ‌شده — فقط وقتی سیستم‌ها به‌قدرِ کافی از هم دورند (B12 و FT3 نه؛ R4)
  // ⚠️ نوزاد: بازهٔ موتور برای بیلی‌روبینِ نوزاد بازهٔ نوزادی نیست؛ مقایسه با آن ×۱.۳۷ «µmol/L» را
  //    برمی‌گزید و «۱۴ mg/dL» به «۰.۸۲ mg/dL، طبیعی» تبدیل می‌شد (بازبینی، B1). تعیین نمی‌کنیم.
  const bandMismatch = /^BILI_/.test(key) && age != null && age < 1;
  const printed = parseReference(reference, sex);
  const band = getRef(key, sex, age ?? 40);
  // ۲۰۲۶-۱۰-۱۶: دروازه برای *هر سیستمِ نامزد* است، نه کلِ کلید — برای کلیدِ دوسیستمی همان minSystemRatio است (رفتار یکی)؛
  //   برای T3 «80-200» هنوز ng/dL تعیین می‌شود ولی «0.52-2.1» (nmol/L یا ng/mL؟) تعیین‌نشده می‌ماند.
  if (printed && band && !bandMismatch) {
    const L = Math.log(REFERENCE_DECISIVE_RATIO);
    // بازهٔ موتور در هر سیستم = بازهٔ متعارف ÷ ضریب
    const near = p.systems.filter((s) => {
      const b = [band[0] == null ? null : band[0] / s.factor, band[1] == null ? null : band[1] / s.factor];
      const pts = comparablePoints(printed, b);
      return pts && Math.abs(Math.log(pts[0] / pts[1])) < L;
    });
    if (near.length === 1 && systemRatio(key, near[0]) >= REFERENCE_DECISIVE_RATIO ** 2) {
      return inPlausible(near[0])
        ? { system: near[0], basis: 'reference', detail: String(reference) }
        : { system: null, basis: null, detail: `ناسازگار: ${reference}` };
    }
  }

  // ۳) اندازه — فقط با plausibleِ تأییدشده، و فقط وقتی دقیقاً یک سیستم عدد را ممکن بداند
  if (plausible) {
    const ok = p.systems.filter(inPlausible);
    if (ok.length === 1) return { system: ok[0], basis: 'magnitude', detail: null };
  }
  return { system: null, basis: null, detail: null };
}

/** حکمِ «طبیعی/غیرطبیعی» برای عددِ نامعلوم در هر سیستم — برای فوریتِ unit_unknown_values (R7). */
export function verdictsAcrossSystems(key, value, sex, age) {
  const p = UNIT_PROFILE[key];
  const band = getRef(key, sex, age ?? 40);
  if (!p || !band) return null;
  return p.systems.map((s) => {
    const v = value * s.factor;
    const low = band[0] != null && v < band[0];
    const high = band[1] != null && v > band[1];
    return low || high ? 'abnormal' : 'normal';
  });
}

/**
 * هر خوانشِ ممکنِ عدد: مقدار به واحدِ متعارف (`conv`)، حکمِ بازه، و اینکه آن خوانش *غیرممکن* است یا نه.
 * adapter فوریتِ هر خوانش را از خودِ موتور می‌گیرد؛ کمینه‌شان فوریتِ یافته است (بازبینی، B3).
 */
export function readingsAcrossSystems(key, value, sex, age) {
  const p = UNIT_PROFILE[key];
  if (!p || value == null || !Number.isFinite(value)) return null;
  const band = getRef(key, sex, age ?? 40);
  const lim = SURVIVAL_LIMITS[key];
  return p.systems.map((s) => {
    const conv = value * s.factor;
    // ۲۰۲۶-۱۰-۰۵ (P88): جهت هم برگردانده می‌شود — «پایین با یک واحد، بالا با دیگری» دو حکمِ متفاوت است، نه «غیرطبیعی با هر دو».
    const dir = !band ? null : band[0] != null && conv < band[0] ? 'low' : band[1] != null && conv > band[1] ? 'high' : null;
    const verdict = dir ? 'abnormal' : 'normal';
    const impossible = !!lim && (conv < lim[0] || conv > lim[1]);
    return { id: s.id, unit: s.unit, conv, verdict, dir, impossible };
  });
}
