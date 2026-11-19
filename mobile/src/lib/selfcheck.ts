// Assert-based checks for the pure history + challenge logic (no test runner in this project).
// Run: node src/lib/selfcheck.ts
import { addDays, HABITS, newBadge, plannedReminders, suggestedHabits, type Attempt, attemptDone, availableHabits, consistency, dayOfWeek, graceOf, type Habit, habitById, habitConsistency, heatmap, type Logs, makeHabit, setCustomHabits, settle, streak, windowEnd, withLog } from "./challenges.ts";
import { bandOf, bySection, type EngineTest, interpretationOf, topicOf } from "./engine.ts";
import { ageInYears, currentGestWeeks, gestWeeksOf, pregnancyEligible, pregnancyPatient, planReady, profileComplete } from "./gate.ts";
import { buildManual } from "./manual.ts";
import { faDate } from "./jdate.ts";
import { type HistoryRecord, knownTests, overview, parseRange, pickLabels, scoreTrend, sheetSig, testSeries, upsert } from "./history.ts";
import { pdfHtml } from "./pdf-html.ts";
import { makeBackup, mergeHabits, mergeHistory, parseBackup } from "./backup.ts";
import { splitName } from "./names.ts";
import { bucketTests } from "./buckets.ts";
import { ocrWarningsOf, payNotice } from "./notices.ts";

const eq = (a: unknown, b: unknown, msg = "") => {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`selfcheck failed: ${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
};

// ---------- history ----------
const rec = (id: string, date: string, score: number | null, hgb?: [number, string], sample: string | null = null): HistoryRecord => ({
  id,
  at: date,
  sampleDate: sample,
  sig: id,
  patient: { age: null, sex: null },
  result: {
    _engine: {
      score: score == null ? null : { version: 2, value: score, band: "mid", reason: null },
      tests: hgb ? [{ key: "HGB", name: "هموگلوبین", value: hgb[0], unit: hgb[1], range: "12 - 16", abnormal: false }] : [],
    },
  },
});

const now = Date.parse("2026-11-06T12:00:00Z");
let list: HistoryRecord[] = [];
for (let i = 0; i < 7; i += 1) list = upsert(list, rec(`r${i}`, `2026-0${i + 1}-10T00:00:00Z`, 60 + i, [13 + i / 10, "g/dL"]));
list = upsert(list, rec("old", "2025-01-01T00:00:00Z", 50));
eq(list[0].id, "old", "sorted oldest first");
const trend = scoreTrend(list, now);
eq(trend.length, 5, "max 5 points");
eq(trend.map((p) => p.value), [62, 63, 64, 65, 66], "most recent 5 within a year, ascending");

// same signature replaces, keeps original id and date
const again = upsert(list, { ...rec("new", "2026-11-01T00:00:00Z", 99), sig: "r3" });
eq(again.length, list.length, "duplicate sheet does not add");
eq(again.find((r) => r.sig === "r3")!.id, "r3");
// same sample date replaces too
const s1 = upsert([], rec("a", "2026-01-01T00:00:00Z", 70, undefined, "2025-12-30"));
eq(upsert(s1, { ...rec("b", "2026-02-01T00:00:00Z", 71, undefined, "2025-12-30"), sig: "zz" }).length, 1);

// unit change drops older points
const mixed = upsert(upsert([], rec("u1", "2026-01-01T00:00:00Z", 1, [130, "g/L"])), rec("u2", "2026-02-01T00:00:00Z", 1, [13, "g/dL"]));
const ser = testSeries(mixed, "HGB");
eq(ser.points.length, 1);
eq(ser.droppedUnits, true);
eq(ser.points[0].range, [12, 16]);
eq(parseRange("۱۲"), null);
eq(parseRange("0.5 – 1.2"), [0.5, 1.2]);
eq(knownTests(list)[0].name, "هموگلوبین");
eq(overview([], now), null);
eq(overview(list, now)!.score, 66);
eq(sheetSig({ extracted_tests: [{ name: "a", value: 1 }, { name: "b", value: 2 }] }), sheetSig({ extracted_tests: [{ name: "b", value: 2 }, { name: "a", value: 1 }] }));

// ---------- habit challenges ----------
eq(dayOfWeek(new Date(2026, 10, 7)), 0, "2026-11-07 is Saturday = 0");
eq(addDays("2026-02-28", 1), "2026-03-01");
eq([graceOf(3), graceOf(7), graceOf(14), graceOf(30)], [1, 3, 5, 10]);

const water = habitById("water")!;
const sleep = habitById("sleep")!;
let logs: Logs = {};
// volume habit: several logs a day toward the goal, never below zero
for (let i = 0; i < 3; i += 1) logs = withLog(logs, water, "2026-11-01");
eq(logs.water["2026-11-01"], 3, "3 glasses");
logs = withLog(logs, water, "2026-11-01", -5);
eq(logs.water["2026-11-01"], 0, "clamped at 0");
// check habit toggles
logs = withLog(logs, sleep, "2026-11-01");
eq(logs.sleep["2026-11-01"], 1);
eq(withLog(logs, sleep, "2026-11-01").sleep["2026-11-01"], 0, "toggle off");

// 3-day challenge: window = 3 + 1 grace days (Nov 1–4)
const a3: Attempt = { id: "a", habit: "water", length: 3, start: "2026-11-01", status: "active" };
eq(windowEnd(a3), "2026-11-04");
const fill = (l: Logs, days: string[]) => days.reduce((acc, d) => ({ ...acc, water: { ...acc.water, [d]: 8 } }), l);
let wl = fill({}, ["2026-11-01", "2026-11-03"]);
eq(attemptDone(a3, wl, "2026-11-03"), 2);
eq(settle(a3, wl, "2026-11-03").status, "active", "2 of 3, window open");
wl = fill(wl, ["2026-11-04"]);
eq(settle(a3, wl, "2026-11-04"), { ...a3, status: "completed", end: "2026-11-04" }, "3 met days within grace → completed");
eq(settle(a3, fill({}, ["2026-11-01"]), "2026-11-05"), { ...a3, status: "failed", end: "2026-11-04" }, "window passed → failed");
eq(settle({ ...a3, status: "left" }, wl, "2026-11-05").status, "left", "non-active unchanged");
eq(attemptDone(a3, fill(wl, ["2026-11-06"]), "2026-11-09"), 3, "days after the window don't count");

// streak: today not yet met does not break it
const sl: Logs = { sleep: { "2026-11-03": 1, "2026-11-04": 1, "2026-11-05": 1 } };
eq(streak(sl, sleep, "2026-11-06"), 3);
eq(streak({ sleep: { ...sl.sleep, "2026-11-06": 1 } }, sleep, "2026-11-06"), 4);
eq(streak(sl, sleep, "2026-11-08"), 0, "a missed day resets");

// consistency: two habits tracked Nov 1–4, water met 3 days, sleep met 1 day
const both: Attempt[] = [a3, { id: "b", habit: "sleep", length: 3, start: "2026-11-01", status: "active" }];
const bl: Logs = { ...wl, sleep: { "2026-11-02": 1 } };
eq(consistency(both, bl, "2026-11-04"), (0.5 + 0.5 + 0.5 + 0.5) / 4, "each day one of two met");
eq(habitConsistency(both, bl, water, "2026-11-04"), 3 / 4);
eq(consistency([], {}, "2026-11-04"), null);
const hm = heatmap(both, bl, "2026-11-04");
eq([hm.length, hm[4][0].day, hm[4][6].day], [5, "2026-10-31", "2026-11-06"], "Saturday-aligned weeks ending this week (2026-10-31 is a Saturday)");
eq(hm[4][4].ratio, 0.5, "today counts");
eq(hm[4][5].ratio, null, "future day");
eq(hm[0][0].ratio, null, "untracked day");

// --- manual entry (Tafsir.jsx parity) ---
const man = buildManual({ hb: "۱۲.۵", wbc: "500", fbs: "abc", tg: "" }, { u_pro: "+1" }, "زن", 40);
eq(man.input.tests[0], { key: "hb", name: "Hb", value: 12.5, unit: "g/dL" }, "Persian digits → number, parenthetical stripped");
eq(man.errs.map((e) => [e.key, !!e.unreadable]), [["fbs", true], ["wbc", false]], "unreadable and implausible values are not sent");
eq(man.input.tests.at(-1), { key: "u_pro", name: "Urine Protein", value: "+1", unit: "", kind: "urine" }, "urine stays a string");
eq(man.count, 2, "empty fields skipped");

// ---------- interpret gate ----------
eq(profileComplete({ sex: "زن", age: "30", conditions: [] }), true, "'none' answer counts as complete");
eq(profileComplete({ sex: "زن", age: "30", conditions: null }), true, "conditions unanswered");
eq(profileComplete({ sex: null, age: "30", conditions: [] }), false, "sex missing");
eq(profileComplete({ sex: "مرد", age: " ", conditions: [] }), false, "blank age");
eq([planReady(null), planReady({ credits: 0, paymentsOff: true }), planReady({ credits: 2, paymentsOff: false }), planReady({ credits: 0, paymentsOff: false })], [true, true, true, false], "only a charging server with no credit blocks");

// ---------- pregnancy (user rule: women of 17–45 only) ----------
const woman = (age: string) => ({ sex: "زن" as const, age });
eq([ageInYears("۳۵"), ageInYears("6", "ماه"), ageInYears(""), ageInYears("abc")], [35, 0.5, null, null], "Persian digits and units → years");
eq([pregnancyEligible(woman("17")), pregnancyEligible(woman("45")), pregnancyEligible(woman("16")), pregnancyEligible(woman("46")), pregnancyEligible({ sex: "مرد", age: "30" })], [true, true, false, false, false], "the option is a woman of 17 to 45");
eq([gestWeeksOf({ gestWeeks: "۱۲" }), gestWeeksOf({ gestWeeks: "0" }), gestWeeksOf({ gestWeeks: "43" }), gestWeeksOf({ gestWeeks: "" })], [12, null, null, null], "week must be 1–42");
const weekLater = Date.parse("2026-11-18T00:00:00Z");
eq(currentGestWeeks({ gestWeeks: "12", gestRecordedAt: weekLater - 21 * 24 * 3600 * 1000 }, weekLater), 15, "a recorded week moves forward with the calendar");
eq(currentGestWeeks({ gestWeeks: "40", gestRecordedAt: weekLater - 35 * 24 * 3600 * 1000 }, weekLater), 42, "capped at 42");
eq([pregnancyPatient({ ...woman("30"), pregnant: true, gestWeeks: "12" }), pregnancyPatient({ ...woman("30"), pregnant: true, gestWeeks: "" }), pregnancyPatient({ ...woman("50"), pregnant: true, gestWeeks: "12" }), pregnancyPatient({ ...woman("30"), pregnant: false })], [{ pregnant: true, gestWeeks: 12 }, { pregnant: true }, {}, {}], "only a declared, eligible pregnancy is sent with its week");

// ---------- result band ----------
const t = (o: Partial<EngineTest>): EngineTest => ({ key: "X", name: "x", value: 5, ...o });
eq(bandOf(t({ abnormal: false }), [0, 10]), { zone: 2, pos: 0.5 }, "mid-range value sits mid-green");
eq(bandOf(t({ abnormal: false, value: 99 }), [0, 10])?.zone, 2, "engine says normal → green, whatever the number");
eq(bandOf(t({ abnormal: true, dir: "high", level: "mild" }), null)?.zone, 3, "mild high → upper yellow");
eq(bandOf(t({ abnormal: true, dir: "low", level: "marked" }), null)?.zone, 1, "marked low → lower yellow (red is critical only)");
eq(bandOf(t({ abnormal: true, dir: "low", level: "critical" }), null)?.zone, 0, "critical low → lower red");
eq([bandOf(t({}), null), bandOf(t({ abnormal: true }), null)], [null, null], "no verdict or no direction → no band");
eq(bandOf(t({ abnormal: true, value: 30 }), [30, 100])?.zone, 1, "abnormal without dir at the low edge (vitamin D 30) → lower yellow");
eq(bandOf(t({ abnormal: true, value: 50 }), [30, 100]), null, "abnormal without dir inside the printed range → no band");
eq(bySection(["TSH", "URINE_PROTEIN", "ALT", "WBC", "VIT_D", "GLU_F", "HGB", "FOO"].map((key) => t({ key }))).map((x) => x.key), ["WBC", "HGB", "GLU_F", "ALT", "TSH", "VIT_D", "URINE_PROTEIN", "FOO"], "blood → biochemistry → hormone → vitamin → rest, stable");
const names = [t({ key: "HGB", name: "هموگلوبین" }), t({ key: "ALT", name: "ALT (آلانین)" }), t({ key: "TSH", name: "TSH" }), t({ key: "CRP_Q", name: "CRP" }), t({ key: "URINE_PROTEIN", name: "پروتئین ادرار" })];
eq([topicOf("هموگلوبین شما کمی پایین است.", names), topicOf("ALT و ALT (آلانین) بالاست؛ TSH نیز", names), topicOf("متنی بدون آزمایش", names), topicOf("شاخص التهاب (CRP) شما بالاست.", names), topicOf("پروتئین ادرار مثبت است", names), topicOf("ALTER و CRPX", names)], ["cbc", "liver", null, "inflam", "urine", null], "paragraph topic: category of the tests it mentions (name or Latin part, whole word)");
const mild = bandOf(t({ abnormal: true, dir: "high", level: "mild" }), null)!.pos;
const marked = bandOf(t({ abnormal: true, dir: "high", level: "marked" }), null)!.pos;
eq(mild < marked, true, "higher severity sits further from green");

eq([faDate("2026-11-08"), faDate("2026-03-21"), faDate("2026-03-20")], ["۱۴۰۵/۰۸/۱۷", "۱۴۰۵/۰۱/۰۱", "۱۴۰۴/۱۲/۲۹"], "jalali: Aban 17, Nowruz 1405, last day of 1404");
const urineRec = { id: "u", at: "2026-11-08", sig: "s", result: { _engine: { tests: [{ key: "URINE_PROTEIN", name: "پروتئین ادرار", value: "+2", abnormal: true, fa: "مثبت" }, { key: "HGB", name: "هموگلوبین", value: 14, abnormal: false }] } } } as unknown as HistoryRecord;
eq(knownTests([urineRec]).map((x) => x.key), ["HGB"], "descriptive urine rows never become a numeric series");
eq(testSeries([urineRec], "URINE_PROTEIN").points, [], "no series for a urine row");
eq(faDate("2026-11-08", "long"), "۱۷ آبان ۱۴۰۵", "jalali long");
eq(faDate("nope"), "", "bad date → empty");
const iso = (s: string) => interpretationOf({ summary: s }).summary;
eq(iso("بازهٔ CEA 27.97 ng/mL روی برگه است."), "بازهٔ ⁦CEA 27.97 ng/mL⁩ روی برگه است.", "Latin name + number + unit is one LTR unit");
eq(iso("CA 15-3 و CA 125 10.3 U/mL."), "⁦CA 15-3⁩ و ⁦CA 125 10.3 U/mL⁩.", "hyphenated names and trailing dot");
eq(iso("بین 10 – 30 است"), "بین ⁦10 – 30⁩ است", "spaced range");

// Screenshot case: 9 points 26px apart, all at one height except the peaks.
const flat = [4.87, 5.82, 4.55, 4.55, 4.55, 5.7, 4.2, 4.2, 4.72].map((value, i) => ({ value, x: i * 26, y: 100 - value * 20 }));
const picked = pickLabels(flat);
eq(picked[8], true, "newest label always shown");
eq(picked[1], true, "highest label kept");
eq(flat.every((a, i) => flat.every((b, j) => i >= j || !picked[i] || !picked[j] || Math.abs(a.x - b.x) >= 38 || Math.abs(a.y - b.y) >= 16)), true, "shown labels never overlap");
eq(pickLabels([]).length, 0, "no points");

// ---------- user-made challenges ----------
const form = { title: "  کتاب   خواندن ", kind: "amount" as const, goal: "۲۰", unit: "صفحه" };
const book = makeHabit(form, "c1", availableHabits([])) as Habit;
eq(book.title, "کتاب خواندن", "title trimmed and collapsed");
eq(book.goal, 20, "Persian digits in the goal");
eq(book.step, 3, "step scales with the goal");
eq(makeHabit({ ...form, title: "  " }, "c", []), "نام چالش را بنویسید.", "empty title refused");
eq(makeHabit({ ...form, title: "پیاده‌روی" }, "c", availableHabits([])), "چالشی با همین نام دارید.", "duplicate of a built-in refused");
eq(makeHabit({ ...form, goal: "0" }, "c", []), "هدف روزانه باید عددی بین ۱ تا ۱۰۰۰ باشد.", "zero goal refused");
eq(makeHabit({ ...form, goal: "1001" }, "c", []), "هدف روزانه باید عددی بین ۱ تا ۱۰۰۰ باشد.", "huge goal refused");
eq(makeHabit({ ...form, goal: "2.5" }, "c", []), "هدف روزانه باید عددی بین ۱ تا ۱۰۰۰ باشد.", "fractional goal refused");
eq(makeHabit({ ...form, unit: " " }, "c", []), "واحد را بنویسید؛ مثلاً لیوان یا دقیقه.", "amount needs a unit");
eq((makeHabit({ ...form, kind: "check", goal: "", unit: "" }, "c2", []) as Habit).goal, 1, "check ignores goal and unit");
// A deleted challenge leaves the picker but still resolves, so old attempts keep working.
const gone = { ...book, archived: true };
setCustomHabits([gone]);
eq(availableHabits([gone]).some((h) => h.id === "c1"), false, "archived hidden from the picker");
const bookAttempt: Attempt = { id: "b1", habit: "c1", length: 3, start: "2026-11-01", status: "left", end: "2026-11-02" };
eq(attemptDone(bookAttempt, { c1: { "2026-11-01": 20, "2026-11-02": 5 } }, "2026-11-09"), 1, "custom habit counted against its own goal");
eq(consistency([bookAttempt], { c1: { "2026-11-01": 20 } }, "2026-11-02"), 0.5, "archived habit in consistency does not crash");
setCustomHabits([]);

// A "</script>" inside pdf.js or the file must not end the page's script.
eq(pdfHtml("x</script>", 1, { main: "</script>", worker: "</script>" }).split("</script>").length, 2, "pdf page script stays closed");

{
// ---------- reminders ----------
const noon = new Date(2026, 10, 9, 12, 0); // a Monday (دوشنبه = 2)
const sleepH = HABITS.find((h) => h.id === "sleep")!;
const act: Attempt = { id: "w1", habit: "water", length: 30, start: "2026-11-01", status: "active" };
const everyDay = [0, 1, 2, 3, 4, 5, 6];
let plan = plannedReminders([act], { water: { days: everyDay, hour: 19 } }, {}, noon);
eq(plan[0].at.getHours(), 19, "reminder at the chosen hour");
eq(plan[0].id, "water-2026-11-09", "first reminder is today, not yet logged");
eq(plan.length, 14, "two weeks ahead");
plan = plannedReminders([act], { water: { days: everyDay, hour: 19 } }, { water: { "2026-11-09": 8 } }, noon);
eq(plan[0].id, "water-2026-11-10", "a logged day has no reminder");
eq(plannedReminders([act], { water: { days: everyDay } }, {}, new Date(2026, 10, 9, 20, 0))[0].id, "water-2026-11-10", "a time already passed is skipped");
eq(plannedReminders([{ ...act, status: "completed" }], { water: { days: everyDay } }, {}, noon).length, 0, "a finished challenge has no reminders");
eq(plannedReminders([act], { water: { days: [] } }, {}, noon).length, 0, "no days picked, no reminders");
eq(plannedReminders([act], { water: { days: [2] } }, {}, noon).map((p) => p.id), ["water-2026-11-09", "water-2026-11-16"], "only the picked weekdays");
const ending: Attempt = { ...act, length: 3, start: "2026-11-08" }; // window ends 2026-11-11
eq(plannedReminders([ending], { water: { days: everyDay } }, {}, noon).map((p) => p.id), ["water-2026-11-09", "water-2026-11-10", "water-2026-11-11"], "none after the challenge's window");
const run2 = { sleep: { "2026-11-07": 1, "2026-11-08": 1 } };
const sleepAct: Attempt = { ...act, id: "s1", habit: "sleep" };
let risk = plannedReminders([sleepAct], { sleep: { days: everyDay, hour: 19 } }, run2, noon).filter((p) => p.id.endsWith("-risk"));
eq(risk.length, 1, "at-risk reminder for a run of 2");
eq(risk[0].id, "sleep-2026-11-09-risk", "at risk tonight when today isn't logged");
eq([risk[0].at.getHours(), risk[0].at.getMinutes()], [21, 30], "at-risk time");
eq(risk[0].body.includes("۲ روزه"), true, "at-risk text carries the run in Persian digits");
risk = plannedReminders([sleepAct], { sleep: { days: everyDay, hour: 19 } }, { sleep: { ...run2.sleep, "2026-11-09": 1 } }, noon).filter((p) => p.id.endsWith("-risk"));
eq(risk[0].id, "sleep-2026-11-10-risk", "logged today: at risk tomorrow night");
eq(plannedReminders([sleepAct], { sleep: { days: everyDay, hour: 21 } }, run2, noon).some((p) => p.id.endsWith("-risk")), false, "a 21:00 reminder gets no second one");
eq(plannedReminders([sleepAct], { sleep: { days: everyDay, hour: 19 } }, { sleep: { "2026-11-08": 1 } }, noon).some((p) => p.id.endsWith("-risk")), false, "a run of 1 is not at risk");

// ---------- badges ----------
const b3 = newBadge({ sleep: { "2026-11-07": 1, "2026-11-08": 1, "2026-11-09": 1 } }, sleepH, "2026-11-09", []);
eq(b3, { id: "sleep-3-2026-11-07", habit: "sleep", days: 3, at: "2026-11-09" }, "third day in a row earns the badge");
eq(newBadge({ sleep: { "2026-11-07": 1, "2026-11-08": 1, "2026-11-09": 1 } }, sleepH, "2026-11-09", [b3!]), null, "same run earns it once");
eq(newBadge({ sleep: { "2026-11-08": 1, "2026-11-09": 1 } }, sleepH, "2026-11-09", []), null, "two days is no milestone");
eq(newBadge({ sleep: { "2026-11-07": 1, "2026-11-08": 1 } }, sleepH, "2026-11-09", []), null, "today not met earns nothing");
eq(newBadge({ sleep: { "2026-11-01": 1, "2026-11-02": 1, "2026-11-03": 1, "2026-11-07": 1, "2026-11-08": 1, "2026-11-09": 1 } }, sleepH, "2026-11-09", [{ id: "sleep-3-2026-11-01", habit: "sleep", days: 3, at: "2026-11-03" }])?.id, "sleep-3-2026-11-07", "a new run after a break can earn it again");

// ---------- suggestions ----------
const hiGlu: EngineTest = { key: "GLU_F", name: "قند ناشتا", value: 118, abnormal: true, dir: "high", level: "mild" };
eq(suggestedHabits([hiGlu], false, [], []).map((x) => x.habit.id), ["nosugar", "walk"], "high glucose offers its habits");
eq(suggestedHabits([hiGlu], false, [], [])[0].because, "قند ناشتا", "the reason is the engine's name");
eq(suggestedHabits([hiGlu], true, [], []), [], "nothing on a critical sheet");
eq(suggestedHabits([hiGlu], false, ["ckd"], []), [], "nothing with kidney disease");
eq(suggestedHabits([hiGlu], false, ["dialysis"], []), [], "nothing on dialysis");
eq(suggestedHabits([hiGlu], false, ["htn"], []).length, 2, "other conditions don't block");
eq(suggestedHabits([hiGlu], false, [], ["nosugar"]).map((x) => x.habit.id), ["walk"], "a running challenge isn't offered");
eq(suggestedHabits([{ ...hiGlu, dir: "low" }], false, [], []), [], "only high values");
eq(suggestedHabits([{ ...hiGlu, abnormal: false }], false, [], []), [], "only what the engine flagged");
eq(suggestedHabits([{ ...hiGlu, level: "critical" }], false, [], []), [], "not a critical value");
eq(suggestedHabits([{ ...hiGlu, key: "HGB" }], false, [], []), [], "no habit for other tests");

// ---------- backup ----------
const bkHabits = { logs: { sleep: { "2026-11-01": 1 } }, attempts: [{ ...act, id: "x1", habit: "sleep" }], reminders: { sleep: { days: [1], hour: 8 } }, favorites: ["sleep"], custom: [], badges: [] };
const bkRec: HistoryRecord = { id: "r1", at: "2026-11-01T00:00:00Z", sampleDate: "2026-11-01", sig: "s1", patient: { age: null, sex: null }, result: { _engine: { tests: [] } } };
const bk = makeBackup([bkRec], bkHabits, { age: "40", sex: "مرد", conditions: [] }, "2026-11-09");
const okText = JSON.stringify(bk);
eq(typeof parseBackup(okText), "object", "a good file is accepted");
eq(typeof parseBackup("not json"), "string", "not JSON is refused");
eq(typeof parseBackup(JSON.stringify({ ...bk, profile: { ...bk.profile, name: "سارا" } })), "object", "a profile name is accepted");
eq(typeof parseBackup(JSON.stringify({ ...bk, profile: { ...bk.profile, name: 5 } })), "string", "a non-text name is refused");
eq(typeof parseBackup(JSON.stringify({ ...bk, app: "x" })), "string", "another app's file is refused");
eq((parseBackup(JSON.stringify({ ...bk, version: 2 })) as string).includes("به‌روز"), true, "a newer file says so");
eq(typeof parseBackup(JSON.stringify({ ...bk, habits: { ...bkHabits, attempts: [{ ...bkHabits.attempts[0], habit: "ghost" }] } })), "string", "an attempt for an unknown habit is refused");
eq(typeof parseBackup(JSON.stringify({ ...bk, habits: { ...bkHabits, logs: { sleep: { nope: 1 } } } })), "string", "a bad log day is refused");
eq(typeof parseBackup(JSON.stringify({ ...bk, habits: { ...bkHabits, reminders: { sleep: { days: [9] } } } })), "string", "a bad reminder is refused");
eq(typeof parseBackup(JSON.stringify({ ...bk, history: [{ ...bkRec, result: { _engine: { tests: [{ value: 1 }] } } }] })), "string", "a malformed test row is refused");
eq(typeof parseBackup(JSON.stringify({ ...bk, profile: { age: 40, sex: "مرد" } })), "string", "a bad profile is refused");
eq(typeof parseBackup(JSON.stringify({ ...bk, history: [{ ...bkRec, result: { _engine: { score: { systems: "x" } } } }] })), "string", "a malformed score is refused");
eq(typeof parseBackup(JSON.stringify({ ...bk, history: [{ ...bkRec, result: { _engine: { score: { value: 72, systems: [{ id: "a", fa: "خون", score: 70 }] } } } }] })), "object", "a good score is accepted");
const merged = mergeHabits(
  { ...bkHabits, logs: { sleep: { "2026-11-01": 0, "2026-11-02": 1 } }, attempts: [{ ...act, id: "mine", habit: "sleep" }], favorites: ["veg"] },
  { ...bkHabits, attempts: [{ ...act, id: "theirs", habit: "sleep" }, { ...act, id: "old", habit: "sleep", status: "failed" }] },
);
eq(merged.attempts.map((a) => a.id), ["mine", "old"], "a second running attempt for one habit isn't added; finished ones are");
eq(merged.logs.sleep, { "2026-11-01": 1, "2026-11-02": 1 }, "logs keep the higher amount and every day");
eq(merged.favorites, ["veg", "sleep"], "favourites are combined");
const mineRec = { ...bkRec, id: "r2", result: { summary: "mine" } };
eq(mergeHistory([mineRec], [bkRec]).length, 1, "the same sheet isn't duplicated");
eq(mergeHistory([mineRec], [bkRec])[0].result.summary, "mine", "the copy on this phone wins");
eq(mergeHistory([mineRec], [{ ...bkRec, sig: "other", sampleDate: "2026-01-01" }]).length, 2, "a sheet not on this phone is added");
}

// Catalog names: Persian on the right, English as a badge.
eq(splitName("Ferritin (فریتین)").join("|"), "فریتین|Ferritin", "English (فارسی)");
eq(splitName("پنل آهن (Iron Panel)").join("|"), "پنل آهن|Iron Panel", "فارسی (English)");
eq(splitName("Eosinophil Cationic Protein (ECP)")[1], null, "both Latin: no badge");
eq(splitName("پنل ایمونوگلوبولین‌ها")[1], null, "no parentheses");

// ---------- safety surfaces: paywall banner, OCR warnings, no-verdict rows ----------
// N46: a row with `abnormal: null` is not "in range"; it gets its own bucket everywhere.
const bRows = [{ abnormal: true as const }, { abnormal: false as const }, { abnormal: null }, { level: "critical" }];
eq(bucketTests(bRows).out.length, 2, "abnormal + critical are out-of-range");
eq(bucketTests(bRows).rest.length, 1, "only a known-normal row is in range");
eq(bucketTests(bRows).noVerdict.length, 1, "a row without a verdict is its own bucket");
const nullRec: HistoryRecord = { id: "n1", at: "2026-11-10T00:00:00Z", sampleDate: "2026-11-10", sig: "n1", patient: { age: null, sex: null }, result: { _engine: { tests: [{ key: "CEA", name: "CEA", value: 7, abnormal: null } as unknown as EngineTest] } } };
eq(overview([nullRec])?.noVerdict, 1, "the home card counts the unjudged row");
eq(overview([nullRec])?.abnormal, 0, "and does not call it abnormal");

eq(payNotice({ has_critical: true })?.tone, "bad", "an emergency keeps its banner behind the paywall");
eq(payNotice({ has_critical: true })?.body.includes("وابسته نیست"), true, "the banner says the warning is not paywalled");
eq(payNotice({ has_critical: true, critical_banner: { title: "تیتر", body: "متن" } })?.title, "تیتر", "the server banner wins");
eq(payNotice({ urgency: "soon" })?.tone, "warn", "a soon finding is warned before payment");
eq(payNotice({ urgency: "this_week" }), null, "routine sheets get no banner");
eq(payNotice(null), null, "no payment, no notice");

eq(ocrWarningsOf({ ocr_warnings: [" صفحهٔ ۲ خوانده نشد ", "", "صفحهٔ ۲ خوانده نشد", 5] }), ["صفحهٔ ۲ خوانده نشد"], "warnings are trimmed and de-duplicated");
eq(ocrWarningsOf(null), [], "no result, no warnings");

console.log("selfcheck: all assertions passed");
