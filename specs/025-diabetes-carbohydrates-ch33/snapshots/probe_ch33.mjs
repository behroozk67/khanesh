// Probe for specs/025. Run from khanesh-server/: node ../specs/025-diabetes-carbohydrates-ch33/snapshots/probe_ch33.mjs
import { runEngine } from "../../../khanesh-server/rules/adapter.js";
import { runPatterns } from "../../../khanesh-server/rules/patterns.js";
const M = { age: 45, sex: "M" }, F = { age: 40, sex: "F" }, DM = { age: 55, sex: "M", conditions: ["dm2"] };
const P = [
  ["G1 a1c 3.5", [{ name: "HbA1c", value: "3.5", unit: "%" }], M],
  ["G1 a1c 3.9", [{ name: "HbA1c", value: "3.9", unit: "%" }], M],
  ["G1 a1c 4.0", [{ name: "HbA1c", value: "4.0", unit: "%" }], M],
  ["G2 a1c 15.0", [{ name: "HbA1c", value: "15.0", unit: "%" }], M],
  ["G2 a1c 15.1", [{ name: "HbA1c", value: "15.1", unit: "%" }], M],
  ["G3 dm2 a1c 6.2", [{ name: "HbA1c", value: "6.2", unit: "%" }], DM],
  ["G3 dm2 a1c 6.9", [{ name: "HbA1c", value: "6.9", unit: "%" }], DM],
  ["G3 dm2 a1c 7.0", [{ name: "HbA1c", value: "7.0", unit: "%" }], DM],
  ["G3 dm2 a1c 7.8", [{ name: "HbA1c", value: "7.8", unit: "%" }], DM],
  ["G3 dm2 fbs 150", [{ name: "FBS", value: "150", unit: "mg/dL" }], DM],
  ["G3 nodm a1c 7.8", [{ name: "HbA1c", value: "7.8", unit: "%" }], { age: 55, sex: "M" }],
  ["G3 dm2 preg a1c 7.8", [{ name: "HbA1c", value: "7.8", unit: "%" }], { age: 30, sex: "F", pregnant: true, conditions: ["dm2"] }],
  ["G4 ins high fbs ok", [{ name: "Insulin", value: "30", unit: "µIU/mL", reference: "2.6-24.9" }, { name: "FBS", value: "92", unit: "mg/dL" }], F],
  ["G4 ins+cp fbs 45", [{ name: "Insulin", value: "12", unit: "µIU/mL", reference: "2.6-24.9" }, { name: "C-Peptide", value: "2.5", unit: "ng/mL", reference: "1.1-4.4" }, { name: "FBS", value: "45", unit: "mg/dL" }], F],
  ["G4 ins hi cp low fbs 40", [{ name: "Insulin", value: "80", unit: "µIU/mL", reference: "2.6-24.9" }, { name: "C-Peptide", value: "0.3", unit: "ng/mL", reference: "1.1-4.4" }, { name: "FBS", value: "40", unit: "mg/dL" }], F],
  ["G4 ins pmol", [{ name: "Insulin", value: "200", unit: "pmol/L", reference: "18-173" }], F],
  ["G4 ins unitless", [{ name: "Insulin", value: "12" }], F],
  ["G4 homa", [{ name: "Fasting Insulin", value: "14", unit: "µIU/mL" }, { name: "HOMA-IR", value: "3.2" }], F],
  ["G4 IAA", [{ name: "Insulin Antibody", value: "15", unit: "U/mL", reference: "<10" }], F],
  ["G5 a1c IDA", [{ name: "HbA1c", value: "6.7", unit: "%" }, { name: "MCV", value: "72" }, { name: "Hb", value: "10.5", unit: "g/dL" }, { name: "Ferritin", value: "8", unit: "ng/mL" }], F],
  ["G5 a1c retic", [{ name: "HbA1c", value: "6.7", unit: "%" }, { name: "Hb", value: "10.5", unit: "g/dL" }, { name: "Retic", value: "6", unit: "%" }], F],
  ["G5 a1c anemia only", [{ name: "HbA1c", value: "6.7", unit: "%" }, { name: "Hb", value: "10.5", unit: "g/dL" }], F],
  ["G6 GAD pos", [{ name: "Anti-GAD", value: "25", unit: "IU/mL", reference: "<10" }], F],
  ["G6 GAD neg word", [{ name: "Anti-GAD", value: "Negative" }], F],
  ["G6 GAD no ref", [{ name: "Anti-GAD", value: "25" }], F],
];
for (const [label, tests, patient] of P) {
  const e = runEngine({ tests, patient });
  const r = runPatterns(e);
  console.log(`## ${label} | urgency=${r.overall_urgency}`);
  for (const g of e.graded) console.log(`   graded ${g.test} ${g.value} [${g.range}] ${g.dir ?? "-"}`);
  for (const [k, u] of Object.entries(e.ungraded ?? {})) console.log(`   ungraded ${k} ${u.value ?? ""} ${u.reason ?? ""}`);
  if (e.unmapped?.length) console.log(`   unmapped ${e.unmapped.map((x) => x.name ?? x).join(", ")}`);
  for (const f of r.findings) console.log(`   > ${f.pattern} ${f.urgency} | ${(f.must_say ?? "").replace(/\s+/g, " ")}`);
}
