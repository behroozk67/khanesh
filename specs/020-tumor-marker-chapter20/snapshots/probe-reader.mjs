const s = await import("file:///C:/Users/surface/Desktop/khanesh-project/khanesh-server/rules/serology.js");
const tm = await import("file:///C:/Users/surface/Desktop/khanesh-project/khanesh-server/rules/tumor_markers.js");
const cases = [
  ["PSA", "4.0", "< 4.0", "ng/mL"], ["PSA", "3.9", "< 4.0", "ng/mL"], ["PSA", "4.5", "0 - 4", "ng/mL"],
  ["PSA", "5.0", "< 4.0 / 70-90 years: < 4.0", "ng/mL"], ["PSA", "5.0", "< 4,0 / 70-80 years: Up to 6.5", "ng/mL"],
  ["PSA", "3.0", "40-49 y: <2.5 / 50-59 y: <3.5", "ng/mL"], ["PSA", "3.0", "Up to 4", "ng/mL"],
  ["Free PSA Ratio", "18", "> 25", "%"], ["Free PSA Ratio", "30", "> 25", "%"],
  ["AFP", "8", "< 7.0", "ng/mL"], ["AFP", "7.0", "< 7.0", "ng/mL"], ["AFP", "50", "Adult: < 10 / Pregnancy: variable", "ng/mL"],
  ["Calcitonin", "12", "Male: < 8.4 Female: < 5", "pg/mL"], ["Calcitonin", "12", "", "pg/mL"],
  ["B2M", "2.5", "0.8-2.2", "mg/L"], ["Chromogranin A", "120", "< 100", "ng/mL"],
];
for (const sex of ["M", "F", null]) for (const [name, value, reference, unit] of cases) {
  const r = s.routeSerology(name, { name, value, reference, unit }, sex);
  const key = r?.key;
  const q = { n: parseFloat(value), cmp: null };
  const nu = key ? tm.tmVerdict(q.n, null, tm.parseTmRange(String(reference).trim(), sex)) : "-";
  const nuShown = nu === "unknown" ? (String(reference).trim() ? "unreadable" : "noref") : nu;
  console.log(sex, `${name}=${value} | ${reference}`, "→ now:", r?.to, key, r?.state, "| tm-reader:", nuShown, r?.state === nuShown ? "" : "  ◀ CHANGES");
}
// Q5b: بازهٔ دوجنسیتی با جنسِ نامعلوم
for (const sex of ["M", "F", null]) {
  const t = { name: "Calcitonin", value: "6", reference: "Male: < 8.4 Female: < 5", unit: "pg/mL" };
  const r = s.routeSerology(t.name, t, sex);
  console.log("Q5b", sex, "calcitonin 6 | Male: < 8.4 Female: < 5 → now:", r?.state, "| tm-reader:", tm.tmVerdict(6, null, tm.parseTmRange(t.reference, sex)));
}
