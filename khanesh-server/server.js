// ============================================================
// سرور واسط «LabMate» — نسخه با آپلود چند عکس
// ------------------------------------------------------------
// تغییرات این نسخه:
//   ۱. خواندن عکس و تحلیل، دو مرحله جدا:
//      مرحله ۱: OCR خالص (فقط خواندن جدول، بدون هیچ تفسیری)
//      مرحله ۲: تحلیل روی متنِ خوانده‌شده
//   ۲. فهرست «مقادیر خوانده‌شده از عکس» مستقیماً از خروجی OCR ساخته
//      می‌شود، نه از هوش مصنوعیِ مرحله دوم.
//      دو فایده: (الف) هیچ ردیفی به‌خاطر سقف توکن جا نمی‌افتد
//                (ب) مدل تحلیل نمی‌تواند اعداد را عوض کند
//   ۳. مهلت زمانی بلندتر برای مدل‌های کند مثل Gemini
//   ۴. اگر JSON ناقص رسید، تلاش برای بازیابی بخش سالم
//
// API:
//   POST /api/analyze  با بدنه { patientInfo, testResults?, imageDataUrl? }
//
// اجرا:
//   npm install
//   node server.js
// ============================================================

import express from "express";
import cors from "cors";
import "dotenv/config";

// ---- موتور قواعد ----
// چرا: gpt-4o-mini تفسیر بالینی نمی‌فهمید («نوع خاصی از کم‌خونی»).
// gpt-4o می‌فهمید ولی ۳۵ برابر گران بود — و باز هم برای کم‌خونی
// ماکروسیتیک «رژیم غنی از آهن» پیشنهاد می‌داد که بالینی غلط است.
// راه‌حل: الگو را کد تعیین می‌کند، مدل فقط فارسی می‌نویسد.
import { runEngine, isSemenPage, isHbElectroPage, isHbAmbiguousName, isPlaceholderValue } from "./rules/adapter.js";
import { getRef, isNeonate } from "./rules/refs.js";
const NEWBORN_MEDLINE_URL = "https://medlineplus.gov/infantandnewborncare.html";
import { runPatterns } from "./rules/patterns.js";
import { ENGINE_SYSTEM_PROMPT, buildEnginePrompt, buildNormalResult, buildEngineFallbackResult, buildEngineRecommendations, tidyRecommendations, missingSuggestions, unexplainedNoRef } from "./rules/prompt.js";
import { faName } from "./rules/names.js";
import { sourceList } from "./rules/guidelines.js";
import rateLimit from "express-rate-limit";
import { createAvalAIClient, safeParseJson } from "./avalaiClient.js";
import { extractMedlineTerms, formatMedlineContext } from "./rules/medline.js";
import { missingFindingText, stripUnmeasuredClaims, splitSentences } from "./rules/coverage.js";
import { collectProtected, engineStrings, inventedDosage } from "./rules/protected.js";
import { beginTrace, traceBootReport, isTraceEnabled } from "./trace.js";
import { createJob, reportPage, finishJob, getJobFor, jobView, jobCount } from "./jobStore.js";
import authRouter, { requireAuth, authBootReport, AUTH_REQUIRED } from "./auth.js";
import { initDb, createJobRecord, updateJobResult, getUserJobs, getJobById } from "./database.js";

// اطلاعات موتور برای کلاینت — یک‌جا تا بین مسیر اصلی و مسیر جایگزین drift نکند.
//
// ⚠️ تا قبل از این، تنها چیزی که از حکمِ موتور به کلاینت می‌رسید عددِ
//    `abnormal: engineOut.abnormal.length` بود. یعنی رابط کاربری می‌فهمید
//    «چندتا» غیرطبیعی است ولی هرگز نمی‌فهمید «کدام‌ها» — در حالی که
//    evaluate() برای هر تست وضعیت کامل (و حتی برچسبِ فارسیِ آمادهٔ `fa`)
//    محاسبه کرده بود و یک خط قبل از res.json دور ریخته می‌شد. بدون این،
//    گروه‌بندی بر اساس دستگاه بدن و «وضعیت واژه‌ای به‌جای رنگ» از سمت
//    کلاینت غیرممکن بود، نه سخت.
//
//    این یک تغییرِ سریالایز است، نه بالینی: هیچ قضاوتی اینجا انجام نمی‌شود
//    و `rules/` دست نخورده است.
function engineDebug(engineOut, patternOut) {
  return {
    patterns: patternOut.findings.map((f) => f.rule_id),
    urgency: patternOut.overall_urgency,
    // ⚠️ قرارداد قبلی: عدد. عمداً حفظ شده تا کلاینت قدیمی نشکند.
    abnormal: engineOut.abnormal.length,
    // ⚠️ کلیدهایی که هیچ قاعده‌ای برنداشت — همان‌هایی که تورِ
    //    `unexplained_abnormal` نام می‌برد، ولی ساختاری. کلاینت باید بداند
    //    *کدام* ردیف بی‌توضیح ماند، نه فقط اینکه «یکی در این پنل بود»:
    //    چسباندنِ آن پرچمِ کل‌پنلی به هر ردیفِ غیرطبیعی، کنارِ یافته‌ای که با
    //    اطمینان فقر آهن را توضیح می‌دهد، تناقض می‌سازد.
    uncovered: patternOut.findings.flatMap((f) => f.uncovered ?? []),
    indices: engineOut.indices,
    tests: serializeGraded(engineOut),
    // ── منابعِ گایدلاینیِ یافته‌ها (شفافیت) ──
    // فقط شناسه‌هایی که واقعاً روی یافته‌های نمایش‌داده‌شده نشسته‌اند.
    // sourceList نامِ منبعِ پولی را با معادلِ آزادش جایگزین می‌کند تا
    // به بیمار نگوییم عددی از UpToDate آمده در حالی که نیامده.
    guidelines: sourceList(
      patternOut.findings.flatMap((f) => f.sources ?? [])
    ),
    // ── CLSI: هشدارهای پیش‌تحلیلیِ بی‌صاحب ──
    // آن‌هایی که یافتهٔ متناظرشان در این پنل نبود یا سرکوب شد.
    preanalytical: patternOut.preanalytical ?? [],
    // ── IFCC: تبدیل‌های واحدِ انجام‌شده ──
    // «۴۸ mmol/mol → ۶.۵٪» باید دیده شود، وگرنه عددِ برگه با عددِ تفسیر
    //  نمی‌خواند و بیمار حق دارد فکر کند اشتباهی رخ داده.
    // ⚠️ `test` کلیدِ خامِ موتور است و هرگز نباید رندر شود (کلاسِ N8) —
    //    `name` را همین‌جا می‌سازیم تا کلاینت مجبور به حدس‌زدن نباشد.
    unitConversions: (engineOut.unitConversions ?? []).map((c) => ({
      ...c,
      name: faName(c.test),
    })),
  };
}

// حکمِ تک‌تک تست‌ها. `name` از faName() رد می‌شود تا کلید خام (HGB, BILI_T)
// هرگز به متنِ روبه‌بیمار نرسد — همان کلاسی که N8 است.
function serializeGraded(engineOut) {
  if (!Array.isArray(engineOut?.graded)) return [];
  return engineOut.graded.map((g) => ({
    key: g.test,
    name: faName(g.test),
    value: g.value,
    range: g.range,
    refSource: g.refSource ?? null,
    abnormal: !!g.abnormal,
    dir: g.dir ?? null,
    fa: g.fa ?? null,          // برچسبِ فارسیِ آماده — کلاینت دوباره نسازدش
    level: g.level ?? null,
    ctcaeGrade: g.ctcaeGrade ?? null,
    nearLimit: !!g.nearLimit,
    source: g.source ?? null,
  }));
}

const app = express();

// ── CORS ──
// ALLOWED_ORIGINS خالی = هر مبدأ (رفتار قبلی، برای توسعه). در پرودکشن ست کن.
// ⚠️ CORS فقط جلوی سوءاستفادهٔ مرورگری از یک سایت دیگر را می‌گیرد؛ curl و اسکریپت
//    را نمی‌گیرد. محافظِ واقعیِ هزینه، rate limit پایین‌تر است، نه این.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",").map((s) => s.trim()).filter(Boolean);
function originAllowed(origin) {
  // بدون Origin = same-origin یا curl؛ اجازه بده (rate limit مهارش می‌کند).
  return !origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin);
}
app.use(cors(
  ALLOWED_ORIGINS.length === 0 ? undefined : {
    // false، نه Error: خطا دادن اینجا به error handlerِ پیش‌فرض می‌افتد و
    // ۵۰۰ برمی‌گرداند که هم گمراه‌کننده است هم لاگ را آلوده می‌کند.
    origin: (origin, cb) => cb(null, originAllowed(origin)),
  }
));

// نگهبانِ مبدأ برای اندپوینتِ پولی.
// نبودنِ هدرِ CORS جلوی *خواندنِ* پاسخ توسط صفحهٔ مهاجم را می‌گیرد، ولی درخواست
// روی سرور اجرا شده و پولش را داده. پس مبدأِ غیرمجاز را صریح رد می‌کنیم.
// قبل از rate limit می‌نشیند تا سهمیهٔ کاربرِ واقعی را مصرف نکند.
function requireAllowedOrigin(req, res, next) {
  if (originAllowed(req.headers.origin)) return next();
  res.status(403).json({ error: "این مبدأ اجازهٔ دسترسی ندارد." });
}

// ── trust proxy ──
// ⚠️ مهم: پشت Nginx، req.ip آی‌پیِ پروکسی است نه بیمار. اگر TRUST_PROXY ست نشود،
//    rate limit همهٔ ترافیک را «یک کاربر» می‌بیند و اولین کاربرِ پرمصرف بقیهٔ
//    بیماران را هم بلاک می‌کند. اگر ست شود ولی پروکسی‌ای نباشد، X-Forwarded-For
//    جعل‌شدنی است و limiter دور می‌خورد. پس عدد را مطابق تعداد hopِ واقعی بگذار.
const TRUST_PROXY = process.env.TRUST_PROXY;
if (TRUST_PROXY) app.set("trust proxy", /^\d+$/.test(TRUST_PROXY) ? Number(TRUST_PROXY) : TRUST_PROXY);

app.use(express.json({ limit: "60mb" }));   // ← Nginx روی 50M است؛ Express نباید تنگ‌تر باشد
app.use("/api/auth", authRouter);

const AVALAI_API_KEY = process.env.AVALAI_API_KEY;
const AVALAI_BASE_URL = "https://api.avalai.ir/v1";
const TEXT_MODEL = process.env.TEXT_MODEL || "gpt-4o-mini";
const VISION_MODEL = process.env.VISION_MODEL || "gpt-4o-mini";
const PORT = process.env.PORT || 8787;

// مهلت زمانی درخواست به سرویس هوش مصنوعی (میلی‌ثانیه)
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 240000); // ۴ دقیقه

// آپلود چند عکس
const MAX_IMAGES        = Number(process.env.MAX_IMAGES || 5);
// ⚠️ پیش‌فرض ۱ است چون AvalAI روی Gemini محدودیت نرخ سخت‌گیرانه دارد.
//    با ۲، هر دو درخواست ۴۲۹ می‌گیرند و هیچ عکسی خوانده نمی‌شود.
//    اگر حسابت اجازه می‌دهد، در .env بگذار IMAGE_CONCURRENCY=2
const IMAGE_CONCURRENCY = Number(process.env.IMAGE_CONCURRENCY || 1);
const OCR_RETRIES       = Number(process.env.OCR_RETRIES || 3);

// سقف توکن OCR.
// ⚠️ با ۴۰۰۰ روی برگه‌های شلوغ TRUNCATED می‌شد و نصف تست‌ها جا می‌افتاد.
//    نمونه واقعی: برگه CBC با ۲۰ ردیف → فقط ۲ تست خوانده شد.
//    این عدد بر اساس لاگ واقعی تنظیم شده، نه حدس.
const OCR_MAX_TOKENS = Number(process.env.OCR_MAX_TOKENS || 8000);

// موتور قواعد: پیش‌فرض روشن. برای برگشت به روش قدیم: USE_ENGINE=false
const USE_ENGINE = process.env.USE_ENGINE !== "false";

// گرافِ ۱۰-عاملهٔ LabMat: پیش‌فرض *خاموش*، با USE_GRAPH=true روشن می‌شود.
//
// ⚠️ چرا خاموش: در مسیرِ گراف، متنِ بیمار از دو عاملِ LLM (patientSection و
//    doctorSection) بیرون می‌آید که خروجی‌شان از تورهای ایمنیِ این فایل رد
//    نمی‌شود — نه پوششِ must_sayِ اورژانسی، نه تضمینِ key_number، نه فیلترِ
//    forbid. مسیرِ کلاسیک همهٔ این‌ها را دارد. تا وقتی گراف پشتِ همان تورها
//    نرفته، پیش‌فرض باید مسیرِ کلاسیک باشد (N13 هم از همین‌جا آمد).
const USE_GRAPH = process.env.USE_GRAPH === "true";

// محدودیت نرخ روی /api/analyze.
// این اندپوینت هر بار یک تا چند فراخوانِ پولیِ AvalAI می‌زند (OCR + تحلیل) و هیچ
// احراز هویتی ندارد؛ بدون سقف، هر کسی که آدرس را پیدا کند می‌تواند حساب را خالی کند.
const RATE_LIMIT_WINDOW_MIN = Number(process.env.RATE_LIMIT_WINDOW_MIN || 15);
const RATE_LIMIT_MAX        = Number(process.env.RATE_LIMIT_MAX || 20);

const analyzeLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MIN * 60 * 1000,
  limit: RATE_LIMIT_MAX,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: `تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً ${RATE_LIMIT_WINDOW_MIN} دقیقه دیگر دوباره تلاش کنید.`,
  },
  handler(req, res, _next, options) {
    // لاگِ متمایز: اگر این زیاد دیده شد و کاربران واقعی شکایت کردند،
    // احتمالاً TRUST_PROXY ست نشده و همه یک کلید شمرده می‌شوند.
    console.warn(`⚠️ rate limit خورد (key=${req.ip}) — اگر پشت پروکسی هستی TRUST_PROXY را ببین`);
    res.status(options.statusCode).json(options.message);
  },
});

const MEDLINE_BASE = "https://wsearch.nlm.nih.gov/ws/query";

// شمارش قطع‌شدن پاسخ به‌خاطر سقف توکن.
// در /health دیده می‌شود — قبل از بالا بردن maxTokens اول این را ببین.
// اگر صفر است، سقف مشکلی ندارد و بالا بردنش فقط هزینه اضافه می‌کند.
// مرزِ HTTP در avalaiClient.js است تا بشود بدون شبکه تستش کرد.
const avalai = createAvalAIClient({
  apiKey: AVALAI_API_KEY,
  baseUrl: AVALAI_BASE_URL,
  timeoutMs: AI_TIMEOUT_MS,
});
const callAvalAI = avalai.call;

// نگاشت MedlinePlus و استخراج ترم‌ها به rules/medline.js منتقل شد تا خالص و تست‌پذیر باشد.

// ============================================================
// [۳] کش ساده برای نتایج MedlinePlus
// ============================================================
const medlineCache = new Map();
const CACHE_TTL = 20 * 60 * 60 * 1000; // ۲۰ ساعت

function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseFirstSummary(xml) {
  if (!xml) return null;
  const m = xml.match(/<content name="FullSummary">([\s\S]*?)<\/content>/i);
  if (!m) return null;
  let raw = m[1]
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return stripHtml(raw);
}

function parseFirstUrl(xml) {
  if (!xml) return null;
  const m = xml.match(/<document[^>]*url="([^"]+)"/i);
  return m ? m[1] : null;
}

// ============================================================
// [۴] واکشی خلاصه یک تست از MedlinePlus
// ============================================================
async function fetchMedline(term) {
  const now = Date.now();
  const cached = medlineCache.get(term);
  if (cached && now - cached.ts < CACHE_TTL) return cached;

  try {
    const url =
      `${MEDLINE_BASE}?db=healthTopics&rettype=brief&retmax=1` +
      `&tool=khanesh&term=${encodeURIComponent(term)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/xml" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const xml = await res.text();
    const summary = parseFirstSummary(xml);
    const topicUrl = parseFirstUrl(xml);
    if (!summary) return null;
    const trimmed = summary.length > 600 ? summary.slice(0, 600) + "…" : summary;
    const result = { summary: trimmed, url: topicUrl, ts: now };
    medlineCache.set(term, result);
    return result;
  } catch (err) {
    console.error("MedlinePlus fetch error for", term, err.message);
    return null;
  }
}

// ============================================================
// [۵] ساخت بستهٔ زمینه از MedlinePlus
// ============================================================
async function buildMedlineContext(testResultsText) {
  const items = extractMedlineTerms(testResultsText);
  if (items.length === 0) return { context: "", sources: [] };

  // واکشی اینجا می‌ماند (شبکه)، چیدنِ متن در rules/medline.js است (خالص).
  // ⚠️ آن تابع عمداً sourceLine — خطِ خامِ برگه — را درج نمی‌کند؛ دلیلِ کاملش
  //    بالای formatMedlineContext نوشته شده. اگر آن echo برگردد، مسیرِ تزریقِ
  //    پرامپت از متنِ انتخابیِ مهاجم برگشته است.
  const results = await Promise.all(
    items.map(async ({ term }) => ({ term, data: await fetchMedline(term) }))
  );
  return formatMedlineContext(results);
}

// ============================================================
// [۶] پرامپت مرحله اول — OCR خالص
// ============================================================
const OCR_PROMPT = `تو یک استخراج‌کنندهٔ دقیق داده از برگهٔ آزمایش پزشکی هستی. وظیفهٔ تو فقط و فقط خواندن است. هیچ تفسیر، تحلیل، نظر پزشکی یا نتیجه‌گیری ارائه نده.

## روش خواندن
- جدول را ردیف به ردیف بخوان. هر ردیف یک تست است.
- ستون‌ها معمولاً به این ترتیب‌اند: نام تست | نتیجه (Result) | واحد (Unit) | محدوده مرجع (Normal Range)
- ستون‌ها را با دقت دنبال کن. هرگز مقدار یک ردیف را به ردیف دیگر نسبت نده.
- ستون «نتیجه» و ستون «محدوده مرجع» را با هم اشتباه نگیر. مقدار بیمار یک عدد تکی است؛ محدوده مرجع معمولاً دو عدد با خط تیره است (مثل 80 - 100). هرگز عدد ابتدای محدوده مرجع را به‌عنوان نتیجه ثبت نکن.
- قبل از ثبت هر عدد، بررسی کن که واقعاً در همان ردیفِ نام تست و در ستون درست قرار دارد.

## کامل بودن (بسیار مهم)
- هیچ ردیفی را جا نینداز. همهٔ ردیف‌های همهٔ بخش‌ها را بخوان.
- برگه معمولاً چند بخش دارد: Hematology (CBC)، Differential، Hemostasis (ESR)، Blood Biochemistry، Serology و…
- بخش بیوشیمی (قند، اوره، کراتینین، چربی، آنزیم‌های کبدی، کلسیم و…) را حتماً کامل بخوان — این بخش را فراموش نکن.
- بخش Serology / ایمونولوژی را هم کامل بخوان: Wright (رایت)، 2ME، Coombs Wright (کومبس رایت)، Widal، CRP، RF، ASO، VDRL. این بخش قبلاً جا می‌افتاد.
- در انتها تعداد ردیف‌هایی که خوانده‌ای را با تعداد ردیف‌های برگه مقایسه کن.

## نکات مهم
- حرف H یا L چسبیده به عدد (مثل «L 2.58» یا «H 104.4») یعنی High/Low. عدد را جدا کن و H/L را در فیلد flag بگذار.
- محدودهٔ مرجع را دقیقاً از روی همان برگه بخوان. از دانش خودت محدوده نساز. اگر برگه محدوده‌ای ننوشته، reference را null بگذار.
- واحد را عیناً همان‌طور که در برگه نوشته شده ثبت کن.
- تست‌هایی که در برگه نیستند را اضافه نکن.
- درصدهای Differential (Neutrophils، Lymphocytes و…) را هم به‌عنوان تست ثبت کن.
- یادداشت‌های کیفی مثل Anisocytosis (+++) را هم ثبت کن؛ value را همان متن بگذار.
- ردیف‌ها یا توضیحاتِ لامِ خونِ محیطی را هم ثبت کن، مثل Blasts (%)، Auer rods، Toxic granulation، Döhle bodies، Pelger-Huët یا Pseudo-Pelger؛ نام و value را عیناً همان‌طور که چاپ شده بنویس (مثلاً "Blasts" با value "25" و unit "%"، یا "Auer rods" با value "Present"). توضیحِ آزادِ لام (Comment/Remark/Peripheral smear) را هم با همان متن ثبت کن.
- مقادیر تیتری (رایت، 2ME، کومبس رایت، ویدال) را عیناً با همان شکل ثبت کن: "1/160" یا "1:160". آن را به عدد تبدیل نکن و ساده‌اش نکن. اگر منفی است، همان "Negative" یا "منفی" را بنویس.
- مقادیر پلاسی (CRP، RF) را هم عیناً بنویس: "3+" یا "Positive" یا "منفی". اگر عدد و واحد دارد (مثل "24 mg/L")، عدد را در value و واحد را در unit بگذار.
- اگر عددی تار، مبهم یا مخدوش است، confidence را "low" بگذار. اگر اصلاً خوانا نیست، value را null بگذار.
- اطلاعات شناسایی‌کننده (نام بیمار، کد ملی، تلفن، نام پزشک) را ثبت نکن. فقط سن و جنسیت را در صورت وجود بردار.

## خروجی
فقط JSON برگردان، بدون بک‌تیک و بدون متن اضافه. فشرده بنویس:
{
  "patient": { "age": "51 سال", "sex": "مرد" },
  "tests": [
    { "name": "WBC", "value": "5.66", "unit": "10*3/µL", "reference": "3.5 - 11", "flag": null, "confidence": "high" },
    { "name": "RBC", "value": "2.58", "unit": "10*6/ul", "reference": "3.6 - 6.1", "flag": "L", "confidence": "high" }
  ],
  "unreadable_notes": []
}

flag یکی از "H" | "L" | null است.
confidence یکی از "high" | "low" است.`;

// ============================================================
// [۷] System Prompt مرحله دوم — تحلیل
// نکته: از مدل نمی‌خواهیم فهرست کامل تست‌ها را تکرار کند،
// چون آن فهرست را خودمان از OCR داریم. این کار توکن را
// آزاد می‌کند تا تحلیل ناقص نماند.
// ============================================================
const SYSTEM_PROMPT = `شما یک تحلیلگر مجرب نتایج آزمایش‌های پزشکی هستید که تفسیری اولیه، دقیق و آموزشی به زبان ساده فارسی ارائه می‌دهید. شما پزشک نیستید و هرگز تشخیص قطعی نمی‌دهید یا دارو تجویز نمی‌کنید. هدف شما افزایش آگاهی بیمار است، نه آموزش تخصصی پزشکی.

## استفاده از دانش پزشکی معتبر
برای تفسیر نتایج، از دانش پزشکی همسو با معتبرترین منابع علمی و راهنماهای بین‌المللی استفاده کن، از جمله: CLSI، UpToDate، Merck Manual Professional، LabTestsOnline، NIH و AACC. از این دانش برای درک عملکرد تست‌ها، ارتباط بین نتایج، اهمیت بالینی، علل احتمالی و ارائه توصیه‌های عمومی استفاده کن. پاسخ باید از نظر علمی دقیق و همسو با این منابع باشد.

## قانون طلایی: فقط بر اساس محدوده‌های ارائه‌شده قضاوت کن
برای هر تست، محدودهٔ مرجع دقیق در ورودی به تو داده می‌شود. قضاوت «نرمال / بالا / پایین» را فقط و فقط بر اساس همین محدوده‌های ارائه‌شده انجام بده، نه بر اساس دانش عمومی خودت. اگر مقداری داخل محدودهٔ ارائه‌شده است، آن را نرمال بدان — حتی اگر با محدوده‌هایی که در ذهن داری کمی فرق کند. هرگز تستی را که داخل محدوده است «بالا» یا «پایین» توصیف نکن.

## زبان ساده و قابل فهم برای عموم
- پاسخ را کاملاً به فارسی روان و ساده بنویس، طوری که فردی بدون دانش پزشکی هم مفهوم آن را درک کند.
- از اصطلاحات پیچیده و توضیحات بیش از حد تخصصی خودداری کن. اگر اصطلاح پزشکی ضروری بود، بلافاصله معنی ساده‌اش را هم بگو.
- پاسخ باید کوتاه، روان، کاربردی و کاملاً قابل فهم باشد.

## توجه به شدت انحراف (بسیار مهم)
صرف خارج بودن از محدوده کافی نیست؛ «میزان» انحراف را بسنج و لحن و اهمیت را متناسب با آن تنظیم کن:
- انحراف جزئی (تا حدود ۱۰ تا ۱۵ درصد فراتر از مرز): معمولاً اهمیت بالینی کمی دارد. با لحن آرام و اطمینان‌بخش توصیف کن و صرفاً پیگیری ساده یا تکرار آزمایش را پیشنهاد بده. از ایجاد نگرانی بی‌مورد خودداری کن. مثال: اوره‌ای که فقط ۲ واحد بالاتر از حد نرمال است، ارزش بالینی چندانی ندارد و نباید مثل یک مشکل جدی توصیف شود.
- انحراف متوسط: شایستهٔ توجه است؛ ارزیابی توسط پزشک در آیندهٔ نزدیک را پیشنهاد بده.
- انحراف شدید یا مقادیر بحرانی: واضح، ساده و بدون اغراق بیان کن و مراجعهٔ سریع به پزشک را توصیه کن.

## تحلیل به‌صورت تصویر کلی (تشخیص الگو)
نتایج را جدا از هم نبین. مهم‌ترین یافته‌ها را به زبان ساده توضیح بده و در صورت مشاهده الگوهای مرتبط، آن‌ها را توضیح بده (مثلاً هموگلوبین پایین همراه با فریتین پایین و MCV پایین = الگوی کم‌خونی فقر آهن). فقط در صورت نیاز علل احتمالی را بیان کن. اگر چند انحراف جزئی و بی‌ربط وجود دارد، لازم نیست همه را بزرگ کنی.

## دقت در تشخیص تست‌ها
اگر ورودی از روی عکس خوانده شده، به واحدها دقت کن تا تست‌ها را اشتباه نگیری:
- هموگلوبین (Hb): واحد g/dL، معمولاً بین ۱۲ تا ۱۸
- MCH: واحد pg، معمولاً بین ۲۷ تا ۳۳
- MCHC: واحد g/dL، معمولاً بین ۳۲ تا ۳۶
- هماتوکریت (HCT): واحد درصد، معمولاً بین ۳۶ تا ۵۳
این تست‌ها را با هم اشتباه نگیر. اگر عددی با واحدش همخوانی ندارد یا بخشی ناخوانا است، اعلام کن و از حدس زدن خودداری کن.

## استفاده از منبع MedlinePlus
اگر بخش «زمینه معتبر از MedlinePlus» در ورودی بود، از آن به‌عنوان مرجع استفاده کن. این اطلاعات انگلیسی است؛ آن را بفهم اما پاسخ را کاملاً فارسی بنویس و عیناً کپی نکن؛ آن را متناسب با مقادیر بیمار به کار ببر.

## اصول ایمنی و حریم خصوصی
- هرگز تشخیص قطعی، نسخه درمانی یا تجویز دارو ارائه نکن. از عباراتی مانند «ممکن است نشان‌دهنده...»، «می‌تواند با... مرتبط باشد» یا «نیاز به بررسی بیشتر توسط پزشک دارد» استفاده کن.
- فقط توصیه‌های عمومی (تغذیه، سبک زندگی، تکرار آزمایش، مراجعه به پزشک) ارائه بده و از توصیه‌های درمانی تخصصی خودداری کن.
- سن، جنسیت و بیماری‌های زمینه‌ای بیمار را در تفسیر لحاظ کن.
- اگر اطلاعات شناسایی‌کننده (نام، کد ملی، تلفن) در ورودی بود، آن را تکرار نکن و فقط به داده‌های بالینی استناد کن.

## قالب خروجی
خروجی را دقیقاً به صورت JSON معتبر و فقط JSON برگردان (بدون بک‌تیک، بدون متن اضافه):
{
  "summary": "خلاصه یک‌پاراگرافی به زبان ساده؛ لحن متناسب با شدت. اگر مورد بحرانی هست، هشدار همین‌جا تکرار شود",
  "abnormal_results": [ { "test": "نام تست", "value": "مقدار و واحد", "severity": "خفیف|متوسط|بحرانی", "note": "توضیح کوتاه و ساده متناسب با شدت انحراف" } ],
  "interpretation": "تحلیل پیوسته و ساده با در نظر گرفتن شرایط بیمار، تصویر کلی و شدت انحرافات",
  "general_recommendations": ["توصیه ۱", "توصیه ۲"],
  "disclaimer": "هشدار متناسب با شدت و یادآوری مراجعه به پزشک",
  "has_critical": true
}

مهم: فهرست کامل تست‌ها را در خروجی تکرار نکن — آن فهرست جداگانه به کاربر نشان داده می‌شود. فقط روی تحلیل تمرکز کن.
در abnormal_results فقط تست‌هایی را بیاور که واقعاً خارج از محدودهٔ ارائه‌شده هستند. انحرافات بسیار جزئی را می‌توانی با severity «خفیف» و لحن اطمینان‌بخش بیاوری. has_critical فقط وقتی true است که حداقل یک مقدار در محدودهٔ بحرانی واقعی باشد.`;


// ============================================================
// [۱۰] مرحله اول — خواندن عکس (OCR خالص)
async function readImage(imageDataUrl, label = "") {
  let lastErr;

  for (let attempt = 1; attempt <= OCR_RETRIES + 1; attempt++) {
    try {
      const raw = await callAvalAI({
        model: VISION_MODEL,
        temperature: 0,
        maxTokens: OCR_MAX_TOKENS,
        messages: [
          { role: "system", content: OCR_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "این برگهٔ آزمایش را کامل و ردیف به ردیف بخوان — همهٔ بخش‌ها شامل بیوشیمی. طبق قالب JSON برگردان." },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
      });

      const parsed = safeParseJson(raw);
      if (!parsed) throw new Error("ocr_parse_failed");

      const n = Array.isArray(parsed.tests) ? parsed.tests.length : 0;
      console.log(`OCR ${label} خواند: ${n} تست (تلاش ${attempt})`);

      // ⚠️ اگر خیلی کم خواند، احتمالاً به سقف توکن خورده.
      //    نمونه واقعی: برگه ۲۰ ردیفی → ۲ تست. کاربر فکر می‌کند بقیه نرمال‌اند.
      if (n > 0 && n < 5) {
        console.warn(`⚠️ OCR ${label} فقط ${n} تست خواند — احتمال قطع‌شدن. سقف: ${OCR_MAX_TOKENS}`);
      }
      return parsed;

    } catch (e) {
      lastErr = e;
      const retryable =
        e.message === "upstream_timeout" ||
        e.message === "upstream_error" ||
        e.message === "upstream_rate_limit" ||
        e.message === "ocr_parse_failed";

      if (!retryable || attempt > OCR_RETRIES) break;

      // ۴۲۹ صبر بیشتری می‌خواهد — اگر Retry-After داد، همان را احترام بگذار
      // ۴۲۹ صبر تصاعدی می‌خواهد: 8s → 16s → 32s
      const wait =
        e.message === "upstream_rate_limit"
          ? (e.retryAfter ? e.retryAfter * 1000 : 8000 * Math.pow(2, attempt - 1))
          : 2000 * attempt;
      console.warn(`OCR ${label} تلاش ${attempt} شکست (${e.message}) — ${wait}ms صبر و تلاش دوباره`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }

  console.error(`OCR ${label} نهایتاً شکست:`, lastErr?.message);
  // علت شکست را throw می‌کنیم تا فراخواننده (readImages) آن را محلی بگیرد؛
  // map سراسری قبلی بین درخواست‌های همزمان race داشت.
  throw lastErr ?? new Error("خوانده نشد");
}

// ============================================================
// [۱۰-ب] خواندن چند عکس — همزمانی محدود
//
// چرا Promise.all خام نه:
//   ۱. اگر AvalAI محدودیت نرخ داشته باشد، ۵ درخواست همزمان ۴۲۹ می‌گیرد
//   ۲. خطای یک صفحه نباید بقیه را دور بریزد
// ============================================================
// onPage(pageNumber, testCount) — اختیاری. چون IMAGE_CONCURRENCY=1 است،
// صفحات واقعاً یکی‌یکی و با فاصلهٔ تقریباً یکنواخت تمام می‌شوند؛ پس این
// یک سیگنالِ پیشرفتِ صادق و یکنواخت است، نه نوارِ ساختگی.
async function readImages(imageDataUrls, onPage) {
  const results = new Array(imageDataUrls.length);
  let cursor = 0;

  async function worker() {
    while (cursor < imageDataUrls.length) {
      const i = cursor++;
      const label = `صفحه ${i + 1}`;
      try {
        const ocr = await readImage(imageDataUrls[i], label);
        results[i] = { page: i + 1, ok: true, ocr };
        onPage?.(i + 1, Array.isArray(ocr?.tests) ? ocr.tests.length : null);
      } catch (e) {
        results[i] = { page: i + 1, ok: false, error: e.message || "خوانده نشد" };
        onPage?.(i + 1, null);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(IMAGE_CONCURRENCY, imageDataUrls.length) }, worker)
  );

  return results;
}

// ============================================================
// [۱۰-ج] ادغام صفحات یک برگه
//
// یک برگهٔ آزمایش معمولاً ۲ تا ۳ صفحه است (هماتولوژی/بیوشیمی/ادرار).
// پس تست تکراری نباید وجود داشته باشد. اگر بود یعنی:
//   - کاربر عکس تکراری فرستاده، یا
//   - OCR اشتباه خوانده
// در هر دو حالت به کاربر هشدار می‌دهیم.
// ============================================================
function normName(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[\s._\-]/g, "")
    .replace(/[يی]/g, "ی")
    .replace(/[كک]/g, "ک")
    .trim();
}

export function mergePages(pageResults) {
  const ok      = pageResults.filter((p) => p.ok);
  const failed  = pageResults.filter((p) => !p.ok).map((p) => p.page);
  const tests   = [];
  const seen    = new Map();
  const dupes   = [];
  const notes   = [];
  const patients = [];

  for (const p of ok) {
    const o = p.ocr;
    if (o.patient) patients.push({ page: p.page, ...o.patient });
    if (Array.isArray(o.unreadable_notes)) notes.push(...o.unreadable_notes.filter(Boolean));
    if (!Array.isArray(o.tests)) continue;

    // 🔴 باگِ واقعی (P47، T18): «اولی برنده» ردیف‌های هم‌نامِ صفحه‌ها را یکی می‌کرد. برگهٔ CBC و
    //    برگهٔ منی هر دو «WBC» دارند؛ اگر صفحهٔ منی اول بارگذاری می‌شد، WBCِ CBC بی‌صدا دور ریخته
    //    می‌شد. ردیف‌های صفحهٔ منی با پیشوندِ «semen:» ادغام می‌شوند تا هر دو بمانند.
    const semenPrefix = isSemenPage(o.tests) ? "semen:" : "";
    // 🔴 specs/008 دور ۲ (CR6، N25): «HBs»ِ صفحهٔ هپاتیت و «HbS»ِ صفحهٔ الکتروفورز یک کلید می‌شدند و اولی برنده بود.
    const electroPage = isHbElectroPage(o.tests);
    // 🔴 برگهٔ واقعی ۲۰۲۶-۰۹-۲۴ (Sysmex): خوانشِ عکس ردیفِ درصدی را بی «%» در نام برگرداند — «NEUT 1.38 10^3/uL» و
    //    «NEUT 39.5 %». هر دو یک کلید می‌شدند، دومی دور ریخته می‌شد و هفت هشدارِ «در صفحه 1 و 1 با مقادیر متفاوت» به بیمار
    //    می‌رسید. روی *یک* صفحه، ردیفِ ٪ای که هم‌نامِ یک ردیفِ غیرِ٪ است همان ردیفِ درصدی است ⇒ «NEUT%».
    const isPct = (x) => /%/.test(String(x.unit || "")) || /%\s*$/.test(String(x.value ?? ""));
    // فقط وقتی ردیفِ دیگر *شمارشِ سلول* است (10^3/µL، 10^9/L، …) — «HBs: Positive» کنارِ «HbS 38 %» نه (T26، N25).
    const isCount = (x) => /10\s*[\^*]\s*[369]|k\s*\/|×\s*10|\/\s*[uµμ]l/i.test(String(x.unit || ""));
    const absNames = new Set(o.tests.filter((x) => x?.name && !isPct(x) && isCount(x)).map((x) => normName(x.name)));

    for (const t0 of o.tests) {
      if (!t0 || !t0.name) continue;
      const t = isPct(t0) && !/%/.test(t0.name) && absNames.has(normName(t0.name)) ? { ...t0, name: `${t0.name}%` } : t0;
      // 🔴 دور ۳ (R3-CR4): «HbS 35 %» و «HBs: Positive» روی *یک* صفحه هر دو «electro:hbs» می‌شدند و دومی می‌افتاد.
      //    نامِ دوپهلو شکلِ مقدارش را هم در کلید دارد (٪ / عدد / متن) — همان شاهدی که adapter برای تشخیص می‌خواند.
      const amb = isHbAmbiguousName(t.name);
      const v = String(t.value ?? "");
      const shape = !amb ? ""
        : /%/.test(String(t.unit || "")) || /%\s*$/.test(v) ? ":pct"
        : /\d/.test(v) && !/[a-zA-Zء-ی]/.test(v) ? ":num" : ":txt";
      const key = semenPrefix + (electroPage && amb ? "electro:" : "") + normName(t.name) + shape;

      if (seen.has(key)) {
        const prev = tests[seen.get(key)];
        if (String(prev.value) !== String(t.value)) {
          dupes.push({
            name: t.name,
            pages: [prev._page, p.page],
            values: [prev.value, t.value],
          });
        }
        continue; // اولی را نگه می‌داریم
      }

      seen.set(key, tests.length);
      tests.push({ ...t, _page: p.page });
    }
  }

  // چک ناسازگاری بیمار.
  // نکته: پرامپت OCR عمداً نام و کد ملی را نمی‌خواند (حریم خصوصی).
  // پس فقط سن و جنسیت را داریم — همان برای هشدار کافی است.
  let mismatch = null;
  const ages = [...new Set(patients.map((p) => String(p.age || "").trim()).filter(Boolean))];
  const sexes = [...new Set(patients.map((p) => String(p.sex || "").trim()).filter(Boolean))];
  if (ages.length > 1 || sexes.length > 1) {
    mismatch = { ages, sexes };
  }

  const patient = patients.find((p) => p.age || p.sex) || patients[0] || null;

  return {
    tests,
    patient,
    failedPages: failed,
    duplicates: dupes,
    unreadableNotes: notes,
    mismatch,
    okCount: ok.length,
  };
}

// ============================================================
// [۱۱] تبدیل خروجی OCR به متن برای مرحله تحلیل
// ============================================================
// export فقط برای T29 (job fff90f58).
export function ocrToText(ocr) {
  if (!ocr || !Array.isArray(ocr.tests)) return { text: "", warnings: [] };

  const lines = [];
  const warnings = [];

  for (const t of ocr.tests) {
    if (!t || !t.name) continue;

    // job fff90f58 (E2): «---.-» (جای‌نگهدارِ دستگاه) هم مثلِ خالی ناخواناست — همان قاعدهٔ adapter.js.
    if (t.value === null || t.value === undefined || t.value === "" || isPlaceholderValue(t.value)) {
      warnings.push(`${t.name}: مقدار خوانا نبود و در تحلیل لحاظ نشد.`);
      continue;
    }

    let line = `${t.name}: ${t.value}`;
    if (t.unit) line += ` ${t.unit}`;
    if (t.reference) line += ` (محدوده مرجع: ${t.reference})`;
    if (t.flag) line += ` [${t.flag}]`;

    if (t.confidence === "low") {
      line += " ⚠️نامطمئن";
      warnings.push(`${t.name}: خواندن این مقدار مطمئن نبود — لطفاً با برگه مقایسه کنید.`);
    }

    lines.push(line);
  }

  if (Array.isArray(ocr.unreadable_notes)) {
    for (const n of ocr.unreadable_notes) {
      if (n) warnings.push(n);
    }
  }

  return { text: lines.join("\n"), warnings };
}

// ============================================================
// [۱۲] ساخت فهرست extracted_tests مستقیماً از OCR
// این‌طوری هیچ ردیفی جا نمی‌افتد و مدل تحلیل نمی‌تواند
// اعداد را تغییر دهد.
// ============================================================
// 🔴 برگهٔ واقعی ۲۰۲۶-۰۹-۲۴ (Sysmex): خوانشِ عکس بازه‌های درصدی را روی ردیف‌های شمارشِ مطلق نشاند —
//    «NEUT 1.38 10^3/uL — 42.2–75.2» و «NEUT% 39.5 % — —». موتور از بازهٔ خودش حکم داد (درست)، ولی بیمار عدد را کنارِ
//    بازه‌ای می‌دید که مالِ آن نیست. قاعده: بازه‌ای که *کفِ* آن از *سقفِ* شمارشِ مطلقِ همان سلول (بازهٔ موتور) بالاتر
//    است نمی‌تواند مالِ ردیفِ مطلق باشد؛ به ردیفِ ٪ِ همان سلول (اگر بی‌بازه است) منتقل می‌شود، وگرنه «—». فقط نمایش.
const DIFF_CELLS = [
  [/^(neut|neutrophils?|seg)$/, "NEUT_ABS"], [/^(lymph|lymphocytes?)$/, "LYMPH_ABS"],
  [/^(mono|monocytes?)$/, "MONO_ABS"], [/^(eo|eos|eosinophils?)$/, "EOS_ABS"], [/^(baso|basophils?)$/, "BASO_ABS"],
];
const diffBase = (name) => String(name).toLowerCase().replace(/[#%]|abs(olute)?|count|[^a-z]/g, "");
const isPctRow = (t) => /%/.test(String(t.name)) || /^%$/.test(String(t.unit ?? "").trim());
function refRange(ref) {
  const m = String(ref ?? "").match(/(-?[\d.]+)\s*[-–]\s*(-?[\d.]+)/);
  return m ? [Number(m[1]), Number(m[2])] : null;
}
/** فیلدهای پرشدهٔ فرم روی patientِ برگه؛ فیلدِ خالی/null جای مقدارِ برگه را نمی‌گیرد. */
export function mergePatient(sheet, form) {
  const filled = Object.fromEntries(Object.entries(form ?? {}).filter(([, v]) => v != null && v !== ""));
  const out = { ...(sheet ?? {}), ...filled };
  return Object.keys(out).length ? out : null;
}

export function fixShiftedDiffRefs(tests) {
  const rows = tests.map((t) => ({ ...t }));
  for (const t of rows) {
    if (isPctRow(t) || !/10\s*[\^*]\s*3|k\s*\/|×\s*10/i.test(String(t.unit ?? ""))) continue;
    const base = diffBase(t.name);
    const key = DIFF_CELLS.find(([re]) => re.test(base))?.[1];
    const ref = refRange(t.reference);
    const eng = key ? getRef(key, null, null) : null;
    if (!key || !ref || !eng) continue;
    const engHi = eng[1] > 100 ? eng[1] / 1000 : eng[1];      // موتور سلول/µL دارد؛ برگه ×10³/µL
    if (!(ref[0] > engHi)) continue;
    const pct = rows.find((x) => x !== t && isPctRow(x) && diffBase(x.name) === base);
    if (pct && (!pct.reference || /^[\s—-]*$/.test(String(pct.reference)))) pct.reference = t.reference;
    t.reference = "";
  }
  return rows;
}

function ocrToExtractedTests(ocr) {
  if (!ocr || !Array.isArray(ocr.tests)) return [];

  return fixShiftedDiffRefs(ocr.tests)
    .filter((t) => t && t.name && t.value !== null && t.value !== undefined && t.value !== "")
    .map((t) => {
      let value = String(t.value);
      if (t.unit) value += ` ${t.unit}`;
      if (t.confidence === "low") value += " ⚠️";
      return {
        test: t.name,
        value,
        reference: t.reference || "—",
      };
    });
}

// ============================================================
// [۱۳] ساخت پیام کاربر برای مرحله تحلیل
// ============================================================
function buildAnalysisMessage(patientInfo, testResults, medlineContext, fromImage) {
  let text =
    `<patient_info>\n${patientInfo || "ارائه نشده"}\n</patient_info>\n\n` +
    `<test_results>\n${testResults}\n</test_results>`;

  if (fromImage) {
    text +=
      "\n\nتوجه: این مقادیر از روی عکس برگه آزمایش خوانده شده‌اند. " +
      "مواردی که با ⚠️نامطمئن علامت خورده‌اند ممکن است دقیق نباشند؛ " +
      "در تفسیر با احتیاط بیشتری به آن‌ها استناد کن.";
  }

  if (medlineContext) {
    text += `\n\n<زمینه معتبر از MedlinePlus>\n${medlineContext}\n</زمینه معتبر از MedlinePlus>`;
  }

  return { role: "user", content: text };
}

// ============================================================
// [۱۴] نقطه پایانی اصلی
// ============================================================
const analyzeHandler = async (req, res) => {
  // ── ردیابی ──
  // یک شناسه برای کلِ عبورِ این درخواست از یازده مرحله. وقتی خروجی با
  // پاسخِ مرجعِ بالینی نمی‌خواند، این تنها راهِ تفکیکِ «موتور اشتباه تشخیص
  // داد» از «یافته به مدل نرسید» از «مدل بازنویسی‌اش را خراب کرد» است.
  // پیش‌فرض خاموش؛ خاموش که باشد beginTrace یک شیءِ بی‌اثر می‌دهد و هیچ
  // شاخهٔ if‌ای در ادامهٔ این تابع لازم نمی‌شود. (trace.js)
  const tr = beginTrace({ traceId: req.headers["x-trace-id"] || undefined, route: req.path });
  req._trace = tr;
  res.setHeader("X-Trace-Id", tr.id);

  try {
    const { patientInfo, testResults, imageDataUrl, imageDataUrls, tests, patient } = req.body || {};

    tr.stage("intake", {
      // بایتِ عکس ثبت نمی‌شود — فقط اینکه چند تا بود و چقدر
      images: (Array.isArray(imageDataUrls) ? imageDataUrls : imageDataUrl ? [imageDataUrl] : [])
        .map((u) => ({ bytes: typeof u === "string" ? u.length : 0 })),
      text_len: typeof testResults === "string" ? testResults.length : 0,
      manual_tests: Array.isArray(tests) ? tests : null,
      patient: patient ?? null,
      patient_info: patientInfo ?? null,
    });

    // سازگاری عقب‌رو: فرانت قدیمی imageDataUrl تکی می‌فرستد و هنوز کار می‌کند
    let images = [];
    if (Array.isArray(imageDataUrls)) images = imageDataUrls;
    else if (typeof imageDataUrl === "string") images = [imageDataUrl];

    images = images.filter((u) => typeof u === "string" && u.startsWith("data:image"));

    if (images.length > MAX_IMAGES) {
      return res.status(400).json({
        error: `حداکثر ${MAX_IMAGES} عکس در هر بار. شما ${images.length} عکس فرستادید.`,
      });
    }

    const hasText = testResults && testResults.trim();
    const hasImage = images.length > 0;

    if (!hasText && !hasImage) {
      return res.status(400).json({ error: "نه متن آزمایش وارد شده و نه عکسی آپلود شده است." });
    }

    let finalText = hasText ? testResults : "";
    let lastMergedOcr = null;   // برای موتور
    let ocrWarnings = [];
    let ocrPatient = null;
    let extractedTests = [];
    let pageInfo = null;

    // ---- مرحله ۱: خواندن عکس‌ها ----
    if (hasImage) {
      console.log(`دریافت ${images.length} عکس — شروع OCR با همزمانی ${IMAGE_CONCURRENCY}`);
      // req._onPage را فقط مسیرِ ناهمگام (job) ست می‌کند؛ مسیر همگام undefined است.
      // روی req نشسته نه در سطحِ ماژول، تا با چند درخواستِ همزمان قاطی نشود.
      const pages = await readImages(images, req._onPage);
      tr.stage("ocr", { pages: pages.map((p) => ({ ok: !p.error, error: p.error ?? null, tests: p.tests ?? null, patient: p.patient ?? null })) });

      const merged = mergePages(pages);
      tr.stage("merge", {
        ok_count: merged.okCount,
        failed_pages: merged.failedPages,
        duplicates: merged.duplicates,
        mismatch: merged.mismatch ?? null,
        tests: merged.tests,
        patient: merged.patient,
      });

      if (merged.okCount === 0) {
        // ⚠️ باگ قبلی: هر شکستی «عکس ناخوانا» گزارش می‌شد.
        //    اگر علت ۴۲۹ بود، پیام کاملاً گمراه‌کننده بود —
        //    کاربر عکس بهتر می‌گرفت در حالی که مشکل عکس نبود.
        const allRateLimited = pages.every((p) => p.error === "upstream_rate_limit");
        if (allRateLimited) {
          return res.status(429).json({
            error: "سرویس هوش مصنوعی در حال حاضر شلوغ است. لطفاً یک دقیقه دیگر دوباره تلاش کنید.",
            retry_after: 60,
          });
        }
        return res.status(502).json({
          error: "هیچ‌کدام از عکس‌ها خوانده نشد. لطفاً عکس واضح‌تری بگیرید یا مقادیر را دستی وارد کنید.",
          failed_pages: merged.failedPages,
        });
      }

      if (merged.mismatch && !req.body.ignorePatientMismatch) {
        return res.status(422).json({
          error:
            "به‌نظر می‌رسد عکس‌ها مربوط به یک بیمار نیستند. " +
            "لطفاً فقط صفحات یک برگه آزمایش را با هم آپلود کنید.",
          code: "PATIENT_MISMATCH",
          detail: merged.mismatch,
        });
      }

      const mergedOcr = {
        tests: merged.tests,
        // 🔴 برگهٔ واقعی ۲۰۲۶-۰۹-۲۴: فرم «مرد» را پیش‌فرض داشت و همین که age یا sex آمده بود، کلِ patientِ فرم
        //    جای patientِ برگه می‌نشست — زنی که جنسیت را دست نزده بود با بازهٔ مرد سنجیده می‌شد. حالا فیلدبه‌فیلد:
        //    هر فیلدی که کاربر پر کرده برنده است، و بقیه (مثلاً جنسیتِ چاپ‌شده روی برگه) از خودِ برگه می‌آید.
        patient: mergePatient(merged.patient, patient),
        unreadable_notes: merged.unreadableNotes,
      };
      lastMergedOcr = mergedOcr;

      const { text, warnings } = ocrToText(mergedOcr);
      if (!text) {
        return res.status(422).json({
          error: "هیچ مقدار خوانایی در عکس‌ها پیدا نشد. لطفاً عکس واضح‌تری بگیرید یا مقادیر را دستی وارد کنید.",
          ocr_warnings: warnings,
          failed_pages: merged.failedPages,
        });
      }

      ocrWarnings = warnings;
      ocrPatient = merged.patient;
      extractedTests = ocrToExtractedTests(mergedOcr);

      // صفحهٔ ناموفق نباید بی‌صدا رد شود — کاربر باید بداند تفسیر ناقص است
      if (merged.failedPages.length) {
        ocrWarnings.push(
          `صفحه ${merged.failedPages.join(" و ")} خوانده نشد. ` +
          `تفسیر فقط بر اساس ${merged.okCount} صفحه‌ای است که خوانده شد.`
        );
      }

      for (const d of merged.duplicates) {
        ocrWarnings.push(
          `«${d.name}» در صفحه ${d.pages.join(" و ")} با مقادیر متفاوت (${d.values.join(" و ")}) خوانده شد. ` +
          `مقدار صفحه ${d.pages[0]} استفاده شد — لطفاً با برگه مقایسه کنید.`
        );
      }

      pageInfo = { total: images.length, read: merged.okCount, failed: merged.failedPages };
      console.log(`OCR تمام: ${merged.okCount}/${images.length} صفحه، ${merged.tests.length} تست`);

      finalText = hasText ? `${testResults}\n\n--- خوانده‌شده از عکس ---\n${text}` : text;
    }

    // ---- ورود دستی: ساخت ورودی موتور از مقادیر ساختاریافتهٔ فرانت ----
    // ⚠️ قبلاً هر درخواست متنی مستقیم به LLM می‌رفت و موتور قواعد اصلاً اجرا نمی‌شد؛
    //    یعنی شدت و has_critical را خود مدل قضاوت می‌کرد. مثال واقعی: Hb=9.2 در زن
    //    (CTCAE گرید ۲، فوریت this_week) به‌صورت «بحرانی — مراجعه فوری» نمایش داده شد.
    //    رشتهٔ نمایشی فارسی عمداً دوباره parse نمی‌شود؛ فرانت ساختار را می‌فرستد.
    if (!hasImage && Array.isArray(tests) && tests.length) {
      const manualTests = tests
        .map((t) => ({
          name: String(t?.name ?? t?.key ?? "").trim(),
          value: typeof t?.value === "number" ? t.value : parseFloat(t?.value),
          unit: t?.unit ?? "",
        }))
        .filter((t) => t.name && Number.isFinite(t.value));

      if (manualTests.length) {
        lastMergedOcr = {
          tests: manualTests,
          // موتور سن را فقط از patient.age می‌خواند — سطح بالا نادیده گرفته می‌شود
          // و سن null باعث اعمال محدودهٔ بزرگسال روی کودک می‌شود.
          //
          // ⚠️ conditions هم باید بیاید. از وقتی grade.js درجه‌بندی CTCAE را به
          // بیمارِ سرطانی مشروط کرد، این دیگر «فقط زمینه برای لحن» نیست بلکه
          // ورودیِ درجه‌بندی است. مسیر عکس (خط ~۷۲۶) کلِ patient را پاس می‌دهد،
          // پس اگر اینجا بازسازیِ دستی فقط age/sex بدهد، یک بیمارِ سرطانی که
          // مقادیر را تایپ می‌کند درجهٔ CTCAE نمی‌گیرد ولی همان بیمار با عکسِ
          // همان برگه می‌گیرد — یک خروجی برای دو مسیرِ ورودی.
          patient: {
            age: patient?.age ?? null,
            sex: patient?.sex ?? null,
            conditions: patient?.conditions ?? [],
            // P53 پرسش ۲: بارداری ورودیِ درجه‌بندیِ Hb است (کفِ ۱۱.۰)، نه فقط لحن — مسیرِ عکس کلِ patient را پاس می‌دهد.
            pregnant: patient?.pregnant === true,
          },
          unreadable_notes: [],
        };
      }
    }

    // ---- زمینه MedlinePlus ----
    let medlineContext = "";
    let medlineSources = [];
    try {
      const { context, sources } = await buildMedlineContext(finalText);
      medlineContext = context;
      medlineSources = [...new Set(sources || [])];   // یکتا
    } catch (e) {
      console.error("MedlinePlus context build failed:", e.message);
    }

    // ---- اطلاعات بیمار ----
    let patientText = patientInfo || "";
    if (!patientText && ocrPatient) {
      const bits = [];
      if (ocrPatient.age) bits.push(`سن: ${ocrPatient.age}`);
      if (ocrPatient.sex) bits.push(`جنسیت: ${ocrPatient.sex}`);
      if (bits.length) patientText = bits.join("، ") + " (از روی برگه خوانده شد)";
    }

    // ---- مرحله ۲: تحلیل ----
    let raw, parsed, engineOut = null, patternOut = null;

    // مسیر موتور برای هر دو ورودی: عکس (از OCR) و ورود دستی (ساختاریافته).
    // اگر موتور هیچ‌کدام از تست‌ها را نشناخت، به مسیر قدیمی برمی‌گردیم تا
    // کاربر به‌جای تفسیر، دست خالی نماند.
    let engineCandidate = null;
    if (USE_ENGINE && lastMergedOcr) {
      engineCandidate = runEngine(lastMergedOcr);
      // job c138671c (D10): برای نوزاد، فهرستِ «برای مطالعهٔ بیشتر» فقط صفحه‌های عمومیِ شمارشِ خونِ بزرگسال بود.
      //   صفحهٔ نوزادیِ MedlinePlus (وجودش ۲۰۲۶-۰۹-۲۸ بررسی شد) اضافه می‌شود — همان فهرست، نه منبعِ نتیجه‌گیری.
      if (isNeonate(engineCandidate.age) && !medlineSources.includes(NEWBORN_MEDLINE_URL)) {
        medlineSources = [...medlineSources, NEWBORN_MEDLINE_URL];
      }

      // ⚠️ adapter و grade عمداً دو مرحلهٔ جدا ثبت می‌شوند، هرچند runEngine
      //    یک فراخوان است. علتش انتسابِ خطاست: «نامِ تست نگاشت نشد» (N2) و
      //    «مقدار در برابر واحدِ اشتباه سنجیده شد» (N3) دو نقصِ متفاوت‌اند و
      //    اگر زیرِ یک مرحله بنشینند، مکان‌یاب نمی‌تواند تفکیکشان کند.
      tr.stage("adapter", {
        mapped: engineCandidate.graded.map((g) => ({ key: g.test, value: g.value })),
        unmapped: engineCandidate.unmapped,
        no_ref: engineCandidate.noRef,
        unit_conversions: engineCandidate.unitConversions ?? [],
        qual: engineCandidate.qual,
        age: engineCandidate.age,
        sex: engineCandidate.sex,
      });
      tr.stage("grade", {
        graded: engineCandidate.graded.map((g) => ({
          key: g.test, value: g.value, range: g.range, abnormal: !!g.abnormal,
          dir: g.dir ?? null, level: g.level ?? null, ctcaeGrade: g.ctcaeGrade ?? null,
          mode: g.mode ?? null, tag: g.tag ?? null, refSource: g.refSource ?? null,
        })),
        abnormal: engineCandidate.abnormal.map((a) => a.test),
        indices: engineCandidate.indices,
      });

      // ⚠️ فصل ۲۶ (P47، research R6): برگه‌ای که *فقط* مقدارِ بی‌قضاوت یا آستانه‌دار دارد (FSHِ
      //    بی‌روز، بتا اچ‌سی‌جی، پروژسترونِ روزِ ۲۱) هیچ تستِ نمره‌داری ندارد، ولی قاعده‌ای مالکش
      //    است. پیش از این به مسیرِ قدیمِ بی‌موتور می‌رفت. «no_range» عمداً شمرده نمی‌شود: آن
      //    کلیدها مالک ندارند و برگهٔ فقط-AMH در مسیرِ موتور «همه‌چیز طبیعی است» می‌گرفت (N2).
      //    این شرط فقط *همراهِ* قاعدهٔ reproductive_hormone_context درست است — آزمونِ T19.
      const ownedUngraded = Object.values(engineCandidate.ungraded ?? {})
        .some((u) => u.reason !== "no_range");
      // specs/004 (FR-009): کلیدِ شناخته‌شدهٔ بی‌بازه (noRef) هم مسیرِ موتور را نگه می‌دارد. حالا که
      //    buildNormalResult برای noRef «طبیعی است» نمی‌گوید، دلیلِ کامنتِ بالا («فقط-AMH ⇒ طبیعی») دیگر
      //    برقرار نیست — و مسیرِ قدیم یعنی مدل خودش قضاوت کند (T21).
      if (engineCandidate.graded.length === 0 && !ownedUngraded && !(engineCandidate.noRef?.length)) {
        console.warn(
          "⚠️ موتور هیچ تستی را نگاشت نکرد — برگشت به مسیر قدیم. " +
          `نگاشت‌نشده: ${engineCandidate.unmapped.join(", ") || "—"}`
        );
        engineCandidate = null;
      }
    }

    if (engineCandidate) {
      engineOut = engineCandidate;
      patternOut = runPatterns(engineOut);

      tr.stage("patterns", {
        findings: patternOut.findings.map((f) => ({
          rule_id: f.rule_id, urgency: f.urgency, headline: f.headline,
          must_say: f.must_say, action: f.action, key_number: f.key_number ?? null,
          suggest: f.suggest ?? [], forbid: f.forbid ?? [], warnings: f.warnings ?? [],
          protected: f.protected ?? [],
        })),
        overall_urgency: patternOut.overall_urgency,
        has_critical: patternOut.has_critical,
        suppressed: patternOut.suppressed,
        rules_failed: patternOut.rules_failed,
      });
      tr.stage("protected", { items: collectProtected(patternOut) });

      console.log(
        `موتور: ${engineOut.graded.length} تست ارزیابی شد | ` +
        `${engineOut.abnormal.length} غیرطبیعی | ` +
        `الگو: ${patternOut.findings.map((f) => f.rule_id).join(", ") || "هیچ"} | ` +
        `فوریت: ${patternOut.overall_urgency}`
      );
      // ⚠️ تست‌هایی که موتور نمی‌شناسد نباید بی‌صدا ناپدید شوند.
      //    مثال واقعی: Procalcitonin=12 و Lactate=6.2 (نشانگرهای سپسیس)
      //    در NAME_MAP نبودند → از تفسیر حذف شدند و کاربر هرگز نفهمید.
      //    حالا: در «مقادیر خوانده‌شده» هست، و صریحاً می‌گوییم تفسیر نشد.
      if (engineOut.unmapped.length) {
        console.warn(`موتور: نگاشت نشد → ${engineOut.unmapped.join(", ")}`);
        ocrWarnings.push(
          (hasImage
            ? `این تست‌ها از برگه خوانده شدند ولی موتور تفسیرشان نمی‌کند: `
            : `این تست‌ها را وارد کردید ولی موتور تفسیرشان نمی‌کند: `) +
          `${engineOut.unmapped.join("، ")}. ` +
          // ورود دستی فهرست «مقادیر خوانده‌شده» ندارد؛ فقط عکس آن فهرست را می‌سازد.
          (hasImage
            ? `مقادیرشان در فهرست بالا هست — حتماً با پزشک بررسی کنید.`
            : `حتماً این مقادیر را با پزشک بررسی کنید.`)
        );
      }
      // P49: مقداری که یافته‌ای تفسیرش کرده (ویلسون، آنتی‌بادی کنارِ B12ِ پایین) در این خط نمی‌آید.
      const noRefShown = unexplainedNoRef(engineOut.noRef, patternOut.findings);
      if (noRefShown.length) {
        console.warn(`موتور: محدوده مرجع ندارد → ${noRefShown.join(", ")}`);
        ocrWarnings.push(
          // ⚠️ faName: noRef کلیدِ موتور است، نه نامِ چاپی (N8، آزمونِ T17).
          `برای این تست‌ها محدوده مرجع نداریم: ${noRefShown.map(faName).join("، ")}. ` +
          `تفسیر نشدند. ` +
          // همان جملهٔ هشدارِ unmapped: این ردیف ممکن است کنارِ خلاصهٔ «طبیعی» بنشیند،
          // و تنها چیزی است که بیمار را به پزشک می‌فرستد (T17).
          (hasImage
            ? `مقادیرشان در فهرست بالا هست — حتماً با پزشک بررسی کنید.`
            : `حتماً این مقادیر را با پزشک بررسی کنید.`)
        );
      }

      // ⚠️ فقط وقتی «طبیعی» بگو که هیچ تست غیرطبیعی نباشد.
      //    «قاعده‌ای مطابقت نکرد» ≠ «طبیعی است».
      //    باگ واقعی: WBC=258 هیچ قاعده‌ای نداشت → «نتایج شما طبیعی است».
      if (patternOut.findings.length === 0 && engineOut.abnormal.length === 0) {
        // همه‌چیز واقعاً طبیعی — نیازی به AI نیست، رایگان
        const out = buildNormalResult(engineOut);
        out.extracted_tests = extractedTests;
        if (ocrWarnings.length) out.ocr_warnings = ocrWarnings;
        if (pageInfo) out.pages = pageInfo;
        if (medlineSources.length) out.sources = medlineSources;
        // ⚠️ قبلاً اینجا دستی ساخته می‌شد و نه `indices` داشت نه `tests` —
        //    یعنی پرتکرارترین مسیرِ اپ (پنلِ کاملاً طبیعی) تنها مسیری بود
        //    که رابط کاربری هیچ داده‌ای برای رندرِ ردیف‌ها نداشت. همان
        //    drift‌ای که کامنتِ engineDebug ادعای جلوگیری‌اش را می‌کرد.
        out._engine = engineDebug(engineOut, patternOut);
        // این مسیر اصلاً به مدل نمی‌رسد — ردِ آن هم باید همین را نشان بدهد،
        // وگرنه «مدل صدا زده نشد» با «مدل چیزی برنگرداند» اشتباه می‌شود.
        out._trace_id = tr.id;
        tr.stage("response", { body: out, llm_called: false });
        tr.finish({ path: "normal_result" });
        return res.json(out);
      }

      if (patternOut.findings.length === 0 && engineOut.abnormal.length > 0) {
        // فقط نامِ تست، بی مقدار: برای پیدا کردن شکافِ patterns.js همین کافی است،
        // و مقدارِ بالینیِ بیمار در لاگ سرور نمی‌نشیند.
        console.warn(
          `⚠️ ${engineOut.abnormal.length} تست غیرطبیعی ولی هیچ قاعده‌ای مطابقت نکرد: ` +
          engineOut.abnormal.map((a) => a.test).join(", ")
        );
      }
    }

    if (USE_GRAPH) {
    const { app: labmatGraph } = await import("./labmat-agents/graph.js");

    console.log("[LabMat API] Starting 10-Agent Graph with Rules Engine Data...");
    
    // حذف نوت‌های داخلی موتور قواعد قبل از ارسال به LLM
    // LLM با دیدن کلماتی مثل "تالاسمی" در فیلد note، توهم می‌زند که بیمار تالاسمی دارد!
    const safeEngineOut = engineOut ? {
      ...engineOut,
      graded: engineOut.graded.map(g => {
        const copy = { ...g };
        delete copy.note;
        delete copy.patient;
        return copy;
      }),
      // specs/009 (N13): آیتم‌های لامِ خون متنِ چاپ‌شدهٔ برگه را دارند (raw) — به گراف نمی‌روند.
      smear: undefined,
    } : null;

    // Pass the combined text AND the engine deterministic outputs to the graph
    const initialState = { 
      rawData: `<patient_info>\n${patientText}\n</patient_info>\n<test_results>\n${finalText}\n</test_results>`,
      engineOutput: safeEngineOut,
      patternOutput: patternOut
    };
    
    const finalState = await labmatGraph.invoke(initialState);
    console.log("[LabMat API] Graph execution finished.");

    // Map LabMat output to a format the frontend can use, but also keep OCR context
    parsed = {
      labmat: finalState.finalOutput,
      loops: finalState.loopCount
    };

    if (extractedTests.length) parsed.extracted_tests = extractedTests;
    if (ocrWarnings.length) parsed.ocr_warnings = ocrWarnings;
    if (pageInfo) parsed.pages = pageInfo;
    if (medlineSources.length) parsed.sources = medlineSources;

    // ═══ تور ایمنی ═══
    // اگر مدل نام فیلد را اشتباه بدهد یا اصلاً ندهد، توصیه‌ها بی‌صدا گم می‌شوند.
    // این اتفاق افتاد: مدل "recommendations" داد ولی فرانت
    // "general_recommendations" می‌خواند → بخش توصیه‌ها خالی ماند.
    // موتور خودش لیست را دارد، پس اگر مدل جا انداخت، از موتور پرش می‌کنیم.
    if (patternOut && patternOut.findings.length) {
      const recs = parsed.general_recommendations ?? parsed.recommendations;
      const chosen = (!Array.isArray(recs) || recs.length === 0)
        ? (console.warn("مدل general_recommendations نداد — از موتور ساخته شد"),
           buildEngineRecommendations(patternOut, engineOut))
        : recs;
      // حذف تکراری‌ها: دو finding ممکن است یک آزمایش را پیشنهاد دهند (مثلاً
      // کم‌خونی + همولیز هر دو «بیلی‌روبین»)، یا مدل یک سطر را دوبار بنویسد.
      // ⚠️ تمیزکاری باید روی فهرستِ مدل هم اجرا شود نه فقط مسیرِ موتور: مدل
      //    همان یافته‌ها را می‌بیند و همان «نوبت عادی…»های نزدیک‌به‌هم را بازتولید
      //    می‌کند. اینجا فقط new Set بود، پس تکرارِ نزدیک رد می‌شد.
      parsed.general_recommendations = tidyRecommendations(chosen);
      delete parsed.recommendations;

      // ⚠️ تورِ بالا فقط «مدل هیچ توصیه‌ای نداد» را می‌گیرد. حالتِ شایع‌تر و
      //    بی‌صداتر، *کوتاه‌کردنِ* فهرست است: روی یک برگهٔ واقعی با FBS=۲۰۹
      //    موتور HbA1c را خواسته بود و مدل فقط «تکرار قند ناشتا» را نوشت.
      //    شرطِ `length === 0` دقیقاً کلاسِ N18 است — توری که فقط شکستِ کامل
      //    را می‌بیند، شکستِ جزئی را نمی‌بیند.
      const addBack = missingSuggestions(parsed.general_recommendations, patternOut, engineOut);
      if (addBack.length) {
        console.warn(`تورِ توصیه‌ها: ${addBack.length} پیشنهادِ موتور در فهرستِ مدل نبود و برگردانده شد`);
        parsed.general_recommendations = tidyRecommendations([
          ...parsed.general_recommendations, ...addBack,
        ]);
      }

      // ⚠️ مدل ممکن است یک اورژانس را ادغام یا حذف کند — حتی وقتی فقط یک اورژانس هست.
      //
      // 🔴 باگ واقعی (با فراخوانیِ زندهٔ gpt-4o-mini تأیید شد): قبلاً حضور را با
      //    «زیررشتهٔ عینیِ headline یا کلِ must_say» می‌سنجیدیم. مدل یافتهٔ
      //    رابدومیولیز (۱۰ جمله) را خلاصه نوشت → تطبیقِ عینی شکست خورد → کلِ
      //    بلوک دوباره append شد و بیمار توضیح را دو بار دید. هرچه must_say
      //    غنی‌تر، کپیِ کلمه‌به‌کلمه بعیدتر؛ یعنی این تور با هدفِ «تفسیر حرفه‌ای»
      //    در تضاد بود. حالا جمله‌به‌جمله سنجیده می‌شود (rules/coverage.js) و
      //    فقط جمله‌های واقعاً افتاده برمی‌گردند.
      // 🔴 C3 (رفع ۲۰۲۶-۰۸-۰۷): این تور فقط روی urgency === "emergency" اجرا می‌شد.
      //    مشاهدهٔ زنده با پنلِ Calcium 6.2 + Albumin 2.1: یافتهٔ کلسیم اورژانسی
      //    نیست، پس هرگز بررسی نشد — و مدل جملهٔ «(این مقدار با آلبومین تصحیح شده؛
      //    اندازه‌گیری‌شده روی برگه 6.2)» را انداخت. چیزی که به بیمار رسید عددی بود
      //    که روی برگه‌اش *نیست*، بدون هیچ توضیحی. کلاسِ N5.
      //
      //    چرا شرط «key_number != null» و نه «همهٔ یافته‌ها»: N7 نشان داد تورِ
      //    بیش‌ازحد مشتاق متنِ تکراری می‌سازد. یافته‌ای که key_number دارد دقیقاً
      //    همانی است که یک عددِ مشخص به بیمار می‌دهد، و تضمینِ عددِ کلیدیِ پایینِ
      //    همین بلوک فقط ثابت می‌کند آن عدد *رسیده* — نه اینکه زمینه‌اش رسیده.
      //    فاصلهٔ همین دو، خودِ C3 است.
      //
      //    اندازه‌گیری‌شده روی شش پنلِ واقعی: تحتِ پوششِ تور از ۴ یافته از ۱۴ به
      //    ۹ از ۱۴ رفت. پنجْ یافتهٔ باقی‌مانده هیچ عددی نقل نمی‌کنند.
      //
      // ⚠️ ترتیب عمدی است: این تور *پیش از* تضمینِ عددِ کلیدی اجرا می‌شود. اگر
      //    جمله‌های افتاده اینجا برگردند، عدد هم با آن‌ها برمی‌گردد و تضمینِ بعدی
      //    دیگر فعال نمی‌شود — پس یک جمله دو بار اضافه نمی‌شود.
      const numbered = patternOut.findings.filter(
        (f) => f.urgency === "emergency" || f.urgency === "soon" || f.key_number != null
      );
      if (numbered.length) {
        const text = `${parsed.summary || ""} ${parsed.interpretation || ""}`;
        const additions = numbered
          .map((f) => missingFindingText(f, text))
          .filter(Boolean);
        if (additions.length) {
          console.warn(`⚠️ ${additions.length} یافتهٔ عدددار ناقص منتقل شد — بخشِ افتاده اضافه شد`);
          parsed.interpretation =
            (parsed.interpretation || "") + "\n\n" + additions.join(" ");
        }
      }

      // تست ممنوع اگر از دست مدل در رفت
      const forbidden = patternOut.findings.flatMap((f) => f.forbid ?? []);
      if (forbidden.length) {
        const before = parsed.general_recommendations.length;
        parsed.general_recommendations = parsed.general_recommendations.filter(
          (r) => !forbidden.some((w) => String(r).includes(w))
        );
        const dropped = before - parsed.general_recommendations.length;
        if (dropped) console.warn(`${dropped} توصیه حذف شد — تست ممنوع برای این الگو`);
      }
    }

    // خروجی موتور — برای دیباگ و شفافیت
    if (engineOut && patternOut) {
      parsed._engine = engineDebug(engineOut, patternOut);
      // فوریت را موتور تعیین می‌کند، نه مدل
      parsed.has_critical = patternOut.has_critical;
    }

    // ⚠️ مسیرِ گراف هیچ‌کدام از تورهای مسیرِ کلاسیک را ندارد (N13، و همان
    //    دلیلی که USE_GRAPH پیش‌فرض خاموش است). ردِ خطا باید همین را نشان
    //    بدهد: مرحلهٔ prompt/llm_raw اینجا ثبت نمی‌شود چون دوازده عاملِ
    //    جداگانه صدا زده شده‌اند، نه یک فراخوانِ واحد. مکان‌یاب با دیدنِ
    //    path === "graph" از انتسابِ غلط به «بازنویسیِ مدل» خودداری می‌کند.
    parsed._trace_id = tr.id;
    tr.stage("response", { body: parsed, llm_called: true, graph: true });
    tr.finish({ path: "graph" });
    return res.json(parsed);
    }
    // ═══ پایانِ مسیرِ گراف ═══

    if (engineCandidate) {
      // ═══ مسیر موتور ═══
      const messages = [
        { role: "system", content: ENGINE_SYSTEM_PROMPT },
        // ورود دستی بارداری/بیماری زمینه‌ای را در patient می‌فرستد؛ فقط زمینهٔ لحن،
        // نه ورودیِ گرید. مسیر عکس این‌ها را ندارد و null می‌ماند.
        buildEnginePrompt(engineOut, patternOut, medlineContext, patient),
      ];
      // ⚠️ دقیقاً همان چیزی ثبت می‌شود که رفت، نه بازسازی‌اش. تفاوتِ
      //    «یافته در patternOut بود» و «یافته در payload بود» همان مرزِ
      //    «تحویل به مدل» است و بازسازی آن را محو می‌کند.
      tr.stage("prompt", { model: TEXT_MODEL, temperature: 0, messages });
      raw = await callAvalAI({
        model: TEXT_MODEL,
        maxTokens: 2000,
        // کارِ این فراخوان بازنویسیِ یافته‌های موتور به فارسی است، نه قضاوت —
        // پس دمای صفر. مسیر قدیم عمداً روی ۰.۲ می‌ماند چون خودش قضاوت می‌کند.
        temperature: 0,
        messages,
      });
    } else {
      // ═══ مسیر قدیم — ورودی متنی یا USE_ENGINE=false ═══
      const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        buildAnalysisMessage(patientText, finalText, medlineContext, hasImage),
      ];
      tr.stage("prompt", { model: TEXT_MODEL, legacy_path: true, messages });
      raw = await callAvalAI({
        model: TEXT_MODEL,
        maxTokens: 2500,
        messages,
      });
    }

    tr.stage("llm_raw", { raw });

    parsed = safeParseJson(raw);
    tr.stage("parse", { ok: !!parsed, parsed: parsed ?? null });
    if (!parsed) {
      // ⚠️ در «مسیر موتور» یافته‌ها (از جمله اورژانس‌ها) قبلاً قطعی محاسبه شده‌اند.
      //    اگر خروجی مدل خراب باشد نباید has_critical/توصیه‌ها دور ریخته شوند.
      //    یک نتیجهٔ قطعی مستقیم از موتور می‌سازیم؛ فقط مسیر متنی legacy به raw سقوط می‌کند.
      if (patternOut && engineOut) {
        console.warn("⚠️ JSON مدل نامعتبر — نتیجه از خروجی قطعی موتور ساخته شد");
        const fb = buildEngineFallbackResult(engineOut, patternOut);
        if (extractedTests.length) fb.extracted_tests = extractedTests;
        if (ocrWarnings.length) fb.ocr_warnings = ocrWarnings;
        if (pageInfo) fb.pages = pageInfo;
        if (medlineSources.length) fb.sources = medlineSources;
        fb.parseErrorRecovered = true;
        fb._engine = engineDebug(engineOut, patternOut);
        fb.critical_verbatim = collectProtected(patternOut);
        fb._trace_id = tr.id;
        tr.stage("response", { body: fb, llm_called: true, parse_failed: true });
        tr.finish({ path: "engine_fallback" });
        return res.status(200).json(fb);
      }
      return res.status(200).json({
        raw,
        parseError: true,
        extracted_tests: extractedTests,
        ocr_warnings: ocrWarnings,
        pages: pageInfo,
        sources: medlineSources,
      });
    }

    // فهرست تست‌ها را خودمان می‌گذاریم، نه مدل
    if (extractedTests.length) parsed.extracted_tests = extractedTests;
    if (ocrWarnings.length) parsed.ocr_warnings = ocrWarnings;
    if (pageInfo) parsed.pages = pageInfo;
    // لینک‌های MedlinePlus قبلاً ساخته و دور ریخته می‌شدند.
    // نشان دادنشان هم شفافیت است هم اعتبار پاسخ را بالا می‌برد.
    if (medlineSources.length) parsed.sources = medlineSources;

    // ═══ تور ایمنی ═══
    // ادعای وضعیت دربارهٔ تستی که روی برگه نبوده (N4 / T10). عمداً *قبل* از
    // تورهای بعدی: آن‌ها متنِ خودِ موتور را اضافه می‌کنند و آن متن نباید از
    // این فیلتر رد شود.
    //
    // ⚠️ روی summary/interpretation تنها کافی نیست. این مسیر هر فیلدی را که
    //    مدل برگردانده عیناً به کلاینت پاس می‌دهد، پس همان ادعا از فیلدی مثل
    //    analysis/reasoning/text هم بیرون می‌زند. تا وقتی پاسخ به یک شکلِ
    //    مشخص محدود نشده، فیلتر باید همهٔ رشته‌های سطحِ اول را ببیند.
    if (engineOut) {
      const measured = [...new Set(engineOut.graded.map((g) => g.test))];
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v !== "string") continue;
        const after = stripUnmeasuredClaims(v, measured);
        // ⚠️ این تور متن *حذف* می‌کند، برخلاف بقیه که اضافه می‌کنند. پس
        //    وقتی یک جملهٔ درست گم می‌شود، اینجا جای اولِ نگاه‌کردن است —
        //    و بدونِ ثبتِ before/after هیچ ردی از حذف نمی‌ماند.
        tr.net(`stripUnmeasuredClaims:${k}`, v, after, { measured });
        parsed[k] = after;
      }
    }

    // اگر مدل نام فیلد را اشتباه بدهد یا اصلاً ندهد، توصیه‌ها بی‌صدا گم می‌شوند.
    // این اتفاق افتاد: مدل "recommendations" داد ولی فرانت
    // "general_recommendations" می‌خواند → بخش توصیه‌ها خالی ماند.
    // موتور خودش لیست را دارد، پس اگر مدل جا انداخت، از موتور پرش می‌کنیم.
    if (patternOut && patternOut.findings.length) {
      // ═══ فهرستِ توصیه‌ها فقط از موتور ═══
      // 🔴 برگهٔ واقعی (۲۰۲۶-۰۹-۲۳، پان‌سیتوپنی، M188): مدل ۴ مورد از ۱۴ توصیهٔ موتور را
      //    انداخت، از جمله «بدون اتلاف وقت فوراً به اورژانس» و «نباید منتظر نوبت مطب بمانید».
      //    هر چهار از فیلدهای action/warnings بودند که هیچ توری نمی‌پایید. تورهای قبلی
      //    (فهرستِ خالی، سپس missingSuggestions) هر کدام فقط یک شکلِ از دست رفتن را
      //    می‌گرفتند. حالا مدل این فیلدها را اصلاً نمی‌بیند (buildEnginePrompt) و فهرست
      //    همان چیزی است که موتور ساخته. فهرستِ مدل، اگر داده باشد، فقط در ردیابی ثبت می‌شود.
      const modelRecs = parsed.general_recommendations ?? parsed.recommendations ?? null;
      parsed.general_recommendations = buildEngineRecommendations(patternOut, engineOut);
      tr.net("recommendations:engine", modelRecs, parsed.general_recommendations, { model_list_ignored: modelRecs != null });
      delete parsed.recommendations;

      // ⚠️ مدل ممکن است یک اورژانس را ادغام یا حذف کند — حتی وقتی فقط یک اورژانس هست.
      //
      // 🔴 باگ واقعی (با فراخوانیِ زندهٔ gpt-4o-mini تأیید شد): قبلاً حضور را با
      //    «زیررشتهٔ عینیِ headline یا کلِ must_say» می‌سنجیدیم. مدل یافتهٔ
      //    رابدومیولیز (۱۰ جمله) را خلاصه نوشت → تطبیقِ عینی شکست خورد → کلِ
      //    بلوک دوباره append شد و بیمار توضیح را دو بار دید. هرچه must_say
      //    غنی‌تر، کپیِ کلمه‌به‌کلمه بعیدتر؛ یعنی این تور با هدفِ «تفسیر حرفه‌ای»
      //    در تضاد بود. حالا جمله‌به‌جمله سنجیده می‌شود (rules/coverage.js) و
      //    فقط جمله‌های واقعاً افتاده برمی‌گردند.
      // 🔴 C3 (رفع ۲۰۲۶-۰۸-۰۷): این تور فقط روی urgency === "emergency" اجرا می‌شد.
      //    مشاهدهٔ زنده با پنلِ Calcium 6.2 + Albumin 2.1: یافتهٔ کلسیم اورژانسی
      //    نیست، پس هرگز بررسی نشد — و مدل جملهٔ «(این مقدار با آلبومین تصحیح شده؛
      //    اندازه‌گیری‌شده روی برگه 6.2)» را انداخت. چیزی که به بیمار رسید عددی بود
      //    که روی برگه‌اش *نیست*، بدون هیچ توضیحی. کلاسِ N5.
      //
      //    چرا شرط «key_number != null» و نه «همهٔ یافته‌ها»: N7 نشان داد تورِ
      //    بیش‌ازحد مشتاق متنِ تکراری می‌سازد. یافته‌ای که key_number دارد دقیقاً
      //    همانی است که یک عددِ مشخص به بیمار می‌دهد، و تضمینِ عددِ کلیدیِ پایینِ
      //    همین بلوک فقط ثابت می‌کند آن عدد *رسیده* — نه اینکه زمینه‌اش رسیده.
      //    فاصلهٔ همین دو، خودِ C3 است.
      //
      //    اندازه‌گیری‌شده روی شش پنلِ واقعی: تحتِ پوششِ تور از ۴ یافته از ۱۴ به
      //    ۹ از ۱۴ رفت. پنجْ یافتهٔ باقی‌مانده هیچ عددی نقل نمی‌کنند.
      //
      // ⚠️ ترتیب عمدی است: این تور *پیش از* تضمینِ عددِ کلیدی اجرا می‌شود. اگر
      //    جمله‌های افتاده اینجا برگردند، عدد هم با آن‌ها برمی‌گردد و تضمینِ بعدی
      //    دیگر فعال نمی‌شود — پس یک جمله دو بار اضافه نمی‌شود.
      const numbered = patternOut.findings.filter(
        (f) => f.urgency === "emergency" || f.urgency === "soon" || f.key_number != null
      );
      if (numbered.length) {
        const text = `${parsed.summary || ""} ${parsed.interpretation || ""}`;
        const additions = numbered
          .map((f) => missingFindingText(f, text))
          .filter(Boolean);
        if (additions.length) {
          console.warn(`⚠️ ${additions.length} یافتهٔ عدددار ناقص منتقل شد — بخشِ افتاده اضافه شد`);
          const beforeCov = parsed.interpretation;
          parsed.interpretation =
            (parsed.interpretation || "") + "\n\n" + additions.join(" ");
          // ثبتِ اینکه *کدام* یافته ناقص منتقل شده بود: این دقیقاً همان
          // سیگنالی است که «مدل جمله را انداخت» را از «موتور جمله را نساخت»
          // جدا می‌کند، و بدونش هر دو یک‌شکل دیده می‌شوند.
          tr.net("coverage:mustSayAddBack", beforeCov, parsed.interpretation, {
            findings: numbered.filter((f) => missingFindingText(f, text)).map((f) => f.rule_id),
            additions,
          });
        }
      }

      // ── تضمین اعدادِ کلیدیِ بزرگی (eGFR، میانگین قند/eAG، آنیون‌گپ) ──
      // مدل ارزان گاهی جملهٔ حاویِ یک عددِ مشتق‌شده را حذف می‌کند — مثلاً eGFR را
      // «تکراری با کراتینین» می‌بیند و می‌اندازد. این اعداد بخشِ حرفه‌ایِ تشخیص‌اند
      // (بزرگیِ اختلال) و نباید گم شوند. اگر عددِ key_number در متن نبود، جملهٔ اولِ
      // must_say (که همان عدد را دارد) به ابتدای تفسیر برمی‌گردد.
      const toLatinDigits = (s) =>
        String(s).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
      const interpText = toLatinDigits(`${parsed.summary || ""} ${parsed.interpretation || ""}`);
      const missingFacts = [];
      for (const f of patternOut.findings) {
        if (f.key_number == null) continue;
        if (interpText.includes(toLatinDigits(f.key_number))) continue;
        const sent = String(f.must_say || "").split(/(?<=[.؟!])\s/)[0].trim();
        if (sent && !missingFacts.includes(sent)) missingFacts.push(sent);
      }
      if (missingFacts.length) {
        console.warn(`⚠️ ${missingFacts.length} عددِ کلیدی در متن مدل نبود — به تفسیر اضافه شد`);
        const beforeKey = parsed.interpretation;
        parsed.interpretation = `${missingFacts.join(" ")} ${parsed.interpretation || ""}`.trim();
        tr.net("keyNumber:guarantee", beforeKey, parsed.interpretation, { facts: missingFacts });
      }

      // فیلترِ forbid روی فهرست حالا داخلِ buildEngineRecommendations است؛ فهرستِ مدل دیگر استفاده نمی‌شود.

      // ═══ کانالِ «عیناً» — محتوایی که از مدل رد نشده است ═══
      //
      // نامِ دارو، دوز و راهِ مصرف از payloadِ پرامپت بیرون مانده‌اند
      // (buildEnginePrompt فقط فیلدهای مشخصی را می‌فرستد و `protected`
      // جزوشان نیست)، پس مدل اصلاً ندیده‌شان که بتواند بازنویسی‌شان کند.
      // اینجا مستقیم از موتور به پاسخ می‌چسبند. یکسان‌بودنشان با موتور یک
      // خاصیتِ ساختاری است، نه نتیجهٔ یک تور — و دقیقاً به همین دلیل انتخاب
      // شد: توری که «آیا مدل درست بازنویسی کرد؟» را بسنجد وجود ندارد.
      // coverage.js با آستانهٔ توکنیِ ۰.۶ کار می‌کند و «وریدی»→«خوراکی» از
      // آن رد می‌شود.
      const verbatim = collectProtected(patternOut);
      if (verbatim.length) parsed.critical_verbatim = verbatim;

      // ⚠️ نیمهٔ دومِ همان تضمین: مدل نباید *از خودش* دوز یا راهِ مصرف
      //    بنویسد. کانالِ بالا فقط تضمین می‌کند متنِ موتور دست‌نخورده برسد؛
      //    جلوی «مدل یک دوز اختراع کرد» را نمی‌گیرد. جهتِ خطا اینجا حذف
      //    است، پس شرط سخت‌گیرانه است: فقط نشانه‌ای که در *هیچ* رشتهٔ موتور
      //    نیست حذف می‌شود.
      const engineText = engineStrings(patternOut);
      for (const field of ["summary", "interpretation"]) {
        if (typeof parsed[field] !== "string") continue;
        const bad = inventedDosage(parsed[field], engineText);
        if (!bad.length) continue;
        const beforeInv = parsed[field];
        parsed[field] = splitSentences(beforeInv)
          .filter((s) => !inventedDosage(s, engineText).length)
          .join(" ");
        console.warn(
          `⚠️ مدل ${bad.length} نشانهٔ دوز/راهِ مصرف نوشت که در موتور نبود — جمله‌اش حذف شد: ` +
          bad.map((b) => b.match).join(" | "),
        );
        tr.net(`inventedDosage:${field}`, beforeInv, parsed[field], { signals: bad });
      }
    }

    // خروجی موتور — برای دیباگ و شفافیت
    if (patternOut) {
      parsed._engine = engineDebug(engineOut, patternOut);
      // فوریت را موتور تعیین می‌کند، نه مدل
      parsed.has_critical = patternOut.has_critical;
    }

    parsed._trace_id = tr.id;
    tr.stage("response", { body: parsed, llm_called: true });
    tr.finish({ path: engineCandidate ? "engine" : "legacy" });
    res.json(parsed);
  } catch (err) {
    tr.error("analyzeHandler", err);
    if (err.message === "upstream_timeout") {
      return res.status(504).json({
        error: "پاسخ سرویس هوش مصنوعی خیلی طول کشید. لطفاً دوباره تلاش کنید.",
      });
    }
    // ۴۲۹ جدا: کاربر باید بفهمد سرویس شلوغ است، نه خراب
    if (err.message === "upstream_rate_limit") {
      const secs = err.retryAfter || 60;
      return res.status(429).json({
        error: `سرویس هوش مصنوعی در حال حاضر شلوغ است. لطفاً حدود ${secs} ثانیه دیگر دوباره تلاش کنید.`,
        retry_after: secs,
      });
    }
    if (err.message === "upstream_error") {
      return res.status(502).json({ error: "خطا در ارتباط با سرویس هوش مصنوعی." });
    }
    // ⚠️ err ممکن است بدنهٔ درخواست (دادهٔ بیمار) را داشته باشد
    console.error("Unhandled:", err.name, err.message);
    res.status(500).json({ error: "خطای داخلی سرور." });
  } finally {
    // ⚠️ در finally، نه در انتهای try: مسیرِ خطا هم باید ردِ ثبت‌شده داشته
    //    باشد، وگرنه «۵۰۰ گرفتم» یک ردِ خالی می‌دهد و مکان‌یاب می‌گوید
    //    «هیچ مرحله‌ای اجرا نشد» — که غلط است. finish دوباره‌فراخوانی را
    //    بی‌خطر می‌پذیرد چون فقط فیلد می‌نویسد.
    tr.finish({});
  }
};

// مسیرِ همگامِ قدیمی — دست‌نخورده، برای سازگاری عقب‌رو
app.post("/api/analyze", requireAllowedOrigin, requireAuth, analyzeLimiter, analyzeHandler);

// ============================================================
// [۱۴-ب] مسیرِ ناهمگام: شناسهٔ کار + پرسشِ دوره‌ای
//
// همان تحلیل، ولی پاسخ بلافاصله برمی‌گردد و کار در پس‌زمینه ادامه پیدا
// می‌کند. ارزشِ اصلی این نیست که سریع‌تر است — نیست — بلکه این است که
// کار دیگر به زنده ماندنِ اتصالِ مرورگر گره نخورده. کاربری که وسط OCR
// گوشی‌اش قفل می‌شود یا به تلگرام می‌رود، موقع برگشتن نتیجه را می‌بیند.
//
// ⚠️ محدودیتِ نرخ عمداً روی /start است، نه روی /job/:id — وگرنه کاربری
//    که هر ۲ ثانیه poll می‌کند خودش را بلاک می‌کند. چیزی که هزینهٔ AvalAI
//    را می‌سازد شروعِ کار است، نه پرسیدنِ وضعیت.
// ============================================================
app.post("/api/analyze/start", requireAllowedOrigin, requireAuth, analyzeLimiter, (req, res) => {
  const imgs = Array.isArray(req.body?.imageDataUrls)
    ? req.body.imageDataUrls
    : (typeof req.body?.imageDataUrl === "string" ? [req.body.imageDataUrl] : []);

  const jobId = createJob({ pagesTotal: imgs.length, userId: req.user?.userId ?? null });
  
  // -- ثبت در دیتابیس --
  if (req.user && req.user.userId) {
    createJobRecord(jobId, req.user.userId, imgs.length).catch(err => console.error("DB createJobRecord error:", err));
  }

  res.status(202).json({ job_id: jobId, pages_total: imgs.length });

  // از اینجا به بعد پاسخ رفته؛ نتیجه فقط در انبارِ کار می‌نشیند.
  req._onPage = (page, tests) => reportPage(jobId, page, tests);

  const captured = { code: 200 };
  const shim = {
    status(c) { captured.code = c; return shim; },
    json(body) { 
      finishJob(jobId, captured.code, body); 
      // -- آپدیت نتیجه در دیتابیس --
      updateJobResult(jobId, captured.code === 200 ? 'completed' : 'failed', body).catch(err => console.error("DB updateJobResult error:", err));
      return shim; 
    },
    setHeader() { return shim; },
  };

  analyzeHandler(req, shim).catch((err) => {
    console.error("Job failed:", err.name, err.message);
    finishJob(jobId, 500, { error: "خطای داخلی سرور." });
    updateJobResult(jobId, 'failed', { error: "خطای داخلی سرور." }).catch(e => {});
  });
});

// ⚠️ `requireAuth` اینجا لازم است، وگرنه عدم‌تقارن می‌سازد: /start احراز هویت
//    می‌خواهد و این یکی نه، پس هر کسی با یک شناسهٔ کار تفسیرِ کاملِ بیمارِ
//    دیگری را می‌خواند. با AUTH_REQUIRED خاموش، `requireAuth` کاربرِ ناشناس
//    را ست می‌کند و رفتار عوض نمی‌شود.
app.get("/api/analyze/job/:id", requireAllowedOrigin, requireAuth, (req, res) => {
  const job = getJobFor(req.params.id, req.user?.userId ?? null);
  if (!job) {
    return res.status(404).json({
      error: "این تحلیل پیدا نشد یا منقضی شده. لطفاً دوباره شروع کنید.",
    });
  }
  res.json(jobView(job));
});

// ============================================================
// اندپوینت مخصوص اجرای گراف 10 عامله (LabMat Agents)
// ============================================================
// ⚠️ این روت مسیرِ گراف است و متنِ بیمارش از هیچ‌کدام از تورهای ایمنیِ مرحلهٔ ۸
//    عبور نمی‌کند (N13). گیتِ `USE_GRAPH` تا امروز فقط داخلِ `analyzeHandler`
//    بود، پس این در — بی‌احراز هویت — همان مسیری را باز می‌گذاشت که کلِ
//    تصمیمِ «پیش‌فرض خاموش» برای بستنش گرفته شده بود.
app.post("/api/labmat/analyze", requireAllowedOrigin, requireAuth, analyzeLimiter, async (req, res) => {
  if (!USE_GRAPH) {
    return res.status(503).json({
      error: "مسیرِ گراف خاموش است. برای آزمایشِ محلی USE_GRAPH=true را ست کنید.",
    });
  }
  try {
    const rawData = req.body.rawData;
    if (!rawData) {
      return res.status(400).json({ error: "rawData is required in body." });
    }

    // import graph dynamically to avoid top-level load errors if paths are tricky
    const { app: labmatGraph } = await import("./labmat-agents/graph.js");
    
    console.log("[LabMat API] Starting 10-Agent Graph...");
    const initialState = { rawData };
    const finalState = await labmatGraph.invoke(initialState);
    
    console.log("[LabMat API] Graph execution finished.");
    res.json({
      success: true,
      data: finalState.finalOutput,
      loops: finalState.loopCount
    });
  } catch (err) {
    console.error("[LabMat API] Error during graph execution:", err);
    console.log("[LabMat API] Falling back to deterministic engine...");
    try {
      // 🔴 این بلوک تا امروز مرده بود: از `./rules/engine.js` ایمپورت می‌کرد
      //    (وجود ندارد — `runEngine` در `adapter.js` است) و از
      //    `generateInterpretation` در `interpret.js` (هیچ‌جا وجود ندارد). پس
      //    هر خطای گراف به «Fallback failed» و ۵۰۰ می‌رسید، در حالی که
      //    کامنتِ خودش وعدهٔ یک fallbackِ قطعی می‌داد.
      const { runEngine } = await import("./rules/adapter.js");
      const { runPatterns } = await import("./rules/patterns.js");
      const { buildEngineFallbackResult } = await import("./rules/prompt.js");

      const rawData = req.body.rawData || {};
      const { patientInfo, testResults } = rawData;
      const patient = patientInfo || { age: 30, sex: "M" };
      const tests = Array.isArray(testResults) ? testResults : [];

      const engineOut = runEngine({ patient, tests });
      const patternsOut = runPatterns(engineOut);
      // متنِ قطعیِ خودِ موتور — بدونِ LLM، پس مرزِ موتور دست‌نخورده می‌ماند.
      const interpretation = buildEngineFallbackResult(engineOut, patternsOut);

      res.json({
        success: true,
        data: interpretation,
        loops: 0,
        fallback: true
      });
    } catch (fallbackErr) {
      console.error("[LabMat API] Deterministic fallback failed:", fallbackErr);
      res.status(500).json({ error: "Internal Server Error in LabMat Agent Graph and Fallback failed", details: err.message });
    }
  }
});

app.get("/health", (_req, res) =>
  res.json({
    ok: true,
    textModel: TEXT_MODEL,
    visionModel: VISION_MODEL,
    medline: "webservice",
    ocr: "two-stage",
    extractedTestsSource: "ocr-direct",
    aiTimeoutMs: AI_TIMEOUT_MS,
    maxImages: MAX_IMAGES,
    imageConcurrency: IMAGE_CONCURRENCY,
    ocrRetries: OCR_RETRIES,
    bodyLimit: "60mb",
    // اگر این اعداد بالا رفت، سقف توکن کم است.
    // قبل از بالا بردن maxTokens اول اینجا را ببین.
    engine: USE_ENGINE ? "on" : "off",
    graph: USE_GRAPH ? "on" : "off",
    // ⚠️ فرانت این را می‌خواند تا صفحهٔ ورود را نشان بدهد یا نه. پیش‌تر
    //    `VITE_AUTH_REQUIRED` پرچمِ *زمانِ بیلد* و مستقل از این بود، پس دو
    //    منبعِ حقیقت داشتیم که بی‌صدا از هم واگرا می‌شدند: یا بیمار کلِ فرم
    //    را پر می‌کرد و آخرش ۴۰۱ می‌گرفت، یا برای سروری که احراز هویت
    //    نمی‌خواست از او OTP خواسته می‌شد (و فرستندهٔ پیامک هنوز mock است).
    authRequired: AUTH_REQUIRED,
    ocrMaxTokens: OCR_MAX_TOKENS,
    truncations: avalai.truncations,
    rateLimit: `${RATE_LIMIT_MAX}/${RATE_LIMIT_WINDOW_MIN}min`,
    corsOrigins: ALLOWED_ORIGINS.length === 0 ? "any (⚠️ در پرودکشن ست کن)" : ALLOWED_ORIGINS,
    trustProxy: TRUST_PROXY || "off",
    // ⚠️ روشن یعنی مقادیرِ بالینی در حافظه نگه داشته می‌شود. اینجا دیده
    //    می‌شود تا کسی مجبور نباشد برای فهمیدنش به لاگِ بوت برگردد.
    trace: isTraceEnabled() ? "on (⚠️ دادهٔ بالینی نگه داشته می‌شود)" : "off",
    // کارهای در حافظه. اگر مدام نزدیک سقف بود، یعنی TTL یا سقف کم است.
    jobsInMemory: jobCount(),
  })
);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Express Error]', err.message);
  res.status(500).json({ error: 'خطای سرور رخ داده است.' });
});

initDb()
  .then(() => {
    // ⚠️ باید *قبل از* app.listen صدای زده شود، نه بعدش. قبلاً درونِ
    //    callbackِ listen بود؛ throwِ آن (کلیدِ JWT پیش‌فرض با احرازِ روشن)
    //    از callback به promiseِ initDb نمی‌رسد، در .catch(console.error)
    //    بلعیده می‌شد و سرور با توکن‌های جعل‌شدنی بالا می‌ماند — دقیقاً
    //    کلاسِ «گاردی که بی‌صدا می‌بلعید». بیرونِ listen بودن یعنی
    //    rejection به همین .catch می‌رسد و فرایند با کدِ غیرصفر خارج می‌شود.
    console.log(authBootReport());
    // ردیابی هم مثل احراز هویت باید در بوت دیده شود — روشن‌بودنش یعنی
    // مقادیرِ بالینیِ بیمار نگه داشته می‌شود، و آن نباید بی‌صدا بماند.
    traceBootReport();
    app.listen(PORT, () => {
    console.log(`سرور واسط (با MedlinePlus) روی پورت ${PORT} در حال اجراست`);
    console.log(`مدل متن: ${TEXT_MODEL} | مدل بینایی: ${VISION_MODEL} | مهلت: ${AI_TIMEOUT_MS}ms`);
    console.log(`آپلود چند عکس: تا ${MAX_IMAGES} عکس | همزمانی ${IMAGE_CONCURRENCY} | ${OCR_RETRIES} تلاش مجدد`);
    console.log(`موتور قواعد: ${USE_ENGINE ? "روشن (Henry + RCPCH + CTCAE v5)" : "خاموش"}`);
    console.log(`گراف ۱۰-عامله: ${USE_GRAPH ? "روشن (USE_GRAPH=true)" : "خاموش — مسیر کلاسیک"}`);
    console.log(`سقف توکن OCR: ${OCR_MAX_TOKENS}`);
    console.log(`محدودیت نرخ: ${RATE_LIMIT_MAX} درخواست در ${RATE_LIMIT_WINDOW_MIN} دقیقه`);
    if (ALLOWED_ORIGINS.length === 0) {
      console.warn("⚠️ ALLOWED_ORIGINS ست نشده — CORS به هر مبدأیی باز است. در پرودکشن ست کن.");
    } else {
      console.log(`مبدأهای مجاز: ${ALLOWED_ORIGINS.join(", ")}`);
    }
    if (!TRUST_PROXY) {
      console.warn("⚠️ TRUST_PROXY ست نشده — اگر پشت Nginx هستی، rate limit همهٔ کاربران را " +
                   "یک آی‌پی می‌بیند و با یک کاربرِ پرمصرف همه بلاک می‌شوند. مقدار = تعداد hop.");
    }
    if (!AVALAI_API_KEY) console.warn("⚠️  هشدار: AVALAI_API_KEY تنظیم نشده! فایل .env را بساز.");
  });
}).catch((err) => {
  console.error("❌ بوت سرور شکست خورد:", err.message);
  process.exit(1);
});
