import { serologyReactive, qualPositive, qualValue, titreFa, hasInflammation, whoFerritinThreshold, whoInflamIronDeficiency, urinePositive, urineCellCount, urineGrade, isNephrotic, isGlomerulonephritis, isDIC, val, rankOf, levelGrade } from "./patterns_utils.js";
import { faName } from "./names.js";
import { preanalyticalCaveats, attachPreanalytical } from "./preanalytical.js";
import { repeatDeltaFa } from "./biovar.js";

export const RULES_BIOCHEM = [

  // ═══════════ پرچم قرمز ═══════════
  {
    id: "troponin_positive",
    match: (e) => {
      // کیفی: کلمه‌ی مثبت در qual
      const qualPos = Object.entries(e.qual).some(
        ([k, v]) => /troponin|ctn[it]|hs.?ctn|cardiac.?troponin/i.test(k) && /positive|مثبت|reactive|واکنش/i.test(v)
      );
      // عددی: TROPONIN_I بالای حد مرجع (از graded)
      const trop = e.graded.find((g) => g.test === "TROPONIN_I");
      const numHigh = trop?.abnormal && trop.dir === "high";
      return qualPos || numHigh;
    },
    build: () => ({
      pattern: "troponin_positive",
      urgency: "emergency",
      headline: "یکی از نتایج نیاز به رسیدگی فوری دارد",
      must_say: "تروپونین پروتئینی است که هنگام آسیب عضلهٔ قلب وارد خون می‌شود؛ مثبت بودن آن می‌تواند نشانهٔ یک مشکل حاد قلبی باشد و باید همین حالا بررسی شود.",
      action: "همین حالا به اورژانس مراجعه کنید. این برگه را همراه ببرید.",
      suggest: [],
      blocks_others: true,   // بقیه یافته‌ها زیر این می‌روند
    }),
  },
  {
    id: "severe_acidosis",
    match: (e) => {
      const t = val(e);
      const acidotic = (t.HCO3 != null && t.HCO3 < 15) || (t.PH != null && t.PH < 7.25);
      if (!acidotic) return false;
      // اگر تصویر کتواسیدوز دیابتی کامل است (گلوکز بالا + کتون)،
      // به الگوی اختصاصی DKA واگذار کن که پیام دقیق‌تری دارد.
      const gluHigh = (t.GLU_F != null && t.GLU_F >= 250) ||
                      (t.GLU_RANDOM != null && t.GLU_RANDOM >= 250);
      const ketone = urinePositive(e, /ketone|کتون|hydroxybutyrate|بتاهیدروکسی/i);
      if (gluHigh && ketone) return false;
      return true;
    },
    build: () => ({
      pattern: "severe_acidosis",
      urgency: "emergency",
      headline: "تعادل اسید و باز خون شما به‌هم خورده است",
      must_say:
        "خون شما بیش از حد اسیدی شده است (بی‌کربنات خیلی پایین یا pH پایین). این می‌تواند از دیابت کنترل‌نشده، مشکل کلیه، یا کاهش اکسیژن‌رسانی به بافت‌ها باشد و نیاز به رسیدگی فوری دارد.",
      action: "همین حالا به اورژانس مراجعه کنید.",
      suggest: [],
      warnings: [],
      blocks_others: true,
    }),
  },

  // ═══════════ شکاف آنیونی بالا ═══════════
  // Na − (Cl + HCO3) > 12. قاعدهٔ افزایشی: اسیدوزِ با آنیون‌گپ بالا را حتی وقتی
  // HCO3 فقط کمی پایین است می‌گیرد. اگر DKA/اسیدوز شدید (اورژانس، blocks_others)
  // فعال باشند، این یافتهٔ this_week به‌طور خودکار زیر آن‌ها پنهان می‌شود.
  {
    id: "high_anion_gap",
    match: (e) => {
      const ag = e.indices.anion_gap_corr ?? e.indices.anion_gap;
      return ag != null && ag > 12;
    },
    build: (e) => {
      const ag = e.indices.anion_gap_corr ?? e.indices.anion_gap;
      return {
        pattern: "high_anion_gap",
        urgency: "this_week",
        headline: "شکاف آنیونی خون شما بالاتر از حد معمول است",
        ...(ag != null ? { key_number: ag } : {}),
        must_say:
          `شکاف آنیونی (محاسبه‌ای از روی املاح خون) حدود ${ag} است، بالاتر از حد معمول (~۱۲). ` +
          "این می‌تواند نشانهٔ تجمع اسید در بدن باشد — از علل شایع آن قند خیلی بالا (کتواسیدوز)، " +
          "کاهش کار کلیه، یا اسید لاکتیک است. باید توسط پزشک بررسی شود.",
        action: "این هفته با پزشک مطرح کنید. اگر تنفس تند، گیجی یا حال عمومی بد دارید، زودتر مراجعه کنید.",
        suggest: ["بررسی توسط پزشک", "قند خون", "عملکرد کلیه", "لاکتات در صورت صلاحدید"],
        warnings: [],
      };
    },
  },

  // ═══════════ الکترولیت‌ها ═══════════

  // ── پتاسیم (مهم‌ترین: خطر آریتمی قلبی) ──
  {
    id: "potassium_critical",
    match: (e) => {
      const t = val(e);
      return t.K != null && (t.K >= 6.0 || t.K <= 2.9);
    },
    build: (e) => {
      const t = val(e);
      const kg = e.graded.find((g) => g.test === "K");
      const high = t.K >= 6.0;
      const veryHigh = t.K >= 6.0;   // مقدار بحرانی/پنیک پتاسیم در اغلب آزمایشگاه‌ها ≥ ۶.۰ است
      const veryLow = t.K <= 2.5;
      const critical = veryHigh || veryLow;
      const rangeTxt = kg?.range ? ` (حد طبیعی ${kg.range})` : "";
      return {
        pattern: high ? "hyperkalemia" : "hypokalemia",
        urgency: critical ? "emergency" : "this_week",
        blocks_others: critical,
        ...(t.K != null ? { key_number: t.K } : {}),
        headline: high
          ? "پتاسیم خون شما بالاست"
          : "پتاسیم خون شما پایین است",
        must_say:
          `پتاسیم خون شما ${t.K}${rangeTxt} است و ${high ? "بالاتر" : "پایین‌تر"} از حد طبیعی قرار دارد. ` +
          "پتاسیم جریان برقی‌ای را که ضربان قلب را تنظیم می‌کند کنترل می‌کند؛ " +
          (high
            ? "پتاسیمِ خیلی بالا می‌تواند ضربان قلب را کند یا بی‌نظم کند و در حد بحرانی خطر ایست قلبی دارد"
            : "پتاسیمِ خیلی پایین باعث ضعف عضلانی و بی‌نظمی ضربان قلب می‌شود") +
          (critical ? " — و در این حد نیاز به رسیدگی فوری دارد." : "، پس باید بررسی شود."),
        action: critical
          ? "همین حالا به اورژانس مراجعه کنید. این برگه را همراه ببرید."
          : "این هفته با پزشک مطرح کنید. اگر تپش قلب، ضعف شدید یا بی‌حسی دارید، زودتر مراجعه کنید.",
        suggest: critical
          ? []
          : [
              "تکرار آزمایش پتاسیم (نمونهٔ همولیزشده می‌تواند پتاسیم را کاذب بالا نشان دهد)",
              "نوار قلب در صورت صلاحدید پزشک",
            ],
        warnings: [],
      };
    },
  },

  // ── سدیم ──
  {
    id: "sodium_critical",
    match: (e) => {
      const t = val(e);
      return t.NA != null && (t.NA >= 155 || t.NA <= 125);
    },
    build: (e) => {
      const t = val(e);
      const nag = e.graded.find((g) => g.test === "NA");
      const high = t.NA >= 155;
      const critical = t.NA >= 160 || t.NA <= 120;
      const rangeTxt = nag?.range ? ` (حد طبیعی ${nag.range})` : "";
      const corrNote = e.indices.na_correction_applied
        ? ` (این مقدار به‌خاطر قند خیلی بالا تصحیح شده؛ عددِ اندازه‌گیری‌شده روی برگه ${e.indices.na_measured} است.)`
        : "";
      return {
        pattern: high ? "hypernatremia" : "hyponatremia",
        urgency: critical ? "emergency" : "this_week",
        blocks_others: critical,
        ...(t.NA != null ? { key_number: t.NA } : {}),
        headline: high
          ? "سدیم خون شما بالاست"
          : "سدیم خون شما پایین است",
        must_say:
          `سدیم خون شما ${t.NA}${rangeTxt} است. ` +
          (high
            ? "سدیم بالاتر از حد طبیعی اغلب یعنی بدن نسبت به آب، نمک بیش‌ازحد دارد (معمولاً کم‌آبی یا کم‌نوشیدن آب). "
            : "سدیم پایین‌تر از حد طبیعی یعنی نسبت آب به نمک بدن به‌هم خورده؛ علت‌های مختلفی دارد (از مصرف بعضی داروها تا مشکل کلیه/قلب/هورمونی). ") +
          "چون سدیم تعادل آب داخل و بیرون سلول‌های مغز را تنظیم می‌کند، تغییر شدید یا سریع آن می‌تواند باعث ورم یا کم‌آبیِ مغز و در نتیجه گیجی و تشنج شود" +
          (critical ? " — و در این حد نیاز به رسیدگی فوری دارد." : " و باید بررسی شود.") +
          corrNote,
        action: critical
          ? "همین حالا به اورژانس مراجعه کنید. اگر گیجی، سردرد شدید یا تشنج رخ داد، فوری‌تر."
          : "این هفته با پزشک مطرح کنید.",
        suggest: critical ? [] : ["تکرار آزمایش سدیم", "بررسی توسط پزشک"],
        warnings: critical
          ? ["اصلاح سدیم باید آهسته و زیر نظر پزشک باشد؛ خودسرانه مقدار زیاد آب یا نمک مصرف نکنید."]
          : [],
      };
    },
  },

  // ── کلسیم ──
  // ⚠️ قبلاً فقط CA≥13 یا ≤7.0 قاعده داشت؛ هایپر/هایپوکلسمیِ متوسط (گرید ۱–۲)
  //    به unmatched_abnormal می‌افتاد و «توضیح آماده نداریم» + urgency پایین می‌داد.
  //    حالا هر کلسیمِ غیرطبیعی پوشش دارد، با فوریتِ متناسبِ گرید CTCAE.
  {
    id: "calcium_abnormal",
    match: (e) => {
      const ca = e.graded.find((g) => g.test === "CA");
      return ca?.abnormal === true;
    },
    build: (e) => {
      const ca = e.graded.find((g) => g.test === "CA");
      const v = ca.value;
      const high = ca.dir === "high";
      const grade = levelGrade(ca);
      const critical = v >= 14 || v <= 6.5;      // نیاز به اورژانس
      const corrNote = e.indices.ca_correction_applied
        ? ` (این مقدار با آلبومین تصحیح شده؛ اندازه‌گیری‌شده روی برگه ${e.indices.ca_measured}.)`
        : "";
      // فوریت: بحرانی→اورژانس، متوسط/شدید (گرید ۲+)→این هفته، خفیف (گرید ۱)→عادی
      const urgency = critical ? "emergency" : (grade >= 2 ? "this_week" : "routine");
      const mild = urgency === "routine";
      const rangeTxt = ca?.range ? ` (حد طبیعی ${ca.range})` : "";
      return {
        pattern: high ? "hypercalcemia" : "hypocalcemia",
        urgency,
        blocks_others: critical,
        ...(v != null ? { key_number: v } : {}),
        headline: high ? "کلسیم خون شما بالاست" : "کلسیم خون شما پایین است",
        must_say:
          `کلسیم خون شما ${v}${rangeTxt} است و ${high ? "بالاتر" : "پایین‌تر"} از حد طبیعی قرار دارد. ` +
          (high
            ? "شایع‌ترین علت‌های کلسیم بالا پرکاری غدهٔ پاراتیروئید و بعضی بیماری‌ها هستند و حتماً باید علت‌یابی شود. "
            : "کلسیم پایین می‌تواند از کمبود ویتامین D، مشکل پاراتیروئید یا کاهش منیزیم باشد. ") +
          "کلسیم علاوه بر استخوان، در انقباض عضله، کار اعصاب و ضربان قلب نقش دارد؛ به همین دلیل تغییر زیاد آن می‌تواند باعث گرفتگی عضلانی یا بی‌نظمی ضربان قلب شود" +
          (critical ? " — و در این حد نیاز به رسیدگی فوری دارد." : ".") +
          corrNote,
        action: critical
          ? "همین حالا به اورژانس مراجعه کنید."
          : mild
            ? "با پزشک مطرح کنید تا علت بررسی شود."
            : "این هفته با پزشک مطرح کنید. اگر گرفتگی عضلانی، بی‌حسی دور دهان یا تشنج دارید، زودتر.",
        suggest: critical
          ? []
          : high
            ? ["تکرار کلسیم", "آلبومین (برای تصحیح کلسیم)", "هورمون پاراتیروئید (PTH)", "بررسی توسط پزشک"]
            : ["تکرار کلسیم", "آلبومین (برای تصحیح کلسیم)", "ویتامین D", "منیزیم", "بررسی توسط پزشک"],
        warnings: [],
      };
    },
  },

  // ── الگوی زنجیره‌ای منیزیم ──
  // نکته بالینی مهم (کیس Alyssa): منیزیم پایین می‌تواند باعث پتاسیم و
  //   کلسیم پایینِ مقاوم به درمان شود — تا منیزیم اصلاح نشود بقیه درست نمی‌شوند.
  {
    id: "magnesium_depletion",
    match: (e) => {
      const t = val(e);
      const mg = e.graded.find((g) => g.test === "MG");
      const mgLow = mg?.abnormal && mg.dir === "low";
      if (!mgLow) return false;
      // همراه با پتاسیم یا کلسیم پایین
      const k = e.graded.find((g) => g.test === "K");
      const ca = e.graded.find((g) => g.test === "CA");
      const kLow = k?.abnormal && k.dir === "low";
      const caLow = ca?.abnormal && ca.dir === "low";
      return kLow || caLow;
    },
    build: (e) => {
      const mg = e.graded.find((g) => g.test === "MG");
      const k = e.graded.find((g) => g.test === "K");
      const ca = e.graded.find((g) => g.test === "CA");
      const kLow = k?.abnormal && k.dir === "low";
      const caLow = ca?.abnormal && ca.dir === "low";
      const both = [kLow && "پتاسیم", caLow && "کلسیم"].filter(Boolean).join(" و ");
      // Table 11.15 (Mistler, «Electrolytes»): کم‌بودِ منیزیم به‌ویژه با پتاسیمِ
      //   پایین، خطرِ آریتمی قلبی و تشدیدِ مسمومیت با دیجوکسین را بالا می‌برد.
      return {
        pattern: "magnesium_depletion_pattern",
        urgency: "this_week",
        headline: "منیزیم خون شما پایین است و ممکن است روی سایر املاح اثر گذاشته باشد",
        must_say:
          `منیزیم خون شما ${mg.value} است (حد طبیعی ${mg.range}) و همراه آن ${both} هم پایین است. ` +
          "نکته‌ی مهم این است که وقتی منیزیم کم باشد، بدن نمی‌تواند این املاح دیگر را به‌درستی متعادل کند — " +
          "و معمولاً تا منیزیم اصلاح نشود، بقیه هم درست نمی‌شوند (اصلاحِ منیزیم اغلب خودش پتاسیم و کلسیم را هم درست می‌کند). این نکته برای پزشک مهم است.",
        action: "این هفته با پزشک مطرح کنید و حتماً به پایین بودن منیزیم اشاره کنید.",
        suggest: ["اصلاح منیزیم پیش از سایر املاح", "تکرار پنل الکترولیت", "بررسی توسط پزشک"],
        warnings: [
          ...(kLow
            ? ["پایین بودنِ همزمانِ منیزیم و پتاسیم خطرِ بی‌نظمیِ ضربان قلب را بالا می‌برد؛ اگر تپش قلب، ضربان نامنظم یا سرگیجه دارید زودتر مراجعه کنید."]
            : []),
          "اگر داروی قلبیِ دیگوکسین (دیجیتال) مصرف می‌کنید، منیزیمِ پایین سمّیتِ آن را بیشتر می‌کند — حتماً به پزشک بگویید.",
        ],
        key_number: mg.value,
      };
    },
  },

  {
    id: "hyperammonemia",
    match: (e) => {
      const t = val(e);
      return t.NH3 != null && t.NH3 > 100;
    },
    build: () => ({
      pattern: "hyperammonemia",
      urgency: "emergency",
      headline: "آمونیاک خون شما بالاست",
      must_say:
        "آمونیاک ماده‌ای است که کبد معمولاً آن را از خون پاک می‌کند. بالا بودن آن (اغلب در مشکلات کبدی) می‌تواند بر هوشیاری اثر بگذارد و نیاز به رسیدگی فوری دارد.",
      action: "همین امروز به پزشک یا اورژانس مراجعه کنید.",
      suggest: [],
      warnings: [],
      blocks_others: true,
    }),
  },

  // ═══════════ قند ═══════════

  // ── کتواسیدوز دیابتی (DKA) — الگوی اورژانسی ──
  // ترکیب: گلوکز خیلی بالا + بی‌کربنات پایین + کتون مثبت.
  // اعتبارسنجی با کیس‌های فصل: John (گلوکز۶۰۰، HCO3=۶، کتون زیاد)،
  //   Myra (گلوکز۵۰۰، کتون مثبت). محتاط: نیاز به چند نشانه با هم.
  {
    id: "dka_pattern",
    match: (e) => {
      const t = val(e);
      // قند بالا: ناشتا یا تصادفی — «BS/blood sugar» رایج‌ترین برچسب است و
      // به GLU_RANDOM نگاشت می‌شود؛ اگر اینجا لحاظ نشود DKA با قند تصادفی جا می‌ماند.
      const gluHigh = (t.GLU_F != null && t.GLU_F >= 250) ||
                      (t.GLU_RANDOM != null && t.GLU_RANDOM >= 250);
      // بی‌کربنات پایین (اسیدوز)
      const hco3 = e.graded.find((g) => g.test === "HCO3");
      const hco3Low = hco3?.abnormal && hco3.dir === "low";
      // کتون: ادرار یا سرم
      const ketone = urinePositive(e, /ketone|کتون|hydroxybutyrate|بتاهیدروکسی/i);
      // برای احتیاط: گلوکز بالا + حداقل یکی از (بی‌کربنات پایین، کتون)
      // یا هر دوی بی‌کربنات پایین و کتون (حتی اگر گلوکز ثبت نشده)
      return (gluHigh && (hco3Low || ketone)) || (hco3Low && ketone);
    },
    build: (e) => {
      const t = val(e);
      const hco3 = e.graded.find((g) => g.test === "HCO3");
      const hco3Low = hco3?.abnormal && hco3.dir === "low";
      const ketone = urinePositive(e, /ketone|کتون|hydroxybutyrate|بتاهیدروکسی/i);
      // اگر هم بی‌کربنات پایین و هم کتون → تصویر کامل‌تر و جدی‌تر
      const fullPicture = hco3Low && ketone;
      return {
        pattern: "dka_pattern",
        urgency: "emergency",
        blocks_others: true,
        headline: "این نتایج ممکن است نشانه‌ی یک وضعیت جدی و فوری باشند",
        must_say:
          "ترکیب قند خون بسیار بالا" +
          (ketone ? "، وجود کتون" : "") +
          (hco3Low ? "، و اسیدی شدن خون" : "") +
          " می‌تواند نشانه‌ی وضعیتی به نام «کتواسیدوز دیابتی» باشد که نیاز به رسیدگی فوری پزشکی دارد. " +
          "این وضعیت به‌خصوص در افراد دیابتی و هنگام بیماری یا نرسیدن انسولین رخ می‌دهد.",
        action: "همین حالا به اورژانس مراجعه کنید. این برگه را همراه ببرید. معطل نکنید.",
        suggest: [],
        warnings: fullPicture
          ? ["علائم هشدار: تنفس تند و عمیق، بوی میوه‌ای دهان، تهوع و استفراغ، گیجی — در صورت وجود، فوراً اورژانس."]
          : [],
      };
    },
  },

  // ═══════════ HHS — حالت هایپراسمولارِ هایپرگلیسمیک (کمای غیرکتونی) ═══════════
  // Freeman, «Carbohydrates»، بخش Pathophysiology of Diabetes Mellitus:
  //   تصویرِ شایعِ دیابت تیپ ۲ درمان‌نشده و جدا از DKA — قند از ۶۰۰ می‌گذرد
  //   (گاه >۱۰۰۰)، کم‌آبی شدید، BUN/کراتینین بالا، اسمولالیتهٔ >۳۲۰، و «کتون
  //   دیده نمی‌شود» چون خودِ حالتِ هایپراسمولار جلوی لیپولیزِ گلوکاگون را می‌گیرد.
  //   عین جملهٔ فصل: «Mortality is high with this condition.»
  // ⚠️ باگی که این قاعده رفع می‌کند: قندِ ۹۵۰ با کتونِ منفی هیچ قاعدهٔ اورژانسی را
  //    فعال نمی‌کرد و فقط «diabetes_range / این هفته وقت بگیرید» می‌گرفت.
  {
    id: "hhs_pattern",
    match: (e) => {
      const t = val(e);
      const glu = Math.max(
        t.GLU_F ?? -Infinity,
        t.GLU_RANDOM ?? -Infinity,
        t.GLU_2H ?? -Infinity,
      );
      if (!(glu >= 600)) return false;
      // اگر تصویرِ کتواسیدوز است، به قاعدهٔ اختصاصیِ DKA واگذار کن (پیامش دقیق‌تر است).
      const hco3 = e.graded.find((g) => g.test === "HCO3");
      const hco3Low = hco3?.abnormal && hco3.dir === "low";
      const ketone = urinePositive(e, /ketone|کتون|hydroxybutyrate|بتاهیدروکسی/i);
      return !(hco3Low || ketone);
    },
    build: (e) => {
      const cand = ["GLU_F", "GLU_RANDOM", "GLU_2H"]
        .map((k) => e.graded.find((g) => g.test === k))
        .filter((g) => g?.value != null);
      const g = cand.reduce((a, b) => (b.value > a.value ? b : a));
      // شواهدِ کم‌آبی/ازوتمیِ پیش‌کلیوی که فصل مشخصهٔ HHS می‌شمارد
      const bun = e.graded.find((x) => x.test === "UREA_N" || x.test === "UREA");
      const cr = e.graded.find((x) => x.test === "CREAT");
      const dehydration =
        (bun?.abnormal && bun.dir === "high") || (cr?.abnormal && cr.dir === "high");
      // آیا کتونِ ادرار اصلاً اندازه‌گیری شده؟ (منفی‌بودنش کتواسیدوز را رد نمی‌کند)
      const ketoneTested =
        !!e.qual && Object.keys(e.qual).some((k) => /ketone|کتون/i.test(k));
      return {
        pattern: "hhs_pattern",
        urgency: "emergency",
        blocks_others: true,
        headline: "قند خون شما در حدی است که وضعیت اورژانسی محسوب می‌شود",
        key_number: g.value,
        must_say:
          `قند خون شما ${g.value} است (حد طبیعی ${g.range}) — چندین برابرِ حد طبیعی. ` +
          "در این حد، کلیه برای دفعِ قند مقدار زیادی آب هم از بدن بیرون می‌کشد؛ بدن به‌شدت کم‌آب " +
          "و خون غلیظ می‌شود. این حالت اسمی دارد: «وضعیت هایپراسمولار»، و می‌تواند به خواب‌آلودگی " +
          "و کاهش سطح هوشیاری برسد. " +
          (dehydration ? "بالا بودنِ اوره/کراتینین شما هم با همین کم‌آبی می‌خواند. " : "") +
          "این با «قند بالا»ی معمولی یکی نیست: درمانش مایعاتِ وریدی و انسولین در بیمارستان است، " +
          "نه تنظیمِ دارو در مطب — پس آن را به نوبتِ بعدی موکول نکنید." +
          // این قید عمداً در must_say است نه warnings: هشدارها ضامنِ سرور ندارند و
          // مدل یک‌بار همین جمله را حذف کرد، ولی must_sayِ اورژانسی force-append می‌شود.
          (ketoneTested
            ? " ضمناً منفی بودنِ کتونِ ادرار اینجا خیال‌تان را راحت نکند: نوارِ ادرار عمدتاً استواستات را می‌سنجد و بتاهیدروکسی‌بوتیرات را — که حدود ۷۸٪ کتون‌های بدن است — نشان نمی‌دهد، پس رد کردنِ کتواسیدوز کارِ آزمایشِ خون در اورژانس است."
            : ""),
        action: "همین حالا به اورژانس مراجعه کنید. این برگه را همراه ببرید. معطل نکنید.",
        suggest: [],
        warnings: [
          "علائم هشدار: خواب‌آلودگی و گیجی، خشکیِ شدید دهان، کم‌شدنِ ادرار، ضعفِ یک طرفِ بدن، تشنج — با هر یک از این‌ها فوراً اورژانس.",
        ],
      };
    },
  },

  {
    id: "glycemia",
    match: (e) => {
      const t = val(e);
      return (t.GLU_F != null && t.GLU_F >= 100) ||
             (t.HBA1C != null && t.HBA1C >= 5.7) ||
             (t.GLU_2H != null && t.GLU_2H >= 140) ||
             // قند تصادفی معیار پیش‌دیابت ندارد؛ فقط ≥۲۰۰ (معیار دیابت ADA) لحاظ می‌شود
             (t.GLU_RANDOM != null && t.GLU_RANDOM >= 200);
    },
    build: (e) => {
      const t = val(e);
      // HbA1c در کم‌خونی/اندیس غیرطبیعی نامعتبر است (به قند نمی‌چسبد → عدد گمراه‌کننده)
      const hgb = e.graded.find((g) => g.test === "HGB");
      const a1cBad = t.HBA1C != null && (hgb?.abnormal || t.MCV < 80 || t.MCV > 100);

      // آستانه‌های تشخیص ADA (Standards of Care 2025, بخش ۲):
      //   ناشتا ≥۱۲۶، دو ساعته ≥۲۰۰، HbA1c ≥۶.۵، تصادفی ≥۲۰۰ → دیابت.
      // هر شرط = یک «آزمایشِ مستقلِ در محدودهٔ دیابت». A1c نامعتبر شمرده نمی‌شود.
      const dmHits = [
        t.GLU_F != null && t.GLU_F >= 126,
        t.HBA1C != null && !a1cBad && t.HBA1C >= 6.5,
        t.GLU_2H != null && t.GLU_2H >= 200,
        t.GLU_RANDOM != null && t.GLU_RANDOM >= 200,
      ].filter(Boolean).length;
      const dm = dmHits >= 1;
      // ADA: دو آزمایشِ متفاوتِ غیرطبیعی روی یک نمونه = تشخیص قطعی، بدون نیاز به تکرار.
      //
      // ⚠️ اینجا یک‌بار به «قندِ ≥۲۰۰ به‌تنهایی هم قطعی است» تغییر کرد و برگردانده
      // شد. ADA Standards of Care، بخش ۲، توصیهٔ 2.1b:
      //   «In the absence of unequivocal hyperglycemia (e.g., hyperglycemic
      //    crises), diagnosis requires confirmatory testing.»
      // و تأیید یعنی: «two abnormal results from different tests which may be
      // obtained at the same time (e.g., A1C and FPG), or the same test at two
      // different time points» — یعنی دقیقاً همین dmHits >= 2.
      //
      // تنها استثنای ADA قندِ تصادفیِ ≥۲۰۰ است، و آن هم فقط «in an individual
      // with classic symptoms of hyperglycemia or hyperglycemic crisis». این
      // موتور فقط عدد می‌بیند و هیچ ورودیِ علامتی ندارد، پس هرگز نمی‌تواند
      // احراز کند که آن استثنا برقرار است. عددِ بالا به‌تنهایی علامت نیست.
      //
      // توجیهِ آن تغییر این بود که «FBS۴۰۰ + A1c۱۲ می‌گفت باید تکرار شود» —
      // ولی آن دو، دو آزمایشِ متفاوت‌اند، یعنی dmHits = 2 و از همان اول قطعی
      // بود. آن باگ وجود نداشت؛ تغییر، یک تشخیصِ قطعیِ تک‌آزمایشی می‌ساخت که
      // ADA آن را نمی‌پذیرد.
      const confirmed = dmHits >= 2;

      // eAG — میانگین قند سه ماه از HbA1c (فرمول ADAG/Nathan 2008: 28.7×A1c − 46.7)
      const eag = (t.HBA1C != null && !a1cBad) ? Math.round(28.7 * t.HBA1C - 46.7) : null;

      // هایپرگلیسمی شدید → خطر تیپ‌کردن به DKA/HHS. برگه اغلب کتون/بی‌کربنات ندارد،
      // پس نمی‌توان بحران را با آزمایش رد کرد؛ تنها راه، هشدار علائم است.
      const marked = (t.GLU_F != null && t.GLU_F >= 250) ||
                     (t.GLU_2H != null && t.GLU_2H >= 250) ||
                     (t.GLU_RANDOM != null && t.GLU_RANDOM >= 250) ||
                     (t.HBA1C != null && !a1cBad && t.HBA1C >= 10);

      const eagPhrase = eag != null
        ? `HbA1c شما ${t.HBA1C}٪ است؛ یعنی میانگین قند خون شما در سه ماه گذشته حدود ${eag} بوده (میانگین طبیعی حدود ۱۰۰). `
        : "";
      const a1cWarn = a1cBad
        ? ["چون شمارش خون شما طبیعی نیست، عدد HbA1c ممکن است دقیق نباشد. حتماً به پزشک بگویید."]
        : [];

      if (dm) {
        const dxPhrase = confirmed
          ? "چون دو آزمایشِ مستقل هر دو در محدودهٔ دیابت هستند، طبق معیارها این نتیجه به‌تنهایی برای تشخیص دیابت کافی است و برای اثبات نیازی به تکرار ندارد."
          : "برای قطعی‌شدن تشخیص، این آزمایش باید یک بار دیگر تکرار شود — نتیجه را نهایی نگیرید، ولی معطل هم نکنید.";
        const warnings = [];
        if (marked) {
          warnings.push(
            "قند شما بسیار بالاست. اگر تشنگی و ادرار زیاد، تاری دید، تهوع و استفراغ، تنفس تند و عمیق، یا گیجی دارید، همین امروز به پزشک یا اورژانس مراجعه کنید.",
          );
        }
        warnings.push(...a1cWarn);
        return {
          pattern: "diabetes_range",
          urgency: "this_week",
          headline: marked ? "قند خون شما بسیار بالاتر از حد طبیعی است" : "قند خون شما بالاتر از حد طبیعی است",
          ...(eag != null ? { key_number: eag } : {}),
          must_say: eagPhrase + dxPhrase,
          action: "این هفته وقت بگیرید" + (marked ? "؛ در صورت داشتن علائم بالا همین امروز." : "."),
          // فهرست پایهٔ دیابتِ تازه‌تشخیص (ADA بخش ۲/۴/۱۲). اگر قطعی است دیگر «تکرار قند» لازم نیست.
          suggest: confirmed
            ? ["HbA1c برای پایش", "ACR ادرار", "eGFR", "پروفایل چربی", "معاینهٔ ته‌چشم"]
            : ["تکرار قند ناشتا", "HbA1c", "ACR ادرار", "eGFR", "پروفایل چربی"],
          warnings,
        };
      }
      return {
        pattern: "prediabetes_range",
        urgency: "routine",
        headline: "قند خون شما کمی بالاتر از حد طبیعی است",
        must_say: eagPhrase +
          "این در محدودهٔ «پیش‌دیابت» است. در این مرحله تغییر رژیم غذایی و تحرک بیشترین اثر را دارد و می‌تواند از پیشرفت به دیابت جلوگیری کند.",
        action: "نوبت عادی با پزشک.",
        suggest: ["تکرار قند ناشتا", "HbA1c"],
        warnings: a1cWarn,
      };
    },
  },

  // ═══════════ هایپوگلیسمی (قند پایین) ═══════════
  // سطوح از فصل: <۷۰ هشدار، <۵۴ بالینی مهم، <۵۰ علائم معمولاً بارز.
  // اعتبارسنجی با کیس‌های فصل: Angela (۶۰=خفیف)، نوزاد Martha (۲۵=شدید).
  {
    id: "hypoglycemia",
    match: (e) => {
      const t = val(e);
      // هر قندی که پایین باشد: ناشتا، دو ساعته، یا تصادفی
      const g = t.GLU_F ?? t.GLU_2H ?? t.GLU_RANDOM ?? null;
      return g != null && g < 70;
    },
    build: (e) => {
      const t = val(e);
      const g = t.GLU_F ?? t.GLU_2H ?? t.GLU_RANDOM;
      const severe = g < 54;   // سطح بالینی مهم
      return {
        pattern: severe ? "hypoglycemia_significant" : "hypoglycemia_mild",
        urgency: severe ? "this_week" : "routine",
        headline: severe
          ? "قند خون شما پایین‌تر از حد طبیعی است"
          : "قند خون شما کمی پایین است",
        must_say: severe
          ? "قند خون شما به‌طور قابل‌توجهی پایین است. قند پایین می‌تواند علائمی مثل لرزش، تعریق، ضعف و گیجی ایجاد کند. " +
            "علت‌های مختلفی دارد و باید بررسی شود — به‌خصوص اگر داروی دیابت مصرف می‌کنید."
          : "قند خون شما کمی پایین‌تر از حد طبیعی است. این می‌تواند به‌خاطر ناشتا بودن طولانی، فاصله از وعده‌ی غذایی، یا علل دیگر باشد. " +
            "گاهی یک اندازه‌گیری تکی پایین اهمیت زیادی ندارد، ولی بهتر است با پزشک مطرح شود.",
        action: severe
          ? "این هفته با پزشک مطرح کنید. اگر همین حالا علائم شدید (گیجی، ضعف شدید، تعریق سرد) دارید، چیزی شیرین بخورید و در صورت ادامه به پزشک مراجعه کنید."
          : "نوبت عادی. اگر تکرار می‌شود یا همراه با علائم است، با پزشک مطرح کنید.",
        suggest: severe
          ? ["تکرار قند خون", "بررسی توسط پزشک", "اگر داروی دیابت مصرف می‌کنید حتماً بگویید"]
          : ["تکرار قند ناشتا"],
        warnings: (g != null && g < 40)
          ? ["⚠️ اگر واقعاً چنین قند پایینی دارید و علامت‌دار هستید، این وضعیت جدی است و نیاز به رسیدگی فوری دارد."]
          : [],
      };
    },
  },

  // ═══════════ پروفایل چربی (کلسترول/LDL/HDL/تری‌گلیسرید) ═══════════
  // طبقه‌بندی TG از NCEP: مرزی ۱۵۰–۲۰۰، بالا ۲۰۰–۵۰۰، خیلی بالا >۵۰۰،
  //   خطر پانکراتیت >۸۸۰. پیام ساده و بدون اصطلاح.
  {
    id: "lipid_profile",
    match: (e) => {
      const t = val(e);
      const chol = e.graded.find((g) => g.test === "CHOL");
      const ldl = e.graded.find((g) => g.test === "LDL");
      const hdl = e.graded.find((g) => g.test === "HDL");
      const cholHigh = chol?.abnormal && chol.dir === "high";
      const ldlHigh = ldl?.abnormal && ldl.dir === "high";
      const hdlLow = hdl?.abnormal && hdl.dir === "low";
      const tgHigh = t.TG != null && t.TG >= 150;
      return cholHigh || ldlHigh || hdlLow || tgHigh;
    },
    build: (e) => {
      const t = val(e);
      const chol = e.graded.find((g) => g.test === "CHOL");
      const ldl = e.graded.find((g) => g.test === "LDL");
      const hdl = e.graded.find((g) => g.test === "HDL");
      const cholHigh = chol?.abnormal && chol.dir === "high";
      const ldlHigh = ldl?.abnormal && ldl.dir === "high";
      const hdlLow = hdl?.abnormal && hdl.dir === "low";

      // طبقه‌بندی تری‌گلیسرید
      const tg = t.TG;
      const tgSevere = tg != null && tg > 880;    // خطر پانکراتیت
      const tgVeryHigh = tg != null && tg > 500;
      const tgHigh = tg != null && tg >= 200;
      const tgBorderline = tg != null && tg >= 150;

      // خطر پانکراتیت → جدی‌ترین، اولویت دارد
      if (tgSevere) {
        return {
          pattern: "triglyceride_pancreatitis_risk",
          urgency: "this_week",
          ...(tg != null ? { key_number: tg } : {}),
          headline: "تری‌گلیسرید خون شما بسیار بالاست",
          must_say:
            `تری‌گلیسرید (یک نوع چربی خون) شما ${tg} است، در حالی‌که حد مطلوب زیر ۱۵۰ است. ` +
            "وقتی تری‌گلیسرید از حدود ۵۰۰ عبور می‌کند، ذرات چربی می‌توانند لوزالمعده را تحریک کنند و خطر التهاب لوزالمعده (پانکراتیت) بالا می‌رود — که وضعیت جدی و گاهی اورژانسی است. علاوه بر این، چربی خونِ بالا خطر قلبی‌عروقی را هم افزایش می‌دهد. این حد باید زود بررسی و درمان شود.",
          action: "این هفته حتماً با پزشک مطرح کنید. اگر درد شدید شکم همراه تهوع و استفراغ دارید، فوراً به اورژانس بروید.",
          suggest: ["پروفایل چربی ناشتا (۱۲ ساعت)", "بررسی توسط پزشک", "قند خون"],
          warnings: ["تا کنترل تری‌گلیسرید، از الکل و غذاهای خیلی چرب/شیرین به‌شدت پرهیز کنید."],
        };
      }

      // ساخت توضیح ترکیبی با عددِ هر جزء + محدودهٔ مطلوب
      const parts = [];
      if (cholHigh) parts.push(`کلسترول تام ${chol.value} (مطلوب زیر ۲۰۰)`);
      if (ldlHigh) parts.push(`کلسترول بد (LDL) ${ldl.value} (مطلوب زیر ۱۰۰؛ برای افراد پرخطر قلبی زیر ۷۰)`);
      if (hdlLow) parts.push(`کلسترول خوب (HDL) ${hdl.value} که پایین است (مطلوب: مردان بالای ۴۰، زنان بالای ۵۰)`);
      if (tgVeryHigh) parts.push(`تری‌گلیسرید ${tg} که خیلی بالاست`);
      else if (tgHigh) parts.push(`تری‌گلیسرید ${tg} که بالاست (مطلوب زیر ۱۵۰)`);
      else if (tgBorderline) parts.push(`تری‌گلیسرید ${tg} که مرزی است (مطلوب زیر ۱۵۰)`);

      const summary = parts.join("، ");
      // اگر فقط مرزی و خفیف → routine؛ اگر LDL/کلسترول واضح بالا یا TG بالا → this_week
      const significant = ldlHigh || cholHigh || tgHigh || tgVeryHigh;
      // LDL ≥۱۹۰ سطحی است که راهنماها مستقل از سایر عوامل خطر، درمان دارویی پرقدرت را توصیه می‌کنند.
      const ldlVeryHigh = ldl != null && ldl.value >= 190;
      const keyNum = ldlHigh ? ldl.value : tgHigh || tgVeryHigh ? tg : cholHigh ? chol.value : null;

      // non-HDL (Kenwright, «Lipids and Lipoproteins»): پیش‌بینی‌کنندهٔ مستقلِ خطر،
      //   به‌ویژه در دیابت و تری‌گلیسریدِ بالا؛ هدف ≈ هدفِ LDL + ۳۰ (یعنی زیر ۱۳۰).
      const nonHdl = e.indices?.non_hdl;
      const nonHdlHigh = nonHdl != null && nonHdl >= 130;
      // تلهٔ فریدوالد: با TG>۴۰۰ محاسبهٔ LDL نامعتبر می‌شود.
      const friedewaldInvalid = tg != null && tg > 400 && ldl != null;

      return {
        pattern: "dyslipidemia",
        urgency: significant ? "this_week" : "routine",
        ...(keyNum != null ? { key_number: keyNum } : {}),
        headline: "چربی خون شما در حد مطلوب نیست",
        must_say:
          `در پروفایل چربی شما ${summary} دیده می‌شود. ` +
          (nonHdlHigh
            ? `مجموعِ چربی‌های بدِ خون (کلسترول تام منهای HDL) ${nonHdl} است، در حالی‌که مطلوب زیر ۱۳۰ است؛ این عدد همهٔ ذرات چربیِ رسوب‌کننده در رگ را با هم می‌سنجد و پیش‌بینی‌کنندهٔ خوبی برای خطر قلبی است — به‌ویژه اگر دیابت یا تری‌گلیسرید بالا داشته باشید. `
            : "") +
          "کلسترول بد (LDL) اضافی به‌مرور در دیوارهٔ رگ‌ها رسوب می‌کند و پلاک می‌سازد؛ این پلاک‌ها رگ را تنگ می‌کنند و خطر حملهٔ قلبی و سکته را بالا می‌برند — معمولاً بدون هیچ علامتی تا سال‌ها بعد. " +
          (ldlVeryHigh
            ? "مقدار LDL شما به حدی است که معمولاً فارغ از سایر عوامل، درمان دارویی جدی لازم می‌شود و بهتر است علت ارثی (چربی خون خانوادگی) هم بررسی شود. "
            : "") +
          "خبر خوب اینکه با تغییر رژیم غذایی، ورزش، و در صورت لزوم دارو، قابل کنترل است.",
        action: significant
          ? "این هفته با پزشک مطرح کنید تا سطح خطر قلبی شما و برنامهٔ مناسب (رژیم، ورزش، احیاناً استاتین) تعیین شود."
          : "نوبت عادی با پزشک. تغذیه و تحرک را جدی بگیرید.",
        suggest: ["پروفایل چربی ناشتا (۱۲ ساعت) برای تأیید", "قند خون", "مشاوره با پزشک دربارهٔ خطر قلبی‌عروقی"],
        warnings: [
          "این آزمایش باید ناشتا (۱۲ ساعت) گرفته شده باشد؛ به‌ویژه تری‌گلیسرید با غذای اخیر کاذب بالا می‌رود. اگر ناشتا نبوده‌اید، با یک نمونهٔ ناشتا تکرار شود.",
          ...(friedewaldInvalid
            ? ["چون تری‌گلیسرید شما بالای ۴۰۰ است، عددِ LDL در بیشتر آزمایشگاه‌ها محاسبه‌ای است و در این حالت قابل اعتماد نیست؛ برای تصمیم درمانی بهتر است پزشک به مجموعِ چربی‌های بد (non-HDL) یا LDLِ مستقیم تکیه کند."]
            : []),
        ],
      };
    },
  },

  // ═══════════ کبد ═══════════
  {
    id: "liver_pattern",
    match: (e) => {
      const alt = e.graded.find((g) => g.test === "ALT");
      const ast = e.graded.find((g) => g.test === "AST");
      const alp = e.graded.find((g) => g.test === "ALP");
      const altHigh = alt?.abnormal && alt.dir === "high";
      const astHigh = ast?.abnormal && ast.dir === "high";
      const alpHigh = alp?.abnormal && alp.dir === "high";
      // اگر فقط ALP بالاست و ALT/AST طبیعی‌اند، این حالت را به الگوی
      // تخصصی ALP واگذار کن (استخوان/بارداری/صفراوی) تا پیام تکراری نشود.
      if (alpHigh && !altHigh && !astHigh) return false;
      return altHigh || astHigh || alpHigh;
    },
    build: (e) => {
      const t = val(e);
      const ck = e.graded.find((g) => g.test === "CK");
      const ast = e.graded.find((g) => g.test === "AST");
      const alt = e.graded.find((g) => g.test === "ALT");

      // CK بالا + AST بالا + ALT نرمال → عضله، نه کبد
      if (ck?.abnormal && ck.dir === "high" && ast?.abnormal && !alt?.abnormal) {
        return {
          pattern: "muscle_origin_not_liver",
          urgency: "routine",
          headline: "یکی از آنزیم‌ها بالاست، ولی احتمالاً از عضله می‌آید نه کبد",
          must_say:
            "آنزیم AST بالا رفته، ولی چون CK (آنزیم مخصوص عضله) هم بالاست و ALT طبیعی مانده، این الگو بیشتر به عضله می‌خورد تا کبد. ورزش سنگین چند روز اخیر هم می‌تواند این را بسازد.",
          action: "نوبت عادی. اگر ورزش سنگین کرده‌اید حتماً بگویید.",
          suggest: ["تکرار CK", "GGT"],
          warnings: [],
        };
      }

      // R (نسبت R) فقط وقتی محاسبه می‌شود که ALT و ALP هر دو باشند.
      // بدون ALP، R === undefined بود و همیشه «mixed» می‌داد؛ حالا صریحاً
      // "unspecified" می‌گذاریم تا اشتباهاً cholestatic/hepatocellular نگوییم.
      const R = e.indices.r_ratio;
      const kind =
        R == null ? "unspecified"
        : R >= 5 ? "hepatocellular"
        : R <= 2 ? "cholestatic"
        : "mixed";
      const maxG = Math.max(levelGrade(alt), levelGrade(ast));

      // شدت آنزیم: خیلی بالا (چند برابر) → اشاره به آسیب حاد کبدی (مثل هپاتیت حاد)
      // کیس Verlita فصل: ALT/AST > ۱۰۰۰. آستانه محتاطانه: >۱۰ برابر سقف مرجع.
      const altVeryHigh = alt != null && alt.value > 360;   // ~۱۰× سقف ۳۶
      const astVeryHigh = ast != null && ast.value > 330;   // ~۱۰× سقف ۳۳
      const marked = altVeryHigh || astVeryHigh;

      return {
        pattern: `liver_${kind}`,
        urgency: maxG >= 4 || marked ? "emergency" : "this_week",
        blocks_others: maxG >= 4,
        headline: marked
          ? "شاخص‌های کبد شما بسیار بالا هستند"
          : "بعضی از شاخص‌های کبد بالاتر از حد طبیعی هستند",
        must_say:
          (marked
            ? "آنزیم‌های کبدی خیلی بالا هستند، که می‌تواند نشانه‌ی یک آسیب فعال و قابل‌توجه کبد باشد (مثلاً التهاب حاد کبد). این حتماً و سریع باید بررسی شود. "
            : "") +
          (kind === "cholestatic"
            ? "این الگو بیشتر به مسیر خروج صفرا مربوط است تا خود سلول‌های کبد."
            : kind === "unspecified"
              ? "این اعداد نشان می‌دهند سلول‌های کبد تحریک شده‌اند. برای تعیین دقیق‌تر نوع درگیری، آنزیم ALP هم لازم است."
              : "این اعداد نشان می‌دهند سلول‌های کبد تحریک شده‌اند. علت‌های زیادی دارد."),
        action: marked
          ? "هرچه زودتر (همین چند روز) به پزشک مراجعه کنید. اگر زردی چشم/پوست، گیجی یا استفراغ دارید، به اورژانس بروید."
          : "این هفته وقت بگیرید. لیست کامل داروها و مکمل‌هایتان را همراه ببرید.",
        suggest:
          kind === "cholestatic"
            ? ["GGT", "بیلی‌روبین مستقیم و غیرمستقیم", "سونوگرافی شکم"]
            : kind === "unspecified"
              ? ["ALP", "GGT", "هپاتیت B و C", "سونوگرافی شکم"]
              : ["AST", "GGT", "هپاتیت B و C", "سونوگرافی شکم"],
        warnings: ["تا وقتی پزشک نگفته، مکمل گیاهی یا دوز بالای استامینوفن مصرف نکنید."],
      };
    },
  },

  // ═══════════ افتراق یرقان بر اساس نوع بیلی‌روبین ═══════════
  // غیرمستقیم غالب → پیش‌کبدی (همولیز) یا گیلبرت (خوش‌خیم و شایع).
  // مستقیم غالب → مشکل دفع/انسداد. متن ساده و بدون ترساندن.
  {
    id: "bilirubin_pattern",
    match: (e) => {
      const bt = e.graded.find((g) => g.test === "BILI_T");
      // فقط وقتی بیلی‌روبین تام بالاست و اجزا موجودند
      const btHigh = bt?.abnormal && bt.dir === "high";
      const t = val(e);
      if (!btHigh || (t.BILI_D == null && t.BILI_I == null)) return false;
      // اگر تصویر همولیز کامل است (LDH بالا + هاپتوگلوبین پایین)، به الگوی
      // همولیز واگذار کن تا پیام تکراری درباره‌ی بیلی‌روبین غیرمستقیم ندهد.
      const ldh = e.graded.find((g) => g.test === "LDH");
      const hapto = e.graded.find((g) => g.test === "HAPTO");
      const ldhHigh = ldh?.abnormal && ldh.dir === "high";
      const haptoLow = hapto?.abnormal && hapto.dir === "low";
      if (ldhHigh && haptoLow) return false;
      return true;
    },
    build: (e) => {
      const t = val(e);
      const btG = e.graded.find((g) => g.test === "BILI_T");
      // اگر مستقیم نداریم ولی تام و غیرمستقیم داریم، مستقیم را حساب کن
      const direct = t.BILI_D != null ? t.BILI_D
                   : (t.BILI_T != null && t.BILI_I != null ? t.BILI_T - t.BILI_I : null);
      const total = t.BILI_T;
      const indirect = t.BILI_I != null ? t.BILI_I
                     : (total != null && direct != null ? total - direct : null);
      const rangeTxt = btG?.range ? ` (حد طبیعی ${btG.range})` : "";
      // سهم مستقیم از کل
      const directDominant = direct != null && total != null && (direct / total) > 0.5;
      // آیا آنزیم‌های کبدی هم درگیرند؟ (اگر بله، الگوی گیلبرت را نمی‌دهیم)
      const alt = e.graded.find((g) => g.test === "ALT");
      const ast = e.graded.find((g) => g.test === "AST");
      const alp = e.graded.find((g) => g.test === "ALP");
      const enzymesHigh = (alt?.abnormal && alt.dir === "high") ||
                          (ast?.abnormal && ast.dir === "high") ||
                          (alp?.abnormal && alp.dir === "high");
      // یرقانِ قابل‌مشاهده: صلبیهٔ چشم از حدود ۲–۲.۵ و پوست از ~۳ mg/dL زرد می‌شود.
      const visible = total != null && total >= 2.5;
      const visiblePhrase = visible
        ? " — در این حد معمولاً زردیِ سفیدیِ چشم و گاهی پوست هم دیده می‌شود"
        : "";
      const magHead = total != null
        ? `بیلی‌روبین تامِ خون شما ${total}${rangeTxt} است${visiblePhrase}. `
        : "";

      if (directDominant) {
        // بیلی‌روبین مستقیم غالب → مشکل دفع/انسداد
        return {
          pattern: "bilirubin_direct_dominant",
          urgency: "this_week",
          ...(total != null ? { key_number: total } : {}),
          headline: "بیلی‌روبین خون شما بالاست (بیشتر از نوع مستقیم)",
          must_say:
            magHead +
            "بیلی‌روبین از تجزیهٔ طبیعیِ گلبول‌های قرمز ساخته می‌شود و کبد آن را به شکل «مستقیم» (کونژوگه، محلول در آب) درمی‌آورد تا از راه صفرا دفع شود. " +
            "چون در شما بیشترِ بیلی‌روبین از نوع مستقیم است، یعنی کبد آن را پردازش کرده ولی در دفعِ آن به مجاری صفرا مانعی هست — بیشتر به انسداد یا اختلالِ جریان صفرا می‌خورد تا به خودِ سلول‌های کبد. " +
            "در این حالت اغلب ادرار تیره و مدفوع کم‌رنگ/خاکی‌رنگ می‌شود.",
          action: "این هفته با پزشک مطرح کنید. اگر زردی چشم/پوست، ادرار تیره یا مدفوع کم‌رنگ دارید، زودتر مراجعه کنید.",
          suggest: ["سونوگرافی شکم", "آنزیم‌های کبدی", "ALP و GGT", "بیلی‌روبین مستقیم و غیرمستقیم"],
          warnings: [
            // سه‌گانهٔ شارکو (کیس Felicia): تب + لرز + درد ربع‌فوقانیِ راست + زردی = کلانژیتِ صعودی، اورژانس.
            "اگر همراهِ این زردی، تب و لرز و درد سمت راستِ بالای شکم دارید، همین حالا به اورژانس بروید — می‌تواند نشانهٔ عفونتِ مجاری صفرا باشد.",
          ],
        };
      }

      // بیلی‌روبین غیرمستقیم غالب
      // اگر آنزیم‌ها طبیعی و بیلی‌روبین خیلی بالا نیست → احتمال گیلبرت (خوش‌خیم)
      const mildIndirect = total != null && total < 5 && !enzymesHigh;
      return {
        pattern: "bilirubin_indirect_dominant",
        urgency: mildIndirect ? "routine" : "this_week",
        ...(total != null ? { key_number: total } : {}),
        headline: "بیلی‌روبین خون شما بالاست (بیشتر از نوع غیرمستقیم)",
        must_say:
          magHead +
          "بیلی‌روبین از تجزیهٔ طبیعیِ گلبول‌های قرمز ساخته می‌شود؛ در شما بیشترِ آن از نوع «غیرمستقیم» (هنوز توسط کبد پردازش‌نشده) است. " +
          (mildIndirect
            ? "وقتی آنزیم‌های کبدی طبیعی‌اند و بالا رفتن هم خفیف است، شایع‌ترین و بی‌خطرترین علت «سندرم ژیلبر» است — یک ویژگی ارثیِ خیلی رایج (حدود ۱ نفر از هر ۲۰ نفر) که در آن آنزیمِ پردازش بیلی‌روبین کمی کندتر کار می‌کند. در ژیلبر بیلی‌روبین معمولاً زیر ۳ می‌ماند، هنگام گرسنگی/استرس/بیماری کمی بالاتر می‌رود، هیچ آسیبی به کبد نمی‌زند و درمانی لازم ندارد. برای اطمینان کافی است آزمایش در حالت عادیِ بدن تکرار شود و شمارش خون طبیعی باشد. البته تجزیهٔ بیش از حد گلبول‌ها (همولیز) هم می‌تواند همین الگو را بسازد که با چند آزمایش رد می‌شود."
            : "بالا بودنِ قابل‌توجهِ نوعِ غیرمستقیم بیشتر به تجزیهٔ بیش از حد گلبول‌های قرمز (همولیز) اشاره دارد و بهتر است بررسی شود."),
        action: mildIndirect
          ? "نوبت عادی. برای اطمینان با پزشک مطرح کنید."
          : "این هفته با پزشک مطرح کنید.",
        suggest: mildIndirect
          ? ["تکرار بیلی‌روبین در حالت عادی بدن", "شمارش خون (CBC) و رتیکولوسیت"]
          : ["شمارش خون (CBC)", "رتیکولوسیت", "هاپتوگلوبین", "LDH"],
        warnings: [],
      };
    },
  },

  // ═══════════ ALP بالای ایزوله (منبع: استخوان/بارداری/صفراوی) ═══════════
  // فقط وقتی ALP بالاست و ALT/AST طبیعی — liver_pattern این حالت را واگذار کرده.
  // GGT منبع را روشن می‌کند: بالا → کبدی/صفراوی، طبیعی → استخوان/بارداری.
  // متن ساده نگه داشته می‌شود؛ بدون واژه‌ی تخصصی.
  {
    id: "alp_isolated",
    match: (e) => {
      const alp = e.graded.find((g) => g.test === "ALP");
      const alt = e.graded.find((g) => g.test === "ALT");
      const ast = e.graded.find((g) => g.test === "AST");
      const alpHigh = alp?.abnormal && alp.dir === "high";
      const altHigh = alt?.abnormal && alt.dir === "high";
      const astHigh = ast?.abnormal && ast.dir === "high";
      return alpHigh && !altHigh && !astHigh;
    },
    build: (e) => {
      const ggt = e.graded.find((g) => g.test === "GGT");
      const ggtHigh = ggt?.abnormal && ggt.dir === "high";
      const ggtKnown = ggt != null;

      if (ggtHigh) {
        // GGT هم بالا → به سمت کبد/مجاری صفراوی
        return {
          pattern: "alp_high_liver_source",
          urgency: "this_week",
          headline: "آنزیم ALP شما بالاست",
          must_say:
            "آنزیم ALP بالاتر از حد طبیعی است. چون آنزیم دیگری به نام GGT هم بالاست، " +
            "این حالت بیشتر به کبد یا مجاری صفراوی مربوط می‌شود تا استخوان. برای بررسی بهتر است با پزشک مطرح شود.",
          action: "این هفته با پزشک مطرح کنید.",
          suggest: ["سونوگرافی شکم", "بیلی‌روبین"],
          warnings: [],
        };
      }

      // GGT طبیعی یا نامشخص → استخوان/بارداری محتمل‌تر، ولی مطمئن نیستیم
      return {
        pattern: "alp_high_nonliver",
        urgency: "routine",
        headline: "آنزیم ALP شما بالاست",
        must_say:
          "آنزیم ALP بالاتر از حد طبیعی است. این آنزیم فقط از کبد نمی‌آید — " +
          "در استخوان هم ساخته می‌شود و بالا بودن آن همیشه به معنی مشکل کبد نیست. " +
          // موتور ورودیِ بارداری ندارد و محدودهٔ مرجع را برای باردار عوض نمی‌کند،
          // پس ALPِ یک بارداریِ کاملاً طبیعی اینجا «بالا» علامت می‌خورد. تنها
          // جبرانِ ممکن همین جمله است؛ بزرگیِ عدد گفته می‌شود تا کسی که مقدارش
          // دو-سه برابر است بفهمد این با بارداری می‌خواند، نه اینکه فقط بداند
          // «ممکن است ربطی داشته باشد».
          "اگر باردار هستید، بالا بودن ALP در بارداری معمولاً طبیعی است — جفت خودش این آنزیم را می‌سازد " +
          "و مقدار آن در نیمهٔ دوم بارداری به‌طور طبیعی تا دو تا سه برابر بالا می‌رود. " +
          (ggtKnown
            ? "چون آنزیم GGT شما طبیعی است، احتمال منشأ کبدی کمتر است."
            : "یک آزمایش ساده به نام GGT می‌تواند مشخص کند منبع آن کبد است یا نه."),
        action: "نوبت عادی. اگر باردار هستید یا علامت خاصی دارید، با پزشک مطرح کنید.",
        suggest: ggtKnown ? [] : ["GGT — برای مشخص شدن منبع ALP"],
        warnings: [],
      };
    },
  },

  // ═══════════ افتراق پانکراتیت (آمیلاز/لیپاز) ═══════════
  // هر دو بالا → پانکراس. فقط آمیلاز بالا → می‌تواند منشأ دیگری داشته باشد.
  {
    id: "pancreas_pattern",
    match: (e) => {
      const amy = e.graded.find((g) => g.test === "AMYLASE");
      const lps = e.graded.find((g) => g.test === "LIPASE");
      const amyHigh = amy?.abnormal && amy.dir === "high";
      const lpsHigh = lps?.abnormal && lps.dir === "high";
      return amyHigh || lpsHigh;
    },
    build: (e) => {
      const amy = e.graded.find((g) => g.test === "AMYLASE");
      const lps = e.graded.find((g) => g.test === "LIPASE");
      const amyHigh = amy?.abnormal && amy.dir === "high";
      const lpsHigh = lps?.abnormal && lps.dir === "high";

      if (amyHigh && lpsHigh) {
        // هر دو بالا → قوی‌ترین اشاره به پانکراس
        return {
          pattern: "pancreas_both_high",
          urgency: "this_week",
          headline: "دو آنزیم مربوط به لوزالمعده (پانکراس) بالا هستند",
          must_say:
            "آنزیم‌های آمیلاز و لیپاز هر دو بالاتر از حد طبیعی‌اند. این ترکیب بیشتر به " +
            "التهاب لوزالمعده اشاره دارد و باید توسط پزشک بررسی شود.",
          action: "این هفته با پزشک مطرح کنید. اگر درد شدید شکم (به‌خصوص همراه تهوع و استفراغ) دارید، زودتر مراجعه کنید.",
          suggest: ["سونوگرافی شکم", "بررسی توسط پزشک"],
          warnings: [],
        };
      }

      if (lpsHigh && !amyHigh) {
        // لیپاز بالا (اختصاصی‌تر برای پانکراس)
        return {
          pattern: "lipase_high",
          urgency: "this_week",
          headline: "آنزیم لیپاز شما بالاست",
          must_say:
            "لیپاز آنزیمی است که بیشتر به لوزالمعده مربوط می‌شود. بالا بودن آن باید بررسی شود.",
          action: "این هفته با پزشک مطرح کنید.",
          suggest: ["آمیلاز", "سونوگرافی شکم"],
          warnings: [],
        };
      }

      // فقط آمیلاز بالا → می‌تواند منشأ غیرپانکراسی داشته باشد
      return {
        pattern: "amylase_isolated",
        urgency: "routine",
        headline: "آنزیم آمیلاز شما بالاست",
        must_say:
          "آمیلاز بالاتر از حد طبیعی است. این آنزیم فقط از لوزالمعده نمی‌آید — " +
          "غدد بزاقی هم آن را می‌سازند (مثلاً در اوریون). چون آنزیم لیپاز " +
          (lps != null ? "شما طبیعی است، احتمال منشأ لوزالمعده کمتر است." : "می‌تواند به روشن شدن منبع کمک کند."),
        action: "نوبت عادی، مگر علامت خاصی داشته باشید. با پزشک مطرح کنید.",
        suggest: lps != null ? [] : ["لیپاز — برای مشخص شدن منبع"],
        warnings: [],
      };
    },
  },

  // ═══════════ CK-MB بالا (مارکر قلبی — نسخه ساده و محتاط) ═══════════
  // فقط بالای مرجعِ همان برگه را چک می‌کند (بدون محاسبه شاخص نسبی،
  //   چون واحدها متفاوت‌اند و خطر خطا زیاد). پیام محتاط، نه اورژانسِ ترسناک.
  // اگر تروپونین هم بالا باشد، troponin_positive اورژانس می‌دهد و این زیرش می‌رود.
  {
    id: "ckmb_high",
    match: (e) => {
      const mb = e.graded.find((g) => g.test === "CK_MB");
      return mb?.abnormal && mb.dir === "high";
    },
    build: (e) => {
      // اگر CK کل هم خیلی بالاست، احتمال منشأ عضله بیشتر است (نه فقط قلب)
      const ck = e.graded.find((g) => g.test === "CK");
      const ckHigh = ck?.abnormal && ck.dir === "high";
      return {
        pattern: "ckmb_high",
        urgency: "this_week",
        headline: "یکی از آنزیم‌های مرتبط با قلب کمی بالاست",
        must_say:
          "آنزیمی به نام CK-MB بالاتر از حد طبیعی است. این آنزیم بیشتر به عضله‌ی قلب مربوط است، " +
          "ولی بالا بودن آن همیشه به معنی مشکل قلبی نیست و می‌تواند از عضلات بدن هم بیاید" +
          (ckHigh ? " (به‌خصوص چون آنزیم CK کل شما هم بالاست، که بیشتر به عضله اشاره دارد)" : "") +
          ". برای تفسیر درست باید با پزشک بررسی شود.",
        action:
          "این هفته با پزشک مطرح کنید. اگر همین حالا درد قفسه‌ی سینه، تنگی نفس یا تعریق سرد دارید، فوراً به اورژانس بروید.",
        suggest: ["تروپونین — دقیق‌ترین آزمایش برای عضله‌ی قلب", "بررسی توسط پزشک"],
        warnings: [],
      };
    },
  },

  // ═══════════ سیروز / نارسایی مزمن کبد ═══════════
  // الگوی کلاسیک: آلبومین پایین + بیلی‌روبین بالا + پلاکت پایین
  //   (هایپراسپلنیسم) + INR بالا (اختلال ساخت فاکتورهای انعقادی).
  {
    id: "cirrhosis_pattern",
    match: (e) => {
      const t = val(e);
      const alb = e.graded.find((g) => g.test === "ALB");
      const albLow = alb?.abnormal && alb.dir === "low";
      const plt = e.graded.find((g) => g.test === "PLT");
      const pltLow = plt?.abnormal && plt.dir === "low";
      const biliHigh = (() => {
        const g = e.graded.find((x) => x.test === "BILI_T");
        return g?.abnormal && g.dir === "high";
      })();
      const inrHigh = t.INR != null && t.INR > 1.3;
      // نیاز به حداقل ۳ نشانه از ۴ برای احتیاط (این تشخیص سنگینی است)
      const markers = [albLow, pltLow, biliHigh, inrHigh].filter(Boolean).length;
      return markers >= 3;
    },
    build: () => ({
      pattern: "chronic_liver_disease_pattern",
      urgency: "this_week",
      headline: "چند شاخص با هم به مشکل مزمن کبد اشاره دارند",
      must_say:
        "ترکیبی از نتایج (پروتئین سازنده کبد پایین، پلاکت پایین، و شاخص‌های دیگر) " +
        "می‌تواند نشانه‌ای از کاهش عملکرد کبد در طول زمان باشد. این یک تشخیص قطعی نیست، " +
        "ولی الگویی است که حتماً باید توسط پزشک بررسی شود.",
      action: "این هفته با پزشک وقت بگیرید. لیست کامل داروها، مکمل‌ها و سابقه مصرف الکل را همراه ببرید.",
      suggest: ["سونوگرافی کبد", "آنزیم‌های کبدی", "هپاتیت B و C", "فیبرواسکن"],
      warnings: [
        "تا وقتی پزشک بررسی نکرده، از داروهای بدون نسخه (به‌خصوص استامینوفن) و مکمل گیاهی پرهیز کنید.",
      ],
    }),
  },

  // ═══════════ الگوی کبد الکلی ═══════════
  // نسبت De Ritis: AST/ALT ≥ 2 + GGT بالا + گاهی MCV بالا → منشأ الکلی.
  {
    id: "alcoholic_liver_pattern",
    match: (e) => {
      const t = val(e);
      if (t.AST == null || t.ALT == null || t.ALT === 0) return false;
      const ast = e.graded.find((g) => g.test === "AST");
      const alt = e.graded.find((g) => g.test === "ALT");
      // حداقل یکی از آنزیم‌ها باید بالا باشد
      const anyHigh = (ast?.abnormal && ast.dir === "high") ||
                      (alt?.abnormal && alt.dir === "high");
      const deRitis = t.AST / t.ALT >= 2;
      const ggtHigh = (() => {
        const g = e.graded.find((x) => x.test === "GGT");
        return g?.abnormal && g.dir === "high";
      })();
      // نسبت ≥۲ به‌تنهایی گمراه‌کننده است؛ GGT بالا هم لازم است
      return anyHigh && deRitis && ggtHigh;
    },
    build: (e) => {
      const t = val(e);
      const mcvHigh = t.MCV != null && t.MCV > 100;
      const ratio = t.ALT ? +(t.AST / t.ALT).toFixed(1) : null;
      return {
        pattern: "alcoholic_liver_pattern",
        urgency: "this_week",
        ...(ratio != null ? { key_number: ratio } : {}),
        headline: "الگوی آنزیم‌های کبدی شما نوع خاصی دارد که باید بررسی شود",
        must_say:
          `دو آنزیم کبدی شما AST برابر ${t.AST} و ALT برابر ${t.ALT} است؛ ` +
          `نسبت AST به ALT حدود ${ratio} می‌شود و همراه با بالا بودن GGT الگویی می‌سازد که ` +
          "وقتی این نسبت بالای ۲ باشد، بیشتر به آسیب کبدیِ ناشی از الکل می‌خورد (هرچند بعضی علل دیگر هم ممکن است). " +
          "نکته: در آسیب کبدیِ الکلی این آنزیم‌ها معمولاً زیر ۳۰۰ می‌مانند؛ اگر خیلی بالاتر (چند هزار) بودند، علت‌های دیگری مثل هپاتیت حاد ویروسی یا مسمومیت مطرح‌تر است." +
          (mcvHigh ? " بزرگ بودن گلبول‌های قرمز (MCV بالا) هم گاهی همراه این الگو دیده می‌شود." : ""),
        action: "این هفته با پزشک وقت بگیرید و درباره مصرف الکل صادقانه صحبت کنید — این به تشخیص درست کمک می‌کند.",
        suggest: ["GGT", "سونوگرافی کبد", "آنزیم‌های کبدی تکراری"],
        warnings: [
          "اگر الکل مصرف می‌کنید، قطع ناگهانی در برخی افراد خطرناک است — با پزشک درباره روش ایمن مشورت کنید.",
        ],
      };
    },
  }];
