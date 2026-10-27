// ============================================================
// صفحهٔ نتیجه — بازنویسی‌شده حولِ حکمِ موتور، نه فقط نثرِ مدل.
//
// ترتیبِ نمایش (تصمیمِ کاربر؛ انتقالِ هشدارهای صفحه/OCR به پایانِ صفحه):
//   ۱. بنرِ فوریت (قرمز) — فقط وقتی فوریت هست؛ بنرِ سبزِ «همه‌چیز خوب است» هرگز.
//      بعدش «تفسیر بر پایهٔ …» و سوییچِ نما.
//   ۲. خلاصه  ۳. تفسیر  ۴. توصیه‌ها
//   ۵. داشبورد (ResultDashboard.jsx) — جایگاهِ اعداد، امتیازِ برگه، دستگاه‌ها.
//   ۶. اعدادی که از برگه خواندیم (+ تبدیلِ واحدها).
//   ۷. مقادیرِ محاسبه‌شده (N5: همیشه با تصریحِ اینکه روی برگه نیستند)، منابع، هشدارهای صفحه/OCR (مواردِ ناقص یا تفسیرنشده)، «این تفسیر چطور ساخته شد؟»، سلبِ مسئولیت.
// «همهٔ آزمایش‌ها» حذف شد؛ یادداشتِ N5 («روی برگهٔ شما: X») برای کلسیم/سدیمِ تصحیح‌شده به داشبورد رفت.
// ============================================================

import { useState } from "react";
import Num from "./Num.jsx";
import ResultDashboard from "./ResultDashboard.jsx";
import PhenoAgeCard from "./PhenoAgeCard.jsx";
import ExpertView from "./ExpertView.jsx";
import Segmented from "./Segmented.jsx";
import ExtractedTests from "./ExtractedTests.jsx";
import { toFaDigits } from "./digits.js";
import { buildVerdictContext } from "./resultStates.js";
import { CATEGORY_ORDER, categoryOf } from "./testCategories.js";

/* ---------- بلوکِ حالت سوم ---------- */

function UnmatchedNote({ rows }) {
  if (!rows.length) return null;
  return (
    <section className="card prose-block unmatched-box">
      <h2 className="block-title">خارج از محدوده — تفسیرش با پزشک است</h2>
      <p className="text">
        {rows.length === 1 ? "این مقدار" : "این مقادیر"} خارج از محدودهٔ مرجع است، ولی ما الگوی
        مشخصی برایش نداریم که بتوانیم با اطمینان توضیحش دهیم. یعنی نمی‌شود بدون معاینه و سابقهٔ
        شما درباره‌اش نتیجه گرفت — نه اینکه حتماً مشکلی هست.
      </p>
      <p className="text">
        محدودهٔ مرجع طوری تعریف می‌شود که ۹۵ درصد افراد سالم داخل آن بیفتند؛ یعنی حدود ۵ نفر از
        هر ۱۰۰ فرد کاملاً سالم هم بیرون از آن قرار می‌گیرند.
      </p>
      <ul className="bullet-list">
        {rows.map((t) => (
          <li key={t.key}>
            {t.name}: <Num>{t.value}</Num>{" "}
            {t.range && <span className="row-range">(محدودهٔ مرجع: <Num>{t.range}</Num>)</span>}
          </li>
        ))}
      </ul>
      <p className="text">
        این {rows.length === 1 ? "عدد" : "عددها"} را با پزشک مطرح کنید و همین برگه را همراه ببرید.
      </p>
    </section>
  );
}

/* ---------- مقادیر محاسبه‌شده ---------- */

const INDEX_LABELS = {
  ca_corrected: "کلسیم تصحیح‌شده",
  na_corrected: "سدیم تصحیح‌شده",
  anion_gap: "شکاف آنیونی",
  anion_gap_corr: "شکاف آنیونی تصحیح‌شده",
  non_hdl: "کلسترول non-HDL",
  bun_cr: "نسبت اوره به کراتینین",
  mentzer: "شاخص منتزر",
  nlr: "نسبت نوتروفیل به لنفوسیت",
  r_ratio: "نسبت R (الگوی کبدی)",
  fib4: "FIB-4 (برآوردِ فیبروزِ کبد)",
  aip: "شاخصِ آتروژنیکِ پلاسما (AIP)",
};

// P110-ج: جملهٔ اطلاعاتیِ زیرِ دو شاخص — مرزها از سرور نیست، عیناً همان که در expert.js و MEDICAL_RULES.md (P110-ج) آمده.
//   هیچ‌کدام پیگیری یا فوریت نمی‌سازند.
function indexNote(k, indices) {
  const v = indices[k];
  if (k === "fib4") {
    const base = v < 1.3 ? "زیرِ ۱٫۳ است: احتمالِ فیبروزِ پیشرفتهٔ کبد پایین است." : "از ۱٫۳ کمتر نیست؛ تفسیرش با پزشک است.";
    return base + (indices.fib4_low_accuracy ? " در سنِ ۳۵ سال و کمتر دقتِ این شاخص پایین است." : "") + " فقط اطلاعاتی است.";
  }
  if (k === "aip") {
    const band = v < 0.11 ? "کم" : v <= 0.21 ? "متوسط" : "بیشتر";
    return `در تقسیم‌بندیِ جهت‌دهندهٔ Dobiášová گروهِ «${band}» است (زیرِ ۰٫۱۱ کم، ۰٫۱۱ تا ۰٫۲۱ متوسط، بالای ۰٫۲۱ بیشتر)؛ خبرش همان تری‌گلیسرید و HDL است و پیگیریِ جدا ندارد.`;
  }
  return null;
}

// جفتِ «اندازه‌گیری‌شده ← محاسبه‌شده»: عددِ تصحیح‌شده هرگز بدونِ عددِ
// روی برگه نمایش داده نمی‌شود (N5).
const MEASURED_OF = { ca_corrected: "ca_measured", na_corrected: "na_measured" };
// ۲۰۲۶-۱۰-۱۶: «روی برگهٔ شما: 9.9» نامِ آزمایش را نداشت و در چیدمانِ راست‌به‌چپ زیرِ eGFR دیده می‌شد — عددِ کلسیم کنارِ eGFR (N5).
const MEASURED_NAME = { ca_corrected: "کلسیم", na_corrected: "سدیم" };

function DerivedValues({ indices }) {
  if (!indices) return null;
  const shown = Object.keys(INDEX_LABELS).filter(
    (k) => indices[k] !== undefined && indices[k] !== null
  );
  if (!shown.length) return null;

  return (
    <section className="card">
      <h2 className="block-title">مقادیر محاسبه‌شده</h2>
      <p className="hint">
        این عددها روی برگهٔ آزمایشگاه نیستند — ما آن‌ها را از روی مقادیر خودتان حساب کرده‌ایم.
      </p>
      <ul className="derived-list">
        {shown.map((k) => {
          const measuredKey = MEASURED_OF[k];
          const measured = measuredKey ? indices[measuredKey] : null;
          return (
            <li key={k} className="derived-row">
              {measured != null && (
                <span className="derived-parent">
                  {MEASURED_NAME[k]} روی برگهٔ شما: <Num>{measured}</Num>
                </span>
              )}
              <span className="derived-child">
                <span>{INDEX_LABELS[k]}</span>
                <Num>{indices[k]}</Num>
                <span className="mini-chip st-unmatched">محاسبه‌شده</span>
              </span>
              {indexNote(k, indices) && <span className="hint">{indexNote(k, indices)}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------- واحدها ---------- */

// چرا این واحد؟ متن‌ها عیناً از specs/003-unitless-lab-values/contracts/engine-output.md
// نبودنِ basis (پاسخِ سرورِ قدیمی) یعنی «printed».
const BASIS_TEXT = {
  printed: "واحد روی برگه نوشته شده بود.",
  reference: "واحد روی برگه نبود؛ از محدودهٔ مرجعی که آزمایشگاه کنارِ این عدد چاپ کرده تعیین شد.",
  magnitude: "واحد روی برگه نبود؛ این عدد فقط با یک واحد ممکن است، پس همان در نظر گرفته شد.",
  // P89: واحدِ هموگلوبین از MCHC/هماتوکریت یا MCH/گلبولِ قرمزِ همان برگه (دستگاه این شاخص‌ها را از خودِ هموگلوبین حساب می‌کند).
  indices: "واحد روی برگه نبود؛ از سازگاریِ این عدد با شاخص‌های گلبولِ قرمزِ همین برگه (MCHC و هماتوکریت، یا MCH و تعداد گلبول قرمز) تعیین شد.",
};

// «۴۸ mmol/mol» روی برگه و «۶.۵۴٪» در تفسیر بدونِ این سطر شبیهِ اشتباه است. سرور این فهرست را
// همیشه می‌فرستاد (_engine.unitConversions) ولی از 763c73d هیچ جزئی رندرش نمی‌کرد.
// ⚠️ `name` رندر می‌شود، هرگز `test` — `test` کلیدِ خامِ موتور است (N8).
function UnitConversions({ rows, asText, asList }) {
  const list = asList(rows).filter((r) => r && r.name);
  if (!list.length) return null;
  return (
    <section className="card">
      <h2 className="block-title">واحدها</h2>
      <p className="hint">
        این آزمایش‌ها با واحدی غیر از واحدِ مرجعِ ما گزارش شده بودند یا واحدشان روی برگه نبود.
      </p>
      <ul className="derived-list">
        {list.map((r, i) => {
          // «mg/dl» و «mg/dL» یک واحدند — سطرِ «برای مقایسه» فقط وقتی عدد یا واحد واقعاً عوض شده باشد.
          const sameUnit = String(r.from ?? "").toLowerCase().replace(/μ/g, "µ") === String(r.to ?? "").toLowerCase().replace(/μ/g, "µ");
          const changed = r.value !== r.raw || !sameUnit;
          return (
            <li key={`${r.test}-${i}`} className="derived-row">
              {/* ⚠️ واحدِ تعیین‌شده «روی برگه» نبود — نوشتنِ «روی برگهٔ شما ۸۰ µmol/L» ادعای غلط است (N5). */}
              <span className="derived-parent">
                {r.basis && r.basis !== "printed" && r.printedUnit ? (
                  // P110-ج: واحد چاپ شده بود ولی برای این آزمایش شناخته نیست («CRP 5 IU/ml») — «بدونِ واحد» ادعای غلط است (N5).
                  <>{asText(r.name)}: روی برگهٔ شما <Num>{r.raw}</Num> {asText(r.printedUnit)} (واحدی که برای این آزمایش شناخته‌شده نیست) — واحدِ تعیین‌شده: {r.from}</>
                ) : r.basis && r.basis !== "printed" ? (
                  <>{asText(r.name)}: روی برگهٔ شما <Num>{r.raw}</Num> بدونِ واحد — واحدِ تعیین‌شده: {r.from}</>
                ) : (
                  <>{asText(r.name)}: روی برگهٔ شما <Num>{r.raw}</Num> {r.from}</>
                )}
              </span>
              {changed && (
                <span className="derived-child">
                  <span>برای مقایسه با محدودهٔ مرجع:</span>
                  <Num>{r.value}</Num> <span>{r.to}</span>
                </span>
              )}
              <span className="hint">{r.printedUnit && r.basis === "reference" ? "واحدِ چاپ‌شده برای این آزمایش شناخته‌شده نیست؛ از محدودهٔ مرجعی که آزمایشگاه کنارِ این عدد چاپ کرده تعیین شد." : (BASIS_TEXT[r.basis] ?? BASIS_TEXT.printed)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------- منشأ تفسیر ---------- */

function Provenance({ hasEngine }) {
  return (
    <details className="card prov">
      <summary className="block-title">این تفسیر چطور ساخته شد؟</summary>
      {hasEngine ? (
        <div className="prov-body">
          <p className="text">
            تصمیم‌ها اینجا با قاعده‌های ثابت گرفته می‌شود، نه با حدسِ یک مدل زبانی.
          </p>
          <p className="text">
            مقایسهٔ هر عدد با محدودهٔ مرجع، تعیین شدت، و اینکه چه چیزی نیاز به پیگیری فوری دارد —
            همه با قاعده‌هایی انجام می‌شود که از پیش نوشته شده‌اند و برای همه یکسان‌اند.
            اگر فردا همین اعداد را دوباره وارد کنید، دقیقاً همین نتیجه را می‌گیرید.
          </p>
          <p className="text">
            منبع هر محدودهٔ مرجع کنار خودش نوشته شده. کاری که هوش مصنوعی اینجا انجام می‌دهد فقط
            این است که همین یافته‌ها را به فارسی روان بازنویسی کند — اجازه ندارد عددی را عوض کند،
            یافته‌ای اضافه کند، یا موردی را حذف کند.
          </p>
          <p className="text">
            کاری که این ابزار انجام نمی‌دهد: تشخیص. تشخیص کارِ پزشکی است که شما را معاینه می‌کند
            و سابقه‌تان را می‌داند.
          </p>
        </div>
      ) : (
        // ⚠️ بدون _engine یعنی مسیرِ قدیمیِ متن‌محور، جایی که مدل خودش شدت را
        //    قضاوت می‌کند. ادعای «قاعده‌های ثابت» آنجا دروغ است — و به همین
        //    دلیل کارنامه، ردیف‌ها و نوارها هم آنجا اصلاً رندر نمی‌شوند.
        <div className="prov-body">
          <p className="text">
            این تفسیر با مدل زبانی نوشته شده و قاعده‌های بالینی ما روی آن اجرا نشده. برای تفسیر
            دقیق‌تر، تصویر برگه را بارگذاری کنید یا مقادیر را در فرم وارد کنید.
          </p>
        </div>
      )}
    </details>
  );
}

/* ---------- کامپوننت اصلی ---------- */

function ContextLine({ ctx, asText }) {
  if (!ctx) return null;
  const parts = [
    ctx.sex && asText(ctx.sex),
    ctx.age_text && asText(ctx.age_text),
    ctx.pregnant && (ctx.gest_weeks != null ? `باردار، هفتهٔ ${asText(String(ctx.gest_weeks)).replace(/d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d])}` : "باردار"),
    ...(Array.isArray(ctx.conditions_applied) ? ctx.conditions_applied.map((c) => asText(c?.fa)) : []),
  ].filter(Boolean);
  if (!parts.length) return null;
  return <p className="ctx-line">تفسیر بر پایهٔ: <b>{parts.join("، ")}</b></p>;
}

// specs/016: «ساده / تخصصی» — فقط ترجیحِ همین مرورگر. هر خطای حافظه ⇒ «ساده» (FR-014).
const VIEW_MODE_KEY = "azmayar_view_mode_v1";
function readViewMode() {
  try { return localStorage.getItem(VIEW_MODE_KEY) === "expert" ? "expert" : "simple"; } catch { return "simple"; }
}
function writeViewMode(m) {
  try { localStorage.setItem(VIEW_MODE_KEY, m); } catch { /* حافظهٔ مسدود: فقط همین بار */ }
}

export default function ResultView({ result, asText, asList }) {
  const eng = result._engine;
  const hasEngine = !!eng;
  const [viewMode, setViewMode] = useState(readViewMode);
  // نمای تخصصی فقط روی مسیرِ موتور معنا دارد؛ بیرونِ آن همیشه ساده.
  const expert = hasEngine && viewMode === "expert";
  const urgency = eng?.urgency ?? "none";
  // ⚠️ کلیدهایی که موتور صریحاً «بی‌توضیح» اعلام کرده. پیش‌تر اینجا فقط یک
  //    بولینِ کل‌پنلی از `patterns` ساخته می‌شد و به هر ردیفِ غیرطبیعی
  //    می‌خورد — توضیح در resultStates.js. پاسخِ سرورِ قدیمی این فیلد را
  //    ندارد؛ آرایهٔ خالی یعنی هیچ ردیفی چیپِ «بی‌توضیح» نمی‌گیرد، که از
  //    چسباندنش به ردیفِ توضیح‌داده‌شده بهتر است.
  const uncoveredKeys = Array.isArray(eng?.uncovered) ? eng.uncovered : [];

  // ⚠️ نامِ خالی یعنی faName() چیزی نداشته. ردیف حذف می‌شود، ولی کلیدِ خام
  //    («HGB», «BILI_T») هرگز به‌جایش چاپ نمی‌شود — همان کلاسی که N8 است.
  const tests = (Array.isArray(eng?.tests) ? eng.tests : []).filter(
    (t) => t && typeof t.name === "string" && t.name.trim()
  );

  const ctx = buildVerdictContext(tests, urgency, uncoveredKeys);

  // نوزادی که فقط به‌خاطرِ کفِ «همین امروز» اورژانس شده: متنِ بنر را سرور می‌دهد (rules/neonatal.js). بدونِ آن
  // (یا سرورِ قدیمی) بنرِ عمومی می‌آید. شکلِ ناقص = بنرِ عمومی، نه بنرِ خالی.
  const cb = eng?.critical_banner;
  const todayBanner = cb && typeof cb.title === "string" && typeof cb.body === "string" ? cb : null;

  // گروه‌بندی به تفکیک دستگاه بدن؛ کلیدِ ناشناخته در «سایر» می‌افتد و
  // هرگز ناپدید نمی‌شود.
  const bucket = {};
  for (const t of tests) (bucket[categoryOf(t.key)] ||= []).push(t);
  const groups = CATEGORY_ORDER.filter((c) => bucket[c]?.length).map((c) => ({
    key: c,
    rows: bucket[c],
  }));

  // فقط ردیف‌هایی که موتور نامشان را برده، نه هر ردیفِ غیرطبیعیِ پنل.
  const unmatchedRows = tests.filter((t) => ctx.uncovered.has(t.key));
  const extracted = asList(result.extracted_tests);

  return (
    <div className="result">
      {/* ۰. فوریت — فقط وقتی هست. بنر «همه خوب است» عمداً وجود ندارد.
             role="alert" چون این تنها رشتهٔ واقعاً فوریِ صفحه است و تا امروز
             یک <div> ساده بود که هیچ اسکرین‌ریدری اعلامش نمی‌کرد. */}
      {result.has_critical && (
        <div className={todayBanner && todayBanner.tone !== "emergency" ? "crit-banner crit-banner--today" : "crit-banner"} role="alert">
          <p className="crit-title">{todayBanner ? asText(todayBanner.title) : "این نتیجه باید همین امروز دیده شود"}</p>
          <p className="crit-body">
            {todayBanner ? asText(todayBanner.body) : (
              "منتظر صبح نمانید — طبق دستورِ همین گزارش همین حالا به نزدیک‌ترین اورژانس بروید " +
              "یا با ۱۱۵ تماس بگیرید و همین برگه را همراه ببرید. حتی اگر حالتان خوب است، این نتیجه را " +
              "به فردا موکول نکنید."
            )}
          </p>
        </div>
      )}

      {/* specs/011 (FR-016): آنچه موتور واقعاً به کار برد — فقط از _engine.context، هرگز از پروفایلِ کلاینت.
             بیماریِ تیک‌خورده‌ای که قاعده ندارد اینجا نمی‌آید (FR-019). سرورِ قدیمی context ندارد ⇒ چیزی رندر نمی‌شود. */}
      <ContextLine ctx={eng?.context} asText={asText} />

      {hasEngine && (
        <div className="view-switch">
          <Segmented
            label="نمای نتیجه"
            value={expert ? "expert" : "simple"}
            options={[{ value: "simple", label: "ساده" }, { value: "expert", label: "تخصصی (کادر درمان)" }]}
            onChange={(m) => { setViewMode(m); writeViewMode(m); }}
            size="sm"
          />
        </div>
      )}

      {/* P113 — کارتِ سنِ زیستی، پیش از تفسیر و فقط در نمای ساده.
             داده‌اش را سرور می‌سازد (`_engine.phenoAge`)؛ نبودش ⇒ کارت رندر نمی‌شود. */}
      {!expert && <PhenoAgeCard data={eng?.phenoAge} />}

      {/* ۳. خروجی گراف LabMat (بیمار و پزشک) */}
      {result.labmat && (
        <>
          {result.labmat.safetyDetails?.score < 50 && (
            <div className="crit-banner" role="alert">
              <p className="crit-title">هشدار ایمنی (نمره ایمنی: {result.labmat.safetyDetails.score})</p>
              <p className="crit-body">
                {result.labmat.safetyDetails.warnings?.length > 0 
                  ? result.labmat.safetyDetails.warnings.map(w => asText(w)).join(' - ')
                  : "موارد احتیاطی فوری در نتایج شما دیده شده است. لطفاً سریعاً به پزشک مراجعه کنید."}
              </p>
            </div>
          )}
          
          <section className="card prose-block">
            <h2 className="block-title">تفسیر برای شما (زبان ساده)</h2>
            <p className="text">{asText(result.labmat.patientSection)}</p>
          </section>

          <section className="card prose-block">
            <h2 className="block-title">گزارش تخصصی برای پزشک</h2>
            <p className="text">{asText(result.labmat.doctorSection)}</p>
            {result.labmat.suggestedFollowUps?.length > 0 && (
              <div style={{marginTop: "1rem"}}>
                <strong>آزمایش‌های پیشنهادی تکمیلی:</strong>
                <ul className="bullet-list">
                  {result.labmat.suggestedFollowUps.map((test, i) => <li key={i}>{asText(test)}</li>)}
                </ul>
              </div>
            )}
          </section>
        </>
      )}

      {/* specs/016: نمای تخصصی جای بدنهٔ نمای ساده (خلاصه تا داشبورد) می‌نشیند؛ بنر، «تفسیر بر پایهٔ …»،
             اعدادِ خوانده‌شده و سلبِ مسئولیت در هر دو نما یکی‌اند. */}
      {expert ? <ExpertView eng={eng} asText={asText} /> : (<>
      {/* نمایش خروجی‌های قدیمی اگر LabMat نبود (برای سازگاری عقب‌رو) */}
      {!result.labmat && result.summary && (
        <section className="card prose-block" id="summary">
          <h2 className="block-title">خلاصه</h2>
          <p className="text">{asText(result.summary)}</p>
        </section>
      )}
      {!result.labmat && result.interpretation && (
        <section className="card prose-block">
          <h2 className="block-title">تفسیر</h2>
          {asText(result.interpretation).split(/\n{2,}/).map((para, i) => (
            <p className="text" key={i}>{para}</p>
          ))}
        </section>
      )}
      
      {!result.labmat && <UnmatchedNote rows={unmatchedRows} />}

      {!result.labmat && asList(result.general_recommendations).length > 0 && (
        <section className="card prose-block" id="recs">
          <h2 className="block-title">توصیه‌ها</h2>
          <ul className="bullet-list">
            {asList(result.general_recommendations).map((r, i) => (
              <li key={i}>{asText(r)}</li>
            ))}
          </ul>
        </section>
      )}

      {/* ۱. کارنامه — فقط روی مسیرِ موتور. بدون _engine داده‌ای برای شمردن نیست
             و ادعای «قاعده‌های ثابت» هم آنجا درست نیست. */}
      {hasEngine && (
        <ResultDashboard
          result={result}
          tests={tests}
          groups={groups}
          ctx={ctx}
          urgency={urgency}
          asText={asText}
        />
      )}
      </>)}

      {/* ۲. تأیید اعداد */}
      {/* نمای تخصصی ردیف‌های خوانده‌شده را خودش (tests[]) دارد؛ فهرستِ «اعداد خوانده‌شده» فقط در نمای ساده می‌آید. */}
      {!expert && <ExtractedTests list={extracted} pages={result.pages} asText={asText} />}
      {hasEngine && <UnitConversions rows={eng?.unitConversions} asText={asText} asList={asList} />}

      {/* ۵. مقادیر محاسبه‌شده — P111: در نمای تخصصی، ExpertView همان بلوک را با روشِ محاسبه دارد؛
          رندرِ دوباره‌اش کلِ باکس را دو بار نشان می‌داد (بازبینیِ ۲۰۲۶-۱۰-۲۰). */}
      {!expert && <DerivedValues indices={eng?.indices} />}

      {/* ۶. منابع، منشأ، سلب مسئولیت */}
      {asList(result.sources).length > 0 && (
        <section className="card">
          <h2 className="block-title">برای مطالعهٔ بیشتر</h2>
          <p className="hint">
            این‌ها متنِ عمومیِ آموزشی از MedlinePlus (کتابخانهٔ ملی پزشکی آمریکا) هستند، نه منبعِ
            نتیجه‌گیریِ بالا:
          </p>
          <ul className="bullet-list">
            {asList(result.sources).map((u, i) => {
              const href = asText(u);
              return (
                <li key={i}>
                  <a href={href} target="_blank" rel="noopener noreferrer" className="link">
                    {href.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60)}
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* هشدارهای صفحه و OCR (موارد ناقص یا تفسیر نشده) */}
      {result.pages?.failed?.length > 0 && (
        <div className="warn" role="alert">
          ⚠️ صفحه {result.pages.failed.map(toFaDigits).join(" و ")} خوانده نشد. تفسیر فقط بر اساس{" "}
          {toFaDigits(result.pages.read)} صفحه از {toFaDigits(result.pages.total)} صفحه است.
        </div>
      )}
      {asList(result.ocr_warnings).length > 0 && (
        <div className="warn">
          {asList(result.ocr_warnings).map((w, i) => <div key={i}>• {asText(w)}</div>)}
        </div>
      )}

      <Provenance hasEngine={hasEngine} />

      {/* ⚠️ ثابت و سمتِ کلاینت — عمداً از خروجیِ مدل خوانده نمی‌شود.
          تنها جملهٔ حقوقیِ صفحه نباید چیزی باشد که مدل هر بار از نو می‌نویسد. */}
      <p className="disclaimer">
        این تفسیر خودکار است و جای معاینهٔ پزشک را نمی‌گیرد. برای تصمیم درمانی حتماً با پزشک
        مشورت کنید.
      </p>
    </div>
  );
}
