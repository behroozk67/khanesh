import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { type Href, router, useFocusEffect } from "expo-router";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { C, Card, faDigits, styles as u, T } from "@/components/ui";
import { fetchPlan, pendingJob, type Plan } from "@/lib/api";
import { CATEGORIES } from "@/lib/encyclopedia";
import { tap } from "@/lib/feedback";
import { overview, type Overview } from "@/lib/history";
import { scoreTone } from "@/lib/engine";
import { missing, stepRoute } from "@/lib/ready";
import { isOnboarded, loadHistory } from "@/lib/store";
import { mode } from "@/lib/theme";

// The real catalogue size, not a marketing number.
const TEST_COUNT = CATEGORIES.reduce((n, c) => n + c.items.length, 0);

export default function Home() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [last, setLast] = useState<Overview | null>(null);
  // Where the interpret button leads, worked out while the screen sits idle: the plan check needs the network,
  // and awaiting it inside the press handler is what made the button feel slow.
  const nextStep = useRef<Href | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchPlan().then(setPlan);
      loadHistory().then((list) => setLast(overview(list)));
      missing().then((m) => {
        nextStep.current = m ? stepRoute(m) : "/interpret";
      });
    }, []),
  );

  useEffect(() => {
    (async () => {
      if (!(await isOnboarded())) return router.replace("/onboarding");
      // App restarted during an analysis: the job id outlives the screen, so pick it up where it runs.
      if (await pendingJob()) router.push("/interpret");
    })();
  }, []);

  // Profile and plan come first: the profile's setup checklist, otherwise the interpret screen.
  // The route is ready by the time the user taps; only a tap in the first moment waits for it.
  const start = () => {
    tap();
    const to = nextStep.current;
    if (to) return router.push(to);
    missing().then((m) => router.push(m ? stepRoute(m) : "/interpret"));
  };
  const go = (to: Href) => {
    tap();
    router.push(to);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }} edges={["top"]}>
      <ScrollView contentContainerStyle={[u.page, { backgroundColor: C.surface, gap: 14 }]}>
        <View style={s.bar}>
          <Image
            source={mode === "dark" ? require("../../../assets/images/logo-light.png") : require("../../../assets/images/logo.png")}
            style={{ width: 36, height: 36 }}
            contentFit="contain"
            accessibilityLabel="آزمایار اپ"
          />
          <View style={{ flex: 1, justifyContent: "center" }}>
            <T b style={{ fontSize: 18, lineHeight: 26, color: C.ink }}>آزمایار اپ</T>
            <T style={{ fontSize: 12, lineHeight: 18, color: C.muted }}>دستیار هوشمند تفسیر آزمایش</T>
          </View>
          <Pressable accessibilityRole="button" onPress={() => go("/pricing")} style={({ pressed }) => [s.credit, pressed && { opacity: 0.75 }]}>
            <Ionicons name="sparkles-outline" size={15} color={C.brandInk} />
            <T b style={{ fontSize: 12, lineHeight: 18, color: C.brandInk }}>
              {plan ? (plan.paymentsOff ? "تفسیر رایگان" : `${faDigits(plan.credits)} نوبت تفسیر`) : "تعرفه‌ها"}
            </T>
          </Pressable>
        </View>

        <LinearGradient colors={[C.heroA, C.heroB]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
          <View style={[u.row, { gap: 10 }]}>
            <View style={s.glass}>
              <Ionicons name="scan-outline" size={24} color="#fff" />
            </View>
            <View style={s.pill}>
              <Ionicons name="sparkles-outline" size={13} color="#fff" />
              <T b style={{ fontSize: 11, lineHeight: 16, color: "#fff" }}>تفسیر با هوش مصنوعی</T>
            </View>
          </View>
          {/* Explicit break: otherwise «کنید» falls alone onto the second line on most phones. */}
          <T b style={{ fontSize: 17, lineHeight: 28, color: "#fff" }}>{"آزمایش خود را بهتر بفهمید؛\nآگاهانه‌تر پیگیری کنید"}</T>
          <T style={{ fontSize: 13, lineHeight: 23, color: "#fff", opacity: 0.9 }}>
            برگهٔ آزمایش خود را بارگذاری کنید تا معنای نتایج، محدوده‌های مرجع و نکات پیگیری را به زبان ساده دریافت کنید.
          </T>
          <Pressable accessibilityRole="button" onPress={start} style={({ pressed }) => [s.cta, pressed && { opacity: 0.85 }]}>
            <Ionicons name="camera-outline" size={20} color={C.heroA} />
            <T b style={{ fontSize: 15, color: C.heroA }}>تحلیل نتایج آزمایش من</T>
          </Pressable>
        </LinearGradient>

        <View style={s.pair}>
          <Quick icon={<Ionicons name="book-outline" size={20} color={C.brand} />} title="فرهنگنامهٔ آزمایش‌ها" sub={`${faDigits(TEST_COUNT)} آزمایش`} onPress={() => go("/tests")} />
          <Quick icon={<Ionicons name="trending-up-outline" size={20} color={C.brand} />} title="پیگیری روند سلامت" sub="مقایسه در تاریخچه" onPress={() => go("/history")} />
        </View>

        <Card style={{ ...u.soft, paddingVertical: 14 }}>
          <T b style={{ fontSize: 15, color: C.ink }}>آخرین آزمایش من</T>
          {last ? (
            <Pressable accessibilityRole="link" onPress={() => go("/history")} style={u.row}>
              {last.score != null ? (
                <ScoreRing value={Math.round(last.score)} />
              ) : (
                <View style={s.tile}>
                  <Ionicons name="document-text-outline" size={20} color={C.brand} />
                </View>
              )}
              <View style={{ flex: 1, gap: 2 }}>
                <T style={{ fontSize: 14 }}>
                  {last.daysSince === 0 ? "امروز" : `${faDigits(last.daysSince)} روز پیش`} · {faDigits(last.total)} آزمایش
                </T>
                <T style={{ fontSize: 12, color: last.abnormal ? C.warn : C.good }}>
                  {last.abnormal ? `${faDigits(last.abnormal)} مورد بیرون از محدوده` : "همه در محدوده"}
                </T>
              </View>
              <Ionicons name="chevron-back" size={16} color={C.subtle} />
            </Pressable>
          ) : (
            <View style={s.empty}>
              <Ionicons name="clipboard-outline" size={26} color={C.subtle} />
              <T style={{ fontSize: 13, color: C.muted, textAlign: "center" }}>هنوز آزمایشی ثبت نکرده‌اید</T>
            </View>
          )}
        </Card>

        <View style={s.note}>
          <Ionicons name="information-circle-outline" size={16} color={C.muted} />
          <T style={{ flex: 1, fontSize: 11.5, lineHeight: 20, color: C.muted }}>آزمایار اپ ابزار آگاهی‌بخشی است، جایگزین پزشک نیست و بیماری را تشخیص نمی‌دهد.</T>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** The sheet score as a ring; colour follows the engine's score rule (green from 85, amber below). */
function ScoreRing({ value }: { value: number }) {
  const r = 20;
  const len = 2 * Math.PI * r;
  const tone = scoreTone(value, false);
  const color = tone === "good" ? C.emerald : C.amber;
  return (
    <View style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }} accessible accessibilityLabel={`امتیاز ${faDigits(value)} از ۱۰۰`}>
      <Svg width={48} height={48} style={StyleSheet.absoluteFill}>
        <Circle cx={24} cy={24} r={r} stroke={C.chip} strokeWidth={4} fill="none" />
        <Circle cx={24} cy={24} r={r} stroke={color} strokeWidth={4} fill="none" strokeLinecap="round" strokeDasharray={`${(len * value) / 100} ${len}`} rotation={-90} origin="24, 24" />
      </Svg>
      <T b style={{ fontSize: 14, lineHeight: 20, color: C.ink }}>{faDigits(value)}</T>
    </View>
  );
}

function Quick({ icon, title, sub, onPress }: { icon: ReactNode; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={({ pressed }) => [s.quick, pressed && { opacity: 0.8 }]}>
      <View style={s.tile}>{icon}</View>
      <T b numberOfLines={1} style={{ fontSize: 14, color: C.ink }}>{title}</T>
      <T style={{ fontSize: 12, color: C.muted }}>{sub}</T>
    </Pressable>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 4 },
  credit: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.brandTint, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  hero: { borderRadius: 20, padding: 20, gap: 10 },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  glass: { width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  cta: { height: 48, borderRadius: 14, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 6 },
  pair: { flexDirection: "row", gap: 12 },
  quick: { ...u.card, ...u.soft, flex: 1, gap: 6, padding: 14 },
  tile: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", gap: 6, paddingVertical: 10 },
  note: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: C.chip, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
});
