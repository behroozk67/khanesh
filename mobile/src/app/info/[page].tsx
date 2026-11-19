import { useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";

import { C, faDigits, styles as u, T } from "@/components/ui";
import { PAGES } from "@/content/khanesh/pages";

type Block = { t: "h1" | "h2" | "h3" | "p" | "li"; text: string; ordered?: boolean };

/** Site info pages (reference ranges, units, capture guide, methodology, terms, privacy), text synced verbatim. */
export default function InfoPage() {
  const { page } = useLocalSearchParams<{ page: string }>();
  const blocks = (PAGES as Record<string, Block[]>)[page] ?? [];
  const title = blocks.find((b) => b.t === "h1")?.text ?? "";
  // Running number of each ordered list item (0 for everything else).
  const nums = blocks.reduce<number[]>((acc, b, i) => [...acc, b.ordered ? (blocks[i - 1]?.ordered ? acc[i - 1] : 0) + 1 : 0], []);
  return (
    <ScrollView contentContainerStyle={u.page}>
      {!blocks.length && <T style={u.muted}>این صفحه پیدا نشد.</T>}
      <T b style={u.h1}>{title}</T>
      {/* A plain card: the text must be there on the first frame, not after an entering animation. */}
      <View style={u.card}>
        {blocks.map((b, i) => {
          if (b.t === "h1") return null;
          if (b.t === "h2") return <T key={i} b style={[u.h2, { marginTop: i > 1 ? 8 : 0 }]}>{b.text}</T>;
          if (b.t === "h3") return <T key={i} b>{b.text}</T>;
          if (b.t === "li")
            return (
              <View key={i} style={[u.row, { alignItems: "flex-start" }]}>
                <T style={{ color: C.brand }}>{b.ordered ? `${faDigits(nums[i])}.` : "•"}</T>
                <T style={{ flex: 1, lineHeight: 26 }}>{b.text}</T>
              </View>
            );
          return <T key={i} style={{ lineHeight: 26 }}>{b.text}</T>;
        })}
      </View>
    </ScrollView>
  );
}
