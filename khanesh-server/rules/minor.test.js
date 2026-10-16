// P108-ب (تصمیمِ کاربر ۲۰۲۶-۱۰-۱۶): جدولِ سه‌ردهٔ «انحرافِ جزئی» (minor.js) و سقفِ routine برای برگهٔ تقریباً سالم.
//   ردهٔ ۱ هرگز جزئی نیست؛ ردهٔ ۲ مرزِ بالینیِ منبع‌دار یا نوارِ EFLM؛ ردهٔ ۳ نوارِ EFLM یا ۱۰٪.
import test from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";
import { ADULT_REFS } from "./refs.js";
import { BV } from "./biovar.js";
import { MINOR_TABLE, MINOR_SOURCES, MINOR_CAPPABLE, eflmBandPct, minorTier } from "./minor.js";

const r = (name, value, unit) => ({ name, value, ...(unit ? { unit } : {}) });
const M45 = { sex: "M", age: 45 };
const quiet = (fn) => { const e = console.error, w = console.warn; console.error = console.warn = () => {}; try { return fn(); } finally { console.error = e; console.warn = w; } };
const run = (tests, patient = M45) => quiet(() => runPatterns(runEngine({ patient, tests })));
const f = (p, id) => p.findings.find((x) => x.rule_id === id);
const WEEK = /این هفته|همین چند روز|در همین هفته‌های پیشِ رو/;

test("MN1: هر کلیدِ ADULT_REFS در هر دو جهت ردهٔ صریح دارد؛ هر EFLM در BV هست؛ هر منبعِ ردهٔ ۲ ثبت است", () => {
  const missing = Object.keys(ADULT_REFS).filter((k) => !MINOR_TABLE[k]?.low || !MINOR_TABLE[k]?.high);
  assert.deepEqual(missing, [], "کلیدِ بی‌رده (پیش‌فرض ردهٔ ۱ است، ولی تصمیم باید صریح باشد)");
  for (const [k, sides] of Object.entries(MINOR_TABLE)) {
    for (const s of [sides.low, sides.high]) {
      if (s.eflm) assert.ok(BV[k], `${k}: نوارِ EFLM بی CVi`);
      if (s.src) assert.ok(MINOR_SOURCES[s.src], `${k}: منبعِ ${s.src} ثبت نیست`);
    }
  }
  assert.equal(minorTier("NEW_KEY", "high"), 1, "کلیدِ ناشناخته ردهٔ ۱");
  assert.equal(eflmBandPct("CREAT"), 13);   // 1.96 × √(5.95² + 2.975²)
});

test("MN2: ردهٔ ۱ هرگز سقف نمی‌گیرد — Na، K، قند، کلسیم، Hb، PT کمی بیرون از بازه، تنها یا کنارِ کلسترولِ جزئی", () => {
  const lip = r("Cholesterol", "210", "mg/dL");
  for (const t of [r("Na", "133", "mmol/L"), r("K", "5.3", "mmol/L"), r("FBS", "115", "mg/dL"), r("Calcium", "10.5", "mg/dL"),
    r("Hb", "13.5", "g/dL"), r("PT", "14.2", "sec"), r("Ferritin", "28", "ng/mL")]) {
    const p = run([lip, t]);
    assert.equal(f(p, "lipid_profile")?.urgency, "this_week", `${t.name} ${t.value}: ${p.findings.map((x) => x.rule_id + ":" + x.urgency)}`);
    assert.ok(!p.findings.some((x) => x.minor_cap), t.name);
  }
});

test("MN3: مرزهای ردهٔ ۲ و ۳ — داخلِ نوار routine (با دستورِ هم‌خوان، N20)، بیرونِ نوار همان قبل", () => {
  const pairs = [
    ["lipid_profile", r("Cholesterol", "235", "mg/dL"), r("Cholesterol", "245", "mg/dL")],      // NCEP < ۲۴۰
    ["lipid_profile", r("LDL", "155", "mg/dL"), r("LDL", "165", "mg/dL")],                        // NCEP < ۱۶۰
    ["crp_elevated", r("CRP quantitative", "9", "mg/L"), r("CRP quantitative", "11", "mg/L")],    // AHA/CDC < ۱۰
    ["pancreas_pattern", r("Lipase", "800", "U/L"), r("Lipase", "860", "U/L")],                   // Atlanta < ۳×۲۸۰
    ["thyroid", r("FT4", "2.2", "ng/dL"), r("FT4", "2.4", "ng/dL")],                              // EFLM ۱۲٪ بالای ۲٫۰
    ["leukopenia", r("WBC", "3.5"), r("WBC", "3.2")],                                              // EFLM ۲۵٪ زیرِ ۴٫۵
  ];
  for (const [id, inside, outside] of pairs) {
    const a = f(run([inside]), id), b = f(run([outside]), id);
    assert.equal(a?.urgency, "routine", `${inside.name} ${inside.value}`);
    assert.equal(a.minor_cap, true);
    assert.doesNotMatch(String(a.action), WEEK, `${id}: دستورِ «این هفته» کنارِ routine`);
    assert.match(a.action, /نوسانِ طبیعیِ بدن/);
    assert.ok(b && ["this_week", "soon"].includes(b.urgency) && !b.minor_cap, `${outside.name} ${outside.value}: ${b?.urgency}`);
  }
});

test("MN4: پیش‌شرط‌ها — بارداری، زیرِ ۱۶ سال، بیماریِ فعال، eGFR < ۶۰ و دو ردهٔ سلولیِ پایین سقف را برمی‌دارند", () => {
  const lip = [r("Cholesterol", "215", "mg/dL")];
  assert.equal(f(run(lip), "lipid_profile").urgency, "routine");
  for (const P of [{ sex: "F", age: 30, pregnant: true }, { sex: "M", age: 45, conditions: ["dm2"] }]) {
    assert.ok(!run(lip, P).findings.some((x) => x.minor_cap), JSON.stringify(P));
  }
  assert.ok(!run([r("WBC", "3.6"), r("Platelet", "130")]).findings.some((x) => x.minor_cap), "WBC و پلاکتِ پایین با هم");
  assert.ok(!run([...lip, r("Creatinine", "1.25", "mg/dL")], { sex: "F", age: 75 }).findings.some((x) => x.minor_cap), "eGFR < ۶۰");
});

test("MN5: هیچ یافتهٔ سقف‌خورده‌ای در متنش «این هفته» ندارد، و فقط قاعده‌های فهرست سقف می‌گیرند (جاروب)", () => {
  const rows = [r("Cholesterol", "225", "mg/dL"), r("TG", "190", "mg/dL"), r("LDL", "150", "mg/dL"), r("ALT", "70", "U/L"), r("AST", "60", "U/L"),
    r("CK", "400", "U/L"), r("Lipase", "500", "U/L"), r("CRP quantitative", "8", "mg/L"), r("FT4", "2.15", "ng/dL"), r("WBC", "4.0"),
    r("Total Bilirubin", "1.9", "mg/dL"), r("LDH", "280", "U/L"), r("ALP", "330", "U/L"), r("Ferritin", "350", "ng/mL"), r("Urea", "52", "mg/dL")];
  let capped = 0;
  for (let i = 0; i < rows.length; i++) for (let j = i; j < rows.length; j++) {
    const p = run(i === j ? [rows[i]] : [rows[i], rows[j]]);
    for (const x of p.findings.filter((y) => y.minor_cap)) {
      capped++;
      assert.ok(MINOR_CAPPABLE.has(x.rule_id));
      assert.doesNotMatch([x.action, x.must_say, ...(x.warnings ?? [])].join(" "), WEEK, `${x.rule_id}`);
    }
    assert.ok(!p.findings.some((y) => y.urgency === "this_week" && MINOR_CAPPABLE.has(y.rule_id)) || !p.findings.some((y) => y.minor_cap),
      "سقف یا برای همه یا برای هیچ");
  }
  assert.ok(capped >= 30, `فقط ${capped} یافته سقف گرفت — جاروب بی‌معناست (N15)`);
});
