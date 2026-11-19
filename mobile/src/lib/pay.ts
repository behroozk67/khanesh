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

// Structural type: the app's tsconfig has no DOM lib, and this path only runs on web.
type BrowserWindow = {
  addEventListener: (type: string, fn: () => void) => void;
  removeEventListener: (type: string, fn: () => void) => void;
  document: {
    visibilityState: string;
    addEventListener: (type: string, fn: () => void) => void;
    removeEventListener: (type: string, fn: () => void) => void;
  };
};
const RETURN_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * On web `openBrowserAsync` is just `window.open` and resolves immediately, so verifying right after it
 * answered «تراکنش تأیید نشد» while the user was still paying. Wait until the tab comes back (focus or
 * visible), with a timeout so a closed tab still ends the flow.
 */
function waitForReturn(): Promise<void> {
  const w = (globalThis as { window?: BrowserWindow }).window;
  if (!w) return Promise.resolve();
  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      w.removeEventListener("focus", finish);
      w.document.removeEventListener("visibilitychange", onVisible);
      clearTimeout(timer);
      resolve();
    };
    const onVisible = () => {
      if (w.document.visibilityState === "visible") finish();
    };
    const timer = setTimeout(finish, RETURN_TIMEOUT_MS);
    w.addEventListener("focus", finish);
    w.document.addEventListener("visibilitychange", onVisible);
  });
}

/** Verify is idempotent; a gateway that has just redirected may need a moment before the row says paid. */
async function verifyWithRetry(authority: string) {
  let last: unknown = null;
  for (let i = 0; i < 3; i += 1) {
    try {
      return await verifyPayment(authority);
    } catch (e) {
      last = e;
      if (i < 2) await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw last;
}

/** Open the gateway; when it is closed, ask the server whether it was paid (verify is idempotent). */
export async function payAndVerify(paymentUrl: string, authority: string) {
  if (Platform.OS === "web") {
    await openBrowserAsync(paymentUrl); // the site's own tab already sends its Referer
    await waitForReturn();
    return verifyWithRetry(authority);
  }
  // shortcut: one pending payment at a time; a second call releases the first, which then verifies as unpaid.
  payClosed();
  await new Promise<void>((resolve) => {
    closed = resolve;
    router.push({ pathname: "/pay", params: { url: paymentUrl } });
  });
  return verifyPayment(authority);
}
