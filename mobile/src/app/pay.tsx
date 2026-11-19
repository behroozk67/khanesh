import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";

import { PayView } from "@/components/pay-view";
import { payClosed } from "@/lib/pay";

/** Payment gateway screen; leaving it in any way lets payAndVerify ask the server. */
export default function Pay() {
  const { url } = useLocalSearchParams<{ url: string }>();
  useEffect(() => payClosed, []);
  // Deep links can open this route too: only ever show Zarinpal here, never an arbitrary page in the app's frame.
  const ok = typeof url === "string" && /^https:\/\/(payment|sandbox)\.zarinpal\.com\//.test(url);
  useEffect(() => {
    if (!ok) router.back();
  }, [ok]);
  return ok ? <PayView url={url} onDone={() => router.back()} /> : null;
}
