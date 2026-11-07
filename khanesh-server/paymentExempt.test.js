import { test } from "node:test";
import assert from "node:assert/strict";
import { paymentExempt } from "./paymentExempt.js";

const ENV = "09120000001, +989350000002";

test("paymentExempt: فقط شمارهٔ فهرست‌شده (با هر قالبِ نوشتن) معاف است", () => {
  assert.equal(paymentExempt({ phone: "09120000001" }, ENV), true);
  assert.equal(paymentExempt({ phone: "9120000001" }, ENV), true);
  assert.equal(paymentExempt({ phone: "09350000002" }, ENV), true);
  assert.equal(paymentExempt({ phone: "09120000009" }, ENV), false);
});

test("paymentExempt: ناشناس، بی‌شماره و env خالی هرگز معاف نیست", () => {
  assert.equal(paymentExempt({ anonymous: true, phone: "09120000001" }, ENV), false);
  assert.equal(paymentExempt({ phone: null }, ENV), false);
  assert.equal(paymentExempt(null, ENV), false);
  assert.equal(paymentExempt({ phone: "09120000001" }, ""), false);
  assert.equal(paymentExempt({ phone: "09120000001" }, undefined), false);
});
