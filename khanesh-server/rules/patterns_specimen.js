// ============================================================
// patterns_specimen.js — specs/014 مرحلهٔ ب (P87، بند ۱۴): قندِ مایعِ مغزی‌نخاعی و مایعِ پلور
// ------------------------------------------------------------
// تصمیمِ کاربر (۲۰۲۶-۱۰-۰۵): فقط زیرمجموعهٔ بی‌نیاز به داده — ردیفی که *نوعِ مایع در نامش* است.
//   • FL-C1: قندِ CSF < ۴۰ mg/dL یا نسبتِ CSF/سرم < ۰٫۴ ⇒ emergency («سازگار با»، نه تشخیص).
//   • FL-P3: قندِ پلور < ۴۰ mg/dL ⇒ soon + فهرستِ علت‌ها (N21).
//   متنِ اقدام: «به پزشکِ معالج/پرستارِ بخش اطلاع دهید» — مایع را در بیمارستان می‌کشند (N20).
//
// ⚠️ N3/P48 — واحد: قندِ ۳٫۵ mmol/L در CSF طبیعی است ولی «< ۴۰» را برآورده می‌کند. پس فقط:
//    واحدِ چاپ‌شدهٔ mg/dL یا mmol/L (×۱۸٫۰۱۶)، یا عددِ بی‌واحدی که در هر دو خوانش یکی است
//    (< ۲٫۲ ⇒ پایین در هر دو؛ ≥ ۴۰ ⇒ فقط mg/dL ممکن است). بازهٔ ۲٫۲ تا ۴۰ بی‌واحد = مبهم ⇒ نمره نمی‌گیرد.
// ⚠️ N4 — نسبت فقط با قندِ خونِ *همین برگه*؛ سه حالت: نسبتِ بد / نسبتِ خوب / قندِ خون نیست. هرگز «نسبت طبیعی».
// ⚠️ شیرخوار (< ۱ سال): آستانهٔ بزرگسال اعمال نمی‌شود (تصمیمِ ۵ باز است) ⇒ بی‌نمره.
// ⚠️ ردیفِ ۲۴ساعته هنوز بی‌قاعده است: آستانه‌های آن 📘اند یا به پرسش‌های بازِ P87 (U24-P2، …) بسته‌اند.
// ⚠️ ردیفِ بی‌نوعِ مایع (کدِ عددی) هرگز نمره نمی‌گیرد (F0).
// ============================================================

export const MGDL_PER_MMOL_GLUCOSE = 18.016;
const LOW_MGDL = 40;

const FA_DIGITS = { "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9", "٫": "." };
const toLatin = (s) => String(s ?? "").replace(/[۰-۹٠-٩٫]/g, (c) => FA_DIGITS[c]);

/** «30» / «30 mg/dL» / «2.1 mmol/L» ⇒ { v, unit }؛ هر چیزِ دیگر (<5، 1,200، متن) ⇒ null. */
function parseGlucose(item) {
  const m = toLatin(item?.raw).trim().match(/^(\d+(?:\.\d+)?)\s*(mg\s*\/\s*dl|mmol\s*\/\s*l)?$/i);
  if (!m) return null;
  const unitText = (m[2] || item?.unit || "").replace(/\s+/g, "").toLowerCase();
  const unit = unitText === "mg/dl" ? "mgdl" : unitText === "mmol/l" ? "mmol" : unitText ? "other" : null;
  return { v: Number(m[1]), unit };
}

/** وضعیتِ قند: { mgdl|null, low, certain } — certain یعنی مقدارِ mg/dL قطعی است (برای نسبت). */
export function glucoseState(item, thr = LOW_MGDL) {
  const p = parseGlucose(item);
  if (!p || p.unit === "other") return { mgdl: null, low: false, certain: false };
  const ambigFrom = thr / MGDL_PER_MMOL_GLUCOSE;
  if (p.unit === "mgdl") return { mgdl: p.v, low: p.v < thr, certain: true };
  if (p.unit === "mmol") { const mg = p.v * MGDL_PER_MMOL_GLUCOSE; return { mgdl: mg, low: mg < thr, certain: true }; }
  if (p.v < ambigFrom) return { mgdl: null, low: true, certain: false };    // پایین در هر دو خوانش
  if (p.v >= thr) return { mgdl: p.v, low: false, certain: true };       // فقط mg/dL ممکن است
  return { mgdl: null, low: false, certain: false };                          // مبهم ⇒ نمره نه
}

const fluidRows = (e, id, type) => (e.specimen?.fluid ?? []).filter((r) => r.id === id && r.fluid?.type === type);
const infant = (e) => typeof e.age === "number" && e.age < 1;

export const ACTION_EMERGENCY = "همین حالا این نتیجه را به پزشکِ معالج یا پرستارِ بخش اطلاع دهید. اگر بستری نیستید، فوراً به اورژانس مراجعه کنید.";
const ACTION_SOON = "در اسرع وقت، حداکثر ظرفِ ۲۴ تا ۴۸ ساعتِ آینده، این نتیجه را به پزشکِ معالج نشان دهید.";

const shown = (r) => `${String(r.raw).trim()}${r.unit && !/[a-z]/i.test(String(r.raw)) ? ` ${r.unit}` : ""}`;

// قندِ خونِ همین برگه (mg/dL که خودِ موتور نمره داده)؛ دو قندِ متفاوت ⇒ نسبت حساب نمی‌شود.
function serumGlucose(e) {
  const g = (e.graded ?? []).filter((x) => x.test === "GLU_F" || x.test === "GLU_RANDOM");
  return g.length === 1 ? g[0] : null;
}

// P87 تصمیمِ ۴ (۲۰۲۶-۱۰-۰۶، تصمیمِ کاربر): «همزمان» یعنی همین برگه، تا وقتی LIS زمانِ نمونه‌گیری را بدهد؛ جملهٔ زمان کنارِ هر نسبت.
const TIMING = "زمانِ نمونه‌گیریِ این دو روی برگه نیامده؛ اگر فاصلهٔ زیادی داشته‌اند، نسبت قابل‌اتکا نیست. ";
// 🔴 N4، اندازه‌گیری‌شده: با FBS + BS روی برگه (دو قندِ خون ⇒ serumGlucose null) متن می‌گفت «قندِ خون روی همین برگه نیست».
//   «نسبت حساب نشد» چهار علت دارد و هر کدام جملهٔ خودش را می‌گیرد؛ «روی برگه نیست» فقط برای غیابِ واقعی.
function noRatioSentence(e, fluidFa) {
  const g = (e.graded ?? []).filter((x) => x.test === "GLU_F" || x.test === "GLU_RANDOM");
  const tail = `پس نسبتِ ${fluidFa} به قندِ خون حساب نشد`;
  if (g.length > 1) return `روی این برگه ${g.length === 2 ? "دو" : g.length} قندِ خون چاپ شده است (${g.map((x) => x.value).join(" و ")}) و معلوم نیست کدام همزمان با مایع گرفته شده، ${tail}. `;
  if (g.length === 1) return `قندِ خونِ همین برگه ${g[0].value} است، ولی واحدِ قندِ مایع روشن نیست، ${tail}. `;
  if (e.ungraded?.GLU_F || e.ungraded?.GLU_RANDOM) return `قندِ خون روی برگه چاپ شده ولی واحدش روشن نیست، ${tail}. `;
  return null;
}

function cLow(e) {
  if (infant(e)) return null;
  const row = fluidRows(e, "FL_GLU", "csf")[0];
  if (!row) return null;
  const st = glucoseState(row);
  const sg = serumGlucose(e);
  const ratio = st.certain && st.mgdl != null && sg && sg.value > 0 ? st.mgdl / sg.value : null;
  const ratioLow = ratio != null && ratio < 0.4;
  if (!st.low && !ratioLow) return null;
  return { row, st, sg, ratio, ratioLow };
}

// دو ردیف (تصمیمِ کاربر ۲۰۲۶-۱۰-۰۶): < ۴۰ ⇒ soon (Light 1980: پارانومونیک/آمپیم/روماتوئید)، < ۶۰ ⇒ this_week (BTS/ACCP، علتِ گسترده).
function pLow(e) {
  if (infant(e)) return null;
  const row = fluidRows(e, "FL_GLU", "pleural")[0];
  if (!row) return null;
  const s40 = glucoseState(row, 40), s60 = glucoseState(row, 60);
  if (!s60.low) return null;
  const sg = serumGlucose(e);
  const ratio = s60.certain && s60.mgdl != null && sg && sg.value > 0 ? s60.mgdl / sg.value : null;
  return { row, tier40: s40.low, ratio, sg };
}

const csfLow = {
  id: "csf_glucose_low",
  match: (e) => cLow(e) != null,
  build: (e) => {
    const { row, st, ratio, ratioLow, sg } = cLow(e);
    const ratioSentence = ratio != null
      ? `نسبتِ قندِ CSF به قندِ خونِ همین برگه (${sg.value}) ${ratio.toFixed(2)} است${ratioLow ? " که کمتر از ۰٫۴ است" : " و کمتر از ۰٫۴ نیست؛ یعنی بخشی از پایین‌بودنِ قندِ CSF می‌تواند از پایین‌بودنِ قندِ خون باشد"}. ${TIMING}`
      : noRatioSentence(e, "قندِ CSF") ?? "قندِ خون روی همین برگه نیست، پس نسبتِ قندِ CSF به قندِ خون حساب نشد و نمی‌شود گفت قندِ پایین از خودِ مایع است یا از پایین‌بودنِ قندِ خون. ";
    return {
      pattern: "csf_glucose_low",
      urgency: "emergency",
      key_number: row.raw,
      explains: ["FL_GLU:csf"],
      headline: st.low ? "قندِ مایعِ مغزی‌نخاعی (CSF) پایین است" : "نسبتِ قندِ مایعِ مغزی‌نخاعی (CSF) به قندِ خون پایین است",
      must_say:
        `قندِ مایعِ مغزی‌نخاعی (CSF) روی برگهٔ شما ${shown(row)} است${st.low ? " که پایین است" : "؛ خودِ عدد از ۴۰ بالاتر است ولی نسبتش به قندِ خون پایین است"}. قندِ CSF کمتر از ۴۰ میلی‌گرم در دسی‌لیتر یا نسبتِ آن به قندِ خون کمتر از ۰٫۴ با عفونتِ پردهٔ مغز (مننژیتِ باکتریایی، سلی یا قارچی) سازگار است؛ این یک نشانه است و تشخیص نیست، و علت‌های دیگری مثل خونریزی زیرعنکبوتیه یا درگیریِ سرطانیِ پرده‌ها هم دارد. ` +
        ratioSentence +
        "پزشک این عدد را کنارِ شمارشِ سلول‌ها، پروتئین، کشتِ همین مایع و علائمِ شما می‌خواند.",
      action: ACTION_EMERGENCY,
      suggest: [],
      warnings: [],
    };
  },
};

const pleuralLow = {
  id: "pleural_glucose_low",
  match: (e) => pLow(e) != null,
  build: (e) => {
    const { row, tier40, ratio, sg } = pLow(e);
    const ratioSentence = ratio != null
      ? `نسبتِ قندِ مایع به قندِ خونِ همین برگه (${sg.value}) ${ratio.toFixed(2)} است${ratio < 0.5 ? " که کمتر از ۰٫۵ است" : " و کمتر از ۰٫۵ نیست؛ در بیمارِ دیابتی یا با قندِ خونِ بالا، قندِ مایع ممکن است مطلق پایین نباشد ولی نسبت پایین باشد"}. ${TIMING}`
      : noRatioSentence(e, "قندِ مایع") ?? "قندِ خون روی همین برگه نیست، پس نسبتِ قندِ مایع به قندِ خون حساب نشد. ";
    return {
      pattern: "pleural_glucose_low",
      urgency: tier40 ? "soon" : "this_week",
      key_number: row.raw,
      explains: ["FL_GLU:pleural"],
      headline: tier40 ? "قندِ مایعِ پلور پایین است" : "قندِ مایعِ پلور کمی پایین است",
      must_say: tier40
        ? `قندِ مایعِ پلور (اطرافِ ریه) روی برگهٔ شما ${shown(row)} است که پایین است. قندِ پایینِ مایعِ پلور (کمتر از ۴۰ میلی‌گرم در دسی‌لیتر) با چند وضعیت سازگار است: عفونتِ همراهِ ذات‌الریه که مایع را درگیر کرده (پارانومونیکِ عارضه‌دار یا آمپیم)، پلوریتِ روماتوئید، سل و بدخیمی؛ این عدد به‌تنهایی نمی‌گوید کدام‌یک است و تشخیص نیست. ` +
          ratioSentence + "پزشک آن را کنارِ pH و پروتئین و LDHِ مایع، شمارشِ سلول‌ها، کشت و تصویربرداری می‌خواند."
        : `قندِ مایعِ پلور (اطرافِ ریه) روی برگهٔ شما ${shown(row)} است که کمتر از ۶۰ میلی‌گرم در دسی‌لیتر و کمی پایین است. این محدوده علت‌های گسترده‌ای دارد: عفونتِ همراهِ ذات‌الریه، سل، بدخیمی، پلوریتِ روماتوئید یا لوپوسی و، به‌ندرت، پارگیِ مری؛ این عدد به‌تنهایی نمی‌گوید کدام‌یک است و تشخیص نیست. ` +
          ratioSentence + "pH مایع و کنارِ آن پروتئین، LDH، شمارشِ سلول‌ها و کشت به پزشک کمک می‌کند.",
      action: tier40 ? ACTION_SOON : "این هفته با پزشکِ معالج مطرح کنید.",
      suggest: [],
      warnings: [],
    };
  },
};

// ═══════════ بندِ ۱۴ (دورِ دوم، ۲۰۲۶-۱۰-۰۶): پروتئینِ ۲۴ساعتهٔ بارداری، کلسیمِ ۲۴ساعته، آسیت ═══════════
const num = (x) => { const m = toLatin(x).trim().match(/^(\d+(?:\.\d+)?)\s*(.*)$/); return m ? { v: Number(m[1]), tail: m[2].trim() } : null; };
const normUnit = (u) => String(u ?? "").replace(/\s+/g, "").toLowerCase().replace(/µ|μ/g, "u");
const rangeUpper = (g) => { const n = String(g?.range ?? "").match(/[\d.]+/g); return n && n.length >= 2 ? Number(n[n.length - 1]) : null; };
const gv = (e, key) => (e.graded ?? []).find((x) => x.test === key) ?? null;

/** مقدار با واحدِ *چاپ‌شده* (از ستونِ unit یا دنبالِ مقدار)؛ بی‌واحد یا ناشناخته ⇒ null (P48). conv: [[واحدِ نرمال‌شده, ضریب]] */
function qty(item, conv) {
  const q = num(item?.raw);
  if (!q) return null;
  const unit = normUnit(q.tail || item?.unit);
  for (const [u, k] of conv) if (unit === u) return q.v * k;
  return null;
}
const DAY = ["/24h", "/24hr", "/24hrs", "/24hour", "/24hours", "/day", "/d"];
const conv24 = (base, k) => DAY.map((d) => [base + d, k]);

// ── U24-P2: پروتئینِ ۲۴ساعتهٔ بارداری — فقط وقتی بارداری اعلام شده؛ ≥ ۳۰۰ mg/24h معیارِ پروتئینوری (ACOG 2013)
const PREG_PROT_MG = 300;
function pregProt(e) {
  if (e.pregnant !== true) return null;
  const row = (e.specimen?.u24 ?? []).find((r) => r.id === "U24_PROT");
  const mg = row && qty(row, [...conv24("mg", 1), ...conv24("g", 1000)]);
  if (mg == null || mg < PREG_PROT_MG) return null;
  const feats = [];
  const plt = gv(e, "PLT"); if (plt && plt.value < 100) feats.push(`پلاکت ${plt.value}`);
  const cr = gv(e, "CREAT"); if (cr && cr.value > 1.1) feats.push(`کراتینین ${cr.value}`);
  for (const k of ["ALT", "AST"]) { const g = gv(e, k), u = rangeUpper(g); if (g && u && g.value > 2 * u) feats.push(`${k} ${g.value} (حدِ بالای آزمایشگاه ${u})`); }
  return { row, mg, feats };
}
const pregProteinuria = {
  id: "pregnancy_proteinuria_24h",
  match: (e) => pregProt(e) != null,
  build: (e) => {
    const { row, feats } = pregProt(e);
    const severe = feats.length > 0;
    return {
      pattern: "pregnancy_proteinuria_24h",
      urgency: severe ? "emergency" : "soon",
      key_number: row.raw,
      explains: ["U24_PROT:"],
      headline: severe ? "پروتئینِ ادرار ۲۴ساعته همراه با نشانه‌های شدید در بارداری" : "پروتئینِ ادرار ۲۴ساعتهٔ شما در حدِ معیارِ پروتئینوریِ بارداری است",
      must_say:
        `پروتئینِ ادرار ۲۴ساعته روی برگهٔ شما ${shown(row)} است. در بارداری، ۳۰۰ میلی‌گرم در ۲۴ ساعت یا بیشتر معیارِ پروتئینوری است. ` +
        (severe ? `کنارِ آن این مقادیر هم در حدِ نشانه‌های شدید است: ${feats.join("؛ ")}. این یعنی ارزیابیِ فوری لازم است. ` : "") +
        "این عدد به‌تنهایی تشخیصِ پره‌اکلامپسی نیست، چون فشارِ خون و علائم را موتور نمی‌بیند و باید پزشک یا ماما بسنجد. " +
        "اگر جمع‌آوریِ ادرار ناقص بوده، مقدارِ واقعی کمتر از این عدد نیست؛ پس ناقص‌بودن آن را بی‌اهمیت نمی‌کند.",
      action: severe
        ? "فوراً و بدون اتلاف وقت به اورژانس مراجعه کنید و این نتیجه را به پزشک یا ماما نشان دهید."
        : "در اسرع وقت، حداکثر ظرفِ ۲۴ تا ۴۸ ساعتِ آینده، این نتیجه را به پزشک یا ماما نشان دهید تا فشارِ خونتان سنجیده شود.",
      suggest: [], warnings: [],
    };
  },
};

// ── U24-CA: حذف شد (P87 تصمیمِ ۸، ۲۰۲۶-۱۰-۰۶). «Urine Ca/24h» حالا همان U_CA است (adapter.js) و حدِ Mayo در refs.js uCaRef؛
//    یافته را urine_calcium_abnormal در patterns_mineral_bone.js می‌سازد — یک هویت، یک آستانه، یک فوریت. گارد U20.

// ── FL-A2: آسیت — Runyon: دو معیار از سه (پروتئین > ۱ g/dL، قند < ۵۰ mg/dL، LDH > حدِ بالای سرم)
// بدونِ PMN فقط «سازگار با»؛ هر معیار سه‌حالته: برقرار / برقرار نیست / سنجیده نشد (N4).
function ascitesCriteria(e) {
  const row = (id) => fluidRows(e, id, "ascites")[0] ?? null;
  const p = row("FL_PROT"), g = row("FL_GLU"), l = row("FL_LDH");
  const protG = p && qty(p, [["g/dl", 1], ["g/l", 0.1], ["mg/dl", 0.001]]);
  const gs = g && glucoseState(g, 50);
  const gluMet = !g ? null : (gs.low ? true : gs.certain ? false : null);
  const ldhUln = rangeUpper(gv(e, "LDH"));
  const lq = l && num(l.raw);
  const lUnit = lq && normUnit(lq.tail || l.unit);
  const ldhOk = lq && ldhUln && (lUnit === "" || /^(u|iu)\/l$/.test(lUnit));
  const st = (rowObj, met) => !rowObj ? "absent" : met == null ? "unknown" : met ? "met" : "not";
  return {
    rows: { p, g, l },
    prot: st(p, protG == null ? null : protG > 1),
    glu: st(g, gluMet),
    ldh: st(l, ldhOk ? lq.v > ldhUln : null),
  };
}
const ascitesRunyon = {
  id: "ascites_runyon_pattern",
  match: (e) => { if (infant(e)) return false; const c = ascitesCriteria(e); return [c.prot, c.glu, c.ldh].filter((x) => x === "met").length >= 2; },
  build: (e) => {
    const c = ascitesCriteria(e);
    const S = { met: "برقرار است", not: "برقرار نیست", unknown: "به‌دلیلِ واحد یا مقدار قابلِ سنجش نبود", absent: "روی برگه نیست" };
    const fa = (st, what) => `${what}: ${S[st]}`;
    const used = Object.values(c.rows).filter(Boolean).map((r) => `${r.id}:ascites`);
    return {
      pattern: "ascites_runyon_pattern",
      urgency: "soon",
      explains: used,
      headline: "الگوی مایعِ آسیت با عفونتِ ثانویهٔ مایع سازگار است",
      must_say:
        "از سه معیارِ بررسیِ مایعِ آسیت، دست‌کم دو معیار در برگهٔ شما برقرار است. " +
        [fa(c.prot, "پروتئینِ مایع بیش از ۱ گرم در دسی‌لیتر"), fa(c.glu, "قندِ مایع کمتر از ۵۰ میلی‌گرم در دسی‌لیتر"), fa(c.ldh, "LDHِ مایع بالاتر از حدِ بالای سرمِ همین برگه")].join("؛ ") + ". " +
        "این الگو با پریتونیتِ ثانویه (عفونتِ مایعِ شکم به‌علتِ مشکلی در خودِ شکم) سازگار است ولی تشخیص نیست: شمارشِ سلول‌های مایع (PMN) روی برگه نیست و همین شمارش لازم است. " +
        "پروتئین و LDHِ بالا در آسیتِ ناشی از سرطان یا نارسایی قلبی هم دیده می‌شود.",
      action: "در اسرع وقت، حداکثر ظرفِ ۲۴ تا ۴۸ ساعتِ آینده، این نتیجه را به پزشکِ معالج نشان دهید و شمارشِ PMN مایع را بخواهید.",
      suggest: [], warnings: [],
    };
  },
};

export const RULES_SPECIMEN = [csfLow, pleuralLow, pregProteinuria, ascitesRunyon];
