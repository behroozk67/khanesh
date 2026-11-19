import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { C, Card, faDigits, ltr, styles as u, T } from "./ui";

type Row = { test?: unknown; value?: unknown; reference?: unknown };

const text = (x: unknown) => (typeof x === "string" || typeof x === "number" ? String(x).trim() : "");
// The server puts "—" where no printed range was read; that is not a range (site: ExtractedTests.jsx).
const hasRef = (x: string) => !/^[\s—–-]*$/.test(x);

/**
 * Port of the site's ExtractedTests: every row read off the sheet, verbatim and unjudged. The engine grades only
 * what it has a range for (urine dipsticks, unmatched names…), so this is where the rest stays visible.
 */
export function ExtractedList({ list }: { list: unknown[] | undefined }) {
  const [open, setOpen] = useState(false);
  const rows = (list ?? []).filter((r): r is Row => !!r && typeof r === "object" && !!text((r as Row).test));
  if (!rows.length) return null;
  return (
    <Card delay={260}>
      <Pressable accessibilityRole="button" onPress={() => setOpen(!open)} style={[u.row, { justifyContent: "space-between" }]}>
        <T b style={u.h2}>اعدادی که از برگه خواندیم ({faDigits(rows.length)})</T>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={C.muted} />
      </Pressable>
      {open && (
        <>
          <T style={u.muted}>یک نگاه به برگه بیندازید و مقایسه کنید؛ جلوی اشتباهِ خواندن را می‌گیرد. اینجا بدونِ قضاوت است و محدوده، همان چاپِ برگهٔ شماست.</T>
          {rows.map((r, i) => {
            const ref = text(r.reference);
            return (
              <View key={i} style={s.row}>
                <View style={[u.row, { justifyContent: "space-between" }]}>
                  <T b style={{ flexShrink: 1 }}>{text(r.test)}</T>
                  <T b>{ltr(text(r.value))}</T>
                </View>
                {hasRef(ref) && <T style={u.muted}>محدودهٔ چاپ‌شده روی برگه: {ltr(ref)}</T>}
              </View>
            );
          })}
        </>
      )}
    </Card>
  );
}

const s = StyleSheet.create({
  row: { gap: 2, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.line },
});
