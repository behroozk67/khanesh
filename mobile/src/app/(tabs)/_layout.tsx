import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Tabs } from "expo-router";
import { type ComponentProps, useEffect, useState } from "react";
import { AppState, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { C } from "@/components/ui";
import { isSignedIn } from "@/lib/api";
import { tap } from "@/lib/feedback";
import { onNotificationTap, syncReminders } from "@/lib/store";
import { onTokenChange } from "@/lib/token-store";

// Five routes, never more (constitution III), in reading order (right to left under RTL). The bar shows the
// history tab only while signed in. Result and test pages are pushed on the root stack.
const TABS: [string, string, ComponentProps<typeof Ionicons>["name"]][] = [
  ["index", "خانه", "home-outline"],
  ["history", "تاریخچه", "trending-up-outline"],
  ["tests", "آزمایش‌ها", "flask-outline"],
  ["challenges", "چالش‌ها", "flame-outline"],
  ["profile", "پروفایل", "person-outline"],
];

// The navigator boxes each icon in ~31×28; a padded capsule inside that box squeezed the glyph to a few px,
// so the box is widened to fit a 22px icon plus 16px padding on each side.
const ICON_BOX = { width: 56, height: 30 } as const;

export default function TabLayout() {
  const [signedIn, setSignedIn] = useState(false);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    const refresh = () => isSignedIn().then(setSignedIn);
    refresh();
    return onTokenChange(refresh);
  }, []);
  useEffect(() => {
    syncReminders();
    // A new day changes what's due, and the phone's permission may have changed in settings.
    const app = AppState.addEventListener("change", (state) => {
      if (state === "active") syncReminders();
    });
    const off = onNotificationTap(() => router.navigate("/challenges"));
    return () => {
      app.remove();
      off();
    };
  }, []);
  return (
    <Tabs
      backBehavior="history"
      screenListeners={{ tabPress: tap }}
      screenOptions={{
        tabBarActiveTintColor: C.barActive,
        tabBarInactiveTintColor: C.barInk,
        tabBarStyle: {
          backgroundColor: C.bar,
          borderTopWidth: 1,
          borderTopColor: C.barLine,
          shadowColor: "#000",
          shadowOpacity: 0.04,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
          elevation: 8,
          // Explicit room above the phone's own navigation bar (3-button bars sat right under the labels).
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 8,
        },
        tabBarIconStyle: ICON_BOX,
        headerStyle: { backgroundColor: C.bg },
        headerShadowVisible: false,
        headerTintColor: C.ink,
        headerTitleStyle: { fontFamily: "Vazirmatn_700Bold", color: C.ink },
        sceneStyle: { backgroundColor: C.bg },
      }}>
      {TABS.map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            // Not `href: null`: that drops the route, so a hidden history tab is collapsed instead.
            ...(name === "history" && !signedIn ? { tabBarButton: () => null, tabBarItemStyle: { display: "none" } as const } : {}),
            headerShown: name !== "index",
            tabBarIcon: ({ color, focused }) => (
              <View style={[{ paddingHorizontal: 16, paddingVertical: 4, borderRadius: 999 }, focused && { backgroundColor: C.barCapsule }]}>
                <Ionicons name={icon} color={color as string} size={22} style={{ width: 22, height: 22 }} />
              </View>
            ),
            // Only Regular and Bold are loaded, so inactive labels use Regular in place of Medium.
            tabBarLabel: ({ color, focused }) => (
              <Text style={{ color, fontSize: 11, fontFamily: focused ? "Vazirmatn_700Bold" : "Vazirmatn_400Regular" }}>{title}</Text>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
