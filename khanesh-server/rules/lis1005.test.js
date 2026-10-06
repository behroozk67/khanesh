// ============================================================
// lis1005.test.js — ۹۰ درخواستِ خروجیِ LIS یک بیمارستان (اکسل، بی‌ستونِ واحد)، ۲۰۲۶-۱۰-۰۵. فایلِ جدا تا با engine.test.js تداخل نکند.
// فقط سن/جنس/عدد — هیچ شناسهٔ بیمار در این فایل نیست. 🔴 L1–L9 هر نه روی HEAD (8e0d769) قرمزند (stash اندازه‌گیری شد). L10 روی 77ef435 قرمز است.
// ============================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";

const row = (name, value, unit = "") => ({ name, value, unit });
const run = (tests, patient = { sex: "F", age: 40 }) => {
  const e = runEngine({ patient, tests });
  return { e, p: runPatterns(e) };
};
const all = (p) => p.findings.map((f) => `${f.headline} ${f.must_say} ${[].concat(f.suggest ?? []).join(" ")}`).join(" ");
const known = (e, k) => e.graded.some((x) => x.test === k) || !!e.ungraded?.[k];

test("L1 — «Serum Ca/Mg/p» و «CK-MB II/CK MB 1» نگاشت می‌شوند (N2)", () => {
  const cases = [["Serum Ca", "9.1", "CA"], ["serum Mg", "2", "MG"], ["serum p", "4", "PHOS"], ["CK-MB II", "30", "CK_MB"], ["CK MB 1", "30", "CK_MB"]];
  for (const [n, v, k] of cases) {
    const { e } = run([row(n, v)]);
    assert.ok(known(e, k) && !e.unmapped.includes(n), `${n} → ${k} نگاشت نشد؛ unmapped: ${e.unmapped.join(",")}`);
  }
  // «Serum Protein» نباید به‌خاطرِ «serump» فسفر خوانده شود.
  assert.ok(!known(run([row("Serum Protein", "7")]).e, "PHOS"));
});

test("L2 — «PT INR» زیرِ ۸ همان INR است؛ ثانیهٔ PT هرگز INR خوانده نمی‌شود", () => {
  const { e, p } = run([row("PT", "19"), row("PT control", "12.5"), row("PT INR", "1.7"), row("PTT", "42")], { sex: "M", age: 40 });
  assert.equal(e.graded.find((x) => x.test === "INR")?.value, 1.7);
  assert.ok(!e.unmapped.includes("PT INR"));
  assert.ok(p.findings.some((f) => f.rule_id === "coagulation_abnormal"));
  // «PT/INR 13.5» (ثانیه) ⇒ INR 13.5 یعنی اورژانسِ کاذب. باید unmapped بماند.
  const s = run([row("PT/INR", "13.5")]);
  assert.ok(!known(s.e, "INR") && s.e.unmapped.includes("PT/INR"));
  assert.notEqual(s.p.overall_urgency, "emergency");
});

test("L3 — aPTTِ کوتاه کنارِ PTِ بالا گم نمی‌شود (M156، درخواستِ ۷۸)", () => {
  const { p } = run([row("PT", "14"), row("PTT", "22")], { sex: "F", age: 45 });
  const coag = p.findings.find((f) => f.rule_id === "coagulation_abnormal");
  assert.ok(coag, "coagulation_abnormal فعال نشد");
  assert.match(coag.must_say, /APTT شما 22 .*کوتاه‌تر از حد طبیعی/);
  assert.match(coag.brief, /APTT شما 22 .*کوتاه‌تر/);
  // جهتِ بالا دست‌نخورده: جملهٔ «کوتاه‌تر» نمی‌آید.
  const hi = run([row("PT", "19"), row("PTT", "42")]).p.findings.find((f) => f.rule_id === "coagulation_abnormal");
  assert.doesNotMatch(hi.must_say, /کوتاه‌تر/);
});

test("L4 — بیلی‌روبینِ چاپ‌شده با واحدِ نامعلوم «روی برگه نیست» خوانده نمی‌شود و دوباره درخواست نمی‌شود (N4/N8)", () => {
  const { p } = run([row("AST", "35"), row("ALT", "26"), row("LDH", "864"), row("T. Bilirubin(Clot)", "0.41"), row("Direct Bili.", "0.1")], { sex: "F", age: 32 });
  const ldh = p.findings.find((f) => f.rule_id === "isolated_ldh_elevation");
  assert.ok(ldh, "isolated_ldh_elevation فعال نشد");
  assert.doesNotMatch(ldh.must_say, /هیچ‌کدام از این سه روی برگهٔ شما نیست/);
  assert.match(ldh.must_say, /بیلی‌روبین روی برگهٔ شما هست/);
  assert.ok(!ldh.suggest.some((s) => /بیلی‌روبین/.test(s)), `دوباره درخواست شد: ${ldh.suggest.join(" / ")}`);
  // کنترلِ منفی: بی‌بیلی‌روبین همان درخواستِ قبلی می‌ماند.
  const none = run([row("AST", "35"), row("ALT", "26"), row("LDH", "864")]).p.findings.find((f) => f.rule_id === "isolated_ldh_elevation");
  assert.ok(none.suggest.some((s) => /بیلی‌روبین/.test(s)));
});

test("L5 — جملهٔ آمیلازِ بی‌لیپاز کامل است", () => {
  const { p } = run([row("Amylase", "171")]);
  const t = all(p);
  assert.match(t, /آمیلاز/);
  assert.doesNotMatch(t, /چون آنزیم لیپاز می‌تواند/);
});

test("L6 — منیزیمِ چاپ‌شده با واحدِ نامعلوم «اندازه‌گیری نشده» خوانده نمی‌شود (N4، درخواستِ ۶)", () => {
  const { e, p } = run([row("Serum K", "3.2", "mmol/L"), row("serum Mg", "1.91")], { sex: "F", age: 15 });
  assert.ok(e.ungraded?.MG, "پیش‌شرط: منیزیم بی‌واحد باید ungraded باشد");
  const k = p.findings.find((f) => f.rule_id === "potassium_critical");
  assert.ok(k, "potassium_critical فعال نشد");
  assert.doesNotMatch(k.must_say, /منیزیم روی این برگه اندازه‌گیری نشده/);
  assert.match(k.must_say, /منیزیم روی برگهٔ شما چاپ شده/);
  assert.ok(!k.suggest.includes("منیزیم"), "منیزیمِ چاپ‌شده دوباره درخواست شد");
  // کنترلِ منفی: بی‌منیزیم، جمله و درخواست همان قبلی‌اند.
  const none = run([row("Serum K", "3.2", "mmol/L")], { sex: "F", age: 15 }).p.findings.find((f) => f.rule_id === "potassium_critical");
  assert.match(none.must_say, /منیزیم روی این برگه اندازه‌گیری نشده/);
  assert.ok(none.suggest.includes("منیزیم"));
});

test("L7 — کفِ «این هفته»ِ عددِ بی‌واحد فقط برای دو خوانشِ باورپذیرِ هم‌جهت (P88)", () => {
  const uu = (n, v, patient = { sex: "F", age: 31 }) => run([row(n, v)], patient).p.findings.find((f) => f.rule_id === "unit_unknown_values");
  // اورهٔ ۱۱: پایین با mg/dL، بالا با mmol/L ⇒ جمله درست می‌ماند ولی کفِ «این هفته» نه.
  const lo = uu("urea", "11");
  assert.match(lo.must_say, /با هر کدام از دو واحد/);
  assert.equal(lo.urgency, "routine");
  // اورهٔ ۶۰: با هر دو واحد *بالا* ⇒ کف می‌ماند.
  assert.equal(uu("urea", "60").urgency, "this_week");
  // قندِ ۱۴۲: خوانشِ ۲۵۵۸ mg/dL باورپذیر نیست ⇒ کفی از «همه غیرطبیعی» نمی‌آید.
  assert.notEqual(uu("Blood Sugar", "142", { sex: "F", age: 58 }).urgency, "this_week");
});

// ── L8: جاروبِ «چاپ‌شده ولی بی‌نمره» (P88، N4/N8). هر کلیدِ دوواحدی بی‌واحد چاپ می‌شود (⇒ ungraded) کنارِ یک آزمایشِ غیرطبیعیِ
//    دیگر؛ هیچ جمله‌ای نباید آن را «روی برگه نیست / اندازه‌گیری نشده» بخواند و هیچ پیشنهادی نباید دوباره درخواستش کند.
//    روی HEAD هفت یافته داشت: isolated_ldh_elevation، isolated_thrombocytopenia، pth_isolated_abnormal (کلسیم، فسفر)،
//    ckmb_high (تروپونین)، و پیشنهادهای کلسیم/فسفر/منیزیم/ویتامین D/B12.
import { ADULT_REFS } from "./refs.js";
import { faName } from "./names.js";
import { UNIT_PROFILE } from "./units.js";
import { NAME_MAP } from "./adapter.js";
test("L8 — هیچ قاعده‌ای عددِ چاپ‌شدهٔ بی‌واحد را «روی برگه نیست» نمی‌خواند و دوباره درخواستش نمی‌کند", () => {
  // ماشه‌ها: *همهٔ* کلیدهای ADULT_REFS، با اولین نامِ NAME_MAP که به آن می‌رسد — فهرستِ دستی myoglobin_result را جا انداخت.
  const NAME = Object.fromEntries(Object.keys(ADULT_REFS).map((k) => [k, Object.keys(NAME_MAP).find((n) => NAME_MAP[n] === k)]).filter(([, n]) => n));
  const AMB = { UREA: 30, CREAT: 0.9, GLU_RANDOM: 100, BILI_T: 0.6, BILI_D: 0.2, CA: 9.2, MG: 2.0, PHOS: 3.5, ALB: 4.3, TP: 7,
    CHOL: 180, LDL: 100, HDL: 50, TG: 120, IRON: 90, URIC: 5, B12: 400, FOLATE: 10, VIT_D: 30, FT4: 1.2, TROPONIN_I: 2, HGB: 14 };
  const ABS = /(روی (این )?برگه(ٔ شما)? (نیست|نیستند|نیامده)|اندازه‌گیری نشده|روی برگه چاپ نشده)/;
  const bad = new Set(); let probed = 0;
  for (const amb of Object.keys(AMB).filter((k) => UNIT_PROFILE[k])) {
    const fa = faName(amb);
    const named = new RegExp("(^|[\\s(«،])" + fa);   // ⚠️ رشتهٔ معمولی با «\\s»: در template literal «\s» فقط «s» می‌شد و سبزِ بی‌معنا می‌داد (N15)
    for (const [tk, nm] of Object.entries(NAME)) {
      if (tk === amb) continue;
      const b = ADULT_REFS[tk]?.M ?? ADULT_REFS[tk]?.both; if (!b) continue;
      for (const tv of [b[1] != null ? b[1] * 1.6 : null, b[0] > 0 ? b[0] * 0.6 : null].filter((x) => x != null)) {
        const tests = [row(nm, String(+tv.toPrecision(4)), ADULT_REFS[tk].unit ?? ""), row(amb === "TROPONIN_I" ? "Troponin I" : amb, String(AMB[amb]))];
        const { e, p } = run(tests, { sex: "M", age: 45 });
        if (!e.ungraded?.[amb]) continue;
        probed++;
        for (const f of p.findings) {
          const txt = [f.headline, f.must_say, f.brief ?? "", ...[].concat(f.warnings ?? [])].join(" ");
          for (const s of txt.split(/[.؛!]/)) if (named.test(s) && ABS.test(s)) bad.add(`${f.rule_id}::${amb} «${s.trim().slice(0, 90)}»`);
          for (const s of [].concat(f.suggest ?? [])) if (s === fa || s.startsWith(`${fa} `)) bad.add(`${f.rule_id}::${amb} suggest «${s}»`);
        }
      }
    }
  }
  assert.ok(probed > 1500, `جاروب چیزی نسنجید (${probed}) — سبزِ بی‌معنا (N15)`);
  assert.deepEqual([...bad], []);
});

test("L9 — aPTTِ ۲۶ در کودکِ ۲ تا ۱۲ ساله پایین نیست؛ شیرخوار همان بازهٔ قبلی را دارد (P88)", () => {
  for (const age of [2, 5, 11, 12]) {
    const { e, p } = run([row("PT", "12.4"), row("PTT", "26")], { sex: "M", age });
    const a = e.graded.find((x) => x.test === "APTT");
    assert.ok(a && !a.abnormal, `سنِ ${age}: aPTT 26 ⇒ ${a?.range} ${a?.dir}`);
    assert.ok(!p.findings.some((f) => /aPTT 26/.test(f.must_say)), `سنِ ${age}: هنوز در «توضیح داده نشدند»`);
  }
  // شیرخوارِ ۶ ماهه: ردیفِ ۲۸–۴۵ دست‌نخورده.
  assert.equal(run([row("PTT", "26")], { sex: "M", age: 0.5 }).e.graded.find((x) => x.test === "APTT")?.dir, "low");
  // کرانِ بالا دست‌نخورده: ۴۶ در کودکِ ۵ ساله هنوز طولانی است.
  assert.equal(run([row("PTT", "46")], { sex: "M", age: 5 }).e.graded.find((x) => x.test === "APTT")?.dir, "high");
});


test("L10 — کراتینینِ کودکِ ۳ تا ۱۶ ساله با بازهٔ Jaffe (Ghasemi 2015) سنجیده می‌شود، جنس‌محور از ۹ سالگی (P88)", async () => {
  const { getRefSource } = await import("./refs.js");
  const cr = (v, patient) => run([row("Creatinine", v, "mg/dL")], patient).e.graded.find((x) => x.test === "CREAT");
  // کراتینینِ سالمِ Jaffe که بازهٔ آنزیمیِ قبلی «بالا» می‌زد.
  for (const [v, age, sex] of [["0.7", 4, "F"], ["0.7", 8, "F"], ["0.6", 5, "M"], ["0.8", 11, "M"], ["0.79", 9, "M"]]) {
    const g = cr(v, { sex, age });
    assert.ok(g && !g.abnormal, `${sex} ${age} سال، کراتینین ${v} ⇒ ${g?.range} ${g?.dir}`);
  }
  // مرزِ گروه: کودکِ «۶ ساله» در گروهِ ۶–۹ (۰٫۶–۰٫۹) است، نه ۳–۶.
  assert.equal(cr("0.85", { sex: "F", age: 6 })?.abnormal, false);
  // جنس: ۱۳ سالهٔ پسر با ۱٫۰۵ طبیعی، دختر بالا؛ جنسِ نامعلوم ⇒ اجتماعِ دو بازه ⇒ هشدارِ کاذب نمی‌دهد.
  assert.equal(cr("1.05", { sex: "M", age: 13 })?.abnormal, false);
  assert.equal(cr("1.05", { sex: "F", age: 13 })?.dir, "high");
  assert.equal(cr("1.05", { age: 13 })?.abnormal, false);
  // کرانِ بالا هنوز کار می‌کند: ۱٫۵ در ۸ ساله بالاست.
  assert.equal(cr("1.5", { sex: "M", age: 8 })?.dir, "high");
  // برچسبِ منبع راست می‌گوید (N8/G6): ردیفِ Jaffe ادعای RCPCH نمی‌کند.
  assert.match(getRefSource("CREAT", 8), /Ghasemi/);
  assert.match(getRefSource("CREAT", 1), /RCPCH/);
});

// باگِ ۱ (بازبینیِ ۲۳۶ درخواستِ LIS، ۲۰۲۶-۱۰-۰۵): افتراقیِ بی‌واحدِ < ۲۰ به‌جای درصد ×۱۰۰۰ مطلق می‌شد —
// CBCِ طبیعی «مونوسیتوز/ائوزینوفیلی/بازوفیلی» و لنفوسیتِ ۱۵٪ «لنفوسیتوز» می‌گرفت (۶۸ درخواست). تصمیم از خودِ برگه: جمع ≈ ۱۰۰ یا مطلق > WBC.
test("L11 — افتراقیِ بی‌واحدِ LIS درصد خوانده می‌شود، Sysmex و دوقلوی «NEUT%/NEUT» مطلق می‌ماند (N3/N31)", () => {
  const abs = (e, k) => e.graded.find((x) => x.test === k)?.value;
  const ids = (p) => p.findings.map((f) => f.pattern || f.id);
  // ۱) CBCِ طبیعیِ LIS: جمع = ۱۰۰ ⇒ درصد. هیچ یافتهٔ سلولی.
  {
    const { e, p } = run([row("WBC", "7.8"), row("Neutrophils", "62"), row("Lymphocytes", "28"), row("Monocytes", "7"), row("Eosinophils", "2.5"), row("Basophils", "0.5")]);
    assert.equal(abs(e, "MONO_ABS"), 546);
    assert.equal(abs(e, "EOS_ABS"), 195);
    assert.equal(abs(e, "BASO_ABS"), 39);
    for (const id of ["monocytosis", "eosinophilia", "basophilia", "viral_lymphocytosis", "cll_suspicion_nccn"]) assert.ok(!ids(p).includes(id), `${id} روی CBCِ طبیعی فعال شد`);
  }
  // ۲) WBCِ خام (۷۸۰۰) و ردیفِ Mixed هم شاهدِ جمع‌اند.
  assert.equal(abs(run([row("WBC", "7800"), row("Neutrophils", "70"), row("Lymphocytes", "18"), row("Monocytes", "9"), row("Eosinophils", "3")]).e, "LYMPH_ABS"), 1404);
  assert.equal(abs(run([row("WBC", "6"), row("Neutrophils", "75"), row("Lymphocytes", "15"), row("Mixed", "10")]).e, "LYMPH_ABS"), 900);
  // ۳) ردیفِ تنها: لنفوسیتِ ۱۵ هزار از WBCِ ۷٫۸ هزار بیشتر است ⇒ درصد.
  assert.equal(abs(run([row("WBC", "7.8"), row("Lymphocytes", "15")]).e, "LYMPH_ABS"), 1170);
  // ۴) کنترلِ منفی — Sysmexِ مطلقِ بی‌واحد (جمع ≈ WBC) همان مطلقِ قبلی است.
  {
    const { e } = run([row("WBC", "7.1"), row("NEUT", "4.31"), row("LYMPH", "2.1"), row("MONO", "0.5"), row("BASO", "0.03")]);
    assert.equal(abs(e, "NEUT_ABS"), 4310);
    assert.equal(abs(e, "MONO_ABS"), 500);
  }
  // ۵) کنترلِ منفی — «NEUT%» کنارِ «NEUT»ِ بی‌واحد: دومی دوقلوی مطلق است، حتی وقتی جمعِ درصدها ≈ ۱۰۰.
  assert.equal(abs(run([row("WBC", "7.1"), row("NEUT%", "60.7", "%"), row("LYMPH%", "29.6", "%"), row("MONO%", "7", "%"), row("NEUT", "4.31"), row("LYMPH", "2.1")]).e, "NEUT_ABS"), 4310);
  // ۶) لکوسیتوزِ واقعی با مطلق‌های بی‌واحد (WBC ≥ ۸۰): جمعِ ≈ ۱۰۰ شاهد نیست.
  assert.equal(abs(run([row("WBC", "100"), row("NEUT", "85"), row("LYMPH", "10"), row("MONO", "5")]).e, "LYMPH_ABS"), 10000);
});

// باگِ ۲ (بازبینیِ ۲۳۶ درخواستِ LIS، ۲۰۲۶-۱۰-۰۵، درخواستِ [129]): برگهٔ ترکیبیِ CBC + ادرار — «WBC 68»ِ بی‌واحدِ میکروسکوپیِ ادرار
// جای WBCِ 7.8 ِ CBC را می‌گرفت (آخرین مقدار برنده) ⇒ `extreme_leukocytosis` اورژانسِ کاذب و نوتروفیلِ ۵۲٬۲۲۴. هویتِ ردیف از همسایه‌هایش (N25).
test("L12 — WBC/RBCِ عددیِ ادرار روی برگهٔ ترکیبی جای شمارشِ خون را نمی‌گیرد؛ تعارضِ بی‌شاهد سنجیده نمی‌شود (N25)", () => {
  const val = (e, k) => e.graded.find((x) => x.test === k)?.value;
  const cbc = [row("W.B.C", "7.8"), row("R.B.C", "4.42"), row("Hb", "13.4", "g/dL"), row("Hct", "39.2"), row("M.C.V", "89"), row("Platelet", "221"),
    row("Neut", "76.8"), row("Lymphocyte", "18.3"), row("Mixed", "4.9")];
  // ۱) شکلِ [129]: ادرار بعد از CBC.
  {
    const { e, p } = run([...cbc, row("WBC", "68"), row("RBC", "20-25"), row("Epithelial", "4-6")]);
    assert.equal(val(e, "WBC"), 7.8);
    assert.equal(val(e, "NEUT_ABS"), 5990);
    assert.ok(!p.findings.some((f) => /leukocytosis/.test(f.rule_id ?? f.pattern)), "لکوسیتوزِ کاذب از WBCِ ادرار");
    assert.ok(Object.entries(e.qual).some(([k, v]) => /wbc/i.test(k) && v === "68"), "WBCِ ادرار به qual نرفت (بی‌صدا گم شد، N2)");
  }
  // ۲) ادرار پیش از CBC (ردیفِ مرزی هر دو جور همسایه دارد) — هنوز WBCِ خون همان 7.8 است.
  assert.equal(val(run([row("Color", "Yellow"), row("WBC", "15"), row("RBC", "2-3"), ...cbc]).e, "WBC"), 7.8);
  // ۳) RBCِ عددیِ ادرار جای RBCِ CBC را نمی‌گیرد.
  assert.equal(val(run([...cbc, row("Epithelial", "1-2"), row("RBC", "3"), row("WBC", "1-2")]).e, "RBC"), 4.42);
  // ۴) دو WBCِ متفاوت بی‌هیچ شاهدِ ادرار: نمی‌دانیم کدام خون است ⇒ هیچ‌کدام سنجیده نمی‌شود، هر دو در «تفسیر نشدند».
  {
    const { e } = run([row("WBC", "7.8"), row("Hb", "13", "g/dL"), row("WBC", "15")]);
    assert.equal(val(e, "WBC"), undefined);
    assert.equal(e.unmapped.filter((n) => n === "WBC").length, 2);
  }
  // ۵) کنترلِ منفی — ردیفِ تکراریِ همان مقدار، و ادرارِ بازه‌ای («1-2») رفتارِ قبلی را دارند.
  assert.equal(val(run([row("WBC", "7.8"), row("Hb", "13", "g/dL"), row("WBC", "7.8")]).e, "WBC"), 7.8);
  assert.equal(val(run([...cbc, row("WBC", "1-2"), row("RBC", "0-1")]).e, "WBC"), 7.8);
});

// باگِ ۴ (بازبینیِ ۲۳۶ درخواستِ LIS، ۲۰۲۶-۱۰-۰۵، درخواستِ [64]): زیرِ اورژانسِ پتاسیم، نسخهٔ کوتاهِ `unit_unknown_values` فقط نام‌ها را داشت —
// «اوره ۱۴۹، کراتینین ۲٫۸» (با هر واحدی خارج از محدوده) هیچ‌جای گزارش نبود (N18/N5).
test("L13 — زیرِ اورژانسِ دیگر، عددهای واحدنامعلوم و جملهٔ «خارج از محدوده»شان دیده می‌شوند (N18)", () => {
  const { p } = run([row("K", "7", "mmol/L"), row("urea", "149"), row("Creatinine", "2.8"), row("Hb", "15.4")], { sex: "M", age: 60 });
  const uu = p.findings.find((f) => (f.rule_id ?? f.pattern) === "unit_unknown_values");
  assert.ok(p.findings.some((f) => (f.rule_id ?? f.pattern) === "potassium_critical" && f.urgency === "emergency"), "پیش‌شرط: اورژانسِ پتاسیم (وگرنه نسخهٔ کوتاه آزموده نمی‌شود، N15)");
  assert.ok(uu, "unit_unknown_values پنهان شد");
  for (const n of ["149", "2.8", "15.4"]) assert.ok(uu.must_say.includes(n), `عددِ ${n} در متنِ نمایش‌داده نیست: ${uu.must_say}`);
  assert.match(uu.must_say, /اوره \(149\): [^.]*خارج از محدود/);
  // جهت هرگز گفته نمی‌شود (اصلِ فایل).
  assert.doesNotMatch(uu.must_say, /بالا|پایین/);
});

// باگِ ۳ (بازبینیِ ۲۳۶ درخواستِ LIS، ۲۰۲۶-۱۰-۰۵؛ P89، تصمیمِ کاربر): Hbِ بی‌واحد در ۱۶۹ از ۱۶۹ درخواست `unit_unknown` بود ⇒ ۲۴ بیمارِ میکروسیتیک
// بی‌یافتهٔ کم‌خونی. دستگاه MCHC/MCH را از خودِ Hb حساب می‌کند، پس آن‌ها واحد را تعیین می‌کنند (نه بزرگیِ عدد).
test("L14 — واحدِ Hbِ بی‌واحد از MCHC/Hct یا MCH/RBCِ همان برگه؛ شاخصِ ناممکن یا ناسازگار تعیین نمی‌کند (P89)", async () => {
  const { buildNormalResult } = await import("./prompt.js");
  const hgb = (e) => e.graded.find((x) => x.test === "HGB");
  const ids = (p) => p.findings.map((f) => f.rule_id ?? f.pattern);
  // ۱) کم‌خونیِ میکروسیتیک دیده می‌شود (قبلاً فقط «واحد نامعلوم»).
  {
    const { e, p } = run([row("Hb", "10.1"), row("Hct", "33"), row("MCHC", "30.6"), row("RBC", "5.6"), row("MCH", "18"), row("MCV", "59")]);
    assert.equal(hgb(e)?.value, 10.1);
    assert.equal(e.unitConversions.find((c) => c.test === "HGB")?.basis, "indices");
    assert.ok(ids(p).includes("microcytic_anemia"), ids(p).join(","));
    assert.ok(!ids(p).includes("unit_unknown_values"));
  }
  // ۲) g/L با Hct کسری و MCHCِ g/L — همان سازگاری، سیستمِ دیگر.
  assert.equal(hgb(run([row("Hb", "134"), row("Hct", "0.39"), row("MCHC", "343")]).e)?.value, 13.4);
  // ۳) فقط MCH/RBC (بی‌Hct).
  assert.equal(hgb(run([row("Hb", "13.4"), row("RBC", "4.42"), row("MCH", "30")]).e)?.value, 13.4);
  // ۴) کنترل‌های منفی — خطای ورودِ «Hb = RBC» با MCHC 12 ([3])، شاخصِ ناسازگار، و Hbِ تنها: واحد نامعلوم می‌ماند.
  for (const rows of [
    [row("Hb", "4.38"), row("Hct", "36"), row("MCHC", "12"), row("RBC", "4.38"), row("MCH", "10")],
    [row("Hb", "13.4"), row("Hct", "39"), row("MCHC", "25")],
    [row("Hb", "13.4")],
  ]) {
    const { e } = run(rows);
    assert.equal(hgb(e), undefined, JSON.stringify(rows));
    assert.equal(e.ungraded.HGB?.reason, "unit_unknown");
  }
  // ۵) واحدِ چاپ‌شده همچنان مقدم است (decideUnit پیش از شاخص‌ها).
  assert.equal(e2u(run([row("Hb", "13.4", "g/dL"), row("Hct", "39.2"), row("MCHC", "34")]).e), "printed");
  // ۶) پیامد: برگهٔ «همه طبیعی» با ردیفِ ناشناخته دیگر «نتایج شما طبیعی است» نمی‌گوید (N4).
  {
    const { e } = run([row("Hb", "13"), row("Hct", "38.8"), row("MCHC", "34"), row("Blood", "2+"), row("Leuko estr", "Positive")]);
    assert.ok(e.unmapped.length > 0, "پیش‌شرط: ردیفِ ناشناخته (وگرنه شاخه آزموده نمی‌شود)");
    const r = buildNormalResult(e);
    assert.doesNotMatch(r.summary, /نتایج آزمایش شما در محدوده طبیعی است/);
    assert.match(r.summary, /تفسیر نشدند/);
  }
});
const e2u = (e) => e.unitConversions.find((c) => c.test === "HGB")?.basis ?? (e.graded.some((x) => x.test === "HGB") ? "printed" : null);

// ═══ باگِ ۵ (بازبینیِ ۲۳۶ درخواست، ۲۰۲۶-۱۰-۰۶، N25): نوارِ ادرارِ برگهٔ ترکیبیِ CBC + ادرار ═══
const COMBINED = (extra = []) => [
  row("W.B.C", "6.8"), row("Hb", "12.5"), row("Hct", "37.5"), row("M.C.V", "87"), row("Platelet", "223"),
  row("Color", "Yellow"), row("PH", "Neutral"), row("Protein", "1+"), row("Blood", "3+"), row("Glucose", "3+"),
  row("Urobilinogen", "negative"), row("Bilirubin", "negative"), row("Nitrite", "Negative"), row("Leuko estr", "Positive"),
  row("Yeast pseudo", "Few"), row("Mycelium", "Negative"), row("Sp.Gravity", "1.010"), row("WBC", "1-2"), row("RBC", "1-2"),
  ...extra,
];
test("L15 — نوارِ ادرار روی برگهٔ ترکیبی خوانده می‌شود؛ عدد سرم می‌ماند؛ بی‌شاهدِ نوار حدس نمی‌زند (N25)", () => {
  // ۱) [205]: Blood/Protein/Glucose/Leuko estr/Yeast دیگر «تفسیر نشدند» نیستند و قاعده‌های ادرار آن‌ها را می‌بینند.
  {
    const { e, p } = run(COMBINED(), { sex: "F", age: 62 });
    for (const n of ["Protein", "Blood", "Glucose", "Bilirubin", "Leuko estr", "Yeast pseudo", "Mycelium"]) {
      assert.ok(!e.unmapped.includes(n), `${n} هنوز unmapped است: ${e.unmapped.join(",")}`);
    }
    assert.equal(e.qual["Urine Blood"], "3+");
    assert.equal(e.qual["Urine Glucose"], "3+");
    assert.equal(e.qual["Leukocyte Esterase"], "Positive");
    const ids = p.findings.map((f) => f.rule_id);
    assert.ok(ids.includes("glycosuria_pattern") && ids.includes("proteinuria_pattern"), ids.join(","));
    // شمارشِ خون دست نخورد (N25 در جهتِ دیگر).
    assert.equal(e.graded.find((x) => x.test === "WBC")?.value, 6.8);
    assert.equal(e.graded.find((x) => x.test === "PLT")?.value, 223);
  }
  // ۲) کنترلِ منفی: عددِ قند روی همان صفحه قندِ خون است، نه نوار.
  {
    const rows = COMBINED().map((t) => (t.name === "Glucose" ? row("Glucose", "95", "mg/dL") : t));
    const { e } = run(rows);
    assert.ok(e.graded.some((x) => /^GLU/.test(x.test) && x.value === 95), JSON.stringify(e.graded.map((x) => x.test)));
    assert.equal(e.qual["Urine Glucose"], undefined);
  }
  // ۳) کنترلِ منفی: CBC + «Protein 1+»ِ تنها، بی‌وزنِ مخصوص/نیتریت/استراز/اوروبیلینوژن ⇒ حدس نمی‌زنیم.
  {
    const { e } = run([row("W.B.C", "6.8"), row("Hb", "12.5"), row("Protein", "1+"), row("Blood", "2+")]);
    assert.ok(e.unmapped.includes("Protein") && e.unmapped.includes("Blood"), e.unmapped.join(","));
  }
  // ۴) استراز با املای LIS بیرون از فهرستِ بسته ⇒ «تفسیر نشدند» (N6)، نه مثبت.
  assert.ok(run([row("Leuko estr", "see comment")]).e.unmapped.includes("Leuko estr"));
});

test("L15b — گلوکوزوری قندِ خونِ همان برگه را می‌خواند؛ آزمایشِ چاپ‌شده دوباره خواسته نمی‌شود (N4/N8)", () => {
  const gly = (extra) => run(COMBINED(extra), { sex: "M", age: 23 }).p.findings.find((f) => f.rule_id === "glycosuria_pattern");
  // چاپ‌شدهٔ بی‌واحد ([140]: Blood Sugar 131)
  const a = gly([row("Blood Sugar", "131")]);
  assert.match(a.must_say, /چاپ شده/);
  assert.doesNotMatch(a.action, /آزمایش قند خون بدهید/);
  // سنجیده‌شده
  const b = gly([row("F.B.S", "180", "mg/dL")]);
  assert.match(b.must_say, /180/);
  assert.match(b.must_say, /بالاتر از حد طبیعی/);
  assert.doesNotMatch(b.action, /آزمایش قند خون بدهید/);
  // غایب: متنِ قبلی بایت‌به‌بایت
  const c = gly([]);
  assert.match(c.must_say, /باید با آزمایش قند خون بررسی شود\.$/);
  assert.equal(c.action, "این هفته با پزشک مطرح کنید و آزمایش قند خون بدهید.");
});

// ═══ باگِ ۶ (بازبینیِ ۲۳۶ درخواست، ۲۰۲۶-۱۰-۰۶): موردهای جدا ═══
const find = (p, id) => p.findings.find((f) => f.rule_id === id);
test("L16 — [66] WBCِ بالا «روی برگه نیست» خوانده نمی‌شود (N4)؛ لنفوسیتِ درجهٔ ۳ CTCAE «موقتی» نیست", () => {
  const rows = [row("W.B.C", "23.9"), row("Hb", "12.5", "g/dL"), row("Platelet", "828"), row("Mixed", "6.4"), row("Neut", "6.6"), row("Lymph", "87")];
  const { p } = run(rows, { sex: "M", age: 38 });
  const mn = find(p, "mild_neutropenia");
  assert.ok(mn, p.findings.map((f) => f.rule_id).join(","));
  assert.doesNotMatch(mn.must_say, /روی این برگه نیست/);
  assert.match(mn.must_say, /23\.9/);
  assert.doesNotMatch(mn.must_say + mn.action, /موقتی|چند هفته|نوبتِ عادی/);
  const vl = find(p, "viral_lymphocytosis");
  assert.match(vl.must_say, /20793/);
  assert.doesNotMatch(vl.must_say, /موقتی است/);
  assert.equal(vl.urgency, "this_week");
  // کنترل: لنفوسیتِ ۶۰۰۰ (درجهٔ ۲) همان متنِ قبلی را دارد.
  const v2 = find(run([row("WBC", "9.5"), row("Neut", "30"), row("Lymph", "63"), row("Mixed", "7")], { sex: "M", age: 38 }).p, "viral_lymphocytosis");
  assert.match(v2.must_say, /معمولاً موقتی است/);
  assert.equal(v2.urgency, "routine");
});

test("L16b — [3] MCHC/MCHِ ناممکن نام برده می‌شوند و «Hb = RBC» گفته می‌شود؛ شاخصِ ممکن یافته نمی‌سازد", () => {
  const rows = [row("W.B.C", "6.4"), row("R.B.C", "4.38"), row("Hb", "4.38"), row("Hct", "35.4"), row("M.C.V", "81"), row("M.C.H", "10"), row("M.C.H.C", "12"), row("Platelet", "339")];
  const { p } = run(rows, { sex: "M", age: 8 });
  const f = find(p, "rbc_indices_impossible");
  assert.ok(f, p.findings.map((x) => x.rule_id).join(","));
  assert.match(f.must_say, /MCHC 12/);
  assert.match(f.must_say, /MCH 10/);
  assert.match(f.must_say, /4\.38/);
  assert.doesNotMatch(f.action, /امروز|این هفته|اورژانس|نوبت/);   // زمانِ رقیب نمی‌گذارد (N20)
  const un = find(p, "unexplained_abnormal");
  assert.ok(!un || !/MCHC|MCH /.test(un.must_say), un?.must_say);
  // کنترل: شاخص‌های ممکن (MCHC 33، MCH 29) هیچ یافتهٔ «ناممکن» نمی‌سازند.
  assert.ok(!find(run([row("Hb", "12", "g/dL"), row("Hct", "36"), row("MCHC", "33"), row("MCH", "29"), row("RBC", "4.1")]).p, "rbc_indices_impossible"));
});

test("L16c — liver_pattern عددِ آنزیم‌ها را می‌گوید ([38])؛ شاخهٔ عضله CK و AST را زیرِ درجهٔ ۳ هم می‌گوید ([22]) (N5)", () => {
  const a = find(run([row("ALT", "96"), row("AST", "147"), row("ALP", "556")], { sex: "M", age: 8 }).p, "liver_pattern");
  assert.match(a.must_say, /96/);
  assert.match(a.must_say, /147/);
  const b = find(run([row("ALT", "24"), row("AST", "73"), row("CPK", "1424")], { sex: "M", age: 6 }).p, "liver_pattern");
  assert.match(b.headline, /عضله/);
  assert.match(b.must_say, /1424/);
  assert.match(b.must_say, /73/);
});

// ═══ P91 (تصمیمِ کاربر ۲۰۲۶-۱۰-۰۶): پاسخِ منابع به پرسش‌های P90 ═══
test("L17 — [199] TTP/HUS فقط با نشانهٔ همولیز نام برده می‌شود؛ بی‌آن لام و LDH ِ فوری؛ فوریت همان اورژانس", () => {
  const base = [row("Hb", "8.6", "g/dL"), row("Platelet", "42"), row("WBC", "4.8")];
  const none = find(run(base, { sex: "F", age: 57 }).p, "maha_ttp_suspicion");
  assert.equal(none.urgency, "emergency");
  assert.doesNotMatch(none.must_say, /TTP|HUS/);
  assert.match(none.must_say, /لامِ خون/);
  const ldhHi = find(run([...base, row("LDH", "900", "U/L")], { sex: "F", age: 57 }).p, "maha_ttp_suspicion");
  assert.match(ldhHi.must_say, /TTP/);
  assert.match(ldhHi.must_say, /LDH 900/);
  const ldhOk = find(run([...base, row("LDH", "180", "U/L")], { sex: "F", age: 57 }).p, "maha_ttp_suspicion");
  assert.doesNotMatch(ldhOk.must_say, /TTP|HUS/);
  assert.match(ldhOk.must_say, /LDH 180 \(طبیعی\)/);   // نشانگرِ سنجیده‌شده در هر جهت نام برده می‌شود (N21)
});

test("L17b — CK ِ کودک ≥ ۵×سقف ⇒ کفِ soon؛ بزرگسال و کودکِ زیرِ ۵× دست نمی‌خورند", () => {
  const solo = find(run([row("CPK", "2000")], { sex: "M", age: 8 }).p, "ck_elevated_alone");
  assert.equal(solo.urgency, "soon");
  assert.match(solo.action, /۲۴ تا ۴۸ ساعت/);
  assert.match(solo.must_say, /نباید فقط به ورزش نسبت داد/);
  const mus = find(run([row("CPK", "2000"), row("AST", "90"), row("ALT", "20")], { sex: "M", age: 8 }).p, "liver_pattern");
  assert.match(mus.headline, /عضله/);
  assert.equal(mus.urgency, "soon");
  // کنترل‌ها
  assert.notEqual(find(run([row("CPK", "2000")], { sex: "M", age: 30 }).p, "ck_elevated_alone")?.urgency, "soon");
  assert.notEqual(find(run([row("CPK", "1424"), row("AST", "73"), row("ALT", "24")], { sex: "M", age: 6 }).p, "liver_pattern").urgency, "soon");
});

test("L17c — لنفوسیتوز + Hb < ۱۱ یا پلاکت < ۱۰۰ (Rai) در هر بزرگسال ⇒ soon؛ کنارش «موقتی» گفته نمی‌شود (N20)", () => {
  const cyto = run([row("WBC", "30"), row("Lymph", "80"), row("Neut", "15"), row("Mixed", "5"), row("Hb", "9.5", "g/dL"), row("Platelet", "250")], { sex: "M", age: 35 });
  const c = find(cyto.p, "cll_suspicion_nccn");
  assert.equal(c?.urgency, "soon", cyto.p.findings.map((f) => f.rule_id).join(","));
  assert.match(c.must_say, /هموگلوبین 9\.5/);
  assert.ok(!find(cyto.p, "viral_lymphocytosis"));
  // ≥ ۵۰ بی‌سیتوپنی: همان this_week، و viral_lymphocytosis دیگر کنارش «موقتی» نمی‌گوید.
  const old = run([row("WBC", "12"), row("Lymph", "70"), row("Neut", "25"), row("Mixed", "5"), row("Hb", "14", "g/dL"), row("Platelet", "250")], { sex: "M", age: 60 });
  assert.equal(find(old.p, "cll_suspicion_nccn")?.urgency, "this_week");
  assert.ok(!find(old.p, "viral_lymphocytosis"));
  // کنترل: جوان بی‌سیتوپنی ⇒ CLL نه.
  const young = run([row("WBC", "12"), row("Lymph", "70"), row("Neut", "25"), row("Mixed", "5"), row("Hb", "14", "g/dL"), row("Platelet", "250")], { sex: "M", age: 30 });
  assert.ok(!find(young.p, "cll_suspicion_nccn"));
  assert.ok(find(young.p, "viral_lymphocytosis"));
});

test("L17d — [38] مدفوعِ سیاه + کم‌خونیِ میکروسیتیک ⇒ soon و explains؛ «Dark brown» یا Hbِ طبیعی ⇒ نه", () => {
  const { e, p } = run([row("Stool Color", "Black"), row("Hb", "10", "g/dL"), row("MCV", "65")], { sex: "M", age: 40 });
  const f = find(p, "melena_microcytic_anemia");
  assert.equal(f?.urgency, "soon");
  assert.deepEqual(f.explains, ["STOOL_COLOR"]);
  assert.ok(!e.unmapped.includes("Stool Color"));
  assert.ok(!find(run([row("Stool Color", "Dark brown"), row("Hb", "10", "g/dL"), row("MCV", "65")], { sex: "M", age: 40 }).p, "melena_microcytic_anemia"));
  const ok = run([row("Stool Color", "Black"), row("Hb", "15", "g/dL"), row("MCV", "88")], { sex: "M", age: 40 });
  assert.ok(!find(ok.p, "melena_microcytic_anemia"));
  assert.ok(ok.e.noRef.includes("STOOL_COLOR"), "بی‌یافته، رنگِ مدفوع باید در خطِ «تفسیر نشدند» بماند");
});
