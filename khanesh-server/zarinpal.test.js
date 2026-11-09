import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeIranianMobile,
  getZarinpalConfig,
  requestPayment,
  verifyPayment,
  ZARINPAL_ERRORS,
} from './zarinpal.js';

test('Zarinpal: normalizeIranianMobile handles formats', () => {
  assert.equal(normalizeIranianMobile('09121234567'), '09121234567');
  assert.equal(normalizeIranianMobile('۰۹۱۲۱۲۳۴۵۶۷'), '09121234567');
  assert.equal(normalizeIranianMobile('+989121234567'), '09121234567');
  assert.equal(normalizeIranianMobile('00989121234567'), '09121234567');
  assert.equal(normalizeIranianMobile('9121234567'), '09121234567');
  assert.equal(normalizeIranianMobile('  0910 690 3301  '), '09106903301');
  assert.equal(normalizeIranianMobile('12345'), null);
  assert.equal(normalizeIranianMobile(''), null);
  assert.equal(normalizeIranianMobile(null), null);
});

test('Zarinpal: getZarinpalConfig returns valid urls and sandbox detection', () => {
  const origMerchant = process.env.ZARINPAL_MERCHANT_ID;
  const origSandbox = process.env.ZARINPAL_SANDBOX;

  try {
    process.env.ZARINPAL_MERCHANT_ID = '00000000-0000-0000-0000-000000000000';
    delete process.env.ZARINPAL_SANDBOX;
    let cfg = getZarinpalConfig();
    assert.equal(cfg.isSandbox, true);
    assert.match(cfg.baseUrl, /sandbox\.zarinpal\.com/);

    process.env.ZARINPAL_MERCHANT_ID = '2c613d49-2da5-4095-8aac-3174dd57cdad';
    process.env.ZARINPAL_SANDBOX = 'false';
    cfg = getZarinpalConfig();
    assert.equal(cfg.isSandbox, false);
    assert.equal(cfg.merchantId, '2c613d49-2da5-4095-8aac-3174dd57cdad');
    assert.match(cfg.baseUrl, /payment\.zarinpal\.com/);
    assert.match(cfg.gatewayUrl, /payment\.zarinpal\.com/);
  } finally {
    process.env.ZARINPAL_MERCHANT_ID = origMerchant;
    process.env.ZARINPAL_SANDBOX = origSandbox;
  }
});

test('Zarinpal: verifyPayment with simulated authority succeeds immediately', async () => {
  const sim = await verifyPayment({ authority: 'A_TEST_12345_abc', amount: 49000 });
  assert.equal(sim.ok, true);
  assert.equal(sim.simulated, true);
  assert.equal(sim.code, 100);
  assert.ok(sim.refId);
});

test('Zarinpal: verifyPayment without authority returns error', async () => {
  const res = await verifyPayment({ authority: '', amount: 49000 });
  assert.equal(res.ok, false);
  assert.match(res.error, /Authority/);
});

test('Zarinpal: ZARINPAL_ERRORS contains known codes', () => {
  assert.ok(ZARINPAL_ERRORS['-10']);
  assert.ok(ZARINPAL_ERRORS['-11']);
  assert.ok(ZARINPAL_ERRORS['-15']);
});

test('Zarinpal: در production شبیه‌ساز و A_TEST_ پذیرفته نمی‌شود', async () => {
  const orig = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const res = await verifyPayment({ authority: 'A_TEST_1_abc', amount: 49000 });
    assert.equal(res.simulated, undefined);
    assert.equal(res.ok, false);
  } finally {
    if (orig === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = orig;
  }
});
