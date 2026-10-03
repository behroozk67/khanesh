// ============================================================
// serology.js — specs/012 (P68): مسیریابی و خواندنِ سرولوژیِ ردیف ۱
// ------------------------------------------------------------
// VDRL/RPR، سرخجه IgG، کومبسِ غیرمستقیم، هلیکوباکتر پیلوری، Anti-Tg و TRAb/TSI.
// هم adapter.js (مسیریابی) و هم patterns_serology.js / قاعدهٔ thyroid (خواندن) از همین یک جا می‌خوانند
// تا «چه چیزی مثبت است» دو نسخه نداشته باشد (درسِ N3: دو تابع که یک عدد را می‌خوانند باید یک قاعده داشته باشند).
//
// ⚠️ C1 (تصمیمِ کاربر، ۲۰۲۶-۱۰-۰۳): این فایل هیچ آستانهٔ بالینی ندارد. سرخجه/Anti-Tg/TRAb فقط با مرز یا
//    بازهٔ *چاپ‌شده روی همان ردیف* یا واژهٔ آزمایشگاه سنجیده می‌شوند. عددی که چیزی برای مقایسه کنارش چاپ
//    نشده، یا مقایسه‌اش با مرزِ چاپ‌شده قطعی نیست («<20» در برابرِ «<4.1»، مقدارِ داخلِ منطقهٔ مرزیِ چاپ‌شده،
//    مقدارِ برابر با مرزِ اکید)، «تفسیر نشدند» می‌رود. حدهای پیشنهادی فقط در MEDICAL_RULES.md P68‌اند.
// ⚠️ N6: مقدارِ کیفی یک مجموعهٔ بستهٔ کلمه است و کلِ مقدار باید جور شود (qualState). «+/-»، Equivocal،
//    Borderline، Weakly reactive و هر چیزِ دیگری «نامشخص» است — هرگز مثبت، هرگز منفی.
// ============================================================
import { qualState } from "./patterns_utils.js";
import { parseReference } from "./units.js";

// کلیدِ نرمال‌شده (خروجیِ norm در adapter، یا normK در قاعده‌ها) — ZWNJ هم حذف می‌شود چون norm نگهش می‌دارد.
export const k0 = (key) => String(key).toLowerCase().replace(/[\s.\-_()/%#:‌]/g, "").replace(/[يی]/g, "ی");

// «H.P Ag» / «H.P Ab» (بازبینیِ کد): «hp» فقط وقتی پیشوند است که بلافاصله نوعِ آزمایش بیاید — تا «hp…»ِ دیگر نگیرد.
const HP_PREFIX = /^(hpylori|helicobacterpylori|helicobacter|هلیکوباکترپیلوری|هلیکوباکتر|hp(?=(ag|ab|igg|iga|igm|antigen|antibody|stool|sa)))/;

// ── ردیف‌هایی که عمداً خواننده ندارند → unmapped («تفسیر نشدند»)، نه qual (N28: کانالِ بی‌خواننده سکوت است) ──
const UNREAD_RE = [
  /^(anti)?(rubella|سرخجه)(igm|igmantibody|igmab|antibodyigm|abigm)?$/,   // IgM، یا سرخجهٔ بی‌نوع (IgG یا IgM؟)
  /^(hpylori|helicobacter|هلیکوباکتر|hp(?=(ag|ab|igg|iga|igm|antigen|antibody|stool|sa))).*(iga|igm)/,
  /^(directcoombs(test)?|coombsdirect(test)?|directantiglobulin(test)?|dat|dct|کومبسمستقیم)$/,
  /^(coombs(test)?|کومبس)$/,                                      // کومبسِ بی‌نوع: مستقیم؟ غیرمستقیم؟ رایت؟
];
const SYPH_RE = /^(vdrl|rpr)/;
const RUBELLA_IGG_RE = /^(anti)?(rubella|سرخجه)(igg|iggantibody|iggab|antibodyigg|abigg)$/;
const ICT_RE = /^(indirectcoombs(test)?|coombsindirect(test)?|indirectantiglobulin(test)?|iat|ict|antibodyscreen(ing)?(test)?|کومبسغیرمستقیم)$/;
const UBT_RE = /^(ubt|ureabreathtest|c13ubt|c14ubt|c13ureabreathtest|c14ureabreathtest|تستتنفسیاوره)$/;
const ANTI_TG_RE = /^(antitg|antitgab|antithyroglobulin|antithyroglobulinab|antithyroglobulinantibody|antithyroglobulinantibodies|tgab|tgantibody|thyroglobulinantibody|thyroglobulinab|atg|آنتیتیروگلوبولین|آنتیبادیضدتیروگلوبولین)$/;
const TRAB_RE = /^(trab|tsi|tbii|tshreceptorab|tshreceptorantibody|tshreceptorantibodies|tshrab|tshrantibody|thyroidstimulatingimmunoglobulin|thyroidstimulatingimmunoglobulins|antitshreceptor|antitshr|آنتیبادیگیرندهtsh)$/;
// خودِ تیروگلوبولین (نشانگرِ پیگیریِ سرطانِ تیروئید) — نه آنتی‌بادی‌اش. «Tg»ِ تنها عمداً این‌جا نیست: تری‌گلیسیرید است (N25).
const THYROGLOBULIN_RE = /^(thyroglobulin|serumthyroglobulin|tgthyroglobulin|تیروگلوبولین)$/;

export const isSyphilisKey = (key) => SYPH_RE.test(k0(key));
export const isRubellaIggKey = (key) => RUBELLA_IGG_RE.test(k0(key));
export const isIctKey = (key) => ICT_RE.test(k0(key));
export const isAntiTgKey = (key) => ANTI_TG_RE.test(k0(key));
export const isTrabKey = (key) => TRAB_RE.test(k0(key));
export const isThyroglobulinKey = (key) => THYROGLOBULIN_RE.test(k0(key));
export function isHpyloriKey(key) {
  const k = k0(key);
  return UBT_RE.test(k) || (HP_PREFIX.test(k) && !/(iga|igm)/.test(k));
}

/** نوعِ آزمایشِ هلیکوباکتر از روی نام: "active" (آنتی‌ژن مدفوع/تنفسی) | "serology" (آنتی‌بادی) | null (نامعلوم) */
export function hpyloriKind(key) {
  const k = k0(key);
  if (UBT_RE.test(k)) return "active";
  const rest = k.replace(HP_PREFIX, "");
  if (/^(ag|antigen|آنتیژن)|stool|fecal|faecal|feces|مدفوع|ubt|breath|تنفس/.test(rest)) return "active";
  if (/^(igg|ab|abigg|antibody|آنتیبادی|antibodyigg|iggantibody|iggab|serology|سرولوژی)$/.test(rest)) return "serology";
  return null;
}

const faDigits = (s) => String(s ?? "").replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));

/**
 * مقدارِ یک آزمایشِ سرولوژیِ کیفی (VDRL، کومبسِ غیرمستقیم، هلیکوباکتر).
 * @returns {{state:"pos"|"neg"|"unknown", titre:number|null}}
 * تیتر فقط از شکلِ «1:n» یا «1/n» خوانده می‌شود؛ عددِ تنها («8») تیتر فرض نمی‌شود.
 */
export function readSerologyValue(raw) {
  const s = faDigits(raw).trim();
  if (/^(nr|n\.r\.?)$/i.test(s)) return { state: "neg", titre: null };
  const q = qualState(s);
  if (q.state === "pos" || q.state === "neg") return { state: q.state, titre: null };
  const m = s.match(/^(?:(reactive|positive|pos|مثبت|واکنش[‌ ]?گر)\s*[,:(]?\s*)?1\s*[:/]\s*(\d+)\s*\)?$/i);
  if (m) return { state: "pos", titre: Number(m[2]) };
  return { state: "unknown", titre: null };
}

const GREY_RE = /equivocal|borderline|grey|gray|indeterminate|intermediate|مرزی|مشکوک|بینابینی/i;
const NUM = "([\\d.]+)";
const opOf = (s) => (s === ">" ? ">" : s === "<" ? "<" : s === "≤" || s === "<=" || s === "=<" ? "≤" : "≥");

/**
 * مرزهای چاپ‌شدهٔ یک ردیف که به «مثبت/ایمن» و «منفی/غیرایمن» برچسب خورده‌اند.
 * posWords مثلاً immune|positive، negWords مثلاً non-immune|negative. عملگر نگه داشته می‌شود (B3: «> 10» یعنی ۱۰ ایمن نیست).
 */
function labelledCuts(reference, posWords, negWords) {
  const s = faDigits(reference).replace(/‌/g, "").replace(/\s+/g, " ");
  const pick = (words, ops) => {
    const a = s.match(new RegExp(`(?<![a-z\\u0600-\\u06ff])(?<!non[\\s-])(?<!غیر ?)(${words})\\s*[:=]?\\s*(${ops})\\s*${NUM}`, "i"));
    if (a) return { op: opOf(a[2]), cut: Number(a[3]) };
    const b = s.match(new RegExp(`(${ops})\\s*${NUM}\\s*[a-zµ/%]*\\s*[:=(]?\\s*(?<!non[\\s-])(?<!غیر ?)(${words})(?![a-z])`, "i"));
    if (b) return { op: opOf(b[1]), cut: Number(b[2]) };
    return null;
  };
  return {
    pos: pick(posWords, "≥|>=|=>|>"),
    neg: pick(negWords, "≤|<=|=<|<"),
    grey: GREY_RE.test(s),
  };
}

const passes = (n, { op, cut }) => (op === ">" ? n > cut : op === "≥" ? n >= cut : op === "<" ? n < cut : n <= cut);

/**
 * مرزِ ایمنیِ چاپ‌شده روی ردیفِ سرخجه («Immune ≥ 10»، «> 10»، «Non-immune < 8, Equivocal 8-10, Immune > 10»).
 * @returns {{pos, neg, grey}|null}  null یعنی چیزی برای مقایسه چاپ نشده (C1 ⇒ عدد خوانده نمی‌شود).
 */
export function rubellaCut(reference) {
  if (reference == null) return null;
  const c = labelledCuts(reference, "immune|ایمن|positive|مثبت|reactive", "non[- ]?immune|nonimmune|غیر ?ایمن|negative|منفی|non[- ]?reactive");
  if (c.pos || c.neg) return c;
  // مرزِ بی‌برچسب («> 10»، «≥ 10») — یعنی ایمن از این بیشتر.
  const m = faDigits(reference).match(/^\s*(≥|>=|=>|>)\s*([\d.]+)\s*[a-zµ/]*\s*$/i);
  if (m) return { pos: { op: opOf(m[1]), cut: Number(m[2]) }, neg: null, grey: false };
  return null;
}

/**
 * سرخجه IgG: «immune» | «nonimmune» | «unknown».
 * واژهٔ آزمایشگاه، یا عدد در برابرِ مرزِ چاپ‌شدهٔ همان ردیف — با عملگرِ خودش (B3).
 * مقدارِ داخلِ منطقهٔ مرزیِ چاپ‌شده، یا برابر با مرزِ اکید ⇒ unknown («تفسیر نشدند»). Equivocal/مرزی ⇒ unknown
 * (CDC Pink Book: «equivocal test results should be considered negative» — تصمیمش با بازبین است، P68 پرسش ۲).
 */
export function rubellaRead(raw, reference) {
  const s = faDigits(raw).toLowerCase().replace(/‌/g, "").replace(/\s+/g, " ").trim();
  if (/^(immune|ایمن|positive|pos|reactive|مثبت|واکنش ?گر|detected)$/.test(s)) return { state: "immune", cut: null, n: null };
  if (/^(non[- ]?immune|nonimmune|not immune|غیر ?ایمن|negative|neg|non[- ]?reactive|nonreactive|منفی|not detected)$/.test(s)) return { state: "nonimmune", cut: null, n: null };
  const q = qualState(s);
  if (q.state !== "num") return { state: "unknown", cut: null, n: null };
  const c = rubellaCut(reference);
  if (!c) return { state: "unknown", cut: null, n: q.n };
  const shown = c.pos?.cut ?? c.neg?.cut ?? null;
  const out = (state) => ({ state, cut: shown, n: q.n });
  const { pos, neg } = c;
  if (q.cmp === "<" || q.cmp === "≤") {
    const negLine = neg ?? (pos ? { op: pos.op === ">" ? "≤" : "<", cut: pos.cut } : null);
    return negLine && q.n <= negLine.cut ? out("nonimmune") : out("unknown");
  }
  if (q.cmp === ">" || q.cmp === "≥") return pos && q.n >= pos.cut ? out("immune") : out("unknown");
  if (pos && passes(q.n, pos)) return out("immune");
  if (neg && passes(q.n, neg)) return out("nonimmune");
  // فقط مرزِ ایمنی چاپ شده و منطقهٔ مرزی اعلام نشده: زیرِ آن غیرایمن است — مگر دقیقاً روی مرزِ اکید (۱۰ با «> 10»).
  if (pos && !neg && !c.grey && q.n < pos.cut) return out("nonimmune");
  return out("unknown");
}

/**
 * مرزهای چاپ‌شدهٔ آنتی‌بادیِ تیروئید و حکمِ «بالا / در محدوده / نامعلوم».
 * «Positive > 1.75»، «>115 Positive»، «<115»، «0-115»، «Negative < 1.0, Equivocal 1.0-1.75, Positive > 1.75».
 * ⚠️ CR1: parseReference(«> 1.75») ⇒ {lo:1.75, hi:null} — برای این آنتی‌بادی‌ها «حدِ پایین» معنا ندارد؛ lo تنها همان مرزِ مثبت است.
 * ⚠️ B4: «<20» در برابرِ مرزِ ۴.۱ معلوم نیست بالاست ⇒ unknown، هرگز «بالا».
 */
export function abVerdict(value, cmp, reference, sexHint = null) {
  if (!reference) return "unknown";
  const c = labelledCuts(reference, "positive|reactive|مثبت", "negative|non[- ]?reactive|منفی");
  let pos = c.pos, neg = c.neg;
  if (!pos && !neg) {
    const pr = parseReference(reference, sexHint);
    if (!pr || (pr.lo == null && pr.hi == null)) return "unknown";
    if (pr.hi != null) neg = { op: "≤", cut: pr.hi };
    else pos = { op: ">", cut: pr.lo };
  }
  if (cmp === "<" || cmp === "≤") {
    const ceiling = neg?.cut ?? pos?.cut;
    return ceiling != null && value <= ceiling ? "within" : "unknown";
  }
  if (cmp === ">" || cmp === "≥") {
    const floor = pos?.cut ?? neg?.cut;
    return floor != null && value >= floor ? "above" : "unknown";
  }
  if (pos && neg) return passes(value, pos) ? "above" : passes(value, neg) ? "within" : "unknown";
  if (c.grey) return "unknown";   // منطقهٔ مرزی چاپ شده ولی فقط یک سرش برچسب دارد — حدس نمی‌زنیم
  if (pos) return passes(value, pos) ? "above" : "within";
  return passes(value, neg) ? "within" : "above";
}

/** واحدِ چاپ‌شده با همان شکلِ برگه (CR5): فیلدِ واحد، وگرنه دنبالهٔ متنیِ مقدار («250 IU/mL» ⇒ «IU/mL»). */
function printedUnit(t) {
  const u = String(t.unit ?? "").trim();
  if (u) return u;
  const tail = faDigits(t.value).trim().replace(/^[<>≤≥]?\s*[\d.,]+\s*/, "").trim();
  return tail || null;
}

/**
 * مسیریابیِ یک ردیف در adapter. ورودی: کلیدِ نرمال‌شده و ردیفِ خام.
 * @returns null (سرولوژیِ specs/012 نیست) | {to:"qual"} | {to:"unmapped"} |
 *          {to:"assay", key, value, cmp, unit, state:"above"|"within", raw, reference}
 */
export function routeSerology(key, t, sexHint = null) {
  const k = k0(key);
  if (UNREAD_RE.some((re) => re.test(k))) return { to: "unmapped" };

  if (SYPH_RE.test(k) || ICT_RE.test(k)) {
    return readSerologyValue(t.value).state === "unknown" ? { to: "unmapped" } : { to: "qual" };
  }
  if (isHpyloriKey(k)) {
    if (!hpyloriKind(k)) return { to: "unmapped" };
    return readSerologyValue(t.value).state === "unknown" ? { to: "unmapped" } : { to: "qual" };
  }
  if (RUBELLA_IGG_RE.test(k)) {
    return rubellaRead(t.value, t.reference).state === "unknown" ? { to: "unmapped" } : { to: "qual" };
  }
  const abKey = ANTI_TG_RE.test(k) ? "ANTI_TG" : TRAB_RE.test(k) ? "TRAB" : null;
  if (abKey) {
    const q = qualState(faDigits(t.value));
    if (q.state === "pos" || q.state === "neg") return { to: "qual" };
    if (q.state !== "num") return { to: "unmapped" };
    const state = abVerdict(q.n, q.cmp, t.reference, sexHint);
    if (state === "unknown") return { to: "unmapped" };
    // N5: عدد همان‌طور که چاپ شده نقل می‌شود («3.0»، نه «3»).
    const shown = (faDigits(t.value).trim().match(/^[<>≤≥]?\s*[\d.,]+/) ?? [String(q.n)])[0].replace(/\s+/g, "");
    return { to: "assay", key: abKey, value: q.n, cmp: q.cmp, shown, unit: printedUnit(t), state, raw: String(t.value).trim(), reference: String(t.reference) };
  }
  return null;
}

/** وضعیتِ یک آنتی‌بادیِ تیروئید (Anti-Tg یا TRAb) روی برگه: absent | above | within | pos | neg */
export function thyroidAbState(e, which) {
  const key = which === "ANTI_TG" ? "ANTI_TG" : "TRAB";
  const re = which === "ANTI_TG" ? ANTI_TG_RE : TRAB_RE;
  const u = e.ungraded?.[key];
  if (u?.reason === "assay_printed") {
    return { state: u.state, value: u.value, cmp: u.cmp, shown: u.shown, unit: u.unit, reference: u.reference, raw: u.raw };
  }
  const row = Object.entries(e.qual ?? {}).find(([name]) => re.test(k0(name)));
  if (row) {
    const q = qualState(row[1]);
    if (q.state === "pos") return { state: "pos", raw: String(row[1]).trim(), name: row[0] };
    if (q.state === "neg") return { state: "neg", raw: String(row[1]).trim(), name: row[0] };
  }
  return { state: "absent" };
}
