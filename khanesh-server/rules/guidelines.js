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
    scope: 'TRAb در پرکاریِ آشکار حساسیت ۹۶–۹۷٪ و ویژگی ۹۹٪ برای گریوز؛ توصیه‌های ۹۲–۹۳ دربارهٔ TRAb در بارداری؛ توصیه‌های ۷۳–۷۴: TSHِ پایدارِ < ۰٫۱ mU/L ⇒ درمانِ پرکاریِ تحت‌بالینی توصیه/بررسی می‌شود',
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
    scope: 'مکانیسمِ ساده‌شدهٔ یافته‌های آزمایشگاهی؛ رابدومیولیز: CK > ۵×ULN (مثلاً > 1000 U/L)',
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
