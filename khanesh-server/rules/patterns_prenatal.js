// ============================================================
// patterns_prenatal.js — specs/013: غربالگریِ سرمِ مادر — دابل مارکر (سه‌ماههٔ اول) و کوآد مارکر (سه‌ماههٔ دوم)
// ------------------------------------------------------------
// ورودی: کانالِ جدای e.prenatal (adapter.js + prenatal.js)؛ هیچ‌کدام نمره نمی‌گیرد، هیچ MoM یا خطری
// بازمحاسبه نمی‌شود (FR-003). خطر و دستهٔ چاپ‌شدهٔ آزمایشگاه مقدم است (FR-011).
//
// ⚠️ فقط آستانه‌هایی که سندِ مرجعِ کاربر (۲۰۲۶-۱۰-۰۴) با ✅ آورده اجرا می‌شوند:
//    NT ≥ 3.0 mm · PAPP-A < 0.4 MoM · الگوی T21ِ سه‌ماههٔ اول (free β-hCG > 1.5 و PAPP-A < 0.5 و NT بالا) ·
//    AFP ≥ 2.5 MoM (NTD) · AFP < 0.5 · uE3 < 0.5 و ≤ 0.10 · Inhibin A ≥ 2.0 ·
//    بازه‌های FMF (> 1:100 پرخطر، 1:100 تا 1:1000 واسط، < 1:1000 کم‌خطر) · کوآد T21 1:270 و T18 1:100 ·
//    پنجره‌ها 9+0–13+6 و 15–22 هفته · اختلافِ تعیینِ سن > ۱۰ روز.
//    هر چیزِ ⚠️ (بازهٔ 0.5–2.0 برای یک نشانگر، hCG بالا 2 یا 3، مرزهای T18/T13/ترنر/تریپلوئیدی از MoM، آستانهٔ خطرِ
//    T18/T13 در سه‌ماههٔ اول، آسپیرین، پروتکلِ پیگیریِ PAPP-A پایین) فقط نام برده می‌شود — MEDICAL_RULES.md، P81.
// ⚠️ سطحِ «soon» برای خطرِ بالای T18/T13 تصمیمِ مالک است (spec، پرسش ۱)، نه منبع — همان P81.
// ⚠️ هیچ یافته‌ای «اورژانس» نیست و هیچ‌کدام حکمِ بیماری نمی‌دهد: هر متن «غربالگری است، نه تشخیص» دارد (FR-007).
// ⚠️ N4: نشانگرِ غایب «طبیعی» نیست — نامش در جملهٔ «روی برگه نیامده» می‌آید.
// ⚠️ N20: جملهٔ زمان‌بندی فقط از ACTION[urgency] ساخته می‌شود.
// ============================================================
import { faName } from "./names.js";
import { FTS_KEYS, QUAD_KEYS, PRENATAL_KEYS } from "./prenatal.js";

// نامِ فارسیِ هر کلید یک‌بار — تا هیچ کلیدِ خامی به‌صورتِ رشته در متنِ بیمار نیاید (M38، N8).
const FA = Object.fromEntries(PRENATAL_KEYS.map((k) => [k, faName(k)]));
const [FBHCG, PAPPA, NT, AFP_MAT, UE3] = PRENATAL_KEYS;

export const SCREENING_LINE = "این نتیجهٔ غربالگری است، نه تشخیص؛ پاسخِ قطعی فقط از آزمونِ تشخیصی به دست می‌آید.";

const ACTION = {
  soon: "در اسرع وقت، حداکثر ظرفِ ۲۴ تا ۴۸ ساعتِ آینده، با پزشک مطرح کنید.",
  this_week: "این هفته با پزشک مطرح کنید.",
  routine: "در نوبتِ عادی با پزشک مطرح کنید.",
};

const DIAGNOSTIC_FA =
  "پاسخِ قطعی با آزمونِ تشخیصی به دست می‌آید: نمونه‌برداری از پرزهای جفتی (CVS) در هفتهٔ ۱۰ تا ۱۳ یا آمنیوسنتز از هفتهٔ ۱۵ به بعد، " +
  "که معمولاً با ریزآرایهٔ کروموزومی (CMA) بررسی می‌شود. آزمایشِ DNAِ آزادِ جنین در خونِ مادر (cfDNA/NIPT) هم گزینه‌ای است که مشاورِ ژنتیک دربارهٔ آن تصمیم می‌گیرد؛ آن هم غربالگری است، نه تشخیص.";

const pn = (e) => e?.prenatal ?? { markers: {}, risk: {}, dating: {} };
const item = (e, k) => pn(e).markers?.[k] ?? null;
const momOf = (e, k) => { const it = item(e, k); return it?.readable && it.mom != null ? it.mom : null; };
// عدد همان‌طور که روی برگه چاپ شده («1.0»، «0,45») — نه عددِ تجزیه‌شده (N5).
// فقط خودِ عدد — نه واحدِ چسبیده، نه متنِ دیگرِ ردیف («3.5 mm» ⇒ «3.5»).
const pr = (e, k) => (String(item(e, k)?.raw ?? "").match(/^[\d.,٫۰-۹]+/) ?? [""])[0];

// 🔴 بازبینیِ کد P2: متنِ خامِ OCR (قابلِ کنترل توسطِ سازندهٔ برگه) هرگز به must_say — که به مدل می‌رسد — کپی نمی‌شود
//    (notes.md). فقط عددِ تجزیه‌شده/دستهٔ بستهٔ خودِ موتور و واحدِ کوتاهِ لاتین نقل می‌شود.
const safeUnit = (u) => (/^[A-Za-zµμ\/.]{1,12}$/.test(String(u ?? "")) ? String(u) : "");
const hasAny = (e) => Object.keys(pn(e).markers ?? {}).length > 0 || Object.keys(pn(e).risk ?? {}).length > 0;

// پرسش ۵: پروفایلِ مرد یا کودک ⇒ هیچ تفسیری؛ فقط یک جملهٔ ناهم‌خوانی.
const profileMismatch = (e) => hasAny(e) && (e.sex === "M" || (typeof e.age === "number" && e.age < 16));
const active = (e) => hasAny(e) && !profileMismatch(e);

// NT فقط با واحدِ میلی‌متر با آستانه سنجیده می‌شود (N3: بی‌واحد ممکن است MoM باشد).
const ntMm = (e) => {
  const it = item(e, "NT");
  if (!it?.readable || it.value == null) return null;
  return /^(mm|میلی\s*متر|میلی‌متر)$/i.test(String(it.unit ?? "").trim()) ? it.value : null;
};
const ntRaised = (e) => { const v = ntMm(e); return v != null && v >= 3.0; };

// شاخهٔ هر برگه: از نشانگرهای حاضر، وگرنه از سنِ بارداریِ چاپ‌شده.
function arms(e) {
  const m = pn(e).markers ?? {};
  const fts = FTS_KEYS.some((k) => m[k]);
  const quad = ["AFP_MAT", "UE3", "INHA"].some((k) => m[k]);
  const ga = gaDays(e);
  return {
    fts: fts || (!quad && ga != null && ga <= 13 * 7 + 6),
    quad: quad || (!fts && ga != null && ga >= 14 * 7),
  };
}

// ── سنِ بارداری (فقط از برگه، پرسش ۲) ──
function gaDays(e) {
  const d = pn(e).dating ?? {};
  return d.ga_us?.days ?? d.ga?.days ?? d.ga_lmp?.days ?? null;
}
const FTS_WINDOW = [9 * 7, 13 * 7 + 6];
const QUAD_WINDOW = [15 * 7, 22 * 7 + 6];
const gaFa = (days) => `${Math.floor(days / 7)} هفته و ${days % 7} روز`;

function datingProblems(e) {
  const d = pn(e).dating ?? {};
  const ga = gaDays(e);
  const a = arms(e);
  const out = [];
  if (ga != null) {
    if (a.fts && FTS_KEYS.some((k) => item(e, k) && k !== "NT") && (ga < FTS_WINDOW[0] || ga > FTS_WINDOW[1])) {
      out.push(`سنِ بارداریِ چاپ‌شده (${gaFa(ga)}) بیرون از بازهٔ مجازِ نمونه‌گیریِ دابل مارکر (هفتهٔ ۹ تا ۱۳ و ۶ روز) است.`);
    }
    if (a.fts && item(e, "NT") && (ga < 11 * 7 || ga > FTS_WINDOW[1])) {
      out.push(`سنِ بارداریِ چاپ‌شده (${gaFa(ga)}) بیرون از بازهٔ اندازه‌گیریِ NT (هفتهٔ ۱۱ تا ۱۳ و ۶ روز) است.`);
    }
    if (a.quad && (ga < QUAD_WINDOW[0] || ga > QUAD_WINDOW[1])) {
      out.push(`سنِ بارداریِ چاپ‌شده (${gaFa(ga)}) بیرون از بازهٔ مجازِ کوآد مارکر (هفتهٔ ۱۵ تا ۲۲) است.`);
    }
  }
  if (d.ga_us?.days != null && d.ga_lmp?.days != null && Math.abs(d.ga_us.days - d.ga_lmp.days) > 10) {
    out.push(`سنِ بارداری بر پایهٔ سونوگرافی و بر پایهٔ تاریخِ آخرین قاعدگی ${Math.abs(d.ga_us.days - d.ga_lmp.days)} روز با هم فرق دارد (بیش از ۱۰ روز).`);
  }
  const basis = String(d.basis_raw ?? "");
  if (basis && /lmp|قاعدگی/i.test(basis) && !/\b(us|crl|sono)|سونو/i.test(basis)) {
    out.push("مبنای تعیینِ سنِ بارداری روی برگه «تاریخِ آخرین قاعدگی» است، نه سونوگرافی (CRL).");
  }
  return out;
}

// ── خطرِ چاپ‌شده: یک طبقه‌بند، یک برچسب (شکلِ mineralAxis) ──
const TRISOMY_FA = { T21: "تریزومی ۲۱ (سندرم داون)", T18: "تریزومی ۱۸ (سندرم ادواردز)", T13: "تریزومی ۱۳ (سندرم پاتو)", NTD: "نقصِ لولهٔ عصبی" };
function riskTier(e, tri, r) {
  if (r.category) return r.category;                     // دستهٔ خودِ آزمایشگاه مقدم است (FR-011)
  const d = r.denominator;
  if (d == null) return null;
  const a = arms(e);
  if (a.fts && a.quad) return null;                      // برگهٔ ترکیبی: نمی‌دانیم کدام برش — فقط نقل
  if (tri === "T21" && a.fts) return d <= 100 ? "high" : d <= 1000 ? "intermediate" : "low";   // FMF ✅
  if (tri === "T21" && a.quad) return d <= 270 ? "high" : "low";                             // کوآد ✅
  if (tri === "T18" && a.quad) return d <= 100 ? "high" : "low";                             // کوآد ✅
  return null;                                           // T18/T13ِ سه‌ماههٔ اول: آستانه ⚠️ (P81) — فقط نقل
}
// NTDِ پرخطر را prenatal_ntd_afp می‌گوید؛ بقیهٔ ردیفِ NTD (کم‌خطر یا بی‌دسته) همین‌جا نقل می‌شود تا بی‌صدا نیفتد (N28).
function riskRows(e) {
  const r = pn(e).risk ?? {};
  const rows = ["T21", "T18", "T13"].filter((t) => r[t]).map((t) => ({ tri: t, ...r[t], tier: riskTier(e, t, r[t]) }));
  if (r.NTD && r.NTD.category !== "high") rows.push({ tri: "NTD", ...r.NTD, tier: r.NTD.category ?? null });
  return rows;
}
export function riskAxis(e) {
  const rows = riskRows(e);
  if (!rows.length) return null;
  if (rows.some((x) => (x.tri === "T18" || x.tri === "T13") && x.tier === "high")) return "t18_t13_high";
  if (rows.some((x) => x.tri === "T21" && x.tier === "high")) return "t21_high";
  if (rows.some((x) => x.tier === "intermediate")) return "intermediate";
  if (rows.some((x) => x.tier == null)) return "unrated";
  return "low";
}
const tierFa = { high: "پرخطر", intermediate: "در محدودهٔ واسط", low: "کم‌خطر" };
function riskQuote(e) {
  return riskRows(e).map((x) => {
    const how = x.category ? `آزمایشگاه آن را «${tierFa[x.tier] ?? x.tier}» گزارش کرده` :
      x.tier ? `طبقِ مرزِ رایجِ منابع ${tierFa[x.tier]} حساب می‌شود` :
      "مرزِ پرخطر بودنِ آن را خودِ آزمایشگاه تعیین می‌کند و روی برگه نیامده";
    const printed = x.denominator != null ? `1:${x.denominator}` : "بدونِ عددِ خوانا";
    return `خطرِ محاسبه‌شده برای ${TRISOMY_FA[x.tri]} روی برگهٔ شما «${printed}» است و ${how}.`;
  }).join(" ");
}

// ── الگوی T21ِ سه‌ماههٔ اول از MoM — فقط وقتی خطرِ T21 چاپ نشده (خطرِ آزمایشگاه همین نشانگرها را ترکیب کرده، D5) ──
export function firstTrimesterAxis(e) {
  if (!active(e) || pn(e).risk?.T21) return null;
  const b = momOf(e, "FBHCG"), p = momOf(e, "PAPPA");
  if (b != null && p != null && b > 1.5 && p < 0.5 && ntRaised(e)) return "t21_fts";
  return null;
}

// NTD: دستهٔ چاپ‌شدهٔ NTD مقدم است؛ وگرنه AFP ≥ 2.5 MoM.
function ntdState(e) {
  const r = pn(e).risk?.NTD;
  const afp = momOf(e, "AFP_MAT");
  if (r?.category === "high") return "lab_high";
  if (r?.category === "low") return afp != null && afp >= 2.5 ? "lab_low_afp_high" : null;
  return afp != null && afp >= 2.5 ? "afp_high" : null;
}

const ue3VeryLow = (e) => { const v = momOf(e, "UE3"); return v != null && v <= 0.10; };
const pappaLow = (e) => { const v = momOf(e, "PAPPA"); return v != null && v < 0.4 && firstTrimesterAxis(e) !== "t21_fts"; };

// ردیف‌هایی که فقط غلظت (نه MoM) دارند — NT بر حسبِ میلی‌متر غلظت نیست.
function concentrationOnly(e) {
  return PRENATAL_KEYS.filter((k) => {
    const it = item(e, k);
    // NT اندازه است، نه غلظت — همیشه در یادداشتِ نشانگرها (با یا بی‌واحدِ میلی‌متر).
    if (k === "NT" || !it || it.mom != null || it.value == null) return false;
    return true;
  });
}

// ── کدام نشانگر را کدام یافته توضیح داده (برای «یادداشتِ نشانگرها» و هشدارِ تفسیرنشده‌ها، N18) ──
function explainedKeys(e) {
  const s = new Set(concentrationOnly(e));
  if (firstTrimesterAxis(e) === "t21_fts") ["FBHCG", "PAPPA", "NT"].forEach((k) => s.add(k));
  if (ntRaised(e)) s.add("NT");
  if (ntdState(e) && ntdState(e) !== "lab_low_afp_high") s.add("AFP_MAT");
  if (ue3VeryLow(e)) s.add("UE3");
  if (pappaLow(e)) s.add("PAPPA");
  return s;
}

function markerNote(e, k) {
  const it = item(e, k);
  const name = faName(k);
  if (!it.readable) return `${name} روی برگه به‌صورتِ عددِ روشن نیامده (مثلاً کمتر از یا بیشتر از یک مرز، یا متن) و تفسیر نشد.`;
  if (k === "NT") {
    const v = ntMm(e);
    if (v != null) return `${name} ${pr(e, k)} میلی‌متر است؛ کمتر از ۳ میلی‌متر، یعنی کمتر از مرزی که برای پیشنهادِ آزمونِ تشخیصی به‌کار می‌رود.`;
    return `${name} روی برگه «${pr(e, k)}${safeUnit(it.unit) ? " " + safeUnit(it.unit) : ""}» آمده و چون واحدِ میلی‌متر ندارد، با مرزِ ۳ میلی‌متر سنجیده نشد.`;
  }
  const v = it.mom;
  const q = `${name} ${pr(e, k)} MoM است`;
  switch (k) {
    case "AFP_MAT":
      if (ntdState(e) === "lab_low_afp_high") return `${q}؛ آزمایشگاه با مرزِ خودش خطرِ نقصِ لولهٔ عصبی را کم گزارش کرده است.`;
      if (v < 0.5) return `${q}؛ AFPِ پایین (کمتر از 0.5 MoM) در غربالگری با خطرِ بیشترِ تریزومی ۲۱ و ۱۸ همراه است، و این خطر را آزمایشگاه با کنارِ هم گذاشتنِ همهٔ نشانگرها حساب می‌کند.`;
      return `${q}؛ کمتر از مرزِ 2.5 MoM که برای غربالگریِ نقصِ لولهٔ عصبی به‌کار می‌رود.`;
    case "UE3":
      if (v < 0.5) return `${q}؛ استریولِ پایین (کمتر از 0.5 MoM) با تریزومی ۲۱ و ۱۸ و با پیامدِ نامطلوبِ بارداری مرتبط دانسته شده است.`;
      return `${q} (0.5 MoM یا بیشتر).`;
    case "INHA":
      if (v >= 2.0) return `${q}؛ اینهیبین A بالا (2 MoM یا بیشتر) جزئی از الگوی تریزومی ۲۱ است، و در جنینی با کروموزومِ طبیعی با خطرِ بیشترِ محدودیتِ رشد، زایمانِ زودرس و پره‌اکلامپسی مرتبط دانسته شده است.`;
      return `${q} (کمتر از 2 MoM).`;
    case "HCG_TOT":
      return `${q}. مرزِ «بالا» برای این نشانگر در منابع یکسان نیست (2 یا 3 MoM) و تا تأییدِ بازبینِ پزشکی، این‌جا به‌تنهایی قضاوت نمی‌شود.`;
    case "FBHCG":
      return `${q}؛ این نشانگر به‌تنهایی قضاوت نمی‌شود و معنایش در خطرِ محاسبه‌شدهٔ آزمایشگاه است.`;
    case "PAPPA":
      return `${q} (کمتر از 0.4 MoM نیست).`;
    default:
      return `${q}.`;
  }
}

// ── جمله‌های زمینه — فقط در «یافتهٔ اصلی» یک‌بار می‌آیند ──
function missingFa(e) {
  const m = pn(e).markers ?? {};
  const a = arms(e);
  const want = [...(a.fts ? FTS_KEYS : []), ...(a.quad ? QUAD_KEYS : [])];
  if (!Object.keys(m).length) return "مقدارِ خودِ نشانگرها (MoM) روی برگه نیامده؛ فقط خطرِ محاسبه‌شده چاپ شده است.";
  const miss = want.filter((k) => !m[k]);
  return miss.length ? `این نشانگرها روی برگهٔ شما نیامده‌اند و دربارهٔ آن‌ها چیزی نمی‌توان گفت: ${miss.map(faName).join("، ")}.` : "";
}
function contextSentences(e) {
  const out = [];
  const mf = missingFa(e);
  if (mf) out.push(mf);
  if (gaDays(e) == null) out.push("سنِ بارداری روی برگه نیامده، پس درستیِ بازهٔ زمانیِ نمونه‌گیری و مبنای تعیینِ سن این‌جا بررسی نشد.");
  out.push("آزمایشگاه MoM را برای وزن، سیگار، IVF، دیابت و دوقلویی تصحیح می‌کند؛ اگر یکی از این‌ها دربارهٔ شما صدق می‌کند و روی برگه ثبت نشده، به آزمایشگاه بگویید.");
  if (e.pregnant !== true) out.push("در پروفایلِ شما بارداری ثبت نشده است؛ این برگه نتیجهٔ غربالگریِ بارداری است.");
  return out.join(" ");
}

// ── ترتیبِ اولویت: نخستین یافتهٔ فعال «یافتهٔ اصلی» است و جمله‌های زمینه را می‌گیرد ──
const PRIORITY = [];
function leadId(e) {
  for (const r of PRIORITY) if (r.match(e)) return r.id;
  return null;
}
function finish(e, id, urgency, f) {
  const lead = leadId(e) === id;
  const must = [f.must_say, SCREENING_LINE, lead ? contextSentences(e) : ""].filter(Boolean).join(" ");
  // 🔴 بازبینیِ کد C5 (N18): زیرِ هر blocks_othersِ اورژانسی (K 7.0، …) یافته‌های prenatal بی‌ردپا پنهان می‌شدند — عددشان در
  //    abnormal نیست پس تورِ «یافتهٔ تکمیلی» نمی‌گرفتشان. always_show + brief: نسخهٔ کوتاه (جملهٔ اولِ خودِ یافته با عدد + «غربالگری
  //    است») بی‌دستور و بی‌زمان‌بندی می‌ماند، تا خطرِ 1:40 یا NTِ بالا از گزارش نیفتد.
  const first = f.brief ?? String(f.must_say).split(/(?<=[.؟!])\s+/)[0];
  return {
    pattern: id, urgency, action: ACTION[urgency],
    headline: f.headline, must_say: must,
    always_show: true, brief: `${first} ${SCREENING_LINE}`,
    suggest: f.suggest ?? [], warnings: f.warnings ?? [],
    ...(f.key_number != null ? { key_number: f.key_number } : {}),
  };
}

const RISK_HEAD = {
  t18_t13_high: "خطرِ محاسبه‌شده برای تریزومی ۱۸ یا ۱۳ در غربالگریِ بارداری بالاست",
  t21_high: "خطرِ محاسبه‌شده برای سندرم داون در غربالگریِ بارداری بالاست",
  intermediate: "خطرِ محاسبه‌شده در غربالگریِ بارداری در محدودهٔ واسط است",
  unrated: "نتیجهٔ خطرِ محاسبه‌شده در غربالگریِ بارداری",
  low: "خطرِ محاسبه‌شده در غربالگریِ بارداری کم است",
};
function riskBuild(label, urgency) {
  return (e) => {
    let body = riskQuote(e) + " ";
    if (label === "t18_t13_high" || label === "t21_high") {
      body += "نتیجهٔ مثبتِ غربالگری یعنی احتمال بیشتر از مرز است، نه این‌که جنین حتماً مبتلاست. " +
        "گامِ بعدی مشاورهٔ ژنتیک است. " + DIAGNOSTIC_FA;
    } else if (label === "intermediate") {
      body += "در برنامه‌های مرحله‌ای، این محدوده معمولاً به آزمونِ تکمیلی (مثلاً کوآد مارکر یا cfDNA) فرستاده می‌شود؛ تصمیمش با پزشکِ شماست.";
    } else if (label === "unrated") {
      body += "این عدد را با مرزِ همان آزمایشگاه باید سنجید؛ آن را به پزشکِ زنانِ خود نشان دهید.";
    } else {
      body += "کم‌خطر یعنی احتمال پایین است، نه این‌که بیماری رد شده باشد.";
    }
    const high = label === "t18_t13_high" || label === "t21_high";
    return finish(e, `prenatal_risk_${label}`, urgency, {
      headline: RISK_HEAD[label], must_say: body,
      suggest: high ? ["ارجاع به مشاورِ ژنتیک"] : [],
    });
  };
}

function t21FtsBuild(e) {
  const b = momOf(e, "FBHCG"), p = momOf(e, "PAPPA"), nt = ntMm(e);
  return finish(e, "prenatal_t21_pattern_fts", "this_week", {
    headline: "نشانگرهای غربالگریِ سه‌ماههٔ اول الگویی شبیه به الگوی سندرم داون دارند",
    must_say:
      `${FA.FBHCG} ${pr(e, FBHCG)} MoM (بالا)، ${FA.PAPPA} ${pr(e, PAPPA)} MoM (پایین) و ${FA.NT} ${pr(e, NT)} میلی‌متر (۳ میلی‌متر یا بیشتر) است. ` +
      "این سه با هم الگویی را می‌سازند که در غربالگری با سندرم داون (تریزومی ۲۱) دیده می‌شود. " +
      "خطرِ محاسبه‌شده روی برگه نیامده؛ آزمایشگاه آن را از ترکیبِ همین نشانگرها و سنِ مادر حساب می‌کند و باید از او گرفته شود. " +
      "گامِ بعدی مشاورهٔ ژنتیک است. " + DIAGNOSTIC_FA,
    suggest: ["ارجاع به مشاورِ ژنتیک"],
  });
}

function ntBuild(e) {
  const nt = ntMm(e);
  return finish(e, "prenatal_nt_raised", "this_week", {
    headline: "ضخامتِ پشتِ گردنِ جنین (NT) ۳ میلی‌متر یا بیشتر است",
    must_say:
      `${FA.NT} ${pr(e, NT)} میلی‌متر است. NTِ ۳ میلی‌متر یا بیشتر، حتی وقتی خطرِ محاسبه‌شده کم باشد، دلیلِ مشاوره و پیشنهادِ آزمونِ تشخیصی است (ترجیحاً با ریزآرایهٔ کروموزومی، CMA). ` +
      "اگر کروموزوم‌ها طبیعی باشند هم، خطرِ ناهنجاری‌های ساختاری مثلِ نقصِ قلبی بیشتر می‌ماند؛ برای همین سونوگرافیِ دقیقِ آناتومی در هفتهٔ ۱۸ تا ۲۲ و اکوکاردیوگرافیِ جنین در هفتهٔ ۱۶ تا ۲۲ پیشنهاد می‌شود. " +
      "نتیجهٔ منفیِ آزمایشِ cfDNA این ارزیابی را لازم‌نکرده نمی‌کند.",
    suggest: ["ارجاع به مشاورِ ژنتیک", "سونوگرافیِ دقیقِ آناتومیِ جنین", "اکوکاردیوگرافیِ جنین"],
    key_number: nt,
  });
}

function ntdBuild(e) {
  const st = ntdState(e);
  const afp = momOf(e, "AFP_MAT");
  const afpTxt = afp != null ? `${FA.AFP_MAT} ${pr(e, AFP_MAT)} MoM است` : `${FA.AFP_MAT} روی برگه نیامده`;
  const lab = st === "lab_high" ? "؛ آزمایشگاه نتیجهٔ غربالگریِ نقصِ لولهٔ عصبی را «پرخطر» گزارش کرده" : "؛ یعنی 2.5 MoM یا بیشتر، که مرزِ غربالگریِ مثبت برای نقصِ بازِ لولهٔ عصبی (مثلِ اسپینا بیفیدا) است";
  return finish(e, "prenatal_ntd_afp", "this_week", {
    headline: "غربالگریِ نقصِ لولهٔ عصبی (AFPِ سرمِ مادر) مثبت است",
    must_say:
      `${afpTxt}${lab}. ` +
      "بیشترِ AFPهای بالا (۹۰ تا ۹۵ درصد) به نقصِ لولهٔ عصبی ربطی ندارند؛ علت‌های شایع‌تر: سنِ بارداریِ کمتر از واقع، چندقلویی، مرگِ جنین، نقصِ دیوارهٔ شکم، مشکلِ کلیهٔ جنین و خونریزی یا ناهنجاریِ جفت. " +
      "گامِ اول تأییدِ سنِ بارداری با سونوگرافی است (اگر بیش از ۱۰ روز فرق کند، آزمایشگاه نتیجه را دوباره حساب می‌کند)، سپس سونوگرافیِ هدفمند با وضوحِ بالا، و در صورتِ نیاز آمنیوسنتز با اندازه‌گیریِ AFP و استیل‌کولین‌استرازِ مایعِ آمنیوتیک.",
    suggest: ["سونوگرافیِ هدفمندِ جنین"],
    ...(afp != null ? { key_number: afp } : {}),
  });
}

function ue3VeryLowBuild(e) {
  const v = momOf(e, "UE3");
  return finish(e, "prenatal_ue3_very_low", "this_week", {
    headline: "استریولِ غیرکونژوگه (uE3) بسیار پایین است",
    must_say:
      `${FA.UE3} ${pr(e, UE3)} MoM است، یعنی 0.10 MoM یا کمتر. استریولِ بسیار پایین جدا از الگوی تریزومی‌ها بررسی می‌شود: ` +
      "علت‌هایی مثلِ کمبودِ آنزیمِ استروئید سولفاتاز (ایکتیوزِ وابسته به X)، سندرم اسمیت-لملی-اوپیتز (SLOS)، کم‌کاریِ غدهٔ فوق‌کلیویِ جنین، آنسفالی یا مصرفِ زیادِ کورتیکواستروئید در مادر مطرح است. " +
      "گامِ بعدی مشاورهٔ ژنتیک و آزمایش‌های اختصاصی‌ای است که مشاور تعیین می‌کند. اگر داروی کورتونی مصرف می‌کنید، به پزشک بگویید.",
    suggest: ["ارجاع به مشاورِ ژنتیک"],
    key_number: v,
  });
}

function pappaLowBuild(e) {
  const v = momOf(e, "PAPPA");
  return finish(e, "prenatal_papp_a_low", "routine", {
    headline: "PAPP-A پایین است (کمتر از 0.4 MoM)",
    must_say:
      `${FA.PAPPA} ${pr(e, PAPPA)} MoM است. این یافته به‌تنهایی دربارهٔ کروموزوم‌های جنین نیست؛ ` +
      "در بارداری‌هایی با کروموزومِ طبیعیِ جنین، PAPP-Aِ پایین با احتمالِ بیشترِ زایمانِ زودرس، محدودیتِ رشدِ جنین، فشارِ خونِ بارداری یا پره‌اکلامپسی و مرگِ جنین مرتبط دانسته شده است. " +
      "این یک ارتباط است، نه پیش‌بینی؛ بیشترِ این بارداری‌ها مشکلی پیدا نمی‌کنند، و سونوگرافیِ طبیعی هم این احتمال را صفر نمی‌کند. با متخصصِ زنانِ خود در میان بگذارید.",
    key_number: v,
  });
}

function windowBuild(e) {
  return finish(e, "prenatal_window_invalid", "routine", {
    headline: "زمانِ نمونه‌گیری یا تعیینِ سنِ بارداری با شرایطِ غربالگری جور نیست",
    must_say: datingProblems(e).join(" ") + " " +
      "MoMها با میانهٔ همان هفتهٔ بارداری حساب می‌شوند؛ اگر سن یا زمان درست نباشد، خطرِ محاسبه‌شده قابلِ اتکا نیست و آزمایشگاه باید آن را با سنِ درست (بر پایهٔ سونوگرافی) دوباره حساب کند یا نمونهٔ تازه بخواهد.",
  });
}

function concBuild(e) {
  const keys = concentrationOnly(e);
  // 🔴 بازبینیِ کد P1: «Free β-hCG 1.8» بی‌واحد غلظت نیست — ممکن است MoM باشد. نه «غلظت» می‌گوییم نه ارزیابی می‌کنیم.
  const rows = keys.map((k) => {
    const it = item(e, k), u = safeUnit(it.unit);
    return u ? `${faName(k)} روی برگهٔ شما «${pr(e, k)} ${u}» است` : `${faName(k)} روی برگهٔ شما «${pr(e, k)}» و بدونِ واحد آمده`;
  });
  const unitless = keys.some((k) => !safeUnit(item(e, k).unit));
  return finish(e, "prenatal_concentration_unread", "routine", {
    headline: "مقدارِ نشانگرهای غربالگریِ بارداری بدونِ MoM چاپ شده است",
    must_say: rows.join("؛ ") + ". " +
      (unitless ? "عددِ بی‌واحد معلوم نمی‌کند که MoM است یا غلظت. " : "") +
      "این عددها فقط وقتی معنا دارند که آزمایشگاه آن‌ها را با میانهٔ همان هفتهٔ بارداری مقایسه کند (MoM) یا خطرِ محاسبه‌شده را چاپ کند؛ این‌جا به‌تنهایی ارزیابی نمی‌شوند. نتیجهٔ MoM و خطرِ محاسبه‌شده را از آزمایشگاه بخواهید.",
  });
}

function notesKeys(e) {
  const ex = explainedKeys(e);
  return PRENATAL_KEYS.filter((k) => item(e, k) && !ex.has(k));
}
function notesBuild(e) {
  return finish(e, "prenatal_marker_notes", "routine", {
    headline: "نشانگرهای غربالگریِ بارداریِ روی برگهٔ شما",
    // brief: همهٔ یادداشت‌ها (کوتاه‌اند و هر کدام عددِ یک نشانگر را دارد) — نه فقط جملهٔ اول.
    brief: notesKeys(e).map((k) => markerNote(e, k)).join(" "),
    must_say: notesKeys(e).map((k) => markerNote(e, k)).join(" ") +
      " «طبیعی» بودنِ یک نشانگرِ تنها به‌صورتِ MoM در این برنامه هنوز تعریف نشده؛ معنای این عددها در خطرِ محاسبه‌شدهٔ آزمایشگاه است.",
  });
}

function mismatchBuild(e) {
  const who = e.sex === "M" ? "مرد" : "کمتر از ۱۶ سال";
  const names = [...PRENATAL_KEYS.filter((k) => item(e, k)).map(faName), ...Object.keys(pn(e).risk ?? {}).map((t) => `خطرِ ${TRISOMY_FA[t] ?? t}`)];
  return {
    pattern: "prenatal_profile_mismatch", urgency: "routine", action: ACTION.routine,
    headline: "ردیف‌های غربالگریِ بارداری با پروفایلِ شما جور نیست",
    must_say: `این برگه ردیف‌های غربالگریِ بارداری دارد (${names.join("، ")})، ولی پروفایلِ شما «${who}» است؛ برای همین این ردیف‌ها تفسیر نشدند. اگر برگه مالِ کسِ دیگری است یا پروفایل اشتباه است، آن را درست کنید.`,
    suggest: [], warnings: [],
  };
}

const rule = (id, match, build) => ({ id, match, build });

export const RULES_PRENATAL = [
  rule("prenatal_profile_mismatch", profileMismatch, mismatchBuild),
  rule("prenatal_risk_t18_t13_high", (e) => active(e) && riskAxis(e) === "t18_t13_high", riskBuild("t18_t13_high", "soon")),
  rule("prenatal_risk_t21_high", (e) => active(e) && riskAxis(e) === "t21_high", riskBuild("t21_high", "this_week")),
  rule("prenatal_t21_pattern_fts", (e) => firstTrimesterAxis(e) === "t21_fts", t21FtsBuild),
  rule("prenatal_ntd_afp", (e) => active(e) && (ntdState(e) === "lab_high" || ntdState(e) === "afp_high"), ntdBuild),
  rule("prenatal_nt_raised", (e) => active(e) && ntRaised(e), ntBuild),
  rule("prenatal_ue3_very_low", (e) => active(e) && ue3VeryLow(e), ue3VeryLowBuild),
  rule("prenatal_risk_intermediate", (e) => active(e) && riskAxis(e) === "intermediate", riskBuild("intermediate", "routine")),
  rule("prenatal_risk_unrated", (e) => active(e) && riskAxis(e) === "unrated", riskBuild("unrated", "routine")),
  rule("prenatal_papp_a_low", (e) => active(e) && pappaLow(e), pappaLowBuild),
  rule("prenatal_window_invalid", (e) => active(e) && datingProblems(e).length > 0, windowBuild),
  rule("prenatal_risk_low", (e) => active(e) && riskAxis(e) === "low", riskBuild("low", "routine")),
  rule("prenatal_marker_notes", (e) => active(e) && notesKeys(e).length > 0, notesBuild),
  rule("prenatal_concentration_unread", (e) => active(e) && concentrationOnly(e).length > 0, concBuild),
];
// ترتیبِ بالا همان اولویتِ «یافتهٔ اصلی» است (mismatch هرگز با بقیه هم‌زمان نیست).
PRIORITY.push(...RULES_PRENATAL.filter((r) => r.id !== "prenatal_profile_mismatch"));
