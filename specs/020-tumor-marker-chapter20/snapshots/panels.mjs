const R = "file:///C:/Users/surface/Desktop/khanesh-project/khanesh-server/rules/";
const { runEngine } = await import(R + "adapter.js"); const { runPatterns } = await import(R + "patterns.js");
const { healthScore } = await import(R + "score.js"); const { tumorMarkerRows } = await import(R + "tumor_markers.js");
const T = (name, value, unit, reference = "") => ({ name, value: String(value), unit, reference });
const P = {
  "۱ مرد ۵۵ — PSA ۷٫۸ + نسبتِ ۱۴٪": [{ age: 55, sex: "M" }, [T("Total PSA", 7.8, "ng/mL", "< 4.0"), T("Free PSA", 1.1, "ng/mL", ""), T("Free/Total PSA Ratio", 14, "%", "> 25")]],
  "۲ زن ۶۲ — پنلِ چهارگانه": [{ age: 62, sex: "F" }, [T("CA 125", 48, "U/mL", "0-35"), T("C.E.A", 3.2, "ng/mL", "Non smoker: < 5   Smokers: < 10"), T("CA 15-3", 22, "U/mL", "At or below: 31.0"), T("CA 19-9", 18, "U/mL", "< 37")]],
  "۳ برگهٔ بی‌جنس — کلسی‌تونین دوجنسیتی": [{ age: 45 }, [T("Calcitonin", 9, "pg/mL", "Male: < 8.4 Female: < 5"), T("CEA", 2, "ng/mL", "< 5")]],
  "۴ زنِ باردار ۳۰ — AFP ۱۲۰": [{ age: 30, sex: "F", pregnant: true }, [T("AFP", 120, "ng/mL", "< 10")]],
  "۵ زن ۵۰ — PSA ۰٫۸": [{ age: 50, sex: "F" }, [T("PSA", 0.8, "ng/mL", "< 4.0")]],
  "۶ مرد ۶۸ — PSA ۲۵ بی‌بازه + AFP + B2M": [{ age: 68, sex: "M" }, [T("PSA", 25, "ng/mL", ""), T("AFP", 4, "ng/mL", "< 7.0"), T("Beta-2 Microglobulin", 3.1, "mg/L", "0.8-2.2")]],
  "۷ مرد ۴۰ — سانسورشده": [{ age: 40, sex: "M" }, [T("CA 19-9", "<2", "U/mL", "< 37"), T("CEA", ">100", "ng/mL", "< 5")]],
};
for (const [label, [patient, tests]] of Object.entries(P)) {
  const e = runEngine({ patient, tests }); const p = runPatterns(e);
  console.log(`\n═══ ${label} ═══  urgency=${p.overall_urgency ?? p.urgency}`);
  for (const r of tumorMarkerRows(e)) console.log(`  [ردیف] ${r.name} = ${r.value} ${r.unit ?? ""} | ${r.range ?? "—"} → ${r.verdict} (${r.fa})${r.sexMismatch ? " ⚑جنس" : ""}`);
  const leftover = Object.keys(e.ungraded ?? {}).filter((k) => !tumorMarkerRows(e).some((r) => r.key === k));
  if (leftover.length || (e.unmapped ?? []).length) console.log("  ⚠ بی‌ردیف:", leftover, "unmapped:", e.unmapped);
  for (const f of p.findings) console.log(`  {${f.rule_id ?? f.pattern} · ${f.urgency}} ${f.headline}\n    ${f.must_say}`);
}
