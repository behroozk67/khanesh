// closing_blocks.test.js — پاراگرافِ «موارد دیگر» و «مواردِ در محدوده» + عددِ چاپ‌شدهٔ برگه در فهرستِ بی‌توضیح (N5). ۲۰۲۶-۱۰-۱۳.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";
import { buildEngineFallbackResult, buildEnginePrompt } from "./prompt.js";
import { childBanner } from "./neonatal.js";
import { supplementaryParagraph, normalRangeParagraph } from "./printed.js";

const r = (name, value, unit = "") => ({ name, value, unit });
const CHILD = [r("WBC", "1.8", "10^3/uL"), r("RBC", "4.4", "10^6/uL"), r("Hb", "12.5", "g/dL"), r("HCT", "37", "%"), r("MCV", "92", "fL"),
  r("MCH", "28.4", "pg"), r("MCHC", "33", "g/dL"), r("PLT", "85", "10^3/uL"), r("Neut%", "45", "%"), r("Lymph%", "40", "%"),
  r("Mono%", "8", "%"), r("Eos%", "2", "%"), r("Baso%", "1", "%"), r("RDW-CV", "13", "%")];
const run = (tests, patient) => { const e = runEngine({ patient, tests }); return { e, p: runPatterns(e) }; };

test("CB1 — کودکِ ۵ ساله زیرِ اورژانس: تکمیلی‌ها بی‌برچسبِ شماره‌دار، در یک پاراگرافِ جدا", () => {
  const { p } = run(CHILD, { sex: "M", age: 5 });
  const sup = p.findings.filter((f) => f.supplementary);
  assert.ok(sup.length >= 2, "پیش‌شرط: چند تکمیلی");
  for (const f of sup) assert.doesNotMatch(f.must_say, /یافتهٔ تکمیلی \d/);
  const para = supplementaryParagraph(p);
  assert.match(para, /^موارد دیگرِ این برگه \(جدا از دستور اورژانسیِ بالا\): /);
  for (const f of sup) assert.ok(para.includes(f.must_say.trim().replace(/[.؟!]$/, "")), f.rule_id);
});

test("CB2 — مواردِ طبیعی: فقط graded و در محدوده، با عددِ برگه؛ غیرطبیعی‌ها نمی‌آیند؛ لحنِ سنِ کودک", () => {
  const { e } = run(CHILD, { sex: "M", age: 5 });
  const t = normalRangeParagraph(e);
  assert.match(t, /^مواردی که برای سنِ کودک در محدودهٔ طبیعی‌اند: /);
  assert.match(t, /هموگلوبین 12\.5/);
  assert.doesNotMatch(t, /گلبول سفید|پلاکت/, "غیرطبیعی‌ها نباید «طبیعی» شوند");
  assert.doesNotMatch(t, /[A-Z]{3,}_/, "کلیدِ خام (N8)");
  const adult = normalRangeParagraph(run([r("Hb", "14.5", "g/dL")], { sex: "M", age: 40 }).e);
  assert.match(adult, /^مواردی که در محدودهٔ طبیعی‌اند: /);
});

test("CB3 — N4: ردیفِ بی‌واحد (graded نشده) هرگز در پاراگرافِ طبیعی‌ها نمی‌آید", () => {
  const { e } = run([r("Bilirubin Total", "17"), r("Hb", "14.5", "g/dL")], { sex: "M", age: 40 });
  assert.ok(e.ungraded?.BILI_T && !e.graded.some((g) => g.test === "BILI_T"), "پیش‌شرط: بیلی‌روبینِ بی‌واحد graded نیست");
  assert.doesNotMatch(normalRangeParagraph(e), /بیلی‌روبین/);
});

test("CB4 — N5: درصدِ چاپ‌شده در فهرستِ بی‌توضیح و «مقدار روی برگه» دیده می‌شود، نه فقط شمارشِ محاسبه‌شده", () => {
  const { p } = run(CHILD, { sex: "M", age: 5 });
  const all = p.findings.map((f) => `${f.must_say} ${f.brief ?? ""} ${f.action}`).join(" ");
  assert.match(all, /ائوزینوفیل ٪2 \(شمارش مطلق 36/);
  assert.doesNotMatch(all, /ائوزینوفیل 36 \(طبیعی/);
  assert.match(all, /مونوسیت فرزندتان ٪8 است — شمارشِ مطلقِ مونوسیت 144 \(طبیعی 300–1100\)/);
});

test("CB5 — مسیرِ fallback (بی‌مدل): تکمیلی‌ها و طبیعی‌ها در پاراگرافِ جدا، تکمیلی در متنِ اصلی تکرار نمی‌شود", () => {
  const { e, p } = run(CHILD, { sex: "M", age: 5 });
  const text = buildEngineFallbackResult(e, p).interpretation;
  const paras = text.split("\n\n");
  assert.ok(paras.length >= 3, text);
  assert.match(paras.at(-2), /^موارد دیگرِ این برگه/);
  assert.match(paras.at(-1), /^مواردی که برای سنِ کودک/);
  const sup = p.findings.find((f) => f.supplementary);
  assert.equal(text.split(sup.must_say.trim().replace(/[.؟!]$/, "")).length - 1, 1, "جملهٔ تکمیلی دقیقاً یک بار");
});

// ---- P103 (تصمیمِ کاربر ۲۰۲۶-۱۰-۱۳): لحنِ والد برای WBC < 2 در کودک؛ علتِ کوتاه در شکلِ «موارد دیگر» ----
const findOf = (p, id) => p.findings.find((f) => f.rule_id === id);

test("CB6 — WBC < 2 در کودکِ ۵ ساله: لحنِ «فرزندتان»، تب ⇒ مستقیم اورژانس، فوریت emergency و blocks_others دست‌نخورده", () => {
  const f = findOf(run(CHILD, { sex: "M", age: 5 }).p, "leukopenia");
  assert.equal(f.urgency, "emergency");
  assert.equal(f.blocks_others, true);
  assert.match(f.headline, /فرزندتان/);
  assert.match(f.must_say, /^گلبول سفیدِ فرزندتان 1\.8 است/);
  assert.match(f.action, /^فرزندتان را همین امروز به اورژانس ببرید، حتی اگر تب ندارد/);
  assert.doesNotMatch(`${f.headline} ${f.must_say} ${f.action}`, /کودک شما|توان بدن/);
});

test("CB6b — بزرگسال و نوزادِ WBC < 2 متنِ قبلی را نگه می‌دارند (لحنِ والد فقط برای ۲۸ روز تا زیر ۱۲ سال)", () => {
  const adult = findOf(run([r("WBC", "1.8", "10^3/uL")], { sex: "F", age: 40 }).p, "leukopenia");
  assert.equal(adult.action, "بدون اتلاف وقت فوراً به اورژانس مراجعه کنید.");
  assert.ok(adult.warnings.some((w) => /حتی اگر تب ندارید، به اورژانس بروید/.test(w)));
  const teen = findOf(run([r("WBC", "1.8", "10^3/uL")], { sex: "F", age: 13 }).p, "leukopenia");
  assert.doesNotMatch(teen.must_say, /فرزندتان/);
});

test("CB7 — علتِ کوتاهِ پلاکت و MCV در پاراگرافِ «موارد دیگر» می‌آید (کودک و بزرگسال جدا)", () => {
  const c = run(CHILD, { sex: "M", age: 5 });
  const para = supplementaryParagraph(c.p);
  assert.match(para, /شایع‌ترین علتِ کاهشِ پلاکت یک عفونتِ ویروسی اخیر/);
  assert.match(para, /بزرگ بودنِ گلبول‌های قرمز در کودکان معمولاً با کمبودِ ویتامین B12 یا فولات/);
  const adult = run([r("WBC", "80", "10^3/uL"), r("Hb", "14.5", "g/dL"), r("PLT", "85", "10^3/uL"), r("MCV", "110", "fL")], { sex: "M", age: 50 });
  const aPara = supplementaryParagraph(adult.p);
  if (adult.p.findings.some((f) => f.supplementary && f.rule_id === "thrombocytopenia")) assert.match(aPara, /مصرفِ الکل، کمبودِ B12 یا فولات و بیماری‌های کبدی/);
  assert.doesNotMatch(aPara, /در کودکان/);
});

test("CB7b — بدونِ blocker علت دوبار نمی‌آید: متنِ کاملِ پلاکت/MCV تغییر نکرده و causes_brief فقط فیلد است", () => {
  const { p } = run([r("Hb", "14.5", "g/dL"), r("PLT", "85", "10^3/uL"), r("MCV", "100", "fL")], { sex: "M", age: 40 });
  assert.ok(!p.findings.some((f) => f.supplementary));
  assert.equal(supplementaryParagraph(p), "");
});

test("CB6c — آستانهٔ لحنِ والد ۱۲ سال است (تصمیمِ کاربر)؛ ۱۱ سال «فرزندتان»، ۱۳ سال «شما» با بازهٔ کودک", () => {
  const w = [r("WBC", "1.8", "10^3/uL")];
  assert.match(findOf(run(w, { sex: "F", age: 11 }).p, "leukopenia").must_say, /فرزندتان/);
  const teen = findOf(run(w, { sex: "F", age: 13 }).p, "leukopenia");
  assert.doesNotMatch(teen.must_say, /فرزندتان/);
  assert.match(teen.must_say, /شما/);
});

test("CB8 — بنرِ بالای صفحه برای کودکِ زیر ۱۲ با لحنِ والد؛ بزرگسال بنرِ سرور نمی‌گیرد", () => {
  const c = run(CHILD, { sex: "M", age: 5 });
  const b = childBanner(c.e, c.p);
  assert.match(b.body, /فرزندتان را همین حالا به نزدیک‌ترین اورژانس ببرید/);
  assert.doesNotMatch(b.body, /حالتان خوب است/);
  assert.equal(b.tone, "emergency", "قرمزِ پُر، نه کهربایی");
  const a = run([r("WBC", "1.8", "10^3/uL")], { sex: "F", age: 40 });
  assert.equal(childBanner(a.e, a.p), null);
});

test("CB9 — آزمایشی که تکمیلی دربارهٔ آن می‌گوید در abnormal_tests مدل نیست (تکرارِ پلاکت/MCV/لنفوسیت)", () => {
  const { e, p } = run(CHILD, { sex: "M", age: 5 });
  const payload = JSON.parse(buildEnginePrompt(e, p).content);
  const names = payload.abnormal_tests.map((x) => x.test).join(" ");
  assert.doesNotMatch(names, /پلاکت|MCV/);
});

test("CB10 — زن ۵۸ ساله، قندِ بسیار بالا: دو یافتهٔ قند یک فوریت دارند (نمای تخصصی دو برچسبِ رقیب نمی‌بیند)", () => {
  for (const [glu, want] of [["300", "soon"]]) {   // owner=emergency (DKA/HHS/>500): glycemia عمداً this_week می‌ماند (M91c: دو emergency برای یک عدد نه)
    const { p } = run([r("FBS", glu, "mg/dL")], { sex: "F", age: 58 });
    const g = p.findings.filter((f) => ["glycemia", "diabetes_range", "severe_hyperglycemia_uncertain_ketosis"].includes(f.pattern ?? f.rule_id));
    assert.ok(g.length >= 2, glu);
    assert.deepEqual([...new Set(g.map((f) => f.urgency))], [want], glu + " " + JSON.stringify(g.map((f) => f.pattern + f.urgency)));
  }
});

test("CB11 — نمای تخصصی: یافتهٔ پنهانِ قند زیرِ DKA/HHS هم «فوری» است، نه «این هفته»؛ فیلدِ موتور دست‌نخورده", async () => {
  const { buildExpertView } = await import("./expert.js");
  for (const rows of [[r("FBS", "650", "mg/dL")], [r("FBS", "520", "mg/dL"), r("Ketone", "Large")]]) {
    const { e, p } = run(rows, { sex: "F", age: 58 });
    const x = buildExpertView(e, p, null);
    const h = x.hidden.find((f) => /محدودهٔ دیابت/.test(f.label));
    assert.ok(h, "پیش‌شرط: یافتهٔ قند پنهان است");
    assert.equal(h.urgency, "emergency");
  }
});

test("CB12 — نمای تخصصی: کتونِ ادرار کنارِ dka_pattern هم «فوری» است؛ بدونِ DKA همان «این هفته» می‌ماند", async () => {
  const { buildExpertView } = await import("./expert.js");
  const k = (rows) => { const { e, p } = run(rows, { sex: "F", age: 58 }); return buildExpertView(e, p, null).findings.find((f) => /کتون/.test(f.label)); };
  assert.equal(k([r("FBS", "520", "mg/dL"), r("Ketone", "Large")]).urgency, "emergency");
  assert.notEqual(k([r("Ketone", "Large")])?.urgency, "emergency");
});
