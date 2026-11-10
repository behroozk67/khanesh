// پروبِ دستیِ specs/022 — رفتارِ فعلیِ موتور روی پنل‌های کبدی (Tietz فصل ۳۷). اسمِ test-* ندارد عمداً.
const R = process.env.RULES_URL ?? "file:///C:/Users/surface/Desktop/khanesh-project/khanesh-server/rules/";
const { runEngine } = await import(R + "adapter.js"); const { runPatterns } = await import(R + "patterns.js");
const T = (name, value, unit, reference = "") => ({ name, value: String(value), unit, reference });
const M = { age: 45, sex: "M" }, F = { age: 35, sex: "F" };
const P = {
  "L1 ALT 450 AST 380 (≈۱۱×)": [M, [T("ALT", 450, "U/L"), T("AST", 380, "U/L"), T("ALP", 150, "U/L")]],
  "L2 AST 250 ALT 320 (< ۱۰×، معیارِ ۲۰۰/۳۰۰)": [M, [T("AST", 250, "U/L"), T("ALT", 320, "U/L"), T("ALP", 140, "U/L")]],
  "L3 ایسکمیک: AST 3000 ALT 2500 PT 18 Cr 2.5": [M, [T("AST", 3000, "U/L"), T("ALT", 2500, "U/L"), T("PT", 18, "sec"), T("Creatinine", 2.5, "mg/dL")]],
  "L4 AST 90 ALT 45 (نسبت ۲) بی GGT": [M, [T("AST", 90, "U/L"), T("ALT", 45, "U/L")]],
  "L4b AST 90 ALT 45 GGT 120": [M, [T("AST", 90, "U/L"), T("ALT", 45, "U/L"), T("GGT", 120, "U/L")]],
  "L5 AST 80 ALT 50 PLT 110 ALB 3.2": [M, [T("AST", 80, "U/L"), T("ALT", 50, "U/L"), T("PLT", 110, "10^3/uL"), T("Albumin", 3.2, "g/dL")]],
  "L5b AST 60 ALT 45 (نسبت ۱٫۳) تنها": [M, [T("AST", 60, "U/L"), T("ALT", 45, "U/L")]],
  "L6 آمونیاک 250 µmol/L": [M, [T("Ammonia", 250, "µmol/L")]],
  "L6b آمونیاک 150 µmol/L": [M, [T("Ammonia", 150, "µmol/L")]],
  "L7 آمونیاک 60": [M, [T("Ammonia", 60, "µmol/L")]],
  "L8 زن ۳۵ فریتین 230": [F, [T("Ferritin", 230, "ng/mL")]],
  "L8b زن ۳۵ فریتین 280": [F, [T("Ferritin", 280, "ng/mL")]],
  "L8c زن ۶۰ فریتین 280": [{ age: 60, sex: "F" }, [T("Ferritin", 280, "ng/mL")]],
  "L8d مرد فریتین 320": [M, [T("Ferritin", 320, "ng/mL")]],
  "L9 مرد فریتین 1200 AST طبیعی": [M, [T("Ferritin", 1200, "ng/mL"), T("AST", 30, "U/L"), T("ALT", 30, "U/L")]],
  "L9b مرد فریتین 1200 AST 80": [M, [T("Ferritin", 1200, "ng/mL"), T("AST", 80, "U/L"), T("ALT", 70, "U/L")]],
  "L10 زن TSAT 50": [F, [T("Transferrin Saturation", 50, "%")]],
  "L10b مرد TSAT 50 + فریتین 400": [M, [T("Transferrin Saturation", 50, "%"), T("Ferritin", 400, "ng/mL")]],
  "L11 anti-HBs 8": [M, [T("Anti-HBs", 8, "IU/mL", ">10")]],
  "L11b anti-HBs 12": [M, [T("Anti-HBs", 12, "mIU/mL", "")]],
  "L11c anti-HBs 150": [M, [T("Anti-HBs", 150, "mIU/mL", ">10")]],
  "L12 HBV DNA 5000 IU/mL": [M, [T("HBV DNA", 5000, "IU/mL")]],
  "L12b HBsAg Positive + HBV DNA 50000": [M, [T("HBsAg", "Positive", ""), T("HBV DNA PCR", 50000, "IU/mL")]],
  "L13 HCV RNA 2500000": [M, [T("HCV RNA", 2500000, "IU/mL")]],
  "L13b HCV Ag 30": [M, [T("HCV Core Antigen", 30, "fmol/L")]],
  "L14 ALT 150 + INR 1.8": [M, [T("ALT", 150, "U/L"), T("AST", 120, "U/L"), T("INR", 1.8, "")]],
  "L15 ALT 900 + PT 17 + Bili 6": [M, [T("ALT", 900, "U/L"), T("AST", 700, "U/L"), T("PT", 17, "sec"), T("Total Bilirubin", 6, "mg/dL"), T("Direct Bilirubin", 4, "mg/dL")]],
  "L16 ALP 400 GGT 25": [M, [T("ALP", 400, "U/L"), T("GGT", 25, "U/L")]],
  "L16b ALP 400 GGT 200": [M, [T("ALP", 400, "U/L"), T("GGT", 200, "U/L")]],
  "L16c ALP 400 تنها": [M, [T("ALP", 400, "U/L")]],
  "L17 ورزشکارِ ۲۲: AST 120 ALT 60 CK 2000": [{ age: 22, sex: "M" }, [T("AST", 120, "U/L"), T("ALT", 60, "U/L"), T("CK", 2000, "U/L")]],
  "L17b جوانِ ۲۲: AST 120 ALT 30 بی CK": [{ age: 22, sex: "M" }, [T("AST", 120, "U/L"), T("ALT", 30, "U/L")]],
  "L18 سالمندِ ۷۵ ALT 70": [{ age: 75, sex: "M" }, [T("ALT", 70, "U/L"), T("AST", 45, "U/L")]],
  "L19 بیلی 8 + آلبومین 2.6": [M, [T("Total Bilirubin", 8, "mg/dL"), T("Direct Bilirubin", 6, "mg/dL"), T("Albumin", 2.6, "g/dL")]],
  "L20 سرولوپلاسمین 12 mg/dL": [{ age: 20, sex: "M" }, [T("Ceruloplasmin", 12, "mg/dL")]],
  "L20b سرولوپلاسمین 12 + ALT 120": [{ age: 20, sex: "M" }, [T("Ceruloplasmin", 12, "mg/dL"), T("ALT", 120, "U/L")]],
  "L21 AFP 30 بزرگسال": [M, [T("AFP", 30, "ng/mL")]],
  "L22 LDH 600 + AST 900 ALT 800": [M, [T("LDH", 600, "U/L"), T("AST", 900, "U/L"), T("ALT", 800, "U/L")]],
  "L23 بیلی µmol/L 120": [M, [T("Total Bilirubin", 120, "µmol/L")]],
  "L24 زنِ باردار ALT 100": [{ age: 30, sex: "F", pregnant: true }, [T("ALT", 100, "U/L"), T("AST", 80, "U/L")]],
  "L25 کودک ۱۰ ALT 80": [{ age: 10, sex: "M" }, [T("ALT", 80, "U/L")]],
  "L26 INR 2.5 تنها": [M, [T("INR", 2.5, "")]],
  "L27 PT 16 تنها": [M, [T("PT", 16, "sec")]],
  "L28 بیلی ۳ (غیرمستقیم) تنها": [{ age: 25, sex: "M" }, [T("Total Bilirubin", 3, "mg/dL"), T("Direct Bilirubin", 0.3, "mg/dL")]],
  "L29 سیروز: AST 70 ALT 40 PLT 90 INR 1.5 ALB 2.7 Bili 3": [M, [T("AST", 70, "U/L"), T("ALT", 40, "U/L"), T("PLT", 90, "10^3/uL"), T("INR", 1.5, ""), T("Albumin", 2.7, "g/dL"), T("Total Bilirubin", 3, "mg/dL")]],
  "L30 GGT 90 تنها": [M, [T("GGT", 90, "U/L")]],
  "L31 Bile acids 25": [M, [T("Bile Acids", 25, "µmol/L")]],
  "L33 HCV Ag Reactive": [M, [T("HCV Ag", "Reactive", "")]],
  "L33b HCVcAg Reactive": [M, [T("HCVcAg", "Reactive", "")]],
  "L33c کنترلِ منفی: HCV Ag/Ab Combo Reactive": [M, [T("HCV Ag/Ab Combo", "Reactive", "")]],
  "L33d کنترلِ منفی: Anti-HCV Reactive تنها": [M, [T("Anti-HCV", "Reactive", "")]],
  "L34 Anti-HCV Reactive + HCV RNA": [M, [T("Anti-HCV", "Reactive", ""), T("HCV RNA", 2500000, "IU/mL")]],
  "L35 HBsAg Positive + HBV DNA": [M, [T("HBsAg", "Positive", ""), T("HBV DNA", 50000, "IU/mL")]],
  "L36 AST 120 ALT 30 + CK طبیعی": [{ age: 22, sex: "M" }, [T("AST", 120, "U/L"), T("ALT", 30, "U/L"), T("CK", 100, "U/L")]],
  "L37 AST 300 ALT 200 (≥ درجهٔ ۳؟) بی CK": [M, [T("AST", 300, "U/L"), T("ALT", 200, "U/L")]],
  "L38 سیروز با آلبومین 3.4 (غیرنشانه)": [M, [T("PLT", 90, "10^3/uL"), T("INR", 1.5, ""), T("Albumin", 3.4, "g/dL"), T("Total Bilirubin", 3, "mg/dL")]],
  "L32 AST 12000 ALT 9000 (شوک)": [M, [T("AST", 12000, "U/L"), T("ALT", 9000, "U/L")]],
};
for (const [label, [patient, tests]] of Object.entries(P)) {
  const e = runEngine({ patient, tests }); const p = runPatterns(e);
  console.log(`\n═══ ${label} ═══  urgency=${p.overall_urgency ?? p.urgency}`);
  for (const g of e.graded) console.log(`  [graded] ${g.test}=${g.value} ${g.range ?? ""} ab=${g.abnormal} ${g.dir ?? ""} ${g.tag ?? ""}`);
  const ug = Object.keys(e.ungraded ?? {}); if (ug.length) console.log("  ungraded:", JSON.stringify(e.ungraded).slice(0, 200));
  if ((e.unmapped ?? []).length) console.log("  unmapped:", JSON.stringify(e.unmapped).slice(0, 200));
  if ((e.noRef ?? []).length) console.log("  noRef:", JSON.stringify(e.noRef).slice(0, 200));
  if (Object.keys(e.qual ?? {}).length) console.log("  qual:", JSON.stringify(e.qual).slice(0, 200));
  for (const f of p.findings) console.log(`  {${f.rule_id ?? f.pattern} · ${f.urgency}} ${f.headline}\n      ${String(f.must_say)}
      suggest=${JSON.stringify(f.suggest ?? [])}`);
}
