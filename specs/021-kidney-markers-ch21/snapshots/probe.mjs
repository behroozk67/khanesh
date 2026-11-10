// پروبِ دستیِ specs/021 — رفتارِ فعلیِ موتور روی پنل‌های کلیوی. اسمِ test-* ندارد عمداً.
const R = "file:///C:/Users/surface/Desktop/khanesh-project/khanesh-server/rules/";
const { runEngine } = await import(R + "adapter.js"); const { runPatterns } = await import(R + "patterns.js");
const T = (name, value, unit, reference = "") => ({ name, value: String(value), unit, reference });
const P = {
  "U1 زن ۴۰ — اسید اوریک ۲٫۲ (زیرِ ۲٫۵ موتور)": [{ age: 40, sex: "F" }, [T("Uric Acid", 2.2, "mg/dL", "2.6-6.0"), T("Creatinine", 0.8, "mg/dL", "0.5-1.1")]],
  "U2 مرد ۵۰ — اسید اوریک ۱٫۵": [{ age: 50, sex: "M" }, [T("Uric Acid", 1.5, "mg/dL", "3.5-7.2")]],
  "U3 زن ۳۰ — اسید اوریک ۶٫۱ (بینِ ۶٫۰ منبع و ۶٫۲ موتور)": [{ age: 30, sex: "F" }, [T("Uric Acid", 6.1, "mg/dL", "")]],
  "U4 بی‌جنس — اسید اوریک ۶٫۸": [{ age: 45 }, [T("Uric Acid", 6.8, "mg/dL", "")]],
  "U5 اسید اوریک µmol/L": [{ age: 45, sex: "M" }, [T("Uric Acid", 480, "µmol/L", "")]],
  "B1 مرد ۶۵ — BUN ۲۲ (بینِ ۲۰ و ۲۳)": [{ age: 65, sex: "M" }, [T("BUN", 22, "mg/dL", ""), T("Creatinine", 1.0, "mg/dL", "")]],
  "B2 زنِ باردار — اوره ۱۲": [{ age: 28, sex: "F", pregnant: true }, [T("Urea", 12, "mg/dL", "15-45"), T("Creatinine", 0.5, "mg/dL", "")]],
  "B3 اوره mmol/L ۱۲": [{ age: 50, sex: "M" }, [T("Urea", 12, "mmol/L", "2.5-7.8"), T("Creatinine", 90, "µmol/L", "")]],
  "B4 اوره ۸۰ + کراتینین ۲٫۰ (نسبتِ بالا)": [{ age: 60, sex: "M" }, [T("Urea", 80, "mg/dL", ""), T("Creatinine", 2.0, "mg/dL", "")]],
  "A1 ACR ۳٫۵ mg/mmol": [{ age: 55, sex: "M" }, [T("Urine Albumin/Creatinine Ratio", 3.5, "mg/mmol", "< 3.0")]],
  "A2 ACR ۲۸ mg/g": [{ age: 55, sex: "M" }, [T("ACR", 28, "mg/g", "< 30")]],
  "A3 ACR ۳۵ mg/mmol": [{ age: 55, sex: "M" }, [T("ACR", 35, "mg/mmol", "")]],
  "P1 PCR ۶۰ mg/mmol": [{ age: 55, sex: "M" }, [T("Urine Protein/Creatinine Ratio", 60, "mg/mmol", "< 15")]],
  "P2 UPCR ۰٫۵ mg/mg": [{ age: 55, sex: "F" }, [T("UPCR", 0.5, "mg/mg", "< 0.2")]],
  "P3 Protein Creatinine Ratio ۴۰۰ mg/g": [{ age: 55, sex: "F" }, [T("Protein Creatinine Ratio", 400, "mg/g", "< 150")]],
  "P4 پروتئین ادرار ۲۴ ساعته ۵۰۰ (غیرباردار)": [{ age: 50, sex: "M" }, [T("Protein 24h urine", 500, "mg/24h", "< 150")]],
  "P5 میکروآلبومین ادرار ۴۵ mg/L": [{ age: 50, sex: "M" }, [T("Microalbumin", 45, "mg/L", "< 20")]],
  // ── مرزهای ACR (G1) ──
  ...Object.fromEntries([2.9, 3.0, 3.2, 3.4, 29.9, 30, 30.1, 33, 34].map((v) => [`AB ACR ${v} mg/mmol`, [{ age: 55, sex: "M" }, [T("ACR", v, "mg/mmol", "< 3.0")]]])),
  "AB2 ACR ۲۹ mg/g": [{ age: 55, sex: "M" }, [T("ACR", 29, "mg/g", "< 30")]],
  "AB3 ACR ۳٫۲ بی‌واحد": [{ age: 55, sex: "M" }, [T("ACR", 3.2, "", "")]],
  "AB4 زن ACR ۳٫۲ mg/mmol با بازهٔ جنس‌محور": [{ age: 55, sex: "F" }, [T("ACR", 3.2, "mg/mmol", "M < 2.5, F < 3.5")]],
  // ── اوره کنارِ کراتینینِ بالا زیرِ مالکانِ دیگر (G2) ──
  "G2a اوره ۶۰ + Cr ۱٫۶": [{ age: 60, sex: "M" }, [T("Urea", 60, "mg/dL"), T("Creatinine", 1.6, "mg/dL")]],
  "G2b BUN ۴۰ + Cr ۲٫۰": [{ age: 60, sex: "M" }, [T("BUN", 40, "mg/dL"), T("Creatinine", 2.0, "mg/dL")]],
  "G2c GN: اوره ۸۰ + Cr ۲ + خون و پروتئینِ ادرار": [{ age: 40, sex: "M" }, [T("Urea", 80, "mg/dL"), T("Creatinine", 2.0, "mg/dL"), T("Urine Blood", "3+", ""), T("Urine Protein", "2+", "")]],
  "G2d رابدو: CK ۵۰۰۰ + خون ادرار + اوره ۷۰ + Cr ۲": [{ age: 30, sex: "M" }, [T("CK", 5000, "U/L"), T("Urine Blood", "3+", ""), T("Urea", 70, "mg/dL"), T("Creatinine", 2.0, "mg/dL")]],
  "G2e اورژانسِ کراتینین: Cr ۶ + اوره ۱۵۰": [{ age: 60, sex: "M" }, [T("Creatinine", 6, "mg/dL"), T("Urea", 150, "mg/dL")]],
  "G2f AKI + K ۶٫۸: Cr ۳ + اوره ۱۲۰": [{ age: 60, sex: "M" }, [T("Creatinine", 3, "mg/dL"), T("Urea", 120, "mg/dL"), T("Potassium", 6.8, "mmol/L")]],
  "G2g دیالیزی: Cr ۷ + اوره ۱۴۰": [{ age: 60, sex: "M", conditions: ["dialysis"] }, [T("Creatinine", 7, "mg/dL"), T("Urea", 140, "mg/dL")]],
  "G2h اورهٔ اورژانس ۲۲۰ + Cr ۴": [{ age: 60, sex: "M" }, [T("Urea", 220, "mg/dL"), T("Creatinine", 4, "mg/dL")]],
  // ── اسید اوریک (G3) ──
  "U6 بی‌جنس — اسید اوریک ۳٫۰ (پایین فقط برای مرد)": [{ age: 45 }, [T("Uric Acid", 3.0, "mg/dL", "")]],
  "U7 کودک ۱۰ — اسید اوریک ۱٫۸": [{ age: 10, sex: "M" }, [T("Uric Acid", 1.8, "mg/dL", "")]],
  // ── PCR (G4) ──
  "P6 کنترلِ منفی: PCR مولکولی": [{ age: 40, sex: "M" }, [T("PCR", "Positive", ""), T("HCV PCR", "Not Detected", "")]],
  "P7 نسبت پروتئین به کراتینین فارسی": [{ age: 40, sex: "M" }, [T("نسبت پروتئین به کراتینین", 0.4, "mg/mg", "< 0.2")]],
};
for (const [label, [patient, tests]] of Object.entries(P)) {
  const e = runEngine({ patient, tests }); const p = runPatterns(e);
  console.log(`\n═══ ${label} ═══  urgency=${p.overall_urgency ?? p.urgency}`);
  for (const g of e.graded) console.log(`  [graded] ${g.test}=${g.value} ${g.range ?? ""} ab=${g.abnormal} ${g.dir ?? ""} ${g.tag ?? ""}`);
  const ug = Object.keys(e.ungraded ?? {}); if (ug.length) console.log("  ungraded:", JSON.stringify(e.ungraded).slice(0, 200));
  if ((e.unmapped ?? []).length) console.log("  unmapped:", JSON.stringify(e.unmapped).slice(0, 200));
  for (const f of p.findings) console.log(`  {${f.rule_id ?? f.pattern} · ${f.urgency}} ${f.headline}`);
}
