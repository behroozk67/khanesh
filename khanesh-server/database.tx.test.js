// sqlite یک اتصالِ مشترک دارد؛ دو BEGIN هم‌زمان «cannot start a transaction within a transaction» می‌دهد و درخواست ۵۰۰ می‌گیرد.
// حذفِ حساب درست بعد از پایانِ تحلیل، هم‌زمان با ثبتِ تاریخچه، همین خطا را می‌داد.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

test("تراکنش‌های هم‌زمان پشتِ هم اجرا می‌شوند و هیچ‌کدام خطا نمی‌دهد", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "db-tx-"));
  process.env.DB_FILE = path.join(dir, "t.sqlite");
  const d = await import("./database.js");
  await d.initDb();
  try {
    const event = (i) => d.insertLabEvent({
      id: `e${i}`, owner: "u:1", jobId: `j${i}`, takenAt: new Date().toISOString(), source: "upload", labName: null, observations: [],
    });
    const r = await Promise.allSettled([event(1), event(2), d.deleteLabEvent("u:1", "none"), d.deleteUserCascade(99), event(3)]);
    assert.deepEqual(r.filter((x) => x.status === "rejected").map((x) => x.reason.message), []);
    assert.equal((await d.listLabEvents("u:1")).length, 3);

    await assert.rejects(d.insertLabEvent({ id: "bad", owner: null, takenAt: null, observations: [] }));
    await event(4);   // تراکنشِ ناموفق قفل را نگه نمی‌دارد
    assert.equal((await d.listLabEvents("u:1")).length, 4);
  } finally {
    await d.closeDb();
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
});

test("ثبتِ پرداخت و اعتبار یک تراکنش است: شکستِ افزودنِ اعتبار، «paid» را هم برمی‌گرداند", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "db-pay-"));
  process.env.DB_FILE = path.join(dir, "t.sqlite");
  const d = await import(`./database.js?pay=${Date.now()}`);
  await d.initDb();
  const db = await d.default();
  try {
    const { lastID: uid } = await db.run("INSERT INTO users (phone) VALUES ('09120000009')");
    await d.createPaymentRecord({ authority: "AUTH1", userId: uid, planId: "empire", amount: 89000 });
    await d.markPaymentVerifying("AUTH1");
    assert.equal((await d.getPaymentByAuthority("AUTH1")).status, "verifying");

    // سقوط بینِ دو نوشتن را با شکستِ UPDATEِ اعتبار شبیه‌سازی می‌کنیم
    await db.exec("CREATE TRIGGER boom BEFORE UPDATE OF credits ON users BEGIN SELECT RAISE(ABORT, 'boom'); END");
    await assert.rejects(d.settlePaymentRecord("AUTH1", { refId: "1" }, { userId: uid, credits: 3, planId: "empire" }));
    assert.equal((await d.getPaymentByAuthority("AUTH1")).status, "verifying", "پرداختِ بی‌اعتبار نباید paid بماند");
    assert.equal((await d.getUserPlan(uid)).credits, 0);

    await db.exec("DROP TRIGGER boom");
    assert.deepEqual(await d.settlePaymentRecord("AUTH1", { refId: "1" }, { userId: uid, credits: 3, planId: "empire" }), { firstTime: true });
    assert.deepEqual(await d.settlePaymentRecord("AUTH1", { refId: "1" }, { userId: uid, credits: 3, planId: "empire" }), { firstTime: false });
    assert.deepEqual(await d.getUserPlan(uid), { credits: 3, active_plan: "empire" });

    // تأییدِ هم‌زمانی که ردِ قطعی گرفت نباید پرداختِ paid را failed کند؛ وگرنه تأییدِ بعدی دوباره اعتبار می‌دهد.
    await d.markPaymentFailed("AUTH1");
    assert.equal((await d.getPaymentByAuthority("AUTH1")).status, "paid");
    assert.deepEqual(await d.settlePaymentRecord("AUTH1", { refId: "1" }, { userId: uid, credits: 3, planId: "empire" }), { firstTime: false });
  } finally {
    await d.closeDb();
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
});
