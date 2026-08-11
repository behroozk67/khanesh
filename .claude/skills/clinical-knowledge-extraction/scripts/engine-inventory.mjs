#!/usr/bin/env node
// فهرستِ آنچه موتورِ قواعد همین حالا می‌داند.
//
// چرا وجود دارد: مهارتِ clinical-knowledge-extraction موظف است هر چیزی را که
// «قبلاً در موتور بوده» از خروجی حذف کند. این تشخیص را نباید با حافظه یا با
// خواندنِ CLAUDE.md داد — هر دو تصویرِ یک لحظهٔ گذشته‌اند. اینجا از خودِ کد
// خوانده می‌شود.
//
// استفاده:
//   node .claude/skills/clinical-knowledge-extraction/scripts/engine-inventory.mjs
//   node ... /engine-inventory.mjs --search troponin --search هیپرکلسمی
//   node ... /engine-inventory.mjs --json
//
// نکته: باید node_modules در khanesh-server نصب باشد، وگرنه import ها می‌شکنند
// (همان تلهٔ ERR_MODULE_NOT_FOUND که در CLAUDE.md ذیل Commands توضیح داده شده).

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..", "..", "..");
const SRV = join(REPO, "khanesh-server");
const RULES = join(SRV, "rules");

const imp = (f) => import(pathToFileURL(join(RULES, f)).href);

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const terms = args.reduce((acc, a, i) => {
  if (a === "--search" && args[i + 1]) acc.push(args[i + 1]);
  return acc;
}, []);

// ---------- جمع‌آوری ----------

const [patterns, refs, refsPed, interpret, ctcae, names, units, biovar, pre, guides] =
  await Promise.all([
    imp("patterns.js"),
    imp("refs.js"),
    imp("refs_ped.js"),
    imp("interpret.js"),
    imp("ctcae.js"),
    imp("names.js"),
    imp("units.js"),
    imp("biovar.js"),
    imp("preanalytical.js"),
    imp("guidelines.js"),
  ]);

// کدام قاعده در کدام فایل است — با grep روی منبع، چون RULES فقط آرایهٔ تخت است
const patternFiles = readdirSync(RULES).filter((f) => /^patterns_.*\.js$/.test(f));
const srcOf = new Map();
for (const f of patternFiles) {
  const src = readFileSync(join(RULES, f), "utf8");
  for (const m of src.matchAll(/\bid:\s*["']([\w.-]+)["']/g)) srcOf.set(m[1], f);
}

const ruleIds = patterns.RULES.map((r) => r.id).sort();

// NAME_MAP از منبع خوانده می‌شود چون export نشده
const adapterSrc = readFileSync(join(RULES, "adapter.js"), "utf8");
const nmBlock = adapterSrc.slice(
  adapterSrc.indexOf("const NAME_MAP = {"),
  adapterSrc.indexOf("\n};", adapterSrc.indexOf("const NAME_MAP = {")),
);
const nameMap = {};
for (const m of nmBlock.matchAll(/["']?([^\s"':,{}]+)["']?\s*:\s*["']([A-Z0-9_#%]+)["']/g)) {
  (nameMap[m[2]] ||= []).push(m[1]);
}

// اقلامِ در انتظارِ بازبینیِ انسانی — نباید دوباره «کشف» شوند
const medSrc = readFileSync(join(REPO, "MEDICAL_RULES.md"), "utf8");
const pending = [...medSrc.matchAll(/^### (P\d+ — .+)$/gm)].map((m) => m[1].trim());

const inv = {
  rules: ruleIds.map((id) => ({ id, file: srcOf.get(id) || "؟" })),
  gradedKeys: Object.keys(refs.ADULT_REFS).sort(),
  geriatricKeys: Object.keys(refs.GERIATRIC_REFS || {}).sort(),
  pediatricKeys: Object.keys(refsPed.PED_REFS || {}).sort(),
  classifiers: Object.keys(interpret.CLASSIFIERS).sort(),
  ctcae: Object.keys(ctcae.CTCAE_MAP).sort(),
  faNames: Object.keys(names.FA_NAMES).sort(),
  nameMap,
  guidelineIds: [...(guides.GUIDELINE_IDS || Object.keys(guides.GUIDELINES))].sort(),
  ruleSources: patterns.RULE_SOURCES,
  suggestTests: Object.keys(patterns.SUGGEST_TESTS).sort(),
  siConversions: Object.keys(units.SI_CONVERSIONS).sort(),
  biovar: Object.keys(biovar.BV).sort(),
  preanalytical: (pre.PREANALYTICAL_RULES || []).map((r) => r.id ?? r.name ?? "?"),
  pendingReview: pending,
};

// ---------- خروجی ----------

if (asJson) {
  console.log(JSON.stringify(inv, null, 2));
  process.exit(0);
}

if (terms.length) {
  // حالتِ جست‌وجو: «موتور دربارهٔ این چیزی می‌داند؟»
  const ruleSrcAll = patternFiles.map((f) => [f, readFileSync(join(RULES, f), "utf8")]);
  for (const term of terms) {
    const t = term.toLowerCase();
    console.log(`\n══ جست‌وجو: ${term}`);
    const hit = (label, arr) => {
      const found = arr.filter((x) => String(x).toLowerCase().includes(t));
      if (found.length) console.log(`  ${label}: ${found.slice(0, 25).join(", ")}`);
      return found.length;
    };
    let n = 0;
    n += hit("قاعده", ruleIds);
    n += hit("کلیدِ نمره‌دهی", inv.gradedKeys);
    n += hit("طبقه‌بند", inv.classifiers);
    n += hit("CTCAE", inv.ctcae);
    n += hit("نامِ فارسی", Object.entries(names.FA_NAMES).map(([k, v]) => `${k}=${v}`));
    n += hit("املا در NAME_MAP", Object.entries(nameMap).map(([k, v]) => `${k}←${v.join("/")}`));
    n += hit("منبعِ گایدلاین", inv.guidelineIds);
    n += hit("پیشنهادِ آزمایش", inv.suggestTests);
    n += hit("تبدیلِ واحد", inv.siConversions);
    n += hit("در انتظارِ بازبینی", pending);
    const inSrc = ruleSrcAll
      .filter(([, s]) => s.toLowerCase().includes(t))
      .map(([f]) => f);
    if (inSrc.length) {
      console.log(`  متنِ قاعده‌ها: ${inSrc.join(", ")}`);
      n += inSrc.length;
    }
    if (!n) console.log("  ⛔ هیچ ردی نیست — این مورد در موتور تازه است.");
  }
  process.exit(0);
}

const line = (label, arr) => console.log(`${label} (${arr.length}): ${arr.join(", ")}`);
console.log(`قاعده‌ها: ${ruleIds.length} در ${patternFiles.length} فایل`);
for (const f of patternFiles) {
  const ids = inv.rules.filter((r) => r.file === f).map((r) => r.id);
  if (!ids.length) continue;
  console.log(`  ${f} (${ids.length}): ${ids.join(", ")}`);
}
const orphan = inv.rules.filter((r) => r.file === "؟").map((r) => r.id);
if (orphan.length) console.log(`  ⚠️ بدون فایل: ${orphan.join(", ")}`);
console.log("");
line("کلیدهای نمره‌دهی (ADULT_REFS)", inv.gradedKeys);
line("سالمندی (GERIATRIC_REFS)", inv.geriatricKeys);
line("کودکان (PED_REFS)", inv.pediatricKeys);
line("طبقه‌بندها (CLASSIFIERS)", inv.classifiers);
line("CTCAE_MAP", inv.ctcae);
line("تبدیلِ واحد (SI_CONVERSIONS)", inv.siConversions);
line("تغییرپذیریِ زیستی (BV)", inv.biovar);
line("پیش‌تحلیلی", inv.preanalytical);
line("گایدلاین‌ها", inv.guidelineIds);
line("پیشنهادِ آزمایش (SUGGEST_TESTS)", inv.suggestTests);
console.log(`\nدر انتظارِ بازبینیِ انسانی (MEDICAL_RULES.md): ${pending.length}`);
for (const p of pending) console.log(`  ${p}`);
