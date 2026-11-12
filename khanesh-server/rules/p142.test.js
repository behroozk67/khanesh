// P142 (درخواستِ کاربر ۲۰۲۶-۱۱-۱۲):
//   الف) ALT/AST الان > ۲×ULN و در یک سالِ اخیر هم > ۲×ULN بوده ⇒ تفسیر بر پایهٔ همان سابقه؛ فقط متن، فوریت دست‌نخورده
//   ب) بستری (بخش/ICU) ⇒ یک جملهٔ اشاره در چند یافتهٔ شمارشِ خون؛ فوریت دست‌نخورده
import test from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";

const r = (name, value, unit, reference) => ({ name, value, ...(unit ? { unit } : {}), ...(reference ? { reference } : {}) });
const M36 = { age: 36, sex: "M" };
const SAMPLE = "2026-10-16";
const hist = (value, date, key = "ALT") => ({ date, sex: "M", age: 36, graded: [{ test: key, value, abnormal: value > 41, dir: value > 41 ? "high" : null, range: "0–41" }] });
const liver = (tests, extra = {}, patient = M36) => runPatterns(runEngine({ patient, tests, sampleDate: SAMPLE, ...extra })).findings.find((f) => f.rule_id === "liver_pattern");
const ALT120 = [r("ALT", "120", "U/L")];
const YEAR = /در سابقهٔ آزمایش‌های ثبت‌شدهٔ شما، حدودِ ۳ ماه پیش .* بوده/;

test("P142-الف1: ALT ۱۲۰ و ۳ ماه پیش ۱۵۰ ⇒ جملهٔ سابقه؛ «تنها همین یک نتیجه» نمی‌آید؛ فوریت همان بی‌سابقه", () => {
  const withH = liver(ALT120, { priorHistory: [hist(150, "2026-07-16")] });
  const without = liver(ALT120);
  assert.match(withH.must_say, YEAR);
  assert.match(withH.must_say, /حدودِ ۳٫۷ برابرِ حدِ بالای طبیعی/);
  assert.doesNotMatch(withH.must_say, /همین یک نتیجهٔ آنزیم/);
  assert.match(without.must_say, /همین یک نتیجهٔ آنزیم/);
  assert.doesNotMatch(without.must_say, YEAR);
  assert.equal(withH.urgency, without.urgency);
  assert.equal(withH.action, without.action);
});

test("P142-الف2: سابقهٔ زیر ۲×ULN، قدیمی‌تر از یک سال، یا شخصِ دیگر (جنس) ⇒ جملهٔ سابقه نمی‌آید", () => {
  assert.doesNotMatch(liver(ALT120, { priorHistory: [hist(70, "2026-07-16")] }).must_say, YEAR);
  assert.doesNotMatch(liver(ALT120, { priorHistory: [hist(150, "2025-09-01")] }).must_say, /در سابقهٔ آزمایش‌های ثبت‌شدهٔ شما/);
  assert.doesNotMatch(liver(ALT120, { priorHistory: [{ ...hist(150, "2026-07-16"), sex: "F" }] }).must_say, /در سابقهٔ آزمایش‌های ثبت‌شدهٔ شما/);
  assert.equal(runEngine({ patient: M36, tests: ALT120, sampleDate: SAMPLE }).liverYear, undefined);
});

test("P142-الف3: ALT الان مرزی (< ۲×ULN) ⇒ سابقه نیامده؛ AST هم مثل ALT خوانده می‌شود", () => {
  assert.doesNotMatch(liver([r("ALT", "48", "U/L")], { priorHistory: [hist(150, "2026-07-16")] }).must_say, /در سابقهٔ آزمایش‌های ثبت‌شدهٔ شما/);
  const ast = liver([r("AST", "130", "U/L")], { priorHistory: [hist(140, "2026-07-16", "AST")] });
  assert.match(ast.must_say, /در سابقهٔ آزمایش‌های ثبت‌شدهٔ شما، حدودِ ۳ ماه پیش/);
});

test("P142-ب1: بستری ⇒ ائوزینوفیلیا یک جملهٔ اشاره می‌گیرد؛ غیربستری نه؛ فوریت یکی", () => {
  const tests = [r("WBC", "9", "x10^3/uL", "4-10"), r("EOS#", "1.2", "10^3/uL")];
  const f = (patient) => runPatterns(runEngine({ patient, tests })).findings.find((x) => x.rule_id === "eosinophilia");
  const inp = f({ ...M36, conditions: ["hospitalized"] });
  const out = f(M36);
  assert.ok(inp && out, "ائوزینوفیلیا فعال نشد");
  assert.match(inp.must_say, /چون در بیمارستان بستری هستید/);
  assert.doesNotMatch(out.must_say, /بستری/);
  assert.equal(inp.urgency, out.urgency);
});

test("P142-الف4: نتیجهٔ چند دقیقه پیش (همان برگهٔ دوباره‌فرستاده) سابقه نیست؛ >۲×ULN هم‌نوبتِ «قبلی» دوبار گفته نمی‌شود", () => {
  const minutesAgo = hist(150, "2026-10-15T23:55:00Z");
  assert.doesNotMatch(liver(ALT120, { priorHistory: [minutesAgo] }).must_say, /در سابقهٔ آزمایش‌های ثبت‌شدهٔ شما/);
  assert.equal(runEngine({ patient: M36, tests: ALT120, sampleDate: SAMPLE, priorHistory: [minutesAgo] }).liverYear, undefined);
  // ۲ هفته پیش، همان نوبتِ prior ⇒ فقط جملهٔ «کمتر از ۴ هفته»، نه جملهٔ سابقه
  const same = hist(150, "2026-10-02");
  const f = liver(ALT120, { prior: same, priorHistory: [same] });
  assert.match(f.must_say, /کمتر از ۴ هفته است/);
  assert.doesNotMatch(f.must_say, /در سابقهٔ آزمایش‌های ثبت‌شدهٔ شما/);
});

test("P142-الف5: قبلیِ طبیعی + >۲×ULN در ۴ ماه پیش ⇒ «طبیعی بود» می‌ماند ولی «افزایشِ تازه است» نمی‌آید (N20)", () => {
  const last = hist(30, "2026-08-21");
  const f = liver(ALT120, { prior: last, priorHistory: [last, hist(150, "2026-06-16")] });
  assert.match(f.must_say, /طبیعی بود \(30\)\./);
  assert.doesNotMatch(f.must_say, /افزایشِ تازه است/);
  assert.match(f.must_say, /در سابقهٔ آزمایش‌های ثبت‌شدهٔ شما، حدودِ ۴ ماه پیش/);
  // کنترل: بی سابقهٔ قدیمی همان جملهٔ «تازه است»
  assert.match(liver(ALT120, { prior: last }).must_say, /پس این افزایشِ تازه است/);
});

test("P142-الف6: مسیرِ سرور — پنجرهٔ ۳۶۶ روز، عضوِ خانواده و نتیجهٔ بی‌ALT/AST (N24)", async () => {
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { open } = await import("sqlite");
  const sqlite3 = (await import("sqlite3")).default;
  const file = join(tmpdir(), `p142-${process.pid}-${Date.now()}.sqlite`);
  process.env.DB_FILE = file;
  const db = await import("../database.js");
  const { priorFromStoredResult } = await import("./priorStored.js");
  await db.initDb();
  const result = (tests) => ({ _engine: { tests, context: {} } });
  const alt = (v) => result([{ key: "ALT", value: v, abnormal: true, dir: "high", range: "0–41" }]);
  const rows = [["a-recent", null, alt(150), 92], ["b-old", null, alt(160), 400], ["c-member", 7, alt(170), 92], ["d-cbc", null, result([{ key: "HGB", value: 14, abnormal: false, dir: null, range: "13–17" }]), 92]];
  const raw = await open({ filename: file, driver: sqlite3.Database });
  for (const [id, member, res, ago] of rows) {
    await db.createJobRecord(id, 5, 1, member);
    await db.updateJobResult(id, "completed", res);
    await raw.run(`UPDATE jobs SET created_at = datetime('now', ?) WHERE id = ?`, [`-${ago} days`, id]);
  }
  await raw.close();
  try {
  const got = await db.getRecentCompletedJobs(5, "", null);
  assert.deepEqual(got.map((x) => x.id).sort(), ["a-recent", "d-cbc"]);   // b-old (۴۰۰ روز) و c-member (عضو ۷) بیرون‌اند
  const hs = got.map(priorFromStoredResult).filter(Boolean);
  assert.equal(hs.length, 1);
  assert.equal(hs[0].graded[0].value, 150);
  assert.deepEqual((await db.getRecentCompletedJobs(5, "a-recent", null)).map((x) => x.id), ["d-cbc"]);
  } finally {
    await db.closeDb();
    try { (await import("node:fs")).unlinkSync(file); } catch { /* اختیاری */ }
  }
});
