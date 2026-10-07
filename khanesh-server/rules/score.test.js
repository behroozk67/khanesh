// «امتیازِ این برگه» — specs/015 (بازطراحیِ P97).
// ⚠️ هر تستِ تازه پیش از پیاده‌سازی روی score.js/patterns.jsِ قدیم اجرا و قرمز دیده شد (اصلِ IV)؛ نتیجه در
//    specs/015-sheet-score-redesign/baseline.txt. آن‌هایی که روی کدِ قدیم هم سبز بودند نگهبان‌اند و همین‌جا گفته شده.
import { describe, it } from "node:test";
import assert from "node:assert";
import {
  healthScore, testPoints, parseRange, SCORE_TABLE, EXCLUDED, SYSTEMS, URGENCY_CAP,
} from "./score.js";
import { runEngine, NAME_MAP } from "./adapter.js";
import { runPatterns } from "./patterns.js";
import { ADULT_REFS } from "./refs.js";
import { PED_REFS } from "./refs_ped.js";
import { CLASSIFIERS } from "./interpret.js";
import { CTCAE_MAP } from "./ctcae.js";
import { faName } from "./names.js";

// ── ردیفِ graded دست‌ساز (همان شکلی که adapter می‌سازد: range رشتهٔ «lo–hi») ──
const G = (test, value, range, extra = {}) => ({
  test, value, range, mode: "binary", abnormal: false, dir: null, nearLimit: false, level: null, ...extra,
});
const HI = (test, value, range, extra = {}) => G(test, value, range, { abnormal: true, dir: "high", ...extra });
const LO = (test, value, range, extra = {}) => G(test, value, range, { abnormal: true, dir: "low", ...extra });
// ده ردیفِ طبیعی، ده سطل، هشت دستگاه
const NORMAL = () => [
  G("HGB", 14.5, "13.7–17.5"), G("WBC", 6.5, "4–10"), G("PLT", 250, "150–400"),
  G("CREAT", 0.9, "0.7–1.3"), G("ALT", 20, "0–41"), G("GLU_F", 90, "70–99"),
  G("PT", 12, "11–13.5"), G("CRP", 2, "0–5"), G("NA", 140, "135–145"), G("LDL", 100, "0–130"),
];
const sys = (s, id) => s.systems.find((x) => x.id === id);

// ── موتورِ واقعی ──
const T = (name, value, unit = "") => ({ name, value: String(value), unit });
// پنلِ اندازه‌گیری‌شدهٔ research R5 (مرد ۴۰ ساله، همه طبیعی)
const BASE = () => [
  T("Hb", 14.5, "g/dL"), T("WBC", 6.5, "x10^3/uL"), T("PLT", 250, "x10^3/uL"), T("Creatinine", 0.9, "mg/dL"),
  T("ALT", 20, "U/L"), T("AST", 22, "U/L"), T("FBS", 90, "mg/dL"),
];
// ⚠️ جنس/سن زیرِ `patient` است؛ `{ sex }` در سطحِ اول خوانده نمی‌شود و بی‌صدا «جنسِ نامعلوم» می‌شود (بازهٔ زنانهٔ فریتین).
function run(tests, patient = { sex: "M", age: 40 }) {
  const e = runEngine({ tests, patient });
  const p = runPatterns(e);
  return { e, p, s: healthScore(e, p) };
}

describe("جدولِ امتیاز (FR-006)", () => {
  it("SCORE_TABLE ∪ EXCLUDED دقیقاً همهٔ کلیدهای ADULT/PED/CLASSIFIERS/CTCAE را یک‌بار پوشش می‌دهد", () => {
    const want = new Set([...Object.keys(ADULT_REFS), ...Object.keys(PED_REFS), ...Object.keys(CLASSIFIERS), ...Object.keys(CTCAE_MAP)]);
    const inTable = new Set(Object.keys(SCORE_TABLE));
    const inExcl = new Set(Object.keys(EXCLUDED));
    const both = [...inTable].filter((k) => inExcl.has(k));
    assert.deepEqual(both, [], `هم در جدول هم در استثنا: ${both}`);
    const missing = [...want].filter((k) => !inTable.has(k) && !inExcl.has(k));
    assert.deepEqual(missing, [], `بی‌دستگاه: ${missing}`);
    const extra = [...inTable, ...inExcl].filter((k) => !want.has(k));
    assert.deepEqual(extra, [], `کلیدِ ناموجود در موتور: ${extra}`);
    const ids = new Set(SYSTEMS.map((s) => s.id));
    assert.equal(ids.size, 8);
    for (const [k, v] of Object.entries(SCORE_TABLE)) assert.ok(ids.has(v.system), `${k}: ${v.system}`);
  });

  it("هر بازهٔ graded یا «lo–hi» است یا یک‌طرفه (≥) — شکلِ سوم پنهانی ۰٫۵ نمی‌گیرد", () => {
    const nameOf = {};
    for (const [n, k] of Object.entries(NAME_MAP)) if (!nameOf[k]) nameOf[k] = n;
    const seen = new Set();
    for (const [k, ref] of Object.entries(ADULT_REFS)) {
      const r = ref.both ?? ref.M;
      if (!nameOf[k] || !Array.isArray(r)) continue;
      for (const v of [(r[0] + r[1]) / 2, (r[1] || 1) * 3]) {
        const e = runEngine({ tests: [T(nameOf[k], v, ref.unit ?? "")], patient: { sex: "M", age: 40 } });
        for (const g of e.graded) {
          seen.add(g.test);
          if (g.mode === "unknown") continue;
          assert.ok(parseRange(g.range) || /^≥ /.test(String(g.range)), `${g.test}: «${g.range}»`);
        }
      }
    }
    assert.ok(seen.size >= 40, `فقط ${seen.size} کلید graded شد — جاروب بی‌معنی است`);
  });
});

describe("نمرهٔ هر آزمایش (FR-001..FR-004)", () => {
  it("فاصله برحسبِ عرضِ بازه: PT 14 ⇒ 0.90 (سقفِ ناهنجار)، INR 1.2 = 0.80، pH 7.25 = 0.50، Cl 85 ≈ 0.39", () => {
    const near = (a, b) => assert.ok(Math.abs(a - b) <= 0.01, `${a} ≠ ${b}`);
    near(testPoints(HI("PT", 14, "11–13.5")), 0.9);   // منحنی ۰٫۹۶ می‌دهد؛ ناهنجار هرگز بالای «نزدیکِ مرز» نیست
    near(testPoints(HI("INR", 1.2, "0.9–1.1")), 0.8);
    near(testPoints(LO("PH", 7.25, "7.35–7.45")), 0.5);
    near(testPoints(LO("CL", 85, "95–103")), 0.39);
  });

  // 🔴 بازبینیِ کد (۲۰۲۶-۱۰-۰۷): پیش از این، عبور از مرز امتیاز را بالا می‌برد — نزدیکِ مرز ۰٫۹، کمی بیرون ۰٫۹۹ تا ۱٫۰.
  it("عبور از مرز امتیاز را بالا نمی‌برد: ناهنجار ≤ نزدیکِ مرز (۰٫۹)", () => {
    const inside = testPoints(G("HBA2", 3.4, "2.2–3.5", { nearLimit: true }));
    for (const v of [3.51, 3.54, 3.6]) assert.ok(testPoints(HI("HBA2", v, "2.2–3.5")) <= inside, `${v}`);
  });

  it("طبیعی ۱، نزدیکِ مرز ۰٫۹ (بی‌تغییر)", () => {
    assert.equal(testPoints(G("HGB", 14.5, "13.7–17.5")), 1);
    assert.equal(testPoints(G("HGB", 13.8, "13.7–17.5", { nearLimit: true })), 0.9);
  });

  // نگهبان: روی کدِ قدیم هم سبز است (آن‌جا marked همیشه ۰٫۱۵ بود)؛ این‌جا تضمین می‌کند فاصلهٔ کوچک درجه را نرم نکند.
  it("سطحِ CTCAE کف است: K با level=marked یک درصد بالای ULN همان ۰٫۱۵", () => {
    assert.equal(testPoints(HI("K", 5.05, "3.5–5", { mode: "severity", level: "marked" })), 0.15);
  });

  it("بازهٔ یک‌طرفه/نامعلوم ⇒ مقدارِ درجه، وگرنه ۰٫۵ (تنها جای ماندهٔ ۰٫۵)", () => {
    assert.equal(testPoints(HI("X", 70, "≥ 60")), 0.5);
    assert.equal(testPoints(HI("X", 70, "≥ 60", { level: "moderate" })), 0.4);
  });
});

describe("SC-001 و سقفِ هر دستگاه (US1)", () => {
  it("SC-001: PT 14 + INR 1.2 روی برگهٔ طبیعی ⇒ کل > ۸۰؛ انعقاد ۷۵ (سقفِ this_week)، بقیه ≥ ۹۵", () => {
    const { s, p } = run([...BASE(), T("PT", 14, "sec"), T("INR", 1.2)]);
    assert.equal(p.overall_urgency, "this_week");
    assert.ok(s.value > 80, `value=${s.value}`);
    const coag = sys(s, "coag");
    assert.equal(coag.cap, 75);
    assert.equal(coag.score, 75);
    for (const x of s.systems) if (x.id !== "coag" && x.score != null) assert.ok(x.score >= 95, `${x.id}=${x.score}`);
  });

  it("سقفِ this_week فقط روی دستگاهِ خودش است، نه کلِ برگه", () => {
    const { s } = run([...BASE(), T("PT", 14, "sec"), T("INR", 1.2)]);
    for (const id of ["blood", "kidney", "liver", "metabolic"]) assert.equal(sys(s, id).cap, null, id);
  });

  // 🔴 بازبینیِ کد: ruleReads کلیدِ تک‌حرفیِ K را نمی‌بیند ⇒ potassium_critical (soon) سقفی نمی‌گذاشت و برگه ۹۶/«high» می‌گرفت.
  it("پتاسیمِ soon سقفِ دستگاهِ الکترولیت (۵۵) را می‌گیرد و برگه «high» نمی‌شود", () => {
    for (const k of [5.5, 5.75]) {
      const { s, p } = run([...BASE(), T("K", k, "mmol/L")]);
      assert.equal(p.overall_urgency, "soon", `K ${k}`);
      assert.ok(sys(s, "lytes").score <= 55, `K ${k}: lytes=${sys(s, "lytes").score}`);
      assert.notEqual(s.band, "high", `K ${k}: value=${s.value}`);
    }
  });

  // 🔴 بازبینیِ کد: یافته دربارهٔ ردیفِ بی‌حکم (اورهٔ بی‌واحد) هیچ کلیدِ graded نداشت ⇒ برگه ۱۰۰ و «همه در محدوده».
  it("یافتهٔ this_week دربارهٔ ردیفِ بی‌حکم ⇒ سقفِ کلِ برگه ۷۵ و ردیفِ بی‌حکم شمرده می‌شود", () => {
    const { s, p } = run([...BASE(), T("Urea", 150)]);
    assert.ok(p.findings.some((f) => f.rule_id === "unit_unknown_values" && f.urgency === "this_week"), p.findings.map((f) => f.rule_id).join());
    assert.ok(s.value <= 75, `value=${s.value}`);
    assert.ok(s.count.unread >= 1);
    assert.notEqual(s.band, "high");
  });

  it("سطل: PT+INR+aPTT یک‌بار شمرده می‌شوند (aPTTِ کمی بالا نمرهٔ انعقاد را عوض نمی‌کند)", () => {
    const a = healthScore({ graded: [...NORMAL().filter((g) => g.test !== "PT"), HI("PT", 14, "11–13.5"), HI("INR", 1.2, "0.9–1.1")] }, "none");
    const b = healthScore({ graded: [...NORMAL().filter((g) => g.test !== "PT"), HI("PT", 14, "11–13.5"), HI("INR", 1.2, "0.9–1.1"), HI("APTT", 35.5, "24–35")] }, "none");
    assert.equal(sys(a, "coag").raw, sys(b, "coag").raw);
    assert.equal(a.value, b.value);
  });
});

describe("خطرناک هرگز میانگین نمی‌شود (US2)", () => {
  // FR-011/FR-020: سقفِ کلِ برگه برای soon/this_week/routine عمداً بازنشسته شد؛ فقط emergency ⇒ ≤ ۳۵ سراسری است.
  it("emergency ⇒ ≤ ۳۵، با پتاسیم ۷ از موتورِ واقعی", () => {
    const { s, p } = run([...BASE(), T("K", 7.0, "mmol/L")]);
    assert.equal(p.overall_urgency, "emergency");
    assert.ok(s.value != null && s.value <= URGENCY_CAP.emergency, `value=${s.value}`);
    assert.equal(s.capped, true);
  });

  it("یک بحرانی بینِ ۱۹ طبیعی — اورژانس ⇒ ≤ ۳۵", () => {
    const g = [...NORMAL(), HI("K", 7.5, "3.5–5", { mode: "severity", level: "critical" })];
    const s = healthScore({ graded: g }, "emergency");
    assert.ok(s.value <= 35, `value=${s.value}`);
    assert.equal(s.band, "low");
  });

  it("کل ≤ بدترین دستگاه + ۳۰ (هفت دستگاهِ سالم و یک دستگاهِ ۴۰، بی‌اورژانس)", () => {
    const g = [...NORMAL().filter((x) => x.test !== "NA"), HI("K", 5.6, "3.5–5", { mode: "severity", level: "moderate" })];
    const s = healthScore({ graded: g }, "none");
    assert.equal(sys(s, "lytes").score, 40);
    assert.ok(s.value <= 70, `value=${s.value}`);
  });

  // نگهبانِ متامورفیک (SC-003): روی کدِ قدیم هم تا حدِ زیادی برقرار بود؛ قرمز-اول نیست، قفل است.
  it("بدترشدنِ یک مقدار (۱۰ گام از مرز) امتیازِ کل را هرگز بالا نمی‌برد — موتورِ واقعی", () => {
    const walks = [
      ["PT", "sec", 13.5, 1.5], ["INR", "", 1.1, 0.2], ["K", "mmol/L", 5.0, 0.3], ["FBS", "mg/dL", 99, 25],
      ["ALT", "U/L", 41, 40], ["Creatinine", "mg/dL", 1.3, 0.5], ["Hb", "g/dL", 13.7, -0.9], ["PLT", "x10^3/uL", 150, -14],
    ];
    for (const [name, unit, from, step] of walks) {
      let prev = Infinity;
      // از خودِ مرز (i=0، درونِ بازه و نزدیکِ مرز) شروع می‌شود تا لحظهٔ عبور هم آزموده شود (بازبینیِ کد).
      for (let i = 0; i <= 10; i++) {
        const v = +(from + step * i).toFixed(3);
        const tests = [...BASE().filter((t) => t.name !== name), T(name, v, unit)];
        const { s } = run(tests);
        assert.ok(s.value != null, `${name} ${v}: ${s.reason}`);
        assert.ok(s.value <= prev, `${name} ${v}: ${s.value} > ${prev}`);
        prev = s.value;
      }
    }
  });

  // نگهبانِ متامورفیک (SC-004): یافته‌ها ثابت؛ افزودنِ ردیفِ طبیعی در هر دستگاه کل را پایین نمی‌آورد.
  it("افزودنِ آزمایشِ طبیعی (با یافته‌های ثابت) امتیاز را پایین نمی‌آورد", () => {
    const base = [...NORMAL().filter((g) => g.test !== "PT"), HI("PT", 16, "11–13.5"), HI("INR", 1.6, "0.9–1.1")];
    const po = { overall_urgency: "this_week", findings: [{ rule_id: "coagulation_abnormal", urgency: "this_week" }] };
    const v0 = healthScore({ graded: base }, po).value;
    const adds = [G("MCV", 90, "80–100"), G("AST", 20, "0–40"), G("UREA", 30, "17–43"), G("TSH", 2, "0.4–4.5"),
      G("FIB", 300, "200–400"), G("ESR", 5, "0–15"), G("K", 4.2, "3.5–5"), G("HDL", 55, "40–100")];
    for (const a of adds) {
      const v = healthScore({ graded: [...base, a] }, po).value;
      assert.ok(v >= v0, `+${a.test}: ${v} < ${v0}`);
    }
  });
});

describe("دادهٔ کم ⇒ بی‌عدد (US4)", () => {
  it("کمتر از ۵ سطل ⇒ too_few، حتی با ۶ ردیف (PT/INR/APTT و Hb/HCT هم‌سطل‌اند)", () => {
    const g = [G("PT", 12, "11–13.5"), G("INR", 1, "0.9–1.1"), G("APTT", 30, "24–35"),
      G("HGB", 14.5, "13.7–17.5"), G("HCT", 45, "41–53"), G("ALT", 20, "0–41")];
    const s = healthScore({ graded: g }, "none");
    assert.equal(s.value, null);
    assert.equal(s.band, null);
    assert.equal(s.reason, "too_few");
  });

  it("یک دستگاه ⇒ one_system و نمرهٔ همان دستگاه می‌ماند — CBC + فریتین از موتورِ واقعی", () => {
    const { s } = run([T("Hb", 14.5, "g/dL"), T("WBC", 6.5, "x10^3/uL"), T("PLT", 250, "x10^3/uL"),
      T("MCV", 90, "fL"), T("RDW", 13, "%"), T("Ferritin", 100, "ng/mL")]);
    assert.equal(s.value, null);
    assert.equal(s.reason, "one_system");
    assert.ok(sys(s, "blood").score != null);
    assert.deepEqual(s.covered, ["blood"]);
  });

  it("نوزاد (<۲۸ روز) ⇒ بی‌امتیاز، بی‌نمرهٔ دستگاه، ولی شمارش پر است", () => {
    const s = healthScore({ graded: NORMAL(), age: 10 / 365 }, "none");
    assert.equal(s.value, null);
    assert.equal(s.reason, "neonate");
    assert.ok(s.systems.every((x) => x.score == null));
    assert.equal(s.count.scored, 10);
    assert.equal(healthScore({ graded: NORMAL(), age: 30 }, "none").value, 100);
  });

  it("همه طبیعی روی ۸ دستگاه ⇒ ۱۰۰ و باند high", () => {
    const s = healthScore({ graded: NORMAL() }, "none");
    assert.equal(s.value, 100);
    assert.equal(s.band, "high");
    assert.equal(s.covered.length, 8);
  });

  it("آزمایشِ بی‌محدوده (unknown) در امتیاز و شمارش نمی‌آید", () => {
    const s = healthScore({ graded: [...NORMAL(), { test: "TSH", mode: "unknown", abnormal: false }] }, "none");
    assert.equal(s.points.TSH, undefined);
    assert.equal(s.count.scored, 10);
  });
});

describe("بیمار می‌بیند چرا (US3)", () => {
  it("شمارشِ ساده: ۱ کمی‌خارج، ۱ بحرانی، ۲ بی‌درجه؛ out = Σ levels + no_level", () => {
    const g = [...NORMAL().filter((x) => !["ALT", "PT"].includes(x.test)),
      HI("ALT", 60, "0–41", { mode: "severity", level: "mild" }), HI("K", 7.5, "3.5–5", { mode: "severity", level: "critical" }),
      HI("PT", 14, "11–13.5"), HI("FERRITIN", 320, "30–300"), HI("SEMEN_PH", 8.5, "7.2–8")];
    const s = healthScore({ graded: g }, "emergency");
    assert.equal(s.count.out, 4);
    assert.equal(s.count.levels.mild, 1);
    assert.equal(s.count.levels.critical, 1);
    assert.equal(s.count.no_level, 2);
    assert.equal(s.count.excluded, 1);
    const L = s.count.levels;
    assert.equal(s.count.out, L.mild + L.moderate + L.marked + L.critical + s.count.no_level);
  });

  it("پایین‌ترینِ هر دستگاه با faName نام برده می‌شود (N8)، و هر کلید فقط در یک دستگاه است", () => {
    const g = [...NORMAL().filter((x) => x.test !== "PT"), HI("PT", 14, "11–13.5"), HI("INR", 1.2, "0.9–1.1"),
      LO("HGB", 11, "13.7–17.5"), HI("CRP", 20, "0–5")].filter((x, i, a) => a.findIndex((y) => y.test === x.test) === i);
    const s = healthScore({ graded: g }, "none");
    assert.equal(s.systems.length, 8);
    assert.equal(sys(s, "coag").worst.key, "INR");
    const seen = new Set();
    for (const x of s.systems) {
      if (x.worst) assert.equal(x.worst.name, faName(x.worst.key));
      for (const k of x.keys) { assert.ok(!seen.has(k), k); seen.add(k); }
    }
  });

  it("قراردادِ v2: version، ۸ دستگاه به ترتیب، points و counted باقی", () => {
    const s = healthScore({ graded: NORMAL() }, "none");
    assert.equal(s.version, 2);
    assert.deepEqual(s.systems.map((x) => x.id), SYSTEMS.map((x) => x.id));
    assert.equal(s.points.HGB, 1);
    assert.equal(s.counted, 10);
  });
});
