import Ionicons from "@expo/vector-icons/Ionicons";
import { reloadAppAsync } from "expo";
import { DevSettings, Platform, Pressable } from "react-native";

import { tap } from "@/lib/feedback";
import { mode, saveMode } from "@/lib/theme";

import { C } from "./ui";

/** Dark/light switch. Styles are built once at import, so the choice is saved and the app reloads. */
export function ThemeToggle({ color = C.muted }: { color?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={mode === "dark" ? "حالت روشن" : "حالت تیره"}
      hitSlop={10}
      onPress={() => {
        tap();
        saveMode(mode === "dark" ? "light" : "dark");
        // Expo Go's activity isn't a ReactActivity, so reloadAppAsync silently does nothing there; DevSettings works in dev.
        if (Platform.OS === "web") location.reload();
        else if (__DEV__) DevSettings.reload();
        else reloadAppAsync();
      }}
      style={{ padding: 8 }}>
      <Ionicons name={mode === "dark" ? "sunny-outline" : "moon-outline"} size={22} color={color} />
    </Pressable>
  );
}
