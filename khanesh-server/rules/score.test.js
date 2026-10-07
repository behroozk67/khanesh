import { describe, it } from "node:test";
import assert from "node:assert";
import { healthScore, URGENCY_CAP, MIN_SCORED, testPoints } from "./score.js";

const N = (test, extra = {}) => ({ test, mode: "binary", abnormal: false, nearLimit: false, level: null, ...extra });
const panel = (n, over = []) => [...over, ...Array.from({ length: n }, (_, i) => N(`T${i}`))];

describe("healthScore (P97)", () => {
  it("همه طبیعی ⇒ ۱۰۰ و باند high", () => {
    const s = healthScore({ graded: panel(8) }, "none");
    assert.equal(s.value, 100);
    assert.equal(s.band, "high");
  });

  it("کمتر از حداقل آزمایش ⇒ امتیاز نمی‌دهد (CBCِ ناقص ۱۰۰ نشود)", () => {
    const s = healthScore({ graded: panel(MIN_SCORED - 1) }, "none");
    assert.equal(s.value, null);
    assert.equal(s.reason, "too_few");
  });

  it("نوزاد (<۲۸ روز) ⇒ بی‌امتیاز", () => {
    const s = healthScore({ graded: panel(8), age: 10 / 365 }, "none");
    assert.equal(s.value, null);
    assert.equal(s.reason, "neonate");
    assert.equal(healthScore({ graded: panel(8), age: 30 }, "none").value, 100);
  });

  it("آزمایشِ بی‌محدوده (unknown) در امتیاز نمی‌آید", () => {
    const g = [...panel(5), { test: "X", mode: "unknown", abnormal: false }];
    const s = healthScore({ graded: g }, "none");
    assert.equal(s.counted, 5);
    assert.equal(s.points.X, undefined);
  });

  it("سقفِ فوریت: یک بحرانی بینِ ۲۰ طبیعی — میانگین ~۹۵ ولی اورژانس ⇒ ≤ ۳۵", () => {
    const g = panel(19, [N("K", { abnormal: true, level: "critical" })]);
    const s = healthScore({ graded: g }, "emergency");
    assert.ok(s.value <= URGENCY_CAP.emergency, `value=${s.value}`);
    assert.equal(s.capped, true);
    assert.equal(s.band, "low");
  });

  it("امتیاز هرگز از سقفِ فوریتش بیشتر نیست (همهٔ سطح‌ها)", () => {
    for (const [u, cap] of Object.entries(URGENCY_CAP)) {
      assert.ok(healthScore({ graded: panel(10) }, u).value <= cap, u);
    }
  });

  it("بدترشدنِ شدتِ یک آزمایش، امتیاز را هرگز بالا نمی‌برد", () => {
    const levels = [null, "mild", "moderate", "marked", "critical"];
    let prev = Infinity;
    for (const level of levels) {
      const g = panel(9, [N("A", { abnormal: level !== null, level })]);
      const v = healthScore({ graded: g }, "none").value;
      assert.ok(v <= prev, `${level}: ${v} > ${prev}`);
      prev = v;
    }
  });

  it("افزودنِ آزمایشِ طبیعی، امتیاز را پایین نمی‌آورد", () => {
    const base = [N("A", { abnormal: true, level: "moderate" }), ...panel(5)];
    const more = [...base, N("EXTRA")];
    assert.ok(healthScore({ graded: more }, "none").value >= healthScore({ graded: base }, "none").value);
  });

  it("نزدیکِ مرز کمی کمتر از طبیعی است؛ خارجِ بی‌درجه ۰٫۵", () => {
    assert.equal(testPoints(N("A", { nearLimit: true })), 0.9);
    assert.equal(testPoints(N("A", { abnormal: true })), 0.5);
  });
});
