import RangeBand from "./RangeBand.jsx";
import Num from "./Num.jsx";
import { toFaDigits } from "./digits.js";
import { REF, LOCAL_STATES, comboInsights, deltaOf, DELTA_LABEL } from "./labRefs.js";

// ============================================================
// پیش‌نمایشِ محلیِ ورودِ دستی.
//
// ⚠️ این «نتیجه» نیست و عمداً هم شبیهِ نتیجه نیست. یک مقایسهٔ سادهٔ عدد با
//    محدودهٔ مرجعِ همین صفحه است که بدونِ اینترنت و بدونِ موتور کار می‌کند.
//
// ⚠️ و **هم‌زمان با نتیجهٔ موتور رندر نمی‌شود** (شرطش در Tafsir.jsx است).
//    قبلاً هر دو با هم روی صفحه بودند و می‌توانستند دربارهٔ یک عدد اختلاف
//    داشته باشند — TSH فرانت ۵.۰ در برابر ۴.۵ بک‌اند — یعنی بیمار از
//    «طبیعی» اسکرول می‌کرد به «بالا»، برای یک عدد. (N11 / REF_DIFF.md)
//
// ⚠️ هشدارِ بحرانیِ اینجا از آستانه‌های سمتِ کلاینت می‌آید که از موتور
//    قدیمی‌ترند. نگه داشته شده چون برداشتنش یعنی بیمار K=۷ را تایپ کند و
//    تا وقتی دکمهٔ تفسیر را نزده هیچ هشداری نبیند. ولی جای خودش می‌ماند:
//    نه وارد کارنامه می‌شود، نه با نتیجهٔ موتور ادغام.
// ============================================================

function DeltaChip({ prev, curr }) {
  const d = deltaOf(prev, curr);
  if (!d) return null;
  const L = DELTA_LABEL[d.dir];
  return (
    <span className="delta-chip">
      <span aria-hidden="true">{L.icon}</span> {L.label}
      {d.dir !== "same" && (
        <>
          {" "}(<Num>{d.from}</Num> ← <Num>{d.to}</Num>)
        </>
      )}
    </span>
  );
}

export default function LocalPreview({
  rows, vals, prevVals, sex, months, pregnant = false, compareMode, criticalCount,
  expanded, setExpanded, onExport, onImport, ioError, onClose,
}) {
  const insights = comboInsights((k) => vals[k], sex, months, { pregnant });

  return (
    <section className="card" aria-labelledby="preview-h">
      <div className="card-head">
        <h2 className="card-title" id="preview-h">بررسی سریع روی همین دستگاه</h2>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
          بستن
        </button>
      </div>

      <p className="hint">
        این فقط مقایسهٔ عددهای شما با محدودهٔ مرجعِ همین صفحه است؛ روی دستگاه خودتان انجام
        می‌شود و جایی فرستاده نمی‌شود. تفسیرِ بالینی از موتور قواعد می‌آید — برای آن، پایین‌تر
        دکمهٔ «تفسیر آزمایش» را بزنید.
      </p>

      {criticalCount > 0 && (
        <div className="crit-banner" role="alert">
          <p className="crit-title">
            {toFaDigits(criticalCount)} مورد در محدودهٔ بحرانیِ این جدول است
          </p>
          <p className="crit-body">
            منتظرِ تفسیرِ کامل نمانید: همین برگه را بردارید و امروز با پزشک یا اورژانس تماس
            بگیرید. اگر تپش قلب، ضعف شدید، گیجی یا تنگی نفس دارید، با ۱۱۵ تماس بگیرید.
          </p>
        </div>
      )}

      {insights.length > 0 && (
        <div className="note note--soft">
          <p className="note-title">نکته‌های اولیه</p>
          <ul className="bullet-list">
            {insights.map((ins, i) => <li key={i}>{ins}</li>)}
          </ul>
          <p className="hint">
            این‌ها قاعده‌های سادهٔ همین صفحه‌اند، نه خروجیِ موتور قواعد.
          </p>
        </div>
      )}

      <div className="io-row">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onExport}>
          خروجی JSON
        </button>
        <label className="btn btn--ghost btn--sm btn--file">
          واردات JSON
          <input type="file" accept=".json" className="sr-only" onChange={onImport} />
        </label>
      </div>
      {ioError && <div className="warn" role="alert">{ioError}</div>}

      <ul className="row-list">
        {rows.map((row) => {
          const m = REF[row.k];
          const r = m.range(sex, months, { pregnant });
          const S = LOCAL_STATES[row.status];
          // ⚠️ باگِ واقعی که در بازطراحی پیدا شد (در نسخهٔ قبلی هم بود):
          //    متنِ توضیح از روی `status` انتخاب می‌شد و «crit» با «above»
          //    یک‌کاسه شده بود. یعنی پلاکتِ ۴۰ — که بحرانیِ **پایین** است —
          //    توضیحِ «بالا می‌تواند واکنشی باشد» می‌گرفت. برای بیماری که
          //    خطرِ خونریزی دارد، دقیقاً متنِ اشتباه.
          //    جهت باید از مقایسهٔ خودِ مقدار با محدوده بیاید، نه از نامِ حالت.
          const dir = row.status === "na" ? null : row.v > r.high ? "high" : row.v < r.low ? "low" : null;
          const note = dir === "high" ? (m.high || m.about)
            : dir === "low" ? (m.low || m.about) : m.about;
          const isOpen = !!expanded[row.k];
          return (
            <li key={row.k} className={`row ${S.cls}`}>
              <div className="row-main">
                <span className="row-name">{m.label}</span>
                <span className={`chip ${S.cls}`}>
                  <span aria-hidden="true">{S.icon}</span> {S.label}
                </span>
              </div>

              <div className="row-nums">
                <span>
                  <Num>{row.v}</Num> {m.unit && <span className="unit">{m.unit}</span>}
                </span>
                <span className="row-range">
                  {row.status === "na"
                    ? "محدودهٔ مرجعِ کودک در این پیش‌نمایش نیست؛ تفسیر را با دکمهٔ «تفسیر آزمایش» بگیرید."
                    : <>محدودهٔ مرجع: <Num>{r.low}–{r.high}</Num></>}
                </span>
                {compareMode && <DeltaChip prev={prevVals[row.k]} curr={vals[row.k]} />}
              </div>

              {row.status !== "na" && <RangeBand low={r.low} high={r.high} value={row.v} stateCls={S.cls} />}

              <div className="note-row">
                <p className="row-note">{note}</p>
                {m.about && note !== m.about && (
                  <button
                    type="button"
                    className="btn btn--link"
                    aria-expanded={isOpen}
                    onClick={() => setExpanded((e) => ({ ...e, [row.k]: !e[row.k] }))}
                  >
                    {isOpen ? "بستن" : "این تست چیست؟"}
                  </button>
                )}
              </div>
              {isOpen && <p className="about-box">{m.about}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
