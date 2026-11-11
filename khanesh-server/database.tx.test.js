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


test("هدیهٔ ثبت‌نام: فقط موبایل؛ حذف+ثبت‌نام دوباره هدیه را برنمی‌گرداند؛ اول رایگان بعد خریداری‌شده؛ هم‌زمان یک اعتبار یک بار", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "db-free-"));
  process.env.DB_FILE = path.join(dir, "t.sqlite");
  delete process.env.FREE_SIGNUP_CREDITS;
  const d = await import(`./database.js?free=${Date.now()}`);
  await d.initDb();
  await d.initDb();   // مهاجرت ایدمپوتنت است
  const db = await d.default();
  const row = (id) => db.get("SELECT credits, free_credits FROM users WHERE id = ?", [id]);
  try {
    const a = await d.createUser("09120000001");
    assert.deepEqual(await row(a.id), { credits: 0, free_credits: 2 }, "ثبت‌نامِ موبایلی ۲ هدیه می‌گیرد");
    assert.equal(await d.getFreeCredits(a.id), 2);
    assert.ok((await d.getTrialUntil(a.id)) > new Date().toISOString());
    const em = await d.createUserWithEmail("x@example.com");
    assert.deepEqual(await row(em.id), { credits: 0, free_credits: 0 }, "ایمیل هدیه ندارد");

    // هم‌زمان: ۱ رایگان، ۰ خریداری‌شده ⇒ دقیقاً یکی؛ منفی نمی‌شود
    await db.run("UPDATE users SET free_credits = 1 WHERE id = ?", [a.id]);
    const both = await Promise.all([d.deductUserCredit(a.id, { free: true }), d.deductUserCredit(a.id, { free: true })]);
    assert.deepEqual(both.sort(), [false, true]);
    assert.deepEqual(await row(a.id), { credits: 0, free_credits: 0 });

    // حذف و ثبت‌نامِ دوباره با همان شماره: هدیه برنمی‌گردد (ماندهٔ دفتر = ۰)
    await d.deleteUserCascade(a.id);
    const again = await d.createUser("09120000001");
    assert.deepEqual(await row(again.id), { credits: 0, free_credits: 0 }, "هدیه دوباره داده نشد");
    // ماندهٔ ۱ هم برمی‌گردد، نه ۲ تازه
    await db.run("UPDATE users SET free_credits = 1 WHERE id = ?", [again.id]);
    await d.deleteUserCascade(again.id);
    const third = await d.createUser("09120000001");
    assert.deepEqual(await row(third.id), { credits: 0, free_credits: 1 });

    // خریدار: اول رایگان، خریداری‌شده دست‌نخورده؛ بعد از رایگان، خریداری‌شده
    await db.run("UPDATE users SET credits = 2, free_credits = 1 WHERE id = ?", [third.id]);
    assert.equal(await d.deductUserCredit(third.id, { free: true }), true);
    assert.deepEqual(await row(third.id), { credits: 2, free_credits: 0 });
    assert.equal(await d.deductUserCredit(third.id, { free: true }), true);
    assert.deepEqual(await row(third.id), { credits: 1, free_credits: 0 });

    // مهلتِ گذشته: رایگان شمرده و مصرف نمی‌شود؛ ریست هم ندارد
    await db.run("UPDATE users SET credits = 1, free_credits = 2, trial_until = ? WHERE id = ?", [new Date(Date.now() - 1000).toISOString(), third.id]);
    assert.equal(await d.getFreeCredits(third.id), 0);
    assert.equal(await d.deductUserCredit(third.id, { free: true }), true);
    assert.deepEqual(await row(third.id), { credits: 0, free_credits: 2 });
    assert.equal(await d.deductUserCredit(third.id, { free: true }), false, "نه رایگانِ منقضی، نه خریداری‌شده");

    // FREE_SIGNUP_CREDITS=0 هدیه را خاموش می‌کند
    process.env.FREE_SIGNUP_CREDITS = "0";
    const off = await d.createUser("09120000002");
    assert.deepEqual(await row(off.id), { credits: 0, free_credits: 0 });
  } finally {
    delete process.env.FREE_SIGNUP_CREDITS;
    await d.closeDb();
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
});

test("هدیهٔ ثبت‌نام: سقفِ روزانهٔ کل؛ دفتر فقط هشِ شماره دارد و به JWT_SECRET بسته نیست", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "db-cap-"));
  process.env.DB_FILE = path.join(dir, "t.sqlite");
  const d = await import(`./database.js?cap=${Date.now()}`);
  await d.initDb();
  const db = await d.default();
  const free = async (u) => (await db.get("SELECT free_credits f FROM users WHERE id = ?", [u.id])).f;
  const keep = { ...process.env };
  try {
    process.env.FREE_SIGNUP_DAILY_MAX = "2";
    assert.equal(await free(await d.createUser("09120000001")), 2);
    assert.equal(await free(await d.createUser("09120000002")), 2);
    assert.equal(await free(await d.createUser("09120000003")), 0, "سقفِ روزانهٔ کل");
    assert.equal((await db.get("SELECT COUNT(*) c FROM free_grant_ledger")).c, 2, "هدیه‌ای که داده نشد در دفتر نمی‌ماند");
    delete process.env.FREE_SIGNUP_DAILY_MAX;

    assert.ok(!JSON.stringify(await db.all("SELECT * FROM free_grant_ledger")).includes("09120000001"), "شمارهٔ خام در دفتر نیست");

    // عوض‌شدنِ JWT_SECRET دفتر را بی‌اثر نمی‌کند: حذف + ثبت‌نامِ دوباره ردیفِ تازه و هدیهٔ تازه نمی‌سازد
    const before = (await db.get("SELECT COUNT(*) c FROM free_grant_ledger")).c;
    process.env.JWT_SECRET = "changed-secret";
    await db.run("UPDATE users SET free_credits = 1 WHERE phone = '09120000001'");
    await d.deleteUserCascade((await db.get("SELECT id FROM users WHERE phone = '09120000001'")).id);
    assert.equal(await free(await d.createUser("09120000001")), 1, "ماندهٔ قبلی برمی‌گردد، نه ۲ تازه");
    assert.equal((await db.get("SELECT COUNT(*) c FROM free_grant_ledger")).c, before);
  } finally {
    for (const k of ["FREE_SIGNUP_DAILY_MAX", "JWT_SECRET"]) { if (keep[k] === undefined) delete process.env[k]; else process.env[k] = keep[k]; }
    await d.closeDb();
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
});

test("هدیهٔ ثبت‌نام: کاربرانِ موجود هم یک بار ۲ تفسیر می‌گیرند، سقفِ روزانه را مصرف نمی‌کنند و دوباره داده نمی‌شود", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "db-old-"));
  process.env.DB_FILE = path.join(dir, "t.sqlite");
  const d = await import(`./database.js?old=${Date.now()}`);
  await d.initDb();
  const db = await d.default();
  const row = (p) => db.get("SELECT free_credits f, trial_until t FROM users WHERE phone = ?", [p]);
  try {
    await db.run("INSERT INTO users (phone, credits) VALUES ('09120000001', 4)");
    await db.run("INSERT INTO users (email) VALUES ('old@example.com')");
    await db.exec("PRAGMA user_version = 1");   // حالتِ پایگاهِ قدیمی پیش از این مهاجرت
    await d.initDb();
    const u = await row("09120000001");
    assert.equal(u.f, 2);
    assert.ok(u.t > new Date().toISOString());
    assert.equal((await db.get("SELECT free_credits f FROM users WHERE email = 'old@example.com'")).f, 0, "حسابِ ایمیلی هدیه ندارد");
    assert.equal((await db.get("SELECT credits c FROM users WHERE phone = '09120000001'")).c, 4, "خریداری‌شده دست‌نخورده");
    assert.equal((await db.get("SELECT COUNT(*) c FROM free_grant_ledger WHERE granted_at IS NULL")).c, 1);

    process.env.FREE_SIGNUP_DAILY_MAX = "1";   // اگر backfill شمرده می‌شد، ثبت‌نامِ تازه هدیه نمی‌گرفت
    const fresh = await d.createUser("09120000009");
    assert.equal((await db.get("SELECT free_credits f FROM users WHERE id = ?", [fresh.id])).f, 2);
    delete process.env.FREE_SIGNUP_DAILY_MAX;

    await db.run("UPDATE users SET free_credits = 0 WHERE phone = '09120000001'");
    await d.initDb();
    assert.equal((await row("09120000001")).f, 0, "مهاجرت دوباره هدیه نمی‌دهد");
  } finally {
    delete process.env.FREE_SIGNUP_DAILY_MAX;
    await d.closeDb();
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
});
