// ============================================================
// داشبوردِ نتیجه — لایهٔ «یک نگاه»، به جای کارنامهٔ قبلی (Scorecard).
//
// ⚠️ مرزِ موتور: هر چیزی که این‌جا رنگ یا برچسب می‌گیرد از `_engine` می‌آید —
//    حالتِ هر ردیف از stateOf (همان ResultView)، فوریت از `_engine.urgency`،
//    واژهٔ هر ردیف از `fa`ِ خودِ موتور. این‌جا هیچ حکمِ بالینیِ تازه‌ای ساخته
//    نمی‌شود.
// ⚠️ چیزی که عمداً **نیست**: نمرهٔ سلامت، درصد، «ریسک»، روند یا نمودارِ زمانی.
//    موتور هیچ‌کدام را ندارد و یک برگه روند ندارد. نمودارها فقط سه چیز نشان
//    می‌دهند: شمارش، و جای هر عدد نسبت به محدودهٔ مرجعِ خودش (همان هندسهٔ
//    RangeBand). ستون‌ها به هم وصل نمی‌شوند، چون خطِ بینِ دو آزمایشِ متفاوت
//    روندی را القا می‌کند که وجود ندارد.
// ⚠️ نامِ بیمار فقط از پروفایلِ همین دستگاه خوانده و فقط همین‌جا نمایش داده
//    می‌شود؛ هرگز به سرور فرستاده نمی‌شود (patientFromProfile نام را ندارد).
// ============================================================

import { useEffect, useMemo, useState } from "react";
import Num from "./Num.jsx";
import { toFaDigits } from "./digits.js";
import { parseRange } from "./rangeMath.js";
import { CATEGORIES } from "./testCategories.js";
import { URGENCY, countRows, dirIcon, labelOf, stateOf, worstState } from "./resultStates.js";
import { loadProfile } from "./onboarding/profileStore.js";
import "./dashboard.css";

const STEPS = [
  { key: "emergency", label: "همین امروز" },
  { key: "soon", label: "۲۴ تا ۴۸ ساعت" },
  { key: "this_week", label: "این هفته" },
  { key: "routine", label: "نوبتِ عادی" },
];

/* جای نقطهٔ هر دستگاه روی شکلِ بدن (درصدِ عرض/ارتفاعِ کادر) — دادهٔ نمایشی. */
const SPOTS = {
  thyroid: [50, 17], cardiac: [55, 31], lipids: [44, 30], cbc: [62, 40], iron: [38, 40],
  coag: [70, 47], liver: [40, 47], glycemia: [56, 50], kidney: [36, 56], electro: [64, 56],
  inflam: [50, 63], vitamin: [44, 74], serology: [57, 74], other: [50, 82],
};

const numericRows = (tests) =>
  tests
    .map((t) => ({ t, r: parseRange(t.range), v: Number(t.value) }))
    .filter((x) => x.r && Number.isFinite(x.v));

/* ---------- کارتِ بیمار ---------- */
function PatientCard({ name, ctx, urg, urgency, topCat, outTotal, asText }) {
  const sub = [ctx?.sex && asText(ctx.sex), ctx?.age_text && asText(ctx.age_text)].filter(Boolean).join("، "); // نه «·»: کنارِ رقمِ فارسی شبیهِ «۰» خوانده می‌شد («۴۲۰ سال»)
  const initial = name ? name.trim()[0] : "؟";
  return (
    <div className="dash-card dash-patient">
      <div className="dash-patient-head">
        <span className="dash-avatar" aria-hidden="true">{initial}</span>
        <div>
          <p className="dash-patient-name">{name || "نتیجهٔ آزمایش شما"}</p>
          {sub && <p className="dash-muted">{sub}</p>}
        </div>
      </div>
      <p className="dash-line">
        بیشترین موردِ خارج از محدوده:{" "}
        <b className="dash-accent">{outTotal > 0 && topCat ? CATEGORIES[topCat]?.label : "موردی خارج از محدوده نیست"}</b>
      </p>
      <p className="dash-line">
        فوریتِ موتور:{" "}
        <span className={`dash-pill dash-pill--${urgency === "emergency" ? "red" : urgency === "none" ? "muted" : "lime"}`}>
          {urg.label}
        </span>
      </p>
    </div>
  );
}

/* ---------- خطِ زمانِ قدمِ بعدی ---------- */
function NextStep({ urgency, recCount }) {
  const idx = STEPS.findIndex((s) => s.key === urgency);
  return (
    <div className="dash-card dash-next">
      <div className="dash-next-title">
        <p className="dash-muted">قدمِ بعدی</p>
        <p className="dash-big">{recCount > 0 ? `${toFaDigits(recCount)} توصیه` : "بدونِ توصیهٔ تازه"}</p>
      </div>
      <ol className="dash-steps" aria-label="زمانِ پیشنهادیِ موتور برای دیدنِ پزشک">
        {STEPS.map((s, i) => (
          <li key={s.key} className={i === idx ? `on${s.key === "emergency" ? " red" : ""}` : ""} aria-current={i === idx ? "step" : undefined}>
            {i === idx && <span className="dash-marker" aria-hidden="true">اینجا</span>}
            <span className="dash-step-label">{s.label}</span>
          </li>
        ))}
      </ol>
      {idx < 0 && <p className="dash-muted dash-next-note">موتور برای این برگه زمانِ مشخصی پیشنهاد نکرد.</p>}
      <a className="dash-link" href="#recs">دیدنِ توصیه‌ها</a>
    </div>
  );
}

/* ---------- شکلِ بدن + خلاصه ---------- */
function BodyMap({ groups, ctx, summary }) {
  return (
    <div className="dash-card dash-body">
      {/* نقطه‌ها داخلِ خودِ SVG و به واحدِ viewBox‌اند تا با شکل یکجا مقیاس بخورند؛
          نقطه‌های HTMLِ درصدی روی جعبهٔ حاشیه‌دارِ SVG از شکل بیرون می‌زدند. */}
      <svg className="dash-figure" viewBox="0 0 200 300">
        <defs aria-hidden="true">
          <radialGradient id="dashGlow" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#d9f46a" stopOpacity=".18" />
            <stop offset="100%" stopColor="#d9f46a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="200" height="300" fill="url(#dashGlow)" aria-hidden="true" />
        <g aria-hidden="true" fill="none" stroke="#e8e8e8" strokeOpacity=".22" strokeWidth="1.4">
          <circle cx="100" cy="30" r="20" />
          <path d="M90 50 L90 62 M110 50 L110 62" />
          <path d="M60 70 Q100 58 140 70 L150 150 Q150 200 135 240 L120 290 M60 70 L50 150 Q50 200 65 240 L80 290" />
          <path d="M60 72 L35 150 L30 205 M140 72 L165 150 L170 205" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <path key={i} d={`M100 ${82 + i * 14} Q${78 - i} ${86 + i * 14} ${66 + i} ${96 + i * 14} M100 ${82 + i * 14} Q${122 + i} ${86 + i * 14} ${134 - i} ${96 + i * 14}`} />
          ))}
          <path d="M100 66 L100 200" strokeDasharray="3 4" />
        </g>
      {groups.map((g) => {
        const [x, y] = SPOTS[g.key] ?? SPOTS.other;
        const w = worstState(g.rows, ctx);
        const label = `${CATEGORIES[g.key]?.label ?? ""}: ${w.label}`;
        return (
          <a key={g.key} href={`#sys-${g.key}`} className={`dash-spot dash-spot--${w.key}`} aria-label={label}>
            <title>{label}</title>
            <circle className="dash-spot-halo" cx={x * 2} cy={y * 3} r="10" />
            <circle className="dash-spot-core" cx={x * 2} cy={y * 3} r="6.5" />
          </a>
        );
      })}
      </svg>
      {summary && (
        <div className="dash-insight">
          <span className="dash-tag">خلاصهٔ تفسیر هوشمند</span>
          <p>{summary}</p>
          <a className="dash-link" href="#summary">دیدنِ متنِ کامل</a>
        </div>
      )}
    </div>
  );
}

/* ---------- جای هر عدد نسبت به محدوده‌اش ----------
   ۰ = کفِ محدوده، ۱ = سقفِ آن. بیرون از [−۰٫۵، ۱٫۵] روی لبه با پیکان می‌ایستد
   و عددِ واقعی کنارش می‌آید — نشانگر هرگز دربارهٔ مقدار دروغ نمی‌گوید. */
function PositionChart({ rows, ctx }) {
  const items = useMemo(() => numericRows(rows), [rows]);
  const firstOut = items.findIndex((x) => x.t.abnormal);
  const [sel, setSel] = useState(firstOut >= 0 ? firstOut : 0);
  if (!items.length) return null;
  const cur = items[Math.min(sel, items.length - 1)];
  const H = 100;
  const yOf = (p) => H - ((Math.max(-0.5, Math.min(1.5, p)) + 0.5) / 2) * H;   // ٪ از بالا
  const st = stateOf(cur.t, ctx);
  return (
    <div className="dash-card dash-pos">
      <div className="dash-card-head">
        <div>
          <p className="dash-muted">جای هر عدد نسبت به محدودهٔ مرجعِ خودش</p>
          <p className="dash-big">{cur.t.name}: <Num>{cur.t.value}</Num></p>
          <p className="dash-pos-range">محدودهٔ مرجع: <Num>{cur.t.range}</Num></p>
        </div>
        <span className={`chip ${st.cls}`}><span aria-hidden="true">{dirIcon(cur.t, st)}</span>{labelOf(cur.t, st)}</span>
      </div>
      <div className="dash-pos-plot">
        <div className="dash-pos-axis" aria-hidden="true">
          <span style={{ top: `${yOf(1)}%` }}>سقفِ محدوده</span>
          <span style={{ top: `${yOf(0)}%` }}>کفِ محدوده</span>
        </div>
        <div className="dash-pos-band" style={{ top: `${yOf(1)}%`, height: `${yOf(0) - yOf(1)}%` }} aria-hidden="true" />
        <ul className="dash-pos-cols">
          {items.map((x, i) => {
            const p = (x.v - x.r.low) / (x.r.high - x.r.low);
            const s = stateOf(x.t, ctx);
            const edge = p > 1.5 ? "▲" : p < -0.5 ? "▼" : "";
            return (
              <li key={x.t.key}>
                <button
                  type="button"
                  className={`dash-col dash-col--${s.key}${i === sel ? " sel" : ""}`}
                  onClick={() => setSel(i)}
                  aria-pressed={i === sel}
                  aria-label={`${x.t.name}: ${x.t.value}، محدوده ${x.t.range}، ${labelOf(x.t, s)}`}
                >
                  <i className="dash-stem" style={{ top: `${Math.min(yOf(p), 50)}%`, bottom: `${100 - Math.max(yOf(p), 50)}%` }} />
                  <i className="dash-dot" style={{ top: `${yOf(p)}%` }}>{edge}</i>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="dash-muted dash-pos-foot">
        روی هر ستون بزنید تا نام، عدد و محدوده‌اش این بالا بیاید.
      </p>
    </div>
  );
}

/* ---------- کمانِ شمارش ----------
   کمان = نسبتِ همان شمارش، بی‌درصد (همان قاعدهٔ Scorecard). بخشِ خارج کهربایی است و فقط
   وقتی فوریتِ موتور برای برگه emergency است قرمز می‌شود — قرمز انحصاری برای اورژانس است. */
function CountGauge({ inRange, out, total, urgency }) {
  const R = 80, C = Math.PI * R;
  const okLen = total ? (inRange / total) * C : 0;
  return (
    <div className="dash-card dash-gauge">
      <p className="dash-muted">شمارشِ آزمایش‌ها</p>
      <p className="dash-big">{out > 0 ? `${toFaDigits(out)} مورد خارج از محدوده` : "همه داخلِ محدودهٔ مرجع"}</p>
      <svg viewBox="0 0 200 115" className="dash-gauge-svg" aria-hidden="true">
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke={urgency === "emergency" ? "var(--d-red)" : "var(--d-amber)"} strokeWidth="14" strokeLinecap="round" opacity={out ? 1 : 0.15} />
        <path className="dash-gauge-ok" d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="var(--d-lime)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${okLen} ${C}`} />
      </svg>
      <div className="dash-gauge-center">
        <span className="dash-gauge-num">{toFaDigits(inRange)}<small>/{toFaDigits(total)}</small></span>
        <span className="dash-pill dash-pill--lime">در محدوده</span>
      </div>
    </div>
  );
}

/* ---------- نوارِ هر دستگاه ---------- */
function SystemStrips({ groups, ctx }) {
  return (
    <div className="dash-card dash-strips">
      <p className="dash-muted">به تفکیکِ دستگاهِ بدن</p>
      <ul>
        {groups.map((g) => {
          const { out, total } = countRows(g.rows);
          const w = worstState(g.rows, ctx);
          return (
            <li key={g.key}>
              <a href={`#sys-${g.key}`} className="dash-strip">
                <span className="dash-strip-name">
                  {CATEGORIES[g.key]?.label}:{" "}
                  <b className={`dash-tone--${w.key}`}>{out ? `${toFaDigits(out)} از ${toFaDigits(total)} خارج` : `${toFaDigits(total)} در محدوده`}</b>
                </span>
                <span className="dash-strip-dots" aria-hidden="true">
                  {g.rows.map((t) => <i key={t.key} className={`dash-tone-bg--${stateOf(t, ctx).key}`} />)}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------- ستونِ تعدادِ هر دستگاه ---------- */
function SystemBars({ groups, ctx }) {
  const max = Math.max(1, ...groups.map((g) => g.rows.length));
  const top = groups.reduce((a, g) => (countRows(g.rows).out > countRows(a.rows).out ? g : a), groups[0]);
  return (
    <div className="dash-card dash-bars">
      <p className="dash-muted">تعدادِ آزمایش در هر دستگاه</p>
      <p className="dash-big">{toFaDigits(groups.reduce((n, g) => n + g.rows.length, 0))} آزمایش</p>
      <ul className="dash-bars-row">
        {groups.map((g) => {
          const { out, total } = countRows(g.rows);
          const w = worstState(g.rows, ctx);
          return (
            <li key={g.key} title={`${CATEGORIES[g.key]?.label}: ${total}`}>
              <span className="dash-bar" style={{ height: `${(total / max) * 100}%` }}>
                {out > 0 && <span className={`dash-bar-out dash-tone-bg--${w.key}`} style={{ height: `${(out / total) * 100}%` }} />}
              </span>
              <span className={`dash-bar-label${g === top && countRows(top.rows).out ? " hi" : ""}`}>{CATEGORIES[g.key]?.icon}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------- فهرستِ موارد خارج از محدوده ---------- */
function OutList({ tests, ctx }) {
  const out = tests.filter((t) => t.abnormal);
  return (
    <div className="dash-card dash-out">
      <p className="dash-muted">موارد خارج از محدوده</p>
      <p className="dash-big">{toFaDigits(out.length)} مورد</p>
      {out.length === 0 ? (
        <p className="dash-muted">
          محدودهٔ مرجع طوری تعریف می‌شود که حدود ۹۵ درصد افرادِ سالم داخلش بیفتند. «داخلِ محدوده» یعنی
          همین، و جای معاینه و سابقهٔ شما را نمی‌گیرد.
        </p>
      ) : (
        <ul>
          {out.map((t) => {
            const s = stateOf(t, ctx);
            return (
              <li key={t.key}>
                <span className="dash-out-name">{t.name}</span>
                <Num>{t.value}</Num>
                <span className={`chip ${s.cls}`}><span aria-hidden="true">{dirIcon(t, s)}</span>{labelOf(t, s)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * @param tests   `_engine.tests` (نام‌دار، همان فهرستِ ResultView)
 * @param groups  [{key, rows}] — همان گروه‌بندیِ ResultView
 * @param ctx     buildVerdictContext
 */
export default function ResultDashboard({ result, tests, groups, ctx, urgency, hasNumbers, asText, asList }) {
  const [name, setName] = useState("");
  useEffect(() => {
    let alive = true;
    loadProfile()
      .then((p) => { if (alive) setName([p?.firstName, p?.lastName].filter(Boolean).join(" ")); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!tests.length) return null;
  const { inRange, out, total } = countRows(tests);
  const urg = URGENCY[urgency] ?? URGENCY.none;
  const topCat = groups.reduce((a, g) => (countRows(g.rows).out > countRows(a.rows).out ? g : a), groups[0])?.key;

  return (
    <section className="dash" aria-labelledby="dash-h">
      <h2 id="dash-h" className="sr-only">وضعیت در یک نگاه</h2>
      <div className="dash-grid">
        <div className="dash-col-side">
          <PatientCard name={name} ctx={result._engine?.context} urg={urg} urgency={urgency} topCat={topCat} outTotal={out} asText={asText} />
          <BodyMap groups={groups} ctx={ctx} summary={result.summary ? asText(result.summary) : ""} />
        </div>
        <div className="dash-col-main">
          <NextStep urgency={urgency} recCount={asList(result.general_recommendations).length} />
          <div className="dash-row2">
            <PositionChart rows={tests} ctx={ctx} />
            <CountGauge inRange={inRange} out={out} total={total} urgency={urgency} />
          </div>
          <SystemStrips groups={groups} ctx={ctx} />
          <div className="dash-row2 dash-row2--even">
            <SystemBars groups={groups} ctx={ctx} />
            <OutList tests={tests} ctx={ctx} />
          </div>
        </div>
      </div>
      <p className="dash-foot">
        رنگ و برچسبِ هر مورد از حکمِ قاعده‌های موتور برای همان آزمایش است؛ فوریت برای کلِ برگه است.
        {hasNumbers && (
          <>
            {" "}این شمارش روی اعدادی است که از عکسِ شما خواندیم.{" "}
            <a href="#numbers-check" className="dash-link">یک نگاه به آن‌ها بیندازید</a> و با برگه مقایسه کنید.
          </>
        )}
      </p>
    </section>
  );
}
