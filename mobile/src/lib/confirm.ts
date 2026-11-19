import { Alert, Platform } from "react-native";

/** Native alert (web: window.confirm) before something that can't be undone. */
export function confirm(msg: string, ok: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(msg)) ok();
    return;
  }
  Alert.alert("حذف", msg, [
    { text: "انصراف", style: "cancel" },
    { text: "حذف", style: "destructive", onPress: ok },
  ]);
}
