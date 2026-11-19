import { ActivityIndicator, View } from "react-native";
import { WebView } from "react-native-webview";

import { C } from "@/components/ui";
import { SITE } from "@/lib/pay";

/** The gateway inside the app, opened with the site as Referer (Zarinpal checks it against the merchant's domain).
 *  `onDone` fires when the gateway sends the user back to the site's /payment/verify. */
export function PayView({ url, onDone }: { url: string; onDone: () => void }) {
  const back = `${SITE}/payment/verify`;
  return (
    <WebView
      style={{ flex: 1, backgroundColor: C.bg }}
      source={{ uri: url, headers: { Referer: `${SITE}/` } }}
      startInLoadingState
      renderLoading={() => (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={C.brand} />
        </View>
      )}
      onShouldStartLoadWithRequest={(r) => {
        if (!r.url.startsWith(back)) return true;
        onDone();
        return false;
      }}
    />
  );
}
