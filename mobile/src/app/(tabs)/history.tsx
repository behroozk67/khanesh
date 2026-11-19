import Ionicons from "@expo/vector-icons/Ionicons";
import { type Href, router, useFocusEffect, useNavigation } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { LineChart } from "@/components/line-chart";
import { stateOf } from "@/components/result-list";
import { ScoreCard } from "@/components/score-card";
import { confirm } from "@/lib/confirm";
import { Button, C, Card, faDigits, type Icon, ltr, styles as u, T, TONE } from "@/components/ui";
import { overallTone, TONE_WORD } from "@/lib/engine";
import { tap, thump } from "@/lib/feedback";
import { type HistoryRecord, knownTests, overview, recordDate, scoreTrend, testSeries } from "@/lib/history";
import { faDate } from "@/lib/jdate";
import { loadHistory, removeRecord } from "@/lib/store";

const shortDate = (d: string) => faDate(d, "short");
const fmt = (n: number) => faDigits(Number.isInteger(n) ? n : +n.toFixed(2));

// shortcut: cast because typed routes spell the home tab "/" or "/(tabs)/index" depending on the generator run; drop once stable.
export default function History() {
  const [list, setList] = useState<HistoryRecord[]>([]);
  const [key, setKey] = useState<string | null>(null);
  const navigation = useNavigation();

  useEffect(() => {
    // "left" is the start side, so the title sits on the right under RTL.
    navigation.setOptions({ headerStyle: { backgroundColor: C.surface }, headerTitleAlign: "left" });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      loadHistory().then(setList);
    }, []),
  );

  const ov = useMemo(() => overview(list), [list]);
  const trend = useMemo(() => scoreTrend(list), [list]);
  const tests = useMemo(() => knownTests(list), [list]);
  const sel = key ?? tests[0]?.key ?? null;
  const series = useMemo(() => (sel ? testSeries(list, sel) : null), [list, sel]);

  if (!list.length) {
    return (
      <View style={[u.page, { backgroundColor: C.surface, justifyContent: "center", alignItems: "center", gap: 16 }]}>
        <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="trending-up-outline" size={36} color={C.brand} />
        </View>
        <T b style={[u.h2, { textAlign: "center" }]}>هنوز آزمایشی ثبت نشده</T>
        <T style={[u.muted, { textAlign: "center" }]}>هر برگه‌ای که تفسیر کنید اینجا می‌ماند تا روندِ سلامتتان را ببینید.</T>
        <Button title="تفسیر اولین برگه" onPress={() => router.push("/interpret" as Href)} />
      </View>
    );
  }

  const drop = (id: string) => {
    thump();
    confirm("این برگه از تاریخچه حذف شود؟ این کار برگشت‌پذیر نیست.", () => removeRecord(id).then(() => loadHistory().then(setList)));
  };

  const pts = series?.points ?? [];
  const lastPt = pts.at(-1);
  const prevPt = pts.at(-2);
  const latestScore = list.at(-1)?.result._engine?.score;
  const tone = latestScore ? overallTone(latestScore) : "none";

  return (
    <ScrollView style={{ backgroundColor: C.surface }} contentContainerStyle={[u.page, { backgroundColor: C.surface, paddingTop: 20 }]}>
      {ov && (
        <Card style={u.soft}>
          <T b style={u.h2}>وضعیت سلامت شما</T>
          <View style={s.grid}>
            <Stat icon="pulse-outline" label="امتیاز آخرین برگه" value={ov.score != null ? faDigits(ov.score) : "—"} color={TONE[tone]} badge={ov.score != null ? [TONE_WORD[tone], tone] : undefined} />
            <Stat
              icon="sparkles-outline"
              label="سن زیستی"
              value={ov.phenoDelta != null ? `${fmt(Math.abs(ov.phenoDelta))}` : "—"}
              sub={ov.phenoDelta != null ? (ov.phenoDelta < 0 ? "سال جوان‌تر" : ov.phenoDelta > 0 ? "سال بالاتر" : "هم‌سال") : undefined}
            />
            <Stat icon="alert-circle-outline" label="خارج از محدوده" value={`${faDigits(ov.abnormal)} از ${faDigits(ov.total)}`} color={ov.abnormal ? C.noteInk : C.good} />
            <Stat icon="calendar-outline" label="از آخرین آزمایش" value={ov.daysSince === 0 ? "امروز" : `${faDigits(ov.daysSince)} روز`} />
          </View>
        </Card>
      )}
      {latestScore && <ScoreCard score={latestScore} title="امتیاز آخرین برگه" />}

      <Card delay={60} style={u.soft}>
        <T b style={u.h2}>روند امتیاز</T>
        {trend.length > 1 ? (
          <LineChart points={trend.map((p) => ({ label: shortDate(p.date), value: p.value }))} domain={[0, 100]} />
        ) : (
          <T style={u.muted}>برای دیدنِ روند، دست‌کم دو برگهٔ امتیازدار در یک سالِ اخیر لازم است.</T>
        )}
      </Card>

      {tests.length > 0 && (
        <Card delay={120} style={u.soft}>
          <T b style={u.h2}>مقایسهٔ یک آزمایش</T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
            {tests.map((t) => (
              <Pressable
                key={t.key}
                onPress={() => {
                  tap();
                  setKey(t.key);
                }}
                style={[s.chip, sel === t.key && s.chipOn]}>
                <T b numberOfLines={1} style={{ fontSize: 13, color: sel === t.key ? "#fff" : C.barInk }}>{t.name}</T>
              </Pressable>
            ))}
          </ScrollView>
          {lastPt && (
            <View style={[u.row, { justifyContent: "space-between", alignItems: "center" }]}>
              <View style={{ gap: 0 }}>
                <View style={[u.row, { alignItems: "flex-end", gap: 6 }]}>
                  <T b style={{ fontSize: 30, lineHeight: 40 }}>{ltr(fmt(lastPt.value))}</T>
                  {!!lastPt.unit && <T style={[u.muted, { marginBottom: 8 }]}>{ltr(lastPt.unit)}</T>}
                </View>
                <T style={u.muted}>{faDate(lastPt.date, "long")}</T>
              </View>
              <Badge text={lastPt.t.fa ?? stateOf(lastPt.t).label} tone={stateOf(lastPt.t).tone} />
            </View>
          )}
          {pts.length > 0 && (
            <LineChart
              legend
              height={210}
              points={pts.map((p) => ({ label: shortDate(p.date), value: p.value, color: TONE[stateOf(p.t).tone] }))}
              band={lastPt?.range}
            />
          )}
          {lastPt && prevPt && (
            <View style={s.delta}>
              <Ionicons
                name={lastPt.value === prevPt.value ? "remove-outline" : lastPt.value > prevPt.value ? "trending-up-outline" : "trending-down-outline"}
                size={18}
                color={C.brand}
              />
              <T style={{ flex: 1, fontSize: 13 }}>
                نسبت به نوبتِ قبل:{" "}
                <T b style={{ fontSize: 13 }}>
                  {lastPt.value === prevPt.value ? "بدون تغییر" : `${lastPt.value > prevPt.value ? "افزایش" : "کاهش"} ${ltr(fmt(Math.abs(lastPt.value - prevPt.value)))}`}
                  {lastPt.value !== prevPt.value && lastPt.unit ? ` ${ltr(lastPt.unit)}` : ""}
                </T>
              </T>
            </View>
          )}
          {pts.length === 1 && <T style={u.muted}>این آزمایش فقط در یک برگه آمده؛ با برگهٔ بعدی مقایسه ممکن می‌شود.</T>}
          {series?.droppedUnits && <T style={u.muted}>نوبت‌هایی که واحدِ دیگری داشتند در نمودار نیامده‌اند.</T>}
          <T style={u.muted}>محدوده‌ها از چاپِ آخرین برگه است و رنگِ هر نقطه از وضعیتِ همان برگه.</T>
        </Card>
      )}

      <T b style={[u.h2, { marginTop: 4 }]}>برگه‌ها</T>
      {[...list].reverse().map((r, i) => {
        const sc = r.result._engine?.score;
        const t = sc ? overallTone(sc) : "none";
        const ring = RING[t] ?? RING.none;
        const out = r.result._engine?.tests?.filter((x) => x.abnormal).length ?? 0;
        return (
          <Pressable
            key={r.id}
            onPress={() => router.push({ pathname: "/result/[id]", params: { id: r.id } })}
            onLongPress={() => drop(r.id)}>
            <Card delay={Math.min(i, 6) * 40} style={{ ...u.soft, flexDirection: "row", alignItems: "center" }}>
              <View style={[s.score, { borderColor: ring[0], backgroundColor: ring[1] }]}>
                <T b style={{ color: ring[2], textAlign: "center" }}>{sc?.value != null ? faDigits(sc.value) : "—"}</T>
              </View>
              <View style={{ flex: 1 }}>
                <T b>{faDate(recordDate(r), "long")}</T>
                <T style={u.muted}>
                  {faDigits(r.result._engine?.tests?.length ?? 0)} آزمایش ·{" "}
                  <T style={{ fontSize: 13, color: out ? C.noteInk : C.brand }}>{faDigits(out)} خارج از محدوده</T>
                </T>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="حذف این برگه از تاریخچه" hitSlop={6} onPress={() => drop(r.id)} style={({ pressed }) => [s.trash, pressed && { backgroundColor: C.badSoft }]}>
                {({ pressed }) => <Ionicons name="trash-outline" size={19} color={pressed ? C.bad : C.subtle} />}
              </Pressable>
              <Ionicons name="chevron-back" size={18} color={C.muted} />
            </Card>
          </Pressable>
        );
      })}
      <T style={[u.muted, { textAlign: "center" }]}>برای حذفِ یک برگه، آیکون سطل را بزنید. تاریخچه فقط روی همین گوشی ذخیره است.</T>
    </ScrollView>
  );
}

// Ring / fill / number colours per the engine's score tone (server band); the thresholds are the engine's, not drawn here.
const RING: Record<string, [string, string, string]> = {
  good: [C.emerald, C.brandTint, C.brandInk],
  warn: [C.amber, C.noteBg, C.noteInk],
  bad: [C.bad, C.badSoft, C.bad],
  none: [C.line, C.card, C.muted],
};

function Badge({ text, tone }: { text: string; tone: string }) {
  const [bg, ink] = tone === "bad" ? [C.badSoft, C.bad] : tone === "warn" ? [C.amberSoft, C.noteInk] : tone === "good" ? [C.brandTint, C.brandInk] : [C.chip, C.muted];
  return (
    <View style={{ alignSelf: "flex-start", backgroundColor: bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, flexShrink: 1 }}>
      <T b style={{ fontSize: 12, lineHeight: 18, color: ink }}>{text}</T>
    </View>
  );
}

function Stat({ icon, label, value, sub, badge, color = C.ink }: { icon: Icon; label: string; value: string; sub?: string; badge?: [string, string]; color?: string }) {
  return (
    <View style={s.stat}>
      <View style={[u.row, { gap: 6 }]}>
        <Ionicons name={icon} size={16} color={C.muted} />
        <T style={[u.muted, { flex: 1 }]} numberOfLines={1}>{label}</T>
      </View>
      <T b numberOfLines={1} style={{ fontSize: 22, lineHeight: 32, color }}>{value}</T>
      {badge ? <Badge text={badge[0]} tone={badge[1]} /> : sub ? <T style={[u.muted, { color }]}>{sub}</T> : null}
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stat: { flexBasis: "47%", flexGrow: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.hair, borderRadius: 14, padding: 14, gap: 4 },
  chip: { flexShrink: 0, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: C.chip },
  chipOn: { backgroundColor: C.brand },
  delta: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.surface, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  score: { width: 48, height: 48, borderRadius: 24, borderWidth: 3, justifyContent: "center", marginEnd: 4 },
  trash: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
