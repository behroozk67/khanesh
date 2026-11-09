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
