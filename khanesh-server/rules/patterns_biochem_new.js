import { val, rankOf, has } from "./patterns_utils.js";

export const RULES_BIOCHEM_NEW = [
  // ── دیابت و قند ──
  {
    id: "diabetes_a1c_diagnostic",
    match: (e) => {
      const a1c = val(e, "A1C");
      return a1c >= 6.5;
    },
    build: (e) => {
      const a1c = val(e, "A1C");
      const glu = val(e, "GLU_F");
      return {
        pattern: "diabetes_a1c_diagnostic",
        urgency: "routine",
        headline: "هموگلوبین A1c در محدودهٔ دیابت است",
        must_say: `مقدار HbA1c شما ${a1c} درصد است. بر اساس دستورالعمل‌ها، عدد ۶.۵ درصد یا بالاتر نشان‌دهنده دیابت است.` + 
          (glu >= 126 ? ` قند خون ناشتای شما نیز ${glu} است که این تشخیص را تایید می‌کند.` : " برای تایید نهایی نیاز به آزمایش مجدد یا بررسی قند خون ناشتا است."),
        action: "با پزشک برای شروع برنامه درمانی، رژیم غذایی و احتمالاً دارو مشورت کنید.",
        suggest: ["FBS", "Lipid Panel", "Urine Albumin"],
        key_number: a1c
      };
    }
  },
  {
    id: "dka_hhs_emergency",
    match: (e) => {
      const glu = val(e, "GLU_F") || val(e, "GLU_R");
      return glu >= 250;
    },
    build: (e) => {
      const glu = val(e, "GLU_F") || val(e, "GLU_R");
      return {
        pattern: "dka_hhs_emergency",
        urgency: "emergency",
        headline: "قند خون بسیار بالا (خطر اورژانس متابولیک)",
        must_say: `قند خون شما ${glu} است. مقادیر بالای ۲۵۰ به‌ویژه در صورت وجود علائم (تهوع، استفراغ، گیجی، تشنگی شدید) خطر کتواسیدوز دیابتی (DKA) یا سندرم هایپراسمولار (HHS) را مطرح می‌کند.`,
        action: "در صورت داشتن هرگونه علامت مانند تهوع، نفس‌تنگی یا گیجی فوراً به اورژانس مراجعه کنید.",
        suggest: ["Ketone", "VBG", "Electrolytes"],
        key_number: glu
      };
    }
  },
  
  // ── چربی خون ──
  {
    id: "severe_hypercholesterolemia",
    match: (e) => val(e, "LDL") >= 190,
    build: (e) => {
      return {
        pattern: "severe_hypercholesterolemia",
        urgency: "this_week",
        headline: "کلسترول LDL بسیار بالا (خطر قلبی-عروقی)",
        must_say: `مقدار کلسترول بد (LDL) شما ${val(e, "LDL")} است. مقادیر مساوی یا بالاتر از ۱۹۰ میلی‌گرم بر دسی‌لیتر نیازمند درمان فوری با استاتین با دوز بالا است. احتمال هایپرکلسترولمی فامیلی (ژنتیکی) نیز وجود دارد.`,
        action: "در اسرع وقت با متخصص قلب یا داخلی برای شروع داروی کاهنده چربی مشورت کنید.",
        suggest: ["تکرار پنل چربی در 3 ماه", "بررسی قلب"],
        key_number: val(e, "LDL")
      };
    }
  },

  // ── اورژانس‌های گوارش و کبد (آمیلاز و بیلی‌روبین) ──
  {
    id: "amylase_emergency",
    match: (e) => {
      const amy = val(e, "AMYLASE");
      return amy && amy >= 500;
    },
    build: (e) => {
      const amy = val(e, "AMYLASE");
      return {
        pattern: "amylase_emergency",
        urgency: "emergency",
        headline: "آمیلاز بسیار بالا (خطر التهاب حاد لوزالمعده/پانکراتیت)",
        must_say: `مقدار آمیلاز خون شما ${amy} است که افزایش شدیدی داشته است. این میزان بالا به‌شدت مطرح‌کننده التهاب حاد لوزالمعده (پانکراتیت) است که یک وضعیت اورژانسی با خطر جانی است.`,
        action: "فوراً به بخش اورژانس مراجعه کنید.",
        suggest: ["Lipase", "CBC", "سونوگرافی شکم"],
        key_number: amy
      };
    }
  },
  {
    id: "bilirubin_emergency",
    match: (e) => {
      const bili = val(e, "BILI_T");
      return bili && bili >= 15.0;
    },
    build: (e) => {
      const bili = val(e, "BILI_T");
      return {
        pattern: "bilirubin_emergency",
        urgency: "emergency",
        headline: "بیلی‌روبین بسیار بالا (زردی بحرانی)",
        must_say: `بیلی‌روبین تام شما ${bili} است. مقادیر بالای ۱۵ در بزرگسالان نشان‌دهنده نارسایی حاد کبد، انسداد شدید مجاری صفراوی یا تخریب وسیع گلبول‌های قرمز است.`,
        action: "بدون تأخیر به اورژانس مراجعه کنید.",
        suggest: ["AST", "ALT", "ALP", "Direct Bilirubin"],
        key_number: bili
      };
    }
  },

  // ── کبد (الگوی آسیب) ──
  {
    id: "liver_injury_pattern",
    match: (e) => {
      const alt = val(e, "ALT");
      const ast = val(e, "AST");
      const alp = val(e, "ALP");
      // Basic R factor logic approximation for testing
      return (alt > 40 || ast > 40) && (alt > alp || ast > alp);
    },
    build: (e) => {
      const alt = val(e, "ALT");
      const ast = val(e, "AST");
      return {
        pattern: "liver_injury_pattern",
        urgency: (alt > 400 || ast > 400) ? "this_week" : "routine",
        headline: "الگوی آسیب سلول‌های کبدی (Hepatocellular)",
        must_say: `آنزیم‌های کبدی شما (ALT=${alt}, AST=${ast}) بالا هستند. این الگو نشان‌دهنده التهاب یا آسیب مستقیم به بافت کبد است (مانند کبد چرب، هپاتیت یا اثرات دارویی).`,
        action: (alt > 400) ? "به دلیل بالا بودن قابل توجه آنزیم‌ها، این هفته به پزشک مراجعه کنید." : "برای بررسی علل (سونوگرافی کبد، ویروس‌ها) با پزشک مشورت کنید.",
        suggest: ["سونوگرافی کبد", "Hepatitis Panel", "Bilirubin"],
        key_number: alt
      };
    }
  }
];
