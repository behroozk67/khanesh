import test from 'node:test';
import assert from 'node:assert/strict';
import { planAllows, withPlanLocks } from './plans.js';
import { closeDb, initDb } from './database.js';

test.before(() => initDb()); // بدون این، روی درختِ تمیز (بدون database.sqlite) جدول users نیست
test.after(() => closeDb());

test('پلن: ناشناس (AUTH خاموش) محدود نمی‌شود؛ REQUIRE_PAYMENT=false همه‌چیز باز است', async () => {
  assert.equal(await planAllows({ anonymous: true }, 'history'), true);
  process.env.REQUIRE_PAYMENT = 'false';
  try { assert.equal(await planAllows({ userId: 999999 }, 'history'), true); }
  finally { delete process.env.REQUIRE_PAYMENT; }
});

test('پلن: کاربر پایه تاریخچه و نمای تخصصی ندارد؛ نمای تخصصی از پاسخ حذف می‌شود', async () => {
  const u = { userId: 987654321 }; // کاربری که وجود ندارد ⇒ starter
  assert.equal(await planAllows(u, 'history'), false);
  const body = { a: 1, _engine: { urgency: 'none', expert: { x: 1 } } };
  const out = await withPlanLocks(u, body);
  assert.equal(out._engine.expert, undefined);
  assert.equal(out._engine.urgency, 'none');
  assert.ok(body._engine.expert, 'نتیجهٔ اصلی دست نخورد');
});
