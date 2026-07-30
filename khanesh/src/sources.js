// ============================================================
// آینهٔ سبکِ رجیستریِ استنادِ موتور (khanesh-server/rules/guidelines.js).
//
// ⚠️ چرا کپی و نه import: فرانت و بک‌اند دو پکیجِ جدا با دو package.json‌اند و
//    هیچ کدام دیگری را import نمی‌کند. این فایل عمداً کپیِ کوچکی از همان
//    رجیستری است — دقیقاً مثل REF در labRefs.js که کپیِ refs.js است.
//    اگر در guidelines.js عنوان، سال یا آدرسی عوض شد، اینجا هم باید عوض شود.
//
// ⚠️ قاعدهٔ منبعِ پولی، همان قاعدهٔ سمتِ سرور: منبعی که پشتِ پول‌بان است
//    (UpToDate، BMJ Best Practice، خودِ اسناد CLSI) هرگز طوری استناد نمی‌شود
//    که انگار خوانده شده. آن‌ها اینجا اصلاً نیامده‌اند؛ به‌جایشان همان منبعِ
//    بازی آمده که عدد واقعاً از آن گرفته شده.
// ============================================================

export const SRC = {
  WHO_ANAEMIA: {
    org: "WHO", year: "۲۰۲۴",
    fa: "راهنمای سازمان جهانی بهداشت دربارهٔ آستانه‌های هموگلوبین برای تعریف کم‌خونی",
    en: "Guideline on haemoglobin cutoffs to define anaemia in individuals and populations",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK602198/",
  },
  WHO_FERRITIN: {
    org: "WHO", year: "۲۰۲۰",
    fa: "راهنمای سازمان جهانی بهداشت دربارهٔ کاربرد فریتین در ارزیابی وضعیت آهن",
    en: "WHO guideline on use of ferritin concentrations to assess iron status",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK569877/",
  },
  KDIGO_CKD: {
    org: "KDIGO", year: "۲۰۲۴",
    fa: "راهنمای بالینی KDIGO برای ارزیابی و مدیریت بیماری مزمن کلیه",
    en: "KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of CKD",
    url: "https://kdigo.org/wp-content/uploads/2024/03/KDIGO-2024-CKD-Guideline.pdf",
  },
  ADA_SOC: {
    org: "ADA", year: "۲۰۲۵",
    fa: "استانداردهای مراقبت در دیابت — طبقه‌بندی و تشخیص",
    en: "Standards of Care in Diabetes — Classification and Diagnosis",
    url: "https://diabetesjournals.org/care/issue/48/Supplement_1",
  },
  ESC_EAS_LIPID: {
    org: "ESC/EAS", year: "۲۰۱۹",
    fa: "راهنمای ESC/EAS برای مدیریت اختلالات چربی خون",
    en: "2019 ESC/EAS Guidelines for the management of dyslipidaemias",
    url: "https://eas-society.org/wp-content/uploads/2022/11/2019_dyslipidaemias_guidelin.pdf",
  },
  ACG_LIVER: {
    org: "ACG", year: "۲۰۱۷",
    fa: "راهنمای بالینی ACG برای بررسی آزمایش‌های غیرطبیعی کبد",
    en: "ACG Clinical Guideline: Evaluation of Abnormal Liver Chemistries",
    url: "https://acgcdn.gi.org/wp-content/uploads/2018/04/ACG-Abnormal-Liver-Chemistries-Guideline-Summary.pdf",
  },
  AASLD: {
    org: "AASLD", year: "۲۰۲۳",
    fa: "راهنمای عملی AASLD (هپاتیت B و هپاتیت C)",
    en: "AASLD practice guidance (hepatitis B / hepatitis C)",
    url: "https://www.aasld.org/practice-guidelines",
  },
  CDC_SEROLOGY: {
    org: "CDC", year: "۲۰۲۳",
    fa: "الگوریتم‌های آزمایشگاهی CDC برای HIV، HCV و HBV",
    en: "CDC laboratory testing algorithms (HIV, HCV, HBV)",
    url: "https://www.cdc.gov/hiv/clinicians/screening/laboratory-testing.html",
  },
  IR_BRUCELLOSIS: {
    org: "وزارت بهداشت ایران", year: "۲۰۱۹",
    fa: "راهنمای کشوری تشخیص و درمان بروسلوز (تب مالت)",
    en: null, url: null,
  },
  ENDO_VIT_D: {
    org: "Endocrine Society", year: "۲۰۱۱",
    fa: "ارزیابی، درمان و پیشگیری از کمبود ویتامین D",
    en: "Evaluation, Treatment, and Prevention of Vitamin D Deficiency",
    url: "https://pubmed.ncbi.nlm.nih.gov/21646368/",
  },
  ENDOCRINE_SOCIETY: {
    org: "Endocrine Society", year: "۲۰۲۴",
    fa: "راهنماهای بالینی و مراقبت از بیمار انجمن اندوکرینولوژی آمریکا",
    en: "Endocrine Society Clinical Practice Guidelines",
    url: "https://www.endocrine.org/clinical-practice-guidelines",
  },
  AAAAI: {
    org: "AAAAI", year: "۲۰۲۶",
    fa: "منابع بیمار-محور و پارامترهای عملیِ آکادمی آلرژی، آسم و ایمونولوژی آمریکا",
    en: "American Academy of Allergy, Asthma & Immunology — patient resources and practice parameters",
    url: "https://www.aaaai.org/",
  },
  EAACI: {
    org: "EAACI", year: "۲۰۲۶",
    fa: "راهنماهای آکادمی اروپایی آلرژی و ایمونولوژی بالینی",
    en: "European Academy of Allergy and Clinical Immunology — guidelines",
    url: "https://www.eaaci.org/",
  },
  ACR_EULAR: {
    org: "ACR/EULAR", year: "۲۰۱۰",
    fa: "معیارهای طبقه‌بندی آرتریت روماتوئید",
    en: "2010 ACR/EULAR classification criteria for rheumatoid arthritis",
    url: "https://pubmed.ncbi.nlm.nih.gov/20699241/",
  },
  CTCAE: {
    org: "NCI", year: "۲۰۱۷",
    fa: "معیارهای اصطلاح‌شناسی رایج برای رویدادهای ناخواسته (CTCAE) نسخهٔ ۵",
    en: "Common Terminology Criteria for Adverse Events (CTCAE) v5.0",
    url: "https://ctep.cancer.gov/protocoldevelopment/electronic_applications/ctc.htm",
  },
  ISTH: {
    org: "ISTH", year: "۲۰۰۱",
    fa: "سامانهٔ امتیازدهی ISTH برای انعقاد منتشر داخل عروقی (DIC)",
    en: "ISTH overt DIC scoring system",
    url: "https://pubmed.ncbi.nlm.nih.gov/11816725/",
  },
  IFCC: {
    org: "IFCC", year: "۲۰۱۱",
    fa: "سامانهٔ مرجع IFCC برای HbA1c و معادلهٔ اصلی IFCC/NGSP",
    en: "IFCC reference measurement system for HbA1c + IFCC/NGSP master equation",
    url: "https://ngsp.org/ifccngsp.asp",
  },
  EFLM_BV: {
    org: "EFLM", year: "۲۰۲۶",
    fa: "پایگاه دادهٔ تغییرات زیستی EFLM",
    en: "EFLM Biological Variation Database",
    url: "https://biologicalvariation.eu/",
  },
  HENRY: {
    org: "Henry's Clinical Diagnosis", year: "۲۰۲۱",
    fa: "تشخیص و مدیریت بالینی با روش‌های آزمایشگاهی، پیوست A5 (محدوده‌های مرجع بزرگسالان)",
    en: "Henry's Clinical Diagnosis and Management by Laboratory Methods, Appendix A5",
    url: null,
  },
  RCPCH: {
    org: "RCPCH", year: "۲۰۱۶",
    fa: "محدوده‌های مرجع کودکان",
    en: "RCPCH paediatric reference ranges",
    url: null,
  },
  MEDLINEPLUS: {
    org: "NLM MedlinePlus", year: "۲۰۲۶",
    fa: "موضوع‌های سلامت و اطلاعات آزمایش‌ها",
    en: "MedlinePlus health topics & lab test information",
    url: "https://medlineplus.gov/",
  },
  MERCK_PRO: {
    org: "Merck Manual Professional", year: "۲۰۲۶",
    fa: "نسخهٔ حرفه‌ایِ راهنمای مرک",
    en: "MSD/Merck Manual Professional Edition",
    url: "https://www.msdmanuals.com/professional",
  },
  /* ---------- منابعِ صفحه‌های آزمایش‌های بیرون از فرم ---------- */
  // همان قاعدهٔ بالا اینجا هم برقرار است: هر مدخل باید صفحه یا سندی باشد که
  // بدونِ اشتراک باز می‌شود. جایی که راهنمای مرجع پولی بوده (مثلاً بولتن‌های
  // ACOG یا اسناد NCCN)، به‌جایش منبعِ بازِ همان نهاد یا نهادِ دیگری آمده که
  // عدد واقعاً از آن گرفته شده.
  ATA: {
    org: "ATA", year: "۲۰۱۶",
    fa: "راهنماهای بالینی انجمن تیروئید آمریکا (کم‌کاری، پرکاری، ندول و سرطان تیروئید)",
    en: "American Thyroid Association clinical practice guidelines",
    url: "https://www.thyroid.org/professionals/ata-professional-guidelines/",
  },
  USPSTF: {
    org: "USPSTF", year: "۲۰۲۶",
    fa: "توصیه‌های نیروی ویژهٔ خدمات پیشگیرانهٔ آمریکا دربارهٔ غربالگری",
    en: "U.S. Preventive Services Task Force recommendation statements",
    url: "https://www.uspreventiveservicestaskforce.org/uspstf/topic_search_results?topic_status=P",
  },
  ACC_AHA: {
    org: "ACC/AHA", year: "۲۰۱۸",
    fa: "راهنمای ACC/AHA برای مدیریت کلسترول خون",
    en: "2018 AHA/ACC Guideline on the Management of Blood Cholesterol",
    url: "https://www.ahajournals.org/doi/10.1161/CIR.0000000000000625",
  },
  ESC_ACS: {
    org: "ESC", year: "۲۰۲۳",
    fa: "راهنمای ESC برای سندرم حاد کرونری (الگوریتم تروپونین حساس)",
    en: "2023 ESC Guidelines for the management of acute coronary syndromes",
    url: "https://academic.oup.com/eurheartj/article/44/38/3720/7243210",
  },
  ESC_HF: {
    org: "ESC", year: "۲۰۲۱",
    fa: "راهنمای ESC برای نارسایی حاد و مزمن قلب (آستانه‌های ناتری‌ورتیک پپتید)",
    en: "2021 ESC Guidelines for the diagnosis and treatment of acute and chronic heart failure",
    url: "https://academic.oup.com/eurheartj/article/42/36/3599/6358045",
  },
  ASH: {
    org: "ASH", year: "۲۰۲۶",
    fa: "راهنماهای بالینی انجمن هماتولوژی آمریکا",
    en: "American Society of Hematology clinical practice guidelines",
    url: "https://www.hematology.org/education/clinicians/guidelines-and-quality-care/clinical-practice-guidelines",
  },
  ACR_RHEUM: {
    org: "ACR", year: "۲۰۲۶",
    fa: "راهنماهای بالینی کالج روماتولوژی آمریکا",
    en: "American College of Rheumatology clinical practice guidelines",
    url: "https://rheumatology.org/clinical-practice-guidelines",
  },
  IDSA: {
    org: "IDSA", year: "۲۰۲۶",
    fa: "راهنماهای بالینی انجمن بیماری‌های عفونی آمریکا",
    en: "Infectious Diseases Society of America practice guidelines",
    url: "https://www.idsociety.org/practice-guideline/practice-guidelines/",
  },
  CDC_STI: {
    org: "CDC", year: "۲۰۲۱",
    fa: "راهنمای درمان عفونت‌های منتقله از راه جنسی",
    en: "CDC Sexually Transmitted Infections Treatment Guidelines",
    url: "https://www.cdc.gov/std/treatment-guidelines/default.htm",
  },
  CDC_TB: {
    org: "CDC", year: "۲۰۲۶",
    fa: "آزمایش و تشخیص عفونت سل (PPD و آزمایش‌های آزادسازی اینترفرون گاما)",
    en: "CDC — Testing and Diagnosis for Tuberculosis",
    url: "https://www.cdc.gov/tb/hcp/testing-diagnosis/",
  },
  CDC_LEAD: {
    org: "CDC", year: "۲۰۲۱",
    fa: "مقدار مرجع سرب خون در کودکان",
    en: "CDC Blood Lead Reference Value",
    url: "https://www.cdc.gov/lead-prevention/php/news-features/updates-blood-lead-reference-value.html",
  },
  ATSDR: {
    org: "ATSDR", year: "۲۰۲۶",
    fa: "پروفایل‌های سم‌شناسی فلزات سنگین (سرب، جیوه، آرسنیک، کادمیوم…)",
    en: "ATSDR Toxicological Profiles",
    url: "https://www.atsdr.cdc.gov/toxprofiledocs/index.html",
  },
  SAMHSA_DRUG: {
    org: "SAMHSA", year: "۲۰۲۳",
    fa: "راهنماهای الزامی آزمایش مواد در محیط کار فدرال (آستانه‌های غربالگری و تأیید)",
    en: "Mandatory Guidelines for Federal Workplace Drug Testing Programs",
    url: "https://www.samhsa.gov/substance-use/prevention/workplace/drug-testing",
  },
  ACMG: {
    org: "ACMG", year: "۲۰۲۶",
    fa: "بیانیه‌ها و راهنماهای عملی کالج ژنتیک پزشکی و ژنومیکس آمریکا",
    en: "American College of Medical Genetics and Genomics practice resources",
    url: "https://www.acmg.net/ACMG/Medical-Genetics-Practice-Resources/Practice-Guidelines.aspx",
  },
  ACOG_FAQ: {
    // ⚠️ بولتن‌های عملیِ ACOG پشتِ اشتراک‌اند؛ آنچه اینجا استناد می‌شود
    //    صفحه‌های بازِ بیمار-محورِ همان نهاد است.
    org: "ACOG", year: "۲۰۲۶",
    fa: "پرسش‌های متداول و راهنماییِ بالینیِ بازِ کالج زنان و زایمان آمریکا",
    en: "ACOG — patient FAQs and open clinical guidance",
    url: "https://www.acog.org/womens-health/faqs",
  },
  ASRM: {
    org: "ASRM", year: "۲۰۲۶",
    fa: "اسناد کمیتهٔ عملی انجمن پزشکی باروری آمریکا",
    en: "ASRM Practice Committee documents",
    url: "https://www.asrm.org/practice-guidance/practice-committee-documents/",
  },
  WHO_SEMEN: {
    org: "WHO", year: "۲۰۲۱",
    fa: "کتابچهٔ آزمایشگاهی سازمان جهانی بهداشت برای بررسی و پردازش مایع منی انسان، ویرایش ششم",
    en: "WHO laboratory manual for the examination and processing of human semen, 6th ed.",
    url: "https://www.who.int/publications/i/item/9789240030787",
  },
  WHO_HIV: {
    org: "WHO", year: "۲۰۲۴",
    fa: "راهنمای یکپارچهٔ سازمان جهانی بهداشت دربارهٔ آزمایش HIV",
    en: "WHO consolidated guidelines on HIV testing services",
    url: "https://www.who.int/publications/i/item/9789240096394",
  },
  NIH_ODS: {
    org: "NIH ODS", year: "۲۰۲۶",
    fa: "برگه‌های اطلاعاتی ریزمغذی‌های دفتر مکمل‌های غذایی مؤسسهٔ ملی سلامت آمریکا",
    en: "NIH Office of Dietary Supplements — nutrient fact sheets",
    url: "https://ods.od.nih.gov/factsheets/list-all/",
  },
  ASCO: {
    org: "ASCO", year: "۲۰۲۶",
    fa: "راهنماهای بالینی انجمن انکولوژی بالینی آمریکا (از جمله نشانگرهای تومور)",
    en: "American Society of Clinical Oncology clinical practice guidelines",
    url: "https://www.asco.org/practice-patients/guidelines",
  },
  NICE: {
    org: "NICE", year: "۲۰۲۶",
    fa: "راهنماهای مؤسسهٔ ملی تعالی سلامت و مراقبت بریتانیا",
    en: "National Institute for Health and Care Excellence guidance",
    url: "https://www.nice.org.uk/guidance",
  },
  FDA_HOME: {
    org: "FDA", year: "۲۰۲۶",
    fa: "آزمایش‌های خانگی و تشخیص آزمایشگاهی برون‌تنی",
    en: "FDA — Home Use Tests (in vitro diagnostics)",
    url: "https://www.fda.gov/medical-devices/in-vitro-diagnostics/home-use-tests",
  },
  IR_THAL: {
    org: "وزارت بهداشت ایران", year: "۲۰۲۰",
    fa: "برنامهٔ کشوری غربالگری تالاسمی پیش از ازدواج",
    en: null, url: null,
  },
  CLSI_SUB: {
    // ⚠️ خودِ اسناد CLSI پولی‌اند؛ همان جایگزینِ بازی استناد می‌شود که سمتِ
    //    سرور هم استناد می‌کند — نه آدرسِ پولی.
    org: "Biochemia Medica", year: "۲۰۱۱",
    fa: "تداخل همولیز بر پارامترهای بیوشیمی (جایگزینِ بازِ استاندارد CLSI)",
    en: "Lippi et al., Biochemia Medica 2011;21(1):79-85",
    url: "https://pubmed.ncbi.nlm.nih.gov/22141206/",
  },
};

export const cite = (id) => SRC[id];
