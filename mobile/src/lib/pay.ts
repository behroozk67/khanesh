import { router } from "expo-router";
import { openBrowserAsync } from "expo-web-browser";
import { Platform } from "react-native";

import { verifyPayment } from "./api";

/** The site the merchant is registered on; Zarinpal refuses StartPay opened without it as the Referer. */
export const SITE = (process.env.EXPO_PUBLIC_API_URL || "https://azmayarapp.ir").replace(/\/+$/, "");

let closed: (() => void) | null = null;
/** Called by the /pay screen when it goes away (gateway returned, or the user backed out). */
export const payClosed = () => {
  closed?.();
  closed = null;
};

/** Open the gateway; when it is closed, ask the server whether it was paid (verify is idempotent). */
export async function payAndVerify(paymentUrl: string, authority: string) {
  if (Platform.OS === "web") await openBrowserAsync(paymentUrl); // the site's own tab already sends its Referer
  else {
    // shortcut: one pending payment at a time; a second call releases the first, which then verifies as unpaid.
    payClosed();
    await new Promise<void>((resolve) => {
      closed = resolve;
      router.push({ pathname: "/pay", params: { url: paymentUrl } });
    });
  }
  return verifyPayment(authority);
}
