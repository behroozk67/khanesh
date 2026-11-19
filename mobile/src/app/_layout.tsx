import { Vazirmatn_400Regular, Vazirmatn_700Bold, useFonts } from "@expo-google-fonts/vazirmatn";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform, View } from "react-native";

import { C, RTL } from "@/components/ui";
import { mode } from "@/lib/theme";

// The app is Persian-only. Native RTL comes from `forcesRTL` on the expo-localization plugin (app.json):
// SDK 58's Expo Go resets runtime I18nManager.forceRTL, but reads the plugin's manifest `extra`.
// react-native-web mirrors layout from the document's dir instead.
if (Platform.OS === "web" && typeof document !== "undefined") document.documentElement.dir = "rtl";

// Keep the green-logo splash up until fonts are ready, instead of a blank screen.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({ Vazirmatn_400Regular, Vazirmatn_700Bold });
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);
  if (!loaded) return null;
  return (
    <View style={[{ flex: 1, backgroundColor: C.bg }, RTL]}>
    <StatusBar style={mode === "dark" ? "light" : "dark"} />
    <Stack
      screenOptions={{
        headerTitleStyle: { fontFamily: "Vazirmatn_700Bold" },
        headerTintColor: C.ink,
        headerStyle: { backgroundColor: C.bg },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: C.bg },
        headerBackTitle: "بازگشت",
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="interpret" options={{ title: "تفسیر آزمایش" }} />
      <Stack.Screen name="result/[id]" options={{ title: "نتیجهٔ تفسیر" }} />
      <Stack.Screen name="test/[key]" options={{ title: "راهنمای آزمایش" }} />
      <Stack.Screen name="signin" options={{ title: "ورود", presentation: "modal" }} />
      <Stack.Screen name="pricing" options={{ title: "تعرفه‌ها" }} />
      <Stack.Screen name="pay" options={{ title: "درگاه پرداخت" }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="info/[page]" options={{ title: "راهنما" }} />
      <Stack.Screen name="contact" options={{ title: "تماس با ما" }} />
    </Stack>
    </View>
  );
}
