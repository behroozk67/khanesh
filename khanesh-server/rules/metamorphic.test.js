// ============================================================
// metamorphic.test.js — رابطه‌هایی که برای *هر* قاعده، از جمله قاعده‌های آینده، باید برقرار بمانند (P84، CLAUDE.md N31).
// این فایل هیچ قاعده‌ای را به اسم نمی‌شناسد: موتور را روی جفت‌ورودی‌های مرتبط اجرا می‌کند و فقط رابطهٔ دو خروجی را می‌سنجد.
// در دو دورِ ۲۰۲۶-۱۰-۰۵ همین رابطه‌ها ۱۰ باگ یافتند که ۱۰۵۰ تستِ موردی و خواندنِ کد ندیده بودند.
//   MM1 یکنواختی: عدد دورتر از بازه ⇒ فوریت کمتر نمی‌شود.
//   MM2 افزایشی: افزودنِ یک آزمایش ⇒ فوریتِ برگه کمتر نمی‌شود (جز استثناهای صریح و توضیح‌دار).
//   MM3 قالبِ عدد: ارقامِ فارسی، فاصله، صفرِ انتهایی، کامای اعشاری، واحدِ چسبیده در خانهٔ عدد ⇒ همان خروجی.
//   MM4 املا: همهٔ املاهای NAME_MAP برای یک کلید ⇒ همان خروجی.
//   MM5 ترتیب و تکرارِ ردیف ⇒ همان خروجی؛ MM6 عددِ غیرطبیعی هرگز بی‌صدا نیست.
// ⚠️ اگر یکی قرمز شد، اول بپرسید کدام قاعده رابطه را شکست؛ استثنا فقط با دلیلِ بالینیِ نوشته‌شده در ALLOWED_DROPS، و
//    هر استثنا هر بار با t.diagnostic دیده می‌شود و اگر دیگر رخ ندهد قرمز می‌شود (استثنای بی‌صدا همان N15 است).
// ============================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { runEngine, NAME_MAP } from "./adapter.js";
import { runPatterns } from "./patterns.js";
import { ADULT_REFS, getRef } from "./refs.js";

const RANK = { none: 0, routine: 1, this_week: 2, soon: 3, emergency: 4 };
// نامِ چاپی برای کلیدهایی که خودِ کلید نامِ قابلِ‌خواندن نیست.
const NAME = {
  NEUT_ABS: "NEUT#", LYMPH_ABS: "LYMPH#", MONO_ABS: "MONO#", EOS_ABS: "EOS#", BASO_ABS: "BASO#", BAND_ABS: "Band#",
  UREA_N: "BUN", CREAT: "Creatinine", GLU_F: "FBS", GLU_RANDOM: "Blood Sugar", BILI_T: "Total Bilirubin",
  BILI_D: "Direct Bilirubin", BILI_I: "Indirect Bilirubin", U_CA: "24h Urine Calcium", HAPTO: "Haptoglobin",
  FIB: "Fibrinogen", PCT_SEPSIS: "Procalcitonin", CRP_Q: "CRP quantitative", OSM: "Serum Osmolality",
  TESTO: "Testosterone", CORTISOL_DST: "Cortisol DST", PH: "pH",
};
const fmt = (v) => String(+(+v).toPrecision(4));
const rowOf = (key, v) => ({ name: NAME[key] ?? key, value: fmt(v), unit: ADULT_REFS[key].unit ?? "" });
const quiet = (fn) => { const e = console.error, w = console.warn; console.error = console.warn = () => {}; try { return fn(); } finally { console.error = e; console.warn = w; } };
function run(patient, tests) {
  return quiet(() => {
    const e = runEngine({ patient, tests });
    const p = runPatterns(e);
    return { e, p, u: RANK[p.overall_urgency] ?? -1, ids: p.findings.map((f) => f.rule_id).sort().join(",") };
  });
}
// امضای خروجی: هر یافته با فوریت و متن. دو تورِ «بی‌توضیح» (unmatched_abnormal، unexplained_abnormal) استثنا هستند: اینکه کدام
// عدد در کدام‌یک بیاید به ترتیبِ ردیف بسته است، ولی هر دو عدد نام برده می‌شوند — پس برای آن دو فقط مجموعهٔ عددهای نام‌برده سنجیده می‌شود.
const NETS = new Set(["unmatched_abnormal", "unexplained_abnormal"]);
const sig = (r) => {
  const nets = r.p.findings.filter((f) => NETS.has(f.rule_id));
  const netNums = nets.flatMap((f) => String(f.must_say).match(/\d+(?:\.\d+)?/g) ?? []).sort().join(",");
  return r.p.overall_urgency + "|" + nets.map((f) => `${f.rule_id}:${f.urgency}`).sort().join(",") + "|" + netNums + "|" +
    r.p.findings.filter((f) => !NETS.has(f.rule_id))
      .map((f) => `${f.rule_id}:${f.urgency}§${f.headline}§${f.must_say}§${f.action ?? ""}`).sort().join("¶");
};
const graded = (r, k) => r.e.graded.find((g) => g.test === k);
function levels(key, sex = "M") {
  const ref = ADULT_REFS[key]; const r = ref[sex] ?? ref.both; if (!r) return [];
  const [lo, hi] = r; const out = [];
  if (hi != null) out.push(["H1", hi * 1.3], ["H3", hi * 4]);
  if (lo > 0) out.push(["L1", lo * 0.75], ["L3", lo * 0.3]);
  return out;
}
const M45 = { sex: "M", age: 45 };
// کلیدهایی که با نامِ بالا واقعاً سنجیده می‌شوند (کلیدِ بی‌نام، مثلاً منی بدونِ صفحهٔ منی، کنار می‌رود و شمرده می‌شود).
const KEYS = Object.keys(ADULT_REFS).filter((k) => {
  const r = ADULT_REFS[k][M45.sex] ?? ADULT_REFS[k].both;
  if (!r) return false;
  const mid = r[1] != null ? (r[0] + r[1]) / 2 : r[0] * 1.2;
  return !!graded(run(M45, [rowOf(k, mid)]), k);
});

test("MM0: پیش‌شرط — بیشترِ کلیدهای ADULT_REFS با نامِ ساده سنجیده می‌شوند (وگرنه بقیهٔ این فایل سبزِ بی‌معناست، N15)", (t) => {
  t.diagnostic(`${KEYS.length} از ${Object.keys(ADULT_REFS).length} کلید`);
  assert.ok(KEYS.length >= 90, `فقط ${KEYS.length} کلید سنجیده شد`);
});

test("MM1: یکنواختی — عددِ دورتر از بازه فوریتِ کمتری نمی‌گیرد، و عددِ غیرطبیعی بی‌صدا نیست (MM6)", () => {
  const bad = [];
  // قدمِ ۴ (P84): کودک، شیرخوار و بارداری هم — بازه از getRef همان سن (وگرنه دنبالهٔ «پایین» از حدِ بزرگسال شروع می‌شد و
  //   از بالای بازهٔ کودک به داخلِ آن می‌رفت: افتِ ظاهری، نه باگ). TSHِ ۶٫۷۵ِ شیرخوار همین‌جا پیدا شد.
  const profiles = [{ sex: "M", age: 45 }, { sex: "F", age: 30 }, { sex: "F", age: 80 },
    { sex: "M", age: 3 }, { sex: "F", age: 0.35 }, { sex: "F", age: 10 }, { sex: "F", age: 28, pregnant: true }];
  for (const key of KEYS) {
    for (const P of profiles) {
      const r = getRef(key, P.sex, P.age) ?? ADULT_REFS[key][P.sex] ?? ADULT_REFS[key].both; if (!r) continue;
      const [lo, hi] = r;
      // عددِ وسطِ بازهٔ همان سن هرگز «غیرطبیعی» نیست — طبقه‌بندِ TSH با مرزِ ثابتِ بزرگسال، TSHِ ۶٫۷۵ِ شیرخوار (بازه ۰٫۶–۸٫۱)
      //   را «کم‌کاری» و abnormalِ بی‌جهت می‌کرد (P84). طبقه‌بند و بازه دو نسخه از یک تصمیم‌اند (N20).
      // چند نقطه در داخلِ بازه، نه فقط وسط: باگِ TSH بین ۴٫۵ و ۸٫۱ بود و وسط (۴٫۳۵) آن را نمی‌دید.
      if (hi != null) for (const f of [0.25, 0.5, 0.75, 0.9]) {
        const v = lo + f * (hi - lo);
        const gm = graded(run(P, [rowOf(key, v)]), key);
        if (gm?.abnormal) { bad.push(`داخلِ بازه غیرطبیعی: ${key}=${fmt(v)} ${P.sex}${P.age} (بازه ${lo}–${hi}) ⇒ ${gm.fa}`); break; }
      }
      const seqs = [];
      if (hi != null) seqs.push(["high", [1.05, 1.2, 1.5, 2, 3, 5, 10].map((f) => hi * f)]);
      if (lo > 0) seqs.push(["low", [0.95, 0.8, 0.6, 0.4, 0.2, 0.1, 0.05].map((f) => lo * f)]);
      for (const [dir, seq] of seqs) {
        let prev = null;
        for (const v of seq) {
          const x = run(P, [rowOf(key, v)]);
          const gr = graded(x, key);
          // عبور از سقفِ «عددِ ناممکن» (P84) حالتِ جداگانه است، نه فوریتِ صفر: باید به «تفسیر نشدند» برود و دنباله همان‌جا تمام می‌شود.
          if (!gr) {
            // «سنجیده نمی‌شود» هم حالتِ مشروع است: کودکِ بی‌بازهٔ سنی (ungraded/noRef)، نه فقط «تفسیر نشدند».
            if (!x.e.unmapped.length && !x.e.ungraded?.[key] && !x.e.noRef?.includes(key))
              bad.push(`ناپدید: ${key}=${fmt(v)} ${P.sex}${P.age} نه سنجیده شد نه در «تفسیر نشدند»`);
            break;
          }
          if (gr.abnormal && x.p.findings.length === 0) bad.push(`بی‌صدا: ${key}=${fmt(v)} ${P.sex}${P.age}`);
          if (prev && x.u < prev.u) bad.push(`${key} ${P.sex}${P.age} ${dir}: ${prev.v}→${prev.urg}[${prev.ids}] ولی ${fmt(v)}→${x.p.overall_urgency}[${x.ids}]`);
          prev = { v: fmt(v), u: x.u, urg: x.p.overall_urgency, ids: x.ids };
        }
      }
    }
  }
  assert.deepEqual(bad, []);
});

// افت‌های مجاز — هر کدام یک دلیلِ بالینی، نه «قرمز بود»:
const ALLOWED_DROPS = [
  // HCT و Hbِ ناهم‌خوان: Hbِ سنجیده بر هماتوکریت حاکم است (crisisArm، FR-004 در P52) — داده ناسازگار است، نه فوریت گم شده.
  // هر استثنا یک نمونهٔ ثابت دارد که باید هنوز افت بدهد؛ اگر ندهد، استثنا کهنه است و باید پاک شود.
  { pair: ["HCT", "HGB"], why: "Hbِ سنجیده حاکم است", example: [["HCT", 68.9], ["HGB", 10.5]] },
  { pair: ["HCT", "MCV"], why: "هماتوکریتِ ناسازگار با اندازهٔ گلبول، بی‌Hb", example: [["HCT", 68.9], ["MCV", 60]] },
  // کاپا و لامبدا هر دو بالا با نسبتِ طبیعی = پلی‌کلونال (کلیه/التهاب)، نه گاموپاتیِ مونوکلونال.
  { pair: ["KAPPA_FLC", "LAMBDA_FLC"], why: "پلی‌کلونال", example: [["KAPPA_FLC", 77.6], ["LAMBDA_FLC", 105.2]] },
  // کلسیمِ پایین با آلبومینِ پایین تصحیح می‌شود (Henry ۱۶.۱) — کلسیمِ واقعی بحرانی نیست.
  { pair: ["ALB", "CA"], why: "تصحیحِ آلبومین", example: [["ALB", 1.05], ["CA", 6.375]] },
];
const allowedKey = (a, b) => ALLOWED_DROPS.find((x) => (x.pair[0] === a && x.pair[1] === b) || (x.pair[0] === b && x.pair[1] === a));

test("MM2: افزایشی — افزودنِ یک آزمایش فوریتِ برگه را پایین نمی‌آورد (N20/N29)", (t) => {
  const bad = [], seenAllowed = new Set();
  let n = 0;
  // قدمِ ۴ (P84): کودکِ ۱۰ ساله هم — «Hb 19.9 + TIBC» آن‌جا از this_week به routine می‌افتاد (کفِ پوشش در patterns.js).
  for (const P of [M45, { sex: "F", age: 10 }]) {
    const singles = [];
    for (const key of KEYS) for (const [lv, v] of levels(key)) {
      const row = rowOf(key, v);
      const x = run(P, [row]);
      if (graded(x, key)) singles.push({ key, lv, row, u: x.u, urg: x.p.overall_urgency, ids: x.ids });
    }
    const byKey = new Map();
    for (const s of singles) (byKey.get(s.key) ?? byKey.set(s.key, []).get(s.key)).push(s);
    const keys = [...byKey.keys()];
    // هر جفتِ کلید یک بار، با سطحی که با اندیسِ جفت می‌چرخد — همهٔ جفت‌کلیدها، همهٔ سطح‌ها در مجموع (قطعی، بی‌تصادف).
    for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
      const A = byKey.get(keys[i]), B = byKey.get(keys[j]);
      const a = A[(i + j) % A.length], b = B[(i * 7 + j) % B.length];
      const x = run(P, [a.row, b.row]); n++;
      const max = Math.max(a.u, b.u);
      if (x.u >= max) continue;
      const al = allowedKey(a.key, b.key);
      if (al) { seenAllowed.add(al.pair.join("+")); continue; }
      const hi = a.u >= b.u ? a : b;
      bad.push(`${P.sex}${P.age} ${a.key}=${a.row.value} + ${b.key}=${b.row.value}: تنها ${hi.key}→${hi.urg}[${hi.ids}]، با هم→${x.p.overall_urgency}[${x.ids}]`);
    }
  }
  t.diagnostic(`${n} جفت؛ استثناهای رخ‌داده در نمونه‌گیری: ${[...seenAllowed].join("، ") || "هیچ"}؛ استثناهای فهرست: ${ALLOWED_DROPS.map((x) => `${x.pair.join("+")} (${x.why})`).join("، ")}`);
  assert.deepEqual(bad, []);
  // استثنایی که دیگر رخ نمی‌دهد باید پاک شود — وگرنه فهرست بی‌صدا رشد می‌کند و چیزی را می‌پوشاند.
  const stale = ALLOWED_DROPS.filter(({ example }) => {
    const rows = example.map(([k, v]) => rowOf(k, v));
    const both = run(M45, rows).u;
    return both >= Math.max(...rows.map((r) => run(M45, [r]).u));
  }).map((x) => x.pair.join("+"));
  assert.deepEqual(stale, [], "این استثناها دیگر افت نمی‌دهند؛ از ALLOWED_DROPS پاکشان کنید");
});

test("MM3: قالبِ عدد — ارقامِ فارسی، فاصله، صفرِ انتهایی، کامای اعشاری و واحدِ چسبیده همان خروجی را می‌دهند (N3)", () => {
  const FA = "۰۱۲۳۴۵۶۷۸۹";
  const toFa = (s) => s.replace(/\d/g, (d) => FA[d]).replace(".", "٫");
  const bad = [];
  for (const key of KEYS) for (const [lv, v] of levels(key)) {
    const row = rowOf(key, v);
    const base = run(M45, [row]);
    const s = row.value;
    const variants = [["fa", { ...row, value: toFa(s) }], ["pad", { ...row, value: ` ${s} ` }]];
    if (s.includes(".")) {
      variants.push(["trail0", { ...row, value: s + "0" }]);
      // کامای اعشاری فقط وقتی بی‌ابهام است که دقیقاً سه رقم پس از آن نیاید («1,250» = هزار و دویست‌وپنجاه، P48/N3).
      if (s.split(".")[1].length !== 3) variants.push(["comma", { ...row, value: s.replace(".", ",") }]);
    } else variants.push(["dot0", { ...row, value: s + ".0" }]);
    if (row.unit) variants.push(["unitInValue", { name: row.name, value: `${s} ${row.unit}` }]);
    for (const [vn, r2] of variants) {
      const x = run(M45, [r2]);
      if (sig(x) !== sig(base)) bad.push(`${key} ${lv} «${s}»→${base.p.overall_urgency}[${base.ids}] ولی ${vn} «${r2.value}»→${x.p.overall_urgency}[${x.ids}]`);
    }
  }
  assert.deepEqual(bad, []);
});

test("MM4: املا — هر نامِ NAME_MAP برای یک کلید همان خروجیِ نامِ مرجع را می‌دهد (N2)", (t) => {
  const byKey = {};
  for (const [alias, key] of Object.entries(NAME_MAP)) (byKey[key] ??= []).push(alias);
  const bad = []; let n = 0;
  for (const key of KEYS) {
    const lv = levels(key)[0]; if (!lv || !byKey[key]) continue;
    const row = rowOf(key, lv[1]);
    const base = run(M45, [row]);
    for (const alias of byKey[key]) {
      n++;
      const x = run(M45, [{ ...row, name: alias }]);
      if (!graded(x, key)) bad.push(`${alias}: به ${key} نرسید (unmapped=${JSON.stringify(x.e.unmapped)})`);
      else if (sig(x) !== sig(base)) bad.push(`${alias} ≠ ${row.name} (${key}=${row.value}): ${x.p.overall_urgency}[${x.ids}] / ${base.p.overall_urgency}[${base.ids}]`);
    }
  }
  t.diagnostic(`${n} املا`);
  assert.ok(n >= 300, `فقط ${n} املا سنجیده شد`);
  assert.deepEqual(bad, []);
});

test("MM5: ترتیب و تکرارِ ردیف خروجی را عوض نمی‌کند؛ اجرای دوباره همان خروجی است (بی‌حالت)", () => {
  let seed = 20261005;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const urine = [["Urine RBC", "8-10", "/hpf"], ["Urine WBC", "15-20", "/hpf"], ["Nitrite", "Positive", ""], ["Leukocyte Esterase", "+2", ""],
    ["Urine Protein", "2+", ""], ["Bacteria", "Many", ""], ["RBC Casts", "2-3", "/lpf"], ["Specific Gravity", "1.030", ""]];
  // فهرست‌های درون‌جمله‌ای («میوگلوبین 8.4، آنتی‌ترومبین 60») به ترتیبِ برگه‌اند — آن ترتیب معنا نیست. پس اینجا امضا
  // بی‌ترتیب است: فوریت، شناسه و فوریتِ هر یافته، و مجموعهٔ عددهای نام‌برده. عددِ گم‌شده یا فوریتِ عوض‌شده همچنان دیده می‌شود.
  const sigU = (r) => r.p.overall_urgency + "|" + r.p.findings.map((f) => `${f.rule_id}:${f.urgency}`).sort().join(",") + "|" +
    r.p.findings.flatMap((f) => `${f.headline} ${f.must_say} ${f.action ?? ""}`.match(/\d+(?:\.\d+)?/g) ?? []).sort().join(",");
  const sig = sigU;
  const bad = [];
  for (let it = 0; it < 250; it++) {   // ۲۵۰ برگهٔ تصادفیِ ثابت‌دانه: سرعتِ هوکِ پیش از کامیت در برابرِ پوشش
    const used = new Set(); const rows = [];
    for (let i = 0, n = 3 + Math.floor(rnd() * 4); i < n; i++) {
      const k = pick(KEYS); if (used.has(k)) continue; used.add(k);
      const lv = levels(k); if (!lv.length) continue;
      rows.push(rowOf(k, pick(lv)[1]));
    }
    if (rnd() < 0.3) for (const u of shuffle(urine).slice(0, 2 + Math.floor(rnd() * 3))) rows.push({ name: u[0], value: u[1], unit: u[2] });
    const P = { sex: rnd() < 0.5 ? "M" : "F", age: pick([8, 30, 45, 70, 80]) };
    const s0 = sig(run(P, rows));
    const label = `${JSON.stringify(P)} ${rows.map((r) => `${r.name}=${r.value}`).join("; ")}`;
    if (sig(run(P, shuffle(rows))) !== s0) bad.push(`ترتیب: ${label}`);
    if (sig(run(P, [...rows, { ...pick(rows) }])) !== s0) bad.push(`تکرار: ${label}`);
    if (sig(run(P, rows)) !== s0) bad.push(`حالت: ${label}`);
  }
  assert.deepEqual(bad.slice(0, 10), []);
});

test("MM7: ادرار و سرولوژی — املای مثبت/منفی همان خروجی؛ درجهٔ بالاتر فوریتِ کمتر نمی‌گیرد؛ «Many» بی‌صدا نیست (N6/N19/N30)", () => {
  // قدمِ ۴ (P84): «RBC: Many» هیچ یافته‌ای نمی‌گرفت در حالی که ۳۰–۴۰ «این هفته» بود؛ کشتِ خونِ «POS» نامعلوم بود و «NEG» هم؛
  //   «Nitrite: Detected» خوانده نمی‌شد و «+/-» مثبت خوانده می‌شد؛ «Rubella IgG: +» به «تفسیر نشدند» می‌رفت.
  const P = { sex: "F", age: 35 };
  const sigQ = (r) => r.p.overall_urgency + "|" + r.p.findings.map((f) => `${f.rule_id}:${f.urgency}`).sort().join(",");
  const bad = [];
  const ordinal = [
    ["Urine Protein", ["Negative", "Trace", "1+", "2+", "3+", "4+"], ""], ["Urine Glucose", ["Negative", "Trace", "1+", "2+", "3+"], ""],
    ["Urine Blood", ["Negative", "Trace", "1+", "2+", "3+"], ""], ["Ketones", ["Negative", "Trace", "1+", "2+", "3+"], ""],
    ["Urine RBC", ["0-1", "2-3", "4-6", "8-10", "15-20", "30-40", "Many"], "/hpf"],
    ["Urine WBC", ["0-1", "2-3", "4-6", "8-10", "15-20", "30-40", "Many"], "/hpf"],
    ["Leukocyte Esterase", ["Negative", "Trace", "1+", "2+", "3+"], ""], ["RBC Casts", ["Nil", "0-1", "2-3", "5-8"], "/lpf"],
  ];
  for (const [name, seq, unit] of ordinal) {
    let prev = null;
    for (const v of seq) {
      const x = run(P, [{ name, value: v, unit }]);
      if (prev && x.u < prev.u) bad.push(`ترتیب: ${name} ${prev.v}→${prev.urg} ولی ${v}→${x.p.overall_urgency}`);
      prev = { v, u: x.u, urg: x.p.overall_urgency };
    }
  }
  const spell = {
    pos: ["Positive", "positive", "POS", "+", "مثبت", "Reactive", "Detected"],
    neg: ["Negative", "negative", "NEG", "-", "منفی", "Non-reactive", "Not detected", "Undetected", "Nil"],
  };
  const names = { urine: ["Nitrite", "Urine Blood", "Urine Glucose", "Ketones", "Urine Bilirubin"],
    sero: ["HBsAg", "HCV Ab", "HIV Ab", "VDRL", "Anti-HBc", "RF", "Troponin I", "Blood Culture", "Rubella IgG", "Indirect Coombs"] };
  for (const name of [...names.urine, ...names.sero]) {
    for (const [kind, list] of Object.entries(spell)) {
      // ادرار: فقط واژه‌هایی که روی نوارِ ادرار معنا دارند (Non-reactive/Undetected/Nil برای نوار چاپ نمی‌شوند ولی اگر بشوند منفی‌اند).
      const base = sigQ(run(P, [{ name, value: list[0] }]));
      for (const v of list.slice(1)) {
        const s = sigQ(run(P, [{ name, value: v }]));
        if (s !== base) bad.push(`املا: ${name}=«${v}» ⇒ ${s} ولی «${list[0]}» ⇒ ${base}`);
      }
    }
    // «+/-» مرزی است: هرگز فوریتِ «Positive» را نمی‌گیرد مگر همان‌جا که مثبت و منفی یکی‌اند.
    const eq = run(P, [{ name, value: "+/-" }]), pos = run(P, [{ name, value: "Positive" }]), neg = run(P, [{ name, value: "Negative" }]);
    if (pos.u > neg.u && eq.u >= pos.u && sigQ(eq) === sigQ(pos)) bad.push(`مرزی: ${name}=«+/-» مثلِ «Positive» خوانده شد`);
  }
  assert.deepEqual(bad, []);
});
