import { val, smearAxis, smearLeukemicSentence } from "./patterns_utils.js";

// ==========================================
// الگوهای بدخیمی و اختلالات شدید خونی (NCCN, WHO, ASH)
// شامل: MDS, AML/ALL, CLL, CML, ITP, TTP
// ==========================================

// P58 پرسش ۱ — WBC به ×10³/µL (واحدِ موتور). بالاتر از این و بالاتر از بازهٔ سنی = «لکوسیتوزِ بارز».
export const MARKED_LEUKOCYTOSIS_K = 20;

// ─── job fff90f58 (P58): جمله‌های مشترکِ دو سطحِ «لکوسیتوز + سیتوپنیِ شدید» ───
// «شدید» از خودِ acute_leukemia_suspicion پرسیده می‌شود — همان match با WBCی بالای دروازه‌اش (درسِ M91e). عددِ تازه‌ای نیست.
function severeCytopeniaArm(e) {
  const leuk = RULES_MALIGNANCY.find((r) => r.id === "acute_leukemia_suspicion");
  return leuk.match({ ...e, graded: e.graded.map((g) => (g.test === "WBC" ? { ...g, value: Infinity } : g)) });
}
function wbcCytoSentenceFa(w, hb, plt, ped) {
  const hi = Number(String(w.range).split("–")[1]);
  const times = Number.isFinite(hi) && hi > 0 ? ` (حدودِ ${(w.value / hi).toFixed(1)} برابرِ سقفِ آن)` : "";
  const low = [hb?.abnormal && hb.dir === "low" ? `هموگلوبین ${hb.value} (بازه ${hb.range})` : null,
    plt?.abnormal && plt.dir === "low" ? `پلاکت ${plt.value} (بازه ${plt.range})` : null].filter(Boolean);
  return `گلبول سفید ${w.value} است و از بازهٔ ${ped ? "این سن" : "طبیعی"} (${w.range}) بالاتر است${times}، ` +
    `در حالی که هم‌زمان ${low.join(" و ")} پایین است.`;
}
// نوتروفیل سه‌حالته (N4): سنجیده / چاپ‌شده ولی بی‌عدد یا دیفِ نامعتبر / روی برگه نیست.
function neutSentenceFa(e, ne) {
  const unread = e.diffFailed || e.ungraded?.NEUT_ABS?.unreadable === true;
  return ne ? `نوتروفیل ${ne.value} است (بازه ${ne.range}).`
    : unread ? "شمارشِ افتراقیِ دستگاه برای نوتروفیل عددی نداد، پس تعدادِ نوتروفیل در دست نیست."
    : "تعدادِ نوتروفیل روی این برگه نیست.";
}
// لنفوسیت: هر جهت جمله دارد (M156) — قاعده‌ها LYMPH_ABS را می‌خوانند.
function lymphSentenceFa(ly, ped) {
  const ref = `بازهٔ ${ped ? "این سن" : "طبیعی"} (${ly.range})`;
  return ly.abnormal && ly.dir === "low"
    ? `لنفوسیت ${ly.value} است و از ${ref} پایین‌تر است؛ تا شمارشِ افتراقیِ دستی انجام نشود، معنای آن جدا از بقیهٔ عددها روشن نیست.`
    : ly.abnormal && ly.dir === "high"
      ? `لنفوسیت ${ly.value} است و از ${ref} بالاتر است؛ شمارشِ افتراقیِ دستی نوعِ این سلول‌ها را روشن می‌کند.`
      : `لنفوسیت ${ly.value} است و در ${ref} قرار دارد.`;
}

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
      // specs/009 (hand-off، data-model §3): بلاستِ ≥۲۰٪ یا میله‌های اوئرِ همین برگه اینجا گفته می‌شود و
      //   peripheral_smear_findings آن‌ها را کنار می‌گذارد — دقیقاً یک یافته دربارهٔ بلاست (M202g).
      const leuk = smearAxis(e)?.leukemic ?? [];
      const smearClause = leuk.length ? ` ${smearLeukemicSentence(leuk)} این یافتهٔ لام همین نگرانی را تقویت می‌کند و بررسیِ تخصصیِ مغزِ استخوان را ضروری‌تر می‌کند.` : "";
      return {
        pattern: "acute_leukemia_suspicion",
        urgency: "emergency",
        headline: "اختلال شدید و خطرناک در سلول‌های خون (اورژانس)",
        // P56 پرسش ۶ (تصمیمِ بازبین ۲۰۲۶-۰۹-۲۸): نامِ تشخیص («بدخیمی»، «لوسمی») در متنِ بیمار نمی‌آید؛ id فقط پرچمِ داخلی است.
        must_say: "افزایش بسیار شدید و غیرطبیعی گلبول‌های سفید همراه با افت شدید گلبول‌های قرمز یا پلاکت‌ها، یک اورژانس خونی است و نیازمندِ ارزیابیِ فوریِ تخصصیِ خون (هماتولوژی) در سریع‌ترین زمانِ ممکن است." + smearClause,
        action: "بدون هیچ‌گونه تأخیر، مستقیماً به اورژانس یک بیمارستان مجهز (ترجیحاً دارای بخش خون) مراجعه کنید.",
        suggest: ["ارجاع فوری اورژانسی"],
        warnings: ["این یک وضعیت تهدیدکننده حیات است و هرگونه تأخیر در پیگیری پزشکی عواقب جبران‌ناپذیری دارد."],
      };
    },
  },

  // ─────────────────────────────────────────
  // 2b. لکوسیتوز + سیتوپنیِ شدید، زیرِ دروازهٔ WBC > 50ِ قاعدهٔ بالا (job fff90f58، P58)
  // ─────────────────────────────────────────
  // 🔴 شیرخوارِ ۶–۱۲ ماهه: WBC 36.6 (بازه ۵–۱۲) + Hb 7.1 + PLT 36، بی‌دیف. acute_leukemia_suspicion فقط بالای ۵۰ فعال
  //    می‌شود، pancytopenia به‌درستی WBCِ پایین می‌خواهد، و leukocytosis زیرِ blockerِ ترومبوسیتوپنی پنهان ماند؛ پس
  //    WBC فقط در خطِ «۲ نتیجهٔ دیگر» آمد و خانواده فقط «TTP یا HUS» خواند (N18/N20).
  // عددِ تازه‌ای نیست: «لکوسیتوز» = WBC بالاتر از بازهٔ همین سن (grade)، و «سیتوپنیِ شدید» از خودِ قاعدهٔ
  //    acute_leukemia_suspicion پرسیده می‌شود — همان match با WBCی بالای دروازه‌اش (درسِ M91e: «آیا آن قاعده فعال
  //    می‌شود»، نه تکرارِ ۸ و ۵۰). وقتی خودِ آن قاعده فعال است، این یکی کنار می‌رود (یک یافته دربارهٔ یک تصویر).
  // P56 پرسش ۶: نامِ تشخیص («لوسمی»، «بدخیمی») در متنِ بیمار نمی‌آید (M203e).
  // P58 پرسش ۱ (تصمیمِ بازبینِ بالینی، ۲۰۲۶-۰۹-۲۹): «لکوسیتوزِ بارز» کنارِ سیتوپنی = WBC > ۲۰٬۰۰۰/µL، برای کودک و بزرگسال.
  //   بازبین «۲۰ تا ۲۵ هزار» داد؛ کرانِ پایین انتخاب شد (خطا به سمتِ توضیح). WBCِ ۱۱ تا ۲۰ هزار کنارِ کم‌خونی/ترومبوسیتوپنی
  //   «اغلب واکنشی است» و این یافته را نمی‌سازد. منبعِ منتشرشده نام برده نشد — برچسب همان تصمیمِ بازبین است.
  {
    id: "leukocytosis_with_cytopenia",
    match: (e) => {
      const w = e.graded.find((g) => g.test === "WBC");
      if (!w?.abnormal || w.dir !== "high" || !(w.value > MARKED_LEUKOCYTOSIS_K)) return false;
      if (RULES_MALIGNANCY.find((r) => r.id === "acute_leukemia_suspicion").match(e)) return false;
      return severeCytopeniaArm(e);
    },
    build: (e) => {
      const g = (k) => e.graded.find((x) => x.test === k);
      const w = g("WBC"), hb = g("HGB"), plt = g("PLT"), ly = g("LYMPH_ABS"), ne = g("NEUT_ABS");
      const ped = e.age != null && e.age < 16;
      const s = [
        wbcCytoSentenceFa(w, hb, plt, ped) + " " +
        // P58 پرسش ۲ (بازبین، ۲۰۲۶-۰۹-۲۹): جملهٔ خودِ بازبین؛ نامِ تشخیص نمی‌آید (P56 پرسش ۶، M203e).
        "تغییرات همزمان در رده‌های گلبول‌های سفید و سایر سلول‌های خونی مشاهده شده که نیازمند ارزیابی تکمیلی و فوری توسط متخصص خون (هماتولوژیست) جهت بررسی دقیق عملکرد مغز استخوان است.",
      ];
      s.push(neutSentenceFa(e, ne));
      // بلاست: یا لامِ همین برگه دارد (مالکش peripheral_smear_findings است) یا گزارش نشده.
      const leukSmear = smearAxis(e)?.leukemic ?? [];
      s.push(leukSmear.length
        ? "لامِ همین برگه سلول‌های نارس گزارش کرده که جداگانه توضیح داده شده است."
        : `وجود یا نبودِ سلول‌های نارس (بلاست) هم روی این برگه گزارش نشده؛ ${ne ? "" : "این دو عدد سرنوشت‌سازند و "}برای همین شمارشِ افتراقیِ دستی روی لامِ خونِ محیطی، با جست‌وجوی بلاست، لازم است.`);
      if (ly) s.push(lymphSentenceFa(ly, ped));
      // تصمیمِ کاربر (۲۰۲۶-۰۹-۲۹): همان واژهٔ جملهٔ بازبین برای همهٔ سنین — «هماتولوژیست»، نه «هماتولوژیستِ اطفال».
      const doc = "متخصصِ خون (هماتولوژیست)";
      return {
        pattern: "leukocytosis_with_cytopenia",
        urgency: "emergency",
        headline: "گلبول سفیدِ بالا همراه با افتِ شدیدِ رده‌های دیگرِ خون (اورژانس)",
        must_say: s.join(" "),
        action: `بدون اتلاف وقت فوراً به اورژانسِ بیمارستانی مراجعه کنید که ${doc} دارد.`,
        suggest: [
          "گسترش خون محیطی با شمارش افتراقی دستی و بررسی بلاست",
          "شمارش رتیکولوسیت", "بیلی‌روبین مستقیم و غیرمستقیم", "هاپتوگلوبین", "کومبس مستقیم", "LDH",
          "کراتینین", "اوره", "آزمایش کامل ادرار", "اسید اوریک", "پتاسیم",
        ],
        warnings: [`اگر ${ped ? "کودک" : "بیمار"} تب دارد، همان ابتدا به تیمِ اورژانس بگویید؛ کشتِ خون و CRP را پزشک بر همین اساس درخواست می‌کند.`],
        ...(w.refSource === "RCPCH 2016" ? { sources: ["RCPCH"] } : {}),
      };
    },
  },

  // ─────────────────────────────────────────
  // 2c. سطحِ ۲: لکوسیتوزِ خفیف تا متوسط + سیتوپنیِ شدید (P58، تصمیمِ بازبین ۲۰۲۶-۰۹-۲۹)
  // ─────────────────────────────────────────
  // WBC بالاتر از بازهٔ همین سن ولی ≤ MARKED_LEUKOCYTOSIS_K، کنارِ همان سیتوپنیِ شدیدِ سطحِ ۱. بازبین: «اغلب واکنشی به عفونت،
  //   التهابِ حاد یا کم‌خونیِ زمینه‌ای» — بی‌این یافته، WBC زیرِ blockerِ اورژانسِ پلاکت/Hb به خطِ «بی‌توضیح» می‌افتاد (N18).
  // فوریت this_week + always_show (تصمیمِ کاربر): خودش آلارم نمی‌سازد و دستورِ نهایی مالِ یافتهٔ اورژانسی است (M188)،
  //   ولی زیرِ آن پنهان نمی‌ماند. brief همان متنِ کامل است، چون کلیدها فقط با متنِ نشان‌داده‌شده پوشش می‌گیرند (R3-CR1).
  {
    id: "reactive_leukocytosis_with_cytopenia",
    match: (e) => {
      const w = e.graded.find((g) => g.test === "WBC");
      if (!w?.abnormal || w.dir !== "high" || w.value > MARKED_LEUKOCYTOSIS_K) return false;
      return severeCytopeniaArm(e);
    },
    build: (e) => {
      const g = (k) => e.graded.find((x) => x.test === k);
      const w = g("WBC"), hb = g("HGB"), plt = g("PLT"), ly = g("LYMPH_ABS"), ne = g("NEUT_ABS");
      const ped = e.age != null && e.age < 16;
      const s = [
        wbcCytoSentenceFa(w, hb, plt, ped),
        // P58 (بازبین، ۲۰۲۶-۰۹-۲۹): متنِ خودِ بازبین، عیناً.
        "این وضعیت اغلب واکنشی به عفونت‌ها، التهاب‌های حاد یا کم‌خونی‌های زمینه‌ای است. جهت مشخص شدن علت دقیق عفونی یا التهابی، بررسی و تطبیق آزمایش با معاینه بالینی توسط پزشک ضروری است.",
        neutSentenceFa(e, ne),
      ];
      if (ly) s.push(lymphSentenceFa(ly, ped));
      const text = s.join(" ");
      const fever = `اگر ${ped ? "کودک" : "بیمار"} تب دارد، این را همان ابتدا به پزشک بگویید؛ کشتِ خون و CRP را پزشک بر همین اساس درخواست می‌کند.`;
      return {
        pattern: "reactive_leukocytosis_with_cytopenia",
        urgency: "this_week",
        headline: "افزایش گلبول‌های سفید خون همزمان با کاهش در سایر سلول‌ها",
        must_say: text,
        always_show: true,
        brief: text,
        action: "این هفته با پزشک وقت بگیرید تا علتِ آن کنارِ معاینه روشن شود.",
        suggest: [...(ne ? [] : ["شمارش افتراقی (عدد نوتروفیل)"]), "CRP", "ESR"],
        warnings: [fever],
        brief_warnings: [fever],
        ...(w.refSource === "RCPCH 2016" ? { sources: ["RCPCH"] } : {}),
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
    // 🔴 تصمیمِ بازبینِ بالینی (۲۰۲۶-۰۹-۲۸، P56): این یافته همیشه زیرِ extreme_leukocytosis (WBC ≥ ۵۰، blocks_others)
    //    پنهان می‌ماند — یعنی هرگز. «لکوسیتوزِ شدید» فقط توصیفِ شمارشی است و این یافته جهتِ بالینی (BCR-ABL، لام) را می‌دهد؛
    //    always_show + brief تا زیرِ اورژانس نسخهٔ کوتاهش با عددِ بازوفیل بماند. M204.
    //    نامِ بیماری («CML»، «میلوپرولیفراتیو») در متنِ بیمار نمی‌آید — id فقط پرچمِ داخلی است (همان تصمیم، M204b).
    build: (e) => {
      const baso = e.graded.find((g) => g.test === "BASO_ABS");
      return {
        pattern: "cml_suspicion",
        urgency: "this_week",
        always_show: true,
        headline: "افزایش شدید گلبول‌های سفید و بازوفیل‌ها",
        must_say: `لکوسیتوز بسیار شدید (بالای ۵۰ هزار) همراه با افزایش غیرطبیعی بازوفیل‌ها (${baso.value}، حد طبیعی ${baso.range}) نیازمند بررسی تخصصی خون جهت رد اختلالات تکثیری مغز استخوان است.`,
        brief: `بازوفیل‌های شما هم بالاست (${baso.value}، حد طبیعی ${baso.range})؛ این همراهی با گلبول سفیدِ بسیار بالا نیازمندِ بررسیِ تخصصیِ خون جهتِ ردِ اختلالاتِ تکثیریِ مغزِ استخوان است و متخصصِ خون آن را با لامِ خون و آزمایشِ ژنتیکیِ BCR-ABL بررسی می‌کند.`,
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

      // «ایزوله» یعنی هیچ شاخصِ انعقادی هم بالا/پایین نباشد؛ با D-dimer/PT/aPTT/INR بالا یا فیبرینوژنِ پایین،
      // مالکِ برگه الگوی مصرفی/انعقادی است، نه این (بازبینیِ متخصص ۲۰۲۶-۰۹-۳۰، 61-e).
      const coagOff = e.graded.some((g) => g.abnormal &&
        ((["DDIMER", "PT", "APTT", "INR"].includes(g.test) && g.dir === "high") || (g.test === "FIB" && g.dir === "low")));
      return (!hgb || !hgb.abnormal) && (!wbc || !wbc.abnormal) && !coagOff;
    },
    build: (e) => {
      const t = val(e);
      const isCritical = t.PLT < 30;
      return {
        pattern: "isolated_thrombocytopenia",
        urgency: isCritical ? "emergency" : "this_week",   // «today» در هیچ جدولِ رتبه نبود؛ actionِ «بلافاصله به اورژانس» ⇒ emergency (N20)
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
