import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { C, Card, styles as u, T } from "@/components/ui";
import { type Block, pageFor, routeKey } from "@/lib/encyclopedia";
import { FOODS } from "@/lib/foods";
import { autoLog } from "@/lib/store";

export default function TestPage() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const page = useMemo(() => pageFor(key), [key]);
  const food = FOODS[key];

  useEffect(() => {
    if (page) autoLog("read");
  }, [page]);

  if (!page) return <T style={{ padding: 24 }}>این راهنما پیدا نشد.</T>;

  return (
    <ScrollView contentContainerStyle={u.page}>
      <Stack.Screen options={{ title: page.title }} />
      <T b style={u.h1}>{page.title}</T>
      {!!page.aka && <T style={u.muted}>{page.aka}</T>}
      {page.card && (
        <Card style={{ backgroundColor: C.brandSoft, borderColor: C.brandSoft }}>
          <T b style={u.h2}>{page.card.h}</T>
          {page.card.p.map((p, i) => (
            <T key={i}>{p}</T>
          ))}
        </Card>
      )}
      {food && (
        <Card>
          <T b style={u.h2}>{food.h}</T>
          {food.items?.map((it) => (
            <View key={it.n} style={[u.row, s.link, { justifyContent: "space-between" }]}>
              <T style={{ flexShrink: 1 }}>{it.n}</T>
              <T b style={{ color: C.brand }}>{it.amt}</T>
            </View>
          ))}
          {[
            { h: "بیشتر", list: food.more, color: C.good },
            { h: "کمتر", list: food.less, color: C.warn },
          ].map(
            (g) =>
              !!g.list?.length && (
                <View key={g.h} style={[s.link, { gap: 4 }]}>
                  <T b style={{ color: g.color }}>{g.h}</T>
                  {g.list.map((x) => (
                    <T key={x} style={{ lineHeight: 26 }}>
                      {"• "}
                      {x}
                    </T>
                  ))}
                </View>
              ),
          )}
          {food.notes.map((n) => (
            <T key={n} style={[u.muted, s.note]}>{n}</T>
          ))}
          <T style={u.muted} onPress={() => Linking.openURL(food.source.url)}>
            منبع: {food.source.t}
          </T>
        </Card>
      )}
      <Blocks blocks={page.blocks} />
      {page.more && page.more.items.length > 0 && (
        <Card>
          <T b style={u.h2}>{page.more.h}</T>
          {page.more.items.map((it) =>
            it.to ? (
              <Pressable key={it.n} onPress={() => router.push({ pathname: "/test/[key]", params: { key: routeKey(it.to!) } })} style={s.link}>
                <T style={{ color: C.brand }}>{it.n}</T>
                {!!it.hint && <T style={u.muted}>{it.hint}</T>}
              </Pressable>
            ) : (
              <T key={it.n} style={u.muted}>
                {it.n}
              </T>
            ),
          )}
        </Card>
      )}
      <Blocks blocks={page.blocks2} />
      {!!page.resources?.length && (
        <Card>
          <T b style={u.h2}>منابع بیشتر</T>
          <T style={u.muted}>این‌ها برای مطالعهٔ بیشترند و مبنای نتیجهٔ موتور نیستند؛ مبنای اعداد در بخش «منابع» پایین همین صفحه آمده است.</T>
          {page.resources.map((r) => (
            <Pressable key={r.t} onPress={() => Linking.openURL(r.url)} style={s.link}>
              <T b>{r.t}</T>
              <T style={u.muted}>{r.org}</T>
              <T style={{ color: C.brand }}>بیشتر بدانید ←</T>
            </Pressable>
          ))}
        </Card>
      )}
      {page.sources.length > 0 && (
        <Card>
          <T b style={u.h2}>منابع</T>
          {page.sources.map((s, i) => (
            <T key={i} style={u.muted} onPress={s.url ? () => Linking.openURL(s.url!) : undefined}>
              {i + 1}. {s.org} — {s.fa} ({s.year}).
            </T>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const body = { lineHeight: 26, textAlign: "justify" } as const;

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => (
        <View key={i} style={{ gap: 8 }}>
          {!!b.h2 && <T b style={[u.h2, { marginTop: 8, color: C.brand }]}>{b.h2}</T>}
          {!!b.h3 && <T b style={{ fontSize: 16 }}>{b.h3}</T>}
          {b.p?.map((t, j) => (
            <T key={j} style={body}>
              {t}
            </T>
          ))}
          {b.ul?.map((it, j) => (
            <T key={j} style={body}>
              {"• "}
              {typeof it === "string" ? it : <T b>{it.b} </T>}
              {typeof it === "string" ? null : it.t}
            </T>
          ))}
          {b.table && (
            <View style={s.table}>
              {[b.table.head, ...b.table.rows].map((row, r) => (
                <View key={r} style={[s.tr, r === 0 && { backgroundColor: C.bg }]}>
                  {row.map((cell, c) => (
                    <T key={c} b={r === 0} style={s.td}>
                      {cell}
                    </T>
                  ))}
                </View>
              ))}
            </View>
          )}
          {!!b.note && <T style={[u.muted, s.note]}>{b.note}</T>}
        </View>
      ))}
    </>
  );
}

const s = StyleSheet.create({
  link: { paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  table: { borderWidth: 1, borderColor: C.line, borderRadius: 10, overflow: "hidden" },
  tr: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  td: { flex: 1, padding: 8, fontSize: 13 },
  note: { borderRightWidth: 3, borderColor: C.brandSoft, paddingRight: 8 },
});
