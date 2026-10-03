// specs/012 probe — live engine, working tree. Run from khanesh-server/.
import { runEngine } from "file:///C:/Users/surface/Desktop/khanesh-project/khanesh-server/rules/adapter.js";
import { runPatterns, RULES } from "file:///C:/Users/surface/Desktop/khanesh-project/khanesh-server/rules/patterns.js";

const run = (label, tests, patient = { age: 35, sex: "F" }) => {
  const e = runEngine({ patient, tests });
  const p = runPatterns(e);
  const ids = (p.findings ?? p).map?.((f) => f.pattern ?? f.id) ?? [];
  const where = tests.map((t) => {
    const nm = t.name;
    const graded = e.graded?.find((g) => g.raw === nm || g.name === nm);
    const inQual = Object.keys(e.qual ?? {}).some((k) => k === nm);
    const inSemen = Object.keys(e.semenQual ?? {}).some((k) => k === nm);
    const un = (e.unmapped ?? []).some((u) => (u.name ?? u) === nm);
    return `${nm}→${inQual ? "qual" : inSemen ? "semenQual" : un ? "unmapped" : e.graded?.length ? "graded?" : "?"}`;
  });
  console.log(`${label.padEnd(28)} | ${where.join(", ")} | findings: ${ids.join(",") || "∅"} | graded: ${(e.graded ?? []).map((g) => g.test).join(",")}`);
};

console.log("RULES:", RULES.length);
console.log("── row 0 ──");
run("HbA2", [{ name: "HbA2", value: "5.2", unit: "%" }]);
run("HbF", [{ name: "HbF", value: "4", unit: "%" }]);
run("ApoB", [{ name: "ApoB", value: "160", unit: "mg/dL" }]);
run("Homocysteine", [{ name: "Homocysteine", value: "25", unit: "µmol/L" }]);
run("NT-proBNP", [{ name: "NT-proBNP", value: "2000", unit: "pg/mL" }], { age: 70, sex: "M" });
run("BNP", [{ name: "BNP", value: "500", unit: "pg/mL" }], { age: 70, sex: "M" });
run("Prolactin", [{ name: "Prolactin", value: "60", unit: "ng/mL" }]);
run("FT4", [{ name: "Free T4", value: "2.5", unit: "ng/dL" }]);
run("Copper", [{ name: "Copper", value: "40", unit: "µg/dL" }]);
run("Ceruloplasmin", [{ name: "Ceruloplasmin", value: "10", unit: "mg/dL" }]);
run("eGFR (Cr)", [{ name: "Creatinine", value: "2.5", unit: "mg/dL" }]);
run("Non-HDL (Chol+HDL)", [{ name: "Cholesterol", value: "260", unit: "mg/dL" }, { name: "HDL", value: "40", unit: "mg/dL" }]);
console.log("── tier 1 today ──");
run("VDRL reactive", [{ name: "VDRL", value: "Reactive 1:8" }]);
run("RPR", [{ name: "RPR", value: "Reactive" }]);
run("Rubella IgG", [{ name: "Rubella IgG", value: "4", unit: "IU/mL" }]);
run("Indirect Coombs", [{ name: "Indirect Coombs", value: "Positive" }], { age: 28, sex: "F", pregnant: true });
run("Coombs Wright", [{ name: "Coombs Wright", value: "1/160" }]);
run("H. pylori Ag", [{ name: "H. pylori Ag (stool)", value: "Positive" }]);
run("H. pylori IgG", [{ name: "H.pylori IgG", value: "Positive" }]);
run("Anti-Tg", [{ name: "Anti-Tg", value: "300", unit: "IU/mL" }]);
run("Anti-thyroglobulin", [{ name: "Anti Thyroglobulin Ab", value: "300", unit: "IU/mL" }]);
run("bare Tg", [{ name: "Tg", value: "180", unit: "mg/dL" }]);
run("TRAb", [{ name: "TRAb", value: "8", unit: "IU/L" }]);
run("TSI", [{ name: "TSI", value: "Positive" }]);
run("Semen composite", [{ name: "Sperm concentration", value: "10", unit: "million/mL" }, { name: "Total motility", value: "30", unit: "%" }, { name: "Normal forms", value: "2", unit: "%" }], { age: 33, sex: "M" });
run("Spermogram", [{ name: "Spermogram", value: "Abnormal" }], { age: 33, sex: "M" });
