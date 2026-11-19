// On-device persistence for history and challenges (constitution V), plus local reminders.
// Storage failures mean "empty", never a crash.
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { type Backup, makeBackup, mergeHabits, mergeHistory } from "./backup";
import { type Attempt, availableHabits, type Badge, type Habit, habitById, localDay, type Logs, makeHabit, met, newBadge, type NewHabit, plannedReminders, type Reminder, setCustomHabits, settle, withLog } from "./challenges";
import { currentGestWeeks, gestWeeksOf, pregnancyEligible, profileComplete } from "./gate";
import { type HistoryRecord, sheetSig, upsert } from "./history";

const KEY_HISTORY = "azmayar_history_v1";
const KEY_HABITS = "azmayar_habits_v2"; // v1 weekly check-ins (azmayar_challenges_v1) are not migrated

async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    return JSON.parse((await AsyncStorage.getItem(key)) ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
}
const write = (key: string, v: unknown) => AsyncStorage.setItem(key, JSON.stringify(v)).catch(() => {});

// ---------- profile (age/sex entered once) ----------

/** conditions: nothing picked (null or []) counts as «هیچ‌کدام». */
// `name` is display-only on this phone; it never goes into an interpretation request.
export type AgeUnit = "سال" | "ماه" | "روز";
export const AGE_UNITS: AgeUnit[] = ["سال", "ماه", "روز"];
// `gestWeeks` stays a string while it is typed; `gestRecordedAt` lets the week roll forward with the calendar.
export type Profile = { name?: string; age: string; ageUnit?: AgeUnit; sex: "زن" | "مرد" | null; conditions?: string[] | null; pregnant?: boolean; gestWeeks?: string; gestRecordedAt?: number | null };

/** Drops the pregnancy state of anyone the option doesn't apply to, and moves a recorded week to the current one. */
function normalizePregnancy(p: Profile): Profile {
  if (!p.pregnant && gestWeeksOf(p) == null) return p;
  if (!pregnancyEligible(p) || !p.pregnant) return { ...p, pregnant: false, gestWeeks: "", gestRecordedAt: null };
  const now = Date.now();
  const weeks = currentGestWeeks(p, now);
  return weeks != null && weeks !== gestWeeksOf(p) ? { ...p, gestWeeks: String(weeks), gestRecordedAt: now } : p;
}

export async function loadProfile(): Promise<Profile> {
  return normalizePregnancy(await read<Profile>("azmayar_profile_v1", { age: "", sex: null, conditions: null }));
}
export const saveProfile = (p: Profile) => write("azmayar_profile_v1", p);

export const isOnboarded = async () => (await AsyncStorage.getItem("azmayar_onboarded").catch(() => null)) === "1";
export const setOnboarded = () => AsyncStorage.setItem("azmayar_onboarded", "1").catch(() => {});

// ---------- history ----------

export const loadHistory = () => read<HistoryRecord[]>(KEY_HISTORY, []);

export async function getRecord(id: string) {
  return (await loadHistory()).find((r) => r.id === id) ?? null;
}

/** Saves a finished analysis; returns the stored record id (an older copy of the same sheet keeps its id). */
export async function saveAnalysis(id: string, result: HistoryRecord["result"], patient: HistoryRecord["patient"]) {
  // Fail closed: a reply without engine tests (old server path) could hide an urgent finding, so it is never shown as a result.
  if (!Array.isArray(result._engine?.tests)) throw new Error("پاسخ سرور کامل نبود و نتیجه نمایش داده نشد. دوباره تلاش کنید.");
  const rec: HistoryRecord = {
    id,
    at: new Date().toISOString(),
    sampleDate: typeof result._engine?.context?.sample_date === "string" ? result._engine.context.sample_date : null,
    sig: sheetSig(result),
    patient,
    result,
  };
  const next = upsert(await loadHistory(), rec);
  await write(KEY_HISTORY, next);
  return next.find((r) => r.sig === rec.sig || (rec.sampleDate && r.sampleDate === rec.sampleDate))?.id ?? id;
}

export async function removeRecord(id: string) {
  await write(KEY_HISTORY, (await loadHistory()).filter((r) => r.id !== id));
}

/** «حذف حساب و اطلاعات من»: everything this device keeps, plus its scheduled reminders. Theme and device id stay. */
/** Sign-out wipes the health details (name, age, sex, conditions); history and challenges stay on the phone. */
export const clearProfile = () => AsyncStorage.removeItem("azmayar_profile_v1").catch(() => {});

export async function clearAllData() {
  if (Platform.OS !== "web") await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
  await AsyncStorage.multiRemove([KEY_HISTORY, KEY_HABITS, "azmayar_profile_v1"]).catch(() => {});
}

// ---------- habit challenges ----------

export type HabitState = {
  logs: Logs;
  attempts: Attempt[];
  reminders: Record<string, Reminder>;
  favorites: string[];
  custom: Habit[];
  badges: Badge[];
};
export const EMPTY_HABITS: HabitState = { logs: {}, attempts: [], reminders: {}, favorites: [], custom: [], badges: [] };
const EMPTY = EMPTY_HABITS;

/** Loads and settles attempts (completed / failed) against today. */
export async function loadHabits(): Promise<HabitState> {
  const st = { ...EMPTY, ...(await read<HabitState>(KEY_HABITS, EMPTY)) };
  setCustomHabits(st.custom);
  const today = localDay(new Date());
  const attempts = st.attempts.map((a) => settle(a, st.logs, today));
  const next = { ...st, attempts };
  if (attempts.some((a, i) => a !== st.attempts[i])) await write(KEY_HABITS, next);
  return next;
}

/** Logs today's amount (check toggles). Returns the new state, the attempts this log just completed and the badge it earned. */
export async function logHabit(habitId: string, delta?: number) {
  const st = await loadHabits();
  const h = habitById(habitId);
  if (!h) return { state: st, completed: [] as Attempt[], badge: null };
  const today = localDay(new Date());
  const logs = withLog(st.logs, h, today, delta);
  const attempts = st.attempts.map((a) => (a.habit === habitId ? settle(a, logs, today) : a));
  const completed = attempts.filter((a, i) => a.status === "completed" && st.attempts[i].status === "active");
  const badge = newBadge(logs, h, today, st.badges);
  const state = { ...st, logs, attempts, badges: badge ? [...st.badges, badge] : st.badges };
  await write(KEY_HABITS, state);
  if (met(st.logs, h, today) !== met(logs, h, today)) syncReminders();
  return { state, completed, badge };
}

/** Auto-logs a habit (e.g. reading a test guide) once a day, only while a challenge for it is active. */
export async function autoLog(kind: "read") {
  const st = await loadHabits();
  const h = habitById(kind);
  const today = localDay(new Date());
  if (!h || !st.attempts.some((a) => a.habit === h.id && a.status === "active") || (st.logs[h.id]?.[today] ?? 0) >= h.goal) return;
  await logHabit(h.id);
}

export async function startChallenge(habitId: string, length: number, days: number[], hour: number) {
  const st = await loadHabits();
  const attempt: Attempt = { id: `${habitId}-${Date.now()}`, habit: habitId, length, start: localDay(new Date()), status: "active" };
  const state = { ...st, attempts: [...st.attempts, attempt], reminders: { ...st.reminders, [habitId]: { days, hour } } };
  await write(KEY_HABITS, state);
  const reminders = !days.length || (await allowNotifications());
  syncReminders();
  return { state, reminders };
}

/** Changes a running challenge's reminder days and hour. */
export async function setReminder(habitId: string, days: number[], hour: number) {
  const st = await loadHabits();
  const state = { ...st, reminders: { ...st.reminders, [habitId]: { days, hour } } };
  await write(KEY_HABITS, state);
  const reminders = !days.length || (await allowNotifications());
  syncReminders();
  return { state, reminders };
}

export async function leaveChallenge(attemptId: string) {
  const st = await loadHabits();
  const a = st.attempts.find((x) => x.id === attemptId);
  if (!a) return st;
  const { [a.habit]: _gone, ...reminders } = st.reminders;
  const state = { ...st, reminders, attempts: st.attempts.map((x) => (x.id === attemptId ? { ...x, status: "left" as const, end: localDay(new Date()) } : x)) };
  await write(KEY_HABITS, state);
  syncReminders();
  return state;
}

export async function toggleFavorite(habitId: string) {
  const st = await loadHabits();
  const favorites = st.favorites.includes(habitId) ? st.favorites.filter((id) => id !== habitId) : [...st.favorites, habitId];
  const state = { ...st, favorites };
  await write(KEY_HABITS, state);
  return state;
}

/** A challenge the user just made goes straight into their favourites. Returns the Persian message when the form is invalid. */
export async function createHabit(input: NewHabit): Promise<{ state: HabitState } | { error: string }> {
  const st = await loadHabits();
  const h = makeHabit(input, `c${Date.now()}`, availableHabits(st.custom));
  if (typeof h === "string") return { error: h };
  const state = { ...st, custom: [...st.custom, h], favorites: [...st.favorites, h.id] };
  await write(KEY_HABITS, state);
  setCustomHabits(state.custom);
  return { state };
}

/** Hides a user-made challenge; refused while it runs so an active attempt never loses its picker entry. */
export async function deleteHabit(habitId: string) {
  const st = await loadHabits();
  if (st.attempts.some((a) => a.habit === habitId && a.status === "active")) return st;
  const { [habitId]: _gone, ...reminders } = st.reminders;
  const custom = st.custom.map((h) => (h.id === habitId ? { ...h, archived: true } : h));
  const state = { ...st, reminders, custom, favorites: st.favorites.filter((id) => id !== habitId) };
  await write(KEY_HABITS, state);
  setCustomHabits(custom);
  return state;
}

/** Removes finished attempts (all of them when `attemptId` is omitted; a running one never goes) and the day logs and badges of habits left with no attempt. */
export async function deleteAttempts(attemptId?: string) {
  const st = await loadHabits();
  const attempts = st.attempts.filter((a) => a.status === "active" || (attemptId != null && a.id !== attemptId));
  const logs = Object.fromEntries(Object.entries(st.logs).filter(([habit]) => attempts.some((a) => a.habit === habit)));
  const badges = st.badges.filter((b) => attempts.some((a) => a.habit === b.habit));
  const state = { ...st, attempts, logs, badges };
  await write(KEY_HABITS, state);
  return state;
}

export async function markCelebrated(attemptId: string) {
  const st = await read<HabitState>(KEY_HABITS, EMPTY);
  await write(KEY_HABITS, { ...st, attempts: st.attempts.map((a) => (a.id === attemptId ? { ...a, celebrated: true } : a)) });
}

// ---------- backup ----------

export async function backupText() {
  return JSON.stringify(makeBackup(await loadHistory(), await loadHabits(), await loadProfile(), new Date().toISOString()));
}

/** Adds a validated backup to what's here; nothing on this phone is overwritten. Returns how much was added. */
export async function restoreBackup(b: Backup) {
  const history = await loadHistory();
  const habits = await loadHabits();
  const profile = await loadProfile();
  const nextHistory = mergeHistory(history, b.history);
  const nextHabits = mergeHabits(habits, b.habits);
  await write(KEY_HISTORY, nextHistory);
  await write(KEY_HABITS, nextHabits);
  if (!profileComplete(profile)) await saveProfile(b.profile);
  setCustomHabits(nextHabits.custom);
  syncReminders();
  return { sheets: nextHistory.length - history.length, attempts: nextHabits.attempts.length - habits.attempts.length };
}

// ---------- notifications ----------
// Reminders are worked out from state (plannedReminders) and rescheduled whole, so a finished challenge or a logged day can't keep ringing.

// HIGH shows the banner. Android freezes a channel's importance when it's created, so raising it takes a new id.
const CHANNEL = "reminders";
const OLD_CHANNEL = "challenges";
// iOS keeps only the 64 soonest.
const MAX_SCHEDULED = 60;

async function ensureChannel() {
  if (Platform.OS !== "android") return;
  // eslint-disable-next-line import/namespace -- re-exported via `export *`, which the lint resolver can't follow (tsc checks it)
  await Notifications.setNotificationChannelAsync(CHANNEL, { name: "یادآوری چالش‌ها", importance: Notifications.AndroidImportance.HIGH });
  await Notifications.deleteNotificationChannelAsync(OLD_CHANNEL).catch(() => {});
}

/** Asks if needed; false on web, on a refusal, or if the phone can't schedule. Android 13 asks only once a channel exists. */
export async function allowNotifications() {
  if (Platform.OS === "web") return false;
  try {
    await ensureChannel();
    const perm = await Notifications.getPermissionsAsync();
    if (perm.granted) return true;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch (e) {
    console.warn("[notifications] permission", (e as Error).message);
    return false;
  }
}

export async function notificationStatus(): Promise<"web" | "granted" | "ask" | "blocked"> {
  if (Platform.OS === "web") return "web";
  const perm = await Notifications.getPermissionsAsync().catch(() => null);
  if (perm?.granted) return "granted";
  return perm?.canAskAgain === false ? "blocked" : "ask";
}

/** Shows one right away, so the user can see notifications work without waiting for a reminder. */
export async function sendTestNotification() {
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title: "آزمایار اپ", body: "اعلان‌های اپ درست کار می‌کنند." },
    trigger: Platform.OS === "android" ? { channelId: CHANNEL } : null,
  });
}

async function scheduleAll() {
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  const st = await loadHabits();
  await ensureChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();
  const plan = plannedReminders(st.attempts, st.reminders, st.logs, new Date()).slice(0, MAX_SCHEDULED);
  await Promise.all(
    plan.map((p) =>
      Notifications.scheduleNotificationAsync({
        identifier: p.id,
        content: { title: "آزمایار اپ", body: p.body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.at, channelId: CHANNEL },
      }),
    ),
  );
}

let syncing: Promise<void> = Promise.resolve();
/** Rebuilds every scheduled reminder. One at a time: a cancel-all from a second call must not land in the middle of the first. */
export function syncReminders() {
  if (Platform.OS === "web") return syncing;
  syncing = syncing.then(scheduleAll).catch((e) => console.warn("[notifications] sync", (e as Error).message));
  return syncing;
}

/** Runs `fn` when a notification is tapped, including the tap that launched the app. Returns the unsubscribe. */
export function onNotificationTap(fn: () => void) {
  if (Platform.OS === "web") return () => {};
  if (Notifications.getLastNotificationResponse()) {
    Notifications.clearLastNotificationResponse();
    fn();
  }
  const sub = Notifications.addNotificationResponseReceivedListener(fn);
  return () => sub.remove();
}

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
  });
}
