import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";

import { ExtractedList } from "@/components/extracted-list";
import { InterpretationCards } from "@/components/interpretation";
import { LineChart } from "@/components/line-chart";
import { Overview } from "@/components/pheno-card";
import { ResultList } from "@/components/result-list";
import { ScoreCard } from "@/components/score-card";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { Button, C, Card, outline, styles as u, T } from "@/components/ui";
import { suggestedHabits } from "@/lib/challenges";
import { contextLine, DISCLAIMER_FA, EMERGENCY_BANNER, interpretationOf } from "@/lib/engine";
import { failure, tap } from "@/lib/feedback";
import { type HistoryRecord, scoreTrend } from "@/lib/history";
import { faDate } from "@/lib/jdate";
import { exportReport } from "@/lib/report";
import { loadHabits, loadHistory, loadProfile } from "@/lib/store";

const s = StyleSheet.create({
  tab: { ...u.soft, flex: 1, alignItems: "center", gap: 6, paddingVertical: 14, backgroundColor: C.card, borderWidth: 1 },
  basis: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: C.chip, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12 },
  tile: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" },
  pdf: { height: 48, paddingVertical: 0, justifyContent: "center", borderRadius: 14, shadowColor: C.brand, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
});

const shortDate = (d: string) => faDate(d, "short");
export default function Result() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const [rec, setRec] = useState<HistoryRecord | null | undefined>(undefined);
  const [all, setAll] = useState<HistoryRecord[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportErr, setExportErr] = useState("");
  const [exportOk, setExportOk] = useState("");
  const [busy, setBusy] = useState<string[]>([]);
  const [profileConds, setProfileConds] = useState<string[]>([]);

  useEffect(() => {
    loadHistory().then((h) => {
      setAll(h);
      setRec(h.find((r) => r.id === id) ?? null);
    });
    loadHabits().then((st) => setBusy(st.attempts.filter((a) => a.status === "active").map((a) => a.habit)));
    loadProfile().then((p) => setProfileConds(p.conditions ?? []));
  }, [id]);

  if (rec === undefined) return <ActivityIndicator style={{ marginTop: 40 }} color={C.brand} />;
  if (!rec) return <T style={{ padding: 24 }}>این نتیجه پیدا نشد؛ شاید از تاریخچه حذف شده باشد.</T>;

  const e = rec.result._engine ?? {};
  const text = interpretationOf(rec.result);
  const basis = contextLine(e.context);
  const banner = rec.result.has_critical ? e.critical_banner ?? EMERGENCY_BANNER : null;
  // Trend up to this record: the 5 most recent scored analyses of the year before it.
  const upto = Date.parse(rec.sampleDate ?? rec.at);
  const trend = scoreTrend(all.filter((r) => Date.parse(r.sampleDate ?? r.at) <= upto), upto);
  // Both: an older sheet has no conditions on it, and a condition may have been added to the profile since.
  const offers = suggestedHabits(e.tests ?? [], !!rec.result.has_critical, [...(rec.patient.conditions ?? []), ...profileConds], busy);

  async function pdf() {
    tap();
    setExporting(true);
    setExportErr("");
    setExportOk("");
    try {
      setExportOk(await exportReport(rec!, trend.map((p) => ({ label: shortDate(p.date), value: p.value }))));
    } catch (err) {
      failure();
      setExportErr(`ساختِ PDF انجام نشد: ${err instanceof Error ? err.message : "خطای ناشناخته"}`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: C.surface }} contentContainerStyle={[u.page, { backgroundColor: C.surface }]}>
      <Stack.Screen options={{ title: faDate(rec.sampleDate ?? rec.at), headerStyle: { backgroundColor: C.surface } }} />
      {fresh === "1" && (
        <Animated.View entering={ZoomIn.springify().damping(12)} style={[u.row, { justifyContent: "center" }]}>
          <Ionicons name="checkmark-circle" size={28} color={C.good} />
          <T b style={{ color: C.good }}>تفسیر آماده شد</T>
        </Animated.View>
      )}
      {banner && (
        <Card style={{ borderColor: C.bad, backgroundColor: C.badSoft }}>
          <T b style={{ color: C.bad }}>{banner.title}</T>
          <T>{banner.body}</T>
        </Card>
      )}
      {!!basis && (
        <View style={s.basis}>
          <Ionicons name="person-outline" size={13} color={C.barInk} />
          <T style={{ fontSize: 12, lineHeight: 18, color: C.barInk }}>
            تفسیر بر پایهٔ: <T b style={{ fontSize: 12, color: C.barInk }}>{basis}</T>
          </T>
        </View>
      )}
      {e.score && <ScoreCard score={e.score} />}
      <Overview tests={e.tests ?? []} pheno={e.phenoAge} />
      <ResultList tests={e.tests ?? []} />
      <ExtractedList list={rec.result.extracted_tests} />
      {!e.tests && (
        <Card style={{ borderColor: C.bad, backgroundColor: C.badSoft }}>
          <T b style={{ color: C.bad }}>این نتیجه کامل نیست</T>
          <T>جزئیات موتور تفسیر در این پاسخ نیست و ممکن است یافتهٔ فوری دیده نشود. به این نتیجه اتکا نکنید و برگه را دوباره تفسیر کنید.</T>
        </Card>
      )}
      <InterpretationCards text={text} tests={e.tests ?? []} />
      {offers.length > 0 && (
        <Card delay={150} style={u.soft}>
          <T b style={u.h2}>چالشی برای شروع</T>
          {offers.map(({ habit, because }) => (
            <Pressable
              key={habit.id}
              accessibilityRole="button"
              onPress={() => {
                tap();
                router.navigate({ pathname: "/challenges", params: { start: habit.id } });
              }}
              style={[u.row, { paddingVertical: 6 }]}>
              <View style={s.tile}>
                <Ionicons name={outline(habit.icon)} size={20} color={C.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <T b>{habit.title}</T>
                <T style={u.muted}>چون {because} بالاتر از محدوده است</T>
              </View>
              <Ionicons name="chevron-back" size={18} color={C.muted} />
            </Pressable>
          ))}
          <T style={u.muted}>این‌ها عادت‌های عمومیِ سالم‌اند، نه توصیهٔ پزشکی؛ برای درمان با پزشک مشورت کنید.</T>
        </Card>
      )}
      {e.score?.value != null && (
        <Card delay={180} style={u.soft}>
          <T b style={u.h2}>روند امتیاز</T>
          <T style={u.muted}>امتیازِ هر نوبت آزمایش، از ۰ تا ۱۰۰ — حداکثر ۵ نوبتِ یک سالِ اخیر</T>
          {trend.length > 1 ? (
            <LineChart points={trend.map((p) => ({ label: shortDate(p.date), value: p.value }))} domain={[0, 100]} />
          ) : (
            <T style={u.muted}>با تفسیرِ برگهٔ بعدی، روندِ امتیازتان اینجا دیده می‌شود.</T>
          )}
        </Card>
      )}
      <View style={{ gap: 6 }}>
        <Button title={exporting ? "در حال ساخت PDF…" : "دریافت PDF"} onPress={pdf} disabled={exporting} style={s.pdf} icon={<Ionicons name="download-outline" size={20} color="#fff" />} />
        {!!exportErr && <T style={{ color: C.bad }}>{exportErr}</T>}
        {!!exportOk && <T style={{ color: C.good }}>{exportOk}</T>}
      </View>
      {/* The result sits on the root stack, so the tab bar is hidden here: offer the other tabs. */}
      <View style={[u.row, { gap: 10 }]}>
        {(
          [
            ["trending-up-outline", "تاریخچه", "/history"],
            ["microscope", "آزمایش‌ها", "/tests"],
            ["flame-outline", "چالش‌ها", "/challenges"],
          ] as const
        ).map(([icon, label, href]) => (
          <Pressable
            key={href}
            accessibilityRole="button"
            onPress={() => {
              tap();
              router.navigate(href);
            }}
            style={({ pressed }) => [s.tab, pressed && { opacity: 0.7 }]}>
            {icon === "microscope" ? <MaterialCommunityIcons name={icon} size={24} color={C.brand} /> : <Ionicons name={icon} size={24} color={C.brand} />}
            <T b style={{ fontSize: 13 }}>{label}</T>
          </Pressable>
        ))}
      </View>
      <T style={u.muted}>{DISCLAIMER_FA}</T>
    </ScrollView>
  );
}
