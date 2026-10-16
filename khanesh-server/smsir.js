// فرستندهٔ پیامکِ کدِ ورود از راهِ sms.ir (API نسخهٔ ۱، «ارسال سریع/وریفای»).
// کلید و الگو فقط از .env می‌آیند؛ بدونِ هر دو، فرستندهٔ mock می‌ماند.
// نتیجه true/false است؛ auth.js روی false به کاربر «ارسال نشد» می‌گوید. هیچ خطایی بیرون نمی‌زند.
// ⚠️ کد در لاگ چاپ نمی‌شود.
const URL = 'https://api.sms.ir/v1/send/verify';

export function makeSmsIrSender({ apiKey, templateId, paramName = 'Code', fetchImpl = fetch } = {}) {
  if (!apiKey || !templateId) return null;
  return async (phone, code) => {
    try {
      const r = await fetchImpl(URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'text/plain', 'x-api-key': apiKey },
        body: JSON.stringify({ mobile: phone, templateId: Number(templateId), parameters: [{ name: paramName, value: String(code) }] }),
        signal: AbortSignal.timeout(10_000),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || (d && d.status !== 1)) {
        console.warn(`[SMS.IR] ارسال ناموفق: HTTP ${r.status}، پیام: ${d?.message ?? '—'}`);
        return false;
      }
      return true;
    } catch (e) {
      console.warn(`[SMS.IR] خطای شبکه: ${e.name}`);
      return false;
    }
  };
}
