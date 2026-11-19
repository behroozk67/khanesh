import { Image } from "expo-image";
import { View } from "react-native";

// The brand image keeps its own mint background (#DCEFED) in both themes, so its colors are never altered.
export function BrandHero({ compact }: { compact?: boolean }) {
  const w = compact ? 230 : 280;
  return (
    <View style={{ borderRadius: 20, backgroundColor: "#DCEFED", alignItems: "center", paddingVertical: compact ? 12 : 16, overflow: "hidden" }}>
      <Image source={require("../../assets/images/brand-source.png")} style={{ width: w, height: (w * 1024) / 1392 }} contentFit="contain" accessibilityLabel="آزمایار اپ" />
    </View>
  );
}
