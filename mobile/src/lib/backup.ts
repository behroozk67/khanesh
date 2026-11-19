// Backup file (pure, so selfcheck can run it): build, validate, merge. File I/O lives in backup-file.ts.
// The file comes from outside the app, so everything is checked before it reaches state: screens assume these shapes.
// Restoring only adds: nothing on this phone is overwritten or removed.
import { type Attempt, type Badge, type Habit, HABITS, type Logs, type Reminder } from "./challenges.ts";
import { type HistoryRecord, upsert } from "./history.ts";

export type BackupHabits = { logs: Logs; attempts: Attempt[]; reminders: Record<string, Reminder>; favorites: string[]; custom: Habit[]; badges: Badge[] };
export type BackupProfile = { name?: string; age: string; sex: "زن" | "مرد" | null; conditions?: string[] | null };
export type Backup = { app: "azmayar"; version: 1; at: string; history: HistoryRecord[]; habits: BackupHabits; profile: BackupProfile };

const MAX_CHARS = 50_000_000;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const STATUS = ["active", "completed", "failed", "left"];
const BAD_FILE = "این فایل، فایل پشتیبانِ سالمِ آزمایار اپ نیست.";

const obj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === "string";
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const strs = (v: unknown): v is string[] => Array.isArray(v) && v.every(str);
const list = (v: unknown, ok: (x: Record<string, unknown>) => boolean) => Array.isArray(v) && v.every((x) => obj(x) && ok(x));

function validRecord(r: Record<string, unknown>) {
  if (!str(r.id) || !str(r.at) || Number.isNaN(Date.parse(r.at)) || !str(r.sig) || !obj(r.patient) || !obj(r.result)) return false;
  const e = r.result._engine;
  if (e === undefined) return true;
  // The result, history and report screens walk these fields without further checks.
  if (!obj(e) || (e.tests !== undefined && !list(e.tests, (t) => str(t.key) && str(t.name)))) return false;
  const score = e.score;
  if (score === undefined || score === null) return true;
  return obj(score) && (score.value === undefined || score.value === null || num(score.value)) && (score.systems === undefined || list(score.systems, (x) => str(x.id) && str(x.fa)));
}

function validHabits(h: unknown): h is BackupHabits {
  if (!obj(h) || !strs(h.favorites)) return false;
  const customOk = list(h.custom, (c) => str(c.id) && str(c.title) && str(c.icon) && (c.kind === "check" || c.kind === "amount") && num(c.goal) && c.goal > 0);
  if (!customOk) return false;
  // Screens resolve an active attempt's habit with habitById(...)!, so an unknown id would crash them.
  const known = new Set([...HABITS, ...(h.custom as Habit[])].map((x) => x.id));
  const attemptsOk = list(h.attempts, (a) => str(a.id) && str(a.habit) && known.has(a.habit) && num(a.length) && a.length > 0 && str(a.start) && DAY_RE.test(a.start) && STATUS.includes(a.status as string) && (a.end === undefined || (str(a.end) && DAY_RE.test(a.end))));
  if (!attemptsOk) return false;
  if (!list(h.badges, (b) => str(b.id) && str(b.habit) && num(b.days) && str(b.at))) return false;
  if (!obj(h.logs) || !Object.values(h.logs).every((days) => obj(days) && Object.entries(days).every(([d, n]) => DAY_RE.test(d) && num(n)))) return false;
  const hourOk = (x: unknown) => x === undefined || (num(x) && Number.isInteger(x) && x >= 0 && x <= 23);
  return obj(h.reminders) && Object.values(h.reminders).every((r) => obj(r) && Array.isArray(r.days) && r.days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) && hourOk(r.hour));
}

function validProfile(p: unknown): p is BackupProfile {
  return obj(p) && (p.name === undefined || str(p.name)) && str(p.age) && (p.sex === "زن" || p.sex === "مرد" || p.sex === null) && (p.conditions === undefined || p.conditions === null || strs(p.conditions));
}

export const makeBackup = (history: HistoryRecord[], habits: BackupHabits, profile: BackupProfile, at: string): Backup => ({ app: "azmayar", version: 1, at, history, habits, profile });

/** The backup, or the Persian message to show. Accepted whole or refused whole. */
export function parseBackup(text: string): Backup | string {
  if (text.length > MAX_CHARS) return BAD_FILE;
  let b: unknown;
  try {
    b = JSON.parse(text);
  } catch {
    return BAD_FILE;
  }
  if (!obj(b) || b.app !== "azmayar") return BAD_FILE;
  if (b.version !== 1) return "این فایل با نسخهٔ جدیدتری از اپ ساخته شده؛ اپ را به‌روز کنید.";
  if (!list(b.history, validRecord) || !validHabits(b.habits) || !validProfile(b.profile)) return BAD_FILE;
  return b as unknown as Backup;
}

const unionBy = <T extends { id: string }>(mine: T[], theirs: T[]) => [...mine, ...theirs.filter((t) => !mine.some((m) => m.id === t.id))];

/** Sheets already on this phone win (upsert keeps the later one). */
export const mergeHistory = (mine: HistoryRecord[], theirs: HistoryRecord[]) => [...theirs, ...mine].reduce(upsert, [] as HistoryRecord[]);

export function mergeHabits(mine: BackupHabits, theirs: BackupHabits): BackupHabits {
  const running = new Set(mine.attempts.filter((a) => a.status === "active").map((a) => a.habit));
  const logs: Logs = { ...mine.logs };
  for (const [habit, days] of Object.entries(theirs.logs)) {
    const merged = { ...logs[habit] };
    for (const [d, n] of Object.entries(days)) merged[d] = Math.max(merged[d] ?? 0, n);
    logs[habit] = merged;
  }
  return {
    logs,
    // One running attempt per habit: the picker hides a busy habit by id, and a second one would count the same days twice.
    attempts: unionBy(mine.attempts, theirs.attempts.filter((a) => a.status !== "active" || !running.has(a.habit))),
    reminders: { ...theirs.reminders, ...mine.reminders },
    favorites: [...new Set([...mine.favorites, ...theirs.favorites])],
    custom: unionBy(mine.custom, theirs.custom),
    badges: unionBy(mine.badges, theirs.badges),
  };
}
