// برگهٔ واقعی ۲۰۲۶-۱۰-۰۷ (بیمارستان شفا، ICU، مرد ۴۴ ساله): بازبینیِ بالینیِ خروجیِ موتور — چهار اصلاح.
//   S1 لنفوسیتِ پایین مالک نداشت و «توضیحِ آماده نداریم» می‌گرفت (N1/N18)  ⇒ قاعدهٔ lymphopenia
//   S2 لنفوسیت/ائوزینوفیلِ مطلق روی برگه نیست (برگه درصد دارد)               ⇒ جمله درصدِ چاپ‌شده را می‌گوید (N5)
//   S3 سرتیترِ قند «در محدودهٔ دیابت» نبود و متن نه عددِ قند را می‌گفت نه نوعش را ⇒ سرتیتر + عدد + جملهٔ استرسِ حاد
//   S4 «حد طبیعی ۱۵۰–۴۰۰» وقتی برگه ۱۵۰–۴۵۰ چاپ کرده بود                      ⇒ بازهٔ چاپ‌شده کنارِ بازهٔ موتور
import test from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";

const r = (name, value, unit, reference) => ({ name, value, ...(unit ? { unit } : {}), ...(reference ? { reference } : {}) });
const SHAFA = [
  r("W.B.C", "8.5", "x1000/mm3", "4-10"), r("R.B.C", "3.9", "Mill/mm3", "M:4.5-6.0;F:4.2-5.2"), r("Hb", "12.9", "gm/dl"),
  r("Hct", "37.8", "%"), r("M.C.V", "97", "fl", "80-96"), r("M.C.H", "33", "Pgm", "26-34"), r("M.C.H.C", "34", "gr/dl", "32-36"),
  r("Platelet", "127", "x1000/mm3", "150-450"),
  r("Neut", "77.3", "%", "45-75"), r("Lymphocyte", "8.9", "%", "20-45"), r("Monocyte", "7.5", "%", "2-10"), r("Eosinophil", "6.2", "%", "2-5"),
  r("Blood Sugar", "221", "mg/dl", "70-140"), r("urea", "35", "mg/dl", "15-45"), r("Creatinine", "0.86", "mg%", "0.5-1.5"),
  r("Serum Na", "136", "meq/l", "135-145"), r("Serum K", "4.2", "meq/l", "3.5-5"),
];
const run = (tests, patient = { age: 44, sex: "M" }) => {
  const e = runEngine({ patient, tests });
  return { e, p: runPatterns(e) };
};
const find = (p, id) => p.findings.find((f) => f.pattern === id);

test("S1: لنفوسیتِ پایین مالک دارد؛ فوریت همان کفِ تورِ ایمنی و عددِ برگه در متن است", () => {
  const { e, p } = run(SHAFA);
  const f = find(p, "lymphopenia");
  assert.ok(f, `lymphopenia فعال نشد؛ فعال‌شده‌ها: ${p.findings.map((x) => x.pattern)}`);
  assert.equal(f.urgency, "routine", "CTCAE درجهٔ ۲ ⇒ همان routineِ تورِ ایمنی");
  assert.match(f.must_say, /لنفوسیت شما ٪8\.9 است \(حد طبیعی روی برگه ٪20–45\)/, "درصد گزارش می‌شود");
  assert.ok(!/757/.test(f.must_say), "عددِ مطلقِ مشتق نباید در متن باشد");
  assert.equal(f.key_number, 8.9, "key_number همان عددِ متن است");
  assert.ok(!(p.findings.find((x) => x.pattern === "unexplained_abnormal")?.must_say ?? "").includes("757"), "لنفوسیت نباید دوباره در «توضیح داده نشدند» بیاید");
  assert.ok(!e.graded.some((g) => g.test === "NEUT_ABS" && g.abnormal), "پیش‌فرضِ پنل: نوتروفیلِ مطلق در محدوده است");
  assert.match(f.must_say, /نوتروفیل شما[\s\S]*در محدودهٔ طبیعی است/, "جملهٔ نوتروفیل سه‌حالته: طبیعی");
});

test("S1b: لنفوسیتِ شدید ⇒ این هفته؛ نوتروفیلِ بالا و نبودنِ نوتروفیل هر کدام جملهٔ خود را دارند (N4)", () => {
  const sev = run([r("WBC", "4.0"), r("Lymph#", "400", "/µL"), r("Neut#", "3000", "/µL")]);
  const f = find(sev.p, "lymphopenia");
  assert.ok(f, "lymphopenia فعال نشد");
  assert.equal(f.urgency, "this_week");
  assert.match(f.headline, /بسیار پایین/);
  const hiNeut = run([r("WBC", "13.0"), r("Lymph#", "700", "/µL"), r("Neut#", "11000", "/µL")]);
  assert.match(find(hiNeut.p, "lymphopenia")?.must_say ?? "", /نوتروفیل شما بالاتر از حد طبیعی است/);
  const noNeut = run([r("WBC", "5.0"), r("Lymph#", "700", "/µL")]);
  assert.match(find(noNeut.p, "lymphopenia")?.must_say ?? "", /شمارشِ نوتروفیل روی این برگه نیست/);
});

test("S1c: زیرِ pancytopenia کنار می‌کشد (دو یافته دربارهٔ یک عدد نه، N20)", () => {
  const { p } = run([r("WBC", "1.8"), r("Hb", "8.0", "g/dL"), r("PLT", "40"), r("Lymph#", "400", "/µL"), r("Neut#", "1200", "/µL")]);
  assert.ok(find(p, "pancytopenia"), "پنل باید pancytopenia بدهد");
  assert.ok(!find(p, "lymphopenia"), "lymphopenia نباید کنارِ pancytopenia بیاید");
});

test("S2: عددِ مطلقِ مشتق با درصدِ چاپ‌شده گفته می‌شود؛ وقتی مطلق چاپ شده، همان عدد", () => {
  const { p } = run(SHAFA);
  assert.match(find(p, "lymphopenia").must_say, /٪8\.9 است/);
  assert.match(find(p, "eosinophilia").must_say, /ائوزینوفیل شما ٪6\.2 است \(حد طبیعی روی برگه ٪2–5\)/);
  assert.ok(!/757|527/.test(find(p, "lymphopenia").must_say + find(p, "eosinophilia").must_say), "عددِ مطلقِ مشتق نباید بیاید");
  const abs = run([r("WBC", "8.5"), r("Eos#", "527", "/µL")]);
  const f = find(abs.p, "eosinophilia");
  assert.ok(f, "eosinophilia فعال نشد");
  assert.ok(!f.must_say.includes("٪"), "عددِ مطلقِ چاپ‌شده نباید ادعای «درصدِ چاپ‌شده» کند");
  assert.match(f.must_say, /ائوزینوفیل شما 527 است/);
});

test("S3: قندِ تصادفیِ ۲۲۱ — سرتیترِ «در محدودهٔ دیابت»، عدد، جملهٔ استرسِ حاد؛ حکم و فوریت بی‌تغییر", () => {
  const { p } = run(SHAFA);
  const f = find(p, "diabetes_range");
  assert.ok(f);
  assert.match(f.headline, /در محدودهٔ دیابت است؛ تشخیص با تکرار/);
  assert.match(f.must_say, /قندِ تصادفیِ شما 221/);
  assert.match(f.must_say, /بستری، عفونت، جراحی/);
  assert.match(f.must_say, /باید یک بار دیگر تکرار شود/, "حکم: یک آزمایشِ تنها قطعی نیست (ADA 2.1b)");
  assert.equal(f.urgency, "this_week");
  assert.ok(!/دیابت دارید/.test(f.must_say + f.headline), "هیچ‌جا «دیابت دارید» نمی‌گوید");
});

test("S3b: دو آزمایشِ مستقل ⇒ سرتیترِ بی‌«تکرار»؛ قندِ ناشتا بی‌جملهٔ استرس", () => {
  const two = run([r("FBS", "140", "mg/dL"), r("HbA1c", "7.0", "%")]);
  const f = find(two.p, "diabetes_range");
  assert.equal(f.headline, "قند خون شما در محدودهٔ دیابت است");
  assert.ok(!/بستری، عفونت/.test(f.must_say));
  const fbs = run([r("FBS", "140", "mg/dL")]);
  const g = find(fbs.p, "diabetes_range");
  assert.match(g.must_say, /قندِ ناشتای شما 140/);
  assert.ok(!/بستری، عفونت/.test(g.must_say), "جملهٔ استرسِ حاد فقط برای قندِ تصادفیِ تنها");
});

test("S4: بازهٔ چاپ‌شدهٔ برگه کنارِ بازهٔ موتور؛ بی‌تفاوت یا ناهم‌مقیاس ⇒ هیچ", () => {
  const { e, p } = run(SHAFA);
  assert.equal(e.printedRanges.PLT, "150–450");
  assert.match(find(p, "thrombocytopenia").must_say, /\(حد طبیعی 150–400؛ روی برگهٔ شما 150–450\)/);
  assert.ok(e.graded.some((g) => g.test === "PLT" && g.abnormal && g.dir === "low"), "حکم عوض نشده: پلاکت ۱۲۷ همچنان پایین است");
  // کنترلِ منفی: بازهٔ چاپی همان بازهٔ موتور
  const same = run([r("WBC", "6"), r("Hb", "13", "g/dL"), r("Platelet", "127", "x1000/mm3", "150-400")]);
  assert.equal(same.e.printedRanges, undefined);
  assert.ok(!/روی برگهٔ شما/.test(find(same.p, "thrombocytopenia")?.must_say ?? ""));
  // بازهٔ ردیفِ درصدی (۲–۵٪) بازهٔ EOS_ABS نیست
  assert.equal(e.printedRanges.EOS_ABS, undefined);
  assert.ok(!/روی برگهٔ شما 2/.test(find(p, "eosinophilia").must_say));
  // بازهٔ ناهم‌مقیاس (۴۰۰–۱۰۰۰ برای PLT) نادیده گرفته می‌شود
  const odd = run([r("WBC", "6"), r("Platelet", "127", "x1000/mm3", "150000-450000")]);
  assert.equal(odd.e.printedRanges?.PLT, undefined);
});

// ── ادامهٔ P98 (۲۰۲۶-۱۰-۰۸): الگوی Hb↓ + PLT↓ + لنفوسیت↓ و جملهٔ بستری ──
test("S5: Hb↓ + PLT↓ + لنفوسیت↓ یک یافتهٔ مشترک می‌دهد؛ عددها در متن، یک زمان‌بندی، بی‌نامِ بیماری", () => {
  const { p } = run(SHAFA);
  const f = find(p, "cytopenia_triplet");
  assert.ok(f, `cytopenia_triplet فعال نشد؛ فعال‌شده‌ها: ${p.findings.map((x) => x.pattern)}`);
  assert.equal(f.urgency, "this_week", "مورد ملایم (همه درجهٔ ≤ ۲): کفِ this_week، نه ۲۴ تا ۴۸ ساعت");
  assert.ok(!/۲۴ تا ۴۸/.test(f.action));
  assert.match(f.must_say, /هموگلوبین 12\.9[\s\S]*پلاکت 127[\s\S]*٪8\.9/);
  assert.match(f.must_say, /این جمله تشخیص نیست/);
  const lym = find(p, "lymphopenia");
  assert.ok(lym, "lymphopenia همچنان باید بیاید (محتوای علت‌ها)");
  for (const id of ["thrombocytopenia", "normocytic_anemia"]) {
    const g = find(p, id);
    assert.ok(g, id);
    assert.ok(!/این هفته|همین امروز|نوبت با پزشک|نوبتِ عادی/.test(g.action), id + " دومین زمان‌بندی دارد: " + g.action);
  }
  assert.ok(!/این هفته|همین امروز|نوبتِ عادی/.test(lym.action), `lymphopenia دومین زمان‌بندی دارد: ${lym.action}`);
  assert.ok(!/لوسمی|سرطان|ام‌دی‌اس/.test(f.must_say + f.headline), "نام بیماری نباید بیاید");
});

test("S5b: کنترل‌های منفی — Hb طبیعی، یا pancytopenia ⇒ الگوی سه‌گانه نیست", () => {
  const normalHb = run(SHAFA.map((x) => (x.name === "Hb" ? r("Hb", "15.2", "gm/dl") : x)));
  assert.ok(!find(normalHb.p, "cytopenia_triplet"), "Hb طبیعی ⇒ سه‌گانه نیست");
  const pan = run([r("WBC", "1.8"), r("Hb", "8.0", "g/dL"), r("PLT", "40"), r("Lymph#", "400", "/µL"), r("Neut#", "1200", "/µL")]);
  assert.ok(!find(pan.p, "cytopenia_triplet"), "زیرِ pancytopenia کنار می‌کشد");
});

test("S6: ترومبوسیتوپنی جملهٔ شرطیِ بستری/هپارین دارد و فوریت عوض نشده", () => {
  const { p } = run([r("WBC", "6"), r("Hb", "14.5", "g/dL"), r("Platelet", "127", "x1000/mm3")]);
  const f = find(p, "thrombocytopenia");
  assert.ok(f);
  assert.equal(f.urgency, "this_week");
  assert.ok(f.warnings.some((w) => /بستری هستید یا هپارین/.test(w)));
});

test("S7: نوتروفیلِ ٪77.3 با بازهٔ چاپیِ ۴۵–۷۵ ولی مطلقاً طبیعی ⇒ تناقض صریح گفته می‌شود، نه سکوت", () => {
  const { p } = run(SHAFA);
  const m = find(p, "lymphopenia").must_say;
  assert.match(m, /نوتروفیل شما ٪77\.3 است \(حد طبیعی روی برگه ٪45–75\)؛ ولی با احتساب تعداد کلِ گلبول‌های سفید، شمارشِ واقعیِ آن در محدودهٔ طبیعی است/);
  assert.ok(!/در محدودهٔ طبیعی است و در محدودهٔ طبیعی/.test(m), "حکم دوبار تکرار نشود");
});

test("S5c: یکی از سه کاهش CTCAE درجهٔ ≥ ۳ ⇒ soon (۲۴ تا ۴۸ ساعت)", () => {
  const { p, e } = run([r("WBC", "6.0"), r("Hb", "7.6", "g/dL"), r("PLT", "120"), r("Lymph#", "700", "/µL"), r("Neut#", "4000", "/µL")]);
  assert.ok(e.graded.find((g) => g.test === "HGB" && g.level === "marked"), "پیش‌فرض: Hb سطحِ marked (درجهٔ ۳)");
  const f = find(p, "cytopenia_triplet");
  assert.ok(f, `فعال‌شده‌ها: ${p.findings.map((x) => x.pattern)}`);
  assert.equal(f.urgency, "soon");
  assert.match(f.action, /۲۴ تا ۴۸ ساعت/);
});

test("S8: بیمارِ بستری — جملهٔ ارجاعِ زمان‌بندی نیمه نمی‌ماند و جملهٔ شرطیِ «اگر بستری هستید» نمی‌آید", () => {
  const { p } = run(SHAFA, { age: 44, sex: "M", conditions: ["hospitalized"] });
  for (const id of ["lymphopenia", "thrombocytopenia", "normocytic_anemia"]) {
    const g = find(p, id);
    assert.ok(g, id);
    assert.match(g.action, /زمان‌بندیِ پیگیری را یافتهٔ «کاهشِ هم‌زمانِ سه ردهٔ خون» می‌گوید\./, `${id}: ارجاع نیمه ماند: ${g.action}`);
  }
  const t = find(p, "thrombocytopenia");
  assert.ok(!t.warnings.some((w) => /اگر بستری هستید/.test(w)), "برای بیمارِ بستری شرطی بی‌معنا است");
  assert.ok(t.warnings.some((w) => /افتِ پلاکت نسبت به روزهای قبل/.test(w)), "محتوا می‌ماند");
  assert.ok(!/اگر بستری هستید/.test(find(p, "cytopenia_triplet").must_say));
});
