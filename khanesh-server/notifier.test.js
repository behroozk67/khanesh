import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { notifyNewContactMessage } from "./notifier.js";

describe("notifier unit test", () => {
  test("handles empty/missing config safely without throwing", async () => {
    // When tokens are not configured in test environment
    const res = await notifyNewContactMessage({
      id: 999,
      name: "تستر",
      contact: "test@example.com",
      subject: "آزمون واحد",
      message: "این یک پیام تستی برای بررسی ماژول اعلان است.",
      ip: "127.0.0.1",
      createdAt: new Date().toISOString(),
    });

    assert.equal(typeof res, "object");
    // Email should report SMTP_PASS_MISSING
    assert.equal(res.email.ok, false);
    assert.equal(res.email.error, "SMTP_PASS_MISSING");
  });
});
