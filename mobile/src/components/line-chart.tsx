import { useState } from "react";
import { Platform, View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from "react-native-svg";

import { pickLabels } from "@/lib/history";

import { C, faDigits, ltr, T } from "./ui";

export type ChartPoint = { label: string; value: number; color?: string };

const fmt = (n: number) => faDigits(Number.isInteger(n) ? n : +n.toFixed(2));
const LEGEND_W = 104;
const LABEL_W = 52; // width one date label needs
// Native RTL swaps `left`; this keeps the overlay's coordinates literal. react-native-web never swaps it and rejects the prop.
const LTR = Platform.OS === "web" ? {} : ({ direction: "ltr" } as const);

/**
 * Small SVG line chart; `band` shades the server's reference range, `domain` fixes the y-axis (score 0–100).
 * `legend` (needs `band`) switches to the biomarker-page look: grid per point, zone key on the right, dots in `point.color`.
 * Text is drawn with RN <Text> over the SVG: SVG text breaks Persian letter joining on Android.
 */
export function LineChart({
  points,
  band,
  domain,
  height = 170,
  color = C.brand,
  legend,
}: {
  points: ChartPoint[];
  band?: [number, number] | null;
  domain?: [number, number];
  height?: number;
  color?: string;
  legend?: boolean;
}) {
  const [w, setW] = useState(0);
  const key = !!legend && !!band;
  const pad = { l: key ? 16 + LEGEND_W : 16, r: 22, t: 22, b: 30 }; // r: half a value label, so the edge label stays centred on its dot
  const vals = points.map((p) => p.value).concat(band ?? []);
  let [lo, hi] = domain ?? [Math.min(...vals), Math.max(...vals)];
  if (!domain) {
    const m = (hi - lo || Math.abs(hi) || 1) * 0.15;
    lo -= m;
    hi += m;
  }
  const x = (i: number) => (points.length < 2 ? w / 2 : pad.l + (i * (w - pad.l - pad.r)) / (points.length - 1));
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo || 1)) * (height - pad.t - pad.b);
  // RTL reading order: the newest point sits on the left; a lone point is centred in the plot (legend excluded).
  const xr = (i: number) => (points.length < 2 ? (w - (key ? LEGEND_W : 0)) / 2 : w - x(i));
  const d = points.map((p, i) => `${i ? "L" : "M"}${xr(i)} ${y(p.value)}`).join(" ");
  const zones = band
    ? [
        { name: `بیش از ${fmt(band[1])}`, y0: pad.t, y1: y(band[1]), color: C.warn },
        { name: "در محدوده", sub: ltr(`${fmt(band[0])} – ${fmt(band[1])}`), y0: y(band[1]), y1: y(band[0]), color: C.good },
        { name: `کمتر از ${fmt(band[0])}`, y0: y(band[0]), y1: height - pad.b, color: C.warn },
      ]
    : [];
  const at = (cx: number, top: number, width: number) => ({ position: "absolute", left: Math.min(Math.max(cx - width / 2, 0), w - width), top, width, alignItems: "center" }) as const;
  // Value goes above its dot, below when every neighbour is higher (the line climbs away from it) and there is room above the axis.
  // The chip's card-coloured background keeps the line from cutting through the digits.
  const valueTop = (i: number) => {
    const nb = [points[i - 1], points[i + 1]].filter(Boolean);
    // Put the number on the side the line leaves from least: below when the neighbours are mostly higher.
    const below = nb.reduce((s, q) => s + q.value - points[i].value, 0) > 0 && y(points[i].value) + 24 <= height - pad.b + 4;
    return below ? y(points[i].value) + 8 : Math.max(0, y(points[i].value) - 25);
  };
  const showValue = pickLabels(points.map((p, i) => ({ x: xr(i), y: valueTop(i), value: p.value })));
  // Date labels: with many points keep every n-th (from the newest) so neighbours never overlap, and drop a label equal to the last shown one.
  const gap = points.length < 2 ? w : (w - pad.l - pad.r) / (points.length - 1);
  const every = Math.max(1, Math.ceil(LABEL_W / gap));
  const shown: boolean[] = [];
  for (let i = points.length - 1, last = ""; i >= 0; i -= 1) {
    shown[i] = (points.length - 1 - i) % every === 0 && points[i].label !== last;
    if (shown[i]) last = points[i].label;
  }
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height }}>
      {w > 0 && (
        <>
          <Svg width={w} height={height}>
            {!key && points.length > 1 && (
              <>
                <Defs>
                  <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={color} stopOpacity={0.12} />
                    <Stop offset="1" stopColor={color} stopOpacity={0} />
                  </LinearGradient>
                </Defs>
                <Path d={`${d} L${xr(points.length - 1)} ${height - pad.b} L${xr(0)} ${height - pad.b} Z`} fill="url(#area)" />
              </>
            )}
            {band && !key && <Rect x={0} width={w} y={y(band[1])} height={Math.max(1, y(band[0]) - y(band[1]))} fill={C.good} opacity={0.12} />}
            {key && points.map((_, i) => <Line key={`g${i}`} x1={xr(i)} x2={xr(i)} y1={pad.t} y2={height - pad.b} stroke={C.line} />)}
            {key && zones.map((z, i) => <Rect key={`z${i}`} x={w - 5} y={z.y0} width={3} height={Math.max(1, z.y1 - z.y0)} fill={z.color} />)}
            <Line x1={0} x2={w} y1={height - pad.b} y2={height - pad.b} stroke={C.line} />
            {points.length > 1 && <Path d={d} stroke={key ? C.muted : color} strokeWidth={key ? 1.5 : 2.5} fill="none" strokeLinejoin="round" />}
            {points.map((p, i) => {
              const c = p.color ?? color;
              return <Circle key={`c${i}`} cx={xr(i)} cy={y(p.value)} r={i === points.length - 1 ? 6 : 4.5} fill={key || i === points.length - 1 ? c : C.card} stroke={c} strokeWidth={2} />;
            })}
          </Svg>
          <View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: w, height }, LTR]}>
            {key &&
              zones.map((z, i) => (
                <View key={`t${i}`} style={{ position: "absolute", left: w - LEGEND_W + 4, width: LEGEND_W - 16, top: z.y0, height: Math.max(1, z.y1 - z.y0), justifyContent: "center", alignItems: "flex-end" }}>
                  <T b numberOfLines={1} style={{ fontSize: 11 }}>{z.name}</T>
                  {!!z.sub && <T numberOfLines={1} style={{ fontSize: 11, color: C.muted }}>{z.sub}</T>}
                </View>
              ))}
            {points.map((p, i) =>
              showValue[i] ? (
                <View key={`v${i}`} style={at(xr(i), valueTop(i), 44)}>
                  <T b numberOfLines={1} style={{ fontSize: 11, lineHeight: 14, backgroundColor: C.card, borderRadius: 4, paddingHorizontal: 3, overflow: "hidden" }}>{fmt(p.value)}</T>
                </View>
              ) : null,
            )}
            {points.map((p, i) =>
              shown[i] ? (
                <View key={`l${i}`} style={at(xr(i), height - pad.b + 6, LABEL_W)}>
                  <T numberOfLines={1} style={{ fontSize: 10, color: C.muted }}>{p.label}</T>
                </View>
              ) : null,
            )}
          </View>
        </>
      )}
    </View>
  );
}
