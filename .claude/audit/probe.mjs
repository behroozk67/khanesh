// پروبِ پنلِ تکی: node probe.mjs '[["برچسب",{"sex":"F","age":35},[{"name":"FT4","value":"2.5","unit":"ng/dL"}]]]'
const R = new URL("../../khanesh-server/rules/", import.meta.url).href;
const { runEngine } = await import(R + "adapter.js");
const { runPatterns } = await import(R + "patterns.js");
const { buildEngineFallbackResult, buildNormalResult } = await import(R + "prompt.js");
console.warn = () => {};
const cases = JSON.parse(process.argv[2]);
for (const [label, patient, tests] of cases) {
  const o = runEngine({ patient, tests }); const e = o.engineOut ?? o;
  const p = runPatterns(e);
  const r = (p.findings.length || e.abnormal.length) ? buildEngineFallbackResult(e, p) : buildNormalResult(e);
  console.log(`\n### ${label}  overall=${p.overall_urgency} crit=${p.has_critical} suppressed=${p.suppressed_ids}`);
  console.log("graded:", e.graded.map((g) => `${g.test}=${g.value}(${g.range},${g.dir ?? "-"},${g.abnormal ? "ABN" : "ok"})`).join(" "));
  for (const f of p.findings) console.log(`  [${f.rule_id}|${f.urgency}] ${f.headline}\n     MS: ${f.must_say}\n     ACT: ${f.action}`);
  console.log("  RECS:", (r.general_recommendations ?? []).join(" || "));
}
