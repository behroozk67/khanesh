import { val, rankOf, has } from "./patterns_utils.js";

export const RULES_ENDOCRINE_NEW = [
  // ── تیروئید ──
  {
    id: "overt_hypothyroidism",
    match: (e) => {
      const tsh = val(e).TSH;
      const fT4 = val(e).FT4;
      return tsh != null && fT4 != null && tsh > 4.5 && fT4 < 0.8;
    },
    build: (e) => {
      return {
        pattern: "overt_hypothyroidism",
        urgency: "routine",
        headline: "کم‌کاری واضح تیروئید (Overt Hypothyroidism)",
        must_say: `TSH شما بالا (${val(e).TSH}) و T4 آزاد شما پایین (${val(e).FT4}) است. این الگو نشان‌دهنده کم‌کاری قطعی تیروئید است. در صورت بارداری یا قصد بارداری این مورد اهمیت دوچندان پیدا می‌کند.`,
        action: "با متخصص غدد برای شروع داروی لووتیروکسین مشورت کنید.",
        suggest: ["Anti-TPO", "پنل چربی"],
        key_number: val(e).TSH
      };
    }
  },
  {
    id: "overt_thyrotoxicosis",
    match: (e) => {
      const tsh = val(e).TSH;
      const fT4 = val(e).FT4;
      const fT3 = val(e).FT3;
      return tsh != null && tsh < 0.1 && ((fT4 != null && fT4 > 1.8) || (fT3 != null && fT3 > 4.4));
    },
    build: (e) => {
      return {
        pattern: "overt_thyrotoxicosis",
        urgency: "this_week",
        headline: "پُرکاری واضح تیروئید (Thyrotoxicosis)",
        must_say: `TSH شما بسیار پایین (${val(e).TSH}) و هورمون‌های تیروئیدی شما بالاست. این الگو نشانه پرکاری تیروئید است که می‌تواند منجر به آریتمی قلبی و عوارض سیستمیک شود.`,
        action: "جهت ارزیابی علت (مانند بیماری گریوز) و شروع درمان، این هفته به پزشک متخصص مراجعه کنید.",
        suggest: ["TSI", "ECG"],
        key_number: val(e).TSH
      };
    }
  },

  // ── ویتامین B12 ──
  {
    id: "borderline_b12_deficiency",
    match: (e) => {
      const b12 = val(e).B12;
      return b12 != null && b12 >= 150 && b12 <= 399;
    },
    build: (e) => {
      const b12 = val(e).B12;
      const mcv = val(e).MCV;
      return {
        pattern: "borderline_b12_deficiency",
        urgency: "routine",
        headline: "سطح مرزی ویتامین B12",
        must_say: `سطح B12 شما ${b12} است که در محدوده مرزی (۱۵۰ تا ۳۹۹) قرار دارد.` + (mcv != null && mcv > 95 ? ` با توجه به بزرگ بودن گلبول‌های قرمز (MCV=${mcv})، احتمال کمبود بافتی این ویتامین بالا است.` : " ممکن است بافت‌های بدن دچار کمبود باشند حتی اگر عدد در محدوده طبیعی آزمایشگاه باشد."),
        action: "با پزشک مشورت کنید. برای تشخیص دقیق‌تر کمبود بافتی ممکن است آزمایش MMA توصیه شود.",
        suggest: ["MMA", "فولات"],
        key_number: b12
      };
    }
  }
];
