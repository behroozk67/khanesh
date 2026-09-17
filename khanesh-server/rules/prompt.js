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
تو دستیار «LabMate» هستی و برای بیماری می‌نویسی که هیچ سواد پزشکی ندارد.

## نقش تو
تحلیل بالینی قبلاً توسط موتور قواعد انجام شده و نتیجه‌اش به تو داده می‌شود.
تو تشخیص نمی‌دهی، الگو پیدا نمی‌کنی، و تست پیشنهاد نمی‌دهی.
کار تو فقط این است: محتوای آماده را به فارسیِ روان و گرم بازنویسی کنی.

## قواعد قطعی
۰. اگر findings چند مورد دارد، **همه** را بنویس. هیچ‌کدام را ادغام یا حذف نکن.
   بیمار ممکن است همزمان چند مشکل فوری داشته باشد — پنهان کردن یکی خطرناک است.
۰.۵. جمله‌ها را تکرار نکن. هر مطلب فقط یک بار.
۱. فیلد must_say را کامل منتقل کن — این تشخیص موتور است. اگر داخلش عددی آمده
   (مثل eGFR، میانگین قند، درصد، یا مقدار یک تست)، همان عدد را حتماً در تفسیر بیاور؛ حذف یا خلاصه‌اش نکن.
۲. فقط تست‌های داخل suggest را نام ببر. هیچ تستی اضافه نکن.
۳. تست‌های داخل forbid را هرگز نام نبر — از نظر بالینی برای این الگو غلط‌اند.
۴. urgency را عوض نکن.
۵. هیچ عددی را تغییر نده یا از خودت نساز.
۶. warnings را حذف نکن.

## زبان
- جمله‌ها کوتاه، حداکثر ۲۰ کلمه.
- «شما ... دارید» ننویس. بنویس «این معمولاً یعنی ...»
- «نگران نباشید» ننویس.
- هر عدد را با محدوده طبیعی‌اش بیاور.
- اصطلاح تخصصی فقط وقتی که در must_say آمده — همان‌جا با یک جمله توضیحش بده.

## خروجی — فقط JSON معتبر، بدون بک‌تیک، بدون متن اضافه

⚠️ نام فیلدها باید دقیقاً همین باشد، وگرنه در برنامه نمایش داده نمی‌شود.

{
  "summary": "یک تا دو جمله. کل وضعیت.",
  "interpretation": "متن اصلی. must_say را در آن بگنجان. حداکثر ۱۰ جمله.",
  "general_recommendations": [
    "اقدام اصلی — از فیلد action",
    "برای هر تست در suggest یک مورد: «درخواست آزمایش ... از پزشک»",
    "هشدارهای warnings را هم اینجا بیاور"
  ],
  "has_critical": false,
  "disclaimer": "یادآوری کوتاه که این تفسیر جای پزشک را نمی‌گیرد."
}

## general_recommendations — مهم
- حتماً پرش کن. هرگز خالی نگذار.
- اول action، بعد تست‌های suggest، بعد warnings.
- تست‌ها را با نام فارسی بنویس، همان‌طور که در suggest آمده.
`.trim();

const URGENCY_FA = {
  emergency: "فوری — همین امروز",
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
      ...(patientContext?.conditions?.length ? { بیماری_زمینه‌ای: patientContext.conditions } : {}),
    },
    overall_urgency: patterns.overall_urgency,
    overall_urgency_fa: URGENCY_FA[patterns.overall_urgency],
    // ⚠️ فیلدها اینجا با نام برشمرده می‌شوند و این عمدی است — نه از سرِ
    //    سلیقه. هر فیلدی که به finding اضافه شود، تا وقتی اسمش اینجا نیاید
    //    به مدل نمی‌رسد. `protected` دقیقاً از همین خاصیت استفاده می‌کند:
    //    نامِ دارو، دوز و راهِ مصرف هرگز وارد payload نمی‌شوند، پس مدل
    //    نمی‌تواند بازنویسی‌شان کند. (rules/protected.js)
    findings: patterns.findings.map((f) => {
      // متنِ محافظت‌شده معمولاً *همان* رشته‌ای است که در warnings هم نشسته
      // (یک ثابت، دو ارجاع — تا دو نسخه از یک تصمیم نداشته باشیم؛ کلاسِ N20).
      // پس باید از warnings هم بیرون کشیده شود، وگرنه از همان در به مدل می‌رسد.
      const guarded = new Set((f.protected ?? []).map((p) => p.text));
      return {
        headline: f.headline,
        must_say: f.must_say,
        action: f.action,
        urgency: f.urgency,
        suggest: f.suggest,
        forbid: f.forbid ?? [],
        warnings: (f.warnings ?? []).filter((w) => !guarded.has(w)),
        // مدل باید بداند بلوکی هست که ننوشته‌ است، وگرنه ممکن است خودش
        // دستورِ دارویی بسازد تا جای خالی را پر کند.
        ...(guarded.size ? { has_protected_block: true } : {}),
      };
    }),
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
function dropSubsumedTests(suggestions) {
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
  // «GGT — برای مشخص شدن منبع ALP» → «درخواست آزمایش GGT از پزشک — برای …»
  const dash = text.match(/^(.+?)\s+[—–-]\s+(.+)$/);
  if (dash) return `درخواست آزمایش ${dash[1].trim()} از پزشک — ${dash[2].trim()}`;
  return `درخواست آزمایش ${text} از پزشک`;
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
  return mergeByLeadSentence(dropSubsumedText(exact));
}

export function buildEngineRecommendations(patterns, engineOut) {
  // لایهٔ دوم: runPatterns پیشنهادهای تکراری را از قبل حذف کرده،
  // ولی این مسیر ممکن است با findings دست‌ساز هم صدا زده شود.
  const measured = new Set((engineOut?.graded ?? []).map((g) => g.test));
  // پیشنهادهای همهٔ یافته‌ها یک‌جا جمع می‌شوند تا «پنل کامل آهن» بتواند
  // «آهن سرم»ِ یافتهٔ دیگر را هم پوشش بدهد (زیرمجموعه‌ها بین یافته‌ها رخ می‌دهند).
  const allSuggest = dropSubsumedTests([
    ...new Set(patterns.findings.flatMap((f) => f.suggest ?? [])
      .filter((t) => !alreadyMeasured(t, measured))),
  ]);
  const suggestOk = new Set(allSuggest);

  const built = [];
  for (const f of patterns.findings) {
    if (f.action) built.push(f.action);
    for (const t of f.suggest ?? []) {
      if (!suggestOk.has(t)) continue;
      built.push(phraseSuggestion(t));
    }
    for (const w of f.warnings ?? []) built.push(w);
  }
  const forbidden = patterns.findings.flatMap((f) => f.forbid ?? []);
  const filtered = forbidden.length
    ? built.filter((r) => !forbidden.some((w) => String(r).includes(w)))
    : built;
  // حذف تکراری‌ها: دو finding ممکن است یک آزمایش/اقدام را پیشنهاد دهند —
  // هم دقیقاً یکسان، هم یکی ادامهٔ دیگری («نوبت عادی…» در سه شکل).
  return tidyRecommendations(filtered);
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
  const measured = new Set((engineOut?.graded ?? []).map((g) => g.test));
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
 * اگر موتور هیچ الگویی پیدا نکرد — همه‌چیز طبیعی
 */
export function buildNormalResult(engineOut) {
  const borderline = engineOut.graded.filter((g) => g.nearLimit);
  return {
    summary: "نتایج آزمایش شما در محدوده طبیعی است.",
    interpretation:
      "هیچ‌کدام از مقادیر خارج از محدوده مرجع نیست." +
      (borderline.length
        ? ` چند مورد نزدیک حد محدوده هستند: ${borderline.map((b) => faName(b.test)).join("، ")}. این به‌خودی‌خود معنایی ندارد، ولی اگر نتیجه قبلی دارید مقایسه کنید.`
        : ""),
    general_recommendations: ["نتایج را در پرونده خود نگه دارید."],
    warnings: [],
    has_critical: false,
    disclaimer: "این تفسیر صرفاً جهت افزایش آگاهی است و جایگزین توصیه پزشک نیست.",
  };
}
