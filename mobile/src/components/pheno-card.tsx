import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import type { EngineTest, PhenoAge } from "@/lib/engine";

import { C, Card, faDigits, styles as u, T } from "./ui";

// Port of khanesh/src/PhenoAgeCard.jsx: server numbers only, Persian copy verbatim; no tile without data.
const fmt1 = (n: number) => faDigits(Math.round(n * 10) / 10);
const BIOMARKERS_FA = ["آلبومین", "کراتینین", "قندِ ناشتا", "CRP", "درصدِ لنفوسیت", "MCV", "RDW-CV", "آلکالین فسفاتاز و WBC"];

const valid = (d?: PhenoAge | null): d is PhenoAge => !!d && typeof d.years === "number" && typeof d.chronoAge === "number";

/** Biological-age tile (screenshot style, half width next to the counts tile). */
function AgeTile({ data }: { data: PhenoAge }) {
  const { years, chronoAge, deltaYears, capped } = data;
  const same = !capped && Math.abs(deltaYears) < 0.05;
  const line = capped
    ? `سنِ شناسنامه‌ای ${fmt1(chronoAge)}`
    : same
      ? "هم‌سالِ سنِ شناسنامه‌ای"
      : `${fmt1(Math.abs(deltaYears))} سال ${deltaYears < 0 ? "جوان‌تر" : "بالاتر"} از سنِ شناسنامه‌ای`;
  return (
    <Card delay={60} style={{ ...u.soft, ...s.tile, backgroundColor: C.brandSoft, borderColor: C.brand, justifyContent: "center", alignItems: "center" }}>
      <T b style={{ fontSize: capped ? 26 : 44, lineHeight: 56, color: C.brand, textAlign: "center" }}>{capped ? "کمتر از ۲۰" : fmt1(years)}</T>
      <T b style={{ color: C.brand, textAlign: "center" }}>سنِ زیستی</T>
      <View style={s.rule} />
      <T style={{ textAlign: "center", lineHeight: 24 }}>{line}</T>
    </Card>
  );
}

/** In range / out of range / no range counts, straight from the engine's flags. */
function CountsTile({ tests }: { tests: EngineTest[] }) {
  const out = tests.filter((t) => t.abnormal || t.level === "critical").length;
  const inn = tests.filter((t) => t.abnormal === false && t.level !== "critical").length;
  const bars = [
    { n: inn, label: "در محدوده", color: C.emerald },
    { n: out, label: "خارج از محدوده", color: C.amber },
    { n: tests.length - inn - out, label: "بدون محدوده", color: C.muted },
  ];
  const max = Math.max(...bars.map((b) => b.n), 1);
  return (
    <Card delay={60} style={{ ...u.soft, ...s.tile }}>
      <T b>{faDigits(tests.length)} آزمایش</T>
      <View style={s.bars}>
        {bars.map((b) => (
          <View key={b.label} style={s.col}>
            <T b style={{ fontSize: 18, textAlign: "center" }}>{faDigits(b.n)}</T>
            <View style={[s.bar, { height: b.n ? Math.max(10, (b.n / max) * 110) : 4, backgroundColor: b.color, opacity: b.n ? 1 : 0.4 }]} />
            <T style={{ fontSize: 11, color: C.muted, textAlign: "center" }}>{b.label}</T>
          </View>
        ))}
      </View>
    </Card>
  );
}

export function Overview({ tests, pheno }: { tests: EngineTest[]; pheno?: PhenoAge | null }) {
  const [more, setMore] = useState(false);
  if (!tests.length && !valid(pheno)) return null;
  return (
    <View style={{ gap: 10 }}>
      <View style={[u.row, { alignItems: "stretch", gap: 12 }]}>
        {!!tests.length && <CountsTile tests={tests} />}
        {valid(pheno) && <AgeTile data={pheno} />}
      </View>
      {valid(pheno) && (
        <>
          <Pressable onPress={() => setMore((m) => !m)} accessibilityRole="button">
            <T b style={{ color: C.brand }}>{more ? "▴" : "▾"} سنِ زیستی از کجا می‌آید؟</T>
          </Pressable>
          {more && (
            <>
              <T style={u.muted}>
                از ۹ آزمایشِ همین برگه ساخته می‌شود: {BIOMARKERS_FA.join("، ")}. اگر یکی از این‌ها روی برگه نباشد، عدد ساخته نمی‌شود — هیچ مقداری جای آن
                گذاشته نمی‌شود. قند باید ناشتا باشد؛ قندِ بعد از غذا این عدد را کاذب بالا می‌برد، پس برگه‌ای که فقط قندِ تصادفی دارد عدد نمی‌گیرد.
              </T>
              <T style={u.muted}>
                روش: معادلهٔ منتشرشدهٔ Levine (۲۰۱۸) با تصحیحِ ۲۰۱۹ — همان شاخصی که در مطالعاتِ جمعیتی برای پیش‌بینیِ مرگ‌ومیرِ ده‌ساله اعتبارسنجی شده است. این یک
                شاخصِ جمعیتی است، نه پیش‌بینیِ فردی و نه تشخیص؛ خطای چند ساله دارد و جای تفسیرِ پزشک را نمی‌گیرد. فقط برای ۲۰ سال و بالاتر معنا دارد.
              </T>
              <T style={u.muted}>عددِ ریسکِ ده‌ساله عمداً اینجا نشان داده نمی‌شود؛ یک احتمالِ آماری برای گروه است، نه سرنوشتِ یک نفر.</T>
            </>
          )}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  tile: { flex: 1, padding: 14 },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 8, minHeight: 150 },
  col: { flex: 1, gap: 4, justifyContent: "flex-end", alignItems: "center" },
  bar: { width: "100%", maxWidth: 68, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
  rule: { alignSelf: "stretch", height: StyleSheet.hairlineWidth, backgroundColor: C.brand, opacity: 0.5, marginVertical: 4 },
});
