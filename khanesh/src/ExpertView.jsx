// ============================================================
// نمای تخصصی (specs/016) — برای کادرِ درمان، پشتِ سوییچِ «ساده / تخصصی» در ResultView.
//
// ⚠️ این فایل هیچ حکمِ بالینی نمی‌سازد و هیچ فرمولی ندارد. فقط `_engine.expert` را نشان می‌دهد که
//    سرور از خروجیِ موتور ساخته (khanesh-server/rules/expert.js، قرارداد: specs/016-expert-view/contracts/).
//    متنِ «گزارش تخصصی برای پزشک»ِ مسیرِ گراف را (نوشتهٔ مدل) هرگز نمی‌خواند.
// ⚠️ کلیدِ خامِ موتور هرگز چاپ نمی‌شود — سرور `name` و `label` می‌فرستد (N8).
// ⚠️ سرورِ قدیمی `expert` ندارد: از `tests`/`indices` همان‌قدر که هست نشان می‌دهیم و صریح می‌گوییم چه نیست (FR-015).
// ============================================================

import { toFaDigits } from "./digits.js";
import "./ExpertView.css";

const list = (v) => (Array.isArray(v) ? v : []);
const obj = (v) => (v && typeof v === "object" ? v : null);
const num = (v) => (v == null || v === "" ? "—" : toFaDigits(String(v)));
const withUnit = (x, asText) => (obj(x) ? `${num(x.value)}${x.unit ? ` ${asText(x.unit)}` : ""}` : "—");

const URGENCY_TONE = { emergency: "bad", soon: "bad", this_week: "warn", routine: "info" };
const DERIVED_FA = {
  unit_conversion: "تبدیلِ واحد",
  albumin_correction: "اصلاح با آلبومین",
  glucose_correction: "اصلاح برای قند",
  percent_of_wbc: "از درصد × گلبولِ سفید",
  unit_conversion_and_albumin_correction: "تبدیلِ واحد و اصلاح با آلبومین",
  unit_conversion_and_glucose_correction: "تبدیلِ واحد و اصلاح برای قند",
};

function Rows({ rows, asText, caption }) {
  const r = list(rows).filter((t) => obj(t) && typeof t.name === "string" && t.name.trim());
  if (!r.length) return null;
  return (
    <div className="xv-table-wrap">
      <table className="xv-table">
        {caption && <caption>{caption}</caption>}
        <thead>
          <tr>
            <th scope="col">آزمایش</th>
            <th scope="col">روی برگه</th>
            <th scope="col">سنجیده‌شده</th>
            <th scope="col">بازهٔ موتور</th>
            <th scope="col">بازهٔ برگه</th>
            <th scope="col">حکم</th>
          </tr>
        </thead>
        <tbody>
          {r.map((t, i) => (
            <tr key={i}>
              <th scope="row" data-label="آزمایش">{asText(t.name)}</th>
              <td data-label="روی برگه">
                {t.printed ? withUnit(t.printed, asText) : "—"}
                {t.printed && !t.printed.unit && t.unit_assumed && (
                  <span className="xv-note"> (واحد چاپ نشده؛ {asText(t.unit_assumed)} برداشت شد)</span>
                )}
              </td>
              <td data-label="سنجیده‌شده">
                {withUnit(t.graded, asText)}
                {t.derived_from && DERIVED_FA[t.derived_from] && <span className="xv-note"> ({DERIVED_FA[t.derived_from]})</span>}
              </td>
              <td data-label="بازهٔ موتور">
                {t.engine_range ? toFaDigits(asText(t.engine_range)) : "—"}
              </td>
              <td data-label="بازهٔ برگه">{t.printed_range ? toFaDigits(asText(t.printed_range)) : "—"}</td>
              <td data-label="حکم">
                {t.status_fa ? asText(t.status_fa) : "—"}
                {t.ctcae_grade != null && <span className="xv-note"> · CTCAE درجهٔ {num(t.ctcae_grade)}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Sources({ f, asText }) {
  const s = list(f.sources).filter(obj);
  if (!s.length) return <p className="xv-muted">منبعِ منتشرشده‌ای به این قاعده پیوست نیست.</p>;
  return (
    <ul className="xv-sources">
      {s.map((g, i) => (
        <li key={i}>
          {g.url ? (
            <a href={asText(g.url)} target="_blank" rel="noopener noreferrer" className="link">
              {asText(g.fa || g.title || g.org)}
            </a>
          ) : (
            asText(g.fa || g.title || g.org)
          )}
          {g.year && <span className="xv-note"> ({num(g.year)})</span>}
          {g.substituted && <span className="xv-note"> — به‌جای منبعِ پولی: {asText(g.substituted)}</span>}
        </li>
      ))}
    </ul>
  );
}

function Pro({ pro, asText }) {
  const p = obj(pro);
  if (!p) return null;
  const sections = [
    ["احتیاط‌ها", p.cautions],
    ["تشخیص‌های افتراقی", p.differential],
    ["بررسی‌های بعدی", p.workup],
  ].filter(([, v]) => list(v).length);
  if (!sections.length) return null;
  return (
    <div className="xv-pro">
      <p className="xv-pro-tag">متنِ تخصصی — در انتظارِ بازبینیِ بالینی</p>
      {sections.map(([title, items]) => (
        <div key={title}>
          <h4 className="xv-h4">{title}</h4>
          <ul className="bullet-list">{list(items).map((s, i) => <li key={i}>{asText(s)}</li>)}</ul>
        </div>
      ))}
      {list(p.sources).length > 0 && (
        <>
          <h4 className="xv-h4">منبعِ این متن</h4>
          <Sources f={p} asText={asText} />
        </>
      )}
    </div>
  );
}

function Finding({ f, asText, open }) {
  const tone = URGENCY_TONE[f.urgency] ?? "info";
  return (
    <details className="xv-finding card" open={open}>
      <summary>
        <span className="xv-label">{asText(f.label)}</span>
        {f.urgency_fa && <span className={`xv-chip xv-chip--${tone}`}>{asText(f.urgency_fa)}</span>}
        {f.supplementary && <span className="xv-chip">یافتهٔ تکمیلی</span>}
        {f.briefed && <span className="xv-chip">کوتاه‌شده زیرِ اورژانس</span>}
      </summary>
      <Rows rows={f.triggers} asText={asText} caption="آزمایش‌های مرتبطِ خارج از محدوده" />
      <Rows rows={f.context} asText={asText} caption="آزمایش‌های مرتبطِ داخلِ محدوده" />
      {list(f.warnings).length > 0 && (
        <>
          <h4 className="xv-h4">هشدارها</h4>
          <ul className="bullet-list">{list(f.warnings).map((w, i) => <li key={i}>{asText(w)}</li>)}</ul>
        </>
      )}
      {list(f.suggest).length > 0 && (
        <>
          <h4 className="xv-h4">آزمایش‌های پیشنهادی</h4>
          <ul className="bullet-list">{list(f.suggest).map((s, i) => <li key={i}>{asText(s)}</li>)}</ul>
        </>
      )}
      <Pro pro={f.pro} asText={asText} />
      <h4 className="xv-h4">منبع</h4>
      <Sources f={f} asText={asText} />
    </details>
  );
}

export default function ExpertView({ eng, asText }) {
  const x = obj(eng?.expert);

  // سرورِ قدیمی: هرچه هست، و صریح که چه نیست (FR-015).
  if (!x || x.version !== 1) {
    const tests = list(eng?.tests).filter((t) => obj(t) && typeof t.name === "string" && t.name.trim());
    return (
      <div className="xv">
        <p className="warn">جزئیاتِ یافته‌ها برای این نتیجه در دسترس نیست (نسخهٔ قدیمیِ سرور).</p>
        <Rows
          asText={asText}
          caption="آزمایش‌ها"
          rows={tests.map((t) => ({ name: t.name, printed: null, graded: { value: t.value, unit: null }, engine_range: t.range, status_fa: t.fa, ctcae_grade: t.ctcaeGrade }))}
        />
      </div>
    );
  }

  const allFindings = list(x.findings).filter(obj);
  // P110: یافتهٔ بی‌اقدام (minor) کارتِ جدا نمی‌گیرد؛ یک گروهِ جمع‌شده با متنِ یک‌خطیِ موتور (note).
  const findings = allFindings.filter((f) => f.minor !== true);
  const minor = allFindings.filter((f) => f.minor === true);
  const hidden = list(x.hidden).filter(obj);
  const indices = list(x.indices).filter(obj);

  return (
    <div className="xv">
      <p className="xv-muted">
        نمای تخصصی برای کادرِ درمان: همان حکمِ موتور، با عددها، بازه‌ها و منبعِ هر یافته. فوریت با نمای ساده یکی است.
      </p>

      {list(x.recommendations).length > 0 && (
        <section className="card xv-block">
          <h3 className="block-title">دستور و توصیه‌های موتور</h3>
          <p className="xv-muted">همان فهرستِ نمای ساده، با یک دستورِ نهایی.</p>
          <ul className="bullet-list">{list(x.recommendations).map((r, i) => <li key={i}>{asText(r)}</li>)}</ul>
        </section>
      )}

      {list(x.suggested).length > 0 && (
        <section className="card xv-block">
          <h3 className="block-title">آزمایش‌های پیشنهادیِ این برگه</h3>
          <ul className="bullet-list">{list(x.suggested).map((s, i) => <li key={i}>{asText(s)}</li>)}</ul>
        </section>
      )}

      <section className="xv-block">
        <h3 className="block-title">یافته‌ها</h3>
        {allFindings.length === 0 ? (
          <p className="xv-muted">موتور برای این برگه یافته‌ای نساخت.</p>
        ) : (
          findings.map((f, i) => <Finding key={i} f={f} asText={asText} open={i === 0} />)
        )}
        {minor.length > 0 && (
          <details className="card xv-block">
            <summary className="block-title">موارد بی‌اقدام ({num(minor.length)})</summary>
            <p className="xv-muted">قاعده‌شان خودش گفته اقدامِ جداگانه‌ای لازم ندارند؛ عددشان در جدولِ آزمایش‌ها هم هست.</p>
            <ul className="bullet-list">
              {minor.map((f, i) => (
                <li key={i}>{asText(f.note || f.label)}</li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {hidden.length > 0 && (
        <details className="card xv-block">
          <summary className="block-title">یافته‌های پنهان در نمای ساده ({num(hidden.length)})</summary>
          <p className="xv-muted">زیرِ یافتهٔ فوری‌تر پنهان شدند؛ دستور و هشدارشان عمداً نیامده.</p>
          {hidden.map((f, i) => (
            <div key={i} className="xv-hidden">
              <p className="xv-label">{asText(f.label)} {f.urgency_fa && <span className="xv-chip">{asText(f.urgency_fa)}</span>}</p>
              <Rows rows={f.triggers} asText={asText} />
              <Sources f={f} asText={asText} />
            </div>
          ))}
        </details>
      )}

      <section className="card xv-block">
        <h3 className="block-title">همهٔ آزمایش‌های برگه</h3>
        <Rows rows={x.tests} asText={asText} />
      </section>

      {indices.length > 0 && (
        <section className="card xv-block">
          <h3 className="block-title">مقادیرِ محاسبه‌شده (روی برگه نیستند)</h3>
          <ul className="xv-indices">
            {indices.map((ix, i) => (
              <li key={i}>
                <strong>{asText(ix.label)}</strong>: {num(ix.value)} {ix.unit ? asText(ix.unit) : ""}
                <p className="xv-note">{asText(ix.method_fa)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

    </div>
  );
}
