import { serologyReactive, qualPositive, qualValue, titreFa, hasInflammation, whoFerritinThreshold, whoInflamIronDeficiency, urinePositive, urineCellCount, urineGrade, isNephrotic, isGlomerulonephritis, isDIC, val, rankOf, has } from "./patterns_utils.js";
import { faName } from "./names.js";
import { preanalyticalCaveats, attachPreanalytical } from "./preanalytical.js";
import { repeatDeltaFa } from "./biovar.js";

export const RULES_HEMATOLOGY = [
{ preanalyticalCaveats, attachPreanalytical },
{ repeatDeltaFa },
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
{
    id: "d_dimer_elevated",
    match: (e) => {
      const d = e.graded.find((g) => g.test === "DDIMER");
      if (!(d?.abnormal && d.dir === "high")) return false;
      return !isDIC(e);   // اگر DIC فعال است، آن الگوی اورژانسی پوشش می‌دهد
    },
    build: (e) => {
      const d = e.graded.find((g) => g.test === "DDIMER");
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
          "بنابراین D-dimer بالا به‌تنهایی به معنای وجود لختهٔ خطرناک نیست و باید در کنار علائم شما و نظر پزشک تفسیر شود. ارزش اصلی این تست وقتی است که نتیجه‌اش طبیعی باشد و لخته را کنار بگذارد.",
        // نسخهٔ کوتاه برای وقتی زیر یک اورژانسِ مهم‌تر نمایش داده می‌شود.
        brief:
          `شاخص D-dimer شما هم بالاتر از حد طبیعی است (${d.value}، حد طبیعی ${d.range}). ` +
          "این یک شاخص غیراختصاصی است و باید در کنار موارد فوریِ بالا توسط پزشک بررسی شود.",
        action: "این هفته با پزشک مطرح کنید تا در کنار شرح‌حال شما بررسی شود.",
        suggest: ["بررسی توسط پزشک برای تفسیر در کنار علائم بالینی"],
        warnings: [
          "اگر همین حالا نشانه‌های احتمالِ لخته دارید — تورم، درد یا قرمزیِ یک‌طرفهٔ ساق پا، یا تنگی نفس ناگهانی، درد قفسهٔ سینه و سرفهٔ خونی — منتظر نمانید و فوراً به اورژانس مراجعه کنید.",
        ],
      };
    },
  },
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
    id: "spherocytosis_likely",
    match: (e) => {
      const t = val(e);
      const mch = e.graded.find((g) => g.test === "MCH");
      const hgb = e.graded.find((g) => g.test === "HGB");
      const rbc = e.graded.find((g) => g.test === "RBC");
      const rdw = e.graded.find((g) => g.test.startsWith("RDW"));

      const mchcHigh = t.MCHC != null && t.MCHC > 36;
      const mcvNormalOrLow = t.MCV != null && t.MCV <= 100;
      const mchNormal = mch && (!mch.abnormal || mch.tag === 'normal' || mch.tag === 'normochromic' || mch.dir == null);
      const hgbLow = hgb && hgb.abnormal && hgb.dir === 'low';
      const rbcNotHigh = !rbc || !rbc.abnormal || rbc.dir === 'low';
      const rdwHigh = rdw && rdw.abnormal && rdw.dir === 'high';

      return mchcHigh && mcvNormalOrLow && mchNormal && hgbLow && rbcNotHigh && rdwHigh;
    },
    build: (e) => {
      const mchc = e.graded.find((g) => g.test === "MCHC");
      return {
        pattern: "spherocytosis_likely",
        urgency: "this_week",
        headline: "Increased Intracellular Hemoglobin Concentration",
        must_say: `The concentration of hemoglobin in red blood cells (MCHC) is higher than normal, with a value of ${mchc.value}. When accompanied by elevated RDW, mild anemia, and normal or small red blood cells, it strongly suggests a need to check for abnormal red blood cell shapes (such as spherocytosis). A peripheral blood smear is highly recommended.`,
        action: "Schedule an appointment with your doctor in the coming weeks to examine a peripheral blood smear.",
        suggest: ["Peripheral Blood Smear", "Bilirubin", "Repeat CBC"],
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
  }
];
