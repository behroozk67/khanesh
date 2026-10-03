// ممیزیِ لایهٔ ۱ (P72): پیشنهادهای غیرِ آزمایش که «درخواست آزمایش …» می‌شوند (نیازمندِ خروجیِ layer1)
// اجرا از هر جا: node .claude/audit/<file>.mjs — خروجیِ میانی: $LAYER1_OUT یا <tmp>/layer1-out.json
import { tmpdir } from "node:os"; import { join } from "node:path";
const OUT = process.env.LAYER1_OUT ?? join(tmpdir(), "layer1-out.json");
const R = new URL("../../khanesh-server/rules/", import.meta.url).href;
const { runEngine } = await import(R + "adapter.js");
const { runPatterns, RULES } = await import(R + "patterns.js");
const { buildEngineRecommendations } = await import(R + "prompt.js");
const { ADULT_REFS, getRef } = await import(R + "refs.js");
import { readFileSync } from "node:fs";
console.warn = () => {};
const o = JSON.parse(readFileSync(OUT));
const bad = new Map(); const keys = Object.keys(o.nameOf);
const BAD = /^درخواست .*(اگر|کنید|بگویید|نکنید|بروید|شود|است|بررسی توسط|مشاوره|ارجاع|سونوگرافی|نوار قلب|معاینه).* از پزشک$/;
const panel = (tests) => { const e0 = runEngine({ patient: { sex: "M", age: 45 }, tests }); const e = e0.engineOut ?? e0; const p = runPatterns(e);
  for (const f of p.findings) for (const s of f.suggest ?? []) if (/اگر|کنید|بگویید|است$/.test(s)) bad.set(`suggest:${f.rule_id}: ${s}`, 1);
  for (const r of buildEngineRecommendations(p, e)) if (BAD.test(r)) bad.set(r, 1); };
const v = (k, d, m) => { const r = getRef(k, "M", 45); if (!Array.isArray(r)) return null; return +(d ? r[1] * m : r[0] * m).toPrecision(3); };
for (let i = 0; i < keys.length; i++) for (const [d, m] of [[1, 1.5], [1, 4], [0, 0.6], [0, 0.3]]) {
  const a = v(keys[i], d, m); if (a == null || a <= 0) continue;
  panel([{ name: o.nameOf[keys[i]], value: String(a), unit: ADULT_REFS[keys[i]].unit ?? "" }]);
  for (let j = i + 1; j < keys.length; j += 3) { const b = v(keys[j], d, m); if (b == null || b <= 0) continue;
    panel([{ name: o.nameOf[keys[i]], value: String(a), unit: ADULT_REFS[keys[i]].unit ?? "" }, { name: o.nameOf[keys[j]], value: String(b), unit: ADULT_REFS[keys[j]].unit ?? "" }]); }
}
console.log([...bad.keys()].join("\n"));
