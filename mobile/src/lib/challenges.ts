// Habit challenges (retention hook, spec 002): pure catalogue + day/attempt/consistency math.
// Habit text is general wellness; a result can only offer one to start, from the engine's flags (FR-003, suggestedHabits). Persistence: store.ts.
import { normalizeDigits } from "../content/khanesh/digits.js";
import type { EngineTest } from "./engine";

export type Habit = {
  id: string;
  title: string;
  body: string;
  icon: string; // Ionicons name
  /** check = once a day; amount = volume logged several times a day toward `goal` */
  kind: "check" | "amount";
  goal: number;
  unit?: string;
  step?: number;
  auto?: "read";
  custom?: boolean;
  archived?: boolean;
};

export const HABITS: Habit[] = [
  { id: "water", title: "آب کافی", body: "هر لیوان آبی که می‌نوشید را ثبت کنید.", icon: "water", kind: "amount", goal: 8, unit: "لیوان", step: 1 },
  { id: "walk", title: "پیاده‌روی", body: "دقیقه‌های پیاده‌روی روزانه را جمع بزنید.", icon: "walk", kind: "amount", goal: 30, unit: "دقیقه", step: 10 },
  { id: "veg", title: "سبزی و میوه", body: "هر وعده سبزی یا میوه را ثبت کنید.", icon: "nutrition", kind: "amount", goal: 5, unit: "وعده", step: 1 },
  { id: "sleep", title: "خواب منظم", body: "سر ساعتِ همیشگی بخوابید و بیدار شوید.", icon: "moon", kind: "check", goal: 1 },
  { id: "nosugar", title: "بدون نوشیدنی شیرین", body: "روزی بدون نوشابه و آب‌میوهٔ صنعتی.", icon: "cafe", kind: "check", goal: 1 },
  { id: "stretch", title: "حرکات کششی", body: "ده دقیقه حرکات کششی یا نرمش.", icon: "body", kind: "check", goal: 1 },
  { id: "calm", title: "پنج دقیقه آرامش", body: "پنج دقیقه نفسِ عمیق یا مدیتیشن.", icon: "leaf", kind: "check", goal: 1 },
  { id: "read", title: "یک آزمایش را بشناسید", body: "راهنمای یک آزمایش را در بخش «آزمایش‌ها» بخوانید؛ خودکار ثبت می‌شود.", icon: "book", kind: "check", goal: 1, auto: "read" },
];

// The user's own challenges live in the habit state (store.ts). Every attempt calculation resolves ids through habitById,
// so store.ts registers them here on load. A deleted one stays archived: past attempts and trophies still point at it.
let customHabits: Habit[] = [];
export const setCustomHabits = (list: Habit[]) => {
  customHabits = list;
};
export const habitById = (id: string) => HABITS.find((h) => h.id === id) ?? customHabits.find((h) => h.id === id);
/** What can be picked or started now: the catalogue plus the user's own, without the deleted ones. */
export const availableHabits = (custom: Habit[]) => [...HABITS, ...custom.filter((h) => !h.archived)];

export type NewHabit = { title: string; kind: Habit["kind"]; goal: string; unit: string };
const MAX_TITLE = 40;
const MAX_UNIT = 12;
const MAX_GOAL = 1000;

/** Validates the create form; returns the habit, or the Persian message to show. */
export function makeHabit(input: NewHabit, id: string, existing: Habit[]): Habit | string {
  const title = input.title.trim().replace(/\s+/g, " ");
  if (!title) return "نام چالش را بنویسید.";
  if (title.length > MAX_TITLE) return "نام چالش حداکثر ۴۰ حرف باشد.";
  if (existing.some((h) => h.title === title)) return "چالشی با همین نام دارید.";
  const base = { id, title, body: "چالشی که خودتان ساخته‌اید.", icon: "star", custom: true } as const;
  if (input.kind === "check") return { ...base, kind: "check", goal: 1 };
  const digits = normalizeDigits(input.goal).trim();
  const goal = /^\d+$/.test(digits) ? Number(digits) : 0;
  if (goal < 1 || goal > MAX_GOAL) return "هدف روزانه باید عددی بین ۱ تا ۱۰۰۰ باشد.";
  const unit = input.unit.trim();
  if (!unit) return "واحد را بنویسید؛ مثلاً لیوان یا دقیقه.";
  if (unit.length > MAX_UNIT) return "واحد حداکثر ۱۲ حرف باشد.";
  return { ...base, kind: "amount", goal, unit, step: Math.max(1, Math.round(goal / 6)) };
}

export const LENGTHS = [3, 7, 14, 30];
/** Extra days allowed to reach `length` met days: 3→1, 7→3, 14→5, 30→10. */
export const graceOf = (length: number) => Math.ceil(length / 3);

export const TROPHIES: Record<number, { title: string; color: string }> = {
  3: { title: "برنزی", color: "#C27C3E" },
  7: { title: "نقره‌ای", color: "#8E9AA6" },
  14: { title: "طلایی", color: "#D9A21B" },
  30: { title: "الماس", color: "#3BA6C9" },
};

/** habit id → local day (YYYY-MM-DD) → amount (check: 0/1) */
export type Logs = Record<string, Record<string, number>>;
export type Attempt = {
  id: string;
  habit: string;
  length: number;
  start: string;
  status: "active" | "completed" | "failed" | "left";
  end?: string;
  celebrated?: boolean;
};

// ---------- days ----------

/** 0 = Saturday … 6 = Friday (Iranian week). */
export const WEEKDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
export const dayOfWeek = (d: Date) => (d.getDay() + 1) % 7;

export const localDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const DAY = 24 * 3600 * 1000;
const utc = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
export const addDays = (day: string, n: number) => new Date(utc(day) + n * DAY).toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string) => Math.round((utc(b) - utc(a)) / DAY);

// ---------- logging ----------

export const amountOn = (logs: Logs, habit: string, day: string) => logs[habit]?.[day] ?? 0;
export const met = (logs: Logs, h: Habit, day: string) => amountOn(logs, h.id, day) >= h.goal;

/** check toggles; amount adds `delta` (never below 0). Returns new logs. */
export function withLog(logs: Logs, h: Habit, day: string, delta = h.step ?? 1): Logs {
  const cur = amountOn(logs, h.id, day);
  const next = h.kind === "check" ? (cur ? 0 : 1) : Math.max(0, cur + delta);
  return { ...logs, [h.id]: { ...logs[h.id], [day]: next } };
}

// ---------- attempts ----------

export const windowEnd = (a: Attempt) => addDays(a.start, a.length + graceOf(a.length) - 1);

/** Met days of the attempt from its start up to `today` (or its end). */
export function attemptDone(a: Attempt, logs: Logs, today: string): number {
  const h = habitById(a.habit);
  if (!h) return 0;
  const last = [a.end ?? today, windowEnd(a)].sort()[0];
  let n = 0;
  for (let d = a.start; d <= last; d = addDays(d, 1)) if (met(logs, h, d)) n += 1;
  return n;
}

/** Active → completed once `length` days are met, → failed after the window. Others unchanged. */
export function settle(a: Attempt, logs: Logs, today: string): Attempt {
  if (a.status !== "active") return a;
  if (attemptDone(a, logs, today) >= a.length) return { ...a, status: "completed", end: today };
  if (today > windowEnd(a)) return { ...a, status: "failed", end: windowEnd(a) };
  return a;
}

/** Consecutive met days ending today (today not yet met does not break it). */
export function streak(logs: Logs, h: Habit, today: string): number {
  let d = met(logs, h, today) ? today : addDays(today, -1);
  let n = 0;
  while (met(logs, h, d)) {
    n += 1;
    d = addDays(d, -1);
  }
  return n;
}

// ---------- consistency ----------

/** Habits the user was in a challenge for on `day`. */
export function trackedOn(attempts: Attempt[], day: string): string[] {
  return [...new Set(attempts.filter((a) => a.start <= day && day <= (a.end ?? windowEnd(a))).map((a) => a.habit))];
}

/** Share of tracked habits met that day; null when nothing was tracked or the day is in the future. */
export function dayRatio(attempts: Attempt[], logs: Logs, day: string, today: string): number | null {
  if (day > today) return null;
  const ids = trackedOn(attempts, day);
  if (!ids.length) return null;
  return ids.filter((id) => met(logs, habitById(id)!, day)).length / ids.length;
}

/** Calendar of `weeks` Saturday-aligned weeks ending with the current week; rows oldest first. */
export function heatmap(attempts: Attempt[], logs: Logs, today: string, weeks = 5) {
  const thisSat = addDays(today, -dayOfWeek(new Date(utc(today) + 12 * 3600 * 1000)));
  const first = addDays(thisSat, -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const day = addDays(first, w * 7 + d);
      return { day, ratio: dayRatio(attempts, logs, day, today) };
    }),
  );
}

/** Mean daily ratio over the last `days` days that had any tracked habit; null if none. */
export function consistency(attempts: Attempt[], logs: Logs, today: string, days = 30): number | null {
  const r: number[] = [];
  for (let i = 0; i < days; i += 1) {
    const x = dayRatio(attempts, logs, addDays(today, -i), today);
    if (x != null) r.push(x);
  }
  return r.length ? r.reduce((a, b) => a + b, 0) / r.length : null;
}

/** Per-habit share of met days over the last `days` days it was tracked. */
export function habitConsistency(attempts: Attempt[], logs: Logs, h: Habit, today: string, days = 30): number | null {
  let tracked = 0;
  let ok = 0;
  for (let i = 0; i < days; i += 1) {
    const d = addDays(today, -i);
    if (!trackedOn(attempts, d).includes(h.id)) continue;
    tracked += 1;
    if (met(logs, h, d)) ok += 1;
  }
  return tracked ? ok / tracked : null;
}

// ---------- streak badges ----------

export const MILESTONES = [3, 7, 30];
export type Badge = { id: string; habit: string; days: number; at: string };

/** The badge today's log just earned, if any. Once per run: the id carries the run's first day, so undoing and re-logging earns nothing, and a new run after a break can earn it again. */
export function newBadge(logs: Logs, h: Habit, today: string, badges: Badge[]): Badge | null {
  if (!met(logs, h, today)) return null;
  const days = streak(logs, h, today);
  if (!MILESTONES.includes(days)) return null;
  const id = `${h.id}-${days}-${addDays(today, -(days - 1))}`;
  return badges.some((b) => b.id === id) ? null : { id, habit: h.id, days, at: today };
}

// ---------- reminders ----------

export type Reminder = { days: number[]; hour?: number };
export const REMIND_HOURS = [8, 12, 17, 19, 21];
export const DEFAULT_HOUR = 19;
const RISK_HOUR = 21;
const RISK_MINUTE = 30;
// shortcut: one-shot alarms, so someone who doesn't open the app for 14 days stops getting reminders; repeating triggers can't skip logged days.
const HORIZON = 14;

const fa = (n: number) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
const atTime = (day: string, hour: number, minute = 0) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, hour, minute);
};

export type Planned = { id: string; at: Date; body: string };

/**
 * Every reminder still due, soonest first, worked out from state: a finished challenge or a logged day simply has none.
 * The "streak breaks tonight" one needs a run of 2+ days and comes after the user's own time, so a 21:00 reminder gets no second one.
 */
export function plannedReminders(attempts: Attempt[], reminders: Record<string, Reminder>, logs: Logs, now: Date): Planned[] {
  const today = localDay(now);
  const out: Planned[] = [];
  for (const a of attempts) {
    const h = habitById(a.habit);
    const r = reminders[a.habit];
    if (a.status !== "active" || !h || !r?.days.length) continue;
    const hour = r.hour ?? DEFAULT_HOUR;
    const last = windowEnd(a);
    const doneToday = met(logs, h, today);
    for (let i = doneToday ? 1 : 0; i < HORIZON; i += 1) {
      const day = addDays(today, i);
      if (day > last) break;
      const at = atTime(day, hour);
      if (at > now && r.days.includes(dayOfWeek(at))) out.push({ id: `${h.id}-${day}`, at, body: `چالشِ «${h.title}» امروز منتظرِ شماست؛ یادتان نرود ثبتش کنید.` });
    }
    const run = streak(logs, h, today);
    const riskDay = doneToday ? addDays(today, 1) : today;
    const riskAt = atTime(riskDay, RISK_HOUR, RISK_MINUTE);
    if (run >= 2 && hour < RISK_HOUR && riskDay <= last && riskAt > now) {
      out.push({ id: `${h.id}-${riskDay}-risk`, at: riskAt, body: `رشتهٔ ${fa(run)} روزهٔ «${h.title}» امشب می‌شکند؛ هنوز ثبتش نکرده‌اید.` });
    }
  }
  return out.sort((x, y) => x.at.getTime() - y.at.getTime());
}

// ---------- offering a challenge from a result ----------

// Same keys and sources as foods.ts: ADA 2019 for glucose, AHA 2021 for lipids.
const GLUCOSE_HABITS = ["nosugar", "walk"];
const LIPID_HABITS = ["walk", "veg"];
const SUGGEST: Record<string, string[]> = { GLU_F: GLUCOSE_HABITS, HBA1C: GLUCOSE_HABITS, CHOL: LIPID_HABITS, LDL: LIPID_HABITS, TG: LIPID_HABITS };
// Diet and activity advice differs here (potassium, fluids, treatment), so nothing is offered.
const NO_SUGGESTIONS = ["ckd", "dialysis", "cancer", "hospitalized"];

/** Up to two habits to offer, from the engine's own flags only; no threshold is judged here. Nothing on a critical sheet. */
export function suggestedHabits(tests: EngineTest[], hasCritical: boolean, conditions: string[], busy: string[]): { habit: Habit; because: string }[] {
  if (hasCritical || conditions.some((c) => NO_SUGGESTIONS.includes(c))) return [];
  const out: { habit: Habit; because: string }[] = [];
  for (const t of tests) {
    if (!t.abnormal || t.dir !== "high" || t.level === "critical") continue;
    for (const id of SUGGEST[t.key] ?? []) {
      const habit = HABITS.find((h) => h.id === id);
      if (habit && !busy.includes(id) && !out.some((x) => x.habit.id === id)) out.push({ habit, because: t.name });
    }
  }
  return out.slice(0, 2);
}
