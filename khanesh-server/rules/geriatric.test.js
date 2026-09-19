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
    assert.strictEqual(hb.tag, "normal", "Hb 12.3 should be normal for a 75yo male (range 11.0-17.5)");
    
    assert.ok(mcv, "MCV should be graded");
    assert.strictEqual(mcv.abnormal, false, "MCV 101 should be normal for a 75yo male (range 82-102)");
    assert.strictEqual(mcv.tag, "normocytic", "MCV tag should be normocytic");
  });
});
