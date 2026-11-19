// expo-secure-store has no web implementation; AsyncStorage is localStorage here, under the same key as before.
import AsyncStorage from "@react-native-async-storage/async-storage";

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

export const getToken = () => AsyncStorage.getItem(KEY);
export const setToken = (token: string) => AsyncStorage.setItem(KEY, token).then(changed);
export const clearToken = () => AsyncStorage.removeItem(KEY).then(changed);
