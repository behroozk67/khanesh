// بازبینیِ ۲۰۲۶-۱۰-۲۸ (P119): برگهٔ واقعیِ پسرِ ۹ ساله — چهار ریشهٔ گزارش‌شده قفل می‌شود.
//   Z01 T4 تام با واحدِ ng/mL: ۷۴٫۲ باید ۷٫۴۲ µg/dL (وسطِ بازهٔ اطفال) باشد، نه ۵٫۷۷ «پایین»
//   Z02 بازهٔ چاپ‌شدهٔ همان ردیف («45–120 ng/mL») در ستونِ نمای تخصصی «—» نمی‌ماند
//   Z03 منتزر فقط با میکروسیتوزِ **همان سن** ساخته می‌شود (MCV 78.2 در ۹ سالگی طبیعی است)
//   Z04 کراتینینِ پایین صاحب دارد؛ در «توضیح داده نشدند» نمی‌نشیند
import test from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";
import { GUIDELINE_IDS as REGISTERED_SOURCES } from "./guidelines.js";
import { getRef } from "./refs.js";

const r = (name, value, unit, reference) => ({ name, value, ...(unit ? { unit } : {}), ...(reference ? { reference } : {}) });
const BOY9 = { age: 9, sex: "M" };
const M40 = { age: 40, sex: "M" };
const run = (tests, patient = BOY9) => {
  const e = runEngine({ patient, tests });
  return { e, p: runPatterns(e) };
};
const ids = (p) => p.findings.map((f) => f.pattern);
const g = (e, k) => e.graded.find((x) => x.test === k);

test("Z01: T4 تامِ ۷۴٫۲ ng/mL = ۷٫۴۲ µg/dL و در بازهٔ اطفال طبیعی است (کنترل: ۳٫۰ پایین می‌ماند)", () => {
  const ok = run([r("T4", "74.2", "ng/ml", "45 - 120")]);
  const t4 = g(ok.e, "T4");
  assert.ok(t4, "T4 باید سنجیده شود");
  assert.equal(t4.value, 7.42, `مقدارِ تبدیل‌شده ${t4.value} است، نه ۷٫۴۲`);
  assert.equal(t4.abnormal, false, `T4 ۷٫۴۲ باید وسطِ بازهٔ ۶٫۱۶–۱۰٫۳۲ طبیعی باشد (${t4.range})`);
  assert.ok(!ids(ok.p).includes("total_t4_abnormal"), `یافتهٔ کاذب: ${ids(ok.p)}`);
  // کنترلِ مثبت: همان واحد با عددِ واقعاً پایین
  const low = run([r("T4", "30", "ng/ml", "45 - 120")]);
  assert.equal(g(low.e, "T4").value, 3);
  assert.ok(ids(low.p).includes("total_t4_abnormal"), "۳٫۰ µg/dL باید یافتهٔ T4ِ پایین بسازد");
});

test("Z02: بازهٔ چاپ‌شدهٔ T4 با واحدِ تبدیل‌شده هم‌مقیاس می‌شود و «—» نمی‌ماند", () => {
  const { e } = run([r("T4", "74.2", "ng/ml", "45 - 120")]);
  assert.ok(e.printedRanges?.T4, `printedRanges.T4 نیامد: ${JSON.stringify(e.printedRanges)}`);
  assert.equal(e.printedRanges.T4, "4.5–12", `بازهٔ چاپ‌شده در واحدِ سنجیده‌شده: ${e.printedRanges.T4}`);
});

test("Z03: منتزر فقط با میکروسیتوزِ همان سن ساخته می‌شود (کنترل: بزرگسال ۷۹ و کودک ۷۰)", () => {
  const cbc = (mcv) => [r("MCV", mcv, "fL", "80-100"), r("RBC", "5.05", "10^6/µL", "4.5-5.9"), r("Hemoglobin", "12.8", "g/dL", "12-16")];
  assert.equal(run(cbc("78.2")).e.indices.mentzer, undefined, "MCV ۷۸٫۲ در ۹ سالگی طبیعی است ⇒ منتزر بی‌معنا");
  assert.ok(run(cbc("78.2"), M40).e.indices.mentzer > 0, "برای بزرگسال MCV ۷۸٫۲ همچنان میکروسیتوز است");
  assert.ok(run(cbc("70")).e.indices.mentzer > 0, "۷۰ زیرِ کفِ ۷۷ِ اطفال است ⇒ منتزر باید ساخته شود");
});

test("Z04: کراتینینِ پایین صاحب دارد و در «توضیح داده نشدند» نمی‌نشیند (کنترل: دیالیزی)", () => {
  const low = run([r("Creatinine", "0.59", "mg/dL", "0.7 - 1.4")]);
  assert.ok(ids(low.p).includes("creatinine_low"), `قاعده فعال نشد: ${ids(low.p)}`);
  assert.ok(!ids(low.p).includes("unexplained_abnormal"), `کراتینین هنوز بی‌صاحب است: ${ids(low.p)}`);
  const f = low.p.findings.find((x) => x.pattern === "creatinine_low");
  assert.equal(f.urgency, "routine");
  assert.match(f.must_say, /تودهٔ عضلانی/, "متن باید فیزیولوژیِ تودهٔ عضلانی را بگوید");
  assert.match(f.must_say, /بیماریِ کلیه کراتینین را بالا می‌برد/, "متن نباید پایین بودن را به بیماریِ کلیه بچسباند");
  // الگو باید به گایدلاین ارجاع دهد، نه به شهود (M36: منبعِ ثبت‌شده)
  assert.ok(Array.isArray(f.sources) && f.sources.includes("MERCK_PRO"), `منبعِ ثبت‌شده نیامد: ${JSON.stringify(f.sources)}`);
  assert.ok(REGISTERED_SOURCES.has("MERCK_PRO"), "MERCK_PRO در دفترِ منابع نیست");
  assert.match(f.must_say, /تنها شاخصِ خوبی برای عملکردِ کلیه نیست/, "توصیهٔ گایدلاین (کراتینین تنها شاخصِ کفایت نیست) نیامد");
  assert.match(f.must_say, /کم‌تغذیه‌گی|تحلیلِ عضله/, "الگوی کم‌تغذیه‌گی/تحلیلِ عضله از گایدلاین نیامد");
  // کودک: فرمولِ بزرگسال (CKD-EPI) پیشنهاد نمی‌شود؛ بالغ: پیشنهاد می‌شود
  assert.doesNotMatch(f.must_say, /CKD-EPI/, "برای کودک نباید فرمولِ eGFRِ بزرگسال پیشنهاد شود");
  assert.match(f.must_say, /فرمولِ مخصوصِ کودکان/, "برای کودک باید ارجاعِ فرمولِ کودکان بیاید");
  const adultLow = run([r("Creatinine", "0.55", "mg/dL", "0.7 - 1.2")], M40).p.findings.find((x) => x.pattern === "creatinine_low");
  assert.ok(adultLow, "بالغِ ۴۰ ساله با ۰٫۵۵ باید همان یافته را بگیرد");
  assert.match(adultLow.must_say, /CKD-EPI/, "برای بالغ توصیهٔ eGFR با CKD-EPI باید بیاید");
  assert.equal(g(low.e, "CREAT").abnormal, true, "M26: حکمِ غیرطبیعی دست‌نخورده می‌ماند");

  // بیمارِ دیالیزی: قاعده مالِ او نیست (P72)
  const dial = runEngine({ patient: { ...M40, conditions: ["dialysis"] }, tests: [r("Creatinine", "0.4", "mg/dL", "0.7-1.3")] });
  const dp = runPatterns(dial);
  assert.ok(!dp.findings.some((x) => x.pattern === "creatinine_low"), "دیالیزی نباید یافتهٔ کراتینینِ پایین بگیرد");
});

test("Z05: TSHِ ۴٫۶۵ در کودکِ ۹ ساله با سقفِ ۵٫۰ طبیعی است (کنترل: ۵٫۲ بالا؛ بزرگسال دست‌نخورده)", () => {
  const ok = run([r("TSH", "4.65", "µIU/ml", "0.3 - 5.0")]);
  assert.equal(g(ok.e, "TSH").abnormal, false, `بازه: ${g(ok.e, "TSH").range}`);
  assert.ok(!ids(ok.p).includes("thyroid_hypo_ft4_unmeasured"), `یافتهٔ کاذب: ${ids(ok.p)}`);
  const hi = run([r("TSH", "5.2", "µIU/ml", "0.3 - 5.0")]);
  assert.equal(g(hi.e, "TSH").dir, "high", "۵٫۲ بالاتر از سقفِ ۵٫۰ است");
  // بالغ با همان عدد: بازهٔ بزرگسالِ refs.js دست‌نخورده (۴٫۵) است
  const adult = run([r("TSH", "4.65", "µIU/ml")], M40);
  assert.equal(g(adult.e, "TSH").dir, "high");
});

test("Z06: جملهٔ آرامش‌بخشِ پیش از بلوغ فقط زیرِ ۱۰ سال (کنترل: ۱۲ ساله همان متنِ قبلی)", () => {
  const horm = [r("LH", "0.10", "mIU/ml", "0.7 - 7.4"), r("Testosterone", "0.10", "ng/ml", "")];
  const boy9 = run(horm).p.findings.find((f) => f.pattern === "reproductive_hormone_context");
  assert.ok(boy9, "یافتهٔ هورمون‌های بی‌بازه باید بیاید");
  assert.match(boy9.must_say, /پیش از بلوغ|هنوز بلوغ شروع نشده/, "جملهٔ آرامش‌بخش نیامد");
  assert.match(boy9.must_say, /بازهٔ بزرگسالان/, "باید بگوید فلش از بازهٔ بزرگسالان می‌آید");
  assert.equal(boy9.urgency, "routine", "فوریت نباید بالا برود");
  const boy12 = run(horm, { age: 12, sex: "M" }).p.findings.find((f) => f.pattern === "reproductive_hormone_context");
  assert.ok(boy12, "۱۲ ساله هم باید بدونِ حکم بماند");
  assert.doesNotMatch(boy12.must_say, /هنوز بلوغ شروع نشده/, "برای ۱۲ ساله ادعای پیش از بلوغ نداریم");
});

test("Z07: بازهٔ کراتینینِ ۹ ساله همان ۰٫۶–۱٫۰ می‌ماند (تصمیمِ کاربر ۲۰۲۶-۱۰-۲۸) و ۰٫۵۹ همچنان «پایین» است", () => {
  const band = getRef("CREAT", "M", 9);
  assert.deepEqual(band, [0.6, 1.0], `بازهٔ ثبت‌شده عوض شده: ${JSON.stringify(band)}`);
  const { e } = run([r("Creatinine", "0.59", "mg/dL", "0.7 - 1.4")]);
  const cr = g(e, "CREAT");
  assert.equal(cr.dir, "low", "۰٫۵۹ زیرِ کفِ ۰٫۶ است");
  assert.match(cr.range, /0\.6–1/, `بازهٔ سنجش: ${cr.range}`);
});

test("Z08: MCV ۷۹ با گلبولِ قرمزِ نرمال توصیهٔ تالاسمی نمی‌گیرد؛ جملهٔ ازدواج/فرزند برای زنِ بالای ۵۰ سال نمی‌آید", () => {
  const F55 = { age: 55, sex: "F" };
  const cbc = (mcv, rbc, hb = "12.8") => [r("Hemoglobin", hb, "g/dL"), r("MCV", mcv, "fL"), r("RBC", rbc, "10^6/µL")];
  // ۱) همان موردِ گزارش: MCV ۷۹، RBC نرمال (منتزر ۱۵٫۶) ⇒ فقط فریتین، بی‌الکتروفورز، بی‌جملهٔ تالاسمی
  const plain = run(cbc("79", "5.05"), F55).p;
  const m = plain.findings.find((f) => f.pattern === "microcytosis_no_anemia");
  assert.ok(m, `یافتهٔ گلبولِ کوچک نیامد: ${ids(plain)}`);
  assert.ok(!m.suggest.includes("الکتروفورز هموگلوبین"), `بی‌شاهدِ تالاسمی نباید الکتروفورز بخواهد: ${m.suggest}`);
  assert.ok(!m.warnings.some((w) => /تالاسمی/.test(w)), `جملهٔ تالاسمی نباید بیاید: ${m.warnings.join(" | ")}`);
  assert.ok(m.suggest.includes("فریتین"), "قدمِ اول فریتین است");
  assert.doesNotMatch(JSON.stringify(plain.findings), /ازدواج/, "هیچ یافته‌ای نباید «ازدواج» را به ۵۵ ساله بگوید");

  // ۲) شاهدِ تالاسمی (RBC ۶٫۲، منتزر ۱۲٫۸) ⇒ قاعدهٔ تالاسمی، با جملهٔ غربالگریِ *بی‌چارچوبِ فرزندآوری*
  const lean = run(cbc("79.4", "6.2", "13.5"), F55).p.findings.find((f) => f.pattern === "thal_trait_likely");
  assert.ok(lean, "منتزر < ۱۳ باید قاعدهٔ تالاسمی را فعال کند");
  const warn = lean.warnings.find((w) => /تالاسمی/.test(w)) ?? "";
  assert.ok(/غربالگریِ تالاسمی/.test(warn), `جملهٔ غربالگری نیامد: ${lean.warnings.join(" | ")}`);
  assert.doesNotMatch(warn, /ازدواج|بچه‌دار/, `برای ۵۵ ساله نباید حرفِ ازدواج/بچه‌دار باشد: ${warn}`);
  // کنترل: همان برگه برای زنِ ۳۰ ساله باید همان جملهٔ اصلی را داشته باشد
  const young = run(cbc("79.4", "6.2", "13.5"), { age: 30, sex: "F" }).p.findings.find((f) => f.pattern === "thal_trait_likely");
  assert.match(young.warnings.join(" "), /ازدواج/, "برای ۳۰ ساله جملهٔ ازدواج/فرزند باید بماند");

  // ۳) HbA2 ۵٫۲ در زنِ ۵۵ ساله ⇒ هشدارِ ناقل، بی‌چارچوبِ فرزندآوری
  const a2 = run([r("HbA2", "5.2", "%")], F55).p;
  const carrier = a2.findings.find((f) => (f.warnings ?? []).some((w) => /ژنتیک/.test(w)));
  assert.ok(carrier, `هشدارِ ناقل نیامد: ${JSON.stringify(a2.findings.map((f) => f.warnings))}`);
  assert.doesNotMatch(carrier.warnings.join(" "), /ازدواج|بچه‌دار/, "برای ۵۵ ساله نباید حرفِ ازدواج باشد");

  // ۴) کودک: رفتارِ قبلی دست‌نخورده — میکروسیتوزِ سنی (زیرِ کفِ ۷۷) الکتروفورز می‌خواهد
  const kid = run([r("Hemoglobin", "11.8", "g/dL"), r("MCV", "68", "fL"), r("RBC", "4.6", "10^6/µL")], BOY9).p;
  const kf = kid.findings.find((f) => ["microcytosis_no_anemia", "thal_trait_likely"].includes(f.pattern));
  assert.ok(kf, `یافتهٔ کودک نیامد: ${ids(kid)}`);
  assert.ok(kf.suggest.includes("الکتروفورز هموگلوبین"), `کودک باید همان رفتارِ قبلی را داشته باشد: ${kf.suggest}`);
});
