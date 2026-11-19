import Ionicons from "@expo/vector-icons/Ionicons";
import { type Href, router, useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HabitCreator } from "@/components/habit-creator";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, C, Card, faDigits, type Icon, ltr, outline, styles as u, T } from "@/components/ui";
import { type Account, deleteAccount, fetchAccount, fetchPlan, isSignedIn, type Plan, signOut } from "@/lib/api";
import { parseBackup } from "@/lib/backup";
import { pickBackupFile, saveBackupFile } from "@/lib/backup-file";
import { availableHabits, localDay } from "@/lib/challenges";
import { ASKED_CONDITIONS, CONDITIONS } from "@/lib/conditions";
import { failure, success, tap } from "@/lib/feedback";
import { AGE_UNITS, backupText, clearAllData, clearProfile, EMPTY_HABITS, type HabitState, loadHabits, loadProfile, type Profile, restoreBackup, saveProfile, toggleFavorite } from "@/lib/store";
import { gestWeeksOf, pregnancyEligible, profileComplete } from "@/lib/gate";
import { onTokenChange } from "@/lib/token-store";
import { missing, stepRoute } from "@/lib/ready";

// Port of the site's Profile.jsx. Age/sex/conditions live on this device; the interpret screen reads them.
export default function ProfileScreen() {
  const { setup } = useLocalSearchParams<{ setup?: string }>();
  const [signedIn, setSignedIn] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [habits, setHabits] = useState<HabitState>(EMPTY_HABITS);
  const [creating, setCreating] = useState(false);
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [backupMsg, setBackupMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      loadProfile().then(setProfile);
      loadHabits().then(setHabits);
      fetchPlan().then(setPlan);
      fetchAccount().then(async (a) => {
        setAccount(a);
        setSignedIn(await isSignedIn());
      });
    }, []),
  );

  // Any sign-out (menu, expired session, deleted account) clears the health details; a sign-in leaves them alone.
  useEffect(
    () =>
      onTokenChange(async () => {
        if (await isSignedIn()) return;
        await clearProfile();
        setProfile(await loadProfile());
        setSignedIn(false);
        setAccount(null);
        setPlan(null);
      }),
    [],
  );

  // Settings (theme, sign-out, delete) in the header; home is a tab.
  useEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: C.surface },
      // "left" is the start side, so the title sits on the right under RTL.
      headerTitleAlign: "left",
      headerRight: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="تنظیمات"
          hitSlop={10}
          onPress={() => {
            tap();
            setMenu(true);
          }}
          style={{ padding: 8 }}>
          <Ionicons name="settings-outline" size={22} color={C.ink} />
        </Pressable>
      ),
    });
  }, [navigation]);

  async function saveBackup() {
    tap();
    setBackupMsg(null);
    try {
      const name = await saveBackupFile(await backupText(), localDay(new Date()));
      if (name) setBackupMsg({ ok: true, text: `فایل پشتیبان ذخیره شد: ${name}` });
    } catch (e) {
      failure();
      setBackupMsg({ ok: false, text: `فایل پشتیبان ساخته نشد: ${(e as Error).message}` });
    }
  }

  async function restore() {
    tap();
    setBackupMsg(null);
    try {
      const text = await pickBackupFile();
      if (text == null) return;
      const b = parseBackup(text);
      if (typeof b === "string") {
        failure();
        setBackupMsg({ ok: false, text: b });
        return;
      }
      const added = await restoreBackup(b);
      setHabits(await loadHabits());
      setProfile(await loadProfile());
      success();
      setBackupMsg({ ok: true, text: `بازگردانی انجام شد: ${faDigits(added.sheets)} برگه و ${faDigits(added.attempts)} چالش اضافه شد.` });
    } catch (e) {
      failure();
      setBackupMsg({ ok: false, text: `بازگردانی انجام نشد: ${(e as Error).message}` });
    }
  }

  async function deleteAll() {
    setBusy(true);
    setError("");
    try {
      await deleteAccount();
      await clearAllData();
      success();
      // The tab stays mounted, so the state must be reset or the next visit still shows «در حال حذف».
      setBusy(false);
      setConfirm(false);
      setMenu(false);
      setSignedIn(false);
      setAccount(null);
      setPlan(null);
      loadProfile().then(setProfile);
      loadHabits().then(setHabits);
      router.replace("/" as Href);
    } catch (e) {
      failure();
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const id = account?.phone || account?.email;
  const name = profile?.name?.trim();
  const update = (patch: Partial<Profile>) => {
    const next = { ...profile!, ...patch };
    // Pregnancy belongs to an eligible woman only: moving sex or age out of 17–45 drops it.
    const clean = pregnancyEligible(next) ? next : { ...next, pregnant: false, gestWeeks: "", gestRecordedAt: null };
    setProfile(clean);
    saveProfile(clean);
  };

  const details = !!profile && profileComplete(profile);
  const steps = [
    { ok: details, text: "مشخصات خود را کامل کنید (جنسیت و سن)" },
    { ok: habits.favorites.length > 0, text: "چالش‌های مورد علاقه را انتخاب کنید (اختیاری)" },
    { ok: signedIn, text: "با شمارهٔ موبایل وارد شوید" },
  ];
  const ready = details && signedIn;

  function signIn() {
    tap();
    if (setup === "1" && !details) return setHint("ابتدا جنسیت و سن را وارد کنید.");
    setHint("");
    router.push({ pathname: "/signin", params: { next: "interpret" } });
  }

  // Account and plan in one card; signed out it carries the sign-in button (first-run step).
  const accountCard = (
    <Card style={s.card}>
      <View style={u.row}>
        <View style={s.avatar}>
          <Ionicons name="person-outline" size={24} color={C.brand} />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <T b style={s.title}>{name || (signedIn ? (id ? ltr(faDigits(id)) : "حساب کاربری") : "وارد نشده‌اید")}</T>
          {!!name && signedIn && !!id && <T style={u.muted}>{ltr(faDigits(id))}</T>}
          {plan ? (
            <View style={s.badge}>
              <T b style={s.badgeT}>{plan.paymentsOff ? "تفسیر رایگان است" : `${faDigits(plan.credits)} نوبت اعتبار تفسیر`}</T>
            </View>
          ) : (
            <T style={u.muted}>{signedIn ? "اطلاعات پلن در دسترس نیست." : "برای تفسیر و خرید پلن با شمارهٔ موبایل وارد شوید."}</T>
          )}
        </View>
      </View>
      {!signedIn && (
        <View style={s.pair}>
          <SmallButton kind="primary" icon="log-in-outline" title="ورود به پروفایل" onPress={signIn} />
        </View>
      )}
      {!!hint && <T style={{ color: C.bad, fontSize: 13 }}>{hint}</T>}
    </Card>
  );

  const none = !profile?.conditions?.length;
  const detailsCard = profile && (
    <Card style={s.card}>
      <T b style={s.title}>پرونده سلامت</T>
      <T style={u.muted}>یک بار پر کنید؛ در هر تفسیر خودکار استفاده می‌شود و فقط روی همین گوشی می‌ماند.</T>
      <View style={{ gap: 6 }}>
        <T style={s.label}>نام (اختیاری)</T>
        <TextInput
          style={[u.t, s.input]}
          value={profile.name ?? ""}
          onChangeText={(name) => update({ name })}
          maxLength={40}
          placeholder="مثلاً سارا"
          placeholderTextColor={C.muted}
          accessibilityLabel="نام"
        />
        <T style={{ fontSize: 12, color: C.muted }}>فقط برای نمایش در همین گوشی است و برای تفسیر ارسال نمی‌شود.</T>
      </View>
      <View style={s.pair}>
        <View style={s.field}>
          <T style={s.label}>جنسیت</T>
          <View style={s.seg}>
            {(["مرد", "زن"] as const).map((x) => {
              const on = profile.sex === x;
              return (
                <Pressable
                  key={x}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    tap();
                    update({ sex: x });
                  }}
                  style={[s.segItem, on && s.segOn]}>
                  <View style={[u.row, { justifyContent: "center", gap: 6 }]}>
                    <Ionicons name={x === "مرد" ? "male" : "female"} size={18} color={on ? C.brandInk : C.chipInk} />
                    <T b style={{ color: on ? C.brandInk : C.chipInk, fontSize: 14 }}>{x}</T>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={s.field}>
          <T style={s.label}>{`سن (${profile.ageUnit ?? "سال"})`}</T>
          <TextInput
            style={[u.t, s.input]}
            value={profile.age}
            onChangeText={(age) => update({ age })}
            keyboardType="number-pad"
            placeholder="مثلاً ۳۵"
            placeholderTextColor={C.muted}
            accessibilityLabel="سن"
          />
          <View style={s.seg}>
            {AGE_UNITS.map((x) => {
              const on = (profile.ageUnit ?? "سال") === x;
              return (
                <Pressable key={x} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => { tap(); update({ ageUnit: x }); }} style={[s.segItem, on && s.segOn]}>
                  <T b style={{ color: on ? C.brandInk : C.chipInk, fontSize: 14, textAlign: "center" }}>{x}</T>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
      {/* Only a woman of 17–45 sees this; the engine reads «باردار» and the week as declared facts. */}
      {pregnancyEligible(profile) && (
        <View style={{ gap: 6 }}>
          <T b style={{ fontSize: 14 }}>بارداری</T>
          <View style={s.chips}>
            <Chip
              on={!!profile.pregnant}
              icon={profile.pregnant ? "checkmark" : "ellipse-outline"}
              label="الان باردار هستم"
              onPress={() => update(profile.pregnant ? { pregnant: false, gestWeeks: "", gestRecordedAt: null } : { pregnant: true, gestRecordedAt: Date.now() })}
            />
          </View>
          {!!profile.pregnant && (
            <>
              <T style={s.label}>هفتهٔ بارداری (اختیاری)</T>
              <TextInput
                style={[u.t, s.input]}
                value={profile.gestWeeks ?? ""}
                onChangeText={(gestWeeks) => update({ gestWeeks, gestRecordedAt: Date.now() })}
                keyboardType="number-pad"
                placeholder="مثلاً ۱۲"
                placeholderTextColor={C.muted}
                accessibilityLabel="هفتهٔ بارداری"
              />
              {(profile.gestWeeks ?? "").trim() !== "" && gestWeeksOf(profile) == null ? (
                <T style={{ color: C.bad, fontSize: 12 }}>هفتهٔ بارداری را عددی بین ۱ و ۴۲ وارد کنید.</T>
              ) : (
                <T style={{ fontSize: 12, color: C.muted }}>هفتهٔ بارداری در محاسبهٔ محدوده‌ها و تفسیر لحاظ می‌شود. اگر نمی‌دانید خالی بگذارید.</T>
              )}
            </>
          )}
        </View>
      )}
      <T b style={{ fontSize: 14 }}>بیماری زمینه‌ای دارید؟</T>
      <T style={u.muted}>اگر چیزی انتخاب نکنید، «هیچ‌کدام» در نظر گرفته می‌شود.</T>
      <View style={s.chips}>
        <Chip
          on={none}
          icon={none ? "checkmark" : "remove-circle-outline"}
          label="هیچ‌کدام"
          onPress={() => update({ conditions: [] })}
        />
        {CONDITIONS.filter((c) => ASKED_CONDITIONS.includes(c.id) || profile.conditions?.includes(c.id)).map((c) => {
          const on = !!profile.conditions?.includes(c.id);
          return (
            <Chip
              key={c.id}
              on={on}
              icon={on ? "checkmark" : outline(c.icon)}
              label={c.fa}
              onPress={() => update({ conditions: on ? (profile.conditions ?? []).filter((y) => y !== c.id) : [...(profile.conditions ?? []), c.id] })}
            />
          );
        })}
      </View>
    </Card>
  );

  const setupCard = (
    <Card style={s.card}>
      <T b style={s.title}>پیش از اولین تفسیر</T>
      {steps.map((st, i) => (
        <View key={i} style={u.row}>
          <Ionicons name={st.ok ? "checkmark-circle-outline" : "ellipse-outline"} size={22} color={st.ok ? C.good : C.muted} />
          <T style={{ flex: 1, fontSize: 14 }}>{st.text}</T>
        </View>
      ))}
      {signedIn && (
        <Button
          title="تفسیر"
          disabled={!ready}
          onPress={async () => {
            // No plan yet: the plans page comes next, then the camera/PDF screen.
            const m = await missing();
            router.setParams({ setup: undefined });
            router.push(m ? stepRoute(m) : ("/interpret" as Href));
          }}
        />
      )}
    </Card>
  );

  return (
    <ScrollView style={{ backgroundColor: C.surface }} contentContainerStyle={[u.page, { backgroundColor: C.surface }]}>
      {/* First run asks for the details before sign-in, so they come first there. */}
      {setup === "1" ? (
        <>
          {detailsCard}
          {setupCard}
          {accountCard}
        </>
      ) : (
        <>
          {accountCard}
          {detailsCard}
        </>
      )}

      <Card style={s.card}>
        <T b style={s.title}>چالش‌های مورد علاقه</T>
        <T style={u.muted}>چالش‌های دلخواهتان را انتخاب کنید؛ در بخش «چالش‌ها» بالاتر از بقیه نشان داده می‌شوند.</T>
        <View style={s.chips}>
          {availableHabits(habits.custom).map((h) => (
            <Chip
              key={h.id}
              on={habits.favorites.includes(h.id)}
              icon={outline(h.icon)}
              label={h.title}
              onPress={async () => setHabits(await toggleFavorite(h.id))}
            />
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            tap();
            setCreating(true);
          }}
          style={({ pressed }) => [s.dashed, pressed && { opacity: 0.7 }]}>
          <Ionicons name="add" size={18} color={C.brand} />
          <T b style={{ color: C.brand, fontSize: 14 }}>ساختن چالش جدید</T>
        </Pressable>
        {creating && <HabitCreator onClose={() => setCreating(false)} onCreated={setHabits} />}
      </Card>

      <Card style={s.card}>
        <T b style={s.title}>پشتیبان‌گیری</T>
        <T style={u.muted}>تاریخچهٔ آزمایش‌ها، چالش‌ها و مشخصات فقط روی همین گوشی است. با فایل پشتیبان می‌توانید آن‌ها را نگه دارید یا به گوشی دیگری ببرید.</T>
        <View style={s.note}>
          <Ionicons name="shield-outline" size={18} color={C.noteInk} />
          <T style={{ flex: 1, color: C.noteInk, fontSize: 13, lineHeight: 22 }}>این فایل نتایج آزمایش و اطلاعات سلامت شما را بدون رمز در خود دارد؛ آن را جای امن نگه دارید و برای کسی نفرستید.</T>
        </View>
        <View style={s.pair}>
          <SmallButton kind="brand" icon="download-outline" title="ساختن فایل پشتیبان" onPress={saveBackup} />
          <SmallButton kind="plain" icon="refresh-outline" title="بازگرداندن از فایل" onPress={restore} />
        </View>
        <T style={u.muted}>بازگردانی فقط اضافه می‌کند و چیزی از این گوشی پاک نمی‌شود.</T>
        {backupMsg && <T style={{ color: backupMsg.ok ? C.good : C.bad, fontSize: 13 }}>{backupMsg.text}</T>}
      </Card>

      <Card style={{ ...s.card, gap: 0 }}>
        <T b style={[s.title, { marginBottom: 6 }]}>راهنما و اطلاعات</T>
        {GUIDES.map(([icon, title, href], i) => (
          <Pressable
            key={href}
            accessibilityRole="link"
            onPress={() => {
              tap();
              router.push(href as Href);
            }}
            style={[s.link, i > 0 && s.sep]}>
            <View style={s.linkIcon}>
              <Ionicons name={icon} size={19} color={C.brand} />
            </View>
            <T style={{ flex: 1, fontSize: 14 }}>{title}</T>
            <Ionicons name="chevron-back" size={16} color={C.muted} />
          </Pressable>
        ))}
      </Card>

      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={s.scrim} onPress={() => setMenu(false)} accessibilityLabel="بستن تنظیمات">
          <SafeAreaView edges={["bottom"]} style={s.sheet} onStartShouldSetResponder={() => true}>
            <View style={u.row}>
              <T b style={[s.title, { flex: 1 }]}>تنظیمات</T>
              <Pressable accessibilityRole="button" accessibilityLabel="بستن" hitSlop={10} onPress={() => setMenu(false)}>
                <Ionicons name="close" size={22} color={C.muted} />
              </Pressable>
            </View>
            <View style={[s.link, s.sep]}>
              <View style={s.linkIcon}>
                <Ionicons name="contrast-outline" size={19} color={C.brand} />
              </View>
              <T style={{ flex: 1, fontSize: 14 }}>ظاهر برنامه (روشن / تیره)</T>
              <ThemeToggle color={C.brand} />
            </View>
            {signedIn && (
              <MenuRow
                icon="log-out-outline"
                title="خروج"
                onPress={async () => {
                  await clearProfile();
                  setProfile(await loadProfile());
                  setMenu(false);
                  await signOut().catch(() => {});
                  setSignedIn(await isSignedIn());
                  setAccount(null);
                  setPlan(null);
                }}
              />
            )}
            {!confirm ? (
              <MenuRow icon="trash-outline" title="حذف حساب و اطلاعات من" danger onPress={() => setConfirm(true)} />
            ) : (
              <View style={[s.sep, { gap: 10, paddingTop: 12 }]}>
                <T style={{ fontSize: 14 }}>نام، سن، جنسیت، بیماری‌های زمینه‌ای و نتایجِ ذخیره‌شده برای همیشه پاک می‌شوند. این کار برگشت‌پذیر نیست.</T>
                <Button title={busy ? "در حال حذف…" : "بله، همه را پاک کن"} disabled={busy} onPress={deleteAll} />
                <Button kind="outline" title="انصراف" disabled={busy} onPress={() => setConfirm(false)} />
              </View>
            )}
            {!!error && <T style={{ color: C.bad, fontSize: 13 }}>{error}</T>}
          </SafeAreaView>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function Chip({ on, icon, label, onPress }: { on: boolean; icon: Icon; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      onPress={() => {
        tap();
        onPress();
      }}
      style={[s.chip, on && s.chipOn]}>
      <Ionicons name={icon} size={15} color={on ? C.brandInk : C.chipInk} />
      <T style={[s.chipT, on && { color: C.brandInk }]}>{label}</T>
    </Pressable>
  );
}

/** 44px button for side-by-side pairs: primary (filled), brand (soft green), plain (soft grey). */
function SmallButton({ kind, icon, title, onPress }: { kind: "primary" | "brand" | "plain"; icon: Icon; title: string; onPress: () => void }) {
  const ink = kind === "primary" ? C.card : kind === "brand" ? C.brandInk : C.chipInk;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [s.small, { backgroundColor: kind === "primary" ? C.brand : kind === "brand" ? C.brandTint : C.chip }, pressed && { opacity: 0.75 }]}>
      <Ionicons name={icon} size={17} color={ink} />
      <T b numberOfLines={1} style={{ color: ink, fontSize: 13 }}>{title}</T>
    </Pressable>
  );
}

function MenuRow({ icon, title, danger, onPress }: { icon: Icon; title: string; danger?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        tap();
        onPress();
      }}
      style={[s.link, s.sep]}>
      <View style={[s.linkIcon, danger && { backgroundColor: C.badSoft }]}>
        <Ionicons name={icon} size={19} color={danger ? C.bad : C.brand} />
      </View>
      <T style={{ flex: 1, fontSize: 14, color: danger ? C.bad : C.ink }}>{title}</T>
    </Pressable>
  );
}

// Site info pages live here (not in a fifth tab).
const GUIDES: [Icon, string, string][] = [
  ["trending-up-outline", "تاریخچهٔ آزمایش‌ها", "/history"],
  ["camera-outline", "چطور از برگهٔ آزمایش عکس بگیریم؟", "/info/how-to-capture"],
  ["analytics-outline", "مقادیر مرجع (رنج نرمال) چیست؟", "/info/reference-ranges"],
  ["swap-horizontal-outline", "واحدهای آزمایشگاهی: SI در برابر متعارف", "/info/units-guide"],
  ["git-branch-outline", "روش‌شناسی تفسیر آزمایش در آزمایار اپ", "/info/methodology"],
  ["library-outline", "منابع بالینی", "/info/basis"],
  ["chatbubbles-outline", "تماس با آزمایار اپ", "/contact"],
  ["document-text-outline", "شرایط و قوانین استفاده", "/info/terms"],
  ["lock-closed-outline", "حریم خصوصی", "/info/privacy"],
];

const s = StyleSheet.create({
  card: u.soft,
  title: { fontSize: 16, color: C.ink },
  label: { fontSize: 13, color: C.muted },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" },
  badge: { alignSelf: "flex-start", backgroundColor: C.brandTint, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeT: { color: C.brandInk, fontSize: 12 },
  pair: { flexDirection: "row", gap: 10 },
  field: { flex: 1, gap: 6 },
  seg: { flexDirection: "row", gap: 8, height: 44 },
  segItem: { flex: 1, borderRadius: 999, justifyContent: "center", backgroundColor: C.chip, borderWidth: 1, borderColor: C.chip },
  segOn: { backgroundColor: C.brandTint, borderColor: C.brand },
  input: { height: 44, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 0, backgroundColor: C.chip, fontSize: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.chip, borderWidth: 1, borderColor: C.chip },
  chipOn: { backgroundColor: C.brandTint, borderColor: C.brand },
  chipT: { fontSize: 13, color: C.chipInk },
  dashed: { height: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: C.brand },
  note: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: C.noteBg, borderRadius: 12, padding: 12 },
  small: { flex: 1, height: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, paddingHorizontal: 8 },
  link: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.hair },
  linkIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" },
  scrim: { flex: 1, justifyContent: "flex-end", backgroundColor: "#0006" },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 4 },
});
