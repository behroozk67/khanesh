import test from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";

// ═══ P116 (بازبینیِ بالینی ۲۰۲۶-۱۰-۲۷) ═══
//  سه اصلاح که از یک برگهٔ واقعیِ ۴۴ ساله بیرون آمد:
//   ۱) Hb تنها (با Hct نرمال) هشدارِ پرخونیِ مغزِ استخوان نمی‌سازد؛
//   ۲) بازهٔ چاپ‌شدهٔ برگه حقِ «تخفیف» دارد — GGT 46.2 کنارِ «up to 49» و MCHC 36.3 کنارِ «30-37» خارج از محدوده نیستند؛
//   ۳) T3 Uptake و FTI با بازهٔ چاپ‌شدهٔ خودِ برگه سنجیده می‌شوند (موتور مرجعِ داخلی ندارد).

const r = (name, value, unit = "", reference = "") => ({
  name, value: String(value), ...(unit ? { unit } : {}), ...(reference ? { reference } : {}),
});
const run = (tests, age = 44, sex = "M") => {
  const e = runEngine({ tests, patient: { sex, age } }, { diagnostics: true });
  return { e, p: runPatterns(e), ids: runPatterns(e).findings.map((f) => f.rule_id) };
};
const g = (e, key) => e.graded.find((x) => x.test === key);

test("P116-۱: Hb ۱۷.۳ با Hct ۴۷.۷ ⇒ بی‌هشدارِ پرخونی؛ Hct ۵۱ ⇒ هشدار می‌آید (آستانهٔ WHO)", () => {
  const calm = run([r("Hb", 17.3, "g/dL", "11-18"), r("Hct", 47.7, "%", "35-50")]);
  assert.ok(!calm.ids.includes("erythrocytosis_who_screen"), "هماتوکریتِ نرمال ⇒ غربالگری لازم نیست");
  // همان Hb با هماتوکریتِ بالای آستانهٔ WHO (۴۹٪ در مرد) ⇒ غربالگری می‌آید
  const hot = run([r("Hb", 17.3, "g/dL", "11-18"), r("Hct", 51, "%", "35-50")]);
  assert.ok(hot.ids.includes("erythrocytosis_who_screen"), "Hb بالا + Hct ≥ ۴۹ ⇒ غربالگری");
  // Hct روی برگه نیست ⇒ تصمیم با Hb تنها (رفتارِ پیشین دست‌نخورده)
  const noHct = run([r("Hb", 17.3, "g/dL", "11-18")]);
  assert.ok(noHct.ids.includes("erythrocytosis_who_screen"), "بی‌Hct همان قاعدهٔ قبلی");
});

test("P116-۲: GGT ۴۶.۲ کنارِ «up to 49» طبیعی است؛ ۵۵ همچنان بالاست؛ دلیل روی ردیف می‌مانَد", () => {
  const ok = run([r("GGT", 46.2, "U/L", "up to 49")]);
  const row = g(ok.e, "GGT");
  assert.equal(row.abnormal, false, "بازهٔ برگه طبیعی می‌داند");
  assert.equal(row.printedNormal, true);
  assert.equal(row.printedRange, "up to 49");
  assert.match(row.note, /بازهٔ چاپ‌شدهٔ برگه/);
  assert.equal(row.fa, "در محدودهٔ چاپ‌شدهٔ برگه");
  // بالاتر از بازهٔ چاپی ⇒ بیرون از محدوده، مثلِ قبل
  const bad = run([r("GGT", 55, "U/L", "up to 49")]);
  assert.equal(g(bad.e, "GGT").abnormal, true);
  // بی‌بازهٔ چاپی ⇒ بازهٔ موتور (۵–۴۰) ⇒ ۴۶.۲ بالاست
  const plain = run([r("GGT", 46.2, "U/L")]);
  assert.equal(g(plain.e, "GGT").abnormal, true);
});

test("P116-۳: MCHC ۳۶.۳ کنارِ «30-37» طبیعی می‌شود (پیش‌تر بازهٔ موتور ۳۲–۳۶ آن را خارج می‌خواند)", () => {
  const ok = run([r("MCHC", 36.3, "g/dL", "30-37")]);
  assert.equal(g(ok.e, "MCHC").abnormal, false);
  assert.equal(g(ok.e, "MCHC").printedNormal, true);
  const bad = run([r("MCHC", 38.4, "g/dL", "30-37")]);
  assert.equal(g(bad.e, "MCHC").abnormal, true, "بیرون از بازهٔ برگه ⇒ همچنان غیرطبیعی");
});

test("P116-۴: سنجه‌های پرخطر تخفیف نمی‌گیرند — K ۵.۳ کنارِ «up to 5.5» همچنان بالاست", () => {
  const k = run([r("K", 5.3, "mmol/L", "3.5-5.5")]);
  assert.equal(g(k.e, "K").abnormal, true, "پتاسیم با بازهٔ موتور سنجیده می‌شود");
  assert.ok(!g(k.e, "K").printedNormal);
  // اسید اوریک هم مستثنی است (تصمیمِ Y24: قاعده خودش «سقفِ بازهٔ آزمایشگاه» را می‌گوید)
  const ua = run([r("Uric Acid", 8.2, "mg/dL", "3.6-8.2")]);
  assert.equal(g(ua.e, "URIC").abnormal, true);
});

// نگاشتِ نامِ «T3 Uptake»/«FTI» در شاخهٔ موازیِ P111 آمده است؛ تا ادغامِ آن، این تست skip می‌شود
// (به‌جای سبزِ کاذب یا قرمزِ بی‌ربط). بعد از ادغام خودکار فعال می‌شود.
const T3UP_MAPPED = !runEngine({ tests: [r("T3 Uptake", 30, "%", "24-35")], patient: { sex: "M", age: 44 } })
  .unmapped.includes("T3 Uptake");

test("P116-۵: T3 Uptake و FTI با بازهٔ چاپ‌شده سنجیده می‌شوند، نه «محدوده مرجع ندارد»",
  { skip: T3UP_MAPPED ? false : "نگاشتِ نامِ T3UP/FTI در کامیتِ موازیِ P111 هنوز ادغام نشده است" }, () => {
  const ok = run([r("T3 Uptake", 30, "%", "24-35"), r("FTI", 2.4, "", "1.4-3.4")]);
  for (const key of ["T3UP", "FTI"]) {
    const row = g(ok.e, key);
    assert.ok(row, `${key} باید سنجیده شود`);
    assert.equal(row.refSource, "بازهٔ چاپ‌شدهٔ همین برگه");
    assert.equal(row.abnormal, false);
    assert.ok(!ok.e.noRef.includes(key), `${key} دیگر در «تفسیر نشدند» نیست`);
    assert.equal(ok.e.ungraded[key], undefined);
  }
  const high = run([r("T3 Uptake", 41, "%", "24-35"), r("FTI", 4.1, "", "1.4-3.4")]);
  assert.equal(g(high.e, "T3UP").abnormal, true);
  assert.equal(g(high.e, "FTI").abnormal, true);
  // بی‌بازهٔ چاپی ⇒ همان رفتارِ پیشین (noRef)، نه حدس
  const noRef = run([r("T3 Uptake", 30, "%"), r("FTI", 2.4, "")]);
  assert.ok(noRef.e.noRef.includes("T3UP") && noRef.e.noRef.includes("FTI"));
});

test("P116-۶: فهرستِ تخفیف‌یافته فقط با diagnostics می‌آید (خروجیِ فریزها دست‌نخورده)", () => {
  const sheet = [r("GGT", 46.2, "U/L", "up to 49"), r("MCHC", 36.3, "g/dL", "30-37")];
  const withDiag = runEngine({ tests: sheet, patient: { sex: "M", age: 44 } }, { diagnostics: true });
  assert.deepEqual(withDiag.printedRelaxed.sort(), ["GGT", "MCHC"]);
  const plain = runEngine({ tests: sheet, patient: { sex: "M", age: 44 } });
  assert.equal("printedRelaxed" in plain, false);
});
