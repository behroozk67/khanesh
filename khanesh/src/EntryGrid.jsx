import { normalizeDigits, toNumber, toFaDigits } from "./digits.js";
import { useState, useEffect } from "react";
import { REF, ALL, CATS, statusOf, LOCAL_STATES, SECTIONS, sectionOfCat, URINE_FIELDS, URINE_OPTIONS } from "./labRefs.js";

// ============================================================
// شبکهٔ ورودِ دستی — ۴۶ آزمایش + ادرار، در بخش‌های تاشو (specs/011، FR-013) یا قابل جست‌وجو.
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
  search, setSearch, activeCat, errs, onPreview, previewOpen,
  urine = {}, setUrine,
}) {
  const q = search.trim();
  const found = q ? ALL.filter((k) => REF[k].label.includes(q) || k.includes(q.toLowerCase())) : [];
  // بخشِ باز از دستهٔ فعال می‌آید (پیوندِ «?test=hb» از راهنما همان بخش را باز می‌کند).
  const [open, setOpen] = useState(() => new Set([sectionOfCat(activeCat)]));
  useEffect(() => { setOpen((o) => new Set(o).add(sectionOfCat(activeCat))); }, [activeCat]);
  const toggle = (id) => setOpen((o) => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const filled = (sec) => sec.id === "urine"
    ? URINE_FIELDS.filter((f) => urine[f.k]).length
    : ALL.filter((k) => sec.cats.includes(REF[k].cat) && vals[k] && vals[k] !== "").length;

  const cell = (k) => {
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
  };

  // ادرار کیفی است: انتخاب از فهرست («منفی، +۱…») یا بازهٔ میکروسکوپی («2-3»). بی‌ارزیابیِ محلی —
  // تفسیرش فقط کارِ موتور است (پیش‌نمایشِ محلی هیچ تورِ ایمنی ندارد، N12).
  const urineCell = (f) => (
    <div key={f.k} className="cell">
      <label className="cell-label" htmlFor={`v-${f.k}`}>
        {f.label} {f.unit && <span className="unit">{f.unit}</span>}
      </label>
      <div className="cell-input">
        {f.type === "dip" || f.type === "posneg" ? (
          <select id={`v-${f.k}`} className="urine-select" value={urine[f.k] ?? ""} onChange={(e) => setUrine(f.k, e.target.value)}>
            <option value="">—</option>
            {URINE_OPTIONS[f.type].map((o) => <option key={o.v} value={o.v}>{o.fa}</option>)}
          </select>
        ) : (
          <input
            id={`v-${f.k}`}
            type="text"
            inputMode="decimal"
            value={urine[f.k] ?? ""}
            onChange={(e) => setUrine(f.k, normalizeDigits(e.target.value))}
            placeholder="—"
            className="input input--num"
          />
        )}
      </div>
      {f.hint && <span className="ref-hint">{f.hint}</span>}
    </div>
  );

  return (
    <section className="card" aria-labelledby="entry-h">
      <h2 className="card-title" id="entry-h">مقادیر آزمایش را وارد کنید</h2>
      <p className="hint">فقط همان‌هایی را که روی برگه دارید پر کنید؛ خانهٔ خالی فرستاده نمی‌شود.</p>

      <label className="sr-only" htmlFor="test-search">جست‌وجوی نام آزمایش</label>
      <input
        id="test-search"
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="جست‌وجوی تست (مثلاً قند، TSH، هموگلوبین)…"
        className="input search-box"
      />

      {q ? (
        <>
          {found.length === 0 && <p className="hint">آزمایشی با این نام پیدا نشد. املای دیگری را امتحان کنید.</p>}
          <div className="fields-grid">{found.map(cell)}</div>
        </>
      ) : (
        SECTIONS.map((sec) => {
          const n = filled(sec);
          const isOpen = open.has(sec.id);
          return (
            <div key={sec.id} className="sec">
              <button
                type="button"
                className="sec-h"
                aria-expanded={isOpen}
                aria-controls={`sec-${sec.id}`}
                onClick={() => toggle(sec.id)}
              >
                <span>{sec.label}</span>
                <span className="sec-h-side">
                  {n > 0 && (
                    <span className="sec-n">
                      {toFaDigits(n)}<span className="sr-only"> مقدار وارد شده</span>
                    </span>
                  )}
                  <span className="sec-caret" aria-hidden="true">⌄</span>
                </span>
              </button>
              {isOpen && (
                <div className="sec-body" id={`sec-${sec.id}`}>
                  {sec.id === "urine" ? (
                    <div className="fields-grid">{URINE_FIELDS.map(urineCell)}</div>
                  ) : (
                    sec.cats.map((c) => (
                      <div key={c}>
                        {sec.cats.length > 1 && <p className="sec-sub">{CATS[c].label}</p>}
                        <div className="fields-grid">{ALL.filter((k) => REF[k].cat === c).map(cell)}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

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
