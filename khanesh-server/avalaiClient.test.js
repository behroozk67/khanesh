// ============================================================
// تست‌های مرزِ HTTP — بدون شبکه، بدون هزینه
//
// این کد تا قبل از استخراج هیچ تستی نداشت، چون داخل server.js بود و
// import کردنش سرور را بالا می‌آورد. حالا fetch تزریق می‌شود، پس ۴۲۹،
// تایم‌اوت، پاسخِ بریده و JSONِ خراب همه قابلِ‌سنجش‌اند.
//
// اجرا: npm test  (همین‌جا کشف می‌شود)
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";

import { createAvalAIClient, safeParseJson } from "./avalaiClient.js";

/** پاسخِ جعلیِ شبیهِ Response */
function fakeRes({ ok = true, status = 200, body = null, headers = {}, text = "" }) {
  return {
    ok, status,
    headers: { get: (k) => headers[k.toLowerCase()] ?? null },
    json: async () => body,
    text: async () => text,
  };
}

const clientWith = (fetchImpl) => createAvalAIClient({
  apiKey: "test-key", baseUrl: "https://example.invalid/v1",
  timeoutMs: 1000, fetchImpl,
});

/** پاسخِ سالمِ چت */
const okBody = (content, extra = {}) => ({
  choices: [{ message: { content }, ...extra }],
});

// ---------- مسیر موفق ----------
test("avalai: محتوای پاسخ برگردانده می‌شود", async () => {
  const c = clientWith(async () => fakeRes({ body: okBody('{"summary":"سلام"}') }));
  assert.equal(await c.call({ model: "m", messages: [] }), '{"summary":"سلام"}');
});

test("avalai: پاسخِ بی‌محتوا به «{}» تبدیل می‌شود، نه undefined", async () => {
  // پایین‌دست safeParseJson روی این کار می‌کند؛ undefined آن را می‌شکند.
  const c = clientWith(async () => fakeRes({ body: { choices: [{ message: {} }] } }));
  assert.equal(await c.call({ model: "m", messages: [] }), "{}");
});

test("avalai: کلید و پارامترها درست در درخواست می‌نشینند", async () => {
  let seen;
  const c = clientWith(async (url, opts) => {
    seen = { url, opts };
    return fakeRes({ body: okBody("{}") });
  });
  await c.call({ model: "gpt-x", messages: [{ role: "user", content: "س" }], maxTokens: 123, temperature: 0 });
  assert.equal(seen.url, "https://example.invalid/v1/chat/completions");
  assert.equal(seen.opts.headers.Authorization, "Bearer test-key");
  const sent = JSON.parse(seen.opts.body);
  assert.equal(sent.model, "gpt-x");
  assert.equal(sent.max_tokens, 123);
  assert.equal(sent.temperature, 0);
  // حالتِ JSON باید روشن باشد وگرنه مدل متنِ آزاد می‌دهد و parse می‌شکند
  assert.deepEqual(sent.response_format, { type: "json_object" });
});

// ---------- خطاها: هر کدام باید از دیگری قابلِ‌تفکیک باشد ----------
// server.js از روی همین message ها کدِ HTTP و پیامِ فارسیِ کاربر را می‌سازد.
test("avalai: ۴۲۹ می‌شود upstream_rate_limit همراه با retryAfter", async () => {
  const c = clientWith(async () => fakeRes({
    ok: false, status: 429, headers: { "retry-after": "42" }, text: "rate limited",
  }));
  await assert.rejects(
    () => c.call({ model: "m", messages: [] }),
    (e) => e.message === "upstream_rate_limit" && e.status === 429 && e.retryAfter === 42,
  );
});

test("avalai: ۴۲۹ بدون Retry-After هم کار می‌کند (retryAfter = null)", async () => {
  const c = clientWith(async () => fakeRes({ ok: false, status: 429 }));
  await assert.rejects(
    () => c.call({ model: "m", messages: [] }),
    (e) => e.message === "upstream_rate_limit" && e.retryAfter === null,
  );
});

test("avalai: خطای دیگر می‌شود upstream_error با همان status", async () => {
  const c = clientWith(async () => fakeRes({ ok: false, status: 500, text: "boom" }));
  await assert.rejects(
    () => c.call({ model: "m", messages: [] }),
    (e) => e.message === "upstream_error" && e.status === 500,
  );
});

test("avalai: شکستِ fetch می‌شود upstream_timeout", async () => {
  const c = clientWith(async () => { throw new Error("network down"); });
  await assert.rejects(
    () => c.call({ model: "m", messages: [] }),
    (e) => e.message === "upstream_timeout" && e.model === "m",
  );
});

test("avalai: بدنهٔ خطای upstream به خطا نمی‌چسبد (ممکن است دادهٔ بیمار را echo کند)", async () => {
  // AvalAI در بدنهٔ خطا بخشی از درخواست را برمی‌گرداند؛ آن درخواست دادهٔ
  // بالینیِ بیمار است. نباید جایی جز طول‌اش ثبت شود.
  const leak = "Hemoglobin 9.2 — patient Ali";
  const c = clientWith(async () => fakeRes({ ok: false, status: 400, text: leak }));
  await assert.rejects(() => c.call({ model: "m", messages: [] }), (e) => {
    assert.ok(!JSON.stringify(Object.values(e)).includes("Ali"), "بدنه نباید روی خطا سوار شود");
    assert.ok(!String(e.message).includes("Ali"));
    return true;
  });
});

// ---------- شمارشِ بریده‌شدن ----------
test("avalai: finish_reason=length شمارندهٔ truncations را بالا می‌برد", async () => {
  // این عدد در /health دیده می‌شود و تنها راهِ فهمیدنِ «سقفِ توکن کم است»
  // از روی ترافیکِ واقعی است — نه حدس. (N7 هم‌خانواده.)
  const c = clientWith(async () => fakeRes({ body: okBody("{}", { finish_reason: "length" }) }));
  assert.deepEqual(c.truncations, {});
  await c.call({ model: "mdl", messages: [] });
  await c.call({ model: "mdl", messages: [] });
  assert.equal(c.truncations.mdl, 2);
});

test("avalai: پاسخِ کامل شمارندهٔ truncations را دست نمی‌زند", async () => {
  const c = clientWith(async () => fakeRes({ body: okBody("{}", { finish_reason: "stop" }) }));
  await c.call({ model: "mdl", messages: [] });
  assert.equal(c.truncations.mdl, undefined);
});

// ---------- ترمیمِ JSON ----------
// هر شاخه یک خرابیِ واقعیِ مدل است؛ اگر null برگردد کاربر تفسیر نمی‌بیند.
test("safeParseJson: JSONِ سالم", () => {
  assert.deepEqual(safeParseJson('{"a":1}'), { a: 1 });
});

test("safeParseJson: بلوکِ ```json حذف می‌شود", () => {
  assert.deepEqual(safeParseJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(safeParseJson('```\n{"a":2}\n```'), { a: 2 });
});

test("safeParseJson: کامای اضافه ترمیم می‌شود (شایع‌ترین خطای مدل)", () => {
  assert.deepEqual(safeParseJson('{"a":1,}'), { a: 1 });
  assert.deepEqual(safeParseJson('{"a":[1,2,],}'), { a: [1, 2] });
});

test("safeParseJson: خروجیِ نصفه‌مانده تا آخرین شیءِ کامل بازیابی می‌شود", () => {
  const cut = '{"abnormal_results":[{"test":"HGB","value":"9.2"},{"test":"MCV","value":"7';
  const out = safeParseJson(cut);
  assert.ok(out, "باید چیزی بازیابی شود، نه null");
  assert.equal(out.abnormal_results.length, 1);
  assert.equal(out.abnormal_results[0].test, "HGB");
});

test("safeParseJson: ورودیِ خالی و بی‌ربط → null", () => {
  for (const bad of [null, undefined, "", "سلام، JSON نیست", "{{{"]) {
    assert.equal(safeParseJson(bad), null, `«${bad}» باید null بدهد`);
  }
});
