// Probe for specs/007 — run from khanesh-server/:  node ../specs/007-henry-ch31-rbc-indices/probe.mjs
// Prints, per panel: fired patterns, overall urgency, RBC/HCT/MCHC grading, unmapped/noRef, and each action.
import { runEngine } from "../../khanesh-server/rules/adapter.js";
import { runPatterns, RULES } from "../../khanesh-server/rules/patterns.js";

const T = (name, value, unit) => ({ name, value: String(value), unit });
const P = {
  G1_F_RBC43: ["F", 30, [T("Hb", 13, "g/dL"), T("Hct", 39, "%"), T("RBC", 4.3, "10*6/uL"), T("MCV", 90, "fL")]],
  F_RBC409: ["F", 30, [T("Hb", 13, "g/dL"), T("Hct", 39, "%"), T("RBC", 4.09, "10*6/uL"), T("MCV", 90, "fL")]],
  F_RBC410: ["F", 30, [T("Hb", 13, "g/dL"), T("Hct", 39, "%"), T("RBC", 4.10, "10*6/uL"), T("MCV", 90, "fL")]],
  F_RBC449: ["F", 30, [T("Hb", 13, "g/dL"), T("Hct", 39, "%"), T("RBC", 4.49, "10*6/uL"), T("MCV", 90, "fL")]],
  F_RBC40_old: ["F", 80, [T("Hb", 12.5, "g/dL"), T("Hct", 37, "%"), T("RBC", 4.0, "10*6/uL"), T("MCV", 92, "fL")]],
  F_thal_RBC: ["F", 30, [T("Hb", 12.5, "g/dL"), T("RBC", 4.3, "10*6/uL"), T("MCV", 72, "fL"), T("MCH", 24, "pg")]],
  G6_F_Hct18: ["F", 30, [T("Hct", 18, "%")]],
  F_Hct209: ["F", 30, [T("Hct", 20.9, "%")]],
  F_Hct21: ["F", 30, [T("Hct", 21, "%")]],
  F_Hct25: ["F", 30, [T("Hct", 25, "%")]],
  F_Hct18_Hb9: ["F", 30, [T("Hct", 18, "%"), T("Hb", 9, "g/dL")]],
  F_Hct018_LL: ["F", 30, [T("Hct", 0.18, "L/L")]],
  F_Hct018_nounit: ["F", 30, [T("Hct", 0.18)]],
  F_Hct18_nounit: ["F", 30, [T("Hct", 18)]],
  child_Hct18: ["M", 6, [T("Hct", 18, "%")]],
  age_unknown_Hct18: [null, null, [T("Hct", 18, "%")]],
  G7_M_artefact: ["M", 40, [T("Hb", 14, "g/dL"), T("Hct", 30, "%"), T("RBC", 3.0, "10*6/uL"), T("MCV", 100, "fL"), T("MCHC", 46.7, "g/dL")]],
  MCHC365: ["M", 40, [T("Hb", 15, "g/dL"), T("Hct", 44, "%"), T("MCHC", 36.5, "g/dL")]],
  MCHC366: ["M", 40, [T("Hb", 15, "g/dL"), T("Hct", 44, "%"), T("MCHC", 36.6, "g/dL")]],
  MCHC40_HbOnly: ["M", 40, [T("Hb", 15, "g/dL"), T("MCHC", 40, "g/dL")]],
  MCHC_gL: ["M", 40, [T("Hb", 15, "g/dL"), T("Hct", 44, "%"), T("MCHC", 366, "g/L")]],
  Hb55_MCHC38: ["M", 40, [T("Hb", 5.5, "g/dL"), T("Hct", 15, "%"), T("MCHC", 38, "g/dL")]],
  sphero: ["F", 30, [T("Hb", 10.5, "g/dL"), T("MCV", 88, "fL"), T("MCH", 30, "pg"), T("MCHC", 37, "g/dL"), T("RDW-CV", 16.5, "%")]],
  ida: ["F", 30, [T("Hb", 9.5, "g/dL"), T("Hct", 34, "%"), T("MCV", 68, "fL"), T("MCHC", 28, "g/dL")]],
  G7b: ["M", 40, [T("Hb", 12.8, "g/dL"), T("Hct", 58, "%"), T("MCV", 126, "fL"), T("MCHC", 22, "g/dL")]],
  G4_Hb21: ["M", 40, [T("Hb", 21, "g/dL"), T("Hct", 63, "%"), T("RBC", 6.8, "10*6/uL"), T("MCV", 92, "fL")]],
  G5_Hct62: ["M", 40, [T("Hct", 62, "%")]],
  G2_retic: ["M", 40, [T("Retic", 2.0, "%")]],
  G8_ARC: ["M", 40, [T("ARC", 150, "10*9/L")]],
  G8_RetAbs: ["M", 40, [T("Retic Abs", 150, "10*9/L")]],
  G8_AbsRetic: ["M", 40, [T("Absolute Retic", 150, "10*9/L")]],
  G8_fa: ["M", 40, [T("رتیکولوسیت مطلق", 150, "10*9/L")]],
  G8_both: ["M", 40, [T("Retic", 1.2, "%"), T("ARC", 60, "10*9/L")]],
};

const only = process.argv.slice(2);
for (const [name, [sex, age, tests]] of Object.entries(P)) {
  if (only.length && !only.includes(name)) continue;
  const patient = {};
  if (sex) patient.sex = sex;
  if (age != null) patient.age = age;
  const e = runEngine({ patient, tests });
  const p = runPatterns(e);
  const g = e.graded.filter((x) => ["RBC", "HCT", "MCHC", "HGB", "RETIC"].includes(x.test))
    .map((x) => `${x.test}=${x.value}${x.abnormal ? (x.dir === "low" ? "↓" : "↑") : ""}[${x.range}]`).join(" ");
  console.log(`\n## ${name}: ${p.overall_urgency} | ${(p.findings || []).map((f) => f.pattern).join(",")}`);
  console.log(`   graded: ${g} | noRef: ${JSON.stringify(e.noRef)} | unmapped: ${JSON.stringify(e.unmapped)} | ungraded: ${Object.keys(e.ungraded || {}).join(",")}`);
  for (const f of p.findings || []) console.log(`   [${f.pattern}/${f.urgency}] action: ${f.action}`);
}
console.log("\nRULES", RULES.length);
