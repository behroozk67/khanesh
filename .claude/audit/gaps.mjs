// ممیزیِ لایهٔ ۱ (P72): پله‌های «فقط توضیحِ آماده نداریم» برای هر کلید×جهت (نیازمندِ خروجیِ layer1)
// اجرا از هر جا: node .claude/audit/<file>.mjs — خروجیِ میانی: $LAYER1_OUT یا <tmp>/layer1-out.json
import { tmpdir } from "node:os"; import { join } from "node:path";
const OUT = process.env.LAYER1_OUT ?? join(tmpdir(), "layer1-out.json");
const R = new URL("../../khanesh-server/rules/", import.meta.url).href;
const { runEngine } = await import(R + "adapter.js");
const { runPatterns } = await import(R + "patterns.js");
const { ADULT_REFS, getRef } = await import(R + "refs.js");
import { readFileSync } from "node:fs";
console.warn = () => {};
const o = JSON.parse(readFileSync(OUT));
const FB = new Set(["unmatched_abnormal", "unexplained_abnormal"]);
const pt = { sex: "M", age: 45 };
for (const g of o.gapList) {
  const [key, dir] = g.split(" ")[0].split("|");
  const name = o.nameOf[key]; if (!name) continue;
  const r = getRef(key, "M", 45); if (!Array.isArray(r)) { console.log(g, "(child-only)"); continue; }
  const mults = dir === "high" ? [1.05, 1.3, 2, 4, 10] : [0.95, 0.7, 0.5, 0.25, 0.1];
  const row = [];
  for (const m of mults) {
    const v = +((dir === "high" ? r[1] : r[0]) * m).toPrecision(3);
    const e0 = runEngine({ patient: pt, tests: [{ name, value: String(v), unit: ADULT_REFS[key].unit ?? "" }] });
    const e = e0.engineOut ?? e0; const p = runPatterns(e);
    const gg = e.graded.find((x) => x.test === key);
    const ids = p.findings.map((f) => f.rule_id);
    row.push(`${v}:${!gg?.abnormal ? "ok" : ids.every((i) => FB.has(i)) ? "FB" : ids.filter((i) => !FB.has(i)).join("+")}/${p.overall_urgency}`);
  }
  console.log(`${key}${dir === "high" ? "↑" : "↓"} [${r}] ${row.join("  ")}`);
}
