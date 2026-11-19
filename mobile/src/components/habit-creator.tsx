import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, C, styles as u, T } from "@/components/ui";
import type { Habit } from "@/lib/challenges";
import { failure, success, tap } from "@/lib/feedback";
import { createHabit, type HabitState } from "@/lib/store";

const KINDS: [Habit["kind"], string][] = [
  ["check", "روزی یک بار"],
  ["amount", "چند بار در روز"],
];

/** Mount it to open the form; the parent unmounts it on close, so every opening starts empty. */
export function HabitCreator({ onClose, onCreated }: { onClose: () => void; onCreated: (state: HabitState) => void }) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<Habit["kind"]>("check");
  const [goal, setGoal] = useState("");
  const [unit, setUnit] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    const r = await createHabit({ title, kind, goal, unit });
    if ("error" in r) {
      failure();
      setError(r.error);
      return;
    }
    success();
    onCreated(r.state);
    onClose();
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <Pressable accessibilityLabel="بستن" style={s.backdrop} onPress={onClose} />
        <SafeAreaView edges={["bottom"]} style={s.sheet}>
          <T b style={u.h2}>ساختن چالش جدید</T>
          <TextInput
            style={[u.t, s.input]}
            value={title}
            onChangeText={setTitle}
            maxLength={40}
            placeholder="نام چالش؛ مثلاً کتاب خواندن"
            placeholderTextColor={C.muted}
            accessibilityLabel="نام چالش"
          />
          <View style={s.seg}>
            {KINDS.map(([k, label]) => (
              <Pressable
                key={k}
                accessibilityRole="radio"
                accessibilityState={{ selected: kind === k }}
                onPress={() => {
                  tap();
                  setKind(k);
                }}
                style={[s.segItem, kind === k && s.segOn]}>
                <T b style={{ color: kind === k ? "#fff" : C.muted, textAlign: "center" }}>{label}</T>
              </Pressable>
            ))}
          </View>
          {kind === "amount" && (
            <View style={u.row}>
              <TextInput
                style={[u.t, s.input, { flex: 1, minWidth: 0 }]}
                value={goal}
                onChangeText={setGoal}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="هدف روزانه؛ مثلاً ۲۰"
                placeholderTextColor={C.muted}
                accessibilityLabel="هدف روزانه"
              />
              <TextInput
                style={[u.t, s.input, { flex: 1, minWidth: 0 }]}
                value={unit}
                onChangeText={setUnit}
                maxLength={12}
                placeholder="واحد؛ مثلاً صفحه"
                placeholderTextColor={C.muted}
                accessibilityLabel="واحد"
              />
            </View>
          )}
          {!!error && <T style={{ color: C.bad }}>{error}</T>}
          <Button title="ساختن چالش" onPress={submit} />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#0008" },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 14 },
  input: { borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 10, backgroundColor: C.bg },
  seg: { flexDirection: "row", backgroundColor: C.bg, borderRadius: 12, padding: 3, borderWidth: 1, borderColor: C.line },
  segItem: { flex: 1, paddingVertical: 9, borderRadius: 10 },
  segOn: { backgroundColor: C.brand },
});
