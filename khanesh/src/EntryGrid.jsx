import { normalizeDigits, toNumber, toFaDigits } from "./digits.js";
import { REF, ALL, CATS, statusOf, LOCAL_STATES } from "./labRefs.js";

// ============================================================
// شبکهٔ ورودِ دستی — ۴۶ آزمایش، دسته‌بندی‌شده یا قابل جست‌وجو.
//
// دو چیز که در بازنویسی درست شد:
//   ۱. هر ورودی حالا <label htmlFor> واقعی دارد. قبلاً هر ۴۶ ورودی برای
//      اسکرین‌ریدر «text box» بی‌نام بودند، چون label فقط خواهرِ کنارِ input
//      بود نه متصل به آن.
//   ۲. وضعیتِ هر خانه دیگر یک ایموجیِ تنها نیست (🟢/🔴 بدون هیچ متنی و بدون
//      aria-hidden). حالا واژه + شکل + رنگ است، مثل بقیهٔ برنامه.
//
// ⚠️ مقدارها type="text" + inputMode="decimal" می‌مانند و هر تغییر از
//    normalizeDigits رد می‌شود. با type="number" رقمِ فارسی در سطحِ DOM
//    نابود می‌شود و مقدار بی‌صدا می‌افتد بیرون.
// ============================================================

export default function EntryGrid({
  vals, setVal, prevVals, setPrevVal, sex, months, pregnant = false, compareMode,
  search, setSearch, activeCat, setActiveCat, errs, onPreview, previewOpen,
}) {
  const q = search.trim();
  const catKeys = q
    ? ALL.filter((k) => REF[k].label.includes(q) || k.includes(q.toLowerCase()))
    : ALL.filter((k) => REF[k].cat === activeCat);

  return (
    <section className="card" aria-labelledby="entry-h">
      <h2 className="card-title" id="entry-h">مقادیر آزمایش را وارد کنید</h2>

      <label className="sr-only" htmlFor="test-search">جست‌وجوی نام آزمایش</label>
      <input
        id="test-search"
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="جست‌وجوی تست (مثلاً قند، TSH، هموگلوبین)…"
        className="input search-box"
      />

      {!q && (
        <div className="chip-row cat-bar" role="group" aria-label="دسته‌بندی آزمایش‌ها">
          {Object.keys(CATS).map((c) => {
            const n = ALL.filter((k) => REF[k].cat === c && vals[k] && vals[k] !== "").length;
            const on = activeCat === c;
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                onClick={() => setActiveCat(c)}
                className={`chip-btn${on ? " is-on" : ""}`}
              >
                <span aria-hidden="true">{CATS[c].icon}</span> {CATS[c].label}
                {n > 0 && (
                  <span className="chip-n">
                    <span className="sr-only">— </span>{toFaDigits(n)}
                    <span className="sr-only"> مقدار وارد شده</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {catKeys.length === 0 && (
        <p className="hint">آزمایشی با این نام پیدا نشد. املای دیگری را امتحان کنید.</p>
      )}

      <div className="fields-grid">
        {catKeys.map((k) => {
          const m = REF[k];
          const raw = vals[k] ?? "";
          const rawPrev = prevVals[k] ?? "";
          const v = toNumber(raw);
          const [mn, mx] = m.hard;
          const bad = raw !== "" && (isNaN(v) || v < mn || v > mx);
          const st = raw !== "" && !isNaN(v) && !bad ? statusOf(k, v, sex, months, { pregnant }) : null;
          const r = m.range(sex, months, { pregnant });
          const S = st ? LOCAL_STATES[st] : null;
          return (
            <div key={k} className={`cell${bad ? " is-bad" : ""}`}>
              <label className="cell-label" htmlFor={`v-${k}`}>
                {m.label} {m.unit && <span className="unit">{m.unit}</span>}
              </label>

              {compareMode && (
                <div className="cell-input">
                  <label className="tag tag--prev" htmlFor={`p-${k}`}>قبلی</label>
                  <input
                    id={`p-${k}`}
                    type="text"
                    inputMode="decimal"
                    value={rawPrev}
                    onChange={(e) => setPrevVal(k, normalizeDigits(e.target.value))}
                    placeholder="—"
                    className="input input--num input--prev"
                  />
                </div>
              )}

              <div className="cell-input">
                {compareMode && <label className="tag tag--curr" htmlFor={`v-${k}`}>فعلی</label>}
                <input
                  id={`v-${k}`}
                  type="text"
                  inputMode="decimal"
                  value={raw}
                  onChange={(e) => setVal(k, normalizeDigits(e.target.value))}
                  placeholder="—"
                  aria-describedby={`ref-${k}`}
                  aria-invalid={bad || undefined}
                  className={`input input--num${S ? ` ${S.cls}` : ""}`}
                />
              </div>

              <span className="ref-hint" id={`ref-${k}`}>
                محدودهٔ مرجع: <span className="num">{r.low}–{r.high}</span>
              </span>

              {S && (
                <span className={`mini-chip ${S.cls}`}>
                  <span aria-hidden="true">{S.icon}</span> {S.label}
                </span>
              )}

              {bad && (
                <span className="cell-err">
                  <span aria-hidden="true">⚠</span> این عدد بیرون از بازهٔ ممکن
                  (<span className="num">{mn}–{mx}</span>) است و به تحلیل فرستاده نمی‌شود.
                </span>
              )}
            </div>
          );
        })}
      </div>

      <button type="button" onClick={onPreview} className="btn btn--secondary btn--block">
        {previewOpen ? "بستنِ بررسی سریع" : "بررسی سریع همین مقادیر"}
      </button>

      {errs.length > 0 && (
        <div className="warn" aria-live="polite">
          <p className="warn-title">
            <span aria-hidden="true">⚠️</span> این مقادیر به تحلیل فرستاده نمی‌شوند:
          </p>
          <ul className="bullet-list">
            {errs.map((e) => (
              <li key={e.key}>
                {e.unreadable ? (
                  <>{e.label}: مقدارِ <span className="num">{e.value}</span> به‌صورتِ عدد خوانده نشد.</>
                ) : (
                  <>
                    {e.label}: مقدار <span className="num">{e.value}</span> بیرون از بازهٔ ممکن
                    (<span className="num">{e.min}–{e.max}</span>) است.
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
