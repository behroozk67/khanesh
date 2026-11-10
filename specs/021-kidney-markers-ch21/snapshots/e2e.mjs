// specs/021 — آزمونِ سرتاسریِ دستی روی سرورِ لوکال (موتور ⇒ مدل ⇒ تورهای ایمنی). اسمِ test-* ندارد عمداً.
// اجرا: node e2e.mjs <token> > e2e-output.txt
const token = process.argv[2];
const T = (name, value, unit = "", reference = "") => ({ name, value: String(value), unit, reference });
const P = {
  "G1 ACR 3.2 mg/mmol": [{ age: 55, sex: "M" }, [T("ACR", 3.2, "mg/mmol", "< 3.0"), T("FBS", 140, "mg/dL", "70-100")]],
  "G2 Urea 80 + Cr 2.0": [{ age: 60, sex: "M" }, [T("Urea", 80, "mg/dL", "15-45"), T("Creatinine", 2.0, "mg/dL", "0.6-1.3")]],
  "G2f AKI + K 6.8": [{ age: 60, sex: "M" }, [T("Creatinine", 3, "mg/dL"), T("Urea", 120, "mg/dL"), T("Potassium", 6.8, "mmol/L")]],
  "G3 Uric 1.5 (M)": [{ age: 50, sex: "M" }, [T("Uric Acid", 1.5, "mg/dL", "3.5-7.2"), T("Creatinine", 1.0, "mg/dL")]],
  "G4 UPCR only": [{ age: 55, sex: "M" }, [T("Urine Protein/Creatinine Ratio", 60, "mg/mmol", "< 15")]],
  "G5 pregnant urea 12": [{ age: 28, sex: "F", pregnant: true }, [T("Urea", 12, "mg/dL", "15-45"), T("Creatinine", 0.5, "mg/dL")]],
};
for (const [label, [patient, tests]] of Object.entries(P)) {
  const testResults = tests.map((t) => `${t.name}: ${t.value} ${t.unit} (${t.reference || "—"})`).join("\n");
  const r = await fetch("http://localhost:8787/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ patient, tests, testResults, patientInfo: `سن ${patient.age}` }),
  });
  const j = await r.json().catch(() => ({}));
  console.log(`\n═══ ${label} ═══ HTTP ${r.status} | urgency=${j._engine?.urgency} | critical=${j.has_critical} | patterns=${(j._engine?.patterns ?? []).join(",")}`);
  console.log("summary:", j.summary);
  console.log("interpretation:", j.interpretation);
  for (const t of j._engine?.tests ?? []) if (/ACR|اوره|اسید|کراتینین|پتاسیم/.test(t.name)) console.log(`  [row] ${t.name} ${t.value} (${t.range}) ${t.fa}`);
  for (const c of j._engine?.unitConversions ?? []) console.log(`  [unit] ${c.name ?? c.test}: ${c.raw} ${c.from} → ${c.value} ${c.to}`);
  if (j.error) console.log("error:", j.error);
}
