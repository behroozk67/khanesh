// Probe for specs/026. Run from khanesh-server/: node ../specs/026-thyroid-ch42/snapshots/probe_ch42.mjs
import { runEngine } from "../../../khanesh-server/rules/adapter.js";
import { runPatterns } from "../../../khanesh-server/rules/patterns.js";
const F = { age: 40, sex: "F" }, M = { age: 50, sex: "M" }, PG = { age: 30, sex: "F", pregnant: true };
const HYPO = { age: 50, sex: "F", conditions: ["hypothyroid"] }, HOSP = { age: 60, sex: "M", conditions: ["hospitalized"] };
const tsh = (v, ref) => ({ name: "TSH", value: String(v), unit: "µIU/mL", ...(ref ? { reference: ref } : {}) });
const ft4 = (v) => ({ name: "FT4", value: String(v), unit: "ng/dL" });
const P = [
  ["T1 tsh 0.45 noref", [tsh(0.45), ft4(1.2)], F],
  ["T1 tsh 0.45 ref0.4", [tsh(0.45, "0.4-4.0"), ft4(1.2)], F],
  ["T1 tsh 4.3 noref", [tsh(4.3), ft4(1.2)], F],
  ["T2 tsh 9.9 ft4 n", [tsh(9.9), ft4(1.1)], F],
  ["T2 tsh 10 ft4 n", [tsh(10), ft4(1.1)], F],
  ["T2 tsh 14 ft4 n", [tsh(14), ft4(1.1)], F],
  ["T3 tsh 0.05 ft4 n", [tsh(0.05), ft4(1.3), { name: "FT3", value: "3.5", unit: "pg/mL" }], M],
  ["T3 tsh 0.2 ft4 n", [tsh(0.2), ft4(1.3)], M],
  ["T4 hypo-cond tsh 0.2", [tsh(0.2), ft4(1.6)], HYPO],
  ["T4 hypo-cond tsh 8", [tsh(8), ft4(1.0)], HYPO],
  ["T4 hypo-cond tsh 2", [tsh(2), ft4(1.0)], HYPO],
  ["T5 hosp tsh 7", [tsh(7), ft4(1.0)], HOSP],
  ["T5 hosp tsh 0.3 t3 low", [tsh(0.3), ft4(0.9), { name: "FT3", value: "1.8", unit: "pg/mL" }], HOSP],
  ["T6 preg tpo high tsh n", [tsh(2.0), { name: "Anti-TPO", value: "60", unit: "IU/mL", reference: "<34" }], PG],
  ["T6 preg tsh 3.5", [tsh(3.5), ft4(1.0)], PG],
  ["T6 preg tsh 0.2", [tsh(0.2), ft4(1.4)], PG],
  ["T7 tg alone", [{ name: "Thyroglobulin", value: "2.5", unit: "ng/mL" }], F],
  ["T7 tg + antitg pos", [{ name: "Thyroglobulin", value: "0.2", unit: "ng/mL" }, { name: "Anti-Tg", value: "150", unit: "IU/mL", reference: "<115" }], { ...F, conditions: ["cancer"] }],
  ["T7 tg + antitg pos nocond", [{ name: "Thyroglobulin", value: "0.2", unit: "ng/mL" }, { name: "Anti-Tg", value: "150", unit: "IU/mL", reference: "<115" }], F],
  ["T7 antitg pos alone", [{ name: "Anti-Tg", value: "150", unit: "IU/mL", reference: "<115" }, tsh(2)], F],
  ["T4 hypo-cond tpo high", [tsh(2), { name: "Anti-TPO", value: "60", unit: "IU/mL", reference: "<34" }], HYPO],
  ["T4 hypo-cond tsh 14", [tsh(14), ft4(1.0)], HYPO],
  ["T8 rT3", [{ name: "Reverse T3", value: "30", unit: "ng/dL" }, tsh(2)], F],
  ["T8 TBG", [{ name: "TBG", value: "30", unit: "µg/mL" }], F],
  ["T9 neonate 2d tsh 20", [tsh(20)], { age: 2 / 365, sex: "M" }],
  ["T9 neonate 10d tsh 20", [tsh(20)], { age: 10 / 365, sex: "M" }],
  ["T10 tsh 6 ft4 n", [tsh(6), ft4(1.1)], F],
  ["T10 calcitonin", [{ name: "Calcitonin", value: "12", unit: "pg/mL", reference: "<6.4" }], F],
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
