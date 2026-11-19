import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, TextInput, View } from "react-native";

import { normalizeDigits } from "@/content/khanesh/digits";
import { tap } from "@/lib/feedback";
import { CATS, type ManualErr, REFS, SECTIONS, URINE_FIELDS, URINE_OPTIONS } from "@/lib/manual";

import { C, faDigits, ltr, styles as u, T } from "./ui";

type Section = { id: string; label: string; cats: string[] };
type UrineField = { k: string; label: string; type: "number" | "dip" | "posneg" | "range"; unit?: string; hint?: string };
const LTR = Platform.OS === "web" ? {} : ({ direction: "ltr" } as const);

/** Site's manual mode (EntryGrid.jsx): fields by section, urine as dipstick choices. No local verdicts — the engine judges. */
export function ManualEntry({
  vals,
  setVal,
  urine,
  setUrine,
  errs,
}: {
  vals: Record<string, string>;
  setVal: (k: string, v: string) => void;
  urine: Record<string, string>;
  setUrine: (k: string, v: string) => void;
  errs: ManualErr[];
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>("blood");
  const query = q.trim().toLowerCase();
  const keys = Object.keys(REFS);
  const match = (k: string) => !query || REFS[k].label.toLowerCase().includes(query) || k.includes(query);

  return (
    <View style={{ gap: 10 }}>
      <View style={s.search}>
        <Ionicons name="search" size={18} color={C.muted} />
        <TextInput style={[u.t, { flex: 1, paddingVertical: 10 }]} value={q} onChangeText={setQ} placeholder="جستجوی آزمایش؛ مثلاً Hb یا قند" placeholderTextColor={C.muted} />
      </View>
      {(SECTIONS as Section[]).map((sec) => {
        const fields = sec.id === "urine" ? [] : keys.filter((k) => sec.cats.includes(REFS[k].cat) && match(k));
        const urineFields = sec.id === "urine" ? (URINE_FIELDS as UrineField[]).filter((f) => !query || f.label.includes(query)) : [];
        if (!fields.length && !urineFields.length) return null;
        const filled = fields.filter((k) => vals[k]?.trim()).length + urineFields.filter((f) => urine[f.k]?.trim()).length;
        const expanded = !!query || open === sec.id;
        return (
          <View key={sec.id} style={s.sec}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => {
                tap();
                setOpen(open === sec.id ? null : sec.id);
              }}
              style={[u.row, { padding: 12 }]}>
              <T b style={{ flex: 1 }}>{sec.label}</T>
              {filled > 0 && (
                <View style={s.count}>
                  <T style={{ color: C.brand, fontSize: 12 }}>{faDigits(filled)} مقدار</T>
                </View>
              )}
              <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={C.muted} />
            </Pressable>
            {expanded &&
              fields.map((k, i) => (
                <View key={k}>
                  {(i === 0 || REFS[fields[i - 1]].cat !== REFS[k].cat) && <T style={[u.muted, s.cat]}>{(CATS as Record<string, { label: string }>)[REFS[k].cat]?.label}</T>}
                  <View style={s.field}>
                    <T style={{ flex: 1 }}>{REFS[k].label}</T>
                    <TextInput
                      style={[u.t, s.input]}
                      value={vals[k] ?? ""}
                      onChangeText={(v) => setVal(k, normalizeDigits(v))}
                      keyboardType="decimal-pad"
                      placeholder="—"
                      placeholderTextColor={C.muted}
                      accessibilityLabel={REFS[k].label}
                    />
                    <T style={[u.muted, s.unit]}>{ltr(REFS[k].unit)}</T>
                  </View>
                </View>
              ))}
            {expanded &&
              urineFields.map((f) => (
                <View key={f.k} style={[s.field, { flexWrap: "wrap" }]}>
                  <T style={{ flex: 1, minWidth: 110 }}>{f.label}</T>
                  {f.type === "dip" || f.type === "posneg" ? (
                    <View style={[u.row, { flexWrap: "wrap", gap: 4 }]}>
                      {(URINE_OPTIONS as Record<string, { v: string; fa: string }[]>)[f.type].map((o) => {
                        const on = urine[f.k] === o.v;
                        return (
                          <Pressable key={o.v} onPress={() => setUrine(f.k, on ? "" : o.v)} style={[s.dip, on && s.dipOn]}>
                            <T style={{ fontSize: 12, color: on ? "#fff" : C.muted }}>{o.fa}</T>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : (
                    <TextInput
                      style={[u.t, s.input]}
                      value={urine[f.k] ?? ""}
                      onChangeText={(v) => setUrine(f.k, normalizeDigits(v))}
                      keyboardType={f.type === "number" ? "decimal-pad" : "default"}
                      placeholder={f.hint ?? "—"}
                      placeholderTextColor={C.muted}
                      accessibilityLabel={f.label}
                    />
                  )}
                </View>
              ))}
          </View>
        );
      })}
      {errs.length > 0 && (
        <View style={s.warn}>
          <T b style={{ color: C.warn }}>این مقادیر به تحلیل فرستاده نمی‌شوند:</T>
          {errs.map((e) => (
            <T key={e.key} style={u.muted}>
              {e.unreadable
                ? `${e.label}: مقدارِ ${ltr(e.value)} به‌صورتِ عدد خوانده نشد.`
                : `${e.label}: مقدار ${ltr(e.value)} بیرون از بازهٔ ممکن (${ltr(`${e.min}–${e.max}`)}) است.`}
            </T>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: C.line },
  sec: { borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.bg, overflow: "hidden" },
  count: { backgroundColor: C.brandSoft, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  cat: { paddingHorizontal: 12, paddingTop: 8 },
  field: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  input: { width: 84, borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 8, backgroundColor: C.card, textAlign: "center", ...LTR },
  unit: { width: 64, fontSize: 11 },
  dip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: C.line },
  dipOn: { backgroundColor: C.brand, borderColor: C.brand },
  warn: { gap: 4, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.warn },
});
