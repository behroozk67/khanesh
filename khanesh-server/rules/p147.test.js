// P147 (۲۰۲۶-۱۱-۱۴، تصمیمِ کاربر): گزارشِ تستِ استرسِ «زنِ ۲۶ ساله — شعله‌وریِ لوپوس». هر آزمون روی HEAD ِ 1d60e31 قرمز بود،
//   مگر آنچه «قفل» نوشته شده.
import test from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";
import { buildEngineRecommendations } from "./prompt.js";

const T = (name, value, unit, reference) => ({ name, value, ...(unit ? { unit } : {}), ...(reference ? { reference } : {}) });
// اعداد از متنِ گزارش (برگهٔ اصلی در دست نبود؛ واحد/بازهٔ ستون‌های سرولوژی فرض‌اند)
const SLE = [
  T("Hb", "9.4", "g/dL"), T("WBC", "3.1", "x10^3/uL"), T("PLT", "98", "x10^3/uL"), T("MCV", "103.5", "fL"),
  T("Lymph", "16", "%"), T("Neut", "78", "%"),
  T("LDH", "490", "U/L"), T("Bilirubin Total", "2.4", "mg/dL"), T("Creatinine", "1.45", "mg/dL"), T("Albumin", "2.9", "g/dL"),
  T("ANA", "1:640"), T("Anti-dsDNA", "145.0", "IU/mL", "<25"), T("C3", "52", "mg/dL", "90-180"), T("C4", "7", "mg/dL", "10-40"),
  T("Anti-CCP", "3.2", "U/mL", "<20"),
  T("Protein", "3+"), T("RBC Casts", "2-3", "/LPF"), T("RBC", "25-30", "/HPF"), T("Specific Gravity", "1.015"), T("Nitrite", "Negative"),
];
const F26 = { age: 26, sex: "F" };
const run = (tests, patient = F26) => { const e = runEngine({ tests, patient }); const p = runPatterns(e); return { e, p, recs: buildEngineRecommendations(p, e) }; };
const byId = (p, id) => p.findings.find((f) => f.rule_id === id);
const ids = (p) => p.findings.map((f) => f.rule_id);
const swap = (rows, name, value) => rows.map((r) => (r.name === name ? { ...r, value } : r));

test("P147-1: پان‌سیتوپنی بی‌ردهٔ بحرانی ⇒ ۲۴–۴۸ ساعت و blocker نیست؛ با ردهٔ بحرانی (PLT < 20، ANC < 500، Hb < 7) همان اورژانس", () => {
  const { p } = run(SLE);
  const pan = byId(p, "pancytopenia");
  assert.equal(pan.urgency, "soon");
  assert.match(pan.action, /۲۴ تا ۴۸ ساعت/);
  assert.doesNotMatch(pan.must_say, /نیاز به بررسی فوری دارد/);
  assert.notEqual(p.overall_urgency, "emergency");
  assert.deepEqual(p.suppressed_ids, []);
  // هندآف: WBC و PLTِ خفیف یافتهٔ دوم نمی‌سازند (یک زمان‌بندی — N20)
  assert.ok(!ids(p).includes("leukopenia") && !ids(p).includes("thrombocytopenia"), ids(p).join());
  for (const [name, v] of [["PLT", "15"], ["Hb", "6.5"]]) {
    const c = run(swap(SLE, name, v)).p;
    assert.equal(byId(c, "pancytopenia").urgency, "emergency", `${name} ${v}`);
    assert.equal(c.overall_urgency, "emergency");
  }
  const anc = run([T("Hb", "9", "g/dL"), T("WBC", "2.5"), T("PLT", "80"), T("NEUT#", "0.3", "10^3/uL")], { age: 40, sex: "M" }).p;
  assert.equal(byId(anc, "pancytopenia").urgency, "emergency", "ANC 300");
  // قفل: WBC < 2 کنارِ پان‌سیتوپنیِ غیربحرانی هنوز leukopenia (اورژانسِ خودش) را دارد
  const w = run([T("Hb", "9", "g/dL"), T("WBC", "1.8"), T("PLT", "80")], { age: 40, sex: "M" }).p;
  assert.ok(ids(w).includes("leukopenia"), ids(w).join());
});

test("P147-2: زیرِ اورژانسِ دیگر (PLT 15) یافته‌های خودایمنی و GN کامل می‌مانند — anti-dsDNA 145 و C4 7 و ارجاع‌ها", () => {
  const { p, recs } = run(swap(SLE, "PLT", "15"));
  assert.equal(p.overall_urgency, "emergency");
  for (const id of ["ana_family_result", "complement_result", "glomerulonephritis_pattern", "lupus_activity_link"]) {
    const f = byId(p, id);
    assert.ok(f && !f.supplementary, `${id} فشرده یا پنهان شد: ${p.suppressed_ids}`);
  }
  assert.match(byId(p, "ana_family_result").must_say, /anti-dsDNA روی برگهٔ شما 145\.0/);
  assert.match(byId(p, "complement_result").must_say, /C4 روی برگهٔ شما 7/);
  assert.match(byId(p, "glomerulonephritis_pattern").must_say, /سیلندرِ گلبولِ قرمز/);
  const all = recs.join("\n");
  assert.match(all, /روماتولوژی/);
  assert.match(all, /نفرولوژی/);
  // دستورِ نهایی همان اورژانسِ فوری‌ترین است
  assert.doesNotMatch(recs[0], /این هفته/);
});

test("P147-3: GN با سیلندرِ گلبولِ قرمز و کراتینینِ بالا ⇒ ۲۴–۴۸ ساعت؛ کراتینینِ خفیف کنارِ GN «تکرار پس از چند هفته» نمی‌گوید", () => {
  const { p, recs } = run(SLE);
  const gn = byId(p, "glomerulonephritis_pattern");
  assert.equal(gn.urgency, "soon");
  assert.match(gn.action, /۲۴ تا ۴۸ ساعت/);
  const k = byId(p, "kidney");
  assert.match(k.must_say, /کراتینین شما 1\.45/);
  assert.doesNotMatch(k.must_say, /به‌تنهایی بیماری کلیه حساب نمی‌شود/);
  assert.ok(!recs.some((r) => /پس از چند هفته/.test(r)), recs.join("\n"));
  // قفل: بی‌سیلندر همان this_week
  const noCast = run(SLE.filter((t) => t.name !== "RBC Casts")).p;
  assert.equal(byId(noCast, "glomerulonephritis_pattern").urgency, "this_week");
});

test("P147-4: اتصالِ لوپوس — ANA + dsDNA/کمپلمان + کلیه یا افتِ رده‌ها؛ نه ANAِ تنها، نه کم‌خونیِ میکروسیتیک", () => {
  const { p, recs } = run(SLE);
  const f = byId(p, "lupus_activity_link");
  assert.ok(f, ids(p).join());
  assert.match(f.must_say, /این تشخیص نیست/);
  assert.equal(f.urgency, "this_week");
  for (const s of ["تست کومبس", "نسبت پروتئین به کراتینین ادرار", "بررسی توسط متخصص روماتولوژی"]) assert.ok(f.suggest.includes(s), s);
  assert.ok(recs.some((r) => /کومبس/.test(r)), recs.join("\n"));
  const anaOnly = run([T("ANA", "1:640"), T("Hb", "13", "g/dL")]).p;
  assert.ok(!byId(anaOnly, "lupus_activity_link"), ids(anaOnly).join());
  const ida = run([T("ANA", "1:320"), T("C3", "60", "mg/dL", "90-180"), T("Hb", "9.5", "g/dL"), T("MCV", "68", "fL"), T("Ferritin", "5", "ng/mL")]).p;
  assert.ok(!byId(ida, "lupus_activity_link"), ids(ida).join());
});

test("P147-5a: LDHِ بی‌بازه با سقفِ کیت‌های DGKCِ ایران (۴۷۰)؛ بازهٔ چاپ‌شده همچنان تصمیم می‌گیرد", () => {
  const g = (rows, patient = { age: 45, sex: "M" }) => runEngine({ tests: rows, patient }).graded.find((x) => x.test === "LDH");
  assert.equal(g([T("LDH", "300", "U/L")]).abnormal, false);
  assert.equal(g([T("LDH", "480", "U/L")]).dir, "high");
  assert.equal(g([T("LDH", "180", "U/L")]).abnormal, false);
  // قفل (P114): بازهٔ چاپ‌شدهٔ IFCC روی همان ردیف ⇒ ۳۰۰ بالاست
  assert.equal(g([T("LDH", "300", "U/L", "125-243")]).dir, "high");
});

test("P147-5b: کم‌خونیِ احتمالاً همولیتیک — Hbِ پایین + LDHِ بالا + نشانهٔ پشتیبان؛ یک مالکِ LDH", () => {
  const { p } = run(SLE);
  const h = byId(p, "hemolytic_anemia_possible");
  assert.ok(h, ids(p).join());
  assert.match(h.must_say, /هموگلوبین 9\.4/);
  assert.match(h.must_say, /LDH‏? ?490/);
  assert.match(h.must_say, /بیلی‌روبینِ مستقیم روی این برگه نیست/);
  assert.match(h.must_say, /همیشه از کمبودِ ویتامین B12 یا فولات نیست/);
  for (const s of ["رتیکولوسیت", "هاپتوگلوبین", "تست کومبس"]) assert.ok(h.suggest.includes(s), s);
  assert.ok(!ids(p).includes("isolated_ldh_elevation"), "دو مالک برای LDH");
  // Hbِ طبیعی ⇒ نه
  assert.ok(!byId(run(swap(SLE, "Hb", "13")).p, "hemolytic_anemia_possible"));
  // همولیزِ ثابت‌شده (هاپتوگلوبینِ پایین + رتیکولوسیت) ⇒ فقط hemolysis_pattern
  const hp = run([T("Hb", "9", "g/dL"), T("MCV", "90"), T("LDH", "800", "U/L"), T("Haptoglobin", "10"), T("Retic", "8")]).p;
  assert.ok(ids(hp).includes("hemolysis_pattern") && !ids(hp).includes("hemolytic_anemia_possible"), ids(hp).join());
  // LDHِ بالا با Hbِ پایین ولی بی‌نشانهٔ پشتیبان ⇒ همان isolated_ldh_elevation
  const bare = run([T("Hb", "9.5", "g/dL"), T("MCV", "88", "fL"), T("LDH", "800", "U/L")]).p;
  assert.ok(ids(bare).includes("isolated_ldh_elevation") && !ids(bare).includes("hemolytic_anemia_possible"), ids(bare).join());
});

test("P147-6: متنِ MDS زیرِ ۵۰ سال نمی‌آید؛ ۵۵ سالگی همان", () => {
  assert.ok(!ids(run(SLE).p).includes("anemia_macrocytic_mds"));
  const mds = (age) => ids(run([T("Hb", "8", "g/dL"), T("MCV", "108", "fL"), T("PLT", "60", "10^3/uL")], { age, sex: "M" }).p);
  assert.ok(mds(55).includes("anemia_macrocytic_mds"));
  assert.ok(!mds(30).includes("anemia_macrocytic_mds"));
});

test("P147-7: آلبومینِ پایینِ ناشی از نفروتیک «بیماری مزمن کبد» نمی‌سازد؛ عددها بی‌صاحب نمی‌مانند", () => {
  const { p } = run(SLE);
  assert.ok(!ids(p).includes("cirrhosis_pattern"), ids(p).join());
  assert.ok(!ids(p).includes("unexplained_abnormal") && !ids(p).includes("unmatched_abnormal"), ids(p).join());
  const text = p.findings.map((f) => f.must_say).join(" ");
  for (const n of ["2.9", "2.4", "1.45", "490", "103.5"]) assert.ok(text.includes(n), `${n} در متن نیست`);
  // قفل: همان سه نشانه بی‌پروتئینوری ⇒ سیروز
  const liv = run([T("Albumin", "2.9", "g/dL"), T("PLT", "98"), T("Bilirubin Total", "2.4", "mg/dL")], { age: 50, sex: "M" }).p;
  assert.ok(ids(liv).includes("cirrhosis_pattern"), ids(liv).join());
});

test("P147-8: سطرِ خالیِ «این آزمایش‌ها را بخواهید.» در توصیه‌ها نیست", () => {
  for (const rows of [SLE, swap(SLE, "PLT", "15")]) {
    const { recs } = run(rows);
    assert.ok(!recs.some((r) => /^این آزمایش‌ها را بخواهید\.?$/.test(r.trim())), recs.join("\n"));
  }
});
