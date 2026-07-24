// ============================================================
// LabMate — ارزیابی یکپارچه نتیجه
//
// سه مسیر، بر اساس ماهیت خودِ تست:
//
//   1. severity   — CTCAE v5 پوشش دارد → درجه‌بندی شدت (G1..G4)
//                   Hb, PLT, WBC, Neut, Lymph, Na, K, Ca, Mg, Glu,
//                   Alb, AST, ALT, ALP, GGT, Bili, Cr, CK, TG, Chol
//
//   2. classifier — تست دسته‌بند است، نه شدت‌سنج → برچسب معنایی
//                   MCV (میکرو/نورمو/ماکرو), MCH, Iron, ESR,
//                   Ferritin, TSAT, TSH
//
//   3. binary     — نه شدت دارد نه دسته → فقط داخل/خارج محدوده
//                   الگو تصمیم می‌گیرد، نه تک‌تست.
//                   HCT, RBC, PT, aPTT, Fib, D-dimer, ...
//
// اصل: هیچ عددی از خودمان درنمی‌آوریم.
// ============================================================

import { ctcaeGrade, CTCAE_MAP } from './ctcae.js';
import { classify, CLASSIFIERS } from './interpret.js';

export const MODE = { SEVERITY: 'severity', CLASSIFIER: 'classifier', BINARY: 'binary', UNKNOWN: 'unknown' };

const CTCAE_LEVEL = ['normal', 'mild', 'moderate', 'marked', 'critical'];

const FA = {
  normal:          'طبیعی',
  normal_high_end: 'طبیعی (نزدیک حد بالا)',
  normal_low_end:  'طبیعی (نزدیک حد پایین)',
  mild_high:       'کمی بالاتر از حد طبیعی',
  mild_low:        'کمی پایین‌تر از حد طبیعی',
  moderate_high:   'بالاتر از حد طبیعی',
  moderate_low:    'پایین‌تر از حد طبیعی',
  marked_high:     'خیلی بالاتر از حد طبیعی',
  marked_low:      'خیلی پایین‌تر از حد طبیعی',
  critical_high:   'بحرانی — خیلی بالا',
  critical_low:    'بحرانی — خیلی پایین',
  unknown:         'نامشخص',
};

/**
 * ارزیابی یک نتیجه.
 * @returns {{
 *   mode: 'severity'|'classifier'|'binary'|'unknown',
 *   abnormal: boolean,
 *   dir: 'high'|'low'|null,
 *   fa: string,             // آنچه در جدول نشان داده می‌شود
 *   tag: string|null,       // برچسب معنایی برای موتور قواعد
 *   patient: string|null,   // جمله‌ی بیمار-محور، اگر داشته باشد
 *   level: string|null,     // فقط در حالت severity
 *   ctcaeGrade: number|null,
 *   ctcaeTerm: string|null,
 *   source: string,
 *   note: string|null
 * }}
 */
export function evaluate(testKey, value, lln, uln) {
  if (value == null || lln == null || uln == null) {
    return { mode: MODE.UNKNOWN, abnormal: false, dir: null, fa: FA.unknown,
             tag: null, patient: null, level: null,
             ctcaeGrade: null, ctcaeTerm: null, source: '—', note: null };
  }

  const dir = value > uln ? 'high' : (value < lln ? 'low' : null);

  // ---------- مسیر ۱: CTCAE ----------
  const hasCtcae = CTCAE_MAP[testKey]?.[dir];
  if (hasCtcae) {
    if (!dir) {
      const range = uln - lln, m = 0.1 * range;
      const key = value > uln - m ? 'normal_high_end' : (value < lln + m ? 'normal_low_end' : 'normal');
      return { mode: MODE.SEVERITY, abnormal: false, dir: null, fa: FA[key],
               tag: 'normal', nearLimit: key !== 'normal', patient: null, level: 'normal',
               ctcaeGrade: 0, ctcaeTerm: null, source: 'CTCAE v5', note: null };
    }
    const c = ctcaeGrade(testKey, value, lln, uln);
    if (c && c.grade != null) {
      const level = CTCAE_LEVEL[c.grade];
      const key = c.grade === 0 ? 'normal' : `${level}_${dir}`;
      return { mode: MODE.SEVERITY, abnormal: c.grade > 0, dir, fa: FA[key],
               tag: c.grade > 0 ? level : 'normal', patient: null, level,
               ctcaeGrade: c.grade, ctcaeTerm: c.term,
               source: 'CTCAE v5', note: c.note };
    }
  }

  // ---------- مسیر ۲ و ۳: دسته‌بند / باینری ----------
  const cl = classify(testKey, value, lln, uln);
  if (cl) {
    return {
      mode: cl.kind === 'classifier' ? MODE.CLASSIFIER : MODE.BINARY,
      // باند صریحاً طبیعی (cl.normal) یا یکی از تگ‌های طبیعیِ قدیمی.
      // فهرست تگ‌ها برای سازگاری عقب‌رو می‌ماند؛ طبقه‌بندهای جدید normal:true بگذارند.
      abnormal: !(cl.normal === true || ['normal','normocytic','normochromic'].includes(cl.tag)),
      dir: cl.dir ?? dir,
      fa: cl.fa,
      tag: cl.tag,
      patient: cl.patient,
      level: null,
      ctcaeGrade: null, ctcaeTerm: null,
      source: cl.source,
      note: cl.note,
    };
  }

  // ---------- پیش‌فرض: باینری خام ----------
  if (!dir) {
    const range = uln - lln, m = 0.1 * range;
    const key = value > uln - m ? 'normal_high_end' : (value < lln + m ? 'normal_low_end' : 'normal');
    return { mode: MODE.BINARY, abnormal: false, dir: null, fa: FA[key],
             tag: 'normal', nearLimit: key !== 'normal', patient: null, level: null,
             ctcaeGrade: null, ctcaeTerm: null, source: 'محدوده مرجع', note: null };
  }
  return {
    mode: MODE.BINARY, abnormal: true, dir,
    fa: dir === 'high' ? 'بالاتر از حد طبیعی' : 'پایین‌تر از حد طبیعی',
    tag: `out_of_range_${dir}`, patient: null, level: null,
    ctcaeGrade: null, ctcaeTerm: null, source: 'محدوده مرجع', note: null,
  };
}

/** کدام مسیر برای این تست؟ */
export function modeOf(testKey) {
  if (CTCAE_MAP[testKey]) return MODE.SEVERITY;
  const c = CLASSIFIERS[testKey];
  if (c) return c.kind === 'classifier' ? MODE.CLASSIFIER : MODE.BINARY;
  return MODE.BINARY;
}

export function auditModes(keys) {
  const out = { severity: [], classifier: [], binary: [] };
  for (const k of keys) out[modeOf(k)].push(k);
  return out;
}

export { FA as GRADE_FA };
