import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Polygon } from "react-native-svg";

import { noScoreText, RADAR_MIN_SYSTEMS, overallTone, type Score, scoreTone, type Tone, TONE_WORD } from "@/lib/engine";

import { C, Card, faDigits, styles as u, T, TONE } from "./ui";

// Port of RadarCard (khanesh/src/ResultDashboard.jsx): body systems on a circle, the polygon of their server
// scores, and the overall score in the centre. Fewer than 3 systems → bars; no systems → number or reason.
const R = 27; // radius in a 0–100 box (site: 29; a little smaller so labels fit a phone width)
const LABEL_W = 96;
const LABEL_H = 78;
const INFO =
  "عددِ مرور از حکمِ موتور ساخته می‌شود: در محدوده کامل، هرچه دورتر از محدوده (برحسبِ پهنای همان محدوده) کمتر، و هرگز بیشتر از درجهٔ شدت (CTCAE) اگر موتور داده باشد. آزمایش‌های هم‌خانواده (مثل PT و INR) یک‌بار شمرده می‌شوند. دستگاهی که یافته‌ای با فوریتِ مشخص دارد از سقفِ همان فوریت بالاتر نمی‌رود. عددِ کل میانگینِ وزنیِ دستگاه‌هاست و بیش از ۳۰ واحد از ضعیف‌ترین دستگاه بالاتر نمی‌رود. در برگهٔ اورژانسی عددی نشان داده نمی‌شود. این عدد برای مرورِ سریع است، جای نظرِ پزشک را نمی‌گیرد و اعتبارسنجیِ بالینی نشده است.";

/** 0 → 1 over `ms` (ease-out), restarting when `key` changes. */
function useGrow(key: unknown, ms = 1100) {
  const [k, setK] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = Date.now();
    const step = () => {
      const x = Math.min(1, (Date.now() - t0) / ms);
      setK(1 - Math.pow(1 - x, 3));
      if (x < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [key, ms]);
  return k;
}

export function ScoreCard({ score, title = "امتیاز سلامت" }: { score: Score; title?: string }) {
  const [info, setInfo] = useState(false);
  const [w, setW] = useState(0);
  const k = useGrow(score);
  const scored = (score.systems ?? []).filter((s) => s.score != null);
  const n = scored.length;
  const overall = score.value;
  const tone = overallTone(score);
  const why = noScoreText(score);

  const pt = (i: number, r: number) => {
    const a = (i / n) * Math.PI * 2;
    return [50 + r * Math.sin(a), 50 - r * Math.cos(a)];
  };
  const poly = scored.map((s, i) => pt(i, (R * s.score! * k) / 100).join(",")).join(" ");

  return (
    <Card style={u.soft}>
      <View style={[u.row, { justifyContent: "space-between" }]}>
        <View>
          <T b style={u.h2}>{title}</T>
          <T style={u.muted}>خلاصهٔ دستگاه‌های بدن</T>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="این عدد چطور ساخته می‌شود؟" hitSlop={10} onPress={() => setInfo((x) => !x)} style={{ padding: 4 }}>
          <Ionicons name="information-circle-outline" size={20} color={C.subtle} />
        </Pressable>
      </View>
      {info && <T style={u.muted}>{INFO}</T>}
      {!!why && n > 0 && <T style={u.muted}>{why}</T>}

      {n >= RADAR_MIN_SYSTEMS ? (
        <View style={s.plot} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
          {w > 0 && (
            <>
              <Svg width={w} height={w} viewBox="0 0 100 100">
                {[0.25, 0.5, 0.75].map((f) => (
                  <Circle key={f} cx={50} cy={50} r={R * f} fill="none" stroke={C.line} strokeWidth={0.35} />
                ))}
                <Circle cx={50} cy={50} r={R} fill="none" stroke={C.line} strokeWidth={0.45} />
                {scored.map((sys, i) => {
                  const [x, y] = pt(i, R);
                  return <Line key={sys.id} x1={50} y1={50} x2={x} y2={y} stroke={C.line} strokeWidth={0.3} />;
                })}
                <Polygon points={poly} fill={C.barActive} fillOpacity={0.14} stroke={C.barActive} strokeWidth={0.6} strokeLinejoin="round" />
                {scored.map((sys, i) => {
                  const [x, y] = pt(i, (R * sys.score! * k) / 100);
                  return <Circle key={sys.id} cx={x} cy={y} r={1.6} fill={TONE[scoreTone(sys.score, sys.critical)]} stroke={C.card} strokeWidth={0.5} />;
                })}
              </Svg>
              {overall != null && (
                // Only the number sits in the centre (a small capsule, clear of the axis dots); its verdict is a badge under the plot.
                <View style={[s.center, { top: w / 2 - 19 }]} pointerEvents="none">
                  <View style={s.capsule}>
                    <T b style={{ fontSize: 26, lineHeight: 34, color: TONE[tone], textAlign: "center" }}>{faDigits(Math.round(overall * k))}</T>
                  </View>
                </View>
              )}
              {scored.map((sys, i) => {
                const a = (i / n) * Math.PI * 2;
                const [x, y] = pt(i, R + 4);
                const t = scoreTone(sys.score, sys.critical);
                return (
                  <View
                    key={sys.id}
                    accessible
                    accessibilityLabel={`${sys.fa}: امتیاز ${faDigits(sys.score!)} از ۱۰۰`}
                    style={[
                      s.label,
                      {
                        left: (x / 100) * w + (-0.5 + 0.5 * Math.sin(a)) * LABEL_W,
                        top: (y / 100) * w + (-0.5 - 0.5 * Math.cos(a)) * LABEL_H,
                      },
                    ]}>
                    <T style={s.labelT} numberOfLines={2}>{sys.fa}</T>
                    <T b style={[s.labelT, { fontSize: 15, color: TONE[t] }]}>{faDigits(sys.score!)}</T>
                  </View>
                );
              })}
            </>
          )}
        </View>
      ) : null}
      {n >= RADAR_MIN_SYSTEMS && overall != null && (
        <View style={[s.verdict, { alignSelf: "center" }]}>
          <T style={{ fontSize: 12, lineHeight: 18, color: C.muted }}>مرورِ سریع:</T>
          <T b style={{ fontSize: 12, lineHeight: 18, color: TONE[tone] }}>{TONE_WORD[tone]}</T>
        </View>
      )}
      {n >= RADAR_MIN_SYSTEMS ? null : n > 0 ? (
        <>
          {overall != null && <Overall value={Math.round(overall * k)} tone={tone} />}
          {scored.map((sys) => {
            const t = scoreTone(sys.score, sys.critical);
            return (
              <View key={sys.id} style={{ gap: 4 }}>
                <View style={[u.row, { justifyContent: "space-between" }]}>
                  <T>{sys.fa}</T>
                  <T b style={{ color: TONE[t] }}>{faDigits(sys.score!)}</T>
                </View>
                <View style={s.track}>
                  <View style={[s.fill, { width: `${sys.score! * k}%`, backgroundColor: TONE[t] }]} />
                </View>
              </View>
            );
          })}
        </>
      ) : overall != null ? (
        // Older server without score.systems: the overall number only, no local formula.
        <Overall value={Math.round(overall * k)} tone={tone} />
      ) : (
        <T style={u.muted}>{why ?? "برای محاسبهٔ امتیاز، آزمایش با محدودهٔ مرجع لازم است."}</T>
      )}
      {overall != null && score.counted != null && score.total != null && (
        <T style={[u.muted, { textAlign: "center" }]}>بر پایهٔ {faDigits(score.counted)} از {faDigits(score.total)} آزمایشِ این برگه</T>
      )}
    </Card>
  );
}

function Overall({ value, tone }: { value: number; tone: Tone }) {
  return (
    <View style={[u.row, { alignItems: "baseline" }]}>
      <T b style={{ fontSize: 30, color: TONE[tone] }}>{faDigits(value)}</T>
      <T style={u.muted}>مرورِ سریع از ۱۰۰</T>
      <T b style={{ color: TONE[tone] }}>{TONE_WORD[tone]}</T>
    </View>
  );
}

// Native RTL swaps `left`; this keeps the circle's geometry LTR like the site's SVG. react-native-web never swaps it.
const LTR = Platform.OS === "web" ? {} : ({ direction: "ltr" } as const);

const s = StyleSheet.create({
  plot: { width: "100%", aspectRatio: 1, maxWidth: 470, alignSelf: "center", marginVertical: 8, ...LTR },
  center: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  capsule: { backgroundColor: `${C.card}D9`, borderRadius: 999, paddingHorizontal: 8 },
  verdict: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.chip, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12 },
  label: { position: "absolute", width: LABEL_W, height: LABEL_H, alignItems: "center", justifyContent: "center" },
  labelT: { fontSize: 11, textAlign: "center", lineHeight: 15 },
  track: { height: 8, borderRadius: 4, backgroundColor: C.track, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
});
