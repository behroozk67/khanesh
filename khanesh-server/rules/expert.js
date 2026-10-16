// ============================================================
// نمای تخصصی (specs/016) — برای کادرِ درمان. `_engine.expert` در server.js.
// قرارداد: specs/016-expert-view/contracts/expert-output.md
//
// ⚠️ این فایل هیچ حکمی نمی‌سازد. فقط خروجیِ موجودِ موتور را بازچینی می‌کند:
//    یافته‌های نمایش‌داده‌شده (به همان ترتیب)، محرک‌هایشان، عددِ روی برگه در کنارِ عددِ سنجیده‌شده، بازهٔ موتور
//    و بازهٔ چاپ‌شده، منبع، آزمایشِ پیشنهادی، شاخص‌های محاسبه‌شده، رونوشتِ نمره، یافته‌های پنهان، و بلوکِ
//    اختیاریِ `pro` که روی خودِ قاعده نوشته شده. هیچ آستانه، فوریت یا نمره‌ای اینجا ساخته یا عوض نمی‌شود.
// ⚠️ هرگز به مدل نمی‌رود: buildEnginePrompt از engineOut/patternOut می‌خواند، نه از _engine (X5).
// ⚠️ ورودی‌ها را دست نمی‌زند (X0): همه‌چیز کپی می‌شود.
// ⚠️ کلیدِ خامِ موتور و شناسهٔ قاعده سریالایز نمی‌شوند (N8، E2، X3) — برچسبِ یافته همان headline است.
// ============================================================
import { faName } from "./names.js";
import { getUnit } from "./refs.js";
import { sourceList } from "./guidelines.js";
import { RULES, HIDDEN_FINDINGS, alreadyMeasured } from "./patterns.js";
import { dropSubsumedTests, URGENCY_FA, buildEngineRecommendations, phraseSuggestion } from "./prompt.js";
import { findingKeys } from "./score.js";
import { printedOf } from "./printed.js";

const RULE_BY_ID = new Map(RULES.map((r) => [r.id, r]));
const UNTITLED = "یافتهٔ بی‌عنوان";
const UNGRADED_FA = "بدون حکم";

// research R6 — شاخص‌هایی که موتور حساب می‌کند. جمله فقط *روشِ محاسبهٔ خودِ موتور* را می‌گوید (adapter.js)؛
// آستانهٔ تازه‌ای نیست. ثبت در MEDICAL_RULES.md (P100).
const INDEX_INFO = {
  egfr: { label: "eGFR", unit: "mL/min/1.73m²", inputs: ["CREAT", "سن", "جنس"],
    method_fa: "با فرمولِ CKD-EPI از کراتینین، سن و جنس محاسبه شده است؛ فرض می‌کند کراتینین پایدار است، پس در آسیبِ حادِ کلیه یا تجزیهٔ عضله معتبر نیست." },
  anion_gap: { label: "شکافِ آنیونی", unit: "mEq/L", inputs: ["NA", "CL", "HCO3"],
    method_fa: "سدیم منهای مجموعِ کلر و بی‌کربنات؛ اگر سدیم برای قندِ بالا اصلاح شده باشد، سدیمِ اندازه‌گیری‌شده به کار رفته است." },
  anion_gap_corr: { label: "شکافِ آنیونیِ اصلاح‌شده با آلبومین", unit: "mEq/L", inputs: ["NA", "CL", "HCO3", "ALB"],
    method_fa: "شکافِ آنیونی به‌علاوهٔ ۲٫۵ برابرِ فاصلهٔ آلبومین از ۴ گرم در دسی‌لیتر." },
  ca_corrected: { label: "کلسیمِ اصلاح‌شده با آلبومین", unit: "mg/dL", inputs: ["CA", "ALB"],
    method_fa: "کلسیمِ اندازه‌گیری‌شده به‌علاوهٔ ۰٫۸ برابرِ فاصلهٔ آلبومین از ۴٫۴ گرم در دسی‌لیتر؛ فقط اگر اختلاف دست‌کم ۰٫۳ باشد جای عددِ سنجیده‌شده می‌نشیند." },
  na_corrected: { label: "سدیمِ اصلاح‌شده برای قند", unit: "mEq/L", inputs: ["NA", "قندِ خون (بالاترین مقدارِ برگه)"],
    method_fa: "سدیمِ اندازه‌گیری‌شده به‌علاوهٔ ۰٫۰۲۴ برابرِ مقدارِ قندِ بالای ۱۰۰ (بالاترین قندِ برگه)؛ فقط وقتی قند از ۲۵۰ بیشتر است حساب می‌شود و فقط اگر اختلاف دست‌کم ۳ باشد جای عددِ سنجیده‌شده می‌نشیند." },
  bun_cr: { label: "نسبتِ BUN به کراتینین", unit: "", inputs: ["UREA_N", "UREA", "CREAT"],
    method_fa: "BUNِ اندازه‌گیری‌شده، یا اگر روی برگه نبود BUNِ برآوردشده از اوره، تقسیم بر کراتینین." },
  r_ratio: { label: "نسبتِ R (الگوی آسیبِ کبد)", unit: "", inputs: ["ALT", "ALP"],
    method_fa: "نسبتِ ALT به سقفِ طبیعی‌اش، تقسیم بر نسبتِ ALP به سقفِ طبیعی‌اش." },
  osm_calc: { label: "اسمولالیتهٔ محاسبه‌شده", unit: "mOsm/kg", inputs: ["NA", "GLU_F", "UREA"],
    method_fa: "دو برابرِ سدیمِ اندازه‌گیری‌شده (نه اصلاح‌شده) به‌علاوهٔ قند تقسیم بر ۱۸ به‌علاوهٔ BUN تقسیم بر ۲٫۸." },
  osm_gap: { label: "شکافِ اسمولار", unit: "mOsm/kg", inputs: ["OSM"],
    method_fa: "اسمولالیتهٔ اندازه‌گیری‌شده منهای اسمولالیتهٔ محاسبه‌شده." },
  non_hdl: { label: "کلسترولِ غیر-HDL", unit: "mg/dL", inputs: ["CHOL", "HDL"],
    method_fa: "کلسترولِ تام منهای HDL." },
};
const inputFa = (k) => (/^[A-Z0-9_]+$/.test(k) ? nameOf(k) : k);

// نامِ فارسیِ ردیف. faName برای کلیدِ بی‌نام خودِ کلید را برمی‌گرداند (NEUT_PCT) — آن هرگز چاپ نمی‌شود (N8، X25).
const KEY_SHAPE = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/;
function nameOf(key) {
  const fa = faName(key);
  if (fa !== key || !KEY_SHAPE.test(key)) return fa;
  const pct = /_PCT$/.test(key) ? faName(key.replace(/_PCT$/, "_ABS")) : null;
  if (pct && pct !== key.replace(/_PCT$/, "_ABS")) return `${pct} (درصد)`;
  return "ردیفِ بی‌نامِ فارسی";
}

function testRow(g, engineOut) {
  const { printed, derived_from, unit_assumed } = printedOf(g.test, g, engineOut);
  return {
    name: nameOf(g.test),
    printed,
    ...(unit_assumed !== undefined ? { unit_assumed } : {}),
    graded: { value: g.value, unit: getUnit(g.test) ?? null },
    derived_from,
    engine_range: g.range ?? null,
    printed_range: engineOut.printedRanges?.[g.test] ?? null,
    range_source: g.refSource ?? null,
    status_fa: g.fa ?? null,
    level: g.level ?? null,
    ctcae_grade: g.ctcaeGrade ?? null,
    grading_source: g.source ?? null,
  };
}

function ungradedRow(key, u) {
  return {
    name: nameOf(key),
    printed: u?.value != null ? { value: u.value, unit: u.unit ?? null } : null,
    graded: null,
    derived_from: null,
    engine_range: null,
    printed_range: null,
    range_source: null,
    status_fa: UNGRADED_FA,
    level: null,
    ctcae_grade: null,
    grading_source: null,
  };
}

const asArray = (v) => (Array.isArray(v) ? v : []);
const asStrings = (v) => asArray(v).filter((s) => typeof s === "string" && s.trim());

/**
 * @param engineOut خروجیِ runEngine
 * @param patternOut خروجیِ runPatterns
 * @param score خروجیِ healthScore (یا null)
 */
export function buildExpertView(engineOut, patternOut, score) {
  const graded = asArray(engineOut?.graded);
  const byKey = new Map(graded.map((g) => [g.test, g]));
  const abnormalKeys = new Set(graded.filter((g) => g.abnormal).map((g) => g.test));
  const inRangeKeys = new Set(graded.filter((g) => !g.abnormal).map((g) => g.test));
  const measured = new Set([...byKey.keys(), ...Object.keys(engineOut?.ungraded ?? {})]);
  const rows = (keys) => (keys ?? []).filter((k) => byKey.has(k)).map((k) => testRow(byKey.get(k), engineOut));
  // همان فیلترِ forbidِ buildEngineRecommendations (prompt.js): واژهٔ ممنوعِ یک یافته پیشنهادِ یافتهٔ دیگر را هم می‌برد،
  //   مگر آن یافته خودش دربارهٔ همان واژه باشد (R3-CR2). بی این، «فریتین» زیرِ کم‌خونیِ ماکروسیتیک برمی‌گشت (X26).
  const shownFindings = asArray(patternOut?.findings);
  const bans = shownFindings.flatMap((g) => asStrings(g.forbid).map((w) => ({ w, by: g })));
  const aboutWord = (g, w) => `${g.headline ?? ""} ${g.must_say ?? ""}`.includes(w);
  const banned = (text, src) => bans.some(({ w, by }) => text.includes(w) && (by === src || !aboutWord(src, w)));
  const suggestOf = (f) => asStrings(f.suggest).filter((t) => !alreadyMeasured(t, measured) && !banned(t, f));
  let malformed = 0;

  const label = (f) => {
    if (typeof f.headline === "string" && f.headline.trim()) return f.headline;
    malformed++;
    return UNTITLED;
  };
  const triggersOf = (f) => rows(findingKeys(f, abnormalKeys));
  // شناسهٔ منبع (WHO_ANAEMIA) سریالایز نمی‌شود — همان کلاسِ کلیدِ خام (X3).
  const cite = (ids) => sourceList(asStrings(ids)).map(({ id, ...rest }) => rest);
  const sourcesOf = (f) => cite(f.sources);
  const proOf = (rule) => (rule?.pro
    ? { cautions: asStrings(rule.pro.cautions), differential: asStrings(rule.pro.differential), workup: asStrings(rule.pro.workup), sources: cite(rule.pro.sources) }
    : null);

  // قندِ بسیار بالا زیرِ صاحبِ اورژانسی (DKA/HHS/>500) پنهان می‌شود و فوریتِ موتورش عمداً emergency نیست (M91c: دو emergency برای
  //   یک عدد نه). در نمای تخصصی بیمار کنارِ «اورژانس» برچسبِ «این هفته» نبیند: فقط برچسبِ نمایشی بالا می‌رود، فیلدِ موتور دست‌نخورده.
  const glucoseEmergency = shownFindings.some((s) => ["dka_pattern", "hhs_pattern", "severe_hyperglycemia_uncertain_ketosis"].includes(s.rule_id) && s.urgency === "emergency");
  const KETONE_UNDER_DKA = shownFindings.some((s) => s.rule_id === "dka_pattern" && s.urgency === "emergency");
  const shownUrgency = (f) => ((f.rule_id === "glycemia" && glucoseEmergency) || (f.rule_id === "ketonuria_pattern" && KETONE_UNDER_DKA) ? "emergency" : f.urgency);
  const hiddenUrgency = shownUrgency;
  const findings = asArray(patternOut?.findings).map((f) => {
    const rule = RULE_BY_ID.get(f.rule_id);
    const sources = sourcesOf(f);
    const su = shownUrgency(f);
    return {
      label: label(f),
      urgency: su ?? null,
      urgency_fa: URGENCY_FA[su] ?? null,
      supplementary: f.supplementary === true,
      // P110: یافتهٔ بی‌اقدام — فرانت آن‌ها را در یک گروهِ جمع‌شده نشان می‌دهد؛ متنش همان یک خطِ موتور است.
      minor: f.minor === true,
      ...(f.minor === true && typeof f.must_say === "string" ? { note: f.must_say } : {}),
      briefed: typeof f.brief === "string" && f.must_say === f.brief,
      triggers: triggersOf(f),
      // تورِ «بی‌قاعده» دربارهٔ همهٔ ردیف‌هاست؛ «زمینه»‌اش کلِ برگه می‌شد که اطلاعاتی نمی‌دهد.
      context: f.rule_id === "unmatched_abnormal" ? [] : rows(findingKeys(f, inRangeKeys)),
      warnings: asStrings(f.warnings),
      suggest: suggestOf(f),
      sources,
      no_source: sources.length === 0,
      pro: proOf(rule),
    };
  });

  // FR-016 / Q2: نام، محرک و منبع — بی دستور، بی هشدار، بی pro، تا دستورِ دوم کنارِ اورژانس ننشیند.
  const hidden = asArray(patternOut ? HIDDEN_FINDINGS.get(patternOut) : null).map((f) => {
    const sources = sourcesOf(f);
    const hu = hiddenUrgency(f);
    return { label: label(f), urgency: hu ?? null, urgency_fa: URGENCY_FA[hu] ?? null,
      triggers: triggersOf(f), sources, no_source: sources.length === 0 };
  });

  // دستورِ عمل یک‌جا و همان فهرستِ نمای ساده: یک دستورِ نهایی (pickFinalAction) + محتوای دستورهای دیگر + هشدارها، با
  //   فیلترِ forbid. actionِ تک‌تکِ یافته‌ها عمداً نمی‌آید — زمان‌بندی‌های رقیب («این هفته» زیرِ «همین حالا اورژانس»)
  //   همان چیزی است که N7/N20/M188 برداشتند (بازبینیِ کد، X27).
  let recommendations = patternOut ? buildEngineRecommendations(patternOut, engineOut) : [];
  // نمای تخصصی: وقتی اولین مورد فقط «نوبت/وقت با پزشک بگیرید» است و مورد دیگری هم خودش به پزشک ارجاع می‌دهد،
  //   همان دستور دوبار می‌آید (درخواستِ کاربر، ۲۰۲۶-۱۰-۱۵). فقط برای فوریتِ کم؛ دستورِ اورژانس/۲۴–۴۸ ساعت دست نمی‌خورد.
  if (recommendations.length > 1 && !["emergency", "soon"].includes(patternOut?.overall_urgency)) {
    const first = String(recommendations[0]);
    const bareVisit = first.length <= 90 && /پزشک/.test(first) && /(وقت|نوبت)\s*(بگیرید|عادی)|مراجعه کنید|مطرح کنید/.test(first)
      && !/تکرار|بخواهید|دارو|درمان|اگر|اورژانس/.test(first);
    if (bareVisit && recommendations.slice(1).some((r) => /پزشک/.test(String(r)))) recommendations = recommendations.slice(1);
  }

  const suggested = dropSubsumedTests([...new Set(findings.flatMap((f) => f.suggest))]);
  // P110 (گزارشِ کاربر ۲۰۲۶-۱۰-۱۶): «آزمایش‌های پیشنهادی» عینِ «درخواستِ … از پزشک»‌های فهرستِ دستور بود. در نمای تخصصی فهرستِ
  //   آزمایش‌ها جدا آمده، پس همان درخواست‌ها از دستورها برداشته می‌شوند (نمای ساده دست نمی‌خورد).
  if (suggested.length) {
    const asRequest = new Set(suggested.map((s) => phraseSuggestion(s)));
    recommendations = recommendations.filter((r) => !asRequest.has(String(r)));
  }

  const tests = [
    ...graded.filter((g) => g.abnormal).map((g) => testRow(g, engineOut)),
    ...graded.filter((g) => !g.abnormal).map((g) => testRow(g, engineOut)),
    ...Object.entries(engineOut?.ungraded ?? {}).map(([k, u]) => ungradedRow(k, u)),
  ];

  const ix = engineOut?.indices ?? {};
  const indices = Object.entries(INDEX_INFO)
    .filter(([k]) => typeof ix[k] === "number" && Number.isFinite(ix[k]))
    .filter(([k]) => k !== "ca_corrected" || ix.ca_measured != null)
    .map(([k, info]) => ({ label: info.label, value: ix[k], unit: info.unit, method_fa: info.method_fa, inputs: info.inputs.map(inputFa) }));

  return {
    version: 1,
    urgency: patternOut?.overall_urgency ?? "none",
    findings,
    hidden,
    recommendations,
    suggested,
    tests,
    indices,
    score: score
      ? {
          value: score.value, band: score.band, reason: score.reason,
          systems: asArray(score.systems).map((s) => ({
            fa: s.fa, score: s.score, cap: s.cap, capped: s.capped,
            keys: asArray(s.keys).map(faName),
            worst: s.worst ? s.worst.name : null,
          })),
        }
      : null,
    malformed,
  };
}
