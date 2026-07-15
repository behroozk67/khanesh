// ============================================================
// سرور واسط «خوانش» — نسخه با غنی‌سازی MedlinePlus
// ------------------------------------------------------------
// این نسخه علاوه بر کار قبلی (اتصال امن به آوال‌ای)، قبل از
// فرستادن درخواست به مدل، اطلاعات مرتبط هر تست را از وب‌سرویس
// رسمی MedlinePlus می‌گیرد و به‌عنوان «زمینه معتبر» به پرامپت
// تزریق می‌کند تا تفسیر AI دقیق‌تر و مستندتر شود.
//
// قرارداد API دقیقاً مثل قبل است:
//   POST /api/analyze  با بدنه { patientInfo, testResults?, imageDataUrl? }
//   خروجی: همان JSON ساختاریافته که فرانت‌اند انتظار دارد.
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

// وب‌سرویس رسمی MedlinePlus (رایگان، بدون ثبت‌نام)
const MEDLINE_BASE = "https://wsearch.nlm.nih.gov/ws/query";

// ============================================================
// [۱] نگاشت نام فارسی/انگلیسی تست‌ها به عبارت جستجوی MedlinePlus
// کلید = نامی که ممکن است در متن ورودی بیاید (فارسی یا انگلیسی)
// مقدار = عبارت جستجوی انگلیسی مناسب برای MedlinePlus
// این نگاشت همه تست‌های REF فرانت‌اند را پوشش می‌دهد.
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
  "هماتوکریت": "Hematocrit Test",
  "hematocrit": "Hematocrit Test",
  "hct": "Hematocrit Test",
  "mcv": "Red Blood Cell (RBC) Indices",
  "mch": "Red Blood Cell (RBC) Indices",
  "mchc": "Red Blood Cell (RBC) Indices",
  "پلاکت": "Platelet Tests",
  "platelet": "Platelet Tests",
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
// فرانت‌اند خطوطی مثل «قند خون ناشتا: 95 mg/dL (محدوده طبیعی: 70-110)» می‌فرستد.
// این تابع نام هر خط را جدا کرده و به عبارت MedlinePlus نگاشت می‌کند.
// ============================================================
function extractMedlineTerms(testResultsText) {
  if (!testResultsText) return [];
  const terms = new Map(); // عبارت MedlinePlus → نام تست اصلی (برای جلوگیری از تکرار)
  const lines = testResultsText.split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    // نام تست معمولاً قبل از «:» است
    const namePart = (line.split(":")[0] || "").trim().toLowerCase();
    if (!namePart) continue;
    // جستجو در نگاشت: اگر کلیدی از نگاشت داخل نام خط بود
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
// [۳] کش ساده در حافظه برای نتایج MedlinePlus
// طبق سیاست NLM، نتایج را ۱۲ تا ۲۴ ساعت کش می‌کنیم تا بار سرور کم شود.
// ============================================================
const medlineCache = new Map(); // term → { summary, url, ts }
const CACHE_TTL = 20 * 60 * 60 * 1000; // ۲۰ ساعت

// حذف تگ‌های HTML و span های هایلایت از خلاصه
function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")   // حذف همه تگ‌ها
    .replace(/\s+/g, " ")        // فشرده‌سازی فاصله‌ها
    .trim();
}

// استخراج اولین FullSummary از پاسخ XML وب‌سرویس (بدون کتابخانه، با regex ساده)
function parseFirstSummary(xml) {
  if (!xml) return null;
  // به دنبال اولین content با name="FullSummary"
  const m = xml.match(/<content name="FullSummary">([\s\S]*?)<\/content>/i);
  if (!m) return null;
  // محتوای داخل ممکن است entity های XML داشته باشد
  let raw = m[1]
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return stripHtml(raw);
}

// گرفتن URL موضوع از اولین document
function parseFirstUrl(xml) {
  if (!xml) return null;
  const m = xml.match(/<document[^>]*url="([^"]+)"/i);
  return m ? m[1] : null;
}

// ============================================================
// [۴] واکشی خلاصه یک تست از MedlinePlus (با کش)
// ============================================================
async function fetchMedline(term) {
  const now = Date.now();
  const cached = medlineCache.get(term);
  if (cached && now - cached.ts < CACHE_TTL) return cached;

  try {
    const url =
      `${MEDLINE_BASE}?db=healthTopics&rettype=brief&retmax=1` +
      `&tool=khanesh&term=${encodeURIComponent(term)}`;
    const res = await fetch(url, { headers: { Accept: "application/xml" } });
    if (!res.ok) return null;
    const xml = await res.text();
    const summary = parseFirstSummary(xml);
    const topicUrl = parseFirstUrl(xml);
    if (!summary) return null;
    // خلاصه را به حدود ۶۰۰ کاراکتر محدود می‌کنیم تا پرامپت سنگین نشود
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
// [۵] ساخت رشته زمینه از داده MedlinePlus برای همه تست‌های مطابقت‌یافته
// ============================================================
async function buildMedlineContext(testResultsText) {
  const items = extractMedlineTerms(testResultsText);
  if (items.length === 0) return { context: "", sources: [] };

  const parts = [];
  const sources = [];
  // به‌صورت موازی می‌گیریم ولی تعداد کم است (چند تست)
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
// [۶] System Prompt — مغز علمی محصول (مثل قبل، با افزودن دستور استفاده از زمینه)
// ============================================================
const SYSTEM_PROMPT = `شما یک تحلیلگر مجرب نتایج آزمایش‌های پزشکی هستید که تفسیری اولیه، دقیق و آموزشی به زبان ساده فارسی ارائه می‌دهید. شما پزشک نیستید و هرگز تشخیص قطعی نمی‌دهید یا دارو تجویز نمی‌کنید. هدف شما افزایش آگاهی بیمار است، نه آموزش تخصصی پزشکی.

## استفاده از دانش پزشکی معتبر
برای تفسیر نتایج، از دانش پزشکی همسو با معتبرترین منابع علمی و راهنماهای بین‌المللی استفاده کن، از جمله: CLSI (Clinical and Laboratory Standards Institute)، UpToDate، Merck Manual Professional، LabTestsOnline، NIH و AACC (Association for Diagnostics & Laboratory Medicine). از این دانش برای درک عملکرد تست‌ها، ارتباط بین نتایج، اهمیت بالینی، علل احتمالی و ارائه توصیه‌های عمومی استفاده کن. پاسخ باید از نظر علمی دقیق و همسو با این منابع باشد.

## قانون طلایی: فقط بر اساس محدوده‌های ارائه‌شده قضاوت کن
برای هر تست، محدوده مرجع دقیق در ورودی به تو داده می‌شود. قضاوت «نرمال / بالا / پایین» را فقط و فقط بر اساس همین محدوده‌های ارائه‌شده انجام بده، نه بر اساس دانش عمومی خودت. اگر مقداری داخل محدوده ارائه‌شده است، آن را نرمال بدان — حتی اگر با محدوده‌ای که در ذهن داری کمی فرق کند. هرگز تستی را که داخل محدوده است «بالا» یا «پایین» توصیف نکن.

## زبان ساده و قابل فهم برای عموم
- پاسخ را کاملاً به فارسی روان و ساده بنویس، طوری که فردی بدون دانش پزشکی هم مفهوم آن را درک کند.
- از اصطلاحات پیچیده و توضیحات بیش از حد تخصصی خودداری کن. اگر اصطلاح پزشکی ضروری بود، بلافاصله معنی ساده‌اش را هم بگو.
- پاسخ باید کوتاه، روان، کاربردی و کاملاً قابل فهم باشد.

## توجه به شدت انحراف (بسیار مهم)
صرف خارج بودن از محدوده کافی نیست؛ «میزان» انحراف را بسنج و لحن و اهمیت را متناسب با آن تنظیم کن:
- انحراف جزئی (تا حدود ۱۰ تا ۱۵ درصد فراتر از مرز): معمولاً اهمیت بالینی کمی دارد. با لحن آرام و اطمینان‌بخش توصیف کن و صرفاً پیگیری ساده یا تکرار آزمایش را پیشنهاد بده. از ایجاد نگرانی بی‌مورد خودداری کن. مثال: اوره‌ای که فقط ۲ واحد بالاتر از حد نرمال است، ارزش بالینی چندانی ندارد و نباید مثل یک مشکل جدی توصیف شود.
- انحراف متوسط: شایسته توجه است؛ ارزیابی توسط پزشک در آینده نزدیک را پیشنهاد بده.
- انحراف شدید یا مقادیر بحرانی: واضح، ساده و بدون اغراق بیان کن و مراجعه سریع به پزشک را توصیه کن.

## تحلیل به‌صورت تصویر کلی (تشخیص الگو)
نتایج را جدا از هم نبین. مهم‌ترین یافته‌ها را به زبان ساده توضیح بده و در صورت مشاهده الگوهای مرتبط، آن‌ها را توضیح بده (مثلاً هموگلوبین پایین همراه با فریتین پایین و MCV پایین = الگوی کم‌خونی فقر آهن). فقط در صورت نیاز علل احتمالی را بیان کن. اگر چند انحراف جزئی و بی‌ربط وجود دارد، لازم نیست همه را بزرگ کنی.

## دقت در تشخیص تست‌ها (به‌ویژه از روی عکس)
اگر ورودی از روی عکس خوانده می‌شود، به واحدها دقت کن تا تست‌ها را اشتباه نگیری:
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

در abnormal_results فقط تست‌هایی را بیاور که واقعاً خارج از محدوده ارائه‌شده هستند. انحرافات بسیار جزئی را می‌توانی با severity «خفیف» و لحن اطمینان‌بخش بیاوری. extracted_tests فقط وقتی پر می‌شود که ورودی از عکس خوانده شده باشد. has_critical فقط وقتی true است که حداقل یک مقدار در محدوده بحرانی واقعی باشد.`;

// ============================================================
// [۷] ساخت پیام کاربر (متن یا عکس) با تزریق زمینه MedlinePlus
// ============================================================
function buildTextUserMessage(patientInfo, testResults, medlineContext) {
  let text =
    `<patient_info>\n${patientInfo || "ارائه نشده"}\n</patient_info>\n\n` +
    `<test_results>\n${testResults}\n</test_results>`;
  if (medlineContext) {
    text += `\n\n<زمینه معتبر از MedlinePlus>\n${medlineContext}\n</زمینه معتبر از MedlinePlus>`;
  }
  return { role: "user", content: text };
}

function buildImageUserMessage(patientInfo, imageDataUrl, medlineContext) {
  const textParts =
    `اطلاعات بیمار:\n<patient_info>\n${patientInfo || "ارائه نشده"}\n</patient_info>\n\n` +
    `عکس برگه آزمایش پیوست است. مقادیر را از روی عکس استخراج و سپس تحلیل کن.` +
    (medlineContext
      ? `\n\n<زمینه معتبر از MedlinePlus>\n${medlineContext}\n</زمینه معتبر از MedlinePlus>`
      : "");
  return {
    role: "user",
    content: [
      { type: "text", text: textParts },
      { type: "image_url", image_url: { url: imageDataUrl } },
    ],
  };
}

// ============================================================
// [۸] نقطه پایانی اصلی — قرارداد دقیقاً مثل قبل
// ============================================================
app.post("/api/analyze", async (req, res) => {
  try {
    const { patientInfo, testResults, imageDataUrl } = req.body || {};
    const hasText = testResults && testResults.trim();
    const hasImage = imageDataUrl && imageDataUrl.startsWith("data:image");

    if (!hasText && !hasImage) {
      return res.status(400).json({ error: "نه متن آزمایش وارد شده و نه عکسی آپلود شده است." });
    }

    // زمینه MedlinePlus را می‌سازیم.
    // فقط برای حالت متن، چون مقادیر دقیق را داریم.
    // برای عکس، مدل یک‌بار عکس را می‌خواند و تفسیر می‌کند (خواندن دقیق‌تر)،
    // بدون مرحله استخراج جداگانه که دقت را پایین می‌آورد.
    let medlineContext = "";
    if (hasText) {
      try {
        const { context } = await buildMedlineContext(testResults);
        medlineContext = context;
      } catch (e) {
        // اگر MedlinePlus در دسترس نبود، بدون زمینه ادامه می‌دهیم (سرور خراب نمی‌شود)
        console.error("MedlinePlus context build failed:", e.message);
      }
    }

    const model = hasImage ? VISION_MODEL : TEXT_MODEL;
    const userMessage = hasImage
      ? buildImageUserMessage(patientInfo, imageDataUrl, medlineContext)
      : buildTextUserMessage(patientInfo, testResults, medlineContext);

    const upstream = await fetch(`${AVALAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AVALAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          userMessage,
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
        max_tokens: 2000,
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error("AvalAI error:", upstream.status, errText);
      return res.status(502).json({ error: "خطا در ارتباط با سرویس هوش مصنوعی." });
    }

    const data = await upstream.json();
    const raw = data?.choices?.[0]?.message?.content || "{}";

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.status(200).json({ raw, parseError: true });
    }
    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "خطای داخلی سرور." });
  }
});

app.get("/health", (_req, res) =>
  res.json({ ok: true, textModel: TEXT_MODEL, visionModel: VISION_MODEL, medline: "webservice" })
);

app.listen(PORT, () => {
  console.log(`سرور واسط (با MedlinePlus) روی پورت ${PORT} در حال اجراست`);
  if (!AVALAI_API_KEY) console.warn("⚠️  هشدار: AVALAI_API_KEY تنظیم نشده! فایل .env را بساز.");
});
