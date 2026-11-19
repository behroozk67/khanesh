import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useMemo } from "react";
import { Modal, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming, ZoomIn } from "react-native-reanimated";

import { type Attempt, type Badge, habitById, TROPHIES } from "@/lib/challenges";
import { success } from "@/lib/feedback";

import { Button, C, faDigits, T } from "./ui";

const COLORS = ["#0A8F78", "#D9A21B", "#C93A3A", "#4b57dc", "#3BA6C9", "#E7739B"];

export const BADGE_COLOR = "#E9730C";

/** Full-screen reward (spec 002 US4): a completed challenge's trophy, or a streak badge earned on the way. Confetti and a success haptic. */
export function Celebration({ attempt, badge, onClose }: { attempt: Attempt | null; badge?: Badge | null; onClose: () => void }) {
  const shown = attempt ?? badge;
  useEffect(() => {
    if (shown) success();
  }, [shown]);
  if (!attempt && badge) {
    return (
      <Modal transparent animationType="fade" visible onRequestClose={onClose}>
        <View style={s.backdrop}>
          <Confetti />
          <Animated.View entering={ZoomIn.springify().damping(9)} style={s.box}>
            <Trophy color={BADGE_COLOR} icon="flame" />
            <T b style={{ fontSize: 22, textAlign: "center" }}>آفرین! {faDigits(badge.days)} روز پیاپی</T>
            <T style={{ textAlign: "center" }}>
              «{habitById(badge.habit)?.title}» را {faDigits(badge.days)} روز پشت سر هم انجام دادید.
            </T>
            <View style={[s.badge, { backgroundColor: BADGE_COLOR }]}>
              <T b style={{ color: "#fff", textAlign: "center" }}>🔥 نشان {faDigits(badge.days)} روز پیاپی</T>
            </View>
            <Button title="عالی!" onPress={onClose} />
          </Animated.View>
        </View>
      </Modal>
    );
  }
  if (!attempt) return null;
  const h = habitById(attempt.habit);
  const trophy = TROPHIES[attempt.length] ?? TROPHIES[3];
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Confetti />
        <Animated.View entering={ZoomIn.springify().damping(9)} style={s.box}>
          <Trophy color={trophy.color} />
          <T b style={{ fontSize: 22, textAlign: "center" }}>آفرین! چالش کامل شد</T>
          <T style={{ textAlign: "center" }}>
            چالشِ {faDigits(attempt.length)} روزهٔ «{h?.title}» را تمام کردید.
          </T>
          <View style={[s.badge, { backgroundColor: trophy.color }]}>
            <T b style={{ color: "#fff", textAlign: "center" }}>🏆 جام {trophy.title}</T>
          </View>
          <Button title="عالی!" onPress={onClose} />
        </Animated.View>
      </View>
    </Modal>
  );
}

function Trophy({ color, icon = "trophy" }: { color: string; icon?: "trophy" | "flame" }) {
  const k = useSharedValue(0);
  useEffect(() => {
    k.value = withSequence(withSpring(1, { damping: 6 }), withRepeat(withTiming(1.08, { duration: 700 }), -1, true));
  }, [k]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: k.value }] }));
  return (
    <Animated.View style={[s.trophy, { backgroundColor: color }, st]}>
      <Ionicons name={icon} size={56} color="#fff" />
    </Animated.View>
  );
}

function Confetti() {
  const { width, height } = useWindowDimensions();
  // Render must stay pure (React Compiler), so the scatter is a fixed hash of the index, not Math.random.
  const r = (i: number, salt: number) => {
    const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  const pieces = useMemo(
    () => Array.from({ length: 36 }, (_, i) => ({ x: r(i, 1) * width, delay: r(i, 2) * 600, color: COLORS[i % COLORS.length], size: 7 + r(i, 3) * 7, spin: 180 + r(i, 4) * 540 })),
    [width],
  );
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p, i) => (
        <Piece key={i} {...p} fall={height + 40} />
      ))}
    </View>
  );
}

function Piece({ x, delay, color, size, spin, fall }: { x: number; delay: number; color: string; size: number; spin: number; fall: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 2400, easing: Easing.in(Easing.quad) }));
  }, [t, delay]);
  const st = useAnimatedStyle(() => ({
    opacity: 1 - t.value * 0.3,
    transform: [{ translateY: -30 + t.value * fall }, { translateX: Math.sin(t.value * 6) * 18 }, { rotate: `${t.value * spin}deg` }],
  }));
  return <Animated.View style={[{ position: "absolute", left: x, top: 0, width: size, height: size * 0.5, backgroundColor: color, borderRadius: 2 }, st]} />;
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#0008", alignItems: "center", justifyContent: "center", padding: 24 },
  box: { backgroundColor: C.card, borderRadius: 24, padding: 24, gap: 12, width: "100%", maxWidth: 380, alignItems: "stretch" },
  trophy: { width: 104, height: 104, borderRadius: 52, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  badge: { borderRadius: 16, paddingVertical: 8, alignSelf: "center", paddingHorizontal: 18 },
});
