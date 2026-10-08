// P98: همهٔ اجزای دیفرانسیل وقتی برگه درصد چاپ کرده همان درصدِ چاپ‌شده را می‌گویند (مثل لنفوسیت و ائوزینوفیل)، با همان قالبِ absQuoteFa.
import test from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";

const run = (tests) => runPatterns(runEngine({ patient: { age: 40, sex: "M" }, tests }));
const wbc = { name: "WBC", value: "10", unit: "10^3/uL" };

test("P98: مونوسیتوز با درصدِ چاپی", () => {
  const f = run([wbc, { name: "Mono%", value: "15" }]).findings.find((x) => x.pattern === "monocytosis");
  assert.ok(f, "مونوسیتوز باید فعال شود");
  assert.ok(/مونوسیت شما ٪15 است/.test(f.must_say), f.must_say);
});
test("P98: بازوفیلی با درصدِ چاپی", () => {
  const f = run([wbc, { name: "Baso%", value: "3" }]).findings.find((x) => x.pattern === "basophilia");
  assert.ok(f, "بازوفیلی باید فعال شود");
  assert.ok(/بازوفیل شما ٪3 است/.test(f.must_say), f.must_say);
});
test("P98: مونوسیتوپنی با درصدِ چاپی", () => {
  const f = run([wbc, { name: "Mono%", value: "0.3" }]).findings.find((x) => x.pattern === "monocytopenia");
  assert.ok(f, "مونوسیتوپنی باید فعال شود");
  assert.ok(/مونوسیت شما ٪0\.3 است/.test(f.must_say), f.must_say);
});
