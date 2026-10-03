// ممیزیِ لایهٔ ۱ (P72): جاروبِ ناقض‌های I1–I8 روی خروجیِ بی‌مدلِ موتور (بزرگسال، ۹۱ کلید) — `node layer1.mjs` سپس gaps/n8
// اجرا از هر جا: node .claude/audit/<file>.mjs — خروجیِ میانی: $LAYER1_OUT یا <tmp>/layer1-out.json
import { tmpdir } from "node:os"; import { join } from "node:path";
const OUT = process.env.LAYER1_OUT ?? join(tmpdir(), "layer1-out.json");
// Layer 1 — invariant sweep over the deterministic engine output (no LLM).
import { readFileSync, writeFileSync } from "node:fs";
const R = new URL("../../khanesh-server/rules/", import.meta.url).href;
const { runEngine } = await import(R + "adapter.js");
const { runPatterns } = await import(R + "patterns.js");
const { buildEngineFallbackResult, buildNormalResult } = await import(R + "prompt.js");
const { ADULT_REFS, getRef } = await import(R + "refs.js");
const { faName } = await import(R + "names.js");
const { SI_CONVERSIONS } = await import(R + "units.js");
console.warn = () => {}; console.log_ = console.log;

const src = readFileSync(new URL(R + "adapter.js"), "utf8");
const nm = src.slice(src.indexOf("const NAME_MAP = {"), src.indexOf("\n};", src.indexOf("const NAME_MAP = {")));
const NAMES = {};
for (const m of nm.matchAll(/(?:"([^"]+)"|([\p{L}\p{N}_]+))\s*:\s*"([A-Z][A-Z0-9_]*)"/gu)) {
  (NAMES[m[3]] ??= []).push(m[1] ?? m[2]);
}

const DEMO = {
  adultM: { sex: "M", age: 45 }, adultF: { sex: "F", age: 35 }, preg: { sex: "F", age: 30, pregnant: true },
  child: { sex: "M", age: 8 }, elder: { sex: "F", age: 82 },
};
const RANK = { none: 0, routine: 1, this_week: 2, soon: 3, emergency: 4 };
const FALLBACK = new Set(["unmatched_abnormal", "unexplained_abnormal"]);

function run(patient, tests) {
  const o = runEngine({ patient, tests }); const e = o.engineOut ?? o;
  const p = runPatterns(e);
  const res = (p.findings.length || e.abnormal.length) ? buildEngineFallbackResult(e, p) : buildNormalResult(e);
  const text = [res.summary, res.interpretation, ...(res.general_recommendations ?? [])].join("\n");
  return { e, p, res, text };
}
const fmt = (v) => +(+v).toPrecision(3);

// resolve a working name per key
const nameOf = {};
for (const key of Object.keys(ADULT_REFS)) {
  const unit = ADULT_REFS[key].unit ?? "";
  const r = getRef(key, "M", 45) ?? getRef(key, "F", 35);
  if (!Array.isArray(r)) continue;
  const v = fmt((r[0] + r[1]) / 2 || r[1] || 1);
  for (const n of [...(NAMES[key] ?? []), key]) {
    try {
      const { e } = run({ sex: "M", age: 45 }, [{ name: n, value: String(v), unit }]);
      if (e.graded.some((g) => g.test === key)) { nameOf[key] = n; break; }
    } catch {}
  }
}
const unresolved = Object.keys(ADULT_REFS).filter((k) => !nameOf[k]);

const V = []; // violations
const add = (inv, key, demo, val, detail) => V.push({ inv, key, demo, val, detail });
const gap = {}; // key|dir -> fallback-only
const sentences = (t) => t.split(/(?<=[.!؟?؛])\s+|\n/).filter(Boolean);
const OPP = { high: /پایین|کمتر از حد|کاهش|کم‌/, low: /بالا|بیشتر از حد|افزایش|زیاد/ };
const SAME = { high: /بالا|بیشتر|افزایش|زیاد/, low: /پایین|کمتر|کاهش|کم/ };
const ER = /اورژانس/, NOWRE = /همین حالا|فوراً|فورا|بدون اتلاف|بدون (هیچ‌گونه )?تأخیر/;
const COND = /^(اگر|مگر|چنانچه|در صورتِ?|علائم هشدار|با هر)/;
const RAWKEY = new RegExp(`\\b(${Object.keys(ADULT_REFS).filter((k) => /_|\d/.test(k)).join("|")})\\b`);

function checkCommon(inv0, key, demo, val, out, dir) {
  const { e, p, text, res } = out;
  if (p.rules_failed?.length) add("I0-rule-crash", key, demo, val, p.rules_failed.map(String).join("|").slice(0, 200));
  if (/undefined|NaN|\[object|null\b/.test(text)) add("I7-garbage", key, demo, val, text.match(/.{0,40}(undefined|NaN|\[object|null\b).{0,40}/)?.[0]);
  const rk = text.match(RAWKEY); if (rk) add("I7-rawkey", key, demo, val, rk[0]);
  // I3 timeline coherence on final recs
  const recs = res.general_recommendations ?? [];
  const uncond = recs.flatMap(sentences).filter((s) => !COND.test(s.trim()));
  const hasER = uncond.some((s) => ER.test(s) && NOWRE.test(s));
  const hasWeek = uncond.filter((s) => /این هفته|هفتهٔ آینده|نوبت عادی|نوبتِ عادی|چند روز/.test(s) && !/اورژانس/.test(s));
  if (hasER && hasWeek.length) add("I3-rival-timeline", key, demo, val, hasWeek[0].slice(0, 160));
  const ou = p.overall_urgency;
  if (ou === "emergency" && !uncond.some((s) => ER.test(s) || NOWRE.test(s) || /همین امروز/.test(s))) add("I3-emergency-without-urgent-text", key, demo, val, recs.join(" | ").slice(0, 200));
  if (RANK[ou] <= 2 && hasER) add("I3-urgent-text-on-nonemergency", key, demo, val, `${ou}: ` + uncond.find((s) => ER.test(s)).slice(0, 160));
  if (p.has_critical && ou !== "emergency") add("I3-critical-mismatch", key, demo, val, ou);
  // I5 absent analyte described as normal
  const onSheet = new Set(e.graded.map((g) => g.test));
  for (const s of sentences(text)) {
    if (!/طبیعی است|طبیعی بود|در محدوده(ٔ)? طبیعی/.test(s) || /نیست|نشده|ندارد|اندازه|روی برگه|اگر/.test(s)) continue;
    for (const k of ["CREAT", "AST", "ALT", "HGB", "K", "NA", "TSH", "GLU_F", "PLT", "WBC", "FERRITIN", "B12", "ALB", "BILI_T", "CK"]) {
      if (onSheet.has(k)) continue;
      const fn = faName(k); if (fn && fn.length > 2 && s.includes(fn)) add("I5-absent-called-normal", key, demo, val, `${k}: ${s.slice(0, 180)}`);
    }
  }
  // I2 direction words in sentences naming this analyte
  if (dir) {
    const fn = faName(key);
    for (const s of sentences(text)) {
      if (!(s.includes(fn) || s.includes(String(val)))) continue;
      if (OPP[dir].test(s) && !SAME[dir].test(s)) { add("I2-direction", key, demo, val, `${dir}: ${s.slice(0, 180)}`); break; }
    }
  }
}

const ranks = {};
let runs = 0;
for (const [dn, pt] of Object.entries(DEMO)) {
  for (const key of Object.keys(nameOf)) {
    const r = getRef(key, pt.sex, pt.age, { pregnant: !!pt.pregnant });
    if (!Array.isArray(r)) continue;
    const [lo, hi] = r, unit = ADULT_REFS[key].unit ?? "", name = nameOf[key];
    const one = (v) => { runs++; return run(pt, [{ name, value: String(v), unit }]); };
    // I4 normal midpoint
    const mid = fmt(lo + (hi - lo) / 2);
    try {
      const o = one(mid);
      const g = o.e.graded.find((x) => x.test === key);
      const real = o.p.findings.filter((f) => RANK[f.urgency] >= 2);
      if (g?.abnormal) add("I4-mid-graded-abnormal", key, dn, mid, `${g.range} ${g.fa}`);
      if (real.length) add("I4-finding-on-normal", key, dn, mid, real.map((f) => `${f.rule_id}:${f.urgency}`).join(","));
      checkCommon("I4", key, dn, mid, o, null);
    } catch (err) { add("I0-throw", key, dn, mid, err.message); }
    // severity ladders
    for (const [dir, ladder] of [["high", [1.05, 1.3, 2, 4, 10].map((m) => hi * m)], ["low", lo > 0 ? [0.95, 0.7, 0.5, 0.25, 0.1].map((m) => lo * m) : []]]) {
      let prev = -1, prevV = null; const seq = [];
      for (const raw of ladder) {
        const v = fmt(raw);
        try {
          const o = one(v);
          const g = o.e.graded.find((x) => x.test === key);
          const vis = o.p.findings.filter((f) => !o.p.suppressed_ids?.includes(f.rule_id));
          const ids = vis.map((f) => f.rule_id);
          const rk = RANK[o.p.overall_urgency] ?? 0; seq.push(`${v}:${o.p.overall_urgency}`);
          if (g && !g.abnormal) { /* ref edge/rounding */ }
          else if (g?.abnormal && g.dir !== dir) add("I2-graded-dir", key, dn, v, `expected ${dir} got ${g.dir}`);
          if (g?.abnormal) {
            if (!ids.length) add("I1-silent", key, dn, v, "abnormal, no finding");
            else if (ids.every((i) => FALLBACK.has(i))) (gap[`${key}|${dir}`] ??= new Set()).add(dn);
            if (!o.text.includes(String(v)) && !o.text.includes(faName(key))) add("I1-not-named", key, dn, v, ids.join(","));
          }
          if (rk < prev) add("I6-non-monotonic", key, dn, v, `${prevV}→${v}: ${seq.join(" ")}`);
          prev = Math.max(prev, rk); prevV = v;
          checkCommon("I", key, dn, v, o, g?.abnormal ? g.dir : null);
        } catch (err) { add("I0-throw", key, dn, v, err.message); }
      }
      (ranks[`${key}|${dir}`] ??= {})[dn] = seq.join(" ");
    }
  }
}

// I8 SI-unit normal midpoint must stay normal
const SIU = ["mmol/L", "µmol/L", "umol/L", "mmol/mol", "g/L", "nmol/L", "pmol/L", "µg/L", "ng/L", "mg/L", "IU/L", "U/L", "µkat/L", "L/L", "fmol/cell"];
for (const [key, c] of Object.entries(SI_CONVERSIONS)) {
  if (!nameOf[key]) continue;
  const u = SIU.find((x) => c.si?.test?.(x.toLowerCase()) || c.si?.test?.(x));
  if (!u || typeof c.factor !== "number") { add("I8-skip", key, "adultM", null, "no si unit/factor"); continue; }
  const r = getRef(key, "M", 45); if (!Array.isArray(r)) continue;
  const mid = (r[0] + r[1]) / 2, v = fmt(mid / c.factor);
  try {
    const o = run(DEMO.adultM, [{ name: nameOf[key], value: String(v), unit: u }]); runs++;
    const g = o.e.graded.find((x) => x.test === key);
    if (!g) add("I8-si-not-graded", key, "adultM", `${v} ${u}`, JSON.stringify({ un: o.e.unmapped, ug: Object.keys(o.e.ungraded ?? {}) }).slice(0, 150));
    else if (g.abnormal) add("I8-si-normal-graded-abnormal", key, "adultM", `${v} ${u}`, `${g.value} ${g.range} ${g.fa}`);
    if (o.p.findings.some((f) => RANK[f.urgency] >= 2)) add("I8-si-finding", key, "adultM", `${v} ${u}`, o.p.findings.map((f) => f.rule_id + ":" + f.urgency).join(","));
  } catch (err) { add("I0-throw", key, "si", v, err.message); }
}

// I9 pairwise contradictions (adultM): two abnormal keys at ×1.3/×0.7
const keys = Object.keys(nameOf);
const pv = (k, d) => { const r = getRef(k, "M", 45); if (!Array.isArray(r)) return null; return d === "high" ? fmt(r[1] * 1.3) : r[0] > 0 ? fmt(r[0] * 0.7) : null; };
let pairRuns = 0;
for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) for (const d1 of ["high", "low"]) for (const d2 of ["high", "low"]) {
  const a = pv(keys[i], d1), b = pv(keys[j], d2); if (a == null || b == null) continue;
  try {
    const o = run(DEMO.adultM, [{ name: nameOf[keys[i]], value: String(a), unit: ADULT_REFS[keys[i]].unit ?? "" }, { name: nameOf[keys[j]], value: String(b), unit: ADULT_REFS[keys[j]].unit ?? "" }]);
    pairRuns++;
    const tag = `${keys[i]}${d1 === "high" ? "↑" : "↓"}+${keys[j]}${d2 === "high" ? "↑" : "↓"}`;
    checkCommon("I9", tag, "pair", `${a},${b}`, o, null);
    for (const [k, v] of [[keys[i], a], [keys[j], b]]) {
      const g = o.e.graded.find((x) => x.test === k);
      if (g?.abnormal && !o.text.includes(String(v)) && !o.text.includes(faName(k))) add("I1-pair-not-named", tag, "pair", v, k);
    }
  } catch (err) { add("I0-throw", `${keys[i]}+${keys[j]}`, "pair", `${a},${b}`, err.message); }
}

const byInv = {};
for (const v of V) (byInv[v.inv] ??= []).push(v);
const gapList = Object.entries(gap).map(([k, s]) => `${k} [${[...s].join(",")}]`);
writeFileSync(OUT, JSON.stringify({ unresolved, nameOf, byInv, gapList, ranks }, null, 1));
console.log_(`keys resolved ${Object.keys(nameOf).length}/${Object.keys(ADULT_REFS).length}; unresolved: ${unresolved.join(",")}`);
console.log_(`runs single ${runs}, pairs ${pairRuns}`);
for (const [k, a] of Object.entries(byInv)) console.log_(`${k}\t${a.length}\tkeys:${new Set(a.map((x) => x.key)).size}`);
console.log_(`fallback-only key|dir: ${gapList.length}`);
