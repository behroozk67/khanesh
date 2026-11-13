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
import { qualState, qualVerdict } from "./patterns_utils.js";
import { parseReference } from "./units.js";
import { TM_KEYS, parseTmRange, tmVerdict } from "./tumor_markers.js";

// کلیدِ نرمال‌شده (خروجیِ norm در adapter، یا normK در قاعده‌ها) — ZWNJ هم حذف می‌شود چون norm نگهش می‌دارد.
// P112 (۲۰۲۶-۱۰-۲۳): ویرگولِ انگلیسی و فارسی هم جداکنندهٔ نام است، نه بخشی از آن — «Occult Blood, Stool» و
//   «Occult, Blood» همان ردیف‌اند. پیش‌تر کاما نگه داشته می‌شد و ردیف نه به الگو می‌رسید و نه به «تفسیر نشدندَش»
//   می‌رفت (N28: ردیفِ شناخته‌شدهٔ بی‌صدا). هیچ الگویی در AI_RE کاما ندارد، پس حذفش تحریفِ هویت نیست.
export const k0 = (key) => String(key).toLowerCase().replace(/[\s.\-_()/%#:‌,،]/g, "").replace(/[يی]/g, "ی");

// «H.P Ag» / «H.P Ab» (بازبینیِ کد): «hp» فقط وقتی پیشوند است که بلافاصله نوعِ آزمایش بیاید — تا «hp…»ِ دیگر نگیرد.
const HP_PREFIX = /^(hpylori|helicobacterpylori|helicobacter|هلیکوباکترپیلوری|هلیکوباکتر|hp(?=(ag|ab|igg|iga|igm|antigen|antibody|stool|sa)))/;

// ── ردیف‌هایی که عمداً خواننده ندارند → unmapped («تفسیر نشدند»)، نه qual (N28: کانالِ بی‌خواننده سکوت است) ──
const UNREAD_RE = [
  /^(anti)?(rubella|سرخجه)(igm|igmantibody|igmab|antibodyigm|abigm)?$/,   // IgM، یا سرخجهٔ بی‌نوع (IgG یا IgM؟)
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

// P109 (تصمیمِ کاربر ۲۰۲۶-۱۰-۱۶): IgM/IgAِ هلیکوباکتر پیش‌تر عمداً بی‌خواننده (unmapped) بود. حالا به qual می‌رود و تنها خواننده‌اش
//   hpylori_igm_result است — بی‌حکم (مثبت/منفی عفونتِ فعال را نشان نمی‌دهد) و با معرفیِ آزمایشِ معتبر. h_pylori_result آن را نمی‌خواند
//   (isHpyloriKey همچنان iga/igm را بیرون می‌گذارد).
const HP_IGM_RE = /^(hpylori|helicobacterpylori|helicobacter|هلیکوباکترپیلوری|هلیکوباکتر|hp(?=(ag|ab|igg|iga|igm|antigen|antibody|stool|sa))).*(iga|igm)/;
export const isHpyloriIgmKey = (key) => HP_IGM_RE.test(k0(key));
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
  // P84: «+» و «-» تنها (و undetected/nil) همان مثبت/منفی‌اند — پیش‌تر «Rubella IgG: +» به «تفسیر نشدند» می‌رفت (فهرستِ بسته، کلِ مقدار).
  if (/^(immune|ایمن|positive|pos|reactive|مثبت|واکنش ?گر|detected|\+)$/.test(s)) return { state: "immune", cut: null, n: null };
  if (/^(non[- ]?immune|nonimmune|not immune|غیر ?ایمن|negative|neg|non[- ]?reactive|nonreactive|منفی|not detected|undetected|nil|-)$/.test(s)) return { state: "nonimmune", cut: null, n: null };
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
/**
 * P114 (۲۰۲۶-۱۰-۲۷، برگهٔ PSA): مرجعِ ترکیبی مثل «< 4.0 / 70-90 years: < 4.0» یا
 * «< 4,0 / 70-80 years: Up to 6.5» در کل یک رشته به parseVerdict نمی‌خورد ⇒ موتور می‌گفت
 * «بازهٔ چاپ‌شده روی برگه نیست» در حالی که هست. این تابع نخستین بازهٔ خوانا را برمی‌دارد.
 * ⚠️ مقدارِ داخلِ پرانتزِ سنی را *جایگزین* نمی‌کند؛ فقط اگر بخشِ عمومی قابلِ خواندن بود آن را می‌دهد.
 */
export function cleanPrintedRef(raw) {
  const s0 = String(raw ?? "").trim();
  if (!s0) return "";
  if (parseReference(s0, null)) return s0;
  for (const part of s0.split(/[\/;|،]/)) {
    const p = part.trim();
    if (p && parseReference(p, null)) return p;
  }
  const upTo = /up\s*to\s*[:<]?\s*([\d.,]+)/i.exec(s0);
  return upTo ? `< ${upTo[1].replace(",", ".")}` : s0;
}

function printedUnit(t) {
  const u = String(t.unit ?? "").trim();
  if (u) return u;
  const tail = faDigits(t.value).trim().replace(/^[<>≤≥]?\s*[\d.,]+\s*/, "").trim();
  return tail || null;
}

// ═══════════ P76: خودایمنی/روماتولوژی — ANA، anti-dsDNA، Ro/La، ANCA (c/p/MPO/PR3)، HLA-B27 ═══════════
// 🔴 پیش از P76 همه unmapped بودند و هیچ یافته‌ای نمی‌ساختند: ANA مثبت و c-ANCA مثبت به «نتایج را در پرونده نگه دارید» می‌رسیدند (N2/N28).
// C1: هیچ آستانهٔ ثابتی نیست. واژه (مثبت/منفی) یا عددِ چاپ‌شده در برابرِ مرز/بازهٔ *همان ردیف*؛ وگرنه unmapped («تفسیر نشدند»).
//     تیترِ بی‌واژه («1:80») هم قضاوت نمی‌شود — مرزِ مثبت‌بودنِ تیتر بین آزمایشگاه‌ها فرق می‌کند.
// ⚠️ «ro»/«la» تنها عمداً نیست (کلمهٔ رایج)؛ فقط با پیشوندِ anti یا نامِ SSA/SSB. «CA» (کلسیم) و «Ro» هم‌نام نیستند.
// ═══════════ P112: خونِ مخفیِ مدفوع — یک نام‌گذاری، یک الگو ═══════════
// یک آزمایش با نام‌های گوناگون روی برگهٔ ایرانی؛ سه دور اندازه‌گیری روی املاهای واقعی:
//   دور ۱: FIT/FOBT و ترکیب‌های Occult Blood.
//   دور ۲: املاهای گچی/کیت‌محور (Guaiac، Hemoccult، Stool Guaiac) — بی‌این‌ها ردیف در allowlistِ بخشِ مدفوع
//     گیر می‌کرد و به «تفسیر نشدند» می‌رفت.
//   دور ۳: «OBT»، «Blood Occult» (ترتیبِ LIS)، «FOB (Stool)»، «Quantitative FIT»، «Fecal Immunochemical Test»،
//     «Occult Blood, Stool» (کاما)، «ازمایش خون مخفی» (الفِ بی‌کلاه، خطای رایج OCR) و آوانگاریِ فارسیِ
//     Hemoccult («هماکالت/هموکالت»).
//   ⚠️ adapter.js همین الگو را برای gateِ ردیف/صفحهٔ مدفوع import می‌کند — تک‌منبع، وگرنه ردیف پیش از رسیدن
//     به AI_RE.FIT در «تفسیر نشدند» می‌ماند (همان driftِ N3).
const FECAL_BLOOD_RE = /^(fit|fob|fobt|obt|ifobt|gfobt|ob|stoolob|fecalob|faecalob|obstool|fobstool|stoolfob|stoolfit|stoolfobt|stoolifobt|stoolgfobt|quantitativefit|qualitativefit|fecalimmunochemicaltest|faecalimmunochemicaltest|guaiac|guaiacblood|guaiacfobt|fobguaiac|fobtguaiac|stoolguaiac|fecalguaiac|faecalguaiac|hemoccult[a-z]*|(blood|stool|fecal|faecal)?occult(blood)?[a-z]*|oboccultblood[a-z]*|bloodinstool|stoolblood|.{0,12}خونمخفی.*|خونمدفوع|خوندرمدفوع|هماکالت|هموکالت)$/;
/** آیا نامِ چاپ‌شدهٔ این ردیف خونِ مخفیِ مدفوع است؟ (تک‌منبع؛ adapter هم از همین می‌پرسد)
 *  P113 (۲۰۲۶-۱۰-۲۷): رقمِ وسطِ نام بخشی از هویت نیست — برگه‌های ایرانی «Occult Blood-1(FOB)»،
 *  «Occult Blood-2(FOB)»، «FOB-1» چاپ می‌کنند (شمارهٔ نوبت/کیت). پیش‌تر k0 آن‌ها را «occultblood1fob»
 *  می‌کرد و regex می‌شکست ⇒ ردیف در «تفسیر نشدند» می‌ماند. حذفِ رقم فقط برای همین الگو انجام می‌شود. */
export const isFecalBloodName = (name) => {
  const k = k0(name);
  return FECAL_BLOOD_RE.test(k) || FECAL_BLOOD_RE.test(k.replace(/[0-9٠-٩]/g, ""));
};

const AI_RE = {
  FIT: FECAL_BLOOD_RE,
  // specs/023 (P136، G2): «ANA (IIF)» ⇒ k0 «anaiif» و «FANA» (Fluorescent ANA) پیش‌تر unmapped بودند.
  ANA: /^(f?ana|antinuclearantibod(y|ies)|antinuclearab|antinuclear|anf|آنتیبادیضدهسته|آنتینوکلئار)(ifa|if|iif|hep2|hep2iif|iifhep2|titer|titre|screen|screening|test|qualitative)?$/,
  ANTI_DSDNA: /^(anti)?(dsdna|doublestrandeddna|dna)(ab|antibody|antibodies|igg|elisa|ifa|clift|crithidia|cliftifa|iif)?$/,
  ANTI_RO: /^(antiro|antiroab|antirossa|antissaro|antissa|ssa|rossa|antiro52|antiro60)$/,
  ANTI_LA: /^(antila|antilaab|antilassb|antissbla|antissb|ssb|lassb)$/,
  C_ANCA: /^(canca|cancaifa|cancaigg|cytoplasmicanca)$/,
  P_ANCA: /^(panca|pancaifa|pancaigg|perinuclearanca)$/,
  ANCA: /^(anca|ancaigg|ancaifa|ancascreen|antineutrophilcytoplasmicantibod(y|ies)|antineutrophilcytoplasmicab)$/,
  MPO: /^(antimpo|mpo|mpoanca|mpoab|mpoantibody|mpoigg|antimpoigg|antimyeloperoxidase|myeloperoxidaseab|myeloperoxidaseantibody)$/,
  PR3: /^(antipr3|pr3|pr3anca|pr3ab|pr3antibody|pr3igg|antipr3igg|antiproteinase3|proteinase3ab|proteinase3antibody)$/,
  HLA_B27: /^(hlab27|b27|hlab27antigen|hlab27typing|hlab27test|hlab27pcr|hlab27flow)$/,
  // مرحلهٔ ۲: Anti-CCP (آنتی‌بادی: بالا/مثبت) و کمپلمان C3/C4 (غلظت: جهتِ مهم «پایین» است — فقط با بازهٔ چاپ‌شده).
  ANTI_CCP: /^(anticcp|ccp|anticcpab|anticcpigg|anticcpantibody|anticcp2|anticycliccitrullinatedpeptide(ab|antibody|antibodies)?|acpa|anticitrullinatedproteinantibod(y|ies))$/,
  C3: /^(c3|c3complement|complementc3|c3level|serumc3|c3serum)$/,
  C4: /^(c4|c4complement|complementc4|c4level|serumc4|c4serum)$/,
  // P77 (سند مرجعِ کاربر، ۲۰۲۶-۱۰-۰۴): بقیهٔ پنلِ خودایمنی/آنتی‌فسفولیپید
  ANTI_SM: /^(antism|smith|antismith|antismithab|antismab|antismantibody|smab|antismigg)$/,
  ANTI_RNP: /^(antirnp|antiu1rnp|u1rnp|rnp|antirnpab|antirnpantibody|antiu1rnpab|rnpab)$/,
  SCL70: /^(scl70|antiscl70|antitopoisomerasei|antitopoi|topoisomerasei|antitopo1|antiscl70ab|scl70ab)$/,
  ANTI_CENTROMERE: /^(anticentromereb?|anticentromerebab|anticentromereab|centromereb?ab|centromereb|anticenpb|cenpb|anticentromereantibody)$/,
  JO1: /^(jo1|antijo1|antijo1ab|jo1ab|antijo1antibody)$/,
  // P143 (specs/025): islet autoantibodies. The verdict comes only from the printed cut-off or a qualitative word; without
  //   one the row is «read, not interpreted» (AI_NOREF). Before this they were unmapped (N2).
  ANTI_GAD: /^(anti)?gad(65)?(ab|antibody|antibodies|igg)?$|^antiglutamicaciddecarboxylase(65)?(ab|antibody|antibodies)?$/,
  ANTI_IA2: /^(anti)?ia2a?(ab|antibody|antibodies)?$|^(anti)?isletantigen2(ab|antibody|antibodies)?$/,
  ACL_IGG: /^((anti)?cardiolipin(ab|antibody|antibodies)?|acl)igg$/,
  ACL_IGM: /^((anti)?cardiolipin(ab|antibody|antibodies)?|acl)igm$/,
  ACL: /^((anti)?cardiolipin(ab|antibody|antibodies)?|acl)$/,
  B2GPI_IGG: /^(anti)?(b2|β2|beta2)(gpi|glycoproteini?)(ab|antibody)?igg$/,
  B2GPI_IGM: /^(anti)?(b2|β2|beta2)(gpi|glycoproteini?)(ab|antibody)?igm$/,
  B2GPI: /^(anti)?(b2|β2|beta2)(gpi|glycoproteini?)(ab|antibody)?$/,
  LUPUS_AC: /^(lupusanticoagulant|lac|lupusac|drvvt|dilutedrussellsviperventime|lupusanticoagulantscreen)$/,
  // ═══ specs/023 (P136، راهنمای گوگل‌درایوِ کاربر): کلیدهای تازهٔ خودایمنی — همه فقط در برابرِ بازهٔ چاپ‌شدهٔ همان ردیف (C1) ═══
  // 🔴 پیش از این همه unmapped بودند («تفسیر نشدند»)، حتی tTG-IgAِ ۱۵ برابرِ حدِ بالا (N2).
  ACL_IGA: /^((anti)?cardiolipin(ab|antibody|antibodies)?|acl)iga$/,
  ANTI_HISTONE: /^(anti)?histone(ab|antibody|antibodies|igg)?$/,
  ANTI_DNASEB: /^(anti)?(dnaseb|dnasb|deoxyribonucleaseb|adnaseb|antidnasebtiter)(ab|antibody|titer|titre)?$/,
  CH50: /^(ch50|complementch50|ch50complement|totalhemolyticcomplement|totalhaemolyticcomplement|totalcomplementactivity|hemolyticcomplement)$/,
  // سلیاک
  TTG_IGA: /^((anti)?(ttg|ttga|tga|tissuetransglutaminase|transglutaminase)(ab|antibody|antibodies)?iga(ab|antibody)?|iga(anti)?(ttg|tissuetransglutaminase))$/,
  TTG_IGG: /^((anti)?(ttg|ttga|tga|tissuetransglutaminase|transglutaminase)(ab|antibody|antibodies)?igg(ab|antibody)?|igg(anti)?(ttg|tissuetransglutaminase))$/,
  DGP_IGG: /^(anti)?(dgp|deamidatedgliadin(peptides?)?|gliadindeamidated(peptides?)?)(ab|antibody|antibodies)?igg$/,
  DGP_IGA: /^(anti)?(dgp|deamidatedgliadin(peptides?)?|gliadindeamidated(peptides?)?)(ab|antibody|antibodies)?iga$/,
  EMA_IGA: /^(anti)?(ema|endomysial|endomysium)(ab|antibody|antibodies)?(iga)?(ab|antibody|ifa|iif)?$/,
  // ایمونوگلوبولین‌های سرم (شریکِ سلیاک و هپاتیت خودایمنی) — غلظت؛ فقط با واحدِ غلظت (routeSerology).
  IGA_TOTAL: /^(iga|totaliga|igatotal|serumiga|igaserum|totalserumiga|immunoglobulina|totalimmunoglobulina)$/,
  IGG: /^(igg|totaligg|iggtotal|serumigg|iggserum|totalserumigg|immunoglobuling|totalimmunoglobuling)$/,
  IGM: /^(igm|totaligm|igmtotal|serumigm|igmserum|totalserumigm|immunoglobulinm|totalimmunoglobulinm)$/,
  IGE: /^(ige|totalige|igetotal|serumige|igeserum|totalserumige|immunoglobuline|totalimmunoglobuline)$/,
  // کبدِ خودایمن
  ASMA: /^(asma|asmaifa|asmaiif|antismoothmuscle(ab|antibody|antibodies)?|smoothmuscle(ab|antibody|antibodies)|antiactin|antifactin|factin(ab|antibody)?)$/,
  ANTI_LKM1: /^((anti)?lkm1?(ab|antibody|ifa|iif)?|(anti)?liverkidneymicrosom(e|al)(type1)?(ab|antibody|antibodies)?)$/,
  ANTI_SLA: /^(anti)?(sla|slalp|solubleliverantigen(liverpancreas)?)(ab|antibody)?$/,
  AMA_M2: /^(amam2|antim2|antiamam2|m2ama|amam2ab|antimitochondrialm2(ab|antibody)?|antimitochondrialantibodym2)$/,
  AMA: /^(ama|amaifa|amaiif|antimitochondrial(ab|antibody|antibodies)?|mitochondrial(ab|antibody|antibodies))$/,
  // میاستنی
  ACHR: /^(anti)?(achr|acetylcholinereceptor)(binding)?(ab|antibody|antibodies)?(binding)?$/,
  ANTI_MUSK: /^(anti)?(musk|musclespecifickinase|musclespecifictyrosinekinase)(ab|antibody|antibodies)?$/,
  // P77 — تومورمارکرها و گوارش: بی‌نمره؛ فقط محدودهٔ چاپ‌شده. بی‌محدوده هم یافته می‌سازد (قیدِ «محدوده روی برگه نیست»)، نه unmapped.
  // specs/019: «CEA (Carcinoembryonic Antigen)» همان دو نامِ بالا کنارِ هم است (k0 پرانتز را می‌اندازد)؛ فارسی فقط همان شکلی که
  //   در محتوای خودِ اپ آمده (extra.cancer.js)، نه حدس. «CA 15.3 (Breast)» و «CA 125 Ovarian» عمداً نیستند: روی برگهٔ واقعی دیده نشده‌اند (N2).
  CEA: /^(cea|carcinoembryonicantigen|serumcea|ceacarcinoembryonicantigen|carcinoembryonicantigencea|آنتیژنکارسینوامبریونیک)$/,
  AFP: /^(afp|alphafetoprotein|αfetoprotein|alphafetoproteinserum|serumafp|afpserum|afptumormarker|آلفافیتوپروتئین)$/,
  CA125: /^(ca125|cancerantigen125|ca125ii)$/,
  CA199: /^(ca199|cancerantigen199)$/,
  CA153: /^(ca153|cancerantigen153)$/,
  B2M: /^(b2m|beta2microglobulin|β2microglobulin|beta2m|b2microglobulin|serumb2m|β2m|microglobulinbeta2)$/,
  CALCITONIN: /^(calcitonin|serumcalcitonin|thyrocalcitonin|basalcalcitonin)$/,
  CGA: /^(cga|chromogranina|chromogranin|serumchromogranina)$/,
  PSA_TOTAL: /^(psa|totalpsa|psatotal|tpsa|prostatespecificantigen|psatotalserum|psaserum|پیاسای|پیاسایتوتال|پیاسایتام)$/,
  PSA_FREE: /^(freepsa|psafree|fpsa|freeprostatespecificantigen)$/,
  PSA_RATIO: /^(freepsaratio|freepsapercent|freetotalpsa|freetotalpsaratio|psafreetotal|fpsatpsa|psaratio|ratiofreetotalpsa|freepsatotalpsa|percentfreepsa|pfreepsa)$/,
  CALPROTECTIN: /^(calprotectin|fecalcalprotectin|faecalcalprotectin|stoolcalprotectin|calprotectinfecal|calprotectinstool|fcalprotectin)$/,
};
export const AI_KEYS = Object.keys(AI_RE);
// کلیدهایی که بی‌محدودهٔ چاپی هم یافته می‌سازند (state="noref") — به درخواست کاربر «هیچ‌کدام تفسیر نشده نرود»؛ بدون ادعای بالا/پایین.
// ⚠️ P77 (دور دوم، درخواستِ کاربر «اگر محدوده روی برگه نبود هم تفسیرنشده نرود»): همهٔ کلیدهای عددی، نه فقط تومورمارکرها.
//    HLA-B27 فقط واژه دارد. AFP بی‌واحد هنوز unmapped است (M105، دو معنا).
export const AI_NOREF = new Set(AI_KEYS.filter((k) => k !== "HLA_B27"));
const AI_QUAL_ONLY = new Set(["HLA_B27"]);   // ژن/آنتی‌ژن: فقط حاضر/غایب، عددِ مقایسه‌پذیر ندارد
const AI_RANGE_ONLY = new Set(["C3", "C4", "CH50", "IGG", "IGA_TOTAL", "IGM", "IGE"]);  // غلظت: کلمه معنا ندارد (⇒ unmapped)؛ عدد فقط در برابرِ بازهٔ چاپ‌شده: below|within|above
// specs/023 (N25): «IgG»/«IgM» تنها روی برگه گاهی زیرِ عنوانِ CMV/توکسو چاپ می‌شود (AU/mL، index). ایمونوگلوبولینِ سرم فقط با واحدِ غلظتِ خودش.
const IG_UNIT_RE = { IGG: /(mg|g)\s*\/\s*(dl|l)\b/i, IGA_TOTAL: /(mg|g)\s*\/\s*(dl|l)\b/i, IGM: /(mg|g)\s*\/\s*(dl|l)\b/i, IGE: /(k?iu|ku|u|ng)\s*\/\s*ml\b/i };
// specs/023 (P136): تیترِ بی‌واژهٔ آنتی‌بادی‌های کبدی — IAIHG (ANA/ASMA/LKM1 ≥ 1:40) و AMA در PBC (< 1:40 منفی)، به نقلِ راهنمای کاربر.
export const LIVER_AB_TITRE_CUT = 40;
const TITRE_CUT = { ASMA: LIVER_AB_TITRE_CUT, ANTI_LKM1: LIVER_AB_TITRE_CUT, AMA: LIVER_AB_TITRE_CUT };
/** تیتر در برابرِ تیترِ چاپ‌شدهٔ همان ردیف («<1:10»، «≥ 1:40»، «Negative < 1:20»): above | within | null. */
function titreVsPrinted(titre, reference) {
  const m = String(reference ?? "").match(/(<=|>=|[<>≤≥])?\s*1\s*[:/]\s*(\d+)/);
  if (!m || titre == null) return null;
  const op = m[1] ?? "<", cut = Number(m[2]);
  if (op === "<") return titre >= cut ? "above" : "within";
  if (op === "≤" || op === "<=") return titre > cut ? "above" : "within";
  return titre >= cut ? "above" : "within";   // «>1:N»/«≥1:N» = مرزِ مثبت
}
export const autoKeyOf = (key) => {
  const k = k0(key);
  // P113: FIT با رقم در نام («Occult Blood-1(FOB)») — همان تابعِ تک‌منبع، پیش از حلقهٔ الگوها.
  if (isFecalBloodName(key)) return "FIT";
  return AI_KEYS.find((id) => AI_RE[id].test(k)) ?? null;
};

// ANA — الگوی فلورسانس (ICAP). فقط واژه‌ها/کدهای چاپ‌شده روی همان ردیف خوانده می‌شوند.
const ANA_PATTERNS = [
  ["dfs", /dense\s*fine\s*speckled|dfs\s*70|\bac-?2\b/i],
  ["finespeckled", /fine\s*speckled|\bac-?4\b/i],
  ["coarsespeckled", /coarse\s*speckled|\bac-?5\b/i],
  ["homogeneous", /homogene?ous|\bac-?1\b|diffuse/i],
  ["centromere", /centromer|\bac-?3\b/i],
  ["nucleolar", /nucleolar|\bac-?(8|9|10)\b/i],
  ["dots", /discrete\s*dots|nuclear\s*dots|\bac-?(6|7)\b/i],
  ["cytoplasmic", /cytoplasm|\bac-?(19|20|21)\b/i],
  ["speckled", /speckled/i],
];
export function anaPatternsOf(raw) {
  const s = String(raw ?? "");
  const out = [];
  for (const [id, re] of ANA_PATTERNS) if (re.test(s) && !(id === "speckled" && out.some((x) => /speckled/.test(x)))) out.push(id);
  return out;
}

/** مقدارِ آزمایشِ خودایمنی: pos|neg (با تیترِ اختیاری) | titre (تیترِ بی‌واژه) | num | unknown. N6: مجموعهٔ بسته (qualVerdict).
 *  ANA (P77، EULAR/ACR 2019 + ICAP): تیترِ HEp-2 ≥ 1:80 مثبت، کمتر منفی؛ الگوی چاپ‌شده + تیترِ ≥ 1:80 هم مثبت است. */
export function readAutoValue(raw, id = null) {
  const s = faDigits(raw).trim();
  if (id === "ANA") {
    const t = s.match(/1\s*[:/]\s*(\d+)/);
    const titre = t ? Number(t[1]) : null;
    const patterns = anaPatternsOf(s);
    if (/^1\s*[:/]\s*\d+$/.test(s)) return { state: titre >= 80 ? "pos" : "neg", titre, patterns, bare: true };
    const v = qualVerdict(s);
    if (v.state === "pos" || v.state === "neg") return { state: v.state, titre, patterns };
    if (patterns.length && titre != null) return { state: titre >= 80 ? "pos" : "neg", titre, patterns };
    if (v.state === "num") return { state: "num", n: v.n, cmp: v.cmp };
    if (v.state === "equiv") return { state: "equiv" };
    return { state: "unknown" };
  }
  if (/^\d+\s*[:/]\s*\d+$/.test(s)) {
    const titre = Number(s.split(/[:/]/)[1]);
    // specs/023: آنتی‌بادی‌های کبدی مرزِ تیترِ ثابت دارند (TITRE_CUT) — مثلِ ANA ≥ 1:80.
    if (id && TITRE_CUT[id]) return { state: titre >= TITRE_CUT[id] ? "pos" : "neg", titre, bare: true, cut: TITRE_CUT[id] };
    return { state: "titre", titre };
  }
  const v = qualVerdict(s);
  if (v.state === "pos" || v.state === "neg") {
    const m = s.match(/1\s*[:/]\s*(\d+)/);
    return { state: v.state, titre: m ? Number(m[1]) : null };
  }
  if (v.state === "num") return { state: "num", n: v.n, cmp: v.cmp };
  if (v.state === "equiv") return { state: "equiv" };
  return { state: "unknown" };
}

/**
 * حکمِ غلظت در برابرِ بازهٔ چاپ‌شدهٔ همان ردیف (C3/C4): below | within | above | unknown.
 * مقدارِ سانسورشده («<20») و ردیفِ بی‌بازه ⇒ unknown (C1). بازهٔ یک‌طرفه فقط همان طرف را می‌سنجد.
 */
export function rangeVerdict(n, cmp, reference, sexHint = null) {
  if (cmp || !reference) return "unknown";
  const pr = parseReference(reference, sexHint);
  if (!pr || (pr.lo == null && pr.hi == null)) return "unknown";
  if (pr.lo != null && n < pr.lo) return "below";
  if (pr.hi != null && n > pr.hi) return "above";
  return "within";
}

/** عددِ همان‌طور که چاپ شده نقل می‌شود («3.0»، نه «3» — N5) و حکم در برابرِ مرزِ چاپ‌شدهٔ همان ردیف. unknown ⇒ null. */
function assayRoute(abKey, t, sexHint, q) {
  // specs/019: تومورمارکرها بازهٔ چاپ‌شده را با خوانندهٔ خودشان می‌خوانند (باندِ سیگاری/غیرسیگاری، «<» اکید، «At or below»)؛
  //   cleanPrintedRef روی «/ ; | ،» می‌شکست و نخستین بخشِ قابل‌خواندن را برمی‌داشت (CEA ۷ بی‌صدا «بالا»).
  const tm = TM_KEYS.has(abKey);
  const refClean = tm ? String(t.reference ?? "").trim() : cleanPrintedRef(t.reference);
  let state = tm ? tmVerdict(q.n, q.cmp, parseTmRange(refClean, sexHint))
    : AI_RANGE_ONLY.has(abKey) ? rangeVerdict(q.n, q.cmp, refClean, sexHint) : abVerdict(q.n, q.cmp, refClean, sexHint);
  // P77: تومورمارکر/گوارش بی‌محدودهٔ چاپی (یا مقدارِ سانسورشده) یافتهٔ «بی‌حکمِ بالا/پایین» می‌گیرد، نه unmapped.
  if (state === "unknown" && AI_NOREF.has(abKey)) state = "noref";
  if (state === "unknown") return null;
  const shown = (faDigits(t.value).trim().match(/^[<>≤≥]?\s*[\d.,]+/) ?? [String(q.n)])[0].replace(/\s+/g, "");
  return { to: "assay", key: abKey, value: q.n, cmp: q.cmp, shown, unit: printedUnit(t), state, raw: String(t.value).trim(), reference: refClean, ...(t.name ? { name: String(t.name) } : {}) };
}

/** وضعیتِ یک آزمایشِ خودایمنی روی برگه: absent | pos | neg | above | within (+ raw/shown/unit/titre/name) */
export function autoAbState(e, id) {
  const u = e.ungraded?.[id];
  if (u?.reason === "assay_printed") {
    return { state: u.state, value: u.value, cmp: u.cmp, shown: u.shown, unit: u.unit, reference: u.reference, raw: u.raw, name: u.name, assay: true, ...(u.titre ? { titreRow: true } : {}) };
  }
  // P113: ردیفِ FIT/FOB با رقم در نام («Occult Blood-1(FOB)») از الگوی ساده رد می‌شود؛
  //   یک منبعِ تصمیم (isFecalBloodName) هم برای qual و هم برای gateِ adapter.
  const row = Object.entries(e.qual ?? {}).find(([name]) => (id === "FIT" ? isFecalBloodName(name) : AI_RE[id].test(k0(name))));
  if (row) {
    const v = readAutoValue(row[1], id);
    if (v.state === "pos" || v.state === "neg") return { state: v.state, raw: String(row[1]).trim(), name: row[0], titre: v.titre, patterns: v.patterns ?? [], bare: !!v.bare, ...(v.cut ? { cut: v.cut } : {}) };
  }
  return { state: "absent" };
}

/**
 * مسیریابیِ یک ردیف در adapter. ورودی: کلیدِ نرمال‌شده و ردیفِ خام.
 * @returns null (سرولوژیِ specs/012 یا P76 نیست) | {to:"qual"} | {to:"unmapped"} |
 *          {to:"assay", key, value, cmp, unit, state:"above"|"within", raw, reference}
 */
export function routeSerology(key, t, sexHint = null) {
  const k = k0(key);
  if (UNREAD_RE.some((re) => re.test(k))) return { to: "unmapped" };
  if (HP_IGM_RE.test(k)) return String(t.value ?? "").trim() ? { to: "qual" } : { to: "unmapped" };

  const aiKey = autoKeyOf(k);
  if (aiKey) {
    // AFP دو معنا دارد (تومورمارکر / غربالگری بارداری با MoM — M105). فقط با واحدِ غلظت تومورمارکر خوانده می‌شود؛ بی‌واحد یا MoM ⇒ unmapped.
    //    محدودهٔ عددیِ چاپ‌شده روی همان ردیف (بی‌MoM) هم کافی است: غربالگریِ بارداری با MoM و بازهٔ MoM چاپ می‌شود.
    if (aiKey === "AFP") {
      const all = `${t.unit ?? ""} ${t.value ?? ""} ${t.reference ?? ""}`;
      const hasConc = /(ng|µg|ug|iu|u|kiu)\s*\/\s*(ml|l)/i.test(all);
      const hasRange = /\d/.test(String(t.reference ?? ""));
      if (/mom|multiples?\s*of/i.test(all) || !(hasConc || hasRange)) return { to: "unmapped" };
    }
    // specs/023 (N25): ایمونوگلوبولینِ سرم فقط با واحدِ غلظتِ خودش؛ «IgG 250 AU/mL» زیرِ CMV ایمونوگلوبولینِ کل نیست.
    if (IG_UNIT_RE[aiKey] && !IG_UNIT_RE[aiKey].test(`${t.unit ?? ""} ${t.value ?? ""} ${t.reference ?? ""}`)) return { to: "unmapped" };
    // N25: «EMA» روی برگهٔ خون همان آزمونِ اتصالِ eosin-5'-maleimide (اسفروسیتوز، ٪ یا MCF) هم هست. EMAِ عددی فقط با نامِ صریحِ
    //   IgA/اندومیزیوم/آنتی‌بادی و هرگز با ٪ یا MCF؛ نامِ بی‌پسوندِ «EMA» فقط با واژه یا تیتر.
    if (aiKey === "EMA_IGA") {
      const all = `${t.unit ?? ""} ${t.value ?? ""} ${t.reference ?? ""}`;
      const explicit = /iga|endomys|ab$|antibod/.test(k);
      if (/%|mcf|fluorescen/i.test(all) || (!explicit && qualVerdict(faDigits(t.value)).state === "num" && !/^\s*1\s*[:/]\s*\d+\s*$/.test(faDigits(t.value)))) return { to: "unmapped" };
    }
    const v = readAutoValue(t.value, aiKey);
    // specs/023 (P136، G2): تیترِ بی‌واژه در برابرِ تیترِ چاپ‌شدهٔ همان ردیف («Anti-dsDNA (CLIFT) 1:20»، مرجع «<1:10»).
    //   پیش‌تر هر تیترِ بی‌واژه (غیر از ANA) «بی‌حکم» می‌شد، حتی وقتی برگه مرزِ تیتر را چاپ کرده بود.
    if (aiKey !== "ANA" && /^\s*1\s*[:/]\s*\d+\s*$/.test(faDigits(t.value))) {
      const titre = Number(faDigits(t.value).split(/[:/]/)[1]);
      const tv = titreVsPrinted(titre, t.reference);
      if (tv) {
        const raw = String(t.value).trim();
        return { to: "assay", key: aiKey, value: titre, cmp: null, shown: raw, unit: null, state: tv, raw, reference: String(t.reference), titre: true, ...(t.name ? { name: String(t.name) } : {}) };
      }
    }
    if ((v.state === "pos" || v.state === "neg") && !AI_RANGE_ONLY.has(aiKey)) return { to: "qual" };
    // تیترِ بی‌واژه (غیر از ANA) و نتیجهٔ مرزی («+/-»، Equivocal، Trace): نه مثبت نه منفی — یافتهٔ «بی‌حکم» (state=titre|equiv)، نه unmapped.
    if ((v.state === "titre" || v.state === "equiv") && AI_NOREF.has(aiKey)) {
      const raw = String(t.value).trim();
      return { to: "assay", key: aiKey, value: null, cmp: null, shown: raw, unit: null, state: v.state === "titre" ? "noref" : "equiv", raw, reference: String(t.reference) };
    }
    if (v.state !== "num" || AI_QUAL_ONLY.has(aiKey)) return { to: "unmapped" };
    return assayRoute(aiKey, t, sexHint, v) ?? { to: "unmapped" };
  }

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
