// ============================================================
// اسرشنِ سفارشیِ promptfoo — همان منطقِ تورِ ایمنیِ server.js را
// دوباره اجرا می‌کند، نه یک معیارِ سست‌ترِ جداگانه.
//
// چرا از coverage.js واقعی استفاده می‌کنیم نه substring ساده: رجوع به
// توضیحِ خودِ آن فایل — تطبیقِ عینی روی متنِ بازنویسی‌شده شکست می‌خورد و
// دقیقاً با هدفِ «تفسیر حرفه‌ای‌تر» در تضاد است (N7).
// ============================================================

import { missingSentences } from "../rules/coverage.js";

export default function checkFidelity(output, context) {
  const vars = context.vars ?? {};
  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch (err) {
    return { pass: false, score: 0, reason: `خروجی JSON معتبر نیست: ${err.message}` };
  }

  const reasons = [];
  const modelText = `${parsed.summary ?? ""} ${parsed.interpretation ?? ""}`;
  const recText = (parsed.general_recommendations ?? []).join(" ");
  const fullText = `${modelText} ${recText}`;

  // قاعدهٔ ۱ (ENGINE_SYSTEM_PROMPT): must_say باید کامل منتقل شود —
  // اصل II قانون‌نامه: یک نظرِ بالینی نباید در بازنویسی گم شود.
  for (const f of vars.findings ?? []) {
    const missing = missingSentences(f.must_say, modelText);
    if (missing.length) {
      reasons.push(`جملهٔ غایب از یافتهٔ «${f.headline ?? "?"}»: ${missing.join(" | ")}`);
    }
  }

  // قاعدهٔ ۳: تست‌های forbid هرگز نامبرده نشوند.
  for (const forbidden of vars.forbidTests ?? []) {
    if (fullText.includes(forbidden)) {
      reasons.push(`تستِ ممنوع «${forbidden}» در خروجی آمد`);
    }
  }

  // N8: کلیدِ خامِ موتور هرگز نباید به متنِ بیمار برسد.
  for (const rawKey of vars.rawKeys ?? []) {
    if (new RegExp(`\\b${rawKey}\\b`).test(fullText)) {
      reasons.push(`کلید خامِ موتور «${rawKey}» به متن راه یافت`);
    }
  }

  // general_recommendations هرگز نباید خالی بماند (rules-engine.md، بخشِ پرامپت).
  if (!Array.isArray(parsed.general_recommendations) || parsed.general_recommendations.length === 0) {
    reasons.push("general_recommendations خالی است");
  }

  return reasons.length
    ? { pass: false, score: 0, reason: reasons.join(" — ") }
    : { pass: true, score: 1, reason: "پوششِ کامل، بدونِ نشتِ کلید خام، بدونِ تستِ ممنوع" };
}
