import { val, rankOf, has } from "./patterns_utils.js";

export const RULES_NEPHROLOGY_NEW = [
  // ── کلیه (CKD) ──
  {
    id: "ckd_pattern_diagnostic",
    match: (e) => {
      const egfr = val(e, "EGFR");
      const uacr = val(e, "ACR"); // assumes ACR is parsed
      return (egfr && egfr < 60) || (uacr && uacr >= 30);
    },
    build: (e) => {
      const egfr = val(e, "EGFR");
      const uacr = val(e, "ACR");
      return {
        pattern: "ckd_pattern_diagnostic",
        urgency: (egfr && egfr < 30) ? "this_week" : "routine",
        headline: "احتمال آسیب مزمن کلیوی (CKD)",
        must_say: `مقدار eGFR شما ${egfr ? egfr : 'طبیعی'} و نسبت آلبومین به کراتینین ادرار (uACR) شما ${uacr ? uacr : 'طبیعی'} است. در صورت تداوم این مقادیر بیش از ۳ ماه، نشانگر آسیب مزمن کلیوی می‌باشد.`,
        action: "جهت بررسی فشار خون، قند و در صورت نیاز ارجاع به نفرولوژیست با پزشک مشورت کنید.",
        suggest: ["تکرار eGFR و uACR در ۳ ماه", "بررسی فشار خون"],
        key_number: egfr || uacr
      };
    }
  },

  // ── اورژانس‌های کلیوی (Creatinine / Urea) ──
  {
    id: "creatinine_emergency",
    match: (e) => {
      const cr = val(e, "CREAT");
      return cr && cr >= 5.0;
    },
    build: (e) => {
      const cr = val(e, "CREAT");
      return {
        pattern: "creatinine_emergency",
        urgency: "emergency",
        headline: "کراتینین بسیار بالا (خطر نارسایی حاد کلیه)",
        must_say: `کراتینین خون شما ${cr} است. مقادیر بالای ۵.۰ نشان‌دهنده افت شدید عملکرد کلیه‌هاست که می‌تواند به تجمع سموم خطرناک در بدن منجر شود و یک اورژانس پزشکی محسوب می‌شود.`,
        action: "فوراً و بدون اتلاف وقت به اورژانس بیمارستان مراجعه کنید.",
        suggest: ["Electrolytes", "BUN", "سونوگرافی کلیه"],
        key_number: cr
      };
    }
  },
  {
    id: "urea_bun_emergency",
    match: (e) => {
      const urea = val(e, "UREA");
      const bun = val(e, "UREA_N");
      return (urea && urea >= 200) || (bun && bun >= 100);
    },
    build: (e) => {
      const urea = val(e, "UREA");
      const bun = val(e, "UREA_N");
      const num = urea || bun;
      return {
        pattern: "urea_bun_emergency",
        urgency: "emergency",
        headline: "اوره/BUN بسیار بالا (خطر مسمومیت اورمیک)",
        must_say: `مقدار سموم کلیوی (اوره/BUN) خون شما بسیار بالاست (${num}). این سطح از اوره می‌تواند منجر به آسیب‌های مغزی (انسفالوپاتی)، اختلالات قلبی و خونریزی شود.`,
        action: "سریعاً جهت بررسی نیاز به مداخلات اورژانسی (مانند دیالیز) به اورژانس مراجعه کنید.",
        suggest: ["Creatinine", "Electrolytes", "ABG"],
        key_number: num
      };
    }
  },

  // ── الکترولیت‌ها (هیپوناترمی) ──
  {
    id: "severe_hyponatremia",
    match: (e) => {
      const na = val(e, "NA");
      return na && na < 120;
    },
    build: (e) => {
      const na = val(e, "NA");
      return {
        pattern: "severe_hyponatremia",
        urgency: "emergency",
        headline: "سدیم خون بسیار پایین (هیپوناترمی شدید)",
        must_say: `سدیم شما ${na} است که بسیار پایین‌تر از حد طبیعی (کمتر از ۱۲۰) است. این حالت در صورت بروز علائمی چون گیجی، تهوع یا تشنج یک اورژانس پزشکی محسوب می‌شود.`,
        action: "فوراً به اورژانس مراجعه کنید.",
        suggest: ["Electrolytes", "Osmolality"],
        key_number: na
      };
    }
  },

  // ── ادرار (میکروهماتوری) ──
  {
    id: "persistent_microhematuria",
    match: (e) => {
      // RBC in urine. Assumes parsed urine RBC
      const urbc = val(e, "U_RBC");
      return urbc && urbc >= 3;
    },
    build: (e) => {
      const urbc = val(e, "U_RBC");
      return {
        pattern: "persistent_microhematuria",
        urgency: "routine",
        headline: "وجود خون میکروسکوپی در ادرار",
        must_say: `در آزمایش ادرار شما ${urbc} عدد گلبول قرمز (RBC) دیده شده است. طبق دستورالعمل AUA مقادیر مساوی یا بیشتر از ۳ در هر میدان میکروسکوپی (HPF) نیازمند بررسی است.`,
        action: "در صورت رد شدن علل موقتی (مانند عفونت یا سنگ)، نیاز به پیگیری با متخصص اورولوژی است.",
        suggest: ["تکرار آزمایش ادرار", "سونوگرافی کلیه و مجاری"],
        key_number: urbc
      };
    }
  }
];
