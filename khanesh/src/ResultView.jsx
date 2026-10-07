// ============================================================
// صفحهٔ نتیجه — بازنویسی‌شده حولِ حکمِ موتور، نه فقط نثرِ مدل.
//
// ترتیب عمدی است:
//   ۰. بنر فوریت — فقط وقتی فوریت هست. نبودِ بنر خودش حالتِ عادی است؛
//      هیچ‌وقت بنر سبزِ «همه‌چیز خوب است» رندر نمی‌شود.
//   ۱. داشبوردِ وضعیت (ResultDashboard.jsx، جای Scorecard) — شمارش، فوریت، کارتِ هر دستگاه بدن.
//      ⚠️ این بلوک در بازنویسیِ «وضعیت‌محور» جلو آمده و بالای «تأیید اعداد»
//         نشسته. دلیلِ ترتیبِ قبلی («آیا درست خواندیم؟» اولین سؤالِ واقعیِ
//         بیمار است) پاک نشده، منتقل شده: خودِ کارنامه وقتی مسیرْ عکس است
//         صریح می‌گوید این شمارش روی اعدادِ خوانده‌شده از عکس بنا شده و
//         مستقیم به همان بلوک لینک می‌دهد. اگر آن جمله را از Scorecard
//         بردارید، این جابه‌جایی دیگر قابل دفاع نیست.
//   ۲. تأیید اعداد.
//   ۳. خلاصه و تفسیر.
//   ۴. ردیف‌ها به تفکیک دستگاه بدن، با شمارش و نوارِ محدودهٔ مرجع.
//   ۵. مقادیرِ محاسبه‌شده — همیشه با تصریحِ اینکه روی برگه نیستند (N5).
//   ۶. منابع و سلبِ مسئولیت.
// ============================================================

import Num from "./Num.jsx";
import RangeBand from "./RangeBand.jsx";
import { parseRange } from "./rangeMath.js";
import ResultDashboard from "./ResultDashboard.jsx";
import ExtractedTests from "./ExtractedTests.jsx";
import { toFaDigits } from "./digits.js";
import {
  STATES, stateOf, countRows, buildVerdictContext, dirIcon, labelOf,
} from "./resultStates.js";
import { CATEGORIES, CATEGORY_ORDER, categoryOf } from "./testCategories.js";

/* ---------- چیپِ وضعیت ---------- */

function Chip({ t, state }) {
  return (
    <span className={`chip ${state.cls}`}>
      <span aria-hidden="true">{dirIcon(t, state)}</span>
      {labelOf(t, state)}
    </span>
  );
}

/* ---------- شدتِ CTCAE ----------
   عددِ خودِ موتور، نه ترجمهٔ ما. تا امروز serializeGraded این را می‌فرستاد و
   کلاینت دورش می‌ریخت؛ نتیجه‌اش این بود که شدت فقط با رنگ منتقل می‌شد و
   رنگ هم از فوریتِ کلِ پنل می‌آمد. حالا چهار پله، با واژه و شکل. */
function GradeMeter({ grade }) {
  if (typeof grade !== "number" || grade <= 0) return null;
  return (
    <span className="grade">
      <span className="grade-pips" aria-hidden="true">
        {[1, 2, 3, 4].map((g) => (
          <i key={g} className={g <= grade ? "gp on" : "gp"} />
        ))}
      </span>
      <span className="grade-text">
        شدت بر پایهٔ CTCAE v5: درجهٔ {toFaDigits(grade)} از ۴
      </span>
    </span>
  );
}

/* ---------- عددِ تصحیح‌شده ----------
   ⚠️ N5: مقدارِ کلسیم/سدیمی که موتور گرید می‌کند ممکن است تصحیح‌شده باشد و
   روی کاغذِ بیمار وجود نداشته باشد. بیمار که ۷.۳ را ببیند و روی برگه‌اش ۶.۲
   باشد نتیجه می‌گیرد برنامه اشتباه می‌کند. پس عددِ برگه همیشه کنارش می‌آید —
   نه فقط در بخشِ «مقادیر محاسبه‌شده»، بلکه در همان ردیف. */
const CORRECTED = {
  CA: { flag: "ca_correction_applied", measured: "ca_measured", why: "با آلبومینِ شما تصحیح شده" },
  NA: { flag: "na_correction_applied", measured: "na_measured", why: "با قندِ بالای شما تصحیح شده" },
};

function MeasuredNote({ t, indices }) {
  const c = CORRECTED[t.key];
  if (!c || !indices?.[c.flag] || indices[c.measured] == null) return null;
  return (
    <p className="row-measured">
      روی برگهٔ شما: <Num>{indices[c.measured]}</Num> — عددِ بالا {c.why}.
    </p>
  );
}

/* ---------- ردیفِ یک تست ---------- */

function TestRow({ t, state, indices }) {
  const r = parseRange(t.range);
  const value = Number(t.value);
  return (
    <li className={`row ${state.cls}`}>
      <div className="row-main">
        <span className="row-name">{t.name}</span>
        <Chip t={t} state={state} />
      </div>

      <div className="row-nums">
        <Num>{t.value}</Num>
        {t.range && (
          <span className="row-range">
            محدودهٔ مرجع: <Num>{t.range}</Num>
          </span>
        )}
      </div>

      <MeasuredNote t={t} indices={indices} />

      {r && Number.isFinite(value) && (
        <RangeBand low={r.low} high={r.high} value={value} stateCls={state.cls} />
      )}

      <GradeMeter grade={t.ctcaeGrade} />

      {/* منبعِ محدوده کنارِ خودِ ادعا — اعتمادِ سطر‌به‌سطر، نه نشانِ تبلیغاتی */}
      {t.refSource && <p className="row-src">منبع محدوده: {t.refSource}</p>}
    </li>
  );
}

/* ---------- بخشِ یک دستگاه بدن ---------- */

function CountLine({ rows }) {
  const { inRange, out, near } = countRows(rows);
  return (
    <span className="group-count">
      {out > 0 ? (
        <>
          {toFaDigits(inRange)} در محدوده ·{" "}
          <b>{toFaDigits(out)} خارج از محدوده</b>
        </>
      ) : near > 0 ? (
        <>{toFaDigits(inRange)} مورد در محدوده، {toFaDigits(near)} مورد نزدیک مرز</>
      ) : (
        <>{toFaDigits(inRange)} مورد، همه در محدوده</>
      )}
    </span>
  );
}

function SystemSection({ catKey, rows, ctx, indices }) {
  const cat = CATEGORIES[catKey] ?? CATEGORIES.other;
  const hasOut = rows.some((t) => t.abnormal);

  const head = (
    <>
      <span className="group-title">
        <span aria-hidden="true">{cat.icon}</span> {cat.label}
      </span>
      <CountLine rows={rows} />
    </>
  );

  const body = (
    <ul className="row-list">
      {rows.map((t) => (
        <TestRow key={t.key} t={t} state={stateOf(t, ctx)} indices={indices} />
      ))}
    </ul>
  );

  // ⚠️ هر گروهی که حتی یک موردِ خارج از محدوده دارد باز و غیرقابل‌جمع‌شدن است.
  //    محتوای فوری هرگز پشتِ <details>، آکاردئون یا تب نمی‌رود. فقط گروهی که
  //    تمامش داخل محدوده است جمع می‌شود — و شمارشش روی خودِ سرتیتر دیده می‌شود.
  if (hasOut) {
    return (
      <section className="group" id={`sys-${catKey}`} tabIndex={-1}>
        <h3 className="group-head">{head}</h3>
        {body}
      </section>
    );
  }
  return (
    <details className="group group--collapsible" id={`sys-${catKey}`} tabIndex={-1}>
      <summary className="group-head">{head}</summary>
      {body}
    </details>
  );
}

/* ---------- بلوکِ حالت سوم ---------- */

function UnmatchedNote({ rows }) {
  if (!rows.length) return null;
  return (
    <section className="card unmatched-box">
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
  egfr: "تخمین عملکرد کلیه (eGFR)",
  ca_corrected: "کلسیم تصحیح‌شده",
  na_corrected: "سدیم تصحیح‌شده",
  anion_gap: "شکاف آنیونی",
  anion_gap_corr: "شکاف آنیونی تصحیح‌شده",
  non_hdl: "کلسترول non-HDL",
  bun_cr: "نسبت اوره به کراتینین",
  mentzer: "شاخص منتزر",
  nlr: "نسبت نوتروفیل به لنفوسیت",
  r_ratio: "نسبت R (الگوی کبدی)",
};

// جفتِ «اندازه‌گیری‌شده ← محاسبه‌شده»: عددِ تصحیح‌شده هرگز بدونِ عددِ
// روی برگه نمایش داده نمی‌شود (N5).
const MEASURED_OF = { ca_corrected: "ca_measured", na_corrected: "na_measured" };

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
                  روی برگهٔ شما: <Num>{measured}</Num>
                </span>
              )}
              <span className="derived-child">
                <span>{INDEX_LABELS[k]}</span>
                <Num>{indices[k]}</Num>
                <span className="mini-chip st-unmatched">محاسبه‌شده</span>
              </span>
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
                {r.basis && r.basis !== "printed" ? (
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
              <span className="hint">{BASIS_TEXT[r.basis] ?? BASIS_TEXT.printed}</span>
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
            دقیق‌تر، عکس برگه را آپلود کنید یا مقادیر را در فرم وارد کنید.
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

export default function ResultView({ result, asText, asList }) {
  const eng = result._engine;
  const hasEngine = !!eng;
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
        <div className={todayBanner ? "crit-banner crit-banner--today" : "crit-banner"} role="alert">
          <p className="crit-title">{todayBanner ? asText(todayBanner.title) : "این نتیجه باید همین امروز دیده شود"}</p>
          <p className="crit-body">
            {todayBanner ? asText(todayBanner.body) : (
              "اگر تپش قلب، ضعف شدید، گیجی یا تنگی نفس دارید، منتظر صبح نمانید — به نزدیک‌ترین " +
              "اورژانس بروید یا با ۱۱۵ تماس بگیرید. اگر حالتان خوب است، لازم نیست الان کسی را بیدار " +
              "کنید؛ برای اولین ساعت کاری فردا با پزشک تماس بگیرید و همین برگه را همراه ببرید."
            )}
          </p>
        </div>
      )}

      {/* specs/011 (FR-016): آنچه موتور واقعاً به کار برد — فقط از _engine.context، هرگز از پروفایلِ کلاینت.
             بیماریِ تیک‌خورده‌ای که قاعده ندارد اینجا نمی‌آید (FR-019). سرورِ قدیمی context ندارد ⇒ چیزی رندر نمی‌شود. */}
      <ContextLine ctx={eng?.context} asText={asText} />

      {/* ۱. کارنامه — فقط روی مسیرِ موتور. بدون _engine داده‌ای برای شمردن نیست
             و ادعای «قاعده‌های ثابت» هم آنجا درست نیست. */}
      {hasEngine && (
        <ResultDashboard
          result={result}
          tests={tests}
          groups={groups}
          ctx={ctx}
          urgency={urgency}
          hasNumbers={extracted.length > 0}
          asText={asText}
          asList={asList}
        />
      )}

      {/* هشدارهای صفحه و OCR */}
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

      {/* ۲. تأیید اعداد */}
      <ExtractedTests list={extracted} pages={result.pages} asText={asText} />
      {hasEngine && <UnitConversions rows={eng?.unitConversions} asText={asText} asList={asList} />}

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
          
          <section className="card">
            <h2 className="block-title">تفسیر برای شما (زبان ساده)</h2>
            <p className="text">{asText(result.labmat.patientSection)}</p>
          </section>

          <section className="card" style={{borderLeft: "4px solid var(--primary-color)"}}>
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

      {/* نمایش خروجی‌های قدیمی اگر LabMat نبود (برای سازگاری عقب‌رو) */}
      {!result.labmat && result.summary && (
        <section className="card" id="summary">
          <h2 className="block-title">خلاصه</h2>
          <p className="text">{asText(result.summary)}</p>
        </section>
      )}
      {!result.labmat && result.interpretation && (
        <section className="card">
          <h2 className="block-title">تفسیر</h2>
          <p className="text">{asText(result.interpretation)}</p>
        </section>
      )}
      
      {!result.labmat && <UnmatchedNote rows={unmatchedRows} />}

      {!result.labmat && asList(result.general_recommendations).length > 0 && (
        <section className="card" id="recs">
          <h2 className="block-title">توصیه‌ها</h2>
          <ul className="bullet-list">
            {asList(result.general_recommendations).map((r, i) => (
              <li key={i}>{asText(r)}</li>
            ))}
          </ul>
        </section>
      )}

      {/* ۴. ردیف‌ها به تفکیک دستگاه بدن */}
      {groups.length > 0 && (
        <section className="card">
          <h2 className="block-title">همهٔ آزمایش‌ها</h2>
          <p className="hint">
            حالتِ هر ردیف از حکمِ خودِ موتور برای همان آزمایش می‌آید، نه از فوریتِ کلِ برگه.
            {urgency === "emergency" && (
              // ⚠️ لازم است: حالا که «امروز» دیگر روی همهٔ ردیف‌ها مهر نمی‌خورد،
              //    بیمار نباید از رنگِ کهرباییِ یک ردیف نتیجه بگیرد که فوریتِ
              //    بالای صفحه منتفی است. هیچ ردیفی «بی‌خطر» برچسب نمی‌خورد.
              <> {" "}فوریتِ بالای صفحه برای کلِ برگه است و با واژهٔ هیچ ردیفی لغو نمی‌شود.</>
            )}
          </p>
          <div className="legend" aria-hidden="true">
            {[STATES.normal, STATES.near, STATES.out, STATES.unmatched, STATES.emergency].map((s) => (
              <span key={s.key} className={`mini-chip ${s.cls}`}>
                <span>{s.icon}</span> {s.label}
              </span>
            ))}
          </div>
          {groups.map((g) => (
            <SystemSection
              key={g.key}
              catKey={g.key}
              rows={g.rows}
              ctx={ctx}
              indices={eng?.indices}
            />
          ))}
        </section>
      )}

      {/* ۵. مقادیر محاسبه‌شده */}
      <DerivedValues indices={eng?.indices} />

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
