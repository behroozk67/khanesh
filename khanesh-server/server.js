// ============================================================
// سرور واسط «خوانش» — نسخه با غنی‌سازی MedlinePlus
// ------------------------------------------------------------
// تغییرات این نسخه:
//   ۱. خواندن عکس و تحلیل، دو مرحله جدا شده‌اند:
//      مرحله ۱: OCR خالص (فقط خواندن جدول، بدون هیچ تفسیری)
//      مرحله ۲: تحلیل روی متنِ خوانده‌شده (همان مسیر حالت متنی)
//   ۲. مهلت زمانی (timeout) بلندتر برای مدل‌های کند مثل Gemini
//   ۳. سقف توکن بالاتر برای OCR تا خروجی نصفه نماند
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

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

const AVALAI_API_KEY = process.env.AVALAI_API_KEY;
const AVALAI_BASE_URL = "https://api.avalai.ir/v1";
const TEXT_MODEL = process.env.TEXT_MODEL || "gpt-4o-mini";
const VISION_MODEL = process.env.VISION_MODEL || "gpt-4o-mini";
const PORT = process.env.PORT || 8787;

// مهلت زمانی درخواست به سرویس هوش مصنوعی (میلی‌ثانیه)
// مدل‌های بینایی مثل Gemini برای خواندن جدول کند هستند.
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 240000); // ۴ دقیقه

const MEDLINE_BASE = "https://wsearch.nlm.nih.gov/ws/query";

// ============================================================
// [۱] نگاشت نام تست‌ها به عبارت جستجوی MedlinePlus
// ============================================================
const TEST_MEDLINE_MAP = {
  // قند و دیابت
  "قند خون ناشتا": "Blood Glucose",
  "fbs": "Blood Glucose",
  "glucose": "Blood Glucose",
  "hba1c": "A1C Test",
  // چربی
  "کلسترول تام": "Cholesterol Levels",
  "cholesterol": "Cholesterol Levels",
  "تری‌گلیسیرید": "Triglyceride Levels",
  "triglyceride": "Triglyceride Levels",
  "hdl": "HDL Cholesterol",
  "ldl": "LDL Cholesterol",
  // کلیه
  "اوره": "Urea",
  "urea": "Urea",
  "bun": "BUN (Blood Urea Nitrogen)",
  "کراتینین": "Creatinine Test",
  "creatinine": "Creatinine Test",
  "اسید اوریک": "Uric Acid Test",
  "uric": "Uric Acid Test",
  // کبد
  "ast": "Liver Function Tests",
  "sgot": "Liver Function Tests",
  "alt": "Liver Function Tests",
  "sgpt": "Liver Function Tests",
  "alp": "Liver Function Tests",
  "بیلی‌روبین": "Bilirubin Blood Test",
  "bilirubin": "Bilirubin Blood Test",
  "آلبومین": "Albumin Blood Test",
  "albumin": "Albumin Blood Test",
  // الکترولیت
  "سدیم": "Sodium Blood Test",
  "sodium": "Sodium Blood Test",
  "پتاسیم": "Potassium Blood Test",
  "potassium": "Potassium Blood Test",
  "کلسیم": "Calcium Blood Test",
  "calcium": "Calcium Blood Test",
  "منیزیم": "Magnesium Blood Test",
  "magnesium": "Magnesium Blood Test",
  // آهن
  "فریتین": "Ferritin Blood Test",
  "ferritin": "Ferritin Blood Test",
  "آهن": "Iron Tests",
  "iron": "Iron Tests",
  "tibc": "Iron Tests",
  // CBC
  "گلبول سفید": "White Blood Count (WBC)",
  "wbc": "White Blood Count (WBC)",
  "گلبول قرمز": "RBC Count",
  "rbc": "RBC Count",
  "هموگلوبین": "Hemoglobin Test",
  "hemoglobin": "Hemoglobin Test",
  "hgb": "Hemoglobin Test",
  "هماتوکریت": "Hematocrit Test",
  "hematocrit": "Hematocrit Test",
  "hct": "Hematocrit Test",
  "mcv": "Red Blood Cell (RBC) Indices",
  "mch": "Red Blood Cell (RBC) Indices",
  "mchc": "Red Blood Cell (RBC) Indices",
  "پلاکت": "Platelet Tests",
  "platelet": "Platelet Tests",
  "plt": "Platelet Tests",
  "esr": "ESR (Erythrocyte Sedimentation Rate)",
  "rdw": "Red Blood Cell (RBC) Indices",
  // انعقاد
  "pt": "Prothrombin Time Test and INR",
  "ptt": "Partial Thromboplastin Time (PTT) Test",
  // تیروئید
  "tsh": "TSH (Thyroid-Stimulating Hormone) Test",
  "t4": "T4 Test",
  "t3": "T3 Test",
  // ویتامین
  "ویتامین d": "Vitamin D Test",
  "vitamin d": "Vitamin D Test",
  "vitd": "Vitamin D Test",
  "ویتامین b12": "Vitamin B12 Level Test",
  "b12": "Vitamin B12 Level Test",
  "فولات": "Folate Test",
  "folate": "Folate Test",
};

// ============================================================
// [۲] استخراج نام تست‌ها از متن ورودی
// ============================================================
function extractMedlineTerms(testResultsText) {
  if (!testResultsText) return [];
  const terms = new Map();
  const lines = testResultsText.split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    const namePart = (line.split(":")[0] || "").trim().toLowerCase();
    if (!namePart) continue;
    for (const key in TEST_MEDLINE_MAP) {
      if (namePart.includes(key.toLowerCase())) {
        const term = TEST_MEDLINE_MAP[key];
        if (!terms.has(term)) terms.set(term, line.trim());
        break;
      }
    }
  }
  return Array.from(terms.entries()).map(([term, sourceLine]) => ({ term, sourceLine }));
}

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
      signal: AbortSignal.timeout(15000), // MedlinePlus نباید کل درخواست را معطل کند
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

  const parts = [];
  const sources = [];
  const results = await Promise.all(
    items.map(async ({ term, sourceLine }) => ({
      term, sourceLine, data: await fetchMedline(term),
    }))
  );

  for (const { term, sourceLine, data } of results) {
    if (!data) continue;
    parts.push(
      `تست: ${term}\n` +
      `مقدار بیمار (از ورودی): ${sourceLine}\n` +
      `اطلاعات مرجع MedlinePlus: ${data.summary}`
    );
    if (data.url) sources.push(data.url);
  }

  if (parts.length === 0) return { context: "", sources: [] };
  return { context: parts.join("\n\n---\n\n"), sources };
}

// ============================================================
// [۶] پرامپت مرحله اول — OCR خالص
// این مدل هیچ تحلیلی نمی‌کند. فقط جدول را می‌خواند.
// جدا کردن خواندن از تحلیل، خطای جابه‌جایی ردیف/ستون را کم می‌کند.
// ============================================================
const OCR_PROMPT = `تو یک استخراج‌کنندهٔ دقیق داده از برگهٔ آزمایش پزشکی هستی. وظیفهٔ تو فقط و فقط خواندن است. هیچ تفسیر، تحلیل، نظر پزشکی یا نتیجه‌گیری ارائه نده.

## روش خواندن
- جدول را ردیف به ردیف بخوان. هر ردیف یک تست است.
- ستون‌ها معمولاً به این ترتیب‌اند: نام تست | نتیجه (Result) | واحد (Unit) | محدوده مرجع (Normal Range)
- ستون‌ها را با دقت دنبال کن. هرگز مقدار یک ردیف را به ردیف دیگر نسبت نده.
- ستون «نتیجه» و ستون «محدوده مرجع» را با هم اشتباه نگیر. مقدار بیمار یک عدد تکی است؛ محدوده مرجع معمولاً دو عدد با خط تیره است (مثل 80 - 100). هرگز عدد ابتدای محدوده مرجع را به‌عنوان نتیجه ثبت نکن.
- قبل از ثبت هر عدد، بررسی کن که واقعاً در همان ردیفِ نام تست و در ستون درست قرار دارد.
- هیچ ردیفی را جا نینداز. همهٔ ردیف‌های جدول را بخوان.

## نکات مهم
- حرف H یا L چسبیده به عدد (مثل «L 2.58» یا «H 104.4») یعنی High/Low. عدد را جدا کن و H/L را در فیلد flag بگذار.
- محدودهٔ مرجع را دقیقاً از روی همان برگه بخوان. از دانش خودت محدوده نساز. اگر برگه محدوده‌ای ننوشته، reference را null بگذار.
- واحد را عیناً همان‌طور که در برگه نوشته شده ثبت کن.
- تست‌هایی که در برگه نیستند را اضافه نکن.
- اگر برگه بخش‌های مختلف دارد (Hematology، Hemostasis، Biochemistry، Differential و…)، همهٔ ردیف‌ها را بخوان.
- یادداشت‌های کیفی مثل Anisocytosis (+++) را هم ثبت کن؛ value را همان متن بگذار.
- اگر عددی تار، مبهم یا مخدوش است، confidence را "low" بگذار. اگر اصلاً خوانا نیست، value را null بگذار.
- اطلاعات شناسایی‌کننده (نام بیمار، کد ملی، تلفن، نام پزشک) را ثبت نکن. فقط سن و جنسیت را در صورت وجود بردار.

## خروجی
فقط JSON برگردان، بدون بک‌تیک و بدون متن اضافه. کوتاه و فشرده بنویس:
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
  "extracted_tests": [ { "test": "نام تست", "value": "مقدار و واحد", "reference": "محدوده مرجع" } ],
  "abnormal_results": [ { "test": "نام تست", "value": "مقدار و واحد", "severity": "خفیف|متوسط|بحرانی", "note": "توضیح کوتاه و ساده متناسب با شدت انحراف" } ],
  "interpretation": "تحلیل پیوسته و ساده با در نظر گرفتن شرایط بیمار، تصویر کلی و شدت انحرافات",
  "general_recommendations": ["توصیه ۱", "توصیه ۲"],
  "disclaimer": "هشدار متناسب با شدت و یادآوری مراجعه به پزشک",
  "has_critical": true
}

در abnormal_results فقط تست‌هایی را بیاور که واقعاً خارج از محدودهٔ ارائه‌شده هستند. انحرافات بسیار جزئی را می‌توانی با severity «خفیف» و لحن اطمینان‌بخش بیاوری. extracted_tests فقط وقتی پر می‌شود که ورودی از عکس خوانده شده باشد. has_critical فقط وقتی true است که حداقل یک مقدار در محدودهٔ بحرانی واقعی باشد.`;

// ============================================================
// [۸] فراخوانی AvalAI — تابع مشترک
// ============================================================
async function callAvalAI({ model, messages, maxTokens = 2000, temperature = 0.2 }) {
  let upstream;
  try {
    upstream = await fetch(`${AVALAI_BASE_URL}/chat/completions`, {
      method: "POST",
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AVALAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        response_format: { type: "json_object" },
        max_tokens: maxTokens,
      }),
    });
  } catch (err) {
    // خطای شبکه یا اتمام مهلت
    console.error("AvalAI fetch failed:", model, err.name, err.message);
    const e = new Error("upstream_timeout");
    e.model = model;
    throw e;
  }

  if (!upstream.ok) {
    const errText = await upstream.text();
    console.error("AvalAI error:", model, upstream.status, errText.slice(0, 400));
    const e = new Error("upstream_error");
    e.status = upstream.status;
    throw e;
  }

  const data = await upstream.json();

  // اگر مدل به دلیل رسیدن به سقف توکن متوقف شده باشد، خروجی ناقص است
  const finishReason = data?.choices?.[0]?.finish_reason;
  if (finishReason === "length") {
    console.warn("AvalAI response truncated (max_tokens reached) for model:", model);
  }

  return data?.choices?.[0]?.message?.content || "{}";
}

// ============================================================
// [۹] تلاش برای خواندن JSON، حتی اگر کمی ناقص باشد
// ============================================================
function safeParseJson(raw) {
  if (!raw) return null;

  // تلاش اول: مستقیم
  try {
    return JSON.parse(raw);
  } catch { /* ادامه */ }

  // تلاش دوم: حذف بک‌تیک احتمالی
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch { /* ادامه */ }

  // تلاش سوم: اگر خروجی نصفه مانده، تا آخرین شیء کامل را برداریم
  // (مثلاً وقتی مدل وسط نوشتن tests قطع شده)
  const lastComplete = cleaned.lastIndexOf("},");
  if (lastComplete > 0) {
    const candidate = cleaned.slice(0, lastComplete + 1) + "]}";
    try {
      return JSON.parse(candidate);
    } catch { /* ادامه */ }
  }

  return null;
}

// ============================================================
// [۱۰] مرحله اول — خواندن عکس (OCR خالص)
// ============================================================
async function readImage(imageDataUrl) {
  const raw = await callAvalAI({
    model: VISION_MODEL,
    temperature: 0,      // برای خواندن، خلاقیت صفر
    maxTokens: 4000,     // جای کافی برای همه ردیف‌ها
    messages: [
      { role: "system", content: OCR_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: "این برگهٔ آزمایش را ردیف به ردیف بخوان و طبق قالب JSON برگردان." },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
  });

  const parsed = safeParseJson(raw);
  if (!parsed) {
    console.error("OCR JSON parse failed. Raw head:", raw.slice(0, 300));
  }
  return parsed;
}

// ============================================================
// [۱۱] تبدیل خروجی OCR به متن برای مرحله تحلیل
// ============================================================
function ocrToText(ocr) {
  if (!ocr || !Array.isArray(ocr.tests)) return { text: "", warnings: [] };

  const lines = [];
  const warnings = [];

  for (const t of ocr.tests) {
    if (!t || !t.name) continue;

    // مقادیر ناخوانا را وارد تحلیل نمی‌کنیم
    if (t.value === null || t.value === undefined || t.value === "") {
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
// [۱۲] ساخت پیام کاربر برای مرحله تحلیل
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
// [۱۳] نقطه پایانی اصلی
// ============================================================
app.post("/api/analyze", async (req, res) => {
  try {
    const { patientInfo, testResults, imageDataUrl } = req.body || {};
    const hasText = testResults && testResults.trim();
    const hasImage = imageDataUrl && imageDataUrl.startsWith("data:image");

    if (!hasText && !hasImage) {
      return res.status(400).json({ error: "نه متن آزمایش وارد شده و نه عکسی آپلود شده است." });
    }

    let finalText = hasText ? testResults : "";
    let ocrWarnings = [];
    let ocrPatient = null;

    // ---- مرحله ۱: اگر عکس هست، اول بخوان ----
    if (hasImage) {
      const ocr = await readImage(imageDataUrl);
      if (!ocr) {
        return res.status(502).json({
          error: "خواندن عکس ممکن نشد. لطفاً عکس واضح‌تری آپلود کنید یا مقادیر را دستی وارد کنید.",
        });
      }

      const { text, warnings } = ocrToText(ocr);
      if (!text) {
        return res.status(422).json({
          error: "هیچ مقدار خوانایی در عکس پیدا نشد. لطفاً عکس واضح‌تری بگیرید یا مقادیر را دستی وارد کنید.",
          ocr_warnings: warnings,
        });
      }

      ocrWarnings = warnings;
      ocrPatient = ocr.patient || null;

      finalText = hasText ? `${testResults}\n\n--- خوانده‌شده از عکس ---\n${text}` : text;
    }

    // ---- زمینه MedlinePlus (برای عکس هم فعال است) ----
    let medlineContext = "";
    try {
      const { context } = await buildMedlineContext(finalText);
      medlineContext = context;
    } catch (e) {
      console.error("MedlinePlus context build failed:", e.message);
    }

    // ---- اطلاعات بیمار: ورودی کاربر اولویت دارد ----
    let patientText = patientInfo || "";
    if (!patientText && ocrPatient) {
      const bits = [];
      if (ocrPatient.age) bits.push(`سن: ${ocrPatient.age}`);
      if (ocrPatient.sex) bits.push(`جنسیت: ${ocrPatient.sex}`);
      if (bits.length) patientText = bits.join("، ") + " (از روی برگه خوانده شد)";
    }

    // ---- مرحله ۲: تحلیل ----
    const raw = await callAvalAI({
      model: TEXT_MODEL,
      maxTokens: 2500,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        buildAnalysisMessage(patientText, finalText, medlineContext, hasImage),
      ],
    });

    const parsed = safeParseJson(raw);
    if (!parsed) {
      return res.status(200).json({ raw, parseError: true, ocr_warnings: ocrWarnings });
    }

    if (ocrWarnings.length) parsed.ocr_warnings = ocrWarnings;

    res.json(parsed);
  } catch (err) {
    if (err.message === "upstream_timeout") {
      return res.status(504).json({
        error: "پاسخ سرویس هوش مصنوعی خیلی طول کشید. لطفاً دوباره تلاش کنید.",
      });
    }
    if (err.message === "upstream_error") {
      return res.status(502).json({ error: "خطا در ارتباط با سرویس هوش مصنوعی." });
    }
    console.error(err);
    res.status(500).json({ error: "خطای داخلی سرور." });
  }
});

app.get("/health", (_req, res) =>
  res.json({
    ok: true,
    textModel: TEXT_MODEL,
    visionModel: VISION_MODEL,
    medline: "webservice",
    ocr: "two-stage",
    aiTimeoutMs: AI_TIMEOUT_MS,
  })
);

app.listen(PORT, () => {
  console.log(`سرور واسط (با MedlinePlus) روی پورت ${PORT} در حال اجراست`);
  console.log(`مدل متن: ${TEXT_MODEL} | مدل بینایی: ${VISION_MODEL} | مهلت: ${AI_TIMEOUT_MS}ms`);
  if (!AVALAI_API_KEY) console.warn("⚠️  هشدار: AVALAI_API_KEY تنظیم نشده! فایل .env را بساز.");
});
