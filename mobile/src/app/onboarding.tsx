import Ionicons from "@expo/vector-icons/Ionicons";
import { type Href, router } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandHero } from "@/components/brand-hero";
import { Button, C, styles as u, T } from "@/components/ui";
import { tap } from "@/lib/feedback";
import { setOnboarded } from "@/lib/store";

// First run (site's StartChoice.jsx + PhotoGuide.jsx); copy is the site's.
const METHODS: [ComponentProps<typeof Ionicons>["name"], string, string, string][] = [
  ["camera", "عکسِ برگهٔ آزمایش", "از برگه عکس بگیرید؛ اعداد خودکار خوانده می‌شوند.", "camera"],
  ["document-text", "فایل PDF آزمایش", "فایل دریافتی از آزمایشگاه را ارسال کنید؛ صفحه‌ها خودکار خوانده می‌شوند.", "pdf"],
];

const TIPS = [
  "نورِ یکنواخت؛ بدونِ سایهٔ دست یا برقِ فلاش روی کاغذ.",
  "برگه روی سطحِ صاف، گوشی درست بالای آن و موازی با برگه.",
  "همهٔ ردیف‌ها و ستونِ واحدها داخلِ کادر باشد.",
  "اگر برگه چند صفحه است، از هر صفحه یک عکس بگیرید.",
];

export default function Onboarding() {
  const start = async (go?: string) => {
    tap();
    await setOnboarded();
    router.replace("/");
    if (go) router.push(`/interpret?go=${go}` as Href);
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={u.page}>
        <BrandHero />
        <T style={[u.muted, { textAlign: "center" }]}>برگهٔ آزمایش را بدهید؛ تفسیرِ فارسی، امتیاز سلامت و روندِ نتایج را بگیرید.</T>

        {METHODS.map(([icon, title, body, go], i) => (
          <Animated.View key={go} entering={FadeInDown.delay(i * 80)}>
            <Pressable accessibilityRole="button" onPress={() => start(go)} style={s.method}>
              <View style={s.icon}>
                <Ionicons name={icon} size={24} color={C.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <T b>{title}</T>
                <T style={u.muted}>{body}</T>
              </View>
              <Ionicons name="chevron-back" size={20} color={C.muted} />
            </Pressable>
          </Animated.View>
        ))}

        <View style={s.tips}>
          <T b>پیش از عکس گرفتن</T>
          {TIPS.map((t) => (
            <View key={t} style={u.row}>
              <Ionicons name="checkmark-circle" size={16} color={C.brand} />
              <T style={[u.muted, { flex: 1 }]}>{t}</T>
            </View>
          ))}
        </View>

        <Button title="شروع" onPress={() => start()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  method: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  icon: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.brandSoft, alignItems: "center", justifyContent: "center" },
  tips: { gap: 8, padding: 14, borderRadius: 16, borderWidth: 1, borderStyle: "dashed", borderColor: C.line },
});
