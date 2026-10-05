// ============================================================
// specimen.js — specs/014 (مرحلهٔ الف، P87): هویتِ ردیف‌های ادرارِ ۲۴ساعته و مایعاتِ بدن
// ------------------------------------------------------------
// فقط «شناختن». هیچ حکمِ بالینی، هیچ آستانه، هیچ عددِ مشتق‌شده (نسبت، گرادیان، کلیرانس) این‌جا نیست —
// قواعدِ سندِ RULES_urine24h_body_fluids.md همه در MEDICAL_RULES.md (P87) «در انتظار بازبینی»‌اند.
//
// 🔴 چرا کانالِ جدا (N25، اندازه‌گیری‌شده ۲۰۲۶-۱۰-۰۵ روی 8e0d769): خروجیِ LIS بیمارستانی
//    («Urine Prot/24h»، «Fluid LDH»، …) کلاً unmapped بود (N2/N28). ولی ایمنیِ «مایع هرگز سرم خوانده
//    نمی‌شود» تصادفی بود: فقط چون NAME_MAP این املاها را نداشت. ادعا *پیش از* NAME_MAP/resolveAlias
//    اجرا می‌شود تا هیچ قاعدهٔ املایی «LDH مایع» را روی کلیدِ LDHِ سرم ننشاند.
//
// قاعدهٔ ادعا (research R1–R3):
//   • ۲۴ساعته: نشانهٔ ۲۴ساعت در نام + آنالیتِ ادرار (پروتئین/کراتینین/اوره/کلسیم/اسید اوریک/حجم)؛
//     یا نامِ برهنهٔ «Urine Protein/Creatinine/Volume» فقط با شاهدِ ۲۴ساعت (واحدِ /24h روی ردیف یا ردیفِ ۲۴ساعتهٔ دیگر).
//   • مایع: واژهٔ مایع/نوعِ مایع در نام + قند/پروتئین/LDH؛ یا ردیفِ «Fluid Type».
//   • ردیفی که mapKey امروز می‌شناسد هرگز ادعا نمی‌شود (۲۴h urine calcium ⇒ U_CA، محورِ معدنی دست‌نخورده — FR-014)،
//     جز همان نام‌های برهنهٔ ادرار که امروز نه NAME_MAP دارند نه خواننده.
// ⚠️ هیچ patterns_*.js این کانال را نمی‌خواند (گارد U14) — خواننده فقط پس از تأییدِ P87.
// ============================================================

export const SPECIMEN_FA = Object.freeze({
  U24_VOL: "حجم ادرار ۲۴ساعته",
  U24_PROT: "پروتئین ادرار ۲۴ساعته",
  U24_CREAT: "کراتینین ادرار ۲۴ساعته",
  U24_UREA: "اورهٔ ادرار ۲۴ساعته",
  U24_CA: "کلسیم ادرار ۲۴ساعته",
  U24_URIC: "اسید اوریک ادرار ۲۴ساعته",
  U24_ALB: "آلبومین ادرار ۲۴ساعته (میکروآلبومین)",
  FL_GLU: "قند مایع",
  FL_PROT: "پروتئین مایع",
  FL_LDH: "LDH مایع",
  FL_TYPE: "نوع مایع",
});

export const FLUID_TYPE_FA = Object.freeze({
  pleural: "مایع پلور", ascites: "مایع آسیت", csf: "مایع مغزی‌نخاعی",
  synovial: "مایع مفصل", pericardial: "مایع پریکارد", other: "مایع دیگر",
});

// ---------- ۲۴ساعته ----------
// نشانه‌های ۲۴ساعت روی نامِ نرمال‌شده (norm() «/» و فاصله را حذف می‌کند: «Urine Cr/24h» ⇒ «urinecr24h»).
const H24 = /(24hours|24hour|24hrs|24hr|24h|۲۴ساعته|24ساعته|۲۴ساعت|24ساعت)/g;
const URINE_TOK = /(urinary|urine|ادرار)/g;
const U24_ANALYTE = Object.freeze({
  prot: "U24_PROT", protein: "U24_PROT", totalprotein: "U24_PROT", proteinuria: "U24_PROT", upro: "U24_PROT", پروتئین: "U24_PROT",
  cr: "U24_CREAT", creat: "U24_CREAT", crea: "U24_CREAT", creatinine: "U24_CREAT", creatinin: "U24_CREAT", کراتینین: "U24_CREAT",
  urea: "U24_UREA", uun: "U24_UREA", ureanitrogen: "U24_UREA", اوره: "U24_UREA",
  ca: "U24_CA", calcium: "U24_CA", کلسیم: "U24_CA",
  ua: "U24_URIC", uric: "U24_URIC", uricacid: "U24_URIC", urate: "U24_URIC", اسیداوریک: "U24_URIC", اوریکاسید: "U24_URIC",
  vol: "U24_VOL", volume: "U24_VOL", totalvolume: "U24_VOL", حجم: "U24_VOL",
  // بازبینیِ کد (LOW): «Microalbumin 24h» unmapped بود. فقط شناختن؛ نه ACR (نقاطِ برشِ KDIGO برای نسبت‌اند، adapter.js NAME_MAP) و نه ALBِ سرم.
  alb: "U24_ALB", albumin: "U24_ALB", microalbumin: "U24_ALB", malb: "U24_ALB", آلبومین: "U24_ALB", میکروآلبومین: "U24_ALB",
  proteintotal: "U24_PROT",
});
// نام‌های برهنه که فقط با شاهدِ ۲۴ساعت ادعا می‌شوند (R1-ب). «Volume» تنها عمداً نیست: صفحهٔ منی هم «Volume» دارد (N25).
const U24_BARE = Object.freeze({
  urineprotein: "U24_PROT", urineprot: "U24_PROT", urinecreatinine: "U24_CREAT", urinecr: "U24_CREAT",
  urinevolume: "U24_VOL", urinevol: "U24_VOL",
});
// واحدِ ۲۴ساعته: «mg/24h»، «g/24 hr»، «mL/day»، «g/d». «mg/dL» هرگز (پایانِ dl ≠ d).
const UNIT_24H = /\/\s*24\s*(h|hr|hrs|hour|hours|ساعت)?\b|\b24\s*h(r|rs|our)?\b|\/\s*(d|day)\s*$/i;

const NUMERIC_VALUE = /^\s*[<>≤≥]?\s*[\d۰-۹٠-٩][\d۰-۹٠-٩.,٫]*\s*([a-zA-Zµμ/%]+[\w/]*)?\s*$/;
/** ردیفِ برهنهٔ ادرار (Urine Protein/Creatinine/Volume) — mergePages شکلِ مقدارش را در کلید می‌گذارد (MEDIUM #3، N25). */
export function bareUrineShape(name, value, norm) {
  if (!U24_BARE[norm(name)]) return "";
  return NUMERIC_VALUE.test(String(value ?? "")) ? ":num" : ":grade";
}

function u24ByName(n) {
  if (!n.match(H24)) return null;
  const rem = n.replace(H24, "").replace(URINE_TOK, "").replace(/(excretion|collection|دفع|ساعته)/g, "").replace(/[,،:;]/g, "");
  // «ucr24h»/«uprot24h»: پیشوندِ u فقط وقتی برداشته می‌شود که خودِ باقی‌مانده آنالیت نباشد («uricacid» ≠ «ricacid»).
  return U24_ANALYTE[rem] ?? (rem.startsWith("u") ? U24_ANALYTE[rem.slice(1)] : undefined) ?? null;
}

// ---------- مایع ----------
// طولانی‌تر اول، تا «pleuralfluid» یک‌جا برود.
const FLUID_TOK = /(cerebrospinalfluid|cerebrospinal|bodyfluid|pleuralfluid|asciticfluid|peritonealfluid|synovialfluid|pericardialfluid|jointfluid|pleural|pleura|ascitic|ascites|peritoneal|synovial|pericardial|joint|csf|fluid|مایعمغزینخاعی|مغزینخاعی|مایع|پلور|آسیت|صفاق|مفصل|پریکارد)/g;
const FL_ANALYTE = Object.freeze({
  glu: "FL_GLU", glucose: "FL_GLU", sugar: "FL_GLU", bs: "FL_GLU", قند: "FL_GLU", گلوکز: "FL_GLU",
  prot: "FL_PROT", protein: "FL_PROT", totalprotein: "FL_PROT", proteintotal: "FL_PROT", tp: "FL_PROT", پروتئین: "FL_PROT",
  ldh: "FL_LDH", lactatedehydrogenase: "FL_LDH", لاکتاتدهیدروژناز: "FL_LDH",
  type: "FL_TYPE", نوع: "FL_TYPE", typeof: "FL_TYPE",
});

function typeFromText(s) {
  const t = String(s ?? "").toLowerCase().replace(/\s+/g, "");
  if (/pleur|پلور/.test(t)) return "pleural";
  if (/ascit|periton|آسیت|صفاق/.test(t)) return "ascites";
  if (/csf|cerebrospinal|مغزی/.test(t)) return "csf";
  if (/synov|joint|مفصل/.test(t)) return "synovial";
  if (/pericard|پریکارد/.test(t)) return "pericardial";
  return null;
}

/** نوعِ مایع از نامِ ردیف یا مقدارِ ردیفِ «Fluid Type». کدِ عددی ⇒ نامعلوم (جدولِ کد — D1 — در دست نیست). */
export function fluidTypeOf(name, value) {
  const fromName = typeFromText(name);
  if (fromName) return { type: fromName };
  if (value == null || String(value).trim() === "") return null;
  const fromValue = typeFromText(value);
  if (fromValue) return { type: fromValue };
  if (/^[\s\d۰-۹٠-٩]+$/.test(String(value))) return { type: "unknown", code: String(value).trim() };
  // بازبینیِ کد (LOW): «Fluid Type: Serum» برچسبِ «مایع دیگر» می‌گرفت — ادعایی که برگه نکرده. متنِ چاپ‌شده همان‌طور برمی‌گردد.
  return { type: "other", text: String(value).trim().slice(0, 40) };
}

function fluidByName(n) {
  if (!n.match(FLUID_TOK)) return null;
  // norm() ویرگول را نگه می‌دارد: «Glucose, CSF» ⇒ «glucose,csf» (بازبینیِ کد، LOW).
  const rem = n.replace(FLUID_TOK, "").replace(/[,،:;]/g, "");
  return FL_ANALYTE[rem] ?? null;
}

/** شاهدِ سطحِ برگه، پیش از حلقهٔ ردیف (شکلِ isPrenatalSheet). */
// 🔴 بازبینیِ کد (HIGH #1): شاهدِ ۲۴ساعت فقط از ردیفی که خودش به‌نام ادعا می‌شود (R1-الف، نه mapKeyدار) و فقط روی *همان صفحه*.
//    پیش از این «Calcium 24h urine» (همان U_CA) یا «Sodium 140 mEq/d» شاهد می‌شد و «Urine Protein 3+»ِ صفحهٔ آزمایشِ ادرار
//    ۲۴ساعته خوانده می‌شد ⇒ proteinuria_pattern/nephrotic_pattern ناپدید (N18). واحدِ ۲۴ساعته فقط روی *خودِ* ردیفِ برهنه شاهد است.
export function specimenSheetEvidence(tests, norm, mapKey) {
  let u24 = false, fluidTypeRow = false, fluidType = null;
  const u24Pages = new Set();
  for (const t of tests || []) {
    if (!t?.name) continue;
    const n = norm(t.name);
    if (u24ByName(n) && !(mapKey && mapKey(n))) { u24 = true; u24Pages.add(t._page ?? 0); }
    if (fluidByName(n) === "FL_TYPE") {
      fluidTypeRow = true;
      if (!fluidType) fluidType = fluidTypeOf("", t.value);
    }
  }
  return { u24, u24Pages, fluidTypeRow, fluidType };
}

/**
 * ادعای یک ردیف. null یعنی «مالِ این کانال نیست» — ردیف همان راهِ امروز را می‌رود.
 * `mapKey` از adapter می‌آید (R3): ردیفی که موتور امروز می‌شناسد دزدیده نمی‌شود.
 */
export function specimenClaim(row, evidence, norm, mapKey) {
  if (!row?.name) return null;
  const n = norm(row.name);
  const bare = U24_BARE[n];
  if (bare) {
    // فقط مقدارِ عددی: درجهٔ نوار («3+»، «Trace»، «Negative») هرگز مقدارِ ۲۴ساعته نیست (HIGH #1).
    if (!NUMERIC_VALUE.test(String(row.value ?? ""))) return null;
    const samePage = evidence?.u24Pages?.has(row._page ?? 0);
    return (samePage || UNIT_24H.test(String(row.unit ?? ""))) ? { id: bare, claimed_by: "evidence" } : null;
  }
  const u = u24ByName(n);
  const f = u ? null : fluidByName(n);
  if (!u && !f) return null;
  if (mapKey(n)) return null;
  if (u) return { id: u, claimed_by: "name" };
  if (f === "FL_TYPE") return { id: f, claimed_by: "name", fluid: fluidTypeOf("", row.value) ?? { type: "unknown", code: "" } };
  const fluid = fluidTypeOf(row.name, null) ?? evidence?.fluidType ?? null;
  return { id: f, claimed_by: "name", fluid };
}

/** نام‌های برهنهٔ قند/پروتئین/LDH که کنارِ ردیفِ «Fluid Type» سرم خوانده شدند (R6 — فقط احتیاط) ← هویتِ مایعِ هم‌آنالیت.
 *  ⚠️ اگر همان آنالیت با نامِ مایع روی برگه هست (درخواستِ ۲۸: «Fluid LDH» + «LDH»)، ردیفِ برهنه همان جفتِ سرمی است و احتیاط نمی‌گیرد. */
export const BARE_FLUID_LOOKALIKES = Object.freeze({
  glucose: "FL_GLU", glu: "FL_GLU", bs: "FL_GLU", sugar: "FL_GLU", قند: "FL_GLU",
  protein: "FL_PROT", totalprotein: "FL_PROT", tp: "FL_PROT", ldh: "FL_LDH",
});
