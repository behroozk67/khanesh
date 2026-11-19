import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Svg, { Path } from "react-native-svg";

import { C } from "./ui";

type Glyph = { ion: keyof typeof Ionicons.glyphMap } | { mci: keyof typeof MaterialCommunityIcons.glyphMap } | { svg: string };

// No icon font has a kidney or a liver, so those two are drawn (24×24 box).
const KIDNEY = "M15.5 2.8C11.2 2.8 7.5 5.6 7.5 10.2c0 1.7.7 2.6 1.9 3.6.9.8 1 1.6.5 2.6-.9 1.9.3 4.8 3.4 4.8 4.6 0 7.7-4 7.7-9.4 0-5.5-2.6-9-5.5-9z";
const LIVER = "M2.8 8.6C2.8 6.5 4.5 5.6 7 6l11.2 1.9c2 .4 3.2 1.6 3 3.5-.5 4.4-4 7.4-8.6 7.4-2.5 0-4.2-1-5.7-2.4C4.8 14.9 2.8 12.6 2.8 8.6z";

// Category key (testCategories.ts, or "urine") → picture. Red for blood, brand colour otherwise.
const GLYPH: Record<string, Glyph> = {
  cbc: { ion: "water-outline" },
  iron: { mci: "blood-bag" },
  glycemia: { ion: "water-outline" },
  lipids: { ion: "heart-outline" },
  kidney: { svg: KIDNEY },
  liver: { svg: LIVER },
  electro: { ion: "flash-outline" },
  thyroid: { mci: "butterfly-outline" },
  coag: { ion: "bandage-outline" },
  inflam: { ion: "thermometer-outline" },
  cardiac: { ion: "pulse-outline" },
  vitamin: { ion: "nutrition-outline" },
  serology: { ion: "shield-checkmark-outline" },
  urine: { ion: "beaker-outline" },
};
const RED = new Set(["cbc", "iron", "coag"]);

export function TopicIcon({ topic }: { topic: string | null }) {
  const g = (topic && GLYPH[topic]) || { ion: "document-text-outline" as const };
  const red = !!topic && RED.has(topic);
  const color = red ? C.bad : C.brand;
  const size = 17;
  if ("svg" in g) {
    return (
      <Svg width={size + 2} height={size + 2} viewBox="0 0 24 24">
        <Path d={g.svg} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" />
      </Svg>
    );
  }
  return "mci" in g ? <MaterialCommunityIcons name={g.mci} size={size + 2} color={color} /> : <Ionicons name={g.ion} size={size} color={color} />;
}

export const isRedTopic = (topic: string | null) => !!topic && RED.has(topic);
