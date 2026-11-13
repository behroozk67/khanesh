// P144 (specs/026، Tietz فصلِ ۴۲ تیروئید — فقط شکاف‌ها). هر تست جز قفل‌های صریح روی HEAD 0935e85 قرمز بود (N10).
//   US1: کم‌کاریِ تیروئیدِ ثبت‌شده — TSH به‌عنوانِ بررسیِ دوز، همیشه شرطی («اگر لووتیروکسین مصرف می‌کنید»)
//   US2: TSH ≥ ۱۰ / < ۰٫۱ با FT4 طبیعی «خفیف» نیست؛ فوریت دست‌نخورده
//   US3: تیروگلوبولین خوانده و نقل می‌شود، بی‌حکم؛ زمینهٔ سرطانِ Anti-Tg می‌ماند
//   US4: آنتی‌بادیِ تیروئید در بارداری
//   US5: نوزادِ زیرِ ۳ روز — فقط زمانِ غربالگری، هیچ اطمینانی
//   US6: کفِ پیش‌فرضِ TSH بزرگسال ۰٫۴
import test from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";

const r = (name, value, unit, reference) => ({ name, value, ...(unit ? { unit } : {}), ...(reference ? { reference } : {}) });
const F = { age: 40, sex: "F" }, M = { age: 50, sex: "M" }, PG = { age: 30, sex: "F", pregnant: true };
const HYPO = { age: 50, sex: "F", conditions: ["hypothyroid"] };
const run = (tests, patient = F) => { const e = runEngine({ tests, patient }); return { e, out: runPatterns(e) }; };
const find = (out, id) => out.findings.find((f) => f.pattern === id);
const thy = (out) => out.findings.find((f) => f.rule_id === "thyroid" || /^thyroid_/.test(f.pattern));
const tsh = (v, ref) => r("TSH", String(v), "µIU/mL", ref);
const ft4 = (v) => r("FT4", String(v), "ng/dL");
const GRAVES = "شایع‌ترین علت آن بیماری خودایمنی گریوز است";

// ═══ US1 ═══
test("P144-R1a: کم‌کاریِ ثبت‌شده + TSH 0.2 ⇒ دوزِ قرص، شرطی؛ «گریوز» نه؛ فوریت routine؛ applied_conditions", () => {
  const f = find(run([tsh(0.2), ft4(1.6)], HYPO).out, "thyroid_hyper_subclinical");
  assert.ok(f);
  assert.match(f.must_say, /اگر لووتیروکسین/);
  assert.match(f.must_say, /0\.2/);
  assert.ok(!f.must_say.includes(GRAVES));
  assert.equal(f.urgency, "routine");
  assert.deepEqual(f.applied_conditions, ["hypothyroid"]);
});

test("P144-R1b: کم‌کاریِ ثبت‌شده + TSH 0.05 ⇒ «کمتر از ۰٫۱»، و جملهٔ C4 روی آن نمی‌نشیند", () => {
  const f = thy(run([tsh(0.05), ft4(1.3)], HYPO).out);
  assert.match(f.must_say, /کمتر از ۰٫۱/);
  assert.doesNotMatch(f.must_say, /دیگر نوعِ خفیف نیست/);
});

test("P144-R1c: کم‌کاریِ ثبت‌شده + TSH 8 ⇒ «دوزِ فعلی کافی نیست»؛ «اغلب فقط پیگیری» نه؛ routine", () => {
  const f = find(run([tsh(8), ft4(1.0)], HYPO).out, "thyroid_hypo_subclinical");
  assert.match(f.must_say, /اگر لووتیروکسین/);
  assert.match(f.must_say, /دوزِ فعلی کافی نیست/);
  assert.doesNotMatch(f.must_say, /اغلب فقط پیگیری/);
  assert.equal(f.urgency, "routine");
  assert.deepEqual(f.applied_conditions, ["hypothyroid"]);
});

test("P144-R1d: کم‌کاریِ ثبت‌شده + TSH 14 ⇒ «خیلی بالاتر»، بی C3 روی هم", () => {
  const f = thy(run([tsh(14), ft4(1.0)], HYPO).out);
  assert.match(f.must_say, /خیلی بالاتر/);
  assert.doesNotMatch(f.must_say, /حدی است که پزشکان معمولاً/);
});

test("P144-R1e: کم‌کاریِ ثبت‌شده + TSH 2 ⇒ هیچ یافتهٔ تیروئید", () => {
  assert.equal(thy(run([tsh(2), ft4(1.0)], HYPO).out), undefined);
});

test("P144-R1f: کم‌کاریِ ثبت‌شده + TPO بالا ⇒ «همان علتِ کم‌کاریِ شماست»، نه «به کم‌کاری می‌انجامد»", () => {
  const f = find(run([tsh(2), r("Anti-TPO", "60", "IU/mL", "<34")], HYPO).out, "thyroid_tpo_positive");
  assert.match(f.must_say, /همان علتِ کم‌کاریِ شماست/);
  assert.doesNotMatch(f.must_say, /به کم‌کاری تیروئید می‌انجامد/);
  assert.deepEqual(f.applied_conditions, ["hypothyroid"]);
});

test("P144-R1g (قفل): بی‌شرط، متنِ امروز می‌ماند («گریوز» و «اغلب فقط پیگیری»)؛ applied_conditions نیست", () => {
  const lo = find(run([tsh(0.2), ft4(1.6)]).out, "thyroid_hyper_subclinical");
  assert.ok(lo.must_say.includes(GRAVES));
  assert.equal(lo.applied_conditions, undefined);
  const hi = find(run([tsh(8), ft4(1.0)]).out, "thyroid_hypo_subclinical");
  assert.match(hi.must_say, /اغلب فقط پیگیری لازم دارد/);
});

// engineContext (server.js) فقط applied_conditions را جمع می‌کند — مثلِ H7، server.js وارد نمی‌شود (پایگاه‌داده باز می‌ماند).
test("P144-R1h: کم‌کاریِ ثبت‌شده فعال است و فقط وقتی به کار رفت «لحاظ‌شده» اعلام می‌شود", async () => {
  const { ACTIVE_CONDITIONS } = await import("./conditions.js");
  assert.ok(ACTIVE_CONDITIONS.has("hypothyroid"));
  assert.ok(run([tsh(8), ft4(1.0)], HYPO).out.findings.some((f) => f.applied_conditions?.includes("hypothyroid")));
  assert.ok(!run([r("Hb", "13.5", "g/dL")], HYPO).out.findings.some((f) => f.applied_conditions?.includes("hypothyroid")));
});

// ═══ US2 ═══
test("P144-R2a: TSH 10 و 14 با FT4 طبیعی ⇒ «حدی که پزشکان درمان را در نظر می‌گیرند»؛ «خفیف»/«اغلب فقط پیگیری» نه؛ this_week", () => {
  for (const v of [10, 14]) {
    const f = find(run([tsh(v), ft4(1.1)]).out, "thyroid_hypo_subclinical");
    assert.match(f.must_say, /حدی است که پزشکان معمولاً در آن درمان را در نظر می‌گیرند/, String(v));
    assert.doesNotMatch(f.must_say, /خفیف|اغلب فقط پیگیری/);
    // P144 پرسشِ ۱ (تصمیمِ کاربر ۲۰۲۶-۱۱-۱۳): routine ⇒ this_week
    assert.equal(f.urgency, "this_week");
  }
});

test("P144-R2b (قفل): TSH 9.9 ⇒ همان متنِ خفیفِ امروز", () => {
  const f = find(run([tsh(9.9), ft4(1.1)]).out, "thyroid_hypo_subclinical");
  assert.match(f.must_say, /این کم‌کاری خفیف \(«تحت‌بالینی»\) است/);
});

test("P144-R2c: TSH 0.099 و 0.05 با FT4 طبیعی ⇒ «دیگر نوعِ خفیف نیست»؛ routine", () => {
  for (const v of [0.099, 0.05]) {
    const f = find(run([tsh(v), ft4(1.3)], M).out, "thyroid_hyper_subclinical");
    assert.match(f.must_say, /کاملاً سرکوب شده و این دیگر نوعِ خفیف نیست/, String(v));
    assert.doesNotMatch(f.must_say, /پرکاری خفیف/);
    assert.equal(f.urgency, "routine");
  }
});

test("P144-R2d (قفل): TSH 0.1 ⇒ همان متنِ خفیفِ امروز", () => {
  const f = find(run([tsh(0.1), ft4(1.3)], M).out, "thyroid_hyper_subclinical");
  assert.match(f.must_say, /این پرکاری خفیف \(«تحت‌بالینی»\) است/);
});

test("P144-R2e: کودکِ ۹ ساله، TSH 12 با FT4 طبیعی ⇒ C3", () => {
  const f = find(run([tsh(12), ft4(1.1)], { age: 9, sex: "M" }).out, "thyroid_hypo_subclinical");
  assert.match(f.must_say, /حدی است که پزشکان معمولاً/);
});

// ═══ US3 ═══
const TG = (v = "2.5") => r("Thyroglobulin", v, "ng/mL");
const ATG = (v = "150") => r("Anti-Tg", v, "IU/mL", "<115");

test("P144-R3a: تیروگلوبولینِ تنها ⇒ thyroid_thyroglobulin، عدد نقل، «آزمایشِ تشخیصِ سرطان نیست»، unmapped نیست، routine", () => {
  const { e, out } = run([TG()]);
  const f = find(out, "thyroid_thyroglobulin");
  assert.ok(f);
  assert.match(f.must_say, /2\.5/);
  assert.match(f.must_say, /آزمایشِ تشخیصِ سرطان نیست/);
  assert.equal(f.urgency, "routine");
  assert.ok(!(e.unmapped ?? []).some((x) => /thyroglobulin/i.test(x.name ?? x)));
});

test("P144-R3b: Tg + Anti-Tg بالا با سرطان ⇒ جملهٔ Tg و سپس جملهٔ سرطانِ Anti-Tg («کاذب پایین»)", () => {
  const f = thy(run([TG("0.2"), ATG()], { ...F, conditions: ["cancer"] }).out);
  assert.match(f.must_say, /تیروگلوبولینِ شما 0\.2/);
  assert.match(f.must_say, /کاذب پایین/);
  assert.ok(f.must_say.indexOf("تیروگلوبولینِ شما") < f.must_say.indexOf("کاذب پایین"));
});

test("P144-R3c (قفل، FR-004a): Tg + Anti-Tg بالا بی‌شرطِ سرطان ⇒ همچنان زمینهٔ سرطان؛ «هاشیموتو»/«اغلب فقط پیگیری» نه", () => {
  const f = thy(run([TG("0.2"), ATG()]).out);
  assert.match(f.must_say, /در پیگیریِ پس از درمانِ سرطانِ تیروئید/);
  assert.doesNotMatch(f.must_say, /هاشیموتو|اغلب فقط پیگیری/);
});

test("P144-R3d: Tg + Anti-Tg منفی ⇒ «بعید است»", () => {
  const f = thy(run([TG(), r("Anti-Tg", "Negative")]).out);
  assert.match(f.must_say, /بعید است این آنتی‌بادی عددِ تیروگلوبولین را به هم زده باشد/);
});

test("P144-R3e: Tg تنها ⇒ پیشنهادِ Anti-Tg و جملهٔ «روی این برگه نیست»", () => {
  const f = find(run([TG()]).out, "thyroid_thyroglobulin");
  assert.ok(f.suggest.includes("آنتی‌بادی ضد تیروگلوبولین (Anti-Tg)"));
  assert.match(f.must_say, /Anti-Tg\) هم باید سنجیده شود؛ روی این برگه نیست/);
});

test("P144-R3f (قفل، N25): «Anti-Tg» تیروگلوبولین خوانده نمی‌شود و «TG» تری‌گلیسرید می‌ماند", () => {
  const a = run([ATG()]);
  assert.equal(find(a.out, "thyroid_thyroglobulin"), undefined);
  assert.equal(a.e.ungraded?.THYROGLOBULIN, undefined);
  const t = run([r("TG", "150", "mg/dL")]);
  assert.ok(t.e.graded.some((g) => g.test === "TG"));
  assert.equal(t.e.ungraded?.THYROGLOBULIN, undefined);
});

test("P144-R3g: ردیفِ تیروگلوبولین امتیازِ برگهٔ سالم را تغییر نمی‌دهد (N46/N57)", async () => {
  const { healthScore } = await import("./score.js");
  const base = [r("Hb", "13.5", "g/dL"), r("WBC", "7"), r("PLT", "250"), r("FBS", "88", "mg/dL"), r("Creatinine", "0.8", "mg/dL"), r("ALT", "20", "U/L")];
  const sc = (extra) => { const { e, out } = run([...base, ...extra]); return healthScore(e, out); };
  const clean = sc([]);
  for (const x of [[TG()], [TG("0.2"), r("Anti-Tg", "Negative")]]) {
    const s = sc(x);
    assert.equal(s.value, clean.value, JSON.stringify(x));
    assert.equal(s.band, clean.band);
  }
});

test("P144-R3h: متنِ تیروگلوبولین هیچ اطمینانِ «پاک/درمان‌شده» نمی‌دهد", () => {
  for (const tests of [[TG("0.05")], [TG("0.05"), r("Anti-Tg", "Negative")]]) {
    const f = thy(run(tests).out);
    assert.doesNotMatch(f.must_say, /تومور ندارید|پاک|درمان شده‌اید|بالاتر از|پایین‌تر از|داخلِ محدوده/);
  }
});

// ═══ US4 ═══
test("P144-R4a: باردار + TPO بالا + TSH طبیعی ⇒ C6؛ «اغلب فقط پیگیری» نه؛ routine", () => {
  const f = find(run([tsh(2), r("Anti-TPO", "60", "IU/mL", "<34")], PG).out, "thyroid_tpo_positive");
  assert.match(f.must_say, /چون باردار هستید، این یافته اهمیتِ بیشتری دارد/);
  assert.doesNotMatch(f.must_say, /اغلب فقط پیگیری/);
  assert.equal(f.urgency, "routine");
});

test("P144-R4b (قفل): غیرباردار ⇒ متنِ امروز", () => {
  const f = find(run([tsh(2), r("Anti-TPO", "60", "IU/mL", "<34")]).out, "thyroid_tpo_positive");
  assert.match(f.must_say, /اغلب فقط پیگیری لازم است/);
  assert.doesNotMatch(f.must_say, /باردار/);
});

test("P144-R4c: باردار + Anti-Tg بالا + TSH طبیعی ⇒ C6، بی «اغلب فقط پیگیری»", () => {
  const f = find(run([tsh(2), ATG()], PG).out, "thyroid_antibody_positive");
  assert.match(f.must_say, /چون باردار هستید/);
  assert.doesNotMatch(f.must_say, /اغلب فقط پیگیری/);
});

test("P144-R4d: باردار + کم‌کاریِ ثبت‌شده + TPO ⇒ C5 سپس C6", () => {
  const f = find(run([tsh(2), r("Anti-TPO", "60", "IU/mL", "<34")], { ...PG, conditions: ["hypothyroid"] }).out, "thyroid_tpo_positive");
  const i5 = f.must_say.indexOf("همان علتِ کم‌کاریِ شماست"), i6 = f.must_say.indexOf("چون باردار هستید");
  assert.ok(i5 > -1 && i6 > i5);
});

// ═══ US5 ═══
test("P144-R5a: نوزادِ ۲ روزه، TSH 20 ⇒ «روزِ ۳ تا ۵»، بی اطمینان؛ فوریت soon", () => {
  const f = thy(run([tsh(20)], { age: 2 / 365, sex: "M" }).out);
  assert.match(f.must_say, /روزِ ۳ تا ۵ پس از تولد/);
  assert.doesNotMatch(f.must_say, /فیزیولوژیک|طبیعی است/);
  assert.equal(f.urgency, "soon");
});

test("P144-R5b (قفل): نوزادِ ۱۰ روزه ⇒ بی C8؛ ۲ روزه با TSH 10 (داخلِ بازه) ⇒ بی یافته", () => {
  assert.doesNotMatch(thy(run([tsh(20)], { age: 10 / 365, sex: "M" }).out).must_say, /روزِ ۳ تا ۵/);
  assert.equal(thy(run([tsh(10)], { age: 2 / 365, sex: "M" }).out), undefined);
});

// ═══ US6 (commitِ جدا) ═══
test("P144-R6a: TSHِ بزرگسال 0.45 بی‌بازهٔ چاپی ⇒ طبیعی (کفِ ۰٫۴)؛ یافتهٔ پرکاری نه", () => {
  const { e, out } = run([tsh(0.45), ft4(1.2)]);
  assert.equal(e.graded.find((g) => g.test === "TSH").abnormal, false);
  assert.equal(thy(out), undefined);
});

test("P144-R6b: TSH 0.39 ⇒ پایین، همان متنِ تحت‌بالینیِ امروز", () => {
  const f = find(run([tsh(0.39), ft4(1.2)]).out, "thyroid_hyper_subclinical");
  assert.match(f.must_say, /0\.4–4\.5/);
  assert.match(f.must_say, /این پرکاری خفیف/);
});

test("P144-R6c: TSH 0.40 ⇒ طبیعی (لبه شامل، مثلِ ۰٫۵ ِ پیشین)", () => {
  assert.equal(run([tsh(0.4), ft4(1.2)]).e.graded.find((g) => g.test === "TSH").abnormal, false);
});

// ⚠️ TSH کلیدِ printed-first نیست: بازهٔ چاپی فقط می‌تواند «غیرطبیعیِ» موتور را وتو کند، نه خودش حکم بدهد. پس برگه‌ای با «0.5-4.5»
//   (یا Siemens «0.55-4.78») و TSH 0.45 دیگر پایین خوانده نمی‌شود. این رفتارِ واقعی است (spec US6-3 اشتباه فرض کرده بود)؛ پرسشِ P144.
test("P144-R6d (قفل): بازهٔ چاپی «0.5-4.5» با TSH 0.45 ⇒ طبیعی (بازهٔ موتور حکم می‌دهد)؛ 0.3 ⇒ پایین", () => {
  assert.equal(run([tsh(0.45, "0.5-4.5"), ft4(1.2)]).e.graded.find((x) => x.test === "TSH").abnormal, false);
  assert.equal(run([tsh(0.3, "0.5-4.5"), ft4(1.2)]).e.graded.find((x) => x.test === "TSH").dir, "low");
});

// ═══ بازبینیِ کد (۲۰۲۶-۱۱-۱۳، پس از 14b3838) — سه خطای متن، هر سه روی 14b3838 قرمز ═══
test("P144-R7a (N20/B5): کم‌کاریِ ثبت‌شده + تیروگلوبولین + TPO بالا ⇒ «هاشیموتو… یافتهٔ تازه‌ای نیست» کنارِ متنِ سرطان نمی‌آید", () => {
  for (const patient of [HYPO, { ...HYPO, conditions: ["cancer", "hypothyroid"] }, { ...F, conditions: ["cancer"] }]) {
    const f = thy(run([TG("0.5"), r("Anti-TPO", "300", "IU/mL", "<35"), tsh(1.0)], patient).out);
    assert.doesNotMatch(f.must_say, /هاشیموتو|یافتهٔ تازه‌ای نیست|اغلب فقط پیگیری/, JSON.stringify(patient));
    assert.match(f.must_say, /300/);
  }
});

test("P144-R7b: کم‌کاریِ ثبت‌شده + TSH 14 بی FT4 ⇒ هیچ جمله‌ای دوز را مسلم نمی‌گیرد؛ شاخهٔ «اگر دارو مصرف نمی‌کنید» هست", () => {
  const f = thy(run([tsh(14)], HYPO).out);
  assert.match(f.must_say, /اگر دارو مصرف نمی‌کنید/);
  assert.doesNotMatch(f.must_say, /برای تنظیمِ دوز، FT4/);
  assert.doesNotMatch(f.must_say, /(^|\. )پزشک دوز را با همین عدد تنظیم می‌کند/);
});

test("P144-R7c: سنِ ۰ (برگهٔ «0 Y») ⇒ جملهٔ غربالگریِ نوزاد نمی‌آید", () => {
  const f = thy(run([tsh(15)], { age: 0, sex: "M" }).out);
  assert.ok(f);
  assert.doesNotMatch(f.must_say, /روزِ ۳ تا ۵/);
});

// ═══ تصمیم‌های کاربر روی پرسش‌های بازبین (۲۰۲۶-۱۱-۱۳) ═══
test("P144-R8a (پرسشِ ۱): TSH 9.9 با FT4 طبیعی routine؛ 10 و 14 this_week (با و بی کم‌کاریِ ثبت‌شده)، بی ارجاعِ اجباری", () => {
  assert.equal(find(run([tsh(9.9), ft4(1.1)]).out, "thyroid_hypo_subclinical").urgency, "routine");
  for (const patient of [F, HYPO]) for (const v of [10, 14]) {
    const f = find(run([tsh(v), ft4(1.1)], patient).out, "thyroid_hypo_subclinical");
    assert.equal(f.urgency, "this_week", `${v} ${JSON.stringify(patient)}`);
    assert.ok(!f.suggest.includes("بررسی توسط متخصص غدد"));
    assert.match(f.action, /^این هفته/);
  }
});

test("P144-R8b (پرسشِ ۸): «کم‌کاری تیروئید» فقط وقتی به مدل می‌رسد که یافته‌ای آن را به کار برد", async () => {
  const { buildEnginePrompt } = await import("./prompt.js");
  const pl = (tests) => { const { e, out } = run(tests, HYPO); return JSON.parse(buildEnginePrompt(e, out, "", { conditions: ["hypothyroid"] }).content).patient; };
  assert.equal(pl([r("Hb", "9.5", "g/dL")])["بیماری_زمینه‌ای"], undefined);
  assert.deepEqual(pl([tsh(8), ft4(1.0)])["بیماری_زمینه‌ای"], ["کم‌کاری تیروئید"]);
});
