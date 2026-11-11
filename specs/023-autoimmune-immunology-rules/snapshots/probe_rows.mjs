const R = "file:///C:/Users/surface/Desktop/khanesh-project/khanesh-server/rules/";
const { runEngine } = await import(R + "adapter.js"); const { runPatterns } = await import(R + "patterns.js");
const T = (name, value, unit, reference = "") => ({ name, value: String(value), unit, reference });
const rows = [
 ["ANA (IIF)", "1:160", "", "<1:80"], ["ANA", "4.5", "U", "<1.0"], ["Anti-dsDNA", "150", "IU/mL", "<100"], ["Anti ds-DNA", "40", "IU/mL", "<100"],
 ["Anti-Sm", "2.5", "U", "<1.0"], ["Anti-U1RNP", "3", "U", "<1.0"], ["Anti-SSA/Ro", "2", "U", "<1.0"], ["Anti-SSB/La", "2", "U", "<1.0"],
 ["Anti-Histone", "2", "U", "<1.0"], ["C3", "55", "mg/dL", "90-180"], ["C4", "8", "mg/dL", "10-40"], ["CH50", "10", "U/mL", "31-60"],
 ["Anti-CCP", "75", "U", "<20"], ["RF", "60", "IU/mL", "<15"], ["Anticardiolipin IgG", "85", "GPL", "<20"], ["Anticardiolipin IgM", "45", "MPL", "<20"],
 ["Anticardiolipin IgA", "20", "APL", "<15"], ["Anti-Beta2 Glycoprotein I IgG", "50", "U", "<20"], ["Lupus anticoagulant", "Positive", "", ""],
 ["Anti-Scl-70", "3", "U", "<1.0"], ["Anti-Centromere B", "3", "U", "<1.0"], ["Anti-Jo-1", "3", "U", "<1.0"], ["PR3-ANCA", "5", "U", "<0.4"],
 ["MPO-ANCA", "0.6", "U", "<0.4"], ["c-ANCA", "1:32", "", "<1:4"], ["p-ANCA", "Positive", "", ""], ["ASO", "450", "IU/mL", "<200"],
 ["Anti-DNase B", "500", "U/mL", "<300"], ["Anti-tTG IgA", "150", "U/mL", "<4"], ["Anti-tTG IgG", "12", "U/mL", "<6"], ["DGP IgG", "30", "U", "<20"],
 ["EMA IgA", "Positive", "", ""], ["Total IgA", "5", "mg/dL", "70-400"], ["ASMA", "1:80", "", "<1:40"], ["Anti-LKM1", "1:80", "", "<1:40"],
 ["Anti-SLA/LP", "Positive", "", ""], ["AMA", "1:160", "", "<1:40"], ["AMA-M2", "50", "U", "<20"], ["Anti-TPO", "250", "IU/mL", "<30"],
 ["Anti-Tg", "200", "IU/mL", "<115"], ["TRAb", "5", "IU/L", "<1.75"], ["TSI", "250", "%", "<130"], ["AChR binding Ab", "0.8", "nmol/L", "<=0.02"],
 ["Anti-MuSK", "Positive", "", ""], ["IgG", "150", "mg/dL", "700-1600"], ["IgM", "20", "mg/dL", "40-230"], ["IgE", "900", "IU/mL", "<100"],
 ["IgG1", "200", "mg/dL", "340-1000"], ["IgG2", "40", "mg/dL", "100-540"], ["IgG3", "5", "mg/dL", "20-170"], ["IgG4", "300", "mg/dL", "6-130"],
 ["CD4 count", "150", "cells/uL", "500-1500"], ["C1 esterase inhibitor", "8", "mg/dL", "21-39"], ["HLA-B27", "Positive", "", ""],
 ["Oligoclonal bands", "Positive", "", ""], ["IgG index", "0.9", "", "<0.64"],
];
for (const [n, v, u, r] of rows) {
  const e = runEngine({ patient: { age: 35, sex: "F" }, tests: [T(n, v, u, r)] }); const p = runPatterns(e);
  const g = e.graded[0]; const q = e.qual && Object.keys(e.qual);
  const where = g ? `graded ${g.test} ab=${g.abnormal} ${g.dir ?? ""} [${g.range}]` : e.unmapped?.length ? "UNMAPPED" : (e.ungraded?.length ? "ungraded " + JSON.stringify(e.ungraded).slice(0, 80) : (q?.length ? "qual " + q.join(",") : JSON.stringify(Object.keys(e)).slice(0, 0) + "other"));
  const ids = p.findings.map(f => f.rule_id).join(","); const ms = p.findings.map(f => (f.must_say||"").slice(0,110)).join(" || ");
  console.log(`${n.padEnd(28)} ${v.padEnd(7)} → ${where.slice(0,40)} | ${p.overall_urgency} | ${ids} :: ${ms}`);
}
