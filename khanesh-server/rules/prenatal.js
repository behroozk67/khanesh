// ============================================================
// prenatal.js — specs/013: هویتِ ردیف‌های غربالگریِ سرمِ مادر (دابل مارکر / کوآد مارکر)
// ------------------------------------------------------------
// مشترکِ adapter.js (خواندن و ادعا) و patterns_prenatal.js (قاعده‌ها). هیچ حکمِ بالینی‌ای این‌جا نیست.
//
// 🔴 چرا کانالِ جدا (N25، اندازه‌گیری‌شده ۲۰۲۶-۱۰-۰۴): کوآدِ زنِ باردار با واحدِ غلظت —
//    «AFP 35 IU/mL · Total hCG 29000 mIU/mL» — به `ungraded.AFP` و `ungraded.HCG` می‌رفت و
//    `tumor_markers_result` («پایشِ گروه‌های پرخطرِ کبد … غربالگریِ سرطان») و `hcg_result`
//    («تستِ بارداری مثبت است») می‌گرفت. ردیفِ ادعاشده هرگز به آن دو کلید نمی‌رسد.
//
// قاعدهٔ ادعا (spec، پرسش ۳ — دوگذری):
//   • نامِ «قوی» (Free β-hCG، PAPP-A، uE3، Inhibin A، NT، MSAFP، ردیفِ «Risk Trisomy …») همیشه غربالگری است.
//   • نامِ «ضعیف» (AFP، hCG/Total hCG/β-hCG، Estriol) فقط اگر واحدِ همان ردیف MoM باشد یا برگه
//     دست‌کم یک ردیفِ قوی یا یک ردیفِ MoM داشته باشد. وگرنه همان معنای امروز (تومورمارکر / تستِ بارداری).
//   • پرچمِ بارداریِ پروفایل هرگز شاهد نیست.
// ⚠️ املاها «مجموعهٔ آغازین»اند، نه برگرفته از برگهٔ واقعی (T002: برگه‌ای در دسترس نبود) — N2.
// ============================================================

// norm()ِ adapter: حروفِ کوچک، بی‌فاصله/نقطه/خط‌تیره/پرانتز/٪/#/«/». همین‌جا تکرار نمی‌شود؛ کلیدهای زیر نرمال‌شده‌اند.
export const PRENATAL_STRONG = Object.freeze({
  freeβhcg: "FBHCG", freebhcg: "FBHCG", freebetahcg: "FBHCG", fβhcg: "FBHCG", fbhcg: "FBHCG",
  freehcgβ: "FBHCG", freehcgbeta: "FBHCG", freeβsubunithcg: "FBHCG", freebetasubunithcg: "FBHCG",
  freeβhcgmom: "FBHCG", freebhcgmom: "FBHCG",
  بتااچسیجیآزاد: "FBHCG", بتاآزاد: "FBHCG",
  pappa: "PAPPA", pappamom: "PAPPA", pregnancyassociatedplasmaproteina: "PAPPA",
  ue3: "UE3", ue3mom: "UE3", unconjugatedestriol: "UE3", unconjugatedoestriol: "UE3", estriolue3: "UE3",
  freeestriol: "UE3", استریولغیرکونژوگه: "UE3", استریولآزاد: "UE3",
  // استریول/E3 فقط در بارداری سنجیده می‌شود ⇒ شاهدِ قوی (بازبینیِ کد C6: سه‌گانهٔ AFP+hCG+E3 بی‌uE3 به تومورمارکر می‌رفت).
  estriol: "UE3", oestriol: "UE3", e3: "UE3", استریول: "UE3", ue3estriol: "UE3",
  freehcg: "FBHCG", fbetahcg: "FBHCG", betahcgfree: "FBHCG", freehcgbeta: "FBHCG",
  nt: "NT", nuchaltranslucency: "NT", ntthickness: "NT", nuchaltranslucencythickness: "NT",
  ضخامتnt: "NT", شفافیتپشتگردن: "NT", ضخامتپشتگردن: "NT",
  msafp: "AFP_MAT", maternalserumafp: "AFP_MAT", afpmaternalserum: "AFP_MAT",
});

// نامِ ضعیف: بی‌شاهد همان معنای امروز را دارد.
export const PRENATAL_WEAK = Object.freeze({
  afp: "AFP_MAT", afpmom: "AFP_MAT", alphafetoprotein: "AFP_MAT", alfafetoprotein: "AFP_MAT", آلفافیتوپروتئین: "AFP_MAT",
  آلفافتوپروتئین: "AFP_MAT",
  hcg: "HCG_TOT", totalhcg: "HCG_TOT", hcgmom: "HCG_TOT", betahcg: "HCG_TOT", bhcg: "HCG_TOT", βhcg: "HCG_TOT",
  hcgtotal: "HCG_TOT", totalbhcg: "HCG_TOT", totalβhcg: "HCG_TOT", totalbetahcg: "HCG_TOT",
  // 🔴 بازبینیِ کد C4: Inhibin A نشانگرِ تومورِ تخمدان/غدد جنسی هم هست — نامِ ضعیف: فقط با شاهدِ دیگر یا MoM.
  inhibina: "INHA", inhibinamom: "INHA", dimericinhibina: "INHA", اینهیبینa: "INHA", اینهیبین: "INHA", inhibin: "INHA",
});

/** «ntmm» → {base:"nt", mom:false, unit:"mm"}، «freeβhcgmom» → {base:"freeβhcg", mom:true}. norm() پرانتزِ واحد را جدا نمی‌کند (C7). */
export function baseName(k) {
  let s = String(k ?? ""), mom = false, unit = null;
  for (;;) {
    const m = s.match(/(mom|mm|pgml|ngml|miuml|iuml|iul|nmoll|ugl|mgdl)$/);
    if (!m || m.index === 0) break;
    if (m[1] === "mom") mom = true; else unit = unit ?? m[1];
    s = s.slice(0, m.index);
  }
  return { base: s, mom, unit };
}

export const PRENATAL_KEYS = Object.freeze(["FBHCG", "PAPPA", "NT", "AFP_MAT", "UE3", "HCG_TOT", "INHA"]);
export const FTS_KEYS = Object.freeze(["FBHCG", "PAPPA", "NT"]);
export const QUAD_KEYS = Object.freeze(["AFP_MAT", "UE3", "HCG_TOT", "INHA"]);

const isMomUnit = (u) => /^\s*mom\s*$/i.test(String(u ?? ""));
const momInValue = (v) => /\bmom\b/i.test(String(v ?? ""));

// ردیفِ خطر: نامِ «Risk Trisomy 21» / «T21 risk» / «Down syndrome risk» / «خطر سندرم داون» / «NTD risk».
// ⚠️ «NT» تنها ردیفِ خطر نیست (ضخامتِ گردن است) — فقط «ntd»/«neural tube» NTD است.
export function riskKind(name) {
  const s = String(name ?? "").toLowerCase();
  // «Cut-off 1:250» مرزِ آزمایشگاه است، نه خطرِ بیمار (بازبینیِ کد P6).
  if (/cut\s*-?\s*off|\bthreshold\b|مرز/.test(s)) return null;
  const riskish = /risk|خطر|ریسک|trisomy|تریزومی|down|داون|edward|ادوارد|patau|پاتو|neural\s*tube|\bntd\b|\bontd\b/.test(s);
  if (!riskish) return null;
  if (/neural\s*tube|\bo?ntd\b|نقص\s*لوله|لولهٔ?\s*عصبی/.test(s)) return "NTD";
  if (/edward|ادوارد|(trisomy|تریزومی|\bt)\s*-?\s*18\b/.test(s)) return "T18";
  if (/patau|پاتو|(trisomy|تریزومی|\bt)\s*-?\s*13\b/.test(s)) return "T13";
  if (/down|داون|(trisomy|تریزومی|\bt)\s*-?\s*21\b/.test(s)) return "T21";
  return null;
}

// 🔴 بازبینیِ کد C1: برگه‌ها خطرِ زمینه‌ای (سن) را پیش از خطرِ تعدیل‌شده چاپ می‌کنند. اولی برنده می‌شد ⇒
//    «زمینه 1:1500» کم‌خطر و «تعدیل‌شده 1:40» گم؛ یا برعکس «زمینه 1:70» پرخطر. ردیفِ زمینه هرگز خطرِ بیمار نیست.
export function riskRole(name) {
  return /background|\bage\b|age[\s-]*(related|specific|risk)|prior|a[\s-]*priori|baseline|زمینه|پایه|سنی|اولیه/i.test(String(name ?? ""))
    ? "background" : "adjusted";
}

// سنِ بارداری / مبنای تعیینِ سن.
export function datingKind(name) {
  const s = String(name ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  if (/^(ga|g\.a\.?|gestational age|gest\.? age|سن بارداری|سن حاملگی|هفته بارداری)(\b|\s|$|\()/.test(s)) {
    if (/\b(us|u\/s|crl|sono|ultra)|سونو/.test(s)) return "ga_us";
    if (/\blmp\b|قاعدگی/.test(s)) return "ga_lmp";
    return "ga";
  }
  if (/^(dating|ga (method|by|basis)|dated by|مبنای تعیین سن)/.test(s)) return "basis";
  return null;
}

// «12w3d» / «12+3» / «12 weeks 3 days» / «۱۷ هفته» → روز. ناخوانا ⇒ null.
export function parseGaDays(raw, toNum) {
  const s = String(raw ?? "").replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).toLowerCase();
  let m = s.match(/(\d{1,2})\s*(?:w|wk|wks|weeks?|هفته)?\s*\+\s*(\d)\b/);
  if (m) return Number(m[1]) * 7 + Number(m[2]);
  m = s.match(/(\d{1,2})\s*(?:w|wk|wks|weeks?|هفته)\s*(?:and|و|,)?\s*(\d)\s*(?:d|days?|روز)/);
  if (m) return Number(m[1]) * 7 + Number(m[2]);
  m = s.match(/^(\d{1,2}(?:\.\d+)?)\s*(?:w|wk|wks|weeks?|هفته)?\s*$/);
  if (m) { const w = toNum(m[1]); return w != null ? Math.round(w * 7) : null; }
  return null;
}

// «1:250» / «1/250» / «1 in 250» → 250. عددِ کسر لازم است؛ «toNum('1:250')» = 1250 است، پس هرگز از toNum نه.
export function parseRiskDenominator(raw) {
  const s = String(raw ?? "").replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
  // «1:10 000»، «1:10.000»، «1:10,000»، «1:10٬000»: هزارگان. 🔴 بازبینیِ کد C2: «1:10 000» ده خوانده می‌شد ⇒ «پرخطر».
  const m = s.match(/\b1\s*(?::|\/|in|در)\s*(\d{1,3}(?:[ .,٬  ]\d{3})+|\d{1,7})(?!\d)/i);
  return m ? Number(m[1].replace(/[ .,٬  ]/g, "")) : null;
}

// دستهٔ چاپ‌شدهٔ آزمایشگاه — مجموعهٔ بسته (N6/N30): «not high» یا «low-intermediate» دستهٔ ناشناخته‌اند، نه «high».
const CAT_HIGH = /^(high(\s*risk)?|increased(\s*risk)?|screen\s*positive|positive|پرخطر|خطر\s*بالا|مثبت)$/i;
const CAT_LOW = /^(low(\s*risk)?|screen\s*negative|negative|کم\s*خطر|کم‌خطر|خطر\s*پایین|منفی)$/i;
const CAT_MID = /^(intermediate(\s*risk)?|borderline|متوسط|حد\s*واسط|بینابینی)$/i;
export function parseRiskCategory(raw) {
  const s = String(raw ?? "");
  // دسته معمولاً داخلِ پرانتز یا پس از خط‌تیره کنارِ کسر می‌آید: «1:250 (Low risk)»، «1:60 - High risk».
  const parts = [s, ...(s.match(/\(([^)]*)\)/g) ?? []).map((p) => p.slice(1, -1)), ...s.split(/\s[-–—|]\s|[;,]/)]
    .map((p) => p.replace(/\b1\s*(?::|\/|in)\s*\d+\b/gi, "").replace(/[().]/g, "").trim())
    .filter(Boolean);
  for (const p of parts) {
    if (CAT_HIGH.test(p)) return "high";
    if (CAT_LOW.test(p)) return "low";
    if (CAT_MID.test(p)) return "intermediate";
  }
  return null;
}

/** سطرِ NT فقط وقتی NT است که مقدارش عددی باشد («NT: Negative»، «NT: Not tested» نه — بازبینیِ کد P4). */
const hasDigit = (v) => /[\d۰-۹]/.test(String(v ?? ""));

/** نامِ نرمال‌شده → { base, mom, unit } و کلیدِ قوی/ضعیفِ آن. */
function lookup(name, norm) {
  const b = baseName(norm(name));
  return { ...b, strong: PRENATAL_STRONG[b.base] ?? PRENATAL_STRONG[norm(name)] ?? null, weak: PRENATAL_WEAK[b.base] ?? PRENATAL_WEAK[norm(name)] ?? null };
}

/**
 * گذرِ ۱: آیا این برگه غربالگریِ سرمِ مادر است؟ شاهد: نامِ قوی (NT فقط با عدد)، MoM در واحد/مقدار/نام،
 * ردیفِ خطرِ تعدیل‌شده، یا ردیفِ سنِ بارداری. Inhibin A/AFP/hCG تنها شاهد نیستند (C4/C6).
 * @param {Array<{name,value,unit}>} rows   ردیف‌های OCR
 * @param {(s:string)=>string} norm         همان norm()ِ adapter
 */
export function isPrenatalSheet(rows, norm) {
  return (rows ?? []).some((t) => {
    if (!t?.name) return false;
    const L = lookup(t.name, norm);
    if (L.strong && (L.strong !== "NT" || hasDigit(t.value))) return true;
    if (isMomUnit(t.unit) || momInValue(t.value) || L.mom) return true;
    if (riskKind(t.name) && riskRole(t.name) !== "background" && (parseRiskDenominator(t.value) != null || parseRiskCategory(t.value))) return true;
    const dk = datingKind(t.name);
    return !!dk && dk !== "basis" && parseGaDays(t.value, Number) != null;
  });
}

/**
 * گذرِ ۲: کلیدِ کانالِ prenatal برای یک ردیف، یا null (ردیف به مسیرِ عادی می‌رود).
 * @returns {{kind:"marker", key:string, claimed_by:string, nameMom:boolean, nameUnit:string|null} | {kind:"risk", trisomy:string, role:string} | {kind:"dating", which:string} | null}
 */
export function prenatalClaim(t, sheetIsPrenatal, norm) {
  if (!t?.name) return null;
  const L = lookup(t.name, norm);
  const ext = { nameMom: L.mom, nameUnit: L.unit };
  if (L.strong && (L.strong !== "NT" || hasDigit(t.value))) return { kind: "marker", key: L.strong, claimed_by: "name", ...ext };
  const rk = riskKind(t.name);
  if (rk && (sheetIsPrenatal || parseRiskDenominator(t.value) != null)) return { kind: "risk", trisomy: rk, role: riskRole(t.name) };
  if (L.weak) {
    if (isMomUnit(t.unit) || momInValue(t.value) || L.mom) return { kind: "marker", key: L.weak, claimed_by: "mom_unit", ...ext };
    if (sheetIsPrenatal) return { kind: "marker", key: L.weak, claimed_by: "companion", ...ext };
    return null;
  }
  if (sheetIsPrenatal) {
    const dk = datingKind(t.name);
    if (dk) return { kind: "dating", which: dk };
  }
  return null;
}

/**
 * مقدارِ یک ردیفِ نشانگر → آیتم. MoM فقط وقتی واحد، مقدار یا نامِ ردیف «MoM» بگوید. «<0.2»، «>2.5» یا متن ⇒ ناخوانا،
 * هرگز عدد بی‌علامت (N30: «CRP <6» شش خوانده می‌شد). واحدِ چسبیده به مقدار («3.5 mm») یا نام («NT (mm)») خوانده می‌شود (P1).
 * @param {{nameMom?:boolean, nameUnit?:string|null}} ext
 */
export function prenatalItem(key, t, toNum, claimed_by, ext = {}) {
  const raw = String(t.value ?? "").trim();
  let unit = String(t.unit ?? "").trim() || null;
  const isMom = isMomUnit(unit) || momInValue(raw) || !!ext.nameMom;
  let body = raw.replace(/\bmom\b/ig, "").trim();
  const censored = /[<>≤≥]/.test(body);
  // «3.5 mm»: عدد + واحدِ کوتاه. هر متنِ دیگری ⇒ ناخوانا.
  const m = body.match(/^([\d.,٫۰-۹]+)\s*([A-Za-zµμ\/]{1,10})$/);
  if (m) { body = m[1]; unit = unit ?? m[2]; }
  if (!unit && ext.nameUnit) unit = ext.nameUnit;
  const n = censored || /[a-zA-Zء-ي]/.test(body.replace(/^[\d.,٫۰-۹\s]+/, "")) ? null : toNum(body);
  return {
    key, name: t.name, raw, unit: isMom ? "MoM" : unit,
    mom: isMom ? n : null,
    value: isMom ? null : n,
    readable: n != null,
    claimed_by,
  };
}
