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
  WHO_LAB_STOOL_2003: {
    org: 'WHO',
    fa: 'سازمان جهانی بهداشت',
    title: 'Manual of basic techniques for a health laboratory, 2nd ed. — examination of stools (macroscopic: colour, consistency, blood, mucus, food remnants; microscopy: ova, cysts)',
    year: 2003,
    url: 'https://www.who.int/publications/i/item/9241545305',
    access: 'open',
    scope: 'گزارشِ استانداردِ برگهٔ مدفوع: مشاهدهٔ ماکروسکوپی و میکروسکوپی (P117)',
  },

  CDC_DPDX_STOOL: {
    org: 'CDC',
    fa: 'مرکز کنترل و پیشگیری بیماری‌های آمریکا — DPDx',
    title: 'DPDx — Stool Specimens: microscopic examination for ova and parasites; artifacts (undigested food, plant cells)',
    year: 2024,
    url: 'https://www.cdc.gov/dpdx/diagnosticProcedures/stool/index.html',
    access: 'open',
    scope: 'تخمِ انگل/کیستِ پروتوزوآ در مدفوع و تفکیکِ آن از بقایای غذاییِ هضم‌نشده (P117)',
  },

  STOOL_TESTS_REVIEW_2019: {
    org: 'Review',
    fa: 'مرورِ بالینی',
    title: 'The importance of stool tests in diagnosis and follow-up of gastrointestinal disorders',
    year: 2019,
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6776453/',
    access: 'open',
    scope: 'معنای بالینیِ رنگِ مدفوع: قهوه‌ای طبیعی؛ گچی/سفید = انسدادِ صفراوی؛ سیاه/قیری = خونریزیِ بالای گوارش یا آهن/بیسموت؛ سرخ = خونریزیِ پایینِ گوارش (P117)',
  },

  WHO_ANAEMIA: {
    org: 'WHO',
    fa: 'سازمان جهانی بهداشت',
    title: 'Guideline on haemoglobin cutoffs to define anaemia in individuals and populations',
    year: 2024,
    url: 'https://www.ncbi.nlm.nih.gov/books/NBK602198/',
    access: 'open',
    scope: 'نقاط برشِ هموگلوبین برای تعریف کم‌خونی و شدت آن',
  },

  WHO_SEMEN_2021: {
    org: 'WHO',
    fa: 'سازمان جهانی بهداشت',
    title: 'WHO laboratory manual for the examination and processing of human semen, 6th edition',
    year: 2021,
    url: 'https://www.who.int/publications/i/item/9789240030787',
    access: 'open',
    scope: 'حدهای پایینِ مرجعِ آنالیزِ مایع منی (حجم، غلظت، تحرکِ کل و پیش‌رونده، ریخت‌شناسی) — P47',
  },

  // ── specs/012 (P68) — هر پنج منبع ۲۰۲۶-۱۰-۰۳ باز و خوانده شد؛ جملهٔ پشتیبانِ هر ادعا در
  //    specs/012-new-test-coverage/research.md §P0-8b. هیچ آستانهٔ عددی از این‌ها در کد نیست (C1).
  CDC_STI_2021: {
    org: 'CDC',
    fa: 'مرکز کنترل و پیشگیری بیماری‌های آمریکا',
    title: 'Sexually Transmitted Infections Treatment Guidelines, 2021 — Syphilis',
    year: 2021,
    url: 'https://www.cdc.gov/std/treatment-guidelines/syphilis.htm',
    access: 'open',
    scope: 'VDRL/RPR غربالگری است و با آزمایشِ ترپونمایی تأیید می‌شود؛ علت‌های مثبتِ کاذب (بارداری، خودایمنی، عفونت‌ها، سن)',
  },

  CDC_PINKBOOK_RUBELLA: {
    org: 'CDC',
    fa: 'مرکز کنترل و پیشگیری بیماری‌های آمریکا',
    title: 'Epidemiology and Prevention of Vaccine-Preventable Diseases (Pink Book) — Chapter 20: Rubella',
    year: 2024,
    url: 'https://www.cdc.gov/pinkbook/hcp/table-of-contents/chapter-20-rubella.html',
    access: 'open',
    scope: 'شاهدِ سرولوژیکِ ایمنی؛ واکسنِ MMR در بارداری منع دارد؛ واکسیناسیونِ پس از زایمان. (حدِ IU/mL در این منبع نیست.)',
  },

  ACG_HPYLORI_2024: {
    org: 'ACG',
    fa: 'کالج گوارش آمریکا',
    title: 'ACG Clinical Guideline: Treatment of Helicobacter pylori Infection (Am J Gastroenterol 2024;119:1730-1753)',
    year: 2024,
    url: 'https://pubmed.ncbi.nlm.nih.gov/39626064/',
    access: 'paywalled',
    // متنِ کاملِ AJG باز نشد؛ آنچه خوانده شد خلاصهٔ رسمیِ خودِ ACG است.
    substitutedBy: 'ACG — H. pylori Guidelines Highlights 2024 (خلاصهٔ رسمیِ ACG)',
    substitutedUrl: 'https://mediacdn.gi.org/giorgcdn/wp-content/uploads/2025/01/ACG-Hpylori-Guidelines-Highlights-2024-FINAL.pdf.pdf',
    scope: 'هر عفونتِ تأییدشده درمان می‌شود؛ تستِ تنفسیِ اوره / آنتی‌ژنِ مدفوع؛ پیش از تست PPI دو هفته و آنتی‌بیوتیک/بیسموت چهار هفته قطع',
  },

  ATA_HYPER_2016: {
    org: 'ATA',
    fa: 'انجمن تیروئید آمریکا',
    title: '2016 ATA Guidelines for Diagnosis and Management of Hyperthyroidism and Other Causes of Thyrotoxicosis (Thyroid 2016;26:1343-1421)',
    year: 2016,
    url: 'https://pubmed.ncbi.nlm.nih.gov/27521067/',
    access: 'open',
    // P148: متنِ کامل (PDFِ عمومی) در جلسهٔ ۲۰۲۶-۱۱-۱۴ خوانده شد — توصیه‌های ۱۵/۱۶ و Technical remarks.
    scope: 'توصیهٔ ۱۵: CBC با شمارشِ افتراقی و آزمایشِ کبد پیش از داروی ضدتیروئید؛ توصیهٔ ۱۶: شمارشِ افتراقی در تب/گلودرد؛ WBCِ کم در گریوز و آنزیمِ کبدِ غیرطبیعی در تیروتوکسیکوز شایع، ALP از استخوان؛ ' +
      'TRAb در پرکاریِ آشکار حساسیت ۹۶–۹۷٪ و ویژگی ۹۹٪ برای گریوز؛ توصیه‌های ۹۲–۹۳ دربارهٔ TRAb در بارداری؛ توصیه‌های ۷۳–۷۴: TSHِ پایدارِ < ۰٫۱ mU/L ⇒ درمانِ پرکاریِ تحت‌بالینی توصیه/بررسی می‌شود',
  },

  ETA_SCH_2013: {
    org: 'ETA',
    fa: 'انجمن تیروئید اروپا',
    title: '2013 ETA Guideline: Management of Subclinical Hypothyroidism (Eur Thyroid J 2013;2:215-228)',
    year: 2013,
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3923601',
    access: 'open',
    scope: 'توصیهٔ ۱۳: TSH > ۱۰ mU/L در < ۶۵ سال حتی بی‌علامت ⇒ لووتیروکسین؛ توصیهٔ ۲: TSHِ بالای تنها با FT4ِ طبیعی ⇒ تکرارِ TSH+FT4+anti-TPO پس از ۲–۳ ماه',
  },

  WHO_MPN_2016: {
    org: 'WHO',
    fa: 'سازمان جهانی بهداشت',
    title: 'WHO 2016 revision of the classification of myeloid neoplasms — polycythemia vera criteria (Blood 2016;127:2391)',
    year: 2016,
    url: 'https://www.thebloodproject.com/cases-archive/polycythemia-diagnostic-criteria/polycythemia-vera-diagnostic-criteria/',
    access: 'open',
    // ⚠️ عددها را از خلاصه‌های جدولِ معیارها (PMC5807384/PMC5915302 و thebloodproject) دیدم؛ متنِ اصلیِ Blood 2016 را باز نکردم.
    scope: 'معیار بزرگِ اول: Hb > 16.5 (مرد) / > 16.0 (زن) g/dL یا Hct > 49٪ (مرد) / > 48٪ (زن)',
  },

  EASL_HH_2022: {
    org: 'EASL',
    fa: 'انجمن اروپایی مطالعهٔ کبد',
    title: 'EASL Clinical Practice Guidelines on Haemochromatosis (J Hepatol 2022;77:479-502)',
    year: 2022,
    url: 'https://easl.eu/wp-content/uploads/2022/06/PIIS01688278220021121.pdf',
    access: 'open',
    scope: 'TSAT > 45٪ و فریتین > 200 µg/L (زن) یا TSAT > 50٪ و فریتین > 300 µg/L (مرد) ⇒ بارِ آهنِ احتمالی؛ آزمایشِ ژنتیکِ HFE وقتی TSAT بالاست؛ فریتین و آهن در هر بررسیِ آزمایشِ کبدِ غیرطبیعی',
  },

  AASLD_EASL_HE_2014: {
    org: 'AASLD/EASL',
    fa: 'انجمن‌های مطالعهٔ کبدِ آمریکا و اروپا',
    title: 'Hepatic encephalopathy in chronic liver disease: 2014 practice guideline by AASLD and EASL (J Hepatol 2014;61:642-659)',
    year: 2014,
    url: 'https://www.aasld.org/liver-fellow-network/core-series/why-series/why-shouldnt-ammonia-be-used-diagnosis-and-management',
    access: 'open',
    // ⚠️ نقلِ جمله‌ها از صفحهٔ AASLD Liver Fellow Network (خلاصهٔ آموزشیِ راهنما) است؛ PDFِ اصلیِ ۲۰۱۴ را باز نکردم.
    scope: 'آمونیاکِ بالا به‌تنهایی ارزشِ تشخیصی/مرحله‌بندی/پیش‌آگهی ندارد؛ آمونیاکِ طبیعی تشخیصِ HE را زیر سؤال می‌برد',
  },

  BRAHMS_PCT: {
    org: 'Thermo Fisher B·R·A·H·M·S',
    fa: 'ترموفیشر (سازندهٔ کیتِ PCT)',
    title: 'Procalcitonin (PCT) Reference Ranges card — Diagnosis of systemic bacterial infection/sepsis (after Meisner M, Procalcitonin 2010)',
    year: 2010,
    url: 'https://documents.thermofisher.com/TFS-Assets/CDD/Catalogs/PCT-Reference-Card.pdf',
    access: 'open',
    // ⚠️ منبعِ سازنده است نه راهنمای انجمنی؛ Surviving Sepsis 2021 PCT را فقط برای قطعِ آنتی‌بیوتیک پیشنهاد می‌کند، نه آستانهٔ تشخیص. PDF را با pdftotext خواندم.
    scope: 'PCT < 0.5 µg/L عفونتِ سیستمیک بعید؛ 0.5 تا < 2 ممکن (علت‌های دیگر هم PCT را بالا می‌برند، تکرار پس از ۶–۲۴ ساعت)؛ ≥ 2 محتمل',
  },

  SOETERS_HYPOALB_2019: {
    org: 'Soeters et al.',
    fa: 'مرورِ همتاداوری‌شده (JPEN)',
    title: 'Hypoalbuminemia: Pathogenesis and Clinical Significance (JPEN 2019;43:181-193)',
    year: 2019,
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7379941',
    access: 'open',
    // ⚠️ مقاله مرورِ روایی است نه راهنمای انجمنی؛ فقط از خلاصهٔ جست‌وجو (علت‌ها: التهاب، کبد، سوءتغذیه، مایع؛ درمان = رفعِ علت) دیدم، متنِ کامل را باز نکردم.
    scope: 'آلبومینِ پایین نشانهٔ التهاب/بیماری است؛ مدیریت = رفعِ علتِ زمینه‌ای نه تزریقِ آلبومین',
  },

  ACOG_RH_PB181: {
    org: 'ACOG',
    fa: 'کالج متخصصان زنان و مامایی آمریکا',
    title: 'ACOG Practice Bulletin No. 181: Prevention of Rh D Alloimmunization',
    year: 2017,
    url: 'https://www.acog.org/clinical/clinical-guidance/practice-bulletin/articles/2017/08/prevention-of-rh-d-alloimmunization',
    access: 'paywalled',
    substitutedBy: 'Baylor College of Medicine, Obstetrics guideline «Alloimmunization» (Eppes & Adams, Oct 2025)',
    substitutedUrl: 'https://www.bcm.edu/sites/default/files/alloimmunization.pdf',
    scope: 'کومبسِ غیرمستقیم برای تعیینِ آنتی‌بادی و تیتر در بارداری؛ تیترِ بحرانی به نوعِ آنتی‌ژن بستگی دارد',
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
    scope: 'طبقه‌بندی CGA، مراحل G1–G5 و A1–A3، شرطِ دوامِ ۳ ماه؛ اسیدوزِ متابولیک در CKD: بی‌کربنات ≤ 22 mmol/L، شروعِ قلیا فقط < 18',
  },

  // P93 (۲۰۲۶-۱۰-۰۶): متنِ اصلی باز شد (PMC2827530، Table 1): ناشتا ۹۲، ۱ساعته ۱۸۰، ۲ساعته ۱۵۳ mg/dL؛ «حتی یکی کافی است».
  //   ADA 2025 (بخشِ ۲) همین عددها را دارد ولی متنش در این جلسه باز نشد (۴۰۳) ⇒ ارجاع فقط به IADPSG.
  IADPSG_2010: {
    org: 'IADPSG',
    fa: 'گروهِ بین‌المللیِ انجمن‌های دیابت و بارداری',
    title: 'International Association of Diabetes and Pregnancy Study Groups recommendations on the diagnosis and classification of hyperglycemia in pregnancy (Diabetes Care 2010;33:676–682)',
    year: 2010,
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2827530/',
    access: 'open',
    scope: 'معیارِ دیابتِ بارداری در آزمونِ ۷۵ گرمی و دیابتِ آشکار در بارداری',
  },

  // P93-ب (۲۰۲۶-۱۰-۰۶): متن باز شد (brieflands). توصیه‌های ۸، ۹، ۱۱، ۱۵–۲۱ و جدولِ ۵ (Carpenter-Coustan) نقل‌به‌لفظ خوانده شد.
  //   راهنمای «وزارتِ بهداشت» نیست؛ متن خودش می‌گوید کارگروهِ انجمن است. سندِ وزارت در این جلسه پیدا نشد.
  IES_GDM_2021: {
    org: 'Iranian Endocrine Society',
    fa: 'انجمنِ غددِ درون‌ریزِ ایران',
    title: 'Iranian Endocrine Society Guidelines for Screening, Diagnosis, and Management of Gestational Diabetes Mellitus (Int J Endocrinol Metab 2021;19(1):e107906)',
    year: 2021,
    url: 'https://doi.org/10.5812/ijem.107906',
    access: 'open',
    scope: 'ناشتای ابتدای بارداری ۱۰۰–۱۲۵، چالشِ ۵۰ گرمی ۱۴۰/۲۰۰، آزمونِ ۱۰۰ گرمی ۹۵/۱۸۰/۱۵۵/۱۴۰ (دو عدد)، ۷۵ گرمی ۹۲/۱۸۰/۱۵۳، HbA1c برای تشخیص نه',
  },

  // P93-ج: هنوز به هیچ قاعده‌ای وصل نیست؛ آستانهٔ ویزیتِ اولش با IES_GDM_2021 فرق دارد و تصمیمش با کاربر است.
  IR_MOH_GDM: {
    org: 'Iran Ministry of Health (maternal health programme)',
    fa: 'پروتکلِ کشوریِ دیابتِ بارداری (وزارتِ بهداشت)',
    title: 'دستورالعمل جدید دیابت در دوران بارداری — به نقلِ «بهورز» ش ۹۴ (دانشگاه علوم پزشکی البرز) و معاونت بهداشتی دانشگاه علوم پزشکی اصفهان، مرداد ۱۴۰۲',
    year: 2023,
    url: 'https://behvarz.mums.ac.ir/article_14899_36c962abe2965c6adfe94150ea7fb94f.pdf',
    access: 'open',
    scope: 'ویزیتِ اول: ناشتای ≤ ۹۲ طبیعی، ۹۳–۱۲۵ «پره‌دیابتیک» (تکرارِ ناشتا و ۲ساعته پس از غذا در ۲ هفته، غیرطبیعی ⇒ ارجاع)، ≥ ۱۲۶ دیابتیک (تکرار پس از ۱ هفته)؛ هفتهٔ ۲۴–۲۸: ۷۵ گرمیِ یک‌مرحله‌ای ۹۲/۱۸۰/۱۵۳، یک عدد کافی',
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

  // ⚠️ همان سند، ولی ورودیِ جدا — و این عمدی است. ADA_SOC دامنه‌اش «تشخیص»
  //    است (بخشِ ۲)؛ هدفِ LDL از بخشِ ۱۰ می‌آید. ارجاع به بخشِ اشتباهِ یک
  //    سند، دقیقاً همان ایرادی است که این فایل دربارهٔ «سندِ اشتباهِ همان
  //    سازمان» می‌گیرد، یک پله ریزتر. یک ورودی ارزانتر از یک ادعای نادرست است.
  ADA_SOC_CVD: {
    org: 'ADA',
    fa: 'انجمن دیابت آمریکا',
    title: 'Standards of Care in Diabetes — Cardiovascular Disease and Risk Management',
    year: 2025,
    url: 'https://diabetesjournals.org/care/issue/48/Supplement_1',
    access: 'open',
    scope: 'هدفِ LDL در دیابت (زیر ۱۰۰، و زیر ۷۰ در پرخطرِ قلبی‌عروقی)',
  },

  // بازبینیِ ۲۰۲۶-۱۰-۱۳ (P104): متنِ خودِ ACOG پولی است و باز نشد؛ پلاکت < ۱۰۰٬۰۰۰ و ترانس‌آمینازِ > ۲ برابر از خلاصهٔ آزادِ زیر
  //   خوانده شد. اعدادِ تنسی (LDH ≥ ۶۰۰، AST ≥ ۷۰) فقط از خلاصه‌های ثانویه آمده‌اند — در P104 ثبت است.
  ACOG_PREECLAMPSIA: {
    org: 'ACOG',
    fa: 'کالج متخصصان زنان و زایمان آمریکا',
    title: 'Practice Bulletin No. 222 — Gestational Hypertension and Preeclampsia',
    year: 2020,
    url: 'https://www.acog.org/clinical/clinical-guidance/practice-bulletin/articles/2020/06/gestational-hypertension-and-preeclampsia',
    access: 'paywalled',
    substitutedBy: 'WikEM — Pre-eclampsia (خلاصهٔ معیارهای ACOG)، https://wikem.org/wiki/Pre-eclampsia',
    scope: 'ویژگی‌های شدیدِ پره‌اکلامپسی: پلاکت < ۱۰۰٬۰۰۰، ترانس‌آمینازِ > ۲ برابرِ حدِ بالا',
  },

  WHO_HB_2024: {
    org: 'WHO',
    fa: 'سازمان جهانی بهداشت',
    title: 'Guideline on haemoglobin cutoffs to define anaemia in individuals and populations',
    year: 2024,
    url: 'https://www.who.int/publications/i/item/9789240088542',
    access: 'open',
    // ⚠️ جدولِ خودِ سند باز نشد؛ «< ۱۲۰ g/L در ۱۲–۱۴ سال، < ۱۳۰ g/L مردِ ≥ ۱۵ سال» از نقلِ BMJ Best Practice و مرورهای ۲۰۲۴ است
    //   که می‌گویند بازنگریِ ۲۰۲۴ این گروه‌ها را عوض نکرد (P104).
    scope: 'آستانهٔ کم‌خونی در نوجوان: ۱۲–۱۴ سال < ۱۲٫۰، پسرِ ≥ ۱۵ سال < ۱۳٫۰ g/dL',
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
    scope: 'ULNِ «سالم» برای ALT و نسبت R در افتراقِ آسیبِ سلولی از انسدادی؛ بیلی‌روبینِ بالا ⇒ تفکیکِ مستقیم/غیرمستقیم و بررسیِ الگوی آنزیم‌ها',
  },

  FDA_DILI_2009: {
    org: 'FDA',
    fa: 'سازمان غذا و داروی آمریکا',
    title: 'Guidance for Industry — Drug-Induced Liver Injury: Premarketing Clinical Evaluation',
    year: 2009,
    url: 'https://www.fda.gov/media/116737/download',
    access: 'open',
    // P107 (L1): سند باز و خوانده شد (۲۰۲۶-۱۰-۱۳). «Hy's Law»: AT > 3×ULN + TBL > 2×ULN + ALP < 2×ULN؛ حدود ۱۰٪ مرگ یا پیوند؛
    //   «repeat testing within 48 to 72 hours … especially great if AT is much greater than 3xULN and/or TBL is greater than 2xULN».
    scope: 'ترکیبِ آسیبِ سلولِ کبد (ALT/AST > ۳ برابرِ حدِ بالا) با بیلی‌روبینِ > ۲ برابر، بی ALPِ ≥ ۲ برابر (قانونِ Hy)',
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
    // P119 (۲۰۲۶-۱۰-۲۸): الگوی «کراتینینِ پایین» از صفحهٔ «Evaluation of the Patient With Renal Issues»
    //   (Full Review: Mar 2025، همین جلسه باز و خوانده شد): کراتینین به تولید + دفع بستگی دارد؛ افرادِ
    //   عضلانی بالاتر و سالمند/کم‌تغذیه پایین‌تر؛ «serum creatinine alone is not a good indicator of kidney
    //   function» و توصیهٔ CKD-EPI 2021 با کراتینین ± سیستاتین C. عددی از این صفحه در کد نشست (آستانهٔ
    //   ۱٫۳/۱٫۰ بزرگسال از قبل جای دیگری بود)؛ فقط مکانیسم و توصیهٔ اندازه‌گیری.
    scope: 'مکانیسمِ ساده‌شدهٔ یافته‌های آزمایشگاهی؛ کراتینینِ پایین = تولیدِ کمتر (تودهٔ عضلانیِ کم/کم‌تغذیه‌گی) و توصیهٔ eGFR با CKD-EPI 2021؛ رابدومیولیز: CK > ۵×ULN (مثلاً > 1000 U/L)',
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

  // P106 (M9): ردیف‌های سنیِ WBCِ کودک (۶ ماه تا ۱۲ سال). صفحه در ۲۰۲۶-۱۰-۱۳ باز و عددها از آن خوانده شد.
  HSL_RFH: {
    org: 'HSL / Royal Free London',
    fa: 'آزمایشگاهِ بیمارستانِ رویال فری لندن',
    title: 'Haematology reference ranges at Royal Free Hospital (paediatric)',
    year: 2026,
    url: 'https://www.hslpathology.com/research-and-innovation/reference-ranges/haematology-reference-ranges-at-rfh-rrl/',
    access: 'open',
    scope: 'محدوده‌های مرجعِ شمارشِ گلبول سفیدِ کودک',
  },

  // P107d (فیبرینوژنِ بارداری، ۲۰۲۶-۱۰-۱۳): جدولِ مرجعِ بارداری. ⚠️ متنِ اصلی (پشتِ cookie-wall در PubMed) باز نشد؛ عددها از بازنشرِ
  //   perinatology.com که همین مقاله را مرجعِ اول می‌گیرد خوانده شد (فیبرینوژنِ پلاسما mg/dL: غیرباردار ۲۳۳–۴۹۶، سه‌ماههٔ ۱ ۲۴۴–۵۱۰،
  //   ۲ ۲۹۱–۵۳۸، ۳ ۳۷۳–۶۱۹). مطالعه‌های دیگر بازهٔ پهن‌تری می‌دهند (n=۷۱: تا ۹٫۱۴ g/L)، پس این عدد قطعی نیست.
  ABBASSI_PREG_2009: {
    org: 'ACOG journal (Obstet Gynecol)',
    fa: 'جدولِ مرجعِ آزمایش‌ها در بارداری (Abbassi-Ghanavati، Greer، Cunningham)',
    title: 'Pregnancy and laboratory studies: a reference table for clinicians. Obstet Gynecol 2009;114:1326–31',
    year: 2009,
    url: 'https://pubmed.ncbi.nlm.nih.gov/19935037/',
    access: 'open',
    scope: 'سقفِ طبیعیِ فیبرینوژن در بارداری (بالاترین سقفِ سه‌ماههٔ سوم)',
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
    scope: 'امتیازدهی DIC: پلاکت <۱۰۰ = ۱ و <۵۰ = ۲؛ PT ۳ تا ۶ ثانیه بلندتر از کنترل = ۱ و >۶ = ۲؛ فیبرینوژن <۱ g/L = ۱؛ جمع ≥۵ = DIC آشکار. آستانهٔ عددیِ D-dimerِ «متوسط/شدید» را ISTH تعیین نمی‌کند؛ در این موتور «متوسط» = بالای حدِ بالای مرجعِ خودِ موتور (۵۰۰ ng/mL) و «شدید» = بیش از ۷ برابرِ آن (۳۵۰۰) است، بر پایهٔ ماشین‌حسابِ بیمارستانِ اولم؛ از خودِ مقالهٔ ISTH نیامده است.',
  },

  // ⚠️ چهار ورودیِ زیر ۲۰۲۶-۰۹-۲۹ اضافه شد؛ صفحهٔ هرکدام همان روز باز و جمله‌های ادعاشده تطبیق داده شد.
  UKKA_HYPERK: {
    org: 'UK Kidney Association',
    fa: 'انجمن کلیهٔ بریتانیا',
    title: 'Clinical Practice Guidelines — Treatment of Acute Hyperkalaemia in Adults',
    year: 2023,
    url: 'https://guidelines.ukkidney.org/hyperkalaemia/',
    access: 'open',
    scope: 'شدتِ هیپرکالمی: خفیف ۵٫۵–۵٫۹، متوسط ۶٫۰–۶٫۴، شدید ≥ ۶٫۵؛ نوار قلبیِ فوری از ۶٫۰؛ نمونهٔ جفتِ هپارینه/سرم برای رد پسودوهایپرکالمی. فقط جهتِ بالا.',
  },

  CHEW_PANCYTOPENIA: {
    org: 'Chew & Kamangar',
    fa: 'مقالهٔ مروری «رویکرد به پان‌سیتوپنی» — Clinical Medicine (لندن)',
    title: 'Approach to pancytopenia: From blood tests to the bedside',
    year: 2024,
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11399640/',
    access: 'open',
    // ترتیبِ بررسی (شمارش رتیکولوسیت و لام خون نخست؛ سپس هماتینیک‌ها) و — از ۲۰۲۶-۰۹-۳۰ — آستانه‌های تعریف:
    //    Hb < 10، (WBC < 4 یا ANC < 1.5)، PLT < 100؛ قاعدهٔ pancytopenia همین‌ها را به کار می‌برد (تصمیمِ بازبین).
    //    ⚠️ ارجاعِ بازبین به «Chew ML، Med J Malaysia» و «Hoffbrand ویرایش ۸ ص ۱۶۲» باز نشد و ثبت نمی‌شود؛ منبعِ ثبت‌شده همین مقالهٔ باز است.
    scope: 'ترتیبِ بررسیِ پان‌سیتوپنی: رتیکولوسیت و لام خون، سپس B12/فولات و سایر علل',
  },

  BUNCR_UGIB_META: {
    org: 'Simadibrata et al.',
    fa: 'مرور نظام‌مند و متاآنالیز — نسبتِ BUN/Cr برای تفکیکِ خونریزیِ گوارشیِ فوقانی از تحتانی (J Gastroenterol Hepatol)',
    title: 'Blood Urea Nitrogen-to-Creatinine Ratio to Differentiate Upper From Lower Gastrointestinal Bleeding: A Systematic Review and Meta-Analysis',
    year: 2026,
    url: 'https://pubmed.ncbi.nlm.nih.gov/41555211/',
    access: 'open',
    // ⚠️ فقط *خلاصهٔ* مقاله خوانده شد (Europe PMC)، نه متنِ کامل. برشِ > ۳۰: حساسیت ۳۸٫۸٪، ویژگی ۸۹٫۳٪؛ برشِ بهینه ۲۲
    //    (۶۶٫۲٪ / ۷۱٫۰٪، AUC 0.74؛ ۱۷ مطالعه). یعنی نسبتِ بالا ویژه است ولی نسبتِ پایین خونریزی را رد نمی‌کند. حمایت از
    //    «soon» یا «۲۴ تا ۴۸ ساعت» نیست — آن تصمیمِ بازبین است. (Ernst 1999 با برشِ > ۳۶: حساسیت ۹۰٪، ویژگی ۲۷٪ — فقط از خلاصه.)
    scope: 'برشِ BUN/Cr > ۳۰ برای خونریزیِ گوارشیِ فوقانی: ویژگیِ بالا، حساسیتِ پایین؛ نسبتِ پایین رد نمی‌کند',
  },

  ISTH_TTP: {
    org: 'ISTH',
    fa: 'انجمن بین‌المللی ترومبوز و هموستاز',
    title: 'ISTH guidelines for the diagnosis of thrombotic thrombocytopenic purpura (Zheng et al.)',
    year: 2020,
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8146131/',
    access: 'open',
    // ⚠️ مفهوم و فوریت: ترومبوسیتوپنی (< ۱۰۰) + کم‌خونیِ همولیتیکِ میکروآنژیوپاتیک (شیستوسیت، LDH بالا، هاپتوگلوبین پایین).
    //    آستانهٔ Hb < 10 و PLT < 50 در قاعدهٔ ما از این سند نیست، و قاعده به شواهدِ همولیز نیاز ندارد.
    //    بازبینی ۲۰۲۶-۰۹-۳۰ (متنِ سند دوباره باز شد؛ JTH 18(10):2486–2495): سند «ترومبوسیتوپنی (< ۱۰۰ ×۱۰⁹/L)» می‌گوید؛
    //    عددِ < ۳۰ یا < ۵۰ و «شیستوسیت ≥ ۱٪» که در ارجاعِ بازبین آمده در متنِ سند نیست (درصدِ شیستوسیت را نمی‌دهد).
    scope: 'شکِ TTP در ترومبوسیتوپنی با MAHA؛ شروعِ درمان بدونِ انتظار برای ADAMTS13 در شکِ بالا',
  },

  STATPEARLS_INR: {
    org: 'StatPearls (NCBI Bookshelf)',
    fa: 'مرجعِ آموزشیِ باز — «INR: ارزیابی، پایش و پیامدهای بالینی»',
    title: 'International Normalized Ratio: Assessment, Monitoring, and Clinical Implications (Shikdar et al.)',
    year: 2025,
    url: 'https://www.ncbi.nlm.nih.gov/books/NBK507707/',
    access: 'open',
    scope: 'INR تفاوتِ دستگاه و معرف را در PT استاندارد می‌کند (ISI)؛ PTِ خام بین آزمایشگاه‌ها قابل‌مقایسه نیست',
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

  ACR_GOUT_2020: {
    org: 'ACR',
    fa: 'کالج روماتولوژی آمریکا',
    title: '2020 American College of Rheumatology Guideline for the Management of Gout',
    year: 2020,
    url: 'https://pubmed.ncbi.nlm.nih.gov/32390306/',
    access: 'open',
    scope: 'حدِ انحلالِ اورات ≈ ۶٫۸ mg/dL؛ در هیپراوریسمیِ بی‌علامت شروعِ داروی کاهندهٔ اسید اوریک توصیه نمی‌شود (توصیهٔ مشروط)',
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

  HENRY_ENDOCRINE: {
    org: "Henry's Clinical Diagnosis",
    fa: 'هنری — تشخیص بالینی و مدیریت با روش‌های آزمایشگاهی',
    title: 'Endocrine and Pituitary Function (فصل ۲۵)',
    year: 2022,
    url: 'https://www.elsevier.com/books/henrys-clinical-diagnosis-and-management-by-laboratory-methods/mcpherson/978-0-323-67320-4',
    access: 'open',
    scope:
      'پرولاکتین، کورتیزول (صبح، پس از دگزامتازون، بزاق، ادرارِ ۲۴ ساعته) و ACTH — اعداد در انتظارِ بازبین (P46)',
  },

  ES_CUSHING_DX: {
    org: 'Endocrine Society',
    fa: 'انجمن غدد درون‌ریز آمریکا',
    title: "The Diagnosis of Cushing's Syndrome: An Endocrine Society Clinical Practice Guideline",
    year: 2008,
    url: 'https://www.endocrine.org/clinical-practice-guidelines/diagnosis-of-cushing-syndrome',
    access: 'open',
    scope: 'غربالگریِ کوشینگ: کورتیزولِ آزاد ادرار (حدِ بالای همان روش؛ هم‌پوشانیِ کاذب تا حدودِ ۴ برابر)، کورتیزولِ بزاقِ نیمه‌شب، آزمونِ ۱ mg دگزامتازون (< ۱.۸ µg/dL)، اثرِ استروژن',
  },

  ES_PAI_DX: {
    org: 'Endocrine Society',
    fa: 'انجمن غدد درون‌ریز آمریکا',
    title: 'Diagnosis and Treatment of Primary Adrenal Insufficiency: An Endocrine Society Clinical Practice Guideline',
    year: 2016,
    url: 'https://www.endocrine.org/clinical-practice-guidelines/primary-adrenal-insufficiency',
    access: 'open',
    scope: 'کورتیزولِ صبحِ پایین (زیر ۵ µg/dL با ACTH) و آزمونِ تحریکِ کورتیکوتروپین برای تأیید',
  },

  ES_HYPERPROLACTINEMIA: {
    org: 'Endocrine Society',
    fa: 'انجمن غدد درون‌ریز آمریکا',
    title: 'Diagnosis and Treatment of Hyperprolactinemia: An Endocrine Society Clinical Practice Guideline',
    year: 2011,
    url: 'https://www.endocrine.org/clinical-practice-guidelines/hyperprolactinemia',
    access: 'open',
    scope: 'علل پرولاکتینِ بالا (بارداری، شیردهی، دارو، کم‌کاریِ تیروئید، نارسایی کلیه، تومورِ هیپوفیز)؛ افزایشِ شدید و ارزیابیِ هیپوفیز',
  },

  // ---- واحدِ ردیف‌های بی‌واحد (specs/003، P48) ----
  AMA_SI_UNITS: {
    org: 'AMA Manual of Style',
    fa: 'راهنمای سبکِ انجمنِ پزشکیِ آمریکا — جدولِ تبدیلِ واحدهای SI',
    title: 'Units of Measure — SI conversion table (11th ed.)',
    year: 2020,
    url: 'https://academic.oup.com/amamanualofstyle/si-conversion-calculator',
    access: 'paywalled',
    // خودِ کتاب پولی است. ضریب‌ها با نسخهٔ بازِ برگرفته از آن مقایسه شد (۲۲ آنالیت، همه سازگار؛
    // specs/003-unitless-lab-values/research.md R2) — همان نسخه مبناست.
    substitutedBy: 'Laboratory Units Conversion Table (Adapted from AMA Manual of Style)',
    substitutedUrl: 'https://www.cmeinfo.com/wp-content/uploads/2021/09/0.-Laboratory-Units-Conversion-Table.pdf',
    scope: 'ضریبِ تبدیلِ واحدِ متعارف ↔ SI؛ پایهٔ تعیینِ واحدِ ردیفِ بی‌واحد',
  },
  LOINC: {
    org: 'Regenstrief Institute',
    fa: 'LOINC — نام‌گذاریِ بین‌المللیِ آزمایش‌ها',
    title: 'LOINC — Logical Observation Identifiers Names and Codes (via NLM Clinical Tables API)',
    year: 2026,
    url: 'https://clinicaltables.nlm.nih.gov/apidoc/loinc/v3/doc.html',
    access: 'open',
    scope: 'وجودِ دو سیستمِ واحد برای هر آنالیت: یک کدِ جرم/حجم (متعارف) و یک کدِ مول/حجم (SI)',
  },

  HENRY_REPRO: {
    org: "Henry's Clinical Diagnosis",
    fa: 'هنری — تشخیص بالینی و مدیریت با روش‌های آزمایشگاهی',
    title: 'Reproductive Function and Pregnancy (فصل ۲۶)',
    year: 2022,
    url: 'https://www.elsevier.com/books/henrys-clinical-diagnosis-and-management-by-laboratory-methods/mcpherson/978-0-323-67320-4',
    access: 'open',
    scope:
      'آنالیزِ مایع منی، محورِ تستوسترون/LH/FSH، هورمون‌های باروریِ زن (FSH/LH/استرادیولِ روزِ سوم، پروژسترونِ روزِ ۲۱، AMH، DHEA-S، 17-OHP) و hCG به‌عنوانِ تستِ بارداری — اعداد در انتظارِ بازبین (P47)',
  },

  HENRY_LIPID: {
    org: "Henry's Clinical Diagnosis",
    fa: 'هنری — تشخیص بالینی و مدیریت با روش‌های آزمایشگاهی',
    title: 'Lipids and Dyslipoproteinemia (فصل ۱۸)',
    year: 2022,
    url: 'https://www.elsevier.com/books/henrys-clinical-diagnosis-and-management-by-laboratory-methods/mcpherson/978-0-323-67320-4',
    access: 'open',
    scope:
      'طبقه‌بندی تری‌گلیسرید (طبیعی/مرزی/بالا/خیلی‌بالا ≥۵۰۰)، آستانه‌های شکِ هایپرکلسترولمی فامیلی در بزرگسال و زیر ۲۰ سال، جدول ۱۸.۱۰ (کلسترول و LDL کودکان)، و آستانهٔ apoB',
  },

  HENRY_CARDIAC: {
    org: "Henry's Clinical Diagnosis",
    fa: 'هنری — تشخیص بالینی و مدیریت با روش‌های آزمایشگاهی',
    title: 'Cardiac Injury, Atherosclerosis, and Thrombotic Disease (فصل ۱۹)',
    year: 2022,
    url: 'https://www.elsevier.com/books/henrys-clinical-diagnosis-and-management-by-laboratory-methods/mcpherson/978-0-323-67320-4',
    access: 'open',
    scope:
      'صدکِ ۹۹ سنجه‌های تروپونینِ حساسیت‌بالا (۱۰–۳۰ ng/L) و حدِ تشخیصشان (۱–۲ ng/L)؛ ' +
      'جدول ۱۹.۳ (تعریفِ جهانیِ چهارمِ انفارکتوس)؛ ردهٔ خطرِ hs-CRP (<۱ / ۱–۳ / >۳ mg/L) و ' +
      'قاعدهٔ ابطالِ >۱۰ mg/L از بیانیهٔ مشترکِ CDC/AHA؛ باندهای هموسیستئین ' +
      '(خفیف ۱۶–۳۰، متوسط ۳۰–۱۰۰، شدید >۱۰۰ µmol/L)؛ نقطهٔ تصمیمِ BNP=۱۰۰ pg/mL و ' +
      'ردِ NT-proBNP<۳۰۰ pg/mL؛ و کات‌آفِ سن‌تعدیل‌شدهٔ D-dimer (۱۰×سن برای ≥۵۰ سال)',
  },

  WFH_HEMOPHILIA: {
    org: 'World Federation of Hemophilia (WFH)',
    fa: 'فدراسیون جهانی هموفیلی — راهنمای مدیریت هموفیلی (ویرایش سوم، ۲۰۲۰)',
    title: 'Guidelines for the Management of Hemophilia, 3rd edition',
    year: 2020,
    url: 'https://www1.wfh.org/publications/files/pdf-1863.pdf',
    access: 'open',
    scope:
      'طبقه‌بندی شدت هموفیلی بر پایهٔ سطح فاکتور انعقادی (جدول ۲-۱: شدید <۱٪، متوسط ۱–۵٪، خفیف >۵ تا <۴۰٪)؛ پایش و سنجش مهارکننده‌ها (تست نایمیخن-بتسدا، عیار مثبت ≥۰.۶ BU/mL)',
  },

  // ── P112 (۲۰۲۶-۱۰-۲۱، درخواستِ کاربر: «قواعدِ خونِ مخفی در مدفوع را از گایدلاین‌ها و مقالات پیدا کن و در تفسیر اعمال کن») ──
  //    هر شش منبع متن/چکیده‌شان در همان جلسه باز و خوانده شد؛ استخراجِ قاعده‌ها در MEDICAL_RULES.md §P112 ثبت است.
  //    ⚠️ هیچ آستانهٔ عددیِ تازه‌ای در کد ننشست: مثبت/منفی همچنان فقط با مرز/بازهٔ *چاپ‌شدهٔ همان ردیف* است (C1).
  //       اعدادِ زیر فقط در متنِ بیمار به‌عنوانِ «مرزِ رایجِ راهنماها» می‌آیند، نه ملاکِ حکمِ موتور.
  USPSTF_CRC_2021: {
    org: 'USPSTF',
    fa: 'کارگروه خدمات پیشگیرانهٔ آمریکا — غربالگری سرطان رودهٔ بزرگ (۲۰۲۱)',
    title: 'Screening for Colorectal Cancer: US Preventive Services Task Force Recommendation Statement (JAMA 2021;325(19):1965-1977)',
    year: 2021,
    url: 'https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/colorectal-cancer-screening',
    access: 'open',
    scope:
      'غربالگری از ۴۵ تا ۷۵ سالگی؛ FIT سالی یک بار (نمونهٔ واحد، بدونِ محدودیتِ غذایی/دارویی)؛ ' +
      'هر نتیجهٔ مثبتِ آزمایشِ مدفوع برای کامل‌شدنِ فایدهٔ غربالگری کولونوسکوپیِ پیگیری لازم دارد؛ ' +
      'gFOBTِ حساسیت‌بالا سه نمونهٔ جدا و محدودیتِ غذایی/دارویی می‌خواهد (FIT ندارد)؛ ' +
      'مدلِ CISNET آستانهٔ ۲۰ µg Hb/g مدفوع را به‌کار برد',
  },

  ACPGBI_BSG_FIT_2022: {
    org: 'ACPGBI/BSG',
    fa: 'انجمن کولوپروکتولوژی بریتانیا و ایرلند + انجمن گوارش بریتانیا — راهنمای مشترکِ FIT در بیمارِ علامت‌دار (۲۰۲۲)',
    title: 'Faecal immunochemical testing (FIT) in patients with signs or symptoms of suspected colorectal cancer (CRC): a joint guideline from the ACPGBI and the BSG (Gut 2022;71(10):1939-1953; PMID 35820780)',
    year: 2022,
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9484376/',
    access: 'open',
    scope:
      'آستانهٔ fHb ≥ ۱۰ µg Hb/g برای مسیرِ ارجاعِ فوری (توصیهٔ قوی)؛ FIT ابزارِ تریاژ است و ' +
      '«بیمار نباید تنها بر پایهٔ نتیجهٔ FIT از ارجاع محروم شود»؛ FIT در کمخونیِ فقر آهن برای تعیینِ فوریتِ ارجاع؛ ' +
      'خونریزیِ مقعدیِ پایدار با fHb زیرِ آستانه ⇒ سیگموئیدوسکوپیِ فلکسابل؛ FIT برای بیمارانِ زیرِ ۵۰ سال با علائمِ مشکوک؛ ' +
      'شواهد برای تغییرِ آستانه بر پایهٔ دارو یا ویژگی‌های بیمار ناکافی است',
  },

  // P148: متنِ کامل از Europe PMC (PMC8515119) در همین جلسه خوانده شد.
  BSG_IDA_2021: {
    org: 'BSG',
    fa: 'انجمن گوارش بریتانیا — کم‌خونیِ فقرِ آهن در بزرگسالان (۲۰۲۱)',
    title: 'British Society of Gastroenterology guidelines for the management of iron deficiency anaemia in adults (Gut 2021;70:2030-2051; PMID 34497146)',
    year: 2021,
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8515119/',
    access: 'open',
    scope: 'توصیهٔ ۲۴: در زنانِ جوان قاعدگی، بارداری و رژیم عواملِ اصلی‌اند؛ توصیهٔ ۲۵: پس از غربالگریِ سلیاک، بررسیِ گوارشی فقط با نشانهٔ نگرانی ' +
      '(سنِ بالای ۵۰، قاعده‌نشدن، علامتِ هشدار، سابقهٔ خانوادگی، کم‌خونیِ عودکننده/نامتناسب)؛ سلیاک تا ۴٪ ⇒ همهٔ زنانِ پیش از یائسگی با IDA غربالگریِ سرولوژیک',
  },

  BSG_ACPGBI_FIT_IDA_2025: {
    org: 'BSG/ACPGBI',
    fa: 'انجمن گوارش بریتانیا + انجمن کولوپروکتولوژی بریتانیا و ایرلند — نقشِ FIT در بررسیِ کمخونیِ فقر آهن (۲۰۲۵)',
    title: 'BSG and ACPGBI guidelines on the role of faecal immunochemical testing (FIT) in the endoscopic investigation of iron deficiency anaemia (IDA) (Frontline Gastroenterology 2025; doi:10.1136/flgastro-2025-103329)',
    year: 2025,
    url: 'https://fg.bmj.com/content/early/2025/10/14/flgastro-2025-103329.full',
    access: 'open',
    scope:
      'همهٔ بیمارانِ کمخونیِ فقر آهن باید برای بررسیِ همزمانِ گوارشِ فوقانی و تحتانی ارجاع شوند؛ ' +
      'FIT بالای آستانه + IDA ⇒ ارجاع از مسیرِ سرطانِ مشکوک برای هر دو بخش؛ FIT زیرِ آستانه + IDA بدونِ علامتِ هشدار ⇒ ' +
      'ارزیابیِ بالینیِ غیرِسرطانی (نه حذفِ بررسی)؛ سرطانِ گوارشِ فوقانی در ۲٫۱–۳٪ بیمارانِ IDA با FIT/FOBT مثبت گزارش شده',
  },

  NIEWENBURG_2019_FIT_DRUGS: {
    org: 'Gut',
    fa: 'متاآنالیزِ اثرِ ضدانعقادهای خوراکی و آسپیرین/NSAID بر دقتِ FIT (۲۰۱۹)',
    title: 'Effect of anticoagulants and NSAIDs on accuracy of faecal immunochemical tests (FITs) in colorectal cancer screening: a systematic review and meta-analysis (Gut 2019;68(5):866-872; PMID 29871970)',
    year: 2019,
    url: 'https://pubmed.ncbi.nlm.nih.gov/29871970/',
    access: 'paywalled',
    // متنِ کاملِ Gut باز نشد؛ عددها از چکیدهٔ آزادِ PubMed است (۸ مطالعه، ۳۵۶۳ بیمارِ FIT-مثبت).
    substitutedBy: 'Nieuwenburg SA et al., Gut 2019;68(5):866-872 — چکیدهٔ آزادِ PubMed (PPVِ نئوپلازیِ پیشرفته در مصرف‌کنندگانِ ضدانعقاد ۳۷٫۶٪ در برابرِ ۴۰٫۳٪؛ آسپیرین/NSAID ۳۸٫۲٪ در برابرِ ۳۹٫۴٪)',
    substitutedUrl: 'https://pubmed.ncbi.nlm.nih.gov/29871970/',
    scope: 'دقتِ FIT با مصرفِ ضدانعقادِ خوراکی و آسپیرین/NSAID به‌طورِ معناداری تغییر نمی‌کند و قطعِ دارو پیش از FIT توصیه نمی‌شود',
  },

  CORLEY_2017_FIT_DELAY: {
    org: 'JAMA',
    fa: 'مطالعهٔ هم‌گروهیِ ۷۰٬۱۲۴ بیمارِ FIT-مثبت — فاصلهٔ زمانی تا کولونوسکوپی (۲۰۱۷)',
    title: 'Association Between Time to Colonoscopy After a Positive Fecal Test Result and Risk of Colorectal Cancer and Cancer Stage at Diagnosis (JAMA 2017;317(16):1631-1641; PMID 28444278)',
    year: 2017,
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6343838/',
    access: 'open',
    scope:
      'در مقایسه با کولونوسکوپیِ ۸ تا ۳۰ روز پس از FIT مثبت، تأخیرِ بیش از ۱۰ ماه با سرطانِ بیشتر (OR 1.48 برای ۱۰–۱۲ ماه و 2.25 برای بیش از ۱۲ ماه) ' +
      'و مرحلهٔ پیشرفته‌تر (OR 1.97 و 3.22) همراه بود؛ تا ۹ ماه اختلافِ معناداری دیده نشد',
  },

  FIT_UNIT_CONVERSION_2013: {
    org: 'Clin Chem Lab Med',
    fa: 'واحدهای FIT — ناسازگاریِ کیت‌ها و تبدیلِ ng/mL به µg Hb/g مدفوع (۲۰۱۳)',
    title: 'Diagnostic inconsistency of faecal immunochemical tests for haemoglobin in population screening of colorectal cancer (Clin Chem Lab Med 2013;51(11):2173-2180; PMID 24145058)',
    year: 2013,
    url: 'https://pubmed.ncbi.nlm.nih.gov/24145058/',
    access: 'paywalled',
    // متنِ کاملِ De Gruyter باز نشد؛ عددِ تبدیل از چکیدهٔ آزاد و محاسبهٔ خودِ مقاله (۱۰ mg مدفوع در ۲ mL بافر) است.
    substitutedBy: 'چکیدهٔ آزادِ PubMed: حدِ مثبتِ کیت ۱۰۰ ng/mL ⇒ ۲۰ µg Hb/g و ۲۰۰ ng/mL ⇒ ۴۰ µg/g (یعنی هر ۵ ng/mL ≈ ۱ µg Hb در گرمِ مدفوع)',
    substitutedUrl: 'https://pubmed.ncbi.nlm.nih.gov/24145058/',
    scope: 'تبدیلِ واحدِ کیت (غلظت در محلول، ng/mL) به µg Hb/g مدفوع و تفاوتِ آستانهٔ کیت‌ها — مبنای جملهٔ واحد در یافتهٔ FIT',
  },
  // ── P113 (۲۰۲۶-۱۰-۲۷): منابعِ شاخصِ سنِ زیستیِ فنوتیپی (PhenoAge) ──
  //    هر دو مقاله در همان جلسه باز و خوانده شدند (متنِ کاملِ دسترس‌پذیر)؛ جدولِ ۱ مقالهٔ لوین واحدِ
  //    هر بیومارکر را می‌دهد و تصحیحِ ۲۰۱۹ مرحلهٔ گم‌شدهٔ تبدیلِ مورتالیتی به سال را برمی‌گرداند.
  //    ⚠️ این شاخص هیچ آستانه و هیچ فوریتی نمی‌سازد؛ فقط یک عددِ اطلاعاتی است (MEDICAL_RULES §P113).
  LEVINE_2018_PHENOAGE: {
    org: 'Aging (Albany NY)',
    fa: 'مورگان لوین و همکاران — سنِ فنوتیپی از ۹ بیومارکرِ خون (۲۰۱۸)',
    title: 'An epigenetic biomarker of aging for lifespan and healthspan (Aging (Albany NY) 2018;10(4):573-591; PMID 29676998)',
    year: 2018,
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5940111/',
    access: 'open',
    scope:
      'مدلِ خطراتِ متناسبِ گامپرتز روی NHANES III (۹٬۹۲۶ نفر) با اعتبارسنجی در NHANES IV: ' +
      'آلبومین (g/L)، کراتینین (µmol/L)، قند (mmol/L)، ln-CRP (mg/dL)، درصدِ لنفوسیت، MCV (fL)، ' +
      'RDW (٪)، ALP (U/L)، WBC (10^3/µL) و سنِ شناسنامه‌ای؛ خروجی: ریسکِ مورتالیتیِ ۱۰ساله و ' +
      'معادلِ سنیِ آن. AUCِ مورتالیتیِ ۱۰ساله ≈ ۰٫۸۸ در برابرِ ۰٫۸۶ برای سنِ شناسنامه‌ای.',
  },

  LIU_2019_PHENOAGE_CORRECTION: {
    org: 'PLoS Med',
    fa: 'تصحیحِ معادلهٔ سنِ فنوتیپی — بازگرداندنِ مرحلهٔ تبدیلِ ریسک به سال (۲۰۱۹)',
    title: 'Correction: A new aging measure captures morbidity and mortality risk across diverse subpopulations from NHANES IV (PLoS Med 2019;16(2):e1002760; PMID 30802240)',
    year: 2019,
    url: 'https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.1002760',
    access: 'open',
    scope:
      'ثابت‌های معادلهٔ منتشرشده: PhenoAge = 141.50 + ln(−0.00553 × ln(1 − M)) / 0.09165 و ' +
      'M = 1 − exp(−1.51714 × exp(xb) / 0.0076927)؛ بدونِ این مرحله معادلهٔ چاپ‌شده حل‌شدنی نیست. ' +
      '⚠️ بعضی بازنویسی‌ها 0.090165 دارند و اختلافشان در ۴۰ سالگی ≈ ۲ سال است.',
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
