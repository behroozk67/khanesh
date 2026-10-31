// ============================================================
// کلاینت AvalAI — مرزِ HTTP، جدا از منطقِ درخواست
//
// چرا بیرون کشیده شد: این کد (به‌همراه ترمیمِ JSON) هیچ تستی نداشت، چون
// server.js با import کردنش سرور را بالا می‌آورد. با factory و fetchِ
// تزریق‌شدنی، می‌شود ۴۲۹، تایم‌اوت، پاسخِ بریده و JSONِ خراب را بدون شبکه
// و بدون خرجِ واقعی تست کرد.
//
// رفتار عیناً همان چیزی است که در server.js بود — این جابه‌جایی است، نه
// بازنویسی. هر تغییرِ رفتاری اینجا یعنی باگ.
// ============================================================

/**
 * @param {object} cfg
 * @param {string} cfg.apiKey
 * @param {string} cfg.baseUrl
 * @param {number} cfg.timeoutMs
 * @param {Function} [cfg.fetchImpl]  برای تست تزریق می‌شود
 */
export function createAvalAIClient({ apiKey, baseUrl, timeoutMs, fetchImpl }) {
  // شمارشِ قطع‌شدن پاسخ به‌خاطر سقف توکن. در /health دیده می‌شود —
  // قبل از بالا بردن maxTokens اول این را ببین. اگر صفر است، سقف مشکلی
  // ندارد و بالا بردنش فقط هزینه اضافه می‌کند.
  const truncations = {};

  // آخرین شکستِ ارتباط — فقط کدِ خطا، هرگز بدنه یا URL با دادهٔ بیمار.
  // در /health دیده می‌شود تا «خطا داد» بدونِ حدس ریشه‌یابی شود.
  let lastFailure = null;

  async function call({ model, messages, maxTokens = 2000, temperature = 0 }) {
    const doFetch = fetchImpl ?? fetch;
    let upstream;
    try {
      upstream = await doFetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          response_format: { type: "json_object" },
          max_tokens: maxTokens,
        }),
      });
    } catch (err) {
      // ⚠️ هر شکستِ fetch یک «تایم‌اوت» نیست. تا امروز همه — حتی ردشدنِ
      //    فوریِ اتصال (ECONNREFUSED) یا شکستِ DNS (ENOTFOUND) — به
      //    upstream_timeout ترجمه می‌شد و کاربر پیامِ «سرویس خیلی طول کشید»
      //    می‌گرفت؛ یعنی پیام دربارهٔ علت دروغ می‌گفت و ریشه‌یابی (فیلترشکن؟
      //    DNS؟ سرور؟) غیرممکن می‌شد. تنها زمانی که واقعاً تایم‌اوت است،
      //    خودِ AbortSignal.timeout() با name=TimeoutError رد می‌کند.
      const causeCode = err?.cause?.code || err?.code || null;
      const isAbort = err?.name === "AbortError" || err?.name === "TimeoutError";
      console.error("AvalAI fetch failed:", model, err.name, err.message, "Cause:", causeCode || err.cause);
      const e = new Error(isAbort ? "upstream_timeout" : "upstream_unreachable");
      e.model = model;
      // فقط کدِ خطا (مثل ECONNREFUSED) — هرگز بدنه/آدرسِ درخواست.
      e.causeCode = causeCode;
      lastFailure = { code: e.message, causeCode, model, at: new Date().toISOString() };
      throw e;
    }

    if (!upstream.ok) {
      // ⚠️ حریم خصوصی: پاسخ خطای AvalAI ممکن است بخشی از درخواست
      //    (یعنی دادهٔ بالینی بیمار) را echo کند. فقط طول و وضعیت را لاگ کن.
      const errText = await upstream.text().catch(() => "");
      console.error(`AvalAI error: model=${model} status=${upstream.status} bodyLen=${errText.length}`);

      // ۴۲۹ = محدودیت نرخ. کاربر باید بفهمد «شلوغ است» نه «خراب است».
      if (upstream.status === 429) {
        const e = new Error("upstream_rate_limit");
        e.status = 429;
        // Retry-After اگر داد، به کاربر بگو چقدر صبر کند
        const ra = upstream.headers.get("retry-after");
        e.retryAfter = ra ? Number(ra) : null;
        throw e;
      }

      const e = new Error("upstream_error");
      e.status = upstream.status;
      throw e;
    }

    const data = await upstream.json();

    const finishReason = data?.choices?.[0]?.finish_reason;
    if (finishReason === "length") {
      truncations[model] = (truncations[model] || 0) + 1;
      console.warn(
        `⚠️ AvalAI TRUNCATED: model=${model} maxTokens=${maxTokens} ` +
        `usage=${JSON.stringify(data?.usage || {})} — تا حالا ${truncations[model]} بار`
      );
    }

    return data?.choices?.[0]?.message?.content || "{}";
  }

  return { call, truncations, get lastFailure() { return lastFailure; } };
}

// ============================================================
// تلاش برای خواندن JSON، حتی اگر کمی ناقص باشد
// ============================================================
export function safeParseJson(raw) {
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch { /* ادامه */ }

  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch { /* ادامه */ }

  // کامای اضافه — شایع‌ترین خطای مدل‌ها
  // قبلاً به parseError می‌رفت و کاربر تفسیر نمی‌دید. حالا ترمیم می‌شود.
  try {
    return JSON.parse(cleaned.replace(/,(\s*[}\]])/g, "$1"));
  } catch { /* ادامه */ }

  // اگر خروجی نصفه مانده، تا آخرین شیء کامل را برداریم
  const lastComplete = cleaned.lastIndexOf("},");
  if (lastComplete > 0) {
    const candidate = cleaned.slice(0, lastComplete + 1) + "]}";
    try {
      return JSON.parse(candidate);
    } catch { /* ادامه */ }
  }

  return null;
}
