import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { CATEGORIES } from './testCategories.js';
import { loadProfile } from './onboarding/profileStore.js';
import { BRAND_FA } from './Logo.jsx';
import { LabMateMark } from './LabMateLogo.jsx';
import { recordScore, hashStr } from './scoreHistory.js';
import './ResultDashboard.css';
import {
  BAND_TONE, NO_SCORE_FA, RADAR_MIN_SYSTEMS, STATE_RANK, SYS_TITLE, TONE_WORD, clamp, defaultAsText,
  fmtDate, fmtNum, normTest, num, scoreSystemsOf, scoreTone, sysKey, toFa,
} from './resultModel.js';

/* ==========================================================================
   خوانش — داشبوردِ نتیجه (طرحِ روشن): ناوبری · سرصفحه · نوارِ جایگاهِ آزمایش‌ها ·
   رادارِ دستگاه‌ها · نکات · توصیه‌ها · روند (فقط با تاریخچه).

   ⚠️ مرزِ موتور: هر حالت/برچسب/امتیاز از `_engine` می‌آید (abnormal، dir، level، fa،
      score). این‌جا آستانه یا حکمِ بالینیِ تازه‌ای ساخته نمی‌شود؛ هندسهٔ نوار فقط
      جای عدد را نسبت به محدودهٔ چاپ‌شدهٔ همان آزمایش می‌کشد.
   ⚠️ عددِ بالینی لاتین می‌ماند (بیمار باید همان عددِ روی کاغذ را پیدا کند)؛ فقط
      شمارش‌ها و امتیازها فارسی‌اند. نامِ آزمایش همیشه faName()ِ سرور است، نه کلیدِ خام (N8).
   ⚠️ امتیاز = «امتیازِ این برگه» از rules/score.js (P97): جمعِ حکم‌های موتور با سقفِ فوریت.
      نمرهٔ هر دستگاه از همان نمره‌های موتور (`score.points`) جمع می‌شود، نه فرمولِ جدا.
   ========================================================================== */


function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setW(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;


/* ==========================================================================
   Main component
   ========================================================================== */
export default function ResultDashboard({
  result,
  tests,
  groups,
  ctx,
  urgency,
  asText = defaultAsText,
  patientName,
  date,          // اختیاری: تاریخِ همین برگه (موتور تاریخ نمی‌دهد؛ بی‌مقدار نمایش داده نمی‌شود)
  history,       // اختیاری: [{ date, score }] — بی‌تاریخچه کارتِ روند نمایش داده نمی‌شود
  onDownload,
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const rootRef = useRef(null);
  const [profileName, setProfileName] = useState('');
  const [profileReady, setProfileReady] = useState(false); // تاریخچه پس از معلوم‌شدنِ نامِ پروفایل ثبت می‌شود
  useEffect(() => {
    let alive = true;
    loadProfile()
      .then((p) => { if (alive) setProfileName([p?.firstName, p?.lastName].filter(Boolean).join(' ')); })
      .catch(() => {})
      .finally(() => { if (alive) setProfileReady(true); });
    return () => { alive = false; };
  }, []);

  // «عدد داریم» از خودِ آزمایش‌های موتور می‌آید، نه از extracted_tests (مسیرِ دستی/متنی هم عدد دارد)
  const hasNumbers = (tests || []).some((t) => num(t.value ?? t.result) != null);
  const engine = result?._engine || {};
  const score = engine.score || null;

  const model = useMemo(() => {
    const groupSrc =
      Array.isArray(groups) && groups.length
        ? groups
        : Object.values(
            (tests || []).reduce((acc, t) => {
              const k = t.group ?? t.system ?? 'other';
              (acc[k] = acc[k] || { key: k, rows: [] }).rows.push(t);
              return acc;
            }, {})
          );

    const systems = groupSrc
      .map((g, gi) => {
        const key = sysKey(g.key ?? g.id ?? g.name);
        const rows = (g.rows ?? g.tests ?? []).map((t, i) => normTest(t, i, asText, hasNumbers, engine.indices));
        const worst = rows.reduce((w, r) => (STATE_RANK[r.state] > STATE_RANK[w] ? r.state : w), 'normal');
        return {
          key: `${key}-${gi}`,
          title: asText(g.title ?? g.label ?? g.name_fa) || CATEGORIES[g.key]?.label || SYS_TITLE[key] || 'سایر',
          rows,
          state: rows.length ? worst : 'unknown',
          abnormal: rows.filter((r) => r.state === 'abnormal' || r.state === 'critical').length,
        };
      })
      .filter((s) => s.rows.length);

    const all =
      Array.isArray(tests) && tests.length
        ? tests.map((t, i) => normTest(t, i, asText, hasNumbers, engine.indices))
        : systems.flatMap((s) => s.rows);

    const overall = score?.value ?? null;
    const scoreSystems = scoreSystemsOf(score, all);
    return { systems, all, overall, scoreSystems };
  }, [tests, groups, asText, hasNumbers, score, engine.indices]);

  const { systems, all, overall, scoreSystems } = model;

  // روند: همیشه نمایش داده می‌شود. نقطه‌های قبلی یا از prop `history` می‌آیند، یا از تاریخچهٔ همین دستگاه
  // (scoreHistory.js). نقطهٔ فعلی بی‌تاریخچه تنهاست و کارت می‌گوید با نوبتِ بعد خط کشیده می‌شود.
  const sig = useMemo(
    // امضا فقط از ردیف‌های خوانده‌شدهٔ برگه (extracted_tests، مستقیم از OCR)؛ نه امتیاز و نه فهرستِ سنجیده‌شدهٔ موتور. هر دو با
    //   موتورِ تازه عوض می‌شوند و همان برگه «نوبتِ دیگر» می‌شد: «۸۲ ← ۹۰، ۱۰٪ بهتر از نوبتِ قبل» (گزارشِ کاربر ۲۰۲۶-۱۰-۱۶؛ scoreHistory.js، v3).
    () => {
      if (overall == null) return null;
      const rows = Array.isArray(result?.extracted_tests) && result.extracted_tests.length ? result.extracted_tests : all;
      return hashStr(rows.map((t) => `${t.name ?? t.key}:${t.value}`).sort().join('|'));
    },
    [result, all, overall]
  );
  // تاریخِ نمونهٔ چاپ‌شده (ISO، از موتور) — همان تاریخ یعنی همان نوبت (scoreHistory.js).
  const sampleDate = typeof engine?.context?.sample_date === 'string' ? engine.context.sample_date : null;
  const [stored, setStored] = useState(null);
  useEffect(() => {
    if (!profileReady || overall == null || !sig) return;
    setStored(recordScore(hashStr(profileName), overall, sig, sampleDate));
  }, [profileReady, profileName, overall, sig, sampleDate]);
  const trend = useMemo(() => {
    if (overall == null) return [];
    const src = Array.isArray(history) ? history : stored?.prev ?? [];
    const prev = src
      .map((h) => ({ date: h.date, score: num(h.score) }))
      .filter((h) => h.score != null)
      .sort((a, b) => (Date.parse(a.date) || 0) - (Date.parse(b.date) || 0));
    return [...prev, { date: date ?? stored?.date ?? null, score: overall, current: true }];
  }, [history, stored, date, overall]);
  const [focusKey, setFocusKey] = useState(null);
  const focus = systems.find((s) => s.key === focusKey) || scoreSystems.find((s) => s.key === focusKey) || null;
  const toggleFocus = (k) => setFocusKey((cur) => (cur === k ? null : k));
  const [nav, setNav] = useState('overview');

  const engineCtx = engine.context || {};
  const name = patientName || profileName || '';
  const firstName = name.trim().split(/\s+/)[0] || '';
  const ageText = asText(engineCtx.age_text ?? ctx?.age_text);
  const sexText = asText(engineCtx.sex ?? ctx?.sex);
  const insights = useMemo(() => buildInsights(systems, all, urgency), [systems, all, urgency]);

  const go = (key) => {
    setNav(key);
    if (key === 'download') { onDownload?.(); return; }
    const el = key === 'overview' ? rootRef.current : document.getElementById(`${uid}-${key}`);
    el?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
  };

  const NAV = [
    ['overview', 'نمای کلی', <HomeI key="i" />],
    ['results', 'آزمایش‌ها', <DropI key="i" />],
    ['trend', 'روندها', <TrendI key="i" />],
    ['systems', 'دستگاه‌های بدن', <ScanI key="i" />],
    onDownload && ['download', 'دریافت داده', <FileI key="i" />],
  ].filter(Boolean);

  if (!all.length) return null;

  return (
    <div className="kd-wrap">
    <div className="kd" dir="rtl" lang="fa" ref={rootRef}>
      <div className="kd-shell">
        {/* ---------------- sidebar ---------------- */}
        <aside className="kd-side">
          <div className="kd-logo" aria-label={BRAND_FA}>
            <LabMateMark size={44} title={BRAND_FA} />
            <span className="kd-logo__word">{BRAND_FA}</span>
          </div>
          <nav className="kd-nav" aria-label="بخش‌های داشبورد">
            {NAV.map(([k, label, icon]) => (
              <button key={k} type="button" className={`kd-nav__item${nav === k ? ' is-active' : ''}`}
                aria-current={nav === k ? 'page' : undefined} onClick={() => go(k)}>
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </nav>
          {(name || ageText || sexText) && (
            <div className="kd-user">
              <span className="kd-user__avatar" aria-hidden="true">{(name || '؟').trim().charAt(0)}</span>
              <span className="kd-user__name">
                {name || 'نتیجهٔ آزمایش شما'}
                {(sexText || ageText) && <small>{[sexText, ageText].filter(Boolean).join('، ')}</small>}
              </span>
            </div>
          )}
        </aside>

        {/* ---------------- main ---------------- */}
        <main className="kd-main">
          <header className="kd-card kd-head">
            <div>
              <h1 className="kd-head__hello">سلام{firstName ? `، ${firstName}` : ''}</h1>
              <p className="kd-head__sub">این مرور آزمایش شماست</p>
            </div>
            <div className="kd-head__actions">
              {date && (
                <div className="kd-datebox">
                  <span>آخرین آزمایش</span>
                  <b>{fmtDate(date, { year: 'numeric', month: 'long', day: 'numeric' })}</b>
                </div>
              )}
              {onDownload && (
                <button type="button" className="kd-btn" onClick={onDownload}>
                  <DownloadI /> دریافت نتایج
                </button>
              )}
            </div>
          </header>

          <ResultsCard id={`${uid}-results`} systems={systems} focus={focus}
            onClearFocus={() => setFocusKey(null)} hasNumbers={hasNumbers}
            unread={Array.isArray(engine.unread) ? engine.unread : []} />

          <RadarCard id={`${uid}-systems`} systems={scoreSystems} overall={overall} score={score}
            urgency={urgency} focusKey={focusKey} onSelect={toggleFocus} />

          <div className="kd-stack">
            <InsightsCard items={insights} />
          </div>

          <TrendCard id={`${uid}-trend`} uid={uid} points={trend} urgency={urgency}
            why={typeof NO_SCORE_FA[score?.reason] === 'string' ? NO_SCORE_FA[score.reason] : null} />
        </main>
      </div>
    </div>
    </div>
  );
}

/* ==========================================================================
   Insights (فقط از حکمِ موتور)
   ========================================================================== */
function listFa(names) {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join('، ')} و ${names[names.length - 1]}`;
}

function buildInsights(systems, all, urgency) {
  const out = [];
  all
    .filter((t) => t.state === 'critical')
    .forEach((t) =>
      out.push({
        tone: 'bad', dir: t.dir || 'high',
        title: `${t.name} در محدوده بحرانی است`,
        text: `${t.label}. مرجع: ${t.rangeText}${urgency === 'emergency' ? '. همین امروز اقدام کنید.' : '.'}`,
      })
    );
  systems
    .filter((s) => s.abnormal > 0)
    .sort((a, b) => b.abnormal - a.abnormal)
    .forEach((s) => {
      const rows = s.rows.filter((r) => r.state === 'abnormal');
      if (!rows.length) return;
      // ═══ P111 (بازبینیِ ۲۰۲۶-۱۰-۲۰): جهتِ هر ردیف مالِ خودش است ═══
      //   پیش‌تر برچسبِ *اولین* ردیف روی همهٔ نام‌ها می‌نشست: «تری‌گلیسرید و HDL؛ بالاتر از حد طبیعی»،
      //   در حالی که HDL پایین بود؛ و در CBC پسرِ ۱۲ ساله «مونوسیت، گلبول قرمز و هموگلوبین؛ پایین‌تر از
      //   حد طبیعی!» در حالی که دو موردِ آخر بالا بودند. حالا نام‌ها بر اساسِ برچسبِ خودِ موتور گروه می‌شوند.
      const byLabel = new Map();
      for (const r of rows) {
        const key = String(r.label ?? '');
        if (!byLabel.has(key)) byLabel.set(key, []);
        byLabel.get(key).push(r.name);
      }
      const parts = [...byLabel.entries()].map(([label, names]) => {
        const shown = names.length > 3 ? [...names.slice(0, 3), 'موارد دیگر'] : names;
        return `${listFa(shown)}؛ ${label}`;
      });
      out.push({
        tone: 'warn',
        title: `${s.title}: ${toFa(rows.length)} مورد خارج از محدوده`,
        text: `${parts.join('، و ')}.`,
      });
    });
  const good = systems.filter((s) => s.state === 'normal');
  if (good.length) {
    const names = good.slice(0, 3).map((s) => s.title);
    const count = good.slice(0, 3).reduce((a, s) => a + s.rows.length, 0);
    out.push({
      tone: 'good',
      title: names.length === 1 ? `${names[0]} در محدوده مرجع است` : `${listFa(names)} در محدوده مرجع‌اند`,
      text: `هر ${toFa(count)} آزمایش مربوط در محدوده است.`,
    });
  }
  return out;
}

/* ==========================================================================
   Cards
   ========================================================================== */
function InfoTip({ text }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (e.type === 'keydown' && e.key !== 'Escape') return;
      if (e.type === 'pointerdown' && ref.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);
  return (
    <span className="kd-info" ref={ref}>
      <button type="button" className="kd-info__btn" aria-expanded={open} aria-label="توضیح"
        onClick={() => setOpen((o) => !o)}>
        <InfoI />
      </button>
      {open && <span className="kd-info__pop" role="tooltip">{text}</span>}
    </span>
  );
}

function CardHead({ title, sub, info, aside }) {
  return (
    <div className="kd-cardhead">
      <div className="kd-cardhead__row">
        <h2>{title}</h2>
        <div className="kd-cardhead__aside">
          {aside}
          {info && <InfoTip text={info} />}
        </div>
      </div>
      {sub && <p>{sub}</p>}
    </div>
  );
}

/* ---------- Results: range bars ---------- */
const LIMIT = 12;
const axis = (p) => 8 + ((clamp(p, -0.5, 1.5) + 0.5) / 2) * 84; // % along the track

function ResultsCard({ id, systems, focus, onClearFocus, hasNumbers, unread = [] }) {
  const [expanded, setExpanded] = useState(false);
  const [sel, setSel] = useState(null);
  // دستگاه‌های دارای موردِ بحرانی/خارج اول می‌آیند تا پشتِ «نمایش بیشتر» پنهان نشوند
  const list = focus
    ? [focus]
    : systems
        .map((g, i) => ({ g, i }))
        .sort((a, b) => STATE_RANK[b.g.state] - STATE_RANK[a.g.state] || a.i - b.i)
        .map(({ g }) => g);
  const total = list.reduce((a, g) => a + g.rows.length, 0);
  let left = expanded || focus ? Infinity : LIMIT;
  const shown = list
    .map((g) => {
      const rows = g.rows.slice(0, Math.max(0, left));
      left -= rows.length;
      return { ...g, rows };
    })
    .filter((g) => g.rows.length);
  const shownCount = shown.reduce((a, g) => a + g.rows.length, 0);

  return (
    <section className="kd-card kd-results" id={id}>
      <CardHead
        title="نتایج شما"
        info="هر نوار، محدودهٔ مرجعِ همان آزمایش را نشان می‌دهد. بخشِ آبیِ روشن محدودهٔ مرجع است، بخشِ پررنگ‌تر میانهٔ آن، و خطِ عمودیِ وسط، مرکزِ محدوده. جعبهٔ آبی عددِ شماست؛ نارنجی یعنی خارج از محدوده و قرمز یعنی مقدارِ بحرانی. عددها همان اعدادِ روی برگه‌اند."
        aside={focus && (
          <button type="button" className="kd-chip" onClick={onClearFocus}>{focus.title} ✕</button>
        )}
      />
      {!hasNumbers ? (
        <div className="kd-empty">مقدار عددی از برگه آزمایش استخراج نشد.</div>
      ) : (
        <div className="kd-rows">
          {shown.map((g) => (
            <div key={g.key} className="kd-group">
              <h3 className="kd-group__title">
                {g.title}
                {g.abnormal > 0 && <span className={`kd-tag kd-tag--${g.state}`}>{toFa(g.abnormal)} مورد</span>}
              </h3>
              {g.rows.map((t) => {
                const isSel = sel === t.id;
                const p = t.pos;
                const over = p != null && p > 1.5;
                const under = p != null && p < -0.5;
                return (
                  <React.Fragment key={t.id}>
                    <button type="button" className={`kd-row${isSel ? ' is-sel' : ''}`}
                      aria-expanded={isSel} onClick={() => setSel(isSel ? null : t.id)}
                      aria-label={`${t.name}: ${fmtNum(t.value)} ${t.unit}، ${t.label}`}>
                      <span className="kd-row__name">{t.name}</span>
                      <span className={`kd-track${p == null ? ' kd-track--none' : ''}`}>
                        <i className="kd-band kd-band--out" />
                        {p != null && (
                          <>
                            <i className="kd-band kd-band--ref" style={{ left: `${axis(0)}%`, width: `${axis(1) - axis(0)}%` }} />
                            <i className="kd-band kd-band--mid" style={{ left: `${axis(0.25)}%`, width: `${axis(0.75) - axis(0.25)}%` }} />
                          </>
                        )}
                        <b className={`kd-val kd-val--${t.state}`} style={{ left: `${p == null ? 50 : axis(p)}%` }}>
                          {over && '▲'}{under && '▼'}{fmtNum(t.value)}{t.corrected && '*'}
                        </b>
                      </span>
                    </button>
                    {isSel && (
                      <div className="kd-row__detail">
                        <span>مرجع: <bdi className="kd-ltr">{t.rangeText}</bdi> <bdi className="kd-ltr">{t.unit}</bdi></span>
                        <span className={`kd-text--${t.state}`}>{t.label}</span>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          ))}
        </div>
      )}
      {hasNumbers && shown.some((g) => g.rows.some((r) => r.corrected)) && (
        <ul className="kd-footnote">
          {shown.flatMap((g) => g.rows).filter((r) => r.corrected).map((r) => (
            <li key={r.id}>* {r.name}: روی برگهٔ شما <bdi className="kd-ltr">{fmtNum(r.corrected.measured)}</bdi> است — عددِ نوار {r.corrected.why}.</li>
          ))}
        </ul>
      )}
      {/* P135-3: ردیفِ خوانده‌شده‌ای که موتور نمی‌شناسد (۱٬۲۵-دی‌هیدروکسی ویتامین D) در هیچ شمارشی نبود؛ بیمار ۲۳ از ۲۴ را می‌دید. */}
      {!focus && unread.length > 0 && (
        <p className="kd-footnote">
          {toFa(unread.length)} مورد دیگر هم از برگه خوانده شد که این سامانه تفسیرش نمی‌کند و در شمارش بالا نیست:{" "}
          {unread.map((n, i) => <React.Fragment key={i}>{i > 0 && "، "}<bdi>{n}</bdi></React.Fragment>)} — مقدارش را با پزشک بررسی کنید.
        </p>
      )}
      {hasNumbers && !focus && total > LIMIT && (
        <button type="button" className="kd-more" onClick={() => setExpanded((e) => !e)}>
          {expanded ? 'نمایش کمتر' : `نمایش بیشتر (${toFa(total - shownCount)})`}
        </button>
      )}
    </section>
  );
}

/* ---------- Radar: system scores ---------- */

function RadarCard({ id, systems, overall, score, urgency, focusKey, onSelect }) {
  const scored = systems.filter((s) => s.score != null);
  const n = scored.length;
  const R = 29;
  const pt = (i, r) => {
    const a = (i / n) * Math.PI * 2;
    return [50 + r * Math.sin(a), 50 - r * Math.cos(a)];
  };
  const poly = scored.map((s, i) => pt(i, (R * s.score) / 100).join(',')).join(' ');
  const overallTone = urgency === 'emergency'
    ? scoreTone(overall, true)
    : (score?.band && BAND_TONE[score.band]) || scoreTone(overall, false);
  const reason = score?.reason;
  const why = reason === 'one_system'
    ? NO_SCORE_FA.one_system(scored.map((s) => s.title).join('، '))
    : reason ? NO_SCORE_FA[reason] : null;
  const worstFa = (s) => (s.worst?.name ? `پایین‌ترین: ${s.worst.name}` : null);

  return (
    <section className="kd-card kd-radar" id={id}>
      <CardHead
        title="خلاصهٔ دستگاه‌های بدن"
        info="عددِ مرور از حکمِ موتور ساخته می‌شود: در محدوده کامل، هرچه دورتر از محدوده (برحسبِ پهنای همان محدوده) کمتر، و هرگز بیشتر از درجهٔ شدت (CTCAE) اگر موتور داده باشد. آزمایش‌های هم‌خانواده (مثل PT و INR) یک‌بار شمرده می‌شوند. دستگاهی که یافته‌ای با فوریتِ مشخص دارد از سقفِ همان فوریت بالاتر نمی‌رود. عددِ کل میانگینِ وزنیِ دستگاه‌هاست و بیش از ۳۰ واحد از ضعیف‌ترین دستگاه بالاتر نمی‌رود. در برگهٔ اورژانسی عددی نشان داده نمی‌شود. این عدد برای مرورِ سریع است، جای نظرِ پزشک را نمی‌گیرد و اعتبارسنجیِ بالینی نشده است."
      />
      {why && n > 0 && <p className="kd-countline kd-countline--why">{why}</p>}
      {n >= RADAR_MIN_SYSTEMS ? (
        <div className="kd-radar__plot">
          <svg viewBox="0 0 100 100" aria-hidden="true">
            {[0.25, 0.5, 0.75].map((k) => (
              <circle key={k} cx="50" cy="50" r={R * k} className="kd-radar__ring" />
            ))}
            <circle cx="50" cy="50" r={R} className="kd-radar__ring kd-radar__ring--outer" />
            {scored.map((s, i) => {
              const [x, y] = pt(i, R);
              return <line key={s.key} x1="50" y1="50" x2={x} y2={y} className="kd-radar__spoke" />;
            })}
            <polygon points={poly} className="kd-radar__area" />
            {scored.map((s, i) => {
              const [x, y] = pt(i, (R * s.score) / 100);
              return <circle key={s.key} cx={x} cy={y} r="1.1" className={`kd-radar__dot kd-tone-${scoreTone(s.score, s.critical)}`} />;
            })}
          </svg>
          {overall != null && (
            <div className="kd-radar__center">
              <b className={`kd-tone-${overallTone}`}>{toFa(overall)}</b>
              <span>مرورِ سریع</span>
              {/* P97-ب: واژهٔ وضعیت کنارِ رنگ — خوانا برای کوررنگی و چاپِ سیاه‌وسفید (WCAG 1.4.1) */}
              <small className={`kd-toneword kd-tone-${overallTone}`}>{TONE_WORD[overallTone]}</small>
            </div>
          )}
          {scored.map((s, i) => {
            const a = (i / n) * Math.PI * 2;
            const [x, y] = pt(i, R + 4);
            const tone = scoreTone(s.score, s.critical);
            const w = worstFa(s);
            return (
              <button type="button" key={s.key}
                className={`kd-axislabel${focusKey === s.key ? ' is-focus' : ''}`}
                style={{
                  left: `${x}%`, top: `${y}%`,
                  transform: `translate(${-50 + 50 * Math.sin(a)}%, ${-50 - 50 * Math.cos(a)}%)`,
                }}
                aria-pressed={focusKey === s.key}
                aria-label={`${s.title}: امتیاز ${toFa(s.score)} از ۱۰۰، ${TONE_WORD[tone]}${w ? `، ${w}` : ''}. نمایش آزمایش‌ها`}
                onClick={() => onSelect(s.key)}>
                <span>{s.title}</span>
                <b className={`kd-tone-${tone}`}>{toFa(s.score)}</b>
                <small className={`kd-toneword kd-tone-${tone}`}>{TONE_WORD[tone]}</small>
                {w && <small className="kd-worst">{w}</small>}
              </button>
            );
          })}
        </div>
      ) : n > 0 ? (
        <>
          {overall != null && (
            <p className="kd-overall">
              <b className={`kd-tone-${overallTone}`}>{toFa(overall)}</b> <span>مرورِ سریع از ۱۰۰</span>{" "}
              <small className={`kd-toneword kd-tone-${overallTone}`}>{TONE_WORD[overallTone]}</small>
            </p>
          )}
          <ul className="kd-scorebars">
            {scored.map((s) => {
              const tone = scoreTone(s.score, s.critical);
              const w = worstFa(s);
              return (
                <li key={s.key}>
                  <span>{s.title}{w && <small className="kd-worst">{w}</small>}</span>
                  <i><em className={`kd-bgtone-${tone}`} style={{ width: `${s.score}%` }} /></i>
                  <b className={`kd-tone-${tone}`}>{toFa(s.score)}</b>
                  <small className={`kd-toneword kd-tone-${tone}`}>{TONE_WORD[tone]}</small>
                </li>
              );
            })}
          </ul>
        </>
      ) : overall != null ? (
        // سرورِ قدیمی (بی‌score.systems): فقط عددِ کل، بی‌فرمولِ محلی
        <p className="kd-overall"><b className={`kd-tone-${overallTone}`}>{toFa(overall)}</b> <span>مرورِ سریع از ۱۰۰</span></p>
      ) : (
        <div className="kd-empty">{why ?? 'برای محاسبهٔ امتیاز، آزمایش با محدودهٔ مرجع لازم است.'}</div>
      )}
    </section>
  );
}

/* ---------- Insights ---------- */
function InsightsCard({ items }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, 3);
  return (
    <section className="kd-card kd-list" id="summary-card">
      <CardHead
        title={<span className="kd-withicon"><SparkI /> نکات {BRAND_FA}</span>}
        aside={items.length > 3 && (
          <button type="button" className="kd-linkbtn" onClick={() => setAll((v) => !v)}>
            {all ? 'بستن' : 'مشاهده همه'}
          </button>
        )}
      />
      <ul className="kd-items">
        {shown.map((it, i) => (
          <li key={i} className="kd-item">
            <span className={`kd-item__icon kd-item__icon--${it.tone}`}>
              {it.tone === 'good' ? <ArrowCircleI up /> : it.tone === 'warn' ? <WarnI /> : <ArrowCircleI up={it.dir !== 'low'} />}
            </span>
            <span className="kd-item__body">
              <b>{it.title}</b>
              <small>{it.text}</small>
            </span>
          </li>
        ))}
        {!shown.length && <li className="kd-item kd-item--empty">نکته‌ای برای نمایش نیست.</li>}
      </ul>
    </section>
  );
}

/* ---------- Trend (فقط با تاریخچهٔ واقعی) ---------- */
function TrendCard({ id, uid, points, urgency, why }) {
  const [ref, w] = useWidth();
  const [hover, setHover] = useState(null);
  if (!points.length) {
    return (
      <section className="kd-card kd-trend" id={id}>
        <CardHead title="روند امتیاز" sub="امتیازِ هر نوبت آزمایش، از ۰ تا ۱۰۰" />
        <div className="kd-empty">{why ?? 'برای نمایشِ روند، امتیازِ این برگه لازم است.'}</div>
      </section>
    );
  }
  const H = 230;
  const pad = { l: 34, r: 16, t: 16, b: 34 };
  const timed = points.length > 0 && points.every((p) => isFinite(Date.parse(p.date)));
  const ts = points.map((p, i) => (timed ? Date.parse(p.date) : i));
  const tmin = Math.min(...ts);
  const tmax = Math.max(...ts);
  const innerL = pad.l + 22;
  const innerR = Math.max(innerL + 10, w - pad.r - 22);
  const x = (i) => (tmax === tmin ? (innerL + innerR) / 2 : innerL + ((ts[i] - tmin) / (tmax - tmin)) * (innerR - innerL));
  const y = (v) => pad.t + (1 - v / 100) * (H - pad.t - pad.b);
  const cur = points[points.length - 1];
  const prev = points.length > 1 ? points[points.length - 2] : null;
  const change = prev && prev.score ? Math.round(((cur.score - prev.score) / prev.score) * 100) : null;
  const label = (p) => (p.date ? fmtDate(p.date, { year: 'numeric', month: 'short', day: 'numeric' }) : 'این آزمایش');
  const xs = points.map((_, i) => x(i));
  const minGap = Math.min(...xs.slice(1).map((v, i) => v - xs[i]), Infinity);
  const every = minGap < 70 ? Math.ceil(70 / Math.max(minGap, 1)) : 1;
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)} ${y(p.score)}`).join(' ');
  const area = points.length > 1 ? `${line} L${x(points.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z` : '';
  const hp = hover != null ? points[hover] : null;

  return (
    <section className="kd-card kd-trend" id={id}>
      <CardHead
        title="روند امتیاز"
        sub="امتیازِ هر نوبت آزمایش، از ۰ تا ۱۰۰"
        aside={<span className="kd-legend"><i />امتیازِ شما</span>}
        info="امتیازِ هر نوبت با همان روشِ این برگه محاسبه می‌شود. وقتی آزمایش‌های نوبت‌ها یکسان نباشند، مقایسه تقریبی است. این تاریخچه فقط روی همین دستگاه ذخیره می‌شود و فقط تاریخ و امتیاز دارد، نه مقدارِ آزمایش‌ها."
      />
      <div className="kd-trend__body">
        <div className="kd-trend__plot" ref={ref}>
          {cur && w > 0 && (
            <svg width={w} height={H} role="img"
              aria-label={`روند امتیاز: ${points.map((p) => `${label(p)} ${toFa(p.score)}`).join('، ')}`}>
              <defs>
                <linearGradient id={`${uid}-area`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="var(--kd-blue)" stopOpacity=".28" />
                  <stop offset="1" stopColor="var(--kd-blue)" stopOpacity=".06" />
                </linearGradient>
              </defs>
              {[0, 25, 50, 75, 100].map((v) => (
                <g key={v}>
                  <line x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} className={`kd-gridline${v === 0 ? ' kd-gridline--base' : ''}`} />
                  <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" className="kd-tick">{toFa(v)}</text>
                </g>
              ))}
              {area && <path d={area} fill={`url(#${uid}-area)`} />}
              {points.length > 1 && <path d={line} className="kd-trend__line" />}
              {points.map((p, i) => (
                <g key={i}>
                  {(i % every === 0 || i === points.length - 1) && (
                    <text x={x(i)} y={H - 10} textAnchor="middle" className={`kd-tick${p.current ? ' is-cur' : ''}`}>{label(p)}</text>
                  )}
                  <circle cx={x(i)} cy={y(p.score)} r={p.current ? 6 : 4.5}
                    className={`kd-trend__pt${p.current ? ' is-cur' : ''}`}
                    tabIndex={0} role="button" aria-label={`${label(p)}: ${toFa(p.score)}`}
                    onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(i)} onBlur={() => setHover(null)} />
                </g>
              ))}
            </svg>
          )}
          {hp && (
            <span className="kd-tip" style={{ left: x(hover), top: y(hp.score) - 42 }}>
              {label(hp)}: <b>{toFa(hp.score)}</b>
            </span>
          )}
        </div>
        <div className="kd-stats">
          <div className="kd-stat kd-stat--main">
            <b className={`kd-tone-${scoreTone(cur?.score, urgency === 'emergency')}`}>{cur ? toFa(cur.score) : '—'}</b>
            <span>امتیازِ این برگه</span>
          </div>
          <div className="kd-stat">
            <b>{prev ? toFa(prev.score) : '—'}</b>
            <span>{prev ? `نوبتِ قبل (${label(prev)})` : 'نوبتِ قبل'}</span>
          </div>
        </div>
      </div>
      <p className="kd-trend__note">
        <SparkI />
        {change == null ? (
          <span>با ثبتِ آزمایش‌های بعدی، تغییرِ امتیاز اینجا نشان داده می‌شود.</span>
        ) : change === 0 ? (
          <span>امتیازِ شما نسبت به نوبتِ قبل <b>تغییری نکرده</b> است.</span>
        ) : (
          <span>
            امتیازِ شما نسبت به نوبتِ قبل{' '}
            <b className={change > 0 ? 'kd-tone-good' : 'kd-tone-warn'}>
              {toFa(Math.abs(change))}٪ {change > 0 ? 'بالاتر' : 'پایین‌تر'}
            </b>{' '}
            است.
          </span>
        )}
      </p>
    </section>
  );
}

/* ==========================================================================
   Icons (stroke, currentColor)
   ========================================================================== */
const Ico = ({ children, size = 22, sw = 1.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const HomeI = () => <Ico><path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" /></Ico>;
const DropI = () => <Ico><path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5z" /><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5" /></Ico>;
const TrendI = () => <Ico><path d="M4 4v16h16" /><path d="m7 15 4-5 3 3 5-6" /></Ico>;
const ScanI = () => <Ico><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><path d="M8 12h2l1.5-3 2 6 1.5-3h1" /></Ico>;
const FileI = () => <Ico><path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z" /><path d="M14 3v4h4M12 11v6m-2.5-2.5L12 17l2.5-2.5" /></Ico>;
const DownloadI = () => <Ico size={18}><path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5M5 19h14" /></Ico>;
const InfoI = () => <Ico size={20}><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><circle cx="12" cy="7.8" r=".6" fill="currentColor" /></Ico>;
const SparkI = () => <Ico size={20}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" /></Ico>;
const WarnI = () => (
  <Ico size={34} sw={2}>
    <path d="M12 3.8 21.2 19.5a.8.8 0 0 1-.7 1.2H3.5a.8.8 0 0 1-.7-1.2z" />
    <path d="M12 9.5v5" /><circle cx="12" cy="17.6" r=".7" fill="currentColor" />
  </Ico>
);
const ArrowCircleI = ({ up }) => (
  <Ico size={34} sw={2}>
    <circle cx="12" cy="12" r="9.5" />
    {up ? <path d="M12 16.5v-9m-4 4 4-4 4 4" /> : <path d="M12 7.5v9m-4-4 4 4 4-4" />}
  </Ico>
);
