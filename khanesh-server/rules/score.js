// ============================================================
// «امتیازِ این برگه» v2 — خلاصهٔ حسابیِ حکم‌های خودِ موتور (P97، بازطراحیِ specs/015، ۲۰۲۶-۱۰-۰۷).
//
// ⚠️ این‌جا هیچ آستانهٔ بالینیِ تازه‌ای نیست. ورودی فقط چیزی است که موتور از قبل گفته: بازهٔ graded،
//    جهت (`dir`)، درجهٔ CTCAE (`level`) و فوریتِ یافته‌ها. همهٔ عددهای این فایل (منحنیِ فاصله، ۰٫۶۵/۰٫۳۵،
//    وزنِ دستگاه‌ها، +۳۰، ۵ سطل / ۲ دستگاه، سقف‌ها) پیشنهادیِ پیاده‌کننده و بی‌اعتبارسنجی‌اند —
//    MEDICAL_RULES.md P97 «در انتظارِ بازبینی».
// ⚠️ چرا بازطراحی: نسخهٔ ۱ به هر ردیفِ خارج‌ازمحدودهٔ بی‌درجه ثابت ۰٫۵ می‌داد و سقفِ فوریت را روی کلِ برگه
//    می‌گذاشت؛ PT 14 + INR 1.2 روی برگهٔ کاملاً طبیعی ۷۵ می‌شد (روی برگهٔ بلندتر ~۵۰).
// ⚠️ فاصله برحسبِ «عرضِ بازه» است، نه نسبت به خودِ مرز: نسبت به مرز، pH 7.25 نمرهٔ ۰٫۹۹۷ می‌گرفت (بازهٔ ۷٫۳۵–۷٫۴۵).
// ⚠️ ورودیِ گراف و پرامپت نیست و به موتور برنمی‌گردد (N9، FR-013).
// ============================================================

import { isNeonate } from './refs.js';
import { faName } from './names.js';
import { ruleReads } from './patterns.js';

/** کفِ نمره به‌ازای درجهٔ موتور (CTCAE). */
export const POINTS = { normal: 1, near: 0.9, mild: 0.65, moderate: 0.4, marked: 0.15, critical: 0 };
/** نمرهٔ ردیفِ خارج‌ازمحدوده‌ای که نه بازهٔ دوطرفه دارد نه درجه — تنها جای ماندهٔ ۰٫۵. */
const NO_RANGE_NO_LEVEL = 0.5;

/** سقفِ نمره به‌ازای فوریت. emergency سراسری است؛ بقیه فقط روی دستگاهِ کلیدهای یافته (FR-010/FR-011). */
export const URGENCY_CAP = { emergency: 35, soon: 55, this_week: 75, routine: 90, none: 100 };
const SYSTEM_CAP_URGENCIES = new Set(['soon', 'this_week', 'routine']);

export const MIN_BUCKETS = 5;
export const MIN_SYSTEMS = 2;
const MEAN_W = 0.65, WORST_W = 0.35, WORST_SYSTEM_SLACK = 30;

/** هشت دستگاه، به همین ترتیب در خروجی. */
export const SYSTEMS = [
  { id: 'blood', fa: 'خون‌سازی', weight: 1.0 },
  { id: 'liver', fa: 'کبد', weight: 0.8 },
  { id: 'kidney', fa: 'کلیه', weight: 1.0 },
  { id: 'heart', fa: 'قلب', weight: 1.0 },
  { id: 'metabolic', fa: 'متابولیک و غدد', weight: 1.0 },
  { id: 'coag', fa: 'انعقاد', weight: 0.8 },
  { id: 'inflam', fa: 'التهاب و ایمنی', weight: 0.6 },
  { id: 'lytes', fa: 'الکترولیت و مواد معدنی', weight: 0.8 },
];

/** سطل = کلیدهای هم‌بسته که یک اندازه‌گیری حساب می‌شوند؛ نمره‌اش بدترینِ اعضا. */
const BUCKETS = {
  coag_time: ['PT', 'INR', 'APTT'],
  transaminase: ['AST', 'ALT'],
  bilirubin: ['BILI_T', 'BILI_D', 'BILI_I'],
  red_mass: ['HGB', 'HCT', 'RBC'],
  red_indices: ['MCV', 'MCH', 'MCHC'],
  rdw: ['RDW_CV', 'RDW_SD'],
  renal_n: ['CREAT', 'UREA', 'UREA_N'],
  atherogenic: ['LDL', 'CHOL', 'APOB'],
  troponin: ['TROPONIN_I', 'TROPONIN_T'],
  natriuretic: ['BNP', 'NTPROBNP'],
  glucose: ['GLU_F', 'GLU_RANDOM'],
  thyroxine: ['T4', 'FT4'],
  triiodo: ['T3', 'FT3'],
  iron_transport: ['IRON', 'TIBC', 'TSAT', 'TRANSFERRIN'],
  crp: ['CRP', 'CRP_Q'],
  brucella: ['WRIGHT', 'COOMBS_WRIGHT', 'ME2'],
  cortisol: ['CORTISOL_AM', 'CORTISOL_DST'],
  flc: ['KAPPA_FLC', 'LAMBDA_FLC'],
};

// ⚠️ جای‌گذاری‌های قضاوتی (P97، باز برای بازبین): CK/میوگلوبین ⇒ بیرون از امتیاز (P108، EXCLUDED)؛ آمیلاز/لیپاز ⇒ کبد؛ اسید-باز ⇒ الکترولیت؛
//    U_CA (ادرارِ ۲۴ساعته) ⇒ کلیه؛ B12/فولات ⇒ خون‌سازی؛ ویتامین D/PTH ⇒ مواد معدنی.
const SYSTEM_MEMBERS = {
  blood: ['red_mass', 'red_indices', 'rdw', 'iron_transport', 'flc', 'WBC', 'PLT', 'MPV', 'NEUT_ABS', 'LYMPH_ABS',
    'MONO_ABS', 'EOS_ABS', 'BASO_ABS', 'BAND_ABS', 'RETIC', 'FERRITIN', 'B12', 'FOLATE', 'HAPTO', 'LDH', 'HBA2', 'HBF'],
  liver: ['transaminase', 'bilirubin', 'ALP', 'GGT', 'ALB', 'TP', 'NH3', 'AMYLASE', 'LIPASE'],
  kidney: ['renal_n', 'ACR', 'U_CA'],
  heart: ['atherogenic', 'troponin', 'natriuretic', 'HDL', 'TG', 'CK_MB', 'HCY'],
  metabolic: ['glucose', 'thyroxine', 'triiodo', 'cortisol', 'GLU_2H', 'HBA1C', 'URIC', 'TSH', 'ANTI_TPO', 'PRL', 'TESTO'],
  coag: ['coag_time', 'FIB', 'DDIMER', 'ATIII', 'TT'],
  inflam: ['crp', 'brucella', 'ESR', 'PCT_SEPSIS', 'RF'],
  lytes: ['NA', 'K', 'CL', 'HCO3', 'CA', 'MG', 'PHOS', 'PH', 'OSM', 'LACTATE', 'PTH', 'VIT_D'],
};

/** کلیدِ موتور → { system, bucket }. نگهبان: score.test.js «SCORE_TABLE ∪ EXCLUDED …». */
export const SCORE_TABLE = (() => {
  const t = {};
  for (const [system, members] of Object.entries(SYSTEM_MEMBERS)) {
    for (const m of members) {
      for (const key of BUCKETS[m] ?? [m]) t[key] = { system, bucket: BUCKETS[m] ? m : key };
    }
  }
  return Object.freeze(t);
})();

/** کلیدهایی که عمداً در هیچ دستگاهی نیستند؛ در شمارش می‌آیند، در امتیاز نه. */
export const EXCLUDED = Object.freeze(Object.fromEntries(
  ['SEMEN_PH', 'SEMEN_VOL', 'SPERM_CONC', 'SPERM_MORPH', 'SPERM_MOT_PROG', 'SPERM_MOT_TOTAL']
    .map((k) => [k, 'تحلیلِ منی دربارهٔ کارِ یک دستگاهِ بدن حکمی نمی‌دهد'])
    // ۲۰۲۶-۱۰-۱۶ (P108): CK و میوگلوبین مالِ عضله‌اند نه قلب؛ CKِ ۳۵۷ِ پس از ورزش «قلب ۵۵» می‌ساخت. دستگاهِ عضله نداریم؛
    //   یافتهٔ CK (رابدومیولیز، ck_elevated_alone) هنوز از راهِ سقفِ فوریت در امتیاز می‌نشیند.
    .concat(['CK', 'MYOGLOBIN'].map((k) => [k, 'آنزیمِ عضله است، نه شاخصِ قلب؛ دستگاهِ عضله در امتیاز نیست']))
));

const RANGE_RE = /^(-?\d+(?:\.\d+)?)–(-?\d+(?:\.\d+)?)$/;
/** «lo–hi» (همان شکلِ adapter.js) ⇒ {lo, hi}؛ هر شکلِ دیگر (یک‌طرفه «≥ x»، null) ⇒ null. */
export function parseRange(range) {
  const m = RANGE_RE.exec(String(range ?? '').trim());
  return m ? { lo: Number(m[1]), hi: Number(m[2]) } : null;
}

const round3 = (x) => Math.round(x * 1000) / 1000;

/** نمرهٔ هر آزمایش ∈ [0,1] از حکمِ موتور. null = در امتیاز نمی‌آید. */
export function testPoints(g) {
  if (!g || g.mode === 'unknown') return null;
  if (!g.abnormal) return g.nearLimit ? POINTS.near : POINTS.normal;
  const r = parseRange(g.range);
  const v = Number(g.value);
  let p = null;
  // جهت از `dir` خودِ موتور (اصلِ II)، نه از مقایسه.
  if (r && r.hi > r.lo && Number.isFinite(v) && (g.dir === 'high' || g.dir === 'low')) {
    const d = g.dir === 'high' ? v - r.hi : r.lo - v;
    const relW = Math.max(0, d) / (r.hi - r.lo);
    p = 1 / (1 + relW * relW);
  }
  // ⚠️ ردیفِ ناهنجار هرگز بیشتر از «نزدیکِ مرز» (۰٫۹) نمی‌گیرد؛ وگرنه عبور از مرز امتیاز را *بالا* می‌برد
  //    (HbA2 3.4 نزدیکِ مرز ۰٫۹، ولی 3.54 بیرون ۱٫۰ می‌شد — بازبینیِ کد، FR-004).
  const outPts = Math.min(p ?? NO_RANGE_NO_LEVEL, POINTS.near);
  const floor = ['mild', 'moderate', 'marked', 'critical'].includes(g.level) ? POINTS[g.level] : null;
  return round3(floor != null ? Math.min(outPts, floor) : outPts);
}

const coreFa = (k) => faName(k).replace(/\s*\([^)]*\)\s*/g, ' ').trim();
const findingText = (f) => [f.headline, f.must_say, f.brief].filter((x) => typeof x === 'string').join(' ');
/** آیا متنِ یافته این کلید را نام می‌برد (نامِ فارسی، هستهٔ بی‌پرانتزش، یا خودِ کلید با مرزِ واژه)؟ */
function textNames(text, k) {
  if (!text) return false;
  const fa = faName(k), core = coreFa(k);
  if ((fa && fa !== k && text.includes(fa)) || (core && core !== k && core.length >= 2 && text.includes(core))) return true;
  return new RegExp(`(^|[^A-Za-z0-9_])${k}([^A-Za-z0-9_]|$)`).test(text);
}

/**
 * کلیدهای ناهنجاری که فوریتِ یک یافته سقفشان است (research R4).
 * ⚠️ `ruleReads` پویشِ توکن است و کلیدِ تک‌حرفی (K) یا کلیدی که از راهِ helper خوانده شود را نمی‌بیند (بازبینیِ کد:
 *    potassium_critical «K» را نمی‌خواند ⇒ پتاسیمِ soon بی‌سقف ماند و برگه ۹۶ گرفت). پس اجتماعِ سه نشانه:
 *    خواندنِ سورس، `uncovered`، و نام‌بردن در متنِ یافته. اگر باز هم هیچ کلیدِ graded‌ای پیدا نشد (مثلاً یافته
 *    دربارهٔ ردیفِ بی‌حکمِ unit_unknown است)، null برمی‌گردد ⇒ سقف روی کلِ برگه می‌نشیند (هرگز «بی‌سقف»).
 */
// specs/016 (research R3): همین تابع در rules/expert.js «محرک‌های یافته» را می‌سازد — یک منطقِ نسبت‌دهی، دو مصرف‌کننده.
export function findingKeys(f, abnormalKeys) {
  if (f.rule_id === 'unmatched_abnormal') return [...abnormalKeys];
  const reads = ruleReads(f.rule_id);
  for (const k of f.uncovered ?? []) reads.add(k);
  const text = findingText(f);
  const keys = [...abnormalKeys].filter((k) => reads.has(k) || textNames(text, k));
  return keys.length ? keys : null;
}

/**
 * @param engineOut خروجیِ runEngine
 * @param patternOut خروجیِ runPatterns (یا برای سازگاری، رشتهٔ overall_urgency)
 * قرارداد: specs/015-sheet-score-redesign/contracts/score-output.md
 */
export function healthScore(engineOut, patternOut) {
  const po = patternOut == null || typeof patternOut === 'string'
    ? { overall_urgency: patternOut ?? 'none', findings: [] }
    : patternOut;
  const urgency = po.overall_urgency ?? 'none';
  const graded = Array.isArray(engineOut?.graded) ? engineOut.graded : [];

  const points = {};
  const count = { scored: 0, out: 0, near: 0, levels: { mild: 0, moderate: 0, marked: 0, critical: 0 }, no_level: 0, excluded: 0, unread: 0 };
  const abnormalKeys = new Set();
  const critical = new Set();
  for (const g of graded) {
    const p = testPoints(g);
    if (p == null) continue;
    if (!SCORE_TABLE[g.test]) { count.excluded++; continue; }
    points[g.test] = p;
    count.scored++;
    // P97-ب: «لب‌مرز» = در محدوده ولی نزدیکِ لبه (پرچمِ خودِ موتور، نه آستانهٔ تازه). برای خطِ اولِ کارت.
    if (!g.abnormal && g.nearLimit) count.near++;
    if (g.abnormal) {
      count.out++;
      abnormalKeys.add(g.test);
      if (g.level in count.levels) count.levels[g.level]++;
      else count.no_level++;
      if (g.level === 'critical') critical.add(g.test);
    }
  }

  // ردیف‌هایی که موتور خواند ولی حکم نداد (بی‌واحد، بی‌محدوده، نامعلوم) — در شمارش گفته می‌شوند، نه پنهان.
  count.unread = (Array.isArray(engineOut?.unmapped) ? engineOut.unmapped.length : 0)
    + Object.keys(engineOut?.ungraded ?? {}).length;

  // سقفِ هر دستگاه از یافته‌های نمایش‌داده‌شده. findings فقط نمایش‌داده‌شده‌هاست؛ «یافتهٔ تکمیلی»ِ فشرده
  // (supplementary_ids) هم سقف نمی‌گذارد (FR-011). یافته‌ای که به هیچ کلیدِ graded نسبت داده نشد ⇒ سقفِ کلِ برگه.
  const supplementary = new Set(po.supplementary_ids ?? []);
  const sysCap = {};
  let sheetCap = urgency === 'emergency' ? URGENCY_CAP.emergency : 100;
  for (const f of po.findings ?? []) {
    if (!SYSTEM_CAP_URGENCIES.has(f?.urgency) || supplementary.has(f.rule_id)) continue;
    const keys = findingKeys(f, abnormalKeys);
    if (!keys) { sheetCap = Math.min(sheetCap, URGENCY_CAP[f.urgency]); continue; }
    for (const k of keys) {
      const s = SCORE_TABLE[k]?.system;
      if (s) sysCap[s] = Math.min(sysCap[s] ?? 100, URGENCY_CAP[f.urgency]);
    }
  }

  const bucketPts = {};
  for (const [k, p] of Object.entries(points)) {
    const b = SCORE_TABLE[k].bucket;
    bucketPts[b] = Math.min(bucketPts[b] ?? 1, p);
  }
  const neonate = engineOut?.age != null && isNeonate(engineOut.age);

  const systems = SYSTEMS.map(({ id, fa, weight }) => {
    const keys = Object.keys(points).filter((k) => SCORE_TABLE[k].system === id);
    const buckets = [...new Set(keys.map((k) => SCORE_TABLE[k].bucket))].map((b) => bucketPts[b]);
    const base = { id, fa, weight, keys, raw: null, cap: null, score: null, capped: false, critical: keys.some((k) => critical.has(k)), worst: null };
    if (!buckets.length || neonate) return base;
    const mean = buckets.reduce((a, b) => a + b, 0) / buckets.length;
    const raw = (MEAN_W * mean + WORST_W * Math.min(...buckets)) * 100;
    const cap = sysCap[id] ?? null;
    const worstKey = keys.reduce((w, k) => (w == null || points[k] < points[w] ? k : w), null);
    return {
      ...base,
      raw: Math.round(raw * 10) / 10,
      cap,
      score: Math.round(Math.min(raw, cap ?? 100)),
      capped: cap != null && raw > cap,
      worst: points[worstKey] < 1 ? { key: worstKey, name: faName(worstKey), points: points[worstKey] } : null,
    };
  });

  const covered = systems.filter((s) => s.score != null).map((s) => s.id);
  const nBuckets = Object.keys(bucketPts).length;
  const out = {
    version: 2, value: null, band: null, reason: null,
    cap: sheetCap < 100 ? sheetCap : null, capped: false,
    covered, systems, count, points,
    counted: count.scored,
    // P97-ب: کلیدهای عمداً بیرون از امتیاز (EXCLUDED) در مخرجِ «از چند تا» شمرده نمی‌شوند.
    total: Math.max(0, graded.length - count.excluded),
  };
  if (neonate) return { ...out, reason: 'neonate' };
  // P97-ب (۲۰۲۶-۱۰-۲۷): در اورژانس هیچ عددی داده نمی‌شود. «۳۵» کنارِ بنرِ ۱۱۵ دعوت به خواندنِ
  //   «۶۵٪ سالم» می‌کرد؛ پیامِ اورژانس را بنر می‌رساند و عدد در آن وضعیت هیچ اطلاعاتِ مفیدی ندارد.
  //   شمارش‌ها (count) می‌مانند تا کارت بتواند بگوید «۳ از ۸ در محدوده» و دستگاهِ بحرانی را نشان دهد.
  if (urgency === 'emergency') return { ...out, reason: 'emergency' };
  if (nBuckets < MIN_BUCKETS) return { ...out, reason: 'too_few' };
  if (covered.length < MIN_SYSTEMS) return { ...out, reason: 'one_system' };

  const scored = systems.filter((s) => s.score != null);
  const wSum = scored.reduce((a, s) => a + s.weight, 0);
  const wMean = scored.reduce((a, s) => a + s.weight * s.score, 0) / wSum;
  let v = Math.min(wMean, Math.min(...scored.map((s) => s.score)) + WORST_SYSTEM_SLACK);
  if (out.cap != null && v > out.cap) { v = out.cap; out.capped = true; }
  const value = Math.round(v);
  let band = value >= 85 ? 'high' : value >= 60 ? 'mid' : 'low';
  // ⚠️ برگه‌ای که یافتهٔ soon/this_week دارد هرگز «high» (سبز، «مطلوب») نمی‌شود، هرچند عددش بالا باشد:
  //    سقفِ هر دستگاه عمداً محلی است، ولی رنگِ «مطلوب» کنارِ «این هفته به پزشک» تناقض است (بازبینیِ کد، P97).
  if (band === 'high' && (urgency === 'soon' || urgency === 'this_week')) band = 'mid';
  // P97-ب: ردیفِ ارزیابی‌نشده (بی‌واحد/بی‌محدوده) هم «مطلوب» نمی‌سازد — عددِ خوانده‌نشده نه نرمال است نه بد،
  //   ولی ادعای «مطلوب» روی داده‌ای که نخوانده‌ایم همان سبزِ کاذب است. عدد می‌ماند، برچسب پایین می‌آید.
  if (band === 'high' && count.unread > 0) band = 'mid';
  return { ...out, value, band };
}
