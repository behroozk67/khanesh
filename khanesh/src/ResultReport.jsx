// ============================================================
// گزارشِ چاپیِ A4 — «دریافت PDF» از صفحهٔ نتیجه.
//
// چرا این‌طور: PDF با موتورِ چاپِ خودِ مرورگر ساخته می‌شود (print → Save as PDF).
//   • صفر کتابخانه و صفر فونتِ تازه؛ Vazirmatn و شکل‌دهیِ فارسی همان است که روی صفحه می‌بینید.
//   • متن انتخاب‌شدنی و جست‌وجوشدنی می‌ماند (jsPDF/تصویر این را ندارد).
//   • ⚠️ داده به هیچ سروری نمی‌رود: کلِ گزارش از `result`ی ساخته می‌شود که هم‌اکنون در
//     همین مرورگر است (analyzeJob.js، localStorage). معماریِ حریمِ خصوصیِ پروژه حفظ می‌شود.
//
// ⚠️ مرزِ موتور (همان قاعدهٔ ResultDashboard): هیچ آستانه، حکم یا عددی تازه‌ای اینجا
//    ساخته نمی‌شود. خلاصه/توصیه/تفسیر متنِ سرور است، رادار و نوارها هندسهٔ
//    `_engine.score` و `_engine.tests` — همان که داشبورد نشان می‌دهد. عددِ بالینی لاتین
//    می‌ماند، شمارش و امتیاز فارسی.
// ⚠️ بنرِ سبزِ «همه‌چیز خوب است» اینجا هم وجود ندارد؛ نوارِ هشدار فقط وقتی موتور
//    برگه را بحرانی/فوری دانسته — سندی که از اپ بیرون می‌رود نباید هشدار را جا بیندازد.
// ⚠️ «خلاصهٔ کوتاه» جملهٔ تازه‌ای نمی‌نویسد: جملهٔ اولِ همان خلاصهٔ سرور است (بریده، بی بازنویسی).
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { BRAND_FA } from './Logo.jsx';
import { LabMateMark } from './LabMateLogo.jsx';
import { loadProfile } from './onboarding/profileStore.js';
import {
  BAND_TONE, DISCLAIMER_FA, EMERGENCY_BANNER, STATE_RANK, clamp, fmtNum, fmtDate,
  normTest, scoreSystemsOf, scoreTone, toFa, TONE_WORD, NO_SCORE_FA,
} from './resultModel.js';
import './ResultReport.css';

/** همان محورِ نوارِ داشبورد: -0.5 تا 1.5 روی ۸٪ تا ۹۲٪ عرض. */
const axis = (p) => 8 + ((clamp(p, -0.5, 1.5) + 0.5) / 2) * 84;
const fmt1 = (n) => String(Math.round(n * 10) / 10);

function paragraphs(text) {
  return String(text ?? '')
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** جملهٔ اولِ خلاصه — بریده، نه بازنویسی‌شده.
    ⚠️ «خلاصهٔ کوتاه» جملهٔ تازه نمی‌سازد و متنِ بالینی تولید نمی‌کند؛ فقط اولین
       جملهٔ همان خلاصهٔ سرور را برجسته می‌کند. اگر جمله از سقف بلندتر بود،
       تا نزدیک‌ترین مرزِ جمله بریده می‌شود. */
function firstSentence(text, maxLen = 240) {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!flat) return '';
  const m = flat.match(/^.{40,}?[.؛؟!](?=\s|$)/);
  const cut = m ? m[0] : flat;
  if (cut.length <= maxLen) return cut;
  const slice = cut.slice(0, maxLen);
  const stop = Math.max(slice.lastIndexOf('.'), slice.lastIndexOf('؛'), slice.lastIndexOf('؟'), slice.lastIndexOf('!'));
  return stop > 80 ? slice.slice(0, stop + 1) : `${slice.replace(/\s+\S*$/, '')}…`;
}

/* ---------- آیکن‌های کوچکِ SVG (بدونِ ایموجی: فونتِ PDF ممکن است نداشته باشد) ---------- */
const ICONS = {
  spark: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z',
  chart: 'M4 19h16M7 16V9M12 16V6M17 16v-4',
  radar: 'M12 3l8 5v8l-8 5-8-5V8z',
  alert: 'M12 4l9 16H3zM12 10v4M12 17h.01',
  up: 'M12 19V6M6 11l6-6 6 6',
  down: 'M12 5v13M6 13l6 6 6-6',
  pill: 'M8 8h8a4 4 0 010 8H8a4 4 0 010-8z',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 8v4l3 2',
};
function Ico({ name }) {
  return (
    <svg className="krep-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={ICONS[name] || ICONS.spark} />
    </svg>
  );
}

/** حلقهٔ امتیازِ کل در هدرِ رنگی. */
function ScoreRing({ value, tone }) {
  const R = 26;
  const C = 2 * Math.PI * R;
  const pct = clamp((value ?? 0) / 100, 0, 1);
  return (
    <svg className="krep__ring" viewBox="0 0 64 64" role="img"
      aria-label={`امتیازِ این برگه: ${toFa(value)} از ۱۰۰ — ${TONE_WORD[tone]}`}>
      <circle cx="32" cy="32" r={R} className="krep__ring-bg" />
      <circle cx="32" cy="32" r={R} className={`krep__ring-arc krep-ring-${tone}`}
        strokeDasharray={`${C * pct} ${C}`} transform="rotate(-90 32 32)" />
      <text x="32" y="36" textAnchor="middle" className="krep__ring-num">{toFa(value)}</text>
    </svg>
  );
}

/* ---------- رادارِ فشردهٔ امتیازِ دستگاه‌ها ---------- */
function Radar({ systems, overall, tone, why }) {
  const scored = systems.filter((s) => s.score != null);
  const n = scored.length;
  // سرورِ قدیمی: بی‌دستگاه ولی با عددِ کل — عدد نباید گم شود.
  if (!n) {
    if (overall == null) return why ? <p className="krep__empty">{why}</p> : null;
    return (
      <p className="krep__overall">
        <b className={`krep-t-${tone}`}>{toFa(overall)}</b> <span>مرورِ سریع از ۱۰۰</span>{' '}
        <small className={`krep-t-${tone}`}>{TONE_WORD[tone]}</small>
      </p>
    );
  }
  const R = 30;
  const pt = (i, r) => {
    const a = (i / n) * Math.PI * 2;
    return [50 + r * Math.sin(a), 50 - r * Math.cos(a)];
  };
  const poly = scored.map((s, i) => pt(i, (R * s.score) / 100).join(',')).join(' ');

  return (
    <>
      {n >= 3 && (
        <svg className="krep__radar" viewBox="0 0 100 100" role="img"
          aria-label={`امتیازِ دستگاه‌های بدن: ${scored.map((s) => `${s.title} ${toFa(s.score)}`).join('، ')}`}>
          <defs>
            <linearGradient id="krep-radar-fill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#4f68f5" stopOpacity="0.34" />
              <stop offset="100%" stopColor="#8a5cf6" stopOpacity="0.16" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((k) => (
            <circle key={k} cx="50" cy="50" r={R * k} className="krep-ring" />
          ))}
          {scored.map((s, i) => {
            const [x, y] = pt(i, R);
            return <line key={s.key} x1="50" y1="50" x2={x} y2={y} className="krep-spoke" />;
          })}
          <polygon points={poly} className="krep-area" />
          {scored.map((s, i) => {
            const [x, y] = pt(i, (R * s.score) / 100);
            return <circle key={s.key} cx={x} cy={y} r="1.8" className={`krep-dot krep-t-${scoreTone(s.score, s.critical)}`} />;
          })}
          {/* ⚠️ عدد تنها در مرکز: نوشتنِ «مرورِ سریع» داخلِ SVG روی عدد می‌افتاد
              (دیده‌شده در PDFِ آزمایشی) — عنوان زیرِ نمودار آمد. */}
          {overall != null && (
            <text x="50" y="54" textAnchor="middle" className={`krep-big krep-t-${tone}`}>{toFa(overall)}</text>
          )}
        </svg>
      )}
      {overall != null && (
        <p className="krep__overall">
          {n < 3 && <><b className={`krep-t-${tone}`}>{toFa(overall)}</b>{' '}</>}
          <span>مرورِ سریع از ۱۰۰</span>{' '}
          <small className={`krep-t-${tone}`}>{TONE_WORD[tone]}</small>
        </p>
      )}
      {/* P97-ب: در اورژانس عمداً عددی داده نمی‌شود — گزارش باید بگوید چرا. */}
      {overall == null && why && <p className="krep__empty">{why}</p>}
      <ul className="krep__scores">
        {scored.map((s) => {
          const t = scoreTone(s.score, s.critical);
          return (
            <li key={s.key}>
              <span className="krep__score-name">{s.title}</span>
              <span className="krep__score-bar">
                <i className={`krep-bg-${t}`} style={{ width: `${clamp(s.score, 0, 100)}%` }} />
              </span>
              <b className={`krep-t-${t}`}>{toFa(Math.round(s.score))}</b>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/* ---------- سنِ زیستی (فقط نمایش؛ دادهٔ سرور، P113) ---------- */
function Pheno({ data }) {
  if (!data || typeof data.years !== 'number' || typeof data.chronoAge !== 'number') return null;
  const capped = data.capped === true;
  const shown = capped ? 20 : data.years;
  const lo = Math.floor(Math.min(shown, data.chronoAge) - 4);
  const hi = Math.ceil(Math.max(shown, data.chronoAge) + 4);
  const span = hi - lo || 1;
  const pos = (v) => Math.min(100, Math.max(0, ((v - lo) / span) * 100));
  const younger = data.deltaYears < 0;
  const same = !capped && Math.abs(data.deltaYears) < 0.05;

  return (
    <div className="krep__card krep__pheno">
      <h3 className="krep__h2 krep__h2--sm">
        <span className="krep__h2-ico krep__h2-ico--violet"><Ico name="clock" /></span>
        سنِ زیستی <small dir="ltr">PhenoAge</small>
      </h3>
      <p className="krep__pheno-num">
        {capped ? <>کمتر از <b>{fmt1(20)}</b></> : <b>{fmt1(data.years)}</b>} <span>سال</span>
      </p>
      {!capped && (
        <p className="krep__pheno-delta">
          {same ? 'هم‌سال با سنِ شناسنامه‌ای' : <>{fmt1(Math.abs(data.deltaYears))} سال {younger ? 'جوان‌تر' : 'بالاتر'} از سنِ شناسنامه‌ای</>}
        </p>
      )}
      <div className="krep__scale" aria-hidden="true">
        <span className="krep__scale-span" style={{ left: `${Math.min(pos(shown), pos(data.chronoAge))}%`, width: `${Math.abs(pos(shown) - pos(data.chronoAge))}%` }} />
        {!same && <span className="krep__scale-dot krep__scale-dot--chrono" style={{ left: `${pos(data.chronoAge)}%` }} />}
        <span className="krep__scale-dot" style={{ left: `${pos(shown)}%` }} />
      </div>
      <p className="krep__pheno-foot">
        سنِ شناسنامه‌ای {fmt1(data.chronoAge)} سال · شاخصِ جمعیتی، نه پیش‌بینیِ فردی (P113).
      </p>
    </div>
  );
}

/* ---------- «نکاتِ کلیدی»: فقط ردیف‌هایی که موتور خارج از محدوده دانسته ----------
   ⚠️ متنِ هر کارت همان برچسبِ موتور/مدل (normTest.label) و عددِ برگه است؛
      این‌جا نه آستانه ساخته می‌شود نه جملهٔ بالینیِ تازه. */
function Insights({ rows }) {
  const flagged = rows.filter((r) => r.state === 'abnormal' || r.state === 'critical').slice(0, 6);
  if (!flagged.length) return null;
  return (
    <section className="krep__card krep__card--keep">
      <h2 className="krep__h2">
        <span className="krep__h2-ico"><Ico name="spark" /></span>
        نکاتِ کلیدی
      </h2>
      <ul className="krep__insights">
        {flagged.map((t) => {
          const bad = t.state === 'critical';
          const tone = bad ? 'bad' : 'warn';
          return (
            <li key={`ins-${t.id}`}>
              <span className={`krep__insight-ico krep__insight-ico--${tone}`}>
                <Ico name={bad ? 'alert' : t.dir === 'low' ? 'down' : 'up'} />
              </span>
              <span className="krep__insight-body">
                <b>{t.name}</b>
                <small>
                  {fmtNum(t.value)}{t.unit ? ` ${t.unit}` : ''} ·{' '}
                  {t.rangeText !== '—'
                    ? <>محدودهٔ مرجع <bdi dir="ltr">{t.rangeText}</bdi></>
                    : t.label}
                </small>
              </span>
              <span className={`krep__pill krep__pill--${tone}`}>
                {bad ? 'بحرانی' : t.dir === 'low' ? 'پایین' : 'بالا'}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ========================================================================== */
export default function ResultReport({ result, asText, asList }) {
  const [name, setName] = useState('');
  useEffect(() => {
    let alive = true;
    loadProfile()
      .then((p) => { if (alive) setName([p?.firstName, p?.lastName].filter(Boolean).join(' ')); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const eng = result?._engine || {};
  const tests = (Array.isArray(eng.tests) ? eng.tests : [])
    .filter((t) => t && typeof t.name === 'string' && t.name.trim());

  const model = useMemo(() => {
    const hasNumbers = tests.some((t) => t.value != null || t.result != null);
    const all = tests.map((t, i) => normTest(t, i, asText, hasNumbers, eng.indices));
    const score = eng.score || null;
    const scored = scoreSystemsOf(score, all);
    const overall = score?.value ?? null;
    const tone = eng.urgency === 'emergency'
      ? scoreTone(overall, true)
      : (score?.band && BAND_TONE[score.band]) || scoreTone(overall, false);
    // ردیف‌های خارج از محدوده اول — همان ترتیبِ کارتِ «نتایج شما»
    const rows = [...all].sort((a, b) => STATE_RANK[b.state] - STATE_RANK[a.state]);
    const abnormal = all.filter((r) => r.state === 'abnormal').length;
    const critical = all.filter((r) => r.state === 'critical').length;
    return { all, rows, scored, overall, tone, hasNumbers, abnormal, critical };
  }, [tests, asText, eng.indices, eng.score, eng.urgency]);

  if (!result) return null;

  const ctx = eng.context || {};
  const sampleDate = typeof ctx.sample_date === 'string' ? ctx.sample_date : null;
  const ctxBits = [asText(ctx.sex), asText(ctx.age_text)].filter(Boolean);
  const cb = eng.critical_banner;
  // متنِ بنر عیناً همان چیزی است که صفحهٔ نتیجه نشان می‌دهد (resultModel.js).
  const banner = result.has_critical
    ? (cb && typeof cb.title === 'string' && typeof cb.body === 'string' ? cb : EMERGENCY_BANNER)
    : null;

  // «خلاصهٔ تفسیر در نمای ساده»: مسیرِ گراف متنِ بیمار را در patientSection می‌دهد،
  // مسیرِ قدیمی summary و سپس interpretation. هیچ‌کدام ⇒ بخش رندر نمی‌شود.
  const summaryText = asText(result.labmat?.patientSection) || asText(result.summary);
  const interp = paragraphs(asText(result.interpretation));
  const recs = asList(result.general_recommendations).filter(Boolean);
  const why = scoreReason(eng.score, model.scored);
  const sumParas = paragraphs(summaryText);
  const brief = firstSentence(sumParas[0] || interp[0] || '');
  // ⚠️ تکرارِ عینِ یک جمله در دو جای سند: اگر پاراگرافِ اول **کاملاً** در
  //    «خلاصهٔ کوتاه» آمده، از بخشِ «خلاصه» حذف می‌شود (بقیهٔ پاراگراف‌ها می‌مانند).
  const firstParaQuoted = !!sumParas.length && sumParas[0].trim() === brief.trim();
  const summaryRest = firstParaQuoted ? sumParas.slice(1) : sumParas;
  const showSummary = summaryRest.length > 0;

  return (
    <div className="krep" dir="rtl" lang="fa" id="krep-root">
      <header className="krep__hero">
        <div className="krep__hero-main">
          <div className="krep__brand">
            <LabMateMark size={24} />
            <b>{BRAND_FA}</b>
          </div>
          <h1>گزارش تفسیر آزمایش</h1>
          <p className="krep__who">
            {[name || null, ctxBits.join('، ') || null].filter(Boolean).join(' · ')
              || 'تفسیر خودکارِ برگهٔ آزمایش'}
          </p>
          <div className="krep__chips">
            {sampleDate && (
              <span className="krep__chip"><Ico name="clock" />{fmtDate(sampleDate, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            )}
            {model.all.length > 0 && (
              <span className="krep__chip"><Ico name="chart" />{toFa(model.all.length)} آزمایش</span>
            )}
            {model.abnormal > 0 && (
              <span className="krep__chip krep__chip--warn">{toFa(model.abnormal)} خارج از محدوده</span>
            )}
            {model.critical > 0 && (
              <span className="krep__chip krep__chip--bad">{toFa(model.critical)} بحرانی</span>
            )}
          </div>
        </div>
        {model.overall != null && (
          <div className="krep__hero-score">
            <ScoreRing value={model.overall} tone={model.tone} />
            <span>امتیاز از ۱۰۰</span>
            <b className={`krep-ring-tone-${model.tone}`}>{TONE_WORD[model.tone]}</b>
          </div>
        )}
      </header>

      {banner && (
        <div className="krep__alert">
          <span className="krep__alert-ico"><Ico name="alert" /></span>
          <div>
            <b>{asText(banner.title)}</b>
            <span>{asText(banner.body)}</span>
          </div>
        </div>
      )}

      {brief && (
        <section className="krep__brief">
          <span className="krep__brief-tag"><Ico name="spark" />خلاصهٔ کوتاه</span>
          <p>{brief}</p>
        </section>
      )}

      <div className="krep__grid">
        <section className="krep__card krep__main">
          {showSummary && (
            <>
              <h2 className="krep__h2">
                <span className="krep__h2-ico"><Ico name="pill" /></span>
                خلاصه
              </h2>
              {summaryRest.map((p, i) => <p key={`s${i}`}>{p}</p>)}
            </>
          )}
          {interp.length > 0 && (
            <>
              <h2 className={`krep__h2${showSummary ? ' krep__h2--tight' : ''}`}>
                <span className="krep__h2-ico krep__h2-ico--violet"><Ico name="spark" /></span>
                تفسیر
              </h2>
              {interp.map((p, i) => <p key={`i${i}`}>{p}</p>)}
            </>
          )}
          {recs.length > 0 && (
            <>
              <h2 className="krep__h2 krep__h2--tight">
                <span className="krep__h2-ico krep__h2-ico--teal"><Ico name="chart" /></span>
                توصیه‌ها
              </h2>
              <ul className={`krep__recs${recs.length > 5 ? ' krep__recs--2col' : ''}`}>
                {recs.map((r, i) => <li key={i}>{asText(r)}</li>)}
              </ul>
            </>
          )}
          {!showSummary && !interp.length && !recs.length && (
            <p className="krep__empty">متنی برای این تفسیر ثبت نشده است.</p>
          )}
        </section>

        <aside className="krep__side">
          <div className="krep__card krep__score">
            <h3 className="krep__h2 krep__h2--sm">
              <span className="krep__h2-ico"><Ico name="radar" /></span>
              دستگاه‌های بدن
            </h3>
            <Radar systems={model.scored} overall={model.overall} tone={model.tone} why={why} />
          </div>
          <Pheno data={eng.phenoAge} />
        </aside>
      </div>

      <section className="krep__card krep__card--keep">
        <h2 className="krep__h2">
          <span className="krep__h2-ico krep__h2-ico--teal"><Ico name="chart" /></span>
          نمودار نتایج
          {model.all.length > 0 && <small> — {toFa(model.all.length)} آزمایش، محدودهٔ مرجعِ هر ردیف</small>}
        </h2>
        {model.hasNumbers ? (
          <ul className={`krep__rows${model.rows.length > 14 ? ' krep__rows--3' : ''}`}>
            {model.rows.map((t) => {
              const over = t.pos != null && t.pos > 1.5;
              const under = t.pos != null && t.pos < -0.5;
              const stateFa = t.state === 'critical' ? 'بحرانی' : t.state === 'abnormal' ? (t.dir === 'low' ? 'پایین' : 'بالا') : null;
              const tone = t.state === 'critical' ? 'bad' : t.state === 'abnormal' ? 'warn' : 'good';
              return (
                <li key={t.id}>
                  <span className="krep__row-name">{t.name}</span>
                  <span className={`krep__track${t.pos == null ? ' krep__track--none' : ''}`}>
                    {t.pos != null && (
                      <>
                        <i className="krep__band" />
                        <i className="krep__band krep__band--mid" />
                        <em className={`krep__mark krep-bg-${tone}`} style={{ left: `${axis(t.pos)}%` }} />
                      </>
                    )}
                  </span>
                  <b className={`krep__val krep-t-${tone}`}>
                    {over && '▲'}{under && '▼'}{fmtNum(t.value)}
                    {t.unit && <small>{t.unit}</small>}
                  </b>
                  {tone === 'good' ? (
                    <small className="krep__flag krep__flag--ok">{t.state === 'normal' ? 'در محدوده' : '—'}</small>
                  ) : (
                    <small className={`krep__flag krep__pill krep__pill--${tone}`}>{stateFa}</small>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="krep__empty">مقدار عددی از برگه استخراج نشده بود؛ نمودارِ محدوده رسم نمی‌شود.</p>
        )}
        <p className="krep__legend">
          نوارِ روشن محدودهٔ مرجعِ همان آزمایش است، بخشِ پررنگ‌تر میانهٔ آن، و نشانگر جایِ عددِ شما.
          ▲/▼ یعنی عدد از بازهٔ نمایش بیرون است. رنگ کهربایی = خارج از محدوده، قرمز = بحرانی.
        </p>
      </section>

      <Insights rows={model.all} />

      <footer className="krep__foot">
        <span>
          {DISCLAIMER_FA} محدوده‌ها بر اساس مراجع استاندارد است و ممکن است با کیتِ آزمایشگاه شما
          اندکی فرق کند.
        </span>
        <span className="krep__foot-brand">
          {BRAND_FA} · ساخته‌شده در {fmtDate(new Date().toISOString(), { year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </footer>
    </div>
  );
}

/** دلیلِ نبودِ امتیاز — همان متن‌های داشبورد، بدون نسخهٔ دوم. */
function scoreReason(score, scored) {
  const reason = score?.reason;
  if (!reason) return null;
  if (reason === 'one_system') return NO_SCORE_FA.one_system(scored.map((s) => s.title).join('، '));
  return typeof NO_SCORE_FA[reason] === 'string' ? NO_SCORE_FA[reason] : null;
}
