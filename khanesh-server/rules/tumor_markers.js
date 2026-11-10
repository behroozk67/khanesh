// ─── تومورمارکرها (CEA، CA 125، CA 15-3، CA 19-9): خواندنِ بازهٔ چاپ‌شده + ردیفِ `_engine.tests` (specs/019) ───
//
// چرا فایلِ جدا: `units.parseReference`/`serology.abVerdict` برای *همهٔ* آزمایش‌ها یک بازه می‌خوانند و نه «اکید بودنِ <» را
// می‌شناسند و نه بازهٔ برچسب‌دار (سیگاری/غیرسیگاری) را؛ دست‌زدن به آن‌ها تست‌های بایت‌به‌بایتِ بی‌ربط را جابه‌جا می‌کند (N36).
// پس فقط کلیدهای TM_KEYS از این خواننده می‌گذرند (serology.assayRoute).
//
// ⚠️ اینجا هیچ آستانهٔ بالینی نیست و محدودهٔ پیش‌فرضی هم نیست. حکم فقط در برابرِ *بازهٔ چاپ‌شده روی همان ردیف* است (P77)؛
//    «اکید یا غیراکید» خواندنِ همان متنِ چاپ‌شده است، نه تصمیمِ بالینی.
// ⚠️ بازهٔ برچسب‌دار هرگز به نخستین بخشش کوتاه نمی‌شود: `cleanPrintedRef` پیش‌تر روی «/ ; | ،» می‌شکست و نخستین بخشِ قابل‌خواندن
//    (حدِ غیرسیگاری) را برمی‌گرداند ⇒ CEA ۷ بی‌صدا «بالا» می‌شد. اینجا برچسب‌ها روی *کلِ رشته* پیش از هر شکستن پیدا می‌شوند.
import { faName } from "./names.js";
import { parseReference } from "./units.js";

// specs/020 (P132): هفت کلیدِ P77 که پیش‌تر از abVerdict می‌گذشتند — آن خواننده «> N» را مرزِ مثبت‌شدنِ آنتی‌بادی می‌خواند
//   (نسبتِ Free PSA ۱۸٪ در برابرِ «> 25» ⇒ «داخل») و ردیفی در `_engine.tests` نمی‌ساخت. CALPROTECTIN عمداً نیست (تومورمارکر نیست).
export const TM_KEYS = new Set(["CEA", "CA125", "CA153", "CA199", "AFP", "B2M", "CALCITONIN", "CGA", "PSA_TOTAL", "PSA_FREE", "PSA_RATIO"]);

const norm = (s) => String(s ?? "")
  .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
  .replace(/٫/g, ".").replace(/‌/g, "")
  .replace(/(\d),(\d{3})(?!\d)/g, "$1$2").replace(/(\d),(\d)/g, "$1.$2")
  .toLowerCase().replace(/\s+/g, " ").trim();

const N = "(\\d+(?:\\.\\d+)?)";
// برچسبِ جمعیت پیش از عدد. «غیر سیگاری» پیش از «سیگاری» و «non smoker» پیش از «smoker» (چپ‌ترین تطابق می‌برد).
const LABEL_RE = /non[\s-]*smokers?|never[\s-]*smokers?|غیر\s*سیگاری(?:\s*ها)?|(?<![a-z])smokers?|سیگاری(?:\s*ها)?/g;
const labelKind = (s) => (/^(non|never|غیر)/.test(s) ? "nonsmoker" : "smoker");
// پیشوندهایی که بازه را به جمعیتِ دیگری می‌بندند (جنس/سن/بارداری/یائسگی): این‌جا خوانده نمی‌شوند.
const OTHER_POP_RE = /male|female|مرد|زن|child|infant|کودک|نوزاد|age|year|سال|post|pre|meno|trimester|pregnan|بارد/;
// برچسبِ جنس روی متنِ نرمال‌شده (حروفِ کوچک): male/female، men/women، «M:»/«F:»، مرد/زن.
const SEX_LABEL_RE = /(?<![a-z])(?:fe)?males?(?![a-z])|(?<![a-z])(?:wo)?men(?![a-z])|(?<![a-z])[mf]\s*:|مرد|زن/;

/** یک قطعهٔ بی‌برچسب → {lo, hi, loStrict, hiStrict} یا null. کلِ قطعه باید مصرف شود؛ عددِ اضافه ⇒ null. */
function parseOneBand(seg) {
  let s = ` ${seg} `.replace(/[()[\]:]/g, " ")
    .replace(/at or below|up to|upto|not more than|no more than|less than or equal to|less than or equal|<=|=<|≤/g, "≤")
    .replace(/at or above|greater than or equal to|more than or equal to|>=|=>|≥/g, "≥")
    .replace(/less than|below|under|کمتر از|</g, "<")
    .replace(/greater than|more than|above|over|بیشتر از|>/g, ">");
  const m = s.match(new RegExp(`^\\s*([a-z\\u0600-\\u06ff ]*?)\\s*(?:([≤<≥>])\\s*${N}|${N}\\s*(?:-|–|—|to|تا)\\s*${N})\\s*([a-zµμ%/ .]*)$`));
  if (!m || OTHER_POP_RE.test(m[1])) return null;
  if (m[2]) {
    const v = +m[3];
    return m[2] === "≤" ? { lo: null, hi: v, loStrict: false, hiStrict: false }
      : m[2] === "<" ? { lo: null, hi: v, loStrict: false, hiStrict: true }
        : m[2] === "≥" ? { lo: v, hi: null, loStrict: false, hiStrict: false }
          : { lo: v, hi: null, loStrict: true, hiStrict: false };
  }
  const lo = +m[4], hi = +m[5];
  return lo < hi ? { lo, hi, loStrict: false, hiStrict: false } : null;
}

/**
 * متنِ بازهٔ چاپ‌شده → { kind: "none"|"single"|"labelled"|"unreadable", bands }.
 *   none      : بازه‌ای چاپ نشده.
 *   single    : یک باند ({lo,hi,loStrict,hiStrict}).
 *   labelled  : دو باندِ سیگاری/غیرسیگاری، هر دو فقط کرانِ بالا، و حدِ غیرسیگاری < حدِ سیگاری.
 *   unreadable: چاپ شده ولی کامل خوانده نمی‌شود (برچسبِ ناقص، عددِ پیش از برچسب، باندِ متناقض) — به نخستین بخش کوتاه نمی‌شود.
 */
export function parseTmRange(text, sex = null) {
  const s = norm(text);
  if (!s || s === "undefined" || s === "null") return { kind: "none", bands: [] };
  const labels = [...s.matchAll(LABEL_RE)];
  if (labels.length) {
    const kinds = labels.map((m) => labelKind(m[0]));
    if (labels.length !== 2 || kinds[0] === kinds[1] || /\d/.test(s.slice(0, labels[0].index))) return { kind: "unreadable", bands: [] };
    const bands = labels.map((m, i) => {
      const end = i + 1 < labels.length ? labels[i + 1].index : s.length;
      const seg = s.slice(m.index + m[0].length, end).replace(/^[\s:]+/, "").replace(/[\s/;|،,]+$/, "");
      const b = parseOneBand(seg);
      // «0-5» و «< 5» هر دو «فقط سقف»اند (کفِ صفر برای یک نشانگرِ غیرمنفی معنایی ندارد).
      return b && (b.lo == null || b.lo === 0) && b.hi != null ? { ...b, lo: null, label: kinds[i] } : null;
    });
    if (bands.some((b) => !b)) return { kind: "unreadable", bands: [] };
    const ns = bands.find((b) => b.label === "nonsmoker"), sm = bands.find((b) => b.label === "smoker");
    return ns.hi < sm.hi ? { kind: "labelled", bands: [ns, sm] } : { kind: "unreadable", bands: [] };
  }
  // P132-الف: بازهٔ دارای برچسبِ جنس و جنسِ نامعلوم ⇒ حدس نه (parseReference حدِ مردانه را برمی‌داشت ⇒ زنِ بی‌جنس کم‌خوانده می‌شد).
  //   هر دو باند خوانده می‌شود؛ tmVerdict فقط وقتی حکم می‌دهد که هر دو یکی بگویند (۹ در برابرِ «M < 8.4 F < 5» ⇒ بالا؛ ۶ ⇒ نامعلوم).
  if (!sex && SEX_LABEL_RE.test(s)) return { kind: "sexed", bands: [], m: parseTmRange(text, "M"), f: parseTmRange(text, "F") };
  const one = parseOneBand(s);
  if (one) return { kind: "single", bands: [{ ...one, label: null }] };
  // قالب‌های دیگر که پیش‌تر خوانده می‌شدند (بازهٔ دوجنسی…) همان‌طور و غیراکید.
  const pr = parseReference(String(text), sex);
  if (pr && (pr.lo != null || pr.hi != null)) return { kind: "single", bands: [{ lo: pr.lo, hi: pr.hi, loStrict: false, hiStrict: false, label: null }] };
  // برگشتِ عمدی به رفتارِ `cleanPrintedRef` فقط وقتی هیچ برچسبِ جمعیتی در رشته نیست («0-35 U/mL (CA 125 II)» با جداکنندهٔ «/» در واحد):
  //   نخستین بخشِ قابل‌خواندن. با برچسبِ سیگاری/غیرسیگاری این مسیر هرگز نمی‌رسد (بالاتر unreadable برمی‌گردد).
  for (const part of s.split(/[/;|،]/)) {
    const b = parseOneBand(part.trim());
    if (b) return { kind: "single", bands: [{ ...b, label: null }] };
    const q = parseReference(part.trim(), sex);
    if (q && (q.lo != null || q.hi != null)) return { kind: "single", bands: [{ lo: q.lo, hi: q.hi, loStrict: false, hiStrict: false, label: null }] };
  }
  return { kind: "unreadable", bands: [] };
}

const above = (v, b) => b.hi != null && (b.hiStrict ? v >= b.hi : v > b.hi);
const below = (v, b) => b.lo != null && (b.loStrict ? v <= b.lo : v < b.lo);

/**
 * حکم: below | within | between | above | unknown.
 *   between فقط برای بازهٔ برچسب‌داری است که وضعیتِ سیگار معلوم نیست و عدد بالاتر از حدِ غیرسیگاری و در/زیرِ حدِ سیگاری است.
 *   مقدارِ سانسورشده («<0.5»، «>100»): فقط وقتی قطعی است حکم می‌دهد؛ وگرنه unknown (⇒ noref، بی‌ادعای بالا/پایین).
 */
export function tmVerdict(value, cmp, range) {
  if (range?.kind === "sexed") {
    const a = tmVerdict(value, cmp, range.m), b = tmVerdict(value, cmp, range.f);
    return a === b ? a : "unknown";
  }
  if (!range || (range.kind !== "single" && range.kind !== "labelled") || !Number.isFinite(value)) return "unknown";
  const [first, last] = [range.bands[0], range.bands[range.bands.length - 1]];
  if (cmp === "<" || cmp === "≤") return first.hi != null && value <= first.hi ? "within" : "unknown";
  if (cmp === ">" || cmp === "≥") {
    if (last.hi == null) return "unknown";
    return value > last.hi || (cmp === ">" && value >= last.hi) || (last.hiStrict && value >= last.hi) ? "above" : "unknown";
  }
  if (range.kind === "labelled") {
    const [ns, sm] = range.bands;
    return above(value, sm) ? "above" : above(value, ns) ? "between" : "within";
  }
  return above(value, first) ? "above" : below(value, first) ? "below" : "within";
}

const FA = {
  above: "بالاتر از محدودهٔ چاپ‌شده",
  below: "پایین‌تر از محدودهٔ چاپ‌شده",
  within: "داخلِ محدودهٔ چاپ‌شده",
  between: "بین حدِ غیرسیگاری و حدِ سیگاری — بسته به سیگاری بودن",
  noref: "محدودهٔ مرجع روی برگه چاپ نشده",
  unreadable: "محدودهٔ چاپ‌شده خوانده نشد",
};
const printed = (r) => !!r && String(r).trim() && String(r) !== "undefined";

/** حکمِ نمایشیِ یک ورودیِ ungraded: above|below|within|between|noref|unreadable، یا null اگر تومورمارکرِ چاپی نیست. */
export function tmVerdictOf(key, u) {
  if (!TM_KEYS.has(key) || u?.reason !== "assay_printed") return null;
  const verdict = u.state === "noref" ? (printed(u.reference) ? "unreadable" : "noref") : u.state;
  return verdict in FA ? verdict : null;
}
/** برچسبِ فارسیِ حکم + بازهٔ چاپ‌شده — نمای تخصصی (expert.js) همین را می‌خواند تا با نمای ساده دو روایت نشود. */
export function tmDisplay(key, u) {
  const verdict = tmVerdictOf(key, u);
  return verdict ? { verdict, fa: FA[verdict], range: printed(u.reference) ? String(u.reference).trim() : null } : null;
}

/**
 * ردیف‌های تومورمارکر به شکلِ اعضای `_engine.tests` (contracts/engine-tests-tumor-rows.md). فقط نمای نمایشی:
 * engineOut دست نمی‌خورد، پس score/phenoAge/urgency/has_critical همان می‌ماند. `abnormal: null` ⇒ «بی‌حکم»، نه «طبیعی» (Principle II).
 * @param {object} engineOut خروجی runEngine
 */
export function tumorMarkerRows(engineOut) {
  const rows = [];
  for (const [key, u] of Object.entries(engineOut?.ungraded ?? {})) {
    const verdict = tmVerdictOf(key, u);
    if (!verdict) continue;
    rows.push({
      key,
      name: faName(key),
      value: u.cmp ? u.shown : u.value,
      unit: u.unit ?? null,
      range: printed(u.reference) ? String(u.reference).trim() : null,
      refSource: "printed",
      abnormal: verdict === "above" || verdict === "below" ? true : verdict === "within" ? false : null,
      dir: verdict === "above" ? "high" : verdict === "below" ? "low" : null,
      fa: FA[verdict],
      level: null,
      ctcaeGrade: null,
      nearLimit: false,
      source: "tumor_marker_printed",
      verdict,
      // specs/020 (P132): فقط پرچم؛ abnormal/dir/fa/verdict دست نمی‌خورند. جمله در psa_result است.
      ...(key.startsWith("PSA_") && engineOut?.sex === "F" ? { sexMismatch: true } : {}),
    });
  }
  return rows;
}
