import { describe, it } from "node:test";
import assert from "node:assert";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";

describe("Geriatric Logic", () => {
  it("should apply geriatric reference ranges for a 75-year old", () => {
    const testOcr = {
      tests: [
        { name: "Hb", value: "12.3", unit: "g/dL", reference: "14-17.5" },
        { name: "RBC", value: "3.82" },
        { name: "HCT", value: "38.6" },
        { name: "MCV", value: "101" },
        { name: "MCH", value: "32.2" },
        { name: "MCHC", value: "31.9" },
        { name: "PLT", value: "180" },
        { name: "Ferritin", value: "181" }
      ],
      patient: {
        age: "75",
        sex: "مرد"
      }
    };

    const engineOut = runEngine(testOcr);
    
    const hb = engineOut.graded.find(g => g.test === "HGB");
    const mcv = engineOut.graded.find(g => g.test === "MCV");

    assert.ok(hb, "Hb should be graded");
    // specs/008 Q1 (تأییدِ کاربر ۱۴۰۵/۰۷/۰۱): حدِ پایینِ Hb مردِ ≥۷۰ ساله ۱۲.۴ است و GERIATRIC_REFS.HGB
    // (۱۱.۰، بی‌منبع — P2) حذف شد. پس 12.3 برای مردِ ۷۵ ساله دیگر «طبیعی» نیست — عمداً عوض شد.
    assert.strictEqual(hb.range, "12.4–17.5", "Hb range for a 75yo male is the approved >=70 row");
    assert.strictEqual(hb.dir, "low", "Hb 12.3 is low for a 75yo male (range 12.4-17.5, specs/008)");
    
    assert.ok(mcv, "MCV should be graded");
    assert.strictEqual(mcv.abnormal, false, "MCV 101 should be normal for a 75yo male (range 82-102)");
    assert.strictEqual(mcv.tag, "normocytic", "MCV tag should be normocytic");
  });
});
