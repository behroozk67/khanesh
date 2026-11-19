import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router, useNavigation } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";

import { C, type Icon, faDigits, styles as u, T } from "@/components/ui";
import { searchTests } from "@/content/khanesh/testSearch";
import { CAT_PREFIX, CATEGORIES, type Category, type GuideItem, routeKey } from "@/lib/encyclopedia";
import { tap } from "@/lib/feedback";
import { splitName } from "@/lib/names";

type Mci = keyof typeof MaterialCommunityIcons.glyphMap;
// Outline medical glyphs per category; Ionicons has no baby, stethoscope, pill, microscope or DNA, so those come from MCI.
const CAT_ICON: Record<string, { ion: Icon } | { mci: Mci }> = {
  wellness: { ion: "fitness-outline" }, allergy: { ion: "flower-outline" }, inflammation: { ion: "flame-outline" },
  cancer: { ion: "ribbon-outline" }, heavymetal: { ion: "flask-outline" }, pregnancy: { mci: "baby-face-outline" },
  cardiac: { ion: "heart-outline" }, hormone: { ion: "options-outline" }, std: { mci: "shield-alert-outline" },
  disease: { mci: "stethoscope" }, immunity: { ion: "shield-checkmark-outline" }, thyroid: { ion: "pulse-outline" },
  drug: { mci: "pill" }, infectious: { mci: "microscope" }, vitamins: { ion: "nutrition-outline" }, genetic: { mci: "dna" },
};

// Quick filters fill the search box; "همه" clears it.
const QUICK = ["همه", "CBC", "TSH", "ویتامین D", "قند خون", "فریتین"];

const open = (key: string) => {
  tap();
  router.push({ pathname: "/test/[key]", params: { key } });
};

export default function Tests() {
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const [openCat, setOpenCat] = useState<string | null>(null);
  const hits = useMemo(() => (q.trim() ? (searchTests(q, 30) as GuideItem[]) : null), [q]);
  const navigation = useNavigation();

  useEffect(() => {
    // "left" is the start side, so the title sits on the right under RTL.
    navigation.setOptions({ headerStyle: { backgroundColor: C.surface }, headerTitleAlign: "left" });
  }, [navigation]);

  return (
    <FlatList
      style={{ backgroundColor: C.surface }}
      contentContainerStyle={[u.page, { backgroundColor: C.surface, gap: 10, paddingTop: 0 }]}
      keyboardShouldPersistTaps="handled"
      stickyHeaderIndices={[0]}
      ListHeaderComponent={
        <View style={s.head}>
          <View style={[s.search, focused && { borderColor: C.brand }]}>
            <Ionicons name="search-outline" size={18} color={C.subtle} />
            <TextInput
              style={[u.t, { flex: 1, fontSize: 14, paddingVertical: 0 }]}
              value={q}
              onChangeText={setQ}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="جستجوی آزمایش؛ مثلاً فریتین یا TSH"
              placeholderTextColor={C.subtle}
              accessibilityLabel="جستجوی آزمایش"
            />
            {!!q && (
              <Pressable accessibilityRole="button" accessibilityLabel="پاک‌کردن جستجو" hitSlop={10} onPress={() => setQ("")}>
                <Ionicons name="close-circle" size={18} color={C.subtle} />
              </Pressable>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
            {QUICK.map((x) => {
              const on = x === "همه" ? !q.trim() : q.trim() === x;
              return (
                <Pressable
                  key={x}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    tap();
                    setQ(x === "همه" ? "" : x);
                  }}
                  style={[s.quick, on && s.quickOn]}>
                  <T b={on} style={{ fontSize: 12, color: on ? C.brandInk : C.chipInk }}>{x}</T>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      }
      data={hits ? [] : CATEGORIES}
      keyExtractor={(c) => c.id}
      ListEmptyComponent={
        hits ? (
          <View style={[s.cat, { paddingHorizontal: 16, paddingVertical: 4 }]}>
            {hits.map((it, i) => it.to && <Row key={it.to} item={it} first={i === 0} />)}
            {hits.length === 0 && <T style={[u.muted, { paddingVertical: 12 }]}>آزمایشی با این نام پیدا نشد.</T>}
          </View>
        ) : undefined
      }
      renderItem={({ item: c }) => (
        <CatCard
          c={c}
          expanded={openCat === c.id}
          onToggle={() => {
            tap();
            setOpenCat(openCat === c.id ? null : c.id);
          }}
        />
      )}
    />
  );
}

function CatCard({ c, expanded, onToggle }: { c: Category; expanded: boolean; onToggle: () => void }) {
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: withTiming(expanded ? "180deg" : "0deg", { duration: 220 }) }] }));
  const g = CAT_ICON[c.id] ?? { ion: "flask-outline" as const };
  return (
    <View style={[s.cat, expanded && { borderColor: C.barCapsule }]}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={onToggle} style={s.catHead}>
        <View style={s.badge}>
          {"mci" in g ? <MaterialCommunityIcons name={g.mci} size={21} color={C.brand} /> : <Ionicons name={g.ion} size={20} color={C.brand} />}
        </View>
        <T b numberOfLines={1} style={{ flex: 1, fontSize: 14.5, color: C.ink }}>{c.t}</T>
        <View style={s.count}>
          <T style={{ fontSize: 11, color: C.muted }}>{faDigits(c.items.length)} آزمایش</T>
        </View>
        <Animated.View style={chevron}>
          <Ionicons name="chevron-down" size={18} color={C.subtle} />
        </Animated.View>
      </Pressable>
      {expanded && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <T style={[u.muted, { lineHeight: 22 }]}>{c.d}</T>
          <Pressable accessibilityRole="link" onPress={() => open(CAT_PREFIX + c.id)} style={{ paddingVertical: 10 }}>
            <T b style={{ color: C.brand, fontSize: 13 }}>راهنمای کامل «{c.t}» ←</T>
          </Pressable>
          {c.items.map((it) =>
            it.to ? (
              <Row key={it.to} item={it} />
            ) : (
              <T key={it.n} style={[u.muted, s.sep, { paddingVertical: 10 }]}>
                {it.n}
              </T>
            ),
          )}
        </View>
      )}
    </View>
  );
}

function Row({ item, first }: { item: GuideItem; first?: boolean }) {
  const [fa, en] = splitName(item.n);
  return (
    <Pressable accessibilityRole="link" onPress={() => open(routeKey(item.to!))} style={[s.row, !first && s.sep]}>
      <View style={{ flex: 1, gap: 2 }}>
        <T style={{ fontSize: 14 }}>{fa}</T>
        {!!item.d && (
          <T style={{ fontSize: 12, lineHeight: 20, color: C.muted }} numberOfLines={2}>
            {item.d}
          </T>
        )}
      </View>
      {!!en && (
        <View style={s.en}>
          <T numberOfLines={1} style={{ fontSize: 11, color: C.chipInk, writingDirection: "ltr" }}>{en}</T>
        </View>
      )}
      <Ionicons name="chevron-back" size={16} color={C.subtle} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  // Sticky: the opaque page colour keeps scrolled cards from showing through.
  head: { backgroundColor: C.surface, paddingTop: 12, paddingBottom: 10, gap: 10 },
  search: {
    height: 48, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.card, borderRadius: 14, paddingHorizontal: 14,
    borderWidth: 1, borderColor: C.barLine, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  quick: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, backgroundColor: C.card, borderWidth: 1, borderColor: C.barLine },
  quickOn: { backgroundColor: C.brandTint, borderColor: C.brand },
  cat: { ...u.soft, backgroundColor: C.card, borderWidth: 1 },
  catHead: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 16 },
  badge: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center", marginEnd: 4 },
  count: { backgroundColor: C.chip, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.hair },
  en: { maxWidth: "40%", backgroundColor: C.chip, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
});
