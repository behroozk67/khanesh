import { val } from "./patterns_utils.js";

// ==========================================
// الگوهای بدخیمی و اختلالات شدید خونی (NCCN, WHO, ASH)
// شامل: MDS, AML/ALL, CLL, CML, ITP, TTP
// ==========================================

export const RULES_MALIGNANCY = [
  // ─────────────────────────────────────────
  // 0. زنجیره‌های سبک و گاموپاتی مونوکلونال (MGUS / Multiple Myeloma)
  // ─────────────────────────────────────────
  {
    id: "monoclonal_gammopathy_lambda",
    match: (e) => {
      // پیدا کردن تستی که شامل کلمه LAMBDA یا لامبدا است و مقدارش بالا (high) است
      const lam = e.graded.find((g) => (g.test.includes("LAMBDA") || g.test.includes("لامبدا")) && g.dir === "high");
      return !!lam;
    },
    build: (e) => {
      const lam = e.graded.find((g) => (g.test.includes("LAMBDA") || g.test.includes("لامبدا")));
      return {
        pattern: "monoclonal_gammopathy_lambda",
        urgency: "this_week",
        headline: "افزایش زنجیره سبک لامبدا (Lambda FLC)",
        must_say: `میزان پروتئین لامبدا در آزمایش شما ${lam.value} است که بالاتر از حد طبیعی است. افزایش نامتقارن زنجیره‌های سبک ایمونوگلوبولین می‌تواند نشان‌دهنده تولید بیش از حد این پروتئین‌ها توسط سلول‌های پلاسما در مغز استخوان باشد (مانند وضعیت MGUS یا میلوم متعدد).`,
        action: "جهت بررسی‌های تکمیلی (نظیر الکتروفورز پروتئین‌های خون و ادرار) حتماً در اولین فرصت با متخصص خون و سرطان (هماتولوژیست) مشورت کنید.",
        suggest: ["SPEP", "UPEP", "کلسیم", "کراتینین"],
        key_number: lam.value
      };
    }
  },
  {
    id: "monoclonal_gammopathy_kappa",
    match: (e) => {
      const kap = e.graded.find((g) => (g.test.includes("KAPPA") || g.test.includes("کاپا")) && g.dir === "high");
      return !!kap;
    },
    build: (e) => {
      const kap = e.graded.find((g) => (g.test.includes("KAPPA") || g.test.includes("کاپا")));
      return {
        pattern: "monoclonal_gammopathy_kappa",
        urgency: "this_week",
        headline: "افزایش زنجیره سبک کاپا (Kappa FLC)",
        must_say: `میزان پروتئین کاپا در آزمایش شما ${kap.value} است که بالاتر از حد طبیعی است. این الگو می‌تواند نشانه اختلالات سلول‌های پلاسما باشد و نیاز به پیگیری دارد.`,
        action: "جهت ارزیابی و انجام تست‌های الکتروفورز پروتئین به متخصص خون (هماتولوژیست) مراجعه کنید.",
        suggest: ["SPEP", "UPEP"],
        key_number: kap.value
      };
    }
  },

  // ─────────────────────────────────────────
  // 1. Myelodysplastic Syndromes (MDS)
  // ─────────────────────────────────────────
  {
    id: "mds_suspicion",
    match: (e) => {
      if (!e.age || e.age < 60) return false;
      const t = val(e);
      if (t.MCV == null || t.MCV <= 100) return false;

      // جستجوی سایتوپنی
      let cytopenias = 0;
      const hgb = e.graded.find((g) => g.test === "HGB");
      if (hgb?.abnormal && hgb.dir === "low" && t.HGB < 10) cytopenias++;
      
      const plt = e.graded.find((g) => g.test === "PLT");
      if (plt?.abnormal && plt.dir === "low" && t.PLT < 100) cytopenias++;
      
      const neut = e.graded.find((g) => g.test === "NEUT_ABS");
      if (neut?.abnormal && neut.dir === "low" && t.NEUT_ABS < 1800) cytopenias++;

      // آنمی ماکروسیتیک + حداقل یک سایتوپنی دیگر (جمعاً ۲ مورد)
      return cytopenias >= 2;
    },
    build: (e) => {
      return {
        pattern: "mds_suspicion",
        urgency: "this_week",
        headline: "نقص در تولید سلول‌های خونی؛ نیاز به بررسی تخصصی",
        must_say: "ترکیب بزرگ بودن گلبول‌های قرمز (MCV بالا) همراه با افت غیرطبیعی بیش از یک رده خونی (مثل هموگلوبین و پلاکت) در سنین بالاتر از ۶۰ سال، می‌تواند نشانه‌ای از سندرم‌های نارسایی مغز استخوان نظیر MDS باشد.",
        action: "در اسرع وقت برای بررسی مورفولوژیک به یک هماتولوژیست (متخصص خون) مراجعه کنید.",
        suggest: ["گسترش خون محیطی (Peripheral Smear)", "معاینه کامل بالینی"],
        warnings: ["لطفاً از مصرف مکمل‌های تقویتی بدون دستور پزشک پرهیز کرده و پیگیری تخصصی را در اولویت قرار دهید."],
      };
    },
  },

  // ─────────────────────────────────────────
  // 2. Acute Leukemia (AML / ALL)
  // ─────────────────────────────────────────
  {
    id: "acute_leukemia_suspicion",
    match: (e) => {
      const t = val(e);
      if (t.WBC == null || t.WBC <= 50) return false; // WBC > 50k

      const hgb = e.graded.find((g) => g.test === "HGB");
      const hgbSevere = hgb?.abnormal && hgb.dir === "low" && t.HGB < 8;

      const plt = e.graded.find((g) => g.test === "PLT");
      const pltSevere = plt?.abnormal && plt.dir === "low" && t.PLT < 50;

      return hgbSevere || pltSevere;
    },
    build: (e) => {
      return {
        pattern: "acute_leukemia_suspicion",
        urgency: "emergency",
        headline: "اختلال شدید و خطرناک در سلول‌های خون (اورژانس)",
        must_say: "افزایش بسیار شدید و غیرطبیعی گلبول‌های سفید همراه با افت شدید گلبول‌های قرمز یا پلاکت‌ها، یک اورژانس خونی است که خطر بالای بدخیمی‌های حاد خونی (مثل لوسمی حاد) را مطرح می‌کند.",
        action: "بدون هیچ‌گونه تأخیر، مستقیماً به اورژانس یک بیمارستان مجهز (ترجیحاً دارای بخش خون) مراجعه کنید.",
        suggest: ["ارجاع فوری اورژانسی"],
        warnings: ["این یک وضعیت تهدیدکننده حیات است و هرگونه تأخیر در پیگیری پزشکی عواقب جبران‌ناپذیری دارد."],
      };
    },
  },

  // ─────────────────────────────────────────
  // 3. Chronic Lymphocytic Leukemia (CLL)
  // ─────────────────────────────────────────
  {
    id: "cll_suspicion_nccn",
    match: (e) => {
      if (!e.age || e.age < 50) return false;
      const lymph = e.graded.find((g) => g.test === "LYMPH_ABS");
      return lymph?.abnormal && lymph.dir === "high" && lymph.value > 5000;
    },
    build: (e) => {
      return {
        pattern: "cll_suspicion_nccn",
        urgency: "this_week",
        headline: "افزایش شدید لنفوسیت‌ها؛ نیازمند بررسی تخصصی خون",
        must_say: "شمارش لنفوسیت‌های خون شما به شکل چشمگیری افزایش یافته است. در حالی که ویروس‌ها عامل شایعی هستند، اما این سطح از افزایش پایدار در سنین بالاتر، حتماً نیازمند ارزیابی دقیق برای رد اختلالات لنفوپرولیفراتیو (مانند CLL) است.",
        action: "حتماً در اسرع وقت برای بررسی دقیق‌تر به پزشک متخصص داخلی یا خون (هماتولوژیست) مراجعه کنید.",
        suggest: ["گسترش خون محیطی (Peripheral Smear)", "فلوسیتومتری خون محیطی (Flow Cytometry)", "LDH"],
        warnings: ["لطفاً این نتیجه را نادیده نگیرید و پیگیری پزشکی را انجام دهید."],
      };
    },
  },

  // ─────────────────────────────────────────
  // 4. Chronic Myeloid Leukemia (CML)
  // ─────────────────────────────────────────
  {
    id: "cml_suspicion",
    match: (e) => {
      const t = val(e);
      if (t.WBC == null || t.WBC <= 50) return false; // WBC > 50k

      const baso = e.graded.find((g) => g.test === "BASO_ABS");
      return baso?.abnormal && baso.dir === "high";
    },
    build: (e) => {
      return {
        pattern: "cml_suspicion",
        urgency: "this_week",
        headline: "افزایش شدید گلبول‌های سفید و بازوفیل‌ها",
        must_say: "لکوسیتوز بسیار شدید (بالای ۵۰ هزار) همراه با افزایش غیرطبیعی بازوفیل‌ها، الگویی است که قویاً نیازمند رد کردن اختلالات میلوپرولیفراتیو مزمن (مانند CML) است.",
        action: "بدون تأخیر به متخصص خون (هماتولوژیست) مراجعه کنید.",
        suggest: ["تست ژنتیک BCR-ABL", "گسترش خون محیطی"],
        warnings: [],
      };
    },
  },

  // ─────────────────────────────────────────
  // 5. ITP (Immune Thrombocytopenia)
  // ─────────────────────────────────────────
  {
    id: "isolated_thrombocytopenia",
    match: (e) => {
      const plt = e.graded.find((g) => g.test === "PLT");
      const pltLow = plt?.abnormal && plt.dir === "low";
      if (!pltLow) return false;

      const t = val(e);
      if (t.PLT > 100) return false;

      const hgb = e.graded.find((g) => g.test === "HGB");
      const wbc = e.graded.find((g) => g.test === "WBC");

      return (!hgb || !hgb.abnormal) && (!wbc || !wbc.abnormal);
    },
    build: (e) => {
      const t = val(e);
      const isCritical = t.PLT < 30;
      return {
        pattern: "isolated_thrombocytopenia",
        urgency: isCritical ? "today" : "this_week",
        headline: "افت ایزوله پلاکت‌ها (ترومبوسیتوپنی)",
        must_say: `شمارش پلاکت‌های شما به زیر ۱۰۰ هزار افت کرده در حالی که سایر رده‌های خونی طبیعی هستند. این حالت می‌تواند ایمنی (ITP) یا ثانویه به عفونت‌های ویروسی باشد.${isCritical ? ' افت شدید زیر ۳۰ هزار خطر خونریزی را به شدت بالا می‌برد.' : ''}`,
        action: isCritical ? "امروز بلافاصله به اورژانس یا هماتولوژیست مراجعه کنید." : "در هفته جاری به پزشک داخلی یا خون مراجعه کنید.",
        suggest: ["بررسی اسمیر برای رد کلامپ پلاکتی", "تست‌های ویروسی HCV و HIV"],
        warnings: isCritical ? ["از هرگونه فعالیت فیزیکی شدید که خطر ضربه دارد خودداری کنید."] : [],
      };
    },
  },

  // ─────────────────────────────────────────
  // 6. MAHA / TTP
  // ─────────────────────────────────────────
  {
    id: "maha_ttp_suspicion",
    match: (e) => {
      const t = val(e);
      if (t.PLT == null || t.HGB == null) return false;

      const hgbLow = e.graded.find((g) => g.test === "HGB" && g.dir === "low");
      const pltLow = e.graded.find((g) => g.test === "PLT" && g.dir === "low");

      return hgbLow && t.HGB < 10 && pltLow && t.PLT < 50;
    },
    build: (e) => {
      return {
        pattern: "maha_ttp_suspicion",
        urgency: "emergency",
        headline: "افت همزمان و شدید پلاکت و هموگلوبین (اورژانس خونی)",
        must_say: "افت توأم و شدید هموگلوبین و پلاکت در خون، زنگ خطری جدی برای سندرم‌های میکروآنژیوپاتیک (مثل TTP یا HUS) است که با تخریب سریع سلول‌ها همراهند.",
        action: "بدون اتلاف وقت فوراً به اورژانس مراجعه کنید.",
        suggest: ["گسترش خون محیطی جهت رویت شیستوسیت", "LDH", "آزمایش انعقادی"],
        warnings: ["این وضعیت یک اورژانس واقعی است و نباید منتظر نوبت مطب بمانید."],
      };
    },
  }
];
