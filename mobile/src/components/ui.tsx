import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps, ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, type TextProps, View, type ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { mode, PALETTES } from "@/lib/theme";

export const C = PALETTES[mode];

// Expo Go does not always keep the forced RTL, and Android aligns Persian text to the left under an LTR layout. react-native-web rejects the prop.
export const RTL = Platform.OS === "web" ? {} : ({ direction: "rtl" } as const);

export const TONE: Record<string, string> = { good: C.good, warn: C.warn, bad: C.bad, none: C.muted };

/** Persian text with the app font; `b` = bold. */
export function T({ b, style, ...rest }: TextProps & { b?: boolean }) {
  return <Text {...rest} style={[styles.t, b && styles.b, style]} />;
}

/** A number (+unit) as one LTR bidi unit inside RTL text. */
export const ltr = (s: string | number) => `⁦${s}⁩`;

export type Icon = ComponentProps<typeof Ionicons>["name"];

/** The outline variant when Ionicons has one (stored habit/condition icons are base names). */
export const outline = (name: string) => {
  const o = name.endsWith("-outline") ? name : `${name}-outline`;
  return (o in Ionicons.glyphMap ? o : name) as Icon;
};

export const faDigits =(s: string | number) => String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);

export function Card({ children, style, delay = 0 }: { children: ReactNode; style?: ViewStyle; delay?: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(380)} style={[styles.card, style]}>
      {children}
    </Animated.View>
  );
}

export function Button({
  title,
  onPress,
  kind = "primary",
  disabled,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  kind?: "primary" | "outline";
  disabled?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
}) {
  const primary = kind === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.btn, primary ? styles.btnPrimary : styles.btnOutline, style, (disabled || pressed) && { opacity: disabled ? 0.4 : 0.8 }]}>
      <View style={styles.btnRow}>
        {icon}
        <T b style={{ color: primary ? "#fff" : C.brand }}>{title}</T>
      </View>
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  // Android: "right" is relative to the paragraph's own direction, so Persian text lands on the left; "auto" starts at the reading side.
  t: { fontFamily: "Vazirmatn_400Regular", fontSize: 15, color: C.ink, textAlign: Platform.OS === "web" ? "right" : "auto", writingDirection: "rtl", ...RTL },
  b: { fontFamily: "Vazirmatn_700Bold" },
  h1: { fontFamily: "Vazirmatn_700Bold", fontSize: 24 },
  h2: { fontFamily: "Vazirmatn_700Bold", fontSize: 18 },
  muted: { color: C.muted, fontSize: 13 },
  page: { padding: 16, gap: 16, paddingBottom: 40, backgroundColor: C.bg, flexGrow: 1 },
  card: { backgroundColor: C.card, borderRadius: 20, padding: 16, gap: 12, borderWidth: 1, borderColor: C.line },
  // Soft card of the profile/challenges look; an override on `card`, which keeps its border for tinted highlights elsewhere.
  soft: { borderRadius: 16, borderColor: C.hair, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  btn: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, alignItems: "center" },
  btnPrimary: { backgroundColor: C.brand },
  btnOutline: { borderWidth: 1.5, borderColor: C.brand, backgroundColor: C.card },
  btnRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
});
