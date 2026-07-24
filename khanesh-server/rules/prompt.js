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

import { alreadyMeasured } from "./patterns.js";
import { faName } from "./names.js";

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
  "interpretation": "متن اصلی. must_say را در آن بگنجان. حداکثر ۵ جمله.",
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
      ...(g.ctcaeGrade ? { severity: SEVERITY_FA[g.ctcaeGrade] ?? null } : {}),
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
    findings: patterns.findings.map((f) => ({
      headline: f.headline,
      must_say: f.must_say,
      action: f.action,
      urgency: f.urgency,
      suggest: f.suggest,
      forbid: f.forbid ?? [],
      warnings: f.warnings ?? [],
    })),
    abnormal_tests: abnormal,
    borderline_tests: borderline,
    qualitative: engineOut.qual,
    indices: engineOut.indices,
    ...(engineOut.diffFailed
      ? { diff_note: "دستگاه شمارش افتراقی را نتوانست انجام دهد — مقادیر دیف حذف شدند" }
      : {}),
  };

  let text = JSON.stringify(payload, null, 1);
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
export function buildEngineRecommendations(patterns, engineOut) {
  // لایهٔ دوم: runPatterns پیشنهادهای تکراری را از قبل حذف کرده،
  // ولی این مسیر ممکن است با findings دست‌ساز هم صدا زده شود.
  const measured = new Set((engineOut?.graded ?? []).map((g) => g.test));
  const built = [];
  for (const f of patterns.findings) {
    if (f.action) built.push(f.action);
    for (const t of f.suggest ?? []) {
      if (alreadyMeasured(t, measured)) continue;
      built.push(`درخواست آزمایش ${t} از پزشک`);
    }
    for (const w of f.warnings ?? []) built.push(w);
  }
  const forbidden = patterns.findings.flatMap((f) => f.forbid ?? []);
  const filtered = forbidden.length
    ? built.filter((r) => !forbidden.some((w) => String(r).includes(w)))
    : built;
  // حذف تکراری‌ها: دو finding ممکن است یک آزمایش/اقدام را پیشنهاد دهند.
  return [...new Set(filtered.map((r) => String(r).trim()))];
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
  const abnormalText = engineOut.abnormal
    .map((a) => `${a.test}: ${a.value} (${a.fa})`)
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
        ? ` چند مورد نزدیک حد محدوده هستند: ${borderline.map((b) => b.test).join("، ")}. این به‌خودی‌خود معنایی ندارد، ولی اگر نتیجه قبلی دارید مقایسه کنید.`
        : ""),
    general_recommendations: ["نتایج را در پرونده خود نگه دارید."],
    warnings: [],
    has_critical: false,
    disclaimer: "این تفسیر صرفاً جهت افزایش آگاهی است و جایگزین توصیه پزشک نیست.",
  };
}
