// specs/020 — اسنپ‌شاتِ سرتاسریِ سناریوهای quickstart (موتور ⇒ الگوها ⇒ ردیف‌های تومورمارکر ⇒ امتیاز).
const R = "file:///C:/Users/surface/Desktop/khanesh-project/khanesh-server/rules/";
const { runEngine } = await import(R + "adapter.js");
const { runPatterns } = await import(R + "patterns.js");
const { healthScore } = await import(R + "score.js");
const { tumorMarkerRows } = await import(R + "tumor_markers.js");
const T = (name, value, unit, reference = "") => ({ name, value: String(value), unit, reference });
const M60 = { age: 60, sex: "M" }, F60 = { age: 60, sex: "F" }, M45 = { age: 45, sex: "M" };
// همان پنلِ پایهٔ TMM7 (کافی برای ساختنِ امتیاز)
const BASE = [T("Albumin", 4.4, "g/dL"), T("Creatinine", 0.9, "mg/dL"), T("FBS", 90, "mg/dL"), T("hs-CRP", 0.3, "mg/L"),
  T("Lymph %", 30, "%"), T("MCV", 90, "fL"), T("RDW-CV", 12.5, "%"), T("ALP", 70, "U/L"), T("WBC", 6.5, "x10^3/uL"), T("Neutrophils %", 60, "%")];
const S = {
  Q1: [M60, [T("PSA", 6, "ng/mL", "< 4.0"), T("Free PSA Ratio", 18, "%", "> 25")]],
  Q2: [M60, [T("PSA", 6, "ng/mL", "< 4.0"), T("Free PSA Ratio", 30, "%", "> 25")]],
  Q3: [M60, [T("PSA", "4.0", "ng/mL", "< 4.0")]],
  Q4: [M45, [T("AFP", "7.0", "ng/mL", "< 7.0")]],
  Q5_mom: [{ age: 30, sex: "F", pregnant: true }, [T("AFP", 2.5, "MoM", "0.5-2.5")]],
  Q5_quad: [{ age: 30, sex: "F", pregnant: true }, [T("AFP", 35, "IU/mL", ""), T("Total hCG", 29000, "mIU/mL", "")]],
  Q5b_null: [{ age: 45 }, [T("Calcitonin", 6, "pg/mL", "Male: < 8.4 Female: < 5")]],
  Q6: [F60, [T("PSA", 1.2, "ng/mL", "< 4.0")]],
  Q7: [M60, [T("PSA", 1.2, "ng/mL", "< 4.0")]],
  Q7_ca125_male: [M45, [T("CA 125", 10, "U/mL", "0-35")]],
  Q8_with: [M45, [...BASE, T("PSA", 6, "ng/mL", "< 4")]],
  Q8_within: [M45, [...BASE, T("PSA", 1, "ng/mL", "< 4")]],
  Q8_without: [M45, BASE],
  Q9: [M45, [T("Calcitonin", 12, "pg/mL", "")]],
  Q10: [M60, [T("PSA", 3.0, "ng/mL", "40-49 y: <2.5 / 50-59 y: <3.5")]],
};
const out = {};
for (const [id, [patient, tests]] of Object.entries(S)) {
  const e = runEngine({ patient, tests });
  const p = runPatterns(e);
  const findings = (p.findings ?? []).map((f) => ({ id: f.rule_id ?? f.pattern, urgency: f.urgency, must_say: f.must_say }));
  const sc = healthScore(e, p);
  out[id] = {
    ungraded: Object.fromEntries(Object.entries(e.ungraded ?? {}).map(([k, u]) => [k, { reason: u.reason, state: u.state }])),
    prenatal: e.prenatal ? Object.keys(e.prenatal) : null,
    rows: tumorMarkerRows(e).map((r) => ({ key: r.key, verdict: r.verdict, abnormal: r.abnormal, dir: r.dir, fa: r.fa, ...(r.sexMismatch ? { sexMismatch: true } : {}) })),
    urgency: p.overall_urgency ?? p.urgency, findings, score: sc && { value: sc.value, band: sc.band, unread: sc.count?.unread },
  };
}
console.log(JSON.stringify(out, null, 1));
