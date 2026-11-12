// specs/024 — پروبِ پیش از تغییر. اجرا: از khanesh-server/ ⇒ node ../specs/024-electrolytes-blood-gases-ch24/snapshots/probe_ch24.mjs
import { runEngine } from "../../../khanesh-server/rules/adapter.js";
import { runPatterns } from "../../../khanesh-server/rules/patterns.js";
const T = (name, value, unit, reference = "") => ({ name, value: String(value), unit, reference });
const M = { age: 45, sex: "M" };
const panels = [
  ["G1a Na128 + TG2000", M, [T("Sodium", 128, "mmol/L", "135-145"), T("Triglyceride", 2000, "mg/dL", "<150")]],
  ["G1b Na128 + TG400", M, [T("Sodium", 128, "mmol/L", "135-145"), T("Triglyceride", 400, "mg/dL", "<150")]],
  ["G1c Na128 + TP11", M, [T("Sodium", 128, "mmol/L", "135-145"), T("Total Protein", 11, "g/dL", "6.4-8.3")]],
  ["G1d Na128 alone", M, [T("Sodium", 128, "mmol/L", "135-145")]],
  ["G1e Na118 + TG2000", M, [T("Sodium", 118, "mmol/L", "135-145"), T("Triglyceride", 2000, "mg/dL", "<150")]],
  ["G1f Na128 + TG22.6 mmol", M, [T("Sodium", 128, "mmol/L", "135-145"), T("Triglyceride", 22.6, "mmol/L", "<1.7")]],
  ["G2a Sweat Chloride 65", { age: 4, sex: "F" }, [T("Sweat Chloride", 65, "mmol/L", "")]],
  ["G2b Sweat chloride 25", { age: 4, sex: "F" }, [T("Sweat chloride", 25, "mmol/L", "<30")]],
  ["G2c Chloride (sweat) 45", { age: 4, sex: "F" }, [T("Chloride (sweat)", 45, "mmol/L", "")]],
  ["G2d کلرید عرق 70", { age: 4, sex: "F" }, [T("کلرید عرق", 70, "mmol/L", "")]],
  ["G2e Sweat Cl 170", { age: 4, sex: "F" }, [T("Sweat Cl", 170, "mmol/L", "")]],
  ["G2f Sweat conductivity 55", { age: 4, sex: "F" }, [T("Sweat conductivity", 55, "mmol/L", "")]],
  ["G3a K5.8 + PLT900", M, [T("Potassium", 5.8, "mmol/L", "3.5-5.1"), T("PLT", 900, "x10^3/uL", "150-450")]],
  ["G3b K5.8 + PLT250", M, [T("Potassium", 5.8, "mmol/L", "3.5-5.1"), T("PLT", 250, "x10^3/uL", "150-450")]],
  ["G3c K6.8 + PLT900", M, [T("Potassium", 6.8, "mmol/L", "3.5-5.1"), T("PLT", 900, "x10^3/uL", "150-450")]],
  ["G3d K5.3 + PLT520", M, [T("Potassium", 5.3, "mmol/L", "3.5-5.1"), T("PLT", 520, "x10^3/uL", "150-450")]],
];
for (const [label, patient, tests] of panels) {
  const e = runEngine({ patient, tests }); const p = runPatterns(e);
  console.log(`== ${label} | urgency=${p.overall_urgency} | graded=${e.graded.map((g) => `${g.test}:${g.value}${g.dir ? "/" + g.dir : ""}`).join(",")} | unmapped=${JSON.stringify(e.unmapped)} | ungraded=${Object.keys(e.ungraded ?? {}).join(",")}`);
  for (const f of p.findings) console.log(`  - ${f.rule_id ?? f.pattern} [${f.urgency}] ${String(f.must_say ?? "").replace(/\s+/g, " ").slice(0, 260)}`);
}
