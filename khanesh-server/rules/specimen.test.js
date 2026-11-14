// ============================================================
// specimen.test.js — specs/014 (مرحلهٔ الف، P87): ادرارِ ۲۴ساعته و مایعاتِ بدن «شناخته» می‌شوند، تفسیر نه.
// فایلِ جدا تا با engine.test.js تداخل نکند. فقط سن/جنس/عدد — هیچ شناسهٔ بیمار.
// 🔴 روی درختِ پیش از تغییر (8e0d769 + wt) قرمز (اندازه‌گیری‌شده): U01–U05، U07، U08، U11، U13 و T54–T56 در api-contract.
//    سبزِ پیشین، عمداً: U06 (کنترلِ منفی)، U09، U10، U12، U14 (فریز).
// ============================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";

const row = (name, value, unit = "") => ({ name, value, unit });
const run = (tests, patient = { sex: "F", age: 40 }) => {
  const e = runEngine({ patient, tests });
  return { e, p: runPatterns(e) };
};
const sp = (e) => e.specimen ?? { u24: [], fluid: [], bareServingFluidNames: [] };
const ids = (arr) => arr.map((r) => r.id);
const serumKeys = (e) => [...e.graded.map((g) => g.test), ...Object.keys(e.ungraded ?? {}), ...Object.keys(e.qual ?? {}), ...(e.noRef ?? [])];
const lineOf = async (e) => (await import("./prompt.js")).specimenLine?.(sp(e)) ?? null;

const REQ27 = [row("Urine Volume/24h", "1700"), row("Urine Prot/24h", "153"), row("Urine Cr/24h", "700")];
const REQ28 = [row("Fluid Type", "4"), row("Fluid Glucose", "122"), row("Fluid Protein", "5.5"), row("Fluid LDH", "306"),
  row("Total Protein", "6.6"), row("LDH", "367")];

test("U01 — درخواستِ ۲۷: سه ردیفِ ادرارِ ۲۴ساعته شناخته می‌شوند، بی‌یافته و بی‌فوریت (N2/N28)", () => {
  const { e, p } = run(REQ27, { sex: "F", age: 25 });
  assert.deepEqual(ids(sp(e).u24), ["U24_VOL", "U24_PROT", "U24_CREAT"]);
  assert.deepEqual(e.unmapped, []);
  assert.equal(p.findings.length, 0);
  assert.equal(p.overall_urgency, "none");
});

test("U02 — درخواستِ ۲۸: سه ردیفِ مایع + نوعِ کدِ ۴ (نامعلوم)؛ LDHِ سرم فقط ۳۶۷", () => {
  const { e } = run(REQ28, { sex: "F", age: 46 });
  const f = sp(e).fluid;
  assert.deepEqual(ids(f), ["FL_TYPE", "FL_GLU", "FL_PROT", "FL_LDH"]);
  assert.deepEqual(f[0].fluid, { type: "unknown", code: "4" });
  assert.ok(f.slice(1).every((r) => r.fluid?.type === "unknown" && r.fluid.code === "4"), JSON.stringify(f));
  const ldh = e.graded.filter((g) => g.test === "LDH");
  assert.equal(ldh.length, 1);
  assert.equal(ldh[0].value, 367);
  assert.deepEqual(e.unmapped, []);
});

test("U03 — املاهای تک‌ردیفی به هویت و نوعِ درست می‌روند", () => {
  const cases = [
    ["Pleural LDH", "FL_LDH", "pleural"], ["Ascitic Glucose", "FL_GLU", "ascites"], ["Body Fluid LDH", "FL_LDH", null],
    ["Glucose (CSF)", "FL_GLU", "csf"], ["Total Protein (Fluid)", "FL_PROT", null], ["Synovial Glucose", "FL_GLU", "synovial"],
    ["Pericardial Fluid Protein", "FL_PROT", "pericardial"], ["CSF Protein", "FL_PROT", "csf"],
    ["Creatinine 24h", "U24_CREAT", null], ["Uric Acid 24h", "U24_URIC", null], ["24 hr urine protein", "U24_PROT", null],
    ["Urine Urea/24h", "U24_UREA", null], ["Urine Uric Acid/24h", "U24_URIC", null], ["پروتئین ادرار ۲۴ساعته", "U24_PROT", null],
  ];
  for (const [n, id, type] of cases) {
    const { e } = run([row(n, "100")]);
    const all = [...sp(e).u24, ...sp(e).fluid];
    assert.equal(all.length, 1, `${n}: ${JSON.stringify(sp(e))} | unmapped ${e.unmapped}`);
    assert.equal(all[0].id, id, n);
    if (id.startsWith("FL_")) assert.equal(all[0].fluid?.type ?? null, type, n);
    assert.ok(!e.unmapped.includes(n) && serumKeys(e).length === 0, `${n} به کلیدِ دیگری هم رسید: ${serumKeys(e)}`);
  }
});

test("U04 — «Pleural LDH 306» هرگز LDHِ سرم نیست (N25)", () => {
  const { e } = run([row("Pleural LDH", "306"), row("LDH", "367")]);
  assert.deepEqual(e.graded.filter((g) => g.test === "LDH").map((g) => g.value), [367]);
  assert.equal(sp(e).fluid[0]?.raw, "306");
});

test("U05 — «Urine Protein 153» کنارِ حجمِ ۲۴ساعته پروتئینِ ۲۴ساعته است، نه نوار (N25)", () => {
  const { e, p } = run([row("Urine Protein", "153"), row("Urine Volume/24h", "1700")]);
  const pr = sp(e).u24.find((r) => r.id === "U24_PROT");
  assert.equal(pr?.claimed_by, "evidence");
  assert.ok(!Object.keys(e.qual ?? {}).some((k) => /protein/.test(k)), JSON.stringify(e.qual));
  assert.equal(p.findings.length, 0);
});

test("U06 — کنترل: «Urine Protein +1» بی‌شاهد همان ردیفِ نوار می‌ماند", () => {
  const { e } = run([row("Urine Protein", "+1")]);
  assert.ok(Object.keys(e.qual ?? {}).length === 1);
  assert.equal(sp(e).u24.length, 0);
});

// ⚠️ بازتنظیمِ عمدی (P87 تصمیمِ ۸، ۲۰۲۶-۱۰-۰۶): پیش‌تر «Urine Ca/24h» هویتِ جدای U24_CA داشت (R3). حالا همان U_CA است.
//    بی‌واحد ⇒ مثلِ «24h urine calcium»ِ بی‌واحد: unit_unknown، بی‌حکمِ «بالا» (P48).
test("U07 — «Urine Ca/24h 320»ِ بی‌واحد همان U_CA است و مثلِ املای قدیمی سنجیده نمی‌شود (unit_unknown)", () => {
  const { e, p } = run([row("Urine Ca/24h", "320")], { sex: "M", age: 40 });
  assert.deepEqual(ids(sp(e).u24), []);
  assert.equal(e.ungraded?.U_CA?.reason, "unit_unknown");
  assert.ok(!p.findings.some((f) => f.rule_id === "urine_calcium_abnormal"));
});

test("U08 — دو مقدارِ ناهم‌خوان برای یک هویت: اولی می‌ماند، دومی «تفسیر نشدند»", () => {
  const { e } = run([row("Urine Prot/24h", "153"), row("24h Urine Protein", "150")]);
  assert.deepEqual(sp(e).u24.map((r) => r.raw), ["153"]);
  assert.deepEqual(e.unmapped, ["24h Urine Protein"]);
});

// ── فریزها (سبزِ پیشین، عمداً): هش‌ها روی درختِ پیش از specs/014 گرفته شدند (T002) ──
const fp = (patient, tests) => {
  const e = runEngine({ patient, tests });
  const p = runPatterns(e);
  const { specimen, ...rest } = e;
  return createHash("sha256").update(JSON.stringify({ e: rest, p })).digest("hex").slice(0, 16);
};
const FREEZE = {
  // بازپایهٔ عمدی (P96، ۲۰۲۶-۱۰-۰۶، تصمیمِ بازبین): lis_serum (Ca بی‌واحدِ ۹٫۱ ⇒ فقط mg/dL ⇒ سنجیده، دیگر «واحد نامعلوم» نمی‌گیرد؛ Mg و P هنوز نامعلوم) و neonate
  //   (بیلی‌روبینِ ۱۲ برای نوزادِ زیرِ یک ماه ⇒ فقط mg/dL ⇒ با بازهٔ نوزادی سنجیده می‌شود). ۹ پنلِ دیگر بایت‌به‌بایت همان‌اند (اثبات: اسکریپتِ مقایسهٔ هش).
  //   هش‌های قبلی: lis_serum 48f0eca26cde3f82، neonate b2f1145f953500bd.
  // بازپایهٔ عمدی (P147-۵، fdiff147): fluid_bare — LDH 306ِ بی‌بازه با سقفِ ۴۷۰ طبیعی است ⇒ isolated_ldh_elevation حذف شد، چیزِ دیگری نه (قبلی 8531fb546310bbb6).
  // بازپایهٔ عمدی (P147-۵، fdiff147): سقفِ پیش‌فرضِ LDH ۴۷۰ ⇒ ۲×ULN = ۹۴۰ ⇒ lis_ldh (۸۶۴، بی‌بازه) دوباره routine؛ فقط urgency، action و
  //   overall عوض شد. قبلی cb6e1b255fd08014.
  // بازپایهٔ عمدی (P96، بند ۳): lis_ldh (LDH ۸۶۴ ≥ ۲×ULN ⇒ this_week). اثبات: diff کاملِ خروجی روی درختِ پیش از P96 فقط سه مسیر را عوض می‌کند:
  //   findings[0].urgency (routine ⇒ this_week)، findings[0].action، findings[0].raisedByP96 (پرچمِ تازه)، overall_urgency. هش‌های قبلی lis_ldh: 23dec6ae7a15b4c3.
  // بازپایهٔ عمدی (باگِ ۴، LIS ۲۰۲۶-۱۰-۰۵): در thyroid، lis_ldh، lis_serum، fluid_bare و neonate فقط فیلدِ brief/brief_warnings ِ
  // unit_unknown_values عوض شد (عددِ برگه در نسخهٔ کوتاه)؛ خروجی بدونِ این دو فیلد در هر ۱۱ پنل بایت‌به‌بایت همان است (stash).
  // هش‌های قبلی: 0c3a87d251beba49، b4aca598b9885e65، e5639cb63a569a3d، fbc60061d1a28af4، 3c0fe6147ac78fa5.
  cbc_ida: [{ sex: "F", age: 30 }, [row("Hb", "9.5", "g/dL"), row("MCV", "70", "fL"), row("Ferritin", "6", "ng/mL"), row("WBC", "6.1"), row("PLT", "250")], "5aea52ee4a5253ff"],
  // بازپایهٔ عمدی (P108، ۲۰۲۶-۱۰-۱۶): فقط رشتهٔ بازهٔ کراتینینِ مرد «0.6–1.2» ⇒ «0.6–1.3» (diffِ کامل). قبلی a25b0d7b6c56186a.
  // بازپایهٔ عمدی (۲۰۲۶-۱۰-۱۶، حذفِ محاسبهٔ eGFR): همین پنل کراتینین دارد؛ indices دیگر egfr ندارد (فقط bun_cr می‌ماند)
  //   و متنِ کلیه هیچ اشاره‌ای به «کار کلیه» نمی‌کند. درجه‌بندی و یافته‌ها دست‌نخورده (CREAT 1.0 طبیعی، بی‌یافته).
  //   قبلی 204e0d93ecb7bb4b. اثباتِ عمدی‌بودن: احیای محاسبهٔ eGFR در adapter همان هش را برمی‌گرداند.
  bmp: [{ sex: "M", age: 55 }, [row("Na", "138"), row("K", "4.2"), row("Creatinine", "1.0", "mg/dL"), row("Urea", "30", "mg/dL"), row("FBS", "95", "mg/dL")], "18391a0a8f5e6980"],
  lipid_dm: [{ sex: "M", age: 50 }, [row("Cholesterol", "210", "mg/dL"), row("LDL", "114", "mg/dL"), row("HDL", "38", "mg/dL"), row("TG", "240", "mg/dL"), row("FBS", "209", "mg/dL")], "d650a6979b47a0fb"],   // بازپایهٔ عمدی P110 (۲۰۲۶-۱۰-۱۶): یک جملهٔ ناشتا به‌جای دو (diffِ کامل فقط همین). قبلی 7daeb3138c9d7c90.   // بازپایهٔ عمدی ۲۰۲۶-۱۰-۰۷: فقط headline/must_sayِ diabetes_range (FBS 209). اثبات: برگرداندنِ همان دو hunk در یک کپی ⇒ 2065fd25af68fbf4.
  // بازپایهٔ عمدی (باگِ ۶): فقط پیشوندِ عددیِ تازهٔ liver_pattern؛ بی‌آن همان 3547cf8469405703.
  liver: [{ sex: "F", age: 45 }, [row("AST", "120"), row("ALT", "150"), row("ALP", "200"), row("Total Bilirubin", "2.1", "mg/dL")], "ce23476c8506c7b2"], // P108-ج (عمدی): فقط جملهٔ «تک‌نوبت» در must_sayِ liver_pattern (diff کامل ۲۰۲۶-۱۰-۱۶)
  thyroid: [{ sex: "F", age: 35 }, [row("TSH", "8.2"), row("FT4", "0.9")], "65124dcbce4bc75f"], /* P144 US6 عمدی: فقط رشتهٔ بازهٔ TSH (۰٫۵ ⇒ ۰٫۴)؛ قبلی 5fa44e1713a9ec1d */
  urinalysis: [{ sex: "F", age: 28 }, [row("Urine Protein", "+1"), row("Nitrite", "Positive"), row("WBC", "10-12", "/hpf"), row("RBC", "2-3", "/hpf")], "3f28e6213d7b156b"],
  coag: [{ sex: "M", age: 60 }, [row("PT", "19"), row("PTT", "42"), row("PT INR", "1.7")], "a706a5fd28501c0e"] /* specs/022 P134-G5 عمدی؛ با خاموش‌کردنِ coagPlainClause همان 6583cf22c1f12265 */,
  lis_ldh: [{ sex: "F", age: 32 }, [row("AST", "35"), row("ALT", "26"), row("LDH", "864"), row("T. Bilirubin(Clot)", "0.41"), row("Direct Bili.", "0.1")], "98b111f56e7fad18"],
  lis_serum: [{ sex: "F", age: 40 }, [row("Serum Ca", "9.1"), row("serum Mg", "2"), row("serum p", "4"), row("Serum Protein", "7")], "9159183844ddacfe"],
  fluid_bare: [{ sex: "F", age: 46 }, [row("Glucose", "122"), row("LDH", "306"), row("Total Protein", "6.6")], "2b856aad0ac0e6c6"],
  // بازپایهٔ عمدی (P104، ۲۰۲۶-۱۰-۱۳): بیلی‌روبینِ ۱۲ِ نوزادِ < ۱۴ روز دیگر «طبیعی» graded نیست ⇒ ungraded (neonatal_hour_chart) +
  //   یافتهٔ neonatal_bilirubin_hour_chart (soon). اثبات: با غیرفعال‌کردنِ همان شاخه در adapter همان 3f4ef5adc6e6c72b ِ قبلی به دست آمد
  //   و diff ِ خروجیِ کامل فقط همین دو تغییر بود.
  neonate: [{ sex: "M", age: 0.01 }, [row("Hb", "15"), row("T. Bilirubin(Clot)", "12")], "84e97feae0e6c96e"],
};

test("U09 — فریزِ محورِ معدنی: «24h urine calcium» همچنان U_CA است و خروجی بایت‌به‌بایت همان (FR-014، سبزِ پیشین)", () => {
  // ⚠️ بازتنظیمِ عمدی (P87 تصمیمِ ۸): بازهٔ زنِ بزرگسال ۱۰۰–۳۰۰ ⇒ ۱۰۰–۲۰۰ (Mayo). اثبات: با برگرداندنِ «100–200»/«[100,200]»/برچسبِ منبع
  //    به مقدارِ قبلی در خروجیِ تازه، همان be0e71dfa982ff58 به دست آمد — هیچ تفاوتِ دیگری نیست.
  assert.equal(fp({ sex: "F", age: 60 }, [row("24h urine calcium", "320", "mg/24h"), row("Ca", "11.2", "mg/dL"), row("PTH", "90", "pg/mL")]), "a8c2962e9fdc2bf7");
  assert.equal(fp({ sex: "F", age: 40 }, [row("24h urine calcium", "50", "mg/24h"), row("Ca", "10.9", "mg/dL"), row("PTH", "70", "pg/mL")]), "e729c854fcb559f6");   // همان اثباتِ بالا: برگرداندنِ بازه ⇒ 375f5043d967356d
  assert.equal(sp(run([row("24h urine calcium", "320", "mg/24h")]).e).u24.length, 0);
});

test("U10 — فریز: پنل‌های بی‌ردیفِ ۲۴ساعته/مایع بایت‌به‌بایت همان‌اند (FR-004، سبزِ پیشین)", () => {
  for (const [k, [pt, ts, h]] of Object.entries(FREEZE)) assert.equal(fp(pt, ts), h, k);
});

test("U11 — متنِ خطِ «شناخته شد» دقیقاً همان قرارداد است؛ بی‌کلیدِ خام و بی‌حکم (N8، SC-006)", async () => {
  const l27 = await lineOf(run(REQ27, { sex: "F", age: 25 }).e);
  assert.equal(l27, "این مقادیر شناخته شدند، ولی موتور هنوز تفسیرشان نمی‌کند (قواعدشان در انتظارِ بازبینیِ پزشک است) — " +
    "ادرار ۲۴ساعته: حجم ادرار ۲۴ساعته 1700؛ پروتئین ادرار ۲۴ساعته 153؛ کراتینین ادرار ۲۴ساعته 700. " +
    "دربارهٔ این مقادیر حکمی نمی‌دهیم؛ حتماً با پزشک بررسی کنید.");
  const l28 = await lineOf(run(REQ28, { sex: "F", age: 46 }).e);
  assert.equal(l28, "این مقادیر شناخته شدند، ولی موتور هنوز تفسیرشان نمی‌کند (قواعدشان در انتظارِ بازبینیِ پزشک است) — " +
    "مایع بدن (نوع: کدِ «4»، نامعلوم): قند مایع 122؛ پروتئین مایع 5.5؛ LDH مایع 306. " +
    "دربارهٔ این مقادیر حکمی نمی‌دهیم؛ حتماً با پزشک بررسی کنید.");
  const withUnit = await lineOf(run([row("Pleural LDH", "306", "U/L"), row("Urine Prot/24h", "153", "mg/24h")]).e);
  assert.match(withUnit, /پروتئین ادرار ۲۴ساعته 153 mg\/24h/);
  assert.match(withUnit, /مایع بدن \(نوع: مایع پلور\): LDH مایع 306 U\/L/);
  assert.ok(withUnit.indexOf("ادرار ۲۴ساعته") < withUnit.indexOf("مایع بدن"), "گروهِ ۲۴ساعته اول");
  assert.match(await lineOf(run([row("Body Fluid LDH", "306")]).e), /مایع بدن \(نوعِ مایع روی برگه نیامده\)/);
  for (const l of [l27, l28, withUnit]) {
    assert.doesNotMatch(l, /U24_|FL_|بالا|پایین|طبیعی است|نرمال|امروز|این هفته|اورژانس/);
  }
  assert.equal(await lineOf(run([row("Hb", "13", "g/dL")]).e), null);
});

test("U12 — «CSF Glucose 30» در مرحلهٔ الف هیچ یافته و فوریتی نمی‌سازد (سبزِ پیشین)", () => {
  const a = run([row("CSF Glucose", "30"), row("FBS", "100")], { sex: "M", age: 40 }).p;
  const b = run([row("FBS", "100")], { sex: "M", age: 40 }).p;
  assert.deepEqual(a.findings.map((f) => f.rule_id), b.findings.map((f) => f.rule_id));
  assert.equal(a.overall_urgency, b.overall_urgency);
  assert.doesNotMatch(JSON.stringify(a.findings), /CSF|مغزی/);
});

test("U13 — «Fluid Type» کنارِ Glucose/LDHِ برهنه: دوباره‌نسبت داده نمی‌شوند، ولی احتیاط نامشان را می‌برد (R6)", async () => {
  const { e } = run([row("Fluid Type", "4"), row("Glucose", "122"), row("LDH", "306")]);
  assert.ok(serumKeys(e).includes("GLU_F") && serumKeys(e).includes("LDH"));
  assert.deepEqual(sp(e).bareServingFluidNames, ["Glucose", "LDH"]);
  const l = await lineOf(e);
  assert.match(l, /ردیف‌های «Glucose»، «LDH» بی‌نامِ نمونه چاپ شده‌اند و موتور آن‌ها را مقدارِ خون فرض کرده است./);
});

test("U14 — فقط patterns_specimen.js کانالِ specimen را می‌خواند (مرحلهٔ ب، دامنهٔ بند ۱۴)", () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const hits = readdirSync(dir).filter((f) => /^patterns.*\.js$/.test(f))
    .filter((f) => /specimen/i.test(readFileSync(join(dir, f), "utf8")));
  // مرحلهٔ ب (P87 بند ۱۴): تنها خواننده patterns_specimen.js است (قندِ CSF/پلور)؛ هر فایلِ دیگر هنوز ممنوع است.
  assert.deepEqual(hits.sort(), ["patterns.js", "patterns_specimen.js"]);   // patterns.js = فقط importِ aggregator
});

// ── بازبینیِ کد (۲۰۲۶-۱۰-۰۵): سه نقص در نسخهٔ اولِ specs/014 — U15، U16، U18 اینجا و T57 در api-contract (mergePages سرور را بالا می‌آورد؛ این فایل نباید server.js را import کند) (اندازه‌گیری‌شده با برگرداندنِ موقتِ تغییر) ──
test("U15 — «Urine Protein 3+»ِ نوار کنارِ ردیفِ ۲۴ساعته همچنان نوار است؛ پروتئینوری/نفروتیک گم نمی‌شود (HIGH #1، N18)", () => {
  const a = run([row("Urine Protein", "3+"), row("24h Urine Volume", "1500", "mL")]);
  assert.ok(a.p.findings.some((f) => f.rule_id === "proteinuria_pattern"), a.p.findings.map((f) => f.rule_id).join(","));
  assert.ok(!sp(a.e).u24.some((r) => r.id === "U24_PROT"), "درجهٔ نوار پروتئینِ ۲۴ساعته خوانده شد");
  // «Calcium 24h urine» همان U_CA است (mapKey) — شاهدِ ۲۴ساعت نیست.
  const b = run([row("Urine Protein", "3+"), row("Albumin", "2.2", "g/dL"), row("Calcium 24h urine", "200", "mg/24h")]);
  assert.ok(b.p.findings.some((f) => f.rule_id === "nephrotic_pattern"), b.p.findings.map((f) => f.rule_id).join(","));
});

test("U16 — شاهدِ ۲۴ساعت فقط روی همان صفحه: «Urine Protein 153»ِ صفحهٔ دیگر ادعا نمی‌شود", () => {
  const { e } = run([{ ...row("Urine Prot/24h", "153"), _page: 1 }, { ...row("Urine Protein", "30"), _page: 0 }]);
  assert.deepEqual(sp(e).u24.map((r) => r.name), ["Urine Prot/24h"]);
  // ردیفِ صفحهٔ ۰ همان ردیفِ نوار می‌ماند — نه ادعا، نه «تکراریِ ناهم‌خوان» در unmapped (نسخهٔ اول اینجا گمش می‌کرد).
  assert.deepEqual(e.unmapped, []);
  assert.equal(e.qual?.["Urine Protein"], "30");
  const same = run([{ ...row("Urine Prot/24h", "153"), _page: 1 }, { ...row("Urine Creatinine", "700"), _page: 1 }]).e;
  assert.deepEqual(ids(sp(same).u24), ["U24_PROT", "U24_CREAT"]);
});

test("U18 — احتیاطِ R6 هیچ دستورِ فوری را لغو نمی‌کند: کنارِ «Glucose 30» اورژانس می‌ماند و «نادیده بگیرید» نمی‌آید (HIGH #2، N20)", async () => {
  const { e, p } = run([row("Fluid Type", "Pleural"), row("Glucose", "30", "mg/dL"), row("LDH", "900", "U/L")]);
  assert.equal(p.overall_urgency, "emergency");
  const l = await lineOf(e);
  assert.match(l, /تا آن موقع هر توصیهٔ فوری در همین گزارش معتبر است/);
  assert.doesNotMatch(l, /نادیده/);
});

test("U19 — املاهای جاافتادهٔ بازبینی («Glucose, CSF»، «Pleural Fluid Protein (Total)»، «Microalbumin 24h») شناخته می‌شوند؛ «Fluid Type: Serum» «مایع دیگر» نیست (LOW)", async () => {
  const cases = [
    ["Glucose, CSF", "FL_GLU", "csf"], ["Protein, CSF", "FL_PROT", "csf"], ["LDH, Pleural", "FL_LDH", "pleural"],
    ["Pleural Fluid Protein (Total)", "FL_PROT", "pleural"],
    ["Microalbumin 24h", "U24_ALB", null], ["Urine Albumin/24h", "U24_ALB", null], ["24h Urine Microalbumin", "U24_ALB", null],
  ];
  for (const [n, id, type] of cases) {
    const { e, p } = run([row(n, "250")]);
    const all = [...sp(e).u24, ...sp(e).fluid];
    assert.deepEqual(ids(all), [id], n);
    if (type) assert.equal(all[0].fluid?.type, type, n);
    assert.deepEqual(e.unmapped, [], n);
    assert.deepEqual(serumKeys(e), [], `${n}: هیچ کلیدِ سرمی (ALB/ACR/GLU/LDH) ساخته نشود`);
    assert.equal(p.findings.length, 0, n);
  }
  const { e } = run([row("Fluid Type", "Serum"), row("Fluid LDH", "300")]);
  const line = await lineOf(e);
  assert.ok(line.includes("«Serum»"), line);
  assert.ok(!line.includes("مایع دیگر"), line);
  const { e: e2 } = run([row("Microalbumin 24h", "250", "mg/24h")]);
  assert.ok((await lineOf(e2)).includes("آلبومین ادرار ۲۴ساعته (میکروآلبومین) 250 mg/24h"));
});

// ── مرحلهٔ ب (P87 بند ۱۴، تصمیمِ کاربر ۲۰۲۶-۱۰-۰۵): قندِ CSF (emergency) و پلور (soon) ──
const csf = (v, u = "mg/dL", extra = [], age = 40) => run([row("CSF Glucose", v, u), ...extra], { sex: "F", age });
const fired = (p) => p.findings.map((f) => `${f.rule_id}:${f.urgency}`);

test("V01 — قندِ CSF زیرِ ۴۰ mg/dL ⇒ emergency با دستورِ «اطلاع به پزشکِ معالج»، نه جملهٔ اورژانسِ سرپایی (FL-C1، N20)", () => {
  const { p, e } = csf("30");
  assert.ok(fired(p).includes("csf_glucose_low:emergency"), fired(p).join());
  const f = p.findings.find((x) => x.rule_id === "csf_glucose_low");
  assert.match(f.action, /پزشکِ معالج یا پرستارِ بخش اطلاع دهید/);
  assert.ok(f.must_say.includes("30 mg/dL"), f.must_say);
  assert.match(f.must_say, /قندِ خون روی همین برگه نیست/);          // N4: بی‌قندِ خون ⇒ نسبت حساب نشد
  assert.doesNotMatch(f.must_say, /نسبتِ? [^.]*طبیعی/);
  assert.equal(p.has_critical ?? e.has_critical ?? true, true);
});

test("V02 — N3: قندِ ۳٫۵ mmol/L طبیعی است و emergency نمی‌شود؛ ۱٫۵ mmol/L همان ۲۷ mg/dL است و می‌شود", () => {
  assert.deepEqual(fired(csf("3.5", "mmol/L").p).filter((x) => /csf_/.test(x)), []);
  assert.ok(fired(csf("1.5", "mmol/L").p).includes("csf_glucose_low:emergency"));
});

test("V03 — بی‌واحد: ۱٫۵ پایین در هر دو خوانش ⇒ emergency؛ ۳۰ مبهم و ۴۵ بالا ⇒ نمره نمی‌گیرند (P48)", () => {
  assert.ok(fired(csf("1.5", "").p).includes("csf_glucose_low:emergency"));
  for (const v of ["30", "45", "3.5"]) assert.deepEqual(fired(csf(v, "").p).filter((x) => /csf_/.test(x)), [], v);
});

test("V04 — نسبتِ CSF/سرم < ۰٫۴ با قندِ خونِ همین برگه ⇒ emergency حتی وقتی خودِ عدد ≥ ۴۰ است؛ نسبتِ ≥ ۰٫۴ بی‌«طبیعی»", () => {
  const bad = csf("45", "mg/dL", [row("FBS", "160", "mg/dL")]).p;
  const f = bad.findings.find((x) => x.rule_id === "csf_glucose_low");
  assert.ok(f, fired(bad).join());
  assert.match(f.headline, /نسبتِ قندِ/);
  assert.ok(f.must_say.includes("0.28 است که کمتر از ۰٫۴ است"), f.must_say);
  const ok = csf("35", "mg/dL", [row("FBS", "60", "mg/dL")]).p.findings.find((x) => x.rule_id === "csf_glucose_low");
  assert.match(ok.must_say, /می‌تواند از پایین‌بودنِ قندِ خون باشد/);
  assert.doesNotMatch(ok.must_say, /طبیعی/);
});

test("V05 — قندِ پلور < ۴۰ ⇒ soon با فهرستِ علت‌ها؛ آسیت و کدِ عددیِ نوعِ مایع نمره نمی‌گیرند (F0)", () => {
  const f = run([row("Pleural Glucose", "30", "mg/dL")]).p.findings.find((x) => x.rule_id === "pleural_glucose_low");
  assert.equal(f.urgency, "soon");
  assert.match(f.must_say, /سل/); assert.match(f.must_say, /روماتوئید/); assert.match(f.must_say, /تشخیص نیست/);
  for (const rows of [[row("Ascitic Glucose", "30", "mg/dL")], [row("Fluid Type", "4"), row("Fluid Glucose", "20", "mg/dL")]])
    assert.deepEqual(fired(run(rows).p).filter((x) => /_glucose_low/.test(x)), []);
});

test("V06 — شیرخوار (< ۱ سال) آستانهٔ بزرگسال نمی‌گیرد؛ سن نامعلوم می‌گیرد", () => {
  assert.deepEqual(fired(csf("30", "mg/dL", [], 0.5).p).filter((x) => /csf_/.test(x)), []);
});

test("V07 — ردیفی که تفسیر شد از خطِ «بی‌حکم» بیرون می‌رود، ردیفِ دیگر می‌ماند (N8)", async () => {
  const { e, p } = run([row("CSF Glucose", "30", "mg/dL"), row("CSF Protein", "80", "mg/dL")]);
  const { specimenLine } = await import("./prompt.js");
  const l = specimenLine(e.specimen, p.findings);
  assert.ok(!/قند مایع/.test(l) && /پروتئین مایع 80/.test(l), l);
  assert.match(specimenLine(e.specimen), /قند مایع 30/);   // بی‌یافته همان رفتارِ مرحلهٔ الف
});

test("V08 — فوریت از موتور: قندِ CSF کمتر از ۴۰ با سایر یافته‌ها، دستورِ نهایی هنوز اورژانسیِ همان یافته است (M307-class)", async () => {
  const { actionStrength } = await import("./prompt.js");
  const f = csf("30").p.findings.find((x) => x.rule_id === "csf_glucose_low");
  assert.ok(actionStrength(f.action) >= 3, f.action);
});

// ── مرحلهٔ ب، دورِ دوم (P87 بند ۱۴): پروتئینِ ۲۴ساعتهٔ بارداری، کلسیمِ ۲۴ساعته، آسیت ──
const PREG = { sex: "F", age: 30, pregnant: true };
const prot = (v, u = "mg/24h", extra = [], patient = PREG) => run([row("Urine Prot/24h", v, u), ...extra], patient);
const only = (p, id) => p.findings.find((f) => f.rule_id === id);

test("W01 — پروتئینِ ۲۴ساعتهٔ بارداری ≥ ۳۰۰ mg با واحدِ چاپ‌شده ⇒ soon؛ «پره‌اکلامپسی دارید» هرگز", () => {
  const f = only(prot("350").p, "pregnancy_proteinuria_24h");
  assert.equal(f.urgency, "soon");
  assert.ok(f.must_say.includes("تشخیصِ پره‌اکلامپسی نیست"), f.must_say);
  assert.doesNotMatch(f.must_say, /پره‌اکلامپسی دارید/);
  assert.equal(only(prot("3.5", "g/24h").p, "pregnancy_proteinuria_24h")?.urgency, "soon");   // g ⇒ ×۱۰۰۰
});

test("W02 — کنترل‌ها: ۲۹۹، بی‌واحد، غیرباردار، نوار (۳+) ⇒ بی‌قاعده؛ ردیف در خطِ «بی‌حکم» می‌ماند", async () => {
  for (const [v, u, pt] of [["299", "mg/24h", PREG], ["350", "", PREG], ["350", "mg/24h", { sex: "F", age: 30 }]])
    assert.equal(only(prot(v, u, [], pt).p, "pregnancy_proteinuria_24h"), undefined, `${v} ${u}`);
  const r = prot("350", "", []);
  assert.match(await lineOf(r.e), /پروتئین ادرار ۲۴ساعته 350/);
});

test("W03 — نشانهٔ شدید (پلاکت < ۱۰۰، کراتینین > ۱٫۱، ALT ≥ ۲×حدِ بالای همین آزمایشگاه) ⇒ emergency با دستورِ فوری؛ بی‌نشانه soon", async () => {
  const { actionStrength } = await import("./prompt.js");
  for (const extra of [[row("PLT", "90", "K/uL")], [row("Creatinine", "1.3", "mg/dL")], [row("ALT", "80", "U/L")]]) {
    const f = only(prot("400", "mg/24h", extra).p, "pregnancy_proteinuria_24h");
    assert.equal(f.urgency, "emergency", JSON.stringify(extra));
    assert.ok(actionStrength(f.action) >= 4, f.action);
    assert.match(f.must_say, /ارزیابیِ فوری/);
  }
  assert.equal(only(prot("400", "mg/24h", [row("ALT", "50", "U/L")]).p, "pregnancy_proteinuria_24h").urgency, "soon");   // ۵۰ < ۲×۳۳
  assert.equal(only(prot("200", "mg/24h", [row("PLT", "90", "K/uL")]).p, "pregnancy_proteinuria_24h"), undefined);   // نشانهٔ شدید بی‌پروتئینوری مالِ این قاعده نیست
});

// ⚠️ W04/W05 بازنویسیِ عمدی (P87 تصمیمِ ۸): قاعدهٔ urine_calcium_24h_high حذف شد؛ همان حکم را urine_calcium_abnormal می‌دهد.
const caFinding = (rows, pt) => only(run(rows, pt).p, "urine_calcium_abnormal");
test("W04 — کلسیمِ ۲۴ساعته: مرد ≥ ۲۵۰، زن ≥ ۲۰۰ ⇒ این هفته؛ mmol تبدیل؛ زیرِ ۱۸ سال و جنسِ نامعلوم ⇒ همان ۱۰۰–۳۰۰؛ بی‌واحد ⇒ هیچ", () => {
  const ca = (v, u, pt) => caFinding([row("Urine Ca/24h", v, u)], pt);
  assert.equal(ca("260", "mg/24h", { sex: "M", age: 40 }).urgency, "this_week");
  assert.equal(ca("260", "mg/24h", { sex: "M", age: 40 }).action, "این هفته با پزشک مطرح کنید.");
  assert.equal(ca("240", "mg/24h", { sex: "M", age: 40 }), undefined);
  assert.ok(ca("210", "mg/24h", { sex: "F", age: 40 }));
  assert.ok(ca("6", "mmol/24h", { sex: "F", age: 40 }));         // ۶×۴۰ ≈ ۲۴۰
  assert.equal(ca("260", "mg/24h", { sex: "M", age: 12 }), undefined);
  assert.equal(ca("320", "mg/24h", { sex: "M", age: 12 }).urgency, "routine");
  assert.doesNotMatch(ca("320", "mg/24h", { sex: "M", age: 12 }).must_say, /مایو/);
  assert.equal(ca("260", "", { sex: "M", age: 40 }), undefined);
  assert.equal(ca("260", "mg/24h", { age: 40 }), undefined);
});

test("W05 — کلسیمِ ادرار: جملهٔ کلسیمِ خون و PTH سه‌حالته (بالا / طبیعی / روی برگه نیست)", () => {
  const t = (extra) => caFinding([row("Urine Ca/24h", "300", "mg/24h"), ...extra], { sex: "M", age: 40 }).must_say;
  assert.match(t([]), /کلسیم خون روی این برگه اندازه‌گیری نشده است/);
  assert.match(t([]), /PTH\) روی این برگه نیست/);
  assert.match(t([row("Calcium", "11.2", "mg/dL")]), /کلسیم خون شما 11\.2.*خارج از محدوده/);
  assert.match(t([row("Calcium", "9.5", "mg/dL")]), /کلسیم خون شما 9\.5.*طبیعی/);
  // N4: پیش‌تر کنارِ PTHِ چاپ‌شده هم «PTH روی این برگه نیست» می‌گفت.
  const withPth = t([row("Calcium", "9.5", "mg/dL"), row("PTH", "80", "pg/mL")]);
  assert.match(withPth, /PTH\) شما 80/);
  assert.doesNotMatch(withPth, /PTH\) روی این برگه نیست/);
});

test("U20 — P87 تصمیمِ ۸: دو املای کلسیمِ ۲۴ساعته یک هویت‌اند — همان یافته‌ها، همان فوریت، همان متن؛ FHH با املای آزمایشگاه", () => {
  const out = (name, v, extra, pt) => {
    const { p } = run([row(name, v, "mg/24h"), ...extra], pt);
    return JSON.stringify(p.findings.map((f) => [f.rule_id, f.urgency, f.must_say, f.action]));
  };
  const panels = [
    ["250", [], { sex: "F", age: 40 }], ["280", [], { sex: "M", age: 40 }], ["320", [], { sex: "M", age: 40 }],
    ["80", [], { sex: "F", age: 40 }], ["320", [], { sex: "M", age: 12 }],
    ["320", [row("Ca", "11.2", "mg/dL"), row("PTH", "90", "pg/mL")], { sex: "F", age: 60 }],
    ["50", [row("Ca", "11.2", "mg/dL"), row("PTH", "90", "pg/mL")], { sex: "F", age: 60 }],
  ];
  for (const [v, extra, pt] of panels) assert.equal(out("Urine Ca/24h", v, extra, pt), out("24h urine calcium", v, extra, pt), v + JSON.stringify(pt));
  // 🔴 پیش از تغییر: «Urine Ca/24h 50» + کلسیم و PTHِ بالا ⇒ primary_hyperparathyroidism + «کلسیم ادرار روی این برگه نیست».
  const fhh = run([row("Urine Ca/24h", "50", "mg/24h"), row("Ca", "11.2", "mg/dL"), row("PTH", "90", "pg/mL")], { sex: "F", age: 60 }).p;
  assert.ok(fhh.findings.some((f) => f.rule_id === "fhh_pattern"), fhh.findings.map((f) => f.rule_id).join(","));
  assert.ok(!fhh.findings.some((f) => /کلسیم ادرار ۲۴ ساعته روی این برگه نیست/.test(f.must_say)));
  assert.ok(!run([row("Urine Ca/24h", "300", "mg/24h")], { sex: "M", age: 40 }).p.findings.some((f) => f.rule_id === "urine_calcium_24h_high"));
});

const asc = (rows) => run(rows, { sex: "M", age: 55 });
test("W06 — آسیت: دو معیار از سه ⇒ soon «سازگار با»، بی‌«پریتونیتِ ثانویه دارید»؛ یک معیار ⇒ هیچ", () => {
  const two = asc([row("Ascitic Protein", "2.5", "g/dL"), row("Ascitic Glucose", "40", "mg/dL"), row("LDH", "200", "U/L")]).p;
  const f = only(two, "ascites_runyon_pattern");
  assert.equal(f.urgency, "soon");
  assert.ok(f.must_say.includes("PMN"), f.must_say);
  assert.doesNotMatch(f.must_say, /پریتونیتِ ثانویه دارید/);
  assert.match(f.must_say, /قندِ مایع کمتر از ۵۰ میلی‌گرم در دسی‌لیتر: برقرار است/);
  assert.match(f.must_say, /LDHِ مایع بالاتر از حدِ بالای سرمِ همین برگه: برقرار نیست|LDHِ مایع بالاتر از حدِ بالای سرمِ همین برگه: روی برگه نیست/);
  const one = asc([row("Ascitic Protein", "2.5", "g/dL"), row("Ascitic Glucose", "90", "mg/dL")]).p;
  assert.equal(only(one, "ascites_runyon_pattern"), undefined);
});

test("W07 — آسیت: پروتئینِ بی‌واحد قابلِ سنجش نیست (g/dL یا g/L)، پس با یک معیارِ دیگر فعال نمی‌شود؛ LDHِ مایع بدونِ LDHِ سرم هم سنجیده نمی‌شود", () => {
  assert.equal(only(asc([row("Ascitic Protein", "2.5"), row("Ascitic Glucose", "40", "mg/dL")]).p, "ascites_runyon_pattern"), undefined);
  assert.equal(only(asc([row("Ascitic LDH", "900", "U/L"), row("Ascitic Glucose", "40", "mg/dL")]).p, "ascites_runyon_pattern"), undefined);
});

test("W08 — ردیفِ تفسیرشده از خطِ «بی‌حکم» بیرون می‌رود (پروتئینِ بارداری)", async () => {
  const { e, p } = prot("350");
  const { specimenLine } = await import("./prompt.js");
  assert.equal(specimenLine(e.specimen, p.findings), null);
});

test("W09 — قندِ پلور دو ردیفه: < ۴۰ ⇒ soon، ۴۰ تا < ۶۰ ⇒ this_week با علتِ گسترده، ≥ ۶۰ ⇒ هیچ (تصمیمِ کاربر)", () => {
  const pl = (v, u, extra = []) => only(run([row("Pleural Glucose", v, u), ...extra]).p, "pleural_glucose_low");
  assert.equal(pl("30", "mg/dL").urgency, "soon");
  assert.equal(pl("2.0", "mmol/L").urgency, "soon");            // ≈ ۳۶ mg/dL
  const mid = pl("55", "mg/dL");
  assert.equal(mid.urgency, "this_week");
  assert.match(mid.must_say, /کمتر از ۶۰/); assert.match(mid.must_say, /تشخیص نیست/); assert.match(mid.must_say, /pH مایع/);
  assert.match(mid.action, /این هفته/);
  assert.equal(pl("3.0", "mmol/L").urgency, "this_week");       // ≈ ۵۴ mg/dL
  assert.equal(pl("60", "mg/dL"), undefined);
  assert.equal(pl("3.5", "mmol/L"), undefined);                 // ≈ ۶۳ mg/dL
});

test("W10 — قندِ پلور بی‌واحد: فقط وقتی در هر دو خوانش پایین است نمره می‌گیرد؛ کفِ آن کمینهٔ خوانش‌هاست (P48)", () => {
  const pl = (v) => only(run([row("Pleural Glucose", v, "")]).p, "pleural_glucose_low");
  assert.equal(pl("2")?.urgency, "soon");        // پایین‌تر از ۴۰ در هر دو خوانش
  assert.equal(pl("3")?.urgency, "this_week");   // mmol ⇒ ۵۴ (this_week)، mg/dL ⇒ soon ⇒ کمینه
  for (const v of ["5", "30", "45", "59"]) assert.equal(pl(v), undefined, v);   // مبهم
  assert.equal(pl("80"), undefined);
});

test("W11 — نسبتِ قند سه‌حالته در متنِ پلور: نسبتِ بد / نسبتِ ≥ ۰٫۵ با هشدارِ دیابت / قندِ خون نیست (N4)", () => {
  const t = (extra) => only(run([row("Pleural Glucose", "50", "mg/dL"), ...extra]).p, "pleural_glucose_low").must_say;
  assert.ok(t([row("FBS", "150", "mg/dL")]).includes("0.33 است که کمتر از ۰٫۵ است"));
  assert.match(t([row("FBS", "90", "mg/dL")]), /کمتر از ۰٫۵ نیست؛ در بیمارِ دیابتی/);
  assert.match(t([]), /قندِ خون روی همین برگه نیست/);
});

// ── P87 تصمیمِ ۱۱ (۲۰۲۶-۱۰-۰۶، تصمیمِ کاربر): قند/LDH/پروتئینِ بی‌نامِ نمونه کنارِ «Fluid Type» — فوریت بماند، متن شرطی ──
test("U21 — «Glucose 30» کنارِ «Fluid Type 4»: اورژانس می‌ماند، متن شرطی، اقدامِ مخصوصِ مایع؛ بی‌Fluid Type و درخواستِ ۲۸ دست‌نخورده", () => {
  const FT = row("Fluid Type", "4");
  const go = (rows) => run(rows, { sex: "F", age: 46 }).p;
  const hypo = go([FT, row("Glucose", "30", "mg/dL")]);
  assert.equal(hypo.overall_urgency, "emergency");
  assert.equal(hypo.has_critical, true);
  const f = hypo.findings.find((x) => x.urgency === "emergency");
  assert.match(f.must_say, /ممکن است مقدارِ خون باشد یا مقدارِ همان مایع/);
  assert.match(f.must_say, /فوریت را پایین نیاورده‌ایم/);
  assert.match(f.action, /^همین حالا این نتیجه را به پزشکِ معالج یا پرستارِ بخش اطلاع دهید/);
  assert.match(f.action, /چیزی شیرین بخورید/);              // بقیهٔ اقدام نمی‌افتد
  assert.doesNotMatch(f.action, /همین امروز به اورژانس/);   // جملهٔ رقیب (N20) نمی‌ماند
  const hhs = go([FT, row("Glucose", "650", "mg/dL")]).findings.find((x) => x.urgency === "emergency");
  assert.match(hhs.must_say, /بی‌نامِ نمونه/);
  const ldh = go([FT, row("LDH", "2500", "U/L")]).findings.find((x) => x.pattern === "ldh_high_nonspecific");
  assert.equal(ldh.urgency, "routine");
  assert.match(ldh.must_say, /اگر مالِ مایع است، این را به پزشک بگویید/);
  // کنترلِ منفی: بی‌«Fluid Type» متن و اقدام همان قبلی‌اند؛ درخواستِ ۲۸ (همان آنالیت با نامِ مایع روی برگه) جمله نمی‌گیرد.
  const plain = go([row("Glucose", "30", "mg/dL")]).findings.find((x) => x.urgency === "emergency");
  assert.doesNotMatch(plain.must_say, /بی‌نامِ نمونه/);
  assert.match(plain.action, /^همین امروز به اورژانس/);
  assert.doesNotMatch(JSON.stringify(go(REQ28).findings), /بی‌نامِ نمونه/);
});

// ── P87 تصمیمِ ۴ (۲۰۲۶-۱۰-۰۶، تصمیمِ کاربر): «همزمان» = همین برگه + جملهٔ زمان؛ «نسبت حساب نشد» هرگز «قندِ خون نیست» نمی‌گوید وقتی هست ──
test("V09 — نسبتِ قندِ مایع/خون: جملهٔ زمان کنارِ هر نسبت (CSF و پلور)؛ دو قندِ خون یا قندِ بی‌واحد ⇒ «حساب نشد» بی‌ادعای غیاب (N4)", () => {
  const f = (rows, id) => run(rows, { sex: "M", age: 50 }).p.findings.find((x) => x.rule_id === id);
  const TIME = /زمانِ نمونه‌گیریِ این دو روی برگه نیامده/;
  assert.match(f([row("CSF Glucose", "45", "mg/dL"), row("FBS", "160", "mg/dL")], "csf_glucose_low").must_say, TIME);
  assert.match(f([row("Pleural Glucose", "30", "mg/dL"), row("FBS", "140", "mg/dL")], "pleural_glucose_low").must_say, TIME);
  for (const [fl, id] of [["CSF Glucose", "csf_glucose_low"], ["Pleural Glucose", "pleural_glucose_low"]]) {
    const two = f([row(fl, "30", "mg/dL"), row("FBS", "140", "mg/dL"), row("BS", "100", "mg/dL")], id).must_say;
    assert.match(two, /دو قندِ خون چاپ شده است \(140 و 100\)/);
    assert.doesNotMatch(two, /قندِ خون روی همین برگه نیست/);
  }
  const unitless = f([row("CSF Glucose", "30", "mg/dL"), row("FBS", "140", "")], "csf_glucose_low");
  assert.equal(unitless.urgency, "emergency");
  assert.doesNotMatch(unitless.must_say, /قندِ خون روی همین برگه نیست/);
  assert.match(f([row("CSF Glucose", "30", "mg/dL")], "csf_glucose_low").must_say, /قندِ خون روی همین برگه نیست/);   // غیابِ واقعی
});

// P87 (پاسخِ بازبینِ انسانی، ۲۰۲۶-۱۰-۰۶): علائمِ هشدار در action، و «موتور» از متنِ بیمار بیرون.
test("W12 — پروتئینِ بارداری و آسیت: علائمِ هشدار در action؛ واژهٔ «موتور» در متنِ بیمار نیست", () => {
  const p = only(prot("400", "mg/24h").p, "pregnancy_proteinuria_24h");
  assert.match(p.action, /سردردِ شدید.*همان لحظه به اورژانس/);
  assert.doesNotMatch(p.must_say, /موتور/);
  assert.match(p.must_say, /این برگه فشارِ خون و علائمِ شما را نمی‌بیند/);
  const a = only(asc([row("Ascitic Protein", "2.5", "g/dL"), row("Ascitic Glucose", "40", "mg/dL")]).p, "ascites_runyon_pattern");
  assert.equal(a.urgency, "soon");
  assert.match(a.action, /تب، دردِ شکم، گیجی.*همان لحظه به اورژانس/);
  assert.match(a.must_say, /تشخیص نیست/);
});
