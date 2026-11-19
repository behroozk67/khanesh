// expo-sqlite's web build needs a wasm bundle; localStorage is enough for one flag.
export const getSync = (k: string) => localStorage.getItem(k);
export const setSync = (k: string, v: string) => localStorage.setItem(k, v);
