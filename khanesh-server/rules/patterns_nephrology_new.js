import { val, urineCellCount, urinePositive } from "./patterns_utils.js";

export const RULES_NEPHROLOGY_NEW = [
  // ── کلیه (CKD) ──
  // ⚠️ این قاعده دو نقص داشت که هر دو از یک ریشه می‌آمدند: `val(e).EGFR` را
  //    می‌خواند، در حالی که eGFR هیچ‌وقت تستِ درجه‌بندی‌شده نیست و در
  //    `e.indices.egfr` زندگی می‌کند. پس شاخهٔ eGFR مرده بود، قاعده فقط با
  //    ACR شلیک می‌کرد، و متن می‌گفت «مقدار eGFR شما طبیعی» — یعنی دربارهٔ
  //    تستی که روی برگه نیست ادعای «طبیعی» می‌کرد. کلاسِ N4، اندازه‌گیری‌شده:
  //      ACR 45 (بدون کراتینین) → «مقدار eGFR شما طبیعی …»، indices.egfr = undefined
  //
  // ⚠️ چرا تریگر فقط ACR ماند و eGFR به «زمینه» تنزل کرد: زنده‌کردنِ شرطِ
  //    `egfr < 60` یافتهٔ تکراری می‌ساخت، چون `kidney` در patterns_nephrology.js
  //    مالکِ هر eGFR زیرِ ۶۰ است و متنش (مرحله‌بندیِ KDIGO، RCV، BUN/Cr) به‌مراتب
  //    کامل‌تر است. سهمِ یکتای این قاعده، قابِ ترکیبیِ ACR + eGFR است.
  {
    id: "ckd_pattern_diagnostic",
    match: (e) => {
      const uacr = val(e).ACR;
      return uacr != null && uacr >= 30;
    },
    build: (e) => {
      const uacr = val(e).ACR;
      const egfr = e.indices.egfr ?? null;   // ← نه val(e).EGFR
      // سه‌حالته (N4): اندازه‌گیری‌نشده ≠ طبیعی.
      const egfrTxt =
        egfr == null
          ? "شاخصِ تخمینیِ کارِ کلیه (eGFR) روی این برگه محاسبه نشده است — محاسبه‌اش به کراتینین به‌همراه سن و جنسیت نیاز دارد"
          : egfr < 60
            ? `شاخصِ تخمینیِ کارِ کلیه (eGFR) شما حدود ${egfr} است و پایین‌تر از حدِ مطلوب قرار دارد`
            : `شاخصِ تخمینیِ کارِ کلیه (eGFR) شما حدود ${egfr} است و در محدودهٔ مطلوب قرار دارد`;
      return {
        pattern: "ckd_pattern_diagnostic",
        urgency: (egfr != null && egfr < 30) ? "this_week" : "routine",
        headline: "نشانه‌ای از آسیب کلیه در آزمایش ادرار دیده می‌شود",
        must_say:
          `نسبت آلبومین به کراتینین ادرار (ACR) شما ${uacr} است و بالاتر از حد طبیعی؛ ` +
          "یعنی مقدارِ پروتئینی که از صافی‌های کلیه به ادرار نشت می‌کند بیش از حدِ معمول است. " +
          `${egfrTxt}. ` +
          "اگر این وضعیت بیش از سه ماه ادامه داشته باشد، به آن آسیبِ مزمنِ کلیه گفته می‌شود — " +
          "یک نمونهٔ تنها این را قطعی نمی‌کند، و به همین دلیل تکرارِ آزمایش بخشی از خودِ تشخیص است.",
        action: "با پزشک مطرح کنید تا فشار خون و قند شما بررسی شود و در صورت نیاز به متخصص کلیه ارجاع بگیرید.",
        suggest: ["تکرار ACR پس از سه ماه", "بررسی فشار خون", "قند خون ناشتا"],
        warnings: [],
        key_number: egfr ?? uacr,   // ← ?? نه ||، وگرنه eGFR صفر نادیده می‌شد
      };
    }
  },

  // ── اورژانس‌های کلیوی (Creatinine / Urea) ──
  {
    id: "creatinine_emergency",
    match: (e) => {
      const cr = val(e).CREAT;
      return cr != null && cr >= 5.0;
    },
    build: (e) => {
      const cr = val(e).CREAT;
      return {
        pattern: "creatinine_emergency",
        urgency: "emergency",
        headline: "کراتینین بسیار بالا (خطر نارسایی حاد کلیه)",
        must_say: `کراتینین خون شما ${cr} است. مقادیر بالای ۵.۰ نشان‌دهنده افت شدید عملکرد کلیه‌هاست که می‌تواند به تجمع سموم خطرناک در بدن منجر شود و یک اورژانس پزشکی محسوب می‌شود.`,
        action: "فوراً و بدون اتلاف وقت به اورژانس بیمارستان مراجعه کنید.",
        suggest: ["الکترولیت‌ها", "BUN", "سونوگرافی کلیه"],
        key_number: cr
      };
    }
  },
  {
    id: "urea_bun_emergency",
    match: (e) => {
      const urea = val(e).UREA;
      const bun = val(e).UREA_N;
      return (urea != null && urea >= 200) || (bun != null && bun >= 100);
    },
    build: (e) => {
      const urea = val(e).UREA;
      const bun = val(e).UREA_N;
      const num = urea || bun;
      return {
        pattern: "urea_bun_emergency",
        urgency: "emergency",
        headline: "اوره/BUN بسیار بالا (خطر مسمومیت اورمیک)",
        must_say: `مقدار سموم کلیوی (اوره/BUN) خون شما بسیار بالاست (${num}). این سطح از اوره می‌تواند منجر به آسیب‌های مغزی (انسفالوپاتی)، اختلالات قلبی و خونریزی شود.`,
        action: "سریعاً جهت بررسی نیاز به مداخلات اورژانسی (مانند دیالیز) به اورژانس مراجعه کنید.",
        suggest: ["کراتینین", "الکترولیت‌ها", "ABG"],
        key_number: num
      };
    }
  },

  // ── job 40b8a901 (F4): اورهٔ بالا با کراتینینِ طبیعی ──
  // `kidney` فقط با کراتینینِ بالا یا eGFR < ۶۰ فعال می‌شود و urea_bun_emergency از ۲۰۰؛ پس اوره ۶۰ کنارِ کراتینین ۰.۸۵ هیچ
  // صاحبی نداشت و BUN/Cr (۳۳) و eGFR در هیچ متنی مصرف نمی‌شدند. این قاعده همان خلأ را می‌بندد و *تشخیص نمی‌دهد*:
  // سه‌حالته روی نسبتِ BUN/Cr (بالای ۲۰ — همان آستانهٔ prerenal در kidney / کمتر / کراتینین غایب)، بی‌هیچ عددِ تازه.
  // فوریتِ routine و فهرستِ علل متنی‌اند و در P59 در انتظار تأییدِ بازبین‌اند.
  {
    id: "isolated_urea_elevation",
    match: (e) => {
      const u = e.graded.find((g) => (g.test === "UREA" || g.test === "UREA_N") && g.abnormal && g.dir === "high");
      if (!u) return false;
      const cr = e.graded.find((g) => g.test === "CREAT");
      const egfr = e.indices.egfr;
      // صاحبانِ دیگر: کراتینینِ بالا یا eGFR < ۶۰ ⇒ kidney؛ اورهٔ بسیار بالا ⇒ urea_bun_emergency (می‌پرسیم فعال می‌شود، نه آستانه).
      if ((cr?.abnormal && cr.dir === "high") || (egfr != null && egfr < 60)) return false;
      return !RULES_NEPHROLOGY_NEW.find((r) => r.id === "urea_bun_emergency").match(e);
    },
    build: (e) => {
      const u = e.graded.find((g) => (g.test === "UREA" || g.test === "UREA_N") && g.abnormal && g.dir === "high");
      const cr = e.graded.find((g) => g.test === "CREAT");
      const ratio = e.indices.bun_cr, egfr = e.indices.egfr;
      const name = u.test === "UREA_N" ? "BUN" : "اوره";
      const crFa = cr ? (cr.abnormal ? null : `کراتینین ${cr.value} طبیعی است`) : null;
      const ratioFa = cr == null
        ? "کراتینین روی این برگه نیست، پس از روی این برگه نمی‌شود گفت کلیه‌ها سالم‌اند یا نه؛ کراتینین باید اضافه شود."
        : ratio == null ? ""
        : ratio > 20
          ? `نسبت اوره به کراتینین (BUN/Cr) ${ratio} است و بالاتر از ۲۰ است؛ این نسبت به‌تنهایی علتِ بالا بودنِ اوره را مشخص نمی‌کند. کم‌آبی، مصرفِ زیادِ پروتئین، خونریزی در دستگاه گوارش و بعضی داروها (مثل کورتیکواستروئیدها) همه می‌توانند آن را بالا ببرند.`
          : `نسبت اوره به کراتینین (BUN/Cr) ${ratio} است و در محدودهٔ عادی است.`;
      // P59 پرسش ۴ (بازبین): اوره ↑ + BUN/Cr > ۲۰ + کم‌خونی ⇒ خونریزیِ گوارشیِ فوقانی محتمل‌تر است ⇒ «soon» و در صدرِ علل.
      const hb = e.graded.find((g) => g.test === "HGB");
      const giFlag = !!(hb?.abnormal && hb.dir === "low" && ratio != null && ratio > 20);
      const giSentence = `هموگلوبین ${hb?.value} هم پایین است و نسبتِ اوره به کراتینین (BUN/Cr) ${ratio} است؛ این ترکیب می‌تواند نشانهٔ خونریزی در دستگاه گوارش باشد، به‌ویژه اگر مدفوعِ تیره یا سیاه یا سوزشِ معده دارید. کم‌آبی و مصرفِ زیادِ پروتئین هم می‌توانند اوره را بالا ببرند، ولی با کم‌خونی این علت را نباید نادیده گرفت.`;
      const egfrFa = egfr != null ? ` شاخص تخمینی کار کلیه (eGFR) حدود ${egfr} است و پایین‌تر از ۶۰ نیست.` : "";
      return {
        pattern: "isolated_urea_elevation",
        urgency: giFlag ? "soon" : "routine",
        always_show: true,
        brief:
          `${name} شما ${u.value} (حد طبیعی ${u.range}) بالاتر از حد است` +
          (crFa ? ` ولی ${crFa}` : "") + ". " +
          (ratio != null && ratio > 20 ? `نسبت اوره به کراتینین ${ratio} است و به‌تنهایی علتِ اوره را مشخص نمی‌کند. ` : "") +
          "این را در همان مراجعه با پزشک مطرح کنید.",
        headline: `${name} خون شما بالاتر از حد طبیعی است`,
        must_say:
          `${name} شما ${u.value} است و از حد طبیعی (${u.range}) بالاتر است` + (crFa ? `، ولی ${crFa}. ` : ". ") +
          (giFlag ? giSentence : ratioFa) + egfrFa +
          " اورهٔ بالا با کراتینینِ طبیعی به‌تنهایی به معنای بیماریِ کلیه نیست؛ پزشک آن را کنار بقیهٔ برگه و علائم می‌سنجد.",
        action: giFlag
          ? "در اسرع وقت، حداکثر ظرفِ ۲۴ تا ۴۸ ساعتِ آینده، به پزشک مراجعه کنید و بگویید چه داروهایی مصرف می‌کنید."
          : "نتیجه را در نوبتِ عادی با پزشک مطرح کنید و بگویید چه داروهایی مصرف می‌کنید.",
        suggest: ["تکرار اوره و کراتینین"],
        warnings: [],
      };
    },
  },

  // ── الکترولیت‌ها (هیپوناترمی) ──
  // ⚠️ قاعدهٔ `severe_hyponatremia` اینجا حذف شد و عمداً جایگزین نشده.
  //    اندازه‌گیری‌شده: Na 118 هم آن را و هم `sodium_critical` را فعال می‌کرد —
  //    دو یافتهٔ emergency با متنِ تقریباً یکسان برای یک عدد. آن قاعده روی
  //    آستانهٔ برهنهٔ `< 120` می‌ایستاد، در حالی که `sodium_critical` همان باند
  //    را با `<= 120` می‌گیرد و متنش نکتهٔ تصحیحِ قند (هایپرگلیسمی) و هشدارِ
  //    سرعتِ اصلاح را هم دارد. تنها محتوای یکتایش، پیشنهادِ «اسمولالیتهٔ سرم»
  //    بود که به شاخهٔ سدیمِ پایینِ همان قاعده منتقل شد.

  // ── ادرار (میکروهماتوری) ──
  // ⚠️ این قاعده هم روی کلیدی می‌نشست که وجود ندارد (`val(e).U_RBC`)؛ شمارشِ
  //    سلولیِ ادرار در `e.qual` است و با `urineCellCount` خوانده می‌شود. پس
  //    هرگز فعال نمی‌شد و جملهٔ AUA هیچ‌وقت به بیمار نمی‌رسید.
  //
  // ⚠️ زنده‌کردنِ خامش با `>= 3` بدتر از مرده‌بودنش بود: `hematuria_pattern`
  //    (patterns_nephrology.js) روی `blood || rbc > 3` و با فوریتِ this_week
  //    مالکِ همان محدوده است، پس هر مقدارِ ۴ به بالا دو یافته می‌گرفت که
  //    دومی فوریتِ *پایین‌تر* داشت. اینجا با همان اصطلاحِ واگذاریِ خودِ فایل
  //    حل شده: این قاعده فقط باندی را می‌گیرد که آن یکی از دست می‌دهد —
  //    یعنی دقیقاً ۳ عدد در HPF، که تعریفِ AUA آن را مثبت می‌داند.
  {
    id: "persistent_microhematuria",
    match: (e) => {
      const urbc = urineCellCount(e, /rbc|گلبول\s*قرمز/i);
      if (urbc == null || urbc < 3) return false;
      const blood = urinePositive(e, /urine\s*blood|ur\s*blood|خون\s*ادرار|hematuria/i);
      if (blood || urbc > 3) return false;   // واگذاری به hematuria_pattern
      return true;
    },
    build: (e) => {
      const urbc = urineCellCount(e, /rbc|گلبول\s*قرمز/i);
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
