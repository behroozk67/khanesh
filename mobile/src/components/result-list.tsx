import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { searchTests } from "@/content/khanesh/testSearch";
import { pageFor, routeKey } from "@/lib/encyclopedia";
import { bandOf, bySection, type EngineTest, ZONES } from "@/lib/engine";
import { parseRange } from "@/lib/history";

import { C, Card, faDigits, ltr, styles as u, T, TONE } from "./ui";

// Renders the server's engine verdict as-is: name/fa/range/flags come from the API, nothing is judged here.
// State and fallback labels follow khanesh/src/resultModel.js normTest/flagInfo (engine flags only).
export function stateOf(t: EngineTest) {
  if (t.level === "critical") return { tone: "bad", label: "مقدار بحرانی" };
  if (t.abnormal) return { tone: "warn", label: t.dir === "high" ? "بالاتر از محدوده" : t.dir === "low" ? "پایین‌تر از محدوده" : "خارج از محدوده" };
  if (t.abnormal === false) return { tone: "good", label: "در محدوده مرجع" };
  return { tone: "none", label: "بدون محدوده مرجع" };
}

/** Encyclopedia page for a result row: the engine key first (AST, ALT, ESR… are page keys), then the site's name search; null when none. */
export function guideHref(name: string, key?: string): string | null {
  // Urine rows: name search would land on the 24 h urine protein page; they all belong to the full urinalysis page.
  if (key?.startsWith("URINE_")) return "/test/u-a";
  const k = key?.toLowerCase();
  if (k && pageFor(k)) return `/test/${k}`;
  const hit = searchTests(name, 1)[0] as { to?: string } | undefined;
  return hit?.to ?? (key ? ((searchTests(key, 1)[0] as { to?: string } | undefined)?.to ?? null) : null);
}

export function ResultList({ tests }: { tests: EngineTest[] }) {
  const [open, setOpen] = useState(false);
  // Out-of-range first and open; the rest folds away (the engine's flags decide, nothing is judged here).
  const sorted = bySection(tests);
  const out = sorted.filter((t) => t.abnormal || t.level === "critical");
  const rest = sorted.filter((t) => !(t.abnormal || t.level === "critical"));
  const showRest = open || out.length === 0;
  const row = (t: EngineTest) => {
        const st = stateOf(t);
        const label = t.fa ?? st.label;
        const href = guideHref(t.name, t.key);
        const band = bandOf(t, parseRange(t.range));
        return (
          <Pressable key={t.key} disabled={!href} onPress={() => href && router.push({ pathname: "/test/[key]", params: { key: routeKey(href) } })} style={s.row} accessibilityHint={href ? "راهنمای این آزمایش" : undefined}>
            <View style={[s.dot, { backgroundColor: TONE[st.tone] }]} />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={[u.row, { justifyContent: "space-between" }]}>
                <T b style={{ flexShrink: 1 }}>{t.name}</T>
                {st.tone === "warn" || st.tone === "bad" ? (
                  <View style={[s.value, { backgroundColor: st.tone === "bad" ? C.badSoft : C.amberSoft }]}>
                    <T b style={{ fontSize: 16, color: st.tone === "bad" ? C.bad : C.noteInk }}>{ltr(`${t.value}${t.unit ? ` ${t.unit}` : ""}`)}</T>
                  </View>
                ) : (
                  <T b style={{ color: TONE[st.tone] }}>{ltr(`${t.value}${t.unit ? ` ${t.unit}` : ""}`)}</T>
                )}
              </View>
              <View style={[u.row, { justifyContent: "space-between" }]}>
                <T style={[u.muted, { color: TONE[st.tone] }]}>{label}</T>
                {!!t.range && <T style={u.muted}>محدوده: {ltr(t.range)}</T>}
              </View>
              {band && (
                <View style={s.band}>
                  {ZONES.map((z, i) => (
                    <View key={i} style={{ flex: z.w, borderRadius: 999, backgroundColor: BAND[z.tone], opacity: z.tone === "good" || i === band.zone ? 1 : 0.4 }} />
                  ))}
                  <View style={[s.mark, { left: `${band.pos * 100}%`, backgroundColor: BAND[ZONES[band.zone].tone] }]} />
                </View>
              )}
            </View>
            {/* Fixed slot so every row's text and band share the same edges, linked or not. */}
            <View style={{ width: 16 }}>{href && <Ionicons name="chevron-back" size={16} color={C.muted} />}</View>
          </Pressable>
        );
  };
  return (
    <Card delay={240} style={u.soft}>
      <T b style={u.h2}>{out.length ? "خارج از محدوده" : "نتیجهٔ آزمایش‌ها"}</T>
      {out.map(row)}
      {!!out.length && !!rest.length && (
        <Pressable accessibilityRole="button" onPress={() => setOpen(!open)} style={[u.row, { justifyContent: "space-between", paddingVertical: 8 }]}>
          <T b>در محدودهٔ مرجع ({faDigits(rest.length)})</T>
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={C.muted} />
        </Pressable>
      )}
      {showRest && rest.map(row)}
      {tests.length === 0 && <T>نتیجه‌ای برای نمایش نیست.</T>}
    </Card>
  );
}

// Band colours are fixed (same in both themes) so green / yellow / red read at a glance; the row text keeps TONE.
const BAND = { good: "#10B981", warn: "#FBBF24", bad: "#F87171" } as const;

// Native RTL swaps `left`; this keeps the band LTR. react-native-web never swaps `left` and rejects the prop,
// but it does mirror flex rows under `dir=rtl`, so the zones are reversed back there.
const LTR = Platform.OS === "web" ? ({ flexDirection: "row-reverse" } as const) : ({ direction: "ltr" } as const);

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.hair },
  value: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  band: { flexDirection: "row", ...LTR, height: 6, gap: 3, marginTop: 8 },
  // White ring and soft shadow keep the marker readable on any segment colour.
  mark: { position: "absolute", top: -4, width: 14, height: 14, borderRadius: 7, marginLeft: -7, borderWidth: 2, borderColor: "#fff", shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
});
