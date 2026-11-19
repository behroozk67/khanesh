import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { type EngineTest, type Interpretation as Text, topicOf } from "@/lib/engine";

import { TopicIcon, isRedTopic } from "./topic-icon";
import { C, Card, faDigits, styles as u, T } from "./ui";

// Justified so both edges line up; the last line starts at the paragraph's own (right) edge.
const body = { lineHeight: 28, textAlign: "justify", color: C.chipInk } as const;
const SHOWN_PARAS = 2;
const SHOWN_RECS = 3;

function Para({ p, tests }: { p: string; tests: EngineTest[] }) {
  const topic = topicOf(p, tests);
  return (
    <View style={{ gap: 8 }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: isRedTopic(topic) ? C.badSoft : C.brandTint }}>
        <TopicIcon topic={topic} />
      </View>
      <T style={body}>{p}</T>
    </View>
  );
}

function More({ open, label, onPress }: { open: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[u.row, { justifyContent: "space-between", paddingVertical: 8 }]}>
      <T b>{open ? "بستن" : label}</T>
      <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={C.muted} />
    </Pressable>
  );
}

/** The two text cards of a result. The first two paragraphs and three recommendations show; the rest folds away, none is cut. */
export function InterpretationCards({ text, tests }: { text: Text; tests: EngineTest[] }) {
  const [moreText, setMoreText] = useState(false);
  const [moreRecs, setMoreRecs] = useState(false);
  const paras = text.paragraphs;
  const shownParas = moreText ? paras : paras.slice(0, SHOWN_PARAS);
  const shownRecs = moreRecs ? text.recommendations : text.recommendations.slice(0, SHOWN_RECS);
  return (
    <>
      {!!(text.summary || paras.length) && (
        <Card delay={90} style={u.soft}>
          <T b style={u.h2}>تفسیر برای شما</T>
          {!!text.summary && (
            <View style={{ backgroundColor: C.surface, borderStartWidth: 3, borderStartColor: C.brand, borderRadius: 8, padding: 12 }}>
              <T b style={[body, { color: C.ink }]}>{text.summary}</T>
            </View>
          )}
          {shownParas.map((p, i) => (
            <Para key={i} p={p} tests={tests} />
          ))}
          {paras.length > SHOWN_PARAS && <More open={moreText} label="ادامهٔ تفسیر" onPress={() => setMoreText(!moreText)} />}
        </Card>
      )}
      {text.recommendations.length > 0 && (
        <Card delay={110} style={u.soft}>
          <T b style={u.h2}>توصیه‌ها</T>
          {shownRecs.map((r, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
              <Ionicons name="checkmark-circle-outline" size={18} color={C.emerald} style={{ marginTop: 5 }} />
              <T style={[body, { flex: 1 }]}>{r}</T>
            </View>
          ))}
          {text.recommendations.length > SHOWN_RECS && <More open={moreRecs} label={`همهٔ توصیه‌ها (${faDigits(text.recommendations.length)})`} onPress={() => setMoreRecs(!moreRecs)} />}
        </Card>
      )}
    </>
  );
}
