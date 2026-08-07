// ============================================================
// LabMate — دفترِ منابع (Guideline Registry)
//
// چرا این فایل هست:
//   تا امروز منبعِ هر آستانه به‌صورت کامنت کنارِ عدد نوشته می‌شد
//   («ADA»، «KDIGO 2024»، «ACG»). کامنت نه قابلِ تست است، نه به بیمار
//   می‌رسد، و نه وقتی یک عدد عوض می‌شود کسی می‌فهمد منبعش هم باید عوض شود.
//   اینجا هر منبع یک شناسه دارد؛ آستانه‌ها و الگوها به شناسه ارجاع می‌دهند
//   و تست M36 تضمین می‌کند هیچ ارجاعِ بی‌مرجعی در موتور نماند.
//
// ⚠️ قاعدهٔ افزودن: فقط منبعی که واقعاً خوانده شده و عددش در کد نشسته.
//   منبعِ تزئینی نگذار — این فهرست به بیمار نشان داده می‌شود.
//
// ⚠️ دسترسی: `access: 'paywalled'` یعنی متنِ کامل پولی است و ما عدد را از
//   آن استخراج *نکرده‌ایم*؛ معادلِ آزادش (که در `substitutedBy` آمده) مبناست.
//   این را صادقانه نگه دار — «طبق UpToDate» گفتن بدون خواندنش، جعلِ منبع است.
// ============================================================

export const GUIDELINES = {
  // ---- استانداردهای آزمایشگاهی ----
  CLSI: {
    org: 'CLSI',
    fa: 'مؤسسهٔ استانداردهای بالینی و آزمایشگاهی',
    title: 'Clinical & Laboratory Standards Institute — pre/post-analytical standards (EP07, GP41, GP44, C24)',
    year: 2024,
    url: 'https://clsi.org/',
    access: 'paywalled',
    // اسنادِ CLSI فروشی‌اند. آنچه در موتور نشسته، اصولِ منتشرشده و
    // داده‌های همتاداوری‌شدهٔ تداخلِ همولیز است، نه متنِ خودِ استاندارد.
    substitutedBy: 'Lippi et al., Biochemia Medica 2011;21(1):79-85 — تداخل همولیز بر پارامترهای بیوشیمی',
    substitutedUrl: 'https://www.biochemia-medica.com/en/journal/21/1/10.11613/BM.2011.015/fullArticle',
    scope: 'پیش‌تحلیلی: همولیز، ناشتایی، استاز، ضدانعقاد نامناسب',
  },

  IFCC: {
    org: 'IFCC',
    fa: 'فدراسیون بین‌المللی شیمی بالینی',
    title: 'IFCC reference measurement system for HbA1c + IFCC/NGSP master equation',
    year: 2011,
    url: 'https://ngsp.org/ifccngsp.asp',
    access: 'open',
    scope: 'استانداردسازی واحدها؛ HbA1c بر حسب mmol/mol در برابر ٪NGSP',
  },

  EFLM_BV: {
    org: 'EFLM',
    fa: 'فدراسیون اروپایی شیمی بالینی و طب آزمایشگاهی',
    title: 'EFLM Biological Variation Database',
    year: 2026,
    url: 'https://biologicalvariation.eu/',
    access: 'open',
    scope: 'تغییرپذیری زیستی درون‌فردی/بین‌فردی (CVi/CVg)، RCV، شاخص فردیت',
  },

  ADLM: {
    org: 'ADLM (AACC)',
    fa: 'انجمن طب آزمایشگاهی و تشخیصی',
    title: 'ADLM/AACC laboratory test interpretation resources',
    year: 2024,
    url: 'https://www.myadlm.org/',
    access: 'open',
    scope: 'الگوریتم‌های تفسیریِ آزمایشگاهی (از جمله نسبت R در آسیب کبدی)',
  },

  // ---- گایدلاین‌های بالینی ----
  WHO_ANAEMIA: {
    org: 'WHO',
    fa: 'سازمان جهانی بهداشت',
    title: 'Guideline on haemoglobin cutoffs to define anaemia in individuals and populations',
    year: 2024,
    url: 'https://www.ncbi.nlm.nih.gov/books/NBK602198/',
    access: 'open',
    scope: 'نقاط برشِ هموگلوبین برای تعریف کم‌خونی و شدت آن',
  },

  WHO_FERRITIN: {
    org: 'WHO',
    fa: 'سازمان جهانی بهداشت',
    title: 'WHO guideline on use of ferritin concentrations to assess iron status',
    year: 2020,
    url: 'https://www.ncbi.nlm.nih.gov/books/NBK569877/',
    access: 'open',
    scope: 'آستانهٔ فریتین برای کمبود آهن، و آستانهٔ جداگانه در حضور التهاب',
  },

  KDIGO_CKD: {
    org: 'KDIGO',
    fa: 'ابتکار جهانی بهبود پیامد بیماری کلیه',
    title: 'KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of CKD',
    year: 2024,
    url: 'https://kdigo.org/wp-content/uploads/2024/03/KDIGO-2024-CKD-Guideline.pdf',
    access: 'open',
    scope: 'طبقه‌بندی CGA، مراحل G1–G5 و A1–A3، شرطِ دوامِ ۳ ماه',
  },

  ADA_SOC: {
    org: 'ADA',
    fa: 'انجمن دیابت آمریکا',
    title: 'Standards of Care in Diabetes — Classification and Diagnosis',
    year: 2025,
    url: 'https://diabetesjournals.org/care/issue/48/Supplement_1',
    access: 'open',
    scope: 'معیارهای تشخیص دیابت و پیش‌دیابت؛ لزومِ تکرارِ تأییدی',
  },

  ESC_EAS_LIPID: {
    org: 'ESC/EAS',
    fa: 'انجمن قلب اروپا / انجمن آترواسکلروز اروپا',
    title: '2019 ESC/EAS Guidelines for the management of dyslipidaemias',
    year: 2019,
    url: 'https://eas-society.org/wp-content/uploads/2022/11/2019_dyslipidaemias_guidelin.pdf',
    access: 'open',
    scope: 'اهدافِ LDL بر حسب طبقهٔ خطر قلبی-عروقی',
  },

  ACG_LIVER: {
    org: 'ACG',
    fa: 'کالج گوارش آمریکا',
    title: 'ACG Clinical Guideline: Evaluation of Abnormal Liver Chemistries',
    year: 2017,
    url: 'https://acgcdn.gi.org/wp-content/uploads/2018/04/ACG-Abnormal-Liver-Chemistries-Guideline-Summary.pdf',
    access: 'open',
    // ⚠️ آستانهٔ «لیپاز > ۳×ULN» از این سند *نیست* — از گایدلاینِ پانکراتیتِ
    //    حادِ ACG می‌آید که سندِ جداگانه‌ای است و اینجا ثبت نشده.
    scope: 'ULNِ «سالم» برای ALT و نسبت R در افتراقِ آسیبِ سلولی از انسدادی',
  },

  AASLD: {
    org: 'AASLD',
    fa: 'انجمن مطالعهٔ بیماری‌های کبد آمریکا',
    title: 'AASLD practice guidance (hepatitis B / hepatitis C)',
    year: 2023,
    url: 'https://www.aasld.org/practice-guidelines',
    access: 'open',
    scope: 'مسیرِ تأییدِ هپاتیت B/C پس از تستِ غربالگریِ واکنش‌گر',
  },

  CDC_SEROLOGY: {
    org: 'CDC',
    fa: 'مرکز کنترل بیماری‌های آمریکا',
    title: 'CDC laboratory testing algorithms (HIV, HCV, HBV)',
    year: 2023,
    url: 'https://www.cdc.gov/hiv/clinicians/screening/laboratory-testing.html',
    access: 'open',
    scope: 'الگوریتمِ تأییدِ سرولوژیِ غربالگری',
  },

  IR_BRUCELLOSIS: {
    org: 'وزارت بهداشت ایران',
    fa: 'راهنمای کشوری تشخیص و درمان بروسلوز',
    title: 'راهنمای کشوری تشخیص و درمان بروسلوز (تب مالت)',
    year: 2019,
    url: null,
    access: 'national',
    scope: 'آستانهٔ تیترِ رایت/2ME/کومبس رایت متناسب با گونهٔ غالب در ایران',
  },

  MEDLINEPLUS: {
    org: 'NLM MedlinePlus',
    fa: 'مدلاین‌پلاس (کتابخانهٔ ملی پزشکی آمریکا)',
    title: 'MedlinePlus health topics & lab test information',
    year: 2026,
    url: 'https://medlineplus.gov/',
    access: 'open',
    scope: 'توضیحِ ساده و بیمارفهم؛ چند محدودهٔ مرجعِ متعارف',
  },

  TESTING_COM: {
    org: 'ADLM / Testing.com',
    fa: 'Lab Tests Online (Testing.com)',
    title: 'Testing.com — patient-facing lab test explanations',
    year: 2026,
    url: 'https://www.testing.com/',
    access: 'open',
    scope: 'زبانِ بیمارفهم برای توضیح تست‌ها',
  },

  MERCK_PRO: {
    org: 'Merck Manual Professional',
    fa: 'مرک منوال (نسخهٔ حرفه‌ای)',
    title: 'MSD/Merck Manual Professional Edition',
    year: 2026,
    url: 'https://www.msdmanuals.com/professional',
    access: 'open',
    scope: 'مکانیسمِ ساده‌شدهٔ یافته‌های آزمایشگاهی',
  },

  ARUP_CONSULT: {
    org: 'ARUP Consult',
    fa: 'ARUP Consult (راهنمای انتخاب آزمایش)',
    title: 'ARUP Consult — laboratory test selection & reflex algorithms',
    year: 2026,
    url: 'https://arupconsult.com/',
    access: 'open',
    scope: 'ترتیبِ آزمایش‌های بازتابی — کدام تست اول، کدام پس از تأیید',
  },

  UPTODATE: {
    org: 'UpToDate',
    fa: 'آپ‌تودیت',
    title: 'UpToDate clinical decision support',
    year: 2026,
    url: 'https://www.uptodate.com/',
    access: 'paywalled',
    // هیچ عددی از UpToDate در این موتور نیست. اگر روزی خواستی چیزی از آن
    // نقل کنی، اول اشتراکِ واقعی و ارجاعِ موضوعیِ دقیق لازم است.
    substitutedBy: 'Merck Manual Professional + گایدلاین‌های تخصصی (ADA/KDIGO/ESC/ACG)',
    substitutedUrl: 'https://www.msdmanuals.com/professional',
    scope: 'ارتباط نتیجه با بیماری و مدیریت بالینی — جایگزین‌شده',
  },

  BMJ_BP: {
    org: 'BMJ Best Practice',
    fa: 'بی‌ام‌جی بست پرکتیس',
    title: 'BMJ Best Practice',
    year: 2026,
    url: 'https://bestpractice.bmj.com/',
    access: 'paywalled',
    substitutedBy: 'Merck Manual Professional + ACG/KDIGO/ADA algorithms',
    substitutedUrl: 'https://www.msdmanuals.com/professional',
    scope: 'الگوریتمِ افتراقی — جایگزین‌شده',
  },

  HENRY: {
    org: "Henry's Clinical Diagnosis",
    fa: 'هنری — تشخیص و درمان بالینی به روش آزمایشگاهی',
    title: "Henry's Clinical Diagnosis and Management by Laboratory Methods, Appendix A5",
    year: 2021,
    url: null,
    access: 'book',
    scope: 'محدوده‌های مرجعِ پایهٔ بزرگسال',
  },

  RCPCH: {
    org: 'RCPCH',
    fa: 'کالج سلطنتی اطفال و سلامت کودکان',
    title: 'RCPCH paediatric reference ranges',
    year: 2016,
    url: null,
    access: 'book',
    scope: 'محدوده‌های مرجعِ اطفال (< ۱۶ سال)',
  },

  CTCAE: {
    org: 'NCI',
    fa: 'مؤسسهٔ ملی سرطان آمریکا',
    title: 'Common Terminology Criteria for Adverse Events (CTCAE) v5.0',
    year: 2017,
    url: 'https://ctep.cancer.gov/protocoldevelopment/electronic_applications/ctc.htm',
    access: 'open',
    scope: 'درجه‌بندی شدت G1–G4',
  },

  ISTH: {
    org: 'ISTH',
    fa: 'انجمن بین‌المللی ترومبوز و هموستاز',
    title: 'ISTH overt DIC scoring system',
    year: 2001,
    url: 'https://pubmed.ncbi.nlm.nih.gov/11816725/',
    access: 'open',
    scope: 'امتیازدهی DIC',
  },

  ACR_EULAR: {
    org: 'ACR/EULAR',
    fa: 'کالج روماتولوژی آمریکا / اتحادیهٔ اروپایی روماتولوژی',
    title: '2010 ACR/EULAR classification criteria for rheumatoid arthritis',
    year: 2010,
    url: 'https://pubmed.ncbi.nlm.nih.gov/20699241/',
    access: 'open',
    scope: 'مثبتِ کم (≤۳×ULN) در برابر مثبتِ زیاد (>۳×ULN) برای RF',
  },

  ENDO_VIT_D: {
    org: 'Endocrine Society',
    fa: 'انجمن غدد آمریکا',
    title: 'Evaluation, Treatment, and Prevention of Vitamin D Deficiency',
    year: 2011,
    url: 'https://pubmed.ncbi.nlm.nih.gov/21646368/',
    access: 'open',
    scope: 'کمبود <۲۰، ناکافی ۲۱–۲۹، کافی ≥۳۰ ng/mL',
  },

  HENRY_MINERAL: {
    org: "Henry's Clinical Diagnosis",
    fa: 'هنری — تشخیص بالینی و مدیریت با روش‌های آزمایشگاهی',
    title: 'Biochemical Markers of Bone Metabolism (فصل ۱۶)',
    year: 2022,
    url: 'https://www.elsevier.com/books/henrys-clinical-diagnosis-and-management-by-laboratory-methods/mcpherson/978-0-323-67320-4',
    access: 'open',
    scope:
      'محدوده‌های کلسیم/فسفر/PTH/کلسیم ادرار، و تفکیک علل هایپر و هایپوکلسمی بر پایهٔ PTH (جدول‌های ۱۶.۱ و ۱۶.۲)',
  },
};

/** یک شناسهٔ منبع → رکورد. شناسهٔ ناشناس → null (نه پرتاب خطا؛ متن نباید بشکند). */
export function guideline(id) {
  return GUIDELINES[id] ?? null;
}

/**
 * برچسبِ کوتاهِ فارسی برای نمایش کنارِ یافته — «KDIGO 2024».
 * برای منبعِ پولیِ جایگزین‌شده، نامِ جایگزین برمی‌گردد، نه نامِ پولی.
 */
export function citeFa(id) {
  const g = GUIDELINES[id];
  if (!g) return null;
  if (g.access === 'paywalled') return g.substitutedBy ?? g.fa;
  return `${g.org} ${g.year}`;
}

/** فهرستِ منابع برای نمایش به بیمار (شفافیت). ورودی: آرایهٔ شناسه. */
export function sourceList(ids = []) {
  const seen = new Set();
  const out = [];
  for (const id of ids) {
    const g = GUIDELINES[id];
    if (!g || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      org: g.org,
      fa: g.fa,
      title: g.title,
      year: g.year,
      url: g.access === 'paywalled' ? (g.substitutedUrl ?? null) : g.url,
      // اگر منبعِ اصلی پولی بوده و ما معادلش را به کار برده‌ایم، صریح بگو.
      substituted: g.access === 'paywalled' ? (g.substitutedBy ?? null) : null,
    });
  }
  return out;
}

/** همهٔ شناسه‌های معتبر — برای تستِ «ارجاعِ بی‌مرجع». */
export const GUIDELINE_IDS = new Set(Object.keys(GUIDELINES));
