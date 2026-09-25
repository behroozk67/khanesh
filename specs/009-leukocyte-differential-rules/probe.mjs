// Probe for specs/009 — run from repo root:  node specs/009-leukocyte-differential-rules/probe.mjs [panel…]
import { runEngine } from "../../khanesh-server/rules/adapter.js";
import { runPatterns, RULES } from "../../khanesh-server/rules/patterns.js";
const T = (name, value, unit) => ({ name, value: String(value), unit });
const CBC = (wbc, extra = []) => [
  T("WBC", wbc, "10^3/uL"), T("Hb", 14.5, "g/dL"), T("MCV", 88, "fL"), T("PLT", 250, "10^3/uL"), ...extra,
];
const P = {
  normal: ["M", 40, CBC(7, [T("Neut %", 60, "%"), T("Lymph %", 30, "%"), T("Mono %", 7, "%"), T("Eos %", 2.5, "%"), T("Baso %", 0.5, "%")])],
  mono_1400: ["M", 40, CBC(8, [T("Neut %", 55, "%"), T("Lymph %", 25, "%"), T("Mono %", 17.5, "%"), T("Eos %", 2, "%"), T("Baso %", 0.5, "%")])],
  mono_pct12_abs840: ["M", 40, CBC(7, [T("Neut %", 58, "%"), T("Lymph %", 27, "%"), T("Mono %", 12, "%"), T("Eos %", 2.5, "%"), T("Baso %", 0.5, "%")])],
  mono_900_pct9: ["M", 40, CBC(10, [T("Neut %", 62, "%"), T("Lymph %", 26, "%"), T("Mono %", 9, "%"), T("Eos %", 2.5, "%"), T("Baso %", 0.5, "%")])],
  mono_150: ["M", 40, CBC(5, [T("Neut %", 65, "%"), T("Lymph %", 29, "%"), T("Mono %", 3, "%"), T("Eos %", 2.5, "%"), T("Baso %", 0.5, "%")])],
  mono_0: ["M", 40, CBC(5, [T("Neut %", 67, "%"), T("Lymph %", 30, "%"), T("Mono %", 0, "%"), T("Eos %", 2.5, "%"), T("Baso %", 0.5, "%")])],
  eos_600: ["M", 40, CBC(8, [T("Neut %", 58, "%"), T("Lymph %", 28, "%"), T("Mono %", 6, "%"), T("Eos %", 7.5, "%"), T("Baso %", 0.5, "%")])],
  eos_2000: ["M", 40, CBC(10, [T("Neut %", 50, "%"), T("Lymph %", 23, "%"), T("Mono %", 6, "%"), T("Eos %", 20, "%"), T("Baso %", 1, "%")])],
  eos_abs_row_1600: ["M", 40, CBC(9, [T("EOS#", 1.6, "10^3/uL")])],
  baso_250: ["M", 40, CBC(8, [T("Neut %", 60, "%"), T("Lymph %", 27, "%"), T("Mono %", 7, "%"), T("Eos %", 3, "%"), T("Baso %", 3, "%")])],
  cml_like: ["M", 50, [T("WBC", 80, "10^3/uL"), T("Hb", 12, "g/dL"), T("PLT", 450, "10^3/uL"), T("Neut %", 70, "%"), T("Lymph %", 8, "%"), T("Mono %", 4, "%"), T("Eos %", 6, "%"), T("Baso %", 5, "%"), T("Myelocyte", 7, "%")]],
  blasts_25: ["M", 40, CBC(30, [T("Blasts", 25, "%")])],
  blasts_3: ["M", 40, CBC(9, [T("Blast", 3, "%")])],
  blasts_0: ["M", 40, CBC(7, [T("Blasts", 0, "%")])],
  blasts_word: ["M", 40, CBC(7, [T("Blast cells", "Not seen")])],
  auer: ["M", 40, CBC(20, [T("Auer rods", "Present")])],
  toxic: ["M", 40, CBC(16, [T("Neut %", 85, "%"), T("Toxic granulation", "+")])],
  dohle: ["M", 40, CBC(16, [T("Dohle bodies", "Seen")])],
  pelger: ["M", 40, CBC(7, [T("Pelger-Huet anomaly", "Present")])],
  band_12: ["M", 40, CBC(14, [T("Band", 12, "%")])],
  smear_remark: ["M", 40, CBC(7, [T("Peripheral blood smear", "Toxic granulation seen")])],
  anisocytosis: ["M", 40, CBC(7, [T("Anisocytosis", "++")])],
  plt_500: ["M", 40, [T("WBC", 7, "10^3/uL"), T("Hb", 14, "g/dL"), T("PLT", 500, "10^3/uL")]],
  plt_900: ["M", 40, [T("WBC", 7, "10^3/uL"), T("Hb", 14, "g/dL"), T("PLT", 900, "10^3/uL")]],
  pv_m_168: ["M", 40, [T("Hb", 16.8, "g/dL"), T("HCT", 50, "%"), T("RBC", 5.8, "10^6/uL")]],
  pv_f_162: ["F", 40, [T("Hb", 16.2, "g/dL"), T("HCT", 48, "%"), T("RBC", 5.3, "10^6/uL")]],
  pv_m_180: ["M", 40, [T("Hb", 18.0, "g/dL"), T("HCT", 54, "%"), T("RBC", 6.0, "10^6/uL")]],
  pancyto_blasts: ["M", 62, [T("WBC", 1.5, "10^3/uL"), T("Hb", 7.5, "g/dL"), T("PLT", 20, "10^3/uL"), T("Neut %", 20, "%"), T("Blasts", 30, "%")]],
  child5_mono: ["M", 5, CBC(8, [T("Neut %", 45, "%"), T("Lymph %", 42, "%"), T("Mono %", 11, "%"), T("Eos %", 1.5, "%"), T("Baso %", 0.5, "%")])],
  // ── T002 ──
  monolow_wbclow: ["M", 40, [T("WBC", 2.5, "10^3/uL"), T("Hb", 14.5, "g/dL"), T("PLT", 250, "10^3/uL"), T("Neut %", 60, "%"), T("Lymph %", 34, "%"), T("Mono %", 4, "%"), T("Eos %", 1.5, "%"), T("Baso %", 0.5, "%")]],
  monolow_nowbc: ["M", 40, [T("Hb", 14.5, "g/dL"), T("MONO#", 0.1, "10^3/uL")]],
  mono_799: ["M", 40, CBC(7, [T("MONO#", 0.799, "10^3/uL")])],
  mono_1000: ["M", 40, CBC(7, [T("MONO#", 1.0, "10^3/uL")])],
  mono_199: ["M", 40, CBC(7, [T("MONO#", 0.199, "10^3/uL")])],
  mono_200: ["M", 40, CBC(7, [T("MONO#", 0.2, "10^3/uL")])],
  eos_451: ["M", 40, CBC(7, [T("EOS#", 0.451, "10^3/uL")])],
  eos_1499: ["M", 40, CBC(7, [T("EOS#", 1.499, "10^3/uL")])],
  eos_1500: ["M", 40, CBC(7, [T("EOS#", 1.5, "10^3/uL")])],
  neonate_eos_1800: ["M", 0.005, [T("WBC", 15, "10^3/uL"), T("EOS#", 1.8, "10^3/uL")]],
  wbc45_baso: ["M", 40, [T("WBC", 45, "10^3/uL"), T("Hb", 14, "g/dL"), T("PLT", 300, "10^3/uL"), T("Neut %", 80, "%"), T("Lymph %", 10, "%"), T("Mono %", 5, "%"), T("Eos %", 2, "%"), T("Baso %", 3, "%")]],
  pseudo_pelger: ["M", 70, CBC(7, [T("Pseudo-Pelger cells", "Present")])],
  blasts_few: ["M", 40, CBC(9, [T("Blasts", "Few")])],
  auer_equivocal: ["M", 40, CBC(9, [T("Auer rods", "+/-")])],
  blasts_19: ["M", 40, CBC(9, [T("Blasts", 19, "%")])],
  blasts_20: ["M", 40, CBC(9, [T("Blasts", 20, "%")])],
  blasts1: ["M", 40, CBC(9, [T("Blasts", 1, "%")])],
  blast_auer: ["M", 40, CBC(25, [T("Blasts", 30, "%"), T("Auer rods", "Present")])],
  acute_leuk_blasts: ["M", 40, [T("WBC", 60, "10^3/uL"), T("Hb", 7, "g/dL"), T("PLT", 40, "10^3/uL"), T("Blasts", 30, "%")]],
  urine_pelger: ["M", 40, [T("Specific Gravity", "1.020"), T("Nitrite", "Negative"), T("Leukocyte Esterase", "Negative"), T("Pelger-Huet", "Present")]],
  chediak: ["M", 10, CBC(7, [T("Chediak-Higashi granules", "Present")])],
  mayhegglin: ["M", 30, [T("WBC", 7, "10^3/uL"), T("Hb", 14.5, "g/dL"), T("PLT", 90, "10^3/uL"), T("May-Hegglin anomaly", "Present")]],
  smear_mixed: ["M", 40, CBC(9, [T("Peripheral blood smear", "Toxic granulation and Dohle bodies seen, no blasts")])],
  smear_no_blasts: ["M", 40, CBC(7, [T("Peripheral smear", "No blasts seen")])],
  smear_without: ["M", 40, CBC(12, [T("Comment", "Toxic granulation without blasts")])],
  smear_normal: ["M", 40, CBC(7, [T("Morphology", "Normal")])],
};
const only = process.argv.slice(2);
console.log(`RULES ${RULES.length}`);
for (const [name, [sex, age, tests]] of Object.entries(P)) {
  if (only.length && !only.includes(name)) continue;
  const e = runEngine({ patient: { sex, age }, tests });
  const p = runPatterns(e);
  const g = e.graded
    .filter((x) => /WBC|MONO|EOS|BASO|NEUT|LYMPH|PLT|HGB|BAND/.test(x.test))
    .map((x) => `${x.test}=${x.value}${x.abnormal ? (x.dir === "low" ? "↓" : "↑") : ""}[${x.range}]`).join(" ");
  console.log(`## ${name}: ${p.overall_urgency} | ${(p.findings || []).map((f) => f.pattern).join(",")}`);
  console.log(`   graded: ${g}`);
  console.log(`   noRef: ${JSON.stringify(e.noRef)} | unmapped: ${JSON.stringify(e.unmapped)} | qual: ${JSON.stringify(e.qual || {})}`);
  const un = (p.findings || []).find((f) => /unexplained|unmatched/.test(f.pattern));
  if (un) console.log(`   uncovered: ${JSON.stringify(un.orphans ?? un.uncovered ?? null)}`);
}
