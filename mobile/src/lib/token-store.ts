// Sign-in JWT, encrypted at rest. Check: node --experimental-test-module-mocks scripts/token-store-check.mjs
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const KEY = "auth_token";

// The tab bar shows the history tab only while signed in, so it listens for sign-in and sign-out.
const listeners = new Set<() => void>();
export const onTokenChange = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
const changed = () => listeners.forEach((f) => f());
// Not the default WHEN_UNLOCKED: polling continues after the screen locks, and a failed read sends no token, gets a 401 and signs the user out.
const WRITE = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };

// Older builds kept the token in AsyncStorage. The old copy goes only after the write succeeds, so a failure can't sign anyone out; the next launch retries.
const moved = (async () => {
  const legacy = await AsyncStorage.getItem(KEY);
  if (!legacy) return;
  await SecureStore.setItemAsync(KEY, legacy, WRITE);
  await AsyncStorage.removeItem(KEY);
})().catch(() => {});

export async function getToken() {
  await moved;
  return (await SecureStore.getItemAsync(KEY).catch(() => null)) ?? AsyncStorage.getItem(KEY);
}

export async function setToken(token: string) {
  await moved;
  await AsyncStorage.removeItem(KEY);
  await SecureStore.setItemAsync(KEY, token, WRITE);
  changed();
}

export async function clearToken() {
  await moved;
  // Both stores: a leftover legacy copy would sign the user back in on the next read.
  await Promise.all([SecureStore.deleteItemAsync(KEY), AsyncStorage.removeItem(KEY)]);
  changed();
}
