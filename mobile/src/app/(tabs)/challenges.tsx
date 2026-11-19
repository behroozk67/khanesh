import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";

import { BADGE_COLOR, Celebration } from "@/components/celebration";
import { HabitCreator } from "@/components/habit-creator";
import { Button, C, Card, faDigits, type Icon, outline, styles as u, T } from "@/components/ui";
import {
  amountOn,
  type Attempt,
  type Badge,
  DEFAULT_HOUR,
  REMIND_HOURS,
  type Reminder,
  attemptDone,
  availableHabits,
  consistency,
  daysBetween,
  type Habit,
  habitById,
  habitConsistency,
  HABITS,
  heatmap,
  LENGTHS,
  localDay,
  met,
  streak,
  TROPHIES,
  WEEKDAYS,
  windowEnd,
} from "@/lib/challenges";
import { success, tap, thump } from "@/lib/feedback";
import { faDate as jalaliDate } from "@/lib/jdate";
import { confirm } from "@/lib/confirm";
import { allowNotifications, deleteAttempts, deleteHabit, EMPTY_HABITS, type HabitState, leaveChallenge, loadHabits, logHabit, markCelebrated, notificationStatus, sendTestNotification, setReminder, startChallenge, toggleFavorite } from "@/lib/store";

const DEFAULT_DAYS = [0, 2, 4]; // شنبه، دوشنبه، چهارشنبه
const hourLabel = (h: number) => `${faDigits(h)}:۰۰`;
const pct = (x: number) => `${faDigits(Math.round(x * 100))}٪`;
const faDate = (day: string) => jalaliDate(day, "short");
const STATUS: Record<Attempt["status"], [string, string]> = {
  active: ["در جریان", C.brand],
  completed: ["کامل شد", C.good],
  failed: ["نیمه‌کاره ماند", C.warn],
  left: ["رها شد", C.muted],
};

export default function Challenges() {
  const [st, setSt] = useState<HabitState>(EMPTY_HABITS);
  const [creating, setCreating] = useState(false);
  const [party, setParty] = useState<Attempt | null>(null);
  const [badge, setBadge] = useState<Badge | null>(null);
  const [remindersOff, setRemindersOff] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const { start } = useLocalSearchParams<{ start?: string }>();
  const today = localDay(new Date());
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: C.surface },
      // "left" is the start side, so the title sits on the right under RTL.
      headerTitleAlign: "left",
      headerRight: () => (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            tap();
            setCreating(true);
          }}
          style={({ pressed }) => [s.headBtn, pressed && { opacity: 0.75 }]}>
          <Ionicons name="add" size={16} color={C.brandInk} />
          <T b style={{ color: C.brandInk, fontSize: 13 }}>چالش جدید</T>
        </Pressable>
      ),
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      loadHabits().then((s) => {
        setSt(s);
        setParty(s.attempts.find((a) => a.status === "completed" && !a.celebrated) ?? null);
      });
    }, []),
  );

  const active = st.attempts.filter((a) => a.status === "active");
  const past = st.attempts.filter((a) => a.status !== "active").reverse();
  const trophies = st.attempts.filter((a) => a.status === "completed");
  const cons = consistency(st.attempts, st.logs, today);
  const bestStreak = Math.max(0, ...active.map((a) => streak(st.logs, habitById(a.habit)!, today)));
  const trackedHabits = [...HABITS, ...st.custom].filter((h) => st.attempts.some((a) => a.habit === h.id));
  // Offered from a result screen: shown first, since the list below is long.
  const offered = start && !active.some((a) => a.habit === start) ? availableHabits(st.custom).find((h) => h.id === start) : undefined;

  async function begin(h: Habit, length: number, days: number[], hour: number) {
    tap();
    const r = await startChallenge(h.id, length, days, hour);
    setSt(r.state);
    setRemindersOff(!r.reminders);
  }

  async function log(h: Habit, delta?: number) {
    const before = met(st.logs, h, today);
    const r = await logHabit(h.id, delta);
    setSt(r.state);
    if (r.completed.length) setParty(r.completed[0]);
    else if (r.badge) setBadge(r.badge);
    else if (!before && met(r.state.logs, h, today)) success();
    else tap();
  }

  return (
    <ScrollView style={{ backgroundColor: C.surface }} contentContainerStyle={[u.page, { backgroundColor: C.surface }]}>
      <LinearGradient colors={[C.brandTint, C.card]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={s.banner}>
        <T b style={{ fontSize: 14, color: C.brandInk }}>عادت‌های سالم، قدم‌به‌قدم</T>
        <View style={s.statsRow}>
          <HeadStat value={cons == null ? "—" : pct(cons)} label="ثبات ۳۰ روز" icon="calendar-outline" color={C.emerald} />
          <View style={s.vsep} />
          <HeadStat value={faDigits(bestStreak)} label="روز پیاپی" icon="flame-outline" color={C.amber} />
          <View style={s.vsep} />
          <HeadStat value={faDigits(trophies.length)} label="جام" icon="trophy-outline" color={C.gold} />
        </View>
      </LinearGradient>

      {remindersOff && (
        <T style={[u.muted, { color: C.warn }]}>
          {Platform.OS === "web" ? "یادآوری فقط در اپ گوشی فعال است." : "اجازهٔ اعلان داده نشد؛ چالش کار می‌کند ولی یادآوری نمی‌آید."}
        </T>
      )}

      {offered && (
        <Card style={s.card}>
          <View style={u.row}>
            <View style={s.icon}>
              <Ionicons name={outline(offered.icon)} size={22} color={C.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <T b style={s.cardTitle}>{offered.title}</T>
              <T style={s.cardSub}>{offered.kind === "amount" ? `هدف روزانه: ${faDigits(offered.goal)} ${offered.unit}` : offered.body}</T>
            </View>
          </View>
          <StartForm
            onStart={(length, days, hour) => {
              router.setParams({ start: undefined });
              begin(offered, length, days, hour);
            }}
          />
          <Pressable accessibilityRole="button" onPress={() => router.setParams({ start: undefined })}>
            <T style={[u.muted, { textAlign: "center" }]}>فعلاً نه</T>
          </Pressable>
        </Card>
      )}

      {active.length > 0 && <Section title="امروز" sub="چالش‌های در جریان؛ ثبتِ امروز را فراموش نکنید." />}
      {active.map((a, i) => {
        const h = habitById(a.habit)!;
        const amount = amountOn(st.logs, h.id, today);
        const done = attemptDone(a, st.logs, today);
        const left = daysBetween(today, windowEnd(a));
        const sk = streak(st.logs, h, today);
        const rem = st.reminders[h.id];
        return (
          <Card key={a.id} delay={i * 50} style={s.card}>
            <View style={u.row}>
              <View style={s.icon}>
                <Ionicons name={outline(h.icon)} size={22} color={C.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <T b style={s.cardTitle}>{h.title}</T>
                <T style={s.cardSub} numberOfLines={2}>
                  چالش {faDigits(a.length)} روزه · {faDigits(done)} از {faDigits(a.length)} روز · {left > 0 ? `${faDigits(left)} روز فرصت` : "آخرین روز"}
                </T>
              </View>
              <View style={[u.row, { gap: 2 }]} accessibilityLabel={`${faDigits(sk)} روز پیاپی`}>
                <Ionicons name="flame-outline" size={16} color={sk ? C.amber : C.faint} />
                <T b style={{ color: sk ? C.amber : C.muted, fontSize: 13 }}>{faDigits(sk)}</T>
              </View>
              {h.kind === "check" && !h.auto && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={amount ? "لغو ثبتِ امروز" : "امروز انجام دادم"}
                  onPress={() => log(h)}
                  style={[s.plus, !!amount && { backgroundColor: C.emerald }]}>
                  <Ionicons name={amount ? "checkmark" : "add"} size={20} color={amount ? C.card : C.brand} />
                </Pressable>
              )}
            </View>
            <View style={[u.row, { gap: 4 }]}>
              {Array.from({ length: a.length }, (_, k) => (
                <View key={k} style={[s.seg, k < done && { backgroundColor: C.brand }]} />
              ))}
            </View>
            {h.kind === "check" ? (
              h.auto ? (
                <T style={[u.muted, met(st.logs, h, today) && { color: C.good }]}>
                  {met(st.logs, h, today) ? "امروز ثبت شد ✓" : "با خواندنِ یک راهنما در «آزمایش‌ها» خودکار ثبت می‌شود."}
                </T>
              ) : (
                <T style={[s.cardSub, !!amount && { color: C.good }]}>{amount ? "امروز ثبت شد ✓ (برای لغو دوباره بزنید)" : "انجام دادید؟ دکمهٔ + را بزنید."}</T>
              )
            ) : (
              <AmountRow h={h} amount={amount} onLog={(d) => log(h, d)} />
            )}
            <Pressable accessibilityRole="button" onPress={() => setEditing(editing === h.id ? null : h.id)} style={u.row}>
              <Ionicons name={rem?.days.length ? "notifications" : "notifications-off-outline"} size={16} color={C.muted} />
              <T style={[u.muted, { flex: 1 }]}>
                {rem?.days.length ? `یادآوری: ساعت ${hourLabel(rem.hour ?? DEFAULT_HOUR)} · ${rem.days.map((d) => WEEKDAYS[d]).join("، ")}` : "بدون یادآوری"}
              </T>
              <Ionicons name={editing === h.id ? "chevron-up" : "chevron-down"} size={16} color={C.muted} />
            </Pressable>
            {editing === h.id && (
              <ReminderEdit
                reminder={rem}
                onSave={async (days, hour) => {
                  tap();
                  setEditing(null);
                  const r = await setReminder(h.id, days, hour);
                  setSt(r.state);
                  setRemindersOff(!r.reminders);
                }}
              />
            )}
            <Pressable
              onPress={async () => {
                thump();
                setSt(await leaveChallenge(a.id));
              }}>
              <T style={[u.muted, { color: C.bad, textAlign: "left" }]}>رها کردن چالش</T>
            </Pressable>
          </Card>
        );
      })}

      {trackedHabits.length > 0 && <Consistency st={st} today={today} habits={trackedHabits} />}

      {(trophies.length > 0 || st.badges.length > 0) && (
        <Card style={s.card}>
          <T b style={s.title}>جام‌های من</T>
          <View style={[u.row, { flexWrap: "wrap", gap: 10 }]}>
            {trophies.map((a) => {
              const t = TROPHIES[a.length] ?? TROPHIES[3];
              return (
                <View key={a.id} style={s.trophy}>
                  <View style={[s.trophyIcon, { backgroundColor: t.color }]}>
                    <Ionicons name="trophy" size={22} color="#fff" />
                  </View>
                  <T style={{ fontSize: 11, textAlign: "center" }} numberOfLines={2}>
                    {habitById(a.habit)?.title} · {faDigits(a.length)} روز
                  </T>
                </View>
              );
            })}
            {st.badges.map((b) => (
              <View key={b.id} style={s.trophy}>
                <View style={[s.trophyIcon, { backgroundColor: BADGE_COLOR }]}>
                  <Ionicons name="flame" size={22} color="#fff" />
                </View>
                <T style={{ fontSize: 11, textAlign: "center" }} numberOfLines={2}>
                  {habitById(b.habit)?.title} · {faDigits(b.days)} روز پیاپی
                </T>
              </View>
            ))}
          </View>
        </Card>
      )}

      {past.length > 0 && (
        <Card style={s.card}>
          <T b style={s.title}>تاریخچهٔ چالش‌ها</T>
          {past.map((a) => {
            const [word, color] = STATUS[a.status];
            return (
              <View key={a.id} style={s.pastRow}>
                <Ionicons name={outline(habitById(a.habit)?.icon ?? "ellipse")} size={18} color={C.muted} />
                <View style={{ flex: 1 }}>
                  <T>{habitById(a.habit)?.title} · {faDigits(a.length)} روزه</T>
                  <T style={u.muted}>
                    {faDate(a.start)} تا {faDate(a.end ?? windowEnd(a))} · {faDigits(attemptDone(a, st.logs, today))} از {faDigits(a.length)} روز
                  </T>
                </View>
                <T b style={{ color, fontSize: 13 }}>{word}</T>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="حذف این چالش از تاریخچه"
                  hitSlop={8}
                  onPress={() => {
                    thump();
                    confirm(a.status === "completed" ? "این چالش و جامِ آن از تاریخچه حذف شود؟" : "این چالش از تاریخچه حذف شود؟", async () => setSt(await deleteAttempts(a.id)));
                  }}
                  style={{ padding: 6 }}>
                  <Ionicons name="trash-outline" size={18} color={C.bad} />
                </Pressable>
              </View>
            );
          })}
          <Button
            kind="outline"
            title="پاک‌کردن همهٔ تاریخچهٔ چالش‌ها"
            onPress={() => {
              thump();
              confirm("همهٔ چالش‌های تمام‌شده، جام‌ها، نشان‌ها و ثبت‌های روزانهٔ آن‌ها حذف شوند؟ چالش‌های در جریان می‌مانند.", async () => setSt(await deleteAttempts()));
            }}
          />
        </Card>
      )}

      <Section title="شروع چالش تازه" sub="یک چالش را بزنید تا طول و یادآوری‌اش را انتخاب کنید." />
      {creating && <HabitCreator onClose={() => setCreating(false)} onCreated={setSt} />}
      <NewChallenge
        habits={availableHabits(st.custom)}
        favorites={st.favorites}
        busy={new Set(active.map((a) => a.habit))}
        onFavorite={async (h) => {
          tap();
          setSt(await toggleFavorite(h.id));
        }}
        onDelete={async (h) => {
          thump();
          setSt(await deleteHabit(h.id));
        }}
        onStart={begin}
      />
      <NotificationsCard />
      <View style={s.foot}>
        <Ionicons name="information-circle-outline" size={15} color={C.subtle} />
        <T style={{ flex: 1, fontSize: 12, lineHeight: 20, color: C.subtle }}>این چالش‌ها عادت‌های عمومیِ سالم‌اند و توصیهٔ پزشکی برای نتیجهٔ آزمایشِ شما نیستند.</T>
      </View>

      <Celebration
        attempt={party}
        badge={badge}
        onClose={() => {
          setBadge(null);
          if (party) markCelebrated(party.id);
          setSt((x) => ({ ...x, attempts: x.attempts.map((a) => (a.id === party?.id ? { ...a, celebrated: true } : a)) }));
          setParty(null);
        }}
      />
    </ScrollView>
  );
}

function HeadStat({ value, label, icon, color }: { value: string; label: string; icon: Icon; color: string }) {
  return (
    <View style={s.stat}>
      <Ionicons name={icon} size={20} color={color} />
      <T b style={{ color: C.ink, fontSize: 18, textAlign: "center" }}>{value}</T>
      <T style={{ color: C.muted, fontSize: 12, textAlign: "center" }}>{label}</T>
    </View>
  );
}

/** Section header: bold title and a one-line explanation. */
function Section({ title, sub }: { title: string; sub: string }) {
  return (
    <View style={{ gap: 2, marginTop: 4 }}>
      <T b style={{ fontSize: 15, color: C.ink }}>{title}</T>
      <T style={{ fontSize: 12, color: C.muted }}>{sub}</T>
    </View>
  );
}

/** Volume habit: − / + by `step`, progress toward the daily goal. */
function AmountRow({ h, amount, onLog }: { h: Habit; amount: number; onLog: (delta: number) => void }) {
  const step = h.step ?? 1;
  const done = amount >= h.goal;
  return (
    <View style={{ gap: 6 }}>
      <View style={[u.row, { justifyContent: "space-between" }]}>
        <Pressable accessibilityLabel={`کم کردن ${faDigits(step)} ${h.unit}`} disabled={!amount} onPress={() => onLog(-step)} style={[s.round, !amount && { opacity: 0.3 }]}>
          <Ionicons name="remove" size={22} color={C.brand} />
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <T b style={{ fontSize: 22, color: done ? C.good : C.ink }}>
            {faDigits(amount)} / {faDigits(h.goal)}
          </T>
          <T style={u.muted}>{h.unit}{done ? " · هدف امروز ✓" : ""}</T>
        </View>
        <Pressable accessibilityLabel={`افزودن ${faDigits(step)} ${h.unit}`} onPress={() => onLog(step)} style={[s.round, done && { backgroundColor: C.emerald }]}>
          <Ionicons name={done ? "checkmark" : "add"} size={22} color={done ? C.card : C.brand} />
        </Pressable>
      </View>
      <View style={s.track}>
        <View style={[s.fill, { width: `${Math.min(1, amount / h.goal) * 100}%`, backgroundColor: done ? C.good : C.brand }]} />
      </View>
      {done && (
        <Animated.View entering={ZoomIn}>
          <T b style={{ textAlign: "center", color: C.good, fontSize: 13 }}>هدفِ امروز کامل شد ✓</T>
        </Animated.View>
      )}
    </View>
  );
}

/** 5-week heatmap (share of active habits met each day) + per-habit consistency bars. */
function Consistency({ st, today, habits }: { st: HabitState; today: string; habits: Habit[] }) {
  const grid = heatmap(st.attempts, st.logs, today);
  return (
    <Card style={s.card}>
      <T b style={s.title}>نمودار ثبات</T>
      <T style={u.muted}>هر خانه یک روز است؛ هرچه پررنگ‌تر، عادت‌های بیشتری انجام شده.</T>
      <View style={[u.row, { gap: 4 }]}>
        {WEEKDAYS.map((w) => (
          <T key={w} style={s.wd}>{w.slice(0, 1)}</T>
        ))}
      </View>
      {grid.map((week, i) => (
        <View key={i} style={[u.row, { gap: 4 }]}>
          {week.map((c) => (
            <View
              key={c.day}
              accessibilityLabel={`${faDate(c.day)}: ${c.ratio == null ? "بدون چالش" : pct(c.ratio)}`}
              style={[
                s.cell,
                c.ratio == null ? { backgroundColor: C.track } : { backgroundColor: C.brand, opacity: 0.18 + 0.82 * c.ratio },
                c.day === today && { borderWidth: 2, borderColor: C.ink },
              ]}
            />
          ))}
        </View>
      ))}
      <View style={[u.row, { justifyContent: "flex-end", gap: 4 }]}>
        <T style={u.muted}>کم</T>
        {[0, 0.5, 1].map((r) => (
          <View key={r} style={[s.legend, { backgroundColor: C.brand, opacity: 0.18 + 0.82 * r }]} />
        ))}
        <T style={u.muted}>زیاد</T>
      </View>
      {habits.map((h) => {
        const c = habitConsistency(st.attempts, st.logs, h, today);
        return (
          <View key={h.id} style={{ gap: 4 }}>
            <View style={[u.row, { justifyContent: "space-between" }]}>
              <T>{h.title}</T>
              <T b style={{ color: C.brand }}>{c == null ? "—" : pct(c)}</T>
            </View>
            <View style={s.track}>
              <View style={[s.fill, { width: `${(c ?? 0) * 100}%`, backgroundColor: C.brand }]} />
            </View>
          </View>
        );
      })}
    </Card>
  );
}

function NewChallenge({
  habits,
  favorites,
  busy,
  onFavorite,
  onDelete,
  onStart,
}: {
  habits: Habit[];
  favorites: string[];
  busy: Set<string>;
  onFavorite: (h: Habit) => void;
  onDelete: (h: Habit) => void;
  onStart: (h: Habit, length: number, days: number[], hour: number) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const free = habits.filter((h) => !busy.has(h.id));
  const others = free.filter((h) => !favorites.includes(h.id));
  const groups: [string, string, Habit[]][] = [
    ["مورد علاقهٔ من", "چالش‌هایی که با قلب نشان کرده‌اید.", free.filter((h) => favorites.includes(h.id))],
    ["روزی یک بار", "یک لمس، تمام.", others.filter((h) => h.kind === "check")],
    ["حجمی", "چند بار در روز تا رسیدن به هدف.", others.filter((h) => h.kind === "amount")],
  ];
  return (
    <>
      {groups.map(
        ([title, sub, list]) =>
          list.length > 0 && (
            <View key={title} style={{ gap: 10 }}>
              <Section title={title} sub={sub} />
              {list.map((h) => (
                <Card key={h.id} style={s.card}>
                  <Pressable
                    style={u.row}
                    onPress={() => {
                      tap();
                      setOpen(open === h.id ? null : h.id);
                    }}>
                    <View style={s.icon}>
                      <Ionicons name={outline(h.icon)} size={22} color={C.brand} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <T b style={s.cardTitle}>{h.title}</T>
                      <T style={s.cardSub} numberOfLines={2}>{h.kind === "amount" ? `هدف روزانه: ${faDigits(h.goal)} ${h.unit}` : h.body}</T>
                    </View>
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: favorites.includes(h.id) }}
                      accessibilityLabel={`${h.title} در علاقه‌مندی‌ها`}
                      hitSlop={12}
                      onPress={() => onFavorite(h)}
                      style={{ padding: 4 }}>
                      <Ionicons name={favorites.includes(h.id) ? "heart" : "heart-outline"} size={18} color={favorites.includes(h.id) ? C.bad : C.faint} />
                    </Pressable>
                    <View style={s.plus}>
                      <Ionicons name={open === h.id ? "chevron-up" : "add"} size={20} color={C.brand} />
                    </View>
                  </Pressable>
                  {open === h.id && (
                    <>
                      <StartForm
                        onStart={(length, days, hour) => {
                          setOpen(null);
                          onStart(h, length, days, hour);
                        }}
                      />
                      {h.custom && (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => {
                            setOpen(null);
                            onDelete(h);
                          }}>
                          <T style={[u.muted, { color: C.bad, textAlign: "left" }]}>حذف این چالش</T>
                        </Pressable>
                      )}
                    </>
                  )}
                </Card>
              ))}
            </View>
          ),
      )}
    </>
  );
}

function ReminderPicker({ days, hour, onDays, onHour }: { days: number[]; hour: number; onDays: (d: number[]) => void; onHour: (h: number) => void }) {
  return (
    <>
      <T style={u.muted}>ساعت یادآوری:</T>
      <View style={[u.row, { flexWrap: "wrap", gap: 6 }]}>
        {REMIND_HOURS.map((x) => (
          <Chip key={x} on={hour === x} label={hourLabel(x)} onPress={() => onHour(x)} />
        ))}
      </View>
      <T style={u.muted}>روزهای یادآوری{days.length ? ":" : " (هیچ روزی انتخاب نشده؛ یادآوری نمی‌آید):"}</T>
      <View style={[u.row, { flexWrap: "wrap", gap: 6 }]}>
        {WEEKDAYS.map((w, d) => (
          <Chip key={w} on={days.includes(d)} label={w} onPress={() => onDays(days.includes(d) ? days.filter((y) => y !== d) : [...days, d].sort())} />
        ))}
      </View>
    </>
  );
}

function StartForm({ onStart }: { onStart: (length: number, days: number[], hour: number) => void }) {
  const [length, setLength] = useState(3);
  const [days, setDays] = useState<number[]>(DEFAULT_DAYS);
  const [hour, setHour] = useState(DEFAULT_HOUR);
  return (
    <>
      <T style={u.muted}>چند روزه؟</T>
      <View style={[u.row, { gap: 6 }]}>
        {LENGTHS.map((n) => (
          <Chip key={n} on={length === n} label={`${faDigits(n)} روز`} onPress={() => setLength(n)} />
        ))}
      </View>
      <ReminderPicker days={days} hour={hour} onDays={setDays} onHour={setHour} />
      <T style={u.muted}>
        برای کامل شدن، هدف را {faDigits(length)} روز انجام دهید؛ {faDigits(length + Math.ceil(length / 3))} روز فرصت دارید.
      </T>
      <Button title={`شروع چالش ${faDigits(length)} روزه`} onPress={() => onStart(length, days, hour)} />
    </>
  );
}

function ReminderEdit({ reminder, onSave }: { reminder?: Reminder; onSave: (days: number[], hour: number) => void }) {
  const [days, setDays] = useState<number[]>(reminder?.days ?? DEFAULT_DAYS);
  const [hour, setHour] = useState(reminder?.hour ?? DEFAULT_HOUR);
  return (
    <>
      <ReminderPicker days={days} hour={hour} onDays={setDays} onHour={setHour} />
      <Button kind="outline" title="ذخیرهٔ یادآوری" onPress={() => onSave(days, hour)} />
    </>
  );
}

/** Shows whether reminders can arrive and offers the one action that helps. Nothing on web: there are no reminders there. */
function NotificationsCard() {
  const [status, setStatus] = useState<Awaited<ReturnType<typeof notificationStatus>>>("web");
  const [error, setError] = useState("");
  useFocusEffect(
    useCallback(() => {
      notificationStatus().then(setStatus);
    }, []),
  );
  if (status === "web") return null;
  const [sub, label, act]: [string, string, () => unknown] =
    status === "granted"
      ? ["اعلان‌ها روشن است.", "اعلان آزمایشی", () => sendTestNotification().catch((e: Error) => setError(`اعلان فرستاده نشد: ${e.message}`))]
      : status === "ask"
        ? [
            "دریافت اعلان روزانه",
            "فعال‌سازی",
            async () => {
              await allowNotifications();
              setStatus(await notificationStatus());
            },
          ]
        : ["اعلان‌ها در تنظیمات گوشی خاموش است.", "تنظیمات", () => Linking.openSettings()];
  return (
    <Card style={{ ...s.card, gap: 8 }}>
      <View style={u.row}>
        <View style={[s.icon, { width: 40, height: 40 }]}>
          <Ionicons name="notifications-outline" size={20} color={C.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <T b style={s.cardTitle}>یادآوری چالش‌ها</T>
          <T style={s.cardSub}>{sub}</T>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            tap();
            setError("");
            act();
          }}
          style={({ pressed }) => [s.headBtn, pressed && { opacity: 0.75 }]}>
          <T b style={{ color: C.brandInk, fontSize: 13 }}>{label}</T>
        </Pressable>
      </View>
      {!!error && <T style={{ color: C.bad, fontSize: 13 }}>{error}</T>}
    </Card>
  );
}

function Chip({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      onPress={() => {
        tap();
        onPress();
      }}
      style={[s.chip, on && s.chipOn]}>
      <T b style={{ fontSize: 12, color: on ? C.brandInk : C.chipInk }}>{label}</T>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { ...u.soft, paddingVertical: 14, paddingHorizontal: 16 },
  title: { fontSize: 16, color: C.ink },
  cardTitle: { fontSize: 15, color: C.ink },
  cardSub: { fontSize: 12, lineHeight: 20, color: C.muted },
  headBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.brandTint, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, marginHorizontal: 8 },
  banner: { borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: C.brandLine },
  statsRow: { flexDirection: "row", alignItems: "stretch" },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  vsep: { width: StyleSheet.hairlineWidth, backgroundColor: C.brandLine },
  foot: { flexDirection: "row", alignItems: "flex-start", gap: 6, paddingHorizontal: 8, marginTop: 4, marginBottom: 8 },
  icon: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" },
  seg: { flex: 1, height: 8, borderRadius: 4, backgroundColor: C.track },
  plus: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" },
  round: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" },
  track: { height: 8, borderRadius: 4, backgroundColor: C.track, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
  wd: { flex: 1, textAlign: "center", fontSize: 11, color: C.muted },
  cell: { flex: 1, aspectRatio: 1, borderRadius: 6 },
  legend: { width: 14, height: 14, borderRadius: 3 },
  trophy: { width: 76, alignItems: "center", gap: 4 },
  trophyIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  pastRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.hair },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.chip, borderWidth: 1, borderColor: C.chip },
  chipOn: { backgroundColor: C.brandTint, borderColor: C.brand },
});
