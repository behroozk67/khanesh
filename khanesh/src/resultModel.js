// ============================================================
// مدلِ مشترکِ «نتیجه» — یک منبع برای داشبورد (ResultDashboard.jsx) و گزارشِ چاپی (ResultReport.jsx).
//
// ⚠️ چرا جدا شد: گزارشِ PDF و داشبورد باید یک ردیف، یک برچسب و یک امتیاز را ببینند. اگر این
//    توابع در دو فایل کپی می‌شدند، دو نسخه از یک سیاستِ نمایشی می‌ساختیم — همان کلاسی که
//    N8 و P111 را ساخت. هیچ فرمولِ بالینی اینجا نیست: هر عدد از `_engine` می‌آید و این
//    توابع فقط هندسه/برچسب می‌سازند.
// ============================================================

/* ---------------- number / text helpers ---------------- */
const FA = '۰۱۲۳۴۵۶۷۸۹';
const AR = '٠١٢٣٤٥٦٧٨٩';
export const toFa = (v) => String(v ?? '').replace(/[0-9]/g, (d) => FA[+d]);
export const toLatin = (s) =>
  String(s ?? '')
    .replace(/[۰-۹]/g, (d) => FA.indexOf(d))
    .replace(/[٠-٩]/g, (d) => AR.indexOf(d))
    .replace(/٫/g, '.');

/** عددِ بالینی: لاتین. */
export function fmtNum(n, maxDigits = 2) {
  if (n == null || !isFinite(n)) return '—';
  const abs = Math.abs(n);
  const d = abs >= 100 ? 0 : abs >= 10 ? Math.min(1, maxDigits) : maxDigits;
  return String(Number(n.toFixed(d)));
}

export const num = (v) => {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  const m = toLatin(v).replace(/(\d),(?=\d{3}(\D|$))/g, '$1').match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
};

export const defaultAsText = (v) =>
  v == null ? '' : typeof v === 'string' ? v : typeof v === 'number' ? String(v) : v.text ?? v.title ?? '';
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function fmtDate(d, opts = { year: 'numeric', month: 'short' }) {
  if (!d) return '';
  const t = Date.parse(d);
  if (!isFinite(t)) return toFa(String(d));
  try {
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', opts).format(new Date(t));
  } catch {
    return toFa(String(d));
  }
}

/* ---------------- reference-range parsing (فقط برای هندسهٔ نوار) ---------------- */
export function parseRangeText(raw) {
  const s = toLatin(raw).replace(/(\d),(?=\d{3}(\D|$))/g, '$1');
  const m = s.match(/(-?\d+(?:\.\d+)?)\s*(?:-|–|—|~|to|تا)\s*(-?\d+(?:\.\d+)?)/i);
  if (m) return { low: +m[1], high: +m[2] };
  const lt = s.match(/(?:<=|=<|<|≤|up to|کمتر از|زیر)\s*(-?\d+(?:\.\d+)?)/i);
  if (lt) return { low: null, high: +lt[1] };
  const gt = s.match(/(?:>=|=>|>|≥|بیشتر از|بالای)\s*(-?\d+(?:\.\d+)?)/i);
  if (gt) return { low: +gt[1], high: null };
  return { low: null, high: null };
}

export function parseRange(t) {
  const r = t.range ?? t.ref ?? t.reference ?? t.ref_range;
  let low = num(t.low ?? t.ref_low ?? t.min);
  let high = num(t.high ?? t.ref_high ?? t.max);
  if (Array.isArray(r)) {
    low = num(r[0]);
    high = num(r[1]);
  } else if (r && typeof r === 'object') {
    low = num(r.low ?? r.min ?? r.lower ?? r.from);
    high = num(r.high ?? r.max ?? r.upper ?? r.to);
    if (low == null && high == null && r.text) return parseRangeText(r.text);
  } else if (typeof r === 'string' || typeof r === 'number') {
    const p = parseRangeText(String(r));
    if (p.low != null) low = p.low;
    if (p.high != null) high = p.high;
  }
  return { low, high };
}

/** 0 = کفِ محدوده، 1 = سقفِ آن. */
export function position(v, low, high) {
  if (v == null) return null;
  if (low != null && high != null && high > low) return (v - low) / (high - low);
  if (high != null && low == null) return high > 0 ? v / high : null;
  if (low != null && high == null) {
    if (low <= 0) return null;
    return v < low ? v / low - 1 : Math.min(1, (v - low) / low);
  }
  return null;
}

/** حالتِ هر ردیف: فقط از حکمِ موتور (abnormal/dir/level)؛ موقعیتِ عدد فقط وقتی موتور حکمی نداده. */
export function flagInfo(t) {
  let abnormal = typeof t.abnormal === 'boolean' ? t.abnormal : null;
  let dir = t.dir === 'high' || t.dir === 'low' ? t.dir : null;
  let critical = t.critical === true || t.level === 'critical';
  if (critical) abnormal = true;
  for (const raw of [t.flag, t.status, t.state, t.severity, t.direction]) {
    if (typeof raw !== 'string') continue;
    const x = raw.trim().toLowerCase();
    if (/^(hh|ll)$|critical|panic|بحرانی/.test(x)) { critical = true; abnormal = true; }
    if (/^(h|hh)$|high|بالا|↑|▲/.test(x)) { dir = dir ?? 'high'; abnormal = true; }
    if (/^(l|ll)$|low|پایین|↓|▼/.test(x)) { dir = dir ?? 'low'; abnormal = true; }
    if (/^(n|normal|ok)$|طبیعی|نرمال/.test(x) && abnormal == null) abnormal = false;
  }
  return { abnormal, dir, critical };
}

// ⚠️ N5: کلسیم/سدیمی که موتور گرید می‌کند ممکن است تصحیح‌شده باشد و روی کاغذِ بیمار نباشد.
//    عددِ برگه همیشه کنارِ عددِ تصحیح‌شده می‌آید (پیش‌تر در بخشِ «همهٔ آزمایش‌ها» بود).
export const CORRECTED = {
  CA: { flag: 'ca_correction_applied', measured: 'ca_measured', why: 'با آلبومینِ شما تصحیح شده' },
  NA: { flag: 'na_correction_applied', measured: 'na_measured', why: 'با قندِ بالای شما تصحیح شده' },
};
export function correctionOf(key, indices) {
  const c = CORRECTED[key];
  if (!c || !indices?.[c.flag] || indices[c.measured] == null) return null;
  return { measured: indices[c.measured], why: c.why };
}

export const STATE_RANK = { critical: 3, abnormal: 2, unknown: 1, normal: 0 };

export function normTest(t, i, asText, hasNumbers = true, indices = null) {
  const name = asText(t.name ?? t.title ?? t.label_fa) || `آزمایش ${toFa(i + 1)}`;
  const value = hasNumbers ? num(t.value ?? t.result) : null;
  const { low, high } = parseRange(t);
  // specs/019: ردیفِ بی‌حکمِ سرور (abnormal:null + verdict: بدون محدوده/ناخوانا/بین دو حد) را کلاینت از روی متنِ بازه حدس نمی‌زند —
  //   دومین خواننده‌ٔ همان بازه همان کلاسِ N12/N25 است. حالتش «unknown» می‌ماند و برچسب از `fa`ِ سرور می‌آید.
  const noVerdict = t.abnormal === null && typeof t.verdict === 'string';
  const pos = noVerdict ? null : position(value, low, high);
  const fl = flagInfo(t);
  let dir = fl.dir;
  if (!dir && fl.abnormal == null && pos != null) dir = pos > 1 ? 'high' : pos < 0 ? 'low' : null;
  const abnormal = fl.abnormal ?? (pos != null ? pos < 0 || pos > 1 : null);
  const state = fl.critical ? 'critical' : abnormal === true ? 'abnormal' : abnormal === false ? 'normal' : 'unknown';
  const rangeText =
    typeof t.range === 'string' && t.range.trim() ? t.range.trim()
      : low != null && high != null ? `${fmtNum(low)} تا ${fmtNum(high)}`
      : high != null ? `کمتر از ${fmtNum(high)}`
      : low != null ? `بیشتر از ${fmtNum(low)}`
      : '—';
  const label =
    asText(t.fa ?? t.label ?? t.interpretation ?? t.verdict ?? t.note) ||
    (state === 'critical' ? 'مقدار بحرانی'
      : dir === 'high' ? 'بالاتر از محدوده'
      : dir === 'low' ? 'پایین‌تر از محدوده'
      : state === 'normal' ? 'در محدوده مرجع' : 'بدون محدوده مرجع');
  const deviation = pos == null ? 0 : pos > 1 ? pos - 1 : pos < 0 ? -pos : 0;
  return {
    id: String(t.key ?? t.id ?? `${name}-${i}`),
    key: t.key ?? null,
    corrected: correctionOf(t.key, indices),
    name, value, unit: asText(t.unit), low, high, pos, dir, state, label, rangeText, deviation,
    raw: t,
  };
}

/* ---------------- امتیاز ----------------
   امتیازِ کل و نمرهٔ هر دستگاه هر دو از سرور می‌آیند (`_engine.score` v2، specs/015). فرانت فرمولی ندارد
   (پیش‌تر داشت و با سرور دو منبع برای یک عدد بود). دستگاه‌های امتیاز (۸ دستگاهِ سرور) از گروه‌های نمایشیِ
   فهرستِ آزمایش‌ها (testCategories) جدا هستند. سرورِ قدیمی (بی‌version) ⇒ فقط عددِ کل، بی‌دستگاه. */
export function scoreSystemsOf(score, all) {
  if (score?.version !== 2 || !Array.isArray(score.systems)) return [];
  return score.systems
    .filter((s) => s.score != null)
    .map((s) => {
      const rows = all.filter((r) => r.key != null && s.keys?.includes(r.key));
      const worstState = rows.reduce((w, r) => (STATE_RANK[r.state] > STATE_RANK[w] ? r.state : w), 'normal');
      return {
        key: `score-${s.id}`, title: s.fa, score: s.score, critical: !!s.critical, worst: s.worst ?? null,
        rows, state: s.critical ? 'critical' : worstState,
        abnormal: rows.filter((r) => r.state === 'abnormal' || r.state === 'critical').length,
      };
    });
}
/** رنگِ عددِ کل از `band`ِ سرور (برگهٔ soon/this_week هرگز «مطلوب» نیست)؛ سرورِ قدیمی ⇒ همان قاعدهٔ عددی. */
export const BAND_TONE = { high: 'good', mid: 'warn', low: 'warn' };
/** قرمز فقط برای اورژانس/بحرانی (قاعدهٔ پروژه)؛ بقیه کهربایی. */
export const scoreTone = (s, critical) => (s == null ? 'none' : critical ? 'bad' : s >= 85 ? 'good' : 'warn');

/* ---------------- body systems ---------------- */
export const SYS_TITLE = {
  thyroid: 'تیروئید', lipid: 'چربی خون', cardiac: 'قلب', cbc: 'شمارش خون', liver: 'کبد',
  glycemia: 'قند خون', iron: 'آهن و کم‌خونی', kidney: 'کلیه', electrolytes: 'الکترولیت‌ها',
  vitamins: 'ویتامین‌ها', inflammation: 'التهاب', urine: 'ادرار',
};
export function sysKey(k) {
  const s = String(k ?? '').toLowerCase();
  if (/lip|chol|چربی/.test(s)) return 'lipid';
  if (/thy|تیروئید/.test(s)) return 'thyroid';
  if (/liv|hepat|lft|کبد/.test(s)) return 'liver';
  if (/kid|ren|urea|cre|کلیه/.test(s)) return 'kidney';
  if (/gly|gluc|diab|sugar|قند/.test(s)) return 'glycemia';
  if (/cbc|hema|blood|خون/.test(s)) return 'cbc';
  if (/iron|ferr|آهن/.test(s)) return 'iron';
  if (/elec|lyte|الکترولیت/.test(s)) return 'electrolytes';
  if (/vit|ویتامین/.test(s)) return 'vitamins';
  if (/urin|ادرار/.test(s)) return 'urine';
  if (/card|heart|قلب/.test(s)) return 'cardiac';
  if (/infl|crp|esr|التهاب/.test(s)) return 'inflammation';
  return s || 'other';
}

// P139: رادار فقط با دست‌کم این تعداد دستگاه؛ کمتر ⇒ نوارِ هر دستگاه (مثلثِ سه‌محوره معنای مقایسه‌ای نداشت).
export const RADAR_MIN_SYSTEMS = 4;

export const NO_SCORE_FA = {
  too_few: 'آزمایشِ کافی برای امتیازِ کل نیست (دست‌کم ۵ اندازه‌گیریِ مستقل لازم است).',
  // P139: آستانه ۴ دستگاه (score.js MIN_SYSTEMS)؛ کلید همان one_system است.
  one_system: (names) =>
    `نمودار و امتیازِ کلیِ سلامت برای برگه‌ای ساخته می‌شود که دست‌کم چهار دستگاهِ بدن را پوشش دهد؛ این برگه فقط این‌ها را دارد: ${names}.`,
  neonate: 'برای نوزادِ زیرِ ۲۸ روز امتیاز نمی‌دهیم؛ محدوده‌های نوزادی هنوز کامل نیست.',
  // P97-ب: در اورژانس عدد داده نمی‌شود؛ «۳۵» کنارِ بنرِ ۱۱۵ به «۶۵٪ سالم» خوانده می‌شد.
  emergency: 'در این برگه یافتهٔ اورژانسی هست؛ در این وضعیت عدد نمی‌دهیم. دستورِ فوریِ بالای صفحه را دنبال کنید.',
};

export const TONE_WORD = { good: 'مطلوب', warn: 'نیاز به توجه', bad: 'نیازمند اقدام', none: 'بدون امتیاز' };

/* ---------------- متن‌های ثابتِ صفحه ----------------
   ⚠️ یک منبع برای هر جمله: صفحهٔ نتیجه و گزارشِ چاپی هر دو از همین‌ها می‌خوانند.
      دو نسخهٔ نزدیک‌به‌هم از یک جملهٔ بالینی همان کلاسی است که N12 را ساخت
      (متنِ بالینیِ فرانت بدونِ تورِ ایمنی). */

/** بنرِ اورژانسِ عمومیِ فرانت — وقتی سرور `critical_banner` ندارد. */
export const EMERGENCY_BANNER = {
  title: 'این نتیجه باید همین امروز دیده شود',
  body:
    'منتظر صبح نمانید — طبق دستورِ همین گزارش همین حالا به نزدیک‌ترین اورژانس بروید ' +
    'یا با ۱۱۵ تماس بگیرید و همین برگه را همراه ببرید. حتی اگر حالتان خوب است، این نتیجه را ' +
    'به فردا موکول نکنید.',
};

/** سلبِ مسئولیتِ ثابت و سمتِ کلاینت — هرگز از خروجیِ مدل خوانده نمی‌شود. */
export const DISCLAIMER_FA =
  'این تفسیر خودکار است و جای معاینهٔ پزشک را نمی‌گیرد. برای تصمیم درمانی حتماً با پزشک مشورت کنید.';
