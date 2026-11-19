// Haptic beats of the core loop. Unsupported platforms fail silently.
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

// Off on purpose (user request, 2026-11-18): every button press used to buzz the phone. One switch,
// so the tick can come back without touching a screen. Typed `boolean` so the branch stays reachable for tsc.
const ENABLED: boolean = false;

const safe = (f: () => Promise<void>) => {
  if (!ENABLED || Platform.OS === "web") return;
  f().catch(() => {});
};

export const tap = () => safe(() => Haptics.selectionAsync());
export const thump = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
export const success = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
export const failure = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
