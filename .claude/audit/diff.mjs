// HEAD در برابرِ درخت: HEAD_ROOT=<پوشهٔ git archive + junction node_modules> node diff.mjs
// HEAD در برابرِ working tree: خروجیِ کامل (یافته‌ها + توصیه‌ها) برای پنل‌های freeze و چند پنلِ کنترل
import { pathToFileURL } from "node:url";
const load = async (root) => {
  const R = pathToFileURL(root + "/khanesh-server/rules/").href;
  const a = await import(R + "adapter.js"), p = await import(R + "patterns.js"), pr = await import(R + "prompt.js");
  return (patient, tests) => { const e = a.runEngine({ patient, tests }); const P = p.runPatterns(e);
    return { f: P.findings.map((x) => ({ id: x.rule_id, p: x.pattern, u: x.urgency, h: x.headline, m: x.must_say, a: x.action, s: x.suggest, w: x.warnings })), r: pr.buildEngineRecommendations(P, e), o: P.overall_urgency }; };
};
console.warn = () => {};
if (!process.env.HEAD_ROOT) throw new Error("HEAD_ROOT: git archive HEAD khanesh-server | tar -x -C <dir> + junction node_modules");
const old = await load(process.env.HEAD_ROOT);
import { fileURLToPath } from "node:url";
const neu = await load(fileURLToPath(new URL("../..", import.meta.url)));
const P = (o) => Object.entries(o).map(([name, v]) => ({ name, value: String(v[0]), unit: v[1] }));
const F = { age: 40, sex: "F" };
const panels = [
  ...[{ TSH: [8, "mIU/L"] }, { TSH: [0.05, "mIU/L"] },
  { TSH: [8, "mIU/L"], "Free T4": [0.6, "ng/dL"] }, { TSH: [0.05, "mIU/L"], "Free T4": [2.8, "ng/dL"] },
  { TSH: [0.05, "mIU/L"], "Free T4": [1.2, "ng/dL"], FT3: [5.5, "pg/mL"] }, { TSH: [6, "mIU/L"], "Anti-TPO": [120, "IU/mL"] },
  { "Anti-TPO": [300, "IU/mL"] }, { TSH: [2, "mIU/L"], "Free T4": [2.6, "ng/dL"] },
  { TSH: [12, "mIU/L"], "Free T4": [1.1, "ng/dL"], "Anti-TPO": [80, "IU/mL"] }, { TSH: [0.2, "mIU/L"], T3: [250, "ng/dL"] },
  { "Free T4": [0.5, "ng/dL"] }, { TSH: [25, "mIU/L"], "Free T4": [0.3, "ng/dL"], "Anti-TPO": [500, "IU/mL"] }].map((o) => ["S08 " + JSON.stringify(o), F, P(o)]),
  ["M111 pe_components", { age: 29, sex: "F" }, [["PLT", "90"], ["Creatinine", "1.2", "mg/dL"], ["AST", "90"], ["ALT", "80"]].map(([name, value, unit]) => ({ name, value, unit }))],
];
for (const [label, pt, tests] of panels) {
  const a = old(pt, tests), b = neu(pt, tests);
  if (JSON.stringify(a) === JSON.stringify(b)) { console.log(`= ${label}`); continue; }
  console.log(`≠ ${label}  overall ${a.o}→${b.o}`);
  for (let i = 0; i < Math.max(a.f.length, b.f.length); i++) for (const k of ["id", "p", "u", "h", "m", "a", "s", "w"]) {
    const x = JSON.stringify(a.f[i]?.[k]), y = JSON.stringify(b.f[i]?.[k]);
    if (x !== y) console.log(`   [${i}].${k}\n     - ${x}\n     + ${y}`);
  }
  if (JSON.stringify(a.r) !== JSON.stringify(b.r)) console.log(`   recs\n     - ${JSON.stringify(a.r)}\n     + ${JSON.stringify(b.r)}`);
}
