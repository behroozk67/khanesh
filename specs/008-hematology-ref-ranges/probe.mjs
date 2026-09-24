// Probe for specs/008 — run from khanesh-server/:  node ../specs/008-hematology-ref-ranges/probe.mjs
import { runEngine } from "../../khanesh-server/rules/adapter.js";
import { runPatterns, RULES } from "../../khanesh-server/rules/patterns.js";
const T = (name, value, unit) => ({ name, value: String(value), unit });
const P = {
  M30_Hb138: ["M", 30, [T("Hb", 13.8, "g/dL"), T("MCV", 88, "fL")]],
  M30_Hb136: ["M", 30, [T("Hb", 13.6, "g/dL"), T("MCV", 88, "fL")]],
  M60_Hb134: ["M", 60, [T("Hb", 13.4, "g/dL"), T("MCV", 88, "fL")]],
  M72_Hb126: ["M", 72, [T("Hb", 12.6, "g/dL"), T("MCV", 88, "fL")]],
  M80_Hb115: ["M", 80, [T("Hb", 11.5, "g/dL"), T("MCV", 88, "fL")]],
  F30_Hb121: ["F", 30, [T("Hb", 12.1, "g/dL"), T("MCV", 88, "fL")]],
  F72_Hb119: ["F", 72, [T("Hb", 11.9, "g/dL"), T("MCV", 88, "fL")]],
  F80_Hb110: ["F", 80, [T("Hb", 11.0, "g/dL"), T("MCV", 88, "fL")]],
  M17_Hb135: ["M", 17, [T("Hb", 13.5, "g/dL"), T("MCV", 88, "fL")]],
  M30_Hb138_micro: ["M", 30, [T("Hb", 13.8, "g/dL"), T("MCV", 72, "fL"), T("RBC", 5.2, "10*6/uL")]],
  M40_Ferr20: ["M", 40, [T("Hb", 15, "g/dL"), T("Ferritin", 20, "ng/mL")]],
  F55_Ferr25: ["F", 55, [T("Hb", 13, "g/dL"), T("Ferritin", 25, "ng/mL")]],
  F30_Ferr13: ["F", 30, [T("Hb", 13, "g/dL"), T("Ferritin", 13, "ng/mL")]],
  M40_Iron55: ["M", 40, [T("Iron", 55, "ug/dL")]],
  M40_ACD_Iron55: ["M", 40, [T("Hb", 11, "g/dL"), T("MCV", 85, "fL"), T("Iron", 55, "ug/dL"), T("Ferritin", 250, "ng/mL"), T("TIBC", 220, "ug/dL")]],
  M40_Iron155: ["M", 40, [T("Iron", 155, "ug/dL")]],
  HbA2_52: ["M", 30, [T("Hb", 12.5, "g/dL"), T("MCV", 66, "fL"), T("RBC", 6.1, "10*6/uL"), T("HbA2", 5.2, "%")]],
  HbF_electro: ["M", 30, [T("HbA", 96, "%"), T("HbA2", 2.8, "%"), T("HbF", 0.6, "%")]],
  HbS_trait: ["M", 30, [T("HbS", 40, "%"), T("HbA", 57, "%")]],
  ZPP: ["M", 30, [T("ZPP", 150, "ug/dL")]],
  sTfR: ["M", 30, [T("sTfR", 5, "mg/L")]],
  EPO: ["M", 30, [T("Erythropoietin", 2, "mIU/mL")]],
  PV_M_Hb170: ["M", 40, [T("Hb", 17.0, "g/dL"), T("RBC", 6.2, "10*6/uL"), T("MCV", 88, "fL")]],
  // ── T003: لبه‌ها و شناسه‌ها ──
  M30_Hb137: ["M", 30, [T("Hb", 13.7, "g/dL"), T("MCV", 88, "fL")]],
  M19_Hb1365: ["M", 19, [T("Hb", 13.65, "g/dL"), T("MCV", 88, "fL")]],
  M20_Hb1365: ["M", 20, [T("Hb", 13.65, "g/dL"), T("MCV", 88, "fL")]],
  M49_Hb135: ["M", 49, [T("Hb", 13.5, "g/dL"), T("MCV", 88, "fL")]],
  M50_Hb135: ["M", 50, [T("Hb", 13.5, "g/dL"), T("MCV", 88, "fL")]],
  M69_Hb125: ["M", 69, [T("Hb", 12.5, "g/dL"), T("MCV", 88, "fL")]],
  M70_Hb125: ["M", 70, [T("Hb", 12.5, "g/dL"), T("MCV", 88, "fL")]],
  F69_Hb119: ["F", 69, [T("Hb", 11.9, "g/dL"), T("MCV", 88, "fL")]],
  F70_Hb119: ["F", 70, [T("Hb", 11.9, "g/dL"), T("MCV", 88, "fL")]],
  F49_Ferr25: ["F", 49, [T("Hb", 13, "g/dL"), T("Ferritin", 25, "ng/mL")]],
  F50_Ferr25: ["F", 50, [T("Hb", 13, "g/dL"), T("Ferritin", 25, "ng/mL")]],
  M13_Hb138: ["M", 13, [T("Hb", 13.8, "g/dL"), T("MCV", 88, "fL")]],
  HbA2_37: ["M", 30, [T("HbA2", 3.7, "%")]],
  HbA2_39: ["M", 30, [T("HbA2", 3.9, "%")]],
  HbA2_10: ["M", 30, [T("HbA2", 1.0, "%")]],
  HbA2_5_age1: ["M", 1, [T("HbA2", 5, "%")]],
  HBsAg_pos: ["M", 30, [T("HBsAg", "Positive")]],
  HbS_pos_alone: ["M", 30, [T("HbS", "Positive")]],
  HbC_electro: ["M", 30, [T("HbC", 30, "%"), T("HbA2", 3, "%")]],
  HbC_pos_alone: ["M", 30, [T("HbC", "Positive")]],
  AntiHBc_pos: ["M", 30, [T("Anti-HBc", "Positive")]],
};
const VERBOSE = new Set(["M40_Ferr20", "F55_Ferr25", "F50_Ferr25", "F30_Ferr13", "M40_ACD_Iron55", "HbA2_52", "HbA2_37", "HbA2_39", "M30_Hb138_micro", "HBsAg_pos", "AntiHBc_pos"]);
const only = process.argv.slice(2);
for (const [name, [sex, age, tests]] of Object.entries(P)) {
  if (only.length && !only.includes(name)) continue;
  const e = runEngine({ patient: { sex, age }, tests });
  const p = runPatterns(e);
  const g = e.graded.map((x) => `${x.test}=${x.value}${x.abnormal ? (x.dir === "low" ? "↓" : "↑") : ""}[${x.range}]`).join(" ");
  console.log(`## ${name}: ${p.overall_urgency} | ${(p.findings || []).map((f) => f.pattern).join(",")}`);
  console.log(`   graded: ${g} | noRef: ${JSON.stringify(e.noRef)} | unmapped: ${JSON.stringify(e.unmapped)} | qual: ${JSON.stringify(Object.keys(e.qual||{}))}`);
  if (VERBOSE.has(name)) for (const f of p.findings || []) console.log(`   [${f.pattern}] must_say: ${f.must_say} || action: ${f.action} || suggest: ${JSON.stringify(f.suggest)}`);
}
console.log("RULES", RULES.length);
