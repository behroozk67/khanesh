// ============================================================
// نمای تخصصی (specs/016) — `_engine.expert` از `buildExpertView` (rules/expert.js).
//   برای کادرِ درمان: محرک‌های هر یافته، بازهٔ موتور و بازهٔ چاپ‌شده، درجه، منبع، آزمایشِ پیشنهادی، شاخص‌های
//   محاسبه‌شده، ریزِ نمرهٔ برگه، یافته‌های پنهان و بلوکِ اختیاریِ `pro`. همه از خروجیِ خودِ موتور؛ هیچ مدلی،
//   هیچ آستانه یا فوریتِ تازه‌ای. قرارداد: specs/016-expert-view/contracts/expert-output.md
// 🔴 قرمز-اول: X1–X19 روی استابِ T002 (`buildExpertView` ⇒ null) قرمز دیده شدند؛ X0 گاردِ «بازآرایی بی‌اثر» است
//    و عمداً روی کدِ فعلی سبز است (هش‌ها از همان کد گرفته شد). گاردهای `pro` (X14–X16) روی fixtureِ خراب قرمزند.
// ⚠️ جنس/سن فقط زیرِ `patient` خوانده می‌شود (N32).
// ============================================================
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { runEngine } from "./adapter.js";
import { runPatterns, RULES, alreadyMeasured } from "./patterns.js";
import { healthScore } from "./score.js";
import { buildEnginePrompt } from "./prompt.js";
import { buildExpertView } from "./expert.js";
import { ADULT_REFS, getRef } from "./refs.js";
import { CLASSIFIERS } from "./interpret.js";
import { CTCAE_MAP } from "./ctcae.js";
import { FA_NAMES, faName } from "./names.js";
import { GUIDELINE_IDS, sourceList } from "./guidelines.js";

const T = (name, value, unit, reference) => ({ name, value: String(value), ...(unit ? { unit } : {}), ...(reference ? { reference } : {}) });
const M45 = { sex: "M", age: 45 };
const run = (tests, patient = M45) => {
  const e = runEngine({ patient, tests });
  const p = runPatterns(e);
  const s = healthScore(e, p);
  return { e, p, s, x: buildExpertView(e, p, s) };
};
const strings = (o, out = [], skip = new Set()) => {
  if (typeof o === "string") out.push(o);
  else if (Array.isArray(o)) o.forEach((v) => strings(v, out, skip));
  else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) if (!skip.has(k)) strings(v, out, skip);
  return out;
};
const keysOf = (o, out = []) => {
  if (Array.isArray(o)) o.forEach((v) => keysOf(v, out));
  else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) { out.push(k); keysOf(v, out); }
  return out;
};

// ── پنل‌های ثابت ──
const P = {
  ptinr: [T("PT", 14, "sec"), T("INR", 1.2)],
  k7: [T("K", 7.0, "mEq/L")],
  k55: [T("K", 5.5, "mEq/L")],
  ida: [T("Hb", 9.5, "g/dL"), T("MCV", 70, "fL"), T("Ferritin", 6, "ng/mL")],
  caalb: [T("Ca", 7.2, "mg/dL", "8.5-10.5"), T("Albumin", 2.5, "g/dL"), T("Creatinine", 2.1, "mg/dL"), T("Na", 138, "mEq/L"), T("Cl", 100, "mEq/L"), T("HCO3", 18, "mEq/L")],
  urea: [T("Urea", 150)],
  cbc: [T("Hb", 14.5, "g/dL"), T("WBC", 6.5, "K/uL"), T("PLT", 250, "K/uL"), T("MCV", 88, "fL")],
  lipid: [T("Cholesterol", 240, "mg/dL"), T("TG", 220, "mg/dL"), T("LDL", 150, "mg/dL"), T("HDL", 35, "mg/dL"), T("FBS", 135, "mg/dL")],
  thyroid: [T("TSH", 7.5, "mIU/L"), T("FT4", 1.0, "ng/dL")],
  liver: [T("ALT", 120, "U/L"), T("AST", 90, "U/L"), T("ALP", 130, "U/L")],
  kidney: [T("Creatinine", 1.8, "mg/dL"), T("Urea", 70, "mg/dL"), T("K", 5.3, "mEq/L")],
  normal: [T("Hb", 14.5, "g/dL"), T("FBS", 90, "mg/dL"), T("ALT", 20, "U/L"), T("Creatinine", 0.9, "mg/dL"), T("Na", 140, "mEq/L")],
};
// research R7 — پنل‌های ترکیبیِ رایج
const COMMON = [
  [T("Hb", 10.2, "g/dL"), T("MCV", 72, "fL"), T("MCH", 23, "pg"), T("RDW", 16.5, "%"), T("Ferritin", 8, "ng/mL")],
  [T("Hb", 11, "g/dL"), T("MCV", 105, "fL"), T("B12", 150, "pg/mL")],
  P.lipid, P.thyroid, [T("TSH", 0.05, "mIU/L"), T("FT4", 2.6, "ng/dL")],
  [T("ALT", 120, "U/L"), T("AST", 90, "U/L"), T("ALP", 130, "U/L"), T("Bilirubin Total", 1.4, "mg/dL")],
  [T("Creatinine", 1.8, "mg/dL"), T("Urea", 70, "mg/dL"), T("K", 5.3, "mEq/L"), T("Na", 136, "mEq/L")],
  [T("WBC", 14, "K/uL"), T("Neut", 82, "%"), T("CRP", 40, "mg/L"), T("ESR", 45, "mm/h")],
  [T("PLT", 95, "K/uL"), T("Hb", 14, "g/dL"), T("WBC", 6, "K/uL")], P.ptinr,
  [T("Vitamin D", 12, "ng/mL")], [T("Uric Acid", 8.5, "mg/dL")], [T("Ferritin", 400, "ng/mL")],
  [...P.k7, ...P.ida], P.caalb, P.urea,
];

// ── جاروبِ مشترک (X3, X7, X11, X13, X18): هر کلیدِ بزرگسال، دو جنس، سه مقدار + پنل‌های رایج ──
let SWEEP = null;
function sweepPanels() {
  if (SWEEP) return SWEEP;
  const panels = [];
  let reached = 0;
  for (const sex of ["M", "F"]) for (const [key, r] of Object.entries(ADULT_REFS)) {
    const rng = getRef(key, sex, 45);
    if (!Array.isArray(rng)) continue;
    const probe = (n) => runEngine({ patient: { sex, age: 45 }, tests: [T(n, rng[1], r.unit ?? "")] }).graded.some((g) => g.test === key);
    const name = [key, key.replace(/_/g, " "), FA_NAMES[key]].find((n) => n && probe(n));
    if (!name) continue;
    if (sex === "M") reached++;
    for (const v of [rng[1] * 1.3, rng[1] * 3, rng[0] * 0.6].filter((x) => x > 0)) panels.push({ patient: { sex, age: 45 }, tests: [T(name, +v.toPrecision(3), r.unit ?? "")] });
  }
  for (const tests of COMMON) for (const sex of ["M", "F"]) panels.push({ patient: { sex, age: 45 }, tests });
  SWEEP = { panels, reached };
  return SWEEP;
}
const ENGINE_KEYS = new Set([...Object.keys(ADULT_REFS), ...Object.keys(CLASSIFIERS), ...Object.keys(CTCAE_MAP)]);
// اختصارهایی که روی برگهٔ فارسی هم همین‌طور چاپ می‌شوند (فهرستِ M38 + چند اختصارِ رایجِ همان کلاس) — نامِ آزمایش‌اند، نه کلیدِ خام.
const ALLOWED_ABBR = new Set(["CBC", "CRP", "ESR", "TIBC", "LDH", "CK", "GGT", "ALP", "AST", "ALT", "BUN", "ABG", "VBG", "ECG", "TSH", "FT3", "FT4", "TSI", "MMA", "FBS", "HbA1c", "eGFR", "SPEP", "UPEP", "ACTH", "PTH", "INR", "PT", "aPTT", "MCV", "MCH", "MCHC", "RDW", "HDL", "LDL", "B12", "ACR", "UACR"]);
// کلیدی که نامِ فارسی‌اش خودِ همان اختصار است (INR، MCH، HDL…) «کلیدِ خام» شمرده نمی‌شود (M32).
const RAW_KEYS = new Set([...ENGINE_KEYS].filter((k) => faName(k) !== k && !ALLOWED_ABBR.has(k)));
const RULE_IDS = new Set(RULES.map((r) => r.id));
function leaks(x) {
  const bad = [];
  for (const s of strings(x)) {
    if (RAW_KEYS.has(s)) bad.push(`key:${s}`);
    if (RULE_IDS.has(s)) bad.push(`id:${s}`);
    for (const m of s.match(/[a-z]+(?:_[a-z0-9]+)+/g) ?? []) if (RULE_IDS.has(m)) bad.push(`id-in:${m}`);
    // هر رشته‌ای به شکلِ کلیدِ موتور (NEUT_PCT، BILI_T) — حتی کلیدی که در ENGINE_KEYS نیست (بازبینیِ کد: ungraded‌های _PCT).
    if (/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/.test(s)) bad.push(`key-shape:${s}`);
  }
  for (const k of keysOf(x)) if (k === "key" || k === "rule_id" || k === "test") bad.push(`field:${k}`);
  return bad;
}

// ═════════════════════════ X0 — بازآرایی بی‌اثر ═════════════════════════
const h = (o) => createHash("sha256").update(JSON.stringify(o)).digest("hex").slice(0, 16);
// هش‌ها از score.js و patterns.js پیش از T004/T006 (درختِ 4d8c245) گرفته شد. [healthScore, runPatterns]
const X0_FREEZE = {
  ptinr: ["dc18ce553fb92148", "c9a1aa71a90bfe2e"], k7: ["0c3005673518b172", "3e8191e35b92b634"],
  k55: ["1a75602774814a44", "cddfedd36e0af236"], ida: ["a2144e5b55692b2d", "6aaf1159b8f64fe5"],
  // بازپایهٔ عمدی (P108، ۲۰۲۶-۱۰-۱۶): سقفِ کراتینینِ مرد ۱٫۳ ⇒ فقط نمرهٔ کراتینینِ ۲٫۱ (فاصله تا حد) عوض شد؛ runPatterns همان. قبلی b30ca0c8e67fc1fb.
  caalb: ["ddda5e14c655cee5", "d15391d327996497"], urea: ["e801d2e94bd4e5d7", "d4652c8d35931739"],
  cbc: ["d4116a0c2bedb3c1", "f1317c856c6d3301"], lipid: ["4f7830d11e2096df", "8ca6f6261a0158eb"],
  thyroid: ["40c5918c3652f561", "a4e8587d3736ca6b"], liver: ["a56db527c0987166", "329702a096cd3292"] /* P108-ج عمدی: فقط جملهٔ «تک‌نوبت» به must_sayِ liver_pattern افزوده شد (diff کامل) */,
  // بازپایهٔ عمدی (P108): همان علتِ caalb — فقط نمرهٔ کراتینینِ ۱٫۸ و رشتهٔ بازه؛ runPatterns همان (diffِ کامل). قبلی bc3a5f60a0f2d0a9.
  kidney: ["9a022704445ec4bb", "f7f33ea438235fe1"], normal: ["a49525941325f4a7", "f1317c856c6d3301"],
};
test("X0: نمره و خروجیِ runPatterns با این ویژگی بایت‌به‌بایت همان است (بازآرایی بی‌اثر، R2/R3)", () => {
  for (const [id, tests] of Object.entries(P)) {
    const { e, p, s } = run(tests);
    assert.deepEqual([h(s), h(p)], X0_FREEZE[id], id);
    buildExpertView(e, p, s);
    assert.equal(h(p), X0_FREEZE[id][1], `${id}: buildExpertView ورودی را عوض کرد`);
  }
});

// ═════════════════════════ US1 ═════════════════════════
test("X1: PT 14 / INR 1.2 — یک یافته با برچسبِ همان سرتیتر، «این هفته»، PT و INR با بازه و حکم", () => {
  const { p, x } = run(P.ptinr);
  assert.equal(x?.version, 1);
  assert.equal(x.urgency, p.overall_urgency);
  const shown = p.findings.find((f) => f.rule_id === "coagulation_abnormal");
  const f = x.findings.find((y) => y.label === shown.headline);
  assert.ok(f, `یافته نبود: ${x.findings.map((y) => y.label)}`);
  assert.equal(f.urgency, "this_week");
  assert.equal(f.urgency_fa, "این هفته");
  const names = f.triggers.map((t) => t.name);
  for (const k of ["PT", "INR"]) assert.ok(names.includes(faName(k)), `${faName(k)} در محرک‌ها نیست: ${names}`);
  for (const t of f.triggers) { assert.ok(t.engine_range, t.name); assert.ok(t.status_fa, t.name); }
});

test("X2: K 7.0 — پتاسیم (کلیدِ تک‌حرفی) محرکِ یافتهٔ پتاسیم است (N32)", () => {
  const { x } = run(P.k7);
  const f = x.findings.find((y) => y.urgency === "emergency");
  assert.ok(f, "یافتهٔ اورژانسی نبود");
  assert.ok(f.triggers.some((t) => t.name === faName("K")), JSON.stringify(f.triggers.map((t) => t.name)));
});

test("X3: جاروب — هیچ کلیدِ خامِ موتور یا شناسهٔ قاعده در نمای تخصصی نیست (SC-002)", () => {
  const { panels, reached } = sweepPanels();
  const bad = new Set(), fired = new Set();
  for (const { patient, tests } of panels) {
    const { p, x } = run(tests, patient);
    p.findings.forEach((f) => fired.add(f.rule_id));
    assert.equal(x?.version, 1, "نمای تخصصی ساخته نشد — جاروبِ تهی سبزِ بی‌معناست (N15)");
    for (const b of leaks(x)) bad.add(b);
  }
  assert.ok(reached >= 60, `فقط ${reached} کلید رسید (N15)`);
  assert.ok(fired.size >= 60, `فقط ${fired.size} قاعده فعال شد (N15)`);
  assert.deepEqual([...bad], []);
});

test("X4: منبعِ هر یافته همان منبعِ قاعده است، از راهِ sourceList؛ بی‌منبع ⇒ no_source", () => {
  for (const tests of [P.ptinr, P.k7, P.ida, P.lipid, P.thyroid, P.kidney]) {
    const { p, x } = run(tests);
    p.findings.forEach((f, i) => {
      const y = x.findings[i];
      // همان sourceList، بی شناسهٔ خام (X3)
      assert.deepEqual(y.sources, sourceList(f.sources ?? []).map(({ id, ...rest }) => rest), f.rule_id);
      assert.equal(y.no_source, y.sources.length === 0, f.rule_id);
    });
  }
});

test("X5: پرامپتِ مدل با و بی نمای تخصصی بایت‌به‌بایت همان است (قرارداد ۷)", () => {
  for (const tests of [P.ptinr, P.k7, P.ida, P.caalb, P.lipid]) {
    const e = runEngine({ patient: M45, tests });
    const p = runPatterns(e);
    const before = JSON.stringify(buildEnginePrompt(e, p, "", M45));
    buildExpertView(e, p, healthScore(e, p));
    assert.equal(JSON.stringify(buildEnginePrompt(e, p, "", M45)), before);
    // pro هنگامِ import به قاعده چسبیده، پس «پیش/پس» آن را نمی‌بیند (بازبینیِ کد) — جدا: هیچ متنِ pro در پرامپت نیست.
    for (const f of p.findings) assert.ok(!("pro" in f), `${f.rule_id}: یافته فیلدِ pro گرفت`);
    const pros = RULES.filter((r) => r.pro).flatMap((r) => ["cautions", "differential", "workup"].flatMap((k) => r.pro[k] ?? []));
    // فقط جمله‌های بلند: واژهٔ کوتاهی مثل «عفونت» طبیعتاً در پرامپت هم هست.
    for (const s of pros.filter((x) => x.length >= 25)) assert.ok(!before.includes(s), `متنِ pro به پرامپت رسید: ${s.slice(0, 40)}`);
  }
});

test("X6: یافتهٔ بدشکل خطا نمی‌دهد و شمرده می‌شود؛ روی جاروب malformed صفر است (قرارداد ۸)", () => {
  const e = runEngine({ patient: M45, tests: P.ptinr });
  const fake = { findings: [{ rule_id: "x", urgency: "routine", suggest: null, sources: "x" }], overall_urgency: "routine", has_critical: false };
  const x = buildExpertView(e, fake, null);
  assert.equal(x.findings[0].label, "یافتهٔ بی‌عنوان");
  assert.equal(x.malformed, 1);
  for (const { patient, tests } of sweepPanels().panels.slice(0, 120)) assert.equal(run(tests, patient).x.malformed, 0);
});

// ═════════════════════════ US2 ═════════════════════════
test("X7: هیچ آزمایشِ پیشنهادی روی برگه نیست؛ نامِ خالی، بی «درخواست … از پزشک» (SC-004)", () => {
  const bad = [];
  for (const { patient, tests } of [...sweepPanels().panels, { patient: M45, tests: P.ida }]) {
    const { e, x } = run(tests, patient);
    const measured = new Set([...e.graded.map((g) => g.test), ...Object.keys(e.ungraded ?? {})]);
    for (const s of [...x.suggested, ...x.findings.flatMap((f) => f.suggest)]) {
      if (alreadyMeasured(s, measured)) bad.push(`measured:${s}`);
      if (/^درخواست|از پزشک$/.test(s)) bad.push(`phrased:${s}`);
    }
  }
  assert.deepEqual([...new Set(bad)], []);
  assert.ok(run(P.ida).x.suggested.length > 0, "پنلِ فقرِ آهن هیچ پیشنهادی نداشت — آزمونِ تهی");
});

test("X8: پیشنهادِ تکراری در فهرستِ برگه یک بار؛ یافتهٔ بی‌پیشنهاد ⇒ []", () => {
  for (const tests of COMMON) {
    const { x } = run(tests);
    assert.equal(new Set(x.suggested).size, x.suggested.length);
    for (const f of x.findings) assert.ok(Array.isArray(f.suggest));
  }
});

// ═════════════════════════ US3 ═════════════════════════
test("X9: کلسیمِ اصلاح‌شده با آلبومین ⇒ «روی برگه» ۷٫۲ و derived_from؛ شاخص‌ها با روشِ محاسبه", () => {
  const { x } = run(P.caalb);
  const ca = x.tests.find((t) => t.name === faName("CA"));
  assert.ok(ca, "ردیفِ کلسیم نبود");
  // واحدِ «روی برگه» فقط وقتی آمده که موتور واقعاً آن را از برگه خوانده باشد (تبدیلِ واحد با basis=printed)؛ اینجا نمی‌داند ⇒ null.
  assert.deepEqual(ca.printed, { value: 7.2, unit: null });
  assert.equal(ca.derived_from, "albumin_correction");
  assert.equal(ca.printed_range, "8.5–10.5");
  const labels = x.indices.map((i) => i.label);
  for (const l of ["eGFR", "شکافِ آنیونی", "شکافِ آنیونیِ اصلاح‌شده با آلبومین", "کلسیمِ اصلاح‌شده با آلبومین"]) assert.ok(labels.includes(l), `${l} نیست: ${labels}`);
  for (const i of x.indices) { assert.ok(/[؀-ۿ]/.test(i.method_fa), i.label); assert.ok(i.inputs.length > 0, i.label); }
});

test("X10: HbA1c 53 mmol/mol ⇒ «روی برگه» 53 mmol/mol، سنجیده‌شده به %، derived_from = unit_conversion", () => {
  const { x } = run([T("HbA1c", 53, "mmol/mol")]);
  const r = x.tests.find((t) => t.name === faName("HBA1C"));
  assert.deepEqual(r.printed, { value: 53, unit: "mmol/mol" });
  assert.equal(r.graded.unit, "%");
  assert.equal(r.derived_from, "unit_conversion");
});

test("X11: جاروب — «روی برگه» فقط وقتی پر است که عددِ سنجیده‌شده با آن فرق دارد و دلیلش معلوم است (SC-005، N5)", () => {
  // بازبینیِ کد: نسخهٔ قبلی همیشه printed را پر می‌کرد (حتی WBC 7000 ⇒ «7 K/µL»)، پس این آزمون نمی‌توانست بشکند.
  const bad = [];
  for (const { patient, tests } of sweepPanels().panels) {
    const { x } = run(tests, patient);
    for (const r of [...x.tests.filter((t) => t.graded), ...x.findings.flatMap((f) => [...f.triggers, ...f.context])]) {
      if (r.printed && !r.derived_from) bad.push(`printed-without-reason:${r.name}`);
      if (r.derived_from && !r.printed) bad.push(`reason-without-printed:${r.name}`);
    }
  }
  assert.deepEqual([...new Set(bad)], []);
});

test("X22: کلسیمِ mmol/L + آلبومینِ پایین ⇒ «روی برگه» 2 mmol/L و دلیل «تبدیلِ واحد + اصلاح با آلبومین» (N5، بازبینیِ کد)", () => {
  // پیش از رفع: فقط «تبدیلِ واحد» — یعنی «2 mmol/L = 9.5 mg/dL»، درحالی‌که 2 mmol/L ≈ 8 mg/dL است و 9.5 عددِ اصلاح‌شده.
  const { x } = run([T("Ca", 2.0, "mmol/L"), T("Albumin", 2.5, "g/dL")]);
  const ca = x.tests.find((t) => t.name === faName("CA"));
  assert.equal(ca.printed?.value, 2);
  assert.match(String(ca.printed?.unit), /mmol/i);
  assert.equal(ca.derived_from, "unit_conversion_and_albumin_correction");
});

test("X23: واحدی که برگه چاپ نکرده «روی برگه» نوشته نمی‌شود — کراتینینِ ۸۰ بی‌واحد کنارِ بازهٔ ۵۳–۱۰۶ (N5، frontend.md)", () => {
  const { x } = run([T("Creatinine", 80, "", "53-106")]);
  const cr = x.tests.find((t) => t.name === faName("CREAT"));
  assert.equal(cr.printed?.value, 80);
  assert.equal(cr.printed?.unit, null);
  assert.ok(cr.unit_assumed, "واحدِ برداشت‌شده باید جدا و با نامِ خودش بیاید");
});

test("X24: WBC 7000 ⇒ «روی برگه» ادعا نمی‌شود (موتور عدد را به K/µL برده؛ عددِ چاپ‌شده را نگه نداشته)", () => {
  const { x } = run([T("WBC", 7000)]);
  const w = x.tests.find((t) => t.name === faName("WBC"));
  assert.equal(w.printed, null);
  assert.equal(w.derived_from, null);
});

test("X25: ردیفِ بی‌نامِ فارسی (نوتروفیلِ ٪ بی WBC) کلیدِ خام نمی‌شود (N8، بازبینیِ کد)", () => {
  for (const name of ["Neutrophils", "Lymphocytes", "Monocytes"]) {
    const { e, x } = run([T(name, 80, "%")]);
    assert.ok(Object.keys(e.ungraded ?? {}).length > 0, `${name}: ردیفِ بی‌حکم ساخته نشد — آزمونِ تهی`);
    assert.deepEqual(leaks(x), [], name);
  }
});

test("X26: فیلترِ forbid روی پیشنهادهای نمای تخصصی هم هست — کم‌خونیِ ماکروسیتیک + ترومبوسیتوز ⇒ «فریتین» پیشنهاد نمی‌شود", () => {
  const { p, x } = run([T("Hb", 9.5, "g/dL"), T("MCV", 110, "fL"), T("PLT", 600, "K/uL")]);
  assert.ok(p.findings.some((f) => (f.forbid ?? []).some((w) => /فریتین/.test(w))), "هیچ یافته‌ای فریتین را ممنوع نکرد — آزمونِ تهی");
  const all = [...x.suggested, ...x.findings.flatMap((f) => f.suggest)];
  assert.ok(!all.some((s) => /فریتین/.test(s)), all.join(" | "));
});

test("X27: دستورها یک‌جا، همان فهرستِ نمای ساده — یافته‌ها action ندارند، تا دستورِ رقیب کنارِ اورژانس ننشیند (N7/N20)", async () => {
  const { buildEngineRecommendations } = await import("./prompt.js");
  for (const tests of [[...P.k7, ...P.ida], P.ptinr, P.lipid]) {
    const { e, p, x } = run(tests);
    for (const f of [...x.findings, ...x.hidden]) assert.ok(!("action" in f), `${f.label}: action`);
    assert.deepEqual(x.recommendations, buildEngineRecommendations(p, e));
  }
});

test("X12: اورهٔ بی‌واحد ⇒ ردیفِ «بدون حکم» با عددِ چاپ‌شده؛ هیچ ردیفِ بی‌حکمی «طبیعی» نیست (اصلِ II)", () => {
  const { x } = run(P.urea);
  const r = x.tests.find((t) => t.name === faName("UREA"));
  assert.ok(r, "ردیفِ اوره نبود");
  assert.equal(r.status_fa, "بدون حکم");
  assert.equal(r.printed?.value, 150);
  assert.ok(!x.tests.some((t) => t.status_fa === "بدون حکم" && /طبیعی/.test(t.status_fa)));
});

// ═════════════════════════ US5 ═════════════════════════
test("X13: ریزِ نمره رونوشتِ فقط‌خواندنیِ healthScore است؛ فوریت و has_critical دست‌نخورده (SC-003، FR-020)", () => {
  for (const { patient, tests } of sweepPanels().panels.filter((_, i) => i % 3 === 0)) {
    const e = runEngine({ patient, tests });
    const p = runPatterns(e);
    const crit = p.has_critical;
    const s = healthScore(e, p);
    const x = buildExpertView(e, p, s);
    assert.equal(p.has_critical, crit);
    assert.equal(x.urgency, p.overall_urgency);
    if (s == null) { assert.equal(x.score, null); continue; }
    assert.equal(x.score.value, s.value); assert.equal(x.score.band, s.band); assert.equal(x.score.reason, s.reason);
    s.systems.forEach((sys, i) => {
      const y = x.score.systems[i];
      assert.equal(y.fa, sys.fa); assert.equal(y.score, sys.score); assert.equal(y.cap, sys.cap); assert.equal(y.capped, sys.capped);
      assert.deepEqual(y.keys, sys.keys.map(faName));
      assert.equal(y.worst, sys.worst ? sys.worst.name : null);
    });
  }
});

// ═════════════════════════ US4 — گاردهای `pro` ═════════════════════════
const MOJIBAKE = /[\u00D8-\u00DB\u00C3\u00E2\uFFFD]|\?{3,}/;
const OUTPATIENT = /اورژانس|۱۱۵|مطب|وقت بگیرید|نوبتِ?\s*عادی|مراجعه کنید|این هفته|همین امروز|تماس بگیرید/;
const toLatin = (s) => s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
const codeOf = (rule) => [rule.match, rule.build].filter(Boolean).map((fn) => fn.toString()).join("\n")
  .replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
/** همهٔ ایرادهای یک بلوکِ pro — خالی یعنی سالم. */
function proProblems(rule) {
  const pro = rule.pro, out = [];
  const lists = ["cautions", "differential", "workup"];
  for (const k of lists) if (pro[k] != null && (!Array.isArray(pro[k]) || pro[k].some((s) => typeof s !== "string" || !s.trim()))) out.push(`shape:${k}`);
  if (!lists.some((k) => pro[k]?.length)) out.push("empty");
  const code = toLatin(codeOf(rule));
  for (const s of lists.flatMap((k) => pro[k] ?? [])) {
    if (MOJIBAKE.test(s)) out.push(`mojibake:${s.slice(0, 20)}`);
    if (!/[؀-ۿ]/.test(s)) out.push(`not-fa:${s.slice(0, 20)}`);
    // «ویتامین K» نامِ ویتامین است، نه کلیدِ پتاسیم.
    const sk = s.replace(/ویتامینِ?[ ]+K/g, "ویتامین");
    for (const k of RAW_KEYS) if (new RegExp(`(^|[^A-Za-z0-9_])${k}([^A-Za-z0-9_]|$)`).test(sk)) out.push(`key:${k}`);
    if (OUTPATIENT.test(s)) out.push(`outpatient:${s.slice(0, 20)}`);
    if (/(^|\s)شما(\s|$|[،.])/.test(s)) out.push(`second-person:${s.slice(0, 20)}`);
    // عدد به‌عنوانِ *نشانه*، نه زیررشته: «12» در «120»ِ کد پذیرفته نمی‌شود (بازبینیِ کد).
    const codeNums = new Set(code.match(/\d+(?:\.\d+)?/g) ?? []);
    for (const n of toLatin(s).match(/\d+(?:\.\d+)?/g) ?? []) if (!codeNums.has(n)) out.push(`number:${n}`);
  }
  for (const id of pro.sources ?? []) if (!GUIDELINE_IDS.has(id)) out.push(`source:${id}`);
  return out;
}
const fixture = (pro) => ({ id: "fx", match: () => false, build: () => ({ urgency: "routine", t: 30 }), pro });

test("X14: گاردِ شکل/زبان/کلید/منبعِ pro روی fixtureِ خراب می‌گیرد و روی همهٔ قاعده‌های واقعی سالم است", () => {
  assert.ok(proProblems(fixture({ cautions: [] })).includes("empty"));
  // عمداً با \u: نویسهٔ لفظی، M37 را روی همین فایل قرمز می‌کند.
  assert.ok(proProblems(fixture({ cautions: ["\u00D8\u00B3\u00D9\u201E"] })).some((x) => x.startsWith("mojibake")));
  assert.ok(proProblems(fixture({ cautions: ["only english here"] })).some((x) => x.startsWith("not-fa")));
  assert.ok(proProblems(fixture({ cautions: ["مقدارِ BILI_T بالاست"] })).some((x) => x.startsWith("key")));
  assert.ok(proProblems(fixture({ cautions: ["متن"], sources: ["NOPE_2099"] })).some((x) => x.startsWith("source")));
  const bad = RULES.filter((r) => r.pro).flatMap((r) => proProblems(r).map((x) => `${r.id} ${x}`));
  assert.deepEqual(bad, []);
});

test("X15: متنِ pro هیچ عددی ندارد که در کدِ خودِ قاعده نباشد (آستانهٔ تازه ممنوع)", () => {
  assert.ok(proProblems(fixture({ cautions: ["بالای ۷۵ معنادار است"] })).some((x) => x === "number:75"), "fixture با ۷۵ نگرفت");
  assert.deepEqual(proProblems(fixture({ cautions: ["بالای ۳۰ معنادار است"] })), [], "عددِ موجود در کد نباید رد شود");
  const bad = RULES.filter((r) => r.pro).flatMap((r) => proProblems(r).filter((x) => x.startsWith("number")).map((x) => `${r.id} ${x}`));
  assert.deepEqual(bad, []);
});

test("X16: pro لحنِ سرپایی و «شما» ندارد", () => {
  assert.ok(proProblems(fixture({ cautions: ["به اورژانس بروید"] })).some((x) => x.startsWith("outpatient")));
  assert.ok(proProblems(fixture({ cautions: ["عددِ شما بالاست"] })).some((x) => x.startsWith("second-person")));
});

test("X17: یافتهٔ قاعدهٔ دارای pro همان بلوک را دارد؛ بی‌pro ⇒ null؛ دستهٔ اول (۳۰ قاعده) کامل است (SC-009)", () => {
  const BATCH = ["microcytic_anemia", "iron_deficiency_panel", "thal_trait_no_anemia", "macrocytic_anemia", "normocytic_anemia",
    "anemia_chronic_disease", "overt_b12_deficiency", "leukocytosis", "mild_neutropenia", "lymphopenia", "thrombocytopenia",
    "isolated_thrombocytopenia", "glycemia", "lipid_profile", "thyroid", "liver_pattern", "kidney", "potassium_critical",
    "sodium_critical", "calcium_abnormal", "hyperuricemia", "vitamin_d_abnormal", "iron_markers_high", "high_anion_gap",
    "crp_elevated", "esr_elevated", "coagulation_abnormal", "uti_pattern", "proteinuria_pattern", "hematuria_pattern"];
  const missing = BATCH.filter((id) => !RULES.find((r) => r.id === id)?.pro);
  assert.deepEqual(missing, []);
  assert.ok(RULES.filter((r) => r.pro).length >= 20);
  for (const tests of [P.ptinr, P.ida, P.lipid, P.k7]) {
    const { p, x } = run(tests);
    p.findings.forEach((f, i) => {
      const pro = RULES.find((r) => r.id === f.rule_id)?.pro ?? null;
      const got = x.findings[i].pro;
      if (!pro) { assert.equal(got, null, f.rule_id); return; }
      for (const k of ["cautions", "differential", "workup"]) assert.deepEqual(got[k], pro[k] ?? [], `${f.rule_id}.${k}`);
      // منبع‌ها به نام و پیوند تبدیل شده‌اند، نه شناسهٔ خام (بازبینیِ کد: pro.sources رندر نمی‌شد)
      assert.equal(got.sources.length, (pro.sources ?? []).length, f.rule_id);
      for (const s of got.sources) { assert.ok(s.fa || s.title, f.rule_id); assert.ok(!("id" in s), f.rule_id); }
    });
  }
});

// ═════════════════════════ US6 ═════════════════════════
test("X18: بیمارِ بستری — هیچ جملهٔ سرپایی در نمای تخصصی نمی‌ماند (SC-006، P99)", () => {
  // برچسب‌ها (سرتیتر، «این هفته»، حکمِ آزمایش) دستور نیستند؛ فقط متن‌هایی که بیمار/کادر را جایی می‌فرستند سنجیده می‌شوند.
  const SKIP = new Set(["label", "pro", "status_fa", "urgency_fa"]);
  const bad = new Set();
  let control = 0;
  for (const { patient, tests } of sweepPanels().panels) {
    const { x } = run(tests, { ...patient, conditions: ["hospitalized"] });
    for (const s of strings(x, [], SKIP)) if (OUTPATIENT.test(s)) bad.add(s.slice(0, 70));
    if (strings(run(tests, patient).x, [], SKIP).some((s) => OUTPATIENT.test(s))) control++;
  }
  assert.ok(control > 20, `کنترلِ منفی: بی‌بستری فقط ${control} پنل جملهٔ سرپایی داشت — آزمونِ تهی`);
  assert.deepEqual([...bad], []);
});

// ═════════════════════════ یافته‌های پنهان (FR-016، Q2) ═════════════════════════
test("X19: کراتینینِ ۹ + TSH بالا + کلسترولِ بالا ⇒ یافته‌های پنهان با نام، محرک و منبع؛ بی action/warnings/pro", () => {
  const { p, x } = run([T("Creatinine", 9, "mg/dL"), T("TSH", 7, "mIU/L"), T("Cholesterol", 260, "mg/dL")]);
  const expected = p.suppressed_ids.length - p.supplementary_ids.length;
  assert.ok(expected > 0, "هیچ یافته‌ای پنهان نشد — آزمونِ تهی");
  assert.equal(x.hidden.length, expected);
  for (const hf of x.hidden) {
    assert.ok(hf.label && /[؀-ۿ]/.test(hf.label));
    assert.ok(Array.isArray(hf.triggers) && Array.isArray(hf.sources));
    for (const k of ["action", "warnings", "pro"]) assert.ok(!(k in hf), `${hf.label}: ${k}`);
  }
});

test("X20: هر شناسه در pro_text.js قاعدهٔ زنده دارد (متنِ بی‌صاحب، N16)", async () => {
  const { PRO_TEXT } = await import("./pro_text.js");
  const orphans = Object.keys(PRO_TEXT).filter((id) => !RULE_IDS.has(id));
  assert.deepEqual(orphans, []);
  assert.equal(RULES.filter((r) => r.pro).length, Object.keys(PRO_TEXT).length);
});

test("X21: قاعده‌ای که در هر دو جهت فعال می‌شود، pro جهت‌دار دارد — هر بند با «در افزایش:»، «در کاهش:» یا «در هر دو جهت:» (N12، بازبینیِ کد)", () => {
  // پیش از رفع: K 2.5 زیرِ سرتیترِ «پتاسیم پایین است» فهرستِ علت‌های افزایشِ پتاسیم را می‌گرفت.
  const BOTH = { potassium_critical: [T("K", 2.5, "mEq/L"), T("K", 6.8, "mEq/L")], sodium_critical: [T("Na", 118, "mEq/L"), T("Na", 162, "mEq/L")],
    calcium_abnormal: [T("Ca", 6.8, "mg/dL"), T("Ca", 12.5, "mg/dL")], vitamin_d_abnormal: [T("Vitamin D", 8, "ng/mL"), T("Vitamin D", 160, "ng/mL")] };
  for (const [id, rows] of Object.entries(BOTH)) {
    for (const r of rows) assert.ok(run([r]).p.findings.some((f) => f.rule_id === id), `${id} با ${r.name} ${r.value} فعال نشد — آزمونِ تهی`);
    const pro = RULES.find((x) => x.id === id).pro;
    const bad = ["cautions", "differential"].flatMap((k) => (pro[k] ?? []).filter((s) => !/^در (افزایش|کاهش|هر دو جهت):/.test(s)));
    assert.deepEqual(bad, [], id);
  }
});
