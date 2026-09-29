// ============================================================
// ساختِ fixtures.json برای promptfoo از روی خروجیِ واقعیِ موتور.
//
// عمداً payload را با buildEnginePrompt واقعی می‌سازد، نه با یک payload
// دستیِ جداگانه — تا اگر شکلِ پیام تغییر کند (فیلدی اضافه/حذف شود)، این
// فیکسچرها هم خودبه‌خود همان تغییر را ببینند و هیچ نسخهٔ دومی از منطقِ
// ساختِ پیام نگهداری نشود.
//
// اجرا: node promptfoo/generate-fixtures.mjs   (یا: npm run promptfoo:fixtures)
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runEngine } from "../rules/adapter.js";
import { runPatterns } from "../rules/patterns.js";
import { ENGINE_SYSTEM_PROMPT, buildEnginePrompt } from "../rules/prompt.js";
import { faName } from "../rules/names.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// هر پنل یک سناریوی بالینیِ واقعی است، انتخاب‌شده برای پوشاندنِ محورهای
// متفاوتِ اصل I و اصل II قانون‌نامه (khanesh-project/.specify/memory/constitution.md):
//   - عادی/روتین (کم‌خونیِ فقرآهن)
//   - اورژانسِ blocks_others در کنارِ یک یافتهٔ کم‌اهمیت‌تر (A8)
//   - قاعده‌ای که به‌تازگی اصلاح شده (محورِ آلبومین، فصل ۲۰ هنری — P44/M94)
//   - unmatched_abnormal: تستی که هیچ قاعده‌ای نمی‌شناسدش، برای سنجشِ N8
const PANELS = [
  {
    name: "کم‌خونیِ فقرآهنِ ساده — روتین",
    patient: { age: 34, sex: "F" },
    tests: [
      { name: "Hb", value: "9.8" },
      { name: "Ferritin", value: "8" },
      { name: "MCV", value: "68" },
    ],
  },
  {
    name: "تروپونینِ اورژانسی کنارِ کلسترولِ روتین (A8)",
    patient: { age: 50, sex: "M" },
    tests: [
      { name: "Troponin I", value: "5" },
      { name: "Cholesterol", value: "260" },
    ],
  },
  {
    name: "آلبومینِ ۳.۷ — هلد-د-لاینِ P44-ج (نه سیروز، نه نفروتیک)",
    patient: { age: 55, sex: "M" },
    tests: [
      { name: "Albumin", value: "3.7" },
      { name: "Platelet", value: "120" },
      { name: "Total Bilirubin", value: "1.5" },
    ],
  },
  {
    name: "MCH بدون قاعده — unmatched_abnormal",
    patient: { age: 40, sex: "F" },
    tests: [{ name: "MCH", value: "18" }],
  },
];

function buildFixture(panel) {
  const engineOut = runEngine({ patient: panel.patient, tests: panel.tests });
  const patterns = runPatterns(engineOut);
  const userMsg = buildEnginePrompt(engineOut, patterns);

  return {
    description: panel.name,
    vars: {
      system: ENGINE_SYSTEM_PROMPT,
      user: userMsg.content,
      findings: patterns.findings.map((f) => ({ headline: f.headline, must_say: f.must_say })),
      forbidTests: [...new Set(patterns.findings.flatMap((f) => f.forbid ?? []))],
      // فقط کلیدهایی که نشتشان واقعاً خطاست — برای MCH/MCHC/HDL/LDL/INR/TIBC
      // نامِ فارسیِ درست دقیقاً همان کلید است (توضیحِ M32 در CLAUDE.md)، پس
      // حضورشان در متن یک نشتِ N8 نیست و نباید فیکسچر را کاذب مردود کند.
      rawKeys: [...new Set(
        engineOut.graded
          .filter((g) => g.abnormal && faName(g.test) !== g.test)
          .map((g) => g.test),
      )],
    },
    assert: [
      {
        // بدونِ «:default» — importModule خودِ promptfoo وقتی export default
        // است مستقیماً تابع را برمی‌گرداند؛ اضافه‌کردنِ نامِ تابع باعث
        // می‌شد mod["default"] را بخواند که روی خودِ تابع undefined است.
        type: "javascript",
        value: "file://assert-fidelity.mjs",
      },
    ],
  };
}

const fixtures = PANELS.map(buildFixture);

// اطمینان از اینکه هر پنل واقعاً چیزی برای سنجیدن دارد — یک پنلِ خالی
// (چون قاعده‌ای فعال نشد) یعنی فیکسچر هیچ‌چیز را تست نمی‌کند و سکوتِ
// معنادار می‌دهد، دقیقاً همان کلاسِ N15 («سبزِ بی‌معنا»).
for (const [i, f] of fixtures.entries()) {
  if (!f.vars.findings.length) {
    throw new Error(`پنلِ «${PANELS[i].name}» هیچ finding‌ای تولید نکرد — فیکسچر بی‌فایده است`);
  }
}

const outPath = path.join(__dirname, "fixtures.json");
fs.writeFileSync(outPath, JSON.stringify(fixtures, null, 2) + "\n", "utf8");
console.log(`نوشته شد: ${outPath} (${fixtures.length} پنل)`);
