// ============================================================
// LabMate — پرامپت موتور-محور
//
// تفاوت با پرامپت قبلی:
//   قبل: مدل خودش تحلیل می‌کرد → gpt-4o-mini نمی‌فهمید،
//        gpt-4o می‌فهمید ولی ۳۵ برابر گران بود و باز هم
//        «رژیم غنی از آهن» برای کم‌خونی ماکروسیتیک می‌گفت.
//
//   حالا: موتور تصمیم می‌گیرد، مدل فقط فارسی می‌نویسد.
//         → gpt-4o-mini کافی است.
// ============================================================

import { alreadyMeasured, SUGGEST_TESTS } from "./patterns.js";
import { normalizeFa } from "./coverage.js";
import { TEST_MEDLINE_MAP, formatMedlineContext } from "./medline.js";
import { levelGrade } from "./patterns_utils.js";
import { faName } from "./names.js";
import { SPECIMEN_FA, FLUID_TYPE_FA } from "./specimen.js";
import { activeConditionIds, conditionFa } from "./conditions.js";

const activeFa = (input) => activeConditionIds(input).map(conditionFa);
import { isNeonate, neonatalVoice } from "./neonatal.js";

// ⚠️ سقفِ «حداکثر N جمله» در interpretation با قاعدهٔ ۱ («must_say را کامل
//    منتقل کن») در تضاد است و باید از بلندترین must_say بزرگ‌تر بماند.
//    با سقفِ ۵، یافته‌های غنی‌شده (رابدومیولیز ≈ ۱۰ جمله) مدل را بین دو
//    شکستِ بد گیر می‌انداخت: یا دُمِ متن را می‌انداخت — که همان‌جا نکتهٔ
//    میوگلوبین/نوارِ ادرار و دستورِ تکرارِ CK از دست می‌رفت — یا خلاصه
//    می‌کرد، و آن‌وقت تطبیقِ زیررشته‌ایِ تورِ ایمنی (server.js) شکست
//    می‌خورد و کلِ بلوکِ must_say دوباره append می‌شد؛ بیمار توضیح را
//    دو بار می‌دید. سقف روی ۱۰ است؛ اگر یافته‌ای از این بلندتر شد،
//    یا کوتاهش کن یا این عدد را با هم بالا ببر.
export const ENGINE_SYSTEM_PROMPT = `
تو دستیار «آزمایار» هستی و برای بیماری می‌نویسی که هیچ سواد پزشکی ندارد.

## نقش تو
تحلیل بالینی قبلاً توسط موتور قواعد انجام شده و نتیجه‌اش به تو داده می‌شود.
تو تشخیص نمی‌دهی، الگو پیدا نمی‌کنی، و تست پیشنهاد نمی‌دهی.
کار تو فقط این است: محتوای آماده را به فارسیِ روان و گرم بازنویسی کنی.

## قواعد قطعی
۰. اگر findings چند مورد دارد، **همه** را بنویس. هیچ‌کدام را ادغام یا حذف نکن.
   بیمار ممکن است همزمان چند مشکل فوری داشته باشد — پنهان کردن یکی خطرناک است.
۰.۵. جمله‌ها را تکرار نکن. هر مطلب فقط یک بار.
۰.۷. اگر must_sayِ یک یافته با «یافتهٔ تکمیلی» شروع می‌شود، همان عبارتِ آغازین («یافتهٔ تکمیلی … (جدا از دستور اورژانسی):»)
   را عیناً، با شمارهٔ خودش، سرِ همان جمله نگه دار و بقیهٔ جمله را پشتِ آن بنویس. این یافته‌ها را با یافته‌های اصلی
   قاطی نکن؛ بعد از یافته‌های اصلی و به همان ترتیبی که آمده‌اند بیاور.
۱. فیلد must_say را کامل منتقل کن — این تشخیص موتور است. اگر داخلش عدد یا فهرستی آمده
   (مثل eGFR، میانگین قند، درصد، مقدار یک تست، یا فهرستِ چند تست با عددشان)، همه را حتماً در تفسیر بیاور؛ حذف یا خلاصه‌اش نکن.
۲. هیچ آزمایشی را که در must_say نیامده نام نبر و پیشنهاد نده.
۳. تست‌های داخل forbid را هرگز نام نبر — از نظر بالینی برای این الگو غلط‌اند.
۴. urgency را عوض نکن.
۵. هیچ عددی را تغییر نده یا از خودت نساز.
۶. ننویس بیمار کِی یا کجا مراجعه کند (امروز، این هفته، اورژانس، مطب) و هشدار اضافه نکن. دستورِ مراجعه و هشدارها
   جداگانه و عیناً از موتور به بیمار نشان داده می‌شوند؛ اگر تو هم بنویسی، دو دستورِ متفاوت کنارِ هم می‌نشینند.
   فقط اگر خودِ must_say چنین جمله‌ای دارد، همان را منتقل کن.

## زبان
- جمله‌ها ساده باشند. ولی کوتاه‌کردنِ جمله هرگز دلیلِ حذفِ بخشی از must_say نیست.
- «شما ... دارید» ننویس. بنویس «این معمولاً یعنی ...»
- «نگران نباشید» ننویس.
- هر عدد را با محدوده طبیعی‌اش بیاور.
- اصطلاح تخصصی فقط وقتی که در must_say آمده — همان‌جا با یک جمله توضیحش بده.

## خروجی — فقط JSON معتبر، بدون بک‌تیک، بدون متن اضافه

⚠️ نام فیلدها باید دقیقاً همین باشد، وگرنه در برنامه نمایش داده نمی‌شود.

{
  "summary": "یک تا دو جمله. کل وضعیت.",
  "interpretation": "متن اصلی. همهٔ must_sayها را کامل در آن بگنجان.",
  "disclaimer": "یادآوری کوتاه که این تفسیر جای پزشک را نمی‌گیرد."
}

فهرستِ توصیه‌ها را ننویس — از موتور ساخته می‌شود.
`.trim();

// بیمارِ نوزادِ < ۲۸ روز: خواننده والدِ نوزاد است (تصمیمِ کاربر ۲۰۲۶-۱۰-۰۱). این بند فقط *لحن* را عوض می‌کند.
export const NEONATAL_PROMPT_ADDENDUM = `
## بیمارِ این برگه نوزادِ کمتر از ۲۸ روز است
خواننده والدِ نوزاد است و دربارهٔ «نوزاد» می‌خواند. بنویس «نوزاد» یا «نوزادتان»، نه «شما»؛ «قند شما» نه، «قندِ نوزاد».
چیزی که فقط به بزرگسال می‌خورد (دارو، ورزش، الکل، رژیم، رانندگی) ننویس. باقیِ قواعدِ بالا همان است.
`.trim();

// بیمارِ بستری (بخش، ICU یا اورژانسِ بیمارستان؛ ۲۰۲۶-۱۰-۰۸). فقط *لحن*: فوریتِ یافته‌ها همان است.
export const INPATIENT_PROMPT_ADDENDUM = `
## بیمارِ این برگه همین حالا در بیمارستان بستری است
هیچ جمله‌ای دربارهٔ رفتن به اورژانس، مطب یا گرفتنِ نوبت ننویس؛ بیمار همین‌جاست. دستورِ عمل را موتور می‌سازد (اطلاع به پزشک/پرستارِ بخش) و تو آن را ننویس. باقیِ قواعدِ بالا همان است.
`.trim();

export const URGENCY_FA = {
  emergency: "فوری — همین امروز",
  soon: "ظرفِ ۲۴ تا ۴۸ ساعت",
  this_week: "این هفته",
  routine: "نوبت عادی",
  none: "موردی نیست",
};

// شدتِ CTCAE را به واژهٔ فارسیِ روبه‌بیمار تبدیل می‌کنیم.
// ⚠️ قبلاً «CTCAE Grade 2» خام به LLM می‌رفت و مدل همان کد تخصصی را به بیمار نشان می‌داد.
const SEVERITY_FA = { 1: "خفیف", 2: "متوسط", 3: "شدید", 4: "بحرانی" };

/**
 * ساخت پیام کاربر از خروجی موتور
 */
export function buildEnginePrompt(engineOut, patterns, medlineContext = "", patientContext = null) {
  // ⚠️ test را با نام فارسی می‌فرستیم، نه کلید خام. اگر finding هیچ suggestِ
  //    فارسی نداشته باشد (unmatched_abnormal)، مدل از همین‌جا نام می‌سازد؛
  //    کلید خام مثل HGB/BILI_T هرگز نباید به بیمار برسد.
  const abnormal = engineOut.graded
    .filter((g) => g.abnormal)
    .map((g) => ({
      test: faName(g.test),
      value: g.value,
      normal_range: g.range,
      label: g.fa,
      ...(levelGrade(g) ? { severity: SEVERITY_FA[levelGrade(g)] ?? null } : {}),
      ...(g.mode === "classifier" ? { category: g.tag } : {}),
    }));

  const borderline = engineOut.graded
    .filter((g) => !g.abnormal && g.nearLimit)
    .map((g) => ({ test: faName(g.test), value: g.value, normal_range: g.range, label: g.fa }));

  const payload = {
    instruction: "این تحلیل قطعی است. فقط بازنویسی کن — تحلیل نکن.",
    patient: {
      age: engineOut.age,
      sex: engineOut.sex === "M" ? "مرد" : engineOut.sex === "F" ? "زن" : null,
      // زمینهٔ بیمار فقط برای لحن است — یافته‌ها و فوریت را عوض نمی‌کند.
      // (مثلاً می‌توانی بگویی «چون باردار هستید حتماً با پزشک مطرح کنید».)
      ...(patientContext?.pregnant ? { باردار: true } : {}),
      // ⚠️ specs/011 (P66, FR-019): فقط بیماری‌هایی که موتور واقعاً لحاظشان کرد. «فشار خون» در اینجا یعنی
      //    مدل می‌تواند دربارهٔ چیزی بنویسد که هیچ قاعده‌ای نسنجیده — همان ادعای «لحاظ شد» که ممنوع است.
      ...(activeFa(patientContext?.conditions).length ? { بیماری_زمینه‌ای: activeFa(patientContext.conditions) } : {}),
    },
    overall_urgency: patterns.overall_urgency,
    overall_urgency_fa: URGENCY_FA[patterns.overall_urgency],
    // ⚠️ فیلدها اینجا با نام برشمرده می‌شوند و این عمدی است — نه از سرِ
    //    سلیقه. هر فیلدی که به finding اضافه شود، تا وقتی اسمش اینجا نیاید
    //    به مدل نمی‌رسد. `protected` دقیقاً از همین خاصیت استفاده می‌کند:
    //    نامِ دارو، دوز و راهِ مصرف هرگز وارد payload نمی‌شوند، پس مدل
    //    نمی‌تواند بازنویسی‌شان کند. (rules/protected.js)
    // ⚠️ action، warnings و suggest عمداً به مدل نمی‌روند. فهرستِ توصیه‌ها را
    //    buildEngineRecommendations مستقیم می‌سازد و server.js آن را جای فهرستِ مدل
    //    می‌گذارد. دلیلش اندازه‌گیری شد (۲۰۲۶-۰۹-۲۳، برگهٔ پان‌سیتوپنی، M188): مدل ۴
    //    مورد از ۱۴ را انداخت، از جمله «بدون اتلاف وقت فوراً به اورژانس». این‌ها دقیقاً
    //    همان فیلدهایی بودند که هیچ توری بررسی نمی‌کرد. چیزی که مدل نبیند، نمی‌تواند بیندازد.
    findings: patterns.findings.map((f) => ({
      headline: f.headline,
      must_say: f.must_say,
      urgency: f.urgency,
      forbid: f.forbid ?? [],
      // مدل باید بداند بلوکی هست که ننوشته است، وگرنه ممکن است خودش
      // دستورِ دارویی بسازد تا جای خالی را پر کند.
      ...(f.protected?.length ? { has_protected_block: true } : {}),
    })),
    abnormal_tests: abnormal,
    borderline_tests: borderline,
    qualitative: engineOut.qual,
    indices: engineOut.indices,
    ...(engineOut.diffFailed
      ? { diff_note: "دستگاه شمارش افتراقی را نتوانست انجام دهد — مقادیر دیف حذف شدند" }
      : {}),
  };

  // فشرده، بدون تودرتوییِ چشمی: مدل به فاصله‌گذاری نیازی ندارد و ~۱۳٪ توکن کمتر.
  let text = JSON.stringify(payload);
  if (medlineContext) {
    text += `\n\n<medline_context>\n${medlineContext}\n</medline_context>\n` +
            `(زمینه‌ی آموزشی — فقط برای زبان ساده‌تر. تحلیل از موتور می‌آید نه از اینجا.)`;
  }
  return { role: "user", content: text };
}

/**
 * توصیه‌های قطعی از یافته‌های موتور — منبع واحد برای هم «تور ایمنی» و هم مسیر جایگزین.
 * ترتیب: action، سپس تست‌های suggest، سپس warnings. تست‌های forbid حذف می‌شوند.
 */
// ---------- تمیزکاریِ فهرست توصیه‌ها ----------
// ⚠️ باگ واقعی: تنها فیلترِ تکراری‌ها `new Set` بود، یعنی فقط رشته‌های *دقیقاً*
//    یکسان حذف می‌شدند. یک پنلِ معمولی (کم‌خونی + چربی + قند + ALP) ۱۹ توصیه
//    می‌داد که سه‌تایش «نوبت عادی…»، دوتایش «این هفته…»، و «آهن سرم» و «TIBC»
//    کنارِ «پنل کامل آهن» بود که خودش هر دو را در بر می‌گیرد.

/** نرمال‌سازی برای مقایسه: نیم‌فاصله، ی/ک عربی، نشانه‌گذاری، فاصلهٔ اضافه */
function normRec(s) {
  return String(s)
    .replace(/‌/g, "")
    .replace(/[ىي]/g, "ی").replace(/ك/g, "ک")
    .replace(/[.،؛!؟]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * دو توصیه وقتی «هم‌پوشان»‌اند که یکی ادامهٔ دیگری باشد:
 *   «نوبت عادی با پزشک» ⊂ «نوبت عادی با پزشک تغذیه و تحرک را جدی بگیرید»
 * در این حالت کاملـ‌تر می‌ماند و کوتاه‌تر حذف می‌شود.
 */
function dropSubsumedText(list) {
  const kept = [];
  for (const item of list) {
    const n = normRec(item);
    const supersededBy = list.find((o) => {
      const m = normRec(o);
      return m !== n && m.startsWith(n);
    });
    if (!supersededBy) kept.push(item);
  }
  return kept;
}

/**
 * پیشنهادِ آزمایشی که مجموعهٔ تست‌هایش زیرمجموعهٔ پیشنهادِ دیگری است حذف شود:
 *   «پنل کامل آهن» = {FERRITIN, IRON, TIBC} ⊃ «آهن سرم» = {IRON}
 * داده‌محور است، نه فهرستِ دستی — از همان SUGGEST_TESTS خوانده می‌شود.
 */
export function dropSubsumedTests(suggestions) {
  return suggestions.filter((s) => {
    const mine = SUGGEST_TESTS[s];
    if (!mine?.length) return true;
    return !suggestions.some((o) => {
      if (o === s) return false;
      const theirs = SUGGEST_TESTS[o];
      return theirs?.length > mine.length && mine.every((k) => theirs.includes(k));
    });
  });
}

/**
 * قالبِ «درخواست آزمایش X از پزشک» فقط برای چیزی که واقعاً نامِ آزمایش است.
 * ⚠️ باگ واقعی: روی هر رشته‌ای اعمال می‌شد و فارسیِ شکسته می‌ساخت —
 *    «درخواست آزمایش مشاوره با پزشک دربارهٔ خطر قلبی‌عروقی از پزشک».
 */
export function phraseSuggestion(s) {
  const text = String(s).trim();
  // اگر خودش پزشک را نام برده، یک دستورِ کامل است نه نامِ آزمایش
  if (/پزشک|مراجعه|مشاوره/.test(text)) return text;
  // «تکرار X» خودش فعل دارد — «درخواست آزمایش تکرار آزمایش ادرار» فارسیِ شکسته بود (N8، M170)
  // job fff90f58: «آزمایش انعقادی» → «درخواست آزمایش آزمایش انعقادی از پزشک» (N8) — همان راهِ «تکرار».
  // ممیزیِ لایهٔ ۱ (P72، M306): تصویربرداری، معاینه و ارجاع آزمایش نیستند — «درخواست آزمایش سونوگرافی شکم»،
  //   «درخواست آزمایش معاینهٔ ته‌چشم»، «درخواست آزمایش بررسی توسط متخصص غدد» همان N8 بودند.
  const NON_LAB = /^(سونوگرافی|معاینه|بررسی\s|ارجاع|نوار\s?قلب|اکوکاردیوگرافی|اکو\s|عکس|رادیوگرافی|سی‌تی|ام‌آر‌آی|MRI|CT\s|آندوسکوپی|کولونوسکوپی|ماموگرافی|تراکم\s?استخوان|مشاوره|فیبرواسکن|فشار\s?خون|پایش|پیگیری|گسترش\s?خون)/;
  const verb = /^(تکرارِ?|آزمایشِ?)\s/.test(text) || NON_LAB.test(text) ? "درخواست" : "درخواست آزمایش";
  // «GGT — برای مشخص شدن منبع ALP» → «درخواست آزمایش GGT از پزشک — برای …»
  const dash = text.match(/^(.+?)\s+[—–-]\s+(.+)$/);
  if (dash) return `${verb} ${dash[1].trim()} از پزشک — ${dash[2].trim()}`;
  return `${verb} ${text} از پزشک`;
}

/**
 * توصیه‌هایی که با یک جملهٔ اولِ مشترک شروع می‌شوند یکی می‌شوند.
 *
 * «کی به پزشک مراجعه کنم» یک تصمیم است، نه N تصمیم — ولی هر finding نسخهٔ
 * خودش را می‌سازد، پس بیمار سه بار «نوبت عادی…» و دو بار «این هفته…» می‌دید.
 * اینجا جملهٔ اول یک‌بار می‌آید و ادامه‌های *متفاوت* پشتش سوار می‌شوند، تا
 * ادغام باعث گم‌شدنِ جزئیاتِ بالینی نشود.
 */
function mergeByLeadSentence(list) {
  const sentences = (s) => String(s).split(/(?<=[.؟!؛])\s+/).map((x) => x.trim()).filter(Boolean);
  const groups = [];
  for (const item of list) {
    const parts = sentences(item);
    const lead = normRec(parts[0] ?? item);
    // گروهی که جملهٔ اولش پیشوندِ این است (یا برعکس) — «نوبت عادی» و «نوبت عادی با پزشک»
    const g = groups.find((x) => x.lead.startsWith(lead) || lead.startsWith(x.lead));
    if (g) {
      if (lead.length > g.lead.length) { g.lead = lead; g.head = parts[0]; }
      g.tails.push(...parts.slice(1));
    } else {
      groups.push({ lead, head: parts[0] ?? item, tails: parts.slice(1) });
    }
  }
  return groups.map((g) => {
    const seen = new Set([normRec(g.head)]);
    const tails = g.tails.filter((t) => {
      const n = normRec(t);
      if (seen.has(n)) return false;
      seen.add(n);
      return true;
    });
    return [g.head, ...tails].join(" ");
  });
}

/** فهرستِ نهایی: حذفِ دقیق، حذفِ هم‌پوشان، ادغامِ هم‌سرآغاز، و حفظِ ترتیب. */
export function tidyRecommendations(list) {
  const exact = [...new Set((list ?? []).map((r) => String(r).trim()).filter(Boolean))];
  return oneCbcRepeat(mergeByLeadSentence(dropSubsumedText(exact)));
}

// ═══ بند ۵ (LIS ۲۰۲۶-۱۰-۰۶، تصمیمِ «الف»): یک جملهٔ «تکرارِ CBC»، دقیق‌ترینش ═══
// [222] سه خط پشتِ هم داشت («درخواست تکرار CBC از پزشک»، «تکرارِ CBC چند هفته بعد…»، «تکرارِ CBC روندِ آن…») و [3] دو زمان‌بندیِ
//   متضاد («روی نمونهٔ تازه» کنارِ درخواستِ عمومی — N20). در سطحِ *جمله*، نه مورد: جملهٔ CBC از دلِ یک action حذف می‌شود و بقیهٔ
//   همان action می‌ماند. ترتیب: نمونهٔ تازه (خطای فنی، زودتر) > فاصلهٔ زمانیِ صریح > هر جملهٔ دیگر > درخواستِ عمومیِ suggest. گارد L21.
const CBC_REPEAT = /تکرارِ?\s*(آزمایشِ?\s*)?CBC|CBC[^.؛]{0,50}تکرار/;
const cbcRank = (s) => /نمونهٔ?\s*تازه/.test(s) ? 0 : /هفته|روز|ماه/.test(s) ? 1 : /^درخواست\s+تکرار\s+CBC\s+از\s+پزشک$/.test(s) ? 3 : 2;
function oneCbcRepeat(list) {
  const split = list.map((r) => actionSentences(r));
  const hits = [];
  split.forEach((ss, i) => ss.forEach((s, j) => { if (CBC_REPEAT.test(s)) hits.push({ i, j, r: cbcRank(s) }); }));
  if (hits.length < 2) return list;
  const keep = hits.reduce((a, b) => (b.r < a.r ? b : a));
  const drop = new Set(hits.filter((h) => h !== keep).map((h) => `${h.i}:${h.j}`));
  // موردی که جمله‌ای از آن حذف نشد بایت‌به‌بایت همان می‌ماند.
  return list.map((r, i) => (split[i].some((_, j) => drop.has(`${i}:${j}`))
    ? split[i].filter((_, j) => !drop.has(`${i}:${j}`)).join(" ") : r)).filter(Boolean);
}

// ---------- یک دستورِ مراجعهٔ نهایی ----------
// 🔴 برگهٔ واقعی (۲۰۲۶-۰۹-۲۳، پان‌سیتوپنی، M188): شش یافتهٔ اورژانسی، هر کدام با action خودش،
//    یعنی پنج زمان‌بندیِ رقیب برای یک بیمار: از «همین امروز با پزشک تماس» تا «بدون اتلاف وقت
//    فوراً به اورژانس». blocks_others فقط یافته‌های *کم‌فوریت‌تر* را کنار می‌زند، پس رقیب‌های
//    هم‌سطح کنارِ هم می‌ماندند، و مدل ملایم‌ترین را نگه داشت (N20 بینِ یافته‌ها).
//    حالا یک action کامل می‌آید: قوی‌ترین action در بالاترین فوریت. از بقیه فقط جمله‌های
//    *زمان‌بندیِ بی‌شرط* حذف می‌شوند. محتوا («این برگه را همراه ببرید») و جمله‌های
//    شرطی («اگر تب دارید…») می‌مانند، چون این‌ها با دستورِ نهایی رقابت نمی‌کنند.
const ACTION_SENT = /(?<=[.؟!؛])\s+/;
// ⚠️ فقط جمله‌ای که *با* شرط شروع می‌شود شرطی است. «نوبت عادی، مگر علامت خاصی…» و «این هفته
//    مطرح کنید و اگر…» زمان‌بندی‌اند؛ «اگر»ِ وسطشان آن‌ها را شرطی نمی‌کند.
const CONDITIONAL = /^(اگر|مگر|چنانچه|در صورتِ?|علائم هشدار|با هر (یک|کدام))[\s:،]/;
const TIMING = /اورژانس|امروز|هفته|چند روز|نوبت|اسرع وقت|اولین فرصت|زودتر|همین حالا|فوراً|فورا|سریعاً|بدون اتلاف|بدون تأخیر|بدون هیچ‌گونه تأخیر|معطل|(مراجعهٔ?|ویزیتِ?)\s*بعدی/;
const DIRECTIVE = /در میان بگذارید|مطرح کنید|مراجعه کنید|وقت بگیرید|تماس بگیرید|مشورت کنید|پیگیری کنید|نشان دهید/;
// دستورِ مراجعهٔ *بی‌محتوا* بدونِ واژهٔ زمان: «با پزشک مطرح کنید.»، «نتیجه را با پزشک خود در میان
// بگذارید تا علت بررسی شود.». عمداً تنگ است: «مصرف مکمل ویتامین D را با پزشک در میان بگذارید» محتواست.
const GENERIC_DIRECTIVE = new RegExp(
  `^(این\\s+)?((نتیجه|نتایج|مقادیر)\\s+(را\\s+)?)?(با|به)\\s+پزشک(\\s+خود)?\\s+(${DIRECTIVE.source})(\\s+تا\\s+[^.]*)?\\.?$`,
);
// زمان‌بندی‌ای که با خودش محتوا می‌آورد و نباید با آن برود:
const REQUEST = /بخواهید|تکرار شود/;                                       // «…بخواهید CBC روی نمونهٔ تازه تکرار شود»
const SPECIALIST = /متخصص|هماتولوژیست|نفرولوژیست|اورولوژ|ناباروری|ماما|انکولوژ/;  // مقصدِ ارجاع
// 🔴 بازبینیِ دور ۲ (کد #2): «هفته» در «چند هفته بعد تکرار می‌شود» فاصلهٔ تکرارِ آزمایش است، نه زمانِ مراجعه.
const INTERVAL = /(پس از|بعد از)\s+(یک|دو|سه|چند|\d+)\s+هفته|(یک|دو|سه|چند|\d+)\s+هفته\s+(بعد|دیگر)/g;
const maskInterval = (s) => s.replace(INTERVAL, " ");
// محتوایی که با زمان‌بندیِ جمله نمی‌رود: تکرارِ آزمایش، درمان، دارو، لام. «ارجاع» عمداً نیست (SPECIALIST، زیرِ اورژانس نه).
const CONTENT = /تکرار|بخواهید|دارو|درمان|استاتین|رژیم|سرم وریدی|لام خون|آزمایش‌های بالا/;
// سرِ زمان‌بندیِ جمله‌ای که محتوایش می‌ماند: «این هفته با پزشک … تا X» ⇒ «با پزشک … تا X».
const TIMELINE_HEAD = /^(این هفته|همین امروز|همین چند روز|در همین هفته‌های پیشِ رو|در هفته جاری|(در\s+)?نوبتِ?\s*عادیِ?(\s+بعدی)?|در ویزیتِ? بعدی|در فرصت مناسب و در ویزیت بعدی|هرچه زودتر(\s*\([^)]*\))?)\s+(حتماً\s+)?/;
// 🔴 کد #3: دلگرمیِ بی‌مرجع — «نگرانیِ فوری ندارد» جدا از یافته‌اش دربارهٔ کلِ برگه خوانده می‌شود.
const REASSURE = /(نگرانیِ?|اقدامِ?)\s+(فوری|جداگانه‌ای)|مراجعهٔ?\s+زودهنگام|زمان‌بندیِ?\s+یافته/;
// نتیجهٔ شرطیِ «فقط زمان‌بندی»: «…، زودتر مراجعه کنید.»، «…، فوری‌تر.»، «…، به‌جای آن همین حالا به اورژانس بروید.»
const PURE_TIMELINE_CONSEQUENT = /^\s*(به‌جای آن\s+)?(?:(?!\sو\s)[^،.])*?(مراجعه کنید|بروید|فوری‌تر|زودتر|همین امروز|همین حالا)\.?\s*$/;
const actionSentences = (s) => String(s).split(ACTION_SENT).map((x) => x.trim()).filter(Boolean);
const isTimelineSentence = (s) => !CONDITIONAL.test(s) && (TIMING.test(maskInterval(s)) || GENERIC_DIRECTIVE.test(s));
// «این هفته با پزشک مطرح کنید و فهرستِ داروها را همراه ببرید»: زمان‌بندی می‌رود، دنباله‌اش
// محتواست و می‌ماند. فقط بعد از «و» یا «—». «تا …» بدونِ فعلش معنا ندارد، پس نگه داشته نمی‌شود.
const DIRECTIVE_TAIL = new RegExp(`(?:${DIRECTIVE.source})\\s*(?:و|—)\\s+(.+)$`);
// «نوبت عادی با پزشک و تکرار آزمایش کلیه پس از چند هفته.» — سرِ بی‌فعل؛ دنباله‌اش بعد از «با پزشک و».
const VISIT_AND_TAIL = /^[^.]*?با پزشک\s+و\s+(.+)$/;
function contentTail(s) {
  const tail = (s.match(DIRECTIVE_TAIL) ?? s.match(VISIT_AND_TAIL))?.[1]?.trim();
  return tail && !isTimelineSentence(tail) ? tail : null;
}
/** شرطیِ «اگر X، زودتر/فوراً مراجعه کنید» وقتی دستورِ نهایی همان‌قدر یا فوری‌تر است چیزی اضافه نمی‌کند (کد #4). */
function redundantConditional(s, finalStrength) {
  // «اگر خواستید، …» فقط ادامهٔ «اقدامِ جداگانه‌ای نمی‌خواهد» بود (REASSURE)؛ تنها، بی‌مرجع است.
  if (/^اگر خواستید[،\s]/.test(s)) return true;
  if (finalStrength < 3) return false;
  const cons = s.slice(s.lastIndexOf("،") + 1);   // نتیجه بعد از آخرین «،» (شرط خودش فهرستِ «،»دار است)
  return PURE_TIMELINE_CONSEQUENT.test(cons) && sentenceStrength(s) <= finalStrength;
}
/** از actionِ یافته‌ای که دستورِ نهایی نیست، چه چیزی می‌ماند. */
function nonFinalRemainder(action, finalStrength) {
  const finalIsEr = finalStrength >= 4;
  return actionSentences(action)
    .map((s) => {
      if (REASSURE.test(s)) return null;
      if (CONDITIONAL.test(s)) return redundantConditional(s, finalStrength) ? null : s;
      if (!isTimelineSentence(s)) return s;
      const tail = contentTail(s);
      if (tail) return tail;
      if (CONTENT.test(s) || REQUEST.test(s) || (!finalIsEr && SPECIALIST.test(s))) return s.replace(TIMELINE_HEAD, "");
      return null;
    })
    .filter(Boolean);
}

/** شدتِ دستورِ بی‌شرطِ یک action: ۵ اورژانسِ فوری … ۰ نوبت عادی. جمله‌های شرطی شمرده نمی‌شوند. */
function sentenceStrength(s) {
  const er = /اورژانس/.test(s);
  const now = /همین حالا|فوراً|فورا|بدون اتلاف|بدون (هیچ‌گونه )?تأخیر|منتظر[^.]*نمانید|سریعاً|معطل نکنید/.test(s);
  return er && now ? 5 : er ? 4 : now || /امروز/.test(s) ? 3 : /چند روز|اسرع وقت|اولین فرصت|زودتر/.test(s) ? 2 : /هفته/.test(maskInterval(s)) ? 1 : 0;
}
export function actionStrength(action) {
  let best = 0;
  for (const s of actionSentences(action)) {
    if (CONDITIONAL.test(s)) continue;
    const v = sentenceStrength(s);
    if (v > best) best = v;
  }
  return best;
}

const URGENCY_RANK = { emergency: 4, soon: 3, this_week: 2, routine: 1 };

/** یافته‌ای که actionش دستورِ نهاییِ گزارش است: اول فوریتِ یافته، بعد شدتِ متن؛ در تساوی، اولی. */
export function pickFinalAction(findings) {
  let best = null, bestKey = -1;
  for (const f of findings ?? []) {
    if (!f.action) continue;
    const key = (URGENCY_RANK[f.urgency] ?? 0) * 10 + actionStrength(f.action);
    if (key > bestKey) { bestKey = key; best = f; }
  }
  return best;
}

const normalizeRec = (s) => String(s).replace(/[.؛،\s]+/g, " ").trim();
export function buildEngineRecommendations(patterns, engineOut) {
  // لایهٔ دوم: runPatterns پیشنهادهای تکراری را از قبل حذف کرده،
  // ولی این مسیر ممکن است با findings دست‌ساز هم صدا زده شود.
  const measured = new Set([...(engineOut?.graded ?? []).map((g) => g.test), ...Object.keys(engineOut?.ungraded ?? {})]);   // P88
  // پیشنهادهای همهٔ یافته‌ها یک‌جا جمع می‌شوند تا «پنل کامل آهن» بتواند
  // «آهن سرم»ِ یافتهٔ دیگر را هم پوشش بدهد (زیرمجموعه‌ها بین یافته‌ها رخ می‌دهند).
  const allSuggest = dropSubsumedTests([
    ...new Set(patterns.findings.flatMap((f) => f.suggest ?? [])
      .filter((t) => !alreadyMeasured(t, measured))),
  ]);
  const suggestOk = new Set(allSuggest);

  const final = pickFinalAction(patterns.findings);
  // 🔴 بازبینیِ دور ۳ (R3-CR2): forbidِ یک یافته هشدارِ یافتهٔ دیگر را پاک می‌کرد — forbid: ["B12","فولات"]ِ
  //    microcytic_anemia احتیاطِ اسید فولیکِ overt_b12_deficiency را (M155) از گزارش برداشت. هر مورد منبعش را
  //    با خود دارد: هشدار هرگز فیلتر نمی‌شود، و یافته‌ای که خودش دربارهٔ آن واژه است (headline/must_say) از forbidِ
  //    یافتهٔ *دیگر* معاف است.
  const built = final ? [{ text: final.action, src: final }] : [];
  const texts = () => built.map((b) => b.text);
  // وقتی دستورِ نهایی «همین حالا اورژانس» است، «اگر تب دارید به اورژانس» از actionهای دیگر
  // چیزی اضافه نمی‌کند و کنارِ آن گیج‌کننده است. warnings دست نمی‌خورند.
  const finalStrength = final ? actionStrength(final.action) : 0;
  const erNow = finalStrength === 5;
  for (const f of patterns.findings) {
    if (f.action && f !== final) {
      // 🔴 کد #4: جمله‌ای که در فهرست هست («این برگه را همراه ببرید» در دستورِ نهایی) دوباره نمی‌آید.
      const soFar = normalizeRec(texts().join(" "));
      const rest = nonFinalRemainder(f.action, finalStrength)
        .filter((s) => !(erNow && CONDITIONAL.test(s) && /اورژانس/.test(s)))
        .map((s) => s.replace(/؛$/, "."))
        .filter((s) => !soFar.includes(normalizeRec(s)));
      if (rest.length) built.push({ text: rest.join(" "), src: f });
    }
    for (const t of f.suggest ?? []) {
      if (!suggestOk.has(t)) continue;
      built.push({ text: phraseSuggestion(t), src: f });
    }
    for (const w of f.warnings ?? []) built.push({ text: w, src: f, warning: true });
  }
  const bans = patterns.findings.flatMap((f) => (f.forbid ?? []).map((w) => ({ w, by: f })));
  const aboutWord = (g, w) => `${g.headline ?? ""} ${g.must_say ?? ""}`.includes(w);
  const filtered = built
    .filter((b) => b.warning || !bans.some(({ w, by }) =>
      String(b.text).includes(w) && (by === b.src || !aboutWord(b.src, w))))
    .map((b) => b.text);
  // حذف تکراری‌ها: دو finding ممکن است یک آزمایش/اقدام را پیشنهاد دهند —
  // هم دقیقاً یکسان، هم یکی ادامهٔ دیگری («نوبت عادی…» در سه شکل).
  return tidyRecommendations(filtered);
}

// ═══ فشرده‌سازیِ نمایشیِ فهرستِ توصیه‌ها (۲۰۲۶-۱۰-۰۸، درخواستِ کاربر) ═══
// بیمار روی یک برگهٔ ساده ۲۰ سطر می‌دید که ۶ تایش «درخواست آزمایش X از پزشک» بود — لحنِ دستور به بیمار دربارهٔ کاری که
// تصمیمش با پزشک است — و «فهرستِ داروها را همراه ببرید» دو بار. اینجا فقط *شکلِ نمایش* عوض می‌شود: هیچ جمله‌ای از موتور
// حذف یا ساخته نمی‌شود، جز ادغامِ درخواست‌های آزمایش در یک جمله و حذفِ جملهٔ «فهرستِ داروها»ی کوتاه‌تر وقتی بلندترش هست.
// هشدارها («اگر …»)، دستورِ نهایی و هر موردی که با الگو نمی‌خواند بایت‌به‌بایت می‌مانند.
// ⚠️ buildEngineRecommendations عمداً دست‌نخورده است: expert.js، missingSuggestions و ~۴۰ تست فهرستِ تکی را می‌خوانند.
const TEST_REQUEST = /^درخواست\s+(تکرارِ?\s+)?(?:آزمایش\s+)?(.+?)\s+از پزشک$/;
const MED_LIST = /^فهرستِ?\s+داروهایتان.*همراه ببرید\.?$/;
export function condenseRecommendations(list) {
  const items = [...(list ?? [])];
  const fresh = [], repeat = [];
  const reqIdx = [];
  items.forEach((r, i) => {
    const m = String(r).trim().match(TEST_REQUEST);
    if (!m || m[2].includes("—")) return;
    (m[1] ? repeat : fresh).push(m[2].trim());
    reqIdx.push(i);
  });
  const drop = new Set();
  if (reqIdx.length >= 2) {
    const uniq = (a) => [...new Set(a)];
    const parts = [];
    if (fresh.length) parts.push(`برای روشن شدن علت، پزشک ممکن است این آزمایش‌ها را لازم بداند: ${uniq(fresh).join("، ")}.`);
    if (repeat.length) parts.push(`${fresh.length ? "همچنین" : "پزشک"} ممکن است تکرار این موارد را بخواهد: ${uniq(repeat).join("، ")}.`);
    items[reqIdx[0]] = parts.join(" ");
    reqIdx.slice(1).forEach((i) => drop.add(i));
  }
  const meds = items.map((r, i) => (MED_LIST.test(String(r).trim()) ? i : -1)).filter((i) => i >= 0);
  if (meds.length >= 2) {
    const keep = meds.reduce((a, b) => (String(items[b]).length > String(items[a]).length ? b : a));
    meds.forEach((i) => { if (i !== keep) drop.add(i); });
  }
  return items.filter((_, i) => !drop.has(i));
}

/**
 * توکن‌های یک *نامِ آزمایش* برای سنجشِ حضور در متنِ مدل.
 *
 * ⚠️ عمداً distinctiveTokens نیست. آن تابع برای *جمله* تنظیم شده: واژه‌های
 *    زیر چهار حرف و stop-wordها را دور می‌ریزد، چون در یک جملهٔ بلند چیزی
 *    ثابت نمی‌کنند. نامِ آزمایش جمله نیست — «ACR ادرار» سه‌حرفی‌اش دقیقاً
 *    همان چیزی است که نام را می‌سازد، و انداختنش «هر جملهٔ حاویِ ادرار» را
 *    به‌عنوان پوشش قبول می‌کرد. اینجا هر واژه‌ای که ≥۲ نویسه است می‌ماند.
 */
function nameTokens(name) {
  return [...new Set(
    normalizeFa(name).split(" ").filter((w) => w.length >= 2 || /\d/.test(w)),
  )];
}

/**
 * پیشنهادهای موتور که در فهرستِ توصیه‌های مدل *نیامده‌اند* — آمادهٔ افزودن.
 *
 * 🔴 شکافِ اندازه‌گیری‌شده روی یک برگهٔ واقعی (FBS=۲۰۹): موتور برای قندِ
 *    در محدودهٔ دیابت پنج پیشنهاد داده بود که «HbA1c» بینشان بود، و مدل در
 *    فهرستِ نهایی فقط «تکرار قند ناشتا» را نوشت. یعنی آزمایشی که هم تشخیص
 *    را قطعی می‌کند و هم شدت را می‌سنجد، بی‌صدا افتاد.
 *
 * ⚠️ تورِ قبلیِ توصیه‌ها فقط شرطِ «مدل هیچ نداد» را داشت (`length === 0`)،
 *    که همان کلاسِ N18 است: تور فقط شکستِ کامل را می‌دید و *کوتاه‌شدنِ*
 *    فهرست — که حالتِ شایع‌تر است — از زیرش رد می‌شد.
 *
 * جهتِ خطا مثل تورهای اورژانسِ server.js به نفعِ افزودن است: تکرارِ یک
 * توصیه بد است، افتادنِ درخواستِ HbA1c از برگهٔ یک نفر با قندِ ۲۰۹ بدتر.
 * پس تطبیق باید *همهٔ* واژه‌های نام را ببیند (آستانهٔ ۰.۶ روی نامِ دوکلمه‌ای
 * یعنی هر دو)، نه یکی از آن‌ها را.
 */
export function missingSuggestions(modelRecs, patterns, engineOut) {
  const measured = new Set([...(engineOut?.graded ?? []).map((g) => g.test), ...Object.keys(engineOut?.ungraded ?? {})]);   // P88
  const allSuggest = dropSubsumedTests([
    ...new Set((patterns?.findings ?? []).flatMap((f) => f.suggest ?? [])
      .filter((t) => !alreadyMeasured(t, measured))),
  ]);
  if (!allSuggest.length) return [];

  const modelText = normalizeFa((modelRecs ?? []).join(" "));
  const modelTokens = new Set(modelText.split(" ").filter(Boolean));

  const missing = allSuggest.filter((name) => {
    const toks = nameTokens(name);
    // نامِ بدونِ هیچ توکنِ قابلِ سنجش → با تطبیقِ عینیِ نرمال‌شده
    if (!toks.length) return !modelText.includes(normalizeFa(name));
    const hits = toks.filter((t) => modelTokens.has(t)).length;
    return hits / toks.length < 0.6;
  }).map(phraseSuggestion);

  // همان فیلترِ forbid که buildEngineRecommendations دارد — تور نباید
  // آزمایشی را برگرداند که یافتهٔ دیگری صریحاً منعش کرده.
  const forbidden = (patterns?.findings ?? []).flatMap((f) => f.forbid ?? []);
  return forbidden.length
    ? missing.filter((r) => !forbidden.some((w) => String(r).includes(w)))
    : missing;
}

/**
 * نتیجهٔ قطعی و مستقل از LLM.
 * وقتی مدل در «مسیر موتور» JSON نامعتبر برمی‌گرداند، یافته‌های موتور
 * (از جمله اورژانس‌ها مثل DKA/سپسیس) نباید دور ریخته شوند. این تابع
 * حداقلِ ایمن را مستقیم از خروجی موتور می‌سازد.
 */
export function buildEngineFallbackResult(engineOut, patterns) {
  const r = buildEngineFallbackResultAdult(engineOut, patterns);
  return isNeonate(engineOut?.age) ? neonatalResultVoice(r) : r;
}

function buildEngineFallbackResultAdult(engineOut, patterns) {
  const findings = patterns.findings;
  const headlines = findings.map((f) => f.headline).filter(Boolean);
  const mustSay = findings.map((f) => f.must_say).filter(Boolean);
  // N8: این متن مستقیم به بیمار می‌رسد (هیچ LLM‌ای در این مسیر نیست)،
  // پس کلید موتور باید از faName() رد شود وگرنه «HGB: 9.2» روی صفحه می‌نشیند.
  const abnormalText = engineOut.abnormal
    .map((a) => `${faName(a.test)}: ${a.value} (${a.fa})`)
    .join("، ");
  const recs = buildEngineRecommendations(patterns, engineOut);
  return {
    summary: headlines.length
      ? headlines.join("؛ ")
      : (engineOut.abnormal.length
          ? "چند مقدار خارج از محدوده طبیعی است."
          : "نتایج آزمایش شما بررسی شد."),
    interpretation: mustSay.length
      ? mustSay.join(" ")
      : (abnormalText ? `مقادیر خارج از محدوده: ${abnormalText}.` : ""),
    general_recommendations: recs.length ? recs : ["نتایج را با پزشک بررسی کنید."],
    has_critical: patterns.has_critical,
    disclaimer:
      "این تفسیر خودکار از روی نتایج آزمایش شماست و جایگزین پزشک نیست. لطفاً نتایج را با پزشک بررسی کنید.",
  };
}

/**
 * کلیدهای noRef که هیچ یافته‌ای توضیحشان نداده — همان‌هایی که خطِ «تفسیر نشدند» باید نام ببرد.
 * یافته‌ای که مقدارِ بی‌بازه را تفسیر می‌کند (ویلسون، آنتی‌بادی کنارِ B12ِ پایین؛ P49) آن را در
 * `explains` اعلام می‌کند؛ وگرنه بیمار زیرِ همان یافته می‌خواند «تفسیر نشدند» (N20).
 */
export function unexplainedNoRef(noRef, findings) {
  const explained = new Set((findings ?? []).flatMap((f) => f.explains ?? []));
  return [...new Set(noRef ?? [])].filter((k) => !explained.has(k));
}

// ═══ بند ۵ (LIS ۲۰۲۶-۱۰-۰۶، تصمیمِ «الف»): Mixed — شناخته، بی‌حکم ═══
// ۱۲۸ از ۲۳۶ درخواست «Mixed» را در «تفسیرشان نمی‌کند … حتماً با پزشک» می‌دیدند. یک جملهٔ توضیح، بی‌«بالا/پایین»، بی‌دستور. عددِ برگه (N5).
export function mixedLine(engineOut) {
  const m = engineOut?.ungraded?.MIXED;
  if (!m || m.reason !== "diff_mixed") return null;
  const where = m.position === "above" ? "بالاتر از" : m.position === "below" ? "پایین‌تر از" : m.position === "within" ? "داخلِ" : null;
  return `ردیفِ «Mixed» (${m.value}${m.unit ? ` ${m.unit}` : ""}) در شمارشِ افتراقیِ گلبول‌های سفید، جمعِ مونوسیت، ائوزینوفیل و بازوفیل است ` +
    "که این دستگاه جدا نشمرده؛ موتور دربارهٔ آن جداگانه حکمی نمی‌دهد" +
    // P96: بازهٔ خودِ دستگاه/آزمایشگاه (بی‌عددِ ثابتِ موتور)؛ فقط موقعیتِ عدد نسبت به همان.
    (where ? `؛ تنها موقعیتِ عدد نسبت به بازهٔ چاپ‌شدهٔ همان آزمایشگاه (${m.reference}) گفته می‌شود: عدد ${where} آن بازه است.` : ".");
}

// ═══ بند ۵ (تصمیمِ «الف»): همهٔ ردیف‌های خوانده‌شده منفی ═══
// شرطش qualAllReadNegative در server.js است. «طبیعی» نمی‌گوید (منفی بودنِ همین ردیف‌ها، نه سلامت)، و تروپونینِ منفیِ تنها جملهٔ تکرار را دارد
// (متنِ تأییدشدهٔ کاربر ۲۰۲۶-۱۰-۰۶). گارد T59.
export const TROPONIN_SINGLE_NEGATIVE =
  "یک تروپونینِ منفی به‌تنهایی کافی نیست؛ اگر دردِ قفسهٔ سینه دارید یا علامت تازه شروع شده، تکرار لازم است.";
export function buildAllNegativeResult(engineOut) {
  const rows = Object.keys(engineOut?.qual ?? {});
  const troponin = rows.some((k) => /troponin|ctn[it]|تروپونین/i.test(k));
  return {
    summary: "همهٔ ردیف‌های خوانده‌شدهٔ این برگه منفی‌اند یا یافتهٔ غیرعادی نشان نمی‌دهند.",
    interpretation: rows.length === 1
      ? "تنها ردیفِ خوانده‌شدهٔ این برگه یافتهٔ غیرعادی نشان نمی‌دهد."
      : `موتور ${rows.length} ردیفِ این برگه را خواند و در هیچ‌کدام یافتهٔ غیرعادی ندید.`,
    general_recommendations: troponin
      ? [TROPONIN_SINGLE_NEGATIVE, "نتایج را در پرونده خود نگه دارید."]
      : ["نتایج را در پرونده خود نگه دارید."],
    warnings: [],
    has_critical: false,
    disclaimer: "این تفسیر صرفاً جهت افزایش آگاهی است و جایگزین توصیه پزشک نیست.",
  };
}

/**
 * اگر موتور هیچ الگویی پیدا نکرد — همه‌چیز طبیعی
 */
// لایهٔ ۳ (P78): برگه‌ای که موتور هیچ‌چیزش را نمی‌شناسد دیگر به مدلی نمی‌رسد که خودش شدت را قضاوت کند.
// این نتیجه هیچ حکمی نمی‌دهد: نه «طبیعی»، نه «بالا/پایین»، نه «بحرانی». فقط می‌گوید تفسیر نشد.
// `names` نامِ چاپی/واردشدهٔ خودِ ردیف است (t.name)، نه کلیدِ موتور — همان چیزی که بیمار روی برگه‌اش می‌بیند.
// ⚠️ «فهرستِ بالا» فقط وقتی هست که فهرستِ «مقادیرِ خوانده‌شده» ساخته شده باشد (عکس)؛ ورودِ دستی و فقط-متن آن را ندارند (N4).
// ⚠️ پیش از P78 مدل گاهی هشدارِ علامت می‌داد؛ این مسیر حکم نمی‌دهد، پس جملهٔ ثابتِ «اگر علامت دارید» جای آن را می‌گیرد —
//    شرطی به علامت است، نه دربارهٔ عددها (برگهٔ «Procalcitonin 12 · Lactate 6.2» بی‌هیچ هشداری نمی‌ماند).
export const UNINTERPRETED_SYMPTOM_WARNING =
  "اگر علائمِ حاد دارید (تنگیِ نفس، دردِ قفسهٔ سینه، تب و لرز با بی‌حالی، گیجی یا بی‌حالیِ شدید، خونریزی)، منتظرِ تفسیر نمانید و همان روز به پزشک یا اورژانس مراجعه کنید.";

// ═══ specs/014 (P87، مرحلهٔ الف): متنِ ردیف‌های ادرارِ ۲۴ساعته/مایعِ بدن — شناخته، تفسیرنشده ═══
// بی‌حکم: نه «بالا/پایین»، نه «طبیعی»، نه زمان‌بندی (گارد U11). نامِ فارسی، هرگز شناسهٔ خام (N8). هیچ عددِ مشتق (نسبت، کلیرانس) — N5.
const SPECIMEN_PREFIX = "این مقادیر شناخته شدند، ولی موتور هنوز تفسیرشان نمی‌کند (قواعدشان در انتظارِ بازبینیِ پزشک است)";
const specimenItem = (r) => `${SPECIMEN_FA[r.id]} ${r.raw || "(بی‌مقدار)"}${r.unit ? ` ${r.unit}` : ""}`;
function specimenFaNames(specimen) {
  const rows = [...(specimen?.u24 ?? []), ...(specimen?.fluid ?? [])].filter((r) => r.id !== "FL_TYPE");
  return [...new Set(rows.map((r) => SPECIMEN_FA[r.id]))];
}
function fluidTypeLabel(fluid) {
  if (!fluid?.type) return "نوعِ مایع روی برگه نیامده";
  if (fluid.type === "unknown") return `نوع: کدِ «${fluid.code}»، نامعلوم`;
  if (fluid.type === "other" && fluid.text) return `نوع: «${fluid.text}»، ناشناخته`;
  return `نوع: ${FLUID_TYPE_FA[fluid.type]}`;
}
// مرحلهٔ ب: ردیفی که یافته‌ای تفسیرش کرده («FL_GLU:csf» در explains) در خطِ «بی‌حکم» تکرار نمی‌شود.
// ۲۰۲۶-۱۰-۰۶ (تصمیمِ کاربر): دو ردیف با دو عددِ متفاوت برای یک آزمایش — عددِ دورتر از محدوده سنجیده شد (کفِ فوریت)؛ بیمار باید بداند.
export function valueConflictLines(conflicts = []) {
  return (conflicts ?? []).map((c) => {
    const all = [c.kept, ...c.dropped].map((x) => `«${x.name}» ${x.value}`).join("، ");
    const why = c.reason === "worse"
      ? "عددی که از محدودهٔ طبیعی دورتر است"
      : "عددِ ردیفِ اول";
    return `برای ${c.name} دو عددِ متفاوت روی برگه آمده است (${all}). ${why} (${c.kept.value}) تفسیر شد` +
      (c.reason === "worse" ? " تا اگر درست باشد از دست نرود" : "") +
      "؛ لطفاً با برگه مقایسه کنید و این را به پزشک بگویید.";
  });
}

export function specimenLine(specimen, findings = []) {
  const explained = new Set((findings ?? []).flatMap((f) => f.explains ?? []));
  const open = (r) => !explained.has(`${r.id}:${r.fluid?.type ?? ""}`);
  const u24 = (specimen?.u24 ?? []).filter(open);
  const fluid = (specimen?.fluid ?? []).filter((r) => r.id !== "FL_TYPE").filter(open);
  const bare = specimen?.bareServingFluidNames ?? [];
  const groups = [];
  if (u24.length) groups.push(`ادرار ۲۴ساعته: ${u24.map(specimenItem).join("؛ ")}`);
  // یک گروه برای هر نوعِ مایع؛ هرگز ادغامِ دو مایع (edge case).
  const byType = new Map();
  for (const r of fluid) {
    const k = JSON.stringify(r.fluid ?? null);
    if (!byType.has(k)) byType.set(k, []);
    byType.get(k).push(r);
  }
  for (const [k, rows] of byType) groups.push(`مایع بدن (${fluidTypeLabel(JSON.parse(k))}): ${rows.map(specimenItem).join("؛ ")}`);
  // بازبینیِ کد (LOW): برگهٔ فقط-«Fluid Type» هم «شناخته شد» است — وگرنه خط null و نتیجه می‌گفت «هیچ‌کدام را نشناخت».
  if (!fluid.length) {
    for (const t of (specimen?.fluid ?? []).filter((r) => r.id === "FL_TYPE")) groups.push(`مایع بدن (${fluidTypeLabel(t.fluid)})`);
  }
  // 🔴 بازبینیِ کد (HIGH #2، N20): نسخهٔ اول می‌گفت «تفسیرِ مربوط به آن‌ها را نادیده بگیرید» — کنارِ «Glucose 30» یعنی
  //   دعوت به نادیده گرفتنِ اورژانسِ هیپوگلیسمی. این جمله فقط *اطلاع* می‌دهد و هیچ دستورِ دیگرِ گزارش را لغو نمی‌کند.
  const caution = bare.length
    ? `ردیف‌های ${bare.map((n) => `«${n}»`).join("، ")} بی‌نامِ نمونه چاپ شده‌اند و موتور آن‌ها را مقدارِ خون فرض کرده است. ` +
      "اگر روی برگهٔ شما این ردیف‌ها مالِ مایع‌اند، این را به پزشک بگویید؛ تا آن موقع هر توصیهٔ فوری در همین گزارش معتبر است."
    : "";
  if (!groups.length) return caution || null;
  return `${SPECIMEN_PREFIX} — ${groups.join(". ")}. دربارهٔ این مقادیر حکمی نمی‌دهیم؛ حتماً با پزشک بررسی کنید.` +
    (caution ? ` ${caution}` : "");
}

// بندِ ۴ (LIS ۲۰۲۶-۱۰-۰۶، [57]): `readNegative` = تعدادِ ردیف‌هایی که موتور خواند و چیزی نشان ندادند (qualAllReadNegative بی‌شرطِ unmapped).
//   برگهٔ ادرارِ منفی با یک ردیفِ ناخوانا («Sp.Gravity 1.0») می‌خواند «هیچ‌کدام از مقادیر را نشناخت» — دربارهٔ ۲۰ ردیفِ خوانده‌شده دروغ (همان بندِ ۵).
//   حکمی اضافه نمی‌شود: نه «طبیعی»، نه فوریت. گارد L24b.
export function buildUninterpretedResult(unmapped = [], { listShown = false, recognized = null, readNegative = 0 } = {}) {
  const names = [...new Set(unmapped)].filter(Boolean);
  const partial = !recognized && readNegative > 0;
  return {
    summary: partial
      ? "بخشی از این برگه تفسیر نشد. این به معنای «طبیعی» بودن آن بخش نیست."
      : "این برگه تفسیر نشد. این به معنای «طبیعی» بودن نتایج نیست.",
    interpretation:
      // specs/014: ردیفِ ادرارِ ۲۴ساعته/مایع *شناخته* شد — «هیچ‌کدام را نشناخت» دربارهٔ آن دروغ است (T54).
      (recognized
        ? "این مقادیر شناخته شدند (ادرار ۲۴ساعته یا مایع بدن)، ولی موتور هنوز قاعدهٔ تأییدشده‌ای برای تفسیرشان ندارد، پس دربارهٔ آن‌ها حکمی نمی‌دهیم."
        : partial
          ? `موتور ${readNegative} ردیفِ این برگه را خواند و در آن‌ها یافتهٔ غیرعادی ندید، ولی بقیه را نشناخت و دربارهٔ «بالا» یا «پایین» بودنشان نظری نمی‌دهد.`
          : "موتورِ تفسیرِ ما هیچ‌کدام از مقادیرِ این برگه را نشناخت، پس دربارهٔ «بالا» یا «پایین» بودنشان نظری نمی‌دهیم.") +
      (names.length ? ` مقادیرِ نشناخته: ${names.join("، ")}.` : "") +
      (listShown
        ? " اعدادِ خوانده‌شده در فهرستِ بالا هست؛ تفسیرشان با پزشک است."
        : " تفسیرِ این مقادیر با پزشک است."),
    // ⚠️ در general_recommendations، نه warnings: ResultView فیلدِ warningsِ سطحِ بالا را اصلاً رندر نمی‌کند.
    general_recommendations: ["این برگه را به پزشک نشان دهید تا مقادیر را بررسی کند.", UNINTERPRETED_SYMPTOM_WARNING],
    warnings: [],
    has_critical: false,
    disclaimer: "این تفسیر صرفاً جهت افزایش آگاهی است و جایگزین توصیه پزشک نیست.",
  };
}

export function buildNormalResult(engineOut) {
  const r = buildNormalResultAdult(engineOut);
  return isNeonate(engineOut?.age) ? neonatalResultVoice(r) : r;
}

// همان متنِ آماده با لحنِ نوزاد: «شما» ⇒ «نوزاد» و دستورِ «نشان دهید» برای نوزاد.
function neonatalResultVoice(r) {
  const v = (s) => neonatalVoice(s);
  return {
    ...r,
    summary: v(r.summary),
    interpretation: v(r.interpretation),
    general_recommendations: (r.general_recommendations ?? []).map((s) => v(s)),
    disclaimer: v(r.disclaimer),
  };
}

function buildNormalResultAdult(engineOut) {
  const borderline = engineOut.graded.filter((g) => g.nearLimit);
  // ⚠️ specs/004 (FR-009، N2): مقدارِ بی‌بازه (noRef) قضاوت نشده، و قضاوت‌نشده «طبیعی» نیست.
  //    پیش از این، برگهٔ «روی ۴۰» یا «پرولاکتین ۴۰» می‌خواند «نتایج آزمایش شما در محدوده طبیعی است».
  const unjudged = [...new Set(engineOut.noRef ?? [])].map(faName);
  // specs/014 (P87، مرحلهٔ الف): ردیفِ ادرارِ ۲۴ساعته/مایعِ بدن شناخته شد ولی سنجیده نشد ⇒ «همه طبیعی» آن را نمی‌پوشاند (اصلِ II، T56).
  const specimenNames = specimenFaNames(engineOut.specimen);
  if (unjudged.length || specimenNames.length) {
    const judged = engineOut.graded.length > 0;
    return {
      summary: judged
        ? "مقادیری که موتور می‌سنجد در محدودهٔ طبیعی‌اند، ولی چند مقدارِ این برگه تفسیر نشدند."
        : "مقادیرِ این برگه خوانده شدند، ولی موتور هیچ‌کدام را تفسیر نکرد.",
      interpretation:
        (judged ? "هیچ‌کدام از مقادیری که موتور می‌سنجد خارج از محدودهٔ مرجع نیست. " : "") +
        (unjudged.length
          ? `برای این مقادیر محدودهٔ مرجعِ تأییدشده نداریم: ${unjudged.join("، ")}. ` +
            "درباره‌شان «بالا» یا «پایین» نمی‌گوییم؛ تفسیرشان با پزشک است."
          : "") +
        (specimenNames.length
          ? (unjudged.length ? " " : "") +
            `این مقادیرِ ادرار ۲۴ساعته یا مایع بدن شناخته شدند ولی موتور هنوز تفسیرشان نمی‌کند: ${specimenNames.join("، ")}. ` +
            "دربارهٔ آن‌ها حکمی نمی‌دهیم؛ تفسیرشان با پزشک است."
          : "") +
        (borderline.length
          ? ` چند مورد نزدیک حد محدوده هستند: ${borderline.map((b) => faName(b.test)).join("، ")}. این به‌خودی‌خود معنایی ندارد، ولی اگر نتیجه قبلی دارید مقایسه کنید.`
          : ""),
      general_recommendations: ["این برگه را به پزشک نشان دهید تا مقادیرِ تفسیرنشده را بررسی کند."],
      warnings: [],
      has_critical: false,
      disclaimer: "این تفسیر صرفاً جهت افزایش آگاهی است و جایگزین توصیه پزشک نیست.",
    };
  }
  // P83: ردیفی که روی برگه هست ولی هیچ قاعده‌ای نمی‌سنجدش (شاخص‌های پلاکتیِ PDW/P-LCR که پلاکت غیرطبیعی نیست، و PTِ کنترل) نباید زیرِ
  //   «هیچ‌کدام از مقادیر خارج از محدوده نیست» برود؛ آن جمله دربارهٔ آزمایشی است که سنجیده نشده (N4). فهرستِ «تفسیرنشده» (noRef) نیست،
  //   چون شاخص‌های پلاکتی در هر CBCِ طبیعی چاپ می‌شوند (تصمیمِ P57/M222: به‌تنهایی هشدار نمی‌سازند) ⇒ فقط ادعا را محدود می‌کنیم.
  const notMeasured = [
    ...Object.entries(engineOut.ungraded ?? {}).filter(([, u]) => u?.reason === "platelet_index" || u?.reason === "diff_mixed").map(([k]) => k),
    ...(engineOut.hemostasis?.PT_CONTROL != null ? ["PT_CONTROL"] : []),
  ].map(faName);
  // 🔴 بازبینیِ LIS ۲۰۲۶-۱۰-۰۵ (پیامدِ باگِ ۳، N4): ردیفی که موتور نشناخت (unmapped — مثلاً «Blood 2+»، «Leuko estr Positive» ِ نوارِ ادرارِ
  //   برگهٔ ترکیبی) سنجیده نشده؛ خلاصهٔ «نتایج شما طبیعی است» آن را هم می‌پوشاند، درست کنارِ هشدارِ «تفسیرشان نمی‌کند» ِ server.js.
  //   نام‌ها اینجا تکرار نمی‌شوند (خام‌اند، N8) — همان هشدار فهرستشان را دارد.
  const unread = (engineOut.unmapped ?? []).length > 0;
  return {
    summary: unread
      ? "مقادیری که موتور می‌سنجد در محدودهٔ طبیعی‌اند، ولی چند ردیفِ این برگه تفسیر نشدند."
      : notMeasured.length
        ? "مقادیری که موتور می‌سنجد در محدودهٔ طبیعی‌اند."
        : "نتایج آزمایش شما در محدوده طبیعی است.",
    interpretation:
      (notMeasured.length || unread
        ? "هیچ‌کدام از مقادیری که موتور می‌سنجد خارج از محدودهٔ مرجع نیست." +
          (notMeasured.length
            ? ` این ردیف‌ها روی برگه هستند ولی به‌تنهایی سنجیده نمی‌شوند و دربارهٔ آن‌ها «طبیعی» نمی‌گوییم: ${[...new Set(notMeasured)].join("، ")}.`
            : "") +
          (unread ? " چند ردیفِ دیگرِ این برگه را موتور تفسیر نمی‌کند و دربارهٔ آن‌ها «طبیعی» نمی‌گوییم؛ فهرستشان در هشدارِ همین صفحه آمده است." : "")
        : "هیچ‌کدام از مقادیر خارج از محدوده مرجع نیست.") +
      (borderline.length
        ? ` چند مورد نزدیک حد محدوده هستند: ${borderline.map((b) => faName(b.test)).join("، ")}. این به‌خودی‌خود معنایی ندارد، ولی اگر نتیجه قبلی دارید مقایسه کنید.`
        : ""),
    general_recommendations: [unread ? "این برگه را به پزشک نشان دهید تا مقادیرِ تفسیرنشده را بررسی کند." : "نتایج را در پرونده خود نگه دارید."],
    warnings: [],
    has_critical: false,
    disclaimer: "این تفسیر صرفاً جهت افزایش آگاهی است و جایگزین توصیه پزشک نیست.",
  };
}
