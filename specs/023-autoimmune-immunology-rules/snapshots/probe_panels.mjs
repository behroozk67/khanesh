const R = "file:///C:/Users/surface/Desktop/khanesh-project/khanesh-server/rules/";
const { runEngine } = await import(R + "adapter.js"); const { runPatterns } = await import(R + "patterns.js");
const T = (name, value, unit, reference = "") => ({ name, value: String(value), unit, reference });
const cases = {
 "ANA titre plain": [T("ANA", "1:160", "", "<1:80")],
 "ANA IIF 1:40": [T("ANA", "1:40", "", "<1:80")],
 "FANA": [T("FANA", "Positive 1:320 speckled", "", "")],
 "C3+C4 low": [T("C3", 55, "mg/dL", "90-180"), T("C4", 8, "mg/dL", "10-40")],
 "dsDNA+C3 low": [T("Anti-dsDNA", 300, "IU/mL", "<100"), T("C3", 55, "mg/dL", "90-180"), T("C4", 8, "mg/dL", "10-40"), T("ESR", 70, "mm/h", "<20"), T("CRP", 2, "mg/L", "<6")],
 "SLE lupus + CRP high": [T("Anti-dsDNA", 300, "IU/mL", "<100"), T("CRP", 80, "mg/L", "<6")],
 "CCP+RF": [T("Anti-CCP", 75, "U/mL", "<20"), T("RF", 60, "IU/mL", "<15")],
 "APS triple": [T("Lupus anticoagulant", "Positive", "", ""), T("Anticardiolipin IgG", 85, "GPL", "<20"), T("Anti-Beta2 Glycoprotein I IgG", 90, "U", "<20")],
 "child ASO 10y 300": [T("ASO", 300, "IU/mL", "<200")],
 "tTG child": [T("tTG IgA", 150, "U/mL", "<10")],
 "Anti tissue transglutaminase IgA": [T("Anti Tissue Transglutaminase IgA", 150, "U/mL", "<10")],
 "Ro in pregnancy": [T("Anti-SSA/Ro", 3, "U", "<1.0")],
};
for (const [k, tests] of Object.entries(cases)) {
  const age = k.includes("child") ? 10 : 35;
  const e = runEngine({ patient: { age, sex: "F", pregnant: k.includes("pregnancy") }, tests }); const p = runPatterns(e);
  console.log(`\n## ${k} → ${p.overall_urgency} unmapped=${JSON.stringify(e.unmapped)}`);
  for (const f of p.findings) console.log(`  [${f.rule_id}] ${f.urgency}: ${(f.must_say || "").slice(0, 420)}`);
}
