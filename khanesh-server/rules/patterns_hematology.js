import { serologyReactive, qualPositive, qualValue, titreFa, hasInflammation, whoFerritinThreshold, whoInflamIronDeficiency, urinePositive, urineCellCount, urineGrade, isNephrotic, isGlomerulonephritis, isDIC, val, rankOf } from "./patterns_utils.js";
import { faName } from "./names.js";
import { preanalyticalCaveats, attachPreanalytical } from "./preanalytical.js";
import { repeatDeltaFa } from "./biovar.js";

// ─── specs/004: فولات و B12 — سه‌حالته، مشترکِ macrocytic_anemia و folate_deficiency ───
// شرطِ کم‌خونیِ ماکروسیتیک یک جا نوشته می‌شود؛ folate_deficiency با همین تابع کنار می‌رود (N20).
export const macrocyticMatch = (e) => {
  const hgb = e.graded.find((g) => g.test === "HGB");
  return !!(hgb?.abnormal && hgb.dir === "low" && val(e).MCV > 100);
};
// فوریت و جملهٔ اقدام از یک تصمیم (N20) — همان کمکیِ patterns_cardiac.js، عمداً کپی.
function actionFor(urgency, { week, routine }) {
  return urgency === "this_week" ? week : routine;
}
// عددِ تازه‌ای نیست: همان مرزهای overt_b12_deficiency (< ۱۵۰) و borderline_b12_deficiency (۱۵۰ تا ۳۹۹)، P21.
// حالتِ جمله: یافتهٔ خودِ فولات، یا بندی درونِ ماکروسیتیک (عدد، نه رشته — M38 رشته‌ها را متنِ بیمار می‌شمارد).
const CLAUSE_FOR = { own: 0, macro: 1 };
const B12_OVERT_BELOW = 150;
const B12_BORDERLINE_MAX = 399;
const FOLIC_CAUTION = "پیش از مصرفِ اسید فولیک باید B12 هم سنجیده شود، چون اسید فولیک می‌تواند کم‌خونیِ ناشی از کمبودِ B12 را بپوشاند در حالی که آسیبِ عصبیِ آن ادامه پیدا می‌کند.";
const FOLIC_WARNING = "تا پزشک وضعیتِ ویتامین B12 را بررسی نکرده، خودسرانه اسید فولیک شروع نکنید.";
// عددِ چاپ‌شده، نه فقط عددِ تبدیل‌شده (N5).
function printedOf(e, key, value) {
  const c = (e.unitConversions || []).find((x) => x.test === key);
  if (!c) return `${value}`;
  // واحدی که برگه چاپ نکرده (از محدودهٔ مرجع یا اندازه تعیین شد) کنارِ عددِ بیمار «چاپ‌شده» نوشته نمی‌شود —
  // کارتِ «واحدها» در فرانت پایه‌اش را توضیح می‌دهد (بازبینیِ کدِ 004، مورد ۴).
  if (c.basis && c.basis !== "printed") return `${c.raw}`;
  // units.js واحد را کوچک‌شده نگه می‌دارد («nmol/l»)؛ لیتر را به شکلِ چاپیِ رایج برگردان.
  return `${c.raw} ${String(c.from).replace(/\/l$/, "/L")}`;
}
// B12 از نگاهِ فولات: کمبودش رد نشده (اندازه‌نشده، واحدِ نامعلوم یا مرزی)؟ زیرِ ۱۵۰ را overt_b12_deficiency
// با هشدارِ فولیکِ خودش می‌گوید.
function b12Unsettled(e) {
  const b = val(e).B12;
  return b == null || (b >= B12_OVERT_BELOW && b <= B12_BORDERLINE_MAX);
}
// فولات: پایین / پایین‌نیست / واحدِ نامعلوم / اندازه‌نشده (N4). `mode`: CLAUSE_FOR.own = یافتهٔ فولات، CLAUSE_FOR.macro = ماکروسیتیک.
function folateClause(e, mode) {
  const f = e.graded.find((g) => g.test === "FOLATE");
  if (!f) {
    return e.ungraded?.FOLATE
      ? "فولات روی برگه هست ولی واحدش خوانده نشد، پس درباره‌اش قضاوت نمی‌کنیم."
      : "فولات روی این برگه اندازه‌گیری نشده است.";
  }
  const low = f.abnormal && f.dir === "low";
  const shown = printedOf(e, "FOLATE", f.value);
  if (mode === CLAUSE_FOR.own) {
    const lo = String(f.range ?? "").split(/[–-]/)[0];
    const conv = shown === `${f.value}` ? `${f.value} ng/mL` : `${shown} (برابرِ ${f.value} ng/mL)`;
    return `فولاتِ سرمِ شما ${conv} است و از حدِ پایینِ طبیعی (${lo} ng/mL) کمتر است.`;
  }
  // سه‌حالته، نه دوحالته: «پایین نیست» با «طبیعی است» یکی نیست (N12؛ کودک: محدودهٔ ۳–۱۵).
  if (low) return `فولاتِ شما روی همین برگه ${shown} و پایین است، که با این نوع کم‌خونی می‌خواند.`;
  if (f.abnormal && f.dir === "high") {
    return `فولاتِ شما روی همین برگه بالاتر از محدودهٔ طبیعی است (${shown}، طبیعی ${f.range})، پس کمبودِ فولات علتِ محتمل‌تری نیست.`;
  }
  return `فولاتِ شما روی همین برگه طبیعی است (${shown})، پس کمبودِ فولات علتِ محتمل‌تری نیست.`;
}
// B12: پایین / مرزی / پایین‌نیست / واحدِ نامعلوم / اندازه‌نشده.
function b12Clause(e, mode) {
  const b = val(e).B12;
  if (b == null) {
    return e.ungraded?.B12
      ? "ویتامین B12 روی برگه هست ولی واحدش خوانده نشد، پس درباره‌اش قضاوت نمی‌کنیم."
      : "ویتامین B12 روی این برگه اندازه‌گیری نشده است.";
  }
  const shown = printedOf(e, "B12", b);
  // B12ِ بالاتر از محدوده: این قاعده B12 را «می‌خواند»، پس تورِ unexplained_abnormal دیگر نامش را نمی‌برد —
  // پس جمله خودش باید بگوید بالاست، نه فقط «پایین نیست» (بازبینی B2، N18).
  const g = e.graded.find((x) => x.test === "B12");
  if (g?.abnormal && g.dir === "high") {
    const high = `ویتامین B12 شما (${shown}) بالاتر از محدودهٔ طبیعی است (${g.range})`;
    return mode === CLAUSE_FOR.own
      ? `${high}؛ کمبودِ B12 نیست، ولی بالا بودنش را این یافته توضیح نمی‌دهد و باید با پزشک بررسی شود.`
      : `${high}، پس کمبودِ B12 علتِ محتمل‌تری نیست؛ بالا بودنش را این یافته توضیح نمی‌دهد و باید با پزشک بررسی شود.`;
  }
  if (b < B12_OVERT_BELOW) {
    return mode === CLAUSE_FOR.own
      ? `ویتامین B12 شما هم روی همین برگه پایین است (${shown})؛ کمبودِ هم‌زمانِ این دو ویتامین را پزشک با هم بررسی می‌کند.`
      : `ویتامین B12 شما روی همین برگه پایین است (${shown})، که با این نوع کم‌خونی می‌خواند.`;
  }
  if (b <= B12_BORDERLINE_MAX) {
    return mode === CLAUSE_FOR.own
      ? `ویتامین B12 شما (${shown}) نزدیکِ مرزِ پایین است؛ پیش از مصرفِ اسید فولیک، پزشک باید کمبودِ B12 را هم رد کند.`
      : `ویتامین B12 شما (${shown}) نزدیکِ مرزِ پایین است و کمبود را کاملاً رد نمی‌کند.`;
  }
  return mode === CLAUSE_FOR.own
    ? `ویتامین B12 شما روی همین برگه پایین نیست (${shown}).`
    : `ویتامین B12 شما روی همین برگه پایین نیست (${shown})، پس کمبودِ B12 علتِ محتمل‌تری نیست.`;
}

export const RULES_HEMATOLOGY = [
  {
    id: "dic_pattern",
    match: (e) => isDIC(e),
    build: (e) => {
      const t = val(e);
      const d = e.graded.find((g) => g.test === "DDIMER");
      // فقط شاخص‌هایی را نام ببر که واقعاً غیرطبیعی‌اند (چون تریگرِ ISTH ممکن است
      // بدون پایین بودنِ فیبرینوژن هم فعال شود).
      const parts = [];
      if (t.PLT != null && t.PLT < 100) parts.push("پلاکت پایین");
      if (t.PT != null && t.PT > 15) parts.push("طولانی شدن زمان انعقاد (PT)");
      if (t.FIB != null && t.FIB < 150) parts.push("فیبرینوژن پایین");
      if (d?.abnormal && d.dir === "high") parts.push("D-dimer بالا");
      return {
        pattern: "possible_DIC",
        urgency: "emergency",
        headline: "چند شاخص لخته شدن خون همزمان غیرطبیعی است",
        must_say:
          `${parts.join("، ")} با هم می‌توانند نشانهٔ یک اختلال جدی انعقاد باشند که همزمان لخته و خونریزی ایجاد می‌کند. این ترکیب نیاز به بررسی فوری دارد.`,
        action: "همین امروز به اورژانس مراجعه کنید.",
        suggest: [],
        blocks_others: true,
      };
    },
  },
  // دی‌دایمرِ بالای تنها — وقتی تصویر DIC نباشد. باینری است و هیچ الگویی
  // برنمی‌داشتش، پس «خوانده می‌شد ولی تفسیر نداشت». D-dimer غیراختصاصی است:
  // فوریت this_week با لحن اطمینان‌بخش + هشدارِ علائم لخته.
  {
    id: "d_dimer_elevated",
    match: (e) => {
      const d = e.graded.find((g) => g.test === "DDIMER");
      if (!(d?.abnormal && d.dir === "high")) return false;
      return !isDIC(e);   // اگر DIC فعال است، آن الگوی اورژانسی پوشش می‌دهد
    },
    build: (e) => {
      const d = e.graded.find((g) => g.test === "DDIMER");

      // ── کات‌آفِ سن‌تعدیل‌شده (هنری فصل ۱۹) ──
      //
      // ⚠️ این جمله عمداً *داخلِ* همین یافته نشست و قاعدهٔ جدا نشد. نسخهٔ اولش
      //    یک قاعدهٔ مستقلِ routine بود و روی D-dimer=۷۰۰ در سن ۷۸ اندازه‌گیری
      //    شد: هر دو با هم فعال می‌شدند و بیمار یک «این هفته به پزشک» و یک
      //    «برای سن شما زیر حد است، عادی» را کنارِ هم می‌خواند. تناقضِ دو یافته،
      //    همان چیزی است که N20 دربارهٔ دو *فیلدِ* یک یافته می‌گوید — و راهِ
      //    حلش هم همان است: یک تصمیم، یک جا.
      // ⚠️ و فوریت عمداً دست‌نخورده ماند. کات‌آفِ سن‌تعدیل‌شده در متنِ منبع
      //    مخصوصِ *رد کردنِ آمبولیِ ریه در بیمارِ کم‌احتمال* است، نه یک بازهٔ
      //    مرجعِ عمومی؛ D-dimerِ بالا معناهای دیگری هم دارد. پس این عدد به متن
      //    اضافه می‌شود تا بیمار سیاقش را بداند، و فوریت را پایین نمی‌آورد.
      const age = e.age;
      let ageLine = "";
      let ageSourced = false;
      if (age != null && age >= 50) {
        const adj = 10 * age;   // «۵۰۰ در زیر ۵۰ سال و ده برابرِ سن در مسن‌ترها»
        ageSourced = true;
        ageLine = d.value <= adj
          ? `نکتهٔ مهم دربارهٔ سن: سطحِ زمینه‌ایِ D-dimer با بالا رفتنِ سن به‌طور طبیعی زیاد می‌شود، و روشِ پیشنهادشده این است که در افرادِ بالای ۵۰ سال حد را «ده برابرِ سن» بگیرند — برای شما ${adj}. عددِ شما زیرِ این حدِ تعدیل‌شده است، یعنی برای سنِ شما افزایشِ چشمگیری نیست. `
          : `این را هم بدانید: حتی با حدِ تعدیل‌شده بر اساسِ سن (ده برابرِ سن، یعنی ${adj} برای شما) عددِ شما بالاتر است. `;
      }

      return {
        pattern: "d_dimer_elevated",
        urgency: "this_week",
        // حتی وقتی یک یافتهٔ اورژانسیِ دیگر (blocks_others) فعال است، دی‌دایمر
        // نباید کاملاً پنهان شود — زیر اورژانس نسخهٔ کوتاه (brief) نمایش داده می‌شود.
        always_show: true,
        headline: "شاخص D-dimer خون شما بالاتر از حد طبیعی است",
        must_say:
          `مقدار D-dimer شما ${d.value} است (حد طبیعی ${d.range}). ` +
          "D-dimer وقتی بالا می‌رود که در بدن لخته‌ای ساخته و سپس تجزیه شده باشد. " +
          "اما این شاخص «غیراختصاصی» است و به دلایل بی‌خطر بسیاری هم بالا می‌رود — مانند بارداری، سن بالا، التهاب یا عفونت، و جراحی یا آسیب اخیر. " +
          "بنابراین D-dimer بالا به‌تنهایی به معنای وجود لختهٔ خطرناک نیست و باید در کنار علائم شما و نظر پزشک تفسیر شود. ارزش اصلی این تست وقتی است که نتیجه‌اش طبیعی باشد و لخته را کنار بگذارد. " +
          ageLine,
        // نسخهٔ کوتاه برای وقتی زیر یک اورژانسِ مهم‌تر نمایش داده می‌شود.
        brief:
          `شاخص D-dimer شما هم بالاتر از حد طبیعی است (${d.value}، حد طبیعی ${d.range}). ` +
          "این یک شاخص غیراختصاصی است و باید در کنار موارد فوریِ بالا توسط پزشک بررسی شود.",
        action: "این هفته با پزشک مطرح کنید تا در کنار شرح‌حال شما بررسی شود.",
        suggest: ["بررسی توسط پزشک برای تفسیر در کنار علائم بالینی"],
        warnings: [
          "اگر همین حالا نشانه‌های احتمالِ لخته دارید — تورم، درد یا قرمزیِ یک‌طرفهٔ ساق پا، یا تنگی نفس ناگهانی، درد قفسهٔ سینه و سرفهٔ خونی — منتظر نمانید و فوراً به اورژانس مراجعه کنید.",
          // ⚠️ این جمله مکملِ ضروریِ ageLine است و بدونِ آن، جملهٔ «زیرِ حدِ
          //    تعدیل‌شدهٔ سنِ شماست» شبیهِ «لخته ندارید» خوانده می‌شود. متنِ
          //    منبع صریح است: اگر احتمالِ پیش‌آزمون متوسط یا بالا باشد،
          //    تصویربرداری به‌هرحال باید انجام شود و D-dimer اصلاً مفید نیست.
          "این آزمایش فقط وقتی چیزی را «رد» می‌کند که پزشک از قبل احتمالِ لخته را کم برآورد کرده باشد؛ اگر آن احتمال متوسط یا بالا باشد، تصمیم با تصویربرداری گرفته می‌شود نه با این عدد.",
        ],
        // منبع فقط وقتی ضمیمه می‌شود که واقعاً عددی از آن در متن آمده باشد —
        // یعنی شاخهٔ سنی. برای بیمارِ زیرِ ۵۰ سال هیچ عددی از این فصل استفاده
        // نشده و برچسب‌زدنش یعنی ادعای منبعی که خوانده نشده.
        ...(ageSourced ? { sources: ["HENRY_CARDIAC"] } : {}),
      };
    },
  },

  // ═══════════ لکوسیتوز شدید — پرچم قرمز ═══════════
  // 🔴 این قاعده نبود و WBC=258 «طبیعی» گزارش شد.
  {
    id: "extreme_leukocytosis",
    match: (e) => {
      const w = e.graded.find((g) => g.test === "WBC");
      return w?.abnormal && w.dir === "high" && w.value >= 50;
    },
    build: (e) => {
      const w = e.graded.find((g) => g.test === "WBC");
      return {
        pattern: "extreme_leukocytosis",
        urgency: "emergency",
        headline: "تعداد گلبول‌های سفید خون شما بسیار بالاست",
        must_say:
          `گلبول سفید ${w.value} است — چندین برابر حد بالای طبیعی (${w.range}). ` +
          "این عدد نیاز به بررسی فوری توسط پزشک دارد." +
          (e.diffFailed
            ? " دستگاه نتوانست انواع گلبول سفید را بشمارد — این خودش نشانه‌ی همان مشکل است و لام دستی لازم دارد."
            : ""),
        action: "همین امروز به پزشک یا اورژانس مراجعه کنید. این برگه را همراه ببرید.",
        suggest: [],
        warnings: [],
        blocks_others: true,
      };
    },
  },
  {
    id: "leukocytosis",
    match: (e) => {
      const w = e.graded.find((g) => g.test === "WBC");
      return w?.abnormal && w.dir === "high" && w.value < 50;
    },
    build: (e) => {
      const w = e.graded.find((g) => g.test === "WBC");
      const marked = w.value >= 20;
      return {
        pattern: "leukocytosis",
        urgency: marked ? "this_week" : "routine",
        headline: "تعداد گلبول‌های سفید خون شما بالاتر از حد طبیعی است",
        must_say:
          `گلبول سفید شما ${w.value} است (حد طبیعی ${w.range}). ` +
          "گلبول سفید بالا اغلب پاسخ بدن به عفونت یا التهاب است؛ استرس، ورزش شدید یا برخی داروها (مثل کورتون) هم موقتاً آن را بالا می‌برند. " +
          (marked
            ? "این افزایش قابل‌توجه است و بهتر است زودتر بررسی شود."
            : "یک آزمایش به‌تنهایی علت را مشخص نمی‌کند؛ روند آن در تکرار مهم‌تر است."),
        action: marked ? "این هفته با پزشک وقت بگیرید." : "نوبت عادی با پزشک.",
        suggest: ["CRP", "تکرار CBC"],
        warnings: [],
      };
    },
  },
  {
    id: "leukopenia",
    match: (e) => {
      const w = e.graded.find((g) => g.test === "WBC");
      return w?.abnormal && w.dir === "low";
    },
    build: (e) => {
      const w = e.graded.find((g) => g.test === "WBC");
      const severe = w.value < 2;
      return {
        pattern: "leukopenia",
        urgency: severe ? "emergency" : "this_week",
        headline: "تعداد گلبول‌های سفید خون شما کم است",
        must_say: severe
          ? `گلبول سفید شما ${w.value} است — خیلی کم (حد طبیعی ${w.range}). توان بدن برای مقابله با عفونت کاهش یافته و همین باعث اهمیت فوری آن است.`
          : `گلبول سفید شما ${w.value} است (حد طبیعی ${w.range}). ` +
            "گلبول سفید دفاع بدن در برابر عفونت است؛ کم بودن خفیف آن می‌تواند موقت باشد (مثلاً پس از یک عفونت ویروسی یا با برخی داروها) یا نیاز به بررسی مغز استخوان داشته باشد. تکرار آزمایش معمولاً اولین قدم است.",
        action: severe
          ? "همین امروز با پزشک تماس بگیرید. اگر تب دارید، فوراً به اورژانس بروید."
          : "این هفته با پزشک وقت بگیرید.",
        suggest: ["تکرار CBC", "شمارش افتراقی"],
        warnings: severe ? ["اگر تب کردید، منتظر نمانید — همان ساعت به اورژانس بروید."] : [],
        blocks_others: severe,
      };
    },
  },
  {
    id: "severe_neutropenia",
    match: (e) => {
      const n = e.graded.find((g) => g.test === "NEUT_ABS");
      return n?.abnormal && n.dir === "low" && n.value < 500;
    },
    build: () => ({
      pattern: "severe_neutropenia",
      urgency: "emergency",
      headline: "یکی از انواع گلبول سفید بسیار کم است",
      must_say:
        "نوتروفیل — سلولی که با عفونت باکتریایی مقابله می‌کند — بسیار کم است. " +
        "این وضعیت نیاز به رسیدگی فوری دارد.",
      action: "همین امروز به پزشک مراجعه کنید. اگر تب دارید، به اورژانس بروید.",
      suggest: [],
      warnings: ["از تماس با افراد بیمار و مکان‌های شلوغ پرهیز کنید تا پزشک را ببینید."],
      blocks_others: true,
    }),
  },
  {
    id: "severe_thrombocytopenia",
    match: (e) => {
      const p = e.graded.find((g) => g.test === "PLT");
      return p?.abnormal && p.dir === "low" && p.value < 50;
    },
    build: (e) => {
      const p = e.graded.find((g) => g.test === "PLT");
      return {
        pattern: "severe_thrombocytopenia",
        urgency: "emergency",
        headline: "پلاکت خون شما بسیار کم است",
        must_say:
          `پلاکت ${p.value} است. پلاکت سلولی است که جلوی خونریزی را می‌گیرد.`,
        action: "همین امروز به پزشک یا اورژانس مراجعه کنید.",
        suggest: [],
        warnings: [
          "آسپرین یا مسکن‌های ضدالتهاب مصرف نکنید.",
          "اگر خونریزی، کبودی بی‌دلیل یا نقطه‌های قرمز روی پوست دیدید، فوراً به اورژانس بروید.",
        ],
        blocks_others: true,
      };
    },
  },
  {
    id: "thrombocytopenia",
    match: (e) => {
      const p = e.graded.find((g) => g.test === "PLT");
      return p?.abnormal && p.dir === "low" && p.value >= 50;
    },
    build: (e) => {
      const p = e.graded.find((g) => g.test === "PLT");
      return {
        pattern: "thrombocytopenia",
        urgency: "this_week",
        headline: "پلاکت خون شما کمتر از حد طبیعی است",
        must_say:
          `پلاکت شما ${p.value} است (حد طبیعی ${p.range}). ` +
          "پلاکت‌ها جلوی خونریزی را می‌گیرند. کاهش خفیف اغلب علت موقتی دارد (عفونت ویروسی، برخی داروها) و باید فقط پیگیری شود؛ خطر خونریزی معمولاً وقتی جدی می‌شود که پلاکت خیلی پایین‌تر بیاید.",
        action: "این هفته با پزشک وقت بگیرید.",
        suggest: ["تکرار CBC"],
        warnings: ["اگر خونریزی یا کبودی بی‌دلیل دیدید، زودتر مراجعه کنید."],
      };
    },
  },
  {
    id: "thrombocytosis",
    match: (e) => {
      const p = e.graded.find((g) => g.test === "PLT");
      return p?.abnormal && p.dir === "high";
    },
    build: (e) => {
      const p = e.graded.find((g) => g.test === "PLT");
      return {
        pattern: "thrombocytosis",
        urgency: "routine",
        headline: "پلاکت خون شما بالاتر از حد طبیعی است",
        must_say:
          `پلاکت شما ${p.value} است (حد طبیعی ${p.range}). ` +
          "پلاکت بالا در بیشتر موارد یک واکنش موقت بدن است — به التهاب، عفونت، کمبود آهن، یا پس از خونریزی (به این حالت «واکنشی» می‌گویند). کمتر پیش می‌آید که از خود مغز استخوان باشد. تکرار آزمایش و بررسی آهن معمولاً تصویر را روشن می‌کند.",
        action: "نوبت عادی با پزشک.",
        suggest: ["CRP", "فریتین", "تکرار CBC"],
        warnings: [],
      };
    },
  },
  {
    id: "pancytopenia",
    match: (e) => {
      const t = val(e);
      const hgb = e.graded.find((g) => g.test === "HGB");
      return (
        hgb?.abnormal && hgb.dir === "low" &&
        t.WBC != null && t.WBC < 4 &&
        t.PLT != null && t.PLT < 150
      );
    },
    build: () => ({
      pattern: "pancytopenia",
      urgency: "emergency",
      headline: "هر سه نوع سلول خونی کمتر از حد طبیعی هستند",
      must_say:
        "گلبول قرمز، گلبول سفید و پلاکت — هر سه پایین هستند. " +
        "وقتی هر سه ردهٔ سلولی با هم افت می‌کنند، معمولاً مشکل از خودِ مغز استخوان (کارخانهٔ ساخت سلول‌های خونی) یا تخریب گستردهٔ آن‌هاست و نیاز به بررسی فوری دارد.",
      action: "همین امروز با پزشک تماس بگیرید.",
      suggest: [],
      warnings: [],
      blocks_others: true,
    }),
  },

  // ═══════════ تالاسمی مینور — بدون کم‌خونی ═══════════
  // 🔴 باگ بالینی: قاعده microcytic_anemia فقط وقتی Hb پایین باشد
  //    فعال می‌شد. ولی تالاسمی مینور اغلب Hb نرمال دارد —
  //    بدن با ساختن گلبول بیشتر (RBC بالا) جبران می‌کند.
  //
  //    نمونه واقعی: RBC 7.13↑ | MCV 67.3↓ | MCH 22.2↓ | HGB 15.8 (نرمال)
  //    Mentzer = 9.4 → کلاسیک‌ترین تالاسمی مینور. موتور هیچ نگفت.
  {
    id: "thal_trait_no_anemia",
    match: (e) => {
      const t = val(e);
      const hgb = e.graded.find((g) => g.test === "HGB");
      const anemic = hgb?.abnormal && hgb.dir === "low";
      // میکروسیتوز + بدون کم‌خونی + RBC بالا یا Mentzer پایین
      return (
        !anemic &&
        t.MCV != null && t.MCV < 80 &&
        ((t.RBC != null && t.RBC > 5.5) ||
         (e.indices.mentzer != null && e.indices.mentzer < 13))
      );
    },
    build: (e) => {
      const t = val(e);
      const mi = e.indices.mentzer;
      return {
        pattern: "thal_trait_likely",
        urgency: "routine",
        headline: "گلبول‌های قرمز شما کوچک هستند ولی تعدادشان زیاد است",
        must_say:
          "هموگلوبین شما طبیعی است، پس کم‌خونی ندارید. " +
          "ولی گلبول‌ها کوچک‌ترند و تعدادشان بیشتر از حد معمول است. " +
          "این الگو معمولاً به یک ویژگی ارثی اشاره دارد که از پدر یا مادر به ارث می‌رسد " +
          "و خودش معمولاً بی‌خطر است. کمبود آهن هم می‌تواند شبیهش باشد، " +
          "ولی این الگو بیشتر به حالت ارثی می‌خورد." +
          (mi != null ? ` (شاخص Mentzer = ${mi})` : ""),
        action: "نوبت عادی با پزشک. آزمایش الکتروفورز هموگلوبین و فریتین را مطرح کنید.",
        suggest: ["الکتروفورز هموگلوبین", "فریتین"],
        warnings: [
          "بدون تجویز پزشک قرص آهن نخورید. اگر علت آهن نباشد، آهن اضافی به بدن آسیب می‌زند.",
          "⚠️ اگر قصد بچه‌دار شدن دارید، این نتیجه مهم است — حتماً با پزشک و همسرتان مطرح کنید. " +
            "اگر هر دو والد این ویژگی را داشته باشند، فرزند ممکن است شکل شدید بیماری را بگیرد.",
        ],
      };
    },
  },
  {
    id: "erythrocytosis",
    match: (e) => {
      const t = val(e);
      const rbc = e.graded.find((g) => g.test === "RBC");
      const hgb = e.graded.find((g) => g.test === "HGB");
      // RBC بالا + MCV نرمال یا بالا + Hb بالا → پلی‌سیتمی، نه تالاسمی
      return (
        rbc?.abnormal && rbc.dir === "high" &&
        t.MCV != null && t.MCV >= 80 &&
        hgb?.abnormal && hgb.dir === "high"
      );
    },
    build: (e) => {
      const hgb = e.graded.find((g) => g.test === "HGB");
      return {
        pattern: "erythrocytosis",
        urgency: "this_week",
        headline: "تعداد گلبول‌های قرمز و هموگلوبین شما بالاست",
        must_say:
          (hgb ? `هموگلوبین شما ${hgb.value} است (حد طبیعی ${hgb.range})؛ ` : "") +
          "یعنی خون غلیظ‌تر از حد معمول است. علت‌های شایع: کم‌آبی (که موقت است)، سیگار، آپنهٔ خواب، یا زندگی در ارتفاع. کمتر پیش می‌آید که از یک اختلال مغز استخوان (پلی‌سیتمی) باشد.",
        action: "این هفته با پزشک وقت بگیرید. اگر کم‌آب هستید، آزمایش پس از آب‌رسانی کافی تکرار شود.",
        suggest: ["تکرار CBC", "اریتروپویتین", "اشباع اکسیژن خون"],
        warnings: ["اگر سردرد شدید، تاری دید، یا درد و تورم یک‌طرفهٔ ساق پا دارید، زودتر مراجعه کنید — خون غلیظ خطر لخته را کمی بالا می‌برد."],
      };
    },
  },

  // ═══════════ کم‌خونی ═══════════
  // پورت‌شده از patterns_anemia.js — فایلی مرده که هیچ‌کس import نمی‌کرد و
  // در ba144a7 حذف شد. بدونِ هیچ تغییری منتقل شد: آستانه، متنِ فارسی،
  // key_number و کامنتِ داخلی عیناً همان‌اند.
  // ⚠️ آستانهٔ Hb < 7.0 منبعِ ثبت‌شده ندارد — در MEDICAL_RULES.md به‌عنوان
  //    «منتقل‌شده بدون تغییر، منبع نامعلوم، نیازمند بازبینی» ثبت شد.
  //    کامنتِ «یا زیر ۸.۰ برای بیماران پرخطر» عمداً پیاده نشد.
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
  {
    id: "macrocytic_anemia",
    match: (e) => macrocyticMatch(e),
    build: (e) => {
      const t = val(e);
      const hgb = e.graded.find((g) => g.test === "HGB");
      const rdwHigh = t.RDW_CV > 15 || t.RDW_SD > 56;
      // بازبینی B1: وقتی ماکروسیتیک مالکِ فولاتِ پایین است، folate_deficiency کنار می‌رود و هشدارِ
      // اسید فولیک با آن — درست در پنلی که اسید فولیک کمبودِ B12 را می‌پوشاند. هشدار اینجا می‌آید.
      const f = e.graded.find((g) => g.test === "FOLATE");
      const folicRisk = !!(f?.abnormal && f.dir === "low") && b12Unsettled(e);
      return {
        pattern: "macrocytic_anemia",
        urgency: "this_week",
        headline: "گلبول‌های قرمز شما کم و بزرگ‌تر از حد معمول هستند",
        must_say:
          (hgb ? `هموگلوبین شما ${hgb.value} است (حد طبیعی ${hgb.range}) و ` : "") +
          `گلبول‌های قرمز بزرگ‌تر از حد معمول‌اند (MCV حدود ${t.MCV}). ` +
          "این نوع کم‌خونی («ماکروسیتیک») اغلب از کمبود ویتامین B12 یا فولات می‌آید — این ویتامین‌ها برای ساخت درست سلول لازم‌اند و بدون آن‌ها گلبول‌ها بزرگ و ناقص ساخته می‌شوند. " +
          // specs/004، N21: علت‌ها را فهرست کردن بس نیست — عددی که میانشان داوری می‌کند روی همین برگه است.
          `${folateClause(e, CLAUSE_FOR.macro)} ${b12Clause(e, CLAUSE_FOR.macro)} ` +
          (folicRisk && t.B12 == null ? `${FOLIC_CAUTION} ` : "") +
          "کم‌کاری تیروئید هم می‌تواند علت باشد. " +
          (rdwHigh
            ? "تفاوت اندازهٔ گلبول‌ها هم زیاد است (RDW بالا) که سرنخ مهمی است."
            : ""),
        action:
          "این هفته با پزشک عمومی یا داخلی وقت بگیرید و این آزمایش‌ها را بخواهید.",
        // ⚠️ آهن اینجا نیست — مدل قبلاً اشتباهاً پیشنهاد می‌داد
        suggest: ["ویتامین B12", "فولات", "رتیکولوسیت", "TSH"],
        forbid: ["آهن", "فریتین", "iron", "ferritin"],
        warnings: [
          "خودتان مکمل B12 شروع نکنید — اگر قبل از آزمایش مصرف کنید، نتیجه گمراه‌کننده می‌شود.",
          ...(folicRisk ? [FOLIC_WARNING] : []),
        ],
      };
    },
  },
  // ─── specs/004: فولاتِ پایین — تا امروز فقط به «توضیحی نداریم» می‌رسید (N1) ───
  // مالکیت (N20): وقتی macrocytic_anemia فعال است، فولات مالِ آن است و این قاعده کنار می‌رود.
  // شرط از *همان* macrocyticMatch خوانده می‌شود، نه با بازنویسیِ «MCV > 100» — دو شرطِ هم‌معنا
  // یک ویرایش تا دو یافتهٔ متناقض فاصله دارند. آستانه همان بازهٔ refs.js است؛ عددِ تازه‌ای نیست.
  // فوریت همیشه routine (clarify ۲۰۲۶-۰۹-۱۹، P49) — موتور برای فولات درجهٔ CTCAE ندارد.
  {
    id: "folate_deficiency",
    match: (e) => {
      const f = e.graded.find((g) => g.test === "FOLATE");
      return !!(f?.abnormal && f.dir === "low") && !macrocyticMatch(e);
    },
    build: (e) => {
      const f = e.graded.find((g) => g.test === "FOLATE");
      const b12 = val(e).B12;
      // فولاتِ تنها همیشه routine است (clarify Q4). ولی کنارِ B12ِ زیرِ ۱۵۰، overt_b12_deficiency همین
      // B12 را «این هفته» می‌گوید و این یافته هم از همان B12 حرف می‌زند — یک عدد، یک زمان‌بندی
      // (بازبینی B3، N20). فوریت از قاعدهٔ موجود گرفته می‌شود، نه عددِ تازه.
      const urgency = b12 != null && b12 < B12_OVERT_BELOW ? "this_week" : "routine";
      return {
        pattern: "folate_deficiency",
        urgency,
        headline: "فولاتِ خونِ شما پایین است",
        must_say:
          `${folateClause(e, CLAUSE_FOR.own)} ` +
          "فولات یکی از ویتامین‌های گروهِ B است که بدن برای ساختنِ گلبول‌های قرمز و سلول‌های تازه لازم دارد. " +
          b12Clause(e, CLAUSE_FOR.own) +
          (b12 == null ? ` ${FOLIC_CAUTION}` : ""),
        action: actionFor(urgency, {
          week: "همراه با یافتهٔ ویتامین B12، این هفته با پزشک مطرح کنید و پیش از شروعِ هر مکملی این برگه را به پزشک نشان دهید.",
          routine: "در نوبتِ عادی با پزشک مطرح کنید و پیش از شروعِ هر مکملی این برگه را به پزشک نشان دهید.",
        }),
        ...(b12 == null ? { suggest: ["ویتامین B12"] } : {}),
        // زیرِ ۱۵۰ همان هشدار را overt_b12_deficiency (با همان فوریت) می‌دهد؛ بالای ۳۹۹ لازم نیست.
        warnings: b12Unsettled(e) ? [FOLIC_WARNING] : [],
        key_number: f.value,
      };
    },
  },
  {
    id: "anemia_macrocytic_mds",
    match: (e) => {
      const hgb = e.graded.find((g) => g.test === "HGB");
      const isAnemia = hgb?.abnormal && hgb.dir === "low";
      if (!isAnemia) return false;

      const t = val(e);
      const mcvHigh = t.MCV != null && t.MCV > 102;
      
      const plt = e.graded.find((g) => g.test === "PLT");
      const pltLow = plt?.abnormal && plt.dir === "low";

      return mcvHigh && pltLow;
    },
    build: (e) => {
      return {
        pattern: "anemia_macrocytic_mds",
        urgency: "this_week",
        headline: "کم‌خونی ماکروسیتیک و کاهش پلاکت",
        must_say: "حجم گلبول‌های قرمز بزرگتر از حد طبیعی است (بالای ۱۰۲) و تعداد پلاکت‌ها نیز کاهش یافته است. در برخی موارد، این الگو (به‌ویژه در سنین بالاتر) می‌تواند نشان‌دهنده سندرم‌های میلودیسپلاستیک (MDS) باشد.",
        action: "جهت بررسی دقیق‌تر و معاینه بالینی، در اسرع وقت به متخصص خون (هماتولوژیست) مراجعه کنید.",
        suggest: ["گسترش خون محیطی (PBS)", "مشاوره هماتولوژی"],
        warnings: [],
      };
    },
  },
  {
    id: "microcytic_anemia",
    match: (e) => {
      const t = val(e);
      const hgb = e.graded.find((g) => g.test === "HGB");
      return hgb?.abnormal && hgb.dir === "low" && t.MCV < 80;
    },
    build: (e) => {
      const t = val(e);
      const mi = e.indices.mentzer;
      const thal = mi != null && mi < 13;
      const hgb = e.graded.find((g) => g.test === "HGB");
      // شدت کم‌خونی به‌سبک WHO: خفیف تا حد ۱۱، متوسط ۸ تا ۱۱، شدید زیر ۸.
      const hb = hgb?.value;
      const sev =
        hb == null ? null : hb < 8 ? "شدید" : hb < 11 ? "متوسط" : "خفیف";
      // بزرگیِ کم‌خونی: مقدار هموگلوبین + محدودهٔ طبیعی، و اندازهٔ گلبول (MCV).
      const mag =
        hgb != null
          ? `هموگلوبین شما ${hgb.value} است (حد طبیعی ${hgb.range})${sev ? ` — کم‌خونیِ ${sev}` : ""}` +
            (t.MCV != null ? `، و اندازهٔ متوسط گلبول‌ها (MCV) ${t.MCV} است که کوچک‌تر از حد طبیعی (۸۰ تا ۱۰۰) است` : "") +
            ". "
          : "";
      // مکانیسم: چرا گلبول‌ها کوچک شده‌اند.
      const mechThal =
        "دو علت شایعِ گلبولِ کوچک وجود دارد: کمبود آهن، یا یک ویژگی ارثی خون (صفت تالاسمی) که معمولاً بی‌خطر است. " +
        `یک شاخص محاسباتی (اندکس منتزر${mi != null ? ` حدود ${mi}` : ""}) در اینجا زیر ۱۳ است که بیشتر به سمت صفت تالاسمی می‌خورد تا کمبود آهن — ولی این فقط یک احتمال است و آزمایش قطعی (فریتین و الکتروفورز هموگلوبین) لازم است.`;
      const mechIda =
        "آهن جزء اصلیِ هموگلوبین است؛ وقتی ذخیرهٔ آهن کم می‌شود، مغز استخوان مجبور می‌شود گلبول‌های کوچک‌تر و کم‌رنگ‌تر بسازد — که همین الگوی آزمایش شماست. " +
        (mi != null
          ? `شاخص محاسباتی منتزر (حدود ${mi}) بالای ۱۳ است که با کمبود آهن سازگارتر است تا صفت تالاسمی. `
          : "") +
        "برای تأیید، فریتین باید اندازه‌گیری شود (فریتین زیر ۳۰ کمبود آهن را تأیید می‌کند؛ ولی چون فریتین در التهاب بالا می‌رود، مقدار طبیعی هم گاهی کمبود آهن را رد نمی‌کند).";
      return {
        pattern: thal ? "microcytic_thal_likely" : "microcytic_ida_likely",
        urgency: thal ? "routine" : "this_week",
        ...(hb != null ? { key_number: hb } : {}),
        headline: thal
          ? "گلبول‌های قرمز شما کوچک هستند ولی تعدادشان زیاد است"
          : "گلبول‌های قرمز شما کم و کوچک‌تر از حد معمول هستند",
        must_say:
          mag +
          "این یعنی کم‌خونیِ میکروسیتیک (گلبولِ کوچک). " +
          (thal ? mechThal : mechIda),
        action: thal
          ? "نوبت عادی با پزشک. آزمایش فریتین و الکتروفورز هموگلوبین را مطرح کنید."
          : `${sev === "شدید" ? "چون کم‌خونی شدید است، همین چند روز با پزشک وقت بگیرید" : "این هفته با پزشک وقت بگیرید"}؛ در بزرگسالان، کمبود آهن باید علت‌یابی شود (به‌ویژه منبع خونریزی پنهان گوارشی).`,
        suggest: thal
          ? ["فریتین", "الکتروفورز هموگلوبین"]
          : ["فریتین", "آهن سرم", "TIBC", "بررسی خون مخفی در مدفوع (FOBT)"],
        forbid: ["B12", "فولات"],
        warnings: [
          "بدون تجویز پزشک قرص آهن نخورید. اگر علت آهن نباشد، آهن اضافی به بدن آسیب می‌زند.",
          ...(sev === "شدید"
            ? ["اگر تنگی نفس، تپش قلب، یا احساس ضعف و سرگیجهٔ شدید دارید، زودتر به پزشک مراجعه کنید."]
            : []),
          ...(thal
            ? ["اگر در خانواده‌تان کسی تالاسمی دارد یا قصد بچه‌دار شدن دارید، حتماً به پزشک بگویید."]
            : []),
        ],
      };
    },
  },
  {
    id: "normocytic_anemia",
    match: (e) => {
      const t = val(e);
      const hgb = e.graded.find((g) => g.test === "HGB");
      return hgb?.abnormal && hgb.dir === "low" && t.MCV >= 80 && t.MCV <= 100;
    },
    build: (e) => {
      // رتیکولوسیت کلید تفکیک کم‌خونیِ کم‌تولید از پرتخریب/خونریزی است.
      const retic = e.graded.find((g) => g.test === "RETIC");
      const reticHigh = retic?.abnormal && retic.dir === "high";
      const reticLow = retic?.abnormal && retic.dir === "low";
      const hgb = e.graded.find((g) => g.test === "HGB");
      const hb = hgb?.value;
      const sev =
        hb == null ? null : hb < 8 ? "شدید" : hb < 11 ? "متوسط" : "خفیف";
      const mag =
        hgb != null
          ? `هموگلوبین شما ${hgb.value} است (حد طبیعی ${hgb.range})${sev ? ` — کم‌خونیِ ${sev}` : ""}. `
          : "";
      let extra = "";
      let suggest = ["رتیکولوسیت", "فریتین", "کراتینین", "CRP"];
      if (reticHigh) {
        extra = " شمارش رتیکولوسیت بالاست — یعنی مغز استخوان در حال جبران است؛ این بیشتر به خونریزی یا تجزیهٔ گلبول‌ها (همولیز) می‌خورد.";
        suggest = ["هاپتوگلوبین", "LDH", "بیلی‌روبین مستقیم و غیرمستقیم", "بررسی منبع خونریزی"];
      } else if (reticLow) {
        extra = " شمارش رتیکولوسیت پایین است — یعنی مغز استخوان پاسخ کافی نمی‌دهد؛ علت‌هایی مثل کمبود آهن/ویتامین، کم‌کاری کلیه یا مشکل مغز استخوان مطرح است.";
        suggest = ["فریتین", "ویتامین B12 و فولات", "کراتینین", "بررسی توسط پزشک"];
      }
      return {
        pattern: "normocytic_anemia",
        urgency: "this_week",
        ...(hb != null ? { key_number: hb } : {}),
        headline: "خون شما کم‌خونی نشان می‌دهد",
        must_say:
          mag +
          "گلبول‌ها اندازهٔ طبیعی دارند ولی تعدادشان کم است (کم‌خونیِ نورموسیتیک)." + extra +
          " شمارش رتیکولوسیت (گلبول‌های تازه‌ساز) کلید تعیین علت است و برای پیدا کردن ریشهٔ کم‌خونی چند آزمایش دیگر لازم است.",
        action:
          sev === "شدید"
            ? "چون کم‌خونی شدید است، همین چند روز با پزشک وقت بگیرید."
            : "نوبت با پزشک بگیرید.",
        suggest,
        warnings:
          sev === "شدید"
            ? ["اگر تنگی نفس، تپش قلب، یا سرگیجهٔ شدید دارید، زودتر مراجعه کنید."]
            : [],
      };
    },
  },

  {
    // P1 — تا امروز *هر* قاعدهٔ گلبولِ قرمز در این فایل روی
    // `hgb.abnormal && hgb.dir === "low"` گیت شده بود (macrocytic_anemia،
    // microcytic_anemia، normocytic_anemia، anemia_macrocytic_mds،
    // spherocytosis_likely). پس بیماری که RBC و HCT او صراحتاً «پایین» علامت
    // خورده ولی هموگلوبینش پایین نیست، هیچ قاعده‌ای نمی‌گرفت و مستقیم در
    // unmatched_abnormal می‌افتاد: «برای این ترکیب توضیح آماده‌ای نداریم» کنارِ
    // دو عددِ آشکارا غیرطبیعی. همان کلاسِ N1.
    //
    // موردِ واقعی که این را نشان داد: مرد ۷۸ ساله، RBC 3.82↓ و HCT 38.6↓ ولی
    // HGB 12.3 که با GERIATRIC_REFS «طبیعی» است. توجه: RBC و HCT جدولِ
    // سالمندی ندارند و HGB دارد، پس یک نمونهٔ خون همزمان «هموگلوبینِ طبیعی» و
    // «هماتوکریتِ پایین» می‌شود — ریشهٔ این ناهمخوانی P2 در MEDICAL_RULES.md
    // است و تصمیمش با بازبینِ انسانی است، نه با این قاعده.
    //
    // ⚠️ این قاعده عمداً *ادعای کم‌خونی نمی‌کند*. موتور هموگلوبین را پایین
    //    ندانسته؛ نقض‌کردنِ آن از داخلِ یک قاعده همان کاری است که N13 در سمتِ
    //    LLM ممنوع می‌کند. فقط می‌گوید کدام دو شاخص پایین‌اند و راهِ روشن‌شدنش
    //    چیست. اگر روزی بازهٔ سالمندیِ HGB اصلاح شود، این مورد خودش به
    //    قاعده‌های کم‌خونی منتقل می‌شود و اینجا دیگر فعال نمی‌گردد. تست: M47.
    id: "low_rbc_hct_without_anemia",
    match: (e) => {
      const rbc = e.graded.find((g) => g.test === "RBC");
      const hct = e.graded.find((g) => g.test === "HCT");
      const hgb = e.graded.find((g) => g.test === "HGB");
      const rbcLow = rbc?.abnormal && rbc.dir === "low";
      const hctLow = hct?.abnormal && hct.dir === "low";
      // هموگلوبینِ پایین کارِ قاعده‌های کم‌خونی است، نه این یکی.
      const hgbLow = hgb?.abnormal && hgb.dir === "low";
      return (rbcLow || hctLow) && !hgbLow;
    },
    build: (e) => {
      const rbc = e.graded.find((g) => g.test === "RBC");
      const hct = e.graded.find((g) => g.test === "HCT");
      const hgb = e.graded.find((g) => g.test === "HGB");
      const rbcLow = rbc?.abnormal && rbc.dir === "low";
      const hctLow = hct?.abnormal && hct.dir === "low";

      // فقط شاخصی را نام ببر که واقعاً پایین است — قاعده با «یا» فعال می‌شود.
      const parts = [];
      if (rbcLow) parts.push(`تعداد گلبول‌های قرمز ${rbc.value} است (حد طبیعی ${rbc.range})`);
      if (hctLow) parts.push(`هماتوکریت ${hct.value} است (حد طبیعی ${hct.range})`);

      // N4 — «اندازه‌گیری‌نشده» با «طبیعی» یکی نیست. سه حالت، سه متن.
      const hgbFa = !hgb
        ? "هموگلوبین در این برگه اندازه‌گیری نشده است، و بدون آن نمی‌توان گفت کم‌خونی هست یا نه — این مهم‌ترین عددِ غایب در این نتیجه است."
        : hgb.abnormal && hgb.dir === "high"
        ? `در مقابل، هموگلوبین شما ${hgb.value} است که بالاتر از حد طبیعی (${hgb.range}) گزارش شده.`
        : `در مقابل، هموگلوبین شما ${hgb.value} است و داخل محدودهٔ طبیعیِ گزارش‌شده (${hgb.range}) قرار دارد؛ یعنی این نتیجه «کم‌خونی» نیست.`;

      // متنِ سالمندی از P2 در MEDICAL_RULES.md می‌آید: کاهشِ شاخص‌های گلبول
      // قرمز در سالمندی یافتهٔ فیزیولوژیکِ پیری نیست و علت می‌خواهد.
      const elderly =
        e.age != null && e.age >= 75
          ? " در سنین بالای ۷۵ سال این یافته را نباید به‌حسابِ «طبیعیِ سن» گذاشت؛ افتِ شاخص‌های گلبول قرمز در سالمندی بخشی از روند طبیعی پیری نیست و علت‌یابی می‌خواهد."
          : "";

      const suggest = hgb
        ? ["فریتین", "ویتامین B12", "فولات", "رتیکولوسیت", "کراتینین"]
        : ["شمارش خون (CBC)", "فریتین", "رتیکولوسیت", "کراتینین"];

      return {
        pattern: "low_rbc_hct_without_anemia",
        urgency: "routine",
        ...(rbcLow ? { key_number: rbc.value } : {}),
        headline: "بعضی از شاخص‌های گلبول قرمز پایین‌تر از حد طبیعی است",
        must_say:
          `${parts.join(" و ")}. ` +
          `${hgbFa} ` +
          "هماتوکریت درصدِ حجمی است که گلبول‌های قرمز از خون اشغال می‌کنند، و هموگلوبین مقدارِ مادهٔ اکسیژن‌رسانِ داخلِ آن‌هاست؛ این‌ها دو چیز متفاوت‌اند و می‌توانند هم‌جهت نباشند. " +
          "این ترکیب می‌تواند صرفاً تفاوتِ آزمایشگاهی یا رقیق‌بودنِ خون باشد، ولی می‌تواند شروعِ کاهشِ ساختِ گلبول قرمز هم باشد — که علت‌هایی مثل کمبود آهن، کمبود B12 یا فولات، و کم‌کاری کلیه دارد." +
          elderly,
        action:
          "با پزشک عمومی یا داخلی در نوبت عادی مطرح کنید و آزمایش‌های زیر را بخواهید؛ اگر آزمایش قبلی دارید حتماً همراه ببرید تا روند مقایسه شود.",
        suggest,
        warnings: [
          "خودتان مکملِ آهن یا B12 شروع نکنید — مصرفِ پیش از آزمایش، نتیجه را گمراه‌کننده می‌کند و علتِ اصلی پنهان می‌ماند.",
        ],
      };
    },
  },

  {
    // P5 — تا acc9cc0 هر چهار رشتهٔ کاربرمحورِ این قاعده انگلیسی بود
    // («Increased Intracellular Hemoglobin Concentration»)، یعنی یک قاعدهٔ
    // زنده که به بیمارِ فارسی‌زبان انگلیسی می‌داد — همان چیزی که M38 برای
    // گرفتنش نوشته شد. اینجا فقط *ترجمه* شده: match، آستانه‌ها، urgency و
    // ${mchc.value} عیناً همان‌اند و هیچ محتوایی افزوده یا کم نشده. تست: M41.
    id: "spherocytosis_likely",
    match: (e) => {
      const t = val(e);
      const mch = e.graded.find((g) => g.test === "MCH");
      const hgb = e.graded.find((g) => g.test === "HGB");
      const rbc = e.graded.find((g) => g.test === "RBC");
      const rdw = e.graded.find((g) => g.test.startsWith("RDW"));

      const mchcHigh = t.MCHC != null && t.MCHC > 36;
      const mcvNormalOrLow = t.MCV != null && t.MCV <= 100;
      const mchNormal = mch && (!mch.abnormal || mch.tag === "normal" || mch.tag === "normochromic" || mch.dir == null);
      const hgbLow = hgb && hgb.abnormal && hgb.dir === "low";
      const rbcNotHigh = !rbc || !rbc.abnormal || rbc.dir === "low";
      const rdwHigh = rdw && rdw.abnormal && rdw.dir === "high";

      return mchcHigh && mcvNormalOrLow && mchNormal && hgbLow && rbcNotHigh && rdwHigh;
    },
    build: (e) => {
      const mchc = e.graded.find((g) => g.test === "MCHC");
      return {
        pattern: "spherocytosis_likely",
        urgency: "this_week",
        headline: "غلظت هموگلوبین داخل گلبول‌های قرمز بالاتر از حد طبیعی است",
        must_say: `غلظت هموگلوبین در گلبول‌های قرمز (MCHC) بالاتر از حد طبیعی است، با مقدار ${mchc.value}. وقتی با RDW بالا، کم‌خونی خفیف و گلبول‌های قرمز طبیعی یا کوچک همراه باشد، به‌شدت نشان‌دهندهٔ نیاز به بررسی شکل‌های غیرطبیعی گلبول قرمز (مانند اسفروسیتوز) است. لام خون محیطی به‌شدت توصیه می‌شود.`,
        action: "در همین هفته‌های پیشِ رو با پزشک وقت بگیرید تا لام خون محیطی بررسی شود.",
        suggest: ["لام خون محیطی", "بیلی‌روبین", "تکرار CBC"],
        warnings: [],
      };
    },
  },

  {
    id: "coagulation_abnormal",
    match: (e) => {
      const pt = e.graded.find((g) => g.test === "PT");
      const aptt = e.graded.find((g) => g.test === "APTT");
      const fib = e.graded.find((g) => g.test === "FIB");
      const inr = e.graded.find((g) => g.test === "INR");
      return (pt?.abnormal && pt.dir === "high") ||
             (aptt?.abnormal && aptt.dir === "high") ||
             (fib?.abnormal && fib.dir === "low") ||
             (inr?.abnormal && inr.dir === "high");
    },
    build: (e) => {
      const pt = e.graded.find((g) => g.test === "PT");
      const fib = e.graded.find((g) => g.test === "FIB");
      const inr = e.graded.find((g) => g.test === "INR");
      // PT>25، فیبرینوژن<100، یا INR>3 → فوری
      const severe = (pt && pt.value > 25) || (fib && fib.value < 100) ||
                     (inr && inr.value > 3);
      return {
        pattern: "coagulation_abnormal",
        urgency: severe ? "emergency" : "this_week",
        headline: "شاخص‌های لخته شدن خون شما غیرطبیعی هستند",
        must_say:
          "زمان لخته شدن خون طولانی‌تر از حد معمول است. " +
          "داروهای رقیق‌کننده خون هم می‌توانند این را بسازند.",
        action: severe
          ? "همین امروز با پزشک تماس بگیرید."
          : "این هفته با پزشک وقت بگیرید. حتماً بگویید چه داروهایی مصرف می‌کنید.",
        suggest: ["تکرار آزمایش انعقاد"],
        warnings: [
          "تا مشخص شدن علت، آسپرین یا مسکن‌های ضدالتهاب مصرف نکنید.",
          "اگر خونریزی غیرعادی یا کبودی بی‌دلیل دیدید، همان روز به پزشک مراجعه کنید.",
        ],
        blocks_others: severe,
      };
    },
  },

  // ═══════════ فقر آهن — با پنل آهن (نه فقط CBC) ═══════════
  // رویکرد الف: فقط وقتی پنل آهن موجود است فعال می‌شود.
  // اگر فقط CBC باشد، microcytic_anemia قبلی کار می‌کند.
  // گایدلاین (Labcorp/AAFP): فقر آهن = فریتین پایین + TIBC بالا + TSAT پایین.
  {
    id: "iron_deficiency_panel",
    match: (e) => {
      const t = val(e);
      // حداقل فریتین لازم است — قوی‌ترین نشانگر
      if (t.FERRITIN == null) return false;
      const ferr = e.graded.find((g) => g.test === "FERRITIN");
      const ferrLow = ferr?.abnormal && ferr.dir === "low";
      // فریتین پایین به‌تنهایی تقریباً قطعیِ فقر آهن است (اگر التهاب نباشد)
      const tsatLow = t.TSAT != null && t.TSAT < 20;
      const tibcHigh = (() => {
        const g = e.graded.find((x) => x.test === "TIBC");
        return g?.abnormal && g.dir === "high";
      })();
      // ⚠️ شکافِ واقعی (کلاسِ N2 — کم‌خوانیِ خاموش):
      //    فریتین واکنش‌گرِ فاز حاد است و در التهاب بالا می‌رود. پس در بیمارِ
      //    ملتهب، فریتینِ «طبیعی» کمبودِ آهن را رد نمی‌کند. WHO 2020 دقیقاً
      //    برای همین آستانهٔ جداگانه دارد: در حضورِ عفونت/التهاب، فریتینِ
      //    زیر ۷۰ µg/L در بزرگسال کمبودِ آهن را مطرح می‌کند (به‌جای ۱۵).
      //    بدون این شاخه، بیمارِ CRPِ ۴۰ با فریتینِ ۴۵ هیچ پیامی نمی‌گرفت.
      return ferrLow || (tsatLow && tibcHigh) || whoInflamIronDeficiency(e);
    },
    build: (e) => {
      const t = val(e);
      const ferr = e.graded.find((g) => g.test === "FERRITIN");
      const ferrLow = ferr?.abnormal && ferr.dir === "low";
      const inflam = hasInflammation(e);
      // شاخهٔ WHO: فریتین طبق آزمایشگاه «طبیعی» است ولی با التهاب زیر ۷۰.
      const whoOnly = !ferrLow && whoInflamIronDeficiency(e);
      return {
        pattern: whoOnly ? "iron_deficiency_masked_by_inflammation" : "iron_deficiency",
        urgency: "this_week",
        sources: ["WHO_FERRITIN"],
        headline: whoOnly
          ? "فریتین شما «طبیعی» گزارش شده، ولی با توجه به التهاب می‌تواند کمبود آهن را پنهان کند"
          : "الگوی آزمایش‌ها به کمبود آهن اشاره دارد",
        must_say: whoOnly
          ? `فریتین شما ${t.FERRITIN} است که در محدودهٔ چاپ‌شدهٔ آزمایشگاه «طبیعی» به حساب می‌آید — ولی ` +
            "فریتین یک پروتئینِ التهابی هم هست و هر التهاب یا عفونتی آن را بالا می‌برد، حتی وقتی ذخیرهٔ آهن ته کشیده باشد. " +
            "چون نشانه‌های التهاب در همین برگه بالاست، سازمان جهانی بهداشت در این وضعیت آستانهٔ بالاتری (فریتین زیر ۷۰) را " +
            "برای مطرح کردنِ کمبود آهن به کار می‌برد، نه آستانهٔ معمولِ ۱۵. یعنی این عدد کمبود آهن را رد نمی‌کند و باید بررسی شود."
          : "ذخیره آهن بدن شما پایین است" +
            (ferrLow ? " (فریتین پایین، قوی‌ترین نشانه کمبود آهن)" : "") +
            ". شایع‌ترین علت‌ها خون‌ریزی مزمن (مثلاً قاعدگی سنگین یا دستگاه گوارش) و دریافت ناکافی آهن است." +
            (inflam ? " توجه: نشانه‌های التهاب هم بالاست و ممکن است تصویر آهن را پیچیده کند — پزشک باید تفسیر کند." : ""),
        action: "این هفته با پزشک وقت بگیرید. اگر خون‌ریزی گوارشی یا قاعدگی سنگین دارید حتماً بگویید.",
        suggest: whoOnly
          ? ["اشباع ترانسفرین (TSAT)", "گیرندهٔ محلول ترانسفرین (sTfR)", "بررسی علت التهاب"]
          : ["پنل کامل آهن", "بررسی علت خون‌ریزی"],
        warnings: [
          "قبل از تأیید پزشک و مشخص شدن علت، خودتان دوز بالای آهن شروع نکنید.",
        ],
      };
    },
  },

  // ═══════════ کم‌خونی بیماری مزمن ═══════════
  // گایدلاین: آهن پایین + TIBC پایین/طبیعی + فریتین طبیعی/بالا + TSAT پایین.
  // تمایز کلیدی از فقر آهن: در فقر آهن TIBC بالاست، اینجا پایین.
  {
    id: "anemia_chronic_disease",
    match: (e) => {
      const t = val(e);
      const hgb = e.graded.find((g) => g.test === "HGB");
      const anemic = hgb?.abnormal && hgb.dir === "low";
      if (!anemic) return false;
      // نیاز به پنل آهن برای تمایز
      if (t.IRON == null || t.FERRITIN == null) return false;
      const iron = e.graded.find((g) => g.test === "IRON");
      const ferr = e.graded.find((g) => g.test === "FERRITIN");
      const ironLow = iron?.abnormal && iron.dir === "low";
      // فریتین طبیعی یا بالا (نه پایین) — این فقر آهن را رد می‌کند
      const ferrNotLow = !(ferr?.abnormal && ferr.dir === "low");
      // TIBC پایین یا طبیعی (نه بالا)
      const tibc = e.graded.find((g) => g.test === "TIBC");
      const tibcNotHigh = !(tibc?.abnormal && tibc.dir === "high");
      return ironLow && ferrNotLow && tibcNotHigh;
    },
    build: (e) => {
      const crp = e.graded.find((g) => g.test === "CRP_Q");
      const inflam = crp?.abnormal && crp.dir === "high";
      return {
        pattern: "anemia_of_chronic_disease",
        urgency: "this_week",
        headline: "الگوی کم‌خونی شما بیشتر به التهاب یا بیماری زمینه‌ای می‌خورد تا کمبود آهن",
        must_say:
          "برخلاف کمبود آهن، اینجا ذخیره آهن بدن پایین نیست — ولی بدن نمی‌تواند از آهن موجود خوب استفاده کند. " +
          "این الگو معمولاً همراه یک التهاب یا بیماری مزمن دیده می‌شود." +
          (inflam ? " CRP شما هم بالاست که با این تصویر همخوانی دارد." : ""),
        action: "این هفته با پزشک وقت بگیرید تا علت زمینه‌ای بررسی شود.",
        suggest: ["CRP", "بررسی بیماری زمینه‌ای", "عملکرد کلیه"],
        // مهم: در این نوع کم‌خونی آهن خوراکی کمکی نمی‌کند و گاهی مضر است
        forbid: ["آهن خوراکی", "قرص آهن", "iron supplement"],
        warnings: [
          "در این نوع کم‌خونی، مصرف خودسرانه قرص آهن معمولاً کمکی نمی‌کند. درمان روی علت اصلی است.",
        ],
      };
    },
  },

  // ═══════════ همولیز ═══════════
  // گایدلاین (AAFP/ARUP): LDH بالا + بیلی‌روبین غیرمستقیم بالا +
  //   هاپتوگلوبین پایین + رتیکولوسیت بالا → همولیز.
  // تله مهم (منبع): LDH+AST بالا با هاپتوگلوبین طبیعی → عضله، نه همولیز.
  {
    id: "hemolysis_pattern",
    match: (e) => {
      const t = val(e);
      // حداقل دو نشانگر از نشانگرهای اصلی همولیز لازم است
      const ldhHigh = (() => {
        const g = e.graded.find((x) => x.test === "LDH");
        return g?.abnormal && g.dir === "high";
      })();
      const haptoLow = (() => {
        const g = e.graded.find((x) => x.test === "HAPTO");
        return g?.abnormal && g.dir === "low";
      })();
      const reticHigh = (() => {
        const g = e.graded.find((x) => x.test === "RETIC");
        return g?.abnormal && g.dir === "high";
      })();
      // بیلی‌روبین غیرمستقیم: اگر خودش روی برگه چاپ شده از همان استفاده کن،
      // وگرنه از تفریقِ تام منهای مستقیم بساز — همان ترتیبی که
      // patterns_biochem.js:758 از قبل به کار می‌بَرد.
      // ⚠️ پیش از این فقط مسیرِ دوم بود، پس برگه‌ای که غیرمستقیم را مستقیماً
      //    چاپ می‌کند (هشت املای BILI_I در adapter.js) در شمارشِ نشانگرها صفر
      //    می‌آورد و همان بیمار بسته به ستونی که آزمایشگاه چاپ کرده بود، الگوی
      //    همولیز می‌گرفت یا نمی‌گرفت. تست: M46.
      // آستانهٔ ۱.۰ و هر سه شاخهٔ خروج دست‌نخورده‌اند.
      const indirect = t.BILI_I != null ? t.BILI_I
                     : (t.BILI_T != null && t.BILI_D != null ? t.BILI_T - t.BILI_D : null);
      const indirectHigh = indirect != null && indirect > 1.0;
      const markers = [ldhHigh, haptoLow, reticHigh, indirectHigh].filter(Boolean).length;

      // تله عضله: LDH بالا + AST/CK بالا + هاپتوگلوبین طبیعی → عضله، نه همولیز.
      // این حالت هم باید الگو را فعال کند تا توضیح درست به کاربر برسد
      // (وگرنه در تور ایمنی عمومی می‌افتد و پیام گمراه‌کننده می‌دهد).
      const ast = e.graded.find((g) => g.test === "AST");
      const ck = e.graded.find((g) => g.test === "CK");
      const muscleTrap = ldhHigh && !haptoLow &&
                         ck?.abnormal && ck.dir === "high" &&
                         ast?.abnormal && ast.dir === "high";

      // هاپتوگلوبین پایین قوی‌ترین نشانه است؛ اگر باشد یک نشانه دیگر کافی است
      return muscleTrap || (haptoLow && markers >= 2) || markers >= 3;
    },
    build: (e) => {
      const t = val(e);
      // تله عضله: اگر AST و CK بالا و هاپتوگلوبین طبیعی → احتمالاً عضله
      const ast = e.graded.find((g) => g.test === "AST");
      const ck = e.graded.find((g) => g.test === "CK");
      const hapto = e.graded.find((g) => g.test === "HAPTO");
      const haptoLow = hapto?.abnormal && hapto.dir === "low";
      const muscleTrap = !haptoLow &&
                         ck?.abnormal && ck.dir === "high" &&
                         ast?.abnormal && ast.dir === "high";
      if (muscleTrap) {
        return {
          pattern: "ldh_muscle_not_hemolysis",
          urgency: "routine",
          headline: "چند شاخص بالا هستند، ولی الگو بیشتر به عضله می‌خورد تا خون",
          must_say:
            "LDH و برخی آنزیم‌ها بالا هستند، ولی هاپتوگلوبین طبیعی است — " +
            "این به آسیب یا فعالیت عضلانی اشاره دارد نه شکستن گلبول قرمز. ورزش سنگین اخیر هم می‌تواند علت باشد.",
          action: "نوبت عادی. اگر ورزش سنگین کرده‌اید حتماً به پزشک بگویید.",
          suggest: ["CK", "تکرار آزمایش پس از استراحت"],
          warnings: [],
        };
      }
      return {
        pattern: "hemolysis_likely",
        urgency: "this_week",
        headline: "الگوی آزمایش‌ها به شکستن گلبول‌های قرمز (همولیز) اشاره دارد",
        must_say:
          "چند شاخص با هم نشان می‌دهند که گلبول‌های قرمز شما ممکن است زودتر از حد معمول تجزیه شوند. " +
          "علت‌های زیادی دارد — از ارثی تا خودایمنی و دارویی — و برای مشخص شدن باید بررسی شود.",
        action: "این هفته با پزشک وقت بگیرید. این برگه را همراه ببرید.",
        suggest: ["هاپتوگلوبین", "رتیکولوسیت", "بیلی‌روبین مستقیم و غیرمستقیم", "اسمیر خون محیطی", "تست کومبس"],
        warnings: [],
      };
    },
  },

  // ═══════════ LDHِ بالای منفرد ═══════════
  //
  // 🔴 چرا این قاعده وجود دارد (P24 در MEDICAL_RULES.md): تا ۲۰۲۶-۰۸-۰۶ بازهٔ
  //    LDH در بالغ [235, 470] بود، پس LDH=۳۰۰ «طبیعی» گرفته می‌شد و «LDHِ بالا»
  //    عملاً کمیاب بود. با اصلاحِ بازه به [100, 250] این حالت شایع شد و هیچ
  //    قاعده‌ای مالکش نبود: پنلِ سالم با LDH=۳۰۰ فقط unmatched_abnormal می‌گرفت،
  //    یعنی «برای این ترکیب توضیح آماده‌ای نداریم» — صادقانه، ولی بی‌فایده.
  //    اصلاحِ بازه یک شکاف را نساخت، فقط آن را از کمیاب به شایع برد.
  //
  // منبع: دورِ پژوهشِ P24 — Merck Manual Professional و ARUP Consult (هر دو آزاد).
  //    چهار نکتهٔ صریحِ منبع که عمداً در متنِ بیمار آمده‌اند:
  //      • LDH نشانگرِ *غیراختصاصیِ* آسیبِ بافتی است. عضله، کبد، قلب، کلیه،
  //        بدخیمی و همولیز همه بالایش می‌برند، پس به‌تنهایی تشخیص نیست.
  //      • مسیرِ بازتابیِ همولیز سه‌تایی است: هاپتوگلوبین + رتیکولوسیت +
  //        بیلی‌روبینِ غیرمستقیم.
  //      • گسترشِ خونِ محیطی *پس از* تأییدِ همولیز می‌آید، نه هم‌زمان با آن.
  //        به همین دلیل در suggest نیست — درخواستش در این مرحله، مرحله‌ای را
  //        جا می‌اندازد که تصمیم می‌گیرد اصلاً لازم هست یا نه.
  //      • هاپتوگلوبینِ طبیعی همولیز را رد نمی‌کند: پروتئینِ فازِ حاد است و در
  //        عفونت/التهاب بالا می‌رود و می‌تواند افتِ ناشی از همولیز را بپوشاند.
  //        این جمله در متن هست چون نبودنش «طبیعی» را به «رد شد» ترجمه می‌کند.
  //
  // ⚠️ هرگز با hemolysis_pattern هم‌زمان فعال نمی‌شود، و شرطش «قاعدهٔ همولیز
  //    فعال نشد» است نه یک کپیِ منطقِ آن — رجوع به hemolysisRuleFires پایین‌تر.
  {
    id: "isolated_ldh_elevation",
    match: (e) => {
      const ldh = e.graded.find((g) => g.test === "LDH");
      // جهت از graded.dir می‌آید، هرگز از مقایسه با یک آستانهٔ شدت — N12.
      if (!(ldh?.abnormal && ldh.dir === "high")) return false;
      return !hemolysisRuleFires(e);
    },
    build: (e) => {
      const t = val(e);
      // وضعیتِ چهارحالته. «نبودن» یک حالتِ مستقل است، نه مترادفِ «طبیعی» — N4.
      const stateOf = (k) => {
        const g = e.graded.find((x) => x.test === k);
        if (!g) return "absent";
        return g.abnormal ? g.dir : "normal";
      };
      const hapto = stateOf("HAPTO");
      const retic = stateOf("RETIC");
      const hgb   = stateOf("HGB");
      const ck    = stateOf("CK");
      const ast   = stateOf("AST");
      const alt   = stateOf("ALT");

      // بیلی‌روبینِ غیرمستقیم: اگر برگه خودش چاپش کرده از همان، وگرنه از تفریقِ
      // تام منهای مستقیم — همان ترتیب و همان آستانهٔ ۱.۰ که hemolysis_pattern
      // به کار می‌برد، تا دو قاعده دربارهٔ یک عدد دو حرف نزنند.
      const printed = t.BILI_I != null;
      const indirect = printed
        ? t.BILI_I
        : (t.BILI_T != null && t.BILI_D != null ? t.BILI_T - t.BILI_D : null);
      const bili = indirect == null ? "absent" : (indirect > 1.0 ? "high" : "normal");

      // کلیدهایی که این قاعده در متن اسم برده است. ⚠️ لازم است، نه تزئینی:
      // تورِ ایمنیِ unexplained_abnormal کلیدی را «پوشش‌داده» می‌شمارد که سورسِ
      // قاعده خوانده باشد (RULE_READS در patterns.js). پس هر کلیدی که اینجا
      // خوانده شود و در متن اسمش نیاید، از آن تور هم می‌افتد — یعنی سکوت،
      // که همان کلاسِ N18 است. حلقهٔ leftover پایین‌تر این را می‌بندد.
      const named = new Set();

      // ── مسیرِ بازتابیِ سه‌تایی ──
      const done = [];   // روی برگه هست، با خواندنش
      const need = [];   // روی برگه نیست، باید درخواست شود

      if (hapto === "absent") need.push("هاپتوگلوبین");
      else {
        named.add("HAPTO");
        done.push(
          hapto === "low"
            // ⚠️ عملاً دست‌نیافتنی است: هاپتوگلوبینِ پایین به‌همراهِ LDHِ بالا
            //    دو نشانگر می‌شود و hemolysis_pattern را فعال می‌کند، پس اینجا
            //    نمی‌رسد. عمداً نوشته شده تا اگر روزی آستانهٔ آن قاعده باریک‌تر
            //    شد، این حالت به سکوت نیفتد — N16 از سمتِ مقابل.
            ? "هاپتوگلوبینِ شما پایین است، که قوی‌ترین نشانه به نفعِ شکسته‌شدنِ گلبولِ قرمز است"
            : hapto === "high"
            ? "هاپتوگلوبینِ شما بالاست، که معمولاً نشانهٔ التهاب است نه همولیز"
            : "هاپتوگلوبینِ شما طبیعی است",
        );
      }

      if (retic === "absent") need.push("شمارش رتیکولوسیت");
      else {
        named.add("RETIC");
        done.push(
          retic === "high"
            ? "رتیکولوسیتِ شما بالاست، یعنی مغزِ استخوان با سرعتِ بیشتری گلبولِ قرمزِ تازه می‌سازد — این با تخریبِ زودرس هم‌خوانی دارد"
            : retic === "low"
            ? "رتیکولوسیتِ شما پایین است، که بیشتر به کم‌کاریِ ساختِ گلبول می‌خورد تا به تخریبِ آن"
            : "رتیکولوسیتِ شما طبیعی است",
        );
      }

      if (bili === "absent") need.push("بیلی‌روبین مستقیم و غیرمستقیم");
      else {
        named.add("BILI_I"); named.add("BILI_T"); named.add("BILI_D");
        // ⚠️ N5: عددِ مشتق‌شده روی برگهٔ بیمار چاپ نشده. نه نقلش می‌کنیم و نه
        //    وانمود می‌کنیم چاپ شده — می‌گوییم از کجا آمده.
        const derived = printed ? "" : " (این مقدار روی برگهٔ شما چاپ نشده و از کسرِ بیلی‌روبینِ مستقیم از تام به دست آمده)";
        done.push(
          bili === "high"
            ? `بیلی‌روبینِ غیرمستقیمِ شما بالاست${derived}`
            : `بیلی‌روبینِ غیرمستقیمِ شما بالا نیست${derived}`,
        );
      }

      // ── سرنخ‌های منبعِ دیگر ──
      //
      // ⚠️ تا ۲۰۲۶-۰۸-۱۰ این بخش فقط شاخهٔ «بالا» داشت. یعنی روی برگه‌ای که
      //    AST=۱۶ و ALT=۲۲ (هر دو طبیعی) کنارِ LDH=۲۹۰ چاپ شده بود، متن
      //    کبد و عضله را جزوِ علت‌های ممکن نام می‌برد و بعد هیچ‌جا نمی‌گفت که
      //    دوتاشان روی همین برگه بررسی و طبیعی بوده‌اند. بیمار «کبد، قلب،
      //    کلیه، بدخیمی» را می‌خواند در حالی که دو ستونِ کنارِ همان عدد،
      //    یکی از آن احتمال‌ها را کم‌رنگ می‌کرد. اطلاعاتِ نگه‌داشته‌شده هم
      //    اطلاعاتِ گم‌شده است.
      const others = [];
      if (ck === "high") {
        named.add("CK");
        others.push("CK (آنزیمِ عضله) هم بالاست، که انگشت را بیشتر به سمتِ عضله می‌گیرد تا خون — ورزشِ سنگینِ اخیر، تزریقِ عضلانی یا آسیبِ عضلانی");
      } else if (ck === "normal") {
        named.add("CK");
        others.push("CK (آنزیمِ عضله) روی همین برگه هست و طبیعی است، پس آسیبِ عضلانیِ قابلِ توجه علتِ محتملی برای این عدد نیست");
      }
      if (ast === "high" || alt === "high") {
        if (ast === "high") named.add("AST");
        if (alt === "high") named.add("ALT");
        others.push(
          ast === "high" && alt === "high"
            ? "AST و ALT هم بالا هستند، پس کبد وارد فهرستِ علت‌های ممکن می‌شود"
            : ast === "high" && alt === "normal"
            ? "AST بالاست در حالی که ALT طبیعی است؛ این ترکیب به عضله یا حتی به همولیزِ خودِ نمونه در لوله هم می‌خورد، نه فقط به کبد"
            : ast === "high"
            ? "AST هم بالاست و ALT روی برگهٔ شما نیست؛ بدونِ ALT نمی‌شود کبد را از عضله جدا کرد"
            : "ALT هم بالاست، پس کبد وارد فهرستِ علت‌های ممکن می‌شود",
        );
      } else if (ast === "normal" && alt === "normal") {
        named.add("AST"); named.add("ALT");
        others.push("AST و ALT (آنزیم‌های کبدی) روی همین برگه هستند و هر دو طبیعی‌اند؛ این کبد را به‌عنوانِ علتِ محتمل کم‌رنگ می‌کند، هرچند به‌تنهایی ردش نمی‌کند");
      } else if ((ast === "normal" && alt === "absent") || (alt === "normal" && ast === "absent")) {
        // ⚠️ شرط عمداً «absent» را صریح می‌خواهد، نه «هرچه بالا نیست». اگر
        //    یکی طبیعی و دیگری *پایین* باشد، جملهٔ زیر می‌گفت «روی برگهٔ شما
        //    نیست» دربارهٔ عددی که چاپ شده — همان ادعای کاذبِ N4، از سمتِ عکس.
        const seen = ast === "normal" ? "AST" : "ALT";
        const gone = ast === "normal" ? "ALT" : "AST";
        named.add(seen);
        others.push(`${seen} (آنزیمِ کبدی) طبیعی است، ولی ${gone} روی برگهٔ شما نیست؛ با یکی از این دو نمی‌شود کبد را کنار گذاشت`);
      }

      // هموگلوبین: سه‌شاخه، چون «اندازه‌گیری نشده» جوابِ سوم است نه سکوت — N4.
      let anemiaLine;
      if (hgb === "low") {
        named.add("HGB");
        anemiaLine = "هموگلوبینِ شما هم پایین است. ترکیبِ کم‌خونی با LDHِ بالا همان جایی است که پرسشِ همولیز از کنجکاوی به بررسیِ لازم تبدیل می‌شود.";
      } else if (hgb === "high") {
        named.add("HGB");
        anemiaLine = "هموگلوبینِ شما بالاتر از حد طبیعی است؛ این خودش جداگانه باید بررسی شود و کم‌خونیِ ناشی از همولیز را در این برگه مطرح نمی‌کند.";
      } else if (hgb === "normal") {
        named.add("HGB");
        anemiaLine = "هموگلوبینِ شما طبیعی است، که از احتمالِ همولیزِ فعال و پرحجم می‌کاهد — ولی آن را رد نمی‌کند.";
      } else {
        anemiaLine = "هموگلوبین روی برگهٔ شما نیست؛ بدونِ آن نمی‌شود گفت این عدد کم‌خونی ساخته یا نه.";
      }

      // ⚠️ هر کلیدِ خوانده‌شده‌ای که غیرطبیعی است و بالا اسمش برده نشد، اینجا
      //    اسم برده می‌شود. بدونِ این، تورِ unexplained_abnormal آن را
      //    «پوشش‌داده» می‌شمارد و بیمار هیچ‌جا خبردار نمی‌شود — N18.
      const leftover = ["HAPTO", "RETIC", "BILI_I", "BILI_T", "BILI_D", "HGB", "CK", "AST", "ALT"]
        .filter((k) => !named.has(k))
        .filter((k) => e.graded.find((x) => x.test === k)?.abnormal)
        .map((k) => faName(k));

      // ⚠️ رشته‌های `need` عیناً همان‌هایی‌اند که به suggest می‌روند و باید با
      //    کلیدهای SUGGEST_TESTS مو‌به‌مو یکی بمانند، وگرنه alreadyMeasured
      //    تطابق نمی‌دهد و آزمایشی که روی برگه هست دوباره «درخواست» می‌شود.
      //    پس برای متن فقط کنارِ هم چیده می‌شوند، نه بازنویسی.
      const missingText =
        need.length === 3
          ? "هیچ‌کدام از این سه روی برگهٔ شما نیست"
          : `${need.join("، ")} روی برگهٔ شما ${need.length > 1 ? "نیستند" : "نیست"}`;
      const ask = need.length > 1 ? "درخواستشان" : "درخواستش";
      const trio = !done.length
        ? `${missingText} و ${ask} قدمِ بعدی است.`
        : need.length
        ? `از این سه، ${done.join("؛ ")}. ${missingText} و ${ask} قدمِ بعدی است.`
        : `هر سه روی برگهٔ شما هست: ${done.join("؛ ")}.`;

      const haptoCaveat =
        hapto === "normal" || hapto === "high"
          ? " توجه: هاپتوگلوبینِ طبیعی یا بالا همولیز را قطعاً رد نمی‌کند — این پروتئین در عفونت و التهاب بالا می‌رود و می‌تواند افتِ ناشی از همولیز را بپوشاند."
          : "";

      const urgent = hgb === "low";

      return {
        pattern: "ldh_high_nonspecific",
        urgency: urgent ? "this_week" : "routine",
        headline: "LDH بالاتر از حد طبیعی است؛ این عدد به‌تنهایی یک بیماری را مشخص نمی‌کند",
        must_say:
          "LDH آنزیمی است که تقریباً در همهٔ سلول‌های بدن وجود دارد و هر بار سلولی آسیب ببیند وارد خون می‌شود. " +
          "برای همین بالا بودنش به‌تنهایی تشخیص نیست: آسیبِ عضلانی، بیماریِ کبد، سکتهٔ قلبی، آسیبِ کلیه، بدخیمی و " +
          "شکسته‌شدنِ گلبول‌های قرمز (همولیز) همه می‌توانند آن را بالا ببرند. کارِ درست این است که منبعش مشخص شود، " +
          "نه اینکه از روی همین یک عدد نتیجه‌گیری شود. " +
          anemiaLine +
          " برای پاسخ به مهم‌ترین پرسش — اینکه آیا گلبول‌های قرمز در حال شکسته‌شدن‌اند یا نه — سه آزمایش با هم خوانده می‌شوند: " +
          "هاپتوگلوبین، شمارشِ رتیکولوسیت، و بیلی‌روبینِ غیرمستقیم. " +
          trio +
          haptoCaveat +
          (others.length ? ` ${others.join(". ")}.` : "") +
          (leftover.length ? ` ${leftover.join(" و ")} هم خارج از محدودهٔ مرجع است و در این توضیح دربارهٔ آن نتیجه‌گیری نشده.` : "") +
          " گسترشِ خونِ محیطی (اسمیر) مرحلهٔ بعدی است، پس از آنکه این سه آزمایش همولیز را تأیید کردند — نه هم‌زمان با آن‌ها.",
        action: urgent
          ? "این هفته با پزشک وقت بگیرید و این برگه را همراه ببرید."
          : "این نتیجه را با پزشک خود در میان بگذارید تا آزمایش‌های بالا درخواست شود.",
        suggest: need.length ? need : [],
        warnings: [
          "LDHِ بالا به‌تنهایی نه تشخیص است و نه لزوماً نشانهٔ بیماریِ جدی. تا وقتی منبعش مشخص نشده، از روی آن دربارهٔ خودتان نتیجه‌گیری نکنید.",
        ],
      };
    },
  }];

/**
 * آیا قاعدهٔ همولیز روی همین پنل فعال می‌شود؟
 *
 * ⚠️ عمداً از خودِ قاعده پرسیده می‌شود و منطقش کپی نمی‌شود. کپی می‌کرد، اولین
 *    تغییرِ آستانه در hemolysis_pattern این دو را واگرا می‌کرد و بیمار دو متنِ
 *    متناقض دربارهٔ یک عدد می‌خواند — یا هیچ‌کدام فعال نمی‌شد و LDH دوباره به
 *    سکوت می‌افتاد. تابع در زمانِ فراخوانی اجرا می‌شود، پس ارجاع به آرایه‌ای که
 *    پایین‌تر از تعریفِ خودش کامل شده مشکلی ندارد.
 */
function hemolysisRuleFires(e) {
  const r = RULES_HEMATOLOGY.find((x) => x.id === "hemolysis_pattern");
  return r ? r.match(e) : false;
}
