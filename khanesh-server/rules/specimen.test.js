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

test("U07 — «Urine Ca/24h 320» شناخته می‌شود ولی سنجیده نمی‌شود؛ U_CA ساخته نمی‌شود (R3)", () => {
  const { e, p } = run([row("Urine Ca/24h", "320")], { sex: "M", age: 40 });
  assert.deepEqual(ids(sp(e).u24), ["U24_CA"]);
  assert.ok(!serumKeys(e).includes("U_CA"));
  assert.equal(p.findings.length, 0);
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
  cbc_ida: [{ sex: "F", age: 30 }, [row("Hb", "9.5", "g/dL"), row("MCV", "70", "fL"), row("Ferritin", "6", "ng/mL"), row("WBC", "6.1"), row("PLT", "250")], "5aea52ee4a5253ff"],
  bmp: [{ sex: "M", age: 55 }, [row("Na", "138"), row("K", "4.2"), row("Creatinine", "1.0", "mg/dL"), row("Urea", "30", "mg/dL"), row("FBS", "95", "mg/dL")], "a25b0d7b6c56186a"],
  lipid_dm: [{ sex: "M", age: 50 }, [row("Cholesterol", "210", "mg/dL"), row("LDL", "114", "mg/dL"), row("HDL", "38", "mg/dL"), row("TG", "240", "mg/dL"), row("FBS", "209", "mg/dL")], "2065fd25af68fbf4"],
  liver: [{ sex: "F", age: 45 }, [row("AST", "120"), row("ALT", "150"), row("ALP", "200"), row("Total Bilirubin", "2.1", "mg/dL")], "3547cf8469405703"],
  thyroid: [{ sex: "F", age: 35 }, [row("TSH", "8.2"), row("FT4", "0.9")], "0c3a87d251beba49"],
  urinalysis: [{ sex: "F", age: 28 }, [row("Urine Protein", "+1"), row("Nitrite", "Positive"), row("WBC", "10-12", "/hpf"), row("RBC", "2-3", "/hpf")], "3f28e6213d7b156b"],
  coag: [{ sex: "M", age: 60 }, [row("PT", "19"), row("PTT", "42"), row("PT INR", "1.7")], "ee983094d72415a1"],
  lis_ldh: [{ sex: "F", age: 32 }, [row("AST", "35"), row("ALT", "26"), row("LDH", "864"), row("T. Bilirubin(Clot)", "0.41"), row("Direct Bili.", "0.1")], "b4aca598b9885e65"],
  lis_serum: [{ sex: "F", age: 40 }, [row("Serum Ca", "9.1"), row("serum Mg", "2"), row("serum p", "4"), row("Serum Protein", "7")], "e5639cb63a569a3d"],
  fluid_bare: [{ sex: "F", age: 46 }, [row("Glucose", "122"), row("LDH", "306"), row("Total Protein", "6.6")], "fbc60061d1a28af4"],
  neonate: [{ sex: "M", age: 0.01 }, [row("Hb", "15"), row("T. Bilirubin(Clot)", "12")], "3c0fe6147ac78fa5"],
};

test("U09 — فریزِ محورِ معدنی: «24h urine calcium» همچنان U_CA است و خروجی بایت‌به‌بایت همان (FR-014، سبزِ پیشین)", () => {
  assert.equal(fp({ sex: "F", age: 60 }, [row("24h urine calcium", "320", "mg/24h"), row("Ca", "11.2", "mg/dL"), row("PTH", "90", "pg/mL")]), "be0e71dfa982ff58");
  assert.equal(fp({ sex: "F", age: 40 }, [row("24h urine calcium", "50", "mg/24h"), row("Ca", "10.9", "mg/dL"), row("PTH", "70", "pg/mL")]), "375f5043d967356d");
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

test("U14 — هیچ patterns_*.js کانالِ specimen را نمی‌خواند (خواننده فقط پس از تأییدِ P87)", () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const hits = readdirSync(dir).filter((f) => /^patterns.*\.js$/.test(f))
    .filter((f) => /specimen/i.test(readFileSync(join(dir, f), "utf8")));
  assert.deepEqual(hits, []);
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
