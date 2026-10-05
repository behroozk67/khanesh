// ============================================================
// lis1005.test.js — ۹۰ درخواستِ خروجیِ LIS یک بیمارستان (اکسل، بی‌ستونِ واحد)، ۲۰۲۶-۱۰-۰۵. فایلِ جدا تا با engine.test.js تداخل نکند.
// فقط سن/جنس/عدد — هیچ شناسهٔ بیمار در این فایل نیست. 🔴 L1–L9 هر نه روی HEAD (8e0d769) قرمزند (stash اندازه‌گیری شد).
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

