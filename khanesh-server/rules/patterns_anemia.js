import { val } from "./patterns_utils.js";

// ==========================================
// جامع‌ترین الگوهای کم‌خونی (Anemia) بر اساس ASH/BSH
// طبقه‌بندی: میکروسیتیک (MCV<80)، نورموسیتیک (80-100)، ماکروسیتیک (MCV>100)
// مبنای آنمی: HGB پایین (در بزرگسالان Hgb<13 برای مردان و Hgb<12 برای زنان که توسط انجین محاسبه می‌شود)
// ==========================================

export const RULES_ANEMIA = [
  // ── بحران کم‌خونی (اورژانس) ──
  {
    id: "severe_anemia_crisis",
    match: (e) => {
      const hgb = e.graded.find((g) => g.test === "HGB");
      // اگر هموگلوبین زیر ۷.۰ باشد (یا زیر ۸.۰ برای بیماران پرخطر)
      return hgb && hgb.value !== null && Number(hgb.value) < 7.0;
    },
    build: (e) => {
      const hgb = e.graded.find((g) => g.test === "HGB");
      return {
        pattern: "severe_anemia_crisis",
        urgency: "emergency",
        headline: "بحران کم‌خونی شدید (اورژانس پزشکی)",
        must_say: `مقدار هموگلوبین شما ${hgb.value} است که افت بسیار شدیدی را نشان می‌دهد (کمتر از ۷.۰). این میزان از کم‌خونی باعث کاهش شدید اکسیژن‌رسانی به بافت‌های حیاتی از جمله قلب و مغز می‌شود و خطر جانی دارد.`,
        action: "فوراً و بدون اتلاف وقت به بخش اورژانس بیمارستان مراجعه کنید (احتمال نیاز فوری به تزریق خون وجود دارد).",
        suggest: ["تزریق خون (Blood Transfusion)", "CBC"],
        key_number: hgb.value
      };
    }
  },

  // ─────────────────────────────────────────
  // 1. کم‌خونی‌های میکروسیتیک (Microcytic)
  // ─────────────────────────────────────────
  {
    id: "anemia_microcytic_ida",
    match: (e) => {
      const hgb = e.graded.find((g) => g.test === "HGB");
      const isAnemia = hgb?.abnormal && hgb.dir === "low";
      const t = val(e);
      if (!isAnemia || t.MCV == null || t.MCV >= 80) return false;

      // فقر آهن: RDW بالا، MCH پایین، فریتین پایین (در صورت وجود)
      const rdwHigh = (t.RDW_CV != null && t.RDW_CV > 14.5) || (t.RDW_SD != null && t.RDW_SD > 56);
      const mchLow = e.graded.find((g) => g.test === "MCH" && g.dir === "low");
      const ferritinLow = e.graded.find((g) => g.test === "FERRITIN" && g.dir === "low");
      const tibcHigh = e.graded.find((g) => g.test === "TIBC" && g.dir === "high");

      return ferritinLow || tibcHigh || (rdwHigh && mchLow);
    },
    build: (e) => {
      return {
        pattern: "anemia_microcytic_ida",
        urgency: "this_week",
        headline: "کم‌خونی فقر آهن (احتمال بالا)",
        must_say: "گلبول‌های قرمز شما کوچک‌تر از حد طبیعی و دارای تنوع اندازه (RDW بالا) هستند. این الگو قویاً نشان‌دهنده کم‌خونی فقر آهن است. در مردان و زنان یائسه، بررسی دقیق علت دفع خون (به خصوص دستگاه گوارش) ضروری است. در زنان در سنین باروری معمولاً خونریزی‌های ماهانه عامل آن است.",
        action: "برای بررسی علت و شروع مصرف مکمل آهن به پزشک مراجعه کنید.",
        suggest: ["پنل کامل آهن", "فریتین"],
        warnings: ["از مصرف خودسرانه مکمل آهن پیش از تایید پزشک خودداری کنید."],
      };
    },
  },
  {
    id: "anemia_microcytic_thalassemia",
    match: (e) => {
      const hgb = e.graded.find((g) => g.test === "HGB");
      const isAnemia = hgb?.abnormal && hgb.dir === "low";
      const t = val(e);
      if (!isAnemia || t.MCV == null || t.MCV >= 80) return false;
      if (t.RBC == null) return false;

      const mentzerIndex = t.MCV / t.RBC;
      const rdwNormal = (t.RDW_CV != null && t.RDW_CV <= 14.5);
      // منتزر زیر 13 و RDW نرمال نشانه تالاسمی مینور
      return mentzerIndex < 13 && rdwNormal;
    },
    build: (e) => {
      return {
        pattern: "anemia_microcytic_thalassemia",
        urgency: "routine",
        headline: "الگوی مشکوک به تالاسمی مینور",
        must_say: "حجم گلبول‌های قرمز بسیار پایین است اما تعداد آن‌ها (RBC) طبیعی یا بالاست. این الگو (شاخص منتزر پایین) معمولاً به تالاسمی مینور اشاره دارد، که یک ویژگی ژنتیکی بی‌خطر است.",
        action: "اگر تاکنون آزمایش تخصصی تالاسمی نداده‌اید، با پزشک مطرح کنید.",
        suggest: ["الکتروفورز هموگلوبین", "فریتین"],
        warnings: [],
      };
    },
  },
  {
    id: "anemia_microcytic_acd",
    match: (e) => {
      const hgb = e.graded.find((g) => g.test === "HGB");
      const isAnemia = hgb?.abnormal && hgb.dir === "low";
      const t = val(e);
      if (!isAnemia || t.MCV == null || t.MCV >= 80) return false;
      
      const ferritin = e.graded.find((g) => g.test === "FERRITIN");
      const crp = e.graded.find((g) => g.test === "CRP_Q" && g.dir === "high");
      
      return (ferritin && !ferritin.abnormal) || (ferritin && ferritin.dir === "high") || crp;
    },
    build: (e) => {
      return {
        pattern: "anemia_microcytic_acd",
        urgency: "routine",
        headline: "کم‌خونی احتمالاً ناشی از التهاب یا بیماری مزمن",
        must_say: "با وجود کوچک بودن گلبول‌ها، نشانه‌ای از کمبود آهن نیست (یا شاخص‌های التهابی بالا هستند). این نوع کم‌خونی معمولاً در اثر بیماری‌های زمینه‌ای مزمن (مثل روماتیسم، عفونت مزمن یا مشکلات کلیوی) رخ می‌دهد.",
        action: "در نوبت عادی با پزشک معالج بیماری‌های زمینه‌ای خود مشورت کنید.",
        suggest: ["TIBC", "CRP"],
        warnings: [],
      };
    },
  },

  // ─────────────────────────────────────────
  // 2. کم‌خونی‌های نورموسیتیک (Normocytic)
  // ─────────────────────────────────────────
  {
    id: "anemia_hemolytic",
    match: (e) => {
      const hgb = e.graded.find((g) => g.test === "HGB");
      const isAnemia = hgb?.abnormal && hgb.dir === "low";
      if (!isAnemia) return false;
      
      const retic = e.graded.find((g) => g.test === "RETIC" && g.dir === "high");
      const ldh = e.graded.find((g) => g.test === "LDH" && g.dir === "high");
      const biliInd = e.graded.find((g) => g.test === "BILI_I" && g.dir === "high");
      
      return retic && (ldh || biliInd);
    },
    build: (e) => {
      return {
        pattern: "anemia_hemolytic",
        urgency: "this_week",
        headline: "کم‌خونی همولیتیک (تخریب زودرس گلبول‌ها)",
        must_say: "افت هموگلوبین به همراه افزایش رتیکولوسیت و آنزیم‌ها نشان‌دهنده تولید فعال اما تخریب زودرس گلبول‌های قرمز در خون (همولیز) است.",
        action: "برای بررسی دقیق علت همولیز به پزشک متخصص داخلی یا خون مراجعه کنید.",
        suggest: ["تست کومبس", "گسترش خون محیطی", "هاپتوگلوبین"],
        warnings: [],
      };
    },
  },
  {
    id: "anemia_normocytic_ckd",
    match: (e) => {
      const hgb = e.graded.find((g) => g.test === "HGB");
      const isAnemia = hgb?.abnormal && hgb.dir === "low";
      const t = val(e);
      if (!isAnemia || t.MCV == null || t.MCV < 80 || t.MCV > 100) return false;
      
      return t.EGFR != null && t.EGFR < 60;
    },
    build: (e) => {
      return {
        pattern: "anemia_normocytic_ckd",
        urgency: "routine",
        headline: "کم‌خونی مرتبط با عملکرد کلیه",
        must_say: "اندازه گلبول‌ها نرمال است، اما به دلیل افت عملکرد کلیه (eGFR پایین)، تولید هورمون سازنده خون (اریتروپویتین) کاهش یافته است.",
        action: "این موضوع را با نفرولوژیست (متخصص کلیه) خود در میان بگذارید.",
        suggest: ["آهن سرم", "فریتین", "رتیکولوسیت"],
        warnings: [],
      };
    },
  },

  // ─────────────────────────────────────────
  // 3. کم‌خونی‌های ماکروسیتیک (Macrocytic)
  // ─────────────────────────────────────────
  {
    id: "anemia_macrocytic_megaloblastic",
    match: (e) => {
      const hgb = e.graded.find((g) => g.test === "HGB");
      const isAnemia = hgb?.abnormal && hgb.dir === "low";
      const t = val(e);
      if (!isAnemia || t.MCV == null || t.MCV <= 100) return false;

      const mcvHigh = t.MCV > 105;
      const rdwHigh = (t.RDW_CV != null && t.RDW_CV > 15) || (t.RDW_SD != null && t.RDW_SD > 56);
      
      return mcvHigh && rdwHigh;
    },
    build: (e) => {
      return {
        pattern: "anemia_macrocytic_megaloblastic",
        urgency: "this_week",
        headline: "کم‌خونی ماکروسیتیک (احتمال کمبود ویتامین B12 یا فولات)",
        must_say: "حجم گلبول‌های قرمز به وضوح بزرگتر از حد طبیعی است (MCV بالا) و تنوع اندازه بالایی دارند. این الگو در کمبود ویتامین B12 و اسید فولیک دیده می‌شود که برای ساختار سلول‌های خونی ضروری‌اند.",
        action: "در اسرع وقت با پزشک مشورت کنید تا سطح این ویتامین‌ها بررسی شود.",
        suggest: ["ویتامین B12", "فولات", "گسترش خون محیطی"],
        warnings: [],
      };
    },
  },
  {
    id: "anemia_macrocytic_non_megaloblastic",
    match: (e) => {
      const hgb = e.graded.find((g) => g.test === "HGB");
      const isAnemia = hgb?.abnormal && hgb.dir === "low";
      const t = val(e);
      if (!isAnemia || t.MCV == null || t.MCV <= 100) return false;

      // تشخیص غیر مگالوبلاستیک وقتی است که MCV بالا اما نه خیلی بالا (مثلاً تا 105) باشد، یا همراهی با کبد/تیروئید باشد
      const liverAbnormal = e.graded.some((g) => ["AST", "ALT", "GGT"].includes(g.test) && g.abnormal);
      const tshHigh = e.graded.find((g) => g.test === "TSH" && g.dir === "high");
      
      return liverAbnormal || tshHigh;
    },
    build: (e) => {
      return {
        pattern: "anemia_macrocytic_non_megaloblastic",
        urgency: "routine",
        headline: "بزرگ شدن گلبول‌های قرمز به علل غیرویتامینی",
        must_say: "حجم گلبول‌های قرمز بزرگتر از طبیعی است که با توجه به سایر آزمایش‌ها می‌تواند ناشی از کم‌کاری تیروئید یا اختلالات کبدی باشد.",
        action: "در زمان ویزیت به پزشک خود این موضوع را اطلاع دهید.",
        suggest: ["پایش دوره‌ای TSH", "تست‌های کبدی"],
        warnings: [],
      };
    },
  }
];
