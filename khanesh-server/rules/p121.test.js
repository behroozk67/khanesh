// P121 — Hb↓ + CRP↑ بدونِ پنلِ آهن: یک جمله در متنِ همان قاعدهٔ کم‌خونی؛ فوریت و بقیهٔ متن دست‌نخورده.
// پیش از P121 anemia_chronic_disease فقط با IRON+FERRITIN می‌آمد، پس برگهٔ Hb↓+CRP↑ بی‌پنل هیچ پیوندی نمی‌شنید.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";

const run = (rows) => runPatterns(runEngine({ patient: { age: 40, sex: "F" }, tests: rows }));
const find = (p, pattern) => p.findings.find((f) => f.pattern === pattern);
const CLAUSE = /التهاب خودش می‌تواند کم‌خونی بسازد/;   // ACD قدیمی هم «CRP شما هم بالاست» دارد؛ این عبارت فقط مالِ P121 است
const HB = { name: "Hemoglobin", value: "10", unit: "g/dL" };
const CRP = { name: "CRP", value: "40", unit: "mg/L" };

test("P121: نورموسیتیک + CRP↑ بی‌پنلِ آهن ⇒ جملهٔ التهاب، آهن سرم/TIBC در suggest، فوریت همان", () => {
  const withCrp = find(run([HB, { name: "MCV", value: "90" }, CRP]), "normocytic_anemia");
  const without = find(run([HB, { name: "MCV", value: "90" }]), "normocytic_anemia");
  assert.match(withCrp.must_say, CLAUSE);
  assert.ok(withCrp.suggest.includes("آهن سرم") && withCrp.suggest.includes("TIBC"), withCrp.suggest.join("|"));
  assert.equal(withCrp.urgency, without.urgency, "جمله فوریت را عوض نمی‌کند");
  assert.doesNotMatch(without.must_say, CLAUSE);
  assert.ok(!without.suggest.includes("TIBC"), "بی‌CRP خروجی پیشین است");
});

test("P121: Hb تنها + CRP↑ ⇒ همان جمله؛ بی‌CRP یا با ESR↑ تنها ⇒ نه (ESR را خودِ کم‌خونی بالا می‌برد)", () => {
  assert.match(find(run([HB, CRP]), "anemia_hb_alone").must_say, CLAUSE);
  assert.doesNotMatch(find(run([HB]), "anemia_hb_alone").must_say, CLAUSE);
  assert.doesNotMatch(find(run([HB, { name: "ESR", value: "60", unit: "mm/hr" }]), "anemia_hb_alone").must_say, CLAUSE);
});

test("P121: پنلِ کاملِ آهن روی برگه ⇒ جمله نمی‌آید (مالکْ iron_deficiency_panel/anemia_chronic_disease است)", () => {
  const p = run([HB, { name: "MCV", value: "90" }, CRP,
    { name: "Iron", value: "30", unit: "ug/dL" }, { name: "Ferritin", value: "150", unit: "ng/mL" }]);
  for (const f of p.findings) assert.doesNotMatch(f.must_say ?? "", CLAUSE, f.pattern);
});
